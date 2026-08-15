// Exercises the new drum voices + sidechain against a recording stub of the Web Audio API.
// Catches the classic footguns: exponential ramps to zero, NaN frequencies, un-started
// sources, and envelopes that outlive their buffer.
import { readFileSync, writeFileSync } from "fs";
import { build } from "esbuild";

let code = readFileSync("src/progression-wheel.jsx", "utf8");
code = code.replace(/import \{[^}]*\} from "react";/, "const React = globalThis.React;");
code = code.replace("export default function ProgressionWheel(", "function ProgressionWheel(");
code += "\nexport { drumSound, duckAt, midiBytes, makeNoise, DRUMS, DRUM_MIDI, PUMP_AMT, DRUM_KITS, DRUM_DEFAULT, KIT_DEFAULT, PUMP_DEFAULT, KIT_PROGRAM, LAYER_INK, LAYER_NAMES, MAX_LAYERS, LAYER_DEFAULT_INSTR, PATTERNS, PATTERN_DEFAULT, subOf, beatsOf, stepAt, sampleAt, drumBeatsOf, lcm, rescaleBar, qbeats, colPrefs, nCols, blankBars, MELODY_PATTERNS, NARRATIVES };\n";
writeFileSync("scripts/.test.jsx", code);
await build({ entryPoints: ["scripts/.test.jsx"], outfile: "scripts/.test.mjs",
  loader: { ".jsx": "jsx" }, jsx: "transform", format: "esm", bundle: false });

globalThis.React = { createElement: () => null };
const M = await import("../scripts/.test.mjs");

/* ---- recording stub ---- */
const problems = [];
const mkParam = (name, node) => {
  const p = { value: 1, _events: [] };
  const rec = (kind) => (v, tm) => {
    if (!Number.isFinite(v)) problems.push(`${node}.${name}.${kind} non-finite value: ${v}`);
    if (!Number.isFinite(tm)) problems.push(`${node}.${name}.${kind} non-finite time: ${tm}`);
    if (tm < 0) problems.push(`${node}.${name}.${kind} negative time ${tm}`);
    if (kind === "exp" && v === 0) problems.push(`${node}.${name} exponential ramp to 0 (throws in real Web Audio)`);
    p._events.push({ kind, v, t: tm });
    p.value = v;
  };
  p.setValueAtTime = rec("set");
  p.linearRampToValueAtTime = rec("lin");
  p.exponentialRampToValueAtTime = rec("exp");
  p.cancelScheduledValues = (tm) => p._events.push({ kind: "cancel", t: tm });
  return p;
};
const nodes = [];
const baseNode = (type) => {
  const n = { type, _conns: [], connect(d) { this._conns.push(d); return d; }, disconnect() {} };
  nodes.push(n); return n;
};
const ctx = {
  currentTime: 0, sampleRate: 44100, state: "running", destination: baseNode("dest"),
  createGain() { const n = baseNode("gain"); n.gain = mkParam("gain", "gain"); return n; },
  createOscillator() {
    const n = baseNode("osc");
    n.frequency = mkParam("frequency", "osc");
    n._started = false;
    n.start = t => { n._started = true; n._t0 = t; };
    n.stop = t => { n._t1 = t; if (t < n._t0) problems.push(`osc stop(${t}) before start(${n._t0})`); };
    return n;
  },
  createBufferSource() {
    const n = baseNode("buf"); n.buffer = null; n.loop = false; n._started = false;
    n.start = t => { n._started = true; n._t0 = t; };
    n.stop = t => { n._t1 = t; if (t < n._t0) problems.push(`buffer stop(${t}) before start(${n._t0})`); };
    return n;
  },
  createBiquadFilter() {
    const n = baseNode("biquad"); n.type = "lowpass";
    n.frequency = mkParam("frequency", "biquad"); n.Q = mkParam("Q", "biquad");
    return n;
  },
  createBuffer(chs, len, rate) {
    return { length: len, duration: len / rate, getChannelData: () => new Float32Array(len) };
  },
  createConvolver() { const n = baseNode("conv"); n.buffer = null; return n; },
  createDynamicsCompressor() {
    const n = baseNode("comp");
    for (const k of ["threshold","knee","ratio","attack","release"]) n[k] = mkParam(k, "comp");
    return n;
  },
};

