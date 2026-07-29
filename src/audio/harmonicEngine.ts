/**
 * HMXOT — Harmonic Overtone Engine
 * Always-on generative drone + touch-triggered notes + rich effects
 */

export type WaveType = 'sine' | 'triangle' | 'sawtooth' | 'square' | 'noise';

export interface HarmonicState {
  fundamental: number;
  overtoneGains: number[];
  detune: number;
  waveform: WaveType;
  filterFreq: number;
  filterQ: number;
  filterType: BiquadFilterType;
  masterGain: number;
  isPlaying: boolean;
  reverbMix: number;
  delayTime: number;
  delayFeedback: number;
  chorusDepth: number;
  lfoRate: number;
  lfoDepth: number;
  distortionAmount: number;
  compressorThreshold: number;
  pan: number;
}

let audioCtx: AudioContext | null = null;
let masterGainNode: GainNode | null = null;
let filterNode: BiquadFilterNode | null = null;
let filter2Node: BiquadFilterNode | null = null;
let oscillators: OscillatorNode[] = [];
let gainNodes: GainNode[] = [];

// Effects
let reverbNode: ConvolverNode | null = null;
let reverbGain: GainNode | null = null;
let dryGain: GainNode | null = null;
let delayNode: DelayNode | null = null;
let delayFeedbackGain: GainNode | null = null;
let delayMixGain: GainNode | null = null;
let lfoNode: OscillatorNode | null = null;
let lfoGain: GainNode | null = null;
let distortionNode: WaveShaperNode | null = null;
let compressorNode: DynamicsCompressorNode | null = null;
let panNode: StereoPannerNode | null = null;

const MAX_HARMONICS = 16;

function makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const samples = 256;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    const ac = audioCtx;

    // Master
    masterGainNode = ac.createGain();
    masterGainNode.gain.value = 0.25;

    // Pan
    panNode = ac.createStereoPanner();
    panNode.pan.value = 0;

    // Compressor
    compressorNode = ac.createDynamicsCompressor();
    compressorNode.threshold.value = -24;
    compressorNode.knee.value = 30;
    compressorNode.ratio.value = 12;
    compressorNode.attack.value = 0.003;
    compressorNode.release.value = 0.25;

    // Filter chain
    filterNode = ac.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.value = 2000;
    filterNode.Q.value = 1;

    filter2Node = ac.createBiquadFilter();
    filter2Node.type = 'highpass';
    filter2Node.frequency.value = 60;
    filter2Node.Q.value = 0.7;

    distortionNode = ac.createWaveShaper();
    distortionNode.curve = makeDistortionCurve(0) as Float32Array<ArrayBuffer>;
    distortionNode.oversample = 'none';

    // Dry path
    dryGain = ac.createGain();
    dryGain.gain.value = 1;
    filterNode.connect(filter2Node);
    filter2Node.connect(distortionNode);
    distortionNode.connect(dryGain);
    dryGain.connect(compressorNode);
    compressorNode.connect(panNode);

    // Reverb
    const sr = ac.sampleRate;
    const len = sr * 3;
    const impulse = ac.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      }
    }
    reverbNode = ac.createConvolver();
    reverbNode.buffer = impulse;
    reverbGain = ac.createGain();
    reverbGain.gain.value = 0.15;
    dryGain.connect(reverbNode);
    reverbNode.connect(reverbGain);
    reverbGain.connect(panNode);

    // Delay
    delayNode = ac.createDelay(4);
    delayNode.delayTime.value = 0.3;
    delayFeedbackGain = ac.createGain();
    delayFeedbackGain.gain.value = 0.3;
    delayMixGain = ac.createGain();
    delayMixGain.gain.value = 0.15;
    dryGain.connect(delayNode);
    delayNode.connect(delayMixGain);
    delayMixGain.connect(panNode);
    delayNode.connect(delayFeedbackGain);
    delayFeedbackGain.connect(delayNode);

    // LFO
    lfoNode = ac.createOscillator();
    lfoNode.type = 'sine';
    lfoNode.frequency.value = 0.5;
    lfoGain = ac.createGain();
    lfoGain.gain.value = 300;
    lfoNode.connect(lfoGain);
    lfoGain.connect(filterNode.frequency);
    lfoNode.start();

    panNode.connect(masterGainNode);
    masterGainNode.connect(ac.destination);
  }
  return audioCtx;
}

