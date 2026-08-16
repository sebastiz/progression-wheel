import { useState, useMemo, useRef, useEffect } from "react";
import { FUNC_MAJOR, FUNC_MINOR, MAJOR_NUM, MAJOR_SIG, MINOR_NUM, MODES, MODE_IDS, QSUF, SEMI_NAME, chordIvs, chordName, famMin, modeFamily, modeId, posOf, spell } from "./theory.js";
import { CATEGORIES, GENRE_GROUPS, LETTER_WORD, PAR_SONGS, PLANS, PROGRESSIONS, SEC_SONGS, SONG_KEYS, STRUCTURES, STRUCT_FAMILIES, UNIVERSAL, letterFor } from "./progressions.js";
import { BPM_DEFAULT, DRUMS, METERS, METER_BY_ID, drumFitsMeter, meterOf, DRUM_DEFAULT, DRUM_KITS, KIT_DEFAULT, PATTERNS, PATTERN_DEFAULT, PUMPS, PUMP_AMT, PUMP_DEFAULT, accentAt, beatsOf, drumBeatsOf, lcm, sampleAt, stepAt, subOf } from "./patterns.js";
import { audioBufferToWav, peakOf } from "./wav.js";
import { DELAY_TIMES, FAM_LEAD, FILTER_OPEN, GM_CATS, LEAD_VOICES, MOVES, applyMove, clickSound, drumSound, duckAt, gmFam, gmKey, isGM, leadNote, makeDelay, makeNoise, makeReverb, makeSampler, playHit, playLeadSampled, playSampled, programOf, sfPrefetch, voiceChord } from "./audio.js";
import { midiBytes, parseMidiMelody } from "./midi.js";
import { REC_SOURCES, hzToMidiF, recDetectPitch, recToEvents, recTrackNotes } from "./pitch.js";
import { decodeSong, encodeSong, makeSong, songMelos } from "./song.js";
import { ARPS, ARP_BY_ID, ARP_RATES, GATES, GATE_BY_ID, hash01, layerFx, LAYER_DEFAULT_INSTR, LAYER_DEFAULT_OCT, LAYER_DEFAULT_VOL, LAYER_INK, LAYER_NAMES, LAYER_OCT_MAX, LAYER_OCT_MIN, MAX_LAYERS, MELODY_PATTERNS, NARRATIVES, RHYTHMS, ROLE_RHYTHM, VARY_LEVELS, blankBars, layerGain, rescaleBar, rhythmSpots, varyBars } from "./melody.js";
import { makeZip, safeName } from "./zip.js";
import { AUTO_LANES, autoAt, autoDel, autoDraw, autoSet, planAdd, planDel, planDup, planMove, planReps, remapSecs } from "./arrange.js";
// The Progression Wheel — v3 (slim)
const APP_VERSION = "dev";   // replaced with package.json version at build time (scripts/build.mjs)


/* ===== fingering diagrams ===== */
const OPEN_SHAPES = {
  "0maj":[[-1,3,2,0,1,0],[0,3,2,0,1,0]], "0dom":[[-1,3,2,3,1,0],[0,3,2,4,1,0]],
  "2maj":[[-1,-1,0,2,3,2],[0,0,0,1,3,2]], "2min":[[-1,-1,0,2,3,1],[0,0,0,2,3,1]], "2dom":[[-1,-1,0,2,1,2],[0,0,0,2,1,3]],
  "4maj":[[0,2,2,1,0,0],[0,2,3,1,0,0]], "4min":[[0,2,2,0,0,0],[0,2,3,0,0,0]], "4dom":[[0,2,0,1,0,0],[0,2,0,1,0,0]],
  "7maj":[[3,2,0,0,0,3],[2,1,0,0,0,3]], "7dom":[[3,2,0,0,0,1],[3,2,0,0,0,1]],
  "9maj":[[-1,0,2,2,2,0],[0,0,1,2,3,0]], "9min":[[-1,0,2,2,1,0],[0,0,2,3,1,0]], "9dom":[[-1,0,2,0,2,0],[0,0,2,0,3,0]],
  "11dom":[[-1,2,1,2,0,2],[0,2,1,3,0,4]],
  "0maj7":[[-1,3,2,0,0,0],[0,3,2,0,0,0]], "2maj7":[[-1,-1,0,2,2,2],[0,0,0,1,1,1]],
  "4maj7":[[0,2,1,1,0,0],[0,3,1,2,0,0]], "5maj7":[[-1,-1,3,2,1,0],[0,0,3,2,1,0]],
  "7maj7":[[3,2,0,0,0,2],[2,1,0,0,0,3]], "9maj7":[[-1,0,2,1,2,0],[0,0,2,1,3,0]],
  "2m7":[[-1,-1,0,2,1,1],[0,0,0,2,1,1]], "4m7":[[0,2,0,0,0,0],[0,2,0,0,0,0]],
  "9m7":[[-1,0,2,0,1,0],[0,0,2,0,1,0]], "11m7":[[-1,2,0,2,0,2],[0,2,0,3,0,4]],
};
function guitarShape(root, quality) {
  // 9ths keep their explicit "add the 9th (note)" caption
  const q7 = { maj9:"maj7", m9:"m7", dom9:"dom" }[quality];
  if (q7) return { ...guitarShape(root, q7), add9: SEMI_NAME[(root + 2) % 12] };
  // other extensions/alterations render on the nearest playable base shape with a how-to caption,
  // rather than hand-authoring a voicing for every one (fine for a sketchpad; keeps the fretboard real)
  const EXT = { add9:["maj","add the 9th"], madd9:["min","add the 9th"], six:["maj","add the 6th"],
    m6:["min","add the 6th"], sus2:["maj","2nd replaces the 3rd"], sus4:["maj","4th replaces the 3rd"],
    dom7sus4:["dom","4th replaces the 3rd"] }[quality];
  if (EXT) return { ...guitarShape(root, EXT[0]), cap: EXT[1] };
  const open = OPEN_SHAPES[root + quality];
  if (open) return { frets: open[0], fingers: open[1], barre: null };
  const fe = ((root - 4 + 12) % 12) || 12, fa = ((root - 9 + 12) % 12) || 12;
  if (fa <= fe) {
    const f = fa, s = { maj:[[-1,f,f+2,f+2,f+2,f],[0,1,2,3,4,1]], min:[[-1,f,f+2,f+2,f+1,f],[0,1,3,4,2,1]],
      dom:[[-1,f,f+2,f,f+2,f],[0,1,3,1,4,1]], maj7:[[-1,f,f+2,f+1,f+2,f],[0,1,3,2,4,1]],
      m7:[[-1,f,f+2,f,f+1,f],[0,1,3,1,2,1]] }[quality];
    return { frets: s[0], fingers: s[1], barre: { fret: f, from: 1, to: 5 } };
  }
  const f = fe, s = { maj:[[f,f+2,f+2,f+1,f,f],[1,3,4,2,1,1]], min:[[f,f+2,f+2,f,f,f],[1,3,4,1,1,1]],
    dom:[[f,f+2,f,f+1,f,f],[1,3,1,2,1,1]], maj7:[[f,f+2,f+1,f+1,f,f],[1,4,2,3,1,1]],
    m7:[[f,f+2,f,f,f,f],[1,3,1,1,1,1]] }[quality];
  return { frets: s[0], fingers: s[1], barre: { fret: f, from: 0, to: 5 } };
}
function GuitarDiagram({ root, quality }) {
  const sh = guitarShape(root, quality);
  const fretted = sh.frets.filter(f => f > 0);
  const start = Math.max(...fretted, 1) <= 4 ? 1 : Math.min(...fretted);
  const W = 156, H = 168, x0 = 26, y0 = 34, dx = 20, dy = 27;
  const sx = i => x0 + i * dx, fy = f => y0 + (f - start + 0.5) * dy;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {Array.from({ length: 6 }, (_, i) => <line key={i} x1={sx(i)} y1={y0} x2={sx(i)} y2={y0 + 4 * dy} stroke="#5A6474" strokeWidth="1" />)}
      {Array.from({ length: 5 }, (_, i) => <line key={"f"+i} x1={sx(0)} y1={y0 + i * dy} x2={sx(5)} y2={y0 + i * dy}
        stroke={i === 0 && start === 1 ? "#EDE7DA" : "#5A6474"} strokeWidth={i === 0 && start === 1 ? 4 : 1} />)}
      {start > 1 && <text x={sx(5) + 6} y={y0 + 17} fill="#8B94A3" fontSize="11" fontFamily="Archivo">{start}fr</text>}
      {sh.barre && <rect x={sx(sh.barre.from) - 8} y={fy(sh.barre.fret) - 8}
        width={(sh.barre.to - sh.barre.from) * dx + 16} height={16} rx={8} fill="#EAE2CC" opacity="0.92" />}
      {sh.frets.map((f, i) => {
        if (f === -1) return <text key={i} x={sx(i)} y={y0 - 9} textAnchor="middle" fill="#8B94A3" fontSize="11">✕</text>;
        if (f === 0) return <circle key={i} cx={sx(i)} cy={y0 - 13} r={4.5} fill="none" stroke="#8B94A3" strokeWidth="1.4" />;
        return (
          <g key={i}>
            <circle cx={sx(i)} cy={fy(f)} r={8.5} fill="#EAE2CC" />
            {sh.fingers[i] > 0 && <text x={sx(i)} y={fy(f) + 3.5} textAnchor="middle" fill="#171E28" fontSize="10"
              fontWeight="700" fontFamily="Archivo">{sh.fingers[i]}</text>}
          </g>
        );
      })}
      <text x={(sx(0) + sx(5)) / 2} y={H - 6} textAnchor="middle" fill="#8B94A3" fontSize="11" fontFamily="Archivo">
        {sh.add9 ? `guitar · 7th shape — add the 9th (${sh.add9})` : sh.cap ? `guitar · ${sh.cap}` : "guitar"}</text>
    </svg>
  );
}
function PianoDiagram({ root, quality }) {
  const tones = chordIvs(quality).map(iv => { const t = root + iv; return t > 23 ? t - 12 : t; });
  const WW = 19, W = 14 * WW + 2, H = 110;
  const whites = [], blacks = [];
  for (let o = 0; o < 2; o++) {
    [0,2,4,5,7,9,11].forEach((s, wi) => whites.push({ semi: o * 12 + s, x: (o * 7 + wi) * WW + 1 }));
    [1,3,6,8,10].forEach((s, bi) => blacks.push({ semi: o * 12 + s, x: (o * 7 + [0,1,3,4,5][bi]) * WW + WW * 0.65 + 1 }));
  }
  const hl = s => tones.includes(s);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {whites.map((k, i) => <rect key={i} x={k.x} y={0} width={WW - 1} height={66} rx={2}
        fill={hl(k.semi) ? "#54B79D" : "#EDE7DA"} stroke="#10151D" />)}
      {blacks.map((k, i) => <rect key={"b"+i} x={k.x} y={0} width={WW * 0.7} height={40} rx={2}
        fill={hl(k.semi) ? "#54B79D" : "#1A222E"} stroke="#10151D" />)}
      <text x={W/2} y={86} textAnchor="middle" fill="#EDE7DA" fontSize="12" fontWeight="600" fontFamily="Archivo">
        {tones.map(t => SEMI_NAME[t % 12]).join(" – ")}</text>
      <text x={W/2} y={103} textAnchor="middle" fill="#8B94A3" fontSize="11" fontFamily="Archivo">
        piano · RH {chordIvs(quality).length === 5 ? "1 · 2 · 3 · 5 (+9)" : chordIvs(quality).length === 4 ? "1 · 2 · 3 · 5" : "1 · 3 · 5"}</text>
    </svg>
  );
}

// stable identity of a chord in the loop, for the reorder permutation
const chordKeyOf = c => c.inserted ? c.baseName : "b" + c.bi;

/* ===== staff notation ===== */
// pitch-class → [letter index (C=0..B=6), accidental] following SEMI_NAME's flat spelling
const SPELL = [[0,0],[1,-1],[1,0],[2,-1],[2,0],[3,0],[3,1],[4,0],[5,-1],[5,0],[6,-1],[6,0]];
const LETTER = ["C","D","E","F","G","A","B"];
// diatonic staff step of a MIDI note (C4=60 → 28); one step = one line-or-space
const stepOfMidi = m => (Math.floor(m / 12) - 1) * 7 + SPELL[((m % 12) + 12) % 12][0];
const accOfMidi = m => SPELL[((m % 12) + 12) % 12][1];
const noteName = m => LETTER[SPELL[((m % 12) + 12) % 12][0]] + ["𝄫","♭","","♯","𝄪"][accOfMidi(m) + 2];
const GUITAR_OPEN = [64, 59, 55, 50, 45, 40];   // strings 1(high E)..6(low E), MIDI of open
// pick a comfortable string/fret for a note, preferring the first five frets (open position) so the
// line spreads across the strings instead of climbing the high E. `used` = strings already taken by
// another note in the same onset. Falls back to the lowest playable fret if nothing sits in 0..5.
function tabFret(mid, used) {
  let low = null, any = null;
  GUITAR_OPEN.forEach((open, s) => {
    if (used && used.has(s)) return;
    const fret = mid - open;
    if (fret < 0 || fret > 14) return;
    if (!any || fret < any.fret) any = { str: s, fret };
    if (fret <= 5 && (!low || fret < low.fret)) low = { str: s, fret };
  });
  return low || any;
}
// the whole melody sits an octave or two above the guitar's first position, so pick a single
// octave transposition (applied to every note, preserving the tune's shape) that puts the most
// notes within the first five frets. Ties prefer the smallest drop, staying closest to pitch.
function tabOctaveShift(allMids) {
  if (!allMids.length) return 0;
  const inLowFrets = mid => GUITAR_OPEN.some((open, s) => { const f = mid - open; return f >= 0 && f <= 5; });
  let bestShift = 0, bestScore = -1;
  for (const sh of [0, -12, -24]) {
    const score = allMids.filter(md => inLowFrets(md + sh)).length;
    if (score > bestScore) { bestScore = score; bestShift = sh; }
  }
  return bestShift;
}

// One measure worth of notation. `mel` = [{on, dur, mids:[...]}], onset and duration in grid
// columns. `sub` is columns per beat (2 = eighths, 4 = sixteenths), which is what turns a column
// count into an actual note value — one column is an eighth on one grid and a sixteenth on the other.
function NotationScore({ measures, instr, meloBeats, sub = 2, perSystem = 4 }) {
  const INK = "#EDE7DA", FAINT = "#3A4453", SYM = "#EAE2CC";
  const LG = 9;                                   // staff line gap
  const staffH = 4 * LG;
  const clefW = 34, barW = 178, padL = 8, padTop = 26;   // wider bars so notes aren't cramped
  const sysW = clefW + perSystem * barW + padL;
  const piano = instr === "piano";
  // vertical layout within a system
  const trebleTop = padTop;
  const trebleMid = trebleTop + 2 * LG;                       // B4 line, step 34
  const lowerTop = trebleTop + staffH + (piano ? 3 * LG : 4 * LG);
  const bassMid = lowerTop + 2 * LG;                          // D3 line, step 22 (piano)
  const tabGap = 8, tabH = 5 * tabGap;                         // guitar TAB: 6 lines
  const sysH = lowerTop + (piano ? staffH : tabH) + 24;
  const yTreble = step => trebleMid - (step - 34) * (LG / 2);
  const yBass = step => bassMid - (step - 22) * (LG / 2);
  const tabY = str => lowerTop + str * tabGap;                // guitar string line (0=high E)

  const nSys = Math.ceil(measures.length / perSystem) || 1;
  const totalH = nSys * sysH + 10;

  // notehead geometry, shared by the single-note and beamed-group drawers
  let uid = 0;
  const rx = LG * 0.6, ry = LG * 0.5;
  const STEM = 3.3 * LG;                                       // stem length
  const stemUpFor = (steps, clef) => {                         // low notes → stem up
    const midStep = clef === "bass" ? 22 : 34;
    return steps.reduce((a, b) => a + b, 0) / steps.length <= midStep;
  };
  const LAY = LAV;                                             // 2nd-melody (layer B) colour
  // note values, in grid columns: a beat is `sub` columns, so a quarter is `sub`, a half 2·sub,
  // a whole 4·sub. Flags/beams: none at a quarter or longer, one at an eighth, two at a sixteenth.
  const WHOLE = 4 * sub, HALF = 2 * sub;
  const flagsOf = dur => dur >= sub ? 0 : dur >= sub / 2 ? 1 : 2;
  const flagPath = (sx, y2, up, n) => Array.from({ length: n }, (_, k) => {
    const o = (up ? 1 : -1) * k * (LG * 0.62);
    return up ? `M ${sx} ${y2 + o} q 8 3 6 12` : `M ${sx} ${y2 + o} q 8 -3 6 -12`;
  }).join(" ");
  // draw just the noteheads (+ accidentals + ledgers) for one onset; return nodes + geometry.
  // colOf(midi) picks the ink per note (layer B → violet); stemCol colours stems/beams/flags.
  const drawHeads = (mids, x, dur, clef, colOf = () => INK) => {
    const nodes = [];
    const yFn = clef === "bass" ? yBass : yTreble;
    const topLine = clef === "bass" ? 26 : 38, botLine = clef === "bass" ? 18 : 30;
    const open = dur >= HALF;                                  // half/whole = hollow head
    const filled = !open;
    let minY = Infinity, maxY = -Infinity;
    mids.forEach(m => {
      const s = stepOfMidi(m), cy = yFn(s), acc = accOfMidi(m), col = colOf(m);
      minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
      for (let k = topLine + 2; k <= s; k += 2) nodes.push(<line key={"lg"+uid++} x1={x - 9} y1={yFn(k)} x2={x + 9} y2={yFn(k)} stroke={col} strokeWidth="1" />);
      for (let k = botLine - 2; k >= s; k -= 2) nodes.push(<line key={"lg"+uid++} x1={x - 9} y1={yFn(k)} x2={x + 9} y2={yFn(k)} stroke={col} strokeWidth="1" />);
      nodes.push(<ellipse key={"nh"+uid++} cx={x} cy={cy} rx={rx} ry={ry} transform={`rotate(-18 ${x} ${cy})`}
        fill={filled ? col : "none"} stroke={col} strokeWidth={open ? 1.5 : 0} />);
      if (dur >= WHOLE) nodes.push(<ellipse key={"nw"+uid++} cx={x} cy={cy} rx={rx * 0.5} ry={ry * 0.85} fill="#171E28" />);
      if (acc) nodes.push(<text key={"ac"+uid++} x={x - rx - 4} y={cy + 4} textAnchor="end" fill={col} fontSize="14" fontFamily="serif">{acc < 0 ? "♭" : "♯"}</text>);
    });
    return { nodes, minY, maxY, steps: mids.map(stepOfMidi), x };
  };
  // single onset with its own stem + flag (used for lone notes and non-melody stacks)
  const drawNotes = (mids, x, dur, clef, colOf = () => INK, stemCol = INK) => {
    const g = drawHeads(mids, x, dur, clef, colOf);
    const nodes = g.nodes;
    if (dur < WHOLE) {                                        // stem (skip whole notes)
      const up = stemUpFor(g.steps, clef);
      const sx = up ? x + rx - 0.5 : x - rx + 0.5;
      const y1 = up ? g.minY : g.maxY, y2 = up ? g.maxY - STEM : g.minY + STEM;
      nodes.push(<line key={"st"+uid++} x1={sx} y1={y1} x2={sx} y2={y2} stroke={stemCol} strokeWidth="1.4" />);
      const nf = flagsOf(dur);                                // 1 flag = eighth, 2 = sixteenth
      if (nf) nodes.push(<path key={"fl"+uid++} d={flagPath(sx, y2, up, nf)} fill="none" stroke={stemCol} strokeWidth="1.6" />);
    }
    return nodes;
  };
  // a whole bar of melody, beaming consecutive eighth-notes within a beat instead of flagging each
  const drawMelody = (events, inner, span, clef) => {
    const nodes = [];
    if (!events || !events.length) return nodes;
    const xOf = on => inner + (on / meloBeats) * span;
    // per-note ink: each note is drawn in the colour of the melody part it belongs to
    const colOf = ev => m => ev.inkOf ? ev.inkOf(m) : ((ev.bMids && ev.bMids.has(m)) ? LAY : INK);
    // stems, flags and beams take the group's colour when every note agrees, else the lead's
    const evCol = ev => { const cs = new Set(ev.mids.map(colOf(ev))); return cs.size === 1 ? [...cs][0] : INK; };
    const geo = events.map(ev => ({ g: drawHeads(ev.mids, xOf(ev.on), ev.dur, clef, colOf(ev)), ev }));
    geo.forEach(e => nodes.push(...e.g.nodes));
    // beam groups: runs of flagged notes inside a single beat, so beams never cross a beat line
    // (the convention that makes the pulse readable). A quarter or longer breaks the run.
    const byOn = {}; geo.forEach((e, i) => { byOn[e.ev.on] = i; });
    const beamed = new Set();
    const groups = [];
    const flush = run => { if (run.length > 1) { groups.push([...run]); run.forEach(x => beamed.add(x)); } run.length = 0; };
    for (let b = 0; b * sub < meloBeats; b++) {
      const run = [];
      for (let c = b * sub; c < Math.min((b + 1) * sub, meloBeats); c++) {
        const idx = byOn[c];
        if (idx == null) continue;                            // a rest or a held note: no new stem here
        if (flagsOf(geo[idx].ev.dur) > 0) run.push(idx); else flush(run);
      }
      flush(run);
    }
    // lone notes: own stem + flag (violet when the note is 2nd-melody only)
    geo.forEach((e, i) => {
      if (beamed.has(i) || e.ev.dur >= WHOLE) return;
      const up = stemUpFor(e.g.steps, clef), sc = evCol(e.ev);
      const sx = up ? e.g.x + rx - 0.5 : e.g.x - rx + 0.5;
      const y1 = up ? e.g.minY : e.g.maxY, y2 = up ? e.g.maxY - STEM : e.g.minY + STEM;
      nodes.push(<line key={"st"+uid++} x1={sx} y1={y1} x2={sx} y2={y2} stroke={sc} strokeWidth="1.4" />);
      const nf = flagsOf(e.ev.dur);
      if (nf) nodes.push(<path key={"fl"+uid++} d={flagPath(sx, y2, up, nf)} fill="none" stroke={sc} strokeWidth="1.6" />);
    });
    // beams: one shared stem direction per group, stems run to a level beam bar
    groups.forEach(idxs => {
      const gs = idxs.map(i => geo[i].g);
      const sc = idxs.every(i => evCol(geo[i].ev) === LAY) ? LAY : INK;   // all-B group → violet
      const up = stemUpFor(gs.flatMap(g => g.steps), clef);
      const beamY = up ? Math.min(...gs.map(g => g.minY)) - STEM
                       : Math.max(...gs.map(g => g.maxY)) + STEM;
      const sxs = gs.map(g => up ? g.x + rx - 0.5 : g.x - rx + 0.5);
      gs.forEach((g, j) => {
        const yNote = up ? g.maxY : g.minY;                   // stem meets the far notehead
        nodes.push(<line key={"bs"+uid++} x1={sxs[j]} y1={yNote} x2={sxs[j]} y2={beamY} stroke={sc} strokeWidth="1.4" />);
      });
      // primary beam spans the group; each extra level (sixteenths and finer) is drawn only over
      // the notes that actually need it, stubbing out when a single note carries it alone
      const fl = idxs.map(i => flagsOf(geo[i].ev.dur));
      const bar = (x1, x2, y) => nodes.push(<line key={"bm"+uid++} x1={x1} y1={y} x2={x2} y2={y}
        stroke={sc} strokeWidth={LG * 0.5} strokeLinecap="butt" />);
      bar(sxs[0], sxs[sxs.length - 1], beamY);
      for (let lvl = 1; lvl < Math.max(...fl); lvl++) {
        const y = beamY + (up ? 1 : -1) * lvl * (LG * 0.62);
        let s = -1;
        for (let j = 0; j <= fl.length; j++) {
          const on = j < fl.length && fl[j] > lvl;
          if (on && s < 0) s = j;
          else if (!on && s >= 0) {
            if (j - s > 1) bar(sxs[s], sxs[j - 1], y);
            else bar(sxs[s], sxs[s] + (s > 0 ? -1 : 1) * Math.min(10, Math.abs(sxs[1] - sxs[0]) / 2), y);
            s = -1;
          }
        }
      }
    });
    return nodes;
  };

  // one octave transposition for the whole tab, so the melody drops into first position
  const tabShift = piano ? 0 : tabOctaveShift(measures.flatMap(mm => (mm.mel || []).flatMap(ev => ev.mids)));

  const systems = [];
  for (let sy = 0; sy < nSys; sy++) {
    const y0 = sy * sysH;
    const bars = measures.slice(sy * perSystem, sy * perSystem + perSystem);
    const parts = [];
    const staffLines = (yFn, lineSteps) => lineSteps.map(s =>
      <line key={"sl"+s} x1={padL} y1={yFn(s)} x2={sysW} y2={yFn(s)} stroke={FAINT} strokeWidth="1" />);
    // staff lines
    parts.push(...staffLines(yTreble, [30, 32, 34, 36, 38]));
    if (piano) parts.push(...staffLines(yBass, [18, 20, 22, 24, 26]));
    else for (let i = 0; i < 6; i++) parts.push(<line key={"tl"+i} x1={padL} y1={tabY(i)} x2={sysW} y2={tabY(i)} stroke={FAINT} strokeWidth="1" />);
    // clefs
    parts.push(<text key="tc" x={padL + 4} y={yTreble(31)} fill={INK} fontSize="40" fontFamily="serif">𝄞</text>);
    if (piano) parts.push(<text key="bc" x={padL + 4} y={yBass(24)} fill={INK} fontSize="34" fontFamily="serif">𝄢</text>);
    else parts.push(<text key="tab" x={padL + 6} y={lowerTop + tabH * 0.62} fill={INK} fontSize={tabH * 0.5} fontWeight="700" fontFamily="Archivo" style={{ letterSpacing: "-2px" }}>TAB</text>);
    // time signature on the first system
    if (sy === 0) {
      // beats per bar over the beat unit — a sixteenth grid is still 4/4, just finer
      const even = meloBeats % sub === 0;
      const num = even ? meloBeats / sub : meloBeats, den = even ? 4 : 8;
      parts.push(<text key="tsn" x={clefW + 2} y={yTreble(36)} textAnchor="middle" fill={INK} fontSize="15" fontWeight="700" fontFamily="serif">{num}</text>);
      parts.push(<text key="tsd" x={clefW + 2} y={yTreble(31)} textAnchor="middle" fill={INK} fontSize="15" fontWeight="700" fontFamily="serif">{den}</text>);
    }
    // barlines + measures
    const topY = yTreble(38), botY = piano ? yBass(18) : tabY(5);
    // the opening barline — keyed apart from the per-bar ones, whose keys start at bl0
    parts.push(<line key="blopen" x1={clefW} y1={topY} x2={clefW} y2={botY} stroke={FAINT} strokeWidth="1" />);
    bars.forEach((m, bi) => {
      const mx0 = clefW + bi * barW;
      const mx1 = mx0 + barW;
      const inner = mx0 + 24;                                   // where notes start
      const span = barW - 40;
      const bl = <line key={"bl"+bi} x1={mx1} y1={topY} x2={mx1} y2={botY} stroke={FAINT} strokeWidth="1" />;
      // chord symbol
      parts.push(<text key={"cs"+bi} x={mx0 + 6} y={trebleTop - 8} fill={SYM} fontSize="14" fontWeight="700" fontFamily="Archivo">{m.name}{m.word ? <tspan fill="#8B94A3" fontSize="10" fontWeight="600"> {m.word}</tspan> : null}</text>);
      // melody / chord notes
      const hasMel = m.mel && m.mel.length;
      if (piano) {
        // LH: chord voicing as a whole note stack on the bass staff
        const lh = [36 + m.chord.root, ...chordIvs(m.chord.quality).slice(1, 3).map(iv => 48 + m.chord.root + iv)];
        parts.push(...drawNotes(lh.filter(n => n <= 59), inner, 8, "bass"));
        if (hasMel) parts.push(...drawMelody(m.mel, inner, span, "treble"));
        else parts.push(...drawNotes(chordIvs(m.chord.quality).map(iv => 60 + m.chord.root + iv).filter(n => n <= 84), inner, 8, "treble"));
      } else {
        const tab = (t, x, col) => parts.push(
          <g key={"tf"+uid++}>
            <rect x={x - 6} y={tabY(t.str) - 6} width={12} height={12} fill="#171E28" />
            <text x={x} y={tabY(t.str) + 4} textAnchor="middle" fill={col} fontSize="11" fontWeight="700" fontFamily="Archivo">{t.fret}</text>
          </g>);
        if (hasMel) { parts.push(...drawMelody(m.mel, inner, span, "treble")); m.mel.forEach(ev => {
          const x = inner + (ev.on / meloBeats) * span;
          const usedStr = new Set();                              // one fret per string within an onset
          ev.mids.forEach(mid => {
            const pick = tabFret(mid + tabShift, usedStr);
            if (pick) { usedStr.add(pick.str); tab(pick, x, (ev.bMids && ev.bMids.has(mid)) ? LAV : GOLD); }
          });
        }); }
        else {
          // no melody — show the chord voicing as a whole-note stack on the staff
          // (tab is reserved for the single-line melody; use the fingering card for chord shapes)
          const voic = chordIvs(m.chord.quality).map(iv => 60 + m.chord.root + iv).filter(n => n <= 79);
          parts.push(...drawNotes(voic, inner, 8, "treble"));
        }
      }
      parts.push(bl);
    });
    systems.push(<g key={"sys"+sy} transform={`translate(0 ${y0})`}>{parts}</g>);
  }
  return (
    <svg width={sysW} viewBox={`0 0 ${sysW} ${totalH}`} style={{ width: "100%", maxWidth: sysW }}>
      {systems}
    </svg>
  );
}

/* ===== wheel geometry + palette ===== */
const CX = 320, CY = 320, R_MAJ = 240, R_MIN = 163;
const slotXY = (pos, r) => { const a = ((pos * 30 - 90) * Math.PI) / 180; return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }; };
const nodeXY = (root, q) => famMin(q) ? slotXY(posOf((root + 3) % 12), R_MIN) : slotXY(posOf(root), R_MAJ);
const curve = (p1, p2, pull) => {
  const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
  return `M ${p1.x} ${p1.y} Q ${mx + (CX - mx) * pull} ${my + (CY - my) * pull} ${p2.x} ${p2.y}`;
};
const FN_COLOR = { T:"#EAE2CC", S:"#54B79D", D:"#E06A55" };
const FN_TEXT = { T:"#171E28", S:"#0D1A16", D:"#2A0F0B" };
const GOLD = "#E5B554", LAV = "#A493EE", PATH = "#F2EDE0";
const POS_MAJ = [0,7,2,9,4,11,6,1,8,3,10,5];

// section-type accent colours for the song write-out grouping
/* One colour per section letter. Chosen by function rather than prettiness, so the arrangement
   strip reads as a shape: statements green, hooks gold, lifts blue/pink, the drop hot, the quiet
   parts cold, and the topping-and-tailing sections grey. Every letter `letterFor` can return needs
   an entry — a section that falls through to grey is invisible in a strip full of grey. */
const SEC_COL = {
  V:"#54B79D", A:"#4FA894", G:"#79A85F", H:"#B3894A",   // statements: verse, A section, groove, head
  C:"#E0B85A", R:"#E6C98A",                              // hooks: chorus, refrain
  P:"#7FB4D8", U:"#D98BC0",                              // lifts: pre-chorus, build
  D:"#E8794F",                                           // the drop
  K:"#4E7FA0",                                           // break / breakdown — the cold one
  B:"#B7A6E0", S:"#C77DD9",                              // departures: bridge, solo
  I:"#8B94A3", O:"#8B94A3", L:"#8B94A3", T:"#9A8F7E",    // intro, outro, loop, tag
};

/* ===== discovery tools ===== */
// borrowed + mediant menus: [tag, semitone offset, quality, where] — where: 0 = before the tonic's
// return (end-of-loop colour), 1 = right after the tonic (the mediant jump)
const BORROWED = {
  major: [["iv",5,"min",0],["bVI",8,"maj",0],["bVII",10,"maj",0],["bIII",3,"maj",0],["bII",1,"maj",0],
    ["v (modal)",7,"min",0],["II (lydian)",2,"maj",0]],
  minor: [["bII",1,"maj",0],["IV (dorian)",5,"maj",0],["VI (dorian)",9,"maj",0],["V (harmonic)",7,"maj",0]],
};
const MEDIANTS = { major: [["III",4,"maj",1],["VI",9,"maj",1],["bVI",8,"maj",1],["bIII",3,"maj",1]],
  minor: [["V of bIII",10,"maj",1],["III",4,"maj",1],["VI",9,"maj",1]] };


