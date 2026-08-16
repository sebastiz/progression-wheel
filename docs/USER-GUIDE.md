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

## Song structures

The structure menu at the top of **Song & melody** is grouped: structures written for the current
progression, then **Song forms**, **Dance & electronic** and **Club edits** — fifty in all.

The dance ones are phrased the way dance music actually is, in 8- and 16-bar groups, and most open
and close on a sixteen-bar section a DJ can mix over. **Club edits** are the same song at three
lengths — *Radio edit*, *Club mix*, *Extended mix* — which is a different decision from picking a
genre, and worth trying on a song you already like.

## Rhythm

Pattern (≈37 strums including 3/4, 6/8, swung feels and sixteenths — ★ marks the progression's
suggested one, **· 16ths** marks the finer grid),
Sound (guitar / piano / organ / bass / double bass), Drums (≈53 patterns including 3/4, 6/8, dance and
sixteenths), Kit, Pump, tempo ±5, and Play. Playback runs one chord per bar; if a song structure is
selected below, it plays the **entire written-out song**, showing the current section and bar. The
current chord's pill and its landing-note row light up as it plays. All changes (pattern, drums,
tempo, chord edits) take effect within about a tenth of a second, mid-playback.

### Melody rhythm

A section's **Suggest** tab has two independent choices: the **melody pattern** (the shape — arch,
arpeggio, question and answer) and the **Rhythm** (where the notes fall and how long each lasts).
Keeping them separate is the point: the same shape can be square, syncopated or spacious.

Thirteen cells, from *On the beat* through *Long–short*, *Pushed*, *Off the beat*, *Tresillo*,
*Charleston* and *Gallop* to *One held note* and *Question & space*. Each is written in beats, so it
works on an eighth or a sixteenth grid and in 3/4 as well as 4/4.

A whole-song **melodic narrative** picks a rhythm per section from its role — intros hold, verses
converse, pre-choruses push, choruses land squarely, bridges sit off the beat — so one narrative no
longer writes the same rhythm everywhere.

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

### Counter-melodies

The pattern menu has five entries that write a second line *against* one you already have, rather
than another tune on its own: **a third below the lead**, **a sixth below**, **answer in the gaps**,
**contrary motion** and **held pedal**.

Write your lead on part A, add a part B, pick one of these and it tells you which part it is writing
against before you commit. If nothing else in the section has notes yet it says so and won't write —
there'd be nothing to answer.

*A third below* is the instant-arrangement one. *Answer in the gaps* plays only where the lead rests,
so the two parts trade rather than crowd. *Contrary motion* moves the opposite way to the lead, which
is the strongest way to make two lines sound independent rather than doubled.

### Basslines

The **Suggest** tab's pattern menu ends with seven basslines: *root on the one*, *offbeat (house)*,
*driving eighths*, *rolling sixteenths*, *tresillo (3+3+2)*, *pumped (1 and the &-of-3)* and
*walking the chord*. Unlike the melody patterns above them they bring their own rhythm rather than
taking it from the **Rhythm** menu, because a bassline is defined by its rhythm far more than by its
notes. They follow each bar's chord, so they re-voice themselves when the harmony changes.

Put one on a part with a bass instrument and its octave dropped — parts C onward already default
that way. *Driving eighths* and *rolling sixteenths* want a sixteenth **Pattern** to fit properly;
on an eighth grid there is no room between the notes, so *driving eighths* writes quarters instead
rather than pretending.

### Arp, Gate and Pump — per part

Under each part's Octave/Level/Echo row are the three controls that turn a tune played on a synth
into something that sounds like dance music.

**Arp** takes the chord under each bar and walks its notes instead of playing what's written on the
part's grid — *Up*, *Down*, *Up & down*, *Converge*, *Thumb & top*, *Random*, *Octaves*. Set the
rate (down to 1/32) and how many octaves it climbs. The point is that it follows the harmony: change
a chord, reorder the loop, switch key, and the arp re-writes itself. Nothing to re-enter. While a
part is arping its grid is ignored — clear the Arp menu to go back to the written notes.

