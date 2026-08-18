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
import * as als from "../src/als.js";

const M = { ...theory, ...patterns, ...audio, ...midiMod, ...melody, ...song, ...wav, ...progs, ...zip, ...arrange, ...als };
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

/* ---- the module seams hold ----
   Bundling hides two mistakes that only surface at runtime, as a blank screen: a module that
   declares something but forgets to export it, and the component referencing a module's symbol
   without importing it (esbuild assumes it's a global and says nothing). Both are cheap to check. */
{
  const MODS = ["theory.js", "progressions.js", "patterns.js", "audio.js", "midi.js", "pitch.js", "melody.js", "song.js", "wav.js", "zip.js", "arrange.js", "als.js", "als-template.js", "progressions.js"];
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
