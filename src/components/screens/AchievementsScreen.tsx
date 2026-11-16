import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AchievementGameId, PlayerRole, SharedState } from '../../types/game';
import {
  ACHIEVEMENT_GAME_LABELS,
  ACHIEVEMENTS,
  getAchievementProgress,
  RARITY_META,
} from '../../logic/achievements';
import { sfx } from '../../utils/sound';
import { CatSvg } from '../CatSvg';
import { AchievementConfetti } from '../achievements/AchievementConfetti';
import { AchievementEmblem } from '../achievements/AchievementEmblem';

interface AchievementsScreenProps {
  myRole: PlayerRole;
  state: SharedState;
  isActiveTab?: boolean;
  pendingCelebrationIds?: string[];
  onConsumeCelebrations?: (role: PlayerRole, ids: string[]) => void;
}

type ViewOwner = 'mine' | 'partner' | 'compare';

const GAME_FILTERS: Array<{ id: 'all' | AchievementGameId; label: string; icon: string }> = [
  { id: 'all', label: 'Todos', icon: '🌟' },
  { id: 'skyhop', label: 'SkyHop', icon: '🚀' },
  { id: 'sudoku', label: 'Sudoku', icon: '🔢' },
  { id: 'solitaire', label: 'Solitária', icon: '🃏' },
  { id: 'termo', label: 'Termo', icon: '🔤' },
  { id: 'chess', label: 'Xadrez', icon: '♟️' },
  { id: 'checkers', label: 'Damas', icon: '⚪' },
  { id: 'airhockey', label: 'Air Hockey', icon: '🏒' },
  { id: 'tictactoe', label: 'Velha', icon: '⭐' },
  { id: 'jokenpo', label: 'Jokenpô', icon: '✊' },
  { id: 'reaction', label: 'Pata Rápida', icon: '⚡' },
  { id: 'global', label: 'Olimpíadas', icon: '🏆' },
];

