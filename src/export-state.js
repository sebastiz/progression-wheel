import { MODES, SEMI_NAME, modeId } from "./theory.js";
import { DRUMS, BASS, PERCS, PATTERNS, PUMPS, PUMP_AMT, METER_BY_ID, METERS } from "./patterns.js";
import { ARP_BY_ID, ARP_RATES, GATE_BY_ID, LAYER_NAMES, MODS, MOD_GROUPS, modOf } from "./melody.js";
import { BASS_VOICES, DELAY_BEATS, DELAY_TIMES, FILTER_OPEN, FX_PARAMS, FX_TYPES, GM_LABEL,
  LEAD_VOICES, MOVES, PAD_VOICES, TRANS, customVoiceName, gmKey, isCustomVoice, isGM } from "./audio.js";

/* export-state — the settings half of "Export for Claude": one JSON snapshot of every choice that
   shaped the rendered audio, written to be read without the source code beside it.

   The audio export answers "what does it sound like"; this file answers "why". So the shape is
   dictated by the reader, not the writer: real words rather than the short keys the song document
   uses, option *labels* rather than ids, units in the field names, and a reference section that
   states what every control's default is — so a value that isn't listed is still known.

   Everything here is generated from the same tables playback reads (MOD_GROUPS, PATTERNS, DRUMS,
   MOVES, TRANS …), which is what stops the export drifting as features are added: a new modulation
   added to MOD_GROUPS appears in the reference and in every part that carries it with no edit
   here. `npm test` holds the other end — the component's getExportState() must feed this module,
   and the output must survive JSON round-tripping with no undefined, NaN or cycles. */

/* ===== sanitising =====
   The state handed in comes from React, and JSON.stringify throws on cycles and silently writes
   the word null for NaN. Walk the value first: plain objects and arrays are copied, numbers are
   checked, undefined becomes an omission (or null in an array, where position matters), and
   anything exotic — a function, a DOM node, a fiber — becomes null rather than leaking. */
