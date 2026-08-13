import { useState, useMemo, useRef, useEffect } from "react";
// The Progression Wheel — v3 (slim)
const APP_VERSION = "dev";   // replaced with package.json version at build time (scripts/build.mjs)

/* ===== theory ===== */
const SEMI_NAME = { 0:"C",1:"D♭",2:"D",3:"E♭",4:"E",5:"F",6:"F♯",7:"G",8:"A♭",9:"A",10:"B♭",11:"B" };
const posOf = s => (s * 7) % 12;
const MAJOR_NUM = { I:[0,"maj"], ii:[2,"min"], iii:[4,"min"], IV:[5,"maj"], V:[7,"maj"], vi:[9,"min"],
  II:[2,"maj"], v:[7,"min"], bIII:[3,"maj"], bVI:[8,"maj"], bVII:[10,"maj"],
  I7:[0,"dom"], II7:[2,"dom"], III7:[4,"dom"], IV7:[5,"dom"], V7:[7,"dom"], VI7:[9,"dom"] };
const MINOR_NUM = { i:[0,"min"], I:[0,"maj"], ii:[2,"min"], IV:[5,"maj"], iv:[5,"min"], v:[7,"min"], V:[7,"maj"], VI:[9,"maj"], bII:[1,"maj"], bIII:[3,"maj"], bVI:[8,"maj"], bVII:[10,"maj"] };
const FUNC_MAJOR = { I:"T", I7:"T", iii:"T", vi:"T", bIII:"T", ii:"S", II:"S", IV:"S", IV7:"S", bVI:"S", v:"D", V:"D", V7:"D", bVII:"D", II7:"D", III7:"D", VI7:"D" };
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

/* ===== progressions ===== */
const PROGRESSIONS = {};
[
["axis","The four-chord axis","major","I V vi IV",
 ["Let It Be — The Beatles","No Woman, No Cry — Bob Marley","With or Without You — U2","Someone Like You — Adele","I'm Yours — Jason Mraz","Don't Stop Believin' — Journey (chorus)","She Will Be Loved — Maroon 5","When I Come Around — Green Day","Paradise — Coldplay","Can You Feel the Love Tonight — Elton John"]],
["axisMinor","The minor axis","minor","i bVI bIII bVII",
 ["Zombie — The Cranberries","Apologize — OneRepublic","Grenade — Bruno Mars","Numb — Linkin Park","Save Tonight — Eagle-Eye Cherry","The Kids Aren't Alright — The Offspring","Despacito — Luis Fonsi","Hello — Adele (chorus)","Complicated — Avril Lavigne","It's My Life — Bon Jovi"]],
["three","Three-chord rock & roll","major","I IV V",
 ["Twist and Shout — The Beatles","La Bamba — Ritchie Valens","Wild Thing — The Troggs","Louie Louie — The Kingsmen","Blitzkrieg Bop — Ramones","Hang On Sloopy — The McCoys","Stir It Up — Bob Marley","Ring of Fire — Johnny Cash","Good Lovin' — The Rascals","What I Like About You — The Romantics"]],
["blues","12-bar blues","major","I7 IV7 I7 V7 IV7 I7",
 ["Johnny B. Goode — Chuck Berry","Hound Dog — Elvis Presley","Sweet Home Chicago — Robert Johnson","Pride and Joy — Stevie Ray Vaughan","Tutti Frutti — Little Richard","Rock Around the Clock — Bill Haley","Folsom Prison Blues — Johnny Cash","Kansas City — Wilbert Harrison","Crossroads — Cream","Before You Accuse Me — Eric Clapton"]],
["doowop","The '50s do-wop turnaround","major","I vi IV V",
 ["Stand by Me — Ben E. King","Earth Angel — The Penguins","Every Breath You Take — The Police","Unchained Melody — The Righteous Brothers","Blue Moon — The Marcels","Duke of Earl — Gene Chandler","Perfect — Ed Sheeran","Crocodile Rock — Elton John (verse)","Baby — Justin Bieber","Please Mr. Postman — The Marvelettes"]],
["jazz","The ii–V–I turnaround","major","ii V I vi",
 ["Fly Me to the Moon — Frank Sinatra","Autumn Leaves — jazz standard","Satin Doll — Duke Ellington","Blue Bossa — Kenny Dorham","All the Things You Are — Jerome Kern","Tune Up — Miles Davis","There Will Never Be Another You — standard","Honeysuckle Rose — Fats Waller","Perdido — Juan Tizol","I Got Rhythm — Gershwin (A section)"]],
["mixo","Mixolydian rock","mixolydian","I bVII IV",
 ["Sweet Home Alabama — Lynyrd Skynyrd","Sweet Child O' Mine — Guns N' Roses (verse)","Sympathy for the Devil — The Rolling Stones","Fortunate Son — CCR","Takin' Care of Business — BTO","Hey Jude — The Beatles (outro)","Gimme Some Lovin' — Spencer Davis Group","Won't Get Fooled Again — The Who","Cinnamon Girl — Neil Young","Tush — ZZ Top (chorus)"]],
["andalusian","The Andalusian descent","minor","i bVII bVI V",
 ["Hit the Road Jack — Ray Charles","Runaway — Del Shannon (verse)","Sultans of Swing — Dire Straits (verse)","Smooth — Santana ft. Rob Thomas","Happy Together — The Turtles (verse)","Stray Cat Strut — Stray Cats","Good Vibrations — The Beach Boys (verse)","Walk, Don't Run — The Ventures","Babe I'm Gonna Leave You — Led Zeppelin","California Dreamin' — The Mamas & the Papas (verse)"]],
["flamenco","Flamenco cadence","flamenco","iv bIII bII I",
 ["Bamboléo — Gipsy Kings","Djobi Djoba — Gipsy Kings","Baila Me — Gipsy Kings","Entre Dos Aguas — Paco de Lucía","Malagueña — Ernesto Lecuona","Asturias (Leyenda) — Isaac Albéniz","Misirlou — Dick Dale","Hava Nagila — traditional","Ojos Así — Shakira","Concierto de Aranjuez — Joaquín Rodrigo"]],
["pachelbel","The Pachelbel sequence","major","I V vi iii IV I IV V",
 ["Canon in D — Pachelbel","Basket Case — Green Day (verse)","Don't Look Back in Anger — Oasis","Memories — Maroon 5","Go West — Pet Shop Boys","Streets of London — Ralph McTell","Graduation (Friends Forever) — Vitamin C","C U When U Get There — Coolio","Cryin' — Aerosmith (verse)","Hook — Blues Traveler"]],
["dorian","Dorian groove","dorian","i IV",
 ["Oye Como Va — Santana","So What — Miles Davis","Evil Ways — Santana","Mad World — Tears for Fears","Another Brick in the Wall — Pink Floyd","Get Lucky — Daft Punk","Moondance — Van Morrison","Riders on the Storm — The Doors","Who Will Save Your Soul — Jewel","Scarborough Fair — traditional"]],
["lydian","Lydian bright","lydian","I II",
 ["Flying in a Blue Dream — Joe Satriani","Man on the Moon — R.E.M. (chorus)","Jane — Jefferson Starship","Freewill — Rush","Here Comes My Girl — Tom Petty","Dreams — Fleetwood Mac","Blue Jay Way — The Beatles","Possibly Maybe — Björk","Theme from The Simpsons — Danny Elfman","Yoda's Theme — John Williams"]],
["phrygian","Phrygian dark","phrygian","i bII",
 ["Wherever I May Roam — Metallica","Sails of Charon — Scorpions","Symphony of Destruction — Megadeth","War — Joe Satriani","Pyramid Song — Radiohead","Remember Tomorrow — Iron Maiden","Space Truckin' — Deep Purple","White Rabbit — Jefferson Airplane","Entre Dos Aguas — Paco de Lucía","Duel of the Fates — John Williams"]],
["aeolian","Aeolian cadence","minor","i bVI bVII",
 ["All Along the Watchtower — Bob Dylan","Stairway to Heaven — Led Zeppelin (ascent)","My Heart Will Go On — Céline Dion","Somebody That I Used to Know — Gotye","Boulevard of Broken Dreams — Green Day","Californication — Red Hot Chili Peppers","Self Esteem — The Offspring","The Passenger — Iggy Pop","Runaway Train — Soul Asylum","Mad World — Gary Jules"]],
].forEach(([id, label, mode, nums, songs]) =>
  PROGRESSIONS[id] = { label, mode, numerals: nums.split(" "), songs });

const SONG_KEYS = {
  axis:[0,0,2,9,11,4,0,7,9,5], axisMinor:[4,0,2,6,9,1,11,5,2,0], three:[2,0,9,9,9,7,9,7,2,4],
  blues:[10,0,4,4,5,9,4,7,9,4], doowop:[9,8,8,0,5,0,8,7,3,9], jazz:[0,10,0,0,8,2,3,5,10,10],
  mixo:[2,2,4,7,0,5,4,9,2,7], andalusian:[9,10,2,9,6,0,2,9,9,1], pachelbel:[2,3,0,11,0,0,0,0,9,9],
};

const CATEGORIES = [
  { group:"Genre", items:[
    { name:"Pop", progs:["axis","doowop","axisMinor","pachelbel"] },
    { name:"Rock", progs:["three","mixo","axis"] },
    { name:"Blues", progs:["blues","three"] },
    { name:"Jazz", progs:["jazz","doowop"] },
    { name:"Folk / Country", progs:["three","axis","doowop","dorian"] },
    { name:"Punk", progs:["three","axis"] },
    { name:"Funk / R&B", progs:["dorian","axis","mixo"] },
    { name:"Metal", progs:["phrygian","axisMinor","mixo","flamenco"] },
    { name:"Cinematic", progs:["lydian","aeolian","pachelbel","flamenco"] } ]},
  { group:"Emotion", items:[
    { name:"Happy", progs:["axis","three","doowop"] },
    { name:"Sad", progs:["axisMinor","andalusian"] },
    { name:"Nostalgic", progs:["doowop","pachelbel"] },
    { name:"Hopeful", progs:["pachelbel","axis","lydian"] },
    { name:"Dark / Tense", progs:["andalusian","axisMinor","phrygian","flamenco"] },
    { name:"Epic", progs:["mixo","axisMinor","pachelbel"] },
    { name:"Romantic", progs:["jazz","doowop"] },
    { name:"Dreamy", progs:["lydian","dorian","pachelbel"] },
    { name:"Melancholic", progs:["aeolian","andalusian","axisMinor"] } ]},
];

/* ===== colour-move songs ===== */
const SEC_SONGS = {
  "V/vi":{ why:"The dominant of the relative minor — it drags the ear sideways before landing home.", songs:["Creep — Radiohead (the B major)","Oh! Darling — The Beatles","All of Me — jazz standard (E7 → Am)"] },
  "V/V":{ why:"A dominant of the dominant — doubles the pull into V.", songs:["Take the 'A' Train — Duke Ellington","Hey Good Lookin' — Hank Williams","Sweet Georgia Brown — chained dominants"] },
  "V/IV":{ why:"The tonic grows a ♭7 and tips into IV — the oldest move in blues and gospel.", songs:["Something — The Beatles (C → C7 → F)","Hey Jude — The Beatles (F7 into B♭)","Every 12-bar blues, bar 4"] },
  "V/ii":{ why:"Sets up ii, so the ii–V–I that follows lands twice as hard.", songs:["All of Me — jazz standard (A7 → Dm)","Georgia on My Mind — Hoagy Carmichael","Sweet Georgia Brown"] },
  default:{ why:"A dominant a fifth above its target — borrowed tension, quickly resolved.", songs:["Sweet Georgia Brown — a whole chain of them","Salty Dog Blues — ragtime dominant cycle"] },
};
const PAR_SONGS = {
  IV:{ why:"IV → iv, borrowed from the parallel minor — the classic bittersweet fade home.", songs:["Creep — Radiohead (C → Cm)","In My Life — The Beatles","Sleepwalk — Santo & Johnny"] },
  I:{ why:"I → i, full mode mixture — daylight to shadow on the same root.", songs:["Norwegian Wood — The Beatles (E → Em)","While My Guitar Gently Weeps — Am verses, A-major bridge"] },
  i:{ why:"i → I, the Picardy third — a minor song allowed to end in the light.", songs:["And I Love Her — The Beatles (major final chord)","countless Bach chorales"] },
  V:{ why:"V → v softens the dominant — modal, folky, less insistent.", songs:["the Mixolydian shading behind much folk-rock"] },
  vi:{ why:"vi → VI, a chromatic-mediant lift — sudden film-score glow.", songs:["Beach Boys harmony and Bond scores live here"] },
  default:{ why:"Same root, opposite quality — colour borrowed from the parallel key.", songs:["swap it in and trust your ear"] },
};

/* ===== structures (name, tip) + plans ("Sec|nums|reps|note") ===== */
const mkPlan = rows => rows.map(r => {
  const [sec, nums, reps, note] = r.split("|");
  return { sec, nums: /^(LOOP|HALF1|HALF2|HOLD1)$/.test(nums) ? nums : nums.split(" "),
    reps: reps ? +reps : 1, note: note || null };
});
const STRUCTURES = {}, PLANS = {};
const defStruct = (pid, list) => { STRUCTURES[pid] = list.map(x => ({ name:x[0], tip:x[1] })); PLANS[pid] = list.map(x => mkPlan(x[2])); };

defStruct("axis", [
 ["Radio pop","Keep the loop running throughout, but start verses on vi (vi–IV–I–V) and choruses on I — the chorus then lands as an arrival.",
  ["Intro|LOOP|1|instrumental","Verse 1|vi IV I V|2|the loop rotated to start on vi","Pre-chorus|IV V|2|hold the V into the chorus","Chorus|LOOP|2|","Verse 2|vi IV I V|2|","Pre-chorus|IV V|2|","Chorus|LOOP|2|","Bridge|vi IV|2|strip the arrangement back","Final chorus|LOOP|2|lift the melody, add harmonies"]],
 ["Loop and strip","Give the verse only half the loop so the chorus feels harmonically wider without adding new chords.",
  ["Verse 1|I V|4|half the loop — keep it small","Chorus|LOOP|2|the full loop arrives here","Verse 2|I V|4|","Chorus|LOOP|2|","Middle 8|vi IV V V|1|sit on V to set up the return","Double chorus|LOOP|4|"]],
 ["Anthem build","Same four chords, arranged in layers — the structure is dynamics, not harmony.",
  ["Intro|I|1|drone or pad, held","Verse 1|LOOP|2|sparse — voice + one instrument","Verse 2|LOOP|2|add drums","Chorus|LOOP|2|","Verse 3|LOOP|2|","Chorus|LOOP|2|","Breakdown|vi IV|2|drop to almost nothing","Final chorus|LOOP|2|biggest arrangement; consider stepping the whole loop up a tone"]],
]);
defStruct("axisMinor", [
 ["Quiet–loud","The Zombie template: harmony never changes, texture does.",
  ["Verse 1|i bVI|4|fingerpicked / clean","Chorus|LOOP|2|full band","Verse 2|i bVI|4|","Chorus|LOOP|2|","Bridge|bVI bVII|2|","Chorus|LOOP|2|out on the loop, fading or hard stop on i"]],
 ["Brooding pop","Rotate the loop to start the chorus on ♭VI for a lift without leaving the four chords.",
  ["Verse 1|LOOP|2|","Verse 2|LOOP|2|","Chorus|bVI bIII bVII i|2|same chords, rotated to start on ♭VI — a lift without new harmony","Verse 3|LOOP|2|","Chorus|bVI bIII bVII i|2|","Bridge|bVI|1|stripped, held","Chorus|bVI bIII bVII i|2|"]],
]);
const BLUES12 = "I7 I7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7", BLUES12Q = "I7 IV7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7";
defStruct("blues", [
 ["12-bar AAB","Solos take whole 12-bar choruses over the same changes. Add a V7 pickup in bar 12 to relaunch.",
  [`Verse 1 (12 bars)|${BLUES12}|1|lyric: line A (1–4) · line A again (5–8) · answer B (9–12); bar 12's V7 is the turnaround`,`Verse 2 (12 bars)|${BLUES12}|1|new lyric, same changes`,`Solo choruses|${BLUES12}|2|`,`Final verse|${BLUES12.replace(/V7$/,"I7")}|1|end bar 12 on I7 to close`]],
 ["Quick change","The classic Chuck Berry variation — it stops the first four bars sitting still.",
  [`Verse (12 bars, quick change)|${BLUES12Q}|1|IV7 in bar 2 — the Chuck Berry move`,`Verse 2|${BLUES12Q}|1|`,`Solo choruses|${BLUES12Q}|2|`,`Final verse|${BLUES12Q.replace(/V7$/,"I7")}|1|`]],
]);
defStruct("three", [
 ["Verse–refrain","Hold I longer than feels comfortable, then snap IV–V into the refrain.",
  ["Verse 1|I I IV V|2|sit on I longer than feels comfortable","Refrain|IV V I I|1|title line lands here","Verse 2|I I IV V|2|","Refrain|IV V I I|1|","Solo|I I IV V|2|over the verse changes","Refrain|IV V I I|2|"]],
 ["Call and response","Three chords means the hook has to live in the rhythm and the vocal, not the harmony.",
  ["Riff intro|I|1|rhythm is the hook","Verse|I IV|2|call and response vocal","Chorus|IV V I I|2|","Verse|I IV|2|","Chorus|IV V I I|2|","Breakdown|I|1|drums + vocal only","Out-chorus|IV V I I|2|"]],
]);
defStruct("doowop", [
 ["Loop ballad","Stand by Me shape: the loop never breaks except at the middle 8, which parks on IV then V to set up the return.",
  ["Intro|LOOP|1|","Verse 1|LOOP|2|","Verse 2|LOOP|2|","Middle 8|IV IV V V|1|park on IV, then hold V to relaunch","Verse 3|LOOP|2|","Tag|LOOP|2|repeat the title, fade or ritard"]],
 ["Modern pop reuse","The '50s loop reads as sincere and nostalgic under a contemporary beat — Perfect does exactly this.",
  ["Verse|LOOP|2|","Pre-chorus|ii V|2|","Chorus|LOOP|2|","Verse|LOOP|2|","Pre-chorus|ii V|2|","Chorus|LOOP|2|","Bridge|vi IV|2|","Final chorus|LOOP|2|"]],
]);
defStruct("jazz", [
 ["32-bar AABA","The bridge is where secondary dominants earn their keep — toggle them on and follow the gold arrows.",
  ["A (bars 1–8)|ii V I vi|2|","A (bars 9–16)|ii V I vi|2|","B — bridge (17–24)|III7 VI7 II7 V7|1|dominant cycle: each chord is the V of the next — watch the gold arrows chain","A (bars 25–32)|ii V I vi|2|32-bar AABA head; solos repeat the whole form"]],
 ["Bossa vamp","Keep the ii–V as a two-bar vamp for intros and endings.",
  ["Intro vamp|ii V|4|","Head|LOOP|4|","Solos|LOOP|1|open — repeat until done","Head out|LOOP|2|","Tag|ii V I I|3|tag the last phrase three times to end"]],
]);
defStruct("mixo", [
 ["Riff rock","Sweet Home Alabama shape: the riff IS the song — structure comes from what sits on top.",
  ["Intro riff|I bVII IV IV|2|","Verse|I bVII IV IV|2|vocal over the riff","Chorus|IV IV I bVII|2|lift by landing on IV first","Solo|I bVII IV IV|2|","Verse|I bVII IV IV|2|","Double chorus|IV IV I bVII|4|","Riff out|I bVII IV IV|1|repeat and fade"]],
 ["One-chord verse","Saving ♭VII for the pre-chorus makes the borrowed chord an event rather than wallpaper.",
  ["Verse|I|1|one-chord vamp — groove carries it","Pre-chorus|bVII IV|2|the borrowed ♭VII arrives as an event","Chorus|I bVII IV IV|2|","Verse|I|1|","Pre-chorus|bVII IV|2|","Chorus|I bVII IV IV|2|","Outro jam|I bVII IV IV|1|extended, solos trading"]],
]);
defStruct("andalusian", [
 ["Descent and release","Happy Together shape: minor descent in the verse, major daylight in the chorus.",
  ["Verse|LOOP|2|the full descent, twice","Chorus|bIII bVII i V|2|flip into the relative major for daylight","Verse|LOOP|2|","Chorus|bIII bVII i V|2|","Solo|LOOP|2|over the descent","Chorus|bIII bVII i V|2|"]],
 ["Vamp noir","Let the V chord ring unresolved at section ends — the pull back to i is the hook.",
  ["Intro|i|1|held, atmospheric","Verse|LOOP|2|let the V ring unresolved at the end of each pass","Refrain|LOOP|1|land hard on V","Verse|LOOP|2|","Breakdown|V|1|V7, suspended — the pull back to i is the hook","Final verse|LOOP|2|"]],
]);
defStruct("pachelbel", [
 ["Through-line ballad","The 8-chord cycle is one full verse. Don't change the chords — change the register and density.",
  ["Intro|LOOP|1|instrumental cycle","Verse 1|LOOP|1|","Verse 2|LOOP|1|","Chorus|LOOP|1|same cycle — melody up, arrangement denser","Verse 3|LOOP|1|","Chorus|LOOP|1|","Instrumental|LOOP|1|","Final chorus|LOOP|1|"]],
 ["Escape bridge","After so much sequence, any chord outside the cycle sounds enormous — spend it on the bridge.",
  ["Verse|LOOP|2|","Chorus|LOOP|1|","Bridge|ii IV ii V|1|first chords outside the cycle — after all that sequence, ii sounds enormous","Final choruses|LOOP|2|"]],
]);

