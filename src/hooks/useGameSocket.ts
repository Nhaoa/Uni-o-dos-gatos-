import { useCallback, useEffect, useRef, useState } from 'react';
import { createDefaultSharedState } from '../logic/defaultState';
import { applyClientGameAction } from '../logic/clientGameAction';
import {
  fetchPublicRoomMetaStatic,
  isStaticHostingMode,
  markBackendUnavailable,
  readCachedRoomState,
  writeCachedRoomState,
} from '../lib/staticRoomService';
import { AirHockeyOnlineState, PlayerRole, SharedState } from '../types/game';

export const DEFAULT_ROOM_ID = 'ninho_de_amor_fixo';

interface UseGameSocketOptions {
  myRole: PlayerRole;
  idToken: string | null;
  enabled: boolean;
  devBypass?: boolean;
}

export function useGameSocket({
  myRole,
  idToken,
  enabled,
  devBypass = false,
}: UseGameSocketOptions) {
  const [state, setState] = useState<SharedState>(() => {
    if (isStaticHostingMode()) {
      return readCachedRoomState(DEFAULT_ROOM_ID) || createDefaultSharedState();
    }
    return createDefaultSharedState();
  });
  const [hasRoomPassword, setHasRoomPassword] = useState(false);
  const [connected, setConnected] = useState(false);
  const [hasServerState, setHasServerState] = useState(false);
  const [airHockeyFrame, setAirHockeyFrame] = useState<AirHockeyOnlineState | null>(null);
  const [staticFallbackActive, setStaticFallbackActive] = useState<boolean>(() =>
    isStaticHostingMode()
  );

  const wsRef = useRef<WebSocket | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roleRef = useRef<PlayerRole>(myRole);
  const tokenRef = useRef<string | null>(idToken);
  roleRef.current = myRole;
  tokenRef.current = idToken;

  const isStatic = staticFallbackActive || isStaticHostingMode();

  const broadcastState = useCallback((nextState: SharedState) => {
    writeCachedRoomState(DEFAULT_ROOM_ID, nextState);
    if (channelRef.current) {
      try {
        channelRef.current.postMessage({ type: 'state:sync', state: nextState });
      } catch {
        // ignore channel errors
      }
    }
  }, []);

  // Fetch lightweight public room metadata (whether a room password is set)
  useEffect(() => {
    let active = true;

    const loadStaticMeta = async () => {
      const meta = await fetchPublicRoomMetaStatic(DEFAULT_ROOM_ID);
      if (active) {
        setHasRoomPassword(meta.hasPassword);
      }
    };

    if (isStatic) {
      void loadStaticMeta();
      return () => {
        active = false;
      };
    }

    fetch(`/api/room/public-meta?roomId=${encodeURIComponent(DEFAULT_ROOM_ID)}`)
      .then(async (res) => {
        const contentType = res.headers.get('content-type') || '';
        if (!res.ok || !contentType.includes('application/json')) {
          markBackendUnavailable();
          setStaticFallbackActive(true);
          await loadStaticMeta();
          return;
        }
        const data = (await res.json()) as { hasPassword?: boolean };
        if (active && data) {
          setHasRoomPassword(Boolean(data.hasPassword));
        }
      })
      .catch(async () => {
        markBackendUnavailable();
        setStaticFallbackActive(true);
        await loadStaticMeta();
      });

    return () => {
      active = false;
    };
  }, [isStatic]);

  // Real-time transport: WebSocket on Node server, or Firestore + BroadcastChannel in static hosting
  useEffect(() => {
    if (!enabled || (!idToken && !devBypass)) {
      setConnected(false);
      setHasServerState(false);
      wsRef.current?.close();
      wsRef.current = null;
      channelRef.current?.close();
      channelRef.current = null;
      return;
    }

    if (isStatic) {
      wsRef.current?.close();
      wsRef.current = null;
      setConnected(true);
      setHasServerState(true);

      if (typeof BroadcastChannel !== 'undefined') {
        const ch = new BroadcastChannel(`uniao_camaradas_room_${DEFAULT_ROOM_ID}`);
        channelRef.current = ch;
        ch.onmessage = (ev) => {
          const msg = ev.data as { type?: string; state?: SharedState } | null;
          if (msg?.type === 'state:sync' && msg.state) {
            setState((prev) => {
              const incomingTs = Number(msg.state?.lastStatsUpdateTime || 0);
              const prevTs = Number(prev.lastStatsUpdateTime || 0);
              if (incomingTs <= prevTs) return prev;
              if (msg.state?.onlineRooms?.airhockey) {
                setAirHockeyFrame(msg.state.onlineRooms.airhockey);
              }
              return msg.state!;
            });
          }
        };
      }

      return () => {
        if (reactionTimerRef.current) {
          clearTimeout(reactionTimerRef.current);
          reactionTimerRef.current = null;
        }
        channelRef.current?.close();
        channelRef.current = null;
      };
    }

    let closedByUser = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${proto}//${window.location.host}/ws`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        ws.send(
          JSON.stringify({
            type: 'auth',
            roomId: DEFAULT_ROOM_ID,
            role: roleRef.current,
            idToken: tokenRef.current,
            devBypass: Boolean(!tokenRef.current && devBypass),
          })
        );
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data));
          if (msg.type === 'state:sync' && msg.state) {
            setState(msg.state);
            setHasServerState(true);
            if (msg.state.onlineRooms?.airhockey) {
              setAirHockeyFrame(msg.state.onlineRooms.airhockey);
            }
          } else if (msg.type === 'airhockey:frame' && msg.airhockey) {
            setAirHockeyFrame(msg.airhockey);
          } else if (msg.type === 'auth:error') {
            setConnected(false);
          }
        } catch {
          // ignore invalid JSON
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        if (!closedByUser) {
          reconnectTimer = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      closedByUser = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [enabled, idToken, devBypass, isStatic]);

  // Notify server when role changes
  useEffect(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'role:switch', role: myRole }));
    }
  }, [myRole]);

  const sendSocket = useCallback(
    (payload: Record<string, unknown>) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
        return true;
      }

      if (isStatic) {
        if (payload.type === 'state:patch') {
          return true;
        }
        setState((prev) => {
          const result = applyClientGameAction(prev, roleRef.current, payload);
          if (result.nextState === prev) return prev;
          if (result.shouldPersist) {
            broadcastState(result.nextState);
          }
          return result.nextState;
        });

        if (payload.type === 'reaction:start') {
          if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
          const delayMs = 1500 + Math.floor(Math.random() * 2000);
          reactionTimerRef.current = setTimeout(() => {
            reactionTimerRef.current = null;
            setState((prev) => {
              const readyRes = applyClientGameAction(prev, roleRef.current, {
                type: 'reaction:ready',
              });
              if (readyRes.nextState !== prev && readyRes.shouldPersist) {
                broadcastState(readyRes.nextState);
              }
              return readyRes.nextState;
            });
          }, delayMs);
        }
        return true;
      }

      return false;
    },
    [isStatic, broadcastState]
  );

  const patchState = useCallback(
    (updater: (prev: SharedState) => Partial<SharedState>) => {
      setState((prev) => {
        const patch = updater(prev);
        const next: SharedState = {
          ...prev,
          ...patch,
          lastStatsUpdateTime: Math.max((prev.lastStatsUpdateTime || 0) + 1, Date.now()),
        };
        if (isStatic) {
          broadcastState(next);
        } else {
          sendSocket({ type: 'state:patch', patch });
        }
        return next;
      });
    },
    [sendSocket, isStatic, broadcastState]
  );

  const applyExternalSyncState = useCallback(
    (nextState: SharedState) => {
      setState(nextState);
      if (nextState.onlineRooms?.airhockey) {
        setAirHockeyFrame(nextState.onlineRooms.airhockey);
      }
      if (isStatic) {
        broadcastState(nextState);
        return;
      }
      sendSocket({
        type: 'state:patch',
        syncTimestamp: nextState.lastStatsUpdateTime,
        patch: {
          nicknames: nextState.nicknames,
          loveScore: nextState.loveScore,
          streak: nextState.streak,
          scores: nextState.scores,
          presence: nextState.presence,
          wallets: nextState.wallets,
          inventories: nextState.inventories,
          unlockedItems: nextState.unlockedItems,
          lastRewardDates: nextState.lastRewardDates,
          cat1: nextState.cat1,
          cat2: nextState.cat2,
          letters: nextState.letters,
          onlineRooms: nextState.onlineRooms,
          boardGames: nextState.boardGames,
          skyHopLeaderboard: nextState.skyHopLeaderboard,
          achievements: nextState.achievements,
          achievementStats: nextState.achievementStats,
          galleryItems: nextState.galleryItems,
          galleryDriveFolder: nextState.galleryDriveFolder,
        },
      });
    },
    [sendSocket, isStatic, broadcastState]
  );

  return {
    state,
    setState,
    hasRoomPassword,
    setHasRoomPassword,
    connected,
    hasServerState,
    airHockeyFrame,
    sendSocket,
    patchState,
    applyExternalSyncState,
  };
}
