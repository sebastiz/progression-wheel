# Architecture

One file, one component: `src/progression-wheel.jsx`. The design is aggressively data-driven —
almost every feature is a table plus a small amount of derivation, so adding content rarely means
adding logic.

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

`STRUCTURES`/`PLANS` (per progression) and `UNIVERSAL` hold arrangement plans as compact rows:
`"Section|nums|reps|note"`, where `nums` is numerals or a token (`LOOP`, `HALF1`, `HALF2`, `HOLD1`)
resolved against a chord pool. `resolveWith(nums, pool)` + `poolFor(sectionLetter)` implement
contrast loops (a second progression assigned to C/B/V sections). Sections are letter-coded via
`letterFor()` for the shorthand write-out; odd-length phrases are padded even by holding the last
chord a bar.

## Audio

Web Audio API throughout, no samples:

- **Scheduler**: `setInterval(20ms)` with a 0.1 s lookahead writing absolute-time events — solid
  timing with ~0.1 s latency for live changes. The AudioContext is created and resumed inside the
  Play tap (iOS unlock), with a silent unlock note.

### Grid resolution

A rhythm pattern carries `sub` — columns per beat, 2 for eighths and 4 for sixteenths — so
`beatsOf(p) = pattern.length / sub` is the meter. Nothing assumes an eighth-note grid: the melody
grid is `meloBeats` columns wide (the pattern's length), note values in the score are read as
multiples of `sub`, and MIDI writes `T / sub` ticks per column.

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
shuffle rather than an eighth one.
- Each eighth-slot: click, chord voice (`playHit` — guitar pluck is sawtooth through a closing
  low-pass; piano is fundamental + decaying partials; organ sustains sine drawbars; basses play
  roots), drum hits (`drumSound`), and melody lead notes.

### Drums and the sidechain

`DRUMS` patterns are strings of channel letters per eighth-slot: `K` kick, `S` snare, `H` closed hat,
`O` open hat, `C` clap, `P` rim, `R` ride, `X` crash, `B` 808 sub-boom. `drumSound(ctx, t, ch, noise,
dest, kit)` voices one letter; `kit` (`acoustic` | `909` | `808`) selects between three voicings built
from two shared primitives — `nz` (a filtered burst of the shared noise buffer) and `tone` (a pitched
oscillator with an optional sweep). The buffer is only 0.3 s, so any voice decaying longer than that
loops it rather than falling silent inside its own envelope.

**Sidechain**: the pitched bus routes `reverb → duck → master` while drums and click connect to
`master` directly, so the kick lands in the hole it makes instead of ducking itself. `duckAt` writes
the envelope directly — cancel, full level at the hit, ~6 ms linear dip to `1 - amount`, linear
recovery over ~1.6 eighths — rather than running a real compressor with a detector, because the
scheduler already knows exactly when each kick lands. The scheduler fires it on any slot containing
`K` or `B`, so per-section kits and drum-free sections pump correctly for free.

Drum pattern, kit and pump are keyed by progression (like tempo and strum pattern) via
`DRUM_DEFAULT` / `KIT_DEFAULT` / `PUMP_DEFAULT`, so the dance progressions arrive grooving and
everything else keeps the acoustic defaults.
- Swing delays odd eighths by a third of an eighth. Pattern length sets the meter (8 = 4/4, 6 = 3/4).
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

`midiBytes()` writes a minimal SMF type-1 file by hand: tempo meta track, a chord track (bass +
voicing held per bar), and a channel-10 drum track from the drum pattern (`DRUM_MIDI` maps each
channel letter to its GM percussion note; a machine kit also emits a `KIT_PROGRAM` program change so
the file opens with a matching kit). Exported via Blob + anchor download.

## Persistence

Sketches serialize the full state to `window.storage` (the Claude-artifact key-value API) under
`pw-sketches`. On plain web hosting that API is absent and sketches are session-only; a
`localStorage` fallback would slot into `loadSketches`/`saveSketch`.

## Build

`scripts/build.mjs`: rewrites the React import to globals, appends a mount call, runs esbuild
(classic JSX transform, minify), and wraps the result in `index.html` with React UMD from a CDN.
Pre-compiling exists because in-browser JSX transpilation of a file this size is the dominant load
cost on phones.