const noise = M.makeNoise(ctx);
const noiseDur = noise.duration;
console.log(`noise buffer: ${noiseDur.toFixed(3)}s`);

/* ---- every channel × every kit ---- */
const CHANNELS = "KSHOCPRXB".split("");
let voiced = 0;
for (const [kitId] of M.DRUM_KITS) {
  for (const ch of CHANNELS) {
    nodes.length = 0;
    const dest = baseNode("dest");
    const before = problems.length;
    try { M.drumSound(ctx, 1.5, ch, noise, dest, kitId); }
    catch (e) { problems.push(`${kitId}/${ch} threw: ${e.message}`); continue; }
    const sources = nodes.filter(n => n.type === "osc" || n.type === "buf");
    if (!sources.length) { problems.push(`${kitId}/${ch} produced no sound sources`); continue; }
    for (const s of sources) {
      if (!s._started) problems.push(`${kitId}/${ch} has an unstarted ${s.type}`);
      if (s._t1 == null) problems.push(`${kitId}/${ch} has a ${s.type} that never stops`);
      // a non-looping noise source must not be asked to ring past its buffer
      if (s.type === "buf" && !s.loop && s._t1 - s._t0 > noiseDur + 1e-9)
        problems.push(`${kitId}/${ch} noise rings ${(s._t1-s._t0).toFixed(2)}s > ${noiseDur}s buffer without loop`);
    }
    if (problems.length === before) voiced++;
  }
}
console.log(`voices OK: ${voiced}/${CHANNELS.length * M.DRUM_KITS.length}`);

/* ---- sidechain envelope ---- */
for (const [id, amt] of Object.entries(M.PUMP_AMT)) {
  if (!amt) continue;
  const g = { gain: mkParam("gain", "duck") };
  M.duckAt(g, 2.0, amt, 0.3);
  const evs = g.gain._events;
  const floor = evs.find(e => e.kind === "lin" && e.v < 1);
  const recover = [...evs].reverse().find(e => e.kind === "lin" && e.v === 1);
  if (evs[0].kind !== "cancel") problems.push(`pump ${id}: does not cancel prior ramps first`);
  if (!floor) problems.push(`pump ${id}: never ducks`);
  if (!recover) problems.push(`pump ${id}: never recovers to unity`);
  if (floor && floor.v <= 0) problems.push(`pump ${id}: ducks to <= 0 (silence/inversion)`);
  if (floor && recover && recover.t <= floor.t) problems.push(`pump ${id}: recovery not after the dip`);
  console.log(`pump ${id.padEnd(8)} → floor ${floor.v.toFixed(2)} at +${((floor.t-2)*1000).toFixed(0)}ms, back to 1 at +${((recover.t-2)*1000).toFixed(0)}ms`);
}

/* ---- every drum pattern is well-formed and MIDI-mappable ---- */
let pats = 0;
for (const [id, d] of Object.entries(M.DRUMS)) {
  if (!d.pattern) continue;
  pats++;
  if (![6, 8, 16].includes(d.pattern.length)) problems.push(`pattern ${id}: ${d.pattern.length} steps (want 6, 8 or 16)`);
  if (![3, 4].includes(M.drumBeatsOf(d.pattern))) problems.push(`pattern ${id}: reads as ${M.drumBeatsOf(d.pattern)} beats`);
  for (const step of d.pattern) for (const c of step) {
    if (!CHANNELS.includes(c)) problems.push(`pattern ${id}: unknown channel "${c}"`);
    if (M.DRUM_MIDI[c] == null) problems.push(`pattern ${id}: channel "${c}" has no GM note`);
  }
}
console.log(`drum patterns: ${pats} checked`);

