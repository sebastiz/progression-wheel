# User Guide

The app is a single page of panels, top to bottom. Everything downstream updates live when anything
upstream changes.

## Controls (top panel)

- **Key / Genre / Emotion** — the three dropdowns choose the progression. Emotion leads the ranking:
  progressions matching *both* selections come first, then the emotion's picks, then the genre's, so
  changing emotion always changes the chords. Either can be set to "Any".
- **Parallel / Sec. dominants toggles** — draw the visual overlays on the wheel (lavender dashed
  parallels; gold secondary dominants with V/x arrows into their targets).
- **Triads | 7ths | 9ths** — re-voices every chord in the app by rule. In 7ths: I→maj7, ii→m7,
  V→dom7, ♭VII→dom7. In 9ths the sevenths grow ninths. Fingerings, playback, melody landing notes
  and MIDI export all follow.
- **🎲** — random progression, key, strum pattern, and usually one secondary dominant sprinkled in.
- **Add secondary dominant / Parallel swap / More colour** — apply harmony moves directly:
  - *Secondary dominants* insert a dominant 7th before its target (✓ marks applied; select again to
    undo).
  - *Parallel swaps* replace a chord with its opposite-quality twin (borrowed from the parallel key).
  - *More colour* groups borrowed chords (iv, ♭VI, ♭VII, ♭III, Neapolitan ♭II), chromatic mediants
    (inserted right after the tonic), and tritone substitutions for any dominant.
- **Sketch save/load** — captures the full song: key, progression, edits, colour level, pattern,
  tempo, drums, kit, pump, delay, section moves, instrument, structure, contrast loop **and every
  melody part** with its register and mix.
- **↶ Undo / ↷ Redo** — sixty steps over everything above. ⌘Z and ⇧⌘Z work anywhere outside a text
  box.
- **🔗 Share** — copies a link that rebuilds the whole song, melodies included. A full song fits in
  well under a kilobyte, so it goes in a message. Opening a link loads that song straight away.

## The wheel

Major keys on the outer ring, relative minors inside. The current progression is drawn as filled
nodes — ivory = tonic function, teal = subdominant, coral = dominant — connected by an animated
path with the loop order numbered above each chord.

- **Tap a chord, then tap any note on the wheel** to swap it (everywhere it occurs). Tapping its
  original position undoes the swap.
- **Tap a gold node** (toggle on) to insert that secondary dominant before its target; tap the
  inserted chord (gold outline) to remove it.
- **Tap a lavender node** to apply the parallel swap instantly.
- **Reset** appears in the hint line whenever the progression has been edited.
- **The pill strip** below shows the loop; tap a pill for guitar and piano fingerings (open shapes
  where they exist, barre shapes elsewhere; 9th chords show the 7th shape plus which note to add).
- **Per-chord version.** That same card has a **Version** row that re-voices *just that chord* — the
  triad, 6, 7 / maj7, add9, 9, sus2 / sus4 (minor chords offer m6 / m7 / m(add9) / m9; dominants
  7 / 9 / 7sus4). The choice overrides the global Triads/7ths/9ths colour for that one chord and
  carries through the name, wheel, playback, stave and MIDI. Tap the active version again to hand the
  chord back to the global colour rule.
- **Remove / duplicate a chord.** The card's **🗑 Remove** drops the chord (shorter progression) and
  **＋ Duplicate** adds a copy right after it (longer). Both save with the sketch and clear on Reset.
- **Reorder a group** — tap **⇄ Reorder** to switch the strip into selection mode. Tap several
  chords to select them, then **◀ Move / Move ▶** shifts the whole selection one step at a time (a
  non-adjacent selection collapses into a block at its destination). **↺ Straighten** restores the
  original order. The new order drives playback, the melody and the stave, and saves with the sketch.

## On the stave

Turns the song into readable music. **Show score**, then choose **Piano** or **Guitar**.

- **Piano** draws a grand staff: the melody in the right hand (treble), the chord voicing held as a
  whole note in the left hand (bass), and the chord symbol above each bar. With no melody written
  yet, the right hand shows the chord voicing too.
- **Guitar** draws a treble lead sheet — chord symbols above, the melody on the staff (notated as it
  is written; guitar sounds an octave lower), and fret numbers on a six-line **tab** staff beneath.
  With no melody, the bars show the chord voicings as a chord chart (use the fingering card for
  playable shapes).
