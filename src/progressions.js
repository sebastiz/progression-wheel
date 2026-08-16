/* progressions — The progression catalogue, the genre and emotion index, and the song-structure plans.
   Pure data plus the small helpers that resolve it.
*/
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
["edm","The EDM anthem","major","vi IV I V",
 ["Wake Me Up — Avicii","This Is What You Came For — Calvin Harris ft. Rihanna","Something Just Like This — The Chainsmokers & Coldplay","The Nights — Avicii","Hey Brother — Avicii","Don't You Worry Child — Swedish House Mafia","Wide Awake — Katy Perry","Clarity — Zedd","Waiting for Love — Avicii","We Found Love — Rihanna ft. Calvin Harris"]],
["deepHouse","Deep-house groove","minor","i iv bVII bIII",
 ["Insomnia — Faithless","You Don't Know Me — Jax Jones ft. RAYE","Cola — CamelPhat & Elderbrook","Need U (100%) — Duke Dumont","Finally — Kings of Tomorrow","Gypsy Woman — Crystal Waters","Your Love — Frankie Knuckles","Promised Land — Joe Smooth","Rather Be — Clean Bandit","Move Your Body — Marshall Jefferson"]],
["festival","The festival lift","minor","i bVII bVI bVII",
 ["Adagio for Strings — Tiësto","For an Angel — Paul van Dyk","Children — Robert Miles","Silence — Delerium ft. Sarah McLachlan","Strobe — deadmau5","Save the World — Swedish House Mafia","Reload — Sebastian Ingrosso & Tommy Trash","Concrete Angel — Gareth Emery","Greyhound — Swedish House Mafia","In and Out of Love — Armin van Buuren"]],
["futureBass","Future-bass swell","major","IV V iii vi",
 ["Never Be Like You — Flume","Roses — The Chainsmokers","Stay — Zedd & Alessia Cara","Let Me Love You — DJ Snake ft. Justin Bieber","Alone — Marshmello","It Ain't Me — Kygo & Selena Gomez","Firestone — Kygo","Cold Water — Major Lazer","Don't Let Me Down — The Chainsmokers","Middle — DJ Snake"]],
["montuno","Latin montuno","minor","i iv V",
 ["El Cuarto de Tula — Buena Vista Social Club","Quimbara — Celia Cruz","Pedro Navaja — Rubén Blades","El Cantante — Héctor Lavoe","Llorarás — Oscar D'León","Vivir Mi Vida — Marc Anthony","La Vida Es un Carnaval — Celia Cruz","Aguanile — Héctor Lavoe","Idilio — Willie Colón","Oye Como Va — Tito Puente"]],
["rhythm","Rhythm changes","major","I VI7 ii V7",
 ["I Got Rhythm — George Gershwin","Oleo — Sonny Rollins","Anthropology — Charlie Parker","Cotton Tail — Duke Ellington","Rhythm-a-ning — Thelonious Monk","Salt Peanuts — Dizzy Gillespie","Moose the Mooche — Charlie Parker","Dexterity — Charlie Parker","The Flintstones — Hoyt Curtin","Shaw 'Nuff — Gillespie & Parker"]],
["bossa","Bossa nova turnaround","major","I II7 ii V7",
 ["The Girl from Ipanema — Antônio Carlos Jobim","Corcovado (Quiet Nights) — Jobim","Desafinado — Jobim","Wave — Jobim","Summer Samba (So Nice) — Marcos Valle","Mas Que Nada — Jorge Ben","One Note Samba — Jobim","Águas de Março — Jobim","Meditation — Jobim","Blame It on the Bossa Nova — Eydie Gormé"]],
["guajira","Son guajira","major","I IV V IV",
 ["Guantanamera — Joseíto Fernández","Chan Chan — Buena Vista Social Club","El Manisero (The Peanut Vendor) — Moisés Simons","Son de la Loma — Trío Matamoros","Lágrimas Negras — Bebo & Cigala","Bilongo (La Negra Tomasa) — Guillermo Rodríguez","Guajira Guantanamera — traditional","El Carretero — Guillermo Portabales","Candela — Buena Vista Social Club","Herencia Africana — traditional"]],