const UNIVERSAL = [
 ["Storyteller (strophic)","Folk and country narrative form — no chorus at all. The loop never changes; the story does.",
  ["Intro|LOOP|1|instrumental","Verse 1|LOOP|2|","Verse 2|LOOP|2|","Instrumental|LOOP|1|","Verse 3|LOOP|2|","Final verse|LOOP|2|return to the opening image","Outro|HOLD1|1|let the tonic ring out"]],
 ["Slow-burn ballad","Everything about restraint until the last chorus — dynamics do the storytelling.",
  ["Intro|HOLD1|1|held — piano or pad only","Verse 1|LOOP|2|minimal","Chorus|LOOP|1|still restrained","Verse 2|LOOP|2|add one element","Chorus|LOOP|2|","Middle 8|HALF2|2|the back half of the loop, stripped bare","Final chorus|LOOP|2|full arrangement at last","Outro|HOLD1|1|back to where it started"]],
 ["Pop-punk sprint","Under three minutes. Verses on half the loop keep the chorus feeling like a payoff.",
  ["Intro|LOOP|2|full speed, guitars only then drums in","Verse 1|HALF1|4|","Chorus|LOOP|2|","Verse 2|HALF1|4|","Chorus|LOOP|2|","Bridge|HALF2|2|half-time feel — same chords, half the speed","Double chorus|LOOP|4|gang vocals on the last pass"]],
 ["Dance build","Club architecture: tension on a fragment of the loop, release on the whole thing.",
  ["Intro|HOLD1|2|groove on one chord, filtered","Build|HALF1|4|rising filter / snare roll","Drop|LOOP|4|full loop, full energy","Break|HOLD1|2|strip to almost silence","Build|HALF1|4|","Drop|LOOP|4|","Outro|HOLD1|2|filter back down"]],
 ["AABA classic","Two statements, a contrasting middle, and home again — the pre-rock standard form.",
  ["A|LOOP|2|","A|LOOP|2|same music, second lyric","B — the middle|HALF2|2|contrast from the loop's back half; end poised to fall home","A|LOOP|2|home again — often the first lyric returns"]],
].map(x => ({ name:x[0], tip:x[1], plan: mkPlan(x[2]) }));

const LETTER_WORD = { I:"intro", V:"verse", P:"pre-chorus", C:"chorus", B:"bridge", S:"solo",
  R:"refrain", T:"tag", O:"outro", U:"build", D:"drop", K:"break", A:"A section", H:"head" };
function letterFor(sec) {
  const s = sec.toLowerCase();
  for (const [k, L] of [["pre","P"],["chorus","C"],["intro","I"],["verse","V"],["bridge","B"],["middle","B"],
    ["solo","S"],["instrumental","S"],["refrain","R"],["tag","T"],["build","U"],["drop","D"],["break","K"],
    ["outro","O"],["out","O"],["head","H"]]) if (s.includes(k)) return L;
  return sec[0].toUpperCase();
}

/* ===== rhythm + drums ===== */
const PATTERNS = {};
[
["pop","Campfire pop strum",">-DU-UDU","the universal acoustic pattern — miss the beat-2 down, let it ring"],
["drive","Brooding drive",">-D-DUDU","heavier front, busier back half — leans into the minor"],
["rock8","Straight-eight rock",">DDD>DDD","all down-strums, accents on 1 and 3 — punk energy comes from the wrist"],
["shuffle","Shuffle",">UDUDUDU","long-short swung eighths — the engine of every 12-bar",1],
["sway12","12/8 sway",">UDU>UDU","slow triplet lilt — Stand by Me lives here",1],
["fourbar","Four-to-the-bar","D-D-D-D-","Freddie Green comping — even quarters, swing implied not stated",1],
["push","Pushed rock",">-DUU-D-","the chord change lands early on the 'and' — that push is the swagger"],
["latin","Latin clip",">-DUD-DU","clipped and percussive — mute the strings between strums"],
["arp","Slow arpeggio pulse","D-U-D-U-","gentle alternation — or pick through the chord tones instead"],
["quarters","Straight quarters","D-D-D-D-","metronomic — the best pattern for learning the changes"],
["skank","Reggae skank","-U-U-U-U","all off-beats, everything else muted — instant island"],
["ballad","Sparse ballad",">---D---","two hits a bar — space is the arrangement"],
["boomchick","Country boom-chick",">-DU>-DU","pick the bass note on 1 and 3 if you can — chord answers on 2 and 4"],
["busy8","Constant eighths","DUDUDUDU","surf and indie jangle — the accents live in your wrist, not the pattern"],
["charleston","Charleston","D--U----","beat 1 and the 'and' of 2, then silence — the great jazz comping rhythm"],
["tresillo","Tresillo (3+3+2)",">--D--D-","the Cuban cell behind reggaeton and half of modern pop"],
["halftime","Half-time rock","D--->-DU","the big accent waits for beat 3 — everything feels twice as heavy"],
["stomp","Four-beat stomp",">->->->-","accented quarters — glam-rock floor stomp"],
["bossa","Bossa brush","D-U--U-U","gentle and syncopated — thumb the bass, brush the rest"],
["funk","Funk scratch","D-U--UD-","ghost the rests with muted scratches — the groove is in what you don't voice"],
["drone","Whole-note wash",">-------","one strum, let it drone — for pads, ambience and doom"],
["waltz","Waltz (3/4)",">-D-D-","one-two-three, strong on one — three beats to the bar"],
["slowwaltz","Slow waltz",">---D-","just beats one and three — stately, lots of air"],
["waltzpick","Flowing waltz","DUDUDU","constant 3/4 eighths — works beautifully picked through the chord"],
["countrywaltz","Country waltz",">-DUDU","bass note on one, brushed answers after — Tennessee Waltz territory"],
["mazurka","Mazurka","D->-D-","3/4 with the accent displaced onto two — instantly old-world"],
["quickwaltz","Quick waltz",">DDDDD","driving downstrokes in three — Viennese momentum, folk-punk at speed"],
["jig68","6/8 roll",">UUDUU","two lilting groups of three — folk ballads and sea shanties"],
["waltzsway","Jazz waltz","D-DUDU","3/4 with a swung lilt — My Favorite Things territory",1],
].forEach(([id, name, pat, desc, swing]) =>
  PATTERNS[id] = { name, pattern: pat.split(""), desc, swing: !!swing });

const PATTERN_DEFAULT = { axis:"pop", axisMinor:"drive", three:"rock8", blues:"shuffle",
  doowop:"sway12", jazz:"fourbar", mixo:"push", andalusian:"latin", pachelbel:"arp",
  dorian:"latin", lydian:"arp", phrygian:"drive", aeolian:"pop" };
const BPM_DEFAULT = { axis:96, axisMinor:84, three:140, blues:92, doowop:66, jazz:120,
  mixo:112, andalusian:104, pachelbel:72,
  dorian:100, lydian:84, phrygian:128, aeolian:92 };

const DRUMS = {};
[
["off","No drums",null],
// 4/4 — eight eighth-note steps
["rock","Rock backbeat","KH H SH H KH H SH H"],
["pop","Pop punch","KH H SH KH H KH SH H"],
["four","Four-on-the-floor","K H KS H K H KS H"],
["shuffle","Shuffle backbeat","K H S H K H S H"],
["train","Train beat","KS S S S KS S S S"],
["halftime","Half-time","KH H H H SH H H H"],
["driving","Driving eighths","KH KH SH KH KH KH SH KH"],
["funk","Funk groove","KH H SKH H H KH SH H"],
["disco","Disco","KH H KSH H KH H KSH H"],
["boombap","Hip-hop boom-bap","KH H SH H H KH SH H"],
["breakbeat","Breakbeat","KH H SH KH H KSH H SH"],
["rnb","R&B swing","KH H SH H KH H SKH H"],
["motown","Motown backbeat","KH SH KSH SH KH SH KSH SH"],
["reggae","Reggae one-drop",". H . H KSH H . H"],
["ska","Ska upbeat","K SH . SH K SH . SH"],
["bossa","Bossa nova","KH H H SH H KH SH H"],
["samba","Samba","KSH H KH SH KSH H KH SH"],
["tresillo","Tresillo (3-3-2)","KH H H KH H H KH H"],
["surf","Surf","KH H SH KH KH H SH H"],
["punk","Punk d-beat","KH SH KH SH KH SH KH SH"],
["newwave","New wave","K H SH H KH H SH H"],
["anthem","Anthem","KH H SH H KH KH SH H"],
["stomp","Stomp-clap","K K SH . K K SH ."],
["march","March","K H SH H K H SH H"],
["twostep","Country two-step","KS H S H KS H S H"],
["ballad","Ballad (sparse)","K . . . SH . . ."],
// 3/4 — six steps
["waltzkit","Waltz kit (3/4)","K . SH . SH ."],
["jazzwaltz","Jazz waltz (3/4)","KH H SH H SH H"],
["waltzballad","Waltz ballad (3/4)","K H H SH H H"],
// 6/8 — six steps
["kit68","6/8 kit","K H H SH H H"],
["shuffle68","6/8 shuffle","KH H H SH H H"],
["march68","6/8 march","K H SH H SH H"],
].forEach(([id, name, pat]) =>
  DRUMS[id] = { name, pattern: pat ? pat.split(" ").map(s => s === "." ? "" : s) : null });

/* ===== sounds ===== */
const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);
function makeNoise(ctx) {
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function env(ctx, t, vol, attack, decay, exp = true, dest) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  if (exp) g.gain.exponentialRampToValueAtTime(0.0006, t + decay);
  g.connect(dest || ctx.destination);
  return g;
}
function clickSound(ctx, t, sym, dest) {
  const o = ctx.createOscillator();
  o.type = "square";
  o.frequency.value = sym === ">" ? 1660 : sym === "U" ? 830 : 1108;
  o.connect(env(ctx, t, sym === ">" ? 0.09 : sym === "U" ? 0.035 : 0.055, 0.001, 0.05, true, dest));
  o.start(t); o.stop(t + 0.06);
  if (sym === ">") {
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.setValueAtTime(160, t);
    o2.frequency.exponentialRampToValueAtTime(60, t + 0.09);
    o2.connect(env(ctx, t, 0.22, 0.001, 0.12, true, dest));
    o2.start(t); o2.stop(t + 0.13);
  }
}
function drumSound(ctx, t, ch, noise, dest) {
  if (ch === "K") {
    // body: sine with a fast pitch drop; plus a short click transient for the beater
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(165, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.09);
    o.connect(env(ctx, t, 0.62, 0.002, 0.22, true, dest));
    o.start(t); o.stop(t + 0.24);
    const click = ctx.createBufferSource(); click.buffer = noise;
    const cf = ctx.createBiquadFilter(); cf.type = "lowpass"; cf.frequency.value = 3200;
    click.connect(cf); cf.connect(env(ctx, t, 0.22, 0.001, 0.02, true, dest));
    click.start(t); click.stop(t + 0.03);
  } else if (ch === "S") {
    // two-tone shell + a bright noise crack + a slightly longer wire rattle
    [175, 330].forEach((hz, k) => {
      const o = ctx.createOscillator();
      o.type = "triangle"; o.frequency.value = hz;
      o.connect(env(ctx, t, k ? 0.09 : 0.14, 0.001, 0.09, true, dest));
      o.start(t); o.stop(t + 0.1);
    });
    const crack = ctx.createBufferSource(); crack.buffer = noise;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1600;
    crack.connect(hp); hp.connect(env(ctx, t, 0.3, 0.001, 0.055, true, dest));
    crack.start(t); crack.stop(t + 0.06);
    const rattle = ctx.createBufferSource(); rattle.buffer = noise;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 3200; bp.Q.value = 0.6;
    rattle.connect(bp); bp.connect(env(ctx, t, 0.14, 0.002, 0.16, true, dest));
    rattle.start(t); rattle.stop(t + 0.17);
  } else if (ch === "H") {
    // metallic hat: high-passed noise + a ring of inharmonic square partials
    const n = ctx.createBufferSource(); n.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7800;
    n.connect(f); f.connect(env(ctx, t, 0.11, 0.001, 0.04, true, dest));
    n.start(t); n.stop(t + 0.05);
    const ring = ctx.createGain(); ring.gain.value = 0.02;
    const rhp = ctx.createBiquadFilter(); rhp.type = "highpass"; rhp.frequency.value = 8500;
    ring.connect(rhp); rhp.connect(env(ctx, t, 0.5, 0.001, 0.035, true, dest));
    [2400, 3000, 4700].forEach(hz => {
      const o = ctx.createOscillator(); o.type = "square"; o.frequency.value = hz;
      o.connect(ring); o.start(t); o.stop(t + 0.045);
    });
  }
}
const chordIvs = q => ({ dom:[0,4,7,10], maj7:[0,4,7,11], m7:[0,3,7,10],
  maj9:[0,4,7,11,14], m9:[0,3,7,10,14], dom9:[0,4,7,10,14],
  add9:[0,4,7,14], madd9:[0,3,7,14], six:[0,4,7,9], m6:[0,3,7,9],
  sus2:[0,2,7], sus4:[0,5,7], dom7sus4:[0,5,7,10] }[q] || [0, q === "min" ? 3 : 4, 7]);
// Karplus–Strong plucked string: a short noise burst excites a tuned feedback
// delay line with a damping low-pass — the physical model of a real plucked
// string, far closer to an acoustic guitar than a filtered sawtooth.
function ksPluck(ctx, t, freq, dur, vol, bright, dest) {
  const period = 1 / freq;
  const delay = ctx.createDelay(0.05);
  delay.delayTime.value = period;
  const damp = ctx.createBiquadFilter();
  damp.type = "lowpass"; damp.frequency.value = Math.min(7000, 1400 + bright); damp.Q.value = 0.2;
  const fb = ctx.createGain();
  // feedback per round-trip, tuned so the string decays to silence over ~dur. HARD CAP well below 1:
  // a real Web-Audio delay+filter loop has a little excess gain (fractional-delay interpolation, the
  // biquad), so a feedback near unity doesn't decay — it self-oscillates into a piercing squeal that
  // the limiter then pins at full scale. Measured stable up to ~0.85; 0.8 keeps a safe margin.
  fb.gain.value = Math.min(0.8, Math.pow(0.0008, period / Math.max(0.12, dur)));
  delay.connect(damp); damp.connect(fb); fb.connect(delay);
  const out = ctx.createGain();
  out.gain.setValueAtTime(vol, t);
  out.gain.setValueAtTime(vol, t + dur * 0.8);
  out.gain.exponentialRampToValueAtTime(0.0004, t + dur + 0.12);
  delay.connect(out); out.connect(dest || ctx.destination);
  // excitation: a burst of noise one period long
  const nlen = Math.max(2, Math.ceil(ctx.sampleRate * period));
  const buf = ctx.createBuffer(1, nlen, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < nlen; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const ig = ctx.createGain(); ig.gain.value = 1;
  src.connect(ig); ig.connect(delay);
  src.start(t); src.stop(t + period + 0.02);
}
function strumChord(ctx, t, chord, sym, dest) {
  const base = 48 + chord.root;
  let notes = [base - 12, ...chordIvs(chord.quality).map(x => base + x)];
  if (sym === "U") notes = notes.slice(2).reverse();
  const vol = sym === ">" ? 0.16 : sym === "U" ? 0.09 : 0.12;
  const dur = sym === ">" ? 1.4 : 0.9;
  const bright = sym === ">" ? 2600 : sym === "U" ? 1400 : 1900;
  notes.forEach((mid, j) => {
    const tt = t + j * (sym === "U" ? 0.010 : 0.016);   // roll the pick across the strings
    ksPluck(ctx, tt, midiHz(mid), dur, vol, bright, dest);
  });
}
// sustained bowed/blown voice (strings, brass, reeds, pads) for the offline fallback
function padVoice(ctx, t, mid, sym, slotDur, dest) {
  const freq = midiHz(mid), vol = (sym === ">" ? 0.06 : 0.045);
  const dur = Math.max(0.2, slotDur * 0.95);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.06);
  g.gain.setValueAtTime(vol, t + Math.max(0.08, dur - 0.06));
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05);
  const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 2400; f.Q.value = 0.5;
  f.connect(g).connect(dest || ctx.destination);
  [[1, 0.5, "sawtooth"], [1.004, 0.5, "sawtooth"], [2, 0.12, "sine"]].forEach(([mult, amp, type]) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq * mult;
    const pg = ctx.createGain(); pg.gain.value = amp; o.connect(pg).connect(f);
    o.start(t); o.stop(t + dur + 0.1);
  });
}
function playHit(ctx, t, chord, sym, instr, slotDur, dest) {
  const fam = gmFam(instr);
  if (fam === "pluck") return strumChord(ctx, t, chord, sym, dest);
  const iv = chordIvs(chord.quality), rootMid = 48 + chord.root;
  if (fam === "bass") {
    const o = ctx.createOscillator();
    o.frequency.value = midiHz(36 + chord.root + (sym === "U" ? 7 : 0));
    o.type = "sawtooth";
    const f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 440; f.Q.value = 1;
    o.connect(f); f.connect(env(ctx, t, sym === ">" ? 0.30 : 0.20, 0.008, 0.5, true, dest));
    o.start(t); o.stop(t + 0.6);
    return;
  }
  const notes = sym === "U" ? iv.slice(1).map(x => rootMid + x) : [rootMid - 12, ...iv.map(x => rootMid + x)];
  notes.forEach((mid, j) => {
    if (fam === "organ") {
      [1, 2, 3].forEach((h, hi) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine"; o.frequency.value = midiHz(mid) * h;
        const vol = (sym === ">" ? 0.055 : 0.04) / (hi + 1);
        const dur = Math.max(0.14, slotDur * 0.92);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.02);
        g.gain.setValueAtTime(vol, t + Math.max(0.05, dur - 0.04));
        g.gain.linearRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(dest || ctx.destination);
        o.start(t); o.stop(t + dur + 0.05);
      });
    } else if (fam === "pad") {
      padVoice(ctx, t, mid, sym, slotDur, dest);
    } else { // keys / mallet — fundamental + partials, hammer attack (mallet decays quicker)
      const freq = midiHz(mid);
      const vol = sym === ">" ? 0.10 : sym === "U" ? 0.055 : 0.08;
      const tt = t + j * 0.003, dur = fam === "mallet" ? 0.45 : (sym === ">" ? 1.1 : 0.8);
      [[1, 1, "triangle"], [2, 0.28, "sine"], [4, 0.07, "sine"]].forEach(([h, hv, type]) => {
        const o = ctx.createOscillator();
        o.type = type; o.frequency.value = freq * h;
        o.connect(env(ctx, tt, vol * hv, 0.004, dur / (h > 1 ? 2.5 : 1), true, dest));
        o.start(tt); o.stop(tt + dur + 0.1);
      });
    }
  });
}

