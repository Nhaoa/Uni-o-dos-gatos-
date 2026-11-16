import React from 'react';
import { X } from 'lucide-react';
import { MinigameId, MinigamePlayMode } from '../../types/game';

export type { MinigameId };

interface GamesHubModalProps {
  open: boolean;
  onClose: () => void;
  onLaunchGame: (game: MinigameId, mode?: MinigamePlayMode) => void;
}

export const GamesHubModal: React.FC<GamesHubModalProps> = ({
  open,
  onClose,
  onLaunchGame,
}) => {
  if (!open) return null;

  const games: {
    id: MinigameId;
    icon: string;
    title: string;
    desc: string;
    reward: string;
    modes: { mode?: MinigamePlayMode; label: string; style: string }[];
  }[] = [
    {
      id: 'sudoku',
      icon: '🔢',
      title: 'Sudoku Club',
      desc: 'Grades 4×4, 6×6 e 9×9, rascunhos, modo Clássico, Zen, Tempo e Duelo Online.',
      reward: '+6 a +24 🐾',
      modes: [
        { mode: 'bot', label: '🧩 Jogar Solo', style: 'bg-amber-300 text-red-950' },
        { mode: 'online', label: '🌐 Duelo Online', style: 'bg-red-700 text-amber-100' },
      ],
    },
    {
      id: 'solitaire',
      icon: '🃏',
      title: 'Solitária dos Gatinhos',
      desc: 'Baralho ilustrado com gatinhos aconchegantes, compra de 1, 2 ou 3 cartas e cascata.',
      reward: '+10 a +22 🐾',
      modes: [{ mode: 'bot', label: '🃏 Jogar Solo', style: 'bg-emerald-700 text-amber-100' }],
    },
    {
      id: 'termo',
      icon: '🔤',
      title: 'Termo Diário',
      desc: 'Palavras novas todos os dias sem repetição nos modos Termo, Dueto e Quarteto.',
      reward: '+10 a +26 🐾',
      modes: [{ mode: 'bot', label: '🔤 Palavra do Dia', style: 'bg-amber-300 text-red-950' }],
    },
    {
      id: 'chess',
      icon: '♟️',
      title: 'Xadrez de Moscou',
      desc: 'Roque, En Passant, promoção, xeque-mate e IA tática.',
      reward: '+12 🐾',
      modes: [
        { mode: 'bot', label: '🤖 vs Bot', style: 'bg-amber-300 text-red-950' },
        { mode: 'local', label: '👥 Mesma Tela', style: 'bg-white text-[#2b1111]' },
        { mode: 'online', label: '🌐 Online', style: 'bg-red-700 text-amber-100' },
      ],
    },
    {
      id: 'checkers',
      icon: '⚪',
      title: 'Damas Brasileiras',
      desc: 'Captura obrigatória, combo múltiplo e Dama voadora.',
      reward: '+12 🐾',
      modes: [
        { mode: 'bot', label: '🤖 vs Bot', style: 'bg-amber-300 text-red-950' },
        { mode: 'local', label: '👥 Mesma Tela', style: 'bg-white text-[#2b1111]' },
        { mode: 'online', label: '🌐 Online', style: 'bg-red-700 text-amber-100' },
      ],
    },
    {
      id: 'airhockey',
      icon: '🏒',
      title: 'Air Hockey Siberiano',
      desc: 'Multi-touch, mouse e teclado (WASD / Setas).',
      reward: '+10 🐾',
      modes: [
        { mode: 'bot', label: '🤖 vs Bot', style: 'bg-amber-300 text-red-950' },
        { mode: 'local', label: '👥 Mesma Tela', style: 'bg-white text-[#2b1111]' },
        { mode: 'online', label: '🌐 Online', style: 'bg-red-700 text-amber-100' },
      ],
    },
    {
      id: 'tictactoe',
      icon: '⭐',
      title: 'Jogo da Velha Coletivo',
      desc: 'Turnos rápidos com escolha de quem começa.',
      reward: '+8 🐾',
      modes: [
        { mode: 'bot', label: '🤖 vs Bot', style: 'bg-amber-300 text-red-950' },
        { mode: 'local', label: '👥 Mesma Tela', style: 'bg-white text-[#2b1111]' },
        { mode: 'online', label: '🌐 Online', style: 'bg-red-700 text-amber-100' },
      ],
    },
    {
      id: 'jokenpo',
      icon: '✊',
      title: 'Jokenpô das Patinhas',
      desc: 'Pedra, papel ou tesoura em 3 modos.',
      reward: '+6 🐾',
      modes: [
        { mode: 'bot', label: '🤖 vs Bot', style: 'bg-amber-300 text-red-950' },
        { mode: 'local', label: '👥 Mesma Tela', style: 'bg-white text-[#2b1111]' },
        { mode: 'online', label: '🌐 Online', style: 'bg-red-700 text-amber-100' },
      ],
    },
    {
      id: 'reaction',
      icon: '⚡',
      title: 'Pata Rápida Stakhanovista',
      desc: 'Duelo de reflexo ao vivo, na mesma tela ou contra o Bot.',
      reward: '+6 🐾',
      modes: [
        { mode: 'bot', label: '🤖 vs Bot', style: 'bg-amber-300 text-red-950' },
        { mode: 'local', label: '👥 Mesma Tela', style: 'bg-white text-[#2b1111]' },
        { mode: 'online', label: '🌐 Online', style: 'bg-red-700 text-amber-100' },
      ],
    },
    {
      id: 'skyhop',
      icon: '🚀',
      title: 'Pula-Pula Sputnik',
      desc: 'Salte pelas nuvens e +10 🐾 por nível subido.',
      reward: '+10 🐾 / nível',
      modes: [{ label: '🚀 Jogar Solo', style: 'bg-red-700 text-amber-100' }],
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hub-title"
    >
      <div className="bg-[#fff8ed] max-w-3xl w-full p-4 sm:p-5 rounded-3xl sketch-border flex flex-col max-h-[90dvh] gap-3 shadow-2xl">
        <div className="flex justify-between items-center border-b-2 border-[#2b1111]/15 pb-2">
          <div>
            <h2 id="hub-title" className="font-display text-2xl sm:text-3xl font-bold text-red-950">
              Olimpíadas Soviéticas Felinas 🎮
            </h2>
            <p className="text-xs text-[#2b1111]/75">
              Jogue solo contra o Bot, na Mesma Tela ou Online em dois aparelhos!
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar central de jogos"
            className="sketch-btn bg-white p-1.5 rounded-xl cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto custom-scroll pr-1">
          {games.map((g) => (
            <div
              key={g.id}
              className="bg-white p-3 rounded-2xl border-2 border-[#2b1111] flex flex-col justify-between gap-2.5 shadow-sm"
            >
              <div className="flex items-start gap-2.5">
                <span className="text-3xl leading-none">{g.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-red-950 truncate">{g.title}</h3>
                    <span className="text-[11px] font-mono-num font-bold text-amber-800 shrink-0">
                      {g.reward}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#2b1111]/70 mt-0.5 leading-snug">{g.desc}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {g.modes.map((m) => (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => onLaunchGame(g.id, m.mode)}
                    className={`sketch-btn flex-1 min-w-0 text-[11px] font-bold py-1.5 px-1.5 rounded-xl whitespace-nowrap cursor-pointer ${m.style}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
