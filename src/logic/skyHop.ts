import { SkyHopLeaderboardEntry } from '../types/game';

export type SkyPlatformKind =
  | 'normal'
  | 'moving'
  | 'vertical'
  | 'spring'
  | 'fragile'
  | 'fast_fragile'
  | 'fragile_spring'
  | 'fragile_vertical'
  | 'phase'
  | 'phase_vertical'
  | 'portal';

export const FRAGILE_RESPAWN_SECONDS = 2.6;
export const FAST_FRAGILE_RESPAWN_SECONDS = 1.05;
export const PHASE_VISIBLE_SECONDS = 1.4;
export const PHASE_HIDDEN_SECONDS = 0.95;
export const SCENARIO_STEP_ALTITUDE = 2000;
export const ALTITUDE_SCROLL_SCALE = 340;
export const PAWS_PER_LEVEL = 10;

export const BASE_JUMP_VY = -1.04;
export const SPRING_JUMP_VY = -1.56;
export const SKYHOP_GRAVITY = 1.98;
// Exact peak vertical climb from a single base jump: v^2 / (2g) ≈ 0.2731 normalized screen height
export const BASE_MAX_JUMP_HEIGHT = (BASE_JUMP_VY * BASE_JUMP_VY) / (2 * SKYHOP_GRAVITY);
export const MIN_PLATFORM_GAP = 0.105;
// Safe vertical spacing limit accounting for vertical oscillation margin so every platform stays reachable by base jump
export const MAX_SAFE_PLATFORM_GAP = 0.175;

export type PlatformVisualStyle =
  | 'cosmonaut'
  | 'lunar'
  | 'martian'
  | 'asteroid'
  | 'gas_giant'
  | 'constellation'
  | 'galactic';

export interface PlatformTheme {
  style: PlatformVisualStyle;
  topColor: string;
  bottomColor: string;
  stripeColor: string;
  borderColor: string;
  rivetColor: string;
  glowColor: string;
}

export interface SkyPlatform {
  id: number;
  x: number;
  y: number;
  baseY: number;
  ampY: number;
  phase: number;
  phaseTimer: number;
  phaseVisible: boolean;
  portalCooldown: number;
  w: number;
  kind: SkyPlatformKind;
  vx: number;
  consumed: boolean;
  breakAnim: number; // 1 -> 0 shatter fade after single bounce
  respawnTimer: number; // seconds remaining before fragile platform reappears
  bounceSquash: number; // 0 -> 1 visual recoil on bounce
}

export type SkyScenarioId =
  | 'earth'
  | 'moon'
  | 'inner_planets'
  | 'mars'
  | 'asteroid_belt'
  | 'jupiter'
  | 'saturn'
  | 'ice_giants'
  | 'solar_system'
  | 'constellations'
  | 'nebula_milkyway'
  | 'galaxies';

export interface SkyScenario {
  sectorIndex: number;
  id: SkyScenarioId;
  label: string;
  subtitle: string;
  milestoneStart: number;
  milestoneEnd: number;
  skyTop: string;
  skyBottom: string;
  accentColor: string;
  starAlpha: number;
  cloudAlpha: number;
}

export interface SkyBiome {
  id: SkyScenarioId;
  label: string;
  skyTop: string;
  skyBottom: string;
  starAlpha: number;
  cloudAlpha: number;
  auroraAlpha: number;
  spaceAlpha: number;
}

interface ScenarioTemplate {
  id: SkyScenarioId;
  label: string;
  subtitle: string;
  skyTop: string;
  skyBottom: string;
  accentColor: string;
  starAlpha: number;
  cloudAlpha: number;
}