/* ===== realistic samples (real recorded instruments, loaded when online) ===== */
// FluidR3 GM soundfont MP3s via jsDelivr (CORS-enabled). Every General MIDI instrument is
// available; we fetch a few natural-note anchors per instrument and pitch-shift to cover the
// rest, so downloads stay small (loaded lazily only for the instrument you pick) and the
// service worker caches them for offline use. Anything that fails (offline / blocked) falls
// back to a synth voice picked by the instrument's family.
const SF_BASE = "https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@master/FluidR3_GM/";
const SF_NAT = { 0:"C", 2:"D", 4:"E", 5:"F", 7:"G", 9:"A", 11:"B" };
// The instrument catalogue, grouped for the dropdowns. Each entry: [GM folder key, label, synth-family].
// families: pluck | keys | organ | bass | pad | mallet — used for the offline synth fallback.
const GM_CATS = [
  ["Pianos & keys", [
    ["acoustic_grand_piano","Grand piano","keys"], ["bright_acoustic_piano","Bright piano","keys"],
    ["electric_grand_piano","Electric grand","keys"], ["honkytonk_piano","Honky-tonk","keys"],
    ["electric_piano_1","Electric piano","keys"], ["electric_piano_2","Electric piano 2","keys"],
    ["harpsichord","Harpsichord","pluck"], ["clavinet","Clavinet","keys"]]],
  ["Mallets & bells", [
    ["celesta","Celesta","mallet"], ["glockenspiel","Glockenspiel","mallet"], ["music_box","Music box","mallet"],
    ["vibraphone","Vibraphone","mallet"], ["marimba","Marimba","mallet"], ["xylophone","Xylophone","mallet"],
    ["tubular_bells","Tubular bells","mallet"], ["dulcimer","Dulcimer","pluck"]]],
  ["Organs & accordion", [
    ["drawbar_organ","Drawbar organ","organ"], ["percussive_organ","Percussive organ","organ"],
    ["rock_organ","Rock organ","organ"], ["church_organ","Church organ","organ"],
    ["reed_organ","Reed organ","organ"], ["accordion","Accordion","organ"],
    ["harmonica","Harmonica","organ"], ["tango_accordion","Tango accordion","organ"]]],
  ["Guitars", [
    ["acoustic_guitar_nylon","Nylon guitar","pluck"], ["acoustic_guitar_steel","Steel guitar","pluck"],
    ["electric_guitar_jazz","Jazz guitar","pluck"], ["electric_guitar_clean","Clean electric","pluck"],
    ["electric_guitar_muted","Muted electric","pluck"], ["overdriven_guitar","Overdrive guitar","pluck"],
    ["distortion_guitar","Distortion guitar","pluck"]]],
  ["Basses", [
    ["acoustic_bass","Acoustic bass","bass"], ["electric_bass_finger","Finger bass","bass"],
    ["electric_bass_pick","Pick bass","bass"], ["fretless_bass","Fretless bass","bass"],
    ["slap_bass_1","Slap bass","bass"], ["synth_bass_1","Synth bass","bass"], ["contrabass","Double bass","bass"]]],
  ["Strings & harp", [
    ["violin","Violin","pad"], ["viola","Viola","pad"], ["cello","Cello","pad"],
    ["tremolo_strings","Tremolo strings","pad"], ["pizzicato_strings","Pizzicato strings","pluck"],
    ["orchestral_harp","Harp","pluck"], ["timpani","Timpani","mallet"]]],
  ["Ensemble & choir", [
    ["string_ensemble_1","String ensemble","pad"], ["string_ensemble_2","Slow strings","pad"],
    ["synth_strings_1","Synth strings","pad"], ["choir_aahs","Choir “aahs”","pad"],
    ["voice_oohs","Voice “oohs”","pad"], ["synth_choir","Synth voice","pad"], ["orchestra_hit","Orchestra hit","keys"]]],
  ["Brass", [
    ["trumpet","Trumpet","pad"], ["trombone","Trombone","pad"], ["tuba","Tuba","bass"],
    ["muted_trumpet","Muted trumpet","pad"], ["french_horn","French horn","pad"],
    ["brass_section","Brass section","pad"], ["synth_brass_1","Synth brass","pad"]]],
  ["Reeds", [
    ["soprano_sax","Soprano sax","pad"], ["alto_sax","Alto sax","pad"], ["tenor_sax","Tenor sax","pad"],
    ["baritone_sax","Baritone sax","pad"], ["oboe","Oboe","pad"], ["english_horn","English horn","pad"],
    ["bassoon","Bassoon","pad"], ["clarinet","Clarinet","pad"]]],
  ["Pipes", [
    ["piccolo","Piccolo","pad"], ["flute","Flute","pad"], ["recorder","Recorder","pad"],
    ["pan_flute","Pan flute","pad"], ["whistle","Whistle","pad"], ["ocarina","Ocarina","pad"]]],
  ["Synth lead & pad", [
    ["lead_1_square","Square lead","keys"], ["lead_2_sawtooth","Saw lead","keys"],
    ["lead_3_calliope","Calliope lead","pad"], ["lead_8_bass__lead","Bass+lead","keys"],
    ["pad_1_new_age","New-age pad","pad"], ["pad_2_warm","Warm pad","pad"],
    ["pad_4_choir","Choir pad","pad"], ["pad_7_halo","Halo pad","pad"]]],
  ["World", [
    ["sitar","Sitar","pluck"], ["banjo","Banjo","pluck"], ["shamisen","Shamisen","pluck"],
    ["koto","Koto","pluck"], ["kalimba","Kalimba","mallet"], ["shanai","Shanai","pad"],
    ["steel_drums","Steel drums","mallet"], ["agogo","Agogo","mallet"]]],
];
const GM_FAM = {}, GM_LABEL = {};
GM_CATS.forEach(([, list]) => list.forEach(([k, label, fam]) => { GM_FAM[k] = fam; GM_LABEL[k] = label; }));
const isGM = k => GM_FAM[k] !== undefined;
// old sketch/state values → GM keys
const LEGACY_INSTR = { guitar:"acoustic_guitar_steel", piano:"acoustic_grand_piano",
  organ:"drawbar_organ", bass:"acoustic_bass", dbass:"contrabass" };
const gmKey = k => LEGACY_INSTR[k] || k;
const gmFam = k => GM_FAM[gmKey(k)] || "keys";
// natural-note anchors: basses low, everything else spanning chord + melody range. Denser than a
// bare octave grid (gaps of ~3-5 semitones, not ~7) so notes are pitch-shifted only a little from
// the nearest real sample — the less a sample is stretched, the more natural the instrument sounds.
const anchorsFor = k => gmFam(k) === "bass" ? [24,31,36,41,45,48] : [43,48,53,57,62,67,72,76,81,84];
// offline synth-family fallback for the melody lead → a LEAD_SPECS voice
const FAM_LEAD = { pluck:"pluck", keys:"ep", organ:"organ", bass:"pluck", pad:"strings", mallet:"bell" };

const sfName = m => SF_NAT[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const sfRawCache = {};                                    // "folder:midi" → Promise<ArrayBuffer>
function sfFetch(folder, midi) {
  const ck = folder + ":" + midi;
  if (sfRawCache[ck]) return sfRawCache[ck];
  const url = SF_BASE + folder + "-mp3/" + sfName(midi) + ".mp3";
  sfRawCache[ck] = fetch(url).then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status));
  sfRawCache[ck].catch(() => { delete sfRawCache[ck]; });   // let a later attempt retry
  return sfRawCache[ck];
}
function sfPrefetch(k) { const f = gmKey(k); if (isGM(f)) anchorsFor(f).forEach(m => sfFetch(f, m).catch(() => {})); }
// a sampler bound to one AudioContext: decodes the cached MP3s and plays the nearest anchor repitched
function makeSampler(ctx) {
  const decoded = {}, done = {}, loading = {};
  const load = k => {
    const f = gmKey(k);
    if (!isGM(f) || done[f]) return Promise.resolve();
    if (loading[f]) return loading[f];
    const anc = anchorsFor(f);
    loading[f] = Promise.all(anc.map(m =>
      sfFetch(f, m).then(ab => ctx.decodeAudioData(ab.slice(0)))
        .then(buf => { decoded[f + ":" + m] = buf; }).catch(() => {})
    )).then(() => { done[f] = anc.some(m => decoded[f + ":" + m]); });
    return loading[f];
  };
  const ready = k => !!done[gmKey(k)];
  // nearest usable anchor to a target note. Repitching is ASYMMETRIC: shifting a sample down just
  // makes it lower and warmer, but shifting it up raises the pitch and thins it — past a little way
  // it becomes the piercing squeal. So allow a big down-shift (a chord's bass note sits an octave
  // below the lowest anchor) but only a small up-shift; notes needing more defer to the synth voice.
  const MAX_UP = 7, MAX_DOWN = 16;   // semitones of repitch allowed above / below an anchor
  const nearest = (k, midi) => {
    const f = gmKey(k);
    let best = null;
    for (const m of anchorsFor(f)) {
      const buf = decoded[f + ":" + m]; if (!buf) continue;
      const shift = midi - m;                              // + = repitch up (the squeal direction)
      if (shift > MAX_UP || shift < -MAX_DOWN) continue;   // outside the safe range for this anchor
      const d = Math.abs(shift); if (!best || d < best.d) best = { m, d, buf };
    }
    return best;
  };
  const covers = (k, midi) => !!nearest(k, midi);
  const play = (k, t, midi, gain, dur, dest) => {
    const best = nearest(k, midi);
    if (!best) return false;
    const src = ctx.createBufferSource(); src.buffer = best.buf;
    src.playbackRate.value = Math.pow(2, (midi - best.m) / 12);
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t);
    const end = t + (dur || 1.2);
    g.gain.setValueAtTime(gain, Math.max(t, end - 0.12));
    g.gain.exponentialRampToValueAtTime(0.0006, end + 0.08);
    src.connect(g).connect(dest || ctx.destination);
    src.start(t); src.stop(end + 0.15);
    return true;
  };
  return { load, ready, play, covers };
}
// note voicing for the sampler, mirroring the synth voicings, by instrument family
function sampleVoicing(chord, sym, fam) {
  const iv = chordIvs(chord.quality), root = chord.root;
  if (fam === "bass") return { notes: [36 + root + (sym === "U" ? 7 : 0)], roll: 0.03 };
  const base = 48 + root;
  const notes = sym === "U" ? iv.slice(1).map(x => base + x) : [base - 12, ...iv.map(x => base + x)];
  return { notes, roll: fam === "pluck" ? (sym === "U" ? 0.010 : 0.016) : 0.004 };
}
function playSampled(sampler, instr, ctx, t, chord, sym, slotDur, dest) {
  if (!sampler || !sampler.ready(instr)) return false;
  const fam = gmFam(instr);
  const { notes, roll } = sampleVoicing(chord, sym, fam);
  // if any voiced note lacks a nearby loaded anchor (samples still loading), play the whole chord
  // on the synth rather than repitching a distant anchor into a shrill artifact for part of it
  if (!notes.every(mid => sampler.covers(instr, mid))) return false;
  const g = sym === ">" ? 0.5 : sym === "U" ? 0.3 : 0.4;
  const dur = sym === ">" ? 1.6 : fam === "pluck" ? 1.0 : Math.max(0.5, slotDur * 2.5);
  notes.forEach((mid, j) => sampler.play(instr, t + j * roll, mid, g, dur, dest));
  return true;
}
// play one melody note as a real sample if the chosen lead voice is a GM instrument that's loaded
function playLeadSampled(sampler, kind, t, midi, dur, dest) {
  if (!sampler || !isGM(kind) || !sampler.ready(kind)) return false;
  return sampler.play(kind, t, midi, 0.55, dur, dest);   // false if no loaded anchor is close → synth covers this note
}
// a convolution reverb bus: input node feeding a dry path + a wet (reverb) path
function makeReverb(ctx, dest, seconds = 1.6, mix = 0.16) {
  const rate = ctx.sampleRate, len = Math.max(1, Math.floor(rate * seconds));
  const ir = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  const conv = ctx.createConvolver(); conv.buffer = ir;
  const wet = ctx.createGain(); wet.gain.value = mix;
  const input = ctx.createGain(); input.gain.value = 1;
  input.connect(dest);                    // dry
  input.connect(conv); conv.connect(wet); wet.connect(dest);   // wet
  return input;
}

// Melody lead voices — chosen from the "Lead" dropdown. Each spec is a stack of
// partials (oscillator type · harmonic multiple · relative level) plus an
// envelope: atk = attack, rel = release tail, vol = peak, sus = sustain level
// (0 = percussive decay, >0 = held tone). lp adds a low-pass; vib adds vibrato.
const LEAD_VOICES = [
  ["synth","Synth lead"], ["sine","Soft sine"], ["triangle","Mellow triangle"],
  ["square","Chiptune square"], ["saw","Bright saw"], ["flute","Flute"],
  ["pluck","Pluck"], ["bell","Bell"], ["musicbox","Music box"],
  ["ep","Electric piano"], ["strings","Strings"], ["brass","Brass"],
  ["organ","Organ"], ["voice","Voice (ah)"], ["glass","Glass pad"], ["whistle","Whistle"],
];
const LEAD_SPECS = {
  synth:    { parts:[["triangle",1,1],["sine",2,0.3]],                 atk:0.012, rel:0.13, vol:0.12, sus:0.6 },
  sine:     { parts:[["sine",1,1],["sine",2,0.1]],                     atk:0.02,  rel:0.18, vol:0.13, sus:0.7 },
  triangle: { parts:[["triangle",1,1]],                               atk:0.01,  rel:0.15, vol:0.13, sus:0.65 },
  square:   { parts:[["square",1,0.6]],                               atk:0.005, rel:0.07, vol:0.085, sus:0.55, lp:2600 },
  saw:      { parts:[["sawtooth",1,0.6]],                             atk:0.008, rel:0.13, vol:0.085, sus:0.6, lp:3200 },
  flute:    { parts:[["sine",1,1],["sine",2,0.05]],                   atk:0.05,  rel:0.15, vol:0.15, sus:0.8, vib:true },
  pluck:    { parts:[["triangle",1,1],["sine",3,0.15]],               atk:0.003, rel:0.3,  vol:0.14, sus:0 },
  bell:     { parts:[["sine",1,1],["sine",2.76,0.5],["sine",5.4,0.2]],atk:0.002, rel:0.6,  vol:0.11, sus:0 },
  musicbox: { parts:[["sine",1,1],["sine",4,0.35],["sine",8,0.08]],   atk:0.002, rel:0.45, vol:0.1,  sus:0 },
  ep:       { parts:[["sine",1,1],["triangle",2,0.25],["sine",5,0.06]],atk:0.004,rel:0.4,  vol:0.13, sus:0.15 },
  strings:  { parts:[["sawtooth",1,0.5],["sawtooth",1.004,0.5]],      atk:0.1,   rel:0.28, vol:0.08, sus:0.85, lp:2400, vib:true },
  brass:    { parts:[["sawtooth",1,0.7],["square",1,0.1]],            atk:0.035, rel:0.15, vol:0.085, sus:0.7, lp:2800 },
  organ:    { parts:[["sine",1,1],["sine",2,0.5],["sine",3,0.3],["sine",4,0.15]], atk:0.006, rel:0.06, vol:0.075, sus:0.9 },
  voice:    { parts:[["sawtooth",1,0.4],["sine",1,0.45]],             atk:0.06,  rel:0.18, vol:0.1,  sus:0.8, lp:1500, vib:true },
  glass:    { parts:[["sine",1,1],["sine",3,0.2],["triangle",2,0.15]],atk:0.07,  rel:0.32, vol:0.1,  sus:0.75 },
  whistle:  { parts:[["sine",1,1],["sine",2,0.02]],                   atk:0.03,  rel:0.1,  vol:0.12, sus:0.85, vib:true },
};
// legato=true softens the attack and lets the note ring past its slot so a
// moving line flows together instead of re-articulating on every eighth.
function leadNote(ctx, t, midi, dur, kind = "synth", legato = false, dest) {
  const V = LEAD_SPECS[kind] || LEAD_SPECS.synth;
  const hz = midiHz(midi);
  const atk = legato ? Math.max(V.atk, 0.03) : V.atk;
  const rel = legato ? V.rel * 1.6 : V.rel;
  const peak = V.vol, sus = peak * V.sus;
  const t1 = t + atk;                          // reach peak
  const t2 = Math.max(t1 + 0.01, t + dur);     // sustain end / release start
  const t3 = t2 + rel;                         // silence
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t1);
  if (V.sus > 0) {
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, sus), Math.min(t2, t1 + 0.12));
    g.gain.setValueAtTime(Math.max(0.0002, sus), t2);
  }
  g.gain.exponentialRampToValueAtTime(0.0006, t3);
  g.connect(dest || ctx.destination);
  let out = g;
  if (V.lp) {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = V.lp; f.Q.value = 0.7;
    f.connect(g); out = f;
  }
  let lfoG = null;
  if (V.vib) {
    const lfo = ctx.createOscillator(); lfoG = ctx.createGain();
    lfo.type = "sine"; lfo.frequency.value = 5.2; lfoG.gain.value = hz * 0.006;
    lfo.connect(lfoG); lfo.start(t + atk); lfo.stop(t3 + 0.05);
  }
  V.parts.forEach(([type, mult, amp]) => {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = hz * mult;
    if (lfoG) lfoG.connect(o.frequency);
    const pg = ctx.createGain(); pg.gain.value = amp;
    o.connect(pg).connect(out);
    o.start(t); o.stop(t3 + 0.05);
  });
}

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

