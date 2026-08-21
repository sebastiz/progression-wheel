# User Guide

The app is five tabs of panels. Everything downstream updates live when anything upstream changes.

## Finding things

The app is in five tabs, under the transport bar:

- **Write** — key, how many chords, mode, genre, feeling, the wheel, the chord strip, the stave and
  the songs that use this progression.
- **Sound** — the instruments, the time signature, the strum pattern, the drums and kit, and the
  feel controls (delay, pump, swing, humanise).
- **Sketch** — the subtractive workflow on one page, kept apart from the song until you commit it.
  Build the **full groove** as a single looping section (drum, perc, bass, pad and chord grids,
  melody parts and every track's settings; ▶ 🔁 loops the full stack, whatever the song is doing).
  Underneath, draft the **arrangement**: add intro, build, drop and breakdown — each section
  arrives silent — then click the cells to fill it with the groove's instruments: drums alone for
  the intro, bass and pads with no kick for the build, everything for the drop. Nothing is heard
  until **✍ Write to Arrange**: the draft becomes the song's arrangement, every section playing
  exactly what you filled in, ready to refine pass by pass on the Arrange tab. Sections keep following the groove until you give them something of their own,
  so a groove edited later is still heard everywhere it hasn't been overridden.
- **Arrange** — the song structure, the melodic narrative, the arrangement strip with its automation
  lanes, every section's melodies, and the exports.
- **Save** — naming a sketch, saving it, sharing a link, and loading one back.

**Play, the tempo, tap tempo, A/B, undo and redo stay visible on every tab** — they act on the whole
song, not on whichever page you happen to be looking at. So do the keyboard shortcuts.

On **Write**, **◑ Hide wheel** folds the circle away once you have chosen a progression. The chord
strip stays either way, since that is the part you actually edit.

## Controls (Write and Sound tabs)

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

**Chords** sits next to Key: how many chords the loop has, from two to eight. Fewer takes the first
few of the progression; more adds diatonic chords it hasn't used yet, so a four-chord axis grown to
six gains a ii and a iii rather than just repeating itself. The dot marks the progression's own
length. An odd number still plays as an even phrase — the last chord simply holds an extra bar.

**Time** sits at the front of the rhythm row: **4/4**, **3/4**, **6/8** or **5/4**. Everything in
that row is filtered to the meter you pick, and changing it moves you to a strum pattern and a kit
that fit — a 4/4 kit left behind in a 5/4 bar would just fall silent. 3/4 and 6/8 are the same length
of bar and share their kits; they differ in how you count them, and in what a DAW is told (6/8
exports as 6/8, not as 3/4 with the accents in the wrong place).

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
element is on for some passes of that section but not others. A gold playhead runs across every lane
as the song plays, and a rule at every section boundary carries down the whole strip so a column
reads as one column.

**Tap a block to open that section underneath the strip**, and only that one — a twelve-section song
is a very long page otherwise, and all of it is off screen except the section you are working on.
**▾ All sections** writes them all out again, and while it is on, tapping a block scrolls to that
section instead of swapping it. **Double-tap a block to play from there**, or use the ▶ on the
section's own card.

Under the element lanes is **Energy**: a bar per section as tall as what that section plays adds up
to. It is scaled against the loudest section of this song rather than an absolute ceiling, because
that is how energy works in an arrangement — a drop lands by how far it stands above the breakdown
before it. Read it as a staircase, and expect the biggest step *down* to be the thing that makes the
next drop land. A song where nothing changes draws flat rather than full.

**The lanes are clickable.** Tap a cell to drop that element for that section, tap again to bring it
back — so the strip is where you *build* the arrangement, not just where you look at it. Drop the
drums for the verses, take the chords out of a breakdown, keep a pad off the intro, all without
leaving the strip.

Every lane works per pass, so a click moves the section you clicked and the passes inside it and
nothing else: muting part A on a *Chorus ×2* mutes it for both passes of that chorus but leaves the
later choruses alone, and taking the drums out of *this* breakdown leaves every other one playing.
The tooltip on each cell says what it will do before you do it.

One exception, and it is the honest kind: a section written on its own drum grid plays those bars
whatever the menus say, "off" included. Its Drums cell therefore reads as in — which is what you
will hear — and the cell is not clickable, because the lane has no way to silence bars you wrote by
hand. Open **▸ drums** on the section to change them.

### Automation — Filter, Hi-pass, Resonance and Level

Under the element lanes are the drawn automation lanes. Drag across one to draw a
curve — left to right is the song, and how high you drag is the value. The **✕** in the corner
clears it.

**Filter** sweeps the brightness of the whole mix, drums included. It's the DJ filter: draw it low
through a breakdown and climbing through the build, and the drop opens up on its own. **Hi-pass**
is the same filter's other half: the bottom of the lane is off, and dragging up drains the bass out
of the whole mix. Draw it climbing through a build and snapping back to the bottom at the drop, and
the low end coming back *is* the drop — the more modern build, where Filter is the classic one.
**Resonance** sets how hard those two bite: at the bottom they are polite, at the top a sweep
squelches like an acid line. **Level** rides the overall volume — fades, and the moment of
near-silence right before a drop.

Below those is a **filter lane per melody part** (*A filter*, *B filter*, …): that one part's
brightness across the song, so the pad can open through a build while the bass stays dark.
Wherever a part's lane is drawn it overrides that part's **Low-pass** knob; clear the lane and the
knob is back in charge.

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

Every section group carries a **🎛 Move** menu beside its **🥁 Drums** one. That's the arrangement
move for that section — the thing that makes dance music move without the chords changing:

- **Build · filter opens** — the mix starts muffled and opens up across the section.
- **Build + riser** — the same, with a noise sweep rising underneath into the next section.
- **Build · bass drains away** — the top stays; the low end drains out across the section, so the
  next section lands when the bass comes back.
- **Drop · slam open + crash** — full brightness plus a crash and a sub boom on the downbeat.
- **Fade · filter closes**, **Underwater · stays shut**, **Telephone · mids only**,
  **Swell · opens then shuts**.

The sweep runs across the section's **whole length**, so it lands exactly on the boundary whether
that section is four bars or sixteen — change the structure and the move re-times itself. Put
*Build + riser* on a pre-chorus and *Drop* on the chorus to hear the point of it.

### Transitions — the seam between two sections

A move shapes a section. The **⇥ Way in** menu beside it shapes the *join into* one: the bar the section
arrives on. It is the half of arranging that usually gets left out, and it is most of what makes a
finished track sound finished rather than like four loops in a row.

Transitions are grouped by what they do to the seam:

| Family | What it does | Try |
| --- | --- | --- |
| **Lifts** | rise into it | *Riser · 2 bars*, *Reverse cymbal*, *Snare roll + riser*, *Bass falls away* |
| **Impacts** | land on the downbeat | *Crash + sub · the drop*, *Silence, then the drop*, *Bass drains → slam*, *The full drop* |
| **Cuts** | take something away | *A beat of silence*, *A bar of silence*, *Stutter into silence* |
| **Colour** | bend the seam | *Filter dip*, *Telephone squeeze*, *Echo throw*, *Reverb wash*, *Duck through the seam* |
| **Falls** | let it down | *Downlifter*, *Tape stop*, *Fade into it*, *Spin down* |
| **Entries** | shape the first bars | *Fade in · 2 bars*, *Opens up · 4 bars*, *Bass arrives late*, *Telephone opens up* |

Three things worth knowing:

- **It belongs to the section it leads into.** Set *The full drop* on your chorus and the riser plays
  through the end of whatever comes before it, wherever you move the chorus to.
- **A lead-in can't be longer than the section before it.** A four-bar riser into a chorus that
  follows a two-bar pre-chorus shortens to two bars rather than starting inside the verse. On the
  very first section of a song there is no room at all, so a riser is simply skipped — but a crash,
  which happens *on* the downbeat, still lands.
- **Every pass can differ**, exactly like a move: the section group's **⇥** is the default for every
  chorus, and each chorus's own card can override it. The first option in a pass's menu tells you
  what it would inherit, so you can see it without pressing play.

The arrangement strip marks a section that has one with its family's glyph — ↗ ◆ ▮ ≈ ↘ → — at the
edge of the block, which is where the transition actually happens.

Risers, rolls and crashes bounce as their own **fx** stem, so you can ride them by hand in a DAW.

### Writing a section's own drums

Every section card has a **▸ drums** button beside **▸ melody**. It opens a nine-row grid — crash,
ride, open hat, hat, clap, rim, snare, boom, kick — across that section's bars, in sixteenths.

- **It opens on what is already playing.** The drum menu's pattern is laid onto the grid, so you
  start by changing a groove rather than building one from nothing. Until you click a cell the
  section is still just *following* that pattern; the header tells you which.
- **It belongs to that pass alone.** The second chorus can have the busier hat, and the last verse
  the fill, without touching the others. **copy to every chorus** puts it on the siblings when you
  do want them the same, and **↺ Reset** hands the section back to the menu.
- **Hold the button down and drag to paint a row.** Press an empty cell and you are drawing, press a
  full one and you are rubbing out, so a sixteenth hat across four bars is one stroke rather than
  sixty-four clicks — and one undo step. A drag on a touchscreen still scrolls the page; tap to
  toggle there.
- **Two pieces on one step play together** — that is all layering is here. A clap over the snare, an
  open hat on the offbeat, a crash on the first step of a chorus.
- **A snare through the last bar** is the fill a transition is waiting for: put a roll or a riser on
  the next section's **⇥** menu and the two line up.

The grid follows your time signature — 16 steps in 4/4, 12 in 3/4 and 6/8, 20 in 5/4 — and what you
write goes into the exported MIDI, the Live Set and the drum stem, because an edited bar is a drum
pattern like any other.

### Opening the song in Ableton

**↓ Live Set** on the Arrange tab writes a `.als`. Where a MIDI file gives Live bare clips, this
arrives as the arrangement: named and coloured tracks (Chords, Drums, Part A…), the right tempo, and
**every section as a locator** on the ruler.

**It is a Live 12 set.** The file is written to the schema Live 12 saves, so Live 12 opens it
directly and Live 11 and earlier will not — a set can be opened by its own version or a newer one,
never an older one. On Live 11, use **↓ Export MIDI** instead.

**The tracks arrive without instruments.** Every sound in this app is built in the browser's audio
engine, and there is no way to hand Live one — so each track waits for you to drop your own
instrument on it. That is true of the MIDI export too; it is not a limitation of the file. The drum
track's notes sit at the General MIDI numbers, which line up with a Drum Rack's default layout, so
dropping one on gives you a sensible kit straight away.

**Use ↓ Export stems alongside it.** Those wavs are what the song actually sounds like, and they
line up bar for bar with the Live Set — so you can hear what you are aiming at while you choose
instruments.

Two things that live only in the audio and cannot travel as notes: **swing and humanise** (both are
timing applied at playback, while the exported notes sit on the grid), and everything in the Sound
tab — the part effects, the pump, section moves, transitions and the automation lanes.

### Sixteenths

Most rhythms divide each beat in two. The ones marked **· 16ths** divide it in four, which is where
dance rhythm lives — the offbeat stab, the skipping garage accent, the rolling hat.

- Picking a 16ths rhythm **doubles the melody grid** to sixteen columns a bar, so you can write 16th
  toplines, arps and offbeat lines. Switch back to an eighth-note rhythm and any melody you've
  written is re-timed so every note stays where it sounds.
- You no longer have to change your strum to get that grid. The **Grid** menu on the Arrange tab,
  beside the melodic narrative, sets it directly: *as the rhythm* (the default), *eighths* or
  *sixteenths*. So you can write a sixteenth topline over an acoustic strum, or keep a simple
  eighth grid under a busy 16ths rhythm — and 3/4 and 5/4 can have a fine grid at all, which they
  couldn't before, since there is no sixteenth strum in either. Changing it re-times what you have
  written, the same way switching rhythm does.
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

**↓ Export for Claude** produces two files meant to be uploaded together in one message when you
want an AI to analyse the song: `<name>-arrangement.wav` — the full arrangement, every section in
order, rendered exactly as Play sounds — and `<name>-settings.json`, a complete snapshot of every
setting that shaped it: key and scale, tempo and meter, the running order with each section's
chords and resolved drum/bass/pad sources, every melody part's instrument, envelope, filter,
arpeggiator and sends, the effects, the sidechain and every drawn automation lane. The JSON is
written in plain words (with a built-in reference explaining each control), so the analysis can
read *why* the wav sounds the way it does, not just *that* it does.
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
  nudge the selection ▲▼ by a scale step or ◀▶ in time, and **🗑** removes it. The move clamps to the
  grid, so a selection never falls off the edge.
- **Paint a run of notes** (**✎ Draw** mode) — a tap still adds or removes one note, but **holding
  the mouse down and dragging paints the cells you cross**. The cell you press decides the stroke:
  press an empty one and you are drawing, press a full one and you are rubbing out, so dragging back
  over your own line erases it rather than flickering it on and off. The whole stroke is one undo
  step. On a touchscreen a drag still scrolls the page, so tap-to-toggle stays as it was there.
- **✦ Vary repeats** (**Write** tab, beside the Draw / Move switch) — a section is usually one motif
  said three or four times, and said identically it's the part of a sketch that wears out first. This
  finds where the melody you're editing restates itself — a one-bar riff, a two-bar hook, or a
  sequence that repeats the same shape a step higher — leaves the *first* statement exactly as you
  wrote it, and edits every restatement after it: a different landing note, a note added or taken
  away, a phrase pushed early, a held note broken in two. Later statements drift a little further
  than earlier ones, the way a fourth chorus does.

  Tap again for more (the button counts **×2**, **×3**…, up to ×5) — each tap re-derives from the
  melody you started with rather than piling edits on edits, so the motif is still the motif at the
  top of the range. One tap past the top, or **↺**, puts it back exactly as it was; ⌘Z works too. It
  acts on the part you're editing, in that section only, and it tells you what it found ("3 of 3
  repeats varied · 2-bar motif"). If nothing in the melody repeats itself there's nothing to make
  less boring, and it says so rather than rewriting a through-composed line.

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