/* ---- MIDI export with the new channels + a machine kit ---- */
const bars = [{ chord: { root: 0, quality: "min" } }, { chord: { root: 5, quality: "maj" } }];
for (const kit of ["acoustic", "909", "808"]) {
  const bytes = M.midiBytes(124, 4, bars, M.DRUMS.house909.pattern, null, kit);
  if (!(bytes instanceof Uint8Array)) { problems.push(`midi ${kit}: not a byte array`); continue; }
  const hdr = String.fromCharCode(...bytes.slice(0, 4));
  if (hdr !== "MThd") problems.push(`midi ${kit}: bad header ${hdr}`);
  // walk the chunks so a malformed length is caught rather than assumed
  let p = 14, chunks = 0;
  while (p < bytes.length) {
    const tag = String.fromCharCode(...bytes.slice(p, p + 4));
    if (tag !== "MTrk") { problems.push(`midi ${kit}: bad chunk tag "${tag}" at ${p}`); break; }
    const len = (bytes[p+4]<<24) | (bytes[p+5]<<16) | (bytes[p+6]<<8) | bytes[p+7];
    p += 8 + len; chunks++;
  }
  if (p !== bytes.length) problems.push(`midi ${kit}: chunk lengths do not sum to file size (${p} vs ${bytes.length})`);
  const declared = bytes[11];
  if (declared !== chunks) problems.push(`midi ${kit}: header declares ${declared} tracks, found ${chunks}`);
  const hasProg = [...bytes].some((b, i) => b === 0xc9 && bytes[i+1] === M.KIT_PROGRAM[kit]);
  const wantProg = M.KIT_PROGRAM[kit] != null;
  if (wantProg && !hasProg) problems.push(`midi ${kit}: missing channel-10 program change`);
  console.log(`midi ${kit.padEnd(8)} → ${bytes.length} bytes, ${chunks} tracks, kit program ${wantProg ? M.KIT_PROGRAM[kit] : "none (GM standard)"}`);
}

/* ---- the dance defaults all point at things that exist ---- */
for (const [prog, id] of Object.entries(M.DRUM_DEFAULT))
  if (!M.DRUMS[id]) problems.push(`DRUM_DEFAULT[${prog}] → unknown pattern "${id}"`);
for (const [prog, id] of Object.entries(M.KIT_DEFAULT))
  if (!M.DRUM_KITS.some(([k]) => k === id)) problems.push(`KIT_DEFAULT[${prog}] → unknown kit "${id}"`);
for (const [prog, id] of Object.entries(M.PUMP_DEFAULT))
  if (M.PUMP_AMT[id] == null) problems.push(`PUMP_DEFAULT[${prog}] → unknown pump "${id}"`);
console.log(`dance defaults: ${Object.keys(M.DRUM_DEFAULT).length} progressions wired`);

/* ---- grid resolution: every pattern declares a coherent meter ---- */
let sixteenth = 0;
for (const [id, p] of Object.entries(M.PATTERNS)) {
  const sub = M.subOf(p), beats = M.beatsOf(p);
  if (![2, 4].includes(sub)) problems.push(`pattern ${id}: sub ${sub} (want 2 or 4)`);
  if (!Number.isInteger(beats)) problems.push(`pattern ${id}: ${p.pattern.length} steps / sub ${sub} = ${beats} beats`);
  if (![3, 4].includes(beats)) problems.push(`pattern ${id}: ${beats} beats per bar (want 3 or 4)`);
  if (sub === 4) sixteenth++;
}
for (const [prog, id] of Object.entries(M.PATTERN_DEFAULT))
  if (!M.PATTERNS[id]) problems.push(`PATTERN_DEFAULT[${prog}] → unknown pattern "${id}"`);
console.log(`strum patterns: ${Object.keys(M.PATTERNS).length} (${sixteenth} at sixteenths)`);
const drum16 = Object.values(M.DRUMS).filter(d => d.pattern && d.pattern.length === 16).length;
console.log(`drum patterns: ${drum16} at sixteenths`);

