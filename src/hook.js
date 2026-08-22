/* hook — the catchiness toolkit: what makes a phrase stick, measured and manipulated.

   Everything here works on the same bars the melody grid stores — arrays of columns, each column a
   list of scale-degree indices — and everything is pure and deterministic: the same melody always
   gets the same report, the same fix and the same variants, so a shared sketch reads the same
   wherever it is opened.

   Three tools share the file because they share the same premise, that catchiness has structure:
   - the *report card* scores a phrase against the properties the earworm literature keeps finding
     (mostly stepwise, one distinctive leap that gets answered, a singable range, a motif that
     restates itself, an ending that lands) and each failed line carries a fix;
   - *syncopate* is the single most reliable of those properties applied as an edit — anticipation,
     the note arriving half a beat before the beat it was written on;
   - the *tournament pool* turns one hook into a family of rivals to audition, built from the same
     variation engine the repeat-varying features use. */

import { barNotes, chordSnap, clampDeg, hash01, motifRuns, unitSpans, varyPass, varyWithin } from "./melody.js";

// bars as one comparable string — enough to tell two variants apart
const hookKey = bars => bars.map(b => b.map(c => (c && c.length ? c[0] : ".")).join("")).join("|");
const dup = bars => bars.map(bar => bar.map(col => [...(col || [])]));

/* The phrase as one flat list of onsets — {c absolute column, len, d degree} — which is what every
   check below reads. A run of the same degree across columns is one held note, as everywhere else. */
const flatNotes = bars => {
  const out = [];
  bars.forEach((bar, b) => {
    for (const n of barNotes(bar)) out.push({ ...n, c: b * bar.length + n.c, bar: b });
  });
  return out;
};

/* ===== syncopate =====
   Anticipation: a note on a beat moved half a beat early, held through the beat it left. The push
   that makes a line lean forward — pop and house's most dependable trick, and pure rhythm, so the
   tune itself is untouched.

   Level 1 pushes the backbeats (beats 2 and 4 — the odd beats); level 2 pushes every beat but the
   bar's downbeat, which stays put so the bar still says where it starts. A note is only pushed
   into space: if the half-beat before it is another note's onset the push would eat a note, so
   that one stays where it was (a held note's tail is fair game — the push shortens it, which is
   exactly what a player's anticipation does to the note before). */
const SYNC_LEVELS = [[0, "as written"], [1, "push the backbeats"], [2, "push every beat"]];
const syncopateBars = (bars, sub, level = 1) => {
  if (!level) return dup(bars);
  const push = Math.max(1, Math.round(sub / 2));            // half a beat, ≥ one column
  return bars.map(bar => {
    const B = bar.length, ns = barNotes(bar);
    const out = Array.from({ length: B }, () => []);
    const moved = ns.map(n => {
      const beat = n.c / sub;
      const onBeat = Number.isInteger(beat);
      const want = onBeat && beat > 0 && (level > 1 || beat % 2 === 1);
      if (!want || n.c - push < 0) return n;
      // never onto another note's onset — a push that swallows a note is an edit, not a feel
      const clash = ns.some(o => o !== n && o.c > n.c - push - 1 && o.c < n.c);
      return clash ? n : { ...n, c: n.c - push, len: n.len + push };
    });
    // later notes overwrite the tails of earlier ones, the way the pushed onset truncates the
    // note it leans into
    for (const n of moved) for (let k = 0; k < n.len && n.c + k < B; k++) out[n.c + k] = [n.d];
    for (const n of moved) out[n.c] = [n.d];                 // onsets survive any tail overlap
    return out;
  });
};

/* ===== the report card =====
   Each check reads the phrase and returns a score in 0..1, a one-line reading, and — where a fix
   is honest to automate — a pure transform that improves exactly that line. The context `u`:
     u.bars       — the melody, grid bars
     u.nd         — degrees in the grid's octave
     u.sub        — columns per beat
     u.chordDegs  — per-bar diatonic degree of the bar's chord root (null if chromatic)
   A check may return null: "no leaps to answer" is not a grade, it is the check sitting out. */