**Gate** chops the part into a rhythmic pulse — the trance gate. *Eighths*, *Sixteenth run*,
*Offbeat eighths*, *Trance gate*, *Dotted*, *Stutter*, *Tresillo*, *Half-time*. It works best on
something that would otherwise be held: a pad, a long chord, a slow arp. The echo send is taken
after the gate, so a gated part throws gated repeats rather than smearing over its own gaps.

**Pump** is that part's own sidechain depth. Left at *auto* it follows the global **Pump** menu;
move it and the part gets its own. This is what separates a mix that pumps from one that ducks: the
bass and the stabs move hard under the kick while the pad barely breathes.

### Swing and Feel

Two sliders in the top panel, next to Pump.

**Swing** delays every offbeat. Dead straight at 0%, a triplet shuffle around 33% — but the useful
settings are the small ones in between, which is where the house and UK garage feels live.

**Feel** is humanise: it nudges each hit a few milliseconds early or late and varies how hard it
lands, so a programmed pattern stops sounding typed. The variation is fixed rather than random, so
what you render is exactly what you heard.

### Dance instruments

The **Lead** menu (and each part's own instrument menu) has six voices built for this, under
*Synth (no download)*: **Supersaw** (the trance/EDM wall of detuned saws), **Hoover** (the rave
stab that slides down into the note), **Acid 303** (resonant, squelchy — try it with an arp),
**Reese bass** (the detuned drum-and-bass growl), **Sub bass**, and **House stab**. They need no
download and work offline.

### The arrangement strip

Above the section list, once a structure is chosen, is the whole song on one line: a block per
section, as wide as that section is long, with the bar numbers along the top. Repeats are one block
— *Chorus ×2*, *Drop ×8* — because that is how you think about them.

Under the blocks is a lane for each thing that can play: **Drums**, **Chords**, and one per melody
part (**A**, **B**, …). A lane is lit where that element is playing and dark where it isn't, so the
picture tells you what the song's dynamics actually are: drums dropping out for the verses, the pad
only arriving at the chorus, the bassline sitting out the breakdown. A half-lit lane means the
element is on for some passes of that section but not others. **Tap any block to play from there**,
and a gold playhead runs across every lane as it goes.

**The lanes are clickable.** Tap a cell to drop that element for that section, tap again to bring it
back — so the strip is where you *build* the arrangement, not just where you look at it. Drop the
drums for the verses, take the chords out of a breakdown, keep a pad off the intro, all without
leaving the strip.

One thing worth knowing, because the tooltip on each cell will tell you and it is easy to miss:
**drums and chords are set per section type, parts per section.** Dropping the drums on *Verse 1*
drops them on every verse; muting part A on a *Chorus ×2* mutes it for both passes of that chorus
but leaves the later choruses alone. Hover before you click and it says exactly what it will do.

### Automation — Filter and Level

Under the element lanes are two taller lanes: **Filter** and **Level**. Drag across one to draw a
curve — left to right is the song, and how high you drag is the value. The **✕** in the corner
clears it.

**Filter** sweeps the brightness of the whole mix, drums included. It's the DJ filter: draw it low
through a breakdown and climbing through the build, and the drop opens up on its own. **Level**
rides the overall volume — fades, and the moment of near-silence right before a drop.

The difference between this and a section's **🎛** move is that a move is a preset applied to one
section, while a curve is yours and can run across as many bars as you like. They stack, so you can
use both.

Curves are drawn in song bars, so they stay where you put them when you move sections around.

### Editing the arrangement

Under the strip is **✎ Edit arrangement**. Turn it on and tapping a block picks it instead of
playing from it; a toolbar appears with everything you can do to that section:

- **◀ ▶** move it earlier or later in the song
- **− pass / ＋ pass** make it shorter or longer — this is how you turn an 8-bar drop into a 16-bar one
- **⧉ Copy** duplicate it, notes and all
- **🗑** remove it
- **＋ add section…** insert a new one after it

**Your melodies travel with their sections.** Move a chorus and its notes go with it; copy one and
the copy arrives already written; stretch a section and the new passes repeat what was there rather
than coming back blank. Only a section you *add* starts empty, which is what you'd want.

Nothing you do here touches the structure in the menu — it's a copy. **↺ Reset** throws your edits
away and puts the original back, and an **edited** marker tells you when you're on a changed version.

This is the quickest way to spot the thing that makes a sketch sound flat — every lane lit end to
end, nothing entering, nothing dropping out — and now the quickest way to fix it too.

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
  garage and 2-step feel. Try *Swung 16ths* with *UK garage 2-step*, then pull the **Swing** slider
  back to somewhere in the teens, which is where that feel actually sits.

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

Every file the app writes is named for the sketch, its key and its tempo — *Night Drive Cm 128bpm.mid*
— because it is going to land in a folder next to a dozen others and "progression-wheel.mid" tells
you nothing an hour later.

**↓ MIDI ×tracks** gives you one MIDI file per source — chords, drums and each melody part — zipped.
The single **↓ Export MIDI** file is the right thing for a DAW that imports multi-track files
properly; plenty don't, and plenty of people would rather drag one part onto one track than untangle
a merged import. Each file keeps the tempo map and the section markers, so it lands at the right
speed with the arrangement marked however you bring it in.

**↓ Chart** writes a plain-text chord chart — the form, the chords bar by bar and the running time —
for handing to somebody who plays an instrument rather than to a DAW. **⧉ Copy chart** puts the same
thing on the clipboard for pasting into a message. It reads like this:

```
Night Drive
C minor · 96 bpm · 4/4
Form: Radio pop

INTRO  (4 bars, from bar 1)
| C | G | Am | F |
  — instrumental

VERSE 1 ×2  (8 bars, from bar 5)
| Am | F | C | G |
```

### Keyboard, tap tempo, A/B and autosave

**Space** starts and stops. **Esc** stops. **[** and **]** nudge the tempo by one, with **shift** for
five. **⌘Z** / **⌘⇧Z** undo and redo. None of them fire while you're typing in a text box.

**👆 Tap** next to the tempo: tap it in time with what's in your head and it takes the tempo from
you. It averages the gaps rather than using the last one, so a shaky tap doesn't throw it, and a
pause of more than a couple of seconds starts a fresh count.

**⇄ A/B** takes a sketch in two directions. The first press starts B as a copy of A; change it, then
press again to flip between the two. Neither is saved anywhere — it's for deciding, not for keeping,
so save the one you want. (B is lost if you close the tab; A is not, see below.)

**Autosave.** Your working sketch is written back automatically and restored next time you open the
app. Opening somebody's **shared link** always wins over it — you get their song, not yours.

Transport: a sticky **Play** at the very top (with tempo). **↓ Export MIDI**, **↓ Export audio** and
**↓ Export stems** sit in **Song & melody** — MIDI for a DAW, a .wav for everywhere else, stems for
when you want to keep working on it. The audio render uses the same engine as playback, so it sounds
like what you heard.

**↓ Export stems** bounces the drums, the chords and every melody part to its own .wav and hands you
the lot as one .zip. Unzip it, drag the files onto a DAW timeline, and each source lands on its own
track already lined up — so you can re-balance the mix, swap the drums for your own, or keep only
the bassline. The files are numbered and named for what they are
(`01-drums.wav`, `02-chords-acoustic_guitar_steel.wav`, `03-part-A-flute.wav`), and a part that is
muted or empty is left out rather than shipped as a silent file.

Two things worth knowing about the stems. They add back up to exactly the mix you hear, so nothing
is lost by working from them instead of the .wav. And they're **pre-master** — the limiter that
catches peaks on the single-file export is deliberately off, because your DAW's own master chain
should be doing that job. Expect them to sound a touch quieter and more dynamic than the .wav until
you put something across the master bus.

The MIDI file carries the **arrangement**, not just the notes: a marker at every section boundary so
*Intro / Build / Drop* land on your DAW's timeline, plus the time signature and key signature. Open
it and the session is already laid out.
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