export const SKY_SCENARIO_ORDER: ScenarioTemplate[] = [
  {
    id: 'earth',
    label: 'Terra & Troposfera',
    subtitle: 'Decolagem sobre as nuvens',
    skyTop: '#0284c7',
    skyBottom: '#e0f2fe',
    accentColor: '#38bdf8',
    starAlpha: 0.12,
    cloudAlpha: 1,
  },
  {
    id: 'moon',
    label: 'Lua & Órbita Lunar',
    subtitle: 'Crateras prateadas e satélite Sputnik',
    skyTop: '#0f172a',
    skyBottom: '#334155',
    accentColor: '#cbd5e1',
    starAlpha: 0.78,
    cloudAlpha: 0,
  },
  {
    id: 'inner_planets',
    label: 'Mercúrio & Vênus',
    subtitle: 'Calor da coroa solar e nuvens douradas',
    skyTop: '#2a0a18',
    skyBottom: '#9a3412',
    accentColor: '#fbbf24',
    starAlpha: 0.72,
    cloudAlpha: 0,
  },
  {
    id: 'mars',
    label: 'Marte · Planeta Vermelho',
    subtitle: 'Tempestades rubras, Fobos e Deimos',
    skyTop: '#1c0f13',
    skyBottom: '#991b1b',
    accentColor: '#f87171',
    starAlpha: 0.8,
    cloudAlpha: 0,
  },
  {
    id: 'asteroid_belt',
    label: 'Cinturão de Asteroides',
    subtitle: 'Rochas em deriva e planeta anão Ceres',
    skyTop: '#090d16',
    skyBottom: '#292524',
    accentColor: '#fb923c',
    starAlpha: 0.9,
    cloudAlpha: 0,
  },
  {
    id: 'jupiter',
    label: 'Júpiter · Gigante Gasoso',
    subtitle: 'Grande Mancha Vermelha e luas galileanas',
    skyTop: '#1e1b4b',
    skyBottom: '#92400e',
    accentColor: '#fcd34d',
    starAlpha: 0.85,
    cloudAlpha: 0,
  },
  {
    id: 'saturn',
    label: 'Saturno & Seus Anéis',
    subtitle: 'Arcos de gelo cósmico e Titã',
    skyTop: '#17153b',
    skyBottom: '#581c87',
    accentColor: '#fde68a',
    starAlpha: 0.92,
    cloudAlpha: 0,
  },
  {
    id: 'ice_giants',
    label: 'Urano & Netuno',
    subtitle: 'Ventos supersônicos dos gigantes de gelo',
    skyTop: '#042f2e',
    skyBottom: '#1d4ed8',
    accentColor: '#2dd4bf',
    starAlpha: 0.95,
    cloudAlpha: 0,
  },
  {
    id: 'solar_system',
    label: 'Sistema Solar & Kuiper',
    subtitle: 'Vista panorâmica dos planetas e cometas',
    skyTop: '#020617',
    skyBottom: '#1e1b4b',
    accentColor: '#60a5fa',
    starAlpha: 1,
    cloudAlpha: 0,
  },
  {
    id: 'constellations',
    label: 'Constelações Cósmicas',
    subtitle: 'Órion, Ursa Maior e Felis Boreal',
    skyTop: '#030712',
    skyBottom: '#312e81',
    accentColor: '#a78bfa',
    starAlpha: 1,
    cloudAlpha: 0,
  },
  {
    id: 'nebula_milkyway',
    label: 'Via Láctea & Nebulosas',
    subtitle: 'Berçários estelares em nuvens de plasma',
    skyTop: '#090514',
    skyBottom: '#701a75',
    accentColor: '#f472b6',
    starAlpha: 1,
    cloudAlpha: 0,
  },
  {
    id: 'galaxies',
    label: 'Galáxias Distantes',
    subtitle: 'Espirais de Andrômeda no espaço profundo',
    skyTop: '#02010a',
    skyBottom: '#2e1065',
    accentColor: '#c084fc',
    starAlpha: 1,
    cloudAlpha: 0,
  },
];

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function parseColorToRgb(color: string): [number, number, number] {
  const rgbMatch = color.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (rgbMatch) {
    return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
  }
  const clean = color.replace('#', '');
  const n = parseInt(clean, 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function lerpColor(colorA: string, colorB: string, t: number): string {
  const k = clamp01(t);
  const [r1, g1, b1] = parseColorToRgb(colorA);
  const [r2, g2, b2] = parseColorToRgb(colorB);
  const r = Math.round(r1 + (r2 - r1) * k);
  const g = Math.round(g1 + (g2 - g1) * k);
  const b = Math.round(b1 + (b2 - b1) * k);
  return `rgb(${r}, ${g}, ${b})`;
}

export function getSkyScenario(altitude: number): SkyScenario {
  const safeAlt = Math.max(0, altitude);
  const sectorIndex = Math.floor(safeAlt / SCENARIO_STEP_ALTITUDE);
  const templateIndex = Math.min(sectorIndex, SKY_SCENARIO_ORDER.length - 1);
  const cur = SKY_SCENARIO_ORDER[templateIndex];
  const next = SKY_SCENARIO_ORDER[Math.min(templateIndex + 1, SKY_SCENARIO_ORDER.length - 1)];

  const milestoneStart = sectorIndex * SCENARIO_STEP_ALTITUDE;
  const milestoneEnd = (sectorIndex + 1) * SCENARIO_STEP_ALTITUDE;
  const localAlt = safeAlt - milestoneStart;

  // Smooth sky palette transition during the final 320 units before the next 2,000 milestone
  const blendStart = SCENARIO_STEP_ALTITUDE - 320;
  const blendT =
    sectorIndex < SKY_SCENARIO_ORDER.length - 1 && localAlt > blendStart
      ? clamp01((localAlt - blendStart) / 320)
      : 0;

  // Within Earth (0 - 2000), gradually transition from sunny troposphere to upper atmosphere
  let skyTop = cur.skyTop;
  let skyBottom = cur.skyBottom;
  let starAlpha = cur.starAlpha;
  let cloudAlpha = cur.cloudAlpha;

  if (cur.id === 'earth') {
    const skyClimb = clamp01(localAlt / 1500);
    skyTop = lerpColor('#0284c7', '#1e1b4b', skyClimb * 0.78);
    skyBottom = lerpColor('#e0f2fe', '#fdba74', Math.min(1, skyClimb * 1.15));
    starAlpha = 0.08 + skyClimb * 0.6;
    cloudAlpha = Math.max(0.1, 1 - skyClimb * 0.85);
  }

  const deepSectorSuffix =
    sectorIndex >= SKY_SCENARIO_ORDER.length
      ? ` · Setor ${sectorIndex - SKY_SCENARIO_ORDER.length + 2}`
      : '';

  return {
    sectorIndex,
    id: cur.id,
    label: `${cur.label}${deepSectorSuffix}`,
    subtitle: cur.subtitle,
    milestoneStart,
    milestoneEnd,
    skyTop: lerpColor(skyTop, next.skyTop, blendT),
    skyBottom: lerpColor(skyBottom, next.skyBottom, blendT),
    accentColor: cur.accentColor,
    starAlpha: starAlpha + (next.starAlpha - starAlpha) * blendT,
    cloudAlpha: cloudAlpha + (next.cloudAlpha - cloudAlpha) * blendT,
  };
}

export function getSkyBiome(altitude: number): SkyBiome {
  const sc = getSkyScenario(altitude);
  return {
    id: sc.id,
    label: sc.label,
    skyTop: sc.skyTop,
    skyBottom: sc.skyBottom,
    starAlpha: sc.starAlpha,
    cloudAlpha: sc.cloudAlpha,
    auroraAlpha: sc.id === 'nebula_milkyway' || sc.id === 'ice_giants' ? 0.65 : 0,
    spaceAlpha: sc.sectorIndex >= 1 ? 1 : clamp01(altitude / 1800),
  };
}

export function computeSkyHopReward(altitudeMeters: number): number {
  return Math.max(2, Math.min(25, Math.floor(Math.max(0, altitudeMeters) / 500) + 2));
}

export function computeSkyHopLevelPawsReward(levelsClimbed: number): number {
  return Math.max(0, Math.floor(levelsClimbed)) * PAWS_PER_LEVEL;
}

export function getPlatformTheme(altitude: number): PlatformTheme {
  const scenario = getSkyScenario(altitude);
  switch (scenario.id) {
    case 'earth':
      return {
        style: 'cosmonaut',
        topColor: '#fffdf9',
        bottomColor: '#f3dfc1',
        stripeColor: '#dc2626',
        borderColor: '#2b1111',
        rivetColor: '#fbbf24',
        glowColor: 'rgba(251, 191, 36, 0.35)',
      };
    case 'moon':
      return {
        style: 'lunar',
        topColor: '#f1f5f9',
        bottomColor: '#94a3b8',
        stripeColor: '#0ea5e9',
        borderColor: '#0f172a',
        rivetColor: '#e2e8f0',
        glowColor: 'rgba(56, 189, 248, 0.45)',
      };
    case 'inner_planets':
    case 'mars':
      return {
        style: 'martian',
        topColor: '#fed7aa',
        bottomColor: '#c2410c',
        stripeColor: '#7c2d12',
        borderColor: '#290f0a',
        rivetColor: '#fde047',
        glowColor: 'rgba(249, 115, 22, 0.45)',
      };
    case 'asteroid_belt':
      return {
        style: 'asteroid',
        topColor: '#a8a29e',
        bottomColor: '#44403c',
        stripeColor: '#f59e0b',
        borderColor: '#1c1917',
        rivetColor: '#fbbf24',
        glowColor: 'rgba(245, 158, 11, 0.4)',
      };
    case 'jupiter':
    case 'saturn':
    case 'ice_giants':
      return {
        style: 'gas_giant',
        topColor: scenario.id === 'ice_giants' ? '#cffafe' : '#fef3c7',
        bottomColor: scenario.id === 'ice_giants' ? '#0284c7' : '#d97706',
        stripeColor: scenario.id === 'saturn' ? '#7e22ce' : '#0f766e',
        borderColor: '#0f172a',
        rivetColor: '#fde047',
        glowColor:
          scenario.id === 'ice_giants'
            ? 'rgba(45, 212, 191, 0.5)'
            : 'rgba(253, 224, 71, 0.45)',
      };
    case 'solar_system':
    case 'constellations':
      return {
        style: 'constellation',
        topColor: '#1e1b4b',
        bottomColor: '#312e81',
        stripeColor: '#fde047',
        borderColor: '#c4b5fd',
        rivetColor: '#ffffff',
        glowColor: 'rgba(167, 139, 250, 0.55)',
      };
    case 'nebula_milkyway':
    case 'galaxies':
    default:
      return {
        style: 'galactic',
        topColor: '#4c1d95',
        bottomColor: '#be185d',
        stripeColor: '#22d3ee',
        borderColor: '#f5d0fe',
        rivetColor: '#67e8f9',
        glowColor: 'rgba(232, 121, 249, 0.6)',
      };
  }
}

export function isDisappearingPlatformKind(kind: SkyPlatformKind): boolean {
  return (
    kind === 'fragile' ||
    kind === 'fast_fragile' ||
    kind === 'fragile_spring' ||
    kind === 'fragile_vertical' ||
    kind === 'phase' ||
    kind === 'phase_vertical'
  );
}

export function isVerticalPlatformKind(kind: SkyPlatformKind): boolean {
  return kind === 'vertical' || kind === 'fragile_vertical' || kind === 'phase_vertical';
}

export function isPhasePlatformKind(kind: SkyPlatformKind): boolean {
  return kind === 'phase' || kind === 'phase_vertical';
}

export function isFragileBreakKind(kind: SkyPlatformKind): boolean {
  return (
    kind === 'fragile' ||
    kind === 'fast_fragile' ||
    kind === 'fragile_spring' ||
    kind === 'fragile_vertical'
  );
}

export function createInitialPlatforms(): SkyPlatform[] {
  return [
    { id: 1, x: 0.36, y: 0.88, baseY: 0.88, ampY: 0, phase: 0, phaseTimer: 0, phaseVisible: true, portalCooldown: 0, w: 0.28, kind: 'normal', vx: 0, consumed: false, breakAnim: 1, respawnTimer: 0, bounceSquash: 0 },
    { id: 2, x: 0.14, y: 0.76, baseY: 0.76, ampY: 0, phase: 0, phaseTimer: 0, phaseVisible: true, portalCooldown: 0, w: 0.24, kind: 'normal', vx: 0, consumed: false, breakAnim: 1, respawnTimer: 0, bounceSquash: 0 },
    { id: 3, x: 0.58, y: 0.64, baseY: 0.64, ampY: 0, phase: 0, phaseTimer: 0, phaseVisible: true, portalCooldown: 0, w: 0.24, kind: 'fragile_spring', vx: 0, consumed: false, breakAnim: 1, respawnTimer: 0, bounceSquash: 0 },
    { id: 4, x: 0.22, y: 0.52, baseY: 0.52, ampY: 0.04, phase: 0.5, phaseTimer: 0, phaseVisible: true, portalCooldown: 0, w: 0.24, kind: 'vertical', vx: 0, consumed: false, breakAnim: 1, respawnTimer: 0, bounceSquash: 0 },
    { id: 5, x: 0.58, y: 0.40, baseY: 0.40, ampY: 0, phase: 0, phaseTimer: 0, phaseVisible: true, portalCooldown: 0, w: 0.23, kind: 'portal', vx: 0, consumed: false, breakAnim: 1, respawnTimer: 0, bounceSquash: 0 },
    { id: 6, x: 0.18, y: 0.28, baseY: 0.28, ampY: 0, phase: 0, phaseTimer: 0, phaseVisible: true, portalCooldown: 0, w: 0.23, kind: 'fast_fragile', vx: 0, consumed: false, breakAnim: 1, respawnTimer: 0, bounceSquash: 0 },
    { id: 7, x: 0.54, y: 0.16, baseY: 0.16, ampY: 0, phase: 0, phaseTimer: 0, phaseVisible: true, portalCooldown: 0, w: 0.23, kind: 'portal', vx: 0, consumed: false, breakAnim: 1, respawnTimer: 0, bounceSquash: 0 },
    { id: 8, x: 0.30, y: 0.04, baseY: 0.04, ampY: 0.04, phase: 1.2, phaseTimer: 0, phaseVisible: true, portalCooldown: 0, w: 0.23, kind: 'fragile_vertical', vx: 0, consumed: false, breakAnim: 1, respawnTimer: 0, bounceSquash: 0 },
    { id: 9, x: 0.52, y: -0.08, baseY: -0.08, ampY: 0, phase: 0, phaseTimer: 0, phaseVisible: true, portalCooldown: 0, w: 0.23, kind: 'normal', vx: 0, consumed: false, breakAnim: 1, respawnTimer: 0, bounceSquash: 0 },
    { id: 10, x: 0.18, y: -0.20, baseY: -0.20, ampY: 0, phase: 0, phaseTimer: 0, phaseVisible: true, portalCooldown: 0, w: 0.23, kind: 'moving', vx: 0.19, consumed: false, breakAnim: 1, respawnTimer: 0, bounceSquash: 0 },
  ];
}

export function recyclePlatform(
  p: SkyPlatform,
  altitudeScore: number,
  previousWasFragile: boolean,
  roll = Math.random(),
  spawnY = -0.05
): SkyPlatform {
  const diff = getDifficultyParams(altitudeScore);
  const width = Math.max(0.15, 0.24 - Math.min(0.075, altitudeScore * 0.0000045));
  const x = Math.random() * (0.92 - width) + 0.04;

  // Never spawn two disappearing/fragile platforms consecutively at recycle step so paths remain fair
  let kind: SkyPlatformKind = 'normal';
  let vx = 0;
  let ampY = 0;
  const phase = Math.random() * Math.PI * 2;
  const phaseTimer = Math.random() * (PHASE_VISIBLE_SECONDS * 0.5);

  if (!previousWasFragile && roll < diff.fragileChance) {
    const frac = roll / Math.max(0.01, diff.fragileChance);
    if (altitudeScore >= 1600 && frac > 0.84) {
      kind = 'phase_vertical';
      ampY = 0.048 + Math.min(0.025, altitudeScore * 0.0000018);
    } else if (altitudeScore >= 1100 && frac > 0.68) {
      kind = 'phase';
    } else if (altitudeScore >= 750 && frac > 0.52) {
      kind = 'fragile_vertical';
      ampY = 0.048 + Math.min(0.025, altitudeScore * 0.0000018);
    } else if (altitudeScore >= 450 && frac > 0.36) {
      kind = 'fast_fragile';
    } else if (altitudeScore >= 250 && frac > 0.2) {
      kind = 'fragile_spring';
    } else {
      kind = 'fragile';
    }
  } else if (
    altitudeScore > 250 &&
    roll >= diff.fragileChance &&
    roll < diff.fragileChance + 0.2
  ) {
    kind = 'moving';
    const speed = 0.17 + Math.min(0.24, altitudeScore * 0.000014) + Math.random() * 0.09;
    vx = (Math.random() > 0.5 ? 1 : -1) * speed;
  } else if (
    altitudeScore > 180 &&
    roll >= diff.fragileChance + 0.2 &&
    roll < diff.fragileChance + 0.34
  ) {
    kind = 'vertical';
    ampY = 0.05 + Math.min(0.03, altitudeScore * 0.000002);
  } else if (
    altitudeScore >= 300 &&
    roll >= diff.fragileChance + 0.34 &&
    roll < diff.fragileChance + 0.43
  ) {
    kind = 'portal';
  } else if (roll > 0.85) {
    kind = 'spring';
  }

  return {
    ...p,
    y: spawnY,
    baseY: spawnY,
    ampY,
    phase,
    phaseTimer,
    phaseVisible: true,
    portalCooldown: 0,
    x,
    w: width,
    kind,
    vx,
    consumed: false,
    breakAnim: 1,
    respawnTimer: 0,
    bounceSquash: 0,
  };
}

/**
 * Recycles any platforms that scrolled off-bottom one by one above the topmost platform,
 * preventing simultaneous horizontal clumping at identical Y and clamping every vertical gap
 * within what the player can climb using a single base jump.
 */
export function maintainPlatformLadder(
  platforms: SkyPlatform[],
  altitudeScore: number,
  rng: () => number = Math.random
): void {
  if (platforms.length === 0) return;

  const isOffBottom = (p: SkyPlatform) =>
    p.baseY > 1.04 || (!isVerticalPlatformKind(p.kind) && p.y > 1.04);

  const active = platforms.filter((p) => !isOffBottom(p));
  let topPlatform: SkyPlatform | null = null;
  let minBaseY = 0.88;
  for (const p of active) {
    if (!topPlatform || p.baseY < minBaseY) {
      minBaseY = p.baseY;
      topPlatform = p;
    }
  }
  let lastWasFragile = topPlatform ? isDisappearingPlatformKind(topPlatform.kind) : false;

  const offIndices = platforms
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => isOffBottom(p))
    .sort((a, b) => a.p.baseY - b.p.baseY)
    .map(({ idx }) => idx);

  const maxGenGap = Math.min(MAX_SAFE_PLATFORM_GAP - 0.007, 0.168);
  for (const idx of offIndices) {
    const gap = MIN_PLATFORM_GAP + rng() * (maxGenGap - MIN_PLATFORM_GAP);
    const targetY = minBaseY - gap;
    const recycled = recyclePlatform(
      platforms[idx],
      altitudeScore,
      lastWasFragile,
      rng(),
      targetY
    );
    platforms[idx] = recycled;
    minBaseY = recycled.baseY;
    lastWasFragile = isDisappearingPlatformKind(recycled.kind);
  }

  // Enforce global vertical ladder spacing invariant (no clumping, no unjumpable voids)
  const sorted = [...platforms].sort((a, b) => b.baseY - a.baseY);
  for (let i = 1; i < sorted.length; i++) {
    const below = sorted[i - 1];
    const curr = sorted[i];
    const gap = below.baseY - curr.baseY;
    let nextBaseY = curr.baseY;
    if (gap > MAX_SAFE_PLATFORM_GAP) {
      nextBaseY = below.baseY - MAX_SAFE_PLATFORM_GAP;
    } else if (gap < 0.075) {
      nextBaseY = below.baseY - MIN_PLATFORM_GAP;
    }
    if (nextBaseY !== curr.baseY) {
      const shift = nextBaseY - curr.baseY;
      curr.baseY = nextBaseY;
      curr.y += shift;
    }
  }
}

export function scrollPlatforms(platforms: SkyPlatform[], delta: number): void {
  for (const p of platforms) {
    p.y += delta;
    p.baseY += delta;
  }
}

export interface PlatformUpdateResult {
  reformedPositions: Array<{ x: number; y: number }>;
}

export function updatePlatforms(platforms: SkyPlatform[], dt: number): PlatformUpdateResult {
  const reformedPositions: Array<{ x: number; y: number }> = [];

  for (const p of platforms) {
    if (p.portalCooldown > 0) {
      p.portalCooldown = Math.max(0, p.portalCooldown - dt);
    }

    if (p.kind === 'moving' && !p.consumed) {
      p.x += p.vx * dt;
      if (p.x < 0.02) {
        p.x = 0.02;
        p.vx = Math.abs(p.vx);
      } else if (p.x + p.w > 0.98) {
        p.x = 0.98 - p.w;
        p.vx = -Math.abs(p.vx);
      }
    }

    if (isVerticalPlatformKind(p.kind)) {
      p.phase += dt * 2.3;
      p.y = p.baseY + Math.sin(p.phase) * p.ampY;
    }

    if (isPhasePlatformKind(p.kind)) {
      p.phaseTimer += dt;
      const cycleLen = PHASE_VISIBLE_SECONDS + PHASE_HIDDEN_SECONDS;
      const inCycle = p.phaseTimer % cycleLen;
      const nextVisible = inCycle < PHASE_VISIBLE_SECONDS;
      if (!p.phaseVisible && nextVisible) {
        p.bounceSquash = 0.45;
        reformedPositions.push({ x: p.x + p.w * 0.5, y: p.y });
      }
      p.phaseVisible = nextVisible;
    }

    if (p.bounceSquash > 0) {
      p.bounceSquash = Math.max(0, p.bounceSquash - dt * 5);
    }

    if (p.consumed) {
      if (p.breakAnim > 0) {
        p.breakAnim = Math.max(0, p.breakAnim - dt * 3.8);
      }
      if (isFragileBreakKind(p.kind) && p.respawnTimer > 0) {
        p.respawnTimer = Math.max(0, p.respawnTimer - dt);
        if (p.respawnTimer === 0) {
          p.consumed = false;
          p.breakAnim = 1;
          p.bounceSquash = 0.55;
          reformedPositions.push({ x: p.x + p.w * 0.5, y: p.y });
        }
      }
    }
  }

  return { reformedPositions };
}

export interface PortalTeleportTarget {
  x: number;
  y: number;
  targetId: number;
}

export interface BounceCheckResult {
  bounced: boolean;
  newVy: number;
  kind: SkyPlatformKind | null;
  teleportTo?: PortalTeleportTarget;
}

/**
 * Finds the best higher non-fragile platform (preferring another portal) to warp the cat onto,
 * strictly guaranteeing at least one reachable exit platform exists above the destination.
 */
export function findPortalDestination(
  source: SkyPlatform,
  allPlatforms: SkyPlatform[]
): SkyPlatform | null {
  const candidates = allPlatforms.filter((other) => {
    if (other.id === source.id) return false;
    if (other.consumed) return false;
    if (isFragileBreakKind(other.kind)) return false;
    if (isPhasePlatformKind(other.kind) && !other.phaseVisible) return false;
    if (other.y >= source.y - 0.06 || other.y <= -0.15) return false;

    return allPlatforms.some(
      (u) =>
        u.id !== other.id &&
        !u.consumed &&
        (!isPhasePlatformKind(u.kind) || u.phaseVisible) &&
        u.y < other.y - 0.04 &&
        other.y - u.y <= BASE_MAX_JUMP_HEIGHT - 0.015
    );
  });
  if (candidates.length === 0) return null;

  const upperPortals = candidates.filter((c) => c.kind === 'portal');
  if (upperPortals.length > 0) {
    // Prefer closest upper portal so warps stay surrounded by platforms above
    upperPortals.sort((a, b) => b.y - a.y);
    return upperPortals[0];
  }

  // Pick the highest safe candidate that still has a reachable exit platform above it
  candidates.sort((a, b) => a.y - b.y);
  return candidates[0];
}

export const PERFECT_CENTER_RATIO = 0.25;

/**
 * Evaluates whether a landing bounce hits the platform sweet-spot (central 50% of width)
 * or triggers a high-energy specialty platform (spring, fragile_spring, portal).
 */
export function evaluateBounceAccuracy(
  catX: number,
  platform: SkyPlatform
): 'perfect' | 'normal' {
  if (
    platform.kind === 'spring' ||
    platform.kind === 'fragile_spring' ||
    platform.kind === 'portal'
  ) {
    return 'perfect';
  }
  const center = platform.x + platform.w * 0.5;
  return Math.abs(catX - center) <= platform.w * PERFECT_CENTER_RATIO
    ? 'perfect'
    : 'normal';
}

/**
 * Checks whether a falling cat lands on a platform.
 * Fragile variants bounce once, shatter, and schedule reappearance.
 * Phase platforms reject collisions while in their hidden phase.
 * Portal platforms warp the cat cleanly to a higher platform/portal with verified exit platforms above.
 */
export function resolvePlatformBounce(
  catX: number,
  catY: number,
  vy: number,
  platform: SkyPlatform,
  allPlatforms?: SkyPlatform[]
): BounceCheckResult {
  if (
    platform.consumed ||
    (isPhasePlatformKind(platform.kind) && !platform.phaseVisible) ||
    vy <= 0
  ) {
    return { bounced: false, newVy: vy, kind: null };
  }

  const withinY = catY >= platform.y - 0.055 && catY <= platform.y + 0.032;
  const withinX = catX + 0.05 >= platform.x && catX - 0.05 <= platform.x + platform.w;

  if (!withinY || !withinX) {
    return { bounced: false, newVy: vy, kind: null };
  }

  platform.bounceSquash = 1;

  if (platform.kind === 'portal') {
    if (platform.portalCooldown <= 0 && allPlatforms && allPlatforms.length > 1) {
      const dest = findPortalDestination(platform, allPlatforms);
      if (dest) {
        platform.portalCooldown = 0.45;
        dest.portalCooldown = 0.45;
        dest.bounceSquash = 0.9;
        return {
          bounced: true,
          newVy: -1.12,
          kind: 'portal',
          teleportTo: {
            x: dest.x + dest.w * 0.5,
            y: dest.y - 0.032,
            targetId: dest.id,
          },
        };
      }
    }
    return { bounced: true, newVy: -1.24, kind: 'portal' };
  }

  if (isFragileBreakKind(platform.kind)) {
    platform.consumed = true;
    platform.breakAnim = 0.99;
    platform.respawnTimer =
      platform.kind === 'fast_fragile'
        ? FAST_FRAGILE_RESPAWN_SECONDS
        : FRAGILE_RESPAWN_SECONDS;
    const bounceVy = platform.kind === 'fragile_spring' ? SPRING_JUMP_VY : BASE_JUMP_VY;
    return { bounced: true, newVy: bounceVy, kind: platform.kind };
  }

  if (platform.kind === 'spring') {
    return { bounced: true, newVy: SPRING_JUMP_VY, kind: 'spring' };
  }

  return { bounced: true, newVy: BASE_JUMP_VY, kind: platform.kind };
}

// ========= ENEMIES & DIFFICULTY RAMP =========

export type SkyEnemyKind = 'patrol' | 'charger' | 'repulsor';
export type SkyEnemyState = 'idle' | 'telegraph' | 'active' | 'cooldown';

export interface SkyEnemy {
  id: number;
  kind: SkyEnemyKind;
  x: number;
  y: number;
  baseX: number;
  vx: number;
  phase: number;
  radius: number;
  state: SkyEnemyState;
  stateTimer: number;
  dir: 1 | -1;
  hitFlash: number;
}

export interface SkyDifficultyParams {
  maxEnemies: number;
  unlockedKinds: SkyEnemyKind[];
  speedScale: number;
  pushScale: number;
  fragileChance: number;
}

export function getDifficultyParams(altitude: number): SkyDifficultyParams {
  const alt = Math.max(0, altitude);
  if (alt < 500) {
    return {
      maxEnemies: 0,
      unlockedKinds: [],
      speedScale: 1,
      pushScale: 1,
      fragileChance: 0.24,
    };
  }
  if (alt < 2000) {
    return {
      maxEnemies: 1,
      unlockedKinds: ['patrol'],
      speedScale: 1.0,
      pushScale: 1.0,
      fragileChance: 0.26,
    };
  }
  if (alt < 6000) {
    const t = clamp01((alt - 2000) / 4000);
    return {
      maxEnemies: 2,
      unlockedKinds: ['patrol', 'charger'],
      speedScale: 1.12 + t * 0.22,
      pushScale: 1.12 + t * 0.1,
      fragileChance: 0.28 + t * 0.03,
    };
  }
  if (alt < 12000) {
    const t = clamp01((alt - 6000) / 6000);
    return {
      maxEnemies: 3,
      unlockedKinds: ['patrol', 'charger', 'repulsor'],
      speedScale: 1.34 + t * 0.24,
      pushScale: 1.22 + t * 0.14,
      fragileChance: 0.31 + t * 0.03,
    };
  }
  const highT = clamp01((alt - 12000) / 10000);
  return {
    maxEnemies: 4,
    unlockedKinds: ['patrol', 'charger', 'repulsor'],
    speedScale: 1.58 + highT * 0.28,
    pushScale: 1.36 + highT * 0.18,
    fragileChance: 0.35,
  };
}

let nextEnemyId = 100;

export function createEnemy(
  kind: SkyEnemyKind,
  altitude: number,
  y: number,
  x = 0.2 + Math.random() * 0.6
): SkyEnemy {
  const diff = getDifficultyParams(altitude);
  const dir: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
  const speedBase =
    kind === 'patrol' ? 0.24 : kind === 'charger' ? 0.14 : 0.16;

  return {
    id: nextEnemyId++,
    kind,
    x,
    y,
    baseX: x,
    vx: dir * speedBase * diff.speedScale,
    phase: Math.random() * Math.PI * 2,
    radius: kind === 'repulsor' ? 0.048 : 0.042,
    state: 'idle',
    stateTimer: kind === 'repulsor' ? 1.4 + Math.random() * 1.1 : 0,
    dir,
    hitFlash: 0,
  };
}

export function updateEnemies(
  enemies: SkyEnemy[],
  catX: number,
  catY: number,
  altitude: number,
  dt: number
): void {
  const diff = getDifficultyParams(altitude);

  for (const e of enemies) {
    e.phase += dt * 3.1;
    if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt * 4);

    if (e.kind === 'patrol') {
      // Sweeps horizontally across the playfield with subtle sine bob
      e.x += e.vx * dt;
      if (e.x < 0.09) {
        e.x = 0.09;
        e.vx = Math.abs(e.vx);
      } else if (e.x > 0.91) {
        e.x = 0.91;
        e.vx = -Math.abs(e.vx);
      }
      e.dir = e.vx >= 0 ? 1 : -1;
    } else if (e.kind === 'charger') {
      // Hovers -> telegraphs toward player X -> dashes horizontally -> cools down
      if (e.state === 'idle') {
        e.x += Math.sin(e.phase * 0.9) * 0.08 * dt;
        const nearY = Math.abs(catY - e.y) < 0.22 && e.y > 0.05 && e.y < 0.9;
        if (nearY) {
          e.state = 'telegraph';
          e.stateTimer = 0.46;
          e.dir = catX >= e.x ? 1 : -1;
        }
      } else if (e.state === 'telegraph') {
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) {
          e.state = 'active';
          e.stateTimer = 0.44;
          e.vx = e.dir * 0.88 * diff.speedScale;
        }
      } else if (e.state === 'active') {
        e.x += e.vx * dt;
        if (e.x < 0.07) {
          e.x = 0.07;
          e.vx = 0;
        } else if (e.x > 0.93) {
          e.x = 0.93;
          e.vx = 0;
        }
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) {
          e.state = 'cooldown';
          e.stateTimer = 1.15;
          e.vx = 0;
        }
      } else {
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) {
          e.state = 'idle';
        }
      }
    } else {
      // Repulsor UFO: figure-8 orbit + telegraphed shockwave pulse
      e.x = Math.max(
        0.1,
        Math.min(0.9, e.baseX + Math.sin(e.phase * 0.55) * 0.16)
      );
      e.dir = Math.cos(e.phase * 0.55) >= 0 ? 1 : -1;

      if (e.state === 'idle') {
        e.stateTimer -= dt;
        if (e.stateTimer <= 0 && e.y > 0.04 && e.y < 0.9) {
          e.state = 'telegraph';
          e.stateTimer = 0.55;
        }
      } else if (e.state === 'telegraph') {
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) {
          e.state = 'active';
          e.stateTimer = 0.24;
        }
      } else if (e.state === 'active') {
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) {
          e.state = 'cooldown';
          e.stateTimer = 1.5;
        }
      } else {
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) {
          e.state = 'idle';
          e.stateTimer = 1.1;
        }
      }
    }
  }
}