- The score follows the selected **song structure** if one is chosen, otherwise the loop, and it
  redraws live as you edit chords, reorder them, change key or sketch a melody.

## Rhythm

Pattern (≈37 strums including 3/4, 6/8, swung feels and sixteenths — ★ marks the progression's
suggested one, **· 16ths** marks the finer grid),
Sound (guitar / piano / organ / bass / double bass), Drums (≈53 patterns including 3/4, 6/8, dance and
sixteenths), Kit, Pump, tempo ±5, and Play. Playback runs one chord per bar; if a song structure is
selected below, it plays the **entire written-out song**, showing the current section and bar. The
current chord's pill and its landing-note row light up as it plays. All changes (pattern, drums,
tempo, chord edits) take effect within about a tenth of a second, mid-playback.

### Melody parts

Each section holds up to **six melody parts** (**A**–**F**), each with its own instrument and its
own colour — enough for a sub bass, a pad, an arp and a topline at once.

- **＋ part** adds one; **🗑** removes the part you're on. Part **A** is the section's lead and
  can't be removed.
- The **Part** buttons pick which one your edits, patterns and recordings write to.
- Grid cells are coloured by the part that owns them; a cell two parts share is split diagonally.
- **Octave** moves a part into its own register — this is what makes a bassline a bassline rather
  than a mid-range synth. New parts start where their instrument suggests: the bass part two octaves
  down, the pad one below the lead, the saw lead one above.
- **Level**, **mute** and **solo** balance the parts against each other. Solo on any part silences
  the others in that section until you turn it off.
- Exported MIDI gives each part its own **named track**, its own channel and its own **General MIDI
  instrument**, so a DAW opens the arrangement already voiced rather than with every track on piano.
  Register, level (as velocity) and the accent curve all carry across; a muted part exports silent.

### Delay

The **Delay** menu in the top panel sets a tempo-synced echo — *Dotted 8th* (the dance default),
*Eighth*, *Quarter* or *Sixteenth*. Nothing is echoed until you send a part into it: each melody
part has its own **Echo** slider in its mixer row, so you can throw just the lead into the delay and
leave the bass dry. The delay returns through the section-move filter, so a build sweeps the repeats
along with everything else.

### Builds, drops and risers

Every section group carries a **🎛** menu beside its **🥁** one. That's the arrangement move for
that section — the thing that makes dance music move without the chords changing:

- **Build · filter opens** — the mix starts muffled and opens up across the section.
- **Build + riser** — the same, with a noise sweep rising underneath into the next section.
- **Drop · slam open + crash** — full brightness plus a crash and a sub boom on the downbeat.
- **Fade · filter closes**, **Underwater · stays shut**, **Swell · opens then shuts**.

The sweep runs across the section's **whole length**, so it lands exactly on the boundary whether
that section is four bars or sixteen — change the structure and the move re-times itself. Put
*Build + riser* on a pre-chorus and *Drop* on the chorus to hear the point of it.

### Sixteenths

Most rhythms divide each beat in two. The ones marked **· 16ths** divide it in four, which is where
dance rhythm lives — the offbeat stab, the skipping garage accent, the rolling hat.

- Picking a 16ths rhythm **doubles the melody grid** to sixteen columns a bar, so you can write 16th
  toplines, arps and offbeat lines. Switch back to an eighth-note rhythm and any melody you've
  written is re-timed so every note stays where it sounds.
- The drum patterns at this resolution (*House · 16th hats*, *Techno · driving 16ths*, *UK garage
  2-step*, *Drum & bass*, *Amen break*, *Big beat breaks*, *Trap · rolling hats*, *Dubstep*,
  *Hip-hop 16ths*, *Footwork*) can be used with any rhythm — an eighth-note strum with a sixteenth
  kit works fine, and so does the reverse.
- **Swing** on a 16ths rhythm is a sixteenth shuffle rather than an eighth one — that's the UK
  garage and 2-step feel. Try *Swung 16ths* with *UK garage 2-step*.

### Dance kits and the pump

