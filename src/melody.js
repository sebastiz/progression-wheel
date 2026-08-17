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

/* A deterministic 0..1 hash of an integer. Used wherever the app wants something that sounds
   unpredictable — a random arp, humanised timing — but must come out identical on every play,
   render and stem bounce. Math.random() would make a stem disagree with the mix it came from. */
const hash01 = n => {
  let h = (n | 0) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad);
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
};

/* ---- per-part modulation ----
   Everything a part carries beyond its notes is described here once: its key, its default, what
   kind of control it wants and what it does. Normalising a saved section, cloning a part, packing
   a song, unpacking one, drawing the controls and testing them all read this table, so adding a
   modulation is one entry rather than six edits — five of which are easy to forget, which is how
   melodies once went missing from saved sketches entirely.

   A part's settings belong to one section instance, not to the song: the same instrument can be a
   clean pad in the verse and a gated, driven, sidechained one in the chorus. That is the whole
   point of putting them here rather than next to the global Sound controls.

   `own: true` marks the handful of fields that were already stored directly on the layer before
   this table existed (`send`). They are drawn from the same table but packed by their own key, so
   old sketches keep loading.
   `kind` is how it is drawn: "sel" a menu, "amt" a 0..max slider, "bi" a slider centred on zero.
   `dflt` is what "no modulation" looks like — every one of these must be audibly nothing, so a
   part with default settings sounds exactly as it did before any of this existed. */
const MOD_GROUPS = [
  { id:"pattern", name:"Pattern", tip:"What the part plays, before anything is done to the sound",
    mods:[
      { k:"arp", name:"Arp", kind:"sel", dflt:"", opts:"ARPS", off:"off — play the grid",
        tip:"Ignore this part's written notes and walk the chord under each bar instead — it re-follows the harmony whenever you change a chord" },
      { k:"arpRate", name:"Arp rate", kind:"sel", dflt:4, opts:"ARP_RATES", needs:"arp",
        tip:"How fast the arp runs" },
      { k:"arpOct", name:"Arp range", kind:"sel", dflt:1, needs:"arp",
        opts:[[1, "1 oct"], [2, "2 oct"], [3, "3 oct"], [4, "4 oct"]],
        tip:"How many octaves the arp climbs through" },
      { k:"gate", name:"Gate", kind:"sel", dflt:"", opts:"GATES", off:"off",
        tip:"Chop this part into a rhythmic pulse — the trance gate. Works best on a held pad or a long arp." },
    ] },
  { id:"pitch", name:"Pitch", tip:"Where the part sits and how wide it spreads",
    mods:[
      { k:"semis", name:"Transpose", kind:"bi", dflt:0, min:-12, max:12, unit:"st",
        tip:"Move this part by semitones. Unlike Octave this can leave the key — a −3 pad under a major tune is the oldest trick there is." },
      { k:"oct2", name:"Double", kind:"sel", dflt:0,
        opts:[[0, "off"], [1, "+1 oct"], [-1, "−1 oct"], [2, "+2 oct"], [-2, "−2 oct"]],
        tip:"Play every note twice, the second one an octave away. The cheapest way to make a thin lead sound expensive." },
      { k:"detune", name:"Detune", kind:"bi", dflt:0, min:-50, max:50, unit:"¢",
        tip:"Pull the part slightly off pitch. A few cents against a doubled part is what makes a supersaw wide; a lot of it is deliberately sour." },
    ] },
  { id:"tone", name:"Tone", tip:"The filter and the dirt — what turns a note into a sound",
    mods:[
      { k:"cut", name:"Low-pass", kind:"amt", dflt:100, max:100, unit:"%",
        tip:"Take the top off this part. Fully right is open; roll it back and the part sinks behind the ones that are still bright." },
      { k:"res", name:"Resonance", kind:"amt", dflt:0, max:100, unit:"%",
        tip:"Ring the low-pass at its cutoff. A little gives the filter a voice; a lot is the acid whistle." },
      { k:"hp", name:"High-pass", kind:"amt", dflt:0, max:100, unit:"%",
        tip:"Take the bottom off. The single most useful control for stopping a pad and a bass fighting over the same low end." },
      { k:"fenv", name:"Filter env", kind:"amt", dflt:0, max:100, unit:"%",
        tip:"Open the low-pass at the start of every note and let it fall — the squelch under an acid line and the bark of a house stab." },
      { k:"fdec", name:"Env decay", kind:"amt", dflt:30, max:100, unit:"%", needs:"fenv",
        tip:"How long the filter takes to fall back. Short is a click of brightness, long is a sweep on every note." },
      { k:"drive", name:"Drive", kind:"amt", dflt:0, max:100, unit:"%",
        tip:"Overdrive this part. Gentle amounts thicken it; hard amounts are the point of a reese bass." },
    ] },
  { id:"movement", name:"Movement", tip:"Things that move on their own, in time with the tempo",
    mods:[
      { k:"wob", name:"Wobble", kind:"amt", dflt:0, max:100, unit:"%",
        tip:"Sweep the low-pass up and down in time. Dubstep's wobble, trance's breathing pad — the same control at two speeds." },
      { k:"wobRate", name:"Wobble rate", kind:"sel", dflt:2, opts:"LFO_RATES", needs:"wob",
        tip:"How fast the filter sweep cycles, in beats" },
      { k:"trem", name:"Tremolo", kind:"amt", dflt:0, max:100, unit:"%",
        tip:"Pulse the level in time. Softer than a gate, because it fades rather than switching." },
      { k:"tremRate", name:"Tremolo rate", kind:"sel", dflt:4, opts:"LFO_RATES", needs:"trem",
        tip:"How fast the level pulses, in beats" },
      { k:"pan", name:"Pan", kind:"bi", dflt:0, min:-100, max:100, unit:"",
        tip:"Where this part sits across the stereo picture. Two parts panned apart stop sounding like one." },
      { k:"apan", name:"Auto-pan", kind:"amt", dflt:0, max:100, unit:"%",
        tip:"Sweep the part across the stereo picture in time, from wherever Pan has put it." },
      { k:"apanRate", name:"Auto-pan rate", kind:"sel", dflt:1, opts:"LFO_RATES", needs:"apan",
        tip:"How fast the part travels across the stereo picture, in beats" },
    ] },
  { id:"feel", name:"Feel", tip:"How the notes sit against the beat, and how alike they are",
    mods:[
      { k:"len", name:"Note length", kind:"amt", dflt:100, max:200, unit:"%",
        tip:"Stretch or shorten every note without moving where it starts. Short is staccato, long runs the notes into each other." },
      { k:"nudge", name:"Nudge", kind:"bi", dflt:0, min:-50, max:50, unit:"ms",
        tip:"Push the whole part early or late by a few milliseconds. Late is a lazy, behind-the-beat feel; early leans forward." },
      { k:"swing", name:"Swing", kind:"amt", dflt:0, max:100, unit:"%",
        tip:"Delay this part's off-beats. Swing on one part against a straight one is most of what makes a groove." },
      { k:"prob", name:"Play chance", kind:"amt", dflt:100, max:100, unit:"%",
        tip:"Skip some notes. Below 100% the part thins out differently in each bar — the same every time the song is played, so it stays yours." },
      { k:"accent", name:"Accent", kind:"amt", dflt:0, max:100, unit:"%",
        tip:"Play the downbeats harder than the rest. Nothing sounds more like a machine than every note at the same level." },
    ] },
  { id:"space", name:"Space", tip:"How far away the part is, and how it answers the kick",
    mods:[
      { k:"send", name:"Echo", kind:"amt", dflt:0, max:100, unit:"%", own:true, needsDelay:true, scale:100,
        tip:"How much of this part is echoed by the tempo-synced delay" },
      { k:"verb", name:"Reverb", kind:"amt", dflt:0, max:100, unit:"%",
        tip:"Push this part back into the room. A little on one part and none on another is depth; a lot on everything is fog." },
      { k:"duck", name:"Pump", kind:"amt", dflt:null, max:100, unit:"%", auto:true, scale:100,
        tip:"How hard the kick ducks this part. All the way left follows the global Pump; move it and this part gets its own depth — a bass that ducks hard under a pad that barely moves." },
    ] },
];
// LFO speeds, in beats per cycle. Named in beats rather than Hz so they stay in time at any tempo.
const LFO_RATES = [[8, "8 bars"], [4, "4 bars"], [2, "2 bars"], [1, "1 bar"], [0.5, "1/2"],
  [0.25, "1/4"], [0.125, "1/8"], [0.0625, "1/16"]];
