import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, Delete, RotateCcw, Sparkles, X } from 'lucide-react';
import { PlayerRole } from '../../types/game';
import { getTodayDateString } from '../../logic/minigames';
import {
  computeKeyboardLetterStates,
  evaluateTermoGuess,
  formatCountdown,
  getDailyTermoTargets,
  getMillisecondsUntilMidnight,
  getPracticeTermoTargets,
  getTermoConfig,
  isValidTermoGuess,
  LetterEval,
  normalizeTermoWord,
  TermoMode,
} from '../../logic/termo';
import { AchievementEvent } from '../../logic/achievements';
import { MatchScoreOutcome } from '../../logic/scores';
import { sfx } from '../../utils/sound';

interface TermoModalProps {
  open: boolean;
  myRole: PlayerRole;
  onClose: () => void;
  onAwardPaws: (role: PlayerRole, amount: number) => void;
  onRecordOutcome?: (outcome: MatchScoreOutcome) => void;
  onAchievementEvent?: (role: PlayerRole, event: AchievementEvent) => void;
}

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
];

const EVAL_COLORS: Record<LetterEval, string> = {
  correct: '#15803d',
  present: '#ca8a04',
  absent: '#3f3f46',
};

interface SavedDailyState {
  date: string;
  mode: TermoMode;
  guesses: string[];
  rewarded?: boolean;
}

