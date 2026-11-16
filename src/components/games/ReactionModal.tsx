import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { MinigamePlayMode, PlayerRole, SharedState } from '../../types/game';
import { sfx } from '../../utils/sound';

import { AchievementEvent } from '../../logic/achievements';
import { MatchScoreOutcome } from '../../logic/scores';

interface ReactionModalProps {
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

export const ReactionModal: React.FC<ReactionModalProps> = ({
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
  const [localState, setLocalState] = useState<'idle' | 'waiting' | 'ready' | 'finished'>('idle');
  const [localWinner, setLocalWinner] = useState<string>('');
  const [reactionMs, setReactionMs] = useState<number | null>(null);
  const localStateRef = useRef<'idle' | 'waiting' | 'ready' | 'finished'>('idle');
  const readyTimestampRef = useRef<number>(0);
  const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
  };

  useEffect(() => {
    setMode(initialMode);
    localStateRef.current = 'idle';
    setLocalState('idle');
    setLocalWinner('');
    setReactionMs(null);
    return clearTimers;
  }, [initialMode, open]);

  useEffect(() => {
    if (!open || mode !== 'online') return;
    onSendSocket({ type: 'room:join', game: 'reaction' });
    return () => {
      onSendSocket({ type: 'room:leave', game: 'reaction' });
    };
  }, [open, mode, onSendSocket]);

  if (!open) return null;

  const onlineRoom = state.onlineRooms.reaction;
  const bothOnline = onlineRoom.p1InRoom && onlineRoom.p2InRoom;
  const p1Name = state.nicknames.cat1 || 'Camarada 1';
  const p2Name = mode === 'bot' ? 'Autômato Estatal' : state.nicknames.cat2 || 'Camarada 2';

  const curState = mode === 'online' ? onlineRoom.state : localState;

  const startRound = () => {
    if (mode === 'online') {
      if (!bothOnline) return;
      onSendSocket({ type: 'reaction:start' });
      return;
    }

    clearTimers();
    localStateRef.current = 'waiting';
    setLocalState('waiting');
    setLocalWinner('');
    setReactionMs(null);
    const delay = Math.floor(Math.random() * 2200) + 1400;
    waitTimerRef.current = setTimeout(() => {
      readyTimestampRef.current = performance.now();
      localStateRef.current = 'ready';
      setLocalState('ready');
      sfx.goal();

      if (mode === 'bot') {
        const botReaction = Math.floor(Math.random() * 190) + 250; // 250-440ms
        botTimerRef.current = setTimeout(() => {
          if (localStateRef.current === 'ready') {
            localStateRef.current = 'finished';
            setLocalState('finished');
            sfx.hit();
            setLocalWinner(`Autômato venceu (${botReaction} ms)`);
            onRecordOutcome?.({ kind: 'solo_loss', role: myRole });
          }
        }, botReaction);
      }
    }, delay);
  };

  const handleTap = (actor: PlayerRole) => {
    if (mode === 'online') {
      onSendSocket({ type: 'reaction:tap' });
      return;
    }

    if (localStateRef.current === 'waiting') {
      clearTimers();
      sfx.error();
      localStateRef.current = 'idle';
      setLocalState('idle');
      setLocalWinner('Precipitado! Aguarde a tigela ficar dourada!');
      return;
    }

    if (localStateRef.current === 'ready') {
      clearTimers();
      const elapsed = Math.round(performance.now() - readyTimestampRef.current);
      setReactionMs(elapsed);
      localStateRef.current = 'finished';
      setLocalState('finished');
      sfx.win();
      const winnerRole: PlayerRole = mode === 'bot' ? myRole : actor;
      const winnerName = mode === 'bot' ? (myRole === 'cat1' ? p1Name : p2Name) : actor === 'cat1' ? p1Name : p2Name;
      setLocalWinner(`${winnerName} venceu em ${elapsed} ms! (+6 🐾)`);
      onAwardPaws(winnerRole, 6);
      onRecordOutcome?.(
        mode === 'bot' ? { kind: 'solo_win', role: myRole } : { kind: 'pvp_win', winner: actor }
      );
      onAchievementEvent?.(winnerRole, { type: 'reaction_win', timeMs: elapsed });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-3" role="dialog" aria-modal="true">
      <div className="bg-[#fff8ed] max-w-md w-full p-4 sm:p-5 rounded-3xl sketch-border space-y-3 text-center shadow-2xl">
        <div className="flex justify-between items-center border-b border-[#2b1111]/20 pb-2">
          <h2 className="font-display text-2xl font-bold text-red-950">Pata Rápida Stakhanovista ⚡</h2>
          <button type="button" onClick={onClose} aria-label="Fechar Pata Rápida" className="sketch-btn bg-white p-1.5 rounded-xl cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5 bg-amber-100/70 p-1 rounded-xl border border-[#2b1111]/25 text-xs font-bold">
          {(['bot', 'local', 'online'] as MinigamePlayMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                clearTimers();
                setMode(m);
                localStateRef.current = 'idle';
                setLocalState('idle');
                setLocalWinner('');
              }}
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
          <div className="bg-red-100 border-2 border-dashed border-red-500 rounded-2xl p-2 text-xs text-red-950">
            <p className="font-bold">Aguardando outro jogador entrar na sala online...</p>
            <p className="text-[11px] text-red-900/80">Ou jogue imediatamente em “vs Bot” ou “Mesma Tela”!</p>
          </div>
        )}

        {mode === 'local' ? (
          /* Split-screen 2-player reaction arena on same device */
          <div className="space-y-2">
            <button
              type="button"
              onPointerDown={() => handleTap('cat2')}
              className={`w-full h-24 rounded-2xl border-2 border-[#2b1111] font-bold flex flex-col items-center justify-center transition-colors cursor-pointer ${
                curState === 'ready'
                  ? 'bg-amber-300 text-red-950'
                  : curState === 'waiting'
                  ? 'bg-red-100 text-red-900'
                  : 'bg-stone-100 text-[#2b1111]'
              }`}
            >
              <span className="text-xl">{curState === 'ready' ? '🍲⭐ TOQUE AGORA!' : '🚩 ' + p2Name}</span>
              <span className="text-[11px]">Zona Superior (Toque aqui)</span>
            </button>

            <div className="text-xs font-bold py-1 text-red-950">
              {localWinner || (curState === 'waiting' ? 'Espere acender em ouro...' : 'Pressione Iniciar abaixo!')}
            </div>

            <button
              type="button"
              onPointerDown={() => handleTap('cat1')}
              className={`w-full h-24 rounded-2xl border-2 border-[#2b1111] font-bold flex flex-col items-center justify-center transition-colors cursor-pointer ${
                curState === 'ready'
                  ? 'bg-amber-300 text-red-950'
                  : curState === 'waiting'
                  ? 'bg-red-100 text-red-900'
                  : 'bg-stone-100 text-[#2b1111]'
              }`}
            >
              <span className="text-xl">{curState === 'ready' ? '🍲⭐ TOQUE AGORA!' : '⭐ ' + p1Name}</span>
              <span className="text-[11px]">Zona Inferior (Toque aqui)</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onPointerDown={() => handleTap(myRole)}
            className={`w-full h-44 rounded-2xl border-2 border-[#2b1111] flex flex-col items-center justify-center transition-colors cursor-pointer ${
              curState === 'ready'
                ? 'bg-amber-300 text-red-950'
                : curState === 'waiting'
                ? 'bg-red-100 text-red-900'
                : curState === 'finished'
                ? 'bg-emerald-100 text-emerald-950'
                : 'bg-stone-100 text-[#2b1111]'
            }`}
          >
            <span className="text-5xl">
              {curState === 'ready' ? '🍲' : curState === 'finished' ? '🏆' : '🥣'}
            </span>
            <span className="text-sm font-bold mt-2 px-3">
              {curState === 'ready'
                ? 'TOQUE AGORA!! ⚡'
                : curState === 'waiting'
                ? 'Aguarde acender em ouro...'
                : mode === 'online' && onlineRoom.winner
                ? `Vitória de ${onlineRoom.winner === 'cat1' ? p1Name : p2Name}!`
                : localWinner || 'Clique em Iniciar Turno abaixo'}
            </span>
            {(reactionMs !== null || (mode === 'online' && onlineRoom.winnerTimeMs)) && (
              <span className="text-xs font-mono-num mt-1 opacity-80">
                {mode === 'online' ? onlineRoom.winnerTimeMs : reactionMs} ms
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          disabled={(mode === 'online' && !bothOnline) || curState === 'waiting'}
          onClick={startRound}
          className="sketch-btn w-full bg-amber-300 hover:bg-amber-400 text-red-950 py-2.5 rounded-xl font-bold text-xs cursor-pointer"
        >
          {curState === 'waiting' ? 'Aguardando sinal...' : 'Iniciar Turno ⚡'}
        </button>
      </div>
    </div>
  );
};