const isPlain = v => {
  if (v === null || typeof v !== "object") return false;
  const p = Object.getPrototypeOf(v);
  return p === Object.prototype || p === null;
};
function sanitizeJson(v, seen = new Set()) {
  if (v === undefined || v === null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" || typeof v === "boolean") return v;
  if (Array.isArray(v)) {
    if (seen.has(v)) return null;
    seen.add(v);
    const out = v.map(x => sanitizeJson(x, seen));
    seen.delete(v);
    return out;
  }
  if (isPlain(v)) {
    if (seen.has(v)) return null;
    seen.add(v);
    const out = {};
    for (const [k, x] of Object.entries(v)) if (x !== undefined) out[k] = sanitizeJson(x, seen);
    seen.delete(v);
    return out;
  }
  return null;                                       // functions, Maps, class instances, DOM nodes
}

/* ===== naming =====
   Field names are built from the tables' own display names — "Low-pass" → low_pass — with the
   unit folded in (low_pass_percent), so nothing needs a legend to read. */
const snake = s => String(s || "").toLowerCase()
  .replace(/&/g, "and").replace(/→/g, "to").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const UNIT_SUFFIX = { "%": "_percent", "st": "_semitones", "¢": "_cents", "ms": "_ms",
  " steps": "_steps", "dB": "_db", ":1": "_ratio", "bit": "_bit", "": "" };
const modField = m => snake(m.name) + (UNIT_SUFFIX[m.unit] != null ? UNIT_SUFFIX[m.unit] : "");
// a select's stored value is an id; the reader wants the label ("1/16", "Up & down")
const optLabel = (m, v) => {
  const opts = m.opts === "ARPS" ? ARP_BY_ID[v] ? [[v, ARP_BY_ID[v].name]] : []
    : m.opts === "ARP_RATES" ? ARP_RATES
    : m.opts === "GATES" ? GATE_BY_ID[v] ? [[v, GATE_BY_ID[v].name]] : []
    : Array.isArray(m.opts) ? m.opts : [];
  const hit = opts.find(([id]) => id === v);
  if (hit) return hit[1];
  if (v === m.dflt && m.off) return m.off;
  return v;
};
const modValue = (m, v) => m.kind === "sel" ? optLabel(m, v) : v;

/* Every modulation, its default and what it does — stated once, so a part need only list what it
   moved and the file still says what everything else is. Generated from MOD_GROUPS: a new control
   lands here without another edit. */
function modulationReference() {
  return MOD_GROUPS.map(g => ({
    group: g.name, about: g.tip,
    controls: g.mods.map(m => ({
      setting: modField(m),
      default: m.dflt === null ? "follows the global setting" : modValue(m, m.dflt),
      meaning: m.tip,
    })),
  }));
}

/* ===== instruments ===== */
const leadLabel = id => { const hit = LEAD_VOICES.find(([k]) => k === id); return hit ? hit[1] : null; };
function describeInstrument(id) {
  if (!id) return null;
  const k = gmKey(id);
  if (isGM(k)) return { id: k, name: GM_LABEL[k] || k,
    source: "sampled — a real General MIDI recording, pitch-shifted from a few anchor notes" };
  if (isCustomVoice(k)) return { id: k, name: customVoiceName(k),
    source: "synthesized — a custom voice built in the voice editor, not one of the app's own" };
  return { id: k, name: leadLabel(k) || k,
    source: "synthesized — a Web Audio oscillator voice (the id names its waveform/character)" };
}

/* The part-filter mapping the scheduler uses: the knob is 0..100, heard exponentially. Stated in
   Hz here so the file can be read against a spectrogram of the wav. */
const lowPassHz = pct => Math.round(120 * Math.pow(FILTER_OPEN / 120, Math.min(100, Math.max(0, pct)) / 100));
const highPassHz = pct => Math.round(20 * Math.pow(1200 / 20, Math.min(100, Math.max(0, pct)) / 100));

/* ===== one melody part =====
   The spec-critical settings — envelope, filter, arpeggiator, gate, pan, sends — are always
   written out in full, defaults included, because they are what an analysis reaches for first.
   Every *other* modulation appears under other_settings only when it differs from its default;
   the reference section carries the defaults, so nothing is lost by the omission. */
const CURATED = new Set(["arp", "arpRate", "arpOct", "gate", "gateLen",
  "cut", "res", "hp", "fenv", "fdec",
  "atk", "dec", "sus", "rel", "vfilt",
  "pan", "apan", "apanRate",
  "send", "verb", "duck", "detune", "semis"]);
function describeLayer(ly, li, defaultInstr) {
  const v = k => modOf(ly, k);
  const noteCells = (ly.flat || []).filter(c => c && c.length).length;
  const arpOn = !!v("arp"), gateOn = !!v("gate");
  const out = {
    part: LAYER_NAMES[li] || String(li + 1),
    instrument: describeInstrument((ly && ly.instr) || defaultInstr),
    octave_offset: ly.oct || 0,
    volume_0_to_1: ly.vol == null ? 1 : ly.vol,
    muted: !!ly.mute, solo: !!ly.solo,
    note_cells_written: noteCells,
    pitch: {
      transpose_semitones: v("semis"),
      detune_cents: v("detune"),
    },
    arpeggiator: !arpOn ? null : {
      enabled: true,
      note: "the part ignores its written grid and walks the chord under each bar",
      pattern: optLabel({ opts: "ARPS", kind: "sel" }, v("arp")),
      rate: optLabel({ opts: "ARP_RATES", kind: "sel" }, v("arpRate")),
      rate_notes_per_beat: v("arpRate"),
      octave_range: v("arpOct"),
    },
    gate: !gateOn ? null : {
      enabled: true,
      pattern: (GATE_BY_ID[v("gate")] || {}).name || v("gate"),
      steps: (GATE_BY_ID[v("gate")] || {}).pat || null,
      length_steps_before_repeat: v("gateLen"),
    },
    filter: {
      type: "low-pass and high-pass in series, per part",
      low_pass_percent: v("cut"),
      low_pass_cutoff_hz: lowPassHz(v("cut")),
      resonance_percent: v("res"),
      high_pass_percent: v("hp"),
      high_pass_cutoff_hz: highPassHz(v("hp")),
      envelope_amount_percent: v("fenv"),
      envelope_decay_percent: v("fdec"),
    },
    envelope: {
      note: "modifiers on the chosen instrument's own envelope, not absolute times — 0 everywhere means the instrument exactly as recorded/designed",
      attack_percent: v("atk"),
      decay_bias: v("dec"),
      sustain_bias: v("sus"),
      release_bias: v("rel"),
      velocity_to_tone_percent: v("vfilt"),
    },
    pan: {
      position: v("pan"),
      auto_pan_percent: v("apan"),
      auto_pan_rate_beats_per_cycle: v("apanRate"),
    },
    effect_sends: {
      delay_send_percent: v("send"),
      reverb_send_percent: v("verb"),
      sidechain_pump_percent: v("duck") === null ? "follows the global pump" : v("duck"),
    },
    other_settings: {},
  };
  for (const m of MODS) {
    if (CURATED.has(m.k)) continue;
    const val = v(m.k);
    if (val !== m.dflt) out.other_settings[modField(m)] = modValue(m, val);
  }
  return out;
}

/* ===== track sources =====
   A section's drums/bass/perc/pad resolve through a fallback chain; the component hands the
   *resolved* source in ({beat}|{pat}|null, mirroring bassSrcOf and friends) and this turns it into
   words plus the grid itself where one was written. Grids come out as their step strings — the
   conventions block says what the letters mean. */
const joinSteps = steps => {
  if (!Array.isArray(steps)) return String(steps);
  // an empty step is a rest and has to keep its place; "-" is what the catalogue patterns write
  const s2 = steps.map(s => (s === "" || s == null) ? "-" : String(s));
  // dots only where a step can hold several letters at once, or "KH" and "K","H" would read alike
  return s2.some(s => s.length > 1) ? s2.join(".") : s2.join("");
};
function describeSource(src, table, offWord) {
  if (!src) return { playing: false, source: offWord };
  if (src.beat) return { playing: true,
    source: src.loop ? "the groove's written grid, cycling round this section" : "this section's own written grid",
    grid_bars: src.beat.map(joinSteps) };
  const p = table && table[src.pat];
  return { playing: true, source: "a catalogue pattern",
    pattern: p ? p.name : src.pat,
    pattern_steps: p && p.pattern ? joinSteps(p.pattern) : null };
}

/* ===== insert-effects rack =====
   Shared by the song-wide rack (`insert_fx`) and a section's own copy of one bus
   (`insert_fx_override`), so the two can never describe a slot differently. Only slots actually
   set to something are named — a slot left at "off" needs no explanation, it did nothing. */
function shapeFxBus(slots) {
  const active = (slots || []).filter(s => s && s.type && s.type !== "off");
  if (!active.length) return null;
  return active.map(s => {
    const t = FX_TYPES.find(([id]) => id === s.type);
    const out = { type: t ? t[1] : s.type };
    for (const [k, name, , , , dflt, unit] of FX_PARAMS[s.type] || [])
      out[snake(name) + (UNIT_SUFFIX[unit] != null ? UNIT_SUFFIX[unit] : "")] = s[k] != null ? s[k] : dflt;
    return out;
  });
}

/* ===== automation lanes =====
   A lane is sparse [{bar, v}] with v in 0..1; what a value *means* differs per lane, so each lane
   carries its own mapping in words. */
const LANE_MEANING = id => {
  if (id === "filter") return `master low-pass across the whole mix: cutoff_hz = 120 × (${FILTER_OPEN}/120)^value (exponential — 1 is fully open)`;
  if (id === "hp") return "master high-pass across the whole mix: cutoff_hz = 20 × (8000/20)^value (0 is off)";
  if (id === "res") return "resonance of both master lane filters: Q = 0.6 + 9 × value";
  if (id === "level") return "master gain ride: value is the gain multiplier (1 = unity)";
  const part = /^cut(\d+)$/.exec(id);
  if (part) return `part ${LAYER_NAMES[+part[1]] || part[1]}'s own low-pass across the song — where drawn it overrides that part's low_pass knob, same cutoff mapping as the master filter lane`;
  const track = /^cut(bass|perc|pad)$/.exec(id);
  if (track) return `the ${track[1]} track's own low-pass across the song — where drawn it overrides that track's low_pass knob`;
  return "automation lane, 0..1";
};
function describeAutomation(auto) {
  const lanes = [];
  for (const [id, pts] of Object.entries(auto || {})) {
    if (!Array.isArray(pts) || !pts.length) continue;
    lanes.push({ lane: id, meaning: LANE_MEANING(id),
      points: pts.map(p => ({ bar: p.bar, value: p.v })) });
  }
  return lanes;
}

/* ===== the whole snapshot =====
   `x` is the bag the component's getExportState() assembles — live state plus the per-section
   sources it resolved with the same chain playback uses. Everything below is shaping and naming;
   the one rule is that nothing is invented here that playback doesn't read. */
function buildExportState(x) {
  const mode = MODES[modeId(x.mode)] || MODES.ionian;
  const meter = METER_BY_ID[x.meterId] || METERS[0];
  const secsPerBar = x.barBeats * 60 / x.bpm;
  const keyName = SEMI_NAME[((x.tonic % 12) + 12) % 12];
  const pat = PATTERNS[x.patId] || null;
  const delayId = DELAY_BEATS[x.delayId] ? x.delayId : "off";
  const delayBeats = DELAY_BEATS[delayId] || 0;
  const pumpLabel = (PUMPS.find(([id]) => id === x.pump) || [])[1] || x.pump;
  const bassVoiceName = (BASS_VOICES.find(([id]) => id === x.bassVoice) || [])[1] || x.bassVoice;
  const padVoiceName = (PAD_VOICES.find(([id]) => id === x.padId) || [])[1] || (x.padId || null);

  const describeSection = s => ({
    section_key: s.key,
    section_name: s.name,
    section_type: s.word,
    length_bars: s.bars,
    starts_at_bar: s.startBar,
    starts_at_seconds: Math.round(s.startBar * secsPerBar * 1000) / 1000,
    chord_per_bar: s.chords.map(c => c.name + (c.numeral ? ` (${c.numeral})` : "")),
    drums: { ...describeSource(s.drums, DRUMS, "silent in this section"), kit: x.kit },
    chord_track: s.chordsQuiet
      ? { playing: false, source: "muted in this section" }
      : describeSource(s.chordsSrc, PATTERNS, "muted in this section"),
    bass: !s.bass ? { playing: false, source: "no bass in this section" }
      : { ...describeSource(s.bass, BASS, ""), voice: bassVoiceName },
    percussion: describeSource(s.perc, { ...DRUMS, ...PERCS }, "no percussion layer in this section"),
    pad: !s.padVoiceId && !s.padBeat ? { playing: false, source: "no pad in this section" }
      : { playing: true,
          voice: (PAD_VOICES.find(([id]) => id === s.padVoiceId) || [])[1] || s.padVoiceId || padVoiceName || "Strings",
          rhythm: s.padBeat ? describeSource(s.padBeat, null, "") : { source: "held under each chord" } },
    section_move: s.move && MOVES[s.move] ? {
      name: MOVES[s.move].name,
      meaning: "an automation preset run across this whole section (filter sweeps, risers, impacts)",
    } : null,
    transition_into_this_section: s.trans && TRANS[s.trans] ? {
      name: TRANS[s.trans].name,
      meaning: "a boundary effect anchored to this section's first downbeat, mostly sounding in the bars before it",
    } : null,
    melody_parts_inherited_from_groove: !!s.inherited,
    melody_parts: (s.layers || []).map((ly, li) => describeLayer(ly, li, x.melInstr)),
    insert_fx_override: (() => {
      const out = {};
      for (const [bus, slots] of Object.entries(s.fxOverride || {})) {
        const shaped = shapeFxBus(slots);
        if (shaped) out[bus] = shaped;
      }
      return Object.keys(out).length ? out : null;
    })(),
  });

  const trackFxOut = {};
  for (const trId of ["drums", "perc", "bass", "pad"]) {
    const fx = (x.trackFx || {})[trId];
    if (!fx) continue;
    const changed = {};
    if (fx.lvl != null && fx.lvl !== 100) changed.level_percent = fx.lvl;
    for (const m of MODS) if (fx[m.k] != null && fx[m.k] !== m.dflt)
      changed[modField(m)] = modValue(m, fx[m.k]);
    if (Object.keys(changed).length) trackFxOut[trId] = changed;
  }

  // The insert-effects rack: a second, independent processing stage per bus (see FX_TYPES in
  // audio.js), off by default. Only slots actually set to something are listed, named and unit-ed
  // the same way MODS are above — a slot left at "off" needs no explanation, it did nothing.
  const fxRackOut = {};
  for (const bus of ["master", "drums", "perc", "bass", "pad", "lead"]) {
    const shaped = shapeFxBus((x.fxRack || {})[bus]);
    if (shaped) fxRackOut[bus] = shaped;
  }

  return sanitizeJson({
    format: "progression-wheel-settings",
    format_version: 1,
    exported_at: x.exportedAt || null,
    song_name: x.songName,
    made_with: "Progression Wheel — a circle-of-fifths songwriting sketchpad (Web Audio synthesis, no samples required)",
    purpose: "A complete snapshot of every setting that shaped the accompanying arrangement wav, for analysis. Values not listed under a part are at their defaults — see modulation_reference.",
    conventions: {
      drum_grid_letters: "K kick · B 808 sub-boom · S snare · H closed hat · O open hat · C clap · P rim · R ride · X crash; - is a rest, and where a step can carry several pieces at once the steps are joined with dots (KH.-.SH.-)",
      bass_and_perc_grid_letters: "bass grids: R root · F fifth · O octave · - rest, one step per sixteenth; perc grids use the drum letters",
      strum_pattern_letters: "D down-strum · U up-strum · > accented down · - rest, one per step",
      percent_knobs: "0..100 sliders; each control's default and meaning is stated once in modulation_reference",
      pitch_degrees: "melody notes are stored as scale degrees, so parts transpose with the key",
      determinism: "all 'random' settings (humanise, stray notes, play chance, random arp) are seeded hashes — two renders of this song are identical",
    },
    global: {
      key: `${keyName} ${mode.short}`,
      tonic: keyName,
      mode: mode.label,
      mode_family: mode.family,
      scale_semitones_from_tonic: mode.semis,
      scale_notes: mode.semis.map(s => SEMI_NAME[(x.tonic + s) % 12]),
      tempo_bpm: x.bpm,
      tempo_note: "one tempo for the whole song — sections cannot override it in this app",
      time_signature: `${meter.num}/${meter.den}`,
      quarter_note_beats_per_bar: x.barBeats,
      swing_amount_0_to_1: x.swingAmt,
      swing_note: "delays the offbeat of each strum-pattern pair; 0 is straight, ~0.6 is nearly triplet",
      humanise_amount_0_to_1: x.humanise,
      melody_grid_columns_per_beat: x.meloSub,
      chord_progression: {
        name: x.progName,
        numerals: x.chords.map(c => c.numeral).filter(Boolean),
        chords: x.chords.map(c => ({ name: c.name, roman_numeral: c.numeral || null })),
      },
      contrast_progression: x.contrast || null,
      structure: x.structureName ? {
        name: x.structureName,
        customised: !!x.isCustomPlan,
        plan: (x.planRows || []).map(r => ({ section: r.sec, repeats: r.reps || 1, note: r.note || null })),
      } : { name: null, customised: !!x.isCustomPlan,
        plan: (x.planRows || []).map(r => ({ section: r.sec, repeats: r.reps || 1, note: r.note || null })) },
    },
    arrangement: {
      total_bars: x.totalBars,
      duration_seconds: Math.round(x.totalBars * secsPerBar * 1000) / 1000,
      note: "sections in playing order; the wav renders exactly this list plus a 3.5 s effect tail",
      sections: (x.sections || []).map(describeSection),
      groove: x.groove ? {
        note: "the Sketch tab's master groove — sections with no written material of their own inherit from it",
        ...describeSection(x.groove),
      } : null,
    },
    instruments: {
      chord_instrument: describeInstrument(x.instr),
      default_melody_instrument: describeInstrument(x.melInstr),
      bass_voice: x.bassVoice ? { id: x.bassVoice, name: bassVoiceName } : null,
      pad_voice: x.padId ? { id: x.padId, name: padVoiceName } : null,
      drum_kit: x.kit,
      percussion_voicing: x.percKit,
      real_samples_enabled: !!x.realSounds,
      real_samples_note: "when enabled, sampled instruments are used where loaded; the synth voices stand in otherwise",
    },
    rhythm: {
      strum_pattern: pat ? { name: pat.name, steps: pat.pattern.join(""),
        subdivision_per_beat: pat.sub, description: pat.desc } : null,
      global_drum_pattern: DRUMS[x.drum] && DRUMS[x.drum].pattern
        ? { name: DRUMS[x.drum].name, steps: DRUMS[x.drum].pattern.join(".") } : { name: "No drums" },
      drum_kit: x.kit,
      note: "each section's resolved drum/bass/perc/pad source is listed with that section",
    },
    track_effects: {
      note: "per-track versions of the part controls (level, filter, drive, LFOs, sends); only tracks with non-default settings are listed",
      ...trackFxOut,
    },
    insert_fx: {
      note: "a second, independent two-slot processing rack per bus (chorus/flanger/phaser/bitcrusher/compressor/stereo widener, plus a second distortion stage) — 'lead' is one shared rack all six melody parts feed into; only buses with a slot set to something other than Off are listed. This is the song-wide default every section inherits; a section with its own copy of a bus lists it under that section's own insert_fx_override instead, with the same slot type (a slot's type is fixed for the whole song) but its own amount",
      master_note: "the master rack sits just before the limiter on the full mix render; like the limiter, it is bypassed for stem exports so the stems still sum to the mix without it applied twice — it also has no per-section override, since it colours the whole song by design",
      ...fxRackOut,
    },
    master_effects: {
      sidechain_pump: { setting: pumpLabel, duck_amount_0_to_1: PUMP_AMT[x.pump] || 0,
        meaning: "each kick ducks the pitched sources by this fraction, recovering over ~1.6 eighths; parts can override their own depth" },
      delay: delayBeats ? {
        time: (DELAY_TIMES.find(([id]) => id === delayId) || [])[1],
        time_beats: delayBeats,
        time_seconds: Math.round(Math.min(1.8, delayBeats * 60 / x.bpm) * 1000) / 1000,
        feedback: 0.34, tone: "low-pass 2600 Hz on the repeats",
        meaning: "a tempo-synced send delay; each part/track feeds it by its delay_send_percent",
      } : { time: "No delay" },
      reverb_bus: { type: "synthesized convolution room on all pitched sources", decay_seconds: 1.6, mix: 0.16,
        note: "drums and click stay dry; parts add more room via reverb_send_percent into a separate 2.2 s wet-only send" },
      master_limiter: { threshold_db: -5, knee_db: 3, ratio: 12, attack_seconds: 0.002, release_seconds: 0.14,
        note: "on the full mix render (this wav); bypassed for stem exports" },
      master_gain: 0.65,
      automation_lanes: describeAutomation(x.auto),
    },
    playback: {
      metronome_click: !!x.clickOn,
      legato_melody: !!x.legato,
      render_sample_rate_hz: 44100,
      render_bit_depth: 16,
    },
    modulation_reference: modulationReference(),
  });
}

export { buildExportState, describeLayer, describeInstrument, describeSource, describeAutomation, modulationReference, modField, sanitizeJson, lowPassHz, highPassHz };
