/* Regenerates src/als-template.js from a Live-saved .als.

   The Live Set format is not something to write from memory. A set Live itself saved is the only
   reliable statement of what the schema is, so the exporter is built from one: this script takes a
   reference .als, strips it back to a shell plus one empty MIDI track plus one arrangement clip,
   punches placeholders where the song's own values go, and writes the result out as a module.
   src/als.js then fills those in. What ships is structure — no audio, no devices, no presets, no
   grooves, and none of the reference project's content.

     node scripts/als-template.mjs path/to/reference.als

   Re-run it against a set saved by a newer Live if the format moves on.  */
import { readFileSync, writeFileSync } from "fs";
import { gunzipSync } from "zlib";

const [src, ...extra] = process.argv.slice(2);
if (!src) { console.error("usage: node scripts/als-template.mjs <reference.als> [devices.als ...]"); process.exit(1); }
const read = f => {
  const raw = readFileSync(f);
  return (raw[0] === 0x1f && raw[1] === 0x8b ? gunzipSync(raw) : raw).toString("utf8");
};
const xml = read(src);
// devices may come from other sets — a reference full of effects need not be the one the document
// shape is taken from, and asking for both in one file is asking for a set nobody wants to build
const pool = [xml, ...extra.map(read)];

const TAG = /<(\/?)([A-Za-z][\w.]*)((?:[^>"]|"[^"]*")*?)(\/?)>/g;
// the whole element beginning at `i`, brackets included
const block = (s, i) => {
  let d = 0;
  const re = new RegExp(TAG.source, "g");
  re.lastIndex = 0;
  const tail = s.slice(i);
  for (const m of tail.matchAll(re)) {
    const [, close, , , self] = m;
    if (close) d--; else if (!self) d++;
    if (d === 0) return tail.slice(0, m.index + m[0].length);
  }
  throw new Error("unterminated element at " + i);
};
const elem = (s, name, from = 0) => {
  const i = s.indexOf(`<${name}>`, from) >= 0 ? s.indexOf(`<${name}>`, from) : s.indexOf(`<${name} `, from);
  if (i < 0) throw new Error("no <" + name + ">");
  return { i, text: block(s, i) };
};
const swap = (s, name, replacement, from = 0) => {
  const { i, text } = elem(s, name, from);
  return s.slice(0, i) + replacement + s.slice(i + text.length);
};
// a one-off <Tag Value="…" /> — the first after `from`
const swapValue = (s, name, value, from = 0) => {
  const re = new RegExp(`<${name} Value="[^"]*" />`);
  const rel = s.slice(from).replace(re, `<${name} Value="${value}" />`);
  return s.slice(0, from) + rel;
};

/* ---- the tracks: one empty MIDI track for the shape, one clip for the notes ---- */
const midiTracks = [...xml.matchAll(/<MidiTrack Id="\d+"/g)].map(m => block(xml, m.index));
// the empty one is the shape we want: a track with no devices on it, which is what we export
const clean = midiTracks.filter(t => /<Devices \/>/.test(t)).sort((a, b) => a.length - b.length)[0];
if (!clean) throw new Error("the reference has no MIDI track without devices — add one and re-save");
const clipSrc = midiTracks.find(t => /<MidiClip Id=/.test(t));
if (!clipSrc) throw new Error("the reference has no arrangement clip — draw one and re-save");

/* the clip, with everything the song decides punched out. What is left is Live's own shape:
   the follow action, the grid, the warp and scale blocks, the note stores — all of which a
   hand-written clip omitted, and any one of which may be what Live went looking for. */
let CLIP = block(clipSrc, clipSrc.indexOf("<MidiClip Id="));
{
  const notes = elem(CLIP, "KeyTracks");
  CLIP = CLIP.slice(0, notes.i) + "<KeyTracks>%KEYTRACKS%</KeyTracks>" + CLIP.slice(notes.i + notes.text.length);
  CLIP = CLIP.replace(/<MidiClip Id="\d+" Time="[^"]*">/, '<MidiClip Id="0" Time="%START%">');
  CLIP = swapValue(CLIP, "CurrentStart", "%START%");
  CLIP = swapValue(CLIP, "CurrentEnd", "%END%");
  const loop = elem(CLIP, "Loop");
  let L = loop.text;
  L = swapValue(L, "LoopStart", "0"); L = swapValue(L, "LoopEnd", "%LENGTH%");
  L = swapValue(L, "OutMarker", "%LENGTH%");
  L = swapValue(L, "HiddenLoopStart", "0"); L = swapValue(L, "HiddenLoopEnd", "%LENGTH%");
  L = swapValue(L, "LoopOn", "false");
  CLIP = CLIP.slice(0, loop.i) + L + CLIP.slice(loop.i + loop.text.length);
  const nm = elem(CLIP, "Name", CLIP.indexOf("</Loop>"));
  CLIP = CLIP.slice(0, nm.i) + '<Name Value="%NAME%" />' + CLIP.slice(nm.i + nm.text.length);
  CLIP = swapValue(CLIP, "Color", "%COLOR%", CLIP.indexOf("%NAME%"));
  CLIP = swapValue(CLIP, "GrooveId", "-1");                       // no groove: the pool ships empty
  CLIP = swapValue(CLIP, "Numerator", "%TSNUM%");
  CLIP = swapValue(CLIP, "Denominator", "%TSDEN%");
  CLIP = swapValue(CLIP, "TakeId", "1");
  const gen = elem(CLIP, "NoteIdGenerator");
  CLIP = CLIP.slice(0, gen.i) + "<NoteIdGenerator><NextId Value=\"%NEXTNOTE%\" /></NoteIdGenerator>"
       + CLIP.slice(gen.i + gen.text.length);
}

/* the track. Both places Live keeps an arrangement clip get one: the take lane and the arranger
   automation. They are the same clip twice — that is how Live writes it, not a duplication here. */
let TRACK = clean;
{
  const name = elem(TRACK, "Name");
  TRACK = TRACK.slice(0, name.i) + '<Name><EffectiveName Value="%NAME%" /><UserName Value="%NAME%" />'
        + '<Annotation Value="%NOTE%" /><MemorizedFirstClipName Value="%NAME%" /></Name>'
        + TRACK.slice(name.i + name.text.length);
  TRACK = swapValue(TRACK, "Color", "%COLOR%", TRACK.indexOf("</Name>"));
  const vol = elem(TRACK, "Volume");
  TRACK = TRACK.slice(0, vol.i) + swapValue(vol.text, "Manual", "%VOL%")
        + TRACK.slice(vol.i + vol.text.length);
  // the mixer's own Pan, not the auto-pan LFO: where the part sits in the stereo picture
  const pan = elem(TRACK, "Pan");
  TRACK = TRACK.slice(0, pan.i) + swapValue(pan.text, "Manual", "%PAN%")
        + TRACK.slice(pan.i + pan.text.length);
  TRACK = swap(TRACK, "Sends", "<Sends />");                      // no returns, so no sends
  // the instrument chain: the last Devices list in the track, and the one an instrument goes in
  {
    const at = TRACK.lastIndexOf("<Devices />");
    if (at < 0) throw new Error("the reference's clean track has devices on it — pick one without");
    TRACK = TRACK.slice(0, at) + "<Devices>%DEVICES%</Devices>" + TRACK.slice(at + "<Devices />".length);
  }
  const takeLanes = elem(clipSrc, "TakeLanes");
  TRACK = swap(TRACK, "TakeLanes",
    takeLanes.text.replace(block(takeLanes.text, takeLanes.text.indexOf("<MidiClip Id=")), "%CLIP%"));
  const timeable = elem(clipSrc, "ClipTimeable");
  TRACK = swap(TRACK, "ClipTimeable",
    timeable.text.replace(block(timeable.text, timeable.text.indexOf("<MidiClip Id=")), "%CLIP%"));
}

/* An instrument to put on the melodic tracks, so an exported set makes a sound the moment it opens
   rather than sitting there silent with the meters moving. Lifted from whichever track in the
   reference carries a plain instrument — no rack, because a Drum Rack's pads are sample references
   into somebody else's library and would arrive broken on anyone's machine but the one that saved
   them. The drums keep their "drop a Drum Rack on this" note for the same reason. */
const INSTRUMENT_TAGS = ["Drift", "UltraAnalog", "Operator", "InstrumentVector", "Meld"];
let INSTRUMENT = "";
for (const tag of INSTRUMENT_TAGS) {
  const i = xml.indexOf(`<${tag} `) >= 0 ? xml.indexOf(`<${tag} `) : xml.indexOf(`<${tag}>`);
  if (i < 0) continue;
  INSTRUMENT = block(xml, i);
  console.log(`instrument taken from <${tag}> (${INSTRUMENT.length} chars)`);
  break;
}

/* The effects, for carrying the sketch's own sound across. Live's parameter names are its own
   (`Filter_Frequency` in Hz, `Filter_Resonance`, `Envelope_Amount`), so what the app has to do is
   convert its 0..100 controls into those units — which is src/als-fx.js's job, not this file's.
   Here they are only lifted, one block each, from wherever in the reference they sit: a device
   inside a rack is as good as one on the chain, because the block is self-contained either way.

   A preset reference carries the path it was loaded from, and those are somebody's home directory.
   They are stripped: Live shows the device's own name instead of a preset's, which is what we want
   anyway, since every value is about to be overwritten. */
const DEVICE_TAGS = {
  autoFilter: "AutoFilter2", compressor: "Compressor2", echo: "Echo", reverb: "Reverb",
  saturator: "Saturator", phaser: "PhaserNew", autoPan: "AutoPan",
};
const stripPaths = s => s
  .replace(/<Path Value="[^"]*"/g, '<Path Value=""')
  .replace(/<RelativePath Value="[^"]*"/g, '<RelativePath Value=""')
  .replace(/<Name Value="[^"]*\.(?:adv|adg|amxd)"/g, '<Name Value=""');
const DEVICES = {};
for (const [key, tag] of Object.entries(DEVICE_TAGS)) {
  for (const doc of pool) {
    const i = doc.indexOf(`<${tag} `) >= 0 ? doc.indexOf(`<${tag} `) : doc.indexOf(`<${tag}>`);
    if (i < 0) continue;
    DEVICES[key] = stripPaths(block(doc, i));
    break;
  }
  if (!DEVICES[key]) console.warn(`  (no <${tag}> in any reference — ${key} will be unavailable)`);
}

/* the document around them. The reference's own tracks, sends, grooves and playhead go; its shell
   — main track, prehear, scenes, transport and the sixty-odd view-state values Live writes and a
   hand-written set never knew about — stays exactly as Live wrote it. */
let DOC = xml;
{
  DOC = DOC.replace(/Creator="[^"]*"/, 'Creator="Progression Wheel"');
  DOC = swap(DOC, "Tracks", "<Tracks>%TRACKS%</Tracks>");
  DOC = swapValue(DOC, "NextPointeeId", "%NEXTID%");
  const main = elem(DOC, "MainTrack");
  let M = main.text;
  M = swap(M, "Sends", "<Sends />");
  const tempo = elem(M, "Tempo");
  M = M.slice(0, tempo.i) + swapValue(tempo.text, "Manual", "%BPM%") + M.slice(tempo.i + tempo.text.length);
  const ts = elem(M, "TimeSignature");
  M = M.slice(0, ts.i) + swapValue(ts.text, "Manual", "%TSID%") + M.slice(ts.i + ts.text.length);
  DOC = DOC.slice(0, main.i) + M + DOC.slice(main.i + main.text.length);
  const pre = elem(DOC, "PreHearTrack");
  DOC = DOC.slice(0, pre.i) + swap(pre.text, "Sends", "<Sends />") + DOC.slice(pre.i + pre.text.length);
  DOC = swap(DOC, "SendsPre", "<SendsPre />");
  DOC = swap(DOC, "GroovePool", "<GroovePool><Grooves /></GroovePool>");
  DOC = swap(DOC, "Locators", "<Locators><Locators>%LOCATORS%</Locators></Locators>");
  const tp = elem(DOC, "Transport");
  DOC = DOC.slice(0, tp.i) + swapValue(tp.text, "CurrentTime", "0") + DOC.slice(tp.i + tp.text.length);
}

// whitespace between elements is Live's indentation; it carries nothing, and there is a lot of it
const tighten = s => s.replace(/>\s+</g, "><").trim();
const lit = s => "`" + tighten(s).replace(/[\\`$]/g, m => "\\" + m) + "`";
const head = /<Ableton[^>]*MinorVersion="([^"]*)"[^>]*>/.exec(xml);

writeFileSync("src/als-template.js", `/* als-template — the shape of a Live Set, taken from one Live saved.

   Generated by scripts/als-template.mjs from a reference set (Live schema ${head[1]}); do not edit
   by hand. It is structure only: an empty document shell, one MIDI track with no devices on it, and
   one arrangement clip, with %PLACEHOLDERS% where src/als.js puts the song. Nothing of the
   reference project — no audio, devices, presets, grooves or notes — is here.

   Why a template at all: a hand-written set was refused by Live, and then crashed it. Live's own
   loader expects a document with scenes, clip slots, take lanes, a transport and sixty-odd view
   states, and no amount of reading the format from the outside gets all of that right. Copying a
   real one does. */

const ALS_DOC = ${lit(DOC)};

const ALS_TRACK = ${lit(TRACK)};

const ALS_CLIP = ${lit(CLIP)};

/* One instrument, for the melodic tracks. A track with no device is silent in Live however good
   its notes are — the meters move and nothing comes out — so this is what turns an export from a
   score into something you can press play on. */
const ALS_INSTRUMENT = ${lit(INSTRUMENT)};

/* The effect devices, at whatever settings the reference had them — every value src/als-fx.js maps
   is overwritten on the way out, so what matters here is the shape, not the sound. */
const ALS_DEVICES = {
${Object.entries(DEVICES).map(([k, v]) => `  ${k}: ${lit(v)},`).join("\n")}
};

export { ALS_DOC, ALS_TRACK, ALS_CLIP, ALS_INSTRUMENT, ALS_DEVICES };
`);
console.log(`src/als-template.js written — doc ${tighten(DOC).length}, track ${tighten(TRACK).length}, `
  + `clip ${tighten(CLIP).length}, instrument ${tighten(INSTRUMENT).length} chars (Live ${head[1]})`);
for (const [k, v] of Object.entries(DEVICES)) console.log(`  device ${k}: ${tighten(v).length} chars`);
