import { applyAchievementEvent, mergePlayerStats, mergeUnlockedMaps } from './achievements.ts';
import { createDefaultAchievementStats, createDefaultSudokuOnlineState } from './defaultState.ts';
import { sanitizeGalleryItems } from './gallery.ts';
import { normalizeScores } from './scores.ts';
import type { SharedState } from '../types/game.ts';

/**
 * Preserves live in-memory WebSocket presence flags for clients currently
 * connected to *this* Node instance when reloading shared room state.
 */
export function preserveTransientPresence(
  nextState: SharedState,
  currentState?: SharedState | null
): SharedState {
  if (!currentState) return nextState;

  return {
    ...nextState,
    activeGames: currentState.activeGames || nextState.activeGames || { cat1: null, cat2: null },
    onlineRooms: {
      ...nextState.onlineRooms,
      jokenpo: {
        ...nextState.onlineRooms.jokenpo,
        p1InRoom: Boolean(currentState.onlineRooms?.jokenpo?.p1InRoom),
        p2InRoom: Boolean(currentState.onlineRooms?.jokenpo?.p2InRoom),
      },
      reaction: {
        ...nextState.onlineRooms.reaction,
        p1InRoom: Boolean(currentState.onlineRooms?.reaction?.p1InRoom),
        p2InRoom: Boolean(currentState.onlineRooms?.reaction?.p2InRoom),
      },
      tictactoe: {
        ...nextState.onlineRooms.tictactoe,
        p1InRoom: Boolean(currentState.onlineRooms?.tictactoe?.p1InRoom),
        p2InRoom: Boolean(currentState.onlineRooms?.tictactoe?.p2InRoom),
      },
      airhockey: {
        ...nextState.onlineRooms.airhockey,
        p1InRoom: Boolean(currentState.onlineRooms?.airhockey?.p1InRoom),
        p2InRoom: Boolean(currentState.onlineRooms?.airhockey?.p2InRoom),
      },
      sudoku: {
        ...(nextState.onlineRooms.sudoku || createDefaultSudokuOnlineState()),
        p1InRoom: Boolean(currentState.onlineRooms?.sudoku?.p1InRoom),
        p2InRoom: Boolean(currentState.onlineRooms?.sudoku?.p2InRoom),
      },
    },
    boardGames: {
      chess: {
        ...nextState.boardGames.chess,
        config: {
          ...nextState.boardGames.chess.config,
          p1InRoom: Boolean(currentState.boardGames?.chess?.config?.p1InRoom),
          p2InRoom: Boolean(currentState.boardGames?.chess?.config?.p2InRoom),
        },
      },
      checkers: {
        ...nextState.boardGames.checkers,
        config: {
          ...nextState.boardGames.checkers.config,
          p1InRoom: Boolean(currentState.boardGames?.checkers?.config?.p1InRoom),
          p2InRoom: Boolean(currentState.boardGames?.checkers?.config?.p2InRoom),
        },
      },
    },
  };
}

/**
 * Merges a newer external room snapshot (`dbState`) with pending unsaved dirty fields (`dirtyKeys`)
 * from the local server instance so concurrent saves never overwrite unrelated updates.
 */
export function mergeExternalRoomState(
  dbState: SharedState,
  localState: SharedState,
  dirtyKeys: Iterable<string>
): SharedState {
  const dirty = new Set(dirtyKeys);
  if (dirty.size === 0) {
    return preserveTransientPresence(dbState, localState);
  }

  const merged: SharedState = { ...dbState };

  for (const key of dirty) {
    switch (key) {
      case 'cat1':
        merged.cat1 = { ...localState.cat1 };
        break;
      case 'cat2':
        merged.cat2 = { ...localState.cat2 };
        break;
      case 'nicknames':
        merged.nicknames = { ...localState.nicknames };
        break;
      case 'loveScore':
        merged.loveScore = localState.loveScore;
        break;
      case 'streak':
        merged.streak = { ...localState.streak };
        break;
      case 'scores':
        merged.scores = normalizeScores(localState.scores);
        break;
      case 'presence':
        merged.presence = { ...localState.presence };
        break;
      case 'wallets':
        merged.wallets = {
          cat1: { ...localState.wallets.cat1 },
          cat2: { ...localState.wallets.cat2 },
        };
        break;
      case 'inventories':
        merged.inventories = {
          cat1: { ...localState.inventories.cat1 },
          cat2: { ...localState.inventories.cat2 },
        };
        break;
      case 'unlockedItems':
        merged.unlockedItems = {
          cat1: Array.from(new Set([...(dbState.unlockedItems?.cat1 || []), ...(localState.unlockedItems?.cat1 || [])])),
          cat2: Array.from(new Set([...(dbState.unlockedItems?.cat2 || []), ...(localState.unlockedItems?.cat2 || [])])),
        };
        break;
      case 'lastRewardDates':
        merged.lastRewardDates = { ...localState.lastRewardDates };
        break;
      case 'letters': {
        const byId = new Map<string, SharedState['letters'][number]>();
        for (const msg of dbState.letters || []) byId.set(msg.id, msg);
        for (const msg of localState.letters || []) byId.set(msg.id, msg);
        merged.letters = Array.from(byId.values())
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-80);
        break;
      }
      case 'onlineRooms':
        merged.onlineRooms = {
          ...dbState.onlineRooms,
          ...localState.onlineRooms,
        };
        break;
      case 'boardGames':
        merged.boardGames = {
          ...dbState.boardGames,
          ...localState.boardGames,
        };
        break;
      case 'skyHopLeaderboard': {
        const combined = [...(dbState.skyHopLeaderboard || []), ...(localState.skyHopLeaderboard || [])];
        const dedup = new Map<string, NonNullable<SharedState['skyHopLeaderboard']>[number]>();
        for (const entry of combined) {
          dedup.set(entry.id, entry);
        }
        merged.skyHopLeaderboard = Array.from(dedup.values())
          .sort((a, b) => b.altitude - a.altitude || b.timestamp - a.timestamp)
          .slice(0, 10);
        break;
      }
      case 'achievements':
        merged.achievements = {
          cat1: mergeUnlockedMaps(dbState.achievements?.cat1, localState.achievements?.cat1),
          cat2: mergeUnlockedMaps(dbState.achievements?.cat2, localState.achievements?.cat2),
        };
        break;
      case 'achievementStats':
        merged.achievementStats = {
          cat1: mergePlayerStats(
            dbState.achievementStats?.cat1 || createDefaultAchievementStats(),
            localState.achievementStats?.cat1
          ),
          cat2: mergePlayerStats(
            dbState.achievementStats?.cat2 || createDefaultAchievementStats(),
            localState.achievementStats?.cat2
          ),
        };
        break;
      case 'galleryItems':
        merged.galleryItems = sanitizeGalleryItems(localState.galleryItems);
        break;
      default:
        break;
    }
  }

  merged.lastStatsUpdateTime = Math.max(
    dbState.lastStatsUpdateTime || 0,
    localState.lastStatsUpdateTime || 0
  );

  // Keep reference to applyAchievementEvent helper intact
  void applyAchievementEvent;
  return preserveTransientPresence(merged, localState);
}

