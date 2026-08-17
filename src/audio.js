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
// One drum voice. `ch` is a channel letter from a DRUMS pattern; `kit` picks the voicing.
// The two machine kits are what dance music is actually built on, and they differ from the
// acoustic kit in kind, not just tone: the 909's kick is a short punchy thud with a hard
// click on top, the 808's is a long tuned sub-boom that rings for most of a beat.
function drumSound(ctx, t, ch, noise, dest, kit, vel = 1) {
  const K9 = kit === "909", K8 = kit === "808";
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
    const sub = ch === "B" || K8;
    if (sub) {                                   // pure sine, slow drop, long ring
      tone("sine", ch === "B" ? 105 : 120, 42, 0.06, 0.72, 0.004, ch === "B" ? 1.1 : 0.85);
      nz(0.05, 0.001, 0.012, "lowpass", 2200);   // barely any beater — the 808 is almost all body
    } else if (K9) {                             // 909: tight body, hard click on top
      tone("sine", 200, 48, 0.045, 0.68, 0.001, 0.3);
      nz(0.3, 0.001, 0.016, "lowpass", 4200);
    } else {                                     // acoustic: the original kick
      tone("sine", 165, 42, 0.09, 0.62, 0.002, 0.22);
      nz(0.22, 0.001, 0.02, "lowpass", 3200);
    }
  } else if (ch === "S") {
    if (K9) {                                    // 909 snare: noise-forward, short, bright
      tone("triangle", 238, 0, 0, 0.1, 0.001, 0.06);
      nz(0.34, 0.001, 0.075, "highpass", 1900);
      nz(0.12, 0.001, 0.13, "bandpass", 4200, 0.7);
    } else if (K8) {                             // 808 snare: tuned tick + a thin noise puff
      tone("triangle", 180, 0, 0, 0.16, 0.001, 0.075);
      nz(0.2, 0.001, 0.055, "highpass", 2400);
    } else {                                     // acoustic: two-tone shell + crack + wire rattle
      [175, 330].forEach((hz, k) => tone("triangle", hz, 0, 0, k ? 0.09 : 0.14, 0.001, 0.09));
      nz(0.3, 0.001, 0.055, "highpass", 1600);
      nz(0.14, 0.002, 0.16, "bandpass", 3200, 0.6);
    }
  } else if (ch === "H" || ch === "O") {
    // closed vs open hat: the same voice with a longer tail. Machine hats are brighter and
    // more metallic than the acoustic one, which is most of why a 909 pattern reads as "house".
    const open = ch === "O";
    const dec = open ? (K8 ? 0.34 : 0.28) : (K9 ? 0.035 : K8 ? 0.028 : 0.04);
    const vol = open ? 0.1 : 0.11;
    nz(vol, 0.001, dec, "highpass", K9 ? 8600 : K8 ? 9200 : 7800);
    if (K8) return;                              // 808 hats are pure noise — no partial ring
    // a ring of inharmonic square partials through a shared high-pass gives the metal
    const ring = ctx.createGain(); ring.gain.value = 0.02;
    const rhp = ctx.createBiquadFilter(); rhp.type = "highpass"; rhp.frequency.value = 8500;
    ring.connect(rhp); rhp.connect(env(ctx, t, (open ? 0.42 : 0.5) * vel, 0.001, open ? dec * 0.9 : 0.035, true, dest));
    (K9 ? [3100, 4200, 5900] : [2400, 3000, 4700]).forEach(hz => {
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
   exponential (an exponential ramp to or from 0 throws). */
const MOVES = {};
[
["",       "— no move —",             null],
["build",  "Build · filter opens",    { from: 260, to: 16000 }],
["riser",  "Build + riser",           { from: 260, to: 16000, riser: true }],
["drop",   "Drop · slam open + crash",{ from: 16000, to: 16000, impact: true }],
["fade",   "Fade · filter closes",    { from: 16000, to: 300 }],
["under",  "Underwater · stays shut", { from: 600, to: 600 }],
["swell",  "Swell · opens then shuts",{ from: 400, to: 400, peak: 14000 }],
].forEach(([id, name, spec]) => { MOVES[id] = { name, spec }; });
const FILTER_OPEN = 18000;                       // "no filtering", still inside Nyquist at 44.1k

// Schedule one section move: the cutoff envelope across the section, plus the riser and impact
// that go with it. `dur` is the whole section's length in seconds, so the sweep always lands on
// the section boundary whether it is four bars or sixteen.
function applyMove(ctx, filt, spec, t, dur, noise, dest) {
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
    // swelling as it goes — the tension that makes the drop land
    const rise = Math.min(dur * 0.34, 4);
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
  supersaw:81, hoover:81, acid:87, reese:39, sub:38, stab:62 };
// program number for anything the app can voice: a GM key, a synth id, or nothing recognisable
const programOf = (key, fallback = 0) => {
  const k = gmKey(key);
  if (GM_PROGRAM[k] != null) return GM_PROGRAM[k];
  if (SYNTH_PROGRAM[key] != null) return SYNTH_PROGRAM[key];
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
function strumChord(ctx, t, chord, sym, dest, voicing) {
  const base = 48 + chord.root;
  let notes = [base - 12, ...(voicing || voiceChord(chord))];
  if (sym === "U") notes = notes.slice(2).reverse();
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
function playHit(ctx, t, chord, sym, instr, slotDur, dest, voicing) {
  const fam = gmFam(instr);
  if (fam === "pluck") return strumChord(ctx, t, chord, sym, dest, voicing);
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
  const notes = sym === "U" ? led.slice(1) : [rootMid - 12, ...led];
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
    ["distortion_guitar","Distortion guitar","pluck"]]],
  ["Basses", [
    ["acoustic_bass","Acoustic bass","bass"], ["electric_bass_finger","Finger bass","bass"],
    ["electric_bass_pick","Pick bass","bass"], ["fretless_bass","Fretless bass","bass"],
    ["slap_bass_1","Slap bass","bass"], ["synth_bass_1","Synth bass","bass"], ["contrabass","Double bass","bass"]]],
  ["Strings & harp", [
    ["violin","Violin","pad"], ["viola","Viola","pad"], ["cello","Cello","pad"],
    ["tremolo_strings","Tremolo strings","pad"], ["pizzicato_strings","Pizzicato strings","pluck"],
    ["orchestral_harp","Harp","pluck"], ["timpani","Timpani","mallet"]]],
  ["Ensemble & choir", [
    ["string_ensemble_1","String ensemble","pad"], ["string_ensemble_2","Slow strings","pad"],
    ["synth_strings_1","Synth strings","pad"], ["choir_aahs","Choir “aahs”","pad"],
    ["voice_oohs","Voice “oohs”","pad"], ["synth_choir","Synth voice","pad"], ["orchestra_hit","Orchestra hit","keys"]]],
  ["Brass", [
    ["trumpet","Trumpet","pad"], ["trombone","Trombone","pad"], ["tuba","Tuba","bass"],
    ["muted_trumpet","Muted trumpet","pad"], ["french_horn","French horn","pad"],
    ["brass_section","Brass section","pad"], ["synth_brass_1","Synth brass","pad"]]],
  ["Reeds", [
    ["soprano_sax","Soprano sax","pad"], ["alto_sax","Alto sax","pad"], ["tenor_sax","Tenor sax","pad"],
    ["baritone_sax","Baritone sax","pad"], ["oboe","Oboe","pad"], ["english_horn","English horn","pad"],
    ["bassoon","Bassoon","pad"], ["clarinet","Clarinet","pad"]]],
  ["Pipes", [
    ["piccolo","Piccolo","pad"], ["flute","Flute","pad"], ["recorder","Recorder","pad"],
    ["pan_flute","Pan flute","pad"], ["whistle","Whistle","pad"], ["ocarina","Ocarina","pad"]]],
  ["Synth lead & pad", [
    ["lead_1_square","Square lead","keys"], ["lead_2_sawtooth","Saw lead","keys"],
    ["lead_3_calliope","Calliope lead","pad"], ["lead_8_bass__lead","Bass+lead","keys"],
    ["pad_1_new_age","New-age pad","pad"], ["pad_2_warm","Warm pad","pad"],
    ["pad_4_choir","Choir pad","pad"], ["pad_7_halo","Halo pad","pad"]]],
  ["World", [
    ["sitar","Sitar","pluck"], ["banjo","Banjo","pluck"], ["shamisen","Shamisen","pluck"],
    ["koto","Koto","pluck"], ["kalimba","Kalimba","mallet"], ["shanai","Shanai","pad"],
    ["steel_drums","Steel drums","mallet"], ["agogo","Agogo","mallet"]]],
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
function sampleVoicing(chord, sym, fam, voicing) {
  const iv = chordIvs(chord.quality), root = chord.root;
  if (fam === "bass") return { notes: [36 + root + (sym === "U" ? 7 : 0)], roll: 0.03 };
  const base = 48 + root;
  const led = voicing || voiceChord(chord);
  const notes = sym === "U" ? led.slice(1) : [base - 12, ...led];
  return { notes, roll: fam === "pluck" ? (sym === "U" ? 0.010 : 0.016) : 0.004 };
}
function playSampled(sampler, instr, ctx, t, chord, sym, slotDur, dest, voicing) {
  if (!sampler || !sampler.ready(instr)) return false;
  const fam = gmFam(instr);
  const { notes, roll } = sampleVoicing(chord, sym, fam, voicing);
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
    for (let i = 0; i < len; i++) d[i] = (hashNoise(seed * 7919 + ch * 104729 + i) * 2 - 1) * Math.pow(1 - i / len, 2.6);
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

/* No envelope shaping: nothing added to the attack, every stage at its own length. A part with the
   Envelope group untouched passes this, and the voice is exactly what it always was. */
const NO_SHAPE = { atk: 0, dec: 1, sus: 1, rel: 1, lvl: 1 };

// Melody lead voices — chosen from the "Lead" dropdown. Each spec is a stack of
// partials (oscillator type · harmonic multiple · relative level) plus an
// envelope: atk = attack, rel = release tail, vol = peak, sus = sustain level
// (0 = percussive decay, >0 = held tone). lp adds a low-pass; vib adds vibrato.
const LEAD_VOICES = [
  ["synth","Synth lead"], ["sine","Soft sine"], ["triangle","Mellow triangle"],
  ["square","Chiptune square"], ["saw","Bright saw"], ["flute","Flute"],
  ["pluck","Pluck"], ["bell","Bell"], ["musicbox","Music box"],
  ["ep","Electric piano"], ["strings","Strings"], ["brass","Brass"],
  ["organ","Organ"], ["voice","Voice (ah)"], ["glass","Glass pad"], ["whistle","Whistle"],
  // dance voices — the sounds the genre is actually made of, rather than approximations of
  // orchestral instruments. Detune is expressed as a frequency multiple: 2^(cents/1200).
  ["supersaw","Supersaw (trance/EDM)"], ["hoover","Hoover (rave)"], ["acid","Acid 303"],
  ["reese","Reese bass (DnB)"], ["sub","Sub bass"], ["stab","House stab"],
];
const LEAD_SPECS = {
  synth:    { parts:[["triangle",1,1],["sine",2,0.3]],                 atk:0.012, rel:0.13, vol:0.12, sus:0.6 },
  sine:     { parts:[["sine",1,1],["sine",2,0.1]],                     atk:0.02,  rel:0.18, vol:0.13, sus:0.7 },
  triangle: { parts:[["triangle",1,1]],                               atk:0.01,  rel:0.15, vol:0.13, sus:0.65 },
  square:   { parts:[["square",1,0.6]],                               atk:0.005, rel:0.07, vol:0.085, sus:0.55, lp:2600 },
  saw:      { parts:[["sawtooth",1,0.6]],                             atk:0.008, rel:0.13, vol:0.085, sus:0.6, lp:3200 },
  flute:    { parts:[["sine",1,1],["sine",2,0.05]],                   atk:0.05,  rel:0.15, vol:0.15, sus:0.8, vib:true },
  pluck:    { parts:[["triangle",1,1],["sine",3,0.15]],               atk:0.003, rel:0.3,  vol:0.14, sus:0 },
  bell:     { parts:[["sine",1,1],["sine",2.76,0.5],["sine",5.4,0.2]],atk:0.002, rel:0.6,  vol:0.11, sus:0 },
  musicbox: { parts:[["sine",1,1],["sine",4,0.35],["sine",8,0.08]],   atk:0.002, rel:0.45, vol:0.1,  sus:0 },
  ep:       { parts:[["sine",1,1],["triangle",2,0.25],["sine",5,0.06]],atk:0.004,rel:0.4,  vol:0.13, sus:0.15 },
  strings:  { parts:[["sawtooth",1,0.5],["sawtooth",1.004,0.5]],      atk:0.1,   rel:0.28, vol:0.08, sus:0.85, lp:2400, vib:true },
  brass:    { parts:[["sawtooth",1,0.7],["square",1,0.1]],            atk:0.035, rel:0.15, vol:0.085, sus:0.7, lp:2800 },
  organ:    { parts:[["sine",1,1],["sine",2,0.5],["sine",3,0.3],["sine",4,0.15]], atk:0.006, rel:0.06, vol:0.075, sus:0.9 },
  voice:    { parts:[["sawtooth",1,0.4],["sine",1,0.45]],             atk:0.06,  rel:0.18, vol:0.1,  sus:0.8, lp:1500, vib:true },
  glass:    { parts:[["sine",1,1],["sine",3,0.2],["triangle",2,0.15]],atk:0.07,  rel:0.32, vol:0.1,  sus:0.75 },
  whistle:  { parts:[["sine",1,1],["sine",2,0.02]],                   atk:0.03,  rel:0.1,  vol:0.12, sus:0.85, vib:true },
  /* Dance voices. `q` adds filter resonance, `fenv:[from,to]` sweeps the cutoff across the note
     (as a multiple of `lp`), and `bend` drops the pitch in from that many semitones above. */
  supersaw: { parts:[["sawtooth",0.97940,0.7],["sawtooth",0.98624,0.7],["sawtooth",0.99311,0.7],
                     ["sawtooth",1,1],
                     ["sawtooth",1.00694,0.7],["sawtooth",1.01394,0.7],["sawtooth",1.02098,0.7]],
              atk:0.02, rel:0.35, vol:0.038, sus:0.8, lp:4200, q:0.9 },
  hoover:   { parts:[["sawtooth",0.98624,0.8],["sawtooth",1,1],["sawtooth",1.01394,0.8],
                     ["square",0.5,0.35]],
              atk:0.015, rel:0.3, vol:0.05, sus:0.75, lp:3000, q:2.5, bend:7 },
  acid:     { parts:[["sawtooth",1,1]],
              atk:0.004, rel:0.12, vol:0.1, sus:0.25, lp:520, q:14, fenv:[5.5, 1] },
  reese:    { parts:[["sawtooth",0.98624,1],["sawtooth",1.01394,1],["sine",0.5,0.5]],
              atk:0.02, rel:0.18, vol:0.075, sus:0.85, lp:900, q:5 },
  sub:      { parts:[["sine",1,1],["triangle",2,0.06]],               atk:0.012, rel:0.1, vol:0.2, sus:0.9 },
  stab:     { parts:[["sawtooth",1,0.6],["square",2,0.2],["sawtooth",1.00694,0.5]],
              atk:0.003, rel:0.18, vol:0.075, sus:0, lp:3400, q:1.4, fenv:[1.6, 0.7] },
};
// legato=true softens the attack and lets the note ring past its slot so a
// moving line flows together instead of re-articulating on every eighth.
function leadNote(ctx, t, midi, dur, kind = "synth", legato = false, dest, shape) {
  const V = LEAD_SPECS[kind] || LEAD_SPECS.synth;
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
  V.parts.forEach(([type, mult, amp]) => {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = hz * mult;
    // the hoover's falling whoop: start above the note and slide down onto it
    if (V.bend) {
      o.frequency.setValueAtTime(hz * mult * Math.pow(2, V.bend / 12), t);
      o.frequency.exponentialRampToValueAtTime(hz * mult, t + Math.max(0.06, atk * 4));
    }
    if (lfoG) lfoG.connect(o.frequency);
    const pg = ctx.createGain(); pg.gain.value = amp;
    o.connect(pg).connect(out);
    o.start(t); o.stop(t3 + 0.05);
  });
}

export { DELAY_BEATS, DELAY_TIMES, FAM_LEAD, FILTER_OPEN, GM_CATS, GM_FAM, GM_LABEL, GM_NAMES, GM_PROGRAM, LEAD_SPECS, LEAD_VOICES, LEGACY_INSTR, MOVES, SF_BASE, SF_NAT, SYNTH_PROGRAM, VOICE_HI, VOICE_LO, anchorsFor, applyMove, clickSound, drumSound, driveCurve, duckAt, env, gmFam, gmKey, isGM, ksPluck, leadNote, makeDelay, makeNoise, makeReverb, makeSampler, makeVerbSend, midiHz, NO_SHAPE, padVoice, playHit, playLeadSampled, playSampled, programOf, sampleVoicing, sfFetch, sfName, sfPrefetch, sfRawCache, strumChord, voiceChord };
