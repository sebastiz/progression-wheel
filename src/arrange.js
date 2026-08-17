/* arrange — editing a song's arrangement.

   A structure from the catalogue is a starting point, not a cage: these are the operations that
   turn its plan into your plan. Every one is a pure array transform, which matters because the
   hard part is not moving the rows — it is not losing the melodies while you do it.

   Sections are numbered in playing order (C1, C2, …) and melodies are stored under that number, so
   moving a chorus earlier or inserting one silently renumbers everything after it. Each operation
   therefore returns `[nextRows, origin]`, where `origin[i]` is the index the new row i held in the
   old plan (or -1 if it is brand new). `remapSecs` uses that to carry each section's melodies to
   wherever its row ended up.
*/

/* The instance keys a plan produces, grouped by row — the same numbering the scheduler uses.
   `letterOf` is passed in rather than imported so this module stays free of the catalogue. */
const instKeysOf = (plan, letterOf) => {
  const counts = {};
  return plan.map(row => {
    const L = letterOf(row.sec), ks = [];
    for (let r = 0; r < Math.max(1, row.reps || 1); r++) { counts[L] = (counts[L] || 0) + 1; ks.push(L + counts[L]); }
    return ks;
  });
};

const idAll = n => Array.from({ length: n }, (_, i) => i);
const MAX_ROWS = 24;          // a song with more sections than this is a different kind of document

// swap a row with its neighbour
const planMove = (rows, i, dir) => {
  const j = i + dir;
  if (i < 0 || i >= rows.length || j < 0 || j >= rows.length) return null;
  const next = [...rows], origin = idAll(rows.length);
  [next[i], next[j]] = [next[j], next[i]];
  [origin[i], origin[j]] = [origin[j], origin[i]];
  return [next, origin, j];
};

// more or fewer passes of one section — the "make the drop twice as long" edit
const planReps = (rows, i, d, max = 32) => {
  if (!rows[i]) return null;
  const reps = Math.max(1, Math.min(max, (rows[i].reps || 1) + d));
  if (reps === (rows[i].reps || 1)) return null;
  return [rows.map((r, k) => k === i ? { ...r, reps } : r), idAll(rows.length), i];
};

// duplicate a row in place; the copy carries the original's melodies (origin points back at it)
const planDup = (rows, i) => {
  if (!rows[i] || rows.length >= MAX_ROWS) return null;
  const next = [...rows.slice(0, i + 1), { ...rows[i] }, ...rows.slice(i + 1)];
  const origin = [...idAll(rows.length).slice(0, i + 1), i, ...idAll(rows.length).slice(i + 1)];
  return [next, origin, i + 1];
};

// a song needs at least one section, so the last row cannot be removed
const planDel = (rows, i) => {
  if (rows.length <= 1 || !rows[i]) return null;
  const next = rows.filter((_, k) => k !== i);
  const origin = idAll(rows.length).filter(k => k !== i);
  return [next, origin, Math.max(0, Math.min(i, next.length - 1))];
};

// a brand-new section: origin -1, so it starts empty rather than inheriting anyone's melody
const planAdd = (rows, at, sec, nums = "LOOP") => {
  if (rows.length >= MAX_ROWS) return null;
  const k = Math.max(0, Math.min(at, rows.length));
  const next = [...rows.slice(0, k), { sec, nums, reps: 1, note: null }, ...rows.slice(k)];
  const origin = [...idAll(rows.length).slice(0, k), -1, ...idAll(rows.length).slice(k)];
  return [next, origin, k];
};

/* Move each section's melodies to wherever its row ended up. Pass j of a row inherits pass j of the
   row it came from; if the row gained passes, the extra ones repeat the last written pass rather
   than arriving empty, which is what you want when you stretch a drop from four bars to eight. */
const remapSecs = (secs, oldPlan, newPlan, origin, letterOf, clone) => {
  const oldKeys = instKeysOf(oldPlan, letterOf), newKeys = instKeysOf(newPlan, letterOf);
  const out = {};
  newKeys.forEach((ks, i) => {
    const from = origin[i];
    if (from == null || from < 0) return;                  // a new section starts empty
    const src = oldKeys[from] || [];
    if (!src.length) return;
    ks.forEach((k, j) => {
      const s = secs[src[Math.min(j, src.length - 1)]];
      if (s) out[k] = { ids: [...(s.ids || [])], layers: (s.layers || []).map(clone) };
    });
  });
  return out;
};

/* The same problem as melodies, for everything else stored per section instance — a move, a
   transition. A build set on C2 is stored under "C2", and moving a chorus past another makes the
   old C2 into C1: leave the key alone and the build plays under a different chorus from the one it
   was set on. Section-*type* keys (a bare letter) are left as they are, since types don't renumber. */
const remapKeyed = (map, oldPlan, newPlan, origin, letterOf, clone = v => v) => {
  const entries = Object.entries(map || {});
  if (!entries.some(([k]) => k.length > 1)) return map;      // nothing keyed to an instance
  const oldKeys = instKeysOf(oldPlan, letterOf), newKeys = instKeysOf(newPlan, letterOf);
  const out = {};
  for (const [k, v] of entries) if (k.length === 1) out[k] = v;
  newKeys.forEach((ks, i) => {
    const from = origin[i];
    if (from == null || from < 0) return;                    // a new section starts with no move
    const src = oldKeys[from] || [];
    if (!src.length) return;
    ks.forEach((k, j) => {                                   // extra passes repeat the last written one
      const v = map[src[Math.min(j, src.length - 1)]];
      // cloned, because a value that is an object — a section's drum bars — would otherwise be the
      // *same* array in two sections, and editing one pass would edit the other
      if (v) out[k] = clone(v);
    });
  });
  return out;
};