// One measure worth of notation. `mel` = [{on, dur, mids:[...]}] (onset eighth, duration in eighths).
function NotationScore({ measures, instr, meloBeats, perSystem = 4 }) {
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
  // draw just the noteheads (+ accidentals + ledgers) for one onset; return nodes + geometry.
  // colOf(midi) picks the ink per note (layer B → violet); stemCol colours stems/beams/flags.
  const drawHeads = (mids, x, dur, clef, colOf = () => INK) => {
    const nodes = [];
    const yFn = clef === "bass" ? yBass : yTreble;
    const topLine = clef === "bass" ? 26 : 38, botLine = clef === "bass" ? 18 : 30;
    const open = dur >= 4;                                     // half/whole = hollow head
    const filled = !open;
    let minY = Infinity, maxY = -Infinity;
    mids.forEach(m => {
      const s = stepOfMidi(m), cy = yFn(s), acc = accOfMidi(m), col = colOf(m);
      minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
      for (let k = topLine + 2; k <= s; k += 2) nodes.push(<line key={"lg"+uid++} x1={x - 9} y1={yFn(k)} x2={x + 9} y2={yFn(k)} stroke={col} strokeWidth="1" />);
      for (let k = botLine - 2; k >= s; k -= 2) nodes.push(<line key={"lg"+uid++} x1={x - 9} y1={yFn(k)} x2={x + 9} y2={yFn(k)} stroke={col} strokeWidth="1" />);
      nodes.push(<ellipse key={"nh"+uid++} cx={x} cy={cy} rx={rx} ry={ry} transform={`rotate(-18 ${x} ${cy})`}
        fill={filled ? col : "none"} stroke={col} strokeWidth={open ? 1.5 : 0} />);
      if (dur >= 8) nodes.push(<ellipse key={"nw"+uid++} cx={x} cy={cy} rx={rx * 0.5} ry={ry * 0.85} fill="#171E28" />);
      if (acc) nodes.push(<text key={"ac"+uid++} x={x - rx - 4} y={cy + 4} textAnchor="end" fill={col} fontSize="14" fontFamily="serif">{acc < 0 ? "♭" : "♯"}</text>);
    });
    return { nodes, minY, maxY, steps: mids.map(stepOfMidi), x };
  };
  // single onset with its own stem + flag (used for lone notes and non-melody stacks)
  const drawNotes = (mids, x, dur, clef, colOf = () => INK, stemCol = INK) => {
    const g = drawHeads(mids, x, dur, clef, colOf);
    const nodes = g.nodes;
    if (dur < 8) {                                            // stem (skip whole notes)
      const up = stemUpFor(g.steps, clef);
      const sx = up ? x + rx - 0.5 : x - rx + 0.5;
      const y1 = up ? g.minY : g.maxY, y2 = up ? g.maxY - STEM : g.minY + STEM;
      nodes.push(<line key={"st"+uid++} x1={sx} y1={y1} x2={sx} y2={y2} stroke={stemCol} strokeWidth="1.4" />);
      if (dur < 2) nodes.push(<path key={"fl"+uid++} d={up                       // lone eighth → flag
        ? `M ${sx} ${y2} q 8 3 6 12` : `M ${sx} ${y2} q 8 -3 6 -12`} fill="none" stroke={stemCol} strokeWidth="1.6" />);
    }
    return nodes;
  };
  // a whole bar of melody, beaming consecutive eighth-notes within a beat instead of flagging each
  const drawMelody = (events, inner, span, clef) => {
    const nodes = [];
    if (!events || !events.length) return nodes;
    const xOf = on => inner + (on / meloBeats) * span;
    const colOf = ev => m => (ev.bMids && ev.bMids.has(m)) ? LAY : INK;   // per-note ink
    const evCol = ev => (ev.mids.length && ev.mids.every(m => ev.bMids && ev.bMids.has(m))) ? LAY : INK;
    const geo = events.map(ev => ({ g: drawHeads(ev.mids, xOf(ev.on), ev.dur, clef, colOf(ev)), ev }));
    geo.forEach(e => nodes.push(...e.g.nodes));
    // beam groups: an eighth on a beat (even eighth index) + the eighth on its off-beat, both dur 1
    const byOn = {}; geo.forEach((e, i) => { byOn[e.ev.on] = i; });
    const beamed = new Set();
    const groups = [];
    for (let k = 0; 2 * k + 1 < meloBeats; k++) {
      const a = byOn[2 * k], b = byOn[2 * k + 1];
      if (a != null && b != null && geo[a].ev.dur === 1 && geo[b].ev.dur === 1) {
        groups.push([a, b]); beamed.add(a); beamed.add(b);
      }
    }
    // lone notes: own stem + flag (violet when the note is 2nd-melody only)
    geo.forEach((e, i) => {
      if (beamed.has(i) || e.ev.dur >= 8) return;
      const up = stemUpFor(e.g.steps, clef), sc = evCol(e.ev);
      const sx = up ? e.g.x + rx - 0.5 : e.g.x - rx + 0.5;
      const y1 = up ? e.g.minY : e.g.maxY, y2 = up ? e.g.maxY - STEM : e.g.minY + STEM;
      nodes.push(<line key={"st"+uid++} x1={sx} y1={y1} x2={sx} y2={y2} stroke={sc} strokeWidth="1.4" />);
      if (e.ev.dur < 2) nodes.push(<path key={"fl"+uid++} d={up
        ? `M ${sx} ${y2} q 8 3 6 12` : `M ${sx} ${y2} q 8 -3 6 -12`} fill="none" stroke={sc} strokeWidth="1.6" />);
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
      nodes.push(<line key={"bm"+uid++} x1={sxs[0]} y1={beamY} x2={sxs[sxs.length - 1]} y2={beamY} stroke={sc} strokeWidth={LG * 0.5} strokeLinecap="butt" />);
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
      const num = meloBeats % 2 === 0 ? meloBeats / 2 : meloBeats, den = meloBeats % 2 === 0 ? 4 : 8;
      parts.push(<text key="tsn" x={clefW + 2} y={yTreble(36)} textAnchor="middle" fill={INK} fontSize="15" fontWeight="700" fontFamily="serif">{num}</text>);
      parts.push(<text key="tsd" x={clefW + 2} y={yTreble(31)} textAnchor="middle" fill={INK} fontSize="15" fontWeight="700" fontFamily="serif">{den}</text>);
    }
    // barlines + measures
    const topY = yTreble(38), botY = piano ? yBass(18) : tabY(5);
    parts.push(<line key="bl0" x1={clefW} y1={topY} x2={clefW} y2={botY} stroke={FAINT} strokeWidth="1" />);
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

// section-type accent colours for the song write-out grouping
const SEC_COL = { V:"#54B79D", C:"#E0B85A", B:"#B7A6E0", P:"#7FB4D8", I:"#8B94A3", O:"#8B94A3", L:"#8B94A3" };

/* ===== midi export ===== */
const vlq = n => { const b = [n & 0x7f]; while ((n >>= 7)) b.unshift((n & 0x7f) | 0x80); return b; };
// meloCols (optional): flat list of eighth-columns aligned to bars × (beatsPerBar*2),
// each column a list of absolute MIDI note numbers. Runs of the same note across
// adjacent columns are merged into one held note (legato) so the exported line
// flows the way it plays.
function midiBytes(bpm, beatsPerBar, bars, drumPat, meloCols, meloCols2) {
  const T = 480, ev = (arr, dt, ...bytes) => arr.push(...vlq(dt), ...bytes);
  const trk = arr => {
    const body = [...arr, 0, 0xff, 0x2f, 0];
    return [0x4d,0x54,0x72,0x6b, (body.length>>>24)&255,(body.length>>>16)&255,(body.length>>>8)&255,body.length&255, ...body];
  };
  const uspq = Math.round(60000000 / bpm);
  const tempo = []; ev(tempo, 0, 0xff, 0x51, 3, (uspq>>16)&255, (uspq>>8)&255, uspq&255);
  const chordsT = [];
  bars.forEach(b => {
    const notes = [36 + b.chord.root - 12, ...chordIvs(b.chord.quality).map(x => 60 + b.chord.root + x)];
    notes.forEach((n, i) => ev(chordsT, i ? 0 : 0, 0x90, n, 78));
    notes.forEach((n, i) => ev(chordsT, i ? 0 : beatsPerBar * T, 0x80, n, 0));
  });
  const drumsT = [];
  if (drumPat) {
    let pend = 0;
    for (let bar = 0; bar < bars.length; bar++) for (let s = 0; s < beatsPerBar * 2; s++) {
      const notes = [...(drumPat[s] || "")].map(c => c === "K" ? 36 : c === "S" ? 38 : 42);
      if (!notes.length) { pend += T / 2; continue; }
      notes.forEach((n, i) => ev(drumsT, i ? 0 : pend, 0x99, n, n === 42 ? 62 : 92));
      notes.forEach((n, i) => ev(drumsT, i ? 0 : 60, 0x89, n, 0));
      pend = T / 2 - 60;
    }
  }
  // build one melody track from its eighth-columns; each layer gets its own channel
  const buildMelo = (cols, chOn, chOff) => {
    const arr = []; let has = false;
    if (cols && cols.length) {
      const EI = T / 2, N = cols.length;                          // ticks per eighth
      const at = (i, note) => (cols[i] || []).includes(note);
      const evs = [];
      for (let i = 0; i < N; i++) for (const note of (cols[i] || [])) {
        if (i > 0 && at(i - 1, note)) continue;                   // continuation of a held note
        let run = 1;
        while (i + run < N && at(i + run, note)) run++;
        evs.push({ t: i * EI, on: 1, note });
        evs.push({ t: (i + run) * EI, on: 0, note });
      }
      has = evs.length > 0;
      evs.sort((a, b) => a.t - b.t || a.on - b.on);               // note-offs before note-ons at a tick
      let last = 0;
      for (const e of evs) { ev(arr, e.t - last, e.on ? chOn : chOff, e.note, e.on ? 92 : 0); last = e.t; }
    }
    return { arr, has };
  };
  const melA = buildMelo(meloCols, 0x91, 0x81);                   // layer A → channel 1
  const melB = buildMelo(meloCols2, 0x92, 0x82);                 // layer B → channel 2
  const nTrk = 2 + (drumPat ? 1 : 0) + (melA.has ? 1 : 0) + (melB.has ? 1 : 0);
  const head = [0x4d,0x54,0x68,0x64, 0,0,0,6, 0,1, 0, nTrk, (T>>8)&255, T&255];
  return new Uint8Array([...head, ...trk(tempo), ...trk(chordsT),
    ...(drumPat ? trk(drumsT) : []), ...(melA.has ? trk(melA.arr) : []), ...(melB.has ? trk(melB.arr) : [])]);
}

/* ===== midi import ===== */
// Parse a standard MIDI file and pull out the single most melodic track as a list
// of { midi, startE, durE } where positions are in eighth-notes. Chooses a track
// named "Melody" if present (the Tune Transcriber tags its line that way),
// otherwise the non-drum track with the most notes. Returns null on a bad file.
function parseMidiMelody(buf) {
  const d = new DataView(buf);
  let p = 0;
  const u32 = () => { const v = d.getUint32(p); p += 4; return v; };
  const u16 = () => { const v = d.getUint16(p); p += 2; return v; };
  const u8 = () => d.getUint8(p++);
  if (u32() !== 0x4d546864) return null;                 // "MThd"
  u32();                                                  // header length
  u16();                                                  // format
  const ntrk = u16();
  const ppq = u16();
  if (ppq <= 0) return null;                              // SMPTE division unsupported
  const tracks = [];
  for (let t = 0; t < ntrk && p < buf.byteLength; t++) {
    if (u32() !== 0x4d54726b) break;                     // "MTrk"
    const len = u32();
    const end = p + len;
    let tick = 0, status = 0, name = "";
    const open = {};                                       // "note" → startTick
    const notes = [];
    while (p < end) {
      let dt = 0, b;
      do { b = u8(); dt = (dt << 7) | (b & 0x7f); } while (b & 0x80);
      tick += dt;
      let ev = u8();
      if (ev < 0x80) { ev = status; p--; } else status = ev;
      const hi = ev & 0xf0, ch = ev & 0x0f;
      if (ev === 0xff) {                                   // meta
        const type = u8(); let ml = 0, mb;
        do { mb = u8(); ml = (ml << 7) | (mb & 0x7f); } while (mb & 0x80);
        if (type === 0x03) { let s = ""; for (let i = 0; i < ml; i++) s += String.fromCharCode(u8()); name = s; }
        else p += ml;
      } else if (ev === 0xf0 || ev === 0xf7) {             // sysex
        let sl = 0, sb; do { sb = u8(); sl = (sl << 7) | (sb & 0x7f); } while (sb & 0x80); p += sl;
      } else if (hi === 0x90 || hi === 0x80) {
        const note = u8(), vel = u8();
        if (hi === 0x90 && vel > 0) { if (open[note] == null) open[note] = tick; }
        else { const st = open[note]; if (st != null) { notes.push({ midi: note, startTick: st, durTick: Math.max(1, tick - st) }); delete open[note]; } }
      } else if (hi === 0xa0 || hi === 0xb0 || hi === 0xe0) { p += 2; }
      else if (hi === 0xc0 || hi === 0xd0) { p += 1; }
      else p = end;                                        // unknown — bail this track
    }
    p = end;
    tracks.push({ name, notes, drums: notes.length === 0 });
  }
  const named = tracks.find(t => /melody/i.test(t.name) && t.notes.length);
  const cand = named || tracks.filter(t => t.notes.length).sort((a, b) => b.notes.length - a.notes.length)[0];
  if (!cand || !cand.notes.length) return null;
  const eighth = ppq / 2;
  return cand.notes.map(n => ({
    midi: n.midi,
    startE: Math.round(n.startTick / eighth),
    durE: Math.max(1, Math.round(n.durTick / eighth)),
  })).sort((a, b) => a.startE - b.startE);
}

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

// the "strong" beat columns of a bar (every other eighth): [0,2,4,6] in 4/4
const qbeats = B => Array.from({ length: Math.ceil(B / 2) }, (_, i) => i * 2).filter(x => x < B);
const blankBars = (nBars, B) => Array.from({ length: nBars }, () => Array.from({ length: B }, () => []));
// lay a sequence of degrees onto given columns of one bar
const layBar = (B, cols, degs) => {
  const bar = Array.from({ length: B }, () => []);
  cols.forEach((c, i) => { if (i < degs.length && degs[i] != null && c < B) bar[c] = [wrap7(degs[i])]; });
  return bar;
};
const MELODY_PATTERNS = [
  { id:"arpUp", name:"Arpeggio ↑ (chord tones)",
    desc:"Climbs each bar's chord — root, 3rd, 5th, 7th — one note per beat. Follows the chords; the start note fills in over any out-of-key chord.",
    gen(u){ const Q = qbeats(u.B);
      return Array.from({ length:u.nBars }, (_, b) => {
        const g = u.chordDegs[b] == null ? u.start : u.chordDegs[b];
        return layBar(u.B, Q, [g, g+2, g+4, g+6]); }); } },
  { id:"arpDown", name:"Arpeggio ↓ (chord tones)",
    desc:"Falls through each bar's chord from the top down — 5th, 3rd, root. A gentler, more resolved shape than climbing.",
    gen(u){ const Q = qbeats(u.B);
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
    gen(u){ const Q = qbeats(u.B); let n = 0;
      return Array.from({ length:u.nBars }, () =>
        layBar(u.B, Q, Q.map(() => u.start + n++))); } },
  { id:"scaleDown", name:"Scale run ↓",
    desc:"A stepwise descent from your start note down the scale, running through the whole section.",
    gen(u){ const Q = qbeats(u.B); let n = 0;
      return Array.from({ length:u.nBars }, () =>
        layBar(u.B, Q, Q.map(() => u.start - n++))); } },
  { id:"wave", name:"Wave (up-and-down contour)",
    desc:"A smooth arch that rises a few steps then falls back, over and over — an easy, singable contour.",
    gen(u){ const Q = qbeats(u.B); const tri = [0,1,2,3,2,1]; let n = 0;
      return Array.from({ length:u.nBars }, () =>
        layBar(u.B, Q, Q.map(() => u.start + tri[n++ % tri.length]))); } },
  { id:"neighbor", name:"Neighbour tones",
    desc:"Decorates your start note with its upper and lower neighbours — note, step up, note, step down.",
    gen(u){ const Q = qbeats(u.B); const fig = [0,1,0,-1]; let n = 0;
      return Array.from({ length:u.nBars }, () =>
        layBar(u.B, Q, Q.map(() => u.start + fig[n++ % fig.length]))); } },
  { id:"pedal", name:"Pedal tone (repeated note)",
    desc:"Repeats your start note on every beat — a drone / chant to build tension against the moving chords.",
    gen(u){ const Q = qbeats(u.B);
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, Q.map(() => u.start))); } },
  { id:"callResp", name:"Call & response",
    desc:"A rising question in one bar answered by a falling reply in the next — the two-bar conversation that anchors most tunes.",
    gen(u){ const Q = qbeats(u.B);
      return Array.from({ length:u.nBars }, (_, b) =>
        b % 2 === 0 ? layBar(u.B, Q, [0,1,2,3].map(x => u.start + x))
                    : layBar(u.B, Q, [2,1,0,0].map(x => u.start + x))); } },
  { id:"aa", name:"AA — repeat the motif",
    desc:"States one short motif and repeats it in every bar. The most direct way to make a line stick.",
    gen(u){ const Q = qbeats(u.B); const A = [0,2,1,0];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, A.map(x => u.start + x))); } },
  { id:"ab", name:"AB — alternating motifs",
    desc:"Alternates a low motif (A) with a higher contrasting one (B), bar by bar — statement and counter-statement.",
    gen(u){ const Q = qbeats(u.B); const A = [0,2,1,0], B = [4,2,3,4];
      return Array.from({ length:u.nBars }, (_, b) =>
        layBar(u.B, Q, (b % 2 === 0 ? A : B).map(x => u.start + x))); } },
  { id:"aaba", name:"AABA — motif with a middle turn",
    desc:"Motif A three times with a contrasting B in the third bar — the classic 32-bar sentence in miniature.",
    gen(u){ const Q = qbeats(u.B); const A = [0,2,1,0], B = [4,3,2,4];
      return Array.from({ length:u.nBars }, (_, b) =>
        layBar(u.B, Q, (b % 4 === 2 ? B : A).map(x => u.start + x))); } },
  { id:"seqUp", name:"Ascending sequence",
    desc:"Takes one three-note figure and steps it up the scale a degree at a time each bar — builds lift and momentum.",
    gen(u){ const Q = qbeats(u.B); const fig = [0,1,2];
      return Array.from({ length:u.nBars }, (_, b) =>
        layBar(u.B, Q, fig.map(x => u.start + x + b))); } },
  { id:"seqDown", name:"Descending sequence",
    desc:"A three-note figure stepped down the scale each bar — an easing, settling motion toward resolution.",
    gen(u){ const Q = qbeats(u.B); const fig = [0,-1,-2];
      return Array.from({ length:u.nBars }, (_, b) =>
        layBar(u.B, Q, fig.map(x => u.start + x - b))); } },
  { id:"leaps", name:"Leaping (zig-zag)",
    desc:"Zig-zags between your start note and a note a fifth above — wide, angular intervals for a bolder hook.",
    gen(u){ const Q = qbeats(u.B); const fig = [0,4,0,4];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, fig.map(x => u.start + x))); } },
  { id:"qa", name:"Question & answer (resolves to tonic)",
    desc:"An antecedent phrase that rises and hangs, then a consequent that comes to rest on the tonic — a fully closed two-bar sentence.",
    gen(u){ const Q = qbeats(u.B);
      return Array.from({ length:u.nBars }, (_, b) =>
        b % 2 === 0 ? layBar(u.B, Q, [u.start, u.start+1, u.start+2, u.start+2])
                    : layBar(u.B, Q, [u.start+1, u.start-1, u.start, 0])); } },
  { id:"archTwo", name:"Two-bar arch",
    desc:"Rises across the first bar and falls back across the second — a broad, singable two-bar arch.",
    gen(u){ const Q = qbeats(u.B);
      return Array.from({ length:u.nBars }, (_, b) =>
        layBar(u.B, Q, (b % 2 === 0 ? [0,1,2,3] : [3,2,1,0]).map(x => u.start + x))); } },
  { id:"zigTight", name:"Tight zig-zag",
    desc:"Steps up and dips back on every beat — a busy, chattering close-interval line.",
    gen(u){ const Q = qbeats(u.B); const fig = [0,1,0,2];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, fig.map(x => u.start + x))); } },
  { id:"thirds", name:"Skipping thirds",
    desc:"Leaps up a third then steps back down, walking the line upward in gentle skips.",
    gen(u){ const Q = qbeats(u.B); const fig = [0,2,1,3];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, fig.map(x => u.start + x))); } },
  { id:"gapfill", name:"Leap & fill",
    desc:"Jumps up to a high note then fills the gap with a stepwise descent — a classic melodic shape.",
    gen(u){ const Q = qbeats(u.B); const fig = [4,3,2,1];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, fig.map(x => u.start + x))); } },
  { id:"penta", name:"Pentatonic hook",
    desc:"Stays on the five pentatonic degrees — the notes that sound good over anything — for a foolproof hook.",
    gen(u){ const Q = qbeats(u.B); const pent = [0,2,4,5,4,2,1,0]; let n = 0;
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, Q.map(() => u.start + pent[n++ % pent.length]))); } },
  { id:"hook", name:"High-to-low hook",
    desc:"Opens high and tumbles down to the tonic — an instantly memorable pop-hook shape.",
    gen(u){ const Q = qbeats(u.B); const fig = [4,4,2,0];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, fig.map(x => u.start + x))); } },
  { id:"pairs", name:"Repeated pairs",
    desc:"Says each note twice before moving on — a stuttering, insistent way to drill a hook in.",
    gen(u){ const Q = qbeats(u.B); const fig = [0,0,2,2];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, fig.map(x => u.start + x))); } },
  { id:"turn", name:"Turn (ornament)",
    desc:"Circles the start note — up, home, down, home — the ornamental 'turn' from classical melody.",
    gen(u){ const Q = qbeats(u.B); const fig = [1,0,-1,0];
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, fig.map(x => u.start + x))); } },
  { id:"fanfare", name:"Fanfare (chord leaps)",
    desc:"Bugle-call leaps around each bar's chord — root, fifth, third, fifth — bold and brassy.",
    gen(u){ const Q = qbeats(u.B);
      return Array.from({ length:u.nBars }, (_, b) => {
        const g = u.chordDegs[b] == null ? u.start : u.chordDegs[b];
        return layBar(u.B, Q, [g, g+4, g+2, g+4]); }); } },
  { id:"chordDrop", name:"Chord climb, scale fall",
    desc:"Climbs the bar's chord tones then eases back down the scale — outlines the harmony, then smooths it over.",
    gen(u){ const Q = qbeats(u.B);
      return Array.from({ length:u.nBars }, (_, b) => {
        const g = u.chordDegs[b] == null ? u.start : u.chordDegs[b];
        return layBar(u.B, Q, [g, g+2, g+4, g+3]); }); } },
  { id:"bluesy", name:"Bluesy lick",
    desc:"Curls around the third and fourth for a lazy, vocal blues inflection.",
    gen(u){ const Q = qbeats(u.B); const fig = [0,2,3,2];
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
    gen(u){ const Q = qbeats(u.B);
      return Array.from({ length:u.nBars }, (_, b) =>
        layBar(u.B, Q, (b % 2 === 0 ? [0,1,2,3] : [0,-1,-2,-3]).map(x => u.start + x))); } },
  { id:"cascade", name:"Cascade down",
    desc:"A stepwise tumble that restarts a little lower each bar — a long, settling cascade toward home.",
    gen(u){ const Q = qbeats(u.B);
      return Array.from({ length:u.nBars }, (_, b) => layBar(u.B, Q, [3,2,1,0].map(x => u.start + x - b))); } },
  { id:"seq4", name:"Four-bar climb",
    desc:"A short figure nudged up a step every bar — a long build that keeps rising across four bars.",
    gen(u){ const Q = qbeats(u.B); const fig = [0,2,1];
      return Array.from({ length:u.nBars }, (_, b) => layBar(u.B, Q, fig.map(x => u.start + x + (b % 4)))); } },
  { id:"qq", name:"Two questions, one answer",
    desc:"Two rising, unresolved phrases then a falling reply that finally lands — a three-part sentence.",
    gen(u){ const Q = qbeats(u.B);
      return Array.from({ length:u.nBars }, (_, b) =>
        b % 3 === 2 ? layBar(u.B, Q, [2,1,0,0].map(x => u.start + x))
                    : layBar(u.B, Q, [0,1,2,2].map(x => u.start + x))); } },
  { id:"climb", name:"Climb to a peak",
    desc:"Rises steadily across the whole section to a high point — one long crescendo of pitch.",
    gen(u){ const Q = qbeats(u.B); let n = 0; const total = Math.max(1, u.nBars * Q.length - 1);
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, Q.map(() => u.start + Math.round((n++ / total) * 6)))); } },
  { id:"drone5", name:"Fifth pedal",
    desc:"Holds the fifth of the key as a bright high drone on every beat — tension over the moving chords.",
    gen(u){ const Q = qbeats(u.B);
      return Array.from({ length:u.nBars }, () => layBar(u.B, Q, Q.map(() => u.start + 4))); } },
  { id:"waltzArp", name:"Waltz lilt",
    desc:"Three notes a bar lilting up the chord — made for 3/4 and 6/8, but lovely anywhere.",
    gen(u){ const Q = qbeats(u.B);
      return Array.from({ length:u.nBars }, (_, b) => {
        const g = u.chordDegs[b] == null ? u.start : u.chordDegs[b];
        return layBar(u.B, Q, [g, g+2, g+4]); }); } },
];

