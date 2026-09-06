/* genre-emotion-presets — turning a Genre + Emotion pick into a full prefill: the chord count, the
   tempo and groove, every instrument, the arrangement (where a matching one exists) and a melody
   narrative with a variation/syncopation setting to steer it.

   Two independent tables, composed at pick time rather than one 106×9 matrix:

     GENRE_STYLE   what the genre sounds like — its own tempo, drums, kit, bass, pad, percussion,
                   delay, swing, chord/lead instruments and (for the styles that have one) a full
                   DANCE_TEMPLATES arrangement. A genre that already has a matching dance template
                   (house, trance, dnb, …) simply points at it with `{ template: id }` rather than
                   duplicating its numbers here.
     EMOTION_STYLE what the emotion does to the melody and the feel — a NARRATIVES id, a variation
                   amount, a syncopation level, and small nudges to tempo/swing/humanise. Emotion
                   never touches which instruments play; genre never touches how the tune moves.

   `resolveGenreEmotionStyle` composes the two: genre supplies the instrumentation/arrangement,
   emotion supplies the melodic character, and the emotion's small deltas ride on top of the
   genre's own numbers rather than replacing them — a "Sad" Trance is still recognisably Trance,
   just a little slower and sadder. Picking only one of the two still works: the other's fields
   are simply left at the base genre's (or a neutral default's) own values. */

