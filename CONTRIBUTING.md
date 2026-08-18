# Contributing

`src/progression-wheel.jsx` is the source of truth. `index.html` is generated — never edit it by
hand. After any change: `npm install && npm run build`, then open `index.html` to test.

Most contributions are data, not logic:

## Add a progression

In the `PROGRESSIONS` builder array add
`["id", "Display name", "major|minor", "I V vi IV", [ ...ten "Song — Artist" strings ]]`,
add ten tonic semitones to `SONG_KEYS.id` (0=C … 11=B, aligned with the songs), reference the id
from `CATEGORIES` (genres/emotions), and give it a `PATTERN_DEFAULT` and `BPM_DEFAULT`. Optionally
add structures via `defStruct("id", [...])`.

## Add a strumming pattern

One line in the `PATTERNS` builder: `["id", "Name", ">-DU-UDU", "description", swingFlag]`.
Characters: `>` accented down, `D` down, `U` up, `-` rest. Length sets the meter: 8 = 4/4, 6 = 3/4.

## Add a drum beat

One line in the `DRUMS` builder: `["id", "Name", "KH H SH H KH H SH H"]` — space-separated slots,
letters K/S/H per slot, `.` for silence. Match the slot count to the meters it's meant for.

## Add a song structure

`defStruct(progId, [[name, tip, rows]])` where each row is `"Section|nums|reps|note"` and `nums`
is space-separated numerals or `LOOP` / `HALF1` / `HALF2` / `HOLD1`. Universal (any-progression)
forms go in `UNIVERSAL` with the same row format.

## Add an arrangement template

Dance templates live in `src/arrange-templates.js` — a structure plus, per row, what *plays*:
`["Section|nums|reps|note", { drums, chords, parts, move, trans, filter, level }]`, with the
style's `bpm` / `drum` / `kit` / `pump` / `pat` alongside. Every id must exist in its catalogue
(the tests check), transitions land once per row, and the energy across the sections has to rise,
collapse and rise again — a template whose sections all play the same thing is the problem the
feature exists to fix.

## Add a colour move

Borrowed chords and mediants live in `BORROWED` / `MEDIANTS` (`[tag, offset, quality, insertPos]`);
move-specific reference songs live in `SEC_SONGS` / `PAR_SONGS`.

## Guitar shapes

`OPEN_SHAPES` maps `root+quality` → `[frets, fingers]` (strings low E → high e; -1 mute, 0 open).
Anything absent falls back to computed E-shape/A-shape barres in `guitarShape()`.

## Style

Plain React (hooks, no external deps at runtime), single file, data tables over branching logic,
and every derived value flows from the `chords` memo — keep it that way and most features stay
~20 lines.
