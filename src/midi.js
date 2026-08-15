/* midi — Writing a Standard MIDI File by hand, and reading a melody back out of one.
*/
import { DRUM_MIDI, KIT_PROGRAM, accentAt } from "./patterns.js";
import { chordIvs } from "./theory.js";

/* ===== midi export ===== */
const vlq = n => { const b = [n & 0x7f]; while ((n >>= 7)) b.unshift((n & 0x7f) | 0x80); return b; };
// meloCols (optional): flat list of eighth-columns aligned to bars × (beatsPerBar*2),
// each column a list of absolute MIDI note numbers. Runs of the same note across
// adjacent columns are merged into one held note (legato) so the exported line
// flows the way it plays.
// `melParts` is a list of { cols, program, gain } — one per melody part, each getting its own MIDI
// channel, General MIDI program and velocity scale. `chordProgram` voices the chord track.
function midiBytes(bpm, beatsPerBar, bars, drumPat, melParts, kit, sub = 2, chordProgram = null) {
  const T = 480, ev = (arr, dt, ...bytes) => arr.push(...vlq(dt), ...bytes);
  const trk = arr => {
    const body = [...arr, 0, 0xff, 0x2f, 0];
    return [0x4d,0x54,0x72,0x6b, (body.length>>>24)&255,(body.length>>>16)&255,(body.length>>>8)&255,body.length&255, ...body];
  };
  const uspq = Math.round(60000000 / bpm);
  const tempo = []; ev(tempo, 0, 0xff, 0x51, 3, (uspq>>16)&255, (uspq>>8)&255, uspq&255);
  const chordsT = [];
  ev(chordsT, 0, 0xff, 0x03, 6, 0x43, 0x68, 0x6f, 0x72, 0x64, 0x73);          // track name "Chords"
  if (chordProgram != null) ev(chordsT, 0, 0xc0, chordProgram & 0x7f);        // voice the chord track
  bars.forEach(b => {
    const notes = [36 + b.chord.root - 12, ...chordIvs(b.chord.quality).map(x => 60 + b.chord.root + x)];
    notes.forEach((n, i) => ev(chordsT, i ? 0 : 0, 0x90, n, 78));
    notes.forEach((n, i) => ev(chordsT, i ? 0 : beatsPerBar * T, 0x80, n, 0));
  });
  // drumPat may be one pattern (array) shared by every bar, or a function (barIndex) → pattern|null
  // so each section can carry its own kit (or fall silent) in the exported file
  const drumFn = typeof drumPat === "function" ? drumPat : () => drumPat;
  const drumHas = typeof drumPat === "function" ? bars.some((_, i) => drumFn(i)) : !!drumPat;
  const drumsT = [];
  if (drumHas) {
    let pend = 0;
    ev(drumsT, 0, 0xff, 0x03, 5, 0x44, 0x72, 0x75, 0x6d, 0x73);            // track name "Drums"
    if (KIT_PROGRAM[kit] != null) ev(drumsT, 0, 0xc9, KIT_PROGRAM[kit]);   // machine kit on channel 10
    for (let bar = 0; bar < bars.length; bar++) {
      const pat = drumFn(bar);
      // each bar's pattern sets its own step count, so a sixteenth-note kit and an eighth-note
      // one can sit in the same exported file and both come out at the right speed
      const steps = (pat && pat.length) || beatsPerBar * 2;
      const stepT = beatsPerBar * T / steps;
      const gate = Math.min(60, stepT * 0.5);            // note length; short enough to fit a 16th step
      for (let s = 0; s < steps; s++) {
        const notes = [...((pat && pat[s]) || "")].map(c => DRUM_MIDI[c] || 42);
        if (!notes.length) { pend += stepT; continue; }
        // cymbals and rim sit behind the kick/snare/clap, as they do in the app
        // the same positional accent the app plays, so the file grooves rather than sitting flat
        const acc = accentAt(s, steps / beatsPerBar);
        notes.forEach((n, i) => ev(drumsT, i ? 0 : pend, 0x99, n,
          Math.max(1, Math.round(([42,46,51,37].includes(n) ? 62 : 92) * acc))));
        notes.forEach((n, i) => ev(drumsT, i ? 0 : gate, 0x89, n, 0));
        pend = stepT - gate;
      }
    }
  }
  // build one melody track from its grid columns; each layer gets its own channel
  const buildMelo = (cols, chOn, chOff, gain = 1) => {
    const colsPerBar = Math.max(1, beatsPerBar * sub);
    const arr = []; let has = false;
    if (cols && cols.length) {
      const EI = T / sub, N = cols.length;                        // ticks per grid column
      const at = (i, note) => (cols[i] || []).includes(note);
      const evs = [];
      for (let i = 0; i < N; i++) for (const note of (cols[i] || [])) {
        if (i > 0 && at(i - 1, note)) continue;                   // continuation of a held note
        let run = 1;
        while (i + run < N && at(i + run, note)) run++;
        evs.push({ t: i * EI, on: 1, note, vel: Math.max(1, Math.min(127,
          Math.round(96 * gain * accentAt(i % colsPerBar, sub)))) });
        evs.push({ t: (i + run) * EI, on: 0, note });
      }
      has = evs.length > 0;
      evs.sort((a, b) => a.t - b.t || a.on - b.on);               // note-offs before note-ons at a tick
      let last = 0;
      for (const e of evs) { ev(arr, e.t - last, e.on ? chOn : chOff, e.note, e.on ? e.vel : 0); last = e.t; }
    }
    return { arr, has };
  };
  // one track per melody part, on its own channel. Channels 1.. skip 9 (percussion is channel 10
  // in 1-based terms, 9 here), so a part is never voiced as a drum kit by mistake.
  const chanFor = p => { const c = p + 1; return c >= 9 ? c + 1 : c; };
  const NAMES = "ABCDEF";
  const mels = (melParts || []).map((part, p) => {
    const ch = chanFor(p) & 0x0f;
    const cols = part && part.cols !== undefined ? part.cols : part;      // a bare column list still works
    const m = buildMelo(cols, 0x90 | ch, 0x80 | ch, (part && part.gain) == null ? 1 : part.gain);
    if (!m.has) return m;
    // name the track and voice it, so a DAW opens the arrangement already assigned
    const label = [...("Part " + (NAMES[p] || p + 1))].map(c => c.charCodeAt(0));
    const head = [...vlq(0), 0xff, 0x03, label.length, ...label];
    if (part && part.program != null) head.push(...vlq(0), 0xc0 | ch, part.program & 0x7f);
    return { ...m, arr: [...head, ...m.arr] };
  }).filter(m => m.has);
  const nTrk = 2 + (drumHas ? 1 : 0) + mels.length;
  const head = [0x4d,0x54,0x68,0x64, 0,0,0,6, 0,1, 0, nTrk, (T>>8)&255, T&255];
  return new Uint8Array([...head, ...trk(tempo), ...trk(chordsT),
    ...(drumHas ? trk(drumsT) : []), ...mels.flatMap(m => trk(m.arr))]);
}

