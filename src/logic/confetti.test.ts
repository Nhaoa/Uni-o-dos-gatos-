import test from 'node:test';
import assert from 'node:assert/strict';
import { createConfettiBurst, stepConfettiParticles } from './confetti';

test('createConfettiBurst spawns particles across multiple launch zones within viewport', () => {
  const particles = createConfettiBurst(1200, 800, 60);
  assert.equal(particles.length, 60);
  assert.ok(particles.every((p) => p.size >= 6 && p.opacity === 1 && p.maxLife > 2));
  assert.ok(particles.some((p) => p.vx > 0));
  assert.ok(particles.some((p) => p.vx < 0));
});

test('stepConfettiParticles advances positions under gravity and expires particles cleanly', () => {
  let particles = createConfettiBurst(1000, 700, 30);
  const initialY = particles[1].y;

  for (let i = 0; i < 10; i++) {
    particles = stepConfettiParticles(particles, 0.03, 700);
  }
  assert.ok(particles.length > 0);
  // Top shower particle should have fallen downward
  const fallen = particles.find((p) => p.shape === 'rect');
  assert.ok(fallen !== undefined);
  assert.ok(particles[1].y > initialY);

  // Advancing past maxLife removes all particles
  for (let i = 0; i < 160; i++) {
    particles = stepConfettiParticles(particles, 0.04, 700);
  }
  assert.equal(particles.length, 0);
});
