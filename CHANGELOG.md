# Changelog

## Unreleased
- **Sixteenth notes.** The whole app used to run on an eighth-note grid — eight slots to a bar in
  4/4 — which put a floor under how fine a rhythm could get. A rhythm pattern now declares how many
  columns it divides each beat into, and everything downstream reads the meter from that instead of
  assuming eighths: the scheduler, the melody grid, note values in the score, and the exported MIDI.
  Eight new **16ths** rhythms — *Offbeat 16th stabs*, *House chord pump*, *Garage skip*, *Constant
  sixteenths*, *16th funk scratch*, *Disco chug*, *Swung 16ths* and *Trap sparse* — and ten new
  sixteenth drum patterns: *House · 16th hats*, *Techno · driving 16ths*, *UK garage 2-step*, *Drum
  & bass*, *Amen break*, *Big beat breaks*, *Trap · rolling hats*, *Dubstep*, *Hip-hop 16ths* and
  *Footwork*. Rolling hats, a real breakbeat and the skipping garage kick need this resolution;
  at eighths they could only be approximated. Sixteenth rhythms are marked **· 16ths** in the
  Pattern menu.
  - Picking a 16ths rhythm **doubles the melody grid** to sixteen columns a bar, so you can write
    16th toplines, arps and offbeat lines. Switching between an eighth and a sixteenth rhythm
    re-times any melody you've already written so every note stays where it sounds — going finer is
    lossless, and going back folds notes onto the nearest column.
  - Patterns of different resolutions now **play together**: an eighth-note strum with a sixteenth
    drum kit, or a 3/4 rhythm with a waltz kit. Each bar ticks at the finest resolution in play and
    every pattern is sampled onto it, so nothing gets truncated or stretched.
  - **Swing** on a sixteenth pattern is a sixteenth shuffle — exactly the UK garage / 2-step feel.
  - The score engraves sixteenths properly: double flags and double beams, beams grouped inside the
    beat, and the time signature still reads **4/4** rather than counting columns as beats.
  - The four dance progressions now open on a sixteenth rhythm and kit — **The EDM anthem** and
    **The festival lift** on the house chord pump, **Deep-house groove** on offbeat stabs, and
    **Future-bass swell** on trap.
  Every existing eighth-note rhythm behaves exactly as before, in playback, notation and export.
  Version bumped to 4.39.0.
- **Dance kits and the sidechain pump.** The drum engine now speaks dance. Two new controls sit
  beside **Drums** in the top panel. **Kit** revoices the whole pattern as an *Acoustic kit* (what
  you had), a **TR-909** (tight punchy kick, hard click, bright metallic hats — house and techno) or
  a **TR-808** (a long tuned sub-boom that rings for most of a beat — trap and hip-hop). **Pump** is
  sidechain ducking: the kick pulls the chords and melody down and lets them breathe back before the
  next one, which is the pulse under nearly every house, techno and EDM record. Four settings —
  *No pump*, *Subtle*, *Classic pump*, *Hard pump*. The pump follows whichever kick is actually
  playing, so a section with its own 🥁 kit pumps to that kit, and a section with no drums doesn't
  pump at all. Six new drum voices came with it — **open hat**, **clap**, **rim**, **ride**,
  **crash** and an **808 sub-boom** — and eleven new patterns built from them: *House (909)*,
  *Deep house*, *Tech house*, *Techno*, *Trance*, *Big room*, *UK garage 2-step*, *Nu-disco*,
  *Trap*, *Dubstep half-time* and *Electro house*. The offbeat open hat and a clap (not a snare) on
  2 and 4 are what stop four-on-the-floor sounding like disco-rock. The four dance progressions —
  **The EDM anthem**, **Deep-house groove**, **The festival lift** and **Future-bass swell** — now
  arrive with a matching pattern, kit and pump already selected (marked ★), so picking Deep House and
  pressing play sounds like deep house. Every other progression keeps the acoustic kit and no pump,
  exactly as before, and sketches saved before this release reload sounding as they were saved. Kit
  and pump are saved with the sketch and written into the exported MIDI, which now emits all the new
  percussion on channel 10 and sets the matching GM percussion program. Version bumped to 4.38.0.
- **Melodic narratives — write a whole song's melody in one pick.** A new **Melodic narrative** menu
  sits directly under the song-structure chooser in **Song & melody**. The per-section Suggest tab
  shapes one section; a narrative is a single melodic idea told across the *whole* song — choose one
  and it writes melody **A** of every section at once, taking each section's register, note density
  and contour from what that section is (verse, chorus, bridge, intro…), which pass of it this is,
  and where it falls in the running order. 19 shapes: **Arch**, **Song-length arch**, **Terraced**
  (a step higher each bar), **Range expansion at the hook** (narrow verses, the octave opened for the
  chorus), **Descending lament**, **Ostinato cell**, **Long climb across the song**, **Withheld
  peak** (the top note spent only in the final section), **Question & answer**, **Call & response**,
  **Motif development**, **Widening pendulum**, **Chant then release**, **Waves**, **Cascading
  sequence**, **Leap and fill**, **Speech contour**, **Chord-locked hook** and **Suspension chain** —
  each with a note on what it does and a few songs that do it. **↻ Rewrite** re-runs it after a key
  change, a new structure or edits you'd rather discard; **↶ Undo** restores the melodies as they
  were. It only touches layer A, so a 2nd melody stays put, and everything it writes is ordinary grid
  notes you can edit section by section. Version bumped to 4.37.0.
