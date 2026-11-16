import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALTITUDE_SCROLL_SCALE,
  BASE_MAX_JUMP_HEIGHT,
  computeSkyHopLevelPawsReward,
  computeSkyHopReward,
  createEnemy,
  createInitialPlatforms,
  evaluateBounceAccuracy,
  FAST_FRAGILE_RESPAWN_SECONDS,
  findPortalDestination,
  FRAGILE_RESPAWN_SECONDS,
  PAWS_PER_LEVEL,
  getDifficultyParams,
  getPlatformTheme,
  getSkyBiome,
  getSkyScenario,
  isDisappearingPlatformKind,
  maintainPlatformLadder,
  MAX_SAFE_PLATFORM_GAP,
  PHASE_HIDDEN_SECONDS,
  PHASE_VISIBLE_SECONDS,
  recordSkyHopLeaderboard,
  recyclePlatform,
  resolveEnemyPush,
  resolvePlatformBounce,
  scrollPlatforms,
  SkyPlatform,
  updateEnemies,
  updatePlatforms,
} from './skyHop';

function makePlatform(overrides: Partial<SkyPlatform> = {}): SkyPlatform {
  return {
    id: 1,
    x: 0.3,
    y: 0.5,
    baseY: 0.5,
    ampY: 0,
    phase: 0,
    phaseTimer: 0,
    phaseVisible: true,
    portalCooldown: 0,
    w: 0.24,
    kind: 'normal',
    vx: 0,
    consumed: false,
    breakAnim: 1,
    respawnTimer: 0,
    bounceSquash: 0,
    ...overrides,
  };
}

test('fragile platform vanishes on first bounce and reappears after cooldown seconds', () => {
  const fragile = makePlatform({ kind: 'fragile' });

  // First landing bounces and breaks the fragile crystal
  const first = resolvePlatformBounce(0.4, 0.48, 0.6, fragile);
  assert.equal(first.bounced, true);
  assert.equal(first.kind, 'fragile');
  assert.equal(fragile.consumed, true);
  assert.equal(fragile.respawnTimer, FRAGILE_RESPAWN_SECONDS);

  // Immediately afterward, cat falls through
  const mid = resolvePlatformBounce(0.4, 0.48, 0.6, fragile);
  assert.equal(mid.bounced, false);

  // Advance simulation halfway through respawn delay -> still consumed
  updatePlatforms([fragile], FRAGILE_RESPAWN_SECONDS * 0.5);
  assert.equal(fragile.consumed, true);

  // Finish remaining respawn delay -> platform reappears and allows bouncing again
  const updateRes = updatePlatforms([fragile], FRAGILE_RESPAWN_SECONDS * 0.6);
  assert.equal(fragile.consumed, false);
  assert.equal(fragile.respawnTimer, 0);
  assert.equal(updateRes.reformedPositions.length, 1);

  const afterRespawn = resolvePlatformBounce(0.4, 0.48, 0.6, fragile);
  assert.equal(afterRespawn.bounced, true);
});

test('fast_fragile platform vanishes on first bounce and respawns faster than regular fragile', () => {
  assert.ok(FAST_FRAGILE_RESPAWN_SECONDS < FRAGILE_RESPAWN_SECONDS);
  const fastFragile = makePlatform({ kind: 'fast_fragile' });

  const first = resolvePlatformBounce(0.4, 0.48, 0.6, fastFragile);
  assert.equal(first.bounced, true);
  assert.equal(first.kind, 'fast_fragile');
  assert.equal(fastFragile.consumed, true);
  assert.equal(fastFragile.respawnTimer, FAST_FRAGILE_RESPAWN_SECONDS);

  const updateRes = updatePlatforms([fastFragile], FAST_FRAGILE_RESPAWN_SECONDS + 0.05);
  assert.equal(fastFragile.consumed, false);
  assert.equal(updateRes.reformedPositions.length, 1);
});