const MODS = MOD_GROUPS.flatMap(g => g.mods);
const MOD_BY_KEY = Object.fromEntries(MODS.map(m => [m.k, m]));
/* The persistence list. `own` mods are packed under their own key by song.js and so are left out,
   or they would be written twice and read back inconsistently. */
const LAYER_FX = MODS.filter(m => !m.own).map(m => [m.k, m.dflt]);
// read a part's effects, filling in defaults for anything a saved section predates
const layerFx = ly => Object.fromEntries(LAYER_FX.map(([k, d]) => [k, ly && ly[k] != null ? ly[k] : d]));
// one modulation's value on a part, default included — the reader every control and the scheduler use
const modOf = (ly, k) => {
  const m = MOD_BY_KEY[k];
  const v = ly ? ly[k] : undefined;
  return v == null ? (m ? m.dflt : null) : v;
};
// how many of a part's modulations are doing something — the badge on its tab, so a part carrying
// settings is visible without opening it
const modCount = ly => MODS.reduce((n, m) => n + (modOf(ly, m.k) !== m.dflt ? 1 : 0), 0);

/* Arpeggiators. Each mode turns a chord's notes into an order to play them in — `seq(n)` returns
   indices into the pooled notes (the chord's voicing, repeated up through `arpOct` octaves). The
   step index is derived from the absolute tick rather than a running counter, so a render and a
   stem bounce produce exactly the same line as playback did. */
const ARPS = [
  { id:"up",      name:"Up",            seq:(i, n) => i % n },
  { id:"down",    name:"Down",          seq:(i, n) => n - 1 - (i % n) },
  { id:"updown",  name:"Up & down",     seq:(i, n) => { const p = n > 1 ? 2 * n - 2 : 1, k = i % p; return k < n ? k : p - k; } },
  { id:"downup",  name:"Down & up",     seq:(i, n) => { const p = n > 1 ? 2 * n - 2 : 1, k = i % p; return k < n ? n - 1 - k : k - n + 1; } },
  { id:"conv",    name:"Converge",      seq:(i, n) => { const k = i % n; return k % 2 ? n - 1 - (k >> 1) : k >> 1; } },
  { id:"pinky",   name:"Thumb & top",   seq:(i, n) => (i % 2 ? n - 1 : (i >> 1) % n) },
  // deterministic "random": a hash of the step, so it is unpredictable to the ear but identical
  // every time the song is played, rendered or bounced to stems
  { id:"rand",    name:"Random",        seq:(i, n) => Math.min(n - 1, (hash01(i) * n) | 0) },
  // root, then the same note an octave up. With only one octave in the pool there is no octave to
  // jump to, so it takes the top of the chord instead of collapsing onto the root twice.
  { id:"oct",     name:"Octaves",       seq:(i, n, base) => (i % 2 ? (base < n ? base : n - 1) : 0) },
];
const ARP_BY_ID = Object.fromEntries(ARPS.map(a => [a.id, a]));
const ARP_RATES = [[1, "1/4"], [2, "1/8"], [3, "1/8 triplet"], [4, "1/16"], [6, "1/16 triplet"], [8, "1/32"]];

/* Note gates — the trance gate. A pattern of sixteenths, chopping a held part into a pulse.
   `x` is open, `-` is shut. Sixteen steps so a whole bar of 4/4 can have its own shape. */
const GATES = [
  { id:"8",     name:"Eighths",        pat:"x-x-x-x-x-x-x-x-" },
  // Note: a gate is a sustained open/shut, so an all-open pattern would be a menu entry that does
  // nothing at all. Every pattern here has to both open and close to be worth offering.
  { id:"16",    name:"Sixteenth run",  pat:"xxx-xxx-xxx-xxx-" },
  { id:"off8",  name:"Offbeat eighths",pat:"-x-x-x-x-x-x-x-x" },
  { id:"tri",   name:"Trance gate",    pat:"x-xx-x-xx-xx-x-x" },
  { id:"dot",   name:"Dotted",         pat:"x--x--x--x--x--x" },
  { id:"stut",  name:"Stutter",        pat:"xx--xx--xx-xxx--" },
  { id:"tres",  name:"Tresillo",       pat:"x--x--x---x--x--" },
  { id:"half",  name:"Half-time",      pat:"x-------x-------" },
];
const GATE_BY_ID = Object.fromEntries(GATES.map(g => [g.id, g]));
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
/* ===== rhythm cells =====
   Generated melodies used to put one note on every beat, all the same length, which is why they
   came out stiff no matter which contour you picked. Rhythm is a separate dimension from pitch, so
   it gets its own table: where notes fall in a bar, and how long each lasts.

   Positions and lengths are in BEATS, not columns, so one cell works on an eighth grid or a
   sixteenth one, in 4/4 or in 3/4. A cell finer than the current grid snaps onto it and the
   collisions drop out, so nothing is ever silently mangled. */
const RHYTHMS = [];
[
["straight",  "On the beat",        "One note per beat. Plain, clear, and the way to hear a contour on its own.",
  [[0,1],[1,1],[2,1],[3,1]]],
["longshort", "Long–short",         "A held note answered by a short one — probably the most common rhythm in melody.",
  [[0,1.5],[1.5,0.5],[2,1.5],[3.5,0.5]]],
["shortlong", "Short–long",         "The mirror: a quick pickup landing on a note that holds.",
  [[0,0.5],[0.5,1.5],[2,0.5],[2.5,1.5]]],
["push",      "Pushed",             "Notes arrive just before beats 2 and 4 — the anticipation that makes a line lean forward.",
  [[0,1],[1,0.5],[1.5,1],[2.5,0.5],[3,1]]],
["offbeat",   "Off the beat",       "Every note on the “and”. Instantly less square; leaves the beat to the drums.",
  [[0.5,0.5],[1.5,0.5],[2.5,0.5],[3.5,0.5]]],
["tresillo",  "Tresillo (3+3+2)",   "The Cuban cell behind reggaeton and half of modern pop.",
  [[0,0.75],[0.75,0.75],[1.5,0.5],[2,0.75],[2.75,0.75],[3.5,0.5]]],
["charleston","Charleston",         "Beat one and the “and” of two, then silence. The great syncopated hook rhythm.",
  [[0,1.5],[1.5,2.5]]],
["gallop",    "Gallop",             "A long note kicked forward by two quick ones — driving without being busy.",
  [[0,0.5],[0.5,0.25],[0.75,0.25],[1,1],[2,0.5],[2.5,0.25],[2.75,0.25],[3,1]]],
["sixteenth", "Running sixteenths", "Continuous motion. Best for arps and runs; needs a 16ths rhythm to show fully.",
  [[0,0.25],[0.25,0.25],[0.5,0.25],[0.75,0.25],[1,0.25],[1.25,0.25],[1.5,0.25],[1.75,0.25],
   [2,0.25],[2.25,0.25],[2.5,0.25],[2.75,0.25],[3,0.25],[3.25,0.25],[3.5,0.25],[3.75,0.25]]],
["pickup",    "Pickup",             "A short note leading into the downbeat, then steady. How a singer actually enters.",
  [[0,1],[1,1],[2,1],[2.75,0.25],[3,1]]],
["twonote",   "Two long notes",     "Half the bar each. Space for the chords to speak.",
  [[0,2],[2,2]]],
["held",      "One held note",      "A single note across the whole bar — a drone against moving harmony.",
  [[0,4]]],
["question",  "Question & space",   "A short phrase, then silence — the half of a melody people forget to write.",
  [[0,0.5],[0.5,0.5],[1,1],[2,2]]],
].forEach(([id, name, desc, cell]) => { RHYTHMS[RHYTHMS.length] = { id, name, desc, cell }; });
const RHYTHM_BY_ID = Object.fromEntries(RHYTHMS.map(r => [r.id, r]));
// Which cell each kind of section leans on when a narrative writes the whole song. A verse
// converses, a chorus lands squarely, a bridge sits off the beat, a build runs.
const ROLE_RHYTHM = { I:"held", V:"longshort", P:"push", C:"straight", B:"offbeat", S:"gallop",
  R:"straight", T:"twonote", U:"sixteenth", D:"tresillo", K:"held", O:"held", A:"longshort", H:"straight" };
