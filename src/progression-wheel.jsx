import { useState, useMemo, useRef, useEffect } from "react";
import { FUNC_MAJOR, FUNC_MINOR, MAJOR_NUM, MAJOR_SIG, MINOR_NUM, MODES, MODE_IDS, QSUF, SEMI_NAME, chordIvs, chordName, famMin, modeFamily, modeId, posOf, spell } from "./theory.js";
import { CATEGORIES, GENRE_GROUPS, LETTER_WORD, PAR_SONGS, PLANS, PROGRESSIONS, SEC_SONGS, SONG_KEYS, STRUCTURES, STRUCT_FAMILIES, UNIVERSAL, letterFor } from "./progressions.js";
import { BASS, BASS_IV, BPM_DEFAULT, DRUMS, DRUM_MIDI, DRUM_VOICES, METERS, METER_BY_ID, beatFrom, beatHits, beatSteps, beatToggle, blankBeat, drumFitsMeter, meterOf, DRUM_DEFAULT, DRUM_KITS, KIT_DEFAULT, PATTERNS, PATTERN_DEFAULT, PUMPS, PUMP_AMT, PUMP_DEFAULT, accentAt, beatsOf, drumBeatsOf, lcm, sampleAt, stepAt, subOf } from "./patterns.js";
import { audioBufferToWav, peakOf } from "./wav.js";
import { BASS_VOICES, PAD_VOICES, playBass, DELAY_TIMES, FAM_LEAD, FILTER_OPEN, GM_CATS, LEAD_VOICES, MOVES, TRANS, TRANS_CATS, applyMove, applyTrans, makeTrans, clickSound, drumSound, duckAt, gmFam, gmKey, isGM, leadNote, driveCurve, makeDelay, makeNoise, makeReverb, makeSampler, makeVerbSend, NO_SHAPE, playHit, playLeadSampled, playSampled, programOf, sfPrefetch, voiceChord } from "./audio.js";
import { midiBytes, parseMidiMelody } from "./midi.js";
import { ALS_COLORS, alsBytes } from "./als.js";
import { REC_SOURCES, hzToMidiF, recDetectPitch, recToEvents, recTrackNotes } from "./pitch.js";
import { decodeSong, encodeSong, makeSong, songBeats, songMelos, unpackBeats } from "./song.js";
import { ARPS, ARP_BY_ID, ARP_RATES, GATES, GATE_BY_ID, MEL_GRIDS, gridSub, hash01, layerFx, LAYER_DEFAULT_INSTR, LAYER_DEFAULT_OCT, LAYER_DEFAULT_VOL, LAYER_INK, LAYER_NAMES, LAYER_OCT_MAX, LAYER_OCT_MIN, MAX_LAYERS, MELODY_PATTERNS, MOD_GROUPS, MODS, MOD_BY_KEY, LFO_RATES, ECHO_TIMES, euclidHit, modOf, modCount, NARRATIVES, RHYTHMS, ROLE_RHYTHM, VARY_LEVELS, blankBars, layerGain, rescaleBar, rhythmSpots, varyBars, varyWithin } from "./melody.js";
import { makeZip, safeName } from "./zip.js";
import { AUTO_LANES, autoAt, autoDel, autoDraw, autoPartId, autoSet, planAdd, planDel, planDup, planInsts, planMove, planReps, remapKeyed, remapSecs, transCues } from "./arrange.js";
import { DANCE_TEMPLATES, drumAmountOf, energyOf, resolveArrangement } from "./arrange-templates.js";
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
  const [varySt, setVarySt] = useState({ key:"", val:1 });  // how much a narrative varies each repeat of a section
  /* In-section variation, per section+part: the melody as it was before any of it (the statement the
     variations are heard against), the grid we last wrote from it, and how far up the writer has
     stepped. Keeping the baseline is what makes the button an amount rather than a ratchet — every
     press re-varies the original by one more edit instead of piling edits onto edits until the motif
     is gone. It is deliberately not part of the song document: the notes are the song, this is just
     where the writer had got to with the control. */
  const [varyIn, setVaryIn] = useState({});
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
    setSecBassBeat(remapKeyed(secBassBeat, cur, next, origin, letterFor, bars => bars.map(b => [...b])));
    setSecPercBeat(remapKeyed(secPercBeat, cur, next, origin, letterFor, bars => bars.map(b => [...b])));
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
    setSecBassPat({}); setSecPercPat({}); setSecPadVoice({});
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
  const perc = percSt.key === progId && percSt.val !== "off" && (DRUMS[percSt.val] || {}).pattern ? percSt.val : "";
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
    const pp = DRUMS[perc];
    if (pp && pp.pattern && drumBeatsOf(pp.pattern) === barBeats) lens.push(pp.pattern.length);
    // …and every per-section choice or written grid for either track
    Object.values(secBassPat).forEach(id => {
      const b = BASS[id]; if (b && b.pattern && barBeats === 4) lens.push(b.pattern.length);
    });
    Object.values(secPercPat).forEach(id => {
      const d2 = DRUMS[id]; if (d2 && d2.pattern && drumBeatsOf(d2.pattern) === barBeats) lens.push(d2.pattern.length);
    });
    Object.values(secBassBeat).forEach(bars => { if (bars && bars.length) lens.push(bars[0].length); });
    Object.values(secPercBeat).forEach(bars => { if (bars && bars.length) lens.push(bars[0].length); });
    return lens.reduce((a, b) => lcm(a, b), meloBeats);
  }, [drum, secDrum, secBeat, meloBeats, barBeats, bass, perc, secBassPat, secPercPat, secBassBeat, secPercBeat]);
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
  /* What a section's bass and perc actually are, resolved the way the drums resolve: the pass's
     own written grid first, then its (or its letter's) menu choice, then whatever the template
     wrote — a mute, or the song-level pattern. Returns { beat } | { pat } | null. */
  const bassSrcOf = d => {
    const own = d && secBassBeat[d.key];
    if (own && own.length) return { beat: own };
    const p = d && (secBassPat[d.key] || secBassPat[d.base]);
    if (p) return p === "off" ? null : { pat: p };
    if (effBassOut(d)) return null;
    return bass ? { pat: bass } : null;
  };
  const percSrcOf = d => {
    const own = d && secPercBeat[d.key];
    if (own && own.length) return { beat: own };
    const p = d && (secPercPat[d.key] || secPercPat[d.base]);
    if (p) return p === "off" ? null : { pat: p };
    if (effPercOut(d)) return null;
    return perc ? { pat: perc } : null;
  };
  const padVoiceOf = d => {
    const v = d && (secPadVoice[d.key] || secPadVoice[d.base]);
    if (v) return v === "off" ? "" : v;
    if (effPadOut(d)) return "";
    return pad;
  };
  // whether a track sounds anywhere in the song — what decides if it earns lanes, stems and files
  const bassAnywhere = sections.insts.some(x => !!bassSrcOf(x));
  const percAnywhere = sections.insts.some(x => !!percSrcOf(x));
  const padAnywhere = sections.insts.some(x => !!padVoiceOf(x));
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
  moveRef.current = { moves: secMove, cues, span: moveSpan };
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
  /* ---- the drum grid ----
     The catalogue pattern a section is playing, which is what its grid opens showing: its type's
     override if it has one, else the song's. `beatFrom` lays it onto the sixteenth grid with the
     same resampler playback uses, so an eighth-note pattern arrives on every other step exactly as
     it sounds — you are editing what you were hearing, not a blank bar beside it. */
  const beatCat = d => {
    const id = effDrum(d) || drum;
    return DRUMS[id] ? DRUMS[id].pattern : null;
  };
  const beatSeed = d => {
    const pat = beatCat(d), n = beatSteps(barBeats);
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
    const pat = src && src.pat ? (DRUMS[src.pat] || {}).pattern : null;
    return Array.from({ length: d.nbars }, () => pat ? beatFrom(pat, n) : blankBeat(n));
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
    setSecPercBeat({ ...secPercBeat, [d.key]: bars.map((b, i) => i === bar ? beatToggle(b, step, ch) : [...b]) });
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
    p.bars[bar] = beatToggle(p.bars[bar], step, ch);
    setSecPercBeat({ ...secPercBeat, [p.key]: p.bars.map(b => [...b]) });
  };
  // the bass grid is monophonic: painting a row writes that token over the step, rubbing out clears it
  const paintBassAt = (bar, step, tok) => {
    const p = paintRef.current; if (!p || p.kind !== "bass") return;
    const k = bar + ":" + step; if (p.seen.has(k)) return;
    p.seen.add(k);
    const cur = p.bars[bar][step];
    if (p.want ? cur === tok : cur !== tok) return;
    p.bars[bar] = p.bars[bar].map((s, j) => j === step ? (p.want ? tok : "") : s);
    setSecBassBeat({ ...secBassBeat, [p.key]: p.bars.map(b => [...b]) });
  };
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
    putLayer(d.key, 0, varyBars(gen, { pass, role: d.base, nd: scaleSemis.length, amount: varyAmt }));
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
  let master;
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
  autoGain.connect(limiter);
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
  // the bass track's own duck: straight into the move filter, not the reverb bus — low end in a
  // room is mud — and pumped harder than the chords when the kick lands
  const bduck = ctx.createGain(); bduck.gain.value = 1; bduck.connect(filt);
  /* Each track's own drawn filter: one low-pass per track, driven by its lane on the strip the
     way each melody part's `cut` lane drives its own node. Open (transparent) until the lane is
     drawn, so a song without the lanes is bit-for-bit what it was. The perc filter feeds the
     master directly — percussion is a drum layer, and drums never pass through the pitched bus. */
  const trackLp = out => {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = FILTER_OPEN; f.Q.value = 0.7;
    f.connect(out); return f;
  };
  const bassLp = trackLp(bduck);
  const percLp = trackLp(master);
  // the pad: gently ducked (half the pump — pads barely move) and into the reverb bus, because a
  // pad is the one track that wants the room
  const padDuck = ctx.createGain(); padDuck.gain.value = 1; padDuck.connect(music);
  const padLp = trackLp(padDuck);
  // tempo-synced delay, fed by whichever parts have a send. It returns into the move filter, so
  // a build sweeps the echoes along with everything else.
  const delay = makeDelay(ctx, filt, 60 / (bpmRef.current || 120), delayRef.current);
  const sampler = makeSampler(ctx);                // real-instrument samples (load when online)
  const mi = (meloRef.current || {}).melInstr, leadKey = isGM(mi) ? mi : null;
  if (realRef.current) { sampler.load(instrRef.current); if (leadKey) sampler.load(leadKey); }
  // a wet-only room the parts send to by amount, separate from the bus reverb everything already
  // sits in — a send has to be silent at zero, and the bus one passes its dry signal through
  const verb = makeVerbSend(ctx, wetDuck, 2.2);
  const m = { ctx, master, music, cduck, bduck, bassLp, percLp, padLp, padDuck, wetDuck, filt, mhp, autoFilt, autoHp, autoGain, verb, tn, stem: stem || null,
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
      const qb = struct && struct.length && structBar >= 0 ? struct[structBar] : null;
      const qv = qb && qb.inst != null ? secQuietRef.current[qb.inst] : undefined;
      const quiet = !!(qb && qb.base != null && (qv != null ? qv : secQuietRef.current[qb.base]));
      /* Where this tick sits for the per-section tracks: the current bar's instance and letter,
         or the loop sketch's L1 when no structure is chosen — the same name the melody uses.
         Each track resolves the way the drums do: the pass's own written grid first, then its
         (or its letter's) menu choice, then whatever the template wrote — a mute, or the
         song-level pattern. */
      const tInst = qb ? qb.inst : (struct && struct.length ? null : "L1");
      const tBase = qb ? qb.base : (struct && struct.length ? null : "L1");
      const tMb = qb ? qb.mb : Math.floor(m.step / L);
      const srcOf = (beats, pats, mutes, glob) => {
        const own = tInst != null ? beats[tInst] : null;
        if (own && own.length) return { beat: own };
        const p = (tInst != null && pats[tInst]) || (tBase != null && pats[tBase]) || "";
        if (p) return p === "off" ? null : { pat: p };
        const mut = tInst != null && mutes[tInst] != null ? mutes[tInst]
          : (tBase != null ? mutes[tBase] : undefined);
        if (mut) return null;
        return glob ? { pat: glob } : null;
      };
      // a written or picked bar for this tick, sized to the section like the drums' own bars are
      const srcBar = src => src.beat
        ? (src.beat[qb ? Math.min(tMb, src.beat.length - 1) : tMb % src.beat.length] || null) : null;
      const bassSrc = chord
        ? srcOf(secBassBeatRef.current, secBassPatRef.current, secBassRef.current, bassRef.current) : null;
      const bassOn = !!bassSrc;
      if (sym !== "-") {
        if (clickRef.current && !m.stem) clickSound(m.ctx, t, sym, m.master);   // metronome click, off by default; never in a stem
        if (chord && !quiet && (!m.stem || m.stem.kind === "chords")) {
          // while the bass track carries the root, the chords stop doubling it an octave down
          const played = realRef.current && playSampled(m.sampler, inst, m.ctx, t, chord, sym, eighth, m.cduck, m.voicing, bassOn);
          if (!played) playHit(m.ctx, t, chord, sym, inst, eighth, m.cduck, m.voicing, bassOn);
        }
      }
      /* The bass track. A written grid plays bar by bar exactly as the drums' own bars do; a
         "follow" pattern plays the root under the strum's hits — the note the chords used to
         carry, made separable; a catalogue pattern plays its own sixteenths. Every note is held
         until the next hit, so a lone hit is a whole-bar sub. It sounds through `quiet`: chords
         out with the bassline running is the disco filter-edit move the track exists for. */
      if (bassSrc && chord && (!m.stem || m.stem.kind === "bass")) {
        const bbar = srcBar(bassSrc);
        const bpat = bbar || (BASS[bassSrc.pat] || {}).pattern;
        if (!bbar && bassSrc.pat && !(BASS[bassSrc.pat] || {}).pattern) {
          if (sym !== "-" && sym !== "U")   // an upstroke never reaches the low string
            playBass(m.ctx, t, chord.root, 0, eighth * 1.8, bassVoiceRef.current, m.bassLp, humVel(accentAt(i, ticksPerBeat)));
        } else if (bpat && bpat.length) {
          const bs = stepAt(bpat.length, i, L);
          const tok = bs == null ? "" : bpat[bs];
          if (tok && tok !== "-") {
            let gap = 1;                     // steps until the next hit — the room this note has
            while (gap < bpat.length && (!bpat[(bs + gap) % bpat.length] || bpat[(bs + gap) % bpat.length] === "-")) gap++;
            const stepDur = tick * (L / bpat.length);
            playBass(m.ctx, t, chord.root, BASS_IV[tok] || 0, Math.max(0.09, gap * stepDur * 0.92),
              bassVoiceRef.current, m.bassLp, humVel(accentAt(i, ticksPerBeat)));
          }
        }
      }
      /* The pad track: the chord's upper voicing held a bar at a time, legato, into its own
         filter and the reverb bus. Upper voicing only — the low root belongs to the bass or the
         chords, and a pad that doubles it is the mud the register fences exist to stop. */
      const padV = (() => {
        const v = (tInst != null && secPadVoiceRef.current[tInst]) || (tBase != null && secPadVoiceRef.current[tBase]) || "";
        if (v) return v === "off" ? "" : v;
        const mut = tInst != null && secPadRef.current[tInst] != null ? secPadRef.current[tInst]
          : (tBase != null ? secPadRef.current[tBase] : undefined);
        if (mut) return "";
        return padRef.current;
      })();
      if (padV && chord && i === 0 && (!m.stem || m.stem.kind === "pad")) {
        const barDur = barBeatsRef.current * beat;
        for (const mid of (m.voicing || voiceChord(chord)))
          leadNote(m.ctx, t, mid, barDur * 0.98, padV, true, m.padLp, { lvl: 0.8 });
      }
      /* The percussion layer: a second pattern from the drum table riding over the main groove on
         the same kit, slightly under it in level, through its own drawn filter. It never triggers
         the pump — that belongs to the song's kick. */
      const percSrc = srcOf(secPercBeatRef.current, secPercPatRef.current, secPercRef.current, percRef.current);
      if (percSrc && (!m.stem || m.stem.kind === "perc")) {
        const ppat = srcBar(percSrc) || (DRUMS[percSrc.pat] || {}).pattern;
        const pstep = sampleAt(ppat, i, L);
        if (pstep)
          for (const ch of pstep)
            drumSound(m.ctx, t, ch, m.noise, m.percLp, kitRef.current, humVel(accentAt(i, ticksPerBeat)) * 0.8);
      }
      let dpat = drumRef.current;                       // global drum pattern by default
      if (struct && struct.length && structBar >= 0) {   // a section can override with its own kit
        const b = struct[structBar];
        const sd = b ? ((b.inst != null && secDrumRef.current[b.inst])
          || (b.base != null ? secDrumRef.current[b.base] : "")) : "";
        if (sd) dpat = DRUMS[sd] ? DRUMS[sd].pattern : null;   // "off" → null → silent for this section
        /* …and a section that has been written on its own grid plays that instead, bar by bar, so a
           fill can land in the last bar of a verse. A section stretched since it was written repeats
           its last written bar rather than falling silent — the same rule melodies follow. */
        const own = b && b.inst != null ? secBeatRef.current[b.inst] : null;
        if (own && own.length) dpat = own[Math.min(b.mb, own.length - 1)];
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
        /* The per-track filter lanes — bass, percussion, pad — each ramped across the bar onto
           its own node, exactly as the master filter lane is. An undrawn lane leaves its node
           wide open, so a song without them is untouched. */
        const laneCut = (pts, node) => {
          const vNow = autoAt(pts, bar);
          if (vNow == null) return;
          const vNext = autoAt(pts, bar + 1);
          const hz = v => nyq(m, Math.max(60, 120 * Math.pow(FILTER_OPEN / 120, v)));
          node.frequency.setValueAtTime(hz(vNow), t);
          node.frequency.exponentialRampToValueAtTime(hz(vNext == null ? vNow : vNext), t + barDur);
        };
        laneCut(A.cutbass, m.bassLp);
        laneCut(A.cutperc, m.percLp);
        laneCut(A.cutpad, m.padLp);
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
          // the bass ducks hardest — the kick and the bassline share a register, and the pump
          // trading them off is what makes an offbeat bass lock instead of fight
          duckAt(m.bduck, t, Math.min(1, pumpRef.current * 1.3), beat * 0.8);
          // …and the pad barely moves: half the pump, just enough to breathe with the kick
          duckAt(m.padDuck, t, pumpRef.current * 0.5, beat * 0.8);
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

               gain ─ drive ─ high-pass ─ low-pass ─ tremolo ─ pan ─ gate ─┬─ duck ─→ pitched bus
               (level·mute·solo)          ▲            ▲        ▲          ├─ echo send → delay
                                          │            │        │          └─ reverb send → room
                                        wobble      tremolo   auto-pan
                                                 (three tempo-synced LFOs)

             The order is the one a hardware synth uses and it matters: distortion before the
             filter (so the filter tames the harmonics the drive just made, rather than the drive
             re-brightening a filtered signal), the gate last of the level stages so it chops
             everything above it at once, and both sends taken after the gate — a gated part throws
             gated repeats rather than a smooth pad's worth of echo the dry signal never had.

             Every node is built whether or not the part uses it. Building lazily would mean an
             LFO's phase depended on which bar a control was first turned up in, and a stem bounce
             would no longer line up with the mix it came from. */
          const chainOf = li => {
            let dest = m.partGain[li];
            if (!dest) {
              const C = m.ctx;
              dest = m.partGain[li] = C.createGain();
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
              gate.connect(pduck); pduck.connect(m.music);
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
          const laneCutOf = li => autoAt((autoRef.current || {})[autoPartId(li)], autoBar + i / L);
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
            const fx = layerFx(ly);
            const gain = layerGain(ly, anySolo), voice = ly.instr || mel.melInstr;
            /* Build the chain for every part on every tick rather than only when something needs
               it. It is memoised, so the cost is one lookup; what it buys is that a part's LFOs
               and filter always start at the same moment in the song, whichever settings happen to
               be turned up — the property a stem bounce needs to line up with the mix. */
            chainOf(li);
            applyMods(li, ly, t);
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
              m.partGate[li].gain.setTargetAtTime(open, t, 0.004);
            } else if (m.partGate[li]) {
              // Turning the gate off has to re-open it. Without this, switching the menu back to
              // "off" while the gate happened to be shut would leave the node at zero and the part
              // silent for the rest of the session.
              m.partGate[li].gain.setTargetAtTime(1, t, 0.01);
            }
            // how many bars this section runs for, so Swell can measure its way across it
            const nbars = (sec.layers[0] && sec.layers[0].bars.length) || 1;
            if (fx.arp) playArp(ly, fx, voice, li, ly.oct || 0, gain, ly.send || 0, nbars);
            else playLayer(ly, ly.flat, voice, li, ly.oct || 0, gain, ly.send || 0, nbars);
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
    if (bassAnywhere && chords.length) out.push({ kind:"bass", name:"bass-" + bassVoice });
    if (percAnywhere) out.push({ kind:"perc", name:"perc" });
    if (padAnywhere && chords.length) out.push({ kind:"pad", name:"pad" });
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
        // a section's own written bars first, then its type's catalogue choice, then the song's —
        // the same order playback resolves, so the file is what you heard
        const own = b && b.inst != null ? secBeat[b.inst] : null;
        if (own && own.length) return own[Math.min(b.mb, own.length - 1)];
        const id = (b && ((b.inst != null && secDrum[b.inst]) || (b.base != null && secDrum[b.base]))) || drum;
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
      /* The three tracks, resolved to plain notes (times in beats) shared by the MIDI writer and
         the Live Set. Each bar resolves exactly as playback resolves it — the pass's own grid,
         then the section menus, then the template/global state — with the loop sketch reading as
         L1, so the exported file falls silent and moves precisely where the song does. */
      const exSrc = (b, bi, srcFn) => {
        const dk = b.inst != null ? { key: b.inst, base: b.base } : { key: "L1", base: "L1" };
        const src = srcFn(dk);
        if (!src) return null;
        if (src.beat) return { bar: src.beat[b.inst != null
          ? Math.min(b.mb, src.beat.length - 1) : bi % src.beat.length] || null };
        return src;
      };
      const bassNotes = [];
      bars.forEach((b, bi) => {
        const src = exSrc(b, bi, bassSrcOf);
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
            bassNotes.push({ t: bi * barBeats + s2 * stepB, dur: gap * stepB * 0.92,
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
            bassNotes.push({ t: bi * barBeats + s2 * stepB, dur: gap * stepB * 0.92,
              note: root + (BASS_IV[tok] || 0), vel: 96 * accentAt(s2, steps / barBeats) });
          }
        }
      });
      // nearest GM bass program to each synth voice, so a DAW opens the track already low
      const bassProgram = { sub: 38, saw: 38, square: 38, pluck: 34, acid: 38, reese: 39 }[bassVoice] || 38;
      const bassTrack = bassNotes.length ? { notes: bassNotes, program: bassProgram } : null;
      const percForBar = bi => {
        const src = exSrc(bars[bi], bi, percSrcOf);
        if (!src) return null;
        return src.bar || (DRUMS[src.pat] || {}).pattern || null;
      };
      const anyPerc = bars.some((_, bi) => percForBar(bi));
      // the pad: the chord's upper voicing held a bar at a time, an octave up, no low root
      const padNotes = [];
      let padVoiceUsed = "";
      bars.forEach((b, bi) => {
        const dk = b.inst != null ? { key: b.inst, base: b.base } : { key: "L1", base: "L1" };
        const v = padVoiceOf(dk);
        if (!v) return;
        padVoiceUsed = padVoiceUsed || v;
        for (const x of chordIvs(b.chord.quality))
          padNotes.push({ t: bi * barBeats, dur: barBeats * 0.98, note: 60 + b.chord.root + x, vel: 66 });
      });
      const padTrack = padNotes.length ? { notes: padNotes, program: programOf(padVoiceUsed || "strings", 89) } : null;
      return { bars, parts, drumForBar, meta, anyDrum, nUsed, partOf, bassTrack, percForBar, anyPerc, padTrack };
  };
  const exportMidi = () => {
    try {
      const { bars, parts, drumForBar, meta, anyDrum, nUsed, bassTrack, percForBar, anyPerc, padTrack } = midiParts();
      download(midiBytes(effBpm, barBeats, bars, drumForBar, parts, kit, meloSub, programOf(instr),
        { ...meta, bass: bassTrack, perc: anyPerc ? percForBar : null, pad: padTrack }),
        "audio/midi", "mid");
      setIoNote("MIDI exported — chords" + (anyDrum ? " + drums" : "") + (anyPerc ? " + perc" : "")
        + (bassTrack ? " + bass" : "") + (padTrack ? " + pad" : "")
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
    const { bars, parts, drumForBar, meta, bassTrack, percForBar, anyPerc, padTrack } = midiParts();
    const B = barBeats, tracks = [];
    // chords: the same voicing the MIDI writer uses, one bar each
    const chordNotes = [];
    bars.forEach((b, bi) => {
      const notes = [36 + b.chord.root - 12, ...chordIvs(b.chord.quality).map(x => 60 + b.chord.root + x)];
      for (const n of notes) chordNotes.push({ t: bi * B, dur: B, note: n, vel: 78 });
    });
    if (chordNotes.length) tracks.push({ name: "Chords", color: ALS_COLORS.chords, vol: 0.85,
      notes: chordNotes, end: bars.length * B, note: "was " + instr });
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
            dur: Math.min(0.25, stepB * 0.5), note: DRUM_MIDI[ch] || 42,
            vel: ([42, 46, 51, 37].includes(DRUM_MIDI[ch]) ? 52 : 76) * acc });
        }
      });
      if (percNotes.length) tracks.push({ name: "Percussion", color: ALS_COLORS.perc, vol: 0.8,
        notes: percNotes, end: bars.length * B, note: "perc layer — same Drum Rack as the drums" });
    }
    // the bass track: the same resolved notes the MIDI writer gets, already in beats
    if (bassTrack) tracks.push({ name: "Bass", color: ALS_COLORS.bass, vol: 0.85,
      notes: bassTrack.notes, end: bars.length * B, note: "was " + bassVoice + " — drop a bass synth on this" });
    // the pad: the held upper voicings
    if (padTrack) tracks.push({ name: "Pad", color: ALS_COLORS.pad, vol: 0.8,
      notes: padTrack.notes, end: bars.length * B, note: "drop a pad synth on this" });
    // melody parts: grid columns merged into held notes, the same way the MIDI writer merges them
    (parts || []).forEach((part, p) => {
      if (!part || !part.cols) return;
      const cols = part.cols, notes = [], colB = 1 / meloSub;
      const at = (i, n) => (cols[i] || []).includes(n);
      for (let i = 0; i < cols.length; i++) for (const n of (cols[i] || [])) {
        if (i > 0 && at(i - 1, n)) continue;                    // a held note, already counted
        let run = 1;
        while (i + run < cols.length && at(i + run, n)) run++;
        notes.push({ t: i * colB, dur: run * colB, note: n,
          vel: 96 * (part.gain == null ? 1 : part.gain) * accentAt(i % (B * meloSub), meloSub) });
      }
      if (notes.length) tracks.push({ name: "Part " + (LAYER_NAMES[p] || p + 1),
        color: ALS_COLORS.part, vol: 0.8, notes, end: bars.length * B,
        note: "was " + (part.voice || melInstr) });
    });
    const M = METER_BY_ID[curMeter] || METERS[0];
    return { bpm: effBpm, tsNum: M.num, tsDen: M.den, tracks,
      locators: (meta.markers || []).map(mk => ({ beat: mk.bar * B, name: mk.name })),
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
      const { bars, parts, drumForBar, meta, anyDrum, partOf, bassTrack, percForBar, anyPerc, padTrack } = midiParts();
      const files = [];
      const add = (label, bytes) => files.push({ name: `${String(files.length + 1).padStart(2, "0")}-${safeName(label)}.mid`, bytes });
      add("chords-" + gmKey(instr),
        midiBytes(effBpm, barBeats, bars, () => null, [], kit, meloSub, programOf(instr), meta));
      if (anyDrum)
        add("drums-" + kit,
          midiBytes(effBpm, barBeats, bars, drumForBar, [], kit, meloSub, null, { ...meta, skipChords: true }));
      if (anyPerc)
        add("perc",
          midiBytes(effBpm, barBeats, bars, () => null, [], kit, meloSub, null, { ...meta, skipChords: true, perc: percForBar }));
      if (bassTrack)
        add("bass-" + bassVoice,
          midiBytes(effBpm, barBeats, bars, () => null, [], kit, meloSub, null, { ...meta, skipChords: true, bass: bassTrack }));
      if (padTrack)
        add("pad",
          midiBytes(effBpm, barBeats, bars, () => null, [], kit, meloSub, null, { ...meta, skipChords: true, pad: padTrack }));
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
    kit, pump, bass, bassVoice, secBass, perc, secPerc, pad, secPad,
    secBassPat, secPercPat, secPadVoice, secBassBeat, secPercBeat,
    secMove, secTrans, secBeat, secNar, delayId, grid: gridSt.key === progId ? gridSt.val : "", bpm: effBpm, selStruct, contrast,
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
      kit, pump, bass, bassVoice, secBass, perc, secPerc, pad, secPad,
      secBassPat, secPercPat, secPadVoice, secBassBeat, secPercBeat,
      secMove, secTrans, secBeat, secNar, delayId, gridSt, effBpm, selStruct, contrast, ovMap, insList, qmap, remList, order, melos]);
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
    setSecBassBeat(unpackBeats(s.secBassBeat)); setSecPercBeat(unpackBeats(s.secPercBeat));
    setOpenBass({}); setOpenPercs({});
    setSelStruct(s.selStruct || ""); setContrast(s.contrast || { id:"", sec:"C" });
    const eKey = s.progId + ":" + s.tonic;
    setEdits({ key:eKey, map:s.edits || {} }); setInserts({ key:eKey, list:s.inserts || [] });
    setQuals({ key:eKey, map:s.quals || {} }); setRemoved({ key:eKey, list:s.removed || [] });
    setOrder(s.order ? { key:eKey, list:s.order } : { key:"", list:null }); setPillSel([]);
    if (s.melInstr) setMelInstr(s.melInstr);
    // melodies were session-only before this; a sketch without them just loads an empty grid
    setMelos(s.melos ? songMelos(s) : { progId:"", secs:{} });
    setMelSel({ key:"", layer:0, notes:{} }); setNarUndo(null); setVaryIn({});
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
          {tips && <p className="keytag" style={{ marginTop:4 }}>
            The bassline, percussion layer and pad live on the sections in the Arrange tab —
            each pass picks its pattern or voice there, and bass and perc open on their own grids
            beside the drum grid.
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
          </div>

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
            {/* a second chorus that is note-for-note the first one is the fastest way to sound like a demo */}
            <select value={varyAmt} onChange={e => { const v = +e.target.value;
                setVarySt({ key: progId, val: v }); if (narId) applyNarrative(narId, v); }}
              style={{ flex:"0 1 150px" }}
              title="How much each repeat of a section differs from its first time round — a new landing note, a note added or taken away, a phrase pushed early, a held note broken in two. The first time is always left alone.">
              {VARY_LEVELS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
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
              title="Export as an Ableton Live Set — named, coloured tracks laid out as an arrangement, at this tempo, with every section a locator on the ruler. The tracks arrive without instruments (a Web Audio synth is not something Live can be handed), so drop your own on each and use the stems as the reference for how it should sound.">↓ Live Set</button>
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
            /* What each section actually plays, resolved the same way the scheduler resolves it —
               including the part that was missed: a section written on its own drum grid plays
               those bars whatever its pass or its type is set to, "off" included. Read from the
               menus alone, the lane said a section had no drums while you could hear them. */
            const ownBeat = d => { const b = secBeat[d.key]; return b && b.length ? b : null; };
            const drumsIn = d => {
              if (ownBeat(d)) return true;
              const dd = DRUMS[effDrum(d) || drum];
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
                    if (bd && bd.pattern) delete next[d.key]; else next[d.key] = drum;
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
                    const inherited = lp ? lp !== "off" : (!effBassOut(x) && !!bass);
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
                    const inherited = lp ? lp !== "off" : (!effPercOut(x) && !!perc);
                    if (!inherited && !secPercBeat[x.key]) next[x.key] = perc || "ohats";
                  });
                  setSecPercPat(next);
                } }] : []),
              ...(padAnywhere ? [{ name: "Pad", on: d => !!padVoiceOf(d), scope: runScope,
                toggle: r => {
                  const anyIn = r.items.some(x => !!padVoiceOf(x)), next = { ...secPadVoice };
                  r.items.forEach(x => {
                    if (anyIn) { next[x.key] = "off"; return; }
                    delete next[x.key];
                    const lp = next[x.base];
                    const inherited = lp ? lp !== "off" : (!effPadOut(x) && !!pad);
                    if (!inherited) next[x.key] = pad || "strings";
                  });
                  setSecPadVoice(next);
                } }] : []),
              ...Array.from({ length: nParts }, (_, i) => ({
                name: LAYER_NAMES[i], on: d => partIn(d, i),
                scope: runScope,
                // a run can hold several instances; mute them together so the lane matches the click
                toggle: r => setLayerPropMany(r.items.map(d => d.key), i, { mute: r.items.some(d => partIn(d, i)) }),
                // a part with no notes here has nothing to mute — the lane is empty for a reason
                dead: r => !r.items.some(d => hasNotes(d, i)) })),
            ];
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
              drums: drumAmountOf((DRUMS[effDrum(d) || drum] || {}).pattern),
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
          })()}
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
                    + " — a filter sweep, riser or drop, run across the section's whole length. Any single one can override it below."}>
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
                {g.items.map((d, di) => {
            const sec = secMelos[d.key] || EMPTY_SEC;
            const cols = d.cs.length * meloBeats;
            const open = !!openSecs[d.key];
            const beatOpen = !!openBeats[d.key];
            const percOpen = !!openPercs[d.key];
            const bassOpen = !!openBass[d.key];
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
                    <button className="mini" onClick={() => setOpenBeats({ ...openBeats, [d.key]: !beatOpen })}
                      title={"Write this " + d.word.toLowerCase() + "'s own drums — a busier hat in the second chorus, a fill in the last bar. It opens on whatever is playing now."}>
                      {beatOpen ? "▾" : "▸"} drums{secBeat[d.key] ? " ● " + beatHits(secBeat[d.key]) : ""}
                    </button>
                    <button className="mini" onClick={() => setOpenPercs({ ...openPercs, [d.key]: !percOpen })}
                      title={"Write this " + d.word.toLowerCase() + "'s own percussion layer — a shaker that only runs through the build, a conga cell on one chorus. It opens on whatever the section's perc menu is playing."}>
                      {percOpen ? "▾" : "▸"} perc{secPercBeat[d.key] ? " ● " + beatHits(secPercBeat[d.key]) : ""}
                    </button>
                    <button className="mini" onClick={() => setOpenBass({ ...openBass, [d.key]: !bassOpen })}
                      title={"Write this " + d.word.toLowerCase() + "'s own bassline — root, fifth and octave of whatever chord each bar holds, so the line follows the changes by itself. It opens on whatever the section's bass menu is playing."}>
                      {bassOpen ? "▾" : "▸"} bass{secBassBeat[d.key] ? " ●" : ""}
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
                {/* This one pass's own move and its own melodic shape. Both fall back to what the
                    section type is set to, so a song stays as simple as you leave it — but the
                    second chorus wanting a different build, or the bridge wanting to fall where
                    everything else rises, is the normal case rather than the exception. */}
                <div className="row secopts">
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
                  <label className="secopt" title={"Transition into this " + d.word.toLowerCase()
                    + " alone — what happens on the bar it arrives on. Most of it sounds in the section before, so a lead-in longer than that section shortens to fit. Left as it is, it does whatever every "
                    + d.word.toLowerCase() + " does."}>
                    <span className="optlbl"><span aria-hidden="true">⇥</span> Way in</span>
                    {transSelect(secTrans[d.key] || "", e => setSecTrans({ ...secTrans, [d.key]: e.target.value }),
                      secTrans[d.base] && TRANS[secTrans[d.base]]
                        ? d.word.toLowerCase() + " — " + TRANS[secTrans[d.base]].name : null)}
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
                        setSecBassPat(next); }}>
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
                  {bassSrcOf(d) && <label className="secopt" title="What the whole song's bassline is played on — all synth, so it sounds the same offline and in a render.">
                    <span className="optlbl">voiced as</span>
                    <select value={bassVoice} onChange={e => setBassVoiceSt({ key: progId, val: e.target.value })}>
                      {BASS_VOICES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </select>
                  </label>}
                  <label className="secopt" title={"The percussion layer for this " + d.word.toLowerCase()
                    + " alone — a second pattern from the drum table riding over the groove on the song's kit. The classic move is perc entering a build before the kick returns. Open ▸ perc above to write it step by step."}>
                    <span className="optlbl"><span aria-hidden="true">🥁</span> Perc</span>
                    <select value={secPercPat[d.key] || ""}
                      onChange={e => { const v = e.target.value, next = { ...secPercPat };
                        if (!v) delete next[d.key]; else next[d.key] = v;
                        setSecPercPat(next); }}>
                      <option value="">{(() => {
                        const p = secPercPat[d.base];
                        if (p) return p === "off" ? "as every " + d.word.toLowerCase() + " — no perc"
                          : "as every " + d.word.toLowerCase() + " — " + ((DRUMS[p] || {}).name || p);
                        return perc && !secPerc[d.base] && !secPerc[d.key]
                          ? "as the song — " + ((DRUMS[perc] || {}).name || perc) : "— no percussion —";
                      })()}</option>
                      <option value="off">No percussion</option>
                      {metricDrums.map(([id, dd]) => id !== "off"
                        ? <option key={id} value={id}>{dd.name}</option> : null)}
                    </select>
                  </label>
                  <label className="secopt" title={"The pad for this " + d.word.toLowerCase()
                    + " alone — a second chord voice holding the upper voicing a bar at a time, reverbed and barely pumped. Pads carry breakdowns and sit out of DJ intros."}>
                    <span className="optlbl"><span aria-hidden="true">🌫️</span> Pad</span>
                    <select value={secPadVoice[d.key] || ""}
                      onChange={e => { const v = e.target.value, next = { ...secPadVoice };
                        if (!v) delete next[d.key]; else next[d.key] = v;
                        setSecPadVoice(next); }}>
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

                    {/* Write/Suggest and Draw/Move were two button rows stacked, which is two rows
                        of chrome above a grid that is the actual work. One row, and the second
                        switch appears only in the mode that has it. */}
                    <div className="melmodebar">
                      <div className="seg">
                        <button className={tab === "write" ? "on" : ""}
                          onClick={() => setMelTab({ ...melTab, [d.key]: "write" })}>✎ Write</button>
                        <button className={tab === "suggest" ? "on" : ""}
                          onClick={() => setMelTab({ ...melTab, [d.key]: "suggest" })}>✨ Suggest</button>
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
                  </div>
                  );
                })()}
                {/* This section's own drums. Nine rows, one per kit piece, and a cell is a letter
                    in the step string the catalogue patterns are already made of — so what you
                    write here is a pattern like any other, and playback, the exported MIDI and the
                    drum stem all take it without knowing it was edited.
                    It opens on whatever is *currently* playing rather than on an empty bar, so the
                    first thing you do is change a groove rather than build one from nothing. */}
                {beatOpen && (() => {
                  const bars = beatBars(d);
                  const n = bars[0].length, cols = n * d.nbars;
                  const own = !!secBeat[d.key];
                  const sameRole = sections.insts.filter(o => o.base === d.base && o.key !== d.key);
                  const cat = DRUMS[effDrum(d) || drum];
                  return (
                    <div style={{ marginTop:6 }}>
                      {/* the same control row shape the melody grid above uses, so the two blocks
                          read as one stack rather than two features that happen to be adjacent */}
                      <div className="row gridhdr">
                        <span className="gridname">🥁 {own ? `${d.key}'s own drums` : "following " + ((cat && cat.name) || "the song's drums")}</span>
                        {own && <button className="mini" onClick={() => resetBeat(d.key)}
                          title="Hand this section back to the drum menu — the grid goes on showing what plays, unwritten">↺ Reset</button>}
                        {sameRole.length > 0 && <button className="mini" onClick={() => copyBeat(d, sameRole)}
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
                                <div key={c} data-dk={d.key} data-bar={bar} data-step={step} data-ch={ch}
                                  onPointerDown={e => beatDown(e, d, bar, step, ch)}
                                  onClick={() => {
                                    if (skipClickRef.current) { skipClickRef.current = false; return; }
                                    tapBeat(d, bar, step, ch);
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
                        Hold the button down and drag to paint a row — press an empty cell and you are
                        drawing, press a full one and you are rubbing out — so a sixteenth hat across
                        four bars is one stroke. Two pieces on one step play together, which is all
                        layering is here: a crash on the first step of a section, or a snare through
                        the last bar, is the fill a transition is waiting for.
                      </p>}
                    </div>
                  );
                })()}
                {percOpen && (() => {
                  const bars = percGridBars(d);
                  const n = bars[0].length, cols = n * d.nbars;
                  const own = !!secPercBeat[d.key];
                  const sameRole = sections.insts.filter(o => o.base === d.base && o.key !== d.key);
                  const src = percSrcOf(d);
                  const cat = src && src.pat ? DRUMS[src.pat] : null;
                  return (
                    <div style={{ marginTop:6 }}>
                      <div className="row gridhdr">
                        <span className="gridname">🥁 {own ? `${d.key}'s own perc layer`
                          : src ? "following " + ((cat && cat.name) || "the section's perc")
                          : "no perc here — paint some"}</span>
                        {own && <button className="mini" onClick={() => resetPercBeat(d.key)}
                          title="Hand this section back to the perc menu — the grid goes on showing what plays, unwritten">↺ Reset</button>}
                        {sameRole.length > 0 && <button className="mini" onClick={() => copyPercBeat(d, sameRole)}
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
                        {DRUM_VOICES.map(([ch, name, tip, ink]) => (
                          <div key={ch} className="mline" style={{ gap:beatGap,
                              gridTemplateColumns:`${GRID_GUT + 4 - beatGap}px repeat(${cols}, minmax(${beatCell}px,1fr))` }}>
                            <span className="mnote dname" title={tip} style={{ borderRightColor: ink }}>{name}</span>
                            {Array.from({ length: cols }, (_, c) => {
                              const bar = Math.floor(c / n), step = c % n;
                              const on = bars[bar][step].includes(ch);
                              return (
                                <div key={c} data-pk={d.key} data-bar={bar} data-step={step} data-ch={ch}
                                  onPointerDown={e => percDown(e, d, bar, step, ch)}
                                  onClick={() => {
                                    if (skipClickRef.current) { skipClickRef.current = false; return; }
                                    tapPerc(d, bar, step, ch);
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
                        A second layer over the drum grid above, on the same kit — shakers, congas
                        and offbeat hats live here so the main groove stays untouched. It has its
                        own lane and its own drawn filter on the strip.
                      </p>}
                    </div>
                  );
                })()}
                {bassOpen && (() => {
                  const bars = bassGridBars(d);
                  const n = bars[0].length, cols = n * d.nbars;
                  const own = !!secBassBeat[d.key];
                  const sameRole = sections.insts.filter(o => o.base === d.base && o.key !== d.key);
                  const src = bassSrcOf(d);
                  const cat = src && src.pat ? BASS[src.pat] : null;
                  return (
                    <div style={{ marginTop:6 }}>
                      <div className="row gridhdr">
                        <span className="gridname">🎸 {own ? `${d.key}'s own bassline`
                          : src ? "following " + ((cat && cat.name) || "the section's bass")
                          : "no bass here — paint a line"}</span>
                        {own && <button className="mini" onClick={() => resetBassBeat(d.key)}
                          title="Hand this section back to the bass menu — the grid goes on showing what plays, unwritten">↺ Reset</button>}
                        {sameRole.length > 0 && <button className="mini" onClick={() => copyBassBeat(d, sameRole)}
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
                                <div key={c} data-bk={d.key} data-bar={bar} data-step={step} data-tok={tok}
                                  onPointerDown={e => bassDown(e, d, bar, step, tok)}
                                  onClick={() => {
                                    if (skipClickRef.current) { skipClickRef.current = false; return; }
                                    tapBass(d, bar, step, tok);
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
                        One note a step — root, fifth or octave of whatever chord that bar holds, so
                        the line follows the changes by itself. A note rings until the next one, so a
                        single Root at the bar start is a held sub and a step on every offbeat is the
                        house bounce. Tap a different row to move a note; tap it again to clear it.
                      </p>}
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
      </div>
    </div>
  );
}
