/* melody — Melody parts, the grid helpers that place notes on beats, and the two generator tables —
   per-section patterns and whole-song narratives.
*/
/* ===== suggested melody patterns =====
   Each generator returns an array of `nBars` bars; every bar is an array of
   length B (the eighth-note columns), and every cell is an array of scale-degree
   indices (0..6, an index into the diatonic scale). Melodies are written in
   diatonic scale degrees relative to a chosen starting degree, then wrapped back
   into the single-octave grid the writer displays. The context `u` carries:
     u.nBars   — bars in this section
     u.B       — eighth columns per bar (8 in common time, 6 in 3/4 & 6/8)
     u.start   — the chosen starting scale degree (0..6)
     u.chordDegs — per-bar diatonic degree of the bar's chord root (null if the
                   chord is chromatic / outside the key) — used by the arpeggios */
const wrap7 = d => ((d % 7) + 7) % 7;
const qbeats = (B, sub = 2) => Array.from({ length: Math.ceil(B / sub) }, (_, i) => i * sub).filter(x => x < B);
const blankBars = (nBars, B) => Array.from({ length: nBars }, () => Array.from({ length: B }, () => []));
// Melody parts. A section holds a list of them — a dance arrangement wants a sub bass, a pad, an
// arp and a topline all at once, not one tune and an optional harmony. Part 0 is the lead; the
// defaults after it are picked to be audibly distinct from each other out of the box.
const MAX_LAYERS = 6;
const LAYER_NAMES = ["A", "B", "C", "D", "E", "F"];
// grid + notation ink per part, in order. A is the app's green; the rest stay clearly separable.
const LAYER_INK = ["#54B79D", "#B98CF0", "#E8A33D", "#6EA8FF", "#E0687F", "#5FCBC3"];
const LAYER_DEFAULT_INSTR = ["", "ep", "synth_bass_1", "pad_2_warm", "lead_2_sawtooth", "vibraphone"];
// Register, in octaves from the melody grid's own octave. The grid always shows one octave of scale
// degrees, so this is what actually separates a bassline from a topline — without it a part on a
// synth bass just sounds like a mid-register synth. Defaults match the instruments above: the
// bassline drops two octaves, the pad sits under the lead, the saw lead sits above it.
const LAYER_DEFAULT_OCT = [0, 0, -2, -1, 1, 1];
const LAYER_OCT_MIN = -3, LAYER_OCT_MAX = 2;
// Level per part, 0..1. Defaults duck the accompaniment under the lead so a six-part arrangement
// is roughly balanced before you touch anything.
const LAYER_DEFAULT_VOL = [1, 0.8, 0.9, 0.6, 0.7, 0.7];
// one part's gain, folding in mute and any soloing elsewhere in the section
const layerGain = (ly, anySolo) =>
  (ly.mute || (anySolo && !ly.solo)) ? 0 : (ly.vol == null ? 1 : ly.vol);
