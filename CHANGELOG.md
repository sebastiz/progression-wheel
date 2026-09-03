# Changelog

## Unreleased
- **More drum kits and percussion kits.** Drums go from three kits to six: the acoustic kit, TR-909
  and TR-808 are joined by the **TR-707** (bright, plasticky, 80s pop and Latin house), the **TR-606**
  (thin and buzzy — analog punk and early techno), and the **LinnDrum** (the clean deep kick and
  gated-reverb snare crack that defined mid-80s pop). Percussion goes from two kits to four: hand
  and machine are joined by **Electro** (brighter, tighter, almost clipped) and **Lo-fi** (muffled
  and dusty, like an old sample). All are real, distinct synthesis, not just a renamed filter —
  picked per-section the same way as any other kit, live in Play/render/stems.
- **Instrument and style for every extra track, not just the first.** The Style/Instrument pickers
  each Drums/Bass/Percussion/Pad panel got recently now follow whichever track's tab is open —
  add a 2nd or 3rd bass (or drums, or perc, or pad) and each one gets its own independent
  instance → type → song fallback, exactly like the first track always had, instead of only the
  first track being pickable and the rest silently following the song. Chords has no second track
  to speak of — it's one harmonic part — so this doesn't apply there.
- **Song settings, closed by default; instrument and style, in every section.** "Global settings"
  on the Arrange tab is renamed **Song settings** and starts collapsed instead of open. Each
  section's Drums, Percussion, Bass, Pad and Chords panel now carries its own **Style** (the
  pattern — a groove, a bassline, a strum) and, where the sound has one, its own **Instrument**
  (a kit, a voice, a GM patch) — Pad already had a voice picker; Bass, Percussion, Drums and Chords
  are new. Each resolves instance → this section's type → the song's own, exactly like the melodic
  narrative already did: leave it blank and it inherits, pick one and it's yours, and "→ every
  {section}" promotes that pick to every pass of the type at once ("↺ every {section}" clears that
  shared default back to the song's). This replaces the old "plays" row in ▸ Transitions & presets,
  which only ever reached the style half of that pair. Wired all the way into what you actually
  hear — Play, render, stems and Claude export — not just the grid preview.
- **A tidier melody workbench.** The Write/Suggest/Check/Duel and Draw/Move toggles used to sit as
  loose buttons floating between the part settings and the grid; they're now one bordered toolbar,
  reading as part of the melody panel instead of chrome that happened to land nearby. The six
  note-editing tools (Vary these notes, Decorate, Rearrange, Shuffle pitches, Reshape, Syncopate)
  no longer stack open by default — they're behind a single ▸ ✦ Variation toggle in that same
  toolbar, closed by default, with a ● when one of them has actually been used on the part so
  nothing gets hidden along with the controls.
- **Instrument options moved to their instrument.** In each section's ▸ Transitions & presets panel,
  the old "plays" row — which kit this section's drums use, whether its chords are in or out, which
  bass/perc pattern or pad voice it plays — is gone; those five controls now live inside the ▸
  Drums / ▸ Chords / ▸ Bass / ▸ Percussion / ▸ Pad grid they actually govern, visible exactly when
  that instrument's own grid is open. **Shape** (this section's own melodic narrative) moved the same
  way, into ▸ Melody. **Way in** and **Move** (the seam) and the **lift** row stay exactly where they
  were, since neither belongs to one instrument. Each instrument's collapsed bar picked up a ●
  indicator so a choice made this way is still visible without opening it.
- **Tidied tabs, and a Global settings panel on Arrange.** The six top-level tabs (Write, Sound,
  Sketch, Arrange, Session, Save) are now icons, so all of them fit on one row instead of wrapping —
  hover or long-press for the name. On the Arrange tab, everything that shapes the whole song at
  once — structure, style, melodic narrative, vary/syncopate, add-a-melody and the contrast loop —
  now sits behind one ▸ **Global settings** collapsible, open by default, so the section list below
  (the thing you edit most) isn't buried under it; the export buttons inside it (MIDI, Live Set,
  Live project, chart, audio, stems, Claude) are further tucked under their own ▸ **Export**
  collapsible, closed by default. Each section-type group heading (e.g. "Choruses ×2") also lost its
  own Drums / Move / Way in row — those three duplicated what every section already has in its own
  ▸ Transitions & presets panel, so they're set there now, one place instead of two.
- **Melody variation, turned up.** The **Vary repeats** / **Vary these notes** engine used to apply
  the same small, fixed number of edits regardless of how many bars it was given, so a whole
  eight-bar chorus barely sounded different between repeats — it now scales with the section, and
  the edit walk laps its catalogue as many times as it takes to spend that total instead of capping
  at one edit per kind. The **Vary repeats** slider now runs to 10 (was 6) and **Vary these notes**
  counts to ×8 (was ×5), and later restatements inside a repeated motif drift further from each
  other. Alongside it, a new **Chord-tone walk** option (in both **Suggested melodies** and
  **Melodic narrative**) freely varies the actual notes and note lengths against each bar's own
  chord — a fresh, chord-weighted pitch or a held-over note at every column of the grid, so a run
  spans anywhere from a sixteenth note up to a whole bar — instead of one fixed shape repeated
  across the changes, so even two bars over the identical chord can come out with different notes
  and a different rhythm. It deliberately ignores the Rhythm cell / role rhythm feel every other
  shape follows, since picking its own note lengths at the finest grid available is the whole point
  — a fixed cell of even slots could never produce a genuine sixteenth note no matter how it varied.
- **🎛 Voice editor — build your own synth voice.** A new panel on the Sound tab, beside the Lead
  picker: name it, stack up to four oscillator partials (waveform, harmonic ratio, level), shape
  its attack/release/sustain, and give it an optional low-pass filter and vibrato. ▶ Preview plays
  it live through the same engine a song does; ⚖ Normalise loudness renders it offline and matches
  its level to the default synth lead — the same loudness every built-in voice is measured against
  (`scripts/measure-loudness.mjs`), so a hand-built voice sits in the mix like any of them instead
  of needing to be eyeballed. Saved voices appear under "My voices" in every Lead, Bass and Pad
  picker in the app (Sound, per-section melody parts, Session), persist with the song (save,
  share-link, undo/redo all carry them), and export into "Export for Claude" with their own name
  rather than a raw id. This is the first genuinely user-authored instrument in the app — every
  built-in voice up to now was hand-tuned in source; this is the same oscillator-stack model opened
  up as a real editor.
- **Six new synth voices, and 22 more General MIDI instruments.** The Lead menu's *Synth
  (no download)* list grows from 20 voices to 26: **Clav** (a percussive, metallic funk keys sound),
  **Moog lead** (a resonant mono lead), **Pizzicato** (short, plucked strings), **Chime** (a bright
  mallet tone), **Warm pad**, and **Growl** (an inharmonic dubstep wobble, also selectable as a Bass
  voice) — each loudness-matched to every existing voice the same way
  (`scripts/measure-loudness.mjs`), so reaching for a new one never jumps the mix. The General MIDI
  palette (Sound and Lead's sampled instruments) grows alongside it, from 89 keys to 111: guitar
  harmonics, a second slap and synth bass, a second synth strings and synth brass, blown bottle,
  shakuhachi, four more synth leads (chiff, charang, voice, fifths) and four more synth pads
  (polysynth, bowed, metallic, sweep), plus a clutch of world instruments — bagpipe, fiddle, tinkle
  bell, woodblock, taiko drum, melodic tom, synth drum.
- **Unison, and a less synthetic-sounding reverb.** Every Lead/Bass/Pad voice gets a Unison control
  in the Tone panel: it stacks up to four detuned copies of the note, generalising what the
  hand-built Supersaw voice already did to every other voice — a thin voice gets fatter without a
  new preset. Voice gains are balanced by 1/√voices, so turning it up thickens a sound rather than
  just making it louder, and it is exactly off (a single, untouched oscillator) at its default, so
  every existing voice's loudness calibration holds. Separately, the reverb's impulse response now
  darkens across its decay — a one-pole lowpass whose cutoff falls over the tail, the way a real
  room's air and surfaces absorb high frequencies faster than low ones — instead of staying
  spectrally flat noise from the first millisecond to the last, which is the main reason a
  convolution reverb reads as synthetic even with an otherwise correct decay curve.
- **⧉ copy notes to…, beside the existing ⧉ copy settings to….** The existing copy on a part only
  ever carried its instrument, register, level and modulation onto other sections — never the notes,
  by design, so pushing a sound to a sibling never silently overwrote a melody it had written for
  itself. That meant there was no way to push a section's *notes* — freshly varied, decorated,
  rearranged, reshaped or shuffled — out to its siblings at all. The new dropdown is the mirror: only
  the notes travel, reshaped to fit each destination's own chord sequence and length, and the sound
  each destination already had for that part is left exactly as it was.
- **🎨 Decorate no longer gives up on a section packed too solid to have any silence left.** It only
  ever adds into empty columns — a real guarantee, and worth keeping — but a melody with a note in
  every single column (no gaps between any of them) has nowhere for that to land, and reported
  "nothing here to decorate" with no way forward. It now falls back, only in that case, to shortening
  one note's tail by a column and playing a neighbour-tone ornament in the column that frees up —
  the note keeps its onset and its pitch, just one column less of it. A section with any real gap
  still only ever gets added to; the fallback never fires unless the gap-only pass truly found
  nothing at all.
- **🎼 Reshape — named melodic-development techniques, applied to the whole section.** Everything
  else in the melody workbench nudges individual notes; this reshapes the phrase itself, the way a
  composer actually names the move: **Invert** flips the contour upside-down around the middle of the
  melody's own range (not literally its first note, which would collapse anything starting on the
  tonic straight back onto itself); **Reverse** plays it backwards; **Sequence up/down** restates the
  section's own repeated motif a scale step further from the last with every tap; **Call & response**
  resolves each restatement's last note home to the tonic. Invert and Reverse are self-inverse — press
  again to flip back, no separate undo needed for the common case. These are the same techniques the
  ✋ Move-mode selection tools (⤯ Invert, ↤ Reverse, Seq ▲/▼, ↩ Answer) already offered by hand; this
  applies them to the whole section in one tap, no selection required.
- **🎲 Shuffle pitches — a fourth, dropdown-free control: random jumps, more with every tap.**
  Nudges some of a melody's own notes up or down from wherever they already sit, by a genuinely
  random distance rather than a step to the nearest scale tone — no menu, since there's nothing to
  name for something random by design. Tapping again shuffles more: more notes touched, and further
  each one can jump. Never a no-op on a section with notes in it, even on the first tap.
- **Fixed: Vary these notes / Decorate / Rearrange had two separate things that could change the
  grid — picking a dropdown option and pressing the button — which read as a wall of controls that
  might fire at any moment, especially with all three stacked.** Picking an option now only sets up
  what the button will write next; only the button changes the grid. Each control's dropdown, button,
  undo and status also now sit together as one row rather than wrapping into whichever line had
  space, so it's clear which parts belong to which control.
- **🔀 Rearrange — move a melody's own notes around without inventing a new one.** A third promise,
  between ✦ Vary these notes (edits a note) and 🎨 Decorate (only adds): every note here may slide
  earlier or later into silence, or trade places with its neighbour, but none of them may become a
  pitch the melody didn't already have, and none may be lost — the same notes, reshuffled. Same
  dropdown-picks-a-specific-edit pattern as the other two, its own baseline and undo, right beside
  them in the melody workbench.
- **🎨 Decorate — add ornaments to a melody without ever touching what's already written.** ✦ Vary
  these notes edits notes in place (a different landing note, a note cut short); sometimes what's
  wanted is narrower than that — keep the tune exactly as it is and only add to it. Decorate does
  that: it only ever writes into silence already in the grid, so a passing tone fills a gap between
  two notes, a grace note leans into the note after it, an extra note appears where there's room, and
  a note gets held on into the silence right after it — never moving, retuning, shortening or
  removing a note you already wrote. Same dropdown-picks-a-specific-edit pattern as ✦ Vary these
  notes, with its own baseline and undo, right beside it in the melody workbench.
- **Fixed: picking a variation from the ✦ Vary these notes dropdown did nothing until you also
  pressed the button.** Choosing a named edit only stored the choice; the grid stayed exactly as it
  was until a separate tap on the button applied it, which read as the dropdown not working at all.
  Picking an option now applies it immediately, the same tap that chose it — the button remains for
  applying the current pick again, for another round of edits.
- **Fixed: melody parts were quieter than their Level slider promised.** Every melody part's chain
  was built with a make-up gain (so a 100% Level part reads as loud as the drums), but every note
  the part played re-set that same gain to just its own level and velocity, silently dropping the
  make-up the instant the first note sounded — the melody was never as loud as it looked, whatever
  the Level slider read. The per-note gain now carries the make-up too, on both the written grid and
  the arpeggiator.
- **✦ Vary these notes (was ✦ Vary repeats) now varies every section, not just the ones that repeat
  a phrase — and not just when the specific edit picked happens to fit the repeat it finds.** It used
  to find the motif a section restates and edit only the repeats, reporting "nothing repeats in this
  melody" and doing nothing on anything through-composed — which is most melodies a narrative or
  pattern writes, so the button read as broken more often than not. Worse, picking a named edit from
  the dropdown could look broken even on a section that *does* repeat: Merge two notes needs an
  adjacent pair, Add a turn needs a long held note, and the particular repeat found might not have
  one even though the section does, elsewhere. Both cases now fall back to editing the section's own
  notes directly — the same small, deliberate changes (a different landing note, a note added or
  thinned, a phrase pushed early), just applied straight to the tune, searching every bar rather than
  only the repeat it first tried. Same melody either way, never a different one and never a silent
  no-op.
- **Pick a specific variation, instead of only the auto mix.** A dropdown beside the button — in the
  melody workbench, so it's there wherever a section's melody is being edited — lists all thirteen
  named edits (Different ending, Add a passing note, Push a note early, Split a long note, Add a
  turn…), each with a one-line description of what it does. Left on "auto mix" the button behaves as
  before, picking from the whole catalogue itself; pick one and it writes only that edit, and tapping
  again lands the same kind of edit on a different note or column rather than repeating itself.
- **Every style on the Arrange tab now sets its own tone, feel and melody, not just its groove.**
  Picking a style already set tempo, drum kit, pump and bassline; it now also sets the pad voice,
  percussion kit, delay time and swing, the chord and lead instrument, the humanise (feel) amount,
  and a default melodic narrative — so choosing Dubstep reaches for a Reese lead over a wobbling
  bass and Trance reaches for a supersaw over a breathing pad, rather than leaving those on
  whatever the last style left behind. Lead instrument, chord instrument and humanise were global
  settings shared by every song; they are now remembered per progression like tempo and drums
  already were. A handful of styles with a genuinely signature use of movement or drive — dubstep's
  wobble, acid house and psytrance's resonant squelch, EBM and industrial techno's distortion —
  also set that track's Tone/Movement FX, rather than adding it everywhere it wouldn't earn its
  keep. "Recreate a famous track" inherits all of this from its style the same way it already
  inherits tempo and drums, so a track preset that doesn't specify its own sound gets its style's.
