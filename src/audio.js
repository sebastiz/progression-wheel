/* audio — Everything that makes a sound: the synth voices, the drum kits, the sidechain pump,
   the section-move automation, and the sampler that fetches real GM instruments.
*/
import { chordIvs } from "./theory.js";

/* ===== sounds ===== */
const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);
/* Noise from an integer hash rather than Math.random. Every buffer of noise in here is baked into
   audio the app hands the user — a drum hit, a reverb tail — and two renders of one song have to
   come out identical. It matters most for stems: with random noise a drum stem carries a different
   crack from the one in the mix, and the stems stop adding back up to the file they came from. */
const hashNoise = n => {
  let h = (n | 0) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad);
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
};
function makeNoise(ctx) {
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = hashNoise(i) * 2 - 1;
  return b;
}
function env(ctx, t, vol, attack, decay, exp = true, dest) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  if (exp) g.gain.exponentialRampToValueAtTime(0.0006, t + decay);
  g.connect(dest || ctx.destination);
  return g;
}
function clickSound(ctx, t, sym, dest) {
  const o = ctx.createOscillator();
  o.type = "square";
  o.frequency.value = sym === ">" ? 1660 : sym === "U" ? 830 : 1108;
  o.connect(env(ctx, t, sym === ">" ? 0.09 : sym === "U" ? 0.035 : 0.055, 0.001, 0.05, true, dest));
  o.start(t); o.stop(t + 0.06);
  if (sym === ">") {
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.setValueAtTime(160, t);
    o2.frequency.exponentialRampToValueAtTime(60, t + 0.09);
    o2.connect(env(ctx, t, 0.22, 0.001, 0.12, true, dest));
    o2.start(t); o2.stop(t + 0.13);
  }
}
/* Every drum kit's kick, snare and hat, as data rather than a chain of if/else branches — the
   only way "a huge number of kits" stays readable. Each entry:
     kick:  { type, hz0, hz1, sweep, vol, atk, dec, nz:[vol,atk,dec,type,hz,Q?] }
     snare: { tones:[[hz,vol,atk,dec], …], nz:[[vol,atk,dec,type,hz,Q?], …] }
     hat:   { hz, ring:[hz,hz,hz] or null for a pure-noise (buzzy) hat, closedDec?, openDec? }
   B (the 808-style sub-boom, layered onto any kit for a trap-style beat) and C/P/R/X (clap, rim,
   ride, crash) don't vary by kit — every kit answers to the same clap and cymbals, the way a real
   drum machine's kick and snare define its character far more than its incidental percussion. A
   kit not in this table falls back to "acoustic" rather than throwing, so an old saved song with
   an id from before a kit was removed still plays something. */
const DRUM_KIT_SPECS = {
  acoustic: { kick: { type:"sine", hz0:165, hz1:42, sweep:0.09, vol:0.62, atk:0.002, dec:0.22, nz:[0.22,0.001,0.02,"lowpass",3200] },
    snare: { tones:[[175,0.14,0.001,0.09],[330,0.09,0.001,0.09]], nz:[[0.3,0.001,0.055,"highpass",1600],[0.14,0.002,0.16,"bandpass",3200,0.6]] },
    hat: { hz:7800, ring:[2400,3000,4700] } },
  "909": { kick: { type:"sine", hz0:200, hz1:48, sweep:0.045, vol:0.68, atk:0.001, dec:0.3, nz:[0.3,0.001,0.016,"lowpass",4200] },   // tight body, hard click on top
    snare: { tones:[[238,0.1,0.001,0.06]], nz:[[0.34,0.001,0.075,"highpass",1900],[0.12,0.001,0.13,"bandpass",4200,0.7]] },   // noise-forward, short, bright
    hat: { hz:8600, ring:[3100,4200,5900], closedDec:0.035 } },
  "808": { subKick: true, kick: null,   // the kick channel routes into the shared sub-boom branch below
    snare: { tones:[[180,0.16,0.001,0.075]], nz:[[0.2,0.001,0.055,"highpass",2400]] },   // tuned tick + a thin noise puff
    hat: { hz:9200, ring:null, openDec:0.32, closedDec:0.028 } },   // pure noise — no partial ring
  "707": { kick: { type:"sine", hz0:210, hz1:55, sweep:0.05, vol:0.6, atk:0.001, dec:0.24, nz:[0.22,0.001,0.012,"bandpass",3400,1.1] },   // punchy mid-tuned thud, plasticky click — the Latin-pop kick
    snare: { tones:[[260,0.09,0.001,0.05]], nz:[[0.3,0.001,0.06,"highpass",2400]] },   // bright and snappy, a shade thinner than the 909
    hat: { hz:8200, ring:[2800,3900,5400] } },
  "606": { kick: { type:"triangle", hz0:150, hz1:50, sweep:0.035, vol:0.5, atk:0.001, dec:0.16, nz:[0.14,0.001,0.01,"highpass",2600] },   // thin, buzzy, barely any body
    snare: { tones:[], nz:[[0.32,0.001,0.07,"bandpass",2600,0.9],[0.1,0.001,0.03,"highpass",4000]] },   // buzzy and papery, almost all noise
    hat: { hz:9400, ring:null, openDec:0.32, closedDec:0.028 } },
  linn: { kick: { type:"sine", hz0:145, hz1:46, sweep:0.075, vol:0.66, atk:0.002, dec:0.32, nz:[0.1,0.001,0.015,"lowpass",2000] },   // deep and clean, shorter than an 808 — the 80s pop-ballad kick
    snare: { tones:[[210,0.12,0.001,0.045]], nz:[[0.38,0.001,0.09,"highpass",2100]] },   // the gated-reverb crack — bright transient, cut off hard
    hat: { hz:8000, ring:[2600,3600,5100] } },
  cr78: { kick: { type:"sine", hz0:130, hz1:55, sweep:0.1, vol:0.5, atk:0.004, dec:0.2, nz:[0.06,0.002,0.02,"lowpass",1800] },   // soft, muted, almost no click — the earliest boxes barely had a beater
    snare: { tones:[[300,0.07,0.001,0.04]], nz:[[0.16,0.002,0.05,"bandpass",2200,1]] },   // dry, short, more tick than crack
    hat: { hz:7200, ring:[2200,2900,4100], closedDec:0.03, openDec:0.22 } },
  dmx: { kick: { type:"sine", hz0:185, hz1:50, sweep:0.06, vol:0.72, atk:0.001, dec:0.26, nz:[0.28,0.001,0.02,"lowpass",3800] },   // punchy, tuned — the boom half of boom-bap
    snare: { tones:[[220,0.22,0.001,0.11]], nz:[[0.42,0.001,0.15,"highpass",1500],[0.15,0.001,0.2,"bandpass",2600,0.5]] },   // the huge gated snare — long and loud, cut off hard
    hat: { hz:8400, ring:[2700,3600,5200], closedDec:0.03 } },
  sp1200: { kick: { type:"sine", hz0:150, hz1:44, sweep:0.07, vol:0.66, atk:0.001, dec:0.2, nz:[0.32,0.001,0.03,"bandpass",2600,0.9] },   // gritty, bit-crushed sample crunch on the beater
    snare: { tones:[[190,0.13,0.001,0.06]], nz:[[0.36,0.001,0.07,"bandpass",2200,0.8],[0.16,0.001,0.1,"highpass",3200]] },   // dusty, crunchy, all texture
    hat: { hz:6800, ring:[2000,2700,3900], closedDec:0.045, openDec:0.3 } },
  mpc60: { kick: { type:"sine", hz0:158, hz1:44, sweep:0.085, vol:0.64, atk:0.002, dec:0.24, nz:[0.18,0.001,0.018,"lowpass",2800] },   // warm and round — 90s boom-bap
    snare: { tones:[[195,0.16,0.001,0.08],[350,0.07,0.001,0.06]], nz:[[0.26,0.001,0.08,"highpass",1900],[0.12,0.002,0.13,"bandpass",2900,0.6]] },
    hat: { hz:7500, ring:[2300,3000,4400], closedDec:0.04 } },
  hardtechno: { kick: { type:"triangle", hz0:180, hz1:45, sweep:0.03, vol:0.85, atk:0.0005, dec:0.14, nz:[0.4,0.001,0.02,"bandpass",1200,2] },   // short, loud, clipped — built to distort
    snare: { tones:[], nz:[[0.4,0.001,0.05,"bandpass",1800,1.2],[0.2,0.001,0.09,"highpass",4500]] },
    hat: { hz:9800, ring:null, closedDec:0.022, openDec:0.24 } },
  gabber: { kick: { type:"triangle", hz0:190, hz1:38, sweep:0.05, vol:0.95, atk:0.0004, dec:0.3, nz:[0.5,0.001,0.05,"bandpass",900,1.6] },   // extreme, distorted, almost all midrange body
    snare: { tones:[], nz:[[0.42,0.001,0.06,"bandpass",1600,1],[0.22,0.001,0.1,"highpass",5000]] },
    hat: { hz:10200, ring:null, closedDec:0.02, openDec:0.2 } },
  dubstep: { kick: { type:"sine", hz0:110, hz1:32, sweep:0.1, vol:0.7, atk:0.003, dec:0.4, nz:[0.14,0.001,0.025,"lowpass",1800] },   // heavy, low, longer than an 808
    snare: { tones:[[200,0.1,0.001,0.05]], nz:[[0.36,0.001,0.2,"highpass",2000],[0.18,0.001,0.28,"bandpass",3800,0.4]] },   // bright, long, metallic tail
    hat: { hz:9000, ring:[3000,4500,6400], closedDec:0.03, openDec:0.3 } },
  jungle: { kick: { type:"sine", hz0:172, hz1:46, sweep:0.06, vol:0.6, atk:0.002, dec:0.18, nz:[0.24,0.001,0.018,"lowpass",3500] },   // tight, sits under a chopped break
    snare: { tones:[[185,0.15,0.001,0.08],[340,0.11,0.001,0.07]], nz:[[0.34,0.001,0.06,"highpass",1700],[0.16,0.002,0.15,"bandpass",3400,0.55]] },   // bright and snappy — the breakbeat crack
    hat: { hz:8000, ring:[2500,3300,5000], closedDec:0.028 } },
  minimal: { kick: { type:"sine", hz0:160, hz1:60, sweep:0.02, vol:0.5, atk:0.001, dec:0.08, nz:[0.1,0.001,0.008,"lowpass",2600] },   // small, dry, almost clicky — nothing rings
    snare: { tones:[[240,0.06,0.001,0.03]], nz:[[0.16,0.001,0.03,"highpass",2600]] },
    hat: { hz:8800, ring:null, closedDec:0.018, openDec:0.1 } },
  vinyl: { kick: { type:"sine", hz0:150, hz1:44, sweep:0.09, vol:0.5, atk:0.004, dec:0.22, nz:[0.16,0.003,0.03,"lowpass",1500] },   // dusty and soft, everything low-passed like an old sample
    snare: { tones:[[170,0.09,0.002,0.08]], nz:[[0.22,0.003,0.09,"bandpass",1400,0.8]] },
    hat: { hz:5200, ring:[1800,2400,3400], closedDec:0.045, openDec:0.3 } },
};
// One drum voice. `ch` is a channel letter from a DRUMS pattern; `kit` picks the voicing (see
// DRUM_KIT_SPECS above). B, C, P, R and X are shared across every kit.
function drumSound(ctx, t, ch, noise, dest, kit, vel = 1) {
  const KP = DRUM_KIT_SPECS[kit] || DRUM_KIT_SPECS.acoustic;
  // one filtered noise burst — the skin/cymbal half of nearly every voice here.
  // The shared noise buffer is only 0.3 s, so anything ringing longer (ride, crash) has to
  // loop it or the tail goes silent halfway through its own envelope.
  const nz = (vol0, atk, dec, type, hz, Q) => {
    const vol = vol0 * vel;                          // positional accent, applied to every voice
    const n = ctx.createBufferSource(); n.buffer = noise;
    if (dec > 0.25) n.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = hz;
    if (Q != null) f.Q.value = Q;
    n.connect(f); f.connect(env(ctx, t, vol, atk, dec, true, dest));
    n.start(t); n.stop(t + dec + 0.02);
  };
  // one pitched tone, optionally sweeping hz0 → hz1 over `sweep` seconds
  const tone = (type, hz0, hz1, sweep, vol0, atk, dec, at = t) => {
    const vol = vol0 * vel;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(hz0, at);
    if (hz1) o.frequency.exponentialRampToValueAtTime(hz1, at + sweep);
    o.connect(env(ctx, at, vol, atk, dec, true, dest));
    o.start(at); o.stop(at + dec + 0.02);
  };
  if (ch === "K" || ch === "B") {
    // B is the 808-style sub-boom on any kit — the long tuned tail under a trap beat
    const sub = ch === "B" || KP.subKick;
    if (sub) {                                   // pure sine, slow drop, long ring
      tone("sine", ch === "B" ? 105 : 120, 42, 0.06, 0.72, 0.004, ch === "B" ? 1.1 : 0.85);
      nz(0.05, 0.001, 0.012, "lowpass", 2200);   // barely any beater — the 808 is almost all body
    } else {
      const k = KP.kick;
      tone(k.type, k.hz0, k.hz1, k.sweep, k.vol, k.atk, k.dec);
      nz(...k.nz);
    }
  } else if (ch === "S") {
    KP.snare.tones.forEach(([hz, vol, atk, dec]) => tone("triangle", hz, 0, 0, vol, atk, dec));
    KP.snare.nz.forEach(args => nz(...args));
  } else if (ch === "H" || ch === "O") {
    // closed vs open hat: the same voice with a longer tail. The machine kits are brighter and
    // more metallic than the acoustic one, which is most of why a 909 pattern reads as "house".
    const open = ch === "O";
    const hp = KP.hat;
    const buzzy = !hp.ring;                       // pure-noise hats — no partial ring on top
    const dec = open ? (hp.openDec != null ? hp.openDec : buzzy ? 0.32 : 0.28)
      : (hp.closedDec != null ? hp.closedDec : buzzy ? 0.028 : 0.04);
    const vol = open ? 0.1 : 0.11;
    nz(vol, 0.001, dec, "highpass", hp.hz);
    if (buzzy) return;
    // a ring of inharmonic square partials through a shared high-pass gives the metal
    const ring = ctx.createGain(); ring.gain.value = 0.02;
    const rhp = ctx.createBiquadFilter(); rhp.type = "highpass"; rhp.frequency.value = 8500;
    ring.connect(rhp); rhp.connect(env(ctx, t, (open ? 0.42 : 0.5) * vel, 0.001, open ? dec * 0.9 : 0.035, true, dest));
    hp.ring.forEach(hz => {
      const o = ctx.createOscillator(); o.type = "square"; o.frequency.value = hz;
      o.connect(ring); o.start(t); o.stop(t + dec + 0.01);
    });
  } else if (ch === "C") {
    // hand clap: three fast noise slaps a few ms apart (the "spread" that makes it a room
    // full of hands rather than one pair) plus a longer body tail behind them
    [0, 0.011, 0.022].forEach((d, i) => {
      const n = ctx.createBufferSource(); n.buffer = noise;
      const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1750; f.Q.value = 0.9;
      n.connect(f); f.connect(env(ctx, t + d, (i === 2 ? 0.26 : 0.17) * vel, 0.001, 0.028, true, dest));
      n.start(t + d); n.stop(t + d + 0.04);
    });
    nz(0.13, 0.004, 0.16, "bandpass", 2100, 0.8);
  } else if (ch === "P") {
    // rim / side-stick: a short woody knock — the off-grid percussion in house and latin house
    tone("triangle", 1720, 0, 0, 0.13, 0.001, 0.028);
    nz(0.09, 0.001, 0.022, "bandpass", 2600, 1.4);
  } else if (ch === "R") {
    // ride: a sustained wash of high partials, quieter and far longer than a hat
    nz(0.055, 0.002, 0.5, "highpass", 6200);
    const ring = ctx.createGain(); ring.gain.value = 0.014;
    const rhp = ctx.createBiquadFilter(); rhp.type = "highpass"; rhp.frequency.value = 7000;
    ring.connect(rhp); rhp.connect(env(ctx, t, 0.4 * vel, 0.002, 0.45, true, dest));
    [2100, 3300, 4900, 6100].forEach(hz => {
      const o = ctx.createOscillator(); o.type = "square"; o.frequency.value = hz;
      o.connect(ring); o.start(t); o.stop(t + 0.46);
    });
  } else if (ch === "X") {
    // crash: a broad noise swell that rings on — marks the top of a drop or a section change
    nz(0.17, 0.004, 1.15, "highpass", 3400);
    nz(0.08, 0.006, 0.9, "bandpass", 6800, 0.4);
  }
}
/* ===== section moves (arrangement automation) =====
   A build isn't a chord change — it's a filter opening over eight bars, a riser underneath and a
   crash on the downbeat of the drop. These are the moves that shape dance arrangements, attached
   to a section so they run for exactly that section's length however long it is.
   `lo`/`hi` are filter cutoffs in Hz; every value stays above zero because the sweeps are
   exponential (an exponential ramp to or from 0 throws). `hp` is the paired high-pass — the moves
   that thin a mix from below rather than darkening it from above. */