// Re-time one stored bar onto a grid of B columns. A bar remembers its own resolution in its
// length, so switching between an eighth and a sixteenth rhythm keeps every note where it sounds
// rather than sliding it into the wrong half of the bar. Going finer is lossless; going coarser
// folds notes onto the nearest column (two can land on one, which is what the ear would do too).
const rescaleBar = (bar, B) => {
  if (!bar || !bar.length) return Array.from({ length: B }, () => []);
  if (bar.length === B) return bar.map(col => [...(col || [])]);
  const out = Array.from({ length: B }, () => []);
  bar.forEach((col, c) => {
    if (!col || !col.length) return;
    const nc = Math.min(B - 1, Math.round(c * B / bar.length));
    for (const d of col) if (!out[nc].includes(d)) out[nc].push(d);
  });
  return out;
};
// lay a sequence of degrees onto given columns of one bar
const layBar = (B, cols, degs) => {
  const bar = Array.from({ length: B }, () => []);
  cols.forEach((c, i) => { if (i < degs.length && degs[i] != null && c < B) bar[c] = [wrap7(degs[i])]; });
  return bar;
};
const MELODY_PATTERNS = [
  { id:"arpUp", name:"Arpeggio ↑ (chord tones)",
    desc:"Climbs each bar's chord — root, 3rd, 5th, 7th — one note per beat. Follows the chords; the start note fills in over any out-of-key chord.",
    gen(u){ const Q = qbeats(u.B, u.sub);
      return Array.from({ length:u.nBars }, (_, b) => {
        const g = u.chordDegs[b] == null ? u.start : u.chordDegs[b];
        return layBar(u.B, Q, [g, g+2, g+4, g+6]); }); } },
  { id:"arpDown", name:"Arpeggio ↓ (chord tones)",
    desc:"Falls through each bar's chord from the top down — 5th, 3rd, root. A gentler, more resolved shape than climbing.",
    gen(u){ const Q = qbeats(u.B, u.sub);
      return Array.from({ length:u.nBars }, (_, b) => {
        const g = u.chordDegs[b] == null ? u.start : u.chordDegs[b];
        return layBar(u.B, Q, [g+4, g+2, g, g-3]); }); } },
  { id:"arpRoll", name:"Arpeggio ↑↓ (rolling)",
    desc:"Rolls up the chord and back down within every bar — a continuous broken-chord ripple.",
    gen(u){ return Array.from({ length:u.nBars }, (_, b) => {
        const g = u.chordDegs[b] == null ? u.start : u.chordDegs[b];
        const shape = [0,2,4,6,4,2,0,2].map(x => g + x);
        return layBar(u.B, Array.from({ length:u.B }, (_, i) => i), shape.slice(0, u.B)); }); } },
  { id:"scaleUp", name:"Scale run ↑",
    desc:"A stepwise climb up the scale from your start note, running straight through the whole section.",
    gen(u){ const Q = qbeats(u.B, u.sub); let n = 0;
      return Array.from({ length:u.nBars }, () =>
        layBar(u.B, Q, Q.map(() => u.start + n++))); } },
  { id:"scaleDown", name:"Scale run ↓",
    desc:"A stepwise descent from your start note down the scale, running through the whole section.",
    gen(u){ const Q = qbeats(u.B, u.sub); let n = 0;
      return Array.from({ length:u.nBars }, () =>
        layBar(u.B, Q, Q.map(() => u.start - n++))); } },
  { id:"wave", name:"Wave (up-and-down contour)",
    desc:"A smooth arch that rises a few steps then falls back, over and over — an easy, singable contour.",
    gen(u){ const Q = qbeats(u.B, u.sub); const tri = [0,1,2,3,2,1]; let n = 0;
      return Array.from({ length:u.nBars }, () =>
        layBar(u.B, Q, Q.map(() => u.start + tri[n++ % tri.length]))); } },
  { id:"neighbor", name:"Neighbour tones",
    desc:"Decorates your start note with its upper and lower neighbours — note, step up, note, step down.",
    gen(u){ const Q = qbeats(u.B, u.sub); const fig = [0,1,0,-1]; let n = 0;
      return Array.from({ length:u.nBars }, () =>
        layBar(u.B, Q, Q.map(() => u.start + fig[n++ % fig.length]))); } },
  { id:"pedal", name:"Pedal tone (repeated note)",
    desc:"Repeats your start note on every beat — a drone / chant to build tension against the moving chords.",
    gen(u){ const Q = qbeats(u.B, u.sub);
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, Q.map(() => u.start))); } },
  { id:"callResp", name:"Call & response",
    desc:"A rising question in one bar answered by a falling reply in the next — the two-bar conversation that anchors most tunes.",
    gen(u){ const Q = qbeats(u.B, u.sub);
      return Array.from({ length:u.nBars }, (_, b) =>
        b % 2 === 0 ? layBar(u.B, Q, [0,1,2,3].map(x => u.start + x))
                    : layBar(u.B, Q, [2,1,0,0].map(x => u.start + x))); } },
  { id:"aa", name:"AA — repeat the motif",
    desc:"States one short motif and repeats it in every bar. The most direct way to make a line stick.",
    gen(u){ const Q = qbeats(u.B, u.sub); const A = [0,2,1,0];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, A.map(x => u.start + x))); } },
  { id:"ab", name:"AB — alternating motifs",
    desc:"Alternates a low motif (A) with a higher contrasting one (B), bar by bar — statement and counter-statement.",
    gen(u){ const Q = qbeats(u.B, u.sub); const A = [0,2,1,0], B = [4,2,3,4];
      return Array.from({ length:u.nBars }, (_, b) =>
        layBar(u.B, Q, (b % 2 === 0 ? A : B).map(x => u.start + x))); } },
  { id:"aaba", name:"AABA — motif with a middle turn",
    desc:"Motif A three times with a contrasting B in the third bar — the classic 32-bar sentence in miniature.",
    gen(u){ const Q = qbeats(u.B, u.sub); const A = [0,2,1,0], B = [4,3,2,4];
      return Array.from({ length:u.nBars }, (_, b) =>
        layBar(u.B, Q, (b % 4 === 2 ? B : A).map(x => u.start + x))); } },
  { id:"seqUp", name:"Ascending sequence",
    desc:"Takes one three-note figure and steps it up the scale a degree at a time each bar — builds lift and momentum.",
    gen(u){ const Q = qbeats(u.B, u.sub); const fig = [0,1,2];
      return Array.from({ length:u.nBars }, (_, b) =>
        layBar(u.B, Q, fig.map(x => u.start + x + b))); } },
  { id:"seqDown", name:"Descending sequence",
    desc:"A three-note figure stepped down the scale each bar — an easing, settling motion toward resolution.",
    gen(u){ const Q = qbeats(u.B, u.sub); const fig = [0,-1,-2];
      return Array.from({ length:u.nBars }, (_, b) =>
        layBar(u.B, Q, fig.map(x => u.start + x - b))); } },
  { id:"leaps", name:"Leaping (zig-zag)",
    desc:"Zig-zags between your start note and a note a fifth above — wide, angular intervals for a bolder hook.",
    gen(u){ const Q = qbeats(u.B, u.sub); const fig = [0,4,0,4];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, fig.map(x => u.start + x))); } },
  { id:"qa", name:"Question & answer (resolves to tonic)",
    desc:"An antecedent phrase that rises and hangs, then a consequent that comes to rest on the tonic — a fully closed two-bar sentence.",
    gen(u){ const Q = qbeats(u.B, u.sub);
      return Array.from({ length:u.nBars }, (_, b) =>
        b % 2 === 0 ? layBar(u.B, Q, [u.start, u.start+1, u.start+2, u.start+2])
                    : layBar(u.B, Q, [u.start+1, u.start-1, u.start, 0])); } },
  { id:"archTwo", name:"Two-bar arch",
    desc:"Rises across the first bar and falls back across the second — a broad, singable two-bar arch.",
    gen(u){ const Q = qbeats(u.B, u.sub);
      return Array.from({ length:u.nBars }, (_, b) =>
        layBar(u.B, Q, (b % 2 === 0 ? [0,1,2,3] : [3,2,1,0]).map(x => u.start + x))); } },
  { id:"zigTight", name:"Tight zig-zag",
    desc:"Steps up and dips back on every beat — a busy, chattering close-interval line.",
    gen(u){ const Q = qbeats(u.B, u.sub); const fig = [0,1,0,2];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, fig.map(x => u.start + x))); } },
  { id:"thirds", name:"Skipping thirds",
    desc:"Leaps up a third then steps back down, walking the line upward in gentle skips.",
    gen(u){ const Q = qbeats(u.B, u.sub); const fig = [0,2,1,3];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, fig.map(x => u.start + x))); } },
  { id:"gapfill", name:"Leap & fill",
    desc:"Jumps up to a high note then fills the gap with a stepwise descent — a classic melodic shape.",
    gen(u){ const Q = qbeats(u.B, u.sub); const fig = [4,3,2,1];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, fig.map(x => u.start + x))); } },
  { id:"penta", name:"Pentatonic hook",
    desc:"Stays on the five pentatonic degrees — the notes that sound good over anything — for a foolproof hook.",
    gen(u){ const Q = qbeats(u.B, u.sub); const pent = [0,2,4,5,4,2,1,0]; let n = 0;
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, Q.map(() => u.start + pent[n++ % pent.length]))); } },
  { id:"hook", name:"High-to-low hook",
    desc:"Opens high and tumbles down to the tonic — an instantly memorable pop-hook shape.",
    gen(u){ const Q = qbeats(u.B, u.sub); const fig = [4,4,2,0];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, fig.map(x => u.start + x))); } },
  { id:"pairs", name:"Repeated pairs",
    desc:"Says each note twice before moving on — a stuttering, insistent way to drill a hook in.",
    gen(u){ const Q = qbeats(u.B, u.sub); const fig = [0,0,2,2];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, fig.map(x => u.start + x))); } },
  { id:"turn", name:"Turn (ornament)",
    desc:"Circles the start note — up, home, down, home — the ornamental 'turn' from classical melody.",
    gen(u){ const Q = qbeats(u.B, u.sub); const fig = [1,0,-1,0];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, fig.map(x => u.start + x))); } },
  { id:"fanfare", name:"Fanfare (chord leaps)",
    desc:"Bugle-call leaps around each bar's chord — root, fifth, third, fifth — bold and brassy.",
    gen(u){ const Q = qbeats(u.B, u.sub);
      return Array.from({ length:u.nBars }, (_, b) => {
        const g = u.chordDegs[b] == null ? u.start : u.chordDegs[b];
        return layBar(u.B, Q, [g, g+4, g+2, g+4]); }); } },
  { id:"chordDrop", name:"Chord climb, scale fall",
    desc:"Climbs the bar's chord tones then eases back down the scale — outlines the harmony, then smooths it over.",
    gen(u){ const Q = qbeats(u.B, u.sub);
      return Array.from({ length:u.nBars }, (_, b) => {
        const g = u.chordDegs[b] == null ? u.start : u.chordDegs[b];
        return layBar(u.B, Q, [g, g+2, g+4, g+3]); }); } },
  { id:"bluesy", name:"Bluesy lick",
    desc:"Curls around the third and fourth for a lazy, vocal blues inflection.",
    gen(u){ const Q = qbeats(u.B, u.sub); const fig = [0,2,3,2];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, fig.map(x => u.start + x))); } },
  { id:"offbeat", name:"Off-beat syncopation",
    desc:"Puts the notes on the and-of-each-beat instead of the beat — a syncopated push that pulls against the chords.",
    gen(u){ const off = Array.from({ length:u.B }, (_, i) => i).filter(i => i % 2 === 1); const fig = [0,1,2,3];
      return Array.from({ length:u.nBars }, () => layBar(u.B, off, fig.map(x => u.start + x))); } },
  { id:"riff8", name:"Eighth-note riff",
    desc:"A driving eighth-note riff that repeats every bar — motoric and hooky.",
    gen(u){ const cols = Array.from({ length:u.B }, (_, i) => i); const fig = [0,0,2,0,3,2,1,0];
      return Array.from({ length:u.nBars }, () => layBar(u.B, cols, cols.map((_, i) => u.start + fig[i % fig.length]))); } },
  { id:"sparse", name:"Sparse (lots of space)",
    desc:"Just two notes a bar — a call on beat one, a reply halfway through. Leaves room for the groove to breathe.",
    gen(u){ const half = Math.floor(u.B / 2);
      return Array.from({ length:u.nBars }, (_, b) => {
        const bar = Array.from({ length:u.B }, () => []);
        bar[0] = [wrap7(u.start)]; bar[half] = [wrap7(u.start + (b % 2 ? 2 : 1))]; return bar; }); } },
  { id:"pickup", name:"Pickup + long note",
    desc:"A quick two-note pickup into a note that rings for the rest of the bar — plenty of space to breathe.",
    gen(u){ return Array.from({ length:u.nBars }, () => {
        const bar = Array.from({ length:u.B }, () => []);
        bar[0] = [wrap7(u.start)]; if (u.B > 1) bar[1] = [wrap7(u.start+1)]; if (u.B > 2) bar[2] = [wrap7(u.start+2)];
        return bar; }); } },
  { id:"mirror", name:"Rise then mirror",
    desc:"States a rising shape, then answers it upside-down — the tune folded back on itself.",
    gen(u){ const Q = qbeats(u.B, u.sub);
      return Array.from({ length:u.nBars }, (_, b) =>
        layBar(u.B, Q, (b % 2 === 0 ? [0,1,2,3] : [0,-1,-2,-3]).map(x => u.start + x))); } },
  { id:"cascade", name:"Cascade down",
    desc:"A stepwise tumble that restarts a little lower each bar — a long, settling cascade toward home.",
    gen(u){ const Q = qbeats(u.B, u.sub);
      return Array.from({ length:u.nBars }, (_, b) => layBar(u.B, Q, [3,2,1,0].map(x => u.start + x - b))); } },
  { id:"seq4", name:"Four-bar climb",
    desc:"A short figure nudged up a step every bar — a long build that keeps rising across four bars.",
    gen(u){ const Q = qbeats(u.B, u.sub); const fig = [0,2,1];
      return Array.from({ length:u.nBars }, (_, b) => layBar(u.B, Q, fig.map(x => u.start + x + (b % 4)))); } },
  { id:"qq", name:"Two questions, one answer",
    desc:"Two rising, unresolved phrases then a falling reply that finally lands — a three-part sentence.",
    gen(u){ const Q = qbeats(u.B, u.sub);
      return Array.from({ length:u.nBars }, (_, b) =>
        b % 3 === 2 ? layBar(u.B, Q, [2,1,0,0].map(x => u.start + x))
                    : layBar(u.B, Q, [0,1,2,2].map(x => u.start + x))); } },
  { id:"climb", name:"Climb to a peak",
    desc:"Rises steadily across the whole section to a high point — one long crescendo of pitch.",
    gen(u){ const Q = qbeats(u.B, u.sub); let n = 0; const total = Math.max(1, u.nBars * Q.length - 1);
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, Q.map(() => u.start + Math.round((n++ / total) * 6)))); } },
  { id:"drone5", name:"Fifth pedal",
    desc:"Holds the fifth of the key as a bright high drone on every beat — tension over the moving chords.",
    gen(u){ const Q = qbeats(u.B, u.sub);
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, Q.map(() => u.start + 4))); } },
  { id:"waltzArp", name:"Waltz lilt",
    desc:"Three notes a bar lilting up the chord — made for 3/4 and 6/8, but lovely anywhere.",
    gen(u){ const Q = qbeats(u.B, u.sub);
      return Array.from({ length:u.nBars }, (_, b) => {
        const g = u.chordDegs[b] == null ? u.start : u.chordDegs[b];
        return layBar(u.B, Q, [g, g+2, g+4]); }); } },
];

