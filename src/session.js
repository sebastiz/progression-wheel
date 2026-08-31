/* session — the Session view's data model: tracks (columns) and the numbered clips inside them.

   A clip's actual content is never stored here. It rides in the same per-instance maps the
   Arrange tab already writes — `melos.secs`, `secBeat`, `secBassBeat`, `secPadBeat`, `secPercBeat`,
   `secChordBeat` — under the key `sessionKey(trackId, clipId)`. `arrange.js`'s SESSION_PREFIX
   keeps those keys alive across every arrangement edit, so the same grid editors, mod panels and
   playback resolution used for a section instance work for a clip without a second implementation.

   This module holds only the small, genuinely new state: which tracks exist, what type each is,
   and which clip numbers it has. */
import { SESSION_PREFIX } from "./arrange.js";

const sessionKey = (trackId, clipId) => SESSION_PREFIX + trackId + ":" + clipId;

const TRACK_TYPES = [
  { id: "melody", name: "Instrument", icon: "🎹", tip: "A melody part — lead, counter-melody, bassline written by hand, whatever plays scale degrees. Each clip is a full application of it: its own notes, instrument, register and mod settings." },
  { id: "drums",  name: "Drums",  icon: "🥁", tip: "The kit. Each clip is its own written grid." },
  { id: "bass",   name: "Bass",   icon: "🎸", tip: "The bass line. Each clip is its own written grid." },
  { id: "pad",    name: "Pad",    icon: "🌫", tip: "Held chords. Each clip is its own written grid." },
  { id: "perc",   name: "Perc",   icon: "🪘", tip: "A second, independent percussion grid. Each clip is its own pattern." },
  { id: "chords", name: "Chords", icon: "🎼", tip: "The strum rhythm over the song's own progression. Each clip is its own written rhythm." },
  { id: "audio",  name: "Audio",  icon: "🎧", tip: "A real sound file — drop a .wav or .mp3 into a clip and launch it beat-matched to the song's tempo. Sound files live for this browser session only; they are not in saves or share links." },
];
const TRACK_TYPE_BY_ID = Object.fromEntries(TRACK_TYPES.map(t => [t.id, t]));

let uidSeed = 0;
// short, readable, unique within a browser session — these ids are never shown, only used as keys
const uid = prefix => prefix + (Date.now().toString(36)) + (uidSeed++).toString(36);

// a clip may also carry a follow action: `fa` ("next" | "prev" | "first" | "rand" | "stop",
// absent = keep looping) and `fn` (full passes before it fires, absent = 1) — set in the
// Session tab's clip editor, read by the scheduler's promotion block
const newClip = (num, nbars = 4) => ({ id: uid("c"), num, nbars });

const newTrack = (type, name) => ({
  id: uid("t"), type, name: name || (TRACK_TYPE_BY_ID[type] || {}).name || type,
  clips: [newClip(1)],
});

// the next free clip number in a track — numbers count up and are never reused within a track,
// so "clip 3" always means the same clip even after an earlier one is deleted
const nextClipNum = track => Math.max(0, ...track.clips.map(c => c.num)) + 1;

export { SESSION_PREFIX, TRACK_TYPES, TRACK_TYPE_BY_ID, newClip, newTrack, nextClipNum, sessionKey };
