import { LAYER_FX } from "./melody.js";
/* song — one serialisable document for a whole song, used by both sketch save/load and the
   shareable link. Melodies used to be session-only, so a saved sketch came back with the chords
   and none of the tune; they live here now, in a form compact enough to sit in a URL.
*/

/* ===== melody packing =====
   A melody bar is nBars × B cells, each a (usually empty) list of scale degrees, so the natural
   JSON is mostly empty brackets. Packing to flat [bar, col, degree] triples is lossless and, for a
   typical line, an order of magnitude smaller — which is what makes a whole song fit in a link. */
const packBars = bars => {
  if (!bars || !bars.length) return null;
  const c = [];
  bars.forEach((bar, bi) => (bar || []).forEach((col, ci) => (col || []).forEach(d => c.push(bi, ci, d))));
  return { n: bars.length, b: (bars[0] || []).length, c };
};
const unpackBars = p => {
  if (!p || !p.n) return [];
  const out = Array.from({ length: p.n }, () => Array.from({ length: p.b }, () => []));
  const c = p.c || [];
  for (let i = 0; i + 2 < c.length; i += 3) {
    const bar = out[c[i]], col = bar && bar[c[i + 1]];
    if (col && !col.includes(c[i + 2])) col.push(c[i + 2]);
  }
  return out;
};
/* One melody part: bars plus its instrument, register, level, mix flags and effects.
   The effects come from melody.js's LAYER_FX list rather than being spelled out here, so a new
   one is carried by saved sketches and shared links without a second edit — and only fields that
   differ from their default are written, which keeps a shared link short. */
const packLayer = ly => {
  const out = {
    b: packBars(ly.bars), i: ly.instr || null,
    o: ly.oct || 0, v: ly.vol == null ? 1 : ly.vol,
    m: ly.mute ? 1 : 0, s: ly.solo ? 1 : 0, e: ly.send || 0,
  };
  for (const [k, d] of LAYER_FX) if (ly[k] != null && ly[k] !== d) out["x_" + k] = ly[k];
  return out;
};
const unpackLayer = p => {
  const out = {
    bars: unpackBars(p.b), instr: p.i || null,
    oct: p.o || 0, vol: p.v == null ? 1 : p.v,
    mute: !!p.m, solo: !!p.s, send: p.e || 0,
  };
  for (const [k, d] of LAYER_FX) out[k] = p["x_" + k] != null ? p["x_" + k] : d;
  return out;
};
const packMelos = melos => {
  if (!melos || !melos.secs) return null;
  const secs = {};
  for (const [k, sec] of Object.entries(melos.secs)) {
    if (!sec || !sec.layers) continue;
    secs[k] = { ids: sec.ids || [], l: sec.layers.map(packLayer) };
  }
  return { p: melos.progId || "", secs };
};
const unpackMelos = p => {
  if (!p || !p.secs) return { progId: "", secs: {} };
  const secs = {};
  for (const [k, sec] of Object.entries(p.secs))
    secs[k] = { ids: sec.ids || [], layers: (sec.l || []).map(unpackLayer) };
  return { progId: p.p || "", secs };
};

/* ===== the document ===== */
// Everything needed to rebuild a song. Kept flat and short-keyed so the encoded form stays small.
function makeSong(s) {
  return {
    v: 1,
    name: s.name, progId: s.progId, tonic: s.tonic, genre: s.genre, emotion: s.emotion,
    mode: s.mode, colour: s.colour, patId: s.patId, drum: s.drum, secDrum: s.secDrum,
    instr: s.instr, melInstr: s.melInstr, kit: s.kit, pump: s.pump, secMove: s.secMove, delayId: s.delayId,
    bpm: s.bpm, selStruct: s.selStruct, contrast: s.contrast,
    edits: s.edits, inserts: s.inserts, quals: s.quals, removed: s.removed, order: s.order,
    melos: packMelos(s.melos),
  };
}
// melodies read back out; everything else is already in its final shape
const songMelos = doc => unpackMelos(doc && doc.melos);

/* ===== link encoding =====
   JSON → deflate (native CompressionStream, no library) → base64url. Falls back to plain base64
   where CompressionStream is missing, so an older browser still produces a working link. */
const b64url = bytes => {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const unb64url = str => {
  const s = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s + "=".repeat((4 - s.length % 4) % 4));
  return Uint8Array.from(bin, ch => ch.charCodeAt(0));
};
const squash = async (bytes, mode) => {
  const S = mode === "in" ? globalThis.CompressionStream : globalThis.DecompressionStream;
  if (!S) return null;
  const stream = new Blob([bytes]).stream().pipeThrough(new S("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};
async function encodeSong(doc) {
  const raw = new TextEncoder().encode(JSON.stringify(doc));
  const packed = await squash(raw, "in").catch(() => null);
  // "d" = deflated, "u" = uncompressed; the prefix keeps old links readable if the codec changes
  return packed ? "d" + b64url(packed) : "u" + b64url(raw);
}
async function decodeSong(str) {
  if (!str) return null;
  try {
    const bytes = unb64url(str.slice(1));
    const raw = str[0] === "d" ? await squash(bytes, "out") : bytes;
    if (!raw) return null;
    const doc = JSON.parse(new TextDecoder().decode(raw));
    return doc && doc.progId ? doc : null;
  } catch (e) { return null; }
}

export { packBars, unpackBars, packMelos, unpackMelos, makeSong, songMelos, encodeSong, decodeSong, b64url, unb64url };
