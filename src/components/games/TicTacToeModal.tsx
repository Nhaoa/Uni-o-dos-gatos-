import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { MinigamePlayMode, PlayerRole, SharedState } from '../../types/game';
import { checkTicTacToeResult, chooseBestTttMove } from '../../logic/minigames';
import { sfx } from '../../utils/sound';

import { AchievementEvent } from '../../logic/achievements';
import { MatchScoreOutcome } from '../../logic/scores';

interface TicTacToeModalProps {
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

export const TicTacToeModal: React.FC<TicTacToeModalProps> = ({
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
  const [localBoard, setLocalBoard] = useState<string[]>(Array(9).fill(''));
  const [localTurn, setLocalTurn] = useState<PlayerRole>('cat1');
  const [localWinner, setLocalWinner] = useState<string>('');
  const [localWinLine, setLocalWinLine] = useState<number[] | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setLocalBoard(Array(9).fill(''));
    setLocalTurn('cat1');
    setLocalWinner('');
    setLocalWinLine(null);
  }, [initialMode, open]);

  useEffect(() => {
    if (!open || mode !== 'online') return;
    onSendSocket({ type: 'room:join', game: 'tictactoe' });
    return () => {
      onSendSocket({ type: 'room:leave', game: 'tictactoe' });
    };
  }, [open, mode, onSendSocket]);

  // Bot auto-move when mode === 'bot' and turn === 'cat2'
  useEffect(() => {
    if (!open || mode !== 'bot' || localTurn !== 'cat2' || localWinner) return;
    const timer = setTimeout(() => {
      const idx = chooseBestTttMove(localBoard, '🐟', '🐾');
      if (idx === -1) return;
      const next = [...localBoard];
      next[idx] = '🐟';
      const res = checkTicTacToeResult(next);
      setLocalBoard(next);
      if (res.winnerSymbol) {
        sfx.hit();
        setLocalWinner('Autômato Estatal 🤖');
        setLocalWinLine(res.winningLine);
        onRecordOutcome?.({ kind: 'solo_loss', role: myRole });
      } else if (res.isDraw) {
        sfx.bounce();
        setLocalWinner('Empate Coletivo 🤝');
        onAwardPaws(myRole, 4);
        onRecordOutcome?.({ kind: 'tie' });
        onAchievementEvent?.(myRole, { type: 'ttt_draw' });
      } else {
        sfx.move();
        setLocalTurn('cat1');
      }
    }, 380);
    return () => clearTimeout(timer);
  }, [open, mode, localTurn, localWinner, localBoard, onAwardPaws, onRecordOutcome, onAchievementEvent, myRole]);

  if (!open) return null;

  const onlineRoom = state.onlineRooms.tictactoe;
  const bothOnline = onlineRoom.p1InRoom && onlineRoom.p2InRoom;

  const board = mode === 'online' ? onlineRoom.board : localBoard;
  const turn = mode === 'online' ? onlineRoom.turn : localTurn;
  const winner = mode === 'online' ? onlineRoom.winner : localWinner;
  const winLine = mode === 'online' ? onlineRoom.winningLine : localWinLine;

  const p1Name = state.nicknames.cat1 || 'Camarada 1';
  const p2Name = mode === 'bot' ? 'Autômato Estatal' : state.nicknames.cat2 || 'Camarada 2';

