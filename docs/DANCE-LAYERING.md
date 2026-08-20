# Layering a Dance Track

A conceptual framework for the question *what plays, when, and why* — written for dance music, where
the arrangement carries more of the work than the harmony does. The app's structure catalogue, drum
grids, section moves, transitions and automation lanes are all tools for this; the last section maps
each idea onto the control that does it.

## Two things are called layering

1. **Stacking** — several sounds fused into *one* perceived element. A kick is a sub layer, a body
   and a click; a clap is a snap, a body and a room tail.
2. **Arrangement layering** — elements arriving and leaving across the timeline.

They obey different rules and fail in different ways, and most confusion about dance production is
the two being run together. Stacking is a mixing problem, solved in the spectrum. Arrangement is a
storytelling problem, solved in time.

## The vertical model: six roles

At any instant the track is a small set of *roles*, not a list of instruments. A track needs one of
each; it does not need five of one. The useful question about any sound is never "is this good" but
"which role is it filling, and is that role already taken".

| Role | Job | Usually |
| --- | --- | --- |
| **Clock** | States the beat, unambiguously | Kick |
| **Foundation** | Weight, and the root motion under the harmony | Sub, bassline |
| **Groove** | Subdivides the bar; the reason it moves | Hat, open hat, shaker, ride, clap, snare |
| **Body** | Harmonic identity | Chords, stabs, pad |
| **Hook** | The part you remember afterwards | Lead, vocal, riff |
| **Motion** | Marks change; never loops | Riser, impact, reverse cymbal, noise, delay throw |

Motion is the under-built one. It is not decoration — it is the connective tissue that tells a
listener a boundary is coming, and a track without it has boundaries that merely happen.

Note what the roles are *not* organised by: instrument. A bassline can be Foundation or Hook, and
which one it is changes everything about how it should be written. A pad can be Body or, filtered
down to a hiss under a build, Motion.

## The scarcity rule

Three resources are finite. Every layer spends some of each.

- **Spectrum** — sub (20–60 Hz), bass (60–200), low-mid (200–500), mid (500 Hz–2 kHz),
  presence (2–6 kHz), air (6 kHz+)
- **Rhythmic slot** — downbeat, backbeat, offbeat eighth, sixteenth grid, syncopated, or sustained
  (no slot at all)
- **Space** — mono, centred and dry ⟶ wide, far and wet

> **Two layers may share at most one of these three.**

That single line explains most of the standard techniques. Kick and sub share the spectrum, so they
must be separated in time — which is all sidechain ducking is, two sources time-sharing 50 Hz. Hat
and shaker share the sixteenth grid, so separate them by band and by pan. A pad and a lead in the
same octave, both sustained, both wide, collide on all three, and that is why the mix sounds like a
blanket rather than a band.

## Stacking one element

The same rule governs stacking, which is why layering a kick works and layering two kicks does not:

- **One layer per band.** Kick as sub (fundamental, 40–60 Hz), body (punch, 80–120 Hz) and click
  (transient, 2–5 kHz). Clap as snap, body and tail. Lead as a detuned saw stack, an octave above,
  and a noise layer for air.
- **One transient.** Two layers with attacks a few milliseconds apart read as a flam, not a bigger
  hit. Align them, and watch the phase — two aligned sub layers can cancel rather than add.
- **One fundamental.** Two full-range sounds doing the same job produce one blurrier sound, never a
  larger one. If you cannot say which band each layer owns, you are doubling, not layering.

## The horizontal model: energy as a staircase

Phrase arithmetic is not stylistic in club music, it is structural. **Four bars is a group, eight is
a phrase, sixteen is a section, thirty-two is a movement.** Entries and exits land on phrase
boundaries, because that is where a dancer and a DJ both expect them.

The working heuristic is that **something changes every eight bars** — a layer in, a layer out, a
filter opening, a variation swapped. Nothing survives thirty-two bars untouched.

Then score it. Give each element a weight, sum per section, and plot the result:

| Weight | Elements |
| --- | --- |
| 3 | Kick, sub, lead, vocal |
| 2 | Bass, clap/snare, chords |
| 1 | Hat, perc, pad, ear candy |

You are looking for a staircase with **deliberate collapses**, because of the one idea that governs
the whole form:

> **Energy is relative, not absolute.** A drop lands because the breakdown took the kick and the sub
> away, not because the drop added anything.

The corollary is the part people resist: the full stack should appear two or three times in a track,
briefly. If everything is playing by bar 32, there is nowhere left to go for the next four minutes,
and the loudest section of the track will be the least exciting one.

## The life of a layer

Every layer has four moments. Most amateur tracks implement only the second.

- **Entry** — how it announces itself. A filter opening into it, a one-shot on the beat before, or
  simply arriving on bar 1 of a phrase because the phrase is announcement enough.
- **Sustain** — its steady state, which is the least interesting thing about it.
- **Variation** — the eight-bar obligation. Mute a bar, add a ghost note, move the filter, jump an
  octave, drop the last beat.
- **Exit** — removal is an event and deserves the same care. A layer that vanishes on a boundary
  under a reverse cymbal reads as a decision; one that just stops reads as a mistake.

