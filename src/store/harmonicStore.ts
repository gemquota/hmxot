import { create } from 'zustand';
import {
  initAudio, createOscillators, destroyOscillators,
  setGains, setFundamental, setFilter, setMaster, setReverb, setDelay,
  triggerPerc, OVERTONE_PRESETS,
} from '../audio/harmonicEngine';

export interface Step {
  h: number | null; // harmonic 1-16 to emphasize, null = no change
  perc: boolean;
  vel: number;
  active: boolean;
}

function S(h: number | null, perc = false, vel = 0.7, active = true): Step {
  return { h, perc, vel, active };
}
function R(): Step { return S(null, false, 0); }
function K(vel = 0.6): Step { return S(null, true, vel); }
function HK(h: number, vel = 0.7): Step { return S(h, true, vel); }

// ─── Demo pattern: simple harmonic walk + 4-on-floor ───
function buildPattern(): Step[] {
  const steps: Step[] = [];
  // Walk through harmonics with kicks and snares
  const walk = [1,0,2,0,1,0,3,0, 2,0,3,0,2,0,4,0,
                3,0,4,0,3,0,5,0, 4,0,5,0,4,0,6,0,
                5,0,6,0,5,0,7,0, 6,0,7,0,6,0,8,0,
                7,0,8,0,7,6,5,4, 3,2,1,0,2,3,1,0];
  for (let i = 0; i < walk.length; i++) {
    const h = walk[i]!;
    const kick = i % 4 === 0;
    const snare = i % 8 === 4;
    const hat = !kick && !snare && i % 2 === 0;
    if (h === 0) {
      if (kick) steps.push(K(0.7));
      else if (snare) steps.push(K(0.6));
      else if (hat) steps.push(K(0.2));
      else steps.push(R());
    } else {
      steps.push(HK(h, kick ? 0.85 : snare ? 0.65 : 0.5));
    }
  }
  return steps;
}

interface Store {
  fundamental: number;
  waveform: 'triangle' | 'sawtooth' | 'sine' | 'square';
  preset: string;
  master: number;
  filterFreq: number;
  filterQ: number;
  reverb: number;
  delayTime: number;
  delayFeedback: number;

  isPlaying: boolean;
  bpm: number;
  isSequencing: boolean;
  currentStep: number;
  steps: Step[];
  seqTimer: ReturnType<typeof setInterval> | null;

  init: () => void;
  togglePlay: () => void;
  toggleSeq: () => void;
  setBpm: (b: number) => void;
  setFundamental: (f: number) => void;
  setWaveform: (w: 'triangle' | 'sawtooth' | 'sine' | 'square') => void;
  setPreset: (p: string) => void;
  setMaster: (v: number) => void;
  setFilter: (f: number, q: number) => void;
  setReverb: (v: number) => void;
  setDelay: (t: number, f: number) => void;
  toggleStep: (i: number) => void;
  randomize: () => void;
}

let seqTimer: ReturnType<typeof setInterval> | null = null;

function advance(get: () => Store, set: (p: Partial<Store>) => void): void {
  const s = get();
  if (!s.isSequencing || !s.isPlaying) return;

  const step = s.steps[s.currentStep];
  if (step?.active) {
    if (step.h !== null) {
      const gains = new Array(16).fill(0.02);
      gains[step.h - 1] = 1.0;
      if (step.h > 1) gains[step.h - 2] = 0.35;
      if (step.h < 16) gains[step.h] = 0.35;
      setGains(gains);
    }
    if (step.perc) triggerPerc(step.vel);
  }

  set({ currentStep: (s.currentStep + 1) % s.steps.length });
}

export const useStore = create<Store>((set, get) => ({
  fundamental: 55,
  waveform: 'triangle',
  preset: 'bass',
  master: 0.6,
  filterFreq: 2000,
  filterQ: 1,
  reverb: 0.25,
  delayTime: 0.3,
  delayFeedback: 0.25,

  isPlaying: false,
  bpm: 110,
  isSequencing: false,
  currentStep: 0,
  steps: buildPattern(),
  seqTimer: null,

  init: () => {
    const ac = initAudio();
    if (ac.state === 'suspended') ac.resume();
    const s = get();
    createOscillators(s.fundamental, s.waveform, OVERTONE_PRESETS[s.preset] ?? OVERTONE_PRESETS.bass);
    setFilter(s.filterFreq, s.filterQ);
    setMaster(s.master);
    setReverb(s.reverb);
    setDelay(s.delayTime, s.delayFeedback);
    set({ isPlaying: true });
  },

  togglePlay: () => {
    const s = get();
    if (!s.isPlaying) {
      s.init();
    } else {
      destroyOscillators();
      if (seqTimer) { clearInterval(seqTimer); seqTimer = null; }
      set({ isPlaying: false, isSequencing: false, currentStep: 0, seqTimer: null });
    }
  },

  toggleSeq: () => {
    const s = get();
    if (!s.isSequencing) {
      if (!s.isPlaying) s.init();
      set({ currentStep: 0, isSequencing: true });
      if (seqTimer) clearInterval(seqTimer);
      seqTimer = setInterval(() => advance(get, set), (60 / s.bpm / 4) * 1000);
      set({ seqTimer: seqTimer as any });
    } else {
      if (seqTimer) { clearInterval(seqTimer); seqTimer = null; }
      set({ isSequencing: false, currentStep: 0, seqTimer: null });
    }
  },

  setBpm: (b) => {
    set({ bpm: b });
    const s = get();
    if (s.isSequencing) {
      if (seqTimer) clearInterval(seqTimer);
      seqTimer = setInterval(() => advance(get, set), (60 / b / 4) * 1000);
      set({ seqTimer: seqTimer as any });
    }
  },

  setFundamental: (f) => {
    set({ fundamental: f });
    const s = get();
    if (s.isPlaying) setFundamental(f, s.waveform);
  },

  setWaveform: (w) => {
    set({ waveform: w });
    const s = get();
    if (s.isPlaying) setFundamental(s.fundamental, w);
  },

  setPreset: (p) => {
    set({ preset: p });
    const gains = OVERTONE_PRESETS[p];
    if (gains && get().isPlaying) setGains(gains);
  },

  setMaster: (v) => { set({ master: v }); setMaster(v); },
  setFilter: (f, q) => { set({ filterFreq: f, filterQ: q }); setFilter(f, q); },
  setReverb: (v) => { set({ reverb: v }); setReverb(v); },
  setDelay: (t, f) => { set({ delayTime: t, delayFeedback: f }); setDelay(t, f); },

  toggleStep: (i) => {
    const steps = [...get().steps];
    if (i >= 0 && i < steps.length) steps[i] = { ...steps[i]!, active: !steps[i]!.active };
    set({ steps });
  },

  randomize: () => {
    const notes = [1,2,3,4,5,6,7,8];
    const steps = get().steps.map(() => ({
      h: Math.random() > 0.45 ? notes[Math.floor(Math.random() * notes.length)]! : null,
      perc: Math.random() > 0.65,
      vel: 0.3 + Math.random() * 0.7,
      active: Math.random() > 0.15,
    }));
    set({ steps, currentStep: 0 });
  },
}));