- **Per-section drums — build dynamics across the song.** Drums used to be one global kit for the whole
  song. Now every section in **Song & melody** carries its own **🥁** menu in its group header (Verses,
  Chorus, Bridge, Intro…): leave it on *global drums* to follow the top Drums picker, choose a different
  kit for contrast, or pick *No drums* to drop percussion out entirely for that section. That's the
  simplest way to shape dynamics — strip the kit on a verse, slam it back for the chorus, or give the
  bridge a half-time shuffle. The per-section choice drives live playback, is saved with the sketch, and
  is written correctly into the exported MIDI (each bar emits its own section's pattern). Version bumped
  to 4.36.0.
- **Call & response, plus Select-all for notes and chords.** Two more melody-writing helpers and a
  selection fix. **↩ Answer** (in the melody Move toolbar) takes the selected phrase — the "call" — and
  echoes it right after itself as a "response" whose final note resolves home to the tonic: instant
  antecedent → consequent. And because a marquee could only grab what was scrolled on screen, both the
  melody Move toolbar and the chord **Reorder** bar now have a **Select all** button — one tap selects
  *every* note in a section (even off-screen) or every chord in the progression, so a transform (repeat,
  sequence, invert, reverse, time-shift, move, remove) applies across the whole thing. Version bumped to
  4.35.0.
- **Melodic-development tools in the melody grid's Move mode.** Select notes (drag a box, or tap one) and
  the Move toolbar now offers the classic ways to turn a motif into a melody, alongside the existing
  nudge and **½× / 2× time** (augmentation / diminution): **⧉ Repeat** (copy the selection right after
  itself), **Seq ▲ / Seq ▼** (copy right after, transposed a scale step — tap again to keep a sequence
  climbing), **⤯ Invert** (flip the contour upside-down around the first note) and **↤ Reverse**
  (retrograde — play the selection backwards). Each keeps the new notes selected so you can chain moves.
  Version bumped to 4.34.0.
- **Remove chords next to Add; melody tools behind one button; scale readout gone.** Three tidy-ups.
  (1) A **🗑 Remove** button now sits right beside **＋ Add** under the wheel — tap it, then tap any chord
  on the strip or the wheel to delete it (Add / Remove / Reorder are one-tap modes; the last chord can't
  be removed). (2) The melody tools are folded into a single **🎵 Add a melody** button that expands to
  reveal Hum, MIDI-file import, **🔴 Record**, the "→ lands on" section and the Guitar/Voice record
  source — collapsed by default, so the panel is clean until you need it. (3) The one-line **Scale
  (<key>): notes** readout is removed. Version bumped to 4.33.0.
- **One-tap "Add recorded melody" button.** Recording used to mean setting a source up top, then scrolling
  down to find a section's ● Rec button — confusing. Now the **Add a melody** row has three matching
  actions in a line — **🎤 Hum · ↑ MIDI file · 🔴 Add recorded melody** — and all three drop the melody
  onto the section chosen in **→ lands on**. Press **🔴 Add recorded melody**, play or sing (a live level
  meter and pitch readout show what it's hearing), press **■ Stop & add**, and the transcribed line lands
  on that section. The Guitar / Voice choice is now clearly labelled **Record source** (it just tunes the
  pitch detection). The per-section ● Rec buttons still work for recording straight onto one section.
  Version bumped to 4.32.0.
- **Genre-specific chord sequences, so styles stop sharing the same loops.** Eight new signature
  progressions (library now 33) give the rock, roots and soul genres their own defaults instead of all
  leaning on the four-chord axis: **Riff rock** (i–♭III–IV, hard/classic rock), **Grunge chromatic**
  (I–♭III–♭VI–♭VII, grunge / alt / nu-metal), **Britpop climb** (I–iii–IV–V), **Emo lift** (IV–I–V–vi,
  emo / pop-punk), **Country boom-chick** (I–IV–I–V), **Celtic reel** (i–♭VII–IV, Dorian), **Motown
  turnaround** (I–vi–ii–V) and the **Slow-jam IV–iv** (I–iii–IV–iv, neo-soul / R&B). Each genre in Pop &
  Rock, Folk/Country/Roots and Blues/Soul/Funk was re-pointed so it now *leads* with a characteristic
  loop (Grunge → grunge, Hard Rock → riff rock, Britpop → britpop, Country → country, Celtic → celtic,
  Motown → motown turnaround, Neo-Soul → the IV–iv jam, and so on), each with its own groove and tempo.
  A borrowed `iv` in major keys was added to make the R&B move possible. Version bumped to 4.31.0.
- **Tidier Song & melody panel.** The melody tools are now grouped and labelled so their roles are clear:
  an **Add a melody** row (🎤 Hum · ↑ MIDI file · → lands on <section>) for bringing a whole tune in, and
  a separate **Record** row (🎸 Guitar / 🎤 Voice — the source the per-section ● Rec button listens for)
  with **Legato** and **↓ Export MIDI** alongside. The redundant **Chords in <key>** row (it just
  duplicated the wheel's haloed chords) and the **Landing notes** feature (the Scale row's toggle and its
  per-chord expansion) are removed; a plain one-line **Scale (<key>): notes** readout stays as a quick
  reference for the melody grid. Version bumped to 4.30.0.
- **Remove several chords at once in Reorder mode.** Reorder mode already lets you tap chords to select
  them; now there's a **🗑 Remove** button beside Move, so you can select one or many chords and drop them
  all in a single tap — a first-class counterpart to **＋ Add**. It won't let you remove every chord (the
  button greys out when the whole loop is selected), and it handles both catalogue chords and ones you
  added from the wheel. Version bumped to 4.29.0.
- **Rhythm controls moved up top; the strum-arrow grid is gone.** The Rhythm panel was a grab-bag, so it's
  been dissolved. **Pattern** and **Drums** (plus the **Real** and **Click** toggles) now sit in the main
  controls, right under **Sound** and **Lead** — all the "how it sounds and feels" settings in one place.
  The animated **↓ ↑ · strum-arrow grid was removed** (the pattern still drives playback and MIDI, it just
  isn't drawn). The melody-related tools that were stranded under Rhythm — **🎤 Hum**, **↑/↓ MIDI**, the
  "which section a melody lands on" picker, the **🎸 Guitar / 🎤 Voice** record source, and **Legato** —
  moved into the **Song & melody** panel where they belong. Version bumped to 4.28.0.
- **Add any chord straight from the circle of fifths.** A new **＋ Add** button by the chord strip turns
  on an add mode: every node on the wheel — all twelve majors and twelve minors — lights up with a dashed
  ring, and tapping one **appends that chord to the end of the chain**. Keep tapping to add several, then
  press **✕ Done**. Added chords carry a proper Roman numeral when they're diatonic (or a neutral • when
  they're chromatic, with the gold ✦ marking them outside the key), and each has its own identity, so the
  existing **⇄ Reorder** works on them — drop a chord in from anywhere and slide it into place. Version
  bumped to 4.27.0.
- **Neater interface — the explanatory text is now opt-in.** The app had grown a lot of always-on helper
  prose, which made it feel cluttered. A new **Tips** toggle in the header (off by default) hides the
  longer guidance paragraphs — the chord-card how-to, the stave and section explainers, the landing-note
  and structure notes, the song-key caveats — leaving clean panels with just the controls and results.
  Flip **Tips** on to bring the guidance back. Contextual, in-the-moment hints (what a tap will do, what's
  currently playing, recording instructions) stay visible either way. The controls panel is also
  decluttered: the power-user harmony controls — the **secondary-dominant**, **parallel-chord** and
  **borrowed-colour** menus plus the **Par / Sec** wheel overlays — now sit behind a **＋ Advanced**
  disclosure (collapsed by default), so the everyday row is just Key · Mode · Genre · Emotion · colour ·
  dice. The wheel's tap-to-swap hint, the colour legend beneath the wheel (tonic / subdominant /
  dominant / chords-in-key / ✦ / order), and the strum-pattern description are gated the same way — hidden
  by default, back with Tips. Version bumped to 4.26.0.
- **Signature grooves and tempos for the new loops.** The eleven new progressions (the five dance loops,
  six jazz/Latin/soul loops) now each carry their own default rhythm pattern and tempo instead of falling
  back to the generic pop strum — so a Bossa pick brushes a bossa, Salsa and Son ride a tresillo/clave,
  EDM and House stomp four-on-the-floor, the festival lift and future-bass swell get their tempos, gospel
  sways in 12/8, and neo-soul sits back on a funk scratch. Flamenco also gets its groove. Version bumped
  to 4.26.0.
- **A wider progression library so same-family genres pull distinct loops.** Six more authentic
  progressions join the catalogue (now 25 in all): **Rhythm changes** (I–VI7–ii–V7, the jazz/bebop
  standard), **Bossa nova turnaround** (I–II7–ii–V7), **Son guajira** (I–IV–V–IV, the Cuban son vamp),
  **Bolero cadence** (i–♭VI–iv–V), **Gospel turnaround** (vi–ii–V–I) and **Neo-soul descent**
  (IV–iii–ii–I). Genres across Jazz, Soul/Funk, Hip-Hop and especially Latin are re-mapped onto them so
  neighbouring styles differ: Bebop/Ragtime → rhythm changes, Bossa Nova/Samba/Latin Jazz → bossa
  turnaround, Son Cubano/Cumbia/Mariachi → son guajira, Bolero/Tango → bolero cadence, Salsa/Mambo →
  montuno, Soul/Motown/Gospel → gospel turnaround, Neo-Soul/Lo-Fi → neo-soul descent. Jazz and Latin
  loops lean on secondary and dominant-function chords, so their idiomatic borrowed chords (a VI7 or II7,
  a major V in a minor key) carry the gold ✦ "outside the key" mark — correctly, the same way the
  Andalusian cadence and flamenco loop do. Version bumped to 4.25.0.
- **Dance and Latin genres get progressions that actually move.** Many of the new dance/EDM genres were
  defaulting to bare two-chord modal vamps (House → `i–IV`, etc.) or all landing on the same loop — so
  they read as "no chord changes." Five new progressions with real movement fix that: **The EDM anthem**
  (vi–IV–I–V), **Deep-house groove** (i–iv–♭VII–♭III), **The festival lift** (i–♭VII–♭VI–♭VII),
  **Future-bass swell** (IV–V–iii–vi) and **Latin montuno** (i–iv–V). Every Dance & Electronic and Latin
  genre is re-mapped so its default loop has three or four chords and neighbouring genres differ (House →
  EDM anthem, Deep House → Deep-house groove, Trance → festival lift, Techno → Aeolian cadence, Future
  Bass → future-bass swell, Salsa/Latin → montuno, and so on). The short modal vamps are still available
  as secondary picks for genres that genuinely stay static (minimal techno, ambient). Version bumped to
  4.24.0.
- **A much bigger genre list.** The Genre picker grows from 9 to **106 genres**, organised into nine
  families shown as labelled groups in the dropdown: **Pop & Rock** (15 — Pop, Classic/Hard/Arena Rock,
  Alternative, Grunge, Britpop, Punk, Pop-Punk, Emo, Shoegaze, Post-Rock, Psychedelic, Surf), **Metal &
  Heavy** (Heavy/Thrash/Doom/Power/Prog/Nu-Metal), **Blues, Soul & Funk** (R&B, Soul, Motown, Funk,
  Disco, Gospel, Neo-Soul), **Jazz & Standards** (Swing, Bebop, Bossa Nova, Cool Jazz, Ragtime, Lounge),
  **Folk, Country & Roots** (Country, Bluegrass, Americana, Rockabilly, Celtic, Singer-Songwriter),
  **Dance & Electronic** (29 — EDM, House + Deep/Tech/Progressive/Future/Tropical House, Nu-Disco, Techno,
  Minimal, Trance, Psytrance, Big Room, Electro House, Dubstep, Future Bass, Drum & Bass, Jungle, UK
  Garage, Breakbeat, Hardstyle, Eurodance, Synthwave, Ambient, Downtempo/Trip-Hop, IDM, Lo-Fi, Hip-Hop,
  Trap), **Latin** (20 — Salsa, Son Cubano, Mambo, Cha-Cha-Chá, Rumba, Timba, Latin Jazz, Samba, Bossa
  Nova, Bachata, Merengue, Cumbia, Reggaetón, Latin Pop, Tango, Bolero, Mariachi, Norteño, Forró), **World
  & Modal** (Flamenco, Reggae, Ska, Afrobeat, Middle Eastern, Klezmer, Bollywood) and **Cinematic &
  Classical** (Film, Trailer, Horror, Classical, Baroque, Dreamscore). Each genre is a curated, ordered
  set of the catalogue's progressions, so the wheel and the Suggested progressions panel reflect the
  style you pick. Version bumped to 4.23.0.
- **Flamenco mode (Phrygian dominant).** The Mode selector gains the **Phrygian dominant** scale — the
  flamenco / "Spanish" sound: 1 ♭2 3 4 5 ♭6 ♭7 (Phrygian with a major 3rd). Selecting it re-colours the
  scale, the pentatonic highlight, the melody grid, the landing notes and the key label, and lists the
  mode's diatonic chords (a major tonic **I**, the ♭II major, a ♭VI **augmented**, and so on) both in the
  "Chords in <key>" row and as gold halos on the circle of fifths — all correctly spelled (E Flamenco →
  E F G♯ A B C D). It ships with a dedicated **Flamenco cadence** loop — the Andalusian descent resolving
  to a major Phrygian tonic, **iv–♭III–♭II–I** (Am–G–F–E in E) — so picking the mode offers it as a
  one-tap load onto the wheel, just like the other modal loops. True to the style, the ♭III (G major,
  with its natural 3rd) is marked as sitting *outside* the strict Phrygian-dominant scale: that's
  flamenco's signature modal mixture, not a mistake. The loop is also filed under Metal, Cinematic and
  Dark / Tense for discovery. Version bumped to 4.22.0.
- **Picking a Mode now offers a matching progression for the wheel.** Choosing a Mode set the scale and
  the haloed chord palette, but it never gave you an actual *progression* to start from — the loop on the
  circle of fifths stayed whatever you had. Now, when the Mode you pick doesn't match the loop on the
  wheel, a suggestion appears: the catalogue's characteristic loop(s) for that mode (e.g. Lydian →
  **Lydian bright**, Dorian → **Dorian groove**), each a one-tap button that loads the loop onto the wheel
  and snaps the Mode back to Auto so chords and scale line up. Modes with no catalogue loop yet (Locrian)
  say so and point you at the haloed chords to build your own. Version bumped to 4.21.0.
