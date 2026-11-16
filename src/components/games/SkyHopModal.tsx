import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Play, Pause, RotateCcw, Music, Trophy } from 'lucide-react';
import { CatState, PlayerRole, SkyHopLeaderboardEntry } from '../../types/game';
import { ViewportOrientation } from '../../hooks/useOrientation';
import { CatSvg } from '../CatSvg';
import { sfx } from '../../utils/sound';
import {
  ALTITUDE_SCROLL_SCALE,
  computeSkyHopLevelPawsReward,
  computeSkyHopReward,
  createEnemy,
  createInitialPlatforms,
  evaluateBounceAccuracy,
  getDifficultyParams,
  getSkyScenario,
  maintainPlatformLadder,
  PAWS_PER_LEVEL,
  recordSkyHopLeaderboard,
  resolveEnemyPush,
  resolvePlatformBounce,
  SCENARIO_STEP_ALTITUDE,
  scrollPlatforms,
  SKYHOP_GRAVITY,
  SkyEnemy,
  SkyPlatform,
  updateEnemies,
  updatePlatforms,
} from '../../logic/skyHop';
import { AchievementEvent } from '../../logic/achievements';
import {
  BgCloud,
  BgStar,
  renderSkyHopFrame,
} from './skyHopRenderer';
import {
  clearParticlePool,
  createParticlePool,
  emitEnemyCollisionBurst,
  emitJumpBurst,
  emitPortalWarpBurst,
  spawnPooledParticle,
  stepParticles,
} from '../../logic/skyHopParticles';
import { getScenarioMusicSpec, SkyHopMusicPlayer } from '../../logic/skyHopMusic';

interface SkyHopModalProps {
  open: boolean;
  myRole: PlayerRole;
  myNick: string;
  myCat: CatState;
  leaderboard: SkyHopLeaderboardEntry[];
  vp: ViewportOrientation;
  onClose: () => void;
  onAwardPaws: (role: PlayerRole, amount: number) => void;
  onRecordScore: (entry: SkyHopLeaderboardEntry) => void;
  onAchievementEvent?: (role: PlayerRole, event: AchievementEvent) => void;
}

const LEADERBOARD_STORAGE_KEY = 'skyhop_leaderboard';

function loadStoredLeaderboard(): SkyHopLeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function createStars(): BgStar[] {
  return Array.from({ length: 64 }, (_, i) => ({
    x: ((i * 73) % 100) / 100,
    y: ((i * 37) % 100) / 100,
    size: 1 + (i % 3) * 0.75,
    depth: 0.15 + (i % 4) * 0.2,
    phase: i * 0.7,
  }));
}

function createClouds(): BgCloud[] {
  return Array.from({ length: 7 }, (_, i) => ({
    x: ((i * 19 + 11) % 100) / 100,
    y: 0.1 + (i % 5) * 0.18,
    scale: 0.7 + (i % 3) * 0.25,
    speed: 0.015 + (i % 3) * 0.008,
    depth: 0.2 + (i % 3) * 0.25,
  }));
}

