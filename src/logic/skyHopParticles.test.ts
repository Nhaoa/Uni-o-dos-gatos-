import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearParticlePool,
  countActiveParticles,
  createParticlePool,
  emitEnemyCollisionBurst,
  emitJumpBurst,
  emitPortalWarpBurst,
  stepParticles,
} from './skyHopParticles';

test('particle pool reuses fixed capacity without growing', () => {
  const pool = createParticlePool(24);
  assert.equal(pool.items.length, 24);
  assert.equal(countActiveParticles(pool), 0);

  emitJumpBurst(pool, 0.5, 0.7, 'spring', 400, () => 0.5);
  emitEnemyCollisionBurst(pool, 0.5, 0.5, 1.0, 'patrol', 400, () => 0.5);

  assert.equal(pool.items.length, 24);
  assert.equal(countActiveParticles(pool), 24);

  clearParticlePool(pool);
  assert.equal(countActiveParticles(pool), 0);
});

test('emitJumpBurst spawns expanding ring and themed jump particles per platform kind', () => {
  const pool = createParticlePool();
  const normalCount = emitJumpBurst(pool, 0.5, 0.7, 'normal', 420, () => 0.5);
  assert.ok(normalCount >= 9);
  const activeNormal = pool.items.filter((p) => p.active);
  assert.ok(activeNormal.some((p) => p.shape === 'ring'));
  assert.ok(activeNormal.some((p) => p.shape === 'spark' || p.shape === 'circle'));

  clearParticlePool(pool);
  const fragileCount = emitJumpBurst(pool, 0.5, 0.7, 'fragile', 420, () => 0.5);
  assert.ok(fragileCount >= 14);
  assert.ok(pool.items.some((p) => p.active && p.shape === 'shard'));

  clearParticlePool(pool);
  const springCount = emitJumpBurst(pool, 0.5, 0.7, 'spring', 420, () => 0.5);
  assert.ok(springCount >= 18);
  assert.ok(pool.items.some((p) => p.active && p.shape === 'star'));

  clearParticlePool(pool);
  const fastFragileCount = emitJumpBurst(pool, 0.5, 0.7, 'fast_fragile', 420, () => 0.5);
  assert.ok(fastFragileCount >= 14);
  assert.ok(pool.items.some((p) => p.active && p.shape === 'shard' && p.color === '#22d3ee'));

  clearParticlePool(pool);
  const fSpringCount = emitJumpBurst(pool, 0.5, 0.7, 'fragile_spring', 420, () => 0.5);
  assert.ok(fSpringCount >= 18);
  assert.ok(pool.items.some((p) => p.active && p.shape === 'shard'));

  clearParticlePool(pool);
  const fVertCount = emitJumpBurst(pool, 0.5, 0.7, 'fragile_vertical', 420, () => 0.5);
  assert.ok(fVertCount >= 14);
  assert.ok(pool.items.some((p) => p.active && p.shape === 'shard' && p.color === '#7dd3fc'));

  clearParticlePool(pool);
  const phaseCount = emitJumpBurst(pool, 0.5, 0.7, 'phase', 420, () => 0.5);
  assert.ok(phaseCount >= 11);
  assert.ok(pool.items.some((p) => p.active && p.shape === 'ring' && p.color === '#e879f9'));

  clearParticlePool(pool);
  const pVertCount = emitJumpBurst(pool, 0.5, 0.7, 'phase_vertical', 420, () => 0.5);
  assert.ok(pVertCount >= 11);
  assert.ok(pool.items.some((p) => p.active && p.shape === 'ring' && p.color === '#e879f9'));

  clearParticlePool(pool);
  const vertCount = emitJumpBurst(pool, 0.5, 0.7, 'vertical', 420, () => 0.5);
  assert.ok(vertCount >= 11);
  assert.ok(pool.items.some((p) => p.active && p.shape === 'ring' && p.color === '#38bdf8'));

  clearParticlePool(pool);
  const warpCount = emitPortalWarpBurst(pool, 0.3, 0.6, 0.7, 0.2, 420, () => 0.5);
  assert.ok(warpCount >= 20);
  assert.equal(pool.items.filter((p) => p.active && p.shape === 'ring').length, 2);
});

test('emitEnemyCollisionBurst spawns impact rings and directional sparks biased toward knockback', () => {
  const pool = createParticlePool();
  let step = 0;
  const cycleRng = () => {
    const val = (step % 8) / 8;
    step++;
    return val;
  };
  const count = emitEnemyCollisionBurst(pool, 0.4, 0.5, 1.2, 'charger', 420, cycleRng);
  assert.ok(count >= 20);

  const active = pool.items.filter((p) => p.active);
  assert.equal(active.filter((p) => p.shape === 'ring').length, 2);
  const sparks = active.filter((p) => p.shape === 'spark');
  assert.ok(sparks.length >= 8);
  const avgVx = sparks.reduce((sum, s) => sum + s.vx, 0) / sparks.length;
  assert.ok(avgVx > 0.1, `Expected positive knockback spark bias, got ${avgVx}`);
});

test('stepParticles expands rings, applies gravity, and deactivates expired particles', () => {
  const pool = createParticlePool();
  emitJumpBurst(pool, 0.5, 0.5, 'normal', 400, () => 0.5);
  const ring = pool.items.find((p) => p.active && p.shape === 'ring')!;
  const initialRingSize = ring.size;

  stepParticles(pool, 0.1);
  assert.ok(ring.size > initialRingSize);
  assert.ok(ring.alpha < 1);

  // Advance long enough for all burst particles to expire cleanly
  for (let i = 0; i < 20; i++) {
    stepParticles(pool, 0.1);
  }
  assert.equal(countActiveParticles(pool), 0);
});
