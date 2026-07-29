import { useCallback, useEffect } from 'react';
import { HarmonicVisualizer } from './components/HarmonicVisualizer';
import { OvertoneControls } from './components/OvertoneControls';
import { useHarmonicStore } from './store/harmonicStore';

function App() {
  const { isPlaying, isSequencing, drawerOpen, setDrawerOpen, togglePlayback, toggleSequencer, selectPattern } = useHarmonicStore();

  const handleToggleDrawer = useCallback(() => {
    setDrawerOpen(!drawerOpen);
  }, [drawerOpen, setDrawerOpen]);

  // Auto-start with techno pattern on first interaction
  useEffect(() => {
    const handleFirstTouch = () => {
      if (!isPlaying) {
        selectPattern(0);
        toggleSequencer();
      }
      document.removeEventListener('touchstart', handleFirstTouch);
      document.removeEventListener('mousedown', handleFirstTouch);
    };
    // Wait for user gesture (autoplay policy)
    document.addEventListener('touchstart', handleFirstTouch, { once: true });
    document.addEventListener('mousedown', handleFirstTouch, { once: true });
    return () => {
      document.removeEventListener('touchstart', handleFirstTouch);
      document.removeEventListener('mousedown', handleFirstTouch);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full h-dvh bg-[#0a0a0f] overflow-hidden touch-none select-none relative">
      {/* Full-screen Canvas Visualizer */}
      <HarmonicVisualizer />

      {/* Title - top left */}
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
          {isSequencing && (
            <span className="text-[7px] text-emerald-400/60 font-mono">
              {useHarmonicStore.getState().bpm.toFixed(0)} BPM
            </span>
          )}
        </div>
      </div>

      {/* Gesture hint */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none z-10">
        <div className="text-[9px] text-white/20 font-mono text-center">
          TAP · DRAG · TWO FINGERS
        </div>
      </div>

      {/* Bottom control bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-3 pb-3">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] px-3 py-2">
          {/* Play */}
          <button onClick={togglePlayback}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all active:scale-90 ${
              isPlaying
                ? 'bg-gradient-to-br from-rose-600 to-pink-600 shadow-lg shadow-rose-500/30'
                : 'bg-gradient-to-br from-purple-600 to-cyan-600 shadow-lg shadow-purple-500/30'
            }`}>
            {isPlaying ? '■' : '▶'}
          </button>

          {/* Sequencer play/stop */}
          <button onClick={toggleSequencer}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all active:scale-90 ${
              isSequencing
                ? 'bg-gradient-to-br from-emerald-600 to-teal-600 shadow-lg shadow-emerald-500/30'
                : 'bg-white/10 active:bg-white/20'
            }`}
            title={isSequencing ? 'Stop sequencer' : 'Start sequencer'}>
            {isSequencing ? '⏹' : '🔀'}
          </button>

          {/* Quick pattern buttons */}
          <div className="flex gap-1 ml-1">
            {['techno', 'ambient', 'subbass'].map((p, i) => (
              <button key={p}
                onClick={() => {
                  selectPattern(i);
                  if (!isSequencing) toggleSequencer();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 active:bg-white/20 text-[7px] font-medium transition-all active:scale-95 capitalize">
                {p}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Controls drawer toggle */}
          <button onClick={handleToggleDrawer}
            className="w-10 h-10 rounded-xl bg-white/10 active:bg-white/20 flex items-center justify-center text-sm transition-all active:scale-90">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>

          {/* Randomize */}
          <button onClick={useHarmonicStore.getState().randomizeAll}
            className="w-10 h-10 rounded-xl bg-cyan-500/20 active:bg-cyan-500/40 flex items-center justify-center text-sm transition-all active:scale-90">
            🎲
          </button>
        </div>
      </div>

      {/* Drawer overlay */}
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
