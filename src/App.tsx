import { useEffect } from 'react';
import { useStore } from './store/harmonicStore';
import { OVERTONE_PRESETS } from './audio/harmonicEngine';

function App() {
  const s = useStore();

  useEffect(() => {
    const go = () => { if (!s.isPlaying) { s.init(); s.toggleSeq(); } };
    document.addEventListener('touchstart', go, { once: true });
    document.addEventListener('mousedown', go, { once: true });
  }, []); // eslint-disable-line

  const step = s.steps[s.currentStep];
  const presetNames = Object.keys(OVERTONE_PRESETS);

  return (
    <div className="h-dvh bg-[#0a0a0f] overflow-hidden touch-none select-none flex flex-col text-white">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 py-2 shrink-0">
        <h1 className="text-sm font-bold text-white/60" style={{ textShadow: '0 0 8px #a855f7' }}>HMXOT</h1>
        <span className="text-[7px] text-white/20 font-mono">HARMONIC OVERTONES</span>
        <div className="flex-1" />
        <span className={`w-1.5 h-1.5 rounded-full ${s.isPlaying ? 'bg-green-500 animate-pulse' : 'bg-white/20'}`} />
        <span className="text-[8px] font-mono text-white/30">{s.isSequencing ? `BPM ${s.bpm}` : s.isPlaying ? 'LIVE' : 'STOP'}</span>
      </div>

      {/* ── Step grid ── */}
      <div className="flex-1 overflow-y-auto px-3 py-1">
        <div className="grid grid-cols-8 gap-1.5 mb-3">
          {s.steps.map((step, i) => {
            const isCur = i === s.currentStep;
            const label = !step.active ? '·' : step.perc ? '✕' : step.h ? `H${step.h}` : '·';
            return (
              <button key={i} onClick={() => s.toggleStep(i)}
                className={`aspect-square rounded-xl text-[9px] font-mono flex items-center justify-center
                  transition-all active:scale-90 touch-manipulation font-medium
                  ${isCur ? 'ring-2 ring-white ring-offset-2 ring-offset-black/60 scale-110 z-10' : ''}
                  ${!step.active ? 'bg-white/[0.04] text-white/20' : step.perc ? 'bg-amber-600/50 text-white' : 'bg-purple-600/40 text-white/90'}`}>
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Harmonic indicator ── */}
        <div className="text-center mb-3">
          <div className="text-[10px] font-mono text-purple-300/60">
            {step?.active && step.h ? `H${step.h} · ${(s.fundamental * step.h).toFixed(0)} Hz` : '—'}
          </div>
        </div>

        {/* ── Controls ── */}
        <div className="space-y-2.5 pb-2">
          {/* Waveform */}
          <div className="grid grid-cols-4 gap-1.5">
            {(['triangle', 'sawtooth', 'sine', 'square'] as const).map(w => (
              <button key={w} onClick={() => s.setWaveform(w)}
                className={`py-2.5 rounded-xl text-[9px] font-medium transition-all active:scale-95 ${
                  s.waveform === w ? 'bg-purple-500 text-white' : 'bg-white/[0.06] active:bg-white/20'
                }`}>{w}</button>
            ))}
          </div>

          {/* Presets */}
          <div className="grid grid-cols-4 gap-1.5">
            {presetNames.slice(0, 4).map(p => (
              <button key={p} onClick={() => s.setPreset(p)}
                className={`py-2 rounded-xl text-[8px] font-medium capitalize transition-all active:scale-95 ${
                  s.preset === p ? 'bg-cyan-600/50 text-white' : 'bg-white/[0.06] active:bg-white/20'
                }`}>{p}</button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {presetNames.slice(4).map(p => (
              <button key={p} onClick={() => s.setPreset(p)}
                className={`py-2 rounded-xl text-[8px] font-medium capitalize transition-all active:scale-95 ${
                  s.preset === p ? 'bg-cyan-600/50 text-white' : 'bg-white/[0.06] active:bg-white/20'
                }`}>{p}</button>
            ))}
          </div>

          {/* Sliders */}
          <Slider label="Freq" value={s.fundamental} min={30} max={400} step={1}
            onChange={(v) => s.setFundamental(v)} fmt={(v) => `${v.toFixed(0)} Hz`} color="purple" />
          <Slider label="Filter" value={s.filterFreq} min={50} max={8000} step={1}
            onChange={(v) => s.setFilter(v, s.filterQ)} fmt={(v) => v > 1000 ? `${(v/1000).toFixed(1)}k` : v.toFixed(0)} color="cyan" />
          <Slider label="Resonance" value={s.filterQ} min={0.1} max={10} step={0.1}
            onChange={(v) => s.setFilter(s.filterFreq, v)} fmt={(v) => `Q ${v.toFixed(1)}`} color="rose" />
          <Slider label="Reverb" value={s.reverb} min={0} max={1} step={0.01}
            onChange={(v) => s.setReverb(v)} fmt={(v) => `${(v*100).toFixed(0)}%`} color="purple" />
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="shrink-0 px-3 pb-3 pt-1">
        <div className="flex items-center gap-2 bg-black/70 backdrop-blur-xl rounded-2xl border border-white/[0.06] px-3 py-2.5">
          <button onClick={s.togglePlay}
            className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold transition-all active:scale-90 ${
              s.isPlaying ? 'bg-rose-600' : 'bg-purple-600'
            }`}>{s.isPlaying ? '■' : '▶'}</button>

          <button onClick={s.toggleSeq}
            className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold transition-all active:scale-90 ${
              s.isSequencing ? 'bg-emerald-600' : 'bg-white/10 active:bg-white/20'
            }`}>{s.isSequencing ? '⏹' : '🔀'}</button>

          <div className="flex items-center gap-1">
            <button onClick={() => s.setBpm(s.bpm - 5)}
              className="w-9 h-9 rounded-lg bg-white/5 active:bg-white/20 text-sm flex items-center justify-center">−</button>
            <span className="text-xs font-mono text-white/50 w-12 text-center">{s.bpm}</span>
            <button onClick={() => s.setBpm(s.bpm + 5)}
              className="w-9 h-9 rounded-lg bg-white/5 active:bg-white/20 text-sm flex items-center justify-center">+</button>
          </div>

          <div className="flex-1" />

          <button onClick={s.randomize}
            className="w-12 h-12 rounded-xl bg-cyan-500/20 active:bg-cyan-500/40 flex items-center justify-center text-base active:scale-90">
            🎲
          </button>
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, fmt }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; fmt: (v: number) => string; color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[8px] text-white/40 font-mono uppercase tracking-wider">{label}</span>
        <span className="text-[8px] text-white/50 font-mono">{fmt(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 appearance-none bg-white/[0.08] rounded-full cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:rounded-full" />
    </div>
  );
}

export default App;
