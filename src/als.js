/* als — writing an Ableton Live Set.

   A `.als` file is gzipped XML. That is the whole trick: no library, no binary format, just a
   document and `CompressionStream("gzip")`, which the browser already has (song.js uses the same
   API for the shared link).

   Why bother when the app already exports MIDI: Live imports a MIDI file as bare clips and throws
   away everything around them. A Live Set arrives as an arrangement — named tracks, coloured,
   in order, at the right tempo, with the sections marked as locators on the ruler. That is what
   "open my song in Live" is supposed to mean.

   What it cannot carry is the sound. Every instrument in this app is a Web Audio graph — a synth
   voice, a sampler, a chain of filters and LFOs — and Live has no way to be handed one. The tracks
   therefore arrive empty of devices, waiting for you to drop your own instrument on each. Nothing
   about the file format changes that; a MIDI file has the same limitation for the same reason. The
   arrangement transfers, the notes transfer, the sound does not — so the stem bounce is still the
   reference for what it should sound like.

   Times are in beats throughout, which is what Live's XML uses. A bar is `beatsPerBar` of them.
*/

// XML text has to survive a section called "Verse & Chorus" or a sketch named after its author
const esc = s => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&apos;")
  // Live's parser stops at a control character, and a name can arrive with anything in it
  .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
const alsEl = (tag, v) => `<${tag} Value="${v}" />`;
const alsNum = n => (Math.round(n * 1e6) / 1e6);

/* Ids, which is the one thing a hand-written set gets wrong and Live is merciless about.

   Every `Id` in the document — tracks, clips, key tracks, locators, and each automation and
   modulation target inside a mixer — is drawn from a single pool, and `NextPointeeId` at the top is
   the watermark Live will allocate its own next id from. Two objects claiming the same id, or one
   claiming an id at or above that watermark, is what "The document is corrupt and cannot be loaded.
   (Invalid Pointee Id.)" means: Live builds the map, finds a collision, and refuses the file before
   it has looked at a single note.

   Nothing in this document points at anything else, so the values are arbitrary — unique, non-zero
   and below the watermark is the whole requirement. One counter therefore hands out every id, and
   the watermark is written from where it finished, which is why the file is assembled from the
   tracks inwards and the header written last. `LomId` is not part of this: it is the Live Object
   Model handle, and a fresh set has it 0 everywhere. */
const idGen = (start = 8) => { let n = start; return () => n++; };

/* Live's palette, by index. These are the ones that read as a set on a timeline: the rhythm
   section warm, the harmony green, the melodic parts cool, and anything effects-like grey. */
const ALS_COLORS = { drums: 3, chords: 17, part: 12, fx: 8, other: 0 };

/* A time signature is one number in Live's XML: the denominator's place in 1, 2, 4, 8, 16, 32,
   times 99, plus the numerator less one. 4/4 is 2 × 99 + 3 = 201, which is what a fresh set has. */
const TS_DENOMS = [1, 2, 4, 8, 16, 32];
const tsEnum = (num, den) => {
  const di = TS_DENOMS.indexOf(den);
  return (di < 0 ? 2 : di) * 99 + (Math.max(1, Math.min(99, Math.round(num))) - 1);
};

/* One clip's worth of notes, grouped by pitch — Live stores a KeyTrack per note number rather than
   one flat list, so the grouping is the format's, not a choice. The note ids are the clip's own
   counter, not the document's, and `NoteIdGenerator` below has to sit above the highest of them. */
const keyTracks = (notes, nextId) => {
  const byKey = new Map();
  for (const n of notes || []) {
    if (!byKey.has(n.note)) byKey.set(n.note, []);
    byKey.get(n.note).push(n);
  }
  let noteId = 1;
  return [...byKey.entries()].sort((a, b) => a[0] - b[0]).map(([key, list]) => {
    const evs = list.sort((a, b) => a.t - b.t).map(n =>
      `<MidiNoteEvent Time="${alsNum(n.t)}" Duration="${alsNum(Math.max(0.005, n.dur))}" `
      + `Velocity="${Math.max(1, Math.min(127, Math.round(n.vel || 100)))}" OffVelocity="64" `
      + `Probability="1" IsEnabled="true" NoteId="${noteId++}" />`).join("");
    return `<KeyTrack Id="${nextId()}"><Notes>${evs}</Notes><MidiKey Value="${key}" /></KeyTrack>`;
  }).join("");
};

