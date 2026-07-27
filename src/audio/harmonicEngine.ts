/**
 * Harmonic Overtones Audio Engine
 * Generates and manipulates harmonic series with Web Audio API
 */

export interface HarmonicState {
  fundamental: number;
  harmonics: number[];
  overtoneGains: number[];
  detune: number;
  waveform: OscillatorType;
  filterFreq: number;
  filterQ: number;
  masterGain: number;
  isPlaying: boolean;
}

let audioCtx: AudioContext | null = null;
let masterGainNode: GainNode | null = null;
let filterNode: BiquadFilterNode | null = null;
let oscillators: OscillatorNode[] = [];
let gainNodes: GainNode[] = [];

const MAX_HARMONICS = 16;

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGainNode = audioCtx.createGain();
    filterNode = audioCtx.createBiquadFilter();
    
    filterNode.type = 'lowpass';
    filterNode.frequency.value = 2000;
    filterNode.Q.value = 1;
    
    masterGainNode.gain.value = 0.3;
    filterNode.connect(masterGainNode);
    masterGainNode.connect(audioCtx.destination);
  }
  return audioCtx;
}

export function createHarmonicOscillators(state: HarmonicState): void {
  stopAllOscillators();
  
  const ctx = getAudioContext();
  
  for (let i = 0; i < MAX_HARMONICS; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = state.waveform;
    osc.frequency.value = state.fundamental * (i + 1);
    osc.detune.value = state.detune;
    
    gain.gain.value = state.overtoneGains[i] || 0;
    
    osc.connect(gain);
    gain.connect(filterNode!);
    
    if (state.isPlaying) {
      osc.start();
    }
    
    oscillators.push(osc);
    gainNodes.push(gain);
  }
}

export function updateHarmonics(state: HarmonicState): void {
  oscillators.forEach((osc, i) => {
    if (osc) {
      osc.frequency.value = state.fundamental * (i + 1);
      osc.detune.value = state.detune;
    }
  });
  
  gainNodes.forEach((gain, i) => {
    if (gain) {
      gain.gain.value = state.overtoneGains[i] || 0;
    }
  });
  
  if (filterNode) {
    filterNode.frequency.value = state.filterFreq;
    filterNode.Q.value = state.filterQ;
  }
  
  if (masterGainNode) {
    masterGainNode.gain.value = state.masterGain;
  }
}

export function startPlayback(): void {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
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

export function triggerNote(frequency: number, duration: number = 0.5): void {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.frequency.value = frequency;
  osc.type = 'sine';
  
  gain.gain.setValueAtTime(0.5, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(filterNode!);
  
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export const WAVEFORM_PRESETS: OscillatorType[] = ['sine', 'square', 'sawtooth', 'triangle'];

export function createDefaultHarmonicState(): HarmonicState {
  return {
    fundamental: 440,
    harmonics: Array.from({ length: MAX_HARMONICS }, (_, i) => i + 1),
    overtoneGains: [1, 0.5, 0.3, 0.2, 0.15, 0.1, 0.08, 0.06, 0.05, 0.04, 0.03, 0.02, 0.02, 0.01, 0.01, 0.01],
    detune: 0,
    waveform: 'sine',
    filterFreq: 2000,
    filterQ: 1,
    masterGain: 0.3,
    isPlaying: false,
  };
}
