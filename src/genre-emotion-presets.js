/* genre-emotion-presets — turning a Genre + Emotion pick into a full prefill: the chord count, the
   tempo and groove, every instrument, a full arrangement (which sections play what, on which
   instrument, with which effects, and what happens at every seam) and a melody narrative with a
   variation/syncopation setting to steer it.

   Two independent tables, composed at pick time rather than one 106×9 matrix:

     GENRE_STYLE   what the genre sounds like — its own tempo, drums, kit, bass, pad, percussion,
                   delay, swing, chord/lead instruments, song-level track FX — and which
                   arrangement archetype it is played in (`template`, a DANCE_TEMPLATES id: one of
                   the 68 dance styles, or one of the band/song-form archetypes in
                   band-templates.js). A dance genre with a template of its own (house, trance,
                   dnb, …) just points at it; a band genre points at the *form* it is played in
                   (a rock song, a jazz standard, a storyteller's strophic folk song) and lays its
                   own instruments and tempo over the archetype's neutral bundle — so Country and
                   Folk share the storyteller's running order and dynamics and sound nothing alike.
     EMOTION_STYLE what the emotion does to the melody and the feel — a NARRATIVES id, a variation
                   amount, a syncopation level, and small nudges to tempo/swing/humanise. Emotion
                   never touches which instruments play; genre never touches how the tune moves.

   `resolveGenreEmotionStyle` composes the two: the template supplies the arrangement and a base
   sound, the genre overrides that sound with its own, and the emotion's small deltas ride on top
   of the genre's numbers rather than replacing them — a "Sad" Trance is still recognisably Trance,
   just a little slower and sadder. Picking only one of the two still works: the other's fields
   are simply left at the base genre's (or a neutral default's) own values. */

