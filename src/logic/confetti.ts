export type ConfettiShape = 'rect' | 'circle' | 'star';

export interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vr: number;
  tiltPhase: number;
  tiltSpeed: number;
  shape: ConfettiShape;
  opacity: number;
  life: number;
  maxLife: number;
}

export const CONFETTI_PALETTE: readonly string[] = [
  '#facc15', // Soviet gold
  '#dc2626', // Crimson red
  '#16a34a', // Emerald
  '#f59e0b', // Warm amber
  '#38bdf8', // Sky cyan
  '#fb7185', // Rose
  '#a855f7', // Cosmic violet
  '#fde047', // Bright lemon gold
];

const SHAPES: readonly ConfettiShape[] = ['rect', 'rect', 'circle', 'star'];

export function createConfettiBurst(
  width: number,
  height: number,
  count = 96
): ConfettiParticle[] {
  const safeW = Math.max(320, width);
  const safeH = Math.max(320, height);
  const particles: ConfettiParticle[] = [];

  for (let i = 0; i < count; i++) {
    // Mix 3 celebratory launch zones: left cannon, top shower, right cannon
    const zone = i % 3;
    let x = safeW * 0.5;
    let y = safeH * 0.25;
    let vx = 0;
    let vy = 0;

    if (zone === 0) {
      x = safeW * (0.08 + Math.random() * 0.14);
      y = safeH * (0.48 + Math.random() * 0.22);
      vx = 180 + Math.random() * 340;
      vy = -(380 + Math.random() * 360);
    } else if (zone === 1) {
      x = safeW * (0.12 + Math.random() * 0.76);
      y = -12 - Math.random() * 60;
      vx = (Math.random() - 0.5) * 240;
      vy = 80 + Math.random() * 190;
    } else {
      x = safeW * (0.78 + Math.random() * 0.14);
      y = safeH * (0.48 + Math.random() * 0.22);
      vx = -(180 + Math.random() * 340);
      vy = -(380 + Math.random() * 360);
    }

    particles.push({
      x,
      y,
      vx,
      vy,
      size: 6 + Math.random() * 6,
      color: CONFETTI_PALETTE[i % CONFETTI_PALETTE.length],
      rotation: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 9,
      tiltPhase: Math.random() * Math.PI * 2,
      tiltSpeed: 5 + Math.random() * 7,
      shape: SHAPES[i % SHAPES.length],
      opacity: 1,
      life: 0,
      maxLife: 2.6 + Math.random() * 1.2,
    });
  }

  return particles;
}

export function stepConfettiParticles(
  particles: readonly ConfettiParticle[],
  dtSec: number,
  viewportHeight: number
): ConfettiParticle[] {
  const dt = Math.min(0.05, Math.max(0.001, dtSec));
  const drag = Math.pow(0.985, dt * 60);
  const gravity = 560;
  const maxY = Math.max(320, viewportHeight) + 40;
  const next: ConfettiParticle[] = [];

  for (const p of particles) {
    const life = p.life + dt;
    if (life >= p.maxLife) continue;

    const vx = p.vx * drag;
    const vy = (p.vy + gravity * dt) * drag;
    const x = p.x + vx * dt;
    const y = p.y + vy * dt;

    if (y > maxY) continue;

    const fadeStart = p.maxLife * 0.72;
    const opacity =
      life > fadeStart
        ? Math.max(0, 1 - (life - fadeStart) / Math.max(0.01, p.maxLife - fadeStart))
        : 1;

    next.push({
      ...p,
      x,
      y,
      vx,
      vy,
      rotation: p.rotation + p.vr * dt,
      tiltPhase: p.tiltPhase + p.tiltSpeed * dt,
      opacity,
      life,
    });
  }

  return next;
}