test('phase platform rapidly alternates visibility and rejects collisions while hidden', () => {
  const phasePlat = makePlatform({ kind: 'phase', phase: 0, phaseVisible: true });

  // While visible, bounces normally
  assert.equal(resolvePlatformBounce(0.4, 0.48, 0.6, phasePlat).bounced, true);

  // Advance into hidden window
  updatePlatforms([phasePlat], PHASE_VISIBLE_SECONDS + 0.1);
  assert.equal(phasePlat.phaseVisible, false);
  assert.equal(resolvePlatformBounce(0.4, 0.48, 0.6, phasePlat).bounced, false);

  // Advance past hidden window -> reforms and becomes solid again
  const res = updatePlatforms([phasePlat], PHASE_HIDDEN_SECONDS);
  assert.equal(phasePlat.phaseVisible, true);
  assert.equal(res.reformedPositions.length, 1);
  assert.equal(resolvePlatformBounce(0.4, 0.48, 0.6, phasePlat).bounced, true);
});

test('vertical platform oscillates up and down and keeps baseY synchronized via scrollPlatforms', () => {
  const vert = makePlatform({ kind: 'vertical', y: 0.4, baseY: 0.4, ampY: 0.06, phase: 0 });

  updatePlatforms([vert], 0.4);
  assert.notEqual(vert.y, vert.baseY);
  const offsetBeforeScroll = vert.y - vert.baseY;

  scrollPlatforms([vert], 0.12);
  assert.ok(Math.abs(vert.baseY - 0.52) < 1e-6);
  assert.ok(Math.abs((vert.y - vert.baseY) - offsetBeforeScroll) < 1e-6);

  // Verify bounce works on vertical platform
  const bounce = resolvePlatformBounce(0.4, vert.y - 0.02, 0.5, vert);
  assert.equal(bounce.bounced, true);
  assert.equal(bounce.kind, 'vertical');
});

test('getPlatformTheme evolves platform design styles across cosmic altitude tiers', () => {
  const styles = new Set([
    getPlatformTheme(100).style,    // earth -> cosmonaut
    getPlatformTheme(2500).style,   // moon -> lunar
    getPlatformTheme(6500).style,   // mars -> martian
    getPlatformTheme(8500).style,   // asteroid_belt -> asteroid
    getPlatformTheme(12500).style,  // saturn -> gas_giant
    getPlatformTheme(18500).style,  // constellations -> constellation
    getPlatformTheme(22500).style,  // galaxies -> galactic
  ]);
  assert.equal(styles.size, 7);
});

test('spring platform launches cat significantly higher than normal platform', () => {
  const normal = makePlatform({ id: 1, kind: 'normal' });
  const spring = makePlatform({ id: 2, kind: 'spring' });

  const resNormal = resolvePlatformBounce(0.4, 0.48, 0.5, normal);
  const resSpring = resolvePlatformBounce(0.4, 0.48, 0.5, spring);

  assert.equal(resNormal.bounced, true);
  assert.equal(resSpring.bounced, true);
  assert.ok(resSpring.newVy < resNormal.newVy);
});

test('recyclePlatform avoids spawning fragile platform immediately after another fragile', () => {
  const sample = makePlatform({
    id: 10,
    x: 0.4,
    y: 1.1,
    consumed: true,
    breakAnim: 0,
    respawnTimer: 1.2,
  });

  const spawnedFast = recyclePlatform(sample, 2500, false, 0.12);
  assert.ok(
    spawnedFast.kind === 'fragile' ||
      spawnedFast.kind === 'fast_fragile' ||
      spawnedFast.kind === 'phase'
  );
  assert.equal(spawnedFast.consumed, false);
  assert.equal(spawnedFast.respawnTimer, 0);

  const preventedFragile = recyclePlatform(sample, 2500, true, 0.12);
  assert.notEqual(preventedFragile.kind, 'fragile');
  assert.notEqual(preventedFragile.kind, 'fast_fragile');
  assert.notEqual(preventedFragile.kind, 'phase');
});

test('getSkyScenario changes every 2000 altitude through planets, belts, solar system, constellations, and galaxies', () => {
  const expected: Array<[number, string]> = [
    [0, 'earth'],
    [1999, 'earth'],
    [2000, 'moon'],
    [4000, 'inner_planets'],
    [6000, 'mars'],
    [8000, 'asteroid_belt'],
    [10000, 'jupiter'],
    [12000, 'saturn'],
    [14000, 'ice_giants'],
    [16000, 'solar_system'],
    [18000, 'constellations'],
    [20000, 'nebula_milkyway'],
    [22000, 'galaxies'],
    [24000, 'galaxies'],
  ];

  for (const [alt, id] of expected) {
    assert.equal(getSkyScenario(alt).id, id, `Expected ${id} at altitude ${alt}`);
  }
  assert.notEqual(getSkyScenario(0).skyTop, 'rgb(0, 0, 0)');
  assert.notEqual(getSkyScenario(0).skyBottom, 'rgb(0, 0, 0)');
  assert.notEqual(getSkyScenario(1900).skyTop, 'rgb(0, 0, 0)');
  assert.ok(getSkyScenario(24500).label.includes('Setor 2'));
  assert.equal(getSkyBiome(16500).id, 'solar_system');
});

