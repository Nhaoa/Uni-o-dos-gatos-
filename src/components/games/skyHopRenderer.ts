import {
  FAST_FRAGILE_RESPAWN_SECONDS,
  findPortalDestination,
  FRAGILE_RESPAWN_SECONDS,
  getPlatformTheme,
  getSkyScenario,
  isFragileBreakKind,
  isPhasePlatformKind,
  isVerticalPlatformKind,
  PHASE_HIDDEN_SECONDS,
  PHASE_VISIBLE_SECONDS,
  PlatformTheme,
  SkyEnemy,
  SkyPlatform,
  SkyScenario,
} from '../../logic/skyHop';
import { PoolParticle } from '../../logic/skyHopParticles';

export interface BgStar {
  x: number;
  y: number;
  size: number;
  depth: number;
  phase: number;
}

export interface BgCloud {
  x: number;
  y: number;
  scale: number;
  speed: number;
  depth: number;
}

export interface ShootingStar {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export interface SkyHopRenderState {
  w: number;
  h: number;
  tSec: number;
  altitude: number;
  catX: number;
  catY: number;
  vx: number;
  facing: 1 | -1;
  squashX: number;
  squashY: number;
  trauma: number;
  pushInvuln: number;
  hitFlashAlpha: number;
  platforms: SkyPlatform[];
  enemies: SkyEnemy[];
  particles: PoolParticle[];
  stars: BgStar[];
  clouds: BgCloud[];
  shootingStar: ShootingStar;
  catSprite: HTMLImageElement | null;
}

function drawPlanetSphere(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  lightColor: string,
  darkColor: string,
  ringColor?: string
): void {
  const grad = ctx.createRadialGradient(
    x - r * 0.32,
    y - r * 0.32,
    r * 0.08,
    x,
    y,
    r
  );
  grad.addColorStop(0, lightColor);
  grad.addColorStop(1, darkColor);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  if (ringColor) {
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = Math.max(2, r * 0.12);
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.85, r * 0.44, -0.24, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawSputnikSatellite(
  ctx: CanvasRenderingContext2D,
  satX: number,
  satY: number,
  tSec: number,
  scale = 1
): void {
  ctx.save();
  ctx.translate(satX, satY);
  ctx.scale(scale, scale);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-4, -3);
  ctx.lineTo(-24, -13);
  ctx.moveTo(-4, 3);
  ctx.lineTo(-22, 14);
  ctx.moveTo(-5, -1);
  ctx.lineTo(-26, -4);
  ctx.moveTo(-5, 1);
  ctx.lineTo(-25, 6);
  ctx.stroke();

  ctx.fillStyle = '#e2e8f0';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (Math.sin(tSec * 7) > 0) {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(2, -2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSpiralGalaxy(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  tilt: number,
  rot: number,
  coreColor: string,
  armColor: string
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  ctx.scale(1, 0.56);

  const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 1.1);
  glow.addColorStop(0, coreColor);
  glow.addColorStop(0.45, armColor);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = coreColor;
  ctx.lineWidth = Math.max(1.5, r * 0.08);
  for (let arm = 0; arm < 2; arm++) {
    ctx.beginPath();
    const baseAngle = rot + arm * Math.PI;
    for (let step = 0; step <= 20; step++) {
      const k = step / 20;
      const angle = baseAngle + k * Math.PI * 1.6;
      const rad = k * r * 0.95;
      const gx = Math.cos(angle) * rad;
      const gy = Math.sin(angle) * rad;
      if (step === 0) ctx.moveTo(gx, gy);
      else ctx.lineTo(gx, gy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawScenarioBackdrop(
  ctx: CanvasRenderingContext2D,
  scenario: SkyScenario,
  state: SkyHopRenderState,
  pxShift: number
): void {
  const { w, h, tSec, altitude } = state;
  const minDim = Math.min(w, h);
  const localProgress = (altitude - scenario.milestoneStart) / 2000;
  const driftY = localProgress * h * 0.16;

  switch (scenario.id) {
    case 'earth': {
      // Sun halo + fluffy parallax clouds + red launch hills at bottom
      ctx.save();
      ctx.globalAlpha = scenario.cloudAlpha;
      const sunY = h * (0.16 + localProgress * 0.45);
      const sunGlow = ctx.createRadialGradient(w * 0.22, sunY, 8, w * 0.22, sunY, w * 0.24);
      sunGlow.addColorStop(0, 'rgba(254, 240, 138, 0.92)');
      sunGlow.addColorStop(0.5, 'rgba(251, 146, 60, 0.26)');
      sunGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = sunGlow;
      ctx.fillRect(0, 0, w, h);

      for (const c of state.clouds) {
        const cx = c.x * w + pxShift * c.depth;
        const cy = c.y * h;
        const r = 18 * c.scale;
        ctx.fillStyle =
          altitude > 850 ? 'rgba(254, 215, 170, 0.52)' : 'rgba(255, 253, 249, 0.8)';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.arc(cx + r * 0.85, cy - r * 0.2, r * 0.82, 0, Math.PI * 2);
        ctx.arc(cx + r * 1.65, cy + r * 0.05, r * 0.68, 0, Math.PI * 2);
        ctx.arc(cx - r * 0.75, cy + r * 0.1, r * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }

      if (altitude < 550) {
        const groundOffset = (altitude / 550) * 95;
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.quadraticCurveTo(w * 0.28, h - 42 + groundOffset, w * 0.55, h - 18 + groundOffset);
        ctx.quadraticCurveTo(w * 0.82, h - 48 + groundOffset, w, h - 14 + groundOffset);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      if (altitude > 900) {
        const satProgress = (tSec * 0.08) % 1.4;
        drawSputnikSatellite(ctx, (-0.2 + satProgress) * w, h * 0.28 + Math.sin(tSec * 1.4) * 14, tSec);
      }
      break;
    }

    case 'moon': {
      // Giant cratered silver Moon + tiny blue Earth crescent below + Sputnik
      const moonX = w * 0.74 + pxShift * 0.3;
      const moonY = h * 0.24 + driftY * 0.6;
      const mr = minDim * 0.16;
      drawPlanetSphere(ctx, moonX, moonY, mr, '#f1f5f9', '#64748b');

      // Lunar craters
      ctx.save();
      ctx.fillStyle = 'rgba(71, 85, 105, 0.35)';
      ctx.beginPath();
      ctx.arc(moonX - mr * 0.3, moonY - mr * 0.18, mr * 0.2, 0, Math.PI * 2);
      ctx.arc(moonX + mr * 0.28, moonY + mr * 0.25, mr * 0.14, 0, Math.PI * 2);
      ctx.arc(moonX + mr * 0.1, moonY - mr * 0.42, mr * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Distant Earth below
      drawPlanetSphere(ctx, w * 0.18 + pxShift * 0.15, h * 0.8 + driftY * 0.4, minDim * 0.065, '#38bdf8', '#1d4ed8');
      drawSputnikSatellite(ctx, ((-0.15 + ((tSec * 0.09) % 1.3)) * w), h * 0.45, tSec, 0.95);
      break;
    }

    case 'inner_planets': {
      // Blazing Solar corona at upper left + Mercury (cratered gray) + Venus (golden-cream swirls)
      const sunGlow = ctx.createRadialGradient(w * 0.1, h * 0.14, 8, w * 0.1, h * 0.14, minDim * 0.38);
      sunGlow.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
      sunGlow.addColorStop(0.35, 'rgba(251, 146, 60, 0.45)');
      sunGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = sunGlow;
      ctx.fillRect(0, 0, w, h);

      // Venus
      const vx = w * 0.78 + pxShift * 0.28;
      const vy = h * 0.25 + driftY * 0.5;
      const vr = minDim * 0.12;
      drawPlanetSphere(ctx, vx, vy, vr, '#fef08a', '#d97706');
      ctx.strokeStyle = 'rgba(255, 251, 235, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(vx, vy, vr * 0.65, -0.4, 2.2);
      ctx.stroke();

      // Mercury
      drawPlanetSphere(ctx, w * 0.24 + pxShift * 0.2, h * 0.62 + driftY * 0.7, minDim * 0.075, '#d6d3d1', '#57534e');
      break;
    }

    case 'mars': {
      // Giant Red Planet Mars with polar ice cap + canyon + tiny moons Phobos & Deimos
      const mx = w * 0.72 + pxShift * 0.32;
      const my = h * 0.28 + driftY * 0.55;
      const mr = minDim * 0.175;
      drawPlanetSphere(ctx, mx, my, mr, '#fb923c', '#7f1d1d');

      // Polar cap & dark Marineris scar
      ctx.save();
      ctx.fillStyle = 'rgba(255, 248, 237, 0.75)';
      ctx.beginPath();
      ctx.ellipse(mx - mr * 0.08, my - mr * 0.82, mr * 0.34, mr * 0.12, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(69, 10, 10, 0.45)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(mx - mr * 0.45, my + mr * 0.05);
      ctx.quadraticCurveTo(mx, my + mr * 0.18, mx + mr * 0.42, my - mr * 0.04);
      ctx.stroke();
      ctx.restore();

      // Phobos & Deimos
      const phX = mx + Math.cos(tSec * 0.7) * (mr * 1.45);
      const phY = my + Math.sin(tSec * 0.7) * (mr * 0.5);
      drawPlanetSphere(ctx, phX, phY, 6, '#e7e5e4', '#57534e');
      drawPlanetSphere(ctx, w * 0.16 + pxShift * 0.12, h * 0.55, 4.5, '#d6d3d1', '#44403c');
      break;
    }

    case 'asteroid_belt': {
      // Tumbling faceted rocky asteroids + Dwarf Planet Ceres
      drawPlanetSphere(ctx, w * 0.82 + pxShift * 0.18, h * 0.2 + driftY * 0.4, minDim * 0.08, '#a8a29e', '#292524');

      ctx.save();
      for (let i = 0; i < 12; i++) {
        const ax = (((i * 0.19 + 0.07) % 1) * w) + pxShift * (0.2 + (i % 3) * 0.15);
        const ay = (((i * 0.23 + localProgress * 0.65) % 1.15) - 0.05) * h;
        const size = 7 + (i % 4) * 5;
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(tSec * (0.3 + (i % 3) * 0.25) + i);
        ctx.fillStyle = i % 2 === 0 ? '#78716c' : '#57534e';
        ctx.strokeStyle = '#1c1917';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-size, -size * 0.35);
        ctx.lineTo(-size * 0.2, -size);
        ctx.lineTo(size * 0.85, -size * 0.45);
        ctx.lineTo(size, size * 0.4);
        ctx.lineTo(size * 0.1, size * 0.9);
        ctx.lineTo(-size * 0.8, size * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      break;
    }

    case 'jupiter': {
      // Banded Gas Giant with Great Red Spot & Galilean Moons
      const jx = w * 0.72 + pxShift * 0.3;
      const jy = h * 0.28 + driftY * 0.5;
      const jr = minDim * 0.21;
      drawPlanetSphere(ctx, jx, jy, jr, '#fde68a', '#92400e');

      ctx.save();
      ctx.beginPath();
      ctx.arc(jx, jy, jr, 0, Math.PI * 2);
      ctx.clip();
      const bands = [
        { y: -0.55, h: 0.14, c: 'rgba(180, 83, 9, 0.5)' },
        { y: -0.2, h: 0.18, c: 'rgba(254, 243, 199, 0.48)' },
        { y: 0.15, h: 0.16, c: 'rgba(154, 52, 18, 0.55)' },
        { y: 0.48, h: 0.12, c: 'rgba(217, 119, 6, 0.45)' },
      ];
      for (const b of bands) {
        ctx.fillStyle = b.c;
        ctx.fillRect(jx - jr, jy + b.y * jr, jr * 2, b.h * jr);
      }
      // Great Red Spot
      ctx.fillStyle = 'rgba(220, 38, 38, 0.82)';
      ctx.beginPath();
      ctx.ellipse(jx + jr * 0.26, jy + jr * 0.22, jr * 0.22, jr * 0.13, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Io & Europa orbiting
      drawPlanetSphere(ctx, jx - jr * 1.35, jy - jr * 0.25, 6, '#fef08a', '#ca8a04');
      drawPlanetSphere(ctx, jx + jr * 1.28, jy + jr * 0.35, 5, '#e0f2fe', '#64748b');
      break;
    }

    case 'saturn': {
      // Majestic Saturn with double translucent icy rings + Titan
      const sx = w * 0.7 + pxShift * 0.28;
      const sy = h * 0.27 + driftY * 0.45;
      const sr = minDim * 0.15;

      // Back rings
      ctx.save();
      ctx.strokeStyle = 'rgba(253, 230, 138, 0.48)';
      ctx.lineWidth = sr * 0.28;
      ctx.beginPath();
      ctx.ellipse(sx, sy, sr * 2.15, sr * 0.56, -0.24, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      drawPlanetSphere(ctx, sx, sy, sr, '#fef3c7', '#b45309');

      // Front rings
      ctx.save();
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.78)';
      ctx.lineWidth = sr * 0.22;
      ctx.beginPath();
      ctx.ellipse(sx, sy, sr * 2.15, sr * 0.56, -0.24, 0, Math.PI);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.55)';
      ctx.lineWidth = sr * 0.08;
      ctx.beginPath();
      ctx.ellipse(sx, sy, sr * 1.75, sr * 0.44, -0.24, 0, Math.PI);
      ctx.stroke();
      ctx.restore();

      drawPlanetSphere(ctx, w * 0.18 + pxShift * 0.16, h * 0.62, 8, '#fdba74', '#9a3412');
      break;
    }

    case 'ice_giants': {
      // Tilted pale cyan Uranus (vertical ring) + deep azure stormy Neptune
      const ux = w * 0.26 + pxShift * 0.25;
      const uy = h * 0.25 + driftY * 0.45;
      const ur = minDim * 0.115;
      drawPlanetSphere(ctx, ux, uy, ur, '#a5f3fc', '#0891b2');
      ctx.strokeStyle = 'rgba(207, 250, 254, 0.6)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(ux, uy, ur * 0.4, ur * 1.75, 0.2, 0, Math.PI * 2);
      ctx.stroke();

      const nx = w * 0.76 + pxShift * 0.28;
      const ny = h * 0.52 + driftY * 0.55;
      const nr = minDim * 0.13;
      drawPlanetSphere(ctx, nx, ny, nr, '#60a5fa', '#1e3a8a');
      ctx.strokeStyle = 'rgba(219, 234, 254, 0.55)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(nx - nr * 0.55, ny - nr * 0.18);
      ctx.lineTo(nx + nr * 0.35, ny - nr * 0.18);
      ctx.moveTo(nx - nr * 0.2, ny + nr * 0.22);
      ctx.lineTo(nx + nr * 0.58, ny + nr * 0.22);
      ctx.stroke();
      break;
    }

    case 'solar_system': {
      // Panoramic Solar System with Sun, orbital ellipses, all planets in order, Asteroid & Kuiper Belts!
      const cx = w * 0.5 + pxShift * 0.22;
      const cy = h * 0.42;
      const maxRx = w * 0.44;
      const maxRy = h * 0.32;

      // Kuiper Belt icy dust speckles around outer rim
      ctx.save();
      ctx.fillStyle = 'rgba(186, 230, 253, 0.42)';
      for (let i = 0; i < 40; i++) {
        const ang = (i / 40) * Math.PI * 2 + tSec * 0.04;
        const kx = cx + Math.cos(ang) * maxRx * (0.94 + (i % 3) * 0.05);
        const ky = cy + Math.sin(ang) * maxRy * (0.94 + (i % 3) * 0.05);
        ctx.fillRect(kx, ky, 2, 2);
      }

      // Sun at focus
      const sunR = minDim * 0.045;
      const sunGlow = ctx.createRadialGradient(cx, cy, 2, cx, cy, sunR * 2.4);
      sunGlow.addColorStop(0, '#fef08a');
      sunGlow.addColorStop(0.5, 'rgba(251, 146, 60, 0.65)');
      sunGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, sunR * 2.4, 0, Math.PI * 2);
      ctx.fill();
      drawPlanetSphere(ctx, cx, cy, sunR, '#fef9c3', '#ea580c');

      const planets = [
        { f: 0.18, r: 2.5, c1: '#d6d3d1', c2: '#57534e', sp: 1.6 }, // Mercury
        { f: 0.27, r: 3.5, c1: '#fef08a', c2: '#d97706', sp: 1.2 }, // Venus
        { f: 0.37, r: 4, c1: '#60a5fa', c2: '#1d4ed8', sp: 0.95 }, // Earth
        { f: 0.47, r: 3.2, c1: '#fb923c', c2: '#991b1b', sp: 0.78 }, // Mars
        { f: 0.62, r: 6.5, c1: '#fde68a', c2: '#92400e', sp: 0.5 }, // Jupiter
        { f: 0.74, r: 5.5, c1: '#fef3c7', c2: '#b45309', sp: 0.38, ring: 'rgba(253,230,138,0.8)' }, // Saturn
        { f: 0.84, r: 4.2, c1: '#a5f3fc', c2: '#0891b2', sp: 0.28 }, // Uranus
        { f: 0.93, r: 4.2, c1: '#60a5fa', c2: '#1e3a8a', sp: 0.22 }, // Neptune
      ];

      // Asteroid belt dots between Mars (0.47) and Jupiter (0.62)
      ctx.fillStyle = 'rgba(214, 211, 209, 0.55)';
      for (let i = 0; i < 24; i++) {
        const ang = (i / 24) * Math.PI * 2 + tSec * 0.12;
        ctx.fillRect(
          cx + Math.cos(ang) * maxRx * 0.545,
          cy + Math.sin(ang) * maxRy * 0.545,
          1.8,
          1.8
        );
      }

      for (let i = 0; i < planets.length; i++) {
        const pl = planets[i];
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy, maxRx * pl.f, maxRy * pl.f, 0, 0, Math.PI * 2);
        ctx.stroke();

        const ang = tSec * pl.sp + i * 1.1;
        const px = cx + Math.cos(ang) * maxRx * pl.f;
        const py = cy + Math.sin(ang) * maxRy * pl.f;
        drawPlanetSphere(ctx, px, py, pl.r, pl.c1, pl.c2, pl.ring);
      }
      ctx.restore();
      break;
    }

    case 'constellations': {
      // Luminous connected star constellations: Ursa Maior, Órion, and Cat Constellation (Felis)
      const patterns = [
        {
          // Felis Cosmonauta (Cat Ears + Face Constellation) upper center-right
          points: [
            [0.58, 0.18], [0.64, 0.11], [0.69, 0.18],
            [0.76, 0.18], [0.81, 0.11], [0.87, 0.18],
            [0.84, 0.28], [0.725, 0.33], [0.61, 0.28], [0.58, 0.18],
          ],
          color: '#fde68a',
        },
        {
          // Ursa Maior / Dipper left
          points: [
            [0.12, 0.22], [0.22, 0.25], [0.3, 0.31], [0.39, 0.34],
            [0.42, 0.44], [0.52, 0.42], [0.5, 0.32], [0.39, 0.34],
          ],
          color: '#93c5fd',
        },
        {
          // Órion Belt & Shoulders lower
          points: [
            [0.2, 0.62], [0.36, 0.6], [0.29, 0.7], [0.26, 0.72],
            [0.23, 0.74], [0.18, 0.84], [0.38, 0.82], [0.29, 0.7],
          ],
          color: '#c4b5fd',
        },
      ];

      ctx.save();
      for (const pat of patterns) {
        ctx.strokeStyle = pat.color;
        ctx.globalAlpha = 0.48;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        pat.points.forEach(([nx, ny], idx) => {
          const x = nx * w + pxShift * 0.25;
          const y = ny * h + Math.sin(tSec * 0.7 + idx) * 2;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.globalAlpha = 0.95;
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < pat.points.length; i++) {
          const [nx, ny] = pat.points[i];
          const x = nx * w + pxShift * 0.25;
          const y = ny * h + Math.sin(tSec * 0.7 + i) * 2;
          const pulse = 2.6 + Math.sin(tSec * 3 + i) * 0.9;
          ctx.beginPath();
          ctx.arc(x, y, pulse, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      break;
    }

    case 'nebula_milkyway': {
      // Diagonal Milky Way band + glowing plasma nebula clouds
      ctx.save();
      const mwGrad = ctx.createLinearGradient(0, h * 0.1, w, h * 0.9);
      mwGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
      mwGrad.addColorStop(0.5, 'rgba(232, 121, 249, 0.28)');
      mwGrad.addColorStop(1, 'rgba(167, 139, 250, 0.2)');
      ctx.fillStyle = mwGrad;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.25);
      ctx.bezierCurveTo(w * 0.35, h * 0.12, w * 0.65, h * 0.55, w, h * 0.35);
      ctx.lineTo(w, h * 0.75);
      ctx.bezierCurveTo(w * 0.6, h * 0.85, w * 0.3, h * 0.45, 0, h * 0.62);
      ctx.closePath();
      ctx.fill();

      // Glowing nebula clouds
      const puffs = [
        { x: 0.26, y: 0.32, r: minDim * 0.22, c: 'rgba(244, 114, 182, 0.25)' },
        { x: 0.72, y: 0.48, r: minDim * 0.26, c: 'rgba(34, 211, 238, 0.22)' },
        { x: 0.48, y: 0.68, r: minDim * 0.2, c: 'rgba(192, 132, 252, 0.24)' },
      ];
      for (const p of puffs) {
        const g = ctx.createRadialGradient(p.x * w + pxShift * 0.2, p.y * h, 4, p.x * w + pxShift * 0.2, p.y * h, p.r);
        g.addColorStop(0, p.c);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x * w + pxShift * 0.2, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;
    }

    case 'galaxies': {
      // Distant Spiral Galaxies drifting in deep space
      drawSpiralGalaxy(
        ctx,
        w * 0.72 + pxShift * 0.25,
        h * 0.26 + driftY * 0.3,
        minDim * 0.17,
        -0.35,
        tSec * 0.22,
        'rgba(254, 249, 195, 0.9)',
        'rgba(192, 132, 252, 0.42)'
      );
      drawSpiralGalaxy(
        ctx,
        w * 0.24 + pxShift * 0.16,
        h * 0.58 + driftY * 0.4,
        minDim * 0.11,
        0.48,
        -tSec * 0.18,
        'rgba(224, 242, 254, 0.85)',
        'rgba(56, 189, 248, 0.35)'
      );
      drawSpiralGalaxy(
        ctx,
        w * 0.55 + pxShift * 0.1,
        h * 0.82,
        minDim * 0.065,
        0.15,
        tSec * 0.3,
        'rgba(253, 230, 138, 0.75)',
        'rgba(244, 114, 182, 0.3)'
      );
      break;
    }
  }
}

function drawEnemies(
  ctx: CanvasRenderingContext2D,
  enemies: SkyEnemy[],
  w: number,
  h: number,
  tSec: number
): void {
  const minDim = Math.min(w, h);
  for (const e of enemies) {
    const ex = e.x * w;
    const ey = e.y * h + Math.sin(e.phase) * 4;
    const r = e.radius * minDim;

    ctx.save();
    ctx.translate(ex, ey);

    if (e.kind === 'patrol') {
      // Orbital Bumper Drone with spiky bumper halo & directional thrusters
      ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : '#dc2626';
      ctx.strokeStyle = '#2b1111';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Bumper spikes / antennae
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + tSec * 2.2;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * (r + 3), Math.sin(ang) * (r + 3), 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Angry visor eye pointing in movement direction
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(e.dir * r * 0.32, -r * 0.1, r * 0.3, r * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'charger') {
      // Solar Ram Comet with telegraph aim sight arrow before dashing
      if (e.state === 'telegraph') {
        ctx.save();
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(e.dir * (r + 6), 0);
        ctx.lineTo(e.dir * (r + 56), 0);
        ctx.stroke();
        ctx.setLineDash([]);
        // Arrow head
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(e.dir * (r + 62), 0);
        ctx.lineTo(e.dir * (r + 50), -6);
        ctx.lineTo(e.dir * (r + 50), 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      const bodyColor =
        e.hitFlash > 0
          ? '#ffffff'
          : e.state === 'telegraph'
          ? '#fde047'
          : e.state === 'active'
          ? '#f97316'
          : '#ea580c';
      ctx.fillStyle = bodyColor;
      ctx.strokeStyle = '#2b1111';
      ctx.lineWidth = 2.2;
      // Sleek diamond ram shape
      ctx.beginPath();
      ctx.moveTo(e.dir * r * 1.35, 0);
      ctx.lineTo(0, -r * 0.9);
      ctx.lineTo(-e.dir * r * 1.05, 0);
      ctx.lineTo(0, r * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fff8ed';
      ctx.beginPath();
      ctx.arc(e.dir * r * 0.35, 0, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Cosmic Repulsor Saucer with expanding telegraph ring & active repulsion wave
      if (e.state === 'telegraph') {
        const ringProgress = 1 - Math.max(0, e.stateTimer / 0.55);
        ctx.strokeStyle = `rgba(192, 132, 252, ${0.45 + ringProgress * 0.55})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, r + 8 + ringProgress * 28, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.state === 'active') {
        const waveGrad = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 3.1);
        waveGrad.addColorStop(0, 'rgba(192, 132, 252, 0.55)');
        waveGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.32)');
        waveGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = waveGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r * 3.1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Saucer dome & metallic hull
      ctx.fillStyle = '#a5f3fc';
      ctx.strokeStyle = '#1e1b4b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -r * 0.25, r * 0.58, Math.PI, 0);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : '#7c3aed';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.25, r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Blinking rim lights
      ctx.fillStyle = Math.sin(tSec * 10 + e.id) > 0 ? '#fde047' : '#38bdf8';
      for (const lx of [-r * 0.68, 0, r * 0.68]) {
        ctx.beginPath();
        ctx.arc(lx, 0, 2.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

export function renderSkyHopFrame(
  ctx: CanvasRenderingContext2D,
  state: SkyHopRenderState
): void {
  const { w, h, tSec, altitude } = state;
  const scenario = getSkyScenario(altitude);
  const pxShift = (state.catX - 0.5) * -18;
  const shakeMag = state.trauma * state.trauma * 7;
  const shakeX = (Math.random() * 2 - 1) * shakeMag;
  const shakeY = (Math.random() * 2 - 1) * shakeMag;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // 1. Sky Gradient matching current 2000m scenario
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0, scenario.skyTop);
  skyGrad.addColorStop(1, scenario.skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(-10, -10, w + 20, h + 20);

  // 2. Twinkling Starfield
  if (scenario.starAlpha > 0.02) {
    for (const st of state.stars) {
      const twinkle = 0.55 + 0.45 * Math.sin(tSec * 2.5 + st.phase);
      ctx.globalAlpha = scenario.starAlpha * twinkle;
      ctx.fillStyle = st.depth > 0.5 ? '#fde68a' : '#f8fafc';
      ctx.beginPath();
      ctx.arc(st.x * w + pxShift * st.depth, st.y * h, st.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Shooting star
  if (state.shootingStar.active) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, state.shootingStar.life);
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const sx = state.shootingStar.x * w;
    const sy = state.shootingStar.y * h;
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - state.shootingStar.vx * 36, sy - state.shootingStar.vy * 36);
    ctx.stroke();
    ctx.restore();
  }

  // 3. Scenario-specific celestial artwork (planets in order, belts, solar system, constellations, galaxies)
  drawScenarioBackdrop(ctx, scenario, state, pxShift);

  // 4. Platforms (Altitude-themed decks + Moving, Vertical, Spring, Fragile/Phase Variants, and Portals)
  const platTheme: PlatformTheme = getPlatformTheme(altitude);
  const phaseCycleLen = PHASE_VISIBLE_SECONDS + PHASE_HIDDEN_SECONDS;

  for (const p of state.platforms) {
    const px = p.x * w;
    const py = p.y * h + p.bounceSquash * 5;
    const pw = p.w * w;
    const ph = 15;

    // Vertical travel track guide for all vertically oscillating variants
    if (isVerticalPlatformKind(p.kind)) {
      const trackTop = p.baseY * h - p.ampY * h;
      const trackBottom = p.baseY * h + p.ampY * h + ph;
      const centerX = px + pw * 0.5;
      ctx.save();
      ctx.strokeStyle =
        p.kind === 'phase_vertical'
          ? 'rgba(232, 121, 249, 0.34)'
          : 'rgba(56, 189, 248, 0.28)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(centerX, trackTop);
      ctx.lineTo(centerX, trackBottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Ghost silhouette + countdown reform bar for broken fragile variants
    if (p.consumed) {
      if (isFragileBreakKind(p.kind) && p.respawnTimer > 0) {
        const totalRespawn =
          p.kind === 'fast_fragile' ? FAST_FRAGILE_RESPAWN_SECONDS : FRAGILE_RESPAWN_SECONDS;
        const reformPct = Math.max(0, Math.min(1, 1 - p.respawnTimer / totalRespawn));
        const ghostAccent =
          p.kind === 'fast_fragile'
            ? '#22d3ee'
            : p.kind === 'fragile_spring'
            ? '#fbbf24'
            : '#a5f3fc';
        const ghostFill =
          p.kind === 'fast_fragile'
            ? 'rgba(34, 211, 238, 0.36)'
            : p.kind === 'fragile_spring'
            ? 'rgba(251, 191, 36, 0.34)'
            : 'rgba(165, 243, 252, 0.32)';

        ctx.save();
        ctx.globalAlpha = 0.28 + reformPct * 0.48;
        ctx.strokeStyle = ghostAccent;
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(px, py, pw, ph, [8]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = ghostFill;
        ctx.beginPath();
        ctx.roundRect(px + 2, py + 2, Math.max(4, (pw - 4) * reformPct), ph - 4, [6]);
        ctx.fill();
        ctx.restore();
      }

      if (p.breakAnim <= 0) continue;
    }

    // Ghost outline when a rapid-cycling phase or phase_vertical platform is currently intangible
    if (isPhasePlatformKind(p.kind) && !p.phaseVisible) {
      const inCycle = p.phaseTimer % phaseCycleLen;
      const hiddenPct = Math.max(
        0,
        Math.min(1, (inCycle - PHASE_VISIBLE_SECONDS) / PHASE_HIDDEN_SECONDS)
      );
      ctx.save();
      ctx.globalAlpha = 0.24 + hiddenPct * 0.44;
      ctx.strokeStyle = '#e879f9';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, [8]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(232, 121, 249, 0.25)';
      ctx.beginPath();
      ctx.roundRect(px + 2, py + 2, Math.max(4, (pw - 4) * hiddenPct), ph - 4, [6]);
      ctx.fill();
      ctx.restore();
      continue;
    }

    ctx.save();
    if (isFragileBreakKind(p.kind)) {
      const isFast = p.kind === 'fast_fragile';
      const isFragileSpring = p.kind === 'fragile_spring';
      const isFragileVert = p.kind === 'fragile_vertical';
      const split = p.consumed ? (1 - p.breakAnim) * 26 : 0;
      const drop = p.consumed ? (1 - p.breakAnim) * 24 : 0;
      ctx.globalAlpha = p.consumed ? p.breakAnim : 0.96;

      const drawHalf = (isLeft: boolean) => {
        ctx.save();
        ctx.translate(isLeft ? -split : split, drop);
        if (p.consumed) {
          const cx = px + (isLeft ? pw * 0.25 : pw * 0.75);
          ctx.translate(cx, py + ph / 2);
          ctx.rotate((isLeft ? -1 : 1) * (1 - p.breakAnim) * 0.45);
          ctx.translate(-cx, -(py + ph / 2));
        }
        const halfX = isLeft ? px : px + pw * 0.5;
        const halfW = pw * 0.5;
        const cg = ctx.createLinearGradient(0, py, 0, py + ph);
        if (isFast) {
          cg.addColorStop(0, '#fde047');
          cg.addColorStop(0.5, '#67e8f9');
          cg.addColorStop(1, '#0284c7');
        } else if (isFragileSpring) {
          cg.addColorStop(0, '#fef08a');
          cg.addColorStop(0.55, '#fb923c');
          cg.addColorStop(1, '#0891b2');
        } else if (isFragileVert) {
          cg.addColorStop(0, '#e0f2fe');
          cg.addColorStop(0.5, '#38bdf8');
          cg.addColorStop(1, '#4f46e5');
        } else {
          cg.addColorStop(0, '#cffafe');
          cg.addColorStop(1, '#818cf8');
        }
        ctx.fillStyle = cg;
        ctx.strokeStyle = isFast ? '#082f49' : '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(halfX, py, halfW - 1, ph, isLeft ? [8, 2, 2, 8] : [2, 8, 8, 2]);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = isFast || isFragileSpring ? '#fef9c3' : '#e0f2fe';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(halfX + halfW * 0.35, py + 2);
        ctx.lineTo(halfX + halfW * 0.52, py + ph * 0.52);
        ctx.lineTo(halfX + halfW * 0.28, py + ph - 2);
        ctx.stroke();
        ctx.restore();
      };

      drawHalf(true);
      drawHalf(false);

      if (!p.consumed) {
        ctx.strokeStyle =
          isFast || isFragileSpring ? 'rgba(254, 240, 138, 0.9)' : 'rgba(255, 255, 255, 0.85)';
        ctx.setLineDash(isFast ? [3, 2] : [4, 3]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(px + 2, py + 2, pw - 4, ph - 4, [6]);
        ctx.stroke();
        ctx.setLineDash([]);

        if (isFragileSpring) {
          // Fragile crystal coil spring pad on top
          const coilH = 7;
          const cx = px + pw * 0.5;
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(cx - 9, py);
          ctx.lineTo(cx + 7, py - coilH * 0.4);
          ctx.lineTo(cx - 7, py - coilH * 0.8);
          ctx.lineTo(cx + 7, py - coilH);
          ctx.stroke();

          ctx.fillStyle = '#22d3ee';
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.roundRect(cx - pw * 0.22, py - coilH - 6, pw * 0.44, 6.5, [4]);
          ctx.fill();
          ctx.stroke();
        } else if (isFragileVert) {
          // Up/Down chevron marker on fragile vertical crystal
          const centerX = px + pw * 0.5;
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(centerX - 5, py + 6.5);
          ctx.lineTo(centerX, py + 2.5);
          ctx.lineTo(centerX + 5, py + 6.5);
          ctx.moveTo(centerX - 5, py + ph - 6.5);
          ctx.lineTo(centerX, py + ph - 2.5);
          ctx.lineTo(centerX + 5, py + ph - 6.5);
          ctx.stroke();
        }
      }
    } else if (isPhasePlatformKind(p.kind)) {
      // Rapid blink/flicker warning during last 0.45s before phasing out
      const inCycle = p.phaseTimer % phaseCycleLen;
      const remaining = PHASE_VISIBLE_SECONDS - inCycle;
      if (remaining < 0.45) {
        ctx.globalAlpha = Math.sin(tSec * 28) > 0 ? 0.95 : 0.42;
      }

      ctx.shadowColor = 'rgba(232, 121, 249, 0.55)';
      ctx.shadowBlur = 10;
      const pg = ctx.createLinearGradient(px, py, px + pw, py + ph);
      pg.addColorStop(0, '#f0abfc');
      pg.addColorStop(0.5, '#a855f7');
      pg.addColorStop(1, '#22d3ee');
      ctx.fillStyle = pg;
      ctx.strokeStyle = '#3b0764';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, [8]);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Energy core bar shrinking as phase approaches hide
      const lifeRatio = Math.max(0.08, Math.min(1, remaining / PHASE_VISIBLE_SECONDS));
      ctx.fillStyle = '#fdf4ff';
      ctx.beginPath();
      ctx.roundRect(px + 6, py + ph * 0.5 - 2, (pw - 12) * lifeRatio, 4, [2]);
      ctx.fill();

      if (p.kind === 'phase_vertical') {
        const centerX = px + pw * 0.5;
        ctx.strokeStyle = '#3b0764';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(centerX - 5, py + 6.5);
        ctx.lineTo(centerX, py + 2.5);
        ctx.lineTo(centerX + 5, py + 6.5);
        ctx.moveTo(centerX - 5, py + ph - 6.5);
        ctx.lineTo(centerX, py + ph - 2.5);
        ctx.lineTo(centerX + 5, py + ph - 6.5);
        ctx.stroke();
      }
    } else if (p.kind === 'portal') {
      const centerX = px + pw * 0.5;
      const centerY = py + ph * 0.5;

      // Faint dotted energy arc toward upper warp target so players anticipate teleportation
      const dest = findPortalDestination(p, state.platforms);
      if (dest && dest.y > 0) {
        const dx = (dest.x + dest.w * 0.5) * w;
        const dy = dest.y * h + ph * 0.5;
        ctx.save();
        ctx.strokeStyle =
          dest.kind === 'portal' ? 'rgba(34, 211, 238, 0.32)' : 'rgba(232, 121, 249, 0.22)';
        ctx.setLineDash([4, 5]);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.quadraticCurveTo((centerX + dx) * 0.5 + 18, (centerY + dy) * 0.5, dx, dy);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // Swirling cosmic portal pad
      ctx.shadowColor = 'rgba(34, 211, 238, 0.72)';
      ctx.shadowBlur = 14;
      const pg = ctx.createLinearGradient(px, py, px + pw, py + ph);
      pg.addColorStop(0, '#0ea5e9');
      pg.addColorStop(0.5, '#7e22ce');
      pg.addColorStop(1, '#22d3ee');
      ctx.fillStyle = pg;
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, [10]);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Swirling vortex ellipse + orbiting energy motes
      const pulseW = pw * (0.28 + 0.05 * Math.sin(tSec * 6 + p.id));
      ctx.strokeStyle = '#f0abfc';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, pulseW, 4.5, 0, 0, Math.PI * 2);
      ctx.stroke();

      for (let m = 0; m < 2; m++) {
        const ang = tSec * 4.5 + m * Math.PI + p.id;
        const mx = centerX + Math.cos(ang) * (pw * 0.36);
        const my = centerY + Math.sin(ang) * 4;
        ctx.fillStyle = m === 0 ? '#fef08a' : '#67e8f9';
        ctx.beginPath();
        ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Upward warp chevron
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX - 5, centerY + 2.5);
      ctx.lineTo(centerX, centerY - 2.5);
      ctx.lineTo(centerX + 5, centerY + 2.5);
      ctx.stroke();
    } else if (p.kind === 'spring') {
      const pg = ctx.createLinearGradient(0, py, 0, py + ph);
      pg.addColorStop(0, '#fde047');
      pg.addColorStop(1, '#d97706');
      ctx.fillStyle = pg;
      ctx.strokeStyle = platTheme.borderColor;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, [8]);
      ctx.fill();
      ctx.stroke();

      const coilH = 7 + p.bounceSquash * 10;
      const cx = px + pw * 0.5;
      ctx.strokeStyle = '#2b1111';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - 10, py);
      ctx.lineTo(cx + 8, py - coilH * 0.4);
      ctx.lineTo(cx - 8, py - coilH * 0.8);
      ctx.lineTo(cx + 8, py - coilH);
      ctx.stroke();

      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = '#2b1111';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx - pw * 0.24, py - coilH - 6, pw * 0.48, 7, [4]);
      ctx.fill();
      ctx.stroke();
    } else if (p.kind === 'moving') {
      ctx.shadowColor = platTheme.glowColor;
      ctx.shadowBlur = 6;
      const mg = ctx.createLinearGradient(0, py, 0, py + ph);
      mg.addColorStop(0, '#fca5a5');
      mg.addColorStop(1, '#b91c1c');
      ctx.fillStyle = mg;
      ctx.strokeStyle = platTheme.borderColor;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, [8]);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = 'rgba(251, 191, 36, 0.85)';
      ctx.beginPath();
      ctx.arc(px + 10, py + ph + 2, 3.5, 0, Math.PI * 2);
      ctx.arc(px + pw - 10, py + ph + 2, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = Math.sin(tSec * 9 + p.id) > 0 ? '#fef08a' : '#7f1d1d';
      ctx.beginPath();
      ctx.arc(px + pw * 0.5, py + ph * 0.5, 3.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'vertical') {
      const centerX = px + pw * 0.5;

      // Elevator deck with metallic sky-teal plating + up/down chevrons
      ctx.shadowColor = 'rgba(56, 189, 248, 0.45)';
      ctx.shadowBlur = 8;
      const vg = ctx.createLinearGradient(0, py, 0, py + ph);
      vg.addColorStop(0, '#bae6fd');
      vg.addColorStop(1, '#0284c7');
      ctx.fillStyle = vg;
      ctx.strokeStyle = platTheme.borderColor;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, [8]);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Up / Down double chevron indicator in center
      ctx.strokeStyle = '#0c4a6e';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(centerX - 6, py + 6.5);
      ctx.lineTo(centerX, py + 2.5);
      ctx.lineTo(centerX + 6, py + 6.5);
      ctx.moveTo(centerX - 6, py + ph - 6.5);
      ctx.lineTo(centerX, py + ph - 2.5);
      ctx.lineTo(centerX + 6, py + ph - 6.5);
      ctx.stroke();

      // Side thrusters pulsing based on vertical direction
      const goingUp = Math.cos(p.phase) < 0;
      ctx.fillStyle = goingUp ? '#fef08a' : '#7dd3fc';
      ctx.beginPath();
      ctx.arc(px + 9, py + ph * 0.5, 2.5, 0, Math.PI * 2);
      ctx.arc(px + pw - 9, py + ph * 0.5, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Standard platforms transform visually with altitude cosmic tier!
      ctx.shadowColor = platTheme.glowColor;
      ctx.shadowBlur = platTheme.style === 'constellation' || platTheme.style === 'galactic' ? 10 : 5;
      const ng = ctx.createLinearGradient(0, py, 0, py + ph);
      ng.addColorStop(0, platTheme.topColor);
      ng.addColorStop(1, platTheme.bottomColor);
      ctx.fillStyle = ng;
      ctx.strokeStyle = platTheme.borderColor;
      ctx.lineWidth = 2.2;

      if (platTheme.style === 'asteroid') {
        // Faceted angular asteroid rock slab
        ctx.beginPath();
        ctx.moveTo(px + 6, py);
        ctx.lineTo(px + pw - 6, py);
        ctx.lineTo(px + pw, py + ph * 0.45);
        ctx.lineTo(px + pw - 5, py + ph);
        ctx.lineTo(px + 5, py + ph);
        ctx.lineTo(px, py + ph * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.roundRect(px, py, pw, ph, [8]);
        ctx.fill();
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      if (platTheme.style === 'lunar') {
        // Lunar regolith craters + cyan beacon stripe
        ctx.fillStyle = 'rgba(51, 65, 85, 0.35)';
        ctx.beginPath();
        ctx.ellipse(px + pw * 0.28, py + ph * 0.52, 6, 2.5, 0, 0, Math.PI * 2);
        ctx.ellipse(px + pw * 0.68, py + ph * 0.48, 4.5, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = platTheme.stripeColor;
        ctx.fillRect(px + 8, py + 2.5, pw - 16, 2.5);
      } else if (platTheme.style === 'constellation') {
        // Luminous connected star constellation line across the deck
        const pts = [
          [px + 10, py + ph * 0.65],
          [px + pw * 0.35, py + ph * 0.35],
          [px + pw * 0.65, py + ph * 0.65],
          [px + pw - 10, py + ph * 0.35],
        ];
        ctx.strokeStyle = platTheme.stripeColor;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        pts.forEach(([sx, sy], idx) => (idx === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy)));
        ctx.stroke();
        ctx.fillStyle = platTheme.rivetColor;
        for (const [sx, sy] of pts) {
          ctx.beginPath();
          ctx.arc(sx, sy, 2.1, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (platTheme.style === 'galactic') {
        // Neon galactic core ribbon + pulsing nebula nodes
        ctx.fillStyle = platTheme.stripeColor;
        ctx.beginPath();
        ctx.roundRect(px + 6, py + 3.5, pw - 12, 3.2, [2]);
        ctx.fill();
        ctx.fillStyle = platTheme.rivetColor;
        const pulse = 2 + Math.sin(tSec * 5 + p.id) * 0.6;
        ctx.beginPath();
        ctx.arc(px + 11, py + ph - 4.5, pulse, 0, Math.PI * 2);
        ctx.arc(px + pw * 0.5, py + ph - 4.5, pulse, 0, Math.PI * 2);
        ctx.arc(px + pw - 11, py + ph - 4.5, pulse, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Cosmonaut, Martian, Asteroid, Gas Giant trim + corner rivets
        ctx.fillStyle = platTheme.stripeColor;
        ctx.fillRect(px + 6, py + 3, pw - 12, 3.5);
        ctx.fillStyle = platTheme.rivetColor;
        ctx.beginPath();
        ctx.arc(px + 8, py + ph - 4.5, 1.8, 0, Math.PI * 2);
        ctx.arc(px + pw - 8, py + ph - 4.5, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // 5. Enemies that push the player
  drawEnemies(ctx, state.enemies, w, h, tSec);

  // 6. Pooled Particles (shockwave rings, impact sparks, crystal shards, stars, dust puffs)
  for (const pt of state.particles) {
    if (!pt.active) continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.alpha);
    ctx.translate(pt.x * w, pt.y * h);
    if (pt.shape === 'ring') {
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = Math.max(1.8, 3.5 * pt.alpha);
      ctx.beginPath();
      ctx.ellipse(0, 0, pt.size, pt.size * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (pt.shape === 'spark') {
      ctx.rotate(pt.rot);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, pt.size * 2.2, Math.max(1.4, pt.size * 0.45), 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (pt.shape === 'shard') {
      ctx.rotate(pt.rot);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.moveTo(0, -pt.size);
      ctx.lineTo(pt.size * 0.85, pt.size * 0.6);
      ctx.lineTo(-pt.size * 0.75, pt.size * 0.8);
      ctx.closePath();
      ctx.fill();
    } else if (pt.shape === 'star') {
      ctx.rotate(pt.rot);
      ctx.fillStyle = pt.color;
      const r = pt.size * 1.1;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.35, -r * 0.35);
      ctx.lineTo(r, 0);
      ctx.lineTo(r * 0.35, r * 0.35);
      ctx.lineTo(0, r);
      ctx.lineTo(-r * 0.35, r * 0.35);
      ctx.lineTo(-r, 0);
      ctx.lineTo(-r * 0.35, -r * 0.35);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(0, 0, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 7. Player's Actual Custom Cat Sprite + Push-Hit Flicker & Cosmonaut Helmet
  const catSize = Math.max(54, Math.round(Math.min(w, h) * 0.165));
  const cx = state.catX * w;
  const cy = state.catY * h;
  const tilt = Math.max(-0.24, Math.min(0.24, state.vx * 0.14));

  ctx.save();
  if (state.pushInvuln > 0 && Math.floor(tSec * 20) % 2 === 0) {
    ctx.globalAlpha = 0.65;
  }
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  ctx.scale(state.facing * state.squashX, state.squashY);

  if (state.catSprite) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(state.catSprite, -catSize / 2, -catSize / 2, catSize, catSize);
  } else {
    ctx.fillStyle = '#fffdf9';
    ctx.strokeStyle = '#2b1111';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, catSize * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  if (altitude > 1100) {
    const helmetAlpha = Math.min(0.85, (altitude - 1100) / 500);
    ctx.globalAlpha = helmetAlpha;
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -catSize * 0.06, catSize * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -catSize * 0.06, catSize * 0.36, -Math.PI * 0.75, -Math.PI * 0.42);
    ctx.stroke();
  }

  ctx.restore();

  // Subtle peripheral impact flash vignette when colliding with an enemy
  if (state.hitFlashAlpha > 0.01) {
    ctx.save();
    const vg = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.25, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    vg.addColorStop(0, 'transparent');
    vg.addColorStop(1, `rgba(239, 68, 68, ${Math.min(0.42, state.hitFlashAlpha)})`);
    ctx.fillStyle = vg;
    ctx.fillRect(-10, -10, w + 20, h + 20);
    ctx.restore();
  }

  ctx.restore();
}