- **See the mode on the wheel, and spot chords that leave the key.** Two changes make the Mode selector
  visible where you're actually looking — the circle of fifths. (1) The wheel now **haloes the mode's
  seven diatonic chords**, with the tonic ringed in gold, so switching Mode visibly relights a different
  set of chords on the wheel instead of only changing the read-outs below it. (2) Any chord in your loop
  that falls **outside the current mode's palette** is flagged — a gold **✦** on its chord pill and a gold
  badge on its wheel node (both with a "sits outside <key>" tooltip). Diatonic loops show no flags;
  borrowed chords, secondary dominants, or a deliberately cross-family Mode light up so the tension is
  visible rather than implied. A legend ties the halo and the ✦ to the current key. Version bumped to 4.20.0.
- **A Mode chooser, all 12 keys spelled properly, and a live diatonic-chord readout.** The **Key** box
  now spells every key the way it's written — sharps in sharp keys (E, B, F♯…), flats in flat keys — and
  a new **Mode** selector beside it sets the scale you write against: Ionian (major), Dorian, Phrygian,
  Lydian, Mixolydian, Aeolian (minor) and Locrian. It defaults to **Auto**, following the loaded
  progression's own mode, and the modes are grouped into "fits this progression" and "cross-family — adds
  tension" so you can borrow colour deliberately. The chosen mode drives the **scale**, the pentatonic
  highlight, the **wheel labels**, the melody grid, the landing-note guidance and the key label, all
  correctly spelled. A new **Chords in <key>** row shows the mode's seven diatonic triads with their
  Roman numerals — and their qualities shift from mode to mode (IV is major in Dorian, minor in Aeolian),
  so you can see how a mode re-colours the harmony. Each classic progression now declares its true mode,
  which fixes a long-standing quirk where modal loops (Dorian groove, Lydian bright, Phrygian dark,
  Mixolydian rock) showed a plain major/minor scale instead of their own. The Mode override is
  saved with sketches and resets to Auto when you pick a new progression. Note: chord *symbols* keep their existing
  spelling; this pass fixes the key, scale and melody read-outs. Version bumped to 4.19.0.
