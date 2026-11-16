import { applyChessMove, createInitialChessState } from './chess.ts';
import { applyCheckersMove, createInitialCheckersState } from './checkers.ts';
import { checkTicTacToeResult, resolveJokenpoWinner } from './minigames.ts';
import {
  applyAchievementEvent,
  type AchievementEvent,
} from './achievements.ts';
import {
  createDefaultAchievementStats,
  createDefaultSudokuOnlineState,
} from './defaultState.ts';
import { computeSudokuReward, generateSudokuPuzzle } from './sudoku.ts';
import { applyScoreOutcome, isValidMatchScoreOutcome } from './scores.ts';
import type {
  PlayerActiveGameStatus,
  PlayerRole,
  SharedState,
  SudokuDifficulty,
  SudokuSize,
} from '../types/game.ts';

function cloneWithAchievements(state: SharedState): SharedState {
  return {
    ...state,
    achievements: {
      cat1: { ...(state.achievements?.cat1 || {}) },
      cat2: { ...(state.achievements?.cat2 || {}) },
    },
    achievementStats: {
      cat1: { ...createDefaultAchievementStats(), ...(state.achievementStats?.cat1 || {}) },
      cat2: { ...createDefaultAchievementStats(), ...(state.achievementStats?.cat2 || {}) },
    },
  };
}

function recordAch(state: SharedState, role: PlayerRole, event: AchievementEvent): SharedState {
  const next = cloneWithAchievements(state);
  const res = applyAchievementEvent(next.achievements, next.achievementStats, role, event);
  next.achievements = res.achievements;
  next.achievementStats = res.achievementStats;
  return next;
}

export interface ClientActionResult {
  nextState: SharedState;
  shouldPersist: boolean;
}