And a rule that resolves most transition questions: **the last bar before a boundary belongs to the
transition, not to the loop.** Fill, silence, reverse, filter slam — the loop already had fifteen
bars to make its point.

## A worked example — 128 bars at 128 BPM

Four minutes exactly, and a shape that a DJ can mix in and out of.

| Bars | Section | Stack |
| --- | --- | --- |
| 0–15 | Intro A | Kick, hat, one perc — the mix-in |
| 16–31 | Intro B | + bass, chords heavily filtered |
| 32–47 | Build 1 | + clap, ride; the filter opens across the section |
| 48–63 | Drop 1 | + lead, full drums. The full stack |
| 64–79 | Breakdown | Kick and sub **out**. Pad, vocal, reverb |
| 80–95 | Build 2 | Riser and snare roll; drums return piece by piece, kick withheld to the last bar |
| 96–119 | Drop 2 | Full stack plus one counter-element that has not been heard yet |
| 120–127 | Outro | Back to drums for the mix-out |

The largest single event in that track is at bar 64, and it is a subtraction.

## Genre calibration

The framework holds across styles; the constants change.

- **House / tech house (120–128)** — the drop is the groove returning, not an addition. Four to six
  roles at once, and changes are textural swaps more than entries.
- **Techno (130–145)** — layering *is* the arrangement. One element every sixteen bars and the
  filter does the rest; harmony is nearly static by design.
- **Trance (136–142)** — the longest breakdown and the widest dynamic swing; pad and lead carry the
  emotional argument, and the build is half the pleasure.
- **Drum and bass (172–176)** — a half-time feel over double-time drums. Drum edits cycle every two
  bars, and the drop is often only break plus sub.
- **Bass / dubstep (140)** — the drop *replaces* the harmony with mid-range movement rather than
  adding to it; almost no sustained Body underneath.
- **Big-room (128)** — the drop is deliberately sparse, frequently kick and lead alone, which only
  works because the build stacked everything.

## Failure modes

1. **Adding without ever subtracting.** The drop cannot be bigger than what came before it if
   nothing ever left.
2. **The build is denser than the drop.** Riser, snare roll and every layer at once, then the drop
   arrives quieter. Empty the first beat, or hit it with an impact and let the mix restart.
3. **Two layers on the same sixteenth in the same band.** The scarcity rule, ignored.
4. **Stacking by doubling.** Two full-range pads are one indistinct pad.
5. **Everything wide.** Nothing anchors the image. Sub, kick and lead vocal stay mono and centred;
   width is for the things that can afford to be vague.
6. **No Motion role.** Every boundary arrives unannounced, and the track reads as a loop that
   occasionally changes.
7. **Thirty-two bars of nothing happening.** Common in a first draft, because the loop sounded good
   in the studio, where you were not listening to it for four minutes.

## Doing it in this app

Each idea above has a control that does it.

| Idea | Where |
| --- | --- |
| Subtraction as the workflow itself | The **Sketch tab** — build the full groove as one looping section (drums, perc, bass, pad, chords and melody, grids and settings together), then build the running order underneath and use the lanes to decide which sections play which of its tracks. Every section inherits the groove until it is given something of its own |
| The whole framework, applied at once | The **arrangement templates** at the top of the structure picker — thirteen dance forms that set what each section plays, not just the order: drums out here, chords out there, the filter opening across the build. The strip's **Energy** lane draws the resulting staircase |
| The staircase of sections | The **structure** chooser, and the arrangement strip's rows and reps — *make the drop twice as long* is a reps edit |
| Layer entries and exits | The **arrangement strip's lanes** — one per layer, a block per run of sections, clicked to bring a layer in or drop it out, per pass |
| Variation within a layer | A **drum grid per section**, so the second chorus gets the busier hat and the last verse the fill |
| The six roles, in the drum stack | The grid's nine voices — crash, ride, open hat, hat, clap, rim, snare, boom, kick — read top to bottom as air ⟶ backbeat ⟶ floor |
| Entry and variation | **Section moves**: *build* opens the filter across the section, *riser* adds the noise under it, *drop* slams open with a crash, *fade*, *underwater* and *swell* |
| The last bar before a boundary | **Transitions**, which belong to the section they lead *into* and schedule their riser, roll or silence ahead of its downbeat |
| The energy curve, drawn rather than stepped | The **automation lanes** — Filter is the DJ filter across the whole mix, Level is the fade and the hole before a drop |
| The Hook across the whole form | **Melodic narratives**, which pick each section's register, density and contour from its role and its place in the running order |
| Checking the stack | Bounce **stems** and mute roles one at a time; the **Live Set** export carries the arrangement out as named, coloured tracks with the sections as locators |

The bass has long since become its own track, with its own lane, grids and drawn filter — so "sub
out for the breakdown", the single most important move in the whole framework, is one click on the
strip. And the Sketch tab turns the whole document into a working order: the failure mode this file
opens with — adding without ever subtracting — is hard to commit when the full stack is built first
and the arrangement is nothing but the subtractions.

The one thing no export carries is the sound itself — every instrument here is a browser audio
graph, so a MIDI file or a Live Set arrives with the arrangement intact and the tracks empty. Bounce
the stems alongside as the reference for what it is supposed to sound like.