/* ===== melodic narratives =====
   A melody pattern shapes one section. A *narrative* is a single melodic idea told across the
   WHOLE song: it writes every section's grid in one go, deciding each section's register, density
   and contour from what that section IS (verse / chorus / bridge …), which pass of it this is, and
   where it sits in the running order. That's the difference between a tune and a shape that goes
   somewhere — the arch of a ballad, the withheld top note, the motif that climbs a step each time.

   Each narrative's `gen(u)` returns one section's bars (same format as MELODY_PATTERNS). Context:
     u.nBars / u.B      — bars in this section, eighth columns per bar
     u.nd               — scale degrees available (the grid is one octave: 0 = tonic … nd-1)
     u.chordDegs        — per-bar diatonic degree of the bar's chord root (null if chromatic)
     u.role             — section letter: V verse, C chorus, B bridge, P pre-chorus, I intro,
                          S solo, R refrain, T tag, U build, D drop, K break, O outro, L loop
     u.pass / u.passes  — which pass of this role (0-based) out of how many
     u.idx / u.total    — position in the running order; u.frac — 0 at the top, 1 at the end   */

const clampDeg = (d, nd) => Math.max(0, Math.min(nd - 1, Math.round(d)));
// where notes want to sit in a bar, most-wanted first: downbeat, half-bar, the other beats, off-beats
const colPrefs = (B, sub = 2) => {
  const beats = qbeats(B, sub), half = Math.floor(B / 2), offs = [];
  // offbeats, coarsest first: the half-beat before the sixteenth subdivisions, so a melody
  // fills the strong positions before it starts syncopating
  for (let step = sub / 2; step >= 1; step /= 2)
    for (let i = step; i < B; i += sub) if (Number.isInteger(i)) offs.push(i);
  const order = B % (sub * 2) === 0 ? [0, half, ...beats, ...offs] : [0, ...beats, half, ...offs];
  return [...new Set(order)].filter(c => c >= 0 && c < B);
};
// n notes in a bar, spread over the strongest available positions
const nCols = (B, n, sub = 2) => colPrefs(B, sub).slice(0, Math.max(1, Math.min(n, B))).sort((a, b) => a - b);
// notes per bar by section role — choruses sing out, verses sit back, intros and outros breathe
const ROLE_N = { I:2, V:3, P:3, C:4, B:2, S:4, R:4, T:3, U:3, D:4, K:2, O:2, A:3, H:3, L:3 };
const roleN = (role, d = 3) => ROLE_N[role] || d;
// how high in the octave a section sits: 0 = bottom, 1 = top. The single biggest lever a narrative
// has — pop's "big chorus" is usually just the same notes sung higher.
const ROLE_LIFT = { I:0.1, V:0.15, P:0.45, C:0.75, B:0.5, S:0.6, R:0.7, T:0.5, U:0.55, D:0.85,
  K:0.2, O:0.1, A:0.35, H:0.4, L:0.35 };