/* ===== app ===== */
export default function ProgressionWheel() {
  const [tonic, setTonic] = useState(0);
  const [genre, setGenre] = useState("Pop");
  const [emotion, setEmotion] = useState(null);
  const [mode, setMode] = useState(null);   // null = follow the loaded progression's own mode; else an override
  /* The page used to be one five-screen scroll that mixed choosing a key with drawing automation.
     Four modes instead, each about a screen: what the song is, what it sounds like, how it is laid
     out, and keeping it. The transport and the global actions stay outside them. */
  const TABS = [["write", "Write"], ["sound", "Sound"], ["arrange", "Arrange"], ["save", "Save"]];
  const [tab, setTab] = useState("write");
  const [wheelOpen, setWheelOpen] = useState(true);
  const [tips, setTips] = useState(false);  // show the longer explanatory guidance (off = neat)
  const [adv, setAdv] = useState(false);    // reveal the advanced harmony controls (secondary doms, etc.)
  const [showPar, setShowPar] = useState(false);
  const [showSec, setShowSec] = useState(false);
  const [selStruct, setSelStruct] = useState("");
  const [selSong, setSelSong] = useState("");
  const [sel, setSel] = useState(null);                       // baseName of chord being swapped
  const [edits, setEdits] = useState({ key:"", map:{} });     // chord root/quality swaps
  const [inserts, setInserts] = useState({ key:"", list:[] }); // inserted / duplicated chords
  const [quals, setQuals] = useState({ key:"", map:{} });     // per-chord quality override (beats the global colour)
  const [removed, setRemoved] = useState({ key:"", list:[] }); // chord keys removed from the progression
  const [fingerIdx, setFingerIdx] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [curStep, setCurStep] = useState(-1);
  const [curBar, setCurBar] = useState(-1);
  const [curLabel, setCurLabel] = useState(null);
  const [bpmSt, setBpmSt] = useState({ key:"", val:0 });
  const [nChordsSt, setNChordsSt] = useState({ key:"", val:0 });   // chords in the loop (0 = the progression's own length)
  const [instr, setInstr] = useState("acoustic_guitar_steel");   // chord instrument (GM key)
  const [melInstr, setMelInstr] = useState("flute");        // melody lead voice — a real sampled instrument by default (synth id or GM key)
  const [legato, setLegato] = useState(true);               // merge/flow melody notes
  const [clickOn, setClickOn] = useState(false);            // metronome click on each hit (off by default)
  const [patSel, setPatSel] = useState({ key:"", id:"" });
  // drum pattern, kit and pump are keyed by progression like the tempo and strum pattern, so the
  // dance progressions arrive already grooving while everything else keeps its acoustic default
  const [drumSt, setDrumSt] = useState({ key:"", val:"" });
  const [kitSt, setKitSt] = useState({ key:"", val:"" });
  const [pumpSt, setPumpSt] = useState({ key:"", val:"" });
  const [secDrum, setSecDrum] = useState({});               // per-section-type drum override, keyed by base letter ("" = follow global)
  // per-section-type chord mute, keyed by base letter. Dropping the chords for a breakdown while
  // the drums carry on is a basic arrangement move that had no way to be expressed before.
  const [secQuiet, setSecQuiet] = useState({});
  const [custom, setCustom] = useState({ key:"", plan:null });   // edited copy of a structure's plan
  const [auto, setAuto] = useState({ key:"", filter:null, level:null });  // drawn automation lanes
  const [editArr, setEditArr] = useState(false);                 // arrangement-editing mode on the strip
  const [selRow, setSelRow] = useState(0);                       // plan row the editor is pointed at
  const drawRef = useRef(null);                                  // in-progress automation drag
  const [secMove, setSecMove] = useState({});
  const [delaySt, setDelaySt] = useState({ key:"", val:"" });   // delay time, keyed by progression
  const [swingSt, setSwingSt] = useState({ key:"", val:0 });    // swing amount 0..0.6, keyed by progression
  const [humanise, setHumanise] = useState(0);                  // timing + velocity looseness, 0..1
  // Undo/redo over the whole song document. Snapshots are cheap (the same shape the sketch and the
  // link use) and taken after the fact, so a tool you experiment in can always be walked back.
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const restoringRef = useRef(false);               // per-section-type arrangement move, keyed by base letter
  const [colour, setColour] = useState("triads");           // triads | sevenths
  const [force, setForce] = useState(null);                 // dice override of the progression
  const [sketches, setSketches] = useState(null);           // null = not loaded yet
  const [sketchName, setSketchName] = useState("");
  const [ioNote, setIoNote] = useState(null);               // save/export feedback
  const [contrast, setContrast] = useState({ id:"", sec:"C" }); // second loop for a section
  const [melos, setMelos] = useState({ progId:"", secs:{} }); // per-section melodies, chord-anchored
  const [openSecs, setOpenSecs] = useState({});             // which section melody grids are open
  const [melTab, setMelTab] = useState({});                 // per-section: "write" | "suggest"
  const [sugSel, setSugSel] = useState({});
  const [rhySel, setRhySel] = useState({});                 // per-section melody rhythm cell                 // per-section: { pat, start } suggested-melody picks
  const [narSel, setNarSel] = useState({ key:"", id:"" });  // melodic narrative written across the whole song
  const [narUndo, setNarUndo] = useState(null);             // melody snapshot from before the last narrative write
  const [varySt, setVarySt] = useState({ key:"", val:1 });  // how much a narrative varies each repeat of a section
  const [showLand, setShowLand] = useState(false);          // landing-notes collapse
  const [curQ, setCurQ] = useState(null);                   // {sym, col} playhead in melody grids
  const [curInst, setCurInst] = useState(null);             // instance key currently playing
  const [curSongBar, setCurSongBar] = useState(-1);         // absolute bar in the song, for the timeline playhead
  const [order, setOrder] = useState({ key:"", list:null }); // reordered chord sequence (keys)
  const [reorder, setReorder] = useState(false);            // pill reorder mode on/off
  const [pillSel, setPillSel] = useState([]);               // selected pill indices (reorder mode)
  const [adding, setAdding] = useState(false);              // "add any chord from the wheel" mode
  const [removing, setRemoving] = useState(false);          // "tap a chord to remove it" mode
  const [addMel, setAddMel] = useState(false);              // reveal the melody-adding tools (collapsed by default)
  const [scoreInstr, setScoreInstr] = useState("piano");    // notation: piano | guitar
  const [showScore, setShowScore] = useState(false);        // notation panel collapse
  const [realSounds, setRealSounds] = useState(true);       // use real instrument samples when available
  const [melMove, setMelMove] = useState(false);            // melody grid: draw vs move mode
  const [melLayer, setMelLayer] = useState(0);              // which melody layer edits target: 0 = A, 1 = B
  const [melSel, setMelSel] = useState({ key:"", layer:0, notes:{} }); // selected melody notes ("c:deg" → true)
  const [melBox, setMelBox] = useState(null);               // live marquee box while selecting
  const [melGhost, setMelGhost] = useState(null);           // live {key,dc,dd} while dragging a group
  const [impSec, setImpSec] = useState("");                 // target section key for Hum / MIDI import ("" = first)
  const [recSource, setRecSource] = useState("guitar");     // in-app recorder input: guitar | voice
  const [recSec, setRecSec] = useState(null);               // section key currently being recorded into (or null)
  const [recLevel, setRecLevel] = useState(0);              // live mic level while recording
  const [recHz, setRecHz] = useState(null);                 // live detected pitch while recording
  const [loopSec, setLoopSec] = useState(null);             // section key to loop during playback (or null)
  const recRef = useRef(null);                              // { ctx, stream, node, src, analyser, chunks, raf }
  const loopRef = useRef(null);                             // { from, len } bar window the scheduler confines to
  const melDragRef = useRef(null);
  const metroRef = useRef(null);
  const bpmRef = useRef(0), patRef = useRef([]), swingRef = useRef(0);
  const humRef = useRef(0), barBeatsRef = useRef(4);
  const chordsRef = useRef({ list:[], seq:[] }), instrRef = useRef("guitar"), drumRef = useRef(null);
  const secDrumRef = useRef({}), secQuietRef = useRef({}), autoRef = useRef({});
  const kitRef = useRef("acoustic"), pumpRef = useRef(0), tickRef = useRef(8);
  const subRef = useRef(2), melRef = useRef(8);
  const moveRef = useRef({ moves:{}, instBars:{} });
  const delayRef = useRef("off");
  const realRef = useRef(true);
  const clickRef = useRef(false);
  const meloRef = useRef(null);

  // Emotion leads the ranking so changing it always changes the chords
  const progList = useMemo(() => {
    const g = CATEGORIES[0].items.find(i => i.name === genre)?.progs || [];
    const e = CATEGORIES[1].items.find(i => i.name === emotion)?.progs || [];
    if (g.length && e.length) {
      const both = e.filter(p => g.includes(p));
      return [...both, ...new Set([...e, ...g].filter(p => !both.includes(p)))];
    }
    const one = g.length ? g : e;
    return one.length ? one : ["axis"];
  }, [genre, emotion]);

  const progId = force && PROGRESSIONS[force] ? force : progList[0];
  const prog = PROGRESSIONS[progId];
  const numDefs = modeFamily(prog.mode) === "minor" ? MINOR_NUM : MAJOR_NUM;
  const fnMap = modeFamily(prog.mode) === "minor" ? FUNC_MINOR : FUNC_MAJOR;
  // the scale/tonal context — follows the progression's own mode unless the Mode selector overrides it
  const effMode = mode || modeId(prog.mode);
  // catalogue loops whose own mode is the chosen one — offered when the wheel's loop doesn't match the mode
  const modeMatchProgs = Object.keys(PROGRESSIONS).filter(id => modeId(PROGRESSIONS[id].mode) === effMode);
  const loadedMatchesMode = modeId(prog.mode) === effMode;
  const editKey = progId + ":" + tonic;
  const ovMap = edits.key === editKey ? edits.map : {};
  const insList = inserts.key === editKey ? inserts.list : [];
  const qmap = quals.key === editKey ? quals.map : {};
  const remList = removed.key === editKey ? removed.list : [];

  // colour transform: sevenths mode re-voices every chord by rule
  const seventh = (q0, numeral) => {
    if (colour === "triads") return q0;
    let q = q0;
    if (q === "min" || q === "m7") q = "m7";
    else if (q !== "dom") q = (numeral === "V" || numeral === "bVII") ? "dom" : "maj7";
    if (colour === "extended") q = { maj7:"maj9", m7:"m9", dom:"dom9" }[q] || q;
    return q;
  };

  /* How many chords the loop has. A progression arrives with its own natural length; this shortens
     it by taking the first N, or lengthens it with diatonic degrees the progression has not used
     yet — so a four-chord axis grown to six gains a ii and a iii rather than just repeating. It
     sits in front of the whole pipeline, so per-chord edits, inserts and removals still layer on
     top of the result. */
  const CHORD_POOL_MAJOR = ["I", "IV", "V", "vi", "ii", "iii", "bVII"];
  const CHORD_POOL_MINOR = ["i", "iv", "v", "VI", "bVII", "bIII", "ii"];
  const CHORDS_MIN = 2, CHORDS_MAX = 8;
  const natLen = prog.numerals.length;
  const nChords = (nChordsSt.key === progId && nChordsSt.val) ? nChordsSt.val : natLen;
  const numeralsNow = useMemo(() => {
    const base = prog.numerals;
    if (nChords === base.length) return base;
    if (nChords < base.length) return base.slice(0, Math.max(1, nChords));
    const pool = (modeFamily(prog.mode) === "minor" ? CHORD_POOL_MINOR : CHORD_POOL_MAJOR)
      .filter(n => !base.includes(n) && numDefs[n]);
    const out = [...base];
    while (out.length < nChords)
      out.push(pool.length ? pool[(out.length - base.length) % pool.length] : base[out.length % base.length]);
    return out;
  }, [prog, nChords, numDefs]);

  const chords = useMemo(() => {
    const base = numeralsNow.map((n, bi) => {
      const [off, q0] = numDefs[n];
      const root = (tonic + off) % 12, baseName = chordName(root, q0);
      const ov = ovMap[baseName], qov = qmap[baseName];   // per-chord version override beats the colour rule
      if (!ov) {
        const defQ = seventh(q0, n);            // quality with no per-chord override (the colour-rule default)
        const q = qov || defQ;
        return { numeral: n, root, quality: q, name: chordName(root, q), baseName, bi, func: fnMap[n] || "T", fam: q0, defQ };
      }
      const offv = (ov.root - tonic + 12) % 12;
      const rn = Object.entries(numDefs).find(([, v]) => v[0] === offv && v[1] === ov.quality);
      const defQ = seventh(ov.quality, rn ? rn[0] : null);
      const q = qov || defQ;
      return { numeral: rn ? rn[0] : "•", root: ov.root, quality: q,
        name: chordName(ov.root, q), baseName, bi,
        func: rn ? (fnMap[rn[0]] || "T") : (ov.quality === "dom" ? "D" : "T"), fam: ov.quality, defQ };
    });
    const out = [];
    const emitInsert = (x, i) => {
      const bn = "+" + x.tag + ":" + i, qov = qmap[bn];
      const offv = (x.root - tonic + 12) % 12;
      const rn = Object.entries(numDefs).find(([, v]) => v[0] === offv && v[1] === x.quality);
      const defQ = seventh(x.quality, rn ? rn[0] : null);
      const q = qov || defQ;
      out.push({ numeral: x.tag, root: x.root, quality: q, name: chordName(x.root, q),
        baseName: bn, inserted: true, insBefore: i, insRoot: x.root,
        func: x.quality === "dom" ? "D" : (rn ? (fnMap[rn[0]] || "S") : "S"), fam: x.quality, defQ });
    };
    base.forEach((c, i) => {
      insList.filter(x => x.before === i).forEach(x => emitInsert(x, i));
      out.push(c);
    });
    // trailing inserts (a chord duplicated/added after the last one) append at the end, ordered by
    // `before` — each added chord gets a distinct `before` so its identity (baseName) stays unique
    insList.filter(x => x.before >= base.length).sort((a, b) => a.before - b.before)
      .forEach(x => emitInsert(x, x.before));
    // removed chords drop out (but never leave the progression empty)
    let kept = out.filter(c => !remList.includes(chordKeyOf(c)));
    if (!kept.length) kept = out;
    // user reordering: apply a saved permutation when its key set still matches
    const ord = order.key === editKey ? order.list : null;
    if (ord && ord.length === kept.length) {
      const byKey = new Map(kept.map(c => [chordKeyOf(c), c]));
      if (ord.every(k => byKey.has(k)) && new Set(ord).size === ord.length)
        return ord.map(k => byKey.get(k));
    }
    return kept;
  }, [progId, tonic, edits, inserts, quals, removed, colour, order, numeralsNow]);

  const baseNames = useMemo(() => prog.numerals.map(n => {
    const [off, q] = numDefs[n];
    return chordName((tonic + off) % 12, q);
  }), [progId, tonic]);

  const doSwap = (root, quality) => {
    if (!sel) return;
    const next = { ...ovMap };
    if (chordName(root, quality) === sel) delete next[sel]; else next[sel] = { root, quality };
    setEdits({ key: editKey, map: next }); setSel(null);
  };
  const applyParallel = p => {
    const next = { ...ovMap };
    if (chordName(p.root, p.quality) === p.of.baseName) delete next[p.of.baseName];
    else next[p.of.baseName] = { root: p.root, quality: p.quality };
    setEdits({ key: editKey, map: next }); setSel(null);
  };
  const applyInsert = (before, root, quality, tag) => {
    const match = x => x.before === before && x.root === root && x.quality === quality;
    const list = insList.some(match) ? insList.filter(x => !match(x))
      : [...insList, { before, root, quality, tag }];
    setInserts({ key: editKey, list }); setSel(null);
  };
  const applySecondary = s => {
    const before = baseNames.indexOf(s.target.baseName);
    if (before >= 0) applyInsert(before, s.root, "dom", "V/" + String(s.target.numeral).replace(/7$/, ""));
  };
  const resetEdits = () => { setEdits({ key:"", map:{} }); setInserts({ key:"", list:[] }); setSel(null);
    setQuals({ key:"", map:{} }); setRemoved({ key:"", list:[] });
    setOrder({ key:"", list:null }); setPillSel([]); };

  /* ---- per-chord version (7th / add9 / sus / …), remove and duplicate ---- */
  // the modifications offered for a chord, keyed off its stable base family (major / minor / dominant)
  // so the list never shifts under the user when they pick a version — see the Version dropdown below
  const versionsFor = c => {
    const q = c.fam || c.quality;
    if (q === "dom")
      return [["7 (dominant)","dom"],["9","dom9"],["7sus4","dom7sus4"],["sus4","sus4"],["sus2","sus2"]];
    if (famMin(q))
      return [["min (triad)","min"],["m6","m6"],["m7","m7"],["m(add9)","madd9"],["m9","m9"],["sus2","sus2"],["sus4","sus4"]];
    return [["maj (triad)","maj"],["6","six"],["maj7","maj7"],["7","dom"],["add9","add9"],["maj9","maj9"],["sus2","sus2"],["sus4","sus4"]];
  };
  // set an explicit per-chord version (beats the global colour rule); clearing returns to the colour default
  const setChordQuality = (c, quality) =>
    setQuals({ key: editKey, map: { ...qmap, [c.baseName]: quality } });
  const clearChordQuality = c => {
    const next = { ...qmap }; delete next[c.baseName];
    setQuals({ key: editKey, map: next });
  };
  const removeChord = c => {
    const key = chordKeyOf(c);
    if (chords.length <= 1) return;                               // keep at least one chord
    if (c.inserted) {   // an inserted/duplicated chord: drop it from the insert list outright
      setInserts({ key: editKey, list: insList.filter(x => !(x.before === c.insBefore && x.root === c.insRoot && x.tag === c.numeral)) });
    } else {
      setRemoved({ key: editKey, list: remList.includes(key) ? remList : [...remList, key] });
    }
    setFingerIdx(null);
  };
  // the next unused trailing slot, so each appended chord keeps a unique identity (for reorder / remove)
  const nextTrailBefore = () => {
    const nBase = prog.numerals.length;
    return insList.reduce((m, x) => x.before >= nBase ? Math.max(m, x.before + 1) : m, nBase);
  };
  const numeralFor = (root, quality) => {   // roman numeral for the pill, or "•" if it's chromatic here
    const offv = ((root - tonic) % 12 + 12) % 12;
    const rn = Object.entries(numDefs).find(([, v]) => v[0] === offv && v[1] === quality);
    return rn ? rn[0] : "•";
  };
  const addChord = (root, quality) => {   // append any wheel chord to the end of the chain
    setInserts({ key: editKey, list: [...insList, { before: nextTrailBefore(), root, quality, tag: numeralFor(root, quality) }] });
    setSel(null);
  };
  const duplicateChord = c => {   // add a copy right after — makes the progression longer
    let before = c.inserted ? c.insBefore : c.bi + 1;
    if (before >= prog.numerals.length) before = nextTrailBefore();   // trailing copy: keep it unique
    setInserts({ key: editKey, list: [...insList, { before, root: c.root, quality: c.quality, tag: c.inserted ? c.numeral : c.name }] });
    setFingerIdx(null);
  };

  /* ---- pill reorder: select several chords and move them as a group ---- */
  const togglePillSel = i => setPillSel(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i].sort((a, b) => a - b));
  const movePills = dir => {
    if (!pillSel.length) return;
    const sel = new Set(pillSel), minSel = Math.min(...pillSel);
    const moving = chords.filter((_, i) => sel.has(i));
    const rest = chords.filter((_, i) => !sel.has(i));
    const nBefore = chords.filter((_, i) => !sel.has(i) && i < minSel).length;
    const insertAt = dir < 0 ? Math.max(0, nBefore - 1) : Math.min(rest.length, nBefore + 1);
    const next = [...rest.slice(0, insertAt), ...moving, ...rest.slice(insertAt)];
    setOrder({ key: editKey, list: next.map(chordKeyOf) });
    setPillSel(moving.map((_, k) => insertAt + k));
  };
  const straightenPills = () => { setOrder({ key:"", list:null }); setPillSel([]); };
  const removeSelected = () => {   // delete the selected chords in one go (reorder mode)
    if (!pillSel.length) return;
    const sel = new Set(pillSel);
    const toRemove = chords.filter((_, i) => sel.has(i));
    if (toRemove.length >= chords.length) return;                 // never remove every chord
    const remIns = toRemove.filter(c => c.inserted);
    const remBase = toRemove.filter(c => !c.inserted);
    if (remIns.length) setInserts({ key: editKey, list: insList.filter(x =>
      !remIns.some(c => x.before === c.insBefore && x.root === c.insRoot && x.tag === c.numeral)) });
    const keys = remBase.map(chordKeyOf).filter(k => !remList.includes(k));
    if (keys.length) setRemoved({ key: editKey, list: [...remList, ...keys] });
    setPillSel([]);
  };
  const toggleReorder = () => { setReorder(v => !v); setAdding(false); setRemoving(false); setPillSel([]); setFingerIdx(null); };
  const toggleAdding = () => { setAdding(v => !v); setReorder(false); setRemoving(false); setPillSel([]); setSel(null); setFingerIdx(null); };
  const toggleRemoving = () => { setRemoving(v => !v); setAdding(false); setReorder(false); setPillSel([]); setSel(null); setFingerIdx(null); };

  const uniques = useMemo(() => {
    const seen = {};
    chords.forEach((c, i) => {
      if (!seen[c.name]) seen[c.name] = { ...c, steps: [] };
      seen[c.name].steps.push(i + 1);
    });
    return Object.values(seen);
  }, [chords]);

  const parallels = useMemo(() => uniques
    .filter(c => c.quality !== "dom" && !c.inserted)
    .map(c => {
      const q3 = famMin(c.quality) ? "maj" : "min";                       // stored as triad
      const qd = colour === "sevenths" ? (q3 === "maj" ? "maj7" : "m7")
        : colour === "extended" ? (q3 === "maj" ? "maj9" : "m9") : q3; // shown in colour
      return { of: c, root: c.root, quality: q3, name: chordName(c.root, qd) };
    })
    .filter(p => !uniques.some(u => u.name === p.name)), [uniques, colour]);

  const secondaries = useMemo(() => {
    const out = [];
    uniques.forEach(t => {
      if (t.baseName === baseNames[0] || t.inserted) return;
      const root = (t.root + 7) % 12, name = SEMI_NAME[root] + "7";
      if (!out.some(s => s.name === name && s.target.name === t.name))
        out.push({ root, name, target: t, onExisting: uniques.find(u => u.root === root && u.quality !== "min") });
    });
    return out;
  }, [uniques, tonic]);

  const appliedMoves = useMemo(() => {
    const moves = [];
    insList.forEach(x => {
      const isSec = x.tag.startsWith("V/");
      const info = isSec ? (SEC_SONGS[x.tag] || SEC_SONGS.default)
        : { why: "Borrowed colour inserted into the loop — outside the key, briefly.", songs: null };
      moves.push({ label: `${chordName(x.root, x.quality)} inserted before ${baseNames[x.before]} (${x.tag})`,
        color: GOLD, why: info.why, songs: info.songs });
    });
    Object.entries(ovMap).forEach(([base, ov]) => {
      const idx = baseNames.indexOf(base);
      const numeral = idx >= 0 ? prog.numerals[idx] : null;
      const def = numeral ? numDefs[numeral] : null;
      const isPar = def && ov.root === (tonic + def[0]) % 12 && ov.quality !== def[1]
        && ov.quality !== "dom" && def[1] !== "dom";
      const info = isPar ? (PAR_SONGS[String(numeral).replace(/7$/, "")] || PAR_SONGS.default) : null;
      moves.push({ label: `${base} → ${chordName(ov.root, ov.quality)}${isPar ? " (parallel)" : ""}`,
        color: isPar ? LAV : "#B9C0CC",
        why: info ? info.why : "A free substitution — no standard name, which is often where the good songs start.",
        songs: info ? info.songs : null });
    });
    return moves;
  }, [insList, edits, baseNames, progId, tonic]);

  const keyLabel = `${spell(tonic, tonic, effMode)} ${MODES[effMode].short}`;

  /* ---- selected structure ---- */
  const structSel = useMemo(() => {
    const p = selStruct.split(":");
    if (p[0] !== progId || p.length !== 3) return null;
    if (p[1] === "p") {
      const i = +p[2];
      return STRUCTURES[progId] && STRUCTURES[progId][i]
        ? { st: STRUCTURES[progId][i], plan: PLANS[progId][i] } : null;
    }
    const u = UNIVERSAL[+p[2]];
    return u ? { st: u, plan: u.plan } : null;
  }, [selStruct, progId]);

  const chords2 = useMemo(() => {
    if (!contrast.id || !PROGRESSIONS[contrast.id]) return null;
    const p2 = PROGRESSIONS[contrast.id];
    const nd2 = modeFamily(p2.mode) === "minor" ? MINOR_NUM : MAJOR_NUM;
    const fn2 = modeFamily(p2.mode) === "minor" ? FUNC_MINOR : FUNC_MAJOR;
    return p2.numerals.map((n, bi) => {
      const [off, q0] = nd2[n], r = (tonic + off) % 12, q = seventh(q0, n);
      return { numeral:n, root:r, quality:q, name:chordName(r, q), bi, c2:true, func:fn2[n] || "T" };
    });
  }, [contrast.id, tonic, colour]);

  const resolveWith = (nums, pool) => {
    const half = Math.ceil(pool.length / 2);
    if (nums === "LOOP") return pool;
    if (nums === "HALF1") return pool.slice(0, half);
    if (nums === "HALF2") return pool.slice(half);
    if (nums === "HOLD1") return [pool[0]];
    return nums.map(n => {
      const [off, q0] = numDefs[n], r = (tonic + off) % 12, q = seventh(q0, n);
      return { root: r, quality: q, name: chordName(r, q), numeral: n };
    });
  };
  const poolFor = sym => (chords2 && contrast.sec === sym) ? chords2 : chords;
  const resolveNums = nums => resolveWith(nums, chords);
  const padEven = a => a.length % 2 ? [...a, a[a.length - 1]] : a;

  // sections: the song in performance order, one INSTANCE per pass of each section
  // (Verse ×4 → V1 V2 V3 V4, each with its own melody), plus the flat bar list for playback
  /* ---- custom arrangements ----
     A picked structure is a starting point, not a cage: `custom.plan` is an edited copy of the
     chosen structure's rows and takes over whenever it belongs to the structure on screen. Editing
     is always non-destructive — the original plan is a constant in the table and is never touched,
     so ↺ Reset is just dropping the copy. */
  const planKey = progId + "|" + selStruct;
  const customPlan = (custom.key === planKey && custom.plan && custom.plan.length) ? custom.plan : null;
  const basePlan = structSel ? structSel.plan : null;
  const effPlan = customPlan || basePlan;
  const sections = useMemo(() => {
    const plan = effPlan || [{ sec: "Loop", nums: "LOOP", reps: 1, note: null }];
    const insts = [], counts = {};
    let totalBars = 0;
    const bars = structSel ? [] : null;
    plan.forEach((row, rowIdx) => {
      const L = letterFor(row.sec);
      const usedC = structSel && chords2 && contrast.sec === L;
      const cs = padEven(resolveWith(row.nums, structSel ? poolFor(L) : chords));
      const str = cs.map(c => c.name).join(cs.length > 6 ? "  |  " : " – ");
      const word = LETTER_WORD[L] || row.sec.toLowerCase();
      for (let r = 0; r < row.reps; r++) {
        counts[L] = (counts[L] || 0) + 1;
        const key = L + counts[L];
        // `word` is the letter's generic name, used for display; `sec` keeps what the structure
        // actually called this section, which is what a DAW marker should say — "Breakdown", not "break"
        // `row` is the plan row this instance came from — the arrangement editor works in rows,
        // and a run of instances on the strip is exactly one row
        insts.push({ key, base: L, word, sec: row.sec, cs, str, usedC, note: r === 0 ? row.note : null,
          nbars: cs.length, startBar: totalBars, row: rowIdx });
        totalBars += cs.length;
        if (bars) cs.forEach((c, mb) => bars.push({ chord: c, inst: key, base: L, word, sec: row.sec, mb }));
      }
    });
    return { insts, totalBars, bars };
  }, [effPlan, structSel, chords, chords2, contrast.sec, tonic, progId, colour]);
  const structBars = sections.bars;

  /* ---- editing the arrangement ----
     Sections are numbered in playing order (C1, C2 …), and melodies are stored under that number.
     So moving a chorus earlier, or inserting one, silently renumbers every later section and the
     melodies would follow the *number* rather than the section they were written for. Every edit
     therefore carries its melodies with it: `instKeysOf` recomputes the keys a plan produces, and
     `editPlan` is told which new row came from which old one, so the entries can be moved across. */
  const editPlan = res => {
    if (!res) return;
    const [next, origin, sel] = res;
    const cur = effPlan || [];
    const secs = melos.progId === progId ? melos.secs : {};
    setCustom({ key: planKey, plan: next });
    setMelos({ progId, secs: remapSecs(secs, cur, next, origin, letterFor, cloneLayer) });
    if (sel != null) setSelRow(sel);
  };
  const rowsNow = () => (effPlan || []).map(r => ({ ...r }));
  const moveRow = (i, dir) => editPlan(planMove(rowsNow(), i, dir));
  const bumpReps = (i, d) => editPlan(planReps(rowsNow(), i, d));
  const dupRow = i => editPlan(planDup(rowsNow(), i));
  const delRow = i => editPlan(planDel(rowsNow(), i));
  const addRow = sec => editPlan(planAdd(rowsNow(), selRow + 1, sec));
  const resetPlan = () => { setCustom({ key:"", plan:null }); setSelRow(0); };
  // the section types you can add — one per letter the app knows how to colour, name and letter
  const ADDABLE = ["Intro", "Verse", "Pre-chorus", "Chorus", "Bridge", "Solo", "Groove",
    "Build", "Drop", "Breakdown", "Refrain", "Outro"];

  /* ---- melody scale + targets ---- */
  const scaleSemis = MODES[effMode].semis;
  const scaleNotes = scaleSemis.map(s => (tonic + s) % 12);
  const pentSemis = MODES[effMode].pent;
  // the diatonic triads of the current mode — their qualities shift from mode to mode (this is where a
  // mode "redefines the chords": e.g. IV is major in Dorian but minor in Aeolian)
  const modeTriads = useMemo(() => {
    const sc = MODES[effMode].semis, RN = ["I","II","III","IV","V","VI","VII"];
    return sc.map((s, i) => {
      const third = ((sc[(i + 2) % 7] - s) % 12 + 12) % 12;
      const fifth = ((sc[(i + 4) % 7] - s) % 12 + 12) % 12;
      const q = third === 3 && fifth === 6 ? "dim" : third === 4 && fifth === 8 ? "aug"
        : third === 3 ? "min" : "maj";
      const rn = q === "min" ? RN[i].toLowerCase() : q === "dim" ? RN[i].toLowerCase() + "°"
        : q === "aug" ? RN[i] + "+" : RN[i];
      return { root: (tonic + s) % 12, q, rn };
    });
  }, [effMode, tonic]);
  // is a chord part of the current mode's diatonic palette? (root in the scale AND its major/minor
  // triad matches the mode's chord on that degree) — used to flag borrowed / chromatic chords
  const modeChordQ = useMemo(() => {
    const m = {}; modeTriads.forEach(t => { m[t.root] = t.q; }); return m;
  }, [modeTriads]);
  const triadFamily = q => famMin(q) ? "min" : q === "dim" ? "dim" : q === "aug" ? "aug"
    : (q === "sus2" || q === "sus4" || q === "dom7sus4") ? "sus" : "maj";
  const chordInMode = c => {
    const dq = modeChordQ[((c.root % 12) + 12) % 12];
    if (dq == null) return false;              // root sits outside the scale entirely
    const fam = triadFamily(c.quality);
    return fam === "sus" ? true : fam === dq;  // a sus chord has no 3rd — in-key if its root is
  };

  /* ---- rhythm / metronome ---- */
  const patId = patSel.key === progId && PATTERNS[patSel.id] ? patSel.id : (PATTERN_DEFAULT[progId] || "pop");
  const rhythm = PATTERNS[patId];
  const effBpm = bpmSt.key === progId ? bpmSt.val : (BPM_DEFAULT[progId] || 96);
  const drum = drumSt.key === progId && DRUMS[drumSt.val] ? drumSt.val : (DRUM_DEFAULT[progId] || "off");
  const kit = kitSt.key === progId ? kitSt.val : (KIT_DEFAULT[progId] || "acoustic");
  const pump = pumpSt.key === progId ? pumpSt.val : (PUMP_DEFAULT[progId] || "off");
  // a dotted eighth is the dance default; everything else starts dry
  const delayId = delaySt.key === progId ? delaySt.val : (DRUM_DEFAULT[progId] ? "8d" : "off");
  // Swing is a dial now, not a switch. The rhythm pattern's own `swing` flag sets the starting
  // point; the user can then push it anywhere from straight to nearly triplet.
  const swingAmt = swingSt.key === progId ? swingSt.val : (rhythm.swing ? 0.33 : 0);
  bpmRef.current = effBpm; patRef.current = rhythm.pattern; swingRef.current = swingAmt;
  humRef.current = humanise;
  instrRef.current = instr; drumRef.current = DRUMS[drum].pattern; realRef.current = realSounds;
  secDrumRef.current = secDrum; secQuietRef.current = secQuiet;
  // automation belongs to the song it was drawn on, so it stops applying when you switch away
  autoRef.current = auto.key === planKey ? auto : {};
  kitRef.current = kit; pumpRef.current = PUMP_AMT[pump] || 0; delayRef.current = delayId;
  clickRef.current = clickOn;
  /* Time signature. The chosen strum pattern is the single source of truth for the bar — the meter
     is read off it rather than stored separately, so the two can never disagree. Picking a meter
     therefore means picking a pattern that has it, plus a kit whose bars are the same length; a
     4/4 kit left behind in a 5/4 song would be dropped from the tick grid and fall silent. */
  const curMeter = meterOf(rhythm);
  const metricPats = useMemo(() => Object.entries(PATTERNS).filter(([, p]) => meterOf(p) === curMeter), [curMeter]);
  const metricDrums = useMemo(() =>
    Object.entries(DRUMS).filter(([id, d]) => id === "off" || drumFitsMeter(d, curMeter)), [curMeter]);
  const setMeter = mid => {
    if (mid === curMeter) return;
    const pats = Object.entries(PATTERNS).filter(([, p]) => meterOf(p) === mid);
    if (!pats.length) return;
    const def = PATTERN_DEFAULT[progId];
    const pick = pats.find(([id]) => id === def) || pats[0];
    setPatSel({ key: progId, id: pick[0] });
    // carry the drums across only if they still fit; otherwise take the first kit that does
    if (!drumFitsMeter(DRUMS[drum], mid)) {
      const kits = Object.entries(DRUMS).filter(([id, d]) => id !== "off" && drumFitsMeter(d, mid));
      setDrumSt({ key: progId, val: kits.length ? kits[0][0] : "off" });
    }
    // and any per-section override that no longer fits goes back to following the global choice
    const keep = {};
    for (const [k, v] of Object.entries(secDrum)) if (!v || drumFitsMeter(DRUMS[v], mid)) keep[k] = v;
    if (Object.keys(keep).length !== Object.keys(secDrum).length) setSecDrum(keep);
  };
  const meloBeats = rhythm.pattern.length;                  // grid columns per bar (6 in waltz time, 16 on a sixteenth rhythm)
  const meloSub = subOf(rhythm);                            // columns per beat: 2 = eighths, 4 = sixteenths
  const barBeats = beatsOf(rhythm);                         // 4 in common time, 3 in waltz time
  barBeatsRef.current = barBeats;
  // How finely the scheduler has to tick this bar: enough for the strum pattern and for every
  // drum pattern that could play (the global one plus any per-section override). Computed over
  // the whole song rather than per bar, so the step counter stays coherent as sections change.
  const tickCount = useMemo(() => {
    const lens = [DRUMS[drum], ...Object.values(secDrum).map(id => DRUMS[id])]
      .filter(d => d && d.pattern && drumBeatsOf(d.pattern) === barBeats)
      .map(d => d.pattern.length);
    return lens.reduce((a, b) => lcm(a, b), meloBeats);
  }, [drum, secDrum, meloBeats, barBeats]);
  subRef.current = meloSub; melRef.current = meloBeats;
  // bars per section instance, so a move's sweep can span exactly one instance
  moveRef.current = { moves: secMove,
    instBars: Object.fromEntries(sections.insts.map(d => [d.key, d.cs.length])) };
  // key-independent chord identity, per pool: base slot / contrast slot / numeral position / insert tag
  const chordId = (c, i) => c.inserted ? c.baseName
    : c.c2 ? "c" + c.bi
    : c.bi != null ? "b" + c.bi
    : "x" + i + ":" + (c.numeral || "");
  // adapt one section's saved melody to its current chords: id-matched within the same
  // progression (bars follow their chords through edits and key changes), positional otherwise
  const adaptBars = (savedIds, savedBars, ids, samePid) => {
    let p = 0;
    return ids.map((id, bi) => {
      let bar = null;
      if (savedBars && savedIds && samePid) {
        const idx = savedIds.indexOf(id, p);
        if (idx >= 0) { bar = savedBars[idx]; p = idx + 1; }
      } else if (savedBars && savedBars.length) bar = savedBars[bi] || null;
      return rescaleBar(bar, meloBeats);
    });
  };
  const secMelos = useMemo(() => {
    const samePid = melos.progId === progId;
    const out = {};
    sections.insts.forEach(d => {
      const ids = d.cs.map(chordId);
      const saved = melos.secs[d.key];
      const src = (saved && saved.layers && saved.layers.length) ? saved.layers : [{ bars: null, instr: null }];
      const layers = src.map((ly, li) => {
        const bars = adaptBars(saved && saved.ids, ly && ly.bars, ids, samePid);
        // part 0 always exists; the rest keep whatever bars they were given. Register and level
        // fall back to the defaults for that part index, so older sections gain sane values.
        return { bars, flat: bars.flat(), instr: (ly && ly.instr) || null,
          oct: (ly && ly.oct) != null ? ly.oct : (LAYER_DEFAULT_OCT[li] || 0),
          vol: (ly && ly.vol) != null ? ly.vol : (LAYER_DEFAULT_VOL[li] != null ? LAYER_DEFAULT_VOL[li] : 1),
          mute: !!(ly && ly.mute), solo: !!(ly && ly.solo), send: (ly && ly.send) || 0,
          ...layerFx(ly) };
      });
      out[d.key] = { ids, layers };
    });
    return out;
  }, [melos, progId, sections, meloBeats]);
  /* An arp or a note gate is a rhythm too, and can be finer than anything else in the song: a 1/32
     arp wants eight ticks a beat, a gate four. Folded into the scheduler's resolution here rather
     than in `tickCount` above, because the parts that carry them are only known once `secMelos` has
     been normalised. Without this the extra steps fall between ticks and are silently dropped —
     which sounds like an arp running at half the rate you asked for. */
  const fxTicks = useMemo(() => {
    let n = 1;
    Object.values(secMelos).forEach(sec => sec.layers.forEach(ly => {
      const fx = layerFx(ly);
      if (fx.arp) n = lcm(n, fx.arpRate * barBeats);
      if (fx.gate) n = lcm(n, 4 * barBeats);
    }));
    return n;
  }, [secMelos, barBeats]);
  tickRef.current = lcm(tickCount, fxTicks);
  // measures for the staff notation: chord + melody events per bar, mirroring the MIDI flatten
  const scoreMeasures = useMemo(() => {
    const bars = (structBars && structBars.length) ? structBars : chords.map(c => ({ chord: c }));
    const melBase = (tonic > 6 ? 60 : 72) + tonic;
    const loopSec = secMelos.L1 || Object.values(secMelos)[0];
    // pull every note of one layer out independently by its own onset + held length
    const extract = (cols, oct = 0) => {
      if (!cols) return [];
      const on = (i, d) => (cols[i] || []).includes(d);
      const out = [];
      for (let i = 0; i < meloBeats; i++) for (const d of (cols[i] || [])) {
        if (i > 0 && on(i - 1, d)) continue;                    // only at the note's onset
        let run = 1; while (i + run < meloBeats && on(i + run, d)) run++;
        out.push({ on: i, dur: run, midi: melBase + 12 * oct + scaleSemis[d] });
      }
      return out;
    };
    return bars.map((b, bi) => {
      const secm = b.inst != null ? secMelos[b.inst] : loopSec;
      const idx = b.inst != null ? b.mb : bi % ((secm && secm.layers[0] && secm.layers[0].bars.length) || 1);
      // every melody part lands on the same stave, inked by the part it belongs to
      // a muted part is left off the stave, as it is out of the sound
      const per = ((secm && secm.layers) || []).map(ly =>
        ly.mute ? [] : extract(ly.bars && ly.bars[idx], ly.oct || 0));
      // notes that share an onset AND length become one clean chord; differing rhythms stay separate
      const groups = {};
      per.forEach((evs, li) => evs.forEach(e => {
        const k = e.on + "_" + e.dur;
        const g = groups[k] = groups[k] || { on: e.on, dur: e.dur, byL: new Map() };
        // a pitch keeps the lowest-numbered part that plays it, so part A always reads as the lead
        if (!g.byL.has(e.midi)) g.byL.set(e.midi, li);
      }));
      const mel = Object.values(groups).sort((a, c) => a.on - c.on || a.dur - c.dur).map(g => ({
        on: g.on, dur: g.dur,
        mids: [...g.byL.keys()].sort((x, y) => x - y),
        inkOf: m => LAYER_INK[g.byL.get(m) || 0] || LAYER_INK[0],
        bMids: new Set([...g.byL.entries()].filter(([, li]) => li > 0).map(([m]) => m)),
      }));
      return { chord: b.chord, name: b.chord.name, word: b.inst != null ? (b.mb === 0 ? b.word : null) : null, mel };
    });
  }, [structBars, chords, secMelos, tonic, meloBeats, scaleSemis]);
  const scoreHasMelody = scoreMeasures.some(m => m.mel.length);
  const scoreHasB = scoreMeasures.some(m => m.mel.some(ev => ev.bMids && ev.bMids.size));

  const dupBars = b => (b ? b.map(bar => bar.map(a => [...a])) : null);
  const layerOf = (sec, L) => (sec && sec.layers && sec.layers[L]) || null;
  const barsOf = (sec, L) => { const ly = layerOf(sec, L); return ly ? ly.bars : null; };
  const flatOf = (sec, L) => { const ly = layerOf(sec, L); return ly ? ly.flat : []; };
  const nLayers = sec => (sec && sec.layers ? sec.layers.length : 0);
  // does this section carry any notes, in any part? Tolerates a missing section, which happens
  // for a render or two after the structure changes and before secMelos catches up.
  const secHasNotes = sec => !!(sec && sec.layers && sec.layers.some(ly => ly.flat.some(a => a.length)));
  const EMPTY_SEC = { ids: [], layers: [{ bars: [], flat: [], instr: null }] };
  // write a section entry, keeping every part in the current chord-id coordinates and preserving
  // the parts the caller isn't changing. `patch.layers` replaces the whole list.
  const putSec = (key, patch) => {
    const secs = melos.progId === progId ? melos.secs : {};
    const sec = secMelos[key], prev = secs[key] || {};
    const base = sec ? sec.layers.map(l => ({ bars: dupBars(l.bars), instr: l.instr,
                         oct: l.oct || 0, vol: l.vol == null ? 1 : l.vol, mute: !!l.mute, solo: !!l.solo,
                         send: l.send || 0, ...layerFx(l) }))
                     : (prev.layers || [{ bars: [], instr: null }]);
    setMelos({ progId, secs: { ...secs, [key]: {
      ids: sec ? sec.ids : prev.ids,
      layers: "layers" in patch ? patch.layers : base,
    } } });
  };
  // copy a part, keeping every field. Anything that rebuilds the list goes through this, so a
  // part's register, level, mute and solo survive edits that only meant to touch its notes.
  const cloneLayer = ly => ({ bars: dupBars(ly.bars), instr: ly.instr,
    oct: ly.oct || 0, vol: ly.vol == null ? 1 : ly.vol, mute: !!ly.mute, solo: !!ly.solo,
    send: ly.send || 0, ...layerFx(ly) });
  // replace one part's bars (the shape almost every melody edit takes)
  const putLayer = (key, L, bars) => {
    const sec = secMelos[key]; if (!sec) return;
    putSec(key, { layers: sec.layers.map((ly, i) => i === L ? { ...cloneLayer(ly), bars } : cloneLayer(ly)) });
  };
  // set one field on one part (register, level, mute, solo)
  const setLayerProp = (key, L, patch) => {
    const sec = secMelos[key]; if (!sec) return;
    putSec(key, { layers: sec.layers.map((ly, i) => i === L ? { ...cloneLayer(ly), ...patch } : cloneLayer(ly)) });
  };
  /* Set one part's property across several sections at once. Calling setLayerProp in a loop would
     not work: each call spreads the same render's `melos`, so only the last write survives and the
     rest are silently dropped. One state update, every section in it. */
  const setLayerPropMany = (keys, L, patch) => {
    const secs = melos.progId === progId ? melos.secs : {};
    const next = { ...secs };
    for (const key of keys) {
      const sec = secMelos[key]; if (!sec || !sec.layers[L]) continue;
      next[key] = { ids: sec.ids,
        layers: sec.layers.map((ly, i) => i === L ? { ...cloneLayer(ly), ...patch } : cloneLayer(ly)) };
    }
    setMelos({ progId, secs: next });
  };
  const copyMelody = (fromKey, toKey) => {
    const from = melos.progId === progId ? melos.secs[fromKey] : null;
    if (!from) return;
    setMelos({ progId, secs: { ...melos.secs, [toKey]: { ids: [...from.ids],
      layers: (from.layers || []).map(cloneLayer) } } });
  };
  const addLayer = key => {
    const sec = secMelos[key]; if (!sec || nLayers(sec) >= MAX_LAYERS) return;
    const at = nLayers(sec);
    putSec(key, { layers: [...sec.layers.map(cloneLayer),
      { bars: blankBars(sec.layers[0].bars.length, meloBeats), instr: LAYER_DEFAULT_INSTR[at] || null,
        oct: LAYER_DEFAULT_OCT[at] || 0, vol: LAYER_DEFAULT_VOL[at] == null ? 1 : LAYER_DEFAULT_VOL[at],
        mute: false, solo: false, send: 0 }] });
    setMelLayer(at);
  };
  const removeLayer = (key, L) => {
    const sec = secMelos[key]; if (!sec || L === 0 || !layerOf(sec, L)) return;   // part A is the section
    putSec(key, { layers: sec.layers.filter((_, i) => i !== L).map(cloneLayer) });
    setMelLayer(l => (l >= L ? Math.max(0, l - 1) : l));
    if (melSel.key === key && melSel.layer >= L) setMelSel({ key:"", layer:0, notes:{} });
  };
  const setSecInstr = (key, L, val) => {
    const sec = secMelos[key]; if (!sec) return;
    putSec(key, { layers: sec.layers.map((ly, i) =>
      i === L ? { ...cloneLayer(ly), instr: val || null } : cloneLayer(ly)) });
  };
  meloRef.current = { bySym: secMelos, scale: scaleSemis, tonic, melInstr, legato };
  const tapMelo = (sym, c, deg, L) => {
    const sec = secMelos[sym]; if (!sec) return;
    const bars = dupBars(barsOf(sec, L)); if (!bars) return;
    const cell = bars[Math.floor(c / meloBeats)][c % meloBeats];
    const at = cell.indexOf(deg);
    if (at >= 0) cell.splice(at, 1); else cell.push(deg);
    putLayer(sym, L, bars);
  };

  /* ---- melody grid: select several notes and drag them as a group ---- */
  const nKey = (c, deg) => c + ":" + deg;
  const noteOn = (sec, c, deg, L) => ((flatOf(sec, L)[c] || []).includes(deg));
  const selNotesList = () => Object.keys(melSel.notes).map(k => { const [c, deg] = k.split(":").map(Number); return { c, deg }; });
  const setSelFrom = (key, layer, list) => setMelSel({ key, layer, notes: Object.fromEntries(list.map(n => [nKey(n.c, n.deg), true])) });
  // shift the whole selection by dc columns / dd scale-degrees, clamped so it stays on the grid
  const doMelMove = (key, layer, base, dc, dd) => {
    const sec = secMelos[key]; if (!sec) return;
    const srcBars = barsOf(sec, layer); if (!srcBars) return;
    const cols = flatOf(sec, layer).length, maxDeg = scaleSemis.length - 1;
    const notes = Object.keys(base).map(k => { const [c, deg] = k.split(":").map(Number); return { c, deg }; });
    if (!notes.length) return;
    const cs = notes.map(n => n.c), ds = notes.map(n => n.deg);
    dc = Math.max(-Math.min(...cs), Math.min(dc, (cols - 1) - Math.max(...cs)));
    dd = Math.max(-Math.min(...ds), Math.min(dd, maxDeg - Math.max(...ds)));
    if (!dc && !dd) { setSelFrom(key, layer, notes); return; }
    const bars = dupBars(srcBars);
    const colOf = c => bars[Math.floor(c / meloBeats)][c % meloBeats];
    notes.forEach(n => { const cell = colOf(n.c); const at = cell.indexOf(n.deg); if (at >= 0) cell.splice(at, 1); });
    notes.forEach(n => { const cell = colOf(n.c + dc), nd = n.deg + dd; if (!cell.includes(nd)) cell.push(nd); });
    putLayer(key, layer, bars);
    setSelFrom(key, layer, notes.map(n => ({ c: n.c + dc, deg: n.deg + dd })));
  };
  const nudgeMel = (dc, dd) => { if (melSel.key && Object.keys(melSel.notes).length) doMelMove(melSel.key, melSel.layer, melSel.notes, dc, dd); };
  const deleteMelSel = () => {
    const key = melSel.key, layer = melSel.layer, sec = secMelos[key];
    const notes = selNotesList();
    if (!sec || !notes.length) return;
    const bars = dupBars(barsOf(sec, layer)); if (!bars) return;
    notes.forEach(n => { const cell = bars[Math.floor(n.c / meloBeats)][n.c % meloBeats]; const at = cell.indexOf(n.deg); if (at >= 0) cell.splice(at, 1); });
    putLayer(key, layer, bars);
    setMelSel({ key:"", layer:0, notes:{} });
  };
  // time-scale the selection about its first note: factor 0.5 = double-time (pack into half the
  // space, plays twice as fast), factor 2 = half-time (stretch over twice the space)
  const timeMel = factor => {
    const key = melSel.key, layer = melSel.layer, sec = secMelos[key];
    const notes = selNotesList();
    if (!sec || !notes.length) return;
    const srcBars = barsOf(sec, layer); if (!srcBars) return;
    const cols = flatOf(sec, layer).length;
    const minC = Math.min(...notes.map(n => n.c));
    const bars = dupBars(srcBars);
    const colOf = c => bars[Math.floor(c / meloBeats)][c % meloBeats];
    notes.forEach(n => { const cell = colOf(n.c); const at = cell.indexOf(n.deg); if (at >= 0) cell.splice(at, 1); });
    const placed = [];
    notes.forEach(n => {
      const nc = Math.max(0, Math.min(cols - 1, minC + Math.round((n.c - minC) * factor)));
      const cell = colOf(nc); if (!cell.includes(n.deg)) cell.push(n.deg);
      placed.push({ c: nc, deg: n.deg });
    });
    putLayer(key, layer, bars);
    setSelFrom(key, layer, placed);
  };
  // ---- melodic development on the selection (motif → melody) ----
  // in-place transform: map each selected note to a new {c,deg}; originals are cleared first
  const transformMel = mapNote => {
    const key = melSel.key, layer = melSel.layer, sec = secMelos[key];
    const notes = selNotesList();
    if (!sec || notes.length < 1) return;
    const srcBars = barsOf(sec, layer); if (!srcBars) return;
    const cols = flatOf(sec, layer).length, maxDeg = scaleSemis.length - 1;
    const minC = Math.min(...notes.map(n => n.c)), maxC = Math.max(...notes.map(n => n.c));
    const pivot = [...notes].sort((a, b) => a.c - b.c || a.deg - b.deg)[0].deg;   // first note's degree
    const bars = dupBars(srcBars);
    const colOf = c => bars[Math.floor(c / meloBeats)][c % meloBeats];
    notes.forEach(n => { const cell = colOf(n.c); const at = cell.indexOf(n.deg); if (at >= 0) cell.splice(at, 1); });
    const placed = [];
    notes.forEach(n => {
      const m = mapNote(n, { minC, maxC, pivot });
      const nc = m.c, nd = Math.max(0, Math.min(maxDeg, m.deg));
      if (nc < 0 || nc >= cols) return;                                          // off the grid → drop
      const cell = colOf(nc); if (!cell.includes(nd)) cell.push(nd);
      placed.push({ c: nc, deg: nd });
    });
    putLayer(key, layer, bars);
    if (placed.length) setSelFrom(key, layer, placed);
  };
  // copy the selection immediately after itself, transposed by dd scale-steps (0 = repeat, ±1 = sequence)
  const echoMel = dd => {
    const key = melSel.key, layer = melSel.layer, sec = secMelos[key];
    const notes = selNotesList();
    if (!sec || notes.length < 1) return;
    const srcBars = barsOf(sec, layer); if (!srcBars) return;
    const cols = flatOf(sec, layer).length, maxDeg = scaleSemis.length - 1;
    const minC = Math.min(...notes.map(n => n.c)), maxC = Math.max(...notes.map(n => n.c));
    const span = maxC - minC + 1;
    const bars = dupBars(srcBars);
    const colOf = c => bars[Math.floor(c / meloBeats)][c % meloBeats];
    const placed = [];
    notes.forEach(n => {
      const nc = n.c + span, nd = Math.max(0, Math.min(maxDeg, n.deg + dd));
      if (nc >= cols) return;
      const cell = colOf(nc); if (!cell.includes(nd)) cell.push(nd);
      placed.push({ c: nc, deg: nd });
    });
    putLayer(key, layer, bars);
    if (placed.length) setSelFrom(key, layer, placed);        // keep the copy selected → chain sequences
  };
  const invertMel  = () => transformMel((n, { pivot }) => ({ c: n.c, deg: 2 * pivot - n.deg }));  // flip contour
  const reverseMel = () => transformMel((n, { minC, maxC }) => ({ c: minC + maxC - n.c, deg: n.deg })); // retrograde
  // call & response: keep the selection (the "call"), append an echo right after it whose LAST note
  // resolves home to the tonic (degree 0) — the classic antecedent → consequent answer
  const callResponseMel = () => {
    const key = melSel.key, layer = melSel.layer, sec = secMelos[key];
    const notes = selNotesList();
    if (!sec || notes.length < 1) return;
    const srcBars = barsOf(sec, layer); if (!srcBars) return;
    const cols = flatOf(sec, layer).length;
    const minC = Math.min(...notes.map(n => n.c)), maxC = Math.max(...notes.map(n => n.c));
    const span = maxC - minC + 1;
    const bars = dupBars(srcBars);
    const colOf = c => bars[Math.floor(c / meloBeats)][c % meloBeats];
    const placed = [];
    notes.forEach(n => {
      const nc = n.c + span; if (nc >= cols) return;
      const nd = n.c === maxC ? 0 : n.deg;                 // the answer lands on the tonic
      const cell = colOf(nc); if (!cell.includes(nd)) cell.push(nd);
      placed.push({ c: nc, deg: nd });
    });
    putLayer(key, layer, bars);
    if (placed.length) setSelFrom(key, layer, placed);
  };
  // select every note in a section's melody (across the whole grid, not just what's scrolled into view)
  const selectAllMel = (key, layer) => {
    const sec = secMelos[key]; if (!sec) return;
    const list = [];
    (flatOf(sec, layer) || []).forEach((cell, c) => (cell || []).forEach(deg => list.push({ c, deg })));
    if (list.length) { setMelMove(true); setSelFrom(key, layer, list); }
  };
  const cellFromPoint = (x, y) => {
    const el = typeof document !== "undefined" && document.elementFromPoint(x, y);
    if (!el || el.dataset == null || el.dataset.mk === undefined) return null;
    return { key: el.dataset.mk, c: +el.dataset.c, deg: +el.dataset.deg };
  };
  // Drag anywhere draws a selection box; drag a note that's ALREADY selected to move the group.
  const melDown = (e, key, c, deg, sec, L) => {
    if (!melMove) return;                                   // draw mode → onClick handles taps
    e.preventDefault();
    const on = noteOn(sec, c, deg, L);
    const already = melSel.key === key && melSel.layer === L && !!melSel.notes[nKey(c, deg)];
    const mode = (on && already) ? "move" : "marquee";
    const base = mode === "move" ? { ...melSel.notes } : null;
    melDragRef.current = { key, layer: L, startC: c, startDeg: deg, curC: c, curDeg: deg, mode, base, moved: false, on };
    window.addEventListener("pointermove", melDrag);
    window.addEventListener("pointerup", melUp);
    window.addEventListener("pointercancel", melUp);
    if (mode === "marquee") setMelBox({ key, c0: c, c1: c, d0: deg, d1: deg });
  };
  const melDrag = e => {
    const dr = melDragRef.current; if (!dr) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (!cell || cell.key !== dr.key || (cell.c === dr.curC && cell.deg === dr.curDeg)) return;
    dr.curC = cell.c; dr.curDeg = cell.deg;
    dr.moved = dr.moved || cell.c !== dr.startC || cell.deg !== dr.startDeg;
    if (dr.mode === "marquee")
      setMelBox({ key: dr.key, c0: Math.min(dr.startC, cell.c), c1: Math.max(dr.startC, cell.c),
        d0: Math.min(dr.startDeg, cell.deg), d1: Math.max(dr.startDeg, cell.deg) });
    else setMelGhost({ key: dr.key, dc: cell.c - dr.startC, dd: cell.deg - dr.startDeg });
  };
  const melUp = () => {
    const dr = melDragRef.current; if (!dr) return;
    melDragRef.current = null; setMelBox(null); setMelGhost(null);
    window.removeEventListener("pointermove", melDrag);
    window.removeEventListener("pointerup", melUp);
    window.removeEventListener("pointercancel", melUp);
    if (dr.mode === "marquee") {
      if (!dr.moved) {                                        // a tap, not a drag
        if (dr.on) setSelFrom(dr.key, dr.layer, [{ c: dr.startC, deg: dr.startDeg }]);  // select the note
        else setMelSel({ key:"", layer:0, notes:{} });        // tap on empty clears
        return;
      }
      const sec = secMelos[dr.key]; if (!sec) return;
      const c0 = Math.min(dr.startC, dr.curC), c1 = Math.max(dr.startC, dr.curC);
      const d0 = Math.min(dr.startDeg, dr.curDeg), d1 = Math.max(dr.startDeg, dr.curDeg);
      const list = [];
      for (let c = c0; c <= c1; c++) for (let deg = d0; deg <= d1; deg++) if (noteOn(sec, c, deg, dr.layer)) list.push({ c, deg });
      setSelFrom(dr.key, dr.layer, list);
    } else {
      const dc = dr.curC - dr.startC, dd = dr.curDeg - dr.startDeg;
      if (dc || dd) doMelMove(dr.key, dr.layer, dr.base, dc, dd);
    }
  };

  // write a suggested melody pattern onto a section's grid (overwrites what's there)
  const applyPattern = (d, sec, patId, start, L, rhythmId = "straight") => {
    const pat = MELODY_PATTERNS.find(p => p.id === patId) || MELODY_PATTERNS[0];
    const spots = rhythmSpots(rhythmId, meloBeats, meloSub, barBeats);
    // A counter-melody is written against whatever else is already on this section — the lowest
    // numbered part that has notes and is not the one being written. Everything else ignores it.
    const againstL = sec.layers.findIndex((ly, i) => i !== L && ly.flat.some(c => c.length));
    const bars = pat.gen({ nBars: d.cs.length, B: meloBeats, sub: meloSub, start: start % scaleSemis.length,
      cols: spots.map(x => x.c), lens: spots.map(x => x.len),
      chordDegs: chordDegsOf(d.cs),
      against: againstL >= 0 ? barsOf(sec, againstL) : null });
    putLayer(d.key, L, bars);
    setMelTab({ ...melTab, [d.key]: "write" });   // reveal the result on the grid
  };
  const clearMelody = (d, sec, L) => {
    putLayer(d.key, L, blankBars(d.cs.length, meloBeats));
  };

  /* ---- melodic narrative: one shape written across every section at once ---- */
  const narId = narSel.key === progId ? narSel.id : "";
  const curNar = NARRATIVES.find(n => n.id === narId) || null;
  const varyAmt = varySt.key === progId ? varySt.val : 1;
  // the bar's chord as a scale degree — the hook narratives use to follow the harmony
  const chordDegsOf = cs => cs.map(c => {
    const i = scaleNotes.indexOf(((c.root % 12) + 12) % 12);
    return i >= 0 ? i : null;
  });
  // write every section's melody A in one state update (a putSec per section would read stale state)
  const applyNarrative = (id, amt = varyAmt) => {
    const nar = NARRATIVES.find(n => n.id === id);
    setNarSel({ key: progId, id: nar ? id : "" });
    if (!nar || !sections.insts.length) return;
    const secs = melos.progId === progId ? { ...melos.secs } : {};
    const passes = {};
    sections.insts.forEach(d => { passes[d.base] = (passes[d.base] || 0) + 1; });
    const seen = {};
    const total = sections.insts.length;
    sections.insts.forEach((d, idx) => {
      const pass = seen[d.base] = (seen[d.base] || 0);
      seen[d.base] = pass + 1;
      const spots = rhythmSpots(ROLE_RHYTHM[d.base] || "straight", meloBeats, meloSub, barBeats);
      const gen = nar.gen({ nBars: d.cs.length, B: meloBeats, sub: meloSub, nd: scaleSemis.length, spots,
        chordDegs: chordDegsOf(d.cs), role: d.base, pass, passes: passes[d.base],
        idx, total, frac: total > 1 ? idx / (total - 1) : 0 });
      // second chorus, third verse: same tune, small edits. Pass 0 is left alone — it is the thing
      // the later ones are variations of.
      const bars = varyBars(gen, { pass, role: d.base, nd: scaleSemis.length, amount: amt });
      const sec = secMelos[d.key], prev = secs[d.key] || {};
      // a narrative writes part A of every section; the other parts are left exactly as they are —
      // cloneLayer rather than a bars/instr pair, so registers, levels, mutes and sends survive
      const keep = sec ? sec.layers.map(cloneLayer)
                       : (prev.layers || [{ bars: [], instr: null }]).map(cloneLayer);
      secs[d.key] = { ids: sec ? sec.ids : prev.ids,
        layers: keep.map((ly, i) => i === 0 ? { ...ly, bars } : ly) };
    });
    setNarUndo(melos);                       // one step back, in case it wrote over something good
    setMelos({ progId, secs });
  };
  const undoNarrative = () => {
    if (!narUndo) return;
    setMelos(narUndo); setNarUndo(null); setNarSel({ key: progId, id: "" });
  };
  {
    const idx = chords.map((_, i) => i);
    chordsRef.current = { list: chords, seq: idx.length % 2 ? [...idx, idx.length - 1] : idx, struct: structBars };
    // the loop window follows the toggled section's current position (it moves as the structure is edited)
    const ld = loopSec ? sections.insts.find(s => s.key === loopSec) : null;
    loopRef.current = ld ? { from: ld.startBar, len: ld.nbars } : null;
  }
  const nudgeBpm = d => setBpmSt({ key: progId, val: Math.max(40, Math.min(220, effBpm + d)) });

  const stopMetro = () => {
    const m = metroRef.current;
    if (m) { clearInterval(m.timer); try { m.ctx.close(); } catch (e) {} metroRef.current = null; }
    setPlaying(false); setCurStep(-1); setCurBar(-1); setCurLabel(null); setCurQ(null); setCurInst(null); setCurSongBar(-1);
  };
  // The audio graph, built into whatever context it is given — a live AudioContext for playback,
  // an OfflineAudioContext for rendering the song to a file. Everything downstream of `master`
  // is identical either way, so a render sounds like what you heard.
  const buildGraph = (ctx, from, stem) => {
  // Stems are pre-master: the limiter is a compressor, and compression is not linear, so
  // limiting each stem on its own could never add back up to a limited mix. Bypassing it means
  // the stems sum to the raw mix sample for sample, and the DAW's own master chain does the
  // limiting — which is what a producer wants from stems anyway.
  /* Automation sits on the master path, after everything and before the limiter, so a drawn
     filter sweep or level ride covers the drums as well as the pitched sources — a DJ filter, not
     a pitched-bus filter. Both are linear, and both are scheduled identically in a stem render, so
     the stems still sum to the mix. */
  const autoFilt = ctx.createBiquadFilter();
  autoFilt.type = "lowpass"; autoFilt.frequency.value = FILTER_OPEN; autoFilt.Q.value = 0.6;
  const autoGain = ctx.createGain(); autoGain.gain.value = 1;
  autoFilt.connect(autoGain);
  let master;
  if (stem) {
    master = ctx.createGain(); master.gain.value = 0.65; master.connect(autoFilt);
    autoGain.connect(ctx.destination);
  } else {
    const limiter = ctx.createDynamicsCompressor();  // tame peaks so stacked samples don't clip
  // firm brick-wall limiting: a high ratio + short attack so stacked/ringing voices can't sum
  // past 0 dBFS and clip into harsh digital distortion (ratio 4 was too gentle to catch peaks)
  limiter.threshold.value = -5; limiter.knee.value = 3; limiter.ratio.value = 12;
  limiter.attack.value = 0.002; limiter.release.value = 0.14;
  limiter.connect(ctx.destination);
  master = ctx.createGain(); master.gain.value = 0.65; master.connect(autoFilt);
  autoGain.connect(limiter);
  }
  // section-move filter: a build sweeps the whole pitched mix including its reverb tail, which is
  // what makes it sound like the room opening up
  const filt = ctx.createBiquadFilter();
  filt.type = "lowpass"; filt.frequency.value = FILTER_OPEN; filt.Q.value = 0.8;
  filt.connect(master);
  /* Sidechain. This used to be one gain node on the master path, which meant every pitched source
     pumped by exactly the same amount — fine for a demo, useless for writing dance music, where
     the bass ducks hard and the pad barely moves. Each source now ducks on its own node on the way
     into the reverb bus: `cduck` for the chords, one per melody part. Drums and click go straight
     to the master, so the kick lands in the hole it just made rather than ducking itself.
     The reverb *return* keeps a duck of its own, at the global amount, so the tail still breathes
     the way it did when the duck sat on the master. */
  const wetDuck = ctx.createGain(); wetDuck.gain.value = 1; wetDuck.connect(filt);
  const music = makeReverb(ctx, filt, 1.6, 0.16, wetDuck);   // reverb bus for pitched sources
  const cduck = ctx.createGain(); cduck.gain.value = 1; cduck.connect(music);
  // tempo-synced delay, fed by whichever parts have a send. It returns into the move filter, so
  // a build sweeps the echoes along with everything else.
  const delay = makeDelay(ctx, filt, 60 / (bpmRef.current || 120), delayRef.current);
  const sampler = makeSampler(ctx);                // real-instrument samples (load when online)
  const mi = (meloRef.current || {}).melInstr, leadKey = isGM(mi) ? mi : null;
  if (realRef.current) { sampler.load(instrRef.current); if (leadKey) sampler.load(leadKey); }
  const m = { ctx, master, music, cduck, wetDuck, filt, autoFilt, autoGain, stem: stem || null, lastAutoBar: -1, lastMoveBar: -1,
    partGain: [], partGate: [], partDuck: [], partSend: [], delay, voicing: null, lastChordName: null, sampler, lastInstr: instrRef.current, lastLead: leadKey,
    leadLoaded: new Set(leadKey ? [leadKey] : []),
    step: from * (tickRef.current || patRef.current.length || 8), nextTime: ctx.currentTime + 0.1, noise: makeNoise(ctx) };
    return m;
  };
  // One tick of the song: chord, drums, melody parts, moves. `live` drives the on-screen
  // playhead; an offline render passes false because there is nothing to light up.
  const emitTick = (m, live) => {

      // The bar ticks at its finest active resolution; every pattern is sampled onto that grid.
      // `beat` is the musical unit the voices are shaped against (a quarter note), so note
      // lengths and the pump stay put whether the bar is in eighths or sixteenths.
      const L = tickRef.current || patRef.current.length || 8;
      const patLen = patRef.current.length || 8;
      const ticksPerBeat = L / (patLen / (subRef.current || 2));
      const tick = 60 / bpmRef.current / ticksPerBeat;
      const beat = 60 / bpmRef.current;
      const eighth = beat / 2;                       // the voices' reference length, meter-independent
      const i = m.step % L;
      const patStep = stepAt(patLen, i, L);        // null when this tick falls between strum steps
      const MB = melRef.current || patLen;         // melody grid columns per bar
      const melStep = stepAt(MB, i, L);            // null between melody columns
      const { list, seq, struct } = chordsRef.current;
      const loop = loopRef.current;
      let chord, pillIdx = -1, label = null, instNow = "L1", structBar = -1;
      if (struct && struct.length) {
        // confine to the toggled section's bar window when a loop is active
        const useLoop = loop && loop.len > 0 && loop.from + loop.len <= struct.length;
        structBar = useLoop
          ? loop.from + (Math.floor(m.step / L) % loop.len)
          : Math.floor(m.step / L) % struct.length;
        const e = struct[structBar];
        chord = e.chord;
        pillIdx = list.findIndex(c => c.name === e.chord.name);
        const lb = useLoop ? structBar - loop.from : structBar;
        const tb = useLoop ? loop.len : struct.length;
        label = `${e.inst} ${e.word} · bar ${lb + 1} of ${tb}${useLoop ? " · 🔁 loop" : ""}`;
        instNow = e.inst;
      } else {
        const bar = seq.length ? Math.floor(m.step / L) % seq.length : 0;
        pillIdx = seq.length ? seq[bar] : 0;
        chord = list[pillIdx];
      }
      const sym = (patStep == null ? null : patRef.current[patStep]) || "-";
      let t = m.nextTime;
      // swing delays the offbeat of each strum-pattern pair — on a sixteenth pattern that is
      // a sixteenth shuffle, which is exactly the garage/2-step feel
      const strumStride = L / patLen;
      if (swingRef.current && patStep != null && patStep % 2 === 1) t += tick * strumStride * swingRef.current;
      // Humanise: a few milliseconds of push and pull, and a little velocity variation, so a
      // pattern stops sounding typed. Derived from a hash of the tick rather than Math.random, so
      // the "randomness" is identical on every play, render and stem bounce — otherwise a stem
      // would drift out of time with the mix it was supposed to come from.
      const hum = humRef.current || 0;
      const jitter = (salt, amt) => hum ? (hash01(m.step * 131 + salt) - 0.5) * amt * hum : 0;
      // clamped at zero: an offline render starts at t=0, and a jitter that pulled the first tick
      // early would schedule at a negative time, which throws rather than rounding up
      if (hum) t = Math.max(0, t + jitter(1, 0.024));
      const humVel = v => v * (1 + jitter(2, 0.34));
      const inst = instrRef.current;
      if (realRef.current && inst !== m.lastInstr) { m.sampler.load(inst); m.lastInstr = inst; }  // switched voice mid-play
      // The voicing is shared state, not sound: an arpeggiated part reads it to know which notes
      // the chord is made of. It must therefore update in *every* stem, including ones where the
      // chords themselves are silent — otherwise an arp in a part stem would follow a different
      // chord from the one it followed in the mix.
      if (chord && chord.name !== m.lastChordName) {
        // pick the inversion nearest the last chord's, so the voicing moves by step through the
        // progression instead of leaping in root position
        m.voicing = voiceChord(chord, m.voicing);
        m.lastChordName = chord.name;
      }
      // a section can drop its chords entirely — the breakdown where only the drums carry on
      const quiet = struct && struct.length && structBar >= 0 && struct[structBar]
        && struct[structBar].base != null && !!secQuietRef.current[struct[structBar].base];
      if (sym !== "-") {
        if (clickRef.current && !m.stem) clickSound(m.ctx, t, sym, m.master);   // metronome click, off by default; never in a stem
        if (chord && !quiet && (!m.stem || m.stem.kind === "chords")) {
          const played = realRef.current && playSampled(m.sampler, inst, m.ctx, t, chord, sym, eighth, m.cduck, m.voicing);
          if (!played) playHit(m.ctx, t, chord, sym, inst, eighth, m.cduck, m.voicing);
        }
      }
      let dpat = drumRef.current;                       // global drum pattern by default
      if (struct && struct.length && structBar >= 0) {   // a section can override with its own kit
        const b = struct[structBar];
        const sd = b && b.base != null ? secDrumRef.current[b.base] : "";
        if (sd) dpat = DRUMS[sd] ? DRUMS[sd].pattern : null;   // "off" → null → silent for this section
      }
      /* Automation lanes: on each bar's downbeat, ramp to the value the curve holds a bar later.
         Per bar rather than per tick because that is already smooth to the ear and keeps the event
         count down; guarded by the bar index so the lookahead cannot schedule one bar twice. */
      // With no structure there is no structBar — it stays -1 for every bar, so guarding on it
      // would let automation fire once and never again on a plain loop. Count bars instead.
      const autoBar = structBar >= 0 ? structBar : Math.floor(m.step / L);
      if (i === 0 && autoBar !== m.lastAutoBar) {
        m.lastAutoBar = autoBar;
        const A = autoRef.current || {};
        const barDur = barBeatsRef.current * beat;
        const bar = autoBar;
        const fNow = autoAt(A.filter, bar), fNext = autoAt(A.filter, bar + 1);
        if (fNow != null) {
          // cutoff is heard logarithmically, so a linear lane has to map exponentially or the top
          // half of the sweep does almost nothing
          const hz = v => Math.max(60, 120 * Math.pow(FILTER_OPEN / 120, v));
          m.autoFilt.frequency.setValueAtTime(hz(fNow), t);
          m.autoFilt.frequency.exponentialRampToValueAtTime(hz(fNext == null ? fNow : fNext), t + barDur);
        }
        const gNow = autoAt(A.level, bar), gNext = autoAt(A.level, bar + 1);
        if (gNow != null) {
          m.autoGain.gain.setValueAtTime(gNow, t);
          m.autoGain.gain.linearRampToValueAtTime(gNext == null ? gNow : gNext, t + barDur);
        }
      }
      // section moves: fire once, on the downbeat of each section instance, scheduling the whole
      // sweep across that instance's length. Guarded by the bar index so a re-entered bar (or the
      // lookahead running twice over one tick) can't restack the automation.
      if (i === 0 && struct && structBar >= 0 && structBar !== m.lastMoveBar) {
        const b = struct[structBar];
        if (b && b.mb === 0) {
          m.lastMoveBar = structBar;
          const mv = b.base != null ? moveRef.current.moves[b.base] : "";
          const spec = (MOVES[mv] || {}).spec || null;
          const nb = (b.inst != null && moveRef.current.instBars[b.inst]) || 1;
          applyMove(m.ctx, m.filt, spec, t, nb * (patLen / (subRef.current || 2)) * beat, m.noise, m.master);
        }
      }
      const dstep = sampleAt(dpat, i, L);          // the drum pattern resampled onto the bar's ticks
      const accent = accentAt(i, ticksPerBeat);    // lean on the pulse rather than hitting flat
      const kickNow = !!dstep && /[KB]/.test(dstep);
      if (dstep) {
        if (!m.stem || m.stem.kind === "drums")
          for (const ch of dstep) drumSound(m.ctx, t, ch, m.noise, m.master, kitRef.current, humVel(accent));
        // Pump the pitched sources under every kick. Recovery stops just short of the next beat, so
        // four-on-the-floor breathes fully back in right as the next kick hits. The pump belongs to
        // the pitched sources, so it stays in every pitched stem even though the kick that triggers
        // it does not — that is what makes the stems sum back to the mix. Melody parts duck on
        // their own nodes further down, each by its own amount.
        if (pumpRef.current && kickNow) {
          duckAt(m.cduck, t, pumpRef.current, beat * 0.8);
          duckAt(m.wetDuck, t, pumpRef.current, beat * 0.8);
        }
      }
      const mel = meloRef.current;
      if (mel) {
        let sym = null, mb = 0;
        if (struct && struct.length) {
          const e = struct[structBar];   // same bar the chord engine chose (honours the loop window)
          sym = e.inst; mb = e.mb;
        } else if (mel.bySym.L1) {
          sym = "L1";
          const nb = (mel.bySym.L1.layers[0].bars.length) || 1;
          mb = Math.floor(m.step / L) % nb;
        }
        const sec = sym && mel.bySym[sym];
        // an arpeggiated part has no written notes of its own, so "does this section sound?"
        // has to count arps as well as grids
        if (sec && sec.layers.some(ly => ly.flat.length || ly.arp)) {
          const base = (mel.tonic > 6 ? 60 : 72) + mel.tonic;
          /* One part's signal chain, built on first use and reused after:
               gain (level · mute · solo) → gate (note gate) → duck (this part's sidechain) → bus
             The echo send is taken after the gate, so a gated part throws gated repeats rather
             than a smooth pad's worth of echo the dry signal never had. */
          const chainOf = li => {
            let dest = m.partGain[li];
            if (!dest) {
              dest = m.partGain[li] = m.ctx.createGain();
              const gate = m.partGate[li] = m.ctx.createGain(); gate.gain.value = 1;
              const pduck = m.partDuck[li] = m.ctx.createGain(); pduck.gain.value = 1;
              dest.connect(gate); gate.connect(pduck); pduck.connect(m.music);
              if (m.delay) {                       // a parallel send, so the dry part is untouched
                const sd = m.partSend[li] = m.ctx.createGain();
                sd.gain.value = 0; gate.connect(sd); sd.connect(m.delay.send);
              }
            }
            return { gain: dest, gate: m.partGate[li], duck: m.partDuck[li] };
          };
          // play one melody layer's column with its own voice (falling back to the global lead)
          const playLayer = (flat, voice, li, oct, gain, send) => {
            if (!flat || !flat.length || melStep == null || !gain) return;
            const N = flat.length, col = (mb * MB + melStep) % N;
            const dest = chainOf(li).gain;
            dest.gain.setValueAtTime(gain * humVel(accent), t);
            if (m.partSend[li]) m.partSend[li].gain.setValueAtTime(send, t);
            const leadKey = isGM(voice) ? voice : null;   // real-sample lead voice, if any
            if (realRef.current && leadKey && !m.leadLoaded.has(leadKey)) { m.sampler.load(leadKey); m.leadLoaded.add(leadKey); }
            (flat[col] || []).forEach(deg => {
              const held = mel.legato;
              const prev = flat[col - 1] || [];
              if (held && col > 0 && prev.includes(deg)) return; // still ringing from last slot
              let run = 1;
              if (held) while (col + run < N && (flat[col + run] || []).includes(deg)) run++;
              const midi = base + 12 * (oct || 0) + mel.scale[deg];
              // `run` counts melody columns, so a note's length has to be measured in columns
              // — on a sixteenth grid a one-column note is a sixteenth, not an eighth
              const colDur = beat / (subRef.current || 2);
              const dur = held ? colDur * (run + 0.35) : colDur * 0.92;
              const sampled = realRef.current && playLeadSampled(m.sampler, voice, t, midi, dur, dest);
              if (!sampled) {
                // GM instrument with no loaded sample → its family's synth voice; else the synth spec itself
                const kind = isGM(voice) ? FAM_LEAD[gmFam(voice)] : voice;
                leadNote(m.ctx, t, midi, dur, kind, held, dest);
              }
            });
          };
          /* The arpeggiator. Rather than reading the grid, an arped part takes the chord under
             this bar and walks its notes in the chosen order — so it re-follows the harmony the
             moment you change a chord, which is the whole point of arping in a sketchpad.
             The step index comes from the absolute tick, not a running counter, so the line is
             identical whether it is played, rendered or bounced to a stem. */
          const playArp = (fx, voice, li, oct, gain, send) => {
            const mode = ARP_BY_ID[fx.arp];
            if (!mode || !gain || !m.voicing || !m.voicing.length) return;
            const stride = L / (fx.arpRate * barBeatsRef.current);
            if (stride < 1 || i % Math.round(stride) !== 0) return;     // not an arp step
            const one = m.voicing.length;                                // notes in one octave
            const pool = [];
            for (let o = 0; o < Math.max(1, fx.arpOct); o++)
              for (const n of m.voicing) pool.push(n + 12 * o);
            const stepIdx = Math.floor(m.step / Math.round(stride));
            let midi = pool[Math.min(pool.length - 1, Math.max(0, mode.seq(stepIdx, pool.length, one)))] + 12 * (oct || 0);
            // Four octaves of arp on a part already lifted two is a piercing 12 kHz whistle, and
            // the same stack on a sub bass falls below hearing. Fold stray octaves back into the
            // audible range rather than letting the two settings multiply into something unusable.
            while (midi > 108) midi -= 12;
            while (midi < 24) midi += 12;
            const chain = chainOf(li);
            chain.gain.gain.setValueAtTime(gain * humVel(accent), t);
            if (m.partSend[li]) m.partSend[li].gain.setValueAtTime(send, t);
            const dur = (beat / fx.arpRate) * 0.92;
            const leadKey = isGM(voice) ? voice : null;
            if (realRef.current && leadKey && !m.leadLoaded.has(leadKey)) { m.sampler.load(leadKey); m.leadLoaded.add(leadKey); }
            const sampled = realRef.current && playLeadSampled(m.sampler, voice, t, midi, dur, chain.gain);
            if (!sampled) leadNote(m.ctx, t, midi, dur, isGM(voice) ? FAM_LEAD[gmFam(voice)] : voice, false, chain.gain);
          };
          const anySolo = sec.layers.some(ly => ly.solo);
          sec.layers.forEach((ly, li) => {
            if (m.stem && !(m.stem.kind === "part" && m.stem.i === li)) return;
            const fx = layerFx(ly);
            const gain = layerGain(ly, anySolo), voice = ly.instr || mel.melInstr;
            // The chain has to exist before the gate or the sidechain can be scheduled on it —
            // both fire on ticks where the part may play no note at all.
            if (fx.gate || fx.duck != null || pumpRef.current) chainOf(li);
            // this part's own sidechain depth; null means "whatever the global Pump says"
            if (kickNow) {
              const amt = fx.duck == null ? pumpRef.current : fx.duck;
              if (amt && m.partDuck[li]) duckAt(m.partDuck[li], t, amt, beat * 0.8);
            }
            // The note gate, on a four-per-beat grid so one pattern reads the same in 3/4 as in
            // 4/4. setTargetAtTime rather than a step, or every edge clicks.
            if (fx.gate && GATE_BY_ID[fx.gate]) {
              const pat = GATE_BY_ID[fx.gate].pat;
              const gsteps = barBeatsRef.current * 4;
              const gstep = Math.floor(i * gsteps / L);
              const open = pat[gstep % pat.length] === "x" ? 1 : 0;
              m.partGate[li].gain.setTargetAtTime(open, t, 0.004);
            } else if (m.partGate[li]) {
              // Turning the gate off has to re-open it. Without this, switching the menu back to
              // "off" while the gate happened to be shut would leave the node at zero and the part
              // silent for the rest of the session.
              m.partGate[li].gain.setTargetAtTime(1, t, 0.01);
            }
            if (fx.arp) playArp(fx, voice, li, ly.oct || 0, gain, ly.send || 0);
            else playLayer(ly.flat, voice, li, ly.oct || 0, gain, ly.send || 0);
          });
          const Nq = (sec.layers.find(ly => ly.flat.length) || { flat: [] }).flat.length;
          if (melStep != null) {
            const q = { sym, col: Nq ? (mb * MB + melStep) % Nq : 0 };
            setTimeout(() => setCurQ(q), Math.max(0, (t - m.ctx.currentTime) * 1000));
          }
        }
      }
      const delay = Math.max(0, (t - m.ctx.currentTime) * 1000);
      if (live && patStep != null) setTimeout(() => setCurStep(patStep), delay);   // playhead walks the strum pattern, not the ticks
      if (live && i === 0) setTimeout(() => { setCurBar(pillIdx); setCurLabel(label); setCurInst(instNow);
        setCurSongBar(structBar >= 0 ? structBar : (seq.length ? Math.floor(m.step / L) % seq.length : 0)); }, delay);
      m.step++; m.nextTime += tick;
  };
  const startMetro = fromBar => {
    stopMetro();
    const from = Number.isFinite(fromBar) ? fromBar : 0;
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    if (ctx.state === "suspended") ctx.resume();   // unlock inside the tap (iOS)
    const un = ctx.createOscillator(), ug = ctx.createGain();
    ug.gain.value = 0.0001; un.connect(ug).connect(ctx.destination);
    un.start(); un.stop(ctx.currentTime + 0.02);
    const m = buildGraph(ctx, from);
    m.timer = setInterval(() => {
      if (m.ctx.state === "suspended") m.ctx.resume();
      while (m.nextTime < m.ctx.currentTime + 0.1) emitTick(m, true);
    }, 20);
    metroRef.current = m;
    setPlaying(true);
  };
  // toggle a single-section loop: while on, all playback confines to this section and repeats.
  // Turning it on also starts playback from the section if nothing is playing.
  const toggleLoopSec = d => {
    const on = loopSec !== d.key;
    loopRef.current = on ? { from: d.startBar, len: d.nbars } : null;  // take effect on the very next tick
    setLoopSec(on ? d.key : null);
    if (on && !playing) startMetro(d.startBar);
  };

  /* ---- dice ---- */
  const rollDice = () => {
    const ids = Object.keys(PROGRESSIONS);
    const id = ids[Math.floor(Math.random() * ids.length)];
    const key = Math.floor(Math.random() * 12);
    setForce(id); setTonic(key); setGenre(null); setEmotion(null); setMode(null);
    setEdits({ key:"", map:{} }); setSelStruct(""); setSelSong("");
    const eKey = id + ":" + key, p = PROGRESSIONS[id];
    if (Math.random() < 0.6 && p.numerals.length > 1) {   // sprinkle one secondary dominant
      const nd = modeFamily(p.mode) === "minor" ? MINOR_NUM : MAJOR_NUM;
      const idx = 1 + Math.floor(Math.random() * (p.numerals.length - 1));
      const [off] = nd[p.numerals[idx]];
      setInserts({ key:eKey, list:[{ before:idx, root:((key + off + 7) % 12), quality:"dom",
        tag:"V/" + p.numerals[idx].replace(/7$/, "") }] });
    } else setInserts({ key:"", list:[] });
    const pats = Object.keys(PATTERNS).filter(k => beatsOf(PATTERNS[k]) === 4);   // 4/4 only, at either resolution
    setPatSel({ key:id, id: pats[Math.floor(Math.random() * pats.length)] });
  };

  /* ---- render the song to audio ----
     The same graph and the same per-tick emitter as live playback, run into an OfflineAudioContext
     as fast as the machine can manage — so what lands in the file is what you heard, not a second
     implementation that drifts from it. */
  const [rendering, setRendering] = useState(false);
  /* Render the whole song, or one stem of it, into an OfflineAudioContext.
     `stem` is null for the full mix, or { kind:"chords"|"drums"|"part", i } to isolate one
     source. Everything else — graph, tick emitter, tail — is shared, so a stem is the mix with
     the other sources muted rather than a separate rendering path. */
  // every real-sample voice this song reaches for
  const wantedVoices = () => {
    const w = new Set([instrRef.current]);
    Object.values(secMelos).forEach(sec => sec.layers.forEach(ly => {
      const v = ly.instr || melInstr; if (isGM(v)) w.add(v);
    }));
    if (isGM(melInstr)) w.add(melInstr);
    return w;
  };
  // give the sampler the same chance it gets live; if the samples aren't ready in time the render
  // falls back to the synth voices exactly as playback would
  const waitSamples = async sampler => {
    const wanted = wantedVoices();
    wanted.forEach(k => sampler.load(k));
    const until = Date.now() + 4000;
    while (Date.now() < until && ![...wanted].every(k => sampler.ready(k)))
      await new Promise(r => setTimeout(r, 100));
  };
  const renderOffline = async stem => {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const nBars = (structBars && structBars.length) ? structBars.length : Math.max(1, chords.length);
    const ticksPerBar = tickRef.current || 8;
    const secsPerBar = barBeats * 60 / effBpm;
    const TAIL = 3.5;                                  // let the reverb and delay ring out
    const rate = 44100;
    const ctx = new OAC(2, Math.ceil((nBars * secsPerBar + TAIL) * rate), rate);
    const m = buildGraph(ctx, 0, stem || null);
    m.nextTime = 0;                                    // offline starts at zero, no lookahead
    // give the sampler the same chance it gets live; if the samples aren't ready in time the
    // render falls back to the synth voices exactly as playback would
    if (realRef.current) await waitSamples(m.sampler);
    for (let n = 0; n < nBars * ticksPerBar; n++) emitTick(m, false);
    return ctx.startRendering();
  };
  const renderAudio = async () => {
    if (rendering) return;
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) { setIoNote("This browser cannot render audio."); return; }
    setRendering(true);
    setIoNote("Rendering…");
    try {
      const buf = await renderOffline(null);
      const peak = peakOf(buf);
      if (peak < 1e-4) { setIoNote("Rendered silence — add a drum pattern or a melody first."); return; }
      const bytes = audioBufferToWav(buf);
      const url = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
      const a = document.createElement("a");
      a.href = url; a.download = songFile("wav");
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setIoNote(`Rendered ${buf.duration.toFixed(1)}s · ${(bytes.length / 1048576).toFixed(1)} MB · peak ${(20 * Math.log10(peak)).toFixed(1)} dB.`);
    } catch (e) {
      setIoNote("Render failed in this browser — MIDI export still works.");
    } finally { setRendering(false); }
  };

  /* ---- stem export ----
     One wav per source — drums, chords, and each melody part — zipped into a single download.
     This is the handoff a DAW actually wants: drop the folder on the timeline and every source
     lands on its own track, already aligned, instead of one flattened mix you can't unpick.
     Each stem is rendered by muting the others, so they sum back to the mix bar for bar. */
  const [stemming, setStemming] = useState(false);
  const stemList = () => {
    const out = [];
    if (drumRef.current && drumRef.current.length) out.push({ kind:"drums", name:"drums" });
    if (chords.length) out.push({ kind:"chords", name:"chords-" + instr });
    // parts are per-section, so a part index counts if any section has notes on it
    const nParts = Math.max(0, ...Object.values(secMelos).map(s => nLayers(s)));
    for (let i = 0; i < nParts; i++) {
      const secs = Object.values(secMelos);
      if (!secs.some(s => s.layers[i] && s.layers[i].flat && s.layers[i].flat.length)) continue;
      const withNotes = secs.find(s => s.layers[i] && s.layers[i].flat && s.layers[i].flat.length);
      const voice = (withNotes.layers[i].instr) || melInstr;
      out.push({ kind:"part", i, name:"part-" + LAYER_NAMES[i] + "-" + voice });
    }
    return out;
  };
  const exportStems = async () => {
    if (stemming || rendering) return;
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) { setIoNote("This browser cannot render audio."); return; }
    const stems = stemList();
    if (!stems.length) { setIoNote("Nothing to bounce — add a drum pattern, chords or a melody first."); return; }
    setStemming(true);
    try {
      // Warm the sample cache once up front. Each render waits for samples on its own, but that
      // wait can time out on the first stem and succeed on the second — which would leave the
      // stems disagreeing about whether a part is a real instrument or its synth stand-in, and
      // they would no longer sum to the mix. One warm-up first, and they all see the same thing.
      if (realRef.current) {
        setIoNote("Loading instruments…");
        const warm = new OAC(1, 512, 44100);
        await waitSamples(makeSampler(warm));
      }
      const files = [];
      let silent = 0;
      for (let n = 0; n < stems.length; n++) {
        setIoNote(`Bouncing stem ${n + 1} of ${stems.length} — ${stems[n].name}…`);
        // sequential, not parallel: several full-length OfflineAudioContexts at once is how a
        // phone runs out of memory mid-export
        const buf = await renderOffline(stems[n]);
        if (peakOf(buf) < 1e-4) { silent++; continue; }   // a muted or empty source is not worth a file
        files.push({ name: String(n + 1).padStart(2, "0") + "-" + safeName(stems[n].name) + ".wav",
          bytes: audioBufferToWav(buf) });
      }
      if (!files.length) { setIoNote("Every stem rendered silent — check mutes and levels."); return; }
      const zip = makeZip(files);
      const url = URL.createObjectURL(new Blob([zip], { type: "application/zip" }));
      const a = document.createElement("a");
      a.href = url; a.download = songFile("stems.zip");
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setIoNote(`${files.length} stem${files.length === 1 ? "" : "s"} · ${(zip.length / 1048576).toFixed(1)} MB`
        + (silent ? ` · ${silent} silent, skipped` : "") + " — unzip and drop the lot onto a DAW timeline.");
    } catch (e) {
      setIoNote("Stem export failed in this browser — the single-file audio export still works.");
    } finally { setStemming(false); }
  };

  /* ---- exports ----
     Every file this app produces is going to land in a folder next to a dozen others, so its name
     has to say what it is: the sketch's name, its key and its tempo. "progression-wheel.mid" told
     you nothing an hour later. */
  const KEY_TAG = () => {
    const name = SEMI_NAME[((tonic % 12) + 12) % 12];
    return `${name}${MODES[effMode].family === "minor" ? "m" : ""} ${Math.round(effBpm)}bpm`;
  };
  const songFile = ext => `${safeName(sketchName.trim() || "progression-wheel")} ${KEY_TAG()}.${ext}`;
  const download = (bytes, type, ext) => {
    const url = URL.createObjectURL(new Blob([bytes], { type }));
    const a = document.createElement("a");
    a.href = url; a.download = songFile(ext);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  /* Everything both MIDI exports need: the bars, one column list per part, the per-bar drum
     pattern and the arrangement metadata. Pulled out of exportMidi so the per-part files are the
     same notes as the single file rather than a second implementation of them. */
  const midiParts = () => {
      const bars = (structBars && structBars.length) ? structBars : chords.map(c => ({ chord:c }));
      // flatten the per-section melody grids into eighth-columns aligned to `bars`
      const melBase = (tonic > 6 ? 60 : 72) + tonic;
      const loopSec = secMelos.L1 || Object.values(secMelos)[0];
      // one column list per melody part, each destined for its own MIDI channel
      const nParts = Math.max(1, ...Object.values(secMelos).map(s => nLayers(s)));
      const partCols = Array.from({ length: nParts }, () => []);
      bars.forEach((b, bi) => {
        const secm = b.inst != null ? secMelos[b.inst] : loopSec;
        const nb = (secm && secm.layers[0] && secm.layers[0].bars.length) || 1;
        const bi2 = b.inst != null ? b.mb : bi % nb;
        for (let p = 0; p < nParts; p++) {
          const ly = secm && secm.layers[p];
          const barCols = ly && !ly.mute ? ly.bars[bi2] : null;   // a muted part exports silent
          const oct = (ly && ly.oct) || 0;
          for (let c = 0; c < meloBeats; c++)
            partCols[p].push(((barCols && barCols[c]) || []).map(d => melBase + 12 * oct + scaleSemis[d]));
        }
      });
      // per-bar drum pattern: a section's own kit if it set one, else the global choice
      const drumForBar = bi => {
        const b = bars[bi];
        const id = (b && b.base != null && secDrum[b.base]) || drum;
        return DRUMS[id] ? DRUMS[id].pattern : null;
      };
      const anyDrum = bars.some((_, i) => drumForBar(i));
      const used = partCols.map(cols => cols.some(c => c.length));
      const nUsed = used.filter(Boolean).length;
      // each part carries its own instrument and level into the file, so a DAW opens the
      // arrangement voiced and roughly balanced instead of every track landing on piano
      const partOf = p => {
        for (const sec of Object.values(secMelos)) { const ly = sec.layers[p]; if (ly) return ly; }
        return null;
      };
      const parts = partCols.map((cols, p) => {
        if (!used[p]) return null;
        const ly = partOf(p) || {};
        return { cols, program: programOf(ly.instr || melInstr),
          gain: ly.vol == null ? 1 : ly.vol };
      });
      // What a DAW needs to lay the file out: the meter, the key, and where each section starts.
      // MAJOR_SIG is indexed by the *relative major* of the current mode, which is what a key
      // signature actually spells — so a Dorian sketch gets the right accidentals, not the tonic's.
      const rel = (tonic + MODES[effMode].rel) % 12;
      const mtr = METER_BY_ID[curMeter] || METERS[0];
      const meta = {
        beatUnit: mtr.den, tsNum: mtr.num,
        sharps: MAJOR_SIG[((rel % 12) + 12) % 12],
        minor: MODES[effMode].family === "minor",
        // one marker per section instance, at the bar it begins
        markers: bars.reduce((out, b, bi) => {
          const name = b.sec || b.word;
          if (b.inst == null || b.mb !== 0 || !name) return out;
          if (out.length && out[out.length - 1].name === name) return out;    // same section, next pass
          out.push({ bar: bi, name });
          return out;
        }, []),
      };
      return { bars, parts, drumForBar, meta, anyDrum, nUsed, partOf };
  };
  const exportMidi = () => {
    try {
      const { bars, parts, drumForBar, meta, anyDrum, nUsed } = midiParts();
      download(midiBytes(effBpm, barBeats, bars, drumForBar, parts, kit, meloSub, programOf(instr), meta),
        "audio/midi", "mid");
      setIoNote("MIDI exported — chords" + (anyDrum ? " + drums" : "")
        + (nUsed ? ` + ${nUsed} melody part${nUsed === 1 ? "" : "s"}` : "") + " at " + effBpm + " bpm.");
    } catch (e) { setIoNote("Export failed in this viewer — try on desktop."); }
  };

  /* A chord chart, as plain text. MIDI is for a DAW and a wav is for listening; this is for handing
     to somebody who plays an instrument, or pasting into a message. Sections are grouped the way the
     arrangement strip groups them, because "Chorus x2" is how you would say it out loud. */
  const chartText = () => {
    const out = [];
    out.push(sketchName.trim() || "Untitled sketch");
    out.push(`${SEMI_NAME[((tonic % 12) + 12) % 12]} ${MODES[effMode].short} · ${Math.round(effBpm)} bpm · ${curMeter}`);
    if (structSel) out.push(`Form: ${structSel.st.name}${customPlan ? " (edited)" : ""}`);
    out.push("");
    const runs = [];
    sections.insts.forEach(d => {
      const r = runs[runs.length - 1];
      if (r && r.row === d.row) { r.n++; }
      else runs.push({ row: d.row, sec: d.sec, n: 1, cs: d.cs, nbars: d.nbars, note: d.note });
    });
    let bar = 1;
    for (const r of runs) {
      const total = r.nbars * r.n;
      out.push(`${r.sec.toUpperCase()}${r.n > 1 ? ` ×${r.n}` : ""}  (${total} bar${total === 1 ? "" : "s"}, from bar ${bar})`);
      out.push("| " + r.cs.map(c => c.name).join(" | ") + " |");
      if (r.note) out.push(`  — ${r.note}`);
      out.push("");
      bar += total;
    }
    out.push(`${bar - 1} bars · about ${Math.round((bar - 1) * barBeats * 60 / effBpm)} seconds`);
    return out.join("\n");
  };
  const exportChart = () => {
    try {
      download(new TextEncoder().encode(chartText()), "text/plain", "txt");
      setIoNote("Chord chart saved — plain text, ready to print or paste.");
    } catch (e) { setIoNote("Could not write the chord chart in this viewer."); }
  };
  const copyChart = async () => {
    try { await navigator.clipboard.writeText(chartText()); setIoNote("Chord chart copied to the clipboard."); }
    catch (e) { setIoNote("Clipboard blocked here — use ↓ Chart to save it as a file instead."); }
  };

  /* One MIDI file per source, zipped. A single multi-track file is the right thing for a DAW that
     imports them properly; plenty do not, and plenty of people would rather drag one part onto one
     track than untangle a merged import. Each file keeps the tempo map and the section markers, so
     it lands at the right speed with the arrangement marked however it is brought in. */
  const exportMidiSplit = () => {
    try {
      const { bars, parts, drumForBar, meta, anyDrum, partOf } = midiParts();
      const files = [];
      const add = (label, bytes) => files.push({ name: `${String(files.length + 1).padStart(2, "0")}-${safeName(label)}.mid`, bytes });
      add("chords-" + gmKey(instr),
        midiBytes(effBpm, barBeats, bars, () => null, [], kit, meloSub, programOf(instr), meta));
      if (anyDrum)
        add("drums-" + kit,
          midiBytes(effBpm, barBeats, bars, drumForBar, [], kit, meloSub, null, { ...meta, skipChords: true }));
      parts.forEach((part, p) => {
        if (!part) return;
        // one part per file, but kept on its own channel so several files opened together do not
        // all pile onto channel 1
        const only = parts.map((x, i) => (i === p ? x : null));
        add(`part-${LAYER_NAMES[p]}-${gmKey((partOf(p) || {}).instr || melInstr)}`,
          midiBytes(effBpm, barBeats, bars, () => null, only, kit, meloSub, null, { ...meta, skipChords: true }));
      });
      const zip = makeZip(files);
      download(zip, "application/zip", "midi.zip");
      setIoNote(`${files.length} MIDI file${files.length === 1 ? "" : "s"} · ${(zip.length / 1024).toFixed(0)} kB — one per track, each with the tempo and section markers.`);
    } catch (e) { setIoNote("Split MIDI export failed in this viewer — the single file still works."); }
  };

  /* ---- melody import (a hummed/played line from the Tune Transcriber, a MIDI file, or the
         in-app recorder) ---- */
  // events: [{ midi, startE, durE }] positioned in eighth-notes. Writes them onto the chosen
  // section's melody grid (falling back to the first), snapping each pitch to the nearest scale
  // degree. targetKey defaults to the import-target picker; verb tunes the status wording.
  const applyImportedMelody = (events, targetKey, verb = "Imported") => {
    const wantKey = targetKey || impSec;
    const sec = sections.insts.find(s => s.key === wantKey) || sections.insts[0];
    if (!sec) { setIoNote("Add a progression first, then import a melody."); return; }
    if (!events || !events.length) {
      setIoNote(verb === "Recorded"
        ? "No clear notes found — play single notes close to the mic, letting each ring."
        : "No melody notes found in that file.");
      return;
    }
    const nBars = sec.cs.length, totalCols = nBars * meloBeats;
    const bars = blankBars(nBars, meloBeats);
    const degOf = midi => {                                // nearest scale degree (0..len-1)
      const pc = ((midi % 12) + 12) % 12;
      let best = 0, bd = 99;
      scaleNotes.forEach((sn, i) => {
        const dist = Math.min((sn - pc + 12) % 12, (pc - sn + 12) % 12);
        if (dist < bd) { bd = dist; best = i; }
      });
      return best;
    };
    let placed = 0, dropped = 0;
    // imported and recorded lines are quantised to eighths; on a finer grid one eighth is more
    // than one column, so stretch them rather than letting the tune play back at double speed
    const scale = meloSub / 2;
    events.forEach(ev => {
      const deg = degOf(ev.midi);
      const startE = Math.round(ev.startE * scale), durE = Math.max(1, Math.round(ev.durE * scale));
      for (let c = startE; c < startE + durE; c++) {
        if (c >= totalCols) { dropped++; break; }
        bars[Math.floor(c / meloBeats)][c % meloBeats] = [deg];  // monophonic
        if (c === startE) placed++;
      }
    });
    putSec(sec.key, { bars });                            // preserves the 2nd layer + instrument choices
    setOpenSecs(o => ({ ...o, [sec.key]: true }));
    setIoNote(`${verb} ${placed} note${placed === 1 ? "" : "s"} onto ${sec.key} (${sec.word})`
      + (dropped ? ` — ${dropped} ran past the section and were dropped.` : ". Snapped to the key; tidy on the grid below."));
  };
  const importMidiFile = async e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try { applyImportedMelody(parseMidiMelody(await file.arrayBuffer())); }
    catch (err) { setIoNote("Couldn't read that MIDI file."); }
  };
  const loadHummedMelody = () => {
    try {
      const raw = hasLocal && window.localStorage.getItem("pw-transcribed-melody");
      if (!raw) { setIoNote("Nothing waiting — record a tune in the Tune Transcriber and press “Send to Progression Wheel” first."); return; }
      const d = JSON.parse(raw);
      const U = d.U || 2;
      const events = (d.notes || []).map(n => ({
        midi: n.midi,
        startE: Math.round((n.startU / U) * 2),
        durE: Math.max(1, Math.round((n.durU / U) * 2)),
      }));
      applyImportedMelody(events);
    } catch (e) { setIoNote("Couldn't read the hummed melody hand-off."); }
  };

  /* ---- in-app recorder: capture a guitar/voice line straight onto a section's grid ---- */
  const startSecRec = async secKey => {
    if (recSec) return;                                   // one recording at a time
    setIoNote(null);
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      if (ctx.state === "suspended") await ctx.resume();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const src = ctx.createMediaStreamSource(stream);
      // ScriptProcessor.onaudioprocess runs on the MAIN thread; a big buffer + a lightweight monitor
      // (below) keep it from being starved by React renders, which would drop input and record only
      // intermittently. The callback does nothing but copy the samples out.
      const node = ctx.createScriptProcessor(8192, 1, 1);
      const analyser = ctx.createAnalyser(); analyser.fftSize = 2048;
      const chunks = [];
      node.onaudioprocess = e => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      src.connect(analyser); src.connect(node); node.connect(ctx.destination);
      const prof = REC_SOURCES[recSource] || REC_SOURCES.guitar;
      const buf = new Float32Array(analyser.fftSize);
      // live meter + pitch readout at ~10 Hz (NOT per animation frame) — full pitch detection is
      // expensive, and running it 60×/s here was stealing CPU from the audio capture callback.
      const monitor = setInterval(() => {
        analyser.getFloatTimeDomainData(buf);
        let rms = 0; for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
        setRecLevel(Math.min(1, Math.sqrt(rms / buf.length) * 6));
        const p = recDetectPitch(buf, ctx.sampleRate, prof);
        setRecHz(p ? p.hz : null);
      }, 100);
      recRef.current = { ctx, stream, node, src, analyser, chunks, monitor };
      setRecSec(secKey);
    } catch (err) {
      setIoNote("Microphone unavailable — check permissions, or use the Tune Transcriber / ↑ MIDI instead.");
    }
  };
  const stopSecRec = () => {
    const r = recRef.current; if (!r) { setRecSec(null); return; }
    const secKey = recSec;
    clearInterval(r.monitor);
    try { r.node.disconnect(); r.src.disconnect(); r.node.onaudioprocess = null; } catch (e) {}
    try { r.stream.getTracks().forEach(t => t.stop()); } catch (e) {}
    const sr = r.ctx.sampleRate;
    const total = r.chunks.reduce((a, c) => a + c.length, 0);
    const samples = new Float32Array(total);
    let o = 0; for (const c of r.chunks) { samples.set(c, o); o += c.length; }
    try { r.ctx.close(); } catch (e) {}
    recRef.current = null;
    setRecSec(null); setRecLevel(0); setRecHz(null);
    const prof = REC_SOURCES[recSource] || REC_SOURCES.guitar;
    const events = recToEvents(recTrackNotes(samples, sr, prof));
    applyImportedMelody(events, secKey, "Recorded");
  };
  // stop any live recording if the component unmounts
  useEffect(() => () => { const r = recRef.current; if (r) {
    try { clearInterval(r.monitor); r.node.disconnect(); r.src.disconnect();
      r.stream.getTracks().forEach(t => t.stop()); r.ctx.close(); } catch (e) {}
    recRef.current = null;
  } }, []);

  /* ---- sketches (persistent, via window.storage) ---- */
  const hasStore = typeof window !== "undefined" && window.storage;
  const hasLocal = typeof window !== "undefined" && (() => { try { return !!window.localStorage; } catch (e) { return false; } })();
  const loadSketches = async () => {
    try {
      if (hasStore) { const r = await window.storage.get("pw-sketches"); setSketches(r ? JSON.parse(r.value) : []); return; }
      if (hasLocal) { const r = window.localStorage.getItem("pw-sketches"); setSketches(r ? JSON.parse(r) : []); return; }
    } catch (e) {}
    setSketches([]);
  };
  useEffect(() => { loadSketches(); }, []);   // eslint-disable-line
  // warm the sample cache for the chosen instrument + melody voice so the first Play is instant
  useEffect(() => { if (realSounds) sfPrefetch(instr); }, [instr, realSounds]);
  useEffect(() => { if (realSounds && isGM(melInstr)) sfPrefetch(melInstr); }, [melInstr, realSounds]);
  // one document for both a saved sketch and a shared link — so anything that survives a save
  // survives a link, and neither can silently drop a field the other keeps
  const songDoc = name => makeSong({
    name, progId, tonic, genre, emotion, mode, colour, patId, drum, secDrum, secQuiet, custom, auto, nChords, instr, melInstr,
    kit, pump, secMove, delayId, bpm: effBpm, selStruct, contrast,
    edits: ovMap, inserts: insList, quals: qmap, removed: remList,
    order: order.key === editKey ? order.list : null,
    melos: melos.progId === progId ? melos : null,
  });
  /* ---- undo / redo ----
     One snapshot of the song document per change, taken from a debounced effect rather than at
     every call site, so no edit path can forget to record itself. Restoring sets a flag the
     recorder checks, so replaying history doesn't itself become history. */
  const UNDO_DEPTH = 60;
  const docJson = useMemo(() => {
    try { return JSON.stringify(songDoc("")); } catch (e) { return null; }
  }, [progId, tonic, genre, emotion, mode, colour, patId, drum, secDrum, secQuiet, custom, auto, nChords, instr, melInstr,
      kit, pump, secMove, delayId, effBpm, selStruct, contrast, ovMap, insList, qmap, remList, order, melos]);
  const lastDocRef = useRef(null);
  useEffect(() => {
    if (docJson == null) return;
    if (lastDocRef.current === null) { lastDocRef.current = docJson; return; }   // first render is the baseline
    if (docJson === lastDocRef.current) return;
    const prev = lastDocRef.current;
    lastDocRef.current = docJson;
    if (restoringRef.current) { restoringRef.current = false; return; }
    setPast(p => [...p.slice(-(UNDO_DEPTH - 1)), prev]);
    setFuture([]);                                     // a fresh edit ends the redo branch
  }, [docJson]);
  const restoreDoc = json => {
    try {
      const doc = JSON.parse(json);
      restoringRef.current = true;
      lastDocRef.current = json;
      loadSketch({ ...doc, name: doc.name || "" });
    } catch (e) { setIoNote("Could not undo that step."); }
  };
  const undo = () => {
    setPast(p => {
      if (!p.length) return p;
      setFuture(f => [docJson, ...f].slice(0, UNDO_DEPTH));
      restoreDoc(p[p.length - 1]);
      return p.slice(0, -1);
    });
  };
  const redo = () => {
    setFuture(f => {
      if (!f.length) return f;
      setPast(p => [...p.slice(-(UNDO_DEPTH - 1)), docJson]);
      restoreDoc(f[0]);
      return f.slice(1);
    });
  };
  /* Keyboard. Undo/redo on Cmd/Ctrl-Z, and the handful of transport keys you reach for without
     looking: space to start and stop, escape to stop, brackets to nudge the tempo. Every one is
     skipped while the caret is in a text box, or typing a sketch name would toggle playback. */
  const SHORTCUTS = [
    ["Space", "play / stop"], ["Esc", "stop"], ["[  ]", "tempo −/+ 1"],
    ["⇧[  ⇧]", "tempo −/+ 5"], ["⌘Z / ⌘⇧Z", "undo / redo"],
  ];
  useEffect(() => {
    const onKey = e => {
      const el = e.target;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === "Space" || e.key === " ") { e.preventDefault(); playing ? stopMetro() : startMetro(0); return; }
      if (e.key === "Escape") { if (playing) { e.preventDefault(); stopMetro(); } return; }
      if (e.key === "[" || e.key === "{") { e.preventDefault(); nudgeBpm(e.shiftKey ? -5 : -1); return; }
      if (e.key === "]" || e.key === "}") { e.preventDefault(); nudgeBpm(e.shiftKey ? 5 : 1); return; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* Tap tempo. Averages the gaps between taps rather than using the last one, so a single shaky tap
     does not throw the answer; a pause longer than a slow bar starts a fresh count. */
  const tapRef = useRef([]);
  const [tapN, setTapN] = useState(0);
  const tapTempo = () => {
    const now = (typeof performance !== "undefined" ? performance.now() : 0);
    const t = tapRef.current;
    if (t.length && now - t[t.length - 1] > 2500) t.length = 0;   // too long a gap — a new count
    t.push(now);
    if (t.length > 8) t.shift();
    setTapN(t.length);
    if (t.length < 2) { setIoNote("Keep tapping — two more and it will have the tempo."); return; }
    const gaps = t.slice(1).map((x, i) => x - t[i]);
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    if (!(avg > 0)) return;
    const bpm = Math.max(40, Math.min(220, Math.round(60000 / avg)));
    setBpmSt({ key: progId, val: bpm });
    setIoNote(`Tapped ${bpm} bpm${t.length < 4 ? " — keep going for a steadier reading" : ""}.`);
  };
  /* ---- autosave ----
     A sketchpad that loses your work when the tab closes is not a sketchpad. The working document
     is written to its own key, separately from the named sketch list, and restored on the next
     visit. A shared link always wins — arriving at somebody else's song and being handed your own
     instead would be the worst possible behaviour. */
  const AUTOKEY = "pw-autosave";
  const putStore = async (k, v) => {
    try {
      if (hasStore) await window.storage.set(k, v);
      else if (hasLocal) window.localStorage.setItem(k, v);
    } catch (e) {}
  };
  const getStore = async k => {
    try {
      if (hasStore) { const r = await window.storage.get(k); return r ? r.value : null; }
      if (hasLocal) return window.localStorage.getItem(k);
    } catch (e) {}
    return null;
  };
  const autoReadyRef = useRef(false);
  useEffect(() => {
    (async () => {
      // a link in the address bar is somebody else's song and takes precedence over the restore
      const linked = typeof location !== "undefined" && (location.hash || "").length > 2;
      if (!linked) {
        const saved = await getStore(AUTOKEY);
        if (saved) {
          try { restoreDoc(saved); setIoNote("Picked up where you left off."); }
          catch (e) {}
        }
      }
      autoReadyRef.current = true;      // only start writing after any restore, or we save the blank
    })();
  }, []);   // eslint-disable-line
  useEffect(() => {
    if (!autoReadyRef.current || !docJson) return;
    const id = setTimeout(() => putStore(AUTOKEY, docJson), 1200);
    return () => clearTimeout(id);
  }, [docJson]);   // eslint-disable-line

  /* ---- A / B ----
     Two versions of the same idea, one keystroke apart. The inactive one is stashed as a document;
     swapping writes the current state into the stash and restores what was there, so you can take
     a sketch in two directions and flip between them without saving either. */
  const [abSlot, setAbSlot] = useState("A");
  const [abStash, setAbStash] = useState(null);
  const swapAB = () => {
    if (!docJson) return;
    if (!abStash) {
      // B starts as a copy of A — you diverge from here, rather than from nothing
      setAbStash(docJson); setAbSlot("B");
      setIoNote("B started as a copy of A. Change it, then ⇄ to compare the two.");
      return;
    }
    const here = docJson;
    restoreDoc(abStash);
    setAbStash(here);
    setAbSlot(x => (x === "A" ? "B" : "A"));
  };

  const saveSketch = async () => {
    const name = sketchName.trim() || keyLabel + " · " + prog.label;
    const s = songDoc(name);
    const list = [...(sketches || []).filter(x => x.name !== name), s];
    setSketches(list); setSketchName("");
    try {
      if (hasStore) await window.storage.set("pw-sketches", JSON.stringify(list));
      else if (hasLocal) window.localStorage.setItem("pw-sketches", JSON.stringify(list));
      setIoNote((hasStore || hasLocal) ? "Saved “" + name + "”." : "Saved for this session only.");
    } catch (e) { setIoNote("Saved for this session only."); }
  };
  /* ---- shareable link ----
     The same document, deflated into the URL hash. Opening the link rebuilds the song exactly,
     including every melody part — which is what makes "here, listen to this" possible at all. */
  const shareSong = async () => {
    try {
      const code = await encodeSong(songDoc(sketchName.trim() || keyLabel + " · " + prog.label));
      const url = location.origin + location.pathname + "#s=" + code;
      let copied = false;
      try { await navigator.clipboard.writeText(url); copied = true; } catch (e) {}
      if (!copied) {                                   // clipboard blocked (http, or denied)
        try { history.replaceState(null, "", "#s=" + code); } catch (e) {}
        setIoNote("Link is in the address bar — copy it from there.");
        return;
      }
      try { history.replaceState(null, "", "#s=" + code); } catch (e) {}
      setIoNote(`Link copied — ${(url.length / 1024).toFixed(1)} kB, melodies included.`);
    } catch (e) { setIoNote("Could not build a link in this browser."); }
  };
  // a song in the address bar wins over anything else on first load
  useEffect(() => {
    const m = (typeof location !== "undefined" ? location.hash : "").match(/[#&]s=([^&]+)/);
    if (!m) return;
    let live = true;
    decodeSong(m[1]).then(doc => {
      if (!live) return;
      if (doc) { loadSketch({ ...doc, name: doc.name || "shared song" }); setIoNote("Opened a shared song."); }
      else setIoNote("That link could not be read.");
    });
    return () => { live = false; };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const loadSketch = s => {
    setForce(s.progId); setTonic(s.tonic); setGenre(s.genre); setEmotion(s.emotion); setMode(s.mode || null);
    setColour(s.colour || "triads"); setInstr(s.instr); setSecDrum(s.secDrum || {}); setSecQuiet(s.secQuiet || {}); setCustom(s.custom || { key:"", plan:null }); setAuto(s.auto || { key:"", filter:null, level:null });
    setSecMove(s.secMove || {});
    setDelaySt({ key:s.progId, val:s.delayId || "off" });                          // absent in sketches saved before moves existed
    setPatSel({ key:s.progId, id:s.patId }); setBpmSt({ key:s.progId, val:s.bpm });
    setNChordsSt({ key:s.progId, val:s.nChords || 0 });
    // older sketches predate the kit/pump fields — fall back to the pre-dance defaults so they
    // reload sounding exactly as they were saved
    setDrumSt({ key:s.progId, val:s.drum || "off" });
    setKitSt({ key:s.progId, val:s.kit || "acoustic" });
    setPumpSt({ key:s.progId, val:s.pump || "off" });
    setSelStruct(s.selStruct || ""); setContrast(s.contrast || { id:"", sec:"C" });
    const eKey = s.progId + ":" + s.tonic;
    setEdits({ key:eKey, map:s.edits || {} }); setInserts({ key:eKey, list:s.inserts || [] });
    setQuals({ key:eKey, map:s.quals || {} }); setRemoved({ key:eKey, list:s.removed || [] });
    setOrder(s.order ? { key:eKey, list:s.order } : { key:"", list:null }); setPillSel([]);
    if (s.melInstr) setMelInstr(s.melInstr);
    // melodies were session-only before this; a sketch without them just loads an empty grid
    setMelos(s.melos ? songMelos(s) : { progId:"", secs:{} });
    setMelSel({ key:"", layer:0, notes:{} }); setNarUndo(null);
    setIoNote("Loaded “" + s.name + "”.");
  };

  /* ---- svg pieces ---- */
  const dimLabels = [];
  for (let p = 0; p < 12; p++) {
    const M = slotXY(p, R_MAJ), m = slotXY(p, R_MIN), maj = POS_MAJ[p], min = (maj + 9) % 12;
    dimLabels.push(
      <text key={"M"+p} x={M.x} y={M.y+5} textAnchor="middle" className="dimlbl">{spell(maj, tonic, effMode)}</text>,
      <text key={"m"+p} x={m.x} y={m.y+4} textAnchor="middle" className="dimlbl sm">{spell(min, tonic, effMode)}m</text>
    );
  }
  const pathSegs = chords.slice(0, -1).map((c, i) => {
    if (c.name === chords[i+1].name) return null;
    const d = curve(nodeXY(c.root, c.quality), nodeXY(chords[i+1].root, chords[i+1].quality), 0.30 + (i % 3) * 0.05);
    return <path key={"seg"+i} d={d} className="progpath" markerEnd="url(#arrCream)" style={{ animationDelay: `${i * 0.12}s` }} />;
  });
  const svgKey = progId + "-" + tonic + "-" + Object.keys(ovMap).length + "-" + insList.length + (showPar?"p":"") + (showSec?"s":"");

  return (
    <div className="pw-root">
      <style>{`
        /* ---- design tokens ----
           Seventeen font sizes, fifteen corner radii and forty-five near-identical greys is what
           "not quite designed" looks like at close range. These are the whole palette: everything
           below refers to them, so a change happens once rather than in thirty places. The accent
           hues stay separate because they mean something — gold is the app, green is the tonic,
           coral is the dominant. */
        :root {
          --fs-micro:9.5px; --fs-xs:10px; --fs-sm:11px; --fs-md:12.5px;
          --fs-lg:13px; --fs-xl:14px; --fs-xxl:17px; --fs-display:21px;
          --r-xs:3px; --r-sm:6px; --r-md:9px; --r-lg:12px; --r-xl:16px; --r-pill:999px;
          --bg:#10151D; --sunk:#0C1119; --surface:#171E28; --surface-2:#141C27;
          --raised:#1A222E; --hover:#1B2431;
          --line:#232C3A; --line-2:#2A3442; --line-3:#3A4658; --line-4:#4A5668;
          --ink:#EDE7DA; --ink-serif:#EAE2CC; --text:#C9D2DE; --muted:#8B94A3; --muted-2:#5C6675;
          --green:#54B79D; --coral:#E06A55; --blue:#6EA8FF;
        }
        /* Keyboard focus was invisible everywhere, which is both an accessibility failure and the
           thing that most makes an interface read as unfinished. :focus-visible only, so a mouse
           click does not leave a ring behind it. */
        :where(button, select, input, [tabindex]):focus-visible {
          outline:2px solid ${GOLD}; outline-offset:2px; border-radius:var(--r-sm);
        }
        .tlcell:focus-visible, .tlsec:focus-visible { outline-offset:-2px; }

        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,650&family=Archivo:wght@400;500;600;700&display=swap');
        .pw-root { min-height:100vh; background:var(--bg); color:var(--ink); font-family:'Archivo',system-ui,sans-serif; padding:20px 14px 48px; display:flex; flex-direction:column; align-items:center; }
        .wrap { width:100%; max-width:720px; }
        h1 { font-family:'Fraunces',serif; font-weight:650; font-size:clamp(26px,5vw,36px); margin:0; letter-spacing:.01em; }
        .eyebrow { font-size:var(--fs-sm); letter-spacing:.22em; text-transform:uppercase; color:var(--muted); margin-bottom:6px; }
        .sub { color:var(--muted); font-size:var(--fs-xl); margin:6px 0 18px; line-height:1.45; }
        .hdr { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
        .hdr .tog { margin-top:6px; }
        .panel { background:var(--surface); border:1px solid var(--line); border-radius:var(--r-xl); padding:14px; margin-bottom:14px; }
        .panel.accent { background:var(--hover); border-color:var(--line-3); box-shadow:0 1px 0 rgba(255,255,255,.03) inset, 0 4px 18px rgba(0,0,0,.22); }
        .toptransport { position:sticky; top:0; z-index:6; display:flex; align-items:center; gap:12px; flex-wrap:wrap;
          background:rgba(16,21,29,.9); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
          border:1px solid var(--line); border-radius:var(--r-lg); padding:10px 12px; margin-bottom:14px; }
        .playbtn { background:${GOLD}; color:#1A130A; border:none; border-radius:var(--r-lg); padding:10px 22px; font-size:var(--fs-xl);
          font-weight:700; font-family:inherit; cursor:pointer; letter-spacing:.01em; box-shadow:0 2px 10px rgba(229,181,84,.28); }
        .playbtn:hover { filter:brightness(1.06); }
        .playbtn.on { background:var(--coral); color:#2A0F0B; box-shadow:0 2px 10px rgba(224,106,85,.3); }
        .tplabel { font-size:var(--fs-lg); color:${GOLD}; font-weight:600; }
        .tplabel.dim { color:var(--muted); font-weight:500; }
        .btn.on { border-color:var(--coral); color:#F2B8AC; }
        .row { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
        .lbl { font-size:var(--fs-sm); letter-spacing:.14em; text-transform:uppercase; color:var(--muted); margin:8px 0 6px; }
        select { background:var(--bg); color:var(--ink); border:1px solid var(--line-2); border-radius:var(--r-md); padding:8px 10px; font-family:inherit; font-size:var(--fs-xl); max-width:100%; }
        .selrow { display:flex; gap:10px; }
        .selwrap { display:flex; flex-direction:column; gap:5px; flex:1; min-width:0; }
        .selwrap select { width:100%; }
        .btn { background:transparent; border:1px solid var(--line-4); color:var(--ink); border-radius:var(--r-md); padding:8px 14px; font-size:var(--fs-lg); cursor:pointer; font-family:inherit; font-weight:500; }
        .btn:hover { border-color:var(--ink-serif); }
        .mini { background:transparent; border:1px solid var(--line-4); color:var(--ink); border-radius:var(--r-sm); padding:2px 9px; font-size:var(--fs-md); cursor:pointer; font-family:inherit; margin-left:4px; }
        .mini:hover { border-color:var(--ink-serif); }
        .seg { display:inline-flex; border:1px solid var(--line-2); border-radius:var(--r-md); overflow:hidden; }
        .seg button { background:var(--bg); color:var(--muted); border:none; padding:6px 11px; font-family:inherit; font-size:var(--fs-md); cursor:pointer; }
        .seg button.on { background:var(--ink-serif); color:var(--surface); font-weight:600; }
        .txt { background:var(--bg); color:var(--ink); border:1px solid var(--line-2); border-radius:var(--r-md); padding:8px 10px; font-family:inherit; font-size:var(--fs-xl); flex:1; min-width:110px; }
        .tog { display:flex; align-items:center; gap:7px; font-size:var(--fs-lg); color:var(--text); cursor:pointer; user-select:none; }
        .tog .sw { width:34px; height:19px; border-radius:var(--r-pill); background:var(--line-2); position:relative; transition:background .15s; flex:none; }
        .tog .sw::after { content:''; position:absolute; top:2.5px; left:3px; width:14px; height:14px; border-radius:50%; background:var(--muted); transition:all .15s; }
        .tog.on .sw::after { left:17px; background:var(--ink); }
        .tog.lav.on .sw { background:#4A3F8A; } .tog.lav.on .sw::after { background:${LAV}; }
        .tog.gold.on .sw { background:#6B5320; } .tog.gold.on .sw::after { background:${GOLD}; }
        svg { max-width:100%; height:auto; display:block; }
        /* The wheel is a diagram, not a canvas: at full column width it rendered 708px tall, most
           of it the empty middle of a circle. Capped and centred instead, with the in-diagram text
           sized up to compensate so nothing is harder to read at the smaller size. */
        .wheelsvg { width:100%; max-width:500px; display:block; margin:0 auto; }
        .dimlbl { fill:var(--muted-2); font-size:var(--fs-xxl); font-family:'Archivo'; font-weight:500; }
        .dimlbl.sm { font-size:var(--fs-xl); }
        .progpath { fill:none; stroke:${PATH}; stroke-width:2.6; opacity:.92; stroke-dasharray:600; stroke-dashoffset:600; animation:draw .7s ease forwards; }
        @keyframes draw { to { stroke-dashoffset:0; } }
        .parline { fill:none; stroke:${LAV}; stroke-width:1.8; stroke-dasharray:5 5; opacity:.85; }
        .secline { fill:none; stroke:${GOLD}; stroke-width:2; stroke-dasharray:2.5 4; opacity:.95; }
        .hint { font-size:var(--fs-md); color:var(--muted); padding:6px 10px 0; }
        .hint b { color:var(--ink); }
        .stripline { display:flex; flex-wrap:wrap; align-items:center; gap:7px 10px; padding:8px 10px 4px; }
        .strippills { display:inline-flex; flex-wrap:wrap; gap:6px; }
        .pill { border-radius:var(--r-md); padding:3px 9px; font-size:var(--fs-lg); font-weight:700; line-height:1.3; cursor:pointer; }
        .pill.pillon { outline:2px dashed #FFFFFF; outline-offset:2px; }
        .pill.pillplay { outline:2px solid ${GOLD}; outline-offset:2px; }
        .pill.pillout { box-shadow: inset 0 0 0 1.5px ${GOLD}; }
        .pill .outmark { color:${GOLD}; font-size:var(--fs-xs); vertical-align:super; margin-left:2px; -webkit-text-stroke:0.4px var(--bg); }
        .pill.pillsel { outline:2px solid var(--blue); outline-offset:2px; box-shadow:0 0 0 4px rgba(110,168,255,.18); }
        .mini.miniOn { border-color:var(--blue); color:#BcD6FF; }
        .mini:disabled { opacity:.4; cursor:default; }
        .reorderbar { display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:2px 10px 6px; }
        .reorderbar .rlbl { font-size:var(--fs-md); color:var(--muted); margin-right:2px; }
        .scorewrap { overflow-x:auto; background:var(--sunk); border:1px solid var(--line); border-radius:var(--r-lg); padding:12px 8px; margin:4px 10px 6px; }
        .scorewrap svg { display:block; }
        .scoreempty { font-size:var(--fs-md); color:var(--muted); padding:8px 10px; }
        .pill i { font-style:normal; font-weight:600; font-size:var(--fs-xs); opacity:.65; margin-right:4px; }
        .fingcard { margin:10px 10px 4px; padding:10px 12px; background:var(--bg); border:1px solid var(--line-2); border-radius:var(--r-lg); }
        .verrow { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin:9px 0 5px; }
        .verlbl { font-size:var(--fs-sm); letter-spacing:.14em; text-transform:uppercase; color:var(--muted); margin-right:2px; }
        .verbtn { background:transparent; border:1px solid var(--line-4); color:var(--ink); border-radius:var(--r-md); padding:3px 10px; font-size:var(--fs-md); cursor:pointer; font-family:inherit; }
        .verbtn:hover { border-color:var(--ink-serif); }
        .verbtn.on { background:var(--ink-serif); color:var(--surface); font-weight:600; border-color:var(--ink-serif); }
        .versel { background:var(--surface); border:1px solid var(--line-4); color:var(--ink); border-radius:var(--r-md); padding:4px 8px; font-size:var(--fs-lg); font-family:inherit; cursor:pointer; min-width:160px; }
        .versel:hover { border-color:var(--ink-serif); }
        .fingtitle { font-family:'Fraunces',serif; font-weight:650; font-size:var(--fs-xxl); color:var(--ink-serif); margin-bottom:2px; }
        .fingrow { display:flex; flex-wrap:wrap; gap:14px; align-items:flex-end; }
        .legend { display:flex; flex-wrap:wrap; gap:12px; font-size:var(--fs-md); color:var(--muted); margin-top:10px; }
        .legend span { display:flex; align-items:center; gap:5px; }
        .dot { width:10px; height:10px; border-radius:50%; flex:none; }
        .dash { width:16px; height:0; border-top:2px dashed currentColor; flex:none; }
        .tabs { display:flex; gap:4px; align-items:center; margin:10px 0 0; flex-wrap:wrap; }
        .tabs button { flex:0 0 auto; padding:7px 16px; font-size:var(--fs-lg); font-weight:600; letter-spacing:.02em;
          border-radius:var(--r-md); border:1px solid transparent; background:transparent; color:var(--muted); cursor:pointer; }
        .tabs button:hover { color:var(--text); background:var(--hover); }
        .tabs button.on { background:var(--hover); border-color:var(--line-3); color:${GOLD}; }
        .tabs .tabaux { margin-left:auto; font-size:var(--fs-sm); font-weight:500; padding:6px 10px; color:var(--muted-2); }
        .tabs .tabaux:hover { color:var(--text); }
        .grouphdr { font-size:var(--fs-xs); font-weight:700; letter-spacing:.14em; text-transform:uppercase;
          color:var(--muted-2); margin:14px 0 6px; padding-bottom:5px; border-bottom:1px solid var(--line); }
        .grouphdr:first-child { margin-top:2px; }
        .progtitle { font-family:'Fraunces',serif; font-size:var(--fs-xxl); font-weight:650; }
        .keytag { font-size:var(--fs-md); color:var(--muted); }
        .struct { border-top:1px solid var(--line); padding:11px 0 2px; margin-top:11px; }
        .stname { font-family:'Fraunces',serif; font-size:var(--fs-xl); font-weight:650; color:var(--ink-serif); }
        .sttip { font-size:var(--fs-lg); color:var(--muted); font-style:italic; line-height:1.45; }
        .arr { border-top:1px solid var(--line); padding:10px 2px; }
        .arrsec { font-size:var(--fs-md); letter-spacing:.12em; text-transform:uppercase; color:var(--muted); font-weight:600; }
        .arrreps { color:${GOLD}; letter-spacing:0; text-transform:none; }
        .arrch { font-family:'Fraunces',serif; font-size:var(--fs-xxl); font-weight:650; color:var(--ink-serif); margin-top:3px; line-height:1.55; }
        .arrnote { font-size:var(--fs-md); color:var(--muted); font-style:italic; margin-top:2px; line-height:1.4; }
        .mini.recstop { border-color:var(--coral); color:#F2B8AC; }
        .mini.recbtn { border-color:#7A4A44; color:#E9B3AB; }
        .mini.recbtn:hover { border-color:var(--coral); }
        .mini.loopon { border-color:var(--blue); color:#BcD6FF; background:rgba(110,168,255,.12); }
        .recbar { display:flex; flex-wrap:wrap; align-items:center; gap:8px 10px; margin-top:7px; padding:7px 9px;
          background:var(--sunk); border:1px solid var(--line-3); border-radius:var(--r-md); }
        .recmeter { flex:1; min-width:80px; height:8px; border-radius:var(--r-pill); background:var(--line); overflow:hidden; }
        .recfill { height:100%; background:${GOLD}; border-radius:var(--r-pill); transition:width .06s linear; }
        .rechz { font-size:var(--fs-md); color:${GOLD}; font-weight:600; min-width:78px; font-variant-numeric:tabular-nums; }
        .sym { color:var(--ink-serif); font-size:var(--fs-lg); letter-spacing:0; }
        .formline { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-top:14px; border-top:1px solid var(--line); padding-top:12px; }
        .formtok { font-family:'Fraunces',serif; font-weight:650; font-size:var(--fs-display); color:var(--ink-serif); background:var(--bg); border:1px solid var(--line-2); border-radius:var(--r-md); padding:3px 11px; }
        .formtok i { font-style:normal; font-size:var(--fs-xl); color:${GOLD}; margin-left:2px; }
        .bpmval { font-size:var(--fs-lg); color:var(--ink); font-weight:600; min-width:58px; text-align:center; }
        .npill { border:1px solid var(--line-2); background:var(--bg); color:var(--ink); border-radius:var(--r-md); padding:3px 10px; font-size:var(--fs-lg); font-weight:600; }
        .npill.npent { background:var(--ink-serif); color:var(--surface); border-color:var(--ink-serif); }
        .npill.nsm { padding:2px 8px; font-size:var(--fs-md); }
        .npill.nchrom { border-color:${GOLD}; color:${GOLD}; }
        .mrow { display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-top:4px; padding:5px 8px; border-radius:var(--r-md); border:1px solid transparent; transition:all .12s; }
        .mrow.mrowon { background:var(--hover); border-color:${GOLD}; }
        .mline { display:grid; gap:4px; align-items:center; margin-top:4px; }
        .mnote { font-size:var(--fs-sm); color:var(--muted); text-align:right; padding-right:2px; }
        .mcell { height:22px; background:var(--bg); border:1px solid var(--line); border-radius:var(--r-sm); cursor:pointer; transition:all .08s; }
        .mcell:hover { border-color:var(--line-4); }
        /* a filled cell takes its melody part's colour inline (see LAYER_INK); this is the fallback */
        .mcell.on { background:var(--green); border-color:var(--green); }
        /* a cell carrying two parts is split diagonally between their colours, inline */
        .mcell.colnow { border-color:var(--ink-serif); }
        .mcell.colnow:not(.on) { background:var(--line-2); }
        .octval { font-family:ui-monospace,Menlo,monospace; font-size:var(--fs-sm); color:var(--ink); min-width:22px; text-align:center; font-variant-numeric:tabular-nums; }
        .lvl { width:104px; accent-color:var(--green); }
        .mini.mixon { background:var(--green); border-color:var(--green); color:var(--bg); }
        .mini:disabled { opacity:.35; cursor:default; }
        .btn:disabled { opacity:.35; cursor:default; }
        /* On a phone the part buttons and mixer controls were 18–23px tall — under a thumb that is
           a miss waiting to happen. Grow the touch targets at narrow widths only; the desktop
           layout is dense on purpose. */
        @media (max-width: 560px) {
          .lybtn { padding:7px 13px; font-size:var(--fs-md); min-height:32px; }
          .mini { padding:6px 10px; min-height:32px; }
          .partmix { gap:8px 12px; padding:9px 10px; }
          .partmix .lvl { width:120px; height:26px; }
          label.secdrum select { min-height:32px; padding:5px 6px; }
          .selwrap select { min-height:34px; }
        }
        .partmix { padding:7px 9px; background:var(--surface-2); border:1px solid var(--hover); border-radius:var(--r-md); }
        .lybtn { font-size:var(--fs-sm); padding:2px 9px; border-radius:var(--r-pill); border:1px solid var(--line-2); background:var(--surface); color:var(--muted); cursor:pointer; }
        .mcell.b0 { border-left:2px solid var(--line-3); }
        .mcell.bt { border-left:1px solid var(--line-2); }
        .mcell.mv { touch-action:none; }
        .mscroll.mvmode { user-select:none; -webkit-user-select:none; touch-action:none; }
        .mcell.msel { outline:2px solid var(--blue); outline-offset:-1px; box-shadow:inset 0 0 0 2px rgba(110,168,255,.35); }
        .mcell.mbox { background:rgba(110,168,255,.22); border-color:var(--blue); }
        .mcell.mghost { background:rgba(110,168,255,.5); border-color:var(--blue); }
        .melmodebar { display:flex; flex-wrap:wrap; align-items:center; gap:7px; margin-bottom:8px; }
        .melmodebar .rlbl { font-size:var(--fs-md); color:var(--muted); margin:0 2px; }
        .mscroll { overflow-x:auto; padding-bottom:4px; }
        .sugmel { background:var(--bg); border:1px solid var(--line-2); border-radius:var(--r-lg); padding:10px 12px; margin-bottom:10px; }
        /* the arrangement strip: a fixed label gutter beside a proportional track area */
        .tl { display:flex; gap:8px; align-items:stretch; margin-top:11px; padding:9px 11px 10px;
          background:var(--bg); border:1px solid var(--line-2); border-radius:var(--r-lg); }
        .tlgut { flex:0 0 56px; display:flex; flex-direction:column; }
        .tlglbl { height:13px; margin-bottom:3px; font-size:var(--fs-micro); font-weight:700; letter-spacing:.1em;
          text-transform:uppercase; color:var(--muted); line-height:13px; text-align:right; overflow:hidden; }
        .tlgruler { height:14px; }
        .tlgsec { height:26px; line-height:26px; color:${GOLD}; letter-spacing:.04em; }
        .tltrk { position:relative; flex:1; min-width:0; }
        .tlruler { position:relative; height:14px; }
        .tltick { position:absolute; top:0; font-size:var(--fs-micro); color:var(--muted-2); transform:translateX(-1px);
          padding-left:3px; border-left:1px solid var(--line-2); line-height:14px; }
        .tlrow { display:flex; gap:2px; height:13px; margin-bottom:3px; }
        .tlsecs { height:26px; }
        .tlsec { position:relative; min-width:0; padding:0 3px; border:1px solid; border-radius:var(--r-sm); cursor:pointer;
          display:flex; align-items:center; justify-content:flex-start; gap:2px; overflow:hidden; }
        .tlsec:hover { filter:brightness(1.35); }
        .tlsec.looped { outline:1.5px solid var(--blue); outline-offset:-1.5px; }
        .tlsec.picked { outline:2px solid ${GOLD}; outline-offset:-2px; filter:brightness(1.3); }
        .tlsecl { font-size:var(--fs-xs); font-weight:700; letter-spacing:.02em; white-space:nowrap;
          text-transform:capitalize; overflow:hidden; }
        .tlmv { font-size:var(--fs-micro); opacity:.75; }
        .tlcell { min-width:0; border-radius:var(--r-xs); background:var(--raised); border:none; padding:0; cursor:pointer;
          transition:filter .1s; }
        .tlcell:hover:not(:disabled) { filter:brightness(1.5); outline:1px solid var(--line-4); }
        .tlcell:disabled { cursor:default; opacity:.45; }
        .tlcell.off { box-shadow:inset 0 0 0 1px var(--line); }
        /* the playhead sits above every lane so you can read the whole column at once */
        .tlauto { position:relative; height:30px; margin-bottom:3px; border-radius:var(--r-sm); cursor:crosshair;
          background:var(--surface-2); border:1px solid var(--line); touch-action:none; overflow:hidden; }
        .tlauto.has { border-color:var(--line-3); }
        .tlauto:hover { border-color:var(--line-4); }
        .tlcurve { position:absolute; inset:0; width:100%; height:100%; }
        .tlcurve polyline { fill:none; stroke:${GOLD}; stroke-width:2.5; vector-effect:non-scaling-stroke;
          stroke-linejoin:round; }
        .tlautol { position:absolute; left:5px; top:1px; font-size:var(--fs-micro); color:var(--muted-2); pointer-events:none;
          letter-spacing:.08em; text-transform:uppercase; }
        .tlautox { position:absolute; right:2px; top:2px; width:16px; height:16px; padding:0; line-height:1;
          font-size:var(--fs-xs); border-radius:var(--r-xs); background:var(--hover); color:var(--muted); border:1px solid var(--line-2);
          cursor:pointer; }
        .tlautox:hover { color:#E9B3AB; border-color:#7A4A44; }
        .tlgauto { height:30px; line-height:30px; }
        .tlhead { position:absolute; top:14px; bottom:0; width:2px; background:${GOLD}; border-radius:var(--r-xs);
          pointer-events:none; box-shadow:0 0 6px ${GOLD}AA; }
        @media (max-width:560px) { .tlgut { flex-basis:44px; } .tlglbl { font-size:var(--fs-micro); } }
        .sgrp { border:1.5px solid var(--line-2); border-radius:var(--r-lg); padding:2px 11px 9px; margin-top:11px; }
        .sgrp .arr:first-of-type { border-top:none; padding-top:2px; }
        .arr.playnow { background:var(--hover); border-radius:var(--r-md); padding:9px 10px 10px; border-top-color:transparent; margin-top:6px; }
        .arr.playnow + .arr { border-top-color:transparent; }
        .sgrphdr { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:7px; }
        .sgrplbl { font-size:var(--fs-xs); font-weight:700; letter-spacing:.13em; text-transform:uppercase; }
        .secdrum { display:inline-flex; align-items:center; gap:4px; font-size:var(--fs-sm); }
        .fxsel { font-size:var(--fs-sm); padding:3px 6px; border-radius:var(--r-sm); background:var(--surface-2); color:var(--text);
          border:1px solid var(--line-2); max-width:150px; }
        .secdrum select { font-size:var(--fs-sm); padding:2px 5px; border-radius:var(--r-sm); background:var(--surface-2); color:var(--text);
          border:1px solid var(--line-2); max-width:130px; }
        .mbar { font-size:var(--fs-sm); font-weight:700; border-radius:var(--r-sm); text-align:center; padding:2px 0; margin:0 1px 2px; white-space:nowrap; overflow:hidden; }
        .sug { border-top:1px solid var(--line); padding:10px 2px 8px; margin-top:8px; }
        .modehint { margin:10px 0 0; padding:10px 12px; border:1px solid ${GOLD}55; background:var(--raised); border-radius:var(--r-lg); }
        .progchips { display:flex; flex-wrap:wrap; gap:8px; }
        .progchip { flex:1 1 150px; text-align:left; background:var(--surface); border:1px solid var(--line-2); border-radius:var(--r-lg);
          padding:8px 11px; cursor:pointer; font-family:inherit; color:var(--ink); display:flex; flex-direction:column; gap:2px; }
        .progchip:hover { border-color:var(--line-4); }
        .progchip.on { border-color:var(--ink-serif); background:var(--raised); box-shadow:inset 0 0 0 1px #EAE2CC55; }
        .progchip .pcname { font-size:var(--fs-lg); font-weight:600; }
        .progchip .pcnums { font-size:var(--fs-md); color:var(--ink-serif); }
        .progchip .pcrn { font-size:var(--fs-sm); color:var(--muted); letter-spacing:.03em; }
        .sugname { font-size:var(--fs-xl); font-weight:600; line-height:1.35; }
        .sugsongs { font-size:var(--fs-md); color:var(--text); margin-top:4px; line-height:1.5; }
      `}</style>

      <div className="wrap">
        <div className="hdr">
          <div>
            <div className="eyebrow">Songwriting sketchpad · v{APP_VERSION}</div>
            <h1>The Progression Wheel</h1>
          </div>
          <div className={"tog gold" + (tips ? " on" : "")} onClick={() => setTips(v => !v)} title="Show or hide the explanatory tips">
            <div className="sw" /> Tips
          </div>
        </div>
        <p className="sub">Pick a key, a genre and a feeling — the wheel does the rest.
          {" "}<a href="transcribe.html" style={{ color:GOLD, textDecoration:"none", whiteSpace:"nowrap" }}>🎤 Hum a tune →</a></p>

        {/* top transport — always-reachable Play */}
        <div className="toptransport">
          <button className={"playbtn" + (playing ? " on" : "")} title="Play or stop (space bar)"
            onClick={() => (playing ? stopMetro() : startMetro(0))}>
            {playing ? "■ Stop" : "▶ Play"}
          </button>
          <div className="row" style={{ gap:7, alignItems:"center" }}>
            <button className="mini" onClick={() => nudgeBpm(-5)} title="Slower (⇧[)">−5</button>
            <span className="bpmval">{effBpm} bpm</span>
            <button className="mini" onClick={() => nudgeBpm(5)} title="Faster (⇧])">+5</button>
            <button className="mini" onClick={tapTempo}
              title="Tap this in time with the music you have in your head and it will take the tempo from you">
              👆 Tap{tapN > 1 ? ` ${tapN}` : ""}</button>
          </div>
          {playing && curLabel
            ? <span className="tplabel">{curLabel}</span>
            : <span className="tplabel dim">{keyLabel} · {prog.label}</span>}
          {/* undo, redo and A/B act on the whole song, so they belong beside the transport rather
              than inside whichever tab happens to be open */}
          <div className="row" style={{ gap:6, marginLeft:"auto" }}>
            <button className={"mini" + (abStash ? " mixon" : "")} onClick={swapAB}
              title={abStash
                ? `You are on ${abSlot} — tap to hear the other one. Nothing is lost either way.`
                : "Take this sketch in two directions: B starts as a copy, and this swaps between them"}>
              ⇄ {abStash ? abSlot : "A/B"}</button>
            <button className="mini" onClick={undo} disabled={!past.length} title="Undo (⌘Z)">↶</button>
            <button className="mini" onClick={redo} disabled={!future.length} title="Redo (⇧⌘Z)">↷</button>
          </div>
        </div>
        <div className="tabs">
          {TABS.map(([id, label]) => (
            <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}</button>
          ))}
          {tab === "write" && <button className="tabaux" onClick={() => setWheelOpen(v => !v)}
            title={wheelOpen ? "Hide the wheel — the chord pills below carry the same information"
                             : "Show the circle-of-fifths wheel"}>
            {wheelOpen ? "◑ Hide wheel" : "◐ Show wheel"}</button>}
        </div>
        {tips && <p className="keytag" style={{ margin:"6px 0 0", textAlign:"center", opacity:.8 }}>
          {SHORTCUTS.map(([k, what], i) => (
            <span key={k}>{i ? " · " : ""}<b style={{ color:"#C9D2DE" }}>{k}</b> {what}</span>
          ))}
        </p>}

        {/* controls */}
        {/* ---- Write: the key, the mode and the chords themselves ---- */}
        {tab === "write" && <div className="panel">
          <div className="row" style={{ gap:"8px 12px", alignItems:"flex-end" }}>
            <label className="selwrap" style={{ flex:"0 0 62px" }}>
              <span className="lbl" style={{ margin:0 }}>Key</span>
              <select value={tonic} onChange={e => setTonic(+e.target.value)}>
                {Array.from({ length: 12 }, (_, s) => <option key={s} value={s}>{spell(s, s, effMode)}</option>)}
              </select>
            </label>
            <label className="selwrap" style={{ flex:"0 0 74px" }}>
              <span className="lbl" style={{ margin:0 }}>Chords</span>
              <select value={nChords} onChange={e => setNChordsSt({ key: progId, val: +e.target.value })}
                title="How many chords the loop has. Fewer takes the first few; more adds diatonic chords the progression hasn't used yet. An odd number still plays as an even phrase — the last chord holds an extra bar.">
                {Array.from({ length: CHORDS_MAX - CHORDS_MIN + 1 }, (_, i) => CHORDS_MIN + i).map(n =>
                  <option key={n} value={n}>{n}{n === natLen ? " ·" : ""}</option>)}
              </select>
            </label>
            <label className="selwrap" style={{ flex:"1 1 108px" }}>
              <span className="lbl" style={{ margin:0 }}>Mode</span>
              <select value={mode || ""} onChange={e => setMode(e.target.value || null)}
                title="The scale you write your melody against. Auto follows the loaded progression's own mode; cross-family modes recolour the scale and add tension against the chords.">
                <option value="">Auto — {MODES[modeId(prog.mode)].short}</option>
                <optgroup label="Fits this progression">
                  {MODE_IDS.filter(id => MODES[id].family === modeFamily(prog.mode))
                    .map(id => <option key={id} value={id}>{MODES[id].label}</option>)}
                </optgroup>
                <optgroup label="Cross-family — adds tension">
                  {MODE_IDS.filter(id => MODES[id].family !== modeFamily(prog.mode))
                    .map(id => <option key={id} value={id}>{MODES[id].label}</option>)}
                </optgroup>
              </select>
            </label>
            <label className="selwrap" style={{ flex:"1 1 88px" }}>
              <span className="lbl" style={{ margin:0 }}>Genre</span>
              <select value={genre || ""} onChange={e => { setGenre(e.target.value || null); setForce(null); setMode(null); }}>
                <option value="">Any</option>
                {GENRE_GROUPS.map(([cat, list]) => (
                  <optgroup key={cat} label={cat}>
                    {list.map(([name]) => <option key={name} value={name}>{name}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="selwrap" style={{ flex:"1 1 88px" }}>
              <span className="lbl" style={{ margin:0 }}>Emotion</span>
              <select value={emotion || ""} onChange={e => { setEmotion(e.target.value || null); setForce(null); setMode(null); }}>
                <option value="">Any</option>
                {CATEGORIES[1].items.map(it => <option key={it.name} value={it.name}>{it.name}</option>)}
              </select>
            </label>
            <div className="seg" style={{ marginBottom:2 }}>
              <button className={colour === "triads" ? "on" : ""} onClick={() => setColour("triads")}>Triads</button>
              <button className={colour === "sevenths" ? "on" : ""} onClick={() => setColour("sevenths")}>7ths</button>
              <button className={colour === "extended" ? "on" : ""} onClick={() => setColour("extended")}>9ths</button>
            </div>
            <button className="btn" style={{ padding:"5px 11px", marginBottom:2 }} onClick={rollDice} title="Surprise me">🎲</button>
            <button className={"btn" + (adv ? " on" : "")} style={{ padding:"5px 11px", marginBottom:2 }}
              onClick={() => setAdv(v => !v)} title="Secondary dominants, parallel chords and borrowed colour">
              {adv ? "− Advanced" : "＋ Advanced"}
            </button>
          </div>

          {adv && (<>
          <div className="row" style={{ gap:14, marginTop:12, alignItems:"center" }}>
            <div className={"tog lav" + (showPar ? " on" : "")} onClick={() => setShowPar(v => !v)}>
              <div className="sw" /> Par
            </div>
            <div className={"tog gold" + (showSec ? " on" : "")} onClick={() => setShowSec(v => !v)}>
              <div className="sw" /> Sec
            </div>
            {tips && <span className="keytag">dashed lines on the wheel: parallel chords &amp; secondary dominants</span>}
          </div>

          <div className="selrow" style={{ marginTop:12 }}>
            <label className="selwrap">
              <span className="lbl" style={{ margin:0, color:GOLD, whiteSpace:"nowrap" }}>2ndary dom</span>
              <select value="" onChange={e => { const v = e.target.value; if (v !== "" && secondaries[+v]) applySecondary(secondaries[+v]); }}>
                <option value="">Choose…</option>
                {secondaries.map((s, i) => {
                  const applied = insList.some(x => x.before === baseNames.indexOf(s.target.baseName) && x.root === s.root);
                  return <option key={i} value={i}>
                    {(applied ? "✓ " : "") + s.name + " → " + s.target.name + " (V/" + String(s.target.numeral).replace(/7$/, "") + ")"}
                  </option>;
                })}
              </select>
            </label>
            <label className="selwrap">
              <span className="lbl" style={{ margin:0, color:LAV, whiteSpace:"nowrap" }}>p-lel cord</span>
              <select value="" onChange={e => { const v = e.target.value; if (v !== "" && parallels[+v]) applyParallel(parallels[+v]); }}>
                <option value="">Choose…</option>
                {parallels.map((p, i) => <option key={i} value={i}>{p.of.name + " → " + p.name}</option>)}
              </select>
            </label>
            <label className="selwrap">
              <span className="lbl" style={{ margin:0, whiteSpace:"nowrap" }}>More colour</span>
              <select value="" onChange={e => {
                const v = e.target.value; if (v === "") return;
                const [kind, a, b, c] = v.split("~");
                if (kind === "ins") applyInsert(+a, +b, c.split(",")[0], c.split(",")[1]);
                else { const next = { ...ovMap }; next[a] = { root:+b, quality:"dom" }; setEdits({ key:editKey, map:next }); }
              }}>
                <option value="">Choose…</option>
                <optgroup label="Borrowed (mode mixture)">
                  {(BORROWED[modeFamily(prog.mode)] || []).map(([tag, off, q, where], i) => {
                    const r = (tonic + off) % 12;
                    return <option key={"b"+i} value={`ins~${Math.min(where, prog.numerals.length-1)}~${r}~${q},${tag}`}>
                      {chordName(r, q)} ({tag}) — before the loop restarts</option>;
                  })}
                </optgroup>
                <optgroup label="Chromatic mediants (common-tone jumps)">
                  {(MEDIANTS[modeFamily(prog.mode)] || []).map(([tag, off, q, where], i) => {
                    const r = (tonic + off) % 12;
                    return <option key={"m"+i} value={`ins~${Math.min(where, prog.numerals.length-1)}~${r}~${q},${tag}`}>
                      {chordName(r, q)} ({tag}) — right after the tonic</option>;
                  })}
                </optgroup>
                <optgroup label="Tritone substitutions">
                  {uniques.filter(u => !u.inserted && (u.quality.startsWith("dom") || u.numeral === "V")).map((u, i) => {
                    const r = (u.root + 6) % 12;
                    return <option key={"t"+i} value={`sub~${u.baseName}~${r}`}>
                      {chordName(r, "dom")} for {u.name} — same tritone, chromatic bass</option>;
                  })}
                </optgroup>
              </select>
            </label>
          </div>
          </>)}

        </div>}

        {/* ---- Sound: instruments, groove and feel ---- */}
        {tab === "sound" && <div className="panel">
          <div className="grouphdr">Instruments</div>
          <div className="selrow">
            <label className="selwrap">
              <span className="lbl" style={{ margin:0 }}>Chords</span>
              <select value={gmKey(instr)} onChange={e => setInstr(e.target.value)}>
                {GM_CATS.map(([cat, list]) => (
                  <optgroup key={cat} label={cat}>
                    {list.map(([k, label]) => <option key={cat + k} value={k}>{label}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="selwrap">
              <span className="lbl" style={{ margin:0 }}>Lead</span>
              <select value={melInstr} onChange={e => setMelInstr(e.target.value)}>
                <optgroup label="Synth (no download)">
                  {LEAD_VOICES.filter(([id]) => !isGM(id)).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </optgroup>
                {GM_CATS.map(([cat, list]) => (
                  <optgroup key={cat} label={"◈ " + cat}>
                    {list.map(([k, label]) => <option key={"l" + cat + k} value={k}>{label}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>

          <div className="grouphdr">Groove</div>
          <div className="selrow" style={{ alignItems:"flex-end", flexWrap:"wrap" }}>
            <label className="selwrap" style={{ flex:"0 0 86px" }}>
              <span className="lbl" style={{ margin:0 }}>Time</span>
              <select value={curMeter} onChange={e => setMeter(e.target.value)}
                title="The bar length. Changing it switches to a strum pattern and a kit that fit — everything in this row is filtered to the meter you pick.">
                {METERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
            <label className="selwrap" style={{ minWidth:150 }}>
              <span className="lbl" style={{ margin:0 }}>Pattern</span>
              <select value={patId} onChange={e => setPatSel({ key: progId, id: e.target.value })}>
                {metricPats.map(([id, p]) => (
                  <option key={id} value={id}>
                    {p.name}{id === (PATTERN_DEFAULT[progId] || "pop") ? " ★" : ""}{p.swing ? " (swung)" : ""}{subOf(p) === 4 ? " · 16ths" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="selwrap" style={{ minWidth:130 }}>
              <span className="lbl" style={{ margin:0 }}>Drums</span>
              <select value={drum} onChange={e => setDrumSt({ key: progId, val: e.target.value })}>
                {metricDrums.map(([id, d]) => (
                  <option key={id} value={id}>{d.name}{id === DRUM_DEFAULT[progId] ? " ★" : ""}</option>
                ))}
              </select>
            </label>
            <label className="selwrap" style={{ minWidth:150 }}>
              <span className="lbl" style={{ margin:0 }}>Kit</span>
              <select value={kit} onChange={e => setKitSt({ key: progId, val: e.target.value })}
                title="How the drums are voiced — an acoustic kit, or the two drum machines dance music is built on">
                {DRUM_KITS.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
          </div>

          <div className="grouphdr">Feel &amp; space</div>
          <div className="selrow" style={{ alignItems:"flex-end", flexWrap:"wrap" }}>
            <label className="selwrap" style={{ minWidth:130 }}>
              <span className="lbl" style={{ margin:0 }}>Delay</span>
              <select value={delayId} onChange={e => setDelaySt({ key: progId, val: e.target.value })}
                title="Tempo-synced echo. Set how far each repeat lands, then send a melody part into it from its mixer row.">
                {DELAY_TIMES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
            <label className="selwrap" style={{ minWidth:130 }}>
              <span className="lbl" style={{ margin:0 }}>Pump</span>
              <select value={pump} onChange={e => setPumpSt({ key: progId, val: e.target.value })}
                title="Sidechain ducking — the kick pulls the chords and melody down and lets them breathe back. Needs a drum pattern with a kick in it.">
                {PUMPS.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
            {/* Swing and Feel: the two dials that decide whether a pattern sounds programmed or
                played. Both are continuous, because the useful settings are the small ones. */}
            <label className="selwrap" style={{ minWidth:118 }}>
              <span className="lbl" style={{ margin:0 }}>Swing {Math.round(swingAmt * 100)}%</span>
              <input className="lvl" type="range" min="0" max="60" value={Math.round(swingAmt * 100)}
                onChange={e => setSwingSt({ key: progId, val: +e.target.value / 100 })}
                title="Delay every offbeat — 0% is dead straight, ~33% is a triplet shuffle, and the small values in between are the garage and house feels" />
            </label>
            <label className="selwrap" style={{ minWidth:118 }}>
              <span className="lbl" style={{ margin:0 }}>Feel {Math.round(humanise * 100)}%</span>
              <input className="lvl" type="range" min="0" max="100" value={Math.round(humanise * 100)}
                onChange={e => setHumanise(+e.target.value / 100)}
                title="Humanise — nudges every hit a few milliseconds early or late and varies how hard it lands, so the grid stops sounding typed. The variation is fixed, not random, so a render sounds like what you heard." />
            </label>
            <div className={"tog" + (realSounds ? " on" : "")} onClick={() => setRealSounds(v => !v)} style={{ paddingBottom:6 }}
              title="Play real recorded instruments (loads samples when online; falls back to the built-in synth offline)">
              <div className="sw" /> Real
            </div>
            <div className={"tog" + (clickOn ? " on" : "")} onClick={() => setClickOn(v => !v)} style={{ paddingBottom:6 }}
              title="A metronome tick on each beat">
              <div className="sw" /> Click
            </div>
          </div>

        </div>}

        {/* ---- Save: naming, keeping and sharing ---- */}
        {tab === "save" && <div className="panel">
          <div className="row" style={{ marginTop:12, gap:8 }}>
            <input className="txt" placeholder="Sketch name…" value={sketchName}
              onChange={e => setSketchName(e.target.value)} />
            <button className="btn" style={{ padding:"6px 12px" }} onClick={saveSketch}>Save</button>
            <button className="btn" style={{ padding:"6px 12px" }} onClick={shareSong}
              title="Copy a link that rebuilds this whole song — chords, arrangement and every melody part">🔗 Share</button>
            {(sketches || []).length > 0 && (
              <select value="" onChange={e => { const s = (sketches || [])[+e.target.value]; if (s) loadSketch(s); }}>
                <option value="">Load sketch…</option>
                {(sketches || []).map((s, i) => <option key={i} value={i}>{s.name}</option>)}
              </select>
            )}
            {ioNote && <span className="keytag">{ioNote}</span>}
          </div>
        </div>}


        {/* suggested chord progressions for the chosen genre / feeling */}
        {tab === "write" && <div className="panel">
          <div className="progtitle" style={{ fontSize:17 }}>
            Suggested progressions{genre ? ` · ${genre}` : ""}{emotion ? ` · ${emotion}` : ""}
          </div>
          {tips && <p className="keytag" style={{ margin:"3px 0 8px" }}>
            {genre || emotion
              ? "The classic loops behind this style — tap one to load it onto the wheel. The top pick is showing now."
              : "Pick a genre or a feeling above to narrow these, or tap any loop to load it."}
          </p>}
          <div className="progchips">
            {progList.map(id => {
              const p = PROGRESSIONS[id];
              const defs = modeFamily(p.mode) === "minor" ? MINOR_NUM : MAJOR_NUM;
              const names = p.numerals.map(n => { const [off, q] = defs[n]; return chordName((tonic + off) % 12, q); });
              return (
                <button key={id} className={"progchip" + (id === progId ? " on" : "")}
                  onClick={() => { setForce(id); setMode(null); setFingerIdx(null); setSel(null); }}
                  title={`Load "${p.label}" — ${p.numerals.join(" ")}`}>
                  <span className="pcname">{p.label}</span>
                  <span className="pcnums">{names.join(" · ")}</span>
                  <span className="pcrn">{p.numerals.join(" ")} · {MODES[modeId(p.mode)].short}</span>
                </button>
              );
            })}
          </div>
        </div>}

        {/* when a Mode override doesn't match the loop on the wheel, offer a progression for that mode */}
        {mode && !loadedMatchesMode && (
          <div className="modehint">
            <span className="keytag" style={{ color:GOLD }}>
              You picked <b>{MODES[effMode].short}</b>, but the loop on the wheel is <b>{MODES[modeId(prog.mode)].short}</b>.
            </span>
            {modeMatchProgs.length ? (
              <div className="row" style={{ gap:6, marginTop:6, alignItems:"center", flexWrap:"wrap" }}>
                <span className="keytag">Load a {MODES[effMode].short} progression onto the wheel:</span>
                {modeMatchProgs.map(id => (
                  <button key={id} className="verbtn"
                    onClick={() => { setForce(id); setMode(null); setFingerIdx(null); setSel(null); }}
                    title={`${PROGRESSIONS[id].label} — ${PROGRESSIONS[id].numerals.join(" ")}`}>
                    {PROGRESSIONS[id].label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="keytag" style={{ margin:"6px 0 0" }}>
                {MODES[effMode].hint
                  || `No catalogue loop for ${MODES[effMode].short} yet — build one by tapping the gold-haloed chords on the wheel.`}
              </p>
            )}
          </div>
        )}

        {/* the wheel */}
        {tab === "write" && wheelOpen && <div className="panel" style={{ padding:6 }}>
          <svg className="wheelsvg" viewBox="0 0 640 640" key={svgKey}>
            <defs>
              <marker id="arrCream" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
                <path d="M0,0 L7,3.5 L0,7 Z" fill={PATH} />
              </marker>
              <marker id="arrGold" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <path d="M0,0 L7,3.5 L0,7 Z" fill={GOLD} />
              </marker>
            </defs>
            <circle cx={CX} cy={CY} r={R_MAJ} fill="none" stroke="#232C3A" strokeWidth="1.2" />
            <circle cx={CX} cy={CY} r={R_MIN} fill="none" stroke="#232C3A" strokeWidth="1.2" />
            {/* the current mode's diatonic chords, haloed on the wheel — this set shifts as the Mode changes */}
            {modeTriads.map((t, i) => {
              const minorish = t.q === "min" || t.q === "dim";
              const n = minorish ? slotXY(posOf((t.root + 3) % 12), R_MIN) : slotXY(posOf(t.root), R_MAJ);
              const tonicNode = i === 0;
              return (
                <g key={"scn"+i}>
                  <circle cx={n.x} cy={n.y} r={minorish ? 20 : 25}
                    fill={tonicNode ? GOLD : "#EAE2CC"} opacity={tonicNode ? 0.20 : 0.09} />
                  {tonicNode && <circle cx={n.x} cy={n.y} r={minorish ? 20 : 25}
                    fill="none" stroke={GOLD} strokeWidth="1.6" opacity="0.85" />}
                </g>
              );
            })}
            {dimLabels}
            {Array.from({ length:12 }, (_, p) => {
              const maj = POS_MAJ[p], min = (maj + 9) % 12;
              const M = slotXY(p, R_MAJ), m = slotXY(p, R_MIN);
              return (
                <g key={"hit"+p} style={{ cursor: (sel || adding) ? "pointer" : "default" }}>
                  {adding && <>
                    <circle cx={M.x} cy={M.y} r={25} fill="none" stroke="#54B79D" strokeWidth="1.3" strokeDasharray="3 3" opacity="0.5" />
                    <circle cx={m.x} cy={m.y} r={20} fill="none" stroke="#54B79D" strokeWidth="1.3" strokeDasharray="3 3" opacity="0.42" />
                  </>}
                  <circle cx={M.x} cy={M.y} r={27} fill="transparent" onClick={() => adding ? addChord(maj, "maj") : doSwap(maj, "maj")} />
                  <circle cx={m.x} cy={m.y} r={22} fill="transparent" onClick={() => adding ? addChord(min, "min") : doSwap(min, "min")} />
                </g>
              );
            })}
            {showPar && parallels.map((p, i) =>
              <path key={"pl"+i} d={curve(nodeXY(p.of.root, p.of.quality), nodeXY(p.root, p.quality), 0.45)} className="parline" />)}
            {showSec && secondaries.map((s, i) =>
              <path key={"sl"+i} d={curve(nodeXY(s.root, "maj"), nodeXY(s.target.root, s.target.quality), 0.22)}
                className="secline" markerEnd="url(#arrGold)" />)}
            {pathSegs}
            {showPar && parallels.map((p, i) => {
              const n = nodeXY(p.root, p.quality);
              return (
                <g key={"pn"+i} style={{ cursor:"pointer" }} onClick={() => applyParallel(p)}>
                  <circle cx={n.x} cy={n.y} r={famMin(p.quality) ? 19 : 23} fill="#171E28" stroke={LAV} strokeWidth="1.8" strokeDasharray="4 3" />
                  <text x={n.x} y={n.y+5} textAnchor="middle" fill={LAV} fontSize="15" fontWeight="600" fontFamily="Archivo"
                    style={{ pointerEvents:"none" }}>{p.name}</text>
                </g>
              );
            })}
            {showSec && secondaries.map((s, i) => {
              const n = nodeXY(s.root, "maj");
              return (
                <g key={"sn"+i} style={{ cursor:"pointer" }} onClick={() => applySecondary(s)}>
                  <circle cx={n.x} cy={n.y} r={s.onExisting ? 30 : 23} fill={s.onExisting ? "none" : "#171E28"}
                    stroke={GOLD} strokeWidth="2" strokeDasharray={s.onExisting ? "3 3" : "0"} />
                  {!s.onExisting && <text x={n.x} y={n.y+5} textAnchor="middle" fill={GOLD} fontSize="15" fontWeight="600"
                    fontFamily="Archivo" style={{ pointerEvents:"none" }}>{s.name}</text>}
                  <text x={n.x} y={n.y + (s.onExisting ? 46 : 38)} textAnchor="middle" fill={GOLD} fontSize="13" fontFamily="Archivo">
                    V/{s.target.numeral}</text>
                </g>
              );
            })}
            {uniques.map((c, i) => {
              const n = nodeXY(c.root, c.quality), r = famMin(c.quality) ? 22 : 27, isSel = sel === c.baseName;
              return (
                <g key={"n"+i} style={{ cursor:"pointer" }}
                  onClick={() => {
                    if (adding) { addChord(c.root, c.quality); return; }   // tap a node again to add another copy
                    if (removing) { removeChord(c); return; }
                    if (c.inserted) {
                      setInserts({ key: editKey, list: insList.filter(x => !(x.before === c.insBefore && x.root === c.insRoot)) });
                      return;
                    }
                    if (sel && sel !== c.baseName) doSwap(c.root, c.quality);
                    else setSel(isSel ? null : c.baseName);
                  }}>
                  {isSel && <circle cx={n.x} cy={n.y} r={r + 6} fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeDasharray="4 4" opacity="0.9" />}
                  <circle cx={n.x} cy={n.y} r={r} fill={FN_COLOR[c.func]} stroke={c.inserted ? GOLD : "#10151D"} strokeWidth="2.5" />
                  <text x={n.x} y={n.y+5} textAnchor="middle" fill={FN_TEXT[c.func]} fontSize={c.name.length > 3 ? 13 : famMin(c.quality) ? 15 : 17}
                    fontWeight="700" fontFamily="Archivo" style={{ pointerEvents:"none" }}>{c.name}</text>
                  <text x={n.x} y={n.y - r - 8} textAnchor="middle" fill="#8B94A3" fontSize="13" fontFamily="Archivo">{c.steps.join("·")}</text>
                  {!chordInMode(c) && <>
                    <circle cx={n.x + r * 0.72} cy={n.y - r * 0.72} r={6} fill={GOLD} stroke="#10151D" strokeWidth="1.6" />
                    <title>{c.name} sits outside {keyLabel} — borrowed / chromatic colour</title>
                  </>}
                </g>
              );
            })}
          </svg>
        </div>}

        {/* The chord strip is the wheel's conclusion, not its decoration — it stays whether or not
            the wheel itself is on screen, since it is what you actually edit. */}
        {tab === "write" && <div className="panel">

          <div className="hint">
            {adding
              ? <>Tap any node on the wheel to <b style={{ color:"#54B79D" }}>add</b> it to the end of the chain — then <b>⇄ Reorder</b> to place it. Tap <b>✕ Done</b> when finished.</>
              : removing
              ? <>Tap a chord — on the strip or the wheel — to <b style={{ color:"#E06A55" }}>remove</b> it. Tap <b>✕ Done</b> when finished.</>
              : sel
              ? <>Tap any note on the wheel to replace <b>{(uniques.find(u => u.baseName === sel) || {}).name || sel}</b> — or tap it again to cancel.</>
              : (Object.keys(ovMap).length || insList.length || Object.keys(qmap).length || remList.length)
                ? <>Progression edited. <button className="mini" onClick={resetEdits}>Reset</button></>
                : tips ? <>Tap a chord to swap it, or <b>＋ Add</b> any chord from the wheel.</> : null}
          </div>

          <div className="stripline">
            <span className="strippills">
              {chords.map((c, i) => {
                const outside = !chordInMode(c);
                return (
                <span key={i} className={"pill" + (!reorder && fingerIdx === i ? " pillon" : "")
                    + (reorder && pillSel.includes(i) ? " pillsel" : "") + (playing && curBar === i ? " pillplay" : "")
                    + (outside ? " pillout" : "")}
                  style={{ background: FN_COLOR[c.func], color: FN_TEXT[c.func] }}
                  title={outside ? `${c.name} sits outside ${keyLabel} — borrowed / chromatic colour` : undefined}
                  onClick={() => removing ? removeChord(c) : reorder ? togglePillSel(i) : setFingerIdx(fingerIdx === i ? null : i)}>
                  <i>{c.numeral}</i>{c.name}{outside && <b className="outmark">✦</b>}
                </span>
                );
              })}
            </span>
            <button className={"mini" + (adding ? " miniOn" : "")} style={{ marginLeft:"auto" }}
              onClick={toggleAdding} title="Tap any chord on the wheel to add it to the chain">
              {adding ? "✕ Done" : "＋ Add"}
            </button>
            <button className={"mini" + (removing ? " miniOn" : "")}
              onClick={toggleRemoving} title="Tap chords on the strip or wheel to remove them">
              {removing ? "✕ Done" : "🗑 Remove"}
            </button>
            <button className={"mini" + (reorder ? " miniOn" : "")}
              onClick={toggleReorder} title="Select several chords and shift them as a group">
              {reorder ? "✕ Done" : "⇄ Reorder"}
            </button>
          </div>

          {reorder && (
            <div className="reorderbar">
              <span className="rlbl">{pillSel.length ? `${pillSel.length} selected` : "Tap chords to select, then move or remove"}</span>
              <button className="mini" onClick={() => setPillSel(pillSel.length === chords.length ? [] : chords.map((_, i) => i))}
                title="Select every chord in the progression">{pillSel.length === chords.length ? "Select none" : "Select all"}</button>
              <button className="mini" disabled={!pillSel.length} onClick={() => movePills(-1)}>◀ Move</button>
              <button className="mini" disabled={!pillSel.length} onClick={() => movePills(1)}>Move ▶</button>
              <button className="mini recstop" disabled={!pillSel.length || pillSel.length >= chords.length}
                onClick={removeSelected} title="Remove the selected chords from the progression">🗑 Remove</button>
              {order.list && order.key === editKey &&
                <button className="mini" onClick={straightenPills} title="Restore the original order">↺ Straighten</button>}
            </div>
          )}
          {tips && !reorder && fingerIdx == null && (
            <div className="hint" style={{ padding:"2px 10px 4px" }}>
              Tap a chord above for its shapes and to change its <b>version</b> (7th · add9 · sus…),
              <b> duplicate</b> it (longer) or <b>remove</b> it (shorter).
            </div>
          )}

          {fingerIdx != null && chords[fingerIdx] && (() => {
            const fc = chords[fingerIdx];
            return (
            <div className="fingcard">
              <div className="row" style={{ justifyContent:"space-between", alignItems:"baseline", gap:8 }}>
                <div className="fingtitle">{fc.name} <span style={{ color:"#8B94A3", fontSize:12, fontWeight:400 }}>{fc.numeral}</span></div>
                <div className="row" style={{ gap:5 }}>
                  <button className="mini" onClick={() => duplicateChord(fc)} title="Add a copy of this chord right after it — makes the progression longer">＋ Duplicate</button>
                  <button className="mini" onClick={() => removeChord(fc)} disabled={chords.length <= 1}
                    title="Remove this chord from the progression — makes it shorter">🗑 Remove</button>
                </div>
              </div>
              {(() => {
                const opts = versionsFor(fc);
                const overridden = qmap[fc.baseName] != null;
                // if a saved override sits outside this family's list, keep it selectable
                const extra = overridden && !opts.some(([, q]) => q === fc.quality)
                  ? [[QSUF[fc.quality] || fc.quality, fc.quality]] : [];
                return (
                  <div className="verrow">
                    <span className="verlbl">Version</span>
                    <select className="versel" value={overridden ? fc.quality : "__def"}
                      onChange={e => e.target.value === "__def" ? clearChordQuality(fc) : setChordQuality(fc, e.target.value)}>
                      <option value="__def">Default — {chordName(fc.root, fc.defQ || fc.quality)}</option>
                      {[...opts, ...extra].map(([lbl, q]) => (
                        <option key={q} value={q}>{lbl} — {chordName(fc.root, q)}</option>
                      ))}
                    </select>
                    {overridden && <button className="mini" onClick={() => clearChordQuality(fc)}>Reset</button>}
                  </div>
                );
              })()}
              <div className="fingrow">
                <GuitarDiagram root={fc.root} quality={fc.quality} />
                <PianoDiagram root={fc.root} quality={fc.quality} />
              </div>
            </div>
            );
          })()}

          {tips && <div className="legend" style={{ padding:"0 10px 8px" }}>
            <span><i className="dot" style={{ background: FN_COLOR.T }} /> tonic</span>
            <span><i className="dot" style={{ background: FN_COLOR.S }} /> subdominant</span>
            <span><i className="dot" style={{ background: FN_COLOR.D }} /> dominant</span>
            <span style={{ color:GOLD }}><i className="dot" style={{ background: GOLD, opacity:0.5 }} /> chords in {keyLabel}</span>
            <span style={{ color:GOLD }}><b style={{ fontSize:11 }}>✦</b> outside the key</span>
            {showPar && <span style={{ color:LAV }}><i className="dash" /> parallel</span>}
            {showSec && <span style={{ color:GOLD }}><i className="dash" /> secondary dominant</span>}
            <span>numbers = order in the loop</span>
          </div>}
        </div>}

        {/* notation — the song on a stave */}
        {tab === "write" && <div className="panel">
          <div className="row" style={{ justifyContent:"space-between", alignItems:"center" }}>
            <div className="progtitle" style={{ fontSize:17 }}>On the stave</div>
            <div className="row" style={{ gap:7, alignItems:"center" }}>
              {showScore && (
                <div className="seg">
                  <button className={scoreInstr === "piano" ? "on" : ""} onClick={() => setScoreInstr("piano")}>Piano</button>
                  <button className={scoreInstr === "guitar" ? "on" : ""} onClick={() => setScoreInstr("guitar")}>Guitar</button>
                </div>
              )}
              <button className="btn" style={{ padding:"5px 13px" }} onClick={() => setShowScore(v => !v)}>
                {showScore ? "Hide" : "Show score"}
              </button>
            </div>
          </div>
          {showScore && (<>
            <div className="scorewrap">
              <NotationScore measures={scoreMeasures} instr={scoreInstr} meloBeats={meloBeats} sub={meloSub} />
            </div>
            {tips && <div className="hint" style={{ padding:"2px 10px 4px" }}>
              {scoreInstr === "piano"
                ? <>Grand staff — right hand plays the melody{scoreHasMelody ? "" : " (add one in the melody grid below)"}, left hand holds the chord voicing. Chord symbols sit above each bar.</>
                : <>Guitar lead sheet — chord symbols above, the melody on the treble staff{scoreHasMelody ? ", with fret numbers on the tab below fingered low on the neck (first position, sounding lower)" : " — write a melody below and its tab appears here"}.</>}
              {structSel ? " Following the selected song structure." : " Following the loop."}
              {scoreHasB && <> Melody parts beyond <b>A</b> are inked in their own colours.</>}
            </div>}
          </>)}
        </div>}

        {/* song & melody */}
        {tab === "arrange" && <div className="panel accent">
          <div className="row" style={{ justifyContent:"space-between", alignItems:"center" }}>
            <div className="progtitle" style={{ fontSize:17 }}>Song & melody</div>
            <select value={selStruct.startsWith(progId + ":") ? selStruct : ""} onChange={e => setSelStruct(e.target.value)}>
              <option value="">No structure — just the loop</option>
              {(STRUCTURES[progId] || []).length > 0 && (
                <optgroup label={"Written for " + prog.label}>
                  {(STRUCTURES[progId] || []).map((st, i) => <option key={"p"+i} value={progId + ":p:" + i}>{st.name}</option>)}
                </optgroup>
              )}
              {STRUCT_FAMILIES.map(fam => (
                <optgroup key={fam} label={fam}>
                  {UNIVERSAL.map((st, i) => st.family === fam
                    ? <option key={"u"+i} value={progId + ":u:" + i}>{st.name}</option> : null)}
                </optgroup>
              ))}
            </select>
          </div>

          {/* melodic narrative — one melodic idea written across every section at once */}
          <div className="row" style={{ marginTop:8, gap:"6px 8px", alignItems:"center", flexWrap:"wrap" }}>
            <span className="keytag" style={{ margin:0 }}>Melodic narrative</span>
            <select value={narId} onChange={e => applyNarrative(e.target.value)} style={{ flex:"1 1 200px" }}
              title="Write one melodic shape across the whole song — each section's register, density and contour chosen from what it is and where it sits">
              <option value="">None — write each section yourself</option>
              {NARRATIVES.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
            {curNar && <button className="mini" onClick={() => applyNarrative(narId)}
              title="Rewrite it — after a key change, a new structure, or edits you want to throw away">↻ Rewrite</button>}
            {/* a second chorus that is note-for-note the first one is the fastest way to sound like a demo */}
            <select value={varyAmt} onChange={e => { const v = +e.target.value;
                setVarySt({ key: progId, val: v }); if (narId) applyNarrative(narId, v); }}
              style={{ flex:"0 1 150px" }}
              title="How much each repeat of a section differs from its first time round — a new landing note, a note added or taken away, a phrase pushed early, a held note broken in two. The first time is always left alone.">
              {VARY_LEVELS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
            {narUndo && narSel.key === progId && <button className="mini" onClick={undoNarrative}
              title="Put the melodies back as they were before the narrative was written">↶ Undo</button>}
          </div>
          {curNar
            ? <p className="arrnote" style={{ marginTop:6 }}>{curNar.tip}
                <span className="keytag" style={{ display:"block", marginTop:3 }}>e.g. {curNar.refs}</span>
                <span className="keytag" style={{ display:"block" }}>
                  Written onto melody <b>A</b> of all {sections.insts.length} section{sections.insts.length > 1 ? "s" : ""} —
                  edit any of them below; the narrative is a first draft, not a cage.
                  {sections.insts.some(d => !secHasNotes(secMelos[d.key]))
                    && <> Some sections are empty — the structure changed since it was written, so tap <b>↻ Rewrite</b>.</>}
                </span></p>
            : tips && <p className="arrnote" style={{ marginTop:6 }}>
                A narrative writes one melodic idea across every section at once — an arch, a lament, a
                withheld top note — using each section's role and its place in the running order to pick
                its register and shape. A quick way to get a whole song's worth of melody to argue with.
              </p>}

          {(() => {
            // where a hummed / imported / recorded melody lands: the chosen section, else the first
            const recDest = sections.insts.some(s => s.key === impSec) ? impSec : (sections.insts[0] || {}).key;
            const openMel = addMel || !!recSec;   // stay open while a recording is in progress
            return (<>
          {/* one button holds every way to add a melody; utilities sit alongside */}
          <div className="row" style={{ marginTop:10, gap:"8px 10px", alignItems:"center", flexWrap:"wrap" }}>
            <button className={"btn" + (openMel ? " on" : "")} style={{ padding:"5px 12px" }} onClick={() => setAddMel(v => !v)}
              title="Hum, import a MIDI file, or record a melody — all onto a section you choose">
              {openMel ? "▾" : "▸"} 🎵 Add a melody
            </button>
            <div className={"tog" + (legato ? " on" : "")} onClick={() => setLegato(v => !v)} style={{ marginLeft:"auto" }}
              title="Merge the melody notes into one flowing line — smoother, less stodgy">
              <div className="sw" /> Legato
            </div>
            <button className="btn" style={{ padding:"5px 11px" }} onClick={exportMidi} title="Export the song as one multi-track MIDI file">↓ Export MIDI</button>
            <button className="btn" style={{ padding:"5px 11px" }} onClick={exportMidiSplit}
              title="One MIDI file per track, zipped — for a DAW that imports multi-track files badly, or when you want to drag one part onto one track">↓ MIDI ×tracks</button>
            <button className="btn" style={{ padding:"5px 11px" }} onClick={exportChart}
              title="A plain-text chord chart — the form, the chords and the bar counts, for a player rather than a DAW">↓ Chart</button>
            <button className="mini" onClick={copyChart} title="Copy the chord chart to the clipboard">⧉ Copy chart</button>
            <button className="btn" style={{ padding:"5px 11px" }} onClick={renderAudio} disabled={rendering || stemming}
              title="Render the whole song to a .wav you can send or post — the same sound you hear on Play">
              {rendering ? "Rendering…" : "↓ Export audio"}</button>
            <button className="btn" style={{ padding:"5px 11px" }} onClick={exportStems} disabled={rendering || stemming}
              title="Bounce drums, chords and each melody part to separate .wav files, zipped — drop them straight onto a DAW timeline">
              {stemming ? "Bouncing…" : "↓ Export stems"}</button>
          </div>
          {openMel && (
            <div className="sugmel" style={{ marginTop:8 }}>
              <div className="row" style={{ gap:"8px 10px", alignItems:"center", flexWrap:"wrap" }}>
                <button className="btn" style={{ padding:"5px 11px" }} onClick={loadHummedMelody} disabled={!!recSec}
                  title="Load the tune you hummed in the Tune Transcriber">🎤 Hum</button>
                <label className="btn" style={{ padding:"5px 11px", cursor: recSec ? "default" : "pointer", opacity: recSec ? 0.4 : 1 }} title="Import a melody from a MIDI file">↑ MIDI file
                  <input type="file" accept=".mid,.midi,audio/midi" onChange={importMidiFile} disabled={!!recSec} hidden />
                </label>
                {recSec
                  ? <button className="btn" style={{ padding:"5px 11px", borderColor:"#E06A55", color:"#F2B8AC" }}
                      onClick={stopSecRec} title="Stop and add the recorded melody">■ Stop &amp; add</button>
                  : <button className="btn" style={{ padding:"5px 11px" }} disabled={!recDest}
                      onClick={() => recDest && startSecRec(recDest)}
                      title="Record a melody from your microphone">🔴 Record</button>}
                {recSec && <span className="recmeter" style={{ flex:"0 0 90px" }}><span className="recfill" style={{ width:(recLevel * 100) + "%" }} /></span>}
                {recSec && <span className="rechz">{recHz ? SEMI_NAME[((Math.round(hzToMidiF(recHz)) % 12) + 12) % 12] + " · " + Math.round(recHz) + " Hz" : "listening…"}</span>}
                <span className="keytag">→ lands on</span>
                <select value={sections.insts.some(s => s.key === impSec) ? impSec : ""} disabled={!!recSec}
                  onChange={e => setImpSec(e.target.value)}
                  title="Which section a hummed, imported or recorded melody lands on">
                  <option value="">first section{sections.insts[0] ? ` (${sections.insts[0].key} ${sections.insts[0].word})` : ""}</option>
                  {sections.insts.map(s => <option key={s.key} value={s.key}>{s.key} · {s.word}</option>)}
                </select>
              </div>
              <div className="row" style={{ marginTop:8, gap:"8px 10px", alignItems:"center", flexWrap:"wrap" }}>
                <span className="keytag">Record source</span>
                <span className="seg" title="What the recorder listens for — tunes pitch detection">
                  <button className={recSource === "guitar" ? "on" : ""} onClick={() => setRecSource("guitar")} disabled={!!recSec}>🎸 Guitar</button>
                  <button className={recSource === "voice" ? "on" : ""} onClick={() => setRecSource("voice")} disabled={!!recSec}>🎤 Voice</button>
                </span>
              </div>
            </div>
          )}
            </>);
          })()}

          {structSel && (
            <div className="row" style={{ marginTop:8, gap:8 }}>
              <span className="keytag">Contrast loop ②:</span>
              <select value={contrast.id} onChange={e => setContrast({ ...contrast, id:e.target.value })}>
                <option value="">Off — one loop throughout</option>
                {Object.entries(PROGRESSIONS).filter(([id]) => id !== progId)
                  .map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}
              </select>
              {contrast.id && (
                <select value={contrast.sec} onChange={e => setContrast({ ...contrast, sec:e.target.value })}>
                  <option value="C">for the choruses</option>
                  <option value="B">for the bridge</option>
                  <option value="V">for the verses</option>
                </select>
              )}
            </div>
          )}


          {tips && <p className="keytag" style={{ marginTop:8 }}>
            On each section: <b>▶</b> play from here · <b>🔁</b> loop just this section ·
            <b> {recSource === "guitar" ? "🎸" : "🎤"} Rec</b> record a {recSource} line straight onto its
            melody grid · <b>▸ melody</b> open the grid. Pick <b>🎸 Guitar / 🎤 Voice</b> above.
            Each section's <b>🥁</b> menu gives it its own drum kit (or silence) for contrast — build
            dynamics by dropping the drums out on a verse and bringing them back for the chorus.
          </p>}
          {/* ---- the arrangement at a glance ----
              The section list below tells you everything, one section at a time, which is no way
              to see whether the song has a shape. This is the whole thing on one line: blocks
              sized by how long each section actually is, and a lane per element underneath, so
              the drops, the drum drop-outs and the parts coming in are visible as a picture. */}
          {/* Shown for a plain loop too, not just a multi-section structure: the automation lanes
              live here, and "a four-bar loop with a filter sweep on it" is a perfectly good sketch. */}
          {sections.insts.length > 0 && (() => {
            const total = sections.totalBars || 1;
            // what each section actually plays, resolved the same way the scheduler resolves it
            const drumsIn = base => {
              const dd = DRUMS[secDrum[base] || drum];
              return !!(dd && dd.pattern);
            };
            const nParts = Math.max(0, ...Object.values(secMelos).map(s => nLayers(s)));
            /* `flat` is the part's columns, not its notes — an empty grid still has a column per
               beat. Testing its length therefore reported any section with a grid as "playing",
               which was invisible while every section had a narrative written into it and obvious
               the moment an empty one was added. A part is in only if some column holds a note. */
            const hasNotes = (d, i) => {
              const ly = (secMelos[d.key] || {}).layers && secMelos[d.key].layers[i];
              return !!(ly && ly.flat && ly.flat.some(c => c && c.length));
            };
            const partIn = (d, i) => {
              const sec = secMelos[d.key];
              const ly = sec && sec.layers[i];
              if (!ly || !hasNotes(d, i)) return false;
              return layerGain(ly, sec.layers.some(x => x.solo)) > 0;   // mute and solo both count
            };
            /* Each lane knows how to read its own state and how to flip it. `scope` is the honest
               part: drums and chords are stored per section *letter*, so flipping one moves every
               section that letters the same way, while a part's mute is per instance and a click
               on a "×4" run sets all four. The tooltip says which, rather than surprising you. */
            const lanes = [
              { name: "Drums", on: d => drumsIn(d.base),
                scope: r => `every ${r.word} section`,
                toggle: r => setSecDrum({ ...secDrum, [r.base]: drumsIn(r.base) ? "off" : "" }) },
              { name: "Chords", on: d => !secQuiet[d.base],
                scope: r => `every ${r.word} section`,
                toggle: r => setSecQuiet({ ...secQuiet, [r.base]: !secQuiet[r.base] }) },
              ...Array.from({ length: nParts }, (_, i) => ({
                name: LAYER_NAMES[i], on: d => partIn(d, i),
                scope: r => (r.items.length > 1 ? `all ${r.items.length} passes` : "this section"),
                // a run can hold several instances; mute them together so the lane matches the click
                toggle: r => setLayerPropMany(r.items.map(d => d.key), i, { mute: r.items.some(d => partIn(d, i)) }),
                // a part with no notes here has nothing to mute — the lane is empty for a reason
                dead: r => !r.items.some(d => hasNotes(d, i)) })),
            ];
            // One block per *run* of consecutive same-section instances, not per instance. Eight
            // passes of a drop is one 32-bar drop to anybody reading the arrangement, and drawing
            // it as eight slivers turns a 200-bar structure into unreadable confetti.
            // Runs are keyed on the plan row an instance came from, so a block on the strip is
            // exactly one row of the arrangement — which is what makes it editable. (Keying on the
            // section name instead would merge two adjacent rows that happen to share a name.)
            const runs = [];
            sections.insts.forEach(d => {
              const r = runs[runs.length - 1];
              if (r && r.row === d.row) { r.items.push(d); r.bars += d.nbars; }
              else runs.push({ base: d.base, sec: d.sec, word: d.word, row: d.row,
                items: [d], bars: d.nbars, startBar: d.startBar });
            });
            // a lane is full, empty, or partly on across the run's instances
            const laneState = (l, r) => {
              const n = r.items.filter(l.on).length;
              return n === 0 ? "off" : n === r.items.length ? "on" : "part";
            };
            // a ruler tick roughly every eighth of the song, rounded to a sensible bar count
            const step = [4, 8, 16, 32, 64].find(s => total / s <= 12) || 128;
            const ticks = [];
            for (let bar = 0; bar < total; bar += step) ticks.push(bar);
            return (
              <>
              <div className="tl">
                <div className="tlgut">
                  <div className="tlglbl tlgruler" />
                  <div className="tlglbl tlgsec">{total} bars</div>
                  {lanes.map(l => <div key={l.name} className="tlglbl">{l.name}</div>)}
                  {AUTO_LANES.map(L => <div key={L.id} className="tlglbl tlgauto">{L.name}</div>)}
                </div>
                <div className="tltrk">
                  <div className="tlruler">
                    {ticks.map(bar => <span key={bar} className="tltick" style={{ left: (bar / total * 100) + "%" }}>{bar + 1}</span>)}
                  </div>
                  <div className="tlrow tlsecs">
                    {runs.map(r => {
                      const acc = SEC_COL[r.base] || "#8B94A3";
                      const now = playing && r.items.some(d => d.key === curInst);
                      const looped = r.items.some(d => d.key === loopSec);
                      const mv = secMove[r.base] && MOVES[secMove[r.base]];
                      const n = r.items.length;
                      return (
                        <button key={r.startBar} className={"tlsec" + (now ? " now" : "") + (looped ? " looped" : "")
                            + (editArr && selRow === r.row ? " picked" : "")}
                          style={{ flex: r.bars + " 0 0%", background: acc + (now ? "44" : "22"), borderColor: acc + (now ? "" : "77") }}
                          onClick={() => editArr ? setSelRow(r.row) : startMetro(r.startBar)}
                          title={`${r.sec}${n > 1 ? ` ×${n}` : ""} · ${r.bars} bar${r.bars > 1 ? "s" : ""} from bar ${r.startBar + 1}`
                            + (mv ? ` · ${mv.name}` : "") + (looped ? " · looping" : "")
                            + (editArr ? " — tap to edit this section" : " — tap to play from here")}>
                          {/* the label is left-aligned and clipped rather than centred, so a narrow
                              block truncates to its first letters instead of showing a word's middle */}
                          <span className="tlsecl" style={{ color: acc }}>{r.sec}{n > 1 ? " ×" + n : ""}</span>
                          {mv && <span className="tlmv" aria-hidden="true">🎛</span>}
                        </button>
                      );
                    })}
                  </div>
                  {lanes.map(l => (
                    <div key={l.name} className="tlrow">
                      {runs.map(r => {
                        const st = laneState(l, r);
                        const dead = l.dead ? l.dead(r) : false;
                        return <button key={r.startBar} className={"tlcell " + st + (dead ? " dead" : "")}
                          style={{ flex: r.bars + " 0 0%",
                            background: st === "off" ? undefined
                              : (SEC_COL[r.base] || "#8B94A3") + (st === "on" ? "AA" : "55") }}
                          disabled={dead}
                          onClick={() => l.toggle(r)}
                          title={dead ? `${l.name} has nothing written in ${r.sec} — write something there first`
                            : `${st === "off" ? "Bring in" : "Drop"} ${l.name} for ${l.scope(r)}`
                              + (st === "part" ? " (currently in for some passes and out for others)" : "")} />;
                      })}
                    </div>
                  ))}
                  {/* Automation lanes. Drag across one to draw a curve; the value is the height
                      you drag at. Drawn in song-bar coordinates so a curve keeps its shape when
                      sections around it move. */}
                  {AUTO_LANES.map(L => {
                    const pts = (auto.key === planKey && auto[L.id]) || null;
                    const barAt = (e, el) => {
                      const r = el.getBoundingClientRect();
                      return { bar: Math.max(0, Math.min(total - 1, Math.floor((e.clientX - r.left) / r.width * total))),
                        v: Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height)) };
                    };
                    const write = next => setAuto(a => ({ ...(a.key === planKey ? a : { key: planKey }), key: planKey, [L.id]: next }));
                    return (
                      <div key={L.id} className={"tlauto" + (pts && pts.length ? " has" : "")}
                        title={L.tip + " Drag to draw; the ✕ clears it."}
                        onPointerDown={e => {
                          e.currentTarget.setPointerCapture(e.pointerId);
                          const p = barAt(e, e.currentTarget);
                          drawRef.current = { lane: L.id, bar: p.bar, v: p.v };
                          write(autoSet(pts, p.bar, p.v));
                        }}
                        onPointerMove={e => {
                          const d = drawRef.current;
                          if (!d || d.lane !== L.id) return;
                          const p = barAt(e, e.currentTarget);
                          // fill the bars the pointer skipped, or a fast drag leaves holes in the line
                          write(autoDraw(pts, d.bar, p.bar, d.v, p.v));
                          drawRef.current = { lane: L.id, bar: p.bar, v: p.v };
                        }}
                        onPointerUp={() => { drawRef.current = null; }}
                        onPointerCancel={() => { drawRef.current = null; }}>
                        {pts && pts.length > 0 && (
                          <svg viewBox={`0 0 ${total} 100`} preserveAspectRatio="none" className="tlcurve">
                            <polyline points={Array.from({ length: total + 1 }, (_, b) =>
                              `${b},${100 - (autoAt(pts, b) || 0) * 100}`).join(" ")} />
                          </svg>
                        )}
                        <span className="tlautol">{L.name}</span>
                        {pts && pts.length > 0 &&
                          <button className="tlautox" title={"Clear the " + L.name + " automation"}
                            onPointerDown={e => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); write(null); }}>✕</button>}
                      </div>
                    );
                  })}
                  {curSongBar >= 0 &&
                    <div className="tlhead" style={{ left: (curSongBar / total * 100) + "%" }} />}
                </div>
              </div>
              {/* The arrangement editor: a picked structure is a starting point, not a cage. There is
                  nothing to edit without one — a plain loop has no plan, only the loop — so the
                  button is not offered rather than opening onto an empty toolbar. */}
              <div className="row" style={{ gap:"6px 8px", alignItems:"center", flexWrap:"wrap", marginTop:8 }}>
                {effPlan && effPlan.length
                  ? <button className={"mini" + (editArr ? " mixon" : "")} onClick={() => setEditArr(v => !v)}
                      title="Reorder sections, change how many passes each gets, add and remove them">
                      {editArr ? "✎ Editing" : "✎ Edit arrangement"}
                    </button>
                  : tips && <span className="keytag" style={{ margin:0 }}>
                      Pick a song structure above to build an arrangement you can edit.
                    </span>}
                {customPlan && <span className="keytag" style={{ margin:0, color:GOLD }}>edited</span>}
                {customPlan && <button className="mini" onClick={resetPlan}
                  title="Throw the edits away and go back to the structure as written">↺ Reset</button>}
                {editArr && effPlan && effPlan.length > 0 && (() => {
                  const rows = effPlan;
                  const cur = rows[selRow] || rows[0] || {};
                  const at = Math.min(selRow, rows.length - 1);
                  return (<>
                    <span className="keytag" style={{ margin:0 }}>
                      <b style={{ color: SEC_COL[letterFor(cur.sec || "")] || "#EAE2CC" }}>{cur.sec}</b>
                      {" "}· {cur.reps || 1} pass{(cur.reps || 1) > 1 ? "es" : ""}
                    </span>
                    <button className="mini" onClick={() => moveRow(at, -1)} disabled={at <= 0} title="Move this section earlier">◀</button>
                    <button className="mini" onClick={() => moveRow(at, 1)} disabled={at >= rows.length - 1} title="Move this section later">▶</button>
                    <button className="mini" onClick={() => bumpReps(at, -1)} disabled={(cur.reps || 1) <= 1}
                      title="One pass fewer — a shorter section">− pass</button>
                    <button className="mini" onClick={() => bumpReps(at, 1)} title="One pass more — a longer section">＋ pass</button>
                    <button className="mini" onClick={() => dupRow(at)} title="Duplicate this section, with its melodies">⧉ Copy</button>
                    <button className="mini" onClick={() => delRow(at)} disabled={rows.length <= 1}
                      title="Remove this section from the song">🗑</button>
                    <select className="fxsel" value="" onChange={e => { if (e.target.value) addRow(e.target.value); }}
                      title="Add a new section after the selected one">
                      <option value="">＋ add section…</option>
                      {ADDABLE.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                    </select>
                  </>);
                })()}
              </div>
              {editArr && tips && <p className="arrnote" style={{ marginTop:6 }}>
                Tap a block to pick it, then reorder it, give it more or fewer passes, copy it or
                remove it. Melodies travel with their section — a copied section arrives with the
                notes already in it, and moving one does not shuffle anyone else's.
              </p>}
            </>
            );
          })()}
          {tips && sections.insts.length > 0 && <p className="keytag" style={{ marginTop:6 }}>
            The strip above is the whole song end to end — each block is a section, as wide as it is
            long, and the lanes under it show what is playing where. Gaps in a lane are a part
            sitting out. Tap a block to play from there.
          </p>}
          {(() => {
            const groups = [];
            sections.insts.forEach(d => {
              const g = groups[groups.length - 1];
              if (g && g.base === d.base) g.items.push(d);
              else groups.push({ base: d.base, word: d.word, items: [d] });
            });
            return groups.map((g, gi) => (
              <div key={gi} className="sgrp" style={{ borderColor: (SEC_COL[g.base] || "#2A3442") + "55" }}>
                <div className="sgrphdr">
                  <div className="sgrplbl" style={{ color: SEC_COL[g.base] || "#8B94A3" }}>
                    {g.word}{g.items.length > 1 ? "s ×" + g.items.length : ""}
                  </div>
                  <label className="secdrum" title="Drum kit for this section — overrides the global Drums choice">
                    <span aria-hidden="true">🥁</span>
                    <select value={secDrum[g.base] || ""}
                      onChange={e => setSecDrum({ ...secDrum, [g.base]: e.target.value })}>
                      <option value="">global drums</option>
                      {metricDrums.map(([id, dd]) => <option key={id} value={id}>{dd.name}</option>)}
                    </select>
                  </label>
                  <label className="secdrum" title="Arrangement move for this section — a filter sweep, riser or drop, run across the section's whole length">
                    <span aria-hidden="true">🎛</span>
                    <select value={secMove[g.base] || ""}
                      onChange={e => setSecMove({ ...secMove, [g.base]: e.target.value })}>
                      {Object.entries(MOVES).map(([id, mv]) => <option key={id} value={id}>{mv.name}</option>)}
                    </select>
                  </label>
                </div>
                {g.items.map((d, di) => {
            const sec = secMelos[d.key] || EMPTY_SEC;
            const cols = d.cs.length * meloBeats;
            const open = !!openSecs[d.key];
            const has = secHasNotes(sec);
            const donor = !has && sections.insts.find(o => o.base === d.base && o.key !== d.key
              && secHasNotes(secMelos[o.key]));
            const now = playing && curInst === d.key;
            const acc = SEC_COL[d.base] || "#EDE7DA";
            return (
              <div key={di} className={"arr" + (now ? " playnow" : "")}
                style={now ? { borderLeft: "3px solid " + acc } : null}>
                <div className="row" style={{ justifyContent:"space-between", alignItems:"baseline" }}>
                  <div className="arrsec" onClick={() => startMetro(d.startBar)} style={{ cursor:"pointer" }}
                    title="Play from here">
                    <b className="sym" style={{ color: acc }}>{now ? "▶ " : ""}{d.key}</b> {d.word}
                    <span className="arrreps"> · {d.nbars} bar{d.nbars > 1 ? "s" : ""}{d.usedC ? " · ②" : ""}</span></div>
                  <div className="row" style={{ gap:5 }}>
                    <button className="mini" onClick={() => startMetro(d.startBar)} title="Play from here">▶</button>
                    <button className={"mini" + (loopSec === d.key ? " loopon" : "")} onClick={() => toggleLoopSec(d)}
                      title={loopSec === d.key ? "Looping this section — tap to stop" : "Loop just this section on playback"}>
                      🔁{loopSec === d.key ? " on" : ""}
                    </button>
                    {donor && <button className="mini" onClick={() => copyMelody(donor.key, d.key)}>copy {donor.key}</button>}
                    {recSec === d.key
                      ? <button className="mini recstop" onClick={stopSecRec} title="Stop & transcribe onto this section">■ Stop</button>
                      : <button className="mini recbtn" onClick={() => startSecRec(d.key)} disabled={!!recSec}
                          title={`Record a ${recSource} line straight onto ${d.key}'s melody grid (overwrites it)`}>
                          {recSource === "guitar" ? "🎸" : "🎤"} Rec</button>}
                    <button className="mini" onClick={() => setOpenSecs({ ...openSecs, [d.key]: !open })}>
                      {open ? "▾" : "▸"} melody{has ? " ●" : ""}
                    </button>
                  </div>
                </div>
                {recSec === d.key && (
                  <div className="recbar">
                    <div className="recmeter"><div className="recfill" style={{ width: (recLevel * 100) + "%" }} /></div>
                    <span className="rechz">{recHz ? SEMI_NAME[((Math.round(hzToMidiF(recHz)) % 12) + 12) % 12] + " · " + Math.round(recHz) + " Hz" : "listening…"}</span>
                    <span className="keytag">Play {recSource === "guitar" ? "a single-note line" : "your tune"}, one note at a time · press ■ Stop when done</span>
                  </div>
                )}
                <div className="arrch">{d.str}</div>
                {d.note && <div className="arrnote">{d.note}</div>}
                {open && (() => {
                  const tab = melTab[d.key] || "write";
                  const pick = sugSel[d.key] || { pat: MELODY_PATTERNS[0].id, start: 0 };
                  const curPat = MELODY_PATTERNS.find(p => p.id === pick.pat) || MELODY_PATTERNS[0];
                  const rhy = rhySel[d.key] || "straight";
                  const curRhy = RHYTHMS.find(r => r.id === rhy) || RHYTHMS[0];
                  const nL = nLayers(sec);
                  const secL = Math.min(melLayer, nL - 1);         // which part this section's edits target
                  // a fresh copy of the melody-voice option list (used by both per-layer instrument menus)
                  const leadOpts = () => (<>
                    <option value="">Lead default</option>
                    <optgroup label="Synth (no download)">
                      {LEAD_VOICES.filter(([id]) => !isGM(id)).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </optgroup>
                    {GM_CATS.map(([cat, list]) => (
                      <optgroup key={cat} label={"◈ " + cat}>
                        {list.map(([k, label]) => <option key={cat + k} value={k}>{label}</option>)}
                      </optgroup>
                    ))}
                  </>);
                  return (
                  <div style={{ marginTop:8 }}>
                    {/* layer switch + the active layer's own instrument */}
                    <div className="row" style={{ gap:6, alignItems:"center", marginBottom:8, flexWrap:"wrap" }}>
                      <span className="keytag" style={{ margin:0 }}>Part</span>
                      {sec.layers.map((ly, li) => (
                        <button key={li} className="lybtn" title={"Melody part " + LAYER_NAMES[li]}
                          style={{ background: LAYER_INK[li], borderColor: LAYER_INK[li], color:"#0c1116",
                            opacity: secL === li ? 1 : .45 }}
                          onClick={() => setMelLayer(li)}>{LAYER_NAMES[li]}</button>
                      ))}
                      {nL < MAX_LAYERS &&
                        <button className="lybtn" onClick={() => addLayer(d.key)}
                          title="Add another melody part — a bassline, a pad, an arp">＋ part</button>}
                      <div className="selwrap" style={{ minWidth:150, marginLeft:6 }}>
                        <span className="keytag">{LAYER_NAMES[secL]} instrument</span>
                        <select value={(layerOf(sec, secL) || {}).instr || ""}
                          onChange={e => setSecInstr(d.key, secL, e.target.value)}>
                          {leadOpts()}
                        </select>
                      </div>
                      {secL > 0 && <button className="mini" onClick={() => removeLayer(d.key, secL)}
                        title={"Remove part " + LAYER_NAMES[secL]}>🗑 {LAYER_NAMES[secL]}</button>}
                    </div>

                    {/* the active part's register and level — what turns six voices into an arrangement */}
                    {(() => {
                      const ly = layerOf(sec, secL) || {};
                      const oct = ly.oct || 0, vol = ly.vol == null ? 1 : ly.vol;
                      const anySolo = sec.layers.some(l => l.solo);
                      const set = patch => setLayerProp(d.key, secL, patch);
                      return (
                        <div className="row partmix" style={{ gap:10, alignItems:"center", marginBottom:8, flexWrap:"wrap" }}>
                          <span className="keytag" style={{ margin:0 }}>Octave</span>
                          <div className="row" style={{ gap:4, alignItems:"center" }}>
                            <button className="mini" disabled={oct <= LAYER_OCT_MIN}
                              onClick={() => set({ oct: Math.max(LAYER_OCT_MIN, oct - 1) })}
                              title="Drop this part an octave">−</button>
                            <span className="octval">{oct > 0 ? "+" + oct : oct}</span>
                            <button className="mini" disabled={oct >= LAYER_OCT_MAX}
                              onClick={() => set({ oct: Math.min(LAYER_OCT_MAX, oct + 1) })}
                              title="Lift this part an octave">＋</button>
                          </div>
                          <span className="keytag" style={{ margin:0 }}>Level</span>
                          <input className="lvl" type="range" min="0" max="100" value={Math.round(vol * 100)}
                            onChange={e => set({ vol: +e.target.value / 100 })}
                            title={"Level of part " + LAYER_NAMES[secL]} />
                          <span className="octval">{Math.round(vol * 100)}</span>
                          <span className="keytag" style={{ margin:0 }}>Echo</span>
                          <input className="lvl" type="range" min="0" max="100" value={Math.round((ly.send || 0) * 100)}
                            onChange={e => set({ send: +e.target.value / 100 })}
                            disabled={delayId === "off"}
                            title={delayId === "off" ? "Pick a Delay time in the top panel first" : "How much of this part is echoed"} />
                          <span className="octval">{Math.round((ly.send || 0) * 100)}</span>
                          <button className={"mini" + (ly.mute ? " mixon" : "")} onClick={() => set({ mute: !ly.mute })}
                            title="Silence this part">{ly.mute ? "muted" : "mute"}</button>
                          <button className={"mini" + (ly.solo ? " mixon" : "")} onClick={() => set({ solo: !ly.solo })}
                            title="Hear this part alone">{ly.solo ? "soloed" : "solo"}</button>
                          {anySolo && !ly.solo && <span className="keytag" style={{ margin:0, opacity:.75 }}>another part is soloed</span>}
                        </div>
                      );
                    })()}

                    {/* The three production controls that make a part sound like dance music rather
                        than a tune played on a synth: an arp that follows the chords, a gate that
                        chops it into a pulse, and its own sidechain depth. */}
                    {(() => {
                      const ly = layerOf(sec, secL) || {};
                      const fx = layerFx(ly);
                      const set = patch => setLayerProp(d.key, secL, patch);
                      return (<>
                        <div className="row partmix" style={{ gap:10, alignItems:"center", marginBottom:8, flexWrap:"wrap" }}>
                          <span className="keytag" style={{ margin:0 }}>Arp</span>
                          <select className="fxsel" value={fx.arp} onChange={e => set({ arp: e.target.value })}
                            title="Ignore this part's written notes and walk the chord under each bar instead — it re-follows the harmony whenever you change a chord">
                            <option value="">off — play the grid</option>
                            {ARPS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                          {fx.arp && <>
                            <select className="fxsel" value={fx.arpRate} onChange={e => set({ arpRate: +e.target.value })}
                              title="How fast the arp runs">
                              {ARP_RATES.map(([r, n]) => <option key={r} value={r}>{n}</option>)}
                            </select>
                            <select className="fxsel" value={fx.arpOct} onChange={e => set({ arpOct: +e.target.value })}
                              title="How many octaves the arp climbs through">
                              {[1, 2, 3, 4].map(o => <option key={o} value={o}>{o} oct</option>)}
                            </select>
                          </>}
                          <span className="keytag" style={{ margin:0 }}>Gate</span>
                          <select className="fxsel" value={fx.gate} onChange={e => set({ gate: e.target.value })}
                            title="Chop this part into a rhythmic pulse — the trance gate. Works best on a held pad or a long arp.">
                            <option value="">off</option>
                            {GATES.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                          </select>
                          <span className="keytag" style={{ margin:0 }}>Pump</span>
                          <input className="lvl" type="range" min="-1" max="100"
                            value={fx.duck == null ? -1 : Math.round(fx.duck * 100)}
                            onChange={e => set({ duck: +e.target.value < 0 ? null : +e.target.value / 100 })}
                            title="How hard the kick ducks this part. All the way left follows the global Pump; move it and this part gets its own depth — a bass that ducks hard under a pad that barely moves." />
                          <span className="octval">{fx.duck == null ? "auto" : Math.round(fx.duck * 100)}</span>
                        </div>
                        {tips && fx.arp && <p className="arrnote" style={{ marginTop:-4, marginBottom:8 }}>
                          Part {LAYER_NAMES[secL]} is arping the chords, so its grid below is not
                          being played — clear the arp to go back to the written notes.
                        </p>}
                      </>);
                    })()}

                    <div className="seg" style={{ marginBottom:8 }}>
                      <button className={tab === "write" ? "on" : ""}
                        onClick={() => setMelTab({ ...melTab, [d.key]: "write" })}>✎ Write</button>
                      <button className={tab === "suggest" ? "on" : ""}
                        onClick={() => setMelTab({ ...melTab, [d.key]: "suggest" })}>✨ Suggest</button>
                    </div>

                    {tab === "suggest" && (
                      <div className="sugmel">
                        <div className="selrow" style={{ flexWrap:"wrap", gap:8 }}>
                          <div className="selwrap" style={{ minWidth:170 }}>
                            <span className="keytag">Melody pattern</span>
                            <select value={pick.pat}
                              onChange={e => setSugSel({ ...sugSel, [d.key]: { ...pick, pat:e.target.value } })}>
                              {MELODY_PATTERNS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </div>
                          <div className="selwrap" style={{ minWidth:150, flex:"0 0 auto" }}>
                            <span className="keytag">Rhythm</span>
                            <select value={rhy}
                              onChange={e => setRhySel({ ...rhySel, [d.key]: e.target.value })}
                              title="Where the notes fall in the bar, and how long each lasts — separately from the shape of the tune">
                              {RHYTHMS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                          </div>
                          <div className="selwrap" style={{ minWidth:120, flex:"0 0 auto" }}>
                            <span className="keytag">Start note</span>
                            <select value={pick.start}
                              onChange={e => setSugSel({ ...sugSel, [d.key]: { ...pick, start:+e.target.value } })}>
                              {scaleSemis.map((s, i) => (
                                <option key={i} value={i}>{spell((tonic + s) % 12, tonic, effMode)} · degree {i + 1}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <p className="arrnote" style={{ marginTop:7 }}>Writing to melody <b>{LAYER_NAMES[secL]}</b>. {curPat.desc}</p>
                        <p className="arrnote" style={{ marginTop:3 }}><b>{curRhy.name}</b> — {curRhy.desc}</p>
                        {(() => {
                          // a counter-melody is written against another part; with nothing to
                          // answer it would write an empty grid, so say so rather than doing that
                          const leadL = sec.layers.findIndex((ly, i) => i !== secL && ly.flat.some(c => c.length));
                          const stuck = curPat.needs === "lead" && leadL < 0;
                          return (<>
                            {curPat.needs === "lead" && !stuck &&
                              <p className="arrnote" style={{ marginTop:3, color:GOLD }}>
                                Writing against part <b>{LAYER_NAMES[leadL]}</b>.
                              </p>}
                            {stuck &&
                              <p className="arrnote" style={{ marginTop:3, color:"#E9B3AB" }}>
                                This one is written against another part, and nothing else in this
                                section has any notes yet. Write a lead first.
                              </p>}
                            <div className="row" style={{ gap:6, marginTop:8 }}>
                              <button className="btn" disabled={stuck}
                                onClick={() => applyPattern(d, sec, pick.pat, pick.start, secL, rhy)}>
                                Write to grid</button>
                              <button className="mini" onClick={() => clearMelody(d, sec, secL)}>Clear melody {LAYER_NAMES[secL]}</button>
                            </div>
                          </>);
                        })()}
                      </div>
                    )}

                    {tab === "write" && (
                      <div className="melmodebar">
                        <div className="seg">
                          <button className={!melMove ? "on" : ""} onClick={() => { setMelMove(false); setMelSel({ key:"", layer:0, notes:{} }); }}>✎ Draw</button>
                          <button className={melMove ? "on" : ""} onClick={() => setMelMove(true)}>✋ Move</button>
                        </div>
                        {melMove && (() => {
                          const nSel = (melSel.key === d.key && melSel.layer === secL) ? Object.keys(melSel.notes).length : 0;
                          return (<>
                            <span className="rlbl">{nSel ? `${nSel} note${nSel > 1 ? "s" : ""} selected` : "drag a box over notes to select"}</span>
                            <button className="mini" disabled={!nSel} onClick={() => nudgeMel(0, 1)} title="Move up a scale step">▲</button>
                            <button className="mini" disabled={!nSel} onClick={() => nudgeMel(0, -1)} title="Move down a scale step">▼</button>
                            <button className="mini" disabled={!nSel} onClick={() => nudgeMel(-1, 0)} title="Move earlier">◀</button>
                            <button className="mini" disabled={!nSel} onClick={() => nudgeMel(1, 0)} title="Move later">▶</button>
                            <span className="rlbl" style={{ opacity:.6 }}>·</span>
                            <button className="mini" disabled={!nSel} onClick={() => timeMel(0.5)} title="Double-time — pack the selection into half the space (plays twice as fast)">½× time</button>
                            <button className="mini" disabled={!nSel} onClick={() => timeMel(2)} title="Half-time — stretch the selection over twice the space (plays half as fast)">2× time</button>
                            <span className="rlbl" style={{ opacity:.6 }}>·</span>
                            <button className="mini" disabled={!nSel} onClick={() => echoMel(0)} title="Repeat — copy the selection right after itself at the same pitch">⧉ Repeat</button>
                            <button className="mini" disabled={!nSel} onClick={() => echoMel(1)} title="Sequence up — copy right after, one scale step higher (a rising sequence; tap again to keep climbing)">Seq ▲</button>
                            <button className="mini" disabled={!nSel} onClick={() => echoMel(-1)} title="Sequence down — copy right after, one scale step lower">Seq ▼</button>
                            <button className="mini" disabled={nSel < 2} onClick={invertMel} title="Invert — flip the melody's shape upside-down around its first note">⤯ Invert</button>
                            <button className="mini" disabled={nSel < 2} onClick={reverseMel} title="Reverse — play the selection backwards (retrograde)">↤ Reverse</button>
                            <button className="mini" disabled={!nSel} onClick={callResponseMel} title="Call & response — echo the phrase right after itself as an answer that resolves home to the tonic">↩ Answer</button>
                            <span className="rlbl" style={{ opacity:.6 }}>·</span>
                            <button className="mini" onClick={() => selectAllMel(d.key, secL)} title="Select every note in this melody (even off-screen)">Select all</button>
                            <button className="mini" disabled={!nSel} onClick={deleteMelSel} title="Delete selected">🗑</button>
                          </>);
                        })()}
                      </div>
                    )}

                    <div className={"mscroll" + (melMove ? " mvmode" : "")}>
                      <div className="mline" style={{ gridTemplateColumns:`36px repeat(${cols}, minmax(15px,1fr))` }}>
                        <span />
                        {d.cs.map((c, b) => (
                          <span key={b} className="mbar" style={{ gridColumn:`span ${meloBeats}`,
                            background: FN_COLOR[c.func || "T"], color: FN_TEXT[c.func || "T"] }}>{c.name}</span>
                        ))}
                      </div>
                      {[...scaleSemis.keys()].reverse().map(deg => (
                        <div key={deg} className="mline" style={{ gridTemplateColumns:`36px repeat(${cols}, minmax(15px,1fr))` }}>
                          <span className="mnote">{spell((tonic + scaleSemis[deg]) % 12, tonic, effMode)}</span>
                          {Array.from({ length: cols }, (_, c) => {
                            // which parts sound this note here; the cell takes the first one's ink,
                            // and a note shared by two parts is split diagonally between them
                            const hits = sec.layers.reduce((a, ly, li) =>
                              ((ly.flat[c] || []).includes(deg) ? [...a, li] : a), []);
                            const onA = hits.length > 0;
                            const inkA = onA ? LAYER_INK[hits[0]] : null;
                            const inkB = hits.length > 1 ? LAYER_INK[hits[1]] : null;
                            const isSel = melMove && melSel.key === d.key && melSel.layer === secL && melSel.notes[nKey(c, deg)];
                            const inBox = melBox && melBox.key === d.key && c >= melBox.c0 && c <= melBox.c1 && deg >= melBox.d0 && deg <= melBox.d1;
                            const isGhost = melGhost && melGhost.key === d.key && melSel.key === d.key && melSel.layer === secL
                              && melSel.notes[nKey(c - melGhost.dc, deg - melGhost.dd)];
                            return (
                            <div key={c} data-mk={d.key} data-c={c} data-deg={deg}
                              onClick={() => { if (!melMove) tapMelo(d.key, c, deg, secL); }}
                              onPointerDown={e => melDown(e, d.key, c, deg, sec, secL)}
                              // the inline colour would beat the .colnow CSS, so the playhead
                              // highlight has to be decided here too
                              style={!onA ? null : (playing && curQ && curQ.sym === d.key && curQ.col === c)
                                ? { background: inkB ? "linear-gradient(135deg, #EAE2CC 0 55%, #d9c2ff 55% 100%)" : "#EAE2CC",
                                    borderColor: "#EAE2CC" }
                                : { background: inkB ? `linear-gradient(135deg, ${inkA} 0 55%, ${inkB} 55% 100%)` : inkA,
                                    borderColor: inkB || inkA }}
                              className={"mcell" + (onA ? " on" : "") + (melMove ? " mv" : "")
                                + (isSel ? " msel" : "") + (isGhost ? " mghost" : "") + (inBox ? " mbox" : "")
                                + (playing && curQ && curQ.sym === d.key && curQ.col === c ? " colnow" : "")
                                + (c % meloBeats === 0 && c > 0 ? " b0" : c % meloSub === 0 && c > 0 ? " bt" : "")} />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                  );
                })()}
              </div>
            );
          })}
              </div>
            ));
          })()}

          <div className="struct">
            {structSel && <div className="sttip">{structSel.st.tip}</div>}
            {tips && <p className="keytag" style={{ marginTop:8 }}>
              {structSel
                ? <>≈ {sections.totalBars} bars at one chord per bar. Every pass has its own melody — "copy"
                  duplicates an earlier sibling's tune as a starting point, then vary it.</>
                : <>Choose a structure above to write the song out pass by pass, each with its own melody —
                  or sketch over the loop here.</>}
            </p>}
          </div>
        </div>}


        {/* songs */}
        {tab === "write" && <div className="panel">
          <div className="progtitle" style={{ fontSize:17 }}>Songs on this progression</div>

          {appliedMoves.length > 0 && (
            <div>
              <p className="keytag" style={{ margin:"4px 0 0" }}>
                You've edited the progression — exact catalogue matches get rarer, but these songs use the same moves:
              </p>
              {appliedMoves.map((m, i) => (
                <div key={"am"+i} className="sug">
                  <div className="sugname" style={{ color: m.color }}>{m.label}</div>
                  <div className="arrnote">{m.why}</div>
                  {m.songs && <div className="sugsongs">{m.songs.join("  ·  ")}</div>}
                </div>
              ))}
              <div className="lbl" style={{ marginTop:12 }}>Original (unedited) progression</div>
            </div>
          )}

          <div className="row" style={{ marginTop: appliedMoves.length ? 4 : 8 }}>
            <select value={selSong.startsWith(progId + ":") ? selSong : ""} onChange={e => setSelSong(e.target.value)}
              style={{ flex:1 }}>
              <option value="">Choose a song…</option>
              {prog.songs.map((s, i) => <option key={i} value={progId + ":" + i}>{s}</option>)}
            </select>
          </div>
          {(() => {
            if (!selSong.startsWith(progId + ":")) {
              return tips ? <p className="keytag" style={{ marginTop:8 }}>
                Ten songs run on this engine — pick one to see the progression in its own key.</p> : null;
            }
            const i = +selSong.split(":")[1];
            const k = (SONG_KEYS[progId] || [])[i];
            const line = k == null ? null :
              prog.numerals.map(n => { const [off, q] = numDefs[n]; return chordName((k + off) % 12, q); })
                .join(prog.numerals.length > 6 ? "  |  " : " – ");
            return (
              <div className="struct" style={{ borderTop:"none", marginTop:6, paddingTop:2 }}>
                <div className="stname">{prog.songs[i]}</div>
                {line && <div className="arrch" style={{ marginTop:4 }}>{line}</div>}
                {k != null && <div className="arrnote">in {spell(k, k, prog.mode)} {MODES[modeId(prog.mode)].short}
                  {tips && <> — key follows the most common recording or transcription; some originals sit between keys or use altered tunings.</>}</div>}
              </div>
            );
          })()}
        </div>}
      </div>
    </div>
  );
}