- **Ten famous tracks for every style on the Arrange tab.** "Recreate a famous track" now covers all
  68 styles (previously only 13 had any, and just 1-2 tracks each) — 658 new real, researched tracks
  bringing the catalogue to 678, each with its own key/tempo/chord-progression match and a melodic
  narrative steered toward the record's real character (never a transcribed melody — see the note at
  the top of `src/track-presets.js`). Two of the rarest, newest sub-genres (psytrance, full-on
  psytrance) land on 9 rather than 10, since a couple of candidate tracks couldn't be verified as
  real and were dropped rather than shipped as a guess. Once a style is picked, the dropdown now
  shows just that style's own tracks instead of the full list (see the previous entry below).
- **68 dance-music styles on the Arrange tab, up from 13.** Every style in the "Dance Music Family
  Tree" — the whole disco/house branch (Balearic Beat, Italo Disco, Hi-NRG, Acid House, Deep House,
  Afro House, Amapiano, Gqom, Tribal House, French/Filter House, Deep Tech, Electro House, Dutch
  House…), the bass/garage branch (Bass House, Moombahton, Speed Garage, Grime, Bassline, UK Funky,
  Brostep, Riddim, Future Garage…), the breakbeat/jungle/hardcore branch (UK Breakbeat Hardcore,
  Jungle, Liquid D&B, Neurofunk, Jump-Up, Drumfunk, Breakcore, Digital Hardcore, Happy Hardcore,
  Gabber), the electro/EBM/techno branch (Hardstyle, Speedcore, Electro-Funk, EBM, New Beat, Minimal/
  Dub/Hard/Industrial Techno) and the trance/psytrance branch (Progressive/Uplifting/Goa Trance,
  Psytrance, Full-On, Darkpsy, Progressive Psytrance) — now has its own arrangement template: a
  genre-appropriate tempo, drum kit and bassline plus a structure built for that style's actual
  phrase lengths and energy curve, not a reskin of a nearby genre. The 13 existing templates keep
  their ids and settings; a few picked up their more exact family-tree name (House → Chicago House,
  Techno → Detroit Techno, Big room / festival → Big Room / Festival House, and so on).
- **Recreate a famous track, on the Arrange tab.** A new dropdown beside the structure picker holds
  twenty real dance and electronic records — house, nu-disco, tech house, techno, trance, big room,
  progressive house, melodic techno, drum & bass, dubstep, future bass, trap and UK garage — and
  picking one reconfigures the whole song to closely match it: tempo, key, chord progression,
  arrangement shape and drum/bass groove. What it deliberately does not do is copy the real melody.
  This app generates every sound from scratch and ships as a public page under its author's own
  name, so no transcribed riff, hook or vocal line is in the catalogue or ever will be — instead
  each preset steers the app's own melody engine (a narrative shape, a variation amount, a
  syncopation level) toward the record's melodic *character* — register, repetition, contour,
  syncopation — and writes its own tune in that shape. The in-app note beside the dropdown says so
  plainly, and each entry carries a short tip on what's structurally distinctive about the pick.
  New catalogue: `src/track-presets.js`.
- **An insert-effects rack — chorus, flanger, phaser, a bitcrusher, a compressor and a stereo
  widener, on every bus.** Drums, Perc, Bass and Pad each get their two insert slots as a fifth
  **FX** tab beside Mix/Tone/Movement/Space, in their own instrument panel on the Sound tab — and,
  per section, under their own grid in the Arrange and Sketch tabs — rather than behind a separate
  bus-picker section elsewhere on the page. Lead's rack (one shared rack across all six melody
  parts) sits by the Lead voice picker on the Sound tab, since it has no per-track panel of its own
  to live inside; Master, which belongs to no instrument, keeps a small dedicated **Master FX** spot
  on the Sound tab. Distortion is back on the list too, as a second, independent drive stage rather
  than a reach into the existing Tone-panel knob — turning up both stacks two different-sounding
  drives instead of one fighting the other for the same curve. Every slot defaults to Off (no added
  node, no added latency); picking a type seeds a tasteful preset so it does something immediately.
  The master rack sits just before the limiter and, like the limiter, is skipped on stem exports, so
  stems still sum cleanly to the mix.
- **The insert rack can now vary by section.** Drums, Perc, Bass and Pad each get this as their
  instrument panel's own **FX** tab — the same tab strip their Mix/Tone/Movement/Space settings
  use, in the Arrange tab under each section and in the Sketch tab under the groove — reading
  "following the song default" until switched on. Switched on, a section dials its own amount for
  that bus, so the Drop can hit the bass with more distortion than the Breakdown; switched off, it
  plays whatever the Sound tab's rack currently is, live. Lead keeps its own small standalone
  collapsible under the melody grid, since melody parts have no such tab strip to fold it into. A
  slot's *type* stays a song-wide choice (it is built once for the whole playback, the same as a
  bass voice or a delay time) — a section can only vary the amount, not swap the effect entirely.
  Master has no per-section entry; it colours the whole song by design.
- **Arrange now opens each section's instruments the same way Sketch does.** A row of small
  melody/drums/perc/bass/pad/chords buttons used to toggle each grid open in Arrange, a second
  interaction pattern alongside the full-width collapsible bar Sketch already draws per instrument.
  Arrange draws that same bar now — one per instrument, opening to reveal its settings and grid
  together — so the two tabs share one pattern instead of two. Play-from-here, the loop toggle,
  copying a donor section's melody and recording straight onto a section's grid stay where they
  were; only the redundant row of toggle buttons is gone.
- **The melody sits on top of the mix.** The default balance is now a measured hierarchy rather
  than three separate boosts: a bar of each source at its in-song gain, compared by K-weighted
  loudness. The bass make-up gain had stacked onto the bass track's own loudness anchor, leaving
  the bass ~6 dB above everything, and the chords sat at exactly the lead's level in the same
  register — together they buried the melody. Now the melody rides level with the drums at the
  top, the bass sits beside the drums instead of over them, and the chords comp ~5 dB under the
  lead. Sliders still read 100%; stems still sum to the mix.
- **The narrative's variation is a continuous slider — and it can syncopate and vary inside
  sections.** The song-wide melodic narrative's "vary repeats" menu (four fixed levels) is now a
  continuous slider from *identical repeats* to *barely repeats*: a fractional amount resolves,
  deterministically per pass, to one of the integer edit counts either side of it, so 1.4 really
  does sit between 1 and 2 and the same song always comes back the same. The slider rewrites on
  release, so dragging it doesn't flood the undo history. Beside it, two new dials: **Syncopate**
  writes the narrative with anticipation baked in (backbeats pushed half a beat early, or every
  beat but the downbeat), applied to the tune *before* the repeats are varied so pass 0 leans the
  same way the others do; and **vary within repeats too** runs the in-section variation engine over
  every section the narrative writes, so the one-bar riff said four times drifts on each
  restatement — first statement always kept as the reference. A section's own narrative menu goes
  through the same three dials, so a section rewritten alone matches the song-wide write.
- **🧹 Start from scratch.** A button at the bottom of the Write page that clears the whole song —
  key, chords and every chord edit, drums, bass, percussion, pad, melodies, structure, automation,
  effects — back to the app's defaults. It asks before it wipes, saved sketches are untouched, and
  the wipe lands in the undo history, so ⌘Z puts the song back.
- **✍ Whole song — write one groove track across the arrangement.** Sections already follow the
  Sketch tab's groove by default, but a section stops following the moment it is given a version
  of its own — an arrangement template's pick, a pattern chosen on the Arrange tab, or a written
  grid — so changing the sketch's drums could leave half the song playing the old groove. Each
  track bar on the Sketch tab (drums, percussion, bass, pad, chords) now carries a **✍ Whole
  song** button that hands every section back to the sketch for that one track. The arrangement's
  layout survives: sections the arrangement leaves the track out of stay out, the drum
  subtractions (a build's kick-out, a DJ intro's bare kick) keep their subtraction, and no other
  track changes. The button sits disabled — with a tooltip saying so — while every section
  already follows the sketch.
- **The chords, bass and melody are audible out of the box.** All three pitched sources sat far
  below the drums at their default settings — quiet enough to disappear entirely on laptop and
  phone speakers. Each now gets a fixed make-up gain on its own bus (chords ×1.6, bass ×1.6,
  melody parts ×1.5), upstream of the sidechain ducks and applied identically in stem renders, so
  the Level sliders still read 100%, stems still sum to the mix, and nothing about the controls
  changes — the defaults are just loud enough to hear. The default Sub bass voice also gains a
  stronger octave partial: its ~65 Hz sine fundamental is below what small speakers can reproduce
  at all, so without it the bass track was silent on them no matter the level.
- **🩺 Check — the hook report card.** A third mode beside Write and Suggest on every melody
  part: the melody scored against the properties the earworm studies keep finding — mostly
  stepwise motion with one distinctive leap, a leap that gets answered, a motif that restates
  itself and drifts when it does, two to six notes a bar, three to five different pitches, an
  ending that lands on the harmony, a peak that arrives past the opening. One line per property
  with a plain-words reading, and each failing line carries a **one-tap fix** — a single
  deterministic edit (smooth the wildest leaps, lift the peak into a leap, restate the opening,
  land the last note, fold in the stray pitches) that improves exactly that line and nothing
  else. The number is a shape check, not taste, and says so.
- **⚔ Duel — hooks get good by selection.** The fourth mode breeds eight rivals of the melody
  on the grid — same tune, small deterministic mutations from the same engine ✦ Vary repeats
  uses — and plays them pairwise while the section loops: hear A, hear B, tap the winner. The
  loser's slot goes to the next rival, and when the pool runs out the champion breeds fresh
  challengers, so five minutes of taps evolves the hook instead of settling for the first
  plausible one. Keep the champion, or cancel and the melody comes back exactly as written.
- **⇢ Syncopate — anticipation as one tap.** Beside ✦ Vary repeats: push the part's on-beat
  notes half a beat early, held through the beat they left — the lean that carries most pop and
  house toplines. One tap pushes the backbeats, two pushes every beat but the downbeat, three
  puts the melody back; always re-derived from the pre-press baseline, so two taps push harder
  rather than pushing the pushed. A push never swallows a note — an onset in its way keeps the
  note where it was. Two new sticky rhythm cells join the Suggest menu with it: **son clave**,
  both ways round, and **anticipated pairs**.
- **✦ Riff the holes — the bassline as the hook.** One button on every bass grid, groove and
  section alike. It reads the section's own resolved drums and writes a riff — offbeat pump,
  tresillo, two-step, funk holes, rolling sixteenths — dropping any onset the kick owns, so the
  line interlocks with the groove instead of doubling it; odd bars answer even ones. Every press
  writes a different riff, and the result is an ordinary painted bass grid: it saves, exports
  and ↺ resets like one.
- **⤴ Chorus lift.** The standard kit for making one section land bigger, in the section's
  Transitions & presets: melody up a third in key, the lead doubled an octave up, accents leant
  on, every subtraction on the section removed (drums, chords, bass, pad and muted parts back
  in), and the hook made a little busier. One button applies the lot; each ingredient is a chip
  that shows its state and taps back off individually, restoring exactly the value it replaced —
  the kit is learnable, not a black box.
- **☕ Morning review.** Catchiness is judged cold, days later — everything sounds like a hook at
  midnight. The review on the Save tab stashes the current song and plays every saved sketch
  back to back, never-reviewed first, each starting by itself, with a verdict tap per sketch:
  😍 Keep stamps it (and badges it in the Load menu), 🔧 Rework leaves that sketch loaded and
  ends the queue, 🗑 Kill deletes with one step of undo, ▸ Skip passes. Closing the queue puts
  the stashed song back exactly as it was.
- **↓ Live project — the handoff that plays.** One zip laid out the way a Live project sits on
  disk: the `.als` at the top, the stems in `Samples/Imported` beside it, and the settings
  snapshot. Open the set, select everything in Samples/Imported and drag it onto the arrangement
  at 1.1.1 — Live lands each wav on its own audio track and the project plays the sketch
  immediately, while the MIDI tracks (already carrying the same notes) wait for real
  instruments. The stems are pre-master and sum to the mix. Audio tracks are deliberately not
  written into the `.als` itself: a Live Set is not a format to infer from the outside, as this
  exporter's own history shows.
- **The Live Set carries more of the song.** Every exported track's info text (Live's Annotation
  pane) now states the settings that shaped it — each part's instrument, register, level and
  every non-default modulation in plain words, generated from the same table the scheduler
  reads, so recreating a sound in Live is reading the track's own info text; the chords carry
  their voicing colour and strum, the bass its voice and pattern. The drawn **Level lane**
  arrives as real master-volume automation, interpolated the way the app plays it. And the
  template's tempo and meter *envelopes* — which Live reads over the Manual values, and which
  carried the reference set's 100 bpm / 4-4 into every export — now follow the song.
- **Every instrument now starts at the same audible level.** The synth voices are
  loudness-normalized — each one rendered offline and matched to the default synth lead by
  K-weighted loudness (the new `scripts/measure-loudness.mjs` prints the numbers) — so before,
  the same Level slider could mean a booming sub bass on one part and a whisper of a saw on the
  next (a ~17 dB spread across the voices); now 100% is the same loudness on every voice, and
  swapping a part's instrument no longer moves its level. The six parts also all start at
  100% instead of the old staggered 100/80/90/60/70/70 defaults: the mix begins flat and equal,
  and any ducking of the accompaniment under the lead is yours to set on the sliders. The bass
  track's per-voice boosts were re-measured the same way at C2, so its six voices land on one
  level too, anchored to where the sub bass has always sat.
- **The Sketch tab tidied into collapsible bars.** Every grid on the groove card — melody, drums,
  percussion, bass, pad and chords — now sits under its own full-width collapsible bar named for
  what it holds, with a ● when something is written there. The row of grid-opening buttons and the
  "starts from" dropdown row are gone from the card: each track's pattern menu now waits inside
  its own bar, beside the grid it seeds.
- **Style presets, per track and overall.** Each track's pattern menu opens with a *Style presets*
  group — House, Deep house, Techno, Trance, UK garage, Drum & bass, Trap, Hip-hop and more, each
  naming the pattern that style starts from — and an optional **Overall style** menu above the
  groove sets drums, bass, perc and pad to one style's row in a single pick. It is genuinely
  optional: blank until chosen, blank again the moment any track is changed by hand, and every
  menu and grid stays editable afterwards.
