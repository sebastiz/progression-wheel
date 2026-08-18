# Architecture

The design is aggressively data-driven — almost every feature is a table plus a small amount of
derivation, so adding content rarely means adding logic.

## Layout

The logic lives in plain `.js` modules; only the component itself is JSX. The dependency graph is a
DAG, so any module can be read (or tested) without loading the app:

| Module | Holds | Imports |
| --- | --- | --- |
| `src/theory.js` | pitch classes, chord qualities and intervals, modes, key spelling | — |
| `src/progressions.js` | the progression catalogue, genre/emotion index, structure plans | — |
| `src/patterns.js` | strum and drum patterns, kits, pumps, grid-resolution helpers, the drum-grid voices | — |
| `src/audio.js` | synth voices, drum kits, sidechain, section moves, the GM sampler | theory |
| `src/midi.js` | writing and reading Standard MIDI Files | theory, patterns |
| `src/als.js` | writing an Ableton Live Set — gzipped XML | — |
| `src/pitch.js` | the McLeod-Pitch-Method transcriber | — |
| `src/melody.js` | melody parts, grid helpers, pattern and narrative generators | — |
| `src/song.js` | the serialisable song document, melody and drum-bar packing, link encoding | melody |
| `src/wav.js` | 16-bit PCM wav writing | — |
| `src/zip.js` | a store-only ZIP writer, for the stem archive | — |
| `src/arrange.js` | editing a song's arrangement, carrying melodies through it, automation lanes | — |
| `src/progression-wheel.jsx` | the component, the fingering diagrams and the score | all of the above |

Because the modules are plain ESM with no JSX, `npm test` imports them directly — no build step and
no React stub. `scripts/build.mjs` feeds the component through esbuild via stdin with
`resolveDir: "src"`, bundling as an IIFE, so nothing lands in global scope and no intermediate files
are written.

Two failure modes that bundling hides — a module that declares something without exporting it, and
the component using a module's symbol without importing it (esbuild silently assumes a global) —
are checked by `npm test`, because both surface at runtime as a blank screen.

## Music-theory core

- Pitch classes are semitones 0–11 (`SEMI_NAME` maps them to display names).
- Circle-of-fifths position: `posOf(semi) = (semi * 7) % 12`. Major chords sit on the outer ring at
  their own position; minor-family chords sit on the inner ring at their relative major's slot.
- Roman numerals resolve through `MAJOR_NUM` / `MINOR_NUM`: numeral → `[semitone offset, quality]`.
- Qualities: `maj min dom maj7 m7 maj9 m9 dom9`. `chordIvs(q)` returns intervals; `chordName(r, q)`
  formats; `famMin(q)` decides inner/outer ring.

## The chord pipeline

Everything flows from one `useMemo` producing `chords`, the live loop:

1. **Base**: the selected progression's numerals resolved in the current tonic.
2. **Overrides** (`edits.map`): user swaps keyed by the chord's *triad base name*; the replacement is
   reverse-looked-up to a numeral where possible (for function colour and labels).
3. **Inserts** (`inserts.list`): `{before, root, quality, tag}` — secondary dominants, borrowed
   chords, mediants — spliced in before their base index.
4. **Colour transform** (`seventh(q, numeral)`): triads → 7ths → 9ths applied last, so stored edits
   stay colour-independent.

5. **Reorder** (`order.list`): a saved permutation of the final loop, stored as a list of stable
   chord keys (`chordKeyOf` — `b<bi>` for base slots, the insert tag otherwise). Applied last, and
   only when its key set still matches the current chords, so it survives inert edits and falls back
   cleanly when the chord set changes.

Both edit stores (and the reorder) are keyed by `progId:tonic` so they clear when they'd be meaningless.

Derived from `chords`: `uniques` (deduped, with step numbers), `parallels` and `secondaries`
(the suggestion/overlay sets), `appliedMoves` (human-readable edit list with reference songs), the
wheel geometry, the pill strip, and the melody landing notes.

## Structures

`UNIVERSAL` entries carry a `family` (`STRUCT_FAMILIES`) that groups them in the picker. `reps`
multiplies the chord pool, so on a four-chord loop `LOOP|4` is sixteen bars — which is how the dance
structures get their 8/16/32-bar phrasing. Note that `reps` creates one section *instance* per pass:
`HOLD1|16` would be sixteen one-bar sections, sixteen rows in the arrangement and sixteen markers, so
long sections are written as `LOOP|4` rather than `HOLD1|16`.

### The genre index

`GENRE_GROUPS` maps 106 genres onto the 33-progression catalogue, six to ten each, ordered so the
first is what the genre sounds like at its most typical and the tail is where it borrows from.
`progList[0]` is the default pick, so the head of each list is load-bearing — changing it changes
what a genre loads. Three per genre (what it used to be) was a default and two alternatives, and it
left a third of the catalogue unreachable from the place people actually start. `npm test` holds
both ends: no genre may offer fewer than five, and no progression may be unreachable from every
genre.

`STRUCTURES`/`PLANS` (per progression) and `UNIVERSAL` hold arrangement plans as compact rows:
`"Section|nums|reps|note"`, where `nums` is numerals or a token (`LOOP`, `HALF1`, `HALF2`, `HOLD1`)
resolved against a chord pool. `resolveWith(nums, pool)` + `poolFor(sectionLetter)` implement
contrast loops (a second progression assigned to C/B/V sections). Sections are letter-coded via
`letterFor()` for the shorthand write-out; odd-length phrases are padded even by holding the last
chord a bar.

### Editing the arrangement

A catalogue structure is a starting point, not a cage. `custom.plan` is an edited copy of the chosen
structure's rows and takes over whenever it belongs to the structure on screen; the catalogue's own
plan is a shared constant and is never touched, so ↺ Reset is just dropping the copy (and `npm test`
checks no operation mutates the plan it was handed).

`src/arrange.js` holds the operations — move, reps, duplicate, delete, add — each a pure transform
returning `[nextRows, origin, selectedRow]`. `origin[i]` is the index new row `i` held in the old
plan, or `-1` for a brand-new section.

That `origin` is the whole point. Sections are numbered in playing order (`C1`, `C2`, …) and
melodies are stored under that number, so moving a chorus past another chorus swaps their numbers
and a melody left at its old key would start playing under the wrong section. `remapSecs` recomputes
the keys either plan produces (`instKeysOf`) and moves each section's entry to wherever its row
ended up. Pass `j` of a row inherits pass `j` of its origin; extra passes repeat the last written
one, so stretching a drop from four bars to eight fills rather than half-empties it.

