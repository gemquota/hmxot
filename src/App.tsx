import { useCallback, useEffect } from 'react';
import { HarmonicVisualizer } from './components/HarmonicVisualizer';
import { OvertoneControls } from './components/OvertoneControls';
import { useHarmonicStore } from './store/harmonicStore';

function App() {
  const store = useHarmonicStore();
  const {
    isPlaying, isSequencing, fundamental, generativeType,
    drawerOpen, setDrawerOpen, togglePlayback, toggleSequencer,
    selectPattern, setFundamental, load1564,
  } = store;

  const handleToggleDrawer = useCallback(() => {
    setDrawerOpen(!drawerOpen);
  }, [drawerOpen, setDrawerOpen]);

  // Auto-start with 1564 pattern on first touch
  useEffect(() => {
    const handleFirstTouch = () => {
      if (!isPlaying) {
        // 1564 is the last pattern (index patterns.length - 1)
        const pats = useHarmonicStore.getState().patterns;
        const _1564Idx = pats.length - 1;
        selectPattern(_1564Idx);
        toggleSequencer();
      }
      document.removeEventListener('touchstart', handleFirstTouch);
      document.removeEventListener('mousedown', handleFirstTouch);
    };
    document.addEventListener('touchstart', handleFirstTouch, { once: true });
    document.addEventListener('mousedown', handleFirstTouch, { once: true });
    return () => {
      document.removeEventListener('touchstart', handleFirstTouch);
      document.removeEventListener('mousedown', handleFirstTouch);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full h-dvh bg-[#0a0a0f] overflow-hidden touch-none select-none relative">
      <HarmonicVisualizer />

      {/* Title */}
      <div className="absolute top-3 left-4 pointer-events-none z-10">
        <h1 className="text-lg font-bold text-white/80 tracking-tight" style={{
          textShadow: '0 0 10px #a855f7, 0 0 20px #a855f7'
        }}>HMXOT</h1>
        <p className="text-[8px] text-white/25 mt-0.5 tracking-widest">HARMONIC OVERTONES</p>
      </div>

      {/* Status badge */}
      <div className="absolute top-3 right-4 pointer-events-none z-10">
        <div className="bg-black/40 backdrop-blur-sm rounded-lg px-2.5 py-1 flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-white/20'}`} />
          <span className="text-[8px] text-white/40 font-mono">
            {isSequencing ? 'SEQ' : isPlaying ? 'LIVE' : 'STOP'}
          </span>
          {generativeType === '1564' && (
            <span className="text-[7px] text-amber-400/60 font-mono">1564</span>
          )}
          {isSequencing && (
            <span className="text-[7px] text-emerald-400/60 font-mono">
              {useHarmonicStore.getState().bpm.toFixed(0)}BPM
            </span>
          )}
        </div>
      </div>

      {/* 1564 indicator */}
      {generativeType === '1564' && isSequencing && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 pointer-events-none z-10">
          <div className="text-[9px] text-amber-300/40 font-mono text-center">
            1 — 5 — 6 — 4
            <span className="mx-1.5 text-white/20">·</span>
            <span className="text-purple-300/50">H1–H8</span>
            <span className="mx-1.5 text-white/20">·</span>
            <span className="text-amber-300/60">{fundamental.toFixed(0)}Hz ROOT</span>
          </div>
        </div>
      )}

      {/* Gesture hint */}
      <div className="absolute bottom-28 left-1/2 -translate-x-1/2 pointer-events-none z-10">
        <div className="text-[9px] text-white/20 font-mono text-center">TAP · DRAG · TWO FINGERS</div>
      </div>

      {/* ─── CENTER BIG PLAY/PAUSE ─── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        {!isPlaying && (
          <button onClick={togglePlayback}
            className="pointer-events-auto w-24 h-24 rounded-full bg-gradient-to-br from-purple-600/80 to-cyan-600/80
              shadow-2xl shadow-purple-500/40 flex items-center justify-center text-4xl
              transition-all active:scale-90 hover:scale-105 backdrop-blur-sm border border-white/10"
            style={{ textShadow: '0 0 20px rgba(168,85,247,0.6)' }}>
            ▶
          </button>
        )}
      </div>

      {/* ─── BOTTOM BAR ─── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-3 pb-3">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] px-3 py-2">
          {/* Play/Pause - BIG */}
          <button onClick={togglePlayback}
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold transition-all active:scale-90 ${
              isPlaying
                ? 'bg-gradient-to-br from-rose-600 to-pink-600 shadow-lg shadow-rose-500/40'
                : 'bg-gradient-to-br from-purple-600 to-cyan-600 shadow-lg shadow-purple-500/40'
            }`}>
            {isPlaying ? '■' : '▶'}
          </button>

          {/* Sequencer */}
          <button onClick={toggleSequencer}
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold transition-all active:scale-90 ${
              isSequencing
                ? 'bg-gradient-to-br from-emerald-600 to-teal-600 shadow-lg shadow-emerald-500/40'
                : 'bg-white/10 active:bg-white/20'
            }`}>
            {isSequencing ? '⏹' : '🔀'}
          </button>

          {/* 1564 button */}
          <button onClick={() => {
            load1564();
            if (!isSequencing) toggleSequencer();
          }}
            className={`h-12 px-3 rounded-xl flex items-center justify-center text-[9px] font-bold transition-all active:scale-90 ${
              generativeType === '1564'
                ? 'bg-amber-600/60 shadow-lg shadow-amber-500/30 text-amber-200'
                : 'bg-white/10 active:bg-white/20'
            }`}>
            1-5-6-4
          </button>

          <div className="flex-1" />

          {/* Root freq */}
          <div className="flex items-center gap-1">
            <button onClick={() => setFundamental(Math.max(30, fundamental - 10))}
              className="w-8 h-8 rounded-lg bg-white/5 active:bg-white/20 text-xs flex items-center justify-center">−</button>
            <span className="text-[9px] text-purple-300/60 font-mono w-11 text-center">{fundamental.toFixed(0)}</span>
            <button onClick={() => setFundamental(Math.min(500, fundamental + 10))}
              className="w-8 h-8 rounded-lg bg-white/5 active:bg-white/20 text-xs flex items-center justify-center">+</button>
          </div>

          {/* Drawer toggle */}
          <button onClick={handleToggleDrawer}
            className="w-10 h-10 rounded-xl bg-white/10 active:bg-white/20 flex items-center justify-center text-sm transition-all active:scale-90">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="absolute inset-0 z-30 flex flex-col pointer-events-none">
          <div className="flex-1 pointer-events-auto" onClick={handleToggleDrawer} />
          <div className="h-2/3 pointer-events-auto" style={{ animation: 'slideUp 0.25s ease-out' }}>
            <div className="h-full rounded-t-2xl overflow-hidden border-t border-white/[0.08]">
              <OvertoneControls />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default App;
