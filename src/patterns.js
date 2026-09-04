/* patterns — Strum patterns, drum patterns, kits and pump depths, plus the grid-resolution helpers
   (subOf / beatsOf / sampleAt) that let patterns of different subdivisions share one bar.
*/
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
// 16ths (sub = 4). Everything above divides the beat in two; these divide it in four, which is
// where dance rhythm actually lives — the offbeat stab, the skipping garage accent, the 16th
// funk scratch. Meter still reads pattern.length / sub, so these are all 4/4.
["stab16","Offbeat 16th stabs","--D---D---D---D-","house piano stabs — land off the beat and keep them short",0,4],
["house16","House chord pump",">---D---D---D---","a chord on each beat after the first — leaves the downbeat to the kick",0,4],
["garage16","Garage skip",">--D--D-->-D--D-","the skipping 2-step accent, pulling against the four",0,4],
["four16","Constant sixteenths","DUDUDUDUDUDUDUDU","the engine of garage and funk — accents live in the wrist",0,4],
["funk16","16th funk scratch","D-UD-UD-D-UD-UD-","ghost the rests with muted scratches — the groove is what you don't voice",0,4],
["disco16","Disco chug",">-U->-U->-U->-U-","clipped upstrokes pushing every offbeat — nu-disco guitar",0,4],
["shuffle16","Swung 16ths","D-UD-UD-D-UD-UD-","16ths with a shuffle — UK garage and 2-step swing",1,4],
["trap16","Trap sparse",">-------D-------","two chords a bar, everything else left to the drums",0,4],
// 6/8 — six eighth-note steps, felt in two dotted beats rather than three plain ones
["ballad68","6/8 ballad",">-U-DU","the slow-dance lilt: one big beat, one answering",0,2,"6/8"],
["rock68","6/8 rock",">DU>DU","two firm dotted beats — Irish rock and power ballads",0,2,"6/8"],
["jig","6/8 jig",">UDDUD","the jig's tumble, all quavers, accent on each dotted beat",0,2,"6/8"],
["blues68","6/8 blues",">-D>UD","slow blues in twelve-eight, felt in two",1,2,"6/8"],
// 5/4 — ten eighth-note steps, grouped 3+2 unless the pattern says otherwise
["five32","5/4 · 3+2",">-D-D>-DU-","the Take Five grouping: three then two, the limp that makes it swing"],
["five23","5/4 · 2+3",">-D->-D-DU","two then three — settles differently, lands harder on the second group"],
["fiveflow","5/4 flowing",">-DU-D-UDU","even quavers across the bar, no grouping insisted on"],
["fivepick","5/4 fingerpick",">-U-DU-U-D","picked rather than strummed — prog and folk both live here"],
].forEach(([id, name, pat, desc, swing, sub, meter]) =>
  PATTERNS[id] = { name, pattern: pat.split(""), desc, swing: !!swing, sub: sub || 2,
    // a pattern's meter is its bar length unless it says otherwise; 6/8 and 3/4 are the same
    // number of quarter-note beats and only the counting differs, so that one has to be declared
    meter: meter || null });

// Columns per beat for a rhythm pattern: 2 = eighths, 4 = sixteenths. Everything downstream —
// the scheduler tick, the melody grid, note values in the score, MIDI ticks — reads the meter
// from these two numbers rather than assuming an eighth-note grid.
const subOf = p => (p && p.sub) || 2;
const beatsOf = p => p.pattern.length / subOf(p);

