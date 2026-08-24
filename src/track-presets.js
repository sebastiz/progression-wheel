/* track-presets — "Recreate a famous track" on the Arrange tab. Twenty real dance records, each
   reduced to the four things about a track that are facts rather than expression: its tempo, its
   key, the shape of its chord loop (as a roman-numeral progression already in the catalogue — chord
   progressions are not copyrightable, and countless legitimate sites publish "the chords to X"),
   and its song-structure/arrangement shape (an intro/build/drop/breakdown bar count is a factual
   description of running order, not a creative expression of it). Genre-typical drum and bass
   programming idioms are likewise craft, not authorship.

   What is deliberately NOT here, and never will be: any transcribed melody, riff, hook or vocal
   line copied note-for-note from the real record. This app is published under its author's own
   name, so shipping a copyrighted melody in the public repo is a real, personal infringement risk
   — not a hypothetical one. Instead, each entry *steers* the app's own generative melody engine
   (a `NARRATIVES` id from melody.js, a variation amount, a syncopation level) toward the real
   track's melodic *character* — register, repetition, contour, syncopation — so the app writes its
   own tune in the right shape rather than borrowing the real one. `applyTrackPreset` in the
   component is what turns one of these into a song; see the comment there for how it composes with
   `pickStruct`'s own template-application code without the two colliding on the melody state.

   Every entry names a `baseTemplate` (a DANCE_TEMPLATES id) for its arrangement shape and a
   `progId` (an existing PROGRESSIONS id) for its harmonic shape — the closest reasonable match in
   each catalogue, not a claim that the real record uses exactly those chords. Fields left out
   (`bass`, `pad`, `percKit`, `delay`, `swing`, `pat`, `drum`, `kit`, `pump`) simply inherit the base
   template's own choice; a field is only written here when the real track's production calls for
   something the template's genre default does not already give it. */