export const SkyHopModal: React.FC<SkyHopModalProps> = ({
  open,
  myRole,
  myNick,
  myCat,
  leaderboard,
  vp,
  onClose,
  onAwardPaws,
  onRecordScore,
  onAchievementEvent,
}) => {
  const [phase, setPhase] = useState<'ready' | 'playing' | 'paused' | 'gameover'>('ready');
  const [score, setScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [pawsBonusRun, setPawsBonusRun] = useState(0);
  const [perfectCombo, setPerfectCombo] = useState(0);
  const [maxComboRun, setMaxComboRun] = useState(0);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [scenarioLabel, setScenarioLabel] = useState('Terra & Troposfera');
  const [musicThemeTitle, setMusicThemeTitle] = useState(getScenarioMusicSpec('earth').themeTitle);
  const [sectorBanner, setSectorBanner] = useState<{ title: string; subtitle: string } | null>(null);
  const [localLeaderboard, setLocalLeaderboard] = useState<SkyHopLeaderboardEntry[]>(loadStoredLeaderboard);
  const [bestScore, setBestScore] = useState(() =>
    Number(localStorage.getItem('skyhop_best') || 0)
  );

  const mergedLeaderboard = useMemo(() => {
    let acc: SkyHopLeaderboardEntry[] = [];
    for (const item of [...leaderboard, ...localLeaderboard]) {
      if (item && typeof item.altitude === 'number') {
        acc = recordSkyHopLeaderboard(acc, item, 10);
      }
    }
    return acc;
  }, [leaderboard, localLeaderboard]);

  const callbacksRef = useRef({
    myRole,
    myNick,
    onAwardPaws,
    onRecordScore,
    onAchievementEvent,
  });
  callbacksRef.current = {
    myRole,
    myNick,
    onAwardPaws,
    onRecordScore,
    onAchievementEvent,
  };

  const musicPlayerRef = useRef<SkyHopMusicPlayer | null>(null);
  if (!musicPlayerRef.current) {
    musicPlayerRef.current = new SkyHopMusicPlayer();
  }

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgHolderRef = useRef<HTMLDivElement | null>(null);
  const catSpriteRef = useRef<HTMLImageElement | null>(null);
  const bannerTimeoutRef = useRef<number | null>(null);
  const scoreSpanRef = useRef<HTMLSpanElement | null>(null);
  const nextMilestoneSpanRef = useRef<HTMLSpanElement | null>(null);
  const milestoneBarRef = useRef<HTMLDivElement | null>(null);
  const lastHudSyncRef = useRef(0);

  const simRef = useRef({
    catX: 0.5,
    catY: 0.78,
    vy: -0.95,
    vx: 0,
    knockbackVx: 0,
    pushInvuln: 0,
    facing: 1 as 1 | -1,
    squashX: 1,
    squashY: 1,
    targetX: null as number | null,
    platforms: createInitialPlatforms() as SkyPlatform[],
    enemies: [] as SkyEnemy[],
    altitude: 0,
    trauma: 0,
    hitstop: 0,
    hitFlashAlpha: 0,
    keys: new Set<string>(),
    dragging: false,
    particlePool: createParticlePool(),
    stars: createStars(),
    clouds: createClouds(),
    shootingStar: { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0 },
    lastSectorIndex: 0,
    perfectCombo: 0,
    runMaxCombo: 0,
  });

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Convert player's live customized CatSvg into a crisp cached Image for 60 FPS canvas rendering
  useEffect(() => {
    if (!open || !svgHolderRef.current) return;
    const svgEl = svgHolderRef.current.querySelector('svg');
    if (!svgEl) return;

    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', '256');
    clone.setAttribute('height', '256');
    clone.removeAttribute('class');

    const markup = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      catSpriteRef.current = img;
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [open, myCat]);

  const startGame = useCallback(() => {
    const s = simRef.current;
    s.catX = 0.5;
    s.catY = 0.76;
    s.vy = -1.08;
    s.vx = 0;
    s.knockbackVx = 0;
    s.pushInvuln = 0;
    s.facing = 1;
    s.squashX = 0.86;
    s.squashY = 1.16;
    s.targetX = null;
    s.altitude = 0;
    s.trauma = 0;
    s.hitstop = 0;
    s.hitFlashAlpha = 0;
    s.lastSectorIndex = 0;
    s.perfectCombo = 0;
    s.runMaxCombo = 0;
    s.platforms = createInitialPlatforms();
    s.enemies = [];
    clearParticlePool(s.particlePool);
    lastHudSyncRef.current = 0;
    if (scoreSpanRef.current) scoreSpanRef.current.textContent = '0 m';
    if (nextMilestoneSpanRef.current) {
      nextMilestoneSpanRef.current.textContent = `→ ${SCENARIO_STEP_ALTITUDE.toLocaleString('pt-BR')} m`;
    }
    if (milestoneBarRef.current) milestoneBarRef.current.style.width = '0%';
    setScore(0);
    setCurrentLevel(1);
    setPawsBonusRun(0);
    setPerfectCombo(0);
    setMaxComboRun(0);
    setScenarioLabel('Terra & Troposfera');
    setMusicThemeTitle(getScenarioMusicSpec('earth').themeTitle);
    setSectorBanner(null);
    setShowLeaderboard(false);
    setPhase('playing');
    sfx.bounce();
    musicPlayerRef.current?.setEnabled(musicEnabled);
    musicPlayerRef.current?.start('earth');
  }, [musicEnabled]);

  useEffect(() => {
    const player = musicPlayerRef.current;
    if (!player) return;
    player.setEnabled(musicEnabled);
    if (!open || phase !== 'playing') {
      player.stop();
    } else {
      player.start(getSkyScenario(simRef.current.altitude).id);
    }
  }, [open, phase, musicEnabled]);

  useEffect(() => {
    const player = musicPlayerRef.current;
    return () => {
      if (bannerTimeoutRef.current) window.clearTimeout(bannerTimeoutRef.current);
      player?.stop();
    };
  }, []);

  // Sync game state to body.dataset.state while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.dataset.state;
    document.body.dataset.state =
      phase === 'ready' ? 'title' : phase === 'paused' ? 'paused' : phase === 'gameover' ? 'gameover' : 'playing';
    return () => {
      if (prev) document.body.dataset.state = prev;
    };
  }, [open, phase]);

  // Keyboard controls (arrows / A-D / Enter-Space start / P pause / R restart)
  useEffect(() => {
    if (!open) return;
    setPhase('ready');
    setScore(0);
    setCurrentLevel(1);
    setPawsBonusRun(0);
    setPerfectCombo(0);
    setMaxComboRun(0);
    setShowLeaderboard(false);
    setScenarioLabel('Terra & Troposfera');
    setMusicThemeTitle(getScenarioMusicSpec('earth').themeTitle);
    setSectorBanner(null);
    simRef.current.platforms = createInitialPlatforms();
    simRef.current.enemies = [];
    simRef.current.altitude = 0;
    simRef.current.catX = 0.5;
    simRef.current.catY = 0.72;
    simRef.current.knockbackVx = 0;
    simRef.current.pushInvuln = 0;
    simRef.current.lastSectorIndex = 0;
    simRef.current.perfectCombo = 0;
    simRef.current.runMaxCombo = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (phaseRef.current === 'ready' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        startGame();
        return;
      }
      if (k === 'p' || e.key === 'Escape') {
        if (phaseRef.current === 'playing') {
          setPhase('paused');
          return;
        }
        if (phaseRef.current === 'paused') {
          setPhase('playing');
          return;
        }
      }
      if (k === 'r' && (phaseRef.current === 'playing' || phaseRef.current === 'paused' || phaseRef.current === 'gameover')) {
        startGame();
        return;
      }
      simRef.current.keys.add(k);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      simRef.current.keys.delete(e.key.toLowerCase());
    };
    const onBlur = () => simRef.current.keys.clear();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [open, startGame]);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = Math.round(rect.width);
        canvas.height = Math.round(rect.height);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [open, vp.orientation]);

  // 60 FPS Simulation & Cosmic Journey Renderer
  useEffect(() => {
    if (!open) return;
    let rafId = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const tSec = now * 0.001;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (canvas && ctx) {
        const w = canvas.width;
        const h = canvas.height;
        const s = simRef.current;

        for (const c of s.clouds) {
          c.x += c.speed * dt;
          if (c.x > 1.2) c.x = -0.2;
        }

        if (phaseRef.current === 'ready') {
          s.catY = 0.72 + Math.sin(tSec * 3.2) * 0.04;
        }

        if (s.hitFlashAlpha > 0) {
          s.hitFlashAlpha = Math.max(0, s.hitFlashAlpha - dt * 1.9);
        }
        s.trauma = Math.max(0, s.trauma - dt * 2.2);

        if (phaseRef.current === 'playing' && s.hitstop > 0) {
          s.hitstop = Math.max(0, s.hitstop - dt);
        } else if (phaseRef.current === 'playing') {
          const prevX = s.catX;
          const keyDir =
            (s.keys.has('arrowright') || s.keys.has('d') ? 1 : 0) -
            (s.keys.has('arrowleft') || s.keys.has('a') ? 1 : 0);

          if (keyDir !== 0) {
            s.targetX = null;
            s.catX += keyDir * 1.02 * dt;
          } else if (s.targetX !== null) {
            s.catX += (s.targetX - s.catX) * Math.min(1, dt * 15);
          }

          // Apply knockback shove from enemy hits & damp smoothly
          if (Math.abs(s.knockbackVx) > 0.01) {
            s.catX += s.knockbackVx * dt;
            s.knockbackVx *= Math.exp(-5.8 * dt);
          } else {
            s.knockbackVx = 0;
          }
          if (s.pushInvuln > 0) {
            s.pushInvuln = Math.max(0, s.pushInvuln - dt);
          }

          s.vx = (s.catX - prevX) / Math.max(dt, 0.001);
          if (Math.abs(s.vx) > 0.08) {
            s.facing = s.vx > 0 ? 1 : -1;
          }

          if (s.catX < -0.04) s.catX = 1.04;
          if (s.catX > 1.04) s.catX = -0.04;

          s.vy += SKYHOP_GRAVITY * dt;
          s.catY += s.vy * dt;

          s.squashX += (1 - s.squashX) * Math.min(1, dt * 12);
          s.squashY += (1 - s.squashY) * Math.min(1, dt * 12);

          if (s.vy < -0.75 && Math.random() < 0.65) {
            spawnPooledParticle(s.particlePool, {
              x: s.catX + (Math.random() - 0.5) * 0.03,
              y: s.catY + 0.045,
              vx: (Math.random() - 0.5) * 0.08,
              vy: 0.22 + Math.random() * 0.14,
              color: s.altitude >= 2000 ? '#38bdf8' : '#fbbf24',
              size: Math.max(2.5, w * 0.009),
              decay: 2.6,
              shape: 'circle',
            });
          }

          // Platform updates (moving oscillation + fragile reappearance after cooldown)
          const platUpdates = updatePlatforms(s.platforms, dt);
          for (const rp of platUpdates.reformedPositions) {
            for (let i = 0; i < 8; i++) {
              spawnPooledParticle(s.particlePool, {
                x: rp.x + (Math.random() - 0.5) * 0.08,
                y: rp.y,
                vx: (Math.random() - 0.5) * 0.25,
                vy: -0.12 + (Math.random() - 0.5) * 0.12,
                color: '#a5f3fc',
                size: Math.max(2.5, w * 0.008),
                decay: 2.8,
                shape: 'star',
              });
            }
          }

          for (const p of s.platforms) {
            const res = resolvePlatformBounce(s.catX, s.catY, s.vy, p, s.platforms);
            if (res.bounced) {
              const accuracy = evaluateBounceAccuracy(s.catX, p);
              if (accuracy === 'perfect') {
                s.perfectCombo += 1;
                if (s.perfectCombo > s.runMaxCombo) {
                  s.runMaxCombo = s.perfectCombo;
                  setMaxComboRun(s.runMaxCombo);
                }
                setPerfectCombo(s.perfectCombo);
                for (let k = 0; k < 5; k++) {
                  spawnPooledParticle(s.particlePool, {
                    x: s.catX + (Math.random() - 0.5) * 0.04,
                    y: p.y - 0.01,
                    vx: (Math.random() - 0.5) * 0.35,
                    vy: -0.22 - Math.random() * 0.16,
                    color: '#fde047',
                    size: Math.max(3, w * 0.01),
                    decay: 2.3,
                    shape: 'star',
                  });
                }
              } else if (s.perfectCombo !== 0) {
                s.perfectCombo = 0;
                setPerfectCombo(0);
              }

              if (res.teleportTo || s.perfectCombo === 5 || s.perfectCombo === 12) {
                callbacksRef.current.onAchievementEvent?.(callbacksRef.current.myRole, {
                  type: 'skyhop_progress',
                  altitude: Math.floor(s.altitude),
                  perfectCombo: s.runMaxCombo,
                  portalsDelta: res.teleportTo ? 1 : 0,
                });
              }

              s.vy = res.newVy;
              const bounceKind = res.kind ?? 'normal';
              if (res.teleportTo) {
                const prevCatX = s.catX;
                const prevCatY = s.catY;
                s.catX = res.teleportTo.x;
                s.catY = res.teleportTo.y;
                s.targetX = null;
                s.squashX = 0.74;
                s.squashY = 1.32;
                s.trauma = Math.min(1, s.trauma + 0.32);
                sfx.portal();
                emitPortalWarpBurst(
                  s.particlePool,
                  prevCatX,
                  prevCatY,
                  res.teleportTo.x,
                  res.teleportTo.y,
                  w
                );
                if (s.catY >= 0.5) {
                  maintainPlatformLadder(s.platforms, Math.floor(s.altitude));
                }
              } else if (bounceKind === 'spring' || bounceKind === 'fragile_spring') {
                s.squashX = 0.78;
                s.squashY = 1.28;
                s.trauma = Math.min(1, s.trauma + 0.38);
                sfx.goal();
              } else if (
                bounceKind === 'fragile' ||
                bounceKind === 'fast_fragile' ||
                bounceKind === 'fragile_vertical'
              ) {
                s.squashX = 1.22;
                s.squashY = 0.8;
                s.trauma = Math.min(1, s.trauma + 0.18);
                sfx.bounce();
              } else {
                s.squashX = 1.24;
                s.squashY = 0.78;
                sfx.bounce();
              }
              emitJumpBurst(s.particlePool, s.catX, res.teleportTo ? res.teleportTo.y : p.y, bounceKind, w);
              break;
            }
          }

          // Enemy spawn & AI updates (increasing difficulty as altitude climbs)
          const diff = getDifficultyParams(s.altitude);
          if (diff.maxEnemies > 0 && s.enemies.length < diff.maxEnemies) {
            const topEnemyY = s.enemies.reduce((min, e) => Math.min(min, e.y), 1);
            if (topEnemyY > 0.24) {
              const kind =
                diff.unlockedKinds[Math.floor(Math.random() * diff.unlockedKinds.length)];
              s.enemies.push(createEnemy(kind, s.altitude, -0.08 - Math.random() * 0.08));
            }
          }

          updateEnemies(s.enemies, s.catX, s.catY, s.altitude, dt);

          // Check enemy push collision
          if (s.pushInvuln <= 0) {
            for (const enemy of s.enemies) {
              const push = resolveEnemyPush(s.catX, s.catY, enemy, s.altitude);
              if (push.pushed) {
                s.knockbackVx = push.pushVx;
                s.vy = Math.max(s.vy, push.pushVy);
                s.targetX = null;
                s.pushInvuln = 0.45;
                s.hitstop = 0.045;
                s.hitFlashAlpha = 0.36;
                s.trauma = Math.min(1, s.trauma + 0.55);
                s.squashX = 1.32;
                s.squashY = 0.72;
                sfx.hit();
                emitEnemyCollisionBurst(
                  s.particlePool,
                  s.catX,
                  s.catY,
                  push.pushVx,
                  push.enemyKind,
                  w
                );
                break;
              }
            }
          }

          // Camera vertical climb & platform/enemy recycling
          if (s.catY < 0.5) {
            const delta = 0.5 - s.catY;
            s.catY = 0.5;
            s.altitude += delta * ALTITUDE_SCROLL_SCALE;
            const newScore = Math.floor(s.altitude);
            // Update live HUD numerals and progress bar directly at 60Hz without React re-renders
            if (scoreSpanRef.current) {
              scoreSpanRef.current.textContent = `${newScore.toLocaleString('pt-BR')} m`;
            }
            const nextMs = (Math.floor(newScore / SCENARIO_STEP_ALTITUDE) + 1) * SCENARIO_STEP_ALTITUDE;
            if (nextMilestoneSpanRef.current) {
              nextMilestoneSpanRef.current.textContent = `→ ${nextMs.toLocaleString('pt-BR')} m`;
            }
            if (milestoneBarRef.current) {
              const pct = Math.min(100, Math.round(((newScore % SCENARIO_STEP_ALTITUDE) / SCENARIO_STEP_ALTITUDE) * 100));
              milestoneBarRef.current.style.width = `${pct}%`;
            }
            if (now - lastHudSyncRef.current > 250) {
              lastHudSyncRef.current = now;
              setScore(newScore);
            }

            const curScenario = getSkyScenario(s.altitude);
            if (curScenario.sectorIndex !== s.lastSectorIndex) {
              const levelsGained = Math.max(1, curScenario.sectorIndex - s.lastSectorIndex);
              const pawsBonus = computeSkyHopLevelPawsReward(levelsGained);
              s.lastSectorIndex = curScenario.sectorIndex;
              setCurrentLevel(curScenario.sectorIndex + 1);
              setPawsBonusRun((prev) => prev + pawsBonus);
              callbacksRef.current.onAwardPaws(callbacksRef.current.myRole, pawsBonus);
              callbacksRef.current.onAchievementEvent?.(callbacksRef.current.myRole, {
                type: 'skyhop_progress',
                altitude: Math.floor(s.altitude),
                pawsEarnedDelta: pawsBonus,
                perfectCombo: s.runMaxCombo,
              });

              setScenarioLabel(curScenario.label);
              setMusicThemeTitle(getScenarioMusicSpec(curScenario.id).themeTitle);
              musicPlayerRef.current?.setScenario(curScenario.id);

              setSectorBanner({
                title: `Nível ${curScenario.sectorIndex + 1} · ${curScenario.label} (+${pawsBonus} 🐾)`,
                subtitle: curScenario.subtitle,
              });
              sfx.win();
              if (bannerTimeoutRef.current) window.clearTimeout(bannerTimeoutRef.current);
              bannerTimeoutRef.current = window.setTimeout(() => setSectorBanner(null), 2800);
            }

            for (const st of s.stars) {
              st.y += delta * st.depth * 0.85;
              if (st.y > 1.02) {
                st.y = -0.02;
                st.x = Math.random();
              }
            }
            for (const c of s.clouds) {
              c.y += delta * c.depth * 0.75;
              if (c.y > 1.15) {
                c.y = -0.12;
                c.x = Math.random();
              }
            }

            scrollPlatforms(s.platforms, delta);
            maintainPlatformLadder(s.platforms, newScore);

            // Scroll enemies down and despawn when off-bottom
            for (let i = s.enemies.length - 1; i >= 0; i--) {
              s.enemies[i].y += delta;
              if (s.enemies[i].y > 1.12) {
                s.enemies.splice(i, 1);
              }
            }
          }

          // Fall check
          if (s.catY > 1.09) {
            const finalAlt = Math.floor(s.altitude);
            const reward = computeSkyHopReward(finalAlt);
            const { myRole: roleNow, myNick: nickNow, onAwardPaws: awardPaws, onRecordScore: recordScore } =
              callbacksRef.current;
            sfx.hit();
            setScore(finalAlt);
            setPhase('gameover');
            setBestScore((prev) => {
              const next = Math.max(prev, finalAlt);
              localStorage.setItem('skyhop_best', String(next));
              return next;
            });
            if (finalAlt > 0) {
              const entry: SkyHopLeaderboardEntry = {
                id: `${roleNow}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                role: roleNow,
                nickname: nickNow || (roleNow === 'cat1' ? 'Camarada 1' : 'Camarada 2'),
                altitude: finalAlt,
                level: s.lastSectorIndex + 1,
                scenarioLabel: getSkyScenario(finalAlt).label,
                timestamp: Date.now(),
              };
              setLocalLeaderboard((prev) => {
                const next = recordSkyHopLeaderboard(prev, entry, 10);
                try {
                  localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(next));
                } catch {
                  // ignore storage quota errors
                }
                return next;
              });
              recordScore(entry);
            }
            awardPaws(roleNow, reward);
            callbacksRef.current.onAchievementEvent?.(roleNow, {
              type: 'skyhop_run_end',
              altitude: finalAlt,
              maxCombo: s.runMaxCombo,
            });
          }
        }

        stepParticles(s.particlePool, dt);

        if (s.altitude > 1100 && !s.shootingStar.active && Math.random() < 0.009) {
          s.shootingStar = {
            active: true,
            x: 0.1 + Math.random() * 0.8,
            y: 0.05 + Math.random() * 0.35,
            vx: (Math.random() > 0.5 ? 1 : -1) * (0.65 + Math.random() * 0.4),
            vy: 0.25 + Math.random() * 0.2,
            life: 1,
          };
        }
        if (s.shootingStar.active) {
          s.shootingStar.x += s.shootingStar.vx * dt;
          s.shootingStar.y += s.shootingStar.vy * dt;
          s.shootingStar.life -= dt * 1.8;
          if (s.shootingStar.life <= 0) s.shootingStar.active = false;
        }

        renderSkyHopFrame(ctx, {
          w,
          h,
          tSec,
          altitude: s.altitude,
          catX: s.catX,
          catY: s.catY,
          vx: s.vx,
          facing: s.facing,
          squashX: s.squashX,
          squashY: s.squashY,
          trauma: s.trauma,
          pushInvuln: s.pushInvuln,
          hitFlashAlpha: s.hitFlashAlpha,
          platforms: s.platforms,
          enemies: s.enemies,
          particles: s.particlePool.items,
          stars: s.stars,
          clouds: s.clouds,
          shootingStar: s.shootingStar,
          catSprite: catSpriteRef.current,
        });
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [open]);

  if (!open) return null;

  const handlePointerSteer = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = Math.max(0.05, Math.min(0.95, (clientX - rect.left) / rect.width));
    simRef.current.targetX = nx;
  };

  const isLandscape = vp.orientation === 'landscape';
  const nextMilestone = (Math.floor(score / SCENARIO_STEP_ALTITUDE) + 1) * SCENARIO_STEP_ALTITUDE;
  const milestonePct = Math.min(
    100,
    Math.round(((score % SCENARIO_STEP_ALTITUDE) / SCENARIO_STEP_ALTITUDE) * 100)
  );

  return (
    <div
      className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Pula-Pula Sputnik"
    >
      {/* Hidden live CatSvg snapshot source for Canvas sprite */}
      <div ref={svgHolderRef} className="hidden" aria-hidden="true">
        <CatSvg cat={{ ...myCat, expression: 'happy' }} />
      </div>

      <div
        className={`bg-[#fff8ed] w-full rounded-3xl sketch-border shadow-2xl flex flex-col max-h-[95dvh] ${
          vp.isCompactLandscape ? 'max-w-xl p-2.5 gap-1.5' : 'max-w-lg p-3.5 sm:p-4 gap-2.5'
        }`}
      >
        {/* Top Game Shell Bar */}
        <div className="flex justify-between items-center gap-2 border-b border-[#2b1111]/15 pb-1.5">
          <div className="min-w-0">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-red-950 leading-none truncate">
              Pula-Pula Sputnik
            </h2>
            <p className="text-[11px] text-[#2b1111]/75 mt-0.5 truncate">
              +{PAWS_PER_LEVEL} 🐾 por nível · Portais · Música: {musicThemeTitle}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                if (phase === 'playing') setPhase('paused');
                setShowLeaderboard((v) => !v);
              }}
              aria-label={showLeaderboard ? 'Fechar placar de líderes' : 'Placar de líderes'}
              title="Placar de líderes"
              className={`sketch-btn p-2 rounded-xl cursor-pointer ${
                showLeaderboard ? 'bg-amber-300 text-red-950' : 'bg-amber-100 text-red-950'
              }`}
            >
              <Trophy className="w-4 h-4" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                setMusicEnabled((v) => !v);
              }}
              aria-label={musicEnabled ? 'Silenciar música do cenário' : 'Ativar música do cenário'}
              title={musicEnabled ? `Música: ${musicThemeTitle}` : 'Música desligada'}
              className={`sketch-btn p-2 rounded-xl cursor-pointer ${
                musicEnabled ? 'bg-sky-100 text-sky-950' : 'bg-stone-100 text-stone-500'
              }`}
            >
              <Music className="w-4 h-4" />
            </button>
            {(phase === 'playing' || phase === 'paused') && (
              <>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setShowLeaderboard(false);
                    setPhase((p) => (p === 'playing' ? 'paused' : 'playing'));
                  }}
                  aria-label={phase === 'playing' ? 'Pausar [P]' : 'Continuar [P]'}
                  className="sketch-btn bg-amber-200 p-2 rounded-xl cursor-pointer"
                >
                  {phase === 'playing' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    startGame();
                  }}
                  aria-label="Reiniciar [R]"
                  className="sketch-btn bg-white p-2 rounded-xl cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              type="button"
              tabIndex={-1}
              onClick={onClose}
              aria-label="Fechar Pula-Pula"
              className="sketch-btn bg-white p-2 rounded-xl cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Full-bleed Game Canvas Container with World-Matched Corner HUD */}
        <div
          ref={containerRef}
          className={`relative border-2 border-[#2b1111] rounded-2xl overflow-hidden mx-auto w-full ${
            vp.isCompactLandscape
              ? 'h-[68dvh] max-h-[300px]'
              : isLandscape
              ? 'h-[72dvh] max-h-[580px]'
              : 'h-[66dvh] max-h-[560px]'
          }`}
        >
          <canvas
            ref={canvasRef}
            data-testid="skyhop-canvas"
            onPointerDown={(e) => {
              simRef.current.dragging = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              handlePointerSteer(e.clientX);
            }}
            onPointerMove={(e) => {
              if (simRef.current.dragging || e.buttons > 0) {
                handlePointerSteer(e.clientX);
              }
            }}
            onPointerUp={() => {
              simRef.current.dragging = false;
            }}
            onPointerCancel={() => {
              simRef.current.dragging = false;
            }}
            className="w-full h-full block touch-none cursor-ew-resize"
          />

          {/* World-matched Corner HUD (zero backdrop-blur over Canvas2D) */}
          <div className="pointer-events-none absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2">
            <div
              className="rounded-xl border-2 border-[#2b1111] px-2.5 py-1 shadow-md max-w-[66%]"
              style={{ backgroundColor: 'rgba(255, 248, 237, 0.9)' }}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-red-900/80 leading-none truncate">
                Nível {currentLevel} · {scenarioLabel}
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span
                  ref={scoreSpanRef}
                  className="text-lg sm:text-xl font-black font-mono-num text-red-950 leading-none"
                >
                  {score.toLocaleString('pt-BR')} m
                </span>
                <span
                  ref={nextMilestoneSpanRef}
                  className="text-[10px] font-bold font-mono-num text-[#2b1111]/60 leading-none"
                >
                  → {nextMilestone.toLocaleString('pt-BR')} m
                </span>
              </div>
              <div className="mt-1 h-1 w-full rounded-full bg-[#2b1111]/15 overflow-hidden">
                <div
                  ref={milestoneBarRef}
                  className="h-full bg-red-600 transition-all duration-150"
                  style={{ width: `${milestonePct}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              <div
                className="rounded-xl border-2 border-[#2b1111] px-2.5 py-1 text-right shadow-md"
                style={{ backgroundColor: 'rgba(255, 248, 237, 0.9)' }}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-red-900/75 leading-none">
                  Recorde
                </div>
                <div className="text-sm sm:text-base font-extrabold font-mono-num text-amber-800 leading-tight">
                  {bestScore.toLocaleString('pt-BR')} m
                </div>
              </div>
              {phase === 'playing' && perfectCombo >= 2 && (
                <div
                  className="rounded-lg border-2 border-[#2b1111] px-2 py-0.5 text-[11px] font-black font-mono-num text-red-950 shadow-sm"
                  style={{ backgroundColor: 'rgba(253, 224, 71, 0.95)' }}
                >
                  Combo {perfectCombo}x ✨
                </div>
              )}
            </div>
          </div>

          {/* Non-blocking Cosmic Sector Transition Banner */}
          {sectorBanner && phase === 'playing' && !showLeaderboard && (
            <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 w-max max-w-[88%]">
              <div
                className="rounded-xl border-2 border-[#2b1111] px-3 py-1.5 text-center shadow-lg"
                style={{ backgroundColor: 'rgba(255, 248, 237, 0.94)' }}
              >
                <div className="text-xs font-black text-red-950 leading-tight">
                  {sectorBanner.title}
                </div>
                <div className="text-[10px] font-semibold text-[#2b1111]/75 leading-tight">
                  {sectorBanner.subtitle}
                </div>
              </div>
            </div>
          )}

          {/* Placar de Líderes Overlay */}
          {showLeaderboard && (
            <div
              className="absolute inset-0 flex items-center justify-center p-3 sm:p-4"
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.64)' }}
            >
              <div className="bg-[#fff8ed] border-2 border-[#2b1111] rounded-2xl p-3.5 sm:p-4 w-full max-w-[340px] max-h-full flex flex-col gap-2.5 shadow-2xl">
                <div className="flex items-center justify-between gap-2 border-b border-[#2b1111]/15 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Trophy className="w-5 h-5 text-amber-600 shrink-0" />
                    <div className="min-w-0">
                      <h3 className="font-display text-xl font-bold text-red-950 leading-none truncate">
                        Placar de Líderes
                      </h3>
                      <p className="text-[10px] font-semibold text-[#2b1111]/65 mt-0.5">
                        Top 10 altitudes da sala
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLeaderboard(false)}
                    className="sketch-btn bg-white px-2.5 py-1 rounded-lg text-xs font-bold text-red-950 cursor-pointer shrink-0"
                  >
                    Voltar
                  </button>
                </div>

                {mergedLeaderboard.length === 0 ? (
                  <div className="py-6 text-center space-y-1.5">
                    <p className="text-sm font-bold text-red-950">
                      Nenhum voo registrado ainda
                    </p>
                    <p className="text-xs text-[#2b1111]/70">
                      Faça seu lançamento para inaugurar o placar de altitudes!
                    </p>
                  </div>
                ) : (
                  <ol className="space-y-1.5 overflow-y-auto custom-scroll pr-1">
                    {mergedLeaderboard.map((entry, idx) => {
                      const medal =
                        idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                      const isMe = entry.role === myRole;
                      return (
                        <li
                          key={entry.id}
                          className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 ${
                            isMe
                              ? 'bg-amber-100/90 border-amber-500'
                              : 'bg-white/85 border-[#2b1111]/15'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-black font-mono-num w-6 text-center shrink-0 text-red-950">
                              {medal}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-red-950 truncate">
                                {entry.nickname}
                              </div>
                              <div className="text-[10px] font-medium text-[#2b1111]/65 truncate">
                                Nível {entry.level} · {entry.scenarioLabel}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs sm:text-sm font-black font-mono-num text-red-900 shrink-0">
                            {entry.altitude.toLocaleString('pt-BR')} m
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </div>
          )}

          {/* Ready / Pause / Game Over Modal Overlay */}
          {phase !== 'playing' && !showLeaderboard && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center"
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.56)' }}
            >
              <div className="bg-[#fff8ed] border-2 border-[#2b1111] rounded-2xl p-4 sm:p-5 space-y-2.5 max-w-[310px] w-full shadow-2xl">
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-red-950 leading-none">
                  {phase === 'gameover'
                    ? 'Pouso Cosmonauta!'
                    : phase === 'paused'
                    ? 'Missão Pausada'
                    : 'Decolagem Sputnik'}
                </h3>

                {phase === 'gameover' ? (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-3 gap-1.5 text-center bg-amber-50 border border-[#2b1111]/25 rounded-xl p-2 font-mono-num">
                      <div>
                        <span className="text-[9px] uppercase font-sans font-bold text-[#2b1111]/70 block">
                          Altitude
                        </span>
                        <span className="text-base font-black text-red-900">
                          {score.toLocaleString('pt-BR')} m
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-sans font-bold text-[#2b1111]/70 block">
                          Altura
                        </span>
                        <span className="text-base font-black text-amber-800">
                          +{computeSkyHopReward(score)} 🐾
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-sans font-bold text-[#2b1111]/70 block">
                          Níveis
                        </span>
                        <span className="text-base font-black text-emerald-800">
                          +{pawsBonusRun} 🐾
                        </span>
                      </div>
                    </div>
                    {maxComboRun >= 2 && (
                      <div className="text-[11px] font-bold font-mono-num text-amber-900 bg-yellow-100 border border-amber-400 rounded-lg py-1 px-2">
                        ✨ Melhor Combo Perfeito do Voo: {maxComboRun}x
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[#2b1111]/80 font-medium leading-snug">
                    {phase === 'paused'
                      ? 'Respire fundo e retome a viagem pelos planetas e galáxias.'
                      : `Suba níveis a cada 2.000 m para ganhar +${PAWS_PER_LEVEL} 🐾 por nível, use portais cósmicos e curta música própria de cada cenário!`}
                  </p>
                )}

                {mergedLeaderboard.length > 0 && (
                  <div className="bg-amber-50/90 border border-[#2b1111]/20 rounded-xl p-2 text-left space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-red-900/80">
                      <span>🏆 Top 3 da Sala</span>
                      <button
                        type="button"
                        onClick={() => setShowLeaderboard(true)}
                        className="underline hover:text-red-950 cursor-pointer"
                      >
                        Ver todos
                      </button>
                    </div>
                    {mergedLeaderboard.slice(0, 3).map((entry, idx) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between text-[11px] font-semibold text-red-950"
                      >
                        <span className="truncate pr-2">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} {entry.nickname}
                        </span>
                        <span className="font-mono-num font-black shrink-0">
                          {entry.altitude.toLocaleString('pt-BR')} m
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    data-start="true"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      if (phase === 'paused') setPhase('playing');
                      else startGame();
                    }}
                    className="sketch-btn flex-1 bg-red-700 hover:bg-red-800 text-amber-100 font-bold text-sm py-2.5 rounded-xl cursor-pointer"
                  >
                    {phase === 'paused'
                      ? 'Continuar Voo'
                      : phase === 'gameover'
                      ? 'Lançar Novamente'
                      : 'Iniciar Lançamento'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLeaderboard(true)}
                    aria-label="Abrir placar de líderes"
                    className="sketch-btn bg-amber-200 hover:bg-amber-300 text-red-950 font-bold text-xs px-3 py-2.5 rounded-xl cursor-pointer flex items-center gap-1"
                  >
                    <Trophy className="w-4 h-4" />
                    <span>Placar</span>
                  </button>
                </div>

                <p className="text-[10px] font-semibold text-[#2b1111]/65">
                  ← → ou A/D Mover · Arraste · P Pausar
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