// A bar is divided into as many ticks as the finest pattern in play needs, and every pattern is
// sampled onto that grid: a pattern of length P fires at tick i only when i·P lands exactly on a
// step. So an eighth-note strum and a sixteenth-note drum pattern coexist — the strum plays every
// other tick, the hats every one — without either being truncated or stretched.
const gcd = (a, b) => b ? gcd(b, a % b) : a;
const lcm = (a, b) => a / gcd(a, b) * b;
// index into a length-P pattern at tick i of a `ticks`-tick bar, or null if it falls between steps
const stepAt = (len, i, ticks) => {
  const n = i * len;
  return n % ticks === 0 ? n / ticks : null;
};
const sampleAt = (pat, i, ticks) => {
  if (!pat || !pat.length) return null;
  const s = stepAt(pat.length, i, ticks);
  return s == null ? null : pat[s];
};
// Positional accent, 0..1. Nothing in the app had velocity before: every drum hit and every melody
// note landed at the same level, which is most of why a groove could feel typed. Real playing leans
// on the pulse — the downbeat hardest, then the beat, then the offbeat, then the subdivisions.
const accentAt = (i, ticksPerBeat) => {
  if (i === 0) return 1;
  if (ticksPerBeat <= 1) return 0.9;
  if (i % ticksPerBeat === 0) return 0.94;                              // on a beat
  if (i % (ticksPerBeat / 2) === 0) return 0.82;                        // on an eighth
  return 0.68;                                                          // a finer subdivision
};
// a drum pattern carries no `sub`, so read its meter from its length: 6 steps is three beats
// (3/4 and 6/8), 8 and 16 are both four
/* A drum pattern's meter, from its step count. Steps are eighths or sixteenths, so the length tells
   you the bar: 6 or 12 is three beats, 10 or 20 is five, everything else is four. This used to be
   `length === 6 ? 3 : 4`, which read a 5/4 pattern as 4/4 and dropped it from the menu. */
const DRUM_BEATS = { 6: 3, 12: 3, 10: 5, 20: 5 };
const drumBeatsOf = pat => (pat && DRUM_BEATS[pat.length]) || 4;

/* The time signatures the app can actually play, in the order they belong in a menu. `beats` is
   quarter-note beats per bar, which is what the scheduler and every pattern length are measured in;
   `num`/`den` are what a DAW should be told, so 6/8 comes out as 6/8 rather than as 3/4 with the
   accents in the wrong place. */
const METERS = [
  { id:"4/4", name:"4/4", beats:4, num:4, den:4 },
  { id:"3/4", name:"3/4 waltz",  beats:3, num:3, den:4 },
  { id:"6/8", name:"6/8",        beats:3, num:6, den:8 },
  { id:"5/4", name:"5/4",        beats:5, num:5, den:4 },
];
const METER_BY_ID = Object.fromEntries(METERS.map(m => [m.id, m]));
// which meter a strum pattern belongs to: what it declares, else its bar length
const meterOf = p => p.meter || (beatsOf(p) === 3 ? "3/4" : beatsOf(p) === 5 ? "5/4" : "4/4");
// a drum pattern fits a meter if the bars are the same length — 3/4 and 6/8 share their kits
const drumFitsMeter = (d, mid) => !!d && !!d.pattern && drumBeatsOf(d.pattern) === (METER_BY_ID[mid] || METERS[0]).beats;

const PATTERN_DEFAULT = { axis:"pop", axisMinor:"drive", three:"rock8", blues:"shuffle",
  doowop:"sway12", jazz:"fourbar", mixo:"push", andalusian:"latin", pachelbel:"arp",
  dorian:"latin", lydian:"arp", phrygian:"drive", aeolian:"pop",
  flamenco:"latin", edm:"house16", deepHouse:"stab16", festival:"house16", futureBass:"trap16",
  montuno:"tresillo", rhythm:"charleston", bossa:"bossa", guajira:"tresillo", bolero:"arp",
  gospel:"sway12", neoSoul:"funk",
  rockRiff:"rock8", grunge:"drive", britpop:"pop", emo:"rock8", country:"boomchick",
  celtic:"busy8", motownTurn:"boomchick", rnbSlow:"funk" };
const BPM_DEFAULT = { axis:96, axisMinor:84, three:140, blues:92, doowop:66, jazz:120,
  mixo:112, andalusian:104, pachelbel:72,
  dorian:100, lydian:84, phrygian:128, aeolian:92,
  flamenco:120, edm:128, deepHouse:122, festival:138, futureBass:150,
  montuno:96, rhythm:160, bossa:132, guajira:100, bolero:76, gospel:76, neoSoul:88,
  rockRiff:128, grunge:120, britpop:116, emo:144, country:108, celtic:116, motownTurn:128, rnbSlow:76 };

/* ===== bass patterns =====
   The bassline used to be the chord voice's lowest note, glued to the strum: it could not have a
   rhythm of its own, and it vanished whenever a section dropped its chords. These are the track's
   own bars. Tokens are degrees of the current chord — R the root, F the fifth, O the root an
   octave up — over sixteen steps of 4/4, and a note holds until the next hit, so a lone R is a
   held sub. "follow" has no pattern: it plays the root under the strum pattern's hits, which is
   exactly the note the chords used to carry, made separable. */
