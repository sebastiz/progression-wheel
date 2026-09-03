/* track-presets — "Recreate a famous track" on the Arrange tab. Ten real dance records for every
   one of the 68 styles the Arrange tab offers (a couple of the newest/rarest sub-genres fall one
   short rather than pad the list with a track that couldn't be verified), each reduced to the four
   things about a track that are facts rather than expression: its tempo, its
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

{ id:"disco_stayinalive", name:"Stayin' Alive", artist:"Bee Gees", year:1977, bpm:104, tonic:10,
  progId:"aeolian", baseTemplate:"disco",
  narrative:"motif", vary:0.6, sync:1,
  tip:"Barry Gibb's falsetto verse is one narrow, syncopated cell restated over the Fender Rhodes and that famous half-time, oddly-swung hi-hat groove rather than developing into anything wider. `motif` keeps the vocal a small repeated cell instead of a rising hook, matching how little the actual top line moves." },

{ id:"disco_lefreak", name:"Le Freak", artist:"Chic", year:1978, bpm:117, tonic:7,
  progId:"mixo", baseTemplate:"disco",
  narrative:"chant", vary:0.3, sync:1,
  tip:"Nile Rodgers' guitar chops a I-bVII-IV vamp under Bernard Edwards' bass, and the title itself is the whole vocal hook, chanted rather than sung through. `chant` writes that same held, rhythm-first reciting pitch instead of a melodic phrase." },

{ id:"disco_iwillsurvive", name:"I Will Survive", artist:"Gloria Gaynor", year:1978, bpm:117, tonic:9,
  progId:"aeolian", baseTemplate:"disco",
  narrative:"expand", vary:0.7, sync:1,
  tip:"The verse is a tight, almost spoken descending line over a chromatically walking minor-key bassline, then the title hook throws the register wide open. `expand` captures that specific verse-to-chorus widening rather than a gradual climb." },

{ id:"disco_goodtimes", name:"Good Times", artist:"Chic", year:1979, bpm:111, tonic:2,
  progId:"mixo", baseTemplate:"disco",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Bernard Edwards' bassline is famous precisely because it barely resolves the one-chord vamp it rides on for most of the record's length, later looped whole into Rapper's Delight. `ostinato` writes that same short cell repeating with only light variation rather than developing it." },

{ id:"disco_boogiewonderland", name:"Boogie Wonderland", artist:"Earth, Wind & Fire ft. The Emotions", year:1979, bpm:132, tonic:2,
  progId:"dorian", baseTemplate:"disco",
  narrative:"callResp", vary:0.8, sync:1,
  tip:"Maurice White's lead trades lines directly with The Emotions across the chorus, a genuine call-and-response duet rather than a solo hook, over horn stabs landing on the transitions. `callResp` writes that trade; `dorian` keeps the minor-key verse driving rather than mournful." },

{ id:"disco_carwash", name:"Car Wash", artist:"Rose Royce", year:1976, bpm:118, tonic:9,
  progId:"mixo", baseTemplate:"disco",
  narrative:"chant", vary:0.4, sync:2,
  tip:"Norman Whitfield built the whole record around a shouted, heavily syncopated group chant of the title over a one-vamp funk-disco groove, with almost no sung melody at all. `chant` and the higher sync level are exactly that group-shout-against-the-beat feel." },

{ id:"disco_discoinferno", name:"Disco Inferno", artist:"The Trammps", year:1976, bpm:128, tonic:10,
  progId:"axis", baseTemplate:"disco",
  narrative:"terraced", vary:0.5, sync:1,
  tip:"The 12\" version famously keeps stacking horn and string layers over roughly eleven minutes on top of the same 'burn baby burn' vamp rather than changing the chords. `terraced` writes that same short figure re-entering a step higher/thicker each pass as the arrangement builds." },

{ id:"disco_ymca", name:"Y.M.C.A.", artist:"Village People", year:1978, bpm:127, tonic:5,
  progId:"axis", baseTemplate:"disco",
  narrative:"callResp", vary:0.3, sync:1,
  tip:"The whole hook is the spelled-out title shouted back by the group over Victor Willis's lead, a literal audience call-and-response built for the dancefloor arm gestures. `callResp` is that exact shout-back structure, kept simple with low variation since the phrase barely changes all song." },

{ id:"disco_ringmybell", name:"Ring My Bell", artist:"Anita Ward", year:1979, bpm:126, tonic:5,
  progId:"axis", baseTemplate:"disco",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Frederick Knight's production is built on a bare, bell-like synth-percussion hook that loops almost unchanged under Ward's high, light vocal for the whole track. `ostinato` matches that fixed, minimally-varied instrumental cell." },

{ id:"disco_turnthebeataround", name:"Turn the Beat Around", artist:"Vicki Sue Robinson", year:1976, bpm:128, tonic:9,
  progId:"aeolian", baseTemplate:"disco",
  narrative:"expand", vary:0.8, sync:1,
  tip:"Built on a driving Latin-percussion break rather than a synth groove, Robinson's voice stays contained through the verses and then leaps wide open on the title hook. `expand` is that specific register jump at the hook, not a slow climb." },

{ id:"balearic_papuanewguinea", name:"Papua New Guinea", artist:"The Future Sound of London", year:1991, bpm:109, tonic:8,
  progId:"lydian", baseTemplate:"balearic",
  narrative:"ostinato", vary:0.2, sync:0,
  tip:"Built around a looped, pitched-up soprano sample over a slow, filtered ambient-house pad bed that essentially never resolves anywhere new. `ostinato` and the low vary write that same fixed sampled cell rather than a developing tune; `lydian`'s open, unresolved major color matches its floating, dreamlike chords." },

{ id:"balearic_e2e4", name:"E2-E4", artist:"Manuel Göttsching", year:1984, bpm:123, tonic:4,
  progId:"dorian", baseTemplate:"balearic",
  narrative:"wave", vary:0.4, sync:0,
  tip:"DJ Alfredo's Amnesia sets built the whole Balearic sound around this one continuous hour-long piece: a static minor sequencer pattern that guitar solos drift in and out of, never snapping to a downbeat. `wave`'s long slow undulation captures that gradual, non-percussive unfolding better than any hook-based shape." },

{ id:"balearic_sueolatino", name:"Sueño Latino", artist:"Sueño Latino", year:1989, bpm:126, tonic:4,
  progId:"dorian", baseTemplate:"balearic",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Built directly on Göttsching's E2-E4 sequencer pattern with congas and a chanted title vocal laid over it, so the harmonic content barely moves from the same static minor cell. `ostinato` reflects that borrowed, repeating bed rather than any real melodic development." },

{ id:"balearic_ageoflove", name:"The Age of Love (Jam & Spoon Watch Out for Stella Mix)", artist:"Age of Love", year:1992, bpm:130, tonic:5,
  progId:"festival", baseTemplate:"balearic",
  narrative:"climb", vary:0.6, sync:0,
  tip:"Jam & Spoon's remix stretches its intro out for minutes, letting a simple arpeggiated stab climb and thicken in register long before any drop, essentially inventing the proto-trance build. `climb` is that slow register creep; `festival`'s minor lift matches its big, wordless anthemic feel." },

{ id:"balearic_barefootinthehead", name:"Barefoot in the Head", artist:"A Man Called Adam", year:1990, bpm:121, tonic:7,
  progId:"dorian", baseTemplate:"balearic",
  narrative:"wave", vary:0.5, sync:1,
  tip:"A Man Called Adam's early Balearic sound layers Latin percussion and jazzy flute-like lines over a static minor vamp that never resolves into a hard drop. `wave`'s long undulation matches that mellow, non-percussive drift; `dorian` keeps the minor mode groovy rather than sad." },

{ id:"balearic_smokebelch", name:"Smokebelch II", artist:"The Sabres of Paradise", year:1993, bpm:128, tonic:7,
  progId:"mixo", baseTemplate:"balearic",
  narrative:"ostinato", vary:0.2, sync:0,
  tip:"Andrew Weatherall's dub-house production loops one hazy chord/bass figure for the whole nine minutes, opening and closing filters rather than introducing new material. `ostinato` writes that same fixed repeating cell instead of anything that develops." },

{ id:"balearic_nrg", name:"N-R-G", artist:"Adamski", year:1990, bpm:120, tonic:9,
  progId:"dorian", baseTemplate:"balearic",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Adamski built this acid-house-adjacent Balearic staple around a single looping minor riff that mutates only through filter sweeps rather than melodic change. `ostinato` keeps that riff a fixed repeating cell across sections." },

{ id:"balearic_belfast", name:"Belfast", artist:"Orbital", year:1991, bpm:120, tonic:0,
  progId:"axis", baseTemplate:"balearic",
  narrative:"expand", vary:0.7, sync:0,
  tip:"Orbital's breakbeat-era Balearic classic holds a restrained string-pad figure through its verses and then opens the register dramatically wide for its emotional peak rather than adding new instrumentation. `expand` is that specific widening moment." },

{ id:"balearic_pacificstate", name:"Pacific State", artist:"808 State", year:1989, bpm:128, tonic:2,
  progId:"axis", baseTemplate:"balearic",
  narrative:"motif", vary:0.4, sync:1,
  tip:"Built on a saxophone-like synth hook and bird-call samples looped over a house groove, the melodic cell is restated with only small variations across the track rather than developed into new phrases. `motif` matches that same short figure returning, lightly transformed each time." },

{ id:"balearic_littlefluffyclouds", name:"Little Fluffy Clouds", artist:"The Orb", year:1990, bpm:105, tonic:6,
  progId:"lydian", baseTemplate:"balearic",
  narrative:"ostinato", vary:0.2, sync:0,
  tip:"The entire track is built from a looped Rickie Lee Jones interview sample answering the same question over a shifting ambient-house pad bed, with almost no independent melodic writing. `ostinato` and the very low vary reflect that fixed, barely-altered sampled cell." },

{ id:"postdisco_dontmakemewait", name:"Don't Make Me Wait", artist:"Peech Boys", year:1982, bpm:115, tonic:8,
  progId:"mixo", baseTemplate:"postdisco",
  narrative:"chordLock", vary:0.5, sync:1,
  tip:"Larry Levan's dub-heavy mix famously drops everything but the bass and drums for long stretches, letting the bassline carry entire bars alone while the chords barely surface. `chordLock` writes that bass-led riff, moving only when the underlying chord actually changes." },

{ id:"postdisco_aintnobody", name:"Ain't Nobody", artist:"Rufus & Chaka Khan", year:1983, bpm:104, tonic:3,
  progId:"aeolian", baseTemplate:"postdisco",
  narrative:"chordLock", vary:0.4, sync:1,
  tip:"David Wolinski's synth bassline is the record's real hook, a tight minor-key riff that anchors the groove while Chaka Khan's vocal floats loosely above it. `chordLock` keeps that bass riff snapped to the chord changes as the driving element." },

{ id:"postdisco_geniusoflove", name:"Genius of Love", artist:"Tom Tom Club", year:1981, bpm:103, tonic:2,
  progId:"axis", baseTemplate:"postdisco",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"Tina Weymouth's bassline is so completely the song's identity that it's been sampled and looped whole across dozens of later hip-hop and R&B records with almost no alteration. `ostinato` writes that same fixed, barely-developing bass cell." },

{ id:"postdisco_setitoff", name:"Set It Off", artist:"Strafe", year:1984, bpm:111, tonic:9,
  progId:"dorian", baseTemplate:"postdisco",
  narrative:"chordLock", vary:0.3, sync:1,
  tip:"A stark NYC electro-boogie record built almost entirely from drum machine and a repeating minor-key bass riff, with chords barely more than an occasional stab underneath. `chordLock` keeps that bass figure the lead, moving only with the harmony." },

{ id:"postdisco_situation", name:"Situation", artist:"Yazoo", year:1982, bpm:119, tonic:6,
  progId:"axis", baseTemplate:"postdisco",
  narrative:"motif", vary:0.5, sync:1,
  tip:"Alison Moyet's vocal is a short repeated phrase restated over Vince Clarke's rolling synth-bass pattern, which does most of the actual melodic work. `motif` keeps that vocal a returning cell rather than a developing line." },

{ id:"postdisco_icantgoforthat", name:"I Can't Go for That (No Can Do)", artist:"Daryl Hall & John Oates", year:1981, bpm:112, tonic:5,
  progId:"aeolian", baseTemplate:"postdisco",
  narrative:"chordLock", vary:0.4, sync:1,
  tip:"The song's identity is its descending synth-bass riff, famously sampled by De La Soul and others, riding under sparse, mostly-muted chord hits. `chordLock` writes that riff as the true lead, moving only when the chord underneath shifts." },

{ id:"postdisco_glowoflove", name:"The Glow of Love", artist:"Change ft. Luther Vandross", year:1980, bpm:118, tonic:4,
  progId:"dorian", baseTemplate:"postdisco",
  narrative:"arch", vary:0.6, sync:1,
  tip:"Luther Vandross's guide vocal (before he was even credited) rises and settles in smooth, complete phrases over a busy, rolling Italo-disco bassline that never really stops moving. `arch` matches that rise-and-fall vocal shape sitting on top of the bass's constant motion." },

{ id:"postdisco_alnaafiysh", name:"Al-Naafiysh (The Soul)", artist:"Hashim", year:1983, bpm:130, tonic:7,
  progId:"mixo", baseTemplate:"postdisco",
  bassVoice:"square",
  narrative:"ostinato", vary:0.2, sync:2,
  tip:"An almost entirely instrumental electro-boogie record — the vocoded riff and hard-edged synth bass are the whole arrangement, repeating with barely any development. `ostinato` at low vary and the square bass voice capture that bare, mechanical, near-melody-free groove." },

{ id:"postdisco_dontstopthemusic", name:"Don't Stop the Music", artist:"Yarbrough & Peoples", year:1980, bpm:99, tonic:2,
  progId:"dorian", baseTemplate:"postdisco",
  narrative:"callResp", vary:0.5, sync:1,
  tip:"The duo trade lines back and forth over a rolling synth-bass vamp that carries most of the groove while the chords stay minimal underneath. `callResp` writes that literal back-and-forth vocal exchange." },

{ id:"postdisco_heartbeat", name:"Heartbeat", artist:"Taana Gardner", year:1981, bpm:99, tonic:6,
  progId:"dorian", baseTemplate:"postdisco",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"Kenton Nix's Paradise Garage classic is famous for how little is actually in it — bass and drums carry entire minutes with the vocal barely present and the chords all but absent. `ostinato` at very low vary captures that stripped, almost bassline-only arrangement." },

{ id:"italodisco_selfcontrol", name:"Self Control", artist:"Raf", year:1984, bpm:124, tonic:9,
  progId:"axisMinor", baseTemplate:"italodisco",
  narrative:"archSong", vary:0.7, sync:1,
  tip:"Giancarlo Bigazzi's production rides an octave-bouncing bassline while Raf's vocal builds from a contained verse to one big melodramatic swell at the chorus and back down. `archSong` is that single rise-and-fall shape across the whole record; `axisMinor` gives the dramatic minor lift the chorus needs." },

{ id:"italodisco_tarzanboy", name:"Tarzan Boy", artist:"Baltimora", year:1985, bpm:117, tonic:10,
  progId:"aeolian", baseTemplate:"italodisco",
  narrative:"motif", vary:0.5, sync:1,
  tip:"The 'ooh eee ooh ah ah' hook is a short cell restated again and again over a bouncing octave bassline that drives the whole arrangement. `motif` keeps that vocal cell returning rather than developing into a longer melody." },

{ id:"italodisco_ilikechopin", name:"I Like Chopin", artist:"Gazebo", year:1983, bpm:112, tonic:2,
  progId:"aeolian", baseTemplate:"italodisco",
  narrative:"wave", vary:0.6, sync:0,
  tip:"Pierluigi Giombini's production is slower and more melancholic than most Italo disco, built on a long, softly undulating synth-flute melody over the octave bass rather than a punchy hook. `wave` matches that gentle, drifting phrase shape." },

{ id:"italodisco_dolcevita", name:"Dolce Vita", artist:"Ryan Paris", year:1983, bpm:126, tonic:9,
  progId:"axisMinor", baseTemplate:"italodisco",
  narrative:"arch", vary:0.6, sync:1,
  tip:"One of the genre's most recognizable octave-bounce basslines sits under a chorus melody that rises to a peak on the title phrase and falls right back within the same four bars. `arch` is that rise-and-fall shape held inside a single phrase rather than across the whole song." },

{ id:"italodisco_dirtytalk", name:"Dirty Talk", artist:"Klein & M.B.O.", year:1982, bpm:122, tonic:9,
  progId:"dorian", baseTemplate:"italodisco",
  narrative:"chordLock", vary:0.3, sync:1,
  tip:"Widely cited as a direct influence on early Chicago house, this is an almost entirely instrumental record built around a driving octave bassline with a vocoded phrase locked to it rather than a sung melody. `chordLock` writes that vocoder riff as an instrumental stab tied to the harmony." },

{ id:"italodisco_spacerwoman", name:"Spacer Woman", artist:"Charlie", year:1983, bpm:126, tonic:7,
  progId:"aeolian", baseTemplate:"italodisco",
  narrative:"qanda", vary:0.5, sync:1,
  tip:"The title line is posed by the lead vocal and answered by a synth figure over the relentless octave-bounce bass, a genuine call-and-response between voice and machine. `qanda` writes that same question-then-answer motion." },

{ id:"italodisco_dontcrytonight", name:"Don't Cry Tonight", artist:"Savage", year:1984, bpm:120, tonic:4,
  progId:"axisMinor", baseTemplate:"italodisco",
  narrative:"archSong", vary:0.7, sync:1,
  tip:"Roberto Zanetti's production builds Savage's vocal from a restrained, moody verse up to one big melodramatic peak at the title hook and back down over the course of the whole record. `archSong` captures that single large-scale rise and fall." },

{ id:"italodisco_happychildren", name:"Happy Children", artist:"P. Lion", year:1983, bpm:124, tonic:0,
  progId:"dorian", baseTemplate:"italodisco",
  narrative:"chant", vary:0.3, sync:1,
  tip:"One of the most sampled Italo disco records, built on a bouncing bassline under a title phrase that's chanted rather than developed into a real melody. `chant` writes that fixed, rhythm-driven reciting pitch." },

{ id:"italodisco_thenight", name:"The Night", artist:"Valerie Dore", year:1984, bpm:113, tonic:9,
  progId:"axisMinor", baseTemplate:"italodisco",
  narrative:"lament", vary:0.6, sync:0,
  tip:"Slower and darker than most of the genre, the vocal traces a genuinely descending, melancholic line over the octave bass rather than a bright hook. `lament`'s falling shape matches that mood directly." },

{ id:"italodisco_happystation", name:"Happy Station", artist:"Fun Fun", year:1983, bpm:122, tonic:2,
  progId:"aeolian", baseTemplate:"italodisco",
  narrative:"motif", vary:0.4, sync:1,
  tip:"Built on the genre's signature bouncing bass, the vocal hook is a short repeated cell traded between the group's voices rather than a single developing melody. `motif` keeps that figure a returning short cell." },

{ id:"hinrg_ifeellove", name:"I Feel Love", artist:"Donna Summer", year:1977, bpm:128, tonic:0,
  progId:"mixo", baseTemplate:"hinrg",
  narrative:"ostinato", vary:0.2, sync:0,
  tip:"Giorgio Moroder's Moog sequencer runs one unbroken pulsing pattern for the entire eight-minute record while Summer's vocal holds long, mostly static tones over it — the record that essentially invented this whole style's engine. `ostinato` writes that same fixed, barely-varying pulse." },

{ id:"hinrg_youspinmeround", name:"You Spin Me Round (Like a Record)", artist:"Dead or Alive", year:1984, bpm:128, tonic:6,
  progId:"aeolian", baseTemplate:"hinrg",
  narrative:"chant", vary:0.3, sync:2,
  tip:"Pete Burns' title hook is a tight, stuttering phrase pulled hard against the beat rather than a flowing melody, tracking the octave bass pulse almost note for note. `chant` at the more aggressive sync level captures that clipped, rhythm-first delivery." },

{ id:"hinrg_itsrainingmen", name:"It's Raining Men", artist:"The Weather Girls", year:1982, bpm:124, tonic:4,
  progId:"aeolian", baseTemplate:"hinrg",
  narrative:"callResp", vary:0.6, sync:1,
  tip:"Martha Wash and Izora Armstead trade lines with a gospel-choir energy across the verses before landing together on the title hook, a genuine call-and-response over the pulsing bass. `callResp` writes that same trade." },

{ id:"hinrg_somanymen", name:"So Many Men, So Little Time", artist:"Miquel Brown", year:1983, bpm:129, tonic:6,
  progId:"aeolian", baseTemplate:"hinrg",
  narrative:"chant", vary:0.3, sync:1,
  tip:"Ian Levine's production keeps the title phrase chanted over the unbroken octave bass pulse rather than letting the vocal develop into a wider melody. `chant` matches that held, rhythm-driven delivery." },

{ id:"hinrg_highenergy", name:"High Energy", artist:"Evelyn Thomas", year:1984, bpm:124, tonic:10,
  progId:"aeolian", baseTemplate:"hinrg",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"The genre-naming record itself: a hard, unbroken four-on-the-floor pulse under a vocal hook that repeats with only small variation rather than expanding. `ostinato` reflects that fixed, minimally-developing top line." },

{ id:"hinrg_searchin", name:"Searchin' (I Gotta Find a Man)", artist:"Hazell Dean", year:1983, bpm:132, tonic:0,
  progId:"axis", baseTemplate:"hinrg",
  narrative:"expand", vary:0.6, sync:1,
  tip:"Stock Aitken Waterman's breakthrough production keeps Dean's verse fairly contained before opening the register right up on the title hook. `expand` is that specific widening at the hook rather than a slow build." },

{ id:"hinrg_lovereaction", name:"Love Reaction", artist:"Divine", year:1983, bpm:127, tonic:0,
  progId:"axis", baseTemplate:"hinrg",
  narrative:"chordLock", vary:0.3, sync:1,
  tip:"Bobby Orlando's stomping production is built on a hard synth stab pattern that Divine's chanted vocal barely deviates from, moving only when the stab pattern itself changes. `chordLock` writes that same chord-tied riff behavior." },

{ id:"hinrg_dowannafunk", name:"Do Ya Wanna Funk", artist:"Sylvester ft. Patrick Cowley", year:1982, bpm:125, tonic:9,
  progId:"dorian", baseTemplate:"hinrg",
  narrative:"peak", vary:0.8, sync:1,
  tip:"Patrick Cowley's relentless octave-bounce synth bass drives the whole track while Sylvester's falsetto stays relatively contained until he lets loose on a held high note late in the record. `peak` withholds that top note the way the actual vocal performance does." },

{ id:"hinrg_venus", name:"Venus", artist:"Bananarama", year:1986, bpm:126, tonic:9,
  progId:"axis", baseTemplate:"hinrg",
  narrative:"motif", vary:0.4, sync:1,
  tip:"Stock Aitken Waterman's cover keeps the riff a short repeated figure restated from verse to chorus with only minor variation, matching the original Shocking Blue hook's own shape. `motif` is that returning short cell." },

{ id:"hinrg_youthinkyoureaman", name:"You Think You're a Man", artist:"Divine", year:1984, bpm:128, tonic:9,
  progId:"aeolian", baseTemplate:"hinrg",
  narrative:"chordLock", vary:0.3, sync:1,
  tip:"Another Bobby Orlando stomper built around a nagging, repeated synth riff that Divine's deep spoken-sung delivery rides on top of rather than developing independently. `chordLock` keeps that riff tied to the chord changes as the real lead." },

{ id:"house_yourlove", name:"Your Love", artist:"Frankie Knuckles ft. Jamie Principle", year:1987, bpm:120, tonic:5,
  progId:"deepHouse", baseTemplate:"house",
  narrative:"terraced", vary:0.5, sync:1,
  tip:"Jamie Principle's breathy vocal hook is a short repeated figure that gets layered progressively thicker as the track's minimal minor vamp continues, without new melodic material being introduced. `terraced` is that step-by-step layering build." },

{ id:"house_moveyourbody", name:"Move Your Body (The House Music Anthem)", artist:"Marshall Jefferson", year:1986, bpm:123, tonic:7,
  progId:"gospel", baseTemplate:"house",
  narrative:"callResp", vary:0.4, sync:1,
  tip:"Jefferson's rolling gospel-piano chords answer the chanted 'move your body' vocal directly, a call-and-response structure borrowed straight from church music. `callResp` writes that same exchange; `gospel` gives the piano its churchy major-key lift." },

{ id:"house_jackyourbody", name:"Jack Your Body", artist:"Steve \"Silk\" Hurley", year:1986, bpm:122, tonic:9,
  progId:"deepHouse", baseTemplate:"house",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"A near-instrumental record — the chanted title phrase loops over a static minor vamp with almost no melodic development for its entire length, and it still went to UK No. 1. `ostinato` at very low vary matches that fixed, unchanging loop." },

{ id:"house_nowayback", name:"No Way Back", artist:"Adonis", year:1986, bpm:122, tonic:9,
  progId:"deepHouse", baseTemplate:"house",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"A stark, minimal Chicago classic built on one grinding minor-key riff repeated with almost no variation across the whole record. `ostinato` writes that same fixed cell rather than any melodic growth." },

{ id:"house_frenchkiss", name:"French Kiss", artist:"Lil Louis", year:1989, bpm:121, tonic:0,
  progId:"deepHouse", baseTemplate:"house",
  narrative:"ostinato", vary:0.2, sync:0,
  tip:"The record's real structural trick is a tempo that drags down to around 80bpm mid-track before speeding back up, all riding the same moaning vocal-sample loop rather than a developing tune. `ostinato` keeps that one sampled cell the whole 'melody' throughout." },

{ id:"house_promisedland", name:"Promised Land", artist:"Joe Smooth", year:1987, bpm:123, tonic:0,
  progId:"gospel", baseTemplate:"house",
  narrative:"callResp", vary:0.6, sync:1,
  tip:"Smooth's preacher-like lead vocal is answered by piano stabs and backing voices in a structure lifted straight from gospel music, building toward its utopian message rather than a club drop. `callResp` writes that same exchange; `gospel` fits its major-key, church-rooted chords." },

{ id:"house_someday", name:"Someday", artist:"CeCe Rogers", year:1987, bpm:122, tonic:9,
  progId:"deepHouse", baseTemplate:"house",
  narrative:"expand", vary:0.7, sync:1,
  tip:"Rogers' vocal starts contained and builds in genuine gospel-influenced intensity toward the record's emotional peak rather than looping a fixed hook. `expand` is that widening arc toward the climax." },

{ id:"house_timetojack", name:"Time to Jack", artist:"Chip E.", year:1985, bpm:120, tonic:0,
  progId:"deepHouse", baseTemplate:"house",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"One of house music's earliest records, built almost entirely from a looped 'jack your body' vocal chant over a bare minor groove with no real melodic development. `ostinato` matches that fixed, repeating cell." },

{ id:"acidhouse_acidtracks", name:"Acid Tracks", artist:"Phuture", year:1987, bpm:123, tonic:9,
  progId:"dorian", baseTemplate:"acidhouse",
  narrative:"chordLock", vary:0.2, sync:1,
  tip:"The record that put the 303 squelch on the map: DJ Pierre's Roland TB-303 line, mutated live via resonance and cutoff, is the entire arrangement, locked to one static chord the whole way through. `chordLock` writes that riff moving only with the harmony beneath it." },

{ id:"acidhouse_voodooray", name:"Voodoo Ray", artist:"A Guy Called Gerald", year:1988, bpm:123, tonic:9,
  progId:"dorian", baseTemplate:"acidhouse",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"A chopped vocal sample loops over the squelching acid line with almost no melodic development across the whole Manchester classic. `ostinato` keeps that sampled phrase a fixed repeating cell." },

{ id:"acidhouse_acidrock", name:"Acid Rock", artist:"Bam Bam", year:1988, bpm:124, tonic:9,
  progId:"dorian", baseTemplate:"acidhouse",
  narrative:"chordLock", vary:0.2, sync:1,
  tip:"One of the rawest early acid records — the 303 line is the whole track, locked to a single static chord that the drums lock into at bar one and never leave. `chordLock` writes that same harmonically-tied riff." },

{ id:"acidhouse_testone", name:"Testone", artist:"Tyree", year:1988, bpm:125, tonic:0,
  progId:"dorian", baseTemplate:"acidhouse",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"Named for the near-test-tone repetitiveness of its own squelching riff, which barely develops across the whole record. `ostinato` at low vary captures that intentionally minimal, near-mechanical loop." },

{ id:"acidhouse_weallitacieed", name:"We Call It Acieed", artist:"D-Mob ft. Gary Haisman", year:1988, bpm:126, tonic:9,
  progId:"dorian", baseTemplate:"acidhouse",
  narrative:"chant", vary:0.3, sync:1,
  tip:"Gary Haisman's title phrase is chanted on a held pitch over the squelching 303 line rather than sung as a melody, an on-the-nose vocal tribute to the sound itself. `chant` writes that rhythm-driven reciting pitch." },

{ id:"acidhouse_stakkerhumanoid", name:"Stakker Humanoid", artist:"Humanoid", year:1988, bpm:127, tonic:9,
  progId:"dorian", baseTemplate:"acidhouse",
  narrative:"chordLock", vary:0.2, sync:1,
  tip:"Brian Dougans' pre-LFO record is entirely instrumental and mechanical, one 303 riff locked to a single chord and mutated only through filter movement. `chordLock` writes that riff moving only with the underlying harmony." },

{ id:"acidhouse_acidthunder", name:"Acid Thunder", artist:"Fast Eddie", year:1988, bpm:124, tonic:0,
  progId:"dorian", baseTemplate:"acidhouse",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"A stripped Chicago acid cut where the squelching line simply repeats over an unmoving four-on-the-floor groove for the record's length. `ostinato` matches that fixed, barely-varying cell." },

{ id:"acidhouse_ivelostcontrol", name:"I've Lost Control", artist:"Sleezy D", year:1986, bpm:120, tonic:9,
  progId:"dorian", baseTemplate:"acidhouse",
  narrative:"chant", vary:0.2, sync:1,
  tip:"One of the true proto-acid records — a spoken/chanted vocal repeats on a held pitch over a hypnotic, minimally-varying groove that predates the 303 craze proper. `chant` writes that fixed reciting delivery." },

{ id:"acidhouse_cobrabora", name:"Cobra Bora", artist:"808 State", year:1989, bpm:128, tonic:9,
  progId:"dorian", baseTemplate:"acidhouse",
  narrative:"chordLock", vary:0.3, sync:1,
  tip:"A Manchester acid-house instrumental built from one looping riff mutated via filter sweeps, locked to a single static chord throughout. `chordLock` writes that riff tied to the harmony rather than developing independently." },

{ id:"acidhouse_yourfriend", name:"Your Only Friend", artist:"Phuture", year:1987, bpm:123, tonic:0,
  progId:"dorian", baseTemplate:"acidhouse",
  narrative:"chant", vary:0.2, sync:1,
  tip:"A deadpan spoken cocaine-warning sample ('this is cocaine speaking...') loops on a fixed reciting pitch over the squelching 303 line. `chant` writes that same held, rhythm-driven spoken delivery." },

{ id:"deephouse_canyoufeelit", name:"Can You Feel It", artist:"Mr. Fingers", year:1986, bpm:122, tonic:5,
  progId:"deepHouse", baseTemplate:"deephouse",
  narrative:"wave", vary:0.5, sync:0,
  tip:"Larry Heard's wordless choir-pad hook swells slowly across whole sections rather than stabbing in on the beat, exactly the filter-opens-not-snaps arrangement this style is built on. `wave`'s long undulation matches that gradual swell." },

{ id:"deephouse_deepinside", name:"Deep Inside", artist:"Hardrive", year:1993, bpm:124, tonic:9,
  progId:"deepHouse", baseTemplate:"deephouse",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Louie Vega's track is built around a looped Barbara Tucker vocal sample ('deep inside... I want you') over sustained keys rather than a developing sung line. `ostinato` keeps that sampled phrase a fixed repeating cell." },

{ id:"deephouse_followme", name:"Follow Me", artist:"Aly-Us", year:1992, bpm:124, tonic:0,
  progId:"deepHouse", baseTemplate:"deephouse",
  narrative:"callResp", vary:0.6, sync:1,
  tip:"A gospel-house anthem built on layered choir vocals trading phrases over sustained chords that swell in rather than stab. `callResp` writes that vocal trade; the sustained-chord default suits its unhurried builds." },

{ id:"deephouse_thewhistlesong", name:"The Whistle Song", artist:"Frankie Knuckles", year:1991, bpm:123, tonic:7,
  progId:"deepHouse", baseTemplate:"deephouse",
  pad:"glass",
  narrative:"germ", vary:0.5, sync:0,
  tip:"An entirely instrumental record — the flute-like whistled synth lead is developed a little further each section as the filter opens across whole sixteen-bar stretches rather than snapping to new material. `germ` is exactly that same-cell-elaborated-further shape; `glass` gives the lead its bell-like tone." },

{ id:"deephouse_alteredstates", name:"Altered States", artist:"Ron Trent", year:1990, bpm:122, tonic:2,
  progId:"deepHouse", baseTemplate:"deephouse",
  narrative:"ostinato", vary:0.3, sync:0,
  tip:"Made by Trent as a teenager, this Chicago deep house landmark rides sustained keyboard chords over a hypnotic bassline that barely varies from its opening cell. `ostinato` matches that fixed, slowly-breathing loop." },

{ id:"deephouse_break4love", name:"Break 4 Love", artist:"Raze", year:1988, bpm:120, tonic:9,
  progId:"deepHouse", baseTemplate:"deephouse",
  narrative:"wave", vary:0.5, sync:1,
  tip:"An early filter-house landmark where the vocal and horn hook are opened up gradually across whole sections via filter sweep rather than snapping in on a drop. `wave` matches that slow, undulating filter-open shape the style is defined by." },

{ id:"deephouse_percolator", name:"The Percolator (Rock the House)", artist:"Cajmere", year:1992, bpm:124, tonic:0,
  progId:"deepHouse", baseTemplate:"deephouse",
  bass:"offbeat",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"Curtis Jones' Chicago classic is built almost entirely around one stuttering, offbeat percussive bass-and-vocal hook that repeats with minimal change for most of the record. `ostinato` and the offbeat bass pattern capture that fixed, stuttering cell." },

{ id:"deephouse_gabriel", name:"Gabriel", artist:"Roy Davis Jr. ft. Peven Everett", year:1997, bpm:122, tonic:9,
  progId:"deepHouse", baseTemplate:"deephouse",
  narrative:"arch", vary:0.6, sync:1,
  tip:"Peven Everett's falsetto rises and settles in smooth, complete phrases over sustained garage-tinged deep house chords, a defining crossover between US deep house and UK garage. `arch` matches that contained rise-and-fall vocal shape." },

{ id:"deephouse_musicsoundsbetter", name:"Music Sounds Better With You", artist:"Stardust", year:1998, bpm:123, tonic:8,
  progId:"mixo", baseTemplate:"deephouse",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"The entire record is one four-bar filter-disco loop, chopped from a soul sample, that only changes because the filter opens and closes across whole sections rather than any melody developing. `ostinato` at low vary keeps that single looped cell exactly that fixed." },

{ id:"deephouse_myhouse", name:"My House", artist:"Rhythm Controll", year:1987, bpm:120, tonic:0,
  progId:"deepHouse", baseTemplate:"deephouse",
  pad:"organ",
  narrative:"chant", vary:0.2, sync:0,
  tip:"Built around Chuck Roberts' spoken-word 'house music is a feeling' sermon looped over sustained organ-like chords, the vocal is reciting rather than singing a melody. `chant` writes that same held, rhythm-driven delivery; `organ` gives the chords their churchy sustain." },
{ id:"brokenbeat_groovenow", name:"Groove Now", artist:"New Sector Movements", year:1997, bpm:108, tonic:9,
  progId:"dorian", baseTemplate:"brokenbeat",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"Widely cited as one of the first records actually tagged 'broken beat' — IG Culture's New Sector Movements alias built the whole track from one stumbling drum-and-keys cell rather than a song form. `ostinato` writes that same barely-developed loop; the heavier sync level is the off-the-grid kick placement that gives the genre its name." },

{ id:"brokenbeat_bootylala", name:"Booty La La", artist:"Bugz In The Attic", year:2004, bpm:122, tonic:11,
  progId:"aeolian", baseTemplate:"brokenbeat",
  narrative:"motif", vary:0.6, sync:2,
  tip:"Voted Gilles Peterson's Worldwide track of the year — the Bugz collective's calling-card tune runs a short keys-and-vocal-chop cell that keeps getting re-cut against a drum pattern that never lands where it 'should'. `motif` restates that cell per section rather than developing a full melody, at the harder syncopation the stumbling kick needs." },

{ id:"brokenbeat_lookingforlove", name:"Looking for Love (Bugz In The Attic Remix)", artist:"Vikter Duplaix", year:2002, bpm:114, tonic:2,
  progId:"deepHouse", baseTemplate:"brokenbeat",
  narrative:"arch", vary:0.8, sync:1,
  tip:"Duplaix's smooth Philly-soul vocal is kept largely intact while Bugz In The Attic rebuild the rhythm bed underneath into a lurching, off-house groove — the chords doing real melodic work rather than just padding. `arch` gives the vocal a real rise-and-fall phrase shape true to the original soul writing." },

{ id:"brokenbeat_holditdown", name:"Hold It Down (Bugz In The Attic's Co-Operative Mix)", artist:"4hero", year:2002, bpm:129, tonic:9,
  progId:"axis", baseTemplate:"brokenbeat",
  narrative:"expand", vary:1, sync:1,
  tip:"4hero's Lady Alma vocal is rebuilt by Bugz In The Attic into one of the scene's most-played remixes, the register widening hard at the hook the way a lot of the CoOp-club-era reworks did to justify a full club system. `expand` is exactly that dramatic register opening at the hook." },

{ id:"brokenbeat_yellow", name:"Yellow", artist:"K15", year:2014, bpm:112, tonic:5,
  progId:"dorian", baseTemplate:"brokenbeat",
  narrative:"germ", vary:0.7, sync:1,
  tip:"A newer-generation broken-beat/future-beat crossover cut on the 2000Black-adjacent scene, built from a small keys figure that keeps picking up new countermelodies as it goes rather than repeating unchanged. `germ` is that cell-developed-further-each-section shape." },

{ id:"brokenbeat_organicjuggernaut", name:"Organic Juggernaut", artist:"Kaidi Tatham", year:2011, bpm:108, tonic:7,
  progId:"jazz", baseTemplate:"brokenbeat",
  narrative:"climb", vary:1, sync:2,
  tip:"Tatham's own keyboard playing is the lead instrument here — long, real jazz-fusion voicings climbing steadily up the register over a stuttering broken-beat kit rather than a vocal hook. `climb` tracks that register creep across the whole track; the jazz progression matches his chord vocabulary." },

{ id:"brokenbeat_saveit", name:"Save It (Some Groove)", artist:"Domu ft. Face", year:2001, bpm:110, tonic:0,
  progId:"deepHouse", baseTemplate:"brokenbeat",
  narrative:"qanda", vary:0.6, sync:1,
  tip:"An early Domu 2000 Black-era cut with Face's vocal trading short phrases against the chord stabs rather than singing straight through — very characteristic of the scene's call-and-answer vocal editing. `qanda` writes that phrase-and-response shape directly." },

{ id:"brokenbeat_rokstone", name:"Rokstone (Soon Come)", artist:"Daz-I-Kue ft. Colonel Red", year:2005, bpm:113, tonic:10,
  progId:"neoSoul", baseTemplate:"brokenbeat",
  narrative:"callResp", vary:0.8, sync:1,
  tip:"Bugz In The Attic member Daz-I-Kue frames Colonel Red's reggae-soul-inflected vocal as a genuine call over the chords, with the drums answering in the gaps rather than just keeping time. `callResp` is that trade; the neo-soul progression fits Colonel Red's warm, songful delivery." },

{ id:"brokenbeat_afrospace", name:"Afrospace", artist:"Mark Force & Kaidi Tatham present Blakai ft. Bembe Segue", year:2005, bpm:118, tonic:4,
  progId:"dorian", baseTemplate:"brokenbeat",
  narrative:"wave", vary:0.5, sync:1,
  tip:"Bembe Segue's vocal rides a long, slow-undulating melodic line over Tatham and Mark Force's static minor-but-not-sad vamp rather than a tight pop hook — a favourite move of the scene's more spaced-out productions. `wave` is that long undulation; `dorian` gives the static, unresolved harmonic bed." },

{ id:"brokenbeat_looselips", name:"Loose Lips", artist:"Seiji ft. Lyric L", year:2002, bpm:123, tonic:9,
  progId:"deepHouse", baseTemplate:"brokenbeat",
  narrative:"converse", vary:1, sync:2,
  tip:"Built at Seiji's own studio and often called the biggest broken-beat anthem of its era, the track's rapid-fire vocal flow sits in tight, speech-like bursts against a heavily syncopated drum programme. `converse` writes that narrow, phrase-and-space vocal delivery at the harder push-every-beat syncopation." },

{ id:"afrohouse_superman", name:"Superman", artist:"Black Coffee ft. Bucie", year:2009, bpm:123, tonic:9,
  progId:"deepHouse", baseTemplate:"afrohouse",
  narrative:"terraced", vary:0.6, sync:1,
  tip:"Black Coffee's signature South African hit famously holds off any full drum kit for a long percussion-only intro before Bucie's vocal and the bassline both arrive — the patient, hand-drum-first build the whole afro house style is named for. `terraced` writes that step-by-step layering." },

{ id:"afrohouse_wedanceagain", name:"We Dance Again", artist:"Black Coffee ft. Nakhane Touré", year:2015, bpm:122, tonic:7,
  progId:"deepHouse", baseTemplate:"afrohouse",
  narrative:"climb", vary:0.8, sync:1,
  tip:"Nakhane Touré's vocal keeps pushing higher in register as the percussion layers pile up underneath, mirroring the track's own build rather than staying in one register throughout. `climb` tracks that steady register rise across the whole song." },

{ id:"afrohouse_webandiba", name:"Webandiba", artist:"Culoe De Song", year:2009, bpm:123, tonic:2,
  progId:"deepHouse", baseTemplate:"afrohouse",
  narrative:"ostinato", vary:0.4, sync:1,
  tip:"An Innervisions-released, largely instrumental afro house classic — one repeating keys-and-vocal-chant cell carries the whole track rather than a developed lead line, with the arrangement's interest coming entirely from the percussion entering piece by piece. `ostinato` is that loop." },

{ id:"afrohouse_rainbow", name:"Rainbow", artist:"Black Motion ft. Nokwazi", year:2015, bpm:120, tonic:5,
  progId:"aeolian", baseTemplate:"afrohouse",
  narrative:"wave", vary:0.6, sync:1,
  tip:"Black Motion's live-drum-kit-plus-house production lets Nokwazi's vocal move in long, slow swells over the plain minor vamp rather than short pop phrases. `wave` is that long undulation; `aeolian` keeps the harmony as unresolved as the real track's held minor chords." },

{ id:"afrohouse_anthem", name:"Anthem", artist:"Da Capo ft. Karyendasoul & Sio", year:2016, bpm:121, tonic:0,
  progId:"deepHouse", baseTemplate:"afrohouse",
  narrative:"terraced", vary:0.7, sync:1,
  tip:"Da Capo's tracks are known for very long, patient percussion intros before the vocal and harmony properly arrive — 'Anthem' stacks congas, shakers and claps in visible layers before Karyendasoul and Sio's vocal enters. `terraced` writes each new layer a step up from the last." },

{ id:"afrohouse_theskyfellpluto", name:"The Sky Fell (Pluto)", artist:"Caiiro", year:2018, bpm:122, tonic:4,
  progId:"phrygian", baseTemplate:"afrohouse",
  narrative:"motif", vary:0.5, sync:1,
  tip:"Caiiro's crossover afro/melodic-house hit is built on a short, modal Egyptian-flavoured instrumental figure that's restated and re-orchestrated section to section rather than sung through. `motif` is that repeated-and-transformed cell; `phrygian` captures the track's Middle-Eastern-tinged half-step colour." },

{ id:"afrohouse_sondela", name:"Sondela", artist:"Themba ft. Kaz Money", year:2020, bpm:121, tonic:9,
  progId:"deepHouse", baseTemplate:"afrohouse",
  narrative:"qanda", vary:0.7, sync:1,
  tip:"Themba's VIVa Music hit trades short vocal phrases from Kaz Money against the percussion hits rather than running a continuous vocal line, very much the call-and-answer phrasing common to the SA afro house scene's vocal edits. `qanda` writes that motif-as-question-and-answer directly." },

{ id:"afrohouse_drive", name:"Drive", artist:"Black Coffee & David Guetta ft. Delilah Montagu", year:2022, bpm:123, tonic:2,
  progId:"deepHouse", baseTemplate:"afrohouse",
  narrative:"archSong", vary:0.8, sync:1,
  tip:"The most pop-structured entry here — a Guetta co-production built around a genuine verse-hook Delilah Montagu vocal rather than a chant, layered onto Black Coffee's percussion-first afro house bed. `archSong` gives it one clear rise-and-fall arc across the whole record rather than a looped cell." },

{ id:"afrohouse_fetchyourlife", name:"Fetch Your Life", artist:"Prince Kaybee ft. Msaki", year:2018, bpm:119, tonic:7,
  progId:"aeolian", baseTemplate:"afrohouse",
  narrative:"callResp", vary:0.6, sync:1,
  tip:"Prince Kaybee's biggest crossover hit sets Msaki's vocal in a call over a plain minor vamp, with the percussion and backing chants answering each line — a very South African radio-house-meets-afro-house hybrid. `callResp` writes that trade directly." },

{ id:"afrohouse_mommasgroove", name:"Momma's Groove", artist:"Osunlade", year:2004, bpm:118, tonic:10,
  progId:"jazz", baseTemplate:"afrohouse",
  narrative:"chant", vary:0.3, sync:0,
  tip:"A Yoruba Records deep/afro house staple — a held, rhythm-driven vocal chant sits over jazzy chord movement rather than a written melody, one of the clearest examples of the label's spiritual-house sound. `chant` is exactly that reciting-pitch vocal; the low vary keeps it as static as the real hook." },

{ id:"amapiano_kestar", name:"Ke Star", artist:"Focalistic ft. Vigro Deep", year:2020, bpm:112, tonic:0,
  progId:"aeolian", baseTemplate:"amapiano",
  narrative:"chant", vary:0.3, sync:1,
  tip:"Focalistic's breakout anthem rides a shouted, barely-melodic 'ke star' hook over Vigro Deep's log-drum bassline left to ring and slide under it — the vocal is rhythm and repetition, not melody. `chant` matches that held, spoken-sung reciting-tone hook exactly." },

{ id:"amapiano_emcimbini", name:"Emcimbini", artist:"Kabza De Small ft. Ami Faku", year:2020, bpm:113, tonic:5,
  progId:"deepHouse", baseTemplate:"amapiano",
  narrative:"archSong", vary:0.9, sync:1,
  tip:"Ami Faku's soulful, genuinely song-structured vocal is the exception among amapiano's chants — a real verse-and-hook arc laid over Kabza's jazzy chords and soft shaker groove. `archSong` gives it one clear rise-and-fall across the whole record rather than a looped cell." },

{ id:"amapiano_sponono", name:"Sponono", artist:"DJ Maphorisa & Kabza De Small ft. Wizkid, Burna Boy & Cassper Nyovest", year:2020, bpm:112, tonic:9,
  progId:"dorian", baseTemplate:"amapiano",
  narrative:"callResp", vary:0.7, sync:1,
  tip:"Three guest verses trade over the same held log-drum bass and static minor-but-not-sad vamp rather than each getting their own section — the Scorpion Kings' groove barely moves under them. `callResp` writes that hand-off between voices; `dorian` is the unresolved vamp underneath." },

{ id:"amapiano_umsebenziwethu", name:"Umsebenzi Wethu", artist:"DJ Maphorisa & Kabza De Small ft. Young Stunna", year:2021, bpm:113, tonic:2,
  progId:"aeolian", baseTemplate:"amapiano",
  narrative:"period", vary:0.8, sync:1,
  tip:"Young Stunna's breakout vocal is built from clear two-bar question-then-answer phrases over the piano-and-log-drum bed, a big part of why the hook is so easy to sing back. `period` is that exact two-bar call-and-answer sentence structure." },

{ id:"amapiano_uber", name:"Uber", artist:"Kabza De Small & Mas Musiq ft. Aymos", year:2020, bpm:112, tonic:7,
  progId:"deepHouse", baseTemplate:"amapiano",
  narrative:"motif", vary:0.6, sync:1,
  tip:"Aymos's short vocal cell keeps returning with small variations as the jazzy chords and soft kick/shaker groove shift under it, rather than developing into a full new melody each time. `motif` is that restated-and-lightly-varied cell." },

{ id:"amapiano_iplan", name:"iPlan", artist:"Vigro Deep ft. Focalistic, Mpura, Ntosh Gazi, Duncan Mighty & Xduppy", year:2020, bpm:113, tonic:4,
  progId:"dorian", baseTemplate:"amapiano",
  narrative:"qanda", vary:0.7, sync:2,
  tip:"Five rappers trade bars over Vigro Deep's log-drum groove in short question-and-answer bursts rather than full verses, keeping the track's energy in the flow rather than the harmony. `qanda` writes that trade; the higher sync matches the rap phrasing pushing hard against the beat." },

{ id:"amapiano_tanzania", name:"Tanzania", artist:"Uncle Waffles", year:2022, bpm:112, tonic:10,
  progId:"aeolian", baseTemplate:"amapiano",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Uncle Waffles' viral instrumental has no lead vocal at all — one keys-and-log-drum cell loops almost unchanged while the shaker groove and bass slide underneath, exactly the DJ-tool repetition that made it a Boiler Room favourite. `ostinato` is that barely-developed loop." },

{ id:"amapiano_iphone", name:"iPhone", artist:"DBN Gogo, Mellow & Sleazy ft. Sir Trill, Da Muziqal Chef, Yumbs, Naqua SA & TmanXpress", year:2021, bpm:113, tonic:0,
  progId:"deepHouse", baseTemplate:"amapiano",
  narrative:"chant", vary:0.4, sync:1,
  tip:"One of amapiano's biggest TikTok-driven crossovers — a short, chanted phrase repeats over the struck-bell bassline rather than any of the six credited artists carrying a full sung melody. `chant` matches that reciting-pitch, rhythm-first hook." },

{ id:"amapiano_mnike", name:"Mnike", artist:"Tyler ICU & DJ Maphorisa ft. Tumelo_za, Nkosazana Daughter, Ceeka RSA & Sino Msolo", year:2023, bpm:112, tonic:5,
  progId:"dorian", baseTemplate:"amapiano",
  narrative:"pendulum", vary:0.5, sync:1,
  tip:"The global amapiano breakout hit rocks its 'mnike' vocal hook between two close notes over the held log-drum bass, widening slightly each pass rather than developing a new line. `pendulum` is exactly that two-note rock-and-widen shape." },

{ id:"amapiano_selema", name:"Selema", artist:"Musa Keys", year:2023, bpm:113, tonic:9,
  progId:"deepHouse", baseTemplate:"amapiano",
  narrative:"wave", vary:0.6, sync:1,
  tip:"Musa Keys' hit lets the vocal hook swell and fall in long phrases over jazzy chords and a bassline that just holds and slides rather than driving the groove itself. `wave` is that slow undulation." },

{ id:"gqom_icedrop", name:"Ice Drop", artist:"DJ Lag", year:2016, bpm:113, tonic:0,
  progId:"aeolian", baseTemplate:"gqom",
  narrative:"ostinato", vary:0.2, sync:2,
  tip:"One of the first gqom tracks to reach international dancefloors via Goon Club Allstars — almost entirely percussion and sub-bass, with a single off-kilter kick pattern doing nearly all the work and barely any harmonic content. `ostinato` at low vary matches how little the track actually develops." },

{ id:"gqom_omunye", name:"Omunye", artist:"Distruction Boyz ft. Dominowe", year:2016, bpm:112, tonic:5,
  progId:"dorian", baseTemplate:"gqom",
  narrative:"chant", vary:0.3, sync:2,
  tip:"The Durban duo's breakout, multi-platinum-in-South-Africa hit keeps Dominowe's vocal to a short, repeated chant sitting starkly over the stripped, mostly-alone kick pattern rather than a sung melody. `chant` is that held reciting pitch; the hard sync is the kick's off-house placement." },

{ id:"gqom_wololo", name:"Wololo", artist:"Babes Wodumo ft. Mampintsha", year:2016, bpm:112, tonic:9,
  progId:"aeolian", baseTemplate:"gqom",
  narrative:"callResp", vary:0.6, sync:2,
  tip:"Gqom's biggest pop crossover — Babes Wodumo and Mampintsha trade short lines back and forth over drums that otherwise leave huge gaps of near-silence. `callResp` is that vocal trade; the chords stay minimal, true to how little harmonic content the original actually carries." },

{ id:"gqom_slende", name:"Slende", artist:"Rudeboyz", year:2016, bpm:113, tonic:2,
  progId:"dorian", baseTemplate:"gqom",
  narrative:"ostinato", vary:0.2, sync:2,
  tip:"A Durban gqom duo staple built almost entirely from percussion and an off-kilter, mostly-solo kick pattern, with only the faintest keys stab for harmony. `ostinato` at low vary is that barely-changing loop." },

{ id:"gqom_igintsa", name:"iGintsa", artist:"Citizen Boy", year:2016, bpm:112, tonic:7,
  progId:"aeolian", baseTemplate:"gqom",
  narrative:"chant", vary:0.3, sync:2,
  tip:"Citizen Boy's well-known Durban club hit leans on a short chanted vocal hook sitting over long stretches of near-empty percussion, letting the tension come from what's missing rather than added. `chant` captures that reciting, rhythm-driven vocal." },

{ id:"gqom_phandangedwa", name:"Phanda Ngedwa", artist:"DJ Tira ft. Dladla Mshunqisi", year:2016, bpm:113, tonic:4,
  progId:"dorian", baseTemplate:"gqom",
  narrative:"converse", vary:0.4, sync:2,
  tip:"Durban kwaito veteran DJ Tira's crossover hit sets Dladla Mshunqisi's speech-like, gap-filled vocal delivery over a sparse, off-the-grid gqom kick rather than a sung line. `converse` writes that narrow, space-filled phrasing." },

{ id:"gqom_wehmameh", name:"Weh Mameh", artist:"Griffit Vigo", year:2016, bpm:112, tonic:10,
  progId:"aeolian", baseTemplate:"gqom",
  narrative:"germ", vary:0.3, sync:2,
  tip:"Included on the Gqom Oh! compilation that first carried the Durban sound to international labels, Griffit Vigo's track develops one small percussion-and-vocal cell slightly further section by section rather than adding new material. `germ` is that gradually-developed cell." },

{ id:"gqom_tripjoburg", name:"Trip to Joburg", artist:"DJ Lag", year:2016, bpm:113, tonic:0,
  progId:"dorian", baseTemplate:"gqom",
  narrative:"ostinato", vary:0.2, sync:2,
  tip:"An early DJ Lag instrumental among the first gqom tracks distributed to European labels and press — one repeating rhythm cell with almost no chordal material, letting the off-kilter, mostly-alone kick carry everything. `ostinato` at low vary matches that." },

{ id:"gqom_ghostmode", name:"Ghost Mode", artist:"DJ Lag ft. Mr Thela", year:2017, bpm:112, tonic:5,
  progId:"aeolian", baseTemplate:"gqom",
  narrative:"chant", vary:0.3, sync:2,
  tip:"DJ Lag's Ghost Mode EP standout keeps Mr Thela's vocal to a short chanted phrase sitting over long stretches of stripped-back drums, true to gqom's tension-from-absence structure. `chant` matches that reciting-tone hook." },

{ id:"gqom_idando", name:"Idando", artist:"Babes Wodumo", year:2017, bpm:113, tonic:9,
  progId:"dorian", baseTemplate:"gqom",
  narrative:"callResp", vary:0.5, sync:2,
  tip:"From Babes Wodumo's debut album Gqom Queen Vol. 1, the vocal trades short phrases against sparse drum hits rather than singing continuously, keeping the arrangement's weight on what drops out between hits. `callResp` writes that trade." },

{ id:"tribalhouse_firedup", name:"Fired Up!", artist:"Funky Green Dogs", year:1996, bpm:126, tonic:9,
  progId:"deepHouse", baseTemplate:"tribalhouse",
  narrative:"arch", vary:0.7, sync:1,
  tip:"A Murk-crew circuit-house classic that lets a long tribal percussion loop drive most of the track before the vocal properly arrives, the vocal itself rising and falling in one clear arc once it does. `arch` is that phrase shape; the deep-house vamp underneath matches its driving minor groove." },

{ id:"tribalhouse_luvdancin", name:"Luv Dancin'", artist:"Roger Sanchez", year:2001, bpm:127, tonic:2,
  progId:"aeolian", baseTemplate:"tribalhouse",
  narrative:"ostinato", vary:0.4, sync:1,
  tip:"Sanchez's garage-tribal crossover hit is carried almost entirely by its percussion loop and a sampled vocal phrase repeated rather than developed, arrangement interest coming from filtering and drops rather than new melody. `ostinato` is that repeating cell." },

{ id:"tribalhouse_musicistheanswer", name:"Music Is the Answer (Everything's Gonna Be Alright)", artist:"Danny Tenaglia ft. Celeda", year:1998, bpm:126, tonic:7,
  progId:"deepHouse", baseTemplate:"tribalhouse",
  narrative:"callResp", vary:0.8, sync:1,
  tip:"A tribal house landmark from Tenaglia's Tourism album — Celeda's gospel-house-styled vocal calls and the track's own backing chants answer over a very long, percussion-driven groove. `callResp` writes that trade directly." },

{ id:"tribalhouse_beautifulpeople", name:"Beautiful People", artist:"Barbara Tucker", year:1994, bpm:125, tonic:0,
  progId:"gospel", baseTemplate:"tribalhouse",
  narrative:"archSong", vary:0.8, sync:1,
  tip:"A Strictly Rhythm tribal-house classic with a genuine gospel-house vocal arc from Tucker rather than a chant, riding over congas and toms that otherwise carry the arrangement almost alone. `archSong` gives it one clear rise-and-fall across the whole record; `gospel` fits her testifying delivery." },

{ id:"tribalhouse_elevation", name:"Elevation", artist:"Jose Nunez's Latin Soul Brothers", year:1996, bpm:126, tonic:4,
  progId:"andalusian", baseTemplate:"tribalhouse",
  narrative:"chant", vary:0.4, sync:1,
  tip:"A Nite Grooves tribal-house staple built on Latin percussion and a held, rhythm-driven chant rather than a written melody — the groove itself is the hook. `chant` matches that reciting pitch; the andalusian-flavoured minor progression reflects its Latin-percussion roots." },

{ id:"tribalhouse_elementsoflife", name:"Elements of Life", artist:"Louie Vega", year:2004, bpm:124, tonic:9,
  progId:"flamenco", baseTemplate:"tribalhouse",
  narrative:"wave", vary:0.6, sync:1,
  tip:"Vega's epic, multi-vocalist Latin-tribal house suite unfolds in long, slow melodic swells over an extended percussion arrangement rather than a tight pop structure. `wave` is that long undulation; the flamenco-tinged minor colour matches its Latin-soul palette." },

{ id:"tribalhouse_slave", name:"Slave", artist:"Peven Everett", year:2003, bpm:125, tonic:5,
  progId:"deepHouse", baseTemplate:"tribalhouse",
  narrative:"ostinato", vary:0.3, sync:0,
  tip:"A Chicago tribal/deep-house cut on Ubiquity where Everett's falsetto hook loops with almost no variation over a long, driving percussion break. `ostinato` at low vary reflects how little the vocal cell actually changes across the record." },

{ id:"tribalhouse_loveandhappiness", name:"Love & Happiness (Yemaya Y Ochun)", artist:"Micky More & Andy Tee ft. Kimara Lovelace", year:2003, bpm:126, tonic:2,
  progId:"andalusian", baseTemplate:"tribalhouse",
  narrative:"chant", vary:0.5, sync:1,
  tip:"A Nervous Records tribal house favourite that layers Yoruba-deity-referencing chants over its percussion break rather than a conventional verse-chorus vocal. `chant` is that reciting-pitch, rhythm-driven hook; the Latin-modal progression matches its Santería-referencing palette." },

{ id:"tribalhouse_needinu", name:"Needin' U", artist:"David Morales presents The Face", year:1997, bpm:128, tonic:0,
  progId:"deepHouse", baseTemplate:"tribalhouse",
  narrative:"archSong", vary:0.7, sync:1,
  tip:"Morales's garage-tribal anthem became a defining late-'90s club record on the strength of one sampled diva vocal phrase given a full song arc over a relentless, driving percussion loop. `archSong` gives that phrase its one clear rise-and-fall across the whole track." },

{ id:"tribalhouse_elements", name:"Elements", artist:"Danny Tenaglia", year:1998, bpm:126, tonic:7,
  progId:"aeolian", baseTemplate:"tribalhouse",
  narrative:"wave", vary:0.5, sync:1,
  tip:"Another Tourism-album tribal house epic, largely instrumental, that lets a long percussion arrangement swell and recede in slow waves rather than build to a single drop. `wave` is that long undulation." },

{ id:"filterhouse_dafunk", name:"Da Funk", artist:"Daft Punk", year:1995, bpm:108, tonic:5,
  progId:"deepHouse", baseTemplate:"filterhouse",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"The duo's breakout single is one squelchy analogue-synth riff opened and closed by a filter sweep for the whole record's length — no verse, no chorus, just the loop and the filter automation. `ostinato` writes that single repeating cell exactly." },

{ id:"filterhouse_aroundtheworld", name:"Around the World", artist:"Daft Punk", year:1997, bpm:121, tonic:9,
  progId:"aeolian", baseTemplate:"filterhouse",
  narrative:"ostinato", vary:0.2, sync:0,
  tip:"Famously built from exactly four short vocodered/bass/keys loops assigned to the song's structure and nothing else — the whole arrangement is which loops are switched in and out. `ostinato` at very low vary matches how mechanically unchanging the actual loops are." },

{ id:"filterhouse_1999", name:"1999", artist:"Cassius", year:1999, bpm:123, tonic:0,
  progId:"mixo", baseTemplate:"filterhouse",
  narrative:"ostinato", vary:0.4, sync:1,
  tip:"Cassius's title track from their debut album loops a chopped funk sample under a filter sweep that opens and closes each section, in the same French-touch mould as their peers. `ostinato` is that repeating disco-funk cell; `mixo` fits its major-key funk-loop harmony." },

{ id:"filterhouse_ladyhearmetonight", name:"Lady (Hear Me Tonight)", artist:"Modjo", year:2000, bpm:124, tonic:9,
  progId:"aeolian", baseTemplate:"filterhouse",
  narrative:"archSong", vary:0.7, sync:1,
  tip:"Built around a filtered Chic guitar-and-bass loop (from 'Soup for One'), Modjo's record is unusual for the style in carrying an actual sung verse-chorus song over the loop rather than just a vocal chant. `archSong` gives it that one real rise-and-fall arc." },

{ id:"filterhouse_intro", name:"Intro", artist:"Alan Braxe & Fred Falke", year:2004, bpm:123, tonic:2,
  progId:"deepHouse", baseTemplate:"filterhouse",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"A Vulture Records French-touch instrumental where a single arpeggiated synth loop is the entire arrangement, filtered open and shut across the record's length. `ostinato` is that one repeating cell heard through the filter automation." },

{ id:"filterhouse_somuchlove", name:"So Much Love to Give", artist:"Together", year:2003, bpm:124, tonic:7,
  progId:"aeolian", baseTemplate:"filterhouse",
  narrative:"chant", vary:0.3, sync:1,
  tip:"Thomas Bangalter and DJ Falcon's one-off Roulé project loops a vocoded phrase over a filtered disco bassline rather than developing a melody, very much in the 'One More Time' mould. `chant` is that held, rhythm-driven repeated phrase." },

{ id:"filterhouse_robotique", name:"Robotique Music", artist:"Le Knight Club", year:1999, bpm:123, tonic:4,
  progId:"deepHouse", baseTemplate:"filterhouse",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Braxe and Falke's Vulture-label alias runs one disco-sourced loop through an opening-and-closing filter sweep for its full length, the vocodered title phrase the only 'melody' present. `ostinato` matches that unchanging loop." },

{ id:"filterhouse_ifeelforyou", name:"I Feel For You", artist:"Bob Sinclar ft. Steve Edwards", year:2006, bpm:124, tonic:9,
  progId:"deepHouse", baseTemplate:"filterhouse",
  narrative:"archSong", vary:0.6, sync:1,
  tip:"Sinclar's disco-house hit gives Steve Edwards a genuine sung hook over a filtered disco-loop bed, closer to song structure than the more purely instrumental French-touch records around it. `archSong` gives that vocal one clear rise-and-fall arc." },

{ id:"filterhouse_prixchoc", name:"Prix Choc", artist:"Étienne de Crécy", year:1996, bpm:124, tonic:0,
  progId:"deepHouse", baseTemplate:"filterhouse",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"From de Crécy's Super Discount album, a stripped disco-funk loop is opened and closed by a filter for the whole record with almost no other development. `ostinato` at low vary matches that minimal change pass to pass." },

{ id:"filterhouse_musicsoundsbetter", name:"Music Sounds Better With You", artist:"Stardust", year:1998, bpm:123, tonic:5,
  progId:"deepHouse", baseTemplate:"filterhouse",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"The genre's defining anthem — one vocoded four-bar phrase looped and filtered rather than developed, the whole song being an opening-and-closing filter sweep over that single cell. `ostinato` writes that same short repeating cell without touching the actual sampled hook." },

{ id:"nudisco_jealous", name:"Jealous (I Ain't With It)", artist:"Chromeo", year:2014, bpm:111, tonic:10,
  progId:"rhythm", baseTemplate:"nudisco",
  narrative:"motif", vary:0.7, sync:1,
  tip:"Chromeo's talkbox-and-synth-bass hook is a short funk cell that gets re-voiced and re-harmonised each time it returns rather than repeating identically, riding their signature chugging offbeat guitar. `motif` is that restated, transformed cell." },

{ id:"nudisco_babyimyours", name:"Baby I'm Yours", artist:"Breakbot ft. Irfane", year:2012, bpm:120, tonic:9,
  progId:"axis", baseTemplate:"nudisco",
  narrative:"archSong", vary:0.8, sync:1,
  tip:"Breakbot's biggest crossover hit pairs a genuinely funky, walking bassline with a real sung verse-chorus structure from Irfane, closer to a pop song than most filter-disco cuts. `archSong` gives it one full rise-and-fall arc across the record." },

{ id:"nudisco_inspectornorse", name:"Inspector Norse", artist:"Todd Terje", year:2012, bpm:122, tonic:2,
  progId:"deepHouse", baseTemplate:"nudisco",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Terje's most-played instrumental loops one bright synth riff over a house pump and offbeat groove for its whole length, arrangement interest coming purely from filtering and added percussion layers. `ostinato` is that one repeating hook." },

{ id:"nudisco_fadenaway", name:"Faden Away", artist:"Dam-Funk & Steve Arrington", year:2013, bpm:108, tonic:5,
  progId:"neoSoul", baseTemplate:"nudisco",
  narrative:"wave", vary:0.6, sync:0,
  tip:"From their Higher collaboration album, Arrington's soul vocal glides in slow, long phrases over Dam-Funk's boogie-funk synth bed rather than a tight disco pump. `wave` is that slow undulation; the neo-soul harmony fits Arrington's classic soul writing." },

{ id:"nudisco_hypnotized", name:"Hypnotized", artist:"Purple Disco Machine ft. Sophie and the Giants", year:2020, bpm:122, tonic:0,
  progId:"deepHouse", baseTemplate:"nudisco",
  narrative:"archSong", vary:0.8, sync:1,
  tip:"A modern nu-disco radio hit that pairs a chugging offbeat guitar and house pump with a fully sung verse-chorus vocal from Sophie and the Giants rather than a chant. `archSong` captures that one clear pop rise-and-fall." },

{ id:"nudisco_barbrastreisand", name:"Barbra Streisand", artist:"Duck Sauce", year:2010, bpm:128, tonic:6,
  progId:"mixo", baseTemplate:"nudisco",
  narrative:"chant", vary:0.3, sync:1,
  tip:"Built from a looped disco sample of the singer's name shouted rather than sung, plus a chugging bassline underneath — one of the clearest examples of nu-disco's sample-loop side. `chant` matches that repeated, rhythm-driven vocal hook." },

{ id:"nudisco_allyourewaitingfor", name:"All You're Waiting For", artist:"Classixx ft. Nancy Whang", year:2013, bpm:118, tonic:4,
  progId:"deepHouse", baseTemplate:"nudisco",
  narrative:"motif", vary:0.6, sync:1,
  tip:"Nancy Whang's cool, understated vocal returns as a short restated cell over Classixx's genuinely funky bassline and house pump rather than developing into a big pop chorus. `motif` is that repeated-with-small-changes cell." },

{ id:"nudisco_cocaineblues", name:"Cocaine Blues", artist:"Escort", year:2010, bpm:120, tonic:7,
  progId:"axisMinor", baseTemplate:"nudisco",
  narrative:"chordLock", vary:0.5, sync:1,
  tip:"The NYC disco-revival band's horn-and-guitar stabs only move because the chord underneath changes, riding a chugging offbeat guitar and a genuinely funky live bassline rather than a synth loop. `chordLock` writes exactly that riff-follows-the-chord behaviour." },

{ id:"techhouse_flash", name:"Flash", artist:"Green Velvet", year:1995, bpm:130, tonic:0,
  progId:"axisMinor", baseTemplate:"techhouse",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"Cajmere's Green Velvet alias built this Chicago tech-house classic from one hypnotic acid-bass riff that barely develops across the whole track — the interest is entirely in what filters or drops out, not what's added. `ostinato` at low vary matches that." },

{ id:"techhouse_doyawannafeel", name:"Do Ya Wanna Feel", artist:"Jamie Jones", year:2013, bpm:125, tonic:9,
  progId:"deepHouse", baseTemplate:"techhouse",
  narrative:"chant", vary:0.3, sync:1,
  tip:"A Hot Creations tech-house staple where a chopped vocal sample repeats the title phrase over two very long grooves rather than developing a melody, drops built from subtraction not addition. `chant` is that held, reciting vocal hook." },

{ id:"techhouse_turnoffthelights", name:"Turn Off the Lights", artist:"Chris Lake", year:2020, bpm:125, tonic:2,
  progId:"deepHouse", baseTemplate:"techhouse",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Lake's minimal, DJ-tool-styled tech house hit runs one bass-and-percussion groove for most of its length, with the arrangement built almost entirely from strategic drop-outs. `ostinato` matches that barely-changing loop." },

{ id:"techhouse_forget", name:"Forget", artist:"Patrick Topping", year:2016, bpm:126, tonic:7,
  progId:"aeolian", baseTemplate:"techhouse",
  narrative:"chant", vary:0.3, sync:1,
  tip:"A Hot Creations dancefloor weapon built on a single chopped vocal chant looping over a relentless, minimal groove rather than any sung melody. `chant` writes that reciting, rhythm-driven hook." },

{ id:"techhouse_xtc", name:"XTC", artist:"Solardo", year:2018, bpm:125, tonic:0,
  progId:"deepHouse", baseTemplate:"techhouse",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"Solardo's breakout tech house hit keeps a single chopped-vocal-and-bass groove running almost unchanged, with the track's drama coming entirely from what drops out at the breakdown. `ostinato` at low vary matches that." },

{ id:"techhouse_buggin", name:"Buggin'", artist:"Hot Since 82", year:2019, bpm:124, tonic:4,
  progId:"deepHouse", baseTemplate:"techhouse",
  narrative:"motif", vary:0.4, sync:1,
  tip:"Hot Since 82's hit reworks a short vocal-and-bass cell with small variations across its two long sections rather than introducing much new material. `motif` is that lightly-varied returning cell." },

{ id:"techhouse_bangbang", name:"Bang Bang", artist:"wAFF", year:2020, bpm:126, tonic:9,
  progId:"aeolian", baseTemplate:"techhouse",
  narrative:"chant", vary:0.3, sync:1,
  tip:"wAFF's tech house hit loops a punchy, shouted vocal chop over a relentless minimal groove, the drops entirely a matter of stripping elements back rather than layering more in. `chant` matches that repeated, rhythm-first hook." },

{ id:"techhouse_yesandiknowit", name:"Yes And I Know It", artist:"Michael Bibi", year:2020, bpm:125, tonic:5,
  progId:"deepHouse", baseTemplate:"techhouse",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"A Solotoko tech house anthem built on one chugging bass-and-vocal-chop groove sustained for most of its runtime, its two big sections distinguished mainly by what's been dropped out. `ostinato` writes that same barely-developing loop." },
{ id:"deeptech_needu100", name:"Need U (100%)", artist:"Duke Dumont ft. A*M*E", year:2013, bpm:123, tonic:5,
  progId:"deepHouse", baseTemplate:"deeptech",
  narrative:"chant", vary:0.4, sync:2,
  tip:"Need U (100%) built its whole hook from a chopped, syncopated vocal sample punched against sustained deep-house chords rather than a sung verse. `chant` keeps that reciting-pitch, rhythm-first character; sync 2 matches how hard the chop pushes off the beat." },

{ id:"deeptech_besomeone", name:"Be Someone", artist:"CamelPhat & Jake Bugg", year:2018, bpm:122, tonic:10,
  progId:"deepHouse", baseTemplate:"deeptech",
  narrative:"archSong", vary:0.8, sync:1,
  tip:"CamelPhat paired their tech-house chord stabs, voiced long here rather than punched, with an actual verse-chorus indie vocal from Jake Bugg. `archSong` traces that single song-wide rise and fall instead of looping a short hook." },

{ id:"deeptech_cola", name:"Cola", artist:"CamelPhat & Elderbrook", year:2017, bpm:123, tonic:9,
  progId:"deepHouse", baseTemplate:"deeptech",
  narrative:"motif", vary:0.6, sync:1,
  tip:"Cola's identity is Elderbrook's falsetto restating the same 'pour me a cola' cell over a lushly held tech-house chord loop that never stabs. `motif` keeps that one short cell recognisable through the arrangement." },

{ id:"deeptech_losingit", name:"Losing It", artist:"FISHER", year:2018, bpm:125, tonic:2,
  progId:"mixo", baseTemplate:"deeptech",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Losing It is carried almost entirely by one chopped 'you're always losing it' vocal sample looping under long-held chords, with barely any bar-to-bar development. `ostinato` writes that same fixed, barely-developing cell." },

{ id:"deeptech_takeit", name:"Take It", artist:"Dom Dolla", year:2018, bpm:123, tonic:0,
  progId:"mixo", baseTemplate:"deeptech",
  narrative:"ostinato", vary:0.4, sync:2,
  tip:"Take It's hook is a single 'I could take it' vocal chop stabbed against the beat and never developed into a full line - the motion comes from the filter opening around it. `ostinato` mirrors that fixed cell; sync 2 for how hard the chop lands off-beat." },

{ id:"deeptech_sanfrandisco", name:"San Frandisco", artist:"Dom Dolla", year:2019, bpm:125, tonic:9,
  progId:"deepHouse", baseTemplate:"deeptech",
  narrative:"germ", vary:0.6, sync:1,
  tip:"San Frandisco's bassline riff is the whole hook, and Dolla keeps returning to it slightly re-voiced and further filtered each pass rather than replacing it. `germ` develops that one cell section to section over long, sustained chords." },

{ id:"deeptech_mk17", name:"17", artist:"MK", year:2017, bpm:122, tonic:0,
  progId:"deepHouse", baseTemplate:"deeptech",
  narrative:"climb", vary:0.7, sync:1,
  tip:"MK's '17' is driven by a piano riff that keeps climbing register as the track opens up rather than a sung top-line, the whole lift coming from that rising figure over long chord holds. `climb` is exactly that creeping-upward shape." },

{ id:"deeptech_readyforyourlove", name:"Ready For Your Love", artist:"Gorgon City ft. MNEK", year:2014, bpm:124, tonic:7,
  progId:"deepHouse", baseTemplate:"deeptech",
  narrative:"callResp", vary:0.8, sync:1,
  tip:"MNEK's vocal trades a lead line against its own gospel-tinged backing answers over Gorgon City's long, sustained house chords. `callResp` writes that same call-and-answer shape instead of a single melodic line." },

{ id:"deeptech_mylove", name:"My Love", artist:"Route 94 ft. Jess Glynne", year:2013, bpm:124, tonic:2,
  progId:"deepHouse", baseTemplate:"deeptech",
  narrative:"period", vary:0.7, sync:1,
  tip:"Jess Glynne's top-line moves in tidy two-bar question-and-answer sentences over Route 94's held deep-house chords rather than breaking into a big belted chorus. `period` keeps that same call-then-answer phrasing." },

{ id:"deeptech_turnoffthelights", name:"Turn Off The Lights", artist:"Chris Lake ft. Alexis Roberts", year:2020, bpm:125, tonic:9,
  progId:"deepHouse", baseTemplate:"deeptech",
  narrative:"ostinato", vary:0.4, sync:2,
  tip:"Chris Lake loops Alexis Roberts' title line as a tight vocal chop over long-held chord pads rather than writing it out as a verse. `ostinato` keeps that fixed repeating cell; sync 2 matches how far off the beat the chop sits." },

{ id:"organichouse_innerbloom", name:"Innerbloom", artist:"RÜFÜS DU SOL", year:2016, bpm:122, tonic:9,
  progId:"dorian", baseTemplate:"organichouse",
  narrative:"wave", vary:0.5, sync:0,
  tip:"Innerbloom stretches one filtered vocal phrase across nine slowly unfolding minutes, texture doing almost all the work as the arrangement opens and closes like a long breath. `wave` is that long, slow undulation; low sync keeps every entrance landing gently on the beat." },

{ id:"organichouse_youwereright", name:"You Were Right", artist:"RÜFÜS DU SOL", year:2018, bpm:123, tonic:2,
  progId:"deepHouse", baseTemplate:"organichouse",
  narrative:"archSong", vary:0.8, sync:1,
  tip:"You Were Right plays as a real verse-chorus song grafted onto a slow-building house arrangement, its vocal arcing once from hushed verse to open chorus rather than looping a hook. `archSong` traces that single rise-and-fall." },

{ id:"organichouse_atlas", name:"Atlas", artist:"Ben Böhmer", year:2020, bpm:122, tonic:4,
  progId:"dorian", baseTemplate:"organichouse",
  narrative:"climb", vary:0.9, sync:0,
  tip:"Atlas is an instrumental that keeps introducing its lead line a register higher as each section gradually adds another layer, rather than repeating one hook. `climb` matches that steady upward creep, never slamming a new part in." },

{ id:"organichouse_runaway", name:"Runaway", artist:"Ben Böhmer with Nils Hoffmann feat. Malou", year:2019, bpm:122, tonic:7,
  progId:"deepHouse", baseTemplate:"organichouse",
  narrative:"arch", vary:0.7, sync:1,
  tip:"Malou's vocal rises and settles within each phrase rather than pushing to one big peak, sitting inside Böhmer and Hoffmann's slowly filtering pads. `arch` is that phrase-level rise-and-fall." },

{ id:"organichouse_brightestlights", name:"Brightest Lights", artist:"Lane 8 ft. Solomon Grey", year:2017, bpm:122, tonic:9,
  progId:"dorian", baseTemplate:"organichouse",
  narrative:"motif", vary:0.6, sync:0,
  tip:"Solomon Grey's vocal returns to the same restrained melodic cell each time it appears, re-clothed in new pads as Lane 8 layers the arrangement gradually rather than rewritten outright. `motif` keeps that cell recognisable pass to pass." },

{ id:"organichouse_noordinarymorning", name:"No Ordinary Morning", artist:"Lane 8 ft. Patrick Baker", year:2016, bpm:122, tonic:2,
  progId:"deepHouse", baseTemplate:"organichouse",
  narrative:"germ", vary:0.7, sync:0,
  tip:"Lane 8 builds this by taking Patrick Baker's opening vocal cell and pushing it a little further melodically every time it returns, instead of swapping in a new part. `germ` is exactly that cell-develops-per-section shape." },

{ id:"organichouse_fingerprint", name:"Fingerprint", artist:"Tinlicker ft. Helsloot", year:2019, bpm:122, tonic:0,
  progId:"dorian", baseTemplate:"organichouse",
  narrative:"motif", vary:0.6, sync:0,
  tip:"Tinlicker's lead line keeps tracing the same short shape through each new pad layer rather than introducing fresh material. `motif` restates that cell, transformed just enough each time it resurfaces, never entering abruptly." },

{ id:"organichouse_divingforroses", name:"Diving for Roses", artist:"Yotto", year:2019, bpm:122, tonic:5,
  progId:"dorian", baseTemplate:"organichouse",
  narrative:"climb", vary:0.8, sync:0,
  tip:"Yotto's instrumental keeps its plucked lead pushing into a higher register as pads and percussion gradually stack underneath, never restating a chorus. `climb` is that steady register creep across the whole record." },

{ id:"organichouse_comewithme", name:"Come With Me", artist:"Nora En Pure", year:2018, bpm:122, tonic:7,
  progId:"deepHouse", baseTemplate:"organichouse",
  narrative:"ostinato", vary:0.5, sync:0,
  tip:"Nora En Pure loops a warm, filtered vocal phrase and lets the pads underneath do the gradual building rather than varying the phrase itself. `ostinato` keeps that repeating cell steady while layers arrive slowly around it." },

{ id:"organichouse_waiting", name:"Waiting", artist:"CamelPhat & Ali Love", year:2018, bpm:123, tonic:9,
  progId:"deepHouse", baseTemplate:"organichouse",
  narrative:"suspend", vary:0.7, sync:1,
  tip:"Ali Love's vocal keeps landing a step above where CamelPhat's chord resolves and settling down a beat later, a held-note tension suited to the warmer, housier palette underneath. `suspend` is exactly that landing-and-resolving shape." },

{ id:"proghouse_strobe", name:"Strobe", artist:"deadmau5", year:2009, bpm:128, tonic:10,
  progId:"festival", baseTemplate:"proghouse",
  narrative:"climb", vary:1, sync:0,
  tip:"Strobe spends roughly ten minutes adding one element at a time until a simple opening arpeggio becomes a wall of layered synths - nothing is rewritten, the same figures just climb in register and density. `climb` is that shape; sync 0 keeps it landing straight throughout." },

{ id:"proghouse_levels", name:"Levels", artist:"Avicii", year:2011, bpm:126, tonic:1,
  progId:"festival", baseTemplate:"proghouse",
  narrative:"terraced", vary:0.6, sync:1,
  tip:"Levels is built on one piano riff that keeps getting a new layer stacked on top of it - drums, then bass, then a vocal chop - rather than being rewritten, so the track terraces upward one addition at a time. `terraced` is that exact build." },

{ id:"proghouse_oneyourname", name:"One (Your Name)", artist:"Swedish House Mafia ft. Pharrell Williams", year:2010, bpm:126, tonic:5,
  progId:"festival", baseTemplate:"proghouse",
  narrative:"archSong", vary:0.8, sync:1,
  tip:"Pharrell's vocal moves through a real verse-into-chorus arc rather than a looped hook, riding a Swedish House Mafia arrangement that adds one new layer per section on the way there. `archSong` traces that single song-length rise and fall." },

{ id:"proghouse_moveforme", name:"Move For Me", artist:"deadmau5 & Kaskade", year:2008, bpm:127, tonic:7,
  progId:"festival", baseTemplate:"proghouse",
  narrative:"wave", vary:0.7, sync:0,
  tip:"Move for Me unfolds as one long filtered swell rather than a string of drops, a single pad and arpeggio slowly rising and receding across the whole record. `wave` is that long undulation; sync 0 keeps it landing on the beat throughout." },

{ id:"proghouse_pjanoo", name:"Pjanoo", artist:"Eric Prydz", year:2008, bpm:126, tonic:3,
  progId:"festival", baseTemplate:"proghouse",
  narrative:"terraced", vary:0.6, sync:0,
  tip:"Pjanoo's piano riff is introduced stark and dry, then reappears with a new layer of pad, bass or percussion added underneath each time rather than being replaced. `terraced` is that repeated-figure-plus-new-layer shape, classic progressive-house build-by-height." },

{ id:"proghouse_opus", name:"Opus", artist:"Eric Prydz", year:2015, bpm:126, tonic:0,
  progId:"festival", baseTemplate:"proghouse",
  narrative:"climb", vary:1, sync:0,
  tip:"Opus runs through several distinct sections across nine minutes, each sitting a register or intensity level above the last, rather than looping one riff under a filter. `climb` captures that continuous upward staging across the whole record." },

{ id:"proghouse_icouldbetheone", name:"I Could Be the One", artist:"Avicii vs. Nicky Romero", year:2013, bpm:128, tonic:7,
  progId:"edm", baseTemplate:"proghouse",
  narrative:"peak", vary:0.7, sync:1,
  tip:"'I Could Be the One' saves its lead synth's highest note for the final drop after both Avicii's and Romero's halves have already been introduced separately, so the melodic ceiling only appears once. `peak` withholds that top note the same way." },

{ id:"proghouse_miamitoibiza", name:"Miami 2 Ibiza", artist:"Swedish House Mafia vs. Tinie Tempah", year:2010, bpm:128, tonic:9,
  progId:"festival", baseTemplate:"proghouse",
  narrative:"converse", vary:0.6, sync:1,
  tip:"Tinie Tempah's verses sit narrow and speech-like with real space between phrases, riding an instrumental that keeps adding a layer every eight bars rather than dropping everything at once. `converse` is that narrow, spoken-word phrasing." },

{ id:"electrohouse_satisfaction", name:"Satisfaction", artist:"Benny Benassi", year:2002, bpm:128, tonic:9,
  progId:"axisMinor", baseTemplate:"electrohouse",
  narrative:"chordLock", vary:0.3, sync:2,
  tip:"Satisfaction's entire hook is one hard-synced saw riff that only changes pitch because the chord under it changes, never developing into a melody - a blueprint for electro house's blunt drop. `chordLock` is that riff-follows-chord behaviour; sync 2 for its aggression." },

{ id:"electrohouse_illmerica", name:"Illmerica", artist:"Wolfgang Gartner", year:2011, bpm:128, tonic:9,
  progId:"axisMinor", baseTemplate:"electrohouse",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"Illmerica's drop is a single stabbed saw riff repeated near-verbatim while the arrangement strips down to just kick and riff - a blunt, all-at-once drop rather than a filtered build. `ostinato` keeps that repeating cell fixed at a hard syncopation." },

{ id:"electrohouse_internetfriends", name:"Internet Friends", artist:"Knife Party", year:2011, bpm:128, tonic:0,
  progId:"axisMinor", baseTemplate:"electrohouse",
  narrative:"chordLock", vary:0.4, sync:2,
  tip:"Internet Friends' riff snaps to whatever the bassline's chord is doing underneath rather than carrying its own melodic line, landing the drop as one blunt stabbed hit. `chordLock` is that chord-led riff behaviour." },

{ id:"electrohouse_bonfire", name:"Bonfire", artist:"Knife Party", year:2012, bpm:128, tonic:2,
  progId:"axisMinor", baseTemplate:"electrohouse",
  narrative:"ostinato", vary:0.4, sync:2,
  tip:"Bonfire drops straight into a repeated stabbed riff with almost no melodic development bar to bar, all the track's motion coming from the arrangement stripping in and out around it. `ostinato` matches that fixed, barely-developed cell." },

{ id:"electrohouse_spaceman", name:"Spaceman", artist:"Hardwell", year:2012, bpm:128, tonic:0,
  progId:"axisMinor", baseTemplate:"electrohouse",
  narrative:"chordLock", vary:0.4, sync:1,
  tip:"Spaceman's stabbed lead riff is voiced to the chord underneath at every hit rather than running its own tune, which is what lets the drop land as one full-force block instead of a sweep. `chordLock` is that riff-tied-to-chord shape." },

{ id:"electrohouse_language", name:"Language", artist:"Porter Robinson", year:2012, bpm:128, tonic:9,
  progId:"edm", baseTemplate:"electrohouse",
  narrative:"peak", vary:0.6, sync:0,
  tip:"Language holds its most euphoric lead phrase back until the final drop, spending the build introducing only fragments of it, so the highest, longest note only appears once. `peak` withholds that note the same way." },

{ id:"electrohouse_clarity", name:"Clarity", artist:"Zedd ft. Foxes", year:2012, bpm:128, tonic:9,
  progId:"edm", baseTemplate:"electrohouse",
  narrative:"archSong", vary:0.8, sync:1,
  tip:"Foxes sings Clarity as a real pop verse-chorus over Zedd's electro-house production, rising once to the chorus hook before the drop restates it as a full-band stab. `archSong` traces that single song-wide rise and fall." },

{ id:"electrohouse_promises", name:"Promises", artist:"Nero", year:2011, bpm:140, tonic:5,
  progId:"axisMinor", baseTemplate:"electrohouse",
  narrative:"peak", vary:0.6, sync:2,
  tip:"Promises runs at a 140bpm dubstep tempo but its drop reads as a double-time electro-house stab, and the vocal's top note is held back until that drop lands. `peak` is that withheld high point; sync 2 for the chop's push before it." },

{ id:"electrohouse_kickouttheepic", name:"Kick Out the Epic Motherfucker", artist:"Dada Life", year:2011, bpm:128, tonic:7,
  progId:"axisMinor", baseTemplate:"electrohouse",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"True to Dada Life's catalogue, the title-phrase riff barely changes shape pass to pass - the impact is entirely in how hard and how suddenly it's stabbed back in after each breakdown. `ostinato` keeps that repeating cell fixed and blunt." },

{ id:"electrohouse_jeffer", name:"Jeffer", artist:"Boys Noize", year:2007, bpm:128, tonic:0,
  progId:"axisMinor", baseTemplate:"electrohouse",
  narrative:"chordLock", vary:0.4, sync:2,
  tip:"Jeffer is one of electro house's founding blueprints - a filthy, distorted riff that only moves when the chord under it moves, dropped in full rather than filtered up to. `chordLock` writes that same chord-led riff." },

{ id:"bigroom_animals", name:"Animals", artist:"Martin Garrix", year:2013, bpm:128, tonic:5,
  progId:"festival", baseTemplate:"bigroom",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Animals' drop is just kick and one simple synth riff repeating almost unchanged - the main-stage impact comes from how little is actually there, not from melodic movement. `ostinato` keeps that riff fixed and deliberately sparse." },

{ id:"bigroom_tsunami", name:"Tsunami", artist:"DVBBS & Borgeous", year:2013, bpm:128, tonic:9,
  progId:"festival", baseTemplate:"bigroom",
  narrative:"chordLock", vary:0.4, sync:2,
  tip:"Tsunami's drop riff snaps to the chord underneath at every hit rather than carrying its own tune, landing as one hard sparse block of kick and lead. `chordLock` is that riff-tied-to-chord behaviour; sync 2 for its aggressive push." },

{ id:"bigroom_turnupthespeakers", name:"Turn Up the Speakers", artist:"Afrojack", year:2012, bpm:128, tonic:0,
  progId:"festival", baseTemplate:"bigroom",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Turn Up the Speakers keeps its stabbed lead riff almost identical through every drop, relying on arrangement drop-outs rather than melodic variation to stay fresh. `ostinato` matches that fixed, barely-developed cell." },

{ id:"bigroom_bigfoot", name:"Bigfoot", artist:"W&W", year:2014, bpm:128, tonic:2,
  progId:"festival", baseTemplate:"bigroom",
  narrative:"chordLock", vary:0.4, sync:1,
  tip:"Bigfoot's riff is voiced hard against the chord underneath at every stab, which is what lets its sparse kick-and-lead drop land as one deliberate block instead of a sweep-in. `chordLock` writes that same chord-led riff." },

{ id:"bigroom_tremor", name:"Tremor", artist:"Martin Garrix & Dimitri Vegas & Like Mike", year:2014, bpm:128, tonic:7,
  progId:"festival", baseTemplate:"bigroom",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Tremor strips its drop down to a repeated one-bar riff and a kick with almost no melodic development across the whole track - the only real motion is stripping elements in and out around that fixed cell. `ostinato` is exactly that." },

{ id:"bigroom_bringthemadness", name:"Bring the Madness", artist:"Hardwell & Blasterjaxx", year:2014, bpm:128, tonic:9,
  progId:"festival", baseTemplate:"bigroom",
  narrative:"chordLock", vary:0.4, sync:1,
  tip:"Bring the Madness ties its stabbed lead to the chord underneath at every hit, so the drop reads as one sparse, deliberate block rather than a filtered sweep-in. `chordLock` writes that riff-follows-chord shape." },

{ id:"bigroom_louderandlouder", name:"Louder & Louder", artist:"Dimitri Vegas & Like Mike x Ummet Ozcan", year:2015, bpm:128, tonic:0,
  progId:"festival", baseTemplate:"bigroom",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Louder & Louder's drop riff barely moves from its first statement to its last - the escalation comes from arrangement (more layers stripped in), not melody. `ostinato` keeps that repeating cell fixed." },

{ id:"bigroom_projectt", name:"Project T", artist:"Tiësto & Dimitri Vegas & Like Mike", year:2015, bpm:128, tonic:5,
  progId:"festival", baseTemplate:"bigroom",
  narrative:"chordLock", vary:0.4, sync:1,
  tip:"Project T's lead riff only changes pitch because the chord underneath moves, dropping in as one full block over a sparse kick rather than sweeping in gradually. `chordLock` is that same chord-led riff shape." },

{ id:"basshouse_adieu", name:"Adieu", artist:"Tchami", year:2013, bpm:126, tonic:5,
  progId:"deepHouse", baseTemplate:"basshouse",
  narrative:"chordLock", vary:0.4, sync:2,
  tip:"Adieu is one of the tracks that founded future house - a filtered, bouncing bass stab doing the work a vocal hook usually would, tied to the chord underneath it rather than running its own tune. `chordLock` writes that bass-follows-chord riff." },

{ id:"basshouse_gecko", name:"Gecko (Overdrive)", artist:"Oliver Heldens", year:2014, bpm:126, tonic:7,
  progId:"deepHouse", baseTemplate:"basshouse",
  narrative:"ostinato", vary:0.4, sync:2,
  tip:"Gecko's title hook is a single chopped vocal syllable bounced against a filtered bass stab, looping almost unchanged rather than developing into a phrase. `ostinato` keeps that fixed repeating cell; sync 2 for how hard it bounces off the beat." },

{ id:"basshouse_promesses", name:"Promesses", artist:"Tchami ft. Kaleem Taylor", year:2015, bpm:126, tonic:0,
  progId:"deepHouse", baseTemplate:"basshouse",
  narrative:"callResp", vary:0.6, sync:1,
  tip:"Kaleem Taylor's vocal trades gospel-house lead lines against its own answering phrases, the same call-and-response future house borrowed from gospel house, riding a filtered bass stab instead of a chord pad. `callResp` writes that trade-off directly." },

{ id:"basshouse_shadesofgrey", name:"Shades of Grey", artist:"Oliver Heldens & Shaun Frank ft. Delaney Jane", year:2015, bpm:126, tonic:9,
  progId:"deepHouse", baseTemplate:"basshouse",
  narrative:"qanda", vary:0.7, sync:1,
  tip:"Delaney Jane's lines are consistently answered by a filtered bass stab rather than another vocal phrase - a call thrown to the bass instead of a backing singer. `qanda` is that same question-then-answer structure." },

{ id:"basshouse_cuttingshapes", name:"Cutting Shapes", artist:"Don Diablo", year:2015, bpm:126, tonic:2,
  progId:"deepHouse", baseTemplate:"basshouse",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"Cutting Shapes' whole identity is a bouncing, filtered bass stab under a shouted vocal sample, both repeating almost unchanged while the arrangement opens the filter around them. `ostinato` matches that fixed, barely-developed cell." },

{ id:"basshouse_feelthevolume", name:"Feel the Volume", artist:"Jauz", year:2015, bpm:126, tonic:7,
  progId:"deepHouse", baseTemplate:"basshouse",
  narrative:"chordLock", vary:0.4, sync:2,
  tip:"Feel the Volume's bass hook is voiced to whatever chord sits under it at each stab, letting Jauz's filtered bass do the melodic work a vocal usually would. `chordLock` writes that riff-follows-chord shape at an aggressive syncopation." },

{ id:"basshouse_prophecy", name:"Prophecy", artist:"Tchami & Malaa", year:2016, bpm:126, tonic:9,
  progId:"deepHouse", baseTemplate:"basshouse",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"Prophecy strips future house down to almost nothing but a dark, filtered bass stab repeating near-verbatim under a sparse chord, with no vocal or lead to speak of. `ostinato` keeps that one cell fixed through the whole track." },

{ id:"basshouse_sunwontset", name:"Sun (Won't Set)", artist:"Sander van Doorn, Chocolate Puma & Eneli", year:2018, bpm:126, tonic:0,
  progId:"mixo", baseTemplate:"basshouse",
  narrative:"arch", vary:0.7, sync:1,
  tip:"Eneli's vocal rises and settles within each phrase over a filtered bass hook rather than pushing to one huge peak, keeping the mood light against the bouncing groove. `arch` is that phrase-level rise-and-fall." },

{ id:"basshouse_housearrest", name:"House Arrest", artist:"MK & Wax Motif", year:2018, bpm:125, tonic:2,
  progId:"deepHouse", baseTemplate:"basshouse",
  narrative:"ostinato", vary:0.4, sync:2,
  tip:"House Arrest's title hook is a tightly chopped vocal sample bounced against a filtered bass stab, the two trading the same fixed cell back and forth rather than developing a tune. `ostinato` keeps that cell fixed at a hard syncopation." },

{ id:"basshouse_mushmush", name:"Mush, Mush", artist:"Bassjackers", year:2013, bpm:128, tonic:5,
  progId:"axisMinor", baseTemplate:"basshouse",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"Mush, Mush's whole hook is a bouncing filtered synth stab repeated near-verbatim while the arrangement strips in and out around it, closer to bass house's filtered-stab hook than a melodic lead. `ostinato` matches that fixed cell." },

{ id:"basshouse_likeilikeit", name:"Like I Like It", artist:"Mau P", year:2022, bpm:128, tonic:6,
  progId:"aeolian", baseTemplate:"basshouse",
  narrative:"chant", vary:0.4, sync:2,
  tip:"Like I Like It's whole hook is a filtered, funk16-patterned bass stab bouncing hard off the beat under a chopped vocal chant that barely leaves one pitch - the track's momentum comes almost entirely from how hard that stab and vocal are pumped, not from melodic movement. `chant` writes that same held reciting note that only moves at phrase ends, syncopated at the harder of the two levels." },

{ id:"dutchhouse_moombah", name:"Moombah", artist:"Silvio Ecomo & Chuckie", year:2008, bpm:128, tonic:7,
  progId:"axisMinor", baseTemplate:"dutchhouse",
  narrative:"chordLock", vary:0.3, sync:2,
  tip:"Moombah's fidgety, syncopated bassline is the entire hook, with saw stabs only punctuating around it - this same track slowed to 108bpm is literally where moombahton got its name. `chordLock` ties the stabs to the chord under the bass." },

{ id:"dutchhouse_putyourhandsup", name:"Put Your Hands Up for Detroit", artist:"Fedde Le Grand", year:2006, bpm:128, tonic:9,
  progId:"axisMinor", baseTemplate:"dutchhouse",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"One of Dutch house's founding records - a syncopated bassline hook that barely varies while saw stabs punctuate around it. `ostinato` keeps that bassline fixed; sync 2 for its fidgety push against the beat." },

{ id:"dutchhouse_riverside", name:"Riverside (Let's Go!)", artist:"Sidney Samson", year:2009, bpm:128, tonic:2,
  progId:"axisMinor", baseTemplate:"dutchhouse",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"Riverside's bouncing, syncopated bassline riff is the hook start to finish, saw stabs only ever accenting around it rather than carrying their own line. `ostinato` matches that fixed repeating cell." },

{ id:"dutchhouse_takeovercontrol", name:"Take Over Control", artist:"Afrojack ft. Eva Simons", year:2010, bpm:128, tonic:0,
  progId:"axisMinor", baseTemplate:"dutchhouse",
  narrative:"archSong", vary:0.7, sync:1,
  tip:"Eva Simons sings a real verse-into-chorus arc here, riding over Afrojack's syncopated bassline hook which stays constant underneath her the whole way. `archSong` traces that single song-length rise and fall." },

{ id:"dutchhouse_cryjustalittle", name:"Cry (Just a Little)", artist:"Bingo Players", year:2011, bpm:128, tonic:9,
  progId:"axisMinor", baseTemplate:"dutchhouse",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"Cry (Just a Little) loops a chopped vocal sample against a fidgety, syncopated bassline that barely changes shape through the whole record - the bassline itself is the hook. `ostinato` keeps that cell fixed." },

{ id:"dutchhouse_nobeef", name:"No Beef", artist:"Afrojack & Steve Aoki", year:2011, bpm:128, tonic:7,
  progId:"axisMinor", baseTemplate:"dutchhouse",
  narrative:"chordLock", vary:0.4, sync:2,
  tip:"No Beef's saw stabs snap to the chord under the bassline at every hit rather than carrying their own tune, keeping the fidgety bass pattern as the actual hook. `chordLock` is that riff-follows-chord shape." },

{ id:"dutchhouse_turbulence", name:"Turbulence", artist:"Laidback Luke & Steve Aoki ft. Lil Jon", year:2011, bpm:128, tonic:0,
  progId:"axisMinor", baseTemplate:"dutchhouse",
  narrative:"chant", vary:0.4, sync:2,
  tip:"Lil Jon's shouted vocal sits on a reciting pitch driven entirely by rhythm rather than melody, punched in against the same syncopated bassline hook running through the whole track. `chant` is that reciting, rhythm-first delivery." },

{ id:"dutchhouse_sparks", name:"Sparks", artist:"Fedde Le Grand & Nicky Romero ft. Matthew Koma", year:2013, bpm:128, tonic:2,
  progId:"axisMinor", baseTemplate:"dutchhouse",
  narrative:"archSong", vary:0.7, sync:1,
  tip:"Matthew Koma's vocal builds through one real verse-to-chorus arc over a fidgety bassline hook that itself never changes shape. `archSong` traces that single rise and fall against the constant syncopated groove." },

{ id:"dutchhouse_rattle", name:"Rattle", artist:"Bingo Players", year:2013, bpm:128, tonic:5,
  progId:"axisMinor", baseTemplate:"dutchhouse",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"Rattle is built on a rattling, syncopated bassline riff that barely develops while a chopped vocal sample punches in around it - the bassline is the hook, not a melodic lead. `ostinato` matches that fixed repeating cell." },

{ id:"dutchhouse_atom", name:"Atom", artist:"Nari & Milani", year:2013, bpm:128, tonic:9,
  progId:"axisMinor", baseTemplate:"dutchhouse",
  narrative:"chordLock", vary:0.4, sync:2,
  tip:"Atom's saw stabs are voiced to the chord under its syncopated bassline at every hit, keeping the fidgety bass pattern itself as the track's actual hook rather than a separate lead line. `chordLock` writes that riff-follows-chord shape." },

{ id:"moombahton_moombah", name:"Moombah", artist:"Dave Nada", year:2009, bpm:108, tonic:7,
  progId:"aeolian", baseTemplate:"moombahton",
  narrative:"ostinato", vary:0.2, sync:2,
  tip:"Dave Nada's 'Moombah' is the genre's origin story - he slowed Silvio Ecomo & Chuckie's 128bpm Dutch house track of the same name down to 108bpm at a house party, and the reggaeton-adjacent skip that fell out of it became moombahton's whole rhythmic identity. `ostinato` keeps the same barely-developed cell the edit itself never changes; sync 2 for the tresillo push through drums, chords and bass alike." },

{ id:"moombahton_mastablasta", name:"Masta Blasta", artist:"Dillon Francis", year:2010, bpm:108, tonic:9,
  progId:"aeolian", baseTemplate:"moombahton",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"Masta Blasta was one of the first tracks built as moombahton from scratch rather than a slowed-down edit, and it keeps the same simple synth riff and tresillo-patterned bass looping with almost no melodic development. `ostinato` matches that fixed cell." },

{ id:"moombahton_bricks", name:"Bricks", artist:"Dillon Francis", year:2011, bpm:108, tonic:2,
  progId:"aeolian", baseTemplate:"moombahton",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"Bricks rides one tresillo-patterned bass-and-chord cell through the whole track, the half-time reggaeton skip doing all the rhythmic work while the synth riff on top barely changes. `ostinato` is that same fixed, barely-developed cell." },

{ id:"moombahton_queque", name:"Que Que", artist:"Dillon Francis", year:2011, bpm:108, tonic:0,
  progId:"aeolian", baseTemplate:"moombahton",
  narrative:"chordLock", vary:0.4, sync:2,
  tip:"Que Que's lead riff only moves because the chord under the tresillo-patterned bass moves, keeping the syncopated skip as the track's actual hook rather than a melody riding on top of it. `chordLock` writes that riff-follows-chord shape." },

{ id:"moombahton_expressyourself", name:"Express Yourself", artist:"Diplo ft. Nicky Da B", year:2012, bpm:108, tonic:9,
  progId:"aeolian", baseTemplate:"moombahton",
  narrative:"chant", vary:0.4, sync:2,
  tip:"Nicky Da B's vocal sits on a shouted, reciting pitch straight out of New Orleans bounce, punched into the same 3-3-2 tresillo pattern running through the whole track's drums and bass. `chant` is that rhythm-first, reciting delivery." },

{ id:"moombahton_watchoutforthisbumaye", name:"Watch Out for This (Bumaye)", artist:"Major Lazer ft. Busy Signal, The Flexican & FS Green", year:2013, bpm:100, tonic:5,
  progId:"aeolian", baseTemplate:"moombahton",
  narrative:"chant", vary:0.4, sync:2,
  tip:"Busy Signal's dancehall-style toast sits as a reciting, rhythm-driven chant over the tresillo skip rather than a sung melody, which is why the track reads as moombahton crossed with dancehall. `chant` matches that reciting delivery." },

{ id:"moombahton_jahnopartial", name:"Jah No Partial", artist:"Major Lazer ft. Flux Pavilion", year:2013, bpm:100, tonic:0,
  progId:"aeolian", baseTemplate:"moombahton",
  narrative:"chordLock", vary:0.4, sync:2,
  tip:"Jah No Partial's stabbed synth riff is tied to the chord under its tresillo-patterned bass rather than running an independent tune, letting the half-time skip carry the track through drums, chords and bass together. `chordLock` writes that same shape." },

{ id:"moombahton_redlips", name:"Red Lips", artist:"GTA ft. Sam Bruno", year:2013, bpm:108, tonic:2,
  progId:"aeolian", baseTemplate:"moombahton",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"Red Lips loops a chopped Sam Bruno vocal sample over a 3-3-2 tresillo-patterned bass, both repeating almost unchanged through each section - the half-time trap-adjacent drop does the surprise, not new melody. `ostinato` keeps that cell fixed." },

{ id:"moombahton_bounce", name:"Bounce", artist:"Nadastrom", year:2011, bpm:108, tonic:7,
  progId:"aeolian", baseTemplate:"moombahton",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"Nadastrom - the Dave Nada/Sabo duo who helped define the genre alongside Dillon Francis - built Bounce on the same fixed, barely-developing tresillo cell running through bass and chords that defines early moombahton production. `ostinato` is that repeating, undeveloped cell." },

{ id:"moombahton_bunupthedance", name:"Bun Up the Dance", artist:"Diplo & Dillon Francis", year:2014, bpm:100, tonic:9,
  progId:"aeolian", baseTemplate:"moombahton",
  narrative:"chordLock", vary:0.4, sync:2,
  tip:"Bun Up the Dance's stabbed riff follows the chord under its half-time tresillo bass rather than carrying an independent melody, leaning the track toward moombahton's later, trap-adjacent tempo. `chordLock` writes that chord-led riff shape." },
{ id:"techno_noufos", name:"No UFO's", artist:"Model 500", year:1985, bpm:125, tonic:1,
  progId:"axis", baseTemplate:"techno",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Juan Atkins' foundational Metroplex single is barely more than a stark vocoded refrain over a sequenced bassline that never really develops - the blueprint for Detroit's machine-funk minimalism. Low-`vary` `ostinato` keeps that same short cell looping instead of growing a tune out of it." },

{ id:"techno_bigfun", name:"Big Fun", artist:"Inner City", year:1988, bpm:120, tonic:10,
  progId:"deepHouse", baseTemplate:"techno",
  narrative:"callResp", vary:0.8, sync:1,
  tip:"Kevin Saunderson built the track around Paris Grey's call-and-response vocal trading with the hook line over an insistent bassline - the pop hinge that pulled Detroit techno onto the charts. `callResp` writes that same trade-off pattern instead of a single sung melody." },

{ id:"techno_goodlife", name:"Good Life", artist:"Inner City", year:1988, bpm:125, tonic:11,
  progId:"deepHouse", baseTemplate:"techno",
  narrative:"archSong", vary:0.7, sync:1,
  tip:"Paris Grey's vocal builds from a spoken verse into the surging title hook once per pass rather than repeating a fixed chorus shape - one long lift carrying the whole record. `archSong` traces exactly that single rise-and-fall across the song's length." },

{ id:"techno_thebells", name:"The Bells", artist:"Jeff Mills", year:1997, bpm:138, tonic:9,
  progId:"aeolian", baseTemplate:"techno",
  narrative:"chordLock", vary:0.3, sync:2,
  tip:"Mills built the entire Purpose Maker record from one hard-panned bell-stab riff that only shifts because the arrangement around it changes, never because the riff itself develops. `chordLock` locks that same riff to the harmony exactly as the real track does, at the harder syncopation the off-grid bell hits actually sit at." },

{ id:"techno_sonicdestroyer", name:"Sonic Destroyer", artist:"X-101", year:1991, bpm:155, tonic:8,
  progId:"aeolian", baseTemplate:"techno",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"Underground Resistance's breakthrough is a single screaming acid-adjacent lead looped over a punishing four-four kick, barely varied bar to bar - militant Detroit techno at its most direct. Very-low-`vary` `ostinato` keeps that one alarm figure locked in place rather than letting it evolve." },

{ id:"techno_clear", name:"Clear", artist:"Cybotron", year:1983, bpm:130, tonic:3,
  progId:"dorian", baseTemplate:"techno",
  narrative:"chant", vary:0.4, sync:1,
  tip:"Juan Atkins and Rik Davis built 'Clear' around a vocoded, chanted title word over a stark, static sequencer vamp - the direct bridge between electro and what would become Detroit techno. `chant` writes that same held, rhythm-driven reciting-tone shape instead of a sung line." },

{ id:"techno_itiswhatitis", name:"It Is What It Is", artist:"Rhythim Is Rhythim", year:1988, bpm:127, tonic:2,
  progId:"dorian", baseTemplate:"techno",
  narrative:"terraced", vary:0.6, sync:1,
  tip:"A Derrick May production built exactly the way this style's arrangement works: one melodic fragment restated a register higher each time a new layer enters, rather than a verse/chorus structure. `terraced` writes that same stepped, layer-by-layer lift." },

{ id:"techno_knightsofthejaguar", name:"Knights of the Jaguar", artist:"DJ Rolando", year:1999, bpm:138, tonic:2,
  progId:"aeolian", baseTemplate:"techno",
  narrative:"motif", vary:0.5, sync:1,
  tip:"DJ Rolando's Underground Resistance-affiliated anthem rides one insistent string-stab motif that the filter and arrangement recontextualize section to section without ever fully rewriting it - a direct descendant of the Belleville strings lineage. `motif` restates that cell with light variation each return." },

{ id:"minimaltechno_minus", name:"Minus", artist:"Robert Hood", year:1994, bpm:139, tonic:5,
  progId:"aeolian", baseTemplate:"minimaltechno",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"Robert Hood strips the title track of his 'Minimal Nation' era down to a hi-hat pattern and a single bass throb that barely mutates for the whole record's length - the founding text of skeleton-level Detroit minimalism. Very-low-`vary` `ostinato` writes that same one-cell, near-static loop." },

{ id:"minimaltechno_losingcontrol", name:"Losing Control", artist:"DBX", year:1996, bpm:126, tonic:5,
  progId:"aeolian", baseTemplate:"minimaltechno",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Daniel Bell's DBX alias built this Peacefrog classic from one looped analog-bass figure that only really changes through filtering, not composition - long sections defined by what's missing rather than what's added. `ostinato` at low `vary` keeps that same cell circling." },

{ id:"minimaltechno_dexter", name:"Dexter", artist:"Ricardo Villalobos", year:2003, bpm:129, tonic:0,
  progId:"aeolian", baseTemplate:"minimaltechno",
  narrative:"germ", vary:0.5, sync:1,
  tip:"From Villalobos's 'Alcachofa' album, the track spins one small percussive-melodic fragment out gradually over its long runtime, each section pushing the idea slightly further rather than introducing a new one. `germ` develops that single cell incrementally, matching the record's patient unfolding." },

{ id:"minimaltechno_easylee", name:"Easy Lee", artist:"Ricardo Villalobos", year:2006, bpm:127, tonic:0,
  progId:"aeolian", baseTemplate:"minimaltechno",
  narrative:"converse", vary:0.5, sync:2,
  tip:"Built around Danny Daze's spoken vocal fragment repeated with wide gaps of drum-only space between phrases, 'Easy Lee' treats the voice as another minimal percussive element. `converse` writes that same narrow, speech-like phrasing with air around it rather than a continuous sung line." },

{ id:"minimaltechno_mouthtomouth", name:"Mouth to Mouth", artist:"Audion", year:2003, bpm:125, tonic:8,
  progId:"mixo", baseTemplate:"minimaltechno",
  narrative:"chordLock", vary:0.3, sync:1,
  tip:"Matthew Dear's Audion alias built the Spectral Sound classic from a single squelchy chord stab that only moves because the filter sweeps under it, not because it develops a melody. `chordLock` ties that riff to the harmony exactly as the record does, kept static at low `vary`." },

{ id:"minimaltechno_bodylanguage", name:"Body Language", artist:"M.A.N.D.Y. vs Booka Shade", year:2005, bpm:130, tonic:4,
  progId:"aeolian", baseTemplate:"minimaltechno",
  narrative:"motif", vary:0.4, sync:1,
  tip:"The record's title-phrase vocal snippet returns as a two-note motif threaded through the same minimal bassline for most of its runtime, recontextualized only by what's filtered in around it. `motif` restates that cell with light variation each pass." },

{ id:"minimaltechno_loverboy", name:"Loverboy", artist:"Steve Bug", year:2001, bpm:124, tonic:11,
  progId:"aeolian", baseTemplate:"minimaltechno",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Steve Bug's Poker Flat-era classic loops a single spoken-vocal fragment and a stripped groove for its whole seven-minute length, letting arrangement rather than melody carry the track. `ostinato` keeps that same short cell in place, varying only lightly." },

{ id:"minimaltechno_happiness", name:"Happiness", artist:"Superpitcher", year:2002, bpm:126, tonic:0,
  progId:"aeolian", baseTemplate:"minimaltechno",
  narrative:"wave", vary:0.5, sync:0,
  tip:"Aksel Schaufler's Kompakt classic drapes a long, half-sung vocal line over a slow-breathing minimal pulse - melancholic microhouse that never resolves into a hook. `wave` writes that same long, undulating shape rather than a repeated phrase." },

{ id:"minimaltechno_levo", name:"Levo", artist:"Recondite", year:2013, bpm:123, tonic:7,
  progId:"aeolian", baseTemplate:"minimaltechno",
  narrative:"climb", vary:0.4, sync:1,
  tip:"Lorenz Brunner's Ghostly International track lets a simple synth figure creep gradually higher in register across its length as textures accumulate around it, never resolving into a peak. `climb` writes that same slow upward creep across the whole record." },

{ id:"minimaltechno_subzero", name:"Subzero", artist:"Ben Klock", year:2009, bpm:125, tonic:5,
  progId:"aeolian", baseTemplate:"minimaltechno",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"Ben Klock's Ostgut Ton anthem is built on one dry, clipped percussive stab looped for most of the track, Berghain-style minimalism where the groove itself is the hook. Low-`vary` `ostinato` keeps that stab locked rather than developing a tune from it." },

{ id:"dubtechno_phylypstrak", name:"Phylyps Trak II", artist:"Basic Channel", year:1994, bpm:120, tonic:9,
  progId:"aeolian", baseTemplate:"dubtechno",
  narrative:"wave", vary:0.2, sync:0,
  tip:"Moritz von Oswald and Mark Ernestus built the Basic Channel sound on one warm, reverb-soaked chord stab that breathes in and out of the mix rather than repeating a fixed phrase. `wave` writes that same slow undulation instead of a hook." },

{ id:"dubtechno_ploy", name:"Ploy", artist:"Maurizio", year:1992, bpm:133, tonic:9,
  progId:"aeolian", baseTemplate:"dubtechno",
  narrative:"wave", vary:0.3, sync:0,
  tip:"Under the Maurizio alias, von Oswald and Ernestus let a single dubbed-out chord hit dissolve into delay and reform each bar - the chord itself barely changes, only its decay does. `wave` captures that same breathing, echo-driven motion." },

{ id:"dubtechno_portgentil", name:"Port Gentil", artist:"Porter Ricks", year:1996, bpm:120, tonic:9,
  progId:"aeolian", baseTemplate:"dubtechno",
  narrative:"wave", vary:0.2, sync:0,
  tip:"Thomas Köner and Andy Mellwig's Chain Reaction classic layers submerged, echoing tones that swell and recede rather than stating a melody - dub techno as underwater sonar. `wave` writes that same long, slow swell instead of a repeated cell." },

{ id:"dubtechno_nauticaldub", name:"Nautical Dub", artist:"Porter Ricks", year:1996, bpm:118, tonic:7,
  progId:"aeolian", baseTemplate:"dubtechno",
  narrative:"wave", vary:0.2, sync:0,
  tip:"From the same 'Biokinetics' sessions, this track keeps its dub chord stabs even sparser, letting delay tails do most of the harmonic work between hits. Very-low-`vary` `wave` keeps that same sparse, echo-carried motion rather than developing a line." },

{ id:"dubtechno_elevations", name:"Elevations", artist:"Vainqueur", year:1994, bpm:120, tonic:9,
  progId:"aeolian", baseTemplate:"dubtechno",
  narrative:"wave", vary:0.2, sync:0,
  tip:"Rene Löwe's Vainqueur project - a key Chain Reaction act alongside Basic Channel - built this record on a single dubbed chord stab whose reverb tail is the real melodic content. `wave` writes that same slow rise-and-decay in place of a stated hook." },

{ id:"dubtechno_vibrantforms", name:"Vibrant Forms II", artist:"Fluxion", year:2002, bpm:120, tonic:0,
  progId:"aeolian", baseTemplate:"dubtechno",
  narrative:"wave", vary:0.3, sync:0,
  tip:"Alexander Kowalski's Fluxion project is regarded as a Chain Reaction-school touchstone precisely for how little its chord stabs move - each section dissolves into echo and reforms rather than progressing. `wave` matches that patient, breathing structure." },

{ id:"dubtechno_liumeeting", name:"Liumeeting", artist:"Deepchord presents Echospace", year:2007, bpm:120, tonic:4,
  progId:"aeolian", baseTemplate:"dubtechno",
  narrative:"wave", vary:0.3, sync:0,
  tip:"Rod Modell and Stephen Hitchell's 'The Coldest Season' project drenches sparse chord hits in tape hiss and long reverb, favoring atmosphere over movement. `wave` writes that same slow, textural undulation rather than a repeating figure." },

{ id:"dubtechno_cyan", name:"Cyan", artist:"Monolake", year:1997, bpm:140, tonic:11,
  progId:"aeolian", baseTemplate:"dubtechno",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Robert Henke's Monolake pushes dub techno's chord-stab-and-delay language into a faster, more rhythmically insistent hybrid - the chord still barely develops, but the groove around it is busier than the Basic Channel school. `ostinato` keeps that one stab looping under the faster pulse." },

{ id:"dubtechno_poorpeoplemustfight", name:"Poor People Must Fight", artist:"Rhythm & Sound", year:2001, bpm:115, tonic:9,
  progId:"aeolian", baseTemplate:"dubtechno",
  narrative:"chant", vary:0.3, sync:1,
  tip:"Von Oswald and Ernestus's Rhythm & Sound project pairs a reggae-trained vocalist's held, reciting-tone delivery with their signature dub-stab chords drenched in delay. `chant` writes that same rhythm-driven, sustained-pitch vocal shape instead of a sung melody." },

{ id:"dubtechno_sleepygirl", name:"Sleepygirl", artist:"Yagya", year:2005, bpm:120, tonic:7,
  progId:"aeolian", baseTemplate:"dubtechno",
  narrative:"wave", vary:0.3, sync:0,
  tip:"Icelandic producer Yagya's 'Rhythm of Snow' track buries a soft chord pad in cavernous reverb that swells and fades rather than repeating a fixed phrase - dub techno at its most hushed. `wave` writes that same long, slow undulation." },

{ id:"hardtechno_doppler", name:"Doppler", artist:"Charlotte de Witte", year:2018, bpm:135, tonic:1,
  progId:"axis", baseTemplate:"hardtechno",
  narrative:"climb", vary:0.5, sync:1,
  tip:"De Witte's breakout KNTXT release builds almost entirely through a filter and layering climb over a relentless kick, with the melodic content staying a simple two-note figure throughout. `climb` writes that same steady upward pressure across the whole record." },

{ id:"hardtechno_br3ath3", name:"BR3ATH3", artist:"Kobosil", year:2022, bpm:155, tonic:1,
  progId:"axis", baseTemplate:"hardtechno",
  narrative:"chordLock", vary:0.3, sync:2,
  tip:"Kobosil's Ostgut Ton-adjacent hard-techno anthem locks a hard, distorted stab to the kick itself - the build is entirely textural, and the drop is the same figure louder and more distorted. `chordLock` snaps that riff to the harmony exactly as the real track does, at the harder syncopation." },

{ id:"hardtechno_inmymind", name:"In My Mind", artist:"Amelie Lens", year:2018, bpm:123, tonic:5,
  progId:"aeolian", baseTemplate:"hardtechno",
  narrative:"chant", vary:0.3, sync:1,
  tip:"Amelie Lens's Lenske anthem rides a chanted, one-note vocal stab over a pounding, barely-varying groove - the vocal functions as a rhythmic tool rather than a melody. `chant` writes that same held, reciting-pitch shape instead of a sung hook." },

{ id:"hardtechno_harddimension", name:"Hard Dimension", artist:"Farrago", year:2022, bpm:142, tonic:0,
  progId:"aeolian", baseTemplate:"hardtechno",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Farrago's Exhale-label track is built on one distorted acid-adjacent stab looped through the whole record's length, with the pounding kick doing the real arrangement work. `ostinato` at moderate `vary` keeps that one cell circling rather than developing a tune." },

{ id:"hardtechno_hardcore", name:"Hardcore", artist:"T78 & Dino Maggiorana", year:2019, bpm:130, tonic:4,
  progId:"axis", baseTemplate:"hardtechno",
  narrative:"chant", vary:0.3, sync:1,
  tip:"This Filth on Acid peak-time record repeats a single shouted vocal stab as its main hook over a hammering four-four groove, never developing it into a phrase. `chant` writes that same rhythm-driven, held vocal shape rather than a melodic line." },

{ id:"hardtechno_hypnotized", name:"Hypnotized", artist:"Amelie Lens", year:2019, bpm:132, tonic:10,
  progId:"aeolian", baseTemplate:"hardtechno",
  narrative:"wave", vary:0.4, sync:1,
  tip:"The Second State Audio original lets a hypnotic, filtered synth line swell and recede across long sections rather than stating a hook - the title says it plainly. `wave` writes that same slow undulating shape instead of a repeated cell." },

{ id:"hardtechno_kagoriii", name:"Kagoriii", artist:"Sara Landry", year:2023, bpm:160, tonic:9,
  progId:"aeolian", baseTemplate:"hardtechno",
  narrative:"ostinato", vary:0.2, sync:2,
  tip:"Sara Landry's schranz-indebted hard techno track pushes a single hard-edged stab through a relentless, barely-varying 160bpm groove - the build is duration and volume, not development. Low-`vary` `ostinato` at the hardest syncopation matches that pounding directness." },

{ id:"hardtechno_fulloffire", name:"Full of Fire", artist:"Kobosil", year:2021, bpm:150, tonic:9,
  progId:"aeolian", baseTemplate:"hardtechno",
  narrative:"chordLock", vary:0.3, sync:2,
  tip:"Another Kobosil peak-time weapon built on a single riff that only shifts because the harmony under it moves, never through melodic invention - the drop is the same figure with more weight behind it. `chordLock` writes that exact riff-follows-chord relationship." },

{ id:"hardtechno_binjuice", name:"Bin Juice", artist:"Perc", year:2016, bpm:140, tonic:0,
  progId:"aeolian", baseTemplate:"hardtechno",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Perc Trax's own label boss built this track from a single abrasive, distorted stab looped hard against the kick, letting texture rather than melody carry the tension. `ostinato` keeps that same cell locked in place across sections." },

{ id:"hardtechno_renegademastah", name:"Renegade Mastah", artist:"HI-LO", year:2019, bpm:126, tonic:1,
  progId:"axis", baseTemplate:"hardtechno",
  narrative:"chant", vary:0.4, sync:1,
  tip:"Oliver Heldens's HI-LO alias built this hard-techno crossover hit on a chanted, percussive vocal stab riding a hypnotic, slowly building groove rather than a sung hook. `chant` writes that same held, rhythm-driven vocal shape." },

{ id:"industrialtechno_rulebylaw", name:"Rule By Law", artist:"British Murder Boys", year:2003, bpm:134, tonic:9,
  progId:"aeolian", baseTemplate:"industrialtechno",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"Surgeon and Regis's British Murder Boys project built this record from a single scraping, noise-caked riff looped with almost no melodic development - texture and distortion do the work harmony would elsewhere. Very-low-`vary` `ostinato` matches that punishing directness." },

{ id:"industrialtechno_learnyourlesson", name:"Learn Your Lesson", artist:"British Murder Boys", year:2003, bpm:130, tonic:9,
  progId:"aeolian", baseTemplate:"industrialtechno",
  narrative:"chordLock", vary:0.3, sync:2,
  tip:"From the same Counterbalance session as 'Rule By Law', this track locks a hard mechanical riff to a stripped, dub-inflected chord change rather than composing a melody over it. `chordLock` writes that same riff-follows-chord relationship at a hard syncopation." },

{ id:"industrialtechno_takeyourbodyoff", name:"Take Your Body Off", artist:"Perc", year:2014, bpm:146, tonic:0,
  progId:"aeolian", baseTemplate:"industrialtechno",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Ali Wells's Perc Trax track buries a distorted, near-spoken vocal stab under layers of noise and metallic percussion, the vocal itself barely varying pass to pass. `ostinato` keeps that same short cell in place while the noise layers around it do the work." },

{ id:"industrialtechno_immolare", name:"Immolare", artist:"Sandwell District", year:2010, bpm:124, tonic:9,
  progId:"aeolian", baseTemplate:"industrialtechno",
  narrative:"wave", vary:0.3, sync:0,
  tip:"Regis, Function and Silent Servant's Sandwell District collective built 'Feed-Forward' on dread-heavy, slowly swelling textures rather than hooks - the title track breathes rather than repeats. `wave` writes that same long, oppressive undulation." },

{ id:"industrialtechno_thefirstsiren", name:"The First Siren", artist:"Ancient Methods", year:2013, bpm:135, tonic:9,
  progId:"aeolian", baseTemplate:"industrialtechno",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"Michael Wollenhaupt's Ancient Methods project bridges industrial noise and techno with a single siren-like distorted lead looped over a mechanical, unyielding groove. Low-`vary` `ostinato` keeps that one alarm figure static rather than letting it develop." },

{ id:"industrialtechno_whytheyhide", name:"Why They Hide Their Bodies Under My Garage?", artist:"Blawan", year:2012, bpm:127, tonic:0,
  progId:"aeolian", baseTemplate:"industrialtechno",
  narrative:"chant", vary:0.3, sync:2,
  tip:"Blawan built this Hinge Finger underground hit around a pitched-down, chopped vocal sample from a 1996 Fugees track chanted over a heavy, minimal industrial groove. `chant` writes that same held, rhythm-driven vocal shape at a hard syncopation without touching the actual sample." },

{ id:"industrialtechno_pruittigoe", name:"Pruitt Igoe", artist:"Kangding Ray", year:2008, bpm:124, tonic:7,
  progId:"mixo", baseTemplate:"industrialtechno",
  narrative:"wave", vary:0.4, sync:0,
  tip:"David Letellier's Raster-Noton release layers grainy, granular textures that swell and dissolve around a stark techno pulse rather than developing a melody - named for the demolished housing project. `wave` writes that same slow textural rise and fall." },

{ id:"industrialtechno_basic", name:"Basic", artist:"Truncate", year:2021, bpm:135, tonic:9,
  progId:"aeolian", baseTemplate:"industrialtechno",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Truncate's Bpitch Control track builds raw, hypnotic techno from one dry, mechanical percussion riff repeated with almost no melodic content added on top. `ostinato` keeps that same cell circling rather than growing a tune out of it." },

{ id:"industrialtechno_spirittrain", name:"Spirit Train", artist:"Oscar Mulero", year:2021, bpm:136, tonic:5,
  progId:"mixo", baseTemplate:"industrialtechno",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"The Spanish industrial-techno figurehead builds this Token release from a single driving, metallic riff that barely shifts across the record's length, texture doing what melody would elsewhere. `ostinato` matches that same static, mechanical repetition." },

{ id:"industrialtechno_code", name:"Code", artist:"Answer Code Request", year:2015, bpm:132, tonic:9,
  progId:"aeolian", baseTemplate:"industrialtechno",
  narrative:"chordLock", vary:0.3, sync:1,
  tip:"Answer Code Request's Ostgut Ton-adjacent track ties a single hard, distorted synth stab directly to the underlying chord's movement rather than composing a separate melody. `chordLock` writes that exact riff-follows-chord relationship." },

{ id:"melotech_horizon", name:"Horizon", artist:"Artbat", year:2019, bpm:124, tonic:5,
  progId:"aeolian", baseTemplate:"melotech",
  narrative:"climb", vary:0.5, sync:1,
  tip:"Artbat's Upperground breakout track is one long filtered synth line that opens and rises for the entire seven minutes without ever landing on a full melodic payoff - the build is the point. `climb` writes that same slow, unresolved creep across the whole record." },

{ id:"melotech_returntooz", name:"Return to Oz", artist:"Monolink", year:2018, bpm:120, tonic:8,
  progId:"axis", baseTemplate:"melotech",
  narrative:"arch", vary:0.5, sync:1,
  tip:"Steffen Linck's Monolink track pairs a live-sung, guitar-inflected vocal with a slow-building melodic techno pulse, the vocal rising and falling once per verse rather than looping. `arch` writes that same single rise-and-fall shape within each phrase." },

{ id:"melotech_breathing", name:"Breathing", artist:"Ben Böhmer, Nils Hoffmann & Malou", year:2019, bpm:122, tonic:11,
  progId:"aeolian", baseTemplate:"melotech",
  narrative:"wave", vary:0.5, sync:0,
  tip:"This Anjunadeep collaboration lets Malou's vocal and the piano-and-pad backdrop swell and recede over long, slow phrases rather than settling into a repeated hook - melodic house at its most patient. `wave` writes that same long undulating shape." },

{ id:"melotech_singularity", name:"Singularity", artist:"Stephan Bodzin", year:2016, bpm:121, tonic:10,
  progId:"aeolian", baseTemplate:"melotech",
  narrative:"climb", vary:0.6, sync:1,
  tip:"Bodzin's Life and Death signature track keeps piling filtered layers on top of a single arpeggiated line for its whole length, the register and intensity climbing without a clear drop. `climb` writes that same unresolved upward creep across the record." },

{ id:"melotech_glue", name:"Glue", artist:"Bicep", year:2017, bpm:130, tonic:4,
  progId:"aeolian", baseTemplate:"melotech",
  narrative:"terraced", vary:0.6, sync:1,
  tip:"Bicep's breakout track layers one rave-piano-adjacent figure a step higher with each new section that enters - the arrangement itself is the melody's real development. `terraced` writes that same stepped, layer-by-layer lift the style tip describes." },

{ id:"melotech_rej", name:"Rej", artist:"Âme", year:2005, bpm:125, tonic:1,
  progId:"axis", baseTemplate:"melotech",
  narrative:"wave", vary:0.4, sync:0,
  tip:"Frank Wiedemann and Kristian Beyer's Innervisions-defining single lets one plucked melodic figure swell in and out of the mix over its full length, foundational to melodic techno's harmonic language. `wave` writes that same slow, breathing undulation." },

{ id:"melotech_miracle", name:"Miracle", artist:"Adriatique & WhoMadeWho", year:2023, bpm:123, tonic:5,
  progId:"axis", baseTemplate:"melotech",
  narrative:"archSong", vary:0.5, sync:1,
  tip:"This Rose Avenue collaboration builds Jeppe Kjellberg's live vocal from a restrained verse into one euphoric, unrepeated peak near the end rather than a recurring chorus. `archSong` traces that single long rise-and-fall across the whole track." },

{ id:"melotech_monument", name:"Monument", artist:"Tale Of Us & Vaal", year:2017, bpm:125, tonic:3,
  progId:"aeolian", baseTemplate:"melotech",
  narrative:"climb", vary:0.5, sync:1,
  tip:"This Afterlife Records staple keeps a single melancholic string figure rising in intensity and register across its length without a conventional drop resolving it. `climb` writes that same long, unresolved upward creep the style is built on." },

{ id:"melotech_cola", name:"Cola", artist:"CamelPhat & Elderbrook", year:2017, bpm:122, tonic:10,
  progId:"mixo", baseTemplate:"melotech",
  narrative:"period", vary:0.5, sync:1,
  tip:"Elderbrook's vocal on this Defected breakout trades short question-then-answer two-bar phrases across the verse before the instrumental hook takes over. `period` writes that same call-and-answer phrasing rather than a continuous melodic line." },

{ id:"electrofunk_planetrock", name:"Planet Rock", artist:"Afrika Bambaataa & the Soulsonic Force", year:1982, bpm:127, tonic:6,
  progId:"axisMinor", baseTemplate:"electrofunk",
  narrative:"chant", vary:0.3, sync:2,
  tip:"Built on Kraftwerk-derived melodic fragments and an 808 groove, Bambaataa's foundational electro record rides a chanted, syncopated vocal hook rather than a sung melody. `chant` writes that same held, rhythm-driven reciting shape at the syncopated pocket the record actually sits in." },

{ id:"electrofunk_egyptegypt", name:"Egypt, Egypt", artist:"The Egyptian Lover", year:1984, bpm:127, tonic:9,
  progId:"axis", baseTemplate:"electrofunk",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"Egyptian Lover's electro classic loops one syncopated 808 bass figure and a vocoded chant for nearly its entire length, letting the groove itself carry the record. `ostinato` keeps that same short cell circling at a hard syncopation." },

{ id:"electrofunk_jamonit", name:"Jam On It", artist:"Newcleus", year:1984, bpm:116, tonic:1,
  progId:"axisMinor", baseTemplate:"electrofunk",
  narrative:"qanda", vary:0.5, sync:2,
  tip:"Newcleus trade the pitched-up 'Jam On It' chant back and forth against the human vocal like a question-and-answer routine over a stiff, syncopated 808 groove. `qanda` writes that same call-and-response cell rather than a continuous line." },

{ id:"electrofunk_electrickingdom", name:"Electric Kingdom", artist:"Twilight 22", year:1983, bpm:127, tonic:6,
  progId:"axis", baseTemplate:"electrofunk",
  narrative:"ostinato", vary:0.4, sync:2,
  tip:"This early electro-funk single loops a robotic, syncopated synth-bass figure under sparse vocoded phrases, barely varying section to section. `ostinato` keeps that same cell locked in place while the syncopated groove does the real work." },

{ id:"electrofunk_nunk", name:"Nunk (New Wave Funk)", artist:"Warp 9", year:1982, bpm:115, tonic:5,
  progId:"axis", baseTemplate:"electrofunk",
  narrative:"chant", vary:0.4, sync:2,
  tip:"Lotti Golden and Richard Scher's Warp 9 built this Prelude Records single around a chanted title phrase riding a stiff, syncopated Roland groove - new-wave electro-funk's crossover blueprint. `chant` writes that same rhythm-driven reciting shape." },

{ id:"electrofunk_packjam", name:"Pack Jam (Look Out for the OVC)", artist:"Jonzun Crew", year:1982, bpm:130, tonic:10,
  progId:"axisMinor", baseTemplate:"electrofunk",
  narrative:"ostinato", vary:0.4, sync:2,
  tip:"Michael Jonzun's Boston electro classic loops a robotic vocoded bassline and chant with almost no melodic development, riding pure syncopated groove instead. `ostinato` keeps that same short cell circling at the style's characteristic push against the beat." },

{ id:"electrofunk_alnaafiysh", name:"Al-Naafiysh (The Soul)", artist:"Hashim", year:1983, bpm:126, tonic:6,
  progId:"axisMinor", baseTemplate:"electrofunk",
  narrative:"ostinato", vary:0.4, sync:2,
  tip:"Jerry Calliste Jr.'s Cutting Records classic is built on one hypnotic, syncopated 808 bass riff repeated with almost no variation - among the most sampled electro basslines ever cut. `ostinato` keeps that riff locked in place rather than developing it." },

{ id:"electrofunk_magicswand", name:"Magic's Wand", artist:"Whodini", year:1982, bpm:113, tonic:9,
  progId:"axis", baseTemplate:"electrofunk",
  narrative:"chant", vary:0.4, sync:1,
  tip:"Produced by Thomas Dolby, this early Whodini single rides a chanted, robotic vocal hook over a stiff syncopated 808 groove rather than a sung melody. `chant` writes that same held, rhythm-driven reciting shape." },

{ id:"electrofunk_numbers", name:"Numbers", artist:"Kraftwerk", year:1981, bpm:129, tonic:7,
  progId:"axis", baseTemplate:"electrofunk",
  narrative:"chant", vary:0.2, sync:1,
  tip:"From 'Computer World', Kraftwerk build the track from robotically counted numbers over a stark, syncopated drum-machine pattern - a direct blueprint for the electro-funk sound that followed. Low-`vary` `chant` writes that same recited, barely-developing vocal shape." },

{ id:"electrofunk_hiphopbebop", name:"Hip Hop, Be Bop (Don't Stop)", artist:"Man Parrish", year:1982, bpm:116, tonic:1,
  progId:"axis", baseTemplate:"electrofunk",
  narrative:"ostinato", vary:0.4, sync:2,
  tip:"Man Parrish's early electro-funk hit loops scratched vocal fragments and a robotic bass figure over a stiff 808 groove, barely varying its core cell for the whole record. `ostinato` keeps that same short figure circling at a syncopated pocket." },

{ id:"electro2000s_dance", name:"D.A.N.C.E.", artist:"Justice", year:2007, bpm:120, tonic:6,
  progId:"axisMinor", baseTemplate:"electro2000s",
  narrative:"chant", vary:0.3, sync:1,
  tip:"Justice built this Ed Banger anthem on a children's-choir chant spelling out the title over a distorted, filtered disco-funk bassline - blog-house's most melodically direct hook. `chant` writes that same recited, rhythm-driven vocal shape." },

{ id:"electro2000s_genesis", name:"Genesis", artist:"Justice", year:2007, bpm:117, tonic:2,
  progId:"axisMinor", baseTemplate:"electro2000s",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"This instrumental Justice track loops one grinding, heavily distorted synth-bass riff for almost its entire length, letting saturation and filtering stand in for melodic movement. `ostinato` keeps that same riff circling with minimal change." },

{ id:"electro2000s_popTheglock", name:"Pop the Glock", artist:"Uffie", year:2006, bpm:112, tonic:0,
  progId:"axisMinor", baseTemplate:"electro2000s",
  narrative:"converse", vary:0.5, sync:2,
  tip:"Uffie's Ed Banger breakout is built on a narrow, half-spoken rap delivery with plenty of dead space over a dirty, distorted electro-funk bassline. `converse` writes that same speech-like, gapped phrasing rather than a sung melody." },

{ id:"electro2000s_pogo", name:"Pogo", artist:"Digitalism", year:2007, bpm:135, tonic:10,
  progId:"mixo", baseTemplate:"electro2000s",
  narrative:"terraced", vary:0.5, sync:1,
  tip:"Digitalism's Kitsuné-era track stacks distorted synth layers a step higher with each new section, building through layering rather than through a rewritten melody. `terraced` writes that same stepped lift the record's arrangement is built on." },

{ id:"electro2000s_warp19", name:"Warp 1.9", artist:"The Bloody Beetroots ft. Steve Aoki", year:2009, bpm:130, tonic:1,
  progId:"axis", baseTemplate:"electro2000s",
  narrative:"ostinato", vary:0.4, sync:2,
  tip:"This Romborama anthem loops one aggressively distorted saw-bass riff under sparse shouted vocal stabs, the whole track built from that single dirty figure. `ostinato` keeps that riff locked in place at a hard syncopated push." },

{ id:"electro2000s_shineshine", name:"Shine Shine", artist:"Boys Noize", year:2007, bpm:126, tonic:4,
  progId:"aeolian", baseTemplate:"electro2000s",
  narrative:"ostinato", vary:0.4, sync:1,
  tip:"Boys Noize's own-label track rides one gritty, filtered synth-bass loop for nearly its whole length, texture and distortion doing the work a chorus would elsewhere. `ostinato` writes that same repeating, barely-developing cell." },

{ id:"electro2000s_franksinatra", name:"Frank Sinatra", artist:"Miss Kittin & The Hacker", year:2001, bpm:125, tonic:7,
  progId:"axis", baseTemplate:"electro2000s",
  narrative:"converse", vary:0.5, sync:1,
  tip:"Miss Kittin's deadpan, spoken-word delivery over The Hacker's cold electroclash groove is narrow in range and full of space between lines rather than sung. `converse` writes that same speech-like, narrow phrasing the track's monotone vocal actually has." },

{ id:"electro2000s_emerge", name:"Emerge", artist:"Fischerspooner", year:2002, bpm:148, tonic:10,
  progId:"axis", baseTemplate:"electro2000s",
  narrative:"chant", vary:0.3, sync:1,
  tip:"Fischerspooner's electroclash breakout is built on a repeated, near-spoken chant of the title word over a pulsing, arpeggiated synth bed rather than a developed vocal melody. `chant` writes that same held, recited shape." },

{ id:"electro2000s_rossross", name:"Ross Ross Ross", artist:"SebastiAn", year:2007, bpm:126, tonic:5,
  progId:"aeolian", baseTemplate:"electro2000s",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"SebastiAn's Ed Banger track loops one dirty, distorted synth-bass riff with almost no melodic variation across its length - blog-house's harshest, most riff-driven side. `ostinato` keeps that same figure circling in place." },

{ id:"electro2000s_needygirl", name:"Needy Girl", artist:"Chromeo", year:2004, bpm:122, tonic:7,
  progId:"aeolian", baseTemplate:"electro2000s",
  narrative:"qanda", vary:0.5, sync:1,
  tip:"Dave 1 and P-Thugg trade a talkbox call-and-response over filtered synth-funk stabs, the vocal hook built entirely from that back-and-forth exchange. `qanda` writes that same question-and-answer cell rather than a continuous melody." },

{ id:"ebm_joininthechant", name:"Join in the Chant", artist:"Nitzer Ebb", year:1987, bpm:121, tonic:10,
  progId:"aeolian", baseTemplate:"ebm",
  narrative:"chant", vary:0.2, sync:1,
  tip:"Nitzer Ebb's genre-naming single is built almost entirely on a shouted, repeated title phrase over a militant, pulsing sequencer line - the vocal doesn't develop, it drills. Low-`vary` `chant` writes that same held, barely-varying reciting shape." },

{ id:"ebm_warsawghetto", name:"Warsaw Ghetto", artist:"Nitzer Ebb", year:1985, bpm:124, tonic:9,
  progId:"aeolian", baseTemplate:"ebm",
  narrative:"chant", vary:0.2, sync:1,
  tip:"This early Nitzer Ebb single locks a barked vocal chant to a stark, hard-sequenced bassline, the whole track built on repetition rather than melodic movement. `chant` keeps that same static, rhythm-driven vocal shape at low `vary`." },

{ id:"ebm_headhunter", name:"Headhunter", artist:"Front 242", year:1988, bpm:123, tonic:6,
  progId:"mixo", baseTemplate:"ebm",
  narrative:"chant", vary:0.3, sync:1,
  tip:"Front 242's biggest single rides a barked, martial vocal delivery over a pulsing sequencer bassline that barely changes for the whole track - EBM's most recognizable groove. `chant` writes that same held, drilled vocal shape instead of a sung hook." },

{ id:"ebm_welcometoparadise", name:"Welcome to Paradise", artist:"Front 242", year:1988, bpm:120, tonic:9,
  progId:"aeolian", baseTemplate:"ebm",
  narrative:"chant", vary:0.3, sync:1,
  tip:"From the same 'Front by Front' album as 'Headhunter', this track keeps the same militant sequencer-bass template with a colder, more clipped vocal delivery. `chant` again writes that recited, rhythm-driven shape rather than a developed melody." },

{ id:"ebm_dermussolini", name:"Der Mussolini", artist:"DAF", year:1981, bpm:157, tonic:11,
  progId:"aeolian", baseTemplate:"ebm",
  narrative:"chant", vary:0.2, sync:2,
  tip:"DAF's confrontational single is built from a barked, sloganistic vocal over a stripped, breakneck synth-and-drum-machine pulse - among the fastest and most minimal records that shaped EBM's template. `chant` at hard syncopation matches that drilled, provocative delivery." },

{ id:"ebm_bostich", name:"Bostich", artist:"Yello", year:1980, bpm:122, tonic:10,
  progId:"dorian", baseTemplate:"ebm",
  narrative:"chant", vary:0.3, sync:1,
  tip:"Yello's Swiss electronic classic loops a percussive, chanted vocal fragment over a mechanical, modal groove that predates and directly influenced the EBM sound proper. `chant` writes that same held, rhythm-driven reciting shape." },

{ id:"ebm_movinghands", name:"Moving Hands", artist:"The Klinik", year:2014, bpm:120, tonic:9,
  progId:"aeolian", baseTemplate:"ebm",
  narrative:"chant", vary:0.3, sync:1,
  tip:"Dirk Ivens and Marc Verhaeghen's long-running Belgian EBM act built this later single on their classic template - a pulsing sequencer bassline under a low, barked vocal that barely varies. `chant` keeps that same recited, static vocal shape." },

{ id:"ebm_digitaltensiondementia", name:"Digital Tension Dementia", artist:"Front Line Assembly", year:1988, bpm:128, tonic:9,
  progId:"aeolian", baseTemplate:"ebm",
  narrative:"chant", vary:0.3, sync:1,
  tip:"Front Line Assembly's first single and first Billboard-charting record pairs a distorted, barked vocal with a hard, mechanical sequencer pulse in the classic EBM mold. `chant` writes that same drilled, rhythm-driven vocal delivery." },

{ id:"ebm_raisethepulse", name:"Raise the Pulse", artist:"Portion Control", year:1983, bpm:122, tonic:9,
  progId:"aeolian", baseTemplate:"ebm",
  narrative:"chant", vary:0.3, sync:1,
  tip:"This early UK EBM/industrial-dance single locks a repeated, shouted title phrase to a stark, pulsing sequencer bassline - among the genre's earliest non-Belgian, non-German entries. `chant` matches that static, barked vocal delivery." },

{ id:"ebm_wahrearbeit", name:"Wahre Arbeit, Wahrer Lohn", artist:"Die Krupps", year:1981, bpm:124, tonic:9,
  progId:"aeolian", baseTemplate:"ebm",
  narrative:"chant", vary:0.3, sync:1,
  tip:"Recorded in 1981, Die Krupps' seminal early single locks a barked, sloganistic German vocal to a metallic, pulsing sequencer line - one of the tracks that gave electronic body music its name and template. `chant` writes that same held, drilled vocal shape." },

{ id:"newbeat_flesh", name:"Flesh", artist:"A Split-Second", year:1986, bpm:108, tonic:9,
  progId:"aeolian", baseTemplate:"newbeat",
  narrative:"chant", vary:0.2, sync:1,
  tip:"New Beat's entire founding myth is this record: a DJ played the 45rpm EBM single at 33+8, and the resulting slow, weighty pulse became the genre. `chant` at low `vary` writes the same static, barked vocal shape heard at that fateful slowed-down speed." },

{ id:"newbeat_soundofc", name:"The Sound of C", artist:"Confetti's", year:1989, bpm:108, tonic:0,
  progId:"axis", baseTemplate:"newbeat",
  narrative:"chant", vary:0.3, sync:1,
  tip:"Confetti's were New Beat's most commercially successful act, and this single rides a repeated, chanted vocal hook over the genre's signature slowed, swung pulse. `chant` writes that same recited, rhythm-driven vocal shape rather than a sung melody." },

{ id:"newbeat_cinchina", name:"C in China", artist:"Confetti's", year:1989, bpm:106, tonic:0,
  progId:"axis", baseTemplate:"newbeat",
  narrative:"chant", vary:0.3, sync:1,
  tip:"Confetti's' other major hit keeps the same chanted-hook, swung-pulse formula as 'The Sound of C', slowed and weighted the way the New Beat scene demanded. `chant` again writes that held, recited vocal shape." },

{ id:"newbeat_hiroshima", name:"Hiroshima", artist:"Nux Nemo", year:1988, bpm:106, tonic:9,
  progId:"aeolian", baseTemplate:"newbeat",
  narrative:"chant", vary:0.2, sync:1,
  tip:"Joey Bogaert's Nux Nemo project scored New Beat's first Belgian number one with this record, built on a hypnotic, barely-varying chanted hook over the genre's trademark slow, swung groove. Low-`vary` `chant` matches that hypnotic repetition." },

{ id:"newbeat_moveyourass", name:"Move Your Ass and Feel the Beat", artist:"Erotic Dissidents", year:1988, bpm:106, tonic:9,
  progId:"aeolian", baseTemplate:"newbeat",
  narrative:"chant", vary:0.3, sync:1,
  tip:"One of the Antler-Subway label's central New Beat productions, this track loops a shouted title-phrase hook over a slowed, weighty EBM-derived pulse. `chant` writes that same recited, rhythm-driven vocal shape." },

{ id:"newbeat_poison", name:"Poison!", artist:"The Weathermen", year:1987, bpm:108, tonic:9,
  progId:"aeolian", baseTemplate:"newbeat",
  narrative:"chant", vary:0.3, sync:1,
  tip:"This semi-satirical Belgian act's biggest single rides a deadpan, repeated vocal hook over the same hypnotic, slowed EBM pulse that defines the New Beat sound. `chant` matches that static, spoken-toned delivery." },

{ id:"newbeat_anasthasia", name:"Anasthasia", artist:"T99", year:1991, bpm:128, tonic:2,
  progId:"axis", baseTemplate:"newbeat",
  narrative:"peak", vary:0.6, sync:1,
  tip:"T99 emerged from the same Belgian scene as it sped New Beat's hypnotic pulse up into early hardcore, this UK top-20 hit withholding its big synth-stab hook until well into the track. `peak` writes that same held-back top note arriving late." },

{ id:"newbeat_euroshima", name:"Euroshima (Wardance)", artist:"Snowy Red", year:1981, bpm:120, tonic:9,
  progId:"aeolian", baseTemplate:"newbeat",
  narrative:"chant", vary:0.3, sync:1,
  tip:"Snowy Red's dark, martial single predates New Beat proper but is a direct precursor the scene drew heavily on - the same barked-chant-over-mechanical-pulse DNA slowed down a few years later. `chant` writes that same recited, rhythm-driven vocal." },

{ id:"newbeat_hmmhmm", name:"Hmm Hmm", artist:"Taste of Sugar", year:1988, bpm:106, tonic:9,
  progId:"aeolian", baseTemplate:"newbeat",
  narrative:"chant", vary:0.2, sync:1,
  tip:"From the same Belgian production team behind Erotic Dissidents, this track loops a wordless, chanted vocal fragment over New Beat's trademark slow, swung groove. Low-`vary` `chant` keeps that hypnotic, barely-changing cell in place." },

{ id:"newbeat_rockittothebone", name:"Rock It to the Bone", artist:"Jade 4U", year:1989, bpm:108, tonic:9,
  progId:"aeolian", baseTemplate:"newbeat",
  narrative:"chant", vary:0.3, sync:1,
  tip:"Nikkie Van Lierop's Jade 4U side-project - she'd go on to front Lords of Acid - rides a chanted title hook over the same slowed, weighty pulse that carries the whole New Beat scene. `chant` writes that same held, recited vocal shape." },
{ id:"trance_forangel", name:"For An Angel", artist:"Paul van Dyk", year:1998, bpm:136, tonic:5,
  progId:"edm", baseTemplate:"trance",
  narrative:"archSong", vary:0.6, sync:1,
  tip:"PvD's breakdown-to-drop arc is built around one soaring lead line that only plays in full at the climax, not a repeated chorus. `archSong` writes that single long rise-and-fall instead of restating a hook." },

{ id:"trance_cafedelmar", name:"Cafe Del Mar", artist:"Energy 52", year:1993, bpm:136, tonic:5,
  progId:"aeolian", baseTemplate:"trance",
  narrative:"wave", vary:0.3, sync:0,
  tip:"Almost no drums for its first minutes — the record is carried by a slowly undulating chord/arp wash that never resolves into a strong downbeat until deep in. `wave` writes that same long, breath-like undulation rather than a rhythmic hook." },

{ id:"trance_children", name:"Children", artist:"Robert Miles", year:1995, bpm:137, tonic:0,
  progId:"pachelbel", baseTemplate:"trance",
  narrative:"ostinato", vary:0.3, sync:0,
  tip:"The whole track is one repeating piano figure over a slow four-on-the-floor pulse — 'dream trance' stripped down to almost no drums under a classical-leaning ostinato. Low `vary` matches how little the real piano part actually changes." },

{ id:"trance_communication", name:"Communication", artist:"Armin van Buuren", year:1999, bpm:138, tonic:6,
  progId:"aeolian", baseTemplate:"trance",
  narrative:"climb", vary:0.7, sync:1,
  tip:"An early Armin epic built from one plucked arpeggio figure that keeps registering higher and gaining layers across eight-plus minutes instead of introducing a new hook. `climb` mirrors that steadily rising register." },

{ id:"trance_ageoflove", name:"The Age Of Love (Jam & Spoon Watch Out For Stella Mix)", artist:"Age Of Love", year:1997, bpm:130, tonic:5,
  progId:"aeolian", baseTemplate:"trance",
  narrative:"germ", vary:0.8, sync:1,
  tip:"One of the records that invented the breakdown-and-buildup formula — a single stabbing synth cell gets rebuilt with more layers each time it drops back in. `germ` develops that one cell further pass to pass rather than swapping in new material." },

{ id:"trance_1998", name:"1998", artist:"Binary Finary", year:1998, bpm:150, tonic:7,
  progId:"aeolian", baseTemplate:"trance",
  narrative:"terraced", vary:0.5, sync:1,
  tip:"Built from one arpeggiated sequencer line that keeps having new layers stacked above it rather than a sung hook. `terraced` is that repeat-a-step-higher layering, at the unusually fast, driving tempo the real record actually runs at." },

{ id:"trance_orangetheme", name:"The Orange Theme", artist:"Cygnus X", year:1994, bpm:148, tonic:0,
  progId:"aeolian", baseTemplate:"trance",
  narrative:"motif", vary:0.6, sync:1,
  tip:"A trance rework of Purcell's funeral music for Queen Mary (the 'A Clockwork Orange' theme) — the classical motif is quoted, then re-harmonized section to section rather than looped unchanged. `motif` restates and transforms that short cell the same way." },

{ id:"trance_simulated", name:"Simulated", artist:"Marco V", year:2002, bpm:135, tonic:10,
  progId:"mixo", baseTemplate:"trance",
  narrative:"chordLock", vary:0.4, sync:2,
  tip:"A tech-trance record built on the filtered 'off'-beat stab sound Marco V pioneered — the riff's notes only change because the chord under it moves, not because it develops its own melody. `chordLock` writes exactly that, pushed to the more aggressive sync." },

{ id:"progtrance_insomnia", name:"Insomnia", artist:"Faithless", year:1995, bpm:127, tonic:11,
  progId:"aeolian", baseTemplate:"progtrance",
  narrative:"chant", vary:0.3, sync:1,
  tip:"The hook is a flat, half-spoken 'I can't get no sleep' reciting pitch over a slow-building groove, not a sung melody — the arrangement does the work while the vocal barely changes. `chant` writes that same reciting, rhythm-led line." },

{ id:"progtrance_gouryella", name:"Gouryella", artist:"Gouryella", year:1999, bpm:138, tonic:7,
  progId:"festival", baseTemplate:"progtrance",
  narrative:"expand", vary:0.6, sync:1,
  tip:"Ferry Corsten and Tiësto's alias track runs a slow-motion filter build into a lead that only reaches its full register at the drop, after minutes of narrow plucked arps. `expand` is that dramatic register-widening moment exactly." },

{ id:"progtrance_airwave", name:"Airwave", artist:"Rank 1", year:2000, bpm:136, tonic:2,
  progId:"aeolian", baseTemplate:"progtrance",
  narrative:"motif", vary:0.5, sync:1,
  tip:"The track's identity is one plucked four-note arp figure that returns re-orchestrated as the arrangement fills in around it, rather than a sung or evolving lead. `motif` restates that short cell with new dressing each section." },

{ id:"progtrance_flight643", name:"Flight 643", artist:"Tiësto", year:2001, bpm:137, tonic:9,
  progId:"aeolian", baseTemplate:"progtrance",
  narrative:"climb", vary:0.6, sync:1,
  tip:"A groove-first record — the bassline and filtered percussion drive the long build, with the lead only creeping upward in register rather than delivering an early hook. `climb` matches that steady rise instead of a repeated chorus." },

{ id:"progtrance_xpander", name:"Xpander", artist:"Sasha", year:1999, bpm:128, tonic:8,
  progId:"mixo", baseTemplate:"progtrance",
  narrative:"terraced", vary:0.7, sync:1,
  tip:"An 11-minute prog-house/trance crossover built almost entirely from arrangement — filtered stabs and a rolling bassline get added and stripped away in blocks rather than a written melody carrying it. `terraced` is that block-by-block layering." },

{ id:"progtrance_thegift", name:"The Gift", artist:"Way Out West ft. Joanna Law", year:1996, bpm:133, tonic:0,
  progId:"axis", baseTemplate:"progtrance",
  narrative:"archSong", vary:0.8, sync:1,
  tip:"A vocal progressive-trance/breakbeat crossover where Joanna Law's line builds once, across the whole record, into a single soaring peak rather than repeating a chorus. `archSong` is that one-arc shape." },

{ id:"progtrance_whatyagot", name:"What Ya Got 4 Me", artist:"Signum", year:2006, bpm:129, tonic:6,
  progId:"deepHouse", baseTemplate:"progtrance",
  narrative:"chant", vary:0.3, sync:2,
  tip:"The hook is a chopped, rhythmically stuttered vocal phrase looped over a rolling bassline rather than a sung line that develops — the groove carries the record, not the words. `chant` writes that reciting, rhythm-first vocal shape." },

{ id:"progtrance_flamingjune", name:"Flaming June", artist:"BT", year:1997, bpm:138, tonic:6,
  progId:"aeolian", baseTemplate:"progtrance",
  narrative:"wave", vary:0.4, sync:0,
  tip:"One of BT's defining early progressive trance records — long, slowly swelling pad and arp layers rather than a sharp hook, with melody emerging gradually out of the wash. `wave` writes that same long undulation." },

{ id:"progtrance_saltwater", name:"Saltwater", artist:"Chicane ft. Máire Brennan", year:1999, bpm:131, tonic:5,
  progId:"aeolian", baseTemplate:"progtrance",
  narrative:"archSong", vary:0.7, sync:0,
  tip:"Built from a sampled Clannad-style vocal phrase stretched into one long, gentle melodic arc over a groove-driven build, rather than a repeated pop chorus. `archSong` captures that single unhurried rise and fall." },

{ id:"progtrance_somnambulist", name:"Somnambulist (Simply Being Loved)", artist:"BT", year:2003, bpm:135, tonic:3,
  progId:"aeolian", baseTemplate:"progtrance",
  narrative:"germ", vary:0.9, sync:2,
  tip:"A Guinness-record vocal-science experiment — thousands of micro-edits of one vocal cell reassembled into a constantly mutating line rather than a fixed melody. `germ` develops that one small cell further each section, at high variation." },

{ id:"upliftingtrance_adagio", name:"Adagio for Strings", artist:"Tiësto", year:2005, bpm:140, tonic:10,
  progId:"festival", baseTemplate:"upliftingtrance",
  narrative:"peak", vary:0.5, sync:0,
  tip:"Tiësto's version keeps Barber's classical climax in reserve, building an enormous breakdown before the string line finally reaches its top note at the drop. `peak` withholds that note the same way the real arrangement does." },

{ id:"upliftingtrance_traffic", name:"Traffic", artist:"Tiësto", year:2003, bpm:138, tonic:10,
  progId:"festival", baseTemplate:"upliftingtrance",
  narrative:"arch", vary:0.5, sync:1,
  tip:"A riff-led instrumental anthem — one melodic phrase rises and resolves within itself each time it plays, rather than building across the whole song. `arch` is that self-contained rise-and-fall, repeated over the festival-lift chords." },

{ id:"upliftingtrance_outoftheblue", name:"Out of the Blue", artist:"System F", year:1999, bpm:140, tonic:7,
  progId:"edm", baseTemplate:"upliftingtrance",
  narrative:"expand", vary:0.6, sync:1,
  tip:"A genre-defining early uplifting anthem — a narrow plucked arp motif in the breakdown suddenly widens into a huge layered string-and-lead register at the drop. `expand` is that exact dramatic widening." },

{ id:"upliftingtrance_sunmoon", name:"Sun & Moon", artist:"Above & Beyond ft. Richard Bedford", year:2011, bpm:134, tonic:6,
  progId:"festival", baseTemplate:"upliftingtrance",
  narrative:"archSong", vary:0.7, sync:1,
  tip:"The vocal builds one long arc toward its release at the drop's high note rather than repeating a chorus, over Above & Beyond's signature enormous breakdown. `archSong` is that single song-length rise and fall." },

{ id:"upliftingtrance_concreteangel", name:"Concrete Angel", artist:"Gareth Emery ft. Christina Novelli", year:2012, bpm:130, tonic:7,
  progId:"edm", baseTemplate:"upliftingtrance",
  narrative:"period", vary:0.5, sync:1,
  tip:"Voted ASOT's Tune of the Year, its verse is built from tidy two-bar call-and-answer vocal phrases that resolve into the anthem's widest drop. `period` writes those paired question-then-answer sentences." },

{ id:"upliftingtrance_exploration", name:"Exploration of Space", artist:"Cosmic Gate", year:2001, bpm:138, tonic:9,
  progId:"festival", baseTemplate:"upliftingtrance",
  narrative:"climb", vary:0.6, sync:1,
  tip:"An instrumental anthem where the main lead's register keeps creeping higher across the arrangement rather than repeating, arriving at its widest register only at the final drop. `climb` matches that steady rise." },

{ id:"upliftingtrance_bigsky", name:"Big Sky", artist:"John O'Callaghan ft. Audrey Gallagher", year:2007, bpm:140, tonic:6,
  progId:"festival", baseTemplate:"upliftingtrance",
  narrative:"peak", vary:0.6, sync:1,
  tip:"ASOT's 2007 Tune of the Year — Audrey Gallagher's vocal withholds its top note until the very last drop, after a long, escalating breakdown. `peak` writes that same withheld high note." },

{ id:"upliftingtrance_sevencities", name:"Seven Cities", artist:"Solarstone", year:1999, bpm:135, tonic:0,
  progId:"edm", baseTemplate:"upliftingtrance",
  narrative:"wave", vary:0.4, sync:0,
  tip:"Solarstone's 'Balearic trance' anthem is carried by long, slow pad and arp swells rather than a stabbing riff — the breakdown is most of the record's identity. `wave` writes that same long undulation." },

{ id:"upliftingtrance_universalnation", name:"Universal Nation", artist:"Push", year:1998, bpm:138, tonic:3,
  progId:"edm", baseTemplate:"upliftingtrance",
  narrative:"arch", vary:0.5, sync:1,
  tip:"One of the tracks that codified the Bonzai uplifting sound — a plucked, arpeggiated riff rises and resolves within each phrase, restated through a long escalating build rather than developed further. `arch` is that self-contained shape." },

{ id:"upliftingtrance_bluefear", name:"Blue Fear", artist:"Armin van Buuren", year:1997, bpm:136, tonic:10,
  progId:"festival", baseTemplate:"upliftingtrance",
  narrative:"germ", vary:0.6, sync:1,
  tip:"An early Armin classic where one short melodic cell is rebuilt with more layers and countermelody each time it returns rather than replaced with a new hook. `germ` develops that one cell further section to section." },

{ id:"goatrance_mahadeva", name:"Mahadeva", artist:"Astral Projection", year:1994, bpm:145, tonic:5,
  progId:"mixo", baseTemplate:"goatrance",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Astral Projection's breakthrough is carried almost entirely by one hypnotic, acid-tinged rolling bassline that barely changes for minutes, everything else just filtering in and out around it. `ostinato` keeps that cell as the actual hook." },

{ id:"goatrance_peoplecanfly", name:"People Can Fly", artist:"Astral Projection", year:1996, bpm:143, tonic:6,
  progId:"mixo", baseTemplate:"goatrance",
  narrative:"climb", vary:0.5, sync:1,
  tip:"A long-form Goa journey that keeps adding texture and raising register gradually rather than delivering a chorus, so the 'hook' is really the arc of the whole track. `climb` writes that same steady rise instead of a repeated figure." },

{ id:"goatrance_lsd", name:"LSD", artist:"Hallucinogen", year:1995, bpm:148, tonic:2,
  progId:"phrygian", baseTemplate:"goatrance",
  narrative:"chant", vary:0.2, sync:1,
  tip:"Built around a spoken sample from a BBC documentary about LSD, looped as a rhythm-locked reciting line over a hypnotic acid bassline rather than a sung hook. `chant` is that held vocal shape; low vary keeps it as static as the real loop." },

{ id:"goatrance_deltaaquarids", name:"Delta Aquarids", artist:"Total Eclipse", year:1995, bpm:142, tonic:7,
  progId:"dorian", baseTemplate:"goatrance",
  narrative:"wave", vary:0.4, sync:1,
  tip:"The title track of a defining Goa album, built on a rolling acid bassline under a long, spacious, slowly undulating pad breakdown rather than a melodic hook. `wave` is that same long undulation." },

{ id:"goatrance_silicontrip", name:"Silicon Trip", artist:"Shakta", year:1997, bpm:146, tonic:10,
  progId:"aeolian", baseTemplate:"goatrance",
  narrative:"terraced", vary:0.5, sync:1,
  tip:"A UK Goa trance classic that builds by stacking a short repeating figure a layer higher each pass rather than introducing new melodic material. `terraced` is that same layering shape." },

{ id:"goatrance_vimana", name:"Vimana", artist:"Etnica", year:1997, bpm:145, tonic:9,
  progId:"mixo", baseTemplate:"goatrance",
  narrative:"motif", vary:0.6, sync:1,
  tip:"Italian Goa pioneers Etnica built this around one short, driving melodic cell that keeps returning re-dressed in new synth textures rather than developing into a new tune. `motif` restates that cell, transformed section to section." },

{ id:"goatrance_teleport", name:"Teleport", artist:"Man With No Name", year:1994, bpm:136, tonic:1,
  progId:"lydian", baseTemplate:"goatrance",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"An early UK Goa staple carried by one hypnotic, rolling acid-bass riff that loops through nearly the entire track rather than developing a melody. `ostinato` matches that minimally-varying repeating cell." },

{ id:"goatrance_foreverafter", name:"Forever After", artist:"Koxbox", year:1995, bpm:142, tonic:4,
  progId:"phrygian", baseTemplate:"goatrance",
  narrative:"germ", vary:0.6, sync:1,
  tip:"The title track of a landmark Danish Goa album — a small melodic cell gets developed further and re-harmonized each time it returns, over a constantly rolling bassline. `germ` is that same cell-by-cell development." },

{ id:"goatrance_cannabanoid", name:"Cannabanoid", artist:"Cosmosis", year:1996, bpm:145, tonic:9,
  progId:"phrygian", baseTemplate:"goatrance",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Cosmosis helped define Goa trance's acid-303 rolling bassline sound, and this track rides one such hypnotic bassline with almost no melodic development on top. `ostinato` keeps that single repeating cell as the actual hook." },

{ id:"goatrance_godisgod", name:"God Is God", artist:"Juno Reactor", year:1997, bpm:140, tonic:9,
  progId:"phrygian", baseTemplate:"goatrance",
  narrative:"chant", vary:0.4, sync:1,
  tip:"Juno Reactor built this around a Middle Eastern-flavoured vocal from Natacha Atlas held as a reciting, rhythm-locked line over a driving rolling bass rather than a Western pop melody. `chant` captures that held reciting shape." },

{ id:"psytrance_thegathering", name:"The Gathering", artist:"Infected Mushroom", year:1999, bpm:142, tonic:11,
  progId:"mixo", baseTemplate:"psytrance",
  narrative:"germ", vary:1, sync:1,
  tip:"Infected Mushroom's breakthrough is built from one distorted lead riff that keeps mutating in timbre and register across the seven-minute runtime rather than introducing fresh material. `germ` develops that same seed section by section, matching how the real track keeps reworking its one idea." },

{ id:"psytrance_saeed", name:"Sa'eed", artist:"Infected Mushroom", year:2003, bpm:145, tonic:5,
  progId:"aeolian", baseTemplate:"psytrance",
  narrative:"motif", vary:0.8, sync:1,
  tip:"Sa'eed's squelchy central hook keeps returning re-filtered, re-pitched and re-voiced rather than repeating verbatim. `motif` writes that short cell recurring in transformed guise each pass." },

{ id:"psytrance_mahadeva99", name:"Mahadeva '99", artist:"Astral Projection", year:1999, bpm:138, tonic:5,
  progId:"mixo", baseTemplate:"psytrance",
  narrative:"terraced", vary:0.5, sync:0,
  tip:"The '99 remake stacks its Eastern-tinged arpeggio a step higher with each added layer, the classic Astral Projection trick of building density purely through register. `terraced` writes exactly that stepwise layering." },

{ id:"psytrance_lsd", name:"LSD", artist:"Hallucinogen", year:1995, bpm:137, tonic:2,
  progId:"aeolian", baseTemplate:"psytrance", bassVoice:"acid",
  narrative:"ostinato", vary:0.2, sync:0,
  tip:"The genre-founding record: one looping, acid-flavoured sixteenth-note cell barely develops for over six minutes, carried by filter sweeps rather than melodic change. `ostinato` at very low vary keeps that single loop intact, with an acid bass voice standing in for the real track's TB-303-descended squelch." },

{ id:"psytrance_teleport", name:"Teleport", artist:"Man With No Name", year:1994, bpm:136, tonic:1,
  progId:"mixo", baseTemplate:"psytrance", bassVoice:"acid",
  narrative:"ostinato", vary:0.3, sync:0,
  tip:"Teleport's hook is a looped Jeff Goldblum dialogue sample riding a hypnotic acid bassline that repeats near-verbatim throughout. `ostinato` mirrors that spoken-sample loop rather than inventing a sung melody." },

{ id:"psytrance_jaws", name:"Jaws", artist:"GMS", year:2002, bpm:149, tonic:10,
  progId:"axis", baseTemplate:"psytrance",
  narrative:"motif", vary:0.6, sync:1,
  tip:"GMS built Jaws around a stabbing, staccato riff that snaps back in slightly altered shapes between drops rather than looping flat. `motif` restates that short cell with real variation section to section." },

{ id:"psytrance_memories", name:"Memories (Overdrive (PSY) Remix)", artist:"Vibe Tribe", year:2024, bpm:145, tonic:2,
  progId:"festival", baseTemplate:"psytrance",
  narrative:"wave", vary:0.6, sync:1,
  tip:"This remix stretches Vibe Tribe's theme into a slow-breathing pad-and-lead swell rather than a hooky repeating riff. `wave` writes that long undulating shape." },

{ id:"psytrance_theritual", name:"The Ritual", artist:"1200 Micrograms", year:2016, bpm:143, tonic:4,
  progId:"aeolian", baseTemplate:"psytrance",
  narrative:"chant", vary:0.4, sync:1,
  tip:"True to its title, The Ritual keeps circling one insistent, rhythm-driven pitch under shifting percussion rather than a moving melody. `chant` writes that held reciting-tone hook." },

{ id:"psytrance_into4thdimension", name:"Into the 4th Dimension", artist:"Space Tribe", year:2019, bpm:147, tonic:7,
  progId:"mixo", baseTemplate:"psytrance",
  narrative:"climb", vary:0.7, sync:1,
  tip:"Space Tribe push the lead line's register steadily upward across the whole track rather than resetting each section. `climb` captures that continuous ascent." },

{ id:"fullonpsy_namaste", name:"Namaste", artist:"Vini Vici", year:2015, bpm:156, tonic:2,
  progId:"edm", baseTemplate:"fullonpsy",
  narrative:"peak", vary:0.8, sync:1,
  tip:"Namaste is built around withholding its biggest vocal-chant peak until deep into the track — the anthemic full-on trick of delaying the payoff. `peak` keeps that top note in reserve until then." },

{ id:"fullonpsy_thetribe", name:"The Tribe", artist:"Vini Vici", year:2015, bpm:138, tonic:4,
  progId:"axis", baseTemplate:"fullonpsy",
  narrative:"chant", vary:0.4, sync:1,
  tip:"The Tribe's tribal vocal chant sits on one repeated pitch driven purely by rhythm, over Vini Vici's rolling trademark bass. `chant` writes that same held, rhythm-first hook." },

{ id:"fullonpsy_deepjunglewalk", name:"Deep Jungle Walk", artist:"Astrix", year:2016, bpm:138, tonic:8,
  progId:"dorian", baseTemplate:"fullonpsy",
  narrative:"terraced", vary:0.6, sync:1,
  tip:"Astrix layers tribal percussion and a jungle-toned lead a step higher with each pass, building density the way full-on does without changing the groove. `terraced` mirrors that stepwise layering; the dorian vamp keeps it minor without turning sad." },

{ id:"fullonpsy_neurochemistry", name:"Neurochemistry", artist:"Ace Ventura ft. Liquid Soul", year:2015, bpm:136, tonic:7,
  progId:"mixo", baseTemplate:"fullonpsy",
  narrative:"germ", vary:0.9, sync:1,
  tip:"Neurochemistry keeps reworking one melodic cell into denser variations as the track builds, more layers stacking on the rolling bass than plain psytrance would carry. `germ` develops that seed further each section." },

{ id:"fullonpsy_whohasthemarijuana", name:"Who Has The Marijuana?", artist:"Alien Project", year:2004, bpm:145, tonic:9,
  progId:"axis", baseTemplate:"fullonpsy",
  narrative:"qanda", vary:0.5, sync:1,
  tip:"The title vocal sample is posed, then answered right after it by the bright major-key lead line, a genuinely playful full-on hook. `qanda` writes that same question-and-answer shape." },

{ id:"fullonpsy_speedfreaks", name:"Speed Freaks", artist:"1200 Micrograms", year:2016, bpm:143, tonic:11,
  progId:"axis", baseTemplate:"fullonpsy",
  narrative:"climb", vary:0.6, sync:1,
  tip:"1200 Micrograms build Speed Freaks around a lead line that keeps creeping higher in register as the track's intensity accelerates. `climb` traces that continuous rise." },

{ id:"fullonpsy_rollercoaster", name:"Rollercoaster", artist:"Sesto Sento", year:2006, bpm:146, tonic:6,
  progId:"dorian", baseTemplate:"fullonpsy",
  narrative:"wave", vary:0.7, sync:1,
  tip:"Sesto Sento's Rollercoaster swells and dips in long undulating waves rather than looping a fixed riff, true to its name. `wave` writes that same slow rise-and-fall shape." },

{ id:"fullonpsy_type1", name:"Type 1", artist:"Astrix", year:2012, bpm:138, tonic:9,
  progId:"axis", baseTemplate:"fullonpsy",
  narrative:"motif", vary:0.6, sync:1,
  tip:"Type 1 restates its central riff with small rhythmic tweaks each time it resurfaces rather than looping it flat. `motif` captures that lightly varied recurrence." },

{ id:"fullonpsy_acid", name:"Acid", artist:"Freedom Fighters & Vini Vici", year:2020, bpm:138, tonic:4,
  progId:"axis", baseTemplate:"fullonpsy",
  narrative:"chordLock", vary:0.5, sync:1,
  tip:"Acid's stabbing riff only moves because the chord underneath shifts — a classic instrumental-stab full-on lead rather than a sung hook. `chordLock` writes exactly that chord-snapped riff." },

{ id:"darkpsy_battleship", name:"Battleship", artist:"Xerox & Illumination", year:2005, bpm:145, tonic:7,
  progId:"mixo", baseTemplate:"darkpsy",
  narrative:"chordLock", vary:0.4, sync:2,
  tip:"Battleship's riff snaps hard to each chord change rather than floating a free melody over it, giving this twilight-era anthem its aggressive, mechanical edge. `chordLock` at the higher sync writes that same chord-locked stab." },

{ id:"darkpsy_91skriamer", name:"91 Skriamer", artist:"Parasense", year:2003, bpm:145, tonic:3,
  progId:"mixo", baseTemplate:"darkpsy",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"One of Parasense's foundational Russian 'night' tracks: a single hypnotic riff loops with almost no melodic development, the blueprint that fed directly into darkpsy. `ostinato` at low vary keeps that one-cell loop intact, built to disorient rather than resolve." },

{ id:"darkpsy_element", name:"Element", artist:"Parasense", year:2009, bpm:145, tonic:1,
  progId:"mixo", baseTemplate:"darkpsy",
  narrative:"germ", vary:0.6, sync:1,
  tip:"Element restates its central riff in denser, more distorted shapes as the track wears on, years into Parasense's evolution of the night-psy sound. `germ` develops that seed further each section." },

{ id:"darkpsy_interdisciplinarysubfield", name:"Interdisciplinary Subfield", artist:"Parasense", year:2018, bpm:147, tonic:2,
  progId:"axis", baseTemplate:"darkpsy",
  narrative:"motif", vary:0.7, sync:1,
  tip:"This later Parasense cut layers a returning theme with real rhythmic and timbral variation each time it resurfaces rather than looping unchanged. `motif` captures that transformed restatement." },

{ id:"darkpsy_perpetuummobile", name:"Perpetuum Mobile", artist:"Terrafractyl", year:2024, bpm:144, tonic:5,
  progId:"aeolian", baseTemplate:"darkpsy",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"True to its title, Perpetuum Mobile runs one mechanical minor-key cell almost unchanged for its whole length rather than developing a melody. `ostinato` at very low vary mirrors that endlessly repeating loop." },

{ id:"darkpsy_borntogrit", name:"Born to Grit", artist:"Kindzadza", year:2023, bpm:200, tonic:2,
  progId:"axisMinor", baseTemplate:"darkpsy", bassVoice:"reese",
  narrative:"chant", vary:0.3, sync:2,
  tip:"Kindzadza's hitech-adjacent Born to Grit rides a distorted, rhythm-driven vocal chop at a punishing 200bpm rather than a sung line. `chant` at the higher sync writes that same rhythm-first, pitch-held hook, with a growling reese bass standing in for its distorted low end." },

{ id:"darkpsy_deeplydisturbed", name:"Deeply Disturbed", artist:"Infected Mushroom", year:1999, bpm:146, tonic:5,
  progId:"mixo", baseTemplate:"darkpsy",
  narrative:"germ", vary:0.7, sync:1,
  tip:"One of Infected Mushroom's harshest early cuts, Deeply Disturbed reworks its noisy stab hook into increasingly distorted variations across the track. `germ` develops that seed section by section." },

{ id:"darkpsy_momentoftruth", name:"Moment of Truth", artist:"Man With No Name", year:1996, bpm:140, tonic:7,
  progId:"mixo", baseTemplate:"darkpsy",
  narrative:"terraced", vary:0.5, sync:1,
  tip:"This harder-edged 1996 cut layers its Goa-tech riff a step higher with each new section, building tension purely through register. `terraced` mirrors that stepwise buildup." },

{ id:"darkpsy_keytotheinnerverse", name:"Key to the Innerverse", artist:"Cosmosis", year:1996, bpm:143, tonic:9,
  progId:"axis", baseTemplate:"darkpsy",
  narrative:"wave", vary:0.5, sync:0,
  tip:"Cosmosis's twilight-era classic — released on the Cosmology album — undulates in long psychedelic pad swells rather than looping a fixed riff. `wave` captures that slow undulation." },

{ id:"darkpsy_thecrucible", name:"The Crucible", artist:"Total Eclipse", year:1995, bpm:140, tonic:2,
  progId:"mixo", baseTemplate:"darkpsy",
  narrative:"cascade", vary:0.5, sync:1,
  tip:"The Crucible's lead line descends in a repeating falling sequence rather than climbing toward a hook, giving this mid-90s Delta Aquarids-era staple its ominous pull. `cascade` writes that same falling-sequence shape." },

{ id:"progpsy_birdofparadise", name:"Bird of Paradise", artist:"Ticon", year:2017, bpm:139, tonic:7,
  progId:"mixo", baseTemplate:"progpsy",
  narrative:"wave", vary:0.6, sync:1,
  tip:"Ticon favours a long, slow-breathing melodic swell over a hooky stabbing riff — the groovier, deeper pocket that separates progressive from full-on. `wave` writes that undulating shape instead of a repeating cell." },

{ id:"progpsy_facethetruth", name:"Face the Truth", artist:"Symphonix", year:2014, bpm:138, tonic:9,
  progId:"axis", baseTemplate:"progpsy",
  narrative:"arch", vary:0.7, sync:1,
  tip:"Symphonix build their theme as a phrase that rises and resolves back down within each section rather than looping flat, over their trademark laid-back, sea-deep groove. `arch` traces that rise-and-fall shape." },

{ id:"progpsy_landmark", name:"Landmark", artist:"Vibrasphere", year:2006, bpm:138, tonic:8,
  progId:"mixo", baseTemplate:"progpsy",
  narrative:"climb", vary:0.8, sync:0,
  tip:"Vibrasphere creep the lead register steadily upward across the whole nine-minute arrangement instead of resetting each section — a classic deep progressive slow-build. `climb` captures that continuous ascent." },

{ id:"progpsy_leapoffaith", name:"Leap of Faith", artist:"Perfect Stranger", year:2012, bpm:126, tonic:5,
  progId:"axis", baseTemplate:"progpsy",
  narrative:"peak", vary:0.9, sync:0,
  tip:"At a deep 126bpm, Perfect Stranger's Leap of Faith withholds its main melodic payoff until very late in its nine-minute run, true to progressive psy's patient, less-frantic pacing. `peak` keeps that top note in reserve." },

{ id:"progpsy_keytotheuniverse", name:"Key to the Universe", artist:"Sesto Sento", year:2015, bpm:144, tonic:0,
  progId:"aeolian", baseTemplate:"progpsy",
  narrative:"qanda", vary:0.6, sync:1,
  tip:"Sesto Sento poses a short lead phrase and answers it with a second, matching one right after it — an actual question-and-answer structure. `qanda` writes that same call-and-answer shape." },

{ id:"progpsy_childrenofearth", name:"Children of Earth", artist:"Liquid Soul & Timelock", year:2019, bpm:138, tonic:4,
  progId:"dorian", baseTemplate:"progpsy",
  narrative:"period", vary:0.6, sync:1,
  tip:"This collaboration sits in tidy two-bar question-then-answer sentences over a static minor groove rather than a driving anthem. `period` and the dorian vamp both capture that grounded, tech-house-adjacent pocket." },

{ id:"progpsy_longestjourney", name:"Longest Journey", artist:"Aphid Moon ft. Tron", year:2019, bpm:144, tonic:4,
  progId:"axis", baseTemplate:"progpsy",
  narrative:"expand", vary:0.8, sync:1,
  tip:"Aphid Moon and Tron widen the register dramatically at the track's emotional high point rather than building gradually, true to its 'journey' framing. `expand` captures that sudden widening." },

{ id:"progpsy_matter", name:"Matter", artist:"Sphera", year:2015, bpm:138, tonic:4,
  progId:"mixo", baseTemplate:"progpsy",
  narrative:"motif", vary:0.5, sync:1,
  tip:"Sphera restates Matter's central motif with small variations each time it returns, never looping it flat, over a deep, less-frantic groove. `motif` captures that lightly varied recurrence." },

{ id:"progpsy_thecrow", name:"The Crow", artist:"GMS", year:1997, bpm:145, tonic:0,
  progId:"axis", baseTemplate:"progpsy",
  narrative:"lament", vary:0.5, sync:0,
  tip:"GMS's 1997 cut is built on a genuinely descending lead line, giving The Crow's melody its brooding downward pull rather than the genre's usual rising energy. `lament` writes that same descending shape." },

{ id:"progpsy_pranava", name:"Pranava", artist:"Ace Ventura & Astrix", year:2015, bpm:138, tonic:7,
  progId:"mixo", baseTemplate:"progpsy",
  narrative:"germ", vary:0.7, sync:1,
  tip:"Ace Ventura and Astrix keep developing one central seed motif into denser variations as the track deepens, the more melodically-worked feel typical of progressive psy. `germ` captures that section-by-section development." },
{ id:"ukhardcore_charly", name:"Charly", artist:"The Prodigy", year:1991, bpm:131, tonic:8,
  progId:"axisMinor", baseTemplate:"ukhardcore",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Built almost entirely around the looped 'Charly says...' public-safety-cartoon sample and a rising synth stab rather than any sung hook — one of the first UK top-five breakbeat hardcore records. `ostinato` writes that same barely-developed looped cell instead of a real melody." },

{ id:"ukhardcore_outofspace", name:"Out of Space", artist:"The Prodigy", year:1992, bpm:138, tonic:7,
  progId:"axisMinor", baseTemplate:"ukhardcore",
  narrative:"motif", vary:0.4, sync:1,
  tip:"The pitched-down Max Romeo vocal ('I was born...') and the descending bell riff both function as a short motif that returns transformed each section rather than developing into a real tune. `motif` captures that cell-and-restate shape." },

{ id:"ukhardcore_ragatip", name:"On a Ragga Tip", artist:"SL2", year:1992, bpm:140, tonic:9,
  progId:"mixo", baseTemplate:"ukhardcore",
  narrative:"callResp", vary:0.6, sync:2,
  tip:"UK #2 hit built on a ragga MC toast answered by rave piano stabs — literally the style's call-and-response between chatted vocal and stabbed chords. `callResp` at the higher sync level matches the record's push against the beat." },

{ id:"ukhardcore_sesamestreet", name:"Sesame's Treet", artist:"Smart E's", year:1992, bpm:142, tonic:10,
  progId:"axis", baseTemplate:"ukhardcore",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"A UK top-two novelty hit made from looping the Sesame Street theme's own riff over breakbeat hardcore drums, barely varied — `ostinato` writes that same repeated borrowed-melody cell rather than inventing new development." },

{ id:"ukhardcore_raving", name:"Raving I'm Raving", artist:"Shut Up and Dance", year:1992, bpm:150, tonic:4,
  progId:"gospel", baseTemplate:"ukhardcore",
  narrative:"archSong", vary:0.5, sync:1,
  tip:"Built from a speeded-up Marc Cohn 'Walking in Memphis' vocal sample over piano and breaks — the sample's own gospel-tinged rise-and-fall shape carries the whole record (and got it pulled from sale over clearance). `archSong` mirrors that one-arc-per-song contour." },

{ id:"ukhardcore_trumpton", name:"A Trip to Trumpton", artist:"Urban Hype", year:1992, bpm:150, tonic:0,
  progId:"edm", baseTemplate:"ukhardcore",
  narrative:"terraced", vary:0.5, sync:1,
  tip:"UK top-ten rave record built from sampled dialogue off the kids' TV show Trumpton stacked over layered, rising piano stabs — `terraced` writes that same short figure re-entering a step higher as each layer piles on." },

{ id:"ukhardcore_fantasy", name:"Let Me Be Your Fantasy", artist:"Baby D", year:1992, bpm:139, tonic:9,
  progId:"deepHouse", baseTemplate:"ukhardcore",
  narrative:"archSong", vary:0.6, sync:1,
  tip:"A UK #1 (on reissue) built on a soaring, sung piano-house-meets-hardcore hook that rises across the whole record rather than looping flat — `archSong` writes that single wide arc, more melodically developed than the genre's sample-loop norm." },

{ id:"ukhardcore_bombscare", name:"Bombscare", artist:"2 Bad Mice", year:1992, bpm:150, tonic:2,
  progId:"aeolian", baseTemplate:"ukhardcore",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"A Kickin' Records breakbeat hardcore anthem driven by one chopped break-and-riff cell repeated rather than developed, with the piano stabs doing the euphoric lifting. `ostinato` at low vary matches its loop-first construction." },

{ id:"ukhardcore_farout", name:"Far Out", artist:"Sonz of a Loop Da Loop Era", year:1992, bpm:150, tonic:7,
  progId:"axisMinor", baseTemplate:"ukhardcore",
  narrative:"chant", vary:0.3, sync:1,
  tip:"One of the genre's biggest Suburban Base anthems, built on a chanted 'far out' vocal sample held over rising piano stabs rather than a sung melody. `chant` writes that reciting, rhythm-led hook directly." },

{ id:"ukhardcore_tripiimoon", name:"Trip II the Moon (Part 2)", artist:"Acen", year:1992, bpm:150, tonic:9,
  progId:"aeolian", baseTemplate:"ukhardcore",
  narrative:"wave", vary:0.5, sync:1,
  tip:"A Production House breakbeat hardcore classic that leans on long synth-string swells under the amen chops rather than a stabbed hook — `wave`'s slow undulation captures that pad-led atmosphere better than a riff-based narrative would." },

{ id:"jungle_originalnuttah", name:"Original Nuttah", artist:"Shy FX & UK Apachi", year:1994, bpm:161, tonic:11,
  progId:"aeolian", baseTemplate:"jungle",
  narrative:"chant", vary:0.4, sync:2,
  tip:"UK Apache's ragga toast rides a chopped amen and rolling sub — one of jungle's most sampled records, still a rave-scene fixture decades later. `chant` writes that reciting toasted vocal over the syncopated break." },

{ id:"jungle_incredible", name:"Incredible", artist:"M-Beat ft. General Levy", year:1994, bpm:161, tonic:9,
  progId:"deepHouse", baseTemplate:"jungle",
  narrative:"callResp", vary:0.5, sync:2,
  tip:"A UK top-ten jungle crossover where General Levy's hyped ragga hook trades directly against the chopped break and stab hits. `callResp` writes that vocal-and-drum trade rather than a continuous melodic line." },

{ id:"jungle_terminator", name:"Terminator", artist:"Goldie", year:1992, bpm:150, tonic:6,
  progId:"axisMinor", baseTemplate:"jungle",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"Released as Metalheads, built on a heavily timestretched Terminator film sample and one relentlessly manipulated break — a foundational darkcore/jungle record precisely because it barely develops harmonically. `ostinato` at low vary matches that one-cell obsession." },

{ id:"jungle_ricky", name:"Ricky", artist:"Remarc", year:1994, bpm:165, tonic:4,
  progId:"aeolian", baseTemplate:"jungle",
  narrative:"germ", vary:0.8, sync:2, within:true,
  tip:"Remarc's amen work is famous for getting more mangled as the record runs, not less — the same break cell resliced harder each pass. `germ` develops one cell further section to section, with `within:true` for how it keeps mutating inside a single pass too." },

{ id:"jungle_wickedestsound", name:"Wickedest Sound", artist:"Rebel MC & Tenor Fly", year:1993, bpm:160, tonic:9,
  progId:"deepHouse", baseTemplate:"jungle",
  narrative:"callResp", vary:0.5, sync:2,
  tip:"An early ragga-jungle template — Tenor Fly's toast answers Rebel MC's productions bar for bar over a chopped break. `callResp` writes that same vocal-trade structure rather than a through-composed line." },

{ id:"jungle_helicoptertune", name:"The Helicopter Tune", artist:"Deep Blue", year:1993, bpm:160, tonic:2,
  progId:"aeolian", baseTemplate:"jungle",
  narrative:"wave", vary:0.4, sync:1,
  tip:"Named for its swirling, siren-like sweep effect that rises and falls under the chopped amen — the effect is the hook, not a played line. `wave`'s long undulation is a closer fit than a riff-based narrative here." },

{ id:"jungle_shotinthedark", name:"Shot in the Dark", artist:"DJ Hype", year:1994, bpm:163, tonic:7,
  progId:"axisMinor", baseTemplate:"jungle",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"A dark Ganja Records jungle roller built on one looped bass riff under an increasingly chopped break, with tension coming from the drum edits rather than harmonic movement. `ostinato` matches that flat, loop-first bassline." },

{ id:"jungle_valleyoftheshadows", name:"Valley of the Shadows", artist:"Origin Unknown", year:1993, bpm:160, tonic:9,
  progId:"deepHouse", baseTemplate:"jungle",
  narrative:"peak", vary:0.4, sync:1,
  tip:"RAM Records' defining jungle anthem is built around a long-withheld drop into sub-bass and break — the arrangement's whole job is delaying that one moment. `peak` writes exactly that withheld payoff." },

{ id:"jungle_thelighter", name:"The Lighter", artist:"DJ SS", year:1994, bpm:162, tonic:5,
  progId:"aeolian", baseTemplate:"jungle",
  narrative:"motif", vary:0.4, sync:1,
  tip:"A Formation Records jungle classic that restates a short sampled horn/vocal stab across sections rather than composing a new line each time. `motif` gives that cell room to return transformed without becoming a real melody." },

{ id:"jungle_darkstranger", name:"Dark Stranger", artist:"Johnny Jungle", year:1994, bpm:165, tonic:10,
  progId:"axisMinor", baseTemplate:"jungle",
  narrative:"germ", vary:0.9, sync:2, within:true,
  tip:"An early Metalheadz release whose amen gets audibly more aggressive and finely diced as it runs — the label's whole ethos in one track. `germ` with high vary and `within:true` writes that escalating, self-mutating chop." },

{ id:"dnb_music", name:"Music", artist:"LTJ Bukem", year:1993, bpm:160, tonic:5,
  progId:"dorian", baseTemplate:"dnb",
  narrative:"wave", vary:0.5, sync:0,
  tip:"One of the records that founded 'intelligent' jungle — long, slow pad chords stated well before the double-time breaks properly lock in. `dorian`'s static minor-but-not-sad color and `wave`'s slow undulation both suit atmosphere-first construction." },

{ id:"dnb_nitenichiryu", name:"Ni Ten Ichi Ryu (Two Sword Technique)", artist:"Photek", year:1997, bpm:172, tonic:9,
  progId:"dorian", baseTemplate:"dnb",
  narrative:"motif", vary:0.6, sync:1,
  tip:"From Photek's Modus Operandi, famous for surgically rearranged breaks under a spare, half-time-feeling bassline pulse. `motif` writes a short cell that returns rearranged, matching that meticulous-programming character." },

{ id:"dnb_snakestyle", name:"Snake Style", artist:"Source Direct", year:1996, bpm:172, tonic:2,
  progId:"aeolian", baseTemplate:"dnb",
  narrative:"germ", vary:0.6, sync:1,
  tip:"A dark techstep landmark built on a reversed, warped vocal/sample cell that mutates further each pass over double-time drums. `germ` develops that one cell rather than introducing new material." },

{ id:"dnb_western", name:"Western", artist:"PFM", year:1996, bpm:172, tonic:9,
  progId:"dorian", baseTemplate:"dnb",
  narrative:"wave", vary:0.4, sync:0,
  tip:"A Metalheadz cornerstone literally built on a slow, half-time bass pulse under fast double-time breaks — the exact shape this style describes. `wave`'s long undulation and `dorian`'s static minor color both track that low end." },

{ id:"dnb_silverblade", name:"Silver Blade", artist:"Dillinja", year:1996, bpm:174, tonic:2,
  progId:"axisMinor", baseTemplate:"dnb",
  narrative:"chordLock", vary:0.4, sync:1,
  tip:"Dillinja's technical, bass-forward roller moves harmonically only when the sub underneath moves — the riff is locked to the chord, not singing over it. `chordLock` writes that exact stab-follows-chord relationship." },

{ id:"dnb_brownpaperbag", name:"Brown Paper Bag", artist:"Roni Size / Reprazent", year:1997, bpm:172, tonic:9,
  progId:"deepHouse", baseTemplate:"dnb",
  narrative:"motif", vary:0.7, sync:1,
  tip:"From the Mercury Prize-winning New Forms, its famous double-bass riff is restated and reworked with real jazz-inflected variation section to section. `motif` at higher vary matches that genuine melodic development, unusual for the genre's loop norm." },

{ id:"dnb_circles", name:"Circles", artist:"Adam F", year:1997, bpm:172, tonic:5,
  progId:"deepHouse", baseTemplate:"dnb",
  narrative:"archSong", vary:0.6, sync:1,
  tip:"A global dnb crossover hit that literally opens half-time on a Rhodes-style hook before the double-time breaks drop — atmosphere stated first, exactly as the style calls for. `archSong` writes that one wide rise-and-fall across the whole record." },

{ id:"dnb_thenine", name:"The Nine", artist:"Bad Company UK", year:2000, bpm:174, tonic:0,
  progId:"axisMinor", baseTemplate:"dnb",
  narrative:"wave", vary:0.4, sync:1,
  tip:"Opens on a huge, stated string/atmosphere pad well before the breaks properly enter — a dnb DJ-set staple precisely because of that patient build. `wave` gives the atmosphere its slow-moving own statement first." },

{ id:"dnb_nineteeneightyfour", name:"1984", artist:"Alix Perez", year:2008, bpm:174, tonic:7,
  progId:"dorian", baseTemplate:"dnb",
  narrative:"motif", vary:0.5, sync:1,
  tip:"Alix Perez's breakout Shogun Audio single sits a dark, repeating synth cell over double-time drums with real but restrained development. `motif` and `dorian`'s static-minor color match that tense-but-not-melodic-hook shape." },

{ id:"liquiddnb_ifweever", name:"If We Ever", artist:"High Contrast", year:2007, bpm:172, tonic:5,
  progId:"jazz", baseTemplate:"liquiddnb",
  narrative:"arch", vary:0.7, sync:1,
  tip:"From True Colours, High Contrast's soulful instrumental melody rises and falls within each phrase over a smoothed, rounded sub rather than a snarling reese. `arch` and the `jazz` chords match that melody-led, non-aggressive low end." },

{ id:"liquiddnb_horizons", name:"Horizons", artist:"LTJ Bukem", year:1995, bpm:165, tonic:8,
  progId:"jazz", baseTemplate:"liquiddnb",
  narrative:"wave", vary:0.5, sync:0,
  tip:"A foundational 'intelligent' jungle record built on drifting Rhodes-style jazz chords under the breaks — melody and atmosphere lead throughout, the template liquid later formalised. `wave` writes that slow harmonic drift." },

{ id:"liquiddnb_justonesecond", name:"Just One Second", artist:"London Elektricity", year:2005, bpm:172, tonic:2,
  progId:"neoSoul", baseTemplate:"liquiddnb",
  narrative:"period", vary:0.6, sync:1,
  tip:"From Hospital Records' Different Drums, its horn-and-vocal phrasing works in tidy question-then-answer two-bar sentences over a round, musical sub. `period` writes that same call-and-settle phrase structure." },

{ id:"liquiddnb_evenif", name:"Even If", artist:"Calibre", year:2003, bpm:172, tonic:9,
  progId:"deepHouse", baseTemplate:"liquiddnb",
  narrative:"lament", vary:0.5, sync:1,
  tip:"Calibre's Signature-era liquid sits a wistful, descending vocal-adjacent melody over a soft sub rather than an aggressive bassline. `lament`'s falling line is the direct match for that mood." },

{ id:"liquiddnb_realise", name:"Realise", artist:"Marcus Intalex & ST Files", year:2004, bpm:172, tonic:4,
  progId:"aeolian", baseTemplate:"liquiddnb",
  narrative:"arch", vary:0.6, sync:1,
  tip:"Marcus Intalex's melodic, jazzy wing of dnb built its reputation on tunes like this one — a warm minor-key melody that rises and settles within each phrase over a rounded low end rather than a growling one." },

{ id:"liquiddnb_lk", name:"LK (Carolina Carol Bela)", artist:"DJ Marky & XRS ft. Stamina MC", year:2003, bpm:174, tonic:0,
  progId:"bossa", baseTemplate:"liquiddnb",
  narrative:"period", vary:0.7, sync:2,
  tip:"Built on a sampled Brazilian nursery-rhyme melody (Toquinho's 'Carolina Carol Bela') with a live MC trading over it — the `bossa` progression nods to that samba-jazz source and `period` matches its sung-phrase call-and-answer." },

{ id:"liquiddnb_rain", name:"Rain", artist:"S.P.Y", year:2011, bpm:174, tonic:7,
  progId:"dorian", baseTemplate:"liquiddnb",
  narrative:"wave", vary:0.5, sync:1,
  tip:"S.P.Y's liquid roller leans on a slow, drifting pad and a round sub rather than a hooky top-line — the mood is the melody. `wave`'s long undulation fits that atmosphere-led writing." },

{ id:"liquiddnb_videovertigo", name:"Video Vertigo", artist:"Etherwood", year:2014, bpm:172, tonic:9,
  progId:"neoSoul", baseTemplate:"liquiddnb",
  narrative:"arch", vary:0.6, sync:1,
  tip:"Etherwood's Med School-era liquid sits a warm, soulful synth-lead melody that rises and resolves within each phrase over a soft, rounded bassline. `arch` is the phrase-level shape that mood keeps returning to." },

{ id:"liquiddnb_morningsun", name:"Morning Sun", artist:"Fred V & Grafix", year:2014, bpm:174, tonic:0,
  progId:"futureBass", baseTemplate:"liquiddnb",
  narrative:"expand", vary:0.6, sync:1,
  tip:"A Hospital Records liquid hit where the register visibly widens into a bright, major-key hook at the drop rather than staying narrow. `expand` and `futureBass`'s major lift both capture that brightening at the hook." },

{ id:"liquiddnb_lovehasgone", name:"Love Has Gone", artist:"Netsky", year:2010, bpm:174, tonic:5,
  progId:"deepHouse", baseTemplate:"liquiddnb",
  narrative:"archSong", vary:0.6, sync:1,
  tip:"From Netsky's self-titled debut, a melodic vocal hook rises and falls once across the whole record rather than looping flat — one of the tracks that took liquid's jazzy, song-like wing to a much bigger audience. `archSong` writes that single wide arc." },

{ id:"neurofunk_cyanide", name:"Cyanide", artist:"Konflict", year:1998, bpm:174, tonic:9,
  progId:"axisMinor", baseTemplate:"neurofunk",
  narrative:"chordLock", vary:0.3, sync:1,
  tip:"A genre-defining No U-Turn/Renegade Hardware release — the distorted reese only moves when the underlying chord does, engineering tension through pure sound design rather than melody. `chordLock` writes that riff-follows-chord relationship exactly." },

{ id:"neurofunk_wormhole", name:"Wormhole", artist:"Ed Rush & Optical", year:1998, bpm:174, tonic:2,
  progId:"aeolian", baseTemplate:"neurofunk",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"From the Wormhole album that helped codify neurofunk, one grinding reese cell carries the drop with almost no harmonic development. `ostinato` at low vary matches that single-cell, sound-design-first drop." },

{ id:"neurofunk_machinegun", name:"Machine Gun", artist:"Noisia", year:2010, bpm:174, tonic:0,
  progId:"axisMinor", baseTemplate:"neurofunk",
  narrative:"chordLock", vary:0.3, sync:2,
  tip:"Noisia's biggest crossover neurofunk moment — a stuttering, hyper-processed reese stab that snaps to the chord changes rather than singing over them. `chordLock` at the more aggressive sync captures that mechanical push." },

{ id:"neurofunk_rooted", name:"Rooted", artist:"Black Sun Empire", year:2005, bpm:174, tonic:7,
  progId:"aeolian", baseTemplate:"neurofunk",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"A Black Sun Empire dancefloor staple built on one dark, distorted bass cell that barely develops — the tension comes from the sound design, not the arrangement. `ostinato` matches that flat, engineered repetition." },

{ id:"neurofunk_diplodocus", name:"Diplodocus", artist:"Noisia", year:2005, bpm:174, tonic:4,
  progId:"axisMinor", baseTemplate:"neurofunk",
  narrative:"motif", vary:0.5, sync:1,
  tip:"An early Noisia release whose central riff mutates and re-processes itself as the track runs rather than restating flat. `motif` gives that cell room to return audibly changed each pass." },

{ id:"neurofunk_larva", name:"Larva", artist:"Phace", year:2011, bpm:174, tonic:9,
  progId:"aeolian", baseTemplate:"neurofunk",
  narrative:"chordLock", vary:0.3, sync:2,
  tip:"A Neosignal Recordings neurofunk cut where the growling low end is locked hard to sparse chord stabs rather than carrying its own tune. `chordLock` is the direct fit for that riff-under-chord relationship." },

{ id:"neurofunk_emulate", name:"Emulate", artist:"Mefjus", year:2014, bpm:174, tonic:2,
  progId:"axisMinor", baseTemplate:"neurofunk",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"Mefjus built his name on exactly this kind of mechanically precise, distorted reese drop with minimal harmonic movement. `ostinato` at the higher sync level matches that engineered, machine-tight repetition." },

{ id:"neurofunk_sinister", name:"Sinister", artist:"Evol Intent", year:2005, bpm:174, tonic:0,
  progId:"aeolian", baseTemplate:"neurofunk",
  narrative:"chordLock", vary:0.4, sync:1,
  tip:"US neurofunk act Evol Intent build the drop around a distorted bass riff that only shifts when the chord underneath does. `chordLock` writes that same stab-led, chord-anchored bass movement." },

{ id:"neurofunk_bricks", name:"Bricks", artist:"The Upbeats", year:2011, bpm:174, tonic:7,
  progId:"axisMinor", baseTemplate:"neurofunk",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"A New Zealand neurofunk anthem carried by one hard, distorted bass cell with almost no melodic elaboration — the drop's identity is the sound design. `ostinato` matches that engineered flatness." },

{ id:"neurofunk_deceiver", name:"Deceiver", artist:"Black Sun Empire & Noisia", year:2010, bpm:174, tonic:5,
  progId:"aeolian", baseTemplate:"neurofunk",
  narrative:"chordLock", vary:0.4, sync:2,
  tip:"A Counterstrike collaboration (Black Sun Empire and Noisia) built on a snarling reese that snaps to sparse chord stabs — tension built entirely by sound design and rhythm. `chordLock` at high sync captures that mechanical bite." },

{ id:"halftimewave_gullyhalves", name:"Gully Halves", artist:"Alix Perez", year:2013, bpm:140, tonic:7,
  progId:"dorian", baseTemplate:"halftimewave",
  narrative:"wave", vary:0.5, sync:1,
  tip:"Named for its half-time gait, cited by Ivy Lab among the genre's defining tracks — a dnb-tempo reese growl felt at half speed rather than a straight dubstep drop. `wave`'s long undulation matches its slow-motion low end." },

{ id:"halftimewave_pipedream", name:"Pipe Dream", artist:"Eprom", year:2013, bpm:140, tonic:0,
  progId:"axisMinor", baseTemplate:"halftimewave",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"An Ivy Lab-cited halftime touchstone from West Coast bass producer Eprom, built on one warped, dnb-derived bass cell rather than a developed melody. `ostinato` matches that loop-first, sound-design-forward drop." },

{ id:"halftimewave_phantomforce", name:"Phantom Force (Fracture Remix)", artist:"Digital & Spirit", year:2014, bpm:140, tonic:2,
  progId:"aeolian", baseTemplate:"halftimewave",
  narrative:"motif", vary:0.5, sync:1,
  tip:"Fracture's remix of the '90s Digital & Spirit dnb anthem recasts it at half-time — one of the tracks Ivy Lab named as genre-defining for showing how a jungle-era cell reads completely differently slowed to halftime's gait." },

{ id:"halftimewave_ayo", name:"Ayo", artist:"Sam Binga & Redders", year:2014, bpm:140, tonic:9,
  progId:"deepHouse", baseTemplate:"halftimewave",
  narrative:"chant", vary:0.4, sync:2,
  tip:"A Critical Music halftime cut built on a chopped, reciting vocal hook over a growling dnb-tempo reese slowed to a half-time pocket. `chant` writes that rhythm-driven, repeated-syllable vocal directly." },

{ id:"halftimewave_hopscotch", name:"Hopscotch", artist:"Mr. Carmack", year:2013, bpm:140, tonic:4,
  progId:"dorian", baseTemplate:"halftimewave",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"Named by Ivy Lab as a defining halftime cut from a producer working the trap/dubstep border of the scene — a single syncopated bass cell over a halftime pocket rather than a built melody." },

{ id:"halftimewave_brockwild", name:"Brockwild", artist:"Darkhouse Family", year:2015, bpm:140, tonic:5,
  progId:"aeolian", baseTemplate:"halftimewave",
  narrative:"motif", vary:0.5, sync:1,
  tip:"A dark, dubstep-adjacent halftime cut from the Darkhouse Family crew, built on a repeating reese-growl cell that shifts register section to section rather than a sung line. `motif` gives that cell room to return altered." },

{ id:"halftimewave_shadesminotaur", name:"Shades (Minotaur)", artist:"Alix Perez & Eprom", year:2015, bpm:140, tonic:9,
  progId:"axisMinor", baseTemplate:"halftimewave",
  narrative:"wave", vary:0.5, sync:1,
  tip:"A transatlantic wave/halftime collaboration pairing Alix Perez's dnb pedigree with Eprom's West Coast bass design — a slow-moving reese swell under a halftime pocket rather than a hooky top-line." },

{ id:"halftimewave_solarcycle", name:"Solar Cycle", artist:"Om Unit & Kromestar", year:2014, bpm:140, tonic:2,
  progId:"dorian", baseTemplate:"halftimewave",
  narrative:"ostinato", vary:0.4, sync:1,
  tip:"A Cosmic Bridge collaboration cited among Ivy Lab's ten defining halftime tracks — jungle-tempo drum science reworked into a halftime bass roller with one dominant, barely-varied low-end cell." },

{ id:"halftimewave_inviteonly", name:"Invite Only", artist:"Great Dane", year:2014, bpm:140, tonic:0,
  progId:"aeolian", baseTemplate:"halftimewave",
  narrative:"chordLock", vary:0.4, sync:2,
  tip:"A halftime cut Ivy Lab singled out for its blunt, stabbed bass hits that move only with the chord under them rather than carrying an independent tune. `chordLock` is the direct match for that stab-led writing." },

{ id:"halftimewave_neujack", name:"Neujack", artist:"Machinedrum", year:2013, bpm:140, tonic:7,
  progId:"dorian", baseTemplate:"halftimewave",
  narrative:"motif", vary:0.6, sync:2,
  tip:"Machinedrum's footwork-inflected halftime cut, cited by Ivy Lab as one of the scene's defining tracks — a short, off-kilter cell restated with syncopated variation rather than a straight dnb roller. `motif` and the higher sync track that footwork-derived skip." },

{ id:"jumpup_supersharpshooter", name:"Super Sharp Shooter", artist:"Ganja Kru", year:1996, bpm:172, tonic:9,
  progId:"deepHouse", baseTemplate:"jumpup",
  narrative:"motif", vary:0.4, sync:1,
  tip:"A jump-up landmark from the DJ Hype/DJ Zinc/Pascal camp — a comic, hooky bassline riff is the whole point of the drop, restated with small twists rather than atmosphere. `motif` gives that bouncy cell room to return varied." },

{ id:"jumpup_138trek", name:"138 Trek", artist:"DJ Zinc", year:1997, bpm:172, tonic:2,
  progId:"aeolian", baseTemplate:"jumpup",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"One of the definitive jump-up basslines — a single bouncy, comic riff looped rather than developed, built purely for the dancefloor bounce. `ostinato` at low vary matches that flat, hook-first repetition." },

{ id:"jumpup_bodyrock", name:"Body Rock", artist:"Andy C & Shimon", year:2002, bpm:174, tonic:7,
  progId:"axisMinor", baseTemplate:"jumpup",
  narrative:"motif", vary:0.4, sync:1,
  tip:"A perennial Andy C DJ-set closer built on a bright, party-oriented bassline hook that returns with small tweaks each drop rather than developing into a real tune. `motif` captures that hook-and-restate shape." },

{ id:"jumpup_rockit", name:"Rock It", artist:"Sub Focus", year:2007, bpm:174, tonic:0,
  progId:"deepHouse", baseTemplate:"jumpup",
  narrative:"chordLock", vary:0.4, sync:1,
  tip:"Sub Focus's breakout single leans on a bouncy, stabbed bass hook that snaps to the chord underneath rather than singing over it — bright and hooky rather than atmospheric, exactly this style's brief." },

{ id:"jumpup_easternjam", name:"Eastern Jam", artist:"Chase & Status", year:2005, bpm:174, tonic:9,
  progId:"phrygian", baseTemplate:"jumpup",
  narrative:"motif", vary:0.4, sync:1,
  tip:"An early Chase & Status jump-up cut whose bouncy bassline hook borrows an Eastern-scale flavour for its comic, dancefloor-first riff. `phrygian`'s flattened-second colour nods to that modal flavour without copying it." },

{ id:"jumpup_sportsday", name:"Sports Day", artist:"DJ Hazard", year:2007, bpm:174, tonic:5,
  progId:"aeolian", baseTemplate:"jumpup",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"A Playaz-era DJ Hazard jump-up cut built on one bouncy, comic bassline riff repeated with almost no harmonic movement — the joke and the hook are the same thing. `ostinato` matches that flat repetition." },

{ id:"jumpup_trueromance", name:"True Romance", artist:"DJ Hype & Zinc", year:1997, bpm:172, tonic:4,
  progId:"deepHouse", baseTemplate:"jumpup",
  narrative:"callResp", vary:0.4, sync:1,
  tip:"A Ganja Records collaboration where two bouncy bassline riffs trade back and forth across the drop rather than sitting under one continuous hook. `callResp` writes that riff-trading structure directly." },

{ id:"jumpup_ganjababy", name:"Ganja Baby", artist:"Serial Killaz", year:2007, bpm:174, tonic:2,
  progId:"axisMinor", baseTemplate:"jumpup",
  narrative:"chant", vary:0.4, sync:2,
  tip:"A ragga-flavoured jump-up cut built on a chopped, chanted vocal hook over a bouncy bassline rather than a sung melody. `chant` writes that reciting, rhythm-led vocal hook directly." },

{ id:"jumpup_options", name:"Options", artist:"Bou ft. Trigga & Trilla", year:2021, bpm:174, tonic:0,
  progId:"deepHouse", baseTemplate:"jumpup",
  narrative:"motif", vary:0.5, sync:1,
  tip:"A viral modern jump-up crossover hit built on a bright, immediately hooky bassline riff that keeps returning with small variations rather than developing into a full melody — party-first by design. `motif` matches that shape." },

{ id:"jumpup_inikamoze", name:"Ini Kamoze", artist:"Danny Byrd", year:2009, bpm:174, tonic:9,
  progId:"deepHouse", baseTemplate:"jumpup",
  narrative:"chant", vary:0.4, sync:2,
  tip:"Danny Byrd's Hospital Records jump-up rework builds its hook from the sampled 'Here Comes the Hotstepper' vocal chant over a bright, bouncy bassline. `chant` writes that repeated, rhythm-driven sampled phrase." },

{ id:"drumfunk_acertainsound", name:"A Certain Sound", artist:"Paradox", year:1996, bpm:172, tonic:9,
  progId:"dorian", baseTemplate:"drumfunk",
  narrative:"germ", vary:0.7, sync:1, within:true,
  tip:"An early Renegade Hardware release from Dev Pandya (Paradox), the producer most credited with founding drumfunk — obscure breakbeats resliced into constantly shifting, funk-descended patterns while the bass stays out of the way. `germ` with `within:true` writes drums that keep reprogramming themselves." },

{ id:"drumfunk_filteration", name:"Filteration", artist:"Equinox", year:2002, bpm:172, tonic:2,
  progId:"aeolian", baseTemplate:"drumfunk",
  narrative:"germ", vary:0.6, sync:1, within:true,
  tip:"Released on Inperspective Records, one of drumfunk's key early labels — the breakbeat programming is the entire event, with the bassline kept deliberately understated underneath it." },

{ id:"drumfunk_antarctica", name:"Antarctica", artist:"Equinox", year:2003, bpm:172, tonic:7,
  progId:"dorian", baseTemplate:"drumfunk",
  narrative:"wave", vary:0.4, sync:0,
  tip:"Another Inperspective Records cut from Equinox, its icy, understated atmosphere sits well behind the intricate, mechanically precise drum-break edits that are the actual focus. `wave` gives the pad its own slow movement without competing with the drums." },

{ id:"drumfunk_acidrain", name:"Acid Rain", artist:"Equinox", year:2005, bpm:172, tonic:4,
  progId:"axisMinor", baseTemplate:"drumfunk",
  narrative:"motif", vary:0.5, sync:1,
  tip:"Later remixed by Breakage, this Inperspective release keeps the same intricate, funk-descended breakbeat-science approach with the bass staying firmly in a supporting role." },

{ id:"drumfunk_themutant", name:"The Mutant", artist:"DJ Trace", year:1996, bpm:165, tonic:0,
  progId:"aeolian", baseTemplate:"drumfunk",
  narrative:"germ", vary:0.6, sync:1,
  tip:"Released on DJ Trace's own Prototype Recordings, part of the techstep/breakbeat-science lineage that fed directly into drumfunk's intricate drum-editing style, bass kept spare underneath." },

{ id:"drumfunk_vulcanpunch", name:"Vulcan Punch", artist:"Fracture", year:2009, bpm:172, tonic:9,
  progId:"dorian", baseTemplate:"drumfunk",
  narrative:"germ", vary:0.7, sync:1, within:true,
  tip:"Released on Fracture's own Astrophonica label, part of the breakbeat-science revival that carried drumfunk's intricate, funk-descended drum programming into a new decade. `within:true` reflects breaks that keep shifting inside a single pass." },

{ id:"drumfunk_skylined", name:"Skylined", artist:"Break", year:2005, bpm:172, tonic:5,
  progId:"aeolian", baseTemplate:"drumfunk",
  narrative:"motif", vary:0.5, sync:1,
  tip:"From Break's breakbeat-science era before he moved toward jump-up — dense, live-feel drum editing carries the record while the bassline stays understated in support." },

{ id:"drumfunk_retrograde", name:"Retrograde", artist:"Skeptical", year:2013, bpm:172, tonic:2,
  progId:"dorian", baseTemplate:"drumfunk",
  narrative:"germ", vary:0.6, sync:1,
  tip:"Skeptical's breakbeat-science output on Med School continues the drumfunk lineage of intricate, funk-derived drum programming taking centre stage over a restrained low end." },

{ id:"drumfunk_chrysalis", name:"Chrysalis", artist:"Instra:mental", year:2007, bpm:172, tonic:7,
  progId:"aeolian", baseTemplate:"drumfunk",
  narrative:"wave", vary:0.4, sync:0,
  tip:"An early Instra:mental release (Nonplus Records) from the breakbeat-science lineage bridging drumfunk's intricate edits and the more atmospheric 'autonomic' sound that followed — the drums do the intricate work while the pad sits back." },

{ id:"drumfunk_therain", name:"The Rain", artist:"Photek", year:1995, bpm:165, tonic:9,
  progId:"dorian", baseTemplate:"drumfunk",
  narrative:"germ", vary:0.6, sync:1,
  tip:"Photek's meticulous hi-hat and snare editing on this record is frequently cited as a direct influence on drumfunk's intricate-breaks aesthetic, with the bassline kept minimal underneath the drum work." },

{ id:"breakcore_hajnal", name:"Hajnal", artist:"Venetian Snares", year:2005, bpm:180, tonic:2,
  progId:"aeolian", baseTemplate:"breakcore",
  narrative:"germ", vary:0.8, sync:2, within:true,
  tip:"From Rossz Csillag Alatt Született, the album that popularised breakcore by splicing Bartók- and Stravinsky-style string writing into relentlessly chopped amen breaks. `germ` with `within:true` writes material that keeps mutating even inside one pass." },

{ id:"breakcore_look", name:"Look", artist:"Venetian Snares", year:2005, bpm:180, tonic:9,
  progId:"axisMinor", baseTemplate:"breakcore",
  narrative:"germ", vary:0.8, sync:2, within:true,
  tip:"Another cut from the same landmark album, maximalist and chaotic by design — breaks stuttered and rearranged track-long rather than settling into a groove. `germ` at high vary matches that constant reinvention." },

{ id:"breakcore_szamarmadar", name:"Szamár Madár", artist:"Venetian Snares", year:2005, bpm:180, tonic:4,
  progId:"aeolian", baseTemplate:"breakcore",
  narrative:"cascade", vary:0.7, sync:2,
  tip:"Its classical string sequence tumbles downward before being fed straight into the chopped-break chaos — `cascade`'s falling sequence captures that source material's own shape before the breakcore stuttering takes over." },

{ id:"breakcore_comeonmyselector", name:"Come On My Selector", artist:"Squarepusher", year:1997, bpm:180, tonic:7,
  progId:"dorian", baseTemplate:"breakcore",
  narrative:"germ", vary:0.8, sync:2,
  tip:"A drill'n'bass/breakcore-boundary Warp release where live-feel bass and drum interplay gets more frantic and rearranged as the track runs, never settling into a repeat. `germ` matches that continual escalation." },

{ id:"breakcore_cometodaddy", name:"Come to Daddy (Little Lord Faulteroy Mix)", artist:"Aphex Twin", year:1997, bpm:180, tonic:9,
  progId:"axisMinor", baseTemplate:"breakcore",
  narrative:"chant", vary:0.4, sync:2,
  tip:"The pitched, screamed 'I want your soul' vocal hook is rhythm-driven and reciting rather than sung, sitting over relentlessly chopped breaks that heavily influenced the breakcore scene's aggression. `chant` writes that hook directly." },

{ id:"breakcore_straightouttacompton", name:"Straight Outta Compton", artist:"Kid606", year:2000, bpm:180, tonic:0,
  progId:"aeolian", baseTemplate:"breakcore",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"Kid606's notorious mash-up cover loops the N.W.A hook itself into a stuttering breakcore cell rather than building new melodic material — one of the scene's defining, maximalist provocations." },

{ id:"breakcore_fullenglishbreakfat", name:"Full English Breakfat", artist:"Shitmat", year:2003, bpm:180, tonic:2,
  progId:"aeolian", baseTemplate:"breakcore",
  narrative:"germ", vary:0.8, sync:2,
  tip:"A Planet Mu breakcore landmark stacking chopped samples and breaks into relentless, maximalist chaos rather than any steady groove. `germ` at high vary matches its constantly mutating sample-and-break collage." },

{ id:"breakcore_feedthepigs", name:"Feed the Pigs", artist:"Nasenbluten", year:1996, bpm:190, tonic:9,
  progId:"axisMinor", baseTemplate:"breakcore",
  narrative:"chant", vary:0.4, sync:2,
  tip:"Australian gabber-breakcore act Nasenbluten fuse hardcore aggression with chopped breaks and a shouted, reciting vocal hook rather than a melodic one. `chant` writes that confrontational, rhythm-first shout." },

{ id:"breakcore_veryoccult", name:"Very Occult", artist:"Igorrr", year:2010, bpm:180, tonic:4,
  progId:"phrygian", baseTemplate:"breakcore",
  narrative:"germ", vary:0.9, sync:2, within:true,
  tip:"Igorrr splices baroque and metal motifs directly into stuttered, chopped breaks, mutating the material relentlessly within the track itself. `germ` with `within:true` and the `phrygian` colour both match that maximalist genre-collision." },

{ id:"breakcore_kimochiguuwai", name:"Kimochi Guuwaï", artist:"DJ Scotch Egg", year:2005, bpm:180, tonic:7,
  progId:"aeolian", baseTemplate:"breakcore",
  narrative:"chant", vary:0.5, sync:2,
  tip:"DJ Scotch Egg's chiptune-breakcore fuses 8-bit game-console tones with chopped breaks and a chanted, rhythm-led vocal hook rather than a sung line. `chant` matches that reciting, hyperactive delivery." },

{ id:"digitalhardcore_deutschland", name:"Deutschland (Has Gotta Die)", artist:"Atari Teenage Riot", year:1993, bpm:190, tonic:9,
  progId:"axisMinor", baseTemplate:"digitalhardcore",
  narrative:"chant", vary:0.3, sync:2,
  tip:"From the Delete Yourself! EP that helped launch Digital Hardcore Recordings — a shouted, confrontational vocal hook sits over blown-out breakcore breaks and distorted noise. `chant` writes that reciting, punk-shouted delivery directly." },

{ id:"digitalhardcore_sicktodeath", name:"Sick to Death", artist:"Atari Teenage Riot", year:1997, bpm:190, tonic:0,
  progId:"aeolian", baseTemplate:"digitalhardcore",
  narrative:"chant", vary:0.3, sync:2,
  tip:"From The Future of War, ATR's fusion of breakcore's chopped chaos with punk-shout aggression, faster and harsher than straight breakcore. `chant` matches its shouted, rhythm-first vocal hook." },

{ id:"digitalhardcore_speed", name:"Speed", artist:"Atari Teenage Riot", year:1997, bpm:200, tonic:2,
  progId:"axisMinor", baseTemplate:"digitalhardcore",
  narrative:"ostinato", vary:0.2, sync:2,
  tip:"One of ATR's fastest, most punishing cuts from The Future of War — a single blown-out riff repeated at punk-tempo intensity rather than developed into a melody. `ostinato` matches that relentless, undeveloped repetition." },

{ id:"digitalhardcore_revolutionaction", name:"Revolution Action", artist:"Atari Teenage Riot", year:1999, bpm:190, tonic:7,
  progId:"aeolian", baseTemplate:"digitalhardcore",
  narrative:"chant", vary:0.3, sync:2,
  tip:"From 60 Second Wipe Out, ATR's political shout-along vocal sits over harsh, distorted breakcore-style breaks — digital hardcore's core fusion of chaos and confrontation. `chant` writes that reciting hook directly." },

{ id:"digitalhardcore_starttheriot", name:"Start the Riot!", artist:"Atari Teenage Riot", year:1999, bpm:190, tonic:9,
  progId:"axisMinor", baseTemplate:"digitalhardcore",
  narrative:"chant", vary:0.3, sync:2,
  tip:"Another 60 Second Wipe Out cut built on a shouted, rallying vocal hook over harsh distorted breaks rather than any sung melody — the genre's punk/industrial lineage stated plainly." },

{ id:"digitalhardcore_kidsareunited", name:"Kids Are United", artist:"Atari Teenage Riot", year:1997, bpm:190, tonic:4,
  progId:"aeolian", baseTemplate:"digitalhardcore",
  narrative:"callResp", vary:0.4, sync:2,
  tip:"From The Future of War, its gang-shouted vocal hook trades call-and-response between voices over blown-out breaks. `callResp` writes that shouted trade rather than a single continuous line." },

{ id:"digitalhardcore_hetzjagd", name:"Hetzjagd Auf Nazis!", artist:"Alec Empire", year:1993, bpm:190, tonic:0,
  progId:"axisMinor", baseTemplate:"digitalhardcore",
  narrative:"chant", vary:0.3, sync:2,
  tip:"A confrontational early solo cut from ATR founder and Digital Hardcore Recordings boss Alec Empire, fusing breakcore's chopped aggression with a shouted, explicitly political hook. `chant` matches that delivery directly." },

{ id:"digitalhardcore_iwannabeamachine", name:"I Wanna Be a Machine", artist:"EC8OR", year:1995, bpm:190, tonic:9,
  progId:"aeolian", baseTemplate:"digitalhardcore",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"A Digital Hardcore Recordings release from EC8OR, part of the Alec Empire-orbit roster fusing distorted breaks with punk/industrial noise — the title hook itself repeats almost unchanged, machine-like by design." },

{ id:"digitalhardcore_chromosonedamage", name:"Chromosone Damage", artist:"The Panacea", year:1999, bpm:190, tonic:2,
  progId:"axisMinor", baseTemplate:"digitalhardcore",
  narrative:"germ", vary:0.6, sync:2,
  tip:"German producer The Panacea works the breakcore/digital-hardcore border, feeding one harsh industrial break cell through increasingly mangled reprocessing as the track runs. `germ` matches that escalating mutation." },

{ id:"digitalhardcore_scylla", name:"Scylla", artist:"Christoph De Babalon", year:1997, bpm:190, tonic:7,
  progId:"aeolian", baseTemplate:"digitalhardcore",
  narrative:"wave", vary:0.4, sync:1,
  tip:"From If You're Into It, I'm Out of It, De Babalon layers dark ambient sheets under blown-out, punishing breaks — the harsh digital-hardcore aggression sits over a slow-moving atmospheric bed. `wave` gives that pad its own drift beneath the noise." },
{ id:"happyhardcore_prettygreeneyes", name:"Pretty Green Eyes", artist:"Ultrabeat", year:2003, bpm:162, tonic:11,
  progId:"axis", baseTemplate:"happyhardcore",
  narrative:"arch", vary:0.6, sync:1,
  tip:"A UK #2 hit built on a piano-stab intro and a soaring major-key vocal hook that's the whole emotional payload of the record; `arch` gives that hook its rise-and-fall shape inside each chorus without quoting its actual melody." },

{ id:"happyhardcore_elysium", name:"Elysium (I Go Crazy)", artist:"Ultrabeat", year:2006, bpm:144, tonic:0,
  progId:"edm", baseTemplate:"happyhardcore",
  narrative:"expand", vary:0.7, sync:1,
  tip:"A piano-and-vocal happy hardcore anthem where the chorus opens the register right up over a relentless four-on-the-floor pulse; `expand` writes that widening without copying the sung line." },

{ id:"happyhardcore_wonderfuldays", name:"Wonderful Days", artist:"Charly Lownoise & Mental Theo", year:1995, bpm:166, tonic:10,
  progId:"axis", baseTemplate:"happyhardcore",
  narrative:"terraced", vary:0.5, sync:1,
  tip:"This Dutch duo's biggest UK hit rides a repeating piano riff that keeps re-entering a step higher through the build; `terraced` is exactly that layering trick, without lifting the actual riff." },

{ id:"happyhardcore_sesamestreet", name:"Sesame's Treet", artist:"Smart E's", year:1992, bpm:145, tonic:7,
  progId:"aeolian", baseTemplate:"happyhardcore",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Built almost entirely from a looped, pitched-up sample of the Sesame Street theme rather than a composed melody — one of the records that accidentally invented happy hardcore's cartoon-rave sound; `ostinato` keeps the cell barely developed the way the sample loop is." },

{ id:"happyhardcore_hyperhyper", name:"Hyper Hyper", artist:"Scooter", year:1994, bpm:160, tonic:6,
  progId:"festival", baseTemplate:"happyhardcore",
  narrative:"chant", vary:0.4, sync:2,
  tip:"H.P. Baxxter's shouted \"Hyper! Hyper!\" is a chanted, rhythm-driven hook rather than a sung line, riding on top of the pushed offbeats that make this early record feel so hyperactive; `chant` at the harder syncopation setting captures that." },

{ id:"happyhardcore_rainbowinthesky", name:"Rainbow in the Sky", artist:"DJ Paul Elstak", year:1995, bpm:150, tonic:2,
  progId:"aeolian", baseTemplate:"happyhardcore",
  narrative:"wave", vary:0.5, sync:1,
  tip:"The record that pulled Dutch gabber toward happy-hardcore territory, wrapping a children's-choir sample and strings around the same pounding kick; `wave` gives it that long, slow melodic swell rather than a hard-edged riff." },

{ id:"happyhardcore_luvumore", name:"Luv U More", artist:"DJ Paul Elstak", year:1995, bpm:150, tonic:7,
  progId:"mixo", baseTemplate:"happyhardcore",
  narrative:"motif", vary:0.6, sync:1,
  tip:"Built around a chopped reggae vocal sample restated through the arrangement rather than a fresh top-line each section, which is what makes it read as one hook rather than a song; `motif` restates and reshapes that one cell." },

{ id:"happyhardcore_gonfigon", name:"Everybody Gonfi-Gon", artist:"Two Cowboys", year:1994, bpm:140, tonic:9,
  progId:"axis", baseTemplate:"happyhardcore",
  narrative:"qanda", vary:0.5, sync:1,
  tip:"This Italian duo's novelty hardcore hit trades its nonsense-word hook back and forth between two short phrases like call-and-answer; `qanda` writes that same question-and-answer pairing across the hook." },

{ id:"happyhardcore_foreveryoung", name:"Forever Young", artist:"Interactive", year:1992, bpm:150, tonic:2,
  progId:"axis", baseTemplate:"happyhardcore",
  narrative:"archSong", vary:0.6, sync:1,
  tip:"A breakbeat-hardcore cover of the Alphaville synth-pop ballad, sped up and pitched into rave territory while keeping the original's single long rise-and-fall shape across the whole song; `archSong` preserves that arc." },

{ id:"happyhardcore_whoiselvis", name:"Who Is Elvis?", artist:"Charly Lownoise & Mental Theo", year:1994, bpm:155, tonic:0,
  progId:"axis", baseTemplate:"happyhardcore",
  narrative:"chant", vary:0.4, sync:2,
  tip:"A novelty hardcore hit that repeats its title as a shouted, rhythmically-locked catchphrase rather than developing a sung melody; `chant` matches that reciting-pitch delivery over the pushed sixteenths." },

{ id:"gabber_poing", name:"Poing", artist:"Rotterdam Termination Source", year:1992, bpm:148, tonic:9,
  progId:"aeolian", baseTemplate:"gabber",
  narrative:"ostinato", vary:0.2, sync:0,
  tip:"The foundational Rotterdam gabber record — a single pounding kick and a \"poing\" boing sound looped for the whole track with almost nothing else. `ostinato` at very low variation matches a record built on one cell that never moves." },

{ id:"gabber_allesnaardeklote", name:"Alles Naar De Klote!", artist:"Euromasters", year:1992, bpm:150, tonic:9,
  progId:"aeolian", baseTemplate:"gabber",
  narrative:"chant", vary:0.2, sync:2,
  tip:"The other founding Rotterdam gabber anthem, built on a shouted Dutch football-terrace chant over a distorted, oversized kick rather than any sung melody; `chant` at the harder syncopation setting captures that terrace-shout delivery." },

{ id:"gabber_dominatin", name:"Dominatin'", artist:"The Prophet", year:1993, bpm:150, tonic:4,
  progId:"axisMinor", baseTemplate:"gabber",
  narrative:"chordLock", vary:0.3, sync:1,
  tip:"Early Rotterdam gabber from one of the scene's Dreamteam DJs, where the riff only moves because the chord under the distorted kick changes; `chordLock` writes that same chord-snapped stab instead of a separate lead line." },

{ id:"gabber_searchanddestroy", name:"Search and Destroy", artist:"Ruffneck", year:1995, bpm:155, tonic:2,
  progId:"axisMinor", baseTemplate:"gabber",
  narrative:"motif", vary:0.4, sync:1,
  tip:"Belgian gabber producer Ruffneck builds the track from one aggressive short cell pushed into a different register each section rather than a fully developed melody; `motif` restates and reshapes that cell." },

{ id:"gabber_haveyoueverbeenmellow", name:"Have You Ever Been Mellow", artist:"Party Animals", year:1996, bpm:150, tonic:5,
  progId:"axis", baseTemplate:"gabber",
  narrative:"archSong", vary:0.5, sync:1,
  tip:"A Dutch pop-gabber #1 built by taking Olivia Newton-John's soft-rock ballad and blasting it over a distorted four-on-the-floor kick, keeping the original's single long rise and fall; `archSong` preserves that shape." },

{ id:"gabber_braincracking", name:"Braincracking", artist:"Neophyte", year:1998, bpm:163, tonic:7,
  progId:"aeolian", baseTemplate:"gabber",
  narrative:"motif", vary:0.4, sync:1,
  tip:"Built from a chopped sample of Tracy Bonham's \"Mother Mother\" vocal hook restated and twisted harder each pass over Neophyte's pounding Rotterdam kick; `motif` develops that one cell further each section." },

{ id:"gabber_blowyourmind", name:"We're Gonna Blow Your Mind", artist:"Rotterdam Terror Corps", year:1999, bpm:155, tonic:9,
  progId:"axisMinor", baseTemplate:"gabber",
  narrative:"chant", vary:0.3, sync:1,
  tip:"RTC's kick is mixed as the loudest thing on the record, with a shouted title-phrase hook riding on top rather than a sung line; `chant` writes that reciting, rhythm-driven vocal shape." },

{ id:"gabber_raiseyourfist", name:"Raise Your Fist", artist:"Angerfist", year:2004, bpm:159, tonic:11,
  progId:"axisMinor", baseTemplate:"gabber",
  narrative:"chant", vary:0.3, sync:1,
  tip:"Angerfist's breakthrough anthem is carried almost entirely by its pounding distorted kick and a shouted title-hook stab, with barely any sung melody to speak of; `chant` captures that hook without inventing a tune it never had." },

{ id:"gabber_godisagabber", name:"God Is A Gabber", artist:"Rotterdam Terror Corps", year:2013, bpm:161, tonic:4,
  progId:"aeolian", baseTemplate:"gabber",
  narrative:"chordLock", vary:0.3, sync:1,
  tip:"A modern RTC record where the riff-stab is locked to the chord changes under a mixed-hot kick, the classic gabber balance of power; `chordLock` writes that same harmony-follows-the-stab relationship." },

{ id:"gabber_wearethecore", name:"We Are The Core", artist:"Rotterdam Terror Corps", year:2022, bpm:180, tonic:1,
  progId:"edm", baseTemplate:"gabber",
  narrative:"chant", vary:0.4, sync:1,
  tip:"A newer, faster RTC anthem where the pounding kick still sits loudest in the mix and the title is shouted as a rhythm-locked chant over it; `chant` matches that hook at gabber's harder modern tempo." },

{ id:"hardstyle_getup", name:"Get Up", artist:"Showtek", year:2001, bpm:150, tonic:9,
  progId:"axisMinor", baseTemplate:"hardstyle",
  narrative:"chordLock", vary:0.4, sync:1,
  tip:"One of the records that defined early Dutch hardstyle, where the kick itself carries the bassline as a distorted screech and the riff only shifts because the chord under it does; `chordLock` is that exact relationship." },

{ id:"hardstyle_theway", name:"The Way", artist:"Zatox", year:2008, bpm:150, tonic:7,
  progId:"festival", baseTemplate:"hardstyle",
  narrative:"peak", vary:0.6, sync:1,
  tip:"A euphoric-hardstyle anthem that holds its biggest lead line back until the final drop rather than front-loading it; `peak` withholds the top note the same way." },

{ id:"hardstyle_mynameishardstyle", name:"My Name Is Hardstyle", artist:"Ran-D & Adaro", year:2009, bpm:144, tonic:11,
  progId:"axisMinor", baseTemplate:"hardstyle",
  narrative:"chant", vary:0.4, sync:1,
  tip:"The title itself is the hook, repeated as a rhythm-locked chant over the pitched, reverse-tailed kick that carries the whole bassline; `chant` matches that reciting-pitch delivery." },

{ id:"hardstyle_rockmysoul", name:"Rock My Soul", artist:"Noisecontrollers", year:2009, bpm:150, tonic:0,
  progId:"edm", baseTemplate:"hardstyle",
  narrative:"expand", vary:0.6, sync:1,
  tip:"A big-room hardstyle anthem whose lead line opens the register right up at the drop after a tighter verse; `expand` writes that widening without copying the actual synth line." },

{ id:"hardstyle_fts", name:"FTS", artist:"Showtek", year:2011, bpm:146, tonic:0,
  progId:"axisMinor", baseTemplate:"hardstyle",
  narrative:"chordLock", vary:0.3, sync:1,
  tip:"\"Fuck The System\" is one of hardstyle's most recognizable kick-and-riff anthems, where the stab pattern only changes because the underlying chord does, over the genre's signature screeching, pitched kick; `chordLock` is exactly that." },

{ id:"hardstyle_childrenofdrums", name:"Children Of Drums", artist:"Wildstylez", year:2012, bpm:150, tonic:9,
  progId:"axisMinor", baseTemplate:"hardstyle",
  narrative:"terraced", vary:0.5, sync:1,
  tip:"Builds its energy by restating a short percussive/melodic figure a step higher through the arrangement rather than introducing new material each time; `terraced` is that same layering climb." },

{ id:"hardstyle_dwx", name:"D.W.X.", artist:"Coone & Da Tweekaz", year:2013, bpm:150, tonic:2,
  progId:"edm", baseTemplate:"hardstyle",
  narrative:"expand", vary:0.6, sync:1,
  tip:"A Dirty Workz label anthem where the lead widens dramatically into the drop after a restrained build, the euphoric-hardstyle contrast between verse and hook; `expand` captures that." },

{ id:"hardstyle_dragonborn", name:"Dragonborn", artist:"Headhunterz", year:2012, bpm:150, tonic:5,
  progId:"edm", baseTemplate:"hardstyle",
  narrative:"peak", vary:0.7, sync:1,
  tip:"A euphoric-hardstyle anthem that saves its highest, most triumphant lead line for the final drop rather than spending it early; `peak` withholds that top note the same way." },

{ id:"hardstyle_wknd", name:"WKND!", artist:"Brennan Heart & Wildstylez", year:2016, bpm:150, tonic:7,
  progId:"festival", baseTemplate:"hardstyle",
  narrative:"qanda", vary:0.5, sync:1,
  tip:"Trades its lead phrase back and forth between two short answering figures across the drop rather than running one continuous line; `qanda` writes that call-and-answer shape." },

{ id:"hardstyle_musicmadeaddict", name:"Music Made Addict", artist:"D-Block & S-te-Fan", year:2016, bpm:150, tonic:0,
  progId:"axisMinor", baseTemplate:"hardstyle",
  narrative:"chordLock", vary:0.4, sync:1,
  tip:"A raw-leaning hardstyle anthem where the distorted screech-kick carries the low end and the riff is locked hard to the chord changes above it; `chordLock` is that same relationship." },

{ id:"speedcore_kotzbrocken", name:"Kotzbrocken", artist:"The Speed Freak", year:1996, bpm:200, tonic:9,
  progId:"aeolian", baseTemplate:"speedcore",
  narrative:"ostinato", vary:0.2, sync:0,
  tip:"German producer Rob Fabrie's foundational speedcore record runs far beyond ordinary gabber tempo on a single distorted four-on-the-floor cell that barely develops — the real track runs faster than this app can represent, so it's set to the 200 bpm ceiling; `ostinato` at minimal variation matches that static, velocity-first shape." },

{ id:"speedcore_extermination", name:"Extermination", artist:"The Speed Freak", year:1997, bpm:200, tonic:9,
  progId:"aeolian", baseTemplate:"speedcore",
  narrative:"ostinato", vary:0.2, sync:0,
  tip:"Pushes the same one-cell, kick-driven approach even further past danceable tempo into pure velocity; the real track exceeds this app's 200 bpm cap, so it's set to the ceiling, and `ostinato` keeps the cell undeveloped throughout." },

{ id:"speedcore_50hardcoredoller", name:"50 Hardcore Doller", artist:"DJ Freak", year:1994, bpm:200, tonic:0,
  progId:"axisMinor", baseTemplate:"speedcore",
  narrative:"chant", vary:0.2, sync:0,
  tip:"A Bloody Fist Records (Australia) noisecore/speedcore release built on a distorted four-on-the-floor pushed well past groove into sheer velocity, with a shouted vocal stab rather than a melody; `chant` gives it that reciting-pitch hook, capped at this app's 200 bpm ceiling since the real tempo runs faster." },

{ id:"speedcore_gunsnfetuses", name:"Guns 'n' Fetuses", artist:"Nasenbluten", year:1994, bpm:200, tonic:2,
  progId:"aeolian", baseTemplate:"speedcore",
  narrative:"ostinato", vary:0.2, sync:0,
  tip:"This Melbourne noisecore/speedcore act built entire EPs from one distorted, extremely fast four-on-the-floor cell with almost no harmonic movement; `ostinato` at minimal variation is that same static, velocity-first approach, tempo capped at 200 bpm." },

{ id:"speedcore_ifyoureintoit", name:"If You're Into It, I'm Out of It", artist:"Christoph De Babalon", year:1997, bpm:190, tonic:4,
  progId:"aeolian", baseTemplate:"speedcore",
  narrative:"wave", vary:0.6, sync:1,
  tip:"A landmark speedcore/breakcore crossover record pairing extreme, distorted four-on-the-floor velocity with long, slow-moving ambient chord washes underneath; `wave` gives that undulating pad movement room against the relentless beat." },

{ id:"speedcore_sarcophage", name:"Sarcophage", artist:"Manu Le Malin", year:1996, bpm:200, tonic:9,
  progId:"axisMinor", baseTemplate:"speedcore",
  narrative:"chordLock", vary:0.3, sync:1,
  tip:"French hardcore techno pioneer Manu Le Malin pushes his kick-driven, riff-stab hardcore sound up to speedcore tempo; `chordLock` keeps the stab locked to the chord changes rather than developing its own line, capped at 200 bpm since the real track runs hotter." },

{ id:"speedcore_sonicthehedgehog", name:"Sonic the Hedgehog Wrecks Havoc", artist:"Enduser", year:2002, bpm:200, tonic:0,
  progId:"aeolian", baseTemplate:"speedcore",
  narrative:"ostinato", vary:0.3, sync:0,
  tip:"US splittercore producer Enduser builds his tracks from breakbeat-spliced, extremely fast distorted kicks under one repeating cell rather than a developed melody; `ostinato` matches that, real tempo capped at this app's 200 bpm ceiling." },

{ id:"speedcore_meatmachine", name:"Meat Machine", artist:"Bong-Ra", year:2003, bpm:200, tonic:2,
  progId:"aeolian", baseTemplate:"speedcore",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Dutch breakcore/speedcore producer Bong-Ra piles distorted, ultra-fast four-on-the-floor beats under a barely-developed repeating riff; `ostinato` captures that, real tempo capped at this app's 200 bpm ceiling." },

{ id:"speedcore_reeperbahn", name:"Reeperbahn", artist:"Sperminator", year:1996, bpm:200, tonic:7,
  progId:"axisMinor", baseTemplate:"speedcore",
  narrative:"chant", vary:0.2, sync:0,
  tip:"A Rotterdam-scene terrorcore/speedcore side-project record built on a pounding, distorted kick and a shouted vocal stab pushed well past normal gabber tempo; `chant` gives it that reciting-pitch hook, capped at this app's 200 bpm ceiling." },

{ id:"speedcore_fuckmeblind", name:"Fuck Me Blind", artist:"The Speed Freak", year:1998, bpm:200, tonic:9,
  progId:"aeolian", baseTemplate:"speedcore",
  narrative:"ostinato", vary:0.2, sync:0,
  tip:"Another Speed Freak record in the same one-cell, kick-driven mold pushed past groove into pure velocity; `ostinato` at minimal variation keeps that cell essentially static, tempo capped at this app's 200 bpm ceiling since the real track runs faster." },
{ id:"nygarage_showmelove", name:"Show Me Love", artist:"Robin S", year:1993, bpm:120, tonic:5,
  progId:"axis", baseTemplate:"nygarage",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"The entire record is one syncopated JX-8P bass riff looped under Robin S's belted vocal and stabbing piano chords — there's no bridge or key change, just that one hook. `ostinato` writes the same barely-varying repeating cell; sync1 keeps it pushing the backbeat without tipping into UK garage's harder skip." },

{ id:"nygarage_gotalove", name:"Got a Love for You", artist:"Jomanda", year:1991, bpm:120, tonic:1,
  progId:"deepHouse", baseTemplate:"nygarage",
  narrative:"callResp", vary:0.6, sync:1,
  tip:"Built on Angel Moraes's spoken intro answered by Jomanda's gospel-house vocal trio trading the title hook back and forth over a piano vamp. `callResp` writes that same trade between a lead phrase and a group answer, at a soulful, moderate syncopation." },

{ id:"nygarage_icantgetnosleep", name:"I Can't Get No Sleep", artist:"Masters at Work ft. India", year:1993, bpm:122, tonic:2,
  progId:"deepHouse", baseTemplate:"nygarage",
  narrative:"arch", vary:1, sync:1,
  tip:"India's vocal is the whole record — Kenny Dope and Louie Vega's production stays sparse so her phrase can rise from a held low note into a full-voice belt and settle again each pass. `arch` is exactly that rise-and-fall shape, with real pass-to-pass variation since her ad-libs never repeat identically." },

{ id:"nygarage_thebomb", name:"The Bomb! (These Sounds Fall Into My Mind)", artist:"The Bucketheads", year:1995, bpm:125, tonic:9,
  progId:"aeolian", baseTemplate:"nygarage",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Kenny Dope built the whole track from one looped horn/sax sample (from Barbara Tucker's own catalogue) with almost no other melodic material — a classic Strictly Rhythm sample-flip. `ostinato` at low vary keeps that one repeating cell nearly unchanged, the way the record actually plays." },

{ id:"nygarage_feelwhatyouwant", name:"Feel What You Want", artist:"Kristine W", year:1994, bpm:125, tonic:9,
  progId:"deepHouse", baseTemplate:"nygarage",
  narrative:"expand", vary:0.8, sync:1,
  tip:"Kristine W's verse sits low and conversational before the chorus opens into a much wider, higher belted hook — a classic diva-house dynamic jump. `expand` writes that same register widening at the hook rather than a flat, same-range vocal throughout." },

{ id:"nygarage_beautifulpeople", name:"Beautiful People", artist:"Barbara Tucker", year:1994, bpm:124, tonic:11,
  progId:"deepHouse", baseTemplate:"nygarage",
  narrative:"callResp", vary:0.7, sync:1,
  tip:"A Strictly Rhythm underground-house anthem built around Tucker's shouted 'everybody, everybody' hook answered by a chorus of voices, gospel-house call and response over a piano vamp. `callResp` captures that lead-and-crowd exchange directly." },

{ id:"nygarage_someday", name:"Someday", artist:"CeCe Rogers", year:1987, bpm:120, tonic:9,
  progId:"aeolian", baseTemplate:"nygarage",
  narrative:"motif", vary:0.6, sync:0,
  tip:"Marshall Jefferson's piano riff and Rogers's 'someday, we'll all be free' line are one recognisable cell that returns reworked each verse and breakdown rather than a fully composed melody. `motif` restates and transforms that same cell per section, matching how this proto-garage anthem is actually built." },

{ id:"nygarage_followme", name:"Follow Me", artist:"Aly-Us", year:1992, bpm:120, tonic:8,
  progId:"gospel", baseTemplate:"nygarage",
  narrative:"callResp", vary:0.5, sync:0,
  tip:"'Follow Me (Every Creature)' is a chanted, gospel-tinged garage-house hook — 'you gotta free your mind' called and answered over a piano loop, with no real verse-chorus melody outside that. `callResp` at low syncopation captures its straightforward, soulful chant-and-answer shape." },

{ id:"nygarage_respect", name:"Respect", artist:"Adeva", year:1989, bpm:119, tonic:11,
  progId:"gospel", baseTemplate:"nygarage",
  narrative:"chant", vary:0.4, sync:0,
  tip:"Adeva's belted, church-trained delivery treats the title word almost like a reciting pitch punched out rhythmically over the piano vamp rather than a sung melody that moves much. `chant` is built for exactly that held, rhythm-driven vocal style." },

{ id:"nygarage_free", name:"Free", artist:"Ultra Naté", year:1997, bpm:125, tonic:8,
  progId:"axis", baseTemplate:"nygarage",
  narrative:"expand", vary:0.7, sync:1,
  tip:"Mood II Swing's production keeps the verse tight and low so the 'you're free, free to do what you want' hook can open the register right up — a slow-build house record structured entirely around that one payoff. `expand` writes that widening directly." },

{ id:"garage_fillmein", name:"Fill Me In", artist:"Craig David", year:2000, bpm:129, tonic:8,
  progId:"axis", baseTemplate:"garage",
  pat:"shuffle16", swing:0.3,
  narrative:"converse", vary:0.8, sync:2,
  tip:"David's storytelling verses (sneaking past a girl's parents) are delivered in short, speech-like phrases with real space between them, riding a swung 2-step shuffle rather than a straight four-on-the-floor. `converse` writes that narrow, conversational phrasing; the shuffle override carries the skip." },

{ id:"garage_flowers", name:"Flowers", artist:"Sweet Female Attitude", year:2000, bpm:132, tonic:0,
  progId:"deepHouse", baseTemplate:"garage",
  narrative:"period", vary:0.6, sync:1,
  tip:"The verse and pre-chorus trade short two-bar question-and-answer phrases before the 'we could be flowers' hook lands — a tightly sentence-structured vocal over the 2-step skip. `period` writes that same paired-phrase shape." },

{ id:"garage_sincere", name:"Sincere", artist:"MJ Cole", year:1998, bpm:132, tonic:8,
  progId:"mixo", baseTemplate:"garage",
  narrative:"arch", vary:0.5, sync:1,
  tip:"An instrumental garage classic — Cole's own string and sax lines carry the whole melody in place of a vocal, each phrase rising to a peak and falling back over the skipping rhythm. `arch` gives the same rise-and-fall to that lead instrumental line rather than a sung top-line." },

{ id:"garage_battle", name:"Battle", artist:"Wookie ft. Lain", year:2000, bpm:130, tonic:0,
  progId:"deepHouse", baseTemplate:"garage",
  narrative:"qanda", vary:0.6, sync:2,
  tip:"Wookie's production famously answers Lain's vocal phrases with the sub-bass 'wobble' hits themselves, so the bass reads as a second voice in dialogue with the singer. `qanda` writes that same call-and-answer structure between vocal line and groove." },

{ id:"garage_movintoofast", name:"Movin' Too Fast", artist:"Artful Dodger ft. Romina Johnson", year:1999, bpm:127, tonic:2,
  progId:"axis", baseTemplate:"garage",
  narrative:"converse", vary:0.7, sync:2,
  tip:"One of the tracks that broke 2-step into the UK charts — Johnson's vocal sits in short, breathy phrases over the skip rather than long sustained lines. `converse` keeps that narrow, speech-like delivery with space between phrases, at the harder syncopation the 2-step skip needs." },

{ id:"garage_sweetlikechocolate", name:"Sweet Like Chocolate", artist:"Shanks & Bigfoot", year:1999, bpm:131, tonic:5,
  progId:"axis", baseTemplate:"garage",
  narrative:"archSong", vary:0.7, sync:1,
  tip:"A UK #1 built as one long build from a spoken-word verse into the 'ooh baby I like it' hook, which keeps climbing register through the later choruses rather than repeating flat. `archSong` gives the whole record that single, gradual rise-and-fall rather than a per-section arch." },

{ id:"garage_alittlebitofluck", name:"A Little Bit of Luck", artist:"DJ Luck & MC Neat", year:1999, bpm:135, tonic:8,
  progId:"axis", baseTemplate:"garage",
  narrative:"chant", vary:0.5, sync:2,
  tip:"MC Neat's toasting verses sit as rhythmic, reciting-pitch patter under the sung 'just a little bit of luck' hook, more MC delivery than melody. `chant` captures that rhythm-first vocal style at the harder syncopation the garage skip calls for." },

{ id:"garage_stonecold", name:"Stone Cold", artist:"Groove Chronicles", year:1997, bpm:135, tonic:7,
  progId:"deepHouse", baseTemplate:"garage",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"A foundational deep-garage instrumental built from one looped, pitched-down diva vocal chop over the skip, developed almost not at all across its length. `ostinato` at low vary matches that DJ-tool, one-cell construction exactly." },

{ id:"garage_21seconds", name:"21 Seconds", artist:"So Solid Crew", year:2001, bpm:137, tonic:7,
  progId:"aeolian", baseTemplate:"garage",
  narrative:"germ", vary:0.9, sync:2,
  tip:"Structured as a relay — each of the crew's MCs gets exactly 21 seconds to develop the same rhythmic idea further before handing off to the next, over one skipping garage groove. `germ` is built for a cell developed further each section, matching that handoff structure." },

{ id:"speedgarage_nevergonnaletyougo", name:"Never Gonna Let You Go (Kelly G's Sure Is Pure Dub Mix)", artist:"Tina Moore", year:1997, bpm:131, tonic:7,
  progId:"deepHouse", baseTemplate:"speedgarage",
  bass:"subhold",
  narrative:"chant", vary:0.4, sync:1,
  tip:"One of the records that defined speed garage — Moore's timestretched vocal hook is held almost like a reciting pitch over a sub-bass that Kelly G's mix keeps rock-still underneath. `chant` matches that held vocal; the subhold bass override is the track's actual signature move." },

{ id:"speedgarage_gunman", name:"Gunman", artist:"187 Lockdown", year:1996, bpm:130, tonic:2,
  progId:"deepHouse", baseTemplate:"speedgarage",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"A ragga-jungle-tinged speed garage classic built from one looped vocal sample and horn stab, barely developed beyond that loop while the sub-bass sits fixed underneath. `ostinato` at low vary is that one-cell construction." },

{ id:"speedgarage_ripgroove", name:"RIP Groove", artist:"Double 99", year:1997, bpm:130, tonic:9,
  progId:"deepHouse", baseTemplate:"speedgarage",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Built on the 'get your groove on' vocal chop and a horn stab looped for the whole record, with the real hook being the booming, static sub underneath — a genre-defining speed garage 12\". `ostinato` keeps that loop nearly unchanging pass to pass." },

{ id:"speedgarage_witchdoktor", name:"The Witch Doktor", artist:"Armand Van Helden", year:1996, bpm:130, tonic:2,
  progId:"deepHouse", baseTemplate:"speedgarage",
  narrative:"chant", vary:0.3, sync:1,
  tip:"An instrumental speed garage/garage-house classic — a chanted vocal-chop hook punched out rhythmically over a fixed, held sub-bass with almost no chordal movement. `chant` fits that reciting-pitch, rhythm-first hook." },

{ id:"speedgarage_gabriel", name:"Gabriel", artist:"Roy Davis Jr. ft. Peven Everett", year:1997, bpm:128, tonic:5,
  progId:"deepHouse", baseTemplate:"speedgarage",
  narrative:"arch", vary:0.8, sync:1,
  tip:"One of the records that bridged Chicago house and UK garage — Peven Everett's falsetto genuinely rises and falls each phrase over a broken, 2-step-tinged groove, more melodically developed than most speed garage cuts. `arch` gives that real rise-and-fall shape." },

{ id:"speedgarage_youmightneedsomebody", name:"You Might Need Somebody (Todd Terry Remix)", artist:"Shola Ama", year:1997, bpm:130, tonic:7,
  progId:"deepHouse", baseTemplate:"speedgarage",
  narrative:"expand", vary:0.8, sync:1,
  tip:"Todd Terry's remix takes Ama's soul original and timestretches it over a rolling speed-garage sub, with her voice widening from a controlled verse into a full belt at the hook. `expand` captures that dynamic jump at the chorus." },

{ id:"speedgarage_anytimeanyplace", name:"Anytime, Anyplace", artist:"Nu Birth", year:1997, bpm:130, tonic:4,
  progId:"deepHouse", baseTemplate:"speedgarage",
  narrative:"callResp", vary:0.6, sync:1,
  tip:"A garage-soul vocal group trading lines back and forth over a held sub and skipping hats, in the more song-based end of the speed garage scene. `callResp` writes that same trading pattern between voices." },

{ id:"speedgarage_thetheme", name:"The Theme", artist:"Dreem Teem", year:1998, bpm:132, tonic:9,
  progId:"deepHouse", baseTemplate:"speedgarage",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"A DJ-tool underground anthem from one of the scene's most influential production/DJ crews — one looped riff and vocal stab carry the whole record with essentially no further development. `ostinato` at very low vary is that flat, tool-like repetition." },

{ id:"speedgarage_lovebug", name:"Love Bug", artist:"Ramsey & Fen", year:1997, bpm:131, tonic:0,
  progId:"deepHouse", baseTemplate:"speedgarage",
  narrative:"chant", vary:0.4, sync:1,
  tip:"A pirate-radio-era speed garage staple built around a chanted, repeated vocal hook over a fixed sub-bass groove rather than a sung melody. `chant` matches that reciting, rhythm-driven top line." },

{ id:"speedgarage_destiny", name:"Destiny", artist:"Dem 2", year:1997, bpm:130, tonic:2,
  progId:"deepHouse", baseTemplate:"speedgarage",
  narrative:"wave", vary:0.6, sync:1,
  tip:"On the more atmospheric, deep end of the speed garage scene — a slow, undulating pad-and-vocal line laid over the skipping 16ths and a sub-bass that never really shifts. `wave` writes that long, slow undulation rather than a sharp hook." },

{ id:"grime_iluvu", name:"I Luv U", artist:"Dizzee Rascal", year:2003, bpm:140, tonic:2,
  progId:"axisMinor", baseTemplate:"grime",
  narrative:"chordLock", vary:0.5, sync:2,
  tip:"Built from an 8-bar loop of a single stabbing synth riff that Dizzee and a female MC trade over, the riff itself only moving because the underlying chord does. `chordLock` writes exactly that riff-locked-to-chord behaviour instead of a freely moving lead line." },

{ id:"grime_fixuplooksharp", name:"Fix Up, Look Sharp", artist:"Dizzee Rascal", year:2003, bpm:141, tonic:9,
  progId:"axisMinor", baseTemplate:"grime",
  narrative:"chant", vary:0.3, sync:2,
  tip:"Built on a chopped Billy Squier drum break with almost no other instrumentation, Dizzee's flow sits as a punched-out, rhythm-driven reciting pitch rather than a sung melody. `chant` is built for exactly that." },

{ id:"grime_eskimo", name:"Eskimo", artist:"Wiley", year:2002, bpm:140, tonic:2,
  progId:"axisMinor", baseTemplate:"grime",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"The foundational 'eskibeat' instrumental — one icy, square synth motif looped across 8-bar sections with vast amounts of space and almost nothing sustaining. `ostinato` at very low vary matches that stark, barely-developed loop." },

{ id:"grime_wotdouncallit", name:"Wot Do U Call It?", artist:"Wiley", year:2004, bpm:140, tonic:4,
  progId:"axisMinor", baseTemplate:"grime",
  narrative:"motif", vary:0.5, sync:1,
  tip:"Wiley's own genre-naming track restates one short synth cell, transformed a little each 8-bar section, over sparse square-bass stabs. `motif` is that exact one-cell-restated-and-transformed shape." },

{ id:"grime_powforward", name:"Pow! (Forward)", artist:"Lethal Bizzle", year:2004, bpm:141, tonic:5,
  progId:"axisMinor", baseTemplate:"grime",
  narrative:"chant", vary:0.3, sync:2,
  tip:"The shouted 'pow!' hook functions as rhythmic punctuation rather than melody, famously used as a crowd-riot chant over a near-bare square-bass stab pattern. `chant` writes that held, rhythm-first hook rather than a tune." },

{ id:"grime_psandqs", name:"P's and Q's", artist:"Kano", year:2005, bpm:140, tonic:7,
  progId:"axisMinor", baseTemplate:"grime",
  narrative:"germ", vary:0.6, sync:2,
  tip:"Kano's verses build the same rhythmic phrasing idea further each 8 bars over a sparse, space-heavy beat, rather than repeating a fixed hook. `germ` writes a cell developed further each section, matching that lyrical build." },

{ id:"grime_thatsnotme", name:"That's Not Me", artist:"Skepta ft. JME", year:2014, bpm:140, tonic:9,
  progId:"axisMinor", baseTemplate:"grime",
  narrative:"chordLock", vary:0.4, sync:1,
  tip:"Deliberately stripped back to almost nothing — one stabbing riff that only moves because the sparse chord underneath shifts, carrying the whole beat between verses. `chordLock` is exactly that riff-follows-chord behaviour." },

{ id:"grime_shutup", name:"Shut Up", artist:"Stormzy", year:2015, bpm:140, tonic:0,
  progId:"axisMinor", baseTemplate:"grime",
  narrative:"chant", vary:0.3, sync:2,
  tip:"A freestyle over Dyer's 'Functions on the Low' instrumental — Stormzy's delivery sits as a rhythm-driven reciting pitch over the square-bass stabs rather than a sung line. `chant` matches that freestyle-over-riddim shape." },

{ id:"grime_pulsex", name:"Pulse X", artist:"Musical Mob", year:2002, bpm:138, tonic:2,
  progId:"axisMinor", baseTemplate:"grime",
  narrative:"ostinato", vary:0.1, sync:1,
  tip:"Widely cited as the first true grime instrumental — a single square-wave bass stab pattern with almost nothing else, huge amounts of space between hits. `ostinato` at the lowest vary matches its near-total lack of development." },

{ id:"grime_shutdown", name:"Shutdown", artist:"Skepta", year:2015, bpm:140, tonic:4,
  progId:"axisMinor", baseTemplate:"grime",
  narrative:"chordLock", vary:0.4, sync:1,
  tip:"Another stab-led, near-instrumental grime beat where the riff's only real movement comes from the chord underneath shifting beneath Skepta's verses. `chordLock` writes that same riff-locked-to-harmony behaviour." },

{ id:"bassline_heartbroken", name:"Heartbroken", artist:"T2 ft. Jodie Aysha", year:2007, bpm:138, tonic:2,
  progId:"deepHouse", baseTemplate:"bassline",
  narrative:"expand", vary:0.7, sync:1,
  tip:"The Sheffield scene's biggest chart crossover — Jodie Aysha's chorus opens up wide against the rolling, syncopated square-bass hook that IS the drop, after a much narrower verse. `expand` writes that register widening at the hook." },

{ id:"bassline_youwot", name:"You Wot!", artist:"DJ Q", year:2011, bpm:138, tonic:9,
  progId:"deepHouse", baseTemplate:"bassline",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"Built entirely around one syncopated, rolling square-bass riddim and a shouted vocal stab, with the bass hook itself doing all the work rather than a sung top-line. `ostinato` at the harder syncopation matches that bass-led, barely-developed shape." },

{ id:"bassline_sambuca", name:"Sambuca", artist:"Wideboys", year:2008, bpm:138, tonic:7,
  progId:"deepHouse", baseTemplate:"bassline",
  narrative:"callResp", vary:0.5, sync:2,
  tip:"A UK chart hit that crossed bassline into garage territory, trading a sung hook against the rolling square-bass line almost like two voices answering each other. `callResp` writes that vocal-and-bass trade directly." },

{ id:"bassline_readmylips", name:"Read My Lips", artist:"Platnum", year:2008, bpm:140, tonic:11,
  progId:"deepHouse", baseTemplate:"bassline",
  narrative:"period", vary:0.6, sync:1,
  tip:"A bassline chart hit structured around short, paired vocal phrases — a line and its answer every two bars — riding the rolling square-bass hook. `period` is exactly that question-then-answer phrasing." },

{ id:"bassline_brandyandcoke", name:"Brandy & Coke", artist:"DJ Q", year:2011, bpm:138, tonic:4,
  progId:"deepHouse", baseTemplate:"bassline",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"Another DJ Q bassline anthem where a single syncopated square-bass hook, not a vocal melody, is the entire drop, looped with only small variations. `ostinato` keeps that bass hook the fixed, repeating centre." },

{ id:"bassline_bodyrock", name:"Bodyrock", artist:"Burgaboy", year:2007, bpm:138, tonic:9,
  progId:"deepHouse", baseTemplate:"bassline",
  narrative:"chant", vary:0.4, sync:1,
  tip:"A Niche-scene bassline anthem built on a chanted, rhythmically punched vocal hook riding the rolling square-bass line rather than a developed sung melody. `chant` matches that reciting-pitch delivery." },

{ id:"bassline_holdon", name:"Hold On", artist:"Flava D", year:2014, bpm:132, tonic:5,
  progId:"deepHouse", baseTemplate:"bassline",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"A bassline-revival instrumental on Butterz built from one rolling, syncopated square-bass hook with minimal further development — the hook carries the whole track. `ostinato` at low vary matches that DJ-tool construction." },

{ id:"bassline_rewind", name:"Rewind", artist:"TS7 & Sigma", year:2014, bpm:137, tonic:0,
  progId:"deepHouse", baseTemplate:"bassline",
  narrative:"expand", vary:0.6, sync:1,
  tip:"A UK top-5 bassline/garage-revival crossover where the vocal hook opens out at the chorus against the rolling square-bass line after a tighter verse. `expand` writes that widening at the hook." },

{ id:"bassline_neighbourhood", name:"Neighbourhood", artist:"Zed Bias", year:2000, bpm:134, tonic:2,
  progId:"deepHouse", baseTemplate:"bassline",
  narrative:"wave", vary:0.5, sync:1,
  tip:"One of the records that bridged speed garage into what became the Sheffield bassline sound — a slow, undulating vocal hook laid over the rolling bass rather than a sharp chorus. `wave` writes that long, slow undulation." },

{ id:"bassline_bodygroove", name:"Body Groove", artist:"Anti Up ft. Katie Pearl", year:2011, bpm:138, tonic:7,
  progId:"deepHouse", baseTemplate:"bassline",
  narrative:"callResp", vary:0.5, sync:2,
  tip:"A UK top-20 bassline/house crossover where Katie Pearl's sung hook trades directly against the rolling square-bass line's own rhythmic accents. `callResp` writes that vocal-versus-bass exchange." },

{ id:"ukfunky_doyoumind", name:"Do You Mind", artist:"Crazy Cousinz ft. Kyla", year:2009, bpm:128, tonic:10,
  progId:"dorian", baseTemplate:"ukfunky",
  narrative:"pendulum", vary:0.5, sync:2,
  tip:"Kyla's hook rocks between two close notes ('do you mind if I...') over tribal congas and an off-beat pluck — later sampled whole for Drake's 'One Dance'. `pendulum` is exactly that narrow two-note rock, widening slightly each pass." },

{ id:"ukfunky_devilinabluedress", name:"Devil In A Blue Dress", artist:"Donae'o", year:2008, bpm:128, tonic:7,
  progId:"dorian", baseTemplate:"ukfunky",
  narrative:"chant", vary:0.4, sync:2,
  tip:"One of UK funky's genre-defining anthems — the title hook is chanted rhythmically over soca-style congas and an off-beat pluck rather than sung as a developed melody. `chant` matches that reciting, rhythm-first hook." },

{ id:"ukfunky_feelinirie", name:"Feelin Irie", artist:"Roska", year:2009, bpm:128, tonic:9,
  progId:"dorian", baseTemplate:"ukfunky",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"An instrumental UK funky classic built from one soca-tinged pluck riff over congas and tribal percussion, with almost no melodic development across the track. `ostinato` at low vary is that fixed, repeating riff." },

{ id:"ukfunky_junction7", name:"Junction 7", artist:"Funkystepz", year:2009, bpm:128, tonic:2,
  progId:"dorian", baseTemplate:"ukfunky",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"A well-known UK funky instrumental where the percussive, off-beat pluck hook barely changes while the congas and shakers drive the tribal syncopation underneath. `ostinato` matches that fixed, groove-led hook." },

{ id:"ukfunky_together", name:"Together", artist:"Apple", year:2009, bpm:128, tonic:4,
  progId:"dorian", baseTemplate:"ukfunky",
  narrative:"callResp", vary:0.5, sync:2,
  tip:"A UK funky anthem trading a sung hook against a percussive off-beat pluck answer, congas driving the tribal syncopation between the two. `callResp` writes that lead-and-answer exchange directly." },

{ id:"ukfunky_seasons", name:"Seasons", artist:"Lil Silva", year:2009, bpm:128, tonic:5,
  progId:"dorian", baseTemplate:"ukfunky",
  narrative:"wave", vary:0.6, sync:1,
  tip:"A more atmospheric UK funky production where the vocal-chop hook undulates slowly over the congas and pluck pattern rather than landing on a sharp, repeated chorus. `wave` writes that long, slow undulation." },

{ id:"ukfunky_wileout", name:"Wile Out", artist:"DJ Zinc", year:2009, bpm:128, tonic:0,
  progId:"dorian", baseTemplate:"ukfunky",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"A percussive, funky-scene club tool built around one off-beat pluck-and-vocal-stab riff over tribal congas, with the groove doing all the work. `ostinato` keeps that riff the fixed, repeating centre." },

{ id:"ukfunky_katyonamission", name:"Katy on a Mission", artist:"Katy B", year:2010, bpm:130, tonic:7,
  progId:"dorian", baseTemplate:"ukfunky",
  narrative:"archSong", vary:0.7, sync:1,
  tip:"Produced by Geeneus with UK funky's tribal, congas-driven syncopation underneath, the track builds from a tense, narrated verse into one released, chanted hook by the end. `archSong` gives the whole song that single rise-and-fall rather than repeating it per section." },

{ id:"ukfunky_narst", name:"Narst", artist:"Cooly G", year:2009, bpm:128, tonic:9,
  progId:"dorian", baseTemplate:"ukfunky",
  narrative:"ostinato", vary:0.2, sync:2,
  tip:"A Hyperdub-released UK funky instrumental built from one sparse pluck-and-vocal-stab cell over congas and tribal percussion, developed almost not at all. `ostinato` at very low vary matches that stark, minimal-development construction." },

{ id:"ukfunky_bongojam", name:"Bongo Jam", artist:"Crazy Cousinz", year:2008, bpm:128, tonic:2,
  progId:"dorian", baseTemplate:"ukfunky",
  narrative:"ostinato", vary:0.2, sync:2,
  tip:"One of the genre's founding instrumentals — built entirely from congas, bongos, and one off-beat pluck riff, with barely any other melodic material at all. `ostinato` at very low vary matches that percussion-first, one-cell construction." },
{ id:"dubstep_midnightrequestline", name:"Midnight Request Line", artist:"Skream", year:2005, bpm:140, tonic:0,
  progId:"deepHouse", baseTemplate:"dubstep",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"One of the records that wrote dubstep's rulebook: a single wobbling sub-bass hook repeats almost unchanged for the whole track, moved only by filtering. `ostinato` writes that same barely-developed repeating cell instead of a tune." },

{ id:"dubstep_9samurai", name:"9 Samurai", artist:"Kode9 & The Spaceape", year:2006, bpm:140, tonic:8,
  progId:"mixo", baseTemplate:"dubstep",
  narrative:"chant", vary:0.3, sync:1,
  tip:"A sampled Seven Samurai string loop sits under Spaceape's flat, half-spoken vocal that barely deviates from its own rhythmic cell. `chant` writes that held, reciting-pitch delivery rather than a sung line." },

{ id:"dubstep_night", name:"Night", artist:"Benga, Coki", year:2007, bpm:140, tonic:5,
  progId:"deepHouse", baseTemplate:"dubstep",
  narrative:"chordLock", vary:0.4, sync:2,
  tip:"One of the tracks that popularized the 'wobble' bass outright — the mid-range answers itself in stabs that snap to the chord underneath rather than any sung hook. `chordLock` at the harder sync setting is exactly that riff-follows-harmony behavior." },

{ id:"dubstep_cockneythug", name:"Cockney Thug", artist:"Rusko ft. Amber Coffman", year:2007, bpm:139, tonic:6,
  progId:"axisMinor", baseTemplate:"dubstep",
  narrative:"callResp", vary:0.5, sync:1,
  tip:"Amber Coffman's looped vocal hook trades with a squelchy mid-range bass line, one of the first dubstep records built around a genuine pop vocal rather than a spoken sample. `callResp` writes that vocal-to-bass exchange." },

{ id:"dubstep_cockneyviolin", name:"Cockney Violin", artist:"Caspa", year:2006, bpm:138, tonic:1,
  progId:"deepHouse", baseTemplate:"dubstep",
  narrative:"lament", vary:0.3, sync:0,
  tip:"A sampled violin phrase descends over a bare sub bass — more melodic in shape than most early dubstep instrumentals, but still just one looped figure. `lament` traces that falling contour without touching the actual sample." },

{ id:"dubstep_poisondart", name:"Poison Dart", artist:"The Bug ft. Warrior Queen", year:2007, bpm:144, tonic:11,
  progId:"aeolian", baseTemplate:"dubstep",
  narrative:"chant", vary:0.2, sync:2,
  tip:"Warrior Queen's dancehall-style toasting is one hard, repeating vocal cell over a bare, distorted sub — almost no melodic movement, all rhythm and grit. Low `vary` and high `sync` match how little that vocal actually develops." },

{ id:"dubstep_digidesign", name:"Digidesign", artist:"Joker", year:2009, bpm:140, tonic:11,
  progId:"deepHouse", baseTemplate:"dubstep",
  narrative:"terraced", vary:0.6, sync:1,
  tip:"Joker's 'purple' style stacks bright synth riffs that step up in register section by section instead of developing an actual tune. `terraced` is that layering climb, restated a step higher each pass." },

{ id:"dubstep_innocence", name:"Innocence", artist:"Nero", year:2011, bpm:137, tonic:7,
  progId:"axisMinor", baseTemplate:"dubstep",
  narrative:"expand", vary:1, sync:1,
  tip:"A moody, narrow verse gives way to a drop where the register suddenly throws wide open on a huge mid-range synth lead. `expand` is built for exactly that build-to-drop widening, with full melodic development across sections." },

{ id:"dubstep_golddust", name:"Gold Dust (Flux Pavilion Remix)", artist:"DJ Fresh", year:2010, bpm:146, tonic:5,
  progId:"edm", baseTemplate:"dubstep",
  narrative:"peak", vary:0.7, sync:2,
  tip:"The soulful drum & bass original gets a dubstep remix that keeps the vocal hook but saves its biggest mid-range synth stab for the second drop. `peak` withholds the top note until then instead of front-loading it." },

{ id:"brostep_bangarang", name:"Bangarang", artist:"Skrillex ft. Sirah", year:2011, bpm:110, tonic:9,
  progId:"axisMinor", baseTemplate:"brostep",
  narrative:"chordLock", vary:0.4, sync:2,
  tip:"The drop's hook is a chugging square-wave bass line snapping to the chord changes under Sirah's shouted stabs — mid-range growl replacing harmony rather than sitting on it. `chordLock` at the hardest sync setting is that riff-follows-chord behavior." },

{ id:"brostep_firstoftheyear", name:"First of the Year (Equinox)", artist:"Skrillex", year:2010, bpm:141, tonic:5,
  progId:"deepHouse", baseTemplate:"brostep",
  narrative:"motif", vary:0.5, sync:2,
  tip:"A single vocal-chop cell gets re-pitched and re-triggered through the drop instead of being replaced by new material. `motif` restates that one short cell, transformed a little each section." },

{ id:"brostep_basscannon", name:"Bass Cannon", artist:"Flux Pavilion", year:2011, bpm:140, tonic:2,
  progId:"deepHouse", baseTemplate:"brostep",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"Essentially a one-bar growl-bass riff fired on repeat under a sampled announcer vocal, with almost no melodic development across the whole drop." },

{ id:"brostep_icantstop", name:"I Can't Stop", artist:"Flux Pavilion", year:2011, bpm:140, tonic:0,
  progId:"deepHouse", baseTemplate:"brostep",
  narrative:"qanda", vary:0.6, sync:2,
  tip:"A rising mid-range square riff gets answered by a lower growled countermelody bar by bar. `qanda`'s question-and-answer shape is that bass-on-bass conversation, with the mid-range doing the work harmony would otherwise do." },

{ id:"brostep_sweetshop", name:"Sweet Shop", artist:"Doctor P", year:2010, bpm:140, tonic:3,
  progId:"axisMinor", baseTemplate:"brostep",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"One of the tracks that defined the growl-bass 'brostep' sound outright — a single distorted square riff repeats with almost no variation, sound design doing the work a tune would elsewhere." },

{ id:"brostep_coffeebreak", name:"Coffee Break", artist:"Zeds Dead", year:2010, bpm:140, tonic:7,
  progId:"deepHouse", baseTemplate:"brostep",
  narrative:"terraced", vary:0.6, sync:1,
  tip:"Layered mid-range bass riffs stack up in register through the build before the drop rather than any sung line developing. `terraced` is that step-up layering." },

{ id:"brostep_xrated", name:"X Rated", artist:"Excision", year:2011, bpm:145, tonic:1,
  progId:"axisMinor", baseTemplate:"brostep",
  narrative:"chordLock", vary:0.3, sync:2,
  tip:"Heavily distorted mid-range bass stabs lock hard to the chord underneath in short aggressive bursts, a showcase for sound design over songwriting. `chordLock` at high sync writes exactly that stab-to-chord relationship." },

{ id:"brostep_decisions", name:"Decisions", artist:"Borgore ft. Miley Cyrus", year:2013, bpm:130, tonic:0,
  progId:"deepHouse", baseTemplate:"brostep",
  narrative:"archSong", vary:0.7, sync:1,
  tip:"An actual sung pop verse and chorus from Miley Cyrus frames Borgore's growl-bass drops, giving the track a real rise-and-fall vocal arc rather than a chopped sample. `archSong` follows that whole-song shape." },

{ id:"brostep_rambo", name:"Rambo", artist:"Getter", year:2014, bpm:150, tonic:10,
  progId:"axisMinor", baseTemplate:"brostep",
  narrative:"ostinato", vary:0.2, sync:2,
  tip:"A single ultra-aggressive growl riff repeats through the drop with almost no development, typical of Getter's harsher end of the brostep spectrum." },

{ id:"brostep_firepower", name:"Firepower", artist:"Datsik ft. Foreign Beggars", year:2012, bpm:140, tonic:2,
  progId:"deepHouse", baseTemplate:"brostep",
  narrative:"callResp", vary:0.5, sync:2,
  tip:"Foreign Beggars' rapped verses trade with Datsik's growling mid-range bass stabs section by section. `callResp` writes that vocal-to-bass exchange rather than a continuous melody." },

{ id:"trap_harlemshake", name:"Harlem Shake", artist:"Baauer", year:2012, bpm:96, tonic:6,
  progId:"axisMinor", baseTemplate:"trap",
  narrative:"ostinato", vary:0.1, sync:1,
  tip:"Built almost entirely from one repeated sub-bass hit and the same reused spoken-sample punchline — one of the most deliberately repetitive tracks to ever chart, with no melodic verse at all." },

{ id:"trap_higherground", name:"Higher Ground", artist:"TNGHT", year:2012, bpm:145, tonic:10,
  progId:"axisMinor", baseTemplate:"trap",
  narrative:"motif", vary:0.3, sync:1,
  tip:"A single chopped horn-stab sample is restated as the entire hook — no sung melody anywhere in the track, just that one motif repositioned and layered." },

{ id:"trap_moshpit", name:"Mosh Pit", artist:"Flosstradamus ft. Waka Flocka Flame", year:2013, bpm:145, tonic:4,
  progId:"axisMinor", baseTemplate:"trap",
  narrative:"chant", vary:0.2, sync:1,
  tip:"Waka Flocka's shouted ad-libs function as a rhythmic chant over a repeating trap snare pattern, with no sung verse anywhere in the arrangement." },

{ id:"trap_core", name:"Core", artist:"RL Grime", year:2014, bpm:150, tonic:0,
  progId:"axisMinor", baseTemplate:"trap",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"An instrumental built on one dark, repeating synth riff for its whole runtime — there's no verse to carry a tune, only shifts in density around that same riff." },

{ id:"trap_turndownforwhat", name:"Turn Down for What", artist:"DJ Snake & Lil Jon", year:2013, bpm:100, tonic:5,
  progId:"axisMinor", baseTemplate:"trap",
  narrative:"chant", vary:0.2, sync:1,
  tip:"Lil Jon's shouted title phrase is the entire vocal content, repeated verbatim over a pitch-bent lead riff — as hook-only and verse-free as EDM trap gets." },

{ id:"trap_djturnitup", name:"DJ Turn It Up", artist:"Yellow Claw", year:2013, bpm:150, tonic:7,
  progId:"axisMinor", baseTemplate:"trap",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"The title phrase and a single brass-stab riff repeat through the drop with nothing resembling a sung verse in between." },

{ id:"trap_deepdownlow", name:"Deep Down Low", artist:"Valentino Khan", year:2014, bpm:150, tonic:9,
  progId:"axisMinor", baseTemplate:"trap",
  narrative:"gapfill", vary:0.4, sync:2,
  tip:"The hook is a pitched-down vocal chop that leaps low and climbs back — the same leap-then-fill shape future bass chops use, just dropped into trap's lower register and harder syncopation." },

{ id:"trap_bricks", name:"Bricks", artist:"Carnage ft. Migos", year:2015, bpm:150, tonic:2,
  progId:"axisMinor", baseTemplate:"trap",
  narrative:"chant", vary:0.3, sync:2,
  tip:"Migos' rapped ad-libs are the entire vocal hook over Carnage's trap-EDM drum programming, with no separate melodic verse to speak of." },

{ id:"trap_doctorpepper", name:"Doctor Pepper", artist:"Diplo, CL, RiFF RAFF & OG Maco", year:2014, bpm:145, tonic:11,
  progId:"axisMinor", baseTemplate:"trap",
  narrative:"callResp", vary:0.4, sync:2,
  tip:"Three rapped guest verses trade lines over the same repeating trap-horn riff, which never develops into a melody of its own — hook-led and verse-thin by design." },

{ id:"riddim_throwinelbows", name:"Throwin' Elbows", artist:"Excision & Space Laces", year:2015, bpm:150, tonic:5,
  progId:"axisMinor", baseTemplate:"riddim",
  narrative:"ostinato", vary:0.1, sync:1,
  tip:"One of the tracks credited with kickstarting the riddim scene — a single held sub-bass note repeats unchanged through the entire drop, varying in tone but never in pitch." },

{ id:"riddim_blueprint", name:"Blueprint", artist:"Space Laces", year:2016, bpm:145, tonic:9,
  progId:"axisMinor", baseTemplate:"riddim",
  narrative:"ostinato", vary:0.1, sync:1,
  tip:"Riddim's core trick in miniature: the drop rides one unchanging sub riff for its full length, with all the interest coming from the drum pattern around it rather than the bass line itself." },

{ id:"riddim_landmines", name:"Landmines", artist:"Ganja White Night ft. ill.Gates", year:2015, bpm:140, tonic:2,
  progId:"deepHouse", baseTemplate:"riddim",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"A single, barely-varying sub riff carries the entire drop, true to the 'one riff on loop' ethos Ganja White Night helped popularize across the riddim scene." },

{ id:"riddim_sexsax", name:"Sex Sax", artist:"Ganja White Night", year:2016, bpm:145, tonic:7,
  progId:"dorian", baseTemplate:"riddim",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"A saxophone-toned sub riff loops unchanged through the drop, funkier and less mournful than most riddim, which is why the static minor-but-not-sad `dorian` vamp fits better than a straight minor progression." },

{ id:"riddim_protostar", name:"Protostar", artist:"Eliminate", year:2016, bpm:150, tonic:0,
  progId:"axisMinor", baseTemplate:"riddim",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"A single aggressive sub-riff pattern loops essentially unaltered through the whole drop — the genre's hallmark of repetition over development, straighter than brostep's more varied growl riffs." },

{ id:"riddim_whipit", name:"Whip It", artist:"Kompany", year:2016, bpm:145, tonic:4,
  progId:"axisMinor", baseTemplate:"riddim",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"The drop is built from one held sub-note riff that barely shifts across its whole length, variation coming from filtering rather than any melodic movement." },

{ id:"riddim_terrorsquad", name:"Terror Squad", artist:"Zomboy", year:2013, bpm:145, tonic:10,
  progId:"axisMinor", baseTemplate:"riddim",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"An early bridge between brostep and riddim — a repeating mid/sub riff carries the whole drop with only small textural changes pass to pass." },

{ id:"riddim_griztronics", name:"Griztronics", artist:"Subtronics ft. GRiZ", year:2018, bpm:140, tonic:6,
  progId:"dorian", baseTemplate:"riddim",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"GRiZ's funkier sensibility loosens the riff slightly compared to straighter riddim, but the drop still rides one repeating sub-bass idea rather than a developed tune." },

{ id:"riddim_rectangles", name:"Rectangles", artist:"Wooli", year:2018, bpm:150, tonic:1,
  progId:"axisMinor", baseTemplate:"riddim",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"A tightly quantized, unchanging sub riff drives the whole drop — the kind of straight repetition that made the track a favorite to mix back-to-back with others in the riddim scene." },

{ id:"riddim_war", name:"War", artist:"PhaseOne", year:2017, bpm:150, tonic:9,
  progId:"axisMinor", baseTemplate:"riddim",
  narrative:"ostinato", vary:0.2, sync:1,
  tip:"A single held sub riff repeats through the drop almost without variation, PhaseOne's heavier, distortion-forward end of the riddim sound." },

{ id:"futurebass_sayit", name:"Say It", artist:"Flume ft. Tove Lo", year:2016, bpm:150, tonic:7,
  progId:"futureBass", baseTemplate:"futurebass",
  narrative:"gapfill", vary:0.8, sync:2,
  tip:"Tove Lo's vocal is chopped and pitch-shifted into a hook that leaps and steps back down through the gap, while short bright chord stabs — not the vocal — actually carry the drop." },

{ id:"futurebass_light", name:"Light", artist:"San Holo", year:2016, bpm:150, tonic:0,
  progId:"futureBass", baseTemplate:"futurebass",
  narrative:"arch", vary:0.7, sync:1,
  tip:"A bright, guitar-tinged lead rises and falls within each phrase of the drop rather than developing across the whole song. `arch` matches that single-phrase rise-and-fall shape." },

{ id:"futurebass_beautifullife", name:"Beautiful Life", artist:"Illenium ft. Jon Bellion", year:2016, bpm:150, tonic:9,
  progId:"futureBass", baseTemplate:"futurebass",
  narrative:"expand", vary:0.8, sync:1,
  tip:"Jon Bellion's verse stays narrow and conversational before the drop throws the register wide open on stacked chord stabs — a build-to-drop widening `expand` is built to capture." },

{ id:"futurebass_itsstrange", name:"It's Strange", artist:"Louis The Child ft. K.Flay", year:2015, bpm:150, tonic:5,
  progId:"futureBass", baseTemplate:"futurebass",
  narrative:"qanda", vary:0.7, sync:1,
  tip:"K.Flay's half-sung verse phrases get answered by a bright synth-chord riff each time, a question-and-answer pattern that carries into the deliberately thin, chords-only drop." },

{ id:"futurebass_gemini", name:"Gemini", artist:"What So Not ft. George Maple", year:2015, bpm:150, tonic:2,
  progId:"edm", baseTemplate:"futurebass",
  narrative:"lament", vary:0.6, sync:1,
  tip:"George Maple's vocal line descends over a minor-key chord bed, more melancholy than most future bass, before the drop strips everything back to just those chords." },

{ id:"futurebass_silverbullet", name:"Silver Bullet", artist:"Whethan ft. Flux Pavilion", year:2017, bpm:150, tonic:4,
  progId:"futureBass", baseTemplate:"futurebass",
  narrative:"gapfill", vary:0.8, sync:2,
  tip:"A pitch-bent vocal chop hook leaps and resolves downward at the drop while short bright chords underneath do the real harmonic movement." },

{ id:"futurebass_alone", name:"Alone", artist:"Marshmello", year:2016, bpm:150, tonic:5,
  progId:"futureBass", baseTemplate:"futurebass",
  narrative:"peak", vary:0.7, sync:1,
  tip:"A plaintive lead synth line holds back its highest note until the final drop pass after two lower-register build sections. `peak` is built for exactly that kind of withheld payoff." },

{ id:"futurebass_sunsetlover", name:"Sunset Lover", artist:"Petit Biscuit", year:2015, bpm:91, tonic:10,
  progId:"futureBass", baseTemplate:"futurebass",
  narrative:"wave", vary:0.5, sync:0,
  tip:"A slow, entirely instrumental future bass cut with a long undulating lead line rather than a hard drop hook. `wave`'s unhurried rise and fall matches that mellower pacing." },

{ id:"futurebass_indiansummer", name:"Indian Summer", artist:"Jai Wolf", year:2015, bpm:100, tonic:8,
  progId:"futureBass", baseTemplate:"futurebass",
  narrative:"climb", vary:0.6, sync:1,
  tip:"The instrumental lead line gradually creeps upward in register over the course of the whole track rather than resetting section to section. `climb` is that steady ascent." },

{ id:"futuregarage_archangel", name:"Archangel", artist:"Burial", year:2007, bpm:130, tonic:2,
  progId:"aeolian", baseTemplate:"futuregarage",
  narrative:"wave", vary:0.4, sync:2,
  tip:"A pitched-up vocal sample drifts in and out over crackling 2-step drums and a held sub, mood settling rather than any hook landing an impact. `wave`'s slow undulation is that atmosphere-first approach." },

{ id:"futuregarage_maybes", name:"Maybes", artist:"Mount Kimbie", year:2009, bpm:100, tonic:5,
  progId:"dorian", baseTemplate:"futuregarage",
  narrative:"converse", vary:0.5, sync:2,
  tip:"Fragments of guitar and vocal sample sit sparsely over a skipping beat with real space between phrases. `converse`'s narrow, speech-like phrasing captures that gapped, unhurried texture." },

{ id:"futuregarage_cmyk", name:"CMYK", artist:"James Blake", year:2010, bpm:130, tonic:10,
  progId:"aeolian", baseTemplate:"futuregarage",
  narrative:"gapfill", vary:0.5, sync:2,
  tip:"Chopped R&B vocal samples leap and settle back over syncopated 2-step drums and a deep sub. `gapfill`'s leap-then-step-back shape suits that vocal-chop hook without the sub taking over the harmony." },

{ id:"futuregarage_hyphmngo", name:"Hyph Mngo", artist:"Joy Orbison", year:2009, bpm:130, tonic:7,
  progId:"dorian", baseTemplate:"futuregarage",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"A single vocal-chop cell loops over shuffling 2-step drums for most of the track's length — a genre landmark built on groove and repetition rather than melodic development." },

{ id:"futuregarage_wildfire", name:"Wildfire", artist:"SBTRKT ft. Sampha", year:2011, bpm:130, tonic:4,
  progId:"aeolian", baseTemplate:"futuregarage",
  narrative:"archSong", vary:0.7, sync:1,
  tip:"Sampha's sung verse and chorus give the track an actual song arc rather than a looped chop, sitting over a sparse 2-step pattern and a held sub true to the style." },

{ id:"futuregarage_sleepsound", name:"Sleep Sound", artist:"Jamie xx", year:2011, bpm:130, tonic:0,
  progId:"aeolian", baseTemplate:"futuregarage",
  narrative:"wave", vary:0.4, sync:2,
  tip:"Pitched vocal samples float over skittering 2-step percussion while the harmony barely moves underneath. `wave`'s slow undulation over a mostly static bed fits that settled, sparse mood." },

{ id:"futuregarage_spliffdub", name:"Spliff Dub", artist:"Zomby", year:2011, bpm:138, tonic:9,
  progId:"aeolian", baseTemplate:"futuregarage",
  narrative:"ostinato", vary:0.3, sync:1,
  tip:"A dubbed-out repeating synth figure sits over sparse drums and sub weight, closer to dub reggae's spaciousness than a developed melody." },

{ id:"futuregarage_stopwhatyouredoing", name:"Stop What You're Doing", artist:"Untold", year:2008, bpm:130, tonic:2,
  progId:"dorian", baseTemplate:"futuregarage",
  narrative:"chant", vary:0.3, sync:2,
  tip:"A chopped spoken vocal sample repeats as a rhythmic cell over skipping, syncopated drums, with no sung melody anywhere in the track." },

{ id:"futuregarage_blimey", name:"Blimey", artist:"Ramadanman", year:2009, bpm:130, tonic:5,
  progId:"dorian", baseTemplate:"futuregarage",
  narrative:"ostinato", vary:0.3, sync:2,
  tip:"A bare, dubby instrumental built from one repeating percussive riff and a held sub, with syncopated 2-step drums doing most of the actual movement." },

{ id:"futuregarage_callisto", name:"Callisto", artist:"Airhead", year:2011, bpm:120, tonic:3,
  progId:"dorian", baseTemplate:"futuregarage",
  narrative:"wave", vary:0.5, sync:1,
  tip:"Hazy pads and a soft, undulating lead sit over a slow, sparse 2-step pulse. `wave`'s long slow drift matches the track's unhurried, atmosphere-over-impact pacing." },

];

const TRACK_PRESETS = DEFS;

export { TRACK_PRESETS };