const MOVES = {};
[
["",         "— no move —",                  null],
["build",    "Build · filter opens",         { from: 260, to: 16000 }],
["riser",    "Build + riser",                { from: 260, to: 16000, riser: true }],
["longriser","Build · long tension riser",   { from: 800, to: 16000, riser: true, riserSpan: 0.85 }],
["snaprise", "Build · snap riser (final bar)",{ from: 5000, to: 16000, riser: true, riserSpan: 0.1 }],
["hpbuild",  "Build · bass drains away",     { from: 16000, to: 16000, hp: { from: 30, to: 700 } }],
["drop",     "Drop · slam open + crash",     { from: 16000, to: 16000, impact: true }],
["hpdrop",   "Drop · sub slams in",          { from: 16000, to: 16000, hp: { from: 700, to: 30 }, impact: true }],
["crashonly","Drop · crash only (already open)",{ from: 18000, to: 18000, impact: true }],
["fade",     "Fade · filter closes",         { from: 16000, to: 300 }],
["under",    "Underwater · stays shut",      { from: 600, to: 600 }],
["phone",    "Telephone · mids only",        { from: 2600, to: 2600, hp: { from: 560, to: 560 } }],
["swell",    "Swell · opens then shuts",     { from: 400, to: 400, peak: 14000 }],
/* From here down, every id also has a PART_MOVES and/or DRUM_MOVES entry in melody.js — this
   table still holds the name (so the id shows up in the group's one Move dropdown) and, where one
   makes sense, a master-filter half to go with it; several are pure instrument/drum moves and carry
   no filter spec at all (null), same as "no move". */
["arpspeedup",   "Build · arp speeds up",           null],
["arpforce",     "Build · everything arpeggiates",  { from: 3000, to: 16000 }],
["thicken",      "Build · fills back in",           null],
["thinout",      "Fade · thins out",                { from: 16000, to: 2000 }],
["stutterbuild", "Build · stutter tightens",        { from: 6000, to: 16000 }],
["stutterunwind","Drop · stutter unwinds",          { from: 16000, to: 16000, impact: true }],
["gatetighten",  "Build · gate walks off the grid", null],
["chaosrise",    "Build · chaos rises",             { from: 16000, to: 16000, hp: { from: 30, to: 500 } }],
["echocascade",  "Build · echoes cascade",          null],
["snaproll",     "Build · snare rolls in",          { from: 4000, to: 16000, riser: true, riserSpan: 0.5 }],
["kickstutter",  "Build · kick stutters",           null],
["hatrun",       "Build · hats run to sixteenths",  null],
["megabuild",    "Build · everything intensifies",  { from: 260, to: 16000, riser: true, riserSpan: 0.4 }],
].forEach(([id, name, spec]) => { MOVES[id] = { name, spec }; });
const FILTER_OPEN = 18000;                       // "no filtering", still inside Nyquist at 44.1k

// Schedule one section move: the cutoff envelope across the section, plus the riser and impact
// that go with it. `dur` is the whole section's length in seconds, so the sweep always lands on
// the section boundary whether it is four bars or sixteen.
function applyMove(ctx, filt, hpf, spec, t, dur, noise, dest) {
  /* The paired high-pass first, and unconditionally: a spec without `hp` has to put the bass back,
     or one telephone section would thin every section after it. */
  if (hpf) {
    const h = hpf.frequency, hs = spec && spec.hp;
    h.cancelScheduledValues(t);
    h.setValueAtTime(Math.max(20, hs ? hs.from : 20), t);
    if (hs && hs.to !== hs.from) h.exponentialRampToValueAtTime(Math.max(20, hs.to), t + dur);
  }
  if (!spec) {                                   // no move → make sure nothing is left filtered
    filt.frequency.cancelScheduledValues(t);
    filt.frequency.setValueAtTime(FILTER_OPEN, t);
    return;
  }
  const f = filt.frequency;
  f.cancelScheduledValues(t);
  f.setValueAtTime(Math.max(20, spec.from), t);
  if (spec.peak) {                               // open to the peak by halfway, then close again
    f.exponentialRampToValueAtTime(spec.peak, t + dur * 0.5);
    f.exponentialRampToValueAtTime(Math.max(20, spec.to), t + dur);
  } else if (spec.to !== spec.from) {
    f.exponentialRampToValueAtTime(Math.max(20, spec.to), t + dur);
  }
  if (spec.impact) {
    // crash + a short sub boom on the downbeat — the hit that lands a drop
    const boom = ctx.createOscillator(); boom.type = "sine";
    boom.frequency.setValueAtTime(90, t);
    boom.frequency.exponentialRampToValueAtTime(34, t + 0.5);
    boom.connect(env(ctx, t, 0.5, 0.004, 0.75, true, dest));
    boom.start(t); boom.stop(t + 0.8);
    const cr = ctx.createBufferSource(); cr.buffer = noise; cr.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 3200;
    cr.connect(hp); hp.connect(env(ctx, t, 0.2, 0.005, 1.3, true, dest));
    cr.start(t); cr.stop(t + 1.35);
  }
  if (spec.riser) {
    // noise sweeping up through the last two bars (or the last third of a short section),
    // swelling as it goes — the tension that makes the drop land. `riserSpan` overrides how
    // much of the section it runs across, for a longer tension build or a short snap cue.
    const rise = spec.riserSpan != null ? dur * spec.riserSpan : Math.min(dur * 0.34, 4);
    const t0 = t + dur - rise;
    const n = ctx.createBufferSource(); n.buffer = noise; n.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(400, t0);
    bp.frequency.exponentialRampToValueAtTime(9000, t0 + rise);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.16, t0 + rise * 0.92);
    g.gain.linearRampToValueAtTime(0.0001, t0 + rise);   // cut right on the boundary
    n.connect(bp); bp.connect(g); g.connect(dest);
    n.start(t0); n.stop(t0 + rise + 0.05);
  }
}

/* ===== transitions (the seam between two sections) =====
   A move shapes a section; a transition shapes the *boundary into* one, which is a different job
   in every way that matters. It is anchored to a downbeat rather than spread across a section,
   most of it happens in the section *before* the one it belongs to, and some of it — a crash, an
   echo throw, a fade-in — rings on after the boundary has passed. None of that fits `applyMove`,
   whose whole shape is "one envelope, from the section's start to its end".

   So a transition is a list of primitives, each a small scheduler with its own window measured in
   beats either side of the boundary, and a preset is one row in a table. "Reverse cymbal into a
   drop" is a row rather than another branch inside one function, which is what makes forty-odd
   options affordable instead of forty-odd `if`s.

   Two rules keep the table honest, and `npm test` enforces both:
   - a primitive declares every shared parameter it writes (`owns`), and no preset may claim one
     twice. Two envelopes on one AudioParam is exactly the bug that makes section moves impossible
     to overlap — the second `cancelScheduledValues` silently eats the first.
   - one-shot sources (risers, crashes, rolls) go to the `fx` bus, never the master, so a crash
     survives the beat of silence that sets it up and the stems still add back up to the mix.

   Windows are in *beats*, not seconds and not bars: seconds make a riser tempo-dependent (the
   4-second cap in `applyMove` is a bar and a half at 170bpm and nearly two at 90), and bars would
   need a different table in 3/4. The caller converts to bars once, when it places the cue. */

/* The transition stage: its own filters and gain on the master path, downstream of the section
   move's filter and upstream of the drawn automation lanes. Its own nodes rather than the move's,
   because an envelope that crosses a boundary and one that stops on it cannot share a parameter.
   It sits on the *master* path deliberately: drums bypass the pitched bus entirely, and a stutter
   or a bar of silence that leaves the drums running is not a cut, it is a bug. */
function makeTrans(ctx, dest, beatSec, silentFx) {
  const open = Math.min(FILTER_OPEN, ctx.sampleRate / 2 - 100);
  const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 20; hp.Q.value = 0.7;
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = open; lp.Q.value = 0.9;
  const gain = ctx.createGain(); gain.gain.value = 1;
  hp.connect(lp); lp.connect(gain); gain.connect(dest);
  /* One-shots hang off their own bus, past the transition's gain and filters: a crash has to ring
     through the silence that sets it up, and a riser has to stay bright while the mix behind it is
     being filtered into the ground. Muting this one node is also the whole of the stem fix —
     risers and crashes are added sources, so a copy in every stem means the stems sum to several
     copies of each one. */
  const fx = ctx.createGain(); fx.gain.value = silentFx ? 0 : 1;
  fx.connect(dest);
  /* A wash and a throw, both tapped off the transition's output rather than the pitched bus, so
     they carry the drums too — half a mix in the reverb is not a wash. Both are linear, and both
     are scheduled identically in a stem render, so the stems still sum. */
  const wash = ctx.createGain(); wash.gain.value = 0;
  const conv = ctx.createConvolver(); conv.buffer = reverbIR(ctx, 2.8, 5);
  gain.connect(wash); wash.connect(conv); conv.connect(dest);
  const echo = ctx.createGain(); echo.gain.value = 0;
  const dl = ctx.createDelay(2.0); dl.delayTime.value = Math.min(1.8, Math.max(0.02, beatSec * 0.75));
  const efb = ctx.createGain(); efb.gain.value = 0.58;   // more feedback than the mix delay: a throw should ring
  const etone = ctx.createBiquadFilter(); etone.type = "lowpass"; etone.frequency.value = 2400;
  gain.connect(echo); echo.connect(dl); dl.connect(etone); etone.connect(efb); efb.connect(dl);
  dl.connect(dest);
  return { in: hp, hp, lp, gain, fx, wash, echo, open };
}

/* The primitives. `owns` is the shared parameters this one writes; `pre`/`post` are how many beats
   of room it needs either side of the boundary, which is what the caller uses to place the cue. */
const TFX = {};
const tfx = (id, owns, pre, post, run) => { TFX[id] = { id, owns, pre, post, run }; };
/* A window never runs past the section it would have to borrow from: a two-bar verse cannot host a
   four-bar riser, so the riser shortens rather than starting inside a section that already played.
   With no room at all — the first section of a song has nothing before it — the answer is zero, and
   every primitive checks for that and schedules nothing. A quarter-beat riser is not a short riser,
   it is a squeak, and the crash it was setting up still lands either way. */
const winPre = (N, want) => Math.max(0, Math.min(want, N.maxPre));
const winPost = (N, want) => Math.max(0, Math.min(want, N.maxPost));

/* noise sweeping up into the boundary and cut on it — the tension that makes a drop land */
tfx("rise", [], o => o.beats || 8, () => 0, (N, tB, o) => {
  const len = winPre(N, o.beats || 8) * N.beat, t0 = tB - len;
  if (len <= 0) return;                                // no room before this section: nothing to rise through
  const n = N.ctx.createBufferSource(); n.buffer = N.noise; n.loop = true;
  const bp = N.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = o.q || 1.4;
  bp.frequency.setValueAtTime(N.hz(o.f0 || 380), t0);
  bp.frequency.exponentialRampToValueAtTime(N.hz(o.f1 || 9000), tB);
  const g = N.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(o.vol || 0.16, tB - len * 0.06);
  g.gain.linearRampToValueAtTime(0.0001, tB);          // cut right on the boundary
  n.connect(bp); bp.connect(g); g.connect(N.fx);
  n.start(t0); n.stop(tB + 0.05);
});
/* the reverse cymbal: a bright wash swelling exponentially into the downbeat. It is the same
   ingredients as a riser and a completely different sound — the pitch stays put and the *level*
   is what rises, which is why it sits behind a vocal where a riser fights it. */
tfx("revcym", [], o => o.beats || 8, () => 0, (N, tB, o) => {
  const len = winPre(N, o.beats || 8) * N.beat, t0 = tB - len;
  if (len <= 0) return;
  const n = N.ctx.createBufferSource(); n.buffer = N.noise; n.loop = true;
  const f = N.ctx.createBiquadFilter(); f.type = "highpass";
  f.frequency.setValueAtTime(N.hz(1800), t0);
  f.frequency.exponentialRampToValueAtTime(N.hz(5200), tB);
  const g = N.ctx.createGain();
  g.gain.setValueAtTime(0.0006, t0);
  g.gain.exponentialRampToValueAtTime(o.vol || 0.2, tB - 0.01);
  g.gain.linearRampToValueAtTime(0.0001, tB);
  n.connect(f); f.connect(g); g.connect(N.fx);
  n.start(t0); n.stop(tB + 0.05);
});
/* the downlifter: the same idea falling, and by default it lands *after* the boundary — the sound
   of the floor dropping out of a track rather than the sound of it being lifted */
tfx("fall", [], o => o.at === "pre" ? (o.beats || 4) : 0, o => o.at === "pre" ? 0 : (o.beats || 4),
  (N, tB, o) => {
    const pre = o.at === "pre";
    const len = (pre ? winPre(N, o.beats || 4) : winPost(N, o.beats || 4)) * N.beat;
    if (len <= 0) return;
    const t0 = pre ? tB - len : tB;
    const n = N.ctx.createBufferSource(); n.buffer = N.noise; n.loop = true;
    const bp = N.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(N.hz(o.f0 || 8000), t0);
    bp.frequency.exponentialRampToValueAtTime(N.hz(o.f1 || 260), t0 + len);
    const g = N.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(o.vol || 0.15, t0 + len * 0.12);
    g.gain.linearRampToValueAtTime(0.0001, t0 + len);
    n.connect(bp); bp.connect(g); g.connect(N.fx);
    n.start(t0); n.stop(t0 + len + 0.05);
  });
/* a pitched sweep — the uplifter, and the same primitive falling is the pitch-drop out of a chorus.
   Sawtooth through a tracking lowpass so it reads as a synth rather than a siren. */
tfx("tone", [], o => o.at === "post" ? 0 : (o.beats || 8), o => o.at === "post" ? (o.beats || 8) : 0,
  (N, tB, o) => {
    const post = o.at === "post";
    const len = (post ? winPost(N, o.beats || 8) : winPre(N, o.beats || 8)) * N.beat;
    if (len <= 0) return;
    const t0 = post ? tB : tB - len;
    const f0 = midiHz(o.m0 == null ? 45 : o.m0), f1 = midiHz(o.m1 == null ? 88 : o.m1);
    const osc = N.ctx.createOscillator(); osc.type = o.wave || "sawtooth";
    osc.frequency.setValueAtTime(N.hz(f0), t0);
    osc.frequency.exponentialRampToValueAtTime(N.hz(f1), t0 + len);
    const lp = N.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 4;
    lp.frequency.setValueAtTime(N.hz(f0 * 4), t0);
    lp.frequency.exponentialRampToValueAtTime(N.hz(f1 * 4), t0 + len);
    const g = N.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(o.vol || 0.1, t0 + len * (post ? 0.08 : 0.9));
    g.gain.linearRampToValueAtTime(0.0001, t0 + len);
    osc.connect(lp); lp.connect(g); g.connect(N.fx);
    osc.start(t0); osc.stop(t0 + len + 0.05);
  });
/* the drum roll: hits accelerating from `from` to `to` per beat, landing on the boundary. It goes
   through the kit, so a 909 song rolls on a 909 snare without the table knowing kits exist. */
tfx("roll", [], o => o.beats || 4, () => 0, (N, tB, o) => {
  const beats = winPre(N, o.beats || 4), t0 = tB - beats * N.beat;
  if (beats <= 0) return;
  const from = o.from || 2, to = o.to || 8;
  let t = t0;
  for (let k = 0; k < 256 && t < tB - 1e-4; k++) {
    const p = (t - t0) / (beats * N.beat);                    // 0..1 through the roll
    drumSound(N.ctx, t, o.ch || "S", N.noise, N.fx, N.kit, (o.vel || 0.95) * (0.35 + 0.65 * p));
    t += N.beat / (from + (to - from) * p);                   // hits per beat, right now
  }
});
/* the two halves of an impact, separate because a crash without the sub is a section change and
   the sub without the crash is a drop you feel rather than hear */