const roleLift = (role, d = 0.35) => (ROLE_LIFT[role] != null ? ROLE_LIFT[role] : d);
// a section's register window [lo, hi]: `width` (0–1) of the octave, floated by the role's lift
const winFor = (u, width) => {
  const span = Math.max(1, Math.min(u.nd - 1, Math.round((u.nd - 1) * width)));
  const lo = Math.round(roleLift(u.role) * (u.nd - 1 - span));
  return [lo, lo + span];
};
// nearest chord tone to a degree — locks a shaped line onto the harmony under it
const chordSnap = (deg, cd, nd) => {
  if (cd == null) return deg;
  let best = deg, bd = Infinity;
  for (const t of [cd, cd + 2, cd + 4]) {
    const x = ((t % nd) + nd) % nd;
    if (Math.abs(x - deg) < bd) { bd = Math.abs(x - deg); best = x; }
  }
  return best;
};
// walk a section slot by slot. `colsOf(bar)` picks that bar's columns; `degAt` returns the degree
// for each slot from { b bar, i note-in-bar, n notes-in-bar, c column, g slot number,
// t 0→1 through the section, cd the bar's chord degree }.
const narBars = (u, colsOf, degAt) => {
  const per = Array.from({ length:u.nBars }, (_, b) => colsOf(b));
  const N = per.reduce((n, a) => n + a.length, 0) || 1;
  let g = 0;
  return per.map((cols, b) => {
    const bar = Array.from({ length:u.B }, () => []);
    cols.forEach((c, i) => {
      const d = degAt({ b, i, n:cols.length, c, g, t: N > 1 ? g / (N - 1) : 0, cd:u.chordDegs[b] });
      g++;
      if (d != null) bar[c] = [clampDeg(d, u.nd)];
    });
    return bar;
  });
};
const isHook = role => "CDR".includes(role);   // the sections that are meant to be the payoff