const intervals = ns => ns.slice(1).map((n, i) => n.d - ns[i].d);

const HOOK_CHECKS = [
  { id: "steps", name: "Mostly stepwise", weight: 1.5,
    tip: "Singable tunes move by step far more than they leap — a line the ear can hum along to on first hearing.",
    run(u) {
      const ns = flatNotes(u.bars);
      if (ns.length < 3) return null;
      const ivs = intervals(ns);
      const frac = ivs.filter(v => Math.abs(v) <= 1).length / ivs.length;
      if (frac >= 0.6) return { score: 1, detail: `${Math.round(frac * 100)}% of the motion is by step` };
      return { score: Math.max(0.1, frac / 0.6),
        detail: `only ${Math.round(frac * 100)}% of the motion is by step — the line leaps about`,
        fixLabel: "smooth the wildest leaps",
        // fold the widest leaps by moving their landing note toward the note before it
        fix(bars) {
          const out = dup(bars);
          const ns = flatNotes(out);
          const leaps = ns.map((n, i) => i > 0 ? { i, w: Math.abs(n.d - ns[i - 1].d) } : null)
            .filter(x => x && x.w >= 3).sort((a, b) => b.w - a.w).slice(0, 2);
          for (const l of leaps) {
            const n = ns[l.i], prev = ns[l.i - 1];
            const d = clampDeg(prev.d + Math.sign(n.d - prev.d) * 2, u.nd);
            const bar = out[n.bar], c0 = n.c - n.bar * bar.length;
            for (let k = 0; k < n.len && c0 + k < bar.length; k++) bar[c0 + k] = [d];
            n.d = d;
          }
          return out;
        } };
    } },
  { id: "leap", name: "One leap to remember", weight: 1,
    tip: "The distinctive interval — the one wide jump that makes this hook this hook. All steps is safe and forgettable; several leaps is scribble.",
    run(u) {
      const ns = flatNotes(u.bars);
      if (ns.length < 3) return null;
      const leaps = intervals(ns).filter(v => Math.abs(v) >= 3).length;
      if (leaps >= 1 && leaps <= 3) return { score: 1, detail: leaps === 1 ? "one wide leap — the signature move" : `${leaps} wide leaps` };
      if (leaps === 0) return { score: 0.3, detail: "no leap at all — nothing for the ear to hold on to",
        fixLabel: "lift the peak into a leap",
        // raise the phrase's highest note a third, making the approach to it the leap
        fix(bars) {
          const out = dup(bars);
          const ns = flatNotes(out);
          const top = ns.reduce((a, n) => (n.d > a.d ? n : a), ns[0]);
          const d = clampDeg(top.d + 2, u.nd);
          const bar = out[top.bar], c0 = top.c - top.bar * bar.length;
          for (let k = 0; k < top.len && c0 + k < bar.length; k++) bar[c0 + k] = [d];
          return out;
        } };
      return { score: 0.4, detail: `${leaps} wide leaps — the special move is special because it is rare` };
    } },
  { id: "gapfill", name: "Leaps answered", weight: 1,
    tip: "A wide leap wants to be followed by steps back the other way — the gap-fill shape ears have found satisfying for centuries.",
    run(u) {
      const ns = flatNotes(u.bars);
      const ivs = intervals(ns);
      const leaps = ivs.map((v, i) => ({ v, i })).filter(x => Math.abs(x.v) >= 3 && x.i + 1 < ivs.length);
      if (!leaps.length) return null;                        // nothing to answer — sit the check out
      const filled = leaps.filter(x => {
        const nxt = ivs[x.i + 1];
        return Math.sign(nxt) === -Math.sign(x.v) && Math.abs(nxt) <= 2;
      }).length;
      const frac = filled / leaps.length;
      if (frac >= 0.99) return { score: 1, detail: "every leap steps back the other way" };
      return { score: 0.3 + 0.7 * frac,
        detail: `${filled} of ${leaps.length} leap${leaps.length > 1 ? "s" : ""} answered — the rest just leave`,
        fixLabel: "answer the leaps",
        fix(bars) {
          const out = dup(bars);
          const ns = flatNotes(out), ivs = intervals(ns);
          for (let i = 0; i < ivs.length - 1; i++) {
            if (Math.abs(ivs[i]) < 3) continue;
            const nxt = ivs[i + 1];
            if (Math.sign(nxt) === -Math.sign(ivs[i]) && Math.abs(nxt) <= 2) continue;
            const n = ns[i + 2], from = ns[i + 1];
            const d = clampDeg(from.d - Math.sign(ivs[i]), u.nd);
            const bar = out[n.bar], c0 = n.c - n.bar * bar.length;
            for (let k = 0; k < n.len && c0 + k < bar.length; k++) bar[c0 + k] = [d];
            n.d = d; ivs[i + 1] = d - from.d; if (i + 2 < ns.length - 1) ivs[i + 2] = ns[i + 3].d - d;
          }
          return out;
        } };
    } },
  { id: "anchor", name: "Sits on the groove", weight: 1,
    tip: "A hook needs some notes square on the beat to anchor it and some off the beat to make it move. All of one is floating; all of the other is a march.",
    run(u) {
      const ns = flatNotes(u.bars);
      if (ns.length < 2) return null;
      const on = ns.filter(n => n.c % u.sub === 0).length / ns.length;
      if (on >= 0.35 && on <= 0.9) return { score: 1, detail: `${Math.round(on * 100)}% of the notes anchor on beats` };
      if (on > 0.9) return { score: 0.6, detail: "every note square on the beat — try ⇢ Syncopate for some lean" };
      return { score: 0.5, detail: "almost nothing lands on a beat — the line floats free of the groove" };
    } },
  { id: "density", name: "Room to breathe", weight: 1,
    tip: "Two to six notes a bar is where hooks live. Fewer can work over a strong groove; more is a run, not a hook.",
    run(u) {
      const per = u.bars.map(bar => barNotes(bar).length);
      const avg = per.reduce((a, b) => a + b, 0) / Math.max(1, per.length);
      if (avg >= 2 && avg <= 6) return { score: 1, detail: `${avg.toFixed(1)} notes a bar` };
      if (avg < 2) return { score: 0.6, detail: `${avg.toFixed(1)} notes a bar — sparse; fine if the groove carries it` };
      return { score: Math.max(0.2, 6 / avg - 0.4),
        detail: `${avg.toFixed(1)} notes a bar — busier than anything anyone will sing back`,
        fixLabel: "thin the busiest bars",
        fix(bars) {
          const out = dup(bars);
          out.forEach(bar => {
            let ns = barNotes(bar);
            while (ns.length > 6) {
              // drop the most off-beat note — the sixteenth filler goes before the figure does
              const weakest = ns.reduce((a, n) => ((n.c % u.sub) >= (a.c % u.sub) ? n : a), ns[0]);
              for (let k = 0; k < weakest.len; k++) bar[weakest.c + k] = [];
              ns = barNotes(bar);
            }
          });
          return out;
        } };
    } },
  { id: "repeat", name: "Says itself again", weight: 1.5,
    tip: "A motif is only a motif when it comes back. The most reliable single predictor of an earworm is repetition of a short cell.",
    run(u) {
      if (u.bars.length < 2) return null;
      let best = 0, span = 0;
      for (const s of unitSpans(u.bars.length)) {
        const reps = motifRuns(u.bars, s).filter(r => r.occ).length;
        if (reps > best) { best = reps; span = s; }
      }
      if (best) return { score: 1, detail: `the ${span}-bar motif restates itself ${best} time${best > 1 ? "s" : ""}` };
      return { score: 0.25, detail: "nothing restates itself — through-composed lines don't stick",
        fixLabel: "restate the opening",
        // the second half becomes a varied restatement of the first
        fix(bars) {
          const out = dup(bars);
          const half = Math.floor(out.length / 2);
          if (!half) return out;
          for (let b = 0; b < out.length - half; b++)
            out[half + b] = out[b].map(col => [...col]);
          const tail = out.slice(half);
          varyPass(tail, { pass: 1, seed: 977, nd: u.nd, amount: 1 });
          return out;
        } };
    } },
  { id: "vary", name: "Repeats that drift", weight: 0.75,
    tip: "Restated is good; restated identically wears out. The second statement should land somewhere slightly different.",
    run(u) {
      if (u.bars.length < 2) return null;
      let repeats = 0, exact = 0;
      for (const s of unitSpans(u.bars.length)) {
        const runs = motifRuns(u.bars, s);
        const reps = runs.filter(r => r.occ);
        if (reps.length <= repeats) continue;
        repeats = reps.length;
        const key = i => hookKey(u.bars.slice(i, i + s));
        exact = reps.filter(r => key(r.at) === key(r.first * s)).length;
      }
      if (!repeats) return null;                             // the repeat check already said so
      if (!exact) return { score: 1, detail: "every restatement drifts a little" };
      return { score: Math.max(0.4, 1 - exact / repeats),
        detail: `${exact} of ${repeats} restatement${repeats > 1 ? "s are" : " is"} note-for-note identical`,
        fixLabel: "vary the repeats",
        fix(bars) { return varyWithin(dup(bars), { nd: u.nd, amount: 1, seed: 331 }).bars; } };
    } },
  { id: "arc", name: "The peak lands well", weight: 0.75,
    tip: "One clear high point, somewhere past the opening and before the end — or a line that clearly falls all the way. A peak in the first breath has nowhere to go.",
    run(u) {
      const ns = flatNotes(u.bars);
      if (ns.length < 4) return null;
      const top = Math.max(...ns.map(n => n.d));
      const peaks = ns.filter(n => n.d === top);
      const t = ns.indexOf(peaks[0]) / (ns.length - 1);
      const falling = ns.every((n, i) => i === 0 || n.d <= ns[i - 1].d + 1);
      if (falling && ns[0].d === top) return { score: 1, detail: "a clean descent from the top — the lament shape" };
      if (peaks.length <= 2 && t >= 0.2 && t <= 0.85)
        return { score: 1, detail: `one peak, ${Math.round(t * 100)}% of the way through` };
      if (peaks.length > 2) return { score: 0.5, detail: `the top note is hit ${peaks.length} times — a ceiling, not a peak` };
      return { score: 0.5, detail: t < 0.2 ? "the peak lands in the first breath — nowhere to go after it"
        : "the peak is the last thing said — fine for a build, restless for a hook" };
    } },
  { id: "land", name: "Comes home", weight: 1,
    tip: "The last note falls on a chord tone of the final bar — the phrase closes instead of stopping.",
    run(u) {
      const ns = flatNotes(u.bars);
      if (!ns.length) return null;
      const last = ns[ns.length - 1];
      const cd = u.chordDegs ? u.chordDegs[Math.min(last.bar, u.chordDegs.length - 1)] : null;
      const home = cd == null ? [0, 2, 4] : [cd, cd + 2, cd + 4].map(x => ((x % u.nd) + u.nd) % u.nd);
      if (home.includes(last.d)) return { score: 1, detail: "the last note lands on the harmony" };
      return { score: 0.4, detail: "the last note hangs off the chord — an ending that doesn't end",
        fixLabel: "land the last note",
        fix(bars) {
          const out = dup(bars);
          const ns = flatNotes(out), last = ns[ns.length - 1];
          const cd = u.chordDegs ? u.chordDegs[Math.min(last.bar, u.chordDegs.length - 1)] : null;
          const d = cd == null ? (last.d >= 4 ? 4 : 0) : chordSnap(last.d, cd, u.nd);
          const bar = out[last.bar], c0 = last.c - last.bar * bar.length;
          for (let k = 0; k < last.len && c0 + k < bar.length; k++) bar[c0 + k] = [d];
          return out;
        } };
    } },
  { id: "economy", name: "Few notes, well spent", weight: 0.75,
    tip: "Most great hooks use three to five different pitches. Seven different notes is a scale, not a hook.",
    run(u) {
      const ns = flatNotes(u.bars);
      if (ns.length < 3) return null;
      const used = new Set(ns.map(n => n.d)).size;
      if (used <= 5) return { score: 1, detail: `${used} different note${used > 1 ? "s" : ""} do all the work` };
      return { score: used === 6 ? 0.6 : 0.4, detail: `${used} different notes — closer to a scale than a hook`,
        fixLabel: "fold in the strays",
        // the degrees heard only once fold onto the nearest degree the phrase actually lives on
        fix(bars) {
          const out = dup(bars);
          const ns = flatNotes(out);
          const count = {};
          ns.forEach(n => { count[n.d] = (count[n.d] || 0) + 1; });
          const core = Object.keys(count).filter(d => count[d] > 1).map(Number);
          if (!core.length) return out;
          for (const n of ns) {
            if (count[n.d] > 1) continue;
            const d = core.reduce((a, x) => (Math.abs(x - n.d) < Math.abs(a - n.d) ? x : a), core[0]);
            const bar = out[n.bar], c0 = n.c - n.bar * bar.length;
            for (let k = 0; k < n.len && c0 + k < bar.length; k++) bar[c0 + k] = [d];
          }
          return out;
        } };
    } },
];