// ---- genre → sound bundle + arrangement archetype ----
// Every value here is an id from the same catalogues the manual controls use (patterns.js,
// audio.js, melody.js) — an id that catalogue doesn't recognise is silently ignored by the
// setters that consume it, exactly as a hand-picked template already is. `trackFx` is the Sound
// tab's per-track rack (the amp's drive, the room's reverb, the dub bass's low-pass); `fxRack` is
// the song-level insert rack — the pedal that is on for the whole song rather than one section.
const GENRE_STYLE = {
  // ---- Pop & Rock ----
  "Pop": { template:"popsong", bpm:100, drum:"pop", pat:"pop", bass:"follow", pad:"strings", percKit:"hand", delay:"8d", swing:0.05, instr:"acoustic_guitar_steel", melInstr:"ep", humanise:0.15, narrative:"chordPhrases", vary:0.6, sync:0, trackFx:{ chords:{ verb:15 } } },
  "Rock": { template:"rocksong", bpm:120, drum:"rock", pat:"rock8", bass:"follow", pad:"", instr:"electric_guitar_clean", melInstr:"saw", humanise:0.1, narrative:"motif", vary:0.6, sync:0, trackFx:{ chords:{ drive:20 } } },
  "Classic Rock": { template:"rocksong", bpm:116, drum:"rock", pat:"rock8", bass:"follow", pad:"", instr:"overdriven_guitar", melInstr:"saw", humanise:0.15, narrative:"motif", vary:0.6, sync:0, trackFx:{ chords:{ drive:25, verb:15 } } },
  "Hard Rock": { template:"rocksong", bpm:140, drum:"rock", pat:"rock8", bass:"eighths", bassVoice:"square", pad:"", instr:"distortion_guitar", melInstr:"square", humanise:0.1, narrative:"climb", vary:0.7, sync:1, trackFx:{ chords:{ drive:35 }, bass:{ drive:15 } } },
  "Arena Rock": { template:"anthem", bpm:122, drum:"anthem", pat:"stomp", bass:"follow", pad:"strings", instr:"electric_guitar_clean", melInstr:"saw", humanise:0.1, narrative:"peak", vary:0.8, sync:0, trackFx:{ chords:{ drive:20, verb:30 }, drums:{ verb:25 } } },
  "Alternative / Indie": { template:"indiesong", bpm:118, drum:"rock", pat:"busy8", bass:"follow", pad:"glass", instr:"electric_guitar_clean", melInstr:"pluck", humanise:0.15, narrative:"wave", vary:0.6, sync:0, trackFx:{ chords:{ verb:25 } } },
  "Grunge": { template:"quietloud", bpm:110, drum:"rock", pat:"rock8", bass:"eighths", bassVoice:"square", pad:"", instr:"distortion_guitar", melInstr:"square", humanise:0.2, narrative:"motif", vary:0.5, sync:0, trackFx:{ chords:{ drive:45 }, bass:{ drive:20 } } },
  "Britpop": { template:"indiesong", bpm:124, drum:"pop", pat:"busy8", bass:"follow", pad:"strings", instr:"electric_guitar_clean", melInstr:"saw", humanise:0.1, narrative:"terraced", vary:0.6, sync:0, trackFx:{ chords:{ drive:20, verb:20 } } },
  "Punk": { template:"punksprint", bpm:170, drum:"punk", pat:"rock8", bass:"eighths", bassVoice:"square", pad:"", instr:"distortion_guitar", melInstr:"square", humanise:0.05, narrative:"ostinato", vary:0.4, sync:1, trackFx:{ chords:{ drive:35 }, bass:{ drive:25 } } },
  "Pop-Punk": { template:"punksprint", bpm:165, drum:"pop", pat:"rock8", bass:"eighths", bassVoice:"square", pad:"", instr:"overdriven_guitar", melInstr:"saw", humanise:0.05, narrative:"motif", vary:0.6, sync:1, trackFx:{ chords:{ drive:30 } } },
  "Emo": { template:"quietloud", bpm:145, drum:"pop", pat:"busy8", bass:"follow", pad:"glass", instr:"electric_guitar_clean", melInstr:"pluck", humanise:0.1, narrative:"qanda", vary:0.7, sync:0, trackFx:{ chords:{ drive:15, verb:30 } } },
  "Shoegaze": { template:"postrock", bpm:100, drum:"halftime", pat:"drone", bass:"follow", pad:"warmpad", delay:"8d", instr:"electric_guitar_muted", melInstr:"glass", humanise:0.2, narrative:"wave", vary:0.5, sync:0, trackFx:{ chords:{ drive:35, verb:60 }, pad:{ wob:15, verb:50 } }, fxRack:{ chords:[{ type:"chorus", rate:25, depth:60, mix:50 }] } },
  "Post-Rock": { template:"postrock", bpm:90, drum:"halftime", pat:"arp", bass:"follow", pad:"warmpad", delay:"16", instr:"electric_guitar_clean", melInstr:"bell", humanise:0.15, narrative:"climb", vary:0.8, sync:0, trackFx:{ chords:{ verb:45, send:30 }, pad:{ verb:40 } } },
  "Psychedelic": { template:"throughcomposed", bpm:110, drum:"rock", pat:"busy8", bass:"follow", pad:"organ", delay:"8d", instr:"electric_guitar_clean", melInstr:"sine", humanise:0.15, narrative:"wave", vary:0.7, sync:0, trackFx:{ chords:{ apan:40, verb:35 } }, fxRack:{ chords:[{ type:"phaser", rate:20, depth:60, fb:35 }] } },
  "Surf Rock": { template:"rocksong", bpm:160, drum:"surf", pat:"busy8", bass:"follow", pad:"", delay:"8d", instr:"electric_guitar_clean", melInstr:"saw", humanise:0.05, narrative:"ostinato", vary:0.4, sync:0, trackFx:{ chords:{ verb:55, send:30 } } },

  // ---- Metal & Heavy ----
  "Metal": { template:"metalsong", bpm:140, drum:"rock", pat:"rock8", bass:"eighths", bassVoice:"square", pad:"", instr:"distortion_guitar", melInstr:"square", humanise:0, narrative:"climb", vary:0.6, sync:1, trackFx:{ chords:{ drive:40 }, bass:{ drive:20 } } },
  "Heavy Metal": { template:"metalsong", bpm:150, drum:"rock", pat:"rock8", bass:"eighths", bassVoice:"square", pad:"", instr:"distortion_guitar", melInstr:"square", humanise:0, narrative:"climb", vary:0.6, sync:1, trackFx:{ chords:{ drive:45 }, bass:{ drive:20 } } },
  "Thrash Metal": { template:"metalsong", bpm:190, drum:"punk", pat:"rock8", bass:"eighths", bassVoice:"square", pad:"", instr:"distortion_guitar", melInstr:"square", humanise:0, narrative:"ostinato", vary:0.4, sync:1, trackFx:{ chords:{ drive:50 }, bass:{ drive:25 } } },
  "Doom / Sludge": { template:"doomcrawl", bpm:65, drum:"halftime", pat:"drone", bass:"subhold", bassVoice:"square", pad:"", instr:"distortion_guitar", melInstr:"square", humanise:0.1, narrative:"lament", vary:0.4, sync:0, trackFx:{ chords:{ drive:55, cut:70 }, bass:{ drive:25 } } },
  "Power Metal": { template:"metalsong", bpm:165, drum:"driving", pat:"rock8", bass:"eighths", bassVoice:"saw", pad:"strings", instr:"distortion_guitar", melInstr:"supersaw", humanise:0, narrative:"peak", vary:0.9, sync:1, trackFx:{ chords:{ drive:40, verb:25 }, pad:{ verb:35 } } },
  "Prog Metal": { template:"throughcomposed", bpm:132, drum:"driving", pat:"busy8", bass:"eighths", bassVoice:"square", pad:"glass", instr:"distortion_guitar", melInstr:"square", humanise:0.05, narrative:"germ", vary:0.7, sync:1, trackFx:{ chords:{ drive:40 } } },
  "Nu-Metal": { template:"quietloud", bpm:100, drum:"rock", pat:"funk", bass:"funk16", bassVoice:"square", pad:"", instr:"distortion_guitar", melInstr:"square", humanise:0.05, narrative:"ostinato", vary:0.5, sync:1, trackFx:{ chords:{ drive:45, hp:10 }, bass:{ drive:30 } } },

  // ---- Blues, Soul & Funk ----
  "Blues": { template:"bluesform", bpm:90, drum:"shuffle", pat:"shuffle", bass:"walk", bassVoice:"pluck", pad:"", instr:"electric_guitar_jazz", melInstr:"saw", humanise:0.2, narrative:"callResp", vary:0.6, sync:0, trackFx:{ chords:{ drive:15, verb:20 } } },
  "Rhythm & Blues": { template:"soulmotown", bpm:95, drum:"rnb", pat:"shuffle", bass:"follow", pad:"brass", instr:"electric_piano_1", melInstr:"ep", humanise:0.2, narrative:"callResp", vary:0.6, sync:0, trackFx:{ chords:{ verb:20 } } },
  "Soul": { template:"soulmotown", bpm:92, drum:"motown", pat:"shuffle", bass:"follow", pad:"strings", instr:"electric_piano_1", melInstr:"ep", humanise:0.2, narrative:"period", vary:0.6, sync:0, trackFx:{ chords:{ verb:25 }, pad:{ verb:30 } } },
  "Motown": { template:"soulmotown", bpm:118, drum:"motown", pat:"quarters", bass:"follow", pad:"brass", instr:"electric_piano_1", melInstr:"ep", humanise:0.15, narrative:"callResp", vary:0.6, sync:0, trackFx:{ drums:{ verb:15 } } },
  "Funk": { template:"funkgroove", bpm:108, drum:"funk", pat:"funk", bass:"funk16", bassVoice:"square", pad:"brass", percKit:"hand", instr:"clavinet", melInstr:"clav", humanise:0.2, narrative:"motif", vary:0.6, sync:1, trackFx:{ chords:{ hp:20 } }, fxRack:{ bass:[{ type:"comp", thresh:-20, ratio:4, atk:10, rel:120 }] } },
  "Disco": { template:"disco" },
  "Gospel": { template:"soulmotown", bpm:96, drum:"motown", pat:"quarters", bass:"follow", pad:"voice", instr:"drawbar_organ", melInstr:"organ", humanise:0.15, narrative:"callResp", vary:0.7, sync:0, trackFx:{ chords:{ verb:30 }, pad:{ verb:35 } } },
  "Neo-Soul": { template:"soulmotown", bpm:84, drum:"rnb", pat:"charleston", bass:"walk", bassVoice:"pluck", pad:"warmpad", instr:"electric_piano_1", melInstr:"ep", humanise:0.2, narrative:"wave", vary:0.6, sync:0, trackFx:{ chords:{ verb:25, cut:80 } } },

  // ---- Jazz & Standards ----
  "Jazz": { template:"jazzstandard", bpm:120, drum:"shuffle", pat:"fourbar", bass:"walk", bassVoice:"pluck", pad:"brass", instr:"acoustic_grand_piano", melInstr:"ep", humanise:0.15, narrative:"qanda", vary:0.7, sync:0, trackFx:{ chords:{ verb:20 } } },
  "Swing": { template:"jazzstandard", bpm:140, drum:"shuffle", pat:"fourbar", bass:"walk", bassVoice:"pluck", pad:"brass", instr:"acoustic_grand_piano", melInstr:"ep", humanise:0.1, narrative:"callResp", vary:0.7, sync:0, trackFx:{ chords:{ verb:20 }, pad:{ verb:20 } } },
  "Bebop": { template:"jazzstandard", bpm:200, drum:"shuffle", pat:"charleston", bass:"walk", bassVoice:"pluck", pad:"", instr:"acoustic_grand_piano", melInstr:"saw", humanise:0.05, narrative:"cascade", vary:0.9, sync:0, trackFx:{ chords:{ verb:15 } } },
  "Bossa Nova": { template:"bossasong", bpm:118, drum:"bossa", pat:"bossa", bass:"walk", bassVoice:"pluck", pad:"strings", instr:"acoustic_guitar_nylon", melInstr:"flute", humanise:0.15, narrative:"wave", vary:0.6, sync:0, trackFx:{ chords:{ verb:20 } } },
  "Cool Jazz": { template:"jazzstandard", bpm:100, drum:"shuffle", pat:"arp", bass:"walk", bassVoice:"pluck", pad:"glass", instr:"acoustic_grand_piano", melInstr:"flute", humanise:0.15, narrative:"period", vary:0.6, sync:0, trackFx:{ chords:{ verb:25 } } },
  "Ragtime": { template:"jazzstandard", bpm:108, drum:"shuffle", pat:"charleston", bass:"walk", bassVoice:"pluck", pad:"", instr:"honkytonk_piano", melInstr:"ep", humanise:0.1, narrative:"motif", vary:0.6, sync:0 },
  "Lounge": { template:"bossasong", bpm:96, drum:"shuffle", pat:"arp", bass:"walk", bassVoice:"pluck", pad:"strings", instr:"electric_piano_1", melInstr:"ep", humanise:0.15, narrative:"wave", vary:0.5, sync:0, trackFx:{ chords:{ verb:30 }, pad:{ verb:30 } } },

  // ---- Folk, Country & Roots ----
  "Folk": { template:"storyteller", bpm:104, drum:"twostep", pat:"pop", bass:"walk", bassVoice:"pluck", pad:"", instr:"acoustic_guitar_steel", melInstr:"flute", humanise:0.2, narrative:"period", vary:0.5, sync:0, trackFx:{ chords:{ verb:15 } } },
  "Country": { template:"countrysong", bpm:112, drum:"twostep", pat:"boomchick", bass:"walk", bassVoice:"pluck", pad:"", instr:"acoustic_guitar_steel", melInstr:"ep", humanise:0.15, narrative:"period", vary:0.5, sync:0, trackFx:{ chords:{ verb:15 } } },
  "Bluegrass": { template:"countrysong", bpm:150, drum:"train", pat:"busy8", bass:"walk", bassVoice:"pluck", pad:"", instr:"banjo", melInstr:"pluck", humanise:0.15, narrative:"cascade", vary:0.7, sync:0 },
  "Americana": { template:"storyteller", bpm:108, drum:"twostep", pat:"boomchick", bass:"walk", bassVoice:"pluck", pad:"strings", instr:"acoustic_guitar_steel", melInstr:"ep", humanise:0.2, narrative:"period", vary:0.5, sync:0, trackFx:{ chords:{ verb:20 } } },
  "Rockabilly": { template:"bluesform", bpm:150, drum:"train", pat:"busy8", bass:"walk", bassVoice:"pluck", pad:"", instr:"electric_guitar_clean", melInstr:"saw", humanise:0.15, narrative:"motif", vary:0.6, sync:0, trackFx:{ chords:{ drive:15, send:25 } } },
  "Celtic": { template:"celticset", bpm:120, drum:"march68", pat:"jig68", bass:"walk", bassVoice:"pluck", pad:"", instr:"acoustic_guitar_steel", melInstr:"whistle", humanise:0.15, narrative:"cascade", vary:0.6, sync:0, trackFx:{ chords:{ verb:25 } } },
  "Singer-Songwriter": { template:"storyteller", bpm:96, drum:"ballad", pat:"arp", bass:"follow", pad:"", instr:"acoustic_guitar_steel", melInstr:"ep", humanise:0.2, narrative:"period", vary:0.5, sync:0, trackFx:{ chords:{ verb:20 } } },

  // ---- Dance & Electronic ----
  "EDM / Dance": { template:"bigroom" },
  "House": { template:"house" },
  "Deep House": { template:"deephouse" },
  "Tech House": { template:"techhouse" },
  "Progressive House": { template:"proghouse" },
  "Future House": { template:"basshouse" },
  "Tropical House": { template:"balearic" },
  "Nu-Disco": { template:"nudisco" },
  "Techno": { template:"techno" },
  "Minimal Techno": { template:"minimaltechno" },
  "Trance": { template:"trance" },
  "Psytrance": { template:"psytrance" },
  "Big Room": { template:"bigroom" },
  "Electro House": { template:"electrohouse" },
  "Dubstep": { template:"dubstep" },
  "Future Bass": { template:"futurebass" },
  "Drum & Bass": { template:"dnb" },
  "Jungle": { template:"jungle" },
  "UK Garage": { template:"garage" },
  "Breakbeat": { template:"brokenbeat" },
  "Hardstyle": { template:"hardstyle" },
  "Eurodance": { template:"hinrg" },
  "Synthwave": { template:"italodisco" },
  "Ambient": { template:"ambientdrift", bpm:70, drum:"off", pat:"drone", bass:"", pad:"warmpad", delay:"16", swing:0, instr:"pad_1_new_age", melInstr:"glass", humanise:0.1, narrative:"suspend", vary:0.5, sync:0, trackFx:{ pad:{ verb:70, send:50 }, chords:{ verb:60 } } },
  "Downtempo / Trip-Hop": { template:"lofiloop", bpm:90, drum:"hiphop16", kit:"vinyl", pat:"charleston", bass:"walk", bassVoice:"sub", pad:"warmpad", delay:"16", swing:0.1, instr:"electric_piano_1", melInstr:"sine", humanise:0.15, narrative:"wave", vary:0.5, sync:0, trackFx:{ chords:{ cut:65 }, pad:{ verb:40 }, drums:{ cut:80 } } },
  "IDM": { template:"throughcomposed", bpm:130, drum:"footwork", kit:"minimal", pat:"four16", bass:"eighths", bassVoice:"square", pad:"glass", delay:"16", swing:0, instr:"lead_2_sawtooth", melInstr:"bell", humanise:0, narrative:"gapfill", vary:0.8, sync:2, fxRack:{ chords:[{ type:"stutter", rate:40, depth:60, fb:55 }], drums:[{ type:"crush", bits:8, red:40, mix:60 }] } },
  "Lo-Fi / Chillhop": { template:"lofiloop", bpm:80, drum:"boombap", kit:"vinyl", pat:"charleston", bass:"walk", bassVoice:"pluck", pad:"warmpad", delay:"8d", swing:0.15, instr:"electric_piano_1", melInstr:"ep", humanise:0.25, narrative:"wave", vary:0.4, sync:0, trackFx:{ chords:{ cut:55, drive:10 }, drums:{ cut:70 }, pad:{ cut:60 } } },
  "Hip-Hop": { template:"hiphopsong", bpm:90, drum:"boombap", kit:"mpc60", pat:"funk16", bass:"funk16", bassVoice:"sub", pad:"brass", instr:"electric_piano_1", melInstr:"bell", humanise:0.15, narrative:"ostinato", vary:0.5, sync:1, trackFx:{ drums:{ drive:10 }, chords:{ cut:70 }, bass:{ cut:50 } } },
  "Trap": { template:"trap" },

  // ---- Latin ----
  "Latin": { template:"salsaform", bpm:100, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"brass", percKit:"latin", instr:"acoustic_guitar_nylon", melInstr:"brass", humanise:0.15, narrative:"motif", vary:0.6, sync:1, trackFx:{ chords:{ verb:20 } } },
  "Salsa": { template:"salsaform", bpm:180, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"brass", percKit:"latin", instr:"acoustic_grand_piano", melInstr:"brass", humanise:0.1, narrative:"ostinato", vary:0.6, sync:1 },
  "Son Cubano": { template:"salsaform", bpm:100, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"", percKit:"latin", instr:"acoustic_guitar_nylon", melInstr:"pluck", humanise:0.15, narrative:"motif", vary:0.5, sync:1, trackFx:{ chords:{ verb:20 } } },
  "Mambo": { template:"salsaform", bpm:190, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"brass", percKit:"latin", instr:"acoustic_grand_piano", melInstr:"brass", humanise:0.1, narrative:"peak", vary:0.8, sync:1 },
  "Cha-Cha-Chá": { template:"salsaform", bpm:128, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"brass", percKit:"latin", instr:"acoustic_grand_piano", melInstr:"pluck", humanise:0.1, narrative:"terraced", vary:0.6, sync:1 },
  "Rumba": { template:"flamencoform", bpm:100, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"", percKit:"latin", instr:"acoustic_guitar_nylon", melInstr:"pluck", humanise:0.2, narrative:"callResp", vary:0.6, sync:1, trackFx:{ chords:{ verb:25 } } },
  "Timba": { template:"salsaform", bpm:200, drum:"tresillo", pat:"funk16", bass:"funk16", bassVoice:"pluck", pad:"brass", percKit:"latin", instr:"acoustic_grand_piano", melInstr:"brass", humanise:0.1, narrative:"cascade", vary:0.8, sync:1 },
  "Latin Jazz": { template:"jazzstandard", bpm:140, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"brass", percKit:"latin", instr:"acoustic_grand_piano", melInstr:"ep", humanise:0.15, narrative:"qanda", vary:0.7, sync:1, trackFx:{ chords:{ verb:20 } } },
  "Samba": { template:"salsaform", bpm:100, drum:"samba", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"", percKit:"latin", instr:"acoustic_guitar_nylon", melInstr:"flute", humanise:0.15, narrative:"cascade", vary:0.6, sync:1 },
  "Bossa Nova (Latin)": { template:"bossasong", bpm:116, drum:"bossa", pat:"bossa", bass:"walk", bassVoice:"pluck", pad:"strings", instr:"acoustic_guitar_nylon", melInstr:"flute", humanise:0.15, narrative:"wave", vary:0.6, sync:0, trackFx:{ chords:{ verb:20 } } },
  "Bachata": { template:"boleroballad", bpm:130, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"", percKit:"latin", instr:"acoustic_guitar_nylon", melInstr:"pluck", humanise:0.15, narrative:"period", vary:0.6, sync:1, trackFx:{ chords:{ verb:25, send:20 } } },
  "Merengue": { template:"salsaform", bpm:150, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"brass", percKit:"latin", instr:"accordion", melInstr:"brass", humanise:0.1, narrative:"ostinato", vary:0.6, sync:1 },
  "Cumbia": { template:"salsaform", bpm:95, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"", percKit:"latin", instr:"accordion", melInstr:"pluck", humanise:0.2, narrative:"motif", vary:0.5, sync:1 },
  "Reggaetón": { template:"moombahton" },
  "Latin Pop": { template:"popsong", bpm:100, drum:"tresillo", pat:"latin", bass:"follow", pad:"strings", percKit:"latin", instr:"acoustic_guitar_nylon", melInstr:"ep", humanise:0.15, narrative:"chordPhrases", vary:0.6, sync:1, trackFx:{ chords:{ verb:20 } } },
  "Tango": { template:"boleroballad", bpm:120, drum:"halftime", pat:"tresillo", bass:"walk", bassVoice:"pluck", pad:"", instr:"tango_accordion", melInstr:"saw", humanise:0.15, narrative:"suspend", vary:0.7, sync:1, trackFx:{ chords:{ verb:25 } } },
  "Bolero": { template:"boleroballad", bpm:84, drum:"ballad", pat:"arp", bass:"walk", bassVoice:"pluck", pad:"strings", instr:"acoustic_guitar_nylon", melInstr:"ep", humanise:0.2, narrative:"period", vary:0.5, sync:0, trackFx:{ chords:{ verb:35 }, pad:{ verb:35 } } },
  "Mariachi": { template:"salsaform", bpm:120, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"brass", instr:"acoustic_guitar_nylon", melInstr:"brass", humanise:0.15, narrative:"motif", vary:0.6, sync:1 },
  "Norteño": { template:"countrysong", bpm:130, drum:"twostep", pat:"boomchick", bass:"walk", bassVoice:"pluck", pad:"", instr:"accordion", melInstr:"pluck", humanise:0.15, narrative:"motif", vary:0.5, sync:0 },
  "Forró": { template:"countrysong", bpm:130, drum:"samba", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"", percKit:"latin", instr:"accordion", melInstr:"pluck", humanise:0.15, narrative:"ostinato", vary:0.6, sync:1 },

  // ---- World & Modal ----
  "Flamenco": { template:"flamencoform", bpm:130, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"", percKit:"latin", instr:"acoustic_guitar_nylon", melInstr:"pluck", humanise:0.2, narrative:"cascade", vary:0.7, sync:1, trackFx:{ chords:{ verb:25 } } },
  "Reggae": { template:"reggaesong", bpm:80, drum:"reggae", pat:"skank", bass:"offbeat", bassVoice:"sub", pad:"organ", percKit:"hand", instr:"electric_guitar_muted", melInstr:"organ", humanise:0.2, narrative:"ostinato", vary:0.5, sync:0, trackFx:{ chords:{ hp:25, send:20 }, bass:{ cut:60 } } },
  "Ska": { template:"soulmotown", bpm:150, drum:"ska", pat:"skank", bass:"walk", bassVoice:"pluck", pad:"brass", instr:"electric_guitar_clean", melInstr:"brass", humanise:0.1, narrative:"motif", vary:0.6, sync:0, trackFx:{ chords:{ hp:20 } } },
  "Afrobeat": { template:"funkgroove", bpm:110, drum:"funk", pat:"funk16", bass:"funk16", bassVoice:"pluck", pad:"brass", percKit:"latin", instr:"kalimba", melInstr:"organ", humanise:0.2, narrative:"ostinato", vary:0.6, sync:1 },
  "Middle Eastern": { template:"flamencoform", bpm:100, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"", percKit:"latin", instr:"sitar", melInstr:"pluck", humanise:0.2, narrative:"cascade", vary:0.6, sync:1, trackFx:{ chords:{ verb:30 } } },
  "Klezmer": { template:"celticset", bpm:130, drum:"march", pat:"busy8", bass:"walk", bassVoice:"pluck", pad:"", instr:"accordion", melInstr:"saw", humanise:0.15, narrative:"motif", vary:0.7, sync:0 },
  "Bollywood": { template:"popsong", bpm:110, drum:"funk", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"strings", percKit:"latin", instr:"sitar", melInstr:"flute", humanise:0.15, narrative:"terraced", vary:0.7, sync:1, trackFx:{ chords:{ verb:30 }, pad:{ verb:30 } } },

  // ---- Cinematic & Classical ----
  "Cinematic / Film": { template:"filmcue", bpm:90, drum:"off", pat:"drone", bass:"follow", pad:"strings", delay:"16", swing:0, instr:"string_ensemble_1", melInstr:"strings", humanise:0.1, narrative:"archSong", vary:0.7, sync:0, trackFx:{ pad:{ verb:55 }, chords:{ verb:45 } } },
  "Epic / Trailer": { template:"trailerrise", bpm:100, drum:"anthem", pat:"stomp", bass:"follow", pad:"brass", delay:"off", swing:0, instr:"brass_section", melInstr:"brass", humanise:0.05, narrative:"peak", vary:0.9, sync:0, trackFx:{ pad:{ verb:50 }, chords:{ verb:40 }, drums:{ verb:30 } } },
  "Horror / Tension": { template:"filmcue", bpm:70, drum:"off", pat:"drone", bass:"follow", pad:"voice", delay:"16", swing:0, instr:"tremolo_strings", melInstr:"sine", humanise:0.1, narrative:"suspend", vary:0.5, sync:0, trackFx:{ chords:{ trem:30, verb:50 }, pad:{ verb:60 } } },
  "Classical": { template:"classicalform", bpm:92, drum:"off", pat:"arp", bass:"follow", pad:"strings", swing:0, instr:"acoustic_grand_piano", melInstr:"strings", humanise:0.1, narrative:"period", vary:0.6, sync:0, trackFx:{ chords:{ verb:35 }, pad:{ verb:35 } } },
  "Baroque": { template:"classicalform", bpm:100, drum:"off", pat:"fourbar", bass:"follow", pad:"strings", swing:0, instr:"harpsichord", melInstr:"strings", humanise:0.05, narrative:"cascade", vary:0.6, sync:0, trackFx:{ chords:{ verb:30 } } },
  "Dreamscore": { template:"filmcue", bpm:80, drum:"off", pat:"drone", bass:"follow", pad:"glass", delay:"16", swing:0, instr:"celesta", melInstr:"glass", humanise:0.1, narrative:"wave", vary:0.6, sync:0, trackFx:{ chords:{ verb:50, send:30 }, pad:{ verb:55 } } },
};
// A neutral fallback for "Any genre" + a chosen emotion — a plain acoustic bed in the pop song's
// shape, with nothing the emotion's own narrative and tempo/feel nudges have to fight.
const GENRE_STYLE_DEFAULT = { template:"popsong", bpm:100, drum:"pop", pat:"pop", bass:"follow", pad:"strings", instr:"acoustic_guitar_steel", melInstr:"ep", humanise:0.15, narrative:"chordPhrases", vary:0.6, sync:0 };