const DEFS = [

 { id:"onemoretime", name:"One More Time", artist:"Daft Punk", year:2000, bpm:123, tonic:5,
   progId:"deepHouse", baseTemplate:"house",
   narrative:"ostinato", vary:0.5, sync:1, within:true,
   tip:"French filter-house: a single vocoded phrase looped and filtered rather than developed — the whole track is one four-bar cell heard through an opening and closing filter. `ostinato` writes the same short repeating cell the real hook does; the filter automation the house template already draws is what actually plays the arrangement." },

 { id:"finally", name:"Finally", artist:"Kings of Tomorrow", year:2001, bpm:124, tonic:7,
   progId:"deepHouse", baseTemplate:"house",
   narrative:"callResp", vary:1, sync:1,
   tip:"Classic vocal house: a soulful call sung high, answered by a sparser lower phrase — the preacher-and-congregation shape gospel gave house music. `callResp` is built for exactly that trade." },

 { id:"getlucky", name:"Get Lucky", artist:"Daft Punk ft. Pharrell Williams", year:2013, bpm:116, tonic:11,
   progId:"dorian", baseTemplate:"nudisco",
   narrative:"ostinato", vary:1, sync:1,
   tip:"Famously Dorian rather than plain minor — a two-chord vamp (i–IV) that never resolves the way a minor-key song 'should', which is most of why it sits so happily under a disco groove without ever sounding sad. The hook rides one short cell over that static harmony, which `ostinato` mirrors." },

 { id:"musicsoundsbetter", name:"Music Sounds Better With You", artist:"Stardust", year:1998, bpm:123, tonic:6,
   progId:"deepHouse", baseTemplate:"nudisco",
   narrative:"ostinato", vary:0.5, sync:1,
   tip:"A single sampled disco phrase, chopped and looped for six minutes with almost nothing else added — the definition of French house's 'one good loop, well filtered' philosophy. Low variation keeps the cell as fixed as the sample it stands in for." },

 { id:"cola", name:"Cola", artist:"CamelPhat & Elderbrook", year:2017, bpm:123, tonic:7,
   progId:"deepHouse", baseTemplate:"techhouse",
   narrative:"pendulum", vary:1, sync:1,
   tip:"Modern tech house at its most minimal: a two-note vocal hook that barely moves under a very long, very patient groove, with almost the entire arrangement given over to what drops out rather than what's added. `pendulum` rocks between two notes and slowly widens the gap, which is the real hook's own trick." },

 { id:"losingit", name:"Losing It", artist:"Fisher", year:2018, bpm:125, tonic:9,
   progId:"aeolian", baseTemplate:"techhouse",
   narrative:"chant", vary:0.5, sync:2,
   tip:"A spoken-word sample on one reciting pitch, pushed hard off the beat — the tune is almost entirely rhythm, with pitch doing as little as possible. `chant` writes exactly that: a held reciting note that only moves at phrase ends, syncopated at the harder of the two levels." },

 { id:"stringsoflife", name:"Strings of Life", artist:"Derrick May", year:1987, bpm:130, tonic:9,
   progId:"aeolian", baseTemplate:"techno",
   narrative:"terraced", vary:1, sync:0,
   tip:"The Detroit techno string riff every later 'stab that builds' descends from — it doesn't develop so much as arrive in layers, one string figure stacking on the last. `terraced` states a short figure and restates it a step higher, section by section, which is the same layering trick in miniature." },

 { id:"spastik", name:"Spastik", artist:"Plastikman", year:1993, bpm:135, tonic:0,
   progId:"aeolian", baseTemplate:"techno",
   narrative:"ostinato", vary:0.2, sync:0,
   tip:"Minimal techno reduced to its studs: one hypnotic pattern, barely pitched at all, that runs unchanged for most of the record — the point is the groove's own repetition, not melodic incident. Low variation keeps every pass close to identical, the way the real pattern never really departs from itself." },

 { id:"strobe", name:"Strobe", artist:"deadmau5", year:2009, bpm:128, tonic:8,
   progId:"festival", baseTemplate:"melotech",
   narrative:"archSong", vary:1, sync:0,
   tip:"Ten minutes as one continuous climb rather than a string of sections — the famous two-minute intro is the first quarter of a single arc that only resolves at the drop. `archSong` shapes register the same way across the whole running order instead of per section, which is the one narrative built for a song that is itself one long phrase." },

 { id:"sandstorm", name:"Sandstorm", artist:"Darude", year:2000, bpm:136, tonic:11,
   progId:"festival", baseTemplate:"trance",
   narrative:"motif", vary:1, sync:1,
   tip:"Built from one small, instantly-hummable synth figure restated through every section rather than developed into a longer tune — arguably the most recognisable four-bar idea in dance music precisely because it never becomes anything more complicated. `motif` restates and transforms one short cell the same way, section to section." },

 { id:"silence", name:"Silence", artist:"Delerium ft. Sarah McLachlan", year:2000, bpm:136, tonic:9,
   progId:"festival", baseTemplate:"trance",
   narrative:"wave", vary:1, sync:0,
   tip:"A vocal trance breakdown built on long, slow-breathing phrases that rise and fall without ever quite settling — the emotional centre the trance template's own 32-bar, drum-free breakdown exists to hold. `wave`'s long undulation, wider under the hook, is that same unresolved swell." },

 { id:"greyhound", name:"Greyhound", artist:"Swedish House Mafia", year:2012, bpm:128, tonic:0,
   progId:"festival", baseTemplate:"bigroom",
   narrative:"chordLock", vary:0.5, sync:1,
   tip:"An instrumental main-stage lead: a short stabbing riff that only moves because the chord under it does, rather than a tune with its own contour. `chordLock` snaps every note to the bar's chord tone, so the line spells the changes exactly the way a big-room lead riff does." },

 { id:"dontyouworrychild", name:"Don't You Worry Child", artist:"Swedish House Mafia ft. John Martin", year:2012, bpm:129, tonic:11,
   progId:"festival", baseTemplate:"bigroom",
   narrative:"expand", vary:1, sync:1,
   tip:"Verses kept deliberately narrow and low so the chorus can leap to the top of the octave and stay there — the single most common trick in festival pop, and the reason the hook feels enormous relative to everything around it. `expand` is built for exactly that contrast." },

 { id:"reload", name:"Reload", artist:"Sebastian Ingrosso & Tommy Trash", year:2013, bpm:128, tonic:2,
   progId:"festival", baseTemplate:"proghouse",
   narrative:"terraced", vary:1, sync:0,
   tip:"Progressive house's layer-at-a-time build taken almost to an extreme — each pass adds one element and nothing is removed until the long breakdown. `terraced` restates its figure a step higher each time, which is the same one-thing-at-a-time logic read as a melodic shape instead of an arrangement one." },

 { id:"concreteangel", name:"Concrete Angel", artist:"Gareth Emery ft. Christina Novelli", year:2014, bpm:136, tonic:4,
   progId:"festival", baseTemplate:"proghouse",
   narrative:"climb", vary:1, sync:0,
   tip:"A vocal trance-house record where the emotional lift comes from the register climbing across the whole song rather than from a key change — a cheaper trick than modulating, and one that never announces itself. `climb` sits each section a little higher than the last for exactly that reason." },

 { id:"innercitylife", name:"Inner City Life", artist:"Goldie", year:1994, bpm:172, tonic:7,
   progId:"aeolian", baseTemplate:"dnb",
   narrative:"suspend", vary:1, sync:0,
   tip:"The record that proved drum & bass could carry a soul vocal — atmosphere and ache stated over the breaks before either drop properly lands, matching the dnb template's own 'mood before drop' shape. `suspend` writes a line that keeps landing a step above the chord and resolving down, the ache that keeps a slow melody moving over a fast rhythm section." },

 { id:"scarymonsters", name:"Scary Monsters and Nice Sprites", artist:"Skrillex", year:2010, bpm:140, tonic:7,
   progId:"axisMinor", baseTemplate:"dubstep",
   narrative:"chordLock", vary:0.5, sync:2,
   tip:"The mid-range wobble bass *is* the hook here — the dubstep template's own tip notes that harmony comes out at the drop because the mid-range synth has replaced it, and `chordLock` writes a hard, chord-snapped stutter in that same register instead of a sung line, at the more aggressive syncopation level." },

 { id:"neverbelikeyou", name:"Never Be Like You", artist:"Flume ft. Kai", year:2016, bpm:150, tonic:0,
   progId:"futureBass", baseTemplate:"futurebass", pad:"voice",
   narrative:"gapfill", vary:1, sync:2,
   tip:"Future bass built from a chopped, pitch-bent vocal — leaping to a high note and stepping back down through the gap it just left, the shape that makes a vocal chop read as a hook rather than a glitch. `gapfill` is that leap-then-fill pattern exactly; the voice pad stands in for the sung timbre without repeating its words." },

 { id:"maskoff", name:"Mask Off", artist:"Future", year:2017, bpm:152, tonic:7,
   progId:"axisMinor", baseTemplate:"trap", bass:"subhold", bassVoice:"sub",
   narrative:"ostinato", vary:0.2, sync:1,
   tip:"A trap beat built almost entirely around one short woodwind figure looped for the whole record — the hook barely varies because it doesn't need to; the 808 sub the trap template leaves silent by default is filled in here since the low end carries as much of the track as the riff does." },

 { id:"rerewind", name:"Re-Rewind (The Crowd Say Bo Selecta)", artist:"Artful Dodger ft. Craig David", year:1999, bpm:132, tonic:9,
   progId:"deepHouse", baseTemplate:"garage",
   pat:"shuffle16", swing:0.35,
   narrative:"converse", vary:1, sync:2,
   tip:"UK garage's 2-step skip lives in the shuffle, not the chords — swung sixteenths pulling against a four-on-the-floor sound that isn't actually there. The pattern and swing overrides are what carry that; `converse` writes a narrow, speech-like vocal line with air between phrases, which is how the genre's sung top-lines tend to sit over the skip." },

];

const TRACK_PRESETS = DEFS;

export { TRACK_PRESETS };