test('difficulty ramp scales enemies and speed as altitude increases', () => {
  const start = getDifficultyParams(100);
  const early = getDifficultyParams(900);
  const mid = getDifficultyParams(3500);
  const late = getDifficultyParams(8500);
  const deep = getDifficultyParams(16000);

  assert.equal(start.maxEnemies, 0);
  assert.equal(early.maxEnemies, 1);
  assert.deepEqual(early.unlockedKinds, ['patrol']);

  assert.ok(mid.maxEnemies > early.maxEnemies);
  assert.ok(mid.unlockedKinds.includes('charger'));

  assert.ok(late.maxEnemies > mid.maxEnemies);
  assert.ok(late.unlockedKinds.includes('repulsor'));

  assert.ok(deep.maxEnemies >= 4);
  assert.ok(deep.speedScale > late.speedScale);
  assert.ok(deep.pushScale > early.pushScale);
});

test('enemies execute distinct behaviors and push the player on contact or shockwave', () => {
  const patrol = createEnemy('patrol', 1200, 0.5, 0.45);
  const patrolPush = resolveEnemyPush(0.49, 0.5, patrol, 1200);
  assert.equal(patrolPush.pushed, true);
  assert.ok(patrolPush.pushVx > 0.5);

  const charger = createEnemy('charger', 4000, 0.5, 0.3);
  // Trigger telegraph when player is nearby horizontally in lane
  updateEnemies([charger], 0.7, 0.52, 4000, 0.05);
  assert.equal(charger.state, 'telegraph');
  assert.equal(charger.dir, 1);
  // Advance past telegraph into active dash
  updateEnemies([charger], 0.7, 0.52, 4000, 0.5);
  assert.equal(charger.state, 'active');
  assert.ok(charger.vx > 0.5);

  const repulsor = createEnemy('repulsor', 8000, 0.5, 0.5);
  repulsor.state = 'active';
  repulsor.stateTimer = 0.2;
  // Repulsor shockwave pushes even at extended pulse radius
  const wavePush = resolveEnemyPush(0.62, 0.52, repulsor, 8000);
  assert.equal(wavePush.pushed, true);
  assert.equal(wavePush.enemyKind, 'repulsor');
  assert.ok(wavePush.pushVx > 0.5);
});

test('fragile_spring launches cat at super-spring speed, disappears, and reforms', () => {
  const fSpring = makePlatform({ kind: 'fragile_spring' });
  const res = resolvePlatformBounce(0.4, 0.48, 0.6, fSpring);

  assert.equal(res.bounced, true);
  assert.equal(res.kind, 'fragile_spring');
  assert.equal(res.newVy, -1.56);
  assert.equal(fSpring.consumed, true);
  assert.equal(fSpring.respawnTimer, FRAGILE_RESPAWN_SECONDS);

  updatePlatforms([fSpring], FRAGILE_RESPAWN_SECONDS + 0.05);
  assert.equal(fSpring.consumed, false);
});

test('fragile_vertical oscillates vertically, shatters on jump, and reappears', () => {
  const fVert = makePlatform({ kind: 'fragile_vertical', y: 0.5, baseY: 0.5, ampY: 0.05 });
  updatePlatforms([fVert], 0.3);
  assert.notEqual(fVert.y, fVert.baseY);

  const bounce = resolvePlatformBounce(0.4, fVert.y - 0.02, 0.6, fVert);
  assert.equal(bounce.bounced, true);
  assert.equal(bounce.kind, 'fragile_vertical');
  assert.equal(fVert.consumed, true);

  updatePlatforms([fVert], FRAGILE_RESPAWN_SECONDS + 0.05);
  assert.equal(fVert.consumed, false);
});