// ---- emotion → melodic character + feel ----
// `narrative` is a NARRATIVES id (melody.js); `vary`/`sync`/`within` feed applyNarrative exactly as
// a track preset's own narrative fields do. The deltas nudge the genre's own tempo/swing/humanise
// rather than replace them, clamped by the caller against the app's own slider ranges.
const EMOTION_STYLE = {
  "Happy": { narrative:"terraced", vary:0.7, sync:1, within:false, bpmDelta:4, swingDelta:0, humaniseDelta:0, chordDelta:0 },
  "Sad": { narrative:"lament", vary:0.5, sync:0, within:false, bpmDelta:-10, swingDelta:0.05, humaniseDelta:0.05, chordDelta:0 },
  "Nostalgic": { narrative:"wave", vary:0.6, sync:0, within:false, bpmDelta:-6, swingDelta:0.05, humaniseDelta:0.1, chordDelta:0 },
  "Hopeful": { narrative:"climb", vary:0.7, sync:1, within:false, bpmDelta:2, swingDelta:0, humaniseDelta:0, chordDelta:1 },
  "Dark / Tense": { narrative:"suspend", vary:0.5, sync:2, within:true, bpmDelta:-4, swingDelta:0, humaniseDelta:-0.05, chordDelta:1 },
  "Epic": { narrative:"peak", vary:1, sync:1, within:false, bpmDelta:2, swingDelta:0, humaniseDelta:0, chordDelta:1 },
  "Romantic": { narrative:"period", vary:0.6, sync:0, within:false, bpmDelta:-8, swingDelta:0.1, humaniseDelta:0.1, chordDelta:0 },
  "Dreamy": { narrative:"cascade", vary:0.7, sync:0, within:true, bpmDelta:-10, swingDelta:0.05, humaniseDelta:0.1, chordDelta:0 },
  "Melancholic": { narrative:"germ", vary:0.5, sync:0, within:false, bpmDelta:-8, swingDelta:0.05, humaniseDelta:0.05, chordDelta:0 },
};