tfx("crash", [], () => 0, () => 0, (N, tB, o) => {
  const cr = N.ctx.createBufferSource(); cr.buffer = N.noise; cr.loop = true;
  const hp = N.ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = N.hz(3200);
  cr.connect(hp); hp.connect(env(N.ctx, tB, o.vol || 0.2, 0.005, 1.3, true, N.fx));
  cr.start(tB); cr.stop(tB + 1.35);
});
tfx("boom", [], () => 0, () => 0, (N, tB, o) => {
  const b = N.ctx.createOscillator(); b.type = "sine";
  b.frequency.setValueAtTime(N.hz(o.f0 || 90), tB);
  b.frequency.exponentialRampToValueAtTime(N.hz(o.f1 || 34), tB + 0.5);
  b.connect(env(N.ctx, tB, o.vol || 0.5, 0.004, 0.75, true, N.fx));
  b.start(tB); b.stop(tB + 0.8);
});

/* The parameter-owning primitives. Each one leaves its parameter back where it found it, because
   the next transition is scheduled from a clean slate and a filter left shut is a silent song. */

/* the lowpass across the seam: `from` at the start of the lead-in, `to` on the downbeat, open
   again `post` beats later. One primitive rather than an open-into-it and a close-into-it, because
   two of those on one parameter is precisely the collision the `owns` rule exists to catch. */
tfx("lp", ["lp"], o => o.pre || 0, o => o.post || 0, (N, tB, o) => {
  const f = N.lp.frequency;
  const a = N.hz(o.from == null ? N.open : o.from), b = N.hz(o.to == null ? N.open : o.to);
  const pre = winPre(N, o.pre || 0), post = winPost(N, o.post || 0);
  if (pre > 0) {
    const t0 = tB - pre * N.beat;
    f.cancelScheduledValues(t0); f.setValueAtTime(a, t0); f.exponentialRampToValueAtTime(b, tB);
  } else { f.cancelScheduledValues(tB); f.setValueAtTime(b, tB); }
  if (post > 0) f.exponentialRampToValueAtTime(N.hz(N.open), tB + post * N.beat);
  else f.setValueAtTime(N.hz(N.open), tB + 0.002);
});
/* the highpass — the bass falling away into a drop, or arriving a bar late after one */
tfx("hpf", ["hp"], o => o.pre || 0, o => o.post || 0, (N, tB, o) => {
  const f = N.hp.frequency, b = N.hz(o.to == null ? 700 : o.to);
  const pre = winPre(N, o.pre || 0), post = winPost(N, o.post || 0);
  if (pre > 0) {
    const t0 = tB - pre * N.beat;
    f.cancelScheduledValues(t0); f.setValueAtTime(20, t0); f.exponentialRampToValueAtTime(b, tB);
  } else { f.cancelScheduledValues(tB); f.setValueAtTime(b, tB); }
  if (post > 0) f.exponentialRampToValueAtTime(20, tB + post * N.beat);
  else f.setValueAtTime(20, tB + 0.002);
});
/* a smooth level move: a fade into a quiet section, a fade-in out of one, or a dip either side of
   the boundary that lets the seam breathe without silencing it */
tfx("lvl", ["gain"], o => o.pre || 0, o => o.post || 0, (N, tB, o) => {
  const g = N.gain.gain, to = Math.max(0.001, o.to == null ? 0.02 : o.to);
  const pre = winPre(N, o.pre || 0), post = winPost(N, o.post || 0);
  if (pre <= 0 && post <= 0) return;                   // a fade with nowhere to fade is a jump
  if (pre > 0) {
    const t0 = tB - pre * N.beat;
    g.cancelScheduledValues(t0); g.setValueAtTime(1, t0); g.linearRampToValueAtTime(to, tB);
  } else { g.cancelScheduledValues(tB); g.setValueAtTime(to, tB); }
  if (post > 0) g.linearRampToValueAtTime(1, tB + post * N.beat);
  else g.setValueAtTime(1, tB + 0.002);
});
/* a hole: silence for the last beats before the downbeat. The edges are 8 ms ramps rather than
   steps, because a gain that jumps is a click, and a click is the one sound nobody asked for. */
tfx("gap", ["gain"], o => o.pre || 1, () => 0, (N, tB, o) => {
  const pre = winPre(N, o.pre || 1);
  if (pre <= 0) return;
  const g = N.gain.gain, t0 = tB - pre * N.beat;
  g.cancelScheduledValues(t0);
  g.setValueAtTime(1, t0);
  g.linearRampToValueAtTime(0.0001, t0 + 0.008);
  g.setValueAtTime(0.0001, tB - 0.008);
  g.linearRampToValueAtTime(1, tB);
});
/* the stutter: a gate opening and shutting `rate` times a beat, optionally holding silent for the
   last `hold` beats so the chop resolves into a hole rather than straight into the downbeat */
tfx("chop", ["gain"], o => o.pre || 0, o => o.post || 0, (N, tB, o) => {
  const pre = !o.post;
  const beats = pre ? winPre(N, o.pre || 4) : winPost(N, o.post);
  if (beats <= 0) return;
  const rate = o.rate || 4, hold = pre ? (o.hold || 0) : 0;
  const t0 = pre ? tB - beats * N.beat : tB;
  const n = Math.max(1, Math.round((beats - hold) * rate)), step = N.beat / rate;
  const g = N.gain.gain;
  g.cancelScheduledValues(t0);
  for (let k = 0; k < n; k++) {
    const t = t0 + k * step;
    g.setValueAtTime(1, t);
    g.linearRampToValueAtTime(0.0001, t + step * 0.45);
    g.setValueAtTime(0.0001, t + step * 0.98);
  }
  g.setValueAtTime(pre && hold ? 0.0001 : 1, t0 + n * step);
  if (pre) g.setValueAtTime(1, tB);
});
/* tape stop. A real one repitches the material, which a bus cannot do — `playbackRate` lives on
   the sources, and by the time the mix reaches here it is one signal. So this is the other two
   thirds of the effect, the level and the tone falling away together, plus a sine sliding down
   underneath to sell the pitch that isn't there. It reads as a tape stop; it isn't one. */
tfx("stop", ["gain", "lp"], o => o.pre || 2, () => 0, (N, tB, o) => {
  const beats = winPre(N, o.pre || 2), t0 = tB - beats * N.beat, len = beats * N.beat;
  if (beats <= 0) return;
  const g = N.gain.gain, f = N.lp.frequency;
  g.cancelScheduledValues(t0); g.setValueAtTime(1, t0);
  g.linearRampToValueAtTime(0.0001, tB - 0.02);
  g.setValueAtTime(1, tB);
  f.cancelScheduledValues(t0); f.setValueAtTime(N.hz(N.open), t0);
  f.exponentialRampToValueAtTime(N.hz(180), tB - 0.02);
  f.setValueAtTime(N.hz(N.open), tB);
  const osc = N.ctx.createOscillator(); osc.type = "triangle";
  osc.frequency.setValueAtTime(N.hz(220), t0);
  osc.frequency.exponentialRampToValueAtTime(N.hz(38), tB - 0.02);
  const og = N.ctx.createGain();
  og.gain.setValueAtTime(0.0001, t0);
  og.gain.linearRampToValueAtTime(0.07, t0 + len * 0.15);
  og.gain.linearRampToValueAtTime(0.0001, tB);
  osc.connect(og); og.connect(N.fx);
  osc.start(t0); osc.stop(tB + 0.02);
});
/* the send swells: a room opening up under the last bars, and a throw that turns whatever is
   playing when it opens into three repeats ringing over the downbeat */
tfx("wash", ["wash"], o => o.pre || 4, o => o.post || 1, (N, tB, o) => {
  const pre = winPre(N, o.pre || 4), post = winPost(N, o.post || 1);
  if (pre <= 0 || post <= 0) return;                   // a swell needs somewhere to swell and somewhere to clear
  const g = N.wash.gain, t0 = tB - pre * N.beat;
  g.cancelScheduledValues(t0); g.setValueAtTime(0, t0);
  g.linearRampToValueAtTime(o.amt || 0.5, tB);
  g.linearRampToValueAtTime(0, tB + post * N.beat);
});
tfx("echo", ["echo"], o => o.pre || 1, () => 0, (N, tB, o) => {
  const pre = winPre(N, o.pre || 1);
  if (pre <= 0) return;
  const g = N.echo.gain, t0 = tB - pre * N.beat, amt = o.amt || 0.7;
  g.cancelScheduledValues(t0); g.setValueAtTime(0, t0);
  g.linearRampToValueAtTime(amt, t0 + 0.01);
  g.setValueAtTime(amt, tB - 0.01);
  g.linearRampToValueAtTime(0, tB);       // shut on the downbeat: the repeats ring, the source stops feeding
});

/* ===== the presets =====
   Six families, because the six things a seam can do are genuinely different jobs — and because a
   list of forty-seven flat options is a list nobody reads to the end of. Every row is
   [id, family, name, primitives]; the windows are derived from the primitives below. */
// [id, name, what the family does, the glyph the arrangement strip marks it with]
const TRANS_CATS = [
  ["lift",  "Lifts", "Rise into it", "↗"],
  ["hit",   "Impacts", "Land on the downbeat", "◆"],
  ["cut",   "Cuts", "Take something away", "▮"],
  ["turn",  "Colour", "Bend the seam", "≈"],
  ["fall",  "Falls", "Let it down", "↘"],
  ["entry", "Entries", "Shape the first bars", "→"],
];
const TRANS = {};
[
["", "", "— no transition —", []],

/* Lifts — all of it before the downbeat, all of it stopping on it. */
["rise1",    "lift", "Riser · 1 bar",             [["rise", { beats: 4 }]]],
["rise2",    "lift", "Riser · 2 bars",            [["rise", { beats: 8 }]]],
["rise4",    "lift", "Riser · 4 bars",            [["rise", { beats: 16, vol: 0.18 }]]],
["revcym",   "lift", "Reverse cymbal",            [["revcym", { beats: 8 }]]],
["revcym2",  "lift", "Reverse cymbal · long",     [["revcym", { beats: 16, vol: 0.22 }]]],
["uplift",   "lift", "Uplifter · pitched sweep",  [["tone", { beats: 8, m0: 45, m1: 88 }]]],
["roll1",    "lift", "Snare roll · 1 bar",        [["roll", { beats: 4 }]]],
["roll2",    "lift", "Snare roll · 2 bars",       [["roll", { beats: 8, from: 1, to: 8 }]]],
["hatroll",  "lift", "Hat roll",                  [["roll", { beats: 4, ch: "O", from: 2, to: 12, vel: 0.7 }]]],
["rollrise", "lift", "Snare roll + riser",        [["roll", { beats: 8, from: 1, to: 8 }], ["rise", { beats: 8 }]]],
["opento",   "lift", "Filter opens into it",      [["lp", { pre: 16, from: 300 }]]],
["hplift",   "lift", "Bass falls away",           [["hpf", { pre: 8, to: 900 }]]],
["washup",   "lift", "Reverb swells into it",     [["wash", { pre: 8, amt: 0.55 }]]],

/* Impacts — the downbeat itself, and whatever it takes to make it land. */
["crash",    "hit", "Crash",                      [["crash", {}]]],
["boom",     "hit", "Sub boom",                   [["boom", {}]]],
["slam",     "hit", "Crash + sub · the drop",     [["crash", {}], ["boom", {}]]],
["gapslam",  "hit", "Silence, then the drop",     [["gap", { pre: 1 }], ["crash", {}], ["boom", {}]]],
["risedrop", "hit", "Riser → drop",               [["rise", { beats: 8 }], ["crash", {}], ["boom", {}]]],
["rolldrop", "hit", "Roll → drop",                [["roll", { beats: 4, from: 2, to: 10 }], ["crash", {}], ["boom", {}]]],
["revdrop",  "hit", "Reverse cymbal → drop",      [["revcym", { beats: 8 }], ["crash", {}], ["boom", {}]]],
["hpdrop",   "hit", "Bass drains → slam",         [["hpf", { pre: 8, to: 900 }], ["crash", {}], ["boom", {}]]],
["fulldrop", "hit", "The full drop",              [["rise", { beats: 16, vol: 0.18 }], ["hpf", { pre: 8, to: 700 }],
                                                   ["gap", { pre: 1 }], ["crash", {}], ["boom", {}]]],

/* Cuts — nothing added, something taken away. The oldest trick in dance music and still the one
   that makes the most difference for the least. */
["gaphalf",  "cut", "Half a beat of silence",     [["gap", { pre: 0.5 }]]],
["gap1",     "cut", "A beat of silence",          [["gap", { pre: 1 }]]],
["gap2",     "cut", "Two beats of silence",       [["gap", { pre: 2 }]]],
["gapbar",   "cut", "A bar of silence",           [["gap", { pre: 4 }]]],
["chop",     "cut", "Stutter · 1 bar",            [["chop", { pre: 4, rate: 4 }]]],
["chopfast", "cut", "Stutter · fast",             [["chop", { pre: 2, rate: 8 }]]],
["chopgap",  "cut", "Stutter into silence",       [["chop", { pre: 4, rate: 4, hold: 1 }]]],

/* Colour — the seam still plays, but it bends on the way through. */
["dip",      "turn", "Filter dip",                [["lp", { pre: 4, to: 420 }]]],
["under",    "turn", "Underwater",                [["lp", { pre: 8, to: 320, post: 4 }]]],
["echo",     "turn", "Echo throw",                [["echo", { pre: 1 }]]],
["echogap",  "turn", "Echo throw into silence",   [["echo", { pre: 1.5 }], ["gap", { pre: 1 }]]],
["wash",     "turn", "Reverb wash",               [["wash", { pre: 4, post: 4, amt: 0.5 }]]],
["hpseam",   "turn", "Highpass pinch",            [["hpf", { pre: 4, to: 1200, post: 4 }]]],
/* both filters at once: the seam squeezed to a mid band — a telephone — and released. The two
   primitives own different parameters, so this is a legal pairing, not a collision. */
["telephone","turn", "Telephone squeeze",         [["lp", { pre: 4, to: 2600, post: 4 }],
                                                   ["hpf", { pre: 4, to: 560, post: 4 }]]],
["duck",     "turn", "Duck through the seam",     [["lvl", { pre: 2, post: 2, to: 0.18 }]]],

/* Falls — the other half of the vocabulary, and the half most tools forget. Getting *out* of a
   chorus is as much a decision as getting into one. */
["down",     "fall", "Downlifter",                [["fall", { beats: 4 }]]],
["downtone", "fall", "Pitch fall",                [["tone", { beats: 4, m0: 76, m1: 33, at: "post" }]]],
["fadeto",   "fall", "Fade into it",              [["lvl", { pre: 8, to: 0.06 }]]],
["stop",     "fall", "Tape stop",                 [["stop", { pre: 2 }]]],
["closeto",  "fall", "Filter closes into it",     [["lp", { pre: 8, to: 500, post: 4 }]]],
["spin",     "fall", "Spin down",                 [["stop", { pre: 2 }], ["fall", { beats: 4, at: "post" }]]],

/* Entries — everything after the downbeat. The section arrives already shaped, which is how a
   breakdown starts small and grows without anyone drawing an automation curve. */
["fadein",   "entry", "Fade in · 2 bars",         [["lvl", { post: 8 }]]],
["fadein4",  "entry", "Fade in · 4 bars",         [["lvl", { post: 16 }]]],
["openfrom", "entry", "Opens up · 2 bars",        [["lp", { post: 8, to: 380 }]]],
["openfrom4","entry", "Opens up · 4 bars",        [["lp", { post: 16, to: 300 }]]],
["hpin",     "entry", "Bass arrives late",        [["hpf", { post: 8, to: 800 }]]],
["phonein",  "entry", "Telephone opens up",       [["lp", { post: 8, to: 2600 }],
                                                   ["hpf", { post: 8, to: 560 }]]],
["bloom",    "entry", "Reverb blooms open",       [["wash", { pre: 0.25, post: 8, amt: 0.5 }]]],
["stutin",   "entry", "Stutter in",               [["chop", { post: 2, rate: 6 }]]],
["crashin",  "entry", "Crash, then open up",      [["crash", {}], ["lp", { post: 8, to: 380 }]]],
].forEach(([id, cat, name, fx]) => {
  // the windows a preset needs are the widest its primitives ask for — this is what the caller
  // reads to know how many bars before the boundary the cue has to be armed
  const pre = fx.reduce((n, [k, o]) => Math.max(n, TFX[k] ? TFX[k].pre(o || {}) : 0), 0);
  const post = fx.reduce((n, [k, o]) => Math.max(n, TFX[k] ? TFX[k].post(o || {}) : 0), 0);
  TRANS[id] = { id, cat, name, fx, pre, post };
});