test('phase_vertical oscillates vertically while cycling visibility on phaseTimer', () => {
  const pVert = makePlatform({ kind: 'phase_vertical', y: 0.5, baseY: 0.5, ampY: 0.05 });
  updatePlatforms([pVert], 0.3);
  assert.notEqual(pVert.y, pVert.baseY);
  assert.equal(pVert.phaseVisible, true);

  updatePlatforms([pVert], PHASE_VISIBLE_SECONDS);
  assert.equal(pVert.phaseVisible, false);
  assert.equal(resolvePlatformBounce(0.4, pVert.y - 0.02, 0.6, pVert).bounced, false);

  updatePlatforms([pVert], PHASE_HIDDEN_SECONDS);
  assert.equal(pVert.phaseVisible, true);
  assert.equal(resolvePlatformBounce(0.4, pVert.y - 0.02, 0.6, pVert).bounced, true);
});

test('portal platform teleports cat to upper portal with reachable exit above and applies cooldown', () => {
  const entry = makePlatform({ id: 1, x: 0.2, y: 0.6, baseY: 0.6, kind: 'portal' });
  const midNormal = makePlatform({ id: 2, x: 0.5, y: 0.42, baseY: 0.42, kind: 'normal' });
  const upperPortal = makePlatform({ id: 3, x: 0.6, y: 0.22, baseY: 0.22, kind: 'portal' });
  const exitAbovePortal = makePlatform({ id: 4, x: 0.3, y: 0.08, baseY: 0.08, kind: 'normal' });
  const all = [entry, midNormal, upperPortal, exitAbovePortal];

  const found = findPortalDestination(entry, all);
  assert.equal(found?.id, 3);

  const bounce = resolvePlatformBounce(0.3, 0.58, 0.6, entry, all);
  assert.equal(bounce.bounced, true);
  assert.equal(bounce.kind, 'portal');
  assert.ok(bounce.teleportTo);
  assert.equal(bounce.teleportTo?.targetId, 3);
  assert.ok(bounce.teleportTo!.y < upperPortal.y);
  assert.ok(entry.portalCooldown > 0);
  assert.ok(upperPortal.portalCooldown > 0);
});

test('findPortalDestination rejects dead-end upper platforms and fragile targets to prevent stranding', () => {
  const entry = makePlatform({ id: 1, x: 0.2, y: 0.72, baseY: 0.72, kind: 'portal' });
  const fragileTarget = makePlatform({ id: 2, x: 0.4, y: 0.50, baseY: 0.50, kind: 'fragile' });
  const safeMid = makePlatform({ id: 3, x: 0.5, y: 0.34, baseY: 0.34, kind: 'normal' });
  const deadEndTopPortal = makePlatform({ id: 4, x: 0.3, y: 0.14, baseY: 0.14, kind: 'portal' });

  // deadEndTopPortal has nothing above it, and fragileTarget is fragile -> picks safeMid (which can jump to deadEndTopPortal)
  const found = findPortalDestination(entry, [entry, fragileTarget, safeMid, deadEndTopPortal]);
  assert.equal(found?.id, 3);

  // If no candidate has a reachable platform above it within BASE_MAX_JUMP_HEIGHT, return null (fallback bounce only)
  const isolatedPortal = makePlatform({ id: 10, x: 0.2, y: 0.7, baseY: 0.7, kind: 'portal' });
  const unreachableTop = makePlatform({ id: 11, x: 0.5, y: 0.2, baseY: 0.2, kind: 'normal' });
  assert.equal(findPortalDestination(isolatedPortal, [isolatedPortal, unreachableTop]), null);
  const fallbackBounce = resolvePlatformBounce(0.3, 0.68, 0.5, isolatedPortal, [
    isolatedPortal,
    unreachableTop,
  ]);
  assert.equal(fallbackBounce.bounced, true);
  assert.equal(fallbackBounce.teleportTo, undefined);
});

