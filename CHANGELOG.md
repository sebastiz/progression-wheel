# Changelog

## Unreleased
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
