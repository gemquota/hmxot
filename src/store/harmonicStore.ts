import { create } from 'zustand';
import {
  type HarmonicState,
  createDefaultHarmonicState,
  createHarmonicOscillators,
  updateHarmonics,
  startPlayback,
  stopAllOscillators,
  triggerNote,
} from '../audio/harmonicEngine';

interface HarmonicStore extends HarmonicState {
  setFundamental: (freq: number) => void;
  setOvertoneGain: (index: number, gain: number) => void;
  setWaveform: (wave: OscillatorType) => void;
  setDetune: (cents: number) => void;
  setFilter: (freq: number, q: number) => void;
  setMasterGain: (gain: number) => void;
  togglePlayback: () => void;
  trigger: (note: string) => void;
  randomizeOvertones: () => void;
  resetOvertones: () => void;
  setPreset: (preset: string) => void;
}

const NOTE_FREQUENCIES: Record<string, number> = {
  'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
  'C6': 1046.50,
};

const OVERTONE_PRESETS: Record<string, number[]> = {
  'natural': [1, 0.5, 0.33, 0.25, 0.2, 0.16, 0.14, 0.125, 0.11, 0.1, 0.09, 0.08, 0.07, 0.06, 0.05, 0.04],
  'bright': [1, 0.8, 0.6, 0.7, 0.5, 0.6, 0.4, 0.5, 0.3, 0.4, 0.2, 0.3, 0.15, 0.2, 0.1, 0.15],
  'dark': [1, 0.2, 0.1, 0.05, 0.02, 0.01, 0.01, 0.005, 0.005, 0.002, 0.002, 0.001, 0.001, 0.001, 0.001, 0.001],
  'bell': [1, 0.6, 0.4, 0.8, 0.3, 0.7, 0.2, 0.5, 0.15, 0.4, 0.1, 0.3, 0.08, 0.2, 0.05, 0.1],
  'organ': [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.25, 0.2, 0.15, 0.1, 0.08, 0.05, 0.03, 0.02],
  'metallic': [1, 0.3, 0.9, 0.2, 0.8, 0.15, 0.7, 0.1, 0.6, 0.08, 0.5, 0.05, 0.4, 0.03, 0.3, 0.02],
};

export const useHarmonicStore = create<HarmonicStore>((set, get) => ({
  ...createDefaultHarmonicState(),

  setFundamental: (freq: number) => {
    set({ fundamental: freq });
    if (get().isPlaying) updateHarmonics(get());
  },

  setOvertoneGain: (index: number, gain: number) => {
    const newGains = [...get().overtoneGains];
    newGains[index] = gain;
    set({ overtoneGains: newGains });
    if (get().isPlaying) updateHarmonics(get());
  },

  setWaveform: (wave: OscillatorType) => {
    // Waveform can't change on running oscillators — recreate them
    set({ waveform: wave });
    if (get().isPlaying) {
      createHarmonicOscillators(get());
      startPlayback();
    }
  },

  setDetune: (cents: number) => {
    set({ detune: cents });
    if (get().isPlaying) updateHarmonics(get());
  },

  setFilter: (freq: number, q: number) => {
    set({ filterFreq: freq, filterQ: q });
    if (get().isPlaying) updateHarmonics(get());
  },

  setMasterGain: (gain: number) => {
    set({ masterGain: gain });
    if (get().isPlaying) updateHarmonics(get());
  },

  togglePlayback: () => {
    const state = get();
    if (!state.isPlaying) {
      createHarmonicOscillators(state);
      startPlayback();
      set({ isPlaying: true });
    } else {
      stopAllOscillators();
      set({ isPlaying: false });
    }
  },

  trigger: (note: string) => {
    const freq = NOTE_FREQUENCIES[note];
    if (freq) {
      triggerNote(freq, 0.5, get().waveform);
    }
  },

  randomizeOvertones: () => {
    const newGains = Array.from({ length: 16 }, () => Math.random());
    set({ overtoneGains: newGains });
    if (get().isPlaying) updateHarmonics(get());
  },

  resetOvertones: () => {
    const defaultState = createDefaultHarmonicState();
    set({ overtoneGains: defaultState.overtoneGains });
    if (get().isPlaying) updateHarmonics(get());
  },

  setPreset: (preset: string) => {
    const gains = OVERTONE_PRESETS[preset];
    if (gains) {
      set({ overtoneGains: gains });
      if (get().isPlaying) updateHarmonics(get());
    }
  },
}));
