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
  note: string | null;
  harmonic: number | null; // harmonic index 1-16 — always consonant with drone
  customFreq: number | null;
  perc: boolean;
  vel: number;
  active: boolean;
}

export interface Pattern {
  name: string;
  steps: SeqStep[];
  bpm: number;
  arpeggio: boolean; // true = steps use harmonic indices
  generative?: '1564';
}

const NOTE_FREQUENCIES: Record<string, number> = {
  'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
};

// ─── Get frequency from step — only uses harmonics of fundamental ───
function stepFreq(step: SeqStep, fundamental: number): number | null {
  if (step.customFreq !== null) return step.customFreq;
  if (step.harmonic !== null) return fundamental * step.harmonic;
  if (step.note) return NOTE_FREQUENCIES[step.note] || null;
  return null;
}

function makeStep(
  note: string | null = null,
  harmonic: number | null = null,
  customFreq: number | null = null,
  perc = false, vel = 0.7, active = true
): SeqStep {
  return { note, harmonic, customFreq, perc, vel, active };
}
function R(): SeqStep { return makeStep(null, null, null, false, 0); }
function N(note: string, vel = 0.7): SeqStep { return makeStep(note, null, null, false, vel); }
function K(vel = 0.7): SeqStep { return makeStep(null, null, null, true, vel); }
function NK(note: string, vel = 0.7): SeqStep { return makeStep(note, null, null, true, vel); }
function H(harmonic: number, vel = 0.7): SeqStep { return makeStep(null, harmonic, null, false, vel); }
function HK(harmonic: number, vel = 0.7): SeqStep { return makeStep(null, harmonic, null, true, vel); }

// ═══════════════════════════════════════════
// 1564 melodic pattern — ONLY uses harmonics of the fundamental
// Each "phrase" for harmonic Hn plays consonant harmonic intervals:
//   1 = Hn     (tonic — root of this phrase)
//   5 = H(n+2) (fifth-like leap up the series)
//   6 = H(n*2) (octave — pure, ringing)
//   4 = H(n-1) (step down — leading back)
// Every note is a harmonic of the root → always consonant with drone
// ═══════════════════════════════════════════
function generate1564Pattern(fundamental: number): Pattern {
  const steps: SeqStep[] = [];

  // I-VI-V-IV for each harmonic H1-H8
  // I = tonic, VI = major 6th, V = perfect 5th, IV = perfect 4th
  // Frequencies are equal temperament — drone is silenced during sequencing
  for (let hi = 1; hi <= 8; hi++) {
    const tonic = fundamental * hi;
    // Scale degrees above tonic in equal temperament
    const vi = tonic * Math.pow(2, 9 / 12);  // major 6th
    const v  = tonic * Math.pow(2, 7 / 12);  // perfect 5th
    const iv = tonic * Math.pow(2, 5 / 12);  // perfect 4th

    // I — tonic (with kick on strong beats)
    steps.push(makeStep(null, hi, tonic, hi === 1 || hi === 5, 0.95));
    // VI — submediant
    steps.push(makeStep(null, null, vi, false, 0.65));
    // V — dominant
    steps.push(makeStep(null, null, v, false, 0.70));
    // IV — subdominant (with kick on even phrases)
    steps.push(makeStep(null, null, iv, hi % 2 === 0, 0.60));
  }

  return {
    name: '1564', bpm: 120, arpeggio: false,
    generative: '1564',
    steps,
  };
}

// ─── Static patterns ───
const PATTERN_TECHNO: Pattern = {
  name: 'techno', arpeggio: false, bpm: 132,
  steps: [
    NK('C2', 1.0), R(), K(0.5), N('E4', 0.4),
    NK('C2', 0.7), R(), NK('G2',0.8), N('D4', 0.4),
    NK('A2', 0.9), R(), K(0.6), N('C4', 0.4),
    NK('F2', 0.7), R(), NK('G2',0.8), N('B3', 0.4),
  ],
};
const PATTERN_AMBIENT: Pattern = {
  name: 'ambient', arpeggio: false, bpm: 86,
  steps: [
    N('C3',0.6), R(), N('G3',0.3), R(),
    N('E3',0.5), R(), N('B3',0.3), N('D4',0.2),
    N('A2',0.5), R(), N('E3',0.4), R(),
    N('F3',0.5), N('G3',0.3), N('A3',0.3), R(),
  ],
};
const PATTERN_HARMONIC_UP: Pattern = {
  name: 'harmonic-up', arpeggio: true, bpm: 110,
  steps: [
    HK(1,1.0), H(2,0.6), H(3,0.7), H(4,0.5),
    HK(1,0.9), H(2,0.5), H(5,0.8), H(6,0.4),
    HK(1,0.8), H(3,0.6), H(5,0.7), H(7,0.5),
    HK(1,0.9), H(2,0.5), H(4,0.6), H(8,0.4),
  ],
};
const PATTERN_HARMONIC_INTERVALS: Pattern = {
  name: 'harmonic-3rds', arpeggio: true, bpm: 96,
  steps: [
    H(1,1.0), H(3,0.5), H(5,0.8), H(3,0.4),
    H(1,0.9), H(4,0.5), H(6,0.7), H(4,0.4),
    H(1,0.8), H(5,0.6), H(7,0.7), H(5,0.5),
    H(1,0.9), H(6,0.5), H(9,0.6), H(6,0.4),
  ],
};
const PATTERN_HARMONIC_SWEEP: Pattern = {
  name: 'harmonic-sweep', arpeggio: true, bpm: 130,
  steps: [
    HK(8,0.6), H(7,0.5), H(6,0.6), H(5,0.5),
    HK(4,0.7), H(3,0.6), H(2,0.7), H(1,0.8),
    HK(8,0.6), H(7,0.5), H(6,0.6), H(5,0.5),
    HK(4,0.7), H(3,0.6), H(2,0.7), H(1,0.9),
  ],
};

