import { mkPlan } from "./progressions.js";
import { autoSet } from "./arrange.js";
/* arrange-templates — a structure says what order the sections come in. A template says what
   *plays* in each of them, which is the part that was missing.

   A song structure is a running order: intro, groove, build, drop. Pick one and the app lays the
   chords out in that order — and then plays every element through all of it, start to end, because
   nothing has said otherwise. That is a track with sections, not an arrangement. In dance music it
   is the difference between a demo and a record: the drop lands because the breakdown took the kick
   away, and if nothing ever leaves, nothing can arrive.

   A template is therefore a plan plus, for every row, the four decisions that make a section sound
   like itself:

     drums   which kit pattern it plays — a catalogue id, "off" for silence, "" to follow the song
     chords  whether the harmony sounds at all (a drums-only DJ intro has none)
     parts   which melody parts (A–F) are in; everything else is muted for that section
     move    the filter shape across it — build, fade, underwater, swell
     trans   what happens at the seam *into* it — a riser, a crash, a bar of silence

   …plus the automation lanes — `filter`, `level`, and their rarer siblings `hp` (the mix thinning
   from below; 0 is off) and `res` (how hard the drawn filters bite; 0 is the polite default) —
   written as `[from, to]` across the row so a sixteen-bar climb is one line in the table rather
   than sixteen points to place by hand.

   Two properties matter more than they look:

   1. **The arrangement rides on the plan rows, not on section names.** Each row keeps its own `arr`,
      so moving a chorus, duplicating a drop or adding a pass carries its arrangement with it — the
      same guarantee `remapSecs` gives melodies. Re-applying after an edit therefore puts the
      arrangement back where the sections actually are now, not where the template first put them.
   2. **Everything resolves to *instance* keys** (D1, D2 …), not section letters. "The second drop is
      bigger than the first" is the whole craft, and a letter cannot say it.

   The catalogue below is the reference architecture for each style, at the phrase lengths the style
   actually uses. Bar maths assumes the usual four-chord loop: LOOP is 4 bars a pass, HALF1/HALF2
   are 2, HOLD1 is 2 (one chord, padded even) — so LOOP|4 is the sixteen-bar section club music is
   built from and HALF1|8 is a sixteen-bar build. */

const PARTS = ["A", "B", "C", "D", "E", "F"];

/* ---- the templates ----
   Every row is [ "Section|nums|reps|note", { what plays } ]. A row with no second element plays
   everything, which is the old behaviour and is occasionally what you want. */