- **Kit** revoices whatever drum pattern you've chosen. *Acoustic kit* is a normal drum kit;
  **TR-909** is the house and techno machine — a tight punchy kick with a hard click on top and
  bright metallic hats; **TR-808** is the trap and hip-hop machine, whose kick is a long tuned
  sub-boom that rings for most of a beat.
- **Pump** is sidechain ducking — the kick pulls the chords and melody down and lets them breathe
  back before the next one. That rhythmic swelling is the pulse under nearly every house, techno
  and EDM record, and it's what makes four-on-the-floor feel like it's moving rather than just
  repeating. Try *Classic pump* with the *House (909)* drums. It follows whichever kick is actually
  playing, so **it needs a drum pattern with a kick in it** — a section you've silenced with its own
  🥁 menu won't pump.
- The dance drum patterns (*House (909)*, *Deep house*, *Tech house*, *Techno*, *Trance*, *Big
  room*, *UK garage 2-step*, *Nu-disco*, *Trap*, *Dubstep half-time*, *Electro house*) use six voices
  the acoustic patterns don't: open hat, clap, rim, ride, crash and an 808 sub-boom.
- The four dance progressions — **The EDM anthem**, **Deep-house groove**, **The festival lift** and
  **Future-bass swell** — arrive with a matching pattern, kit and pump already chosen, so you can
  pick one and just press Play. Everything else starts on the acoustic kit with no pump.

- **Real** (on by default) — plays real recorded instruments instead of pure synthesis: the chords
  (guitar / piano / organ / bass) and any melody **Lead** marked **◈** (Flute, Strings, Brass,
  Electric piano, Organ, Voice, Music box, Bell, Pluck). The samples download from a CDN the first
  time you press Play and are then cached for offline use. If you're offline before they've cached,
  or a download fails, playback falls back to the built-in synth — an improved one: a Karplus–Strong
  plucked-string guitar, a richer drum kit, and reverb on everything. Turn **Real** off to always use
  the synth voices — handy for a guaranteed-offline, zero-download session.

Transport: a sticky **Play** at the very top (with tempo). **↓ Export MIDI** and **↓ Export audio**
sit in **Song & melody** — MIDI for a DAW, a .wav for everywhere else. The audio render uses the
same engine as playback, so it sounds like what you heard.
**Sound** (the chord instrument) and **Lead** (the melody voice) are chosen above the wheel, next to
the chord-colour menus. Both offer the full **General MIDI palette — about 90 instruments grouped by
category** (pianos, mallets, organs, guitars, basses, strings, ensemble & choir, brass, reeds, pipes,
synth lead & pad, world). With **Real** on and a connection, each plays as a real recorded sample
(downloaded only for the instrument you pick); offline, each falls back to a synth voice matched to
its family. The Lead menu also keeps its original pure-synth voices under "Synth (no download)".

No sound on iPhone? Check the ring/silent switch — it mutes all web audio.

## Melody notes

- **The scale** for the current key, pentatonic notes filled — safe over every diatonic bar.
- **Landing notes per chord** — each chord's strongest melody targets (root / 3rd / 5th / 7th…).
  Notes outside the key show gold ("chromatic"): strong landings during that chord's bar only.
- **Sketch a melody** (**Write** tab) — an eighth-note, polyphonic grid across the whole loop, one
  column per eighth, grouped by bar under each chord's header. Tap cells; stack cells in a column for
  harmonies. Melodies are stored as scale degrees, so they transpose with the key, and they are
  anchored to chords, so inserting/removing/swapping chords never wipes them. Changing to a
  different progression carries the melody over positionally.
- **Move notes as a group** (**Draw / Move** switch on the Write tab) — in **✋ Move** mode, **drag a
  box** anywhere across the grid to select the notes inside it (or tap a single note to select it);
  the chosen notes turn blue. Then **drag any selected (blue) note** to move the whole group — it
  shifts in time (columns) and pitch (scale degrees) together, with a live preview. The arrow buttons
  nudge the selection ▲▼ by a scale step or ◀▶ in time, and **🗑** removes it. **✎ Draw** mode keeps
  the original tap-to-add-or-remove behaviour. The move clamps to the grid, so a selection never
  falls off the edge.