/* Schedule one transition around a boundary at `tB`. `env` carries what the primitives cannot know
   for themselves: the tempo, the kit, the noise buffer, and how many beats of room there actually
   are either side — a lead-in must never reach back into a section that has already played. */
function applyTrans(tn, T, tB, env) {
  if (!tn || !T || !T.fx || !T.fx.length) return;
  const ctx = env.ctx, top = ctx.sampleRate / 2 - 100;
  const N = { ...tn, ctx, beat: env.beat, noise: env.noise, kit: env.kit,
    maxPre: env.maxPre == null ? 64 : env.maxPre,
    maxPost: env.maxPost == null ? 64 : env.maxPost,
    open: Math.min(tn.open || FILTER_OPEN, top),
    hz: v => Math.max(20, Math.min(v, top)) };
  for (const [id, o] of T.fx) { const P = TFX[id]; if (P) P.run(N, tB, o || {}); }
}
// every parameter a preset writes, for the collision check — two envelopes on one AudioParam is a
// silent bug at runtime and a loud one here
const transOwns = T => (T && T.fx || []).flatMap(([id]) => (TFX[id] || {}).owns || []);

// Sidechain pump. The pitched bus runs through a gain that gets slammed down on every kick
// and breathes back before the next one — the ducking that defines house, techno and EDM.
// We schedule the envelope directly instead of running a real compressor with a detector:
// we already know exactly when each kick lands, so this is sample-accurate and free.
function duckAt(g, t, amount, rel) {
  const floor = Math.max(0.05, 1 - amount);
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(1, t);                                  // full level at the hit…
  g.gain.linearRampToValueAtTime(floor, t + 0.006);             // …down in ~6 ms
  g.gain.linearRampToValueAtTime(1, t + Math.max(0.09, rel));   // and back up through the gap
}
// Karplus–Strong plucked string: a short noise burst excites a tuned feedback
// delay line with a damping low-pass — the physical model of a real plucked
// string, far closer to an acoustic guitar than a filtered sawtooth.
function ksPluck(ctx, t, freq, dur, vol, bright, dest) {
  const period = 1 / freq;
  const delay = ctx.createDelay(0.05);
  delay.delayTime.value = period;
  const damp = ctx.createBiquadFilter();
  damp.type = "lowpass"; damp.frequency.value = Math.min(7000, 1400 + bright); damp.Q.value = 0.2;
  const fb = ctx.createGain();
  // feedback per round-trip, tuned so the string decays to silence over ~dur. HARD CAP well below 1:
  // a real Web-Audio delay+filter loop has a little excess gain (fractional-delay interpolation, the
  // biquad), so a feedback near unity doesn't decay — it self-oscillates into a piercing squeal that
  // the limiter then pins at full scale. Measured stable up to ~0.85; 0.8 keeps a safe margin.
  fb.gain.value = Math.min(0.8, Math.pow(0.0008, period / Math.max(0.12, dur)));
  delay.connect(damp); damp.connect(fb); fb.connect(delay);
  const out = ctx.createGain();
  out.gain.setValueAtTime(vol, t);
  out.gain.setValueAtTime(vol, t + dur * 0.8);
  out.gain.exponentialRampToValueAtTime(0.0004, t + dur + 0.12);
  delay.connect(out); out.connect(dest || ctx.destination);
  // excitation: a burst of noise one period long
  const nlen = Math.max(2, Math.ceil(ctx.sampleRate * period));
  const buf = ctx.createBuffer(1, nlen, ctx.sampleRate);
  const d = buf.getChannelData(0);
  // Seeded from the note's own length, so two plucks of different pitches are still different
  // excitations — but the same note plucked in two renders of one song is the same sound. With
  // Math.random here a song exported twice came out audibly different both times.
  for (let i = 0; i < nlen; i++) d[i] = hashNoise(nlen * 31 + i) * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const ig = ctx.createGain(); ig.gain.value = 1;
  src.connect(ig); ig.connect(delay);
  src.start(t); src.stop(t + period + 0.02);
}
/* ===== the percussion layer's voices =====
   Hand percussion, not a second drum kit: noise shaped for the shakes and jangles, tuned
   membranes with a falling pitch for the drums, ringing partials for the metal. `ch` is a
   channel letter from a PERCS pattern (see PERC_VOICES); unknown letters are silently skipped,
   so a grid painted against an older row set degrades to silence rather than a wrong sound. */
/* Every percussion kit's eight voices, as data — the same reasoning as DRUM_KIT_SPECS above.
     S (shaker): [nzAtk, nzDec, nzHz, nzQ] — one filtered noise burst.
     M (tambourine): [decM, hzM, metalVol, metalDec] — noise plus a two-partial jingle ring.
     T (triangle): [vol, dec] — the ring shape (partials) is shared; only level and length vary.
     W (woodblock/clave): { parts, dec, vol? } — ringing metal partials.
     L (cowbell): { parts, vol, dec, clank } — clank adds a short noise knock (an "assistant" pair);
       kits with a fixed-pitch idea of a cowbell (a real hit, not a struck bell) drop it.
     C/G/B (congas, low conga, 808 boom): [hz0, hz1, vol, dec] — a tuned membrane dropping in pitch. */
const PERC_KIT_SPECS = {
  hand: { S:[0.004,0.055,6200,1.6], M:[0.14,7600,0.05,0.12], T:[0.055,0.9],
    W:{ parts:[[2100,1],[3300,0.25]], dec:0.045 }, L:{ parts:[[540,1],[800,0.85]], vol:0.16, dec:0.22, clank:true },
    C:[230,185,0.26,0.16], G:[165,130,0.28,0.28], B:[400,330,0.22,0.09] },
  machine: { S:[0.001,0.035,7800,3], M:[0.08,8800,0.03,0.06], T:[0.055,0.3],
    W:{ parts:[[2500,1]], dec:0.03 }, L:{ parts:[[540,1],[800,0.85]], vol:0.16, dec:0.14, clank:false },
    C:[310,305,0.24,0.09], G:[220,216,0.26,0.14], B:[470,462,0.2,0.06] },
  electro: { S:[0.001,0.022,9400,3.5], M:[0.045,9800,0.035,0.04], T:[0.055,0.4],
    W:{ parts:[[2900,1],[4300,0.2]], dec:0.02 }, L:{ parts:[[560,1],[840,0.9]], vol:0.16, dec:0.1, clank:false },
    C:[340,332,0.22,0.06], G:[240,232,0.24,0.1], B:[500,490,0.18,0.045] },
  lofi: { S:[0.007,0.09,3600,1], M:[0.2,5000,0.06,0.18], T:[0.04,0.65],
    W:{ parts:[[1700,1]], dec:0.07 }, L:{ parts:[[480,1],[720,0.7]], vol:0.1, dec:0.3, clank:true },
    C:[210,175,0.22,0.22], G:[150,120,0.24,0.36], B:[370,300,0.2,0.12] },
  latin: { S:[0.006,0.09,5400,1.3], M:[0.18,7200,0.06,0.16], T:[0.06,1.1],   // warm and resonant — a live congas-and-timbales set
    W:{ parts:[[2000,1],[3100,0.3]], dec:0.05 }, L:{ parts:[[560,1],[820,0.8]], vol:0.18, dec:0.26, clank:true },
    C:[235,190,0.28,0.2], G:[160,125,0.3,0.32], B:[410,335,0.24,0.11] },
  trap: { S:[0.001,0.02,8200,3.2], M:[0.035,9600,0.03,0.03], T:[0.05,0.25],   // tight and punchy — shorter and more clipped than machine
    W:{ parts:[[2700,1]], dec:0.015 }, L:{ parts:[[520,1],[780,0.9]], vol:0.14, dec:0.08, clank:false },
    C:[330,320,0.22,0.05], G:[230,222,0.24,0.08], B:[490,478,0.18,0.04] },
  industrial: { S:[0.001,0.05,5200,0.7], M:[0.1,6600,0.07,0.15], T:[0.07,0.5],   // noisy, metallic, distorted
    W:{ parts:[[1900,1],[2600,0.6]], dec:0.06 }, L:{ parts:[[460,1],[700,0.9]], vol:0.22, dec:0.3, clank:true },
    C:[260,150,0.3,0.28], G:[180,100,0.32,0.4], B:[430,280,0.26,0.16] },
  jungle: { S:[0.0005,0.018,9800,3.8], M:[0.03,10200,0.04,0.03], T:[0.05,0.35],   // bright and fast — sharper than electro
    W:{ parts:[[3000,1],[4500,0.25]], dec:0.015 }, L:{ parts:[[580,1],[860,0.9]], vol:0.15, dec:0.09, clank:false },
    C:[350,340,0.2,0.045], G:[250,240,0.22,0.07], B:[510,498,0.16,0.035] },
  dub: { S:[0.01,0.13,3200,0.9], M:[0.24,4600,0.05,0.22], T:[0.035,1],   // soft, muted, brushed — everything gentle and long
    W:{ parts:[[1500,1]], dec:0.09 }, L:{ parts:[[440,1],[660,0.6]], vol:0.09, dec:0.34, clank:false },
    C:[195,160,0.2,0.26], G:[140,110,0.22,0.4], B:[350,285,0.18,0.14] },
  bright: { S:[0.001,0.045,10400,2.2], M:[0.16,10600,0.06,0.2], T:[0.07,1.3],   // shimmering, high-overtone, a longer metallic ring
    W:{ parts:[[3200,1],[4800,0.35],[6400,0.15]], dec:0.06 }, L:{ parts:[[600,1],[900,0.95],[1350,0.4]], vol:0.17, dec:0.3, clank:true },
    C:[300,250,0.2,0.12], G:[210,175,0.22,0.2], B:[460,400,0.16,0.06] },
};
function percSound(ctx, t, ch, noise, dest, vel = 1, kit = "hand") {
  const KP = PERC_KIT_SPECS[kit] || PERC_KIT_SPECS.hand;
  const nz = (vol0, atk, dec, type, hz, Q) => {
    const vol = vol0 * vel;
    const n = ctx.createBufferSource(); n.buffer = noise;
    if (dec > 0.25) n.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = hz;
    if (Q) f.Q.value = Q;
    n.connect(f); f.connect(env(ctx, t, vol, atk, dec, true, dest));
    n.start(t); n.stop(t + dec + 0.05);
  };
  // a tuned membrane: a sine dropping onto its pitch, with a knuckle of noise at the front
  const skin = (hz0, hz1, vol, dec) => {
    const o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(hz0, t);
    o.frequency.exponentialRampToValueAtTime(hz1, t + dec * 0.7);
    o.connect(env(ctx, t, vol * vel, 0.002, dec, true, dest));
    o.start(t); o.stop(t + dec + 0.05);
    nz(vol * 0.25, 0.001, 0.02, "bandpass", 2200, 1);
  };
  // ringing metal: a few inharmonic partials, quiet and long
  const metal = (parts, vol, dec, type = "sine") => {
    for (const [hz, amp] of parts) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz;
      o.connect(env(ctx, t, vol * amp * vel, 0.001, dec, true, dest));
      o.start(t); o.stop(t + dec + 0.05);
    }
  };
  switch (ch) {
    case "S": nz(0.11, KP.S[0], KP.S[1], "bandpass", KP.S[2], KP.S[3]); break;
    case "M": { const [decM, hzM, mVol, mDec] = KP.M;
      nz(0.09, 0.001, decM, "highpass", hzM, 0.8);                   // tambourine — noise + jingle ring
      metal([[7900, 0.4], [9100, 0.3]], mVol, mDec); break; }
    case "T": metal([[5100, 1], [7635, 0.55], [10250, 0.25]], KP.T[0], KP.T[1]); break;
    case "W": metal(KP.W.parts, KP.W.vol == null ? 0.3 : KP.W.vol, KP.W.dec); break;   // woodblock → 808 clave
    case "L": metal(KP.L.parts, KP.L.vol, KP.L.dec, "square");
      if (KP.L.clank) nz(0.04, 0.001, 0.03, "bandpass", 900, 2); break;
    // a kit's "congas" are a fixed-pitch tuned blip when its own C/G/B pitches sit close together,
    // a struck skin (a wider drop) otherwise — same call either way, just different numbers
    case "C": skin(...KP.C); break;
    case "G": skin(...KP.G); break;
    case "B": skin(...KP.B); break;
    default: break;
  }
}

/* ===== General MIDI program numbers =====
   The soundfont folder keys are the GM names, so their position in the standard 128-instrument
   list is the program number. An exported file that names its instruments opens in a DAW already
   voiced, instead of every track landing on the default piano. */
const GM_NAMES = `
  acoustic_grand_piano bright_acoustic_piano electric_grand_piano honkytonk_piano electric_piano_1
  electric_piano_2 harpsichord clavinet celesta glockenspiel music_box vibraphone marimba
  xylophone tubular_bells dulcimer drawbar_organ percussive_organ rock_organ church_organ
  reed_organ accordion harmonica tango_accordion acoustic_guitar_nylon acoustic_guitar_steel
  electric_guitar_jazz electric_guitar_clean electric_guitar_muted overdriven_guitar
  distortion_guitar guitar_harmonics acoustic_bass electric_bass_finger electric_bass_pick
  fretless_bass slap_bass_1 slap_bass_2 synth_bass_1 synth_bass_2 violin viola cello contrabass
  tremolo_strings pizzicato_strings orchestral_harp timpani string_ensemble_1 string_ensemble_2
  synth_strings_1 synth_strings_2 choir_aahs voice_oohs synth_choir orchestra_hit trumpet trombone
  tuba muted_trumpet french_horn brass_section synth_brass_1 synth_brass_2 soprano_sax alto_sax
  tenor_sax baritone_sax oboe english_horn bassoon clarinet piccolo flute recorder pan_flute
  blown_bottle shakuhachi whistle ocarina lead_1_square lead_2_sawtooth lead_3_calliope
  lead_4_chiff lead_5_charang lead_6_voice lead_7_fifths lead_8_bass__lead pad_1_new_age
  pad_2_warm pad_3_polysynth pad_4_choir pad_5_bowed pad_6_metallic pad_7_halo pad_8_sweep
  fx_1_rain fx_2_soundtrack fx_3_crystal fx_4_atmosphere fx_5_brightness fx_6_goblins fx_7_echoes
  fx_8_scifi sitar banjo shamisen koto kalimba bagpipe fiddle shanai tinkle_bell agogo steel_drums
  woodblock taiko_drum melodic_tom synth_drum reverse_cymbal guitar_fret_noise breath_noise
  seashore bird_tweet telephone_ring helicopter applause gunshot
`.trim().split(/\s+/);
const GM_PROGRAM = Object.fromEntries(GM_NAMES.map((n, i) => [n, i]));
// the built-in synth voices aren't GM at all, so map each to its nearest General MIDI equivalent
const SYNTH_PROGRAM = { synth:81, sine:80, triangle:80, square:80, saw:81, pluck:25, bell:11,
  musicbox:10, ep:4, strings:48, brass:61, organ:16, voice:53, glass:88,
  supersaw:81, hoover:81, acid:87, reese:39, sub:38, stab:62,
  clav:7, moog:81, pizz:45, chime:14, warmpad:89, growl:39 };
// program number for anything the app can voice: a GM key, a synth id, or nothing recognisable
const programOf = (key, fallback = 0) => {
  const k = gmKey(key);
  if (GM_PROGRAM[k] != null) return GM_PROGRAM[k];
  if (SYNTH_PROGRAM[key] != null) return SYNTH_PROGRAM[key];
  if (isCustomVoice(key)) return 81;   // no GM equivalent to guess — nearest is a generic synth lead
  return fallback;
};

/* ===== tempo-synced delay =====
   A dotted-eighth delay is the sound of a produced dance lead: the echo lands three sixteenths
   later, so it interlocks with the beat instead of blurring it. Built as a send, so a part can be
   fed into it by amount rather than being replaced by it. Feedback stays well under 1 so the tail
   always dies away. */
