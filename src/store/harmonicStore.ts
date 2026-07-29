import { create } from 'zustand';
import {
  type HarmonicState,
  type WaveType,
  createDefaultHarmonicState,
  createHarmonicOscillators,
  applyParams,
  startPlayback,
  stopAllOscillators,
  triggerNote,
  triggerNoise,
  OVERTONE_PRESETS,
} from '../audio/harmonicEngine';

interface TouchState {
  x: number;
  y: number;
  active: boolean;
  force: number;
  count: number;
}

interface HarmonicStore extends HarmonicState {
  touch: TouchState;
  drawerOpen: boolean;
  selectedPreset: string;
  noteGates: boolean[];

  setFundamental: (freq: number) => void;
  setOvertoneGain: (index: number, gain: number) => void;
  setWaveform: (wave: WaveType) => void;
  setDetune: (cents: number) => void;
  setFilter: (freq: number, q: number) => void;
  setFilterType: (t: BiquadFilterType) => void;
  setMasterGain: (gain: number) => void;
  togglePlayback: () => void;
  trigger: (note: string) => void;
  triggerFreq: (freq: number, vel?: number) => void;
  triggerPerc: (vel?: number) => void;
  randomizeOvertones: () => void;
  resetOvertones: () => void;
  setPreset: (preset: string) => void;
  setReverbMix: (mix: number) => void;
  setDelayTime: (time: number) => void;
  setDelayFeedback: (feedback: number) => void;
  setChorusDepth: (depth: number) => void;
  setLfoRate: (rate: number) => void;
  setLfoDepth: (d: number) => void;
  setDistortionAmount: (a: number) => void;
  setCompressorThreshold: (t: number) => void;
  setPan: (p: number) => void;
  setTouch: (t: Partial<TouchState>) => void;
  setDrawerOpen: (o: boolean) => void;
  setNoteGate: (index: number, gated: boolean) => void;
  randomizeAll: () => void;
}

const NOTE_FREQUENCIES: Record<string, number> = {
  'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
};

export const useHarmonicStore = create<HarmonicStore>((set, get) => ({
  ...createDefaultHarmonicState(),
  touch: { x: 0, y: 0, active: false, force: 0.5, count: 0 },
  drawerOpen: false,
  selectedPreset: 'sub',
  noteGates: Array(16).fill(true),

  setFundamental: (freq: number) => {
    set({ fundamental: freq });
    applyParams(get());
  },

  setOvertoneGain: (index: number, gain: number) => {
    const newGains = [...get().overtoneGains];
    newGains[index] = Math.max(0, Math.min(1, gain));
    set({ overtoneGains: newGains });
    applyParams(get());
  },

  setWaveform: (wave: WaveType) => {
    set({ waveform: wave });
    const state = get();
    if (state.isPlaying) {
      createHarmonicOscillators(state);
      startPlayback();
      applyParams(state);
    }
  },

  setDetune: (cents: number) => {
    set({ detune: cents });
    applyParams(get());
  },

  setFilter: (freq: number, q: number) => {
    set({ filterFreq: freq, filterQ: q });
    applyParams(get());
  },

  setFilterType: (t: BiquadFilterType) => {
    set({ filterType: t });
    applyParams(get());
  },

  setMasterGain: (gain: number) => {
    set({ masterGain: gain });
    applyParams(get());
  },

  togglePlayback: () => {
    const state = get();
    if (!state.isPlaying) {
      const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
      ac.resume();
      createHarmonicOscillators(state);
      startPlayback();
      applyParams(state);
      set({ isPlaying: true });
    } else {
      stopAllOscillators();
      set({ isPlaying: false });
    }
  },

  trigger: (note: string) => {
    const freq = NOTE_FREQUENCIES[note];
    if (freq) {
      const state = get();
      applyParams(state);
      triggerNote(freq, 0.3, state.waveform);
    }
  },

  triggerFreq: (freq: number, vel: number = 0.5) => {
    const state = get();
    applyParams(state);
    triggerNote(freq, 0.15 + Math.random() * 0.2, state.waveform, vel);
  },

  triggerPerc: (vel: number = 0.5) => {
    applyParams(get());
    triggerNoise(0.06, vel);
  },

  randomizeOvertones: () => {
    const newGains = Array.from({ length: 16 }, () => Math.random() * 0.8 + 0.1);
    set({ overtoneGains: newGains });
    applyParams(get());
  },

  resetOvertones: () => {
    const defaultState = createDefaultHarmonicState();
    set({ overtoneGains: defaultState.overtoneGains });
    applyParams(get());
  },

  setPreset: (preset: string) => {
    const gains = OVERTONE_PRESETS[preset];
    if (gains) {
      set({ overtoneGains: gains, selectedPreset: preset });
      applyParams(get());
    }
  },

  setReverbMix: (mix: number) => {
    set({ reverbMix: mix });
    applyParams(get());
  },
  setDelayTime: (time: number) => {
    set({ delayTime: time });
    applyParams(get());
  },
  setDelayFeedback: (feedback: number) => {
    set({ delayFeedback: feedback });
    applyParams(get());
  },
  setChorusDepth: (depth: number) => {
    set({ chorusDepth: depth });
    applyParams(get());
  },
  setLfoRate: (rate: number) => {
    set({ lfoRate: rate });
    applyParams(get());
  },
  setLfoDepth: (d: number) => {
    set({ lfoDepth: d });
    applyParams(get());
  },
  setDistortionAmount: (a: number) => {
    set({ distortionAmount: a });
    applyParams(get());
  },
  setCompressorThreshold: (t: number) => {
    set({ compressorThreshold: t });
    applyParams(get());
  },
  setPan: (p: number) => {
    set({ pan: p });
    applyParams(get());
  },

  setTouch: (t: Partial<TouchState>) => {
    set(state => ({ touch: { ...state.touch, ...t } }));
  },

  setDrawerOpen: (o: boolean) => set({ drawerOpen: o }),

  setNoteGate: (index: number, gated: boolean) => {
    const gates = [...get().noteGates];
    gates[index] = gated;
    set({ noteGates: gates });
  },

  randomizeAll: () => {
    const state = get();
    state.setFundamental(40 + Math.random() * 400);
    state.randomizeOvertones();
    state.setDetune((Math.random() - 0.5) * 80);
    state.setFilter(100 + Math.random() * 4000, 0.5 + Math.random() * 10);
    state.setMasterGain(0.3 + Math.random() * 0.5);
    state.setReverbMix(Math.random() * 0.6);
    state.setDelayTime(0.1 + Math.random() * 0.8);
    state.setDelayFeedback(Math.random() * 0.7);
    state.setChorusDepth(Math.random() * 0.8);
    state.setLfoRate(0.1 + Math.random() * 4);
    state.setLfoDepth(Math.random() * 500);
    state.setDistortionAmount(Math.random() * 0.5);
    state.setPan((Math.random() - 0.5) * 2);
  },
}));
