# The Progression Wheel

A circle-of-fifths songwriting sketchpad. Pick a key, a genre and an emotion — the wheel lights up
a chord progression, colour-coded by harmonic function, and everything downstream follows: reference
songs, colour moves, song structures, a playable rhythm section and a melody grid.

**Live app:** open `index.html` directly, or enable GitHub Pages (Settings → Pages → deploy from
`main`, root) to serve it at `https://sebastiz.github.io/progression-wheel/`.

## Features

- **The Tune Transcriber** — a companion app (`transcribe.html`, linked from the header) that records a
  hummed, sung or **guitar-played** tune (or an uploaded audio file), tracks the pitch in-browser, writes
  it onto a stave, and exports it as MIDI or hands it straight to the wheel's melody grid. A Voice / Guitar
  source toggle retunes the pitch tracker for a plucked note. See
  [the transcriber guide](docs/TUNE-TRANSCRIBER.md).
- **Record onto a section** — every section in the song list has a **● Rec** button: play a single-note
  guitar or vocal line into the mic and it's pitch-tracked straight onto *that* section's melody grid.
  Imported and recorded melodies land on a section you pick, not just the first.
- **The wheel** — progressions drawn on the circle of fifths, colour-coded tonic / subdominant /
  dominant, animated path, tap-to-swap chords, tappable overlays for parallel chords and secondary
  dominants. The chord strip has a **reorder** mode: multi-select chords and shift them as a group
- **On the stave** — the whole song written as notation. **Piano** draws a grand staff (melody in
  the right hand, chord voicing in the left); **Guitar** draws a treble lead sheet with the melody
  and a fret-numbered tab staff. Follows the chosen song structure or the loop, and redraws live
- **Chord colour** — Triads / 7ths / 9ths switch re-voices the whole app by rule
- **Colour moves** — secondary dominants, parallel swaps, borrowed chords, chromatic mediants and
  tritone substitutions, each with reference songs that use the move
- **Song structures** — choose a form and the whole song writes out in shorthand
  (`V×2 · P×2 · C×2 …`) with a section legend, bar counts, and optional contrast loops
  (a different progression for the chorus / bridge / verses)
- **Rhythm section** — ~30 strumming patterns (including 3/4 and 6/8), five instrument voices,
  synthesized drum kits, swing, and a lookahead-scheduled metronome that plays through the loop or
  the entire chosen structure. A **Real** toggle plays actual recorded instruments (FluidR3
  soundfont samples, cached for offline) for the guitar / piano / organ / bass, falling back to an
  improved synth (Karplus–Strong plucked guitar, convolution reverb) when offline
- **Melody grid** — eighth-note, polyphonic, spanning the whole progression, with per-chord landing
  notes and a scale/pentatonic reference; melodies persist through every edit and transpose with the
  key. A **Suggest** tab writes 16 common melody shapes (chord-tone arpeggios, scale runs, call &
  response, AA / AB / AABA motifs, sequences and more) onto the grid from a chosen starting note
- **Melodic narratives** — one melodic idea written across the *whole* song from a single menu under
  the structure chooser: 19 shapes (arch, terraced climb, range expansion at the hook, descending
  lament, withheld peak, ostinato, call & response, motif development and more) that pick each
  section's register, density and contour from its role and its place in the running order
- **Tools** — destination finder (shortest chord path between two chords), descending-bass
  harmonisations, ear training, dice, MIDI export, persistent sketches
- **Fingerings** — tap any chord for guitar chord boxes (open + barre shapes) and highlighted piano
  keys

## Documentation

- **[User guide](docs/USER-GUIDE.md)** — every panel, control and interaction, with the music-theory
  reasoning behind them
- **[Architecture](docs/ARCHITECTURE.md)** — the chord pipeline, audio scheduler, melody-persistence
  model, MIDI writer and build
- **[Layering a dance track](docs/DANCE-LAYERING.md)** — the framework behind the arrangement tools:
  the six roles, the scarcity rule, energy as a staircase, and which control does which job
- **[Contributing](CONTRIBUTING.md)** — the app is data-driven; adding progressions, strum patterns,
  drum beats or structures is a one-line table entry
- **[Changelog](CHANGELOG.md)**

## Development

`src/progression-wheel.jsx` and `src/tune-transcriber.jsx` are the sources of truth — one single-file
React component each. `index.html` and `transcribe.html` are the pre-compiled builds (React from CDN +
minified app); these are what get deployed.

```bash
npm install
npm run build   # rebuilds index.html and transcribe.html from src/
```

## Notes

- Audio uses the Web Audio API — real recorded-instrument samples (loaded from a CDN, cached for
  offline) when **Real** is on, an improved synth otherwise. On iPhone the ring/silent switch mutes
  web audio.
- The app is an installable PWA: on iPhone, open the site in Safari and Add to Home Screen for a
  full-screen, offline-capable app. Sketches persist via localStorage on the web (window.storage
  inside Claude artifacts).

## License

MIT
