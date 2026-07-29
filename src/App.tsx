import { useEffect } from 'react';
import { useHarmonicStore } from './store/harmonicStore';

function StepButton({ active, harmonic, perc, isCurrent, isMute, color, onClick }: {
  active: boolean; harmonic: number | null; perc: boolean;
  isCurrent: boolean; isMute: boolean; color: string; onClick: () => void;
}) {
  const label = !active ? '·' : perc ? '✕' : harmonic ? `H${harmonic}` : '·';
  return (
    <button
      onClick={onClick}
      className={`aspect-square rounded-lg text-[7px] font-mono flex items-center justify-center
        transition-all active:scale-90 touch-manipulation
        ${isCurrent ? 'ring-2 ring-white ring-offset-1 ring-offset-black/50 z-10 scale-110' : ''}
        ${!active ? 'opacity-20 bg-white/[0.04]' : isMute ? 'opacity-30' : perc ? 'bg-amber-600/50' : `bg-[${color}]/30`}`}
      style={active && !isMute && !perc ? { backgroundColor: `${color}40` } : undefined}
    >
      {label}
    </button>
  );
}

function VoicePanel({ trackIdx }: { trackIdx: number }) {
  const track = useHarmonicStore(s => s.tracks[trackIdx]);
  const voice = useHarmonicStore(s => s.voices.find(v => v.id === track?.voiceId));
  const currentStep = useHarmonicStore(s => s.currentStep);
  const { setTrackStep, updateVoice, setVoicePreset, setEditTrackIdx, randomizeTrack, setFundamental } = useHarmonicStore();

  if (!track || !voice) return null;

  const steps = track.steps.slice(0, 32);
  const cols = 8;

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-2xl border border-white/[0.06] p-3 mb-3">
      {/* Voice header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: track.color }} />
        <span className="text-xs font-bold text-white/80">{voice.name}</span>
        <span className="text-[8px] text-white/30 font-mono ml-1">{voice.fundamental.toFixed(0)}Hz</span>
        <div className="flex-1" />
        <button onClick={() => updateVoice(track.voiceId, { volume: Math.max(0, voice.volume - 0.1) })}
          className="w-7 h-7 rounded-lg bg-white/5 active:bg-white/20 text-xs flex items-center justify-center">−</button>
        <span className="text-[9px] font-mono text-white/50 w-6 text-center">{(voice.volume * 100).toFixed(0)}</span>
        <button onClick={() => updateVoice(track.voiceId, { volume: Math.min(1, voice.volume + 0.1) })}
          className="w-7 h-7 rounded-lg bg-white/5 active:bg-white/20 text-xs flex items-center justify-center">+</button>
        <button onClick={() => setEditTrackIdx(trackIdx)}
          className="w-7 h-7 rounded-lg bg-white/10 active:bg-white/20 text-[9px] flex items-center justify-center">⚙</button>
        <button onClick={() => randomizeTrack(trackIdx)}
          className="w-7 h-7 rounded-lg bg-cyan-500/20 active:bg-cyan-500/40 text-[9px] flex items-center justify-center">🎲</button>
      </div>

      {/* Step grid */}
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {steps.map((s, i) => (
          <StepButton
            key={i}
            active={s.active}
            harmonic={s.harmonic}
            perc={s.perc}
            isCurrent={i === currentStep}
            isMute={track.mute}
            color={track.color}
            onClick={() => setTrackStep(trackIdx, i, { active: !s.active })}
          />
        ))}
      </div>

      {/* Quick controls row */}
      <div className="flex gap-1.5 mt-2">
        {['sub', 'bass', 'bell', 'warm', 'bright', 'cosmic'].slice(0, 4).map(p => (
          <button key={p} onClick={() => setVoicePreset(track.voiceId, p)}
            className="flex-1 py-1.5 rounded-lg bg-white/5 active:bg-white/20 text-[7px] font-medium active:scale-95 capitalize">
            {p}
          </button>
        ))}
        <button onClick={() => setFundamental(track.voiceId, voice.fundamental - 5)}
          className="px-2 py-1.5 rounded-lg bg-white/5 active:bg-white/20 text-[7px]">−Hz</button>
        <button onClick={() => setFundamental(track.voiceId, voice.fundamental + 5)}
          className="px-2 py-1.5 rounded-lg bg-white/5 active:bg-white/20 text-[7px]">+Hz</button>
      </div>
    </div>
  );
}