const BASS = {};
[
["follow", "With the chords", "", "the root under every chord hit — the note the chords used to carry, on its own track"],
["eighths", "Root eighths", "R-R-R-R-R-R-R-R-", "the driving pulse — techno, prog house and pop-punk alike"],
["octaves", "Octave bounce", "R-O-R-O-R-O-R-O-", "low-high alternation — the classic house and italo line"],
["offbeat", "Offbeat push", "--R---R---R---R-", "the bass answers the kick instead of doubling it — instant house"],
["rolloff", "Rolling offbeats", "-RRR-RRR-RRR-RRR", "every sixteenth the kick doesn't own — the trance engine"],
["disco", "Disco walk", "R-O-R-O-R-O-F-O-", "the octave bounce with the fifth walking it round — disco and nu-disco"],
["funk16", "Funk syncopation", "R--R--O--R-F--R-", "pushed and skipped sixteenths — the holes are the funk"],
["subhold", "Held sub", "R---------------", "one long note a bar — trap, dubstep and every half-time drop"],
["walk", "Root–fifth walk", "R---F---O---F---", "sturdy alternation under any chord — reaches from country to hardstyle"],
["acidline", "Acid 303 line", "R-Ro-R-rf-o-RR-r", "a near-constant, syncopated 16th-note run that barely leaves the root, sliding into a few of its own notes — pair it with the Acid 303 bass voice for the squelch"],
].forEach(([id, name, pat, desc]) =>
  BASS[id] = { name, pattern: pat ? pat.split("") : null, desc });
// token → semitones above the chord root, in the octave below the chord voicing. Lowercase is the
// same three degrees, but marks the step as a *slide*: the note glides in from whatever the bass
// was last playing instead of re-attacking, the TB-303 "slide" step next to its "normal" one.
const BASS_IV = { R: 0, F: 7, O: 12, r: 0, f: 7, o: 12 };
const isSlideTok = tok => tok === "r" || tok === "f" || tok === "o";

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
// 4/4 dance — written for the machine kits: O = open hat, C = clap, P = rim, R = ride,
// X = crash, B = 808 sub-boom. The offbeat open hat is the engine of house; the clap
// (not a snare) on 2 and 4 is what stops four-on-the-floor sounding like disco-rock.
["house909","House (909)","K O KC O K O KC O"],
["deep","Deep house","KH O KCH O KH O KCH OP"],
["techhouse","Tech house","KH OP KCH H KH OP KCH O"],
["techno","Techno","KH H KH H KH H KH O"],
["trance","Trance","KH O KCH O KH O KCH O"],
["bigroom","Big room","KHX O KCH O KH O KCH O"],
["garage","UK garage 2-step","KH H CH KH H C H SH"],
["disco909","Nu-disco","KH O KCH O KH O KCH OP"],
["trap","Trap","BH H H CH H BH CH H"],
["dubstep","Dubstep half-time","KH H H H CH H P H"],
["electro","Electro house","KH H KCH H KH KH CH H"],
/* Subtractions. Not grooves in their own right — these are what a section plays when something
   has been taken away, which is the move dance arrangement is actually made of: the drop lands
   because the breakdown lost the kick, and the build works because the kick is withheld until the
   last bar. Written against the house/techno patterns above so they sit under the same phrase. */
