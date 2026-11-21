import { useEffect, useRef } from 'react';
import { getWorldDimensions, renderGameWorld, type ActiveParticle } from '../game/pixelRenderer.ts';
import type {
  Direction,
  InteractableSpot,
  PlayerState,
  RoomWorldState,
  WorldFxEvent,
} from '../shared/gameTypes.ts';
import { clampPlayerPosition, INTERACTABLE_SPOTS, PLAYER_SPEED } from '../shared/worldData.ts';

interface GameCanvasProps {
  world: RoomWorldState;
  localPlayerId: string;
  joystickVector: { x: number; y: number };
  pendingFx: WorldFxEvent[];
  onConsumeFx: () => void;
  onMoveEmit: (payload: {
    x: number;
    y: number;
    dir: Direction;
    action: PlayerState['action'];
  }) => void;
  onNearestSpotChange: (spot: InteractableSpot | null) => void;
  onTriggerInteract: (spot: InteractableSpot) => void;
  onOpenChat: () => void;
  onOpenShop: () => void;
  remoteSyncRef: React.MutableRefObject<Partial<PlayerState> | null>;
}

export function GameCanvas({
  world,
  localPlayerId,
  joystickVector,
  pendingFx,
  onConsumeFx,
  onMoveEmit,
  onNearestSpotChange,
  onTriggerInteract,
  onOpenChat,
  onOpenShop,
  remoteSyncRef,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef(world);
  worldRef.current = world;

  const joyRef = useRef(joystickVector);
  joyRef.current = joystickVector;

  const keysRef = useRef<Set<string>>(new Set());
  const localPosRef = useRef<{
    x: number;
    y: number;
    dir: Direction;
    scene: PlayerState['scene'];
  }>({
    x: world.players[localPlayerId]?.x ?? 565,
    y: world.players[localPlayerId]?.y ?? 375,
    dir: world.players[localPlayerId]?.dir ?? 'down',
    scene: world.players[localPlayerId]?.scene ?? 'island',
  });

  const partnerInterpRef = useRef<{ x: number; y: number; scene: string } | null>(null);
  const cameraRef = useRef<{ x: number; y: number }>({
    x: localPosRef.current.x,
    y: localPosRef.current.y,
  });
  const particlesRef = useRef<ActiveParticle[]>([]);
  const lastEmitAtRef = useRef(0);
  const lastWasMovingRef = useRef(false);
  const nearestSpotRef = useRef<InteractableSpot | null>(null);

  // Sync local position when server changes scene (e.g. entering/exiting cottage or sitting)
  const serverSelf = world.players[localPlayerId];
  useEffect(() => {
    if (!serverSelf) return;
    if (
      serverSelf.scene !== localPosRef.current.scene ||
      serverSelf.action === 'sit' ||
      serverSelf.action === 'fish'
    ) {
      localPosRef.current = {
        x: serverSelf.x,
        y: serverSelf.y,
        dir: serverSelf.dir,
        scene: serverSelf.scene,
      };
    }
  }, [serverSelf?.scene, serverSelf?.action, serverSelf?.x, serverSelf?.y, serverSelf?.dir]);

  // Spawn FX particles when server emits world:fx
  useEffect(() => {
    if (pendingFx.length === 0) return;
    const currentScene = localPosRef.current.scene;
    for (const fx of pendingFx) {
      if (fx.scene !== currentScene) continue;
      const count = fx.type === 'confetti' || fx.type === 'unlock' ? 16 : 7;
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          id: `${fx.id}_${i}`,
          type: fx.type,
          x: fx.x + (Math.random() - 0.5) * 26,
          y: fx.y + (Math.random() - 0.5) * 14,
          vx: (Math.random() - 0.5) * 35,
          vy: -28 - Math.random() * 35,
          life: 1.1,
          maxLife: 1.1,
        });
      }
      if (fx.label) {
        particlesRef.current.push({
          id: `${fx.id}_lbl`,
          type: fx.type,
          x: fx.x,
          y: fx.y - 16,
          vx: 0,
          vy: -22,
          life: 1.5,
          maxLife: 1.5,
          label: fx.label,
        });
      }
    }
    onConsumeFx();
  }, [pendingFx, onConsumeFx]);

  // Keyboard listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      const key = e.key.toLowerCase();
      keysRef.current.add(key);

      if (key === 'e' || key === ' ') {
        if (nearestSpotRef.current) {
          e.preventDefault();
          onTriggerInteract(nearestSpotRef.current);
        }
      } else if (key === 'm') {
        onOpenChat();
      } else if (key === 'b') {
        onOpenShop();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [onTriggerInteract, onOpenChat, onOpenShop]);

  // Main 60fps Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const findNearestSpot = (
      state: RoomWorldState,
      scene: PlayerState['scene'],
      px: number,
      py: number
    ): InteractableSpot | null => {
      let best: InteractableSpot | null = null;
      let bestDist = Infinity;

      for (const spot of INTERACTABLE_SPOTS) {
        if (spot.scene !== scene) continue;
        if (spot.id === 'gazebo_telescope' && !state.gazeboUnlocked) continue;
        const d = Math.hypot(spot.x - px, spot.y - py);
        if (d <= spot.radius && d < bestDist) {
          bestDist = d;
          best = spot;
        }
      }

      if (scene === 'island') {
        for (const plot of state.flowers) {
          const d = Math.hypot(plot.x - px, plot.y - py);
          if (d <= 44 && d < bestDist) {
            bestDist = d;
            best = {
              id: plot.id,
              scene: 'island',
              x: plot.x,
              y: plot.y,
              radius: 44,
              label:
                plot.stage === 0
                  ? 'Plant Flower Seed'
                  : plot.stage < 3
                    ? 'Water Flower'
                    : 'Pick Bloomed Flower',
              kind: 'flower_plot',
              meta: { plotId: plot.id },
            };
          }
        }
      }

      for (const dec of state.decorations) {
        if (dec.scene !== scene) continue;
        if (dec.itemId === 'paper_lantern' || dec.itemId === 'fairy_lights' || dec.itemId === 'tea_set') {
          const d = Math.hypot(dec.x - px, dec.y - py);
          if (d <= 42 && d < bestDist) {
            bestDist = d;
            best = {
              id: dec.id,
              scene,
              x: dec.x,
              y: dec.y,
              radius: 42,
              label: 'Toggle Decor',
              kind: 'lantern',
            };
          }
        }
      }

      return best;
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const state = worldRef.current;
      const serverPlayer = state.players[localPlayerId];
      if (!serverPlayer) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      // Read input vector (keyboard + joystick)
      let vx = joyRef.current.x;
      let vy = joyRef.current.y;
      const keys = keysRef.current;
      if (keys.has('w') || keys.has('arrowup')) vy -= 1;
      if (keys.has('s') || keys.has('arrowdown')) vy += 1;
      if (keys.has('a') || keys.has('arrowleft')) vx -= 1;
      if (keys.has('d') || keys.has('arrowright')) vx += 1;

      const mag = Math.hypot(vx, vy);
      const isMoving = mag > 0.1;

      if (isMoving) {
        const nx = (vx / Math.max(1, mag)) * PLAYER_SPEED * dt;
        const ny = (vy / Math.max(1, mag)) * PLAYER_SPEED * dt;
        const clamped = clampPlayerPosition(
          localPosRef.current.scene,
          localPosRef.current.x + nx,
          localPosRef.current.y + ny,
          state.gazeboUnlocked
        );
        localPosRef.current.x = clamped.x;
        localPosRef.current.y = clamped.y;

        if (Math.abs(vx) > Math.abs(vy)) {
          localPosRef.current.dir = vx < 0 ? 'left' : 'right';
        } else {
          localPosRef.current.dir = vy < 0 ? 'up' : 'down';
        }
      }

      // Emit position updates at ~20Hz while moving or when stopping
      if ((isMoving && now - lastEmitAtRef.current > 50) || (!isMoving && lastWasMovingRef.current)) {
        lastEmitAtRef.current = now;
        onMoveEmit({
          x: localPosRef.current.x,
          y: localPosRef.current.y,
          dir: localPosRef.current.dir,
          action: isMoving ? 'walk' : 'idle',
        });
      }
      lastWasMovingRef.current = isMoving;

      // Build predicted local player view
      const localView: PlayerState = {
        ...serverPlayer,
        x: localPosRef.current.x,
        y: localPosRef.current.y,
        dir: localPosRef.current.dir,
        scene: localPosRef.current.scene,
        action: isMoving
          ? 'walk'
          : serverPlayer.action === 'walk'
            ? 'idle'
            : serverPlayer.action,
      };

      // Partner interpolation
      const rawPartner =
        Object.values(state.players).find((p) => p.id !== localPlayerId) || null;
      let partnerView: PlayerState | null = rawPartner;
      if (rawPartner) {
        const synced = remoteSyncRef.current;
        const targetX = synced?.id === rawPartner.id && synced.x !== undefined ? synced.x : rawPartner.x;
        const targetY = synced?.id === rawPartner.id && synced.y !== undefined ? synced.y : rawPartner.y;
        const targetScene =
          synced?.id === rawPartner.id && synced.scene !== undefined
            ? synced.scene
            : rawPartner.scene;
        const targetDir =
          synced?.id === rawPartner.id && synced.dir !== undefined ? synced.dir : rawPartner.dir;
        const targetAction =
          synced?.id === rawPartner.id && synced.action !== undefined
            ? synced.action
            : rawPartner.action;

        if (!partnerInterpRef.current || partnerInterpRef.current.scene !== targetScene) {
          partnerInterpRef.current = { x: targetX, y: targetY, scene: targetScene };
        } else {
          partnerInterpRef.current.x += (targetX - partnerInterpRef.current.x) * Math.min(1, dt * 14);
          partnerInterpRef.current.y += (targetY - partnerInterpRef.current.y) * Math.min(1, dt * 14);
        }

        partnerView = {
          ...rawPartner,
          x: partnerInterpRef.current.x,
          y: partnerInterpRef.current.y,
          scene: targetScene,
          dir: targetDir,
          action: targetAction,
        };
      }

      // Update nearest interactable spot
      const spot = findNearestSpot(state, localView.scene, localView.x, localView.y);
      if (spot?.id !== nearestSpotRef.current?.id || spot?.label !== nearestSpotRef.current?.label) {
        nearestSpotRef.current = spot;
        onNearestSpotChange(spot);
      }

      // Camera smooth follow clamped softly to scene bounds
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const dims = getWorldDimensions(localView.scene);
      let targetCamX = localView.x;
      let targetCamY = localView.y;
      if (vw < dims.width) {
        targetCamX = Math.max(vw / 2, Math.min(dims.width - vw / 2, localView.x));
      } else {
        targetCamX = dims.width / 2;
      }
      if (vh < dims.height) {
        targetCamY = Math.max(vh / 2, Math.min(dims.height - vh / 2, localView.y));
      } else {
        targetCamY = dims.height / 2;
      }

      cameraRef.current.x += (targetCamX - cameraRef.current.x) * Math.min(1, dt * 10);
      cameraRef.current.y += (targetCamY - cameraRef.current.y) * Math.min(1, dt * 10);

      // Update particles
      const alive: ActiveParticle[] = [];
      for (const pt of particlesRef.current) {
        pt.life -= dt;
        if (pt.life > 0) {
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          alive.push(pt);
        }
      }
      particlesRef.current = alive;

      renderGameWorld(ctx, {
        width: vw,
        height: vh,
        state,
        localPlayer: localView,
        partnerPlayer: partnerView,
        nearestSpot: spot,
        particles: alive,
        camera: cameraRef.current,
        time: now,
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [localPlayerId, onMoveEmit, onNearestSpotChange, remoteSyncRef]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 block h-full w-full touch-none"
    />
  );
}