/* The card itself: every check that had something to say, plus one number. The number is honest
   about what it is — a shape check, not taste — but a 40 and an 85 are different phrases in ways
   the checks can name, which is what makes the number worth printing. */
const hookReport = u => {
  const checks = HOOK_CHECKS.map(ch => {
    const res = ch.run(u);
    return res ? { id: ch.id, name: ch.name, tip: ch.tip, weight: ch.weight, ...res } : null;
  }).filter(Boolean);
  const tot = checks.reduce((a, c) => a + c.weight, 0) || 1;
  const score = Math.round(100 * checks.reduce((a, c) => a + c.score * c.weight, 0) / tot);
  const grade = score >= 85 ? "an earworm shape" : score >= 70 ? "sticky" : score >= 50 ? "getting there" : "a sketch, so far";
  return { score, grade, checks };
};

/* ===== the tournament pool =====
   One hook in, a family of rivals out — each one the same tune pushed through the variation walk
   with a different pass, so the family resembles its parent without two siblings coinciding. The
   duel in the component plays pairs from this pool; winners breed the next challenger. */
const mutateHook = (bars, { seed = 0, pass = 1, nd = 7, amount = 1 } = {}) => {
  const out = dup(bars);
  varyPass(out, { pass, seed, nd, amount });
  // a mutation that lands exactly on its parent is no mutation — push once more, harder
  if (hookKey(out) === hookKey(bars)) varyPass(out, { pass: pass + 3, seed: seed + 977, nd, amount: amount + 1 });
  return out;
};
const hookPool = (bars, { n = 8, seed = 0, nd = 7 } = {}) => {
  const out = [];
  const seen = new Set([hookKey(bars)]);
  for (let i = 1; out.length < n && i <= n * 3; i++) {
    const v = mutateHook(bars, { seed: seed + (i > n ? i * 131 : 0), pass: i, nd, amount: 1 + ((i - 1) % 3) });
    const k = hookKey(v);
    if (seen.has(k)) continue;                               // a duplicate rival is one duel wasted
    seen.add(k);
    out.push(v);
  }
  return out;
};