const NARRATIVES = [
 { id:"arch", name:"Arch — rise and fall",
   tip:"Every section is one arch: the line climbs to a peak halfway through and settles back down where it started. The oldest singable shape there is — it breathes like a spoken sentence, and it's why a ballad verse feels complete without a chorus.",
   refs:"Someone Like You (verse) · Yesterday · Hallelujah",
   gen(u){ const [lo, hi] = winFor(u, 0.6);
     return narBars(u, () => nCols(u.B, roleN(u.role), u.sub),
       s => lo + (hi - lo) * Math.sin(Math.PI * s.t)); } },

 { id:"archSong", name:"Song-length arch",
   tip:"One arch across the whole running order instead of one per phrase: the register creeps up to the middle of the song and eases back down to the outro. Each section stays simple — the story is the long climb and the long fall.",
   refs:"Bohemian Rhapsody · Stairway to Heaven · A Day in the Life",
   gen(u){ const lo = Math.round(Math.sin(Math.PI * u.frac) * (u.nd - 3)), hi = lo + 2;
     return narBars(u, () => nCols(u.B, roleN(u.role), u.sub),
       s => lo + (hi - lo) * (0.5 - 0.5 * Math.cos(2 * Math.PI * s.t))); } },

 { id:"terraced", name:"Terraced — a step higher each time",
   tip:"States a short motif, then repeats it a step higher, bar after bar. The most reliable way to build a bridge or a final chorus: nothing changes except the height, so the lift is felt rather than noticed.",
   refs:"Where the Streets Have No Name · Sigur Rós builds · gospel vamps",
   gen(u){ const [lo, hi] = winFor(u, 0.55), fig = [0, 2, 1];
     return narBars(u, () => nCols(u.B, Math.max(3, roleN(u.role)), u.sub),
       s => lo + fig[s.i % fig.length] + (s.b % Math.max(1, hi - lo))); } },

 { id:"expand", name:"Range expansion at the hook",
   tip:"Verses stay inside two or three notes; the chorus opens the whole octave and leaps to the top. The commonest trick in pop — the hook feels enormous because everything around it was deliberately made small.",
   refs:"Where the Streets Have No Name · Someone Like You (chorus) · Rolling in the Deep",
   gen(u){ const top = u.nd - 1;
     if (!isHook(u.role)) { const fig = [0, 1, 0, -1];        // narrow noodle, low in the octave
       return narBars(u, () => nCols(u.B, roleN(u.role), u.sub), s => 1 + fig[s.g % fig.length]); }
     return narBars(u, () => nCols(u.B, 4, u.sub),                   // leap to the top, then fill back down
       s => s.i === 0 ? (s.b % 2 ? 2 : 0) : top - (s.i - 1)); } },

 { id:"lament", name:"Descending lament",
   tip:"A stepwise fall, phrase after phrase, each one starting near the top and sinking toward the tonic. Grief music since the Baroque lament bass, and still the default shape for a sad ballad — especially over a descending bass line.",
   refs:"Dido's Lament · Stay With Me · Hurt",
   gen(u){ const [lo, hi] = winFor(u, 0.85);
     return narBars(u, () => nCols(u.B, roleN(u.role), u.sub), s => hi - (s.g % (hi - lo + 1))); } },

 { id:"ostinato", name:"Ostinato — one repeating cell",
   tip:"The melody IS a short cell, repeated unchanged, with the harmony moving underneath doing all the work. Textural rather than narrative — it's the reason a four-chord loop can carry a whole track without the tune ever developing.",
   refs:"Shape of You · Clocks · most house and minimalism",
   gen(u){ const [lo] = winFor(u, 0.5), cell = [0, 2, 4, 2, 0, 2, 4, 4];
     const cols = Array.from({ length:u.B }, (_, i) => i).filter(i => i % 2 === 0 || i % 4 === 1);
     return narBars(u, () => cols, s => lo + cell[s.i % cell.length]); } },

 { id:"climb", name:"Long climb across the song",
   tip:"Each section sits a little higher than the one before, so the last pass is the highest thing in the song without a single new chord. Register standing in for a key change — cheaper, and it never sounds like a gimmick.",
   refs:"Hey Jude · Champagne Supernova · Chandelier",
   gen(u){ const base = Math.round(u.frac * (u.nd - 3)), fig = [0, 2, 1, 2];
     return narBars(u, () => nCols(u.B, roleN(u.role), u.sub), s => base + fig[s.i % fig.length]); } },

 { id:"peak", name:"Withheld peak — save the top note",
   tip:"Keeps the whole song inside a low, narrow band and spends the top of the octave exactly once, in the final section. The high note lands because you'd never heard it before — restraint is the whole technique.",
   refs:"Landslide · I Will Always Love You · Wuthering Heights",
   gen(u){ const last = u.idx >= u.total - 1;
     if (!last) { const fig = [0, 1, 2, 1];
       return narBars(u, () => nCols(u.B, roleN(u.role), u.sub), s => fig[s.g % fig.length]); }
     return narBars(u, () => nCols(u.B, 4, u.sub), s => (u.nd - 1) - (s.g % 4)); } },

 { id:"period", name:"Question & answer phrases",
   tip:"Two-bar sentences all the way through: the first bar rises and hangs unresolved, the second falls and lands home on the tonic. Classical period form, and the backbone of nearly every tune people can sing back at you.",
   refs:"Twinkle Twinkle · Let It Be · Don't Look Back in Anger",
   gen(u){ const [lo, hi] = winFor(u, 0.7);
     return narBars(u, () => nCols(u.B, roleN(u.role), u.sub), s => {
       const x = s.n > 1 ? s.i / (s.n - 1) : 0;
       if (s.b % 2 === 0) return lo + 1 + (hi - lo - 1) * x;         // antecedent — rises, hangs
       return s.i === s.n - 1 ? 0 : hi - (hi - lo) * x; }); } },     // consequent — falls home

 { id:"callResp", name:"Call & response",
   tip:"A phrase up high answered by a sparser, lower reply in the next bar — the preacher-and-congregation shape that runs through blues, gospel and soul. Keeping the answer thin is what makes it sound like a second voice.",
   refs:"I Got You (I Feel Good) · Hound Dog · most 12-bar blues",
   gen(u){ const [lo, hi] = winFor(u, 0.8);
     return narBars(u, b => nCols(u.B, b % 2 ? 2 : roleN(u.role, 4), u.sub),
       s => s.b % 2 ? lo + (s.n - 1 - s.i) : hi - s.i); } },

 { id:"germ", name:"Motif development (one germ cell)",
   tip:"States a three-note cell at the top of the song and then works it — the same shape transposed, inverted, stretched, and finally returned. Nothing is new and everything is related: the through-composed way to hold a long song together.",
   refs:"Beethoven's 5th · Norwegian Wood · Paranoid Android",
   gen(u){ const v = u.idx % 4;                       // 0 state · 1 transpose · 2 invert · 3 stretch
     const shape = v === 2 ? [0, -2, -1] : [0, 2, 1];
     const base = v === 1 ? 2 : v === 2 ? 3 : v === 3 ? 1 : 0;
     const lift = Math.round(roleLift(u.role) * (u.nd - 4));
     return narBars(u, () => nCols(u.B, v === 3 ? 2 : 3, u.sub),
       s => lift + base + shape[(v === 3 ? s.g : s.i) % shape.length] + (s.b % 2 ? 1 : 0)); } },

 { id:"pendulum", name:"Widening pendulum",
   tip:"The line rocks between two notes for the whole song, but the gap between them opens as it grows: a second in the verse, a third by the pre-chorus, a fifth in the last chorus. Motion without actually going anywhere.",
   refs:"Seven Nation Army · Billie Jean · Take Me Out",
   gen(u){ const gap = Math.max(1, Math.min(u.nd - 2,
       1 + Math.round(u.frac * 2 + roleLift(u.role) * 3)));
     const lo = Math.max(0, Math.min(u.nd - 1 - gap, 1));
     return narBars(u, () => nCols(u.B, roleN(u.role, 4), u.sub), s => s.g % 2 ? lo + gap : lo); } },

 { id:"chant", name:"Chant, then release",
   tip:"Verses sit on one repeated reciting note — speech on a pitch, with a small drop at the end of each phrase — so the chorus's first real melodic move sounds like the song finally opening its mouth.",
   refs:"Royals · Subterranean Homesick Blues · psalm tones",
   gen(u){ if (!isHook(u.role) && u.role !== "T") {
       const rec = 2;
       return narBars(u, () => nCols(u.B, Math.max(3, roleN(u.role)), u.sub),
         s => s.i === s.n - 1 && s.b % 2 ? rec - 1 : rec); }
     const [lo, hi] = winFor(u, 0.9);
     return narBars(u, () => nCols(u.B, 4, u.sub), s => lo + (hi - lo) * Math.sin(Math.PI * s.t)); } },

 { id:"wave", name:"Waves — long undulation",
   tip:"A continuous rise and fall that never quite settles, with a longer wavelength in the choruses than the verses: restless underneath the words, expansive under the hook.",
   refs:"Wichita Lineman · Nothing Compares 2 U · Bittersweet Symphony",
   gen(u){ const [lo, hi] = winFor(u, 0.75), cyc = isHook(u.role) ? 1 : 2;
     return narBars(u, () => nCols(u.B, roleN(u.role, 4), u.sub),
       s => lo + (hi - lo) * (0.5 - 0.5 * Math.cos(2 * Math.PI * cyc * s.t))); } },

 { id:"cascade", name:"Cascading sequence",
   tip:"One falling figure, restated a step lower every bar — a staircase down. The mirror of the terraced build; spend it on a section that has to lose altitude, like a post-chorus or the way out of a bridge.",
   refs:"Ain't No Sunshine · While My Guitar Gently Weeps · Für Elise",
   gen(u){ const [lo, hi] = winFor(u, 0.85), fig = [0, -1, -2];
     return narBars(u, () => nCols(u.B, 3, u.sub),
       s => hi - (s.b % Math.max(1, hi - lo)) + fig[s.i % fig.length]); } },

 { id:"gapfill", name:"Leap, then fill the gap",
   tip:"Every phrase jumps a wide interval and then walks stepwise back through the space it just skipped. The shape ears find most satisfying, and the reason a big leap never sounds arbitrary when it's answered.",
   refs:"Over the Rainbow · Take On Me · Superman theme",
   gen(u){ const [lo, hi] = winFor(u, 0.95);
     return narBars(u, () => nCols(u.B, roleN(u.role, 4), u.sub),
       s => s.i === 0 ? lo : hi - (s.i - 1)); } },

 { id:"converse", name:"Speech contour",
   tip:"Narrow, conversational phrases that drop at the end like a spoken sentence, with air between them. Lets the words lead — the natural home for a lyric-heavy verse, and it makes any sung chorus after it feel like singing.",
   refs:"Tangled Up in Blue · Tom's Diner · Common People",
   gen(u){ const base = 2 + Math.round(roleLift(u.role) * 2);
     return narBars(u, b => nCols(u.B, b % 2 ? 2 : 4, u.sub),
       s => s.i === s.n - 1 ? base - (s.b % 2 ? 2 : 1) : base + (s.i % 2)); } },

 { id:"chordLock", name:"Chord-locked hook",
   tip:"The same rhythmic cell in every bar, but every note snapped to the chord underneath: the tune only moves because the harmony does. Made for a progression with strong bass movement — the melody spells the changes out.",
   refs:"Don't Stop Believin' · Let It Be · Dreams",
   gen(u){ const cell = [0, 2, 1, 2], lift = Math.round(roleLift(u.role) * 3);
     return narBars(u, () => nCols(u.B, roleN(u.role, 4), u.sub),
       s => chordSnap(clampDeg(cell[s.i % cell.length] + lift, u.nd), s.cd, u.nd)); } },

 { id:"suspend", name:"Suspension chain",
   tip:"Lands a step above the chord on every downbeat and resolves it down onto a chord tone — then the next chord turns that resolution into a clash again. The ache that keeps a slow song moving when nothing else is happening.",
   refs:"Bridge Over Troubled Water · Nothing Compares 2 U · Nuvole Bianche",
   gen(u){ return narBars(u, () => nCols(u.B, 2, u.sub), s => {
       const tone = chordSnap(3 + Math.round(roleLift(u.role) * 2), s.cd, u.nd);
       return s.i === 0 ? tone + 1 : tone; }); } },
];

export { LAYER_DEFAULT_INSTR, LAYER_DEFAULT_OCT, LAYER_DEFAULT_VOL, LAYER_INK, LAYER_NAMES, LAYER_OCT_MAX, LAYER_OCT_MIN, MAX_LAYERS, MELODY_PATTERNS, NARRATIVES, ROLE_LIFT, ROLE_N, blankBars, chordSnap, clampDeg, colPrefs, isHook, layBar, layerGain, nCols, narBars, qbeats, rescaleBar, roleLift, roleN, winFor, wrap7 };