const DEFS = [

["house", "House", "Four-on-the-floor, sixteen-bar phrases and a drop that is the groove returning rather than anything being added. Thirty-two bars of drums at each end for a DJ to mix through.",
 { bpm: 128, drum: "house909", kit: "909", pump: "classic", pat: "house16", bass: "offbeat", bassVoice: "saw" }, [
 ["DJ intro|LOOP|4|drums and one hook — a DJ mixes in over these sixteen bars",
  { chords: 0, bass: 0, parts: "", filter: [0.3, 0.45] }],
 ["Groove|LOOP|4|the chords arrive, still filtered — nothing is at full size yet",
  { parts: "", filter: [0.45, 0.72] }],
 ["Build|HALF1|4|eight bars: the filter opens and a riser comes up underneath",
  { parts: "", move: "riser" }],
 ["Drop|LOOP|4|the full loop at full size. Everything that has been held back arrives at once",
  { parts: "A", trans: "slam" }],
 ["Groove|LOOP|4|step back down — the second drop cannot be bigger unless this is smaller",
  { parts: "A", filter: [0.85, 0.85] }],
 ["Breakdown|LOOP|4|kick and clap out. The largest event in a house record is a subtraction",
  { drums: "off", bass: 0, parts: "A", move: "swell", trans: "closeto" }],
 ["Build|HALF1|4|the tops come back first, the bass drains away, and the kick is withheld to the very last bar",
  { drums: "nokick", bass: 0, parts: "A", move: "riser", hp: [0, 0.5] }],
 ["Drop|LOOP|4|second drop, with the part that has not been heard yet",
  { parts: "AB", trans: "fulldrop" }],
 ["DJ outro|LOOP|4|drums only again, filtering down — the mix-out",
  { chords: 0, bass: 0, parts: "", filter: [1, 0.3] }],
]],

["nudisco", "Nu-disco", "Filter-disco groove: a chugging offbeat guitar and a house pump under a genuinely funky bassline. The filter does the arranging — sweeping open into the drop and shut into the breakdown — more than layers being added or removed.",
 { bpm: 120, drum: "disco909", kit: "909", pump: "classic", pat: "disco16", bass: "disco", bassVoice: "pluck" }, [
 ["DJ intro|LOOP|4|drums and the chug, filtered right down — the mix-in",
  { chords: 0, bass: 0, parts: "", filter: [0.3, 0.5] }],
 ["Groove|LOOP|4|the bassline and chords arrive, filter still climbing",
  { parts: "", filter: [0.5, 0.75] }],
 ["Build|HALF1|4|eight bars: the filter finishes opening, a riser under it",
  { parts: "", move: "riser" }],
 ["Drop|LOOP|4|wide open — the full chug, bass and hook together",
  { parts: "A", trans: "slam" }],
 ["Groove|LOOP|4|step back down — the second drop cannot be bigger unless this is smaller",
  { parts: "A", filter: [0.85, 0.85] }],
 ["Breakdown|LOOP|4|kick and clap out, the chug alone with the bass — the disco filter-edit move",
  { drums: "nokick", parts: "A", move: "under", trans: "closeto" }],
 ["Build|HALF1|4|the kick returns tops-first, filter climbing back open",
  { drums: "nokick", parts: "A", move: "riser" }],
 ["Drop|LOOP|4|second drop, the counter-line added",
  { parts: "AB", trans: "fulldrop" }],
 ["DJ outro|LOOP|4|drums and chug only, filtering down for the mix-out",
  { chords: 0, bass: 0, parts: "", filter: [1, 0.3] }],
]],

["techhouse", "Tech house", "Minimal and relentless: two very long grooves, and the interest is in what drops out rather than what gets added. A tool for a set more than a song.",
 { bpm: 126, drum: "techhouse", kit: "909", pump: "classic", pat: "stab16", bass: "offbeat", bassVoice: "sub" }, [
 ["DJ intro|LOOP|4|drums and a rim — sixteen bars of nothing but groove",
  { chords: 0, bass: 0, parts: "" }],
 ["Groove|LOOP|8|thirty-two bars, almost no change. The stab enters filtered and opens slowly",
  { parts: "", filter: [0.5, 0.85] }],
 ["Break|HOLD1|4|drums only, one chord held under them",
  { bass: 0, parts: "", trans: "gapbar" }],
 ["Groove|LOOP|8|the hook enters — the only new element in the whole record",
  { parts: "A" }],
 ["Break|HALF2|4|kick out, everything underwater for eight bars",
  { drums: "nokick", parts: "A", move: "under" }],
 ["Groove|LOOP|4|straight back in, no ceremony beyond the crash",
  { parts: "A", trans: "slam" }],
 ["DJ outro|LOOP|4|strip to the drums and filter down",
  { chords: 0, bass: 0, parts: "", filter: [1, 0.28] }],
]],

["techno", "Techno", "Layering is the arrangement: one element every sixteen bars, the filter doing the rest, and a release that arrives rather than drops. Harmony is nearly static by design.",
 { bpm: 132, drum: "techno16", kit: "909", pump: "hard", pat: "quarters", bass: "eighths", bassVoice: "saw" }, [
 ["Intro|LOOP|4|kick alone. Sixteen bars of it, and it should feel like fifteen too many",
  { drums: "kickonly", chords: 0, bass: 0, parts: "", filter: [0.35, 0.35] }],
 ["Pulse|LOOP|4|the full pattern, chords barely there under it",
  { parts: "", filter: [0.4, 0.55] }],
 ["Layer up|LOOP|4|the lead enters, still behind the filter",
  { parts: "A", filter: [0.55, 0.78] }],
 ["Long build|HALF1|8|sixteen bars with the filter opening the whole way and a riser under it",
  { parts: "A", move: "riser" }],
 ["Release|LOOP|8|thirty-two bars wide open. An arrival, not a drop",
  { parts: "AB", trans: "crash" }],
 ["Breakdown|LOOP|4|drums gone entirely — the only silence in the record",
  { drums: "off", bass: 0, parts: "A", move: "swell", trans: "closeto" }],
 ["Return|LOOP|8|the kick back first, everything else behind it",
  { parts: "AB", trans: "risedrop" }],
 ["Outro|LOOP|4|back to the kick and the hats for the mix-out",
  { drums: "kickonly", chords: 0, bass: 0, parts: "", filter: [1, 0.25] }],
]],

["trance", "Trance", "The breakdown is the song: everything before it is setup and everything after is release. The longest breakdown and the widest dynamic swing of any dance form.",
 { bpm: 138, drum: "trance", kit: "909", pump: "classic", pat: "stab16", bass: "rolloff", bassVoice: "saw" }, [
 ["Intro|LOOP|4|drums and a filtered pad",
  { chords: 0, bass: 0, parts: "", filter: [0.32, 0.5] }],
 ["Groove|LOOP|4|the loop, held back",
  { parts: "", filter: [0.5, 0.8] }],
 ["Breakdown|LOOP|8|thirty-two bars, no drums at all. The melodic centrepiece",
  { drums: "off", bass: 0, parts: "A", move: "swell", trans: "fadeto" }],
 ["Build|HALF1|8|sixteen bars: tops return, riser under them, kick withheld",
  { drums: "nokick", bass: 0, parts: "A", move: "riser" }],
 ["Drop|LOOP|8|thirty-two bars of the main theme at full size",
  { parts: "AB", trans: "fulldrop" }],
 ["Break|HALF2|4|eight bars of air before the last one",
  { drums: "off", bass: 0, parts: "A", trans: "closeto" }],
 ["Drop|LOOP|4|the theme once more and out",
  { parts: "AB", trans: "slam" }],
 ["Outro|LOOP|4|drums filtering away",
  { chords: 0, bass: 0, parts: "", filter: [1, 0.3] }],
]],

["bigroom", "Big room / festival", "The main-stage shape. The drop is deliberately sparse — often kick and lead alone — which only works because the build stacked everything on top of everything.",
 { bpm: 128, drum: "bigroom", kit: "909", pump: "hard", pat: "stab16", bass: "offbeat", bassVoice: "saw" }, [
 ["DJ intro|LOOP|4|beat only, filtered — sixteen bars for the mix-in",
  { chords: 0, bass: 0, parts: "", filter: [0.3, 0.45] }],
 ["Build|HALF1|4|snare roll and riser, the filter opening all the way",
  { parts: "", move: "riser" }],
 ["Drop|LOOP|4|kick and lead, nothing else. Sparse *because* the build was not",
  { chords: 0, parts: "A", trans: "gapslam" }],
 ["Breakdown|LOOP|4|melodic and wide open, no kick",
  { drums: "off", bass: 0, parts: "A", move: "swell", trans: "stop" }],
 ["Build|HALF1|8|sixteen bars, higher than the first and twice as long — the bass drains out as it climbs",
  { drums: "nokick", bass: 0, parts: "A", move: "riser", hp: [0, 0.55] }],
 ["Drop|LOOP|4|second drop, the counter-line added",
  { chords: 0, parts: "AB", trans: "fulldrop" }],
 ["Outro|LOOP|4|beat only — the DJ mixes out",
  { chords: 0, bass: 0, parts: "", filter: [1, 0.3] }],
]],

["proghouse", "Progressive house", "Nothing arrives all at once. Layers enter one at a time, the filter climbs across five sections rather than eight bars, and the main groove is a groove, not an event.",
 { bpm: 124, drum: "deep", kit: "909", pump: "classic", pat: "house16", bass: "eighths", bassVoice: "saw" }, [
 ["Intro|LOOP|4|one element, heavily filtered",
  { chords: 0, bass: 0, parts: "", filter: [0.22, 0.34] }],
 ["Groove|LOOP|4|the chords underneath, still shut",
  { parts: "", filter: [0.34, 0.5] }],
 ["Layer up|LOOP|4|the lead, quietly",
  { parts: "A", filter: [0.5, 0.66] }],
 ["Breakdown|LOOP|4|the kick steps out for sixteen bars — the only subtraction in the record",
  { drums: "off", parts: "A", filter: [0.66, 0.55], trans: "closeto" }],
 ["Long build|HALF1|8|sixteen bars, tops back, the filter finally opening the whole way",
  { drums: "nokick", parts: "A", filter: [0.55, 1] }],
 ["Main groove|LOOP|8|thirty-two bars wide open. Let it run",
  { parts: "AB", filter: [1, 1], trans: "crash" }],
 ["Outro|LOOP|4|strip back down to what it started as",
  { chords: 0, bass: 0, parts: "", filter: [1, 0.25] }],
]],

["melotech", "Melodic techno", "A long climb that never quite pays off — the tension is the point. One filter line across the whole record instead of a sweep per section, and a release that opens rather than lands.",
 { bpm: 122, drum: "techno", kit: "909", pump: "classic", pat: "quarters", bass: "eighths", bassVoice: "reese" }, [
 ["Intro|LOOP|4|kick and a hint of the pad behind a shut filter",
  { drums: "kickonly", bass: 0, parts: "", filter: [0.25, 0.38] }],
 ["Pulse|LOOP|4|the pattern proper, the arp entering",
  { parts: "A", filter: [0.38, 0.52] }],
 ["Layer up|LOOP|4|the counter-line — everything the record has, sixteen bars before it is taken away",
  { parts: "AB", filter: [0.52, 0.68] }],
 ["Suspend|LOOP|4|drums gone. The theme alone for sixteen bars, and the whole climb starts again from here",
  { drums: "off", bass: 0, parts: "A", filter: [0.68, 0.5], trans: "closeto" }],
 ["Long build|HALF1|8|sixteen bars, tops back, kick withheld, the filter opening the whole way",
  { drums: "nokick", parts: "AB", filter: [0.5, 0.95] }],
 ["Release|LOOP|8|thirty-two bars wide open. It opens rather than lands",
  { parts: "AB", filter: [1, 1], trans: "washup" }],
 ["Fade|LOOP|4|back to the kick and out, no resolution offered",
  { chords: 0, bass: 0, parts: "", filter: [1, 0.2] }],
]],

["dnb", "Drum & bass", "A half-time feel over double-time drums. The atmosphere is stated first, the drop is often only the break and the sub, and the roll-out between the two drops strips it to the bare break.",
 { bpm: 174, drum: "dnb", kit: "acoustic", pump: "subtle", pat: "halftime", bass: "subhold", bassVoice: "reese" }, [
 ["Intro|LOOP|8|thirty-two bars of break for the mix-in — no harmony, no theme",
  { chords: 0, bass: 0, parts: "", filter: [0.3, 0.5] }],
 ["Breakdown|LOOP|4|drums out, pads and the theme. The mood is set before the drop, not after it",
  { drums: "off", bass: 0, parts: "A", move: "swell" }],
 ["Drop|LOOP|8|break, sub and the theme. Thirty-two bars, and the chords stay out",
  { chords: 0, parts: "AB", trans: "fulldrop" }],
 ["Roll-out|HALF2|4|eight bars stripped to the break with the kick out — the collapse between the drops",
  { drums: "nokick", chords: 0, bass: 0, parts: "", trans: "chopgap" }],
 ["Drop|LOOP|8|second drop, one element that has not been heard yet",
  { chords: 0, parts: "ABC", trans: "slam" }],
 ["Outro|LOOP|4|the break alone, filtering out",
  { chords: 0, bass: 0, parts: "", filter: [1, 0.3] }],
]],

["dubstep", "Dubstep / bass", "Half-time drops where the mid-range movement *replaces* the harmony rather than sitting on top of it — so the chords come out at the drop, which is the opposite of every other form here.",
 { bpm: 140, drum: "dubstep16", kit: "808", pump: "hard", pat: "trap16", bass: "subhold", bassVoice: "reese" }, [
 ["Intro|LOOP|2|tops and the chords, filtered",
  { drums: "ohats", bass: 0, parts: "", filter: [0.35, 0.55] }],
 ["Build|HALF1|4|eight bars, kick withheld, riser over the top",
  { drums: "nokick", bass: 0, parts: "A", move: "riser" }],
 ["Drop|LOOP|4|half-time. The chords come *out* — the mid-range is the harmony now",
  { chords: 0, parts: "AB", trans: "gapslam" }],
 ["Mid|HALF2|4|the rhythm changes, the key does not, and the lead sits out",
  { parts: "", trans: "dip" }],
 ["Breakdown|LOOP|2|everything but the melody gone",
  { drums: "off", bass: 0, parts: "A", trans: "stop" }],
 ["Build|HALF1|4|second build, same trick, further",
  { drums: "nokick", bass: 0, parts: "A", move: "riser" }],
 ["Drop|LOOP|4|second drop, new pattern, one element that has not been heard",
  { chords: 0, parts: "AB", trans: "fulldrop" }],
 ["Outro|LOOP|2|the chords return as it fades",
  { bass: 0, parts: "", move: "fade" }],
]],

["futurebass", "Future bass", "The drop *is* the chords, which is the one dance form this app is built for. Short, bright, and the verses are deliberately thin so the chorus has somewhere to arrive from.",
 { bpm: 150, drum: "trap16d", kit: "808", pump: "classic", pat: "trap16", bass: "subhold", bassVoice: "sub" }, [
 ["Intro|HALF1|2|four bars, filtered, no drums",
  { drums: "off", bass: 0, parts: "", filter: [0.4, 0.6] }],
 ["Verse|LOOP|2|thin on purpose — drums and the vocal line",
  { bass: 0, parts: "A", filter: [0.7, 0.7] }],
 ["Build|HALF1|4|eight bars, kick out, riser up",
  { drums: "nokick", bass: 0, parts: "A", move: "riser" }],
 ["Drop|LOOP|4|the chords at full size with the lead on top — this is the hook",
  { parts: "AB", trans: "slam" }],
 ["Verse|LOOP|2|back down, so the second drop has room",
  { bass: 0, parts: "A", filter: [0.7, 0.7] }],
 ["Build|HALF1|4|second build",
  { drums: "nokick", bass: 0, parts: "A", move: "riser" }],
 ["Drop|LOOP|4|second drop, everything in",
  { parts: "ABC", trans: "fulldrop" }],
 ["Outro|HOLD1|4|one chord, held, filtering down",
  { drums: "off", bass: 0, parts: "", move: "fade" }],
]],

["trap", "Trap", "Hook-led and repetitive by design. The verses carry no melody at all — the hook is the only thing that ever enters — and the bridge is the one place anything is taken away.",
 { bpm: 140, drum: "trap16d", kit: "808", pump: "subtle", pat: "trap16" }, [
 ["Intro|HOLD1|4|no drums. One chord and the melody, underwater",
  { drums: "off", parts: "A", move: "under" }],
 ["Verse|LOOP|4|drums in, melody out — sixteen bars for a vocal that is not written here",
  { parts: "", trans: "crash" }],
 ["Hook|LOOP|2|the hook, and the only place it appears",
  { parts: "A", trans: "boom" }],
 ["Verse|LOOP|4|second verse, same emptiness",
  { parts: "" }],
 ["Hook|LOOP|2|",
  { parts: "A" }],
 ["Bridge|HALF2|2|drums out for four bars — the only subtraction in the record",
  { drums: "off", parts: "A", trans: "gap2" }],
 ["Hook|LOOP|4|double hook to finish",
  { parts: "AB", trans: "slam" }],
]],

["garage", "UK garage", "Two-step, swung, with the vocal as the only real melodic layer and short breaks that keep it moving rather than building anything.",
 { bpm: 134, drum: "garage16d", kit: "909", pump: "classic", pat: "garage16", bass: "offbeat", bassVoice: "sub" }, [
 ["Intro|LOOP|2|the shuffle alone",
  { chords: 0, bass: 0, parts: "", filter: [0.35, 0.55] }],
 ["Groove|LOOP|4|chords in, filtered",
  { parts: "", filter: [0.55, 0.8] }],
 ["Vocal|LOOP|4|the line enters, everything wide open",
  { parts: "A", filter: [1, 1] }],
 ["Break|HALF2|2|kick out, stuttered into the return",
  { drums: "nokick", parts: "A", trans: "chop" }],
 ["Groove|LOOP|4|",
  { parts: "A", filter: [1, 1] }],
 ["Vocal|LOOP|4|second vocal section, the counter-line under it",
  { parts: "AB", trans: "crash" }],
 ["Outro|LOOP|2|out on the drums",
  { chords: 0, bass: 0, parts: "", filter: [1, 0.35] }],
]],

];