- **A melodic narrative touches only the melody.** The groove's parts are now inherited by a
  section part by part rather than all or nothing, and both narrative writers (the song-wide
  *Melodic narrative* menu and a section's own *Shape*) write part A alone, unmuted. Before,
  writing a narrative onto a section that followed the groove froze the groove's other parts into
  copies (or silenced them) — now bass-and-pad parts, and every other track, keep following the
  groove exactly as the sketch allocated them.
- **Audio renders show their progress.** A long arrangement takes real time to bounce — the
  offline render is nearly all of the wait — and the button used to sit frozen on "Rendering…"
  the whole while. Every render (↓ Export audio, ↓ Export stems, ↓ Export for Claude) now shows a
  live percentage on its button, using the render's own suspend/resume checkpoints, so a long
  export reads as working rather than hung.
- **↓ Export for Claude.** One button beside the other exports produces the two files an AI
  analysis needs, meant to be uploaded together in one message: the **full arrangement rendered to
  a wav** (every section in order — the same offline render as ↓ Export audio, so it is exactly
  what Play sounds like) and a **JSON snapshot of every setting that shaped it**. The snapshot is
  written to be read without the app beside it: the key, mode and scale by name; the tempo, meter,
  swing and grid; the whole running order with each section's chords, start time and resolved
  drum/bass/perc/pad/chord sources (grids written out, catalogue patterns named); every melody
  part's instrument, envelope, filter (in real Hz as well as knob percent), arpeggiator, gate,
  sends and any other modulation it carries; the track and master effects, the sidechain, the
  limiter and every drawn automation lane — plus a reference section stating each control's
  default and meaning, so an unlisted value is still known. All of it is generated from the same
  tables playback reads, so the export cannot drift as controls are added, and `npm test` holds it
  to JSON that round-trips with no undefined, NaN or React internals leaking through.
- **Play is tab-aware on Sketch.** The transport's Play (and the space bar) on the Sketch tab
  plays the groove on a loop — it reads **▶ Groove** there — and never starts the song the
  Arrange tab holds. On every other tab it plays the song from the top, clearing a groove loop
  the sketch may have left armed.
- **A Sketch tab: groove first, then subtract, then commit.** Dance music is subtractive, and the
  new tab between Sound and Arrange is that workflow on one page. The top half is **the groove** —
  a single looping section with every track on it at once: the drum, perc, bass, pad and chord
  grids, the melody parts with their mixer, and each track's effect knobs — with a ▶ 🔁 loop
  button that plays the full stack whatever the song is doing. The bottom half is **the
  arrangement draft**: its own running order, deliberately separate from the song's — add intro,
  build, drop and breakdown, reorder and stretch them. Each section arrives silent, and the cells
  are clicked to fill it with the groove's instruments (drums alone for the intro, bass and pads
  with no kick for the build). The matrix reads like a mixer, melody parts at the top and drums as
  the floor, and the Arrange strip's lanes sort the same way.
  Nothing in the draft is heard until **✍ Write to Arrange** commits it: the draft becomes the
  song's arrangement — every section playing exactly what was filled in — and each pass is then
  refined on the Arrange tab with its own grids, melodies, transitions and sweeps. The draft is
  saved with the sketch, and a running order written this way plays, exports and edits exactly as
  one picked from the catalogue.
- **Every section inherits the groove until it says otherwise.** A track resolves in order: the
  pass's own written grid, its (or its letter's) menu choice, its mute, then the **groove
  sketch's grid**, then the song-level catalogue pattern. The groove is a loop, so it cycles
  round a longer section rather than holding its last bar. Grids on sections open showing
  “following the groove”, editing one detaches just that pass, and the exports (MIDI, Live Set,
  stems, audio) resolve the same chain — the file is what you heard.
- **The groove's melody parts are allocated, not copied.** Sections with no melody of their own
  play the groove's parts, and the strip's part lanes subtract them per section through a
  dedicated allocation map — so muting the lead out of the intro never freezes a copy of the
  groove there, and a groove edited afterwards is still heard in every section that follows it.
  Sketches and shared links carry the groove and the allocation with them.
- **The exports play the per-section chord rhythm.** Where a pass has its own chord grid, the MIDI
  chord track and the Live Set now write that rhythm — each hit held to the next, accented by
  stroke (Accent 96, Down 78, Up 58), upstrokes losing the low root exactly as playback plays
  them, and an emptied bar exporting as deliberate silence. Bars without a grid keep the plain
  whole-bar chord they always exported.
- **The track settings are grouped like the melody mixer's.** The Drums/Perc/Bass/Pad panels — in
  the Sound tab and under each opened grid — now sit behind the same tabs the part mixer uses:
  **Mix** (level, pan, pump), **Tone** (both filters, resonance, drive), **Movement** (wobble,
  tremolo, auto-pan and their rates, hidden until the thing they pace is on) and **Space** (echo
  and reverb), each tab badged with a count of what it carries.
- **The section controls fold into one bar: “Transitions & presets”.** Each pass's selects now sit
  behind a collapsible bar, grouped as they are used — *seam* (Way in, Move, Shape) and *plays*
  (Drums, Chords, Bass, Perc, Pad) — with a dot on the closed bar when anything is set. Choosing a
  bass, perc or pad from its menu now supersedes a grid written earlier: the grid clears and
  re-seeds from the new choice.
- **Two more grids per section: ▸ pad and ▸ chords.** The pad grid writes the pad's rhythm — Holds
  that ring to the next hit and short Stabs, so one downbeat Hold is the old behaviour and offbeat
  stabs are house piano. The chords grid writes the chord track's rhythm for that pass alone, on
  the strum's own vocabulary (Accent, Down, Up), replacing the song's pattern for those bars — and
  the bassline's “with the chords” mode follows it.
- **A track's settings sit with its grid.** Opening ▸ drums, ▸ perc, ▸ bass or ▸ pad on any
  section now shows that track's effect knobs under the grid — the same row the Sound tab's Track
  effects panels carry, in the same place the melody grid keeps its part mixer.
- **Every track has an effects panel now.** Under Sound, four collapsible panels — Drums,
  Percussion, Bass, Pad — carry the melody part mixer's audio stage for the whole track: level,
  low-pass and resonance, hi-pass, drive, tempo-synced wobble, tremolo and auto-pan, pan, echo and
  reverb sends, and the track's own pump depth (the knob overrides the genre defaults — a bass
  that ducks hard under a pad that barely moves). Same controls, same renderer, same defaults-are-
  transparent rule as the parts; a closed panel shows a badge counting what it is doing. The
  track's drawn filter lane still takes the low-pass over from the knob wherever it is drawn.
- **The tracks' sounds live in Groove now.** Beside Kit: a **Perc kit** (hand percussion, or the
  drum machine's fixed-pitch 808-ish idea of the same eight instruments), the **Bass sound**
  (moved from the section rows), and the song's default **Pad sound** — patterns stay on the
  sections, sounds live with the kit.
- **The perc layer has real percussion now.** It used to borrow the drum kit's voices, which made
  it a second drum pattern; it now has eight hand-percussion instruments of its own — shaker,
  tambourine, triangle, cowbell, woodblock, bongo and two congas — each synthesized in kind
  (shaped noise for the shakes and jangles, tuned falling-pitch membranes for the drums, ringing
  inharmonic partials for the metal). The section perc menu offers a percussion catalogue —
  shaker sixteenths, tambourine offbeats, both son claves, a conga tumbao, a bongo ride, cowbell
  quarters and more — the ▸ perc grid's rows are these instruments, and the exported Percussion
  track lands on the right GM notes (maracas, tambourine, congas…) instead of hats and claps.
  Perc chosen from the drum table in older saves still plays on the kit, exactly as saved.
- **Bass, perc and pad are authored on the sections now, like drums and melodies.** The Sound-tab
  dropdowns are gone. Each section row carries its own **Bass**, **Perc** and **Pad** menus — a
  pattern (or pad voice) for that pass alone, "as the song" to inherit what a template wrote, or
  none — and two new grid buttons sit beside ▸ drums: **▸ perc** opens the same step grid the drum
  editor uses, layered over the kit, and **▸ bass** opens a three-row grid — Root, Fifth, Octave of
  whatever chord each bar holds, so a painted line follows the changes by itself. One note a step,
  held until the next hit: a single Root at a bar start is a held sub, offbeat steps are the house
  bounce. Grids seed from what the section is already playing, reset hands back to the menu, and
  "copy to every chorus" works as it does for drums. Everything still resolves pass → section
  letter → template, exports (stems, MIDI, Live Set) follow the per-section state bar for bar, and
  the loop sketch (no structure picked) authors the same way on its single section.
- **A percussion layer and a pad, treated exactly like the drums and the parts.** **Perc** is a
  second pattern from the same drum table, played on the song's kit under the main groove — shaker
  sixteenths, offbeat hats, a conga cell — through its own filter, never triggering the pump.
  **Pad** is a second chord voice (strings, glass, voice, organ, brass, supersaw) holding the
  chord's upper voicing a bar at a time — reverbed, half-pumped, no low root. Both off by default;
  both get a lane on the arrangement strip, a per-section in/out switch independent of everything
  else, `perc:`/`pad:` vocabulary in the templates, their own stems, their own MIDI tracks
  (Percussion on the drum channel, Pad on channel 12) and their own Live Set tracks.
- **Every track has its own drawn filter lane.** Beside the master Filter/Hi-pass/Level lanes and
  the per-part lanes, the strip now shows **Bass filter**, **Perc filter** and **Pad filter**
  whenever those tracks are on — the same draw-across-the-song control the melody parts have, each
  driving its own low-pass. The bass darkens into the breakdown while the mix stays put; the pad
  blooms across a build; the perc opens with it. Undrawn lanes leave the track untouched.
- **The bassline is a track now.** It used to be the chord voice's lowest note — welded to the strum,
  gone whenever a section dropped its chords, pumped exactly as hard as everything else. It is now
  its own source with its own **bass patterns** (offbeat push, octave bounce, rolling trance
  offbeats, disco walk, funk syncopation, held sub and more), six **synth voices** (sub, saw,
  square, picked, acid 303, reese), the hardest sidechain duck in the mix, and no reverb — low end
  in a room is mud. While it runs, the chords stop doubling the root an octave down, so the two stop
  fighting over the register. Off by default: with no bass pattern chosen, every existing song
  sounds exactly as it did.
- **Sections treat the bassline as its own layer.** A new Bass lane on the arrangement strip and a
  per-section Bass in/out control, independent of the chords — so a breakdown can lose the harmony
  and keep the bassline (the disco filter-edit move), and a drum-and-bass drop can keep its sub with
  the chords out, which the templates could not previously say at all.
- **Every dance template now carries a genre bassline** — offbeat saw under house and big room,
  rolling offbeats under trance, a walking picked line under nu-disco, held reese subs under DnB and
  dubstep — with the bass written out of DJ intros, outros and breakdowns the way each form actually
  does it. Trap deliberately has none: its 808 boom already is the bassline.
- **The bass travels with the song**: saved sketches and share links keep it, the stem bounce adds a
  bass stem, MIDI export writes a Bass track (channel 11, voiced as a GM bass), the split export
  gives it its own file, and the Live Set export lays it out as its own coloured track.
- **The DJ filter grew its other half — and a resonance control.** The arrangement strip had one
  drawn filter lane, a low-pass: darken the mix or open it. Two new lanes sit beside it. **Hi-pass**
  thins the mix from below — draw it climbing through a build and snapping back at the drop and the
  low end arriving *is* the drop, the move most modern builds are made of. **Resonance** sets how
  hard both drawn filters bite, from polite to acid squelch. Each lane drives its own filter node on
  the master path, because two envelopes on one Web Audio param silently eat each other; all three
  are linear, so stems still sum to the mix.
- **A filter lane per melody part.** Under the master lanes the strip now shows one drawn low-pass
  lane per part (*A filter*, *B filter*, …): the pad can open across the whole build while the bass
  stays dark. A part's lane is its Low-pass knob written across the song — wherever it is drawn it
  overrides the knob, and the wobble, resonance and filter-envelope controls keep working around it.
- **Section moves can thin as well as darken.** Moves now carry an optional high-pass half, and two
  new ones use it: **Build · bass drains away** (the top stays, the low end drains out, the next
  section lands when it returns) and **Telephone · mids only** (the whole section through a mid
  band). Every move resets the high-pass, so a telephone section cannot thin the section after it.
  The big-room and house templates' second builds now drain the bass on the way up.
- **Three new seam transitions** from the same vocabulary: **Bass drains → slam** (an impact whose
  lead-in is subtraction), **Telephone squeeze** (both filters pinch the seam to a mid band and let
  go), and **Telephone opens up** (an entry that arrives narrow and opens to full range).
- **The section dropdowns now say what they are.** A pass's option row read "Underwater · stays
  shut", "Reverb blooms open", "Funk groove" — each value names a *choice*, none of them names the
  *control*, and the icons beside them only explained themselves through hover tooltips that don't
  exist on a phone. Every menu now carries a label: **🥁 Drums**, **🎛 Move** (the sweep across the
  section), **⇥ Way in** (the transition into it), **🎹 Chords** (in or out), **🎵 Shape** (the
  melodic shape written onto it). The pass row is also reordered to open with the same three menus
  as the group header above it, in the same order — so "this pass overrides the row above" is
  visible in the layout instead of something you had to know.
- **Paint cells by dragging, on both grids.** A sixteenth hat across four bars was sixty-four
  separate clicks. Hold the button down and drag and it is one stroke: the cell you press decides
  what the stroke does — press an empty one and you are drawing, press a full one and you are
  rubbing out — and every cell the pointer crosses is set to that. Dragging back over your own line
  therefore erases it, where a stroke that re-toggled would flicker it on and off.

  **The stroke is one undo step**, not one per cell; without that, dragging across a bar buried
  everything before it and undo could no longer reach any of it. On a touchscreen a drag still
  scrolls the page and tap-to-toggle stays as it was — painting there would cost you the gesture
  you scroll with, on the device where the cells are hardest to hit anyway.
- **Smaller cells on both grids**, so more of a song fits before you have to scroll: melody columns
  are 20px from 26, drum steps 10px from 13, and the rows are shorter with them. The two grids are
  deliberately width-matched — cell *and* gap, since a grid with twice the columns has twice the
  gaps — so both were resized together and their bar lines still land on the same pixel.
- **The arrangement strip picks what you see.** Every section used to be written out under the
  strip at once — a twelve-section song is a very long page, and all of it is off screen except the
  one you are working on. **Tap a block and that section opens underneath**, and only that one;
  **▾ All sections** writes them all out again, and while it is on, tapping a block scrolls to that
  section rather than swapping it. Playing from a point moved onto the double tap, because picking
  is what you do constantly and starting the audio is a poor way to ask what is in a chorus — the
  ▶ on each section card does the same job.