/* ---- resampling: a coarse pattern on a fine bar keeps its timing ---- */
{
  const eight = "01234567".split(""), ticks = 16;
  const fired = [];
  for (let i = 0; i < ticks; i++) { const s = M.sampleAt(eight, i, ticks); if (s != null) fired.push([i, s]); }
  if (fired.length !== 8) problems.push(`8-step pattern on a 16-tick bar fired ${fired.length} times, want 8`);
  if (!fired.every(([i, s], k) => i === k * 2 && s === String(k)))
    problems.push("8-step pattern did not land on every other tick in order");
  // a same-length pattern must be untouched — this is the path every existing song takes
  for (let i = 0; i < 8; i++) if (M.sampleAt(eight, i, 8) !== eight[i])
    problems.push(`same-length resampling changed step ${i}`);
  // and a 16-step pattern on a 16-tick bar fires every tick
  const sixteen = Array.from({ length: 16 }, (_, i) => "x");
  if (Array.from({ length: 16 }, (_, i) => M.sampleAt(sixteen, i, 16)).some(v => v == null))
    problems.push("16-step pattern skipped a tick on a 16-tick bar");
  if (M.lcm(8, 16) !== 16 || M.lcm(6, 6) !== 6) problems.push("lcm is wrong for the meters in play");
  if (M.drumBeatsOf(["a","b","c","d","e","f"]) !== 3) problems.push("a 6-step drum pattern should read as 3 beats");
  if (M.drumBeatsOf(Array(16).fill("a")) !== 4) problems.push("a 16-step drum pattern should read as 4 beats");
  console.log(`resampling: 8-step pattern lands on ticks ${fired.map(f => f[0]).join(",")} of 16`);
}

/* ---- rescaleBar: switching grid keeps notes where they sound ---- */
{
  const bar8 = [[0],[],[2],[],[4],[],[6],[]];
  const up = M.rescaleBar(bar8, 16);
  if (up.length !== 16) problems.push(`rescale 8→16 produced ${up.length} columns`);
  // every note must move to twice its column — i.e. stay at the same point in the bar
  bar8.forEach((col, c) => { if (col.length && JSON.stringify(up[c * 2]) !== JSON.stringify(col))
    problems.push(`rescale 8→16 moved the note at column ${c} (found at ${c*2}: ${JSON.stringify(up[c*2])})`); });
  const back = M.rescaleBar(up, 8);
  if (JSON.stringify(back) !== JSON.stringify(bar8)) problems.push("rescale 8→16→8 is not a round trip");
  if (M.rescaleBar(null, 16).length !== 16) problems.push("rescale of an empty bar has the wrong width");
  const same = [[1],[2]];
  if (M.rescaleBar(same, 2)[0] === same[0]) problems.push("rescale of a same-width bar aliases the source array");
  console.log("rescaleBar: 8↔16 round trips with timing preserved");
}

/* ---- beat positions at both resolutions ---- */
{
  if (JSON.stringify(M.qbeats(8, 2)) !== "[0,2,4,6]") problems.push("qbeats wrong on an eighth grid");
  if (JSON.stringify(M.qbeats(16, 4)) !== "[0,4,8,12]") problems.push("qbeats wrong on a sixteenth grid");
  if (JSON.stringify(M.qbeats(6, 2)) !== "[0,2,4]") problems.push("qbeats wrong in waltz time");
  for (const [B, sub] of [[8,2],[16,4],[6,2],[12,4]]) {
    const prefs = M.colPrefs(B, sub);
    if (new Set(prefs).size !== prefs.length) problems.push(`colPrefs(${B},${sub}) has duplicates`);
    if (prefs.some(c => !Number.isInteger(c) || c < 0 || c >= B)) problems.push(`colPrefs(${B},${sub}) out of range`);
    if (prefs[0] !== 0) problems.push(`colPrefs(${B},${sub}) does not start on the downbeat`);
    // the first `B/sub` preferences should all be on-beat columns
    const beats = M.qbeats(B, sub);
    if (!M.nCols(B, beats.length, sub).every(c => beats.includes(c)))
      problems.push(`nCols(${B},${beats.length},${sub}) put notes off the beat before filling the beats`);
  }
  console.log(`beat columns: eighth grid ${M.qbeats(8,2)}, sixteenth grid ${M.qbeats(16,4)}`);
}

