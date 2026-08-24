// Exercises the new drum voices + sidechain against a recording stub of the Web Audio API.
// Catches the classic footguns: exponential ramps to zero, NaN frequencies, un-started
// sources, and envelopes that outlive their buffer.
// Since the logic lives in plain .js modules, this imports them directly — no build step, no
// JSX transform, no React stub. Only the component file needs compiling, and nothing here needs it.
import { readFileSync } from "fs";
import * as theory from "../src/theory.js";
import * as patterns from "../src/patterns.js";
import * as audio from "../src/audio.js";
import * as midiMod from "../src/midi.js";
import * as melody from "../src/melody.js";
import * as progs from "../src/progressions.js";
import * as song from "../src/song.js";
import * as wav from "../src/wav.js";
import * as zip from "../src/zip.js";
import * as arrange from "../src/arrange.js";
import * as arrTpl from "../src/arrange-templates.js";
import * as trackPresets from "../src/track-presets.js";
import * as als from "../src/als.js";
import * as exportState from "../src/export-state.js";
import * as hook from "../src/hook.js";

const M = { ...theory, ...patterns, ...audio, ...midiMod, ...melody, ...song, ...wav, ...progs, ...zip, ...arrange, ...arrTpl, ...trackPresets, ...als, ...exportState, ...hook };
// the component source, read as text for the shape guard at the end
const code = readFileSync("src/progression-wheel.jsx", "utf8");

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
// NB: the kind marker must NOT be called `type` — real nodes use `.type` for the oscillator
// waveform and the filter mode, and the code under test sets it, which would clobber the marker
// and silently exclude those nodes from every assertion below.
const baseNode = (kind) => {
  const n = { _kind: kind, _conns: [], connect(d) { this._conns.push(d); return d; }, disconnect() {} };
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
  createDelay(max) { const n = baseNode("delay"); n.delayTime = mkParam("delayTime", "delay"); n._max = max; return n; },
  createBuffer(chs, len, rate) {
    // the channel arrays have to persist: handing back a fresh zeroed array each call means every
    // buffer reads as silence and nothing written into one can ever be checked
    const data = Array.from({ length: chs }, () => new Float32Array(len));
    return { length: len, duration: len / rate, numberOfChannels: chs, getChannelData: ch => data[ch] };
  },
  createConvolver() { const n = baseNode("conv"); n.buffer = null; return n; },
  createWaveShaper() { const n = baseNode("shaper"); n.curve = null; return n; },
  createStereoPanner() { const n = baseNode("panner"); n.pan = mkParam("pan", "panner"); return n; },
  createDynamicsCompressor() {
    const n = baseNode("comp");
    for (const k of ["threshold","knee","ratio","attack","release"]) n[k] = mkParam(k, "comp");
    return n;
  },
  createChannelSplitter(n) { const s = baseNode("splitter"); s._n = n; return s; },
  createChannelMerger(n) { const m = baseNode("merger"); m._n = n; return m; },
  // deprecated but still what this app uses for main-thread DSP (see the bitcrusher); the stub
  // records the callback rather than driving it, since nothing here plays real audio
  createScriptProcessor(buf, ins, outs) {
    const n = baseNode("script"); n._buf = buf; n._ins = ins; n._outs = outs; n.onaudioprocess = null;
    return n;
  },
};

