import { useState, useRef, useEffect, useMemo } from "react";

/* ============================================================================
   The Tune Transcriber — hum or sing a tune, get it on a stave.

   Records the microphone (or an uploaded audio file), tracks the pitch with the
   McLeod / NSDF autocorrelation method, segments the pitch track into notes,
   quantises them to a tempo grid, guesses the key, draws the result on a treble
   stave in the same visual language as the Progression Wheel, plays it back, and
   exports a standard MIDI melody you can load straight into the songwheel.

   Single source file; scripts/build.mjs compiles it to transcribe.html.
   ========================================================================== */

/* ===== music helpers (shared spelling with the Progression Wheel) ===== */
const A4 = 440;
const hzToMidi = hz => 69 + 12 * Math.log2(hz / A4);
const midiToHz = m => A4 * Math.pow(2, (m - 69) / 12);
// natural pitch class of each letter C D E F G A B
const LETTER = ["C", "D", "E", "F", "G", "A", "B"];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const SEMI_SHARP = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
// diatonic staff step of a midi note given a letter index (C4=60 → 28); one step = one line/space
const stepOf = (midi, letterIdx) => (Math.floor(midi / 12) - 1) * 7 + letterIdx;

// sharps get added in this order of letters; flats in the reverse
const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6];   // F C G D A E B  (letter indices)
const FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3];    // B E A D G C F
// major keys and how many sharps(+) or flats(-) they carry, by tonic pitch-class
const MAJOR_FIFTHS = { 0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 11: 5, 6: 6, 1: -5, 8: -4, 3: -3, 10: -2, 5: -1 };

// build a pitch-class → { letter index, accidental } spelling table for a key
function buildSpelling(tonicPc, mode) {
  // relative major carries the key signature
  const majPc = mode === "minor" ? (tonicPc + 3) % 12 : tonicPc;
  let fifths = MAJOR_FIFTHS[majPc];
  if (fifths === undefined) fifths = 0;
  const acc = [0, 0, 0, 0, 0, 0, 0];           // per-letter key accidental
  if (fifths > 0) for (let i = 0; i < fifths; i++) acc[SHARP_ORDER[i]] = 1;
  else for (let i = 0; i < -fifths; i++) acc[FLAT_ORDER[i]] = -1;
  const spell = new Array(12).fill(null);
  // diatonic notes take their key accidental
  for (let l = 0; l < 7; l++) {
    const pc = (LETTER_PC[l] + acc[l] + 12) % 12;
    if (spell[pc] == null) spell[pc] = { letter: l, acc: acc[l] };
  }
  // remaining chromatic notes: sharp-of-below in sharp keys, flat-of-above in flat keys
  for (let pc = 0; pc < 12; pc++) {
    if (spell[pc]) continue;
    if (fifths >= 0) {
      const below = (pc - 1 + 12) % 12;
      const l = LETTER.findIndex((_, i) => (LETTER_PC[i] + acc[i] + 12) % 12 === below);
      spell[pc] = l >= 0 ? { letter: l, acc: acc[l] + 1 } : { letter: 0, acc: 1 };
    } else {
      const above = (pc + 1) % 12;
      const l = LETTER.findIndex((_, i) => (LETTER_PC[i] + acc[i] + 12) % 12 === above);
      spell[pc] = l >= 0 ? { letter: l, acc: acc[l] - 1 } : { letter: 0, acc: -1 };
    }
  }
  return { spell, fifths };
}

/* ===== pitch detection — McLeod Pitch Method (NSDF) ===== */
// returns { hz, clarity } or null for unvoiced / too quiet
function detectPitch(buf, sampleRate) {
  const SIZE = buf.length;
  // RMS gate
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.006) return null;                         // silence

  const maxLag = Math.floor(SIZE / 2);
  const nsdf = new Float32Array(maxLag);
  for (let lag = 0; lag < maxLag; lag++) {
    let ac = 0, m = 0;
    for (let i = 0; i < SIZE - lag; i++) {
      ac += buf[i] * buf[i + lag];
      m += buf[i] * buf[i] + buf[i + lag] * buf[i + lag];
    }
    nsdf[lag] = m > 0 ? (2 * ac) / m : 0;
  }
  // pick key maxima: first positive-going zero crossing, then peaks between crossings
  const maxima = [];
  let lag = 1;
  while (lag < maxLag - 1 && nsdf[lag] > 0) lag++;      // skip the lag-0 hump
  while (lag < maxLag - 1) {
    if (nsdf[lag] > 0) {
      let best = lag, bestV = nsdf[lag];
      while (lag < maxLag - 1 && nsdf[lag] > 0) {
        if (nsdf[lag] > bestV) { bestV = nsdf[lag]; best = lag; }
        lag++;
      }
      maxima.push({ lag: best, val: bestV });
    } else lag++;
  }
  if (!maxima.length) return null;
  const peak = Math.max(...maxima.map(m => m.val));
  const CLARITY = 0.62;                                 // fraction-of-peak threshold
  const chosen = maxima.find(m => m.val >= CLARITY * peak) || maxima[0];
  if (chosen.val < 0.45) return null;                   // too noisy to trust

  // parabolic interpolation around the chosen lag for sub-sample precision
  const x = chosen.lag;
  const a = nsdf[x - 1], b = nsdf[x], c = nsdf[x + 1];
  const denom = a - 2 * b + c;
  const shift = denom !== 0 ? (0.5 * (a - c)) / denom : 0;
  const trueLag = x + shift;
  const hz = sampleRate / trueLag;
  if (hz < 65 || hz > 1400) return null;                // out of singing range
  return { hz, clarity: chosen.val, rms };
}