["nokick","Tops only · no kick",". O C O . O C O"],
["kickonly","Kick only","K . K . K . K ."],
["ohats","Offbeat hats only",". O . O . O . O"],
// 4/4 at sixteenths — sixteen steps. This is the resolution the rolling hats, the skipping
// garage kick and a real breakbeat need; at eighths they can only be approximated.
["house16d","House · 16th hats","K H H H KC H H H K H H H KC H H O"],
["techno16","Techno · driving 16ths","KH H H H KH H H H KH H H H KH H H OH"],
["garage16d","UK garage 2-step","KH H H H CH H H H H H KH H CH H H H"],
["dnb","Drum & bass","KH H H H SH H H H H H KH H SH H H H"],
["amen","Amen break","KH H KH H SH H H SH H H KH H SH H SH H"],
["breaks16","Big beat breaks","KH H H H SH H KH H KH H H H SH H KH H"],
["trap16d","Trap · rolling hats","BH H H H H H H H CH H BH H H H H H"],
["dubstep16","Dubstep","KH H H H H H H H CH H H H H H KH H"],
["hiphop16","Hip-hop 16ths","KH H H H SH H KH H H KH H H SH H H H"],
["footwork","Footwork","K H K H CH H K H K H K H CH H K H"],
// 5/4 — ten eighth-note steps
["five54","5/4 straight","KH H SH H KH H H SH H H"],
["fivejazz","5/4 jazz ride","KR R SR R KR R R SR R R"],
["fiverock","5/4 rock","KH KH SH H KH H KH SH H H"],
["fivefloor","5/4 four-plus","K H KS H K H K H KS H"],
].forEach(([id, name, pat]) =>
  DRUMS[id] = { name, pattern: pat ? pat.split(" ").map(s => s === "." ? "" : s) : null });
/* The subtraction patterns above, as a set: arrangement, not material. A build's kick-out or a
   DJ intro's bare kick is part of a song's *layout*, so "write the sketch's drums across the
   song" keeps these while every full groove hands back to the sketch. */
const DRUM_CUTS = new Set(["nokick", "kickonly", "ohats"]);

/* ===== the percussion layer's own instruments =====
   The perc track used to borrow the drum kit's voices, which made it a second drum pattern rather
   than percussion. These are the hand-percussion instruments — their own channel letters, their
   own catalogue, their own synthesis (see percSound) and their own GM notes on export. Letters
   overlap the kit's on purpose-free separate tables: a perc pattern is never played by the kit
   or vice versa, except legacy drum ids kept sounding as saved. */
const PERC_VOICES = [
  ["T", "Triangle",   "a long silver ring over everything — one a bar is plenty", "#7FB4D8"],
  ["M", "Tambourine", "the jangle on the offbeats — gospel choruses and disco alike", "#7FB4D8"],
  ["S", "Shaker",     "the sixteenth engine — the groove's hi-hat that never was", "#7FB4D8"],
  ["L", "Cowbell",    "the fearless quarter-note — more is famously an option", "#E0B85A"],
  ["W", "Woodblock",  "the clave's voice — dry, high and instantly Latin", "#E0B85A"],
  ["B", "Bongo",      "the high pop that answers the congas", "#E8794F"],
  ["C", "Conga slap", "the sharp open tone that carries the tumbao", "#E8794F"],
  ["G", "Conga low",  "the deep open tone — the floor of the hand-drum pair", "#E8794F"],
];
const PERC_ORDER = PERC_VOICES.map(([ch]) => ch);
// letter → GM percussion note for the exported channel-10 Percussion track
const PERC_MIDI = { S:70, M:54, T:81, W:76, L:56, C:63, G:64, B:60 };
// how the eight instruments are voiced — ten characters from a live room to a distortion pedal
// (see PERC_KIT_SPECS / percSound)
const PERC_KITS = [["hand", "Hand percussion"], ["machine", "Machine perc (808-ish)"],
  ["electro", "Electro perc (bright & tight)"], ["lofi", "Lo-fi perc (muffled & dusty)"],
  ["latin", "Latin perc (warm & resonant)"], ["trap", "Trap perc (tight & punchy)"],
  ["industrial", "Industrial perc (noisy & metallic)"], ["jungle", "Jungle perc (bright & fast)"],
  ["dub", "Dub perc (soft & brushed)"], ["bright", "Bright perc (shimmering overtones)"]];
const PERCS = {};
[
["shaker16", "Shaker sixteenths", "S S S S S S S S S S S S S S S S"],
["shaker8", "Shaker eighths", "S . S . S . S . S . S . S . S ."],
["tamb", "Tambourine offbeats", ". . M . . . M . . . M . . . M ."],
["tamb8", "Tambourine eighths", "M . M . M . M . M . M . M . M ."],
["clave32", "Son clave 3–2", "W . . W . . W . . . W . W . . ."],
["clave23", "Son clave 2–3", ". . W . W . . . W . . W . . W ."],
["tumbao", "Conga tumbao", ". . C . . . C G . . C . G G . ."],
["bongos", "Bongo ride", "B . B B . B B . B . B B . B B ."],
["congaride", "Conga & shaker", "S . C S S . C S S . G S S C C S"],
["cowbell", "Cowbell quarters", "L . . . L . . . L . . . L . . ."],
["triangle", "Triangle on the twos", ". . . . T . . . . . . . T . . ."],
["fiesta", "Full fiesta", "S . SW S SM . S C S . SW S GM . S C"],
].forEach(([id, name, pat]) =>
  PERCS[id] = { name, pattern: pat.split(" ").map(s => s === "." ? "" : s) });