const midiClip = (name, notes, end, colorIndex, ts, nextId) => `
<MidiClip Id="${nextId()}" Time="0">
${alsEl("LomId", 0)}${alsEl("LomIdView", 0)}
${alsEl("CurrentStart", 0)}${alsEl("CurrentEnd", alsNum(end))}
<Loop>${alsEl("LoopStart", 0)}${alsEl("LoopEnd", alsNum(end))}${alsEl("StartRelative", 0)}
${alsEl("LoopOn", "false")}${alsEl("OutMarker", alsNum(end))}
${alsEl("HiddenLoopStart", 0)}${alsEl("HiddenLoopEnd", alsNum(end))}</Loop>
${alsEl("Name", esc(name))}${alsEl("Annotation", "")}
${alsEl("ColorIndex", colorIndex)}${alsEl("LaunchMode", 0)}${alsEl("LaunchQuantisation", 0)}
<TimeSignature><TimeSignatures><RemoteableTimeSignature Id="${nextId()}">
${alsEl("Numerator", ts.num)}${alsEl("Denominator", ts.den)}${alsEl("Time", 0)}</RemoteableTimeSignature></TimeSignatures></TimeSignature>
<Envelopes><Envelopes /></Envelopes>
<ScrollerTimePreserver>${alsEl("LeftTime", 0)}${alsEl("RightTime", alsNum(end))}</ScrollerTimePreserver>
<TimeSelection>${alsEl("AnchorTime", 0)}${alsEl("OtherTime", 0)}</TimeSelection>
${alsEl("Legato", "false")}${alsEl("Ram", "false")}
<GrooveSettings>${alsEl("GrooveId", -1)}</GrooveSettings>
${alsEl("Disabled", "false")}${alsEl("VelocityAmount", 0)}
<FollowTime>${alsEl("FollowTime", 4)}</FollowTime>
${alsEl("FollowActionA", 0)}${alsEl("FollowActionB", 0)}
<Notes><KeyTracks>${keyTracks(notes, nextId)}</KeyTracks>
<PerNoteEventStore><EventLists /></PerNoteEventStore>
<NoteIdGenerator>${alsEl("NextId", (notes || []).length + 1)}</NoteIdGenerator></Notes>
${alsEl("BankSelectCoarse", -1)}${alsEl("BankSelectFine", -1)}${alsEl("ProgramChange", -1)}
${alsEl("NoteEditorFoldInZoom", -1)}${alsEl("NoteEditorFoldInScroll", 0)}
${alsEl("NoteEditorFoldOutZoom", -1)}${alsEl("NoteEditorFoldOutScroll", 0)}
</MidiClip>`;

// the routing and mixer blocks every track carries. Nothing here is a choice — it is the shape a
// track has to have, with the values a fresh track gets.
const routing = () => `
<AudioInputRouting>${alsEl("Target", "AudioIn/None")}${alsEl("UpperDisplayString", "No Input")}${alsEl("LowerDisplayString", "")}</AudioInputRouting>
<MidiInputRouting>${alsEl("Target", "MidiIn/External.All/-1")}${alsEl("UpperDisplayString", "All Ins")}${alsEl("LowerDisplayString", "")}</MidiInputRouting>
<AudioOutputRouting>${alsEl("Target", "AudioOut/Master")}${alsEl("UpperDisplayString", "Master")}${alsEl("LowerDisplayString", "")}</AudioOutputRouting>
<MidiOutputRouting>${alsEl("Target", "MidiOut/None")}${alsEl("UpperDisplayString", "None")}${alsEl("LowerDisplayString", "")}</MidiOutputRouting>`;

const mixer = (vol, nextId) => `
<Mixer>
${alsEl("LomId", 0)}${alsEl("LomIdView", 0)}${alsEl("IsExpanded", "true")}
<On><LomId Value="0" />${alsEl("Manual", "true")}<AutomationTarget Id="${nextId()}">${alsEl("LockEnvelope", 0)}</AutomationTarget></On>
${alsEl("ModulationSourceCount", 0)}<ParametersListWrapper LomId="0" />
<Pointee Id="${nextId()}" />${alsEl("LastSelectedTimeableIndex", 0)}${alsEl("LastSelectedClipEnvelopeIndex", 0)}
<Speaker><LomId Value="0" />${alsEl("Manual", "true")}<AutomationTarget Id="${nextId()}">${alsEl("LockEnvelope", 0)}</AutomationTarget></Speaker>
<Pan><LomId Value="0" />${alsEl("Manual", 0)}<AutomationTarget Id="${nextId()}">${alsEl("LockEnvelope", 0)}</AutomationTarget>
<ModulationTarget Id="${nextId()}">${alsEl("LockEnvelope", 0)}</ModulationTarget></Pan>
<Volume><LomId Value="0" />${alsEl("Manual", alsNum(vol == null ? 0.85 : vol))}<AutomationTarget Id="${nextId()}">${alsEl("LockEnvelope", 0)}</AutomationTarget>
<ModulationTarget Id="${nextId()}">${alsEl("LockEnvelope", 0)}</ModulationTarget></Volume>
${alsEl("CrossFadeState", 1)}<SendsListWrapper LomId="0" />
</Mixer>`;