// the bar lengths the time-signature menu offers; anything outside them is unreachable content
const METER_BEATS = [...new Set(M.METERS.map(m => m.beats))];

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
    const sources = nodes.filter(n => n._kind === "osc" || n._kind === "buf");
    if (!sources.length) { problems.push(`${kitId}/${ch} produced no sound sources`); continue; }
    for (const s of sources) {
      if (!s._started) problems.push(`${kitId}/${ch} has an unstarted ${s._kind}`);
      if (s._t1 == null) problems.push(`${kitId}/${ch} has a ${s._kind} that never stops`);
      // a non-looping noise source must not be asked to ring past its buffer
      if (s._kind === "buf" && !s.loop && s._t1 - s._t0 > noiseDur + 1e-9)
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
  /* A drum pattern's length has to be a whole number of eighths or sixteenths in a meter the app
     offers, since the length is the only thing that says which bar it belongs to. */
  const okLens = METER_BEATS.flatMap(b => [b * 2, b * 4]);
  if (!okLens.includes(d.pattern.length))
    problems.push(`pattern ${id}: ${d.pattern.length} steps — not a whole bar in any offered meter (${okLens.join(", ")})`);
  // every drum pattern has to land on a meter the app offers, or it is unreachable from the menus
  if (!METER_BEATS.includes(M.drumBeatsOf(d.pattern)))
    problems.push(`pattern ${id}: reads as ${M.drumBeatsOf(d.pattern)} beats, which no time signature uses`);
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

/* ---- the drum grid: an edited bar is a pattern like any other ----
   That is the whole design. A section's written bars go into the same array-of-step-strings the
   catalogue uses, so if they ever stop being a valid pattern, playback, the MIDI writer and the
   drum stem all break at once and none of them would say so. */
{
  // every row the grid draws has to be a piece the app can actually sound and export
  for (const [ch, name, tip, ink] of M.DRUM_VOICES) {
    if (M.DRUM_MIDI[ch] == null) problems.push(`drum voice ${ch} (${name}) has no MIDI note`);
    if (!name || !tip || !ink) problems.push(`drum voice ${ch}: missing name, tip or ink`);
    nodes.length = 0;
    const dest = baseNode("dest");
    M.drumSound(ctx, 0, ch, noise, dest, "acoustic");
    if (!nodes.some(n => n._kind === "buf" || n._kind === "osc")) problems.push(`drum voice ${ch} makes no sound`);
  }
  if (new Set(M.DRUM_ORDER).size !== M.DRUM_VOICES.length) problems.push("DRUM_VOICES has a duplicate letter");

  // an edited bar's step count must read back as the meter it was written in, or playback samples
  // it onto the wrong grid and most of the groove falls between the ticks
  for (const beats of [...new Set(M.METERS.map(m => m.beats))]) {
    const n = M.beatSteps(beats);
    if (M.drumBeatsOf(M.blankBeat(n)) !== beats)
      problems.push(`a ${beats}-beat bar is ${n} steps, which reads back as ${M.drumBeatsOf(M.blankBeat(n))} beats`);
    for (const m of M.METERS) if (m.beats === beats && !M.drumFitsMeter({ pattern: M.blankBeat(n) }, m.id))
      problems.push(`an edited ${m.id} bar does not fit ${m.id}`);
  }
  // opening the grid shows what is already playing: the catalogue pattern laid onto the fine grid
  const seed = M.beatFrom(M.DRUMS.rock.pattern, 16);
  const at = ch => seed.map((s, i) => s.includes(ch) ? i : -1).filter(i => i >= 0);
  if (JSON.stringify(at("K")) !== "[0,8]") problems.push(`rock seeded its kick at ${at("K")}, want beats 1 and 3`);
  if (JSON.stringify(at("S")) !== "[4,12]") problems.push(`rock seeded its snare at ${at("S")}, want beats 2 and 4`);
  if (at("H").length !== 8) problems.push(`rock seeded ${at("H").length} hats, want 8 eighths`);
  // toggling is add/remove, and a step is always written in kit order so two identical bars compare equal
  let bar = M.blankBeat(8);
  bar = M.beatToggle(bar, 0, "K"); bar = M.beatToggle(bar, 0, "H");
  if (bar[0] !== "HK") problems.push(`two pieces on one step wrote "${bar[0]}", want kit order "HK"`);
  if (M.beatToggle(bar, 0, "K")[0] !== "H") problems.push("toggling a piece off did not remove it");
  if (M.beatHits([["HK", "", "S"], ["K"]]) !== 4) problems.push("beatHits miscounts");

  /* And it reaches the exported file. This is the claim that matters for a DAW: a crash written on
     the downbeat of bar 2 has to arrive as note 49 on channel 10, at the right tick. */
  {
    const custom = M.beatToggle(M.blankBeat(16), 0, "X");
    const two = [{ chord: { root: 0, quality: "min" } }, { chord: { root: 5, quality: "maj" } }];
    const bytes = M.midiBytes(120, 4, two, bi => (bi === 1 ? custom : M.DRUMS.rock.pattern), null, "acoustic");
    const crash = [...bytes].some((b, i) => b === 0x99 && bytes[i + 1] === M.DRUM_MIDI.X);
    if (!crash) problems.push("a crash written on the grid never reaches the exported MIDI");
    // and the bar it was not written in still has its own pattern
    const kick = [...bytes].some((b, i) => b === 0x99 && bytes[i + 1] === M.DRUM_MIDI.K);
    if (!kick) problems.push("the unedited bar lost its catalogue pattern in the export");
  }
  // a section's bars survive the trip to a link and back, joined form and all
  {
    const beats = { C1: [M.beatToggle(M.blankBeat(16), 0, "K"), M.blankBeat(16)] };
    const round = M.unpackBeats(M.packBeats(beats));
    if (JSON.stringify(round) !== JSON.stringify(beats)) problems.push("drum bars do not survive packing");
    if (M.packBeats({}) !== null) problems.push("an unwritten song should pack no drum bars at all");
    const packed = M.packBeats(beats).C1[0];
    if (packed.length >= JSON.stringify(beats.C1[0]).length) problems.push("packing a drum bar made it bigger");
  }
  console.log(`drum grid: ${M.DRUM_VOICES.length} voices, ${M.beatSteps(4)}/${M.beatSteps(3)}/${M.beatSteps(5)} steps a bar, seeded from the catalogue and exported to MIDI`);
}

/* ---- the Ableton Live Set ----
   A .als is gzipped XML, so both halves can be checked here: that the document is well-formed and
   says what it should, and that the bytes are really gzip. What cannot be checked here is whether
   Live accepts it — that needs Live, and the first two attempts at this file were refused and then
   crashed it. The shape now comes from src/als-template.js, taken from a set Live saved; what these
   checks defend is the part this file fills in, above all the ids. */
{
  const spec = {
    bpm: 128, tsNum: 4, tsDen: 4,
    tracks: [
      { name: "Chords", color: M.ALS_COLORS.chords, vol: 0.85, end: 8,
        notes: [{ t: 0, dur: 4, note: 60, vel: 78 }, { t: 4, dur: 4, note: 64, vel: 78 }] },
      { name: "Drums & <bells>", color: M.ALS_COLORS.drums, vol: 0.85, end: 8,
        notes: [{ t: 0, dur: 0.25, note: 36, vel: 92 }, { t: 1, dur: 0.25, note: 38, vel: 92 }] },
    ],
    locators: [{ beat: 0, name: "Intro" }, { beat: 4, name: "Chorus & drop" }],
    name: "test song",
  };
  const xml = M.alsXml(spec);
  // well-formed: every tag that opens closes, in order. A malformed set is a file Live refuses.
  {
    const stack = [];
    let ok = true;
    for (const m of xml.matchAll(/<(\/?)([A-Za-z][\w.]*)((?:[^>"]|"[^"]*")*?)(\/?)>/g)) {
      const [, close, tag, , self] = m;
      if (close) { if (stack.pop() !== tag) { problems.push(`als: </${tag}> closes the wrong element`); ok = false; break; } }
      else if (!self) stack.push(tag);
    }
    if (ok && stack.length) problems.push(`als: ${stack.length} element(s) left open (${stack.slice(-3).join(" > ")})`);
  }
  if (!/^<\?xml version="1\.0" encoding="UTF-8"\?>/.test(xml)) problems.push("als: no XML declaration");
  if (!/<Ableton MajorVersion="5"[^>]*MinorVersion="12\.[^"]*"/.test(xml)) problems.push("als: not a Live 12 schema header");
  if (!/Creator="Progression Wheel"/.test(xml)) problems.push("als: the set does not say what wrote it");
  // a placeholder that survives is a hole in the document, and Live reads it as a value
  {
    const left = xml.match(/%[A-Z]+%/g);
    if (left) problems.push(`als: unfilled placeholder(s) ${[...new Set(left)].join(", ")}`);
  }
  /* The structure a hand-written set was missing, and which crashed Live rather than being
     reported: a document has scenes, a transport, a main track, and one clip slot per scene on
     every track. The counts have to agree — a track with fewer slots than there are scenes is a
     Session grid with a hole in it. */
  for (const [tag, what] of [["Scenes", "the scenes"], ["Transport", "the transport"],
                             ["MainTrack", "the main track"], ["PreHearTrack", "the prehear track"]])
    if (!xml.includes(`<${tag}`)) problems.push(`als: ${what} block is missing`);
  const scenes = (xml.match(/<Scene Id=/g) || []).length;
  const trackXml = [...xml.matchAll(/<MidiTrack [^>]*>/g)].map((m, i, all) => {
    const from = m.index, to = i + 1 < all.length ? all[i + 1].index : xml.indexOf("</Tracks>");
    return xml.slice(from, to);
  });
  if (trackXml.length !== 2) problems.push(`als: ${trackXml.length} MIDI tracks, expected 2`);
  for (const t of trackXml) {
    // the freeze sequencer keeps a second list of its own, so count only the playing one
    const seq = t.slice(t.indexOf("<MainSequencer>"), t.indexOf("<FreezeSequencer>"));
    const slots = (seq.match(/<ClipSlot Id=/g) || []).length;
    if (slots !== scenes) problems.push(`als: a track has ${slots} clip slots for ${scenes} scenes`);
  }
  /* Ids are what Live refuses a set over. The ones inside the tracks are this file's own work —
     every clone is renumbered — so they have to be unique across the document and below
     NextPointeeId, the watermark Live allocates from. The handful of tags Live itself numbers per
     list rather than per document are exempt; that list was measured from a real set. */
  {
    const LOCAL = ["ClipSlot", "AutomationLane", "TrackSendHolder", "TakeLane", "MidiClip",
                   "KeyTrack", "RemoteableTimeSignature", "Scene", "SendPreBool", "Locator"];
    const ids = [];
    for (const t of trackXml)
      for (const m of t.matchAll(/<([A-Za-z][\w.]*)((?:[^>"]|"[^"]*")*?\s)Id="(\d+)"/g))
        if (!LOCAL.includes(m[1])) ids.push({ tag: m[1], id: Number(m[3]) });
    const seen = new Set(), dupes = new Set();
    for (const { id } of ids) (seen.has(id) ? dupes : seen).add(id);
    if (dupes.size) problems.push(`als: ${dupes.size} id(s) shared between tracks — Live calls that an invalid pointee id (${[...dupes].slice(0, 4).join(", ")})`);
    if (ids.some(x => x.id === 0)) problems.push("als: a track object claims Id 0");
    if (ids.length < 200) problems.push(`als: only ${ids.length} ids across the tracks — the mixers and controllers are not being written`);
    const npi = Number((xml.match(/<NextPointeeId Value="(\d+)" \/>/) || [])[1]);
    if (!npi) problems.push("als: no NextPointeeId");
    else {
      const all = [...xml.matchAll(/<([A-Za-z][\w.]*)((?:[^>"]|"[^"]*")*?\s)Id="(\d+)"/g)]
        .filter(m => !LOCAL.includes(m[1])).map(m => Number(m[3]));
      const over = all.filter(id => id >= npi);
      if (over.length) problems.push(`als: ${over.length} id(s) at or above NextPointeeId ${npi} (max ${Math.max(...all)})`);
      if (npi <= 1000) problems.push("als: NextPointeeId has to clear 1000");
    }
  }
  /* Live keeps an arrangement clip in two places — the take lane and the arranger automation — and
     writes the same clip into both. One copy is a clip that shows on the timeline and vanishes from
     the take lane, so the count is two per track, and the notes are written twice with it. */
  if ((xml.match(/<MidiClip /g) || []).length !== 4)
    problems.push(`als: ${(xml.match(/<MidiClip /g) || []).length} clips, expected one per track in each of the take lane and the arranger`);
  if ((xml.match(/<MidiNoteEvent /g) || []).length !== 8) problems.push("als: wrong number of notes");
  if (!/<MidiKey Value="60" \/>/.test(xml) || !/<MidiKey Value="36" \/>/.test(xml))
    problems.push("als: notes are not grouped into a KeyTrack per pitch, which is how Live stores them");
  if (!/Duration="4"/.test(xml)) problems.push("als: note durations are not in beats");
  // note ids are the clip's own counter and NoteIdGenerator has to sit above the highest of them
  {
    const clip = xml.slice(xml.indexOf("<MidiClip "), xml.indexOf("</MidiClip>"));
    const noteIds = [...clip.matchAll(/NoteId="(\d+)"/g)].map(m => Number(m[1]));
    const next = Number((clip.match(/<NoteIdGenerator><NextId Value="(\d+)" \/>/) || [])[1]);
    if (!noteIds.length) problems.push("als: notes have no note ids");
    if (new Set(noteIds).size !== noteIds.length) problems.push("als: a note id is used twice in one clip");
    if (noteIds.includes(0)) problems.push("als: a note claims id 0");
    if (!(next > Math.max(...noteIds))) problems.push(`als: NoteIdGenerator ${next} does not clear the note ids`);
  }
  /* A time signature is one number: the denominator's place in 1,2,4,8,16,32 times 99, plus the
     numerator less one. 4/4 is 201 — the value a scene in the reference set carries — and getting
     it wrong hands Live a song in 1/16. The clip carries the meter spelled out as a fraction. */
  if (!/<Manual Value="201" \/>/.test(xml)) problems.push("als: 4/4 did not reach the main track as Live's 201");
  if (!M.alsXml({ ...spec, tsNum: 6, tsDen: 8 }).includes('<Manual Value="302" />'))
    problems.push("als: 6/8 is not encoded the way Live spells it");
  if (!/<Numerator Value="4" \/><Denominator Value="4" \/>/.test(xml))
    problems.push("als: the clip did not get the song's meter");
  if (!/<Manual Value="128" \/>/.test(xml)) problems.push("als: the tempo did not reach the main track");
  if ((xml.match(/<Locator Id=/g) || []).length !== 2) problems.push("als: the section locators are missing");
  /* The template ships MainTrack envelopes for tempo and time signature holding the reference
     set's values (100 bpm, 4/4). Live reads the envelope when one exists, so both must follow the
     song or every export opens at 100 whatever the Manual says. */
  {
    const main = xml.slice(xml.indexOf("<MainTrack"), xml.indexOf("</MainTrack>"));
    const tempoTgt = (main.match(/<Tempo>[\s\S]*?AutomationTarget Id="(\d+)"/) || [])[1];
    const tsTgt = (main.match(/<TimeSignature>[\s\S]*?AutomationTarget Id="(\d+)"/) || [])[1];
    const envOf = tgt => (main.match(new RegExp(
      `<PointeeId Value="${tgt}" /></EnvelopeTarget><Automation><Events><(?:Float|Enum)Event Id="\\d+" Time="-63072000" Value="([-\\d.]+)"`)) || [])[1];
    if (envOf(tempoTgt) !== "128") problems.push(`als: the tempo envelope still says ${envOf(tempoTgt)} — Live will open at the reference set's tempo`);
    if (envOf(tsTgt) !== "201") problems.push(`als: the meter envelope still says ${envOf(tsTgt)} — Live will open in the reference set's meter`);
    const m68 = M.alsXml({ ...spec, tsNum: 6, tsDen: 8 });
    const main68 = m68.slice(m68.indexOf("<MainTrack"), m68.indexOf("</MainTrack>"));
    if (!main68.includes(`<PointeeId Value="${tsTgt}" /></EnvelopeTarget><Automation><Events><EnumEvent Id="0" Time="-63072000" Value="302"`))
      problems.push("als: 6/8 did not reach the meter envelope");
  }
  /* A drawn Level lane arrives as master-volume automation: an envelope on the MainTrack's own
     Volume target, opening with Live's initial-value sentinel at the first point's level, then one
     event per breakpoint at its bar's beat. Without a lane no envelope is added at all. */
  {
    const withAuto = M.alsXml({ ...spec, mainAuto: { level: [{ beat: 0, v: 1 }, { beat: 16, v: 0.35 }, { beat: 24, v: 1 }] } });
    const main = withAuto.slice(withAuto.indexOf("<MainTrack"), withAuto.indexOf("</MainTrack>"));
    const volTgt = (main.match(/<Volume>[\s\S]*?AutomationTarget Id="(\d+)"/) || [])[1];
    const env = main.match(new RegExp(`<AutomationEnvelope Id="\\d+"><EnvelopeTarget><PointeeId Value="${volTgt}" /></EnvelopeTarget><Automation><Events>((?:<FloatEvent [^>]*/>)+)</Events>`));
    if (!env) problems.push("als: a drawn Level lane wrote no volume envelope on the main track");
    else {
      const evs = [...env[1].matchAll(/Time="([-\d.]+)" Value="([\d.]+)"/g)].map(m => [Number(m[1]), Number(m[2])]);
      if (evs.length !== 4) problems.push(`als: the volume envelope has ${evs.length} events for 3 lane points + the sentinel`);
      if (evs[0][0] !== -63072000 || evs[0][1] !== 1) problems.push("als: the volume envelope's sentinel is not the first point's level");
      if (evs[2] && (evs[2][0] !== 16 || evs[2][1] !== 0.35)) problems.push("als: a lane point did not land at its beat and level");
    }
    // well-formed with the envelope in — the insertion must not tear the document
    const stack = [];
    for (const m of withAuto.matchAll(/<(\/?)([A-Za-z][\w.]*)((?:[^>"]|"[^"]*")*?)(\/?)>/g)) {
      const [, close, tag, , self] = m;
      if (close) { if (stack.pop() !== tag) { problems.push(`als: automation broke nesting at </${tag}>`); break; } }
      else if (!self) stack.push(tag);
    }
    const plain = xml.slice(xml.indexOf("<MainTrack"), xml.indexOf("</MainTrack>"));
    if ((plain.match(/<AutomationEnvelope /g) || []).length !== 2)
      problems.push("als: a set with no lane grew or lost a main-track envelope");
    if ((main.match(/<AutomationEnvelope /g) || []).length !== 3)
      problems.push("als: the lane did not join the main track's envelope list");
  }
  // names arrive from the user: every & in the document has to be part of an entity, since one bare
  // ampersand from a section name is a file Live refuses to parse at all
  if (/&(?!(amp|lt|gt|quot|apos);)/.test(xml)) problems.push("als: a bare & reached the document");
  if (!xml.includes("Drums &amp; &lt;bells&gt;")) problems.push("als: a track name with markup in it was not escaped");
  if (!/EffectiveName Value="Chords"/.test(xml)) problems.push("als: track names are missing");
  if (!/Annotation Value="Chorus &amp; drop"/.test(xml) && !/Name Value="Chorus &amp; drop"/.test(xml))
    problems.push("als: a locator name with an ampersand was not escaped");
  // and the file itself is gzip, which is the one thing that makes it a .als rather than XML
  if (typeof CompressionStream === "function") {
    const bytes = await M.alsBytes(spec);
    if (!(bytes instanceof Uint8Array)) problems.push("als: did not produce bytes");
    else {
      if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) problems.push(`als: not gzip (magic ${bytes[0]},${bytes[1]})`);
      if (bytes.length >= xml.length) problems.push("als: gzip made the file bigger");
      // …and it unzips back to exactly the document we wrote
      const back = new Uint8Array(await new Response(new Blob([bytes]).stream()
        .pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
      if (new TextDecoder().decode(back) !== xml) problems.push("als: the gzipped bytes do not decompress to the document");
      console.log(`live set: ${trackXml.length} tracks, ${(xml.match(/<MidiNoteEvent /g) || []).length} notes, `
        + `${scenes} scenes, ${(xml.match(/<Locator Id=/g) || []).length} locators, ${xml.length} chars → ${bytes.length} gzipped bytes`);
    }
  }
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
  if (!METER_BEATS.includes(beats)) problems.push(`pattern ${id}: ${beats} beats per bar, which no time signature uses`);
  // and it must declare a meter the menu knows, or it cannot be filtered into any of them
  if (!M.METER_BY_ID[M.meterOf(p)]) problems.push(`pattern ${id}: unknown meter ${M.meterOf(p)}`);
  if (sub === 4) sixteenth++;
}
for (const [prog, id] of Object.entries(M.PATTERN_DEFAULT))
  if (!M.PATTERNS[id]) problems.push(`PATTERN_DEFAULT[${prog}] → unknown pattern "${id}"`);

/* ---- the writing grid ----
   The melody grid used to *be* the strum pattern's length. Now it is `barBeats × gridSub`, and the
   whole safety of that refactor rests on one identity: with no choice made, those are the same
   number for every pattern in the table. If they ever diverge, every song written before the grid
   became its own control silently re-times itself on load. */
{
  for (const [id, p] of Object.entries(M.PATTERNS)) {
    const derived = M.beatsOf(p) * M.gridSub("", M.subOf(p));
    if (derived !== p.pattern.length)
      problems.push(`pattern ${id}: the default grid is ${derived} columns, the pattern is ${p.pattern.length} — old songs would re-time on load`);
    // and every choice the menu offers must give a whole bar, on every pattern, in every meter
    for (const [val] of M.MEL_GRIDS) {
      const sub = M.gridSub(val, M.subOf(p)), cols = M.beatsOf(p) * sub;
      if (!Number.isInteger(cols) || cols < 1) problems.push(`pattern ${id} at grid "${val}": ${cols} columns`);
      if (cols % sub !== 0) problems.push(`pattern ${id} at grid "${val}": ${cols} columns is not ${sub} a beat`);
      if (M.qbeats(cols, sub).length !== M.beatsOf(p))
        problems.push(`pattern ${id} at grid "${val}": ${M.qbeats(cols, sub).length} beat positions in a ${M.beatsOf(p)}-beat bar`);
    }
  }
  if (M.MEL_GRIDS[0][0] !== "") problems.push("MEL_GRIDS: the first option must be the follow-the-rhythm default");
  if (M.MEL_GRIDS.some(([, name, tip]) => !name || !tip)) problems.push("MEL_GRIDS: every option needs a name and a tip");
  // switching the grid is only safe because a note keeps the moment it sounds at, not its column
  const bar = [[0], [], [], [], [2], [], [], []];                  // beats 1 and 3 on an eighth grid
  const fine = M.rescaleBar(bar, 16);
  if (JSON.stringify(fine[0]) !== "[0]" || JSON.stringify(fine[8]) !== "[2]")
    problems.push("switching to a sixteenth grid moved the notes off their beats");
  const cols = M.MEL_GRIDS.map(([v]) => M.beatsOf(M.PATTERNS.pop) * M.gridSub(v, M.subOf(M.PATTERNS.pop)));
  console.log(`writing grid: ${M.MEL_GRIDS.length} choices (${cols.join("/")} columns a bar on a 4/4 strum), default matches every pattern`);
}
/* ---- time signatures ----
   A meter in the menu with no strum pattern or no kit is a dead end: picking it would leave the
   song silent or unplayable, which is worse than not offering it. */
{
  for (const m of M.METERS) {
    const pats = Object.values(M.PATTERNS).filter(p => M.meterOf(p) === m.id);
    const kits = Object.entries(M.DRUMS).filter(([id, d]) => id !== "off" && M.drumFitsMeter(d, m.id));
    if (!pats.length) problems.push(`meter ${m.id} has no strum pattern — the menu would offer a dead end`);
    if (!kits.length) problems.push(`meter ${m.id} has no drum kit that fits its bar`);
    // every pattern claiming this meter must really be that many beats long
    for (const p of pats) if (M.beatsOf(p) !== m.beats)
      problems.push(`a pattern claims meter ${m.id} but is ${M.beatsOf(p)} beats, not ${m.beats}`);
    // what a DAW is told has to describe the same bar: num/den quarter-notes == beats
    if (m.num * (4 / m.den) !== m.beats)
      problems.push(`meter ${m.id} writes ${m.num}/${m.den} to MIDI, which is ${m.num * (4 / m.den)} beats, not ${m.beats}`);
    if (!Number.isInteger(Math.log2(m.den))) problems.push(`meter ${m.id}: denominator ${m.den} is not a power of two`);
  }
  // 3/4 and 6/8 are the same bar length and deliberately share kits, but must not share a name
  if (new Set(M.METERS.map(m => m.id)).size !== M.METERS.length) problems.push("two meters share an id");
  console.log(`time signatures: ${M.METERS.map(m => m.id).join(", ")} — each with patterns, kits and a matching MIDI signature`);
}

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
  // every contour, on every rhythm cell, at both resolutions — the combination the app can produce
  // every contour × cell × resolution the app can now produce. The last two are only reachable
  // since the writing grid stopped being read off the strum pattern: there is no sixteenth strum
  // in 3/4 or 5/4, so a sixteenth grid there had no way of existing before.
  for (const [B, sub, beats] of [[8, 2, 4], [16, 4, 4], [6, 2, 3], [12, 4, 3], [20, 4, 5]]) {
    for (const r of M.RHYTHMS) {
      const spots = M.rhythmSpots(r.id, B, sub, beats);
      if (!spots.length) { problems.push(`rhythm ${r.id} resolves to nothing at B=${B}`); continue; }
      if (spots.some(x => x.c < 0 || x.c >= B)) problems.push(`rhythm ${r.id} @${B}: a column is off the bar`);
      if (spots.some((x, i) => i && x.c <= spots[i - 1].c)) problems.push(`rhythm ${r.id} @${B}: onsets not ascending`);
      if (spots.some((x, i) => x.c + x.len > (i + 1 < spots.length ? spots[i + 1].c : B)))
        problems.push(`rhythm ${r.id} @${B}: a held note runs into the next onset`);
      const cols = spots.map(x => x.c), lens = spots.map(x => x.len);
      // a counter-melody needs a lead to write against, so give it one shaped like a real part
      const lead = Array.from({ length: 4 }, (_, b) =>
        Array.from({ length: B }, (_, c) => (c % Math.max(2, Math.floor(sub)) === 0 ? [(b + c) % 7] : [])));
      for (const p of M.MELODY_PATTERNS) {
        gens++;
        const ctx = { nBars: 4, B, sub, cols, lens, start: 2, chordDegs, against: p.needs === "lead" ? lead : null };
        let bars; try { bars = p.gen(ctx); }
        catch (e) { problems.push(`melody ${p.id} on ${r.id} @${B} threw: ${e.message}`); continue; }
        checkBars(`melody ${p.id}/${r.id} @${B}`, bars, B, 4);
        if (!bars.some(bar => bar.some(c => c.length))) problems.push(`melody ${p.id} on ${r.id} @${B}: wrote nothing`);
        /* With no lead a counter-melody must write nothing at all rather than inventing a line —
           silence is the honest answer, and the Suggest tab refuses to write one in that state. */
        if (p.needs === "lead") {
          const empty = p.gen({ ...ctx, against: null });
          if (empty.some(bar => bar.some(c => c.length)))
            problems.push(`melody ${p.id}: wrote notes with no lead to write against`);
        }
      }
    }
    for (const nar of M.NARRATIVES) {
      for (const role of ["V", "C", "B"]) {
        gens++;
        const spots = M.rhythmSpots(M.ROLE_RHYTHM[role], B, sub, beats);
        let bars;
        try { bars = nar.gen({ nBars: 4, B, sub, spots, nd: 7, chordDegs, role, pass: 0, passes: 2, idx: 1, total: 4, frac: 0.33 }); }
        catch (e) { problems.push(`narrative ${nar.id} (${role}) @${B} threw: ${e.message}`); continue; }
        checkBars(`narrative ${nar.id}/${role} @${B}`, bars, B, 4);
        if (!bars.some(bar => bar.some(c => c.length))) problems.push(`narrative ${nar.id} (${role}) @${B}: wrote nothing`);
      }
    }
  }
  console.log(`melody generators: ${gens} runs across ${M.RHYTHMS.length} rhythms × 5 grids`);

  /* The basslines bring their own rhythm rather than taking it from the Rhythm menu, so they need
     their own check: each one must actually articulate. Two of the same pitch on adjacent columns
     is how the grid stores a *tie*, so a pattern that fills every column is one held note however
     many "notes" it thinks it wrote — which is exactly how "driving eighths" first came out as a
     whole note on an eighth grid. */
  {
    const noteCount = bar => {
      let n = 0;
      for (let i = 0; i < bar.length; i++) {
        const d = bar[i][0];
        if (d == null) continue;
        const prev = bar[i - 1] && bar[i - 1][0];
        if (i === 0 || prev !== d) n++;
      }
      return n;
    };
    const basses = M.MELODY_PATTERNS.filter(p => /^bass/.test(p.id));
    if (basses.length < 5) problems.push(`only ${basses.length} bassline patterns`);
    for (const p of basses) {
      for (const [B, sub, meter] of [[8, 2, "4/4 eighths"], [16, 4, "4/4 sixteenths"], [6, 2, "3/4"]]) {
        const bars = p.gen({ nBars: 2, B, sub, start: 0, cols: [0, 2, 4, 6], lens: [1, 1, 1, 1], chordDegs: [0, 3] });
        if (bars.length !== 2 || bars.some(b => b.length !== B)) { problems.push(`${p.id} on ${meter}: wrong shape`); continue; }
        for (const bar of bars) {
          for (const c of bar) for (const d of c)
            if (!Number.isInteger(d) || d < 0 || d > 6) problems.push(`${p.id} on ${meter}: degree ${d} out of range`);
          // "root on the one" is meant to be one held note; everything else has to move
          const n = noteCount(bar);
          if (p.id !== "bassRoot" && n < 2) problems.push(`${p.id} on ${meter}: ${n} note per bar — it fills every column, so it reads as one tied note`);
        }
        // and it has to follow the harmony, not sit on one degree through a chord change
        if (p.id !== "bassRoot" && bars[0].some(c => c.length) && bars[1].some(c => c.length)) {
          const first = bars[0].find(c => c.length)[0], second = bars[1].find(c => c.length)[0];
          if (first === second) problems.push(`${p.id} on ${meter}: does not follow the chord change`);
        }
      }
    }
    console.log(`basslines: ${basses.length} patterns × 3 meters, all articulating and following the chords`);
  }

  /* Counter-melodies claim a musical relationship to the lead, not just "some notes". A third below
     has to actually be a third below, contrary motion has to actually move the other way, and the
     answering line has to stay out of the lead's way. */
  {
    const B = 8;
    // a lead that rises, so contrary motion has something to contradict
    const lead = [[[0], [], [2], [], [4], [], [], []]];
    const u = { nBars: 1, B, sub: 2, start: 0, cols: [0, 2, 4, 6], lens: [1, 1, 1, 1], chordDegs: [0], against: lead };
    const at = (bars, c) => (bars[0][c] || [])[0];
    const wrap = d => ((d % 7) + 7) % 7;
    const byId = id => M.MELODY_PATTERNS.find(p => p.id === id);

    const third = byId("ctrThird").gen(u);
    for (const c of [0, 2, 4])
      if (at(third, c) !== wrap(at(lead, c) - 2))
        problems.push(`ctrThird at column ${c} wrote ${at(third, c)}, expected a third under ${at(lead, c)}`);
    const sixth = byId("ctrSixth").gen(u);
    for (const c of [0, 2, 4])
      if (at(sixth, c) !== wrap(at(lead, c) - 5))
        problems.push(`ctrSixth at column ${c} is not a sixth under the lead`);

    /* Contrary motion: the lead climbs, so the counter must descend. Tested on a lead high in the
       octave on purpose — every degree is wrapped back into the grid's single octave, so a lead
       starting at 0 sends its mirror below zero and round to the top, and the direction of the
       wrapped numbers then says nothing. A lead of 4,5,6 mirrors to 2,1,0 without wrapping. */
    const hiLead = [[[], [], [], [], [4], [], [5], [6]]];
    const contra = byId("ctrContrary").gen({ ...u, against: hiLead });
    const line = [4, 6, 7].map(c => at(contra, c));
    const leadLine = [4, 6, 7].map(c => at(hiLead, c));
    if (line.some(d => d == null)) problems.push(`ctrContrary missed the lead's onsets: ${line.join(",")}`);
    else {
      const dir = a => Math.sign(a[a.length - 1] - a[0]);
      if (dir(line) === dir(leadLine) || dir(line) === 0)
        problems.push(`ctrContrary moved ${line.join(">")} against a lead of ${leadLine.join(">")} — not contrary`);
    }

    // the answering line must not sound where the lead already is
    const fill = byId("ctrFill").gen(u);
    for (let c = 0; c < B; c++)
      if ((fill[0][c] || []).length && (lead[0][c] || []).length)
        problems.push(`ctrFill put a note at column ${c}, where the lead is already playing`);
    if (!fill[0].some(c => c.length)) problems.push("ctrFill wrote nothing into the lead's gaps");
    console.log(`counter-melodies: ${M.MELODY_PATTERNS.filter(p => p.needs === "lead").length} patterns, each checked against the lead it answers`);
  }

  // the motif narratives have to actually restate one idea, not just share a name
  {
    const shape = role => {
      const nar = M.NARRATIVES.find(n => n.id === "motif");
      const bars = nar.gen({ nBars: 2, B: 8, sub: 2, nd: 7, chordDegs: [0, 0], role,
        pass: 0, passes: 1, idx: 0, total: 4, frac: 0.2, spots: null, start: 0 });
      const notes = [];
      bars.forEach(bar => bar.forEach((c, i) => { if (c.length && (!bar[i - 1] || bar[i - 1][0] !== c[0])) notes.push(c[0]); }));
      return notes.slice(0, 4).map((d, i, a) => d - a[0]);      // the shape, not the pitch
    };
    const verse = shape("V"), chorus = shape("C"), bridge = shape("B");
    if (!verse.length) problems.push("the motif narrative wrote nothing");
    // a chorus is the same idea sung higher, so the interval shape has to survive the lift
    if (verse.join() !== chorus.join())
      problems.push(`the motif changed shape between verse (${verse.join()}) and chorus (${chorus.join()}) — it is meant to be the same idea`);
    // and a bridge inverts it, so the shape must be the mirror rather than the same
    if (bridge.join() === verse.join())
      problems.push("the motif is not transformed in a bridge — it should be inverted");
    console.log(`motif: shape ${verse.join(",")} held from verse to chorus, mirrored to ${bridge.join(",")} in a bridge`);
  }

  // the point of the whole feature: a non-straight rhythm must not land everything on the beat
  const onBeatFraction = bars => {
    let on = 0, all = 0;
    bars.forEach(bar => bar.forEach((c, i) => { if (!c.length) return; if (i === 0 || bar[i - 1].length === 0) { all++; if (i % 2 === 0) on++; } }));
    return all ? on / all : 1;
  };
  const straightSpots = M.rhythmSpots("straight", 8, 2, 4);
  const offSpots = M.rhythmSpots("offbeat", 8, 2, 4);
  const gen = sp => M.MELODY_PATTERNS[0].gen({ nBars: 4, B: 8, sub: 2,
    cols: sp.map(x => x.c), lens: sp.map(x => x.len), start: 2, chordDegs });
  const straightOn = onBeatFraction(gen(straightSpots)), offOn = onBeatFraction(gen(offSpots));
  console.log(`onsets on the beat: straight ${(straightOn * 100).toFixed(0)}%, off-beat cell ${(offOn * 100).toFixed(0)}%`);
  if (straightOn < 0.99) problems.push("the straight cell should put every onset on a beat");
  if (offOn > 0.01) problems.push(`the off-beat cell still lands ${(offOn * 100).toFixed(0)}% of onsets on the beat`);
  // and note lengths must actually vary now
  const lens = new Set(M.rhythmSpots("longshort", 8, 2, 4).map(x => x.len));
  if (lens.size < 2) problems.push("long–short produced only one note length");
  console.log(`note lengths in long–short: ${[...lens].sort().join(", ")} columns`);
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

/* ---- section moves: sweeps land on the section boundary and never ramp through zero ---- */
{
  const DUR = 8;            // an 8-second section
  for (const [id, mv] of Object.entries(M.MOVES)) {
    nodes.length = 0;
    const dest = baseNode("dest");
    const filt = ctx.createBiquadFilter();
    const hpf = ctx.createBiquadFilter();
    const before = problems.length;
    try { M.applyMove(ctx, filt, hpf, mv.spec, 3, DUR, noise, dest); }
    catch (e) { problems.push(`move ${id} threw: ${e.message}`); continue; }
    const evs = filt.frequency._events;
    if (!evs.length) { problems.push(`move ${id}: scheduled nothing on the filter`); continue; }
    // no cutoff may be <= 0 (exponential ramps throw) or above Nyquist at 44.1k
    for (const e of evs) {
      if (e.kind === "cancel") continue;
      if (!(e.v > 0)) problems.push(`move ${id}: cutoff ${e.v} Hz is not positive`);
      if (e.v > 22050) problems.push(`move ${id}: cutoff ${e.v} Hz is above Nyquist`);
      if (e.t < 3 - 1e-9 || e.t > 3 + DUR + 1e-9) problems.push(`move ${id}: event at ${e.t}s is outside the section (3..${3 + DUR})`);
    }
    /* The paired high-pass: swept when the move asks, and put back to rest (20 Hz) when it
       doesn't — every move must write it, or a telephone section would thin the section after it. */
    const hevs = hpf.frequency._events.filter(e => e.kind !== "cancel");
    if (!hevs.length) problems.push(`move ${id}: never touches the high-pass — the previous move's thinning would leak into this section`);
    for (const e of hevs) {
      if (!(e.v > 0)) problems.push(`move ${id}: high-pass ${e.v} Hz is not positive`);
      if (e.v > 22050) problems.push(`move ${id}: high-pass ${e.v} Hz is above Nyquist`);
      if (e.t < 3 - 1e-9 || e.t > 3 + DUR + 1e-9) problems.push(`move ${id}: high-pass event at ${e.t}s is outside the section (3..${3 + DUR})`);
    }
    const hlast = hevs[hevs.length - 1];
    const hWant = mv.spec && mv.spec.hp ? mv.spec.hp.to : 20;
    if (hlast && Math.abs(hlast.v - hWant) > 1) problems.push(`move ${id}: high-pass ends at ${hlast.v} Hz, want ${hWant}`);
    // a move with a sweep must actually end where it says
    const spec = mv.spec;
    if (spec && !spec.peak && spec.to !== spec.from) {
      const last = evs.filter(e => e.kind !== "cancel").pop();
      if (Math.abs(last.v - spec.to) > 1) problems.push(`move ${id}: ends at ${last.v} Hz, want ${spec.to}`);
      if (Math.abs(last.t - (3 + DUR)) > 1e-6) problems.push(`move ${id}: sweep ends at ${last.t}s, want the section boundary ${3 + DUR}s`);
    }
    // the riser and impact must start and stop inside the section
    const srcs = nodes.filter(n => n._kind === "buf" || n._kind === "osc");
    for (const s of srcs) {
      if (!s._started) problems.push(`move ${id}: unstarted ${s._kind}`);
      if (s._t1 == null) problems.push(`move ${id}: a ${s._kind} never stops`);
      if (s._kind === "buf" && !s.loop && s._t1 - s._t0 > noiseDur + 1e-9)
        problems.push(`move ${id}: noise rings past its buffer without looping`);
    }
    if (spec && spec.riser && !srcs.length) problems.push(`move ${id}: riser scheduled no sound`);
    if (spec && spec.impact && srcs.length < 2) problems.push(`move ${id}: impact should be a boom plus a crash`);
    if (problems.length === before)
      console.log(`move ${id.padEnd(7) || "(none)"} → ${evs.filter(e => e.kind !== "cancel").map(e => Math.round(e.v)).join(" → ")} Hz${spec && spec.hp ? ` · hp ${spec.hp.from} → ${spec.hp.to}` : ""}${spec && spec.riser ? " + riser" : ""}${spec && spec.impact ? " + impact" : ""}`);
  }
  // a very short section must still keep its riser inside the section
  nodes.length = 0;
  const dest = baseNode("dest");
  const filt2 = ctx.createBiquadFilter();
  M.applyMove(ctx, filt2, ctx.createBiquadFilter(), M.MOVES.riser.spec, 0, 1.2, noise, dest);
  for (const s of nodes.filter(n => n._kind === "buf")) {
    if (s._t0 < -1e-9) problems.push(`short section: riser starts before the section (${s._t0}s)`);
    if (s._t0 > 1.2) problems.push(`short section: riser starts after the section ends`);
  }
  console.log(`moves: ${Object.keys(M.MOVES).length} checked, including a 1.2s section`);
}

/* ---- transitions: every preset lands on the boundary and puts the mix back where it found it ----
   A transition writes to nodes the whole song plays through, so the failure that matters is not a
   wrong sound — it is a filter left shut or a gain left at zero, which silences everything after
   the seam. Every preset is therefore run and then checked for what it *left behind*. */
{
  const BEAT = 0.5, TB = 20;                    // 120bpm, a boundary 20 seconds in
  const REST = { lp: null, hp: 20, gain: 1, wash: 0, echo: 0 };   // where each parameter must end up
  const cats = new Set(M.TRANS_CATS.map(c => c[0]));
  let checked = 0, prims = new Set();
  for (const [id, T] of Object.entries(M.TRANS)) {
    if (!id) { if (T.fx.length) problems.push("transition: the empty id must schedule nothing"); continue; }
    if (!cats.has(T.cat)) { problems.push(`transition ${id}: unknown family "${T.cat}"`); continue; }
    if (!T.name) problems.push(`transition ${id}: no name`);
    // no two primitives may write the same shared parameter — the second cancel eats the first
    const owns = M.transOwns(T);
    const dup = owns.find((p, i) => owns.indexOf(p) !== i);
    if (dup) problems.push(`transition ${id}: two primitives both write \`${dup}\``);
    for (const [k] of T.fx) { if (!M.TFX[k]) problems.push(`transition ${id}: no such primitive "${k}"`); prims.add(k); }

    nodes.length = 0;
    const dest = baseNode("dest");
    const tn = M.makeTrans(ctx, dest, BEAT, false);
    const built = nodes.length;
    const before = problems.length;
    try { M.applyTrans(tn, T, TB, { ctx, beat: BEAT, noise, kit: "acoustic", maxPre: 64, maxPost: 64 }); }
    catch (e) { problems.push(`transition ${id} threw: ${e.message}`); continue; }

    // the window it was allowed: its declared lead-in, and its tail plus the ~1.4s a crash rings
    const lo = TB - T.pre * BEAT - 1e-6, hi = TB + T.post * BEAT + 1.4 + 1e-6;
    const params = [["lp", tn.lp.frequency], ["hp", tn.hp.frequency], ["gain", tn.gain.gain],
                    ["wash", tn.wash.gain], ["echo", tn.echo.gain]];
    for (const [pname, p] of params) {
      const evs = p._events.filter(e => e.kind !== "cancel");
      if (!evs.length) continue;
      if (!owns.includes(pname)) problems.push(`transition ${id}: wrote \`${pname}\` without declaring it`);
      for (const e of evs) {
        if (e.t < lo || e.t > hi) problems.push(`transition ${id}: ${pname} event at ${e.t}s is outside its window (${lo.toFixed(2)}..${hi.toFixed(2)})`);
        if (pname === "lp" || pname === "hp") {
          if (!(e.v > 0)) problems.push(`transition ${id}: ${pname} cutoff ${e.v} Hz is not positive`);
          if (e.v > 22050) problems.push(`transition ${id}: ${pname} cutoff ${e.v} Hz is above Nyquist`);
        }
      }
      // …and hands the mix back: a filter left shut or a gain left down silences the rest of the song
      const end = evs[evs.length - 1];
      const rest = pname === "lp" ? Math.min(M.FILTER_OPEN, ctx.sampleRate / 2 - 100) : REST[pname];
      if (Math.abs(end.v - rest) > 0.5)
        problems.push(`transition ${id}: leaves \`${pname}\` at ${end.v} instead of ${rest} — everything after the seam stays that way`);
      // 5 ms of slack for the snap back to rest: a preset with no tail restores its parameter just
      // after the downbeat rather than exactly on it, so the ramp *to* the downbeat still lands
      if (end.t > TB + T.post * BEAT + 0.005)
        problems.push(`transition ${id}: still writing \`${pname}\` at ${end.t}s, past its declared window`);
    }
    // one-shots: started, stopped, and routed to the fx bus rather than straight at the mix
    const srcs = nodes.slice(built).filter(n => n._kind === "buf" || n._kind === "osc");
    const reaches = (n, target, seen = new Set()) => n === target
      || (!seen.has(n) && (seen.add(n), (n._conns || []).some(c => reaches(c, target, seen))));
    for (const s of srcs) {
      if (!s._started) problems.push(`transition ${id}: unstarted ${s._kind}`);
      if (s._t1 == null) problems.push(`transition ${id}: a ${s._kind} never stops`);
      if (s._kind === "buf" && !s.loop && s._t1 - s._t0 > noiseDur + 1e-9)
        problems.push(`transition ${id}: noise rings past its buffer without looping`);
      if (s._t0 < lo) problems.push(`transition ${id}: a ${s._kind} starts at ${s._t0}s, before its lead-in`);
      if (!reaches(s, tn.fx)) problems.push(`transition ${id}: a ${s._kind} bypasses the fx bus — it would land in every stem`);
    }
    if (problems.length === before) { checked++; console.log(`trans ${id.padEnd(10)} ${T.cat.padEnd(5)} ${(-T.pre).toString().padStart(4)}…+${T.post} beats · ${T.fx.map(f => f[0]).join(" + ")}`); }
  }
  // every primitive in the table is reachable from a preset, and every preset's primitive exists
  for (const k of Object.keys(M.TFX)) if (!prims.has(k)) problems.push(`primitive ${k} is in no preset — unreachable content`);
  // a lead-in longer than the section before it must shorten, not reach back into a section that
  // has already played: with one beat of room, nothing may be scheduled earlier than one beat back
  for (const id of ["rise4", "fulldrop", "roll2", "revcym2"]) {
    nodes.length = 0;
    const dest = baseNode("dest");
    const tn = M.makeTrans(ctx, dest, BEAT, false);
    const built = nodes.length;
    M.applyTrans(tn, M.TRANS[id], 1, { ctx, beat: BEAT, noise, kit: "909", maxPre: 1, maxPost: 1 });
    for (const s of nodes.slice(built).filter(n => n._kind === "buf" || n._kind === "osc"))
      if (s._t0 < 1 - BEAT - 1e-6) problems.push(`transition ${id}: clamped to one beat but a ${s._kind} starts ${(1 - s._t0).toFixed(2)}s early`);
    for (const p of [tn.lp.frequency, tn.hp.frequency, tn.gain.gain])
      for (const e of p._events) if (e.t < 1 - BEAT - 1e-6 && e.kind !== "cancel")
        problems.push(`transition ${id}: clamped to one beat but writes at ${e.t}s`);
  }
  /* With no room at all — the first section of a song — every preset must still be safe to fire:
     nothing scheduled before the boundary, nothing left holding a parameter down, and whatever
     happens *on* the downbeat still happening. */
  {
    let landed = 0;
    for (const [id, T] of Object.entries(M.TRANS)) {
      if (!id) continue;
      nodes.length = 0;
      const dest = baseNode("dest");
      const tn = M.makeTrans(ctx, dest, BEAT, false);
      const built = nodes.length;
      try { M.applyTrans(tn, T, 5, { ctx, beat: BEAT, noise, kit: "acoustic", maxPre: 0, maxPost: 0 }); }
      catch (e) { problems.push(`transition ${id} threw with no room: ${e.message}`); continue; }
      for (const s of nodes.slice(built).filter(n => n._kind === "buf" || n._kind === "osc"))
        if (s._t0 < 5 - 1e-9) problems.push(`transition ${id}: with no lead-in a ${s._kind} still starts ${(5 - s._t0).toFixed(2)}s early`);
      for (const [pname, p] of [["lp", tn.lp.frequency], ["hp", tn.hp.frequency], ["gain", tn.gain.gain],
                                ["wash", tn.wash.gain], ["echo", tn.echo.gain]]) {
        const evs = p._events.filter(e => e.kind !== "cancel");
        if (!evs.length) continue;
        if (evs.some(e => e.t < 5 - 1e-9)) problems.push(`transition ${id}: with no lead-in it still writes \`${pname}\` before the boundary`);
        const rest = pname === "lp" ? Math.min(M.FILTER_OPEN, ctx.sampleRate / 2 - 100) : REST[pname];
        if (Math.abs(evs[evs.length - 1].v - rest) > 0.5)
          problems.push(`transition ${id}: with no room it leaves \`${pname}\` at ${evs[evs.length - 1].v}`);
      }
      if (nodes.slice(built).some(n => n._kind === "buf" || n._kind === "osc")) landed++;
    }
    // the impacts are the ones that must survive it — a crash is anchored to the downbeat, not to a lead-in
    if (landed < Object.values(M.TRANS).filter(T => T.cat === "hit").length)
      problems.push(`transitions: only ${landed} presets still make a sound on a first section — every impact should`);
  }
  // the fx bus is what keeps risers and crashes out of every stem but their own
  {
    const dest = baseNode("dest");
    if (M.makeTrans(ctx, dest, BEAT, true).fx.gain.value !== 0)
      problems.push("makeTrans: a stem render must silence the fx bus, or every stem carries its own copy of each riser");
  }
  const byCat = M.TRANS_CATS.map(([c, n]) => `${n} ${Object.values(M.TRANS).filter(T => T.cat === c).length}`).join(", ");
  console.log(`transitions: ${checked} presets across ${M.TRANS_CATS.length} families (${byCat}), ${Object.keys(M.TFX).length} primitives`);
}

/* ---- no leftovers of the pre-parts section shape ----
   A section is `{ ids, layers:[{bars, flat, instr}] }`. The old shape put bars/flat/instr on the
   section itself with a barsB/flatB/instrB twin. A single missed fallback of the old shape blanks
   the whole UI at render time (`undefined.some(...)`), and no amount of audio testing catches it,
   so guard the source directly. */
{
  const bad = [
    [/\bbarsB\b/, "barsB (parts are a list now)"],
    [/\binstrB\b/, "instrB (parts are a list now)"],
    [/\bflatB\b/, "flatB (parts are a list now)"],
    [/\|\|\s*\{\s*flat\s*:\s*\[\s*\]\s*\}(?!\s*\)\.flat\.length)/, "a `|| { flat: [] }` section fallback"],
    [/secMelos\[[^\]]+\]\s*\|\|\s*\{\s*flat/, "a secMelos fallback using the old flat shape"],
  ];
  const lines = code.split("\n");
  for (const [re, what] of bad) {
    lines.forEach((ln, i) => {
      if (re.test(ln)) problems.push(`src line ${i + 1}: ${what} — ${ln.trim().slice(0, 80)}`);
    });
  }
  // and every section-shaped read in the render path should go through the helpers
  const strayFlat = lines.filter(ln => /\bsec\.flat\b|\bsec\.bars\b|\bsecm\.bars\b/.test(ln));
  strayFlat.forEach(ln => problems.push(`src: section read bypasses layers — ${ln.trim().slice(0, 80)}`));
  /* Writing several sections in one handler has to go through `setLayerPropMany`. `putSec` (and so
     `setLayerProp`) spreads the `melos` value from the current render, so calling it in a loop makes
     each write clobber the last and only the final section actually changes — a bug that shows up
     as "I muted a ×4 run and only one pass went quiet". */
  // look back from each call site rather than trying to parse the loop — a nested `setLayerProp(`
  // inside the loop head defeats any regex that tries to match the parentheses
  {
    const src = code.replace(/setLayerPropMany\(/g, "setLayerPropBULK(");
    for (const mm of src.matchAll(/setLayerProp\(/g)) {
      const before = src.slice(Math.max(0, mm.index - 160), mm.index);
      if (/\.forEach\s*\(|\.map\s*\(|\bfor\s*\(/.test(before) && !/const setLayerProp/.test(before))
        problems.push("src: setLayerProp is called inside a loop — use setLayerPropMany, or every write but the last is dropped");
    }
  }
  if (!/const setLayerPropMany = /.test(code))
    problems.push("src: setLayerPropMany has gone — multi-section writes need a single state update");
  /* A narrative rewrites part A's notes and nothing else. Rebuilding the other parts from their bars
     and instrument alone silently drops every field cloneLayer carries — register, level, mute, solo,
     send, effects — so choosing a narrative wiped the mix. Rebuilds go through cloneLayer. */
  {
    const fn = code.slice(code.indexOf("const applyNarrative ="), code.indexOf("const undoNarrative ="));
    if (!fn) problems.push("src: applyNarrative has moved — this guard no longer reads it");
    if (!/cloneLayer/.test(fn))
      problems.push("src: applyNarrative rebuilds parts without cloneLayer — it will reset registers, levels and mutes");
    // cloneLayer copies the bars itself, so a dupBars call here means a hand-rolled partial copy
    if (/dupBars\(/.test(fn))
      problems.push("src: applyNarrative copies a part's bars by hand — go through cloneLayer, or the other fields are dropped");
    if (!/varyBars\(/.test(fn))
      problems.push("src: applyNarrative no longer varies repeats — every pass of a section will be identical");
    /* The narrative's phrasing dials: syncopation lands on the generated line BEFORE the repeats
       are varied (pass 0 has to lean the same way the others do), and the within-section pass is
       optional but has to exist — the one-bar riff said four times is the other kind of identical. */
    if (!/syncopateBars\(/.test(fn))
      problems.push("src: applyNarrative cannot syncopate — the narrative's syncopation option has gone");
    if (!/varyWithin\(/.test(fn))
      problems.push("src: applyNarrative cannot vary within a section — the within-repeats option has gone");
    if (fn.includes("syncopateBars(") && fn.indexOf("syncopateBars(") > fn.indexOf("varyBars("))
      problems.push("src: applyNarrative syncopates after varying — pass 0 would stay square while the repeats lean");
  }
  /* A section's own narrative has to be handed the same position in the song the song-wide write
     would have handed it — which pass of its kind it is, and where it sits in the running order.
     Written without those, a section rewritten on its own comes out as if it were the opening bar:
     wrong register, wrong density, and identical to every other pass of the same section. */
  {
    const fn = code.slice(code.indexOf("const applySecNarrative ="), code.indexOf("const undoNarrative ="));
    if (!fn) problems.push("src: applySecNarrative has moved — this guard no longer reads it");
    for (const arg of ["pass", "passes", "idx", "total", "frac", "role"])
      if (!new RegExp("\\b" + arg + "\\s*[:,]").test(fn))
        problems.push(`src: applySecNarrative does not pass \`${arg}\` — the section will be written as if it were somewhere else in the song`);
    // and they have to be *worked out*, not written in. Handing the generator a constant position
    // passes the check above and still writes every pass of a section identically.
    const literal = fn.match(/\b(pass|passes|idx|total)\s*:\s*-?\d/);
    if (literal) problems.push(`src: applySecNarrative hard-codes ${literal[1]} — every section would be written as if it were in the same place`);
    if (!/sections\.insts/.test(fn) || !/findIndex/.test(fn))
      problems.push("src: applySecNarrative does not work out where the section sits from the running order");
    if (!/varyBars\(/.test(fn)) problems.push("src: applySecNarrative does not vary repeats");
    // a section rewritten on its own goes through the same three dials as the song-wide write —
    // syncopation, the pass's variation, the drift inside the section — or the two paths diverge
    if (!/syncopateBars\(/.test(fn)) problems.push("src: applySecNarrative does not syncopate like the song-wide write");
    if (!/varyWithin\(/.test(fn)) problems.push("src: applySecNarrative does not vary within the section like the song-wide write");
  }
  /* Start from scratch: the Write page's bottom exit. It has to ask first (a one-tap wipe beside
     ordinary buttons is a trap), reset the melodies (the state a half-reset most easily forgets),
     and actually be on the page. */
  {
    if (!/const startFresh = /.test(code)) problems.push("src: startFresh has gone — the Write page's start-from-scratch button has nothing to call");
    const fn = code.slice(code.indexOf("const startFresh ="), code.indexOf("/* ---- svg pieces ----"));
    if (!/confirm\(/.test(fn)) problems.push("src: startFresh wipes the song without asking");
    for (const call of ["setMelos", "setEdits", "setSecBeat", "setSketchArr", "setNarSel", "setTrackFx"])
      if (!new RegExp(call + "\\(").test(fn)) problems.push(`src: startFresh does not reset ${call} — the fresh page would keep part of the old song`);
    if (!/startFresh}/.test(code) && !/onClick=\{startFresh\}/.test(code))
      problems.push("src: nothing on the page calls startFresh");
  }
  /* The variation dial is a continuous slider, not a menu: a range input wired to varySt, applied
     on release. And the narrative row carries its other two dials — syncopation and within-repeats. */
  {
    if (!/type="range"[\s\S]{0,200}?VARY_MAX/.test(code) && !/max=\{VARY_MAX\}/.test(code))
      problems.push("src: the vary-repeats control is no longer a continuous slider");
    if (!/SYNC_LEVELS\.map/.test(code)) problems.push("src: the narrative row lost its syncopation menu");
    if (!/narInSt|vary within/.test(code)) problems.push("src: the narrative row lost its within-repeats option");
  }
  /* In-section variation is an *amount*, not a ratchet. Every press has to re-derive the variations
     from the melody as it stood before the first one — vary the grid that is already varied and the
     edits compound, so the third press has left the motif behind entirely and there is no way back
     to it. The baseline is only trusted while the grid still holds what was last written from it, so
     a note drawn by hand between presses starts the count again rather than being varied away. */
  {
    const fn = code.slice(code.indexOf("const varyRepeats ="), code.indexOf("const resetVaryIn ="));
    if (!fn) problems.push("src: varyRepeats has moved — this guard no longer reads it");
    if (!/varyWithin\(/.test(fn)) problems.push("src: varyRepeats does not call varyWithin");
    if (!/st\.base/.test(fn))
      problems.push("src: varyRepeats varies the current grid rather than the melody it started from — presses would compound");
    if (!/melKey\(cur\)\s*!==\s*st\.grid/.test(fn))
      problems.push("src: varyRepeats trusts its counter over the notes on the grid — an edit or an undo between presses would be varied as if it were the original");
    if (!/putLayer\(/.test(fn)) problems.push("src: varyRepeats never writes the varied melody back");
    // and it is reachable: a variation engine nothing calls is not a feature
    if (!/varyRepeats\(d, secL\)/.test(code))
      problems.push("src: nothing in the melody grid offers to vary a section's repeats");
  }
  /* Moves are per section instance, with the section type as the fallback — songs saved before that
     only carry the type key, so dropping the fallback silently strips the moves off every song
     anyone has already made. Both the resolution and the run arithmetic live in the `moveSpan`
     memo; the scheduler only reads the spans it produces, and must not fire a move on a pass in the
     middle of one or an eight-bar build restarts its climb halfway up. */
  {
    const span = code.slice(code.indexOf("const moveSpan = useMemo("), code.indexOf("moveRef.current = {"));
    if (!/secMove\[d\.key\]/.test(span)) problems.push("src: a section instance's own move is not resolved");
    if (!/secMove\[d\.base\]/.test(span)) problems.push("src: no section-type fallback — moves saved before they were per-instance are lost");
    if (!/head\.row === d\.row/.test(span))
      problems.push("src: consecutive passes of one row are not joined into a single move — a build written as ×4 would sweep four times");
    const tick = code.slice(code.indexOf("// section moves: fire once"), code.indexOf("const dstep ="));
    if (!/moveRef\.current\.span\[b\.inst\]/.test(tick))
      problems.push("src: playback does not read the move spans — it is firing per pass again");
    // the move's riser and impact are added sources: on the master they land in every stem
    if (!/applyMove\([\s\S]*?m\.tn\.fx\)/.test(tick))
      problems.push("src: a move's riser and impact go somewhere other than the fx bus — they will be in every stem");
  }
  /* Transitions are armed from the cue table, ahead of the boundary they belong to. Fire them on the
     section's own downbeat the way a move is fired and every lead-in is already too late to sound. */
  {
    const tick = code.slice(code.indexOf("/* Transitions: armed at the bar"), code.indexOf("const dstep ="));
    if (!tick) problems.push("src: the transition block has moved — playback is unchecked");
    else {
      if (!/cues\b/.test(tick)) problems.push("src: playback does not read the cue table — transitions would fire on the downbeat, too late for a lead-in");
      if (!/c\.at - structBar/.test(tick)) problems.push("src: the boundary time is not derived from the cue's own bar");
      if (!/maxPre/.test(tick) || !/maxPost/.test(tick))
        problems.push("src: playback does not pass the clamped windows — a lead-in could reach into a section that already played");
      if (!/lastCueBar/.test(tick)) problems.push("src: transitions are not guarded by the bar index — the lookahead would restack them");
    }
    // the picker and the strip must resolve the same way playback does
    if (!/const effTrans = d =>[^\n]*secTrans\[d\.key\][^\n]*secTrans\[d\.base\]/.test(code))
      problems.push("src: the strip does not resolve a transition instance-first — a transition set on one pass would be invisible there");
    if (!/setSecTrans\(remapKeyed\(/.test(code))
      problems.push("src: transitions are not remapped when the arrangement is edited — moving a section would leave them on the wrong one");
    if (!/setSecTrans\(s\.secTrans \|\| \{\}\)/.test(code))
      problems.push("src: a loaded sketch does not restore its transitions");
    if (!/setGridSt\(\{ key:s\.progId, val:s\.grid/.test(code))
      problems.push("src: a loaded sketch does not restore its writing grid — every melody would re-time on load");
  }
  /* An edited drum bar has to be resolved the same way in three places, or the file and the bounce
     stop being what you heard. */
  {
    const tick = code.slice(code.indexOf("let dpat = drumRef.current"), code.indexOf("const dstep ="));
    if (!/secBeatRef\.current\[b\.inst\]/.test(tick))
      problems.push("src: playback ignores a section's own drum bars");
    if (!/Math\.min\(b\.mb, own\.length - 1\)/.test(tick))
      problems.push("src: playback does not repeat the last written bar when a section is stretched");
    const midi = code.slice(code.indexOf("const drumForBar = bi =>"), code.indexOf("const anyDrum ="));
    if (!/secBeat\[b\.inst\]/.test(midi))
      problems.push("src: the MIDI export ignores a section's own drum bars — the file would not be what plays");
    if (!/bars\[0\]\.length/.test(code.slice(code.indexOf("const tickCount = useMemo"), code.indexOf("subRef.current = meloSub"))))
      problems.push("src: the tick count does not account for an edited bar — its sixteenths would fall between ticks");
    if (!/setSecBeat\(songBeats\(s\)\)/.test(code))
      problems.push("src: a loaded sketch does not restore its drum bars");
  }
  /* Autosave must not restore over a shared link: arriving at somebody else's song and being handed
     your own instead is the worst thing it could do. The check has to happen before the first
     `await`, or the address bar may have been read after another effect has moved on. */
  {
    const auto = code.slice(code.indexOf("const AUTOKEY"), code.indexOf("autoReadyRef.current = true"));
    if (!auto) problems.push("src: the autosave block has moved — the shared-link guard is unchecked");
    else {
      const linkAt = auto.indexOf("location.hash");
      const restoreAt = auto.indexOf("restoreDoc(saved)");
      if (linkAt < 0) problems.push("src: autosave no longer checks the address bar for a shared link");
      else if (restoreAt >= 0 && linkAt > restoreAt)
        problems.push("src: autosave restores before checking for a shared link — a link would be overwritten");
      if (!/if \(!linked\)/.test(auto)) problems.push("src: the autosave restore is not gated on the link check");
    }
  }
  /* ---- the design tokens hold ----
     The stylesheet had seventeen font sizes, fifteen corner radii and forty-five near-identical
     greys before they were collapsed into tokens. Nothing stops that growing back one convenient
     hard-coded value at a time, so the tokens are the rule and this is what enforces it. */
  {
    const styleAt = code.indexOf("<style>{`");
    const css = code.slice(styleAt, code.indexOf("`}</style>"));
    const root = css.slice(css.indexOf(":root"), css.indexOf("}", css.indexOf(":root")));
    const body = css.slice(css.indexOf("}", css.indexOf(":root")) + 1);
    if (!/--fs-md/.test(root) || !/--r-md/.test(root) || !/--surface/.test(root))
      problems.push("src: the :root token block has gone or lost its type / radius / surface scales");
    const rawFs = [...new Set([...body.matchAll(/font-size:\s*([\d.]+)px/g)].map(m => m[1]))];
    const rawR  = [...new Set([...body.matchAll(/border-radius:\s*([\d.]+)px/g)].map(m => m[1]))];
    if (rawFs.length) problems.push(`src: ${rawFs.length} hard-coded font size(s) outside the scale: ${rawFs.join(", ")}px`);
    if (rawR.length) problems.push(`src: ${rawR.length} hard-coded corner radius/radii outside the scale: ${rawR.join(", ")}px`);
    /* A handful of accent hues stay literal on purpose — they mean something rather than being
       chrome — but the greys are all tokens now, and a new one is how the palette drifts back. */
    const ACCENTS = ["F2B8AC", "BCD6FF", "7A4A44", "E9B3AB", "1A130A", "2A0F0B", "4A3F8A", "6B5320", "FFFFFF"];
    const raw = [...new Set([...body.matchAll(/#([0-9A-Fa-f]{6})(?![0-9A-Fa-f])/g)].map(m => m[1].toUpperCase()))]
      .filter(h => !ACCENTS.includes(h));
    if (raw.length) problems.push(`src: ${raw.length} hard-coded colour(s) that should be tokens: ${raw.map(h => "#" + h).join(", ")}`);
    // and keyboard focus has to stay visible — it was invisible everywhere before
    if (!/:focus-visible/.test(css)) problems.push("src: no :focus-visible rule — keyboard focus would be invisible again");
    console.log(`design tokens: type, radius and colour scales in use; ${ACCENTS.length} accents held out by name`);
  }
  console.log(`source shape guard: ${bad.length + 3} patterns checked`);
}

/* ---- per-part register and level ---- */
{
  const { layerGain, LAYER_DEFAULT_OCT, LAYER_DEFAULT_VOL, LAYER_OCT_MIN, LAYER_OCT_MAX, MAX_LAYERS } = M;
  if (LAYER_DEFAULT_OCT.length !== MAX_LAYERS) problems.push("LAYER_DEFAULT_OCT does not cover every part");
  if (LAYER_DEFAULT_VOL.length !== MAX_LAYERS) problems.push("LAYER_DEFAULT_VOL does not cover every part");
  LAYER_DEFAULT_OCT.forEach((o, i) => {
    if (!Number.isInteger(o)) problems.push(`part ${i}: default octave ${o} is not a whole octave`);
    if (o < LAYER_OCT_MIN || o > LAYER_OCT_MAX) problems.push(`part ${i}: default octave ${o} outside ${LAYER_OCT_MIN}..${LAYER_OCT_MAX}`);
  });
  LAYER_DEFAULT_VOL.forEach((v, i) => {
    if (!(v > 0 && v <= 1)) problems.push(`part ${i}: default level ${v} outside 0..1`);
  });
  // the bass part must actually sit below the lead, or "bassline" is a lie
  if (!(LAYER_DEFAULT_OCT[2] < LAYER_DEFAULT_OCT[0])) problems.push("the bass part does not default below the lead");
  // gain: mute wins; solo elsewhere silences; otherwise the part's own level
  const g = (ly, anySolo) => layerGain(ly, anySolo);
  if (g({ vol: 0.8 }, false) !== 0.8) problems.push("an ordinary part does not play at its own level");
  if (g({ vol: 0.8, mute: true }, false) !== 0) problems.push("mute does not silence a part");
  if (g({ vol: 0.8 }, true) !== 0) problems.push("a non-soloed part still sounds while another is soloed");
  if (g({ vol: 0.8, solo: true }, true) !== 0.8) problems.push("a soloed part does not play");
  if (g({ vol: 0.8, solo: true, mute: true }, true) !== 0) problems.push("mute should beat solo on the same part");
  if (g({}, false) !== 1) problems.push("a part with no level set should play at full");
  // a MIDI note at the lowest register must stay a legal MIDI note
  const lowest = 60 + 12 * LAYER_OCT_MIN;
  if (lowest < 0 || lowest > 127) problems.push(`the lowest register puts notes off the MIDI range (${lowest})`);
  console.log(`part mix: octaves ${LAYER_DEFAULT_OCT.join(",")} · levels ${LAYER_DEFAULT_VOL.join(",")} · lowest MIDI ${lowest}`);
}

/* ---- the file tells a DAW how to lay itself out ---- */
{
  const bars4 = Array.from({ length: 8 }, (_, i) => ({ chord: { root: i % 2 ? 5 : 0, quality: "min" } }));
  const meta = { beatUnit: 4, sharps: -3, minor: true,
    markers: [{ bar: 0, name: "Intro" }, { bar: 2, name: "Build" }, { bar: 4, name: "Drop" }, { bar: 6, name: "Outro" }] };
  for (const [label, beats, sub] of [["4/4", 4, 2], ["3/4", 3, 2], ["4/4 @16ths", 4, 4]]) {
    const bytes = M.midiBytes(128, beats, bars4, M.DRUMS.house909.pattern, null, "909", sub, 4, meta);
    // walk the tempo track properly — delta, running status, meta
    const len = (bytes[18]<<24)|(bytes[19]<<16)|(bytes[20]<<8)|bytes[21];
    const body = bytes.slice(22, 22 + len);
    let q = 0, running = 0;
    const found = { tempo: 0, timesig: null, keysig: null, markers: [] };
    const vlq = () => { let v = 0; while (body[q] & 0x80) { v = (v << 7) | (body[q] & 0x7f); q++; } return (v << 7) | body[q++]; };
    let at = 0;
    while (q < body.length) {
      at += vlq();
      let st = body[q];
      if (st & 0x80) { q++; running = st; } else st = running;
      if (st !== 0xff) { q += (st & 0xf0) === 0xc0 || (st & 0xf0) === 0xd0 ? 1 : 2; continue; }
      const kind = body[q++], n = vlq();
      if (kind === 0x51) found.tempo++;
      if (kind === 0x58) found.timesig = [body[q], body[q + 1]];
      if (kind === 0x59) found.keysig = [body[q] > 127 ? body[q] - 256 : body[q], body[q + 1]];
      if (kind === 0x06) found.markers.push({ at, name: String.fromCharCode(...body.slice(q, q + n)) });
      q += n;
      if (kind === 0x2f) break;
    }
    if (!found.tempo) problems.push(`${label}: no tempo event`);
    if (!found.timesig) problems.push(`${label}: NO TIME SIGNATURE — the DAW will assume 4/4`);
    else if (found.timesig[0] !== beats) problems.push(`${label}: time signature says ${found.timesig[0]}/${2 ** found.timesig[1]}`);
    if (!found.keysig) problems.push(`${label}: no key signature`);
    else if (found.keysig[0] !== -3 || found.keysig[1] !== 1) problems.push(`${label}: key signature ${found.keysig} — want [-3, 1] for C minor`);
    if (found.markers.length !== 4) problems.push(`${label}: ${found.markers.length} markers, want 4`);
    else {
      const want = [0, 2, 4, 6].map(b => b * beats * 480);
      found.markers.forEach((mk, i) => {
        if (mk.at !== want[i]) problems.push(`${label}: marker "${mk.name}" at tick ${mk.at}, want ${want[i]}`);
      });
      if (found.markers.map(m => m.name).join(",") !== "Intro,Build,Drop,Outro")
        problems.push(`${label}: marker names came out as ${found.markers.map(m => m.name).join(",")}`);
    }
    console.log(`midi meta ${label.padEnd(11)} → ${found.timesig[0]}/${2 ** found.timesig[1]}, key ${found.keysig[0]} ${found.keysig[1] ? "minor" : "major"}, markers at bars ${found.markers.map(m => m.at / (beats * 480)).join(",")}`);
  }
}

/* ---- the exported file names, voices and accents its parts ---- */
{
  const bars2 = [{ chord: { root: 0, quality: "min" } }, { chord: { root: 5, quality: "maj" } }];
  // Alternating pitches, so every column is a fresh onset. The same pitch on consecutive columns
  // is merged into one held note by design, which would leave a single note-on to measure.
  const cols = () => Array.from({ length: 2 * 4 * 2 }, (_, i) => [60 + (i % 2)]);
  const parts = [
    { cols: cols(), program: M.programOf("flute"), gain: 1 },
    { cols: cols(), program: M.programOf("synth_bass_1"), gain: 0.5 },
  ];
  const bytes = M.midiBytes(120, 4, bars2, M.DRUMS.house909.pattern, parts, "909", 2,
                            M.programOf("acoustic_grand_piano"));
  // A real MIDI event walker. Scanning raw bytes for 0x9n picks up delta-time and data bytes as if
  // they were note-ons, which invents velocities above 127 — parse deltas, running status, meta and
  // sysex properly so what comes out is actually what the file says.
  const parseTrack = body => {
    const t = { progs: [], name: "", vels: [] };
    let q = 0, running = 0;
    const vlqAt = () => { let v = 0; while (body[q] & 0x80) { v = (v << 7) | (body[q] & 0x7f); q++; } return (v << 7) | body[q++]; };
    while (q < body.length) {
      vlqAt();                                        // delta time
      let st = body[q];
      if (st & 0x80) { q++; running = st; } else st = running;
      if (st === 0xff) {
        const meta = body[q++], len = vlqAt();
        if (meta === 0x03) t.name = String.fromCharCode(...body.slice(q, q + len));
        q += len;
        if (meta === 0x2f) break;
      } else if (st === 0xf0 || st === 0xf7) { q += vlqAt(); }
      else {
        const hi = st & 0xf0;
        if (hi === 0xc0) { t.progs.push({ ch: st & 0x0f, prog: body[q] }); q += 1; }
        else if (hi === 0xd0) { q += 1; }
        else { if (hi === 0x90 && body[q + 1] > 0) t.vels.push(body[q + 1]); q += 2; }
      }
    }
    return t;
  };
  let p = 14; const tracks = [];
  while (p < bytes.length) {
    const len = (bytes[p+4]<<24)|(bytes[p+5]<<16)|(bytes[p+6]<<8)|bytes[p+7];
    tracks.push(parseTrack(bytes.slice(p + 8, p + 8 + len)));
    p += 8 + len;
  }
  const chords = tracks[1], drums = tracks[2], melA = tracks[3], melB = tracks[4];
  if (chords.name !== "Chords") problems.push(`chord track is named "${chords.name}"`);
  if (!chords.progs.some(x => x.ch === 0 && x.prog === 0)) problems.push("chord track has no program change");
  if (!drums.progs.some(x => x.ch === 9)) problems.push("drum track lost its kit program");
  if (!melA || melA.name !== "Part A") problems.push(`first melody track is named "${melA && melA.name}"`);
  if (!melB || melB.name !== "Part B") problems.push(`second melody track is named "${melB && melB.name}"`);
  const wantA = M.programOf("flute"), wantB = M.programOf("synth_bass_1");
  if (!melA.progs.some(x => x.prog === wantA)) problems.push(`part A not voiced as flute (${wantA})`);
  if (!melB.progs.some(x => x.prog === wantB)) problems.push(`part B not voiced as synth bass (${wantB})`);
  // each melody part must sit on its own channel, and its program change on that same channel
  melA.progs.forEach(x => { if (x.ch !== 1) problems.push(`part A program on channel ${x.ch}, want 1`); });
  melB.progs.forEach(x => { if (x.ch !== 2) problems.push(`part B program on channel ${x.ch}, want 2`); });
  // velocity must vary with the accent, and part B at half level must sit below part A
  const spread = Math.max(...melA.vels) - Math.min(...melA.vels);
  if (spread < 10) problems.push(`melody velocity barely varies (spread ${spread}) — the accent is not exported`);
  if (!(Math.max(...melB.vels) < Math.max(...melA.vels))) problems.push("part level did not scale exported velocity");
  const dspread = Math.max(...drums.vels) - Math.min(...drums.vels);
  if (dspread < 10) problems.push(`drum velocity barely varies (spread ${dspread})`);
  if ([...melA.vels, ...melB.vels, ...drums.vels].some(v => v < 1 || v > 127)) problems.push("a velocity fell outside 1..127");
  console.log(`midi voicing: chords=prog ${chords.progs[0].prog}, ${melA.name}=prog ${melA.progs[0].prog} ch${melA.progs[0].ch}, ${melB.name}=prog ${melB.progs[0].prog} ch${melB.progs[0].ch}`);

  /* The per-track export writes one file per source, each holding the tempo map and exactly one
     thing. `meta.skipChords` is what leaves the chord track out; the header's track count has to
     agree with the chunks actually written, or a DAW reads past the end of the file. */
  {
    const countTrk = f => { let n = 0;
      for (let i = 0; i + 3 < f.length; i++) if (f[i] === 0x4d && f[i + 1] === 0x54 && f[i + 2] === 0x72 && f[i + 3] === 0x6b) n++;
      return n; };
    const hdrTrk = f => (f[10] << 8) | f[11];
    const bars4 = [0, 1, 2, 3].map(() => ({ chord: { root: 0, quality: "min", name: "Cm" } }));
    const partCols = Array.from({ length: 8 }, (_, i) => (i % 2 ? [] : [60 + i]));
    const full = M.midiBytes(120, 4, bars4, null, [{ cols: partCols, program: 73 }], "acoustic", 2, 0, {});
    const noChords = M.midiBytes(120, 4, bars4, null, [{ cols: partCols, program: 73 }], "acoustic", 2, 0, { skipChords: true });
    // tempo + chords + part  vs  tempo + part
    if (countTrk(full) !== 3) problems.push(`a full MIDI export wrote ${countTrk(full)} tracks, expected 3`);
    if (countTrk(noChords) !== 2) problems.push(`skipChords wrote ${countTrk(noChords)} tracks, expected 2`);
    for (const [name, f] of [["full", full], ["skipChords", noChords]])
      if (hdrTrk(f) !== countTrk(f))
        problems.push(`${name}: the header claims ${hdrTrk(f)} tracks but ${countTrk(f)} were written — a reader would run off the end`);
    if (noChords.length >= full.length) problems.push("skipChords did not actually make the file smaller");
    // the tempo map has to survive into the per-track files, or they land at the wrong speed
    const hasTempo = f => { for (let i = 0; i + 2 < f.length; i++) if (f[i] === 0xff && f[i + 1] === 0x51 && f[i + 2] === 3) return true; return false; };
    if (!hasTempo(noChords)) problems.push("a per-track MIDI file lost its tempo map");
    console.log(`per-track midi: ${countTrk(full)} tracks whole, ${countTrk(noChords)} with skipChords, headers agree, tempo kept`);
  }
  console.log(`midi velocity: melody ${Math.min(...melA.vels)}–${Math.max(...melA.vels)}, half-level part ${Math.min(...melB.vels)}–${Math.max(...melB.vels)}, drums ${Math.min(...drums.vels)}–${Math.max(...drums.vels)}`);
  // every catalogue instrument must resolve to a real program
  const keys = M.GM_CATS.flatMap(([, l]) => l.map(([k]) => k));
  const bad = keys.filter(k => M.GM_PROGRAM[k] == null);
  if (bad.length) problems.push(`${bad.length} instruments have no GM program: ${bad.slice(0, 4)}`);
  if (M.GM_NAMES.length !== 128) problems.push(`the GM list has ${M.GM_NAMES.length} names, want 128`);
  if (new Set(M.GM_NAMES).size !== 128) problems.push("the GM list has duplicate names");
  const synths = M.LEAD_VOICES.filter(([id]) => !M.isGM(id)).map(([id]) => id);
  const unmapped = synths.filter(id => M.SYNTH_PROGRAM[id] == null);
  if (unmapped.length) problems.push(`synth voices with no GM equivalent: ${unmapped.join(", ")}`);
  console.log(`instruments: ${keys.length} GM keys + ${synths.length} synth voices, all mapped to programs`);
}

/* ---- the wav writer produces a file a player will actually open ---- */
{
  const rate = 44100, frames = 1000;
  const buf = { numberOfChannels: 2, length: frames, sampleRate: rate,
    getChannelData: c => Float32Array.from({ length: frames }, (_, i) =>
      (c ? -1 : 1) * Math.sin(i / 20) * 0.5) };
  const bytes = M.audioBufferToWav(buf);
  const dv = new DataView(bytes.buffer);
  const tag = o => String.fromCharCode(bytes[o], bytes[o+1], bytes[o+2], bytes[o+3]);
  if (tag(0) !== "RIFF") problems.push("wav: no RIFF header");
  if (tag(8) !== "WAVE") problems.push("wav: not a WAVE file");
  if (tag(12) !== "fmt ") problems.push("wav: no fmt chunk");
  if (tag(36) !== "data") problems.push("wav: no data chunk");
  if (dv.getUint16(22, true) !== 2) problems.push("wav: not stereo");
  if (dv.getUint32(24, true) !== rate) problems.push("wav: wrong sample rate");
  if (dv.getUint16(34, true) !== 16) problems.push("wav: not 16-bit");
  const wantBytes = 44 + frames * 2 * 2;
  if (bytes.length !== wantBytes) problems.push(`wav: ${bytes.length} bytes, want ${wantBytes}`);
  if (dv.getUint32(4, true) !== wantBytes - 8) problems.push("wav: RIFF size does not match the file");
  if (dv.getUint32(40, true) !== frames * 2 * 2) problems.push("wav: data size does not match the frames");
  // channels must stay separate — the two are inverted here, so frame 1 should differ in sign
  const l = dv.getInt16(44 + 2 * 2, true), r = dv.getInt16(44 + 2 * 2 + 2, true);
  if (l === r || Math.sign(l) === Math.sign(r)) problems.push("wav: the two channels were not interleaved separately");
  // clipping must clamp rather than wrap around to the opposite sign
  const hot = { numberOfChannels: 1, length: 4, sampleRate: rate,
    getChannelData: () => Float32Array.from([2, -2, 1, -1]) };
  const hb = new DataView(M.audioBufferToWav(hot).buffer);
  for (let i = 0; i < 4; i++) {
    const v = hb.getInt16(44 + i * 2, true);
    if (Math.abs(v) < 32000) problems.push(`wav: a clipped sample came out at ${v} instead of full scale`);
    if (Math.sign(v) !== Math.sign([2,-2,1,-1][i])) problems.push("wav: clipping wrapped the sign");
  }
  if (Math.abs(M.peakOf(buf) - 0.5) > 0.01) problems.push(`peakOf reported ${M.peakOf(buf)}, want ~0.5`);
  console.log(`wav writer: ${bytes.length} bytes for ${frames} stereo frames, clipping clamps`);
}

/* ---- the delay is tempo-synced and always decays ---- */
{
  const beat = 60 / 128;                                   // 128 bpm
  for (const [id, name, beats] of M.DELAY_TIMES) {
    nodes.length = 0;
    const dest = baseNode("dest");
    const d = M.makeDelay(ctx, dest, beat, id);
    if (!beats) { if (d) problems.push(`delay ${id}: "off" should build nothing`); continue; }
    if (!d) { problems.push(`delay ${id}: built nothing`); continue; }
    const want = beats * beat;
    if (Math.abs(d.time - want) > 1e-9) problems.push(`delay ${id}: ${d.time}s, want ${want}s`);
    if (d.time > 2) problems.push(`delay ${id}: ${d.time}s exceeds the delay line's 2s maximum`);
    const fb = nodes.filter(n => n._kind === "gain").map(n => n.gain.value);
    if (!fb.some(v => v > 0 && v < 1)) problems.push(`delay ${id}: feedback is not below unity — the tail would never die`);
    console.log(`delay ${id.padEnd(4)} (${name.padEnd(11)}) → ${(d.time * 1000).toFixed(0)}ms at 128bpm`);
  }
  // a very slow tempo must not ask for more delay than the line can hold
  const slow = M.makeDelay(ctx, baseNode("dest"), 60 / 40, "4");
  if (slow.time > 2) problems.push(`delay clamps: ${slow.time}s at 40bpm exceeds the line`);
  console.log(`delay at 40bpm, quarter note: ${(slow.time * 1000).toFixed(0)}ms (clamped under the 2s line)`);
}

/* ---- the insert-effects rack ---- */
{
  const { FX_TYPES, FX_PARAMS, fxDefaults, makeFxSlot, makeFxRack } = M;
  // every param's default sits inside its own [min, max], and fxDefaults returns exactly the
  // keys its own type declares — a stray key would silently never reach a slider
  for (const [id] of FX_TYPES) {
    if (id === "off") continue;
    const rows = FX_PARAMS[id] || [];
    if (!rows.length) problems.push(`fx ${id}: no params declared`);
    const d = fxDefaults(id);
    if (Object.keys(d).length !== rows.length) problems.push(`fx ${id}: fxDefaults key count does not match FX_PARAMS`);
    for (const [k, name, min, max, step, dflt] of rows) {
      if (!(dflt >= min && dflt <= max)) problems.push(`fx ${id}.${k} (${name}): default ${dflt} outside [${min},${max}]`);
      if (!(step > 0)) problems.push(`fx ${id}.${k} (${name}): non-positive step ${step}`);
      if (d[k] !== dflt) problems.push(`fx ${id}.${k}: fxDefaults disagrees with FX_PARAMS`);
    }
  }

  // "off" is a single unity gain and nothing else — no added latency or coloration for a bus
  // that never opens the FX panel, and building a rack of two never adds a third node either
  {
    nodes.length = 0;
    const slot = makeFxSlot(ctx, "off", 0);
    if (slot.input !== slot.output) problems.push("fx off: input and output are not the same node");
    if (slot.input.gain.value !== 1) problems.push("fx off: bypass gain is not unity");
    if (nodes.length !== 1) problems.push(`fx off: built ${nodes.length} nodes, want exactly 1`);
    nodes.length = 0;
    const rack = makeFxRack(ctx, ["off", "off"], 0);
    if (nodes.length !== 2) problems.push(`fx rack of two off slots built ${nodes.length} nodes, want 2`);
    // slot 0's output must actually feed slot 1's input, or the second slot is silent
    const s0 = rack.slots[0];
    if (!s0.output._conns.includes(rack.slots[1].input)) problems.push("fx rack: slot 0 does not connect into slot 1");
    if (rack.input !== s0.input || rack.output !== rack.slots[1].output)
      problems.push("fx rack: input/output do not point at the outer slots");
  }

  // every real type builds cleanly, at both its extremes, with every oscillator it starts also
  // stopped, and produces no non-finite value, negative time or exponential-ramp-to-zero (the
  // recording stub above catches all three automatically the moment `write` schedules one)
  for (const [id, name] of FX_TYPES) {
    if (id === "off") continue;
    for (const extreme of [0, 100]) {
      nodes.length = 0;
      const before = problems.length;
      const slot = makeFxSlot(ctx, id, 1.0);
      const p = Object.fromEntries((FX_PARAMS[id] || []).map(([k, , min, max]) => [k, extreme ? max : min]));
      slot.write(2.0, p);
      for (const n of nodes) if (n._kind === "osc") {
        if (!n._started) problems.push(`fx ${id} (${extreme}%): an oscillator never started`);
        if (n._t1 == null) problems.push(`fx ${id} (${extreme}%): an oscillator never stops`);
        if (n._t1 != null && n._t1 < n._t0) problems.push(`fx ${id} (${extreme}%): oscillator stops before it starts`);
      }
      if (problems.length !== before) console.log(`fx ${id} (${name}) at ${extreme}%: see above`);
    }
  }

  /* Every modulated delay/filter stays on the safe side of zero at its deepest setting — the one
     property the recording stub cannot check for us, because the actual value is the *sum* of a
     base .value and an AC signal it never simulates. These numbers are the same ones the factory
     functions' own comments promise, recomputed independently here the way the delay test above
     recomputes its own `want`. */
  {
    // chorus: two delay centres, ±5ms at 100% depth
    if (0.008 - 0.005 <= 0) problems.push("fx chorus: voice 1 delay can reach zero or below at full depth");
    if (0.013 - 0.005 <= 0) problems.push("fx chorus: voice 2 delay can reach zero or below at full depth");
    // flanger: 3ms centre, ±2.5ms at 100% depth
    if (0.003 - 0.0025 <= 0) problems.push("fx flanger: delay can reach zero or below at full depth");
    // phaser: lowest stage 280Hz, ±220Hz at 100% depth
    if (280 - 220 <= 0) problems.push("fx phaser: lowest stage can reach zero or below at full depth");
  }

  // distortion reuses the exact drive curve the track/part Tone panel uses, just in a second,
  // independent WaveShaper — turning it to 0 is a true bypass (null curve), same rule as the panel
  {
    const slot = makeFxSlot(ctx, "drive", 0);
    slot.write(0, { amt: 0 });
    if (slot.output.curve !== null) problems.push("fx drive at 0%: does not bypass (curve is not null)");
    slot.write(0, { amt: 50 });
    const want = M.driveCurve(0.5);
    if (!slot.output.curve || slot.output.curve.join() !== Array.from(want).join())
      problems.push("fx drive at 50%: curve does not match driveCurve(0.5)");
  }

  // the stereo widener reconstructs L/R exactly at 100% width — the "default is transparent"
  // guarantee, just centred on 100 instead of 0 (see the comment beside fxWide)
  {
    nodes.length = 0;
    const slot = makeFxSlot(ctx, "wide", 0);
    // the initial default (1.4 = 140%) is set directly on .value, like every other node's default
    // elsewhere in this file, so it is read off the node rather than out of the event log
    const scaler = nodes.filter(n => n._kind === "gain").find(n => n.gain.value === 1.4);
    if (!scaler) problems.push("fx wide: no side-scale gain found at its 140% default");
    slot.write(1, { width: 100 });
    if (!scaler.gain._events.some(e => e.kind === "set" && e.t === 1 && Math.abs(e.v - 1) < 1e-9))
      problems.push("fx wide: 100% width does not scale the side signal by exactly 1");
  }

  // the compressor exposes exactly the four controls asked for, in the right units (ms → s)
  {
    const slot = makeFxSlot(ctx, "comp", 0);
    if (slot.input !== slot.output) problems.push("fx comp: not a single DynamicsCompressorNode");
    slot.write(3, { thresh: -18, ratio: 8, atk: 25, rel: 400 });
    const last = k => [...slot.output[k]._events].reverse().find(e => e.kind === "set");
    if (last("threshold").v !== -18) problems.push("fx comp: threshold did not reach the node");
    if (last("ratio").v !== 8) problems.push("fx comp: ratio did not reach the node");
    if (Math.abs(last("attack").v - 0.025) > 1e-9) problems.push("fx comp: attack is not converted ms → s");
    if (Math.abs(last("release").v - 0.4) > 1e-9) problems.push("fx comp: release is not converted ms → s");
  }

  // the bitcrusher: mix crossfades dry/wet to exactly 1 between them, and a context with no
  // ScriptProcessorNode degrades to a clean pass-through instead of going silent or throwing
  {
    nodes.length = 0;
    const slot = makeFxSlot(ctx, "crush", 0);
    slot.write(1, { mix: 30 });
    const gains = nodes.filter(n => n._kind === "gain");
    const dry = gains.find(n => n._conns.length && n.gain._events.some(e => e.kind === "set" && Math.abs(e.v - 0.7) < 1e-9));
    const wet = gains.find(n => n.gain._events.some(e => e.kind === "set" && Math.abs(e.v - 0.3) < 1e-9));
    if (!dry || !wet) problems.push("fx crush: dry/wet gains do not sum to 1 at mix 30%");
    const noSP = { ...ctx, createScriptProcessor: undefined };
    nodes.length = 0;
    const slot2 = makeFxSlot(noSP, "crush", 0);
    slot2.write(1, { mix: 100 });
    const g2 = nodes.filter(n => n._kind === "gain");
    const dry2 = g2.find(n => n.gain._events.some(e => e.kind === "set" && e.v === 1));
    const wet2 = g2.find(n => n.gain._events.some(e => e.kind === "set" && e.v === 0));
    if (!dry2 || !wet2) problems.push("fx crush without ScriptProcessorNode: does not fall back to a clean pass-through");
  }

  console.log(`insert fx: ${FX_TYPES.length - 1} types, ${FX_TYPES.reduce((n2, [id]) => n2 + (FX_PARAMS[id] || []).length, 0)} params, all clean at both extremes`);
}

/* ---- voice leading actually leads voices ---- */
{
  const { voiceChord, VOICE_LO, VOICE_HI } = M;
  const prog = [{ root: 0, quality: "maj" }, { root: 9, quality: "min" },
                { root: 5, quality: "maj" }, { root: 7, quality: "maj" }];
  // root-position stacks, the old behaviour, for comparison
  const rootPos = c => M.chordIvs(c.quality).map(x => 48 + c.root + x);
  const motion = list => list.slice(1).reduce((sum, notes, i) => {
    const prev = list[i];
    // total distance the voices travel, voice by voice
    return sum + notes.reduce((d, n, k) => d + Math.abs(n - (prev[k] == null ? n : prev[k])), 0);
  }, 0);
  let prev = null; const led = [];
  for (const c of prog) { prev = voiceChord(c, prev); led.push(prev); }
  const oldMotion = motion(prog.map(rootPos)), newMotion = motion(led);
  console.log(`voice leading: ${oldMotion} semitones of movement in root position → ${newMotion} led`);
  if (!(newMotion < oldMotion)) problems.push(`voice leading did not reduce movement (${oldMotion} → ${newMotion})`);
  for (const notes of led) {
    if (new Set(notes).size !== notes.length) problems.push(`a voicing doubles a note: ${notes}`);
    if (notes.some((n, i) => i && n <= notes[i - 1])) problems.push(`a voicing is not ascending: ${notes}`);
    if (notes.some(n => n < VOICE_LO || n > VOICE_HI + 5)) problems.push(`a voicing left the register window: ${notes}`);
  }
  // every chord quality must voice without throwing or losing a tone
  for (const q of ["maj","min","dom","maj7","m7","maj9","m9","dom9","add9","madd9","six","m6","sus2","sus4","dom7sus4","dim","aug"]) {
    const v = voiceChord({ root: 3, quality: q }, [60, 64, 67]);
    const want = M.chordIvs(q).length;
    if (v.length !== want) problems.push(`quality ${q}: voiced ${v.length} notes, chord has ${want}`);
    const pcs = new Set(M.chordIvs(q).map(x => (3 + x) % 12));
    if (!v.every(n => pcs.has(n % 12))) problems.push(`quality ${q}: voicing introduced a note outside the chord`);
  }
  // with no previous chord it must still produce something sane
  const first = voiceChord({ root: 0, quality: "maj" }, null);
  if (!first.length) problems.push("voiceChord with no previous chord produced nothing");
  console.log(`voicings: 17 qualities, all ascending and within ${VOICE_LO}..${VOICE_HI + 5}`);
}

/* ---- a song survives a save and a link ---- */
{
  const bars = [
    [[0], [], [4], [], [], [2], [], []],
    [[], [1], [], [], [6], [], [], [3]],
  ];
  const rt = M.unpackBars(M.packBars(bars));
  if (JSON.stringify(rt) !== JSON.stringify(bars)) problems.push("packBars is not a round trip");
  if (!M.packBars(bars).c.length) problems.push("packBars dropped every note");
  if (M.unpackBars(null).length !== 0) problems.push("unpackBars of nothing should be empty");
  // an empty grid must survive too — it is the common case for parts you have not written yet
  const empty = [[[], []], [[], []]];
  if (JSON.stringify(M.unpackBars(M.packBars(empty))) !== JSON.stringify(empty))
    problems.push("an empty melody does not round trip");

  // key order is an implementation detail; compare on content so a reordered field is not a failure
  const canon = v => Array.isArray(v) ? v.map(canon)
    : (v && typeof v === "object") ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
  const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
  // Effects are stored per part, so they have to survive a save and a link as surely as the notes
  // do — a shared arp that comes back as a plain grid is the same class of bug as a lost melody.
  const withFx = (ly, fx = {}) => ({ ...ly,
    ...Object.fromEntries(M.LAYER_FX.map(([k, d]) => [k, fx[k] != null ? fx[k] : d])) });
  const melos = { progId: "edm", secs: { V1: { ids: ["b0", "b1"], layers: [
    withFx({ bars, instr: "flute", oct: 0, vol: 1, mute: false, solo: false, send: 0.4 },
      { arp: "updown", arpRate: 6, arpOct: 3, gate: "tri", duck: 0.72 }),
    withFx({ bars, instr: "synth_bass_1", oct: -2, vol: 0.9, mute: true, solo: false, send: 0 }),
  ] } } };
  const back = M.unpackMelos(M.packMelos(melos));
  if (!same(back, melos)) problems.push("melodies do not round trip through a sketch");
  // and every effect must come back with the value it went in with, not its default
  for (const [k] of M.LAYER_FX)
    if (JSON.stringify(back.secs.V1.layers[0][k]) !== JSON.stringify(melos.secs.V1.layers[0][k]))
      problems.push(`part effect \`${k}\` does not survive a save (got ${JSON.stringify(back.secs.V1.layers[0][k])})`);

  // a section's own copy of the insert-fx rack — off the song document exactly like fxRack is,
  // so a Drop's own distortion amount survives a save the same way its transition does
  const secFx = { D1: { bass: [{ type: "drive", amt: 62 }, { type: "off" }] } };
  const doc = M.makeSong({ name: "test", progId: "edm", tonic: 0, genre: "House", emotion: null,
    mode: null, colour: "triads", patId: "house16", drum: "house16d", secDrum: { V: "deep" },
    instr: "acoustic_grand_piano", melInstr: "flute", kit: "909", pump: "classic",
    secMove: { C: "drop" }, secTrans: { C: "fulldrop", C2: "gap1" }, secFx, delayId: "8d", grid: "4", bpm: 128, selStruct: "", contrast: { id: "", sec: "C" },
    edits: {}, inserts: [], quals: {}, removed: [], order: null, melos });
  if (!doc.melos) problems.push("makeSong dropped the melodies");
  const code = await M.encodeSong(doc);
  const round = await M.decodeSong(code);
  if (!round) problems.push("a shared link does not decode");
  else {
    if (round.progId !== doc.progId || round.bpm !== doc.bpm || round.kit !== doc.kit || round.delayId !== doc.delayId)
      problems.push("the link lost part of the arrangement");
    // a transition is part of the arrangement, and a per-instance one is the easiest thing to drop
    if (round.secMove.C !== "drop" || round.secTrans.C !== "fulldrop" || round.secTrans.C2 !== "gap1")
      problems.push("the link lost a section's move or transition");
    if (!same(round.secFx, secFx)) problems.push("the link lost a section's own insert-fx rack");
    // the writing grid decides how many columns a melody has, so losing it re-times every note
    if (round.grid !== "4") problems.push("the link lost the writing grid");
    const rm = M.songMelos(round);
    if (!same(rm, melos)) problems.push("the link lost the melodies");
  }
  if (await M.decodeSong("dnot-valid-base64!!") !== null) problems.push("a corrupt link should decode to null, not throw");
  if (await M.decodeSong("") !== null) problems.push("an empty link should decode to null");
  console.log(`song document: ${code.length} chars encoded (${code[0] === "d" ? "deflated" : "plain"}), melodies intact`);
}

/* ---- the progression catalogue and the genre index ----
   Picking a genre is how most people start, so the genre index is the front door to the whole
   catalogue: a progression no genre lists is a progression nobody finds, and a genre with two
   alternatives is not offering a choice. Both are checked here, along with the numerals themselves
   — an unknown numeral resolves to `undefined` and takes the whole page down with it. */
{
  const ids = Object.keys(M.PROGRESSIONS);
  const nums = new Set();
  for (const [id, p] of Object.entries(M.PROGRESSIONS)) {
    if (!p.label || !p.mode || !p.numerals.length) problems.push(`progression ${id} is incomplete`);
    const defs = M.modeFamily(p.mode) === "minor" ? M.MINOR_NUM : M.MAJOR_NUM;
    for (const n of p.numerals) {
      nums.add(n);
      // this is the one that blanks the screen: chordName(undefined) throws on the first render
      if (!defs[n]) problems.push(`progression ${id} uses "${n}", which its mode has no chord for`);
    }
    if (!Array.isArray(p.songs) || p.songs.length < 4) problems.push(`progression ${id} lists ${(p.songs || []).length} songs`);
    if (new Set(p.songs).size !== p.songs.length) problems.push(`progression ${id} lists a song twice`);
    // the song menu offers every song; a key for one that does not exist would show a blank chart
    const keys = M.SONG_KEYS[id];
    if (keys && keys.length !== p.songs.length)
      problems.push(`progression ${id} has ${keys.length} song keys for ${p.songs.length} songs`);
    // every progression has to survive being loaded: these two have no per-id fallback worth relying on
    if (!M.PATTERNS[M.PATTERN_DEFAULT[id] || "pop"]) problems.push(`progression ${id} defaults to a strum pattern that does not exist`);
    if (!(M.BPM_DEFAULT[id] > 0)) problems.push(`progression ${id} has no tempo`);
  }
  // two progressions with the same chords in the same order are one progression listed twice
  const byNums = {};
  for (const [id, p] of Object.entries(M.PROGRESSIONS)) {
    const k = p.mode + ":" + p.numerals.join(" ");
    if (byNums[k]) problems.push(`${id} and ${byNums[k]} are the same progression`);
    byNums[k] = id;
  }

  const rows = M.GENRE_GROUPS.flatMap(([fam, list]) => list.map(([name, progs]) => ({ fam, name, progs })));
  const seenGenre = new Set();
  for (const r of rows) {
    if (seenGenre.has(r.name)) problems.push(`genre "${r.name}" is listed twice`);
    seenGenre.add(r.name);
    for (const p of r.progs) if (!M.PROGRESSIONS[p]) problems.push(`genre "${r.name}" offers "${p}", which is not a progression`);
    if (new Set(r.progs).size !== r.progs.length) problems.push(`genre "${r.name}" lists the same progression twice`);
    // three was a default and two alternatives. A genre has to actually offer a choice.
    if (r.progs.length < 5) problems.push(`genre "${r.name}" only offers ${r.progs.length} progressions`);
  }
  // and nothing in the catalogue may be unreachable — the genre picker is the front door
  const reachable = new Set(rows.flatMap(r => r.progs));
  const orphans = ids.filter(i => !reachable.has(i));
  if (orphans.length) problems.push(`no genre offers: ${orphans.join(", ")}`);
  const counts = rows.map(r => r.progs.length).sort((a, b) => a - b);
  console.log(`progressions: ${ids.length} loops, ${nums.size} distinct numerals, all reachable from ${rows.length} genres`);
  console.log(`  per genre: ${counts[0]} at least, ${counts[counts.length >> 1]} typical, ${counts[counts.length - 1]} at most`);
}

/* ---- song structures are well-formed, and the dance ones phrase properly ---- */
{
  const TOKENS = ["LOOP", "HALF1", "HALF2", "HOLD1"];
  // bars a section occupies on the usual four-chord loop, which is what `reps` multiplies
  const barsOf = (row, pool = 4) => {
    const n = Array.isArray(row.nums) ? row.nums.length
            : row.nums === "LOOP" ? pool : row.nums === "HOLD1" ? 1 : Math.ceil(pool / 2);
    return n * row.reps;
  };
  let checked = 0;
  const all = [
    ...M.UNIVERSAL.map(u => ({ name: u.name, family: u.family, plan: u.plan })),
    ...Object.entries(M.PLANS).flatMap(([pid, plans]) =>
      plans.map((plan, i) => ({ name: `${pid}#${i}`, family: "per-progression", plan }))),
  ];
  for (const st of all) {
    checked++;
    if (!st.plan || !st.plan.length) { problems.push(`structure ${st.name}: empty plan`); continue; }
    for (const row of st.plan) {
      if (!row.sec) problems.push(`structure ${st.name}: a section has no name`);
      if (!(row.reps >= 1)) problems.push(`structure ${st.name}: "${row.sec}" has reps ${row.reps}`);
      if (!Array.isArray(row.nums) && !TOKENS.includes(row.nums))
        problems.push(`structure ${st.name}: "${row.sec}" uses unknown token ${row.nums}`);
      // every section must letter-code to something, or its 🥁/🎛 menus cannot group it
      const L = M.letterFor(row.sec);
      if (!L || !/^[A-Z]$/.test(L)) problems.push(`structure ${st.name}: "${row.sec}" letters as "${L}"`);
    }
  }
  console.log(`song structures: ${checked} checked (${M.UNIVERSAL.length} universal, ${all.length - M.UNIVERSAL.length} per-progression)`);
  // every letter a structure can produce needs a word, or the write-out reads as a bare letter
  const letters = new Set(all.flatMap(st => st.plan.map(r => M.letterFor(r.sec))));
  /* letterFor is called from the scheduler, the strip, the chart and the arrangement editor, so it
     has to survive whatever any of them hands it. It used to end in `sec[0].toUpperCase()`, which
     throws on an empty string — and an empty section name is exactly what the arrangement editor
     holds when no structure is picked, so pressing Edit on a plain loop blanked the whole app. */
  for (const bad of ["", "   ", null, undefined, 0]) {
    let got;
    try { got = M.letterFor(bad); }
    catch (e) { problems.push(`letterFor(${JSON.stringify(bad)}) threw: ${e.message}`); continue; }
    if (!/^[A-Z]$/.test(got)) problems.push(`letterFor(${JSON.stringify(bad)}) gave ${JSON.stringify(got)}, not a single letter`);
  }
  // and an unknown name still has to letter to something stable rather than blowing up
  if (M.letterFor("Zither solo interlude") !== "S") problems.push("letterFor stopped matching on a contained keyword");
  if (M.letterFor("Zzz") !== "Z") problems.push("letterFor no longer falls back to the initial");

  const noWord = [...letters].filter(L => !M.LETTER_WORD[L]);
  if (noWord.length) problems.push(`section letters with no word: ${noWord.join(", ")}`);
  console.log(`section letters in use: ${[...letters].sort().join("")} — all named`);

  /* Every letter also needs a colour. The arrangement strip draws the song as coloured blocks, so
     a letter missing from SEC_COL falls through to grey — and a dance structure whose sections are
     all uncoloured reads as one grey smear with no shape at all, which is how this was found. */
  const colBlock = code.match(/const SEC_COL = \{([\s\S]*?)\n\};/);
  if (!colBlock) problems.push("SEC_COL not found in the component");
  else {
    const coloured = new Set([...colBlock[1].matchAll(/(\w+)\s*:\s*"#[0-9A-Fa-f]{6}"/g)].map(m => m[1]));
    const noCol = [...letters].filter(L => !coloured.has(L));
    if (noCol.length) problems.push(`section letters with no colour in SEC_COL: ${noCol.join(", ")}`);
    // and the colours must be distinguishable, or two different sections look like one block
    const hexes = [...colBlock[1].matchAll(/(\w+)\s*:\s*"(#[0-9A-Fa-f]{6})"/g)];
    const byHex = {};
    for (const [, L, hex] of hexes) (byHex[hex] = byHex[hex] || []).push(L);
    // intro/outro/loop deliberately share the same grey — they are all "not the song proper"
    const NEUTRAL = "IOL";
    for (const [hex, ls] of Object.entries(byHex))
      if (ls.length > 1 && !ls.every(L => NEUTRAL.includes(L)))
        problems.push(`SEC_COL: ${ls.join(" and ")} share ${hex}`);
    console.log(`section colours: ${coloured.size} letters, ${Object.keys(byHex).length} distinct`);
  }

  // the point of the dance structures: DJ-mixable ends and phrases in 8s
  const dance = M.UNIVERSAL.filter(u => u.family === "Dance & electronic" || u.family === "Club edits");
  if (dance.length < 15) problems.push(`only ${dance.length} dance structures`);
  let mixable = 0;
  for (const st of dance) {
    const bars = st.plan.map(r => barsOf(r));
    const total = bars.reduce((a, b) => a + b, 0);
    if (total % 4) problems.push(`${st.name}: ${total} bars total — not a whole number of 4-bar phrases`);
    // a club-ready structure opens and closes on a 16-bar phrase a DJ can beatmatch over
    if (bars[0] >= 16 && bars[bars.length - 1] >= 16) mixable++;
  }
  if (mixable < 8) problems.push(`only ${mixable} dance structures have 16-bar mixable ends`);
  console.log(`dance structures: ${dance.length}, ${mixable} with DJ-mixable 16-bar ends`);
  const longest = M.UNIVERSAL.map(u => ({ n: u.name, b: u.plan.reduce((a, r) => a + barsOf(r), 0) }))
    .sort((a, b) => b.b - a.b)[0];
  console.log(`longest structure: ${longest.n} at ${longest.b} bars on a four-chord loop`);
}

/* ---- the melody lead voices ----
   Every voice in the Lead menu, played across the range it will actually be asked for. The dance
   voices added filter envelopes and pitch bends, both of which are easy to get wrong in ways that
   throw in real Web Audio and never in a stub — a cutoff above Nyquist and an exponential ramp
   through zero are the two classics. */
{
  const NYQ = 44100 / 2;
  let checked = 0;
  for (const [id] of M.LEAD_VOICES) {
    if (M.isGM(id)) continue;                       // sampled voices are not leadNote's business
    for (const midi of [36, 48, 60, 72, 84]) {      // sub-bass up to a topline
      nodes.length = 0;
      const dest = baseNode("dest");
      const before = problems.length;
      try { M.leadNote(ctx, 1.5, midi, 0.4, id, false, dest); }
      catch (e) { problems.push(`lead ${id}@${midi} threw: ${e.message}`); continue; }
      const oscs = nodes.filter(n => n._kind === "osc");
      if (!oscs.length) { problems.push(`lead ${id} produced no oscillators`); continue; }
      for (const o of oscs) {
        if (!o._started) problems.push(`lead ${id} has an unstarted oscillator`);
        if (o._t1 == null) problems.push(`lead ${id} has an oscillator that never stops`);
        const hz = o.frequency.value;
        if (!(hz > 0) || !Number.isFinite(hz)) problems.push(`lead ${id}@${midi} oscillator at ${hz} Hz`);
        if (hz > NYQ) problems.push(`lead ${id}@${midi} oscillator above Nyquist (${Math.round(hz)} Hz)`);
      }
      // a filter sweep that runs past Nyquist throws when the browser applies it
      for (const f of nodes.filter(n => n._kind === "biquad"))
        for (const ev of f.frequency._events.concat([{ v: f.frequency.value }]))
          if (ev.v > NYQ) problems.push(`lead ${id}@${midi} filter cutoff ${Math.round(ev.v)} Hz is above Nyquist`);
      if (problems.length === before) checked++;
    }
  }
  console.log(`lead voices: ${checked} voice×register combinations clean`);
  // the dance voices are the point of the new ones — check they are actually distinct in character
  const S = M.LEAD_SPECS;
  for (const id of ["supersaw", "hoover", "acid", "reese", "sub", "stab"])
    if (!S[id]) problems.push(`dance voice ${id} is missing from LEAD_SPECS`);
  if (S.supersaw && S.supersaw.parts.length < 5) problems.push("a supersaw needs a stack of detuned saws");
  // detuning is the whole sound: the saws must not all sit on the same frequency
  if (S.supersaw && new Set(S.supersaw.parts.map(p => p[1])).size !== S.supersaw.parts.length)
    problems.push("supersaw has duplicate detune multiples");
  if (S.acid && !(S.acid.q > 8)) problems.push("the acid voice needs a resonant filter");
  if (S.acid && !S.acid.fenv) problems.push("the acid voice needs a filter envelope");
}

/* ---- arpeggiators and note gates ---- */
{
  // An arp index out of the pool is either a silent step or a crash, depending on the pool. Every
  // mode is checked across every pool size it can meet — a triad through four octaves is 3..24.
  let combos = 0;
  for (const a of M.ARPS) {
    for (let n = 1; n <= 24; n++) {
      const base = Math.max(1, Math.min(n, 3));
      const seen = new Set();
      for (let i = 0; i < 64; i++) {
        const k = a.seq(i, n, base);
        if (!Number.isInteger(k) || k < 0 || k >= n) {
          problems.push(`arp ${a.id}: step ${i} of a ${n}-note pool gave index ${k}`);
          break;
        }
        seen.add(k);
      }
      // a mode that only ever lands on one note is not an arpeggio
      if (n > 2 && seen.size < 2) problems.push(`arp ${a.id} never leaves note ${[...seen][0]} of ${n}`);
      combos++;
    }
    // determinism is what lets a stem bounce match the mix it came from
    const once = Array.from({ length: 32 }, (_, i) => a.seq(i, 7, 3));
    const again = Array.from({ length: 32 }, (_, i) => a.seq(i, 7, 3));
    if (once.join() !== again.join()) problems.push(`arp ${a.id} is not deterministic`);
  }
  console.log(`arpeggiators: ${M.ARPS.length} modes × ${combos / M.ARPS.length} pool sizes, all in range`);
  // hash01 stands in for randomness everywhere that has to stay reproducible
  if (M.hash01(12345) !== M.hash01(12345)) problems.push("hash01 is not deterministic");
  const hs = Array.from({ length: 2000 }, (_, i) => M.hash01(i));
  if (hs.some(h => !(h >= 0 && h < 1))) problems.push("hash01 escaped 0..1");
  const buckets = new Array(10).fill(0);
  hs.forEach(h => buckets[Math.floor(h * 10)]++);
  if (buckets.some(b => b < 120)) problems.push(`hash01 is lumpy: ${buckets.join(",")}`);
  console.log(`hash01: 2000 values, flattest bucket ${Math.min(...buckets)}, fullest ${Math.max(...buckets)}`);

  const RATES = M.ARP_RATES.map(([r]) => r);
  if (!RATES.includes(4)) problems.push("no 1/16 arp rate");
  for (const [r] of M.ARP_RATES) if (!(r > 0) || !Number.isInteger(r)) problems.push(`arp rate ${r} is not a whole number of notes per beat`);

  for (const g of M.GATES) {
    if (!/^[x-]+$/.test(g.pat)) problems.push(`gate ${g.id} has characters other than x and -`);
    if (g.pat.length !== 16) problems.push(`gate ${g.id} is ${g.pat.length} steps, expected 16`);
    // an all-shut gate silences the part for good, which no menu entry should be able to do
    if (!g.pat.includes("x")) problems.push(`gate ${g.id} never opens`);
    if (!g.pat.includes("-")) problems.push(`gate ${g.id} never closes — it does nothing`);
  }
  console.log(`note gates: ${M.GATES.length} patterns, ${M.GATES.map(g => g.pat.split("x").length - 1).join("/")} open steps`);
}

/* ---- varying the repeats of a narrative ----
   A narrative writes the same tune into every pass of a section, and four identical choruses is the
   fastest way to sound like a demo. varyBars edits the later passes. The properties that matter are
   in tension: each repeat has to be *different* from the others, and it still has to be *the same
   tune*. So this checks both ends — that passes diverge, and that most of the phrase survives. */
{
  const show = bars => bars.map(b => b.map(c => (c && c.length ? c[0] : ".")).join("")).join("|");
  const onsets = bars => bars.flatMap((b, i) => M.barNotes(b).map(n => i + ":" + n.c));
  const ND = 7, ROLES = ["C", "V", "B", "I"];
  const LEVELS = M.VARY_LEVELS.map(([n]) => n);      // every level the menu offers, not a fixed list
  const noteCount = bars => bars.reduce((a, b) => a + M.barNotes(b).length, 0);
  let combos = 0, repeats = 0, worstKeep = 1, steps = 0, flat = 0;
  const spread = { more: 0, fewer: 0, same: 0 };

  // barNotes is the model everything else rests on: a run of one degree is one held note, not several
  {
    const bar = [[2], [2], [2], [], [5], [], [5], [5]];
    const ns = M.barNotes(bar);
    if (ns.length !== 3) problems.push(`barNotes read ${ns.length} notes in a 3-note bar`);
    if (ns[0].len !== 3 || ns[0].c !== 0 || ns[0].d !== 2) problems.push("barNotes lost a held note's length");
    if (ns[2].c !== 6 || ns[2].len !== 2) problems.push("barNotes mis-placed the last note");
  }

  for (const [B, sub] of [[8, 2], [16, 4]]) {
    for (const nar of M.NARRATIVES) {
      for (const role of ROLES) {
        const spots = M.rhythmSpots(M.ROLE_RHYTHM[role] || "straight", B, sub, 4);
        const base = nar.gen({ nBars: 4, B, sub, nd: ND, spots,
          chordDegs: [[0, 2, 4], [3, 5, 0], [4, 6, 1], [0, 2, 4]], role,
          pass: 0, passes: 4, idx: 0, total: 4, frac: 0 });
        const before = show(base);
        for (const amount of LEVELS) {
          const outs = [0, 1, 2, 3].map(p => M.varyBars(base, { pass: p, role, nd: ND, amount }));
          // the generator's own output must never be edited in place — the caller reuses it
          if (show(base) !== before) problems.push(`varyBars mutated the bars it was given (${nar.id})`);
          // pass 0 is the reference the others vary from, and "identical repeats" means identical
          if (show(outs[0]) !== before) problems.push(`varyBars changed pass 0 of ${nar.id}/${role}`);
          if (amount === 0 && outs.some(o => show(o) !== before))
            problems.push(`varyBars edited ${nar.id}/${role} at amount 0`);
          if (amount === 0) continue;

          for (let p = 1; p < outs.length; p++) {
            if (show(outs[p]) === before) problems.push(`varyBars left pass ${p} of ${nar.id}/${role} untouched`);
            // the bars are still a melody: right shape, degrees inside the scale
            if (outs[p].length !== base.length) problems.push(`varyBars changed the bar count of ${nar.id}`);
            for (const bar of outs[p]) {
              if (bar.length !== B) problems.push(`varyBars changed the bar width of ${nar.id}`);
              for (const col of bar) for (const d of col)
                if (!(Number.isInteger(d) && d >= 0 && d < ND)) problems.push(`varyBars wrote degree ${d} in ${nar.id}`);
            }
            // still the same tune: most of where the notes fall is untouched
            const keep = new Set(onsets(base));
            const same = onsets(outs[p]).filter(o => keep.has(o)).length / Math.max(1, keep.size);
            worstKeep = Math.min(worstKeep, same);
            if (same < 0.6) problems.push(`varyBars rewrote ${nar.id}/${role} pass ${p} — only ${(same * 100) | 0}% of the phrase left`);
            // same inputs, same output, every time — a shared song has to sound like the one that was shared
            if (show(M.varyBars(base, { pass: p, role, nd: ND, amount })) !== show(outs[p]))
              problems.push(`varyBars is not deterministic (${nar.id}/${role} pass ${p})`);
            const d = noteCount(outs[p]) - noteCount(base);
            spread[d > 0 ? "more" : d < 0 ? "fewer" : "same"]++;
          }
          combos++;
          if (new Set(outs.map(show)).size < 4) repeats++;
        }
        // every step up the menu has to do more than the one below it, or it is an entry that does nothing
        for (let L = 2; L < LEVELS.length; L++) for (let p = 1; p < 4; p++) {
          steps++;
          if (show(M.varyBars(base, { pass: p, role, nd: ND, amount: LEVELS[L - 1] }))
            === show(M.varyBars(base, { pass: p, role, nd: ND, amount: LEVELS[L] }))) flat++;
        }
      }
    }
  }
  // the whole point of the feature: four passes of a section, four different melodies, every time
  if (repeats) problems.push(`${repeats}/${combos} narrative/role combos still repeat a pass`);
  if (M.VARY_LEVELS[0][0] !== 0) problems.push("the first variation level is not 'leave it alone'");
  if (M.VARY_LEVELS.length < 2) problems.push("there is nothing to choose between in VARY_LEVELS");
  // note count is one of the axes a repeat can vary along, and it has to move both ways: only ever
  // adding notes makes every later chorus busier than the last, only ever removing them wears it away
  if (!(spread.more > combos / 4)) problems.push(`only ${spread.more} varied passes have more notes than the first`);
  if (!(spread.fewer > combos / 4)) problems.push(`only ${spread.fewer} varied passes have fewer notes than the first`);
  /* A phrase of two long notes per bar really can run out of edits, so a level matching the one
     below it is not a bug on its own — a level that does so *often* is a menu entry pretending to
     do something. Two per cent is the room a genuinely exhausted phrase needs. */
  if (flat > steps * 0.02) problems.push(`${flat}/${steps} steps up the variation menu change nothing`);
  /* The variation amount is a continuous slider now, so the fractions between the levels have to
     be real settings: a fractional amount resolves — deterministically, per pass — to one of the
     two integer amounts either side of it, never to a rounding of the dial and never differently
     on a second open of the same song. And across the corpus the dial has to actually turn: some
     passes at 1.5 take the extra edit and some don't, or the fraction is a label for "2". */
  {
    let above = 0, below = 0;
    for (const nar of M.NARRATIVES) for (const role of ROLES) {
      const spots = M.rhythmSpots(M.ROLE_RHYTHM[role] || "straight", 8, 2, 4);
      const base = nar.gen({ nBars: 4, B: 8, sub: 2, nd: ND, spots,
        chordDegs: [[0, 2, 4], [3, 5, 0], [4, 6, 1], [0, 2, 4]], role,
        pass: 0, passes: 4, idx: 0, total: 4, frac: 0 });
      for (let p = 1; p <= 3; p++) {
        const mid = show(M.varyBars(base, { pass: p, role, nd: ND, amount: 1.5 }));
        if (mid !== show(M.varyBars(base, { pass: p, role, nd: ND, amount: 1.5 })))
          problems.push(`a fractional variation amount is not deterministic (${nar.id}/${role} pass ${p})`);
        const lo = show(M.varyBars(base, { pass: p, role, nd: ND, amount: 1 }));
        const hi = show(M.varyBars(base, { pass: p, role, nd: ND, amount: 2 }));
        if (mid !== lo && mid !== hi)
          problems.push(`amount 1.5 matches neither 1 nor 2 on ${nar.id}/${role} pass ${p}`);
        if (mid === hi) above++; else below++;
      }
    }
    if (!above || !below)
      problems.push(`a fractional amount never lands ${above ? "below" : "above"} itself — the slider's in-between positions do nothing`);
  }
  for (const v of M.VARIATIONS) if (!v.id || typeof v.apply !== "function") problems.push("a VARIATION has no id or no apply");
  /* Each kind of edit checked on its own. Two properties per variation: it fires somewhere in the
     corpus at all (an edit whose preconditions are never met is dead code that reads as a feature),
     and when more than one bar can take it, different passes land on different results — the reason
     `overBars` picks from the bars that qualify rather than walking from a rotated start. */
  {
    // held notes, adjacent pairs, gaps and leaps — enough of each that every variation has at
    // least two places it could go, so "same result every pass" means the code, not the phrase
    const phrase = () => [[[2], [2], [2], [4], [6], [6], [], []], [[1], [1], [3], [3], [5], [5], [], []],
                          [[4], [4], [], [2], [2], [2], [], [1]], [[6], [], [4], [4], [], [2], [2], []]];
    const dead = [], stuck = [];
    for (let vi = 0; vi < M.VARIATIONS.length; vi++) {
      const v = M.VARIATIONS[vi], outs = [];
      // r is fixed and the pass is the only thing moving, exactly as varyBars calls it
      const r = M.hash01(vi * 977);
      for (let pass = 1; pass <= 4; pass++) {
        const bars = phrase();
        outs.push(v.apply(bars, ND, r, pass) ? show(bars) : null);
      }
      if (outs.every(o => o === null)) dead.push(v.id);
      else if (new Set(outs.filter(Boolean)).size < 2) stuck.push(v.id);
      // every bar of this phrase has room for something, so a pass that comes back empty means the
      // variation gave up on a bar instead of looking at the next one
      else if (outs.some(o => o === null)) stuck.push(v.id + " (gives up on some passes)");
    }
    if (dead.length) problems.push(`variations that never fire: ${dead.join(", ")}`);
    if (stuck.length) problems.push(`variations that give every pass the same edit: ${stuck.join(", ")}`);
  }
  /* Longer runs too. A dance structure can play a section six or eight times, and a guarantee that
     only holds for four repeats is not much of one. A few phrases genuinely run out of distinct
     edits by the sixth pass, so this is a proportion rather than an absolute. */
  {
    let long = 0, longTot = 0;
    for (const [B, sub] of [[8, 2], [16, 4]]) for (const nar of M.NARRATIVES) for (const role of ROLES) {
      const spots = M.rhythmSpots(M.ROLE_RHYTHM[role] || "straight", B, sub, 4);
      for (const nBars of [2, 8]) {
        const cd = Array.from({ length: nBars }, (_, i) => [[0, 2, 4], [3, 5, 0], [4, 6, 1]][i % 3]);
        const base = nar.gen({ nBars, B, sub, nd: ND, spots, chordDegs: cd, role,
          pass: 0, passes: 4, idx: 0, total: 4, frac: 0 });
        for (const amount of LEVELS.filter(Boolean)) {
          longTot++;
          if (new Set([0, 1, 2, 3, 4, 5].map(p => show(M.varyBars(base, { pass: p, role, nd: ND, amount })))).size < 6) long++;
        }
      }
    }
    if (long > longTot * 0.05) problems.push(`${long}/${longTot} sections repeat a pass over six plays`);
    console.log(`  over six plays of a section: ${longTot - long}/${longTot} still give six different melodies`);
  }
  console.log(`repeat variation: ${M.VARIATIONS.length} kinds of edit over ${combos} narrative×role×level combos, ${combos - repeats} give four different passes`);
  console.log(`  note count vs the first pass: ${spread.more} more, ${spread.fewer} fewer, ${spread.same} unchanged; ${(worstKeep * 100) | 0}% of the phrase survives at worst`);
  console.log(`  stepping up a level changes the result in ${steps - flat}/${steps} cases`);
}

/* ---- varying the repeats *inside* one section ----
   The other half of the same problem. A section is usually one motif said three or four times, and
   said identically it is the thing that wears out first — a hook grid is eight bars of the same two.
   varyWithin finds the restatements and edits everything but the first of them. What has to hold is
   the same tension as varyBars, one level down: the restatements have to stop being restatements,
   the opening statement has to survive untouched, and a melody that never repeats itself must not be
   quietly rewritten just because the writer pressed the button. */
{
  const show = bars => bars.map(b => b.map(c => (c && c.length ? c[0] : ".")).join("")).join("|");
  const dup = bars => bars.map(b => b.map(c => [...c]));
  const rep = (unit, n) => Array.from({ length: n }, () => dup(unit)).flat();
  const ND = 7;
  const LEVELS = [1, 2, 3];

  // the slice lengths it will consider: only ones that fit twice and divide the section evenly
  if (M.unitSpans(8).join() !== "4,2,1") problems.push(`unitSpans(8) offered ${M.unitSpans(8).join()}`);
  // a three-bar section can hold three one-bar motifs and nothing longer; a one-bar one holds nothing
  if (M.unitSpans(3).join() !== "1") problems.push(`unitSpans(3) offered ${M.unitSpans(3).join()}`);
  if (M.unitSpans(1).length) problems.push("unitSpans found a motif in a single bar that cannot hold two of anything");
  if (M.unitSpans(6).join() !== "3,2,1") problems.push(`unitSpans(6) offered ${M.unitSpans(6).join()}`);

  /* Which slices count as the same motif. The sparse case is the one that matters: in a sixteenth
     grid two unrelated bars agree on most of their columns by being empty in the same places, and a
     similarity that counts the silence calls every quiet melody a repeat of itself. */
  {
    const a = [[[0], [], [], [], [2], [], [], []]], b = [[[5], [], [], [], [3], [], [], []]];
    if (M.sameMotif(a, b)) problems.push("sameMotif called two different sparse bars a repeat — it is counting the silence");
    if (!M.sameMotif(a, dup(a))) problems.push("sameMotif does not recognise a literal repeat");
    // a sequence: same rhythm, same shape, every note moved up a step. Shares no note with the
    // phrase it restates, so nothing pitch-based will ever find it, and it is just as tiring.
    const seq = [a[0].map(c => (c.length ? [c[0] + 1] : []))];
    if (!M.sameMotif(a, seq)) problems.push("sameMotif misses a sequence — a transposed restatement of the same phrase");
    // and a phrase that merely shares the rhythm is not the same motif
    const other = [[[0], [], [], [], [6], [], [], []]];
    if (M.sameMotif(a, other)) problems.push("sameMotif grouped two phrases that only share a rhythm");
  }

  // where the runs are: which slice each one restates and how many statements came before it
  {
    const A = [[[0], [], [2], [], [4], [], [], []]], B = [[[4], [], [3], [], [1], [], [], []]];
    const runs = M.motifRuns([...A, ...B, ...A, ...B], 1);
    if (runs.map(r => r.first).join() !== "0,1,0,1") problems.push(`motifRuns grouped A B A B as ${runs.map(r => r.first).join()}`);
    if (runs.map(r => r.occ).join() !== "0,0,1,1") problems.push(`motifRuns counted A B A B statements as ${runs.map(r => r.occ).join()}`);
    const four = M.motifRuns(rep(A, 4), 1);
    if (four.map(r => r.occ).join() !== "0,1,2,3") problems.push(`motifRuns counted four statements as ${four.map(r => r.occ).join()}`);
  }

  let secs = 0, dullFirst = 0, dullPair = 0, worstKeep = 1, nothing = 0, flat = 0, steps = 0;
  for (const [B, sub] of [[8, 2], [16, 4]]) {
    for (const nar of M.NARRATIVES) {
      for (const role of ["C", "V", "B"]) {
        const spots = M.rhythmSpots(M.ROLE_RHYTHM[role] || "straight", B, sub, 4);
        // a two-bar motif, the shape a hook actually has, and a one-bar riff
        const phrase = n => nar.gen({ nBars: n, B, sub, nd: ND, spots,
          chordDegs: Array.from({ length: n }, (_, i) => [[0, 2, 4], [3, 5, 0]][i % 2]), role,
          pass: 0, passes: 4, idx: 0, total: 4, frac: 0 });
        for (const [motif, times] of [[phrase(2), 4], [phrase(1), 4], [phrase(2), 2]]) {
          const base = rep(motif, times), before = show(base);
          for (const amount of LEVELS) {
            const res = M.varyWithin(base, { nd: ND, amount, seed: 7 });
            // the melody it was handed is the writer's own — editing it in place would edit the grid
            if (show(base) !== before) problems.push(`varyWithin mutated the bars it was given (${nar.id})`);
            if (!res.repeats) { nothing++; continue; }
            secs++;
            const out = res.bars;
            // still a melody, and still this melody's shape
            if (out.length !== base.length) problems.push(`varyWithin changed the bar count of ${nar.id}`);
            for (const bar of out) {
              if (bar.length !== B) problems.push(`varyWithin changed the bar width of ${nar.id}`);
              for (const col of bar) for (const d of col)
                if (!(Number.isInteger(d) && d >= 0 && d < ND)) problems.push(`varyWithin wrote degree ${d} in ${nar.id}`);
            }
            // same input, same output — a sketch has to sound like the one that was shared
            if (show(M.varyWithin(base, { nd: ND, amount, seed: 7 }).bars) !== show(out))
              problems.push(`varyWithin is not deterministic (${nar.id}/${role})`);
            /* The opening statement is the thing the rest are heard as variations of. Edit that too
               and the writer has not been given a variation, they have been given a different tune. */
            const runs = M.motifRuns(base, res.span);
            const slice = (bars, r) => show(bars.slice(r.at, r.at + res.span));
            for (const r of runs) if (!r.occ && slice(out, r) !== slice(base, r))
              problems.push(`varyWithin edited the first statement of ${nar.id}/${role}`);
            // and every restatement has to have stopped being one
            const fams = {};
            for (const r of runs) (fams[r.first] = fams[r.first] || []).push(slice(out, r));
            for (const first in fams) {
              const said = fams[first];
              if (said.length < 2) continue;
              if (said.slice(1).some(x => x === said[0])) dullFirst++;
              // …and from each other: two identical later statements is the same problem one along
              if (new Set(said).size < said.length) dullPair++;
            }
            // it is still the same motif: most of where the notes fall is where it wrote them
            const onsets = bars => bars.flatMap((b, i) => M.barNotes(b).map(n => i + ":" + n.c));
            const keep = new Set(onsets(base));
            const same = onsets(out).filter(o => keep.has(o)).length / Math.max(1, keep.size);
            worstKeep = Math.min(worstKeep, same);
            if (same < 0.55) problems.push(`varyWithin rewrote ${nar.id}/${role} — only ${(same * 100) | 0}% of the section left`);
          }
          // pressing it again has to do more than pressing it once
          for (const amount of [2, 3]) {
            steps++;
            if (show(M.varyWithin(base, { nd: ND, amount: amount - 1, seed: 7 }).bars)
              === show(M.varyWithin(base, { nd: ND, amount, seed: 7 }).bars)) flat++;
          }
        }
      }
    }
  }
  if (dullFirst) problems.push(`${dullFirst} motifs still restate their opening statement note-for-note`);
  if (dullPair) problems.push(`${dullPair} motifs say the same thing twice after being varied`);
  if (nothing) problems.push(`${nothing} sections built out of a repeated motif came back with no repeats found`);
  if (flat > steps * 0.05) problems.push(`${flat}/${steps} steps up the in-section variation change nothing`);
  // amount 0 is the control's off position and has to be exactly that
  {
    const A = [[[0], [], [2], [], [4], [], [], []]], base = rep(A, 4);
    const off = M.varyWithin(base, { nd: ND, amount: 0 });
    if (show(off.bars) !== show(base)) problems.push("varyWithin edited a melody at amount 0");
    if (off.repeats) problems.push("varyWithin reported repeats at amount 0 — the caller would say it varied something");
  }
  /* A melody that never says the same thing twice has nothing to make less boring, and rewriting it
     anyway is the button doing the one thing the writer did not ask for. */
  {
    const thru = [[[0], [], [1], [], [2], [], [3], []], [[4], [], [5], [], [6], [], [5], []],
                  [[3], [], [1], [], [0], [], [2], []], [[6], [], [4], [], [2], [], [0], []]];
    for (const amount of LEVELS) {
      const res = M.varyWithin(thru, { nd: ND, amount, seed: 3 });
      if (res.repeats) problems.push("varyWithin found a repeat in a through-composed melody");
      if (show(res.bars) !== show(thru)) problems.push("varyWithin rewrote a melody that never repeats itself");
    }
    // an empty grid is the same answer, and must not throw on the way to it
    const blank = M.blankBars(4, 8);
    if (M.varyWithin(blank, { nd: ND, amount: 2 }).repeats) problems.push("varyWithin found a repeat in an empty grid");
  }
  /* The slice length is chosen, not assumed. A section built out of a two-bar hook stated four times
     is four statements of one motif however you cut it, and cutting it into single bars would leave
     no first statement of the second half intact. */
  {
    const A = [[[0], [], [2], [], [4], [], [], []], [[4], [], [3], [], [1], [], [], []]];
    const res = M.varyWithin(rep(A, 4), { nd: ND, amount: 1, seed: 5 });
    if (!res.span) problems.push("varyWithin found no motif in a section that is one phrase four times");
    if (res.repeats < 3) problems.push(`varyWithin found only ${res.repeats} restatements of a phrase stated four times`);
    if (res.varied < res.repeats) problems.push(`varyWithin left ${res.repeats - res.varied} restatement(s) untouched`);
  }
  console.log(`in-section variation: ${secs} repeated-motif sections varied, ${(worstKeep * 100) | 0}% of the section survives at worst`);
  console.log(`  pressing it again changes the result in ${steps - flat}/${steps} cases`);
}

/* ---- the hook toolkit: report card, syncopation, tournament pool, bass riffs ----
   Everything in hook.js is pure and deterministic, and the fixes have one job: applying a check's
   fix must improve (or at worst hold) that check's own score without corrupting the grid. */
{
  const ND = 7;
  const show = bars => bars.map(b => b.map(c => (c.length ? c[0] : ".")).join("")).join("|");
  const dupB = bars => bars.map(b => b.map(c => [...c]));
  const mkBar = spec => {                                     // "0.1.2.5." → [[0],[],[1],[],[2],[],[5],[]]
    return [...spec].map(ch => (ch === "." ? [] : [Number(ch)]));
  };
  const legal = (bars, what) => {
    for (const bar of bars) for (const col of bar) for (const d of col)
      if (!(Number.isInteger(d) && d >= 0 && d < ND)) problems.push(`${what} wrote degree ${d}`);
  };

  // a deliberately well-made hook: stepwise with one answered leap, a restated two-bar motif that
  // drifts on its restatement, four notes a bar, ending on the tonic chord's root
  const good = [mkBar("0.1.2.5."), mkBar("4.2.1.0."), mkBar("0.1.2.5."), mkBar("4.2.1.1.")];
  // and a deliberately bad one: busy, wide, never restating itself, ending nowhere
  const bad = [
    mkBar("06152604"), mkBar("30462513"), mkBar("51260340"), mkBar("64031526")];
  const u = bars => ({ bars, nd: ND, sub: 2, chordDegs: [0, 3, 0, 6] });

  const gr = M.hookReport(u(good)), br = M.hookReport(u(bad));
  if (!(gr.score >= 70)) problems.push(`hookReport scores a well-made hook ${gr.score} — the card calls good shapes bad`);
  if (!(br.score < gr.score - 15)) problems.push(`hookReport scores a scribble ${br.score} vs ${gr.score} — it cannot tell them apart`);
  for (const rep of [gr, br]) for (const c of rep.checks) {
    if (!(c.score >= 0 && c.score <= 1)) problems.push(`hook check ${c.id} scored ${c.score}`);
    if (!c.detail) problems.push(`hook check ${c.id} has no reading`);
    if (c.fix && !c.fixLabel) problems.push(`hook check ${c.id} has a fix but no label for it`);
  }
  // the report reads the melody; it must never write it
  const before = show(bad);
  M.hookReport(u(bad));
  if (show(bad) !== before) problems.push("hookReport mutated the bars it was scoring");

  // every offered fix improves its own line (or at worst holds it), stays legal, stays deterministic
  let fixes = 0;
  for (const c of br.checks) {
    if (!c.fix) continue;
    fixes++;
    const fixed = c.fix(dupB(bad), u(bad));
    if (show(bad) !== before) problems.push(`fix ${c.id} mutated its input`);
    legal(fixed, `fix ${c.id}`);
    if (fixed.length !== bad.length) problems.push(`fix ${c.id} changed the bar count`);
    const spec = M.HOOK_CHECKS.find(x => x.id === c.id);
    const after = spec.run(u(fixed));
    if (after && after.score < c.score - 1e-9)
      problems.push(`fix ${c.id} made its own check worse (${c.score.toFixed(2)} → ${after.score.toFixed(2)})`);
    if (show(c.fix(dupB(bad), u(bad))) !== show(fixed)) problems.push(`fix ${c.id} is not deterministic`);
  }
  if (!fixes) problems.push("the bad hook's report offered no fixes at all");

  /* Syncopation: anticipation moves an on-beat note half a beat early and holds it through the
     beat it left — level 1 the backbeats, level 2 every beat but the bar's downbeat. */
  {
    const straight = [mkBar("0.1.2.3.")];
    const one = M.syncopateBars(straight, 2, 1);
    const onsets = bars => bars.flatMap((b, i) => M.barNotes(b).map(n => ({ c: i * b.length + n.c, d: n.d, len: n.len })));
    if (show(straight) !== show([mkBar("0.1.2.3.")])) problems.push("syncopateBars mutated its input");
    const o1 = onsets(one);
    if (o1.map(n => n.c).join() !== "0,1,4,5") problems.push(`level-1 syncopation put onsets at ${o1.map(n => n.c).join()}, wanted 0,1,4,5`);
    if (o1.map(n => n.d).join() !== "0,1,2,3") problems.push("syncopation changed the notes themselves");
    if (o1[1].len !== 2) problems.push("a pushed note no longer holds through the beat it left");
    const two = M.syncopateBars(straight, 2, 2);
    if (onsets(two).map(n => n.c).join() !== "0,1,3,5") problems.push(`level-2 syncopation put onsets at ${onsets(two).map(n => n.c).join()}, wanted 0,1,3,5`);
    if (show(M.syncopateBars(straight, 2, 0)) !== show(straight)) problems.push("syncopation level 0 is not the identity");
    // a push never swallows a note: with the half-beat before it already an onset, the note stays
    const packed = [[[0], [5], [1], [], [], [], [], []]];
    const kept = M.syncopateBars(packed, 2, 2);
    if (M.barNotes(kept[0]).length !== M.barNotes(packed[0]).length)
      problems.push("syncopation swallowed a note whose push landed on another onset");
    // …including the sly case: pushed against the tail of a note holding the SAME pitch, the two
    // would read back as one held note and an onset would silently vanish
    const samePitch = [[[2], [2], [2], [], [2], [], [], []]];   // a held 2, then 2 again on beat 2
    if (M.barNotes(M.syncopateBars(samePitch, 2, 2)[0]).length !== M.barNotes(samePitch[0]).length)
      problems.push("syncopation merged a pushed note into a same-pitch neighbour");
  }

  /* The tournament pool: a family of rivals, none of them the parent, no two of them the same. */
  {
    const pool = M.hookPool(good, { n: 8, seed: 3, nd: ND });
    if (pool.length < 6) problems.push(`hookPool found only ${pool.length} distinct rivals of 8 asked for`);
    const keys = pool.map(show);
    if (keys.includes(show(good))) problems.push("hookPool handed back the parent as a rival");
    if (new Set(keys).size !== keys.length) problems.push("hookPool repeated a rival");
    for (const v of pool) legal(v, "hookPool");
    if (M.hookPool(good, { n: 8, seed: 3, nd: ND }).map(show).join() !== keys.join())
      problems.push("hookPool is not deterministic");
    const mut = M.mutateHook(good, { seed: 5, pass: 2, nd: ND });
    if (show(mut) === show(good)) problems.push("mutateHook returned its parent unchanged");
  }

  /* Bass riffs: written into the kick's holes — never a token on a sixteenth the kick owns. */
  {
    const fourFloor = [Array.from({ length: 16 }, (_, i) => (i % 4 === 0 ? "K" : ""))];
    const seeds = [];
    for (let seed = 0; seed < 8; seed++) {
      const riff = M.bassRiffBars(fourFloor, 16, 4, 4, seed);
      if (riff.length !== 4) problems.push("bassRiffBars wrote the wrong number of bars");
      riff.forEach((bar, b) => {
        if (bar.length !== 16) problems.push("bassRiffBars wrote the wrong number of steps");
        bar.forEach((tok, s) => {
          if (tok && !["R", "F", "O"].includes(tok)) problems.push(`bassRiffBars wrote token ${tok}`);
          if (tok && s % 4 === 0) problems.push(`bassRiffBars put a note on the kick's sixteenth (bar ${b}, step ${s})`);
        });
        if (bar.filter(Boolean).length < 2) problems.push("bassRiffBars wrote a bar with fewer than two notes");
      });
      if (M.bassRiffBars(fourFloor, 16, 4, 4, seed).map(b => b.join()).join("|") !== riff.map(b => b.join()).join("|"))
        problems.push("bassRiffBars is not deterministic");
      seeds.push(riff.map(b => b.join()).join("|"));
    }
    if (new Set(seeds).size < 3) problems.push("bassRiffBars barely varies with the seed — pressing again should find a different riff");
    // 3/4: a 12-step grid, and cells past the barline drop out rather than wrapping
    const waltz = M.bassRiffBars([Array.from({ length: 12 }, (_, i) => (i === 0 ? "K" : ""))], 12, 3, 2, 1);
    if (waltz.some(bar => bar.length !== 12)) problems.push("bassRiffBars broke on a 3/4 grid");
  }

  console.log(`hook toolkit: report card ${gr.score} vs ${br.score} on good vs bad, ${fixes} fixes verified, `
    + `pool + syncopation + kick-hole riffs deterministic`);
}

/* ---- per-part modulation ----
   Every setting a part carries is one entry in MOD_GROUPS, and that entry is read by five different
   things: the control that draws it, the scheduler that applies it, the packer that saves it, the
   copier that moves it between sections and the reset that clears it. A bad entry is therefore not a
   cosmetic problem — a wrong default is a part that sounds different the moment it is saved and
   reloaded, and a key that song.js does not carry is a setting that silently vanishes from a
   shared link. All of that is checked from the table itself, so it stays true as the table grows. */
{
  const TABLES = { ARPS: M.ARPS.map(a => [a.id]), GATES: M.GATES.map(x => [x.id]),
    ARP_RATES: M.ARP_RATES, LFO_RATES: M.LFO_RATES, ECHO_TIMES: M.ECHO_TIMES };
  const optsOf = md => (typeof md.opts === "string" ? TABLES[md.opts] : md.opts) || [];
  const seen = new Set();
  for (const g of M.MOD_GROUPS) {
    if (!g.id || !g.name || !Array.isArray(g.mods) || !g.mods.length)
      problems.push(`modulation group ${g.id || "?"} has no id, name or mods`);
    if (!g.tip) problems.push(`modulation group ${g.id} has no explanation`);
    for (const md of g.mods) {
      if (seen.has(md.k)) problems.push(`modulation ${md.k} is listed twice`);
      seen.add(md.k);
      if (!md.name) problems.push(`modulation ${md.k} has no name`);
      // every control carries its own explanation: 28 unlabelled sliders is a synth manual
      if (!md.tip || md.tip.length < 20) problems.push(`modulation ${md.k} has no real tip`);
      if (!["sel", "amt", "bi"].includes(md.kind)) problems.push(`modulation ${md.k} has kind "${md.kind}", which nothing draws`);
      if (!("dflt" in md)) problems.push(`modulation ${md.k} has no default`);
      // a default must be reachable from the control, or a part can never be put back
      if (md.kind === "sel") {
        const opts = typeof md.opts === "string" ? TABLES[md.opts] : md.opts;
        if (!opts || !opts.length) problems.push(`modulation ${md.k} names an option table that does not exist: ${md.opts}`);
        else if (md.off == null && !opts.some(([v]) => v === md.dflt))
          problems.push(`modulation ${md.k}'s default ${JSON.stringify(md.dflt)} is not one of its options`);
        else if (opts.some(([v]) => typeof v !== typeof (md.off != null ? opts[0][0] : md.dflt)))
          problems.push(`modulation ${md.k} mixes option types — a menu hands back a string and the scheduler compares with ===`);
      } else {
        if (typeof md.max !== "number") problems.push(`modulation ${md.k} is a slider with no maximum`);
        const min = md.auto ? -1 : (md.min != null ? md.min : 0);
        const shown = md.dflt == null ? -1 : md.dflt * (md.scale || 1);
        if (shown < min || shown > md.max)
          problems.push(`modulation ${md.k}'s default sits outside its own slider`);
        if (md.kind === "bi" && md.min >= 0) problems.push(`modulation ${md.k} is centred on zero but cannot go below it`);
      }
      if (md.needs && !M.MOD_BY_KEY[md.needs]) problems.push(`modulation ${md.k} depends on ${md.needs}, which is not a modulation`);
    }
  }
  // A part with no settings must read as every default. This is what makes "reset" and "a brand new
  // part" the same thing, and what stops an old saved sketch changing the moment it is opened.
  for (const md of M.MODS) {
    if (M.modOf({}, md.k) !== md.dflt) problems.push(`a fresh part does not read ${md.k} as its default`);
    if (M.modOf({ [md.k]: md.dflt }, md.k) !== md.dflt) problems.push(`${md.k} does not survive being set to its own default`);
  }
  if (M.modCount({}) !== 0) problems.push("a part with no settings is not counted as unmodulated");
  /* What "off" is, written out a second time and on purpose. `modOf` returning the default is
     circular — it proves the table agrees with itself, not that the default is silent. These are
     the values the scheduler treats as no modulation at all: a filter fully open, a note at its
     written length, every note played, nothing added. Change a default in melody.js and this fails
     until the change is made here too, which is the point — a default that is not a no-op means a
     part sounds different the moment it is saved and reopened. */
  const NEUTRAL = {
    // Pattern — which notes play and when
    arp:"", arpRate:4, arpOct:1, euclid:0, euclidLen:16, retro:"", shift:0, rate:1, gate:"", gateLen:16,
    // Repeat — the same note more than once
    ratchet:1, ratchetFade:0, echo:0, echoTime:1, echoFade:50, echoPitch:0, strum:0, strumDir:"up",
    // Pitch — which notes come out
    semis:0, dia:0, snap:"", invert:"", chord:"", voicing:"close", rpitch:0, octJump:0, oct2:0, detune:0,
    // Tone, Envelope, Movement
    cut:100, res:0, hp:0, fenv:0, fdec:30, drive:0,
    atk:0, dec:0, sus:0, rel:0, vfilt:0,
    wob:0, wobRate:2, trem:0, tremRate:4, pan:0, apan:0, apanRate:1,
    // Feel and Space
    len:100, rlen:0, nudge:0, hum:0, swing:0, prob:100, accent:0, rvel:0, ramp:0,
    send:0, verb:0, duck:null,
  };
  for (const md of M.MODS) {
    if (!(md.k in NEUTRAL)) problems.push(`modulation ${md.k} has no declared "off" value in the test`);
    else if (md.dflt !== NEUTRAL[md.k])
      problems.push(`${md.k} defaults to ${JSON.stringify(md.dflt)}, but "off" for it is ${JSON.stringify(NEUTRAL[md.k])}`);
  }
  for (const k of Object.keys(NEUTRAL)) if (!M.MOD_BY_KEY[k]) problems.push(`the test declares an "off" value for ${k}, which no longer exists`);
  // every modulation moved off its default — the state a fully-worked part is in
  const allOn = Object.fromEntries(M.MODS.map(md => [md.k, md.kind === "sel"
    ? optsOf(md).map(([v]) => v).find(v => v !== md.dflt)
    : (md.dflt === md.max / (md.scale || 1) ? 0 : md.max / (md.scale || 1))]));
  if (M.modCount(allOn) !== M.MODS.length)
    problems.push(`a fully modulated part counts ${M.modCount(allOn)} of ${M.MODS.length} settings`);

  /* Saving. Every modulation except the handful song.js packs under their own legacy key has to be
     in LAYER_FX, or it is dropped from saved sketches and shared links without a word. */
  const fxKeys = new Set(M.LAYER_FX.map(([k]) => k));
  for (const md of M.MODS) {
    if (md.own && fxKeys.has(md.k)) problems.push(`${md.k} is packed twice — once by song.js and once through LAYER_FX`);
    if (!md.own && !fxKeys.has(md.k)) problems.push(`${md.k} is not in LAYER_FX, so it is lost when a song is saved`);
  }
  // and the round trip itself, with every modulation moved off its default
  {
    const layer = { bars: [[[0], []], [[2], []]], instr: "saw", oct: 1, vol: 0.7, mute: false, solo: true, ...allOn };
    const doc = M.makeSong({ progId: "axis", melos: { progId: "axis", secs: { V1: { ids: ["a", "b"], layers: [layer] } } } });
    const back = M.songMelos(doc).secs.V1.layers[0];
    for (const md of M.MODS)
      if (M.modOf(back, md.k) !== allOn[md.k])
        problems.push(`${md.k} does not survive a save: ${JSON.stringify(allOn[md.k])} → ${JSON.stringify(M.modOf(back, md.k))}`);
    for (const [k, v] of [["instr", "saw"], ["oct", 1], ["vol", 0.7], ["solo", true]])
      if (back[k] !== v) problems.push(`a part's ${k} does not survive a save`);
  }

  /* The drive curve. It is the one non-linear thing in a part's chain, so it is also the one that
     could quietly change a part's level, or fold the signal back on itself and turn a lead into a
     square wave. It has to be odd, rising, inside ±1, and hit exactly ±1 at the ends. */
  for (const amt of [0.05, 0.25, 0.5, 1]) {
    const c = M.driveCurve(amt);
    if (c.length < 256) problems.push(`drive curve at ${amt} is only ${c.length} points — audible stair-stepping`);
    if (Math.abs(c[0] + 1) > 1e-6 || Math.abs(c[c.length - 1] - 1) > 1e-6)
      problems.push(`drive curve at ${amt} does not reach ±1 — it changes the part's level`);
    for (let i = 1; i < c.length; i++) if (c[i] < c[i - 1])
      problems.push(`drive curve at ${amt} falls at ${i} — it would fold the waveform, not overdrive it`);
    // an even-length curve has no sample at exactly zero, so the property to check is that it is
    // odd — c(-x) = -c(x). A curve that is not adds a DC offset to everything through it.
    for (let i = 0; i < c.length; i++) if (Math.abs(c[i] + c[c.length - 1 - i]) > 1e-6)
      { problems.push(`drive curve at ${amt} is not odd-symmetric — it adds a DC offset`); break; }
    if (amt > 0.1 && !(c[(c.length * 0.75) | 0] > 0.75))
      problems.push(`drive curve at ${amt} does not actually compress the peaks`);
  }

  /* Everything that bakes noise into audio must be reproducible. Two exports of one song have to be
     the same file, and a stem has to carry the same noise as the mix it came from — with
     Math.random it carried a different one and the stems stopped adding up. */
  {
    const bufOf = fn => { const b = fn(); return Array.from(b.getChannelData ? b.getChannelData(0).slice(0, 64) : []); };
    const a = bufOf(() => M.makeNoise(ctx)), b = bufOf(() => M.makeNoise(ctx));
    if (a.join() !== b.join()) problems.push("the drum noise buffer is not reproducible");
    if (!a.some(v => v !== 0) || a.every(v => v === a[0])) problems.push("the drum noise buffer is not noise");
    nodes.length = 0;
    const r1 = M.makeReverb(ctx, baseNode("dest"), 0.2, 0.2);
    const c1 = nodes.find(n => n._kind === "conv");
    nodes.length = 0;
    M.makeReverb(ctx, baseNode("dest"), 0.2, 0.2);
    const c2 = nodes.find(n => n._kind === "conv");
    const ir = c => Array.from(c.buffer.getChannelData(0).slice(0, 64));
    if (ir(c1).join() !== ir(c2).join()) problems.push("the reverb impulse is not reproducible");
    // the wet-only send is a different room from the bus reverb, or sending to it would just
    // double the part through the same tail
    nodes.length = 0;
    M.makeVerbSend(ctx, baseNode("dest"), 0.2);
    const c3 = nodes.find(n => n._kind === "conv");
    if (ir(c1).join() === ir(c3).join()) problems.push("the reverb send uses the same impulse as the bus reverb");
    if (!ir(c3).some(v => v !== 0)) problems.push("the reverb send has a silent impulse");
  }

  /* The Euclidean generator. It has an actual right answer — E(3,8) is the tresillo and nothing
     else — so this checks named rhythms rather than only shape. The general properties matter too:
     the right number of hits, and the gaps between them never differing by more than one step,
     which is the definition of "as evenly as possible" and the whole point of the algorithm. */
  {
    const pat = (k, n) => Array.from({ length: n }, (_, i) => M.euclidHit(k, n, i) ? "x" : ".").join("");
    for (const [k, n, want, name] of [
      [3, 8, "x..x..x.", "tresillo"],
      [4, 16, "x...x...x...x...", "four to the floor"],
      [2, 4, "x.x.", "backbeat"],
      [4, 8, "x.x.x.x.", "eighths"],
    ]) if (pat(k, n) !== want) problems.push(`euclid(${k},${n}) is ${pat(k, n)}, not the ${name} ${want}`);
    for (let n = 2; n <= 32; n++) for (let k = 1; k < n; k++) {
      const p = pat(k, n), hits = [...p].filter(c => c === "x").length;
      if (hits !== k) problems.push(`euclid(${k},${n}) placed ${hits} hits, not ${k}`);
      // gaps between successive hits, round the loop
      const at = [...p].map((c, i) => c === "x" ? i : -1).filter(i => i >= 0);
      const gaps = at.map((v, i) => (i ? v - at[i - 1] : v + n - at[at.length - 1]));
      if (Math.max(...gaps) - Math.min(...gaps) > 1)
        problems.push(`euclid(${k},${n}) is uneven: gaps ${Math.min(...gaps)}..${Math.max(...gaps)}`);
    }
    if (!M.euclidHit(0, 16, 3)) problems.push("euclid with no hits set should not silence the part");
    if (!M.euclidHit(16, 16, 5)) problems.push("euclid with as many hits as steps should let everything through");
  }
  /* The column map — the four Pattern effects that all reduce to "which written column do I read".
     Reimplemented here from the source's own expression so the properties are stated independently
     of it: half time must *stretch* the pattern rather than skip every other note (reading the same
     column twice would retrigger it, which is the bug this shape exists to avoid), reverse must be
     an exact mirror, and shift must be a rotation that loses nothing. */
  {
    const MB = 8, N = 16;
    const src = code.slice(code.indexOf("const colFor ="), code.indexOf("/* When a part's notes land"));
    for (const piece of ["rate", "retro", "shift", "euclid"])
      if (!new RegExp('modOf\\(ly, "' + piece + '"\\)').test(src))
        problems.push(`src: colFor no longer reads ${piece} — that pattern effect does nothing`);
    const colFor = (mods, melStep, mb) => {
      const raw = mb * MB + melStep, rate = mods.rate == null ? 1 : mods.rate;
      let c = rate === 1 ? raw : Math.floor(raw * rate);
      if (rate < 1 && (raw * rate) % 1 !== 0) return null;
      if (mods.retro === "bar") c = Math.floor(c / MB) * MB + (MB - 1 - ((c % MB) + MB) % MB);
      else if (mods.retro === "sec") c = N - 1 - (((c % N) + N) % N);
      return (((c + (mods.shift || 0)) % N) + N) % N;
    };
    const run = mods => Array.from({ length: N }, (_, i) => colFor(mods, i % MB, Math.floor(i / MB)));
    const plain = run({});
    if (plain.join() !== [...Array(N).keys()].join()) problems.push("colFor does not play the written notes at its defaults");
    const half = run({ rate: 0.5 }), sounded = half.filter(c => c != null);
    if (new Set(sounded).size !== sounded.length) problems.push("half time reads a column twice — it would retrigger the note instead of holding it");
    if (sounded.length !== N / 2) problems.push(`half time sounded ${sounded.length} of ${N} steps, not half`);
    if (run({ retro: "sec" }).join() !== [...plain].reverse().join()) problems.push("reverse is not an exact mirror");
    const shifted = run({ shift: 3 });
    if (new Set(shifted).size !== N) problems.push("shift loses or repeats a column — it should be a rotation");
    if (shifted[0] !== 3) problems.push(`shift +3 starts at column ${shifted[0]}, not 3`);
  }

  const bySlider = M.MODS.filter(md => md.kind !== "sel").length;
  console.log(`part modulation: ${M.MODS.length} across ${M.MOD_GROUPS.length} groups (${bySlider} sliders, ${M.MODS.length - bySlider} menus), all defaulting to no-op and surviving a save`);
}

/* ---- editing an arrangement without losing the melodies ----
   Moving a chorus earlier renumbers every section after it, and melodies are stored under that
   number. So the interesting property is not "did the rows move" — it is "did each section's notes
   go with it". Every operation is checked for both. */
{
  const L = M.letterFor;
  const plan = [
    { sec:"Intro", nums:"LOOP", reps:1 }, { sec:"Verse", nums:"LOOP", reps:2 },
    { sec:"Chorus", nums:"LOOP", reps:2 }, { sec:"Bridge", nums:"LOOP", reps:1 },
    { sec:"Chorus", nums:"LOOP", reps:2 },
  ];
  const keys = M.instKeysOf(plan, L);
  if (keys.flat().join() !== "I1,V1,V2,C1,C2,B1,C3,C4")
    problems.push(`instKeysOf numbered sections as ${keys.flat().join()}`);

  // give every section a recognisable "melody" so it can be traced through an edit
  const clone = x => ({ ...x });
  const secsOf = ks => Object.fromEntries(ks.flat().map(k => [k, { ids: [k], layers: [{ tag: k }] }]));
  const secs = secsOf(keys);
  // what a section key held before the edit, so a moved section can be recognised after it
  const tagOf = (out, k) => (out[k] && out[k].layers[0] || {}).tag;

  // move the bridge one place earlier
  {
    const r = M.planMove(plan, 3, -1);
    if (!r) problems.push("planMove refused a legal move");
    else {
      const [next, origin, sel] = r;
      if (next.map(x => x.sec).join() !== "Intro,Verse,Bridge,Chorus,Chorus")
        problems.push(`planMove gave ${next.map(x => x.sec).join()}`);
      if (sel !== 2) problems.push(`planMove selected row ${sel}, expected the moved one at 2`);
      const out = M.remapSecs(secs, plan, next, origin, L, clone);
      // the choruses keep their order here, so nothing renumbers and every section keeps its own
      for (const k of ["I1", "V1", "V2", "C1", "C2", "B1", "C3", "C4"])
        if (tagOf(out, k) !== k) problems.push(`planMove: ${k} came back holding ${tagOf(out, k)}`);
    }
    if (M.planMove(plan, 0, -1)) problems.push("planMove ran off the front of the plan");
    if (M.planMove(plan, plan.length - 1, 1)) problems.push("planMove ran off the end of the plan");
  }

  /* And the case the whole remap exists for: moving a chorus past another chorus. The two rows
     swap numbers, so a melody that stayed at its old key would now be playing under the wrong
     section — the failure this is here to catch. */
  {
    const two = [{ sec:"Verse", nums:"LOOP", reps:1 },
                 { sec:"Chorus", nums:"LOOP", reps:1 }, { sec:"Chorus", nums:"LOOP", reps:1 }];
    const twoKeys = M.instKeysOf(two, L);
    if (twoKeys.flat().join() !== "V1,C1,C2") problems.push(`two-chorus keys: ${twoKeys.flat().join()}`);
    const twoSecs = secsOf(twoKeys);
    const [next, origin] = M.planMove(two, 2, -1);
    const out = M.remapSecs(twoSecs, two, next, origin, L, clone);
    if (tagOf(out, "C1") !== "C2" || tagOf(out, "C2") !== "C1")
      problems.push(`planMove: swapping two choruses did not carry their melodies (C1=${tagOf(out, "C1")}, C2=${tagOf(out, "C2")})`);
    if (tagOf(out, "V1") !== "V1") problems.push("planMove: the verse was disturbed by a chorus swap");
  }

  // stretch the first chorus from two passes to four
  {
    const [next, origin] = M.planReps(plan, 2, 2);
    if (next[2].reps !== 4) problems.push(`planReps gave ${next[2].reps} passes`);
    const out = M.remapSecs(secs, plan, next, origin, L, clone);
    if (tagOf(out, "C1") !== "C1" || tagOf(out, "C2") !== "C2")
      problems.push("planReps: the existing passes lost their melodies");
    // the two new passes repeat the last written one rather than arriving empty
    if (tagOf(out, "C3") !== "C2" || tagOf(out, "C4") !== "C2")
      problems.push(`planReps: added passes came back empty (C3=${tagOf(out, "C3")})`);
    if (M.planReps(plan, 2, -99)[0][2].reps !== 1) problems.push("planReps went below one pass");
    if (M.planReps(plan, 0, -1)) problems.push("planReps took a one-pass section below one");
  }

  // duplicate the bridge — the copy must arrive with the notes already in it
  {
    const [next, origin, sel] = M.planDup(plan, 3);
    if (next.length !== 6 || next[4].sec !== "Bridge") problems.push("planDup did not insert a copy in place");
    if (sel !== 4) problems.push(`planDup selected ${sel}, expected the copy at 4`);
    const out = M.remapSecs(secs, plan, next, origin, L, clone);
    if (tagOf(out, "B1") !== "B1" || tagOf(out, "B2") !== "B1")
      problems.push(`planDup: the copy did not inherit the melody (B2=${tagOf(out, "B2")})`);
  }

  // remove the bridge
  {
    const [next, origin] = M.planDel(plan, 3);
    if (next.map(x => x.sec).join() !== "Intro,Verse,Chorus,Chorus") problems.push("planDel removed the wrong row");
    const out = M.remapSecs(secs, plan, next, origin, L, clone);
    if (out.B1) problems.push("planDel: the removed section's melody is still there");
    if (tagOf(out, "C3") !== "C3") problems.push("planDel: a later section's melody shifted");
    if (M.planDel([plan[0]], 0)) problems.push("planDel emptied the song — a plan needs one section");
  }

  // add a drop after the first chorus: brand new, so it must start empty and disturb nobody
  {
    const [next, origin, sel] = M.planAdd(plan, 3, "Drop");
    if (next[3].sec !== "Drop" || next[3].reps !== 1) problems.push("planAdd inserted the wrong row");
    if (sel !== 3) problems.push(`planAdd selected ${sel}`);
    const out = M.remapSecs(secs, plan, next, origin, L, clone);
    if (out.D1) problems.push("planAdd: a brand-new section arrived with someone else's melody");
    if (tagOf(out, "C1") !== "C1" || tagOf(out, "B1") !== "B1")
      problems.push("planAdd: an existing section lost its melody");
    if (M.planAdd(Array.from({ length: M.MAX_ROWS }, () => plan[0]), 0, "Drop"))
      problems.push("planAdd went past MAX_ROWS");
  }

  // nothing may mutate the plan it was handed — the catalogue's plans are shared constants, and an
  // in-place edit would rewrite the structure for every song that ever picks it
  {
    const before = JSON.stringify(plan);
    M.planMove(plan, 1, 1); M.planReps(plan, 1, 3); M.planDup(plan, 1); M.planDel(plan, 1); M.planAdd(plan, 1, "Drop");
    if (JSON.stringify(plan) !== before) problems.push("an arrangement edit mutated the plan it was given");
  }
  /* Moves and transitions are stored per instance too, and they have exactly the melodies' problem:
     a build set on the second chorus is stored under "C2", and moving a chorus makes the old C2 into
     C1. Section-*type* keys are bare letters and must be left alone — types don't renumber. */
  {
    const two = [{ sec:"Verse", nums:"LOOP", reps:1 },
                 { sec:"Chorus", nums:"LOOP", reps:1 }, { sec:"Chorus", nums:"LOOP", reps:1 }];
    const map = { C: "rise2", C1: "fulldrop", C2: "stop", V1: "fadein" };
    const [next, origin] = M.planMove(two, 2, -1);          // swap the two choruses
    const out = M.remapKeyed(map, two, next, origin, L);
    if (out.C !== "rise2") problems.push("remapKeyed: the section-type default was disturbed by a move");
    if (out.C1 !== "stop" || out.C2 !== "fulldrop")
      problems.push(`remapKeyed: swapping choruses did not carry their transitions (C1=${out.C1}, C2=${out.C2})`);
    if (out.V1 !== "fadein") problems.push("remapKeyed: the verse lost its transition");
    const [nx2, or2] = M.planAdd(two, 1, "Drop");           // a new section arrives with nothing set
    const out2 = M.remapKeyed(map, two, nx2, or2, L);
    if (out2.D1) problems.push("remapKeyed: a brand-new section arrived with someone else's transition");
    if (M.remapKeyed({ C: "rise2" }, two, nx2, or2, L).C !== "rise2")
      problems.push("remapKeyed: a map of only type keys should come back untouched");
  }

  /* ---- transition cues: armed early enough to sound, never early enough to reach backwards ---- */
  {
    // V1 four bars, C1 two bars, C2 four bars — 4/4 throughout
    const insts = [{ key:"V1", startBar:0, nbars:4 }, { key:"C1", startBar:4, nbars:2 },
                   { key:"C2", startBar:6, nbars:4 }];
    const T = id => M.TRANS[id];
    const cuesOf = pick => M.transCues(insts, d => T(pick[d.key] || ""), 4);

    // a four-bar riser into C1 is armed four bars early, at the top of the verse
    let c = cuesOf({ C1: "rise4" });
    if (!c[0] || c[0][0].at !== 4) problems.push(`transCues: a 4-bar lead-in into bar 4 fired at ${Object.keys(c)}`);
    if (c[0] && c[0][0].maxPre !== 16) problems.push(`transCues: gave ${c[0][0].maxPre} beats of lead-in, the verse has 16`);
    // …but into C2 it only has C1's two bars to work in, so it shortens rather than starting inside V1
    c = cuesOf({ C2: "rise4" });
    if (!c[4]) problems.push(`transCues: a lead-in longer than the section before it did not clamp (fired at ${Object.keys(c)})`);
    if (c[4] && c[4][0].maxPre !== 8) problems.push(`transCues: clamped to ${c[4][0].maxPre} beats, C1 is 8`);
    // the first section has nothing before it, so its cue arrives with no lead-in at all — the
    // riser is dropped rather than squeezed into a squeak, and whatever lands on the downbeat stays
    c = cuesOf({ V1: "rise4" });
    if (!c[0] || c[0][0].maxPre !== 0) problems.push("transCues: the first section should be cued with no lead-in");
    c = cuesOf({ V1: "fadein" });
    if (!c[0] || c[0][0].at !== 0) problems.push("transCues: an entry on the first section did not fire");
    // the tail is the incoming section's own length, so a fade-in cannot run past the section
    if (c[0] && c[0][0].maxPost !== 16) problems.push(`transCues: gave ${c[0][0].maxPost} beats of tail, V1 is 16`);
    // a tail yields to the next seam's lead-in: C1 is two bars, and a four-bar riser into C2 wants
    // both of them, so C1's own fade-in gets nothing rather than being cancelled halfway through
    c = cuesOf({ C1: "fadein4", C2: "rise4" });
    const c1 = Object.values(c).flat().find(x => x.key === "C1");
    if (!c1 || c1.maxPost !== 0) problems.push(`transCues: C1's tail is ${c1 && c1.maxPost} beats, but the next lead-in claims all of it`);
    // with nothing arriving after it, the same fade-in gets the section's full length
    c = cuesOf({ C1: "fadein4" });
    const c1b = Object.values(c).flat().find(x => x.key === "C1");
    if (!c1b || c1b.maxPost !== 8) problems.push(`transCues: C1's tail is ${c1b && c1b.maxPost} beats, C1 is 8`);
    // two transitions can be armed on the same bar without either being lost
    c = cuesOf({ C1: "gap1", C2: "rise2" });
    const all = Object.values(c).flat();
    if (all.length !== 2) problems.push(`transCues: ${all.length} cues from two transitions`);
    // "no transition" is not a cue
    if (Object.keys(cuesOf({ C1: "" })).length) problems.push("transCues: the empty preset produced a cue");
    // in 3/4 the same lead-in is a different number of bars — beats, not bars, is why this works
    const waltz = M.transCues(insts, d => (d.key === "C2" ? T("rise4") : null), 3);
    if (!waltz[4]) problems.push(`transCues: in 3/4 the cue landed at ${Object.keys(waltz)}`);
    console.log(`transition cues: lead-ins armed, clamped to the section before, and ${M.TRANS_CATS.length} families of preset resolved`);
  }
  console.log(`arrangement edits: 5 operations, melodies traced through every one`);

  /* ---- automation lanes ---- */
  {
    if (M.autoAt(null, 4) !== null || M.autoAt([], 4) !== null)
      problems.push("an empty automation lane should read null, so the parameter is left alone");
    let pts = M.autoSet(M.autoSet([], 0, 0), 8, 1);
    const at = b => M.autoAt(pts, b);
    if (at(0) !== 0 || at(8) !== 1) problems.push("autoAt does not return the drawn end points");
    if (Math.abs(at(4) - 0.5) > 1e-9) problems.push(`autoAt interpolated bar 4 as ${at(4)}, expected 0.5`);
    // outside the drawn range it holds flat rather than running off
    if (at(-3) !== 0 || at(99) !== 1) problems.push("autoAt does not hold flat outside the drawn points");
    // one point per bar: drawing over a bar replaces it rather than stacking
    pts = M.autoSet(pts, 8, 0.25);
    if (pts.filter(p => p.bar === 8).length !== 1) problems.push("autoSet stacked two points on one bar");
    if (at(8) !== 0.25) problems.push("autoSet did not replace the point at a bar");
    if (pts.some((p, i) => i && p.bar < pts[i - 1].bar)) problems.push("autoSet left the lane unsorted");
    // values are clamped: a drag past the edge of the lane must not write 1.4 or -0.2
    const wild = M.autoSet(M.autoSet([], 1, 5), 2, -5);
    if (wild.some(p => p.v < 0 || p.v > 1)) problems.push(`autoSet let a value escape 0..1: ${JSON.stringify(wild)}`);
    if (M.autoSet([], -4, 0.5)[0].bar !== 0) problems.push("autoSet allowed a negative bar");

    // a fast drag skips bars; the fill has to leave a continuous line, not holes
    const drawn = M.autoDraw([], 0, 6, 0, 1);
    for (let b = 1; b <= 6; b++)
      if (!drawn.some(p => p.bar === b)) problems.push(`autoDraw left a hole at bar ${b}`);
    if (Math.abs(M.autoAt(drawn, 3) - 0.5) > 1e-9) problems.push("autoDraw did not interpolate across the skipped bars");
    // and dragging backwards works the same way
    const back = M.autoDraw([], 6, 2, 1, 0);
    for (let b = 2; b <= 5; b++)
      if (!back.some(p => p.bar === b)) problems.push(`autoDraw backwards left a hole at bar ${b}`);
    if (M.autoDel(drawn, 3).some(p => p.bar === 3)) problems.push("autoDel did not remove the point");
    for (const id of ["filter", "hp", "res", "level"])
      if (!M.AUTO_LANES.some(L => L.id === id)) problems.push(`automation: no ${id} lane`);
    for (const L of M.AUTO_LANES) if (!L.id || !L.name || !L.tip) problems.push(`automation lane ${L.id} is missing a name or tip`);
    // the per-part lanes: the strip writes auto[autoPartId(i)] and playback must read the same key
    if (M.autoPartId(3) !== "cut" + 3) problems.push("autoPartId does not key a part's lane consistently");
    if (!/autoPartId\(li\)/.test(code)) problems.push("src: playback never reads a part's drawn filter lane");
    if (!/m\.autoHp\.frequency/.test(code)) problems.push("src: the hi-pass lane is never scheduled");
    if (!/m\.autoFilt\.Q/.test(code)) problems.push("src: the resonance lane never reaches the drawn filter's Q");
    console.log(`automation: ${M.AUTO_LANES.length} master lanes + per-part filter lanes, interpolation and drag-fill checked`);
  }
}

/* ---- the zip writer, and the stem gating that fills it ----
   A malformed archive is the worst failure mode here: the download succeeds, and the producer
   only finds out when their unarchiver refuses it. So the bytes get parsed back structurally
   rather than eyeballed. */
{
  // the ZIP CRC-32 is the standard one; "123456789" is its documented check value
  const check = M.crc32(new TextEncoder().encode("123456789"));
  if (check !== 0xcbf43926) problems.push(`crc32 check value is ${check.toString(16)}, expected cbf43926`);
  if (M.crc32(new Uint8Array(0)) !== 0) problems.push("crc32 of empty input is not 0");

  const enc = new TextEncoder();
  const files = [
    { name: "01-drums.wav", bytes: enc.encode("RIFF....drums") },
    { name: "02-chords-piano.wav", bytes: Uint8Array.from({ length: 5000 }, (_, i) => i & 255) },
    { name: "03-part-A-lead.wav", bytes: new Uint8Array(0) },   // a legal, if pointless, entry
  ];
  const buf = M.makeZip(files);
  const rd16 = at => buf[at] | (buf[at + 1] << 8);
  const rd32 = at => (buf[at] | (buf[at + 1] << 8) | (buf[at + 2] << 16) | (buf[at + 3] << 24)) >>> 0;

  // walk in from the end-of-central-directory record, the way an unarchiver does
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) if (rd32(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) problems.push("zip: no end-of-central-directory record");
  else {
    if (rd16(eocd + 10) !== files.length) problems.push(`zip: EOCD claims ${rd16(eocd + 10)} entries, wrote ${files.length}`);
    const dirSize = rd32(eocd + 12), dirAt = rd32(eocd + 16);
    if (dirAt + dirSize !== eocd) problems.push("zip: central directory size/offset do not meet the EOCD");
    let at = dirAt, n = 0;
    while (at < dirAt + dirSize) {
      if (rd32(at) !== 0x02014b50) { problems.push(`zip: bad central header at ${at}`); break; }
      const method = rd16(at + 10), crc = rd32(at + 16), csize = rd32(at + 20), usize = rd32(at + 24);
      const nameLen = rd16(at + 28), local = rd32(at + 42);
      const name = new TextDecoder().decode(buf.subarray(at + 46, at + 46 + nameLen));
      const want = files[n];
      if (!want) { problems.push("zip: more central entries than files"); break; }
      if (name !== want.name) problems.push(`zip: entry ${n} named "${name}", expected "${want.name}"`);
      if (method !== 0) problems.push(`zip: entry ${n} uses method ${method}, expected 0 (stored)`);
      if (crc !== M.crc32(want.bytes)) problems.push(`zip: entry ${n} CRC mismatch`);
      if (csize !== want.bytes.length || usize !== want.bytes.length)
        problems.push(`zip: entry ${n} sizes ${csize}/${usize}, expected ${want.bytes.length}`);
      // the local header the directory points at must agree, and the payload must be byte-exact
      if (rd32(local) !== 0x04034b50) problems.push(`zip: entry ${n} local offset ${local} is not a local header`);
      else {
        const dataAt = local + 30 + rd16(local + 26) + rd16(local + 28);
        const got = buf.subarray(dataAt, dataAt + usize);
        if (got.length !== want.bytes.length || got.some((b, i) => b !== want.bytes[i]))
          problems.push(`zip: entry ${n} payload does not round-trip`);
      }
      at += 46 + nameLen + rd16(at + 30) + rd16(at + 32);
      n++;
    }
    if (n !== files.length) problems.push(`zip: walked ${n} central entries, wrote ${files.length}`);
    console.log(`zip writer: ${files.length} entries, ${buf.length} bytes, central directory walks clean`);
  }
  // filenames have to survive Windows and macOS alike, and never come out empty
  for (const [raw, want] of [["chords-acoustic_guitar_steel", "chords-acoustic_guitar_steel"],
                             ["part A / lead?", "part-A-lead"], ["  ", "stem"], ["***", "stem"],
                             ["...", "stem"], [".hidden", "hidden"], ["a".repeat(90), "a".repeat(60)]]) {
    const got = M.safeName(raw);
    if (got !== want) problems.push(`safeName(${JSON.stringify(raw)}) = ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
  }
  if (/[\\/:*?"<>|]/.test(M.safeName('a:b*c?"d<e>f|g\\h/i'))) problems.push("safeName leaves a reserved filename character");

  /* The stems only sum back to the mix if every source in emitTick is gated on `m.stem`.
     A source that forgets the gate leaks into every stem; one that gates too hard goes missing
     from all of them. Both are silent bugs, so the source shape is checked here. */
  const tickBody = code.slice(code.indexOf("const emitTick ="), code.indexOf("const startMetro ="));
  const GATES = [
    [/if \(chord && [^)]*\(!m\.stem \|\| m\.stem\.kind === "chords"\)\)/, "chords are not gated on m.stem"],
    [/if \(!m\.stem \|\| m\.stem\.kind === "drums"\)\s*\n\s*for \(const ch of dstep\)/, "drum voices are not gated on m.stem"],
    [/if \(m\.stem && !\(m\.stem\.kind === "part" && m\.stem\.i === li\)\) return;/, "melody parts are not gated on m.stem"],
    [/if \(clickRef\.current && !m\.stem\)/, "the metronome click is not excluded from stems"],
  ];
  for (const [re, msg] of GATES) if (!re.test(tickBody)) problems.push(`stem gating: ${msg}`);
  /* The chord voicing is shared state, not sound: an arpeggiated part reads it to know what the
     chord is made of. If the update sat inside the chords-only branch, a part stem — which plays
     no chords — would arpeggiate a stale voicing and follow different harmony from the mix. So the
     update has to come *before* the `m.stem` gate, not inside it. */
  const voiceAt = tickBody.indexOf("m.voicing = voiceChord");
  const chordGateAt = tickBody.indexOf('m.stem.kind === "chords"');
  if (voiceAt < 0) problems.push("stem gating: the voicing update has moved out of emitTick");
  else if (chordGateAt >= 0 && voiceAt > chordGateAt)
    problems.push("stem gating: the voicing is computed inside the chords-only branch — an arp in a part stem would follow the wrong chord");
  // the pump is deliberately outside the drum gate — it shapes the pitched bus, so it belongs in
  // every pitched stem even though the kick triggering it does not
  const pumpLines = [...tickBody.matchAll(/^.*duckAt\(m\.(cduck|wetDuck|partDuck\[li\]).*$/gm)].map(x => x[0]);
  if (pumpLines.length < 3) problems.push(`stem gating: expected the pump on the chord bus, the reverb return and each part; found ${pumpLines.length}`);
  for (const ln of pumpLines)
    if (/m\.stem/.test(ln)) problems.push("stem gating: a sidechain duck is gated on m.stem — that stem would lose its pumping");
  console.log(`stem gating: ${GATES.length} sources gated, pump left on the pitched bus`);
}

/* ---- arrangement templates ----
   A structure is a running order; a template is a running order *plus* what plays in each section.
   The checks below are the properties that make it an arrangement rather than a longer list of
   sections: every id it names has to exist (a typo'd drum kit is silence, and silence looks
   deliberate), the transitions have to land on the seams rather than on every pass, the automation
   has to cover the whole song, and — the one that matters — the energy has to move. A template
   whose sections all play the same thing is the problem it was written to fix. */
{
  const POOL = 4, HALF = Math.ceil(POOL / 2);
  // bars a row is worth on the usual four-chord loop, padded even exactly as the app pads it
  const barsOfRow = row => {
    const n = row.nums === "LOOP" ? POOL : row.nums === "HOLD1" ? 1
      : (row.nums === "HALF1" || row.nums === "HALF2") ? HALF : row.nums.length;
    return n % 2 ? n + 1 : n;
  };
  const kits = new Set(M.DRUM_KITS.map(([k]) => k)), pumps = new Set(M.PUMPS.map(([k]) => k));
  let rows = 0, subtractions = 0, silences = 0;
  for (const t of M.DANCE_TEMPLATES) {
    const where = `template ${t.id}`;
    if (!M.DRUMS[t.drum] || !M.DRUMS[t.drum].pattern) problems.push(`${where}: unknown drum pattern "${t.drum}"`);
    if (!M.PATTERNS[t.pat]) problems.push(`${where}: unknown chord rhythm "${t.pat}"`);
    if (!kits.has(t.kit)) problems.push(`${where}: unknown drum kit "${t.kit}"`);
    if (!pumps.has(t.pump)) problems.push(`${where}: unknown pump "${t.pump}"`);
    if (!(t.bpm >= 60 && t.bpm <= 200)) problems.push(`${where}: ${t.bpm} bpm is not a dance tempo`);
    // the whole template has to fit the 4/4 dance world it is written for, or the bars do not line up
    if (M.meterOf(M.PATTERNS[t.pat]) !== "4/4") problems.push(`${where}: "${t.pat}" is not a 4/4 rhythm`);
    if (M.DRUMS[t.drum] && !M.drumFitsMeter(M.DRUMS[t.drum], "4/4")) problems.push(`${where}: "${t.drum}" does not fit 4/4`);

    for (const row of t.plan) {
      rows++;
      const a = row.arr || {};
      const bars = barsOfRow(row) * (row.reps || 1);
      /* Four bars is a group, eight a phrase, sixteen a section. A row that is not a multiple of
         four puts every entry after it off the phrase, which is audible to a dancer and fatal to a
         DJ. */
      if (bars % 4) problems.push(`${where} / ${row.sec}: ${bars} bars — not a whole four-bar group`);
      if (a.drums && !M.DRUMS[a.drums]) problems.push(`${where} / ${row.sec}: unknown drums "${a.drums}"`);
      if (a.drums && a.drums !== "off" && !M.drumFitsMeter(M.DRUMS[a.drums], "4/4"))
        problems.push(`${where} / ${row.sec}: drums "${a.drums}" do not fit 4/4`);
      if (a.move && !M.MOVES[a.move]) problems.push(`${where} / ${row.sec}: unknown move "${a.move}"`);
      if (a.trans && !M.TRANS[a.trans]) problems.push(`${where} / ${row.sec}: unknown transition "${a.trans}"`);
      if (a.parts != null && /[^A-F]/.test(a.parts)) problems.push(`${where} / ${row.sec}: parts "${a.parts}" names something that is not a part`);
      for (const lane of ["filter", "level", "hp", "res"]) {
        const v = a[lane];
        if (v == null) continue;
        for (const x of (Array.isArray(v) ? v : [v]))
          if (!(x >= 0 && x <= 1)) problems.push(`${where} / ${row.sec}: ${lane} ${x} is outside 0–1`);
      }
      /* A move sweeps the app's own filter and the lane sweeps a second one in series, so a row
         asking for both is filtered twice and the "build" arrives quieter than the groove. The
         same holds for the high-pass pair: an hp move plus an hp lane thins the row twice. */
      if (a.move && a.filter != null) problems.push(`${where} / ${row.sec}: a move and a filter lane on the same row filter it twice`);
      if (a.move && M.MOVES[a.move] && M.MOVES[a.move].spec && M.MOVES[a.move].spec.hp && a.hp != null)
        problems.push(`${where} / ${row.sec}: an hp move and an hp lane on the same row thin it twice`);
      if (a.drums === "off" && (a.parts === "" || a.parts == null) && a.chords === 0)
        problems.push(`${where} / ${row.sec}: nothing plays at all`);
      if (a.drums === "off") silences++;
    }

    const insts = M.planInsts(t.plan, barsOfRow, M.letterFor);
    const A = M.resolveArrangement(t.plan, insts);
    const keys = insts.map(d => d.key);
    // every map is keyed by pass (D1, D2 …), which is the only level at which "the second drop is
    // bigger than the first" can be said at all
    for (const [name, map] of [["secDrum", A.secDrum], ["secQuiet", A.secQuiet], ["secMove", A.secMove], ["secTrans", A.secTrans]]) {
      const bad = Object.keys(map).filter(k => !keys.includes(k));
      if (bad.length) problems.push(`${where}: ${name} keys ${bad.join(",")} are not sections of this plan`);
      if (Object.keys(map).length !== keys.length)
        problems.push(`${where}: ${name} covers ${Object.keys(map).length} of ${keys.length} passes — applying it would leave the last arrangement half in place`);
    }
    // a transition belongs to the seam into a row, so a row played four times gets one, not four
    const byRow = {};
    insts.forEach(d => (byRow[d.row] = byRow[d.row] || []).push(d));
    for (const [r, list] of Object.entries(byRow)) {
      const armed = list.filter(d => A.secTrans[d.key]);
      if (armed.length > 1) problems.push(`${where} / row ${r}: ${armed.length} passes armed with a transition — a riser before every pass of a drop is a fire alarm`);
      if (armed.length === 1 && armed[0].key !== list[0].key)
        problems.push(`${where} / row ${r}: the transition is armed on a later pass than the seam it belongs to`);
    }
    // an automation lane that is used has to be written across the whole song, or the bars nobody
    // wrote interpolate into a slow sweep nobody asked for
    const total = insts.reduce((n, d) => n + d.nbars, 0);
    for (const lane of ["filter", "level", "hp", "res"]) {
      const pts = A[lane];
      if (!pts) continue;
      if (!pts.length) { problems.push(`${where}: the ${lane} lane is used but empty`); continue; }
      if (pts[0].bar !== 0) problems.push(`${where}: the ${lane} lane starts at bar ${pts[0].bar}, not the top of the song`);
      if (pts[pts.length - 1].bar !== total - 1) problems.push(`${where}: the ${lane} lane stops at bar ${pts[pts.length - 1].bar} of ${total}`);
      if (pts.some((q, i) => i && q.bar <= pts[i - 1].bar)) problems.push(`${where}: the ${lane} lane is not sorted`);
    }

    /* And the point of the whole exercise. Energy per section, and what it has to do: move, come
       back down at least once, and rise again afterwards — "the biggest event in the track is a
       subtraction". A flat line here is the arrangement these templates exist to replace. */
    const nrg = t.plan.map(row => {
      const a = row.arr || {};
      const kit = M.DRUMS[a.drums || t.drum];
      return M.energyOf({ drums: M.drumAmountOf(kit && kit.pattern), chords: a.chords == null || !!a.chords,
        parts: ["A", "B", "C", "D", "E", "F"].map(P => (a.parts == null ? P === "A" : a.parts.includes(P))) });
    });
    if (new Set(nrg).size < 3)
      problems.push(`${where}: only ${new Set(nrg).size} energy level(s) across ${nrg.length} sections — everything plays from start to end`);
    const dip = nrg.findIndex((e, i) => i > 0 && i < nrg.length - 1 && e < nrg[i - 1] && nrg.slice(i + 1).some(x => x > e));
    if (dip < 0) problems.push(`${where}: nothing is ever taken away and brought back — there is no drop in this arrangement, only a rise`);
    else subtractions++;
    /* Failure mode #2 in docs/DANCE-LAYERING.md: riser, snare roll and every layer at once, and
       then the drop arrives quieter than the build did. A build has to lead into something bigger
       than itself or it is the loudest bar of the section it was supposed to set up. */
    t.plan.forEach((row, i) => {
      if (!/build/i.test(row.sec) || i === t.plan.length - 1) return;
      if (nrg[i + 1] <= nrg[i])
        problems.push(`${where} / ${row.sec}: the build (${nrg[i]}) is at least as dense as the ${t.plan[i + 1].sec} it leads into (${nrg[i + 1]})`);
    });
    // the full stack is worth having only if it is rare
    const top = Math.max(...nrg);
    if (nrg.filter(e => e === top).length > 4)
      problems.push(`${where}: the fullest arrangement appears ${nrg.filter(e => e === top).length} times — there is nowhere left to go`);
    if (nrg[0] === top) problems.push(`${where}: it opens at full size`);
  }
  /* The arrangement rides on the plan rows, so the editor's operations carry it the way they carry
     melodies. If it were keyed by row *index* instead, moving a section would hand its arrangement
     to whichever section took its place. */
  {
    const t = M.DANCE_TEMPLATES[0];
    const rowsIn = t.plan.map(r => ({ ...r }));
    const [moved] = M.planMove(rowsIn, 0, 1);
    if (moved[1].arr !== t.plan[0].arr) problems.push("arrangement templates: moving a section leaves its arrangement behind");
    const [duped] = M.planDup(t.plan.map(r => ({ ...r })), 0);
    if (duped[1].arr !== t.plan[0].arr) problems.push("arrangement templates: a duplicated section arrives unarranged");
    // …and re-resolving after an edit still lands on the passes that now exist
    const insts = M.planInsts(moved, r => (r.nums === "LOOP" ? 4 : 2), M.letterFor);
    const A2 = M.resolveArrangement(moved, insts);
    if (Object.keys(A2.secDrum).length !== insts.length)
      problems.push("arrangement templates: re-applying after an edit misses some of the sections");
  }
  console.log(`arrangement templates: ${M.DANCE_TEMPLATES.length} templates, ${rows} sections, `
    + `${silences} of them with the drums out; every one rises, collapses and rises again (${subtractions})`);
}

/* ---- track presets: "recreate a famous track" ----
   Every field here is either a catalogue id (has to exist in the catalogue it names) or a fact
   about a real record (has to at least be a plausible one) — the checks below are the same shape
   as the arrangement-templates block above, because a typo'd baseTemplate is just as silent a
   failure as a typo'd drum kit: the dropdown lists the track, picking it does nothing useful, and
   nobody sees why. Nothing here checks the *melody* steering for musical taste — only that it names
   a narrative the app actually has — because taste is not this file's job. */
{
  const kits = new Set(M.DRUM_KITS.map(([k]) => k)), pumps = new Set(M.PUMPS.map(([k]) => k));
  const syncLevels = new Set(M.SYNC_LEVELS.map(([v]) => v));
  const bassVoices = new Set(M.BASS_VOICES.map(([v]) => v)), padVoices = new Set(M.PAD_VOICES.map(([v]) => v));
  const percKits = new Set(M.PERC_KITS.map(([v]) => v)), delayTimes = new Set(M.DELAY_TIMES.map(([v]) => v));
  const templateIds = new Set(M.DANCE_TEMPLATES.map(t => t.id));
  const seen = new Set();
  for (const p of M.TRACK_PRESETS) {
    const where = `track preset ${p.id || p.name}`;
    if (!p.id || seen.has(p.id)) problems.push(`${where}: missing or duplicate id`);
    seen.add(p.id);
    if (!p.name || !p.artist) problems.push(`${where}: missing a name or an artist`);
    if (!p.tip || p.tip.length < 20) problems.push(`${where}: no real tip, or too short to teach anything`);
    if (!(p.bpm >= 60 && p.bpm <= 200)) problems.push(`${where}: ${p.bpm} bpm is not a dance tempo`);
    if (!(Number.isInteger(p.tonic) && p.tonic >= 0 && p.tonic <= 11)) problems.push(`${where}: tonic ${p.tonic} is not a pitch class 0–11`);
    if (!M.PROGRESSIONS[p.progId]) problems.push(`${where}: unknown progression "${p.progId}"`);
    if (!templateIds.has(p.baseTemplate)) problems.push(`${where}: unknown base template "${p.baseTemplate}"`);
    if (p.narrative && !M.NARRATIVES.some(n => n.id === p.narrative)) problems.push(`${where}: unknown narrative "${p.narrative}"`);
    if (p.vary != null && !(Number.isFinite(p.vary) && p.vary >= 0)) problems.push(`${where}: vary ${p.vary} is not a non-negative number`);
    if (p.sync != null && !syncLevels.has(p.sync)) problems.push(`${where}: unknown syncopation level ${p.sync}`);
    if (p.drum && (!M.DRUMS[p.drum] || !M.DRUMS[p.drum].pattern)) problems.push(`${where}: unknown drum pattern "${p.drum}"`);
    if (p.kit && !kits.has(p.kit)) problems.push(`${where}: unknown drum kit "${p.kit}"`);
    if (p.pump && !pumps.has(p.pump)) problems.push(`${where}: unknown pump "${p.pump}"`);
    if (p.pat && !M.PATTERNS[p.pat]) problems.push(`${where}: unknown chord rhythm "${p.pat}"`);
    if (p.bass && !M.BASS[p.bass]) problems.push(`${where}: unknown bass pattern "${p.bass}"`);
    if (p.bassVoice && !bassVoices.has(p.bassVoice)) problems.push(`${where}: unknown bass voice "${p.bassVoice}"`);
    if (p.pad && !padVoices.has(p.pad)) problems.push(`${where}: unknown pad voice "${p.pad}"`);
    if (p.percKit && !percKits.has(p.percKit)) problems.push(`${where}: unknown perc kit "${p.percKit}"`);
    if (p.delay && !delayTimes.has(p.delay)) problems.push(`${where}: unknown delay time "${p.delay}"`);
    if (p.swing != null && !(p.swing >= 0 && p.swing <= 0.6)) problems.push(`${where}: swing ${p.swing} is outside 0–0.6`);
  }
  // no melody transcription ever lands here by accident — a preset steers the generator with a
  // narrative id and a couple of numbers, never with note data of its own
  const noteish = ["notes", "melody", "bars", "riff", "flat", "degrees"];
  for (const p of M.TRACK_PRESETS)
    for (const k of noteish)
      if (k in p) problems.push(`track preset ${p.id}: carries a "${k}" field — presets steer the melody engine, they never hold notes`);
  console.log(`track presets: ${M.TRACK_PRESETS.length} tracks across ${new Set(M.TRACK_PRESETS.map(p => p.baseTemplate)).size} arrangement templates and ${new Set(M.TRACK_PRESETS.map(p => p.progId)).size} progressions`);
}

/* ---- the settings export reads clean without the source beside it ----
   "Export for Claude" hands two files to an analysis that has neither the app nor its code: the
   arrangement wav and this JSON. So the snapshot has to hold three properties whatever the song:
   it survives JSON round-tripping with no undefined, NaN or cycle leaking out of React state; it
   covers every modulation the tables define (a control added to MOD_GROUPS must appear in the
   reference without an edit to the exporter — that is the whole anti-drift design); and the
   spec-critical blocks — envelope, filter in real Hz, arpeggiator — are written out even at their
   defaults, because they are what an analysis reaches for first. */
{
  // a deliberately nasty part: arp + filter envelope + gate + a cycle where React fiber would sit
  const arped = { instr: "synth", oct: -1, vol: 0.8, mute: false, solo: false, send: 40,
    flat: [["0"], [], ["2"], []],
    arp: "updown", arpRate: 4, arpOct: 2, gate: "tri", gateLen: 12,
    cut: 35, res: 60, fenv: 70, fdec: 45, detune: -7, pan: -30, verb: 25 };
  arped.self = arped;                                      // the cycle sanitise has to survive
  const plain = { instr: null, oct: 0, vol: 1, flat: [] }; // a part with everything at default
  const src = { key: "C1", name: "Chorus", word: "chorus", letter: "C", bars: 4, startBar: 8,
    chords: [{ name: "C", numeral: "I" }, { name: "Am", numeral: "vi" }],
    drums: { pat: "four" }, chordsQuiet: false, chordsSrc: { pat: "pop" },
    bass: { beat: [["R", "", "O", ""]] }, perc: null, padVoiceId: "strings", padBeat: null,
    move: "build", trans: "rise2", inherited: false, layers: [arped, plain] };
  const state = M.buildExportState({
    exportedAt: "2026-01-01T00:00:00.000Z", songName: "test", tonic: 9, mode: "aeolian",
    bpm: 120, meterId: "4/4", barBeats: 4, meloSub: 4, swingAmt: 0.2, humanise: 0.1,
    progName: "Test loop", chords: [{ name: "Am", numeral: "i" }, { name: "F", numeral: "VI" }],
    contrast: null, structureName: "Test form", isCustomPlan: false,
    planRows: [{ sec: "Verse", reps: 2 }, { sec: "Chorus", reps: 2 }],
    totalBars: 16, sections: [src, { ...src, key: "C2", startBar: 12 }], groove: null,
    instr: "acoustic_guitar_steel", melInstr: "flute", kit: "909", percKit: "hand",
    pump: "classic", bassVoice: "saw", padId: "strings", drum: "four", patId: "pop",
    delayId: "8d", trackFx: { bass: { lvl: 80, drive: 30, wobRate: 2 } },
    realSounds: true, legato: true, clickOn: false,
    auto: { key: "x", filter: [{ bar: 0, v: 0.2 }, { bar: 8, v: 1 }], cut0: [{ bar: 4, v: 0.5 }] },
  });
  // 1. it round-trips: parse(stringify) deep-equals, and nothing non-JSON survived the sanitise
  let round = null;
  try { round = JSON.parse(JSON.stringify(state)); } catch (e) { problems.push("export state: JSON.stringify threw — " + e.message); }
  const walk = (v, path) => {
    if (v === undefined) problems.push(`export state: undefined at ${path}`);
    else if (typeof v === "number" && !Number.isFinite(v)) problems.push(`export state: non-finite number at ${path}`);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === "object") {
      if (Object.getPrototypeOf(v) !== Object.prototype) problems.push(`export state: non-plain object at ${path}`);
      else for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
    }
  };
  walk(state, "state");
  if (round && JSON.stringify(round) !== JSON.stringify(state))
    problems.push("export state: does not round-trip through JSON.parse");
  // 2. the sanitiser handles what React state can contain
  const dirty = { a: NaN, b: Infinity, c: undefined, d: () => {}, e: new Map(), f: [NaN, 1] };
  dirty.loop = dirty;
  const clean = M.sanitizeJson(dirty);
  if (clean.a !== null || clean.b !== null || clean.d !== null || clean.e !== null
      || clean.loop !== null || clean.f[0] !== null || clean.f[1] !== 1 || "c" in clean)
    problems.push("export state: sanitizeJson leaks NaN, Infinity, undefined, functions or cycles");
  // 3. the reference covers every modulation in the tables, under a unique readable name
  const ref = state.modulation_reference.flatMap(g => g.controls);
  if (ref.length !== M.MODS.length)
    problems.push(`export state: modulation_reference lists ${ref.length} controls, MOD_GROUPS defines ${M.MODS.length}`);
  const names = ref.map(c => c.setting);
  if (new Set(names).size !== names.length) problems.push("export state: two modulations share a field name");
  for (const c of ref) if (!c.meaning) problems.push(`export state: ${c.setting} has no meaning text`);
  // 4. the arped part reads as the spec asks: arp by name, filter in Hz, envelope always present
  const part = state.arrangement.sections[0].melody_parts[0];
  if (!part.arpeggiator || part.arpeggiator.pattern !== "Up & down" || part.arpeggiator.rate !== "1/16"
      || part.arpeggiator.octave_range !== 2)
    problems.push("export state: the arpeggiator block does not name its pattern, rate and range");
  if (part.filter.envelope_amount_percent !== 70 || part.filter.envelope_decay_percent !== 45)
    problems.push("export state: the filter envelope did not reach the export");
  if (part.filter.low_pass_cutoff_hz !== M.lowPassHz(35) || M.lowPassHz(100) !== M.FILTER_OPEN || M.lowPassHz(0) !== 120)
    problems.push("export state: the low-pass percent→Hz mapping does not match the scheduler's");
  if (!part.gate || part.gate.pattern !== "Trance gate" || part.gate.length_steps_before_repeat !== 12)
    problems.push("export state: the note gate did not reach the export");
  if (part.effect_sends.delay_send_percent !== 40 || part.effect_sends.reverb_send_percent !== 25)
    problems.push("export state: the effect sends did not reach the export");
  // …and a default part still writes the blocks out, with nothing spurious besides
  const dflt = state.arrangement.sections[0].melody_parts[1];
  if (dflt.arpeggiator !== null || dflt.gate !== null || Object.keys(dflt.other_settings).length)
    problems.push("export state: a default part claims settings it does not have");
  if (!dflt.envelope || dflt.envelope.attack_percent !== 0 || dflt.filter.low_pass_percent !== 100)
    problems.push("export state: a default part is missing its envelope/filter blocks");
  // 5. arrangement arithmetic and grids
  if (state.global.chord_progression.name !== "Test loop")
    problems.push("export state: the progression's name is missing");
  // …and the component hands the field the catalogue actually has (label, not name)
  if (!/progName: prog\.label/.test(code))
    problems.push("progression-wheel.jsx: getExportState reads prog.name — the catalogue field is `label`");
  if (state.arrangement.duration_seconds !== 16 * 4 * 60 / 120)
    problems.push("export state: duration_seconds does not match bars × beats ÷ bpm");
  if (state.arrangement.sections[0].starts_at_seconds !== 8 * 4 * 60 / 120)
    problems.push("export state: a section's start time does not match its start bar");
  const bassGrid = state.arrangement.sections[0].bass.grid_bars[0];
  if (bassGrid !== "R-O-") problems.push(`export state: a written grid came out unreadable: ${bassGrid}`);
  if (state.arrangement.sections[0].drums.pattern !== "Four-on-the-floor")
    problems.push("export state: a catalogue drum pattern is not named");
  if (!state.arrangement.sections[0].section_move || state.arrangement.sections[0].section_move.name !== M.MOVES.build.name)
    problems.push("export state: the section move is not named");
  // 6. automation lanes carry their own meaning, and the stray `key` field is not a lane
  const lanes = state.master_effects.automation_lanes;
  if (lanes.length !== 2 || !lanes.every(l => l.meaning && l.points.length))
    problems.push("export state: automation lanes missing points or meaning");
  // 7. the component wires it: one state function, both files, a guarded button
  if (!/const getExportState = /.test(code) || !/buildExportState\(\{/.test(code))
    problems.push("progression-wheel.jsx: getExportState() does not feed buildExportState");
  if (!/getExportState\(\)/.test(code.split("const exportForClaude")[1] || ""))
    problems.push("progression-wheel.jsx: exportForClaude does not read getExportState()");
  if (!code.includes("-arrangement.wav") || !code.includes("-settings.json"))
    problems.push("progression-wheel.jsx: the two Export for Claude filenames are missing");
  if (!code.includes("Export for Claude"))
    problems.push("progression-wheel.jsx: no Export for Claude button");
  /* A long render is startRendering() doing nearly all the waiting (measured ~98% of it), and its
     only window for feedback is suspend() checkpoints. Losing them turns a two-minute export back
     into a frozen label, which reads as a hang — so their presence is held here. */
  if (!/renderOffline = async \(stem, onProgress\)/.test(code) || !/ctx\.suspend\(/.test(code))
    problems.push("progression-wheel.jsx: renderOffline has no suspend() progress checkpoints");
  for (const use of ['pctLabel("Rendering")', 'pctLabel("Bouncing")'])
    if (!code.includes(use))
      problems.push(`progression-wheel.jsx: a busy export button lost its percent label (${use})`);
  if (!/renderOffline\(null, setRenderPct\)/.test(code) || !/renderOffline\(stems\[n\], setRenderPct\)/.test(code))
    problems.push("progression-wheel.jsx: an export path renders without reporting progress");
  console.log(`export for Claude: ${ref.length} modulations referenced, ${state.arrangement.sections.length} sections described, round-trips clean`);
}

/* ---- the module seams hold ----
   Bundling hides two mistakes that only surface at runtime, as a blank screen: a module that
   declares something but forgets to export it, and the component referencing a module's symbol
   without importing it (esbuild assumes it's a global and says nothing). Both are cheap to check. */
{
  const MODS = ["theory.js", "progressions.js", "patterns.js", "audio.js", "midi.js", "pitch.js", "melody.js", "song.js", "wav.js", "zip.js", "arrange.js", "arrange-templates.js", "track-presets.js", "als.js", "als-template.js", "progressions.js", "export-state.js", "hook.js"];
  const strip = t => t
    .replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(?<![:\w])\/\/[^\n]*/g, " ")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""').replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``").replace(/\.\.\./g, " ");
  // top-level names, including the later declarators of `const A = …, B = …`
  const declared = text => {
    const out = new Set();
    for (const ln of text.split("\n")) {
      const d = ln.match(/^(?:const|let|var)\s+(.*)$/);
      if (d) {
        let depth = 0, cur = "";
        const parts = [];
        for (const ch of d[1]) {
          if ("([{".includes(ch)) depth++;
          else if (")]}".includes(ch)) depth--;
          if (ch === "," && depth === 0) { parts.push(cur); cur = ""; } else cur += ch;
        }
        parts.push(cur);
        for (const p of parts) { const n = p.match(/^\s*([A-Za-z_$][\w$]*)\s*=/); if (n) out.add(n[1]); }
      }
      const f = ln.match(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/);
      if (f) out.add(f[1]);
    }
    return out;
  };
  const exported = new Map(), declaredIn = new Map();
  for (const m of MODS) {
    const src = readFileSync("src/" + m, "utf8");
    const exp = src.match(/\nexport \{ (.*) \};/);
    if (!exp) { problems.push(`${m}: no export block`); continue; }
    for (const n of exp[1].split(", ")) exported.set(n.trim(), m);
    for (const n of declared(src.split("\nexport {")[0])) declaredIn.set(n, m);
  }
  // what the component imports, and what it actually uses
  const imported = new Set();
  for (const mm of code.matchAll(/^import \{([^}]*)\} from "\.\/[^"]*";$/gm))
    for (const n of mm[1].split(",")) imported.add(n.trim());
  const usedNames = new Set(strip(code.replace(/^import [^\n]*$/gm, "")).match(/[A-Za-z_$][\w$]*/g) || []);
  const localNames = declared(code);
  // A module may keep private helpers; what matters is only what the component reaches for.
  for (const n of usedNames) {
    if (localNames.has(n)) continue;
    if (exported.has(n) && !imported.has(n))
      problems.push(`progression-wheel.jsx uses \`${n}\` from ${exported.get(n)} without importing it`);
    else if (!exported.has(n) && declaredIn.has(n))
      problems.push(`progression-wheel.jsx uses \`${n}\`, which ${declaredIn.get(n)} declares but does not export`);
  }
  /* The scheduler's helpers all sit side by side inside `emitTick` — `fireNote`, `playLayer`,
     `applyMods` and the rest — and several of them want the same few pieces of per-note state.
     They are siblings, not nested, so one reaching for another's parameter is not a scope error the
     bundler will tell you about: esbuild assumes it is a global and emits it untouched. The result
     is a ReferenceError at the moment a control is first turned up, which is the worst possible
     time to find out. This caught exactly that in `fireNote` reaching for `li`. */
  {
    const body = code.slice(code.indexOf("const chainOf = li =>"), code.indexOf("const anySolo ="));
    // each `const name = (args) => {` … its own parameters plus anything declared inside it
    for (const fn of body.matchAll(/const (\w+) = \(([^)]*)\) => \{/g)) {
      const start = fn.index + fn[0].length;
      // walk to the matching brace so nested helpers do not bleed into each other
      let depth = 1, end = start;
      while (end < body.length && depth > 0) {
        const c = body[end++];
        if (c === "{") depth++; else if (c === "}") depth--;
      }
      const inner = body.slice(start, end);
      /* Every name the function binds for itself: its own parameters, anything it declares at any
         depth, and the parameters of the callbacks inside it. `declared` is not enough here — it
         only reads declarations at the start of a line and knows nothing about arrow parameters,
         and a false positive on a variable the function does own would make this guard noise. */
      const params = new Set(fn[2].split(",").map(s => s.trim().split(/[=:\s]/)[0]).filter(Boolean));
      // `const a = 1, b = 2` binds both — matching only the first name is how `col` read as free
      for (const d of inner.matchAll(/\b(?:const|let|var)\s+([^;\n]*)/g))
        for (const n of d[1].split(",")) { const k = n.trim().match(/^([\w$]+)/); if (k) params.add(k[1]); }
      for (const d of inner.matchAll(/\b(?:const|let|var)\s*[[{]([^\]}]*)[\]}]/g))
        for (const n of d[1].split(",")) { const k = n.trim().split(/[:=\s]/)[0]; if (k) params.add(k); }
      for (const d of inner.matchAll(/\(([^()]*)\)\s*=>/g))
        for (const n of d[1].split(",")) { const k = n.trim().split(/[=:\s]/)[0]; if (k) params.add(k); }
      for (const d of inner.matchAll(/([\w$]+)\s*=>/g)) params.add(d[1]);
      for (const d of inner.matchAll(/\bfor\s*\(\s*(?:const|let|var)\s+([\w$]+)/g)) params.add(d[1]);
      // the loop variables the scheduler passes around by hand — the ones easy to reach for
      for (const shared of ["li", "deg", "col", "slot", "vel", "flat"]) {
        if (params.has(shared)) continue;
        if (new RegExp("[^.\\w]" + shared + "\\s*[*+\\-,)\\].]").test(inner))
          problems.push(`src: ${fn[1]} uses \`${shared}\` without taking it — it is a sibling's variable, and the bundler will emit it as a global`);
      }
    }
  }
  console.log(`module seams: ${MODS.length} modules, ${exported.size} exports, ${imported.size} imported by the component`);
}

console.log(problems.length ? `\n✗ ${problems.length} PROBLEM(S):\n` + problems.map(p => "  - " + p).join("\n")
                            : "\n✓ all audio checks passed");
process.exit(problems.length ? 1 : 0);
