import { SkyEnemyKind, SkyPlatformKind } from './skyHop';

export type ParticleShape = 'circle' | 'spark' | 'shard' | 'star' | 'ring';

export interface PoolParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  maxSize: number;
  alpha: number;
  decay: number;
  gravity: number;
  color: string;
  shape: ParticleShape;
  rot: number;
  vrot: number;
}

export interface ParticlePool {
  items: PoolParticle[];
  cursor: number;
}

export const PARTICLE_POOL_CAPACITY = 160;

export function createParticlePool(capacity = PARTICLE_POOL_CAPACITY): ParticlePool {
  return {
    cursor: 0,
    items: Array.from({ length: capacity }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 4,
      maxSize: 20,
      alpha: 0,
      decay: 1,
      gravity: 0,
      color: '#ffffff',
      shape: 'circle',
      rot: 0,
      vrot: 0,
    })),
  };
}

export function clearParticlePool(pool: ParticlePool): void {
  for (const p of pool.items) {
    p.active = false;
  }
}

export function spawnPooledParticle(
  pool: ParticlePool,
  opts: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    maxSize?: number;
    decay: number;
    gravity?: number;
    shape?: ParticleShape;
    rot?: number;
    vrot?: number;
  }
): void {
  const p = pool.items[pool.cursor];
  pool.cursor = (pool.cursor + 1) % pool.items.length;
  p.active = true;
  p.x = opts.x;
  p.y = opts.y;
  p.vx = opts.vx;
  p.vy = opts.vy;
  p.color = opts.color;
  p.size = opts.size;
  p.maxSize = opts.maxSize ?? opts.size * 3.5;
  p.alpha = 1;
  p.decay = opts.decay;
  p.gravity = opts.gravity ?? 0;
  p.shape = opts.shape ?? 'circle';
  p.rot = opts.rot ?? Math.random() * Math.PI * 2;
  p.vrot = opts.vrot ?? (Math.random() - 0.5) * 8;
}

/**
 * Emits visual burst feedback for a successful jump / platform landing ("salto bem-sucedido").
 */