/* ===== bass riffs written into the kick's holes =====
   In house, garage and drum & bass the hook is as often the bassline as the topline, and what makes
   a bassline groove is where it *isn't*: the kick states the beat, the bass answers in the gaps —
   which is all sidechain pumping fakes. These write a riff for the bass grid (tokens R root,
   F fifth, O octave on the sixteenth grid) directly from the section's own drums: every onset that
   would coincide with a kick is dropped, so the riff interlocks with the groove it was written
   against rather than doubling it.

   Shapes are positioned in beats, like the melody rhythm cells, so they survive 3/4 and a 20-step
   5/4 grid; the seed steps through shapes and variations, so pressing the button again is a
   different riff, and the same seed is always the same riff. */
const RIFF_SHAPES = [
  { id: "offbeat", name: "offbeat pump", cells: [[0.5, "R"], [1.5, "R"], [2.5, "R"], [3.5, "O"]] },
  { id: "tresillo", name: "tresillo", cells: [[0, "R"], [0.75, "R"], [1.5, "O"], [2, "R"], [2.75, "R"], [3.5, "F"]] },
  { id: "dembow", name: "dembow", cells: [[0, "R"], [0.75, "O"], [1.5, "R"], [2, "R"], [2.75, "O"], [3.5, "F"]] },
  { id: "garage", name: "two-step", cells: [[0, "R"], [0.75, "O"], [1.25, "R"], [2, "R"], [2.75, "O"], [3.25, "R"]] },
  { id: "funk", name: "funk holes", cells: [[0, "R"], [0.75, "R"], [1.75, "O"], [2.5, "R"], [3.25, "F"], [3.75, "R"]] },
  { id: "rolling", name: "rolling 16ths", cells: [[0.25, "R"], [0.5, "R"], [0.75, "R"], [1.25, "R"], [1.75, "R"],
    [2.25, "R"], [2.5, "R"], [2.75, "R"], [3.25, "R"], [3.75, "O"]] },
];
/* `drumBars` is the section's resolved drum grid (arrays of step strings); a kick is a K or the 808
   boom B. `steps` is the bass grid's own step count, `barBeats` the bar length in beats. */