["bolero","Bolero cadence","minor","i bVI iv V",
 ["Bésame Mucho — Consuelo Velázquez","Sabor a Mí — Álvaro Carrillo","Contigo en la Distancia — César Portillo de la Luz","Historia de un Amor — Carlos Eleta Almarán","Perfidia — Alberto Domínguez","Quizás, Quizás, Quizás — Osvaldo Farrés","El Reloj — Roberto Cantoral","Dos Gardenias — Isolina Carrillo","Solamente una Vez — Agustín Lara","La Barca — Roberto Cantoral"]],
["gospel","Gospel turnaround","major","vi ii V I",
 ["Oh Happy Day — Edwin Hawkins Singers","Ain't No Mountain High Enough — Marvin Gaye & Tammi Terrell","I Say a Little Prayer — Aretha Franklin","Lean on Me — Bill Withers","Isn't She Lovely — Stevie Wonder","Signed, Sealed, Delivered — Stevie Wonder","Higher Ground — Stevie Wonder","Never Too Much — Luther Vandross","Ain't Nobody — Chaka Khan","Golden — Jill Scott"]],
["neoSoul","Neo-soul descent","major","IV iii ii I",
 ["Doo Wop (That Thing) — Lauryn Hill","Brown Sugar — D'Angelo","Untitled (How Does It Feel) — D'Angelo","Cranes in the Sky — Solange","Come Away with Me — Norah Jones","Put Your Records On — Corinne Bailey Rae","Best Part — Daniel Caesar & H.E.R.","The Light — Common","Electric Lady — Janelle Monáe","Sunday Morning — Maroon 5"]],
["rockRiff","Riff rock","minor","i bIII IV",
 ["Whole Lotta Love — Led Zeppelin","Sunshine of Your Love — Cream","You Really Got Me — The Kinks","Smoke on the Water — Deep Purple","Black Dog — Led Zeppelin","Barracuda — Heart","Iron Man — Black Sabbath","Should I Stay or Should I Go — The Clash","Cocaine — Eric Clapton","Rebel Rebel — David Bowie"]],
["grunge","Grunge chromatic","major","I bIII bVI bVII",
 ["Smells Like Teen Spirit — Nirvana","Come as You Are — Nirvana","Black Hole Sun — Soundgarden","Man in the Box — Alice in Chains","Even Flow — Pearl Jam","Plush — Stone Temple Pilots","Would? — Alice in Chains","Bullet with Butterfly Wings — The Smashing Pumpkins","Zombie — The Cranberries","No Rain — Blind Melon"]],
["britpop","Britpop climb","major","I iii IV V",
 ["Wonderwall — Oasis","Don't Look Back in Anger — Oasis","Bitter Sweet Symphony — The Verve","Common People — Pulp","Live Forever — Oasis","The Universal — Blur","She's Electric — Oasis","Disco 2000 — Pulp","There She Goes — The La's","Sit Down — James"]],
["emo","Emo lift","major","IV I V vi",
 ["The Middle — Jimmy Eat World","Sugar, We're Goin Down — Fall Out Boy","Welcome to the Black Parade — My Chemical Romance","The Only Exception — Paramore","Dear Maria, Count Me In — All Time Low","Ohio Is for Lovers — Hawthorne Heights","Miserable at Best — Mayday Parade","Vindicated — Dashboard Confessional","Konstantine — Something Corporate","Basket Case — Green Day"]],
["country","Country boom-chick","major","I IV I V",
 ["Ring of Fire — Johnny Cash","Folsom Prison Blues — Johnny Cash","Take Me Home, Country Roads — John Denver","Wagon Wheel — Old Crow Medicine Show","Friends in Low Places — Garth Brooks","On the Road Again — Willie Nelson","Jackson — Johnny Cash & June Carter","Chicken Fried — Zac Brown Band","Wide Open Spaces — The Chicks","Guitars, Cadillacs — Dwight Yoakam"]],
["celtic","Celtic reel","dorian","i bVII IV",
 ["Whiskey in the Jar — traditional","The Foggy Dew — traditional","Drunken Sailor — traditional","Star of the County Down — traditional","She Moved Through the Fair — traditional","The Wild Rover — traditional","Molly Malone — traditional","The Gael — Dougie MacLean","Black Is the Colour — traditional","The Rocky Road to Dublin — traditional"]],