const midiTrack = (t, ts, nextId) => `
<MidiTrack Id="${nextId()}">
${alsEl("LomId", 0)}${alsEl("LomIdView", 0)}
${alsEl("IsContentSelectedInDocument", "false")}${alsEl("PreferredContentViewMode", 0)}
<TrackDelay>${alsEl("Value", 0)}${alsEl("IsValueSampleBased", "false")}</TrackDelay>
<Name>${alsEl("EffectiveName", esc(t.name))}${alsEl("UserName", esc(t.name))}
${alsEl("Annotation", esc(t.note || ""))}${alsEl("MemorizedFirstClipName", esc(t.name))}</Name>
${alsEl("Color", t.color)}
<AutomationEnvelopes><Envelopes /></AutomationEnvelopes>
${alsEl("TrackGroupId", -1)}${alsEl("TrackUnfolded", "true")}
<DevicesListWrapper LomId="0" /><ClipSlotsListWrapper LomId="0" />
${alsEl("ViewData", "{}")}
<DeviceChain>
${routing()}
${mixer(t.vol, nextId)}
<MainSequencer>
${alsEl("LomId", 0)}${alsEl("LomIdView", 0)}${alsEl("IsExpanded", "true")}
<On><LomId Value="0" />${alsEl("Manual", "true")}<AutomationTarget Id="${nextId()}">${alsEl("LockEnvelope", 0)}</AutomationTarget></On>
${alsEl("ModulationSourceCount", 0)}<ParametersListWrapper LomId="0" />
<Pointee Id="${nextId()}" />${alsEl("LastSelectedTimeableIndex", 0)}${alsEl("LastSelectedClipEnvelopeIndex", 0)}
<ClipTimeable><ArrangerAutomation><Events>${midiClip(t.name, t.notes, t.end, t.color, ts, nextId)}</Events>
${alsEl("AutomationTransformViewState", "")}</ArrangerAutomation></ClipTimeable>
${alsEl("Sample", "")}
<ClipSlotList />
${alsEl("MonitoringEnum", 1)}
<KeyMidi />
</MainSequencer>
<FreezeSequencer><ClipSlotList /><Sample /></FreezeSequencer>
<DeviceChain><Devices /></DeviceChain>
</DeviceChain>
</MidiTrack>`;

/* The set. `tracks` is [{ name, color, vol, notes:[{t,dur,note,vel}], end }] with every time in
   beats; `locators` is [{ beat, name }] — the section markers, which is what makes the arrangement
   legible on Live's ruler rather than an undifferentiated run of bars.

   Assembled inside out: every piece takes its ids from one counter, and only once they are all
   written is `NextPointeeId` known — so the tracks, the master and the locators are built into
   variables first, and the document around them last. */
