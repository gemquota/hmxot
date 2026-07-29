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

export interface SeqStep {
  note: string | null;     // fixed note name (null = rest)
  harmonic: number | null; // harmonic index 1-16 (overrides note when set)
  perc: boolean;           // trigger percussion hit
  vel: number;             // velocity 0-1
  active: boolean;         // step enabled
}

export interface Pattern {
  name: string;
  steps: SeqStep[];
  bpm: number;
  arpeggio: boolean; // true = steps use harmonic indices, false = fixed notes
}

const NOTE_FREQUENCIES: Record<string, number> = {
  'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
};

// ═══════════════════════════════════
// Helper: get frequency from a step
// ═══════════════════════════════════
function stepFreq(step: SeqStep, fundamental: number, arpeggio: boolean): number | null {
  if (arpeggio && step.harmonic !== null) {
    return fundamental * step.harmonic;
  }
  if (step.note) {
    return NOTE_FREQUENCIES[step.note] || null;
  }
  return null;
}

// ─── Pattern builder helpers ───
function makeStep(
  note: string | null = null,
  harmonic: number | null = null,
  perc = false,
  vel = 0.7,
  active = true
): SeqStep {
  return { note, harmonic, perc, vel, active };
}

// Fixed-note helpers
function R(): SeqStep { return makeStep(null, null, false, 0); }
function N(note: string, vel = 0.7): SeqStep { return makeStep(note, null, false, vel); }
function K(vel = 0.7): SeqStep { return makeStep(null, null, true, vel); }
function NK(note: string, vel = 0.7): SeqStep { return makeStep(note, null, true, vel); }

// Harmonic-index helpers
function H(harmonic: number, vel = 0.7): SeqStep { return makeStep(null, harmonic, false, vel); }
function HK(harmonic: number, vel = 0.7): SeqStep { return makeStep(null, harmonic, true, vel); }

// ─── Pre-programmed patterns ───

// Techno pattern — fixed notes
const PATTERN_TECHNO: Pattern = {
  name: 'techno', arpeggio: false, bpm: 132,
  steps: [
    NK('C2', 1.0), R(),    K(0.5),    N('E4', 0.4),
    NK('C2', 0.7), R(),    NK('G2',0.8), N('D4', 0.4),
    NK('A2', 0.9), R(),    K(0.6),    N('C4', 0.4),
    NK('F2', 0.7), R(),    NK('G2',0.8), N('B3', 0.4),
  ],
};

// Ambient — fixed notes
const PATTERN_AMBIENT: Pattern = {
  name: 'ambient', arpeggio: false, bpm: 86,
  steps: [
    N('C3', 0.6), R(),    N('G3', 0.3), R(),
    N('E3', 0.5), R(),    N('B3', 0.3), N('D4', 0.2),
    N('A2', 0.5), R(),    N('E3', 0.4), R(),
    N('F3', 0.5), N('G3', 0.3), N('A3', 0.3), R(),
  ],
};

// Harmonic arpeggio — cycles through overtone series
const PATTERN_HARMONIC_UP: Pattern = {
  name: 'harmonic-up', arpeggio: true, bpm: 110,
  steps: [
    HK(1, 1.0), H(2, 0.6), H(3, 0.7), H(4, 0.5),
    HK(1, 0.9), H(2, 0.5), H(5, 0.8), H(6, 0.4),
    HK(1, 0.8), H(3, 0.6), H(5, 0.7), H(7, 0.5),
    HK(1, 0.9), H(2, 0.5), H(4, 0.6), H(8, 0.4),
  ],
};

// 3rds & 5ths harmonic pattern
const PATTERN_HARMONIC_INTERVALS: Pattern = {
  name: 'harmonic-3rds', arpeggio: true, bpm: 96,
  steps: [
    H(1, 1.0), H(3, 0.5), H(5, 0.8), H(3, 0.4),
    H(1, 0.9), H(4, 0.5), H(6, 0.7), H(4, 0.4),
    H(1, 0.8), H(5, 0.6), H(7, 0.7), H(5, 0.5),
    H(1, 0.9), H(6, 0.5), H(9, 0.6), H(6, 0.4),
  ],
};

// Descending harmonic sweep
const PATTERN_HARMONIC_SWEEP: Pattern = {
  name: 'harmonic-sweep', arpeggio: true, bpm: 130,
  steps: [
    HK(8, 0.6), H(7, 0.5), H(6, 0.6), H(5, 0.5),
    HK(4, 0.7), H(3, 0.6), H(2, 0.7), H(1, 0.8),
    HK(8, 0.6), H(7, 0.5), H(6, 0.6), H(5, 0.5),
    HK(4, 0.7), H(3, 0.6), H(2, 0.7), H(1, 0.9),
  ],
};