- **Dropping a layer no longer looks like the sections going missing.** An off cell was drawn a few
  percent away from the strip's own background, so "off" and "not there" were the same picture. It
  is now sunk below the strip with a rim around it: a hole, which is what it is.
- **Sections no longer merge into one another.** Two that letter the same way get the same colour,
  so a 2px gap was all that said where one stopped. Boundaries now carry down the whole strip,
  through the section row, every lane, the staircase and the automation.
- **Fixed: the Drums lane could say a section had no drums while you could hear them.** It read the
  menus alone, but a section written on its own drum grid plays those bars whatever the pass or the
  type is set to, "off" included. The lane now resolves the way the scheduler does, and the cell is
  no longer clickable there — it has no way to silence bars you wrote by hand, and saying so beats
  accepting the click and not moving.
- **Fixed: a song with no dynamics drew every Energy bar full height**, which claims everything is
  maxed when what is true is that nothing changes. It draws flat instead.
- Fixed: a group of choruses was labelled *Choruss*.
- The user guide described drums and chords as set per section *type*; they have been per pass
  since the arrangement templates landed.
- **Dance arrangement templates — arranged, not just ordered.** A structure was only ever a running
  order: pick "Big room / festival" and the sections arrived in the right sequence, but every
  element played from the first bar to the last, which is a track with sections rather than an
  arrangement — and in dance music the drop lands because the breakdown took the kick away, so if
  nothing ever leaves, nothing can arrive. Twelve templates (house, tech house, techno, trance, big
  room, progressive house, melodic techno, drum & bass, dubstep, future bass, trap, UK garage) at
  the top of the structure picker now set what each section *plays*, not just the order: which drop
  the drums (or just the kick), which lose the chords, which melody parts are in, the filter shape
  across each section, what happens at every seam, and the automation lanes drawn across the whole
  song — plus the tempo, kit, pump and chord rhythm the style is built on. Every one of those is an
  ordinary control afterwards, and **↻ Re-apply arrangement** puts it back over the sections as they
  stand now.
  - **Drums and chords are per pass now, not per section type.** Every groove in a dance track
    letters G, so "the drums come out for *this* breakdown" — the single most useful arrangement
    move there is — had nowhere to live. The strip's Drums and Chords lanes toggle one section at a
    time, each pass has its own 🥁 and 🎹 menus in the section list, and songs saved before this
    still resolve by section letter when a pass has nothing of its own.
  - **The arrangement view shows the energy staircase.** A new read-only lane on the strip sums
    what's playing in each section (drums and the lead worth 3, chords 2, other parts 1 — the
    weights from docs/DANCE-LAYERING.md), so the shape the template built — rise, collapse, rise —
    is visible as a picture, and a flat line means everything plays from start to end.
  - **A move now spans its whole run.** "Build ×4" used to fire four two-bar filter sweeps — a
    stutter, not a build. Consecutive passes of one row set to the same move are a single sweep
    across all their bars.
  - **Three subtraction patterns in the drum menu** — tops only (no kick), kick only, offbeat hats —
    because the moves dance arrangement is actually made of are what a section *doesn't* play.
- **A framework for layering a dance track** — [docs/DANCE-LAYERING.md](docs/DANCE-LAYERING.md).
  The app grew arrangement tools one at a time — section moves, transitions, automation lanes, a
  drum grid per section — and this is the reasoning they share: the six roles a track needs one of
  each of, the scarcity rule (spectrum, rhythmic slot, space — two layers may share at most one),
  energy as a staircase whose biggest event is a subtraction, and the enter / vary / exit life of a
  layer. Ends with a table mapping each idea to the control that does it.
- **✦ Vary repeats — variation *inside* a section.** Repeats between sections were already handled:
  a narrative writes chorus 2 as a variation of chorus 1 rather than a copy of it. The boredom one
  level down was not. A section is normally one motif said three or four times — a one-bar riff over
  four bars, a two-bar hook over eight — and said identically it is the part of a sketch that wears
  out first, however good the motif was the first time.

  The **Write** tab of every section's melody now has **✦ Vary repeats**, beside the Draw / Move
  switch. It works out what the part you are editing is built from, keeps the opening statement
  exactly as written, and edits every restatement after it — a different landing note, a note added
  or taken away, a phrase pushed early, a held note broken in two — with later statements drifting
  further than earlier ones, the way a fourth chorus is further from the first than the second is.

  - **It finds the motif rather than assuming one.** Slice lengths that fit the section twice and
    divide it evenly are all tried, and the one that finds the most restatements wins — longest
    first, so a two-bar phrase is varied as a phrase (same opening, new ending) rather than bar by
    bar. A restatement counts when two thirds of its notes are the phrase it repeats, *or* when it is
    a sequence: the same rhythm and the same shape a step away, which shares no note with the phrase
    it restates and which no amount of note-matching would ever find.
  - **Tap again for more.** The button counts ×2, ×3… to ×5, and every tap re-derives the variations
    from the melody as it stood before the first one — so ×3 is what ×1 would have been at three
    edits a repeat, not three rounds of editing compounded until the motif is gone. One tap past the
    top, or **↺**, puts it back exactly as it was. Draw a note, undo, or write a pattern over the top
    between taps and the count starts again from what is actually on the grid.
  - **A melody that never repeats itself is left alone**, and says so, rather than being quietly
    rewritten because the button was pressed.
  - It reuses the thirteen edits the between-sections variation already had, so the two controls make
    the same kind of change, and nothing is drawn at random: the same melody at the same level always
    comes back the same, in the app, in the exported MIDI and in a shared link.
- **↓ Live Set — export the song as an Ableton `.als`.** A MIDI file gives Live bare clips; this
  arrives as the arrangement: named and coloured tracks, the right tempo, and every section as a
  locator on the ruler.

  The tracks arrive **without instruments**, because every sound here is built in the browser's
  audio engine and there is no way to hand Live one — the MIDI export has always had the same
  limitation. Drum notes sit at the General MIDI numbers, which line up with a Drum Rack's default
  layout. Bounce the stems alongside it for the reference of what it should sound like.

  **It is a Live 12 set**, so Live 12 opens it and Live 11 and earlier will not. The document's
  shape is taken from a set Live itself saved rather than written from the format's description,
  which is the only way to get scenes, clip slots, take lanes and the rest of what Live's loader
  expects — see `docs/ARCHITECTURE.md`.
- **A drum grid for every section.** Drums were the one part of the app you could only *choose*,
  never write: 58 catalogue patterns, one override per section **type**, so every chorus shared a
  groove and none of them could be edited. Each section card now has a **▸ drums** grid — nine rows
  (crash, ride, open hat, hat, clap, rim, snare, boom, kick) across that section's bars, in
  sixteenths.

  - **It opens on what is already playing**, the current pattern laid onto the fine grid, so you
    start by changing a groove rather than building one from nothing. Until you touch a cell the
    section is still just following the menu.
  - **It belongs to one pass**, so the second chorus gets the busier hat and the last verse the
    fill. *copy to every chorus* spreads it, *↺ Reset* hands the section back.
  - **Two pieces on one step play together** — that is all layering is. And a snare through the last
    bar is the fill a transition was waiting for.
  - Under the hood an edited bar is stored in the same array-of-step-strings the catalogue uses, so
    playback, the exported MIDI and the drum stem all take it without knowing it was edited.

  **The two grids in a section card now read as one stack.** They describe the same bars, so they
  are drawn on the same geometry: one label gutter, the same chord header, and a column unit scaled
  by each grid's own step count so a bar line falls in the same place in both — a grid with twice
  the columns also has twice the gaps, which is what used to push them a whole bar apart by the end
  of four. They scroll together, and the row labels are pinned, so "Snare" stays beside the snare
  however far along a section you are.

  **And the part panel is condensed.** Which part, what it plays and where it sits in the mix were
  two rows with a bordered box around the second, saying they were two things; they are one row now.
  Write/Suggest and Draw/Move were two stacked button rows above a grid that is the actual work;
  they are one row, and the second switch appears only in the mode that has it. With the panel's own
  padding trimmed, a section card is about a tenth shorter with its melody open — without making any
  control smaller, which is why the modulation grid stayed at two columns: three fits the height
  budget and truncates every label to "off — play the g".
- **The writing grid is its own choice.** How finely you can write a melody was read straight off
  the strum pattern — so a sixteenth grid meant picking a sixteenth *strum*, which changes the sound
  as well. Two decisions with nothing to do with each other were tied together, and in 3/4 and 5/4 a
  fine grid could not exist at all, because there is no sixteenth strum in either.

  A **Grid** menu on the Arrange tab now sets it directly: *as the rhythm* (the default, so nothing
  changes for a song that leaves it alone), *eighths*, or *sixteenths*. Write a 16th topline over an
  acoustic strum, or keep a plain eighth grid under a busy 16ths rhythm. Changing it re-times what
  you have already written, so every note keeps the moment it sounds at rather than the column it
  happened to be stored in, and it saves with the sketch and the shared link.