function alsXml({ bpm, tsNum = 4, tsDen = 4, tracks = [], locators = [], name = "song" }) {
  const nextId = idGen();
  const ts = { num: tsNum, den: tsDen };
  const total = Math.max(4, ...tracks.map(t => t.end || 0));
  const trackXml = tracks.map(t => midiTrack({ ...t, end: t.end || total }, ts, nextId)).join("");
  const masterXml = `
${alsEl("LomId", 0)}${alsEl("LomIdView", 0)}
<Name>${alsEl("EffectiveName", esc(name))}${alsEl("UserName", "")}${alsEl("Annotation", "")}${alsEl("MemorizedFirstClipName", "")}</Name>
${alsEl("Color", 12)}
<AutomationEnvelopes><Envelopes /></AutomationEnvelopes>
${alsEl("TrackGroupId", -1)}${alsEl("TrackUnfolded", "true")}
${alsEl("ViewData", "{}")}
<DeviceChain>
${routing()}
<Mixer>
${alsEl("LomId", 0)}${alsEl("LomIdView", 0)}${alsEl("IsExpanded", "true")}
<On><LomId Value="0" />${alsEl("Manual", "true")}<AutomationTarget Id="${nextId()}">${alsEl("LockEnvelope", 0)}</AutomationTarget></On>
${alsEl("ModulationSourceCount", 0)}<ParametersListWrapper LomId="0" />
<Pointee Id="${nextId()}" />${alsEl("LastSelectedTimeableIndex", 0)}${alsEl("LastSelectedClipEnvelopeIndex", 0)}
<Tempo><LomId Value="0" />${alsEl("Manual", alsNum(bpm))}
<AutomationTarget Id="${nextId()}">${alsEl("LockEnvelope", 0)}</AutomationTarget>
<ModulationTarget Id="${nextId()}">${alsEl("LockEnvelope", 0)}</ModulationTarget></Tempo>
<TimeSignature><LomId Value="0" />${alsEl("Manual", tsEnum(tsNum, tsDen))}
<AutomationTarget Id="${nextId()}">${alsEl("LockEnvelope", 0)}</AutomationTarget></TimeSignature>
<Pan><LomId Value="0" />${alsEl("Manual", 0)}<AutomationTarget Id="${nextId()}">${alsEl("LockEnvelope", 0)}</AutomationTarget>
<ModulationTarget Id="${nextId()}">${alsEl("LockEnvelope", 0)}</ModulationTarget></Pan>
<Volume><LomId Value="0" />${alsEl("Manual", 0.85)}<AutomationTarget Id="${nextId()}">${alsEl("LockEnvelope", 0)}</AutomationTarget>
<ModulationTarget Id="${nextId()}">${alsEl("LockEnvelope", 0)}</ModulationTarget></Volume>
${alsEl("CrossFade", 0)}
</Mixer>
<DeviceChain><Devices /></DeviceChain>
</DeviceChain>`;
  const preHearXml = `
${alsEl("LomId", 0)}${alsEl("LomIdView", 0)}
<Name>${alsEl("EffectiveName", "Preview")}${alsEl("UserName", "")}${alsEl("Annotation", "")}${alsEl("MemorizedFirstClipName", "")}</Name>
${alsEl("Color", 12)}
<DeviceChain>${routing()}${mixer(0.85, nextId)}<DeviceChain><Devices /></DeviceChain></DeviceChain>`;
  const locXml = (locators || []).map((l, i) =>
    `<Locator Id="${nextId()}">${alsEl("LomId", 0)}${alsEl("Time", alsNum(l.beat))}${alsEl("Name", esc(l.name))}${alsEl("Annotation", "")}${alsEl("IsSongStart", i === 0 ? "true" : "false")}</Locator>`).join("");
  // clear of everything handed out above, and clear of the 1000 Live wants to see it above
  const nextPointeeId = Math.max(21000, nextId() + 1000);
  return `<?xml version="1.0" encoding="UTF-8"?>
<Ableton MajorVersion="5" MinorVersion="11.0_11300" SchemaChangeCount="3" Creator="Progression Wheel" Revision="">
<LiveSet>
${alsEl("NextPointeeId", nextPointeeId)}${alsEl("OverwriteProtectionNumber", 2819)}
${alsEl("LomId", 0)}${alsEl("LomIdView", 0)}
<Tracks>${trackXml}</Tracks>
<MasterTrack>${masterXml}
</MasterTrack>
<PreHearTrack>${preHearXml}
</PreHearTrack>
<SendsPre />
<Locators><Locators>${locXml}</Locators></Locators>
${alsEl("GlobalQuantisation", 4)}${alsEl("AutoQuantisation", 0)}
<Grid>${alsEl("FixedNumerator", 1)}${alsEl("FixedDenominator", 16)}${alsEl("GridIntervalPixel", 20)}
${alsEl("Ntoles", 2)}${alsEl("SnapToGrid", "true")}${alsEl("Fixed", "false")}</Grid>
${alsEl("ScaleInformation", "")}${alsEl("SmpteFormat", 0)}
${alsEl("TimeSelectionAnchorTime", 0)}${alsEl("CurrentTime", 0)}
</LiveSet>
</Ableton>
`;
}

/* Gzip, because that is what a .als is. `CompressionStream` is the same API the shared link uses,
   so there is no library here either — and if a browser is old enough to lack it, the caller is
   told rather than handed a file Live cannot open. */
async function alsBytes(spec) {
  const xml = alsXml(spec);
  const raw = new TextEncoder().encode(xml);
  const CS = globalThis.CompressionStream;
  if (!CS) return null;
  const stream = new Blob([raw]).stream().pipeThrough(new CS("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export { ALS_COLORS, alsXml, alsBytes };
