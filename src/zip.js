/* zip — a minimal store-only ZIP writer.
   Stems are one file per part, and a browser that is handed six downloads at once either blocks
   them or scatters them. One archive is what a producer actually wants to drag into a session.
   Entries are stored rather than deflated: wav is already incompressible enough that deflating
   would cost seconds of main-thread time to save a few percent.
*/

// CRC-32 (the ZIP variant), table built once
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = bytes => {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

// DOS time/date. Real timestamps would need a clock; a fixed valid stamp keeps archives
// reproducible and every tool reads it happily.
const DOS_TIME = 0, DOS_DATE = 33;      // 1 Jan 1980, midnight

/* Build a ZIP from [{ name, bytes }]. Returns one Uint8Array. */
function makeZip(files) {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  const u16 = v => [v & 255, (v >>> 8) & 255];
  const u32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];

  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.bytes), size = f.bytes.length;
    const local = [
      ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0),      // sig, version, flags, method 0 = stored
      ...u16(DOS_TIME), ...u16(DOS_DATE),
      ...u32(crc), ...u32(size), ...u32(size),
      ...u16(name.length), ...u16(0),
    ];
    parts.push(Uint8Array.from(local), name, f.bytes);
    central.push({ name, crc, size, offset });
    offset += local.length + name.length + size;
  }

  const dir = [];
  for (const e of central) {
    dir.push(...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0),
      ...u16(DOS_TIME), ...u16(DOS_DATE),
      ...u32(e.crc), ...u32(e.size), ...u32(e.size),
      ...u16(e.name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(0), ...u32(e.offset), ...e.name);
  }
  const end = [...u32(0x06054b50), ...u16(0), ...u16(0),
    ...u16(central.length), ...u16(central.length), ...u32(dir.length), ...u32(offset), ...u16(0)];

  const total = offset + dir.length + end.length;
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  out.set(Uint8Array.from(dir), at); at += dir.length;
  out.set(Uint8Array.from(end), at);
  return out;
}

// A filename that survives every filesystem, and still says what the stem is. Names that reduce
// to nothing but separators ("  ", "***", "...") fall back rather than becoming "-" or "." —
// a leading dot hides the file on unix, and a bare dash is no use to anyone.
const safeName = s => {
  const out = String(s).trim().replace(/[^\w.\- ]+/g, "").replace(/\s+/g, "-")
    .replace(/^[-.]+/, "").replace(/[-.]+$/, "").slice(0, 60);
  return out || "stem";
};

export { makeZip, crc32, safeName };