- **Forty-nine transitions: what happens at the seam between two sections.** A section move shapes a
  section. Nothing shaped the *join* into one — and the join is where a build pays off, where a drop
  lands, and where four good loops in a row stop sounding like four loops in a row.

  A transition is attached to the section it leads into (the **⇥** menu, beside the section's 🎛),
  with the same instance-then-section-type fallback a move has: *into every chorus* by default, and
  any single chorus can differ. They come in six families, because the six things a seam can do are
  genuinely different jobs:

  | Family | What it does | Some of them |
  | --- | --- | --- |
  | **Lifts** | rise into it | riser at 1, 2 or 4 bars; reverse cymbal; uplifter; snare roll; hat roll; roll + riser; filter opens into it; bass falls away; reverb swells into it |
  | **Impacts** | land on the downbeat | crash; sub boom; the drop; silence then the drop; riser → drop; roll → drop; reverse cymbal → drop; the full drop |
  | **Cuts** | take something away | half a beat, a beat, two beats or a bar of silence; stutter; fast stutter; stutter into silence |
  | **Colour** | bend the seam | filter dip; underwater; echo throw; echo throw into silence; reverb wash; highpass pinch; duck through the seam |
  | **Falls** | let it down | downlifter; pitch fall; fade into it; tape stop; filter closes into it; spin down |
  | **Entries** | shape the first bars | fade in over 2 or 4 bars; opens up over 2 or 4 bars; bass arrives late; reverb blooms open; stutter in; crash then open up |

  Getting *out* of a chorus is as much a decision as getting into one, which is why Falls and
  Entries are there at all — most tools only offer you the way in.

  - **Windows are in beats, and they clamp.** A four-bar riser into a chorus that follows a two-bar
    pre-chorus shortens to two bars rather than starting inside the verse. On the first section of a
    song there is no room at all, so the riser is skipped and the crash still lands.
  - **They are armed early.** Most of a transition sounds before the section it belongs to has
    started, so the arrangement is turned into cues ahead of time rather than looked up on the
    downbeat, where a lead-in would already be too late.
  - **The strip shows them** — the family's glyph at the leading edge of the block, which is where
    the transition happens — and the tooltip names it.
- **Risers and crashes bounce as their own `fx` stem.** They were going to the master, so every stem
  carried a copy of each one and a four-stem bounce summed to four risers — against the one thing
  stems have to do. They now have their own bus and their own track, which is what a DAW wants
  anyway. This applies to the existing section moves as much as to the new transitions.
- **A move set on one pass now follows that pass.** Moves have been per-instance for a while, but a
  plan edit didn't carry them: move a chorus past another and the build stayed on the numbered slot
  rather than on the chorus it was set on. Melodies have always been carried through an edit; moves
  and transitions now are too.
- **The arrangement strip reads a section's own move.** It showed the section *type's* move only, so
  a build set on the second chorus alone was invisible in its own tooltip.
- **Twenty more note effects — the layer the arpeggiator lives in, worked through properly.** A note
  event has exactly five things an effect can touch: its pitch, when it starts, how long it lasts,
  how hard it is played, and whether it exists at all. The app covered patches of that; it now
  covers all five. **Fifty-eight modulations across eight groups**, up from 38 across seven.

  **Pattern** — which notes play and when:
  - **Euclid** keeps only N notes, spread as evenly as the grid allows. 3 over 8 is the tresillo,
    5 over 8 the cinquillo; most traditional rhythms on earth are a Euclidean pattern, and the ones
    that are not sound wrong. Its own step count too, so the figure can be shorter or longer than the bar.
  - **Reverse** — each bar backwards, or the whole part.
  - **Shift** — rotate the part by grid steps, wrapping round.
  - **Speed** — read the written notes at ¼, ½, ×2 or ×4 without touching the tempo. Half time on a
    bass under a full-speed drum part is most of what makes a beat feel heavy.

  **Repeat** (new group) — the same note more than once:
  - **Note echo** with its own time, fade and **pitch shift per repeat**. Real notes, not a delay
    line, so the repeats go through the part's own instrument and filter — and can climb or sink,
    which a delay can never do because a delay only gives back what it was handed.
  - **Roll fade** — whether a ratchet dies away or builds into the next note.
  - **Strum way** — upstroke, downstroke or alternating.

  **Pitch** — now the pitch-domain note effects together:
  - **Scale steps** moves by steps of the scale rather than semitones, so it stays in key however far it goes.
  - **Snap to** folds every note into the key, pentatonic, the blues scale or the chord tones.
    Pentatonic is the safety net — nothing in it can clash with anything else.
  - **Invert** turns the tune upside down around the tonic, the fifth, or its own first note.
  - **Voicing** — close, open, spread or drop-the-top for a harmonised chord.
  - **Stray notes** — how often a note wanders a step off what was written, staying in the scale.

  **Feel** — **Humanise** (scatter each note, where Nudge moves the whole part), **Length spread**,
  **Level spread**, and **Swell**, which rides the level across the section and re-times itself when
  the arrangement changes.

  Pattern was split into **Pattern** and **Repeat**, and the pitch-domain effects moved into
  **Pitch** — eighteen note effects in one panel is a list, not a choice.

  Every one of the twenty was checked by rendering the song with it turned up and comparing against
  the same render with everything at default. The Euclidean generator is checked against named
  rhythms and against the property that makes it Euclidean at all: for every k ≤ n ≤ 32, the right
  number of hits with gaps never differing by more than one step. Version bumped to 4.66.0.
- **An Envelope group, and the rest of the arpeggiator's family.** Ten new controls in two places,
  filling the two biggest gaps in what a part could be made to sound like.

  **Envelope** (new, seventh group) — attack, decay, sustain, release, and **velocity → tone**.
  These shape one note's rise and fall, which is most of what tells the ear what instrument it is:
  strip the first thirty milliseconds off a piano and it stops sounding like a piano. They are
  modifiers on the chosen instrument's own envelope rather than absolute times, so a bell and a pad
  both stay themselves when the same control moves, and every default is dead centre. Velocity →
  tone links how hard a note is played to how far the filter opens — the link a real instrument has
  and a flat MIDI part does not.

  **Pattern** gains five siblings for the arp, all of them note effects: they rewrite the notes
  before any sound exists, which is why they follow the key and the chord on their own.
  - **Harmonise** — every note becomes a chord, built out of the scale, so it stays in key when you
    change key. On an arp it takes its harmony from the chord's own pool instead, or the two would
    disagree about what the bar's chord is.
  - **Strum** — spread a chord's notes over a few milliseconds. The difference between a keyboard
    and a guitar.
  - **Ratchet** — retrigger every note inside its own slot. Two is a flam, six is a trap stutter.
  - **Octave jump** — how often a note leaps an octave instead of playing where it was written.
    Hashed from its position, so the wandering is the same every time the song plays.
  - **Gate length** — how many of the gate's steps play before it starts again. Anything but 16 no
    longer fits the bar, so the pattern walks around the beat and takes several bars to come back.

  Thirty-eight modulations across seven groups now, ordered as a synth's signal chain. All ten were
  checked by rendering the song with each turned up and comparing: every one changes the audio, and
  with everything back at its default the render is identical to the one from before any of this
  existed.

  **A bug caught by that check:** the scheduler's helpers sit side by side rather than nested, so
  `fireNote` reaching for `li` was not a scope error the bundler reports — esbuild assumed a global
  and emitted it untouched, and the octave jump silently hashed `NaN` and never fired. `npm test`
  now walks each helper and checks it takes the shared variables it uses. Version bumped to 4.65.0.
- **A melodic shape per section.** A narrative wrote one idea across the whole song and that was the
  only way to use it. Each section now has its own shape chooser, sitting under its chords: write an
  arch across everything, then give the bridge a lament and the last chorus a climb. It writes only
  that section, over whatever is there.

  It is handed the same position in the song the song-wide write would have given it — which pass of
  its kind it is, and where it sits in the running order — so a section rewritten on its own still
  sits where it sits, and the second chorus still comes out different from the first. (Verified: two
  choruses given the same shape one after the other came out different from each other, and nothing
  else in the song moved.)

- **A move per section, not per section type.** The move chooser was in the section-type header, so
  every chorus had to build the same way. Each section now has its own, showing what it inherits as
  its first option — *"as every chorus — Build · filter opens"* — so setting it for the whole type
  still works and any single pass can differ. Songs saved before this keep their moves: playback
  falls back to the section type when an instance has none.

- **Six to ten suggested progressions per genre, up from three.** Every one of the 106 genres was
  offering a default and two alternatives, which left a third of the catalogue unreachable from the
  place people actually start. All 106 lists were rewritten — median seven each, ordered so the
  first is what the genre sounds like at its most typical and the tail is where it borrows from.
  Every progression in the catalogue is now reachable from at least one genre, and `npm test`
  enforces both halves of that.

  The catalogue itself was already the right size — 33 distinct loops, each with ten reference
  songs — so nothing new was invented to pad it out. What was missing was the way in.

  Version bumped to 4.64.0.
- **Every instrument in a section gets its own tab, and 28 modulations behind it.** The Arrange view
  had one row of part buttons shared across the whole song and five controls behind them. Now each
  section carries a tab per instrument — added the moment you add one — and each tab opens that
  instrument's own settings panel, on its own tinted background because everything in it belongs to
  that section alone. The same pad can be clean in the verse and gated, driven and sidechained in
  the chorus.

  | Group | What is in it |
  | --- | --- |
  | **Pattern** | arp (+ rate, + range), gate |
  | **Pitch** | transpose, octave double, detune |
  | **Tone** | low-pass, resonance, high-pass, filter envelope (+ decay), drive |
  | **Movement** | wobble, tremolo, pan, auto-pan — four tempo-synced LFOs |
  | **Feel** | note length, nudge, swing, play chance, accent |
  | **Space** | echo, reverb, pump |

  Twenty-eight in all, up from five, shown a group at a time — 28 sliders at once is a mixing desk,
  not a sketchpad. A rate stays hidden until the thing it paces is turned up. Each tab shows how
  many settings it carries, so a part you have worked on is visible without opening it.

  - **Copy settings between sections.** One menu on the panel: to every other verse, to every other
    section, or to a named one. It moves the whole set — instrument, register, level and all the
    modulation — and leaves each section's notes alone.
  - **↺ reset** puts every modulation on a part back to default without touching its instrument,
    register or level.
  - Which part is open is now **per section**. It used to be one choice for the whole song, so
    opening the bass in the chorus switched the verse to its bass too.

  Under it, each part now runs its own chain — `drive → high-pass → low-pass → tremolo → pan → gate`,
  with sends to the delay and to a new wet-only reverb — in the order a hardware synth uses, so the
  filter tames what the drive makes rather than the other way round.

  **Fixed on the way: two exports of one song were different files.** The drum noise buffer, the
  reverb impulse and the plucked-string excitation were all built from `Math.random`, so every
  render came out audibly different — and a stem carried a different noise burst from the mix it
  was supposed to add back up to. All three are hashed now. Repeat renders match exactly on RMS and
  to within 3×10⁻⁸ on peak, which is below one 24-bit LSB.

  Version bumped to 4.63.0.
- **Repeats can now gain and lose notes, not just move them.** The variations were all the same
  size as each other — a note moved, a note repitched. Six new kinds of edit, and note count is a
  real axis: a repeat can be busier than the first time round, or barer.

  | Axis | What changes |
  | --- | --- |
  | Note count | a note dropped into a gap, a held note broken in two, a long note turned into a three-note ornament; or notes taken away and neighbouring notes run together |
  | Rhythm | a held note released early **or run on into the space after it**; a phrase pushed early **or arriving late** |
  | Pitch | a different landing note, a different opening note, a note lifted a step |

  Thirteen edits in all, up from seven. A fourth level, **Vary a lot**, makes three edits.

  - Over eight plays of a verse: note count ranged 6–6 before, and ranges 5–10 at *Vary a lot*.
    Across the test corpus 651 varied passes have more notes than the first pass and 390 fewer.
  - Still four different melodies from four passes, every time (504/504 narrative × role × level
    combinations), and 988/1008 give six different melodies over six plays.
  - **Three of the new edits are mirrors of existing ones** — release early / run on, early / late,
    split / merge — so two edits could cancel and hand back a repeat identical to the one they were
    meant to vary. An edit now counts only if it changed something, and the walk carries on while
    the result still matches where it started.
  - Two real bugs found by widening the set: lifting a note to its neighbour could give it the same
    pitch as the note beside it, which merges the two — "move one note" silently became "lose one
    note". And thinning only ever touched *interior* notes, so a three-note bar has one candidate
    and every repeat made the identical edit. Both fixed.

  Version bumped to 4.62.0.
- **Every repeat of a section is a variation now, not a copy.** A melodic narrative wrote the same
  tune into every pass of a section, so a song with four choruses played the same eight bars four
  times, note for note. The later passes are now varied — the first time round is left alone, since
  it is the thing the others are variations of.

  Seven small edits, covering pitch and rhythm both: a different landing note, a different opening
  note, a passing note through a leap the phrase already makes, a phrase pushed a column early, an
  interior note lifted to its neighbour, a note taken away, and a held note released early. Two
  edits are always two *different* kinds of edit.

  - A **Variation** menu next to the narrative: *Identical repeats* / *Vary a little* / *Vary more*.
    Changing it rewrites straight away. It defaults to varying a little.
  - Across all 32 narratives × 4 section roles × 2 grid widths, four passes of a section now give
    four different melodies **every time** — where before they gave one. It stays recognisably the
    same tune: 96% of the note placements survive on average, 75% in the worst case, and most of
    the edits move a pitch rather than the rhythm.
  - The trick is that every hash is seeded from the section's role alone and the pass is added
    afterwards, so consecutive repeats step one place along rather than drawing at random. Seeding
    from the pass as well left 9% of combinations with two repeats identical to each other.
  - Still fully deterministic: the same song reopens, renders and shares as the same music.

  **Fixed along the way:** applying a narrative reset every part's register, level, mute, solo, send
  and effects back to their defaults. It rebuilt each part from its notes and instrument alone
  instead of going through `cloneLayer`. Now only part **A**'s notes change, which is all it ever
  claimed to do. Version bumped to 4.61.0.
- **The wheel is a diagram, not a canvas.** It rendered 708px tall at a desktop width — most of that
  the empty middle of a circle — and pushed everything else on **Write** below the fold. It is now
  capped at 500px and centred, with the text inside it sized up to compensate so nothing reads
  smaller than before: the chord names, the ring labels and the loop numbers are all as legible at
  500px as they were at 708px.
  - The wheel panel drops from 708px to 514px, and the Write tab from 1,576px to 1,365px.
  Version bumped to 4.60.0.
- **A real design system, and visible keyboard focus.** The second half of the interface work.

  | | Before | After |
  | --- | --- | --- |
  | Font sizes | 17 | **8** |
  | Corner radii | 15 | **6** |
  | Colours in the stylesheet | 45 | **26 tokens + 9 named accents** |

  - Everything refers to tokens now, so a change happens once instead of in thirty places. The nine
    hues that stay literal do so because they mean something — the warning text, the active-state
    tints — and they are held out by name rather than by accident.
  - **Keyboard focus is visible.** There was no focus style anywhere, which is an accessibility
    failure as well as the thing that most made the app read as unfinished. `:focus-visible` only,
    so clicking a button does not leave a ring behind it.
  - `npm test` now rejects a hard-coded size, radius or non-accent colour in the stylesheet, and
    fails if the focus rule disappears — the scales cannot quietly grow back one convenient value
    at a time.
  Version bumped to 4.59.0.
- **The app is in four tabs now, instead of one very long page.** **Write**, **Sound**, **Arrange**
  and **Save**. Choosing a key, drawing automation and exporting stems used to share one column, so
  you scrolled past the wheel — a whole screen you stop needing after the first minute — to reach
  the arrangement every single time.

  | | Before | After |
  | --- | --- | --- |
  | Opening screen | 2,283px · 58 controls | 968–1,576px · 31 controls |
  | Working on a song | **4,613px (5.1 screens) · 190 controls** | **3,055px on the busiest tab · 21–30 controls on the others** |

  - **Play, tempo, tap, A/B, undo and redo moved into the transport bar** and stay on every tab —
    they act on the song, not on the page you happen to be looking at. The keyboard shortcuts were
    already global and still are.
  - **◑ Hide wheel** folds the circle away on Write once you've picked a progression, taking that
    tab from 1.8 screens to 1.1. The chord strip stays either way, since that is the part you edit.
  - **The Sound tab is grouped** — *Instruments*, *Groove*, *Feel & space* — rather than four
    undifferentiated rows of dropdowns. The time signature menu no longer clips its own labels.
  Version bumped to 4.58.0.
- **Choose how many chords the loop has.** A **Chords** menu next to **Key**, from two to eight.
  Fewer takes the first few of the progression; more adds diatonic chords it hasn't used yet, so a
  four-chord axis grown to six gains a ii and a iii rather than simply repeating. Per-chord edits,
  inserts and removals still layer on top. The dot marks the progression's own length.
- **Choose the time signature.** A **Time** menu at the front of the rhythm row: **4/4**, **3/4**,
  **6/8** and **5/4**. The rest of the row filters to the meter you pick, and changing it moves you
  to a strum pattern and a kit that fit.
  - **5/4 is new content**, not just a menu entry: four strum patterns (3+2, 2+3, flowing,
    fingerpicked) and four kits, because a time signature with nothing to play in it is a dead end.
  - **6/8 is now distinct from 3/4.** They are the same length of bar and share their kits, but
    differ in how you count them — and 6/8 now **exports as 6/8** rather than as 3/4 with every
    accent in the wrong place. Four 6/8 strum patterns added.
  - Fixed on the way: a drum pattern's meter was read as `length === 6 ? 3 : 4`, which took a
    ten-step 5/4 kit for a 4/4 one. `npm test` now checks every offered meter has both patterns and
    kits, and that its MIDI signature describes the same bar its beats do.
  Version bumped to 4.57.0.
- **Workflow — the last of the roadmap.** Four small things that change how the app feels to use for
  an hour rather than what it can make.
  - **Keyboard**: **space** to play and stop, **esc** to stop, **[** / **]** to nudge the tempo
    (**shift** for five), alongside the existing **⌘Z** / **⌘⇧Z**. None of them fire while you are
    typing in a text box. Turn tips on to see the list under the transport.
  - **👆 Tap tempo** beside the BPM. It averages the gaps between taps rather than using the last
    one, so a shaky tap does not throw the answer, and a pause starts a fresh count.
  - **⇄ A/B** takes a sketch in two directions: the first press starts B as a copy, and pressing
    again flips between them. Neither is saved — it is for deciding, not for keeping.
  - **Autosave.** Your working sketch is written back automatically and restored next time. A
    **shared link always wins** over the restore — arriving at somebody else's song and being handed
    your own instead would be the worst thing this could do, so `npm test` checks the ordering that
    guarantees it.
  Version bumped to 4.56.0.
- **Fixed: pressing ✎ Edit arrangement on a plain loop blanked the screen.** `letterFor` ended in
  `sec[0].toUpperCase()`, which throws on an empty string — and an empty section name is exactly
  what the editor holds when no structure is picked. Introduced in 4.53.0, when the arrangement
  strip started showing for a single loop as well as a structure.
  - `letterFor` now returns a letter whatever it is handed, and `npm test` checks that for empty,
    blank, null, undefined and non-string input. It is called from the scheduler, the strip, the
    chord chart and the editor, so it has to survive all of them.
  - The **✎ Edit arrangement** button is no longer offered when there is no plan to edit — a plain
    loop has only the loop — rather than opening onto an empty toolbar. Switching back to *No
    structure* while still editing is safe too; that path would have crashed the same way.
  Version bumped to 4.55.1.
- **Files that say what they are.** Every download is now named for the sketch, its key and its
  tempo — *Night Drive Cm 128bpm.mid* rather than *progression-wheel.mid*. Applies to MIDI, audio,
  stems and the new chart.
- **↓ MIDI ×tracks — one MIDI file per source**, zipped: chords, drums and each melody part. The
  single multi-track file is right for a DAW that imports them properly; plenty don't, and plenty of
  people would rather drag one part onto one track than untangle a merged import. Each file keeps
  the tempo map and the section markers, so it lands at the right speed with the arrangement marked
  however you bring it in.
- **↓ Chart — a plain-text chord chart**, for handing to somebody who plays an instrument rather
  than to a DAW: the form, the chords bar by bar, the section notes and the running time. **⧉ Copy
  chart** puts the same thing on the clipboard.
  Version bumped to 4.55.0.
- **Counter-melodies — a second part that belongs with the first.** Every generator until now wrote
  a part in isolation, which is why adding a second one so often sounded like two tunes playing at
  once. Five new patterns read the lead you already wrote and place their notes against it: **a
  third below**, **a sixth below**, **answer in the gaps**, **contrary motion** and **held pedal**.
  - They tell you which part they are writing against before you commit, and if nothing else in the
    section has notes yet they say so and refuse — rather than quietly writing an empty grid.
  - Each one is checked for the relationship it claims: a third below really is a third below, and
    contrary motion really does move the other way.
- **Motif narratives — one idea that comes back.** Two new whole-song narratives built on a single
  four-note cell rather than a contour. **Motif — one idea, transformed** states it and brings it
  back in every section, changed by what that section is: plain in verses, upside down in a bridge
  or solo, backwards in a build, flattened out for an intro. **Motif — call and answer** puts the
  same cell into two-bar sentences that ask and reply.
  - The register still moves with the section's role, so a chorus is the same idea sung higher —
    which is the thing that makes a song sound like one song. `npm test` checks the shape survives
    the lift into a chorus and is mirrored in a bridge.
  Version bumped to 4.54.0.
- **Automation lanes — draw the build.** Two new lanes under the arrangement strip, **Filter** and
  **Level**. Drag across one and you draw a curve: left to right is the song, height is the value.
  A section's **🎛** move is a preset applied to one section; this is yours, and it can run across
  as many bars as you like. They stack.
  - **Filter** sweeps the whole mix's brightness, drums included — the DJ filter, not a pitched-bus
    one. Low through the breakdown, climbing through the build, and the drop opens up by itself.
  - **Level** rides the overall volume: fades, and the hole of near-silence before a drop.
  - Cutoff maps exponentially, because brightness is heard logarithmically — a linear lane would
    waste its top half doing almost nothing.
  - Curves are stored in song bars, so they stay where you drew them when you move sections around,
    and they ride along in saved sketches and shared links.
  - Both lanes sit on the master path and are scheduled identically in a stem bounce, so the stems
    still sum to the mix.
  - **The strip now shows for a plain loop too**, not just a multi-section structure — it had to,
    since the automation lanes live there and "a four-bar loop with a filter sweep on it" is a
    perfectly good sketch. The playhead follows the loop as well now.
  - Verified by rendering the same song twice, once with a drawn fade: the four quarters came out
    4.5, 10.1, 19.5 and 25.5 dB down. A curve you can draw but cannot hear is not a feature.
  Version bumped to 4.53.0.
- **Edit the arrangement.** A structure from the menu used to be take-it-or-leave-it: you picked a
  shape and lived with it. **✎ Edit arrangement** under the strip turns the blocks into something
  you can move, lengthen, copy, delete and add to — so "I like this form but I want the drop twice
  as long and the bridge earlier" is now two taps instead of a wish.
  - **Melodies travel with their sections.** This is the part that took the work: sections are
    numbered in playing order and melodies are stored under that number, so moving a chorus past
    another chorus swaps their numbers and would have left both melodies playing under the wrong
    section. Every edit carries its notes across. A copied section arrives already written; a
    stretched one repeats its last pass rather than coming back half-empty; only a section you
    *add* starts blank.
  - Nothing touches the structure in the menu — it is a copy, marked **edited**, with **↺ Reset**
    to put the original back.
  - The operations live in a new `src/arrange.js` and are covered properly: every edit is traced to
    confirm each section's melody ends up where the section did, and none of them may modify the
    catalogue plan they were handed.
  - **Fixed a bug the editor exposed**, present since the strip shipped: a lane showed a part as
    playing whenever the section had a *grid*, not whenever it had *notes*. Every section had
    something written into it, so it looked right — until you added an empty section and it claimed
    to be playing. Empty sections now read as empty, and their lane cells are properly disabled.
  Version bumped to 4.52.0.
- **The arrangement strip is where you arrange now.** Its lanes were a readout: they showed you that
  the drums never drop out and that the pad is in from bar one to the end, and then you had to go
  find the section below to change either. **Tap a lane cell to drop that element for that section,
  tap again to bring it back.**
  - Each cell says what it will do before you click, because the scopes honestly differ: drums and
    chords are stored per section *type*, so dropping the drums on *Verse 1* drops them on every
    verse, while a part's mute is per section and a click on a *Chorus ×2* covers both passes.
  - A part with nothing written in a section shows a dimmed, unclickable cell rather than a toggle
    that would do nothing.
  - **Chords can now drop out of a section at all** — there was no way to express "breakdown: drums
    only" before, so the Chords lane would have been the one dead cell among live ones.
  - Fixed on the way: muting a multi-pass run only muted the last pass. Writing several sections in
    one handler needs a single state update, because each write was spreading the same stale value
    and clobbering the one before it. `npm test` now rejects the pattern that caused it.
  Version bumped to 4.51.0.
- **Production controls — the sketch can sound like the genre now, not just be shaped like it.**
  The structures and the arrangement view told you what a dance track *is*; this is the batch that
  makes one sound like one.
  - **Arpeggiator, per part.** An arped part ignores its written grid and walks the notes of the
    chord under each bar — *Up*, *Down*, *Up & down*, *Converge*, *Thumb & top*, *Random*,
    *Octaves* — at anything from 1/4 to 1/32, through up to four octaves. The point is that it
    **follows the harmony**: change a chord, reorder the loop or switch key and the arp rewrites
    itself, with nothing to re-enter.
  - **Note gate, per part.** Eight patterns including a proper trance gate, chopping a held pad or a
    long arp into a pulse. The echo send is taken after the gate, so a gated part throws gated
    repeats instead of smearing over its own gaps.
  - **Sidechain is per part now.** It used to be one gain node on the master, so every pitched
    source pumped by exactly the same amount — fine for a demo, useless for writing dance music.
    Each part has its own depth (*auto* follows the global Pump), so the bass can duck hard under a
    pad that barely moves. The reverb return keeps its own duck, so the tail still breathes.
  - **Six dance voices**, no download needed: **Supersaw**, **Hoover**, **Acid 303** (resonant, with
    a filter envelope), **Reese bass**, **Sub bass** and **House stab**. Lead voices had no test
    coverage at all before this; all of them are now played across five registers and checked for
    the things that throw in real Web Audio rather than in a stub.
  - **Swing is a dial, not a switch** — anywhere from dead straight to nearly a triplet shuffle, and
    the useful settings are the small ones in between where house and garage live.
  - **Feel** (humanise) nudges every hit a few milliseconds and varies how hard it lands. The
    variation is derived from a hash of the beat rather than `Math.random`, so it is fixed: a render
    and a stem bounce come out identical to what you heard, and the stems still sum to the mix.
  - **Seven basslines** in the Suggest menu — *offbeat (house)*, *driving eighths*, *rolling
    sixteenths*, *tresillo*, *pumped*, *walking the chord* and a plain held root. They bring their
    own rhythm instead of taking it from the Rhythm menu, because that is what a bassline *is*, and
    they follow each bar's chord.
  - Three duds caught by the new tests and fixed before shipping: the *Octaves* arp collapsed onto one
    repeated note whenever it had only a single octave to work with, and a "Sixteenths" gate that
    was open on every step — a menu entry that did nothing at all. *Driving eighths* wrote a whole
    note rather than eighths on an eighth grid, because two of the same pitch on adjacent columns is
    how the grid stores a tie; it drops to quarters at that resolution now instead of lying.
  - Every part effect is carried by saved sketches and shared links, and each one is checked
    individually rather than trusting a whole-object comparison.
  - Verified in a browser end to end: a supersaw arp, a trance-gated pad, a part pumping at 90%,
    18% swing and 35% feel — and the four stems still sum to the mix to within 16-bit rounding,
    which is only true if the arp, the gate and the humanising are all reproducible.
  - Still to come from this group: extra section moves and automation lanes.
  Version bumped to 4.50.0.
- **The arrangement strip — see the whole song at once.** Above the section list, a horizontal view
  of the song end to end: one block per section, as wide as that section is long, with bar numbers
  across the top. Repeated sections are one block, so a dance structure reads as *Groove ×8 · Drop
  ×8* rather than fifty-two identical slivers. Tap a block to play from there; a playhead runs
  across it as it plays.
  - **A lane per element** underneath — Drums, Chords and each melody part — lit where it plays and
    dark where it doesn't. This is the bit that earns its place: an arrangement with every lane lit
    end to end is exactly the one that sounds flat, and now you can see that without pressing Play.
    A half-lit lane means the part is in for some passes of a section and out for others.
  - **Every section type has its own colour now**, chosen by what it does — statements green, hooks
    gold, lifts blue and pink, the drop hot, breakdowns cold. Nine of the sixteen section types had
    no colour at all, which meant a dance structure drew as one grey smear; `npm test` now checks
    every section letter has a colour and that no two of them collide.
  Version bumped to 4.49.0.
- **Stem export — the sketch arrives in your DAW as separate tracks.** A new **↓ Export stems**
  button beside *Export audio* bounces the drums, the chords and each melody part to its own .wav
  and hands you all of them as a single .zip. Drop the unzipped folder on a timeline and every
  source is on its own track, already aligned: re-balance it, replace the drums, keep only the
  bassline. Until now the only way out as audio was one flattened mix you couldn't unpick.
  - Files are numbered and named for what they are — `01-drums.wav`,
    `02-chords-acoustic_guitar_steel.wav`, `03-part-A-flute.wav`.
  - A part that is muted or has no notes is skipped rather than shipped as a silent file.
  - The stems **sum back to exactly the mix** — verified in a browser to within 16-bit rounding.
  - They are **pre-master**: the peak limiter is off, because your DAW's master chain should be
    doing that. The sidechain pump stays in the pitched stems even though the kick that triggers it
    lives only in the drum stem, so an isolated pad still breathes the way it did on Play.
  - Stems render one at a time, so a phone doesn't run out of memory halfway through.
  Version bumped to 4.48.0.
- **Fifty song structures, and sixteen of them are dance.** There were 24, of which exactly one was
  a dance form. The picker is now grouped — the ones written for your progression, then **Song
  forms**, **Dance & electronic** and **Club edits**.
  - New dance shapes: *Big room / festival*, *Progressive house*, *Trance*, *Deep house*,
    *Tech house*, *Melodic techno*, *Future bass*, *Dubstep*, *Drum & bass*, *Trap*, *UK garage*,
    *Hardstyle*, *Eurodance*, *Ambient / downtempo* and *Synthwave* — each with its own real shape,
    not a re-skin, and phrased in the 8- and 16-bar groups dance music is built from.
  - **Club edits** are the same song at three lengths: *Radio edit* (short intro, out by three
    minutes), *Club mix* (mixable ends a DJ can beatmatch over) and *Extended mix* (200 bars).
  - New song forms too: *Modern pop (post-chorus)*, *Hook first*, *Bridge-less pop*,
    *Verse & refrain*, *Through-composed*, *Anthem build*, *Soul / Motown* and *Call & response*.
- **Exported MIDI now carries the arrangement.** Three additions that change the file from "the
  right notes" to "the right session":
  - **Section markers.** *Intro, Build, Drop, Breakdown…* appear on the DAW's timeline ruler at the
    bar each section begins, using the name the structure gave it. Repeats of a section are one
    marker, not one per pass.
  - **Time signature.** A waltz or 6/8 sketch used to open as 4/4 with the barlines in the wrong
    places. It doesn't now.
  - **Key signature**, taken from the relative major of the current mode — so a Dorian sketch gets
    the accidentals it actually reads in, and the DAW's scale and transposition tools start right.
  Version bumped to 4.47.0.
- **Melody rhythm — the generated lines aren't stiff any more.** Every suggested melody used to put
  one note on every beat, all the same length, so whichever shape you picked came out sounding the
  same underneath. Rhythm is now its own choice: a **Rhythm** menu sits beside the melody pattern in
  a section's **Suggest** tab, with thirteen cells — *On the beat*, *Long–short*, *Short–long*,
  *Pushed*, *Off the beat*, *Tresillo (3+3+2)*, *Charleston*, *Gallop*, *Running sixteenths*,
  *Pickup*, *Two long notes*, *One held note* and *Question & space*. The shape of the tune and the
  rhythm it's played in are now independent, so the same arpeggio can be square, syncopated or
  spacious.
  - **Notes have length now.** They used to be uniformly short with a rest after each; a cell says
    how long each note lasts, so lines hold, breathe and land properly.
  - Cells are written in **beats**, not grid columns, so one cell works on an eighth grid or a
    sixteenth one and in 3/4 as well as 4/4 — a cell finer than the current grid snaps onto it.
  - **Whole-song narratives vary too.** Each section takes a rhythm suited to its role — intros hold,
    verses converse in long–short, pre-choruses push, choruses land squarely, bridges sit off the
    beat, builds run in sixteenths — while keeping each section's own note density. A narrative no
    longer writes the same rhythm from top to bottom. Version bumped to 4.46.0.
- **Exported MIDI now says which instrument each part is.** Parts already landed on their own tracks
  and channels, but the file never named the sounds, so a DAW opened every track on its default
  piano and you assigned them by hand. Each melody part now carries a **General MIDI program** taken
  from its own instrument, the chord track carries the **Sound (chords)** choice, and every track is
  named — *Chords*, *Drums*, *Part A*, *Part B*… Open the file and the arrangement is already voiced.
  - **Velocity is exported too.** Notes used to leave at a flat 92 even though playback has accents.
    The exported velocity now follows the same accent curve you hear, and is scaled by each part's
    **Level**, so the file opens roughly balanced rather than with everything at full tilt.
  - The 89 catalogue instruments map to real GM programs, and the built-in synth voices (which
    aren't GM at all) map to their nearest equivalent, so nothing exports as a silent or wrong patch.
  Version bumped to 4.45.0.
- **↓ Export audio — render the song to a .wav.** Beside Export MIDI. MIDI serves people who
  already have a DAW; a wav is the file you can send, post or play in the car. It renders faster
  than real time and uses the *same* audio graph and the same per-tick scheduler as playback, so
  what lands in the file is what you heard — voicings, kit, pump, moves, delay and every melody part.
  Real instrument samples are given a moment to load and fall back to the synth voices exactly as
  playback does. Version bumped to 4.44.0.
- **Bigger touch targets on phones.** The part buttons, mixer controls and per-section menus were
  18–23px tall, which is a miss waiting to happen under a thumb; they're at least 32px on narrow
  screens now. The desktop layout is unchanged, and the melody grid still scrolls inside its own
  container rather than pushing the page sideways.
- **Your melodies are saved now.** A saved sketch stored the chords, the arrangement, the kit and
  the moves — and not one note of melody. Everything written on the grid was session-only and gone
  on reload. Sketches now carry every melody part, with its instrument, register, level and mix.
  This was a bug, not a missing feature. Version bumped to 4.43.0.
- **🔗 Share — send someone the whole song.** Next to Save. It copies a link that rebuilds the song
  exactly: chords, structure, rhythm, kit, pump, moves and every melody part. A full song compresses
  to well under a kilobyte, so it fits in a message. Opening a link loads the song straight away.
- **Chords are voiced properly.** Every chord used to be a root-position stack, so the whole voicing
  leapt whenever the root did — the main reason a progression could sound typed rather than played.
  Each chord now takes the inversion nearest the previous one. On a I–vi–IV–V that cuts the movement
  between chords from 43 semitones to 9, and it applies to the synth voices, the real samples and
  the guitar strum alike.
- **The groove breathes.** Nothing had velocity: every drum hit and every melody note landed at the
  same level. Hits now lean on the pulse — hardest on the downbeat, then the beat, then the offbeat,
  then the finer subdivisions.
- **Delay.** A new **Delay** menu in the top panel sets a tempo-synced echo — dotted eighth (the
  dance default), eighth, quarter or sixteenth — and each melody part has its own **Echo** send in
  its mixer row, so you can throw just the lead into it. The delay returns through the section-move
  filter, so a build sweeps the echoes too.
- **Undo and redo.** **↶ Undo** / **↷ Redo** beside Save, and ⌘Z / ⇧⌘Z anywhere outside a text box.
  Sixty steps, covering everything the song document holds — chords, key, arrangement, melodies and
  the mix.
- **Melody parts get a register and a level.** Parts shipped with their own instrument, colour and
  MIDI channel — but every part still sounded in the same octave, so a part set to *Synth bass* was
  a mid-register synth rather than a bassline. Each part now has its own **Octave** (−3 to +2) and
  **Level**, plus **mute** and **solo** for auditioning, in a row under the part buttons. Defaults
  match each part's suggested instrument: the bass part starts two octaves down, the pad one below
  the lead, the saw lead one above, and the accompaniment sits a little under the lead so a
  six-part arrangement is roughly balanced before you touch anything. Register and level apply to
  playback, to the stave and to the exported MIDI — a muted part is silent in all three. Version
  bumped to 4.42.0.
- **Fixed: the first barline in the score shared a key with the first bar's.** A duplicate React key
  in the notation, which can silently drop or duplicate an element.
- **Internal: the source is now modules, not one file.** No behaviour change — the app builds and
  plays exactly as before. `src/progression-wheel.jsx` had grown to 4,600 lines, and the blank-screen
  bug in 4.40.1 was the predictable result: a refactor with call sites too scattered to sweep by eye.
  The logic now lives in seven plain modules (`theory`, `progressions`, `patterns`, `audio`, `midi`,
  `pitch`, `melody`) with a clean one-way dependency graph, leaving the component at 2,774 lines.
  Because those modules are plain JavaScript with no JSX, the test suite imports them directly — no
  build step and no React stub — and the build no longer writes intermediate files. Two mistakes that
  bundling used to hide, a module forgetting to export something and the component using a symbol it
  never imported, are now caught by `npm test` instead of appearing as a blank screen. Version bumped
  to 4.41.0.
- **Fixed: the app went blank when a song structure was showing.** Choosing a structure — or
  changing anything that re-rendered the section list underneath it — blanked the interface while
  playback carried on. Three places in the **Song & melody** panel still read a section's melody
  the way it was stored before melody parts existed, and reading it that way now throws, taking the
  whole render down with it. Nothing was lost when it happened: the audio never stopped, and a
  reload brought the sketch back. Fixed to 4.40.1.
- **Section moves — builds, drops and risers.** A build isn't a chord change; it's a filter opening
  over eight bars with a riser underneath and a crash on the downbeat of the drop. Every section
  group in **Song & melody** now carries a **🎛** menu next to its 🥁 one, with seven moves:
  *Build · filter opens*, *Build + riser*, *Drop · slam open + crash*, *Fade · filter closes*,
  *Underwater · stays shut*, *Swell · opens then shuts*, and no move at all. The sweep is scheduled
  across the section's **whole length**, so it lands exactly on the boundary whether that section is
  four bars or sixteen — change the structure and the move re-times itself. The filter sits between
  the reverb bus and the sidechain, so a build sweeps the reverb tail too, which is what makes it
  sound like the room opening up rather than a tone control. Moves are saved with the sketch.
  Version bumped to 4.40.0.
- **Melody parts — up to six per section.** A section used to hold one melody and an optional
  second. A dance arrangement wants a sub bass, a pad, an arp and a topline all at once, so the
  **A / B** pair is now a list of up to six parts (**A**–**F**), each with its own instrument and
  its own colour. **＋ part** adds one, **🗑** removes it (part A is the section, so it stays).
  Grid cells take their part's colour, and a note two parts share is split diagonally between them;
  the score inks each note by the part that plays it. MIDI export writes one track per part on its
  own channel — skipping the drum channel — so a DAW opens the arrangement with the parts already
  separated.
- **Sixteenth notes.** The whole app used to run on an eighth-note grid — eight slots to a bar in
  4/4 — which put a floor under how fine a rhythm could get. A rhythm pattern now declares how many
  columns it divides each beat into, and everything downstream reads the meter from that instead of
  assuming eighths: the scheduler, the melody grid, note values in the score, and the exported MIDI.
  Eight new **16ths** rhythms — *Offbeat 16th stabs*, *House chord pump*, *Garage skip*, *Constant
  sixteenths*, *16th funk scratch*, *Disco chug*, *Swung 16ths* and *Trap sparse* — and ten new
  sixteenth drum patterns: *House · 16th hats*, *Techno · driving 16ths*, *UK garage 2-step*, *Drum
  & bass*, *Amen break*, *Big beat breaks*, *Trap · rolling hats*, *Dubstep*, *Hip-hop 16ths* and
  *Footwork*. Rolling hats, a real breakbeat and the skipping garage kick need this resolution;
  at eighths they could only be approximated. Sixteenth rhythms are marked **· 16ths** in the
  Pattern menu.
  - Picking a 16ths rhythm **doubles the melody grid** to sixteen columns a bar, so you can write
    16th toplines, arps and offbeat lines. Switching between an eighth and a sixteenth rhythm
    re-times any melody you've already written so every note stays where it sounds — going finer is
    lossless, and going back folds notes onto the nearest column.
  - Patterns of different resolutions now **play together**: an eighth-note strum with a sixteenth
    drum kit, or a 3/4 rhythm with a waltz kit. Each bar ticks at the finest resolution in play and
    every pattern is sampled onto it, so nothing gets truncated or stretched.
  - **Swing** on a sixteenth pattern is a sixteenth shuffle — exactly the UK garage / 2-step feel.
  - The score engraves sixteenths properly: double flags and double beams, beams grouped inside the
    beat, and the time signature still reads **4/4** rather than counting columns as beats.
  - The four dance progressions now open on a sixteenth rhythm and kit — **The EDM anthem** and
    **The festival lift** on the house chord pump, **Deep-house groove** on offbeat stabs, and
    **Future-bass swell** on trap.
  Every existing eighth-note rhythm behaves exactly as before, in playback, notation and export.
  Version bumped to 4.39.0.
- **Dance kits and the sidechain pump.** The drum engine now speaks dance. Two new controls sit
  beside **Drums** in the top panel. **Kit** revoices the whole pattern as an *Acoustic kit* (what
  you had), a **TR-909** (tight punchy kick, hard click, bright metallic hats — house and techno) or
  a **TR-808** (a long tuned sub-boom that rings for most of a beat — trap and hip-hop). **Pump** is
  sidechain ducking: the kick pulls the chords and melody down and lets them breathe back before the
  next one, which is the pulse under nearly every house, techno and EDM record. Four settings —
  *No pump*, *Subtle*, *Classic pump*, *Hard pump*. The pump follows whichever kick is actually
  playing, so a section with its own 🥁 kit pumps to that kit, and a section with no drums doesn't
  pump at all. Six new drum voices came with it — **open hat**, **clap**, **rim**, **ride**,
  **crash** and an **808 sub-boom** — and eleven new patterns built from them: *House (909)*,
  *Deep house*, *Tech house*, *Techno*, *Trance*, *Big room*, *UK garage 2-step*, *Nu-disco*,
  *Trap*, *Dubstep half-time* and *Electro house*. The offbeat open hat and a clap (not a snare) on
  2 and 4 are what stop four-on-the-floor sounding like disco-rock. The four dance progressions —
  **The EDM anthem**, **Deep-house groove**, **The festival lift** and **Future-bass swell** — now
  arrive with a matching pattern, kit and pump already selected (marked ★), so picking Deep House and
  pressing play sounds like deep house. Every other progression keeps the acoustic kit and no pump,
  exactly as before, and sketches saved before this release reload sounding as they were saved. Kit
  and pump are saved with the sketch and written into the exported MIDI, which now emits all the new
  percussion on channel 10 and sets the matching GM percussion program. Version bumped to 4.38.0.
- **Melodic narratives — write a whole song's melody in one pick.** A new **Melodic narrative** menu
  sits directly under the song-structure chooser in **Song & melody**. The per-section Suggest tab
  shapes one section; a narrative is a single melodic idea told across the *whole* song — choose one
  and it writes melody **A** of every section at once, taking each section's register, note density
  and contour from what that section is (verse, chorus, bridge, intro…), which pass of it this is,
  and where it falls in the running order. 19 shapes: **Arch**, **Song-length arch**, **Terraced**
  (a step higher each bar), **Range expansion at the hook** (narrow verses, the octave opened for the
  chorus), **Descending lament**, **Ostinato cell**, **Long climb across the song**, **Withheld
  peak** (the top note spent only in the final section), **Question & answer**, **Call & response**,
  **Motif development**, **Widening pendulum**, **Chant then release**, **Waves**, **Cascading
  sequence**, **Leap and fill**, **Speech contour**, **Chord-locked hook** and **Suspension chain** —
  each with a note on what it does and a few songs that do it. **↻ Rewrite** re-runs it after a key
  change, a new structure or edits you'd rather discard; **↶ Undo** restores the melodies as they
  were. It only touches layer A, so a 2nd melody stays put, and everything it writes is ordinary grid
  notes you can edit section by section. Version bumped to 4.37.0.
- **Per-section drums — build dynamics across the song.** Drums used to be one global kit for the whole
  song. Now every section in **Song & melody** carries its own **🥁** menu in its group header (Verses,
  Chorus, Bridge, Intro…): leave it on *global drums* to follow the top Drums picker, choose a different
  kit for contrast, or pick *No drums* to drop percussion out entirely for that section. That's the
  simplest way to shape dynamics — strip the kit on a verse, slam it back for the chorus, or give the
  bridge a half-time shuffle. The per-section choice drives live playback, is saved with the sketch, and
  is written correctly into the exported MIDI (each bar emits its own section's pattern). Version bumped
  to 4.36.0.
- **Call & response, plus Select-all for notes and chords.** Two more melody-writing helpers and a
  selection fix. **↩ Answer** (in the melody Move toolbar) takes the selected phrase — the "call" — and
  echoes it right after itself as a "response" whose final note resolves home to the tonic: instant
  antecedent → consequent. And because a marquee could only grab what was scrolled on screen, both the
  melody Move toolbar and the chord **Reorder** bar now have a **Select all** button — one tap selects
  *every* note in a section (even off-screen) or every chord in the progression, so a transform (repeat,
  sequence, invert, reverse, time-shift, move, remove) applies across the whole thing. Version bumped to
  4.35.0.
- **Melodic-development tools in the melody grid's Move mode.** Select notes (drag a box, or tap one) and
  the Move toolbar now offers the classic ways to turn a motif into a melody, alongside the existing
  nudge and **½× / 2× time** (augmentation / diminution): **⧉ Repeat** (copy the selection right after
  itself), **Seq ▲ / Seq ▼** (copy right after, transposed a scale step — tap again to keep a sequence
  climbing), **⤯ Invert** (flip the contour upside-down around the first note) and **↤ Reverse**
  (retrograde — play the selection backwards). Each keeps the new notes selected so you can chain moves.
  Version bumped to 4.34.0.
- **Remove chords next to Add; melody tools behind one button; scale readout gone.** Three tidy-ups.
  (1) A **🗑 Remove** button now sits right beside **＋ Add** under the wheel — tap it, then tap any chord
  on the strip or the wheel to delete it (Add / Remove / Reorder are one-tap modes; the last chord can't
  be removed). (2) The melody tools are folded into a single **🎵 Add a melody** button that expands to
  reveal Hum, MIDI-file import, **🔴 Record**, the "→ lands on" section and the Guitar/Voice record
  source — collapsed by default, so the panel is clean until you need it. (3) The one-line **Scale
  (<key>): notes** readout is removed. Version bumped to 4.33.0.
- **One-tap "Add recorded melody" button.** Recording used to mean setting a source up top, then scrolling
  down to find a section's ● Rec button — confusing. Now the **Add a melody** row has three matching
  actions in a line — **🎤 Hum · ↑ MIDI file · 🔴 Add recorded melody** — and all three drop the melody
  onto the section chosen in **→ lands on**. Press **🔴 Add recorded melody**, play or sing (a live level
  meter and pitch readout show what it's hearing), press **■ Stop & add**, and the transcribed line lands
  on that section. The Guitar / Voice choice is now clearly labelled **Record source** (it just tunes the
  pitch detection). The per-section ● Rec buttons still work for recording straight onto one section.
  Version bumped to 4.32.0.
- **Genre-specific chord sequences, so styles stop sharing the same loops.** Eight new signature
  progressions (library now 33) give the rock, roots and soul genres their own defaults instead of all
  leaning on the four-chord axis: **Riff rock** (i–♭III–IV, hard/classic rock), **Grunge chromatic**
  (I–♭III–♭VI–♭VII, grunge / alt / nu-metal), **Britpop climb** (I–iii–IV–V), **Emo lift** (IV–I–V–vi,
  emo / pop-punk), **Country boom-chick** (I–IV–I–V), **Celtic reel** (i–♭VII–IV, Dorian), **Motown
  turnaround** (I–vi–ii–V) and the **Slow-jam IV–iv** (I–iii–IV–iv, neo-soul / R&B). Each genre in Pop &
  Rock, Folk/Country/Roots and Blues/Soul/Funk was re-pointed so it now *leads* with a characteristic
  loop (Grunge → grunge, Hard Rock → riff rock, Britpop → britpop, Country → country, Celtic → celtic,
  Motown → motown turnaround, Neo-Soul → the IV–iv jam, and so on), each with its own groove and tempo.
  A borrowed `iv` in major keys was added to make the R&B move possible. Version bumped to 4.31.0.
- **Tidier Song & melody panel.** The melody tools are now grouped and labelled so their roles are clear:
  an **Add a melody** row (🎤 Hum · ↑ MIDI file · → lands on <section>) for bringing a whole tune in, and
  a separate **Record** row (🎸 Guitar / 🎤 Voice — the source the per-section ● Rec button listens for)
  with **Legato** and **↓ Export MIDI** alongside. The redundant **Chords in <key>** row (it just
  duplicated the wheel's haloed chords) and the **Landing notes** feature (the Scale row's toggle and its
  per-chord expansion) are removed; a plain one-line **Scale (<key>): notes** readout stays as a quick
  reference for the melody grid. Version bumped to 4.30.0.
- **Remove several chords at once in Reorder mode.** Reorder mode already lets you tap chords to select
  them; now there's a **🗑 Remove** button beside Move, so you can select one or many chords and drop them
  all in a single tap — a first-class counterpart to **＋ Add**. It won't let you remove every chord (the
  button greys out when the whole loop is selected), and it handles both catalogue chords and ones you
  added from the wheel. Version bumped to 4.29.0.
- **Rhythm controls moved up top; the strum-arrow grid is gone.** The Rhythm panel was a grab-bag, so it's
  been dissolved. **Pattern** and **Drums** (plus the **Real** and **Click** toggles) now sit in the main
  controls, right under **Sound** and **Lead** — all the "how it sounds and feels" settings in one place.
  The animated **↓ ↑ · strum-arrow grid was removed** (the pattern still drives playback and MIDI, it just
  isn't drawn). The melody-related tools that were stranded under Rhythm — **🎤 Hum**, **↑/↓ MIDI**, the
  "which section a melody lands on" picker, the **🎸 Guitar / 🎤 Voice** record source, and **Legato** —
  moved into the **Song & melody** panel where they belong. Version bumped to 4.28.0.
- **Add any chord straight from the circle of fifths.** A new **＋ Add** button by the chord strip turns
  on an add mode: every node on the wheel — all twelve majors and twelve minors — lights up with a dashed
  ring, and tapping one **appends that chord to the end of the chain**. Keep tapping to add several, then
  press **✕ Done**. Added chords carry a proper Roman numeral when they're diatonic (or a neutral • when
  they're chromatic, with the gold ✦ marking them outside the key), and each has its own identity, so the
  existing **⇄ Reorder** works on them — drop a chord in from anywhere and slide it into place. Version
  bumped to 4.27.0.
- **Neater interface — the explanatory text is now opt-in.** The app had grown a lot of always-on helper
  prose, which made it feel cluttered. A new **Tips** toggle in the header (off by default) hides the
  longer guidance paragraphs — the chord-card how-to, the stave and section explainers, the landing-note
  and structure notes, the song-key caveats — leaving clean panels with just the controls and results.
  Flip **Tips** on to bring the guidance back. Contextual, in-the-moment hints (what a tap will do, what's
  currently playing, recording instructions) stay visible either way. The controls panel is also
  decluttered: the power-user harmony controls — the **secondary-dominant**, **parallel-chord** and
  **borrowed-colour** menus plus the **Par / Sec** wheel overlays — now sit behind a **＋ Advanced**
  disclosure (collapsed by default), so the everyday row is just Key · Mode · Genre · Emotion · colour ·
  dice. The wheel's tap-to-swap hint, the colour legend beneath the wheel (tonic / subdominant /
  dominant / chords-in-key / ✦ / order), and the strum-pattern description are gated the same way — hidden
  by default, back with Tips. Version bumped to 4.26.0.
- **Signature grooves and tempos for the new loops.** The eleven new progressions (the five dance loops,
  six jazz/Latin/soul loops) now each carry their own default rhythm pattern and tempo instead of falling
  back to the generic pop strum — so a Bossa pick brushes a bossa, Salsa and Son ride a tresillo/clave,
  EDM and House stomp four-on-the-floor, the festival lift and future-bass swell get their tempos, gospel
  sways in 12/8, and neo-soul sits back on a funk scratch. Flamenco also gets its groove. Version bumped
  to 4.26.0.
- **A wider progression library so same-family genres pull distinct loops.** Six more authentic
  progressions join the catalogue (now 25 in all): **Rhythm changes** (I–VI7–ii–V7, the jazz/bebop
  standard), **Bossa nova turnaround** (I–II7–ii–V7), **Son guajira** (I–IV–V–IV, the Cuban son vamp),
  **Bolero cadence** (i–♭VI–iv–V), **Gospel turnaround** (vi–ii–V–I) and **Neo-soul descent**
  (IV–iii–ii–I). Genres across Jazz, Soul/Funk, Hip-Hop and especially Latin are re-mapped onto them so
  neighbouring styles differ: Bebop/Ragtime → rhythm changes, Bossa Nova/Samba/Latin Jazz → bossa
  turnaround, Son Cubano/Cumbia/Mariachi → son guajira, Bolero/Tango → bolero cadence, Salsa/Mambo →
  montuno, Soul/Motown/Gospel → gospel turnaround, Neo-Soul/Lo-Fi → neo-soul descent. Jazz and Latin
  loops lean on secondary and dominant-function chords, so their idiomatic borrowed chords (a VI7 or II7,
  a major V in a minor key) carry the gold ✦ "outside the key" mark — correctly, the same way the
  Andalusian cadence and flamenco loop do. Version bumped to 4.25.0.
- **Dance and Latin genres get progressions that actually move.** Many of the new dance/EDM genres were
  defaulting to bare two-chord modal vamps (House → `i–IV`, etc.) or all landing on the same loop — so
  they read as "no chord changes." Five new progressions with real movement fix that: **The EDM anthem**
  (vi–IV–I–V), **Deep-house groove** (i–iv–♭VII–♭III), **The festival lift** (i–♭VII–♭VI–♭VII),
  **Future-bass swell** (IV–V–iii–vi) and **Latin montuno** (i–iv–V). Every Dance & Electronic and Latin
  genre is re-mapped so its default loop has three or four chords and neighbouring genres differ (House →
  EDM anthem, Deep House → Deep-house groove, Trance → festival lift, Techno → Aeolian cadence, Future
  Bass → future-bass swell, Salsa/Latin → montuno, and so on). The short modal vamps are still available
  as secondary picks for genres that genuinely stay static (minimal techno, ambient). Version bumped to
  4.24.0.
- **A much bigger genre list.** The Genre picker grows from 9 to **106 genres**, organised into nine
  families shown as labelled groups in the dropdown: **Pop & Rock** (15 — Pop, Classic/Hard/Arena Rock,
  Alternative, Grunge, Britpop, Punk, Pop-Punk, Emo, Shoegaze, Post-Rock, Psychedelic, Surf), **Metal &
  Heavy** (Heavy/Thrash/Doom/Power/Prog/Nu-Metal), **Blues, Soul & Funk** (R&B, Soul, Motown, Funk,
  Disco, Gospel, Neo-Soul), **Jazz & Standards** (Swing, Bebop, Bossa Nova, Cool Jazz, Ragtime, Lounge),
  **Folk, Country & Roots** (Country, Bluegrass, Americana, Rockabilly, Celtic, Singer-Songwriter),
  **Dance & Electronic** (29 — EDM, House + Deep/Tech/Progressive/Future/Tropical House, Nu-Disco, Techno,
  Minimal, Trance, Psytrance, Big Room, Electro House, Dubstep, Future Bass, Drum & Bass, Jungle, UK
  Garage, Breakbeat, Hardstyle, Eurodance, Synthwave, Ambient, Downtempo/Trip-Hop, IDM, Lo-Fi, Hip-Hop,
  Trap), **Latin** (20 — Salsa, Son Cubano, Mambo, Cha-Cha-Chá, Rumba, Timba, Latin Jazz, Samba, Bossa
  Nova, Bachata, Merengue, Cumbia, Reggaetón, Latin Pop, Tango, Bolero, Mariachi, Norteño, Forró), **World
  & Modal** (Flamenco, Reggae, Ska, Afrobeat, Middle Eastern, Klezmer, Bollywood) and **Cinematic &
  Classical** (Film, Trailer, Horror, Classical, Baroque, Dreamscore). Each genre is a curated, ordered
  set of the catalogue's progressions, so the wheel and the Suggested progressions panel reflect the
  style you pick. Version bumped to 4.23.0.
- **Flamenco mode (Phrygian dominant).** The Mode selector gains the **Phrygian dominant** scale — the
  flamenco / "Spanish" sound: 1 ♭2 3 4 5 ♭6 ♭7 (Phrygian with a major 3rd). Selecting it re-colours the
  scale, the pentatonic highlight, the melody grid, the landing notes and the key label, and lists the
  mode's diatonic chords (a major tonic **I**, the ♭II major, a ♭VI **augmented**, and so on) both in the
  "Chords in <key>" row and as gold halos on the circle of fifths — all correctly spelled (E Flamenco →
  E F G♯ A B C D). It ships with a dedicated **Flamenco cadence** loop — the Andalusian descent resolving
  to a major Phrygian tonic, **iv–♭III–♭II–I** (Am–G–F–E in E) — so picking the mode offers it as a
  one-tap load onto the wheel, just like the other modal loops. True to the style, the ♭III (G major,
  with its natural 3rd) is marked as sitting *outside* the strict Phrygian-dominant scale: that's
  flamenco's signature modal mixture, not a mistake. The loop is also filed under Metal, Cinematic and
  Dark / Tense for discovery. Version bumped to 4.22.0.
- **Picking a Mode now offers a matching progression for the wheel.** Choosing a Mode set the scale and
  the haloed chord palette, but it never gave you an actual *progression* to start from — the loop on the
  circle of fifths stayed whatever you had. Now, when the Mode you pick doesn't match the loop on the
  wheel, a suggestion appears: the catalogue's characteristic loop(s) for that mode (e.g. Lydian →
  **Lydian bright**, Dorian → **Dorian groove**), each a one-tap button that loads the loop onto the wheel
  and snaps the Mode back to Auto so chords and scale line up. Modes with no catalogue loop yet (Locrian)
  say so and point you at the haloed chords to build your own. Version bumped to 4.21.0.
- **See the mode on the wheel, and spot chords that leave the key.** Two changes make the Mode selector
  visible where you're actually looking — the circle of fifths. (1) The wheel now **haloes the mode's
  seven diatonic chords**, with the tonic ringed in gold, so switching Mode visibly relights a different
  set of chords on the wheel instead of only changing the read-outs below it. (2) Any chord in your loop
  that falls **outside the current mode's palette** is flagged — a gold **✦** on its chord pill and a gold
  badge on its wheel node (both with a "sits outside <key>" tooltip). Diatonic loops show no flags;
  borrowed chords, secondary dominants, or a deliberately cross-family Mode light up so the tension is
  visible rather than implied. A legend ties the halo and the ✦ to the current key. Version bumped to 4.20.0.
- **A Mode chooser, all 12 keys spelled properly, and a live diatonic-chord readout.** The **Key** box
  now spells every key the way it's written — sharps in sharp keys (E, B, F♯…), flats in flat keys — and
  a new **Mode** selector beside it sets the scale you write against: Ionian (major), Dorian, Phrygian,
  Lydian, Mixolydian, Aeolian (minor) and Locrian. It defaults to **Auto**, following the loaded
  progression's own mode, and the modes are grouped into "fits this progression" and "cross-family — adds
  tension" so you can borrow colour deliberately. The chosen mode drives the **scale**, the pentatonic
  highlight, the **wheel labels**, the melody grid, the landing-note guidance and the key label, all
  correctly spelled. A new **Chords in <key>** row shows the mode's seven diatonic triads with their
  Roman numerals — and their qualities shift from mode to mode (IV is major in Dorian, minor in Aeolian),
  so you can see how a mode re-colours the harmony. Each classic progression now declares its true mode,
  which fixes a long-standing quirk where modal loops (Dorian groove, Lydian bright, Phrygian dark,
  Mixolydian rock) showed a plain major/minor scale instead of their own. The Mode override is
  saved with sketches and resets to Auto when you pick a new progression. Note: chord *symbols* keep their existing
  spelling; this pass fixes the key, scale and melody read-outs. Version bumped to 4.19.0.
- **See every suggested progression for a genre, and pick a chord version from a dropdown.** Two
  changes to make the sketchpad clearer. (1) A new **Suggested progressions** panel sits above the wheel
  and lists *all* the classic loops behind the chosen Genre / Emotion — not just the one the app happened
  to load — each as a tappable card showing its chords in the current key plus the Roman-numeral shape.
  The loop on the wheel is highlighted; tap another card to load it. Before, the genre only silently
  chose the top loop and the rest were invisible. (2) The per-chord **Version** control is now a
  **dropdown** listing the modifications for that chord (7th · maj7 · 6 · add9 · 9 · sus2 · sus4, with the
  minor and dominant families offering their own), keyed off the chord's base family so the list no
  longer shifts under you when you pick one. Choosing a version updates the name, the wheel, playback,
  notation, MIDI **and the guitar + piano fingering diagrams** live, and a **Reset** returns the chord to
  the colour default. Version bumped to 4.18.0.
- **Per-chord versions, plus remove and duplicate.** Tapping a chord in the strip still opens its
  guitar + piano shapes, and now also lets you re-voice **that one chord** without touching the rest: a
  **Version** row offers, by family, the triad, 6, 7 / maj7, add9, 9, and sus2 / sus4 (minor chords get
  m6 / m7 / m(add9) / m9; dominants get 7 / 9 / 7sus4). The pick beats the global Triads/7ths/9ths
  colour for that chord, and flows through the name, the wheel, playback, notation and MIDI. The card
  also has **🗑 Remove** (drop the chord — makes the progression shorter) and **＋ Duplicate** (add a
  copy right after — makes it longer), so you can shape the length chord by chord. New chord qualities
  (add9, 6, m6, m(add9), sus2, sus4, 7sus4) are first-class across audio, the stave and fingerings; the
  guitar diagram shows the nearest playable shape with a short "how to extend it" caption. Edits persist
  in sketches and clear with Reset. Version bumped to 4.17.0.
- **Installed app now updates.** The PWA service worker was cache-first with a hand-set cache name, so
  an installed Home-Screen app served a stale `index.html` forever — new versions never appeared. HTML
  is now fetched **network-first** (falling back to cache offline), so a new build shows up on the next
  online launch, and the build **stamps the cache name with the app version** automatically, so each
  release invalidates the old cache. Static assets (React, icons) stay cache-first for speed and offline
  use. Version bumped to 4.16.0.
- **More reliable section recording.** The in-app **🎸 Rec** was capturing only intermittently. Two
  fixes: (1) the live meter/pitch readout no longer runs a full pitch-detection pass 60×/second on the
  main thread — that was starving the (main-thread) audio-capture callback and dropping input; it now
  samples at ~10 Hz and the capture buffer is larger, so nothing gets dropped. (2) The note tracker now
  normalises the take, gates against the recording's *own* noise floor instead of a fixed threshold,
  and bridges brief dropouts — so a quiet or decaying guitar note is caught and stays a single note
  instead of vanishing or fragmenting. The guitar profile also detects slightly shorter notes and
  tolerates the lower clarity of a harmonically rich, decaying pluck.
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
