/**
 * HMXOT — Multi-Voice Harmonic Overtone Engine
 * Each voice is an independent harmonic oscillator bank
 */

export type WaveType = 'sine' | 'triangle' | 'sawtooth' | 'square';

export interface VoiceConfig {
  id: string;
  name: string;
  fundamental: number;
  overtoneGains: number[];
  waveform: WaveType;
  filterFreq: number;
  filterQ: number;
  filterType: BiquadFilterType;
  volume: number;
  pan: number;
  reverbSend: number;
  delaySend: number;
  oscCount: number; // 1-16
}

export interface EngineState {
  masterGain: number;
  reverbMix: number;
  delayTime: number;
  delayFeedback: number;
  voices: VoiceConfig[];
}

let audioCtx: AudioContext | null = null;

// Shared effects busses
let masterGainNode: GainNode | null = null;
let reverbNode: ConvolverNode | null = null;
let reverbGain: GainNode | null = null;
let delayNode: DelayNode | null = null;
let delayFeedbackGain: GainNode | null = null;
let delayMixGain: GainNode | null = null;
let compressorNode: DynamicsCompressorNode | null = null;

// Per-voice state
interface VoiceState {
  config: VoiceConfig;
  oscNodes: OscillatorNode[];
  gainNodes: GainNode[];
  filterNode: BiquadFilterNode | null;
  voiceGain: GainNode | null;
  panNode: StereoPannerNode | null;
  reverbSendGain: GainNode | null;
  delaySendGain: GainNode | null;
}

let voiceStates: VoiceState[] = [];
const MAX_OSC = 8;

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function initEffects(ac: AudioContext): void {
  if (masterGainNode) return;

  masterGainNode = ac.createGain();
  masterGainNode.gain.value = 0.5;

  compressorNode = ac.createDynamicsCompressor();
  compressorNode.threshold.value = -24;
  compressorNode.knee.value = 20;
  compressorNode.ratio.value = 8;
  compressorNode.attack.value = 0.003;
  compressorNode.release.value = 0.2;

  // Reverb
  const sr = ac.sampleRate;
  const len = sr * 2.5;
  const impulse = ac.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
  }
  reverbNode = ac.createConvolver();
  reverbNode.buffer = impulse;
  reverbGain = ac.createGain();
  reverbGain.gain.value = 0.2;

  // Delay
  delayNode = ac.createDelay(4);
  delayNode.delayTime.value = 0.3;
  delayFeedbackGain = ac.createGain();
  delayFeedbackGain.gain.value = 0.25;
  delayMixGain = ac.createGain();
  delayMixGain.gain.value = 0.15;
  delayNode.connect(delayFeedbackGain);
  delayFeedbackGain.connect(delayNode);

  // Connect effects chain
  reverbNode.connect(reverbGain);
  reverbGain.connect(masterGainNode);
  delayNode.connect(delayMixGain);
  delayMixGain.connect(masterGainNode);

  masterGainNode.connect(compressorNode);
  compressorNode.connect(ac.destination);
}

export function getEffectsInput(): GainNode | null {
  if (!audioCtx || !masterGainNode) return null;
  // Create a temporary input bus
  const ac = audioCtx;
  const bus = ac.createGain();
  bus.connect(reverbNode!);
  bus.connect(delayNode!);
  bus.connect(masterGainNode!);
  return bus;
}

// ─── Voice creation ───

