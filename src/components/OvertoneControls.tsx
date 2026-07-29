import { useHarmonicStore } from '../store/harmonicStore';
import { WAVEFORM_PRESETS } from '../audio/harmonicEngine';

const PRESETS = ['natural', 'bright', 'dark', 'bell', 'organ', 'metallic', 'cosmic', 'crystal', 'warm'];

export function OvertoneControls() {
  const {
    fundamental,
    overtoneGains,
    waveform,
    detune,
    filterFreq,
    filterQ,
    masterGain,
    isPlaying,
    reverbMix,
    delayTime,
    delayFeedback,
    chorusDepth,
    setFundamental,
    setOvertoneGain,
    setWaveform,
    setDetune,
    setFilter,
    setMasterGain,
    togglePlayback,
    randomizeOvertones,
    resetOvertones,
    setPreset,
    trigger,
    setReverbMix,
    setDelayTime,
    setDelayFeedback,
    setChorusDepth,
  } = useHarmonicStore();

  const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const octaves = [3, 4, 5];

  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/30">
      {/* Play/Pause Button */}
      <button
        onClick={togglePlayback}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-500 ${
          isPlaying 
            ? 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-lg shadow-rose-500/40 scale-105' 
            : 'bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 shadow-lg shadow-purple-500/40 hover:scale-105'
        }`}
      >
        {isPlaying ? '■ STOP' : '▶ PLAY'}
      </button>

      {/* Preset Buttons */}
      <div className="glass rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-purple-300 mb-3 uppercase tracking-wider">Presets</h3>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map(preset => (
            <button
              key={preset}
              onClick={() => setPreset(preset)}
              className="py-2 px-2 rounded-xl bg-white/5 hover:bg-white/15 text-xs font-medium transition-all capitalize hover:scale-105"
            >
              {preset}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={randomizeOvertones}
            className="flex-1 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/40 text-xs font-medium transition-all hover:scale-105"
          >
            🎲 Randomize
          </button>
          <button
            onClick={resetOvertones}
            className="flex-1 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 text-xs font-medium transition-all hover:scale-105"
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Fundamental Frequency */}
      <div className="glass rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-purple-300 mb-3 uppercase tracking-wider">Fundamental</h3>
        <input
          type="range"
          min="65"
          max="1046"
          step="1"
          value={fundamental}
          onChange={(e) => setFundamental(Number(e.target.value))}
          className="w-full accent-purple-500"
        />
        <div className="text-center text-sm text-white/60 mt-1">{fundamental.toFixed(1)} Hz</div>
        
        {/* Note Buttons */}
        <div className="grid grid-cols-7 gap-1 mt-3">
          {notes.map(note => (
            octaves.map(oct => (
              <button
                key={`${note}${oct}`}
                onClick={() => {
                  const freqs: Record<string, number> = {
                    'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196, 'A3': 220, 'B3': 246.94,
                    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392, 'A4': 440, 'B4': 493.88,
                    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880, 'B5': 987.77,
                  };
                  setFundamental(freqs[`${note}${oct}`] || 440);
                }}
                className="py-1 rounded-lg bg-white/5 hover:bg-purple-500/30 text-[10px] transition-all hover:scale-110"
              >
                {note}{oct}
              </button>
            ))
          ))}
        </div>
      </div>

      {/* Overtone Sliders */}
      <div className="glass rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-purple-300 mb-3 uppercase tracking-wider">Overtones</h3>
        <div className="grid grid-cols-4 gap-3">
          {overtoneGains.slice(0, 16).map((gain: number, i: number) => (
            <div key={i} className="flex flex-col items-center">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={gain}
                onChange={(e) => setOvertoneGain(i, Number(e.target.value))}
                className="w-12 accent-cyan-500"
                style={{
                  writingMode: 'vertical-lr' as React.CSSProperties['writingMode'],
                  direction: 'rtl',
                  height: '70px',
                }}
              />
              <span className="text-[9px] text-white/40 mt-1">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Waveform */}
      <div className="glass rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-purple-300 mb-3 uppercase tracking-wider">Waveform</h3>
        <div className="grid grid-cols-4 gap-2">
          {WAVEFORM_PRESETS.map(wave => (
            <button
              key={wave}
              onClick={() => setWaveform(wave)}
              className={`py-3 rounded-xl text-xs font-medium transition-all ${
                waveform === wave
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30 scale-105'
                  : 'bg-white/5 hover:bg-white/15 hover:scale-105'
              }`}
            >
              {wave}
            </button>
          ))}
        </div>
      </div>

      {/* Filter & Effects */}
      <div className="glass rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-purple-300 mb-3 uppercase tracking-wider">Filter & Effects</h3>
        
        <label className="text-[10px] text-white/40 block mb-1">Filter Frequency</label>
        <input
          type="range"
          min="100"
          max="10000"
          step="1"
          value={filterFreq}
          onChange={(e) => setFilter(Number(e.target.value), filterQ)}
          className="w-full accent-cyan-500"
        />
        <div className="text-center text-[10px] text-white/40">{filterFreq} Hz</div>

        <label className="text-[10px] text-white/40 block mb-1 mt-2">Filter Resonance</label>
        <input
          type="range"
          min="0.1"
          max="20"
          step="0.1"
          value={filterQ}
          onChange={(e) => setFilter(filterFreq, Number(e.target.value))}
          className="w-full accent-cyan-500"
        />
        <div className="text-center text-[10px] text-white/40">Q: {filterQ.toFixed(1)}</div>

        <label className="text-[10px] text-white/40 block mb-1 mt-2">Detune</label>
        <input
          type="range"
          min="-100"
          max="100"
          step="1"
          value={detune}
          onChange={(e) => setDetune(Number(e.target.value))}
          className="w-full accent-rose-500"
        />
        <div className="text-center text-[10px] text-white/40">{detune} cents</div>

        <label className="text-[10px] text-white/40 block mb-1 mt-2">Master Volume</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={masterGain}
          onChange={(e) => setMasterGain(Number(e.target.value))}
          className="w-full accent-green-500"
        />
        <div className="text-center text-[10px] text-white/40">{(masterGain * 100).toFixed(0)}%</div>
      </div>

      {/* New Effects Section */}
      <div className="glass rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-purple-300 mb-3 uppercase tracking-wider">Audio Effects</h3>
        
        <label className="text-[10px] text-white/40 block mb-1">Reverb Mix</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={reverbMix}
          onChange={(e) => setReverbMix(Number(e.target.value))}
          className="w-full accent-purple-500"
        />
        <div className="text-center text-[10px] text-white/40">{(reverbMix * 100).toFixed(0)}%</div>

        <label className="text-[10px] text-white/40 block mb-1 mt-2">Delay Time</label>
        <input
          type="range"
          min="0.05"
          max="1"
          step="0.01"
          value={delayTime}
          onChange={(e) => setDelayTime(Number(e.target.value))}
          className="w-full accent-cyan-500"
        />
        <div className="text-center text-[10px] text-white/40">{delayTime.toFixed(2)}s</div>

        <label className="text-[10px] text-white/40 block mb-1 mt-2">Delay Feedback</label>
        <input
          type="range"
          min="0"
          max="0.9"
          step="0.01"
          value={delayFeedback}
          onChange={(e) => setDelayFeedback(Number(e.target.value))}
          className="w-full accent-cyan-500"
        />
        <div className="text-center text-[10px] text-white/40">{(delayFeedback * 100).toFixed(0)}%</div>

        <label className="text-[10px] text-white/40 block mb-1 mt-2">Chorus Depth</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={chorusDepth}
          onChange={(e) => setChorusDepth(Number(e.target.value))}
          className="w-full accent-rose-500"
        />
        <div className="text-center text-[10px] text-white/40">{(chorusDepth * 100).toFixed(0)}%</div>
      </div>

      {/* Quick Trigger */}
      <div className="glass rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-purple-300 mb-3 uppercase tracking-wider">Quick Trigger</h3>
        <div className="grid grid-cols-7 gap-1">
          {['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'].map(note => (
            <button
              key={note}
              onClick={() => trigger(note)}
              className="py-3 rounded-xl bg-white/5 hover:bg-purple-500/40 text-xs font-medium transition-all hover:scale-110"
            >
              {note}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
