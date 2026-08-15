/* wav — turn a rendered AudioBuffer into a .wav file.
   MIDI export serves people who already have a DAW; a wav serves everyone else — it is the file
   you can send, post, or play in the car. Written by hand as 16-bit PCM, which every player on
   earth opens, rather than pulling in an encoder.
*/

// interleave the channels and clamp to 16-bit, dithering nothing — the limiter upstream has
// already kept the mix inside 0 dBFS, so a hard clamp here is a safety net, not the plan
function audioBufferToWav(buf) {
  const chans = Math.min(2, buf.numberOfChannels), frames = buf.length, rate = buf.sampleRate;
  const data = new ArrayBuffer(44 + frames * chans * 2);
  const view = new DataView(data);
  const str = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  str(0, "RIFF");
  view.setUint32(4, 36 + frames * chans * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true);              // PCM header length
  view.setUint16(20, 1, true);               // format 1 = PCM
  view.setUint16(22, chans, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * chans * 2, true); // byte rate
  view.setUint16(32, chans * 2, true);        // block align
  view.setUint16(34, 16, true);               // bits per sample
  str(36, "data");
  view.setUint32(40, frames * chans * 2, true);
  const src = [];
  for (let c = 0; c < chans; c++) src.push(buf.getChannelData(c));
  let off = 44;
  for (let i = 0; i < frames; i++)
    for (let c = 0; c < chans; c++) {
      const v = Math.max(-1, Math.min(1, src[c][i]));
      view.setInt16(off, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      off += 2;
    }
  return new Uint8Array(data);
}
// peak level of a rendered buffer, so a silent or clipped render can be reported rather than saved
function peakOf(buf) {
  let peak = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; }
  }
  return peak;
}

export { audioBufferToWav, peakOf };