/* ===== pitch track → raw notes ===== */
// samples: Float32Array; returns [{ midi, t0, t1, conf }] in seconds
function tracktoNotes(samples, sampleRate, minNoteMs = 70) {
  const WIN = 2048;
  const HOP = Math.round(sampleRate * 0.011);           // ~11 ms
  const frames = [];
  for (let start = 0; start + WIN <= samples.length; start += HOP) {
    const slice = samples.subarray(start, start + WIN);
    const p = detectPitch(slice, sampleRate);
    frames.push({
      t: (start + WIN / 2) / sampleRate,
      midi: p ? hzToMidi(p.hz) : null,
      conf: p ? p.clarity : 0,
    });
  }
  // median-smooth the fractional midi to kill octave blips
  const W = 2;
  const sm = frames.map((f, i) => {
    if (f.midi == null) return null;
    const vals = [];
    for (let k = -W; k <= W; k++) { const g = frames[i + k]; if (g && g.midi != null) vals.push(g.midi); }
    vals.sort((a, b) => a - b);
    return vals.length ? vals[Math.floor(vals.length / 2)] : f.midi;
  });
  // segment: runs of voiced frames whose rounded pitch is stable
  const notes = [];
  let cur = null;
  const flush = () => {
    if (!cur) return;
    const dur = cur.tEnd - cur.tStart;
    if (dur * 1000 >= minNoteMs && cur.pitches.length) {
      // note pitch = median of rounded frame pitches (mode-ish, robust)
      const rounded = cur.pitches.map(Math.round).sort((a, b) => a - b);
      const midi = rounded[Math.floor(rounded.length / 2)];
      const conf = cur.conf / cur.pitches.length;
      notes.push({ midi, t0: cur.tStart, t1: cur.tEnd, conf });
    }
    cur = null;
  };
  for (let i = 0; i < frames.length; i++) {
    const m = sm[i];
    if (m == null) { flush(); continue; }
    const r = Math.round(m);
    if (cur && Math.abs(r - cur.ref) < 0.5) {
      cur.tEnd = frames[i].t; cur.pitches.push(m); cur.conf += frames[i].conf;
    } else {
      flush();
      cur = { ref: r, tStart: frames[i].t, tEnd: frames[i].t, pitches: [m], conf: frames[i].conf };
    }
  }
  flush();
  return notes;
}

/* ===== tempo ===== */
// crude auto-tempo: assume the shortest common note ≈ one grid step; search BPMs
// for the one that lines note onsets up best against an eighth-note grid.
function estimateTempo(notes) {
  if (notes.length < 3) return 100;
  let best = 100, bestErr = Infinity;
  for (let bpm = 60; bpm <= 180; bpm += 1) {
    const beat = 60 / bpm;
    const step = beat / 2;                               // eighth-note grid
    let err = 0;
    for (const n of notes) {
      const q = n.t0 / step;
      err += Math.abs(q - Math.round(q));
    }
    err /= notes.length;
    if (err < bestErr) { bestErr = err; best = bpm; }
  }
  return best;
}

/* ===== quantise to a unit grid =====
   U = grid units per quarter note (2 = eighth grid, 4 = sixteenth grid).
   returns { notes:[{midi,startU,durU}], U } aligned so time 0 = unit 0. */
function quantise(rawNotes, bpm, U, offsetSec) {
  const beat = 60 / bpm;
  const unitSec = beat / U;
  const out = [];
  for (const n of rawNotes) {
    let s = Math.round((n.t0 - offsetSec) / unitSec);
    let e = Math.round((n.t1 - offsetSec) / unitSec);
    if (s < 0) s = 0;
    if (e <= s) e = s + 1;                               // minimum one grid unit
    out.push({ midi: n.midi, startU: s, durU: e - s });
  }
  // resolve overlaps (monophonic): trim earlier note to next onset
  out.sort((a, b) => a.startU - b.startU);
  for (let i = 0; i < out.length - 1; i++) {
    const end = out[i].startU + out[i].durU;
    if (end > out[i + 1].startU) out[i].durU = Math.max(1, out[i + 1].startU - out[i].startU);
  }
  return out;
}

/* ===== key detection — Krumhansl–Schmuckler ===== */
const KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KS_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
function detectKey(notes) {
  if (!notes.length) return { tonic: 0, mode: "major" };
  const hist = new Array(12).fill(0);
  for (const n of notes) hist[((n.midi % 12) + 12) % 12] += n.durU || 1;
  const corr = (profile, shift) => {
    let s = 0;
    for (let i = 0; i < 12; i++) s += hist[i] * profile[(i - shift + 12) % 12];
    return s;
  };
  let best = { tonic: 0, mode: "major", score: -Infinity };
  for (let t = 0; t < 12; t++) {
    const maj = corr(KS_MAJOR, t), min = corr(KS_MINOR, t);
    if (maj > best.score) best = { tonic: t, mode: "major", score: maj };
    if (min > best.score) best = { tonic: t, mode: "minor", score: min };
  }
  return best;
}