const DEFAULT_PATTERNS: Pattern[] = [
  PATTERN_TECHNO,
  PATTERN_HARMONIC_UP,
  PATTERN_HARMONIC_INTERVALS,
  PATTERN_HARMONIC_SWEEP,
  PATTERN_AMBIENT,
];

interface HarmonicStore extends HarmonicState {
  touch: TouchState;
  drawerOpen: boolean;
  selectedPreset: string;
  noteGates: boolean[];

  // Sequencer
  bpm: number;
  currentStep: number;
  isSequencing: boolean;
  selectedPatternIdx: number;
  steps: SeqStep[];
  patterns: Pattern[];
  seqTimer: ReturnType<typeof setInterval> | null;
  arpeggio: boolean; // current mode

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

  // Sequencer actions
  setBpm: (bpm: number) => void;
  selectPattern: (idx: number) => void;
  toggleSequencer: () => void;
  setStep: (idx: number, step: Partial<SeqStep>) => void;
  randomizeSteps: () => void;
  setStepActive: (idx: number, active: boolean) => void;
}

let seqTimer: ReturnType<typeof setInterval> | null = null;

function advanceSequencer(get: () => HarmonicStore, setFn: (partial: Partial<HarmonicStore>) => void): void {
  const state = get();
  if (!state.isSequencing || !state.isPlaying) return;

  const step = state.steps[state.currentStep];
  if (step && step.active) {
    // Get frequency — either from harmonic index or fixed note
    const freq = stepFreq(step, state.fundamental, state.arpeggio);
    if (freq) {
      applyParams(state);
      triggerNote(freq, 0.12 + Math.random() * 0.06, state.waveform, step.vel);
    }
    if (step.perc) {
      triggerNoise(0.04, step.vel * 0.6);
    }
  }

  const next = (state.currentStep + 1) % state.steps.length;
  setFn({ currentStep: next });
}

const NOTE_LABELS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export { stepFreq, NOTE_FREQUENCIES, NOTE_LABELS };