  const handleCellClick = (idx: number) => {
    if (winner || board[idx] !== '') return;

    if (mode === 'online') {
      if (!bothOnline || turn !== myRole) return;
      sfx.move();
      onSendSocket({ type: 'ttt:move', index: idx });
      return;
    }

    if (mode === 'bot' && turn !== 'cat1') return;

    const symbol = turn === 'cat1' ? '🐾' : '🐟';
    const next = [...localBoard];
    next[idx] = symbol;
    setLocalBoard(next);

    const res = checkTicTacToeResult(next);
    if (res.winnerSymbol) {
      sfx.win();
      setLocalWinner(turn === 'cat1' ? `${p1Name} ⭐` : `${p2Name} 🚩`);
      setLocalWinLine(res.winningLine);
      if (mode === 'bot') {
        onAwardPaws(myRole, 8);
        onRecordOutcome?.({ kind: 'solo_win', role: myRole });
        onAchievementEvent?.(myRole, { type: 'ttt_win' });
      } else {
        onAwardPaws(turn, 8);
        onRecordOutcome?.({ kind: 'pvp_win', winner: turn });
        onAchievementEvent?.(turn, { type: 'ttt_win' });
      }
    } else if (res.isDraw) {
      sfx.bounce();
      setLocalWinner('Empate Coletivo 🤝');
      if (mode === 'bot') {
        onAwardPaws(myRole, 4);
        onRecordOutcome?.({ kind: 'tie' });
        onAchievementEvent?.(myRole, { type: 'ttt_draw' });
      } else {
        onAwardPaws('cat1', 4);
        onAwardPaws('cat2', 4);
        onRecordOutcome?.({ kind: 'tie' });
        onAchievementEvent?.('cat1', { type: 'ttt_draw' });
        onAchievementEvent?.('cat2', { type: 'ttt_draw' });
      }
    } else {
      sfx.move();
      setLocalTurn(turn === 'cat1' ? 'cat2' : 'cat1');
    }
  };

  const resetGame = () => {
    if (mode === 'online') {
      onSendSocket({ type: 'ttt:reset', starter: 'cat1' });
    } else {
      setLocalBoard(Array(9).fill(''));
      setLocalTurn('cat1');
      setLocalWinner('');
      setLocalWinLine(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-3" role="dialog" aria-modal="true">
      <div className="bg-[#fff8ed] max-w-sm w-full p-4 sm:p-5 rounded-3xl sketch-border space-y-3 text-center shadow-2xl">
        <div className="flex justify-between items-center border-b border-[#2b1111]/20 pb-2">
          <h2 className="font-display text-2xl font-bold text-red-950">Jogo da Velha Coletivo ⭐</h2>
          <button type="button" onClick={onClose} aria-label="Fechar Jogo da Velha" className="sketch-btn bg-white p-1.5 rounded-xl cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5 bg-amber-100/70 p-1 rounded-xl border border-[#2b1111]/25 text-xs font-bold">
          {(['bot', 'local', 'online'] as MinigamePlayMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setLocalBoard(Array(9).fill(''));
                setLocalTurn('cat1');
                setLocalWinner('');
                setLocalWinLine(null);
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
            <p className="text-[11px] text-red-900/80">Ou alterne para “vs Bot” ou “Mesma Tela” acima.</p>
          </div>
        )}

        <div className="flex justify-between items-center text-xs font-bold px-1">
          <span>
            {p1Name}: 🐾 vs {p2Name}: 🐟
          </span>
          <span className="bg-amber-100 px-2.5 py-1 rounded-lg border border-[#2b1111]">
            {winner
              ? winner
              : `Vez: ${turn === 'cat1' ? p1Name : p2Name}`}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 bg-[#d9b38c] p-3 rounded-2xl border-2 border-[#2b1111] max-w-[264px] mx-auto">
          {board.map((cell, idx) => {
            const isWinCell = winLine?.includes(idx);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleCellClick(idx)}
                aria-label={`Casa ${idx + 1}${cell ? `: ${cell}` : ''}`}
                className={`w-18 h-18 sm:w-20 sm:h-20 rounded-xl border-2 border-[#2b1111] font-bold text-3xl flex items-center justify-center transition-transform active:scale-95 cursor-pointer ${
                  isWinCell ? 'bg-amber-300' : 'bg-white hover:bg-amber-50'
                }`}
              >
                {cell}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={resetGame}
            className="sketch-btn bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer"
          >
            Reiniciar Partida
          </button>
          <span className="text-xs font-semibold text-[#2b1111]/75">
            {winner ? 'Partida concluída!' : mode === 'online' && turn !== myRole ? 'Aguardando camarada...' : 'Toque em uma casa!'}
          </span>
        </div>
      </div>
    </div>
  );
};