export function createVoice(config: VoiceConfig): void {
  const ac = getAudioContext();
  if (ac.state === 'suspended') ac.resume();
  initEffects(ac);

  // Remove existing voice with same id
  const existingIdx = voiceStates.findIndex(v => v.config.id === config.id);
  if (existingIdx >= 0) {
    destroyVoice(config.id);
  }

  const voiceGain = ac.createGain();
  voiceGain.gain.value = config.volume;

  const panNode = ac.createStereoPanner();
  panNode.pan.value = config.pan;

  const filterNode = ac.createBiquadFilter();
  filterNode.type = config.filterType;
  filterNode.frequency.value = config.filterFreq;
  filterNode.Q.value = config.filterQ;

  const reverbSend = ac.createGain();
  reverbSend.gain.value = config.reverbSend;

  const delaySend = ac.createGain();
  delaySend.gain.value = config.delaySend;

  const oscNodes: OscillatorNode[] = [];
  const gainNodes: GainNode[] = [];
  const count = Math.min(config.oscCount, MAX_OSC);

  for (let i = 0; i < count; i++) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = config.waveform;
    osc.frequency.value = config.fundamental * (i + 1);
    gain.gain.value = config.overtoneGains[i] || 0;
    osc.connect(gain);
    gain.connect(filterNode);
    oscNodes.push(osc);
    gainNodes.push(gain);
  }

  filterNode.connect(voiceGain);
  voiceGain.connect(panNode);
  panNode.connect(masterGainNode!);

  // Effects sends
  if (reverbNode) {
    voiceGain.connect(reverbSend);
    reverbSend.connect(reverbNode);
  }
  if (delayNode) {
    voiceGain.connect(delaySend);
    delaySend.connect(delayNode);
  }

  // Start oscillators
  oscNodes.forEach(osc => {
    try { osc.start(); } catch {}
  });

  voiceStates.push({
    config: { ...config },
    oscNodes, gainNodes, filterNode, voiceGain, panNode,
    reverbSendGain: reverbSend, delaySendGain: delaySend,
  });
}

export function destroyVoice(id: string): void {
  const idx = voiceStates.findIndex(v => v.config.id === id);
  if (idx < 0) return;
  const v = voiceStates[idx]!;
  v.oscNodes.forEach(osc => { try { osc.stop(); osc.disconnect(); } catch {} });
  v.gainNodes.forEach(g => { try { g.disconnect(); } catch {} });
  v.filterNode?.disconnect();
  v.voiceGain?.disconnect();
  v.panNode?.disconnect();
  v.reverbSendGain?.disconnect();
  v.delaySendGain?.disconnect();
  voiceStates.splice(idx, 1);
}

export function destroyAllVoices(): void {
  [...voiceStates].forEach(v => destroyVoice(v.config.id));
}

export function updateVoice(id: string, partial: Partial<VoiceConfig>): void {
  const v = voiceStates.find(v => v.config.id === id);
  if (!v || !audioCtx) return;
  const ac = audioCtx;

  Object.assign(v.config, partial);

  if (partial.volume !== undefined && v.voiceGain) {
    v.voiceGain.gain.setTargetAtTime(v.config.volume, ac.currentTime, 0.02);
  }
  if (partial.pan !== undefined && v.panNode) {
    v.panNode.pan.setTargetAtTime(v.config.pan, ac.currentTime, 0.02);
  }
  if (partial.filterFreq !== undefined && v.filterNode) {
    v.filterNode.frequency.setTargetAtTime(v.config.filterFreq, ac.currentTime, 0.02);
  }
  if (partial.filterQ !== undefined && v.filterNode) {
    v.filterNode.Q.setTargetAtTime(v.config.filterQ, ac.currentTime, 0.02);
  }
  if (partial.filterType !== undefined && v.filterNode) {
    v.filterNode.type = v.config.filterType;
  }
  if (partial.reverbSend !== undefined && v.reverbSendGain) {
    v.reverbSendGain.gain.setTargetAtTime(v.config.reverbSend, ac.currentTime, 0.02);
  }
  if (partial.delaySend !== undefined && v.delaySendGain) {
    v.delaySendGain.gain.setTargetAtTime(v.config.delaySend, ac.currentTime, 0.02);
  }
  if (partial.waveform !== undefined) {
    v.oscNodes.forEach(osc => { osc.type = v.config.waveform; });
  }
  if (partial.fundamental !== undefined) {
    v.oscNodes.forEach((osc, i) => {
      osc.frequency.setTargetAtTime(v.config.fundamental * (i + 1), ac.currentTime, 0.02);
    });
  }
}

export function setVoiceHarmonicGains(id: string, gains: number[]): void {
  const v = voiceStates.find(v => v.config.id === id);
  if (!v || !audioCtx) return;
  const ac = audioCtx;
  const count = Math.min(gains.length, v.gainNodes.length, MAX_OSC);
  for (let i = 0; i < count; i++) {
    v.gainNodes[i]!.gain.setTargetAtTime(gains[i] ?? 0, ac.currentTime, 0.03);
  }
  // Update stored config
  for (let i = 0; i < Math.min(gains.length, 16); i++) {
    v.config.overtoneGains[i] = gains[i] ?? 0;
  }
}