// Resolve a cell onto this bar's grid: beats → columns, lengths clipped so a held note never runs
// into the next onset. Onsets past the end of the bar (a 4/4 cell in 3/4) simply drop out.
const rhythmSpots = (id, B, sub, beats) => {
  const r = RHYTHM_BY_ID[id] || RHYTHM_BY_ID.straight;
  const out = [];
  for (const [off, len] of r.cell) {
    if (off >= beats) continue;
    const c = Math.round(off * sub);
    if (c >= B || out.some(s => s.c === c)) continue;      // snapped onto an occupied column
    out.push({ c, len: Math.max(1, Math.round(len * sub)) });
  }
  out.sort((a, b) => a.c - b.c);
  out.forEach((s, i) => {
    const next = i + 1 < out.length ? out[i + 1].c : B;
    s.len = Math.max(1, Math.min(s.len, next - s.c));
  });
  return out;
};
// lay a sequence of degrees onto given columns of one bar; `lens` holds a note across columns
const layBar = (B, cols, degs, lens) => {
  const bar = Array.from({ length: B }, () => []);
  cols.forEach((c, i) => {
    if (i >= degs.length || degs[i] == null || c >= B) return;
    const d = wrap7(degs[i]);
    const len = Math.max(1, (lens && lens[i]) || 1);
    for (let k = 0; k < len && c + k < B; k++) bar[c + k] = [d];   // a held note fills its columns
  });
  return bar;
};
/* Build a bassline generator. `spots(barBeats, sub)` returns `{at, len}` in beats; `degs(g, n)`
   returns one scale degree per spot, given the bar's chord degree. Everything is snapped onto the
   grid actually in use, and a note is held across the columns its length covers. */
const bassGen = (spots, degs) => function (u) {
  const sub = u.sub || 2, barBeats = u.B / sub;
  return Array.from({ length: u.nBars }, (_, b) => {
    const g = u.chordDegs[b] == null ? u.start : u.chordDegs[b];
    const at = spots(barBeats, sub).filter(s => s.at < barBeats);
    const ds = degs(g, at.length);
    const bar = Array.from({ length: u.B }, () => []);
    at.forEach((s, i) => {
      const c = Math.round(s.at * sub);
      if (c >= u.B || ds[i] == null) return;
      const len = Math.max(1, Math.round((s.len || 0.5) * sub));
      for (let k = 0; k < len && c + k < u.B; k++) bar[c + k] = [wrap7(ds[i])];
    });
    return bar;
  });
};
/* Build a counter-melody generator. `place(u, b)` returns `{c, len, d}` per note for one bar, in
   absolute columns and raw scale degrees; the wrapper wraps degrees into the grid's octave and
   returns an empty bar when there is no lead to write against. */