test('maintainPlatformLadder prevents horizontal clumping and limits vertical gaps below base jump height', () => {
  // Base jump height must retain comfortable safety margin above max allowed platform gap
  assert.ok(BASE_MAX_JUMP_HEIGHT > MAX_SAFE_PLATFORM_GAP + 0.08);

  const platforms = createInitialPlatforms();
  assert.equal(platforms.length, 10);

  // Simulate huge scroll delta (e.g. after portal warp + spring) pushing 4 platforms off bottom at once
  scrollPlatforms(platforms, 0.52);
  maintainPlatformLadder(platforms, 1200, () => 0.45);

  const sorted = [...platforms].sort((a, b) => b.baseY - a.baseY);
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i - 1].baseY - sorted[i].baseY;
    assert.ok(
      gap >= 0.075 - 1e-6,
      `Platforms ${sorted[i - 1].id} and ${sorted[i].id} clumped at gap=${gap}`
    );
    assert.ok(
      gap <= MAX_SAFE_PLATFORM_GAP + 1e-6,
      `Gap ${gap} between ${sorted[i - 1].id} and ${sorted[i].id} exceeds MAX_SAFE_PLATFORM_GAP=${MAX_SAFE_PLATFORM_GAP}`
    );
  }
});

test('recordSkyHopLeaderboard sorts descending by altitude, deduplicates, and caps at 10 entries', () => {
  let board = createInitialPlatforms().map((_, idx) => ({
    id: `run_${idx}`,
    role: (idx % 2 === 0 ? 'cat1' : 'cat2') as 'cat1' | 'cat2',
    nickname: `Camarada ${idx}`,
    altitude: (idx + 1) * 500,
    level: 1,
    scenarioLabel: 'Terra & Troposfera',
    timestamp: 1000 + idx,
  }));

  let entries = [] as ReturnType<typeof recordSkyHopLeaderboard>;
  for (const item of board) {
    entries = recordSkyHopLeaderboard(entries, item, 10);
  }
  assert.equal(entries.length, 10);
  assert.equal(entries[0].altitude, 5000);
  assert.equal(entries[9].altitude, 500);

  // New top record pushes out the 500m score
  entries = recordSkyHopLeaderboard(
    entries,
    {
      id: 'run_best',
      role: 'cat1',
      nickname: 'Camarada Campeão',
      altitude: 8420,
      level: 5,
      scenarioLabel: 'Cinturão de Asteroides',
      timestamp: 9999,
    },
    10
  );
  assert.equal(entries.length, 10);
  assert.equal(entries[0].id, 'run_best');
  assert.equal(entries[0].altitude, 8420);
  assert.equal(entries[9].altitude, 1000);
});

test('createInitialPlatforms includes new variants and level-up awards 10 paws per level', () => {
  const initial = createInitialPlatforms();
  assert.ok(initial.some((p) => p.kind === 'fragile_spring'));
  assert.ok(initial.some((p) => p.kind === 'fragile_vertical'));
  assert.ok(initial.some((p) => p.kind === 'vertical'));
  assert.ok(initial.some((p) => p.kind === 'portal'));
  assert.ok(isDisappearingPlatformKind('fragile_spring'));
  assert.ok(isDisappearingPlatformKind('phase_vertical'));
  assert.equal(ALTITUDE_SCROLL_SCALE, 340);
  assert.equal(PAWS_PER_LEVEL, 10);
  assert.equal(computeSkyHopLevelPawsReward(0), 0);
  assert.equal(computeSkyHopLevelPawsReward(3), 30);
  assert.equal(computeSkyHopReward(0), 2);
  assert.equal(computeSkyHopReward(2000), 6);
  assert.equal(computeSkyHopReward(20000), 25);
});

test('evaluateBounceAccuracy classifies center landings, springs, and portals as perfect and edges as normal', () => {
  const norm = makePlatform({ x: 0.3, w: 0.24, kind: 'normal' }); // center = 0.42, sweet spot +-0.06
  assert.equal(evaluateBounceAccuracy(0.42, norm), 'perfect');
  assert.equal(evaluateBounceAccuracy(0.46, norm), 'perfect');
  assert.equal(evaluateBounceAccuracy(0.32, norm), 'normal');
  assert.equal(evaluateBounceAccuracy(0.53, norm), 'normal');

  const spring = makePlatform({ x: 0.3, w: 0.24, kind: 'spring' });
  const portal = makePlatform({ x: 0.3, w: 0.24, kind: 'portal' });
  assert.equal(evaluateBounceAccuracy(0.31, spring), 'perfect');
  assert.equal(evaluateBounceAccuracy(0.53, portal), 'perfect');
});
