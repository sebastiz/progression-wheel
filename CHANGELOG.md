# Changelog

## Unreleased
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
