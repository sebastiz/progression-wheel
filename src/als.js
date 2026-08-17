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

/* Live's palette, by index. These are the ones that read as a set on a timeline: the rhythm
   section warm, the harmony green, the melodic parts cool, and anything effects-like grey. */
const ALS_COLORS = { drums: 3, chords: 17, part: 12, fx: 8, other: 0 };

/* One clip's worth of notes, grouped by pitch — Live stores a KeyTrack per note number rather than
   one flat list, so the grouping is the format's, not a choice. */
const keyTracks = (notes, id0) => {
  const byKey = new Map();
  for (const n of notes || []) {
    if (!byKey.has(n.note)) byKey.set(n.note, []);
    byKey.get(n.note).push(n);
  }
  let id = id0;
  return [...byKey.entries()].sort((a, b) => a[0] - b[0]).map(([key, list]) => {
    const evs = list.sort((a, b) => a.t - b.t).map(n =>
      `<MidiNoteEvent Time="${alsNum(n.t)}" Duration="${alsNum(Math.max(0.005, n.dur))}" `
      + `Velocity="${Math.max(1, Math.min(127, Math.round(n.vel || 100)))}" OffVelocity="64" `
      + `Probability="1" IsEnabled="true" />`).join("");
    return `<KeyTrack Id="${id++}"><Notes>${evs}</Notes><MidiKey Value="${key}" /></KeyTrack>`;
  }).join("");
};

const midiClip = (name, notes, end, id, colorIndex) => `
<MidiClip Id="${id}" Time="0">
${alsEl("LomId", 0)}${alsEl("LomIdView", 0)}
${alsEl("CurrentStart", 0)}${alsEl("CurrentEnd", alsNum(end))}
<Loop>${alsEl("LoopStart", 0)}${alsEl("LoopEnd", alsNum(end))}${alsEl("StartRelative", 0)}
${alsEl("LoopOn", "false")}${alsEl("OutMarker", alsNum(end))}
${alsEl("HiddenLoopStart", 0)}${alsEl("HiddenLoopEnd", alsNum(end))}</Loop>
${alsEl("Name", esc(name))}${alsEl("Annotation", "")}
${alsEl("ColorIndex", colorIndex)}${alsEl("LaunchMode", 0)}${alsEl("LaunchQuantisation", 0)}
<TimeSignature><TimeSignatures><RemoteableTimeSignature Id="0">
${alsEl("Numerator", 4)}${alsEl("Denominator", 4)}${alsEl("Time", 0)}</RemoteableTimeSignature></TimeSignatures></TimeSignature>
<Envelopes><Envelopes /></Envelopes>
<ScrollerTimePreserver>${alsEl("LeftTime", 0)}${alsEl("RightTime", alsNum(end))}</ScrollerTimePreserver>
<TimeSelection>${alsEl("AnchorTime", 0)}${alsEl("OtherTime", 0)}</TimeSelection>
${alsEl("Legato", "false")}${alsEl("Ram", "false")}
<GrooveSettings>${alsEl("GrooveId", -1)}</GrooveSettings>
${alsEl("Disabled", "false")}${alsEl("VelocityAmount", 0)}
<FollowTime>${alsEl("FollowTime", 4)}</FollowTime>
${alsEl("FollowActionA", 0)}${alsEl("FollowActionB", 0)}
<Notes><KeyTracks>${keyTracks(notes, id * 1000 + 1)}</KeyTracks>
<PerNoteEventStore><EventLists /></PerNoteEventStore>
<NoteIdGenerator>${alsEl("NextId", 1024)}</NoteIdGenerator></Notes>
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

const mixer = (vol = 0.85) => `
<Mixer>
${alsEl("LomId", 0)}${alsEl("LomIdView", 0)}${alsEl("IsExpanded", "true")}
<On><LomId Value="0" />${alsEl("Manual", "true")}<AutomationTarget Id="0">${alsEl("LockEnvelope", 0)}</AutomationTarget></On>
${alsEl("ModulationSourceCount", 0)}${alsEl("ParametersListWrapper", "")}
<Pointee Id="0" />${alsEl("LastSelectedTimeableIndex", 0)}${alsEl("LastSelectedClipEnvelopeIndex", 0)}
<Speaker><LomId Value="0" />${alsEl("Manual", "true")}<AutomationTarget Id="0">${alsEl("LockEnvelope", 0)}</AutomationTarget></Speaker>
<Pan><LomId Value="0" />${alsEl("Manual", 0)}<AutomationTarget Id="0">${alsEl("LockEnvelope", 0)}</AutomationTarget>
<ModulationTarget Id="0">${alsEl("LockEnvelope", 0)}</ModulationTarget></Pan>
<Volume><LomId Value="0" />${alsEl("Manual", alsNum(vol))}<AutomationTarget Id="0">${alsEl("LockEnvelope", 0)}</AutomationTarget>
<ModulationTarget Id="0">${alsEl("LockEnvelope", 0)}</ModulationTarget></Volume>
${alsEl("CrossFadeState", 1)}${alsEl("SendsListWrapper", "")}
</Mixer>`;

const midiTrack = (t, id, clipId) => `
<MidiTrack Id="${id}">
${alsEl("LomId", 0)}${alsEl("LomIdView", 0)}
${alsEl("IsContentSelectedInDocument", "false")}${alsEl("PreferredContentViewMode", 0)}
<TrackDelay>${alsEl("Value", 0)}${alsEl("IsValueSampleBased", "false")}</TrackDelay>
<Name>${alsEl("EffectiveName", esc(t.name))}${alsEl("UserName", esc(t.name))}
${alsEl("Annotation", esc(t.note || ""))}${alsEl("MemorizedFirstClipName", esc(t.name))}</Name>
${alsEl("Color", t.color)}
<AutomationEnvelopes><Envelopes /></AutomationEnvelopes>
${alsEl("TrackGroupId", -1)}${alsEl("TrackUnfolded", "true")}
${alsEl("DevicesListWrapper", "")}${alsEl("ClipSlotsListWrapper", "")}
${alsEl("ViewData", "{}")}
<DeviceChain>
${routing()}
${mixer(t.vol)}
<MainSequencer>
${alsEl("LomId", 0)}${alsEl("LomIdView", 0)}${alsEl("IsExpanded", "true")}
<ClipTimeable><ArrangerAutomation><Events>${midiClip(t.name, t.notes, t.end, clipId, t.color)}</Events>
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
   legible on Live's ruler rather than an undifferentiated run of bars. */