// Kit voicings for the drum channels above — sixteen characters spanning six decades of drum
// machines and studio kits (see DRUM_KIT_SPECS / drumSound).
const DRUM_KITS = [["acoustic","Acoustic kit"], ["909","TR-909 · house & techno"], ["808","TR-808 · trap & hip-hop"],
  ["707","TR-707 · 80s pop & Latin house"], ["606","TR-606 · analog punk & early techno"], ["linn","LinnDrum · 80s gated pop"],
  ["cr78","CR-78 · soft early box"], ["dmx","DMX · boom-bap"], ["sp1200","SP-1200 · gritty sample crunch"],
  ["mpc60","MPC60 · warm 90s hip-hop"], ["hardtechno","Hard techno · distorted & aggressive"],
  ["gabber","Gabber · extreme hardcore"], ["dubstep","Dubstep · heavy sub & metal snare"],
  ["jungle","Jungle · bright breakbeat"], ["minimal","Minimal · dry & clicky"], ["vinyl","Vinyl · dusty & soft"]];
// How hard the kick ducks everything pitched. "classic" is the familiar house pump.
const PUMPS = [["off","No pump"], ["subtle","Subtle"], ["classic","Classic pump"], ["hard","Hard pump"]];
const PUMP_AMT = { off:0, subtle:0.3, classic:0.6, hard:0.85 };
// Channel letter → General MIDI percussion note, for the exported channel-10 drum track.
const DRUM_MIDI = { K:36, B:35, S:38, H:42, O:46, C:39, P:37, R:51, X:49 };
/* ===== the drum grid =====
   A drum pattern was already a grid — `["KH","H","SH","H"]` is one string per step, one letter per
   piece — it just had no editor. These are the rows one gets, ordered the way a drum editor is:
   metal at the top, the kick at the bottom.

   Everything here works on the same array-of-step-strings the catalogue uses, which is the whole
   point: playback, the MIDI writer and the stem bounce already consume that shape, so an edited
   pattern needs no path of its own anywhere downstream. Two pieces at one step is `"KH"` — so
   layering is string concatenation, and the format has always supported it. */
// [letter, name, what it is for, ink] — three inks, because a drum grid reads as three parts:
// metal on top, the backbeat in the middle, the floor underneath
const DRUM_VOICES = [
  ["X", "Crash",    "the section change — loud, and once", "#7FB4D8"],
  ["R", "Ride",     "a wash to carry a chorus where a hat would tick", "#7FB4D8"],
  ["O", "Open hat", "the offbeat that makes house sound like house", "#7FB4D8"],
  ["H", "Hat",      "the tick the groove is measured in", "#7FB4D8"],
  ["C", "Clap",     "the backbeat, layered over or instead of the snare", "#E0B85A"],
  ["P", "Rim",      "a quiet backbeat — verses, half-time, anything that should not shout", "#E0B85A"],
  ["S", "Snare",    "the backbeat", "#E0B85A"],
  ["B", "Boom",     "the 808 sub, long and tuned — under the kick or instead of it", "#E8794F"],
  ["K", "Kick",     "the floor", "#E8794F"],
];
const DRUM_ORDER = DRUM_VOICES.map(([ch]) => ch);
// steps in an edited bar: sixteenths, whatever the meter. 16 in 4/4, 12 in 3/4 and 6/8, 20 in 5/4 —
// which is exactly what `drumBeatsOf` reads back, so an edited bar is a pattern like any other
const beatSteps = beats => beats * 4;
const blankBeat = n => Array.from({ length: n }, () => "");
// a step's pieces, always in row order, so two identical bars are identical strings. The order
// defaults to the kit's; the perc grid passes its own, or its letters would be filtered away.
const beatSort = (s, order = DRUM_ORDER) => order.filter(ch => s.includes(ch)).join("");
const beatToggle = (bar, step, ch, order) => bar.map((s, i) =>
  i === step ? beatSort(s.includes(ch) ? s.split("").filter(c => c !== ch).join("") : s + ch, order) : s);