/* ===== snap notes to the key's scale ===== */
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];
function snapToKey(notes, tonic, mode) {
  const scale = (mode === "minor" ? MINOR_SCALE : MAJOR_SCALE).map(s => (s + tonic) % 12);
  return notes.map(n => {
    const pc = ((n.midi % 12) + 12) % 12;
    if (scale.includes(pc)) return n;
    let bestPc = pc, bestD = 99;
    for (const s of scale) {
      const d = Math.min((s - pc + 12) % 12, (pc - s + 12) % 12);
      if (d < bestD) { bestD = d; bestPc = s; }
    }
    // move by the signed nearest distance, keeping the octave
    let up = (bestPc - pc + 12) % 12, down = (pc - bestPc + 12) % 12;
    const delta = up <= down ? up : -down;
    return { ...n, midi: n.midi + delta };
  });
}

/* ===== build stave measures from quantised notes =====
   time signature [num, den]; U units per quarter.
   returns measures: [{ items: [{ rest, midi, durU, dot, tieStart, tieStop }] }] */
function buildMeasures(qnotes, timeSig, U) {
  const [num, den] = timeSig;
  const unitsPerBar = Math.round(num * (4 / den) * U);
  // total length = end of last note, padded to a full bar
  const end = qnotes.reduce((m, n) => Math.max(m, n.startU + n.durU), 0);
  const totalBars = Math.max(1, Math.ceil(end / unitsPerBar));
  const totalU = totalBars * unitsPerBar;

  // paint a per-unit timeline: unit → midi or null
  const line = new Array(totalU).fill(null);
  for (const n of qnotes) for (let u = n.startU; u < n.startU + n.durU && u < totalU; u++) line[u] = n.midi;

  // durations we can render, in units, longest first: [units, quarters, dots]
  const perQ = U;
  const cands = [
    [4 * perQ, 4, 0], [3 * perQ, 3, 1], [2 * perQ, 2, 0], [1.5 * perQ, 1.5, 1],
    [perQ, 1, 0], [0.75 * perQ, 0.75, 1], [0.5 * perQ, 0.5, 0],
    [0.375 * perQ, 0.375, 1], [0.25 * perQ, 0.25, 0],
  ].filter(c => Number.isInteger(c[0]) && c[0] >= 1);

  const measures = [];
  for (let bar = 0; bar < totalBars; bar++) {
    const items = [];
    let u = 0;
    while (u < unitsPerBar) {
      const midi = line[bar * unitsPerBar + u];
      // run of the same value (or same rest) within the bar
      let run = 1;
      while (u + run < unitsPerBar && line[bar * unitsPerBar + u + run] === midi) run++;
      // decompose `run` units into renderable pieces, tied together
      let rem = run, first = true;
      let off = u;
      while (rem > 0) {
        const c = cands.find(c => c[0] <= rem) || cands[cands.length - 1];
        const durU = c[0];
        // don't let a piece cross a beat boundary awkwardly for beaming — fine as-is
        items.push({
          rest: midi == null, midi, durU, quarters: c[1], dot: c[2],
          tieStop: !first, tieStart: false, at: off,
        });
        if (!first && midi != null) items[items.length - 2].tieStart = true;
        first = false; rem -= durU; off += durU;
      }
      u += run;
    }
    measures.push({ items, unitsPerBar });
  }
  return measures;
}

/* ===== MIDI export (standard SMF, format 1: tempo + melody track) ===== */
const PPQ = 480;
const vlq = n => { const b = [n & 0x7f]; while ((n >>= 7)) b.unshift((n & 0x7f) | 0x80); return b; };
function melodyMidiBytes(qnotes, bpm, U) {
  const ticksPerUnit = PPQ / U;
  const trk = arr => {
    const body = [...arr, 0, 0xff, 0x2f, 0];
    return [0x4d, 0x54, 0x72, 0x6b, (body.length >>> 24) & 255, (body.length >>> 16) & 255,
      (body.length >>> 8) & 255, body.length & 255, ...body];
  };
  const ev = (arr, dt, ...bytes) => arr.push(...vlq(dt), ...bytes);
  const uspq = Math.round(60000000 / bpm);
  const tempo = []; ev(tempo, 0, 0xff, 0x51, 3, (uspq >> 16) & 255, (uspq >> 8) & 255, uspq & 255);
  // 4/4 time-sig meta so importers read bars sensibly
  ev(tempo, 0, 0xff, 0x58, 4, 4, 2, 24, 8);
  // events
  const evs = [];
  for (const n of qnotes) {
    evs.push({ t: Math.round(n.startU * ticksPerUnit), on: 1, note: n.midi });
    evs.push({ t: Math.round((n.startU + n.durU) * ticksPerUnit), on: 0, note: n.midi });
  }
  evs.sort((a, b) => a.t - b.t || a.on - b.on);
  const meloT = [];
  ev(meloT, 0, 0xff, 0x03, 6, ...[..."Melody"].map(ch => ch.charCodeAt(0)));  // track name
  let last = 0;
  for (const e of evs) { ev(meloT, e.t - last, e.on ? 0x90 : 0x80, e.note, e.on ? 90 : 0); last = e.t; }
  const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, 2, (PPQ >> 8) & 255, PPQ & 255];
  return new Uint8Array([...head, ...trk(tempo), ...trk(meloT)]);
}

