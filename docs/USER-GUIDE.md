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
- **Sketch save/load** — captures the full state: key, progression, edits, colour level, pattern,
  tempo, drums, instrument, structure and contrast loop.

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

Pattern (≈30 strums including 3/4, 6/8 and swung feels — ★ marks the progression's suggested one),
Sound (guitar / piano / organ / bass / double bass), Drums (synthesized kits including 3/4 and 6/8),
tempo ±5, and Play. Playback runs one chord per bar; if a song structure is selected below, it plays
the **entire written-out song**, showing the current section and bar. The current chord's pill and
its landing-note row light up as it plays. All changes (pattern, drums, tempo, chord edits) take
effect within about a tenth of a second, mid-playback.

- **Real** (on by default) — plays real recorded instruments instead of pure synthesis: the chords
  (guitar / piano / organ / bass) and any melody **Lead** marked **◈** (Flute, Strings, Brass,
  Electric piano, Organ, Voice, Music box, Bell, Pluck). The samples download from a CDN the first
  time you press Play and are then cached for offline use. If you're offline before they've cached,
  or a download fails, playback falls back to the built-in synth — an improved one: a Karplus–Strong
  plucked-string guitar, a richer drum kit, and reverb on everything. Turn **Real** off to always use
  the synth voices — handy for a guaranteed-offline, zero-download session.

Transport lives in two places: a sticky **Play** at the very top (with tempo) that's always in
reach, and Play / MIDI on the Rhythm panel. **Sound** (the chord instrument) and **Lead** (the melody
voice) are chosen above the wheel, next to the chord-colour menus.

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
