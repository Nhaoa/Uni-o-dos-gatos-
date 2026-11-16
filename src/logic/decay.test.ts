import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultSharedState } from './defaultState.ts';
import {
  applyRealisticCatDecay,
  DECAY_INTERVAL_MS,
  ENERGY_DROP_PER_HOUR,
  HAPPINESS_DROP_PER_HOUR,
  HUNGER_DROP_PER_HOUR,
  MIN_STAT_FLOOR,
  SLEEP_ENERGY_GAIN_PER_HOUR,
} from './decay.ts';

test('does not decay stats before minimum interval threshold', () => {
  const base = createDefaultSharedState();
  const now = 1_700_000_000_000;
  base.lastStatsUpdateTime = now - (DECAY_INTERVAL_MS - 1000);
  base.cat1.hunger = 90;

  const res = applyRealisticCatDecay(base, now);
  assert.equal(res.changed, false);
  assert.equal(res.state.cat1.hunger, 90);
});

test('all stats drain from 100 to 0 in at most 8 hours (at least 3 full resets per day)', () => {
  assert.equal(MIN_STAT_FLOOR, 0);
  assert.ok(HUNGER_DROP_PER_HOUR >= 12.5);
  assert.ok(ENERGY_DROP_PER_HOUR >= 12.5);
  assert.ok(HAPPINESS_DROP_PER_HOUR >= 12.5);

  const base = createDefaultSharedState();
  const now = 1_700_000_000_000;
  const eightHoursMs = 8 * 60 * 60 * 1000;
  base.lastStatsUpdateTime = now - eightHoursMs;
  base.cat1.hunger = 100;
  base.cat1.energy = 100;
  base.cat1.happiness = 100;
  base.cat1.isSleeping = false;

  const res = applyRealisticCatDecay(base, now);
  assert.equal(res.changed, true);
  assert.equal(res.state.cat1.hunger, 0);
  assert.equal(res.state.cat1.energy, 0);
  assert.equal(res.state.cat1.happiness, 0);
  assert.equal(res.state.lastStatsUpdateTime, now);
});

test('decays hunger, energy, and happiness proportionally over 2 hours when awake', () => {
  const base = createDefaultSharedState();
  const now = 1_700_000_000_000;
  const twoHoursMs = 2 * 60 * 60 * 1000;
  base.lastStatsUpdateTime = now - twoHoursMs;
  base.cat1.hunger = 100;
  base.cat1.energy = 100;
  base.cat1.happiness = 100;

  const res = applyRealisticCatDecay(base, now);
  assert.equal(res.changed, true);
  assert.equal(res.state.cat1.hunger, 100 - 2 * HUNGER_DROP_PER_HOUR);
  assert.equal(res.state.cat1.energy, 100 - 2 * ENERGY_DROP_PER_HOUR);
  assert.equal(res.state.cat1.happiness, 100 - 2 * HAPPINESS_DROP_PER_HOUR);
});

test('regenerates energy toward 100 when cat is sleeping in its bed', () => {
  const base = createDefaultSharedState();
  const now = 1_700_000_000_000;
  const oneHourMs = 60 * 60 * 1000;
  base.lastStatsUpdateTime = now - oneHourMs;
  base.cat1.isSleeping = true;
  base.cat1.energy = 20;
  base.cat2.isSleeping = false;
  base.cat2.energy = 50;

  const res = applyRealisticCatDecay(base, now);
  assert.equal(res.changed, true);
  assert.equal(res.state.cat1.energy, 20 + SLEEP_ENERGY_GAIN_PER_HOUR);
  assert.equal(res.state.cat2.energy, 50 - ENERGY_DROP_PER_HOUR);
});

test('respects 72-hour offline cap and reaches 0 floor', () => {
  const base = createDefaultSharedState();
  const now = 1_700_000_000_000;
  base.lastStatsUpdateTime = now - 30 * 24 * 60 * 60 * 1000; // 30 days
  base.cat1.hunger = 40;
  base.cat2.energy = 25;

  const res = applyRealisticCatDecay(base, now);
  assert.equal(res.changed, true);
  assert.equal(res.state.cat1.hunger, 0);
  assert.equal(res.state.cat2.energy, 0);
});
