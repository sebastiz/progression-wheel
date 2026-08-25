/* als-fx — the app's controls, written into Live's devices.

   The sound itself cannot cross: every instrument and filter here is a Web Audio graph, and Live
   has no way to be handed one. What *can* cross is the settings, because the app already publishes
   them in Live's own units — the export snapshot states cutoffs in Hz, decay in seconds, delay time
   in beats, and the law behind every 0..100 knob. So this file is a conversion table, not a
   simulation: it puts the same numbers on the nearest Live device.

   Be clear about what that buys. A number transfers exactly — Reverb's decay really is 1.6 s, the
   compressor really is 12:1 at −5 dB, Auto Filter really is at 1470 Hz. The *sound* does not: Live's
   reverb is an algorithm, ours is a synthesised convolution room, and 1.6 s in one decays unlike
   1.6 s in the other. An export arrives in the right ballpark with the right values on the right
   dials, which is a place to start work — not a copy of the sketch. The stems remain the reference.

   Where a mapping is a judgement rather than a conversion it says so in a comment, and those are
   the ones to revisit if a part arrives sounding wrong. */

import { ALS_DEVICES } from "./als-template.js";

const num = n => (Math.round(n * 1e6) / 1e6);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* One parameter, by name. Live wraps each in an element of its own whose first `Manual` is the
   value; what sits between varies — Echo's Feedback carries a whole KeyMidi block first — so this
   walks the element rather than assuming the shape. */
