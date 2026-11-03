/** Mic in (16 kHz mono PCM16, what Gemini Live listens to) and voice out (24 kHz PCM16 it speaks). */

const WORKLET = `
class Pcm16 extends AudioWorkletProcessor {
  constructor() { super(); this.buf = []; this.ratio = sampleRate / 16000; this.pos = 0; }
  process(inputs) {
    const ch = inputs[0][0];
    if (!ch) return true;
    for (; this.pos < ch.length; this.pos += this.ratio) this.buf.push(ch[Math.floor(this.pos)]);
    this.pos -= ch.length;
    if (this.buf.length >= 1600) { // 100 ms chunks
      const out = new Int16Array(this.buf.length);
      for (let i = 0; i < out.length; i++) out[i] = Math.max(-1, Math.min(1, this.buf[i])) * 0x7fff;
      this.port.postMessage(out.buffer, [out.buffer]);
      this.buf = [];
    }
    return true;
  }
}
registerProcessor('pcm16', Pcm16);`;

export function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export interface Mic { stop(): void; level(): number }

/** Starts the microphone; `onChunk` gets base64 PCM16 at 16 kHz every ~100 ms. */
export async function startMic(onChunk: (b64: string) => void): Promise<Mic> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  const ctx = new AudioContext();
  const url = URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' }));
  await ctx.audioWorklet.addModule(url);
  URL.revokeObjectURL(url);
  const src = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'pcm16');
  const analyser = ctx.createAnalyser();
  src.connect(node);
  src.connect(analyser);
  const data = new Uint8Array(analyser.fftSize);
  node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => onChunk(toBase64(e.data));
  return {
    stop() { stream.getTracks().forEach((t) => t.stop()); void ctx.close(); },
    level() { analyser.getByteTimeDomainData(data); let m = 0; for (const v of data) m = Math.max(m, Math.abs(v - 128)); return m / 128; },
  };
}

/** Plays Gemini's voice gap-free; `flush` stops at once when the teacher interrupts. */
export class Speaker {
  private ctx = new AudioContext({ sampleRate: 24000 });
  private at = 0;
  private playing = new Set<AudioBufferSourceNode>();

  play(b64: string, mime = 'audio/pcm;rate=24000') {
    const rate = Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000);
    const bin = atob(b64);
    const pcm = new Int16Array(bin.length >> 1);
    for (let i = 0; i < pcm.length; i++) pcm[i] = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8);
    const buf = this.ctx.createBuffer(1, pcm.length, rate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 0x8000;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);
    this.at = Math.max(this.at, this.ctx.currentTime + 0.03);
    src.start(this.at);
    this.at += buf.duration;
    this.playing.add(src);
    src.onended = () => this.playing.delete(src);
  }

  get speaking() { return this.playing.size > 0; }

  flush() {
    for (const s of this.playing) { try { s.stop(); } catch { /* already ended */ } }
    this.playing.clear();
    this.at = 0;
  }

  close() { this.flush(); void this.ctx.close(); }
}
