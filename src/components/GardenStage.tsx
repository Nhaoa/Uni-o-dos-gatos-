import React, { useEffect, useRef } from 'react';
import { Moon, Sun } from 'lucide-react';
import { CatState, PlayerRole, SharedState } from '../types/game';
import { CatSvg } from './CatSvg';
import { ViewportOrientation } from '../hooks/useOrientation';

interface GardenStageProps {
  state: SharedState;
  myRole: PlayerRole;
  vp: ViewportOrientation;
  onPetCat: (target: PlayerRole) => void;
  onToggleSleep: (target: PlayerRole) => void;
  onOpenDiary: () => void;
  onOpenLetters: () => void;
}

interface HeartParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

export const GardenStage: React.FC<GardenStageProps> = ({
  state,
  myRole,
  vp,
  onPetCat,
  onToggleSleep,
  onOpenDiary,
  onOpenLetters,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<HeartParticle[]>([]);
  const rafIdRef = useRef<number | null>(null);

  const ensureParticleLoop = () => {
    if (rafIdRef.current !== null) return;
    const tick = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) {
        rafIdRef.current = null;
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const list = particlesRef.current;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        const topH = p.size * 0.3;
        ctx.beginPath();
        ctx.moveTo(0, topH);
        ctx.bezierCurveTo(0, 0, -p.size / 2, 0, -p.size / 2, topH);
        ctx.bezierCurveTo(-p.size / 2, (p.size + topH) / 2, 0, p.size, 0, p.size);
        ctx.bezierCurveTo(0, p.size, p.size / 2, (p.size + topH) / 2, p.size / 2, topH);
        ctx.bezierCurveTo(p.size / 2, 0, 0, 0, 0, topH);
        ctx.fill();
        ctx.restore();
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) list.splice(i, 1);
      }
      if (list.length > 0) {
        rafIdRef.current = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        rafIdRef.current = null;
      }
    };
    rafIdRef.current = requestAnimationFrame(tick);
  };

  const spawnHearts = (x: number, y: number, count = 10) => {
    const colors = ['#dc2626', '#fbbf24', '#e63946', '#f59e0b'];
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: x + (Math.random() * 34 - 17),
        y: y + (Math.random() * 20 - 10),
        vx: Math.random() * 2.2 - 1.1,
        vy: -(Math.random() * 2.6 + 1.3),
        size: Math.random() * 12 + 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.015 + 0.011,
      });
    }
    ensureParticleLoop();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const lastCat1Received = [...state.letters].reverse().find((l) => l.from === 'cat2');
  const lastCat2Received = [...state.letters].reverse().find((l) => l.from === 'cat1');

  const handleCatClick = (target: PlayerRole, e: React.MouseEvent) => {
    spawnHearts(e.clientX, e.clientY, 10);
    onPetCat(target);
  };

  const renderCatShowcase = (role: PlayerRole, cat: CatState, speechText: string) => {
    const isMe = role === myRole;
    const nick = state.nicknames[role] || (role === 'cat1' ? 'Camarada 1' : 'Camarada 2');
    const compact = vp.isCompactLandscape;
    const sleeping = Boolean(cat.isSleeping);
    const hungerPct = Math.max(0, Math.min(100, Math.round(cat.hunger)));
    const energyPct = Math.max(0, Math.min(100, Math.round(cat.energy)));
    const happinessPct = Math.max(0, Math.min(100, Math.round(cat.happiness)));

    return (
      <div
        className={`min-w-0 flex flex-col items-center justify-between relative rounded-3xl bg-[#fff8ed]/70 border-2 border-red-900/20 ${
          compact ? 'px-2 py-1.5' : 'px-2 py-3 sm:p-5'
        }`}
      >
        <div className="flex flex-col items-center w-full">
          <div
            className={`px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-full sketch-border text-[11px] sm:text-sm font-bold flex items-center gap-1 max-w-full ${
              compact ? '-mt-3.5 mb-1' : '-mt-5 sm:-mt-7 mb-2'
            } ${
              role === 'cat1' ? 'bg-amber-300 text-red-950' : 'bg-red-800 text-amber-100'
            }`}
          >
            <span aria-hidden="true">{role === 'cat1' ? '★' : '☭'}</span>
            <span className="truncate">{nick}</span>
            <span className="opacity-85 text-[10px] sm:text-[11px] shrink-0">
              ({isMe ? 'Você' : 'Amor'})
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenLetters}
            className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-2xl bg-[#fff8ed] sketch-border font-medium leading-snug text-center cursor-pointer hover:bg-amber-50 max-w-full flex items-center justify-center ${
              compact
                ? 'mb-1 text-[11px] max-w-[240px]'
                : 'mb-1.5 sm:mb-2.5 text-[11px] sm:text-sm sm:max-w-[300px] min-h-[2.6rem] sm:min-h-[3.25rem]'
            }`}
            title="Ir para Telegramas"
          >
            <span className={compact ? 'block truncate' : 'line-clamp-2 overflow-hidden'}>
              {speechText}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={(e) => handleCatClick(role, e)}
          aria-label={`Fazer carinho em ${nick}`}
          className={`cursor-pointer relative rounded-3xl flex items-center justify-center shrink-0 transition-transform active:scale-95 hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-red-700 ${
            compact
              ? 'w-26 h-26 md:w-28 md:h-28'
              : vp.orientation === 'portrait'
              ? 'w-36 h-36 sm:w-48 sm:h-48'
              : 'w-52 h-52 lg:w-60 lg:h-60'
          }`}
        >
          <CatSvg cat={cat} isFlipped={role === 'cat2'} showBed />
        </button>

        {/* Clean unboxed stat readout + sleep toggle */}
        <div
          className={`flex flex-col items-center gap-1.5 w-full ${
            compact ? 'mt-0.5' : 'mt-1.5'
          }`}
        >
          <div
            className={`font-mono-num text-[#2b1111]/80 font-semibold text-center flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 max-w-full leading-tight ${
              compact ? 'text-[10px]' : 'text-[10.5px] sm:text-xs'
            }`}
          >
            {compact ? (
              <>
                <span>{hungerPct}% 🐟</span>
                <span aria-hidden="true"> · </span>
                <span>{energyPct}% ⚡</span>
                <span aria-hidden="true"> · </span>
                <span>{happinessPct}% ☭</span>
              </>
            ) : (
              <>
                <span>Fome {hungerPct}%</span>
                <span aria-hidden="true"> · </span>
                <span>Vigor {energyPct}%</span>
                <span aria-hidden="true"> · </span>
                <span>Moral {happinessPct}%</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => onToggleSleep(role)}
            aria-label={
              sleeping ? `Acordar ${nick}` : `Colocar ${nick} para dormir na caminha`
            }
            className={`sketch-btn inline-flex items-center justify-center gap-1.5 rounded-xl font-bold whitespace-nowrap shrink-0 cursor-pointer ${
              compact ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-[11px] sm:text-xs'
            } ${
              sleeping
                ? 'bg-amber-300 hover:bg-amber-400 text-red-950'
                : 'bg-[#fff8ed] hover:bg-amber-100 text-red-950'
            }`}
          >
            {sleeping ? (
              <>
                <Sun className="w-3.5 h-3.5 shrink-0" />
                <span>Acordar da caminha</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 shrink-0" />
                <span>{compact ? 'Dormir' : 'Dormir na caminha'}</span>
              </>
            )}
          </button>
        </div>

        {state.activeGames?.[role] && (
          <div className="mt-1.5 inline-flex items-center gap-1.5 bg-emerald-100 border border-emerald-700/50 text-emerald-950 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold shadow-sm max-w-full">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
            <span className="truncate">
              Jogando: {state.activeGames[role]!.icon} {state.activeGames[role]!.label}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center justify-center relative">
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-20" />

      <section
        className={`w-full max-w-5xl bg-[#f3dfc1] rounded-3xl sketch-border relative overflow-hidden flex flex-col justify-between ${
          vp.isCompactLandscape ? 'px-2.5 py-1.5 gap-1.5' : 'p-3 sm:p-6 gap-3 sm:gap-4'
        }`}
        style={{ boxShadow: 'inset 0 0 40px rgba(185, 28, 28, 0.16), 4px 6px 0 #2b1111' }}
      >
        {/* Top Metrics Row: Streak & Class Consciousness */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-3">
          <button
            type="button"
            onClick={onOpenDiary}
            className={`bg-[#fff8ed] sketch-border rounded-xl flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold hover:bg-amber-50 cursor-pointer ${
              vp.isCompactLandscape ? 'px-2.5 py-0.5' : 'px-3 py-1 sm:px-3.5 sm:py-1.5'
            }`}
          >
            <span>🔥</span>
            <span className="text-red-900 font-mono-num">
              {state.streak.current} {state.streak.current === 1 ? 'Dia' : 'Dias'} de Plano Quinquenal
            </span>
            <span className="text-red-700">· Diário 📖</span>
          </button>

          <div
            className={`bg-[#fff8ed] sketch-border rounded-xl flex items-center gap-2 text-[11px] sm:text-xs font-bold ${
              vp.isCompactLandscape ? 'px-2.5 py-0.5' : 'px-3 py-1 sm:px-3.5 sm:py-1.5'
            }`}
          >
            <span className="text-red-700 text-sm sm:text-base">☭</span>
            <div>
              <div className="flex items-center justify-between gap-2 sm:gap-3 text-red-950">
                <span>Consciência de Classe</span>
                <span className="font-mono-num">{state.loveScore}%</span>
              </div>
              <div className="w-32 sm:w-44 bg-stone-200 h-1.5 sm:h-2 rounded-full border border-[#2b1111] overflow-hidden mt-0.5">
                <div
                  className="h-full bg-gradient-to-r from-red-700 via-red-600 to-amber-400 transition-all duration-300"
                  style={{ width: `${state.loveScore}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Large Comrade Cats Grid with custom Cat Beds & Sleep Toggle */}
        <div
          className={`grid grid-cols-2 items-stretch ${
            vp.isCompactLandscape ? 'gap-2.5 pt-2' : 'gap-2.5 sm:gap-6 pt-3 sm:pt-4'
          }`}
        >
          {renderCatShowcase(
            'cat1',
            state.cat1,
            lastCat1Received ? `💌 "${lastCat1Received.text}"` : state.cat1.speech
          )}
          {renderCatShowcase(
            'cat2',
            state.cat2,
            lastCat2Received ? `💌 "${lastCat2Received.text}"` : state.cat2.speech
          )}
        </div>
      </section>
    </div>
  );
};
