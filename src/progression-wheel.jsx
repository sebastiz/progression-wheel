import { useState, useMemo, useRef, useEffect } from "react";
import { FUNC_MAJOR, FUNC_MINOR, MAJOR_NUM, MAJOR_SIG, MINOR_NUM, MODES, MODE_IDS, QSUF, SEMI_NAME, chordIvs, chordName, famMin, modeFamily, modeId, posOf, spell } from "./theory.js";
import { CATEGORIES, GENRE_GROUPS, LETTER_WORD, PAR_SONGS, PLANS, PROGRESSIONS, SEC_SONGS, SONG_KEYS, STRUCTURES, STRUCT_FAMILIES, UNIVERSAL, letterFor } from "./progressions.js";
import { BASS, BASS_IV, PERCS, STYLE_PRESETS, PERC_VOICES, PERC_ORDER, PERC_MIDI, PERC_KITS, BPM_DEFAULT, DRUMS, DRUM_CUTS, DRUM_MIDI, DRUM_VOICES, METERS, METER_BY_ID, beatFrom, beatHits, beatSteps, beatToggle, blankBeat, drumFitsMeter, meterOf, DRUM_DEFAULT, DRUM_KITS, KIT_DEFAULT, PATTERNS, PATTERN_DEFAULT, PUMPS, PUMP_AMT, PUMP_DEFAULT, accentAt, beatsOf, drumBeatsOf, lcm, sampleAt, stepAt, subOf } from "./patterns.js";
import { audioBufferToWav, peakOf } from "./wav.js";
import { BASS_VOICES, PAD_VOICES, playBass, percSound, DELAY_TIMES, FAM_LEAD, FILTER_OPEN, FX_PARAMS, FX_TYPES, GM_CATS, LEAD_VOICES, MOVES, TRANS, TRANS_CATS, applyMove, applyTrans, makeTrans, clickSound, drumSound, duckAt, fxDefaults, gmFam, gmKey, isGM, leadNote, driveCurve, makeDelay, makeFxMultiRack, makeNoise, makeReverb, makeSampler, makeVerbSend, NO_SHAPE, playHit, playLeadSampled, playSampled, programOf, sfPrefetch, voiceChord } from "./audio.js";
import { midiBytes, parseMidiMelody } from "./midi.js";
import { ALS_COLORS, alsBytes } from "./als.js";
import { REC_SOURCES, hzToMidiF, recDetectPitch, recToEvents, recTrackNotes } from "./pitch.js";
import { decodeSong, encodeSong, makeSong, songBeats, songMelos, unpackBeats } from "./song.js";
import { ARPS, ARP_BY_ID, ARP_RATES, GATES, GATE_BY_ID, MEL_GRIDS, gridSub, hash01, layerFx, LAYER_DEFAULT_INSTR, LAYER_DEFAULT_OCT, LAYER_DEFAULT_VOL, LAYER_INK, LAYER_NAMES, LAYER_OCT_MAX, LAYER_OCT_MIN, MAX_LAYERS, MELODY_PATTERNS, MOD_GROUPS, MODS, MOD_BY_KEY, LFO_RATES, ECHO_TIMES, euclidHit, modOf, modCount, NARRATIVES, RHYTHMS, ROLE_RHYTHM, blankBars, layerGain, rescaleBar, rhythmSpots, varyBars, varyPass, varyWithin, partMoveOf, DRUM_MOVES, fillHitAt } from "./melody.js";
import { SYNC_LEVELS, bassRiffBars, hookPool, hookReport, mutateHook, riffShapeName, syncopateBars } from "./hook.js";
import { makeZip, safeName } from "./zip.js";
import { buildExportState } from "./export-state.js";
import { AUTO_LANES, autoAt, autoDel, autoDraw, autoPartId, autoSet, planAdd, planDel, planDup, planInsts, planMove, planReps, remapKeyed, remapSecs, transCues } from "./arrange.js";
import { TRACK_TYPES, TRACK_TYPE_BY_ID, newClip, newTrack, nextClipNum, sessionKey } from "./session.js";
import { DANCE_TEMPLATES, drumAmountOf, energyOf, resolveArrangement } from "./arrange-templates.js";
import { TRACK_PRESETS } from "./track-presets.js";
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

/* ---- one modulation control ----
   Every one of the part modulations is drawn by this, from its entry in MOD_GROUPS. That is the
   point of the table: a new modulation is one line of data, not a slider hand-written into a panel
   that already has two dozen of them and no two quite alike. */
const MOD_TABLES = {
  ARPS: ARPS.map(a => [a.id, a.name]),
  GATES: GATES.map(g => [g.id, g.name]),
  ARP_RATES, LFO_RATES, ECHO_TIMES,
};
// a menu hands back a string; the stored value has to keep the type its default has, or a rate of
// "4" fails every `=== 4` comparison the scheduler makes
const castLike = (dflt, s) => (typeof dflt === "number" ? +s : s);
function ModCtl({ mod, ly, onSet, disabled }) {
  const raw = modOf(ly, mod.k);
  const sc = mod.scale || 1;                       // stored 0..1, shown 0..100 for the two legacy mods
  const on = raw !== mod.dflt;                     // is this one doing anything?
  const lbl = <span className={"modlbl" + (on ? " modon" : "")}>{mod.name}</span>;
  if (mod.kind === "sel") {
    const opts = typeof mod.opts === "string" ? MOD_TABLES[mod.opts] : mod.opts;
    return (
      <label className="modctl" title={mod.tip}>
        {lbl}
        <select className="fxsel" value={raw} disabled={disabled}
          onChange={e => onSet({ [mod.k]: castLike(mod.dflt, e.target.value) })}>
          {mod.off != null && <option value="">{mod.off}</option>}
          {opts.map(([v, name]) => <option key={v} value={v}>{name}</option>)}
        </select>
      </label>
    );
  }
  // a slider. `auto` mods (Pump) sit one step below their minimum to mean "follow the global one",
  // which is a real value the part can be set back to rather than a checkbox beside the slider.
  const min = mod.auto ? -1 : (mod.min != null ? mod.min : 0);
  const cur = raw == null ? -1 : Math.round(raw * sc);
  const txt = raw == null ? "auto" : Math.round(raw * sc) + (mod.unit || "");
  return (
    <label className="modctl" title={mod.tip}>
      {lbl}
      <input className="lvl" type="range" min={min} max={mod.max} value={cur} disabled={disabled}
        onChange={e => {
          const n = +e.target.value;
          onSet({ [mod.k]: mod.auto && n < 0 ? null : n / sc });
        }} />
      <span className="modval">{txt}</span>
      {on && <button type="button" className="modrst" title={"Back to " + mod.name + "'s default"}
        onClick={() => onSet({ [mod.k]: mod.dflt })}>↺</button>}
    </label>
  );
}
/* ---- the per-track effect panels ----
   The melody part mixer's audio stage, pointed at a whole track. The controls are the same rows
   of MOD_GROUPS the parts use, drawn by the same ModCtl — note effects (arps, gates, echoes)
   stay with the parts, because they rewrite notes and a track is audio by the time it gets here. */
const TRACK_LVL = { k:"lvl", name:"Level", kind:"amt", dflt:100, max:100, unit:"%",
  tip:"This track's level in the mix." };
const TRACK_MODS = [TRACK_LVL, ...["cut","res","hp","drive","wob","wobRate","trem","tremRate",
  "pan","apan","apanRate","send","verb","duck"].map(k => MOD_BY_KEY[k])];
const TRACKS_FX = [["drums", "Drums", "🥁"], ["perc", "Percussion", "🪘"],
  ["bass", "Bass", "🎸"], ["pad", "Pad", "🌫️"]];
/* Extra tracks for drums/perc/bass/pad — the same "add a 2nd one" idea melody's layers (A-F)
   already give the lead. Rather than a second family of per-section state, an extra track reuses
   every map the first one already has (secDrum, secBassPat, secBassBeat, secBass mute, …), just
   under a suffixed key — "C2#1" is the second drums track of section C2. Every resolver that reads
   those maps by `d.key`/`d.base` therefore needs no change at all: pass it a `d` whose key/base
   already carry the suffix (see `layered` below) and it resolves exactly as it does for track 0,
   fallback chain and all. Only the groove-fallback ("nothing of my own — follow the sketch") had
   to learn to look up the *same-suffixed* groove key rather than the bare one, so a section's 2nd
   track follows the groove's 2nd track rather than its 1st. */
const LSEP = "#";
const layerSuf = key => { const i = key == null ? -1 : key.indexOf(LSEP); return i < 0 ? "" : key.slice(i); };
const layered = (d, li) => (!li || !d) ? d : { ...d, key: d.key + LSEP + li, base: d.base + LSEP + li };
/* The insert-effects rack's six buses. Drums, Perc, Bass and Pad each get their rack as a fifth
   "FX" tab inside their own trackFxRow (Sound tab and, per section, under their own grid in
   Arrange/Sketch) — see trackFxRow. "lead" is one shared rack all six melody parts feed into (see
   the note beside its wiring in chainOf) rather than a rack per part — one set of knobs, the
   simplest thing that is still useful, matching how the delay and reverb sends are one shared bus
   too — so it sits by the Lead voice picker on the Sound tab instead of inside a per-track panel
   it doesn't have. "master" sits just before the limiter, colouring the whole song, drums
   included, and belongs to no instrument at all, so it keeps its own small spot on the Sound tab.
   No bus picker remains anywhere: each bus's rack now lives at the one place that reads it. */
// icon for the one bus that still carries a per-section FX sub-panel of its own (sectionCard) —
// melody parts have no per-track tab strip to fold "lead"'s rack into the way drums/perc/bass/pad
// do, so it keeps this small standalone collapsible under the melody grid instead.
const FX_BUS_ICON = { lead:"🎵" };
/* Default make-up gain for the pitched sources, setting the mix's default hierarchy: the
   melody on top level with the drums, the bass beside them (its own anchor in audio.js already
   makes one low note carry), and the chords ~5 dB under the lead — comping at the lead's own
   level just masks it in the same register. Measured, not guessed: a bar of each source at its
   in-song gain, compared by K-weighted loudness (same method as scripts/measure-loudness.mjs).
   Each boost sits on the source's own bus inside the graph — upstream of the duck nodes and
   applied identically in a stem render — so the Level sliders still read 100% out of the box
   and the stems still sum to the mix. */
const CHORD_MAKEUP = 1.15, BASS_MAKEUP = 1.0, MELODY_MAKEUP = 2.0;

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
// what the strip marks a seam with — read off the transition table so a new family cannot arrive
// without one
const TRANS_GLYPH = Object.fromEntries(TRANS_CATS.map(([id, , , g]) => [id, g]));

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
  const TABS = [["write", "Write"], ["sound", "Sound"], ["sketch", "Sketch"], ["arrange", "Arrange"], ["session", "Session"], ["save", "Save"]];
  const [tab, setTab] = useState("write");
  const [wheelOpen, setWheelOpen] = useState(true);
  const [tips, setTips] = useState(false);  // show the longer explanatory guidance (off = neat)
  const [adv, setAdv] = useState(false);    // reveal the advanced harmony controls (secondary doms, etc.)
  const [showPar, setShowPar] = useState(false);
  const [showSec, setShowSec] = useState(false);
  const [selStruct, setSelStruct] = useState("");
  const [selSong, setSelSong] = useState("");
  const [trackSt, setTrackSt] = useState("");   // "recreate a famous track" — the TRACK_PRESETS id last picked
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
  /* The bass track: a pattern from BASS ("" = off — the chords keep carrying the root exactly as
     they always have) and a synth voice for it. Keyed by progression like the kit and the pump. */
  const [bassSt, setBassSt] = useState({ key:"", val:"" });
  const [bassVoiceSt, setBassVoiceSt] = useState({ key:"", val:"" });
  const [secBass, setSecBass] = useState({});               // per-section bass mute (true = out), like secQuiet
  /* The percussion layer — a second pattern from the same drum table, played on the song's kit
     over the main groove (shaker loops, offbeat hats, a conga pattern) — and the pad — a second
     chord voice holding the upper voicing a bar at a time. Both off by default, both with the
     same per-section mutes and drawn filter lanes the bass has. */
  const [percSt, setPercSt] = useState({ key:"", val:"" });
  const [secPerc, setSecPerc] = useState({});
  const [padSt, setPadSt] = useState({ key:"", val:"" });
  const [secPad, setSecPad] = useState({});
  /* The bass, perc and pad are authored on the sections, the way drums and melodies are: each
     section picks its pattern (or voice) from a menu, and bass and perc can be written on their
     own grids per pass. The global states above survive as what a template writes and what a
     section's "as the song" option inherits — they no longer have controls of their own. */
  const [secBassPat, setSecBassPat] = useState({});   // per-section bass pattern ("" inherit | "off" | id), instance-then-letter
  const [secBassBeat, setSecBassBeat] = useState({}); // a pass's own written bassline: bars of steps, each "" | R | F | O
  const [secPercPat, setSecPercPat] = useState({});   // per-section perc pattern, same shape as secDrum
  const [secPercBeat, setSecPercBeat] = useState({}); // a pass's own written perc bars, same shape as secBeat
  const [secPadVoice, setSecPadVoice] = useState({}); // per-section pad voice ("" inherit | "off" | id)
  const [openBass, setOpenBass] = useState({});       // which section bass grids are open
  const [openPercs, setOpenPercs] = useState({});     // which section perc grids are open
  const [openPads, setOpenPads] = useState({});       // which section pad grids are open
  const [openChordGrids, setOpenChordGrids] = useState({});   // which section chord-rhythm grids are open
  const [openOpts, setOpenOpts] = useState({});       // which sections' transitions-and-presets bars are open
  /* A pass's own pad rhythm (H holds, S stabs) and its own chord rhythm (>, D, U on the strum's
     vocabulary) — grids like the bass's, superseding the song's one-hold-a-bar pad and the global
     strum pattern for that pass alone. */
  const [secPadBeat, setSecPadBeat] = useState({});
  const [secChordBeat, setSecChordBeat] = useState({});
  /* Which groove melody parts a section leaves out — { secKey|letter: { partIdx: true } }. The
     groove's parts are *inherited* by sections with no melody of their own, so their allocation
     cannot live on the layers (writing a mute there would materialise a copy of the groove into
     the section, and editing the groove afterwards would no longer reach it). */
  const [secPartOut, setSecPartOut] = useState({});
  /* How many tracks each section instance's drums/perc/bass/pad carry — { key: { drums:2, bass:3 } },
     absent or 1 meaning just the one track every section already had. Track 0 is that original
     track and always exists; tracks 1+ are addressed via `layered` above, the same way melody's
     layers B-F are. Capped at MAX_LAYERS so the tab strip reads the same "A".."F" ceiling melody
     uses. Only the count lives here — a track's content lives in the same maps track 0 already
     used (secDrum, secBassPat, secBassBeat, …), just under a suffixed key. */
  const [secTrackLayers, setSecTrackLayers] = useState({});
  const [trackTab, setTrackTab] = useState({});   // { key: { drums: activeLayerIdx, bass: … } } — UI only
  /* The Sketch tab's draft arrangement — its own document, deliberately NOT the song's plan.
     Rows are sections the writer adds ({ sec, reps, on }), and `on` is that row's fills: which of
     the groove's tracks and melody parts the section plays ({ drums:true, p0:true }). A new
     section arrives EMPTY — silence is the starting point, and every instrument is clicked in —
     so the matrix is read the way the record is heard: what did this section earn?
     Nothing here is heard until ✍ Write to Arrange commits it, which is the point: the groove
     loops while the shape is drafted, and the arrangement only changes when it is asked to. */
  const [sketchArr, setSketchArr] = useState([]);
  const [sketchSel, setSketchSel] = useState(0);      // which draft row the toolbar edits (UI-only)
  /* The Session view: tracks (columns), each holding numbered clips. A clip's content lives in
     the same per-instance maps a section's own track does (melos.secs, secBeat, secBassBeat, …),
     keyed by sessionKey(trackId, clipId) — see session.js and the SESSION_PREFIX note in
     arrange.js. Only the roster — which tracks exist, which clip numbers each has — is its own
     state, the same division sketchArr draws for the groove sketch's draft rows. */
  const [sessionTracks, setSessionTracks] = useState([]);
  const [sessionSel, setSessionSel] = useState({ trackId:"", clipId:"" });   // which clip the editor below the grid shows
  const [sessionModGrp, setSessionModGrp] = useState("pattern");   // which mod group tab the clip editor shows, for a melody clip
  const [sessionPlaying, setSessionPlaying] = useState(false);
  const [sessionLive, setSessionLive] = useState({});    // UI mirror of sessionLiveRef, { trackId: clipId } — which clip is actually sounding
  const [sessionQueued, setSessionQueued] = useState({}); // UI mirror of sessionQueueRef, { trackId: clipId } — armed for the next bar
  const sessionModeRef = useRef(false);        // true while the Session transport (not the song's) is playing
  const sessionLiveRef = useRef({});           // { trackId: { clipId, startStep } } — the clip each track is actually playing, and when it started
  const sessionQueueRef = useRef({});          // { trackId: clipId } — queued to take over at the next bar
  const [percKitSt, setPercKitSt] = useState({ key:"", val:"" });   // hand vs machine percussion voicing
  /* Each track's effect panel: a sparse object of the same modulation keys the melody parts use
     (only values that differ from their default are stored), one per track. */
  const [trackFx, setTrackFx] = useState({});         // { drums:{...}, perc:{...}, bass:{...}, pad:{...} }
  const [openFx, setOpenFx] = useState({});           // which track effect panels are open
  const [trackFxTab, setTrackFxTab] = useState({});   // per track, which settings group is showing
  /* The insert-effects rack: two slots per bus, each `{ type, ...its own params }`. Sparse the same
     way trackFx is — a bus/slot never opened simply is not a key here, and `fxSlotRow` below hands
     back the "off" shape for it. */
  const [fxRack, setFxRack] = useState({});   // { master:[{},{}], drums:[{},{}], perc:[...], bass:[...], pad:[...], lead:[...] }
  /* A section's own copy of the insert rack for one bus — the same shape as `fxRack`'s own value
     (two slots), but keyed by section instance (falling back to the letter, exactly like secDrum),
     so the Drop can hit the bass with more distortion than the Breakdown. Sparse the same way
     fxRack is: a section that never opens its own copy of a bus simply is not a key here, and
     `effFx` below hands back the song's own rack for it. There is no "master" entry — master
     colours the whole song by design and stays song-wide-only (see the note beside TRACKS_FX). */
  const [secFx, setSecFx] = useState({});   // { key: { drums:[{},{}], perc:[...], bass:[...], pad:[...], lead:[...] } }
  const [openSecFx, setOpenSecFx] = useState({});   // which sections' per-bus FX sub-panels are open, keyed "key|bus"
  const [secDrum, setSecDrum] = useState({});               // per-section-type drum override, keyed by base letter ("" = follow global)
  // per-section-type chord mute, keyed by base letter. Dropping the chords for a breakdown while
  // the drums carry on is a basic arrangement move that had no way to be expressed before.
  const [secQuiet, setSecQuiet] = useState({});
  /* A section instance's own drum bars, written on its grid. The catalogue choice above is per
     section *type*, so every chorus shared one groove and none of them could be edited at all;
     this is per pass and editable, and it is stored in the same array-of-step-strings the
     catalogue uses, so playback, MIDI and the stem bounce need no path of their own. */
  const [secBeat, setSecBeat] = useState({});
  const [openBeats, setOpenBeats] = useState({});            // which section drum grids are open
  const [custom, setCustom] = useState({ key:"", plan:null });   // edited copy of a structure's plan
  const [auto, setAuto] = useState({ key:"", filter:null, level:null });  // drawn automation lanes
  const [editArr, setEditArr] = useState(false);                 // arrangement-editing mode on the strip
  const [selRow, setSelRow] = useState(0);                       // plan row the editor is pointed at
  const drawRef = useRef(null);                                  // in-progress automation drag
  /* Which plan row's sections are written out under the strip; null shows every one of them. A
     twelve-section song is a very long page, and all of it is off screen except the section you
     are actually working on — so the strip picks, and the page shows what was picked. */
  const [focusRow, setFocusRow] = useState(0);
  const [secMove, setSecMove] = useState({});
  /* What happens at the seam *into* a section, keyed the same way a move is: the instance's own
     (`secTrans.C2`), else the section letter's (`secTrans.C`). Keyed to the section it leads into
     rather than to the boundary, because a boundary has no stable name — insert a verse and every
     later boundary is a different boundary, while C2 is still C2 and carries its own transition. */
  const [secTrans, setSecTrans] = useState({});
  const [gridSt, setGridSt] = useState({ key:"", val:"" });     // melody grid resolution, keyed by progression
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
  const [varySt, setVarySt] = useState({ key:"", val:1 });  // how much a narrative varies each repeat of a section — continuous, 0..VARY_MAX
  /* The narrative write's other two dials: syncopation (0 as written, 1 backbeats pushed early,
     2 every beat), and whether the repeats *inside* each section — the restated motifs — are
     varied too, not just the later passes of the section. Keyed by progression like varySt. */
  const [narSyncSt, setNarSyncSt] = useState({ key:"", val:0 });
  const [narInSt, setNarInSt] = useState({ key:"", val:false });
  /* In-section variation, per section+part: the melody as it was before any of it (the statement the
     variations are heard against), the grid we last wrote from it, and how far up the writer has
     stepped. Keeping the baseline is what makes the button an amount rather than a ratchet — every
     press re-varies the original by one more edit instead of piling edits onto edits until the motif
     is gone. It is deliberately not part of the song document: the notes are the song, this is just
     where the writer had got to with the control. */
  const [varyIn, setVaryIn] = useState({});
  /* Syncopation, per section+part — the same baseline idea as varyIn: level 1 pushes the backbeats
     early, level 2 every beat, a third press puts the melody back. UI state, not song state. */
  const [syncIn, setSyncIn] = useState({});
  // ✦ Riff the holes, per section: which riff the next press writes. UI state — the riff itself
  // lands in the bass grid and is saved from there like any painted line.
  const [riffSeed, setRiffSeed] = useState({});
  /* The chorus lift, per section: which ingredients are on and what each replaced, so every
     ingredient is individually reversible. UI state like varyIn — the lifted values themselves
     live in the song (part settings, section maps, notes) and persist on their own. */
  const [liftSt, setLiftSt] = useState({});
  /* The hook duel: one section+part's tournament in progress — the melody as it was (restored on
     cancel), the pool of rivals, the reigning champion and which round this is. UI state: what gets
     saved is whatever melody the duel leaves on the grid. */
  const [duel, setDuel] = useState(null);
  const [secNar, setSecNar] = useState({});                 // section key → its own melodic narrative
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
  /* Which part is open, per section instance. It used to be one number for the whole song, which
     meant opening the bass in the chorus also switched the verse to its bass — the sections carry
     different parts and are edited one at a time, so the choice belongs to the section. */
  const [secPart, setSecPart] = useState({});               // section key → part index
  const [modTab, setModTab] = useState({});                 // section key → which modulation group is open
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
  const secDrumRef = useRef({}), secQuietRef = useRef({}), secBeatRef = useRef({}), autoRef = useRef({});
  const kitRef = useRef("acoustic"), pumpRef = useRef(0), tickRef = useRef(8);
  const bassRef = useRef(""), bassVoiceRef = useRef("sub"), secBassRef = useRef({});
  const percRef = useRef(""), secPercRef = useRef({});
  const padRef = useRef(""), secPadRef = useRef({});
  const secBassPatRef = useRef({}), secBassBeatRef = useRef({});
  const secPercPatRef = useRef({}), secPercBeatRef = useRef({});
  const secPadVoiceRef = useRef({});
  const secTrackLayersRef = useRef({});
  const trackFxRef = useRef({}), percKitRef = useRef("hand"), fxRackRef = useRef({}), secFxRef = useRef({});
  const secPadBeatRef = useRef({}), secChordBeatRef = useRef({});
  const subRef = useRef(2), melRef = useRef(8);
  const moveRef = useRef({ moves:{}, span:{} });
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
    // "t" — an arrangement template: a plan whose rows also carry what plays in them
    if (p[1] === "t") {
      const t = DANCE_TEMPLATES[+p[2]];
      return t ? { st: t, plan: t.plan, tpl: t } : null;
    }
    const u = UNIVERSAL[+p[2]];
    return u ? { st: u, plan: u.plan } : null;
  }, [selStruct, progId]);
  const curTpl = structSel && structSel.tpl ? structSel.tpl : null;

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
    // a song's bar list exists whenever there is a plan to play — a structure from the catalogue,
    // or a custom plan written without one (which is what the Sketch tab's draft commits)
    const bars = effPlan ? [] : null;
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
  /* ---- the groove sketch ----
     Dance music is subtractive: the workflow starts with a full groove — drums, perc, bass, pad,
     chords and melody all playing at once — and the arrangement is then which sections *lose*
     which of its tracks. The groove is a pseudo-section keyed "*": one pass of the chord loop,
     edited with exactly the section machinery (its grids and melody ride in the same maps, so
     saving, sharing, undo and the exports need no path of their own). Every real section falls
     back to it — after its own grids and menus, before the song-level catalogue pattern — so
     editing the groove is heard everywhere at once, until a section is given something of its own. */
  const GROOVE = "*";
  const grooveInst = useMemo(() => {
    const cs = padEven(chords);
    return { key: GROOVE, base: GROOVE, word: "groove", sec: "Groove", cs,
      str: cs.map(c => c.name).join(cs.length > 6 ? "  |  " : " – "),
      usedC: false, note: null, nbars: cs.length, startBar: 0, row: -1 };
  }, [chords]);

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
    // …and so does anything else keyed to an instance, or a build set on the second chorus plays
    // under the first one as soon as you move a section
    setSecMove(remapKeyed(secMove, cur, next, origin, letterFor));
    setSecTrans(remapKeyed(secTrans, cur, next, origin, letterFor));
    // …including what a section plays. These are keyed per pass now, so a breakdown that has its
    // drums out has to keep them out when it is moved, and the pass it renumbered into must not
    // inherit the silence.
    setSecDrum(remapKeyed(secDrum, cur, next, origin, letterFor));
    setSecQuiet(remapKeyed(secQuiet, cur, next, origin, letterFor));
    setSecBass(remapKeyed(secBass, cur, next, origin, letterFor));
    setSecPerc(remapKeyed(secPerc, cur, next, origin, letterFor));
    setSecPad(remapKeyed(secPad, cur, next, origin, letterFor));
    setSecBassPat(remapKeyed(secBassPat, cur, next, origin, letterFor));
    setSecPercPat(remapKeyed(secPercPat, cur, next, origin, letterFor));
    setSecPadVoice(remapKeyed(secPadVoice, cur, next, origin, letterFor));
    setSecPartOut(remapKeyed(secPartOut, cur, next, origin, letterFor, v => ({ ...v })));
    // a bus's two slots are objects (params), so a shallow copy would leave two sections sharing
    // the same slot object — editing one section's slider would silently move the other's too
    setSecFx(remapKeyed(secFx, cur, next, origin, letterFor,
      byBus => Object.fromEntries(Object.entries(byBus).map(([bus, slots]) => [bus, slots.map(s => ({ ...s }))]))));
    setSecBassBeat(remapKeyed(secBassBeat, cur, next, origin, letterFor, bars => bars.map(b => [...b])));
    setSecPercBeat(remapKeyed(secPercBeat, cur, next, origin, letterFor, bars => bars.map(b => [...b])));
    setSecPadBeat(remapKeyed(secPadBeat, cur, next, origin, letterFor, bars => bars.map(b => [...b])));
    setSecChordBeat(remapKeyed(secChordBeat, cur, next, origin, letterFor, bars => bars.map(b => [...b])));
    // deep-copied, or duplicating a section would give the copy the original's own array to edit
    setSecBeat(remapKeyed(secBeat, cur, next, origin, letterFor, bars => bars.map(b => [...b])));
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

  /* ---- arrangement templates ----
     A structure is a running order. A template is a running order plus an arrangement: which
     sections drop the drums, which lose the chords, which parts are in, the filter shape across
     each one, and what happens at every seam. Without that a picked structure plays every element
     from the first bar to the last, which is a track with sections rather than an arranged one —
     and in dance music the drop lands because the breakdown took the kick away, so if nothing ever
     leaves, nothing can arrive.

     The arrangement is resolved onto *instances* (D1, D2 …), never section letters, because "the
     second drop is bigger than the first" is the whole craft and a letter cannot say it. And it
     rides on the plan rows, so moving or duplicating a section carries its arrangement with it,
     exactly as melodies are carried. */
  const barsOfRow = row => padEven(resolveWith(row.nums, poolFor(letterFor(row.sec)))).length;
  /* A template says which parts play in each section; the parts live with the melodies, so this
     patches their mute flags and leaves every note alone. A section with nothing written in it yet
     is still given its flags when the template wants it silent — so a melody written later lands in
     the arrangement rather than in every bar of the song. */
  const applyPartMutes = parts => {
    const entries = Object.entries(parts || {});
    if (!entries.length) return;
    const secs = melos.progId === progId ? { ...melos.secs } : {};
    for (const [key, plays] of entries) {
      const prev = secs[key];
      const src = (prev && prev.layers && prev.layers.length) ? prev.layers : null;
      if (!src && plays[0]) continue;       // nothing written here and part A plays — nothing to record
      const layers = (src || [{ bars: null, instr: null }]).map((ly, i) => ({ ...ly, mute: !plays[i] }));
      secs[key] = { ids: (prev && prev.ids) || [], layers };
    }
    setMelos({ progId, secs });
  };
  /* Resolve a plan's rows onto the sections they actually produce and write the lot. `planInsts`
     rather than `sections.insts` because this runs inside the event that *chooses* the plan — the
     component has not re-rendered yet, so `sections` is still the previous song's. */
  const applyArrangement = (plan, sel) => {
    const A = resolveArrangement(plan, planInsts(plan, barsOfRow, letterFor));
    setSecDrum(A.secDrum); setSecQuiet(A.secQuiet); setSecBass(A.secBass);
    setSecPerc(A.secPerc); setSecPad(A.secPad);
    // the template takes over the section menus (written grids survive, exactly as the drum
    // grids do) — half an old arrangement under a new one is what "apply" exists to prevent
    setSecBassPat({}); setSecPercPat({}); setSecPadVoice({}); setSecTrackLayers({}); setTrackTab({});
    setSecMove(A.secMove); setSecTrans(A.secTrans);
    setAuto({ key: progId + "|" + sel, filter: A.filter, level: A.level, hp: A.hp, res: A.res });
    applyPartMutes(A.parts);
  };
  /* Picking a template is picking a structure *and* an arrangement, so it also sets the tempo, the
     kit, the pump and the chord rhythm the style is built on — a big-room shape at 96 bpm over a
     campfire strum is not the thing the template is for. Every one of them is an ordinary control
     afterwards, and the arrangement itself is editable everywhere it shows. */
  const pickStruct = v => {
    setSelStruct(v);
    setSelRow(0);
    setCustom({ key:"", plan:null });
    const p = v.split(":");
    const tpl = p[1] === "t" ? DANCE_TEMPLATES[+p[2]] : null;
    if (!tpl) return;
    if (tpl.bpm) setBpmSt({ key: progId, val: tpl.bpm });
    if (tpl.pat && PATTERNS[tpl.pat]) setPatSel({ key: progId, id: tpl.pat });
    if (tpl.drum && DRUMS[tpl.drum]) setDrumSt({ key: progId, val: tpl.drum });
    if (tpl.kit) setKitSt({ key: progId, val: tpl.kit });
    if (tpl.pump) setPumpSt({ key: progId, val: tpl.pump });
    // always written, present or not: a template that says nothing about the bass means "no bass
    // track", not "whatever the last template left running under a different genre"
    setBassSt({ key: progId, val: tpl.bass && BASS[tpl.bass] ? tpl.bass : "" });
    setBassVoiceSt({ key: progId, val: tpl.bassVoice || "" });
    applyArrangement(tpl.plan, v);
  };

  /* ---- track presets: "recreate a famous track" ----
     A track preset (src/track-presets.js) is a template pick plus a key/progression plus a melody
     steering choice, applied from one dropdown. It cannot simply call `pickStruct`-style logic and
     `applyNarrative` back to back in the same click handler: both eventually call `setMelos`, and
     two `setMelos` calls issued synchronously in one handler always collapse to the *second* call's
     argument — React holds the newest value written to a piece of state, it does not merge two
     writes to it. Worse, `applyArrangement` (via `applyPartMutes`) and `applyNarrative` both read
     the *committed* `chords` / `poolFor` / `sections` for their bar math and their section list —
     which still describe the *old* progression the instant after `setForce`/`setTonic` are called,
     because state only takes effect on the next render. Calling them in the same breath as picking a
     new progression would therefore both silently drop one of the two melody writes and resolve the
     template against the wrong chord count.

     So a preset lands over three renders, gated by one ref rather than its own state (nothing here
     needs to survive a reload, only a few renders): this render sets the key, the progression and
     every tempo/drum/kit/bass control — exactly what `pickStruct` sets, just keyed to the preset's
     own progression rather than the current one. The next render — once `progId`/`tonic`/`selStruct`
     have actually committed and `chords`/`sections` are freshly derived from them — applies the
     arrangement, via the very same `applyArrangement` a manual template pick uses. And the render
     after *that* — once the arrangement's part mutes have themselves committed and `secMelos`
     reflects them — writes the melody narrative over the top, so a DJ intro the template just
     silenced doesn't get un-muted by a narrative computed from the section list as it stood a render
     earlier. Three plain, unmodified calls to the app's own functions, sequenced rather than merged
     — which is also why nothing here duplicates `pickStruct`'s or `applyNarrative`'s own logic; this
     only decides *when* each already-correct call is safe to make. */
  const trackPresetRef = useRef(null);
  useEffect(() => {
    const p = trackPresetRef.current;
    if (!p) return;
    if (p.stage === "arrange") {
      const tpl = DANCE_TEMPLATES[p.tplIdx];
      if (tpl) applyArrangement(tpl.plan, p.selVal);
      trackPresetRef.current = p.preset.narrative ? { ...p, stage: "melody" } : null;
      return;
    }
    // stage "melody" — the sliders get the same values baked into the melody, or they would show a
    // position that disagrees with what just played, exactly as a manual drag + apply does
    const { narrative, vary, sync, within } = p.preset;
    const amt = vary == null ? 1 : vary;
    setVarySt({ key: progId, val: amt });
    setNarSyncSt({ key: progId, val: sync || 0 });
    setNarInSt({ key: progId, val: !!within });
    applyNarrative(narrative, amt, sync || 0, !!within);
    trackPresetRef.current = null;
  });
  /* The steering itself — register, density, contour, syncopation, hook placement — never a
     transcribed note. See the header of track-presets.js for why that line is drawn where it is. */
  const applyTrackPreset = id => {
    setTrackSt(id);
    const preset = TRACK_PRESETS.find(t => t.id === id);
    if (!preset) return;
    const pid = preset.progId;
    const tplIdx = DANCE_TEMPLATES.findIndex(t => t.id === preset.baseTemplate);
    const tpl = tplIdx >= 0 ? DANCE_TEMPLATES[tplIdx] : null;
    setForce(PROGRESSIONS[pid] ? pid : null); setTonic(preset.tonic || 0);
    setGenre(null); setEmotion(null); setMode(preset.mode || null);
    // a fresh key deserves a fresh set of chord-level edits — an insert or a swap keyed to the old
    // progression:tonic pair would simply fail to match and sit inert, but starting clean is honest
    setEdits({ key:"", map:{} }); setInserts({ key:"", list:[] });
    setQuals({ key:"", map:{} }); setRemoved({ key:"", list:[] }); setOrder({ key:"", list:null });
    const bpm = preset.bpm || (tpl && tpl.bpm);
    if (bpm) setBpmSt({ key: pid, val: bpm });
    const patId = preset.pat || (tpl && tpl.pat);
    if (patId && PATTERNS[patId]) setPatSel({ key: pid, id: patId });
    const drumId = preset.drum || (tpl && tpl.drum);
    if (drumId && DRUMS[drumId]) setDrumSt({ key: pid, val: drumId });
    const kitId = preset.kit || (tpl && tpl.kit);
    if (kitId) setKitSt({ key: pid, val: kitId });
    const pumpId = preset.pump || (tpl && tpl.pump);
    if (pumpId) setPumpSt({ key: pid, val: pumpId });
    const bassId = preset.bass || (tpl && tpl.bass);
    setBassSt({ key: pid, val: bassId && BASS[bassId] ? bassId : "" });
    setBassVoiceSt({ key: pid, val: preset.bassVoice || (tpl && tpl.bassVoice) || "" });
    if (preset.pad) setPadSt({ key: pid, val: preset.pad });
    if (preset.percKit) setPercKitSt({ key: pid, val: preset.percKit });
    if (preset.delay) setDelaySt({ key: pid, val: preset.delay });
    if (preset.swing != null) setSwingSt({ key: pid, val: preset.swing });
    setSelRow(0); setCustom({ key:"", plan:null });
    const selVal = tplIdx >= 0 ? pid + ":t:" + tplIdx : "";
    setSelStruct(selVal);
    trackPresetRef.current = tplIdx >= 0 ? { stage:"arrange", tplIdx, selVal, preset } : null;
  };

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
  // the bass track — off by default everywhere, so every song made before it existed is untouched
  const bass = bassSt.key === progId && BASS[bassSt.val] ? bassSt.val : "";
  const bassVoice = bassVoiceSt.key === progId && bassVoiceSt.val ? bassVoiceSt.val : "sub";
  // …and the same for the percussion layer and the pad
  const perc = percSt.key === progId && percSt.val !== "off"
    && ((PERCS[percSt.val] || DRUMS[percSt.val] || {}).pattern) ? percSt.val : "";
  const percKit = percKitSt.key === progId && percKitSt.val ? percKitSt.val : "hand";
  const pad = padSt.key === progId && PAD_VOICES.some(([id]) => id === padSt.val) ? padSt.val : "";
  // a dotted eighth is the dance default; everything else starts dry
  const delayId = delaySt.key === progId ? delaySt.val : (DRUM_DEFAULT[progId] ? "8d" : "off");
  // Swing is a dial now, not a switch. The rhythm pattern's own `swing` flag sets the starting
  // point; the user can then push it anywhere from straight to nearly triplet.
  const swingAmt = swingSt.key === progId ? swingSt.val : (rhythm.swing ? 0.33 : 0);
  bpmRef.current = effBpm; patRef.current = rhythm.pattern; swingRef.current = swingAmt;
  humRef.current = humanise;
  instrRef.current = instr; drumRef.current = DRUMS[drum].pattern; realRef.current = realSounds;
  secDrumRef.current = secDrum; secQuietRef.current = secQuiet; secBeatRef.current = secBeat;
  // automation belongs to the song it was drawn on, so it stops applying when you switch away
  autoRef.current = auto.key === planKey ? auto : {};
  kitRef.current = kit; pumpRef.current = PUMP_AMT[pump] || 0; delayRef.current = delayId;
  bassRef.current = bass; bassVoiceRef.current = bassVoice; secBassRef.current = secBass;
  percRef.current = perc; secPercRef.current = secPerc;
  padRef.current = pad; secPadRef.current = secPad;
  secBassPatRef.current = secBassPat; secBassBeatRef.current = secBassBeat;
  secPercPatRef.current = secPercPat; secPercBeatRef.current = secPercBeat;
  secPadVoiceRef.current = secPadVoice;
  secTrackLayersRef.current = secTrackLayers;
  trackFxRef.current = trackFx; percKitRef.current = percKit; fxRackRef.current = fxRack; secFxRef.current = secFx;
  secPadBeatRef.current = secPadBeat; secChordBeatRef.current = secChordBeat;
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
    // an edited bar is a pattern like any other, and one written in 4/4 is the wrong length in 3/4:
    // its sixteenths would fall between the new bar's ticks and most of the groove would vanish
    const want = beatSteps((METER_BY_ID[mid] || METERS[0]).beats);
    const kb = {};
    for (const [k, bars] of Object.entries(secBeat)) if (bars && bars[0] && bars[0].length === want) kb[k] = bars;
    if (Object.keys(kb).length !== Object.keys(secBeat).length) setSecBeat(kb);
  };
  const barBeats = beatsOf(rhythm);                         // 4 in common time, 3 in waltz time
  /* How finely the melody grid divides a beat. This was `rhythm.pattern.length`, which tied the
     writing grid to the strum pattern: a sixteenth grid meant picking a sixteenth strum, which
     changes the sound as well. It is its own choice now, defaulting to what the pattern implies —
     `barBeats * subOf(rhythm)` is the pattern's own length, so a song that leaves it alone is
     unchanged. Changing it re-times what is written (`rescaleBar`), so notes keep the moment they
     sound at rather than the column they were stored in. */
  const meloSub = gridSub(gridSt.key === progId ? gridSt.val : "", subOf(rhythm));
  const meloBeats = barBeats * meloSub;                     // grid columns per bar (6 in waltz time, 16 on a sixteenth grid)
  /* The melody grid and the drum grid sit one above the other and describe the same bars, so they
     have to line up. That means one label gutter and a column unit scaled by each grid's own step
     count, or bar 3 is in two different places and neither grid can be read against the other —
     which is the whole point of stacking them. */
  /* The two grids are aligned, so they have to stay aligned when one is scrolled — a section wider
     than the panel is the normal case, not the exception, and a drum grid parked two bars away from
     the melody above it would undo the whole point of lining them up. */
  const syncScroll = e => {
    const el = e.currentTarget, x = el.scrollLeft;
    for (const other of document.querySelectorAll(`.mscroll[data-sync="${el.dataset.sync}"]`))
      if (other !== el && Math.round(other.scrollLeft) !== Math.round(x)) other.scrollLeft = x;
  };
  const GRID_GUT = 52;                                      // the row-label column, wide enough for "Open hat"
  const beatCols = beatSteps(barBeats);                     // steps a written drum bar has
  /* Matching the widths means matching cell *and* gap, because a grid with twice the columns also
     has twice the gaps — which is exactly why the two used to drift apart by a bar's width over
     four bars. With `gridR` drum steps per melody column, cell+gap on one has to be gridR times
     cell+gap on the other: 26+4 against 2×(13+2) when the melody is in eighths, and identical when
     it is in sixteenths and the two grids have the same columns anyway. */
  const gridR = Math.max(1, beatCols / meloBeats);
  const melCell = gridR === 1 ? 12 : 20;
  const beatCell = gridR === 1 ? 12 : 10, beatGap = gridR === 1 ? 4 : 2;
  // and the drum grid's gutter takes the gap difference back, or its narrower gaps start it two
  // pixels left of the melody grid and every bar line is out by the same two pixels
  barBeatsRef.current = barBeats;
  // How finely the scheduler has to tick this bar: enough for the strum pattern and for every
  // drum pattern that could play (the global one plus any per-section override). Computed over
  // the whole song rather than per bar, so the step counter stays coherent as sections change.
  const tickCount = useMemo(() => {
    const lens = [DRUMS[drum], ...Object.values(secDrum).map(id => DRUMS[id])]
      .filter(d => d && d.pattern && drumBeatsOf(d.pattern) === barBeats)
      .map(d => d.pattern.length);
    // an edited bar is sixteenths, and a bar that does not tick that finely would drop every
    // second hit of one between its ticks
    Object.values(secBeat).forEach(bars => { if (bars && bars.length) lens.push(bars[0].length); });
    // a bass pattern is sixteenths, and a bar that doesn't tick that finely would drop every
    // offbeat hit — the ones the patterns are made of. 4/4 only: that is the bar they're written in
    const bp = BASS[bass];
    if (bp && bp.pattern && barBeats === 4) lens.push(bp.pattern.length);
    // the percussion layer's pattern too — a sixteenth shaker over an eighth-note kit needs the
    // finer grid or half its hits fall between ticks
    const pp = PERCS[perc] || DRUMS[perc];
    if (pp && pp.pattern && drumBeatsOf(pp.pattern) === barBeats) lens.push(pp.pattern.length);
    // …and every per-section choice or written grid for either track
    Object.values(secBassPat).forEach(id => {
      const b = BASS[id]; if (b && b.pattern && barBeats === 4) lens.push(b.pattern.length);
    });
    Object.values(secPercPat).forEach(id => {
      const d2 = PERCS[id] || DRUMS[id];
      if (d2 && d2.pattern && drumBeatsOf(d2.pattern) === barBeats) lens.push(d2.pattern.length);
    });
    Object.values(secBassBeat).forEach(bars => { if (bars && bars.length) lens.push(bars[0].length); });
    Object.values(secPercBeat).forEach(bars => { if (bars && bars.length) lens.push(bars[0].length); });
    Object.values(secPadBeat).forEach(bars => { if (bars && bars.length) lens.push(bars[0].length); });
    Object.values(secChordBeat).forEach(bars => { if (bars && bars.length) lens.push(bars[0].length); });
    return lens.reduce((a, b) => lcm(a, b), meloBeats);
  }, [drum, secDrum, secBeat, meloBeats, barBeats, bass, perc, secBassPat, secPercPat, secBassBeat, secPercBeat, secPadBeat, secChordBeat]);
  subRef.current = meloSub; melRef.current = meloBeats;
  /* A move or a transition is the instance's own if it has one, and the section letter's otherwise.
     Playback, the strip and the pickers all have to agree about that, and they did not: the strip
     read the letter alone, so a build set on the second chorus was inaudible in its own tooltip. */
  const effMove = d => (d && (secMove[d.key] || secMove[d.base])) || "";
  const effTrans = d => (d && (secTrans[d.key] || secTrans[d.base])) || "";
  /* Drums and chords resolve the same way, and used to resolve by section letter alone. That made
     a real arrangement impossible to express: every groove in a track letters G, so "the first
     groove has no chords and the second one does" had nowhere to live, and a template could only
     ever say the same thing about all of them. Instance first, letter second — which is also what
     keeps songs saved before this sounding the way they were saved, since those only ever wrote
     the letter. */
  const effDrum = d => (d && (secDrum[d.key] || secDrum[d.base])) || "";
  const effQuiet = d => !!(d && (secQuiet[d.key] != null ? secQuiet[d.key] : secQuiet[d.base]));
  const effBassOut = d => !!(d && (secBass[d.key] != null ? secBass[d.key] : secBass[d.base]));
  const effPercOut = d => !!(d && (secPerc[d.key] != null ? secPerc[d.key] : secPerc[d.base]));
  const effPadOut = d => !!(d && (secPad[d.key] != null ? secPad[d.key] : secPad[d.base]));
  /* The insert-effects rack's per-section override, resolved the same way the drums and pad menu
     do: instance first, its letter second, the song's own rack last. Unlike those, what comes back
     is the two-slot array `fxSlotRow` already knows how to draw — a section that has not opened
     its own copy of a bus simply inherits whatever the Sound tab's rack currently is, live, the
     same way an un-opened track effect panel does. `master` is never looked up here: it has no
     per-section entry and is read straight off `fxRack` wherever it is used. */
  const effFx = (bus, d) => (d && ((secFx[d.key] && secFx[d.key][bus]) || (secFx[d.base] && secFx[d.base][bus])))
    || fxRack[bus] || [];
  /* What a section's bass and perc actually are, resolved the way the drums resolve: the pass's
     own written grid first, then its (or its letter's) menu choice, then whatever the template
     wrote — a mute, or the song-level pattern. Returns { beat } | { pat } | null. */
  /* The groove's own written bars for a track, offered to every *other* section as the step
     between "this section said something" and "the song-level catalogue pattern". Marked
     `loop: true` because a groove shorter than the section cycles round rather than holding its
     last bar — it is a loop, not a section that got stretched. */
  const grooveBeatOf = (beats, d) => {
    const gk = GROOVE + layerSuf(d && d.key);   // this section's own track suffix, on the groove's key
    const g = d && d.key !== gk && beats[gk];
    return g && g.length ? { beat: g, loop: true } : null;
  };
  const bassSrcOf = d => {
    const own = d && secBassBeat[d.key];
    if (own && own.length) return { beat: own };
    const p = d && (secBassPat[d.key] || secBassPat[d.base]);
    if (p) return p === "off" ? null : { pat: p };
    if (effBassOut(d)) return null;
    return grooveBeatOf(secBassBeat, d) || (bass ? { pat: bass } : null);
  };
  const percSrcOf = d => {
    const own = d && secPercBeat[d.key];
    if (own && own.length) return { beat: own };
    const p = d && (secPercPat[d.key] || secPercPat[d.base]);
    if (p) return p === "off" ? null : { pat: p };
    if (effPercOut(d)) return null;
    return grooveBeatOf(secPercBeat, d) || (perc ? { pat: perc } : null);
  };
  const padVoiceOf = d => {
    const v = d && (secPadVoice[d.key] || secPadVoice[d.base]);
    if (v) return v === "off" ? "" : v;
    if (effPadOut(d)) return "";
    return pad;
  };
  // the pad rhythm a section resolves to: its own written bars, else the groove's (unless the
  // section's pad is switched off by its menu or its letter's mute)
  const padBeatOf = d => {
    const own = d && secPadBeat[d.key];
    if (own && own.length) return { beat: own };
    const v = d && (secPadVoice[d.key] || secPadVoice[d.base]);
    if (v === "off" || effPadOut(d)) return null;
    return grooveBeatOf(secPadBeat, d);
  };
  // a pass with a written pad rhythm plays even when no voice is chosen anywhere — it falls back
  // to the song default, or strings
  const padOnOf = d => !!padVoiceOf(d) || !!padBeatOf(d);
  // whether a track sounds anywhere in the song — what decides if it earns lanes, stems and files
  const bassAnywhere = sections.insts.some(x => !!bassSrcOf(x));
  const percAnywhere = sections.insts.some(x => !!percSrcOf(x));
  const padAnywhere = sections.insts.some(x => padOnOf(x));
  /* A track's settings, grouped behind the same tabs the melody part mixer uses — Mix, Tone,
     Movement, Space, and now FX (the insert-effects rack for this track's bus) — with a count
     badge on each tab for what it carries, and rates hidden until the thing they pace is turned
     up. Reused by the Sound tab's panels and under each opened grid, so a track's settings sit
     with its notes the way a part's mixer sits with its grid — the rack included, rather than
     living behind a separate bus-picker section elsewhere on the page.
     `secCtx`, when given (`{ key, word }`, from a section card), switches the FX tab to that
     section's own copy of the rack — the checkbox that seeds it from the song default, then the
     same `fxSlotRow`s the song-wide version uses, editable exactly the same way: a section can now
     pick its own type as well as its own amount. Omitted, the FX tab edits the song-wide rack
     (`fxRack`) directly, as it does on the Sound tab. */
  const trackFxRow = (trId, secCtx) => {
    const fx = trackFx[trId] || {};
    const ly = { lvl: 100, ...fx };
    const groups = [
      { id:"mix", name:"Mix", tip:"Where the track sits — its level, stereo place and how it answers the kick",
        keys:["lvl", "pan", "duck"] },
      { id:"tone", name:"Tone", tip:"The filter and the dirt — what turns the track's notes into a sound",
        keys:["cut", "res", "hp", "drive"] },
      { id:"movement", name:"Movement", tip:"Things that move on their own, in time with the tempo",
        keys:["wob", "wobRate", "trem", "tremRate", "apan", "apanRate"] },
      { id:"space", name:"Space", tip:"How far away the track is — the echo and the room",
        keys:["send", "verb"] },
    ].map(g => ({ ...g, mods: g.keys
      .filter(k => !(trId === "drums" && k === "duck"))
      .map(k => k === "lvl" ? TRACK_LVL : MOD_BY_KEY[k]) }));
    const grp = trackFxTab[trId] || "mix";
    const G = groups.find(g => g.id === grp) || groups[0];
    const trName = (TRACKS_FX.find(([id]) => id === trId) || [null, trId])[1];
    const song = fxRack[trId] || [];
    const own = secCtx && secFx[secCtx.key] && secFx[secCtx.key][trId];
    const fxOn = ((secCtx ? (own || song) : song) || [])
      .filter(s => s && s.type && s.type !== "off").length;
    const renderFxTab = () => {
      if (!secCtx) return (
        <div style={{ marginTop:6 }}>
          {fxSlotRow(song, 0, next => setFxRack({ ...fxRack, [trId]: next }))}
          {fxSlotRow(song, 1, next => setFxRack({ ...fxRack, [trId]: next }))}
        </div>
      );
      const namesOf = slots => (slots || [])
        .map(s => (s && s.type && s.type !== "off") ? (FX_TYPES.find(([id]) => id === s.type) || [, s.type])[1] : null)
        .filter(Boolean);
      const toggleOwn = checked => {
        if (checked) {
          const seed = [song[0] || { type: "off" }, song[1] || { type: "off" }].map(s => ({ ...s }));
          setSecFx({ ...secFx, [secCtx.key]: { ...(secFx[secCtx.key] || {}), [trId]: seed } });
        } else {
          const nb = { ...(secFx[secCtx.key] || {}) }; delete nb[trId];
          const nextAll = { ...secFx };
          if (Object.keys(nb).length) nextAll[secCtx.key] = nb; else delete nextAll[secCtx.key];
          setSecFx(nextAll);
        }
      };
      const commit = next => setSecFx({ ...secFx, [secCtx.key]: { ...(secFx[secCtx.key] || {}), [trId]: next } });
      return (
        <div style={{ marginTop:6 }}>
          <label className="keytag" style={{ margin:"0 0 6px", display:"inline-flex", gap:5, alignItems:"center", cursor:"pointer" }}
            title="On, this section picks its own type and dials its own amount for this bus, starting from whatever the song default currently is. Off, it plays the song default live — moving the Sound tab's sliders, or picking a new type there, moves this section too.">
            <input type="checkbox" checked={!!own} onChange={e => toggleOwn(e.target.checked)} />
            Use this section's own FX
          </label>
          {own ? <>
            {fxSlotRow(own, 0, commit)}
            {fxSlotRow(own, 1, commit)}
          </> : (
            <p className="keytag" style={{ margin:0 }}>
              Following the song default — {namesOf(song).length ? namesOf(song).join(" · ") : "both slots off"}.
            </p>
          )}
        </div>
      );
    };
    return (
      <div style={{ marginTop:5 }}>
        <div className="row" style={{ gap:4, flexWrap:"wrap" }}>
          {groups.map(g => {
            const n2 = g.mods.reduce((a2, md) => a2 + ((fx[md.k] != null && fx[md.k] !== md.dflt) ? 1 : 0), 0);
            return (
              <button key={g.id} className={"modtab" + (grp === g.id ? " on" : "")} title={g.tip}
                onClick={() => setTrackFxTab({ ...trackFxTab, [trId]: g.id })}>
                {g.name}{n2 > 0 && <i className="lydot">{n2}</i>}
              </button>
            );
          })}
          <button className={"modtab" + (grp === "fx" ? " on" : "")}
            title={secCtx
              ? `This ${secCtx.word}'s own copy of the ${trName.toLowerCase()} insert rack — chorus, flanger, phaser, bitcrusher, compressor, stereo widener.`
              : `Insert effects on the whole ${trName.toLowerCase()} bus — chorus, flanger, phaser, bitcrusher, compressor, stereo widener. The default a new section starts from; open a section's own FX panel to give it a different type entirely.`}
            onClick={() => setTrackFxTab({ ...trackFxTab, [trId]: "fx" })}>
            FX{fxOn > 0 && <i className="lydot">{fxOn}</i>}
          </button>
        </div>
        {grp === "fx" ? renderFxTab() : (
          <div className="modgrid">
            {G.mods
              // a rate only means something once the thing it paces is turned up
              .filter(md => !md.needs || modOf(ly, md.needs) !== MOD_BY_KEY[md.needs].dflt)
              .map(md => (
                <ModCtl key={md.k} mod={md} ly={ly}
                  disabled={md.needsDelay && delayId === "off"}
                  onSet={patch => setTrackFx({ ...trackFx, [trId]: { ...fx, ...patch } })} />
              ))}
          </div>
        )}
        {tips && grp === "space" && delayId === "off" &&
          <p className="arrnote" style={{ margin:"4px 0 0" }}>Echo needs a Delay time — pick one on the <b>Sound</b> tab.</p>}
      </div>
    );
  };
  /* One slot of the insert-effects rack: a type picker, then whatever sliders that type takes
     (from FX_PARAMS — nothing else is drawn, so a Compressor slot shows four sliders and a
     Widener shows one). Picking a type seeds its defaults immediately, so the slot is already
     doing something musical rather than sitting at zero — "off" is the only slot state a song
     that never opens this panel has to inherit unchanged.
     Takes the two-slot array and a `commit(nextSlots)` callback rather than being hardwired to
     `fxRack`/`setFxRack`, so the Sound tab's song-wide rack and a section's own copy of a bus (see
     the FX sub-panel in sectionCard) can share this one renderer instead of two implementations
     drifting apart — every caller draws the same editable type dropdown, a section's own panel
     included: a section can now run a genuinely different effect type from the song's own, not
     just a different amount of the same one (`buildGraph` builds every bus with one node chain per
     type id the song could need there, gated, and the per-beat scheduler switches which is audible
     as playback crosses a section boundary — see `makeFxMultiSlot` in audio.js and `writeFxRack`
     in the per-beat block). The one limitation: a type nothing in the song asked for before the
     last Play/render started has no chain built for it, so picking a brand-new type on a section
     while a song is already playing is heard only after a restart — exactly like changing a delay
     time or a bass voice already is. */
  const fxSlotRow = (slots, slotIdx, commit) => {
    const s0 = (slots && slots[0]) || { type: "off" }, s1 = (slots && slots[1]) || { type: "off" };
    const slot = slotIdx === 0 ? s0 : s1;
    const type = slot.type || "off";
    const params = FX_PARAMS[type] || [];
    const setSlot = patch => {
      const next = [s0, s1];
      next[slotIdx] = { ...next[slotIdx], ...patch };
      commit(next);
    };
    return (
      <div key={slotIdx} className="selrow" style={{ alignItems:"flex-end", flexWrap:"wrap", marginTop:6 }}>
        <label className="selwrap" style={{ minWidth:140, flex:"0 0 auto" }}>
          <span className="lbl" style={{ margin:0 }}>Slot {slotIdx + 1}</span>
          <select value={type} onChange={e => setSlot({ type: e.target.value, ...fxDefaults(e.target.value) })}
            title="What this slot processes. Off costs nothing — no node, no added latency; every other type starts at a tasteful preset you can then dial in. Picking a brand-new type here while the song is already playing needs a restart to be heard.">
            {FX_TYPES.map(([id, name, tip]) => <option key={id} value={id} title={tip}>{name}</option>)}
          </select>
        </label>
        {params.map(([k, name, min, max, step, dflt, unit]) => {
          const v = slot[k] != null ? slot[k] : dflt;
          return (
            <label className="selwrap" key={k} style={{ minWidth:110 }}>
              <span className="lbl" style={{ margin:0 }}>{name} {v}{unit}</span>
              <input className="lvl" type="range" min={min} max={max} step={step} value={v}
                onChange={e => setSlot({ [k]: +e.target.value })}
                title={(FX_TYPES.find(([id]) => id === type) || [])[2] || name} />
            </label>
          );
        })}
      </div>
    );
  };
  /* Forty-nine transitions only work as a menu if they arrive grouped, so the six families are
     optgroups; and the inherited value is the first option rather than something you find out by
     pressing play, exactly as a move's is. */
  const transSelect = (val, onChange, inherit) => (
    <select value={val} onChange={onChange}>
      <option value="">{inherit ? "as every " + inherit : "— no transition —"}</option>
      {TRANS_CATS.map(([cat, name, tip]) => (
        <optgroup key={cat} label={name + " · " + tip}>
          {Object.values(TRANS).filter(T => T.cat === cat)
            .map(T => <option key={T.id} value={T.id}>{T.name}</option>)}
        </optgroup>
      ))}
    </select>
  );
  // where each transition has to be armed — computed once per arrangement rather than per tick,
  // because most of a transition sounds before the section it belongs to has started
  const cues = useMemo(() => transCues(sections.insts,
    d => TRANS[(secTrans[d.key] || secTrans[d.base]) || ""], barBeats),
    [sections.insts, secTrans, barBeats]);
  /* Where each move starts and how long it runs. A move used to fire on every instance for that
     instance's length, which quietly ruined the commonest dance edit there is: a build is written
     as "Build ×4" — four passes of a two-bar half-loop — and what you got was four two-bar filter
     sweeps rather than one eight-bar climb, so the build sounded like a stutter and the drop
     landed on nothing. A move now spans the *run*: consecutive passes of the same row set to the
     same move are one sweep, scheduled on the first of them, and the passes inside it stay out of
     the way. Changing the move mid-run (a pass with one of its own) starts a new one, which is
     what asking for it means. */
  const moveSpan = useMemo(() => {
    const out = {};
    let head = null;
    sections.insts.forEach(d => {
      const id = (secMove[d.key] || secMove[d.base]) || "";
      if (head && head.row === d.row && head.id === id) { out[head.key].bars += d.nbars; return; }
      head = { row: d.row, id, key: d.key };
      out[d.key] = { id, bars: d.nbars };
    });
    return out;
  }, [sections.insts, secMove]);
  // each instance's own written bar count, by key — how a part move or a drum fill measures its
  // ramp across the instance, the same way Swell measures itself across a melody part's own bars
  const instBars = useMemo(() => Object.fromEntries(sections.insts.map(d => [d.key, d.nbars])),
    [sections.insts]);
  moveRef.current = { moves: secMove, cues, span: moveSpan, instBars };
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
    const build = (d, saved, extraMute) => {
      const ids = d.cs.map(chordId);
      const src = (saved && saved.layers && saved.layers.length) ? saved.layers : [{ bars: null, instr: null }];
      const layers = src.map((ly, li) => {
        const bars = adaptBars(saved && saved.ids, ly && ly.bars, ids, samePid);
        // part 0 always exists; the rest keep whatever bars they were given. Register and level
        // fall back to the defaults for that part index, so older sections gain sane values.
        return { bars, flat: bars.flat(), instr: (ly && ly.instr) || null,
          oct: (ly && ly.oct) != null ? ly.oct : (LAYER_DEFAULT_OCT[li] || 0),
          vol: (ly && ly.vol) != null ? ly.vol : (LAYER_DEFAULT_VOL[li] != null ? LAYER_DEFAULT_VOL[li] : 1),
          mute: !!(ly && ly.mute) || !!(extraMute && extraMute(li)),
          solo: !!(ly && ly.solo), send: (ly && ly.send) || 0,
          ...layerFx(ly) };
      });
      return { ids, layers };
    };
    // an arped part plays with no written notes, so "does this play?" counts arps as well as bars
    const plays = saved => !!(saved && saved.layers && saved.layers.some(ly =>
      (ly.bars && ly.bars.some(b => b && b.some(c => c && c.length))) || layerFx(ly).arp));
    const gSaved = melos.secs[GROOVE];
    out[GROOVE] = build(grooveInst, gSaved);
    const grooveOn = plays(gSaved);
    sections.insts.forEach(d => {
      const saved = melos.secs[d.key];
      const own = build(d, saved);
      if (!grooveOn) { out[d.key] = own; return; }
      /* The groove's parts, allocated per section — part by part, not all or nothing: a part the
         section has written (or arps) is the section's own, and every part it hasn't follows the
         groove. Whole-section inheritance meant a melody written onto one part (a narrative, a
         recorded line) silenced the groove's other parts in that section. The allocation lives in
         `secPartOut`, not on the layers — writing a mute onto the layers would materialise a copy
         of the groove into the section, and a groove edited afterwards would no longer reach it.
         A template's own mute flags (layers written with no notes, just to say what sits out)
         still count underneath, so a template arrangement allocates the groove the way it
         allocated parts. */
      const flags = saved && saved.layers;
      const gh = build(d, gSaved, li => {
        const o = secPartOut[d.key] && secPartOut[d.key][li] != null ? secPartOut[d.key][li]
          : secPartOut[d.base] && secPartOut[d.base][li] != null ? secPartOut[d.base][li]
          : (flags && flags[li] ? !!flags[li].mute : undefined);
        return !!o;
      });
      const lyPlays = ly => (ly.flat && ly.flat.some(c => c && c.length)) || ly.arp;
      const inhParts = {};
      const layers = Array.from({ length: Math.max(own.layers.length, gh.layers.length) }, (_, li) => {
        const o = own.layers[li];
        if (o && lyPlays(o)) return o;
        const g = gh.layers[li];
        if (g && lyPlays(g)) { inhParts[li] = true; return g; }
        return o || g;
      });
      out[d.key] = { ids: own.ids, layers, inhParts, inherited: !plays(saved) };
    });
    /* Session view melody clips: each is its own pseudo-section (one or more parts, exactly like
       a section can hold more than one instrument), keyed sessionKey(trackId, clipId) — no
       chord-id adaptation and no groove inheritance, since a clip is not anchored to a position
       in the progression the way an arrangement instance is, it just plays over whichever chord
       happens to be sounding. Reusing this shape (rather than a parallel one) is what lets
       putSec/putLayer/addLayer/tapMelo and the mod panels edit a clip with no code of their own —
       see session.js's own note. Every saved layer has to be mapped here, not just the first: a
       memo that only ever emitted one layer would silently undo addLayer's own write on the very
       next render, since this out[key] is what secMelos actually is by the time anything re-reads it. */
    sessionTracks.forEach(tr => {
      if (tr.type !== "melody") return;
      tr.clips.forEach(clip => {
        const key = sessionKey(tr.id, clip.id);
        const saved = melos.secs[key];
        const src = (saved && saved.layers && saved.layers.length) ? saved.layers : [{}];
        const layers = src.map((ly0, li) => {
          const ly = ly0 || {};
          const bars = (ly.bars && ly.bars.length) ? ly.bars : blankBars(clip.nbars || 4, meloBeats);
          return { bars, flat: bars.flat(), instr: ly.instr || null,
            oct: ly.oct != null ? ly.oct : (LAYER_DEFAULT_OCT[li] || 0),
            vol: ly.vol != null ? ly.vol : (LAYER_DEFAULT_VOL[li] != null ? LAYER_DEFAULT_VOL[li] : 1),
            mute: !!ly.mute, solo: !!ly.solo, send: ly.send || 0, ...layerFx(ly) };
        });
        out[key] = { ids: [], layers };
      });
    });
    return out;
  }, [melos, progId, sections, meloBeats, grooveInst, secPartOut, sessionTracks]);
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
  /* Allocate a groove part across sections that *inherit* it. Writing the mute onto the layers
     (setLayerPropMany) would materialise a copy of the groove into each section, and a groove
     edited afterwards would no longer reach them — the allocation therefore lives in its own map,
     and one update covers every section, exactly as setLayerPropMany does for owned parts. */
  const setPartOutMany = (keys, i, out) => {
    const next = { ...secPartOut };
    for (const k of keys) next[k] = { ...(next[k] || {}), [i]: out };
    setSecPartOut(next);
  };
  /* ---- the drum grid ----
     The catalogue pattern a section is playing, which is what its grid opens showing: its type's
     override if it has one, else the song's. `beatFrom` lays it onto the sixteenth grid with the
     same resampler playback uses, so an eighth-note pattern arrives on every other step exactly as
     it sounds — you are editing what you were hearing, not a blank bar beside it. */
  const beatCat = d => {
    const id = effDrum(d) || drum;
    return DRUMS[id] ? DRUMS[id].pattern : null;
  };
  // lay a groove-sketch source onto a section's own bars, cycling round — the seed a grid opens
  // showing when the section is following the groove rather than a catalogue pattern
  const grooveSeed = (g, d, n, blank) => Array.from({ length: d.nbars }, (_, b) => {
    const bar = g[b % g.length];
    return bar && bar.length === n ? [...bar] : blank(n);
  });
  const beatSeed = d => {
    const n = beatSteps(barBeats);
    const g = d.key !== GROOVE && !effDrum(d) ? secBeat[GROOVE] : null;
    if (g && g.length) return grooveSeed(g, d, n, blankBeat);
    const pat = beatCat(d);
    return Array.from({ length: d.nbars }, () => pat ? beatFrom(pat, n) : blankBeat(n));
  };
  // the bars on screen for a section: its own if written, else the catalogue laid onto the grid.
  // Sized to the section, so stretching a verse gives the new bars rather than dropping them.
  const beatBars = d => {
    const own = secBeat[d.key], n = beatSteps(barBeats);
    if (!own || !own.length) return beatSeed(d);
    return Array.from({ length: d.nbars }, (_, b) => {
      const bar = own[Math.min(b, own.length - 1)];
      return bar && bar.length === n ? bar : blankBeat(n);
    });
  };
  const putBeat = (key, bars) => setSecBeat({ ...secBeat, [key]: bars });
  const tapBeat = (d, bar, step, ch) => {
    const bars = beatBars(d);
    putBeat(d.key, bars.map((b, i) => i === bar ? beatToggle(b, step, ch) : [...b]));
  };
  // hand the section back to the catalogue — the grid goes on showing what is playing, unwritten
  const resetBeat = key => { const next = { ...secBeat }; delete next[key]; setSecBeat(next); };
  const copyBeat = (d, to) => {
    const bars = beatBars(d), next = { ...secBeat };
    for (const o of to) next[o.key] = Array.from({ length: o.nbars },
      (_, b) => [...bars[Math.min(b, bars.length - 1)]]);
    setSecBeat(next);
  };
  /* ---- the perc and bass grids — the drum grid's machinery pointed at the new tracks ----
     Perc bars are the same array-of-step-strings the drum grid edits, painted with the same kit
     rows. Bass bars hold one token a step — R root, F fifth, O octave — because a bassline is a
     line: tapping a different row moves the note rather than stacking one on top. Each grid opens
     showing what the section is already playing (its menu choice laid onto the sixteenth grid),
     so you edit what you hear, not a blank bar beside it. */
  const BASS_ROWS = [
    ["O", "Octave", "the line jumping up — the top of an octave bounce", "#7FB4D8"],
    ["F", "Fifth", "the passing note that walks the line round", "#E0B85A"],
    ["R", "Root", "the floor — the note the chord stands on", "#E8794F"],
  ];
  const percSeed = d => {
    const src = percSrcOf(d), n = beatSteps(barBeats);
    if (src && src.beat) return grooveSeed(src.beat, d, n, blankBeat);   // following the groove sketch
    const pat = src && src.pat ? ((PERCS[src.pat] || DRUMS[src.pat] || {}).pattern) : null;
    return Array.from({ length: d.nbars }, () => pat ? beatFrom(pat, n, PERC_ORDER) : blankBeat(n));
  };
  const percGridBars = d => {
    const own = secPercBeat[d.key], n = beatSteps(barBeats);
    if (!own || !own.length) return percSeed(d);
    return Array.from({ length: d.nbars }, (_, b) => {
      const bar = own[Math.min(b, own.length - 1)];
      return bar && bar.length === n ? bar : blankBeat(n);
    });
  };
  const tapPerc = (d, bar, step, ch) => {
    const bars = percGridBars(d);
    setSecPercBeat({ ...secPercBeat, [d.key]: bars.map((b, i) => i === bar ? beatToggle(b, step, ch, PERC_ORDER) : [...b]) });
  };
  const resetPercBeat = key => { const next = { ...secPercBeat }; delete next[key]; setSecPercBeat(next); };
  const copyPercBeat = (d, to) => {
    const bars = percGridBars(d), next = { ...secPercBeat };
    for (const o of to) next[o.key] = Array.from({ length: o.nbars },
      (_, b) => [...bars[Math.min(b, bars.length - 1)]]);
    setSecPercBeat(next);
  };
  const bassSeed = d => {
    const src = bassSrcOf(d), n = beatSteps(barBeats);
    if (src && src.beat) return grooveSeed(src.beat, d, n, n2 => Array.from({ length: n2 }, () => ""));
    const pat = src && src.pat ? (BASS[src.pat] || {}).pattern : null;
    return Array.from({ length: d.nbars }, () => Array.from({ length: n }, (_, s) => {
      const tok = pat ? sampleAt(pat, s, n) : null;
      return tok && tok !== "-" ? tok : "";
    }));
  };
  const bassGridBars = d => {
    const own = secBassBeat[d.key], n = beatSteps(barBeats);
    if (!own || !own.length) return bassSeed(d);
    return Array.from({ length: d.nbars }, (_, b) => {
      const bar = own[Math.min(b, own.length - 1)];
      return bar && bar.length === n ? bar : Array.from({ length: n }, () => "");
    });
  };
  const tapBass = (d, bar, step, tok) => {
    const bars = bassGridBars(d);
    setSecBassBeat({ ...secBassBeat, [d.key]: bars.map((b, i) =>
      i === bar ? b.map((s, j) => j === step ? (s === tok ? "" : tok) : s) : [...b]) });
  };
  const resetBassBeat = key => { const next = { ...secBassBeat }; delete next[key]; setSecBassBeat(next); };
  const copyBassBeat = (d, to) => {
    const bars = bassGridBars(d), next = { ...secBassBeat };
    for (const o of to) next[o.key] = Array.from({ length: o.nbars },
      (_, b) => [...bars[Math.min(b, bars.length - 1)]]);
    setSecBassBeat(next);
  };
  /* The pad and chord-rhythm grids: monophonic like the bass grid. The pad's tokens are H (a
     chord held to the next hit) and S (a stab); the chords' are the strum's own vocabulary —
     an accent, a downstroke, an upstroke — so a pass can have a rhythm of its own without the
     whole song changing patterns. */
  const PAD_ROWS = [
    ["S", "Stab", "a short chord hit — house piano territory", "#E0B85A"],
    ["H", "Hold", "the chord held until the next hit — the pad's natural state", "#7FB4D8"],
  ];
  const CHORD_ROWS = [
    [">", "Accent", "the accented strum — the big hit", "#E8794F"],
    ["D", "Down", "a full strum", "#E0B85A"],
    ["U", "Up", "the light upstroke — top strings only", "#7FB4D8"],
  ];
  const monoBars = (own, seed, d, n) => {
    if (!own || !own.length) return seed;
    return Array.from({ length: d.nbars }, (_, b) => {
      const bar = own[Math.min(b, own.length - 1)];
      return bar && bar.length === n ? bar : Array.from({ length: n }, () => "");
    });
  };
  const padSeed = d => {
    const n = beatSteps(barBeats);
    const src = padBeatOf(d);
    if (src && src.loop) return grooveSeed(src.beat, d, n, n2 => Array.from({ length: n2 }, () => ""));
    // what the pad already does: one hold on each bar's downbeat — or nothing, if no pad plays here
    const on = padOnOf(d);
    return Array.from({ length: d.nbars }, () =>
      Array.from({ length: n }, (_, s2) => (on && s2 === 0 ? "H" : "")));
  };
  const padGridBars = d => monoBars(secPadBeat[d.key], padSeed(d), d, beatSteps(barBeats));
  const tapPad = (d, bar, step, tok) => {
    const bars = padGridBars(d);
    setSecPadBeat({ ...secPadBeat, [d.key]: bars.map((b, i) =>
      i === bar ? b.map((s2, j) => j === step ? (s2 === tok ? "" : tok) : s2) : [...b]) });
  };
  const resetPadBeat = key => { const next = { ...secPadBeat }; delete next[key]; setSecPadBeat(next); };
  const copyPadBeat = (d, to) => {
    const bars = padGridBars(d), next = { ...secPadBeat };
    for (const o of to) next[o.key] = Array.from({ length: o.nbars },
      (_, b) => [...bars[Math.min(b, bars.length - 1)]]);
    setSecPadBeat(next);
  };
  const chordSeed = d => {
    const n = beatSteps(barBeats);
    const g = d.key !== GROOVE ? secChordBeat[GROOVE] : null;
    if (g && g.length) return grooveSeed(g, d, n, n2 => Array.from({ length: n2 }, () => ""));
    return Array.from({ length: d.nbars }, () => Array.from({ length: n }, (_, s2) => {
      const tok = sampleAt(rhythm.pattern, s2, n);
      return tok && tok !== "-" ? tok : "";
    }));
  };
  const chordGridBars = d => monoBars(secChordBeat[d.key], chordSeed(d), d, beatSteps(barBeats));
  const tapChordBeat = (d, bar, step, tok) => {
    const bars = chordGridBars(d);
    setSecChordBeat({ ...secChordBeat, [d.key]: bars.map((b, i) =>
      i === bar ? b.map((s2, j) => j === step ? (s2 === tok ? "" : tok) : s2) : [...b]) });
  };
  const resetChordBeat = key => { const next = { ...secChordBeat }; delete next[key]; setSecChordBeat(next); };
  /* ---- write one groove track across the whole song ----
     The sections follow the groove sketch on their own: a pass only stops following when it is
     given a version of this track that is its own — a pattern picked on the Arrange tab, a
     template's pick, or a written grid. So "play the sketch's drums everywhere" is a clearing
     move: drop every section's own version of this one track and the whole song follows the
     sketch again. The arrangement's *layout* survives on purpose — "off" picks, the mutes and
     the drum subtractions (a build's kick-out is arrangement, not material) all stay, and no
     other track is touched. */
  const keepIf = (map, keep) => Object.fromEntries(
    Object.entries(map).filter(([k, v]) => k === GROOVE || keep(v)));
  const writeAcross = {
    drums:  () => { setSecDrum(keepIf(secDrum, v => v && (!DRUMS[v] || DRUM_CUTS.has(v))));
                    setSecBeat(keepIf(secBeat, () => false)); },
    perc:   () => { setSecPercPat(keepIf(secPercPat, v => v === "off"));
                    setSecPercBeat(keepIf(secPercBeat, () => false)); },
    bass:   () => { setSecBassPat(keepIf(secBassPat, v => v === "off"));
                    setSecBassBeat(keepIf(secBassBeat, () => false)); },
    pad:    () => { setSecPadVoice(keepIf(secPadVoice, v => v === "off"));
                    setSecPadBeat(keepIf(secPadBeat, () => false)); },
    chords: () => setSecChordBeat(keepIf(secChordBeat, () => false)),
  };
  // does any section hold a version of its own that this button would hand back to the sketch?
  const acrossPinned = {
    drums:  () => Object.entries(secDrum).some(([k, v]) => k !== GROOVE && v && DRUMS[v] && !DRUM_CUTS.has(v))
      || Object.keys(secBeat).some(k => k !== GROOVE),
    perc:   () => Object.entries(secPercPat).some(([k, v]) => k !== GROOVE && v && v !== "off")
      || Object.keys(secPercBeat).some(k => k !== GROOVE),
    bass:   () => Object.entries(secBassPat).some(([k, v]) => k !== GROOVE && v && v !== "off")
      || Object.keys(secBassBeat).some(k => k !== GROOVE),
    pad:    () => Object.entries(secPadVoice).some(([k, v]) => k !== GROOVE && v && v !== "off")
      || Object.keys(secPadBeat).some(k => k !== GROOVE),
    chords: () => Object.keys(secChordBeat).some(k => k !== GROOVE),
  };
  const ACROSS_NAME = { drums:"drums", perc:"percussion", bass:"bassline", pad:"pad", chords:"chord rhythm" };
  const wholeSongBtn = id => {
    const pinned = acrossPinned[id]();
    return (
      <button className="mini" disabled={!pinned}
        onClick={() => writeAcross[id]()}
        title={pinned
          ? `Play the sketch's ${ACROSS_NAME[id]} in every section of the song. Sections given a version of their own on the Arrange tab follow the sketch again; the arrangement's layout survives — sections it leaves this track out of stay out${id === "drums" ? ", and kick-out builds keep their subtraction" : ""} — and no other track changes.`
          : `Every section already follows the sketch's ${ACROSS_NAME[id]} — there is nothing to write across`}>
        ✍ Whole song</button>
    );
  };
  const copyChordBeat = (d, to) => {
    const bars = chordGridBars(d), next = { ...secChordBeat };
    for (const o of to) next[o.key] = Array.from({ length: o.nbars },
      (_, b) => [...bars[Math.min(b, bars.length - 1)]]);
    setSecChordBeat(next);
  };
  /* ---- Session view: track + clip management ----
     A clip's content lives in the same per-instance maps a section's own track already uses
     (melos.secs for melody, secBeat/secBassBeat/secPadBeat/secPercBeat/secChordBeat for the
     grid tracks), under sessionKey(trackId, clipId) — see the note in session.js. This block
     only ever touches the roster (sessionTracks) plus, on delete, cleaning up whichever of those
     maps the deleted track or clip could have written into. */
  const SESSION_BEAT_MAPS = {
    drums:  [secBeat, setSecBeat], bass: [secBassBeat, setSecBassBeat],
    pad:    [secPadBeat, setSecPadBeat], perc: [secPercBeat, setSecPercBeat],
    chords: [secChordBeat, setSecChordBeat],
  };
  const dropSessionKeys = (type, keys) => {
    if (type === "melody") {
      const secs = melos.progId === progId ? melos.secs : {};
      const next = { ...secs }; let changed = false;
      for (const k of keys) if (k in next) { delete next[k]; changed = true; }
      if (changed) setMelos({ progId, secs: next });
      return;
    }
    const pair = SESSION_BEAT_MAPS[type]; if (!pair) return;
    const [map, setter] = pair;
    const next = { ...map }; let changed = false;
    for (const k of keys) if (k in next) { delete next[k]; changed = true; }
    if (changed) setter(next);
  };
  const clearSessionUI = (trackId, clipId) => {
    const live = sessionLiveRef.current[trackId];
    if (live && (clipId == null || live.clipId === clipId)) {
      delete sessionLiveRef.current[trackId];
      setSessionLive(sl => { const n = { ...sl }; delete n[trackId]; return n; });
    }
    if (sessionQueueRef.current[trackId] != null && (clipId == null || sessionQueueRef.current[trackId] === clipId)) {
      delete sessionQueueRef.current[trackId];
      setSessionQueued(sq => { const n = { ...sq }; delete n[trackId]; return n; });
    }
  };
  const addSessionTrack = type => {
    const tr = newTrack(type);
    setSessionTracks([...sessionTracks, tr]);
    setSessionSel({ trackId: tr.id, clipId: tr.clips[0].id });
  };
  const removeSessionTrack = trackId => {
    const track = sessionTracks.find(t => t.id === trackId); if (!track) return;
    setSessionTracks(sessionTracks.filter(t => t.id !== trackId));
    dropSessionKeys(track.type, track.clips.map(c => sessionKey(trackId, c.id)));
    clearSessionUI(trackId);
    if (sessionSel.trackId === trackId) setSessionSel({ trackId:"", clipId:"" });
  };
  const renameSessionTrack = (trackId, name) =>
    setSessionTracks(sessionTracks.map(t => t.id === trackId ? { ...t, name } : t));
  const addSessionClip = trackId => {
    const track = sessionTracks.find(t => t.id === trackId); if (!track) return;
    const clip = newClip(nextClipNum(track), track.clips[track.clips.length - 1].nbars);
    setSessionTracks(sessionTracks.map(t => t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t));
    setSessionSel({ trackId, clipId: clip.id });
  };
  const removeSessionClip = (trackId, clipId) => {
    const track = sessionTracks.find(t => t.id === trackId);
    if (!track || track.clips.length <= 1) return;   // a track keeps at least one clip
    setSessionTracks(sessionTracks.map(t => t.id === trackId
      ? { ...t, clips: t.clips.filter(c => c.id !== clipId) } : t));
    dropSessionKeys(track.type, [sessionKey(trackId, clipId)]);
    clearSessionUI(trackId, clipId);
    if (sessionSel.trackId === trackId && sessionSel.clipId === clipId) {
      const remain = track.clips.find(c => c.id !== clipId);
      setSessionSel({ trackId, clipId: remain ? remain.id : "" });
    }
  };
  const setSessionClipLen = (trackId, clipId, nbars) => setSessionTracks(sessionTracks.map(t => t.id === trackId
    ? { ...t, clips: t.clips.map(c => c.id === clipId ? { ...c, nbars: Math.max(1, Math.min(32, nbars)) } : c) } : t));
  /* Click a clip to launch it: queued for the next bar if the Session transport is already
     running (a quantized launch, the point of the whole view), or armed to start at bar 0 and
     the transport started if it is not — the same "clicking a clip starts the room" a launcher
     always does. */
  const launchSessionClip = (trackId, clipId) => {
    // sessionModeRef, not the sessionPlaying *state* — a scene launch calls this once per track
    // in one synchronous handler, and state set moments earlier in that same handler is not yet
    // visible through a stale closure; the ref is, so every track after the first correctly sees
    // the room as already running and queues instead of each one restarting it in turn.
    if (!sessionModeRef.current) {
      // sessionPlay's own startMetro resets every clip to "nothing live" on the way up (there is
      // no prior state to preserve — this is the first clip of the room), so the actual arming
      // happens after it returns, not before, or this write would be the one getting reset.
      sessionPlay();
      sessionLiveRef.current = { ...sessionLiveRef.current, [trackId]: { clipId, startStep: 0 } };
      setSessionLive(sl => ({ ...sl, [trackId]: clipId }));
      return;
    }
    sessionQueueRef.current = { ...sessionQueueRef.current, [trackId]: clipId };
    setSessionQueued(sq => ({ ...sq, [trackId]: clipId }));
  };
  const stopSessionTrack = trackId => clearSessionUI(trackId);
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
    setSecPart(p => ({ ...p, [key]: at }));      // a new instrument opens on its own tab
  };
  const removeLayer = (key, L) => {
    const sec = secMelos[key]; if (!sec || L === 0 || !layerOf(sec, L)) return;   // part A is the section
    putSec(key, { layers: sec.layers.filter((_, i) => i !== L).map(cloneLayer) });
    setSecPart(p => ({ ...p, [key]: (p[key] || 0) >= L ? Math.max(0, L - 1) : p[key] || 0 }));
    if (melSel.key === key && melSel.layer >= L) setMelSel({ key:"", layer:0, notes:{} });
  };
  /* ---- extra drums/perc/bass/pad tracks — the same "add a 2nd one" as melody's layers, for the
     other instruments ---- */
  const TRACK_MUTE_MAP = { drums: null, perc: secPerc, bass: secBass, pad: secPad };
  const TRACK_MUTE_SETTER = { drums: null, perc: setSecPerc, bass: setSecBass, pad: setSecPad };
  // the map whose value being "off" silences a fresh track — every instrument keys "no pattern
  // chosen here" the same way, so seeding a new track with it is what keeps it silent by default
  // rather than immediately parroting the groove or the song-wide default the way an unset track
  // would (see the note beside TRACKS_FX)
  const TRACK_PAT_SETTER = { drums: setSecDrum, perc: setSecPercPat, bass: setSecBassPat, pad: setSecPadVoice };
  const TRACK_PAT_MAPS = { drums: secDrum, perc: secPercPat, bass: secBassPat, pad: secPadVoice };
  const TRACK_BEAT_SETTER = { drums: setSecBeat, perc: setSecPercBeat, bass: setSecBassBeat, pad: setSecPadBeat };
  const TRACK_BEAT_MAPS = { drums: secBeat, perc: secPercBeat, bass: secBassBeat, pad: secPadBeat };
  const trackLayerCount = (type, key) =>
    Math.max(1, Math.min(MAX_LAYERS, (secTrackLayers[key] && secTrackLayers[key][type]) || 1));
  const addTrackLayer = (type, key) => {
    const n = trackLayerCount(type, key);
    if (n >= MAX_LAYERS) return;
    setSecTrackLayers(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [type]: n + 1 } }));
    const lk = key + LSEP + n;
    TRACK_PAT_SETTER[type](prev => ({ ...prev, [lk]: "off" }));
    setTrackTab(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [type]: n } }));
  };
  // only the newest (highest-index) track comes off, the way a stack of tabs is usually torn down —
  // an arbitrary middle track would need every track above it renamed down by one suffix
  const removeTrackLayer = (type, key) => {
    const n = trackLayerCount(type, key);
    if (n <= 1) return;
    const li = n - 1, lk = key + LSEP + li;
    setSecTrackLayers(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [type]: li } }));
    const strip = (map, setter) => { if (!(lk in map)) return; const { [lk]: _drop, ...rest } = map; setter(rest); };
    strip(TRACK_PAT_MAPS[type], TRACK_PAT_SETTER[type]);
    strip(TRACK_BEAT_MAPS[type], TRACK_BEAT_SETTER[type]);
    if (TRACK_MUTE_MAP[type]) strip(TRACK_MUTE_MAP[type], TRACK_MUTE_SETTER[type]);
    setTrackTab(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [type]: Math.min(prev[key]?.[type] ?? 0, li - 1) } }));
  };
  const TRACK_NAME = { drums:"drums", perc:"perc", bass:"bass", pad:"pad" };
  const activeLayerOf = (type, key) =>
    Math.min(trackLayerCount(type, key) - 1, (trackTab[key] && trackTab[key][type]) || 0);
  /* The tab strip a drums/perc/bass/pad grid opens with once it has more than one track — the
     same shape as melody's own part tabs (lytab/lytabs), so "add a 2nd bassline" reads as the
     same move as "add a 2nd melody" rather than a whole new idea. */
  const trackTabStrip = (type, d) => {
    const n = trackLayerCount(type, d.key);
    if (n <= 1) return (
      <button className="mini" onClick={() => addTrackLayer(type, d.key)}
        title={`Add a second ${TRACK_NAME[type]} track, played alongside this one — the same idea as a 2nd melody`}>
        ＋ 2nd {TRACK_NAME[type]}</button>
    );
    const active = activeLayerOf(type, d.key);
    return (
      <span className="row lytabs" style={{ gap:5 }}>
        {Array.from({ length: n }, (_, li) => (
          <button key={li} className={"lytab" + (active === li ? " on" : "")}
            style={{ "--ly": LAYER_INK[li] }}
            title={TRACK_NAME[type] + " track " + LAYER_NAMES[li]}
            onClick={() => setTrackTab(prev => ({ ...prev, [d.key]: { ...(prev[d.key] || {}), [type]: li } }))}>
            {LAYER_NAMES[li]}
          </button>
        ))}
        {n < MAX_LAYERS &&
          <button className="lytab lyadd" onClick={() => addTrackLayer(type, d.key)}
            title={`Add another ${TRACK_NAME[type]} track`}>＋</button>}
        {active === n - 1 &&
          <button className="mini" onClick={() => removeTrackLayer(type, d.key)}
            title={`Remove ${TRACK_NAME[type]} track ${LAYER_NAMES[n - 1]}`}>🗑</button>}
      </span>
    );
  };
  /* Copy one part's whole settings set onto the same part of other sections — every field it
     carries except its notes, which stay each section's own. The point of the feature is that
     "the bass sound I built in the first chorus" is a thing you can move, and building it again
     by hand in four more sections is how a sketch stops being a sketch. */
  const copyPartSettings = (fromKey, L, toKeys) => {
    const src = layerOf(secMelos[fromKey], L); if (!src) return 0;
    const { bars, flat, ...settings } = cloneLayer(src);      // everything but the notes
    const secs = melos.progId === progId ? melos.secs : {};
    const next = { ...secs };
    let n = 0;
    for (const key of toKeys) {
      const sec = secMelos[key]; if (!sec || key === fromKey) continue;
      // a section with fewer parts gets one made, so "copy to every verse" means every verse
      const grown = sec.layers.length > L ? sec.layers.map(cloneLayer)
        : [...sec.layers.map(cloneLayer), ...Array.from({ length: L + 1 - sec.layers.length }, () =>
            ({ bars: blankBars(sec.layers[0].bars.length, meloBeats), instr: null,
               oct: 0, vol: 1, mute: false, solo: false, send: 0 }))];
      next[key] = { ids: sec.ids, layers: grown.map((ly, i) => i === L ? { ...ly, ...settings } : ly) };
      n++;
    }
    if (n) setMelos({ progId, secs: next });
    return n;
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
    if (!melMove) {                                         // draw mode → paint, or tap on touch
      if (e.pointerType === "touch") return;                // onClick handles those, so the page still scrolls
      e.preventDefault();
      const bars = dupBars(barsOf(sec, L)); if (!bars) return;
      paintStart({ kind:"melody", key, layer:L, bars, want: !noteOn(sec, c, deg, L), seen: new Set() });
      paintMelAt(c, deg);
      return;
    }
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

  /* ---- painting cells by dragging ----
     Both grids are a wall of small targets, and putting a hat on every sixteenth of four bars is
     sixty-four separate clicks. Holding the button down and dragging paints instead. The cell you
     press decides the whole stroke — press an empty one and you are drawing, press a full one and
     you are erasing — and every cell the pointer crosses is set to that. Dragging back over your
     own line therefore rubs it out rather than flickering it on and off, which is what a stroke
     that re-toggled would do.

     Touch keeps tap-to-toggle. Dragging a finger across the page is how you scroll it, and taking
     that away to paint would be a bad trade on the one device where the cells are hardest to hit.

     The stroke accumulates in a ref rather than re-reading state per cell. Several pointermove
     events land between renders, and each writer here spreads the render's own copy of the
     document — so cell-by-cell writes would each start from the same stale bars and only the last
     one would survive. */
  const paintRef = useRef(null);
  // a pointerdown that painted has already done the work; the click it is followed by must not
  // undo it by toggling the same cell straight back
  const skipClickRef = useRef(false);
  const [painting, setPainting] = useState(false);

  const paintMelAt = (c, deg) => {
    const p = paintRef.current; if (!p || p.kind !== "melody") return;
    const k = c + ":" + deg; if (p.seen.has(k)) return;
    p.seen.add(k);
    const cell = p.bars[Math.floor(c / meloBeats)][c % meloBeats];
    const at = cell.indexOf(deg);
    if (p.want && at < 0) cell.push(deg);
    else if (!p.want && at >= 0) cell.splice(at, 1);
    else return;                                  // already how the stroke wants it
    putLayer(p.key, p.layer, p.bars);
  };
  const paintDrumAt = (bar, step, ch) => {
    const p = paintRef.current; if (!p || p.kind !== "drums") return;
    const k = bar + ":" + step + ":" + ch; if (p.seen.has(k)) return;
    p.seen.add(k);
    if (p.bars[bar][step].includes(ch) === p.want) return;
    p.bars[bar] = beatToggle(p.bars[bar], step, ch);
    putBeat(p.key, p.bars.map(b => [...b]));
  };
  // the perc grid paints exactly as the drum grid does, into its own store
  const paintPercAt = (bar, step, ch) => {
    const p = paintRef.current; if (!p || p.kind !== "perc") return;
    const k = bar + ":" + step + ":" + ch; if (p.seen.has(k)) return;
    p.seen.add(k);
    if (p.bars[bar][step].includes(ch) === p.want) return;
    p.bars[bar] = beatToggle(p.bars[bar], step, ch, PERC_ORDER);
    setSecPercBeat({ ...secPercBeat, [p.key]: p.bars.map(b => [...b]) });
  };
  // the bass, pad and chord grids are monophonic: painting a row writes that token over the
  // step, rubbing out clears it. One handler each, differing only in where the bars are kept.
  const paintMono = (kind, setter, cur) => (bar, step, tok) => {
    const p = paintRef.current; if (!p || p.kind !== kind) return;
    const k = bar + ":" + step; if (p.seen.has(k)) return;
    p.seen.add(k);
    const val = p.bars[bar][step];
    if (p.want ? val === tok : val !== tok) return;
    p.bars[bar] = p.bars[bar].map((s, j) => j === step ? (p.want ? tok : "") : s);
    setter({ ...cur(), [p.key]: p.bars.map(b => [...b]) });
  };
  const paintBassAt = paintMono("bass", setSecBassBeat, () => secBassBeat);
  const paintPadAt = paintMono("padbeat", setSecPadBeat, () => secPadBeat);
  const paintChordAt = paintMono("chordbeat", setSecChordBeat, () => secChordBeat);
  /* elementFromPoint rather than an enter handler per cell, because a pointer that has been
     captured keeps sending its moves to the element it started on — so the cells it crosses would
     never hear about it. */
  const paintMove = e => {
    const p = paintRef.current; if (!p) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const ds = el && el.dataset; if (!ds) return;
    if (p.kind === "melody") { if (ds.mk === p.key) paintMelAt(+ds.c, +ds.deg); }
    else if (p.kind === "perc") { if (ds.pk === p.key) paintPercAt(+ds.bar, +ds.step, ds.ch); }
    else if (p.kind === "bass") { if (ds.bk === p.key) paintBassAt(+ds.bar, +ds.step, ds.tok); }
    else if (p.kind === "padbeat") { if (ds.qk === p.key) paintPadAt(+ds.bar, +ds.step, ds.tok); }
    else if (p.kind === "chordbeat") { if (ds.ck === p.key) paintChordAt(+ds.bar, +ds.step, ds.tok); }
    else if (ds.dk === p.key) paintDrumAt(+ds.bar, +ds.step, ds.ch);
  };
  const paintUp = () => {
    paintRef.current = null;
    setPainting(false);
    window.removeEventListener("pointermove", paintMove);
    window.removeEventListener("pointerup", paintUp);
    window.removeEventListener("pointercancel", paintUp);
  };
  const paintStart = start => {
    paintRef.current = start;
    setPainting(true);
    skipClickRef.current = true;
    window.addEventListener("pointermove", paintMove);
    window.addEventListener("pointerup", paintUp);
    window.addEventListener("pointercancel", paintUp);
  };
  // the drum grid's own pointerdown; the melody grid's is folded into melDown, which already owns
  // that event for the move/marquee mode
  const beatDown = (e, d, bar, step, ch) => {
    if (e.pointerType === "touch") return;
    e.preventDefault();
    const bars = beatBars(d).map(b => [...b]);
    paintStart({ kind:"drums", key: d.key, bars, want: !bars[bar][step].includes(ch), seen: new Set() });
    paintDrumAt(bar, step, ch);
  };
  const percDown = (e, d, bar, step, ch) => {
    if (e.pointerType === "touch") return;
    e.preventDefault();
    const bars = percGridBars(d).map(b => [...b]);
    paintStart({ kind:"perc", key: d.key, bars, want: !bars[bar][step].includes(ch), seen: new Set() });
    paintPercAt(bar, step, ch);
  };
  const bassDown = (e, d, bar, step, tok) => {
    if (e.pointerType === "touch") return;
    e.preventDefault();
    const bars = bassGridBars(d).map(b => [...b]);
    paintStart({ kind:"bass", key: d.key, bars, want: bars[bar][step] !== tok, seen: new Set() });
    paintBassAt(bar, step, tok);
  };
  const padDown = (e, d, bar, step, tok) => {
    if (e.pointerType === "touch") return;
    e.preventDefault();
    const bars = padGridBars(d).map(b => [...b]);
    paintStart({ kind:"padbeat", key: d.key, bars, want: bars[bar][step] !== tok, seen: new Set() });
    paintPadAt(bar, step, tok);
  };
  const chordBeatDown = (e, d, bar, step, tok) => {
    if (e.pointerType === "touch") return;
    e.preventDefault();
    const bars = chordGridBars(d).map(b => [...b]);
    paintStart({ kind:"chordbeat", key: d.key, bars, want: bars[bar][step] !== tok, seen: new Set() });
    paintChordAt(bar, step, tok);
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

  /* ---- vary the repeats inside one section ----
     A section is normally one motif said several times — a one-bar riff over four bars, a two-bar
     hook over eight — and said identically each time it is the part of a sketch that wears out
     first. This finds the restatements in the part you are editing and edits everything but the
     first of them: a different landing note, a note added or taken away, a phrase pushed early. The
     opening statement is left exactly as written, so what comes back is still the tune you wrote,
     with the repeats no longer being repeats.

     Each press goes one step further rather than one step more scrambled: the variations are always
     re-derived from the melody as it stood before the first press, so ×3 is what ×1 would have been
     at three edits a repeat — not three rounds of editing compounded on each other. Tap past the top
     and it comes back round to the melody you started with, which is the cheapest possible undo for
     a control whose whole job is to be tried a few times. */
  const varyKeyOf = (key, L) => key + ":" + L;
  const melKey = bars => JSON.stringify(bars);
  const VARY_IN_MAX = 5;                                    // past this the motif stops being the motif
  const varyRepeats = (d, L) => {
    const sec = secMelos[d.key]; if (!sec) return;
    const cur = barsOf(sec, L); if (!cur) return;
    const k = varyKeyOf(d.key, L), st = varyIn[k];
    /* The stored baseline is only good while the grid still holds what we last wrote to it. Draw a
       note, undo, write a pattern over the top — and the melody in front of the writer is a new
       first statement, not a varied old one. Comparing the notes rather than trusting the counter is
       what keeps the button honest through an edit it never heard about. */
    const fresh = !st || melKey(cur) !== st.grid;
    const base = fresh ? cur : st.base;
    const level = (fresh ? 0 : st.level) + 1;
    const seed = [...d.key].reduce((a, c) => a + c.charCodeAt(0), 0) * 131 + L * 17;
    const res = varyWithin(base, { nd: scaleSemis.length, amount: level, seed });
    // nothing restates itself here, so there is nothing to make less boring — say so rather than
    // quietly editing a through-composed melody the writer never asked to have rewritten
    if (!res.repeats) {
      setVaryIn({ ...varyIn, [k]: { base, grid: melKey(cur), level: 0, note: "nothing repeats in this melody" } });
      return;
    }
    // one past the top is the way back: the melody as it was, and the next press starts again
    const back = level > VARY_IN_MAX;
    const bars = back ? dupBars(base) : res.bars;
    putLayer(d.key, L, bars);
    setVaryIn({ ...varyIn, [k]: { base, grid: melKey(bars), level: back ? 0 : level,
      note: back ? "back to the melody you wrote"
        : `${res.varied} of ${res.repeats} repeat${res.repeats > 1 ? "s" : ""} varied · `
          + (res.span > 1 ? `${res.span}-bar motif` : "1-bar motif") } });
  };
  // back to the melody as it was before the first press, with the counter cleared
  const resetVaryIn = (d, L) => {
    const k = varyKeyOf(d.key, L), st = varyIn[k];
    if (!st || !st.level) return;
    putLayer(d.key, L, dupBars(st.base));
    const next = { ...varyIn }; delete next[k]; setVaryIn(next);
  };

  /* ---- syncopate: anticipation as a one-tap edit ----
     The single most reliable catchiness trick there is — a note arriving half a beat before the
     beat it was written on, held through it. Same baseline discipline as ✦ Vary repeats: each press
     re-derives from the melody as it stood before the first one, so press two pushes harder rather
     than pushing the pushed, and the third press is the way back. */
  const syncopateMel = (d, L) => {
    const sec = secMelos[d.key]; if (!sec) return;
    const cur = barsOf(sec, L); if (!cur) return;
    const k = varyKeyOf(d.key, L), st = syncIn[k];
    const fresh = !st || melKey(cur) !== st.grid;
    const base = fresh ? cur : st.base;
    const level = ((fresh ? 0 : st.level) + 1) % 3;
    const bars = level ? syncopateBars(base, meloSub, level) : dupBars(base);
    const moved = melKey(bars) !== melKey(base);
    putLayer(d.key, L, bars);
    setSyncIn({ ...syncIn, [k]: { base, grid: melKey(bars), level,
      note: level === 0 ? "back as written"
        : !moved ? "nothing square on the beat to push"
        : level === 1 ? "backbeats pushed early" : "every beat pushed early" } });
  };

  /* ---- the hook duel ----
     Catchy hooks come from volume and selection, not from taking the first plausible line. The duel
     breeds a pool of rivals from the melody on the grid and plays them pairwise: hear A, hear B,
     tap the winner, and the loser's place is taken by the next rival — or, once the pool is spent,
     by a fresh mutation of the reigning champion. Whatever you keep is just notes on the grid;
     cancel puts back exactly what was there. The section loops while the duel runs, because five
     seconds of A against five of B is the whole method. */
  const duelSeedOf = (key, L) => [...key].reduce((a, c) => a + c.charCodeAt(0), 0) * 233 + L * 41;
  const startDuel = (d, sec, L) => {
    const base = dupBars(barsOf(sec, L) || []);
    if (!base.some(b => b.some(c => c.length))) return;
    const seed = duelSeedOf(d.key, L);
    const pool = hookPool(base, { n: 8, seed, nd: scaleSemis.length });
    if (!pool.length) { setIoNote("This melody resists variation — nothing to duel against."); return; }
    setDuel({ key: d.key, L, seed, base, pool, champ: base, champLbl: "the original",
      chalIdx: 0, round: 0, side: null, loopWas: loopSec });
    // a Session clip is not on the song's timeline, so it loops by being launched — the clip's
    // own d.launch — where a section loops by confining playback to its bar window
    if (d.launch) d.launch();
    else if (loopSec !== d.key) toggleLoopSec(d);
  };
  const duelHear = (d, side) => {
    if (!duel) return;
    const bars = side === "A" ? duel.champ : duel.pool[duel.chalIdx];
    putLayer(d.key, duel.L, dupBars(bars));
    setDuel({ ...duel, side });
    if (d.launch) d.launch();
    else if (loopSec !== d.key) toggleLoopSec(d);
    else if (!playing) startMetro(d.key === GROOVE ? 0 : d.startBar);
  };
  const duelPick = (d, side) => {
    if (!duel) return;
    const champ = side === "A" ? duel.champ : duel.pool[duel.chalIdx];
    const champLbl = side === "A" ? duel.champLbl : "rival " + (duel.chalIdx + 1);
    const pool = [...duel.pool];
    // the pool spent, the champion breeds the next challenger — the family keeps converging
    if (duel.chalIdx + 1 >= pool.length)
      pool.push(mutateHook(champ, { seed: duel.seed + (duel.round + 1) * 977,
        pass: duel.round + 2, nd: scaleSemis.length, amount: 2 }));
    putLayer(d.key, duel.L, dupBars(champ));               // the grid always holds the champion
    setDuel({ ...duel, champ, champLbl, pool, chalIdx: duel.chalIdx + 1,
      round: duel.round + 1, side: "A" });
  };
  const endDuel = (d, keepChamp) => {
    if (!duel) return;
    putLayer(d.key, duel.L, dupBars(keepChamp ? duel.champ : duel.base));
    // a clip never took the section loop, so there is nothing to hand back for one
    if (!d.launch && loopSec === d.key && duel.loopWas !== d.key) toggleLoopSec(d);   // hand the loop back
    setIoNote(keepChamp
      ? (duel.round ? `Kept ${duel.champLbl} after ${duel.round} duel${duel.round > 1 ? "s" : ""}.` : "Kept the original.")
      : "Duel cancelled — the melody is back as it was.");
    setDuel(null);
  };

  /* ---- the chorus lift ----
     The moment listeners decide a song is catchy is the first chorus, and the standard kit for
     lifting one is always the same: the melody sung higher, the lead thickened, the accents leant
     on, every subtraction removed, the hook saying a little more per bar. Each ingredient is one
     tap and individually reversible — the kit is learnable, not a black box. Everything that lands
     on part A goes through ONE putSec, because two setLayerProp calls in one handler both spread
     the same render's melos and the second write clobbers the first. */
  const LIFTS = [
    { id:"higher", name:"sing it higher", tip:"Part A up a third, in key (its Scale-steps setting). Pop's big chorus is usually the same notes sung higher." },
    { id:"double", name:"double the octave", tip:"Part A doubled an octave up — the cheapest way to make a thin lead sound expensive." },
    { id:"accent", name:"lean the accents", tip:"Part A's downbeats played harder, so the hook pushes instead of ambling." },
    { id:"allin", name:"everything in", tip:"Every subtraction on this section — drums out, chords out, bass or pad off, parts muted out — is lifted. The chorus is where the full stack earns its keep." },
    { id:"busier", name:"busier hook", tip:"Two small additive edits to the melody — an added note, a split held note — so the chorus says more per bar. Reversible here, and by ⌘Z." },
  ];
  const liftOf = d => liftSt[d.key] || { on: {}, prev: {} };
  // the part-A modulation an ingredient sets; "allin" and "busier" are handled beside it
  const liftPatch = (ing, ly) => (
    ing === "higher" ? { dia: Math.min(7, (modOf(ly, "dia") || 0) + 2) }
    : ing === "double" ? { oct2: 1 }
    : ing === "accent" ? { accent: Math.max(35, modOf(ly, "accent") || 0) } : null);
  const applyLift = (d, ings) => {
    const sec = secMelos[d.key]; if (!sec) return;
    const ly = layerOf(sec, 0) || {};
    const st = liftOf(d);
    const prev = { ...st.prev }, on = { ...st.on };
    let mods = {}, bars = null, n = 0;
    for (const ing of ings) {
      if (on[ing]) continue;
      n++;
      const p = liftPatch(ing, ly);
      if (p) {
        for (const k of Object.keys(p)) if (!(k in prev)) prev[k] = modOf(ly, k);
        mods = { ...mods, ...p };
      }
      if (ing === "busier") {
        prev.bars = dupBars(barsOf(sec, 0) || []);
        bars = dupBars(prev.bars);
        varyPass(bars, { pass: 1, seed: 613, nd: scaleSemis.length, amount: 2 });
      }
      if (ing === "allin") {
        prev.allin = { drum: secDrum[d.key], quiet: secQuiet[d.key], bass: secBass[d.key],
          bassPat: secBassPat[d.key], percPat: secPercPat[d.key], padV: secPadVoice[d.key],
          partOut: secPartOut[d.key] };
        const lift1 = (m, set, when) => {
          if (m[d.key] !== undefined && when(m[d.key])) { const nx = { ...m }; delete nx[d.key]; set(nx); }
        };
        lift1(secDrum, setSecDrum, v => v === "off");
        lift1(secQuiet, setSecQuiet, v => v === true);
        lift1(secBass, setSecBass, v => v === true);
        lift1(secBassPat, setSecBassPat, v => v === "off");
        lift1(secPercPat, setSecPercPat, v => v === "off");
        lift1(secPadVoice, setSecPadVoice, v => v === "off");
        lift1(secPartOut, setSecPartOut, () => true);
      }
      on[ing] = true;
    }
    if (!n) return;
    if (Object.keys(mods).length || bars)
      putSec(d.key, { layers: sec.layers.map((l, li) => li === 0
        ? { ...cloneLayer(l), ...mods, ...(bars ? { bars } : {}), mute: false } : cloneLayer(l)) });
    setLiftSt({ ...liftSt, [d.key]: { on, prev } });
    if (n > 1) setIoNote(`${d.key} lifted — ${n} ingredients on. Tap any one of them to take it back off.`);
  };
  const unLift = (d, ing) => {
    const st = liftOf(d); if (!st.on[ing]) return;
    const prev = { ...st.prev }, on = { ...st.on };
    delete on[ing];
    if (ing === "allin") {
      const p = prev.allin || {};
      const put1 = (m, set, v) => {
        const nx = { ...m }; if (v === undefined) delete nx[d.key]; else nx[d.key] = v; set(nx);
      };
      put1(secDrum, setSecDrum, p.drum); put1(secQuiet, setSecQuiet, p.quiet);
      put1(secBass, setSecBass, p.bass); put1(secBassPat, setSecBassPat, p.bassPat);
      put1(secPercPat, setSecPercPat, p.percPat); put1(secPadVoice, setSecPadVoice, p.padV);
      put1(secPartOut, setSecPartOut, p.partOut);
      delete prev.allin;
    } else if (ing === "busier") {
      if (prev.bars) putLayer(d.key, 0, dupBars(prev.bars));
      delete prev.bars;
    } else {
      const k1 = ing === "higher" ? "dia" : ing === "double" ? "oct2" : "accent";
      const patch = { [k1]: prev[k1] };
      delete prev[k1];
      setLayerProp(d.key, 0, patch);
    }
    setLiftSt({ ...liftSt, [d.key]: { on, prev } });
  };

  /* ---- melodic narrative: one shape written across every section at once ---- */
  const narId = narSel.key === progId ? narSel.id : "";
  const curNar = NARRATIVES.find(n => n.id === narId) || null;
  const varyAmt = varySt.key === progId ? varySt.val : 1;
  const narSync = narSyncSt.key === progId ? narSyncSt.val : 0;
  const narWithin = narInSt.key === progId ? narInSt.val : false;
  // the slider's dial positions in words, anchored on the levels the old menu offered
  const VARY_MAX = 6;
  const varyWords = a => a <= 0 ? "identical repeats" : a < 0.75 ? "barely varied"
    : a < 1.5 ? "vary a little" : a < 2.5 ? "vary more" : a < 3.5 ? "vary a lot"
    : a < 5 ? "really varied" : "barely repeats";
  // the bar's chord as a scale degree — the hook narratives use to follow the harmony
  const chordDegsOf = cs => cs.map(c => {
    const i = scaleNotes.indexOf(((c.root % 12) + 12) % 12);
    return i >= 0 ? i : null;
  });
  // write every section's melody A in one state update (a putSec per section would read stale state)
  const applyNarrative = (id, amt = varyAmt, sync = narSync, within = narWithin) => {
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
      /* Syncopation lands on the generated line BEFORE the repeats are varied, so the pushed
         phrasing is part of the tune itself: pass 0 leans the same way the others do, and the
         variations are heard against the syncopated statement rather than fighting it. */
      const shaped = sync ? syncopateBars(gen, meloSub, sync) : gen;
      // second chorus, third verse: same tune, small edits. Pass 0 is left alone — it is the thing
      // the later ones are variations of.
      let bars = varyBars(shaped, { pass, role: d.base, nd: scaleSemis.length, amount: amt });
      /* …and, asked for, the repeats *inside* the section too: the restated motifs — the one-bar
         riff said four times, the two-bar hook said twice — each drift from their first statement,
         which stays as written. Seeded per role and pass so chorus 1 and chorus 2 drift their own
         ways, and skipped at amount 0 so the identical-repeats end of the slider means identical. */
      if (within && amt > 0)
        bars = varyWithin(bars, { nd: scaleSemis.length, amount: amt,
          seed: d.base.charCodeAt(0) * 131 + pass * 977 }).bars;
      const sec = secMelos[d.key], prev = secs[d.key] || {};
      /* A narrative writes part A of every section and nothing else — cloneLayer rather than a
         bars/instr pair, so registers, levels, mutes and sends survive. A part the section
         inherits from the groove stays out of the saved layers, so it goes on following the
         groove live rather than freezing as a copy; and part A lands unmuted — a shape you
         asked for should be heard. */
      const inh = (sec && sec.inhParts) || {};
      const keep = sec ? sec.layers.map((ly, li) => li > 0 && inh[li]
          ? cloneLayer((prev.layers || [])[li] || { bars: [], instr: null }) : cloneLayer(ly))
        : (prev.layers || [{ bars: [], instr: null }]).map(cloneLayer);
      secs[d.key] = { ids: sec ? sec.ids : prev.ids,
        layers: keep.map((ly, i) => i === 0 ? { ...ly, bars, mute: false } : ly) };
    });
    setNarUndo(melos);                       // one step back, in case it wrote over something good
    setMelos({ progId, secs });
  };
  /* One section's own narrative, written over whatever is there. A song-wide narrative is a first
     draft of the whole thing; this is for the bridge that should not be another arch, or the second
     chorus you want to climb where the first fell. It hands the generator exactly the numbers the
     song-wide pass would have — which section this is, which pass of its kind, and where it sits in
     the running order — so a section rewritten on its own still sits where it sits, rather than
     coming out as if it were the opening bar of the song. */
  const applySecNarrative = (d, id) => {
    setSecNar({ ...secNar, [d.key]: id });
    const nar = NARRATIVES.find(n => n.id === id);
    if (!nar) return;                                  // "" means: leave the notes alone
    const idx = sections.insts.findIndex(o => o.key === d.key);
    const total = sections.insts.length;
    const kin = sections.insts.filter(o => o.base === d.base);
    const pass = Math.max(0, kin.findIndex(o => o.key === d.key));
    const spots = rhythmSpots(ROLE_RHYTHM[d.base] || "straight", meloBeats, meloSub, barBeats);
    const gen = nar.gen({ nBars: d.cs.length, B: meloBeats, sub: meloSub, nd: scaleSemis.length, spots,
      chordDegs: chordDegsOf(d.cs), role: d.base, pass, passes: kin.length,
      idx, total, frac: total > 1 ? idx / (total - 1) : 0 });
    setNarUndo(melos);                                 // one step back, same as the song-wide write
    // like the song-wide write: part A only, unmuted, and inherited parts stay following the
    // groove rather than freezing as copies (putLayer would materialise the whole section)
    // — and through the same three dials: syncopation first, then the pass's variation, then
    // the drift between the motif's restatements inside the section
    const shaped = narSync ? syncopateBars(gen, meloSub, narSync) : gen;
    let bars = varyBars(shaped, { pass, role: d.base, nd: scaleSemis.length, amount: varyAmt });
    if (narWithin && varyAmt > 0)
      bars = varyWithin(bars, { nd: scaleSemis.length, amount: varyAmt,
        seed: d.base.charCodeAt(0) * 131 + pass * 977 }).bars;
    const sec = secMelos[d.key]; if (!sec) return;
    const prev = (melos.progId === progId ? melos.secs : {})[d.key] || {};
    const inh = sec.inhParts || {};
    putSec(d.key, { layers: sec.layers.map((ly, li) =>
      li === 0 ? { ...cloneLayer(ly), bars, mute: false }
      : inh[li] ? cloneLayer((prev.layers || [])[li] || { bars: [], instr: null })
      : cloneLayer(ly)) });
  };
  const undoNarrative = () => {
    if (!narUndo) return;
    setMelos(narUndo); setNarUndo(null); setNarSel({ key: progId, id: "" });
  };
  {
    const idx = chords.map((_, i) => i);
    chordsRef.current = { list: chords, seq: idx.length % 2 ? [...idx, idx.length - 1] : idx, struct: structBars };
    // the loop window follows the toggled section's current position (it moves as the structure
    // is edited). The groove sketch is not one of the song's sections — its loop is the mode
    // flag, kept here or the very next render would silently hand playback back to the song.
    const ld = loopSec && loopSec !== GROOVE ? sections.insts.find(s => s.key === loopSec) : null;
    loopRef.current = loopSec === GROOVE ? { groove: true, len: grooveInst.nbars }
      : ld ? { from: ld.startBar, len: ld.nbars } : null;
  }
  const nudgeBpm = d => setBpmSt({ key: progId, val: Math.max(40, Math.min(220, effBpm + d)) });

  const stopMetro = () => {
    const m = metroRef.current;
    if (m) { clearInterval(m.timer); try { m.ctx.close(); } catch (e) {} metroRef.current = null; }
    setPlaying(false); setCurStep(-1); setCurBar(-1); setCurLabel(null); setCurQ(null); setCurInst(null); setCurSongBar(-1);
    // whichever transport was running, a full stop clears every clip that was live or queued —
    // there is no "paused, waiting to resume" state for the Session view
    sessionModeRef.current = false; setSessionPlaying(false);
    sessionLiveRef.current = {}; sessionQueueRef.current = {};
    setSessionLive({}); setSessionQueued({});
  };
  // The audio graph, built into whatever context it is given — a live AudioContext for playback,
  // an OfflineAudioContext for rendering the song to a file. Everything downstream of `master`
  // is identical either way, so a render sounds like what you heard.
  const buildGraph = (ctx, from, stem) => {
  // fixed once, here, so every LFO-bearing insert (chorus/flanger/phaser) built below — on the
  // master path or on a track — shares the same phase reference every other LFO in this graph
  // already uses (see `t0v` and the part-chain LFOs further down)
  const fxT0 = ctx.currentTime;
  /* Which type ids each bus's rack needs to be *built* with. A section can now run a genuinely
     different insert type from the song's own, live, at a boundary (see `makeFxMultiSlot` in
     audio.js and `writeFxRack` in the per-beat block below) — but only among ids that were built.
     So every bus builds one chain per id that could be wanted for it *anywhere in the current
     song*: the song's own default plus every section override stored under any key — instance or
     letter, whether or not that key belongs to the arrangement currently loaded, since a saved
     override on a section nobody has open right now must still work the moment it's scrolled back
     into view. Deduped, "off" always included as a safe fallback. A type nothing in the song asked
     for before this Play/render started has no chain and so needs a restart to be heard, exactly
     like a delay time or a bass voice always has. Master has no per-section entry — it colours the
     whole song by design — so there is nothing to union: its set is just its own two slot types. */
  const FR = fxRackRef.current || {};
  const SFXAll = secFxRef.current || {};
  const fxIdsFor = bus => {
    const song = FR[bus] || [];
    if (bus === "master")
      return [0, 1].map(si => Array.from(new Set([(song[si] || {}).type || "off", "off"])));
    const sets = [new Set(["off"]), new Set(["off"])];
    [0, 1].forEach(si => sets[si].add((song[si] || {}).type || "off"));
    for (const key in SFXAll) {
      const busSlots = SFXAll[key] && SFXAll[key][bus];
      if (!busSlots) continue;
      [0, 1].forEach(si => sets[si].add((busSlots[si] || {}).type || "off"));
    }
    return sets.map(s => Array.from(s));
  };
  // which id starts audible in each slot — always the song's own current type, so a fresh Play or
  // render sounds exactly like the Sound tab's rack until a section's own tick says otherwise
  const fxActiveFor = bus => {
    const s = FR[bus] || [];
    return [(s[0] || {}).type || "off", (s[1] || {}).type || "off"];
  };
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
  // the drawn hi-pass — the other half of the DJ filter. Its own node, never the move's or the
  // transition's: two envelopes on one AudioParam and the second silently eats the first.
  const autoHp = ctx.createBiquadFilter();
  autoHp.type = "highpass"; autoHp.frequency.value = 20; autoHp.Q.value = 0.6;
  const autoGain = ctx.createGain(); autoGain.gain.value = 1;
  autoFilt.connect(autoHp); autoHp.connect(autoGain);
  /* The transition stage sits between the master and the automation lanes, with its own filters and
     its own gain. Its own, and not the move filter's, because a move's envelope stops on a boundary
     and a transition's runs across one — two envelopes on one AudioParam and the second silently
     eats the first. On the master path rather than the pitched bus because drums bypass that bus
     entirely, and a stutter that leaves the drums running is not a stutter.
     `fx` is where risers, rolls and crashes go: added sources, so they belong to exactly one stem. */
  const tn = makeTrans(ctx, autoFilt, 60 / (bpmRef.current || 120), !!(stem && stem.kind !== "fx"));
  let master, fxMaster = null;
  if (stem) {
    master = ctx.createGain(); master.gain.value = 0.65; master.connect(tn.in);
    autoGain.connect(ctx.destination);
  } else {
    const limiter = ctx.createDynamicsCompressor();  // tame peaks so stacked samples don't clip
  // firm brick-wall limiting: a high ratio + short attack so stacked/ringing voices can't sum
  // past 0 dBFS and clip into harsh digital distortion (ratio 4 was too gentle to catch peaks)
  limiter.threshold.value = -5; limiter.knee.value = 3; limiter.ratio.value = 12;
  limiter.attack.value = 0.002; limiter.release.value = 0.14;
  limiter.connect(ctx.destination);
  master = ctx.createGain(); master.gain.value = 0.65; master.connect(tn.in);
  // the master insert rack, just before the limiter — built only here, not on the stem branch
  // above, for the same reason the limiter itself is stem-only: a stem is meant to sum back to
  // this exact mix, and a nonlinear insert (compressor, bitcrusher) baked into every stem could
  // not add back up to what the rack does on the full signal, so stems get the clean, pre-rack
  // signal and a producer applies their own master processing in the DAW, same as with the limiter.
  fxMaster = makeFxMultiRack(ctx, ...fxIdsFor("master"), fxT0, fxActiveFor("master"));
  autoGain.connect(fxMaster.input); fxMaster.output.connect(limiter);
  }
  // section-move filter: a build sweeps the whole pitched mix including its reverb tail, which is
  // what makes it sound like the room opening up
  const filt = ctx.createBiquadFilter();
  filt.type = "lowpass"; filt.frequency.value = FILTER_OPEN; filt.Q.value = 0.8;
  // …and its high-pass half, for the moves that thin the pitched mix from below (bass draining
  // through a build, a telephone section) rather than darkening it from above
  const mhp = ctx.createBiquadFilter();
  mhp.type = "highpass"; mhp.frequency.value = 20; mhp.Q.value = 0.7;
  filt.connect(mhp); mhp.connect(master);
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
  // the chords' make-up gain — its own node upstream of the duck, because duckAt resets the
  // duck node to exactly 1 and would silently eat a boost written onto it
  const chordBus = ctx.createGain(); chordBus.gain.value = CHORD_MAKEUP; chordBus.connect(cduck);
  // the bass track's own duck: straight into the move filter, not the reverb bus — low end in a
  // room is mud — and pumped harder than the chords when the kick lands
  const bduck = ctx.createGain(); bduck.gain.value = 1; bduck.connect(filt);
  // the pad's duck: gently pumped (half the global amount by default) and into the reverb bus,
  // because a pad is the one track that wants the room
  const padDuck = ctx.createGain(); padDuck.gain.value = 1; padDuck.connect(music);
  // tempo-synced delay, fed by whichever parts have a send. It returns into the move filter, so
  // a build sweeps the echoes along with everything else.
  const delay = makeDelay(ctx, filt, 60 / (bpmRef.current || 120), delayRef.current);
  const sampler = makeSampler(ctx);                // real-instrument samples (load when online)
  const mi = (meloRef.current || {}).melInstr, leadKey = isGM(mi) ? mi : null;
  if (realRef.current) { sampler.load(instrRef.current); if (leadKey) sampler.load(leadKey); }
  // a wet-only room the parts send to by amount, separate from the bus reverb everything already
  // sits in — a send has to be silent at zero, and the bus one passes its dry signal through
  const verb = makeVerbSend(ctx, wetDuck, 2.2);
  /* One effects chain per track — the melody parts' audio stage pointed at a whole track:
     level → drive → hi-pass → low-pass (the same node the track's drawn filter lane writes) →
     tremolo → pan, with echo and reverb sends and a duck of its own, plus the three tempo-synced
     LFOs (wobble, tremolo, auto-pan) running from t0 so stems line up with the mix. Every default
     is transparent: a song that never opens the panels is what it always was. */
  const t0v = ctx.currentTime;
  /* Each track's own insert rack, built here (not inside `mkChain`, which is shared by all four
     tracks and would otherwise build one rack per call and have no way to tell them apart) and
     handed in as `fx`. Slotted between the chain's own duck and `out` — after the filter/drive/
     pan/duck stage every track already has, so an insert here never disturbs the sidechain-duck,
     delay-send or reverb-send taps above it, all of which are taken off `tail`, before the duck. */
  const fxDrums = makeFxMultiRack(ctx, ...fxIdsFor("drums"), fxT0, fxActiveFor("drums"));
  const fxPerc = makeFxMultiRack(ctx, ...fxIdsFor("perc"), fxT0, fxActiveFor("perc"));
  const fxBass = makeFxMultiRack(ctx, ...fxIdsFor("bass"), fxT0, fxActiveFor("bass"));
  const fxPad = makeFxMultiRack(ctx, ...fxIdsFor("pad"), fxT0, fxActiveFor("pad"));
  // one shared rack for every melody part — connected once, here, to the reverb bus every part's
  // chain already fed straight into; each part's own duck fans into `fxLead.input` below, in
  // chainOf, so six parts get one rack and one set of knobs rather than six independent ones
  const fxLead = makeFxMultiRack(ctx, ...fxIdsFor("lead"), fxT0, fxActiveFor("lead"));
  fxLead.output.connect(music);
  const mkChain = (out, fx) => {
    const inG = ctx.createGain(); inG.gain.value = 1;
    const drive = ctx.createWaveShaper(); drive.oversample = "2x";
    const chp = ctx.createBiquadFilter(); chp.type = "highpass"; chp.frequency.value = 20; chp.Q.value = 0.7;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = FILTER_OPEN; lp.Q.value = 0.7;
    const trem = ctx.createGain(); trem.gain.value = 1;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const duck = ctx.createGain(); duck.gain.value = 1;
    inG.connect(drive); drive.connect(chp); chp.connect(lp); lp.connect(trem);
    const tail = pan ? (trem.connect(pan), pan) : trem;
    tail.connect(duck); duck.connect(fx.input); fx.output.connect(out);
    let send = null;
    if (delay) { send = ctx.createGain(); send.gain.value = 0; tail.connect(send); send.connect(delay.send); }
    const verbS = ctx.createGain(); verbS.gain.value = 0; tail.connect(verbS); verbS.connect(verb);
    const lfo = target => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = 1; g.gain.value = 0;
      o.connect(g); if (target) g.connect(target);
      o.start(t0v); o.stop(t0v + 3600);
      return { osc: o, depth: g };
    };
    return { in: inG, drive, hp: chp, lp, trem, pan, duck, send, verbS, fx,
      wob: lfo(lp.frequency), tremLfo: lfo(trem.gain), panLfo: pan ? lfo(pan.pan) : null, driveAmt: 0 };
  };
  const trDrums = mkChain(master, fxDrums);
  const trPerc = mkChain(master, fxPerc);
  const trBass = mkChain(bduck, fxBass);
  trBass.in.gain.value = BASS_MAKEUP;              // audible before the first beat's applyFx runs
  const trPad = mkChain(padDuck, fxPad);
  // which id is currently audible in each bus/slot — starts matching what was just built (the
  // song's own type), and is the thing the per-beat block below compares each tick's resolved
  // section type against, switching (`writeFxRack`) when they disagree
  const fxActiveId = { drums: fxActiveFor("drums"), perc: fxActiveFor("perc"), bass: fxActiveFor("bass"),
    pad: fxActiveFor("pad"), lead: fxActiveFor("lead"), master: fxActiveFor("master") };
  const m = { ctx, master, music, cduck, chordBus, bduck, padDuck, wetDuck, filt, mhp,
    trDrums, trPerc, trBass, trPad, fxLead, fxMaster, fxActiveId,
    bassLp: trBass.lp, percLp: trPerc.lp, padLp: trPad.lp, autoFilt, autoHp, autoGain, verb, tn, stem: stem || null,
    lastAutoBar: -1, lastMoveBar: -1, lastCueBar: -1,
    partGain: [], partGate: [], partDuck: [], partSend: [], partVerb: [],
    partDrive: [], partDriveAmt: [], partHp: [], partLp: [], partTrem: [], partPan: [],
    partWob: [], partTremLfo: [], partPanLfo: [],
    // the reference the LFOs start from: fixed at build, so their phase does not depend on which
    // bar a part first played in — the property a stem needs to line up with the mix
    t0: ctx.currentTime,
    delay, voicing: null, lastChordName: null, sampler, lastInstr: instrRef.current, lastLead: leadKey,
    leadLoaded: new Set(leadKey ? [leadKey] : []),
    step: from * (tickRef.current || patRef.current.length || 8), nextTime: ctx.currentTime + 0.1, noise: makeNoise(ctx) };
    return m;
  };
  /* A filter frequency Web Audio will accept. Setting one above Nyquist throws rather than politely
     clamping, and an offline render at a different sample rate is exactly where that bites. */
  const nyq = (m, hz) => Math.max(20, Math.min(hz, m.ctx.sampleRate / 2 - 100));
  const LFO_RUN = 3600;            // an hour: longer than any song, and every oscillator must stop
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
      /* Looping the groove: play the plain chord loop and resolve every track to the groove
         sketch, whatever structure is loaded — auditioning the full stack is the first half of
         the subtractive workflow, and it must not depend on which section happens to be biggest. */
      const gvLoop = !!(loop && loop.groove);
      let chord, pillIdx = -1, label = null, instNow = "L1", structBar = -1;
      /* The Session view has its own transport: the plain chord loop plays underneath it exactly
         as it does when looping the groove, whatever structure happens to be loaded — every track
         it drives is a session clip, not an arrangement instance, so there is no structBar to be. */
      if (struct && struct.length && !gvLoop && !sessionModeRef.current) {
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
        if (gvLoop) { instNow = "*"; label = `groove · bar ${bar + 1} of ${seq.length || 1} · 🔁 loop`; }
      }
      /* Session view: bar-quantized clip launching. At the top of every bar, whatever was queued
         for a track takes over from whatever it was playing — this is what makes a click land on
         the beat instead of firing the instant it happened. `startStep` is this promotion's own
         tick, so the clip's local bar position always starts at its own bar 0. */
      if (sessionModeRef.current && i === 0) {
        const queue = sessionQueueRef.current;
        const promoted = Object.keys(queue).length > 0;
        for (const trackId in queue) {
          sessionLiveRef.current[trackId] = { clipId: queue[trackId], startStep: m.step };
          delete queue[trackId];
        }
        if (live && promoted) {
          const delayMs = Math.max(0, (m.nextTime - m.ctx.currentTime) * 1000);
          setTimeout(() => {
            setSessionLive(Object.fromEntries(
              Object.entries(sessionLiveRef.current).map(([k, v]) => [k, v.clipId])));
            setSessionQueued({});
          }, delayMs);
        }
      }
      let sym = (patStep == null ? null : patRef.current[patStep]) || "-";
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
      const qb = struct && struct.length && structBar >= 0 ? struct[structBar] : null;
      const qv = qb && qb.inst != null ? secQuietRef.current[qb.inst] : undefined;
      const quiet = !!(qb && qb.base != null && (qv != null ? qv : secQuietRef.current[qb.base]));
      /* Where this tick sits for the per-section tracks: the current bar's instance and letter,
         or the loop sketch's L1 when no structure is chosen — the same name the melody uses.
         Each track resolves the way the drums do: the pass's own written grid first, then its
         (or its letter's) menu choice, then whatever the template wrote — a mute, or the
         song-level pattern. */
      const tInst = qb ? qb.inst : (gvLoop ? GROOVE : (struct && struct.length ? null : "L1"));
      const tBase = qb ? qb.base : (gvLoop ? GROOVE : (struct && struct.length ? null : "L1"));
      const tMb = qb ? qb.mb : Math.floor(m.step / L);
      /* A pass's own chord rhythm replaces the song's strum for its bars — the same symbols, so
         the voices, the click and the bass's "follow" mode all read it without knowing. A pass
         with nothing of its own follows the groove sketch's chord rhythm, cycling round. */
      let cOwn = tInst != null ? secChordBeatRef.current[tInst] : null, cLoop = false;
      if (!(cOwn && cOwn.length) && tInst !== GROOVE) {
        const g = secChordBeatRef.current[GROOVE];
        if (g && g.length) { cOwn = g; cLoop = true; }
      }
      if (cOwn && cOwn.length) {
        const cbar = cOwn[!cLoop && qb ? Math.min(tMb, cOwn.length - 1) : tMb % cOwn.length] || [];
        const cs2 = stepAt(cbar.length, i, L);
        sym = cs2 == null ? "-" : (cbar[cs2] || "-");
      }
      const srcOf = (beats, pats, mutes, glob, inst = tInst, base = tBase, ground = GROOVE) => {
        const own = inst != null ? beats[inst] : null;
        if (own && own.length) return { beat: own };
        const p = (inst != null && pats[inst]) || (base != null && pats[base]) || "";
        if (p) return p === "off" ? null : { pat: p };
        const mut = inst != null && mutes[inst] != null ? mutes[inst]
          : (base != null ? mutes[base] : undefined);
        if (mut) return null;
        // the groove sketch's written bars, before the song-level catalogue pattern — a loop, so
        // it cycles round a longer section rather than holding its last bar
        const g = inst !== ground ? beats[ground] : null;
        if (g && g.length) return { beat: g, loop: true };
        return glob ? { pat: glob } : null;
      };
      // a written or picked bar for this tick, sized to the section like the drums' own bars are
      const srcBar = src => src.beat
        ? (src.beat[!src.loop && qb ? Math.min(tMb, src.beat.length - 1) : tMb % src.beat.length] || null) : null;
      /* Extra tracks (drums/perc/bass/pad #1, #2, …) resolve exactly like track 0, just against a
         `#N`-suffixed instance/letter/groove key — see the note beside TRACKS_FX. Every loop below
         runs exactly once, over the plain unsuffixed keys, when a song has none — the ordinary
         case, which has to keep sounding byte-for-byte as it did before extra tracks existed. */
      const nLayersOf = type => Math.max(1, tInst != null
        && secTrackLayersRef.current[tInst] && secTrackLayersRef.current[tInst][type] || 1);
      // the same "add a 2nd/3rd track" a section gets, for a Session clip: how many drums/perc/
      // bass/pad sub-tracks this clip has of its own, capped the same way a section's are
      const sessionLayerCount = (type, key) => Math.max(1, Math.min(MAX_LAYERS,
        (secTrackLayersRef.current[key] && secTrackLayersRef.current[key][type]) || 1));
      const bassSrcs = chord ? Array.from({ length: nLayersOf("bass") }, (_, li) => {
        const suf = li ? LSEP + li : "";
        return srcOf(secBassBeatRef.current, secBassPatRef.current, secBassRef.current, li ? null : bassRef.current,
          tInst != null ? tInst + suf : tInst, tBase != null ? tBase + suf : tBase, GROOVE + suf);
      }) : [];
      const bassOn = bassSrcs.some(Boolean);
      if (sym !== "-") {
        if (clickRef.current && !m.stem) clickSound(m.ctx, t, sym, m.master);   // metronome click, off by default; never in a stem
      }
      if (sym !== "-" && !sessionModeRef.current) {
        if (chord && !quiet && (!m.stem || m.stem.kind === "chords")) {
          // while the bass track carries the root, the chords stop doubling it an octave down
          const played = realRef.current && playSampled(m.sampler, inst, m.ctx, t, chord, sym, eighth, m.chordBus, m.voicing, bassOn);
          if (!played) playHit(m.ctx, t, chord, sym, inst, eighth, m.chordBus, m.voicing, bassOn);
        }
      }
      /* Session view: each session track resolves against its own live clip's own bars, looped
         at the clip's own length from the tick it was launched — independent of every other
         track, which is the whole point of a launcher over the arrangement's one shared bar
         pointer. A track with nothing live is silent, exactly like an unlit clip slot. */
      const sessionBassOn = sessionModeRef.current
        && sessionTracks.some(tr => tr.type === "bass" && sessionLiveRef.current[tr.id]);
      if (sessionModeRef.current && chord) sessionTracks.forEach(tr => {
        const live = sessionLiveRef.current[tr.id]; if (!live) return;
        const key = sessionKey(tr.id, live.clipId);
        const localBar = n => Math.floor((m.step - live.startStep) / L) % Math.max(1, n);
        if (tr.type === "chords") {
          if (m.stem && m.stem.kind !== "chords") return;
          // an untouched clip plays the song's own strum rhythm — the same pattern its grid
          // shows as a preview until you tap a cell, so what you see is what you hear
          const bars = secChordBeatRef.current[key];
          const bar = (bars && bars.length) ? (bars[localBar(bars.length)] || []) : null;
          const tok = bar ? (bar[stepAt(bar.length, i, L)] || "-") : (sampleAt(patRef.current, i, L) || "-");
          if (tok !== "-" && !quiet) {
            const played = realRef.current && playSampled(m.sampler, inst, m.ctx, t, chord, tok, eighth, m.chordBus, m.voicing, sessionBassOn);
            if (!played) playHit(m.ctx, t, chord, tok, inst, eighth, m.chordBus, m.voicing, sessionBassOn);
          }
        }
      });
      /* The bass track. A written grid plays bar by bar exactly as the drums' own bars do; a
         "follow" pattern plays the root under the strum's hits — the note the chords used to
         carry, made separable; a catalogue pattern plays its own sixteenths. Every note is held
         until the next hit, so a lone hit is a whole-bar sub. It sounds through `quiet`: chords
         out with the bassline running is the disco filter-edit move the track exists for. */
      if (chord && !sessionModeRef.current) bassSrcs.forEach((bassSrc, li) => {
        if (!bassSrc || (m.stem && !(m.stem.kind === "bass" && (m.stem.i || 0) === li))) return;
        const bbar = srcBar(bassSrc);
        const bpat = bbar || (BASS[bassSrc.pat] || {}).pattern;
        if (!bbar && bassSrc.pat && !(BASS[bassSrc.pat] || {}).pattern) {
          if (sym !== "-" && sym !== "U")   // an upstroke never reaches the low string
            playBass(m.ctx, t, chord.root, 0, eighth * 1.8, bassVoiceRef.current, m.trBass.in, humVel(accentAt(i, ticksPerBeat)));
        } else if (bpat && bpat.length) {
          const bs = stepAt(bpat.length, i, L);
          const tok = bs == null ? "" : bpat[bs];
          if (tok && tok !== "-") {
            let gap = 1;                     // steps until the next hit — the room this note has
            while (gap < bpat.length && (!bpat[(bs + gap) % bpat.length] || bpat[(bs + gap) % bpat.length] === "-")) gap++;
            const stepDur = tick * (L / bpat.length);
            playBass(m.ctx, t, chord.root, BASS_IV[tok] || 0, Math.max(0.09, gap * stepDur * 0.92),
              bassVoiceRef.current, m.trBass.in, humVel(accentAt(i, ticksPerBeat)));
          }
        }
      });
      if (sessionModeRef.current && chord) sessionTracks.forEach(tr => {
        if (tr.type !== "bass") return;
        const live = sessionLiveRef.current[tr.id]; if (!live) return;
        if (m.stem && m.stem.kind !== "bass") return;
        const key = sessionKey(tr.id, live.clipId);
        const localBar = bars => Math.floor((m.step - live.startStep) / L) % bars.length;
        // a clip can hold extra bass sub-tracks of its own (the same "add a 2nd bassline" a
        // section gets); only the first falls back to the song's own pattern when untouched —
        // an extra sub-track has no song-level default to speak for it
        for (let li = 0; li < sessionLayerCount("bass", key); li++) {
          const k2 = key + (li ? LSEP + li : "");
          const bars = secBassBeatRef.current[k2];
          const pick = secBassPatRef.current[k2];
          const bpat = (bars && bars.length) ? (bars[localBar(bars)] || [])
            : pick ? (pick === "off" ? [] : ((BASS[pick] || {}).pattern || []))
            : li === 0 ? ((BASS[bassRef.current] || {}).pattern || []) : [];
          if (!bpat.length) continue;
          const bs = stepAt(bpat.length, i, L);
          const tok = bs == null ? "" : bpat[bs];
          if (!tok || tok === "-") continue;
          let gap = 1;
          while (gap < bpat.length && (!bpat[(bs + gap) % bpat.length] || bpat[(bs + gap) % bpat.length] === "-")) gap++;
          const stepDur = tick * (L / bpat.length);
          playBass(m.ctx, t, chord.root, BASS_IV[tok] || 0, Math.max(0.09, gap * stepDur * 0.92),
            bassVoiceRef.current, m.trBass.in, humVel(accentAt(i, ticksPerBeat)));
        }
      });
      /* The pad track: the chord's upper voicing held a bar at a time, legato, into its own
         filter and the reverb bus. Upper voicing only — the low root belongs to the bass or the
         chords, and a pad that doubles it is the mud the register fences exist to stop. */
      const resolvePad = (inst, base, ground) => {
        const v = (inst != null && secPadVoiceRef.current[inst]) || (base != null && secPadVoiceRef.current[base]) || "";
        let off, voice;
        if (v) { off = v === "off"; voice = v === "off" ? "" : v; }
        else {
          const mut = inst != null && secPadRef.current[inst] != null ? secPadRef.current[inst]
            : (base != null ? secPadRef.current[base] : undefined);
          if (mut) { off = true; voice = ""; } else { off = false; voice = padRef.current; }
        }
        let own = inst != null ? secPadBeatRef.current[inst] : null, loop = false;
        if (!(own && own.length) && inst !== ground && !off) {
          const g = secPadBeatRef.current[ground];
          if (g && g.length) { own = g; loop = true; }
        }
        return { voice, own, loop };
      };
      if (chord && sessionModeRef.current) sessionTracks.forEach(tr => {
        if (tr.type !== "pad") return;
        const live = sessionLiveRef.current[tr.id]; if (!live) return;
        if (m.stem && m.stem.kind !== "pad") return;
        const key = sessionKey(tr.id, live.clipId);
        // extra pad sub-tracks of a clip's own; only the first falls back to the song's own held
        // chord when untouched
        for (let li = 0; li < sessionLayerCount("pad", key); li++) {
          const k2 = key + (li ? LSEP + li : "");
          const bars = secPadBeatRef.current[k2];
          // the clip's own voice pick beats the song's pad; "off" silences an unwritten
          // sub-track but never a written rhythm — the rule a section already follows
          const pick = secPadVoiceRef.current[k2];
          const voice = pick && pick !== "off" ? pick : padRef.current;
          if (bars && bars.length) {
            const localBar = Math.floor((m.step - live.startStep) / L) % bars.length;
            const pbar = bars[localBar] || [];
            const ps2 = stepAt(pbar.length, i, L);
            const tok = ps2 == null ? "" : pbar[ps2];
            if (!tok) continue;
            let gap = 1;
            while (gap < pbar.length && !pbar[(ps2 + gap) % pbar.length]) gap++;
            const stepDur = tick * (L / pbar.length);
            const dur = tok === "S" ? Math.min(stepDur * 1.8, beat * 0.45) : Math.max(0.15, gap * stepDur * 0.95);
            for (const mid of (m.voicing || voiceChord(chord)))
              leadNote(m.ctx, t, mid, dur, voice || "strings", tok !== "S", m.trPad.in, { lvl: 0.8 });
          } else if ((pick ? pick !== "off" : li === 0 && padRef.current) && voice && i === 0) {
            // an untouched clip plays a held chord on the downbeat, the way an untouched
            // section does — in its own picked voice, or (first sub-track) the song's
            const barDur = barBeatsRef.current * beat;
            for (const mid of (m.voicing || voiceChord(chord)))
              leadNote(m.ctx, t, mid, barDur * 0.98, voice, true, m.trPad.in, { lvl: 0.8 });
          }
        }
      });
      if (chord && !sessionModeRef.current) for (let li = 0; li < nLayersOf("pad"); li++) {
        if (m.stem && !(m.stem.kind === "pad" && (m.stem.i || 0) === li)) continue;
        const suf = li ? LSEP + li : "";
        const { voice: padV, own: padOwn, loop: padLoop } = resolvePad(
          tInst != null ? tInst + suf : tInst, tBase != null ? tBase + suf : tBase, GROOVE + suf);
        if (padOwn && padOwn.length) {
          // the pass's own pad rhythm: H holds to the next hit, S stabs — voice from the section,
          // the song default, or strings, so a written rhythm always sounds
          const pv = padV || padRef.current || "strings";
          const pbar = padOwn[!padLoop && qb ? Math.min(tMb, padOwn.length - 1) : tMb % padOwn.length] || [];
          const ps2 = stepAt(pbar.length, i, L);
          const tok = ps2 == null ? "" : pbar[ps2];
          if (tok) {
            let gap = 1;
            while (gap < pbar.length && !pbar[(ps2 + gap) % pbar.length]) gap++;
            const stepDur = tick * (L / pbar.length);
            const dur = tok === "S" ? Math.min(stepDur * 1.8, beat * 0.45) : Math.max(0.15, gap * stepDur * 0.95);
            for (const mid of (m.voicing || voiceChord(chord)))
              leadNote(m.ctx, t, mid, dur, pv, tok !== "S", m.trPad.in, { lvl: 0.8 });
          }
        } else if (padV && i === 0) {
          const barDur = barBeatsRef.current * beat;
          for (const mid of (m.voicing || voiceChord(chord)))
            leadNote(m.ctx, t, mid, barDur * 0.98, padV, true, m.trPad.in, { lvl: 0.8 });
        }
      }
      /* The percussion layer: a second pattern from the drum table riding over the main groove on
         the same kit, slightly under it in level, through its own drawn filter. It never triggers
         the pump — that belongs to the song's kick. */
      if (!sessionModeRef.current) for (let li = 0; li < nLayersOf("perc"); li++) {
        if (m.stem && !(m.stem.kind === "perc" && (m.stem.i || 0) === li)) continue;
        const suf = li ? LSEP + li : "";
        const percSrc = srcOf(secPercBeatRef.current, secPercPatRef.current, secPercRef.current, li ? null : percRef.current,
          tInst != null ? tInst + suf : tInst, tBase != null ? tBase + suf : tBase, GROOVE + suf);
        if (!percSrc) continue;
        // a legacy id from the drum table (saved before the layer had instruments of its own)
        // still plays on the kit, exactly as saved; everything else is hand percussion
        const legacy = !percSrc.beat && percSrc.pat && !PERCS[percSrc.pat] && DRUMS[percSrc.pat];
        const ppat = srcBar(percSrc) || ((PERCS[percSrc.pat] || DRUMS[percSrc.pat] || {}).pattern);
        const pstep = sampleAt(ppat, i, L);
        if (pstep)
          for (const ch of pstep) {
            if (legacy) drumSound(m.ctx, t, ch, m.noise, m.trPerc.in, kitRef.current, humVel(accentAt(i, ticksPerBeat)) * 0.8);
            else percSound(m.ctx, t, ch, m.noise, m.trPerc.in, humVel(accentAt(i, ticksPerBeat)), percKitRef.current);
          }
      }
      if (sessionModeRef.current) sessionTracks.forEach(tr => {
        if (tr.type !== "perc") return;
        const live = sessionLiveRef.current[tr.id]; if (!live) return;
        if (m.stem && m.stem.kind !== "perc") return;
        const key = sessionKey(tr.id, live.clipId);
        // extra perc sub-tracks of a clip's own; only the first falls back to the song's own perc
        // pattern — the same one its grid shows as a preview until you tap a cell
        for (let li = 0; li < sessionLayerCount("perc", key); li++) {
          const k2 = key + (li ? LSEP + li : "");
          const bars = secPercBeatRef.current[k2];
          const pick = secPercPatRef.current[k2];
          const ppat = (bars && bars.length)
            ? bars[Math.floor((m.step - live.startStep) / L) % bars.length]
            : pick ? (pick === "off" ? null : ((PERCS[pick] || DRUMS[pick] || {}).pattern))
            : li === 0 ? ((PERCS[percRef.current] || DRUMS[percRef.current] || {}).pattern) : null;
          const pstep = sampleAt(ppat, i, L);
          if (pstep) for (const ch of pstep)
            percSound(m.ctx, t, ch, m.noise, m.trPerc.in, humVel(accentAt(i, ticksPerBeat)), percKitRef.current);
        }
      });
      let b = null;                                     // this bar's struct entry, kept for the drum fill below
      const inStruct = struct && struct.length && structBar >= 0 && !gvLoop;
      if (inStruct) b = struct[structBar];
      const resolveDrumPat = (inst, base, ground, glob) => {
        let pat = glob;
        if (inStruct) {   // a section can override with its own kit
          const sd = b ? ((inst != null && secDrumRef.current[inst])
            || (base != null ? secDrumRef.current[base] : "")) : "";
          if (sd) pat = DRUMS[sd] ? DRUMS[sd].pattern : null;   // "off" → null → silent for this section
          /* …and a section that has been written on its own grid plays that instead, bar by bar, so a
             fill can land in the last bar of a verse. A section stretched since it was written repeats
             its last written bar rather than falling silent — the same rule melodies follow. */
          const own = b && inst != null ? secBeatRef.current[inst] : null;
          if (own && own.length) pat = own[Math.min(b.mb, own.length - 1)];
          /* …and a section that said nothing at all follows the groove sketch's written drums,
             cycling round its bars — a loop, not a stretched section, so it never holds its last bar. */
          else if (!sd) {
            const g = secBeatRef.current[ground];
            if (g && g.length) pat = g[b.mb % g.length];
          }
        } else {
          // the plain loop (or the groove looping): the sketch section's own written bars, else the
          // groove's — the same resolution every other track already makes here
          const own = inst != null ? secBeatRef.current[inst] : null;
          const g = (own && own.length) ? own : secBeatRef.current[ground];
          if (g && g.length) pat = g[Math.floor(m.step / L) % g.length];
        }
        return pat;
      };
      let dpat = resolveDrumPat(tInst, tBase, GROOVE, drumRef.current);   // global drum pattern by default
      /* Automation lanes: on each bar's downbeat, ramp to the value the curve holds a bar later.
         Per bar rather than per tick because that is already smooth to the ear and keeps the event
         count down; guarded by the bar index so the lookahead cannot schedule one bar twice. */
      // With no structure there is no structBar — it stays -1 for every bar, so guarding on it
      // would let automation fire once and never again on a plain loop. Count bars instead.
      const autoBar = structBar >= 0 ? structBar : Math.floor(m.step / L);
      // the lanes describe the song's timeline, and looping the groove is outside it
      if (!gvLoop && i === 0 && autoBar !== m.lastAutoBar) {
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
        // the hi-pass lane is the filter lane mirrored: its rest is the *bottom* (20 Hz, off), and
        // the top stops at 8 kHz — past that nothing is left but air
        const hNow = autoAt(A.hp, bar), hNext = autoAt(A.hp, bar + 1);
        if (hNow != null) {
          const hz = v => nyq(m, 20 * Math.pow(8000 / 20, v));
          m.autoHp.frequency.setValueAtTime(hz(hNow), t);
          m.autoHp.frequency.exponentialRampToValueAtTime(hz(hNext == null ? hNow : hNext), t + barDur);
        }
        /* Resonance rides both lane filters at once — one lane, two AudioParams, each written only
           here, so this is not the two-envelope collision the separate nodes exist to avoid. The
           top stays a squelch rather than the parts' full self-oscillating 14: this filter carries
           the whole mix, and a scream here has no other fader to hide behind. */
        const qNow = autoAt(A.res, bar), qNext = autoAt(A.res, bar + 1);
        if (qNow != null) {
          const q = v => 0.6 + v * 9;
          for (const p of [m.autoFilt.Q, m.autoHp.Q]) {
            p.setValueAtTime(q(qNow), t);
            p.linearRampToValueAtTime(q(qNext == null ? qNow : qNext), t + barDur);
          }
        }
        const gNow = autoAt(A.level, bar), gNext = autoAt(A.level, bar + 1);
        if (gNow != null) {
          m.autoGain.gain.setValueAtTime(gNow, t);
          m.autoGain.gain.linearRampToValueAtTime(gNext == null ? gNow : gNext, t + barDur);
        }
      }
      /* The track effect panels, applied once a beat from the live state — a knob moved while
         the song plays is heard on the next beat. The track's drawn filter lane, where one is
         drawn, takes the low-pass over from the panel's knob, exactly as a part's lane does. */
      if (i % ticksPerBeat === 0) {
        const A3 = autoRef.current || {};
        const fxBar = (structBar >= 0 ? structBar : Math.floor(m.step / L)) + i / L;
        const applyFx = (tr, fx, laneId, makeup = 1) => {
          const val = k => {
            const v = fx ? fx[k] : undefined;
            if (v != null) return v;
            const md = MOD_BY_KEY[k];
            return md ? md.dflt : (k === "lvl" ? 100 : 0);
          };
          tr.in.gain.setValueAtTime((val("lvl") / 100) * makeup, t);
          const dvv = val("drive") / 100;
          if (dvv !== tr.driveAmt) { tr.driveAmt = dvv; tr.drive.curve = dvv > 0 ? driveCurve(dvv) : null; }
          tr.hp.frequency.setValueAtTime(nyq(m, 20 * Math.pow(1200 / 20, val("hp") / 100)), t);
          // the drawn lanes live on the song's timeline; looping the groove plays outside it
          const lane = laneId && !gvLoop ? autoAt(A3[laneId], fxBar) : null;
          const cutPos = lane != null ? lane * 100 : val("cut");
          const cutHz = nyq(m, 120 * Math.pow(FILTER_OPEN / 120, cutPos / 100));
          const w = val("wob") / 100;
          tr.lp.Q.value = 0.7 + (val("res") / 100) * 14;
          tr.lp.frequency.setValueAtTime(Math.max(30, cutHz * (1 - 0.45 * w)), t);
          tr.wob.depth.gain.setValueAtTime(cutHz * 0.45 * w, t);
          tr.wob.osc.frequency.setValueAtTime(1 / (beat * val("wobRate")), t);
          const td = (val("trem") / 100) * 0.5;
          tr.trem.gain.setValueAtTime(1 - td, t);
          tr.tremLfo.depth.gain.setValueAtTime(td, t);
          tr.tremLfo.osc.frequency.setValueAtTime(1 / (beat * val("tremRate")), t);
          if (tr.pan) {
            const ap = val("apan") / 100;
            const base = Math.max(-1 + ap, Math.min(1 - ap, val("pan") / 100));
            tr.pan.pan.setValueAtTime(base, t);
            tr.panLfo.depth.gain.setValueAtTime(ap, t);
            tr.panLfo.osc.frequency.setValueAtTime(1 / (beat * val("apanRate")), t);
          }
          if (tr.send) tr.send.gain.setValueAtTime(val("send") || 0, t);   // stored 0..1 like a part's
          tr.verbS.gain.setValueAtTime(val("verb") / 100, t);
        };
        const F3 = trackFxRef.current || {};
        applyFx(m.trDrums, F3.drums, null);
        applyFx(m.trPerc, F3.perc, "cutperc");
        applyFx(m.trBass, F3.bass, "cutbass", BASS_MAKEUP);
        applyFx(m.trPad, F3.pad, "cutpad");
        /* The insert rack's own knobs, same cadence as the track panel above — plus, now, the
           active *type* itself. Each bus's rack was built (back in buildGraph) with one node chain
           per type id the song could need for that bus/slot, every chain silent except the one
           `m.fxActiveId` already names. Resolving which type the currently-sounding section wants
           — the same instance-then-letter-then-song fallback secDrum/secPadVoice already resolve
           `tInst`/`tBase` against above — and finding it differs from what is actually audible
           switches the rack onto it (`setActive`, a short click-free crossfade — see
           `makeFxMultiSlot` in audio.js); only ids the rack was actually built with can be switched
           to, so a type nothing in the song asked for before this Play/render started stays
           unreachable until a restart, the same limitation a delay time or a bass voice already has.
           Params are then written into whichever id is now active every tick, switch or not, so a
           moved slider is heard immediately whichever type is playing. Master has no per-section
           entry — it colours the whole song by design — so it always reads the song's own rack. */
        const writeFxRack = (rack, active, slots) => {
          if (!rack || !active) return;
          const S = slots || [];
          rack.slots.forEach((slot, si) => {
            const want = (S[si] && S[si].type) || "off";
            if (want !== active[si] && slot.ids.includes(want)) { slot.setActive(want, t); active[si] = want; }
            slot.write(active[si], t, S[si] || {});
          });
        };
        const FXR = fxRackRef.current || {}, SFX = secFxRef.current || {};
        const secFxOf = bus => (tInst != null && SFX[tInst] && SFX[tInst][bus])
          || (tBase != null && SFX[tBase] && SFX[tBase][bus]) || null;
        writeFxRack(m.trDrums.fx, m.fxActiveId.drums, secFxOf("drums") || FXR.drums);
        writeFxRack(m.trPerc.fx, m.fxActiveId.perc, secFxOf("perc") || FXR.perc);
        writeFxRack(m.trBass.fx, m.fxActiveId.bass, secFxOf("bass") || FXR.bass);
        writeFxRack(m.trPad.fx, m.fxActiveId.pad, secFxOf("pad") || FXR.pad);
        writeFxRack(m.fxLead, m.fxActiveId.lead, secFxOf("lead") || FXR.lead);
        writeFxRack(m.fxMaster, m.fxActiveId.master, FXR.master);
      }
      // section moves: fire once, on the downbeat of each section instance, scheduling the whole
      // sweep across that instance's length. Guarded by the bar index so a re-entered bar (or the
      // lookahead running twice over one tick) can't restack the automation.
      if (i === 0 && struct && structBar >= 0 && structBar !== m.lastMoveBar) {
        const b = struct[structBar];
        if (b && b.mb === 0) {
          m.lastMoveBar = structBar;
          /* The move that starts here, if one does — resolved instance-then-letter when the run
             was worked out, so a song saved before moves were per-instance still sounds as saved.
             A pass in the middle of a run has no entry: its sweep is already running, and firing
             again would restart the climb from the bottom four bars into it. */
          const sp = b.inst != null ? moveRef.current.span[b.inst] : null;
          if (sp) {
            const spec = (MOVES[sp.id] || {}).spec || null;
            // the riser and the impact are added sources, not processing, so they go to the fx bus:
            // on the master they landed in every stem and four stems summed to four risers
            applyMove(m.ctx, m.filt, m.mhp, spec, t, sp.bars * (patLen / (subRef.current || 2)) * beat, m.noise, m.tn.fx);
          }
        }
      }
      /* Transitions: armed at the bar the cue table says, not at the boundary they belong to —
         most of a transition sounds before the section it leads into has started. `at` is the
         boundary's bar, and bars are all the same length here, so its time is a multiplication
         rather than something the scheduler has to remember across ticks.
         Looping one section skips any cue whose lead-in falls outside the window: the bars it
         would have sounded over are not being played. Entries, which start on the downbeat, run
         either way. */
      if (i === 0 && struct && structBar >= 0 && structBar !== m.lastCueBar) {
        m.lastCueBar = structBar;
        const barDur2 = barBeatsRef.current * beat;
        for (const c of (moveRef.current.cues || {})[structBar] || []) {
          applyTrans(m.tn, TRANS[c.id], t + (c.at - structBar) * barDur2,
            { ctx: m.ctx, beat, noise: m.noise, kit: kitRef.current,
              maxPre: c.maxPre, maxPost: c.maxPost });
        }
      }
      let dstep = sessionModeRef.current ? null : sampleAt(dpat, i, L);   // the drum pattern resampled onto the bar's ticks
      // a drum move adds extra hits on one channel, on top of whatever this section already plays —
      // see DRUM_MOVES in melody.js. Only live inside an arrangement, same as a section move itself.
      if (b) {
        const dmId = (b.inst != null && moveRef.current.moves[b.inst])
          || (b.base != null && moveRef.current.moves[b.base]) || "";
        const dm = DRUM_MOVES[dmId];
        if (dm) {
          const dmNbars = (moveRef.current.instBars && b.inst != null && moveRef.current.instBars[b.inst]) || 1;
          if (fillHitAt(dm.from, dm.to, b.mb, dmNbars, i, L))
            dstep = dstep ? (dstep.includes(dm.ch) ? dstep : dstep + dm.ch) : dm.ch;
        }
      }
      const accent = accentAt(i, ticksPerBeat);    // lean on the pulse rather than hitting flat
      let kickNow = !!dstep && /[KB]/.test(dstep);
      if (dstep) {
        if (!m.stem || (m.stem.kind === "drums" && (m.stem.i || 0) === 0))
          for (const ch of dstep) drumSound(m.ctx, t, ch, m.noise, m.trDrums.in, kitRef.current, humVel(accent));
        // Extra drums tracks (#1, #2, …): a second (third, …) pattern riding the same kit, exactly
        // like the perc layer already does over the main groove — see the note beside TRACKS_FX.
        // They never trigger the pump either: that stays tied to track 0's own kick, the way the
        // song's one pump control has always meant "the main groove's kick".
        for (let li = 1; li < nLayersOf("drums"); li++) {
          if (m.stem && !(m.stem.kind === "drums" && (m.stem.i || 0) === li)) continue;
          const suf = LSEP + li;
          const dpatL = resolveDrumPat(tInst != null ? tInst + suf : tInst, tBase != null ? tBase + suf : tBase, GROOVE + suf, null);
          const dstepL = sampleAt(dpatL, i, L);
          if (dstepL) for (const ch of dstepL) drumSound(m.ctx, t, ch, m.noise, m.trDrums.in, kitRef.current, humVel(accent));
        }
      }
      /* Session view: each live drums track is independent — its own written grid, its own local
         bar position from the tick it was launched, no shared dpat. Any of them landing a kick
         still pumps the pitched tracks, the same "kick opens a hole for everything else" rule. */
      if (sessionModeRef.current) sessionTracks.forEach(tr => {
        if (tr.type !== "drums") return;
        const live = sessionLiveRef.current[tr.id]; if (!live) return;
        if (m.stem && m.stem.kind !== "drums") return;
        const key = sessionKey(tr.id, live.clipId);
        // extra drums sub-tracks of a clip's own (the same "add a 2nd/3rd kit" a section gets);
        // only the first falls back to the song's own pattern when untouched — an extra
        // sub-track has no song-level default to speak for it, same as a section's own extras
        for (let li = 0; li < sessionLayerCount("drums", key); li++) {
          const k2 = key + (li ? LSEP + li : "");
          const bars = secBeatRef.current[k2];
          // grid first, then the clip's own "starts from" pick, then (first sub-track only) the
          // song's pattern — the same order a section resolves in
          const pick = secDrumRef.current[k2];
          const dpatS = (bars && bars.length)
            ? bars[Math.floor((m.step - live.startStep) / L) % bars.length]
            : pick ? (DRUMS[pick] ? DRUMS[pick].pattern : null)
            : li === 0 ? drumRef.current : null;
          const dstepS = sampleAt(dpatS, i, L);
          if (!dstepS) continue;
          if (/[KB]/.test(dstepS)) kickNow = true;
          for (const ch of dstepS) drumSound(m.ctx, t, ch, m.noise, m.trDrums.in, kitRef.current, humVel(accent));
        }
      });
      // Pump the pitched sources under every kick. Recovery stops just short of the next beat, so
      // four-on-the-floor breathes fully back in right as the next kick hits. The pump belongs to
      // the pitched sources, so it stays in every pitched stem even though the kick that triggers
      // it does not — that is what makes the stems sum back to the mix. Melody parts duck on
      // their own nodes further down, each by its own amount.
      if (pumpRef.current && kickNow) {
        duckAt(m.cduck, t, pumpRef.current, beat * 0.8);
        duckAt(m.wetDuck, t, pumpRef.current, beat * 0.8);
        /* Per-track pump. The panel's Pump knob overrides the genre defaults — the bass ducks
           hardest (the kick and the bassline share a register), the pad barely moves, and the
           perc doesn't duck at all unless its knob says so. */
        const F2 = trackFxRef.current || {};
        const dk = k => (F2[k] && F2[k].duck != null) ? F2[k].duck : null;
        duckAt(m.bduck, t, dk("bass") != null ? dk("bass") : Math.min(1, pumpRef.current * 1.3), beat * 0.8);
        duckAt(m.padDuck, t, dk("pad") != null ? dk("pad") : pumpRef.current * 0.5, beat * 0.8);
        if (dk("perc")) duckAt(m.trPerc.duck, t, dk("perc"), beat * 0.8);
      }
      const mel = meloRef.current;
      // Every arrangement part shares chain slots 0..MAX_LAYERS-1; a Session melody track's clip
      // gets one starting well clear of that range, so the two schemes can never collide.
      const SESSION_LI_BASE = 1000;
      if (mel) {
        /* Normally one job: the section (or groove, or "L1" with no structure) the arrangement's
           one shared bar pointer has landed on. In the Session view it is instead one job per
           live melody track — its own sym/mb from its own clip and start tick, its own chain-slot
           offset — so several independent instruments can play on the same tick through exactly
           the note engine below, none of them fighting over a chain, a hash seed or a gate node. */
        const melJobs = [];
        if (sessionModeRef.current) {
          sessionTracks.forEach((tr, idx) => {
            if (tr.type !== "melody") return;
            const live = sessionLiveRef.current[tr.id]; if (!live) return;
            const key = sessionKey(tr.id, live.clipId);
            const secX = mel.bySym[key]; if (!secX) return;
            const nb = (secX.layers[0] && secX.layers[0].bars.length) || 1;
            const mbX = Math.floor((m.step - live.startStep) / L) % nb;
            // a clip can hold up to MAX_LAYERS parts of its own (the same "add another instrument"
            // a section has), so each track reserves a full MAX_LAYERS-wide slice of chain slots —
            // one track's li 1 must never land on the next track's own li 0
            melJobs.push({ sym: key, mb: mbX, moveId: "", liBase: SESSION_LI_BASE + idx * MAX_LAYERS });
          });
        } else {
          let sym = null, mb = 0, moveId = "";
          if (gvLoop && mel.bySym[GROOVE]) {
            sym = GROOVE;
            const nb = (mel.bySym[GROOVE].layers[0].bars.length) || 1;
            mb = Math.floor(m.step / L) % nb;
          } else if (struct && struct.length) {
            const e = struct[structBar];   // same bar the chord engine chose (honours the loop window)
            sym = e.inst; mb = e.mb;
            // a part move is structure-based, exactly like a section move: no arrangement, no move
            moveId = (e.inst != null && moveRef.current.moves[e.inst])
              || (e.base != null && moveRef.current.moves[e.base]) || "";
          } else if (mel.bySym.L1) {
            sym = "L1";
            const nb = (mel.bySym.L1.layers[0].bars.length) || 1;
            mb = Math.floor(m.step / L) % nb;
          }
          if (sym) melJobs.push({ sym, mb, moveId, liBase: 0 });
        }
        melJobs.forEach(({ sym, mb, moveId, liBase }) => {
        const sec = sym && mel.bySym[sym];
        // the section instance's own written bar count, from the arrangement rather than the
        // melody's own grid, so a part move's ramp matches the drum fill's exactly
        const mvNbars = (moveRef.current.instBars && moveRef.current.instBars[sym])
          || (sec && sec.layers[0] && sec.layers[0].bars.length) || 1;
        // an arpeggiated part has no written notes of its own, so "does this section sound?"
        // has to count arps as well as grids
        if (sec && sec.layers.some(ly => ly.flat.length || ly.arp)) {
          const base = (mel.tonic > 6 ? 60 : 72) + mel.tonic;
          /* One part's signal chain, built on first use and reused after:

               gain ─ drive ─ high-pass ─ low-pass ─ tremolo ─ pan ─ gate ─┬─ duck ─→ FX rack ─→ pitched bus
               (level·mute·solo)          ▲            ▲        ▲          ├─ echo send → delay      (shared)
                                          │            │        │          └─ reverb send → room
                                        wobble      tremolo   auto-pan
                                                 (three tempo-synced LFOs)

             The order is the one a hardware synth uses and it matters: distortion before the
             filter (so the filter tames the harmonics the drive just made, rather than the drive
             re-brightening a filtered signal), the gate last of the level stages so it chops
             everything above it at once, and both sends taken after the gate — a gated part throws
             gated repeats rather than a smooth pad's worth of echo the dry signal never had. The FX
             rack sits after the duck too, for the same reason: it should hear the part gated and
             pumped, not the dry signal the duck is about to chop.

             Every node is built whether or not the part uses it. Building lazily would mean an
             LFO's phase depended on which bar a control was first turned up in, and a stem bounce
             would no longer line up with the mix it came from. (The FX rack itself is the one
             exception worth naming: it is shared by all six parts and is built once, eagerly, in
             buildGraph — see the comment there — not inside this per-part chain.) */
          const chainOf = li => {
            let dest = m.partGain[li];
            if (!dest) {
              const C = m.ctx;
              dest = m.partGain[li] = C.createGain();
              dest.gain.value = MELODY_MAKEUP;     // the melody parts' share of the make-up gain
              const drive = m.partDrive[li] = C.createWaveShaper();
              const hp = m.partHp[li] = C.createBiquadFilter();
              hp.type = "highpass"; hp.frequency.value = 20; hp.Q.value = 0.7;
              const lp = m.partLp[li] = C.createBiquadFilter();
              lp.type = "lowpass"; lp.frequency.value = nyq(m, FILTER_OPEN); lp.Q.value = 0.7;
              const trem = m.partTrem[li] = C.createGain(); trem.gain.value = 1;
              // Safari on older iOS has no StereoPannerNode; a part simply stays centred there
              const pan = m.partPan[li] = C.createStereoPanner ? C.createStereoPanner() : null;
              const gate = m.partGate[li] = C.createGain(); gate.gain.value = 1;
              const pduck = m.partDuck[li] = C.createGain(); pduck.gain.value = 1;
              dest.connect(drive); drive.connect(hp); hp.connect(lp); lp.connect(trem);
              if (pan) { trem.connect(pan); pan.connect(gate); } else trem.connect(gate);
              // the insert rack sits after the duck, shared by every part (see its build above) —
              // the delay/reverb sends below are taken off `gate`, before the duck, so they and the
              // sidechain are untouched by whatever this rack does
              gate.connect(pduck); pduck.connect(m.fxLead.input);
              if (m.delay) {                       // a parallel send, so the dry part is untouched
                const sd = m.partSend[li] = C.createGain();
                sd.gain.value = 0; gate.connect(sd); sd.connect(m.delay.send);
              }
              if (m.verb) {
                const vs = m.partVerb[li] = C.createGain();
                vs.gain.value = 0; gate.connect(vs); vs.connect(m.verb);
              }
              /* The three LFOs. Each runs for the whole song at a depth of zero until something
                 turns it up, so the movement is always in the same place in the bar however long
                 the part has been playing — and identical in a render and in the stem of it. */
              const lfo = (target, scale) => {
                const o = C.createOscillator(), g = C.createGain();
                o.type = "sine"; o.frequency.value = 1; g.gain.value = 0;
                o.connect(g); if (target) g.connect(target);
                o.start(m.t0); o.stop(m.t0 + LFO_RUN);
                return { osc: o, depth: g, scale };
              };
              m.partWob[li] = lfo(lp.frequency);
              m.partTremLfo[li] = lfo(trem.gain);
              m.partPanLfo[li] = pan ? lfo(pan.pan) : null;
            }
            return { gain: dest, gate: m.partGate[li], duck: m.partDuck[li] };
          };
          /* A part's drawn filter lane, read at this tick's position in the song. It is the
             Low-pass knob written across the bars, so wherever it exists it takes over from the
             knob; null (no lane, or a lane for another song) hands the knob back. */
          // drawn on the song's timeline, so looping the groove leaves the knob in charge
          const laneCutOf = li => gvLoop ? null : autoAt((autoRef.current || {})[autoPartId(li)], autoBar + i / L);
          /* Push every one of a part's modulations onto its chain for this tick. Read from the
             live layer each tick rather than set once at build, so moving a control while the song
             is playing is heard on the next tick rather than at the next play. */
          const applyMods = (li, ly, t) => {
            const C = m.ctx, beatSec = 60 / bpmRef.current;
            const val = k => modOf(ly, k);
            const lp = m.partLp[li], hp = m.partHp[li];
            const laneCut = laneCutOf(li);
            const cutPos = laneCut != null ? laneCut * 100 : val("cut");
            // Low-pass: a musical curve, not a linear one — 100% is open, and the bottom of the
            // range is still a note rather than a rumble.
            const cutHz = nyq(m, 120 * Math.pow(FILTER_OPEN / 120, cutPos / 100));
            const w = val("wob") / 100;
            // The wobble is a swing around the cutoff rather than on top of it, so turning it up
            // does not also make the part brighter than it was set to be.
            lp.Q.value = 0.7 + (val("res") / 100) * 14;
            if (!val("fenv")) lp.frequency.setValueAtTime(Math.max(30, cutHz * (1 - 0.45 * w)), t);
            m.partWob[li].depth.gain.setValueAtTime(cutHz * 0.45 * w, t);
            m.partWob[li].osc.frequency.setValueAtTime(1 / (beatSec * val("wobRate")), t);
            hp.frequency.setValueAtTime(nyq(m, 20 * Math.pow(1200 / 20, val("hp") / 100)), t);
            // Drive: null curve is a true bypass, and a part at default settings has to be
            // bit-for-bit the signal it was before any of this existed
            const dv = val("drive") / 100;
            if (dv !== m.partDriveAmt[li]) {
              m.partDriveAmt[li] = dv;
              m.partDrive[li].curve = dv > 0 ? driveCurve(dv) : null;
            }
            // Tremolo swings down from the level that is set, never up past it
            const td = (val("trem") / 100) * 0.5;
            m.partTrem[li].gain.setValueAtTime(1 - td, t);
            m.partTremLfo[li].depth.gain.setValueAtTime(td, t);
            m.partTremLfo[li].osc.frequency.setValueAtTime(1 / (beatSec * val("tremRate")), t);
            if (m.partPan[li]) {
              const ap = val("apan") / 100;
              // keep the sweep inside the stereo field wherever Pan has placed the part
              const base = Math.max(-1 + ap, Math.min(1 - ap, val("pan") / 100));
              m.partPan[li].pan.setValueAtTime(base, t);
              m.partPanLfo[li].depth.gain.setValueAtTime(ap, t);
              m.partPanLfo[li].osc.frequency.setValueAtTime(1 / (beatSec * val("apanRate")), t);
            }
            if (m.partVerb[li]) m.partVerb[li].gain.setValueAtTime(val("verb") / 100, t);
          };
          /* Which written column a part reads this tick. Four of the pattern effects are all the
             same operation underneath — a map from "where we are" to "what to play" — so they are
             one function rather than four scattered edits that would have to agree with each other.
             `null` means the part is silent here, which is how Euclid thins a line out.
             The order matters: speed first (it decides which column we are even asking about), then
             reverse, then shift, and Euclid last as a mask over the result. */
          const colFor = (ly, N, melStep, mb) => {
            const raw = mb * MB + melStep;
            const rate = modOf(ly, "rate");
            // half time reads each column twice and covers half the notes; double time reads two
            // columns in the time of one and comes round again inside the same bar
            let c = rate === 1 ? raw : Math.floor(raw * rate);
            if (rate < 1 && (raw * rate) % 1 !== 0) return null;   // between columns at half speed
            const retro = modOf(ly, "retro");
            if (retro === "bar") c = Math.floor(c / MB) * MB + (MB - 1 - ((c % MB) + MB) % MB);
            else if (retro === "sec") c = N - 1 - (((c % N) + N) % N);
            c = (((c + modOf(ly, "shift")) % N) + N) % N;
            const k = modOf(ly, "euclid");
            if (k && !euclidHit(k, modOf(ly, "euclidLen"), raw)) return null;
            return c;
          };
          /* When a part's notes land, once per part per tick. Nudge moves the whole part off the
             beat by a fixed amount, humanise scatters each note by a different one, and swing
             delays its off-beats only. All are clamped forward, because an offline render starts at
             time zero and scheduling before it throws rather than rounding up. */
          const timeFor = (ly, li, step) => {
            const h = modOf(ly, "hum") / 100;
            const off = modOf(ly, "nudge") / 1000
              + (h ? (hash01(m.step * 3571 + li * 89) - 0.5) * h * 0.06 : 0)
              + (step % 2 ? (modOf(ly, "swing") / 100) * (beat / (subRef.current || 2)) * 0.5 : 0);
            return Math.max(m.ctx.currentTime, t + off);
          };
          /* How hard this note is played, before the part's level. The pulse accent is always
             there; Accent leans on the downbeats, Level spread varies note to note, and Swell rides
             the whole thing across the section — measured as a fraction of the section's own length,
             so it re-times itself when the arrangement changes rather than needing to be redrawn. */
          const velFor = (ly, li, step, nbars) => {
            const r = modOf(ly, "rvel") / 100;
            const ramp = modOf(ly, "ramp") / 100;
            const through = nbars > 1 ? mb / (nbars - 1) : (mb ? 1 : 0);
            return humVel(accent) * accentOf(ly, step)
              * (r ? 1 + (hash01(m.step * 6151 + li * 401) - 0.5) * r : 1)
              * (ramp ? Math.max(0.05, 1 + ramp * (through - 0.5)) : 1);
          };
          /* Whether this note sounds at all, and how hard. Both are per part and both are hashed
             from the position in the song rather than drawn at random, so a part that plays 7 notes
             in 10 plays the same 7 every time the song is played, rendered or bounced. */
          const playChance = (ly, li, colAbs) => {
            const p = modOf(ly, "prob");
            return p >= 100 || hash01(colAbs * 8191 + li * 613) * 100 < p;
          };
          const accentOf = (ly, step) => {
            const a = modOf(ly, "accent") / 100;
            return a ? (step % (subRef.current || 2) === 0 ? 1 + a * 0.6 : 1 - a * 0.45) : 1;
          };
          /* The part's amplitude envelope, as modifiers on whatever the chosen instrument already
             does rather than as absolute times. Every default is dead centre — nothing added to the
             attack, every stage at 1× — so a part that has never been near these controls plays
             exactly the voice it always did. */
          const shapeOf = ly => {
            const a = modOf(ly, "atk"), d = modOf(ly, "dec"), s = modOf(ly, "sus"), r = modOf(ly, "rel");
            if (!a && !d && !s && !r) return NO_SHAPE;      // the common case, and a shared object
            return {
              // squared, so the first third of the slider covers the range where small changes are
              // audible and the top end reaches a genuine swell
              atk: Math.pow(a / 100, 2) * 1.2,
              dec: Math.pow(2, d / 50), sus: Math.pow(2, s / 70), rel: Math.pow(2, r / 33),
            };
          };
          /* The note effects: the arpeggiator's siblings. Each rewrites the note events before any
             sound exists, which is why they follow the key and the chord on their own.
             `Harmonise` builds its extra notes out of the scale, so it stays in key. */
          const CHORD_STEPS = { "3": [2], "5": [4], "35": [2, 4], "357": [2, 4, 6], "15": [4, 7] };
          // how far apart the notes of a harmonised chord sit, as octave offsets per voice
          const VOICING = { close: [0, 0, 0], open: [0, -1, 0], spread: [0, 1, 2], drop: [0, 0, -1] };
          const harmOf = (ly, deg, scale) => {
            const steps = CHORD_STEPS[modOf(ly, "chord")];
            if (!steps || deg == null) return [];
            const v = VOICING[modOf(ly, "voicing")] || VOICING.close;
            // scale degrees, so a third is a major or minor third depending on where in the key it
            // falls — the thing that makes this sound like harmony rather than a fixed interval
            return steps.map((s, j) => scale[(deg + s) % scale.length] + 12 * Math.floor((deg + s) / scale.length)
              - scale[deg] + 12 * (v[j % v.length] || 0));
          };
          /* Fold a note into a smaller set of pitches. The grid is already in the key, so this only
             bites once Transpose has taken a part out of it or Stray notes have wandered — which is
             exactly when you want it. Pentatonic is the safety net: nothing in it clashes with
             anything else in the key. */
          const SNAP_SETS = { pent: [0, 2, 4, 7, 9], blues: [0, 3, 5, 6, 7, 10] };
          const snapMidi = (ly, midi, scale, tonic) => {
            const mode = modOf(ly, "snap");
            if (!mode) return midi;
            const set = mode === "key" ? scale.map(s => ((s % 12) + 12) % 12)
              : mode === "tri" ? (m.voicing || []).map(n => ((n % 12) + 12) % 12)
              : SNAP_SETS[mode].map(s => (s + tonic) % 12);
            if (!set.length) return midi;
            const pc = ((Math.round(midi) % 12) + 12) % 12;
            let best = 0, bestD = 99;
            for (const s of set) {
              // nearest by distance round the octave, so a note never leaps to reach its target
              const d = Math.min(((s - pc) + 12) % 12, ((pc - s) + 12) % 12);
              if (d < bestD) { bestD = d; best = ((s - pc) + 18) % 12 - 6; }
            }
            return midi + best;
          };
          // mirror a scale degree around an axis — every rise becomes a fall of the same size
          const invertDeg = (ly, deg, first, nd) => {
            const how = modOf(ly, "invert");
            if (!how) return deg;
            const axis = how === "tonic" ? 0 : how === "fifth" ? 4 : (first == null ? deg : first);
            return Math.max(0, Math.min(nd - 1, 2 * axis - deg));
          };
          /* One note, with everything a part's settings do to it: transposed, detuned, stretched,
             harmonised into a chord, strummed, ratcheted, jumped an octave, and doubled. Shared by
             the grid and the arp, so a control means the same thing whichever of the two is playing. */
          const fireNote = (ly, li, voice, tp, midi0, dur0, dest, held, harm, slot = 0) => {
            const midi = midi0 + modOf(ly, "semis") + modOf(ly, "detune") / 100;
            const rat = Math.max(1, modOf(ly, "ratchet"));
            const seed = m.step * 5099 + li * 271 + Math.round(midi0) * 17;
            const rl = modOf(ly, "rlen") / 100;
            const dur = (dur0 / rat) * (modOf(ly, "len") / 100)
              * (rl ? Math.max(0.15, 1 + (hash01(seed + 1471) - 0.5) * rl * 1.4) : 1);
            const dbl = modOf(ly, "oct2");
            const strum = modOf(ly, "strum") / 1000;        // milliseconds between the notes of a chord
            const kind = isGM(voice) ? FAM_LEAD[gmFam(voice)] : voice;
            const base = shapeOf(ly);
            // an octave jump replaces the note rather than adding to it — it is a different note,
            // not a thicker one. Hashed from the position, so the wandering is the same every play.
            const jump = modOf(ly, "octJump");
            const up = jump && hash01(seed) * 100 < jump ? (hash01(seed + 8161) < 0.5 ? 12 : -12) : 0;
            const stack = [midi + up, ...(harm || []).map(h => midi + up + h)];
            if (dbl) stack.push(midi + up + 12 * dbl);
            const dir = modOf(ly, "strumDir");
            // alternating means a hand going back down for the next chord, not for the next note
            const down = dir === "down" || (dir === "alt" && Math.floor(m.step / (MB || 1)) % 2 === 1);
            const fade = modOf(ly, "ratchetFade") / 100;
            /* The note echo. Real notes rather than a delay line, so each repeat goes through the
               part's own instrument, filter and envelope, and can move in pitch as it goes — which
               a delay could never do, because a delay can only repeat what it was handed. */
            const reps = modOf(ly, "echo"), gapBeats = modOf(ly, "echoTime");
            const efade = modOf(ly, "echoFade") / 100, epitch = modOf(ly, "echoPitch");
            for (let e = 0; e <= reps; e++) {
              const eLvl = Math.pow(1 - efade * 0.85, e);
              if (eLvl < 0.02) break;                        // too quiet to be worth scheduling
              const eT = tp + e * gapBeats * beat, eSemis = e * epitch;
              for (let k = 0; k < rat; k++) {                // ratchet: the same chord, k times over
                const tk = eT + k * (dur0 / rat);
                // a roll that fades away, or one that builds into the note after it
                const rLvl = rat > 1 && fade ? Math.max(0.08, 1 - fade * (k / (rat - 1) - 0.5) * 1.6) : 1;
                const lvl = eLvl * rLvl;
                const shape = lvl === 1 ? base : { ...base, lvl };
                stack.forEach((mi, j) => {
                  // fold anything out of hearing back in rather than letting it whistle or disappear
                  const md = Math.max(21, Math.min(108, mi + eSemis));
                  // `slot` is this note's place among the ones sounding together, so a strum spreads
                  // a chord written into the grid as well as one Harmonise built
                  const at = down ? (stack.length - 1 - j) : j;
                  const tj = tk + (slot + at) * strum;
                  if (!(realRef.current && playLeadSampled(m.sampler, voice, tj, md, dur, dest, shape)))
                    leadNote(m.ctx, tj, md, dur, kind, held && rat === 1 && !reps, dest, shape);
                });
              }
            }
          };
          // the filter envelope, opened at the note and falling back to where Low-pass is set.
          // `vel` is how hard this note is played: on a real instrument that opens the tone as well
          // as raising the level, and Velocity → tone is how much of that link this part has.
          const fireFenv = (ly, li, tp, vel) => {
            const amt = modOf(ly, "fenv") / 100, vf = modOf(ly, "vfilt") / 100;
            if (!amt && !vf) return;
            // the envelope falls back to the drawn lane where one exists, exactly as the steady
            // cutoff does — or a drawn sweep would vanish the moment the envelope was turned up
            const laneCut = laneCutOf(li);
            const cutHz = nyq(m, 120 * Math.pow(FILTER_OPEN / 120,
              (laneCut != null ? laneCut * 100 : modOf(ly, "cut")) / 100));
            const lift = 1 + vf * Math.max(-0.9, (vel - 1)) * 6;
            const top = nyq(m, cutHz * (1 + amt * 12) * Math.max(0.1, lift));
            const dec = 0.03 + (modOf(ly, "fdec") / 100) * (beat * 1.2);
            const lp = m.partLp[li];
            lp.frequency.setValueAtTime(top, tp);
            lp.frequency.exponentialRampToValueAtTime(Math.max(30, cutHz), tp + dec);
          };
          // play one melody layer's column with its own voice (falling back to the global lead)
          const playLayer = (ly, flat, voice, li, oct, gain, send, nbars) => {
            if (!flat || !flat.length || melStep == null || !gain) return;
            const N = flat.length;
            const col = colFor(ly, N, melStep, mb);    // null = the pattern effects silence this tick
            if (col == null) return;
            if (!playChance(ly, li, m.step)) return;
            const tp = timeFor(ly, li, melStep);
            const dest = chainOf(li).gain;
            const vel = velFor(ly, li, melStep, nbars);
            dest.gain.setValueAtTime(gain * vel, tp);
            if (m.partSend[li]) m.partSend[li].gain.setValueAtTime(send, tp);
            const leadKey = isGM(voice) ? voice : null;   // real-sample lead voice, if any
            if (realRef.current && leadKey && !m.leadLoaded.has(leadKey)) { m.sampler.load(leadKey); m.leadLoaded.add(leadKey); }
            const cells = flat[col] || [];
            if (cells.length) fireFenv(ly, li, tp, vel);
            // the bar's first written note, so Invert can mirror the phrase around where it began
            const firstDeg = (() => {
              const at = Math.floor(col / MB) * MB;
              for (let c = at; c < Math.min(at + MB, N); c++) if ((flat[c] || []).length) return flat[c][0];
              return null;
            })();
            const nd = mel.scale.length;
            const stray = modOf(ly, "rpitch"), dia = modOf(ly, "dia");
            // sorted, so a strum runs up the chord rather than in whatever order the grid stored it
            [...cells].sort((a, b) => a - b).forEach((deg0, slot) => {
              const held = mel.legato;
              const prev = flat[col - 1] || [];
              if (held && col > 0 && prev.includes(deg0)) return; // still ringing from last slot
              let run = 1;
              if (held) while (col + run < N && (flat[col + run] || []).includes(deg0)) run++;
              /* The pitch-domain note effects, in the order they have to happen: mirror the written
                 note, wander off it, then move it by scale steps. All three work on the *degree*
                 rather than the semitone, which is what keeps them in the key however far they go. */
              let deg = invertDeg(ly, deg0, firstDeg, nd);
              if (stray && hash01(m.step * 7127 + li * 331 + slot * 13) * 100 < stray)
                deg += hash01(m.step * 991 + slot * 7) < 0.5 ? -1 : 1;
              deg += dia;
              // a degree past either end of the scale is the same note an octave away
              const oc = Math.floor(deg / nd), d = ((deg % nd) + nd) % nd;
              const midi = snapMidi(ly, base + 12 * (oct || 0) + 12 * oc + mel.scale[d], mel.scale, mel.tonic);
              // `run` counts melody columns, so a note's length has to be measured in columns
              // — on a sixteenth grid a one-column note is a sixteenth, not an eighth
              const colDur = beat / (subRef.current || 2);
              fireNote(ly, li, voice, tp, midi, held ? colDur * (run + 0.35) : colDur * 0.92, dest, held,
                harmOf(ly, d, mel.scale), slot);
            });
          };
          /* The arpeggiator. Rather than reading the grid, an arped part takes the chord under
             this bar and walks its notes in the chosen order — so it re-follows the harmony the
             moment you change a chord, which is the whole point of arping in a sketchpad.
             The step index comes from the absolute tick, not a running counter, so the line is
             identical whether it is played, rendered or bounced to a stem. */
          const playArp = (ly, fx, voice, li, oct, gain, send, nbars) => {
            const mode = ARP_BY_ID[fx.arp];
            if (!mode || !gain || !m.voicing || !m.voicing.length) return;
            const rate = modOf(ly, "rate");
            const stride = L / (fx.arpRate * rate * barBeatsRef.current);
            if (stride < 1 || i % Math.round(stride) !== 0) return;     // not an arp step
            if (!playChance(ly, li, m.step)) return;
            const one = m.voicing.length;                                // notes in one octave
            const pool = [];
            for (let o = 0; o < Math.max(1, fx.arpOct); o++)
              for (const n of m.voicing) pool.push(n + 12 * o);
            const stepIdx = Math.floor(m.step / Math.round(stride));
            // Euclid thins an arp exactly as it thins a written line — the arp decides which note,
            // Euclid decides whether this step gets one at all
            const ek = modOf(ly, "euclid");
            if (ek && !euclidHit(ek, modOf(ly, "euclidLen"), stepIdx)) return;
            // an arp walks the chord's own notes, so Scale steps and Reverse move it through the
            // pool rather than through the scale — the same idea in the set the arp is actually using
            const dir = modOf(ly, "retro") ? -1 : 1;
            const seqAt = mode.seq(stepIdx * dir + modOf(ly, "shift"), pool.length, one);
            let midi = pool[Math.min(pool.length - 1, Math.max(0,
              ((seqAt + modOf(ly, "dia")) % pool.length + pool.length) % pool.length))] + 12 * (oct || 0);
            // Four octaves of arp on a part already lifted two is a piercing 12 kHz whistle, and
            // the same stack on a sub bass falls below hearing. Fold stray octaves back into the
            // audible range rather than letting the two settings multiply into something unusable.
            while (midi > 108) midi -= 12;
            while (midi < 24) midi += 12;
            const chain = chainOf(li);
            const tp = timeFor(ly, li, stepIdx);
            const vel = velFor(ly, li, stepIdx, nbars);
            chain.gain.gain.setValueAtTime(gain * vel, tp);
            if (m.partSend[li]) m.partSend[li].gain.setValueAtTime(send, tp);
            const leadKey = isGM(voice) ? voice : null;
            if (realRef.current && leadKey && !m.leadLoaded.has(leadKey)) { m.sampler.load(leadKey); m.leadLoaded.add(leadKey); }
            fireFenv(ly, li, tp, vel);
            /* Harmonising an arp takes the notes above it in the chord's own pool rather than the
               scale: the arp is already walking that chord, so its harmony has to come from the
               same set or the two disagree about what the bar's chord is. */
            const at = pool.indexOf(midi - 12 * (oct || 0));
            const steps = { "3": [1], "5": [2], "35": [1, 2], "357": [1, 2, 3], "15": [2, 4] }[modOf(ly, "chord")];
            const harm = steps && at >= 0
              ? steps.map(s => pool[Math.min(pool.length - 1, at + s)] - pool[at]) : [];
            fireNote(ly, li, voice, tp, snapMidi(ly, midi, mel.scale, mel.tonic),
              (beat / (fx.arpRate * rate)) * 0.92, chain.gain, false, harm);
          };
          const anySolo = sec.layers.some(ly => ly.solo);
          sec.layers.forEach((ly, li) => {
            if (m.stem && !(m.stem.kind === "part" && m.stem.i === li)) return;
            // this tick's chain slot — the arrangement's own parts use li itself (liBase 0); a
            // Session track's clip gets a slot of its own, offset clear of every arrangement part
            // (see the liBase note below), so the two never fight over the same nodes.
            const chainLi = liBase + li;
            // a part move patches this tick's read of the layer's own mods — every reader below
            // (layerFx, modOf, colFor, playArp…) sees it as if the ramp were just another setting
            if (moveId) ly = partMoveOf(ly, moveId, mb, mvNbars);
            const fx = layerFx(ly);
            const gain = layerGain(ly, anySolo), voice = ly.instr || mel.melInstr;
            /* Build the chain for every part on every tick rather than only when something needs
               it. It is memoised, so the cost is one lookup; what it buys is that a part's LFOs
               and filter always start at the same moment in the song, whichever settings happen to
               be turned up — the property a stem bounce needs to line up with the mix. */
            chainOf(chainLi);
            applyMods(chainLi, ly, t);
            // this part's own sidechain depth; null means "whatever the global Pump says"
            if (kickNow) {
              const amt = fx.duck == null ? pumpRef.current : fx.duck;
              if (amt && m.partDuck[chainLi]) duckAt(m.partDuck[chainLi], t, amt, beat * 0.8);
            }
            // The note gate, on a four-per-beat grid so one pattern reads the same in 3/4 as in
            // 4/4. setTargetAtTime rather than a step, or every edge clicks.
            if (fx.gate && GATE_BY_ID[fx.gate]) {
              const pat = GATE_BY_ID[fx.gate].pat;
              const gsteps = barBeatsRef.current * 4;
              /* How many of the pattern's steps play before it starts again. At 16 it fits the bar
                 and repeats in place; at anything else it does not, so it walks around the beat and
                 takes several bars to come back round — polymeter. The step count runs from the
                 absolute tick rather than the position in the bar, or the walk would reset every
                 bar and there would be nothing to hear. */
              const len = Math.max(1, Math.min(pat.length, modOf(ly, "gateLen")));
              const gstep = len === pat.length
                ? Math.floor(i * gsteps / L)
                : Math.floor(m.step * gsteps / L);
              const open = pat[((gstep % len) + len) % len] === "x" ? 1 : 0;
              m.partGate[chainLi].gain.setTargetAtTime(open, t, 0.004);
            } else if (m.partGate[chainLi]) {
              // Turning the gate off has to re-open it. Without this, switching the menu back to
              // "off" while the gate happened to be shut would leave the node at zero and the part
              // silent for the rest of the session.
              m.partGate[chainLi].gain.setTargetAtTime(1, t, 0.01);
            }
            // how many bars this section runs for, so Swell can measure its way across it
            const nbars = (sec.layers[0] && sec.layers[0].bars.length) || 1;
            if (fx.arp) playArp(ly, fx, voice, chainLi, ly.oct || 0, gain, ly.send || 0, nbars);
            else playLayer(ly, ly.flat, voice, chainLi, ly.oct || 0, gain, ly.send || 0, nbars);
          });
          // the piano-roll playhead is the arrangement's own; the Session view has no single
          // "current column" across N independent tracks, so it stays out of this readout
          if (liBase === 0) {
            const Nq = (sec.layers.find(ly => ly.flat.length) || { flat: [] }).flat.length;
            if (melStep != null) {
              const q = { sym, col: Nq ? (mb * MB + melStep) % Nq : 0 };
              setTimeout(() => setCurQ(q), Math.max(0, (t - m.ctx.currentTime) * 1000));
            }
          }
        }
        });
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
  /* The Session view's own transport. It shares the arrangement's metronome/audio-graph plumbing
     (there is only ever one AudioContext playing) but none of its bar pointer: startMetro(0)'s
     own stopMetro() clears sessionModeRef first, so it is set *after* — every track then resolves
     against whatever was queued in sessionLiveRef/sessionQueueRef before Play was pressed, rather
     than the arrangement or the groove. */
  const sessionPlay = () => {
    startMetro(0);
    sessionModeRef.current = true;
    setSessionPlaying(true);
  };
  // toggle a single-section loop: while on, all playback confines to this section and repeats.
  // Turning it on also starts playback from the section if nothing is playing.
  const toggleLoopSec = d => {
    const on = loopSec !== d.key;
    // the groove sketch is not on the song's timeline, so looping it is its own mode: the plain
    // chord loop plays and every track resolves to the groove, whatever structure is loaded
    loopRef.current = !on ? null
      : d.key === GROOVE ? { groove: true, len: d.nbars }
      : { from: d.startBar, len: d.nbars };            // take effect on the very next tick
    setLoopSec(on ? d.key : null);
    if (on && !playing) startMetro(d.key === GROOVE ? 0 : d.startBar);
  };
  /* The transport's Play, tab-aware. The Sketch tab is its own room: Play there loops the groove
     and must never start the song the Arrange tab holds — that is what ✍ Write to Arrange is for.
     On every other tab Play starts the song from the top, first clearing a groove loop the sketch
     may have left armed (or the song could not be played at all). Space bar goes through here too. */
  const playTransport = () => {
    if (playing) { stopMetro(); return; }
    if (tab === "session") {
      // `playing` was false to get here, so stopMetro's own reset means nothing is live or
      // queued yet — sessionPlay alone would start an empty, silent room. Launching every
      // track's first clip (scene row 0) is what makes pressing Play here behave like every
      // other tab's Play: it plays what is already set up, not nothing until you click a clip.
      sessionPlay();
      sessionTracks.forEach(tr => { if (tr.clips[0]) launchSessionClip(tr.id, tr.clips[0].id); });
      return;
    }
    if (tab === "sketch") {
      loopRef.current = { groove: true, len: grooveInst.nbars };
      setLoopSec(GROOVE);
      startMetro(0);
      return;
    }
    if (loopRef.current && loopRef.current.groove) { loopRef.current = null; setLoopSec(null); }
    startMetro(0);
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
     `stem` is null for the full mix, or { kind:"chords"|"drums"|"bass"|"perc"|"pad"|"part", i } to isolate one
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
  const renderOffline = async (stem, onProgress) => {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const nBars = (structBars && structBars.length) ? structBars.length : Math.max(1, chords.length);
    const ticksPerBar = tickRef.current || 8;
    const secsPerBar = barBeats * 60 / effBpm;
    const TAIL = 3.5;                                  // let the reverb and delay ring out
    const rate = 44100;
    const total = nBars * secsPerBar + TAIL;
    const ctx = new OAC(2, Math.ceil(total * rate), rate);
    /* Rendering is the whole wait — the graph is scheduled in a second or two, then
       startRendering() crunches minutes of audio with no events of its own. suspend() checkpoints
       are the one window it offers: pause at every percent of the timeline, report, resume. They
       only pause an idle graph for a microtask, so the audio is untouched — but a long render now
       shows a moving number instead of a frozen label. */
    if (onProgress && typeof ctx.suspend === "function") {
      const step = total / 100;
      for (let s = step; s < total; s += step)
        ctx.suspend(s).then(() => { onProgress(Math.round(100 * s / total)); ctx.resume(); })
          .catch(() => {});                            // a rejected checkpoint costs a tick of feedback, not the render
    }
    const m = buildGraph(ctx, 0, stem || null);
    m.nextTime = 0;                                    // offline starts at zero, no lookahead
    // give the sampler the same chance it gets live; if the samples aren't ready in time the
    // render falls back to the synth voices exactly as playback would
    if (realRef.current) await waitSamples(m.sampler);
    for (let n = 0; n < nBars * ticksPerBar; n++) emitTick(m, false);
    return ctx.startRendering();
  };
  // one shared "how far through the render" number, shown on whichever export button is busy
  const [renderPct, setRenderPct] = useState(null);
  const pctLabel = word => renderPct == null ? `${word}…` : `${word}… ${renderPct}%`;
  const renderAudio = async () => {
    if (rendering || claudeExporting) return;
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) { setIoNote("This browser cannot render audio."); return; }
    setRendering(true);
    setIoNote("Rendering…");
    try {
      const buf = await renderOffline(null, setRenderPct);
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
    } finally { setRendering(false); setRenderPct(null); }
  };

  /* ---- stem export ----
     One wav per source — drums, chords, and each melody part — zipped into a single download.
     This is the handoff a DAW actually wants: drop the folder on the timeline and every source
     lands on its own track, already aligned, instead of one flattened mix you can't unpick.
     Each stem is rendered by muting the others, so they sum back to the mix bar for bar. */
  const [stemming, setStemming] = useState(false);
  const [projExporting, setProjExporting] = useState(false);
  const stemList = () => {
    const out = [];
    if (drumRef.current && drumRef.current.length) out.push({ kind:"drums", name:"drums" });
    if (chords.length) out.push({ kind:"chords", name:"chords-" + instr });
    if (bassAnywhere && chords.length) out.push({ kind:"bass", name:"bass-" + bassVoice });
    if (percAnywhere) out.push({ kind:"perc", name:"perc" });
    if (padAnywhere && chords.length) out.push({ kind:"pad", name:"pad" });
    /* Extra tracks (#1, #2, …): one more stem per extra drums/perc/bass/pad track that actually
       carries something, in whichever section (or the groove) it was written — mirrors the melody
       parts loop just below, and the `i` here is what emitTick's `m.stem.kind === … && (m.stem.i
       || 0) === li` guards (see the note beside TRACKS_FX) key their isolation off. */
    const groove = { key: GROOVE, base: GROOVE };
    const nExtraOf = type => Math.max(0, trackLayerCount(type, GROOVE),
      ...sections.insts.map(x => trackLayerCount(type, x.key))) - 1;
    for (let li = 1; li <= nExtraOf("drums"); li++)
      if (sections.insts.some(x => !!drumSrcOf(layered(x, li))) || !!drumSrcOf(layered(groove, li)))
        out.push({ kind:"drums", i: li, name: "drums-" + LAYER_NAMES[li] });
    for (let li = 1; li <= nExtraOf("perc"); li++)
      if (sections.insts.some(x => !!percSrcOf(layered(x, li))) || !!percSrcOf(layered(groove, li)))
        out.push({ kind:"perc", i: li, name: "perc-" + LAYER_NAMES[li] });
    if (chords.length) {
      for (let li = 1; li <= nExtraOf("bass"); li++)
        if (sections.insts.some(x => !!bassSrcOf(layered(x, li))) || !!bassSrcOf(layered(groove, li)))
          out.push({ kind:"bass", i: li, name: "bass-" + LAYER_NAMES[li] + "-" + bassVoice });
      for (let li = 1; li <= nExtraOf("pad"); li++)
        if (sections.insts.some(x => padOnOf(layered(x, li))) || padOnOf(layered(groove, li)))
          out.push({ kind:"pad", i: li, name: "pad-" + LAYER_NAMES[li] });
    }
    // parts are per-section, so a part index counts if any section has notes on it
    const nParts = Math.max(0, ...Object.values(secMelos).map(s => nLayers(s)));
    for (let i = 0; i < nParts; i++) {
      const secs = Object.values(secMelos);
      if (!secs.some(s => s.layers[i] && s.layers[i].flat && s.layers[i].flat.length)) continue;
      const withNotes = secs.find(s => s.layers[i] && s.layers[i].flat && s.layers[i].flat.length);
      const voice = (withNotes.layers[i].instr) || melInstr;
      out.push({ kind:"part", i, name:"part-" + LAYER_NAMES[i] + "-" + voice });
    }
    /* Risers, rolls and crashes are added sources rather than processing, so they bounce as their
       own track: on the master they went into every stem, and four stems summed to four risers.
       A DAW wants them separate anyway — the fx track is the one you ride by hand. */
    if (Object.values(secMove).some(Boolean) || Object.values(secTrans).some(Boolean))
      out.push({ kind:"fx", name:"fx" });
    return out;
  };
  /* The render loop itself, shared by ↓ Export stems and the Live project: warm the sample cache
     once up front (each render waits on its own, but a timeout on the first stem and a success on
     the second would leave the stems disagreeing about whether a part is real or synth, and they'd
     no longer sum to the mix), then bounce sequentially — several full-length OfflineAudioContexts
     at once is how a phone runs out of memory mid-export. */
  const renderStemFiles = async stems => {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (realRef.current) {
      setIoNote("Loading instruments…");
      const warm = new OAC(1, 512, 44100);
      await waitSamples(makeSampler(warm));
    }
    const files = [];
    let silent = 0;
    for (let n = 0; n < stems.length; n++) {
      setRenderPct(null);
      setIoNote(`Bouncing stem ${n + 1} of ${stems.length} — ${stems[n].name}…`);
      const buf = await renderOffline(stems[n], setRenderPct);
      if (peakOf(buf) < 1e-4) { silent++; continue; }   // a muted or empty source is not worth a file
      files.push({ name: String(n + 1).padStart(2, "0") + "-" + safeName(stems[n].name) + ".wav",
        bytes: audioBufferToWav(buf) });
    }
    return { files, silent };
  };
  const exportStems = async () => {
    if (stemming || rendering || claudeExporting || projExporting) return;
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) { setIoNote("This browser cannot render audio."); return; }
    const stems = stemList();
    if (!stems.length) { setIoNote("Nothing to bounce — add a drum pattern, chords or a melody first."); return; }
    setStemming(true);
    try {
      const { files, silent } = await renderStemFiles(stems);
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
    } finally { setStemming(false); setRenderPct(null); }
  };

  /* ---- Export for Claude ----
     Two files meant to be uploaded together in one message: the full arrangement rendered to a wav
     (the same offline render as Export audio — same graph, same tick emitter, so it is what you
     heard), and a JSON snapshot of every setting that shaped it. The snapshot is the point:
     audio alone says what it sounds like; the settings say why. */
  const [claudeExporting, setClaudeExporting] = useState(false);
  /* The drum and chord-rhythm chains, mirrored from emitTick the way bassSrcOf mirrors the bass:
     the pass's own written grid → its (or its letter's) menu choice → the groove's written grid →
     the song-level pattern. One order, and now five readers — the export must agree with the
     speakers or the file lies about the wav beside it. */
  const drumSrcOf = d => {
    const own = d && secBeat[d.key];
    if (own && own.length) return { beat: own };
    const sd = effDrum(d);
    if (sd) return DRUMS[sd] && DRUMS[sd].pattern ? { pat: sd } : null;
    const gk = GROOVE + layerSuf(d && d.key);
    const g = d && d.key !== gk && secBeat[gk];
    if (g && g.length) return { beat: g, loop: true };
    return DRUMS[drum] && DRUMS[drum].pattern ? { pat: drum } : null;
  };
  const chordSrcOf = d => {
    const own = d && secChordBeat[d.key];
    if (own && own.length) return { beat: own };
    const g = d && d.key !== GROOVE && secChordBeat[GROOVE];
    if (g && g.length) return { beat: g, loop: true };
    return { pat: patId };
  };
  /* The single source of truth for the settings export: everything the snapshot says is gathered
     here, resolved with the same helpers playback uses, and shaped by export-state.js. New export
     surfaces read this rather than the state directly, so they cannot drift from each other. */
  const getExportState = () => {
    const secOf = d => ({
      key: d.key, name: d.sec, word: d.word, letter: d.base, bars: d.nbars, startBar: d.startBar,
      chords: d.cs.map(c => ({ name: c.name, numeral: c.numeral || null })),
      drums: drumSrcOf(d),
      chordsQuiet: effQuiet(d), chordsSrc: chordSrcOf(d),
      bass: bassSrcOf(d), perc: percSrcOf(d),
      padVoiceId: padVoiceOf(d), padBeat: padBeatOf(d),
      move: effMove(d), trans: effTrans(d),
      inherited: !!(secMelos[d.key] && secMelos[d.key].inherited),
      layers: (secMelos[d.key] && secMelos[d.key].layers) || [],
      // only the buses this section carries its own copy of — everything else is the song-wide
      // rack already stated once under insert_fx, and repeating it per section would only bloat
      // the snapshot for every song that never touches this feature
      fxOverride: secFx[d.key] || null,
    });
    const grooveUsed = !!((secBeat[GROOVE] && secBeat[GROOVE].length)
      || (secBassBeat[GROOVE] && secBassBeat[GROOVE].length)
      || (secPercBeat[GROOVE] && secPercBeat[GROOVE].length)
      || (secPadBeat[GROOVE] && secPadBeat[GROOVE].length)
      || (secChordBeat[GROOVE] && secChordBeat[GROOVE].length)
      || secHasNotes(secMelos[GROOVE]));
    return buildExportState({
      exportedAt: new Date().toISOString(),
      songName: sketchName.trim() || "progression-wheel",
      tonic, mode: effMode, bpm: effBpm, meterId: curMeter, barBeats,
      meloSub, swingAmt, humanise,
      progName: prog.label,
      chords: chords.map(c => ({ name: c.name, numeral: c.numeral || null })),
      contrast: structSel && chords2 ? {
        name: (PROGRESSIONS[contrast.id] || {}).name || contrast.id,
        applies_to_section_letter: contrast.sec,
        chords: chords2.map(c => ({ name: c.name, roman_numeral: c.numeral || null })),
      } : null,
      structureName: structSel ? structSel.st.name : null,
      isCustomPlan: !!customPlan,
      planRows: effPlan || [],
      // the same bar count the render uses, so the stated duration is the wav's (minus its tail)
      totalBars: (structBars && structBars.length) ? structBars.length : Math.max(1, chords.length),
      sections: sections.insts.map(secOf),
      groove: grooveUsed ? secOf(grooveInst) : null,
      instr, melInstr, kit, percKit, pump, bassVoice, padId: pad,
      drum, patId, delayId, trackFx, fxRack, realSounds, legato, clickOn,
      auto: auto.key === planKey ? auto : {},
    });
  };
  const exportForClaude = async () => {
    if (claudeExporting || rendering || stemming || projExporting) return;
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) { setIoNote("This browser cannot render audio — Export for Claude needs it."); return; }
    setClaudeExporting(true);
    setIoNote("Rendering the arrangement for Claude…");
    try {
      const buf = await renderOffline(null, setRenderPct);
      const bytes = audioBufferToWav(buf);
      const state = getExportState();
      const json = new TextEncoder().encode(JSON.stringify(state, null, 2));
      const name = safeName(sketchName.trim() || "progression-wheel");
      const save = (data, type, fname) => {
        const url = URL.createObjectURL(new Blob([data], { type }));
        const a = document.createElement("a");
        a.href = url; a.download = fname;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      };
      save(bytes, "audio/wav", `${name}-arrangement.wav`);
      // a beat between the two clicks, or some browsers quietly drop the second download
      setTimeout(() => save(json, "application/json", `${name}-settings.json`), 400);
      const silent = peakOf(buf) < 1e-4;
      setIoNote(`Two files for Claude: ${name}-arrangement.wav (${buf.duration.toFixed(1)}s) and `
        + `${name}-settings.json — upload both together in one message.`
        + (silent ? " Note: the audio rendered silent — add a drum pattern or a melody first." : ""));
    } catch (e) {
      setIoNote("Export for Claude failed" + (e && e.message ? `: ${e.message}` : "")
        + " — the MIDI and settings-free audio exports still work.");
    } finally { setClaudeExporting(false); setRenderPct(null); }
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
      // per-bar drum pattern: a section's own kit if it set one, else the global choice. Extra
      // drums tracks (li > 0) resolve the same way against their own `#N`-suffixed keys, except
      // they never fall back to the song-wide kit (glob=null) — see the note beside TRACKS_FX.
      const drumForBarL = (li, glob) => bi => {
        const b = bars[bi];
        const suf = li ? LSEP + li : "";
        // a section's own written bars first, then its type's catalogue choice, then the groove
        // sketch's written drums, then the song's — the same order playback resolves, so the file
        // is what you heard
        const own = b && b.inst != null ? secBeat[b.inst + suf] : null;
        if (own && own.length) return own[Math.min(b.mb, own.length - 1)];
        const sd = b && ((b.inst != null && secDrum[b.inst + suf]) || (b.base != null && secDrum[b.base + suf]));
        if (!sd) {
          const g = secBeat[GROOVE + suf];
          if (g && g.length) return g[(b && b.inst != null ? b.mb : bi) % g.length];
        }
        const id = sd || glob;
        return id && DRUMS[id] ? DRUMS[id].pattern : null;
      };
      const drumForBar = drumForBarL(0, drum);
      const anyDrum = bars.some((_, i) => drumForBar(i));
      // how many extra tracks (beyond the first) the song's sections carry for a given instrument —
      // the ceiling every extra-track export loop below runs to
      const nExtra = type => Math.max(0, trackLayerCount(type, GROOVE),
        ...sections.insts.map(x => trackLayerCount(type, x.key))) - 1;
      const drumsExtra = Array.from({ length: nExtra("drums") }, (_, i) => drumForBarL(i + 1, null))
        .filter(fn => bars.some((_, bi) => fn(bi)));
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
          gain: ly.vol == null ? 1 : ly.vol, pan: modOf(ly, "pan"), voice: ly.instr || melInstr };
      });
      // What a DAW needs to lay the file out: the meter, the key, and where each section starts.
      // MAJOR_SIG is indexed by the *relative major* of the current mode, which is what a key
      // signature actually spells — so a Dorian sketch gets the right accidentals, not the tonic's.
      const rel = (tonic + MODES[effMode].rel) % 12;
      const mtr = METER_BY_ID[curMeter] || METERS[0];
      /* The chord track's rhythm, bar by bar: a pass's own chord grid where one is written,
         null (a plain whole-bar chord) elsewhere — the file plays what the song plays. */
      const chordRhythm = bars.map((b, bi) => {
        const key = b.inst != null ? b.inst : "L1";
        let own = secChordBeat[key], loop = false;
        if (!own || !own.length) {                      // a pass with nothing of its own follows the groove sketch
          const g = secChordBeat[GROOVE];
          if (g && g.length) { own = g; loop = true; } else return null;
        }
        return own[b.inst != null && !loop ? Math.min(b.mb, own.length - 1)
          : (b.inst != null ? b.mb : bi) % own.length] || null;
      });
      const meta = {
        chordRhythm: chordRhythm.some(Boolean) ? chordRhythm : null,
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
      /* The three tracks, resolved to plain notes (times in beats) shared by the MIDI writer and
         the Live Set. Each bar resolves exactly as playback resolves it — the pass's own grid,
         then the section menus, then the template/global state — with the loop sketch reading as
         L1, so the exported file falls silent and moves precisely where the song does. */
      // extra tracks (li > 0) resolve against their own `#N`-suffixed key, exactly like an extra
      // melody layer — see the note beside TRACKS_FX
      const exSrc = (b, bi, srcFn, li = 0) => {
        const suf = li ? LSEP + li : "";
        const dk = b.inst != null ? { key: b.inst + suf, base: b.base + suf } : { key: "L1" + suf, base: "L1" + suf };
        const src = srcFn(dk);
        if (!src) return null;
        // a groove-sketch source is a loop: it cycles round a longer section, never holds its last bar
        if (src.beat) return { bar: src.beat[b.inst != null && !src.loop
          ? Math.min(b.mb, src.beat.length - 1) : (b.inst != null ? b.mb : bi) % src.beat.length] || null };
        return src;
      };
      const bassNotesFor = li => {
        const notes = [];
        bars.forEach((b, bi) => {
          const src = exSrc(b, bi, bassSrcOf, li);
          if (!src) return;
          const root = 36 + b.chord.root;
          if (src.pat && !(BASS[src.pat] || {}).pattern) {
            // "follow": the strum pattern's hits, skipping upstrokes the way the voice does
            const pat = rhythm.pattern, steps = pat.length, stepB = barBeats / steps;
            const hit = s2 => pat[s2] !== "-" && pat[s2] !== "U";
            for (let s2 = 0; s2 < steps; s2++) {
              if (!hit(s2)) continue;
              let gap = 1;
              while (gap < steps && !hit((s2 + gap) % steps)) gap++;
              notes.push({ t: bi * barBeats + s2 * stepB, dur: gap * stepB * 0.92,
                note: root, vel: 96 * accentAt(s2, steps / barBeats) });
            }
          } else {
            const pat = src.bar || (BASS[src.pat] || {}).pattern;
            if (!pat || !pat.length) return;
            const steps = pat.length, stepB = barBeats / steps;
            for (let s2 = 0; s2 < steps; s2++) {
              const tok = pat[s2];
              if (!tok || tok === "-") continue;
              let gap = 1;
              while (gap < steps && (!pat[(s2 + gap) % steps] || pat[(s2 + gap) % steps] === "-")) gap++;
              notes.push({ t: bi * barBeats + s2 * stepB, dur: gap * stepB * 0.92,
                note: root + (BASS_IV[tok] || 0), vel: 96 * accentAt(s2, steps / barBeats) });
            }
          }
        });
        return notes;
      };
      const bassNotes = bassNotesFor(0);
      // nearest GM bass program to each synth voice, so a DAW opens the track already low. Every
      // bass track shares the song's one voice — an extra bassline differs in pattern, not timbre,
      // the same simplification perc and pad's extras make.
      const bassProgram = { sub: 38, saw: 38, square: 38, pluck: 34, acid: 38, reese: 39 }[bassVoice] || 38;
      const bassTrack = bassNotes.length ? { notes: bassNotes, program: bassProgram } : null;
      const bassExtra = Array.from({ length: nExtra("bass") }, (_, i) => bassNotesFor(i + 1))
        .map(notes => notes.length ? { notes, program: bassProgram } : null).filter(Boolean);
      const percForBarL = li => bi => {
        const src = exSrc(bars[bi], bi, percSrcOf, li);
        if (!src) return null;
        return src.bar || ((PERCS[src.pat] || DRUMS[src.pat] || {}).pattern) || null;
      };
      const percForBar = percForBarL(0);
      const anyPerc = bars.some((_, bi) => percForBar(bi));
      const percExtra = Array.from({ length: nExtra("perc") }, (_, i) => percForBarL(i + 1))
        .filter(fn => bars.some((_, bi) => fn(bi)));
      // the pad: the chord's upper voicing held a bar at a time, an octave up, no low root
      const padNotesFor = li => {
        const notes = []; let voiceUsed = "";
        const suf = li ? LSEP + li : "";
        bars.forEach((b, bi) => {
          const dk = b.inst != null ? { key: b.inst + suf, base: b.base + suf } : { key: "L1" + suf, base: "L1" + suf };
          // a written pad rhythm (the pass's own or the groove's) plays even with no voice picked,
          // so it has to export too — as the held voicing, with the same fallback voice playback uses
          const v = padVoiceOf(dk) || (padBeatOf(dk) ? (pad || "strings") : "");
          if (!v) return;
          voiceUsed = voiceUsed || v;
          for (const x of chordIvs(b.chord.quality))
            notes.push({ t: bi * barBeats, dur: barBeats * 0.98, note: 60 + b.chord.root + x, vel: 66 });
        });
        return { notes, voiceUsed };
      };
      const pad0 = padNotesFor(0);
      const padTrack = pad0.notes.length ? { notes: pad0.notes, program: programOf(pad0.voiceUsed || "strings", 89) } : null;
      const padExtra = Array.from({ length: nExtra("pad") }, (_, i) => padNotesFor(i + 1))
        .map(r => r.notes.length ? { notes: r.notes, program: programOf(r.voiceUsed || "strings", 89) } : null)
        .filter(Boolean);
      return { bars, parts, drumForBar, meta, anyDrum, nUsed, partOf, bassTrack, percForBar, anyPerc, padTrack,
        drumsExtra, percExtra, bassExtra, padExtra };
  };
  const exportMidi = () => {
    try {
      const { bars, parts, drumForBar, meta, anyDrum, nUsed, bassTrack, percForBar, anyPerc, padTrack,
        drumsExtra, percExtra, bassExtra, padExtra } = midiParts();
      download(midiBytes(effBpm, barBeats, bars, drumForBar, parts, kit, meloSub, programOf(instr),
        { ...meta, bass: bassTrack, perc: anyPerc ? percForBar : null, pad: padTrack,
          drumsExtra, percExtra, bassExtra, padExtra }),
        "audio/midi", "mid");
      const nExtraTracks = drumsExtra.length + percExtra.length + bassExtra.length + padExtra.length;
      setIoNote("MIDI exported — chords" + (anyDrum ? " + drums" : "") + (anyPerc ? " + perc" : "")
        + (bassTrack ? " + bass" : "") + (padTrack ? " + pad" : "")
        + (nExtraTracks ? ` + ${nExtraTracks} extra track${nExtraTracks === 1 ? "" : "s"}` : "")
        + (nUsed ? ` + ${nUsed} melody part${nUsed === 1 ? "" : "s"}` : "") + " at " + effBpm + " bpm.");
    } catch (e) { setIoNote("Export failed in this viewer — try on desktop."); }
  };

  /* ---- Ableton Live Set ----
     The same notes the MIDI export writes, in the form Live actually wants: named, coloured tracks
     laid out as an arrangement, at the right tempo, with every section a locator on the ruler.
     A MIDI file gives Live bare clips and nothing around them; this gives it the song.

     What it cannot give is the sound. Every instrument here is a Web Audio graph, and there is no
     way to hand Live one — so the tracks arrive empty of devices for you to drop your own on. That
     is a limit of what the two programs share, not of the file format: the MIDI export has exactly
     the same one. The stem bounce remains the reference for what it should sound like. */
  const alsSpec = () => {
    const { bars, parts, drumForBar, meta, bassTrack, percForBar, anyPerc, padTrack, partOf,
      drumsExtra, percExtra, bassExtra, padExtra } = midiParts();
    const B = barBeats, tracks = [];
    /* Each track's info text (Live's Annotation, shown in its info pane): the settings that shaped
       the sound here, in plain words, so recreating a part on a real instrument is reading the
       track's own tooltip in Live rather than cross-referencing a JSON file. Generated from the
       same MOD_GROUPS table the controls and the scheduler read, so a new modulation appears in
       the info text with no edit here. Newlines don't survive an XML attribute, so it is one line
       of ·-separated clauses. */
    const modLabel = md => {
      const opts = typeof md.opts === "string"
        ? ({ ARPS: ARPS.map(a => [a.id, a.name]), GATES: GATES.map(g => [g.id, g.name]),
             ARP_RATES, LFO_RATES, ECHO_TIMES })[md.opts]
        : md.opts;
      return v => {
        if (md.kind !== "sel") return v + (md.unit || "");
        const hit = (opts || []).find(o => String(o[0]) === String(v));
        return hit ? hit[1] : String(v);
      };
    };
    const partInfo = ly => {
      if (!ly) return "";
      const bits = ["was " + (ly.instr || melInstr)];
      if (ly.oct) bits.push("register " + (ly.oct > 0 ? "+" : "") + ly.oct + " oct");
      if (ly.vol != null && Math.round(ly.vol * 100) !== 100) bits.push("level " + Math.round(ly.vol * 100) + "%");
      for (const g of MOD_GROUPS) for (const md of g.mods) {
        const v = modOf(ly, md.k);
        if (v == null || v === md.dflt) continue;
        bits.push(md.name + " " + modLabel(md)(v));
      }
      return bits.join(" · ");
    };
    // chords: the same voicing and per-pass rhythm the MIDI writer uses
    const chordNotes = [];
    const CVEL = { ">": 96, "D": 78, "U": 58 };
    bars.forEach((b, bi) => {
      const notes = [36 + b.chord.root - 12, ...chordIvs(b.chord.quality).map(x => 60 + b.chord.root + x)];
      const rh = meta.chordRhythm ? meta.chordRhythm[bi] : null;
      if (!rh || !rh.length) {
        for (const n of notes) chordNotes.push({ t: bi * B, dur: B, note: n, vel: 78 });
        return;
      }
      const steps = rh.length, stepB = B / steps;
      for (let s2 = 0; s2 < steps; s2++) {
        const tok = rh[s2];
        if (!tok || tok === "-") continue;
        let gap = 1;
        while (s2 + gap < steps && (!rh[s2 + gap] || rh[s2 + gap] === "-")) gap++;
        for (const n of (tok === "U" ? notes.slice(1) : notes))
          chordNotes.push({ t: bi * B + s2 * stepB, dur: Math.min(gap * stepB * 0.92, B - s2 * stepB),
            note: n, vel: CVEL[tok] || 78 });
      }
    });
    if (chordNotes.length) tracks.push({ name: "Chords", color: ALS_COLORS.chords, vol: 0.85, instrument: true,
      notes: chordNotes, end: bars.length * B,
      note: "was " + instr + " · " + colour + " voicings · strum: " + (rhythm.name || patId) });
    // drums: each bar's own pattern, at whatever step count that pattern has
    const drumNotes = [];
    bars.forEach((_, bi) => {
      const pat = drumForBar(bi);
      if (!pat || !pat.length) return;
      const steps = pat.length, stepB = B / steps;
      for (let s = 0; s < steps; s++) {
        const acc = accentAt(s, steps / B);
        for (const ch of (pat[s] || "")) drumNotes.push({ t: bi * B + s * stepB,
          dur: Math.min(0.25, stepB * 0.5), note: DRUM_MIDI[ch] || 42,
          vel: ([42, 46, 51, 37].includes(DRUM_MIDI[ch]) ? 62 : 92) * acc });
      }
    });
    if (drumNotes.length) tracks.push({ name: "Drums", color: ALS_COLORS.drums, vol: 0.85,
      notes: drumNotes, end: bars.length * B, note: kit + " kit — drop a Drum Rack on this" });
    // the percussion layer: bar-by-bar like the drums, on the same percussion note map
    if (anyPerc) {
      const percNotes = [];
      bars.forEach((_, bi) => {
        const pat = percForBar(bi);
        if (!pat || !pat.length) return;
        const steps = pat.length, stepB = B / steps;
        for (let s = 0; s < steps; s++) {
          const acc = accentAt(s, steps / B);
          for (const ch of (pat[s] || "")) percNotes.push({ t: bi * B + s * stepB,
            dur: Math.min(0.25, stepB * 0.5), note: PERC_MIDI[ch] || DRUM_MIDI[ch] || 70,
            vel: 68 * acc });
        }
      });
      if (percNotes.length) tracks.push({ name: "Percussion", color: ALS_COLORS.perc, vol: 0.8,
        notes: percNotes, end: bars.length * B, note: "perc layer — same Drum Rack as the drums" });
    }
    // the bass track: the same resolved notes the MIDI writer gets, already in beats
    if (bassTrack) tracks.push({ name: "Bass", color: ALS_COLORS.bass, vol: 0.85, instrument: true,
      notes: bassTrack.notes, end: bars.length * B,
      note: "was " + bassVoice + (bass && BASS[bass] ? " · pattern: " + BASS[bass].name : "")
        + " — drop a bass synth on this" });
    // the pad: the held upper voicings
    if (padTrack) tracks.push({ name: "Pad", color: ALS_COLORS.pad, vol: 0.8, instrument: true,
      notes: padTrack.notes, end: bars.length * B, note: "drop a pad synth on this" });
    /* Extra tracks (#1, #2, …) — one more Live track per extra drums/perc/bass/pad track the song
       carries, named the way the MIDI writer names them, so a set opened beside an exported MIDI
       file reads as the same arrangement. */
    const notesFromKit = (fn, noteMap, velOf) => {
      const notes = [];
      bars.forEach((_, bi) => {
        const pat = fn(bi);
        if (!pat || !pat.length) return;
        const steps = pat.length, stepB = B / steps;
        for (let s = 0; s < steps; s++) {
          const acc = accentAt(s, steps / B);
          for (const ch of (pat[s] || "")) { const n = noteMap(ch);
            notes.push({ t: bi * B + s * stepB, dur: Math.min(0.25, stepB * 0.5), note: n, vel: velOf(n) * acc }); }
        }
      });
      return notes;
    };
    const extraName = (base, i) => base + " " + (LAYER_NAMES[i + 1] || (i + 2));
    drumsExtra.forEach((fn, i) => {
      const notes = notesFromKit(fn, ch => DRUM_MIDI[ch] || 42, n => ([42, 46, 51, 37].includes(n) ? 62 : 92));
      if (notes.length) tracks.push({ name: extraName("Drums", i), color: ALS_COLORS.drums, vol: 0.85,
        notes, end: bars.length * B, note: kit + " kit — drop a Drum Rack on this" });
    });
    percExtra.forEach((fn, i) => {
      const notes = notesFromKit(fn, ch => PERC_MIDI[ch] || DRUM_MIDI[ch] || 70, () => 68);
      if (notes.length) tracks.push({ name: extraName("Percussion", i), color: ALS_COLORS.perc, vol: 0.8,
        notes, end: bars.length * B, note: "perc layer — same Drum Rack as the drums" });
    });
    bassExtra.forEach((spec, i) => {
      if (spec && spec.notes.length) tracks.push({ name: extraName("Bass", i), color: ALS_COLORS.bass,
        vol: 0.85, instrument: true, notes: spec.notes, end: bars.length * B,
        note: "was " + bassVoice + " — drop a bass synth on this" });
    });
    padExtra.forEach((spec, i) => {
      if (spec && spec.notes.length) tracks.push({ name: extraName("Pad", i), color: ALS_COLORS.pad,
        vol: 0.8, instrument: true, notes: spec.notes, end: bars.length * B, note: "drop a pad synth on this" });
    });
    // melody parts: grid columns merged into held notes, the same way the MIDI writer merges them
    (parts || []).forEach((part, p) => {
      if (!part || !part.cols) return;
      const cols = part.cols, notes = [], colB = 1 / meloSub;
      const at = (i, n) => (cols[i] || []).includes(n);
      for (let i = 0; i < cols.length; i++) for (const n of (cols[i] || [])) {
        if (i > 0 && at(i - 1, n)) continue;                    // a held note, already counted
        let run = 1;
        while (i + run < cols.length && at(i + run, n)) run++;
        // the part's level is on the fader below, so it must not also be in the velocity — a
        // quiet part would arrive twice as quiet as it sounds here
        notes.push({ t: i * colB, dur: run * colB, note: n,
          vel: 96 * accentAt(i % (B * meloSub), meloSub) });
      }
      if (notes.length) tracks.push({ name: "Part " + (LAYER_NAMES[p] || p + 1),
        // the part's own level and pan ride the mixer rather than the notes: Live opens balanced
        // and spread the way the sketch sounds, and the velocities stay what was written
        color: ALS_COLORS.part, vol: 0.8 * (part.gain == null ? 1 : part.gain), pan: part.pan || 0,
        instrument: true,
        notes, end: bars.length * B,
        note: partInfo(partOf(p)) || ("was " + (part.voice || melInstr)) });
    });
    const M = METER_BY_ID[curMeter] || METERS[0];
    /* The drawn Level lane rides out as master-volume automation — the one master lane Live can
       take without a device to point at. The filter lanes describe a device the empty tracks don't
       have; they reach the DAW through the settings snapshot instead. */
    const lvl = auto.key === planKey && auto.level && auto.level.length
      ? auto.level.map(p2 => ({ beat: p2.bar * B, v: p2.v })) : null;
    return { bpm: effBpm, tsNum: M.num, tsDen: M.den, tracks,
      locators: (meta.markers || []).map(mk => ({ beat: mk.bar * B, name: mk.name })),
      mainAuto: lvl ? { level: lvl } : null,
      name: sketchName.trim() || "Progression Wheel" };
  };
  const exportAls = async () => {
    try {
      const bytes = await alsBytes(alsSpec());
      if (!bytes) { setIoNote("This browser cannot gzip — use Export MIDI instead."); return; }
      download(bytes, "application/gzip", "als");
      const n = alsSpec().tracks.length;
      setIoNote(`Live Set exported — ${n} track${n === 1 ? "" : "s"} at ${effBpm} bpm, sections as locators. `
        + "The tracks arrive without instruments: drop your own on each, and use the stems as the reference.");
    } catch (e) { setIoNote("Live Set export failed in this viewer — try on desktop."); }
  };

  /* ---- the Live project ----
     The .als alone arrives silent — the arrangement without the sound. This export is the whole
     handoff in one zip, laid out the way a Live project is on disk: the set at the top, the stems
     in Samples/Imported beside it, and the settings snapshot for the knobs no file format can
     carry. Unzip, open the set, select everything in Samples/Imported and drag it onto the
     arrangement at 1.1.1 — Live lands each wav on its own audio track, aligned, and the project
     plays the sketch while the MIDI tracks wait for real instruments. The stems are pre-master
     and sum to the mix, which is exactly what a producer wants under their own chain.

     What is deliberately NOT here: audio tracks written into the .als itself. A Live Set is not a
     format to infer from the outside — the app's own exporter history proves it (see als.js) — and
     the template this one is built from carries no audio track to clone. The drag is one gesture;
     a set that crashes Live is a lost user. */
  const exportLiveProject = async () => {
    if (stemming || rendering || claudeExporting || projExporting) return;
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) { setIoNote("This browser cannot render audio — ↓ Live Set still works."); return; }
    setProjExporting(true);
    try {
      const bytes = await alsBytes(alsSpec());
      if (!bytes) { setIoNote("This browser cannot gzip — use Export MIDI instead."); return; }
      const stems = stemList();
      const { files } = stems.length ? await renderStemFiles(stems) : { files: [] };
      const base = safeName(sketchName.trim() || "progression-wheel");
      const dir = base + " Project";
      const entries = [{ name: `${dir}/${base}.als`, bytes }];
      for (const f of files) entries.push({ name: `${dir}/Samples/Imported/${f.name}`, bytes: f.bytes });
      try {
        entries.push({ name: `${dir}/settings.json`,
          bytes: new TextEncoder().encode(JSON.stringify(getExportState(), null, 2)) });
      } catch (e) {}   // the project is still a project without the snapshot
      entries.push({ name: `${dir}/README.txt`, bytes: new TextEncoder().encode(
        `${base} — a Live project from the Progression Wheel\n\n`
        + `${base}.als — the arrangement: tempo, meter, named MIDI tracks with their settings in\n`
        + `  each track's info text, every section a locator, and the drawn Level lane as\n`
        + `  master-volume automation. The tracks arrive without instruments: the app's sounds\n`
        + `  are Web Audio graphs, which no file format can hand to Live.\n\n`
        + `Samples/Imported/ — the stems, pre-master, so they sum to the mix. Open the set,\n`
        + `  select all of them in this folder and drag onto the arrangement at 1.1.1: Live puts\n`
        + `  each on its own audio track and the project plays the sketch immediately. Rebuild\n`
        + `  each sound on its MIDI track, muting its stem as you go.\n\n`
        + `settings.json — every setting that shaped the render, in plain words, with each\n`
        + `  control's default and meaning.\n`) });
      const zip = makeZip(entries);
      const url = URL.createObjectURL(new Blob([zip], { type: "application/zip" }));
      const a = document.createElement("a");
      a.href = url; a.download = songFile("project.zip");
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setIoNote(`Live project exported — the set plus ${files.length} stem${files.length === 1 ? "" : "s"} in `
        + `Samples/Imported (${(zip.length / 1048576).toFixed(1)} MB). Unzip, open the .als, then drag the `
        + `Samples/Imported folder's files onto the arrangement at 1.1.1 and it plays the sketch.`);
    } catch (e) {
      setIoNote("Live project export failed in this browser — ↓ Live Set and ↓ Export stems still work separately.");
    } finally { setProjExporting(false); setRenderPct(null); }
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
      const { bars, parts, drumForBar, meta, anyDrum, partOf, bassTrack, percForBar, anyPerc, padTrack,
        drumsExtra, percExtra, bassExtra, padExtra } = midiParts();
      const files = [];
      const add = (label, bytes) => files.push({ name: `${String(files.length + 1).padStart(2, "0")}-${safeName(label)}.mid`, bytes });
      add("chords-" + gmKey(instr),
        midiBytes(effBpm, barBeats, bars, () => null, [], kit, meloSub, programOf(instr), meta));
      if (anyDrum || drumsExtra.length)
        add("drums-" + kit,
          midiBytes(effBpm, barBeats, bars, drumForBar, [], kit, meloSub, null, { ...meta, skipChords: true, drumsExtra }));
      if (anyPerc || percExtra.length)
        add("perc",
          midiBytes(effBpm, barBeats, bars, () => null, [], kit, meloSub, null,
            { ...meta, skipChords: true, perc: percForBar, percExtra }));
      if (bassTrack || bassExtra.length)
        add("bass-" + bassVoice,
          midiBytes(effBpm, barBeats, bars, () => null, [], kit, meloSub, null,
            { ...meta, skipChords: true, bass: bassTrack, bassExtra }));
      if (padTrack || padExtra.length)
        add("pad",
          midiBytes(effBpm, barBeats, bars, () => null, [], kit, meloSub, null,
            { ...meta, skipChords: true, pad: padTrack, padExtra }));
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
    const sec = wantKey === GROOVE ? grooveInst
      : (sections.insts.find(s => s.key === wantKey) || sections.insts[0]);
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
    kit, pump, bass, bassVoice, secBass, perc, secPerc, pad, secPad,
    secBassPat, secPercPat, secPadVoice, secPartOut, secTrackLayers, secBassBeat, secPercBeat, secPadBeat, secChordBeat, trackFx, percKit, fxRack, secFx,
    secMove, secTrans, secBeat, secNar, delayId, grid: gridSt.key === progId ? gridSt.val : "", bpm: effBpm, selStruct, contrast,
    sketchArr,
    edits: ovMap, inserts: insList, quals: qmap, removed: remList,
    order: order.key === editKey ? order.list : null,
    melos: melos.progId === progId ? melos : null,
    session: sessionTracks,
  });
  /* ---- undo / redo ----
     One snapshot of the song document per change, taken from a debounced effect rather than at
     every call site, so no edit path can forget to record itself. Restoring sets a flag the
     recorder checks, so replaying history doesn't itself become history. */
  const UNDO_DEPTH = 60;
  const docJson = useMemo(() => {
    try { return JSON.stringify(songDoc("")); } catch (e) { return null; }
  }, [progId, tonic, genre, emotion, mode, colour, patId, drum, secDrum, secQuiet, custom, auto, nChords, instr, melInstr,
      kit, pump, bass, bassVoice, secBass, perc, secPerc, pad, secPad,
      secBassPat, secPercPat, secPadVoice, secPartOut, secTrackLayers, secBassBeat, secPercBeat, secPadBeat, secChordBeat, trackFx, percKit, fxRack, secFx,
      secMove, secTrans, secBeat, secNar, delayId, gridSt, effBpm, selStruct, contrast, sketchArr, ovMap, insList, qmap, remList, order, melos, sessionTracks]);
  const lastDocRef = useRef(null);
  useEffect(() => {
    if (docJson == null) return;
    if (lastDocRef.current === null) { lastDocRef.current = docJson; return; }   // first render is the baseline
    /* A paint drag is one edit, not one per cell. While the pointer is down the recorder holds its
       baseline and writes nothing, so releasing it records the whole stroke as a single step —
       otherwise dragging across a bar buries everything you did before it under sixty-four
       snapshots and undo stops being able to reach any of it. */
    if (painting) return;
    if (docJson === lastDocRef.current) return;
    const prev = lastDocRef.current;
    lastDocRef.current = docJson;
    if (restoringRef.current) { restoringRef.current = false; return; }
    setPast(p => [...p.slice(-(UNDO_DEPTH - 1)), prev]);
    setFuture([]);                                     // a fresh edit ends the redo branch
  }, [docJson, painting]);
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
      if (e.code === "Space" || e.key === " ") { e.preventDefault(); playTransport(); return; }
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

  const storeSketches = async list => {
    if (hasStore) { await window.storage.set("pw-sketches", JSON.stringify(list)); return true; }
    if (hasLocal) { window.localStorage.setItem("pw-sketches", JSON.stringify(list)); return true; }
    return false;
  };
  const saveSketch = async () => {
    const name = sketchName.trim() || keyLabel + " · " + prog.label;
    const s = songDoc(name);
    const list = [...(sketches || []).filter(x => x.name !== name), s];
    setSketches(list); setSketchName("");
    try {
      setIoNote((await storeSketches(list)) ? "Saved “" + name + "”." : "Saved for this session only.");
    } catch (e) { setIoNote("Saved for this session only."); }
  };

  /* ---- the morning review ----
     Catchiness is judged cold, not in the session where the tune was written — everything sounds
     like a hook at midnight. The review plays the saved sketches back one by one, coldest first
     (never-reviewed sketches, then the ones judged longest ago), with a verdict on each: keep,
     rework, kill, or no verdict at all. The song you were working on is stashed first and put back
     exactly when the review ends, so the queue costs nothing to open. Verdicts and their timestamps
     ride on the saved sketches; a kill deletes, with one step of undo while the review is open. */
  const [review, setReview] = useState(null);   // { stash, order:[names], idx, lastKill }
  const startReview = () => {
    const list = sketches || [];
    if (!list.length) return;
    const order = [...list.keys()].sort((a, b) =>
      ((list[a].review || {}).at || 0) - ((list[b].review || {}).at || 0) || a - b);
    setReview({ stash: docJson, order: order.map(i => list[i].name), idx: 0, lastKill: null });
    loadSketch(list[order[0]]);
  };
  const reviewNext = verdict => {
    if (!review) return;
    const name = review.order[review.idx];
    let list = sketches || [], lastKill = review.lastKill;
    const cur = list.find(x => x.name === name);
    if (cur && verdict === "keep") {
      list = list.map(x => (x === cur ? { ...x, review: { v: "keep", at: Date.now() } } : x));
      setSketches(list); storeSketches(list).catch(() => {});
    }
    if (cur && verdict === "kill") {
      lastKill = { sketch: cur };
      list = list.filter(x => x !== cur);
      setSketches(list); storeSketches(list).catch(() => {});
    }
    let idx = review.idx + 1;
    while (idx < review.order.length && !list.some(x => x.name === review.order[idx])) idx++;
    if (idx >= review.order.length) { endReview(true); return; }
    setReview({ ...review, idx, lastKill });
    const s = list.find(x => x.name === review.order[idx]);
    if (s) loadSketch(s);
  };
  // this one earned another session — leave it loaded and end the review here
  const reviewRework = () => {
    if (!review) return;
    const name = review.order[review.idx];
    setSketchName(name);
    setReview(null);
    setIoNote(`Reworking “${name}” — it stays loaded, the rest of the queue can wait.`);
  };
  const undoKill = () => {
    if (!review || !review.lastKill) return;
    const list = [...(sketches || []), review.lastKill.sketch];
    setSketches(list); storeSketches(list).catch(() => {});
    setReview({ ...review, lastKill: null });
  };
  const endReview = finished => {
    stopMetro();
    if (review && review.stash) restoreDoc(review.stash);
    setIoNote(finished ? "Review done — every sketch heard cold, and your song is back."
      : "Review closed — back to what you were doing.");
    setReview(null);
  };
  // each sketch in the queue starts playing by itself — the review is for ears, not eyes
  useEffect(() => {
    if (!review) return;
    stopMetro();
    const t = setTimeout(() => startMetro(0), 350);
    return () => clearTimeout(t);
  }, [review ? review.idx : -1]);   // eslint-disable-line react-hooks/exhaustive-deps
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
    setSecMove(s.secMove || {}); setSecTrans(s.secTrans || {}); setSecBeat(songBeats(s));
    setSecNar(s.secNar || {});
    setGridSt({ key:s.progId, val:s.grid || "" });                                 // absent in sketches saved before the grid was its own choice
    setDelaySt({ key:s.progId, val:s.delayId || "off" });                          // absent in sketches saved before moves existed
    setPatSel({ key:s.progId, id:s.patId }); setBpmSt({ key:s.progId, val:s.bpm });
    setNChordsSt({ key:s.progId, val:s.nChords || 0 });
    // older sketches predate the kit/pump fields — fall back to the pre-dance defaults so they
    // reload sounding exactly as they were saved
    setDrumSt({ key:s.progId, val:s.drum || "off" });
    setKitSt({ key:s.progId, val:s.kit || "acoustic" });
    setPumpSt({ key:s.progId, val:s.pump || "off" });
    // sketches saved before the bass track existed load with it off — the chords still carry the root
    setBassSt({ key:s.progId, val:s.bass || "" });
    setBassVoiceSt({ key:s.progId, val:s.bassVoice || "" });
    setSecBass(s.secBass || {});
    // …and likewise the percussion layer and the pad, absent in older sketches
    setPercSt({ key:s.progId, val:s.perc || "" }); setSecPerc(s.secPerc || {});
    setPadSt({ key:s.progId, val:s.pad || "" }); setSecPad(s.secPad || {});
    // the per-section choices and written grids the tracks are authored with now
    setSecBassPat(s.secBassPat || {}); setSecPercPat(s.secPercPat || {}); setSecPadVoice(s.secPadVoice || {});
    setSecPartOut(s.secPartOut || {}); setSecTrackLayers(s.secTrackLayers || {}); setTrackTab({});
    setSketchArr(Array.isArray(s.sketchArr) ? s.sketchArr : []); setSketchSel(0);
    setSecBassBeat(unpackBeats(s.secBassBeat)); setSecPercBeat(unpackBeats(s.secPercBeat));
    setSecPadBeat(unpackBeats(s.secPadBeat)); setSecChordBeat(unpackBeats(s.secChordBeat));
    setOpenBass({}); setOpenPercs({}); setOpenPads({}); setOpenChordGrids({});
    setTrackFx(s.trackFx || {});
    setFxRack(s.fxRack || {});
    setSecFx(s.secFx || {}); setOpenSecFx({});
    setPercKitSt({ key:s.progId, val:s.percKit || "" });
    setSelStruct(s.selStruct || ""); setContrast(s.contrast || { id:"", sec:"C" });
    const eKey = s.progId + ":" + s.tonic;
    setEdits({ key:eKey, map:s.edits || {} }); setInserts({ key:eKey, list:s.inserts || [] });
    setQuals({ key:eKey, map:s.quals || {} }); setRemoved({ key:eKey, list:s.removed || [] });
    setOrder(s.order ? { key:eKey, list:s.order } : { key:"", list:null }); setPillSel([]);
    if (s.melInstr) setMelInstr(s.melInstr);
    // melodies were session-only before this; a sketch without them just loads an empty grid
    setMelos(s.melos ? songMelos(s) : { progId:"", secs:{} });
    setSessionTracks(Array.isArray(s.session) ? s.session : []);
    setMelSel({ key:"", layer:0, notes:{} }); setNarUndo(null); setVaryIn({});
    setIoNote("Loaded “" + s.name + "”.");
  };

  /* ---- start from scratch ----
     Every choice back to the app's own defaults — key, chords, edits, drums, bass, perc, pad,
     melodies, structure, automation, effects, the lot — so a new song starts on a genuinely blank
     page instead of on the bones of the last one. Saved sketches are untouched (they live in
     storage, not in this state), and the wipe lands in the undo history like any other edit, so
     ⌘Z puts the whole song back. */
  const startFresh = () => {
    if (typeof window !== "undefined" && !window.confirm(
      "Start completely from scratch? The current song is cleared — saved sketches are kept, and ⌘Z undoes this."))
      return;
    stopMetro();
    /* A recording in progress is discarded, not transcribed — stopSecRec would write the take
       onto a section grid in the same breath as the wipe. Same teardown the unmount cleanup does. */
    if (recRef.current) { const r = recRef.current;
      try { clearInterval(r.monitor); r.node.disconnect(); r.src.disconnect();
        r.stream.getTracks().forEach(t => t.stop()); r.ctx.close(); } catch (e) {}
      recRef.current = null; }
    setRecSec(null); setRecLevel(0); setRecHz(null);
    setDuel(null);
    // the song itself: progression, key, colour and every chord-level edit
    setForce(null); setTonic(0); setGenre("Pop"); setEmotion(null); setMode(null); setColour("triads");
    setEdits({ key:"", map:{} }); setInserts({ key:"", list:[] }); setQuals({ key:"", map:{} });
    setRemoved({ key:"", list:[] }); setOrder({ key:"", list:null }); setPillSel([]); setSel(null);
    setReorder(false); setAdding(false); setRemoving(false); setFingerIdx(null); setSelSong("");
    // sound: instruments, rhythm, tempo, feel and the whole rhythm section
    setInstr("acoustic_guitar_steel"); setMelInstr("flute");
    setPatSel({ key:"", id:"" }); setBpmSt({ key:"", val:0 }); setNChordsSt({ key:"", val:0 });
    setGridSt({ key:"", val:"" }); setDelaySt({ key:"", val:"" }); setSwingSt({ key:"", val:0 }); setHumanise(0);
    setDrumSt({ key:"", val:"" }); setKitSt({ key:"", val:"" }); setPumpSt({ key:"", val:"" });
    setBassSt({ key:"", val:"" }); setBassVoiceSt({ key:"", val:"" }); setSecBass({});
    setPercSt({ key:"", val:"" }); setSecPerc({}); setPercKitSt({ key:"", val:"" });
    setPadSt({ key:"", val:"" }); setSecPad({}); setTrackFx({}); setFxRack({});
    // structure, arrangement and everything written onto the sections
    setSelStruct(""); setContrast({ id:"", sec:"C" }); setCustom({ key:"", plan:null });
    setAuto({ key:"", filter:null, level:null }); setSketchArr([]); setSketchSel(0);
    setSecDrum({}); setSecQuiet({}); setSecMove({}); setSecTrans({}); setSecBeat({});
    setSecBassPat({}); setSecBassBeat({}); setSecPercPat({}); setSecPercBeat({});
    setSecPadVoice({}); setSecPadBeat({}); setSecChordBeat({}); setSecPartOut({}); setSecFx({}); setOpenSecFx({});
    setSecTrackLayers({}); setTrackTab({});
    // melodies, the narrative dials, and the per-section writing state that pointed at them
    setMelos({ progId:"", secs:{} }); setSecNar({}); setNarSel({ key:"", id:"" }); setNarUndo(null);
    setVarySt({ key:"", val:1 }); setNarSyncSt({ key:"", val:0 }); setNarInSt({ key:"", val:false });
    setVaryIn({}); setSyncIn({}); setLiftSt({}); setRiffSeed({});
    setMelSel({ key:"", layer:0, notes:{} }); setMelTab({}); setSugSel({}); setRhySel({});
    setSecPart({}); setModTab({}); setImpSec(""); setAddMel(false); setLoopSec(null);
    // the page itself: grids closed, editors closed, name cleared
    setOpenSecs({}); setOpenBeats({}); setOpenPercs({}); setOpenBass({}); setOpenPads({});
    setOpenChordGrids({}); setOpenOpts({}); setOpenFx({}); setEditArr(false); setSelRow(0); setFocusRow(0);
    setSketchName("");
    setIoNote("Started from scratch — a blank page. ⌘Z brings the old song back.");
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

  /* ---- one section's whole editing surface ----
     Extracted from the Arrange tab's write-out so the Sketch tab can point the same card at
     the groove sketch: the grids, the part mixer and the track effects are the section's
     machinery, and a second implementation of them would immediately drift. `view.groove`
     hides what has no meaning off the song's timeline (play-from-here, seams, moves) and
     swaps the loop button for the groove's own. */
  /* ---- the melody workbench ----
     Write (draw / move / vary / syncopate), Suggest, Check and Duel, plus the note grid itself —
     extracted from sectionCard so the Session view's clip editor renders the exact same tools
     against a clip's own key: the same putLayer/tapMelo/duel machinery, not a second
     implementation (the same move that carved sectionCard itself out for the groove sketch).
     `d` carries key, cs (one chord per bar — a clip repeats the loop), nbars and startBar, plus
     optionally `launch`: how the duel loops a clip, since a clip is not on the song's timeline
     and toggleLoopSec has no bar window to loop. */
  const melodyWorkbench = (d, sec, secL) => {
    const tab = melTab[d.key] || "write";
    const pick = sugSel[d.key] || { pat: MELODY_PATTERNS[0].id, start: 0 };
    const curPat = MELODY_PATTERNS.find(p => p.id === pick.pat) || MELODY_PATTERNS[0];
    const rhy = rhySel[d.key] || "straight";
    const curRhy = RHYTHMS.find(r => r.id === rhy) || RHYTHMS[0];
    const cols = d.cs.length * meloBeats;
    return (<>
                    {/* Write/Suggest and Draw/Move were two button rows stacked, which is two rows
                        of chrome above a grid that is the actual work. One row, and the second
                        switch appears only in the mode that has it. */}
                    <div className="melmodebar">
                      <div className="seg">
                        <button className={tab === "write" ? "on" : ""}
                          onClick={() => setMelTab({ ...melTab, [d.key]: "write" })}>✎ Write</button>
                        <button className={tab === "suggest" ? "on" : ""}
                          onClick={() => setMelTab({ ...melTab, [d.key]: "suggest" })}>✨ Suggest</button>
                        <button className={tab === "check" ? "on" : ""}
                          title="The hook report card — this part's melody scored against the shapes that make tunes stick, each line with a one-tap fix"
                          onClick={() => setMelTab({ ...melTab, [d.key]: "check" })}>🩺 Check</button>
                        <button className={tab === "duel" ? "on" : ""}
                          title="The hook duel — breed rivals of this melody and audition them pairwise; the winner takes the grid"
                          onClick={() => setMelTab({ ...melTab, [d.key]: "duel" })}>⚔ Duel</button>
                      </div>
                      {tab === "write" && <div className="seg">
                          <button className={!melMove ? "on" : ""} title="Write notes. Hold the button down and drag to paint a run of them — press an empty cell to draw, a full one to rub out."
                            onClick={() => { setMelMove(false); setMelSel({ key:"", layer:0, notes:{} }); }}>✎ Draw</button>
                          <button className={melMove ? "on" : ""} title="Drag a box to select notes, then drag a selected one to move the group"
                            onClick={() => setMelMove(true)}>✋ Move</button>
                        </div>}
                        {/* Varying the repeats is about the whole melody rather than a selection, so it
                            sits with the mode switch and not among the note tools below. */}
                        {tab === "write" && (() => {
                          const vst = varyIn[varyKeyOf(d.key, secL)];
                          const lv = (vst && vst.level) || 0;
                          return (<>
                            <button className={"mini" + (lv ? " on" : "")} onClick={() => varyRepeats(d, secL)}
                              title={"Vary the repeats inside this section — the motif is found where it restates itself, "
                                + "the first statement is left alone, and every one after it gets a different landing note, "
                                + "an extra note, a phrase pushed early. Tap again for more; one past the top puts the "
                                + "melody back as you wrote it."}>
                              ✦ Vary repeats{lv ? " ×" + lv : ""}</button>
                            {lv > 0 && <button className="mini" onClick={() => resetVaryIn(d, secL)}
                              title="Put this melody back as it was before the first tap">↺</button>}
                            {vst && vst.note && <span className="rlbl" style={{ opacity:.75 }}>{vst.note}</span>}
                          </>);
                        })()}
                        {tab === "write" && (() => {
                          const sst = syncIn[varyKeyOf(d.key, secL)];
                          const lv = (sst && sst.level) || 0;
                          return (<>
                            <button className={"mini" + (lv ? " on" : "")} onClick={() => syncopateMel(d, secL)}
                              title={"Syncopate — push this part's on-beat notes half a beat early, held through the beat they "
                                + "left. The anticipation that makes a line lean forward. One tap pushes the backbeats, two "
                                + "pushes every beat, three puts it back."}>
                              ⇢ Syncopate{lv === 2 ? " ××" : lv ? " ×" : ""}</button>
                            {sst && sst.note && lv > 0 && <span className="rlbl" style={{ opacity:.75 }}>{sst.note}</span>}
                          </>);
                        })()}
                        {tab === "write" && melMove && (() => {
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

                    {/* The hook report card: this part's melody scored against the shapes that make
                        tunes stick, one line per property, each failing line with a one-tap fix. The
                        number is a shape check, not taste — but a 45 and an 85 differ in ways the
                        lines can name, which is what makes it worth printing. */}
                    {tab === "check" && (() => {
                      const bars = barsOf(sec, secL);
                      const any = bars && bars.some(b => b.some(c => c.length));
                      if (!any) return (
                        <div className="sugmel"><p className="arrnote">
                          Nothing on part <b>{LAYER_NAMES[secL]}</b>'s grid yet — write or suggest a
                          melody first, then check it here.</p></div>);
                      const u = { bars, nd: scaleSemis.length, sub: meloSub, chordDegs: chordDegsOf(d.cs) };
                      const rep = hookReport(u);
                      const inkOf = s => s >= 0.99 ? "#54B79D" : s >= 0.6 ? "#E8A33D" : "#E0687F";
                      return (
                        <div className="sugmel">
                          <div className="row" style={{ gap:10, alignItems:"baseline" }}>
                            <span style={{ fontSize:26, fontWeight:700, color: inkOf(rep.score / 100) }}>{rep.score}</span>
                            <span className="keytag">{rep.grade}</span>
                            <span className="rlbl" style={{ opacity:.6 }}>part {LAYER_NAMES[secL]} · the shapes that make tunes stick</span>
                          </div>
                          {rep.checks.map(c => (
                            <div key={c.id} className="row" title={c.tip}
                              style={{ gap:8, marginTop:6, alignItems:"center", flexWrap:"wrap" }}>
                              <span aria-hidden="true" style={{ width:8, height:8, borderRadius:99,
                                background: inkOf(c.score), flex:"0 0 auto" }} />
                              <b style={{ flex:"0 0 auto" }}>{c.name}</b>
                              <span className="rlbl" style={{ opacity:.8 }}>{c.detail}</span>
                              {c.fix && c.score < 0.99 &&
                                <button className="mini" onClick={() => putLayer(d.key, secL, c.fix(bars, u))}
                                  title={c.tip + " — one deterministic edit; undo puts it back"}>✎ {c.fixLabel}</button>}
                            </div>
                          ))}
                          <p className="arrnote" style={{ marginTop:8 }}>
                            A shape check, not taste: these are the properties the earworm studies keep
                            finding. A fix edits the grid once — listen, and ⌘Z if it lost the point.
                          </p>
                        </div>);
                    })()}

                    {/* The hook duel: the melody against a family of its own rivals, two at a time.
                        Volume and selection is how hooks actually get good. */}
                    {tab === "duel" && (() => {
                      const my = duel && duel.key === d.key && duel.L === secL ? duel : null;
                      const bars = barsOf(sec, secL);
                      const any = bars && bars.some(b => b.some(c => c.length));
                      if (!my) return (
                        <div className="sugmel">
                          <p className="arrnote">
                            Eight rivals are bred from the melody on the grid — same tune, small
                            mutations. Hear <b>A</b>, hear <b>B</b>, tap the winner; the loser's place
                            goes to the next rival, and when the pool runs out the champion breeds
                            fresh challengers. The section loops while you judge. Keep the champion,
                            or cancel and the melody comes back exactly as it was.
                          </p>
                          <div className="row" style={{ gap:6, marginTop:8 }}>
                            <button className="btn" disabled={!any} onClick={() => startDuel(d, sec, secL)}>⚔ Start the duel</button>
                            {!any && <span className="rlbl" style={{ opacity:.7 }}>write a melody on part {LAYER_NAMES[secL]} first</span>}
                          </div>
                        </div>);
                      return (
                        <div className="sugmel">
                          <div className="row" style={{ gap:6, alignItems:"center", flexWrap:"wrap" }}>
                            <button className={"btn" + (my.side === "A" ? " on" : "")} style={{ padding:"5px 11px" }}
                              onClick={() => duelHear(d, "A")}
                              title="Put the champion on the grid and loop this section">▶ A · {my.champLbl}</button>
                            <button className={"btn" + (my.side === "B" ? " on" : "")} style={{ padding:"5px 11px" }}
                              onClick={() => duelHear(d, "B")}
                              title="Put the challenger on the grid and loop this section">▶ B · rival {my.chalIdx + 1}</button>
                            <span className="keytag">duel {my.round + 1}</span>
                          </div>
                          <div className="row" style={{ gap:6, marginTop:7, alignItems:"center", flexWrap:"wrap" }}>
                            <span className="rlbl" style={{ opacity:.7 }}>who sticks?</span>
                            <button className="mini" onClick={() => duelPick(d, "A")}>A wins</button>
                            <button className="mini" onClick={() => duelPick(d, "B")}>B wins</button>
                            <span className="rlbl" style={{ opacity:.5 }}>·</span>
                            <button className="mini" onClick={() => endDuel(d, true)}
                              title="Keep the reigning champion on the grid and end the duel">✓ Keep champion</button>
                            <button className="mini" onClick={() => endDuel(d, false)}
                              title="End the duel and put the melody back exactly as it was">✕ Cancel</button>
                          </div>
                          {my.side == null && <p className="arrnote" style={{ marginTop:6 }}>
                            Hear both before judging — the grid below shows whichever played last.</p>}
                        </div>);
                    })()}

                    <div className={"mscroll" + (melMove ? " mvmode" : "")}
                      data-sync={d.key} onScroll={syncScroll}>
                      <div className="mline" style={{ gridTemplateColumns:`${GRID_GUT}px repeat(${cols}, minmax(${melCell}px,1fr))` }}>
                        <span />
                        {d.cs.map((c, b) => (
                          <span key={b} className="mbar" style={{ gridColumn:`span ${meloBeats}`,
                            background: FN_COLOR[c.func || "T"], color: FN_TEXT[c.func || "T"] }}>{c.name}</span>
                        ))}
                      </div>
                      {[...scaleSemis.keys()].reverse().map(deg => (
                        <div key={deg} className="mline" style={{ gridTemplateColumns:`${GRID_GUT}px repeat(${cols}, minmax(${melCell}px,1fr))` }}>
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
                              onClick={() => {
                                if (skipClickRef.current) { skipClickRef.current = false; return; }
                                if (!melMove) tapMelo(d.key, c, deg, secL);
                              }}
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
    </>);
  };
  const sectionCard = (d, di, view = {}) => {
            const who = view.groove ? "the groove" : d.key;
            // this section's own copy of a track's insert-fx rack, for trackFxRow's FX tab
            const secFxCtx = { key: d.key, word: view.groove ? "groove" : d.word.toLowerCase() };
            const sec = secMelos[d.key] || EMPTY_SEC;
            const cols = d.cs.length * meloBeats;
            const open = !!openSecs[d.key];
            const beatOpen = !!openBeats[d.key];
            const percOpen = !!openPercs[d.key];
            const bassOpen = !!openBass[d.key];
            const padGOpen = !!openPads[d.key];
            const chordGOpen = !!openChordGrids[d.key];
            const optsOpen = !!openOpts[d.key];
            const optsSet = [secDrum, secQuiet, secMove, secTrans, secNar, secBassPat, secPercPat, secPadVoice]
              .some(m2 => m2[d.key]);
            const has = secHasNotes(sec);
            const donor = !has && sections.insts.find(o => o.base === d.base && o.key !== d.key
              && secHasNotes(secMelos[o.key]));
            const now = playing && curInst === d.key;
            const acc = SEC_COL[d.base] || "#EDE7DA";
            /* On the Sketch tab every grid sits under one of these — a full-width collapsible
               bar naming what the grid holds. The bars ARE the surface: no per-grid buttons in
               the header row, and each track's pattern menu waits inside its own section. */
            const gridBar = (icon, name, isOpen, toggle, note, tip) => (
              <button className={"gridbar" + (isOpen ? " on" : "")} onClick={toggle} title={tip}>
                <span className="gridbarcaret">{isOpen ? "▾" : "▸"}</span>
                <span aria-hidden="true">{icon}</span>
                <span>{name}</span>
                {note ? <span className="gridbarnote">{note}</span> : null}
              </button>
            );
            /* A section's own copy of one bus's insert rack. Drums, Perc, Bass and Pad each get
               this as the FX tab inside their own trackFxRow (see the `secCtx` argument there) —
               nested with their Mix/Tone/Movement/Space settings rather than being a sibling of
               that tab strip. Lead has no such strip (melody parts have their own, different,
               per-layer settings UI), so its rack keeps this small standalone collapsible here,
               closed by default like every other sub-panel. Closed, it reads "song default" or
               "● own"; opened, a checkbox switches the section onto its own copy — seeded from
               whatever it currently inherits — and from there the two rows are `fxSlotRow`, the
               exact renderer trackFxRow's FX tab draws with, editable exactly the same way: a
               section can pick its own type here, not just its own amount, and hear it hold across
               the section boundary as playback crosses in and out (see `writeFxRack` in the
               per-beat block, and `makeFxMultiSlot` in audio.js). The one catch is a type nothing
               in the song asked for before the last Play/render started — that has no node chain
               built for it yet, so picking it live needs a restart to be heard, same as any other
               structural choice in this file. */
            const secFxPanel = (bus, name) => {
              const panelKey = d.key + "|" + bus;
              const isOpen = !!openSecFx[panelKey];
              const own = secFx[d.key] && secFx[d.key][bus];
              const song = fxRack[bus] || [];
              const namesOf = slots => (slots || [])
                .map(s => (s && s.type && s.type !== "off") ? (FX_TYPES.find(([id]) => id === s.type) || [, s.type])[1] : null)
                .filter(Boolean);
              const toggleOwn = checked => {
                if (checked) {
                  const seed = [song[0] || { type: "off" }, song[1] || { type: "off" }].map(s => ({ ...s }));
                  setSecFx({ ...secFx, [d.key]: { ...(secFx[d.key] || {}), [bus]: seed } });
                } else {
                  const nb = { ...(secFx[d.key] || {}) }; delete nb[bus];
                  const nextAll = { ...secFx };
                  if (Object.keys(nb).length) nextAll[d.key] = nb; else delete nextAll[d.key];
                  setSecFx(nextAll);
                }
              };
              const commit = next => setSecFx({ ...secFx, [d.key]: { ...(secFx[d.key] || {}), [bus]: next } });
              return (<>
                {gridBar(FX_BUS_ICON[bus] || "🎚", name + " FX", isOpen,
                  () => setOpenSecFx({ ...openSecFx, [panelKey]: !isOpen }), own ? "● own" : "song default",
                  "This " + (view.groove ? "groove" : d.word.toLowerCase()) + "'s own copy of the " + name.toLowerCase()
                    + " insert rack. Off, it plays whatever the Sound tab's rack currently is; on, it can pick its own type and dial its own amount — Chorus on the bass in the Drop, Bitcrusher in the Breakdown.")}
                {isOpen && (
                  <div style={{ marginTop:6 }}>
                    <label className="keytag" style={{ margin:"0 0 6px", display:"inline-flex", gap:5, alignItems:"center", cursor:"pointer" }}
                      title="On, this section picks its own type and dials its own amount for this bus, starting from whatever the song default currently is. Off, it plays the song default live — moving the Sound tab's sliders, or picking a new type there, moves this section too.">
                      <input type="checkbox" checked={!!own} onChange={e => toggleOwn(e.target.checked)} />
                      Use this section's own FX
                    </label>
                    {own ? <>
                      {fxSlotRow(own, 0, commit)}
                      {fxSlotRow(own, 1, commit)}
                    </> : (
                      <p className="keytag" style={{ margin:0 }}>
                        Following the song default — {namesOf(song).length ? namesOf(song).join(" · ") : "both slots off"}.
                      </p>
                    )}
                  </div>
                )}
              </>);
            };
            return (
              <div key={di} className={"arr" + (now ? " playnow" : "")}
                style={now ? { borderLeft: "3px solid " + acc } : null}>
                <div className="row" style={{ justifyContent:"space-between", alignItems:"baseline" }}>
                  <div className="arrsec" onClick={() => view.groove ? toggleLoopSec(d) : startMetro(d.startBar)} style={{ cursor:"pointer" }}
                    title={view.groove ? "Loop the groove — the full stack, whatever the arrangement below subtracts" : "Play from here"}>
                    <b className="sym" style={{ color: acc }}>{now ? "▶ " : ""}{view.groove ? "The groove" : d.key}</b> {view.groove ? "" : d.word}
                    <span className="arrreps"> · {d.nbars} bar{d.nbars > 1 ? "s" : ""}{d.usedC ? " · ②" : ""}</span></div>
                  <div className="row" style={{ gap:5 }}>
                    {!view.groove && <button className="mini" onClick={() => startMetro(d.startBar)} title="Play from here">▶</button>}
                    <button className={"mini" + (loopSec === d.key ? " loopon" : "")} onClick={() => toggleLoopSec(d)}
                      title={loopSec === d.key
                        ? (view.groove ? "Looping the groove — tap to stop" : "Looping this section — tap to stop")
                        : (view.groove ? "Play the groove on a loop — every track at once, whatever the arrangement below subtracts"
                          : "Loop just this section on playback")}>
                      {view.groove ? "▶ 🔁 loop" : "🔁"}{loopSec === d.key ? " on" : ""}
                    </button>
                    {donor && <button className="mini" onClick={() => copyMelody(donor.key, d.key)}>copy {donor.key}</button>}
                    {recSec === d.key
                      ? <button className="mini recstop" onClick={stopSecRec} title="Stop & transcribe onto this section">■ Stop</button>
                      : <button className="mini recbtn" onClick={() => startSecRec(d.key)} disabled={!!recSec}
                          title={`Record a ${recSource} line straight onto ${d.key}'s melody grid (overwrites it)`}>
                          {recSource === "guitar" ? "🎸" : "🎤"} Rec</button>}
                    {/* Instrument disclosures (melody/drums/perc/bass/pad/chords) used to be a row
                        of small buttons here, Arrange-only — a second interaction pattern for the
                        same panels Sketch already draws as one full-width bar per instrument
                        (`gridBar`, below). They are unconditional now, so Arrange and Sketch share
                        the one pattern: open a bar, get that instrument's settings and grid together. */}
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
                {/* This one pass's own move and its own melodic shape. Both fall back to what the
                    section type is set to, so a song stays as simple as you leave it — but the
                    second chorus wanting a different build, or the bridge wanting to fall where
                    everything else rises, is the normal case rather than the exception. */}
                {!view.groove && <button className="mini" style={{ marginTop:5 }}
                  onClick={() => setOpenOpts({ ...openOpts, [d.key]: !optsOpen })}
                  title={"Everything this " + d.word.toLowerCase() + " does besides its notes — how it arrives, what sweeps across it, and which instruments play. The dot means something here is set."}>
                  {optsOpen ? "\u25be" : "\u25b8"} Transitions & presets{optsSet ? " \u25cf" : ""}
                </button>}
                {!view.groove && optsOpen && <>
                <div className="row secopts">
                  <span className="optlbl" style={{ opacity:0.6 }}>seam</span>
                  <label className="secopt" title={"Transition into this " + d.word.toLowerCase()
                    + " alone — what happens on the bar it arrives on. Most of it sounds in the section before, so a lead-in longer than that section shortens to fit. Left as it is, it does whatever every "
                    + d.word.toLowerCase() + " does."}>
                    <span className="optlbl"><span aria-hidden="true">⇥</span> Way in</span>
                    {transSelect(secTrans[d.key] || "", e => setSecTrans({ ...secTrans, [d.key]: e.target.value }),
                      secTrans[d.base] && TRANS[secTrans[d.base]]
                        ? d.word.toLowerCase() + " — " + TRANS[secTrans[d.base]].name : null)}
                  </label>
                  <label className="secopt" title={"Arrangement move for this " + d.word.toLowerCase()
                    + " alone — a filter sweep, riser or drop across its bars. Left as it is, it does whatever every "
                    + d.word.toLowerCase() + " does."}>
                    <span className="optlbl"><span aria-hidden="true">🎛</span> Move</span>
                    <select value={secMove[d.key] || ""}
                      onChange={e => setSecMove({ ...secMove, [d.key]: e.target.value })}>
                      <option value="">{secMove[d.base] && MOVES[secMove[d.base]]
                        ? "as every " + d.word.toLowerCase() + " — " + MOVES[secMove[d.base]].name
                        : "— no move —"}</option>
                      {Object.entries(MOVES).map(([id, mv]) => id
                        ? <option key={id} value={id}>{mv.name}</option> : null)}
                    </select>
                  </label>
                  <label className="secopt" title={"Write a melodic shape onto this " + d.word.toLowerCase()
                    + " alone, over whatever is there. The bridge that should not be another arch, or the second chorus you want to climb where the first one fell."}>
                    <span className="optlbl"><span aria-hidden="true">🎵</span> Shape</span>
                    <select value={secNar[d.key] || ""} onChange={e => applySecNarrative(d, e.target.value)}>
                      <option value="">{curNar ? "as the song — " + curNar.name : "— no shape written —"}</option>
                      {NARRATIVES.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                  </label>
                  {secNar[d.key] && <button className="mini"
                    title="Write this section's shape again — after a key change, or edits you want to throw away"
                    onClick={() => applySecNarrative(d, secNar[d.key])}>↻</button>}
                </div>
                <div className="row secopts">
                  <span className="optlbl" style={{ opacity:0.6 }}>plays</span>
                  <label className="secopt" title={"Drums for this " + d.word.toLowerCase()
                    + " alone — its own kit, or silence. Taking the drums out of one section is the biggest single arrangement move there is: what follows sounds bigger without anything being added to it."}>
                    <span className="optlbl"><span aria-hidden="true">🥁</span> Drums</span>
                    <select value={secDrum[d.key] || ""}
                      onChange={e => setSecDrum({ ...secDrum, [d.key]: e.target.value })}>
                      <option value="">{secDrum[d.base] && DRUMS[secDrum[d.base]]
                        ? "as every " + d.word.toLowerCase() + " — " + DRUMS[secDrum[d.base]].name
                        : "— the song's drums —"}</option>
                      {metricDrums.map(([id, dd]) => <option key={id} value={id}>{dd.name}</option>)}
                    </select>
                  </label>
                  <label className="secopt" title={"Whether the chords sound in this " + d.word.toLowerCase()
                    + " alone. A drums-only intro and a breakdown with no harmony under it are both this switch."}>
                    <span className="optlbl"><span aria-hidden="true">🎹</span> Chords</span>
                    <select value={secQuiet[d.key] == null ? "" : (secQuiet[d.key] ? "out" : "in")}
                      onChange={e => { const v = e.target.value, next = { ...secQuiet };
                        if (v === "") delete next[d.key]; else next[d.key] = v === "out";
                        setSecQuiet(next); }}>
                      <option value="">{secQuiet[d.base]
                        ? "as every " + d.word.toLowerCase() + " — chords out"
                        : "— chords in —"}</option>
                      <option value="in">Chords in</option>
                      <option value="out">Chords out</option>
                    </select>
                  </label>
                  <label className="secopt" title={"The bassline for this " + d.word.toLowerCase()
                    + " alone — a pattern from the catalogue, or none. Independent of the chords, so a breakdown can lose the harmony and keep the bass running. Open ▸ bass above to write the line note by note."}>
                    <span className="optlbl"><span aria-hidden="true">🎸</span> Bass</span>
                    <select value={secBassPat[d.key] || ""}
                      onChange={e => { const v = e.target.value, next = { ...secBassPat };
                        if (!v) delete next[d.key]; else next[d.key] = v;
                        setSecBassPat(next);
                        // the menu supersedes a written grid — the grid re-seeds from the new choice
                        if (secBassBeat[d.key]) { const nb = { ...secBassBeat }; delete nb[d.key]; setSecBassBeat(nb); } }}>
                      <option value="">{(() => {
                        const p = secBassPat[d.base];
                        if (p) return p === "off" ? "as every " + d.word.toLowerCase() + " — no bass"
                          : "as every " + d.word.toLowerCase() + " — " + ((BASS[p] || {}).name || p);
                        return bass && !secBass[d.base] && !secBass[d.key]
                          ? "as the song — " + ((BASS[bass] || {}).name || bass) : "— no bass —";
                      })()}</option>
                      <option value="off">No bass</option>
                      {Object.entries(BASS).map(([id, b]) => <option key={id} value={id} title={b.desc}>{b.name}</option>)}
                    </select>
                  </label>
                  <label className="secopt" title={"The percussion layer for this " + d.word.toLowerCase()
                    + " alone — a second pattern from the drum table riding over the groove on the song's kit. The classic move is perc entering a build before the kick returns. Open ▸ perc above to write it step by step."}>
                    <span className="optlbl"><span aria-hidden="true">🥁</span> Perc</span>
                    <select value={secPercPat[d.key] || ""}
                      onChange={e => { const v = e.target.value, next = { ...secPercPat };
                        if (!v) delete next[d.key]; else next[d.key] = v;
                        setSecPercPat(next);
                        if (secPercBeat[d.key]) { const nb = { ...secPercBeat }; delete nb[d.key]; setSecPercBeat(nb); } }}>
                      <option value="">{(() => {
                        const p = secPercPat[d.base];
                        if (p) return p === "off" ? "as every " + d.word.toLowerCase() + " — no perc"
                          : "as every " + d.word.toLowerCase() + " — " + ((PERCS[p] || DRUMS[p] || {}).name || p);
                        return perc && !secPerc[d.base] && !secPerc[d.key]
                          ? "as the song — " + ((PERCS[perc] || DRUMS[perc] || {}).name || perc) : "— no percussion —";
                      })()}</option>
                      <option value="off">No percussion</option>
                      {Object.entries(PERCS).map(([id, dd]) => <option key={id} value={id}>{dd.name}</option>)}
                    </select>
                  </label>
                  <label className="secopt" title={"The pad for this " + d.word.toLowerCase()
                    + " alone — a second chord voice holding the upper voicing a bar at a time, reverbed and barely pumped. Pads carry breakdowns and sit out of DJ intros."}>
                    <span className="optlbl"><span aria-hidden="true">🌫️</span> Pad</span>
                    <select value={secPadVoice[d.key] || ""}
                      onChange={e => { const v = e.target.value, next = { ...secPadVoice };
                        if (!v) delete next[d.key]; else next[d.key] = v;
                        setSecPadVoice(next);
                        if (secPadBeat[d.key]) { const nb = { ...secPadBeat }; delete nb[d.key]; setSecPadBeat(nb); } }}>
                      <option value="">{(() => {
                        const p = secPadVoice[d.base];
                        if (p) return p === "off" ? "as every " + d.word.toLowerCase() + " — no pad"
                          : "as every " + d.word.toLowerCase() + " — " + ((PAD_VOICES.find(([id]) => id === p) || [])[1] || p);
                        return pad && !secPad[d.base] && !secPad[d.key]
                          ? "as the song — " + ((PAD_VOICES.find(([id]) => id === pad) || [])[1] || pad) : "— no pad —";
                      })()}</option>
                      <option value="off">No pad</option>
                      {PAD_VOICES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </select>
                  </label>
                </div>
                {/* The chorus lift: the standard kit for making one section land bigger, as one tap
                    or ingredient by ingredient. Each chip shows whether it is on, and tapping an
                    on chip takes exactly that ingredient back off. */}
                <div className="row secopts">
                  <span className="optlbl" style={{ opacity:0.6 }}>lift</span>
                  <button className="mini"
                    onClick={() => applyLift(d, LIFTS.map(g => g.id))}
                    title={"Lift this " + d.word.toLowerCase() + " the way a chorus gets lifted: melody up a third, "
                      + "the lead doubled an octave up, accents leant on, every subtraction removed, and the hook made "
                      + "a little busier — all at once, each ingredient still individually reversible below."}>
                    ⤴ Lift this {d.word.toLowerCase()}</button>
                  {LIFTS.map(g => (
                    <button key={g.id} className={"mini" + (liftOf(d).on[g.id] ? " on" : "")} title={g.tip}
                      onClick={() => (liftOf(d).on[g.id] ? unLift(d, g.id) : applyLift(d, [g.id]))}>
                      {g.name}</button>
                  ))}
                </div>
                </>}
                {gridBar("🎵", "Melody", open,
                  () => setOpenSecs({ ...openSecs, [d.key]: !open }), has ? "●" : "",
                  "The tune, note by note — every part the groove's melody carries")}
                {open && (() => {
                  const tab = melTab[d.key] || "write";
                  const pick = sugSel[d.key] || { pat: MELODY_PATTERNS[0].id, start: 0 };
                  const curPat = MELODY_PATTERNS.find(p => p.id === pick.pat) || MELODY_PATTERNS[0];
                  const rhy = rhySel[d.key] || "straight";
                  const curRhy = RHYTHMS.find(r => r.id === rhy) || RHYTHMS[0];
                  const nL = nLayers(sec);
                  const secL = Math.min(secPart[d.key] || 0, nL - 1);   // which part this section's tabs are showing
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
                    {/* One tab per instrument in this section, then that instrument's own settings
                        panel. The panel is tinted and inset because everything in it belongs to
                        this section alone — the same instrument is a different sound in the chorus,
                        and nothing else on the page works that way. */}
                    {(() => {
                      const ly = layerOf(sec, secL) || {};
                      const oct = ly.oct || 0, vol = ly.vol == null ? 1 : ly.vol;
                      const anySolo = sec.layers.some(l => l.solo);
                      const set = patch => setLayerProp(d.key, secL, patch);
                      const grp = modTab[d.key] || MOD_GROUPS[0].id;
                      const ink = LAYER_INK[secL] || "#8B94A3";
                      // where a copy can go: the other passes of this same section first, since
                      // that is nearly always what is meant, then anywhere else in the song
                      const sameRole = sections.insts.filter(o => o.base === d.base && o.key !== d.key);
                      const others = sections.insts.filter(o => o.key !== d.key);
                      const doCopy = (keys, what) => {
                        const n = copyPartSettings(d.key, secL, keys);
                        setIoNote(n ? `${LAYER_NAMES[secL]}'s settings copied to ${what}.` : "Nothing to copy to.");
                      };
                      return (<>
                      <div className="row lytabs" style={{ gap:5, alignItems:"flex-end", flexWrap:"wrap" }}>
                        {sec.layers.map((l, li) => {
                          const n = modCount(l);
                          return (
                            <button key={li} className={"lytab" + (secL === li ? " on" : "")}
                              title={"Part " + LAYER_NAMES[li] + (n ? ` — ${n} setting${n > 1 ? "s" : ""} of its own` : "")}
                              style={{ "--ly": LAYER_INK[li] }}
                              onClick={() => setSecPart({ ...secPart, [d.key]: li })}>
                              {LAYER_NAMES[li]}
                              {l.mute ? <i className="lyflag">m</i> : l.solo ? <i className="lyflag">s</i> : null}
                              {n > 0 && <i className="lydot">{n}</i>}
                            </button>
                          );
                        })}
                        {nL < MAX_LAYERS &&
                          <button className="lytab lyadd" onClick={() => addLayer(d.key)}
                            title="Add another instrument to this section — a bassline, a pad, an arp. It arrives with its own tab of settings.">＋</button>}
                      </div>

                      <div className="partpanel" style={{ "--ly": ink }}>
                        <div className="row parthdr" style={{ gap:6, alignItems:"center", flexWrap:"wrap" }}>
                          <span className="partname">{d.key} · part {LAYER_NAMES[secL]}</span>
                          <select className="fxsel partinstr" value={ly.instr || ""}
                            title={"The instrument part " + LAYER_NAMES[secL] + " plays in " + d.key + " — each section can give the same part a different voice"}
                            onChange={e => setSecInstr(d.key, secL, e.target.value)}>
                            {leadOpts()}
                          </select>
                          <select className="fxsel partcopy" value="" title="Copy every setting on this part — instrument, register, level and all its modulation — onto the same part of other sections. Their notes are left alone."
                            onChange={e => {
                              const v = e.target.value;
                              if (v === "role") doCopy(sameRole.map(o => o.key), "every other " + d.word.toLowerCase());
                              else if (v === "all") doCopy(others.map(o => o.key), "every other section");
                              else if (v) doCopy([v], v);
                            }}>
                            <option value="">⧉ copy settings to…</option>
                            {sameRole.length > 0 && <option value="role">every other {d.word.toLowerCase()} ({sameRole.length})</option>}
                            {others.length > 0 && <option value="all">every other section ({others.length})</option>}
                            {others.length > 0 && <optgroup label="just one">
                              {others.map(o => <option key={o.key} value={o.key}>{o.key} · {o.word}</option>)}
                            </optgroup>}
                          </select>
                          {modCount(ly) > 0 && <button className="mini" title="Put every modulation on this part back to its default. Its instrument, register and level are left alone."
                            onClick={() => set(Object.fromEntries(MODS.map(md => [md.k, md.dflt])))}>↺ reset</button>}
                          {secL > 0 && <button className="mini" onClick={() => removeLayer(d.key, secL)}
                            title={"Remove part " + LAYER_NAMES[secL] + " from " + d.key}>🗑</button>}

                        {/* register, level and the two mix switches sit on the same row as the part's
                            name and voice: which part, what it plays and where it sits in the mix are
                            one thing, and a boxed second row spent a border and two paddings saying
                            they were two. It wraps on a narrow card, which is where it needs to. */}
                          <span className="modlbl" style={{ marginLeft:2 }}>Octave</span>
                          <div className="row" style={{ gap:4, alignItems:"center" }}>
                            <button className="mini" disabled={oct <= LAYER_OCT_MIN}
                              onClick={() => set({ oct: Math.max(LAYER_OCT_MIN, oct - 1) })}
                              title="Drop this part an octave">−</button>
                            <span className="modval">{oct > 0 ? "+" + oct : oct}</span>
                            <button className="mini" disabled={oct >= LAYER_OCT_MAX}
                              onClick={() => set({ oct: Math.min(LAYER_OCT_MAX, oct + 1) })}
                              title="Lift this part an octave">＋</button>
                          </div>
                          <label className="modctl" title={"Level of part " + LAYER_NAMES[secL]}>
                            <span className="modlbl">Level</span>
                            <input className="lvl" type="range" min="0" max="100" value={Math.round(vol * 100)}
                              onChange={e => set({ vol: +e.target.value / 100 })} />
                            <span className="modval">{Math.round(vol * 100)}%</span>
                          </label>
                          <button className={"mini" + (ly.mute ? " mixon" : "")} onClick={() => set({ mute: !ly.mute })}
                            title="Silence this part">{ly.mute ? "muted" : "mute"}</button>
                          <button className={"mini" + (ly.solo ? " mixon" : "")} onClick={() => set({ solo: !ly.solo })}
                            title="Hear this part alone">{ly.solo ? "soloed" : "solo"}</button>
                          {anySolo && !ly.solo && <span className="keytag" style={{ margin:0, opacity:.75 }}>another part is soloed</span>}
                        </div>

                        {/* the modulation, one group at a time — 28 controls at once is a mixing
                            desk, not a sketchpad */}
                        <div className="row modtabs">
                          {MOD_GROUPS.map(g => {
                            const n = g.mods.reduce((a, md) => a + (modOf(ly, md.k) !== md.dflt ? 1 : 0), 0);
                            return (
                              <button key={g.id} className={"modtab" + (grp === g.id ? " on" : "")}
                                title={g.tip} onClick={() => setModTab({ ...modTab, [d.key]: g.id })}>
                                {g.name}{n > 0 && <i className="lydot">{n}</i>}
                              </button>
                            );
                          })}
                        </div>
                        <div className="modgrid">
                          {(MOD_GROUPS.find(g => g.id === grp) || MOD_GROUPS[0]).mods
                            // a rate only means something once the thing it paces is turned up
                            .filter(md => !md.needs || modOf(ly, md.needs) !== MOD_BY_KEY[md.needs].dflt)
                            .map(md => (
                              <ModCtl key={md.k} mod={md} ly={ly} onSet={set}
                                disabled={md.needsDelay && delayId === "off"} />
                            ))}
                        </div>
                        {tips && grp === "space" && delayId === "off" &&
                          <p className="arrnote" style={{ margin:"4px 0 0" }}>Echo needs a Delay time — pick one on the <b>Sound</b> tab.</p>}
                        {tips && modOf(ly, "arp") &&
                          <p className="arrnote" style={{ margin:"4px 0 0" }}>
                            Part {LAYER_NAMES[secL]} is arping the chords, so its grid below is not
                            being played — clear the arp to go back to the written notes.
                          </p>}
                      </div>
                      </>);
                    })()}

                    {melodyWorkbench(d, sec, secL)}
                  </div>
                  );
                })()}
                {/* The melody parts share one FX rack ("lead" — see the note beside TRACKS_FX), so
                    this sits once at the section level rather than once per part tab. */}
                {open && secFxPanel("lead", "Lead")}
                {/* This section's own drums. Nine rows, one per kit piece, and a cell is a letter
                    in the step string the catalogue patterns are already made of — so what you
                    write here is a pattern like any other, and playback, the exported MIDI and the
                    drum stem all take it without knowing it was edited.
                    It opens on whatever is *currently* playing rather than on an empty bar, so the
                    first thing you do is change a groove rather than build one from nothing. */}
                {gridBar("🥁", "Drums", beatOpen,
                  () => setOpenBeats({ ...openBeats, [d.key]: !beatOpen }),
                  secBeat[d.key] ? "● " + beatHits(secBeat[d.key]) : "",
                  "The drum grid — it opens on whatever is playing now, and painting it makes the pattern yours")}
                {beatOpen && (() => {
                  const dLayer = activeLayerOf("drums", d.key);
                  const dl = layered(d, dLayer);
                  const gk = GROOVE + layerSuf(dl.key);
                  const bars = beatBars(dl);
                  const n = bars[0].length, cols = n * d.nbars;
                  const own = !!secBeat[dl.key];
                  const sameRole = sections.insts.filter(o => o.base === d.base && o.key !== d.key);
                  const cat = DRUMS[effDrum(dl) || drum];
                  return (
                    <div style={{ marginTop:6 }}>
                      {/* the same control row shape the melody grid above uses, so the two blocks
                          read as one stack rather than two features that happen to be adjacent */}
                      <div className="row gridhdr">
                        <span className="gridname">🥁 {own ? `${who}'s own drums${dLayer ? " · " + LAYER_NAMES[dLayer] : ""}`
                          : (!effDrum(dl) && dl.key !== gk && secBeat[gk] && secBeat[gk].length) ? "following the groove"
                          : "following " + ((cat && cat.name) || "the song's drums")}</span>
                        {trackTabStrip("drums", d)}
                        {/* the pattern menu lives inside the section, so the collapsed page shows
                            no dropdowns — open the bar and the choice is here */}
                        {view.groove && dLayer === 0 && <label className="secopt" title="The drum pattern the grid opens on — paint the grid and the pattern is yours">
                          <span className="optlbl">starts from</span>
                          <select value={drum} onChange={e => { setDrumSt({ key: progId, val: e.target.value });
                              if (secBeat[GROOVE]) resetBeat(GROOVE); }}>
                            <optgroup label="Style presets">
                              {STYLE_PRESETS.filter(([, , p]) => DRUMS[p.drums]).map(([id, name, p]) =>
                                <option key={"st" + id} value={p.drums}>{name} · {DRUMS[p.drums].name}</option>)}
                            </optgroup>
                            <optgroup label="All patterns">
                              {metricDrums.map(([id, dd]) => <option key={id} value={id}>{dd.name}{id === DRUM_DEFAULT[progId] ? " ★" : ""}</option>)}
                            </optgroup>
                          </select>
                        </label>}
                        {view.groove && dLayer === 0 && wholeSongBtn("drums")}
                        {own && <button className="mini" onClick={() => resetBeat(dl.key)}
                          title="Hand this section back to the drum menu — the grid goes on showing what plays, unwritten">↺ Reset</button>}
                        {sameRole.length > 0 && <button className="mini" onClick={() => copyBeat(dl, sameRole.map(o => layered(o, dLayer)))}
                          title={"Put these drums on the other " + sameRole.length + " " + d.word.toLowerCase()
                            + (sameRole.length > 1 ? "s" : "")}>copy to every {d.word.toLowerCase()}</button>}
                      </div>
                      <div className="mscroll" data-sync={d.key} onScroll={syncScroll}>
                        {/* the same chord header the melody grid carries, on the same columns —
                            which is what makes a kick legible against the note above it */}
                        <div className="mline" style={{ gap:beatGap,
                            gridTemplateColumns:`${GRID_GUT + 4 - beatGap}px repeat(${cols}, minmax(${beatCell}px,1fr))` }}>
                          <span />
                          {d.cs.map((c, bi) => (
                            <span key={bi} className="mbar" style={{ gridColumn:`span ${n}`,
                              background: FN_COLOR[c.func || "T"], color: FN_TEXT[c.func || "T"] }}>{c.name}</span>
                          ))}
                        </div>
                        {DRUM_VOICES.map(([ch, name, tip, ink]) => (
                          <div key={ch} className="mline" style={{ gap:beatGap,
                              gridTemplateColumns:`${GRID_GUT + 4 - beatGap}px repeat(${cols}, minmax(${beatCell}px,1fr))` }}>
                            {/* the ink says which of the three parts of a kit a row belongs to —
                                metal, backbeat, floor — while its cells are still empty */}
                            <span className="mnote dname" title={tip} style={{ borderRightColor: ink }}>{name}</span>
                            {Array.from({ length: cols }, (_, c) => {
                              const bar = Math.floor(c / n), step = c % n;
                              const on = bars[bar][step].includes(ch);
                              return (
                                <div key={c} data-dk={dl.key} data-bar={bar} data-step={step} data-ch={ch}
                                  onPointerDown={e => beatDown(e, dl, bar, step, ch)}
                                  onClick={() => {
                                    if (skipClickRef.current) { skipClickRef.current = false; return; }
                                    tapBeat(dl, bar, step, ch);
                                  }}
                                  style={on ? { background: ink, borderColor: ink } : null}
                                  className={"mcell dcell" + (on ? " on" : "")
                                    + (step === 0 && c > 0 ? " b0" : step % 4 === 0 ? " bt" : "")} />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                      {trackFxRow("drums", secFxCtx)}
                      {tips && <p className="keytag" style={{ marginTop:5 }}>
                        Hold the button down and drag to paint a row — press an empty cell and you are
                        drawing, press a full one and you are rubbing out — so a sixteenth hat across
                        four bars is one stroke. Two pieces on one step play together, which is all
                        layering is here: a crash on the first step of a section, or a snare through
                        the last bar, is the fill a transition is waiting for.
                      </p>}
                    </div>
                  );
                })()}
                {gridBar("🥁", "Percussion", percOpen,
                  () => setOpenPercs({ ...openPercs, [d.key]: !percOpen }),
                  secPercBeat[d.key] ? "● " + beatHits(secPercBeat[d.key]) : "",
                  "A second layer over the drums — shakers, congas and offbeat hats")}
                {percOpen && (() => {
                  const pLayer = activeLayerOf("perc", d.key);
                  const dl = layered(d, pLayer);
                  const bars = percGridBars(dl);
                  const n = bars[0].length, cols = n * d.nbars;
                  const own = !!secPercBeat[dl.key];
                  const sameRole = sections.insts.filter(o => o.base === d.base && o.key !== d.key);
                  const src = percSrcOf(dl);
                  const cat = src && src.pat ? (PERCS[src.pat] || DRUMS[src.pat]) : null;
                  return (
                    <div style={{ marginTop:6 }}>
                      <div className="row gridhdr">
                        <span className="gridname">🥁 {own ? `${who}'s own perc layer${pLayer ? " · " + LAYER_NAMES[pLayer] : ""}`
                          : src ? (src.loop ? "following the groove" : "following " + ((cat && cat.name) || "the section's perc"))
                          : "no perc here — paint some"}</span>
                        {trackTabStrip("perc", d)}
                        {view.groove && pLayer === 0 && <label className="secopt" title="The percussion pattern the groove starts from — shakers, congas and offbeat hats over the drums">
                          <span className="optlbl">starts from</span>
                          <select value={perc} onChange={e => { setPercSt({ key: progId, val: e.target.value || "off" });
                              if (secPercBeat[GROOVE]) resetPercBeat(GROOVE); }}>
                            <option value="">No percussion</option>
                            <optgroup label="Style presets">
                              {STYLE_PRESETS.filter(([, , p]) => PERCS[p.perc]).map(([id, name, p]) =>
                                <option key={"st" + id} value={p.perc}>{name} · {PERCS[p.perc].name}</option>)}
                            </optgroup>
                            <optgroup label="All patterns">
                              {Object.entries(PERCS).map(([id, dd]) => <option key={id} value={id}>{dd.name}</option>)}
                            </optgroup>
                          </select>
                        </label>}
                        {view.groove && pLayer === 0 && wholeSongBtn("perc")}
                        {own && <button className="mini" onClick={() => resetPercBeat(dl.key)}
                          title="Hand this section back to the perc menu — the grid goes on showing what plays, unwritten">↺ Reset</button>}
                        {sameRole.length > 0 && <button className="mini" onClick={() => copyPercBeat(dl, sameRole.map(o => layered(o, pLayer)))}
                          title={"Put this perc on the other " + sameRole.length + " " + d.word.toLowerCase()
                            + (sameRole.length > 1 ? "s" : "")}>copy to every {d.word.toLowerCase()}</button>}
                      </div>
                      <div className="mscroll" data-sync={d.key} onScroll={syncScroll}>
                        <div className="mline" style={{ gap:beatGap,
                            gridTemplateColumns:`${GRID_GUT + 4 - beatGap}px repeat(${cols}, minmax(${beatCell}px,1fr))` }}>
                          <span />
                          {d.cs.map((c, bi) => (
                            <span key={bi} className="mbar" style={{ gridColumn:`span ${n}`,
                              background: FN_COLOR[c.func || "T"], color: FN_TEXT[c.func || "T"] }}>{c.name}</span>
                          ))}
                        </div>
                        {PERC_VOICES.map(([ch, name, tip, ink]) => (
                          <div key={ch} className="mline" style={{ gap:beatGap,
                              gridTemplateColumns:`${GRID_GUT + 4 - beatGap}px repeat(${cols}, minmax(${beatCell}px,1fr))` }}>
                            <span className="mnote dname" title={tip} style={{ borderRightColor: ink }}>{name}</span>
                            {Array.from({ length: cols }, (_, c) => {
                              const bar = Math.floor(c / n), step = c % n;
                              const on = bars[bar][step].includes(ch);
                              return (
                                <div key={c} data-pk={dl.key} data-bar={bar} data-step={step} data-ch={ch}
                                  onPointerDown={e => percDown(e, dl, bar, step, ch)}
                                  onClick={() => {
                                    if (skipClickRef.current) { skipClickRef.current = false; return; }
                                    tapPerc(dl, bar, step, ch);
                                  }}
                                  style={on ? { background: ink, borderColor: ink } : null}
                                  className={"mcell dcell" + (on ? " on" : "")
                                    + (step === 0 && c > 0 ? " b0" : step % 4 === 0 ? " bt" : "")} />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                      {trackFxRow("perc", secFxCtx)}
                      {tips && <p className="keytag" style={{ marginTop:5 }}>
                        A second layer over the drum grid above, on the same kit — shakers, congas
                        and offbeat hats live here so the main groove stays untouched. It has its
                        own lane and its own drawn filter on the strip.
                      </p>}
                    </div>
                  );
                })()}
                {gridBar("🎸", "Bass", bassOpen,
                  () => setOpenBass({ ...openBass, [d.key]: !bassOpen }),
                  secBassBeat[d.key] ? "●" : "",
                  "The bassline — root, fifth and octave of whatever chord each bar holds, so the line follows the changes by itself")}
                {bassOpen && (() => {
                  const bLayer = activeLayerOf("bass", d.key);
                  const dl = layered(d, bLayer);
                  const bars = bassGridBars(dl);
                  const n = bars[0].length, cols = n * d.nbars;
                  const own = !!secBassBeat[dl.key];
                  const sameRole = sections.insts.filter(o => o.base === d.base && o.key !== d.key);
                  const src = bassSrcOf(dl);
                  const cat = src && src.pat ? BASS[src.pat] : null;
                  return (
                    <div style={{ marginTop:6 }}>
                      <div className="row gridhdr">
                        <span className="gridname">🎸 {own ? `${who}'s own bassline${bLayer ? " · " + LAYER_NAMES[bLayer] : ""}`
                          : src ? (src.loop ? "following the groove" : "following " + ((cat && cat.name) || "the section's bass"))
                          : "no bass here — paint a line"}</span>
                        {trackTabStrip("bass", d)}
                        {view.groove && bLayer === 0 && <label className="secopt" title="The bassline pattern the groove starts from — paint the bass grid to make the line your own">
                          <span className="optlbl">starts from</span>
                          <select value={bass} onChange={e => { setBassSt({ key: progId, val: e.target.value });
                              if (secBassBeat[GROOVE]) resetBassBeat(GROOVE); }}>
                            <option value="">No bass</option>
                            <optgroup label="Style presets">
                              {STYLE_PRESETS.filter(([, , p]) => BASS[p.bass]).map(([id, name, p]) =>
                                <option key={"st" + id} value={p.bass}>{name} · {BASS[p.bass].name}</option>)}
                            </optgroup>
                            <optgroup label="All patterns">
                              {Object.entries(BASS).map(([id, b]) => <option key={id} value={id} title={b.desc}>{b.name}</option>)}
                            </optgroup>
                          </select>
                        </label>}
                        {view.groove && bLayer === 0 && wholeSongBtn("bass")}
                        {/* Bass-as-hook: a riff written into the sixteenths the kick leaves free, from
                            this section's own resolved drums — so it interlocks with the groove
                            instead of doubling it. Press again for the next riff; the grid stays
                            yours to edit, and ↺ Reset hands it back to the menu. */}
                        <button className="mini" onClick={() => {
                            const seed = riffSeed[dl.key] || 0;
                            const riff = bassRiffBars(beatBars(d), n, barBeats, d.nbars, seed);
                            setSecBassBeat({ ...secBassBeat, [dl.key]: riff });
                            setRiffSeed({ ...riffSeed, [dl.key]: seed + 1 });
                            setIoNote(`Bass riff written into the kick's holes — ${riffShapeName(seed)}. Press again for another.`);
                          }}
                          title={"Write a bass riff into the holes this " + (view.groove ? "groove" : d.word.toLowerCase())
                            + "'s kick leaves — in house and garage the hook is as often the bassline, and what makes it groove "
                            + "is answering the kick rather than doubling it. Every press writes a different riff."}>
                          ✦ Riff the holes</button>
                        {own && <button className="mini" onClick={() => resetBassBeat(dl.key)}
                          title="Hand this section back to the bass menu — the grid goes on showing what plays, unwritten">↺ Reset</button>}
                        {sameRole.length > 0 && <button className="mini" onClick={() => copyBassBeat(dl, sameRole.map(o => layered(o, bLayer)))}
                          title={"Put this bassline on the other " + sameRole.length + " " + d.word.toLowerCase()
                            + (sameRole.length > 1 ? "s" : "")}>copy to every {d.word.toLowerCase()}</button>}
                      </div>
                      <div className="mscroll" data-sync={d.key} onScroll={syncScroll}>
                        <div className="mline" style={{ gap:beatGap,
                            gridTemplateColumns:`${GRID_GUT + 4 - beatGap}px repeat(${cols}, minmax(${beatCell}px,1fr))` }}>
                          <span />
                          {d.cs.map((c, bi) => (
                            <span key={bi} className="mbar" style={{ gridColumn:`span ${n}`,
                              background: FN_COLOR[c.func || "T"], color: FN_TEXT[c.func || "T"] }}>{c.name}</span>
                          ))}
                        </div>
                        {BASS_ROWS.map(([tok, name, tip, ink]) => (
                          <div key={tok} className="mline" style={{ gap:beatGap,
                              gridTemplateColumns:`${GRID_GUT + 4 - beatGap}px repeat(${cols}, minmax(${beatCell}px,1fr))` }}>
                            <span className="mnote dname" title={tip} style={{ borderRightColor: ink }}>{name}</span>
                            {Array.from({ length: cols }, (_, c) => {
                              const bar = Math.floor(c / n), step = c % n;
                              const on = bars[bar][step] === tok;
                              return (
                                <div key={c} data-bk={dl.key} data-bar={bar} data-step={step} data-tok={tok}
                                  onPointerDown={e => bassDown(e, dl, bar, step, tok)}
                                  onClick={() => {
                                    if (skipClickRef.current) { skipClickRef.current = false; return; }
                                    tapBass(dl, bar, step, tok);
                                  }}
                                  style={on ? { background: ink, borderColor: ink } : null}
                                  className={"mcell dcell" + (on ? " on" : "")
                                    + (step === 0 && c > 0 ? " b0" : step % 4 === 0 ? " bt" : "")} />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                      {trackFxRow("bass", secFxCtx)}
                      {tips && <p className="keytag" style={{ marginTop:5 }}>
                        One note a step — root, fifth or octave of whatever chord that bar holds, so
                        the line follows the changes by itself. A note rings until the next one, so a
                        single Root at the bar start is a held sub and a step on every offbeat is the
                        house bounce. Tap a different row to move a note; tap it again to clear it.
                      </p>}
                    </div>
                  );
                })()}
                {gridBar("🌫️", "Pad", padGOpen,
                  () => setOpenPads({ ...openPads, [d.key]: !padGOpen }),
                  secPadBeat[d.key] ? "●" : "",
                  "The pad's rhythm — holds that ring to the next hit, and short stabs")}
                {padGOpen && (() => {
                  const qLayer = activeLayerOf("pad", d.key);
                  const dl = layered(d, qLayer);
                  const bars = padGridBars(dl);
                  const n = bars[0].length, cols = n * d.nbars;
                  const own = !!secPadBeat[dl.key];
                  const sameRole = sections.insts.filter(o => o.base === d.base && o.key !== d.key);
                  return (
                    <div style={{ marginTop:6 }}>
                      <div className="row gridhdr">
                        <span className="gridname">🌫️ {own ? `${who}'s own pad rhythm${qLayer ? " · " + LAYER_NAMES[qLayer] : ""}`
                          : (padBeatOf(dl) || {}).loop ? "following the groove"
                          : padOnOf(dl) ? "one hold a bar — the pad's natural state"
                          : "no pad here — paint a rhythm"}</span>
                        {trackTabStrip("pad", d)}
                        {view.groove && qLayer === 0 && <label className="secopt" title="The pad voice — the chord's upper voicing held a bar at a time. Write its rhythm on this grid.">
                          <span className="optlbl">voice</span>
                          <select value={pad} onChange={e => setPadSt({ key: progId, val: e.target.value })}>
                            <option value="">No pad</option>
                            <optgroup label="Style presets">
                              {STYLE_PRESETS.filter(([, , p]) => PAD_VOICES.some(([vid]) => vid === p.pad)).map(([id, name, p]) =>
                                <option key={"st" + id} value={p.pad}>{name} · {(PAD_VOICES.find(([vid]) => vid === p.pad) || [])[1]}</option>)}
                            </optgroup>
                            <optgroup label="All voices">
                              {PAD_VOICES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                            </optgroup>
                          </select>
                        </label>}
                        {view.groove && qLayer === 0 && wholeSongBtn("pad")}
                        {own && <button className="mini" onClick={() => resetPadBeat(dl.key)}
                          title="Back to the pad's one-hold-a-bar — the grid goes on showing it, unwritten">↺ Reset</button>}
                        {sameRole.length > 0 && <button className="mini" onClick={() => copyPadBeat(dl, sameRole.map(o => layered(o, qLayer)))}
                          title={"Put this pad rhythm on the other " + sameRole.length + " " + d.word.toLowerCase()
                            + (sameRole.length > 1 ? "s" : "")}>copy to every {d.word.toLowerCase()}</button>}
                      </div>
                      <div className="mscroll" data-sync={d.key} onScroll={syncScroll}>
                        <div className="mline" style={{ gap:beatGap,
                            gridTemplateColumns:`${GRID_GUT + 4 - beatGap}px repeat(${cols}, minmax(${beatCell}px,1fr))` }}>
                          <span />
                          {d.cs.map((c, bi) => (
                            <span key={bi} className="mbar" style={{ gridColumn:`span ${n}`,
                              background: FN_COLOR[c.func || "T"], color: FN_TEXT[c.func || "T"] }}>{c.name}</span>
                          ))}
                        </div>
                        {PAD_ROWS.map(([tok, name, tip, ink]) => (
                          <div key={tok} className="mline" style={{ gap:beatGap,
                              gridTemplateColumns:`${GRID_GUT + 4 - beatGap}px repeat(${cols}, minmax(${beatCell}px,1fr))` }}>
                            <span className="mnote dname" title={tip} style={{ borderRightColor: ink }}>{name}</span>
                            {Array.from({ length: cols }, (_, c) => {
                              const bar = Math.floor(c / n), step = c % n;
                              const on = bars[bar][step] === tok;
                              return (
                                <div key={c} data-qk={dl.key} data-bar={bar} data-step={step} data-tok={tok}
                                  onPointerDown={e => padDown(e, dl, bar, step, tok)}
                                  onClick={() => {
                                    if (skipClickRef.current) { skipClickRef.current = false; return; }
                                    tapPad(dl, bar, step, tok);
                                  }}
                                  style={on ? { background: ink, borderColor: ink } : null}
                                  className={"mcell dcell" + (on ? " on" : "")
                                    + (step === 0 && c > 0 ? " b0" : step % 4 === 0 ? " bt" : "")} />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                      {trackFxRow("pad", secFxCtx)}
                      {tips && <p className="keytag" style={{ marginTop:5 }}>
                        The pad plays whatever chord each bar holds — this grid says when. A Hold
                        rings until the next hit; a Stab is short. One Hold on the downbeat is what
                        the pad does anyway; stabs off the beat turn it into house piano.
                      </p>}
                    </div>
                  );
                })()}
                {gridBar("🎹", "Chords", chordGOpen,
                  () => setOpenChordGrids({ ...openChordGrids, [d.key]: !chordGOpen }),
                  secChordBeat[d.key] ? "●" : "",
                  "The chord rhythm — accents, downstrokes and upstrokes on the strum's own vocabulary")}
                {chordGOpen && (() => {
                  const bars = chordGridBars(d);
                  const n = bars[0].length, cols = n * d.nbars;
                  const own = !!secChordBeat[d.key];
                  const sameRole = sections.insts.filter(o => o.base === d.base && o.key !== d.key);
                  return (
                    <div style={{ marginTop:6 }}>
                      <div className="row gridhdr">
                        <span className="gridname">🎹 {own ? `${who}'s own chord rhythm`
                          : (d.key !== GROOVE && secChordBeat[GROOVE] && secChordBeat[GROOVE].length) ? "following the groove"
                          : "following " + rhythm.name}</span>
                        {view.groove && wholeSongBtn("chords")}
                        {own && <button className="mini" onClick={() => resetChordBeat(d.key)}
                          title="Hand this section back to the song's strum pattern — the grid goes on showing it, unwritten">↺ Reset</button>}
                        {sameRole.length > 0 && <button className="mini" onClick={() => copyChordBeat(d, sameRole)}
                          title={"Put this chord rhythm on the other " + sameRole.length + " " + d.word.toLowerCase()
                            + (sameRole.length > 1 ? "s" : "")}>copy to every {d.word.toLowerCase()}</button>}
                      </div>
                      <div className="mscroll" data-sync={d.key} onScroll={syncScroll}>
                        <div className="mline" style={{ gap:beatGap,
                            gridTemplateColumns:`${GRID_GUT + 4 - beatGap}px repeat(${cols}, minmax(${beatCell}px,1fr))` }}>
                          <span />
                          {d.cs.map((c, bi) => (
                            <span key={bi} className="mbar" style={{ gridColumn:`span ${n}`,
                              background: FN_COLOR[c.func || "T"], color: FN_TEXT[c.func || "T"] }}>{c.name}</span>
                          ))}
                        </div>
                        {CHORD_ROWS.map(([tok, name, tip, ink]) => (
                          <div key={tok} className="mline" style={{ gap:beatGap,
                              gridTemplateColumns:`${GRID_GUT + 4 - beatGap}px repeat(${cols}, minmax(${beatCell}px,1fr))` }}>
                            <span className="mnote dname" title={tip} style={{ borderRightColor: ink }}>{name}</span>
                            {Array.from({ length: cols }, (_, c) => {
                              const bar = Math.floor(c / n), step = c % n;
                              const on = bars[bar][step] === tok;
                              return (
                                <div key={c} data-ck={d.key} data-bar={bar} data-step={step} data-tok={tok}
                                  onPointerDown={e => chordBeatDown(e, d, bar, step, tok)}
                                  onClick={() => {
                                    if (skipClickRef.current) { skipClickRef.current = false; return; }
                                    tapChordBeat(d, bar, step, tok);
                                  }}
                                  style={on ? { background: ink, borderColor: ink } : null}
                                  className={"mcell dcell" + (on ? " on" : "")
                                    + (step === 0 && c > 0 ? " b0" : step % 4 === 0 ? " bt" : "")} />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                      {tips && <p className="keytag" style={{ marginTop:5 }}>
                        The chord track's rhythm for these bars alone, on the strum's own vocabulary:
                        Accent is the big hit, Down a full strum, Up the light answer. It replaces the
                        song's pattern here — the bassline's "with the chords" mode follows it too.
                      </p>}
                    </div>
                  );
                })()}
              </div>
            );
  };

  /* ---- the Sketch tab's draft arrangement ----
     A running order drafted against the groove, kept apart from the song's plan on purpose: the
     Sketch tab is where the full stack loops while the shape is only being thought about, and
     nothing it holds is heard in the song until ✍ Write to Arrange commits it. Each draft row
     carries its own subtractions (`off`), so moving or copying a section carries its ticks with
     it — no instance keys, no remapping, because nothing here is an instance yet. */
  /* The rows of the matrix: every track the groove actually carries, plus its playing melody
     parts. Ordered top to bottom as the writer reads a mixer — melody parts, then bass, chords,
     pad, perc, with the drums as the floor of the stack. */
  /* The optional overall style: one row of STYLE_PRESETS applied to every track's menu at once.
     Derived rather than stored — the menu shows a style only while the four tracks actually
     spell that style's row, and goes blank the moment any menu is changed by hand. */
  const sketchStyle = (STYLE_PRESETS.find(([, , p]) =>
    p.drums === drum && (p.bass || "") === bass && (p.perc || "") === perc && (p.pad || "") === pad) || [""])[0];
  const applySketchStyle = id => {
    const row = STYLE_PRESETS.find(s => s[0] === id);
    if (!row) return;
    const p = row[2];
    setDrumSt({ key: progId, val: p.drums });
    setBassSt({ key: progId, val: p.bass || "" });
    setPercSt({ key: progId, val: p.perc || "off" });
    setPadSt({ key: progId, val: p.pad || "" });
    // painted groove grids would shadow the new patterns — the same rule each menu applies alone
    if (secBeat[GROOVE]) resetBeat(GROOVE);
    if (secPercBeat[GROOVE]) resetPercBeat(GROOVE);
    if (secBassBeat[GROOVE]) resetBassBeat(GROOVE);
  };
  const sketchTracks = () => {
    const rows = [];
    ((secMelos[GROOVE] || {}).layers || []).forEach((ly, i) => {
      if ((ly.flat && ly.flat.some(c => c && c.length)) || ly.arp) rows.push({ id: "p" + i, name: LAYER_NAMES[i] });
    });
    if (bassSrcOf(grooveInst)) rows.push({ id: "bass", name: "Bass" });
    rows.push({ id: "chords", name: "Chords" });
    if (padOnOf(grooveInst)) rows.push({ id: "pad", name: "Pad" });
    if (percSrcOf(grooveInst)) rows.push({ id: "perc", name: "Perc" });
    if ((secBeat[GROOVE] && secBeat[GROOVE].length) || (DRUMS[drum] || {}).pattern) rows.push({ id: "drums", name: "Drums" });
    return rows;
  };
  const skPatch = (i, patch) => setSketchArr(sketchArr.map((r, k) => k === i ? { ...r, ...patch } : r));
  const skAdd = sec => {
    const at = sketchArr.length ? Math.min(sketchSel + 1, sketchArr.length) : 0;
    setSketchArr([...sketchArr.slice(0, at), { sec, reps: 1, on: {} }, ...sketchArr.slice(at)]);
    setSketchSel(at);
  };
  const skMove = (i, d2) => {
    const j = i + d2;
    if (i < 0 || i >= sketchArr.length || j < 0 || j >= sketchArr.length) return;
    const next = [...sketchArr];
    [next[i], next[j]] = [next[j], next[i]];
    setSketchArr(next); setSketchSel(j);
  };
  const skReps = (i, d2) => skPatch(i, { reps: Math.max(1, Math.min(32, ((sketchArr[i] || {}).reps || 1) + d2)) });
  const skDup = i => {
    setSketchArr([...sketchArr.slice(0, i + 1), { ...sketchArr[i], on: { ...(sketchArr[i].on || {}) } }, ...sketchArr.slice(i + 1)]);
    setSketchSel(i + 1);
  };
  const skDel = i => {
    const next = sketchArr.filter((_, k) => k !== i);
    setSketchArr(next); setSketchSel(Math.max(0, Math.min(i, next.length - 1)));
  };
  const skToggle = (i, id) => skPatch(i, { on: { ...(sketchArr[i].on || {}), [id]: !(sketchArr[i].on || {})[id] } });
  /* Commit the draft: its rows become the song's plan (every section a pass of the full loop) and
     its ticks become the allocation — a mute per instance on each track a section unticked, and
     the part allocation map for the groove's melody parts. The maps are replaced rather than
     merged, exactly as applying a template replaces them: half an old arrangement under a new one
     is what a commit exists to prevent. The grids, the melodies and the track effects are left
     alone — they are material, not arrangement. `planInsts` rather than `sections.insts` because
     this runs inside the click that changes the plan, before React has re-rendered it. */
  const writeSketchToArrange = () => {
    if (!sketchArr.length) return;
    const plan = sketchArr.map(r => ({ sec: r.sec, nums: "LOOP", reps: r.reps || 1, note: null }));
    const insts = planInsts(plan, barsOfRow, letterFor);
    // the matrix is additive — a cell is clicked IN — so everything the groove carries that a
    // section did NOT fill in is written as that instance's mute
    const rows = sketchTracks();
    const nDrum = {}, nQuiet = {}, nBass = {}, nPerc = {}, nPad = {}, nOut = {};
    insts.forEach(x => {
      const on = (sketchArr[x.row] || {}).on || {};
      const parts = {};
      for (const rw of rows) {
        if (on[rw.id]) continue;
        if (rw.id === "drums") nDrum[x.key] = "off";
        else if (rw.id === "chords") nQuiet[x.key] = true;
        else if (rw.id === "bass") nBass[x.key] = "off";
        else if (rw.id === "perc") nPerc[x.key] = "off";
        else if (rw.id === "pad") nPad[x.key] = "off";
        else parts[+rw.id.slice(1)] = true;
      }
      if (Object.keys(parts).length) nOut[x.key] = parts;
    });
    setSelStruct("");                                  // the draft is its own running order, not a catalogue one
    setCustom({ key: progId + "|", plan });
    setSecDrum(nDrum); setSecQuiet(nQuiet);
    setSecBassPat(nBass); setSecPercPat(nPerc); setSecPadVoice(nPad);
    setSecPartOut(nOut);
    setSecBass({}); setSecPerc({}); setSecPad({});     // template-written letter mutes would shadow the groove
    setSelRow(0); setFocusRow(0);
    if (loopSec) { loopRef.current = null; setLoopSec(null); }   // leave the groove loop — there is a song to hear now
    setTab("arrange");
    setIoNote(`Wrote the sketch to the arrangement — ${plan.length} section${plan.length > 1 ? "s" : ""}, every one playing exactly what you filled in. Refine each pass here.`);
  };
  // the draft on screen: section blocks over one row per groove track, a cell per (track, section)
  const sketchDraft = () => {
    const rows = sketchTracks();
    const total = sketchArr.reduce((n, r) => n + (r.reps || 1), 0);
    if (!sketchArr.length) return (
      <div className="row" style={{ gap:"6px 8px", alignItems:"center", flexWrap:"wrap", marginTop:8 }}>
        <span className="keytag" style={{ margin:0 }}>An empty running order — add the first section:</span>
        {["Intro", "Build", "Drop", "Breakdown", "Outro"].map(sc =>
          <button key={sc} className="mini" onClick={() => skAdd(sc)}>＋ {sc}</button>)}
        <select className="fxsel" value="" onChange={e => { if (e.target.value) skAdd(e.target.value); }}
          title="Add a section the quick buttons don't offer">
          <option value="">＋ other…</option>
          {ADDABLE.map(sc => <option key={sc} value={sc}>{sc}</option>)}
        </select>
        {/* the commit button shows from the start, disabled, so the destination of the workflow
            is visible before the draft exists — a button that only appears later reads as absent */}
        <button className="btn" disabled style={{ marginLeft:"auto", padding:"5px 12px", opacity:0.5 }}
          title="Add at least one section above — then this writes the whole draft to the Arrange tab">
          ✍ Write to Arrange
        </button>
      </div>
    );
    const at = Math.min(sketchSel, sketchArr.length - 1);
    const cur = sketchArr[at];
    return (
      <>
        <div className="tl">
          <div className="tlgut">
            <div className="tlglbl tlgsec">{total * grooveInst.nbars} bars</div>
            {rows.map(rw => <div key={rw.id} className="tlglbl">{rw.name}</div>)}
          </div>
          <div className="tltrk">
            <div className="tlrow tlsecs">
              {sketchArr.map((r, i) => {
                const accS = SEC_COL[letterFor(r.sec)] || "#8B94A3";
                const n = r.reps || 1;
                return (
                  <button key={i} className={"tlsec" + (at === i ? " picked" : "")}
                    style={{ flex: n + " 0 0%", background: accS + "22", borderColor: accS + "77" }}
                    onClick={() => setSketchSel(i)}
                    title={`${r.sec}${n > 1 ? ` ×${n}` : ""} · ${n * grooveInst.nbars} bars — tap to pick it, then the tools below move, stretch, copy or remove it`}>
                    <span className="tlsecl" style={{ color: accS }}>{r.sec}{n > 1 ? " ×" + n : ""}</span>
                  </button>
                );
              })}
            </div>
            {rows.map(rw => (
              <div key={rw.id} className="tlrow">
                {sketchArr.map((r, i) => {
                  const filled = !!(r.on || {})[rw.id];
                  const accS = SEC_COL[letterFor(r.sec)] || "#8B94A3";
                  return <button key={i} className={"tlcell " + (filled ? "on" : "off")}
                    style={{ flex: (r.reps || 1) + " 0 0%", background: filled ? accS + "AA" : undefined }}
                    onClick={() => skToggle(i, rw.id)}
                    title={filled ? `Take ${rw.name} back out of ${r.sec}` : `Fill ${r.sec} with the groove's ${rw.name}`} />;
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="row" style={{ gap:"6px 8px", alignItems:"center", flexWrap:"wrap", marginTop:8 }}>
          <span className="keytag" style={{ margin:0 }}>
            <b style={{ color: SEC_COL[letterFor(cur.sec)] || "#EAE2CC" }}>{cur.sec}</b>
            {" "}· {cur.reps || 1} pass{(cur.reps || 1) > 1 ? "es" : ""}
          </span>
          <button className="mini" onClick={() => skMove(at, -1)} disabled={at <= 0} title="Move this section earlier">◀</button>
          <button className="mini" onClick={() => skMove(at, 1)} disabled={at >= sketchArr.length - 1} title="Move this section later">▶</button>
          <button className="mini" onClick={() => skReps(at, -1)} disabled={(cur.reps || 1) <= 1}
            title="One pass fewer — a shorter section">− pass</button>
          <button className="mini" onClick={() => skReps(at, 1)} title="One pass more — a longer section">＋ pass</button>
          <button className="mini" onClick={() => skDup(at)} title="Duplicate this section, fills and all">⧉ Copy</button>
          <button className="mini" onClick={() => skDel(at)} title="Remove this section from the draft">🗑</button>
          <select className="fxsel" value="" onChange={e => { if (e.target.value) skAdd(e.target.value); }}
            title="Add a new section after the picked one">
            <option value="">＋ add section…</option>
            {ADDABLE.map(sc => <option key={sc} value={sc}>{sc}</option>)}
          </select>
          <button className="btn" style={{ marginLeft:"auto", padding:"5px 12px", borderColor: GOLD, color: GOLD }}
            onClick={writeSketchToArrange}
            title="Commit the draft: this running order becomes the song's arrangement, every section playing exactly the instruments you filled in — then each pass is refined on the Arrange tab.">
            ✍ Write to Arrange
          </button>
        </div>
      </>
    );
  };
  // the structure / arrangement-template chooser, at the top of the Arrange tab
  const structPicker = () => (
    <select value={selStruct.startsWith(progId + ":") ? selStruct : ""} onChange={e => pickStruct(e.target.value)}
      title="A structure is a running order. An arrangement template is a running order plus what plays in each section — which drop the drums, which lose the chords, where the filter opens and what happens at every seam.">
      <option value="">No structure — just the loop</option>
      {/* First, because they are the ones that arrive arranged: everything below sets the
          order of the sections and then plays every element through all of them. */}
      <optgroup label="Dance arrangement templates — arranged, not just ordered">
        {DANCE_TEMPLATES.map((t, i) => <option key={"t"+i} value={progId + ":t:" + i}>{t.name}</option>)}
      </optgroup>
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
  );
  // the current pick, but only while it still matches what's on screen — switching the key or
  // progression away from it by hand is how you leave the preset, the same way curTpl does
  const curTrackPreset = trackSt && TRACK_PRESETS.find(t => t.id === trackSt && t.progId === progId) || null;
  // "recreate a famous track" — sits beside structPicker() because picking one *is* picking a
  // structure (and a key, a tempo and a groove) at once; see applyTrackPreset for why it can't
  // just call pickStruct and the narrative picker back to back
  const trackPicker = () => (
    <select value={trackSt} onChange={e => applyTrackPreset(e.target.value)}
      title="Reconfigures the song — tempo, key, chords, arrangement and groove — to closely match a real record, so you can study how it's built. The melody is this app's own generated hook, steered toward the real track's character, never a copy of it.">
      <option value="">Recreate a famous track…</option>
      {TRACK_PRESETS.map(t => <option key={t.id} value={t.id}>{t.artist} — {t.name}</option>)}
    </select>
  );
  /* ---- the arrangement at a glance, and its editor ----
     One function because it renders in two places: the Arrange tab, where it always
     lived, and the Sketch tab, where it is the second half of the subtractive workflow —
     the lanes are how the groove is allocated across the sections. */
  const arrangeStrip = () => sections.insts.length > 0 && (() => {
            const total = sections.totalBars || 1;
            /* What each section actually plays, resolved the same way the scheduler resolves it —
               including the part that was missed: a section written on its own drum grid plays
               those bars whatever its pass or its type is set to, "off" included. Read from the
               menus alone, the lane said a section had no drums while you could hear them. */
            const ownBeat = d => { const b = secBeat[d.key]; return b && b.length ? b : null; };
            const grooveDrums = secBeat[GROOVE] && secBeat[GROOVE].length ? secBeat[GROOVE] : null;
            const drumsIn = d => {
              if (ownBeat(d)) return true;
              const sd = effDrum(d);
              if (!sd && grooveDrums) return true;   // nothing of its own — the groove's drums play
              const dd = DRUMS[sd || drum];
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
            const runScope = r => (r.items.length > 1 ? `all ${r.items.length} passes` : "this section");
            const lanes = [
              { name: "Drums", on: drumsIn, scope: runScope,
                /* Per pass, not per section letter. Every groove in a dance track letters G, so
                   letter-keying meant one click silenced all of them and "the drums come out for
                   *this* breakdown" — the single most useful arrangement edit there is — could not
                   be said at all. Coming back in clears the pass's own setting so it follows the
                   section type again, unless the type is itself silent, in which case it takes the
                   song's kit rather than appearing to do nothing. */
                toggle: r => {
                  const anyIn = r.items.some(drumsIn), next = { ...secDrum };
                  r.items.forEach(d => {
                    if (anyIn) { next[d.key] = "off"; return; }
                    const bd = DRUMS[secDrum[d.base] || drum];
                    const g = !secDrum[d.base] && grooveDrums;   // clearing the pass lets the groove play
                    if (g || (bd && bd.pattern)) delete next[d.key]; else next[d.key] = drum;
                  });
                  setSecDrum(next);
                },
                /* A pass with its own written bars plays them regardless, so the lane has nothing
                   it can do here — better to say that than to accept the click and not move. */
                dead: r => r.items.every(ownBeat),
                deadTip: r => `${r.sec} has its own drums written — open ▸ drums on the section to change them` },
              { name: "Chords", on: d => !effQuiet(d), scope: runScope,
                toggle: r => {
                  const anyIn = r.items.some(d => !effQuiet(d)), next = { ...secQuiet };
                  r.items.forEach(d => { next[d.key] = anyIn; });
                  setSecQuiet(next);
                } },
              /* The bass, perc and pad lanes appear once the track sounds anywhere. A block is on
                 when that pass resolves to something; clicking off writes "off" on the pass, and
                 clicking back on clears it — or, where nothing would be inherited, writes a
                 sensible pattern so the lane always does something audible. */
              ...(bassAnywhere ? [{ name: "Bass", on: d => !!bassSrcOf(d), scope: runScope,
                toggle: r => {
                  const anyIn = r.items.some(x => !!bassSrcOf(x)), next = { ...secBassPat };
                  r.items.forEach(x => {
                    if (anyIn) { next[x.key] = "off"; return; }
                    delete next[x.key];
                    const lp = next[x.base];
                    const gv = !!(secBassBeat[GROOVE] && secBassBeat[GROOVE].length);   // the groove's line inherits
                    const inherited = lp ? lp !== "off" : (!effBassOut(x) && (!!bass || gv));
                    if (!inherited && !secBassBeat[x.key]) next[x.key] = bass || "offbeat";
                  });
                  setSecBassPat(next);
                } }] : []),
              ...(percAnywhere ? [{ name: "Perc", on: d => !!percSrcOf(d), scope: runScope,
                toggle: r => {
                  const anyIn = r.items.some(x => !!percSrcOf(x)), next = { ...secPercPat };
                  r.items.forEach(x => {
                    if (anyIn) { next[x.key] = "off"; return; }
                    delete next[x.key];
                    const lp = next[x.base];
                    const gv = !!(secPercBeat[GROOVE] && secPercBeat[GROOVE].length);   // the groove's layer inherits
                    const inherited = lp ? lp !== "off" : (!effPercOut(x) && (!!perc || gv));
                    if (!inherited && !secPercBeat[x.key]) next[x.key] = perc || "shaker8";
                  });
                  setSecPercPat(next);
                } }] : []),
              ...(padAnywhere ? [{ name: "Pad", on: d => padOnOf(d), scope: runScope,
                toggle: r => {
                  const anyIn = r.items.some(x => !!padVoiceOf(x)), next = { ...secPadVoice };
                  r.items.forEach(x => {
                    if (anyIn) { next[x.key] = "off"; return; }
                    delete next[x.key];
                    const lp = next[x.base];
                    const gv = !!(secPadBeat[GROOVE] && secPadBeat[GROOVE].length);   // the groove's rhythm inherits
                    const inherited = lp ? lp !== "off" : (!effPadOut(x) && (!!pad || gv));
                    if (!inherited) next[x.key] = pad || "strings";
                  });
                  setSecPadVoice(next);
                } }] : []),
              /* Extra tracks (#1, #2, …): the same mute lane as track 0, one per additional
                 drums/perc/bass/pad track a section carries — see the note beside TRACKS_FX. Unlike
                 track 0, an extra track has no "inherit a sensible default" state to fall back to —
                 it only ever carries what was explicitly drawn on it — so muting just writes "off"
                 and unmuting deletes the override, resuming whatever that leaves resolvable. */
              ...["bass", "perc", "pad", "drums"].flatMap(type => {
                const srcFn = type === "bass" ? bassSrcOf : type === "perc" ? percSrcOf
                  : type === "pad" ? padOnOf : drumSrcOf;
                const label = type === "bass" ? "Bass" : type === "perc" ? "Perc" : type === "pad" ? "Pad" : "Drums";
                const nEx = Math.max(0, trackLayerCount(type, GROOVE),
                  ...sections.insts.map(x => trackLayerCount(type, x.key))) - 1;
                return Array.from({ length: nEx }, (_, k) => {
                  const li = k + 1;
                  const on = d => !!srcFn(layered(d, li));
                  if (!sections.insts.some(on)) return null;
                  return { name: label + " " + LAYER_NAMES[li], on, scope: runScope,
                    toggle: r => {
                      const anyIn = r.items.some(on), next = { ...TRACK_PAT_MAPS[type] };
                      r.items.forEach(x => { const lk = x.key + LSEP + li;
                        if (anyIn) next[lk] = "off"; else delete next[lk]; });
                      TRACK_PAT_SETTER[type](next);
                    } };
                }).filter(Boolean);
              }),
              ...Array.from({ length: nParts }, (_, i) => ({
                name: LAYER_NAMES[i], on: d => partIn(d, i),
                scope: runScope,
                // a run can hold several instances; mute them together so the lane matches the
                // click. Sections *inheriting* the groove take the allocation map instead of a
                // layer mute — a copy of the groove written into the section here would stop
                // following the groove the moment it was next edited.
                toggle: r => {
                  const mute = r.items.some(d => partIn(d, i));
                  // per part, not per section: a section can own its A while B still follows the groove
                  const inh = r.items.filter(d => ((secMelos[d.key] || {}).inhParts || {})[i]);
                  const own = r.items.filter(d => !((secMelos[d.key] || {}).inhParts || {})[i]);
                  if (inh.length) setPartOutMany(inh.map(d => d.key), i, mute);
                  if (own.length) setLayerPropMany(own.map(d => d.key), i, { mute });
                },
                // a part with no notes here has nothing to mute — the lane is empty for a reason
                dead: r => !r.items.some(d => hasNotes(d, i)) })),
            ];
            /* Top to bottom as a mixer reads — melody parts, then bass, chords, pad, perc, and the
               drums as the floor of the stack — the same order the Sketch tab's draft matrix uses.
               A stable sort, so the parts keep their A, B, C order. */
            const laneRank = l => l.name.startsWith("Drums") ? 5 : l.name.startsWith("Perc") ? 4
              : l.name.startsWith("Pad") ? 3 : l.name === "Chords" ? 2 : l.name.startsWith("Bass") ? 1 : 0;
            lanes.sort((la, lb) => laneRank(la) - laneRank(lb));
            /* The drawable lanes: the master four, then one low-pass lane per melody part. A part
               lane is that part's Low-pass knob written across the song — the pad opens through
               the build while the bass stays dark — and overrides the knob wherever it is drawn. */
            const autoLanes = [...AUTO_LANES,
              /* One drawn low-pass lane per switched-on track, exactly like the parts' lanes:
                 the bass darkens into the breakdown while the mix stays put, the perc opens
                 across a build, the pad blooms into a drop. Undrawn, the track plays wide open. */
              ...(bassAnywhere ? [{ id: "cutbass", name: "Bass filter",
                tip: "Draw the bass track's own brightness across the song — it darkens or opens while everything else stays put." }] : []),
              ...(percAnywhere ? [{ id: "cutperc", name: "Perc filter",
                tip: "Draw the percussion layer's own brightness across the song — open it through a build, shut it for a verse." }] : []),
              ...(padAnywhere ? [{ id: "cutpad", name: "Pad filter",
                tip: "Draw the pad's own brightness across the song — the classic move is a slow bloom across the whole build." }] : []),
              ...Array.from({ length: nParts }, (_, i) => ({ id: autoPartId(i),
                name: LAYER_NAMES[i] + " filter",
                tip: `Draw part ${LAYER_NAMES[i]}'s own brightness across the song — this part opens or darkens while the rest of the mix stays put. Where it is drawn it overrides the part's Low-pass knob.` }))];
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
            /* ---- the energy staircase ----
               The lanes say what plays; this says how much, which is the only way to see whether
               the song has a shape. Weights from docs/DANCE-LAYERING.md — the clock and the hook
               carry a track, the harmony is worth rather less than people expect, and everything
               else is a point each. What you are looking for is a staircase with deliberate
               collapses: a drop lands because the breakdown took the kick and the sub away, not
               because the drop added anything, and a flat bar across the whole song is exactly the
               shape of a track where everything plays from the first bar to the last. */
            const energyAt = d => energyOf({
              // half a kit, for a pattern with the kick taken out of it: the tops left running
              // under a build are the dip the build is made of, and scoring them as a whole kit
              // would draw the one moment the picture exists to show as no change at all
              drums: drumAmountOf(!effDrum(d) && !ownBeat(d) && grooveDrums
                ? grooveDrums[0] : (DRUMS[effDrum(d) || drum] || {}).pattern),
              chords: !effQuiet(d),
              parts: Array.from({ length: nParts }, (_, i) => partIn(d, i)) });
            const runEnergy = r => r.items.reduce((n, d) => n + energyAt(d), 0) / r.items.length;
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
                  <div className="tlglbl tlgnrg">Energy</div>
                  {autoLanes.map(L => <div key={L.id} className="tlglbl tlgauto">{L.name}</div>)}
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
                      // the effective values, instance first — the strip used to read the section
                      // letter alone, so anything set on one pass was invisible here
                      // both tables have a "none" entry under the empty id, so the id is what
                      // decides whether there is anything to mark, not the lookup
                      const mvId = effMove(r.items[0]), trs = r.items.map(effTrans);
                      const mv = mvId && MOVES[mvId];
                      const tr = trs[0] && TRANS[trs[0]], trMixed = trs.some(x => x !== trs[0]);
                      const n = r.items.length;
                      return (
                        <button key={r.startBar} className={"tlsec" + (now ? " now" : "") + (looped ? " looped" : "")
                            + (selRow === r.row ? " picked" : "")}
                          style={{ flex: r.bars + " 0 0%", background: acc + (now ? "44" : "22"), borderColor: acc + (now ? "" : "77") }}
                          /* A tap picks the section and writes it out below; playing from here
                             moved onto the double tap. Picking is the thing you do constantly and
                             playing is the thing you do deliberately, and a tap that starts the
                             audio is a poor way to ask "what is in this chorus". */
                          onClick={() => {
                            setSelRow(r.row);
                            // showing one section: swap it. Showing all of them: leave that choice
                            // alone and go to the one that was tapped, or the tap does nothing at
                            // all on a page where the section is three screens down.
                            if (focusRow == null) document.querySelector(`.sgrp[data-rows~="${r.row}"]`)
                              ?.scrollIntoView({ behavior: "smooth", block: "start" });
                            else setFocusRow(r.row);
                          }}
                          onDoubleClick={() => startMetro(r.startBar)}
                          title={`${r.sec}${n > 1 ? ` ×${n}` : ""} · ${r.bars} bar${r.bars > 1 ? "s" : ""} from bar ${r.startBar + 1}`
                            + (mv ? ` · ${mv.name}` : "")
                            + (tr ? ` · into it: ${tr.name}${trMixed ? " (first pass)" : ""}` : "")
                            + (looped ? " · looping" : "")
                            + " — tap to open it below, double-tap to play from here"}>
                          {/* the label is left-aligned and clipped rather than centred, so a narrow
                              block truncates to its first letters instead of showing a word's middle */}
                          <span className="tlsecl" style={{ color: acc }}>{r.sec}{n > 1 ? " ×" + n : ""}</span>
                          {/* the transition mark sits at the block's leading edge, because that is
                              where it happens — the seam, not the section */}
                          {tr && <span className="tlmv" aria-hidden="true">{TRANS_GLYPH[tr.cat]}</span>}
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
                          title={dead ? (l.deadTip ? l.deadTip(r)
                              : `${l.name} has nothing written in ${r.sec} — write something there first`)
                            : `${st === "off" ? "Bring in" : "Drop"} ${l.name} for ${l.scope(r)}`
                              + (st === "part" ? " (currently in for some passes and out for others)" : "")} />;
                      })}
                    </div>
                  ))}
                  {/* The staircase. Read-only on purpose: it is the sum of every lane above it,
                      so it is changed by changing them. */}
                  {(() => {
                    const es = runs.map(runEnergy), top = Math.max(1, ...es);
                    /* Relative scaling has nothing to divide by when every section scores the same,
                       and drawing them all full height claims everything is maxed when what is true
                       is that nothing changes across this song. That draws flat instead. */
                    const flat = Math.max(...es) === Math.min(...es);
                    return (
                      <div className="tlrow tlnrg">
                        {runs.map((r, ri) => (
                          <div key={r.startBar} className="tlnrgw" style={{ flex: r.bars + " 0 0%" }}
                            title={`${r.sec} · ${Math.round(es[ri] * 10) / 10} of ${top}`
                              + (flat ? " — level with every other section: nothing changes across this song"
                                : ri > 0 ? (es[ri] > es[ri - 1] ? " — a step up from the section before"
                                : es[ri] < es[ri - 1] ? " — a step down: this is what makes what follows land"
                                : " — level with the section before") : "")
                              + ". Drums and the lead count 3, the chords 2, every other part 1. Energy is relative, not absolute: the biggest event in a dance record is usually a subtraction."}>
                            <div className="tlnrgb" style={{ height: (flat ? 45 : Math.max(7, Math.round(es[ri] / top * 100))) + "%",
                              background: (SEC_COL[r.base] || "#8B94A3") + "CC" }} />
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  {/* Automation lanes. Drag across one to draw a curve; the value is the height
                      you drag at. Drawn in song-bar coordinates so a curve keeps its shape when
                      sections around it move. */}
                  {autoLanes.map(L => {
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
                  {/* one spacer per run, mirroring the rows' own flex bases — see .tlbounds */}
                  <div className="tlbounds" aria-hidden="true">
                    {runs.map(r => <i key={r.startBar} style={{ flex: r.bars + " 0 0%" }} />)}
                  </div>
                  {curSongBar >= 0 &&
                    <div className="tlhead" style={{ left: (curSongBar / total * 100) + "%" }} />}
                </div>
              </div>
              {/* The arrangement editor: a picked structure is a starting point, not a cage. There is
                  nothing to edit without one — a plain loop has no plan, only the loop — so the
                  button is not offered rather than opening onto an empty toolbar. */}
              <div className="row" style={{ gap:"6px 8px", alignItems:"center", flexWrap:"wrap", marginTop:8 }}>
                {sections.insts.length > 1 &&
                  <button className="mini" onClick={() => setFocusRow(v => v == null ? selRow : null)}
                    title={focusRow == null
                      ? "Write out only the section picked on the strip, rather than all of them"
                      : "Write out every section at once, not just the one picked on the strip"}>
                    {focusRow == null ? "▴ One section" : "▾ All sections"}
                  </button>}
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
  })();

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
        .mcell { height:16px; background:var(--bg); border:1px solid var(--line); border-radius:var(--r-sm); cursor:pointer; transition:all .08s; }
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
          .parthdr { gap:8px 12px; }
          .parthdr .lvl { width:120px; height:26px; }
          label.secdrum select { min-height:32px; padding:5px 6px; }
          .selwrap select { min-height:34px; }
        }
        /* ---- a section's instrument tabs and its settings panel ----
           The panel is deliberately a different surface from everything around it. What is in it
           belongs to one instrument in one section — the same pad is a different sound in the
           chorus — and that is not obvious from the controls themselves, so the background has to
           say it. It takes the part's own colour as a tint, so which tab you are on is legible from
           the panel and not only from the tab strip. */
        /* a section's own move and melodic shape, sitting under its chords */
        .secopts { gap:6px 10px; flex-wrap:wrap; align-items:center; margin:5px 0 2px; }
        .secopt { display:inline-flex; align-items:center; gap:4px; font-size:var(--fs-sm); color:var(--muted); }
        /* the word that says what a dropdown controls — the values ("Underwater · stays shut",
           "Chant, then release") name a choice, not the control, so icons alone left the row
           unreadable anywhere tooltips don't exist (every phone) */
        .optlbl { font-size:var(--fs-xs); font-weight:700; letter-spacing:.07em; text-transform:uppercase;
          color:var(--muted); white-space:nowrap; }
        .secopt select { font-size:var(--fs-sm); padding:3px 6px; border-radius:var(--r-sm);
          background:var(--surface-2); color:var(--text); border:1px solid var(--line-2); max-width:220px; }
        @media (max-width: 560px) {
          .secopt select { min-height:30px; }
          .secopt { flex:1 1 100%; }
          .secopt select { flex:1 1 auto; max-width:none; }
        }
        .lytabs { margin-bottom:-1px; position:relative; z-index:1; }
        .lytab { font-size:var(--fs-sm); padding:4px 12px; border:1px solid var(--line-2); border-bottom:none;
          border-radius:var(--r-md) var(--r-md) 0 0; background:var(--surface); color:var(--muted);
          cursor:pointer; display:inline-flex; align-items:center; gap:5px; }
        .lytab:hover { color:var(--text); }
        .lytab.on { background:color-mix(in srgb, var(--ly) 13%, var(--surface-2));
          border-color:color-mix(in srgb, var(--ly) 45%, var(--line-2));
          color:var(--text); box-shadow:inset 0 2px 0 var(--ly); }
        .lytab.lyadd { color:var(--muted); }
        .lydot { font-style:normal; font-size:var(--fs-xs); line-height:1; padding:2px 5px; border-radius:var(--r-pill);
          background:var(--ly, var(--line-3)); color:var(--bg); font-variant-numeric:tabular-nums; }
        .modtab .lydot { background:var(--green); }
        .lyflag { font-style:normal; font-size:var(--fs-xs); color:var(--amber); }
        .partpanel { padding:7px 10px 8px; border-radius:0 var(--r-md) var(--r-md) var(--r-md);
          border:1px solid color-mix(in srgb, var(--ly) 34%, var(--line-2));
          border-left:3px solid color-mix(in srgb, var(--ly) 62%, var(--line-2));
          background:
            linear-gradient(color-mix(in srgb, var(--ly) 14%, transparent), color-mix(in srgb, var(--ly) 5%, transparent)),
            var(--surface-2);
          margin-bottom:8px; }
        .partinstr { flex:1 1 150px; min-width:130px; max-width:280px; }
        .parthdr { margin-bottom:6px; }
        .partname { font-size:var(--fs-sm); font-weight:600; color:var(--ly); letter-spacing:.02em; }
        .modtabs { gap:3px; flex-wrap:wrap; margin:9px 0 7px; border-bottom:1px solid var(--line-2); padding-bottom:6px; }
        .modtab { font-size:var(--fs-sm); padding:3px 9px; border-radius:var(--r-pill); border:1px solid transparent;
          background:transparent; color:var(--muted); cursor:pointer; display:inline-flex; align-items:center; gap:5px; }
        .modtab:hover { color:var(--text); background:var(--hover); }
        .modtab.on { background:var(--surface); border-color:var(--line-2); color:var(--text); }
        /* A grid rather than a wrapping row: 28 controls of different widths in a flex row is a
           staircase, and the labels stop lining up the moment one of them is a word longer. */
        /* Two columns, not three: three fits the height budget and truncates every control's
           label to "off — play the g", which is a worse card than a taller one. */
        .modgrid { display:grid; grid-template-columns:repeat(auto-fill, minmax(232px, 1fr)); gap:5px 11px; }
        .modctl { display:flex; align-items:center; gap:7px; min-width:0; }
        .modlbl { font-size:var(--fs-sm); color:var(--muted); flex:0 0 78px; }
        .modlbl.modon { color:var(--text); font-weight:600; }
        .modval { font-family:ui-monospace,Menlo,monospace; font-size:var(--fs-sm); color:var(--ink);
          min-width:40px; text-align:right; font-variant-numeric:tabular-nums; }
        .modctl .lvl { flex:1 1 60px; min-width:52px; }
        .modctl .fxsel { flex:1 1 60px; min-width:0; }
        .modrst { border:none; background:transparent; color:var(--muted); cursor:pointer; padding:0 2px;
          font-size:var(--fs-sm); line-height:1; }
        .modrst:hover { color:var(--text); }
        @media (max-width: 560px) {
          .modgrid { grid-template-columns:1fr; }
          .lytab { padding:7px 14px; font-size:var(--fs-md); min-height:32px; }
          .modtab { padding:6px 11px; min-height:30px; }
          .modctl .lvl { height:26px; }
        }

        .lybtn { font-size:var(--fs-sm); padding:2px 9px; border-radius:var(--r-pill); border:1px solid var(--line-2); background:var(--surface); color:var(--muted); cursor:pointer; }
        .mcell.b0 { border-left:2px solid var(--line-3); }
        /* The drum rows are binary — a cell is on or it is not — so they can be shorter than the
           melody's without losing anything, which keeps a section card readable at nine rows.
           The label's right edge carries the kit-family ink, so the three parts of a kit are
           legible while every cell is still empty. */
        .mcell.dcell { height:13px; }
        .mnote.dname { border-right:2px solid transparent; padding-right:5px; font-size:var(--fs-xs); }
        /* one header shape for both grids, so they stack rather than sit next to each other */
        .gridhdr { gap:6px; align-items:center; flex-wrap:wrap; margin:8px 0 2px; }
        .gridname { font-size:var(--fs-sm); color:var(--muted); }
        /* The Sketch tab's collapsible bars — one full-width bar per grid, named for what the
           grid holds. The note on the right is the "something is written here" mark. */
        .gridbar { display:flex; align-items:center; gap:7px; width:100%; margin-top:7px;
          padding:7px 11px; border:1px solid var(--line-2); border-radius:var(--r-md);
          background:var(--bg); color:var(--ink); font-family:inherit; font-size:var(--fs-md);
          font-weight:600; cursor:pointer; text-align:left; }
        .gridbar:hover { border-color:var(--line-3); }
        .gridbar.on { border-color:var(--line-3); border-bottom-left-radius:0; border-bottom-right-radius:0; }
        .gridbarcaret { color:var(--muted); }
        .gridbarnote { margin-left:auto; font-size:var(--fs-sm); color:var(--muted); font-weight:400; }
        /* ---- Session view: tracks as columns, clip slots as aligned rows — Ableton's own session
           grid shape, so a track's clip 3 lines up with every other track's clip 3 whether or not
           they're the same length or ever meant to play together. Track headers sit above the
           grid; a scene button in the gutter fires every track's clip at that row at once. Below,
           a plain HTML table for the open clip's own grid — no playhead or drag-paint to draw, so
           it needs none of the Arrange grid's SVG. */
        .sessgridview { display:grid; gap:5px; margin:8px 0; overflow-x:auto; align-items:stretch; }
        .sesscolhdr { background:var(--surface-2); border:1px solid var(--line-2); border-radius:var(--r-md); padding:6px; min-width:0; }
        .sesscolhdr input.txt { width:100%; min-width:0; box-sizing:border-box; }
        .scenebtn { background:var(--surface); border:1px solid var(--line-2); border-radius:var(--r-sm);
          color:var(--muted); cursor:pointer; font-size:var(--fs-xs); padding:0; }
        .scenebtn:hover { color:var(--text); border-color:var(--line-3); }
        .sessslot { font-size:var(--fs-sm); border-radius:var(--r-sm); border:1px solid var(--line-2);
          background:var(--surface); color:var(--muted); cursor:pointer; padding:6px 4px; min-width:0;
          font-variant-numeric:tabular-nums; }
        .sessslot:hover { color:var(--text); border-color:var(--line-4); }
        .sessslot.selopen { border-color:var(--line-3); color:var(--text); }
        .sessslot.queued { background:color-mix(in srgb, var(--blue) 22%, var(--surface)); border-color:var(--blue); color:var(--text); }
        .sessslot.live { background:var(--green); border-color:var(--green); color:var(--bg); font-weight:700; }
        .sessslot.add { color:var(--muted-2); border-style:dashed; }
        .sessslot.empty { border:1px dashed var(--line-2); background:transparent; cursor:default; }
        .sessgridwrap { overflow-x:auto; margin-top:8px; }
        .sessgrid { border-collapse:collapse; }
        .sessgridrow { font-size:var(--fs-sm); color:var(--muted); text-align:right; padding-right:6px; white-space:nowrap; }
        .sessgridcell { width:14px; height:14px; border:1px solid var(--line-2); background:var(--surface); cursor:pointer; padding:0; }
        .sessgridcell.barstart { border-left:2px solid var(--line-3); }
        .sessgridcell.on { border-color:var(--line-3); }
        .sessgridcell:hover { border-color:var(--line-4); }
        .mcell.bt { border-left:1px solid var(--line-2); }
        .mcell.mv { touch-action:none; }
        .mscroll.mvmode { user-select:none; -webkit-user-select:none; touch-action:none; }
        .mcell.msel { outline:2px solid var(--blue); outline-offset:-1px; box-shadow:inset 0 0 0 2px rgba(110,168,255,.35); }
        .mcell.mbox { background:rgba(110,168,255,.22); border-color:var(--blue); }
        .mcell.mghost { background:rgba(110,168,255,.5); border-color:var(--blue); }
        .melmodebar { display:flex; flex-wrap:wrap; align-items:center; gap:7px; margin-bottom:6px; }
        .melmodebar .rlbl { font-size:var(--fs-md); color:var(--muted); margin:0 2px; }
        .mscroll { overflow-x:auto; padding-bottom:4px; }
        /* The row labels live inside the scroller, so a section wider than the panel used to scroll
           its own legend away — nine drum rows of unlabelled cells. Pinning the gutter keeps
           "Snare" beside the snare wherever you have scrolled to. */
        .mline > .mnote, .mline > span:first-child { position:sticky; left:0; z-index:2;
          background:var(--surface); }
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
        /* An off cell has to read as a slot that is empty, not as no slot at all. It used to be
           --raised on the strip's --bg — a few percent apart, so dropping a layer looked like the
           row had lost its sections rather than the layer having gone out. Sunk below the strip
           with a rim around it, it reads as a hole, which is what it is. */
        .tlcell.off { background:var(--sunk); box-shadow:inset 0 0 0 1px var(--line-3); }
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
        /* the energy staircase: one bar per section, height = what is playing in it */
        .tlnrg { height:26px; align-items:flex-end; }
        .tlnrgw { min-width:0; display:flex; align-items:flex-end; height:100%;
          border-bottom:1px solid var(--line-2); }
        .tlnrgb { width:100%; border-radius:var(--r-xs) var(--r-xs) 0 0; transition:height .12s; }
        .tlgnrg { height:26px; line-height:26px; }
        .tlgauto { height:30px; line-height:30px; }
        /* what a template did, said in words beside the strip that draws it */
        .tplnote { margin-top:9px; padding:8px 11px 9px; background:var(--bg);
          border:1px solid var(--line-2); border-left:3px solid ${GOLD}; border-radius:var(--r-lg); }
        .tlhead { position:absolute; top:14px; bottom:0; width:2px; background:${GOLD}; border-radius:var(--r-xs);
          pointer-events:none; box-shadow:0 0 6px ${GOLD}AA; z-index:4; }
        /* Section boundaries, drawn down the whole strip. Two sections that letter the same way get
           the same colour, so a 2px gap between them was the only thing saying where one stopped —
           at which point a run of choruses reads as one long chorus. A seam that carries through
           the section row, every lane, the staircase and the automation is what makes a column a
           column.

           Laid out as a flex row with the same bases and the same gap as the rows themselves, so
           the lines land on the seams with no arithmetic and no drift as sections are added. The
           line is an inset shadow rather than a border because a border would widen each item by a
           pixel and walk the overlay out of step with the rows it is meant to be tracking. */
        .tlbounds { position:absolute; left:0; right:0; top:14px; bottom:0; display:flex; gap:2px;
          pointer-events:none; z-index:3; }
        .tlbounds > i + i { box-shadow:inset 1px 0 0 var(--line-4); }
        @media (max-width:560px) { .tlgut { flex-basis:44px; } .tlglbl { font-size:var(--fs-micro); } }
        .sgrp { border:1.5px solid var(--line-2); border-radius:var(--r-lg); padding:2px 11px 9px; margin-top:11px; }
        .sgrp .arr:first-of-type { border-top:none; padding-top:2px; }
        .arr.playnow { background:var(--hover); border-radius:var(--r-md); padding:9px 10px 10px; border-top-color:transparent; margin-top:6px; }
        .arr.playnow + .arr { border-top-color:transparent; }
        .sgrphdr { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:7px; flex-wrap:wrap; }
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
          <button className={"playbtn" + (playing ? " on" : "")}
            title={tab === "sketch" ? "Play or stop the groove loop (space bar) — the Sketch tab plays its groove, not the song"
              : tab === "session" ? "Start or stop the Session transport (space bar) — launches whatever clips are armed, not the song"
              : "Play or stop (space bar)"}
            onClick={playTransport}>
            {playing ? "■ Stop" : tab === "sketch" ? "▶ Groove" : tab === "session" ? "▶ Session" : "▶ Play"}
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
          {/* The Lead insert-fx rack: one shared bus all six melody parts feed into (see the note
              beside TRACKS_FX), so it has no per-part panel to live inside — it sits here instead,
              by the voice that plays it, the same collapsible-with-a-badge shape as the Track
              effects panels below. */}
          {(() => {
            const leadFx = fxRack.lead || [];
            const leadOn = leadFx.filter(s => s && s.type && s.type !== "off").length;
            const leadFxOpen = !!openFx.lead;
            return (<>
              <button className="mini" onClick={() => setOpenFx({ ...openFx, lead: !leadFxOpen })}
                title="Insert effects on the shared bus all six melody parts feed into — chorus, flanger, phaser, bitcrusher, compressor, stereo widener.">
                {leadFxOpen ? "▾" : "▸"} 🎵 Lead FX{leadOn ? " ● " + leadOn : ""}
              </button>
              {leadFxOpen && (
                <div style={{ marginTop:6 }}>
                  {fxSlotRow(leadFx, 0, next => setFxRack({ ...fxRack, lead: next }))}
                  {fxSlotRow(leadFx, 1, next => setFxRack({ ...fxRack, lead: next }))}
                </div>
              )}
            </>);
          })()}

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
            {/* the tracks' sounds live here with the kit; their patterns live on the sections */}
            <label className="selwrap" style={{ minWidth:150 }}>
              <span className="lbl" style={{ margin:0 }}>Perc kit</span>
              <select value={percKit} onChange={e => setPercKitSt({ key: progId, val: e.target.value })}
                title="How the percussion layer is voiced — struck by hand, or the drum machine's fixed-pitch idea of the same instruments">
                {PERC_KITS.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
            <label className="selwrap" style={{ minWidth:140 }}>
              <span className="lbl" style={{ margin:0 }}>Bass sound</span>
              <select value={bassVoice} onChange={e => setBassVoiceSt({ key: progId, val: e.target.value })}
                title="What the bassline is played on — all synth, so it sounds the same offline and in a render. The line itself is written on the sections.">
                {BASS_VOICES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
            <label className="selwrap" style={{ minWidth:140 }}>
              <span className="lbl" style={{ margin:0 }}>Pad sound</span>
              <select value={pad} onChange={e => setPadSt({ key: progId, val: e.target.value })}
                title="The song's default pad voice — what a section's '— as the song —' plays. Each section can still pick its own, or none.">
                <option value="">No pad — sections choose</option>
                {PAD_VOICES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
          </div>
          {tips && <p className="keytag" style={{ marginTop:4 }}>
            The sounds live here; the patterns live on the sections in the Arrange tab — each pass
            picks its bass, perc and pad there, and bass and perc open on their own grids beside
            the drum grid.
          </p>}

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

          {/* ---- per-track effects ----
              The part mixer's audio stage, one collapsible panel per track. Same controls, same
              renderer — including that track's own insert-fx rack, behind its FX tab — so a
              badge counts what a closed panel is doing and nothing hides behind a second section. */}
          <div className="grouphdr">Track effects</div>
          {TRACKS_FX.map(([trId, trName, icon]) => {
            const fx = trackFx[trId] || {};
            const openP = !!openFx[trId];
            const mods = TRACK_MODS.filter(md => !(trId === "drums" && md.k === "duck"));
            const nOn = mods.reduce((n2, md) =>
              n2 + ((fx[md.k] != null && fx[md.k] !== md.dflt) ? 1 : 0), 0);
            return (
              <div key={trId} style={{ marginTop:6 }}>
                <button className="mini" onClick={() => setOpenFx({ ...openFx, [trId]: !openP })}
                  title={"Effects on the whole " + trName.toLowerCase() + " track — filter, drive, wobble, tremolo, pan, echo and reverb sends, and its own pump."}>
                  {openP ? "▾" : "▸"} {icon} {trName}{nOn ? " ● " + nOn : ""}
                </button>
                {openP && trackFxRow(trId)}
              </div>
            );
          })}

          {/* ---- insert-effects rack: master ----
              A second, independent processing stage — chorus, flanger, phaser, a bitcrusher, a
              compressor, a stereo widener, and a second drive stage — on top of the
              filter/drive/pan chain every track and part already has above. Drums, Perc, Bass and
              Pad each keep their own rack behind their own instrument's FX tab above (and again,
              per section, in Arrange/Sketch); Lead's shared rack sits by its voice picker above.
              Master is the one bus with no instrument of its own to live inside — it sits just
              before the limiter, colouring the whole song, drums included — so it keeps this
              small dedicated spot, with no bus picker now that it is the only bus left here. */}
          <div className="grouphdr">Master FX</div>
          {fxSlotRow(fxRack.master, 0, next => setFxRack({ ...fxRack, master: next }))}
          {fxSlotRow(fxRack.master, 1, next => setFxRack({ ...fxRack, master: next }))}
          {tips && <p className="arrnote" style={{ marginTop:4 }}>
            Slots run in order, after everything else, just before the limiter — it colours the
            whole song, drums included. Skipped on stem exports, the same as the limiter, so a
            stem sums cleanly and this kind of processing belongs in your DAW. Master has no
            per-section override — it is the same for the whole song.
          </p>}

        </div>}

        {/* ---- Sketch: the full groove, then the arrangement that subtracts from it ----
            Dance music is subtractive, so the workflow runs top to bottom on this one page:
            build the full groove as a single section — every track playing at once, with its
            grids and settings — then build the running order underneath and use the lanes to
            decide which sections play which of the groove's tracks. */}
        {tab === "sketch" && <div className="panel accent">
          <div className="progtitle" style={{ fontSize:17 }}>The groove — build the full loop</div>
          {tips && <p className="arrnote" style={{ marginTop:4 }}>
            Everything at once: drums, perc, bass, pad, chords and melody, written on one looping
            section. Every section of the song plays this groove until it is given something of its
            own — so the loop you perfect here is the material the whole track is cut from.
          </p>}
          {/* the optional overall style — one choice that starts every track from that style's
              patterns. Blank unless the menus actually spell one of its rows. */}
          <div className="row secopts" style={{ marginTop:6 }}>
            <label className="secopt"
              title="Optional: start every track from one style's patterns — drums, bass, perc and pad at once. Each track's own menu, inside its bar below, can still be changed after, and painting a grid still makes the pattern yours.">
              <span className="optlbl"><span aria-hidden="true">🎚</span> Overall style</span>
              <select value={sketchStyle} onChange={e => applySketchStyle(e.target.value)}>
                <option value="">— optional — pick a style…</option>
                {STYLE_PRESETS.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
          </div>
          {sectionCard(grooveInst, "groove", { groove: true })}
          <div className="progtitle" style={{ fontSize:17, marginTop:14 }}>The arrangement draft — what plays where</div>
          {tips && <p className="arrnote" style={{ marginTop:4 }}>
            A draft, on purpose: nothing here touches the song until you write it. Add intro, build,
            drop and breakdown — each section arrives <i>silent</i> — then click the cells to fill
            it with the groove's instruments: drums alone for the intro, bass and pads with no kick
            for the build, everything for the drop. When the shape is right, press
            <b> ✍ Write to Arrange</b>: the draft becomes the song's arrangement, every section
            playing exactly what you filled in, and each pass can then be refined on the Arrange
            tab — its own grids, melodies, transitions and sweeps.
          </p>}
          {sketchDraft()}
        </div>}

        {/* ---- Session: a live, per-instrument clip launcher, à la Ableton's session view ---- */}
        {tab === "session" && (() => {
          const sessLeadOpts = () => (<>
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
          const selTrack = sessionTracks.find(t => t.id === sessionSel.trackId);
          const selClip = selTrack && selTrack.clips.find(c => c.id === sessionSel.clipId);
          // one chord per clip bar — the plain loop repeated, padded even exactly as the
          // scheduler's own seq is, so the workbench's chord headers and chord-aware suggestions
          // describe what a launched clip actually plays over
          const sessSeq = chords.length % 2
            ? [...chords.map((_, i) => i), chords.length - 1] : chords.map((_, i) => i);
          const selD = selTrack && selClip
            ? { key: sessionKey(selTrack.id, selClip.id), base: sessionKey(selTrack.id, selClip.id),
                nbars: selClip.nbars, startBar: 0,
                cs: Array.from({ length: selClip.nbars }, (_, b) =>
                  chords[sessSeq.length ? sessSeq[b % sessSeq.length] : 0]).filter(Boolean),
                // how the duel (or anything else) loops this clip: launch it — idempotent when
                // it is already the track's live clip
                launch: () => {
                  if (!sessionPlaying || sessionLive[selTrack.id] !== selClip.id)
                    launchSessionClip(selTrack.id, selClip.id);
                } }
            : null;
          const beatCell = (bi, si, on, ink, onClick) => (
            <td key={bi + "_" + si}
              className={"sessgridcell" + (on ? " on" : "") + (si === 0 ? " barstart" : "")}
              style={on ? { background: ink } : undefined} onClick={onClick} />
          );
          const beatGridUI = (rows, bars, onTap, multi) => (
            <div className="sessgridwrap">
              <table className="sessgrid"><tbody>
                {rows.map(([ch, name, tip, ink]) => (
                  <tr key={ch}>
                    <td className="sessgridrow" style={{ color: ink }} title={tip}>{name}</td>
                    {bars.map((bar, bi) => bar.map((step, si) =>
                      beatCell(bi, si, multi ? step.includes(ch) : step === ch, ink, () => onTap(bi, si, ch))))}
                  </tr>
                ))}
              </tbody></table>
            </div>
          );
          const TYPE_ROWS = { drums: DRUM_VOICES, perc: PERC_VOICES, bass: BASS_ROWS, pad: PAD_ROWS, chords: CHORD_ROWS };
          const TYPE_BARS = { drums: beatBars, perc: percGridBars, bass: bassGridBars, pad: padGridBars, chords: chordGridBars };
          const TYPE_TAP  = { drums: tapBeat, perc: tapPerc, bass: tapBass, pad: tapPad, chords: tapChordBeat };
          const clipEditor = () => {
            if (!selTrack || !selClip || !selD) return <p className="keytag">Pick a clip above to edit it.</p>;
            const d = selD;
            if (selTrack.type === "melody") {
              // a clip can hold more than one instrument of its own, exactly like a section can
              // ("add another instrument") — the same tabs, the same addLayer/removeLayer, just
              // pointed at the clip's own key instead of a section's
              const sec = secMelos[d.key] || EMPTY_SEC;
              const nL = nLayers(sec);
              const secL = Math.min(secPart[d.key] || 0, nL - 1);
              const ly = layerOf(sec, secL) || {};
              const set = patch => setLayerProp(d.key, secL, patch);
              const grp = sessionModGrp;
              return (<>
                <div className="row lytabs" style={{ gap:5, marginBottom:6 }}>
                  {sec.layers.map((l, li) => (
                    <button key={li} className={"lytab" + (secL === li ? " on" : "")} style={{ "--ly": LAYER_INK[li] }}
                      title={"Part " + LAYER_NAMES[li]} onClick={() => setSecPart({ ...secPart, [d.key]: li })}>
                      {LAYER_NAMES[li]}
                      {l.mute ? <i className="lyflag">m</i> : l.solo ? <i className="lyflag">s</i> : null}
                    </button>
                  ))}
                  {nL < MAX_LAYERS &&
                    <button className="lytab lyadd" onClick={() => addLayer(d.key)}
                      title="Add another instrument to this clip">＋</button>}
                  {secL > 0 &&
                    <button className="mini" onClick={() => removeLayer(d.key, secL)}
                      title={"Remove part " + LAYER_NAMES[secL]}>🗑</button>}
                </div>
                <div className="row" style={{ gap:6, alignItems:"center", flexWrap:"wrap" }}>
                  <select className="fxsel" value={ly.instr || ""}
                    title="The instrument this part plays" onChange={e => setSecInstr(d.key, secL, e.target.value)}>
                    {sessLeadOpts()}
                  </select>
                  <span className="modlbl" style={{ marginLeft:2 }}>Octave</span>
                  <div className="row" style={{ gap:4, alignItems:"center" }}>
                    <button className="mini" disabled={(ly.oct || 0) <= LAYER_OCT_MIN}
                      onClick={() => set({ oct: Math.max(LAYER_OCT_MIN, (ly.oct || 0) - 1) })}>−</button>
                    <span className="modval">{ly.oct > 0 ? "+" + ly.oct : (ly.oct || 0)}</span>
                    <button className="mini" disabled={(ly.oct || 0) >= LAYER_OCT_MAX}
                      onClick={() => set({ oct: Math.min(LAYER_OCT_MAX, (ly.oct || 0) + 1) })}>＋</button>
                  </div>
                  <label className="modctl">
                    <span className="modlbl">Level</span>
                    <input className="lvl" type="range" min="0" max="100" value={Math.round((ly.vol == null ? 1 : ly.vol) * 100)}
                      onChange={e => set({ vol: +e.target.value / 100 })} />
                    <span className="modval">{Math.round((ly.vol == null ? 1 : ly.vol) * 100)}%</span>
                  </label>
                  <button className={"mini" + (ly.mute ? " mixon" : "")} onClick={() => set({ mute: !ly.mute })}>
                    {ly.mute ? "muted" : "mute"}</button>
                  {nL > 1 && <button className={"mini" + (ly.solo ? " mixon" : "")} onClick={() => set({ solo: !ly.solo })}>
                    {ly.solo ? "soloed" : "solo"}</button>}
                </div>
                <div className="row modtabs">
                  {MOD_GROUPS.map(g => {
                    const n = g.mods.reduce((a, md) => a + (modOf(ly, md.k) !== md.dflt ? 1 : 0), 0);
                    return (
                      <button key={g.id} className={"modtab" + (grp === g.id ? " on" : "")} title={g.tip}
                        onClick={() => setSessionModGrp(g.id)}>{g.name}{n > 0 && <i className="lydot">{n}</i>}</button>
                    );
                  })}
                </div>
                <div className="modgrid">
                  {(MOD_GROUPS.find(g => g.id === grp) || MOD_GROUPS[0]).mods
                    .filter(md => !md.needs || modOf(ly, md.needs) !== MOD_BY_KEY[md.needs].dflt)
                    .map(md => <ModCtl key={md.k} mod={md} ly={ly} onSet={set}
                      disabled={md.needsDelay && delayId === "off"} />)}
                </div>
                {/* the full melody workbench a section gets — Write with draw/move/vary/syncopate,
                    Suggest, Check and Duel, and the real note grid — shared, not re-implemented */}
                {melodyWorkbench(d, sec, secL)}
              </>);
            }
            const rows = TYPE_ROWS[selTrack.type], getBars = TYPE_BARS[selTrack.type], tapFn = TYPE_TAP[selTrack.type];
            if (!rows) return null;
            const type = selTrack.type;
            const multi = type === "drums" || type === "perc";
            // a clip can hold extra drums/bass/pad/perc sub-tracks of its own — the same "add a
            // 2nd bassline" a section gets — via the exact tab strip a section's own track uses;
            // it only needs d.key, which a clip's synthetic key satisfies just as well
            const subLi = activeLayerOf(type, d.key);
            const subD = layered(d, subLi);
            // …and, like a section, a "starts from" pattern of its own per sub-track, plus the
            // Reset that hands the grid back to that menu. Chords has no catalogue to pick from —
            // its rhythm is the strum, and the grid is the way to change it.
            const TYPE_RESET = { drums: resetBeat, perc: resetPercBeat, bass: resetBassBeat, pad: resetPadBeat, chords: resetChordBeat };
            const TYPE_PICK_OPTS = {
              // the drum catalogue carries its own "off" row — the header already offers one
              drums: () => metricDrums.filter(([id]) => id !== "off").map(([id, dd]) => [id, dd.name]),
              perc: () => Object.entries(PERCS).map(([id, p]) => [id, p.name]),
              bass: () => Object.entries(BASS).map(([id, b]) => [id, b.name]),
              pad: () => PAD_VOICES.map(([id, name]) => [id, name]),
            };
            const patMap = TRACK_PAT_MAPS[type], patSet = TRACK_PAT_SETTER[type];
            const beatMap = type === "chords" ? secChordBeat : TRACK_BEAT_MAPS[type];
            const own = !!(beatMap && beatMap[subD.key] && beatMap[subD.key].length);
            const pickNow = (patMap && patMap[subD.key]) || "";
            return (<>
              <div className="row gridhdr">
                {trackTabStrip(type, d)}
                {patMap && <label className="secopt"
                  title={"The " + (type === "pad" ? "voice" : "pattern") + " this "
                    + (subLi ? "sub-track" : "clip") + " starts from — paint the grid to make it your own"}>
                  <span className="optlbl">starts from</span>
                  <select value={pickNow}
                    onChange={e => { patSet(prev => ({ ...prev, [subD.key]: e.target.value }));
                      if (own) TYPE_RESET[type](subD.key); }}>
                    <option value="">{subLi ? "— silent —" : "song default"}</option>
                    <option value="off">off — silent</option>
                    {TYPE_PICK_OPTS[type]().map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                  </select>
                </label>}
                {own && <button className="mini" onClick={() => TYPE_RESET[type](subD.key)}
                  title="Hand this grid back to the menu — unwritten, it plays the pattern chosen above">↺ Reset</button>}
              </div>
              {beatGridUI(rows, getBars(subD), (bi, si, ch) => tapFn(subD, bi, si, ch), multi)}
            </>);
          };
          return (
            <div className="panel">
              <p className="sub">A live clip launcher, in the spirit of Ableton's Session view. Add an
                instrument, drums, bass, pad, perc or the chord rhythm as a column, give it a few
                numbered clips — different notes, a different sound, a different mod setting — then
                click one to launch it. A launch is quantized to the next bar once the room is
                running; click <b>▶ Session</b> (or the space bar) to start it. The clip open below
                edits exactly the way a section does on the Arrange tab, just detached from any one
                place in the song.</p>
              <div className="row" style={{ gap:6, flexWrap:"wrap", margin:"8px 0" }}>
                {TRACK_TYPES.map(tt => (
                  <button key={tt.id} className="mini" title={tt.tip} onClick={() => addSessionTrack(tt.id)}>
                    {tt.icon} + {tt.name}</button>
                ))}
              </div>
              {!sessionTracks.length && <p className="keytag">No tracks yet — add one above to start building the room.</p>}
              {sessionTracks.length > 0 && (() => {
                // one more row than the deepest track, so every column always shows its own
                // "add a clip" slot below its last one — Ableton's own end-of-track empty stack
                const maxRows = Math.max(0, ...sessionTracks.map(t => t.clips.length)) + 1;
                const launchScene = row => sessionTracks.forEach(tr => {
                  const c = tr.clips[row]; if (c) launchSessionClip(tr.id, c.id);
                });
                return (
                  <div className="sessgridview"
                    style={{ gridTemplateColumns: `26px repeat(${sessionTracks.length}, minmax(104px, 1fr))` }}>
                    <div aria-hidden="true" />
                    {sessionTracks.map(tr => {
                      const type = TRACK_TYPE_BY_ID[tr.type] || {};
                      return (
                        <div key={tr.id} className="sesscolhdr">
                          <div className="row" style={{ gap:4, alignItems:"center" }}>
                            <span title={type.tip} aria-hidden="true">{type.icon}</span>
                            <input className="txt" value={tr.name} onChange={e => renameSessionTrack(tr.id, e.target.value)} />
                          </div>
                          <div className="row" style={{ gap:4, marginTop:4 }}>
                            <button className="mini" onClick={() => stopSessionTrack(tr.id)} title="Stop this track">■</button>
                            <button className="mini" onClick={() => removeSessionTrack(tr.id)} title="Remove this track">🗑</button>
                          </div>
                        </div>
                      );
                    })}
                    {Array.from({ length: maxRows }, (_, row) => (
                      <div key={row} style={{ display:"contents" }}>
                        <button className="scenebtn" title={`Launch row ${row + 1} — every track's clip ${row + 1} at once, on the next bar`}
                          onClick={() => launchScene(row)}>▶</button>
                        {sessionTracks.map(tr => {
                          const c = tr.clips[row];
                          if (c) {
                            const isLive = sessionLive[tr.id] === c.id, isQueued = sessionQueued[tr.id] === c.id;
                            const isSel = sessionSel.trackId === tr.id && sessionSel.clipId === c.id;
                            return (
                              <button key={tr.id}
                                className={"sessslot" + (isLive ? " live" : "") + (isQueued ? " queued" : "") + (isSel ? " selopen" : "")}
                                title={`Clip ${c.num} · ${c.nbars} bar${c.nbars === 1 ? "" : "s"} — click to launch, or open its editor below`}
                                onClick={() => { setSessionSel({ trackId: tr.id, clipId: c.id }); launchSessionClip(tr.id, c.id); }}>
                                {isLive ? "▶ " : isQueued ? "… " : ""}{c.num}
                              </button>
                            );
                          }
                          if (row === tr.clips.length) return (
                            <button key={tr.id} className="sessslot add" onClick={() => addSessionClip(tr.id)}
                              title="Add another clip to this track">＋</button>
                          );
                          return <div key={tr.id} className="sessslot empty" aria-hidden="true" />;
                        })}
                      </div>
                    ))}
                  </div>
                );
              })()}
              {sessionSel.trackId && selTrack && (
                <div className="panel" style={{ marginTop:10 }}>
                  <div className="row" style={{ gap:6, alignItems:"center", flexWrap:"wrap" }}>
                    <span className="partname">{selTrack.name}{selClip ? " · clip " + selClip.num : ""}</span>
                    {selClip && <label className="modctl" style={{ marginLeft:"auto" }} title="How many bars this clip loops over">
                      <span className="modlbl">Bars</span>
                      <input type="number" min="1" max="32" value={selClip.nbars} style={{ width:48 }}
                        onChange={e => setSessionClipLen(selTrack.id, selClip.id, +e.target.value || 1)} />
                    </label>}
                    {selClip && selTrack.clips.length > 1 &&
                      <button className="mini" onClick={() => removeSessionClip(selTrack.id, selClip.id)}>🗑 clip</button>}
                  </div>
                  {clipEditor()}
                </div>
              )}
            </div>
          );
        })()}

        {/* ---- Save: naming, keeping, sharing — and judging cold ---- */}
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
                {(sketches || []).map((s, i) => (
                  <option key={i} value={i}>{(s.review && s.review.v === "keep" ? "😍 " : "") + s.name}</option>
                ))}
              </select>
            )}
            {ioNote && <span className="keytag">{ioNote}</span>}
          </div>
          {/* The morning review: the saved sketches heard back to back, cold, with a verdict tap on
              each. The test that actually matters for a hook is the one taken days later. */}
          <div className="row" style={{ marginTop:10, gap:"6px 8px", alignItems:"center", flexWrap:"wrap" }}>
            {!review ? (<>
              <button className="btn" style={{ padding:"5px 11px" }} disabled={!(sketches || []).length}
                onClick={startReview}
                title={"Play every saved sketch back to back, cold — never-reviewed ones first — with a keep / rework / kill "
                  + "verdict on each. Your current song is stashed and comes back exactly as it was when the review ends."}>
                ☕ Morning review{(sketches || []).length ? ` · ${(sketches || []).length}` : ""}</button>
              {tips && <span className="keytag">Catchiness is judged cold, not in the session it was written — everything sounds like a hook at midnight.</span>}
            </>) : (<>
              <span className="keytag">☕ {review.idx + 1} / {review.order.length} · <b>{review.order[review.idx]}</b> — playing</span>
              <button className="mini" onClick={() => reviewNext("keep")}
                title="Still good cold — mark it a keeper and hear the next">😍 Keep</button>
              <button className="mini" onClick={reviewRework}
                title="It earned another session — leave it loaded and end the review here">🔧 Rework</button>
              <button className="mini" onClick={() => reviewNext("kill")}
                title="It did not survive the night — delete it (one step of undo while the review is open)">🗑 Kill</button>
              <button className="mini" onClick={() => reviewNext(null)} title="No verdict today — next">▸ Skip</button>
              {review.lastKill && <button className="mini" onClick={undoKill}
                title="Put the last killed sketch back">↩ un-kill “{review.lastKill.sketch.name}”</button>}
              <button className="mini" onClick={() => endReview(false)}
                title="Close the review and put your song back as it was">✕ Close</button>
            </>)}
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
            {structPicker()}
          </div>
          <div className="row" style={{ justifyContent:"space-between", alignItems:"center", marginTop:6, gap:"6px 8px", flexWrap:"wrap" }}>
            <span className="keytag" style={{ margin:0 }}>Recreate a famous track</span>
            {trackPicker()}
          </div>
          {curTrackPreset && (
            <div className="tplnote" style={{ marginTop:6 }}>
              <div className="row" style={{ gap:"6px 8px", alignItems:"baseline", flexWrap:"wrap" }}>
                <b style={{ color:GOLD }}>{curTrackPreset.artist} — {curTrackPreset.name}</b>
                <span className="keytag" style={{ margin:0 }}>{curTrackPreset.year} · {curTrackPreset.bpm} bpm · {keyLabel}</span>
              </div>
              <p className="arrnote" style={{ marginTop:5 }}>{curTrackPreset.tip}</p>
              {/* The distinction that matters most here, so it's on screen rather than only in a
                  chat reply: everything provably factual about the record — tempo, key, chord
                  shape, arrangement, groove — is set to match it closely. The lead line is not a
                  copy of anything; it's this app's own generator, steered toward the record's
                  melodic character (register, repetition, syncopation) rather than its notes. */}
              <p className="keytag" style={{ margin:"4px 0 0" }}>
                Tempo, key, chords, arrangement and groove are set to match the record closely. The
                melody is not a copy of it — this app never ships a transcribed hook, so the lead
                line is its own generated tune, steered toward the record's register, repetition and
                syncopation. Write over it, or pick a different melodic narrative, any time.
              </p>
            </div>
          )}

          {/* What a template did, and how to put it back. A template writes across five different
              controls at once — the drum menus, the chords, the parts, the moves and transitions,
              the automation lanes — and a change nobody can see is indistinguishable from one that
              did not happen, so it says so here and the strip below draws the result. */}
          {curTpl && (
            <div className="tplnote">
              <div className="row" style={{ gap:"6px 8px", alignItems:"baseline", flexWrap:"wrap" }}>
                <b style={{ color:GOLD }}>{curTpl.name}</b>
                <span className="keytag" style={{ margin:0 }}>
                  {curTpl.bpm} bpm · {(DRUMS[curTpl.drum] || {}).name || "the song's drums"}
                  {curTpl.kit ? " · " + ((DRUM_KITS.find(([k]) => k === curTpl.kit) || [])[1] || curTpl.kit) : ""}
                  {curTpl.bass && BASS[curTpl.bass] ? " · " + BASS[curTpl.bass].name + " bass" : ""}
                </span>
                <button className="mini" style={{ marginLeft:"auto" }}
                  onClick={() => applyArrangement(effPlan || curTpl.plan, selStruct)}
                  title="Write the arrangement over the sections again — after moving, copying or lengthening one, or after changes you would rather throw away. The sections themselves are left as they are.">↻ Re-apply arrangement</button>
              </div>
              <p className="arrnote" style={{ marginTop:5 }}>{curTpl.tip}</p>
              {tips && <p className="keytag" style={{ margin:"4px 0 0" }}>
                Sets what each section <i>plays</i>, not just the order: which lose the drums, which
                lose the chords, which parts are in, the filter shape across each one and what happens
                at every seam. Every one of those is an ordinary control afterwards — the lanes on the
                strip below toggle them a section at a time.
              </p>}
            </div>
          )}

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
            {narUndo && narSel.key === progId && <button className="mini" onClick={undoNarrative}
              title="Put the melodies back as they were before the narrative was written">↶ Undo</button>}
            {/* How finely you can write, which is not the same decision as how the chords are
                strummed — it used to be read off the strum pattern, so a sixteenth grid meant
                picking a sixteenth strum and changing the sound to get it. */}
            <select value={gridSt.key === progId ? gridSt.val : ""}
              onChange={e => setGridSt({ key: progId, val: e.target.value })}
              style={{ flex:"0 1 170px" }}
              title={"How finely the melody grid divides a beat — " + meloBeats + " columns a bar at the moment. "
                + (MEL_GRIDS.find(g => g[0] === (gridSt.key === progId ? gridSt.val : ""))|| [])[2]
                + " Changing it re-times what you have written, so every note keeps the moment it sounds at."}>
              {MEL_GRIDS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </div>
          {/* the narrative's phrasing dials. Variation is a continuous slider, not a menu — the
              fraction becomes a deterministic per-pass coin toss on one extra edit, so 1.4 really
              does sit between 1 and 2. The slider rewrites on release rather than on every tick,
              so dragging it doesn't bury the undo history under sixty intermediate songs. */}
          <div className="row" style={{ marginTop:6, gap:"6px 10px", alignItems:"center", flexWrap:"wrap" }}>
            <span className="keytag" style={{ margin:0 }}
              title="How much each repeat of a section differs from its first time round — a new landing note, a note added or taken away, a phrase pushed early, a held note broken in two. The first time is always left alone. Continuous: anywhere on the dial is a real setting.">
              Vary repeats</span>
            <input type="range" min={0} max={VARY_MAX} step={0.05} value={varyAmt}
              onChange={e => setVarySt({ key: progId, val: +e.target.value })}
              onPointerUp={e => { if (narId) applyNarrative(narId, +e.target.value); }}
              onKeyUp={e => { if (narId) applyNarrative(narId, +e.target.value); }}
              style={{ flex:"1 1 140px", minWidth:110 }}
              title="Slide right for wilder repeats — released, it rewrites the narrative at the new amount. The left end means every repeat is identical." />
            <span className="keytag" style={{ margin:0, minWidth:96 }}>{varyWords(varyAmt)} · {varyAmt.toFixed(2)}</span>
            <select value={narSync} onChange={e => { const v = +e.target.value;
                setNarSyncSt({ key: progId, val: v }); if (narId) applyNarrative(narId, varyAmt, v); }}
              style={{ flex:"0 1 180px" }}
              title="Syncopate the narrative as it writes: on-beat notes pushed half a beat early and held through the beat they left — the lean that carries most pop and house toplines. Backbeats first, or every beat but the downbeat.">
              {SYNC_LEVELS.map(([v, label]) => <option key={v} value={v}>{v ? "Syncopate — " + label : "No syncopation"}</option>)}
            </select>
            <label className="keytag" style={{ margin:0, display:"inline-flex", gap:5, alignItems:"center", cursor:"pointer" }}
              title="Also vary the repeats INSIDE each section: the one-bar riff said four times, the two-bar hook said twice — every restatement after the first drifts by the slider's amount, so a section isn't the same bar photocopied. The first statement always stays as written.">
              <input type="checkbox" checked={narWithin} onChange={e => { const v = e.target.checked;
                setNarInSt({ key: progId, val: v }); if (narId) applyNarrative(narId, varyAmt, narSync, v); }} />
              vary within repeats too
            </label>
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
            <button className="btn" style={{ padding:"5px 11px" }} onClick={exportAls}
              title="Export as an Ableton Live Set — named, coloured tracks laid out as an arrangement, at this tempo, with every section a locator on the ruler and the drawn Level lane as master-volume automation. Each track's info text carries its settings. The tracks arrive without instruments (a Web Audio synth is not something Live can be handed), so drop your own on each and use the stems as the reference for how it should sound.">↓ Live Set</button>
            <button className="btn" style={{ padding:"5px 11px" }} onClick={exportLiveProject}
              disabled={rendering || stemming || claudeExporting || projExporting}
              title="The whole handoff in one zip, laid out like a Live project: the .als, the stems in Samples/Imported beside it, and the settings snapshot. Open the set, drag the stems onto the arrangement at 1.1.1, and the project plays the sketch while you rebuild each sound on its MIDI track.">
              {projExporting ? pctLabel("Bouncing") : "↓ Live project"}</button>
            <button className="btn" style={{ padding:"5px 11px" }} onClick={exportChart}
              title="A plain-text chord chart — the form, the chords and the bar counts, for a player rather than a DAW">↓ Chart</button>
            <button className="mini" onClick={copyChart} title="Copy the chord chart to the clipboard">⧉ Copy chart</button>
            <button className="btn" style={{ padding:"5px 11px" }} onClick={renderAudio} disabled={rendering || stemming || claudeExporting || projExporting}
              title="Render the whole song to a .wav you can send or post — the same sound you hear on Play">
              {rendering ? pctLabel("Rendering") : "↓ Export audio"}</button>
            <button className="btn" style={{ padding:"5px 11px" }} onClick={exportStems} disabled={rendering || stemming || claudeExporting || projExporting}
              title="Bounce drums, chords and each melody part to separate .wav files, zipped — drop them straight onto a DAW timeline">
              {stemming ? pctLabel("Bouncing") : "↓ Export stems"}</button>
            <button className="btn" style={{ padding:"5px 11px" }} onClick={exportForClaude} disabled={rendering || stemming || claudeExporting || projExporting}
              title="Two files to hand to Claude for analysis: the full arrangement rendered to a .wav, and a JSON snapshot of every setting that shaped it — key, arrangement, every part's synth settings, effects and automation. Upload both together in one message.">
              {claudeExporting ? pctLabel("Rendering") : "↓ Export for Claude"}</button>
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
          {arrangeStrip()}
          {tips && sections.insts.length > 0 && <p className="keytag" style={{ marginTop:6 }}>
            The strip above is the whole song end to end — each block is a section, as wide as it is
            long, and the lanes under it show what is playing where. Gaps in a lane are a part
            sitting out, and the staircase under them is what they add up to. Tap a block to open
            that section underneath; double-tap it to play from there.
          </p>}
          {(() => {
            /* The rows the plan actually has right now. A focus set before an edit can point at a
               row that has since been deleted or merged away, so it is clamped here rather than
               trusted — the alternative is a page that goes blank after a delete. */
            const liveRows = [...new Set(sections.insts.map(d => d.row))];
            const focus = focusRow == null ? null
              : (liveRows.includes(focusRow) ? focusRow : liveRows[0]);
            const shown = focus == null ? sections.insts : sections.insts.filter(d => d.row === focus);
            const groups = [];
            shown.forEach(d => {
              const g = groups[groups.length - 1];
              if (g && g.base === d.base) g.items.push(d);
              else groups.push({ base: d.base, word: d.word, items: [d] });
            });
            return groups.map((g, gi) => (
              <div key={gi} className="sgrp" data-rows={[...new Set(g.items.map(d => d.row))].join(" ")}
                style={{ borderColor: (SEC_COL[g.base] || "#2A3442") + "55" }}>
                <div className="sgrphdr">
                  <div className="sgrplbl" style={{ color: SEC_COL[g.base] || "#8B94A3" }}>
                    {g.items.length > 1
                      ? `${g.word}${/s$/i.test(g.word) ? "es" : "s"} ×${g.items.length}`
                      : g.word}
                  </div>
                  <label className="secdrum" title="Drum kit for every pass of this section — overrides the global Drums choice, and clears anything set on a single pass below">
                    <span className="optlbl"><span aria-hidden="true">🥁</span> Drums</span>
                    {/* a pass's own drums win over the type's, so setting the type has to clear them —
                        otherwise this control would appear to do nothing on a section a template
                        (or the strip) has already arranged pass by pass */}
                    <select value={secDrum[g.base] || ""}
                      onChange={e => { const next = { ...secDrum, [g.base]: e.target.value };
                        g.items.forEach(d => { delete next[d.key]; });
                        setSecDrum(next); }}>
                      <option value="">— the song's drums —</option>
                      {metricDrums.map(([id, dd]) => <option key={id} value={id}>{dd.name}</option>)}
                    </select>
                  </label>
                  {/* the move for every pass of this section type. Each pass can override it in
                      its own card below — the second chorus wanting a different build from the
                      first is the normal case, not the exception. */}
                  <label className="secdrum" title={"Arrangement move for every " + g.word.toLowerCase()
                    + " — a filter sweep, riser or drop, run across the section's whole length. Some also"
                    + " reshape an instrument's own pattern as it goes — an arp speeding up, a Euclidean line"
                    + " filling back in, a snare rolling in on the kit. Any single one can override it below."}>
                    <span className="optlbl"><span aria-hidden="true">🎛</span> Move</span>
                    <select value={secMove[g.base] || ""}
                      onChange={e => setSecMove({ ...secMove, [g.base]: e.target.value })}>
                      {Object.entries(MOVES).map(([id, mv]) => <option key={id} value={id}>{mv.name}</option>)}
                    </select>
                  </label>
                  {/* and what happens at the seam *into* every one of them. A move shapes the
                      section; this shapes the bar it arrives on. */}
                  <label className="secdrum" title={"Transition into every " + g.word.toLowerCase()
                    + " — a riser, a crash, a bar of silence, a fade. It runs across the boundary rather than the section, so most of it sounds in the section before. Any single one can override it below."}>
                    <span className="optlbl"><span aria-hidden="true">⇥</span> Way in</span>
                    {transSelect(secTrans[g.base] || "", e => setSecTrans({ ...secTrans, [g.base]: e.target.value }), null)}
                  </label>
                </div>
                {g.items.map((d, di) => sectionCard(d, di))}
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
                {prog.songs.length} songs run on this engine — pick one to see the progression in its own key.</p> : null;
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

        {/* the way out — a genuinely blank page, at the bottom where a finished (or abandoned)
            song ends up. It asks first, and it lands in the undo history like any other edit. */}
        {tab === "write" && <div className="panel">
          <div className="row" style={{ justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"6px 10px" }}>
            <div style={{ flex:"1 1 260px" }}>
              <div className="progtitle" style={{ fontSize:17 }}>Start from scratch</div>
              <p className="keytag" style={{ margin:"2px 0 0" }}>
                Clear everything — key, chords, drums, bass, melodies, structure, effects — back to a
                fresh page. Saved sketches are kept, and ⌘Z brings the song back.
              </p>
            </div>
            <button className="btn" style={{ padding:"6px 14px" }} onClick={startFresh}
              title="Wipe the current song and begin again from the app's defaults. Sketches saved on the Save tab are untouched, and ⌘Z undoes the wipe.">
              🧹 Start from scratch</button>
          </div>
        </div>}
      </div>
    </div>
  );
}
