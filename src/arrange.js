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

export { MAX_ROWS, idAll, instKeysOf, planAdd, planDel, planDup, planMove, planReps, remapSecs };