function EditPanel({ trackIdx }: { trackIdx: number }) {
  const track = useHarmonicStore(s => s.tracks[trackIdx]);
  const voice = useHarmonicStore(s => s.voices.find(v => v.id === track?.voiceId));
  const { updateVoice, setEditTrackIdx } = useHarmonicStore();
  if (!track || !voice) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black/90 backdrop-blur-xl pointer-events-auto">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <h2 className="text-sm font-bold text-white/80" style={{ color: track.color }}>{voice.name}</h2>
        <span className="text-[9px] font-mono text-white/30">{voice.id}</span>
        <div className="flex-1" />
        <button onClick={() => setEditTrackIdx(null)}
          className="w-10 h-10 rounded-xl bg-white/10 active:bg-white/20 text-sm">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="text-[9px] text-white/40 font-mono block mb-1.5">Fundamental: {voice.fundamental.toFixed(0)} Hz</label>
          <input type="range" min={30} max={800} value={voice.fundamental}
            onChange={e => updateVoice(track.voiceId, { fundamental: parseFloat(e.target.value) })}
            className="w-full h-1.5 appearance-none bg-white/[0.08] rounded-full cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-400" />
        </div>
        <div>
          <label className="text-[9px] text-white/40 font-mono block mb-1.5">Volume: {(voice.volume * 100).toFixed(0)}%</label>
          <input type="range" min={0} max={1} step={0.01} value={voice.volume}
            onChange={e => updateVoice(track.voiceId, { volume: parseFloat(e.target.value) })}
            className="w-full h-1.5 appearance-none bg-white/[0.08] rounded-full cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400" />
        </div>
        <div>
          <label className="text-[9px] text-white/40 font-mono block mb-1.5">Filter: {voice.filterFreq.toFixed(0)} Hz</label>
          <input type="range" min={50} max={10000} value={voice.filterFreq}
            onChange={e => updateVoice(track.voiceId, { filterFreq: parseFloat(e.target.value) })}
            className="w-full h-1.5 appearance-none bg-white/[0.08] rounded-full cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-rose-400" />
        </div>
        <div>
          <label className="text-[9px] text-white/40 font-mono block mb-1.5">Filter Q: {voice.filterQ.toFixed(1)}</label>
          <input type="range" min={0.1} max={10} step={0.1} value={voice.filterQ}
            onChange={e => updateVoice(track.voiceId, { filterQ: parseFloat(e.target.value) })}
            className="w-full h-1.5 appearance-none bg-white/[0.08] rounded-full cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400" />
        </div>
        <div>
          <label className="text-[9px] text-white/40 font-mono block mb-1.5">Pan: {voice.pan.toFixed(2)}</label>
          <input type="range" min={-1} max={1} step={0.01} value={voice.pan}
            onChange={e => updateVoice(track.voiceId, { pan: parseFloat(e.target.value) })}
            className="w-full h-1.5 appearance-none bg-white/[0.08] rounded-full cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400" />
        </div>
        <div>
          <label className="text-[9px] text-white/40 font-mono block mb-1.5">Reverb Send: {(voice.reverbSend * 100).toFixed(0)}%</label>
          <input type="range" min={0} max={1} step={0.01} value={voice.reverbSend}
            onChange={e => updateVoice(track.voiceId, { reverbSend: parseFloat(e.target.value) })}
            className="w-full h-1.5 appearance-none bg-white/[0.08] rounded-full cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-400" />
        </div>
        <div>
          <label className="text-[9px] text-white/40 font-mono block mb-1.5">Delay Send: {(voice.delaySend * 100).toFixed(0)}%</label>
          <input type="range" min={0} max={1} step={0.01} value={voice.delaySend}
            onChange={e => updateVoice(track.voiceId, { delaySend: parseFloat(e.target.value) })}
            className="w-full h-1.5 appearance-none bg-white/[0.08] rounded-full cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400" />
        </div>
        <div>
          <label className="text-[9px] text-white/40 font-mono block mb-1.5">Waveform</label>
          <div className="grid grid-cols-4 gap-2">
            {(['sine', 'triangle', 'sawtooth', 'square'] as const).map(w => (
              <button key={w} onClick={() => updateVoice(track.voiceId, { waveform: w })}
                className={`py-2 rounded-xl text-[9px] font-medium transition-all active:scale-95 ${
                  voice.waveform === w ? 'bg-purple-500 text-white' : 'bg-white/5 active:bg-white/20'
                }`}>{w}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const store = useHarmonicStore();

  useEffect(() => {
    // Auto-init on first touch
    const handleTouch = () => {
      if (!store.isPlaying) {
        store.init();
        store.toggleSequencer();
      }
      document.removeEventListener('touchstart', handleTouch);
      document.removeEventListener('mousedown', handleTouch);
    };
    document.addEventListener('touchstart', handleTouch, { once: true });
    document.addEventListener('mousedown', handleTouch, { once: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-dvh bg-[#0a0a0f] overflow-hidden touch-none select-none flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 shrink-0">
        <h1 className="text-sm font-bold text-white/70" style={{ textShadow: '0 0 8px #a855f7' }}>HMXOT</h1>
        <span className="text-[7px] text-white/20 font-mono tracking-widest">HARMONIC OVERTONES</span>
        <div className="flex-1" />
        <span className={`w-1.5 h-1.5 rounded-full ${store.isPlaying ? 'bg-green-500 animate-pulse' : 'bg-white/20'}`} />
        <span className="text-[8px] font-mono text-white/30">
          {store.isSequencing ? `${store.bpm.toFixed(0)} BPM` : store.isPlaying ? 'LIVE' : 'STOP'}
        </span>
      </div>

      {/* Voice panels */}
      <div className="flex-1 overflow-y-auto px-3 py-1">
        {store.tracks.map((_, i) => (
          <VoicePanel key={i} trackIdx={i} />
        ))}
      </div>

      {/* Bottom transport bar */}
      <div className="shrink-0 px-3 pb-3 pt-1">
        <div className="flex items-center gap-2 bg-black/70 backdrop-blur-xl rounded-2xl border border-white/[0.06] px-3 py-2.5">
          {/* Play */}
          <button onClick={store.togglePlayback}
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold transition-all active:scale-90 ${
              store.isPlaying
                ? 'bg-gradient-to-br from-rose-600 to-pink-600'
                : 'bg-gradient-to-br from-purple-600 to-cyan-600'
            }`}>
            {store.isPlaying ? '■' : '▶'}
          </button>

          {/* Sequencer */}
          <button onClick={store.toggleSequencer}
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold transition-all active:scale-90 ${
              store.isSequencing
                ? 'bg-gradient-to-br from-emerald-600 to-teal-600'
                : 'bg-white/10 active:bg-white/20'
            }`}>
            {store.isSequencing ? '⏹' : '🔀'}
          </button>

          {/* BPM */}
          <div className="flex items-center gap-1">
            <button onClick={() => store.setBpm(store.bpm - 5)}
              className="w-8 h-8 rounded-lg bg-white/5 active:bg-white/20 text-xs flex items-center justify-center">−</button>
            <span className="text-[9px] font-mono text-white/50 w-10 text-center">{store.bpm.toFixed(0)}</span>
            <button onClick={() => store.setBpm(store.bpm + 5)}
              className="w-8 h-8 rounded-lg bg-white/5 active:bg-white/20 text-xs flex items-center justify-center">+</button>
          </div>

          <div className="flex-1" />

          {/* FX panel toggle */}
          <button onClick={() => store.setShowMixer(!store.showMixer)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs transition-all active:scale-90 ${
              store.showMixer ? 'bg-purple-600/50' : 'bg-white/10 active:bg-white/20'
            }`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
              <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
              <circle cx="4" cy="12" r="2" /><circle cx="12" cy="10" r="2" /><circle cx="20" cy="14" r="2" />
            </svg>
          </button>

          {/* Randomize */}
          <button onClick={store.randomizeAll}
            className="w-10 h-10 rounded-xl bg-cyan-500/20 active:bg-cyan-500/40 flex items-center justify-center text-sm active:scale-90">
            🎲
          </button>
        </div>
      </div>

      {/* Mixer/FX panel */}
      {store.showMixer && (
        <div className="fixed inset-0 z-30 flex flex-col pointer-events-none">
          <div className="flex-1 pointer-events-auto" onClick={() => store.setShowMixer(false)} />
          <div className="h-1/2 pointer-events-auto bg-black/90 backdrop-blur-xl rounded-t-2xl border-t border-white/[0.08] p-4 overflow-y-auto"
            style={{ animation: 'slideUp 0.2s ease-out' }}>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xs font-bold text-white/70">MIXER / FX</h2>
              <div className="flex-1" />
              <button onClick={() => store.setShowMixer(false)}
                className="w-8 h-8 rounded-lg bg-white/10 active:bg-white/20 text-xs flex items-center justify-center">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[8px] text-white/40 font-mono block mb-1">Master: {(store.masterGain * 100).toFixed(0)}%</label>
                <input type="range" min={0} max={1} step={0.01} value={store.masterGain}
                  onChange={e => store.setMasterGain(parseFloat(e.target.value))}
                  className="w-full h-1.5 appearance-none bg-white/[0.08] rounded-full cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/60" />
              </div>
              <div>
                <label className="text-[8px] text-white/40 font-mono block mb-1">Reverb: {(store.reverbMix * 100).toFixed(0)}%</label>
                <input type="range" min={0} max={1} step={0.01} value={store.reverbMix}
                  onChange={e => store.setReverbMix(parseFloat(e.target.value))}
                  className="w-full h-1.5 appearance-none bg-white/[0.08] rounded-full cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-400" />
              </div>
              <div>
                <label className="text-[8px] text-white/40 font-mono block mb-1">Delay: {(store.delayTime * 1000).toFixed(0)}ms</label>
                <input type="range" min={0.05} max={2} step={0.01} value={store.delayTime}
                  onChange={e => store.setDelayTime(parseFloat(e.target.value))}
                  className="w-full h-1.5 appearance-none bg-white/[0.08] rounded-full cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400" />
              </div>
              <div>
                <label className="text-[8px] text-white/40 font-mono block mb-1">Delay Feedback: {(store.delayFeedback * 100).toFixed(0)}%</label>
                <input type="range" min={0} max={0.9} step={0.01} value={store.delayFeedback}
                  onChange={e => store.setDelayFeedback(parseFloat(e.target.value))}
                  className="w-full h-1.5 appearance-none bg-white/[0.08] rounded-full cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-rose-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit panel */}
      {store.editTrackIdx !== null && <EditPanel trackIdx={store.editTrackIdx} />}

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}

export default App;