- **See every suggested progression for a genre, and pick a chord version from a dropdown.** Two
  changes to make the sketchpad clearer. (1) A new **Suggested progressions** panel sits above the wheel
  and lists *all* the classic loops behind the chosen Genre / Emotion — not just the one the app happened
  to load — each as a tappable card showing its chords in the current key plus the Roman-numeral shape.
  The loop on the wheel is highlighted; tap another card to load it. Before, the genre only silently
  chose the top loop and the rest were invisible. (2) The per-chord **Version** control is now a
  **dropdown** listing the modifications for that chord (7th · maj7 · 6 · add9 · 9 · sus2 · sus4, with the
  minor and dominant families offering their own), keyed off the chord's base family so the list no
  longer shifts under you when you pick one. Choosing a version updates the name, the wheel, playback,
  notation, MIDI **and the guitar + piano fingering diagrams** live, and a **Reset** returns the chord to
  the colour default. Version bumped to 4.18.0.
- **Per-chord versions, plus remove and duplicate.** Tapping a chord in the strip still opens its
  guitar + piano shapes, and now also lets you re-voice **that one chord** without touching the rest: a
  **Version** row offers, by family, the triad, 6, 7 / maj7, add9, 9, and sus2 / sus4 (minor chords get
  m6 / m7 / m(add9) / m9; dominants get 7 / 9 / 7sus4). The pick beats the global Triads/7ths/9ths
  colour for that chord, and flows through the name, the wheel, playback, notation and MIDI. The card
  also has **🗑 Remove** (drop the chord — makes the progression shorter) and **＋ Duplicate** (add a
  copy right after — makes it longer), so you can shape the length chord by chord. New chord qualities
  (add9, 6, m6, m(add9), sus2, sus4, 7sus4) are first-class across audio, the stave and fingerings; the
  guitar diagram shows the nearest playable shape with a short "how to extend it" caption. Edits persist
  in sketches and clear with Reset. Version bumped to 4.17.0.
