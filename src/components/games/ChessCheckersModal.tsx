import React, { useEffect, useMemo, useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import {
  BoardCoord,
  CheckersState,
  ChessPieceType,
  ChessState,
  MinigamePlayMode,
  PieceColor,
  PlayerRole,
  SharedState,
} from '../../types/game';
import {
  applyChessMove,
  chooseBestChessMove,
  createInitialChessState,
  findKing,
  getLegalChessMovesFor,
  isKingInCheck,
} from '../../logic/chess';
import {
  applyCheckersMove,
  chooseBestCheckersMove,
  createInitialCheckersState,
  getAllLegalCheckersMoves,
  getLegalCheckersMovesFor,
  hasAnyMandatoryCapture,
} from '../../logic/checkers';
import { BoardPieceSvg } from '../CatSvg';
import { ViewportOrientation } from '../../hooks/useOrientation';
import { sfx } from '../../utils/sound';

import { AchievementEvent } from '../../logic/achievements';
import { MatchScoreOutcome } from '../../logic/scores';

interface ChessCheckersModalProps {
  open: boolean;
  initialBoardGame: 'chess' | 'checkers';
  initialPlayMode: MinigamePlayMode;
  myRole: PlayerRole;
  state: SharedState;
  vp: ViewportOrientation;
  onClose: () => void;
  onSendSocket: (payload: Record<string, unknown>) => boolean;
  onAwardPaws: (role: PlayerRole, amount: number) => void;
  onRecordOutcome?: (outcome: MatchScoreOutcome) => void;
  onAchievementEvent?: (role: PlayerRole, event: AchievementEvent) => void;
}

export const ChessCheckersModal: React.FC<ChessCheckersModalProps> = ({
  open,
  initialBoardGame,
  initialPlayMode,
  myRole,
  state,
  vp,
  onClose,
  onSendSocket,
  onAwardPaws,
  onRecordOutcome,
  onAchievementEvent,
}) => {
  const [boardGame, setBoardGame] = useState<'chess' | 'checkers'>(initialBoardGame);
  const [playMode, setPlayMode] = useState<MinigamePlayMode>(initialPlayMode);
  const [colorAssignment, setColorAssignment] = useState<'cat1_white' | 'cat2_white'>('cat1_white');

  // Local / Bot states (decoupled from online room so you can play immediately!)
  const [localChess, setLocalChess] = useState<ChessState>(createInitialChessState);
  const [localCheckers, setLocalCheckers] = useState<CheckersState>(createInitialCheckersState);

  const [selected, setSelected] = useState<BoardCoord | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: BoardCoord;
    to: BoardCoord;
  } | null>(null);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    if (!open) return;
    setBoardGame(initialBoardGame);
    setPlayMode(initialPlayMode);
    setSelected(null);
    setPendingPromotion(null);
  }, [open, initialBoardGame, initialPlayMode]);

  useEffect(() => {
    if (!open || playMode !== 'online') return;
    onSendSocket({ type: 'room:join', game: boardGame });
    return () => {
      onSendSocket({ type: 'room:leave', game: boardGame });
    };
  }, [open, playMode, boardGame, onSendSocket]);

  const activeChess: ChessState =
    playMode === 'online' ? state.boardGames.chess.state : localChess;
  const activeCheckers: CheckersState =
    playMode === 'online' ? state.boardGames.checkers.state : localCheckers;
  const onlineConfig =
    boardGame === 'chess' ? state.boardGames.chess.config : state.boardGames.checkers.config;

  const activeAssignment =
    playMode === 'online' ? onlineConfig.colorAssignment : colorAssignment;

  const myColor: PieceColor = useMemo(() => {
    const isCat1White = activeAssignment === 'cat1_white';
    if (playMode === 'bot') {
      // In Bot mode, human plays the color assigned to their role (default white)
      return myRole === 'cat1'
        ? isCat1White
          ? 'white'
          : 'black'
        : isCat1White
        ? 'black'
        : 'white';
    }
    return myRole === 'cat1'
      ? isCat1White
        ? 'white'
        : 'black'
      : isCat1White
      ? 'black'
      : 'white';
  }, [activeAssignment, playMode, myRole]);

  const botColor: PieceColor = myColor === 'white' ? 'black' : 'white';

  // Automatic Bot turn execution for Chess & Checkers
  useEffect(() => {
    if (!open || playMode !== 'bot') return;

    if (boardGame === 'chess') {
      if (
        activeChess.turn === botColor &&
        (activeChess.status === 'playing' || activeChess.status === 'check')
      ) {
        const timer = setTimeout(() => {
          const move = chooseBestChessMove(activeChess, 2);
          if (!move) return;
          const next = applyChessMove(activeChess, move, 'Autômato');
          setLocalChess(next);
          if (next.status === 'checkmate') {
            sfx.hit();
            onRecordOutcome?.({ kind: 'solo_loss', role: myRole });
          } else if (next.status === 'stalemate' || next.status === 'draw') {
            sfx.bounce();
            onRecordOutcome?.({ kind: 'tie' });
          } else if (next.status === 'check') sfx.check();
          else if (move.isCapture) sfx.capture();
          else sfx.move();
        }, 360);
        return () => clearTimeout(timer);
      }
    } else {
      if (activeCheckers.turn === botColor && activeCheckers.status === 'playing') {
        const timer = setTimeout(() => {
          const move = chooseBestCheckersMove(activeCheckers, 4);
          if (!move) return;
          const next = applyCheckersMove(activeCheckers, move, 'Autômato');
          setLocalCheckers(next);
          if (next.status === 'finished') {
            if (next.winner === 'draw') {
              sfx.bounce();
              onRecordOutcome?.({ kind: 'tie' });
            } else {
              sfx.hit();
              onRecordOutcome?.({ kind: 'solo_loss', role: myRole });
            }
          } else if (move.capture) sfx.capture();
          else sfx.move();
        }, 380);
        return () => clearTimeout(timer);
      }
    }
  }, [open, playMode, boardGame, activeChess, activeCheckers, botColor, myRole, onRecordOutcome]);

  // Auto-select forced continuation piece in Checkers multi-jump
  useEffect(() => {
    if (boardGame === 'checkers' && activeCheckers.mustContinueFrom) {
      setSelected(activeCheckers.mustContinueFrom);
    }
  }, [boardGame, activeCheckers.mustContinueFrom]);

  if (!open) return null;

  const p1Name = state.nicknames.cat1 || 'Camarada 1';
  const p2Name = playMode === 'bot' ? 'Autômato Estatal' : state.nicknames.cat2 || 'Camarada 2';
  const whiteName = activeAssignment === 'cat1_white' ? p1Name : p2Name;
  const blackName = activeAssignment === 'cat1_white' ? p2Name : p1Name;

  const currentTurn: PieceColor =
    boardGame === 'chess' ? activeChess.turn : activeCheckers.turn;
  const bothOnline = onlineConfig.p1InRoom && onlineConfig.p2InRoom;

  const canHumanMoveColor = (color: PieceColor): boolean => {
    if (playMode === 'local') return true;
    if (playMode === 'bot') return color === myColor;
    return color === myColor;
  };

  // Compute legal targets for currently selected piece
  const legalTargets = (() => {
    if (!selected) return [];
    if (boardGame === 'chess') {
      return getLegalChessMovesFor(activeChess, selected.r, selected.c);
    }
    return getLegalCheckersMovesFor(activeCheckers, selected.r, selected.c);
  })();

  const mandatoryCheckersPieces = useMemo(() => {
    if (boardGame !== 'checkers') return new Set<string>();
    const moves = getAllLegalCheckersMoves(activeCheckers);
    const hasCap = moves.some((m) => Boolean(m.capture));
    const set = new Set<string>();
    if (hasCap) {
      moves.forEach((m) => set.add(`${m.from.r},${m.from.c}`));
    }
    return set;
  }, [boardGame, activeCheckers]);

  const kingInCheckPos = useMemo(() => {
    if (boardGame !== 'chess') return null;
    if (isKingInCheck(activeChess.board, activeChess.turn)) {
      return findKing(activeChess.board, activeChess.turn);
    }
    return null;
  }, [boardGame, activeChess]);

  const roleForColor = (color: PieceColor): PlayerRole => {
    const isCat1White = activeAssignment === 'cat1_white';
    if (color === 'white') return isCat1White ? 'cat1' : 'cat2';
    return isCat1White ? 'cat2' : 'cat1';
  };

  const executeChessMoveChoice = (
    from: BoardCoord,
    to: BoardCoord,
    promotion?: ChessPieceType
  ) => {
    if (playMode === 'online') {
      onSendSocket({
        type: 'boardgame:move',
        game: 'chess',
        move: { from, to, promotion },
      });
      sfx.move();
    } else {
      const actorRole = playMode === 'bot' ? myRole : roleForColor(currentTurn);
      const actor = currentTurn === 'white' ? whiteName : blackName;
      const next = applyChessMove(activeChess, { from, to, promotion }, actor);
      setLocalChess(next);
      if (promotion) {
        onAchievementEvent?.(actorRole, { type: 'chess_promotion' });
      }
      if (next.status === 'checkmate') {
        sfx.win();
        onAwardPaws(actorRole, 12);
        onRecordOutcome?.(
          playMode === 'bot' ? { kind: 'solo_win', role: myRole } : { kind: 'pvp_win', winner: actorRole }
        );
        onAchievementEvent?.(actorRole, {
          type: 'chess_win',
          moveCount: next.moveHistory.length,
        });
      } else if (next.status === 'stalemate' || next.status === 'draw') {
        sfx.bounce();
        onRecordOutcome?.({ kind: 'tie' });
      } else if (next.status === 'check') {
        sfx.check();
      } else if (activeChess.board[to.r][to.c]) {
        sfx.capture();
      } else {
        sfx.move();
      }
    }
    setSelected(null);
    setPendingPromotion(null);
  };

  const handleSquareClick = (r: number, c: number) => {
    if (boardGame === 'chess') {
      if (
        activeChess.status === 'checkmate' ||
        activeChess.status === 'stalemate' ||
        activeChess.status === 'draw'
      ) {
        return;
      }

      if (selected) {
        const matched = legalTargets.find((m) => m.to.r === r && m.to.c === c);
        if (matched) {
          const movingPiece = activeChess.board[selected.r][selected.c];
          if (movingPiece?.piece === 'p' && (r === 0 || r === 7)) {
            setPendingPromotion({ from: selected, to: { r, c } });
            return;
          }
          executeChessMoveChoice(selected, { r, c });
          return;
        }
      }

      const sq = activeChess.board[r][c];
      if (sq && sq.color === activeChess.turn && canHumanMoveColor(sq.color)) {
        setSelected({ r, c });
      } else {
        setSelected(null);
      }
    } else {
      // Checkers
      if (activeCheckers.status === 'finished') return;

      if (selected) {
        const matched = legalTargets.find((m) => m.to.r === r && m.to.c === c);
        if (matched) {
          if (playMode === 'online') {
            onSendSocket({
              type: 'boardgame:move',
              game: 'checkers',
              move: { from: selected, to: { r, c } },
            });
            sfx.move();
          } else {
            const actorRole = playMode === 'bot' ? myRole : roleForColor(currentTurn);
            const actor = currentTurn === 'white' ? whiteName : blackName;
            const next = applyCheckersMove(
              activeCheckers,
              { from: selected, to: { r, c } },
              actor
            );
            setLocalCheckers(next);
            if (next.mustContinueFrom) {
              onAchievementEvent?.(actorRole, { type: 'checkers_multi_capture' });
            }
            if (next.status === 'finished') {
              if (next.winner === 'draw') {
                sfx.bounce();
                onRecordOutcome?.({ kind: 'tie' });
              } else {
                sfx.win();
                onAwardPaws(actorRole, 12);
                onRecordOutcome?.(
                  playMode === 'bot'
                    ? { kind: 'solo_win', role: myRole }
                    : { kind: 'pvp_win', winner: actorRole }
                );
                onAchievementEvent?.(actorRole, { type: 'checkers_win' });
              }
            } else if ('capture' in matched && matched.capture) {
              sfx.capture();
            } else {
              sfx.move();
            }
          }
          setSelected(null);
          return;
        }
      }

      // If locked into a multi-jump continuation, keep that piece selected
      if (activeCheckers.mustContinueFrom) {
        setSelected(activeCheckers.mustContinueFrom);
        return;
      }

      const sq = activeCheckers.board[r][c];
      if (sq && sq.color === activeCheckers.turn && canHumanMoveColor(sq.color)) {
        setSelected({ r, c });
      } else {
        setSelected(null);
      }
    }
  };

  const resetBoard = () => {
    setSelected(null);
    setPendingPromotion(null);
    if (playMode === 'online') {
      onSendSocket({ type: 'boardgame:reset', game: boardGame });
    } else if (boardGame === 'chess') {
      setLocalChess(createInitialChessState());
    } else {
      setLocalCheckers(createInitialCheckersState());
    }
  };

  const handleBoardChat = (e: React.FormEvent) => {
    e.preventDefault();
    const txt = chatInput.trim();
    if (!txt) return;
    onSendSocket({ type: 'boardgame:chat', game: boardGame, text: txt });
    setChatInput('');
  };

  const isLandscape = vp.orientation === 'landscape';
  const history = boardGame === 'chess' ? activeChess.moveHistory : activeCheckers.moveHistory;
  const isMandatoryActive =
    boardGame === 'checkers' && hasAnyMandatoryCapture(activeCheckers);

  const statusText = (() => {
    if (boardGame === 'chess') {
      if (activeChess.status === 'checkmate') {
        const w = activeChess.winner === 'white' ? whiteName : blackName;
        return `XEQUE-MATE! Vitória de ${w}! 🏆`;
      }
      if (activeChess.status === 'stalemate') return 'EMPATE por Afogamento!';
      if (activeChess.status === 'draw') return 'EMPATE técnico!';
      const turnOwner = activeChess.turn === 'white' ? whiteName : blackName;
      if (activeChess.status === 'check') {
        return `⚠️ XEQUE! Vez de ${turnOwner} (${activeChess.turn === 'white' ? 'Brancas' : 'Pretas'})`;
      }
      return `Vez de ${turnOwner} (${activeChess.turn === 'white' ? 'Brancas' : 'Pretas'})`;
    } else {
      if (activeCheckers.status === 'finished') {
        const w = activeCheckers.winner === 'white' ? whiteName : blackName;
        return `Vitória de ${w}! 🏆`;
      }
      const turnOwner = activeCheckers.turn === 'white' ? whiteName : blackName;
      if (activeCheckers.mustContinueFrom) {
        return `🔥 CAPTURA MÚLTIPLA! Continue com a mesma peça (${turnOwner})`;
      }
      if (isMandatoryActive) {
        return `⚠️ CAPTURA OBRIGATÓRIA! Vez de ${turnOwner}`;
      }
      return `Vez de ${turnOwner} (${activeCheckers.turn === 'white' ? 'Brancas' : 'Pretas'})`;
    }
  })();

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  return (
    <div
      className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-1.5 sm:p-3"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-[#fff8ed] w-full rounded-3xl sketch-border shadow-2xl flex flex-col max-h-[97dvh] overflow-hidden ${
          isLandscape ? 'max-w-5xl p-2.5 sm:p-4 gap-2' : 'max-w-lg p-3 sm:p-4 gap-2'
        }`}
      >
        {/* Top Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2b1111]/15 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex bg-stone-100 p-0.5 rounded-xl border border-[#2b1111] text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setBoardGame('chess');
                  setSelected(null);
                  setPendingPromotion(null);
                }}
                className={`px-2.5 py-1 rounded-lg cursor-pointer whitespace-nowrap ${
                  boardGame === 'chess' ? 'bg-amber-300 text-red-950' : 'text-[#2b1111]/70'
                }`}
              >
                ♟️ Xadrez
              </button>
              <button
                type="button"
                onClick={() => {
                  setBoardGame('checkers');
                  setSelected(null);
                  setPendingPromotion(null);
                }}
                className={`px-2.5 py-1 rounded-lg cursor-pointer whitespace-nowrap ${
                  boardGame === 'checkers' ? 'bg-amber-300 text-red-950' : 'text-[#2b1111]/70'
                }`}
              >
                ⚪ Damas
              </button>
            </div>

            <div className="flex bg-stone-100 p-0.5 rounded-xl border border-[#2b1111] text-xs font-bold">
              {(['bot', 'local', 'online'] as MinigamePlayMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setPlayMode(m);
                    setSelected(null);
                  }}
                  className={`px-2 py-1 rounded-lg cursor-pointer whitespace-nowrap ${
                    playMode === m ? 'bg-amber-300 text-red-950' : 'text-[#2b1111]/70'
                  }`}
                >
                  {m === 'bot' ? '🤖 Bot' : m === 'local' ? '👥 Local' : '🌐 Online'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <select
              aria-label="Ordem das peças"
              value={activeAssignment}
              onChange={(e) => {
                const val = e.target.value as 'cat1_white' | 'cat2_white';
                if (playMode === 'online') {
                  onSendSocket({
                    type: 'boardgame:config',
                    game: boardGame,
                    config: { colorAssignment: val },
                  });
                } else {
                  setColorAssignment(val);
                }
              }}
              className="bg-white border border-[#2b1111] rounded-xl px-2 py-1 text-[11px] font-bold"
            >
              <option value="cat1_white">Brancas: {p1Name}</option>
              <option value="cat2_white">Brancas: {p2Name}</option>
            </select>

            <button
              type="button"
              onClick={resetBoard}
              className="sketch-btn bg-red-100 hover:bg-red-200 text-red-950 px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reiniciar</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar tabuleiro"
              className="sketch-btn bg-white p-1.5 rounded-xl cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Adaptive Content: Side-by-side in Landscape, Stacked in Portrait */}
        <div
          className={`flex-1 min-h-0 flex ${
            isLandscape ? 'flex-row gap-3 items-start justify-center' : 'flex-col gap-2 items-center overflow-y-auto'
          }`}
        >
          {/* Board Column */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div
              className={`w-full px-3 py-1.5 rounded-xl border-2 border-[#2b1111] text-center text-xs font-bold ${
                currentTurn === 'white'
                  ? 'bg-amber-100 text-amber-950'
                  : 'bg-red-100 text-red-950'
              }`}
            >
              {statusText}
            </div>

            {playMode === 'online' && !bothOnline && (
              <div className="w-full bg-amber-50 border border-[#2b1111]/40 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-center text-red-900">
                Salão Online: {onlineConfig.p1InRoom ? '🟢' : '⚪'} {p1Name} ·{' '}
                {onlineConfig.p2InRoom ? '🟢' : '⚪'} {p2Name}
              </div>
            )}

            {/* 8x8 Responsive Board */}
            <div
              data-testid="board-grid"
              className="border-4 border-[#2b1111] rounded-2xl overflow-hidden grid grid-cols-8 grid-rows-8 bg-[#991b1b] shadow-lg select-none relative"
              style={{
                width: isLandscape ? 'min(64dvh, 46vw, 430px)' : 'min(90vw, 48dvh, 390px)',
                height: isLandscape ? 'min(64dvh, 46vw, 430px)' : 'min(90vw, 48dvh, 390px)',
              }}
            >
              {Array.from({ length: 8 }).map((_, r) =>
                Array.from({ length: 8 }).map((__, c) => {
                  const isLight = (r + c) % 2 === 0;
                  const isSelected = selected?.r === r && selected?.c === c;
                  const targetMove = legalTargets.find((m) => m.to.r === r && m.to.c === c);
                  const isMandatoryOrigin = mandatoryCheckersPieces.has(`${r},${c}`);
                  const isCheckedKing =
                    kingInCheckPos?.r === r && kingInCheckPos?.c === c;

                  const chessSq = boardGame === 'chess' ? activeChess.board[r][c] : null;
                  const checkersSq =
                    boardGame === 'checkers' ? activeCheckers.board[r][c] : null;
                  const piece = chessSq || checkersSq;

                  const lastMove =
                    boardGame === 'chess' ? activeChess.lastMove : activeCheckers.lastMove;
                  const isLastSquare =
                    (lastMove?.from.r === r && lastMove?.from.c === c) ||
                    (lastMove?.to.r === r && lastMove?.to.c === c);

                  return (
                    <button
                      key={`${r}-${c}`}
                      type="button"
                      onClick={() => handleSquareClick(r, c)}
                      aria-label={`Casa ${files[c]}${8 - r}`}
                      className={`w-full h-full flex items-center justify-center relative cursor-pointer p-0.5 ${
                        isSelected
                          ? 'bg-yellow-300'
                          : isCheckedKing
                          ? 'bg-rose-400 ring-2 ring-inset ring-red-900'
                          : isLastSquare
                          ? isLight
                            ? 'bg-amber-100'
                            : 'bg-red-800'
                          : isLight
                          ? 'bg-[#fff8ed]'
                          : 'bg-[#991b1b]'
                      }`}
                    >
                      {/* Coordinate labels on edge */}
                      {c === 0 && (
                        <span
                          className={`absolute top-0.5 left-0.5 text-[9px] font-mono-num font-bold leading-none pointer-events-none ${
                            isLight ? 'text-[#2b1111]/45' : 'text-amber-100/55'
                          }`}
                        >
                          {8 - r}
                        </span>
                      )}
                      {r === 7 && (
                        <span
                          className={`absolute bottom-0.5 right-0.5 text-[9px] font-mono-num font-bold leading-none pointer-events-none ${
                            isLight ? 'text-[#2b1111]/45' : 'text-amber-100/55'
                          }`}
                        >
                          {files[c]}
                        </span>
                      )}

                      {isMandatoryOrigin && !isSelected && (
                        <span className="absolute inset-0.5 rounded-lg border-2 border-amber-300 pointer-events-none" />
                      )}

                      {piece && (
                        <BoardPieceSvg
                          mode={boardGame}
                          piece={piece.piece}
                          color={piece.color}
                        />
                      )}

                      {targetMove && (
                        <span
                          className={`pointer-events-none absolute rounded-full ${
                            ('isCapture' in targetMove && targetMove.isCapture) ||
                            ('capture' in targetMove && targetMove.capture) ||
                            piece
                              ? 'w-[78%] h-[78%] border-[3px] border-dashed border-amber-300'
                              : 'w-3.5 h-3.5 bg-amber-300 border border-[#2b1111]'
                          }`}
                        />
                      )}
                    </button>
                  );
                })
              )}

              {/* Chess Pawn Promotion Picker Overlay */}
              {pendingPromotion && (
                <div className="absolute inset-0 bg-black/65 flex items-center justify-center p-3 z-20">
                  <div className="bg-[#fff8ed] border-2 border-[#2b1111] rounded-2xl p-3 text-center space-y-2 shadow-xl">
                    <p className="text-xs font-bold text-red-950">Promover Peão para:</p>
                    <div className="grid grid-cols-4 gap-2">
                      {(
                        [
                          { p: 'q', label: 'Dama' },
                          { p: 'r', label: 'Torre' },
                          { p: 'b', label: 'Bispo' },
                          { p: 'n', label: 'Cavalo' },
                        ] as { p: ChessPieceType; label: string }[]
                      ).map((opt) => (
                        <button
                          key={opt.p}
                          type="button"
                          onClick={() =>
                            executeChessMoveChoice(
                              pendingPromotion.from,
                              pendingPromotion.to,
                              opt.p
                            )
                          }
                          className="sketch-btn bg-white hover:bg-amber-100 p-2 rounded-xl flex flex-col items-center cursor-pointer"
                        >
                          <div className="w-9 h-9">
                            <BoardPieceSvg mode="chess" piece={opt.p} color={currentTurn} />
                          </div>
                          <span className="text-[10px] font-bold mt-1">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Side Panel: Move History & Match Chat */}
          <div
            className={`flex flex-col gap-2 min-h-0 ${
              isLandscape ? 'flex-1 h-[68dvh] max-h-[430px]' : 'w-full max-w-[390px]'
            }`}
          >
            <div className="bg-white border-2 border-[#2b1111] rounded-2xl p-2.5 flex flex-col flex-1 min-h-[110px]">
              <div className="flex items-center justify-between border-b border-[#2b1111]/15 pb-1 text-xs font-bold">
                <span>📜 Atas ({boardGame === 'chess' ? 'Xadrez' : 'Damas'})</span>
                <span className="font-mono-num text-[11px] text-red-800">
                  {history.length} lances
                </span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scroll py-1 space-y-0.5 text-[11px] font-mono-num">
                {history.length === 0 ? (
                  <p className="text-[#2b1111]/50 italic text-center py-4 font-sans">
                    Nenhum movimento realizado ainda.
                  </p>
                ) : (
                  history.map((m, idx) => (
                    <div key={idx} className="px-1.5 py-0.5 rounded hover:bg-amber-50 flex gap-1.5">
                      <span className="text-[#2b1111]/45">{idx + 1}.</span>
                      <span className="font-sans font-medium">{m}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {playMode === 'online' && (
              <div className="bg-white border-2 border-[#2b1111] rounded-2xl p-2.5 flex flex-col h-36 sm:h-44">
                <span className="text-xs font-bold border-b border-[#2b1111]/15 pb-1 mb-1">
                  💬 Rádio da Partida
                </span>
                <div className="flex-1 overflow-y-auto custom-scroll space-y-1 text-xs mb-1.5">
                  {onlineConfig.chatMessages.map((msg) => (
                    <div key={msg.id} className="bg-amber-50 border border-amber-300 rounded-lg px-2 py-1">
                      <span className="text-[10px] font-bold text-red-900">
                        {msg.author} · {msg.time}:{' '}
                      </span>
                      <span>{msg.text}</span>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleBoardChat} className="flex gap-1.5">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Mensagem..."
                    maxLength={100}
                    className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-[#2b1111] bg-[#fff8ed]"
                  />
                  <button
                    type="submit"
                    className="sketch-btn bg-red-700 text-amber-100 text-xs font-bold px-2.5 py-1 rounded-lg cursor-pointer"
                  >
                    Enviar
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