const DELAY_TIMES = [["off", "No delay", 0], ["8d", "Dotted 8th", 0.75], ["8", "Eighth", 0.5],
                     ["4", "Quarter", 1], ["16", "Sixteenth", 0.25]];
const DELAY_BEATS = Object.fromEntries(DELAY_TIMES.map(([id, , b]) => [id, b]));
function makeDelay(ctx, dest, beatSec, id) {
  const beats = DELAY_BEATS[id] || 0;
  if (!beats) return null;
  const time = Math.min(1.8, beats * beatSec);
  const dl = ctx.createDelay(2.0); dl.delayTime.value = time;
  const fb = ctx.createGain(); fb.gain.value = 0.34;         // ~3 audible repeats, always decaying
  const tone = ctx.createBiquadFilter();                     // each repeat darker than the last
  tone.type = "lowpass"; tone.frequency.value = 2600;
  const send = ctx.createGain(); send.gain.value = 1;
  send.connect(dl); dl.connect(tone); tone.connect(fb); fb.connect(dl);
  dl.connect(dest);
  return { send, dl, fb, time };
}

/* ===== voice leading =====
   Root-position stacks make every chord change a leap: the whole voicing jumps whenever the root
   does, which is most of why a progression can sound typed rather than played. Choosing the
   inversion whose upper voices sit nearest the previous chord's lets the harmony move by step.
   The bass keeps the root — that movement is the point of the progression, so it is left alone. */
const VOICE_LO = 55, VOICE_HI = 79;                 // the register the upper voices live in
const avgOf = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
function voiceChord(chord, prev) {
  const pcs = chordIvs(chord.quality).map(x => (chord.root + x) % 12);
  let best = null;
  for (let inv = 0; inv < pcs.length; inv++) {
    const notes = [];
    let last = VOICE_LO - 1;
    for (let k = 0; k < pcs.length; k++) {
      const pc = pcs[(k + inv) % pcs.length];
      let m = VOICE_LO + (((pc - VOICE_LO) % 12) + 12) % 12;
      while (m <= last) m += 12;                     // stack ascending, no doubled position
      notes.push(m); last = m;
    }
    if (notes[notes.length - 1] > VOICE_HI + 5) continue;          // this rotation sits too high
    // nearest to where the last chord sat; with nothing before it, aim at the middle of the window
    const cost = Math.abs(avgOf(notes) - (prev && prev.length ? avgOf(prev) : (VOICE_LO + VOICE_HI) / 2));
    if (!best || cost < best.cost) best = { notes, cost };
  }
  return best ? best.notes : pcs.map(pc => VOICE_LO + pc);
}
function strumChord(ctx, t, chord, sym, dest, voicing, noBass) {
  const base = 48 + chord.root;
  const led = voicing || voiceChord(chord);
  // when the bass track is carrying the root, the chords stop doubling it — same notes, same
  // times, but the low octave belongs to one source instead of two fighting over it
  let notes = sym === "U" ? led.slice(1).reverse() : noBass ? led : [base - 12, ...led];
  const vol = sym === ">" ? 0.16 : sym === "U" ? 0.09 : 0.12;
  const dur = sym === ">" ? 1.4 : 0.9;
  const bright = sym === ">" ? 2600 : sym === "U" ? 1400 : 1900;
  notes.forEach((mid, j) => {
    const tt = t + j * (sym === "U" ? 0.010 : 0.016);   // roll the pick across the strings
    ksPluck(ctx, tt, midiHz(mid), dur, vol, bright, dest);
  });
}
// sustained bowed/blown voice (strings, brass, reeds, pads) for the offline fallback
function padVoice(ctx, t, mid, sym, slotDur, dest) {
  const freq = midiHz(mid), vol = (sym === ">" ? 0.06 : 0.045);
  const dur = Math.max(0.2, slotDur * 0.95);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.06);
  g.gain.setValueAtTime(vol, t + Math.max(0.08, dur - 0.06));
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05);
  const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 2400; f.Q.value = 0.5;
  f.connect(g).connect(dest || ctx.destination);
  [[1, 0.5, "sawtooth"], [1.004, 0.5, "sawtooth"], [2, 0.12, "sine"]].forEach(([mult, amp, type]) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq * mult;
    const pg = ctx.createGain(); pg.gain.value = amp; o.connect(pg).connect(f);
    o.start(t); o.stop(t + dur + 0.1);
  });
}
function playHit(ctx, t, chord, sym, instr, slotDur, dest, voicing, noBass) {
  const fam = gmFam(instr);
  if (fam === "pluck") return strumChord(ctx, t, chord, sym, dest, voicing, noBass);
  const iv = chordIvs(chord.quality), rootMid = 48 + chord.root;
  if (fam === "bass") {
    const o = ctx.createOscillator();
    o.frequency.value = midiHz(36 + chord.root + (sym === "U" ? 7 : 0));
    o.type = "sawtooth";
    const f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 440; f.Q.value = 1;
    o.connect(f); f.connect(env(ctx, t, sym === ">" ? 0.30 : 0.20, 0.008, 0.5, true, dest));
    o.start(t); o.stop(t + 0.6);
    return;
  }
  const led = voicing || voiceChord(chord);
  const notes = sym === "U" ? led.slice(1) : noBass ? led : [rootMid - 12, ...led];
  notes.forEach((mid, j) => {
    if (fam === "organ") {
      [1, 2, 3].forEach((h, hi) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine"; o.frequency.value = midiHz(mid) * h;
        const vol = (sym === ">" ? 0.055 : 0.04) / (hi + 1);
        const dur = Math.max(0.14, slotDur * 0.92);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.02);
        g.gain.setValueAtTime(vol, t + Math.max(0.05, dur - 0.04));
        g.gain.linearRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(dest || ctx.destination);
        o.start(t); o.stop(t + dur + 0.05);
      });
    } else if (fam === "pad") {
      padVoice(ctx, t, mid, sym, slotDur, dest);
    } else { // keys / mallet — fundamental + partials, hammer attack (mallet decays quicker)
      const freq = midiHz(mid);
      const vol = sym === ">" ? 0.10 : sym === "U" ? 0.055 : 0.08;
      const tt = t + j * 0.003, dur = fam === "mallet" ? 0.45 : (sym === ">" ? 1.1 : 0.8);
      [[1, 1, "triangle"], [2, 0.28, "sine"], [4, 0.07, "sine"]].forEach(([h, hv, type]) => {
        const o = ctx.createOscillator();
        o.type = type; o.frequency.value = freq * h;
        o.connect(env(ctx, tt, vol * hv, 0.004, dur / (h > 1 ? 2.5 : 1), true, dest));
        o.start(tt); o.stop(tt + dur + 0.1);
      });
    }
  });
}

/* ===== realistic samples (real recorded instruments, loaded when online) ===== */
// FluidR3 GM soundfont MP3s via jsDelivr (CORS-enabled). Every General MIDI instrument is
// available; we fetch a few natural-note anchors per instrument and pitch-shift to cover the
// rest, so downloads stay small (loaded lazily only for the instrument you pick) and the
// service worker caches them for offline use. Anything that fails (offline / blocked) falls
// back to a synth voice picked by the instrument's family.
const SF_BASE = "https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@master/FluidR3_GM/";
const SF_NAT = { 0:"C", 2:"D", 4:"E", 5:"F", 7:"G", 9:"A", 11:"B" };
// The instrument catalogue, grouped for the dropdowns. Each entry: [GM folder key, label, synth-family].
// families: pluck | keys | organ | bass | pad | mallet — used for the offline synth fallback.
const GM_CATS = [
  ["Pianos & keys", [
    ["acoustic_grand_piano","Grand piano","keys"], ["bright_acoustic_piano","Bright piano","keys"],
    ["electric_grand_piano","Electric grand","keys"], ["honkytonk_piano","Honky-tonk","keys"],
    ["electric_piano_1","Electric piano","keys"], ["electric_piano_2","Electric piano 2","keys"],
    ["harpsichord","Harpsichord","pluck"], ["clavinet","Clavinet","keys"]]],
  ["Mallets & bells", [
    ["celesta","Celesta","mallet"], ["glockenspiel","Glockenspiel","mallet"], ["music_box","Music box","mallet"],
    ["vibraphone","Vibraphone","mallet"], ["marimba","Marimba","mallet"], ["xylophone","Xylophone","mallet"],
    ["tubular_bells","Tubular bells","mallet"], ["dulcimer","Dulcimer","pluck"]]],
  ["Organs & accordion", [
    ["drawbar_organ","Drawbar organ","organ"], ["percussive_organ","Percussive organ","organ"],
    ["rock_organ","Rock organ","organ"], ["church_organ","Church organ","organ"],
    ["reed_organ","Reed organ","organ"], ["accordion","Accordion","organ"],
    ["harmonica","Harmonica","organ"], ["tango_accordion","Tango accordion","organ"]]],
  ["Guitars", [
    ["acoustic_guitar_nylon","Nylon guitar","pluck"], ["acoustic_guitar_steel","Steel guitar","pluck"],
    ["electric_guitar_jazz","Jazz guitar","pluck"], ["electric_guitar_clean","Clean electric","pluck"],
    ["electric_guitar_muted","Muted electric","pluck"], ["overdriven_guitar","Overdrive guitar","pluck"],
    ["distortion_guitar","Distortion guitar","pluck"], ["guitar_harmonics","Guitar harmonics","pluck"]]],
  ["Basses", [
    ["acoustic_bass","Acoustic bass","bass"], ["electric_bass_finger","Finger bass","bass"],
    ["electric_bass_pick","Pick bass","bass"], ["fretless_bass","Fretless bass","bass"],
    ["slap_bass_1","Slap bass","bass"], ["slap_bass_2","Slap bass 2","bass"],
    ["synth_bass_1","Synth bass","bass"], ["synth_bass_2","Synth bass 2","bass"], ["contrabass","Double bass","bass"]]],
  ["Strings & harp", [
    ["violin","Violin","pad"], ["viola","Viola","pad"], ["cello","Cello","pad"],
    ["tremolo_strings","Tremolo strings","pad"], ["pizzicato_strings","Pizzicato strings","pluck"],
    ["orchestral_harp","Harp","pluck"], ["timpani","Timpani","mallet"]]],
  ["Ensemble & choir", [
    ["string_ensemble_1","String ensemble","pad"], ["string_ensemble_2","Slow strings","pad"],
    ["synth_strings_1","Synth strings","pad"], ["synth_strings_2","Synth strings 2","pad"],
    ["choir_aahs","Choir “aahs”","pad"],
    ["voice_oohs","Voice “oohs”","pad"], ["synth_choir","Synth voice","pad"], ["orchestra_hit","Orchestra hit","keys"]]],
  ["Brass", [
    ["trumpet","Trumpet","pad"], ["trombone","Trombone","pad"], ["tuba","Tuba","bass"],
    ["muted_trumpet","Muted trumpet","pad"], ["french_horn","French horn","pad"],
    ["brass_section","Brass section","pad"], ["synth_brass_1","Synth brass","pad"],
    ["synth_brass_2","Synth brass 2","pad"]]],
  ["Reeds", [
    ["soprano_sax","Soprano sax","pad"], ["alto_sax","Alto sax","pad"], ["tenor_sax","Tenor sax","pad"],
    ["baritone_sax","Baritone sax","pad"], ["oboe","Oboe","pad"], ["english_horn","English horn","pad"],
    ["bassoon","Bassoon","pad"], ["clarinet","Clarinet","pad"]]],
  ["Pipes", [
    ["piccolo","Piccolo","pad"], ["flute","Flute","pad"], ["recorder","Recorder","pad"],
    ["pan_flute","Pan flute","pad"], ["whistle","Whistle","pad"], ["ocarina","Ocarina","pad"],
    ["blown_bottle","Blown bottle","pad"], ["shakuhachi","Shakuhachi","pad"]]],
  ["Synth lead & pad", [
    ["lead_1_square","Square lead","keys"], ["lead_2_sawtooth","Saw lead","keys"],
    ["lead_3_calliope","Calliope lead","pad"], ["lead_4_chiff","Chiff lead","keys"],
    ["lead_5_charang","Charang lead","keys"], ["lead_6_voice","Voice lead","pad"],
    ["lead_7_fifths","Fifths lead","keys"], ["lead_8_bass__lead","Bass+lead","keys"],
    ["pad_1_new_age","New-age pad","pad"], ["pad_2_warm","Warm pad","pad"],
    ["pad_3_polysynth","Polysynth pad","pad"], ["pad_4_choir","Choir pad","pad"],
    ["pad_5_bowed","Bowed pad","pad"], ["pad_6_metallic","Metallic pad","pad"],
    ["pad_7_halo","Halo pad","pad"], ["pad_8_sweep","Sweep pad","pad"]]],
  ["World", [
    ["sitar","Sitar","pluck"], ["banjo","Banjo","pluck"], ["shamisen","Shamisen","pluck"],
    ["koto","Koto","pluck"], ["kalimba","Kalimba","mallet"], ["shanai","Shanai","pad"],
    ["steel_drums","Steel drums","mallet"], ["agogo","Agogo","mallet"],
    ["bagpipe","Bagpipe","organ"], ["fiddle","Fiddle","pad"], ["tinkle_bell","Tinkle bell","mallet"],
    ["woodblock","Woodblock","mallet"], ["taiko_drum","Taiko drum","mallet"],
    ["melodic_tom","Melodic tom","mallet"], ["synth_drum","Synth drum","mallet"]]],
];
const GM_FAM = {}, GM_LABEL = {};
GM_CATS.forEach(([, list]) => list.forEach(([k, label, fam]) => { GM_FAM[k] = fam; GM_LABEL[k] = label; }));
const isGM = k => GM_FAM[k] !== undefined;
// old sketch/state values → GM keys
const LEGACY_INSTR = { guitar:"acoustic_guitar_steel", piano:"acoustic_grand_piano",
  organ:"drawbar_organ", bass:"acoustic_bass", dbass:"contrabass" };
const gmKey = k => LEGACY_INSTR[k] || k;
const gmFam = k => GM_FAM[gmKey(k)] || "keys";
// natural-note anchors: basses low, everything else spanning chord + melody range. Denser than a
// bare octave grid (gaps of ~3-5 semitones, not ~7) so notes are pitch-shifted only a little from
// the nearest real sample — the less a sample is stretched, the more natural the instrument sounds.
const anchorsFor = k => gmFam(k) === "bass" ? [24,31,36,41,45,48] : [43,48,53,57,62,67,72,76,81,84];
// offline synth-family fallback for the melody lead → a LEAD_SPECS voice
const FAM_LEAD = { pluck:"pluck", keys:"ep", organ:"organ", bass:"pluck", pad:"strings", mallet:"bell" };