- **Suggested melodies** (**Suggest** tab) — pick a common melody shape and a starting scale note,
  then **Write to grid** lays it onto the section so you can hear it and edit from there; **Clear
  melody** empties the section. The 16 shapes cover chord-tone arpeggios (up / down / rolling, which
  follow each bar's chord), scale runs, waves, neighbour tones, a repeated pedal tone, call &
  response, question & answer (resolving to the tonic), the AA / AB / AABA motif forms, ascending and
  descending sequences, and wide leaping figures.

## Song & melody

Structure and melody live in one panel, and the song is listed in performance order — one entry per
pass, so Verse ×4 appears as V1 V2 V3 V4, each with its own collapsible **melody** grid (● marks a
pass that has notes). Write a different tune for every verse if you like, or tap **copy V1** on an
empty pass to seed it from an earlier sibling and then vary it. Playback follows each pass's own
melody through the whole song. With no structure selected, a single Loop entry carries the melody. The scale
strip and a collapsible landing-notes reference sit at the top of the panel. Melodies are stored as
scale degrees anchored to chords, so they survive edits and transpose with the key.

**Melodic narrative — a whole song's melody in one pick.** Under the structure chooser is a
**Melodic narrative** menu. A melody pattern (in a section's Suggest tab) shapes one section; a
narrative is one melodic *idea told across the whole song* — pick one and it writes melody **A** of
every section at once, choosing each section's register, note density and contour from what that
section is (verse, chorus, bridge, intro…), which pass of it this is, and where it sits in the
running order. That's how the shapes differ from patterns: *Range expansion at the hook* keeps
verses inside two or three notes and opens the whole octave for the chorus; *Withheld peak* spends
the top note only in the final section; *Terraced* climbs a step per bar; *Long climb* lifts every
section a little above the last. The 19 narratives cover contour (arch, song-length arch, waves,
descending lament, cascading sequence, leap-and-fill, speech contour), architecture (question &
answer, call & response, motif development, terraced build, withheld peak, long climb, range
expansion), and texture (ostinato cell, widening pendulum, chant-then-release, chord-locked hook,
suspension chain). Each shows what it does and a few songs that do it. **↻ Rewrite** re-runs it —
after a key change, a new structure, or edits you'd rather throw away — and **↶ Undo** puts the
melodies back as they were. It writes to layer A only, so a 2nd melody you've written stays put, and
everything it writes is ordinary grid notes: edit any section afterwards.

**Loop one section.** Each section entry has a **🔁** toggle. Turn it on and playback confines to that
section and repeats it (and starts from there if nothing's playing) — handy for drilling a chorus or
recording a part against a loop. Tap it again to release and let the whole song play through.

**Record a melody onto a section.** Each section entry has a **🎸 Rec** (or **🎤 Rec**) button. Press it, play (or sing)
a single-note line into your device's mic — a live level meter and pitch readout show what it's hearing
— then press **■ Stop**. The line is pitch-tracked in the browser and written straight onto that
section's melody grid, snapped to the current key. Use the **🎸 Guitar / 🎤 Voice** switch on the Rhythm
panel to tell it what it's listening to (this retunes the noise gate, pitch range and note-splitting for
a plucked, decaying guitar note versus a sung one). Nothing leaves the device. It's a sketch aid — play
clean single notes, one at a time; chords and heavy distortion won't transcribe.

**Send an imported tune to a chosen section.** The Rhythm panel's **🎤 Hum**, **↑ MIDI** and the recorder
all obey the **"Add imported / recorded melody to:"** picker there — pick the chorus, the bridge or a
particular verse and that's where the notes land (default: the first section).

## Song structure (details)

Choose a form (progression-specific ones plus five universal forms) and the whole song writes out:
a section legend (**V** verse · 4 bars · chords), a left-to-right form line (`I · V×2 · P×2 · C×2 …`),
the craft tip, and a total bar count. **Contrast loop ②** assigns a *different* progression to the
choruses, bridge or verses — the write-out marks those sections ② and playback switches loops live.

## Songs on this progression

Ten reference songs per progression; pick one to see the progression spelled in that song's own key.
When you've edited the progression, the panel first lists songs that use your applied *moves*
(Creep for V/vi and iv, Take the 'A' Train for V/V, …), since exact catalogue matches get rarer.

## MIDI export

↓ MIDI downloads the current arrangement — the full structure if one is selected, otherwise the
loop — as a standard .mid with a chord track and drum track at your tempo, ready for any DAW.