- **Installed app now updates.** The PWA service worker was cache-first with a hand-set cache name, so
  an installed Home-Screen app served a stale `index.html` forever — new versions never appeared. HTML
  is now fetched **network-first** (falling back to cache offline), so a new build shows up on the next
  online launch, and the build **stamps the cache name with the app version** automatically, so each
  release invalidates the old cache. Static assets (React, icons) stay cache-first for speed and offline
  use. Version bumped to 4.16.0.
- **More reliable section recording.** The in-app **🎸 Rec** was capturing only intermittently. Two
  fixes: (1) the live meter/pitch readout no longer runs a full pitch-detection pass 60×/second on the
  main thread — that was starving the (main-thread) audio-capture callback and dropping input; it now
  samples at ~10 Hz and the capture buffer is larger, so nothing gets dropped. (2) The note tracker now
  normalises the take, gates against the recording's *own* noise floor instead of a fixed threshold,
  and bridges brief dropouts — so a quiet or decaying guitar note is caught and stays a single note
  instead of vanishing or fragmenting. The guitar profile also detects slightly shorter notes and
  tolerates the lower clarity of a harmonically rich, decaying pluck.
- **Loop a single section.** Every section in the **Song & melody** list gains a **🔁** toggle: turn it
  on and playback confines to that section and repeats it (starting playback from there if nothing is
  playing) — for drilling a chorus, jamming over the bridge, or recording a part to a loop. Tap it again
  to release and let the song play on. The loop window follows the section as you edit the structure.