/* ---- every melody generator survives a sixteenth grid ---- */
{
  const chordDegs = [0, 3, 4, 5];
  let gens = 0;
  const checkBars = (what, bars, B, nBars) => {
    if (!Array.isArray(bars)) { problems.push(`${what}: did not return bars`); return; }
    if (bars.length !== nBars) problems.push(`${what}: ${bars.length} bars, want ${nBars}`);
    bars.forEach((bar, bi) => {
      if (!Array.isArray(bar) || bar.length !== B) { problems.push(`${what} bar ${bi}: ${bar && bar.length} columns, want ${B}`); return; }
      bar.forEach((col, c) => {
        if (!Array.isArray(col)) { problems.push(`${what} bar ${bi} col ${c}: not an array`); return; }
        for (const d of col) if (!Number.isInteger(d) || d < 0 || d > 6)
          problems.push(`${what} bar ${bi} col ${c}: degree ${d} outside 0..6`);
      });
    });
  };
  for (const [B, sub] of [[8, 2], [16, 4]]) {
    for (const p of M.MELODY_PATTERNS) {
      gens++;
      let bars; try { bars = p.gen({ nBars: 4, B, sub, start: 2, chordDegs }); }
      catch (e) { problems.push(`melody pattern ${p.id} threw at B=${B}: ${e.message}`); continue; }
      checkBars(`melody ${p.id} @${B}`, bars, B, 4);
      if (!bars.some(bar => bar.some(c => c.length))) problems.push(`melody ${p.id} @${B}: wrote nothing`);
    }
    for (const nar of M.NARRATIVES) {
      gens++;
      let bars;
      try { bars = nar.gen({ nBars: 4, B, sub, nd: 7, chordDegs, role: "C", pass: 0, passes: 2, idx: 1, total: 4, frac: 0.33 }); }
      catch (e) { problems.push(`narrative ${nar.id} threw at B=${B}: ${e.message}`); continue; }
      checkBars(`narrative ${nar.id} @${B}`, bars, B, 4);
      if (!bars.some(bar => bar.some(c => c.length))) problems.push(`narrative ${nar.id} @${B}: wrote nothing`);
    }
  }
  console.log(`melody generators: ${gens} runs across both grids`);
}

/* ---- MIDI at sixteenths: a bar still lasts a bar ---- */
{
  const T = 480;
  // walk a track's delta times to get its total length in ticks
  const trackLen = (bytes, want) => {
    let p = 14, seen = 0;
    while (p < bytes.length) {
      const len = (bytes[p+4]<<24)|(bytes[p+5]<<16)|(bytes[p+6]<<8)|bytes[p+7];
      const body = bytes.slice(p + 8, p + 8 + len);
      if (seen === want) {
        let t = 0, q = 0;
        while (q < body.length) {
          let dt = 0; while (body[q] & 0x80) { dt = (dt << 7) | (body[q] & 0x7f); q++; } dt = (dt << 7) | body[q]; q++;
          t += dt;
          const st = body[q];
          if (st === 0xff) { q++; const meta = body[q++]; const l = body[q++]; q += l; if (meta === 0x2f) break; }
          else if ((st & 0xf0) === 0xc0) q += 2;
          else q += 3;
        }
        return t;
      }
      p += 8 + len; seen++;
    }
    return -1;
  };
  const bars2 = [{ chord: { root: 0, quality: "min" } }, { chord: { root: 5, quality: "maj" } }];
  const NB = 2, BEATS = 4, want = NB * BEATS * T;
  for (const [label, pat, sub] of [
    ["eighth drums", M.DRUMS.house909.pattern, 2],
    ["sixteenth drums", M.DRUMS.house16d.pattern, 4],
    ["amen break", M.DRUMS.amen.pattern, 4],
  ]) {
    const cols = Array.from({ length: NB * BEATS * sub }, (_, i) => (i % sub === 0 ? [0] : []));
    const bytes = M.midiBytes(128, BEATS, bars2, pat, [cols], "909", sub);
    // the chord track spans the whole song exactly — that is what sets the file's length
    const chordTicks = trackLen(bytes, 1);
    if (chordTicks !== want) problems.push(`${label}: chord track is ${chordTicks} ticks, want exactly ${want}`);
    // drum and melody tracks legitimately end after their last event, so derive where that is
    // rather than expecting them to run to the bar line — what matters is they never overrun
    const stepT = BEATS * T / pat.length, gate = Math.min(60, stepT * 0.5);
    let lastStep = -1; pat.forEach((s, i) => { if (s) lastStep = i; });
    const wantDrum = (NB - 1) * BEATS * T + lastStep * stepT + gate;
    let lastCol = -1; cols.forEach((c, i) => { if (c.length) lastCol = i; });
    const wantMel = (lastCol + 1) * (T / sub);
    const drumTicks = trackLen(bytes, 2), melTicks = trackLen(bytes, 3);
    if (drumTicks !== wantDrum) problems.push(`${label}: drum track ends at ${drumTicks}, want ${wantDrum}`);
    if (melTicks !== wantMel) problems.push(`${label}: melody track ends at ${melTicks}, want ${wantMel}`);
    if (drumTicks > want) problems.push(`${label}: drum track overruns the song (${drumTicks} > ${want})`);
    if (melTicks > want) problems.push(`${label}: melody track overruns the song (${melTicks} > ${want})`);
    console.log(`midi ${label.padEnd(16)} → chords ${chordTicks}/${want}, drums end ${drumTicks}, melody end ${melTicks}`);
  }
}

