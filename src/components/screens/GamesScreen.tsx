import React, { useMemo, useState } from 'react';
import { Radio, Sparkles, Trophy } from 'lucide-react';
import {
  MinigameId,
  MinigamePlayMode,
  PlayerActiveGameStatus,
  PlayerRole,
  SharedState,
} from '../../types/game';
import { sfx } from '../../utils/sound';

interface GamesScreenProps {
  state: SharedState;
  myRole: PlayerRole;
  onLaunchGame: (game: MinigameId, mode?: MinigamePlayMode) => void;
  unlockedCount?: number;
  totalAchievements?: number;
  onOpenAchievements?: () => void;
}

type GameCategory = 'all' | 'new' | 'puzzle' | 'board' | 'action';

interface GameCardDef {
  id: MinigameId;
  category: Exclude<GameCategory, 'all'>;
  isNew?: boolean;
  icon: string;
  title: string;
  desc: string;
  reward: string;
  accentGradient: string;
  modes: { mode?: MinigamePlayMode; label: string; style: string }[];
}

const GAME_CATALOG: GameCardDef[] = [
  {
    id: 'sudoku',
    category: 'puzzle',
    isNew: true,
    icon: '🔢',
    title: 'Sudoku Club',
    desc: 'Grades 4×4, 6×6 e 9×9, 4 dificuldades, rascunho, Zen, Tempo e Duelo Online.',
    reward: '+5 a +24 🐾',
    accentGradient: 'from-sky-100 to-indigo-100',
    modes: [
      { mode: 'bot', label: '🧩 Jogar Solo', style: 'bg-amber-300 text-red-950' },
      { mode: 'online', label: '🌐 Duelo Online', style: 'bg-sky-700 text-white' },
    ],
  },
  {
    id: 'solitaire',
    category: 'puzzle',
    isNew: true,
    icon: '🃏',
    title: 'Solitária dos Gatinhos',
    desc: 'Cartas ilustradas aconchegantes, compra 1/2/3, dicas, desfazer e auto-completar.',
    reward: '+10 a +22 🐾',
    accentGradient: 'from-emerald-100 to-teal-100',
    modes: [{ mode: 'bot', label: '🃏 Jogar Solo', style: 'bg-emerald-700 text-amber-100' }],
  },
  {
    id: 'termo',
    category: 'puzzle',
    isNew: true,
    icon: '🔤',
    title: 'Termo Diário',
    desc: 'Palavras novas todos os dias sem repetição nos modos Termo, Dueto e Quarteto.',
    reward: '+10 a +22 🐾',
    accentGradient: 'from-amber-100 to-lime-100',
    modes: [{ mode: 'bot', label: '🔤 Palavra do Dia', style: 'bg-[#2b1111] text-amber-200' }],
  },
  {
    id: 'skyhop',
    category: 'action',
    icon: '🚀',
    title: 'Pula-Pula Sputnik',
    desc: 'Suba por planetas com portais, música por cenário e +10 🐾 por nível subido.',
    reward: '+10 🐾 / nível',
    accentGradient: 'from-indigo-100 to-sky-100',
    modes: [{ label: '🚀 Jogar Solo', style: 'bg-red-700 text-amber-100' }],
  },
  {
    id: 'chess',
    category: 'board',
    icon: '♟️',
    title: 'Xadrez de Moscou',
    desc: 'Roque, En Passant, promoção, xeque-mate e IA tática.',
    reward: '+12 🐾',
    accentGradient: 'from-amber-100 to-orange-100',
    modes: [
      { mode: 'bot', label: '🤖 vs Bot', style: 'bg-amber-300 text-red-950' },
      { mode: 'local', label: '👥 Mesma Tela', style: 'bg-white text-[#2b1111]' },
      { mode: 'online', label: '🌐 Online', style: 'bg-red-700 text-amber-100' },
    ],
  },
  {
    id: 'checkers',
    category: 'board',
    icon: '⚪',
    title: 'Damas Brasileiras',
    desc: 'Captura obrigatória, combo múltiplo e Dama voadora.',
    reward: '+12 🐾',
    accentGradient: 'from-stone-100 to-amber-100',
    modes: [
      { mode: 'bot', label: '🤖 vs Bot', style: 'bg-amber-300 text-red-950' },
      { mode: 'local', label: '👥 Mesma Tela', style: 'bg-white text-[#2b1111]' },
      { mode: 'online', label: '🌐 Online', style: 'bg-red-700 text-amber-100' },
    ],
  },
  {
    id: 'airhockey',
    category: 'action',
    icon: '🏒',
    title: 'Air Hockey Siberiano',
    desc: 'Multi-touch, mouse e teclado (WASD / Setas) em alta velocidade.',
    reward: '+10 🐾',
    accentGradient: 'from-cyan-100 to-blue-100',
    modes: [
      { mode: 'bot', label: '🤖 vs Bot', style: 'bg-amber-300 text-red-950' },
      { mode: 'local', label: '👥 Mesma Tela', style: 'bg-white text-[#2b1111]' },
      { mode: 'online', label: '🌐 Online', style: 'bg-red-700 text-amber-100' },
    ],
  },
  {
    id: 'tictactoe',
    category: 'board',
    icon: '⭐',
    title: 'Jogo da Velha Coletivo',
    desc: 'Turnos rápidos com escolha de quem começa.',
    reward: '+8 🐾',
    accentGradient: 'from-rose-100 to-amber-100',
    modes: [
      { mode: 'bot', label: '🤖 vs Bot', style: 'bg-amber-300 text-red-950' },
      { mode: 'local', label: '👥 Mesma Tela', style: 'bg-white text-[#2b1111]' },
      { mode: 'online', label: '🌐 Online', style: 'bg-red-700 text-amber-100' },
    ],
  },
  {
    id: 'jokenpo',
    category: 'action',
    icon: '✊',
    title: 'Jokenpô das Patinhas',
    desc: 'Pedra, papel ou tesoura em 3 modos.',
    reward: '+6 🐾',
    accentGradient: 'from-yellow-100 to-amber-100',
    modes: [
      { mode: 'bot', label: '🤖 vs Bot', style: 'bg-amber-300 text-red-950' },
      { mode: 'local', label: '👥 Mesma Tela', style: 'bg-white text-[#2b1111]' },
      { mode: 'online', label: '🌐 Online', style: 'bg-red-700 text-amber-100' },
    ],
  },
  {
    id: 'reaction',
    category: 'action',
    icon: '⚡',
    title: 'Pata Rápida Stakhanovista',
    desc: 'Duelo de reflexo ao vivo, na mesma tela ou contra o Bot.',
    reward: '+6 🐾',
    accentGradient: 'from-amber-100 to-rose-100',
    modes: [
      { mode: 'bot', label: '🤖 vs Bot', style: 'bg-amber-300 text-red-950' },
      { mode: 'local', label: '👥 Mesma Tela', style: 'bg-white text-[#2b1111]' },
      { mode: 'online', label: '🌐 Online', style: 'bg-red-700 text-amber-100' },
    ],
  },
];

