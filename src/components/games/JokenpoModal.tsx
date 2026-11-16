import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { JokenpoChoice, MinigamePlayMode, PlayerRole, SharedState } from '../../types/game';
import { chooseBotJokenpoMove, resolveJokenpoWinner } from '../../logic/minigames';
import { CatSvg, PawGestureSvg } from '../CatSvg';
import { sfx } from '../../utils/sound';

import { AchievementEvent } from '../../logic/achievements';
import { MatchScoreOutcome } from '../../logic/scores';

interface JokenpoModalProps {
  open: boolean;
  initialMode: MinigamePlayMode;
  myRole: PlayerRole;
  state: SharedState;
  onClose: () => void;
  onSendSocket: (payload: Record<string, unknown>) => boolean;
  onAwardPaws: (role: PlayerRole, amount: number) => void;
  onRecordOutcome?: (outcome: MatchScoreOutcome) => void;
  onAchievementEvent?: (role: PlayerRole, event: AchievementEvent) => void;
}

const GESTURES: { key: Exclude<JokenpoChoice, ''>; label: string }[] = [
  { key: 'rock', label: 'Pedra' },
  { key: 'paper', label: 'Papel' },
  { key: 'scissors', label: 'Tesoura' },
];

export const JokenpoModal: React.FC<JokenpoModalProps> = ({
  open,
  initialMode,
  myRole,
  state,
  onClose,
  onSendSocket,
  onAwardPaws,
  onRecordOutcome,
  onAchievementEvent,
}) => {
  const [mode, setMode] = useState<MinigamePlayMode>(initialMode);
  const [localP1, setLocalP1] = useState<JokenpoChoice>('');
  const [localP2, setLocalP2] = useState<JokenpoChoice>('');
  const [localPhase, setLocalPhase] = useState<'pick' | 'revealed'>('pick');

  useEffect(() => {
    setMode(initialMode);
    setLocalP1('');
    setLocalP2('');
    setLocalPhase('pick');
  }, [initialMode, open]);

  useEffect(() => {
    if (!open || mode !== 'online') return;
    onSendSocket({ type: 'room:join', game: 'jokenpo' });
    return () => {
      onSendSocket({ type: 'room:leave', game: 'jokenpo' });
    };
  }, [open, mode, onSendSocket]);

  if (!open) return null;

  const room = state.onlineRooms.jokenpo;
  const bothOnline = room.p1InRoom && room.p2InRoom;

  const p1Name = state.nicknames.cat1 || 'Camarada 1';
  const p2Name = mode === 'bot' ? 'Autômato Estatal' : state.nicknames.cat2 || 'Camarada 2';

  const activeP1 = mode === 'online' ? room.p1Choice : localP1;
  const activeP2 = mode === 'online' ? room.p2Choice : localP2;
  const isRevealed =
    mode === 'online' ? room.state === 'finished' && Boolean(room.p1Choice && room.p2Choice) : localPhase === 'revealed';

  const winner =
    isRevealed && activeP1 && activeP2 ? resolveJokenpoWinner(activeP1, activeP2) : null;

  const handleModeSwitch = (nextMode: MinigamePlayMode) => {
    setMode(nextMode);
    setLocalP1('');
    setLocalP2('');
    setLocalPhase('pick');
  };

  const pickOffline = (player: 'cat1' | 'cat2', choice: Exclude<JokenpoChoice, ''>) => {
    if (localPhase === 'revealed') return;
    sfx.move();

    if (mode === 'bot') {
      const botPick = chooseBotJokenpoMove();
      setLocalP1(choice);
      setLocalP2(botPick);
      setLocalPhase('revealed');
      const res = resolveJokenpoWinner(choice, botPick);
      if (res === 'cat1') {
        sfx.win();
        onAwardPaws(myRole, 6);
        onRecordOutcome?.({ kind: 'solo_win', role: myRole });
        onAchievementEvent?.(myRole, { type: 'jokenpo_result', outcome: 'win' });
      } else if (res === 'tie') {
        sfx.bounce();
        onRecordOutcome?.({ kind: 'tie' });
        onAchievementEvent?.(myRole, { type: 'jokenpo_result', outcome: 'tie' });
      } else {
        sfx.hit();
        onRecordOutcome?.({ kind: 'solo_loss', role: myRole });
        onAchievementEvent?.(myRole, { type: 'jokenpo_result', outcome: 'loss' });
      }
      return;
    }

    // Local same-screen mode: P1 and P2 pick independently, reveals once both have picked
    const nextP1 = player === 'cat1' ? choice : localP1;
    const nextP2 = player === 'cat2' ? choice : localP2;
    setLocalP1(nextP1);
    setLocalP2(nextP2);
    if (nextP1 && nextP2) {
      setLocalPhase('revealed');
      const res = resolveJokenpoWinner(nextP1, nextP2);
      if (res === 'cat1' || res === 'cat2') {
        sfx.win();
        onAwardPaws(res, 6);
        onRecordOutcome?.({ kind: 'pvp_win', winner: res });
        const loser: PlayerRole = res === 'cat1' ? 'cat2' : 'cat1';
        onAchievementEvent?.(res, { type: 'jokenpo_result', outcome: 'win' });
        onAchievementEvent?.(loser, { type: 'jokenpo_result', outcome: 'loss' });
      } else {
        sfx.bounce();
        onRecordOutcome?.({ kind: 'tie' });
        onAchievementEvent?.('cat1', { type: 'jokenpo_result', outcome: 'tie' });
        onAchievementEvent?.('cat2', { type: 'jokenpo_result', outcome: 'tie' });
      }
    }
  };

  const pickOnline = (choice: Exclude<JokenpoChoice, ''>) => {
    if (!bothOnline || room.state !== 'waiting') return;
    sfx.move();
    onSendSocket({ type: 'jokenpo:choice', choice });
  };

  const resetRound = () => {
    if (mode === 'online') {
      onSendSocket({ type: 'jokenpo:reset' });
    } else {
      setLocalP1('');
      setLocalP2('');
      setLocalPhase('pick');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-3" role="dialog" aria-modal="true">
      <div className="bg-[#fff8ed] max-w-md w-full p-4 sm:p-5 rounded-3xl sketch-border space-y-3 text-center max-h-[92dvh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center border-b border-[#2b1111]/20 pb-2">
          <div className="text-left">
            <h2 className="font-display text-2xl font-bold text-red-950">Jokenpô das Patinhas ✊</h2>
            <p className="text-[11px] text-[#2b1111]/70">Pedra, papel ou tesoura</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar Jokenpô" className="sketch-btn bg-white p-1.5 rounded-xl cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-3 gap-1.5 bg-amber-100/70 p-1 rounded-xl border border-[#2b1111]/25 text-xs font-bold">
          {(['bot', 'local', 'online'] as MinigamePlayMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleModeSwitch(m)}
              className={`py-1.5 px-2 rounded-lg border cursor-pointer whitespace-nowrap ${
                mode === m
                  ? 'bg-amber-300 border-[#2b1111] text-red-950'
                  : 'bg-white border-transparent text-[#2b1111]/75'
              }`}
            >
              {m === 'bot' ? '🤖 vs Bot' : m === 'local' ? '👥 Mesma Tela' : '🌐 Online'}
            </button>
          ))}
        </div>

        {mode === 'online' && !bothOnline && (
          <div className="bg-red-100 border-2 border-dashed border-red-500 rounded-2xl p-2.5 text-xs text-red-950">
            <p className="font-bold">Aguardando outro jogador entrar nesta sala online...</p>
            <p className="text-[11px] text-red-900/80 mt-0.5">
              Dica: para jogar sozinho ou no mesmo aparelho, escolha “vs Bot” ou “Mesma Tela” acima!
            </p>
          </div>
        )}

        {/* Arena */}
        <div className="bg-white border-2 border-[#2b1111] rounded-2xl p-3 space-y-3">
          <div className="flex items-center justify-around">
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16">
                <CatSvg cat={state.cat1} />
              </div>
              <span className="text-xs font-bold text-amber-900 mt-1">{p1Name}</span>
              <span className="text-[11px] text-[#2b1111]/70">
                {isRevealed ? 'Revelado' : activeP1 ? 'Pronto ✓' : 'Escolhendo...'}
              </span>
              <div className="mt-2 w-16 h-16 rounded-xl border-2 border-dashed border-[#2b1111] flex items-center justify-center bg-amber-50">
                {isRevealed && activeP1 ? (
                  <PawGestureSvg gesture={activeP1} size={46} />
                ) : (
                  <span className="text-2xl">{activeP1 ? '🤫' : '❓'}</span>
                )}
              </div>
            </div>

            <span className="text-xl font-black text-red-700">VS</span>

            <div className="flex flex-col items-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16">
                <CatSvg cat={state.cat2} isFlipped />
              </div>
              <span className="text-xs font-bold text-red-900 mt-1">{p2Name}</span>
              <span className="text-[11px] text-[#2b1111]/70">
                {isRevealed ? 'Revelado' : activeP2 ? 'Pronto ✓' : mode === 'bot' ? 'Autômato' : 'Escolhendo...'}
              </span>
              <div className="mt-2 w-16 h-16 rounded-xl border-2 border-dashed border-[#2b1111] flex items-center justify-center bg-red-50">
                {isRevealed && activeP2 ? (
                  <PawGestureSvg gesture={activeP2} size={46} />
                ) : (
                  <span className="text-2xl">{activeP2 ? '🤫' : '❓'}</span>
                )}
              </div>
            </div>
          </div>

          {isRevealed && winner && (
            <div className="border-t border-[#2b1111]/15 pt-2.5 space-y-2">
              <p className="text-xs font-bold bg-amber-100 border border-[#2b1111] p-2 rounded-xl text-red-950">
                {winner === 'tie'
                  ? 'Empate! Igualdade proletária 🤝'
                  : winner === 'cat1'
                  ? `Vitória de ${p1Name}! (+6 🐾)`
                  : `Vitória de ${p2Name}! ${mode === 'bot' ? '' : '(+6 🐾)'}`}
              </p>
              <button
                type="button"
                onClick={resetRound}
                className="sketch-btn bg-amber-300 hover:bg-amber-400 px-4 py-1.5 rounded-xl text-xs font-bold text-red-950 cursor-pointer"
              >
                Nova Rodada
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        {!isRevealed && (
          <div className="space-y-2">
            {(mode !== 'online' || bothOnline) && (
              <div className="bg-amber-50 p-2.5 rounded-xl border border-[#2b1111]/30">
                <p className="text-xs font-bold text-red-950 mb-1.5 text-left">
                  {mode === 'local' ? `${p1Name}:` : 'Escolha sua jogada:'}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {GESTURES.map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() =>
                        mode === 'online' ? pickOnline(g.key) : pickOffline('cat1', g.key)
                      }
                      className="sketch-btn bg-white hover:bg-amber-100 p-2 rounded-xl flex flex-col items-center min-h-[64px] cursor-pointer"
                    >
                      <PawGestureSvg gesture={g.key} size={32} />
                      <span className="text-[11px] font-bold mt-1">{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'local' && (
              <div className="bg-red-50 p-2.5 rounded-xl border border-[#2b1111]/30">
                <p className="text-xs font-bold text-red-950 mb-1.5 text-left">{p2Name} (Mesma Tela):</p>
                <div className="grid grid-cols-3 gap-2">
                  {GESTURES.map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => pickOffline('cat2', g.key)}
                      className="sketch-btn bg-white hover:bg-red-100 p-2 rounded-xl flex flex-col items-center min-h-[64px] cursor-pointer"
                    >
                      <PawGestureSvg gesture={g.key} size={32} />
                      <span className="text-[11px] font-bold mt-1">{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