function buildPatterns(fundamental: number = 55): Pattern[] {
  return [
    PATTERN_TECHNO,
    PATTERN_HARMONIC_UP,
    PATTERN_HARMONIC_INTERVALS,
    PATTERN_HARMONIC_SWEEP,
    PATTERN_AMBIENT,
    generate1564Pattern(fundamental),
  ];
}

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
  arpeggio: boolean;
  generativeType: string | null;
  // When sequencing, drone is quiet bass + melody is prominent
  seqDroneReduced: boolean;

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

  // Sequencer
  setBpm: (bpm: number) => void;
  selectPattern: (idx: number) => void;
  toggleSequencer: () => void;
  setStep: (idx: number, step: Partial<SeqStep>) => void;
  randomizeSteps: () => void;
  setStepActive: (idx: number, active: boolean) => void;
  load1564: () => void;
}

let seqTimer: ReturnType<typeof setInterval> | null = null;
const MELODY_NOTE_DURATION = 0.28;

function advanceSequencer(get: () => HarmonicStore, setFn: (partial: Partial<HarmonicStore>) => void): void {
  const state = get();
  if (!state.isSequencing || !state.isPlaying) return;

  const step = state.steps[state.currentStep];
  if (step && step.active) {
    const freq = stepFreq(step, state.fundamental);
    if (freq) {
      applyParams(state);
      // Use triangle wave for clear melody, longer duration
      triggerNote(freq, MELODY_NOTE_DURATION, 'triangle', step.vel);
    }
    if (step.perc) {
      triggerNoise(0.04, step.vel * 0.7);
    }
  }

  const next = (state.currentStep + 1) % state.steps.length;
  setFn({ currentStep: next });
}

export { stepFreq, NOTE_FREQUENCIES, generate1564Pattern };

