// Exercises the new drum voices + sidechain against a recording stub of the Web Audio API.
// Catches the classic footguns: exponential ramps to zero, NaN frequencies, un-started
// sources, and envelopes that outlive their buffer.
import { readFileSync, writeFileSync } from "fs";
import { build } from "esbuild";

let code = readFileSync("src/progression-wheel.jsx", "utf8");
code = code.replace(/import \{[^}]*\} from "react";/, "const React = globalThis.React;");
code = code.replace("export default function ProgressionWheel(", "function ProgressionWheel(");
code += "\nexport { drumSound, duckAt, midiBytes, makeNoise, DRUMS, DRUM_MIDI, PUMP_AMT, DRUM_KITS, DRUM_DEFAULT, KIT_DEFAULT, PUMP_DEFAULT, KIT_PROGRAM };\n";
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
  if (![8, 6].includes(d.pattern.length)) problems.push(`pattern ${id}: ${d.pattern.length} steps (want 8 or 6)`);
  for (const step of d.pattern) for (const c of step) {
    if (!CHANNELS.includes(c)) problems.push(`pattern ${id}: unknown channel "${c}"`);
    if (M.DRUM_MIDI[c] == null) problems.push(`pattern ${id}: channel "${c}" has no GM note`);
  }
}
console.log(`drum patterns: ${pats} checked`);

/* ---- MIDI export with the new channels + a machine kit ---- */
const bars = [{ chord: { root: 0, quality: "min" } }, { chord: { root: 5, quality: "maj" } }];
for (const kit of ["acoustic", "909", "808"]) {
  const bytes = M.midiBytes(124, 4, bars, M.DRUMS.house909.pattern, null, null, kit);
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

console.log(problems.length ? `\n✗ ${problems.length} PROBLEM(S):\n` + problems.map(p => "  - " + p).join("\n")
                            : "\n✓ all audio checks passed");
process.exit(problems.length ? 1 : 0);
