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
  type: 'ring' | 'spark' | 'wave';
}

const NOTES = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5'];

export function HarmonicVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);
  const touchRef = useRef({ x: 0, y: 0, count: 0, force: 0, active: false });
  
  const { overtoneGains, fundamental, waveform, trigger } = useHarmonicStore();

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
    ctx.fillStyle = 'rgba(10, 10, 15, 0.08)';
    ctx.fillRect(0, 0, w, h);
    
    const tx = touchRef.current.x;
    const ty = touchRef.current.y;
    const touchActive = touchRef.current.active;
    const force = touchRef.current.force || 0.5;
    
    // Dynamic background nebula following touch
    const nebulaGradient = ctx.createRadialGradient(
      touchActive ? tx : cx, touchActive ? ty : cy, 0,
      touchActive ? tx : cx, touchActive ? ty : cy, 400
    );
    nebulaGradient.addColorStop(0, `hsla(${(t * 15) % 360}, 70%, 30%, ${touchActive ? 0.25 : 0.12})`);
    nebulaGradient.addColorStop(0.5, `hsla(${(t * 15 + 120) % 360}, 60%, 20%, 0.06)`);
    nebulaGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = nebulaGradient;
    ctx.fillRect(0, 0, w, h);
    
    // Central pulsing glow
    const pulseR = 120 + Math.sin(t * 2) * 30 + (touchActive ? 60 * force : 0);
    const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR);
    glowGrad.addColorStop(0, `hsla(${(t * 20) % 360}, 90%, 60%, ${touchActive ? 0.5 : 0.3})`);
    glowGrad.addColorStop(0.4, `hsla(${(t * 20 + 60) % 360}, 70%, 40%, ${touchActive ? 0.25 : 0.12})`);
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, w, h);
    
    // Harmonic rings
    const maxRadius = Math.min(w, h) * 0.38;
    
    overtoneGains.forEach((gain: number, i: number) => {
      const harmonic = i + 1;
      const baseRadius = (maxRadius / 16) * harmonic;
      const radius = baseRadius + Math.sin(t * 3 + i) * 8;
      const hue = (t * 25 + i * 25) % 360;
      
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue}, 85%, 65%, ${gain * 0.5})`;
      ctx.lineWidth = 2 + gain * 8 + Math.sin(t * 4 + i) * 1.5;
      ctx.shadowColor = `hsla(${hue}, 100%, 55%, 0.7)`;
      ctx.shadowBlur = 15 + gain * 20;
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Touch-reactive markers
      const markerCount = Math.max(1, Math.floor(harmonic * (1 + force * 0.5)));
      for (let j = 0; j < markerCount; j++) {
        const angle = (j / markerCount) * Math.PI * 2 + t * (0.6 + i * 0.06);
        const mx = cx + Math.cos(angle) * radius;
        const my = cy + Math.sin(angle) * radius;
        
        ctx.beginPath();
        ctx.arc(mx, my, 3 + gain * 6, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 95%, 75%, ${gain})`;
        ctx.fill();
        
        if (gain > 0.3) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(mx, my);
          ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${gain * 0.15})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
        
        if (Math.random() < gain * 0.35) {
          particlesRef.current.push({
            x: mx, y: my,
            vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
            life: 0, maxLife: 30 + Math.random() * 40,
            hue, size: 1 + gain * 3,
            type: Math.random() > 0.6 ? 'spark' : 'ring',
          });
        }
      }
    });
    
    // Center waveform
    ctx.beginPath();
    const waveWidth = 250;
    const waveHeight = 60 + force * 30;
    
    for (let x = -waveWidth/2; x < waveWidth/2; x++) {
      const nx = x / waveWidth;
      let y = 0;
      
      overtoneGains.forEach((gain: number, i: number) => {
        const harmonic = i + 1;
        y += Math.sin(nx * Math.PI * 2 * harmonic + t * 2) * gain * waveHeight;
      });
      
      if (x === -waveWidth/2) {
        ctx.moveTo(cx + x, cy + y);
      } else {
        ctx.lineTo(cx + x, cy + y);
      }
    }
    
    ctx.strokeStyle = `hsla(${(t * 35) % 360}, 100%, 75%, 0.9)`;
    ctx.lineWidth = 2;
    ctx.shadowColor = `hsla(${(t * 35) % 360}, 100%, 55%, 1)`;
    ctx.shadowBlur = 20;
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Particles
    particlesRef.current = particlesRef.current.filter((p: Particle) => {
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.97;
      p.vy *= 0.97;
      
      if (touchActive) {
        p.vx += (tx - p.x) * 0.002 * force;
        p.vy += (ty - p.y) * 0.002 * force;
      }
      
      const alpha = 1 - p.life / p.maxLife;
      if (alpha <= 0) return false;
      
      if (p.type === 'spark') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 90%, 70%, ${alpha * 0.7})`;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha * 2, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${p.hue}, 80%, 60%, ${alpha * 0.4})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      
      return true;
    });
    
    // Spectrum bars
    const sw = 160, sh = 50;
    const sx = 15, sy = h - sh - 15;
    
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.roundRect(sx, sy, sw, sh, 8);
    ctx.fill();
    
    overtoneGains.forEach((gain: number, i: number) => {
      const bw = sw / overtoneGains.length;
      const bh = gain * sh;
      ctx.fillStyle = `hsla(${(t * 15 + i * 20) % 360}, 80%, 60%, 0.8)`;
      ctx.fillRect(sx + i * bw, sy + sh - bh, bw - 1, bh);
    });
    
    // Labels
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`~${fundamental.toFixed(0)} Hz`, cx, h - 15);
    ctx.fillText(waveform.toUpperCase(), cx, 20);
    
    // Touch hint
    if (t < 5) {
      ctx.fillStyle = `rgba(255,255,255,${0.5 - t * 0.1})`;
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TAP CANVAS TO TRIGGER NOTES', cx, h * 0.75);
    }
    
    animFrameRef.current = requestAnimationFrame(draw);
  }, [overtoneGains, fundamental, waveform]);
  
  // Touch/mouse handler — trigger notes based on canvas position
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
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const getPos = (x: number, y: number) => {
      const rect = canvas.getBoundingClientRect();
      return { x: x - rect.left, y: y - rect.top };
    };
    
    const handleDown = (x: number, y: number) => {
      const pos = getPos(x, y);
      touchRef.current.x = pos.x;
      touchRef.current.y = pos.y;
      touchRef.current.active = true;
      
      // Map touch position to pitch (left=low, right=high)
      const rect = canvas.getBoundingClientRect();
      const normX = pos.x / rect.width;
      const noteIndex = Math.floor(normX * NOTES.length);
      const note = NOTES[Math.min(noteIndex, NOTES.length - 1)];
      if (note) trigger(note);
    };
    
    const handleMove = (x: number, y: number) => {
      const pos = getPos(x, y);
      touchRef.current.x = pos.x;
      touchRef.current.y = pos.y;
    };
    
    const handleUp = () => {
      touchRef.current.active = false;
    };
    
    // Touch events
    canvas.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0]!;
      touchRef.current.count = e.touches.length;
      touchRef.current.force = t.force || 0.5;
      handleDown(t.clientX, t.clientY);
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0]!;
      touchRef.current.force = t.force || 0.5;
      handleMove(t.clientX, t.clientY);
    }, { passive: false });
    
    canvas.addEventListener('touchend', handleUp);
    
    // Mouse fallback
    canvas.addEventListener('mousedown', (e: MouseEvent) => handleDown(e.clientX, e.clientY));
    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      if (e.buttons > 0) handleMove(e.clientX, e.clientY);
    });
    canvas.addEventListener('mouseup', handleUp);
    canvas.addEventListener('mouseleave', handleUp);
    
  }, [trigger]);
  
  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full touch-none select-none"
    />
  );
}