/* Each template's rows become a plan in exactly the shape the structure catalogue produces, with
   the arrangement carried on the row itself as `arr` — see the note at the top about why that
   matters when the plan is later edited. */
const DANCE_TEMPLATES = DEFS.map(([id, name, tip, sound, rows]) => ({
  id, name, tip, ...sound,
  plan: mkPlan(rows.map(r => r[0])).map((row, i) => ({ ...row, arr: rows[i][1] || null })),
}));

/* ---- resolving a template onto a song ----
   The plan says what the sections are; `insts` says what they became once the progression had its
   say — four chords or eight, a row played twice or four times. Only here do the two meet, which is
   why this is a function of both rather than something the table could hold.

   Everything is keyed by instance (D1, D2 …). The maps are complete rather than sparse: a row that
   plays everything still writes "" for its drums and its move, so applying a template *clears* the
   last one instead of leaving half of it behind. */
const resolveArrangement = (plan, insts) => {
  const secDrum = {}, secQuiet = {}, secBass = {}, secMove = {}, secTrans = {}, parts = {};
  const rows = {};
  (insts || []).forEach(d => (rows[d.row] = rows[d.row] || []).push(d));
  const arrOf = r => (plan && plan[r] && plan[r].arr) || null;
  // a lane is drawn only if some row asks for it — and then every row writes a value, or the gaps
  // between the rows that did would interpolate into a slow sweep nobody asked for
  const uses = lane => Object.keys(rows).some(r => { const a = arrOf(r); return a && a[lane] != null; });
  const useF = uses("filter"), useL = uses("level"), useH = uses("hp"), useR = uses("res");
  let filter = useF ? [] : null, level = useL ? [] : null;
  let hp = useH ? [] : null, res = useR ? [] : null;
  /* One `[from, to]` across a row: a point on its first bar and another on its last. Consecutive
     rows therefore step at the seam rather than ramping through it, which is what a section
     boundary sounds like. */
  const span = (pts, list, v) => {
    const from = Array.isArray(v) ? v[0] : v, to = Array.isArray(v) ? v[1] : v;
    const last = list[list.length - 1];
    const b0 = list[0].startBar, b1 = last.startBar + last.nbars - 1;
    const out = autoSet(pts, b0, from);
    return b1 > b0 ? autoSet(out, b1, to) : out;
  };
  Object.keys(rows).map(Number).sort((a, b) => a - b).forEach(r => {
    const list = rows[r], a = arrOf(r) || {};
    list.forEach((d, i) => {
      secDrum[d.key] = a.drums || "";
      secQuiet[d.key] = a.chords != null && !a.chords;
      // `bass: 0` takes the bassline out for the row; anything else (or nothing) leaves it playing
      secBass[d.key] = a.bass != null && !a.bass;
      secMove[d.key] = a.move || "";
      /* A transition belongs to the seam it leads *into*, so a row played four times gets one, not
         four — a riser before every pass of a drop is a fire alarm, not an arrangement. */
      secTrans[d.key] = i === 0 ? (a.trans || "") : "";
      if (a.parts != null) parts[d.key] = PARTS.map(P => a.parts.includes(P));
    });
    if (useF) filter = span(filter, list, a.filter != null ? a.filter : 1);
    if (useL) level = span(level, list, a.level != null ? a.level : 1);
    // the hi-pass and resonance lanes rest at *zero* — off — where filter and level rest at one
    if (useH) hp = span(hp, list, a.hp != null ? a.hp : 0);
    if (useR) res = span(res, list, a.res != null ? a.res : 0);
  });
  return { secDrum, secQuiet, secBass, secMove, secTrans, parts, filter, level, hp, res };
};