function loadDailyProgress(date: string, mode: TermoMode): SavedDailyState | null {
  try {
    const raw = localStorage.getItem(`termo_daily_${date}_${mode}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedDailyState;
    if (parsed.date === date && parsed.mode === mode && Array.isArray(parsed.guesses)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function saveDailyProgress(data: SavedDailyState) {
  try {
    localStorage.setItem(`termo_daily_${data.date}_${data.mode}`, JSON.stringify(data));
  } catch {
    // ignore storage quota errors
  }
}

export const TermoModal: React.FC<TermoModalProps> = ({
  open,
  myRole,
  onClose,
  onAwardPaws,
  onRecordOutcome,
  onAchievementEvent,
}) => {
  const [mode, setMode] = useState<TermoMode>('termo');
  const [isPractice, setIsPractice] = useState(false);
  const [targets, setTargets] = useState<string[]>(() =>
    getDailyTermoTargets(getTodayDateString(), 'termo')
  );
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentLetters, setCurrentLetters] = useState<string[]>(['', '', '', '', '']);
  const [cursorCol, setCursorCol] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [shakingRow, setShakingRow] = useState<number | null>(null);
  const [rewarded, setRewarded] = useState(false);
  const [countdown, setCountdown] = useState(() =>
    formatCountdown(getMillisecondsUntilMidnight())
  );

  const today = getTodayDateString();
  const cfg = getTermoConfig(mode);

  const initSession = useCallback(
    (nextMode: TermoMode, practice: boolean) => {
      setMode(nextMode);
      setIsPractice(practice);
      setCurrentLetters(['', '', '', '', '']);
      setCursorCol(0);
      setFeedbackMsg('');
      setShakingRow(null);

      if (practice) {
        setTargets(getPracticeTermoTargets(nextMode));
        setGuesses([]);
        setRewarded(false);
      } else {
        const d = getTodayDateString();
        setTargets(getDailyTermoTargets(d, nextMode));
        const saved = loadDailyProgress(d, nextMode);
        setGuesses(saved ? saved.guesses : []);
        setRewarded(Boolean(saved?.rewarded));
      }
    },
    []
  );

  useEffect(() => {
    if (!open) return;
    initSession(mode, isPractice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Countdown until midnight daily word reset
  useEffect(() => {
    if (!open) return;
    const iv = window.setInterval(() => {
      setCountdown(formatCountdown(getMillisecondsUntilMidnight()));
    }, 1000);
    return () => window.clearInterval(iv);
  }, [open]);

  const boardSolvedAt = useMemo(
    () => targets.map((t) => guesses.findIndex((g) => g === t)),
    [targets, guesses]
  );

  const allSolved = useMemo(
    () => boardSolvedAt.every((idx) => idx >= 0),
    [boardSolvedAt]
  );
  const gameOver = allSolved || guesses.length >= cfg.maxAttempts;

  const keyStates = useMemo(
    () => computeKeyboardLetterStates(guesses, targets),
    [guesses, targets]
  );

  const showTempMessage = (msg: string) => {
    setFeedbackMsg(msg);
    window.setTimeout(() => {
      setFeedbackMsg((cur) => (cur === msg ? '' : cur));
    }, 2400);
  };

  const handleTypeLetter = useCallback(
    (rawChar: string) => {
      if (gameOver) return;
      const ch = normalizeTermoWord(rawChar).slice(0, 1);
      if (!ch) return;
      sfx.keyTap();
      setCurrentLetters((prev) => {
        const next = [...prev];
        next[cursorCol] = ch;
        return next;
      });
      setCursorCol((c) => {
        if (c < 4) return c + 1;
        return c;
      });
    },
    [gameOver, cursorCol]
  );

  const handleBackspace = useCallback(() => {
    if (gameOver) return;
    sfx.keyTap();
    setCurrentLetters((prev) => {
      const next = [...prev];
      if (next[cursorCol]) {
        next[cursorCol] = '';
      } else if (cursorCol > 0) {
        next[cursorCol - 1] = '';
        setCursorCol(cursorCol - 1);
      }
      return next;
    });
  }, [gameOver, cursorCol]);

  const handleSubmitRow = useCallback(() => {
    if (gameOver) return;
    const word = currentLetters.join('');
    if (word.length < 5) {
      setShakingRow(guesses.length);
      window.setTimeout(() => setShakingRow(null), 420);
      sfx.rowInvalid();
      showTempMessage('Preencha todas as 5 letras.');
      return;
    }
    if (!isValidTermoGuess(word)) {
      setShakingRow(guesses.length);
      window.setTimeout(() => setShakingRow(null), 420);
      sfx.rowInvalid();
      showTempMessage('Palavra não reconhecida no vocabulário.');
      return;
    }

    const nextGuesses = [...guesses, word];
    setGuesses(nextGuesses);
    setCurrentLetters(['', '', '', '', '']);
    setCursorCol(0);
    sfx.tileFlip();

    const nowAllSolved = targets.every((t) => nextGuesses.includes(t));
    let nextRewarded = rewarded;
    if (nowAllSolved && !rewarded) {
      nextRewarded = true;
      setRewarded(true);
      const reward = isPractice ? Math.max(5, Math.round(cfg.rewardPaws * 0.6)) : cfg.rewardPaws;
      window.setTimeout(() => sfx.tileWin(), 280);
      onAwardPaws(myRole, reward);
      onRecordOutcome?.({ kind: 'solo_win', role: myRole });
      onAchievementEvent?.(myRole, { type: 'termo_win', mode });
      showTempMessage(`Incrível! +${reward} 🐾 Patinhas conquistadas!`);
    } else if (!nowAllSolved && nextGuesses.length >= cfg.maxAttempts) {
      sfx.error();
      onRecordOutcome?.({ kind: 'solo_loss', role: myRole });
      showTempMessage(`Palavras: ${targets.join(' · ')}`);
    }

    if (!isPractice) {
      saveDailyProgress({
        date: today,
        mode,
        guesses: nextGuesses,
        rewarded: nextRewarded,
      });
    }
  }, [
    gameOver,
    currentLetters,
    guesses,
    targets,
    rewarded,
    isPractice,
    cfg.rewardPaws,
    cfg.maxAttempts,
    myRole,
    mode,
    today,
    onAwardPaws,
    onRecordOutcome,
    onAchievementEvent,
  ]);

  // Physical keyboard support
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmitRow();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCursorCol((c) => Math.max(0, c - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCursorCol((c) => Math.min(4, c + 1));
      } else if (/^[a-zA-ZÀ-ÿ]$/.test(e.key)) {
        handleTypeLetter(e.key);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, handleSubmitRow, handleBackspace, handleTypeLetter]);

  if (!open) return null;

  const boardColsClass =
    mode === 'termo'
      ? 'grid-cols-1 max-w-[300px]'
      : mode === 'dueto'
      ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl'
      : 'grid-cols-2 lg:grid-cols-4 max-w-4xl';

  return (
    <div
      className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Termo Diário"
    >
      <div className="bg-[#fff8ed] w-full max-w-5xl max-h-[96dvh] rounded-3xl sketch-border p-3 sm:p-5 flex flex-col gap-3 shadow-2xl overflow-y-auto custom-scroll">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#2b1111]/15 pb-2">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-red-950 leading-none">
              Termo Diário 🔤
            </h2>
            <p className="text-[11px] sm:text-xs text-[#2b1111]/75 mt-0.5 flex flex-wrap items-center gap-2">
              <span>Palavras inéditas sem repetição</span>
              <span className="inline-flex items-center gap-1 font-mono-num font-bold text-sky-900">
                <Clock className="w-3 h-3" /> Próxima palavra em {countdown}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar Termo"
            className="sketch-btn bg-white p-2 rounded-xl cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode & Daily/Practice Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1 bg-amber-100/85 p-1 rounded-xl border border-[#2b1111]/25 max-w-full">
            {(['termo', 'dueto', 'quarteto'] as TermoMode[]).map((m) => {
              const mCfg = getTermoConfig(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    initSession(m, isPractice);
                    sfx.select();
                  }}
                  className={`px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold cursor-pointer whitespace-nowrap ${
                    mode === m
                      ? 'bg-[#2b1111] text-amber-200 shadow-sm'
                      : 'text-red-950 hover:bg-white'
                  }`}
                >
                  {m === 'termo' ? 'Termo' : m === 'dueto' ? 'Dueto (2×)' : 'Quarteto (4×)'}{' '}
                  <span className="opacity-80 font-mono-num">+{mCfg.rewardPaws}🐾</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                initSession(mode, !isPractice);
                sfx.select();
              }}
              className={`sketch-btn px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                isPractice ? 'bg-indigo-700 text-white' : 'bg-amber-200 text-red-950'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isPractice ? 'Modo Treino (Livre)' : 'Palavra do Dia'}
            </button>
            {isPractice && (
              <button
                type="button"
                onClick={() => {
                  initSession(mode, true);
                  sfx.select();
                }}
                className="sketch-btn bg-white px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Nova
              </button>
            )}
          </div>
        </div>

        {/* Feedback Toast */}
        {feedbackMsg && (
          <div className="mx-auto bg-[#2b1111] text-amber-100 text-xs font-bold px-3.5 py-1.5 rounded-xl shadow anim-card-pop">
            {feedbackMsg}
          </div>
        )}

        {/* Boards Grid */}
        <div className={`grid gap-3 mx-auto w-full ${boardColsClass}`}>
          {targets.map((target, bIdx) => {
            const solvedRow = boardSolvedAt[bIdx];
            const isBoardSolved = solvedRow >= 0;
            return (
              <div
                key={`${bIdx}_${target}`}
                className={`rounded-2xl border-2 p-2 sm:p-2.5 flex flex-col gap-1 ${
                  isBoardSolved
                    ? 'bg-emerald-50 border-emerald-700'
                    : 'bg-[#2b1111]/95 border-[#2b1111]'
                }`}
              >
                {targets.length > 1 && (
                  <div
                    className={`flex justify-between items-center text-[10px] font-bold px-1 ${
                      isBoardSolved ? 'text-emerald-900' : 'text-amber-200/80'
                    }`}
                  >
                    <span>Palavra #{bIdx + 1}</span>
                    <span>{isBoardSolved ? '✓ Descoberta' : 'Em jogo'}</span>
                  </div>
                )}

                {Array.from({ length: cfg.maxAttempts }, (_, rowIdx) => {
                  const isCommitted = rowIdx < guesses.length;
                  const isActiveRow = !gameOver && !isBoardSolved && rowIdx === guesses.length;
                  const rowLockedOut = isBoardSolved && rowIdx > solvedRow;
                  const guessStr = isCommitted ? guesses[rowIdx] : '';
                  const evals = isCommitted ? evaluateTermoGuess(guessStr, target) : null;

                  return (
                    <div
                      key={rowIdx}
                      className={`grid grid-cols-5 gap-1 ${
                        isActiveRow && shakingRow === rowIdx ? 'anim-tile-shake' : ''
                      }`}
                    >
                      {Array.from({ length: 5 }, (_, colIdx) => {
                        const letter = isCommitted
                          ? guessStr[colIdx] || ''
                          : isActiveRow
                          ? currentLetters[colIdx] || ''
                          : '';
                        const ev = evals ? evals[colIdx] : null;
                        const isCursor = isActiveRow && cursorCol === colIdx;

                        let cellStyle = 'bg-stone-800/80 border-stone-600/60 text-white';
                        if (rowLockedOut) {
                          cellStyle = 'bg-emerald-900/15 border-emerald-700/20 text-transparent';
                        } else if (ev === 'correct') {
                          cellStyle = 'bg-emerald-600 border-emerald-400 text-white';
                        } else if (ev === 'present') {
                          cellStyle = 'bg-amber-500 border-amber-300 text-white';
                        } else if (ev === 'absent') {
                          cellStyle = 'bg-zinc-700 border-zinc-500 text-zinc-100';
                        } else if (isActiveRow) {
                          cellStyle = isCursor
                            ? 'bg-amber-100 border-amber-400 text-[#2b1111] ring-2 ring-amber-400'
                            : 'bg-[#fff8ed] border-[#2b1111]/40 text-[#2b1111]';
                        } else if (isBoardSolved && !isCommitted) {
                          cellStyle = 'bg-emerald-900/10 border-emerald-700/15';
                        }

                        const cellHeight =
                          mode === 'quarteto'
                            ? 'h-7 sm:h-8 text-xs sm:text-sm'
                            : mode === 'dueto'
                            ? 'h-9 sm:h-10 text-sm sm:text-base'
                            : 'h-11 sm:h-12 text-lg sm:text-xl';

                        return (
                          <button
                            key={colIdx}
                            type="button"
                            disabled={!isActiveRow}
                            onClick={() => isActiveRow && setCursorCol(colIdx)}
                            style={
                              isCommitted && !rowLockedOut
                                ? { animationDelay: `${colIdx * 70}ms` }
                                : undefined
                            }
                            className={`rounded-lg border-2 font-mono-num font-black flex items-center justify-center uppercase select-none ${cellHeight} ${cellStyle} ${
                              isCommitted && !rowLockedOut ? 'anim-wordle-flip' : ''
                            } ${isActiveRow ? 'cursor-pointer' : 'cursor-default'}`}
                          >
                            {rowLockedOut ? '' : letter}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Summary Banner if finished */}
        {gameOver && (
          <div
            className={`rounded-2xl border-2 p-3 flex flex-wrap items-center justify-between gap-2 text-xs ${
              allSolved
                ? 'bg-emerald-100 border-emerald-700 text-emerald-950'
                : 'bg-rose-100 border-rose-700 text-rose-950'
            }`}
          >
            <div>
              <strong>{allSolved ? 'Parabéns!' : 'Fim das tentativas!'}</strong>{' '}
              Palavras: <span className="font-mono-num font-black">{targets.join(' · ')}</span>
            </div>
            {!isPractice ? (
              <span className="font-mono-num font-bold">
                Nova palavra diária em {countdown}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => initSession(mode, true)}
                className="sketch-btn bg-white px-3 py-1 rounded-xl font-bold cursor-pointer"
              >
                Jogar Outra Palavra
              </button>
            )}
          </div>
        )}

        {/* Multi-quadrant Termo.ooo style virtual keyboard */}
        <div className="space-y-1.5 max-w-xl w-full mx-auto pt-1 select-none">
          {KEYBOARD_ROWS.map((row, rIdx) => (
            <div key={rIdx} className="flex justify-center gap-1">
              {row.map((key) => {
                if (key === 'ENTER') {
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={handleSubmitRow}
                      className="sketch-btn bg-red-700 hover:bg-red-800 text-amber-100 px-2.5 sm:px-3.5 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold cursor-pointer whitespace-nowrap"
                    >
                      ENTER
                    </button>
                  );
                }
                if (key === 'BACK') {
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={handleBackspace}
                      aria-label="Apagar letra"
                      className="sketch-btn bg-stone-200 hover:bg-stone-300 text-[#2b1111] px-2.5 sm:px-3.5 py-2.5 rounded-xl flex items-center justify-center cursor-pointer"
                    >
                      <Delete className="w-4 h-4" />
                    </button>
                  );
                }

                const evalList = keyStates[key] || [];
                const allAbsent =
                  targets.length > 0 &&
                  evalList.length === targets.length &&
                  evalList.every((e) => e === 'absent');
                const hasAnyFeedback = evalList.some((e) => e !== null);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleTypeLetter(key)}
                    className={`relative overflow-hidden border-2 border-[#2b1111] rounded-xl flex-1 max-w-[44px] h-10 sm:h-11 font-mono-num font-black text-xs sm:text-sm flex items-center justify-center cursor-pointer transition-transform active:scale-95 ${
                      hasAnyFeedback
                        ? allAbsent
                          ? 'text-zinc-300'
                          : 'text-white'
                        : 'bg-[#f6ebd9] hover:bg-amber-200 text-[#2b1111]'
                    }`}
                  >
                    {/* Multi-board split background quadrants */}
                    {hasAnyFeedback && (
                      <span
                        aria-hidden="true"
                        className={`absolute inset-0 grid ${
                          targets.length === 1
                            ? 'grid-cols-1'
                            : targets.length === 2
                            ? 'grid-cols-2'
                            : 'grid-cols-2 grid-rows-2'
                        }`}
                      >
                        {targets.map((_, bIdx) => {
                          const ev = evalList[bIdx];
                          return (
                            <span
                              key={bIdx}
                              style={{
                                backgroundColor: ev ? EVAL_COLORS[ev] : '#d6d3d1',
                              }}
                            />
                          );
                        })}
                      </span>
                    )}
                    <span className="relative z-10 drop-shadow-sm">{key}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