function alsXml({ bpm, tsNum = 4, tsDen = 4, tracks = [], locators = [], name = "song" }) {
  const total = Math.max(4, ...tracks.map(t => t.end || 0));
  const trackXml = tracks.map((t, i) => midiTrack({ ...t, end: t.end || total }, 10 + i, 100 + i)).join("");
  const locXml = (locators || []).map((l, i) =>
    `<Locator Id="${i}">${alsEl("LomId", 0)}${alsEl("Time", alsNum(l.beat))}${alsEl("Name", esc(l.name))}${alsEl("Annotation", "")}${alsEl("IsSongStart", i === 0 ? "true" : "false")}</Locator>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Ableton MajorVersion="5" MinorVersion="11.0_11300" SchemaChangeCount="3" Creator="Progression Wheel" Revision="">
<LiveSet>
${alsEl("NextPointeeId", 30000)}${alsEl("OverwriteProtectionNumber", 2819)}
${alsEl("LomId", 0)}${alsEl("LomIdView", 0)}
<Tracks>${trackXml}</Tracks>
<MasterTrack>
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
<Tempo><LomId Value="0" />${alsEl("Manual", alsNum(bpm))}
<AutomationTarget Id="8000">${alsEl("LockEnvelope", 0)}</AutomationTarget>
<ModulationTarget Id="8001">${alsEl("LockEnvelope", 0)}</ModulationTarget></Tempo>
<TimeSignature><LomId Value="0" />${alsEl("Manual", tsNum * 99 + (tsDen === 8 ? 1 : 0))}
<AutomationTarget Id="8002">${alsEl("LockEnvelope", 0)}</AutomationTarget></TimeSignature>
<Pan><LomId Value="0" />${alsEl("Manual", 0)}<AutomationTarget Id="8003">${alsEl("LockEnvelope", 0)}</AutomationTarget>
<ModulationTarget Id="8004">${alsEl("LockEnvelope", 0)}</ModulationTarget></Pan>
<Volume><LomId Value="0" />${alsEl("Manual", 0.85)}<AutomationTarget Id="8005">${alsEl("LockEnvelope", 0)}</AutomationTarget>
<ModulationTarget Id="8006">${alsEl("LockEnvelope", 0)}</ModulationTarget></Volume>
${alsEl("CrossFade", 0)}
</Mixer>
<DeviceChain><Devices /></DeviceChain>
</DeviceChain>
</MasterTrack>
<PreHearTrack>
${alsEl("LomId", 0)}${alsEl("LomIdView", 0)}
<Name>${alsEl("EffectiveName", "Preview")}${alsEl("UserName", "")}${alsEl("Annotation", "")}${alsEl("MemorizedFirstClipName", "")}</Name>
${alsEl("Color", 12)}
<DeviceChain>${routing()}${mixer()}<DeviceChain><Devices /></DeviceChain></DeviceChain>
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
