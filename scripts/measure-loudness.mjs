// Measures how loud every synth voice actually sounds, and prints the vol / boost values that
// make them equal. This is where the loudness-normalized numbers in audio.js come from: each
// voice is rendered through the real Web Audio graph (headless Chromium, OfflineAudioContext)
// and scored with a K-weighted (ITU-R BS.1770-flavoured) max-momentary loudness — RMS alone
// would call a bright saw and a soft sine "equal" when the ear plainly doesn't.
//
// Run it after adding or reshaping a voice:   node scripts/measure-loudness.mjs
// Leads are matched to the default synth lead at C4/C5; bass voices are matched at C2 to the
// hotter bass-track target (one low note has to carry the way a whole chord does). Copy the
// suggested vol into LEAD_SPECS and the suggested boost into BASS_LVL when a voice drifts.
//
// Needs Playwright's Chromium (npm i -g playwright && npx playwright install chromium, or any
// existing install on the module path).
import { build } from "esbuild";

let chromium;
try { ({ chromium } = await import("playwright")); }
catch {
  const [{ createRequire }, { execSync }] = await Promise.all([import("module"), import("child_process")]);
  ({ chromium } = createRequire(execSync("npm root -g").toString().trim() + "/")("playwright"));
}

// the audio module, bundled for the page — leadNote and the voice tables are all it needs
const bundle = await build({
  stdin: {
    contents: `import { leadNote, LEAD_SPECS, LEAD_VOICES, BASS_VOICES, playBass } from "./audio.js";
window.A = { leadNote, LEAD_SPECS, LEAD_VOICES, BASS_VOICES, playBass };`,
    resolveDir: new URL("../src", import.meta.url).pathname, sourcefile: "entry.js",
  },
  bundle: true, format: "iife", write: false, target: "es2020",
});

const browser = await chromium.launch();
const page = await browser.newPage();
await page.addScriptTag({ content: bundle.outputFiles[0].text });

const out = await page.evaluate(async () => {
  const SR = 44100;
  // RBJ biquad coefficients for the two K-weighting stages: the head-related high shelf and
  // the rumble high-pass, at this sample rate
  const biquad = (type, fc, dbGain, Q) => {
    const A = Math.pow(10, dbGain / 40), w = 2 * Math.PI * fc / SR;
    const cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * Q);
    let b0, b1, b2, a0, a1, a2;
    if (type === "highshelf") {
      const sq = 2 * Math.sqrt(A) * al;
      b0 = A * ((A + 1) + (A - 1) * cs + sq);
      b1 = -2 * A * ((A - 1) + (A + 1) * cs);
      b2 = A * ((A + 1) + (A - 1) * cs - sq);
      a0 = (A + 1) - (A - 1) * cs + sq;
      a1 = 2 * ((A - 1) - (A + 1) * cs);
      a2 = (A + 1) - (A - 1) * cs - sq;
    } else {
      b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = (1 + cs) / 2;
      a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al;
    }
    return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
  };
  const K_STAGES = [
    biquad("highshelf", 1681.9744509742, 3.99984385397, 0.7071752369),
    biquad("highpass", 38.13547087614, 0, 0.5003270373),
  ];
  const kFilter = x => {
    let y = Float32Array.from(x);
    for (const [b0, b1, b2, a1, a2] of K_STAGES) {
      const z = new Float32Array(y.length);
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let i = 0; i < y.length; i++) {
        const v = b0 * y[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
        x2 = x1; x1 = y[i]; y2 = y1; y1 = v; z[i] = v;
      }
      y = z;
    }
    return y;
  };
  /* Loudest 400 ms window (100 ms hop), in dB. Max-momentary rather than the mean over the
     whole render, so a pluck — all attack, no sustain — is scored by the part of it you hear,
     and doesn't get boosted into a hammer for having a quiet tail. */
  const loudness = x => {
    const y = kFilter(x);
    const W = Math.floor(SR * 0.4), H = Math.floor(SR * 0.1);
    let best = 0;
    for (let s = 0; s + W <= y.length; s += H) {
      let ms = 0;
      for (let i = s; i < s + W; i++) ms += y[i] * y[i];
      if ((ms /= W) > best) best = ms;
    }
    return -0.691 + 10 * Math.log10(best + 1e-12);
  };
  const render = async (kind, midi, dur, lvl) => {
    const ctx = new OfflineAudioContext(1, Math.ceil(SR * (dur + 1.2)), SR);
    A.leadNote(ctx, 0.05, midi, dur, kind, false, ctx.destination,
      lvl === 1 ? null : { atk: 0, dec: 1, sus: 1, rel: 1, lvl });
    return loudness((await ctx.startRendering()).getChannelData(0));
  };
  // leads at C4 and C5 — the registers a melody actually lives in — averaged so a low-pass
  // sitting right on one pitch's harmonics doesn't skew the score
  const leads = {};
  for (const [k] of A.LEAD_VOICES)
    leads[k] = { l: (await render(k, 60, 1.0, 1) + await render(k, 72, 1.0, 1)) / 2, vol: A.LEAD_SPECS[k].vol };
  // bass voices raw at C2 (boost of 1), plus the boosted playBass result as a check
  const bass = {};
  for (const [k] of A.BASS_VOICES) {
    const ctx = new OfflineAudioContext(1, Math.ceil(SR * 2), SR);
    A.playBass(ctx, 0.05, 0, 0, 0.7, k, ctx.destination, 1);
    bass[k] = { raw: await render(k, 36, 0.7, 1), boosted: loudness((await ctx.startRendering()).getChannelData(0)) };
  }
  return { leads, bass };
});
await browser.close();

const dB = v => v.toFixed(1).padStart(6);
const leadTarget = out.leads.synth.l;                 // the default lead anchors the whole set
const BASS_TARGET = -20.6;                            // the classic sub-bass level, kept
console.log(`— leads, matched to synth = ${leadTarget.toFixed(1)} dB —`);
for (const [k, v] of Object.entries(out.leads))
  console.log(`${k.padEnd(9)} ${dB(v.l)}  vol ${String(v.vol).padEnd(6)} → suggested ${(v.vol * Math.pow(10, (leadTarget - v.l) / 20)).toFixed(3)}`);
console.log(`\n— bass voices at C2, matched to ${BASS_TARGET} dB —`);
for (const [k, v] of Object.entries(out.bass))
  console.log(`${k.padEnd(7)} raw ${dB(v.raw)} · with current boost ${dB(v.boosted)} → suggested boost ${Math.pow(10, (BASS_TARGET - v.raw) / 20).toFixed(1)}`);