export function emitJumpBurst(
  pool: ParticlePool,
  x: number,
  y: number,
  kind: SkyPlatformKind,
  canvasWidth: number,
  rng = Math.random
): number {
  const baseUnit = Math.max(2.6, canvasWidth * 0.0085);
  let emitted = 0;

  // Expanding shockwave ring on platform contact
  const isFastCrystal = kind === 'fast_fragile';
  const isSpring = kind === 'spring' || kind === 'fragile_spring';
  const isCrystal =
    kind === 'fragile' ||
    isFastCrystal ||
    kind === 'fragile_spring' ||
    kind === 'fragile_vertical';
  const isPhase = kind === 'phase' || kind === 'phase_vertical';
  const isPortal = kind === 'portal';

  spawnPooledParticle(pool, {
    x,
    y,
    vx: 0,
    vy: 0.04,
    color: isPortal
      ? '#c084fc'
      : isSpring
      ? '#fbbf24'
      : isFastCrystal
      ? '#22d3ee'
      : isCrystal
      ? '#a5f3fc'
      : isPhase
      ? '#e879f9'
      : kind === 'vertical'
      ? '#38bdf8'
      : '#fff8ed',
    size: baseUnit * 2.2,
    maxSize: baseUnit * (isSpring || isPortal ? 14 : 9.5),
    decay: isSpring ? 2.4 : isFastCrystal ? 3.8 : 3.2,
    shape: 'ring',
    rot: 0,
    vrot: 0,
  });
  emitted++;

  if (isSpring) {
    for (let i = 0; i < 18; i++) {
      const spread = (rng() - 0.5) * 0.72;
      const upSpeed = -(0.15 + rng() * 0.45);
      spawnPooledParticle(pool, {
        x: x + (rng() - 0.5) * 0.08,
        y,
        vx: spread,
        vy: upSpeed,
        color:
          kind === 'fragile_spring'
            ? i % 3 === 0
              ? '#67e8f9'
              : i % 3 === 1
              ? '#fde047'
              : '#fb923c'
            : i % 3 === 0
            ? '#fef08a'
            : i % 3 === 1
            ? '#fbbf24'
            : '#ef4444',
        size: baseUnit * (1.05 + rng() * 0.45),
        decay: 1.9 + rng() * 0.7,
        gravity: 0.55,
        shape:
          kind === 'fragile_spring' && i % 3 === 0
            ? 'shard'
            : i % 2 === 0
            ? 'star'
            : 'spark',
        rot: Math.atan2(upSpeed, spread),
        vrot: i % 2 === 0 ? (rng() - 0.5) * 9 : 0,
      });
      emitted++;
    }
    return emitted;
  }

  if (isCrystal) {
    for (let i = 0; i < 14; i++) {
      spawnPooledParticle(pool, {
        x: x + (rng() - 0.5) * 0.14,
        y,
        vx: (rng() - 0.5) * 0.48,
        vy: -0.1 + rng() * 0.36,
        color: isFastCrystal
          ? i % 2 === 0
            ? '#22d3ee'
            : '#fde047'
          : kind === 'fragile_vertical'
          ? i % 2 === 0
            ? '#7dd3fc'
            : '#bae6fd'
          : i % 2 === 0
          ? '#a5f3fc'
          : '#c4b5fd',
        size: baseUnit * (1.2 + rng() * 0.5),
        decay: isFastCrystal ? 2.1 + rng() * 0.4 : 1.65 + rng() * 0.4,
        gravity: 0.95,
        shape: 'shard',
      });
      emitted++;
    }
    return emitted;
  }

  // Standard / moving / vertical / phase / portal platform landing puff + directional sparks
  const count =
    kind === 'moving' || kind === 'vertical' || isPhase || isPortal ? 11 : 9;
  for (let i = 0; i < count; i++) {
    const dir = i % 2 === 0 ? -1 : 1;
    const vx = dir * (0.1 + rng() * 0.28);
    const vy = -(0.04 + rng() * 0.16);
    const color = isPortal
      ? i % 2 === 0
        ? '#22d3ee'
        : '#f0abfc'
      : isPhase
      ? i % 2 === 0
        ? '#f0abfc'
        : '#67e8f9'
      : kind === 'vertical'
      ? i % 2 === 0
        ? '#7dd3fc'
        : '#fef08a'
      : kind === 'moving' && i % 3 === 0
      ? '#fca5a5'
      : i % 2 === 0
      ? '#fef3c7'
      : '#fffdf9';
    spawnPooledParticle(pool, {
      x: x + (rng() - 0.5) * 0.05,
      y,
      vx,
      vy,
      color,
      size: baseUnit * (0.9 + rng() * 0.35),
      decay: 2.5 + rng() * 0.7,
      gravity: 0.25,
      shape: i < 4 ? 'spark' : isPortal ? 'star' : 'circle',
      rot: Math.atan2(vy, vx),
      vrot: 0,
    });
    emitted++;
  }
  return emitted;
}

/**
 * Emits dual cosmic warp bursts at both the entry portal and exit destination.
 */
export function emitPortalWarpBurst(
  pool: ParticlePool,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  canvasWidth: number,
  rng = Math.random
): number {
  const baseUnit = Math.max(2.8, canvasWidth * 0.009);
  let emitted = 0;

  for (const [px, py, ringColor] of [
    [fromX, fromY, '#22d3ee'] as const,
    [toX, toY, '#e879f9'] as const,
  ]) {
    spawnPooledParticle(pool, {
      x: px,
      y: py,
      vx: 0,
      vy: 0,
      color: ringColor,
      size: baseUnit * 2.4,
      maxSize: baseUnit * 15,
      decay: 2.4,
      shape: 'ring',
      rot: 0,
      vrot: 0,
    });
    emitted++;

    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + rng() * 0.4;
      const spd = 0.16 + rng() * 0.28;
      spawnPooledParticle(pool, {
        x: px,
        y: py,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color: i % 2 === 0 ? '#67e8f9' : '#fde047',
        size: baseUnit * (1.05 + rng() * 0.35),
        decay: 2.2 + rng() * 0.5,
        gravity: 0,
        shape: i % 2 === 0 ? 'star' : 'spark',
        rot: ang,
        vrot: (rng() - 0.5) * 8,
      });
      emitted++;
    }
  }

  // Luminous tether trail along the teleport path
  for (let s = 1; s <= 5; s++) {
    const t = s / 6;
    spawnPooledParticle(pool, {
      x: fromX + (toX - fromX) * t,
      y: fromY + (toY - fromY) * t,
      vx: (rng() - 0.5) * 0.06,
      vy: -0.05,
      color: s % 2 === 0 ? '#f0abfc' : '#22d3ee',
      size: baseUnit * 1.1,
      decay: 3.0,
      gravity: 0,
      shape: 'star',
    });
    emitted++;
  }

  return emitted;
}