export function applyParams(state: HarmonicState): void {
  const ac = audioCtx;
  if (!ac) return;

  if (filterNode) {
    filterNode.frequency.setTargetAtTime(state.filterFreq, ac.currentTime, 0.02);
    filterNode.Q.setTargetAtTime(state.filterQ, ac.currentTime, 0.02);
    filterNode.type = state.filterType;
  }
  if (filter2Node) {
    filter2Node.frequency.setTargetAtTime(state.filterFreq * 0.03, ac.currentTime, 0.02);
  }
  if (masterGainNode) {
    masterGainNode.gain.setTargetAtTime(state.masterGain * 0.4, ac.currentTime, 0.02);
  }
  if (panNode) {
    panNode.pan.setTargetAtTime(state.pan, ac.currentTime, 0.02);
  }
  if (compressorNode) {
    compressorNode.threshold.setTargetAtTime(state.compressorThreshold, ac.currentTime, 0.02);
  }
  if (dryGain) {
    dryGain.gain.setTargetAtTime(1 - state.reverbMix * 0.6, ac.currentTime, 0.02);
  }
  if (reverbGain) {
    reverbGain.gain.setTargetAtTime(state.reverbMix * 0.8, ac.currentTime, 0.02);
  }
  if (delayMixGain) {
    delayMixGain.gain.setTargetAtTime(state.delayFeedback * 0.4, ac.currentTime, 0.02);
  }
  if (delayNode) {
    delayNode.delayTime.setTargetAtTime(state.delayTime, ac.currentTime, 0.02);
  }
  if (delayFeedbackGain) {
    delayFeedbackGain.gain.setTargetAtTime(Math.min(state.delayFeedback * 0.8, 0.9), ac.currentTime, 0.02);
  }
  if (lfoNode) {
    lfoNode.frequency.setTargetAtTime(state.lfoRate, ac.currentTime, 0.02);
  }
  if (lfoGain) {
    lfoGain.gain.setTargetAtTime(state.lfoDepth, ac.currentTime, 0.02);
  }
  if (distortionNode) {
    distortionNode.curve = makeDistortionCurve(state.distortionAmount * 400) as Float32Array<ArrayBuffer>;
  }

  if (state.isPlaying) {
    oscillators.forEach((osc, i) => {
      if (osc) {
        const harmonic = i + 1;
        osc.frequency.setTargetAtTime(state.fundamental * harmonic, ac.currentTime, 0.02);
        osc.detune.setTargetAtTime(state.detune + Math.sin(i * 1.618) * state.chorusDepth * 15, ac.currentTime, 0.02);
      }
    });
    gainNodes.forEach((gain, i) => {
      if (gain) {
        gain.gain.setTargetAtTime(state.overtoneGains[i] || 0, ac.currentTime, 0.04);
      }
    });
  }
}

export function createHarmonicOscillators(state: HarmonicState): void {
  stopAllOscillators();
  const ac = getAudioContext();
  if (ac.state === 'suspended') ac.resume();

  for (let i = 0; i < MAX_HARMONICS; i++) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const harmonic = i + 1;
    osc.type = state.waveform === 'noise' ? 'sawtooth' : state.waveform;
    osc.frequency.value = state.fundamental * harmonic;
    osc.detune.value = state.detune + Math.sin(i * 1.618) * state.chorusDepth * 15;
    gain.gain.value = state.overtoneGains[i] || 0;
    osc.connect(gain);
    gain.connect(filterNode!);
    oscillators.push(osc);
    gainNodes.push(gain);
  }
}

export function startPlayback(): void {
  const ac = getAudioContext();
  if (ac.state === 'suspended') ac.resume();
  oscillators.forEach(osc => {
    try { osc.start(); } catch {}
  });
}

export function stopAllOscillators(): void {
  oscillators.forEach(osc => {
    try { osc.stop(); } catch {}
    try { osc.disconnect(); } catch {}
  });
  gainNodes.forEach(gain => {
    try { gain.disconnect(); } catch {}
  });
  oscillators = [];
  gainNodes = [];
}