const TAG = /<(\/?)([A-Za-z][\w.]*)((?:[^>"]|"[^"]*")*?)(\/?)>/g;
function setParam(xml, name, value) {
  const open = xml.indexOf(`<${name}>`);
  if (open < 0) return xml;                       // a device without that control keeps its own
  let depth = 0, end = open;
  const re = new RegExp(TAG.source, "g");
  re.lastIndex = open;
  for (let m = re.exec(xml); m; m = re.exec(xml)) {
    const [, close, , , self] = m;
    if (close) depth--; else if (!self) depth++;
    if (depth === 0) { end = m.index + m[0].length; break; }
  }
  const block = xml.slice(open, end);
  const done = block.replace(/<Manual Value="[^"]*" \/>/, `<Manual Value="${value}" />`);
  return xml.slice(0, open) + done + xml.slice(end);
}
const setParams = (xml, pairs) => Object.entries(pairs)
  .reduce((acc, [k, v]) => setParam(acc, k, v), xml);

/* ---- the conversions ----
   Each is the app's own law, the one the settings snapshot states, solved for Live's unit. */

// the low-pass: 100% is open at 18 kHz, and the bottom of the travel is still a note, not a rumble
const FILTER_OPEN = 18000, FILTER_FLOOR = 120;
const cutHz = pct => num(FILTER_FLOOR * Math.pow(FILTER_OPEN / FILTER_FLOOR, clamp(pct, 0, 100) / 100));
// the high-pass runs 20 Hz to 1.2 kHz over the same travel
const hpHz = pct => num(20 * Math.pow(1200 / 20, clamp(pct, 0, 100) / 100));
/* Resonance is a judgement. The app rings its biquad from Q 0.7 to Q 14.7; Live's Auto Filter takes
   0..1.25 on a curve of its own, and the two do not describe the same circuit. Straight proportion
   puts the whistle in roughly the same place on the dial without pretending it is the same filter. */
const resonance = pct => num(clamp(pct, 0, 100) / 100);
// the filter envelope: amount is a fraction, and the decay is a real time in seconds
const envAmount = pct => num(clamp(pct, 0, 100) / 100);
const envRelease = pct => num(0.02 * Math.pow(1.5 / 0.02, clamp(pct, 0, 100) / 100));
/* Drive is a judgement too: Saturator's WsDrive is normalised where the app's is a waveshaper
   curve, so this keeps the useful half of the travel rather than mapping 100% to full destruction. */
const driveAmount = pct => num(clamp(pct, 0, 100) / 100 * 0.6);
// a rate in beats becomes a rate in hertz, which is the one place tempo has to be known
const rateHz = (beats, bpm) => num((bpm / 60) / Math.max(0.01, beats));
// Live counts a synced delay in sixteenths, so a dotted eighth (0.75 of a beat) is 3 of them
const sixteenths = beats => Math.max(1, Math.round(beats * 4));
// a threshold in dB is a gain factor in the file: 0 dB is 1, and −6 dB is a half
const dbToGain = db => num(Math.pow(10, db / 20));

/* ---- the devices ---- */

/* The part's filter. Live's Auto Filter is one filter, so a part using both ends of the app's pair
   gets two devices — a low-pass and a high-pass in series, which is what the app is doing anyway. */
const autoFilter = ({ cut = 100, res = 0, fenv = 0, fdec = 30, hp = 0 } = {}) => {
  const out = [];
  if (cut < 100 || res > 0 || fenv > 0) out.push(setParams(ALS_DEVICES.autoFilter, {
    Filter_Type: 0,                                   // 0 is the low-pass
    Filter_Frequency: cutHz(cut),
    Filter_Resonance: resonance(res),
    Envelope_Amount: envAmount(fenv),
    Envelope_Release: envRelease(fdec),
  }));
  if (hp > 0) out.push(setParams(ALS_DEVICES.autoFilter, {
    Filter_Type: 1,                                   // 1 is the high-pass
    Filter_Frequency: hpHz(hp),
    Filter_Resonance: 0,
    Envelope_Amount: 0,
  }));
  return out;
};
const saturator = pct => (pct > 0 ? [setParams(ALS_DEVICES.saturator, { WsDrive: driveAmount(pct), DryWet: 1 })] : []);
// tremolo and auto-pan are the same device at different depths — one moves level, one moves place
const autoPan = ({ trem = 0, apan = 0, rate = 4, bpm = 120 } = {}) => {
  const depth = Math.max(trem, apan);
  if (!depth) return [];
  return [setParams(ALS_DEVICES.autoPan, {
    Type: apan >= trem ? 0 : 1,                       // 0 pans, 1 chops the level
    RateType: 0,                                      // free-running, in hertz, rather than Live's
    Frequency: rateHz(rate, bpm),                     // own table of synced divisions
    Phase: apan >= trem ? 180 : 0,                    // 180° is the two channels opposed
  })];
};
// the delay send, tempo-synced the way the app's is, with its repeats filtered the same way
const echo = ({ beats = 0.75, feedback = 0.34, toneHz = 2600, mix = 0 } = {}) =>
  (mix > 0 ? [setParams(ALS_DEVICES.echo, {
    Delay_SyncL: "true", Delay_SyncR: "true",
    Delay_SyncedSixteenthL: sixteenths(beats), Delay_SyncedSixteenthR: sixteenths(beats),
    Feedback: num(clamp(feedback, 0, 0.95)),
    Filter_On: "true", HiFilter_Freq: num(toneHz),
    DryWet: num(clamp(mix, 0, 1)),
  })] : []);
// the room. Decay is in milliseconds in the file, and seconds everywhere the app talks about it
const reverb = ({ decaySeconds = 1.6, mix = 0 } = {}) =>
  (mix > 0 ? [setParams(ALS_DEVICES.reverb, {
    DecayTime: num(clamp(decaySeconds, 0.1, 60) * 1000),
    DryWet: num(clamp(mix, 0, 1)),
  })] : []);
/* The pump, as a compressor. The app ducks by a fraction of the level on every kick and recovers
   over a time it states in eighths; a compressor reaches the same place from the other side, so the
   duck depth becomes a threshold deep enough to bite and the recovery becomes the release. Live
   cannot be told to key it off the kick from here — that is one cable the user has to plug in. */
const pump = ({ amount = 0, recoveryMs = 390 } = {}) =>
  (amount > 0 ? [setParams(ALS_DEVICES.compressor, {
    Threshold: dbToGain(-6 * clamp(amount, 0, 1) / 0.6),
    Ratio: 4, Attack: 1, Release: num(clamp(recoveryMs, 1, 3000)), Knee: 6,
  })] : []);
// the master limiter, which the app states in the units Live uses for all four
const limiter = ({ thresholdDb = -5, ratio = 12, attackMs = 2, releaseMs = 140, kneeDb = 3 } = {}) =>
  [setParams(ALS_DEVICES.compressor, {
    Threshold: dbToGain(thresholdDb), Ratio: ratio,
    Attack: num(attackMs), Release: num(releaseMs), Knee: num(kneeDb),
  })];

/* One part's chain, in the order the app runs it: filter, then dirt, then movement, then the sends.
   An empty list is the point — a part at its defaults gets no devices at all rather than a rack of
   bypassed ones, so what arrives in Live is what the sketch actually does. */
function partDevices(fx = {}, bpm = 120) {
  return [
    ...autoFilter(fx),
    ...saturator(fx.drive || 0),
    ...autoPan({ trem: fx.trem || 0, apan: fx.apan || 0, rate: fx.apanRate || fx.tremRate || 4, bpm }),
    ...echo({ mix: (fx.send || 0) / 100, beats: fx.delayBeats, feedback: fx.delayFeedback, toneHz: fx.delayTone }),
    ...reverb({ mix: (fx.verb || 0) / 100, decaySeconds: fx.verbDecay }),
  ].join("");
}

export { setParam, setParams, cutHz, hpHz, resonance, envAmount, envRelease, driveAmount, rateHz,
         sixteenths, dbToGain, autoFilter, saturator, autoPan, echo, reverb, pump, limiter, partDevices };