const sfName = m => SF_NAT[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const sfRawCache = {};                                    // "folder:midi" → Promise<ArrayBuffer>
function sfFetch(folder, midi) {
  const ck = folder + ":" + midi;
  if (sfRawCache[ck]) return sfRawCache[ck];
  const url = SF_BASE + folder + "-mp3/" + sfName(midi) + ".mp3";
  sfRawCache[ck] = fetch(url).then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status));
  sfRawCache[ck].catch(() => { delete sfRawCache[ck]; });   // let a later attempt retry
  return sfRawCache[ck];
}
function sfPrefetch(k) { const f = gmKey(k); if (isGM(f)) anchorsFor(f).forEach(m => sfFetch(f, m).catch(() => {})); }
// a sampler bound to one AudioContext: decodes the cached MP3s and plays the nearest anchor repitched
function makeSampler(ctx) {
  const decoded = {}, done = {}, loading = {};
  const load = k => {
    const f = gmKey(k);
    if (!isGM(f) || done[f]) return Promise.resolve();
    if (loading[f]) return loading[f];
    const anc = anchorsFor(f);
    loading[f] = Promise.all(anc.map(m =>
      sfFetch(f, m).then(ab => ctx.decodeAudioData(ab.slice(0)))
        .then(buf => { decoded[f + ":" + m] = buf; }).catch(() => {})
    )).then(() => { done[f] = anc.some(m => decoded[f + ":" + m]); });
    return loading[f];
  };
  const ready = k => !!done[gmKey(k)];
  // nearest usable anchor to a target note. Repitching is ASYMMETRIC: shifting a sample down just
  // makes it lower and warmer, but shifting it up raises the pitch and thins it — past a little way
  // it becomes the piercing squeal. So allow a big down-shift (a chord's bass note sits an octave
  // below the lowest anchor) but only a small up-shift; notes needing more defer to the synth voice.
  const MAX_UP = 7, MAX_DOWN = 16;   // semitones of repitch allowed above / below an anchor
  const nearest = (k, midi) => {
    const f = gmKey(k);
    let best = null;
    for (const m of anchorsFor(f)) {
      const buf = decoded[f + ":" + m]; if (!buf) continue;
      const shift = midi - m;                              // + = repitch up (the squeal direction)
      if (shift > MAX_UP || shift < -MAX_DOWN) continue;   // outside the safe range for this anchor
      const d = Math.abs(shift); if (!best || d < best.d) best = { m, d, buf };
    }
    return best;
  };
  const covers = (k, midi) => !!nearest(k, midi);
  /* A sample already carries its own attack and decay in the recording, so the part's envelope can
     only shape it from outside: hold it back on the way in, scale where it settles, and let it ring
     longer or cut it shorter on the way out. Decay is the one stage that has no meaning here — it is
     baked into the recorded note — so it is left alone rather than faked. */
  const play = (k, t, midi, gain, dur, dest, shape) => {
    const best = nearest(k, midi);
    if (!best) return false;
    const S = shape || NO_SHAPE;
    const src = ctx.createBufferSource(); src.buffer = best.buf;
    src.playbackRate.value = Math.pow(2, (midi - best.m) / 12);
    const lvl = gain * Math.min(1.6, S.sus || 1) * (S.lvl == null ? 1 : S.lvl);
    const g = ctx.createGain();
    const atk = S.atk || 0;
    if (atk > 0) {                                   // ramp in rather than starting at full
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(lvl, t + atk);
    } else g.gain.setValueAtTime(lvl, t);
    const end = t + (dur || 1.2), tail = 0.08 * (S.rel || 1);
    g.gain.setValueAtTime(lvl, Math.max(t + atk, end - 0.12));
    g.gain.exponentialRampToValueAtTime(0.0006, end + tail);
    src.connect(g).connect(dest || ctx.destination);
    src.start(t); src.stop(end + tail + 0.07);
    return true;
  };
  return { load, ready, play, covers };
}
// note voicing for the sampler, mirroring the synth voicings, by instrument family
function sampleVoicing(chord, sym, fam, voicing, noBass) {
  const iv = chordIvs(chord.quality), root = chord.root;
  if (fam === "bass") return { notes: [36 + root + (sym === "U" ? 7 : 0)], roll: 0.03 };
  const base = 48 + root;
  const led = voicing || voiceChord(chord);
  const notes = sym === "U" ? led.slice(1) : noBass ? led : [base - 12, ...led];
  return { notes, roll: fam === "pluck" ? (sym === "U" ? 0.010 : 0.016) : 0.004 };
}
function playSampled(sampler, instr, ctx, t, chord, sym, slotDur, dest, voicing, noBass) {
  if (!sampler || !sampler.ready(instr)) return false;
  const fam = gmFam(instr);
  const { notes, roll } = sampleVoicing(chord, sym, fam, voicing, noBass);
  // if any voiced note lacks a nearby loaded anchor (samples still loading), play the whole chord
  // on the synth rather than repitching a distant anchor into a shrill artifact for part of it
  if (!notes.every(mid => sampler.covers(instr, mid))) return false;
  const g = sym === ">" ? 0.5 : sym === "U" ? 0.3 : 0.4;
  const dur = sym === ">" ? 1.6 : fam === "pluck" ? 1.0 : Math.max(0.5, slotDur * 2.5);
  notes.forEach((mid, j) => sampler.play(instr, t + j * roll, mid, g, dur, dest));
  return true;
}
// play one melody note as a real sample if the chosen lead voice is a GM instrument that's loaded
function playLeadSampled(sampler, kind, t, midi, dur, dest, shape) {
  if (!sampler || !isGM(kind) || !sampler.ready(kind)) return false;
  return sampler.play(kind, t, midi, 0.55, dur, dest, shape);   // false if no loaded anchor is close → synth covers this note
}
/* A reverb impulse: decaying noise. Seeded from an integer hash rather than Math.random, for the
   same reason the melody generators are — two renders of one song have to come out identical, and
   a stem bounce has to sum back to the mix it came from. With a random impulse the reverb tail of
   a stem is a different tail from the mix's, and the stems quietly stop adding up. */
function reverbIR(ctx, seconds, seed = 1) {
  const rate = ctx.sampleRate, len = Math.max(1, Math.floor(rate * seconds));
  const ir = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    // the two channels take different seeds, or the reverb would be dead centre and mono
    let y = 0;
    for (let i = 0; i < len; i++) {
      const x = (hashNoise(seed * 7919 + ch * 104729 + i) * 2 - 1) * Math.pow(1 - i / len, 2.6);
      // damping: a one-pole lowpass whose coefficient falls across the tail, so the reverb loses
      // top end as it decays the way a real room's air and surfaces absorb highs faster than lows.
      // A spectrally flat noise tail is what makes a convolution reverb read as synthetic even when
      // its decay curve is right — this is the one change that fixes that, everywhere it is used.
      const a = 0.9 - 0.75 * (i / len);
      y += a * (x - y);
      d[i] = y;
    }
  }
  return ir;
}
// a convolution reverb bus: input node feeding a dry path + a wet (reverb) path
/* `wetDest` lets the caller intercept the reverb return — the sidechain routes it through its own
   duck node so the tail keeps pumping even though the dry signals now duck individually. */
function makeReverb(ctx, dest, seconds = 1.6, mix = 0.16, wetDest = null) {
  const conv = ctx.createConvolver(); conv.buffer = reverbIR(ctx, seconds);
  const wet = ctx.createGain(); wet.gain.value = mix;
  const input = ctx.createGain(); input.gain.value = 1;
  input.connect(dest);                    // dry
  input.connect(conv); conv.connect(wet); wet.connect(wetDest || dest);   // wet
  return input;
}
/* A wet-only reverb, for parts that send to it by amount. The shared `makeReverb` bus always
   passes its dry signal through, which is right for "everything goes through the room" and wrong
   for a send: a part would be heard twice, once at full level through the send. */
function makeVerbSend(ctx, dest, seconds = 2.2) {
  const conv = ctx.createConvolver(); conv.buffer = reverbIR(ctx, seconds, 3);
  conv.connect(dest);
  return conv;
}
/* The overdrive curve. Normalised by tanh(k) so the peak stays where it was and turning Drive up
   thickens the part rather than just making it louder. There is deliberately no curve for zero —
   the caller leaves the shaper's curve null there, because even a straight-line curve resamples
   the signal and a part at default settings must be bit-for-bit what it was. */