export const useHarmonicStore = create<HarmonicStore>((set, get) => {
  const initialPatterns = buildPatterns();
  const _1564Idx = initialPatterns.length - 1;

  return {
    ...createDefaultHarmonicState(),
    fundamental: 55,
    touch: { x: 0, y: 0, active: false, force: 0.5, count: 0 },
    drawerOpen: false,
    selectedPreset: 'sub',
    noteGates: Array(16).fill(true),

    // Sequencer — start with 1564
    bpm: 120,
    currentStep: 0,
    isSequencing: false,
    selectedPatternIdx: _1564Idx,
    steps: [...initialPatterns[_1564Idx]!.steps],
    patterns: initialPatterns,
    seqTimer: null,
    arpeggio: true,
    generativeType: '1564',
    seqDroneReduced: false,

    setFundamental: (freq: number) => {
      set({ fundamental: freq });
      const state = get();
      // Regenerate generative pattern on root change
      if (state.generativeType === '1564' && state.selectedPatternIdx >= 0) {
        const newSteps = generate1564Pattern(freq).steps;
        set({ steps: newSteps });
      }
      applyParams(state);
    },

    setOvertoneGain: (i, g) => {
      const gains = [...get().overtoneGains];
      gains[i] = Math.max(0, Math.min(1, g));
      set({ overtoneGains: gains }); applyParams(get());
    },
    setWaveform: (w) => { set({ waveform: w }); const s = get(); if (s.isPlaying) { createHarmonicOscillators(s); startPlayback(); applyParams(s); } },
    setDetune: (v) => { set({ detune: v }); applyParams(get()); },
    setFilter: (f, q) => { set({ filterFreq: f, filterQ: q }); applyParams(get()); },
    setFilterType: (t) => { set({ filterType: t }); applyParams(get()); },
    setMasterGain: (v) => { set({ masterGain: v }); applyParams(get()); },

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
          if (seqTimer) clearInterval(seqTimer); seqTimer = null;
          set({ isSequencing: false, currentStep: 0, seqTimer: null, seqDroneReduced: false });
        }
        set({ isPlaying: false });
      }
    },

    trigger: (note: string) => { const f = NOTE_FREQUENCIES[note]; if (f) { applyParams(get()); triggerNote(f, 0.3, get().waveform); } },
    triggerFreq: (freq, vel = 0.5) => { applyParams(get()); triggerNote(freq, 0.2, 'triangle', vel); },
    triggerPerc: (vel = 0.5) => { applyParams(get()); triggerNoise(0.06, vel); },
    randomizeOvertones: () => { set({ overtoneGains: Array.from({length:16}, () => Math.random() * 0.8 + 0.1) }); applyParams(get()); },
    resetOvertones: () => { set({ overtoneGains: createDefaultHarmonicState().overtoneGains }); applyParams(get()); },
    setPreset: (p) => { const g = OVERTONE_PRESETS[p]; if (g) { set({ overtoneGains: g, selectedPreset: p }); applyParams(get()); } },
    setReverbMix: (v) => { set({ reverbMix: v }); applyParams(get()); },
    setDelayTime: (v) => { set({ delayTime: v }); applyParams(get()); },
    setDelayFeedback: (v) => { set({ delayFeedback: v }); applyParams(get()); },
    setChorusDepth: (v) => { set({ chorusDepth: v }); applyParams(get()); },
    setLfoRate: (v) => { set({ lfoRate: v }); applyParams(get()); },
    setLfoDepth: (v) => { set({ lfoDepth: v }); applyParams(get()); },
    setDistortionAmount: (v) => { set({ distortionAmount: v }); applyParams(get()); },
    setCompressorThreshold: (v) => { set({ compressorThreshold: v }); applyParams(get()); },
    setPan: (v) => { set({ pan: v }); applyParams(get()); },
    setTouch: (t) => { set(s => ({ touch: { ...s.touch, ...t } })); },
    setDrawerOpen: (o) => set({ drawerOpen: o }),
    setNoteGate: (i, g) => { const gates = [...get().noteGates]; gates[i] = g; set({ noteGates: gates }); },

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
        seqTimer = setInterval(() => advanceSequencer(get, set), (60 / bpm / 4) * 1000);
        set({ seqTimer: seqTimer as any });
      }
    },

    selectPattern: (idx: number) => {
      const pats = get().patterns;
      if (idx >= 0 && idx < pats.length) {
        const pat = pats[idx]!;
        const isGen = pat.generative === '1564';
        set({
          selectedPatternIdx: idx,
          steps: [...pat.steps],
          bpm: pat.bpm,
          arpeggio: pat.arpeggio,
          generativeType: isGen ? '1564' : null,
          currentStep: 0,
        });
      }
    },

    load1564: () => {
      const pat = generate1564Pattern(get().fundamental);
      set(s => ({
        patterns: [...s.patterns, pat],
        selectedPatternIdx: s.patterns.length,
        steps: [...pat.steps],
        bpm: pat.bpm,
        arpeggio: true,
        generativeType: '1564',
        currentStep: 0,
      }));
    },

    toggleSequencer: () => {
      const state = get();
      if (!state.isSequencing) {
        if (!state.isPlaying) state.togglePlayback();
        // Stop drone oscillators — only melody notes play during sequencing
        stopAllOscillators();
        // Set mix for clean melody
        set({
          currentStep: 0, isSequencing: true,
          masterGain: 0.5,
          filterFreq: 5000,
          reverbMix: 0.2,
          delayFeedback: 0.25,
          delayTime: 0.2,
          seqDroneReduced: true,
        });
        applyParams(get());
        if (seqTimer) clearInterval(seqTimer);
        seqTimer = setInterval(() => advanceSequencer(get, set), (60 / state.bpm / 4) * 1000);
        set({ seqTimer: seqTimer as any });
      } else {
        if (seqTimer) { clearInterval(seqTimer); seqTimer = null; }
        set({ isSequencing: false, currentStep: 0, seqTimer: null, seqDroneReduced: false });
        // Restart drone
        const def = createDefaultHarmonicState();
        set({ masterGain: def.masterGain, filterFreq: def.filterFreq, reverbMix: def.reverbMix });
        createHarmonicOscillators(get());
        startPlayback();
        applyParams(get());
      }
    },

    setStep: (idx, partial) => {
      const steps = [...get().steps];
      if (idx >= 0 && idx < steps.length) { steps[idx] = { ...steps[idx]!, ...partial }; set({ steps }); }
    },
    setStepActive: (idx, active) => {
      const steps = [...get().steps];
      if (idx >= 0 && idx < steps.length) { steps[idx] = { ...steps[idx]!, active }; set({ steps }); }
    },

    randomizeSteps: () => {
      const { arpeggio } = get();
      const steps: SeqStep[] = Array.from({ length: 16 }, () => {
        if (arpeggio) {
          return { note: null, harmonic: Math.random() > 0.3 ? Math.floor(1 + Math.random() * 12) : null, customFreq: null, perc: Math.random() > 0.7, vel: 0.3 + Math.random() * 0.7, active: Math.random() > 0.15 };
        }
        const notes = ['C2','D2','E2','F2','G2','A2','B2','C3','D3','E3','F3','G3','A3','B3','C4','D4','E4'];
        return { note: Math.random() > 0.4 ? notes[Math.floor(Math.random() * notes.length)]! : null, harmonic: null, customFreq: null, perc: Math.random() > 0.6, vel: 0.3 + Math.random() * 0.7, active: Math.random() > 0.2 };
      });
      set({ steps, currentStep: 0 });
    },
  };
});