const CATEGORY_FILTERS: { id: GameCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'Todos (10)', icon: '🎮' },
  { id: 'new', label: 'Novos', icon: '✨' },
  { id: 'puzzle', label: 'Lógica & Palavras', icon: '🧩' },
  { id: 'board', label: 'Tabuleiro', icon: '♟️' },
  { id: 'action', label: 'Ação & Duelo', icon: '⚡' },
];

function formatModeLabel(mode: MinigamePlayMode): string {
  if (mode === 'online') return 'Online';
  if (mode === 'local') return 'Mesma Tela';
  return 'Solo / Bot';
}

export const GamesScreen: React.FC<GamesScreenProps> = ({
  state,
  myRole,
  onLaunchGame,
  unlockedCount = 0,
  totalAchievements = 0,
  onOpenAchievements,
}) => {
  const [category, setCategory] = useState<GameCategory>('all');
  const partnerRole: PlayerRole = myRole === 'cat1' ? 'cat2' : 'cat1';
  const partnerNick =
    state.nicknames[partnerRole] || (partnerRole === 'cat1' ? 'Camarada 1' : 'Camarada 2');
  const myNick = state.nicknames[myRole] || (myRole === 'cat1' ? 'Camarada 1' : 'Camarada 2');

  const activeGames = state.activeGames || { cat1: null, cat2: null };
  const myActive = activeGames[myRole] || null;
  const partnerActive = activeGames[partnerRole] || null;

  const filteredGames = useMemo(() => {
    if (category === 'all') return GAME_CATALOG;
    if (category === 'new') return GAME_CATALOG.filter((g) => g.isNew);
    return GAME_CATALOG.filter((g) => g.category === category);
  }, [category]);

  const renderPresenceSlot = (
    nick: string,
    active: PlayerActiveGameStatus | null,
    isPartner: boolean
  ) => (
    <div
      className={`rounded-2xl border-2 px-3 py-2 flex items-center justify-between gap-2 ${
        active
          ? 'bg-emerald-50 border-emerald-700/50 text-emerald-950'
          : 'bg-white/80 border-[#2b1111]/20 text-[#2b1111]/75'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            active ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'
          }`}
        />
        <div className="min-w-0">
          <div className="text-[11px] font-bold truncate">
            {nick} {isPartner ? '(Parceiro)' : '(Você)'}
          </div>
          <div className="text-xs font-semibold truncate">
            {active
              ? `${active.icon} Jogando ${active.label} · ${formatModeLabel(active.mode)}`
              : 'No jardim / navegando'}
          </div>
        </div>
      </div>
      {isPartner && active && active.mode === 'online' && (
        <button
          type="button"
          onClick={() => {
            sfx.select();
            onLaunchGame(active.game, 'online');
          }}
          className="sketch-btn bg-sky-700 hover:bg-sky-800 text-white text-[11px] font-bold px-2.5 py-1 rounded-xl shrink-0 cursor-pointer whitespace-nowrap"
        >
          Entrar Online!
        </button>
      )}
    </div>
  );

  return (
    <section className="w-full max-w-5xl bg-[#fff8ed] rounded-3xl sketch-border p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b-2 border-[#2b1111]/15 pb-3">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-red-950 leading-none">
            Olimpíadas Soviéticas Felinas 🎮
          </h2>
          <p className="text-xs text-[#2b1111]/75 mt-1">
            Todos os jogos premiam em <strong className="text-amber-800">Patinhas 🐾</strong> · Peixes 🐟 são moeda diária.
          </p>
        </div>
        {onOpenAchievements && (
          <button
            type="button"
            onClick={() => {
              sfx.select();
              onOpenAchievements();
            }}
            className="sketch-btn bg-amber-300 hover:bg-amber-400 text-red-950 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer whitespace-nowrap"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Conquistas</span>
            {totalAchievements > 0 && (
              <span className="font-mono-num">
                ({unlockedCount}/{totalAchievements})
              </span>
            )}
          </button>
        )}
      </div>

      {/* Live Active-Game Presence Strip */}
      <div className="bg-[#f5e3c6] border-2 border-[#2b1111]/35 rounded-2xl p-2.5 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-red-950/80 px-1">
          <Radio className="w-3.5 h-3.5 text-red-700" />
          <span>Ao Vivo na Sala</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {renderPresenceSlot(myNick, myActive, false)}
          {renderPresenceSlot(partnerNick, partnerActive, true)}
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar jogos">
        {CATEGORY_FILTERS.map((f) => {
          const active = category === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setCategory(f.id);
                sfx.select();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 cursor-pointer whitespace-nowrap transition-colors ${
                active
                  ? 'bg-[#2b1111] border-[#2b1111] text-amber-200 shadow-sm'
                  : 'bg-white border-[#2b1111]/25 text-red-950 hover:bg-amber-50'
              }`}
            >
              {f.icon} {f.label}
            </button>
          );
        })}
      </div>

      {/* Redesigned Game Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredGames.map((g) => {
          const partnerHere = partnerActive?.game === g.id;
          return (
            <div
              key={g.id}
              className={`bg-white rounded-2xl border-2 overflow-hidden flex flex-col justify-between transition-transform hover:-translate-y-0.5 shadow-sm anim-card-pop ${
                partnerHere ? 'border-emerald-700 ring-2 ring-emerald-400/50' : 'border-[#2b1111]'
              }`}
            >
              {/* Illustrated mini-banner header */}
              <div
                className={`bg-gradient-to-r ${g.accentGradient} px-3.5 py-2.5 border-b border-[#2b1111]/15 flex items-center justify-between gap-2`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-10 h-10 rounded-xl bg-white border border-[#2b1111]/25 flex items-center justify-center text-2xl leading-none shrink-0 shadow-sm">
                    {g.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm sm:text-base font-bold text-red-950 truncate">
                        {g.title}
                      </h3>
                      {g.isNew && (
                        <span className="inline-flex items-center gap-0.5 bg-red-700 text-amber-100 text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0">
                          <Sparkles className="w-2.5 h-2.5" /> Novo
                        </span>
                      )}
                    </div>
                    {partnerHere && (
                      <div className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                        {partnerNick} está jogando agora!
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-xs font-mono-num font-black text-amber-900 bg-white/90 border border-[#2b1111]/20 px-2 py-0.5 rounded-lg shrink-0">
                  {g.reward}
                </span>
              </div>

              <div className="p-3.5 flex flex-col justify-between gap-3 flex-1">
                <p className="text-xs text-[#2b1111]/80 leading-snug">{g.desc}</p>

                <div className="flex flex-wrap gap-1.5">
                  {g.modes.map((m) => (
                    <button
                      key={m.label}
                      type="button"
                      onClick={() => onLaunchGame(g.id, m.mode)}
                      className={`sketch-btn flex-1 min-w-0 text-xs font-bold py-2 px-2 rounded-xl whitespace-nowrap cursor-pointer ${m.style}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