const counterGen = place => function (u) {
  return Array.from({ length: u.nBars }, (_, b) => {
    const bar = Array.from({ length: u.B }, () => []);
    if (!u.against || !u.against.length) return bar;      // nothing to answer — write nothing
    for (const n of place(u, b)) {
      if (n.d == null || n.c == null || n.c >= u.B) continue;
      const v = [wrap7(n.d)];
      for (let k = 0; k < Math.max(1, n.len) && n.c + k < u.B; k++) bar[n.c + k] = v;
    }
    return bar;
  });
};
const MELODY_PATTERNS = [
  { id:"arpUp", name:"Arpeggio ↑ (chord tones)",
    desc:"Climbs each bar's chord — root, 3rd, 5th, 7th — one note per beat. Follows the chords; the start note fills in over any out-of-key chord.",
    gen(u){ const Q = u.cols;
      return Array.from({ length:u.nBars }, (_, b) => {
        const g = u.chordDegs[b] == null ? u.start : u.chordDegs[b];
        return layBar(u.B, Q, [g, g+2, g+4, g+6], u.lens); }); } },
  { id:"arpDown", name:"Arpeggio ↓ (chord tones)",
    desc:"Falls through each bar's chord from the top down — 5th, 3rd, root. A gentler, more resolved shape than climbing.",
    gen(u){ const Q = u.cols;
      return Array.from({ length:u.nBars }, (_, b) => {
        const g = u.chordDegs[b] == null ? u.start : u.chordDegs[b];
        return layBar(u.B, Q, [g+4, g+2, g, g-3], u.lens); }); } },
  { id:"arpRoll", name:"Arpeggio ↑↓ (rolling)",
    desc:"Rolls up the chord and back down within every bar — a continuous broken-chord ripple.",
    gen(u){ return Array.from({ length:u.nBars }, (_, b) => {
        const g = u.chordDegs[b] == null ? u.start : u.chordDegs[b];
        const shape = [0,2,4,6,4,2,0,2].map(x => g + x);
        return layBar(u.B, Array.from({ length:u.B }, (_, i) => i), shape.slice(0, u.B), u.lens); }); } },
  { id:"scaleUp", name:"Scale run ↑",
    desc:"A stepwise climb up the scale from your start note, running straight through the whole section.",
    gen(u){ const Q = u.cols; let n = 0;
      return Array.from({ length:u.nBars }, () =>
        layBar(u.B, Q, Q.map(() => u.start + n++), u.lens)); } },
  { id:"scaleDown", name:"Scale run ↓",
    desc:"A stepwise descent from your start note down the scale, running through the whole section.",
    gen(u){ const Q = u.cols; let n = 0;
      return Array.from({ length:u.nBars }, () =>
        layBar(u.B, Q, Q.map(() => u.start - n++), u.lens)); } },
  { id:"wave", name:"Wave (up-and-down contour)",
    desc:"A smooth arch that rises a few steps then falls back, over and over — an easy, singable contour.",
    gen(u){ const Q = u.cols; const tri = [0,1,2,3,2,1]; let n = 0;
      return Array.from({ length:u.nBars }, () =>
        layBar(u.B, Q, Q.map(() => u.start + tri[n++ % tri.length]), u.lens)); } },
  { id:"neighbor", name:"Neighbour tones",
    desc:"Decorates your start note with its upper and lower neighbours — note, step up, note, step down.",
    gen(u){ const Q = u.cols; const fig = [0,1,0,-1]; let n = 0;
      return Array.from({ length:u.nBars }, () =>
        layBar(u.B, Q, Q.map(() => u.start + fig[n++ % fig.length]), u.lens)); } },
  { id:"pedal", name:"Pedal tone (repeated note)",
    desc:"Repeats your start note on every beat — a drone / chant to build tension against the moving chords.",
    gen(u){ const Q = u.cols;
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, Q.map(() => u.start), u.lens)); } },
  { id:"callResp", name:"Call & response",
    desc:"A rising question in one bar answered by a falling reply in the next — the two-bar conversation that anchors most tunes.",
    gen(u){ const Q = u.cols;
      return Array.from({ length:u.nBars }, (_, b) =>
        b % 2 === 0 ? layBar(u.B, Q, [0,1,2,3].map(x => u.start + x), u.lens)
                    : layBar(u.B, Q, [2,1,0,0].map(x => u.start + x), u.lens)); } },
  { id:"aa", name:"AA — repeat the motif",
    desc:"States one short motif and repeats it in every bar. The most direct way to make a line stick.",
    gen(u){ const Q = u.cols; const A = [0,2,1,0];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, A.map(x => u.start + x), u.lens)); } },
  { id:"ab", name:"AB — alternating motifs",
    desc:"Alternates a low motif (A) with a higher contrasting one (B), bar by bar — statement and counter-statement.",
    gen(u){ const Q = u.cols; const A = [0,2,1,0], B = [4,2,3,4];
      return Array.from({ length:u.nBars }, (_, b) =>
        layBar(u.B, Q, (b % 2 === 0 ? A : B).map(x => u.start + x), u.lens)); } },
  { id:"aaba", name:"AABA — motif with a middle turn",
    desc:"Motif A three times with a contrasting B in the third bar — the classic 32-bar sentence in miniature.",
    gen(u){ const Q = u.cols; const A = [0,2,1,0], B = [4,3,2,4];
      return Array.from({ length:u.nBars }, (_, b) =>
        layBar(u.B, Q, (b % 4 === 2 ? B : A).map(x => u.start + x), u.lens)); } },
  { id:"seqUp", name:"Ascending sequence",
    desc:"Takes one three-note figure and steps it up the scale a degree at a time each bar — builds lift and momentum.",
    gen(u){ const Q = u.cols; const fig = [0,1,2];
      return Array.from({ length:u.nBars }, (_, b) =>
        layBar(u.B, Q, fig.map(x => u.start + x + b), u.lens)); } },
  { id:"seqDown", name:"Descending sequence",
    desc:"A three-note figure stepped down the scale each bar — an easing, settling motion toward resolution.",
    gen(u){ const Q = u.cols; const fig = [0,-1,-2];
      return Array.from({ length:u.nBars }, (_, b) =>
        layBar(u.B, Q, fig.map(x => u.start + x - b), u.lens)); } },
  { id:"leaps", name:"Leaping (zig-zag)",
    desc:"Zig-zags between your start note and a note a fifth above — wide, angular intervals for a bolder hook.",
    gen(u){ const Q = u.cols; const fig = [0,4,0,4];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, fig.map(x => u.start + x), u.lens)); } },
  { id:"qa", name:"Question & answer (resolves to tonic)",
    desc:"An antecedent phrase that rises and hangs, then a consequent that comes to rest on the tonic — a fully closed two-bar sentence.",
    gen(u){ const Q = u.cols;
      return Array.from({ length:u.nBars }, (_, b) =>
        b % 2 === 0 ? layBar(u.B, Q, [u.start, u.start+1, u.start+2, u.start+2], u.lens)
                    : layBar(u.B, Q, [u.start+1, u.start-1, u.start, 0], u.lens)); } },
  { id:"archTwo", name:"Two-bar arch",
    desc:"Rises across the first bar and falls back across the second — a broad, singable two-bar arch.",
    gen(u){ const Q = u.cols;
      return Array.from({ length:u.nBars }, (_, b) =>
        layBar(u.B, Q, (b % 2 === 0 ? [0,1,2,3] : [3,2,1,0]).map(x => u.start + x), u.lens)); } },
  { id:"zigTight", name:"Tight zig-zag",
    desc:"Steps up and dips back on every beat — a busy, chattering close-interval line.",
    gen(u){ const Q = u.cols; const fig = [0,1,0,2];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, fig.map(x => u.start + x), u.lens)); } },
  { id:"thirds", name:"Skipping thirds",
    desc:"Leaps up a third then steps back down, walking the line upward in gentle skips.",
    gen(u){ const Q = u.cols; const fig = [0,2,1,3];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, fig.map(x => u.start + x), u.lens)); } },
  { id:"gapfill", name:"Leap & fill",
    desc:"Jumps up to a high note then fills the gap with a stepwise descent — a classic melodic shape.",
    gen(u){ const Q = u.cols; const fig = [4,3,2,1];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, fig.map(x => u.start + x), u.lens)); } },
  { id:"penta", name:"Pentatonic hook",
    desc:"Stays on the five pentatonic degrees — the notes that sound good over anything — for a foolproof hook.",
    gen(u){ const Q = u.cols; const pent = [0,2,4,5,4,2,1,0]; let n = 0;
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, Q.map(() => u.start + pent[n++ % pent.length]), u.lens)); } },
  { id:"hook", name:"High-to-low hook",
    desc:"Opens high and tumbles down to the tonic — an instantly memorable pop-hook shape.",
    gen(u){ const Q = u.cols; const fig = [4,4,2,0];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, fig.map(x => u.start + x), u.lens)); } },
  { id:"pairs", name:"Repeated pairs",
    desc:"Says each note twice before moving on — a stuttering, insistent way to drill a hook in.",
    gen(u){ const Q = u.cols; const fig = [0,0,2,2];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, fig.map(x => u.start + x), u.lens)); } },
  { id:"turn", name:"Turn (ornament)",
    desc:"Circles the start note — up, home, down, home — the ornamental 'turn' from classical melody.",
    gen(u){ const Q = u.cols; const fig = [1,0,-1,0];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, fig.map(x => u.start + x), u.lens)); } },
  { id:"fanfare", name:"Fanfare (chord leaps)",
    desc:"Bugle-call leaps around each bar's chord — root, fifth, third, fifth — bold and brassy.",
    gen(u){ const Q = u.cols;
      return Array.from({ length:u.nBars }, (_, b) => {
        const g = u.chordDegs[b] == null ? u.start : u.chordDegs[b];
        return layBar(u.B, Q, [g, g+4, g+2, g+4], u.lens); }); } },
  { id:"chordDrop", name:"Chord climb, scale fall",
    desc:"Climbs the bar's chord tones then eases back down the scale — outlines the harmony, then smooths it over.",
    gen(u){ const Q = u.cols;
      return Array.from({ length:u.nBars }, (_, b) => {
        const g = u.chordDegs[b] == null ? u.start : u.chordDegs[b];
        return layBar(u.B, Q, [g, g+2, g+4, g+3], u.lens); }); } },
  { id:"bluesy", name:"Bluesy lick",
    desc:"Curls around the third and fourth for a lazy, vocal blues inflection.",
    gen(u){ const Q = u.cols; const fig = [0,2,3,2];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, fig.map(x => u.start + x), u.lens)); } },
  { id:"offbeat", name:"Off-beat syncopation",
    desc:"Puts the notes on the and-of-each-beat instead of the beat — a syncopated push that pulls against the chords.",
    gen(u){ const off = Array.from({ length:u.B }, (_, i) => i).filter(i => i % 2 === 1); const fig = [0,1,2,3];
      return Array.from({ length:u.nBars }, () => layBar(u.B, off, fig.map(x => u.start + x), u.lens)); } },
  { id:"riff8", name:"Eighth-note riff",
    desc:"A driving eighth-note riff that repeats every bar — motoric and hooky.",
    gen(u){ const cols = Array.from({ length:u.B }, (_, i) => i); const fig = [0,0,2,0,3,2,1,0];
      return Array.from({ length:u.nBars }, () => layBar(u.B, cols, cols.map((_, i) => u.start + fig[i % fig.length]), u.lens)); } },
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
    gen(u){ const Q = u.cols;
      return Array.from({ length:u.nBars }, (_, b) =>
        layBar(u.B, Q, (b % 2 === 0 ? [0,1,2,3] : [0,-1,-2,-3]).map(x => u.start + x), u.lens)); } },
  { id:"cascade", name:"Cascade down",
    desc:"A stepwise tumble that restarts a little lower each bar — a long, settling cascade toward home.",
    gen(u){ const Q = u.cols;
      return Array.from({ length:u.nBars }, (_, b) => layBar(u.B, Q, [3,2,1,0].map(x => u.start + x - b), u.lens)); } },
  { id:"seq4", name:"Four-bar climb",
    desc:"A short figure nudged up a step every bar — a long build that keeps rising across four bars.",
    gen(u){ const Q = u.cols; const fig = [0,2,1];
      return Array.from({ length:u.nBars }, (_, b) => layBar(u.B, Q, fig.map(x => u.start + x + (b % 4)), u.lens)); } },
  { id:"qq", name:"Two questions, one answer",
    desc:"Two rising, unresolved phrases then a falling reply that finally lands — a three-part sentence.",
    gen(u){ const Q = u.cols;
      return Array.from({ length:u.nBars }, (_, b) =>
        b % 3 === 2 ? layBar(u.B, Q, [2,1,0,0].map(x => u.start + x), u.lens)
                    : layBar(u.B, Q, [0,1,2,2].map(x => u.start + x), u.lens)); } },
  { id:"climb", name:"Climb to a peak",
    desc:"Rises steadily across the whole section to a high point — one long crescendo of pitch.",
    gen(u){ const Q = u.cols; let n = 0; const total = Math.max(1, u.nBars * Q.length - 1);
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, Q.map(() => u.start + Math.round((n++ / total) * 6)), u.lens)); } },
  { id:"drone5", name:"Fifth pedal",
    desc:"Holds the fifth of the key as a bright high drone on every beat — tension over the moving chords.",
    gen(u){ const Q = u.cols;
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, Q.map(() => u.start + 4), u.lens)); } },
  { id:"waltzArp", name:"Waltz lilt",
    desc:"Three notes a bar lilting up the chord — made for 3/4 and 6/8, but lovely anywhere.",
    gen(u){ const Q = u.cols;
      return Array.from({ length:u.nBars }, (_, b) => {
        const g = u.chordDegs[b] == null ? u.start : u.chordDegs[b];
        return layBar(u.B, Q, [g, g+2, g+4], u.lens); }); } },

  /* ---- basslines ----
     A bassline is defined by its rhythm far more than by its notes, so unlike every pattern above
     these bring their own placement instead of taking it from the Rhythm menu. Positions are in
     beats from the top of the bar, so one definition works on an eighth grid or a sixteenth one
     and in 3/4 as well as 4/4. Put them on a part with a bass instrument and its octave down —
     parts C onward already default that way. */
  { id:"bassRoot", name:"Bass · root on the one",
    desc:"One long root note per bar. The plainest thing that works, and the right choice under a busy topline.",
    gen: bassGen(bb => [{ at:0, len:bb }], (g) => [g]) },
  { id:"bassOff", name:"Bass · offbeat (house)",
    desc:"A stab on the 'and' of every beat, leaving the downbeat to the kick — the sound of house and disco.",
    gen: bassGen(bb => Array.from({ length:bb }, (_, i) => ({ at:i + 0.5, len:0.4 })),
      (g, n) => Array.from({ length:n }, () => g)) },
  { id:"bass8", name:"Bass · driving eighths",
    desc:"Straight eighth notes on the root — the relentless techno and eurodance engine room. Needs a sixteenth Pattern to fit; on an eighth grid there is no room for the gaps, so it writes quarters instead.",
    /* A note has to be shorter than the gap to the next one, or two of the same pitch on adjacent
       columns are one held note — that is how the grid stores a tie, and it is what MIDI export and
       the stave both read. An eighth grid has no column to spare between eighths, so rather than
       write a whole note and call it eighths, this drops to quarters at that resolution. */
    gen: bassGen((bb, sub) => { const st = sub >= 4 ? 0.5 : 1;
        return Array.from({ length: Math.round(bb / st) }, (_, i) => ({ at:i * st, len: st / 2 })); },
      (g, n) => Array.from({ length:n }, () => g)) },
  { id:"bass16", name:"Bass · rolling sixteenths",
    desc:"A broken sixteenth roll — three notes and a rest in every beat, dropping to the fifth once a bar. Psytrance and drum & bass.",
    gen: bassGen((bb, sub) => { const out = [];
        for (let b = 0; b < bb; b++) for (const o of (sub >= 4 ? [0, 0.25, 0.75] : [0, 0.5])) out.push({ at:b + o, len:0.25 });
        return out; },
      (g, n) => Array.from({ length:n }, (_, i) => (i % 6 === 4 ? g + 4 : g))) },
  { id:"bassTres", name:"Bass · tresillo (3+3+2)",
    desc:"The 3+3+2 pulse that carries reggaeton, trap and most of modern pop — twice a bar.",
    gen: bassGen(bb => { const out = [];
        for (let b = 0; b + 2 <= bb; b += 2) out.push({ at:b, len:0.5 }, { at:b + 0.75, len:0.5 }, { at:b + 1.5, len:0.5 });
        return out; },
      (g, n) => Array.from({ length:n }, () => g)) },
  { id:"bassPump", name:"Bass · pumped (1 and the &-of-3)",
    desc:"Root on the downbeat and a push before the third beat. Sparse, and it lets a sidechain breathe.",
    // in 3/4 the push lands on the "and" of two instead; a single bar-long note would just be
    // "root on the one" under a different name
    gen: bassGen(bb => (bb >= 4 ? [{ at:0, len:1.4 }, { at:2.5, len:1.2 }]
                                : [{ at:0, len:1.2 }, { at:1.5, len:1.2 }]),
      (g, n) => Array.from({ length:n }, () => g)) },
  /* ---- counter-melodies ----
     These read the lead already written on another part and place their notes against it, so the
     two lines belong together instead of being two tunes played at once. They need a lead: with
     nothing to write against they return an empty bar rather than guessing, and the Suggest tab
     will not let you write one until another part has notes. */
  { id:"ctrThird", name:"Counter · a third below the lead", needs:"lead",
    desc:"Shadows the lead a third below, note for note. The oldest harmony there is — instantly sounds arranged rather than doubled.",
    gen: counterGen((u, b) => leadOnsets(u, b).map(o => ({ c:o.c, len:1, d:o.d - 2 }))) },
  { id:"ctrSixth", name:"Counter · a sixth below the lead", needs:"lead",
    desc:"The same idea a sixth below instead of a third — wider, warmer, and it leaves room for the lead to sit on top.",
    gen: counterGen((u, b) => leadOnsets(u, b).map(o => ({ c:o.c, len:1, d:o.d - 5 }))) },
  { id:"ctrFill", name:"Counter · answer in the gaps", needs:"lead",
    desc:"Plays only where the lead rests — call and response between two parts. The way to add a second line without crowding the first.",
    gen: counterGen((u, b) => leadGaps(u, b, 1).map((g, i) => ({ c:g.c, len:Math.min(g.len, 2),
      d:(u.chordDegs[b] == null ? u.start : u.chordDegs[b]) + [0, 4, 2, 4][i % 4] }))) },
  { id:"ctrContrary", name:"Counter · contrary motion", needs:"lead",
    desc:"Mirrors the lead: where it rises this falls, and the other way about. Two lines moving apart is the strongest way to make them sound independent.",
    gen: counterGen((u, b) => { const on = leadOnsets(u, b); if (!on.length) return [];
      const pivot = on[0].d;
      return on.map(o => ({ c:o.c, len:1, d:2 * pivot - o.d - 2 })); }) },
  { id:"ctrPedal", name:"Counter · held pedal", needs:"lead",
    desc:"One long note a bar, under everything — the chord's root or fifth. Does nothing clever and holds the whole thing together.",
    gen: counterGen((u, b) => [{ c:0, len:u.B,
      d:(u.chordDegs[b] == null ? u.start : u.chordDegs[b]) + (b % 2 ? 4 : 0) }]) },

  { id:"bassWalk", name:"Bass · walking the chord",
    desc:"Root, fifth, root, third — one a beat, walking through each bar's own chord. House, disco and soul.",
    gen: bassGen(bb => Array.from({ length:bb }, (_, i) => ({ at:i, len:0.85 })),
      (g, n) => Array.from({ length:n }, (_, i) => g + [0, 4, 0, 2][i % 4])) },
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
// give bare columns a length each: a note holds until the next one starts, rather than every note
// being the same short stab followed by a rest
const withLens = (cols, B) => cols.map((c, i) => ({ c, len: Math.max(1, (i + 1 < cols.length ? cols[i + 1] : B) - c) }));
// take `n` spots spread evenly across a cell, so a sparse section still uses the cell's character
const pickSpread = (spots, n) => {
  if (n >= spots.length) return spots;
  const step = spots.length / n;
  return Array.from({ length: n }, (_, i) => spots[Math.floor(i * step)]);
};
// Narratives choose how MANY notes a section gets (from its role); the rhythm cell chooses WHERE
// they fall. Keeping those separate is what stops every section coming out on the beat.
const narBars = (u, colsOf, degAt) => {
  const per = Array.from({ length:u.nBars }, (_, b) => {
    const want = colsOf(b);
    return (u.spots && u.spots.length)
      ? pickSpread(u.spots, Math.max(1, Math.min(want.length, u.spots.length)))
      : withLens(want, u.B);
  });
  const N = per.reduce((n, a) => n + a.length, 0) || 1;
  let g = 0;
  return per.map((spots, b) => {
    const bar = Array.from({ length:u.B }, () => []);
    spots.forEach((sp, i) => {
      const d = degAt({ b, i, n:spots.length, c:sp.c, g, t: N > 1 ? g / (N - 1) : 0, cd:u.chordDegs[b] });
      g++;
      if (d == null) return;
      const v = [clampDeg(d, u.nd)];
      for (let k = 0; k < sp.len && sp.c + k < u.B; k++) bar[sp.c + k] = v;
    });
    return bar;
  });
};
/* ---- motifs ----
   A narrative shapes a section's contour; a *motif* is the stronger idea — one short cell of notes
   that the ear recognises when it comes back. Four notes is the classic length: long enough to be
   remembered, short enough to survive being turned upside down or backwards and still be the same
   tune. Offsets are in scale steps from wherever the section's register sits, so the cell keeps its
   shape while the line moves up for a chorus and down for an outro. */