/* ===== app ===== */
export default function ProgressionWheel() {
  const [tonic, setTonic] = useState(0);
  const [genre, setGenre] = useState("Pop");
  const [emotion, setEmotion] = useState(null);
  const [mode, setMode] = useState(null);   // null = follow the loaded progression's own mode; else an override
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
  const [instr, setInstr] = useState("acoustic_guitar_steel");   // chord instrument (GM key)
  const [melInstr, setMelInstr] = useState("flute");        // melody lead voice — a real sampled instrument by default (synth id or GM key)
  const [legato, setLegato] = useState(true);               // merge/flow melody notes
  const [clickOn, setClickOn] = useState(false);            // metronome click on each hit (off by default)
  const [patSel, setPatSel] = useState({ key:"", id:"" });
  const [drum, setDrum] = useState("off");
  const [colour, setColour] = useState("triads");           // triads | sevenths
  const [force, setForce] = useState(null);                 // dice override of the progression
  const [sketches, setSketches] = useState(null);           // null = not loaded yet
  const [sketchName, setSketchName] = useState("");
  const [ioNote, setIoNote] = useState(null);               // save/export feedback
  const [contrast, setContrast] = useState({ id:"", sec:"C" }); // second loop for a section
  const [melos, setMelos] = useState({ progId:"", secs:{} }); // per-section melodies, chord-anchored
  const [openSecs, setOpenSecs] = useState({});             // which section melody grids are open
  const [melTab, setMelTab] = useState({});                 // per-section: "write" | "suggest"
  const [sugSel, setSugSel] = useState({});                 // per-section: { pat, start } suggested-melody picks
  const [showLand, setShowLand] = useState(false);          // landing-notes collapse
  const [curQ, setCurQ] = useState(null);                   // {sym, col} playhead in melody grids
  const [curInst, setCurInst] = useState(null);             // instance key currently playing
  const [order, setOrder] = useState({ key:"", list:null }); // reordered chord sequence (keys)
  const [reorder, setReorder] = useState(false);            // pill reorder mode on/off
  const [pillSel, setPillSel] = useState([]);               // selected pill indices (reorder mode)
  const [scoreInstr, setScoreInstr] = useState("piano");    // notation: piano | guitar
  const [showScore, setShowScore] = useState(false);        // notation panel collapse
  const [realSounds, setRealSounds] = useState(true);       // use real instrument samples when available
  const [melMove, setMelMove] = useState(false);            // melody grid: draw vs move mode
  const [melLayer, setMelLayer] = useState(0);              // which melody layer edits target: 0 = A, 1 = B
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
  const bpmRef = useRef(0), patRef = useRef([]), swingRef = useRef(false);
  const chordsRef = useRef({ list:[], seq:[] }), instrRef = useRef("guitar"), drumRef = useRef(null);
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

  const chords = useMemo(() => {
    const base = prog.numerals.map((n, bi) => {
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
    // trailing inserts (a chord duplicated/added after the last one) append at the end
    insList.filter(x => x.before >= base.length).forEach(x => emitInsert(x, base.length));
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
  }, [progId, tonic, edits, inserts, quals, removed, colour, order]);

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
  const duplicateChord = c => {   // add a copy right after — makes the progression longer
    const before = c.inserted ? c.insBefore : c.bi + 1;
    setInserts({ key: editKey, list: [...insList, { before, root: c.root, quality: c.quality, tag: c.name }] });
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
  const toggleReorder = () => { setReorder(v => !v); setPillSel([]); setFingerIdx(null); };

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
    const u = UNIVERSAL[+p[2]];
    return u ? { st: u, plan: u.plan } : null;
  }, [selStruct, progId]);

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
  const sections = useMemo(() => {
    const plan = structSel ? structSel.plan
      : [{ sec: "Loop", nums: "LOOP", reps: 1, note: null }];
    const insts = [], counts = {};
    let totalBars = 0;
    const bars = structSel ? [] : null;
    plan.forEach(row => {
      const L = letterFor(row.sec);
      const usedC = structSel && chords2 && contrast.sec === L;
      const cs = padEven(resolveWith(row.nums, structSel ? poolFor(L) : chords));
      const str = cs.map(c => c.name).join(cs.length > 6 ? "  |  " : " – ");
      const word = LETTER_WORD[L] || row.sec.toLowerCase();
      for (let r = 0; r < row.reps; r++) {
        counts[L] = (counts[L] || 0) + 1;
        const key = L + counts[L];
        insts.push({ key, base: L, word, cs, str, usedC, note: r === 0 ? row.note : null,
          nbars: cs.length, startBar: totalBars });
        totalBars += cs.length;
        if (bars) cs.forEach((c, mb) => bars.push({ chord: c, inst: key, word, mb }));
      }
    });
    return { insts, totalBars, bars };
  }, [structSel, chords, chords2, contrast.sec, tonic, progId, colour]);
  const structBars = sections.bars;

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
  bpmRef.current = effBpm; patRef.current = rhythm.pattern; swingRef.current = !!rhythm.swing;
  instrRef.current = instr; drumRef.current = DRUMS[drum].pattern; realRef.current = realSounds;
  clickRef.current = clickOn;
  const meloBeats = rhythm.pattern.length;                  // eighths per bar (6 in waltz time)
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
      return Array.from({ length: meloBeats }, (_, c) => (bar && bar[c] ? [...bar[c]] : []));
    });
  };
  const secMelos = useMemo(() => {
    const samePid = melos.progId === progId;
    const out = {};
    sections.insts.forEach(d => {
      const ids = d.cs.map(chordId);
      const saved = melos.secs[d.key];
      const bars = adaptBars(saved && saved.ids, saved && saved.bars, ids, samePid);
      const barsB = (saved && saved.barsB) ? adaptBars(saved.ids, saved.barsB, ids, samePid) : null;
      out[d.key] = { ids, bars, flat: bars.flat(),
        barsB, flatB: barsB ? barsB.flat() : null,
        instr: (saved && saved.instr) || null, instrB: (saved && saved.instrB) || null };
    });
    return out;
  }, [melos, progId, sections, meloBeats]);
  // measures for the staff notation: chord + melody events per bar, mirroring the MIDI flatten
  const scoreMeasures = useMemo(() => {
    const bars = (structBars && structBars.length) ? structBars : chords.map(c => ({ chord: c }));
    const melBase = (tonic > 6 ? 60 : 72) + tonic;
    const loopSec = secMelos.L1 || Object.values(secMelos)[0];
    // pull every note of one layer out independently by its own onset + held length
    const extract = cols => {
      if (!cols) return [];
      const on = (i, d) => (cols[i] || []).includes(d);
      const out = [];
      for (let i = 0; i < meloBeats; i++) for (const d of (cols[i] || [])) {
        if (i > 0 && on(i - 1, d)) continue;                    // only at the note's onset
        let run = 1; while (i + run < meloBeats && on(i + run, d)) run++;
        out.push({ on: i, dur: run, midi: melBase + scaleSemis[d] });
      }
      return out;
    };
    return bars.map((b, bi) => {
      const secm = b.inst != null ? secMelos[b.inst] : loopSec;
      const idx = b.inst != null ? b.mb : bi % ((secm && secm.bars.length) || 1);
      // BOTH melody layers (A + the optional 2nd melody B) land on the same stave
      const evA = extract(secm && secm.bars[idx]);
      const evB = extract(secm && secm.barsB && secm.barsB[idx]);
      // notes that share an onset AND length become one clean chord; differing rhythms stay separate
      const groups = {};
      const add = (e, layer) => { const k = e.on + "_" + e.dur;
        const g = groups[k] = groups[k] || { on: e.on, dur: e.dur, a: new Set(), b: new Set() };
        g[layer].add(e.midi); };
      evA.forEach(e => add(e, "a")); evB.forEach(e => add(e, "b"));
      const mel = Object.values(groups).sort((a, c) => a.on - c.on || a.dur - c.dur).map(g => ({
        on: g.on, dur: g.dur,
        mids: [...new Set([...g.a, ...g.b])].sort((x, y) => x - y),
        bMids: new Set([...g.b].filter(m => !g.a.has(m))),   // notes that are 2nd-melody only → violet
      }));
      return { chord: b.chord, name: b.chord.name, word: b.inst != null ? (b.mb === 0 ? b.word : null) : null, mel };
    });
  }, [structBars, chords, secMelos, tonic, meloBeats, scaleSemis]);
  const scoreHasMelody = scoreMeasures.some(m => m.mel.length);
  const scoreHasB = scoreMeasures.some(m => m.mel.some(ev => ev.bMids && ev.bMids.size));

  const dupBars = b => (b ? b.map(bar => bar.map(a => [...a])) : null);
  const barsOf = (sec, L) => (L ? sec.barsB : sec.bars);
  const flatOf = (sec, L) => (L ? (sec.flatB || []) : sec.flat);
  // second-layer default lead — a contrasting voice so B is audibly distinct from A out of the box
  const LAYER_B_INSTR = "ep";
  // write a section entry, keeping both layers in the current chord-id coordinates and preserving
  // the layer / instrument fields the caller isn't changing
  const putSec = (key, patch) => {
    const secs = melos.progId === progId ? melos.secs : {};
    const sec = secMelos[key], prev = secs[key] || {};
    const entry = {
      ids: sec ? sec.ids : prev.ids,
      bars:  "bars"   in patch ? patch.bars   : (sec ? dupBars(sec.bars)  : prev.bars || []),
      barsB: "barsB"  in patch ? patch.barsB  : (sec ? dupBars(sec.barsB) : prev.barsB || null),
      instr:  "instr"  in patch ? patch.instr  : (prev.instr  || null),
      instrB: "instrB" in patch ? patch.instrB : (prev.instrB || null),
    };
    setMelos({ progId, secs: { ...secs, [key]: entry } });
  };
  const copyMelody = (fromKey, toKey) => {
    const from = melos.progId === progId ? melos.secs[fromKey] : null;
    if (!from) return;
    setMelos({ progId, secs: { ...melos.secs, [toKey]: { ids: [...from.ids],
      bars: dupBars(from.bars), barsB: dupBars(from.barsB),
      instr: from.instr || null, instrB: from.instrB || null } } });
  };
  const addLayerB = key => {
    const sec = secMelos[key]; if (!sec || sec.barsB) return;
    putSec(key, { barsB: blankBars(sec.bars.length, meloBeats), instrB: LAYER_B_INSTR });
    setMelLayer(1);
  };
  const removeLayerB = key => {
    putSec(key, { barsB: null, instrB: null });
    setMelLayer(0);
    if (melSel.key === key && melSel.layer === 1) setMelSel({ key:"", layer:0, notes:{} });
  };
  const setSecInstr = (key, L, val) => putSec(key, L ? { instrB: val || null } : { instr: val || null });
  meloRef.current = { bySym: secMelos, scale: scaleSemis, tonic, melInstr, legato };
  const tapMelo = (sym, c, deg, L) => {
    const sec = secMelos[sym]; if (!sec) return;
    const bars = dupBars(barsOf(sec, L)); if (!bars) return;
    const cell = bars[Math.floor(c / meloBeats)][c % meloBeats];
    const at = cell.indexOf(deg);
    if (at >= 0) cell.splice(at, 1); else cell.push(deg);
    putSec(sym, L ? { barsB: bars } : { bars });
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
    putSec(key, layer ? { barsB: bars } : { bars });
    setSelFrom(key, layer, notes.map(n => ({ c: n.c + dc, deg: n.deg + dd })));
  };
  const nudgeMel = (dc, dd) => { if (melSel.key && Object.keys(melSel.notes).length) doMelMove(melSel.key, melSel.layer, melSel.notes, dc, dd); };
  const deleteMelSel = () => {
    const key = melSel.key, layer = melSel.layer, sec = secMelos[key];
    const notes = selNotesList();
    if (!sec || !notes.length) return;
    const bars = dupBars(barsOf(sec, layer)); if (!bars) return;
    notes.forEach(n => { const cell = bars[Math.floor(n.c / meloBeats)][n.c % meloBeats]; const at = cell.indexOf(n.deg); if (at >= 0) cell.splice(at, 1); });
    putSec(key, layer ? { barsB: bars } : { bars });
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
    putSec(key, layer ? { barsB: bars } : { bars });
    setSelFrom(key, layer, placed);
  };
  const cellFromPoint = (x, y) => {
    const el = typeof document !== "undefined" && document.elementFromPoint(x, y);
    if (!el || el.dataset == null || el.dataset.mk === undefined) return null;
    return { key: el.dataset.mk, c: +el.dataset.c, deg: +el.dataset.deg };
  };
  // Drag anywhere draws a selection box; drag a note that's ALREADY selected to move the group.
  const melDown = (e, key, c, deg, sec, L) => {
    if (!melMove) return;                                   // draw mode → onClick handles taps
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

  // write a suggested melody pattern onto a section's grid (overwrites what's there)
  const applyPattern = (d, sec, patId, start, L) => {
    const pat = MELODY_PATTERNS.find(p => p.id === patId) || MELODY_PATTERNS[0];
    const chordDegs = d.cs.map(c => {
      const i = scaleNotes.indexOf(((c.root % 12) + 12) % 12);
      return i >= 0 ? i : null;
    });
    const bars = pat.gen({ nBars: d.cs.length, B: meloBeats, start: start % scaleSemis.length, chordDegs });
    putSec(d.key, L ? { barsB: bars } : { bars });
    setMelTab({ ...melTab, [d.key]: "write" });   // reveal the result on the grid
  };
  const clearMelody = (d, sec, L) => {
    putSec(d.key, L ? { barsB: blankBars(d.cs.length, meloBeats) } : { bars: blankBars(d.cs.length, meloBeats) });
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
    setPlaying(false); setCurStep(-1); setCurBar(-1); setCurLabel(null); setCurQ(null); setCurInst(null);
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
    const limiter = ctx.createDynamicsCompressor();  // tame peaks so stacked samples don't clip
    // firm brick-wall limiting: a high ratio + short attack so stacked/ringing voices can't sum
    // past 0 dBFS and clip into harsh digital distortion (ratio 4 was too gentle to catch peaks)
    limiter.threshold.value = -5; limiter.knee.value = 3; limiter.ratio.value = 12;
    limiter.attack.value = 0.002; limiter.release.value = 0.14;
    limiter.connect(ctx.destination);
    const master = ctx.createGain(); master.gain.value = 0.65; master.connect(limiter);
    const music = makeReverb(ctx, master);           // reverb bus for pitched instruments + melody
    const sampler = makeSampler(ctx);                // real-instrument samples (load when online)
    const mi = (meloRef.current || {}).melInstr, leadKey = isGM(mi) ? mi : null;
    if (realRef.current) { sampler.load(instrRef.current); if (leadKey) sampler.load(leadKey); }
    const m = { ctx, master, music, sampler, lastInstr: instrRef.current, lastLead: leadKey,
      leadLoaded: new Set(leadKey ? [leadKey] : []),
      step: from * (patRef.current.length || 8), nextTime: ctx.currentTime + 0.1, noise: makeNoise(ctx) };
    m.timer = setInterval(() => {
      if (m.ctx.state === "suspended") m.ctx.resume();
      const eighth = 60 / bpmRef.current / 2;
      while (m.nextTime < m.ctx.currentTime + 0.1) {
        const L = patRef.current.length || 8, i = m.step % L;
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
        const sym = patRef.current[i] || "-";
        let t = m.nextTime;
        if (swingRef.current && i % 2 === 1) t += eighth * 0.33;
        const inst = instrRef.current;
        if (realRef.current && inst !== m.lastInstr) { m.sampler.load(inst); m.lastInstr = inst; }  // switched voice mid-play
        if (sym !== "-") {
          if (clickRef.current) clickSound(m.ctx, t, sym, m.master);   // metronome click, off by default
          if (chord) {
            const played = realRef.current && playSampled(m.sampler, inst, m.ctx, t, chord, sym, eighth, m.music);
            if (!played) playHit(m.ctx, t, chord, sym, inst, eighth, m.music);
          }
        }
        const dpat = drumRef.current;
        if (dpat && dpat[i]) for (const ch of dpat[i]) drumSound(m.ctx, t, ch, m.noise, m.master);
        const mel = meloRef.current;
        if (mel) {
          let sym = null, mb = 0;
          if (struct && struct.length) {
            const e = struct[structBar];   // same bar the chord engine chose (honours the loop window)
            sym = e.inst; mb = e.mb;
          } else if (mel.bySym.L1) {
            sym = "L1";
            const nb = mel.bySym.L1.bars.length || 1;
            mb = Math.floor(m.step / L) % nb;
          }
          const sec = sym && mel.bySym[sym];
          if (sec && (sec.flat.length || (sec.flatB && sec.flatB.length))) {
            const base = (mel.tonic > 6 ? 60 : 72) + mel.tonic;
            // play one melody layer's column with its own voice (falling back to the global lead)
            const playLayer = (flat, voice) => {
              if (!flat || !flat.length) return;
              const N = flat.length, col = (mb * L + i) % N;
              const leadKey = isGM(voice) ? voice : null;   // real-sample lead voice, if any
              if (realRef.current && leadKey && !m.leadLoaded.has(leadKey)) { m.sampler.load(leadKey); m.leadLoaded.add(leadKey); }
              (flat[col] || []).forEach(deg => {
                const held = mel.legato;
                const prev = flat[col - 1] || [];
                if (held && col > 0 && prev.includes(deg)) return; // still ringing from last slot
                let run = 1;
                if (held) while (col + run < N && (flat[col + run] || []).includes(deg)) run++;
                const midi = base + mel.scale[deg];
                const dur = held ? eighth * (run + 0.35) : eighth * 0.92;
                const sampled = realRef.current && playLeadSampled(m.sampler, voice, t, midi, dur, m.music);
                if (!sampled) {
                  // GM instrument with no loaded sample → its family's synth voice; else the synth spec itself
                  const kind = isGM(voice) ? FAM_LEAD[gmFam(voice)] : voice;
                  leadNote(m.ctx, t, midi, dur, kind, held, m.music);
                }
              });
            };
            playLayer(sec.flat, sec.instr || mel.melInstr);
            playLayer(sec.flatB, sec.instrB || mel.melInstr);
            const Nq = sec.flat.length || (sec.flatB ? sec.flatB.length : 0);
            const q = { sym, col: Nq ? (mb * L + i) % Nq : 0 };
            setTimeout(() => setCurQ(q), Math.max(0, (t - m.ctx.currentTime) * 1000));
          }
        }
        const delay = Math.max(0, (t - m.ctx.currentTime) * 1000);
        setTimeout(() => setCurStep(i), delay);
        if (i === 0) setTimeout(() => { setCurBar(pillIdx); setCurLabel(label); setCurInst(instNow); }, delay);
        m.step++; m.nextTime += eighth;
      }
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
    const pats = Object.keys(PATTERNS).filter(k => PATTERNS[k].pattern.length === 8);
    setPatSel({ key:id, id: pats[Math.floor(Math.random() * pats.length)] });
  };

  /* ---- midi export ---- */
  const exportMidi = () => {
    try {
      const bars = (structBars && structBars.length) ? structBars : chords.map(c => ({ chord:c }));
      // flatten the per-section melody grids into eighth-columns aligned to `bars`
      const melBase = (tonic > 6 ? 60 : 72) + tonic;
      const loopSec = secMelos.L1 || Object.values(secMelos)[0];
      const meloCols = [], meloColsB = [];
      let anyMelo = false, anyMeloB = false;
      bars.forEach((b, bi) => {
        const secm = b.inst != null ? secMelos[b.inst] : loopSec;
        const bi2 = b.inst != null ? b.mb : bi % ((secm && secm.bars.length) || 1);
        const barCols = secm && secm.bars[bi2];
        const barColsB = secm && secm.barsB && secm.barsB[bi2];
        for (let c = 0; c < meloBeats; c++) {
          const degs = (barCols && barCols[c]) || [];
          if (degs.length) anyMelo = true;
          meloCols.push(degs.map(d => melBase + scaleSemis[d]));
          const degsB = (barColsB && barColsB[c]) || [];
          if (degsB.length) anyMeloB = true;
          meloColsB.push(degsB.map(d => melBase + scaleSemis[d]));
        }
      });
      const bytes = midiBytes(effBpm, rhythm.pattern.length / 2, bars, DRUMS[drum].pattern,
        anyMelo ? meloCols : null, anyMeloB ? meloColsB : null);
      const url = URL.createObjectURL(new Blob([bytes], { type:"audio/midi" }));
      const a = document.createElement("a");
      a.href = url; a.download = "progression-wheel.mid";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setIoNote("MIDI exported — chords" + (DRUMS[drum].pattern ? " + drums" : "")
        + (anyMelo ? " + melody" : "") + (anyMeloB ? " + melody 2" : "") + " at " + effBpm + " bpm.");
    } catch (e) { setIoNote("Export failed in this viewer — try on desktop."); }
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
    events.forEach(ev => {
      const deg = degOf(ev.midi);
      for (let c = ev.startE; c < ev.startE + ev.durE; c++) {
        if (c >= totalCols) { dropped++; break; }
        bars[Math.floor(c / meloBeats)][c % meloBeats] = [deg];  // monophonic
        if (c === ev.startE) placed++;
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
  const saveSketch = async () => {
    const name = sketchName.trim() || keyLabel + " · " + prog.label;
    const s = { name, progId, tonic, genre, emotion, mode, colour, patId, drum, instr,
      bpm: effBpm, selStruct, contrast, edits: ovMap, inserts: insList,
      quals: qmap, removed: remList,
      order: order.key === editKey ? order.list : null };
    const list = [...(sketches || []).filter(x => x.name !== name), s];
    setSketches(list); setSketchName("");
    try {
      if (hasStore) await window.storage.set("pw-sketches", JSON.stringify(list));
      else if (hasLocal) window.localStorage.setItem("pw-sketches", JSON.stringify(list));
      setIoNote((hasStore || hasLocal) ? "Saved “" + name + "”." : "Saved for this session only.");
    } catch (e) { setIoNote("Saved for this session only."); }
  };
  const loadSketch = s => {
    setForce(s.progId); setTonic(s.tonic); setGenre(s.genre); setEmotion(s.emotion); setMode(s.mode || null);
    setColour(s.colour || "triads"); setInstr(s.instr); setDrum(s.drum);
    setPatSel({ key:s.progId, id:s.patId }); setBpmSt({ key:s.progId, val:s.bpm });
    setSelStruct(s.selStruct || ""); setContrast(s.contrast || { id:"", sec:"C" });
    const eKey = s.progId + ":" + s.tonic;
    setEdits({ key:eKey, map:s.edits || {} }); setInserts({ key:eKey, list:s.inserts || [] });
    setQuals({ key:eKey, map:s.quals || {} }); setRemoved({ key:eKey, list:s.removed || [] });
    setOrder(s.order ? { key:eKey, list:s.order } : { key:"", list:null }); setPillSel([]);
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
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,650&family=Archivo:wght@400;500;600;700&display=swap');
        .pw-root { min-height:100vh; background:#10151D; color:#EDE7DA; font-family:'Archivo',system-ui,sans-serif; padding:20px 14px 48px; display:flex; flex-direction:column; align-items:center; }
        .wrap { width:100%; max-width:720px; }
        h1 { font-family:'Fraunces',serif; font-weight:650; font-size:clamp(26px,5vw,36px); margin:0; letter-spacing:.01em; }
        .eyebrow { font-size:11px; letter-spacing:.22em; text-transform:uppercase; color:#8B94A3; margin-bottom:6px; }
        .sub { color:#8B94A3; font-size:14px; margin:6px 0 18px; line-height:1.45; }
        .panel { background:#171E28; border:1px solid #232C3A; border-radius:16px; padding:14px; margin-bottom:14px; }
        .panel.accent { background:#1C2A3B; border-color:#33475F; box-shadow:0 1px 0 rgba(255,255,255,.03) inset, 0 4px 18px rgba(0,0,0,.22); }
        .toptransport { position:sticky; top:0; z-index:6; display:flex; align-items:center; gap:12px; flex-wrap:wrap;
          background:rgba(16,21,29,.9); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
          border:1px solid #232C3A; border-radius:14px; padding:10px 12px; margin-bottom:14px; }
        .playbtn { background:${GOLD}; color:#1A130A; border:none; border-radius:11px; padding:10px 22px; font-size:15px;
          font-weight:700; font-family:inherit; cursor:pointer; letter-spacing:.01em; box-shadow:0 2px 10px rgba(229,181,84,.28); }
        .playbtn:hover { filter:brightness(1.06); }
        .playbtn.on { background:#E06A55; color:#2A0F0B; box-shadow:0 2px 10px rgba(224,106,85,.3); }
        .tplabel { font-size:13px; color:${GOLD}; font-weight:600; }
        .tplabel.dim { color:#8B94A3; font-weight:500; }
        .btn.on { border-color:#E06A55; color:#F2B8AC; }
        .row { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
        .lbl { font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#8B94A3; margin:8px 0 6px; }
        select { background:#10151D; color:#EDE7DA; border:1px solid #2A3442; border-radius:10px; padding:8px 10px; font-family:inherit; font-size:14px; max-width:100%; }
        .selrow { display:flex; gap:10px; }
        .selwrap { display:flex; flex-direction:column; gap:5px; flex:1; min-width:0; }
        .selwrap select { width:100%; }
        .btn { background:transparent; border:1px solid #4A5668; color:#EDE7DA; border-radius:10px; padding:8px 14px; font-size:13px; cursor:pointer; font-family:inherit; font-weight:500; }
        .btn:hover { border-color:#EAE2CC; }
        .mini { background:transparent; border:1px solid #4A5668; color:#EDE7DA; border-radius:7px; padding:2px 9px; font-size:12px; cursor:pointer; font-family:inherit; margin-left:4px; }
        .mini:hover { border-color:#EAE2CC; }
        .seg { display:inline-flex; border:1px solid #2A3442; border-radius:9px; overflow:hidden; }
        .seg button { background:#10151D; color:#8B94A3; border:none; padding:6px 11px; font-family:inherit; font-size:12.5px; cursor:pointer; }
        .seg button.on { background:#EAE2CC; color:#171E28; font-weight:600; }
        .txt { background:#10151D; color:#EDE7DA; border:1px solid #2A3442; border-radius:10px; padding:8px 10px; font-family:inherit; font-size:14px; flex:1; min-width:110px; }
        .tog { display:flex; align-items:center; gap:7px; font-size:13px; color:#B9C0CC; cursor:pointer; user-select:none; }
        .tog .sw { width:34px; height:19px; border-radius:999px; background:#2A3442; position:relative; transition:background .15s; flex:none; }
        .tog .sw::after { content:''; position:absolute; top:2.5px; left:3px; width:14px; height:14px; border-radius:50%; background:#8B94A3; transition:all .15s; }
        .tog.on .sw::after { left:17px; background:#EDE7DA; }
        .tog.lav.on .sw { background:#4A3F8A; } .tog.lav.on .sw::after { background:${LAV}; }
        .tog.gold.on .sw { background:#6B5320; } .tog.gold.on .sw::after { background:${GOLD}; }
        svg { max-width:100%; height:auto; display:block; }
        .wheelsvg { width:100%; }
        .dimlbl { fill:#5A6474; font-size:17px; font-family:'Archivo'; font-weight:500; }
        .dimlbl.sm { font-size:13px; }
        .progpath { fill:none; stroke:${PATH}; stroke-width:2.6; opacity:.92; stroke-dasharray:600; stroke-dashoffset:600; animation:draw .7s ease forwards; }
        @keyframes draw { to { stroke-dashoffset:0; } }
        .parline { fill:none; stroke:${LAV}; stroke-width:1.8; stroke-dasharray:5 5; opacity:.85; }
        .secline { fill:none; stroke:${GOLD}; stroke-width:2; stroke-dasharray:2.5 4; opacity:.95; }
        .hint { font-size:12.5px; color:#8B94A3; padding:6px 10px 0; }
        .hint b { color:#EDE7DA; }
        .stripline { display:flex; flex-wrap:wrap; align-items:center; gap:7px 10px; padding:8px 10px 4px; }
        .strippills { display:inline-flex; flex-wrap:wrap; gap:6px; }
        .pill { border-radius:8px; padding:3px 9px; font-size:13.5px; font-weight:700; line-height:1.3; cursor:pointer; }
        .pill.pillon { outline:2px dashed #FFFFFF; outline-offset:2px; }
        .pill.pillplay { outline:2px solid ${GOLD}; outline-offset:2px; }
        .pill.pillout { box-shadow: inset 0 0 0 1.5px ${GOLD}; }
        .pill .outmark { color:${GOLD}; font-size:10px; vertical-align:super; margin-left:2px; -webkit-text-stroke:0.4px #10151D; }
        .pill.pillsel { outline:2px solid #6EA8FF; outline-offset:2px; box-shadow:0 0 0 4px rgba(110,168,255,.18); }
        .mini.miniOn { border-color:#6EA8FF; color:#BcD6FF; }
        .mini:disabled { opacity:.4; cursor:default; }
        .reorderbar { display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:2px 10px 6px; }
        .reorderbar .rlbl { font-size:12.5px; color:#8B94A3; margin-right:2px; }
        .scorewrap { overflow-x:auto; background:#0C1119; border:1px solid #232C3A; border-radius:12px; padding:12px 8px; margin:4px 10px 6px; }
        .scorewrap svg { display:block; }
        .scoreempty { font-size:12.5px; color:#8B94A3; padding:8px 10px; }
        .pill i { font-style:normal; font-weight:600; font-size:10px; opacity:.65; margin-right:4px; }
        .fingcard { margin:10px 10px 4px; padding:10px 12px; background:#10151D; border:1px solid #2A3442; border-radius:12px; }
        .verrow { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin:9px 0 5px; }
        .verlbl { font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#8B94A3; margin-right:2px; }
        .verbtn { background:transparent; border:1px solid #4A5668; color:#EDE7DA; border-radius:8px; padding:3px 10px; font-size:12.5px; cursor:pointer; font-family:inherit; }
        .verbtn:hover { border-color:#EAE2CC; }
        .verbtn.on { background:#EAE2CC; color:#171E28; font-weight:600; border-color:#EAE2CC; }
        .versel { background:#171E28; border:1px solid #4A5668; color:#EDE7DA; border-radius:8px; padding:4px 8px; font-size:13px; font-family:inherit; cursor:pointer; min-width:160px; }
        .versel:hover { border-color:#EAE2CC; }
        .fingtitle { font-family:'Fraunces',serif; font-weight:650; font-size:18px; color:#EAE2CC; margin-bottom:2px; }
        .fingrow { display:flex; flex-wrap:wrap; gap:14px; align-items:flex-end; }
        .legend { display:flex; flex-wrap:wrap; gap:12px; font-size:12px; color:#8B94A3; margin-top:10px; }
        .legend span { display:flex; align-items:center; gap:5px; }
        .dot { width:10px; height:10px; border-radius:50%; flex:none; }
        .dash { width:16px; height:0; border-top:2px dashed currentColor; flex:none; }
        .progtitle { font-family:'Fraunces',serif; font-size:19px; font-weight:650; }
        .keytag { font-size:12px; color:#8B94A3; }
        .struct { border-top:1px solid #232C3A; padding:11px 0 2px; margin-top:11px; }
        .stname { font-family:'Fraunces',serif; font-size:15.5px; font-weight:650; color:#EAE2CC; }
        .sttip { font-size:13px; color:#8B94A3; font-style:italic; line-height:1.45; }
        .arr { border-top:1px solid #232C3A; padding:10px 2px; }
        .arrsec { font-size:12px; letter-spacing:.12em; text-transform:uppercase; color:#8B94A3; font-weight:600; }
        .arrreps { color:${GOLD}; letter-spacing:0; text-transform:none; }
        .arrch { font-family:'Fraunces',serif; font-size:17px; font-weight:650; color:#EAE2CC; margin-top:3px; line-height:1.55; }
        .arrnote { font-size:12.5px; color:#8B94A3; font-style:italic; margin-top:2px; line-height:1.4; }
        .mini.recstop { border-color:#E06A55; color:#F2B8AC; }
        .mini.recbtn { border-color:#7A4A44; color:#E9B3AB; }
        .mini.recbtn:hover { border-color:#E06A55; }
        .mini.loopon { border-color:#6EA8FF; color:#BcD6FF; background:rgba(110,168,255,.12); }
        .recbar { display:flex; flex-wrap:wrap; align-items:center; gap:8px 10px; margin-top:7px; padding:7px 9px;
          background:#0C1119; border:1px solid #33475F; border-radius:10px; }
        .recmeter { flex:1; min-width:80px; height:8px; border-radius:999px; background:#232C3A; overflow:hidden; }
        .recfill { height:100%; background:${GOLD}; border-radius:999px; transition:width .06s linear; }
        .rechz { font-size:12.5px; color:${GOLD}; font-weight:600; min-width:78px; font-variant-numeric:tabular-nums; }
        .sym { color:#EAE2CC; font-size:13px; letter-spacing:0; }
        .formline { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-top:14px; border-top:1px solid #232C3A; padding-top:12px; }
        .formtok { font-family:'Fraunces',serif; font-weight:650; font-size:21px; color:#EAE2CC; background:#10151D; border:1px solid #2A3442; border-radius:9px; padding:3px 11px; }
        .formtok i { font-style:normal; font-size:14px; color:${GOLD}; margin-left:2px; }
        .bpmval { font-size:13px; color:#EDE7DA; font-weight:600; min-width:58px; text-align:center; }
        .rgrid { display:grid; gap:5px; margin-top:12px; }
        .rcount { text-align:center; font-size:11px; color:#8B94A3; }
        .rcell { text-align:center; font-size:22px; line-height:1.6; color:#EDE7DA; background:#10151D; border:1px solid #2A3442; border-radius:9px; transition:all .06s; }
        .rcell.racc { color:${GOLD}; font-weight:700; }
        .rcell.rrest { color:#4A5668; }
        .rcell.ron { background:#EAE2CC; color:#171E28; border-color:#EAE2CC; }
        .rcell.ron.racc { background:${GOLD}; color:#2A1F06; border-color:${GOLD}; }
        .npill { border:1px solid #2A3442; background:#10151D; color:#EDE7DA; border-radius:8px; padding:3px 10px; font-size:13.5px; font-weight:600; }
        .npill.npent { background:#EAE2CC; color:#171E28; border-color:#EAE2CC; }
        .npill.nsm { padding:2px 8px; font-size:12.5px; }
        .npill.nchrom { border-color:${GOLD}; color:${GOLD}; }
        .mrow { display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-top:4px; padding:5px 8px; border-radius:10px; border:1px solid transparent; transition:all .12s; }
        .mrow.mrowon { background:#1E2A3C; border-color:${GOLD}; }
        .mline { display:grid; gap:4px; align-items:center; margin-top:4px; }
        .mnote { font-size:11px; color:#8B94A3; text-align:right; padding-right:2px; }
        .mcell { height:22px; background:#10151D; border:1px solid #232C3A; border-radius:6px; cursor:pointer; transition:all .08s; }
        .mcell:hover { border-color:#4A5668; }
        .mcell.on { background:#54B79D; border-color:#54B79D; }
        .mcell.onB { background:#B98CF0; border-color:#B98CF0; }
        /* a cell carrying both layers: layer A fill with a layer-B wedge in the top-right corner */
        .mcell.on.onB { background:linear-gradient(135deg, #54B79D 0 55%, #B98CF0 55% 100%); border-color:#B98CF0; }
        .mcell.colnow { border-color:#EAE2CC; }
        .mcell.on.colnow, .mcell.onB.colnow { background:#EAE2CC; }
        .mcell.on.onB.colnow { background:linear-gradient(135deg, #EAE2CC 0 55%, #d9c2ff 55% 100%); }
        .lybtn { font-size:11px; padding:2px 9px; border-radius:999px; border:1px solid #2A3442; background:#161C26; color:#8B94A3; cursor:pointer; }
        .lybtn.onA { background:#54B79D; border-color:#54B79D; color:#0c1116; }
        .lybtn.onB { background:#B98CF0; border-color:#B98CF0; color:#0c1116; }
        .mcell.b0 { border-left:2px solid #3A4656; }
        .mcell.bt { border-left:1px solid #2A3442; }
        .mcell.mv { touch-action:none; }
        .mscroll.mvmode { user-select:none; -webkit-user-select:none; touch-action:none; }
        .mcell.msel { outline:2px solid #6EA8FF; outline-offset:-1px; box-shadow:inset 0 0 0 2px rgba(110,168,255,.35); }
        .mcell.mbox { background:rgba(110,168,255,.22); border-color:#6EA8FF; }
        .mcell.mghost { background:rgba(110,168,255,.5); border-color:#6EA8FF; }
        .melmodebar { display:flex; flex-wrap:wrap; align-items:center; gap:7px; margin-bottom:8px; }
        .melmodebar .rlbl { font-size:12.5px; color:#8B94A3; margin:0 2px; }
        .mscroll { overflow-x:auto; padding-bottom:4px; }
        .sugmel { background:#10151D; border:1px solid #2A3442; border-radius:12px; padding:10px 12px; margin-bottom:10px; }
        .sgrp { border:1.5px solid #2A3442; border-radius:13px; padding:2px 11px 9px; margin-top:11px; }
        .sgrp .arr:first-of-type { border-top:none; padding-top:2px; }
        .arr.playnow { background:#161F2C; border-radius:10px; padding:9px 10px 10px; border-top-color:transparent; margin-top:6px; }
        .arr.playnow + .arr { border-top-color:transparent; }
        .sgrplbl { font-size:10px; font-weight:700; letter-spacing:.13em; text-transform:uppercase; margin-top:7px; }
        .mbar { font-size:11px; font-weight:700; border-radius:6px; text-align:center; padding:2px 0; margin:0 1px 2px; white-space:nowrap; overflow:hidden; }
        .sug { border-top:1px solid #232C3A; padding:10px 2px 8px; margin-top:8px; }
        .modehint { margin:10px 0 0; padding:10px 12px; border:1px solid ${GOLD}55; background:#1B2130; border-radius:12px; }
        .progchips { display:flex; flex-wrap:wrap; gap:8px; }
        .progchip { flex:1 1 150px; text-align:left; background:#171E28; border:1px solid #2A3442; border-radius:12px;
          padding:8px 11px; cursor:pointer; font-family:inherit; color:#EDE7DA; display:flex; flex-direction:column; gap:2px; }
        .progchip:hover { border-color:#4A5668; }
        .progchip.on { border-color:#EAE2CC; background:#1E2632; box-shadow:inset 0 0 0 1px #EAE2CC55; }
        .progchip .pcname { font-size:13.5px; font-weight:600; }
        .progchip .pcnums { font-size:12.5px; color:#EAE2CC; }
        .progchip .pcrn { font-size:11px; color:#8B94A3; letter-spacing:.03em; }
        .sugname { font-size:14px; font-weight:600; line-height:1.35; }
        .sugsongs { font-size:12.5px; color:#B9C0CC; margin-top:4px; line-height:1.5; }
      `}</style>

      <div className="wrap">
        <div className="eyebrow">Songwriting sketchpad · v{APP_VERSION}</div>
        <h1>The Progression Wheel</h1>
        <p className="sub">Pick a key, a genre and a feeling — the wheel does the rest.
          {" "}<a href="transcribe.html" style={{ color:GOLD, textDecoration:"none", whiteSpace:"nowrap" }}>🎤 Hum a tune →</a></p>

        {/* top transport — always-reachable Play */}
        <div className="toptransport">
          <button className={"playbtn" + (playing ? " on" : "")} onClick={() => (playing ? stopMetro() : startMetro(0))}>
            {playing ? "■ Stop" : "▶ Play"}
          </button>
          <div className="row" style={{ gap:7, alignItems:"center" }}>
            <button className="mini" onClick={() => nudgeBpm(-5)}>−5</button>
            <span className="bpmval">{effBpm} bpm</span>
            <button className="mini" onClick={() => nudgeBpm(5)}>+5</button>
          </div>
          {playing && curLabel
            ? <span className="tplabel">{curLabel}</span>
            : <span className="tplabel dim">{keyLabel} · {prog.label}</span>}
        </div>

        {/* controls */}
        <div className="panel">
          <div className="row" style={{ gap:"8px 12px", alignItems:"flex-end" }}>
            <label className="selwrap" style={{ flex:"0 0 62px" }}>
              <span className="lbl" style={{ margin:0 }}>Key</span>
              <select value={tonic} onChange={e => setTonic(+e.target.value)}>
                {Array.from({ length: 12 }, (_, s) => <option key={s} value={s}>{spell(s, s, effMode)}</option>)}
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
                {CATEGORIES[0].items.map(it => <option key={it.name} value={it.name}>{it.name}</option>)}
              </select>
            </label>
            <label className="selwrap" style={{ flex:"1 1 88px" }}>
              <span className="lbl" style={{ margin:0 }}>Emotion</span>
              <select value={emotion || ""} onChange={e => { setEmotion(e.target.value || null); setForce(null); setMode(null); }}>
                <option value="">Any</option>
                {CATEGORIES[1].items.map(it => <option key={it.name} value={it.name}>{it.name}</option>)}
              </select>
            </label>
            <div className={"tog lav" + (showPar ? " on" : "")} onClick={() => setShowPar(v => !v)} style={{ paddingBottom:6 }}>
              <div className="sw" /> Par
            </div>
            <div className={"tog gold" + (showSec ? " on" : "")} onClick={() => setShowSec(v => !v)} style={{ paddingBottom:6 }}>
              <div className="sw" /> Sec
            </div>
            <div className="seg" style={{ marginBottom:2 }}>
              <button className={colour === "triads" ? "on" : ""} onClick={() => setColour("triads")}>Triads</button>
              <button className={colour === "sevenths" ? "on" : ""} onClick={() => setColour("sevenths")}>7ths</button>
              <button className={colour === "extended" ? "on" : ""} onClick={() => setColour("extended")}>9ths</button>
            </div>
            <button className="btn" style={{ padding:"5px 11px", marginBottom:2 }} onClick={rollDice} title="Surprise me">🎲</button>
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

          <div className="selrow" style={{ marginTop:10 }}>
            <label className="selwrap">
              <span className="lbl" style={{ margin:0 }}>Sound (chords)</span>
              <select value={gmKey(instr)} onChange={e => setInstr(e.target.value)}>
                {GM_CATS.map(([cat, list]) => (
                  <optgroup key={cat} label={cat}>
                    {list.map(([k, label]) => <option key={cat + k} value={k}>{label}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="selwrap">
              <span className="lbl" style={{ margin:0 }}>Lead (melody)</span>
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

          <div className="row" style={{ marginTop:12, gap:8 }}>
            <input className="txt" placeholder="Sketch name…" value={sketchName}
              onChange={e => setSketchName(e.target.value)} />
            <button className="btn" style={{ padding:"6px 12px" }} onClick={saveSketch}>Save</button>
            {(sketches || []).length > 0 && (
              <select value="" onChange={e => { const s = (sketches || [])[+e.target.value]; if (s) loadSketch(s); }}>
                <option value="">Load sketch…</option>
                {(sketches || []).map((s, i) => <option key={i} value={i}>{s.name}</option>)}
              </select>
            )}
            {ioNote && <span className="keytag">{ioNote}</span>}
          </div>
        </div>

        {/* suggested chord progressions for the chosen genre / feeling */}
        <div className="panel">
          <div className="progtitle" style={{ fontSize:17 }}>
            Suggested progressions{genre ? ` · ${genre}` : ""}{emotion ? ` · ${emotion}` : ""}
          </div>
          <p className="keytag" style={{ margin:"3px 0 8px" }}>
            {genre || emotion
              ? "The classic loops behind this style — tap one to load it onto the wheel. The top pick is showing now."
              : "Pick a genre or a feeling above to narrow these, or tap any loop to load it."}
          </p>
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
        </div>

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
        <div className="panel" style={{ padding:6 }}>
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
                <g key={"hit"+p} style={{ cursor: sel ? "pointer" : "default" }}>
                  <circle cx={M.x} cy={M.y} r={27} fill="transparent" onClick={() => doSwap(maj, "maj")} />
                  <circle cx={m.x} cy={m.y} r={22} fill="transparent" onClick={() => doSwap(min, "min")} />
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
                  <text x={n.x} y={n.y+5} textAnchor="middle" fill={LAV} fontSize="14" fontWeight="600" fontFamily="Archivo"
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
                  {!s.onExisting && <text x={n.x} y={n.y+5} textAnchor="middle" fill={GOLD} fontSize="14" fontWeight="600"
                    fontFamily="Archivo" style={{ pointerEvents:"none" }}>{s.name}</text>}
                  <text x={n.x} y={n.y + (s.onExisting ? 46 : 38)} textAnchor="middle" fill={GOLD} fontSize="11" fontFamily="Archivo">
                    V/{s.target.numeral}</text>
                </g>
              );
            })}
            {uniques.map((c, i) => {
              const n = nodeXY(c.root, c.quality), r = famMin(c.quality) ? 22 : 27, isSel = sel === c.baseName;
              return (
                <g key={"n"+i} style={{ cursor:"pointer" }}
                  onClick={() => {
                    if (c.inserted) {
                      setInserts({ key: editKey, list: insList.filter(x => !(x.before === c.insBefore && x.root === c.insRoot)) });
                      return;
                    }
                    if (sel && sel !== c.baseName) doSwap(c.root, c.quality);
                    else setSel(isSel ? null : c.baseName);
                  }}>
                  {isSel && <circle cx={n.x} cy={n.y} r={r + 6} fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeDasharray="4 4" opacity="0.9" />}
                  <circle cx={n.x} cy={n.y} r={r} fill={FN_COLOR[c.func]} stroke={c.inserted ? GOLD : "#10151D"} strokeWidth="2.5" />
                  <text x={n.x} y={n.y+5} textAnchor="middle" fill={FN_TEXT[c.func]} fontSize={c.name.length > 3 ? 11 : famMin(c.quality) ? 14 : 16}
                    fontWeight="700" fontFamily="Archivo" style={{ pointerEvents:"none" }}>{c.name}</text>
                  <text x={n.x} y={n.y - r - 7} textAnchor="middle" fill="#8B94A3" fontSize="11" fontFamily="Archivo">{c.steps.join("·")}</text>
                  {!chordInMode(c) && <>
                    <circle cx={n.x + r * 0.72} cy={n.y - r * 0.72} r={6} fill={GOLD} stroke="#10151D" strokeWidth="1.6" />
                    <title>{c.name} sits outside {keyLabel} — borrowed / chromatic colour</title>
                  </>}
                </g>
              );
            })}
          </svg>

          <div className="hint">
            {sel
              ? <>Tap any note on the wheel to replace <b>{(uniques.find(u => u.baseName === sel) || {}).name || sel}</b> — or tap it again to cancel.</>
              : (Object.keys(ovMap).length || insList.length || Object.keys(qmap).length || remList.length)
                ? <>Progression edited. <button className="mini" onClick={resetEdits}>Reset</button></>
                : <>Tap a chord to swap it. Tap a <b style={{ color:GOLD }}>gold</b> or <b style={{ color:LAV }}>lavender</b> node to pull it into the progression.</>}
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
                  onClick={() => reorder ? togglePillSel(i) : setFingerIdx(fingerIdx === i ? null : i)}>
                  <i>{c.numeral}</i>{c.name}{outside && <b className="outmark">✦</b>}
                </span>
                );
              })}
            </span>
            <button className={"mini" + (reorder ? " miniOn" : "")} style={{ marginLeft:"auto" }}
              onClick={toggleReorder} title="Select several chords and shift them as a group">
              {reorder ? "✕ Done" : "⇄ Reorder"}
            </button>
          </div>

          {reorder && (
            <div className="reorderbar">
              <span className="rlbl">{pillSel.length ? `${pillSel.length} selected` : "Tap chords to select"}</span>
              <button className="mini" disabled={!pillSel.length} onClick={() => movePills(-1)}>◀ Move</button>
              <button className="mini" disabled={!pillSel.length} onClick={() => movePills(1)}>Move ▶</button>
              {order.list && order.key === editKey &&
                <button className="mini" onClick={straightenPills} title="Restore the original order">↺ Straighten</button>}
            </div>
          )}
          {!reorder && fingerIdx == null && (
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

          <div className="legend" style={{ padding:"0 10px 8px" }}>
            <span><i className="dot" style={{ background: FN_COLOR.T }} /> tonic</span>
            <span><i className="dot" style={{ background: FN_COLOR.S }} /> subdominant</span>
            <span><i className="dot" style={{ background: FN_COLOR.D }} /> dominant</span>
            <span style={{ color:GOLD }}><i className="dot" style={{ background: GOLD, opacity:0.5 }} /> chords in {keyLabel}</span>
            <span style={{ color:GOLD }}><b style={{ fontSize:11 }}>✦</b> outside the key</span>
            {showPar && <span style={{ color:LAV }}><i className="dash" /> parallel</span>}
            {showSec && <span style={{ color:GOLD }}><i className="dash" /> secondary dominant</span>}
            <span>numbers = order in the loop</span>
          </div>
        </div>

        {/* notation — the song on a stave */}
        <div className="panel">
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
              <NotationScore measures={scoreMeasures} instr={scoreInstr} meloBeats={meloBeats} />
            </div>
            <div className="hint" style={{ padding:"2px 10px 4px" }}>
              {scoreInstr === "piano"
                ? <>Grand staff — right hand plays the melody{scoreHasMelody ? "" : " (add one in the melody grid below)"}, left hand holds the chord voicing. Chord symbols sit above each bar.</>
                : <>Guitar lead sheet — chord symbols above, the melody on the treble staff{scoreHasMelody ? ", with fret numbers on the tab below fingered low on the neck (first position, sounding lower)" : " — write a melody below and its tab appears here"}.</>}
              {structSel ? " Following the selected song structure." : " Following the loop."}
              {scoreHasB && <> The <b style={{ color:LAV }}>2nd melody</b> is shown in violet.</>}
            </div>
          </>)}
        </div>

        {/* rhythm */}
        <div className="panel accent">
          <div className="row" style={{ justifyContent:"space-between", alignItems:"center" }}>
            <div className="progtitle" style={{ fontSize:17 }}>Rhythm</div>
            <div className="row" style={{ gap:6 }}>
              <button className="btn" style={{ padding:"5px 11px" }} onClick={loadHummedMelody}
                title="Load the tune you hummed in the Tune Transcriber">🎤 Hum</button>
              <label className="btn" style={{ padding:"5px 11px", cursor:"pointer" }} title="Import a melody from a MIDI file">↑ MIDI
                <input type="file" accept=".mid,.midi,audio/midi" onChange={importMidiFile} hidden />
              </label>
              <button className="btn" style={{ padding:"5px 11px" }} onClick={exportMidi} title="Export MIDI">↓ MIDI</button>
            </div>
          </div>

          <div className="row" style={{ marginTop:8, gap:8, alignItems:"center" }}>
            <span className="keytag" style={{ marginRight:2 }}>Add imported / recorded melody to:</span>
            <select value={sections.insts.some(s => s.key === impSec) ? impSec : ""}
              onChange={e => setImpSec(e.target.value)}
              title="Which section a hummed / played tune, MIDI import, or in-app recording lands on">
              <option value="">First section{sections.insts[0] ? ` (${sections.insts[0].key} ${sections.insts[0].word})` : ""}</option>
              {sections.insts.map(s => <option key={s.key} value={s.key}>{s.key} · {s.word}</option>)}
            </select>
            <span className="keytag" style={{ fontStyle:"italic" }}>— or press ● Rec on any section below</span>
            <span className="seg" title="What the ● Rec button listens for — tunes pitch detection">
              <button className={recSource === "guitar" ? "on" : ""} onClick={() => setRecSource("guitar")} disabled={!!recSec}>🎸 Guitar</button>
              <button className={recSource === "voice" ? "on" : ""} onClick={() => setRecSource("voice")} disabled={!!recSec}>🎤 Voice</button>
            </span>
          </div>

          <div className="selrow" style={{ marginTop:10, alignItems:"flex-end", flexWrap:"wrap" }}>
            <label className="selwrap" style={{ minWidth:150 }}>
              <span className="lbl" style={{ margin:0 }}>Pattern</span>
              <select value={patId} onChange={e => setPatSel({ key: progId, id: e.target.value })}>
                {Object.entries(PATTERNS).map(([id, p]) => (
                  <option key={id} value={id}>
                    {p.name}{id === (PATTERN_DEFAULT[progId] || "pop") ? " ★" : ""}{p.swing ? " (swung)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="selwrap" style={{ minWidth:130 }}>
              <span className="lbl" style={{ margin:0 }}>Drums</span>
              <select value={drum} onChange={e => setDrum(e.target.value)}>
                {Object.entries(DRUMS).map(([id, d]) => <option key={id} value={id}>{d.name}</option>)}
              </select>
            </label>
            <div className={"tog" + (realSounds ? " on" : "")} onClick={() => setRealSounds(v => !v)} style={{ paddingBottom:6 }}
              title="Play real recorded instruments (loads samples when online; falls back to the built-in synth offline)">
              <div className="sw" /> Real
            </div>
            <div className={"tog" + (legato ? " on" : "")} onClick={() => setLegato(v => !v)} style={{ paddingBottom:6 }}
              title="Merge the melody notes into one flowing line — smoother, less stodgy">
              <div className="sw" /> Legato
            </div>
            <div className={"tog" + (clickOn ? " on" : "")} onClick={() => setClickOn(v => !v)} style={{ paddingBottom:6 }}
              title="A metronome tick on each beat — off by default; turn on if you want a click track">
              <div className="sw" /> Click
            </div>
          </div>

          <div className="arrnote" style={{ marginTop:5 }}>
            {rhythm.name}{rhythm.swing ? " · swung" : ""} — {rhythm.desc}
          </div>
          {playing && curLabel && (
            <div className="arrnote" style={{ color:GOLD, fontStyle:"normal", fontWeight:600 }}>Playing: {curLabel}</div>
          )}

          <div className="rgrid" style={{ gridTemplateColumns:`repeat(${rhythm.pattern.length}, 1fr)` }}>
            {rhythm.pattern.map((_, i) => <div key={"c"+i} className="rcount">{i % 2 === 0 ? (i / 2 + 1) : "&"}</div>)}
            {rhythm.pattern.map((s, i) => (
              <div key={"s"+i} className={"rcell" + (playing && curStep === i ? " ron" : "") + (s === ">" ? " racc" : "") + (s === "-" ? " rrest" : "")}>
                {s === "U" ? "↑" : s === "-" ? "·" : "↓"}
              </div>
            ))}
          </div>
          <p className="keytag" style={{ marginTop:8 }}>
            Plays through the chosen song structure if one is selected below — each section with its own
            melody — otherwise loops the progression, one chord per bar. No sound? Check the phone's
            silent switch and volume.
          </p>
        </div>

        {/* song & melody */}
        <div className="panel accent">
          <div className="row" style={{ justifyContent:"space-between", alignItems:"center" }}>
            <div className="progtitle" style={{ fontSize:17 }}>Song & melody</div>
            <select value={selStruct.startsWith(progId + ":") ? selStruct : ""} onChange={e => setSelStruct(e.target.value)}>
              <option value="">No structure — just the loop</option>
              {(STRUCTURES[progId] || []).map((st, i) => <option key={"p"+i} value={progId + ":p:" + i}>{st.name}</option>)}
              {UNIVERSAL.map((st, i) => <option key={"u"+i} value={progId + ":u:" + i}>{st.name}</option>)}
            </select>
          </div>

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

          <div className="row" style={{ marginTop:10, gap:6, alignItems:"center" }}>
            <span className="keytag" style={{ marginRight:2 }}>Scale ({keyLabel}):</span>
            {scaleSemis.map((s, i) => (
              <span key={i} className={"npill nsm" + (pentSemis.includes(s) ? " npent" : "")}>{spell((tonic + s) % 12, tonic, effMode)}</span>
            ))}
            <button className="mini" onClick={() => setShowLand(v => !v)}>{showLand ? "Hide" : "Landing notes"}</button>
          </div>

          <div className="row" style={{ marginTop:8, gap:6, alignItems:"center" }}>
            <span className="keytag" style={{ marginRight:2 }}>Chords in {keyLabel}:</span>
            {modeTriads.map((t, i) => (
              <span key={i} className="npill nsm" title={`${t.rn} — ${chordName(t.root, t.q)}`}>
                <b style={{ color:GOLD }}>{t.rn}</b> {spell(t.root, tonic, effMode)}{QSUF[t.q]}
              </span>
            ))}
          </div>
          {showLand && (
            <div style={{ marginTop:4 }}>
              {uniques.map((c, i) => {
                const tones = chordIvs(c.quality).map(x => (c.root + x) % 12);
                const chrom = tones.some(t => !scaleNotes.includes(t));
                return (
                  <div key={i} className="mrow">
                    <span className="pill" style={{ background: FN_COLOR[c.func], color: FN_TEXT[c.func] }}>{c.name}</span>
                    {tones.map((t, j) => <span key={j} className={"npill nsm" + (!scaleNotes.includes(t) ? " nchrom" : "")}>{spell(t, tonic, effMode)}</span>)}
                    {chrom && <span className="keytag" style={{ color:GOLD }}>chromatic</span>}
                  </div>
                );
              })}
              <p className="keytag" style={{ marginTop:6 }}>
                Land long notes, downbeats and phrase endings on the playing chord's notes — root and 3rd
                strongest. Gold notes sit outside the key: strong landings during that chord's bar only.
              </p>
            </div>
          )}

          <p className="keytag" style={{ marginTop:8 }}>
            On each section: <b>▶</b> play from here · <b>🔁</b> loop just this section ·
            <b> {recSource === "guitar" ? "🎸" : "🎤"} Rec</b> record a {recSource} line straight onto its
            melody grid · <b>▸ melody</b> open the grid. Pick <b>🎸 Guitar / 🎤 Voice</b> on the Rhythm panel above.
          </p>
          {(() => {
            const groups = [];
            sections.insts.forEach(d => {
              const g = groups[groups.length - 1];
              if (g && g.base === d.base) g.items.push(d);
              else groups.push({ base: d.base, word: d.word, items: [d] });
            });
            return groups.map((g, gi) => (
              <div key={gi} className="sgrp" style={{ borderColor: (SEC_COL[g.base] || "#2A3442") + "55" }}>
                <div className="sgrplbl" style={{ color: SEC_COL[g.base] || "#8B94A3" }}>
                  {g.word}{g.items.length > 1 ? "s ×" + g.items.length : ""}
                </div>
                {g.items.map((d, di) => {
            const sec = secMelos[d.key] || { flat: [] };
            const cols = d.cs.length * meloBeats;
            const open = !!openSecs[d.key];
            const has = sec.flat.some(a => a.length) || (sec.flatB && sec.flatB.some(a => a.length));
            const donor = !has && sections.insts.find(o => o.base === d.base && o.key !== d.key
              && (secMelos[o.key] || { flat: [] }).flat.some(a => a.length));
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
                {open && (() => {
                  const tab = melTab[d.key] || "write";
                  const pick = sugSel[d.key] || { pat: MELODY_PATTERNS[0].id, start: 0 };
                  const curPat = MELODY_PATTERNS.find(p => p.id === pick.pat) || MELODY_PATTERNS[0];
                  const hasB = !!sec.barsB;
                  const secL = (melLayer === 1 && hasB) ? 1 : 0;   // which layer this section's edits target
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
                    {/* layer switch + the active layer's own instrument */}
                    <div className="row" style={{ gap:6, alignItems:"center", marginBottom:8, flexWrap:"wrap" }}>
                      <span className="keytag" style={{ margin:0 }}>Layer</span>
                      <button className="lybtn onA" style={secL === 0 ? null : { opacity:.5 }}
                        onClick={() => setMelLayer(0)} title="Melody A">A</button>
                      {hasB
                        ? <button className="lybtn onB" style={secL === 1 ? null : { opacity:.5 }}
                            onClick={() => setMelLayer(1)} title="Melody B">B</button>
                        : <button className="lybtn" onClick={() => addLayerB(d.key)} title="Add a second melody">＋ 2nd melody</button>}
                      <div className="selwrap" style={{ minWidth:150, marginLeft:6 }}>
                        <span className="keytag">{secL === 1 ? "B" : "A"} instrument</span>
                        <select value={(secL === 1 ? sec.instrB : sec.instr) || ""}
                          onChange={e => setSecInstr(d.key, secL, e.target.value)}>
                          {leadOpts()}
                        </select>
                      </div>
                      {hasB && secL === 1 && <button className="mini" onClick={() => removeLayerB(d.key)} title="Remove melody B">🗑 B</button>}
                    </div>

                    <div className="seg" style={{ marginBottom:8 }}>
                      <button className={tab === "write" ? "on" : ""}
                        onClick={() => setMelTab({ ...melTab, [d.key]: "write" })}>✎ Write</button>
                      <button className={tab === "suggest" ? "on" : ""}
                        onClick={() => setMelTab({ ...melTab, [d.key]: "suggest" })}>✨ Suggest</button>
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
                        <p className="arrnote" style={{ marginTop:7 }}>Writing to melody <b>{secL === 1 ? "B" : "A"}</b>. {curPat.desc}</p>
                        <div className="row" style={{ gap:6, marginTop:8 }}>
                          <button className="btn" onClick={() => applyPattern(d, sec, pick.pat, pick.start, secL)}>
                            Write to grid</button>
                          <button className="mini" onClick={() => clearMelody(d, sec, secL)}>Clear melody {secL === 1 ? "B" : "A"}</button>
                        </div>
                      </div>
                    )}

                    {tab === "write" && (
                      <div className="melmodebar">
                        <div className="seg">
                          <button className={!melMove ? "on" : ""} onClick={() => { setMelMove(false); setMelSel({ key:"", layer:0, notes:{} }); }}>✎ Draw</button>
                          <button className={melMove ? "on" : ""} onClick={() => setMelMove(true)}>✋ Move</button>
                        </div>
                        {melMove && (() => {
                          const nSel = (melSel.key === d.key && melSel.layer === secL) ? Object.keys(melSel.notes).length : 0;
                          return (<>
                            <span className="rlbl">{nSel ? `${nSel} note${nSel > 1 ? "s" : ""} — drag one, or nudge →` : "drag a box over notes to select"}</span>
                            <button className="mini" disabled={!nSel} onClick={() => nudgeMel(0, 1)} title="Up a scale step">▲</button>
                            <button className="mini" disabled={!nSel} onClick={() => nudgeMel(0, -1)} title="Down a scale step">▼</button>
                            <button className="mini" disabled={!nSel} onClick={() => nudgeMel(-1, 0)} title="Earlier">◀</button>
                            <button className="mini" disabled={!nSel} onClick={() => nudgeMel(1, 0)} title="Later">▶</button>
                            <button className="mini" disabled={!nSel} onClick={() => timeMel(0.5)} title="Double-time — pack the selection into half the space (plays twice as fast)">½× time</button>
                            <button className="mini" disabled={!nSel} onClick={() => timeMel(2)} title="Half-time — stretch the selection over twice the space (plays half as fast)">2× time</button>
                            <button className="mini" disabled={!nSel} onClick={deleteMelSel} title="Delete selected">🗑</button>
                          </>);
                        })()}
                      </div>
                    )}

                    <div className={"mscroll" + (melMove ? " mvmode" : "")}>
                      <div className="mline" style={{ gridTemplateColumns:`36px repeat(${cols}, minmax(15px,1fr))` }}>
                        <span />
                        {d.cs.map((c, b) => (
                          <span key={b} className="mbar" style={{ gridColumn:`span ${meloBeats}`,
                            background: FN_COLOR[c.func || "T"], color: FN_TEXT[c.func || "T"] }}>{c.name}</span>
                        ))}
                      </div>
                      {[...scaleSemis.keys()].reverse().map(deg => (
                        <div key={deg} className="mline" style={{ gridTemplateColumns:`36px repeat(${cols}, minmax(15px,1fr))` }}>
                          <span className="mnote">{spell((tonic + scaleSemis[deg]) % 12, tonic, effMode)}</span>
                          {Array.from({ length: cols }, (_, c) => {
                            const onA = (sec.flat[c] || []).includes(deg);
                            const onB = !!(sec.flatB && (sec.flatB[c] || []).includes(deg));
                            const isSel = melMove && melSel.key === d.key && melSel.layer === secL && melSel.notes[nKey(c, deg)];
                            const inBox = melBox && melBox.key === d.key && c >= melBox.c0 && c <= melBox.c1 && deg >= melBox.d0 && deg <= melBox.d1;
                            const isGhost = melGhost && melGhost.key === d.key && melSel.key === d.key && melSel.layer === secL
                              && melSel.notes[nKey(c - melGhost.dc, deg - melGhost.dd)];
                            return (
                            <div key={c} data-mk={d.key} data-c={c} data-deg={deg}
                              onClick={() => { if (!melMove) tapMelo(d.key, c, deg, secL); }}
                              onPointerDown={e => melDown(e, d.key, c, deg, sec, secL)}
                              className={"mcell" + (onA ? " on" : "") + (onB ? " onB" : "") + (melMove ? " mv" : "")
                                + (isSel ? " msel" : "") + (isGhost ? " mghost" : "") + (inBox ? " mbox" : "")
                                + (playing && curQ && curQ.sym === d.key && curQ.col === c ? " colnow" : "")
                                + (c % meloBeats === 0 && c > 0 ? " b0" : c % 2 === 0 && c > 0 ? " bt" : "")} />
                            );
                          })}
                        </div>
                      ))}
                    </div>
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
            <p className="keytag" style={{ marginTop:8 }}>
              {structSel
                ? <>≈ {sections.totalBars} bars at one chord per bar. Every pass has its own melody — "copy"
                  duplicates an earlier sibling's tune as a starting point, then vary it.</>
                : <>Choose a structure above to write the song out pass by pass, each with its own melody —
                  or sketch over the loop here.</>}
            </p>
          </div>
        </div>


        {/* songs */}
        <div className="panel">
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
              return <p className="keytag" style={{ marginTop:8 }}>
                Ten songs run on this engine — pick one to see the progression in its own key.</p>;
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
                {k != null && <div className="arrnote">in {spell(k, k, prog.mode)} {MODES[modeId(prog.mode)].short} —
                  key follows the most common recording or transcription; some originals sit between keys or use altered tunings.</div>}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