/* ===== stave rendering ===== */
const INK = "#EDE7DA", FAINT = "#3A4453", SYM = "#EAE2CC", GOLD = "#E5B554";
const REST_GLYPH = { 4: "𝄻", 2: "𝄼", 1: "𝄽", 0.5: "𝄾", 0.25: "𝄿", 3: "𝄼", 1.5: "𝄽", 0.75: "𝄾", 0.375: "𝄿" };

function Stave({ measures, spelling, timeSig, perSystem = 4 }) {
  const LG = 9, staffH = 4 * LG;
  const clefW = 52, barW = 190, padL = 8, padTop = 30;
  const sysW = clefW + perSystem * barW + padL;
  const trebleTop = padTop, trebleMid = trebleTop + 2 * LG;           // B4 line = step 34
  const sysH = trebleTop + staffH + 46;
  const yTreble = step => trebleMid - (step - 34) * (LG / 2);
  const nSys = Math.ceil(measures.length / perSystem) || 1;
  const totalH = nSys * sysH + 10;
  const rx = LG * 0.6, ry = LG * 0.5, STEM = 3.3 * LG;
  let uid = 0;

  // key signature accidental positions (staff steps in the treble stave)
  const sig = [];
  if (spelling) {
    const order = spelling.fifths > 0 ? SHARP_ORDER : FLAT_ORDER;
    const glyph = spelling.fifths > 0 ? "♯" : "♭";
    // conventional stave rows for the treble clef
    const SHARP_STEPS = { 3: 38, 0: 35, 4: 39, 1: 36, 5: 33, 2: 37, 6: 34 };
    const FLAT_STEPS = { 6: 34, 2: 37, 5: 33, 1: 36, 4: 32, 0: 35, 3: 31 };
    const steps = spelling.fifths > 0 ? SHARP_STEPS : FLAT_STEPS;
    for (let i = 0; i < Math.abs(spelling.fifths); i++) sig.push({ step: steps[order[i]], glyph });
  }

  const spellMidi = midi => {
    const pc = ((midi % 12) + 12) % 12;
    const sp = spelling ? spelling.spell[pc] : { letter: SEMI_SHARP[pc].length > 1 ? 0 : 0, acc: 0 };
    return { step: stepOf(midi, sp.letter), acc: sp.acc };
  };

  const systems = [];
  for (let sy = 0; sy < nSys; sy++) {
    const y0 = sy * sysH;
    const bars = measures.slice(sy * perSystem, sy * perSystem + perSystem);
    const parts = [];
    // staff lines
    [30, 32, 34, 36, 38].forEach(s =>
      parts.push(<line key={"sl" + s} x1={padL} y1={yTreble(s)} x2={sysW} y2={yTreble(s)} stroke={FAINT} strokeWidth="1" />));
    parts.push(<text key="clef" x={padL + 4} y={yTreble(31)} fill={INK} fontSize="40" fontFamily="serif">𝄞</text>);
    // key signature
    let kx = padL + 34;
    sig.forEach((s, i) => parts.push(
      <text key={"ks" + i} x={kx + i * 8} y={yTreble(s.step) + 5} fill={INK} fontSize="17" fontFamily="serif">{s.glyph}</text>));
    kx += sig.length * 8 + 4;
    // time signature on the first system
    if (sy === 0) {
      parts.push(<text key="tsn" x={kx + 6} y={yTreble(36)} textAnchor="middle" fill={INK} fontSize="15" fontWeight="700" fontFamily="serif">{timeSig[0]}</text>);
      parts.push(<text key="tsd" x={kx + 6} y={yTreble(31)} textAnchor="middle" fill={INK} fontSize="15" fontWeight="700" fontFamily="serif">{timeSig[1]}</text>);
    }
    const x0 = clefW;
    parts.push(<line key="bl0" x1={x0} y1={yTreble(38)} x2={x0} y2={yTreble(30)} stroke={FAINT} strokeWidth="1" />);

    bars.forEach((m, bi) => {
      const bx0 = x0 + bi * barW, bx1 = bx0 + barW;
      const inner = bx0 + 14, span = barW - 26;
      const unitsPerBar = m.unitsPerBar;
      // accidental memory within the bar (letter+octave → acc drawn)
      const accMem = {};
      // geometry for each melodic item, for beaming
      const geo = [];
      m.items.forEach(it => {
        const cx = inner + (it.at / unitsPerBar) * span;
        if (it.rest) {
          const g = REST_GLYPH[it.quarters] || "𝄽";
          parts.push(<text key={"r" + uid++} x={cx} y={yTreble(34) + 2} textAnchor="middle" fill={INK} fontSize="22" fontFamily="serif">{g}</text>);
          if (it.dot) parts.push(<circle key={"rd" + uid++} cx={cx + 9} cy={yTreble(33)} r="1.6" fill={INK} />);
          return;
        }
        const { step, acc } = spellMidi(it.midi);
        const cy = yTreble(step);
        const open = it.quarters >= 2;
        // ledger lines
        for (let k = 40; k <= step; k += 2) parts.push(<line key={"lg" + uid++} x1={cx - 9} y1={yTreble(k)} x2={cx + 9} y2={yTreble(k)} stroke={INK} strokeWidth="1" />);
        for (let k = 28; k >= step; k -= 2) parts.push(<line key={"lg" + uid++} x1={cx - 9} y1={yTreble(k)} x2={cx + 9} y2={yTreble(k)} stroke={INK} strokeWidth="1" />);
        // accidental (draw when it differs from what's remembered / key implies)
        const memKey = step;
        const want = acc;
        if (accMem[memKey] === undefined ? want !== 0 && !it.tieStop : accMem[memKey] !== want) {
          if (!it.tieStop) {
            const gl = want === 0 ? "♮" : want < 0 ? "♭" : "♯";
            parts.push(<text key={"ac" + uid++} x={cx - rx - 4} y={cy + 4} textAnchor="end" fill={INK} fontSize="15" fontFamily="serif">{gl}</text>);
            accMem[memKey] = want;
          }
        }
        parts.push(<ellipse key={"nh" + uid++} cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(-18 ${cx} ${cy})`}
          fill={open ? "none" : INK} stroke={INK} strokeWidth={open ? 1.5 : 0} />);
        if (it.dot) parts.push(<circle key={"dt" + uid++} cx={cx + rx + 4} cy={yTreble(step % 2 === 0 ? step - 1 : step)} r="1.6" fill={INK} />);
        geo.push({ cx, cy, step, quarters: it.quarters, at: it.at });
      });
      // stems + beams for melodic notes
      const midStep = 34;
      const stemUp = geo.length ? (geo.reduce((a, g) => a + g.step, 0) / geo.length <= midStep) : true;
      // beam groups: consecutive sub-quarter notes within the same beat
      const beamed = new Set(), groups = [];
      let i = 0;
      while (i < geo.length) {
        if (geo[i].quarters < 1) {
          const beat = Math.floor(geo[i].at / (U));    // U units per quarter = one beat
          const grp = [i];
          let j = i + 1;
          while (j < geo.length && geo[j].quarters < 1 && Math.floor(geo[j].at / U) === beat) { grp.push(j); j++; }
          if (grp.length > 1) { grp.forEach(k => beamed.add(k)); groups.push(grp); i = j; continue; }
        }
        i++;
      }
      geo.forEach((g, gi) => {
        if (g.quarters >= 4) return;                    // whole note: no stem
        const sx = stemUp ? g.cx + rx - 0.5 : g.cx - rx + 0.5;
        if (beamed.has(gi)) return;                      // beam handles the stem
        const y2 = stemUp ? g.cy - STEM : g.cy + STEM;
        parts.push(<line key={"st" + uid++} x1={sx} y1={g.cy} x2={sx} y2={y2} stroke={INK} strokeWidth="1.4" />);
        if (g.quarters < 0.5) {                          // sixteenth → double flag
          parts.push(<path key={"fl" + uid++} d={stemUp ? `M ${sx} ${y2} q 8 3 6 12` : `M ${sx} ${y2} q 8 -3 6 -12`} fill="none" stroke={INK} strokeWidth="1.6" />);
          parts.push(<path key={"fl" + uid++} d={stemUp ? `M ${sx} ${y2 + 5} q 8 3 6 12` : `M ${sx} ${y2 - 5} q 8 -3 6 -12`} fill="none" stroke={INK} strokeWidth="1.6" />);
        } else if (g.quarters < 1) {
          parts.push(<path key={"fl" + uid++} d={stemUp ? `M ${sx} ${y2} q 8 3 6 12` : `M ${sx} ${y2} q 8 -3 6 -12`} fill="none" stroke={INK} strokeWidth="1.6" />);
        }
      });
      groups.forEach(grp => {
        const gs = grp.map(k => geo[k]);
        const beamY = stemUp ? Math.min(...gs.map(g => g.cy)) - STEM : Math.max(...gs.map(g => g.cy)) + STEM;
        const sxs = gs.map(g => stemUp ? g.cx + rx - 0.5 : g.cx - rx + 0.5);
        gs.forEach((g, j) => parts.push(<line key={"bs" + uid++} x1={sxs[j]} y1={g.cy} x2={sxs[j]} y2={beamY} stroke={INK} strokeWidth="1.4" />));
        parts.push(<line key={"bm" + uid++} x1={sxs[0]} y1={beamY} x2={sxs[sxs.length - 1]} y2={beamY} stroke={INK} strokeWidth={LG * 0.5} strokeLinecap="butt" />);
        // sixteenth notes get a second beam
        gs.forEach((g, j) => {
          if (g.quarters < 0.5 && j < gs.length) {
            const yy = stemUp ? beamY + 5 : beamY - 5;
            const x2 = j + 1 < sxs.length ? (sxs[j] + sxs[j + 1]) / 2 : sxs[j] + 6;
            parts.push(<line key={"bm2" + uid++} x1={sxs[j]} y1={yy} x2={x2} y2={yy} stroke={INK} strokeWidth={LG * 0.4} strokeLinecap="butt" />);
          }
        });
      });
      // ties
      m.items.forEach((it, k) => {
        if (it.tieStart && geo.length) {
          // approximate: draw a slur between this note's x and the next melodic x
        }
      });
      parts.push(<line key={"bl" + bi} x1={bx1} y1={yTreble(38)} x2={bx1} y2={yTreble(30)} stroke={FAINT} strokeWidth="1" />);
      parts.push(<text key={"bn" + bi} x={bx0 + 4} y={trebleTop - 12} fill="#5A6474" fontSize="10" fontFamily="Archivo">{sy * perSystem + bi + 1}</text>);
    });
    systems.push(<g key={"sys" + sy} transform={`translate(0 ${y0})`}>{parts}</g>);
  }
  return <svg width={sysW} viewBox={`0 0 ${sysW} ${totalH}`} style={{ width: "100%", maxWidth: sysW }}>{systems}</svg>;
}

/* ===== playback (simple synth) ===== */
function playMelody(ctx, qnotes, bpm, U, onDone) {
  const beat = 60 / bpm, unitSec = beat / U;
  const t0 = ctx.currentTime + 0.08;
  let last = t0;
  qnotes.forEach(n => {
    const start = t0 + n.startU * unitSec, dur = n.durU * unitSec;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle"; o.frequency.value = midiToHz(n.midi);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.22, start + 0.012);
    g.gain.setValueAtTime(0.22, start + Math.max(0.02, dur - 0.05));
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(start); o.stop(start + dur + 0.02);
    last = Math.max(last, start + dur);
  });
  if (onDone) setTimeout(onDone, (last - ctx.currentTime + 0.1) * 1000);
  return last;
}

/* ===== the app ===== */
export default function TuneTranscriber() {
  const [phase, setPhase] = useState("idle");            // idle | recording | analysing | done
  const [error, setError] = useState("");
  const [rawNotes, setRawNotes] = useState([]);          // {midi,t0,t1}
  const [bpm, setBpm] = useState(100);
  const [grid, setGrid] = useState(2);                   // U: 2 = eighths, 4 = sixteenths
  const [timeSig] = useState([4, 4]);
  const [key, setKey] = useState({ tonic: 0, mode: "major" });
  const [keyLocked, setKeyLocked] = useState(false);
  const [snap, setSnap] = useState(true);
  const [level, setLevel] = useState(0);                 // live mic level
  const [liveHz, setLiveHz] = useState(null);
  const [ioNote, setIoNote] = useState("");
  const [playing, setPlaying] = useState(false);

  const ctxRef = useRef(null);
  const streamRef = useRef(null);
  const nodeRef = useRef(null);
  const chunksRef = useRef([]);
  const rafRef = useRef(null);
  const analyserRef = useRef(null);

  const ensureCtx = () => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  };

  /* ---- recording ---- */
  const startRec = async () => {
    setError(""); setIoNote("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      streamRef.current = stream;
      const ctx = ensureCtx();
      const src = ctx.createMediaStreamSource(stream);
      const node = ctx.createScriptProcessor(4096, 1, 1);
      const analyser = ctx.createAnalyser(); analyser.fftSize = 2048;
      analyserRef.current = analyser;
      chunksRef.current = [];
      node.onaudioprocess = e => {
        const d = e.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(d));
      };
      src.connect(analyser);
      src.connect(node);
      node.connect(ctx.destination);            // required for onaudioprocess to fire in some browsers
      nodeRef.current = { node, src };
      setPhase("recording");
      const buf = new Float32Array(analyser.fftSize);
      const tick = () => {
        analyser.getFloatTimeDomainData(buf);
        let rms = 0; for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
        setLevel(Math.min(1, Math.sqrt(rms / buf.length) * 6));
        const p = detectPitch(buf, ctx.sampleRate);
        setLiveHz(p ? p.hz : null);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      setError("Microphone unavailable — check permissions, or upload an audio file instead.");
    }
  };

  const stopRec = () => {
    cancelAnimationFrame(rafRef.current);
    if (nodeRef.current) { nodeRef.current.node.disconnect(); nodeRef.current.src.disconnect(); nodeRef.current.node.onaudioprocess = null; }
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setLevel(0); setLiveHz(null);
    const sr = ctxRef.current.sampleRate;
    const total = chunksRef.current.reduce((a, c) => a + c.length, 0);
    const samples = new Float32Array(total);
    let o = 0; for (const c of chunksRef.current) { samples.set(c, o); o += c.length; }
    analyse(samples, sr);
  };

  /* ---- file upload ---- */
  const onFile = async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError(""); setIoNote("");
    try {
      const ctx = ensureCtx();
      const arr = await file.arrayBuffer();
      const audio = await ctx.decodeAudioData(arr);
      analyse(audio.getChannelData(0), audio.sampleRate);
    } catch (err) {
      setError("Could not read that audio file.");
    }
    e.target.value = "";
  };

  /* ---- analysis ---- */
  const analyse = (samples, sampleRate) => {
    setPhase("analysing");
    setTimeout(() => {
      const notes = tracktoNotes(samples, sampleRate);
      if (!notes.length) { setError("No clear pitch found — try humming louder and steadier."); setPhase("idle"); return; }
      // shift so the first note starts at time 0
      const t0 = notes[0].t0;
      const shifted = notes.map(n => ({ ...n, t0: n.t0 - t0, t1: n.t1 - t0 }));
      const tempo = estimateTempo(shifted);
      setBpm(tempo);
      const k = detectKey(quantise(shifted, tempo, grid, 0));
      if (!keyLocked) setKey(k);
      setRawNotes(shifted);
      setPhase("done");
    }, 30);
  };

  /* ---- derived: quantised notes, measures ---- */
  const qnotes = useMemo(() => {
    if (!rawNotes.length) return [];
    let q = quantise(rawNotes, bpm, grid, 0);
    if (snap) {
      const snapped = snapToKey(q.map(n => ({ midi: n.midi, durU: n.durU })), key.tonic, key.mode);
      q = q.map((n, i) => ({ ...n, midi: snapped[i].midi }));
    }
    return q;
  }, [rawNotes, bpm, grid, snap, key]);

  const spelling = useMemo(() => buildSpelling(key.tonic, key.mode), [key]);
  const measures = useMemo(() => qnotes.length ? buildMeasures(qnotes, timeSig, grid) : [], [qnotes, timeSig, grid]);

  /* ---- playback ---- */
  const play = () => {
    if (!qnotes.length) return;
    const ctx = ensureCtx();
    setPlaying(true);
    playMelody(ctx, qnotes, bpm, grid, () => setPlaying(false));
  };

  /* ---- exports ---- */
  const download = (bytes, name, type) => {
    const url = URL.createObjectURL(new Blob([bytes], { type }));
    const a = document.createElement("a"); a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const exportMidi = () => {
    if (!qnotes.length) return;
    download(melodyMidiBytes(qnotes, bpm, grid), "tune.mid", "audio/midi");
    setIoNote("MIDI exported — load it in the Progression Wheel via ↑ MIDI on the melody panel.");
  };
  const sendToWheel = () => {
    if (!qnotes.length) return;
    try {
      const payload = { notes: qnotes.map(n => ({ midi: n.midi, startU: n.startU, durU: n.durU })), U: grid, bpm, key };
      window.localStorage.setItem("pw-transcribed-melody", JSON.stringify(payload));
      setIoNote("Sent to the Progression Wheel — open it and choose “Load hummed melody”.");
    } catch (e) { setIoNote("Couldn’t hand off directly; use Export MIDI instead."); }
  };

  const reset = () => { setRawNotes([]); setPhase("idle"); setError(""); setIoNote(""); setKeyLocked(false); };

  const keyName = SEMI_SHARP[key.tonic] + (key.mode === "minor" ? " minor" : " major");
  const liveNote = liveHz ? SEMI_SHARP[((Math.round(hzToMidi(liveHz)) % 12) + 12) % 12] : "–";

  return (
    <div className="wrap">
      <style>{CSS}</style>
      <header className="top">
        <div>
          <div className="eyebrow">Sing it · sketch it · v1.0</div>
          <h1>The Tune Transcriber</h1>
          <p className="sub">Hum or sing a tune — get it on a stave, then send it to the Progression Wheel.</p>
        </div>
        <a className="navlink" href="index.html">← Progression Wheel</a>
      </header>

      <section className="card">
        {phase === "idle" && (
          <div className="capture">
            <button className="rec" onClick={startRec}>● Record a hum</button>
            <span className="or">or</span>
            <label className="upl">↑ Upload audio
              <input type="file" accept="audio/*" onChange={onFile} hidden />
            </label>
            <p className="hint">Sing “la” or hum steadily. A short, clear phrase works best — one note at a time.</p>
          </div>
        )}

        {phase === "recording" && (
          <div className="reccol">
            <div className="meter"><div className="fill" style={{ width: (level * 100) + "%" }} /></div>
            <div className="livepitch">{liveNote}<span className="livehz">{liveHz ? Math.round(liveHz) + " Hz" : "listening…"}</span></div>
            <button className="stop" onClick={stopRec}>■ Stop &amp; transcribe</button>
          </div>
        )}

        {phase === "analysing" && <div className="busy">Transcribing…</div>}

        {error && <div className="err">{error}</div>}
      </section>

      {phase === "done" && (
        <>
          <section className="card">
            <div className="scorehead">
              <span className="keytag">{keyName} · {bpm} bpm · {qnotes.length} notes</span>
              <div className="scorebtns">
                <button className="btn" disabled={playing} onClick={play}>{playing ? "▶ playing…" : "▶ Play"}</button>
                <button className="btn" onClick={reset}>↺ New tune</button>
              </div>
            </div>
            <div className="stavebox">
              <Stave measures={measures} spelling={spelling} timeSig={timeSig} />
            </div>
          </section>

          <section className="card controls">
            <div className="ctl">
              <label>Tempo <b>{bpm} bpm</b></label>
              <input type="range" min="50" max="200" value={bpm} onChange={e => setBpm(+e.target.value)} />
            </div>
            <div className="ctl">
              <label>Rhythm grid</label>
              <div className="seg">
                <button className={grid === 2 ? "on" : ""} onClick={() => setGrid(2)}>♪ Eighths</button>
                <button className={grid === 4 ? "on" : ""} onClick={() => setGrid(4)}>♬ Sixteenths</button>
              </div>
            </div>
            <div className="ctl">
              <label>Key</label>
              <div className="row">
                <select value={key.tonic} onChange={e => { setKey({ ...key, tonic: +e.target.value }); setKeyLocked(true); }}>
                  {SEMI_SHARP.map((n, i) => <option key={i} value={i}>{n}</option>)}
                </select>
                <select value={key.mode} onChange={e => { setKey({ ...key, mode: e.target.value }); setKeyLocked(true); }}>
                  <option value="major">major</option>
                  <option value="minor">minor</option>
                </select>
              </div>
            </div>
            <div className="ctl">
              <label className="chk"><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)} /> Snap notes to key</label>
              <p className="tiny">Nudges off-key notes to the nearest scale note — cleaner notation, fewer accidentals.</p>
            </div>
          </section>

          <section className="card export">
            <button className="big" onClick={exportMidi}>↓ Export MIDI</button>
            <button className="big alt" onClick={sendToWheel}>➜ Send to Progression Wheel</button>
            {ioNote && <div className="ionote">{ioNote}</div>}
          </section>
        </>
      )}

      <footer className="foot">
        Pitch tracked in-browser (McLeod / NSDF). Nothing leaves your device. · <a href="index.html">Progression Wheel</a>
      </footer>
    </div>
  );
}

const CSS = `
:root{ --bg:#10151D; --card:#171E28; --ink:#EDE7DA; --dim:#8B94A3; --line:#2A3442; --gold:#E5B554; --green:#54B79D; }
*{ box-sizing:border-box; }
.wrap{ max-width:920px; margin:0 auto; padding:18px 16px 60px; color:var(--ink);
  font-family:Archivo,system-ui,sans-serif; }
.top{ display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:16px; }
.eyebrow{ color:var(--dim); font-size:11px; letter-spacing:2px; text-transform:uppercase; }
h1{ font-family:Fraunces,Georgia,serif; font-weight:650; font-size:30px; margin:2px 0 4px; }
.sub{ color:var(--dim); margin:0; font-size:14px; }
.navlink{ color:var(--dim); text-decoration:none; font-size:13px; white-space:nowrap; border:1px solid var(--line);
  padding:7px 11px; border-radius:9px; }
.navlink:hover{ color:var(--ink); border-color:var(--dim); }
.card{ background:var(--card); border:1px solid var(--line); border-radius:14px; padding:18px; margin-bottom:14px; }
.capture{ display:flex; flex-wrap:wrap; align-items:center; gap:14px; }
.rec{ background:#E06A55; color:#fff; border:none; border-radius:11px; padding:14px 22px; font-size:16px;
  font-weight:700; cursor:pointer; }
.rec:hover{ filter:brightness(1.08); }
.or{ color:var(--dim); }
.upl{ border:1px solid var(--line); border-radius:11px; padding:14px 20px; cursor:pointer; font-weight:600; }
.upl:hover{ border-color:var(--dim); }
.hint{ color:var(--dim); font-size:13px; flex-basis:100%; margin:4px 0 0; }
.reccol{ display:flex; flex-direction:column; align-items:center; gap:14px; padding:6px 0; }
.meter{ width:100%; max-width:420px; height:12px; background:#0D1219; border-radius:8px; overflow:hidden; border:1px solid var(--line); }
.fill{ height:100%; background:linear-gradient(90deg,var(--green),var(--gold)); transition:width .06s; }
.livepitch{ font-family:Fraunces,serif; font-size:44px; font-weight:650; line-height:1; }
.livehz{ display:block; font-family:Archivo; font-size:13px; color:var(--dim); font-weight:500; margin-top:4px; }
.stop{ background:var(--ink); color:var(--bg); border:none; border-radius:11px; padding:13px 24px; font-size:15px; font-weight:700; cursor:pointer; }
.busy{ text-align:center; color:var(--dim); padding:14px; }
.err{ color:#E06A55; margin-top:12px; font-size:14px; }
.scorehead{ display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:10px; }
.keytag{ color:var(--dim); font-size:13px; }
.scorebtns{ display:flex; gap:8px; }
.btn{ background:#1E2733; color:var(--ink); border:1px solid var(--line); border-radius:9px; padding:8px 14px; font-weight:600; cursor:pointer; }
.btn:hover{ border-color:var(--dim); }
.btn:disabled{ opacity:.6; cursor:default; }
.stavebox{ overflow-x:auto; background:#131A24; border-radius:10px; padding:10px 8px; }
.controls{ display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:18px; }
.ctl label{ display:block; font-size:13px; color:var(--dim); margin-bottom:7px; }
.ctl b{ color:var(--ink); }
.ctl input[type=range]{ width:100%; accent-color:var(--gold); }
.ctl select{ background:#0D1219; color:var(--ink); border:1px solid var(--line); border-radius:8px; padding:7px 9px; font-size:14px; }
.row{ display:flex; gap:8px; }
.seg{ display:inline-flex; border:1px solid var(--line); border-radius:9px; overflow:hidden; }
.seg button{ background:transparent; color:var(--dim); border:none; padding:8px 12px; cursor:pointer; font-weight:600; }
.seg button.on{ background:var(--gold); color:#171E28; }
.chk{ display:flex; align-items:center; gap:8px; color:var(--ink)!important; }
.tiny{ font-size:12px; color:var(--dim); margin:6px 0 0; }
.export{ display:flex; flex-wrap:wrap; gap:12px; align-items:center; }
.big{ background:var(--green); color:#08201A; border:none; border-radius:11px; padding:14px 22px; font-size:15px; font-weight:700; cursor:pointer; }
.big.alt{ background:var(--gold); color:#2A1E05; }
.big:hover{ filter:brightness(1.07); }
.ionote{ flex-basis:100%; color:var(--green); font-size:13px; }
.foot{ color:#5A6474; font-size:12px; text-align:center; margin-top:18px; }
.foot a{ color:var(--dim); }
@media (max-width:520px){ h1{ font-size:24px; } .livepitch{ font-size:36px; } }
`;