function driveCurve(amt) {
  const n = 1024, c = new Float32Array(n), k = 1 + amt * 60;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1;
    c[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return c;
}

/* ===== insert effects =====
   A two-slot rack — chosen once per track/part bus and once more on the master path — for
   processing the existing chains don't already carry: modulation (chorus/flanger/phaser), lo-fi
   destruction, dynamics and stereo width. `makeFxSlot`/`makeFxRack` build exactly one type per
   slot — used directly by the test harness below and wherever only one type is ever needed.
   `progression-wheel.jsx`'s `buildGraph` instead uses `makeFxMultiSlot`/`makeFxMultiRack`: every
   bus is built with one chain per type id the *song* could need there (its own default plus every
   section's own override), so which one a section hears can switch live, at a boundary, rather
   than being fixed for the whole render — a type nothing in the song asked for before Play/render
   started still needs a restart, since nothing built its chain. Only the knobs of the audible chain
   move live beat to beat, exactly like the track panel's own drive/filter. "Off" builds a single
   unity gain and nothing else — no added node, no added latency, so a song that never opens the FX
   panel is bit-for-bit what it always was. Every other type is built once, eagerly, when its rack
   is made (never on first note through it), so a chorus/flanger/phaser's LFO starts at the same
   `t0` every other LFO in the graph does and a stem's modulation phase still
   lines up with the mix it came from. */
const FX_TYPES = [
  ["off", "Off", "No insert here — the signal passes through untouched, at no extra cost"],
  ["drive", "Distortion", "A second, independent drive stage — see the note on fxDrive below"],
  ["chorus", "Chorus", "Two detuned, modulated delay voices — thickens a part without truly doubling it"],
  ["flanger", "Flanger", "A very short modulated delay with feedback — a sweeping, resonant comb"],
  ["phaser", "Phaser", "Cascaded allpass filters swept together — a swirling notch sweep, no comb ring"],
  ["crush", "Bitcrusher", "Reduces bit depth and effective sample rate for lo-fi, aliased grit"],
  ["comp", "Compressor", "Pulls the loud peaks down and lifts the rest — evens a part out, or glues a bus"],
  ["wide", "Stereo widener", "Mid/side widens the stereo image — 100% width is the untouched signal"],
];
/* One row per knob a slot exposes: [key, label, min, max, step, default, unit]. Ranges are chosen
   so every parameter stays inside safe, always-finite, always-positive-where-it-must-be territory
   at its extremes (see each factory's own comments) — the UI can hand these straight to a
   <input type="range"> with no further clamping. */
const FX_PARAMS = {
  drive:   [["amt", "Amount", 0, 100, 1, 35, "%"]],
  chorus:  [["rate", "Rate", 0, 100, 1, 30, "%"], ["depth", "Depth", 0, 100, 1, 45, "%"],
            ["mix", "Mix", 0, 100, 1, 35, "%"]],
  flanger: [["rate", "Rate", 0, 100, 1, 25, "%"], ["depth", "Depth", 0, 100, 1, 55, "%"],
            ["fb", "Feedback", 0, 100, 1, 45, "%"]],
  phaser:  [["rate", "Rate", 0, 100, 1, 20, "%"], ["depth", "Depth", 0, 100, 1, 60, "%"],
            ["fb", "Feedback", 0, 100, 1, 35, "%"]],
  crush:   [["bits", "Bit depth", 1, 16, 1, 8, "bit"], ["red", "Rate reduce", 0, 100, 1, 45, "%"],
            ["mix", "Mix", 0, 100, 1, 100, "%"]],
  comp:    [["thresh", "Threshold", -60, 0, 1, -24, "dB"], ["ratio", "Ratio", 1, 20, 1, 4, ":1"],
            ["atk", "Attack", 1, 300, 1, 10, "ms"], ["rel", "Release", 10, 1000, 5, 250, "ms"]],
  wide:    [["width", "Width", 0, 200, 1, 140, "%"]],
};
const fxDefaults = id => Object.fromEntries((FX_PARAMS[id] || []).map(([k, , , , , dflt]) => [k, dflt]));

// off / bypass: the one node every slot can fall back to, live or offline, at zero extra cost
function fxOff(ctx) {
  const g = ctx.createGain(); g.gain.value = 1;
  return { input: g, output: g, write() {} };
}
/* Distortion. This is the same tanh waveshaper the track/part Tone panel already puts in front of
   the low-pass (see `mkChain`/`chainOf` in progression-wheel.jsx) — but it is a second, wholly
   independent WaveShaper, placed after the insert point (post-filter, post-pan, post-duck for a
   track; post-gate for a melody part). It shares no curve and no state with the panel's own drive:
   turning up both simply puts two different-sounding drives in series — pre-filter grit, then
   post-everything crunch — rather than one fighting the other for the same AudioParam. That is a
   deliberate choice: overriding or scaling the existing drive from here would mean a part's sound
   depended on which panel was opened last, which is exactly the kind of two-envelopes-one-param
   surprise this codebase avoids everywhere else (see the automation-lane and duck comments). */
function fxDrive(ctx) {
  const shaper = ctx.createWaveShaper(); shaper.oversample = "2x";
  let last = null;
  return { input: shaper, output: shaper, write(t, p) {
    const amt = (p.amt != null ? p.amt : 35) / 100;
    if (amt !== last) { last = amt; shaper.curve = amt > 0 ? driveCurve(amt) : null; }
  } };
}
/* Chorus. Two voices from one shared LFO, modulated in opposite directions (push/pull) rather than
   from two independently-phased oscillators — cheap, and it still widens rather than just doubling,
   because the voices move apart from each other instead of together. Centre delays (8ms/13ms) and
   the depth cap (5ms either way) keep both delay times comfortably positive at every setting. */
function fxChorus(ctx, t0) {
  const input = ctx.createGain(), output = ctx.createGain();
  const dry = ctx.createGain(); dry.gain.value = 1;
  input.connect(dry); dry.connect(output);
  const d1 = ctx.createDelay(0.03), d2 = ctx.createDelay(0.03);
  d1.delayTime.value = 0.008; d2.delayTime.value = 0.013;
  const w1 = ctx.createGain(), w2 = ctx.createGain(); w1.gain.value = 0; w2.gain.value = 0;
  input.connect(d1); d1.connect(w1); w1.connect(output);
  input.connect(d2); d2.connect(w2); w2.connect(output);
  const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.5;
  const depthPos = ctx.createGain(), depthNeg = ctx.createGain(); depthPos.gain.value = 0; depthNeg.gain.value = 0;
  lfo.connect(depthPos); depthPos.connect(d1.delayTime);
  lfo.connect(depthNeg); depthNeg.connect(d2.delayTime);
  lfo.start(t0); lfo.stop(t0 + 3600);
  return { input, output, write(t, p) {
    const rate = 0.05 + ((p.rate != null ? p.rate : 30) / 100) * 3;        // 0.05–3.05 Hz
    const depthSec = ((p.depth != null ? p.depth : 45) / 100) * 0.005;     // 0–5ms swing either way
    const mix = (p.mix != null ? p.mix : 35) / 100;
    lfo.frequency.setValueAtTime(rate, t);
    depthPos.gain.setValueAtTime(depthSec, t);
    depthNeg.gain.setValueAtTime(-depthSec, t);
    w1.gain.setValueAtTime(mix, t); w2.gain.setValueAtTime(mix, t);
  } };
}
/* Flanger. One very short delay (3ms centre) with its own output fed back into its input for the
   resonant "jet" sweep, modulated more slowly and with more feedback headroom than the chorus —
   the two effects share a shape but not a character. Feedback is clamped under 0.9, well short of
   the runaway point, and the depth cap (2.5ms) keeps the delay at or above 0.5ms at every setting. */
function fxFlanger(ctx, t0) {
  const input = ctx.createGain(), output = ctx.createGain();
  const dry = ctx.createGain(); dry.gain.value = 1;
  input.connect(dry); dry.connect(output);
  const delay = ctx.createDelay(0.02); delay.delayTime.value = 0.003;
  const fb = ctx.createGain(); fb.gain.value = 0;
  const wet = ctx.createGain(); wet.gain.value = 0.5;
  input.connect(delay); delay.connect(fb); fb.connect(delay);
  delay.connect(wet); wet.connect(output);
  const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.2;
  const depth = ctx.createGain(); depth.gain.value = 0;
  lfo.connect(depth); depth.connect(delay.delayTime);
  lfo.start(t0); lfo.stop(t0 + 3600);
  return { input, output, write(t, p) {
    const rate = 0.02 + ((p.rate != null ? p.rate : 25) / 100) * 1.5;      // 0.02–1.52 Hz
    const depthSec = ((p.depth != null ? p.depth : 55) / 100) * 0.0025;    // keeps delayTime ≥ 0.5ms
    const fbAmt = ((p.fb != null ? p.fb : 45) / 100) * 0.9;
    lfo.frequency.setValueAtTime(rate, t);
    depth.gain.setValueAtTime(depthSec, t);
    fb.gain.setValueAtTime(fbAmt, t);
  } };
}
/* Phaser. Six allpass filters in series, spread across the spectrum (280Hz–3.6kHz) so the sweep
   moves several notches at once, all fed from one LFO for a coherent swirl. A little of the
   cascade's own output feeds back to its input for extra bite. The depth cap (220Hz) keeps every
   stage's frequency positive even at the lowest base (280 − 220 = 60Hz). */
const PHASER_STAGES = [280, 480, 820, 1400, 2300, 3600];
function fxPhaser(ctx, t0) {
  const input = ctx.createGain(), output = ctx.createGain();
  const dry = ctx.createGain(); dry.gain.value = 1;
  input.connect(dry); dry.connect(output);
  const sum = ctx.createGain();
  input.connect(sum);
  const stages = PHASER_STAGES.map(f => {
    const ap = ctx.createBiquadFilter(); ap.type = "allpass"; ap.frequency.value = f; ap.Q.value = 0.5;
    return ap;
  });
  let node = sum;
  for (const ap of stages) { node.connect(ap); node = ap; }
  const wet = ctx.createGain(); wet.gain.value = 0.5;
  node.connect(wet); wet.connect(output);
  const fb = ctx.createGain(); fb.gain.value = 0;
  node.connect(fb); fb.connect(sum);
  const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.15;
  const depth = ctx.createGain(); depth.gain.value = 0;
  lfo.connect(depth);
  for (const ap of stages) depth.connect(ap.frequency);
  lfo.start(t0); lfo.stop(t0 + 3600);
  return { input, output, write(t, p) {
    const rate = 0.02 + ((p.rate != null ? p.rate : 20) / 100) * 1.2;      // 0.02–1.22 Hz
    const depthHz = ((p.depth != null ? p.depth : 60) / 100) * 220;
    const fbAmt = ((p.fb != null ? p.fb : 35) / 100) * 0.85;
    lfo.frequency.setValueAtTime(rate, t);
    depth.gain.setValueAtTime(depthHz, t);
    fb.gain.setValueAtTime(fbAmt, t);
  } };
}
/* Bitcrusher. Web Audio has no built-in for this, so it is hand-rolled: hold-and-round each sample
   to a fixed step count (bit depth) and only refresh that hold every few samples (the sample-rate
   reduction). A ScriptProcessorNode runs it — deprecated, but it is what this app already uses for
   pitch detection (see the ScriptProcessor comment in progression-wheel.jsx) rather than an
   AudioWorklet: this app bundles to one self-contained HTML page with no second file the build
   would have to ship and no worklet-module fetch that could fail; ScriptProcessorNode still runs
   deterministically inside an OfflineAudioContext render the way a worklet is not guaranteed to
   everywhere this app is loaded, and every browser that can open this page still implements it.
   Where it is missing outright (`ctx.createScriptProcessor` absent), the slot degrades to a plain
   pass-through rather than throwing — quieter than a crash, if not as satisfying as grit. */
function fxCrush(ctx) {
  const input = ctx.createGain(), output = ctx.createGain();
  const dryGain = ctx.createGain(); dryGain.gain.value = 0;
  const wetGain = ctx.createGain(); wetGain.gain.value = 1;
  input.connect(dryGain); dryGain.connect(output);
  const supported = typeof ctx.createScriptProcessor === "function";
  const state = { bits: 8, red: 19 };
  let cr = null;
  if (supported) {
    cr = ctx.createScriptProcessor(1024, 2, 2);
    let holdL = 0, holdR = 0, phase = 0;
    cr.onaudioprocess = e => {
      const inp = e.inputBuffer, out = e.outputBuffer;
      const inL = inp.getChannelData(0), inR = inp.numberOfChannels > 1 ? inp.getChannelData(1) : inL;
      const outL = out.getChannelData(0), outR = out.numberOfChannels > 1 ? out.getChannelData(1) : outL;
      const steps = Math.pow(2, Math.max(1, Math.min(16, state.bits)));
      const red = Math.max(1, Math.round(state.red));
      let ph = phase;
      for (let i = 0; i < inL.length; i++) {
        if (ph % red === 0) { holdL = Math.round(inL[i] * steps) / steps; holdR = Math.round(inR[i] * steps) / steps; }
        ph++;
        outL[i] = holdL; if (outR !== outL) outR[i] = holdR;
      }
      phase = ph % red;
    };
    input.connect(cr); cr.connect(wetGain); wetGain.connect(output);
  } else {
    input.connect(wetGain); wetGain.connect(output);
  }
  return { input, output, write(t, p) {
    if (!supported) { dryGain.gain.setValueAtTime(1, t); wetGain.gain.setValueAtTime(0, t); return; }
    const mix = (p.mix != null ? p.mix : 100) / 100;
    dryGain.gain.setValueAtTime(1 - mix, t);
    wetGain.gain.setValueAtTime(mix, t);
    state.bits = p.bits != null ? p.bits : 8;
    // 0% is no reduction (every sample refreshed); 100% holds for 40 samples, ~1.1kHz at 44.1kHz
    state.red = 1 + Math.round(((p.red != null ? p.red : 45) / 100) * 39);
  } };
}
/* Compressor: DynamicsCompressorNode as-is, with the four controls a producer actually reaches
   for. Knee is fixed (a soft 6dB) rather than exposed, to keep the rack to the params asked for. */
function fxComp(ctx) {
  const c = ctx.createDynamicsCompressor();
  c.knee.value = 6;
  return { input: c, output: c, write(t, p) {
    c.threshold.setValueAtTime(p.thresh != null ? p.thresh : -24, t);
    c.ratio.setValueAtTime(p.ratio != null ? p.ratio : 4, t);
    c.attack.setValueAtTime((p.atk != null ? p.atk : 10) / 1000, t);
    c.release.setValueAtTime((p.rel != null ? p.rel : 250) / 1000, t);
  } };
}
/* Stereo widener, mid/side: mid = (L+R)/2, side = (L−R)/2, output = mid ± side·width. At width=1
   that reconstructs L and R exactly — a slot left at 100% is the untouched stereo image, the same
   "default is transparent" guarantee every other stage in this file makes, just centred on 100
   instead of 0 because a widener's neutral point is the middle of its range, not its floor. */
function fxWide(ctx) {
  const input = ctx.createGain();
  const splitter = ctx.createChannelSplitter(2), merger = ctx.createChannelMerger(2);
  input.connect(splitter);
  const midL = ctx.createGain(), midR = ctx.createGain(); midL.gain.value = 0.5; midR.gain.value = 0.5;
  const sideL = ctx.createGain(), sideR = ctx.createGain(); sideL.gain.value = 0.5; sideR.gain.value = -0.5;
  splitter.connect(midL, 0); splitter.connect(sideL, 0);
  splitter.connect(midR, 1); splitter.connect(sideR, 1);
  const mid = ctx.createGain(); midL.connect(mid); midR.connect(mid);
  const side = ctx.createGain(); sideL.connect(side); sideR.connect(side);
  const sideScaled = ctx.createGain(); sideScaled.gain.value = 1.4;
  side.connect(sideScaled);
  const invSide = ctx.createGain(); invSide.gain.value = -1; sideScaled.connect(invSide);
  const toL = ctx.createGain(); mid.connect(toL); sideScaled.connect(toL);
  const toR = ctx.createGain(); mid.connect(toR); invSide.connect(toR);
  toL.connect(merger, 0, 0); toR.connect(merger, 0, 1);
  return { input, output: merger, write(t, p) {
    const width = (p.width != null ? p.width : 140) / 100;
    sideScaled.gain.setValueAtTime(width, t);
  } };
}
const FX_BUILD = { drive: fxDrive, chorus: fxChorus, flanger: fxFlanger, phaser: fxPhaser,
  crush: fxCrush, comp: fxComp, wide: fxWide };
function makeFxSlot(ctx, id, t0) {
  const build = FX_BUILD[id];
  if (!build) return { id: "off", ...fxOff(ctx) };
  const slot = { id, ...build(ctx, t0) };
  // seed every AudioParam to this type's own defaults right away — every `write` fallback above
  // already matches FX_PARAMS' defaults, so this is the same values the first beat's writeFxRack
  // would set, just not left to Web Audio's own node defaults for the fraction of a second before
  // that first beat (the same reasoning as `trBass.in.gain.value = BASS_MAKEUP` in buildGraph)
  slot.write(ctx.currentTime, {});
  return slot;
}
// two slots in series — every bus's insert rack, live or a stem, the master path included
function makeFxRack(ctx, ids, t0) {
  const slots = [makeFxSlot(ctx, ids && ids[0], t0), makeFxSlot(ctx, ids && ids[1], t0)];
  slots[0].output.connect(slots[1].input);
  return { input: slots[0].input, output: slots[1].output, slots };
}
/* A multi-type slot: every id in `ids` (deduplicated, "off" always included as a safe fallback)
   is built once — one whole `makeFxSlot` chain each — and wired in parallel between one shared
   input gain and one shared output gain, each chain gated by its own `GainNode`. This is the same
   "build everything the song could need, gate what is not currently in use" idiom the melody-part
   LFOs already use (see the comment beside `mkChain`'s `lfo()` in progression-wheel.jsx): every
   chain exists from the first beat, so a chorus's LFO phase — like theirs — starts at the same
   `t0` whichever chain ends up audible when, and a stem bounce lines up with the mix it came from.
   Exactly one chain is audible at a time (`active`); `setActive(id, t)` ramps the outgoing chain's
   gate to 0 and the incoming one to 1 over a short, click-free window — the mechanism that lets
   two sections on the same bus sound genuinely different effect types as playback crosses their
   boundary, not just different amounts of the same one. `write(id, t, params)` writes params into
   one specific chain's own nodes regardless of whether that chain is the audible one right now, so
   a switch never lands on stale values — the incoming chain is already current before its gate
   opens. Requesting an id this slot was not built with (a type nothing in the song asked for
   before the rack was built) is a no-op in `setActive` and falls back to "off" in `write`; the
   caller (see `writeFxRack` in progression-wheel.jsx) only calls `setActive` with ids `ids`
   actually contains, and documents the resulting "needs a restart" limitation. */
function makeFxMultiSlot(ctx, ids, t0, activeId) {
  const input = ctx.createGain(), output = ctx.createGain();
  const list = Array.from(new Set([...(ids || []), "off"]));
  const chains = {};
  let active = list.includes(activeId) ? activeId : "off";
  for (const id of list) {
    const slot = makeFxSlot(ctx, id, t0);
    const gate = ctx.createGain(); gate.gain.value = id === active ? 1 : 0;
    input.connect(slot.input); slot.output.connect(gate); gate.connect(output);
    chains[id] = { slot, gate };
  }
  // 15ms: audibly instant (well under duckAt's already-short 6ms dip is too fast to guarantee a
  // gate crossing zero never clicks when the two chains' instantaneous values disagree; this is
  // long enough to smooth that discontinuity and short enough that a switch on a beat is inaudible
  // as its own event) — a section boundary, not a fade the ear is meant to notice.
  const RAMP = 0.015;
  const setActive = (id, t) => {
    if (!chains[id] || id === active) return;
    const from = chains[active], to = chains[id];
    from.gate.gain.cancelScheduledValues(t);
    from.gate.gain.setValueAtTime(1, t);
    from.gate.gain.linearRampToValueAtTime(0, t + RAMP);
    to.gate.gain.cancelScheduledValues(t);
    to.gate.gain.setValueAtTime(0, t);
    to.gate.gain.linearRampToValueAtTime(1, t + RAMP);
    active = id;
  };
  const write = (id, t, params) => { (chains[id] || chains.off).slot.write(t, params); };
  return { input, output, ids: list, chains, activeId: () => active, setActive, write };
}
// two multi-slots in series — the same shape as `makeFxRack` (`{ input, output, slots }`) so call
// sites read the same way, just with each `slots[i]` a `makeFxMultiSlot` instead of one fixed type.
// `activeIds` (`[id0, id1]`) is which id starts audible in each slot — the song's own current type,
// so a fresh Play or render sounds like the Sound tab's rack until a section says otherwise.
function makeFxMultiRack(ctx, idsSlot0, idsSlot1, t0, activeIds) {
  const A = activeIds || [];
  const slots = [makeFxMultiSlot(ctx, idsSlot0, t0, A[0]), makeFxMultiSlot(ctx, idsSlot1, t0, A[1])];
  slots[0].output.connect(slots[1].input);
  return { input: slots[0].input, output: slots[1].output, slots };
}

/* No envelope shaping: nothing added to the attack, every stage at its own length. A part with the
   Envelope group untouched passes this, and the voice is exactly what it always was. */
const NO_SHAPE = { atk: 0, dec: 1, sus: 1, rel: 1, lvl: 1 };

// Melody lead voices — chosen from the "Lead" dropdown. Each spec is a stack of
// partials (oscillator type · harmonic multiple · relative level) plus an
// envelope: atk = attack, rel = release tail, vol = peak, sus = sustain level
// (0 = percussive decay, >0 = held tone). lp adds a low-pass; vib adds vibrato.
// The `vol` values are loudness-normalized: every voice rendered offline and matched to the
// default synth lead by K-weighted loudness (scripts/measure-loudness.mjs), so at the same
// Level slider every instrument starts equally audible and swapping voices holds the mix.
const LEAD_VOICES = [
  ["synth","Synth lead"], ["sine","Soft sine"], ["triangle","Mellow triangle"],
  ["square","Chiptune square"], ["saw","Bright saw"], ["flute","Flute"],
  ["pluck","Pluck"], ["bell","Bell"], ["musicbox","Music box"],
  ["ep","Electric piano"], ["strings","Strings"], ["brass","Brass"],
  ["organ","Organ"], ["voice","Voice (ah)"], ["glass","Glass pad"], ["whistle","Whistle"],
  ["clav","Clav"], ["moog","Moog lead"], ["pizz","Pizzicato"], ["chime","Chime"], ["warmpad","Warm pad"],
  // dance voices — the sounds the genre is actually made of, rather than approximations of
  // orchestral instruments. Detune is expressed as a frequency multiple: 2^(cents/1200).
  ["supersaw","Supersaw (trance/EDM)"], ["hoover","Hoover (rave)"], ["acid","Acid 303"],
  ["reese","Reese bass (DnB)"], ["sub","Sub bass"], ["stab","House stab"], ["growl","Growl (dubstep)"],
];
const LEAD_SPECS = {
  synth:    { parts:[["triangle",1,1],["sine",2,0.3]],                 atk:0.012, rel:0.13, vol:0.12, sus:0.6 },
  sine:     { parts:[["sine",1,1],["sine",2,0.1]],                     atk:0.02,  rel:0.18, vol:0.091, sus:0.7 },
  triangle: { parts:[["triangle",1,1]],                               atk:0.01,  rel:0.15, vol:0.12, sus:0.65 },
  square:   { parts:[["square",1,0.6]],                               atk:0.005, rel:0.07, vol:0.148, sus:0.55, lp:2600 },
  saw:      { parts:[["sawtooth",1,0.6]],                             atk:0.008, rel:0.13, vol:0.234, sus:0.6, lp:3200 },
  flute:    { parts:[["sine",1,1],["sine",2,0.05]],                   atk:0.05,  rel:0.15, vol:0.079, sus:0.8, vib:true },
  pluck:    { parts:[["triangle",1,1],["sine",3,0.15]],               atk:0.003, rel:0.3,  vol:0.154, sus:0 },
  bell:     { parts:[["sine",1,1],["sine",2.76,0.5],["sine",5.4,0.2]],atk:0.002, rel:0.6,  vol:0.097, sus:0 },
  musicbox: { parts:[["sine",1,1],["sine",4,0.35],["sine",8,0.08]],   atk:0.002, rel:0.45, vol:0.107,  sus:0 },
  ep:       { parts:[["sine",1,1],["triangle",2,0.25],["sine",5,0.06]],atk:0.004,rel:0.4,  vol:0.21, sus:0.15 },
  strings:  { parts:[["sawtooth",1,0.5],["sawtooth",1.004,0.5]],      atk:0.1,   rel:0.28, vol:0.139, sus:0.85, lp:2400, vib:true },
  brass:    { parts:[["sawtooth",1,0.7],["square",1,0.1]],            atk:0.035, rel:0.15, vol:0.14, sus:0.7, lp:2800 },
  organ:    { parts:[["sine",1,1],["sine",2,0.5],["sine",3,0.3],["sine",4,0.15]], atk:0.006, rel:0.06, vol:0.062, sus:0.9 },
  voice:    { parts:[["sawtooth",1,0.4],["sine",1,0.45]],             atk:0.06,  rel:0.18, vol:0.109,  sus:0.8, lp:1500, vib:true },
  glass:    { parts:[["sine",1,1],["sine",3,0.2],["triangle",2,0.15]],atk:0.07,  rel:0.32, vol:0.079,  sus:0.75 },
  whistle:  { parts:[["sine",1,1],["sine",2,0.02]],                   atk:0.03,  rel:0.1,  vol:0.077, sus:0.85, vib:true },
  clav:     { parts:[["square",1,0.55],["triangle",2,0.35],["sine",5,0.12]], atk:0.002, rel:0.12, vol:0.158, sus:0, lp:3600, q:1.2 },
  moog:     { parts:[["sawtooth",1,0.65],["square",1,0.35]],          atk:0.006, rel:0.14, vol:0.100, sus:0.7, lp:2000, q:3, fenv:[2.2, 1] },
  pizz:     { parts:[["sawtooth",1,0.5],["sawtooth",1.004,0.5]],      atk:0.002, rel:0.15, vol:0.215, sus:0, lp:2600 },
  chime:    { parts:[["sine",1,1],["sine",4,0.25],["sine",9.2,0.06]], atk:0.002, rel:0.4,  vol:0.113, sus:0, lp:3800 },
  warmpad:  { parts:[["square",1,0.4],["square",2,0.15],["triangle",1,0.35]], atk:0.25, rel:0.5, vol:0.091, sus:0.9, lp:2000, vib:true },
  /* Dance voices. `q` adds filter resonance, `fenv:[from,to]` sweeps the cutoff across the note
     (as a multiple of `lp`), and `bend` drops the pitch in from that many semitones above. */
  supersaw: { parts:[["sawtooth",0.97940,0.7],["sawtooth",0.98624,0.7],["sawtooth",0.99311,0.7],
                     ["sawtooth",1,1],
                     ["sawtooth",1.00694,0.7],["sawtooth",1.01394,0.7],["sawtooth",1.02098,0.7]],
              atk:0.02, rel:0.35, vol:0.051, sus:0.8, lp:4200, q:0.9 },
  hoover:   { parts:[["sawtooth",0.98624,0.8],["sawtooth",1,1],["sawtooth",1.01394,0.8],
                     ["square",0.5,0.35]],
              atk:0.015, rel:0.3, vol:0.068, sus:0.75, lp:3000, q:2.5, bend:7 },
  acid:     { parts:[["sawtooth",1,1]],
              atk:0.004, rel:0.12, vol:0.162, sus:0.25, lp:520, q:14, fenv:[5.5, 1] },
  reese:    { parts:[["sawtooth",0.98624,1],["sawtooth",1.01394,1],["sine",0.5,0.5]],
              atk:0.02, rel:0.18, vol:0.061, sus:0.85, lp:900, q:5 },
  // the octave partial is what lets the sub read on small speakers, which can't reproduce
  // the ~65 Hz fundamental at all — too little of it and the default bass simply vanishes
  sub:      { parts:[["sine",1,1],["triangle",2,0.15]],               atk:0.012, rel:0.1, vol:0.073, sus:0.9 },
  stab:     { parts:[["sawtooth",1,0.6],["square",2,0.2],["sawtooth",1.00694,0.5]],
              atk:0.003, rel:0.18, vol:0.22, sus:0, lp:3400, q:1.4, fenv:[1.6, 0.7] },
  // an inharmonic, near-octave-but-not-quite square layered under the fundamental — the beating
  // between it and the saws is the growl a clean reese doesn't have
  growl:    { parts:[["sawtooth",1,1],["square",2.01,0.4],["sawtooth",3.98,0.25]],
              atk:0.01, rel:0.16, vol:0.076, sus:0.8, lp:750, q:7 },
};
/* ===== user-built voices (the "voice editor") =====
   A user's own voices are saved with the song, not with the app, so they live in this plain,
   mutable registry rather than as more LEAD_SPECS entries — the component resyncs it from the
   song's own `voices` state (see resetCustomVoices) every time the song loads or a voice is
   edited, the same "audio.js holds the live copy, React state is the source of truth" split the
   FX rack and every other imperative part of the graph already uses. Ids are always "custom:…",
   which can never collide with a GM_CATS folder key (isGM stays false for them, correctly) or a
   future built-in LEAD_SPECS id. A record has the same shape as a LEAD_SPECS entry, plus `name`
   for the dropdowns and export — leadNote reads only the fields it already knows about, so the
   extra key is harmless. */
let CUSTOM_SPECS = {};
const isCustomVoice = id => Object.prototype.hasOwnProperty.call(CUSTOM_SPECS, id);
// the one lookup every call site should use instead of touching LEAD_SPECS directly — a user
// voice shadows nothing (its id can't collide) and always wins if it somehow did
const specFor = kind => CUSTOM_SPECS[kind] || LEAD_SPECS[kind];
const customVoiceName = id => (CUSTOM_SPECS[id] && CUSTOM_SPECS[id].name) || id;
function setCustomVoice(id, spec) { CUSTOM_SPECS[id] = spec; }
function deleteCustomVoice(id) { delete CUSTOM_SPECS[id]; }
// one call, on song load or any edit: replaces the whole registry so a voice deleted from the
// song (or a song swapped for another) can't go on sounding — same reason the sampler cache gets
// dropped on instrument change rather than merged.
function resetCustomVoices(list) {
  CUSTOM_SPECS = {};
  (list || []).forEach(v => { if (v && v.id) CUSTOM_SPECS[v.id] = v; });
}
// legato=true softens the attack and lets the note ring past its slot so a
// moving line flows together instead of re-articulating on every eighth.
function leadNote(ctx, t, midi, dur, kind = "synth", legato = false, dest, shape) {
  const V = specFor(kind) || LEAD_SPECS.synth;
  const hz = midiHz(midi);
  /* The part's own envelope, folded into the voice's rather than replacing it. `add` lengthens the
     attack, the three multipliers stretch or squash the stages the voice already has. That way a
     bell and a pad both keep their character when the same control is moved, and NO_SHAPE — every
     multiplier at 1, nothing added — reproduces the voice exactly as it was before any of this. */
  const S = shape || NO_SHAPE;
  const atk = Math.max(legato ? Math.max(V.atk, 0.03) : V.atk, S.atk || 0);
  const rel = (legato ? V.rel * 1.6 : V.rel) * (S.rel || 1);
  // `lvl` scales the whole note. It exists for the note echo, whose repeats have to get quieter
  // one at a time — a level that belongs to the note, not to the part, so it cannot live on the
  // part's gain node the way every other level in here does.
  const peak = V.vol * (S.lvl == null ? 1 : S.lvl);
  // sustain is a share of the peak, so scaling it must not push a note louder than its own attack
  const sus = peak * Math.min(1, V.sus * (S.sus || 1));
  const decEnd = Math.min(atk, 0.12) + 0.12 * (S.dec || 1);   // how long the fall to sustain takes
  const t1 = t + atk;                          // reach peak
  const t2 = Math.max(t1 + 0.01, t + dur);     // sustain end / release start
  const t3 = t2 + rel;                         // silence
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t1);
  if (V.sus > 0) {
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, sus), Math.min(t2, t1 + decEnd));
    g.gain.setValueAtTime(Math.max(0.0002, sus), t2);
  }
  g.gain.exponentialRampToValueAtTime(0.0006, t3);
  g.connect(dest || ctx.destination);
  let out = g;
  if (V.lp) {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.Q.value = V.q || 0.7;
    if (V.fenv) {
      // the filter sweep that makes an acid line squelch and a stab bark — cutoff starts at
      // fenv[0] x lp and falls to fenv[1] x lp across the note. Clamped under Nyquist, because
      // a cutoff above it throws in Web Audio rather than politely doing nothing.
      const top = Math.min(V.lp * V.fenv[0], ctx.sampleRate / 2 - 100);
      const end = Math.min(V.lp * V.fenv[1], ctx.sampleRate / 2 - 100);
      f.frequency.setValueAtTime(Math.max(30, top), t);
      f.frequency.exponentialRampToValueAtTime(Math.max(30, end), t2);
    } else f.frequency.value = Math.min(V.lp, ctx.sampleRate / 2 - 100);
    f.connect(g); out = f;
  }
  let lfoG = null;
  if (V.vib) {
    const lfo = ctx.createOscillator(); lfoG = ctx.createGain();
    lfo.type = "sine"; lfo.frequency.value = 5.2; lfoG.gain.value = hz * 0.006;
    lfo.connect(lfoG); lfo.start(t + atk); lfo.stop(t3 + 0.05);
  }
  /* Unison: stack extra detuned copies of every partial, the way a supersaw is built, generalised
     to any voice. `S.uni` is 0..1 (off..full); voices go from 1 (untouched, at S.uni = 0 exactly
     the loop below always ran anyway) up to 4, spread symmetrically up to ±25 cents apart. Each
     voice's gain is divided by √voices rather than voices, so the *total* energy — not the peak of
     any one voice — stays close to a single voice's, which is what keeps unison from just reading
     as "louder" and keeps the per-voice loudness calibration (see LEAD_SPECS above) honest. */
  const uni = Math.max(0, Math.min(1, S.uni || 0));
  const voices = uni > 0 ? 1 + Math.round(uni * 3) : 1;
  const spread = uni * 25;
  const voiceGain = 1 / Math.sqrt(voices);
  V.parts.forEach(([type, mult, amp]) => {
    for (let v = 0; v < voices; v++) {
      const cents = voices > 1 ? spread * (v / (voices - 1) - 0.5) * 2 : 0;
      const vHz = hz * mult * Math.pow(2, cents / 1200);
      const o = ctx.createOscillator();
      o.type = type; o.frequency.value = vHz;
      // the hoover's falling whoop: start above the note and slide down onto it
      if (V.bend) {
        o.frequency.setValueAtTime(vHz * Math.pow(2, V.bend / 12), t);
        o.frequency.exponentialRampToValueAtTime(vHz, t + Math.max(0.06, atk * 4));
      }
      if (lfoG) lfoG.connect(o.frequency);
      const pg = ctx.createGain(); pg.gain.value = amp * voiceGain;
      o.connect(pg).connect(out);
      o.start(t); o.stop(t3 + 0.05);
    }
  });
}

