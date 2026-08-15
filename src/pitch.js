/* pitch — In-app pitch tracking: a McLeod-Pitch-Method transcriber, so a line played into the mic
   can land straight on a melody grid.
*/
/* ===== in-app pitch tracking (guitar / voice → notes) =====
   A compact McLeod-Pitch-Method transcriber, mirroring the Tune Transcriber's DSP, so a line
   played into the mic can be dropped straight onto a section's melody grid. Source profiles
   tune the RMS gate, shortest kept note and trusted frequency window: a plucked guitar decays
   (its tail would split into spurious re-onsets under a voice gate) and reaches lower than most
   singing. Output notes are quantised to an eighth-note grid so they map onto grid columns. */
const REC_SOURCES = {
  voice:  { gate: 0.006, minNoteMs: 70, loHz: 65, hiHz: 1400, clarityFrac: 0.62, clarityMin: 0.45 },
  guitar: { gate: 0.004, minNoteMs: 85, loHz: 70, hiHz: 1320, clarityFrac: 0.55, clarityMin: 0.34 },
};
const hzToMidiF = hz => 69 + 12 * Math.log2(hz / 440);
// gate override lets the caller pass an adaptive per-recording threshold
function recDetectPitch(buf, sampleRate, prof, gate) {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < (gate != null ? gate : prof.gate)) return null;
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
  const maxima = [];
  let lag = 1;
  while (lag < maxLag - 1 && nsdf[lag] > 0) lag++;      // skip the lag-0 hump
  while (lag < maxLag - 1) {
    if (nsdf[lag] > 0) {
      let best = lag, bestV = nsdf[lag];
      while (lag < maxLag - 1 && nsdf[lag] > 0) { if (nsdf[lag] > bestV) { bestV = nsdf[lag]; best = lag; } lag++; }
      maxima.push({ lag: best, val: bestV });
    } else lag++;
  }
  if (!maxima.length) return null;
  const peak = Math.max(...maxima.map(m => m.val));
  const chosen = maxima.find(m => m.val >= (prof.clarityFrac || 0.62) * peak) || maxima[0];
  if (chosen.val < (prof.clarityMin || 0.45)) return null;
  const x = chosen.lag, a = nsdf[x - 1], b = nsdf[x], c = nsdf[x + 1];
  const denom = a - 2 * b + c, shift = denom !== 0 ? (0.5 * (a - c)) / denom : 0;
  const hz = sampleRate / (x + shift);
  if (hz < prof.loHz || hz > prof.hiHz) return null;
  return { hz, clarity: chosen.val, rms };
}
// samples → notes [{midi,t0,t1}] in seconds. Normalises level, gates against the recording's own
// noise floor, and bridges short dropouts so a decaying guitar note stays one note.
function recTrackNotes(samples, sampleRate, prof) {
  // normalise to ~0.95 peak so a quiet take is treated the same as a loud one
  let pk = 0;
  for (let i = 0; i < samples.length; i++) { const a = samples[i] < 0 ? -samples[i] : samples[i]; if (a > pk) pk = a; }
  if (pk > 1e-4 && pk < 0.95) {
    const g = 0.95 / pk, s2 = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) s2[i] = samples[i] * g;
    samples = s2;
  }
  const WIN = 2048, HOP = Math.round(sampleRate * 0.011);
  // pass 1 (cheap): per-frame RMS → an adaptive gate a little above the noise floor
  const starts = [], rmsArr = [];
  for (let start = 0; start + WIN <= samples.length; start += HOP) {
    let r = 0; for (let i = 0; i < WIN; i++) { const v = samples[start + i]; r += v * v; }
    starts.push(start); rmsArr.push(Math.sqrt(r / WIN));
  }
  const sorted = [...rmsArr].sort((a, b) => a - b);
  const noise = sorted.length ? sorted[Math.floor(sorted.length * 0.2)] : 0;   // 20th-percentile ≈ quiet floor
  const gate = Math.max(prof.gate, noise * 2.2);
  // pass 2: detect pitch only where the frame clears the gate
  const frames = starts.map((start, k) => {
    if (rmsArr[k] < gate) return { t: (start + WIN / 2) / sampleRate, midi: null, conf: 0 };
    const p = recDetectPitch(samples.subarray(start, start + WIN), sampleRate, prof, gate);
    return { t: (start + WIN / 2) / sampleRate, midi: p ? hzToMidiF(p.hz) : null, conf: p ? p.clarity : 0 };
  });
  const W = 2;
  const sm = frames.map((f, i) => {
    if (f.midi == null) return null;
    const vals = [];
    for (let k = -W; k <= W; k++) { const g = frames[i + k]; if (g && g.midi != null) vals.push(g.midi); }
    vals.sort((a, b) => a - b);
    return vals.length ? vals[Math.floor(vals.length / 2)] : f.midi;
  });
  const notes = [];
  let cur = null;
  const flush = () => {
    if (!cur) return;
    if ((cur.tEnd - cur.tStart) * 1000 >= prof.minNoteMs && cur.pitches.length) {
      const rounded = cur.pitches.map(Math.round).sort((a, b) => a - b);
      notes.push({ midi: rounded[Math.floor(rounded.length / 2)], t0: cur.tStart, t1: cur.tEnd });
    }
    cur = null;
  };
  const maxGap = Math.max(2, Math.round(0.07 / (HOP / sampleRate)));   // bridge dropouts up to ~70 ms
  let gap = 0;
  for (let i = 0; i < frames.length; i++) {
    const m = sm[i];
    if (m == null) {
      if (cur && gap < maxGap) { gap++; continue; }   // a brief dropout inside a ringing note
      flush(); gap = 0; continue;
    }
    const r = Math.round(m);
    if (cur && Math.abs(r - cur.ref) < 0.5) { cur.tEnd = frames[i].t; cur.pitches.push(m); gap = 0; }
    else { flush(); cur = { ref: r, tStart: frames[i].t, tEnd: frames[i].t, pitches: [m] }; gap = 0; }
  }
  flush();
  return notes;
}
// crude auto-tempo: BPM whose eighth-note grid best fits the onsets
function recEstimateTempo(notes) {
  if (notes.length < 3) return 100;
  let best = 100, bestErr = Infinity;
  for (let bpm = 60; bpm <= 180; bpm++) {
    const step = 60 / bpm / 2;
    let err = 0;
    for (const n of notes) { const q = n.t0 / step; err += Math.abs(q - Math.round(q)); }
    err /= notes.length;
    if (err < bestErr) { bestErr = err; best = bpm; }
  }
  return best;
}
// notes → eighth-note grid events [{ midi, startE, durE }], time 0 = first onset
function recToEvents(notes) {
  if (!notes.length) return [];
  const t0 = notes[0].t0;
  const shifted = notes.map(n => ({ midi: n.midi, t0: n.t0 - t0, t1: n.t1 - t0 }));
  const bpm = recEstimateTempo(shifted);
  const step = 60 / bpm / 2;                             // eighth-note
  const out = shifted.map(n => {
    const s = Math.max(0, Math.round(n.t0 / step));
    const e = Math.max(s + 1, Math.round(n.t1 / step));
    return { midi: n.midi, startE: s, durE: e - s };
  });
  out.sort((a, b) => a.startE - b.startE);
  for (let i = 0; i < out.length - 1; i++) {             // keep it monophonic
    const end = out[i].startE + out[i].durE;
    if (end > out[i + 1].startE) out[i].durE = Math.max(1, out[i + 1].startE - out[i].startE);
  }
  return out;
}

// the "strong" beat columns of a bar — one per beat: [0,2,4,6] on an eighth grid in 4/4,
// [0,4,8,12] on a sixteenth grid. `sub` is columns per beat.

export { REC_SOURCES, hzToMidiF, recDetectPitch, recTrackNotes, recEstimateTempo, recToEvents };
