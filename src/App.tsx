/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { soundEngine } from './audio/soundEngine.ts';
import { GameCanvas } from './components/GameCanvas.tsx';
import { GameHUD, type ActiveDrawer } from './components/GameHUD.tsx';
import { LobbyScreen } from './components/LobbyScreen.tsx';
import { VirtualJoystick } from './components/VirtualJoystick.tsx';
import type {
  CharacterType,
  Direction,
  EmoteType,
  InteractableSpot,
  PlayerState,
  RoomWorldState,
  SkyMode,
  WorldFxEvent,
} from './shared/gameTypes.ts';

function getSessionPlayerId(): string {
  try {
    let id = sessionStorage.getItem('dbt_player_id');
    if (!id) {
      id = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      sessionStorage.setItem('dbt_player_id', id);
    }
    return id;
  } catch {
    return `p_${Math.random().toString(36).slice(2, 9)}`;
  }
}

export default function App() {
  const initialRoomParam = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('room') || '').trim().toUpperCase().slice(0, 4);
  }, []);

  const playerId = useMemo(() => getSessionPlayerId(), []);
  const socketRef = useRef<Socket | null>(null);
  const remoteSyncRef = useRef<Partial<PlayerState> | null>(null);

  const [world, setWorld] = useState<RoomWorldState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>('none');
  const [nearestSpot, setNearestSpot] = useState<InteractableSpot | null>(null);
  const [joystickVector, setJoystickVector] = useState({ x: 0, y: 0 });
  const [pendingFx, setPendingFx] = useState<WorldFxEvent[]>([]);
  const [toastText, setToastText] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sessionCredentialsRef = useRef<{
    roomCode: string;
    name: string;
    character: CharacterType;
    accentColor: string;
  } | null>(null);

  const showToast = useCallback((text: string) => {
    setToastText(text);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastText(null), 3600);
  }, []);

  useEffect(() => {
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Auto-rejoin room if reconnecting after brief mobile network drop
      const creds = sessionCredentialsRef.current;
      if (creds) {
        socket.emit('room:join', { ...creds, playerId });
      }
    });

    socket.on('world:state', (nextState: RoomWorldState) => {
      setWorld(nextState);
    });

    socket.on('player:sync', (delta: Partial<PlayerState>) => {
      remoteSyncRef.current = delta;
    });

    socket.on('world:fx', (fx: WorldFxEvent) => {
      setPendingFx((prev) => [...prev, fx]);
      if (fx.type === 'door') soundEngine.playDoor();
      else if (fx.type === 'bell') soundEngine.playBell(fx.label?.includes('Moon'));
      else if (fx.type === 'hearts') soundEngine.playHeart();
      else if (fx.type === 'splash') soundEngine.playSplash();
      else if (fx.type === 'unlock' || fx.type === 'confetti') soundEngine.playUnlock();
      else soundEngine.playSparkle();
    });

    socket.on('world:toast', (payload: { text: string }) => {
      showToast(payload.text);
    });

    return () => {
      soundEngine.stopMusicBox();
      socket.disconnect();
    };
  }, [playerId, showToast]);

  // Sync music box playback state
  useEffect(() => {
    if (world?.musicBoxOn && !muted) {
      soundEngine.startMusicBox();
    } else {
      soundEngine.stopMusicBox();
    }
  }, [world?.musicBoxOn, muted]);

  const handleCreateRoom = useCallback(
    (opts: { name: string; character: CharacterType; accentColor: string }) => {
      const socket = socketRef.current;
      if (!socket) return;
      setLoading(true);
      setError(null);
      socket.emit('room:create', { ...opts, playerId }, (res: { ok: boolean; roomCode?: string; error?: string }) => {
        setLoading(false);
        if (!res.ok || !res.roomCode) {
          setError(res.error || 'Could not create room.');
          return;
        }
        sessionCredentialsRef.current = { ...opts, roomCode: res.roomCode };
        window.history.replaceState(null, '', `/?room=${res.roomCode}`);
        showToast(`Room ${res.roomCode} ready! Share the code with your partner.`);
      });
    },
    [playerId, showToast]
  );

  const handleJoinRoom = useCallback(
    (opts: { roomCode: string; name: string; character: CharacterType; accentColor: string }) => {
      const socket = socketRef.current;
      if (!socket) return;
      setLoading(true);
      setError(null);
      socket.emit('room:join', { ...opts, playerId }, (res: { ok: boolean; roomCode?: string; error?: string }) => {
        setLoading(false);
        if (!res.ok || !res.roomCode) {
          setError(res.error || 'Could not join room.');
          return;
        }
        sessionCredentialsRef.current = { ...opts, roomCode: res.roomCode };
        window.history.replaceState(null, '', `/?room=${res.roomCode}`);
      });
    },
    [playerId]
  );

  const handleLeaveRoom = useCallback(() => {
    sessionCredentialsRef.current = null;
    soundEngine.stopMusicBox();
    window.history.replaceState(null, '', '/');
    socketRef.current?.disconnect();
    socketRef.current?.connect();
    setWorld(null);
    setActiveDrawer('none');
    setNearestSpot(null);
  }, []);

  const handleMoveEmit = useCallback(
    (payload: { x: number; y: number; dir: Direction; action: PlayerState['action'] }) => {
      socketRef.current?.emit('player:move', payload);
    },
    []
  );

  const handleTriggerInteract = useCallback(
    (spot: InteractableSpot | null) => {
      if (!spot) return;
      if (spot.kind === 'mailbox') {
        setActiveDrawer('mailbox');
        return;
      }
      socketRef.current?.emit('world:interact', { spotId: spot.id });
    },
    []
  );

  const handleConsumeFx = useCallback(() => {
    setPendingFx([]);
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const localPlayer = world?.players[playerId];
  const partnerPlayer = world
    ? Object.values(world.players).find((p) => p.id !== playerId) || null
    : null;

  if (!world || !localPlayer) {
    return (
      <LobbyScreen
        initialRoomCode={initialRoomParam}
        loading={loading}
        error={error}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
      />
    );
  }

  const hs = world.hideAndSeek;
  const canTagSeeker =
    hs.active &&
    hs.phase === 'seeking' &&
    hs.seekerId === localPlayer.id &&
    !!partnerPlayer &&
    partnerPlayer.connected &&
    partnerPlayer.scene === localPlayer.scene &&
    Math.hypot(partnerPlayer.x - localPlayer.x, partnerPlayer.y - localPlayer.y) < 75;

  return (
    <main className="relative h-full w-full overflow-hidden bg-[#151828]">
      <GameCanvas
        world={world}
        localPlayerId={playerId}
        joystickVector={joystickVector}
        pendingFx={pendingFx}
        onConsumeFx={handleConsumeFx}
        onMoveEmit={handleMoveEmit}
        onNearestSpotChange={setNearestSpot}
        onTriggerInteract={handleTriggerInteract}
        onOpenChat={() => setActiveDrawer((d) => (d === 'chat' ? 'none' : 'chat'))}
        onOpenShop={() => setActiveDrawer((d) => (d === 'shop' ? 'none' : 'shop'))}
        remoteSyncRef={remoteSyncRef}
      />

      <GameHUD
        world={world}
        localPlayer={localPlayer}
        partnerPlayer={partnerPlayer}
        activeDrawer={activeDrawer}
        onCloseDrawer={() => setActiveDrawer('none')}
        onOpenDrawer={setActiveDrawer}
        muted={muted}
        onToggleMute={handleToggleMute}
        onCycleSky={(skyMode: SkyMode) => socketRef.current?.emit('world:skyMode', { skyMode })}
        onToggleHideAndSeek={() => socketRef.current?.emit('hideAndSeek:toggle')}
        onSendEmote={(emote: EmoteType) => socketRef.current?.emit('player:emote', { emote })}
        onSendChat={(text: string) => socketRef.current?.emit('player:chat', { text })}
        onAddMailboxNote={(text: string) => socketRef.current?.emit('mailbox:add', { text })}
        onBuyDecor={(itemId: string) => socketRef.current?.emit('decor:buyAndPlace', { itemId })}
        onLeaveRoom={handleLeaveRoom}
        toastText={toastText}
      />

      {/* Desktop Keyboard Hint */}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-20 hidden -translate-x-1/2 rounded-xl border border-[#F8F3E6]/10 bg-[#151828]/75 px-4 py-1.5 text-xs text-[#CBD5E1] backdrop-blur-md lg:block">
        WASD / Arrows to walk · E or Space to interact · M for Chat · B for Shop
      </div>

      <VirtualJoystick
        onMoveVector={(x, y) => setJoystickVector({ x, y })}
        onInteract={() => handleTriggerInteract(nearestSpot)}
        interactLabel={
          localPlayer.fishingState === 'bite'
            ? 'Reel In Fish!'
            : localPlayer.fishingState === 'waiting'
              ? 'Cancel Fishing'
              : nearestSpot?.label || null
        }
        canTagSeeker={canTagSeeker}
        onTagSeeker={() => socketRef.current?.emit('hideAndSeek:tag')}
        onQuickEmote={() => socketRef.current?.emit('player:emote', { emote: 'heart' })}
        onOpenChat={() => setActiveDrawer('chat')}
        onOpenShop={() => setActiveDrawer('shop')}
      />
    </main>
  );
}
