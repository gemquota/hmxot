import { create } from 'zustand';
import {
  type VoiceConfig,
  defaultVoices,
  createVoice,
  destroyAllVoices,
  updateVoice,
  setVoiceHarmonicGains,
  triggerNoiseToVoice,
  setMasterGain,
  setReverbMix,
  setDelayParams,
  OVERTONE_PRESETS,
  getAudioContext,
} from '../audio/harmonicEngine';

export interface SequencerStep {
  harmonic: number | null; // which harmonic to emphasize (1-8), null = no change
  perc: boolean;           // trigger percussion
  vel: number;
  active: boolean;
}

export interface Track {
  voiceId: string;
  steps: SequencerStep[];
  mute: boolean;
  solo: boolean;
  color: string;
}

interface HarmonicStore {
  // Engine
  voices: VoiceConfig[];
  masterGain: number;
  reverbMix: number;
  delayTime: number;
  delayFeedback: number;
  isPlaying: boolean;

  // Sequencer
  bpm: number;
  currentStep: number;
  isSequencing: boolean;
  tracks: Track[];
  seqTimer: ReturnType<typeof setInterval> | null;
  selectedTrackIdx: number;

  // UI
  drawerOpen: boolean;
  showMixer: boolean;
  editTrackIdx: number | null;

  // Actions
  init: () => void;
  togglePlayback: () => void;
  toggleSequencer: () => void;
  setBpm: (bpm: number) => void;
  setMasterGain: (v: number) => void;
  setReverbMix: (v: number) => void;
  setDelayTime: (v: number) => void;
  setDelayFeedback: (v: number) => void;
  updateVoice: (id: string, partial: Partial<VoiceConfig>) => void;
  setVoicePreset: (id: string, preset: string) => void;
  setTrackStep: (trackIdx: number, stepIdx: number, partial: Partial<SequencerStep>) => void;
  randomizeTrack: (trackIdx: number) => void;
  setDrawerOpen: (o: boolean) => void;
  setShowMixer: (o: boolean) => void;
  setEditTrackIdx: (idx: number | null) => void;
  randomizeAll: () => void;
  setFundamental: (id: string, freq: number) => void;
}

// ─── Demo patterns per voice ───

function makeS(h: number | null, perc = false, vel = 0.7, active = true): SequencerStep {
  return { harmonic: h, perc, vel, active };
}
function R(): SequencerStep { return makeS(null, false, 0); }
function K(vel = 0.6): SequencerStep { return makeS(null, true, vel); }
function H(h: number, vel = 0.7): SequencerStep { return makeS(h, false, vel); }
function HK(h: number, vel = 0.7): SequencerStep { return makeS(h, true, vel); }

function bassPattern(): SequencerStep[] {
  const s: SequencerStep[] = [];
  const pattern = [1,0,2,0,1,0,3,0, 1,0,2,0,3,0,2,1, 1,0,4,0,3,0,2,0, 1,0,3,0,2,0,1,0];
  for (let i = 0; i < pattern.length; i++) {
    const h = pattern[i]!;
    if (h === 0) s.push(i % 4 === 0 ? K(0.5) : R());
    else s.push(HK(h, 0.8));
  }
  return s;
}

function leadPattern(): SequencerStep[] {
  const s: SequencerStep[] = [];
  const pattern = [0,5,0,6, 5,0,7,0, 0,5,0,6, 8,7,6,5, 0,4,0,6, 5,0,7,0, 0,5,0,4, 3,2,1,0];
  for (let i = 0; i < pattern.length; i++) {
    const h = pattern[i]!;
    if (h === 0) s.push(i % 8 === 4 ? K(0.4) : R());
    else s.push(H(h, 0.6));
  }
  return s;
}

function padPattern(): SequencerStep[] {
  const s: SequencerStep[] = [];
  const pattern = [1,0,0,0, 3,0,0,0, 5,0,0,0, 3,0,0,0, 1,0,0,0, 4,0,0,0, 6,0,0,0, 4,0,0,0];
  for (const h of pattern) {
    if (h === 0) s.push(R());
    else s.push(H(h, 0.5));
  }
  return s;
}

function drumPattern(): SequencerStep[] {
  const s: SequencerStep[] = [];
  for (let i = 0; i < 32; i++) {
    const kick = i % 4 === 0;
    const snare = i % 8 === 4;
    const hat = i % 2 === 0;
    if (kick) s.push(HK(1, 0.9));
    else if (snare) s.push(K(0.7));
    else if (hat) s.push(K(0.3));
    else s.push(R());
  }
  return s;
}

const COLORS = ['#06b6d4', '#a855f7', '#f43f5e', '#f59e0b'];

function buildDemoTracks(): Track[] {
  return [
    { voiceId: 'bass', steps: bassPattern(), mute: false, solo: false, color: COLORS[0]! },
    { voiceId: 'lead', steps: leadPattern(), mute: false, solo: false, color: COLORS[1]! },
    { voiceId: 'pad', steps: padPattern(), mute: false, solo: false, color: COLORS[2]! },
    { voiceId: 'drum', steps: drumPattern(), mute: false, solo: false, color: COLORS[3]! },
  ];
}



let seqTimer: ReturnType<typeof setInterval> | null = null;