export function triggerNoiseToVoice(id: string, duration = 0.06, velocity = 0.5): void {
  const v = voiceStates.find(v => v.config.id === id);
  if (!v || !audioCtx) return;
  const ac = audioCtx;
  const bufSize = ac.sampleRate * duration;
  const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 4);
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const env = ac.createGain();
  env.gain.setValueAtTime(velocity * 0.4, ac.currentTime);
  env.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  src.connect(env);
  env.connect(v.filterNode!);
  src.start();
}

export function setMasterGain(val: number): void {
  if (masterGainNode) {
    masterGainNode.gain.setTargetAtTime(val * 0.5, audioCtx!.currentTime, 0.02);
  }
}

export function setReverbMix(val: number): void {
  if (reverbGain) {
    reverbGain.gain.setTargetAtTime(val * 0.6, audioCtx!.currentTime, 0.02);
  }
}

export function setDelayParams(time: number, feedback: number): void {
  if (delayNode) delayNode.delayTime.setTargetAtTime(time, audioCtx!.currentTime, 0.02);
  if (delayFeedbackGain) delayFeedbackGain.gain.setTargetAtTime(Math.min(feedback * 0.8, 0.9), audioCtx!.currentTime, 0.02);
}

export function getVoiceIds(): string[] {
  return voiceStates.map(v => v.config.id);
}

export function getVoiceConfig(id: string): VoiceConfig | undefined {
  return voiceStates.find(v => v.config.id === id)?.config;
}

// ─── Default voice configs ───

export const OVERTONE_PRESETS: Record<string, number[]> = {
  sub: [1, 0.6, 0.05, 0.02, 0,0,0,0,0,0,0,0,0,0,0,0],
  bass: [1, 0.4, 0.6, 0.3, 0.2, 0.1, 0,0,0,0,0,0,0,0,0,0],
  bright: [1, 0.8, 0.6, 0.7, 0.5, 0.6, 0.4, 0.5, 0.3, 0.4, 0.2, 0.3, 0.15, 0.2, 0.1, 0.15],
  warm: [1, 0.6, 0.4, 0.3, 0.25, 0.2, 0.18, 0.15, 0.12, 0.1, 0.08, 0.06, 0.05, 0.04, 0.03, 0.02],
  bell: [1, 0.6, 0.4, 0.8, 0.3, 0.7, 0.2, 0.5, 0.15, 0.4, 0.1, 0.3, 0.08, 0.2, 0.05, 0.1],
  organ: [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.25, 0.2, 0.15, 0.1, 0.08, 0.05, 0.03, 0.02],
  metallic: [1, 0.3, 0.9, 0.2, 0.8, 0.15, 0.7, 0.1, 0.6, 0.08, 0.5, 0.05, 0.4, 0.03, 0.3, 0.02],
  cosmic: [1, 0.4, 0.6, 0.3, 0.8, 0.2, 0.7, 0.15, 0.6, 0.1, 0.5, 0.08, 0.4, 0.05, 0.3, 0.03],
};

export function defaultVoices(): VoiceConfig[] {
  return [
    {
      id: 'bass', name: 'Bass', fundamental: 55,
      overtoneGains: [...OVERTONE_PRESETS.bass],
      waveform: 'sawtooth', oscCount: 4,
      filterFreq: 300, filterQ: 1, filterType: 'lowpass',
      volume: 0.5, pan: -0.3, reverbSend: 0.1, delaySend: 0,
    },
    {
      id: 'lead', name: 'Lead', fundamental: 220,
      overtoneGains: [...OVERTONE_PRESETS.bell],
      waveform: 'triangle', oscCount: 4,
      filterFreq: 2000, filterQ: 1, filterType: 'bandpass',
      volume: 0.35, pan: 0.3, reverbSend: 0.3, delaySend: 0.2,
    },
    {
      id: 'pad', name: 'Pad', fundamental: 110,
      overtoneGains: [...OVERTONE_PRESETS.warm],
      waveform: 'sine', oscCount: 6,
      filterFreq: 800, filterQ: 0.5, filterType: 'lowpass',
      volume: 0.3, pan: 0, reverbSend: 0.5, delaySend: 0.3,
    },
    {
      id: 'drum', name: 'Drum', fundamental: 55,
      overtoneGains: [...OVERTONE_PRESETS.sub],
      waveform: 'sawtooth', oscCount: 1,
      filterFreq: 6000, filterQ: 0.5, filterType: 'highpass',
      volume: 0.4, pan: 0, reverbSend: 0.15, delaySend: 0,
    },
  ];
}