function formatUnlockDate(ts?: number): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return '';
  }
}

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({
  myRole,
  state,
  isActiveTab = false,
  pendingCelebrationIds = [],
  onConsumeCelebrations,
}) => {
  const partnerRole: PlayerRole = myRole === 'cat1' ? 'cat2' : 'cat1';
  const [ownerView, setOwnerView] = useState<ViewOwner>('mine');
  const [gameFilter, setGameFilter] = useState<'all' | AchievementGameId>('all');
  const [celebratingIds, setCelebratingIds] = useState<string[]>([]);
  const [confettiBurstKey, setConfettiBurstKey] = useState<number>(0);
  const [confettiActive, setConfettiActive] = useState<boolean>(false);
  const celebrateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!isActiveTab || pendingCelebrationIds.length === 0) return;

    const freshIds = [...pendingCelebrationIds];
    setOwnerView('mine');
    setGameFilter((prev) => {
      if (prev === 'all') return prev;
      const allInFilter = freshIds.every(
        (id) => ACHIEVEMENTS.find((a) => a.id === id)?.game === prev
      );
      return allInFilter ? prev : 'all';
    });

    setCelebratingIds(freshIds);
    setConfettiBurstKey((k) => k + 1);
    setConfettiActive(true);
    sfx.win();
    onConsumeCelebrations?.(myRole, freshIds);

    if (celebrateTimerRef.current) {
      clearTimeout(celebrateTimerRef.current);
    }
    celebrateTimerRef.current = setTimeout(() => {
      setCelebratingIds([]);
    }, 5000);

    const firstId = freshIds[0];
    window.setTimeout(() => {
      const cardEl = cardRefs.current[firstId];
      const scroller = cardEl?.closest<HTMLElement>('.overflow-y-auto');
      if (scroller) {
        scroller.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 60);
  }, [isActiveTab, myRole, pendingCelebrationIds, onConsumeCelebrations]);

  useEffect(() => {
    return () => {
      if (celebrateTimerRef.current) {
        clearTimeout(celebrateTimerRef.current);
      }
    };
  }, []);

  const celebratingSet = useMemo(() => new Set(celebratingIds), [celebratingIds]);
  const celebratedDefs = useMemo(
    () => ACHIEVEMENTS.filter((a) => celebratingSet.has(a.id)),
    [celebratingSet]
  );

  const myUnlocked = state.achievements?.[myRole] || {};
  const partnerUnlocked = state.achievements?.[partnerRole] || {};
  const myStats = state.achievementStats?.[myRole];
  const partnerStats = state.achievementStats?.[partnerRole];

  const myCount = useMemo(
    () => ACHIEVEMENTS.filter((a) => Boolean(myUnlocked[a.id])).length,
    [myUnlocked]
  );
  const partnerCount = useMemo(
    () => ACHIEVEMENTS.filter((a) => Boolean(partnerUnlocked[a.id])).length,
    [partnerUnlocked]
  );
  const coupleSharedCount = useMemo(
    () =>
      ACHIEVEMENTS.filter(
        (a) => Boolean(myUnlocked[a.id]) || Boolean(partnerUnlocked[a.id])
      ).length,
    [myUnlocked, partnerUnlocked]
  );

  const filteredList = useMemo(() => {
    const base =
      gameFilter === 'all'
        ? ACHIEVEMENTS
        : ACHIEVEMENTS.filter((a) => a.game === gameFilter);

    if (ownerView === 'compare') return base;
    const map = ownerView === 'mine' ? myUnlocked : partnerUnlocked;
    return [...base].sort((a, b) => {
      const aCel = ownerView === 'mine' && celebratingSet.has(a.id) ? 1 : 0;
      const bCel = ownerView === 'mine' && celebratingSet.has(b.id) ? 1 : 0;
      if (bCel !== aCel) return bCel - aCel;

      const aTs = Number(map[a.id] || 0);
      const bTs = Number(map[b.id] || 0);
      if (Boolean(bTs) !== Boolean(aTs)) return Number(Boolean(bTs)) - Number(Boolean(aTs));
      if (bTs !== aTs) return bTs - aTs;
      return 0;
    });
  }, [gameFilter, ownerView, myUnlocked, partnerUnlocked, celebratingSet]);

  const myNick = state.nicknames[myRole] || (myRole === 'cat1' ? 'Camarada 1' : 'Camarada 2');
  const partnerNick =
    state.nicknames[partnerRole] || (partnerRole === 'cat1' ? 'Camarada 1' : 'Camarada 2');

  const inspectedRole: PlayerRole = ownerView === 'partner' ? partnerRole : myRole;
  const inspectedUnlocked = ownerView === 'partner' ? partnerUnlocked : myUnlocked;
  const inspectedStats = ownerView === 'partner' ? partnerStats : myStats;

  return (
    <section
      data-testid="achievements-screen"
      className="w-full max-w-5xl bg-[#fff8ed] rounded-3xl sketch-border p-4 sm:p-6 space-y-4"
    >
      <AchievementConfetti
        burstKey={confettiBurstKey}
        active={confettiActive}
        onDone={() => setConfettiActive(false)}
      />

      {/* Header & Couple Trophy Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#2b1111]/15 pb-3">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-red-950">
            Galeria de Conquistas 🏆
          </h2>
          <p className="text-xs text-[#2b1111]/75">
            Emblemas exclusivos do SkyHop e das Olimpíadas Felinas ·{' '}
            <span className="font-mono-num font-bold text-red-900">
              {coupleSharedCount}/{ACHIEVEMENTS.length} do casal
            </span>
          </p>
        </div>

        {/* Owner Mode Switcher */}
        <div
          role="tablist"
          aria-label="Visualizar conquistas"
          className="grid grid-cols-3 gap-1 bg-amber-100/80 p-1 rounded-xl border-2 border-[#2b1111] text-xs font-bold shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={ownerView === 'mine'}
            onClick={() => setOwnerView('mine')}
            className={`px-2.5 py-1.5 rounded-lg cursor-pointer whitespace-nowrap transition-colors ${
              ownerView === 'mine'
                ? 'bg-red-700 text-amber-100 border border-[#2b1111]'
                : 'bg-white/80 text-red-950 hover:bg-white'
            }`}
          >
            Minhas ({myCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={ownerView === 'partner'}
            onClick={() => setOwnerView('partner')}
            className={`px-2.5 py-1.5 rounded-lg cursor-pointer whitespace-nowrap transition-colors ${
              ownerView === 'partner'
                ? 'bg-red-700 text-amber-100 border border-[#2b1111]'
                : 'bg-white/80 text-red-950 hover:bg-white'
            }`}
          >
            Parceiro(a) ({partnerCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={ownerView === 'compare'}
            onClick={() => setOwnerView('compare')}
            className={`px-2.5 py-1.5 rounded-lg cursor-pointer whitespace-nowrap transition-colors ${
              ownerView === 'compare'
                ? 'bg-red-700 text-amber-100 border border-[#2b1111]'
                : 'bg-white/80 text-red-950 hover:bg-white'
            }`}
          >
            Casal 🤝
          </button>
        </div>
      </div>

      {/* Celebratory Banner When New Achievement(s) Unlock */}
      {celebratedDefs.length > 0 && (
        <div
          data-testid="achievement-celebration-banner"
          role="status"
          aria-live="polite"
          className="rounded-2xl border-2 border-[#2b1111] bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 px-4 py-3 flex items-center justify-between gap-3 shadow-md anim-achievement-jump"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl shrink-0" aria-hidden="true">
              🎉
            </span>
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-wider text-red-900">
                {celebratedDefs.length > 1
                  ? 'Novas Conquistas Desbloqueadas!'
                  : 'Nova Conquista Desbloqueada!'}
              </p>
              <p className="text-sm font-bold text-red-950 truncate">
                {celebratedDefs.map((d) => `${d.icon} ${d.title}`).join(' · ')}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono-num font-black bg-red-700 text-amber-100 px-2.5 py-1 rounded-lg border border-[#2b1111] shrink-0">
            +{celebratedDefs.length} 🏆
          </span>
        </div>
      )}

      {/* Duo Scorecard Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setOwnerView('mine')}
          className={`text-left bg-white p-3 rounded-2xl border-2 transition-colors flex items-center gap-3 cursor-pointer ${
            ownerView === 'mine' ? 'border-red-700 bg-amber-50/70' : 'border-[#2b1111]'
          }`}
        >
          <div className="w-12 h-12 shrink-0">
            <CatSvg cat={state[myRole]} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-red-950 truncate">
                {myNick} <span className="text-[11px] font-semibold text-red-700">· Você</span>
              </span>
              <span className="font-mono-num text-sm font-black text-red-900 shrink-0">
                {myCount}/{ACHIEVEMENTS.length}
              </span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-stone-200 border border-[#2b1111]/30 overflow-hidden">
              <div
                className="h-full bg-red-600 transition-all"
                style={{ width: `${Math.round((myCount / ACHIEVEMENTS.length) * 100)}%` }}
              />
            </div>
            <div className="mt-1 text-[11px] text-[#2b1111]/70 font-mono-num flex flex-wrap gap-x-2">
              <span>SkyHop máx: {(myStats?.skyhopMaxAltitude || 0).toLocaleString('pt-BR')} m</span>
              <span>·</span>
              <span>Melhor combo: {myStats?.skyhopMaxPerfectCombo || 0}x</span>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setOwnerView('partner')}
          className={`text-left bg-white p-3 rounded-2xl border-2 transition-colors flex items-center gap-3 cursor-pointer ${
            ownerView === 'partner' ? 'border-red-700 bg-amber-50/70' : 'border-[#2b1111]'
          }`}
        >
          <div className="w-12 h-12 shrink-0">
            <CatSvg cat={state[partnerRole]} isFlipped />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-red-950 truncate">
                {partnerNick}{' '}
                <span className="text-[11px] font-semibold text-amber-800">· Parceiro(a)</span>
              </span>
              <span className="font-mono-num text-sm font-black text-amber-900 shrink-0">
                {partnerCount}/{ACHIEVEMENTS.length}
              </span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-stone-200 border border-[#2b1111]/30 overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: `${Math.round((partnerCount / ACHIEVEMENTS.length) * 100)}%` }}
              />
            </div>
            <div className="mt-1 text-[11px] text-[#2b1111]/70 font-mono-num flex flex-wrap gap-x-2">
              <span>
                SkyHop máx: {(partnerStats?.skyhopMaxAltitude || 0).toLocaleString('pt-BR')} m
              </span>
              <span>·</span>
              <span>Melhor combo: {partnerStats?.skyhopMaxPerfectCombo || 0}x</span>
            </div>
          </div>
        </button>
      </div>

      {/* Category Filter Strip */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por jogo">
        {GAME_FILTERS.map((f) => {
          const active = gameFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setGameFilter(f.id)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border-2 cursor-pointer whitespace-nowrap transition-colors ${
                active
                  ? 'bg-amber-300 border-[#2b1111] text-red-950 shadow-sm'
                  : 'bg-white border-[#2b1111]/25 text-[#2b1111]/80 hover:bg-amber-50'
              }`}
            >
              {f.icon} {f.label}
            </button>
          );
        })}
      </div>

      {/* Achievements Grid or Side-by-Side Couple Comparison */}
      {ownerView === 'compare' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredList.map((def) => {
            const mineTs = myUnlocked[def.id];
            const partTs = partnerUnlocked[def.id];
            const myProg = getAchievementProgress(def, myStats, myUnlocked);
            const partProg = getAchievementProgress(def, partnerStats, partnerUnlocked);
            const gameMeta = ACHIEVEMENT_GAME_LABELS[def.game];
            const rarityMeta = RARITY_META[def.rarity];

            return (
              <article
                key={def.id}
                className="bg-white rounded-2xl border-2 border-[#2b1111] p-3.5 flex flex-col gap-2.5"
              >
                <div className="flex items-start gap-3">
                  <AchievementEmblem
                    achievement={def}
                    unlocked={Boolean(mineTs || partTs)}
                    size={52}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-red-950 truncate">{def.title}</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#2b1111]/30 shrink-0 ${rarityMeta.badgeBg} ${rarityMeta.badgeText}`}
                      >
                        {rarityMeta.label}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-[#2b1111]/60 mt-0.5">
                      {gameMeta.icon} {gameMeta.label}
                    </p>
                    <p className="text-xs text-[#2b1111]/80 mt-1 leading-snug">{def.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2b1111]/10 text-[11px]">
                  <div
                    className={`rounded-xl p-2 border ${
                      mineTs
                        ? 'bg-emerald-50 border-emerald-600/40 text-emerald-950'
                        : 'bg-stone-50 border-[#2b1111]/15 text-[#2b1111]/75'
                    }`}
                  >
                    <div className="font-bold truncate">{myNick}</div>
                    <div className="font-mono-num font-semibold mt-0.5">
                      {mineTs ? `✓ Em ${formatUnlockDate(mineTs)}` : myProg.label}
                    </div>
                  </div>
                  <div
                    className={`rounded-xl p-2 border ${
                      partTs
                        ? 'bg-amber-50 border-amber-600/40 text-amber-950'
                        : 'bg-stone-50 border-[#2b1111]/15 text-[#2b1111]/75'
                    }`}
                  >
                    <div className="font-bold truncate">{partnerNick}</div>
                    <div className="font-mono-num font-semibold mt-0.5">
                      {partTs ? `✓ Em ${formatUnlockDate(partTs)}` : partProg.label}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredList.map((def, idx) => {
            const unlockTs = inspectedUnlocked[def.id];
            const isUnlocked = Boolean(unlockTs);
            const prog = getAchievementProgress(def, inspectedStats, inspectedUnlocked);
            const gameMeta = ACHIEVEMENT_GAME_LABELS[def.game];
            const rarityMeta = RARITY_META[def.rarity];

            const isCelebrating = ownerView === 'mine' && celebratingSet.has(def.id);

            return (
              <article
                key={`${inspectedRole}_${def.id}`}
                ref={(el) => {
                  if (ownerView === 'mine') {
                    cardRefs.current[def.id] = el;
                  }
                }}
                data-achievement-id={def.id}
                data-celebrating={isCelebrating ? 'true' : undefined}
                style={isCelebrating && idx > 0 ? { animationDelay: `${Math.min(idx * 90, 360)}ms` } : undefined}
                className={`rounded-2xl border-2 p-3.5 flex items-start gap-3 transition-colors ${
                  isCelebrating
                    ? 'anim-achievement-jump bg-gradient-to-br from-amber-50 via-[#fffaf0] to-yellow-100 border-amber-600 ring-4 ring-amber-300/80 shadow-lg'
                    : isUnlocked
                    ? 'bg-white border-[#2b1111] shadow-sm'
                    : 'bg-[#fffcf7] border-[#2b1111]/35'
                }`}
              >
                <div className={isCelebrating ? 'anim-emblem-hop shrink-0' : 'shrink-0'}>
                  <AchievementEmblem achievement={def} unlocked={isUnlocked} size={56} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-red-950 truncate">
                        {def.title}
                      </h3>
                      {isCelebrating && (
                        <span className="text-[10px] font-extrabold bg-red-700 text-amber-100 px-1.5 py-0.5 rounded-md border border-[#2b1111] shrink-0">
                          Nova! ✨
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#2b1111]/30 shrink-0 ${rarityMeta.badgeBg} ${rarityMeta.badgeText}`}
                    >
                      {rarityMeta.label}
                    </span>
                  </div>

                  <p className="text-[11px] font-semibold text-[#2b1111]/60 mt-0.5">
                    {gameMeta.icon} {gameMeta.label}
                    {isUnlocked && unlockTs ? ` · Desbloqueado em ${formatUnlockDate(unlockTs)}` : ''}
                  </p>

                  <p className="text-xs text-[#2b1111]/85 mt-1 leading-snug">{def.description}</p>

                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono-num font-bold">
                      <span className={isUnlocked ? 'text-emerald-800' : 'text-[#2b1111]/70'}>
                        {isUnlocked ? 'Emblema Conquistado ✓' : 'Progresso'}
                      </span>
                      <span className={isUnlocked ? 'text-emerald-800' : 'text-red-950'}>
                        {prog.label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-stone-200 overflow-hidden border border-[#2b1111]/20">
                      <div
                        className={`h-full transition-all ${
                          isUnlocked ? 'bg-emerald-600' : 'bg-red-600'
                        }`}
                        style={{ width: `${prog.percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
