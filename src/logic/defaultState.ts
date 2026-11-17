import { DEFAULT_UNLOCKED_ITEMS } from './minigames';
import { createInitialChessState } from './chess';
import { createInitialCheckersState } from './checkers';
import { getDefaultStarterExhibits } from './gallery';
import {
  BoardMatchConfig,
  PlayerAchievementStats,
  SharedState,
  SudokuOnlineRoomState,
} from '../types/game';

export function createDefaultSudokuOnlineState(): SudokuOnlineRoomState {
  return {
    p1InRoom: false,
    p2InRoom: false,
    status: 'lobby',
    matchId: 1,
    size: 9,
    difficulty: 'medium',
    puzzle: [],
    solution: [],
    startedAt: null,
    winner: '',
    progress: {
      cat1: { filled: 0, totalToFill: 0, mistakes: 0, finished: false, elapsedMs: null },
      cat2: { filled: 0, totalToFill: 0, mistakes: 0, finished: false, elapsedMs: null },
    },
  };
}

export function createDefaultAchievementStats(): PlayerAchievementStats {
  return {
    skyhopMaxAltitude: 0,
    skyhopTotalAltitude: 0,
    skyhopFishEarned: 0,
    skyhopPawsEarned: 0,
    skyhopMaxPerfectCombo: 0,
    skyhopPortalsUsed: 0,
    skyhopGamesPlayed: 0,
    chessWins: 0,
    chessFastWins: 0,
    chessPromotions: 0,
    checkersWins: 0,
    checkersMultiCaptures: 0,
    airhockeyWins: 0,
    airhockeyShutouts: 0,
    airhockeyGoals: 0,
    tttWins: 0,
    tttDraws: 0,
    jokenpoWins: 0,
    jokenpoWinStreak: 0,
    jokenpoBestStreak: 0,
    reactionWins: 0,
    reactionBestMs: null,
    sudokuWins: 0,
    sudokuHard9Wins: 0,
    sudokuOnlineWins: 0,
    solitaireWins: 0,
    solitaireHardWins: 0,
    termoWins: 0,
    termoDuetoWins: 0,
    termoQuartetoWins: 0,
  };
}

export function createDefaultBoardConfig(
  p1Name = 'Camarada 1',
  p2Name = 'Camarada 2'
): BoardMatchConfig {
  return {
    playMode: 'bot',
    colorAssignment: 'cat1_white',
    whitePlayerName: p1Name,
    blackPlayerName: p2Name,
    timeLimit: null,
    whiteTime: 0,
    blackTime: 0,
    isMatchStarted: true,
    p1InRoom: false,
    p2InRoom: false,
    chatMessages: [],
  };
}

export function createDefaultSharedState(): SharedState {
  return {
    roomPassword: '',
    nicknames: { cat1: 'Camarada 1', cat2: 'Camarada 2' },
    loveScore: 85,
    streak: { current: 1, best: 1, totalDays: 1 },
    scores: { cat1Wins: 0, cat1Losses: 0, cat2Wins: 0, cat2Losses: 0, ties: 0 },
    presence: { syncedToday: false, lastSyncedDate: '' },
    wallets: {
      cat1: { fish: 5, paws: 40, coupleCoins: 1 },
      cat2: { fish: 5, paws: 40, coupleCoins: 1 },
    },
    inventories: {
      cat1: { food_bread: 2, food_milk: 1 },
      cat2: { food_bread: 2, food_milk: 1 },
    },
    unlockedItems: {
      cat1: [...DEFAULT_UNLOCKED_ITEMS],
      cat2: [...DEFAULT_UNLOCKED_ITEMS],
    },
    lastRewardDates: { cat1: '', cat2: '' },
    lastStatsUpdateTime: 0,
    cat1: {
      breed: 'white',
      outfit: 'none',
      outfitColor: '#e63946',
      accessory: 'star',
      accessoryColor: '#ffd166',
      expression: 'happy',
      eyeShape: 'almond',
      eyeColor: '#2b2725',
      pupil: 'round',
      pupilColor: '#ffffff',
      mouth: 'cat',
      bed: 'classic',
      bedColor: '#b91c1c',
      isSleeping: false,
      hunger: 80,
      energy: 85,
      happiness: 90,
      speech: 'Trabalhando pelo nosso amor... ☭🐾',
    },
    cat2: {
      breed: 'white',
      outfit: 'none',
      outfitColor: '#e63946',
      accessory: 'none',
      accessoryColor: '#e76f51',
      expression: 'happy',
      eyeShape: 'almond',
      eyeColor: '#2b2725',
      pupil: 'round',
      pupilColor: '#ffffff',
      mouth: 'cat',
      bed: 'classic',
      bedColor: '#b91c1c',
      isSleeping: false,
      hunger: 80,
      energy: 85,
      happiness: 90,
      speech: 'Esperando meu Camarada... ☭💖',
    },
    letters: [],
    activeGames: {
      cat1: null,
      cat2: null,
    },
    onlineRooms: {
      jokenpo: {
        p1InRoom: false,
        p2InRoom: false,
        p1Choice: '',
        p2Choice: '',
        state: 'waiting',
        roundId: 1,
      },
      reaction: {
        p1InRoom: false,
        p2InRoom: false,
        state: 'idle',
        winner: '',
      },
      tictactoe: {
        p1InRoom: false,
        p2InRoom: false,
        board: Array(9).fill(''),
        turn: 'cat1',
        winner: '',
        winningLine: null,
      },
      airhockey: {
        p1InRoom: false,
        p2InRoom: false,
        running: false,
        puck: { x: 0.5, y: 0.5, vx: 0, vy: 0 },
        p1: { x: 0.5, y: 0.84 },
        p2: { x: 0.5, y: 0.16 },
        score1: 0,
        score2: 0,
        winner: '',
      },
      sudoku: createDefaultSudokuOnlineState(),
    },
    boardGames: {
      chess: {
        state: createInitialChessState(),
        config: createDefaultBoardConfig(),
      },
      checkers: {
        state: createInitialCheckersState(),
        config: createDefaultBoardConfig(),
      },
    },
    skyHopLeaderboard: [],
    achievements: {
      cat1: {},
      cat2: {},
    },
    achievementStats: {
      cat1: createDefaultAchievementStats(),
      cat2: createDefaultAchievementStats(),
    },
    galleryItems: getDefaultStarterExhibits(),
  };
}