function advanceSequencer(get: () => HarmonicStore, set: (p: Partial<HarmonicStore>) => void): void {
  const state = get();
  if (!state.isSequencing || !state.isPlaying) return;

  const step = state.currentStep;
  const anySolo = state.tracks.some(t => t.solo);

  for (const track of state.tracks) {
    if (track.mute || (anySolo && !track.solo)) continue;
    const s = track.steps[step % track.steps.length];
    if (!s?.active) continue;

    if (s.harmonic !== null) {
      // Emphasize this harmonic for this voice
      const gains = new Array(8).fill(0.02);
      gains[s.harmonic - 1] = 1.0;
      if (s.harmonic > 1) gains[s.harmonic - 2] = 0.3;
      if (s.harmonic < 8) gains[s.harmonic] = 0.3;
      setVoiceHarmonicGains(track.voiceId, gains);
    }
    if (s.perc) {
      triggerNoiseToVoice(track.voiceId, 0.04, s.vel);
    }
  }

  set({ currentStep: (step + 1) % 32 });
}

export const useHarmonicStore = create<HarmonicStore>((set, get) => ({
  voices: defaultVoices(),
  masterGain: 0.7,
  reverbMix: 0.25,
  delayTime: 0.3,
  delayFeedback: 0.25,
  isPlaying: false,

  bpm: 110,
  currentStep: 0,
  isSequencing: false,
  tracks: buildDemoTracks(),
  seqTimer: null,
  selectedTrackIdx: 0,

  drawerOpen: false,
  showMixer: false,
  editTrackIdx: null,

  init: () => {
    const ac = getAudioContext();
    if (ac.state === 'suspended') ac.resume();
    // Create all voices
    destroyAllVoices();
    const voiceCfgs = defaultVoices();
    set({ voices: voiceCfgs });
    voiceCfgs.forEach(v => createVoice(v));
    set({ isPlaying: true });
  },

  togglePlayback: () => {
    const state = get();
    if (!state.isPlaying) {
      state.init();
    } else {
      destroyAllVoices();
      if (seqTimer) { clearInterval(seqTimer); seqTimer = null; }
      set({ isPlaying: false, isSequencing: false, currentStep: 0, seqTimer: null });
    }
  },

  toggleSequencer: () => {
    const state = get();
    if (!state.isSequencing) {
      if (!state.isPlaying) state.init();
      set({ currentStep: 0, isSequencing: true });
      if (seqTimer) clearInterval(seqTimer);
      seqTimer = setInterval(() => advanceSequencer(get, set), (60 / state.bpm / 4) * 1000);
      set({ seqTimer: seqTimer as any });
    } else {
      if (seqTimer) { clearInterval(seqTimer); seqTimer = null; }
      set({ isSequencing: false, currentStep: 0, seqTimer: null });
    }
  },

  setBpm: (bpm) => {
    set({ bpm });
    const state = get();
    if (state.isSequencing) {
      if (seqTimer) clearInterval(seqTimer);
      seqTimer = setInterval(() => advanceSequencer(get, set), (60 / bpm / 4) * 1000);
      set({ seqTimer: seqTimer as any });
    }
  },

  setMasterGain: (v) => { set({ masterGain: v }); setMasterGain(v); },
  setReverbMix: (v) => { set({ reverbMix: v }); setReverbMix(v); },
  setDelayTime: (v) => { set({ delayTime: v }); setDelayParams(v, get().delayFeedback); },
  setDelayFeedback: (v) => { set({ delayFeedback: v }); setDelayParams(get().delayTime, v); },

  updateVoice: (id, partial) => {
    const voices = get().voices.map(v => v.id === id ? { ...v, ...partial } : v);
    set({ voices });
    updateVoice(id, partial);
  },

  setVoicePreset: (id, preset) => {
    const gains = OVERTONE_PRESETS[preset];
    if (!gains) return;
    const voices = get().voices.map(v => v.id === id ? { ...v, overtoneGains: [...gains] } : v);
    set({ voices });
    setVoiceHarmonicGains(id, gains);
  },

  setTrackStep: (trackIdx, stepIdx, partial) => {
    const tracks = [...get().tracks];
    if (trackIdx >= 0 && trackIdx < tracks.length) {
      const steps = [...tracks[trackIdx]!.steps];
      if (stepIdx >= 0 && stepIdx < steps.length) {
        steps[stepIdx] = { ...steps[stepIdx]!, ...partial };
        tracks[trackIdx] = { ...tracks[trackIdx]!, steps };
        set({ tracks });
      }
    }
  },

  randomizeTrack: (trackIdx) => {
    const tracks = [...get().tracks];
    if (trackIdx < 0 || trackIdx >= tracks.length) return;
    const steps = Array.from({ length: 32 }, () => ({
      harmonic: Math.random() > 0.4 ? Math.floor(1 + Math.random() * 8) : null,
      perc: Math.random() > 0.7,
      vel: 0.3 + Math.random() * 0.7,
      active: Math.random() > 0.2,
    }));
    tracks[trackIdx] = { ...tracks[trackIdx]!, steps };
    set({ tracks });
  },

  setDrawerOpen: (o) => set({ drawerOpen: o }),
  setShowMixer: (o) => set({ showMixer: o }),
  setEditTrackIdx: (idx) => set({ editTrackIdx: idx }),

  randomizeAll: () => {
    get().voices.forEach(v => {
      const idx = Math.floor(Math.random() * Object.keys(OVERTONE_PRESETS).length);
      const preset = Object.keys(OVERTONE_PRESETS)[idx]!;
      get().setVoicePreset(v.id, preset);
    });
    get().tracks.forEach((_, i) => get().randomizeTrack(i));
  },

  setFundamental: (id, freq) => {
    get().updateVoice(id, { fundamental: freq });
  },
}));