/**
 * Emits crisp impact feedback when an enemy collides with or repels the player ("colisão com inimigo").
 */
export function emitEnemyCollisionBurst(
  pool: ParticlePool,
  x: number,
  y: number,
  pushVx: number,
  enemyKind: SkyEnemyKind | null,
  canvasWidth: number,
  rng = Math.random
): number {
  const baseUnit = Math.max(3, canvasWidth * 0.01);
  const primaryColor = enemyKind === 'repulsor' ? '#c084fc' : enemyKind === 'charger' ? '#f97316' : '#ef4444';
  const secondaryColor = enemyKind === 'repulsor' ? '#38bdf8' : '#fde047';
  let emitted = 0;

  // Dual shockwave rings at impact point
  spawnPooledParticle(pool, {
    x,
    y,
    vx: 0,
    vy: 0,
    color: primaryColor,
    size: baseUnit * 2.5,
    maxSize: baseUnit * 16,
    decay: 2.6,
    shape: 'ring',
    rot: 0,
    vrot: 0,
  });
  emitted++;

  spawnPooledParticle(pool, {
    x,
    y,
    vx: 0,
    vy: 0,
    color: '#ffffff',
    size: baseUnit * 1.5,
    maxSize: baseUnit * 10,
    decay: 3.8,
    shape: 'ring',
    rot: 0,
    vrot: 0,
  });
  emitted++;

  // Directional knockback sparks + impact stars
  const pushBias = Math.sign(pushVx) * 0.28;
  for (let i = 0; i < 20; i++) {
    const angle = rng() * Math.PI * 2;
    const speed = 0.24 + rng() * 0.48;
    const vx = Math.cos(angle) * speed + pushBias;
    const vy = Math.sin(angle) * speed;
    const isSpark = i % 2 === 0;
    spawnPooledParticle(pool, {
      x,
      y,
      vx,
      vy,
      color: i % 3 === 0 ? '#ffffff' : isSpark ? primaryColor : secondaryColor,
      size: baseUnit * (isSpark ? 1.25 : 0.95),
      decay: 2.0 + rng() * 0.9,
      gravity: 0.45,
      shape: isSpark ? 'spark' : 'star',
      rot: isSpark ? Math.atan2(vy, vx) : rng() * Math.PI * 2,
      vrot: isSpark ? 0 : (rng() - 0.5) * 12,
    });
    emitted++;
  }

  return emitted;
}

export function stepParticles(pool: ParticlePool, dt: number): void {
  for (const pt of pool.items) {
    if (!pt.active) continue;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    if (pt.gravity !== 0) {
      pt.vy += pt.gravity * dt;
    }
    if (pt.shape === 'ring') {
      pt.size += (pt.maxSize - pt.size) * Math.min(1, dt * 8);
    } else {
      pt.rot += pt.vrot * dt;
    }
    pt.alpha -= pt.decay * dt;
    if (pt.alpha <= 0) {
      pt.active = false;
    }
  }
}

export function countActiveParticles(pool: ParticlePool): number {
  let count = 0;
  for (const pt of pool.items) {
    if (pt.active) count++;
  }
  return count;
}
