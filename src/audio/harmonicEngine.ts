/**
 * HMXOT — Minimal Harmonic Overtone Engine
 * Single drone, 16 harmonics, effects. That's it.
 */

export type WaveType = 'sine' | 'triangle' | 'sawtooth' | 'square';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let filterNode: BiquadFilterNode | null = null;
let oscNodes: OscillatorNode[] = [];
let gainNodes: GainNode[] = [];
let reverbGain: GainNode | null = null;
let delayNode: DelayNode | null = null;
let delayFeedback: GainNode | null = null;
let delayMix: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;

export function initAudio(): AudioContext {
  if (audioCtx) return audioCtx;
  audioCtx = new AudioContext();
  const ac = audioCtx;

  masterGain = ac.createGain();
  masterGain.gain.value = 0.4;

  compressor = ac.createDynamicsCompressor();
  compressor.threshold.value = -20;
  compressor.ratio.value = 6;

  filterNode = ac.createBiquadFilter();
  filterNode.type = 'lowpass';
  filterNode.frequency.value = 2000;
  filterNode.Q.value = 1;

  // Reverb
  const sr = ac.sampleRate;
  const len = sr * 2;
  const impulse = ac.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
  }
  const reverb = ac.createConvolver();
  reverb.buffer = impulse;
  reverbGain = ac.createGain();
  reverbGain.gain.value = 0.2;

  // Delay
  delayNode = ac.createDelay(3);
  delayNode.delayTime.value = 0.3;
  delayFeedback = ac.createGain();
  delayFeedback.gain.value = 0.2;
  delayMix = ac.createGain();
  delayMix.gain.value = 0.15;
  delayNode.connect(delayFeedback);
  delayFeedback.connect(delayNode);

  // Connect: filter → master → compressor → destination
  // Sends: filter → reverb → master, filter → delay → master
  filterNode.connect(masterGain);
  masterGain.connect(compressor);
  compressor.connect(ac.destination);

  filterNode.connect(reverb);
  reverb.connect(reverbGain);
  reverbGain.connect(masterGain);

  filterNode.connect(delayNode);
  delayNode.connect(delayMix);
  delayMix.connect(masterGain);

  return ac;
}

export function createOscillators(fundamental: number, waveform: WaveType, gains: number[]): void {
  destroyOscillators();
  const ac = audioCtx;
  if (!ac) return;
  if (ac.state === 'suspended') ac.resume();

  for (let i = 0; i < 16; i++) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = waveform;
    osc.frequency.value = fundamental * (i + 1);
    gain.gain.value = gains[i] ?? 0;
    osc.connect(gain);
    gain.connect(filterNode!);
    oscNodes.push(osc);
    gainNodes.push(gain);
    osc.start();
  }
}

export function destroyOscillators(): void {
  oscNodes.forEach(o => { try { o.stop(); o.disconnect(); } catch {} });
  gainNodes.forEach(g => { try { g.disconnect(); } catch {} });
  oscNodes = [];
  gainNodes = [];
}

export function setGains(gains: number[]): void {
  if (!audioCtx) return;
  for (let i = 0; i < Math.min(gains.length, 16); i++) {
    if (gainNodes[i]) gainNodes[i]!.gain.setTargetAtTime(gains[i] ?? 0, audioCtx.currentTime, 0.03);
  }
}

export function setFundamental(freq: number, waveform: WaveType): void {
  if (!audioCtx) return;
  for (let i = 0; i < Math.min(oscNodes.length, 16); i++) {
    oscNodes[i]!.frequency.setTargetAtTime(freq * (i + 1), audioCtx.currentTime, 0.02);
    oscNodes[i]!.type = waveform;
  }
}

export function setFilter(cutoff: number, q: number): void {
  if (!audioCtx || !filterNode) return;
  filterNode.frequency.setTargetAtTime(cutoff, audioCtx.currentTime, 0.02);
  filterNode.Q.setTargetAtTime(q, audioCtx.currentTime, 0.02);
}

export function setMaster(val: number): void {
  if (masterGain) masterGain.gain.setTargetAtTime(val * 0.4, audioCtx!.currentTime, 0.02);
}

export function setReverb(val: number): void {
  if (reverbGain) reverbGain.gain.setTargetAtTime(val * 0.5, audioCtx!.currentTime, 0.02);
}

export function setDelay(time: number, feedback: number): void {
  if (delayNode) delayNode.delayTime.setTargetAtTime(time, audioCtx!.currentTime, 0.02);
  if (delayFeedback) delayFeedback.gain.setTargetAtTime(Math.min(feedback * 0.7, 0.85), audioCtx!.currentTime, 0.02);
}

export function triggerPerc(vel: number = 0.5): void {
  const ac = audioCtx;
  if (!ac) return;
  const len = ac.sampleRate * 0.06;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 5);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const env = ac.createGain();
  env.gain.setValueAtTime(vel * 0.35, ac.currentTime);
  env.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.06);
  src.connect(env);
  env.connect(filterNode!);
  src.start();
}

export const OVERTONE_PRESETS: Record<string, number[]> = {
  sub:   [1,0.5,0.05,0.02,0,0,0,0,0,0,0,0,0,0,0,0],
  bass:  [1,0.4,0.6,0.3,0.2,0.1,0,0,0,0,0,0,0,0,0,0],
  organ: [1,0.9,0.8,0.7,0.6,0.5,0.4,0.3,0.25,0.2,0.15,0.1,0.08,0.05,0.03,0.02],
  warm:  [1,0.6,0.4,0.3,0.25,0.2,0.18,0.15,0.12,0.1,0.08,0.06,0.05,0.04,0.03,0.02],
  bell:  [1,0.6,0.4,0.8,0.3,0.7,0.2,0.5,0.15,0.4,0.1,0.3,0.08,0.2,0.05,0.1],
  bright:[1,0.8,0.6,0.7,0.5,0.6,0.4,0.5,0.3,0.4,0.2,0.3,0.15,0.2,0.1,0.15],
  cosmic:[1,0.4,0.6,0.3,0.8,0.2,0.7,0.15,0.6,0.1,0.5,0.08,0.4,0.05,0.3,0.03],
};
