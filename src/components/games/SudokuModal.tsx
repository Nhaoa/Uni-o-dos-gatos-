import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eraser, Lightbulb, Pencil, RotateCcw, Trophy, Undo2, Users, X } from 'lucide-react';
import {
  PlayerRole,
  SharedState,
  SudokuDifficulty,
  SudokuSize,
  SudokuSoloMode,
} from '../../types/game';
import {
  computeSudokuReward,
  countCorrectFilledCells,
  generateSudokuPuzzle,
  getBoxDimensions,
  getRelatedIndices,
  getRemainingCounts,
  getTimedModeSeconds,
  isSudokuSolved,
} from '../../logic/sudoku';
import { AchievementEvent } from '../../logic/achievements';
import { MatchScoreOutcome } from '../../logic/scores';
import { sfx } from '../../utils/sound';

interface SudokuModalProps {
  open: boolean;
  initialMode?: 'bot' | 'local' | 'online';
  myRole: PlayerRole;
  state: SharedState;
  onClose: () => void;
  onSendSocket: (payload: Record<string, unknown>) => boolean;
  onAwardPaws: (role: PlayerRole, amount: number) => void;
  onRecordOutcome?: (outcome: MatchScoreOutcome) => void;
  onAchievementEvent?: (role: PlayerRole, event: AchievementEvent) => void;
}

const DIFF_LABELS: Record<SudokuDifficulty, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
  expert: 'Especialista',
};

const SOLO_MODE_LABELS: Record<SudokuSoloMode, string> = {
  classic: 'Clássico (3 Erros)',
  zen: 'Zen (Livre)',
  timed: 'Contra o Tempo',
};

interface UndoSnapshot {
  board: number[];
  notes: Record<number, number[]>;
}