const MOTIF = [0, 2, 1, -1];
const MOTIF_MOVES = {
  same:  m => m,                                  // stated plainly
  inv:   m => m.map(x => -x),                     // upside down — the same idea, unsettled
  retro: m => [...m].reverse(),                   // backwards — heard as related, not repeated
  aug:   m => m.map(x => Math.round(x / 2)),      // flattened out, for something that has to breathe
};
// which transformation a section gets, from what the section is
const motifMoveFor = role => "BS".includes(role) ? "inv"
  : "IOK".includes(role) ? "aug"
  : "TU".includes(role) ? "retro" : "same";

/* ---- writing against an existing line ----
   Everything above writes a part in isolation, which is why a second part so often sounds like two
   tunes played at once. A counter-melody is written *against* the lead: it reads the lead's notes
   and places its own to fit — under it in thirds, in the gaps it leaves, or moving the opposite way. */
const leadBarOf = (u, b) => (u.against && u.against.length) ? u.against[b % u.against.length] : null;
// the lead's degree sounding at a column, or null
const leadAt = (u, b, c) => {
  const bar = leadBarOf(u, b), col = bar && bar[c];
  return (col && col.length) ? col[0] : null;
};
// the columns where the lead starts a new note (not where it is merely still ringing)
const leadOnsets = (u, b) => {
  const bar = leadBarOf(u, b);
  if (!bar) return [];
  const out = [];
  for (let c = 0; c < bar.length; c++) {
    const d = (bar[c] || [])[0];
    if (d == null) continue;
    const prev = (bar[c - 1] || [])[0];
    if (c === 0 || prev !== d) out.push({ c, d });
  }
  return out;
};
// the runs of columns the lead leaves silent — where an answering phrase can go
const leadGaps = (u, b, minLen = 1) => {
  const bar = leadBarOf(u, b);
  if (!bar) return [];
  const out = [];
  let start = -1;
  for (let c = 0; c <= bar.length; c++) {
    const empty = c < bar.length && !((bar[c] || []).length);
    if (empty && start < 0) start = c;
    else if (!empty && start >= 0) { if (c - start >= minLen) out.push({ c: start, len: c - start }); start = -1; }
  }
  return out;
};

