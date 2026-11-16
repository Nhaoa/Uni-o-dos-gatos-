import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ConfettiParticle,
  createConfettiBurst,
  stepConfettiParticles,
} from '../../logic/confetti';

interface AchievementConfettiProps {
  burstKey: number;
  active: boolean;
  onDone?: () => void;
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  radius: number
) {
  const inner = radius * 0.44;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const r = i % 2 === 0 ? radius : inner;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

export const AchievementConfetti: React.FC<AchievementConfettiProps> = ({
  burstKey,
  active,
  onDone,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!active || burstKey <= 0) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      onDoneRef.current?.();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const syncSize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    };

    let dims = syncSize();
    let particles: ConfettiParticle[] = createConfettiBurst(dims.w, dims.h, 108);
    let lastTs = performance.now();
    let rafId = 0;

    const handleResize = () => {
      dims = syncSize();
    };
    window.addEventListener('resize', handleResize);

    const tick = (now: number) => {
      const dtSec = Math.min(0.05, Math.max(0.008, (now - lastTs) / 1000));
      lastTs = now;

      particles = stepConfettiParticles(particles, dtSec, dims.h);
      ctx.clearRect(0, 0, dims.w, dims.h);

      for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        const flutter = 0.35 + 0.65 * Math.abs(Math.cos(p.tiltPhase));
        ctx.scale(1, flutter);
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.42, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'star') {
          drawStar(ctx, p.size * 0.62);
        } else {
          ctx.fillRect(-p.size * 0.55, -p.size * 0.32, p.size * 1.1, p.size * 0.64);
        }
        ctx.restore();
      }

      if (particles.length > 0) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, dims.w, dims.h);
        onDoneRef.current?.();
      }
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [active, burstKey]);

  if (!active || burstKey <= 0 || typeof document === 'undefined') return null;

  return createPortal(
    <canvas
      ref={canvasRef}
      data-testid="achievement-confetti-canvas"
      aria-hidden="true"
      className="fixed inset-0 z-[120] pointer-events-none"
    />,
    document.body
  );
};
