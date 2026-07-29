import { useHarmonicStore } from '../store/harmonicStore';
import { WAVEFORM_PRESETS, FILTER_TYPES, OVERTONE_PRESETS } from '../audio/harmonicEngine';

const PRESETS = Object.keys(OVERTONE_PRESETS);

function Slider({ label, value, min, max, step, onChange, format }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="mb-1.5">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[8px] text-white/40 font-medium tracking-wider uppercase">{label}</span>
        <span className="text-[8px] text-white/50 font-mono">{format ? format(value) : value.toFixed(2)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 appearance-none bg-white/[0.08] rounded-full cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-400
          [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-purple-500/50" />
    </div>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="border-b border-white/[0.04] last:border-b-0">
      <summary className="text-[9px] font-semibold text-purple-300 uppercase tracking-wider px-4 py-2.5 cursor-pointer
        hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors select-none">
        {title}
      </summary>
      <div className="px-4 pb-3">{children}</div>
    </details>
  );
}

export function OvertoneControls() {
  const store = useHarmonicStore();

  return (
    <div className="h-full flex flex-col overflow-hidden bg-black/80 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] shrink-0">
        <button onClick={store.togglePlayback}
          className={`px-5 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 ${
            store.isPlaying
              ? 'bg-rose-600 shadow-lg shadow-rose-500/40'
              : 'bg-purple-600 shadow-lg shadow-purple-500/40'
          }`}>
          {store.isPlaying ? '■' : '▶'}
        </button>

        <button onClick={store.toggleSequencer}
          className={`px-4 py-2 rounded-xl font-bold text-[9px] transition-all active:scale-95 ${
            store.isSequencing
              ? 'bg-emerald-600 shadow-lg shadow-emerald-500/40'
              : 'bg-white/10 active:bg-white/20'
          }`}>
          {store.isSequencing ? '⏹ SEQ' : '🔀 SEQ'}
        </button>

        <div className="flex-1" />

        <button onClick={store.randomizeAll}
          className="px-3 py-2 rounded-xl bg-cyan-500/20 active:bg-cyan-500/40 text-[9px] font-medium active:scale-95">
          🎲 RND
        </button>

        <button onClick={() => store.setDrawerOpen(false)}
          className="px-3 py-2 rounded-xl bg-white/10 active:bg-white/20 text-[9px] font-medium active:scale-95">
          ✕
        </button>
      </div>

      {/* Scrollable controls */}
      <div className="flex-1 overflow-y-auto">

        {/* ═══ SEQUENCER ═══ */}
        <Section title="Sequencer / Arpeggio">
          {/* Pattern selector */}
          <div className="flex flex-wrap gap-1 mb-2">
            {store.patterns.map((p, i) => (
              <button key={p.name} onClick={() => store.selectPattern(i)}
                className={`px-2 py-1.5 rounded-lg text-[8px] font-medium transition-all active:scale-95 capitalize ${
                  store.selectedPatternIdx === i
                    ? 'bg-emerald-600/60 text-white'
                    : 'bg-white/5 active:bg-white/20'
                }`}>
                {p.name}
                {p.arpeggio && <span className="ml-1 opacity-60">🌀</span>}
              </button>
            ))}
            <button onClick={store.randomizeSteps}
              className="px-2 py-1.5 rounded-lg bg-cyan-500/20 active:bg-cyan-500/40 text-[8px] font-medium active:scale-95">
              🎲
            </button>
          </div>

          {/* Mode indicator */}
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`text-[8px] font-mono px-2 py-0.5 rounded-full ${
              store.arpeggio
                ? 'bg-purple-600/40 text-purple-300'
                : 'bg-cyan-600/40 text-cyan-300'
            }`}>
              {store.arpeggio ? '🌀 HARMONIC' : '♩ FIXED NOTES'}
            </div>
            <div className="text-[8px] text-white/30 font-mono">
              Root: <span className="text-purple-300">{store.fundamental.toFixed(0)} Hz</span>
            </div>
          </div>

          {/* BPM + Fundamental linked */}
          <Slider label="BPM" value={store.bpm} min={40} max={200} step={1}
            onChange={store.setBpm} format={(v) => `${v.toFixed(0)}`} />

          {store.arpeggio && (
            <div className="mb-1 px-2 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="text-[7px] text-purple-300/60 font-mono mb-1">
                HARMONIC SERIES — changing the root retunes the entire arpeggio
              </div>
              <Slider label="Root Frequency" value={store.fundamental} min={30} max={500} step={1}
                onChange={store.setFundamental} format={(v) => `${v.toFixed(0)} Hz`} />
            </div>
          )}

          {/* Step grid */}
          <div className="text-[8px] text-white/30 mb-1 font-mono">
            Step <span className="text-emerald-400">{store.currentStep}</span>/{store.steps.length - 1}
          </div>
          <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${Math.min(store.steps.length, 16)}, 1fr)` }}>
            {store.steps.map((step, i) => {
              const isCurrent = i === store.currentStep;
              const hasNote = step.note !== null || step.harmonic !== null;
              const hasPerc = step.perc;
              // Show label: harmonic index or note name
              let label = '·';
              if (step.active && hasNote) {
                if (store.arpeggio && step.harmonic !== null) {
                  label = `H${step.harmonic}`;
                } else if (step.note) {
                  label = step.note.replace(/\d/, '');
                }
              }
              return (
                <button key={i} onClick={() => store.setStepActive(i, !step.active)}
                  className={`aspect-square rounded-md text-[6px] font-mono flex flex-col items-center justify-center
                    transition-all active:scale-90 ${
                    isCurrent ? 'ring-1 ring-emerald-400 ring-offset-1 ring-offset-black/50' : ''
                  } ${
                    step.active
                      ? hasNote
                        ? hasPerc
                          ? 'bg-amber-600/60'
                          : store.arpeggio
                            ? 'bg-purple-700/60'
                            : 'bg-emerald-700/60'
                        : hasPerc
                          ? 'bg-amber-800/40'
                          : 'bg-white/8'
                      : 'bg-white/[0.03] opacity-40'
                  }`}>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Harmonic overtone legend */}
          {store.arpeggio && (
            <div className="mt-2 flex flex-wrap gap-1">
              {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map(h => (
                <div key={h}
                  className="text-[6px] font-mono px-1 py-0.5 rounded bg-white/5 text-white/30"
                  title={`${(store.fundamental * h).toFixed(0)} Hz`}>
                  H{h}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ═══ TIMBRE ═══ */}
        <Section title="Timbre / Overtone Presets">
          <div className="grid grid-cols-4 gap-1 mb-2">
            {PRESETS.slice(0, 8).map(p => (
              <button key={p} onClick={() => store.setPreset(p)}
                className={`py-1.5 rounded-lg text-[8px] font-medium transition-all active:scale-95 capitalize ${
                  store.selectedPreset === p ? 'bg-purple-500/60 text-white' : 'bg-white/5 active:bg-white/20'
                }`}>{p}</button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1">
            {PRESETS.slice(8).map(p => (
              <button key={p} onClick={() => store.setPreset(p)}
                className={`py-1.5 rounded-lg text-[8px] font-medium transition-all active:scale-95 capitalize ${
                  store.selectedPreset === p ? 'bg-purple-500/60 text-white' : 'bg-white/5 active:bg-white/20'
                }`}>{p}</button>
            ))}
          </div>
          <div className="flex gap-2 mt-1.5">
            <button onClick={store.randomizeOvertones}
              className="flex-1 py-1.5 rounded-xl bg-cyan-500/20 active:bg-cyan-500/40 text-[8px] font-medium active:scale-95">🎲 Randomize</button>
            <button onClick={store.resetOvertones}
              className="flex-1 py-1.5 rounded-xl bg-rose-500/20 active:bg-rose-500/40 text-[8px] font-medium active:scale-95">↺ Reset</button>
          </div>
          <div className="mt-2">
            <div className="text-[8px] text-white/30 mb-1 font-mono">Individual Harmonics</div>
            <div className="grid grid-cols-8 gap-1">
              {store.overtoneGains.slice(0, 16).map((gain: number, i: number) => (
                <div key={i} className="flex flex-col items-center">
                  <input type="range" min="0" max="1" step="0.01" value={gain}
                    onChange={(e) => store.setOvertoneGain(i, parseFloat(e.target.value))}
                    className="w-8 accent-cyan-500 rotate-180"
                    style={{ writingMode: 'vertical-lr', direction: 'rtl', height: '40px' }} />
                  <span className="text-[7px] text-white/30 mt-0.5">{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ═══ WAVEFORM & FILTER ═══ */}
        <Section title="Waveform & Filter">
          <div className="text-[8px] text-white/30 mb-1">Waveform</div>
          <div className="grid grid-cols-5 gap-1 mb-2">
            {WAVEFORM_PRESETS.map(w => (
              <button key={w} onClick={() => store.setWaveform(w)}
                className={`py-1.5 rounded-lg text-[8px] font-medium transition-all active:scale-95 ${
                  store.waveform === w ? 'bg-purple-500 text-white' : 'bg-white/5 active:bg-white/20'
                }`}>{w}</button>
            ))}
          </div>
          <Slider label="Fundamental" value={store.fundamental} min={30} max={2000} step={1}
            onChange={store.setFundamental} format={(v) => `${v.toFixed(0)} Hz`} />
          <Slider label="Detune" value={store.detune} min={-100} max={100} step={1}
            onChange={store.setDetune} format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}¢`} />
          <Slider label="Filter Cutoff" value={store.filterFreq} min={30} max={12000} step={1}
            onChange={(v) => store.setFilter(v, store.filterQ)} format={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v.toFixed(0)} />
          <Slider label="Filter Resonance" value={store.filterQ} min={0.1} max={20} step={0.1}
            onChange={(v) => store.setFilter(store.filterFreq, v)} format={(v) => `Q ${v.toFixed(1)}`} />
          <div className="grid grid-cols-4 gap-1 mt-1">
            {FILTER_TYPES.slice(0, 4).map(ft => (
              <button key={ft} onClick={() => store.setFilterType(ft)}
                className={`py-1 rounded-lg text-[7px] font-medium transition-all active:scale-95 ${
                  store.filterType === ft ? 'bg-cyan-500/60 text-white' : 'bg-white/5 active:bg-white/20'
                }`}>{ft}</button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1 mt-1">
            {FILTER_TYPES.slice(4).map(ft => (
              <button key={ft} onClick={() => store.setFilterType(ft)}
                className={`py-1 rounded-lg text-[7px] font-medium transition-all active:scale-95 ${
                  store.filterType === ft ? 'bg-cyan-500/60 text-white' : 'bg-white/5 active:bg-white/20'
                }`}>{ft}</button>
            ))}
          </div>
        </Section>

        {/* ═══ FX ═══ */}
        <Section title="FX — Reverb / Delay">
          <Slider label="Reverb Mix" value={store.reverbMix} min={0} max={1} step={0.01}
            onChange={store.setReverbMix} format={(v) => `${(v * 100).toFixed(0)}%`} />
          <Slider label="Delay Time" value={store.delayTime} min={0.05} max={2} step={0.01}
            onChange={store.setDelayTime} format={(v) => `${(v * 1000).toFixed(0)}ms`} />
          <Slider label="Delay Feedback" value={store.delayFeedback} min={0} max={0.9} step={0.01}
            onChange={store.setDelayFeedback} format={(v) => `${(v * 100).toFixed(0)}%`} />
        </Section>
        <Section title="FX — Modulation">
          <Slider label="Chorus Depth" value={store.chorusDepth} min={0} max={1} step={0.01}
            onChange={store.setChorusDepth} format={(v) => `${(v * 100).toFixed(0)}%`} />
          <Slider label="LFO Rate" value={store.lfoRate} min={0.05} max={8} step={0.01}
            onChange={store.setLfoRate} format={(v) => `${v.toFixed(2)} Hz`} />
          <Slider label="LFO Depth" value={store.lfoDepth} min={0} max={800} step={1}
            onChange={store.setLfoDepth} format={(v) => v.toFixed(0)} />
        </Section>
        <Section title="FX — Distortion / Dynamics">
          <Slider label="Distortion" value={store.distortionAmount} min={0} max={1} step={0.01}
            onChange={store.setDistortionAmount} format={(v) => `${(v * 100).toFixed(0)}%`} />
          <Slider label="Comp Threshold" value={store.compressorThreshold} min={-60} max={0} step={1}
            onChange={store.setCompressorThreshold} format={(v) => `${v.toFixed(0)} dB`} />
          <Slider label="Stereo Pan" value={store.pan} min={-1} max={1} step={0.01}
            onChange={store.setPan} format={(v) => v === 0 ? 'C' : v < 0 ? `L${Math.abs(v).toFixed(1)}` : `R${v.toFixed(1)}`} />
        </Section>
        <Section title="Volume">
          <Slider label="Master" value={store.masterGain} min={0} max={1} step={0.01}
            onChange={store.setMasterGain} format={(v) => `${(v * 100).toFixed(0)}%`} />
        </Section>
        <Section title="Note Triggers">
          <div className="grid grid-cols-7 gap-1">
            {['C4','D4','E4','F4','G4','A4','B4'].map(n => (
              <button key={n} onClick={() => store.trigger(n)}
                className="py-2.5 rounded-xl bg-white/5 active:bg-purple-500/40 text-[9px] font-medium active:scale-95">{n}</button>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 mt-1">
            {['C3','D3','E3','F3','G3','A3','B3'].map(n => (
              <button key={n} onClick={() => store.trigger(n)}
                className="py-2 rounded-xl bg-white/5 active:bg-purple-500/40 text-[8px] font-medium active:scale-95">{n}</button>
            ))}
          </div>
          <button onClick={() => store.triggerPerc()}
            className="w-full mt-1 py-2 rounded-xl bg-amber-500/20 active:bg-amber-500/40 text-[9px] font-medium active:scale-95">👆 PERCUSSION HIT</button>
        </Section>
        <Section title="About HMXOT">
          <div className="text-[8px] text-white/30 leading-relaxed">
            <p>Touch canvas to play notes. Vertical=velocity, horizontal=pitch.</p>
            <p className="mt-1">1-finger drag: ↔ detune, ↕ filter.</p>
            <p className="mt-1">2-finger drag: ↔ delay, ↕ reverb.</p>
            <p className="mt-1">Double-tap: toggle panel.</p>
            <p className="mt-1 text-purple-400">🌀 Harmonic arpeggio patterns track the root frequency — changing the fundamental retunes the entire sequence through the overtone series.</p>
          </div>
        </Section>
      </div>
    </div>
  );
}