export const useHarmonicStore = create<HarmonicStore>((set, get) => ({
  ...createDefaultHarmonicState(),
  touch: { x: 0, y: 0, active: false, force: 0.5, count: 0 },
  drawerOpen: false,
  selectedPreset: 'sub',
  noteGates: Array(16).fill(true),

  // Sequencer state
  bpm: PATTERN_HARMONIC_UP.bpm,
  currentStep: 0,
  isSequencing: false,
  selectedPatternIdx: 1, // start with harmonic-up
  steps: [...PATTERN_HARMONIC_UP.steps],
  patterns: DEFAULT_PATTERNS,
  seqTimer: null,
  arpeggio: PATTERN_HARMONIC_UP.arpeggio,

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

  setDetune: (cents: number) => { set({ detune: cents }); applyParams(get()); },
  setFilter: (freq: number, q: number) => { set({ filterFreq: freq, filterQ: q }); applyParams(get()); },
  setFilterType: (t: BiquadFilterType) => { set({ filterType: t }); applyParams(get()); },
  setMasterGain: (gain: number) => { set({ masterGain: gain }); applyParams(get()); },

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
      if (state.isSequencing) {
        if (seqTimer) clearInterval(seqTimer);
        seqTimer = null;
        set({ isSequencing: false, currentStep: 0, seqTimer: null });
      }
      set({ isPlaying: false });
    }
  },

  trigger: (note: string) => {
    const freq = NOTE_FREQUENCIES[note];
    if (freq) { const state = get(); applyParams(state); triggerNote(freq, 0.3, state.waveform); }
  },

  triggerFreq: (freq: number, vel: number = 0.5) => {
    const state = get(); applyParams(state);
    triggerNote(freq, 0.15 + Math.random() * 0.2, state.waveform, vel);
  },

  triggerPerc: (vel: number = 0.5) => { applyParams(get()); triggerNoise(0.06, vel); },

  randomizeOvertones: () => {
    const newGains = Array.from({ length: 16 }, () => Math.random() * 0.8 + 0.1);
    set({ overtoneGains: newGains }); applyParams(get());
  },

  resetOvertones: () => { const d = createDefaultHarmonicState(); set({ overtoneGains: d.overtoneGains }); applyParams(get()); },

  setPreset: (preset: string) => {
    const gains = OVERTONE_PRESETS[preset];
    if (gains) { set({ overtoneGains: gains, selectedPreset: preset }); applyParams(get()); }
  },

  setReverbMix: (m: number) => { set({ reverbMix: m }); applyParams(get()); },
  setDelayTime: (t: number) => { set({ delayTime: t }); applyParams(get()); },
  setDelayFeedback: (f: number) => { set({ delayFeedback: f }); applyParams(get()); },
  setChorusDepth: (d: number) => { set({ chorusDepth: d }); applyParams(get()); },
  setLfoRate: (r: number) => { set({ lfoRate: r }); applyParams(get()); },
  setLfoDepth: (d: number) => { set({ lfoDepth: d }); applyParams(get()); },
  setDistortionAmount: (a: number) => { set({ distortionAmount: a }); applyParams(get()); },
  setCompressorThreshold: (t: number) => { set({ compressorThreshold: t }); applyParams(get()); },
  setPan: (p: number) => { set({ pan: p }); applyParams(get()); },
  setTouch: (t: Partial<TouchState>) => { set(state => ({ touch: { ...state.touch, ...t } })); },
  setDrawerOpen: (o: boolean) => set({ drawerOpen: o }),
  setNoteGate: (index: number, gated: boolean) => {
    const gates = [...get().noteGates];
    gates[index] = gated;
    set({ noteGates: gates });
  },

  randomizeAll: () => {
    const s = get();
    s.setFundamental(40 + Math.random() * 400);
    s.randomizeOvertones();
    s.setDetune((Math.random() - 0.5) * 80);
    s.setFilter(100 + Math.random() * 4000, 0.5 + Math.random() * 10);
    s.setMasterGain(0.3 + Math.random() * 0.5);
    s.setReverbMix(Math.random() * 0.6);
    s.setDelayTime(0.1 + Math.random() * 0.8);
    s.setDelayFeedback(Math.random() * 0.7);
    s.setChorusDepth(Math.random() * 0.8);
    s.setLfoRate(0.1 + Math.random() * 4);
    s.setLfoDepth(Math.random() * 500);
    s.setDistortionAmount(Math.random() * 0.5);
    s.setPan((Math.random() - 0.5) * 2);
  },

  // ─── Sequencer ───

  setBpm: (bpm: number) => {
    set({ bpm });
    const state = get();
    if (state.isSequencing) {
      if (seqTimer) clearInterval(seqTimer);
      const interval = (60 / state.bpm / 4) * 1000;
      seqTimer = setInterval(() => advanceSequencer(get, set), interval);
      set({ seqTimer: seqTimer as any });
    }
  },

  selectPattern: (idx: number) => {
    const pats = get().patterns;
    if (idx >= 0 && idx < pats.length) {
      const pat = pats[idx]!;
      set({
        selectedPatternIdx: idx,
        steps: [...pat.steps],
        bpm: pat.bpm,
        arpeggio: pat.arpeggio,
        currentStep: 0,
      });
    }
  },

  toggleSequencer: () => {
    const state = get();
    if (!state.isSequencing) {
      if (!state.isPlaying) { state.togglePlayback(); }
      set({ currentStep: 0, isSequencing: true });
      const interval = (60 / state.bpm / 4) * 1000;
      if (seqTimer) clearInterval(seqTimer);
      seqTimer = setInterval(() => advanceSequencer(get, set), interval);
      set({ seqTimer: seqTimer as any });
    } else {
      if (seqTimer) clearInterval(seqTimer);
      seqTimer = null;
      set({ isSequencing: false, currentStep: 0, seqTimer: null });
    }
  },

  setStep: (idx: number, partial: Partial<SeqStep>) => {
    const steps = [...get().steps];
    if (idx >= 0 && idx < steps.length) {
      steps[idx] = { ...steps[idx]!, ...partial };
      set({ steps });
    }
  },

  setStepActive: (idx: number, active: boolean) => {
    const steps = [...get().steps];
    if (idx >= 0 && idx < steps.length) {
      steps[idx] = { ...steps[idx]!, active };
      set({ steps });
    }
  },

  randomizeSteps: () => {
    const { arpeggio } = get();
    let steps: SeqStep[];
    if (arpeggio) {
      // Randomize harmonic indices
      steps = Array.from({ length: 16 }, () => ({
        note: null,
        harmonic: Math.random() > 0.3 ? Math.floor(1 + Math.random() * 12) : null,
        perc: Math.random() > 0.7,
        vel: 0.3 + Math.random() * 0.7,
        active: Math.random() > 0.15,
      }));
    } else {
      const notes = ['C2','D2','E2','F2','G2','A2','B2','C3','D3','E3','F3','G3','A3','B3','C4','D4','E4'];
      steps = Array.from({ length: 16 }, () => ({
        note: Math.random() > 0.4 ? notes[Math.floor(Math.random() * notes.length)]! : null,
        harmonic: null,
        perc: Math.random() > 0.6,
        vel: 0.3 + Math.random() * 0.7,
        active: Math.random() > 0.2,
      }));
    }
    set({ steps, currentStep: 0 });
  },
}));