const beatHits = bars => (bars || []).reduce((n, b) => n + b.reduce((m, s) => m + s.length, 0), 0);
/* A catalogue pattern laid onto an n-step bar, so opening the grid shows what is already playing
   rather than an empty one. `sampleAt` is the same resampler playback uses, so an eighth-note
   pattern lands on every other step exactly as it sounds. */
const beatFrom = (pat, n, order) => Array.from({ length: n }, (_, i) => beatSort(sampleAt(pat, i, n) || "", order));
// GM percussion-set program numbers (0-indexed) so an exported file opens with a kit that
// matches what you heard. GM has no 909, so it borrows the Electronic set.
const KIT_PROGRAM = { "909":24, "808":25 };
/* ===== musical-style presets =====
   One row per style: the pattern each track starts from when the style is chosen. The Sketch
   tab uses these two ways — the optional overall-style menu applies a whole row at once, and
   each track's own "starts from" menu offers its column as style-named presets. An empty id
   means the style plays without that track. */
const STYLE_PRESETS = [
  ["house",     "House",        { drums:"house909",  bass:"offbeat", perc:"shaker16",  pad:"glass" }],
  ["deephouse", "Deep house",   { drums:"deep",      bass:"octaves", perc:"congaride", pad:"strings" }],
  ["techhouse", "Tech house",   { drums:"techhouse", bass:"eighths", perc:"cowbell",   pad:"glass" }],
  ["techno",    "Techno",       { drums:"techno16",  bass:"rolloff", perc:"",          pad:"supersaw" }],
  ["trance",    "Trance",       { drums:"trance",    bass:"rolloff", perc:"tamb",      pad:"supersaw" }],
  ["bigroom",   "Big room",     { drums:"bigroom",   bass:"offbeat", perc:"",          pad:"supersaw" }],
  ["nudisco",   "Nu-disco",     { drums:"disco909",  bass:"disco",   perc:"tamb",      pad:"strings" }],
  ["garage",    "UK garage",    { drums:"garage16d", bass:"funk16",  perc:"shaker8",   pad:"voice" }],
  ["dnb",       "Drum & bass",  { drums:"dnb",       bass:"subhold", perc:"",          pad:"strings" }],
  ["dubstep",   "Dubstep",      { drums:"dubstep16", bass:"subhold", perc:"",          pad:"voice" }],
  ["trap",      "Trap",         { drums:"trap16d",   bass:"subhold", perc:"",          pad:"glass" }],
  ["hiphop",    "Hip-hop",      { drums:"hiphop16",  bass:"funk16",  perc:"bongos",    pad:"organ" }],
  ["latin",     "Latin house",  { drums:"house909",  bass:"octaves", perc:"tumbao",    pad:"organ" }],
  ["funk",      "Funk",         { drums:"funk",      bass:"funk16",  perc:"bongos",    pad:"organ" }],
];
// The dance progressions come up already grooving — pick Deep House and press play.
// Everything else keeps the acoustic kit and no pump, exactly as before.
const DRUM_DEFAULT = { edm:"house16d", deepHouse:"house16d", festival:"techno16", futureBass:"trap16d" };
const KIT_DEFAULT = { edm:"909", deepHouse:"909", festival:"909", futureBass:"808" };
const PUMP_DEFAULT = { edm:"classic", deepHouse:"classic", festival:"hard", futureBass:"classic" };

export { BASS, BASS_IV, isSlideTok, PERCS, STYLE_PRESETS, PERC_VOICES, PERC_ORDER, PERC_MIDI, PERC_KITS, BPM_DEFAULT, DRUMS, DRUM_CUTS, METERS, METER_BY_ID, drumFitsMeter, meterOf, DRUM_DEFAULT, DRUM_KITS, DRUM_MIDI, DRUM_VOICES, DRUM_ORDER, beatSteps, blankBeat, beatSort, beatToggle, beatHits, beatFrom, KIT_DEFAULT, KIT_PROGRAM, PATTERNS, PATTERN_DEFAULT, PUMPS, PUMP_AMT, PUMP_DEFAULT, accentAt, beatsOf, drumBeatsOf, gcd, lcm, sampleAt, stepAt, subOf };