- **Record a melody onto any section — including guitar.** You can now capture a played or sung line
  straight into the arrangement. Every section in the **Song & melody** list gains a **● Rec** button:
  press it, play a single-note line into the mic (a live level meter and pitch readout show what it's
  hearing), press **■ Stop**, and the notes are pitch-tracked in-browser and written onto *that*
  section's melody grid — snapped to the key, ready to tidy. A **🎸 Guitar / 🎤 Voice** switch on the
  Rhythm panel tunes the pitch detection for each source (a plucked guitar note decays and reaches
  lower than singing, so the guitar profile lowers the noise gate, widens the low range, and lengthens
  the shortest kept note to stop decaying tails from splitting into phantom notes).
- **Choose which section an imported melody lands on.** The Rhythm panel's **🎤 Hum** and **↑ MIDI**
  imports (and the new recorder) previously always wrote onto the *first* section. A new
  **"Add imported / recorded melody to:"** picker lets you send the tune to any section — the chorus,
  the bridge, a specific verse — instead. Imports now also preserve a section's 2nd melody layer and
  instrument choices instead of overwriting them.
- **The Tune Transcriber plays nice with guitars.** The companion transcriber (`transcribe.html`) adds
  a **🎤 Voice / 🎸 Guitar** source toggle that retunes its pitch detection the same way, so a clean
  single-note guitar part transcribes as well as a hum. Copy and hints updated throughout.
- **Double-time / half-time a melody selection.** In the melody grid's **✋ Move** mode, select some
  notes (drag a box, or tap one) and the toolbar now offers **½× time** (double-time — packs the
  selection into half the space so it plays twice as fast) and **2× time** (half-time — stretches it
  over twice the space). Works on either melody layer, alongside the existing nudge (▲▼◀▶) and delete.
- **The second melody now appears on the stave, in violet.** The notation only ever read melody layer
  A, so the 2nd melody (layer B) was silent on the score even though it played back and exported to
  MIDI. Both layers are now drawn together on the same stave — the piano grand staff (right hand) and
  the guitar staff + tab alike — with the **2nd melody coloured violet** (matching its grid pills) so
  the two lines are easy to tell apart. Note extraction was also rewritten per-note, so two voices
  with different rhythms keep their own correct durations instead of the longer note being clipped to
  the shorter, and the score keeps redrawing live on every melody edit.
- **Two melodies per section, each with its own instrument.** Every song-structure block can now carry
  a second melody layer. Open a section's melody grid and hit **＋ 2nd melody**: layer **B** draws in
  violet pills over layer **A**'s teal, and an **A / B** switch chooses which layer your drawing,
  suggesting, moving and clearing affect. Each layer has its own per-section **instrument** dropdown
  (defaulting to the global Lead voice; B starts on a contrasting electric-piano so the two lines are
  audibly distinct). Both layers play back together with their own voices, and MIDI export writes each
  layer as its own track. The 🗑 B button removes the second layer.
- **The app version is shown in the header.** The eyebrow now reads the real version from `package.json`
  at build time (e.g. `v4.11.0`) instead of a hardcoded string that drifted out of date. The version is
  realigned onto the visible 4.x line (4.8 → 4.11) so `package.json`, the header and the changelog agree.
- **The Tune Transcriber — hum a melody onto a stave.** A companion app (`transcribe.html`, reachable
  from the "🎤 Hum a tune" link in the header) records your microphone — or an uploaded audio file —
  tracks the pitch in-browser with the McLeod / NSDF autocorrelation method, segments it into notes,
  quantises them to a tempo grid, guesses the key, and draws the result on a treble stave in the same
  visual language as the wheel. A live pitch readout shows what it's hearing while you sing. Export a
  standard **MIDI** melody, or hand it straight over to the Progression Wheel. Nothing leaves the device.
- **Melody import into the wheel.** The Rhythm panel gains **🎤 Hum** (loads the tune you just sent from
  the Tune Transcriber) and **↑ MIDI** (imports a melody from any MIDI file) next to the existing
  **↓ MIDI** export. Imported notes are snapped to the current key's scale and written onto the first
  section's melody grid, ready to nudge and reharmonise — closing the loop from a hummed idea to a full
  arrangement.