/* Composes a genre's sound with an emotion's melodic character into one bundle the app can apply
   in a single pick. `templates` is the app's own DANCE_TEMPLATES array (passed in rather than
   imported, so this module stays pure data plus pure functions, importable the same way
   progressions.js is); `templateIdx` on the result is the index into it a caller needs to run the
   template's own arrangement plan through `applyArrangement`, or -1 if the id could not be found.

   Layering, lowest first: the archetype's neutral bundle, then the genre's own fields over it (a
   dance genre that only names a template overrides nothing), then the emotion's deltas over
   *that* — so the genre's tempo is what the emotion nudges, not the archetype's. */
function resolveGenreEmotionStyle(genre, emotion, templates) {
  const g = GENRE_STYLE[genre] || GENRE_STYLE_DEFAULT;
  const { template, ...own } = g;
  const templateIdx = template ? templates.findIndex(t => t.id === template) : -1;
  const tpl = templateIdx >= 0 ? templates[templateIdx] : null;
  const base = { ...(tpl || GENRE_STYLE_DEFAULT), ...own };
  const em = emotion ? EMOTION_STYLE[emotion] : null;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  return {
    bpm: Math.round(Math.max(40, Math.min(220, (base.bpm || 100) + (em ? em.bpmDelta : 0)))),
    pat: base.pat, drum: base.drum, kit: base.kit, pump: base.pump,
    bass: base.bass, bassVoice: base.bassVoice,
    pad: base.pad, percKit: base.percKit,
    delay: base.delay,
    swing: clamp01((base.swing || 0) + (em ? em.swingDelta : 0)),
    instr: base.instr, melInstr: base.melInstr,
    humanise: clamp01((base.humanise != null ? base.humanise : 0) + (em ? em.humaniseDelta : 0)),
    trackFx: base.trackFx, fxRack: base.fxRack,
    narrative: em ? em.narrative : base.narrative,
    vary: em ? em.vary : (base.vary != null ? base.vary : 1),
    sync: em ? em.sync : (base.sync || 0),
    within: em ? !!em.within : false,
    chordDelta: em ? em.chordDelta : 0,
    templateIdx, plan: tpl ? tpl.plan : null,
  };
}

export { GENRE_STYLE, GENRE_STYLE_DEFAULT, EMOTION_STYLE, resolveGenreEmotionStyle };