/* ---- melody parts each get their own MIDI channel, and never the drum channel ---- */
{
  const bars2 = [{ chord: { root: 0, quality: "min" } }];
  const mk = note => Array.from({ length: 8 }, (_, i) => (i % 2 === 0 ? [note] : []));
  // six parts is the cap; channel 9 (the 0-based drum channel) must be skipped
  const parts = [60, 62, 64, 65, 67, 69].map(mk);
  const bytes = M.midiBytes(120, 4, bars2, null, parts, null, 2);
  // collect note-on channels per track. Track 0 is tempo and track 1 is the chords (channel 0),
  // so only tracks from index 2 are melody parts — scanning all of them would count the chord
  // track's channel as a part and look like a collision.
  const perTrack = [];
  let p = 14, tracks = 0;
  while (p < bytes.length) {
    const len = (bytes[p+4]<<24)|(bytes[p+5]<<16)|(bytes[p+6]<<8)|bytes[p+7];
    const body = bytes.slice(p + 8, p + 8 + len);
    const c = new Set();
    for (let q = 0; q < body.length; q++) if ((body[q] & 0xf0) === 0x90) c.add(body[q] & 0x0f);
    perTrack.push(c); p += 8 + len; tracks++;
  }
  const chans = new Set(perTrack.slice(2).flatMap(s => [...s]));
  perTrack.slice(2).forEach((s, i) => { if (s.size > 1) problems.push(`melody part ${i} spans channels ${[...s]}`); });
  if (tracks !== 2 + parts.length) problems.push(`multi-part export: ${tracks} tracks, want ${2 + parts.length}`);
  if (bytes[11] !== tracks) problems.push(`multi-part export: header says ${bytes[11]} tracks, found ${tracks}`);
  if (chans.has(9)) problems.push("a melody part was written onto channel 10 (the drum channel)");
  if (chans.size !== parts.length) problems.push(`melody parts share channels: ${[...chans].join(",")}`);
  // a part with no notes must not claim a track
  const sparse = M.midiBytes(120, 4, bars2, null, [mk(60), null, mk(64)], null, 2);
  if (sparse[11] !== 4) problems.push(`empty parts still emitted tracks: header says ${sparse[11]}, want 4`);
  console.log(`melody parts: ${parts.length} parts → channels ${[...chans].sort((a,b)=>a-b).join(",")} (drum channel 9 skipped)`);
  if (M.LAYER_INK.length < M.MAX_LAYERS) problems.push("not enough part colours for MAX_LAYERS");
  if (M.LAYER_NAMES.length < M.MAX_LAYERS) problems.push("not enough part names for MAX_LAYERS");
  if (new Set(M.LAYER_INK).size !== M.LAYER_INK.length) problems.push("two melody parts share an ink colour");
}

console.log(problems.length ? `\n✗ ${problems.length} PROBLEM(S):\n` + problems.map(p => "  - " + p).join("\n")
                            : "\n✓ all audio checks passed");
process.exit(problems.length ? 1 : 0);