const bassRiffBars = (drumBars, steps, barBeats, nBars, seed = 0) => {
  const shape = RIFF_SHAPES[Math.floor(hash01(seed * 131 + 7) * RIFF_SHAPES.length) % RIFF_SHAPES.length];
  const perBeat = steps / barBeats;
  const kickAt = (b, s) => {
    if (!drumBars || !drumBars.length) return false;
    const bar = drumBars[Math.min(b, drumBars.length - 1)];
    if (!bar || !bar.length) return false;
    // the drum grid may tick at a different resolution — compare at the coarser of the two
    const x = (bar[Math.round(s * bar.length / steps)] || "");
    return x.includes("K") || x.includes("B");
  };
  return Array.from({ length: Math.max(1, nBars) }, (_, b) => {
    const bar = Array.from({ length: steps }, () => "");
    const answer = b % 2 === 1;                              // odd bars answer, slightly changed
    // which onset the answer bar drops — hashed from the seed, constant across the section
    const dropAt = Math.floor(hash01(seed * 977 + 13) * shape.cells.length);
    shape.cells.forEach(([pos, tok], i) => {
      if (pos >= barBeats) return;
      const s = Math.round(pos * perBeat);
      if (s >= steps || kickAt(b, s)) return;                // the kick owns that sixteenth
      if (answer && i === dropAt) return;
      bar[s] = answer && i === shape.cells.length - 1 ? (tok === "F" ? "O" : "F") : tok;
    });
    // a bar the kick ate whole keeps its offbeats — a silent bass bar is not a riff
    if (!bar.some(Boolean)) for (let bt = 0; bt < barBeats; bt++) {
      const s = Math.round((bt + 0.5) * perBeat);
      if (s < steps && !kickAt(b, s)) bar[s] = "R";
    }
    return bar;
  });
};
const riffShapeName = seed =>
  RIFF_SHAPES[Math.floor(hash01(seed * 131 + 7) * RIFF_SHAPES.length) % RIFF_SHAPES.length].name;

export { HOOK_CHECKS, RIFF_SHAPES, SYNC_LEVELS, bassRiffBars, flatNotes, hookKey, hookPool, hookReport, mutateHook, riffShapeName, syncopateBars };