/* ===== midi import ===== */
// Parse a standard MIDI file and pull out the single most melodic track as a list
// of { midi, startE, durE } where positions are in eighth-notes. Chooses a track
// named "Melody" if present (the Tune Transcriber tags its line that way),
// otherwise the non-drum track with the most notes. Returns null on a bad file.
function parseMidiMelody(buf) {
  const d = new DataView(buf);
  let p = 0;
  const u32 = () => { const v = d.getUint32(p); p += 4; return v; };
  const u16 = () => { const v = d.getUint16(p); p += 2; return v; };
  const u8 = () => d.getUint8(p++);
  if (u32() !== 0x4d546864) return null;                 // "MThd"
  u32();                                                  // header length
  u16();                                                  // format
  const ntrk = u16();
  const ppq = u16();
  if (ppq <= 0) return null;                              // SMPTE division unsupported
  const tracks = [];
  for (let t = 0; t < ntrk && p < buf.byteLength; t++) {
    if (u32() !== 0x4d54726b) break;                     // "MTrk"
    const len = u32();
    const end = p + len;
    let tick = 0, status = 0, name = "";
    const open = {};                                       // "note" → startTick
    const notes = [];
    while (p < end) {
      let dt = 0, b;
      do { b = u8(); dt = (dt << 7) | (b & 0x7f); } while (b & 0x80);
      tick += dt;
      let ev = u8();
      if (ev < 0x80) { ev = status; p--; } else status = ev;
      const hi = ev & 0xf0, ch = ev & 0x0f;
      if (ev === 0xff) {                                   // meta
        const type = u8(); let ml = 0, mb;
        do { mb = u8(); ml = (ml << 7) | (mb & 0x7f); } while (mb & 0x80);
        if (type === 0x03) { let s = ""; for (let i = 0; i < ml; i++) s += String.fromCharCode(u8()); name = s; }
        else p += ml;
      } else if (ev === 0xf0 || ev === 0xf7) {             // sysex
        let sl = 0, sb; do { sb = u8(); sl = (sl << 7) | (sb & 0x7f); } while (sb & 0x80); p += sl;
      } else if (hi === 0x90 || hi === 0x80) {
        const note = u8(), vel = u8();
        if (hi === 0x90 && vel > 0) { if (open[note] == null) open[note] = tick; }
        else { const st = open[note]; if (st != null) { notes.push({ midi: note, startTick: st, durTick: Math.max(1, tick - st) }); delete open[note]; } }
      } else if (hi === 0xa0 || hi === 0xb0 || hi === 0xe0) { p += 2; }
      else if (hi === 0xc0 || hi === 0xd0) { p += 1; }
      else p = end;                                        // unknown — bail this track
    }
    p = end;
    tracks.push({ name, notes, drums: notes.length === 0 });
  }
  const named = tracks.find(t => /melody/i.test(t.name) && t.notes.length);
  const cand = named || tracks.filter(t => t.notes.length).sort((a, b) => b.notes.length - a.notes.length)[0];
  if (!cand || !cand.notes.length) return null;
  const eighth = ppq / 2;
  return cand.notes.map(n => ({
    midi: n.midi,
    startE: Math.round(n.startTick / eighth),
    durE: Math.max(1, Math.round(n.durTick / eighth)),
  })).sort((a, b) => a.startE - b.startE);
}

export { vlq, midiBytes, parseMidiMelody };
