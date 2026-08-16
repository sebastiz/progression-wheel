/* theory — Pitch classes, chord qualities and intervals, the modes, and how a key spells its notes.
   No dependencies — everything else builds on this.
*/
/* ===== theory ===== */
const SEMI_NAME = { 0:"C",1:"D♭",2:"D",3:"E♭",4:"E",5:"F",6:"F♯",7:"G",8:"A♭",9:"A",10:"B♭",11:"B" };
const posOf = s => (s * 7) % 12;
const MAJOR_NUM = { I:[0,"maj"], ii:[2,"min"], iii:[4,"min"], IV:[5,"maj"], iv:[5,"min"], V:[7,"maj"], vi:[9,"min"],
  II:[2,"maj"], v:[7,"min"], bIII:[3,"maj"], bVI:[8,"maj"], bVII:[10,"maj"],
  I7:[0,"dom"], II7:[2,"dom"], III7:[4,"dom"], IV7:[5,"dom"], V7:[7,"dom"], VI7:[9,"dom"] };
const MINOR_NUM = { i:[0,"min"], I:[0,"maj"], ii:[2,"min"], IV:[5,"maj"], iv:[5,"min"], v:[7,"min"], V:[7,"maj"], VI:[9,"maj"], bII:[1,"maj"], bIII:[3,"maj"], bVI:[8,"maj"], bVII:[10,"maj"] };
const FUNC_MAJOR = { I:"T", I7:"T", iii:"T", vi:"T", bIII:"T", ii:"S", II:"S", IV:"S", iv:"S", IV7:"S", bVI:"S", v:"D", V:"D", V7:"D", bVII:"D", II7:"D", III7:"D", VI7:"D" };
const FUNC_MINOR = { i:"T", I:"T", bIII:"T", ii:"S", IV:"S", iv:"S", VI:"S", bII:"S", bVI:"S", v:"D", V:"D", bVII:"D" };
const QSUF = { maj:"", min:"m", dom:"7", maj7:"maj7", m7:"m7", maj9:"maj9", m9:"m9", dom9:"9",
  add9:"add9", madd9:"m(add9)", six:"6", m6:"m6", sus2:"sus2", sus4:"sus4", dom7sus4:"7sus4", dim:"°", aug:"+" };
const chordName = (r, q) => SEMI_NAME[r] + (QSUF[q] || "");
const famMin = q => q === "min" || q === "m7" || q === "m9" || q === "madd9" || q === "m6";

/* ===== modes ===== */
// the seven diatonic modes: interval pattern from the tonic, a pentatonic subset for melody,
// the major/minor *family* (which numeral map + function colours a progression uses), a short label,
// and `rel` — the semitones from this mode's tonic up to its parent (relative-Ionian) major root.
const MODES = {
  ionian:     { label:"Major (Ionian)",  short:"major",      semis:[0,2,4,5,7,9,11], pent:[0,2,4,7,9],  family:"major", rel:0 },
  dorian:     { label:"Dorian",          short:"Dorian",     semis:[0,2,3,5,7,9,10], pent:[0,3,5,7,10], family:"minor", rel:10 },
  phrygian:   { label:"Phrygian",        short:"Phrygian",   semis:[0,1,3,5,7,8,10], pent:[0,3,5,7,10], family:"minor", rel:8 },
  lydian:     { label:"Lydian",          short:"Lydian",     semis:[0,2,4,6,7,9,11], pent:[0,2,4,7,9],  family:"major", rel:7 },
  mixolydian: { label:"Mixolydian",      short:"Mixolydian", semis:[0,2,4,5,7,9,10], pent:[0,2,4,7,9],  family:"major", rel:5 },
  aeolian:    { label:"Minor (Aeolian)", short:"minor",      semis:[0,2,3,5,7,8,10], pent:[0,3,5,7,10], family:"minor", rel:3 },
  locrian:    { label:"Locrian",         short:"Locrian",    semis:[0,1,3,5,6,8,10], pent:[0,3,5,8,10], family:"minor", rel:1 },
  // Phrygian dominant — the flamenco / "Spanish" scale (Phrygian with a major 3rd): 1 ♭2 3 4 5 ♭6 ♭7.
  // Not a mode of the major scale (it's the 5th mode of harmonic minor); spelled off the Phrygian parent.
  flamenco:   { label:"Phrygian dominant (Flamenco)", short:"Flamenco", semis:[0,1,4,5,7,8,10], pent:[0,1,4,5,7], family:"minor", rel:8,
    hint:"The classic flamenco loop is the Andalusian cadence (i–♭VII–♭VI–V). Load “The Andalusian descent” from the Suggested progressions (Emotion → Sad or Dark / Tense), or build one by tapping the gold-haloed chords." },
};
const MODE_IDS = Object.keys(MODES);
// legacy progressions stored "major"/"minor"; map anything to a real mode id
const modeId = m => MODES[m] ? m : (m === "minor" ? "aeolian" : "ionian");
const modeFamily = m => MODES[modeId(m)].family;

/* ===== note spelling ===== */
// key-signature accidentals for each major key (>=0 sharps, <0 flats), picking the simpler enharmonic
const MAJOR_SIG = { 0:0, 7:1, 2:2, 9:3, 4:4, 11:5, 6:6, 5:-1, 10:-2, 3:-3, 8:-4, 1:-5 };
const SHARP_NAMES = ["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"];
const FLAT_NAMES  = ["C","D♭","D","E♭","E","F","G♭","G","A♭","A","B♭","B"];
// does the key (tonic + mode) sit on the sharp side of the circle of fifths?
const keyIsSharp = (tonic, mode) => (MAJOR_SIG[((tonic + MODES[modeId(mode)].rel) % 12 + 12) % 12] ?? 0) >= 0;
// spell a pitch class the way this key would write it (sharps in sharp keys, flats in flat keys)
const spell = (pc, tonic, mode) => (keyIsSharp(tonic, mode) ? SHARP_NAMES : FLAT_NAMES)[((pc % 12) + 12) % 12];

const chordIvs = q => ({ dom:[0,4,7,10], maj7:[0,4,7,11], m7:[0,3,7,10],
  maj9:[0,4,7,11,14], m9:[0,3,7,10,14], dom9:[0,4,7,10,14],
  add9:[0,4,7,14], madd9:[0,3,7,14], six:[0,4,7,9], m6:[0,3,7,9],
  sus2:[0,2,7], sus4:[0,5,7], dom7sus4:[0,5,7,10] }[q] || [0, q === "min" ? 3 : 4, 7]);

export { FLAT_NAMES, FUNC_MAJOR, FUNC_MINOR, MAJOR_NUM, MAJOR_SIG, MINOR_NUM, MODES, MODE_IDS, QSUF, SEMI_NAME, SHARP_NAMES, chordIvs, chordName, famMin, keyIsSharp, modeFamily, modeId, posOf, spell };