/* ---- variation between repeats ----
   A narrative gives every section of a role the same contour, so Verse 2 came out byte-identical to
   Verse 1 and a chorus repeated four times repeated exactly. That is not how anybody writes: the
   second time round you change the landing note, push a phrase early, add a passing note. These are
   those edits, applied to later passes only — the first statement stays the reference so the
   variations are heard *as* variations rather than as a different tune.

   Everything is seeded from the role and the pass, never from Math.random, so a song sounds the same
   every time it is opened, rendered or shared. */

// the notes in a bar: a run of the same degree across columns is one held note, not several
const barNotes = bar => {
  const out = [];
  for (let c = 0; c < bar.length; c++) {
    const d = (bar[c] || [])[0];
    if (d == null) continue;
    if (c > 0 && (bar[c - 1] || [])[0] === d) continue;
    let len = 1;
    while (c + len < bar.length && (bar[c + len] || [])[0] === d) len++;
    out.push({ c, len, d });
  }
  return out;
};
const putNote = (bar, c, len, d) => { for (let k = 0; k < len && c + k < bar.length; k++) bar[c + k] = [d]; };
const clearNote = (bar, c, len) => { for (let k = 0; k < len && c + k < bar.length; k++) bar[c + k] = []; };

/* Each variation returns true if it found somewhere to apply itself, so the caller can try the next
   one rather than silently doing nothing on a bar that had no room.

   Every choice inside a variation is driven by `pass` rather than by the hash alone. Seeding
   purely from the hash lets two passes draw the same edit by coincidence, and a third and fourth
   chorus come back identical to each other — the thing this whole file is here to avoid. Stepping
   through the choices by pass makes consecutive repeats differ by construction. */