["motownTurn","Motown turnaround","major","I vi ii V",
 ["Baby Love — The Supremes","My Girl — The Temptations","I Can't Help Myself — Four Tops","You Can't Hurry Love — The Supremes","Please Mr. Postman — The Marvelettes","Dancing in the Street — Martha & the Vandellas","My Guy — Mary Wells","Heat Wave — Martha & the Vandellas","Where Did Our Love Go — The Supremes","The Way You Do the Things You Do — The Temptations"]],
["rnbSlow","Slow-jam IV–iv","major","I iii IV iv",
 ["Let's Stay Together — Al Green","Ordinary People — John Legend","Adorn — Miguel","So Sick — Ne-Yo","Redbone — Childish Gambino","Sara Smile — Hall & Oates","Rock with You — Michael Jackson","Nothing Even Matters — Lauryn Hill & D'Angelo","Golden — Jill Scott","Killing Me Softly — Roberta Flack"]],
].forEach(([id, label, mode, nums, songs]) =>
  PROGRESSIONS[id] = { label, mode, numerals: nums.split(" "), songs });

const SONG_KEYS = {
  axis:[0,0,2,9,11,4,0,7,9,5], axisMinor:[4,0,2,6,9,1,11,5,2,0], three:[2,0,9,9,9,7,9,7,2,4],
  blues:[10,0,4,4,5,9,4,7,9,4], doowop:[9,8,8,0,5,0,8,7,3,9], jazz:[0,10,0,0,8,2,3,5,10,10],
  mixo:[2,2,4,7,0,5,4,9,2,7], andalusian:[9,10,2,9,6,0,2,9,9,1], pachelbel:[2,3,0,11,0,0,0,0,9,9],
};

