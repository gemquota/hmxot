import { HarmonicVisualizer } from './components/HarmonicVisualizer';
import { OvertoneControls } from './components/OvertoneControls';
import './index.css';

function App() {
  return (
    <div className="w-full h-screen flex bg-[#0a0a0f] overflow-hidden">
      {/* Main Visualizer Area */}
      <div className="flex-1 relative">
        {/* Background ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/3 right-1/3 w-[300px] h-[300px] bg-rose-500/10 rounded-full blur-[60px] animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        
        {/* Canvas Visualizer */}
        <HarmonicVisualizer />
        
        {/* Title Overlay */}
        <div className="absolute top-6 left-6 pointer-events-none">
          <h1 className="text-4xl font-bold glow-text text-white/90 tracking-tight">
            HMXOT
          </h1>
          <p className="text-sm text-white/40 mt-1 tracking-widest">
            HARMONIC OVERTONES
          </p>
        </div>
        
        {/* Info Badge */}
        <div className="absolute bottom-6 left-6 pointer-events-none">
          <div className="glass rounded-lg px-3 py-2 text-[10px] text-white/30 font-mono">
            WEB AUDIO API • REAL-TIME HARMONICS
          </div>
        </div>
      </div>
      
      {/* Control Panel */}
      <div className="w-80 border-l border-white/10 bg-black/50 backdrop-blur-xl">
        <OvertoneControls />
      </div>
    </div>
  );
}

export default App;