A block on the strip is exactly one plan row — runs key on `inst.row`, not the section name, which
is what makes the strip editable at all.

### Automation lanes

A section move is a preset applied to a whole section; automation is the other half — a curve drawn
across the song, so a build can open over sixteen bars instead of jumping at a boundary.

A lane is a sparse, sorted `[{bar, v}]` with `v` in 0..1, at most one point per bar (the scheduler
ramps between bars, so finer resolution would be stored and never heard). `autoAt` interpolates
linearly between points and **holds flat outside them**, so drawing the two ends of a build gives
exactly that ramp and nothing surprising before or after. An empty lane returns `null` rather than a
value, which is how the scheduler knows to leave the parameter alone entirely. `autoDraw` fills the
bars a fast pointer skipped, or a quick drag leaves holes in the line.

`autoFilt` (lowpass) and `autoGain` sit on the **master** path, between `master` and the limiter, so
a drawn sweep covers the drums as well as the pitched sources — a DJ filter rather than a
pitched-bus one. Both are linear and both are scheduled identically in a stem render, so the stems
still sum. The scheduler writes one ramp per bar on the downbeat, guarded by the bar index against
the lookahead scheduling a bar twice. Cutoff maps **exponentially** (`120 · (FILTER_OPEN/120)^v`)
because pitch and brightness are heard logarithmically; a linear map would waste the top half of
the lane.

### The arrangement strip