/* ---- transition cues ----
   A section move is scheduled when its section starts, which is why the scheduler can look it up on
   the downbeat and be done. A transition cannot: it belongs to the section it leads *into*, but the
   riser, the roll and the silence all happen before that section has started, so by the downbeat it
   is already too late to schedule them.

   So the arrangement is turned into cues ahead of time: "at bar 14, schedule a boundary at bar 18".
   The scheduler then fires by bar index, exactly as it already does for automation lanes, and the
   boundary's time is one multiplication away because every bar is the same length.

   Two clamps, both about not reaching into music that has already played: a lead-in never runs back
   past the section before it (a two-bar verse cannot host a four-bar riser — it shortens), and the
   first section of a song has nothing before it at all, so it keeps only the part of its transition
   that happens after the downbeat. `presetOf` returns the resolved preset for an instance, or null:
   the caller owns the instance-then-letter fallback, since that is a song's business, not a plan's. */
const transCues = (insts, presetOf, barBeats) => {
  const list = (insts || []).map((d, i) => presetOf(d, i));
  // the lead-in an instance's own transition actually gets: what it asked for, or the whole of the
  // section before it, whichever is less
  const preOf = i => {
    const T = list[i];
    if (!T || !T.fx || !T.fx.length) return 0;
    const prev = insts[i - 1];
    return Math.min(T.pre || 0, prev ? prev.nbars * barBeats : 0);
  };
  const cues = {};
  insts.forEach((d, i) => {
    const T = list[i];
    if (!T || !T.fx || !T.fx.length) return;
    const pre = preOf(i);
    const fire = d.startBar - Math.ceil(pre / barBeats);
    if (fire < 0) return;                     // its lead-in would start before the song does
    /* …and the tail stops where the next seam's lead-in starts. A four-bar fade-in on a four-bar
       section and a four-bar lead-in out of it write the same gain over the same bars, and the
       second one to be scheduled cancels the first — so the fade-in yields, since the transition
       people actually hear is the one arriving. */
    (cues[fire] = cues[fire] || []).push({ at: d.startBar, id: T.id, key: d.key,
      maxPre: pre, maxPost: Math.max(0, d.nbars * barBeats - preOf(i + 1)) });
  });
  return cues;
};

export { MAX_ROWS, idAll, instKeysOf, planAdd, planDel, planDup, planMove, planReps, remapKeyed, remapSecs, transCues };

/* ---- automation lanes ----
   A section move is a preset applied to a whole section. Automation is the other half: a curve you
   draw across the song, so a build can open over sixteen bars rather than jumping at a boundary.

   A lane is a sparse, sorted list of `{bar, v}` with `v` in 0..1 — one point per bar at most, since
   the scheduler ramps between bars anyway and finer resolution would be stored but never heard.
   Between points the value is linear; outside them it holds flat, so drawing two points at the ends
   of a build gives exactly the ramp you drew and nothing surprising before or after. */

// set (or replace) the point at a bar, keeping the lane sorted
const autoSet = (pts, bar, v) => {
  const b = Math.max(0, Math.round(bar));
  const val = Math.max(0, Math.min(1, v));
  const out = (pts || []).filter(p => p.bar !== b);
  out.push({ bar: b, v: val });
  out.sort((x, y) => x.bar - y.bar);
  return out;
};
const autoDel = (pts, bar) => (pts || []).filter(p => p.bar !== Math.round(bar));

// the lane's value at a bar, or null when the lane is empty and the parameter should be left alone
const autoAt = (pts, bar) => {
  if (!pts || !pts.length) return null;
  if (bar <= pts[0].bar) return pts[0].v;
  const last = pts[pts.length - 1];
  if (bar >= last.bar) return last.v;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (bar <= b.bar) {
      const span = b.bar - a.bar;
      return span <= 0 ? b.v : a.v + (b.v - a.v) * ((bar - a.bar) / span);
    }
  }
  return last.v;
};

/* Drawing sweeps the pointer across bars, and at speed that skips some. Filling the gap keeps the
   drawn line continuous instead of leaving holes wherever the pointer moved faster than the frame
   rate. `from` is the last bar written, so a first touch writes a single point. */
const autoDraw = (pts, from, to, vFrom, vTo) => {
  let out = pts || [];
  const a = Math.round(from), b = Math.round(to);
  if (a === b) return autoSet(out, b, vTo);
  const step = b > a ? 1 : -1, n = Math.abs(b - a);
  for (let k = 1; k <= n; k++) {
    const bar = a + step * k;
    out = autoSet(out, bar, vFrom + (vTo - vFrom) * (k / n));
  }
  return out;
};

const AUTO_LANES = [
  { id:"filter", name:"Filter", tip:"Sweep the whole mix's brightness — the DJ filter. Top is fully open." },
  { id:"level",  name:"Level",  tip:"Ride the whole mix's level — fades, and the hole before a drop." },
];

export { AUTO_LANES, autoAt, autoDel, autoDraw, autoSet };
