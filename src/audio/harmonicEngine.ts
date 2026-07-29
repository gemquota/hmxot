/**
 * Harmonic Overtones Audio Engine — Enhanced
 * Generates and manipulates harmonic series with Web Audio API
 * Now with reverb, delay, and chorus effects
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
  // Effects
  reverbMix: number;
  delayTime: number;
  delayFeedback: number;
  chorusDepth: number;
}

let audioCtx: AudioContext | null = null;
let masterGainNode: GainNode | null = null;
let filterNode: BiquadFilterNode | null = null;
let oscillators: OscillatorNode[] = [];
let gainNodes: GainNode[] = [];
// Effects nodes
let reverbNode: ConvolverNode | null = null;
let reverbGain: GainNode | null = null;
let dryGain: GainNode | null = null;
let delayNode: DelayNode | null = null;
let delayFeedback: GainNode | null = null;
let delayMix: GainNode | null = null;
let chorusLFO: OscillatorNode | null = null;
let chorusGain: GainNode | null = null;

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
    
    // Create reverb
    createReverb(audioCtx);
    
    // Create delay
    delayNode = audioCtx.createDelay(2);
    delayNode.delayTime.value = 0.3;
    delayFeedback = audioCtx.createGain();
    delayFeedback.gain.value = 0.3;
    delayMix = audioCtx.createGain();
    delayMix.gain.value = 0;
    
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayNode.connect(delayMix);
    delayMix.connect(filterNode);
    
    // Create chorus
    chorusLFO = audioCtx.createOscillator();
    chorusGain = audioCtx.createGain();
    chorusLFO.frequency.value = 0.5;
    chorusGain.gain.value = 0;
    chorusLFO.connect(chorusGain);
    chorusLFO.start();
    
    // Connect filter to effects chain
    filterNode.connect(masterGainNode);
    
    // Dry/wet for reverb
    dryGain = audioCtx.createGain();
    dryGain.gain.value = 1;
    filterNode.connect(dryGain);
    dryGain.connect(masterGainNode);
    
    if (reverbNode) {
      filterNode.connect(reverbNode);
      reverbNode.connect(reverbGain!);
      reverbGain!.connect(masterGainNode);
    }
    
    masterGainNode.connect(audioCtx.destination);
  }
  return audioCtx;
}

async function createReverb(ctx: AudioContext): Promise<void> {
  const length = ctx.sampleRate * 2;
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  
  for (let channel = 0; channel < 2; channel++) {
    const channelData = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
    }
  }
  
  reverbNode = ctx.createConvolver();
  reverbNode.buffer = impulse;
  reverbGain = ctx.createGain();
  reverbGain.gain.value = 0;
  
  reverbNode.connect(reverbGain);
}

/** Create 16 harmonic oscillators wired into the filter chain. Does NOT start them. */
export function createHarmonicOscillators(state: HarmonicState): void {
  stopAllOscillators();

  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  for (let i = 0; i < MAX_HARMONICS; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = state.waveform;
    osc.frequency.value = state.fundamental * (i + 1);
    osc.detune.value = state.detune;

    gain.gain.value = state.overtoneGains[i] || 0;

    osc.connect(gain);
    gain.connect(filterNode!);

    oscillators.push(osc);
    gainNodes.push(gain);
  }
}

/** Start all created oscillators. */
export function startPlayback(): void {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  oscillators.forEach(osc => {
    try { osc.start(); } catch {}
  });
}

/** Update running oscillators with new parameters (no recreation needed). */
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
  
  // Update effects
  if (reverbGain) {
    reverbGain.gain.value = state.reverbMix;
  }
  if (delayMix) {
    delayMix.gain.value = state.delayFeedback > 0 ? 0.3 : 0;
  }
  if (delayNode) {
    delayNode.delayTime.value = state.delayTime;
  }
  if (delayFeedback) {
    delayFeedback.gain.value = state.delayFeedback;
  }
  if (chorusGain) {
    chorusGain.gain.value = state.chorusDepth;
  }
}

/** Stop and disconnect all oscillators. */
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

/** Trigger a one-shot note with the current waveform. */
export function triggerNote(frequency: number, duration: number = 0.5, waveform: OscillatorType = 'sine'): void {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.frequency.value = frequency;
  osc.type = waveform;

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
    // Effects defaults
    reverbMix: 0.2,
    delayTime: 0.3,
    delayFeedback: 0.3,
    chorusDepth: 0,
  };
}