A horizontal view of the whole song above the section list: one block per section, sized by bar
count, with a lane per element (drums, chords, each melody part) underneath and a playhead across
all of them (`curSongBar`, set on each bar's downbeat).

Blocks are **runs of consecutive instances sharing a section name**, not instances. `reps` makes one
instance per pass, so an eight-pass drop is eight instances; drawn separately, a 200-bar dance
structure becomes 52 slivers of confetti. Merged, it reads as *Drop ×8*. Runs key on the plan row's
own `sec` name rather than its letter, because a plan can call two adjacent letter-`U` sections
"Layer up" and "Build". A lane cell over a multi-instance run is `on`, `off`, or `part` when the
instances disagree.

The lanes are **toggles**, not just a readout: a cell drops or brings back that element for that
run. Their scopes genuinely differ and the tooltip says which — drums (`secDrum`) and chords
(`secQuiet`) are stored per section *letter*, so flipping one moves every section that letters the
same way, while a part's `mute` is per instance and a click on a `×4` run sets all four.

That last case needs `setLayerPropMany`. `putSec` spreads the `melos` value from the current render,
so calling `setLayerProp` in a loop makes each write clobber the last and only the final section
changes — "I muted a ×4 run and one pass stayed loud". One state update covers every section, and
`npm test` rejects a `setLayerProp` call that appears inside a loop.

Widths are `flex-grow: <bars>` against `flex-basis: 0`, so the strip always fits its container and
never scrolls sideways; labels are left-aligned and clipped, which truncates to a word's first
letters instead of showing its middle. `SEC_COL` needs an entry for every letter `letterFor()` can
return — a missing one falls through to grey, and `npm test` checks both coverage and that no two
non-neutral letters share a colour.

## The song document

`src/song.js` holds one serialisable shape used by *both* the sketch and the shareable link, so
neither can drift from the other. Melody bars pack to flat `[bar, col, degree]` triples — lossless,
and an order of magnitude smaller than the mostly-empty nested arrays, which is what lets a whole
song fit in a URL. `encodeSong` runs JSON through the native `CompressionStream` and base64url; the
`d`/`u` prefix records whether it was deflated, so old links stay readable if the codec changes.

Undo/redo snapshots this same document from a debounced effect rather than at each call site, so no
edit path can forget to record itself; a `restoringRef` flag stops a replay becoming history.

### The wheel's size

`.wheelsvg` is capped at 500px and centred rather than filling the column. The viewBox stays 640
units, so capping the rendered width scales the text down with it — the in-diagram font sizes were
raised to compensate (ring labels, chord names, loop numbers), which is why the smaller wheel is no
harder to read than the large one was. Shrinking it without that step is what would make it worse.

## Design tokens

The stylesheet had 17 font sizes, 15 corner radii and 45 near-identical greys — which is what "not
quite designed" looks like at close range. A `:root` block now holds the whole palette: an 8-step
type scale, 6 radii, and named surfaces, lines and text colours. Everything else refers to them, so
a change happens once rather than in thirty places.

Nine hues stay literal on purpose because they *mean* something rather than being chrome — the warm
error text, the blue highlight, the gold and red tints behind an active state. They are held out by
name in the test, so adding a tenth is a deliberate act rather than a drift.

`npm test` rejects any hard-coded font size, radius or non-accent colour in the stylesheet, and
requires a `:focus-visible` rule to exist: keyboard focus was invisible everywhere before, which is
both an accessibility failure and the single thing that most made the interface read as unfinished.

## Layout and navigation

The page is four tabs — `write`, `sound`, `arrange`, `save` — each top-level panel gated on `tab`.
It was one column of six panels, 4,613px and 190 controls deep once a structure was loaded, which
put choosing a key and drawing automation in the same scroll.

The transport is deliberately outside the tabs and holds everything that acts on the whole song:
play, tempo, tap tempo, A/B, undo and redo. Keyboard shortcuts are global for the same reason.

The wheel is separately collapsible within Write, and the chord strip was split out of the wheel's
panel so it survives that collapse — the strip is what you edit; the circle is how you read it.

## Audio

Web Audio API throughout, no samples:

- **Scheduler**: split into `buildGraph(ctx, from, stem)` and `emitTick(m, live)`. Live playback runs
  `setInterval(20ms)` with a 0.1 s lookahead, calling `emitTick` until it is 0.1 s ahead — solid
  timing with ~0.1 s latency for live changes. The AudioContext is created and resumed inside the
  Play tap (iOS unlock), with a silent unlock note.
- **Rendering to a file** reuses both: `buildGraph` into an `OfflineAudioContext`, then `emitTick`
  for every tick of the song at once. There is no second implementation to drift, so the wav is what
  you heard. `emitTick`'s `live` flag only gates the on-screen playhead.
- **Stems** reuse the same two functions once more. `renderOffline(stem)` passes a descriptor —
  `null` for the mix, or `{ kind: "chords" | "drums" | "part", i }` — which `emitTick` consults at
  each of its four sources: chords, drum voices, melody parts (matched on layer index) and the
  metronome click, which is excluded from every stem. Two things are deliberately *not* gated:
  - The **sidechain pump** (`duckAt`) shapes the pitched bus, so it stays in every pitched stem even
    though the kick triggering it lives only in the drum stem. Without that, the pitched stems would
    lose their pumping the moment they were isolated.
  - The **master limiter** is *bypassed* for stems (`buildGraph`'s `stem` argument). Compression is
    non-linear, so limiting each stem separately could never sum back to a limited mix; stems come
    out pre-master and the DAW's own chain does the limiting. Verified in a browser: the stems sum
    to the (pre-limiter) mix to within 16-bit quantisation.

  Stems render sequentially rather than in parallel — several full-length `OfflineAudioContext`s at
  once is how a phone runs out of memory — and any stem that renders silent is dropped rather than
  shipped as an empty file. `src/zip.js` packages the result: store-only (wav does not deflate
  usefully) with a fixed 1980 timestamp so archives are reproducible.
- Each eighth-slot: click, chord voice (`playHit` — guitar pluck is sawtooth through a closing
  low-pass; piano is fundamental + decaying partials; organ sustains sine drawbars; basses play
  roots), drum hits (`drumSound`), and melody lead notes.

### Time signatures

`METERS` lists the bar lengths the app can actually play: `beats` is quarter-note beats per bar,
which is what the scheduler and every pattern length are measured in, while `num`/`den` are what a
DAW is told. Those differ for 6/8 — three quarter-note beats to the engine, but it has to reach a
DAW as 6/8 or the barlines land right and every accent is wrong. `midiBytes` takes `meta.tsNum` for
that.

The chosen strum pattern is the **single source of truth** for the meter: `meterOf(p)` reads it off
the pattern rather than storing it separately, so the two cannot disagree and nothing new needs
serialising. The Time menu is a way of jumping between meters — it picks a pattern that has the one
you chose, and moves the kit too if the old one no longer fits, since a mismatched kit is dropped
from the tick grid and falls silent rather than complaining.

`drumBeatsOf` reads a kit's meter from its step count (`DRUM_BEATS`). It used to be
`length === 6 ? 3 : 4`, which read a ten-step 5/4 pattern as 4/4. `npm test` checks every meter has
both a strum pattern and a kit — a menu entry with neither is a dead end — and that each meter's
MIDI signature describes the same bar its beats do.

### Grid resolution

A rhythm pattern carries `sub` — columns per beat, 2 for eighths and 4 for sixteenths — so
`beatsOf(p) = pattern.length / sub` is the meter. Nothing assumes an eighth-note grid: note values
in the score are read as multiples of `sub`, and MIDI writes `T / sub` ticks per column.

The **writing grid is its own choice** (`MEL_GRIDS`, `gridSub`), not the strum pattern's length.
It used to be exactly `rhythm.pattern.length`, which tied together two decisions with nothing to do
with each other — how the guitar is strummed and how finely you may write — so a sixteenth grid
meant picking a sixteenth strum and changing the sound to get it. There is also no sixteenth strum
in 3/4 or 5/4, so a fine grid there could not exist at all.

`meloBeats` is now `barBeats * meloSub`, with `meloSub` the song's own choice falling back to
`subOf(rhythm)`. The safety of that rests on one identity, which `npm test` checks against every
pattern in the table: with no choice made, `beatsOf(p) * subOf(p) === p.pattern.length`. If those
ever diverge, every song written before the grid became its own control re-times itself on load.
Changing the grid is safe because `rescaleBar` maps each note to the nearest column of the new
grid — a note keeps the moment it sounds at, not the column index it was stored under.

Patterns of different lengths coexist because each **bar ticks at the finest resolution in play** —
`tickCount` is the lcm of the strum pattern and every drum pattern that could sound (global plus
per-section), computed over the whole song so the step counter stays coherent across sections. Each
pattern is then sampled onto that grid by `sampleAt`/`stepAt`: a length-P pattern fires at tick `i`
only when `i·P` lands exactly on a step. When lengths match, the stride is 1 and the path is
bit-for-bit what it was before — which is how every existing eighth-note song is unaffected.

`rescaleBar` re-times a stored melody bar when the resolution changes. A bar remembers its own
resolution in its length, so switching rhythms moves each note to the column that keeps it at the
same point in the bar (lossless going finer; folded onto the nearest column going coarser).

Swing delays the offbeat of each *strum-pattern* pair, so on a sixteenth pattern it is a sixteenth
shuffle rather than an eighth one. It is a continuous amount (0 → ~0.6 of a step), seeded from the
pattern's own `swing` flag; **Feel** (humanise) adds a few milliseconds of push/pull and some
velocity variation on top.

Both humanise and the "random" arpeggiator draw from `hash01(n)` — a deterministic integer hash —
rather than `Math.random`. The variation has to be *fixed*, or a stem bounce would drift out of
time with the mix it came from and the two would no longer sum.

An arpeggiator or a note gate is a rhythm too, and can be finer than anything else in the song, so
`fxTicks` folds their resolution into the scheduler's tick count (an lcm, as with the patterns).
Without it the extra steps fall between ticks and are dropped — which sounds exactly like an arp
running at half the rate you asked for.

### Drums and the sidechain

`DRUMS` patterns are strings of channel letters per eighth-slot: `K` kick, `S` snare, `H` closed hat,
`O` open hat, `C` clap, `P` rim, `R` ride, `X` crash, `B` 808 sub-boom. `drumSound(ctx, t, ch, noise,
dest, kit)` voices one letter; `kit` (`acoustic` | `909` | `808`) selects between three voicings built
from two shared primitives — `nz` (a filtered burst of the shared noise buffer) and `tone` (a pitched
oscillator with an optional sweep). The buffer is only 0.3 s, so any voice decaying longer than that
loops it rather than falling silent inside its own envelope.

**Voice leading**: `voiceChord` picks the inversion whose upper voices sit nearest the previous
chord's, so the harmony moves by step instead of leaping in root position; the bass keeps the root.
The scheduler recomputes it only on a chord change and hands the result to both the synth and
sampler paths. `accentAt` supplies positional velocity — nothing had any before.

**Sidechain**: ducking happens **per source**, not on the master. Each pitched source has its own
duck node on the way into the reverb bus — `cduck` for the chords, `partDuck[i]` for each melody
part — and the reverb *return* has one too (`wetDuck`, at the global amount) so the tail keeps
breathing the way it did when a single duck sat on the master. Drums and click connect to `master`
directly, so the kick lands in the hole it makes instead of ducking itself.

This started as one gain node on the master path, which meant every pitched source pumped by
exactly the same amount. Per-source nodes are what let a bassline duck hard under a pad that barely
moves — `layerFx(ly).duck` is the part's own depth, and `null` means "follow the global Pump".
Ducks are plain scheduled gains, so they stay linear and the stems still sum to the mix.

`duckAt` writes the envelope directly — cancel, full level at the hit, ~6 ms linear dip to
`1 - amount`, linear recovery over ~1.6 eighths — rather than running a real compressor with a
detector, because the scheduler already knows exactly when each kick lands. The scheduler fires it
on any slot containing `K` or `B`, so per-section kits and drum-free sections pump correctly for
free.

Drum pattern, kit and pump are keyed by progression (like tempo and strum pattern) via
`DRUM_DEFAULT` / `KIT_DEFAULT` / `PUMP_DEFAULT`, so the dance progressions arrive grooving and
everything else keeps the acoustic defaults.

### Section moves

`MOVES` are arrangement automations attached to a section — either to *one instance* (`secMove.C2`)
or, as a default for all of them, to the **section letter** (`secMove.C`). Playback takes the
instance's own move if it has one and falls back to the letter, which is also what keeps songs saved
before moves were per-instance sounding the way they were saved: they only carry the letter key.
A section's own chooser shows the inherited value as its first option ("as every chorus — Build"),
so the fallback is visible rather than something you find out by pressing play. `applyMove`
schedules the whole thing at the section's downbeat: an exponential cutoff envelope on the
move filter, plus the optional riser (noise through a rising bandpass, cut on the boundary) and
impact (sub boom + crash). The duration passed in is the section instance's own length, so a sweep
always lands on the boundary and re-times itself when the structure changes. The scheduler fires it
once per instance, guarded by the bar index so the lookahead can't restack the automation. Cutoffs
never reach zero because the ramps are exponential.

The riser and the impact are *added sources*, not processing, so they go to the transition stage's
`fx` bus rather than the master. On the master they landed in every stem, and four stems summed to
four risers — the one place the "stems add back up to the mix" invariant was quietly broken.

### Transitions

A move shapes a section; a **transition** shapes the boundary *into* one, which is a different job
in every way that matters. It is anchored to a downbeat rather than spread across a section, most of
it sounds in the section *before* the one it belongs to, and some of it — a crash, an echo throw, a
fade-in — rings on after the boundary has passed. None of that fits `applyMove`, whose whole shape
is "one envelope, from the section's start to its end".

`TRANS` is therefore a table of presets, each a list of **primitives** (`TFX`) with windows measured
in beats either side of the boundary. Beats, not seconds and not bars: seconds make a riser
tempo-dependent (`applyMove`'s 4-second cap is a bar and a half at 170bpm and nearly two at 90), and
bars would need a second table in 3/4. Forty-nine presets are affordable because each is one row —
"reverse cymbal into a drop" is a row, not another branch inside one function.

| | |
| --- | --- |
| **Keyed** | to the section it leads into: `secTrans.C2`, falling back to `secTrans.C`, exactly as a move does. A boundary has no stable name — insert a verse and every later boundary is a different boundary — while C2 is still C2. |
| **Armed** | from `transCues` (arrange.js), which turns the arrangement into `bar → [{at, maxPre, maxPost}]`. The scheduler fires by bar index like the automation lanes; the boundary's time is one multiplication away because every bar is the same length. |
| **Clamped** | a lead-in never reaches back past the section before it, and the first section of a song has no room at all. Every primitive checks for a zero-length window and schedules nothing — a quarter-beat riser is a squeak, and the crash it was setting up still lands. |
| **Families** | six, because the six things a seam can do are different jobs: lifts, impacts, cuts, colour, falls, entries. The picker groups by them and the strip marks each with the family's glyph. |

Two rules keep the table honest, and `npm test` enforces both. A primitive declares every shared
parameter it writes (`owns`), and no preset may claim one twice — two envelopes on one AudioParam is
exactly the collision that makes moves impossible to overlap, since the second
`cancelScheduledValues` silently eats the first. And every preset must hand its parameters back:
a filter left shut or a gain left at zero doesn't spoil a transition, it silences the rest of the
song, so each one is run and then checked for what it *left behind*.

The transition stage (`makeTrans`) is its own filters and gain on the **master** path, between the
master and the drawn automation lanes. Its own nodes because an envelope that stops on a boundary
and one that runs across it cannot share a parameter; the master path because drums bypass the
pitched bus entirely, and a stutter that leaves the drums running is not a stutter. It also carries a
wash (a big reverb) and a throw (a delay with more feedback than the mix delay), both tapped
post-gain so an echo throw into a hole rings over the silence that follows it.

Anything keyed to an instance moves when the arrangement does: `remapKeyed` carries `secMove` and
`secTrans` through a plan edit the way `remapSecs` carries melodies, so a build set on the second
chorus doesn't end up on the first the moment a section is moved.

### The drum grid

A drum pattern was always a grid — `["KH","H","SH","H"]` is one string per step, one letter per
piece — it simply had no editor, and its only per-section control was the catalogue choice, keyed
by section *type*. So every chorus shared one groove and none of them could be changed.

`secBeat` is a section **instance**'s own bars, and it is stored in exactly that array-of-step-
strings shape. That is the whole design decision: an edited bar is a pattern like any other, so
playback (`dpat`), the MIDI writer (`drumForBar`) and the drum stem all take it without knowing it
was edited, and two pieces at one step is `"KH"` — layering is string concatenation, which the
format has always supported.

- **Rows** are `DRUM_VOICES`: nine pieces, each with a MIDI note, a synthesis voice and an ink.
- **Steps** are `beatSteps(barBeats)` — sixteenths, so 16 in 4/4, 12 in 3/4 and 6/8, 20 in 5/4.
  Those are exactly the lengths `drumBeatsOf` reads back as the right meter, which is what keeps an
  edited bar a legal pattern. Changing the time signature drops edits that no longer fit, the same
  way it drops a catalogue choice that no longer fits.
- **Opening the grid seeds it from what is playing** (`beatFrom`, via the same `sampleAt` resampler
  playback uses), so the first thing you do is change a groove rather than build one from nothing.
  The seed is not stored: a section is "following Rock backbeat" until you touch it.
- **A stretched section repeats its last written bar** rather than falling silent — the rule
  melodies already follow.
- `tickCount` includes an edited bar's step count, or its sixteenths fall between the bar's ticks.

### Exporting to Ableton

`src/als.js` writes a `.als`, which is gzipped XML — so it needs no library, just
`CompressionStream("gzip")`, the same API the shared link uses for deflate. It carries what a MIDI
file cannot: named and coloured tracks laid out as an arrangement, the tempo, and every section as
a **locator** on Live's ruler.

What it cannot carry is the sound, and no format could. Every instrument here is a Web Audio graph;
there is no way to hand Live one, so tracks arrive without devices. Times are in beats throughout,
which is Live's unit, and notes are grouped into a `KeyTrack` per pitch, which is how Live stores
them rather than a choice.

**Ids are the part Live is merciless about.** Every `Id` in the document — tracks, clips, key
tracks, locators, and each `AutomationTarget`, `ModulationTarget` and `Pointee` inside a mixer —
comes from one document-wide pool, and `NextPointeeId` at the top is the watermark Live allocates
its own next id from. Two objects sharing an id, or one at or above that watermark, is refused
before a single note is read: *"The document is corrupt and cannot be loaded. (Invalid Pointee
Id.)"* Nothing here points at anything else, so the values are arbitrary — unique, non-zero and
below the watermark is the whole requirement. A single counter therefore hands out every id, which
is why the file is assembled from the tracks inwards and the header, which has to carry the finished
watermark, written last.

A time signature is one number in that XML: the denominator's place in 1, 2, 4, 8, 16, 32 times 99,
plus the numerator less one — 4/4 is 201, the value a fresh set has.

`npm test` checks both halves of what is knowable without Live: that the document is well-formed
(every element closes, no bare `&` from a section name) and says what it should, that no id is
duplicated, zero, or above the watermark, and that the bytes are really gzip and decompress back to
the document. Whether Live *accepts* the schema is the part only Live can answer.

### Melody parts

A section holds `layers: [{bars, flat, instr, oct, vol, mute, solo, send, ...LAYER_FX}]` — up to
`MAX_LAYERS`, each with
its own instrument and its own `LAYER_INK` colour. `oct` is what separates a bassline from a topline,
since the grid itself only ever shows one octave of scale degrees; it is applied in three places
(playback, `scoreMeasures`, MIDI export). `layerGain` folds level, mute and any solo in the section
into one number, and each part plays through its own gain node into the music bus. Every rebuild of
the list goes through `cloneLayer`, so an edit meant for a part's notes cannot drop its mix settings.

### Part modulation

Everything a part carries beyond its notes is one entry in **`MOD_GROUPS`** (melody.js) — 28 of them
across six groups — and that one entry is read by five different things: `ModCtl`, which draws the
control; the scheduler, which applies it; `cloneLayer` and `putSec`, which carry it; song.js's
`packLayer`/`unpackLayer`, which save it; and `copyPartSettings`, which moves it between sections.
`LAYER_FX` is derived from the table rather than written by hand. Adding a modulation is one line
rather than six edits, five of which are easy to forget; melodies once vanished from saved sketches
for exactly that reason. Only fields that differ from their default are written, so a shared link
stays short.

| Group | Where it sits | Modulations |
| --- | --- | --- |
| Pattern | *note effect* — which notes, when | arp (+rate, +range), euclid (+length), reverse, shift, speed, gate (+length) |
| Repeat | *note effect* — how many times | ratchet (+fade), note echo (+time, +fade, +pitch), strum (+direction) |
| Pitch | *note effect* + oscillator | transpose, scale steps, snap to, invert, harmonise (+voicing), stray notes, octave jump, double, detune |
| Tone | filter + waveshaper | low-pass, resonance, high-pass, filter envelope (+decay), drive |
| Envelope | amplifier | attack, decay, sustain, release, velocity → tone |
| Movement | modulators (LFO) | wobble, tremolo, pan, auto-pan (each with its own tempo-synced rate) |
| Feel | *performance* | note length, length spread, nudge, humanise, swing, play chance, accent, level spread, swell |
| Space | effects + dynamics | echo send, reverb send, pump |

The order is a synth's signal chain, and four groups sit deliberately outside it.

**Pattern, Repeat and most of Pitch are note effects** — they run before any sound exists, rewriting
the stream of note events the instrument is then handed. That is why a harmoniser there stays in key
when the key changes, and why the note echo can transpose its repeats: a delay line can only give
back what it was handed, while a note effect is deciding what to play. A note event has exactly five
properties an effect can touch, and the groups cover all five:

| Property | Effects |
| --- | --- |
| pitch | transpose, scale steps, snap to, invert, harmonise, stray notes, octave jump, double, detune |
| onset | arp, reverse, shift, speed, gate, nudge, humanise, swing, strum |
| duration | note length, length spread |
| velocity | accent, level spread, swell, echo fade, roll fade |
| existence | euclid, play chance |

**Feel** is the fourth: performance rather than synthesis — microtiming and dynamics, the layer a
player adds on top of a fixed instrument.

Four of the Pattern effects (euclid, reverse, shift, speed) are the same operation underneath — a
map from where the playhead is to which written column to read — so they live in one `colFor`
function returning `null` for "silent here", rather than four scattered edits that would have to
agree with each other. The **Euclidean generator** has an actual right answer, so `npm test` checks
named rhythms (E(3,8) is the tresillo and nothing else) as well as the general property that makes
it Euclidean at all: for every k ≤ n ≤ 32, the right number of hits and gaps that never differ by
more than one step.

**Envelope** modifies the chosen instrument's own envelope rather than replacing it — `atk` is a
floor on the attack, the other three are multipliers on the stages the voice already has, and
`NO_SHAPE` (nothing added, every multiplier 1) reproduces the voice exactly as it was. Absolute
times would flatten a bell and a pad into the same instrument the moment either control moved. The
sampled path takes the same shape but ignores decay: a recorded note's decay is in the recording,
so it is left alone rather than faked.

Three properties hold the table together, and `npm test` checks each:

- **Every default is a no-op.** A part with no settings must sound exactly as it did before any of
  this existed, or opening an old sketch changes it. The test states the "off" value for all 28 a
  second time and independently, so a changed default fails until both are changed.
- **Every non-`own` modulation is in `LAYER_FX`.** A key that is not gets silently dropped from
  saved sketches and shared links. (`own` marks the handful — `send` — that song.js already packed
  under its own key before the table existed, so old sketches keep loading.)
- **Menu values keep their type.** A `<select>` hands back a string; the scheduler compares with
  `===`, so a rate of `"4"` would fail every check against `4`. `castLike` casts on the way in.

`needs` hides a rate until the thing it paces is turned up — four of the 28 are dependent controls,
which is why a group shows fewer sliders than it has entries until you start turning things on.

**Where a part's settings live.** They belong to one *section instance*, not to the song: the same
pad is a clean sustained one in the verse and a gated, driven, sidechained one in the chorus. That
is what the tinted panel in the Arrange view is saying — its background is the part's own
`LAYER_INK` over the surface, and nothing else on the page is section-scoped that way. The selected
part is also per section (`secPart`), because opening the bass in the chorus should not switch the
verse to its bass. `copyPartSettings` moves a whole settings set onto the same part index of other
sections in one state update, growing a section that has fewer parts, and never touching notes.

**Arpeggiator** (`ARPS`): an arped part ignores its grid and walks the notes of the chord under the
current bar, in the chosen order, through `arpOct` octaves at `arpRate` notes per beat. It reads
`m.voicing`, which is why the voicing is computed on every tick where the chord changes rather than
inside the chord-playing branch — a part stem plays no chords, and an arp that saw a stale voicing
there would follow a different harmony from the one it followed in the mix. Step indices come from
the absolute tick, so the line is reproducible.

**The chain.** Each part runs through its own:

```
gain ─ drive ─ high-pass ─ low-pass ─ tremolo ─ pan ─ gate ─┬─ duck ─→ pitched bus
(level·mute·solo)          ▲            ▲        ▲          ├─ echo send  → delay
                           │            │        │          └─ reverb send → room
                         wobble      tremolo   auto-pan
```

The order is a hardware synth's and it matters: drive before the filter, so the filter tames the
harmonics the drive just made rather than the drive re-brightening a filtered signal; the gate last
of the level stages so it chops everything above it at once; both sends after the gate so a gated
part throws gated repeats.

Two things about the LFOs are load-bearing. They are **built for every part on every tick**, whether
or not anything is turned up, and they **start from `m.t0`** rather than from whenever a control was
first moved — otherwise an LFO's phase would depend on which bar you happened to turn it up in, and
a stem bounce would no longer line up with the mix. Rates are in beats per cycle, not Hz, so the
movement stays in time when the tempo changes. Filter frequencies go through `nyq`, because Web
Audio *throws* on a cutoff above Nyquist rather than clamping, and an offline render at another
sample rate is exactly where that bites.

Note-level modulations (transpose, detune, double, harmonise, strum, ratchet, octave jump, length,
nudge, swing, play chance, accent) are applied in `fireNote`/`timeFor`/`playChance`, shared by the
grid and the arp so a control means the same thing whichever is playing. Harmonise builds its extra
notes from **scale degrees** on the grid path and from the **chord's own pool** on the arp path — an
arp is already walking that chord, so taking its harmony from anywhere else would have the two
disagreeing about what the bar's chord is.

The scheduler's helpers are siblings inside `emitTick`, not nested, so one reaching for another's
loop variable is not a scope error the bundler reports: esbuild assumes it is a global and emits it
untouched, and it becomes a ReferenceError the moment a control is first turned up. `npm test` walks
each helper and checks it takes the shared variables it uses — added after `fireNote` reached for
`li` and the octave jump silently hashed `NaN` instead. Timing offsets clamp forward: an offline render starts at time zero
and scheduling before it throws. Play chance is hashed from position in the song, never drawn at
random, so a part that plays 7 notes in 10 plays the *same* 7 every time.

**Reproducible noise.** `hashNoise` replaced `Math.random` in the drum noise buffer, the reverb
impulses and the Karplus–Strong pluck excitation. Two exports of one song used to be audibly
different files, and a stem carried a different noise burst from the mix it came from.

**Note gate** (`GATES`): a 16-step open/shut pattern on the part's own gate node, read four steps
per beat so one pattern means the same thing in 3/4 as in 4/4, and applied with `setTargetAtTime`
because a hard step clicks. Since a gate is a *sustained*
open/shut, an all-open pattern would be a menu entry that does nothing — `npm test` rejects one. Every melody edit goes through `barsOf`/`flatOf`/`putLayer`, so the
edit operations are resolution- and part-agnostic. MIDI export gives each part its own track and
channel, skipping channel 9 (percussion) so a part is never voiced as a drum kit.
- Swing delays odd eighths by the **Swing** amount. Pattern length sets the meter (8 = 4/4, 6 = 3/4).
- Structure playback maps `step → bar → section entry`; loop playback pads the loop to an even bar
  count.

### Sound sources

Two layers, chosen by the **Real** toggle, both routed through a per-session convolution reverb bus
(`makeReverb` — a synthesized decaying-noise impulse) with the click and drums kept dry:

- **Samples** (`makeSampler`): real FluidR3 GM instrument recordings, a few natural-note anchors per
  instrument fetched from jsDelivr (`SF_BASE`/`SF_ANCHORS`) and pitch-shifted (`playbackRate`) to the
  nearest anchor. Raw MP3s are cached module-side (`sfRawCache`) and decoded per AudioContext; the
  service worker's runtime caching makes them available offline after first play. `playSampled`
  voices a chord (`sampleVoicing`) and rolls the strum; melody leads that map to a GM instrument
  (`LEAD_SF`) play through `playLeadSampled`.
- **Synth** (fallback when samples aren't loaded / Real is off): the original oscillator voices, with
  the guitar replaced by `ksPluck` — Karplus–Strong (a noise burst into a tuned, damped feedback
  delay line: the physical model of a plucked string; feedback stays < 1 so it always decays) — and a
  richer `drumSound` (layered kick + click, two-tone snare + rattle, metallic hats).

The scheduler calls `playSampled`/`playLeadSampled` first and falls back to `playHit`/`leadNote` when
they return false, so a sample that hasn't finished loading simply plays as synth until it's ready.
All voices take an optional `dest` node; pitched voices + melody route to the reverb bus, click and
drums stay dry, and the whole mix passes through a `DynamicsCompressor` limiter before the output.

## Melody persistence

The melody grid is stored as `{progId, ids, bars}` where `bars[i]` is one bar (array of eighth
columns, each a list of scale-degree indices) and `ids[i]` is a key-independent chord identity:
`"b<n>"` for base slot *n*, or the insert tag for inserted chords. On every render the stored bars
are re-mapped onto the current chord sequence — id-matched within the same progression (so bars
follow their chords through inserts/removals/swaps/key changes), positionally on a different
progression. Degrees, not pitches, are stored, so melodies transpose with the key and survive mode
changes.

## Melody rhythm

`RHYTHMS` are cells describing where notes fall in a bar and how long each lasts, in **beats** rather
than columns — so one cell resolves onto an eighth grid, a sixteenth grid, 4/4 or 3/4. `rhythmSpots`
snaps a cell onto the current grid, drops onsets that collide or fall past the bar, and clips each
length so a held note never runs into the next onset. `layBar` fills a note's columns rather than one,
which is what gives generated lines actual note lengths.

Generators take `u.cols` / `u.lens` instead of computing beat positions themselves, so contour and
rhythm are independent. Narratives keep their role-based *density* (`roleN`) but take *placement*
from `ROLE_RHYTHM[role]` via `pickSpread`, so a whole-song write varies section to section.

## Counter-melodies and motifs

Every generator above writes a part in isolation, which is why a second part so often sounds like
two tunes played at once. A **counter-melody** is written *against* the lead: the pattern context
carries `against` — the bars of the lowest-numbered other part that has notes — and `leadOnsets` /
`leadGaps` read where that line starts notes and where it rests. `counterGen` wraps the result into
the grid's octave and, crucially, **returns an empty bar when there is no lead**: silence is the
honest answer, and the Suggest tab disables *Write to grid* and says why rather than writing nothing
and looking broken. Patterns that need one carry `needs: "lead"`.

A **motif** is the stronger idea a narrative can carry: one four-note cell (`MOTIF`) restated in
every section and transformed by what that section is (`motifMoveFor`) — plain in verses, inverted
in a bridge or solo, retrograde in a build, flattened for an intro or outro. The offsets are in
scale steps from the section's register, so the shape survives while `roleLift` moves the line up
for a chorus. `npm test` checks the shape is *identical* from verse to chorus (the same idea sung
higher) and *mirrored* in a bridge.

Note on testing these: degrees are wrapped into the grid's single octave, so a mirror around a low
pivot lands below zero and comes back round at the top. A direction test on wrapped numbers proves
nothing — the contrary-motion check uses a lead high in the octave so its mirror never wraps.

## Melody generation

Two data tables, both producing the same thing — bars of scale-degree columns:

- `MELODY_PATTERNS` shape **one section** from a start degree and the bar's chord degree.
- `NARRATIVES` shape **the whole song**: `applyNarrative` walks `sections.insts` and calls one
  `gen(u)` per section instance, where `u` carries the section's role letter (`V`/`C`/`B`/…), which
  pass of that role it is, and its place in the running order (`idx`/`total`/`frac`). The generators
  are built from a few shared primitives — `nCols` (how many notes in a bar, from `ROLE_N`), `winFor`
  (the register window, floated by `ROLE_LIFT`), `chordSnap` (nearest chord tone) and `narBars`
  (walks the section slot by slot, handing a contour function `t`: 0→1). So "the chorus sings higher
  and busier" is a table lookup, not per-narrative code. All degrees are clamped into the single
  octave the grid displays. Every section is written in one `setMelos` (per-section `putSec` calls
  would read stale state), with the previous store kept for one-step Undo.

### Varying the repeats

A narrative writes the same tune into every pass of a section, so four choruses came back note for
note the same. `varyBars` edits the later passes — pass 0 is left alone, because it is the thing the
others are variations of. Thirteen small edits (`VARIATIONS`) move a repeat along three axes:

| Axis | Edits |
| --- | --- |
| Pitch | `ending`, `opening` (a different landing or starting note), `neighbour` (one note lifted a step) |
| Rhythm | `clip` / `extend` (a held note released early or run on), `push` / `delay` (a phrase early or late) |
| Note count | `add`, `passing`, `split`, `turn` add notes; `thin`, `merge` take them away |

Each returns whether it found somewhere to act. `varyBars` walks one trip round a rotation of the
list until it has made `amount` edits, so two edits are always two *different* kinds of edit. Three
pairs are each other's mirror (`clip`/`extend`, `push`/`delay`, `split`/`merge`), so an edit counts
only if it actually changed the bars, and the walk carries on past `amount` while the result still
matches where it started — otherwise two edits could cancel and hand back an identical repeat.

The one subtlety worth keeping: **every hash is seeded from the role alone, never from the pass.**
The pass is then added as a plain `+ pass` to each choice — which variation, which bar, which note,
which landing. That makes consecutive repeats step one place along by construction. Folding the pass
into the hash instead scrambles the choices, and two repeats then coincide often enough to hear it
(9% of narrative × role combinations in the test, against 0% now). Two consequences of the same
reasoning: `nearDegs` reaches outwards rather than clamping at the edges of the scale, because a
phrase ending on the tonic at the bottom of the octave has nothing below it and clamping would give
every pass the same note; and `thin` and `neighbour` index over *every* note in a bar rather than the
interior ones, because a three-note bar has exactly one interior note and every pass would edit it.

`wouldMerge` is the counterpart on the other side: a note given the same degree as a note touching it
is absorbed into it, so "move one note" quietly becomes "lose one note". Any edit that repitches an
existing note excludes the degrees its abutting neighbours already hold.

The amount is a UI-level choice (`varySt`, like `narSel`) rather than part of the song document —
what gets saved is the melodies it produced.

**Per section.** `applySecNarrative` writes one section's part A with a narrative of its own — the
bridge that should not be another arch, the second chorus you want to climb where the first fell.
It hands the generator exactly the numbers the song-wide write would have (`pass`, `passes`, `idx`,
`total`, `frac`), worked out from `sections.insts` rather than written in, so a section rewritten on
its own still sits where it sits in the song. `npm test` rejects a hard-coded position: passing
`pass: 0` would satisfy a naive "does it pass a pass?" check and still write every chorus
identically. The choice is stored per section in `secNar` and carried in the song document.

### Varying the repeats *inside* a section

`varyBars` answers the boredom between sections. `varyWithin` answers the one inside a single
section — the two-bar hook stated four times over eight bars, the one-bar riff that is the whole
verse. Both drive the same engine: `varyPass` is the walk over `VARIATIONS` described above, and
`varyBars` and `varyWithin` differ only in what they hand it as the pass and the seed.

Finding the motif is the part that is not shared. The melody is sliced at every length that fits the
section at least twice and divides it evenly (`unitSpans` — 4, 3, 2, 1 bars), each slicing is grouped
into runs (`motifRuns`), and the slicing that finds the most restatements wins, longest first on a
tie — so a two-bar phrase is varied as a phrase (same opening, new ending) rather than bar by bar.
Two slices are the same motif (`sameMotif`) when either:

- **`unitSim` ≥ 0.65** — the share of columns they agree on, counted only over the columns one of
  them actually uses. Counting the silence too calls any two sparse bars the same motif: four notes
  in a sixteenth grid agree on three quarters of their columns by being empty there.
- **`unitSequence`** — same rhythm, same interval shape, different pitch. A sequence shares no note
  with the phrase it restates, so nothing pitch-based will ever find it, and a rising sequence stated
  four times is exactly as tiring as a literal repeat.

The first statement of each run is never edited: it is what the rest are heard as variations of.
Every restatement after it is run through `varyPass` with its position in the run as the pass, and
with **one more edit per statement** (capped at +3). The extra edit is not only for drift: past the
third or fourth restatement the passes are stepping through choices a sparse motif has already run
out of, and two of them land on the same edit often enough to hear (9 families in the test corpus,
against 0 once the edit count moves too).

`varyWithin` returns the varied bars *and* what it found (`span`, `repeats`, `varied`), because
"nothing in this section repeats" is a real answer the caller has to be able to show — and it looks
identical to "varied it" if all you hand back is a grid.

**In the component.** `varyRepeats` is the button, per section and part. It keeps the melody as it
stood before the first press in `varyIn` and re-derives from *that* every time, so ×3 is what ×1
would have been at three edits a repeat rather than three rounds of editing compounded — and one
press past the top puts the original back. The baseline is only trusted while the grid still holds
what was last written from it (the notes are compared, not a counter), so a hand-drawn note, an
undo, or a pattern written over the top between presses starts the count again. `varyIn` is UI state
like `varySt`: what gets saved is the notes.

## Notation

`NotationScore` draws the song on a staff in hand-built SVG (no engraving library), matching the
app's other hand-drawn diagrams. Durations arrive in grid columns, so the `sub` prop is what turns
them into note values (`WHOLE = 4·sub`, `HALF = 2·sub`, `flagsOf` → 0/1/2 flags); beams group inside
the beat, with secondary beams drawn only over the notes that carry them. Pitches are placed by diatonic *step* (`stepOfMidi`, one step per
line-or-space, flat-spelled via `SPELL`), so ledger lines, accidentals and clef anchoring are simple
arithmetic. `scoreMeasures` reuses the MIDI flatten to pair each bar's chord with its melody events
(onset eighth + run length). Piano renders a grand staff (RH melody / LH chord voicing); guitar
renders a treble lead sheet plus a six-line tab staff, mapping each melody note to the lowest
comfortable fret (`tabFret`, distinct string per onset).

## MIDI

`GM_PROGRAM` maps each soundfont folder key to its General MIDI program number (the keys *are* the
GM names, so position in the standard 128 list is the program); `SYNTH_PROGRAM` gives the non-GM
synth voices a nearest equivalent, and `programOf` resolves either. That is what lets an exported
file name its instruments instead of opening on piano.

`midiBytes()` takes a `meta` object — `{ beatUnit, sharps, minor, markers }` — and writes the time
signature (`0xFF 0x58`), key signature (`0xFF 0x59`) and a marker (`0xFF 0x06`) at each section
boundary onto the tempo track. Markers use the section's own name from the structure row (`sec`)
rather than its letter-word, and consecutive passes of one section collapse to a single marker.

`midiBytes()` writes a minimal SMF type-1 file by hand: tempo meta track, a chord track (bass +
voicing held per bar), and a channel-10 drum track from the drum pattern (`DRUM_MIDI` maps each
channel letter to its GM percussion note; a machine kit also emits a `KIT_PROGRAM` program change so
the file opens with a matching kit). Exported via Blob + anchor download.

### Exports

`songFile(ext)` names every download `<sketch> <Key> <bpm>bpm.<ext>`, and `download()` is the one
place a Blob and an anchor get made. `midiParts()` builds the bars, the per-part column lists, the
per-bar drum pattern and the arrangement metadata once, so the single file and the per-track files
are the same notes rather than two implementations of them.

The per-track export writes one file per source through `midiBytes` with `meta.skipChords`, which
drops the chord track while keeping the tempo map and markers — each file lands at the right speed
with the arrangement marked. `npm test` checks the header's track count matches the chunks actually
written, since a header that over-counts makes a reader run off the end of the file.

`chartText()` renders a plain-text chord chart, grouping sections into runs the way the arrangement
strip does.

## Workflow

Keyboard handling is one `keydown` listener that returns early for `INPUT`/`TEXTAREA`/`SELECT` and
contenteditable, so typing a sketch name cannot toggle playback. Tap tempo averages the gaps between
the last few taps rather than the most recent one, and resets after 2.5 s.

**Autosave** writes `docJson` (the same document as a save or a link) to its own key on a 1.2 s
debounce, and restores it on load — but only when the address bar has no shared link, checked
*before* the first `await` so another effect cannot have moved on in between. `npm test` guards that
ordering: arriving at somebody else's song and being handed your own is the worst thing this could
do. `autoReadyRef` stops the writer running before the restore has happened, which would otherwise
save the blank document over the real one.

**A/B** stashes the inactive version as a document string and swaps it with the current one. It is
deliberately not persisted — it is for deciding between two ideas in the moment, not for keeping
them.

## Persistence

Sketches serialize the full state to `window.storage` (the Claude-artifact key-value API) under
`pw-sketches`. On plain web hosting that API is absent and sketches are session-only; a
`localStorage` fallback would slot into `loadSketches`/`saveSketch`.

## Build

`scripts/build.mjs`: rewrites the React import to globals, appends a mount call, runs esbuild
(classic JSX transform, minify), and wraps the result in `index.html` with React UMD from a CDN.
Pre-compiling exists because in-browser JSX transpilation of a file this size is the dominant load
cost on phones.