// genres are curated, ordered picks from the progression catalogue, grouped into families so the
// dropdown stays navigable (rendered as <optgroup>s). progList[0] — the first id — is the default pick.
const GENRE_GROUPS = [
  ["Pop & Rock", [
    ["Pop", ["axis","doowop","axisMinor","pachelbel"]],
    ["Rock", ["three","mixo","rockRiff"]],
    ["Classic Rock", ["mixo","rockRiff","blues"]],
    ["Hard Rock", ["rockRiff","mixo","axisMinor"]],
    ["Arena Rock", ["axis","pachelbel","britpop"]],
    ["Alternative / Indie", ["britpop","grunge","axisMinor"]],
    ["Grunge", ["grunge","axisMinor","mixo"]],
    ["Britpop", ["britpop","axis","pachelbel"]],
    ["Punk", ["three","axis"]],
    ["Pop-Punk", ["emo","three","axis"]],
    ["Emo", ["emo","axisMinor","pachelbel"]],
    ["Shoegaze", ["aeolian","lydian","dorian"]],
    ["Post-Rock", ["lydian","aeolian","pachelbel"]],
    ["Psychedelic", ["mixo","dorian","lydian"]],
    ["Surf Rock", ["andalusian","rockRiff","three"]],
  ]],
  ["Metal & Heavy", [
    ["Metal", ["phrygian","axisMinor","mixo","flamenco"]],
    ["Heavy Metal", ["phrygian","aeolian","rockRiff"]],
    ["Thrash Metal", ["phrygian","aeolian","axisMinor"]],
    ["Doom / Sludge", ["aeolian","axisMinor","phrygian"]],
    ["Power Metal", ["axisMinor","mixo","pachelbel"]],
    ["Prog Metal", ["dorian","phrygian","lydian"]],
    ["Nu-Metal", ["grunge","phrygian","aeolian"]],
  ]],
  ["Blues, Soul & Funk", [
    ["Blues", ["blues","three"]],
    ["Rhythm & Blues", ["blues","motownTurn","doowop"]],
    ["Soul", ["gospel","motownTurn","doowop"]],
    ["Motown", ["motownTurn","doowop","gospel"]],
    ["Funk", ["mixo","gospel","dorian"]],
    ["Disco", ["axis","gospel","doowop"]],
    ["Gospel", ["gospel","doowop","blues"]],
    ["Neo-Soul", ["rnbSlow","neoSoul","jazz"]],
  ]],
  ["Jazz & Standards", [
    ["Jazz", ["jazz","rhythm","doowop"]],
    ["Swing", ["rhythm","jazz","blues"]],
    ["Bebop", ["rhythm","jazz"]],
    ["Bossa Nova", ["bossa","jazz","dorian"]],
    ["Cool Jazz", ["jazz","bossa","dorian"]],
    ["Ragtime", ["rhythm","blues","three"]],
    ["Lounge", ["bossa","jazz","doowop"]],
  ]],
  ["Folk, Country & Roots", [
    ["Folk", ["three","celtic","axis","doowop"]],
    ["Country", ["country","three","doowop"]],
    ["Bluegrass", ["three","country","blues"]],
    ["Americana", ["mixo","country","three"]],
    ["Rockabilly", ["blues","country","doowop"]],
    ["Celtic", ["celtic","dorian","mixo"]],
    ["Singer-Songwriter", ["pachelbel","axis","doowop"]],
  ]],
  ["Dance & Electronic", [
    ["EDM / Dance", ["edm","axisMinor","festival"]],
    ["House", ["edm","deepHouse","axis"]],
    ["Deep House", ["deepHouse","edm","aeolian"]],
    ["Tech House", ["deepHouse","aeolian","dorian"]],
    ["Progressive House", ["festival","edm","pachelbel"]],
    ["Future House", ["edm","festival","axis"]],
    ["Tropical House", ["axis","edm","futureBass"]],
    ["Nu-Disco", ["axis","edm","doowop"]],
    ["Techno", ["aeolian","festival","deepHouse"]],
    ["Minimal Techno", ["deepHouse","aeolian","dorian"]],
    ["Trance", ["festival","edm","axisMinor"]],
    ["Psytrance", ["festival","phrygian","aeolian"]],
    ["Big Room", ["festival","axisMinor","edm"]],
    ["Electro House", ["edm","axisMinor","festival"]],
    ["Dubstep", ["axisMinor","festival","aeolian"]],
    ["Future Bass", ["futureBass","edm","axis"]],
    ["Drum & Bass", ["deepHouse","aeolian","festival"]],
    ["Jungle", ["aeolian","deepHouse","dorian"]],
    ["UK Garage", ["deepHouse","edm","jazz"]],
    ["Breakbeat", ["mixo","edm","deepHouse"]],
    ["Hardstyle", ["festival","axisMinor","phrygian"]],
    ["Eurodance", ["edm","axisMinor","festival"]],
    ["Synthwave", ["axisMinor","festival","aeolian"]],
    ["Ambient", ["lydian","deepHouse","aeolian"]],
    ["Downtempo / Trip-Hop", ["deepHouse","neoSoul","jazz"]],
    ["IDM", ["lydian","deepHouse","dorian"]],
    ["Lo-Fi / Chillhop", ["jazz","neoSoul","deepHouse"]],
    ["Hip-Hop", ["deepHouse","neoSoul","aeolian"]],
    ["Trap", ["axisMinor","festival","aeolian"]],
  ]],
  ["Latin", [
    ["Latin", ["montuno","guajira","andalusian"]],
    ["Salsa", ["montuno","guajira","jazz"]],
    ["Son Cubano", ["guajira","montuno","jazz"]],
    ["Mambo", ["montuno","guajira","jazz"]],
    ["Cha-Cha-Chá", ["guajira","montuno","jazz"]],
    ["Rumba", ["bolero","andalusian","montuno"]],
    ["Timba", ["montuno","guajira","jazz"]],
    ["Latin Jazz", ["bossa","jazz","montuno"]],
    ["Samba", ["bossa","jazz","montuno"]],
    ["Bossa Nova (Latin)", ["bossa","jazz","montuno"]],
    ["Bachata", ["bolero","axis","doowop"]],
    ["Merengue", ["guajira","montuno","three"]],
    ["Cumbia", ["guajira","axis","three"]],
    ["Reggaetón", ["axisMinor","festival","montuno"]],
    ["Latin Pop", ["axis","edm","bolero"]],
    ["Tango", ["bolero","andalusian","montuno"]],
    ["Bolero", ["bolero","jazz","doowop"]],
    ["Mariachi", ["guajira","three","andalusian"]],
    ["Norteño", ["guajira","three","axis"]],
    ["Forró", ["guajira","three","mixo"]],
  ]],
  ["World & Modal", [
    ["Flamenco", ["flamenco","andalusian","phrygian"]],
    ["Reggae", ["axis","dorian","three"]],
    ["Ska", ["three","axis","blues"]],
    ["Afrobeat", ["dorian","mixo","axis"]],
    ["Middle Eastern", ["phrygian","flamenco","andalusian"]],
    ["Klezmer", ["flamenco","phrygian","andalusian"]],
    ["Bollywood", ["mixo","dorian","andalusian"]],
  ]],
  ["Cinematic & Classical", [
    ["Cinematic / Film", ["lydian","aeolian","pachelbel"]],
    ["Epic / Trailer", ["axisMinor","aeolian","mixo"]],
    ["Horror / Tension", ["phrygian","aeolian","andalusian"]],
    ["Classical", ["pachelbel","three","jazz"]],
    ["Baroque", ["pachelbel","jazz"]],
    ["Dreamscore", ["lydian","dorian","pachelbel"]],
  ]],
];
const CATEGORIES = [
  { group:"Genre", items: GENRE_GROUPS.flatMap(([, list]) => list.map(([name, progs]) => ({ name, progs }))) },
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

/* Structures that work on any progression. `family` groups them in the picker.

   Bar maths matters here: `reps` multiplies the chord pool, so on the usual four-chord loop
   LOOP|2 is 8 bars, LOOP|4 is 16 and LOOP|8 is 32 — the 8/16/32-bar phrases dance music is
   built from. LOOP|4 is sixteen bars of one chord, which is exactly a DJ-friendly intro. */
const UNIVERSAL = [
 /* ---- song forms ---- */
 ["Storyteller (strophic)","Folk and country narrative form — no chorus at all. The loop never changes; the story does.",
  ["Intro|LOOP|1|instrumental","Verse 1|LOOP|2|","Verse 2|LOOP|2|","Instrumental|LOOP|1|","Verse 3|LOOP|2|","Final verse|LOOP|2|return to the opening image","Outro|HOLD1|1|let the tonic ring out"],"Song forms"],
 ["Slow-burn ballad","Everything about restraint until the last chorus — dynamics do the storytelling.",
  ["Intro|HOLD1|1|held — piano or pad only","Verse 1|LOOP|2|minimal","Chorus|LOOP|1|still restrained","Verse 2|LOOP|2|add one element","Chorus|LOOP|2|","Middle 8|HALF2|2|the back half of the loop, stripped bare","Final chorus|LOOP|2|full arrangement at last","Outro|HOLD1|1|back to where it started"],"Song forms"],
 ["Pop-punk sprint","Under three minutes. Verses on half the loop keep the chorus feeling like a payoff.",
  ["Intro|LOOP|2|full speed, guitars only then drums in","Verse 1|HALF1|4|","Chorus|LOOP|2|","Verse 2|HALF1|4|","Chorus|LOOP|2|","Bridge|HALF2|2|half-time feel — same chords, half the speed","Double chorus|LOOP|4|gang vocals on the last pass"],"Song forms"],
 ["AABA classic","Two statements, a contrasting middle, and home again — the pre-rock standard form.",
  ["A|LOOP|2|","A|LOOP|2|same music, second lyric","B — the middle|HALF2|2|contrast from the loop's back half; end poised to fall home","A|LOOP|2|home again — often the first lyric returns"],"Song forms"],
 ["Modern pop (post-chorus)","The shape of most current radio pop: the hook after the hook is the bit people actually remember.",
  ["Intro|HALF1|1|","Verse 1|LOOP|2|","Pre-chorus|HALF2|1|lift","Chorus|LOOP|2|","Post-chorus|HALF1|2|instrumental hook — no lyric","Verse 2|LOOP|2|","Pre-chorus|HALF2|1|","Chorus|LOOP|2|","Post-chorus|HALF1|2|","Bridge|HALF2|2|","Chorus|LOOP|2|","Post-chorus|HALF1|4|ride it out"],"Song forms"],
 ["Hook first","Open on the chorus. Gives you three seconds to win, which is what a playlist skip button is.",
  ["Chorus|LOOP|1|cold open, no intro","Verse 1|LOOP|2|","Chorus|LOOP|2|","Verse 2|LOOP|2|","Chorus|LOOP|2|","Bridge|HALF2|2|","Double chorus|LOOP|4|"],"Song forms"],
 ["Bridge-less pop","No middle eight at all — the contrast comes from the arrangement dropping out instead.",
  ["Intro|HALF1|1|","Verse 1|LOOP|2|","Chorus|LOOP|2|","Verse 2|LOOP|2|","Chorus|LOOP|2|","Break|HOLD1|2|everything stops but the voice","Final chorus|LOOP|4|"],"Song forms"],
 ["Verse & refrain","No separate chorus — the last line of every verse is the hook. Dylan, Springsteen, most folk.",
  ["Intro|LOOP|1|","Verse 1|HALF1|2|","Refrain|HALF2|1|the line that repeats","Verse 2|HALF1|2|","Refrain|HALF2|1|","Verse 3|HALF1|2|","Refrain|HALF2|2|","Outro|HOLD1|1|"],"Song forms"],
 ["Through-composed","Nothing repeats. Every section is new material — prog, art-pop, film cues.",
  ["Part I|LOOP|2|","Part II|HALF2|2|","Part III|LOOP|2|","Part IV|HALF1|2|","Part V|LOOP|3|the arrival","Coda|HOLD1|2|"],"Song forms"],
 ["Anthem build","Starts with one voice, ends with everyone. The structure is dynamics, not harmony.",
  ["Intro|HOLD1|2|one instrument","Verse 1|LOOP|2|voice and one part","Verse 2|LOOP|2|add drums","Chorus|LOOP|2|full band","Verse 3|LOOP|2|","Chorus|LOOP|2|","Breakdown|HALF2|2|drop to almost nothing","Final chorus|LOOP|4|biggest arrangement; consider stepping the whole loop up a tone"],"Song forms"],
 ["Soul / Motown","Short intro, tight verses, a tag that keeps repeating while the singer ad-libs over it.",
  ["Intro|HALF1|1|","Verse 1|LOOP|2|","Chorus|LOOP|1|","Verse 2|LOOP|2|","Chorus|LOOP|2|","Bridge|HALF2|2|","Chorus|LOOP|2|","Tag|HALF2|4|vamp and ad-lib to the fade"],"Song forms"],
 ["Call & response","Gospel and blues shape: a line, an answer, and a last section where both stack up.",
  ["Intro|LOOP|1|","Call|HALF1|2|","Response|HALF2|2|","Call|HALF1|2|","Response|HALF2|2|","Bridge|LOOP|2|","Call|HALF1|2|","Response|HALF2|4|both at once"],"Song forms"],

 /* ---- dance & electronic ---- */
 ["Dance build","Club architecture: tension on a fragment of the loop, release on the whole thing.",
  ["Intro|HOLD1|4|groove on one chord, filtered","Build|HALF1|4|rising filter / snare roll","Drop|LOOP|4|full loop, full energy","Break|HOLD1|4|strip to almost silence","Build|HALF1|4|","Drop|LOOP|4|","Outro|HOLD1|4|filter back down"],"Dance & electronic"],
 ["Big room / festival","The main-stage shape. Sixteen-bar intro and outro so a DJ can mix in and out on a phrase.",
  ["Intro|LOOP|4|beat only, filtered — DJ mixes in here","Build|HALF1|4|snare roll and riser","Drop|LOOP|4|the whole loop at full size","Breakdown|LOOP|4|melodic, no kick","Build|HALF1|4|second riser, higher","Drop|LOOP|4|","Outro|LOOP|4|beat only — DJ mixes out"],"Dance & electronic"],
 ["Progressive house","Nothing arrives all at once. Layers enter one at a time and the drop is a groove, not an event.",
  ["Intro|LOOP|4|one element, filtered","Groove|LOOP|4|add the bass","Layer up|LOOP|4|add the chords","Breakdown|HALF2|4|take the kick away","Build|HALF1|8|sixteen bars of rising tension","Main groove|LOOP|8|thirty-two bars — let it run","Outro|LOOP|4|strip back down"],"Dance & electronic"],
 ["Trance","The breakdown is the song. Everything before it is setup and everything after is release.",
  ["Intro|LOOP|4|","Groove|LOOP|4|","Breakdown|LOOP|4|the melodic centrepiece, no drums","Build|HALF1|8|long riser, sixteen bars","Drop|LOOP|8|thirty-two bars of the main theme","Break|HALF2|4|","Drop|LOOP|4|","Outro|LOOP|4|"],"Dance & electronic"],
 ["Deep house","A tool more than a song: long mixable ends, a groove that barely changes, two small breaks.",
  ["DJ intro|LOOP|4|drums and one hook","Groove|LOOP|4|","Break|HALF2|2|filter down, no kick","Groove|LOOP|4|","Vocal|LOOP|4|","Break|HALF2|2|","Groove|LOOP|4|","DJ outro|LOOP|4|"],"Dance & electronic"],
 ["Tech house","Minimal and relentless. The interest is in what drops out, not what gets added.",
  ["DJ intro|LOOP|4|","Groove|LOOP|8|thirty-two bars, almost no change","Break|HOLD1|4|drums only","Groove|LOOP|8|one new element","Break|HALF2|2|","Groove|LOOP|4|","DJ outro|LOOP|4|"],"Dance & electronic"],
 ["Melodic techno","A long climb that never fully pays off — the tension is the point.",
  ["Intro|LOOP|4|","Pulse|LOOP|4|","Layer up|LOOP|4|","Long build|HALF1|8|sixteen bars, filter opening the whole way","Release|LOOP|8|arrival rather than a drop","Fade|LOOP|4|"],"Dance & electronic"],
 ["Future bass","The drop is the chords — which is what this app is best at. Short, bright, vocal-chopped.",
  ["Intro|HALF1|2|","Verse|LOOP|2|","Build|HALF1|4|","Drop|LOOP|4|chords are the hook here","Verse|LOOP|2|","Build|HALF1|4|","Drop|LOOP|4|","Outro|HOLD1|4|"],"Dance & electronic"],
 ["Dubstep","Half-time drops with a mid-section that changes the pattern rather than the chords.",
  ["Intro|LOOP|2|","Build|HALF1|4|","Drop|LOOP|4|half-time — everything feels twice as heavy","Mid|HALF2|4|switch the rhythm, keep the key","Build|HALF1|4|","Drop|LOOP|4|second drop, new pattern","Outro|LOOP|2|"],"Dance & electronic"],
 ["Drum & bass","Sixteen-bar intro, a breakdown that sets the mood, then two drops with a roll-out between.",
  ["Intro|LOOP|4|","Breakdown|LOOP|4|atmosphere and pads","Drop|LOOP|8|","Roll-out|HALF2|4|strip to the break","Drop|LOOP|8|","Outro|LOOP|4|"],"Dance & electronic"],
 ["Trap","Hook-led and repetitive by design. The bridge is the only place anything changes.",
  ["Intro|HOLD1|4|","Verse 1|LOOP|4|","Hook|LOOP|2|","Verse 2|LOOP|4|","Hook|LOOP|2|","Bridge|HALF2|2|","Hook|LOOP|4|double hook to finish"],"Dance & electronic"],
 ["UK garage","Two-step groove with a vocal on top and short breaks that keep it moving.",
  ["Intro|LOOP|2|","Groove|LOOP|4|","Vocal|LOOP|4|","Break|HALF2|2|","Groove|LOOP|4|","Vocal|LOOP|4|","Outro|LOOP|2|"],"Dance & electronic"],
 ["Hardstyle","Everything serves the kick. The breakdown is euphoric so the drop can be brutal.",
  ["Intro|LOOP|2|","Build|HALF1|4|","Kick drop|LOOP|4|","Breakdown|LOOP|4|melodic and wide open","Build|HALF1|8|","Kick drop|LOOP|4|","Outro|LOOP|2|"],"Dance & electronic"],
 ["Eurodance","Verse, chorus, and an eight-bar rap where the second verse would be. Unapologetic.",
  ["Intro|LOOP|2|","Verse 1|LOOP|2|","Pre-chorus|HALF2|2|","Chorus|LOOP|2|","Rap|HALF1|2|","Chorus|LOOP|2|","Breakdown|HOLD1|4|","Chorus|LOOP|4|"],"Dance & electronic"],
 ["Ambient / downtempo","No drops at all. Sections change by texture, and everything is long.",
  ["Opening|LOOP|2|one held chord","Drift|LOOP|4|","Swell|LOOP|4|","Still|LOOP|2|almost nothing","Return|LOOP|4|","Close|LOOP|2|"],"Dance & electronic"],
 ["Synthwave","Steady, cinematic, no big drop — the arpeggio runs the whole way through.",
  ["Intro|HOLD1|4|arp alone","Verse|LOOP|4|","Chorus|LOOP|4|","Verse|LOOP|4|","Solo|HALF2|4|lead line over the loop","Chorus|LOOP|4|","Outro|LOOP|2|arp fades out"],"Dance & electronic"],

 /* ---- the same song at three lengths ---- */
 ["Radio edit","Short intro, straight to the hook, out by three minutes. Built for a playlist, not a floor.",
  ["Intro|HALF1|2|eight seconds at most","Verse 1|LOOP|2|","Chorus|LOOP|2|","Verse 2|LOOP|2|","Chorus|LOOP|2|","Bridge|HALF2|2|","Chorus|LOOP|2|","Outro|HOLD1|4|"],"Club edits"],
 ["Club mix","The same song with mixable ends — thirty-two bars of beat at each end for a DJ to work with.",
  ["DJ intro|LOOP|4|","Groove|LOOP|4|","Build|HALF1|4|","Drop|LOOP|4|the chorus, arranged as a drop","Break|HALF2|4|","Build|HALF1|4|","Drop|LOOP|8|","DJ outro|LOOP|4|"],"Club edits"],
 ["Extended mix","Seven minutes. Everything gets twice as long and the arrangement earns its arrival.",
  ["DJ intro|LOOP|4|","Groove|LOOP|8|","Layer up|LOOP|4|","Breakdown|LOOP|4|","Build|HALF1|8|","Drop|LOOP|8|","Break|HALF2|4|","Build|HALF1|8|","Drop|LOOP|8|","DJ outro|LOOP|4|"],"Club edits"],
].map(x => ({ name:x[0], tip:x[1], plan: mkPlan(x[2]), family: x[3] || "Song forms" }));
// the families, in picker order
const STRUCT_FAMILIES = ["Song forms", "Dance & electronic", "Club edits"];

const LETTER_WORD = { I:"intro", V:"verse", P:"pre-chorus", C:"chorus", B:"bridge", S:"solo", G:"groove",
  R:"refrain", T:"tag", O:"outro", U:"build", D:"drop", K:"break", A:"A section", H:"head" };
function letterFor(sec) {
  const s = sec.toLowerCase();
  for (const [k, L] of [["pre","P"],["chorus","C"],["intro","I"],["verse","V"],["bridge","B"],["middle","B"],
    ["solo","S"],["instrumental","S"],["refrain","R"],["tag","T"],["build","U"],["drop","D"],["break","K"],
    ["hook","C"],["groove","G"],["pulse","G"],["layer","U"],["release","D"],["rap","V"],["vocal","V"],
    ["call","V"],["response","R"],["mid","B"],["drift","G"],["swell","U"],["still","K"],["roll","K"],["fade","O"],
    ["outro","O"],["out","O"],["head","H"]]) if (s.includes(k)) return L;
  return sec[0].toUpperCase();
}

export { BLUES12, BLUES12Q, CATEGORIES, GENRE_GROUPS, LETTER_WORD, PAR_SONGS, PLANS, PROGRESSIONS, SEC_SONGS, SONG_KEYS, STRUCTURES, STRUCT_FAMILIES, UNIVERSAL, defStruct, letterFor, mkPlan };
