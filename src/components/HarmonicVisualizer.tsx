import { useRef, useEffect, useCallback } from 'react';
import { useHarmonicStore } from '../store/harmonicStore';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  hue: number; size: number;
  type: 'ring' | 'spark' | 'wave' | 'glow';
  harmonicIdx: number;
}

const NOTES = ['C2','D2','E2','F2','G2','A2','B2','C3','D3','E3','F3','G3','A3','B3','C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','F5','G5','A5','B5'];

const NOTE_FREQS: Record<string, number> = {
  'C2':65.41,'D2':73.42,'E2':82.41,'F2':87.31,'G2':98,'A2':110,'B2':123.47,
  'C3':130.81,'D3':146.83,'E3':164.81,'F3':174.61,'G3':196,'A3':220,'B3':246.94,
  'C4':261.63,'D4':293.66,'E4':329.63,'F4':349.23,'G4':392,'A4':440,'B4':493.88,
  'C5':523.25,'D5':587.33,'E5':659.25,'F5':698.46,'G5':783.99,'A5':880,'B5':987.77,
};

export function HarmonicVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef(0);
  const timeRef = useRef(0);
  const touchRef = useRef({ x: 0, y: 0, count: 0, active: false, force: 0.5 });
  const lastTapRef = useRef(0);
  const gestureRef = useRef({ startX: 0, startY: 0, startTime: 0, triggered: false });

  const store = useHarmonicStore();

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

    const {
      overtoneGains, fundamental, waveform, filterFreq,
      reverbMix, delayFeedback, chorusDepth, lfoRate, lfoDepth,
      distortionAmount, detune, isPlaying
    } = store;

    const tx = touchRef.current.x;
    const ty = touchRef.current.y;
    const touchActive = touchRef.current.active;
    const force = touchRef.current.force || 0.5;
    const touchCount = touchRef.current.count;

    // --- Clear with trail ---
    ctx.fillStyle = 'rgba(10, 10, 15, 0.06)';
    ctx.fillRect(0, 0, w, h);

    // --- Ambient nebula driven by audio params ---
    const nebHue = (fundamental * 0.3 + t * 5) % 360;
    const nebRadius = 300 + Math.sin(t * 0.3) * 100 + lfoDepth * 0.3;
    const nebGrad = ctx.createRadialGradient(
      touchActive ? tx : cx, touchActive ? ty : cy, 0,
      touchActive ? tx : cx, touchActive ? ty : cy, nebRadius
    );
    nebGrad.addColorStop(0, `hsla(${nebHue}, 80%, 25%, ${touchActive ? 0.35 : 0.15})`);
    nebGrad.addColorStop(0.3, `hsla(${(nebHue + 120) % 360}, 70%, 20%, ${0.08 + reverbMix * 0.1})`);
    nebGrad.addColorStop(0.7, `hsla(${(nebHue + 240) % 360}, 60%, 15%, ${0.04 + delayFeedback * 0.06})`);
    nebGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = nebGrad;
    ctx.fillRect(0, 0, w, h);

    // --- Central glow pulsing with LFO ---
    const lfoPhase = Math.sin(t * lfoRate * Math.PI * 2) * 0.5 + 0.5;
    const pulseR = 80 + lfoPhase * 60 + force * 50 + chorusDepth * 30;
    const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR);
    const glowHue = (t * 15 + filterFreq * 0.01) % 360;
    glowGrad.addColorStop(0, `hsla(${glowHue}, 90%, ${35 + lfoPhase * 25}%, ${0.4 + lfoPhase * 0.3})`);
    glowGrad.addColorStop(0.3, `hsla(${(glowHue + 60) % 360}, 80%, ${25 + distortionAmount * 20}%, ${0.15 + lfoPhase * 0.1})`);
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, w, h);

    // --- Harmonic rings ---
    const maxRadius = Math.min(w, h) * 0.42;
    
    overtoneGains.forEach((gain: number, i: number) => {
      if (gain < 0.01) return;
      const harmonic = i + 1;
      const baseRadius = (maxRadius / 16) * harmonic + Math.sin(t * 0.5 + i * 0.7) * 5;
      const rad = baseRadius + Math.sin(t * 2 + i * 1.3 + lfoPhase * 2) * 10;
      const hue = (t * 20 + i * 25 + fundamental * 0.1) % 360;
      const alpha = gain * (0.4 + lfoPhase * 0.2);
      const lineW = 1.5 + gain * 6 + distortionAmount * 4;

      // Outer glow ring
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue}, 90%, 60%, ${alpha * 0.3})`;
      ctx.lineWidth = lineW + 8;
      ctx.shadowColor = `hsla(${hue}, 100%, 50%, ${alpha * 0.5})`;
      ctx.shadowBlur = 15 + gain * 25;
      ctx.stroke();

      // Inner bright ring
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue}, 100%, 80%, ${alpha * 0.8})`;
      ctx.lineWidth = lineW * 0.5;
      ctx.shadowBlur = 0;
      ctx.stroke();

      // Touch-reactive markers on each ring
      const markers = Math.max(4, Math.floor(harmonic * 2 * (1 + force * 0.5)));
      for (let j = 0; j < markers; j++) {
        const angle = (j / markers) * Math.PI * 2 + t * (0.3 + harmonic * 0.04) + detune * 0.001;
        const mx = cx + Math.cos(angle) * rad;
        const my = cy + Math.sin(angle) * rad;
        const mSize = 2 + gain * 5 + (touchActive ? force * 4 : 0);

        // Marker dot
        ctx.beginPath();
        ctx.arc(mx, my, mSize, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue + 30}, 95%, 75%, ${gain * (0.5 + lfoPhase * 0.3)})`;
        ctx.shadowColor = `hsla(${hue + 30}, 100%, 60%, ${gain * 0.5})`;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Line to center when touch active
        if (touchActive && j % 3 === 0 && gain > 0.2) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(mx, my);
          ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${gain * 0.1 * force})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }

        // Spawn particles
        if (Math.random() < gain * 0.3 + (touchActive ? 0.1 : 0)) {
          particlesRef.current.push({
            x: mx, y: my,
            vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
            life: 0, maxLife: 20 + Math.random() * 40 + gain * 20,
            hue: hue + Math.random() * 40 - 20, size: 1 + gain * 3 + Math.random() * 2,
            type: Math.random() > 0.5 ? 'spark' : 'glow',
            harmonicIdx: i,
          });
        }
      }
    });

    // --- Touch-reactive waveform overlay ---
    if (touchActive || isPlaying) {
      ctx.beginPath();
      const waveW = 280 + force * 80;
      const waveH = 40 + force * 30 + lfoPhase * 20;
      const sampleCount = 120;

      for (let i = 0; i <= sampleCount; i++) {
        const nx = (i / sampleCount) * 2 - 1;
        const px = cx + nx * waveW;
        let sum = 0;
        
        overtoneGains.forEach((gain: number, hi: number) => {
          if (gain < 0.01) return;
          const h = hi + 1;
          sum += Math.sin(nx * Math.PI * h + t * 2 * h + lfoPhase * h * 0.5) * gain * waveH;
        });

        // Add detune/chorus wobble
        sum += Math.sin(nx * Math.PI * 4 + t * 3 + chorusDepth * 5) * waveH * 0.2 * chorusDepth;

        const py = cy + sum * 0.5;
        
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }

      const waveHue = (t * 30 + filterFreq * 0.02) % 360;
      ctx.strokeStyle = `hsla(${waveHue}, 100%, ${60 + lfoPhase * 20}%, ${0.6 + force * 0.3})`;
      ctx.lineWidth = 2 + distortionAmount * 3;
      ctx.shadowColor = `hsla(${waveHue}, 100%, 50%, ${0.5 + force * 0.3})`;
      ctx.shadowBlur = 15 + lfoPhase * 20;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // --- Particles ---
    particlesRef.current = particlesRef.current.filter((p: Particle) => {
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.vy += 0.02; // gentle gravity
      p.vx += Math.sin(t * 2 + p.harmonicIdx) * 0.01 * lfoPhase;

      // Touch attraction
      if (touchActive) {
        const dx = tx - p.x;
        const dy = ty - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          p.vx += (dx / dist) * 0.05 * force;
          p.vy += (dy / dist) * 0.05 * force;
        }
      }

      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (alpha <= 0.01) return false;

      ctx.save();
      const sat = 80 + Math.sin(t + p.harmonicIdx) * 10;
      const lit = 50 + alpha * 30;

      if (p.type === 'glow') {
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        grad.addColorStop(0, `hsla(${p.hue}, ${sat}%, ${lit}%, ${alpha * 0.6})`);
        grad.addColorStop(0.5, `hsla(${p.hue}, ${sat}%, ${lit}%, ${alpha * 0.2})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Spark with line trail
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, ${sat}%, ${lit}%, ${alpha * 0.8})`;
        ctx.shadowColor = `hsla(${p.hue}, 100%, 60%, ${alpha * 0.5})`;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Tiny trail
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
        ctx.strokeStyle = `hsla(${p.hue}, ${sat}%, ${lit}%, ${alpha * 0.2})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
      return true;
    });

    // Limit particles
    if (particlesRef.current.length > 400) {
      particlesRef.current = particlesRef.current.slice(-300);
    }

    // --- Spectrum analyzer (bottom-left corner) ---
    const sw = 140, sh = 40;
    const sx = 10, sy = h - sh - 10;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(sx, sy, sw, sh, 6);
    ctx.fill();

    overtoneGains.forEach((gain: number, i: number) => {
      if (i >= 16) return;
      const bw = sw / 16;
      const bh = gain * sh * 0.8;
      const hh = (t * 10 + i * 20 + fundamental * 0.05) % 360;
      ctx.fillStyle = `hsla(${hh}, 80%, 60%, 0.7)`;
      ctx.fillRect(sx + i * bw, sy + sh - bh, bw - 1, bh);
    });

    // --- Info overlay ---
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${fundamental.toFixed(0)}Hz`, 15, 20);
    ctx.fillText(waveform.toUpperCase(), 15, 32);
    
    ctx.textAlign = 'right';
    ctx.fillText(`F:${filterFreq.toFixed(0)}`, w - 15, 20);
    ctx.fillText(`D:${(delayFeedback * 100).toFixed(0)}%`, w - 15, 32);

    // Touch info when active
    if (touchActive) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + force * 0.3})`;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${touchCount} touch${touchCount > 1 ? 'es' : ''} | F:${(force * 100).toFixed(0)}%`, cx, h - 14);
    }

    // Gesture hint (fades out)
    if (t < 4) {
      ctx.fillStyle = `rgba(255,255,255,${0.5 - t * 0.125})`;
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('↕ FILTER  ↔ DETUNE  TAP NOTE', cx, h * 0.7);
    }

    animFrameRef.current = requestAnimationFrame(draw);
  }, [store]);

  // Canvas setup + animation loop
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

  // Touch/mouse handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPos = (x: number, y: number) => {
      const rect = canvas.getBoundingClientRect();
      return { x: x - rect.left, y: y - rect.top };
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0]!;
      const pos = getPos(t.clientX, t.clientY);
      touchRef.current.x = pos.x;
      touchRef.current.y = pos.y;
      touchRef.current.active = true;
      touchRef.current.count = e.touches.length;
      touchRef.current.force = t.force || 0.5;

      gestureRef.current.startX = pos.x;
      gestureRef.current.startY = pos.y;
      gestureRef.current.startTime = Date.now();
      gestureRef.current.triggered = false;

      const rect = canvas.getBoundingClientRect();
      const normX = pos.x / rect.width;
      const normY = pos.y / rect.height;

      // Double tap detection
      const now = Date.now();
      if (now - lastTapRef.current < 300 && e.touches.length === 1) {
        // Double tap: toggle drawer
        store.setDrawerOpen(!store.drawerOpen);
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      if (e.touches.length === 1) {
        // Single tap: trigger note based on position
        // Horizontal: pitch, Vertical: velocity
        const noteIndex = Math.floor(normX * NOTES.length);
        const note = NOTES[Math.min(noteIndex, NOTES.length - 1)];
        const vel = 1 - normY;
        store.triggerFreq(NOTE_FREQS[note] || 440, Math.max(0.2, Math.min(1, vel)));
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0]!;
      const pos = getPos(t.clientX, t.clientY);
      touchRef.current.x = pos.x;
      touchRef.current.y = pos.y;
      touchRef.current.count = e.touches.length;
      touchRef.current.force = t.force || 0.5;

      const rect = canvas.getBoundingClientRect();
      const normX = pos.x / rect.width;
      const normY = pos.y / rect.height;

      // 1 finger: vertical = filter, horizontal = detune
      if (e.touches.length === 1 && !gestureRef.current.triggered) {
        const filtFreq = 50 + normY * normY * 9000;
        store.setFilter(filtFreq, 0.5 + (1 - normY) * 5);
        store.setDetune((normX - 0.5) * 100);
      }

      // 2 fingers: vertical = reverb, horizontal = delay
      if (e.touches.length === 2) {
        store.setReverbMix(Math.max(0, Math.min(1, 1 - normY)));
        store.setDelayTime(0.05 + normX * 1.5);
        store.setChorusDepth(Math.max(0, Math.min(1, normY)));
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 0) {
        touchRef.current.active = false;
      }
      touchRef.current.count = e.touches.length;
    };

    // Mouse fallback
    const handleMouseDown = (e: MouseEvent) => {
      const pos = getPos(e.clientX, e.clientY);
      touchRef.current.x = pos.x;
      touchRef.current.y = pos.y;
      touchRef.current.active = true;
      touchRef.current.count = 1;
      touchRef.current.force = 0.5;

      const rect = canvas.getBoundingClientRect();
      const normX = pos.x / rect.width;
      const noteIndex = Math.floor(normX * NOTES.length);
      const note = NOTES[Math.min(noteIndex, NOTES.length - 1)];
      store.triggerFreq(NOTE_FREQS[note] || 440, 0.5);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (e.buttons > 0) {
        const pos = getPos(e.clientX, e.clientY);
        touchRef.current.x = pos.x;
        touchRef.current.y = pos.y;
        const rect = canvas.getBoundingClientRect();
        const normX = pos.x / rect.width;
        const normY = pos.y / rect.height;
        store.setFilter(50 + normY * normY * 9000, 0.5 + (1 - normY) * 5);
        store.setDetune((normX - 0.5) * 100);
      }
    };

    const handleMouseUp = () => {
      touchRef.current.active = false;
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [store]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full touch-none select-none"
    />
  );
}