- **The modes arrive.** Four new progression flavours join Mixolydian rock so the church modes are now
  first-class: **Dorian groove** (`i–IV` — the minor key with a bright major IV), **Lydian bright**
  (`I–II` — major with the raised-4th supertonic), **Phrygian dark** (`i–♭II` — the flamenco/metal
  flat-2), and the **Aeolian cadence** (`i–♭VI–♭VII` — natural-minor's signature climb home). Each
  carries its own reference songs, default groove and tempo, and is reachable from the wheel, the dice,
  and new picker entries (Genres: Funk / R&B, Metal, Cinematic; Emotions: Dreamy, Melancholic).
- **A fuller borrowed-chord palette.** The *Borrowed (mode mixture)* menu gains the modal minor
  dominant **v** and the Lydian **II** in major keys, and the Dorian **VI**, harmonic-minor **V** in
  minor keys; the *Chromatic mediants* menu fills out the minor side with **III** and **VI**. Every
  borrowed chord now resolves to its true tonic/subdominant/dominant colour on the wheel.
- **More realistic instruments.** The melody lead now defaults to a real sampled **Flute** instead of
  the pure synth, so both the chords and the tune are real instruments out of the box. Sample anchors
  are also denser (gaps of ~3–5 semitones instead of ~7, extended up to C6), so notes are pitch-shifted
  far less from the nearest recorded sample — the less a sample is stretched, the more natural it
  sounds. (Offline, or if samples can't load, both still fall back to the built-in synth voices.)
- **Loads more drum beats and melody ideas.** The Drums menu grows from 7 grooves to 32 — half-time,
  funk, disco, boom-bap, breakbeat, R&B, Motown, reggae one-drop, ska, bossa, samba, tresillo, surf,
  punk, new wave, anthem, stomp-clap, march, country two-step, ballad, plus jazz-waltz / 6-8 kits. The
  melody-idea generator grows from 15 shapes to 38 — two-bar arch, zig-zag, skipping thirds, leap &
  fill, pentatonic hook, high-to-low hook, repeated pairs, turn ornament, fanfare, chord-climb, bluesy
  lick, off-beat syncopation, eighth-note riff, sparse, pickup, mirror, cascade, four-bar climb, and
  more.
- **Fix the piercing squeal at its real source: the plucked-string feedback loop.** The Karplus–Strong
  guitar/pluck voice (the default chord sound, and the offline fallback for any pluck instrument) fed
  its delay line back at a gain right up to 0.995. A real Web-Audio delay+filter loop carries a little
  excess gain, so a feedback that near unity doesn't decay — it self-oscillates and builds into a
  runaway squeal that the limiter then holds at full scale. This fired on the very first strum, with
  Real on or off, which is why it survived every earlier fix. The feedback is now hard-capped at 0.8
  (measured stable, verified by offline rendering), so plucks decay cleanly instead of squealing.
- **Metronome click is now off by default, behind a new Click toggle.** A high square-wave tick was
  playing on every beat during playback — piercing, and present from the first beat regardless of the
  Real toggle or instrument. It is now silent unless you turn on the new **Click** toggle (Rhythm
  panel), so normal playback is clean.
- **Guitar tab now sits in first position.** The tab previously stacked the whole melody on the high
  E string (often above the 12th fret, and dropping notes that ran past fret 14). It now transposes
  the melody by a whole octave into the guitar's first position and spreads the notes across the
  strings, keeping as many as possible within the first five frets.
- **Fix the piercing squeal when Real is on, for good.** Repitching a sample is asymmetric —
  shifting it *down* just sounds lower and warmer, but shifting it *up* thins it into a squeal. The
  single symmetric limit couldn't win: it had to be wide enough for a chord's octave-*down* bass
  note, which then also permitted a squealing octave-*up* melody note. Split it into separate up/down
  limits (a small up-shift, a generous down-shift) so chords keep their bass and high melody notes
  fall back to the synth instead of squealing.
- **Fix chords playing the wrong (synth) voice and harsh/distorted sound.** The previous release's
  sample-coverage guard was too strict: a chord's bass note sits an octave below the lowest sample
  anchor, which the guard mistook for an out-of-range note and so silently forced *every* chord onto
  the fallback synth — making the instrument dropdown appear to do nothing and stacking gritty
  synth-pluck voices. The threshold now allows the intended octave repitch while still blocking the
  genuine multi-octave squeal. The master limiter is also firmer (higher ratio, faster attack, lower
  make-up gain) so stacked/ringing voices can't sum past full scale and clip into distortion.
- **Beamed eighth-notes on the stave.** Consecutive eighth-notes within a beat are now joined with a
  beam instead of each carrying its own flag, as in real notation — much cleaner for busy melodies.
  Lone eighths still get a flag; quarter-notes and longer are unchanged. Bars are also a little wider
  so the notes have more breathing room.
- **Fix piercing squeal after turning Real on.** Real samples became "ready" the moment a single
  note anchor finished downloading, so notes far from that one anchor were repitched by octaves into
  a shrill, over-loud artifact until the rest loaded. Repitching is now capped to a nearby anchor;
  any note without one falls back to the synth voice (per note for the melody, per chord for
  harmony) until enough anchors have loaded.

## 3.13
- **~90 real instruments**, categorised. The **Sound** (chords) and **Lead** (melody) pickers now
  offer the full General MIDI palette — pianos & keys, mallets & bells, organs & accordion, guitars,
  basses, strings & harp, ensemble & choir, brass, reeds, pipes, synth lead & pad, and world
  instruments — each grouped under an `<optgroup>` heading. Any of them plays as a real FluidR3
  sample (loaded lazily only for what you pick), and offline each falls back to a synth voice chosen
  by the instrument's family (plucked, keys, organ, sustained/bowed pad, mallet, or bass — including
  a new sustained pad voice). The Lead menu keeps its original pure-synth voices in a separate
  "Synth (no download)" group.

## 3.12
- **Realistic instrument sound**: playback can now use **real recorded instruments** instead of pure
  synthesis. A **Real** toggle (Rhythm panel, on by default) loads FluidR3 soundfont samples from a
  CDN on first play, pitch-shifting a handful of note anchors to cover the range so downloads stay
  small; the service worker caches them for offline use.
  - **Chords**: guitar, piano, organ and bass play as samples.
  - **Melody**: leads that map to a real instrument (Flute, Strings, Brass, Electric piano, Organ,
    Voice, Music box, Bell, Pluck — marked **◈** in the Lead menu) play as samples too; the pure
    electronic timbres (Synth lead, sine, saw, square, glass…) stay synth.
  - **Fallback synth** (offline / load failed / Real off) is much improved: the guitar uses
    **Karplus–Strong** plucked-string modelling, the **drum kit** is richer (layered kick with beater
    click, two-tone snare with wire rattle, metallic hats), and everything runs through a
    **convolution reverb** with a master **limiter** so nothing clips or sounds bone-dry.
- **Layout**: a sticky **Play** button (with tempo) now sits at the top, always in reach. The
  **Sound** and **Lead (melody)** pickers moved up next to the chord-colour menus, above the wheel.
  The **Rhythm** and **Song & melody** panels have a lighter accent background so they stand out, and
  the Rhythm panel's Real / Legato toggles share the row with Pattern and Drums.

## 3.11
- **Move melody notes as a group**: every melody grid has a **✎ Draw / ✋ Move** switch. In Move
  mode, drag a box anywhere across the grid to select the notes inside it (or tap a single note),
  then drag any selected (blue) note to move the whole group — it shifts in time and pitch together
  (a live preview shows where it lands). Arrow buttons nudge the selection by a step or a scale
  degree and **🗑** deletes it. Works with mouse and touch. Draw mode keeps the original tap-to-add
  behaviour.
- **Group reorder**: the chord strip has a **⇄ Reorder** mode. Tap several chords to select them,
  then **◀ Move / Move ▶** shifts the whole selection as a block; **↺ Straighten** restores the
  original order. The new order flows through everything downstream — playback, melody and the
  stave. Reorderings save with the sketch.
- **On the stave**: a new notation panel writes the song out as real music. **Piano** draws a grand
  staff — the melody in the right hand, the chord voicing held in the left, chord symbols above each
  bar. **Guitar** draws a treble lead sheet with the melody (sounding an octave lower) and fret
  numbers on a tab staff below; with no melody it shows the chord voicings as a chord chart. Follows
  the selected song structure, or the loop.

## 3.10
- Suggested melodies: every melody grid now has a **Write / Suggest** tab pair. The Suggest tab
  offers 16 common melody shapes — chord-tone arpeggios (up / down / rolling) that follow the bar's
  chord, scale runs, waves, neighbour tones, pedal tones, call & response, question & answer, AA / AB
  / AABA motif forms, ascending / descending sequences and leaping figures. Pick a pattern and a
  starting scale note and "Write to grid" lays it straight onto the section's melody, ready to edit;
  "Clear melody" wipes the section.

## 3.9
- Live section highlight: the currently playing pass lights up in the song list (accent border,
  play marker), and the playback readout names it (V2 verse - bar 3 of 40).
- Tap any pass (its title or the play button) to start playback from that point in the song.

## 3.8
- Installable PWA: web manifest, app icons, offline service worker (caches the app and React), and
  localStorage sketch persistence on the web build. Add to Home Screen on iPhone gives a
  full-screen, offline-capable app whose sketches survive restarts.

## 3.7
- Song write-out grouping: adjacent passes of the same section type sit inside a colour-coded
  bounding box with a group label (VERSES x2, CHORUS ...); section badges take the same colour.

## 3.6
- Per-pass melodies: the Song & melody panel now lists the song in performance order, one entry per
  pass (Verse ×4 → V1 V2 V3 V4), each with its own collapsible melody grid; "copy" seeds a pass from
  an earlier sibling. Playback follows each pass's own melody. The separate section legend and form
  line are gone — the sequential list *is* the structure.

## 3.5
- Melody and song structure merged into one "Song & melody" panel: each section of the chosen
  structure carries its own collapsible melody grid, so the melody develops through the song
  (verse / chorus / bridge tunes are independent) and structure playback plays each section's own
  melody. Loop mode gets a single Loop section grid.
- Compact single-row controls: key, genre, emotion, overlay toggles and chord-colour switch.
- Removed: ear training, chord finders (destination finder + bass harmonisations).

## 3.4
- Melody persists across everything: emotion/genre/progression changes (positional carry-over),
  key changes (degree-based transposition), colour changes.

## 3.3
- Melody anchored to chord identities: chord inserts/removals/swaps no longer wipe the grid.

## 3.2
- Melody grid at eighth-note resolution; pre-compiled `index.html` build introduced (in-browser JSX
  compilation was the dominant mobile load cost).

## 3.1
- Melody grid spans the whole loop (was a one-bar ostinato), quarter-note columns, polyphony,
  chord-labelled bar headers.

## 3.0
- Triads / 7ths / 9ths colour levels; contrast loops (second progression per section);
  tap-melody sequencer; dice; More-colour menu (borrowed, mediants, tritone subs);
  destination finder; descending-bass harmonisations; MIDI export; sketches; ear training.

## 2.x
- Rhythm section: ~30 strum patterns incl. 3/4 & 6/8, five instrument voices, drum kits, swing,
  structure playback, live section readout; melody landing-notes panel; chord fingering cards;
  colour-move dropdowns; songs panel reacts to edits; slim rewrite (-31%).

## 1.x
- The wheel with function-coloured progressions, genre/emotion selection, parallel & secondary
  dominant overlays and tap-to-apply, song references with original keys, shorthand structure
  write-outs, chord swapping.
