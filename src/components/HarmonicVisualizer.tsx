import { useRef, useEffect, useCallback } from 'react';
import { useHarmonicStore } from '../store/harmonicStore';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: number;
  size: number;
}

export function HarmonicVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);
  
  const { 
    overtoneGains, 
    fundamental, 
    waveform 
  } = useHarmonicStore();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    
    timeRef.current += 0.016;
    const t = timeRef.current;
    
    // Clear with fade trail
    ctx.fillStyle = 'rgba(10, 10, 15, 0.1)';
    ctx.fillRect(0, 0, w, h);
    
    // Draw central glow
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150);
    gradient.addColorStop(0, `hsla(${(t * 20) % 360}, 80%, 50%, 0.3)`);
    gradient.addColorStop(0.5, `hsla(${(t * 20 + 60) % 360}, 60%, 40%, 0.1)`);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    
    // Draw harmonic rings
    const maxRadius = Math.min(w, h) * 0.4;
    
    overtoneGains.forEach((gain: number, i: number) => {
      const harmonic = i + 1;
      const radius = (maxRadius / 16) * harmonic;
      const hue = (t * 30 + i * 22.5) % 360;
      
      // Ring glow
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${gain * 0.5})`;
      ctx.lineWidth = 2 + gain * 8;
      ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.8)`;
      ctx.shadowBlur = 15 + gain * 20;
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Overtone markers
      const markerCount = harmonic;
      for (let j = 0; j < markerCount; j++) {
        const angle = (j / markerCount) * Math.PI * 2 + t * (1 + i * 0.1);
        const mx = cx + Math.cos(angle) * radius;
        const my = cy + Math.sin(angle) * radius;
        
        ctx.beginPath();
        ctx.arc(mx, my, 3 + gain * 5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 90%, 70%, ${gain})`;
        ctx.fill();
        
        // Spawn particles
        if (Math.random() < gain * 0.3) {
          particlesRef.current.push({
            x: mx,
            y: my,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            life: 0,
            maxLife: 60 + Math.random() * 60,
            hue: hue,
            size: 1 + gain * 3,
          });
        }
      }
    });
    
    // Draw waveform visualization in center
    ctx.beginPath();
    const waveWidth = 200;
    const waveHeight = 50;
    for (let x = -waveWidth/2; x < waveWidth/2; x++) {
      const nx = x / waveWidth;
      let y = 0;
      
      overtoneGains.forEach((gain: number, i: number) => {
        const harmonic = i + 1;
        y += Math.sin(nx * Math.PI * 2 * harmonic + t * 2) * gain * waveHeight;
      });
      
      const px = cx + x;
      const py = cy + y;
      
      if (x === -waveWidth/2) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    
    ctx.strokeStyle = `hsla(${(t * 40) % 360}, 100%, 70%, 0.8)`;
    ctx.lineWidth = 2;
    ctx.shadowColor = `hsla(${(t * 40) % 360}, 100%, 50%, 1)`;
    ctx.shadowBlur = 20;
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Update and draw particles
    particlesRef.current = particlesRef.current.filter((p: Particle) => {
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy *= 0.98;
      
      const alpha = 1 - p.life / p.maxLife;
      if (alpha <= 0) return false;
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${alpha * 0.6})`;
      ctx.fill();
      
      return true;
    });
    
    // Draw title
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`FUNDAMENTAL: ${fundamental.toFixed(1)} Hz`, cx, h - 40);
    ctx.fillText(`WAVEFORM: ${waveform.toUpperCase()}`, cx, h - 20);
    
    animFrameRef.current = requestAnimationFrame(draw);
  }, [overtoneGains, fundamental, waveform]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };
    
    resize();
    window.addEventListener('resize', resize);
    
    animFrameRef.current = requestAnimationFrame(draw);
    
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw]);
  
  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ background: 'transparent' }}
    />
  );
}