export function triggerNote(
  frequency: number,
  duration: number = 0.3,
  waveform: WaveType = 'sine',
  velocity: number = 0.5
): void {
  const ac = getAudioContext();
  if (ac.state === 'suspended') ac.resume();

  const osc = ac.createOscillator();
  const env = ac.createGain();
  const filt = ac.createBiquadFilter();

  osc.frequency.value = frequency;
  osc.type = waveform === 'noise' ? 'sawtooth' : waveform;

  filt.type = 'lowpass';
  filt.frequency.value = 4000;
  filt.Q.value = 0.5;

  env.gain.setValueAtTime(0.001, ac.currentTime);
  env.gain.linearRampToValueAtTime(velocity * 0.6, ac.currentTime + 0.008);
  env.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);

  osc.connect(filt);
  filt.connect(env);
  env.connect(dryGain!);

  osc.start();
  osc.stop(ac.currentTime + duration + 0.05);
}

export function triggerNoise(duration: number = 0.1, velocity: number = 0.5): void {
  const ac = getAudioContext();
  if (ac.state === 'suspended') ac.resume();

  const bufSize = ac.sampleRate * duration;
  const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 3) as never;
  }

  const src = ac.createBufferSource();
  src.buffer = buf;
  const env = ac.createGain();
  env.gain.setValueAtTime(velocity * 0.3, ac.currentTime);
  env.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  src.connect(env);
  env.connect(dryGain!);
  src.start();
}

export const WAVEFORM_PRESETS: WaveType[] = ['sine', 'triangle', 'sawtooth', 'square', 'noise'];

export const FILTER_TYPES: BiquadFilterType[] = ['lowpass', 'highpass', 'bandpass', 'notch', 'allpass', 'lowshelf', 'highshelf'];

export const OVERTONE_PRESETS: Record<string, number[]> = {
  natural: [1, 0.5, 0.33, 0.25, 0.2, 0.16, 0.14, 0.125, 0.11, 0.1, 0.09, 0.08, 0.07, 0.06, 0.05, 0.04],
  bright: [1, 0.8, 0.6, 0.7, 0.5, 0.6, 0.4, 0.5, 0.3, 0.4, 0.2, 0.3, 0.15, 0.2, 0.1, 0.15],
  dark: [1, 0.2, 0.1, 0.05, 0.02, 0.01, 0.01, 0.005, 0.005, 0.002, 0.002, 0.001, 0.001, 0.001, 0.001, 0.001],
  bell: [1, 0.6, 0.4, 0.8, 0.3, 0.7, 0.2, 0.5, 0.15, 0.4, 0.1, 0.3, 0.08, 0.2, 0.05, 0.1],
  organ: [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.25, 0.2, 0.15, 0.1, 0.08, 0.05, 0.03, 0.02],
  metallic: [1, 0.3, 0.9, 0.2, 0.8, 0.15, 0.7, 0.1, 0.6, 0.08, 0.5, 0.05, 0.4, 0.03, 0.3, 0.02],
  cosmic: [1, 0.4, 0.6, 0.3, 0.8, 0.2, 0.7, 0.15, 0.6, 0.1, 0.5, 0.08, 0.4, 0.05, 0.3, 0.03],
  crystal: [1, 0.7, 0.1, 0.9, 0.05, 0.8, 0.02, 0.7, 0.01, 0.6, 0.005, 0.5, 0.003, 0.4, 0.002, 0.3],
  warm: [1, 0.6, 0.4, 0.3, 0.25, 0.2, 0.18, 0.15, 0.12, 0.1, 0.08, 0.06, 0.05, 0.04, 0.03, 0.02],
  sub: [1, 0.8, 0.1, 0.05, 0.02, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

export function createDefaultHarmonicState(): HarmonicState {
  return {
    fundamental: 55,
    overtoneGains: [...OVERTONE_PRESETS.sub],
    detune: 0,
    waveform: 'sawtooth',
    filterFreq: 800,
    filterQ: 2,
    filterType: 'lowpass',
    masterGain: 0.6,
    isPlaying: false,
    reverbMix: 0.25,
    delayTime: 0.35,
    delayFeedback: 0.4,
    chorusDepth: 0.3,
    lfoRate: 0.4,
    lfoDepth: 200,
    distortionAmount: 0.1,
    compressorThreshold: -24,
    pan: 0,
  };
}