// ---- genre → sound bundle ----
// Every value here is an id from the same catalogues the manual controls use (patterns.js,
// audio.js, melody.js) — an id that catalogue doesn't recognise is silently ignored by the
// setters that consume it, exactly as a hand-picked template already is.
const GENRE_STYLE = {
  // ---- Pop & Rock ----
  "Pop": { bpm:100, drum:"pop", pat:"pop", bass:"follow", pad:"strings", percKit:"hand", delay:"8d", swing:0.05, instr:"acoustic_guitar_steel", melInstr:"ep", humanise:0.15, narrative:"chordPhrases", vary:0.6, sync:0 },
  "Rock": { bpm:120, drum:"rock", pat:"rock8", bass:"follow", pad:"", instr:"electric_guitar_clean", melInstr:"saw", humanise:0.1, narrative:"motif", vary:0.6, sync:0 },
  "Classic Rock": { bpm:116, drum:"rock", pat:"rock8", bass:"follow", pad:"", instr:"overdriven_guitar", melInstr:"saw", humanise:0.15, narrative:"motif", vary:0.6, sync:0 },
  "Hard Rock": { bpm:140, drum:"rock", pat:"rock8", bass:"eighths", bassVoice:"square", pad:"", instr:"distortion_guitar", melInstr:"square", humanise:0.1, narrative:"climb", vary:0.7, sync:1 },
  "Arena Rock": { bpm:122, drum:"anthem", pat:"stomp", bass:"follow", pad:"strings", instr:"electric_guitar_clean", melInstr:"saw", humanise:0.1, narrative:"peak", vary:0.8, sync:0 },
  "Alternative / Indie": { bpm:118, drum:"rock", pat:"busy8", bass:"follow", pad:"glass", instr:"electric_guitar_clean", melInstr:"pluck", humanise:0.15, narrative:"wave", vary:0.6, sync:0 },
  "Grunge": { bpm:110, drum:"rock", pat:"rock8", bass:"eighths", bassVoice:"square", pad:"", instr:"distortion_guitar", melInstr:"square", humanise:0.2, narrative:"motif", vary:0.5, sync:0 },
  "Britpop": { bpm:124, drum:"pop", pat:"busy8", bass:"follow", pad:"strings", instr:"electric_guitar_clean", melInstr:"saw", humanise:0.1, narrative:"terraced", vary:0.6, sync:0 },
  "Punk": { bpm:170, drum:"punk", pat:"rock8", bass:"eighths", bassVoice:"square", pad:"", instr:"distortion_guitar", melInstr:"square", humanise:0.05, narrative:"ostinato", vary:0.4, sync:1 },
  "Pop-Punk": { bpm:165, drum:"pop", pat:"rock8", bass:"eighths", bassVoice:"square", pad:"", instr:"overdriven_guitar", melInstr:"saw", humanise:0.05, narrative:"motif", vary:0.6, sync:1 },
  "Emo": { bpm:145, drum:"pop", pat:"busy8", bass:"follow", pad:"glass", instr:"electric_guitar_clean", melInstr:"pluck", humanise:0.1, narrative:"qanda", vary:0.7, sync:0 },
  "Shoegaze": { bpm:100, drum:"halftime", pat:"drone", bass:"follow", pad:"warmpad", delay:"8d", instr:"electric_guitar_muted", melInstr:"glass", humanise:0.2, narrative:"wave", vary:0.5, sync:0 },
  "Post-Rock": { bpm:90, drum:"halftime", pat:"arp", bass:"follow", pad:"warmpad", delay:"16", instr:"electric_guitar_clean", melInstr:"bell", humanise:0.15, narrative:"climb", vary:0.8, sync:0 },
  "Psychedelic": { bpm:110, drum:"rock", pat:"busy8", bass:"follow", pad:"organ", delay:"8d", instr:"electric_guitar_clean", melInstr:"sine", humanise:0.15, narrative:"wave", vary:0.7, sync:0 },
  "Surf Rock": { bpm:160, drum:"surf", pat:"busy8", bass:"follow", pad:"", delay:"8d", instr:"electric_guitar_clean", melInstr:"saw", humanise:0.05, narrative:"ostinato", vary:0.4, sync:0 },

  // ---- Metal & Heavy ----
  "Metal": { bpm:140, drum:"rock", pat:"rock8", bass:"eighths", bassVoice:"square", pad:"", instr:"distortion_guitar", melInstr:"square", humanise:0, narrative:"climb", vary:0.6, sync:1 },
  "Heavy Metal": { bpm:150, drum:"rock", pat:"rock8", bass:"eighths", bassVoice:"square", pad:"", instr:"distortion_guitar", melInstr:"square", humanise:0, narrative:"climb", vary:0.6, sync:1 },
  "Thrash Metal": { bpm:190, drum:"punk", pat:"rock8", bass:"eighths", bassVoice:"square", pad:"", instr:"distortion_guitar", melInstr:"square", humanise:0, narrative:"ostinato", vary:0.4, sync:1 },
  "Doom / Sludge": { bpm:65, drum:"halftime", pat:"drone", bass:"subhold", bassVoice:"square", pad:"", instr:"distortion_guitar", melInstr:"square", humanise:0.1, narrative:"lament", vary:0.4, sync:0 },
  "Power Metal": { bpm:165, drum:"driving", pat:"rock8", bass:"eighths", bassVoice:"saw", pad:"strings", instr:"distortion_guitar", melInstr:"supersaw", humanise:0, narrative:"peak", vary:0.9, sync:1 },
  "Prog Metal": { bpm:132, drum:"driving", pat:"busy8", bass:"eighths", bassVoice:"square", pad:"glass", instr:"distortion_guitar", melInstr:"square", humanise:0.05, narrative:"germ", vary:0.7, sync:1 },
  "Nu-Metal": { bpm:100, drum:"rock", pat:"funk", bass:"funk16", bassVoice:"square", pad:"", instr:"distortion_guitar", melInstr:"square", humanise:0.05, narrative:"ostinato", vary:0.5, sync:1 },

  // ---- Blues, Soul & Funk ----
  "Blues": { bpm:90, drum:"shuffle", pat:"shuffle", bass:"walk", bassVoice:"pluck", pad:"", instr:"electric_guitar_jazz", melInstr:"saw", humanise:0.2, narrative:"callResp", vary:0.6, sync:0 },
  "Rhythm & Blues": { bpm:95, drum:"rnb", pat:"shuffle", bass:"follow", pad:"brass", instr:"electric_piano_1", melInstr:"ep", humanise:0.2, narrative:"callResp", vary:0.6, sync:0 },
  "Soul": { bpm:92, drum:"motown", pat:"shuffle", bass:"follow", pad:"strings", instr:"electric_piano_1", melInstr:"ep", humanise:0.2, narrative:"period", vary:0.6, sync:0 },
  "Motown": { bpm:118, drum:"motown", pat:"quarters", bass:"follow", pad:"brass", instr:"electric_piano_1", melInstr:"ep", humanise:0.15, narrative:"callResp", vary:0.6, sync:0 },
  "Funk": { bpm:108, drum:"funk", pat:"funk", bass:"funk16", bassVoice:"square", pad:"brass", percKit:"hand", instr:"clavinet", melInstr:"clav", humanise:0.2, narrative:"motif", vary:0.6, sync:1 },
  "Disco": { template:"disco" },
  "Gospel": { bpm:96, drum:"motown", pat:"quarters", bass:"follow", pad:"voice", instr:"drawbar_organ", melInstr:"organ", humanise:0.15, narrative:"callResp", vary:0.7, sync:0 },
  "Neo-Soul": { bpm:84, drum:"rnb", pat:"charleston", bass:"walk", bassVoice:"pluck", pad:"warmpad", instr:"electric_piano_1", melInstr:"ep", humanise:0.2, narrative:"wave", vary:0.6, sync:0 },

  // ---- Jazz & Standards ----
  "Jazz": { bpm:120, drum:"shuffle", pat:"fourbar", bass:"walk", bassVoice:"pluck", pad:"brass", instr:"acoustic_grand_piano", melInstr:"ep", humanise:0.15, narrative:"qanda", vary:0.7, sync:0 },
  "Swing": { bpm:140, drum:"shuffle", pat:"fourbar", bass:"walk", bassVoice:"pluck", pad:"brass", instr:"acoustic_grand_piano", melInstr:"ep", humanise:0.1, narrative:"callResp", vary:0.7, sync:0 },
  "Bebop": { bpm:200, drum:"shuffle", pat:"charleston", bass:"walk", bassVoice:"pluck", pad:"", instr:"acoustic_grand_piano", melInstr:"saw", humanise:0.05, narrative:"cascade", vary:0.9, sync:0 },
  "Bossa Nova": { bpm:118, drum:"bossa", pat:"bossa", bass:"walk", bassVoice:"pluck", pad:"strings", instr:"acoustic_guitar_nylon", melInstr:"flute", humanise:0.15, narrative:"wave", vary:0.6, sync:0 },
  "Cool Jazz": { bpm:100, drum:"shuffle", pat:"arp", bass:"walk", bassVoice:"pluck", pad:"glass", instr:"acoustic_grand_piano", melInstr:"flute", humanise:0.15, narrative:"period", vary:0.6, sync:0 },
  "Ragtime": { bpm:108, drum:"shuffle", pat:"charleston", bass:"walk", bassVoice:"pluck", pad:"", instr:"honkytonk_piano", melInstr:"ep", humanise:0.1, narrative:"motif", vary:0.6, sync:0 },
  "Lounge": { bpm:96, drum:"shuffle", pat:"arp", bass:"walk", bassVoice:"pluck", pad:"strings", instr:"electric_piano_1", melInstr:"ep", humanise:0.15, narrative:"wave", vary:0.5, sync:0 },

  // ---- Folk, Country & Roots ----
  "Folk": { bpm:104, drum:"twostep", pat:"pop", bass:"walk", bassVoice:"pluck", pad:"", instr:"acoustic_guitar_steel", melInstr:"flute", humanise:0.2, narrative:"period", vary:0.5, sync:0 },
  "Country": { bpm:112, drum:"twostep", pat:"boomchick", bass:"walk", bassVoice:"pluck", pad:"", instr:"acoustic_guitar_steel", melInstr:"ep", humanise:0.15, narrative:"period", vary:0.5, sync:0 },
  "Bluegrass": { bpm:150, drum:"train", pat:"busy8", bass:"walk", bassVoice:"pluck", pad:"", instr:"banjo", melInstr:"pluck", humanise:0.15, narrative:"cascade", vary:0.7, sync:0 },
  "Americana": { bpm:108, drum:"twostep", pat:"boomchick", bass:"walk", bassVoice:"pluck", pad:"strings", instr:"acoustic_guitar_steel", melInstr:"ep", humanise:0.2, narrative:"period", vary:0.5, sync:0 },
  "Rockabilly": { bpm:150, drum:"train", pat:"busy8", bass:"walk", bassVoice:"pluck", pad:"", instr:"electric_guitar_clean", melInstr:"saw", humanise:0.15, narrative:"motif", vary:0.6, sync:0 },
  "Celtic": { bpm:120, drum:"march68", pat:"jig68", bass:"walk", bassVoice:"pluck", pad:"", instr:"acoustic_guitar_steel", melInstr:"whistle", humanise:0.15, narrative:"cascade", vary:0.6, sync:0 },
  "Singer-Songwriter": { bpm:96, drum:"ballad", pat:"arp", bass:"follow", pad:"", instr:"acoustic_guitar_steel", melInstr:"ep", humanise:0.2, narrative:"period", vary:0.5, sync:0 },

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
  "Ambient": { bpm:70, drum:"off", pat:"drone", bass:"", pad:"warmpad", delay:"16", swing:0, instr:"pad_1_new_age", melInstr:"glass", humanise:0.1, narrative:"suspend", vary:0.5, sync:0 },
  "Downtempo / Trip-Hop": { bpm:90, drum:"hiphop16", kit:"vinyl", pat:"charleston", bass:"walk", bassVoice:"sub", pad:"warmpad", delay:"16", swing:0.1, instr:"electric_piano_1", melInstr:"sine", humanise:0.15, narrative:"wave", vary:0.5, sync:0 },
  "IDM": { bpm:130, drum:"footwork", kit:"minimal", pat:"four16", bass:"eighths", bassVoice:"square", pad:"glass", delay:"16", swing:0, instr:"lead_2_sawtooth", melInstr:"bell", humanise:0, narrative:"gapfill", vary:0.8, sync:2 },
  "Lo-Fi / Chillhop": { bpm:80, drum:"boombap", kit:"vinyl", pat:"charleston", bass:"walk", bassVoice:"pluck", pad:"warmpad", delay:"8d", swing:0.15, instr:"electric_piano_1", melInstr:"ep", humanise:0.25, narrative:"wave", vary:0.4, sync:0 },
  "Hip-Hop": { bpm:90, drum:"boombap", kit:"mpc60", pat:"funk16", bass:"funk16", bassVoice:"sub", pad:"brass", instr:"electric_piano_1", melInstr:"bell", humanise:0.15, narrative:"ostinato", vary:0.5, sync:1 },
  "Trap": { template:"trap" },

  // ---- Latin ----
  "Latin": { bpm:100, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"brass", percKit:"latin", instr:"acoustic_guitar_nylon", melInstr:"brass", humanise:0.15, narrative:"motif", vary:0.6, sync:1 },
  "Salsa": { bpm:180, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"brass", percKit:"latin", instr:"acoustic_grand_piano", melInstr:"brass", humanise:0.1, narrative:"ostinato", vary:0.6, sync:1 },
  "Son Cubano": { bpm:100, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"", percKit:"latin", instr:"acoustic_guitar_nylon", melInstr:"pluck", humanise:0.15, narrative:"motif", vary:0.5, sync:1 },
  "Mambo": { bpm:190, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"brass", percKit:"latin", instr:"acoustic_grand_piano", melInstr:"brass", humanise:0.1, narrative:"peak", vary:0.8, sync:1 },
  "Cha-Cha-Chá": { bpm:128, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"brass", percKit:"latin", instr:"acoustic_grand_piano", melInstr:"pluck", humanise:0.1, narrative:"terraced", vary:0.6, sync:1 },
  "Rumba": { bpm:100, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"", percKit:"latin", instr:"acoustic_guitar_nylon", melInstr:"pluck", humanise:0.2, narrative:"callResp", vary:0.6, sync:1 },
  "Timba": { bpm:200, drum:"tresillo", pat:"funk16", bass:"funk16", bassVoice:"pluck", pad:"brass", percKit:"latin", instr:"acoustic_grand_piano", melInstr:"brass", humanise:0.1, narrative:"cascade", vary:0.8, sync:1 },
  "Latin Jazz": { bpm:140, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"brass", percKit:"latin", instr:"acoustic_grand_piano", melInstr:"ep", humanise:0.15, narrative:"qanda", vary:0.7, sync:1 },
  "Samba": { bpm:100, drum:"samba", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"", percKit:"latin", instr:"acoustic_guitar_nylon", melInstr:"flute", humanise:0.15, narrative:"cascade", vary:0.6, sync:1 },
  "Bossa Nova (Latin)": { bpm:116, drum:"bossa", pat:"bossa", bass:"walk", bassVoice:"pluck", pad:"strings", instr:"acoustic_guitar_nylon", melInstr:"flute", humanise:0.15, narrative:"wave", vary:0.6, sync:0 },
  "Bachata": { bpm:130, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"", percKit:"latin", instr:"acoustic_guitar_nylon", melInstr:"pluck", humanise:0.15, narrative:"period", vary:0.6, sync:1 },
  "Merengue": { bpm:150, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"brass", percKit:"latin", instr:"accordion", melInstr:"brass", humanise:0.1, narrative:"ostinato", vary:0.6, sync:1 },
  "Cumbia": { bpm:95, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"", percKit:"latin", instr:"accordion", melInstr:"pluck", humanise:0.2, narrative:"motif", vary:0.5, sync:1 },
  "Reggaetón": { template:"moombahton" },
  "Latin Pop": { bpm:100, drum:"tresillo", pat:"latin", bass:"follow", pad:"strings", percKit:"latin", instr:"acoustic_guitar_nylon", melInstr:"ep", humanise:0.15, narrative:"chordPhrases", vary:0.6, sync:1 },
  "Tango": { bpm:120, drum:"halftime", pat:"tresillo", bass:"walk", bassVoice:"pluck", pad:"", instr:"tango_accordion", melInstr:"saw", humanise:0.15, narrative:"suspend", vary:0.7, sync:1 },
  "Bolero": { bpm:84, drum:"ballad", pat:"arp", bass:"walk", bassVoice:"pluck", pad:"strings", instr:"acoustic_guitar_nylon", melInstr:"ep", humanise:0.2, narrative:"period", vary:0.5, sync:0 },
  "Mariachi": { bpm:120, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"brass", instr:"acoustic_guitar_nylon", melInstr:"brass", humanise:0.15, narrative:"motif", vary:0.6, sync:1 },
  "Norteño": { bpm:130, drum:"twostep", pat:"boomchick", bass:"walk", bassVoice:"pluck", pad:"", instr:"accordion", melInstr:"pluck", humanise:0.15, narrative:"motif", vary:0.5, sync:0 },
  "Forró": { bpm:130, drum:"samba", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"", percKit:"latin", instr:"accordion", melInstr:"pluck", humanise:0.15, narrative:"ostinato", vary:0.6, sync:1 },

  // ---- World & Modal ----
  "Flamenco": { bpm:130, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"", percKit:"latin", instr:"acoustic_guitar_nylon", melInstr:"pluck", humanise:0.2, narrative:"cascade", vary:0.7, sync:1 },
  "Reggae": { bpm:80, drum:"reggae", pat:"skank", bass:"offbeat", bassVoice:"sub", pad:"organ", percKit:"hand", instr:"electric_guitar_muted", melInstr:"organ", humanise:0.2, narrative:"ostinato", vary:0.5, sync:0 },
  "Ska": { bpm:150, drum:"ska", pat:"skank", bass:"walk", bassVoice:"pluck", pad:"brass", instr:"electric_guitar_clean", melInstr:"brass", humanise:0.1, narrative:"motif", vary:0.6, sync:0 },
  "Afrobeat": { bpm:110, drum:"funk", pat:"funk16", bass:"funk16", bassVoice:"pluck", pad:"brass", percKit:"latin", instr:"kalimba", melInstr:"organ", humanise:0.2, narrative:"ostinato", vary:0.6, sync:1 },
  "Middle Eastern": { bpm:100, drum:"tresillo", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"", percKit:"latin", instr:"sitar", melInstr:"pluck", humanise:0.2, narrative:"cascade", vary:0.6, sync:1 },
  "Klezmer": { bpm:130, drum:"march", pat:"busy8", bass:"walk", bassVoice:"pluck", pad:"", instr:"accordion", melInstr:"saw", humanise:0.15, narrative:"motif", vary:0.7, sync:0 },
  "Bollywood": { bpm:110, drum:"funk", pat:"latin", bass:"walk", bassVoice:"pluck", pad:"strings", percKit:"latin", instr:"sitar", melInstr:"flute", humanise:0.15, narrative:"terraced", vary:0.7, sync:1 },

  // ---- Cinematic & Classical ----
  "Cinematic / Film": { bpm:90, drum:"off", pat:"drone", bass:"follow", pad:"strings", delay:"16", swing:0, instr:"string_ensemble_1", melInstr:"strings", humanise:0.1, narrative:"archSong", vary:0.7, sync:0 },
  "Epic / Trailer": { bpm:100, drum:"anthem", pat:"stomp", bass:"follow", pad:"brass", delay:"off", swing:0, instr:"brass_section", melInstr:"brass", humanise:0.05, narrative:"peak", vary:0.9, sync:0 },
  "Horror / Tension": { bpm:70, drum:"off", pat:"drone", bass:"follow", pad:"voice", delay:"16", swing:0, instr:"tremolo_strings", melInstr:"sine", humanise:0.1, narrative:"suspend", vary:0.5, sync:0 },
  "Classical": { bpm:92, drum:"off", pat:"arp", bass:"follow", pad:"strings", swing:0, instr:"acoustic_grand_piano", melInstr:"strings", humanise:0.1, narrative:"period", vary:0.6, sync:0 },
  "Baroque": { bpm:100, drum:"off", pat:"fourbar", bass:"follow", pad:"strings", swing:0, instr:"harpsichord", melInstr:"strings", humanise:0.05, narrative:"cascade", vary:0.6, sync:0 },
  "Dreamscore": { bpm:80, drum:"off", pat:"drone", bass:"follow", pad:"glass", delay:"16", swing:0, instr:"celesta", melInstr:"glass", humanise:0.1, narrative:"wave", vary:0.6, sync:0 },
};
// A neutral fallback for "Any genre" + a chosen emotion — a plain acoustic bed the emotion's own
// narrative and tempo/feel nudges can act on without any dance-floor or genre colouring at all.
const GENRE_STYLE_DEFAULT = { bpm:100, drum:"pop", pat:"pop", bass:"follow", pad:"strings", instr:"acoustic_guitar_steel", melInstr:"ep", humanise:0.15, narrative:"chordPhrases", vary:0.6, sync:0 };

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
   in a single pick. `danceTemplates` is the app's own DANCE_TEMPLATES array (passed in rather than
   imported, so this module stays pure data plus pure functions, importable the same way
   progressions.js is); `templateIdx` on the result is the index into it a caller needs to run the
   template's own arrangement plan through `applyArrangement`, or -1 when the style has none. */
function resolveGenreEmotionStyle(genre, emotion, danceTemplates) {
  const g = GENRE_STYLE[genre] || GENRE_STYLE_DEFAULT;
  let base, templateIdx = -1, plan = null;
  if (g.template) {
    templateIdx = danceTemplates.findIndex(t => t.id === g.template);
    const tpl = templateIdx >= 0 ? danceTemplates[templateIdx] : null;
    base = tpl ? { ...tpl } : GENRE_STYLE_DEFAULT;
    plan = tpl ? tpl.plan : null;
  } else {
    base = g;
  }
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
    trackFx: base.trackFx,
    narrative: em ? em.narrative : base.narrative,
    vary: em ? em.vary : (base.vary != null ? base.vary : 1),
    sync: em ? em.sync : (base.sync || 0),
    within: em ? !!em.within : false,
    chordDelta: em ? em.chordDelta : 0,
    templateIdx, plan,
  };
}

export { GENRE_STYLE, GENRE_STYLE_DEFAULT, EMOTION_STYLE, resolveGenreEmotionStyle };