/* Four notes near `d` that are actually in the scale, nearest first — the alternative landings a
   repeat can take. Reaching outwards rather than clamping at the edges is the point: a phrase ending
   on the tonic at the bottom of the scale has nothing below it, and clamping would give every pass
   the same note. Widening the search there costs a slightly bigger leap and buys four repeats that
   land somewhere different each time. */
const nearDegs = (d, nd) => {
  const out = [];
  for (const s of [-1, 1, -2, 2, -3, 3, -4, 4]) {
    if (out.length >= 4) break;
    const c = d + s;
    if (c >= 0 && c <= nd - 1 && c !== d && !out.includes(c)) out.push(c);
  }
  return out;
};
// the two notes either side of `d` — for a note being added rather than moved, where a leap would
// read as a wrong note rather than as a variation
const stepDegs = (d, nd) => nearDegs(d, nd).slice(0, 2);
// step along a list by pass — the one move that makes repeat N and repeat N+1 differ by construction
const byPass = (list, r, pass) => list[(Math.floor(r * list.length) + pass) % list.length];
/* Apply an edit to the first bar from a pass-dependent start that has room for it. Trying only the
   one bar would mean a variation gives up on a phrase that had space two bars along.
   (A version that dry-ran every bar first and then picked by pass from the ones that qualified —
   avoiding the case where a pass whose start bar has no room falls through onto the next pass's bar
   — measured identically over 3,402 phrases, so this cheaper one stays.) */
const overBars = (bars, r, pass, fn) => {
  for (let j = 0; j < bars.length; j++) {
    const bar = bars[(Math.floor(r * bars.length) + pass + j) % bars.length];
    if (fn(bar, barNotes(bar))) return true;
  }
  return false;
};
/* The degrees note `i` must not be given: a note touching it that already holds that degree would
   absorb it, so "move one note" would quietly become "lose one note". Only notes in the abutting
   columns can merge — a note across a gap is free to be any pitch. */
const wouldMerge = (ns, i) => {
  const a = ns[i - 1], b = ns[i + 1], n = ns[i], out = [];
  if (a && a.c + a.len === n.c) out.push(a.d);
  if (b && n.c + n.len === b.c) out.push(b.d);
  return out;
};

const VARIATIONS = [
  // the classic: same phrase, different landing note. Strongest single change for the least damage.
  { id:"ending", apply(bars, nd, r, pass) {
      const bar = bars[bars.length - 1], ns = barNotes(bar);
      if (!ns.length) return false;
      const i = ns.length - 1, last = ns[i], merge = wouldMerge(ns, i);
      const near = nearDegs(last.d, nd).filter(d => !merge.includes(d));
      if (!near.length) return false;
      // walked by pass, not drawn at random: four repeats of a chorus end on four different notes
      putNote(bar, last.c, last.len, near[(pass - 1) % near.length]);
      return true;
    } },
  // the same idea at the other end: start the repeat from somewhere else and walk back into the tune
  { id:"opening", apply(bars, nd, r, pass) {
      const bar = bars[0], ns = barNotes(bar);
      if (ns.length < 2) return false;                       // leave a one-note bar its one note
      const merge = wouldMerge(ns, 0);
      const near = nearDegs(ns[0].d, nd).filter(d => !merge.includes(d));
      if (!near.length) return false;
      putNote(bar, ns[0].c, ns[0].len, near[(pass - 1) % near.length]);
      return true;
    } },
  /* Release a held note early. Pure rhythm — the pitches are untouched — which makes it the one
     edit that still has somewhere to go in a bar of two long notes, where every variation that
     needs an interior note or a gap has already given up. */
  { id:"clip", apply(bars, nd, r, pass) {
      return overBars(bars, r, pass, (bar, ns) => {
        const held = ns.filter(n => n.len > 1);
        if (!held.length) return false;
        const n = byPass(held, r, pass);
        clearNote(bar, n.c + n.len - 1, 1);
        return true;
      });
    } },
  // the mirror: let a note run on into the space after it. The phrase leans instead of stepping.
  { id:"extend", apply(bars, nd, r, pass) {
      return overBars(bars, r, pass, (bar, ns) => {
        const can = ns.filter(n => n.c + n.len < bar.length && !(bar[n.c + n.len] || []).length);
        if (!can.length) return false;
        const n = byPass(can, r, pass);
        putNote(bar, n.c + n.len, 1, n.d);
        return true;
      });
    } },
  // a passing note through a leap the phrase already makes
  { id:"passing", apply(bars, nd, r, pass) {
      return overBars(bars, r, pass, (bar, ns) => {
        for (let i = 0; i + 1 < ns.length; i++) {
          const a = ns[i], c = ns[i + 1];
          const gap = c.c - (a.c + a.len);
          if (gap < 1) continue;                             // no empty column between them
          if (Math.abs(c.d - a.d) < 2) continue;             // no leap worth filling
          // where in the gap it lands steps along with the pass: early is a pickup into the next
          // note, late is a lean off the one before, and two repeats get two different feels
          putNote(bar, a.c + a.len + (pass - 1) % gap, 1, Math.round((a.d + c.d) / 2));
          return true;
        }
        return false;
      });
    } },
  /* One more note than last time. `passing` only fires through a leap; this fills any space the
     phrase leaves, a step away from the note before it, so a repeat can simply be busier. */
  { id:"add", apply(bars, nd, r, pass) {
      return overBars(bars, r, pass, (bar, ns) => {
        const spots = [];
        for (let i = 0; i < ns.length; i++) {
          const from = ns[i].c + ns[i].len, to = i + 1 < ns.length ? ns[i + 1].c : bar.length;
          for (let c = from; c < to; c++) spots.push({ c, d: ns[i].d });
        }
        if (!spots.length) return false;
        const s = byPass(spots, r, pass);
        // a degree either neighbour already holds would merge into it and add nothing
        const near = stepDegs(s.d, nd).filter(d => d !== (bar[s.c + 1] || [])[0]);
        if (!near.length) return false;
        putNote(bar, s.c, 1, near[(pass - 1) % near.length]);
        return true;
      });
    } },
  /* A long note breaks in two and the second half steps away — the same onset, one more note. The
     way a held note turns into a phrase without the bar getting any busier at the start. */
  { id:"split", apply(bars, nd, r, pass) {
      return overBars(bars, r, pass, (bar, ns) => {
        const held = ns.filter(n => n.len >= 2);
        if (!held.length) return false;
        const n = byPass(held, r, pass), half = n.len - Math.floor(n.len / 2);
        const near = stepDegs(n.d, nd).filter(d => d !== (bar[n.c + n.len] || [])[0]);
        if (!near.length) return false;
        putNote(bar, n.c + half, n.len - half, near[(pass - 1) % near.length]);
        return true;
      });
    } },
  /* The ornament: a held note dips to its neighbour and comes back, so one note becomes three.
     Needs room on both sides of the middle, which is why it wants a note three columns long. */
  { id:"turn", apply(bars, nd, r, pass) {
      return overBars(bars, r, pass, (bar, ns) => {
        const long = ns.filter(n => n.len >= 3);
        if (!long.length) return false;
        const n = byPass(long, r, pass), near = stepDegs(n.d, nd);
        if (!near.length) return false;
        putNote(bar, n.c + Math.floor(n.len / 2), 1, near[(pass - 1) % near.length]);
        return true;
      });
    } },
  // push a phrase early — the anticipation that makes a repeat feel restless
  { id:"push", apply(bars, nd, r, pass) {
      return overBars(bars, r, pass, (bar, ns) => {
        // every note with a free column in front of it, then step along them by pass — always
        // pushing the same note would give two repeats the same edit whenever they pick the same bar
        const can = ns.filter((n, i) => i > 0 && n.c >= 1 && !(bar[n.c - 1] || []).length);
        if (!can.length) return false;
        const n = byPass(can, r, pass);
        clearNote(bar, n.c, n.len);
        putNote(bar, n.c - 1, n.len, n.d);
        return true;
      });
    } },
  // and the other way: a note arrives late, off the beat it was written on
  { id:"delay", apply(bars, nd, r, pass) {
      return overBars(bars, r, pass, (bar, ns) => {
        const can = ns.filter((n, i) => i > 0 && n.c + n.len < bar.length && !(bar[n.c + n.len] || []).length);
        if (!can.length) return false;
        const n = byPass(can, r, pass);
        clearNote(bar, n.c, n.len);
        putNote(bar, n.c + 1, n.len, n.d);
        return true;
      });
    } },
  // lift one interior note to its neighbour — the smallest change that is still audible
  { id:"neighbour", apply(bars, nd, r, pass) {
      return overBars(bars, r, pass, (bar, ns) => {
        if (ns.length < 3) return false;
        // any note, not only the interior ones: a three-note bar has one interior note, so
        // restricting it there would give every pass the same edit
        const i = (Math.floor(r * ns.length) + pass) % ns.length, n = ns[i];
        const merge = wouldMerge(ns, i);
        const near = stepDegs(n.d, nd).filter(d => !merge.includes(d));
        if (!near.length) return false;
        putNote(bar, n.c, n.len, near[(pass - 1) % near.length]);
        return true;
      });
    } },
  // take a note away: space is a variation too, and it stops later passes getting busier and busier
  { id:"thin", apply(bars, nd, r, pass) {
      return overBars(bars, r, pass, (bar, ns) => {
        if (ns.length < 3) return false;                     // never empty a bar out entirely
        const n = ns[(Math.floor(r * ns.length) + pass) % ns.length];
        clearNote(bar, n.c, n.len);
        return true;
      });
    } },
  /* Two notes become one. The mirror of `split`, and the edit that gives a fourth chorus somewhere
     to go once the earlier passes have all got busier. */
  { id:"merge", apply(bars, nd, r, pass) {
      return overBars(bars, r, pass, (bar, ns) => {
        // adjacent pairs with no gap between them: the second is absorbed into the first
        const pairs = ns.filter((n, i) => i > 0 && n.c === ns[i - 1].c + ns[i - 1].len);
        if (pairs.length < 1 || ns.length < 3) return false;
        const n = byPass(pairs, r, pass), prev = ns[ns.indexOf(n) - 1];
        putNote(bar, n.c, n.len, prev.d);
        return true;
      });
    } },
];