/* What a section is worth on the energy staircase, which is the picture the strip draws. The
   weights are the ones in docs/DANCE-LAYERING.md: clock and foundation carry a track, the hook is
   worth as much as the drums, and everything else is a point each. Relative, not absolute — the
   number means nothing on its own and everything next to the section before it. */
const ENERGY_W = { drums: 3, chords: 2, lead: 3, part: 1 };
/* `drums` is an amount rather than a switch, because the subtraction that matters most is not
   silence but a kit with its kick taken out: tops-only under a build is half a drum kit, and
   scoring it as a whole one hides the exact dip the build exists to create. `true` still means the
   lot, so a caller that only knows on/off is not wrong. */
const energyOf = ({ drums, chords, parts }) =>
  ENERGY_W.drums * (drums === true ? 1 : Math.max(0, Math.min(1, +drums || 0)))
  + (chords ? ENERGY_W.chords : 0)
  + (parts || []).reduce((n, on, i) => n + (on ? (i === 0 ? ENERGY_W.lead : ENERGY_W.part) : 0), 0);
/* How much of a drum kit a pattern is. A pattern with no kick or sub in it anywhere is the
   arrangement's half-measure — the tops left running while the floor is taken away. */
const drumAmountOf = pat => !pat || !pat.length ? 0 : (pat.some(st => /[KB]/.test(st || "")) ? 1 : 0.5);

export { DANCE_TEMPLATES, ENERGY_W, PARTS, drumAmountOf, energyOf, resolveArrangement };
