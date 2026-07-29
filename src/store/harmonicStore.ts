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
  // Which harmonic to emphasize (1-16). null = don't change gains.
  activeHarmonic: number | null;
  // How many neighbor harmonics to boost (0 = single, 1 = triad, etc.)
  width: number;
  perc: boolean;
  vel: number;
  active: boolean;
}

export interface Pattern {
  name: string;
  steps: SeqStep[];
  bpm: number;
}

// ─── Helpers ───
function S(harmonic: number | null, width = 0, perc = false, vel = 0.7, active = true): SeqStep {
  return { activeHarmonic: harmonic, width, perc, vel, active };
}
function R(): SeqStep { return S(null, 0, false, 0); }
function K(vel = 0.7): SeqStep { return S(null, 0, true, vel); }
function HK(h: number, width = 0, vel = 0.7): SeqStep { return S(h, width, true, vel); }

// ════════════════════════════════════════════════
// Build a harmonic progression — morphs drone timbre
// Each step emphasizes a harmonic, creating evolving sound
// ════════════════════════════════════════════════
function generate1564Pattern(): Pattern {
  const steps: SeqStep[] = [];
  const bpm = 110;

  // Harmonic progression: walk through the series
  // with rhythmic variation and percussion
  const progression = [
    // Section 1: Establish (H1-H2 region)
    [1, 0, 2, 0, 1, 3, 2, 1],
    // Section 2: Rising (H2-H4)
    [2, 3, 2, 4, 3, 2, 4, 3],
    // Section 3: Expanding (H3-H6)
    [3, 5, 4, 6, 3, 5, 4, 6],
    // Section 4: Peak (H5-H8)
    [5, 7, 6, 8, 5, 8, 7, 6],
    // Section 5: Step down (H8-H5)
    [8, 6, 7, 5, 6, 4, 5, 3],
    // Section 6: Fall (H5-H3)
    [5, 3, 4, 2, 3, 1, 4, 2],
    // Section 7: Building again
    [2, 4, 3, 5, 6, 5, 4, 6],
    // Section 8: Resolution
    [5, 3, 4, 2, 3, 1, 2, 3],
  ];

  let beat = 0;
  for (const section of progression) {
    for (const h of section) {
      const isKick = beat % 4 === 0;
      const isSnare = beat % 8 === 4;
      const isFill = h === 0;

      if (isFill) {
        if (isKick) steps.push(K(0.7));
        else if (isSnare) steps.push(S(null, 0, true, 0.5));
        else steps.push(R());
      } else {
        // Width: 0 for single, 1 for wider
        const w = h >= 5 ? 1 : 0;
        const vel = isKick ? 0.9 : isSnare ? 0.6 : 0.5;
        steps.push(HK(h, w, vel));
      }
      beat++;
    }
  }

  return { name: '1564', bpm, steps };
}

// ─── Static patterns ───

function buildPatterns(): Pattern[] {
  return [generate1564Pattern()];
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
  setStepActive: (idx: number, active: boolean) => void;
  randomizeSteps: () => void;
}

let seqTimer: ReturnType<typeof setInterval> | null = null;

// ─── Advance sequencer — morphs drone gains instead of triggering notes ───
function advanceSequencer(get: () => HarmonicStore, setFn: (partial: Partial<HarmonicStore>) => void): void {
  const state = get();
  if (!state.isSequencing || !state.isPlaying) return;

  const step = state.steps[state.currentStep];
  if (step && step.active) {
    if (step.activeHarmonic !== null) {
      // Morph drone: emphasize the active harmonic
      const h = step.activeHarmonic - 1;
      const newGains = new Array(16).fill(0.02);
      newGains[h] = 1.0;
      // Boost neighbors based on width
      if (step.width >= 1) {
        if (h > 0) newGains[h - 1] = 0.4;
        if (h < 15) newGains[h + 1] = 0.4;
      }
      if (step.width >= 2) {
        if (h > 1) newGains[h - 2] = 0.2;
        if (h < 14) newGains[h + 2] = 0.2;
      }
      setFn({ overtoneGains: newGains });
      applyParams(state);
    }
    if (step.perc) {
      triggerNoise(0.04, step.vel * 0.7);
    }
  }

  const next = (state.currentStep + 1) % state.steps.length;
  setFn({ currentStep: next });
}

export { generate1564Pattern };

export const useHarmonicStore = create<HarmonicStore>((set, get) => {
  const initialPatterns = buildPatterns();

  return {
    ...createDefaultHarmonicState(),
    fundamental: 55,
    overtoneGains: [...OVERTONE_PRESETS.sub],
    selectedPreset: 'sub',
    touch: { x: 0, y: 0, active: false, force: 0.5, count: 0 },
    drawerOpen: false,
    noteGates: Array(16).fill(true),

    // Sequencer
    bpm: 110,
    currentStep: 0,
    isSequencing: false,
    selectedPatternIdx: 0,
    steps: [...initialPatterns[0]!.steps],
    patterns: initialPatterns,
    seqTimer: null,

    setFundamental: (freq: number) => { set({ fundamental: freq }); applyParams(get()); },
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
          set({ isSequencing: false, currentStep: 0 });
        }
        set({ isPlaying: false });
      }
    },

    trigger: (note: string) => {
      const freqs: Record<string, number> = {
        'C2':65.41,'D2':73.42,'E2':82.41,'F2':87.31,'G2':98,'A2':110,'B2':123.47,
        'C3':130.81,'D3':146.83,'E3':164.81,'F3':174.61,'G3':196,'A3':220,'B3':246.94,
        'C4':261.63,'D4':293.66,'E4':329.63,'F4':349.23,'G4':392,'A4':440,'B4':493.88,
      };
      const f = freqs[note]; if (f) { applyParams(get()); triggerNote(f, 0.3, get().waveform); }
    },
    triggerFreq: (freq, vel = 0.5) => { applyParams(get()); triggerNote(freq, 0.2, 'triangle', vel); },
    triggerPerc: (vel = 0.5) => { applyParams(get()); triggerNoise(0.06, vel); },

    randomizeOvertones: () => {
      set({ overtoneGains: Array.from({length:16}, () => Math.random() * 0.8 + 0.1) });
      applyParams(get());
    },
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
        set({ selectedPatternIdx: idx, steps: [...pat.steps], bpm: pat.bpm, currentStep: 0 });
      }
    },

    toggleSequencer: () => {
      const state = get();
      if (!state.isSequencing) {
        if (!state.isPlaying) state.togglePlayback();
        set({ currentStep: 0, isSequencing: true, masterGain: 0.4, reverbMix: 0.25 });
        applyParams(get());
        if (seqTimer) clearInterval(seqTimer);
        seqTimer = setInterval(() => advanceSequencer(get, set), (60 / state.bpm / 4) * 1000);
        set({ seqTimer: seqTimer as any });
      } else {
        if (seqTimer) { clearInterval(seqTimer); seqTimer = null; }
        set({ isSequencing: false, currentStep: 0, seqTimer: null });
        const def = createDefaultHarmonicState();
        set({ masterGain: def.masterGain, reverbMix: def.reverbMix, overtoneGains: [...def.overtoneGains] });
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
      const steps: SeqStep[] = Array.from({ length: 16 }, () => ({
        activeHarmonic: Math.random() > 0.3 ? Math.floor(1 + Math.random() * 12) : null,
        width: Math.random() > 0.7 ? 1 : 0,
        perc: Math.random() > 0.6,
        vel: 0.3 + Math.random() * 0.7,
        active: Math.random() > 0.2,
      }));
      set({ steps, currentStep: 0 });
    },
  };
});
