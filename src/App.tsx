import { HarmonicVisualizer } from './components/HarmonicVisualizer';
import { OvertoneControls } from './components/OvertoneControls';
import { useHarmonicStore } from './store/harmonicStore';
import './index.css';

function App() {
  const { isPlaying } = useHarmonicStore();

  return (
    <div className="w-full h-dvh flex bg-[#0a0a0f] overflow-hidden touch-none select-none">
      {/* Main Visualizer Area */}
      <div className="flex-1 relative">
        {/* Background ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/3 right-1/3 w-[300px] h-[300px] bg-rose-500/10 rounded-full blur-[60px] animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        
        <HarmonicVisualizer />
        
        {/* Title Overlay */}
        <div className="absolute top-4 left-4 pointer-events-none">
          <h1 className="text-2xl font-bold glow-text text-white/90 tracking-tight">HMXOT</h1>
          <p className="text-[10px] text-white/30 mt-0.5 tracking-widest">HARMONIC OVERTONES</p>
        </div>
        
        {/* Status Badge */}
        <div className="absolute bottom-4 left-4 pointer-events-none">
          <div className="glass rounded-xl px-3 py-1.5 text-[9px] text-white/40 font-mono flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-white/20'}`} />
            {isPlaying ? 'PLAYING' : 'STOPPED'}
          </div>
        </div>
        
        {/* Swipe hint */}
        <div className="absolute bottom-4 right-4 pointer-events-none">
          <div className="text-[9px] text-white/20 font-mono text-right">
            TAP CANVAS → PLAY NOTE<br />
            SWIPE → PITCH BEND
          </div>
        </div>
      </div>
      
      {/* Control Panel */}
      <div className="w-72 border-l border-white/10 bg-black/50 backdrop-blur-xl overflow-y-auto">
        <OvertoneControls />
      </div>
    </div>
  );
}

export default App;