function formatSec(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = String(Math.floor(safe / 60)).padStart(2, '0');
  const s = String(safe % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export const SudokuModal: React.FC<SudokuModalProps> = ({
  open,
  initialMode = 'bot',
  myRole,
  state,
  onClose,
  onSendSocket,
  onAwardPaws,
  onRecordOutcome,
  onAchievementEvent,
}) => {
  const [playType, setPlayType] = useState<'solo' | 'online'>(
    initialMode === 'online' ? 'online' : 'solo'
  );
  const [size, setSize] = useState<SudokuSize>(9);
  const [difficulty, setDifficulty] = useState<SudokuDifficulty>('medium');
  const [soloMode, setSoloMode] = useState<SudokuSoloMode>('classic');

  const [puzzle, setPuzzle] = useState<number[]>([]);
  const [solution, setSolution] = useState<number[]>([]);
  const [board, setBoard] = useState<number[]>([]);
  const [notes, setNotes] = useState<Record<number, number[]>>({});
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [noteMode, setNoteMode] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [timeLimitSec, setTimeLimitSec] = useState(0);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [lastErrorIdx, setLastErrorIdx] = useState<number | null>(null);
  const lastOnlineMatchIdRef = useRef<number>(0);

  const onlineRoom = state.onlineRooms.sudoku;
  const partnerRole: PlayerRole = myRole === 'cat1' ? 'cat2' : 'cat1';
  const myNick = state.nicknames[myRole] || (myRole === 'cat1' ? 'Jogador 1' : 'Jogador 2');
  const partnerNick =
    state.nicknames[partnerRole] || (partnerRole === 'cat1' ? 'Jogador 1' : 'Jogador 2');

  const startSoloPuzzle = useCallback(
    (nextSize: SudokuSize, nextDiff: SudokuDifficulty, nextSoloMode: SudokuSoloMode) => {
      const generated = generateSudokuPuzzle(nextSize, nextDiff);
      setPuzzle(generated.puzzle);
      setSolution(generated.solution);
      setBoard([...generated.puzzle]);
      setNotes({});
      setUndoStack([]);
      setSelectedIdx(generated.puzzle.findIndex((v) => v === 0));
      setMistakes(0);
      setElapsedSec(0);
      setTimeLimitSec(nextSoloMode === 'timed' ? getTimedModeSeconds(nextSize, nextDiff) : 0);
      setStatus('playing');
      setRewardClaimed(false);
      setLastErrorIdx(null);
    },
    []
  );

  // Reset mode when opened
  useEffect(() => {
    if (!open) return;
    const isOnline = initialMode === 'online';
    setPlayType(isOnline ? 'online' : 'solo');
    if (!isOnline) {
      startSoloPuzzle(size, difficulty, soloMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialMode]);

  // Join / Leave server Sudoku room when in Online mode
  useEffect(() => {
    if (!open || playType !== 'online') return;
    onSendSocket({ type: 'room:join', game: 'sudoku' });
    return () => {
      onSendSocket({ type: 'room:leave', game: 'sudoku' });
    };
  }, [open, playType, onSendSocket]);

  // Hydrate board when server starts a new online Sudoku match
  useEffect(() => {
    if (!open || playType !== 'online' || !onlineRoom) return;
    if (onlineRoom.status === 'playing' && onlineRoom.matchId !== lastOnlineMatchIdRef.current) {
      lastOnlineMatchIdRef.current = onlineRoom.matchId;
      setSize(onlineRoom.size);
      setDifficulty(onlineRoom.difficulty);
      setPuzzle([...onlineRoom.puzzle]);
      setSolution([...onlineRoom.solution]);
      setBoard([...onlineRoom.puzzle]);
      setNotes({});
      setUndoStack([]);
      setSelectedIdx(onlineRoom.puzzle.findIndex((v) => v === 0));
      setMistakes(0);
      setElapsedSec(0);
      setStatus('playing');
      setRewardClaimed(false);
      setLastErrorIdx(null);
      sfx.select();
    } else if (onlineRoom.status === 'finished' && onlineRoom.winner) {
      setStatus(onlineRoom.winner === myRole ? 'won' : 'lost');
    } else if (onlineRoom.status === 'lobby') {
      lastOnlineMatchIdRef.current = onlineRoom.matchId;
    }
  }, [open, playType, onlineRoom, myRole]);

  // Solo / Online timer
  useEffect(() => {
    if (!open || status !== 'playing') return;
    if (playType === 'online' && onlineRoom?.status !== 'playing') return;
    const iv = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(iv);
  }, [open, status, playType, onlineRoom?.status]);

  // Trigger timed loss cleanly when solo timer reaches limit
  useEffect(() => {
    if (!open || playType !== 'solo' || soloMode !== 'timed' || status !== 'playing' || timeLimitSec <= 0) {
      return;
    }
    if (elapsedSec >= timeLimitSec) {
      setStatus('lost');
      sfx.error();
      onRecordOutcome?.({ kind: 'solo_loss', role: myRole });
    }
  }, [open, playType, soloMode, status, timeLimitSec, elapsedSec, myRole, onRecordOutcome]);

  const activeSize: SudokuSize = playType === 'online' && onlineRoom?.status === 'playing' ? onlineRoom.size : size;
  const activeDifficulty: SudokuDifficulty =
    playType === 'online' && onlineRoom?.status === 'playing' ? onlineRoom.difficulty : difficulty;

  const remainingCounts = useMemo(
    () => getRemainingCounts(board, activeSize),
    [board, activeSize]
  );

  const relatedIndices = useMemo(
    () => (selectedIdx !== null ? getRelatedIndices(activeSize, selectedIdx) : new Set<number>()),
    [activeSize, selectedIdx]
  );

  const selectedValue = selectedIdx !== null ? board[selectedIdx] || 0 : 0;

  const commitCellValue = useCallback(
    (num: number) => {
      if (status !== 'playing' || selectedIdx === null) return;
      if (playType === 'online' && onlineRoom?.status !== 'playing') return;
      if (puzzle[selectedIdx] !== 0) return;

      if (noteMode && num !== 0) {
        setUndoStack((prev) => [...prev.slice(-24), { board: [...board], notes: { ...notes } }]);
        setNotes((prev) => {
          const cur = prev[selectedIdx] || [];
          const nextCellNotes = cur.includes(num)
            ? cur.filter((n) => n !== num)
            : [...cur, num].sort((a, b) => a - b);
          return { ...prev, [selectedIdx]: nextCellNotes };
        });
        sfx.pencilNote();
        return;
      }

      if (board[selectedIdx] === num) return;

      setUndoStack((prev) => [...prev.slice(-24), { board: [...board], notes: { ...notes } }]);
      const nextBoard = [...board];
      nextBoard[selectedIdx] = num;
      setBoard(nextBoard);

      if (num === 0) {
        sfx.select();
        return;
      }

      const nextNotes = { ...notes };
      delete nextNotes[selectedIdx];
      // Automatically clean same candidate in related cells when placing correct value
      const isCorrect = solution[selectedIdx] === num;
      if (isCorrect) {
        for (const rel of getRelatedIndices(activeSize, selectedIdx)) {
          if (nextNotes[rel]?.includes(num)) {
            nextNotes[rel] = nextNotes[rel].filter((n) => n !== num);
          }
        }
      }
      setNotes(nextNotes);

      let nextMistakes = mistakes;
      if (!isCorrect) {
        nextMistakes = mistakes + 1;
        setMistakes(nextMistakes);
        setLastErrorIdx(selectedIdx);
        window.setTimeout(() => setLastErrorIdx((cur) => (cur === selectedIdx ? null : cur)), 500);
        sfx.sudokuError();
        if (playType === 'solo' && soloMode === 'classic' && nextMistakes >= 3) {
          setStatus('lost');
          onRecordOutcome?.({ kind: 'solo_loss', role: myRole });
        }
      } else {
        sfx.sudokuPlace();
      }

      const solved = isSudokuSolved(nextBoard, solution);
      if (playType === 'online' && onlineRoom) {
        const prog = countCorrectFilledCells(nextBoard, puzzle, solution);
        onSendSocket({
          type: 'sudoku:progress',
          matchId: onlineRoom.matchId,
          filled: prog.filled,
          mistakes: nextMistakes,
          finished: solved,
        });
      }

      if (solved) {
        setStatus('won');
        sfx.win();
        if (playType === 'solo' && !rewardClaimed) {
          setRewardClaimed(true);
          const reward = computeSudokuReward(activeSize, activeDifficulty, false);
          onAwardPaws(myRole, reward);
          onRecordOutcome?.({ kind: 'solo_win', role: myRole });
          onAchievementEvent?.(myRole, {
            type: 'sudoku_win',
            size: activeSize,
            difficulty: activeDifficulty,
            online: false,
          });
        }
      }
    },
    [
      status,
      selectedIdx,
      playType,
      onlineRoom,
      puzzle,
      noteMode,
      board,
      notes,
      solution,
      activeSize,
      mistakes,
      soloMode,
      rewardClaimed,
      activeDifficulty,
      myRole,
      onAwardPaws,
      onRecordOutcome,
      onAchievementEvent,
      onSendSocket,
    ]
  );

  const handleUndo = useCallback(() => {
    if (status !== 'playing' || undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setBoard(prev.board);
    setNotes(prev.notes);
    sfx.select();
  }, [status, undoStack]);

  const handleHint = useCallback(() => {
    if (status !== 'playing') return;
    if (playType === 'online' && onlineRoom?.status !== 'playing') return;
    const candidates = board
      .map((val, idx) => (puzzle[idx] === 0 && val !== solution[idx] ? idx : -1))
      .filter((idx) => idx >= 0);
    if (candidates.length === 0) return;
    const pickIdx =
      selectedIdx !== null && candidates.includes(selectedIdx)
        ? selectedIdx
        : candidates[Math.floor(Math.random() * candidates.length)];
    const val = solution[pickIdx];
    const nextBoard = [...board];
    nextBoard[pickIdx] = val;
    setUndoStack((prev) => [...prev.slice(-24), { board: [...board], notes: { ...notes } }]);
    setBoard(nextBoard);
    setSelectedIdx(pickIdx);
    sfx.sudokuPlace();

    const solved = isSudokuSolved(nextBoard, solution);
    if (playType === 'online' && onlineRoom) {
      const prog = countCorrectFilledCells(nextBoard, puzzle, solution);
      onSendSocket({
        type: 'sudoku:progress',
        matchId: onlineRoom.matchId,
        filled: prog.filled,
        mistakes,
        finished: solved,
      });
    }
    if (solved) {
      setStatus('won');
      sfx.win();
      if (playType === 'solo' && !rewardClaimed) {
        setRewardClaimed(true);
        const reward = computeSudokuReward(activeSize, activeDifficulty, false);
        onAwardPaws(myRole, reward);
        onRecordOutcome?.({ kind: 'solo_win', role: myRole });
        onAchievementEvent?.(myRole, {
          type: 'sudoku_win',
          size: activeSize,
          difficulty: activeDifficulty,
          online: false,
        });
      }
    }
  }, [
    status,
    playType,
    onlineRoom,
    board,
    puzzle,
    solution,
    selectedIdx,
    notes,
    mistakes,
    rewardClaimed,
    activeSize,
    activeDifficulty,
    myRole,
    onAwardPaws,
    onRecordOutcome,
    onAchievementEvent,
    onSendSocket,
  ]);

  // Keyboard support
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const k = e.key.toLowerCase();
      if (k === 'n') {
        setNoteMode((v) => !v);
        sfx.select();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && k === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        commitCellValue(0);
        return;
      }
      const num = Number(e.key);
      if (num >= 1 && num <= activeSize) {
        commitCellValue(num);
        return;
      }
      if (selectedIdx !== null && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        e.preventDefault();
        const r = Math.floor(selectedIdx / activeSize);
        const c = selectedIdx % activeSize;
        const nr =
          k === 'arrowup' ? (r - 1 + activeSize) % activeSize : k === 'arrowdown' ? (r + 1) % activeSize : r;
        const nc =
          k === 'arrowleft' ? (c - 1 + activeSize) % activeSize : k === 'arrowright' ? (c + 1) % activeSize : c;
        setSelectedIdx(nr * activeSize + nc);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, activeSize, selectedIdx, commitCellValue, handleUndo]);

  if (!open) return null;

  const { boxRows, boxCols } = getBoxDimensions(activeSize);
  const potentialReward = computeSudokuReward(size, difficulty, playType === 'online');
  const myOnlineProg = onlineRoom?.progress?.[myRole];
  const partnerOnlineProg = onlineRoom?.progress?.[partnerRole];
  const timerDisplay =
    playType === 'solo' && soloMode === 'timed'
      ? formatSec(Math.max(0, timeLimitSec - elapsedSec))
      : formatSec(elapsedSec);

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Sudoku Club"
    >
      <div className="bg-[#fff8ed] w-full max-w-2xl max-h-[95dvh] rounded-3xl sketch-border p-3.5 sm:p-5 flex flex-col gap-3 shadow-2xl overflow-y-auto custom-scroll">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b-2 border-[#2b1111]/15 pb-2">
          <div className="min-w-0">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-red-950 leading-none truncate">
              Sudoku Club 🔢
            </h2>
            <p className="text-[11px] sm:text-xs text-[#2b1111]/75 mt-0.5">
              Grades 4×4, 6×6 e 9×9 · Prêmio desta partida:{' '}
              <strong className="font-mono-num text-amber-800">+{potentialReward} 🐾</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar Sudoku"
            className="sketch-btn bg-white p-2 rounded-xl cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode / Size / Difficulty Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-1 min-w-[190px] gap-1 bg-amber-100/80 p-1 rounded-xl border border-[#2b1111]/25">
            <button
              type="button"
              onClick={() => {
                setPlayType('solo');
                startSoloPuzzle(size, difficulty, soloMode);
                sfx.select();
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                playType === 'solo' ? 'bg-red-700 text-amber-100 shadow-sm' : 'text-red-950'
              }`}
            >
              🧩 Solo
            </button>
            <button
              type="button"
              onClick={() => {
                setPlayType('online');
                sfx.select();
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                playType === 'online' ? 'bg-sky-700 text-white shadow-sm' : 'text-red-950'
              }`}
            >
              🌐 Duelo Online
            </button>
          </div>

          <div className="flex shrink-0 gap-1 bg-amber-100/80 p-1 rounded-xl border border-[#2b1111]/25">
            {([4, 6, 9] as SudokuSize[]).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => {
                  setSize(sz);
                  if (playType === 'solo') startSoloPuzzle(sz, difficulty, soloMode);
                  sfx.select();
                }}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-mono-num font-bold whitespace-nowrap cursor-pointer ${
                  size === sz ? 'bg-[#2b1111] text-amber-200' : 'text-red-950 hover:bg-white/70'
                }`}
              >
                {sz}×{sz}
              </button>
            ))}
          </div>

          <div className="flex flex-[1.4] min-w-[245px] gap-1 bg-amber-100/80 p-1 rounded-xl border border-[#2b1111]/25">
            {(['easy', 'medium', 'hard', 'expert'] as SudokuDifficulty[]).map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => {
                  setDifficulty(diff);
                  if (playType === 'solo') startSoloPuzzle(size, diff, soloMode);
                  sfx.select();
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                  difficulty === diff ? 'bg-amber-400 text-red-950 border border-[#2b1111]' : 'text-red-950'
                }`}
              >
                {DIFF_LABELS[diff]}
              </button>
            ))}
          </div>
        </div>

        {/* Solo Sub-Mode Selector OR Online Lobby */}
        {playType === 'solo' ? (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white/80 rounded-2xl border border-[#2b1111]/20 px-3 py-2">
            <div className="flex flex-wrap gap-1">
              {(['classic', 'zen', 'timed'] as SudokuSoloMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setSoloMode(m);
                    startSoloPuzzle(size, difficulty, m);
                    sfx.select();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer border ${
                    soloMode === m
                      ? 'bg-amber-200 border-[#2b1111] text-red-950'
                      : 'bg-stone-50 border-transparent text-[#2b1111]/75 hover:bg-amber-50'
                  }`}
                >
                  {SOLO_MODE_LABELS[m]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 text-xs font-mono-num font-bold">
              <span className={soloMode === 'classic' && mistakes >= 2 ? 'text-red-700' : 'text-[#2b1111]'}>
                Erros: {mistakes}
                {soloMode === 'classic' ? '/3' : ''}
              </span>
              <span
                className={
                  soloMode === 'timed' && timeLimitSec - elapsedSec <= 20
                    ? 'text-red-700 animate-pulse'
                    : 'text-sky-900'
                }
              >
                ⏱ {timerDisplay}
              </span>
              <button
                type="button"
                onClick={() => {
                  startSoloPuzzle(size, difficulty, soloMode);
                  sfx.select();
                }}
                className="sketch-btn bg-amber-300 px-2.5 py-1 rounded-lg text-[11px] font-sans font-bold text-red-950 flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" /> Novo Jogo
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-sky-50 border-2 border-sky-900/30 rounded-2xl p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-950">
                <Users className="w-4 h-4 text-sky-700" />
                <span>
                  {myNick} {onlineRoom?.p1InRoom || onlineRoom?.p2InRoom ? '🟢' : '⚪'} vs {partnerNick}{' '}
                  {(myRole === 'cat1' ? onlineRoom?.p2InRoom : onlineRoom?.p1InRoom) ? '🟢 Na sala' : '⏳ Aguardando'}
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onSendSocket({ type: 'sudoku:start', size, difficulty });
                    sfx.select();
                  }}
                  className="sketch-btn bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer whitespace-nowrap"
                >
                  {onlineRoom?.status === 'playing' ? '🔄 Novo Duelo' : '⚔️ Iniciar Duelo'}
                </button>
                {onlineRoom?.status === 'finished' && (
                  <button
                    type="button"
                    onClick={() => onSendSocket({ type: 'sudoku:reset' })}
                    className="sketch-btn bg-white text-sky-950 text-xs font-bold px-2.5 py-1.5 rounded-xl cursor-pointer whitespace-nowrap"
                  >
                    Lobby
                  </button>
                )}
              </div>
            </div>

            {onlineRoom && onlineRoom.status !== 'lobby' && (
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {[
                  { role: myRole, name: myNick, prog: myOnlineProg, accent: 'bg-red-600' },
                  { role: partnerRole, name: partnerNick, prog: partnerOnlineProg, accent: 'bg-sky-600' },
                ].map((item) => {
                  const total = Math.max(1, item.prog?.totalToFill || 1);
                  const filled = item.prog?.filled || 0;
                  const pct = Math.round((filled / total) * 100);
                  return (
                    <div key={item.role} className="bg-white rounded-xl p-2 border border-sky-900/20">
                      <div className="flex justify-between font-bold text-[#2b1111]">
                        <span className="truncate">{item.name}</span>
                        <span className="font-mono-num">{pct}%</span>
                      </div>
                      <div className="h-2 bg-stone-200 rounded-full overflow-hidden mt-1 border border-[#2b1111]/15">
                        <div className={`h-full transition-all ${item.accent}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Board Area */}
        {playType === 'online' && onlineRoom?.status === 'lobby' ? (
          <div className="bg-white rounded-2xl border-2 border-[#2b1111]/25 p-8 text-center space-y-2.5">
            <Trophy className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="font-display text-2xl font-bold text-red-950">
              Duelo Competitivo de Sudoku
            </h3>
            <p className="text-xs text-[#2b1111]/75 max-w-md mx-auto">
              Ambos os jogadores recebem exatamente o mesmo tabuleiro gerado pelo servidor. Quem completar primeiro leva{' '}
              <strong className="text-amber-800">+{potentialReward} 🐾</strong>!
            </p>
            <button
              type="button"
              onClick={() => onSendSocket({ type: 'sudoku:start', size, difficulty })}
              className="sketch-btn bg-red-700 hover:bg-red-800 text-amber-100 font-bold text-sm px-5 py-2.5 rounded-xl cursor-pointer"
            >
              Gerar Tabuleiro Compartilhado ⚔️
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-center gap-3 sm:gap-4">
            {/* Grid */}
            <div className="relative">
              <div
                className="grid bg-[#2b1111] border-[3px] border-[#2b1111] rounded-xl overflow-hidden shadow-lg select-none"
                style={{
                  gridTemplateColumns: `repeat(${activeSize}, minmax(0, 1fr))`,
                  width: activeSize === 9 ? 'min(86vw, 356px)' : activeSize === 6 ? 'min(82vw, 320px)' : 'min(74vw, 276px)',
                  aspectRatio: '1 / 1',
                }}
              >
                {board.map((val, idx) => {
                  const r = Math.floor(idx / activeSize);
                  const c = idx % activeSize;
                  const isGiven = puzzle[idx] !== 0;
                  const isSelected = selectedIdx === idx;
                  const isRelated = relatedIndices.has(idx);
                  const isSameNum = selectedValue > 0 && val === selectedValue;
                  const isError = val !== 0 && !isGiven && val !== solution[idx];
                  const cellNotes = notes[idx] || [];

                  const borderRight =
                    c === activeSize - 1
                      ? ''
                      : (c + 1) % boxCols === 0
                      ? 'border-r-[2.5px] border-r-[#2b1111]'
                      : 'border-r border-r-[#2b1111]/20';
                  const borderBottom =
                    r === activeSize - 1
                      ? ''
                      : (r + 1) % boxRows === 0
                      ? 'border-b-[2.5px] border-b-[#2b1111]'
                      : 'border-b border-b-[#2b1111]/20';

                  let bgClass = isGiven ? 'bg-[#f6ebd9]' : 'bg-white';
                  if (isRelated) bgClass = isGiven ? 'bg-[#efe0c4]' : 'bg-amber-50';
                  if (isSameNum) bgClass = 'bg-sky-100';
                  if (isError) bgClass = 'bg-rose-100';
                  if (isSelected) bgClass = 'bg-amber-300';

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedIdx(idx)}
                      className={`relative flex items-center justify-center font-mono-num transition-colors cursor-pointer ${borderRight} ${borderBottom} ${bgClass} ${
                        lastErrorIdx === idx ? 'anim-tile-shake' : ''
                      }`}
                    >
                      {val !== 0 ? (
                        <span
                          className={`leading-none font-bold ${
                            activeSize === 4 ? 'text-xl sm:text-2xl' : activeSize === 6 ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'
                          } ${
                            isGiven ? 'text-[#2b1111]' : isError ? 'text-red-700' : 'text-sky-800'
                          }`}
                        >
                          {val}
                        </span>
                      ) : cellNotes.length > 0 ? (
                        <div
                          className="grid w-full h-full p-0.5 text-[8px] sm:text-[9px] font-semibold text-[#2b1111]/70 leading-none"
                          style={{
                            gridTemplateColumns: `repeat(${activeSize === 4 ? 2 : 3}, 1fr)`,
                          }}
                        >
                          {Array.from({ length: activeSize }, (_, n) => n + 1).map((n) => (
                            <span key={n} className="flex items-center justify-center">
                              {cellNotes.includes(n) ? n : ''}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {/* Win / Lost Banner Overlay */}
              {status !== 'playing' && (
                <div
                  className="absolute inset-0 rounded-xl flex items-center justify-center p-4 text-center"
                  style={{ backgroundColor: 'rgba(15, 23, 42, 0.72)' }}
                >
                  <div className="bg-[#fff8ed] border-2 border-[#2b1111] rounded-2xl p-4 space-y-2 max-w-[260px] shadow-2xl anim-card-pop">
                    <div className="text-3xl">{status === 'won' ? '🏆' : '😿'}</div>
                    <h3 className="font-display text-2xl font-bold text-red-950">
                      {status === 'won' ? 'Sudoku Resolvido!' : 'Fim de Tentativa'}
                    </h3>
                    <p className="text-xs text-[#2b1111]/80 font-medium">
                      {status === 'won'
                        ? playType === 'online'
                          ? `Você venceu o duelo e ganhou +${computeSudokuReward(activeSize, activeDifficulty, true)} 🐾!`
                          : `Tabuleiro ${activeSize}×${activeSize} completo em ${formatSec(elapsedSec)}! +${computeSudokuReward(activeSize, activeDifficulty, false)} 🐾`
                        : playType === 'online' && onlineRoom?.winner
                        ? `${state.nicknames[onlineRoom.winner]} completou primeiro!`
                        : soloMode === 'timed'
                        ? 'O tempo acabou antes de fechar a grade.'
                        : 'Você atingiu o limite de 3 erros.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (playType === 'online') {
                          onSendSocket({ type: 'sudoku:start', size, difficulty });
                        } else {
                          startSoloPuzzle(size, difficulty, soloMode);
                        }
                      }}
                      className="sketch-btn w-full bg-red-700 hover:bg-red-800 text-amber-100 text-xs font-bold py-2 rounded-xl cursor-pointer"
                    >
                      Jogar Outra 🔄
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tools & Number Pad */}
            <div className="w-full sm:w-52 flex flex-col gap-2.5">
              <div className="grid grid-cols-4 sm:grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={undoStack.length === 0 || status !== 'playing'}
                  className="sketch-btn bg-white py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Undo2 className="w-3.5 h-3.5" /> Desfazer
                </button>
                <button
                  type="button"
                  onClick={() => commitCellValue(0)}
                  disabled={status !== 'playing'}
                  className="sketch-btn bg-white py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Eraser className="w-3.5 h-3.5" /> Apagar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNoteMode((v) => !v);
                    sfx.select();
                  }}
                  className={`sketch-btn py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                    noteMode ? 'bg-sky-700 text-white' : 'bg-white text-[#2b1111]'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" /> Rascunho
                </button>
                <button
                  type="button"
                  onClick={handleHint}
                  disabled={status !== 'playing'}
                  className="sketch-btn bg-amber-200 hover:bg-amber-300 text-red-950 py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Lightbulb className="w-3.5 h-3.5" /> Dica
                </button>
              </div>

              <div
                className="grid gap-1.5"
                style={{
                  gridTemplateColumns: `repeat(${activeSize === 4 ? 4 : activeSize === 6 ? 3 : 3}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: activeSize }, (_, i) => i + 1).map((n) => {
                  const left = remainingCounts[n] ?? 0;
                  const exhausted = left === 0;
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={status !== 'playing'}
                      onClick={() => commitCellValue(n)}
                      className={`sketch-btn py-2 rounded-xl flex flex-col items-center justify-center cursor-pointer ${
                        exhausted && !noteMode
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-700/40'
                          : 'bg-white hover:bg-amber-100 text-red-950'
                      }`}
                    >
                      <span className="font-mono-num text-lg font-black leading-none">{n}</span>
                      <span className="font-mono-num text-[10px] font-bold opacity-65 mt-0.5">
                        {left} rest.
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="text-[10px] text-[#2b1111]/65 text-center leading-snug">
                Teclado: 1-{activeSize}, Setas para mover, N para Rascunho, Backspace para apagar.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