// a bar list as one comparable string — enough to tell whether an edit actually landed
const barsKey = bars => bars.map(b => b.map(c => (c && c.length ? c[0] : ".")).join("")).join("|");

/* Vary a later pass of a section. `amount` is how many edits to make: 0 leaves it alone.
   Pass 0 is never varied — it is the thing the others are variations of. */
const varyBars = (bars, { pass = 0, role = "V", nd = 7, amount = 1 } = {}) => {
  const out = bars.map(bar => bar.map(col => [...(col || [])]));
  if (!amount || !pass || !out.length) return out;
  /* Every hash here is seeded from the role only, never from the pass. The pass is added afterwards,
     as a plain `+ pass` on each choice, so consecutive repeats step one place along — a different
     variation, a different bar, a different note. Folding the pass into the hash instead scrambles
     the choices, and two repeats then land on the same edit by coincidence often enough to hear. */
  const seed = role.charCodeAt(0) * 131;
  /* Walk a rotation of the list rather than drawing from it: a draw can miss a variation entirely
     over its tries, and in a sparse bar most variations have nowhere to go — no interior note to
     lift, no gap to fill — so the one that *can* act has to be reached, not hoped for. */
  const start = Math.floor(hash01(seed) * VARIATIONS.length) + pass;
  const before = barsKey(out);
  let applied = 0;
  /* Several variations are each other's mirror — clip and extend, push and delay, split and merge —
     so a second edit can undo the first and hand back a repeat identical to the one it was meant to
     vary. Each edit therefore counts only if it changed something, and the walk carries on past
     `amount` while the bars still match where they started.
     One trip round the list, so two edits are always two different kinds of edit. */
  for (let k = 0; k < VARIATIONS.length; k++) {
    if (applied >= amount && barsKey(out) !== before) break;
    const i = (start + k) % VARIATIONS.length;
    const snap = barsKey(out);
    if (VARIATIONS[i].apply(out, nd, hash01(seed + i * 977), pass) && barsKey(out) !== snap) applied++;
  }
  return out;
};
const VARY_LEVELS = [[0, "Identical repeats"], [1, "Vary a little"], [2, "Vary more"], [3, "Vary a lot"]];

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

 { id:"motif", name:"Motif — one idea, transformed",
   tip:"States one four-note cell and brings it back in every section, transformed by what that section is: plain in the verses, upside down in a bridge or solo, backwards in a build, flattened out for an intro or an outro. The register still moves with the role, so a chorus is the same idea sung higher — which is what makes a song sound like one song rather than a set of unrelated tunes.",
   refs:"Beethoven's Fifth · Seven Nation Army · Shape of You",
   gen(u){ const cell = MOTIF_MOVES[motifMoveFor(u.role)](MOTIF);
     const [lo, hi] = winFor(u, 0.5);
     const base = lo + (hi - lo) * 0.35;
     return narBars(u, () => nCols(u.B, roleN(u.role), u.sub),
       s => base + cell[s.g % cell.length]); } },

 { id:"qanda", name:"Motif — call and answer",
   tip:"The same four-note cell as the motif narrative, but put into two-bar sentences: odd bars state it and hang unresolved, even bars answer with it inverted and land home. Where \u201cQuestion & answer phrases\u201d shapes any line that way, this one keeps returning to the same recognisable idea.",
   refs:"Oh When the Saints · most 12-bar blues · Twinkle Twinkle",
   gen(u){ const [lo, hi] = winFor(u, 0.55);
     const base = lo + (hi - lo) * 0.3;
     return narBars(u, () => nCols(u.B, roleN(u.role), u.sub),
       s => { const asking = s.b % 2 === 0;
              const cell = asking ? MOTIF : MOTIF.map(x => -x);
              // the answer's last note comes home; the question is left hanging a step above
              if (s.i === s.n - 1) return asking ? base + 1 : lo;
              return base + cell[s.i % cell.length]; }); } },

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

export { MOD_GROUPS, MODS, MOD_BY_KEY, LFO_RATES, modOf, modCount, VARIATIONS, VARY_LEVELS, barNotes, varyBars, ARPS, ARP_BY_ID, ARP_RATES, GATES, GATE_BY_ID, LAYER_FX, hash01, layerFx, LAYER_DEFAULT_INSTR, LAYER_DEFAULT_OCT, LAYER_DEFAULT_VOL, LAYER_INK, LAYER_NAMES, LAYER_OCT_MAX, LAYER_OCT_MIN, MAX_LAYERS, MELODY_PATTERNS, NARRATIVES, RHYTHMS, RHYTHM_BY_ID, ROLE_LIFT, ROLE_N, ROLE_RHYTHM, blankBars, chordSnap, clampDeg, colPrefs, isHook, layBar, layerGain, nCols, narBars, pickSpread, qbeats, rescaleBar, rhythmSpots, roleLift, roleN, winFor, withLens, wrap7 };
