# The Tune Transcriber

Hum or sing a tune, get it on a stave, and drop it into the Progression Wheel. The transcriber lives
at `transcribe.html` and is reached from the **🎤 Hum a tune →** link in the wheel's header (and back
again from the transcriber's header). Everything runs in the browser — no audio ever leaves the device.

## The workflow

1. **Record or upload.** Press **● Record a hum** and sing a short, clear phrase — "la la la" or a
   steady hum, one note at a time. A live pitch readout and level meter show what the app is hearing.
   Press **■ Stop & transcribe** when you're done. Alternatively **↑ Upload audio** feeds in any audio
   file (`.wav`, `.mp3`, `.m4a`, …).
2. **Read it back.** The tune appears on a treble stave, with the detected key, tempo and note count.
   Press **▶ Play** to hear the transcription (a simple synth) and compare it to what you sang.
3. **Tidy it.** Adjust the **tempo** slider, switch the **rhythm grid** between eighths and sixteenths,
   correct the **key** if the guess is off, and toggle **Snap notes to key** to pull stray pitches onto
   the nearest scale note (cleaner notation, fewer accidentals).
4. **Export.** **↓ Export MIDI** saves a standard `.mid` melody. **➜ Send to Progression Wheel** hands
   the tune to the wheel directly — open the wheel and press **🎤 Hum** on the Rhythm panel to drop it
   onto the melody grid.

## How it works

- **Pitch tracking** uses the McLeod Pitch Method (a normalised square-difference autocorrelation), which
  is robust to the octave errors that trip up naive autocorrelation on the human voice. Each ~11 ms frame
  yields a fundamental frequency and a clarity score; frames below an RMS gate are treated as silence.
- **Note segmentation** median-smooths the fractional-MIDI pitch track, then splits it into notes wherever
  the rounded pitch changes or the voice drops out. Notes shorter than ~70 ms are discarded as blips; each
  note's pitch is the median of its frames.
- **Tempo** is estimated by searching 60–180 bpm for the tempo whose eighth-note grid best lines up with
  the detected onsets; you can override it with the slider.
- **Quantisation** snaps onsets and durations to the chosen grid (eighths or sixteenths) and resolves
  overlaps so the line stays monophonic.
- **Key detection** uses the Krumhansl–Schmuckler profiles over a duration-weighted pitch-class histogram.
- **Notation** builds bars from the quantised units, decomposing each note/rest into renderable note
  values (with dots and ties), beams runs of short notes within a beat, and spells accidentals against the
  detected key signature — the same visual language as the wheel's own stave.
- **MIDI export** writes a standard format-1 file (tempo track + a track named `Melody`) at 480 PPQ, which
  the Progression Wheel's importer reads back note-for-note.

## The hand-off to the wheel

The wheel accepts a melody two ways, both on the Rhythm panel:

- **🎤 Hum** reads the last tune sent via **➜ Send to Progression Wheel** (passed through `localStorage`
  under `pw-transcribed-melody`).
- **↑ MIDI** imports any MIDI file, choosing the track named `Melody` if present, otherwise the non-drum
  track with the most notes.

Either way the notes are quantised to the wheel's eighth-note columns and snapped to the current key's
scale, then written onto the first section's melody grid — where you can nudge, reharmonise, and play them
back with the full rhythm section. Because the grid is a single-octave diatonic sketch, the import
approximates the tune's shape rather than reproducing exact octaves; treat it as a starting point.

## Development

`src/tune-transcriber.jsx` is the single-file source; `npm run build` compiles it to `transcribe.html`
alongside the wheel's `index.html`. See [ARCHITECTURE.md](ARCHITECTURE.md) for the wheel's internals.