export function applyClientGameAction(
  prevState: SharedState,
  role: PlayerRole,
  msg: Record<string, unknown>,
  nowMs = Date.now()
): ClientActionResult {
  const type = typeof msg.type === 'string' ? msg.type : '';
  let state = prevState;

  switch (type) {
    case 'score:record': {
      if (!isValidMatchScoreOutcome(msg.outcome)) {
        return { nextState: prevState, shouldPersist: false };
      }
      return {
        nextState: {
          ...state,
          scores: applyScoreOutcome(state.scores, msg.outcome),
          lastStatsUpdateTime: Math.max((state.lastStatsUpdateTime || 0) + 1, nowMs),
        },
        shouldPersist: true,
      };
    }

    case 'chat:send': {
      const text = String(msg.text || '').trim().slice(0, 220);
      if (!text) return { nextState: prevState, shouldPersist: false };
      const authorName =
        state.nicknames[role] || (role === 'cat1' ? 'Camarada 1' : 'Camarada 2');
      const now = new Date(nowMs);
      return {
        nextState: {
          ...state,
          lastStatsUpdateTime: Math.max((state.lastStatsUpdateTime || 0) + 1, nowMs),
          letters: [
            ...state.letters.slice(-79),
            {
              id: `${nowMs}_${Math.random().toString(36).slice(2, 7)}`,
              from: role,
              authorName,
              text,
              timestamp: nowMs,
              timeFormatted: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ],
        },
        shouldPersist: true,
      };
    }

    case 'room:join':
    case 'room:leave': {
      const game = String(msg.game || '');
      const joined = type === 'room:join';
      const prop = role === 'cat1' ? 'p1InRoom' : 'p2InRoom';

      if (game === 'jokenpo' || game === 'reaction' || game === 'tictactoe' || game === 'airhockey') {
        return {
          nextState: {
            ...state,
            lastStatsUpdateTime: Math.max((state.lastStatsUpdateTime || 0) + 1, nowMs),
            onlineRooms: {
              ...state.onlineRooms,
              [game]: {
                ...state.onlineRooms[game],
                [prop]: joined,
                ...(game === 'airhockey' && !joined ? { running: false } : {}),
              },
            },
          },
          shouldPersist: true,
        };
      }
      if (game === 'sudoku') {
        const sudoku = state.onlineRooms.sudoku || createDefaultSudokuOnlineState();
        return {
          nextState: {
            ...state,
            lastStatsUpdateTime: Math.max((state.lastStatsUpdateTime || 0) + 1, nowMs),
            onlineRooms: {
              ...state.onlineRooms,
              sudoku: {
                ...sudoku,
                [prop]: joined,
              },
            },
          },
          shouldPersist: true,
        };
      }
      if (game === 'chess' || game === 'checkers') {
        return {
          nextState: {
            ...state,
            lastStatsUpdateTime: Math.max((state.lastStatsUpdateTime || 0) + 1, nowMs),
            boardGames: {
              ...state.boardGames,
              [game]: {
                ...state.boardGames[game],
                config: {
                  ...state.boardGames[game].config,
                  [prop]: joined,
                },
              },
            },
          },
          shouldPersist: true,
        };
      }
      return { nextState: prevState, shouldPersist: false };
    }

    case 'presence:game': {
      const activeRaw = msg.active;
      const rawObj =
        activeRaw && typeof activeRaw === 'object'
          ? (activeRaw as Record<string, unknown>)
          : null;
      const status: PlayerActiveGameStatus | null =
        rawObj && rawObj.game
          ? {
              game: String(rawObj.game).slice(0, 24) as PlayerActiveGameStatus['game'],
              mode:
                rawObj.mode === 'online'
                  ? 'online'
                  : rawObj.mode === 'local'
                  ? 'local'
                  : 'bot',
              label: String(rawObj.label || rawObj.game).slice(0, 40),
              icon: String(rawObj.icon || '🎮').slice(0, 8),
              updatedAt: nowMs,
            }
          : null;
      return {
        nextState: {
          ...state,
          activeGames: {
            cat1: state.activeGames?.cat1 || null,
            cat2: state.activeGames?.cat2 || null,
            [role]: status,
          },
        },
        shouldPersist: false,
      };
    }

    case 'sudoku:start': {
      const prevSudoku = state.onlineRooms.sudoku || createDefaultSudokuOnlineState();
      const rawSize = Number(msg.size);
      const size: SudokuSize = rawSize === 4 || rawSize === 6 ? rawSize : 9;
      const rawDiff = String(msg.difficulty || 'medium');
      const difficulty: SudokuDifficulty =
        rawDiff === 'easy' || rawDiff === 'hard' || rawDiff === 'expert' ? rawDiff : 'medium';
      const generated = generateSudokuPuzzle(size, difficulty);
      const totalToFill = generated.puzzle.filter((v) => v === 0).length;
      return {
        nextState: {
          ...state,
          lastStatsUpdateTime: Math.max((state.lastStatsUpdateTime || 0) + 1, nowMs),
          onlineRooms: {
            ...state.onlineRooms,
            sudoku: {
              ...prevSudoku,
              status: 'playing',
              matchId: (prevSudoku.matchId || 0) + 1,
              size,
              difficulty,
              puzzle: generated.puzzle,
              solution: generated.solution,
              startedAt: nowMs,
              winner: '',
              progress: {
                cat1: { filled: 0, totalToFill, mistakes: 0, finished: false, elapsedMs: null },
                cat2: { filled: 0, totalToFill, mistakes: 0, finished: false, elapsedMs: null },
              },
            },
          },
        },
        shouldPersist: true,
      };
    }

    case 'sudoku:progress': {
      const prevSudoku = state.onlineRooms.sudoku || createDefaultSudokuOnlineState();
      if (prevSudoku.status !== 'playing') return { nextState: prevState, shouldPersist: false };
      const matchId = Number(msg.matchId || 0);
      if (matchId && matchId !== prevSudoku.matchId) {
        return { nextState: prevState, shouldPersist: false };
      }
      const totalToFill = Math.max(1, prevSudoku.puzzle.filter((v) => v === 0).length);
      const filled = Math.max(0, Math.min(totalToFill, Math.floor(Number(msg.filled) || 0)));
      const mistakes = Math.max(0, Math.floor(Number(msg.mistakes) || 0));
      const finished = Boolean(msg.finished) && filled >= totalToFill;
      const elapsedMs = prevSudoku.startedAt ? Math.max(500, nowMs - prevSudoku.startedAt) : null;

      let nextState: SharedState = {
        ...state,
        lastStatsUpdateTime: Math.max((state.lastStatsUpdateTime || 0) + 1, nowMs),
        onlineRooms: {
          ...state.onlineRooms,
          sudoku: {
            ...prevSudoku,
            progress: {
              ...prevSudoku.progress,
              [role]: {
                filled,
                totalToFill,
                mistakes,
                finished,
                elapsedMs: finished ? elapsedMs : null,
              },
            },
          },
        },
      };

      if (finished && !prevSudoku.winner) {
        const reward = computeSudokuReward(prevSudoku.size, prevSudoku.difficulty, true);
        nextState = {
          ...nextState,
          wallets: {
            ...nextState.wallets,
            [role]: {
              ...nextState.wallets[role],
              paws: nextState.wallets[role].paws + reward,
            },
          },
          scores: applyScoreOutcome(nextState.scores, { kind: 'pvp_win', winner: role }),
          onlineRooms: {
            ...nextState.onlineRooms,
            sudoku: {
              ...nextState.onlineRooms.sudoku!,
              winner: role,
              status: 'finished',
            },
          },
        };
        nextState = recordAch(nextState, role, {
          type: 'sudoku_win',
          size: prevSudoku.size,
          difficulty: prevSudoku.difficulty,
          online: true,
        });
      }
      return { nextState, shouldPersist: true };
    }

    case 'sudoku:reset': {
      const prevSudoku = state.onlineRooms.sudoku || createDefaultSudokuOnlineState();
      return {
        nextState: {
          ...state,
          lastStatsUpdateTime: Math.max((state.lastStatsUpdateTime || 0) + 1, nowMs),
          onlineRooms: {
            ...state.onlineRooms,
            sudoku: {
              ...createDefaultSudokuOnlineState(),
              p1InRoom: prevSudoku.p1InRoom,
              p2InRoom: prevSudoku.p2InRoom,
              matchId: (prevSudoku.matchId || 0) + 1,
            },
          },
        },
        shouldPersist: true,
      };
    }

    case 'jokenpo:choice': {
      const choice = String(msg.choice || '');
      if (choice !== 'rock' && choice !== 'paper' && choice !== 'scissors') {
        return { nextState: prevState, shouldPersist: false };
      }
      const prevJkp = state.onlineRooms.jokenpo;
      if (prevJkp.state !== 'waiting') {
        return { nextState: prevState, shouldPersist: false };
      }
      const nextJkp = {
        ...prevJkp,
        p1Choice: role === 'cat1' ? choice : prevJkp.p1Choice,
        p2Choice: role === 'cat2' ? choice : prevJkp.p2Choice,
      };
      let nextState: SharedState = {
        ...state,
        lastStatsUpdateTime: Math.max((state.lastStatsUpdateTime || 0) + 1, nowMs),
        onlineRooms: {
          ...state.onlineRooms,
          jokenpo: nextJkp,
        },
      };

      if (nextJkp.p1Choice && nextJkp.p2Choice) {
        nextJkp.state = 'finished';
        const win = resolveJokenpoWinner(nextJkp.p1Choice, nextJkp.p2Choice);
        if (win === 'cat1' || win === 'cat2') {
          const loser: PlayerRole = win === 'cat1' ? 'cat2' : 'cat1';
          nextState = {
            ...nextState,
            wallets: {
              ...nextState.wallets,
              [win]: {
                ...nextState.wallets[win],
                paws: nextState.wallets[win].paws + 6,
              },
            },
            scores: applyScoreOutcome(nextState.scores, { kind: 'pvp_win', winner: win }),
          };
          nextState = recordAch(nextState, win, { type: 'jokenpo_result', outcome: 'win' });
          nextState = recordAch(nextState, loser, { type: 'jokenpo_result', outcome: 'loss' });
        } else {
          nextState = {
            ...nextState,
            scores: applyScoreOutcome(nextState.scores, { kind: 'tie' }),
          };
          nextState = recordAch(nextState, 'cat1', { type: 'jokenpo_result', outcome: 'tie' });
          nextState = recordAch(nextState, 'cat2', { type: 'jokenpo_result', outcome: 'tie' });
        }
      }
      return { nextState, shouldPersist: true };
    }

    case 'jokenpo:reset': {
      return {
        nextState: {
          ...state,
          lastStatsUpdateTime: Math.max((state.lastStatsUpdateTime || 0) + 1, nowMs),
          onlineRooms: {
            ...state.onlineRooms,
            jokenpo: {
              ...state.onlineRooms.jokenpo,
              p1Choice: '',
              p2Choice: '',
              state: 'waiting',
              roundId: (state.onlineRooms.jokenpo.roundId || 1) + 1,
            },
          },
        },
        shouldPersist: true,
      };
    }

    case 'ttt:set_starter': {
      const starter: PlayerRole = msg.starter === 'cat2' ? 'cat2' : 'cat1';
      return {
        nextState: {
          ...state,
          lastStatsUpdateTime: Math.max((state.lastStatsUpdateTime || 0) + 1, nowMs),
          onlineRooms: {
            ...state.onlineRooms,
            tictactoe: {
              ...state.onlineRooms.tictactoe,
              turn: starter,
            },
          },
        },
        shouldPersist: true,
      };
    }

    case 'ttt:move': {
      const idx = Number(msg.index);
      const ttt = state.onlineRooms.tictactoe;
      if (idx < 0 || idx > 8 || ttt.winner || ttt.board[idx] !== '' || ttt.turn !== role) {
        return { nextState: prevState, shouldPersist: false };
      }
      const nextBoard = [...ttt.board];
      nextBoard[idx] = role === 'cat1' ? '🐾' : '🐟';
      const res = checkTicTacToeResult(nextBoard);
      let nextState: SharedState = {
        ...state,
        lastStatsUpdateTime: Math.max((state.lastStatsUpdateTime || 0) + 1, nowMs),
        onlineRooms: {
          ...state.onlineRooms,
          tictactoe: {
            ...ttt,
            board: nextBoard,
          },
        },
      };

      if (res.winnerSymbol) {
        nextState = {
          ...nextState,
          scores: applyScoreOutcome(nextState.scores, { kind: 'pvp_win', winner: role }),
          wallets: {
            ...nextState.wallets,
            [role]: {
              ...nextState.wallets[role],
              paws: nextState.wallets[role].paws + 8,
            },
          },
          onlineRooms: {
            ...nextState.onlineRooms,
            tictactoe: {
              ...nextState.onlineRooms.tictactoe,
              winner:
                role === 'cat1'
                  ? `${state.nicknames.cat1} ⭐`
                  : `${state.nicknames.cat2} 🚩`,
              winningLine: res.winningLine,
            },
          },
        };
        nextState = recordAch(nextState, role, { type: 'ttt_win' });
      } else if (res.isDraw) {
        nextState = {
          ...nextState,
          scores: applyScoreOutcome(nextState.scores, { kind: 'tie' }),
          wallets: {
            cat1: { ...nextState.wallets.cat1, paws: nextState.wallets.cat1.paws + 4 },
            cat2: { ...nextState.wallets.cat2, paws: nextState.wallets.cat2.paws + 4 },
          },
          onlineRooms: {
            ...nextState.onlineRooms,
            tictactoe: {
              ...nextState.onlineRooms.tictactoe,
              winner: 'Empate Coletivo 🤝',
              winningLine: null,
            },
          },
        };
        nextState = recordAch(nextState, 'cat1', { type: 'ttt_draw' });
        nextState = recordAch(nextState, 'cat2', { type: 'ttt_draw' });
      } else {
        nextState.onlineRooms.tictactoe.turn = role === 'cat1' ? 'cat2' : 'cat1';
      }
      return { nextState, shouldPersist: true };
    }

    case 'ttt:reset': {
      const nextStarter: PlayerRole = msg.starter === 'cat2' ? 'cat2' : 'cat1';
      return {
        nextState: {
          ...state,
          lastStatsUpdateTime: Math.max((state.lastStatsUpdateTime || 0) + 1, nowMs),
          onlineRooms: {
            ...state.onlineRooms,
            tictactoe: {
              ...state.onlineRooms.tictactoe,
              board: Array(9).fill(''),
              turn: nextStarter,
              winner: '',
              winningLine: null,
            },
          },
        },
        shouldPersist: true,
      };
    }

    case 'reaction:start': {
      const rec = state.onlineRooms.reaction;
      return {
        nextState: {
          ...state,
          lastStatsUpdateTime: Math.max((state.lastStatsUpdateTime || 0) + 1, nowMs),
          onlineRooms: {
            ...state.onlineRooms,
            reaction: {
              ...rec,
              state: 'waiting',
              winner: '',
              winnerTimeMs: undefined,
            },
          },
        },
        shouldPersist: true,
      };
    }

    case 'reaction:ready': {
      const rec = state.onlineRooms.reaction;
      if (rec.state !== 'waiting') return { nextState: prevState, shouldPersist: false };
      return {
        nextState: {
          ...state,
          lastStatsUpdateTime: Math.max((state.lastStatsUpdateTime || 0) + 1, nowMs),
          onlineRooms: {
            ...state.onlineRooms,
            reaction: {
              ...rec,
              state: 'ready',
            },
          },
        },
        shouldPersist: true,
      };
    }

    case 'reaction:tap': {
      const rec = state.onlineRooms.reaction;
      if (rec.state === 'ready') {
        const elapsedMs = typeof msg.elapsedMs === 'number' ? Math.max(40, msg.elapsedMs) : 250;
        let nextState: SharedState = {
          ...state,
          lastStatsUpdateTime: Math.max((state.lastStatsUpdateTime || 0) + 1, nowMs),
          wallets: {
            ...state.wallets,
            [role]: {
              ...state.wallets[role],
              paws: state.wallets[role].paws + 6,
            },
          },
          scores: applyScoreOutcome(state.scores, { kind: 'pvp_win', winner: role }),
          onlineRooms: {
            ...state.onlineRooms,
            reaction: {
              ...rec,
              state: 'finished',
              winner: role,
              winnerTimeMs: elapsedMs,
            },
          },
        };
        nextState = recordAch(nextState, role, { type: 'reaction_win', timeMs: elapsedMs });
        return { nextState, shouldPersist: true };
      }
      if (rec.state === 'waiting') {
        return {
          nextState: {
            ...state,
            lastStatsUpdateTime: Math.max((state.lastStatsUpdateTime || 0) + 1, nowMs),
            onlineRooms: {
              ...state.onlineRooms,
              reaction: {
                ...rec,
                state: 'idle',
                winner: '',
              },
            },
          },
          shouldPersist: true,
        };
      }
      return { nextState: prevState, shouldPersist: false };
    }

    case 'boardgame:move': {
      const game = msg.game === 'checkers' ? 'checkers' : 'chess';
      const boardEntry = state.boardGames[game];
      if (!boardEntry.config.isMatchStarted) return { nextState: prevState, shouldPersist: false };

      const isCat1White = boardEntry.config.colorAssignment === 'cat1_white';
      const actorColor =
        role === 'cat1'
          ? isCat1White
            ? 'white'
            : 'black'
          : isCat1White
          ? 'black'
          : 'white';
      if (boardEntry.state.turn !== actorColor) {
        return { nextState: prevState, shouldPersist: false };
      }

      const actorName =
        state.nicknames[role] || (role === 'cat1' ? 'Camarada 1' : 'Camarada 2');
      let nextState: SharedState = {
        ...state,
        lastStatsUpdateTime: Math.max((state.lastStatsUpdateTime || 0) + 1, nowMs),
      };

      if (game === 'chess') {
        const prevStatus = state.boardGames.chess.state.status;
        const nextChessState = applyChessMove(
          state.boardGames.chess.state,
          msg.move as Parameters<typeof applyChessMove>[1],
          actorName
        );
        nextState = {
          ...nextState,
          boardGames: {
            ...nextState.boardGames,
            chess: {
              ...nextState.boardGames.chess,
              state: nextChessState,
            },
          },
        };
        if (msg.move && typeof msg.move === 'object' && 'promotion' in msg.move && msg.move.promotion) {
          nextState = recordAch(nextState, role, { type: 'chess_promotion' });
        }
        if (prevStatus !== 'checkmate' && nextChessState.status === 'checkmate') {
          nextState = {
            ...nextState,
            wallets: {
              ...nextState.wallets,
              [role]: { ...nextState.wallets[role], paws: nextState.wallets[role].paws + 12 },
            },
            scores: applyScoreOutcome(nextState.scores, { kind: 'pvp_win', winner: role }),
          };
          nextState = recordAch(nextState, role, {
            type: 'chess_win',
            moveCount: nextChessState.moveHistory.length,
          });
        } else if (
          prevStatus !== 'stalemate' &&
          prevStatus !== 'draw' &&
          (nextChessState.status === 'stalemate' || nextChessState.status === 'draw')
        ) {
          nextState = {
            ...nextState,
            scores: applyScoreOutcome(nextState.scores, { kind: 'tie' }),
          };
        }
      } else {
        const prevStatus = state.boardGames.checkers.state.status;
        const nextCheckersState = applyCheckersMove(
          state.boardGames.checkers.state,
          msg.move as Parameters<typeof applyCheckersMove>[1],
          actorName
        );
        nextState = {
          ...nextState,
          boardGames: {
            ...nextState.boardGames,
            checkers: {
              ...nextState.boardGames.checkers,
              state: nextCheckersState,
            },
          },
        };
        if (nextCheckersState.mustContinueFrom) {
          nextState = recordAch(nextState, role, { type: 'checkers_multi_capture' });
        }
        if (prevStatus !== 'finished' && nextCheckersState.status === 'finished') {
          if (nextCheckersState.winner === 'draw') {
            nextState = {
              ...nextState,
              scores: applyScoreOutcome(nextState.scores, { kind: 'tie' }),
            };
          } else {
            nextState = {
              ...nextState,
              wallets: {
                ...nextState.wallets,
                [role]: { ...nextState.wallets[role], paws: nextState.wallets[role].paws + 12 },
              },
              scores: applyScoreOutcome(nextState.scores, { kind: 'pvp_win', winner: role }),
            };
            nextState = recordAch(nextState, role, { type: 'checkers_win' });
          }
        }
      }
      return { nextState, shouldPersist: true };
    }

    case 'boardgame:reset': {
      const game = msg.game === 'checkers' ? 'checkers' : 'chess';
      const curCfg = state.boardGames[game].config;
      const nextCfg = {
        ...curCfg,
        isMatchStarted: true,
        ...(curCfg.timeLimit
          ? { whiteTime: curCfg.timeLimit, blackTime: curCfg.timeLimit }
          : {}),
      };
      return {
        nextState: {
          ...state,
          lastStatsUpdateTime: Math.max((state.lastStatsUpdateTime || 0) + 1, nowMs),
          boardGames: {
            ...state.boardGames,
            [game]:
              game === 'chess'
                ? { state: createInitialChessState(), config: nextCfg }
                : { state: createInitialCheckersState(), config: nextCfg },
          },
        },
        shouldPersist: true,
      };
    }

    case 'boardgame:config': {
      const game = msg.game === 'checkers' ? 'checkers' : 'chess';
      const cur = state.boardGames[game].config;
      return {
        nextState: {
          ...state,
          lastStatsUpdateTime: Math.max((state.lastStatsUpdateTime || 0) + 1, nowMs),
          boardGames: {
            ...state.boardGames,
            [game]: {
              ...state.boardGames[game],
              config: {
                ...cur,
                ...((msg.config && typeof msg.config === 'object' ? msg.config : {}) as Partial<typeof cur>),
              },
            },
          },
        },
        shouldPersist: true,
      };
    }

    case 'boardgame:chat': {
      const game = msg.game === 'checkers' ? 'checkers' : 'chess';
      const text = String(msg.text || '').trim().slice(0, 120);
      if (!text) return { nextState: prevState, shouldPersist: false };
      const author =
        state.nicknames[role] || (role === 'cat1' ? 'Camarada 1' : 'Camarada 2');
      const cfg = state.boardGames[game].config;
      return {
        nextState: {
          ...state,
          lastStatsUpdateTime: Math.max((state.lastStatsUpdateTime || 0) + 1, nowMs),
          boardGames: {
            ...state.boardGames,
            [game]: {
              ...state.boardGames[game],
              config: {
                ...cfg,
                chatMessages: [
                  ...cfg.chatMessages.slice(-49),
                  {
                    id: `${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
                    author,
                    text,
                    time: new Date(nowMs).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                  },
                ],
              },
            },
          },
        },
        shouldPersist: true,
      };
    }

    default:
      return { nextState: prevState, shouldPersist: false };
  }
}
