import React, { useEffect, useRef, useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { AirHockeyOnlineState, MinigamePlayMode, PlayerRole, SharedState } from '../../types/game';
import { ViewportOrientation } from '../../hooks/useOrientation';
import { sfx } from '../../utils/sound';

import { AchievementEvent } from '../../logic/achievements';
import { MatchScoreOutcome } from '../../logic/scores';

interface AirHockeyModalProps {
  open: boolean;
  initialMode: MinigamePlayMode;
  myRole: PlayerRole;
  state: SharedState;
  airHockeyFrame: AirHockeyOnlineState | null;
  vp: ViewportOrientation;
  onClose: () => void;
  onSendSocket: (payload: Record<string, unknown>) => boolean;
  onAwardPaws: (role: PlayerRole, amount: number) => void;
  onRecordOutcome?: (outcome: MatchScoreOutcome) => void;
  onAchievementEvent?: (role: PlayerRole, event: AchievementEvent) => void;
}

export const AirHockeyModal: React.FC<AirHockeyModalProps> = ({
  open,
  initialMode,
  myRole,
  state,
  airHockeyFrame,
  vp,
  onClose,
  onSendSocket,
  onAwardPaws,
  onRecordOutcome,
  onAchievementEvent,
}) => {
  const achievementCbRef = useRef(onAchievementEvent);
  achievementCbRef.current = onAchievementEvent;
  const recordOutcomeCbRef = useRef(onRecordOutcome);
  recordOutcomeCbRef.current = onRecordOutcome;
  const [mode, setMode] = useState<MinigamePlayMode>(initialMode);
  const [phase, setPhase] = useState<'ready' | 'playing' | 'gameover'>('ready');
  const [scores, setScores] = useState({ s1: 0, s2: 0 });
  const [winnerText, setWinnerText] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const simRef = useRef({
    puck: { x: 0.5, y: 0.5, vx: 0, vy: 0 },
    p1: { x: 0.5, y: 0.84, px: 0.5, py: 0.84, tx: 0.5, ty: 0.84 },
    p2: { x: 0.5, y: 0.16, px: 0.5, py: 0.16, tx: 0.5, ty: 0.16 },
    score1: 0,
    score2: 0,
    goalPause: 0,
    keys: new Set<string>(),
    pointers: new Map<number, 'p1' | 'p2'>(),
  });

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const onlineRef = useRef<AirHockeyOnlineState | null>(airHockeyFrame);
  onlineRef.current = airHockeyFrame;

  useEffect(() => {
    setMode(initialMode);
    setPhase('ready');
    setScores({ s1: 0, s2: 0 });
    setWinnerText('');
  }, [initialMode, open]);

  useEffect(() => {
    if (!open || mode !== 'online') return;
    onSendSocket({ type: 'room:join', game: 'airhockey' });
    return () => {
      onSendSocket({ type: 'room:leave', game: 'airhockey' });
    };
  }, [open, mode, onSendSocket]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      simRef.current.keys.add(e.key.toLowerCase());
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
  }, [open]);

  // ResizeObserver for crisp HiDPI canvas sizing
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = Math.round(rect.width);
        canvas.height = Math.round(rect.height);
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [open, vp.orientation]);

  // Main simulation & rendering loop
  useEffect(() => {
    if (!open) return;
    let rafId = 0;
    let lastTime = performance.now();

    const PADDLE_R_NORM = 0.075;
    const PUCK_R_NORM = 0.04;
    const GOAL_HALF_W = 0.18;

    const resetRound = () => {
      const s = simRef.current;
      s.puck = { x: 0.5, y: 0.5, vx: 0, vy: 0 };
      s.p1 = { x: 0.5, y: 0.84, px: 0.5, py: 0.84, tx: 0.5, ty: 0.84 };
      s.p2 = { x: 0.5, y: 0.16, px: 0.5, py: 0.16, tx: 0.5, ty: 0.16 };
    };

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (canvas && ctx) {
        const w = canvas.width;
        const h = canvas.height;
        const curMode = modeRef.current;
        const s = simRef.current;

        if (curMode !== 'online' && phaseRef.current === 'playing') {
          // Keyboard controls
          const speed = 0.9 * dt;
          if (s.keys.has('arrowleft')) s.p1.tx = Math.max(0.08, s.p1.tx - speed);
          if (s.keys.has('arrowright')) s.p1.tx = Math.min(0.92, s.p1.tx + speed);
          if (s.keys.has('arrowup')) s.p1.ty = Math.max(0.55, s.p1.ty - speed);
          if (s.keys.has('arrowdown')) s.p1.ty = Math.min(0.93, s.p1.ty + speed);

          if (curMode === 'local') {
            if (s.keys.has('a')) s.p2.tx = Math.max(0.08, s.p2.tx - speed);
            if (s.keys.has('d')) s.p2.tx = Math.min(0.92, s.p2.tx + speed);
            if (s.keys.has('w')) s.p2.ty = Math.max(0.07, s.p2.ty - speed);
            if (s.keys.has('s')) s.p2.ty = Math.min(0.45, s.p2.ty + speed);
          }

          s.p1.px = s.p1.x;
          s.p1.py = s.p1.y;
          s.p1.x += (s.p1.tx - s.p1.x) * Math.min(1, dt * 18);
          s.p1.y += (s.p1.ty - s.p1.y) * Math.min(1, dt * 18);

          s.p2.px = s.p2.x;
          s.p2.py = s.p2.y;
          if (curMode === 'bot') {
            let desiredX = 0.5;
            let desiredY = 0.16;
            if (s.puck.y < 0.52) {
              desiredX = Math.max(0.12, Math.min(0.88, s.puck.x + s.puck.vx * 0.14));
              desiredY = Math.max(0.09, Math.min(0.43, s.puck.y - 0.04));
            } else {
              desiredX = Math.max(0.28, Math.min(0.72, s.puck.x));
              desiredY = 0.15;
            }
            s.p2.x += (desiredX - s.p2.x) * Math.min(1, dt * 6.5);
            s.p2.y += (desiredY - s.p2.y) * Math.min(1, dt * 6.5);
          } else {
            s.p2.x += (s.p2.tx - s.p2.x) * Math.min(1, dt * 18);
            s.p2.y += (s.p2.ty - s.p2.y) * Math.min(1, dt * 18);
          }

          if (s.goalPause > 0) {
            s.goalPause -= dt;
            if (s.goalPause <= 0) resetRound();
          } else {
            // Puck movement
            const damping = Math.pow(0.55, dt);
            s.puck.vx *= damping;
            s.puck.vy *= damping;
            s.puck.x += s.puck.vx * dt;
            s.puck.y += s.puck.vy * dt;

            // Side wall bounce
            if (s.puck.x - PUCK_R_NORM < 0.02) {
              s.puck.x = 0.02 + PUCK_R_NORM;
              s.puck.vx = Math.abs(s.puck.vx) * 0.9;
              sfx.bounce();
            } else if (s.puck.x + PUCK_R_NORM > 0.98) {
              s.puck.x = 0.98 - PUCK_R_NORM;
              s.puck.vx = -Math.abs(s.puck.vx) * 0.9;
              sfx.bounce();
            }

            const inGoal = s.puck.x >= 0.5 - GOAL_HALF_W && s.puck.x <= 0.5 + GOAL_HALF_W;
            if (s.puck.y - PUCK_R_NORM <= 0.02) {
              if (inGoal) {
                s.score1 += 1;
                setScores({ s1: s.score1, s2: s.score2 });
                sfx.goal();
                achievementCbRef.current?.(myRole, { type: 'airhockey_goal' });
                if (s.score1 >= 5) {
                  phaseRef.current = 'gameover';
                  setPhase('gameover');
                  const winRole: PlayerRole = curMode === 'bot' ? myRole : 'cat1';
                  setWinnerText(`${state.nicknames[winRole]} venceu no gelo! (+10 🐾)`);
                  onAwardPaws(winRole, 10);
                  recordOutcomeCbRef.current?.(
                    curMode === 'bot'
                      ? { kind: 'solo_win', role: myRole }
                      : { kind: 'pvp_win', winner: 'cat1' }
                  );
                  achievementCbRef.current?.(winRole, {
                    type: 'airhockey_win',
                    conceded: s.score2,
                  });
                } else {
                  s.goalPause = 0.85;
                }
              } else {
                s.puck.y = 0.02 + PUCK_R_NORM;
                s.puck.vy = Math.abs(s.puck.vy) * 0.9;
                sfx.bounce();
              }
            } else if (s.puck.y + PUCK_R_NORM >= 0.98) {
              if (inGoal) {
                s.score2 += 1;
                setScores({ s1: s.score1, s2: s.score2 });
                sfx.goal();
                if (curMode === 'local') {
                  achievementCbRef.current?.('cat2', { type: 'airhockey_goal' });
                }
                if (s.score2 >= 5) {
                  phaseRef.current = 'gameover';
                  setPhase('gameover');
                  const oppLabel = curMode === 'bot' ? 'Autômato Estatal' : state.nicknames.cat2;
                  setWinnerText(`${oppLabel} venceu a partida!`);
                  if (curMode === 'local') {
                    onAwardPaws('cat2', 10);
                    recordOutcomeCbRef.current?.({ kind: 'pvp_win', winner: 'cat2' });
                    achievementCbRef.current?.('cat2', {
                      type: 'airhockey_win',
                      conceded: s.score1,
                    });
                  } else {
                    recordOutcomeCbRef.current?.({ kind: 'solo_loss', role: myRole });
                  }
                } else {
                  s.goalPause = 0.85;
                }
              } else {
                s.puck.y = 0.98 - PUCK_R_NORM;
                s.puck.vy = -Math.abs(s.puck.vy) * 0.9;
                sfx.bounce();
              }
            }

            // Paddle collisions (aspect-corrected distance)
            const aspect = h / Math.max(1, w);
            for (const pad of [s.p1, s.p2]) {
              const dx = s.puck.x - pad.x;
              const dy = (s.puck.y - pad.y) * aspect;
              const dist = Math.hypot(dx, dy);
              const minDist = PADDLE_R_NORM + PUCK_R_NORM;
              if (dist < minDist && dist > 0.0001) {
                const nx = dx / dist;
                const ny = dy / dist;
                s.puck.x = pad.x + nx * (minDist + 0.004);
                s.puck.y = pad.y + (ny * (minDist + 0.004)) / aspect;
                const pvx = (pad.x - pad.px) / Math.max(dt, 0.008);
                const pvy = (pad.y - pad.py) / Math.max(dt, 0.008);
                const hitSpeed = Math.min(1.65, Math.max(0.7, Math.hypot(pvx, pvy) * 0.7 + 0.65));
                s.puck.vx = nx * hitSpeed + pvx * 0.25;
                s.puck.vy = (ny * hitSpeed) / aspect + pvy * 0.25;
                // Clamp max speed
                const spd = Math.hypot(s.puck.vx, s.puck.vy);
                if (spd > 1.85) {
                  s.puck.vx = (s.puck.vx / spd) * 1.85;
                  s.puck.vy = (s.puck.vy / spd) * 1.85;
                }
                sfx.hit();
              }
            }
          }
        }

        // Draw frame
        const view = curMode === 'online' && onlineRef.current ? onlineRef.current : null;
        const puck = view ? view.puck : s.puck;
        const p1 = view ? view.p1 : s.p1;
        const p2 = view ? view.p2 : s.p2;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(0, 0, w, h);

        // Center line & circle
        ctx.strokeStyle = '#b91c1c';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([7, 6]);
        ctx.beginPath();
        ctx.moveTo(6, h / 2);
        ctx.lineTo(w - 6, h / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.14, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(185, 28, 28, 0.35)';
        ctx.stroke();

        // Outer border
        ctx.strokeStyle = '#2b1111';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, w - 4, h - 4);

        // Goals
        const gLeft = (0.5 - GOAL_HALF_W) * w;
        const gWidth = GOAL_HALF_W * 2 * w;
        ctx.fillStyle = '#2b1111';
        ctx.fillRect(gLeft, 0, gWidth, 7);
        ctx.fillRect(gLeft, h - 7, gWidth, 7);

        const padPxR = PADDLE_R_NORM * w;
        const puckPxR = PUCK_R_NORM * w;

        // Puck
        ctx.beginPath();
        ctx.arc(puck.x * w, puck.y * h, puckPxR, 0, Math.PI * 2);
        ctx.fillStyle = '#b91c1c';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#2b1111';
        ctx.stroke();

        // Top paddle (P2 / Bot)
        drawPaddle(ctx, p2.x * w, p2.y * h, padPxR, '#dc2626', '🚩');
        // Bottom paddle (P1)
        drawPaddle(ctx, p1.x * w, p1.y * h, padPxR, '#f59e0b', '⭐');
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [open, myRole, onAwardPaws, state.nicknames.cat1, state.nicknames.cat2]);

  if (!open) return null;

  const onlineRoom = airHockeyFrame || state.onlineRooms.airhockey;
  const bothOnline = onlineRoom.p1InRoom && onlineRoom.p2InRoom;
  const displayS1 = mode === 'online' ? onlineRoom.score1 : scores.s1;
  const displayS2 = mode === 'online' ? onlineRoom.score2 : scores.s2;

  const startLocalOrBot = () => {
    simRef.current.score1 = 0;
    simRef.current.score2 = 0;
    simRef.current.goalPause = 0;
    simRef.current.puck = { x: 0.5, y: 0.5, vx: 0.28, vy: 0.48 };
    simRef.current.p1 = { x: 0.5, y: 0.84, px: 0.5, py: 0.84, tx: 0.5, ty: 0.84 };
    simRef.current.p2 = { x: 0.5, y: 0.16, px: 0.5, py: 0.16, tx: 0.5, ty: 0.16 };
    setScores({ s1: 0, s2: 0 });
    setWinnerText('');
    setPhase('playing');
  };

  const handlePointer = (e: React.PointerEvent<HTMLCanvasElement>, isDown: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = Math.max(0.08, Math.min(0.92, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0.06, Math.min(0.94, (e.clientY - rect.top) / rect.height));

    if (mode === 'online') {
      if (!onlineRoom.running) return;
      onSendSocket({ type: 'airhockey:paddle', x: nx, y: ny });
      return;
    }

    if (phase !== 'playing') return;
    const s = simRef.current;

    if (isDown) {
      e.currentTarget.setPointerCapture(e.pointerId);
      const side: 'p1' | 'p2' = mode === 'local' && ny < 0.5 ? 'p2' : 'p1';
      s.pointers.set(e.pointerId, side);
    }

    const assigned = s.pointers.get(e.pointerId) || (mode === 'local' && ny < 0.5 ? 'p2' : 'p1');
    if (assigned === 'p1') {
      s.p1.tx = nx;
      s.p1.ty = Math.max(0.55, Math.min(0.93, ny));
    } else if (mode === 'local') {
      s.p2.tx = nx;
      s.p2.ty = Math.max(0.07, Math.min(0.45, ny));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    simRef.current.pointers.delete(e.pointerId);
  };

  const isLandscape = vp.orientation === 'landscape';

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true">
      <div
        className={`bg-[#f0f9ff] w-full rounded-3xl sketch-border shadow-2xl flex flex-col max-h-[95dvh] overflow-hidden ${
          isLandscape ? 'max-w-3xl p-3 sm:p-4 gap-2' : 'max-w-md p-3.5 sm:p-4 gap-2.5'
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[#2b1111]/15 pb-1.5">
          <div>
            <h2 className="font-display text-2xl font-bold text-red-950 leading-none">
              Air Hockey Siberiano 🏒
            </h2>
            <p className="text-[11px] text-[#2b1111]/70 mt-0.5">
              {mode === 'local'
                ? 'Toque duplo na tela ou WASD + Setas/Mouse'
                : mode === 'bot'
                ? 'Arraste ou use as setas para vencer o Autômato'
                : 'Duelo em tempo real entre dois aparelhos'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar Air Hockey" className="sketch-btn bg-white p-1.5 rounded-xl cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Layout adapts cleanly to Landscape vs Portrait */}
        <div className={`flex-1 min-h-0 flex ${isLandscape ? 'flex-row gap-3 items-stretch' : 'flex-col gap-2.5'}`}>
          {/* Controls / Score Column */}
          <div className={`flex flex-col gap-2 ${isLandscape ? 'w-56 shrink-0 justify-between' : 'w-full'}`}>
            <div className="grid grid-cols-3 gap-1 bg-sky-100 p-1 rounded-xl border border-[#2b1111]/25 text-[11px] font-bold">
              {(['bot', 'local', 'online'] as MinigamePlayMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setPhase('ready');
                  }}
                  className={`py-1 px-1.5 rounded-lg border cursor-pointer whitespace-nowrap ${
                    mode === m
                      ? 'bg-amber-300 border-[#2b1111] text-red-950'
                      : 'bg-white border-transparent text-[#2b1111]/75'
                  }`}
                >
                  {m === 'bot' ? '🤖 Bot' : m === 'local' ? '👥 Local' : '🌐 Online'}
                </button>
              ))}
            </div>

            <div className="bg-white border-2 border-[#2b1111] rounded-2xl p-2.5 flex items-center justify-around font-mono-num">
              <div className="text-center">
                <span className="text-[11px] font-sans font-bold text-amber-800 block">⭐ Você</span>
                <span className="text-2xl font-black text-red-950">{displayS1}</span>
              </div>
              <span className="text-xs font-bold text-[#2b1111]/40">ATÉ 5</span>
              <div className="text-center">
                <span className="text-[11px] font-sans font-bold text-red-800 block">
                  🚩 {mode === 'bot' ? 'Bot' : 'Rival'}
                </span>
                <span className="text-2xl font-black text-red-950">{displayS2}</span>
              </div>
            </div>

            {mode === 'online' && !bothOnline && (
              <div className="bg-red-100 border border-red-400 rounded-xl p-2 text-[11px] text-red-950 font-semibold">
                Aguardando o 2º jogador entrar no Air Hockey Online...
              </div>
            )}

            <button
              type="button"
              disabled={mode === 'online' && !bothOnline}
              onClick={() => {
                if (mode === 'online') onSendSocket({ type: 'airhockey:start' });
                else startLocalOrBot();
              }}
              className="sketch-btn bg-amber-300 hover:bg-amber-400 text-red-950 font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>
                {phase === 'playing' || (mode === 'online' && onlineRoom.running)
                  ? 'Reiniciar Partida'
                  : 'Iniciar Partida'}
              </span>
            </button>
          </div>

          {/* Rink Canvas */}
          <div
            ref={containerRef}
            className={`relative bg-sky-100 border-2 border-[#2b1111] rounded-2xl overflow-hidden mx-auto ${
              isLandscape
                ? 'h-[68dvh] max-h-[420px] aspect-[3/4]'
                : 'w-full max-w-[340px] h-[52dvh] max-h-[390px]'
            }`}
          >
            <canvas
              ref={canvasRef}
              onPointerDown={(e) => handlePointer(e, true)}
              onPointerMove={(e) => {
                if (e.buttons > 0 || e.pointerType === 'touch' || simRef.current.pointers.has(e.pointerId)) {
                  handlePointer(e, false);
                }
              }}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="w-full h-full block touch-none cursor-crosshair"
            />

            {((mode !== 'online' && phase !== 'playing') ||
              (mode === 'online' && !onlineRoom.running)) && (
              <div className="absolute inset-0 bg-[#2b1111]/55 flex flex-col items-center justify-center p-4 text-center text-white gap-2">
                {winnerText || (mode === 'online' && onlineRoom.winner) ? (
                  <>
                    <span className="text-3xl">🏆</span>
                    <p className="font-bold text-sm bg-[#fff8ed] text-red-950 px-3 py-1.5 rounded-xl border-2 border-[#2b1111]">
                      {winnerText ||
                        `${
                          onlineRoom.winner === 'cat1'
                            ? state.nicknames.cat1
                            : state.nicknames.cat2
                        } venceu!`}
                    </p>
                  </>
                ) : (
                  <p className="font-bold text-sm bg-[#fff8ed] text-red-950 px-3 py-1.5 rounded-xl border-2 border-[#2b1111]">
                    Toque em Iniciar para soltar o disco!
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function drawPaddle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  emoji: string
) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#2b1111';
  ctx.stroke();
  ctx.font = `${Math.max(12, Math.round(r * 0.75))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y + 1);
}