export interface EnemyPushResult {
  pushed: boolean;
  pushVx: number;
  pushVy: number;
  enemyKind: SkyEnemyKind | null;
}

/**
 * Resolves enemy collision / repulsion pulse against the cat.
 * Returns directional knockback vector (pushVx, pushVy) when triggered.
 */
export function resolveEnemyPush(
  catX: number,
  catY: number,
  enemy: SkyEnemy,
  altitude: number
): EnemyPushResult {
  const diff = getDifficultyParams(altitude);
  const dx = catX - enemy.x;
  const dy = catY - enemy.y;
  const dist = Math.hypot(dx, dy);

  const pulseActive = enemy.kind === 'repulsor' && enemy.state === 'active';
  const hitRadius = pulseActive ? enemy.radius + 0.125 : enemy.radius + 0.044;

  if (dist > hitRadius) {
    return { pushed: false, pushVx: 0, pushVy: 0, enemyKind: null };
  }

  const nx = dist > 0.001 ? dx / dist : enemy.dir;
  const ny = dist > 0.001 ? dy / dist : 0.2;
  const horizSign = nx >= 0 ? 1 : -1;

  enemy.hitFlash = 1;

  if (enemy.kind === 'charger') {
    const pushDir = enemy.state === 'active' ? enemy.dir : horizSign;
    return {
      pushed: true,
      pushVx: pushDir * 1.28 * diff.pushScale,
      pushVy: 0.16,
      enemyKind: 'charger',
    };
  }

  if (enemy.kind === 'repulsor') {
    return {
      pushed: true,
      pushVx: (Math.abs(nx) < 0.35 ? horizSign * 0.65 : nx) * 1.38 * diff.pushScale,
      pushVy: Math.max(0.18, ny * 0.55),
      enemyKind: 'repulsor',
    };
  }

  // patrol drone: horizontal bump + mild vertical nudge
  return {
    pushed: true,
    pushVx: horizSign * 0.96 * diff.pushScale,
    pushVy: 0.1,
    enemyKind: 'patrol',
  };
}

export function recordSkyHopLeaderboard(
  entries: SkyHopLeaderboardEntry[],
  nextEntry: SkyHopLeaderboardEntry,
  maxEntries = 10
): SkyHopLeaderboardEntry[] {
  const safeAlt = Math.max(0, Math.floor(nextEntry.altitude));
  const normalized: SkyHopLeaderboardEntry = {
    ...nextEntry,
    altitude: safeAlt,
    level: Math.max(1, Math.floor(nextEntry.level || 1)),
  };
  const deduped = entries.filter((e) => e.id !== normalized.id);
  deduped.push(normalized);
  deduped.sort((a, b) => b.altitude - a.altitude || b.timestamp - a.timestamp);
  return deduped.slice(0, Math.max(1, maxEntries));
}