/* ===== voice editor loudness normalisation =====
   The same K-weighted (ITU-R BS.1770-flavoured) max-momentary measure scripts/measure-loudness.mjs
   uses offline via Playwright to keep every built-in LEAD_SPECS voice equally audible — ported here
   so the in-app voice editor's "Normalise" button can do the same thing to a hand-built voice, live,
   in the browser that's already running it. The two implementations are kept in sync by hand (there
   is no shared module between a Node CLI script and the bundled app); they compute the same number
   from the same graph on purpose, so a custom voice normalised in-app lands at the same loudness a
   built-in voice would if it were re-measured by the script. */
function kWeight(x, sr) {
  const biquad = (type, fc, dbGain, Q) => {
    const A = Math.pow(10, dbGain / 40), w = 2 * Math.PI * fc / sr;
    const cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * Q);
    let b0, b1, b2, a0, a1, a2;
    if (type === "highshelf") {
      const sq = 2 * Math.sqrt(A) * al;
      b0 = A * ((A + 1) + (A - 1) * cs + sq);
      b1 = -2 * A * ((A - 1) + (A + 1) * cs);
      b2 = A * ((A + 1) + (A - 1) * cs - sq);
      a0 = (A + 1) - (A - 1) * cs + sq;
      a1 = 2 * ((A - 1) - (A + 1) * cs);
      a2 = (A + 1) - (A - 1) * cs - sq;
    } else {
      b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = (1 + cs) / 2;
      a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al;
    }
    return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
  };
  const stages = [
    biquad("highshelf", 1681.9744509742, 3.99984385397, 0.7071752369),
    biquad("highpass", 38.13547087614, 0, 0.5003270373),
  ];
  let y = x;
  for (const [b0, b1, b2, a1, a2] of stages) {
    const z = new Float32Array(y.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < y.length; i++) {
      const v = b0 * y[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = y[i]; y2 = y1; y1 = v; z[i] = v;
    }
    y = z;
  }
  return y;
}
// loudest 400ms window (100ms hop) — max-momentary rather than a whole-render mean, so a pluck
// (all attack, no sustain) is scored by the part of it actually heard
function maxMomentaryDb(x, sr) {
  const y = kWeight(x, sr);
  const W = Math.floor(sr * 0.4), H = Math.floor(sr * 0.1);
  let best = 0;
  for (let s = 0; s + W <= y.length; s += H) {
    let ms = 0;
    for (let i = s; i < s + W; i++) ms += y[i] * y[i];
    if ((ms /= W) > best) best = ms;
  }
  return -0.691 + 10 * Math.log10(best + 1e-12);
}
// renders one voice at C4 and C5 — the registers a melody actually lives in — and averages, so a
// low-pass sitting right on one pitch's harmonics doesn't skew the score
async function renderLoudness(kind, sr = 44100) {
  const dur = 1.0;
  const render = async midi => {
    const ctx = new OfflineAudioContext(1, Math.ceil(sr * (dur + 1.2)), sr);
    leadNote(ctx, 0.05, midi, dur, kind, false, ctx.destination, null);
    const buf = await ctx.startRendering();
    return maxMomentaryDb(buf.getChannelData(0), sr);
  };
  return ((await render(60)) + (await render(72))) / 2;
}
/* Normalises a draft voice's `vol` to the default synth lead's own loudness — the same target every
   built-in voice is matched to — so a voice built in the editor starts in the mix exactly like one
   shipped with the app, not quietly buried or blaring over everything else the first time it's
   picked. Registers the draft under a scratch id rather than the voice's real one, so calling this
   mid-edit (before Save) can never be heard by anything else reading the live registry. Returns the
   suggested `vol` value to write back into the draft, not a ratio — the caller multiplies nothing. */
async function measureVoiceLoudness(spec) {
  const SCRATCH = "custom:__measure__";
  setCustomVoice(SCRATCH, { ...spec, vol: 1 });
  const [target, raw] = await Promise.all([renderLoudness("synth"), renderLoudness(SCRATCH)]);
  deleteCustomVoice(SCRATCH);
  return Math.pow(10, (target - raw) / 20);
}

/* ===== the bass track =====
   Its own source rather than the chord voice's lowest note. The voices are the LEAD_SPECS synths
   played an octave below the chord voicing — no new synthesis, just the register and a per-voice
   boost, because one low note has to carry the way a whole chord does. All synth, never sampled:
   the bass has to sound identical offline, and these are the sounds the genres are made of anyway. */
const BASS_VOICES = [["sub", "Sub bass"], ["saw", "Saw bass"], ["square", "Square bass"],
  ["pluck", "Picked bass"], ["acid", "Acid 303"], ["reese", "Reese (DnB)"], ["growl", "Growl (dubstep)"]];
/* The pad track's voices — the sustained half of LEAD_SPECS. The pad holds the chord's upper
   voicing a bar at a time, so everything here has a real sustain and none of it is percussive. */
const PAD_VOICES = [["strings", "Strings"], ["glass", "Glass pad"], ["voice", "Voice (ah)"],
  ["organ", "Organ"], ["brass", "Brass"], ["supersaw", "Supersaw"], ["warmpad", "Warm pad"]];
/* Measured like the lead vols (scripts/measure-loudness.mjs), but at C2 and to a hotter target,
   because one low note has to carry the way a whole chord does — every bass voice lands at the
   same K-weighted loudness, so swapping the bass sound never moves the bass level. */
const BASS_LVL = { sub: 2.9, saw: 2.7, square: 2.8, pluck: 3.5, acid: 3.4, reese: 3.0, growl: 2.7 };
function playBass(ctx, t, root, off, dur, kind, dest, vel = 1) {
  const k = specFor(kind) ? kind : "sub";
  // C2 upward: below the chord window (VOICE_LO 55), above the kick's fundamental
  leadNote(ctx, t, 36 + root + off, dur, k, false, dest, { lvl: (BASS_LVL[k] || 3.0) * vel });
}

export { BASS_VOICES, PAD_VOICES, playBass, percSound, DELAY_BEATS, DELAY_TIMES, FAM_LEAD, FILTER_OPEN, FX_TYPES, FX_PARAMS, GM_CATS, GM_FAM, GM_LABEL, GM_NAMES, GM_PROGRAM, LEAD_SPECS, LEAD_VOICES, LEGACY_INSTR, MOVES, TFX, TRANS, TRANS_CATS, applyTrans, makeTrans, transOwns, SF_BASE, SF_NAT, SYNTH_PROGRAM, VOICE_HI, VOICE_LO, anchorsFor, applyMove, clickSound, customVoiceName, deleteCustomVoice, drumSound, driveCurve, duckAt, env, fxDefaults, gmFam, gmKey, isCustomVoice, isGM, ksPluck, leadNote, makeDelay, makeFxMultiRack, makeFxMultiSlot, makeFxRack, makeFxSlot, makeNoise, makeReverb, makeSampler, makeVerbSend, measureVoiceLoudness, midiHz, NO_SHAPE, padVoice, playHit, playLeadSampled, playSampled, programOf, resetCustomVoices, sampleVoicing, setCustomVoice, sfFetch, sfName, sfPrefetch, sfRawCache, specFor, strumChord, voiceChord };
