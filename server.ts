import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server as SocketIOServer } from 'socket.io';
import type {
  CharacterType,
  Direction,
  EmoteType,
  FlowerType,
  PlayerAction,
  PlayerState,
  RoomWorldState,
  SceneId,
  SkyMode,
  WorldFxEvent,
} from './src/shared/gameTypes.ts';
import {
  clampPlayerPosition,
  createInitialCollectibles,
  createInitialDecorations,
  createInitialFlowers,
  DECOR_CATALOG,
  FISH_TABLE,
  FLOWER_TYPES,
  INTERACTABLE_SPOTS,
} from './src/shared/worldData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

interface RoomRuntime {
  state: RoomWorldState;
  fishingTimers: Map<string, ReturnType<typeof setTimeout>>;
  lastTogetherHeartAt: number;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
}

const rooms = new Map<string, RoomRuntime>();
const socketMeta = new Map<string, { roomCode: string; playerId: string }>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  if (rooms.has(code)) {
    return generateRoomCode();
  }
  return code;
}

function createRoom(roomCode: string): RoomRuntime {
  const state: RoomWorldState = {
    roomCode,
    skyMode: 'dusk',
    fireplaceOn: true,
    musicBoxOn: false,
    bellChimes: { bellA: 0, bellB: 0 },
    lanterns: [false, false, false, false],
    gazeboUnlocked: false,
    starShowerUntil: 0,
    togetherHearts: 0,
    flowers: createInitialFlowers(),
    collectibles: createInitialCollectibles(),
    decorations: createInitialDecorations(),
    inventory: {
      coins: 35,
      stars: 2,
      unlockedItems: ['potted_monstera', 'paper_lantern'],
      fishLog: [],
    },
    mailbox: [
      {
        id: 'note_welcome',
        author: 'Island Keeper',
        character: 'girl',
        text: 'Welcome home! Try ringing both Starlight Bells together to unlock the Gazebo.',
        timestamp: Date.now(),
      },
    ],
    hideAndSeek: {
      active: false,
      phase: 'idle',
      seekerId: null,
      countdownEnd: 0,
      winnerName: null,
      roundsPlayed: 0,
    },
    players: {},
  };

  return {
    state,
    fishingTimers: new Map(),
    lastTogetherHeartAt: 0,
    cleanupTimer: null,
  };
}

function emitFx(io: SocketIOServer, roomCode: string, fx: Omit<WorldFxEvent, 'id'>) {
  io.to(roomCode).emit('world:fx', {
    ...fx,
    id: `fx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  });
}

function emitToast(io: SocketIOServer, roomCode: string, text: string) {
  io.to(roomCode).emit('world:toast', { text });
}

function serializeRoom(room: RoomRuntime): RoomWorldState {
  return room.state;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, activeRooms: rooms.size });
  });

  app.get('/api/room/:code', (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      res.status(404).json({ exists: false, playerCount: 0 });
      return;
    }
    const connectedPlayers = Object.values(room.state.players).filter((p) => p.connected);
    res.json({
      exists: true,
      playerCount: connectedPlayers.length,
      takenCharacters: connectedPlayers.map((p) => p.character),
    });
  });

  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingInterval: 10000,
    pingTimeout: 15000,
  });

  io.on('connection', (socket) => {
    socket.on(
      'room:create',
      (
        payload: { name: string; character: CharacterType; accentColor: string; playerId?: string },
        cb?: (res: { ok: boolean; roomCode?: string; playerId?: string; error?: string }) => void
      ) => {
        const roomCode = generateRoomCode();
        const runtime = createRoom(roomCode);
        rooms.set(roomCode, runtime);

        const playerId = payload.playerId || `p_${socket.id}`;
        const cleanName = (payload.name || 'Player 1').trim().slice(0, 14) || 'Player 1';
        const player: PlayerState = {
          id: playerId,
          slot: 1,
          name: cleanName,
          character: payload.character === 'boy' ? 'boy' : 'girl',
          accentColor: payload.accentColor || '#F472B6',
          scene: 'island',
          x: 565,
          y: 375,
          dir: 'down',
          action: 'idle',
          sittingSpotId: null,
          emote: null,
          emoteUntil: 0,
          chatText: null,
          chatUntil: 0,
          fishingState: 'none',
          lastCatch: null,
          connected: true,
        };

        runtime.state.players[playerId] = player;
        socketMeta.set(socket.id, { roomCode, playerId });
        socket.join(roomCode);

        cb?.({ ok: true, roomCode, playerId });
        io.to(roomCode).emit('world:state', serializeRoom(runtime));
      }
    );

    socket.on(
      'room:join',
      (
        payload: {
          roomCode: string;
          name: string;
          character: CharacterType;
          accentColor: string;
          playerId?: string;
        },
        cb?: (res: { ok: boolean; roomCode?: string; playerId?: string; error?: string }) => void
      ) => {
        const roomCode = String(payload.roomCode || '')
          .trim()
          .toUpperCase();
        const runtime = rooms.get(roomCode);
        if (!runtime) {
          cb?.({ ok: false, error: 'Room not found. Double-check the 4-letter code!' });
          return;
        }

        if (runtime.cleanupTimer) {
          clearTimeout(runtime.cleanupTimer);
          runtime.cleanupTimer = null;
        }

        const existingPlayers = Object.values(runtime.state.players);
        const requestedId = payload.playerId;
        const existingSelf = requestedId ? runtime.state.players[requestedId] : undefined;

        const connectedOthers = existingPlayers.filter(
          (p) => p.connected && p.id !== requestedId
        );
        if (!existingSelf && connectedOthers.length >= 2) {
          cb?.({ ok: false, error: 'This cozy room already has 2 players!' });
          return;
        }

        // Remove stale disconnected players if room already had 2 entries and a new player joins
        if (!existingSelf && existingPlayers.length >= 2) {
          for (const p of existingPlayers) {
            if (!p.connected) {
              delete runtime.state.players[p.id];
            }
          }
        }

        const usedSlots = new Set(
          Object.values(runtime.state.players)
            .filter((p) => p.id !== requestedId)
            .map((p) => p.slot)
        );
        const slot: 1 | 2 = usedSlots.has(1) ? 2 : 1;
        const playerId = existingSelf ? existingSelf.id : requestedId || `p_${socket.id}`;
        const cleanName = (payload.name || `Player ${slot}`).trim().slice(0, 14) || `Player ${slot}`;

        if (existingSelf) {
          existingSelf.connected = true;
          existingSelf.name = cleanName;
          existingSelf.character = payload.character === 'boy' ? 'boy' : 'girl';
          existingSelf.accentColor = payload.accentColor || existingSelf.accentColor;
        } else {
          runtime.state.players[playerId] = {
            id: playerId,
            slot,
            name: cleanName,
            character: payload.character === 'boy' ? 'boy' : 'girl',
            accentColor: payload.accentColor || (slot === 1 ? '#F472B6' : '#60A5FA'),
            scene: 'island',
            x: slot === 1 ? 565 : 618,
            y: 375,
            dir: 'down',
            action: 'idle',
            sittingSpotId: null,
            emote: null,
            emoteUntil: 0,
            chatText: null,
            chatUntil: 0,
            fishingState: 'none',
            lastCatch: null,
            connected: true,
          };
        }

        socketMeta.set(socket.id, { roomCode, playerId });
        socket.join(roomCode);

        cb?.({ ok: true, roomCode, playerId });
        io.to(roomCode).emit('world:state', serializeRoom(runtime));
        emitToast(io, roomCode, `${cleanName} arrived on the island!`);
      }
    );

    socket.on(
      'player:move',
      (payload: {
        x: number;
        y: number;
        dir: Direction;
        action: PlayerAction;
        scene?: SceneId;
      }) => {
        const meta = socketMeta.get(socket.id);
        if (!meta) return;
        const runtime = rooms.get(meta.roomCode);
        if (!runtime) return;
        const player = runtime.state.players[meta.playerId];
        if (!player) return;

        // Cancel fishing if player walks away
        if (player.fishingState !== 'none' && payload.action === 'walk') {
          player.fishingState = 'none';
          const timer = runtime.fishingTimers.get(player.id);
          if (timer) {
            clearTimeout(timer);
            runtime.fishingTimers.delete(player.id);
          }
        }

        if (payload.action === 'walk') {
          player.sittingSpotId = null;
        }

        const targetScene = player.scene;
        const clamped = clampPlayerPosition(
          targetScene,
          payload.x,
          payload.y,
          runtime.state.gazeboUnlocked
        );

        player.x = clamped.x;
        player.y = clamped.y;
        player.dir = payload.dir;
        if (player.sittingSpotId) {
          player.action = 'sit';
        } else if (player.fishingState !== 'none') {
          player.action = 'fish';
        } else {
          player.action = payload.action;
        }

        // Check collectible pickup
        const now = Date.now();
        for (const col of runtime.state.collectibles) {
          if (!col.collected && col.scene === player.scene) {
            const dx = col.x - player.x;
            const dy = col.y - player.y;
            if (dx * dx + dy * dy < 34 * 34) {
              col.collected = true;
              col.respawnAt = now + 28000;
              if (col.kind === 'coin') {
                runtime.state.inventory.coins += 5;
              } else {
                runtime.state.inventory.stars += 1;
              }
              emitFx(io, meta.roomCode, {
                type: 'sparkles',
                scene: player.scene,
                x: col.x,
                y: col.y,
                label: col.kind === 'coin' ? '+5 Coins' : '+1 Star',
              });
            }
          }
        }

        // Broadcast fast player position delta to partner
        socket.to(meta.roomCode).emit('player:sync', {
          id: player.id,
          x: player.x,
          y: player.y,
          dir: player.dir,
          action: player.action,
          scene: player.scene,
          sittingSpotId: player.sittingSpotId,
        });
      }
    );

    socket.on('player:emote', (payload: { emote: EmoteType }) => {
      const meta = socketMeta.get(socket.id);
      if (!meta) return;
      const runtime = rooms.get(meta.roomCode);
      if (!runtime) return;
      const player = runtime.state.players[meta.playerId];
      if (!player) return;

      const now = Date.now();
      player.emote = payload.emote;
      player.emoteUntil = now + 3000;
      if (payload.emote === 'dance') {
        player.action = 'dance';
        player.sittingSpotId = null;
      } else if (payload.emote === 'wave') {
        player.action = 'wave';
      }

      emitFx(io, meta.roomCode, {
        type: payload.emote === 'heart' ? 'hearts' : 'sparkles',
        scene: player.scene,
        x: player.x,
        y: player.y - 32,
      });

      io.to(meta.roomCode).emit('world:state', serializeRoom(runtime));
    });

    socket.on('player:chat', (payload: { text: string }) => {
      const meta = socketMeta.get(socket.id);
      if (!meta) return;
      const runtime = rooms.get(meta.roomCode);
      if (!runtime) return;
      const player = runtime.state.players[meta.playerId];
      if (!player) return;

      const clean = String(payload.text || '').trim().slice(0, 60);
      if (!clean) return;
      player.chatText = clean;
      player.chatUntil = Date.now() + 5000;
      io.to(meta.roomCode).emit('world:state', serializeRoom(runtime));
    });

    socket.on('world:interact', (payload: { spotId: string }) => {
      const meta = socketMeta.get(socket.id);
      if (!meta) return;
      const runtime = rooms.get(meta.roomCode);
      if (!runtime) return;
      const player = runtime.state.players[meta.playerId];
      if (!player) return;

      const now = Date.now();
      const spot = INTERACTABLE_SPOTS.find((s) => s.id === payload.spotId);

      // Check flower plots (prefixed plot_)
      if (payload.spotId.startsWith('plot_')) {
        const plot = runtime.state.flowers.find((f) => f.id === payload.spotId);
        if (!plot || player.scene !== 'island') return;

        if (plot.stage === 0) {
          plot.stage = 1;
          plot.type = FLOWER_TYPES[Math.floor(Math.random() * FLOWER_TYPES.length)];
          plot.plantedBy = player.name;
          plot.wateredBy = [player.id];
          emitFx(io, meta.roomCode, {
            type: 'sparkles',
            scene: 'island',
            x: plot.x,
            y: plot.y,
            label: 'Planted!',
          });
        } else if (plot.stage < 3) {
          const partnerWatered = plot.wateredBy.some((id) => id !== player.id);
          if (!plot.wateredBy.includes(player.id)) {
            plot.wateredBy.push(player.id);
          }
          // Watering together makes it bloom faster!
          plot.stage = partnerWatered ? 3 : ((plot.stage + 1) as 1 | 2 | 3);
          if (plot.stage === 3) {
            const reward = partnerWatered ? 12 : 6;
            runtime.state.inventory.coins += reward;
            emitFx(io, meta.roomCode, {
              type: 'bloom',
              scene: 'island',
              x: plot.x,
              y: plot.y,
              label: partnerWatered ? `Coop Bloom! +${reward} Coins` : `Bloomed! +${reward} Coins`,
            });
          } else {
            emitFx(io, meta.roomCode, {
              type: 'splash',
              scene: 'island',
              x: plot.x,
              y: plot.y,
              label: 'Watered',
            });
          }
        } else {
          // Harvest & replant cycle
          runtime.state.inventory.coins += 5;
          plot.stage = 0;
          plot.plantedBy = null;
          plot.wateredBy = [];
          emitFx(io, meta.roomCode, {
            type: 'sparkles',
            scene: 'island',
            x: plot.x,
            y: plot.y,
            label: 'Picked! +5 Coins',
          });
        }
        io.to(meta.roomCode).emit('world:state', serializeRoom(runtime));
        return;
      }

      // Check placed toggleable decorations
      if (payload.spotId.startsWith('decor_')) {
        const decor = runtime.state.decorations.find((d) => d.id === payload.spotId);
        if (decor && decor.scene === player.scene) {
          decor.toggled = !decor.toggled;
          emitFx(io, meta.roomCode, {
            type: 'sparkles',
            scene: decor.scene,
            x: decor.x,
            y: decor.y - 10,
          });
          io.to(meta.roomCode).emit('world:state', serializeRoom(runtime));
        }
        return;
      }

      if (!spot || spot.scene !== player.scene) return;

      switch (spot.kind) {
        case 'door_enter': {
          player.scene = 'cottage';
          player.x = 360 + (player.slot === 1 ? -24 : 24);
          player.y = 432;
          player.dir = 'up';
          player.action = 'idle';
          player.sittingSpotId = null;
          emitFx(io, meta.roomCode, {
            type: 'door',
            scene: 'cottage',
            x: 360,
            y: 455,
          });
          const partner = Object.values(runtime.state.players).find(
            (p) => p.id !== player.id && p.scene === 'cottage'
          );
          if (partner) {
            runtime.state.togetherHearts += 1;
            emitToast(io, meta.roomCode, 'Both inside the cozy cottage together!');
          }
          break;
        }

        case 'door_exit': {
          player.scene = 'island';
          player.x = 590 + (player.slot === 1 ? -22 : 22);
          player.y = 358;
          player.dir = 'down';
          player.action = 'idle';
          player.sittingSpotId = null;
          emitFx(io, meta.roomCode, {
            type: 'door',
            scene: 'island',
            x: 590,
            y: 326,
          });
          break;
        }

        case 'couch':
        case 'bench': {
          if (player.sittingSpotId === spot.id) {
            player.sittingSpotId = null;
            player.action = 'idle';
          } else {
            player.sittingSpotId = spot.id;
            player.action = 'sit';
            player.dir = 'down';
            const seatOffset = player.slot === 1 ? -22 : 22;
            player.x = spot.x + seatOffset;
            player.y = spot.y + 4;
            emitFx(io, meta.roomCode, {
              type: 'hearts',
              scene: player.scene,
              x: player.x,
              y: player.y - 24,
            });
          }
          break;
        }

        case 'fireplace': {
          runtime.state.fireplaceOn = !runtime.state.fireplaceOn;
          emitFx(io, meta.roomCode, {
            type: 'sparkles',
            scene: 'cottage',
            x: spot.x,
            y: spot.y - 20,
            label: runtime.state.fireplaceOn ? 'Fireplace Lit' : 'Fireplace Rested',
          });
          break;
        }

        case 'musicbox': {
          runtime.state.musicBoxOn = !runtime.state.musicBoxOn;
          emitFx(io, meta.roomCode, {
            type: 'sparkles',
            scene: 'cottage',
            x: spot.x,
            y: spot.y - 20,
            label: runtime.state.musicBoxOn ? 'Music Playing' : 'Music Paused',
          });
          break;
        }

        case 'tea_table': {
          player.emote = 'tea';
          player.emoteUntil = now + 3500;
          runtime.state.togetherHearts += 1;
          emitFx(io, meta.roomCode, {
            type: 'hearts',
            scene: 'island',
            x: spot.x,
            y: spot.y - 20,
            label: 'Warm Starlight Tea',
          });
          break;
        }

        case 'pier_fish': {
          if (player.fishingState === 'none') {
            player.fishingState = 'waiting';
            player.action = 'fish';
            player.dir = 'left';
            player.x = 165;
            player.y = player.slot === 1 ? 604 : 626;
            const existingTimer = runtime.fishingTimers.get(player.id);
            if (existingTimer) clearTimeout(existingTimer);

            const partnerFishing = Object.values(runtime.state.players).some(
              (p) => p.id !== player.id && p.fishingState !== 'none'
            );
            const waitMs = (partnerFishing ? 2000 : 3000) + Math.random() * 2500;

            const timer = setTimeout(() => {
              const pNow = runtime.state.players[player.id];
              if (!pNow || pNow.fishingState !== 'waiting') return;
              pNow.fishingState = 'bite';
              emitFx(io, meta.roomCode, {
                type: 'splash',
                scene: 'island',
                x: 112,
                y: pNow.y,
                label: 'Bite! Tap Interact!',
              });
              io.to(meta.roomCode).emit('world:state', serializeRoom(runtime));
            }, waitMs);
            runtime.fishingTimers.set(player.id, timer);
          } else if (player.fishingState === 'bite') {
            const partnerNear = Object.values(runtime.state.players).some(
              (p) =>
                p.id !== player.id &&
                p.scene === 'island' &&
                Math.hypot(p.x - player.x, p.y - player.y) < 120
            );
            const roll = Math.random() + (partnerNear ? 0.18 : 0);
            const catchPool =
              roll > 0.88
                ? FISH_TABLE.filter((f) => f.rarity === 'starlight')
                : roll > 0.55
                  ? FISH_TABLE.filter((f) => f.rarity === 'rare')
                  : FISH_TABLE.filter((f) => f.rarity === 'common');
            const caught = catchPool[Math.floor(Math.random() * catchPool.length)];
            const bonus = partnerNear ? 5 : 0;

            player.fishingState = 'none';
            player.action = 'idle';
            player.lastCatch = caught.name;
            runtime.state.inventory.coins += caught.coins + bonus;
            if (caught.rarity === 'starlight') {
              runtime.state.inventory.stars += 1;
            }
            runtime.state.inventory.fishLog.unshift({
              id: `fish_${now}`,
              name: caught.name,
              rarity: caught.rarity,
              caughtBy: player.name,
              timestamp: now,
            });
            runtime.state.inventory.fishLog = runtime.state.inventory.fishLog.slice(0, 15);

            emitFx(io, meta.roomCode, {
              type: 'sparkles',
              scene: 'island',
              x: player.x,
              y: player.y - 28,
              label: `${caught.name}! +${caught.coins + bonus}c`,
            });
          } else {
            // Cancel waiting
            player.fishingState = 'none';
            player.action = 'idle';
            const existingTimer = runtime.fishingTimers.get(player.id);
            if (existingTimer) {
              clearTimeout(existingTimer);
              runtime.fishingTimers.delete(player.id);
            }
          }
          break;
        }

        case 'bell_a':
        case 'bell_b': {
          if (spot.kind === 'bell_a') {
            runtime.state.bellChimes.bellA = now;
          } else {
            runtime.state.bellChimes.bellB = now;
          }
          emitFx(io, meta.roomCode, {
            type: 'bell',
            scene: 'island',
            x: spot.x,
            y: spot.y - 24,
            label: spot.kind === 'bell_a' ? 'Sun Bell!' : 'Moon Bell!',
          });

          const diff = Math.abs(
            runtime.state.bellChimes.bellA - runtime.state.bellChimes.bellB
          );
          if (
            runtime.state.bellChimes.bellA > 0 &&
            runtime.state.bellChimes.bellB > 0 &&
            diff <= 3500
          ) {
            runtime.state.starShowerUntil = now + 12000;
            if (!runtime.state.gazeboUnlocked) {
              runtime.state.gazeboUnlocked = true;
              runtime.state.inventory.stars += 3;
              emitFx(io, meta.roomCode, {
                type: 'unlock',
                scene: 'island',
                x: 980,
                y: 590,
                label: 'Gazebo Unlocked!',
              });
              emitToast(
                io,
                meta.roomCode,
                'Twin Bells harmonized! Stargazer Gazebo Bridge is open!'
              );
            } else {
              emitToast(io, meta.roomCode, 'Twin Bells triggered a Starlight Shower!');
            }
          }
          break;
        }

        case 'lantern': {
          const idx = spot.meta?.index ?? 0;
          runtime.state.lanterns[idx] = !runtime.state.lanterns[idx];
          emitFx(io, meta.roomCode, {
            type: 'sparkles',
            scene: 'island',
            x: spot.x,
            y: spot.y - 16,
          });
          // If all 4 rune lanterns are lit, also unlock Gazebo!
          if (runtime.state.lanterns.every(Boolean) && !runtime.state.gazeboUnlocked) {
            runtime.state.gazeboUnlocked = true;
            runtime.state.inventory.stars += 2;
            emitFx(io, meta.roomCode, {
              type: 'unlock',
              scene: 'island',
              x: 980,
              y: 590,
              label: 'Gazebo Unlocked!',
            });
            emitToast(
              io,
              meta.roomCode,
              'All 4 Starlight Lanterns lit! Stargazer Gazebo Bridge unlocked!'
            );
          }
          break;
        }

        case 'telescope': {
          runtime.state.starShowerUntil = now + 10000;
          player.emote = 'sparkle';
          player.emoteUntil = now + 3500;
          emitFx(io, meta.roomCode, {
            type: 'sparkles',
            scene: 'island',
            x: spot.x,
            y: spot.y - 26,
            label: 'Make a Wish!',
          });
          break;
        }

        default:
          break;
      }

      io.to(meta.roomCode).emit('world:state', serializeRoom(runtime));
    });

    socket.on('mailbox:add', (payload: { text: string }) => {
      const meta = socketMeta.get(socket.id);
      if (!meta) return;
      const runtime = rooms.get(meta.roomCode);
      if (!runtime) return;
      const player = runtime.state.players[meta.playerId];
      if (!player) return;

      const clean = String(payload.text || '').trim().slice(0, 140);
      if (!clean) return;

      runtime.state.mailbox.unshift({
        id: `note_${Date.now()}`,
        author: player.name,
        character: player.character,
        text: clean,
        timestamp: Date.now(),
      });
      runtime.state.mailbox = runtime.state.mailbox.slice(0, 20);

      emitFx(io, meta.roomCode, {
        type: 'hearts',
        scene: 'island',
        x: 686,
        y: 325,
        label: 'Note Sent!',
      });
      io.to(meta.roomCode).emit('world:state', serializeRoom(runtime));
    });

    socket.on('decor:buyAndPlace', (payload: { itemId: string }) => {
      const meta = socketMeta.get(socket.id);
      if (!meta) return;
      const runtime = rooms.get(meta.roomCode);
      if (!runtime) return;
      const player = runtime.state.players[meta.playerId];
      if (!player) return;

      const item = DECOR_CATALOG.find((d) => d.itemId === payload.itemId);
      if (!item) return;

      const inv = runtime.state.inventory;
      if (inv.coins < item.costCoins || inv.stars < item.costStars) {
        socket.emit('world:toast', { text: 'Need more coins or stars for that item!' });
        return;
      }

      inv.coins -= item.costCoins;
      inv.stars -= item.costStars;
      if (!inv.unlockedItems.includes(item.itemId)) {
        inv.unlockedItems.push(item.itemId);
      }

      const offset = player.dir === 'left' ? -30 : player.dir === 'right' ? 30 : 0;
      const offsetY = player.dir === 'up' ? -28 : player.dir === 'down' ? 28 : 0;

      runtime.state.decorations.push({
        id: `decor_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        itemId: item.itemId,
        scene: player.scene,
        x: player.x + offset,
        y: player.y + offsetY,
        toggled: true,
        placedBy: player.name,
      });

      emitFx(io, meta.roomCode, {
        type: 'sparkles',
        scene: player.scene,
        x: player.x + offset,
        y: player.y + offsetY - 12,
        label: `Placed ${item.name}`,
      });
      io.to(meta.roomCode).emit('world:state', serializeRoom(runtime));
    });

    socket.on('world:skyMode', (payload: { skyMode: SkyMode }) => {
      const meta = socketMeta.get(socket.id);
      if (!meta) return;
      const runtime = rooms.get(meta.roomCode);
      if (!runtime) return;
      if (
        payload.skyMode === 'dusk' ||
        payload.skyMode === 'night' ||
        payload.skyMode === 'golden'
      ) {
        runtime.state.skyMode = payload.skyMode;
        io.to(meta.roomCode).emit('world:state', serializeRoom(runtime));
      }
    });

    socket.on('hideAndSeek:toggle', () => {
      const meta = socketMeta.get(socket.id);
      if (!meta) return;
      const runtime = rooms.get(meta.roomCode);
      if (!runtime) return;
      const hs = runtime.state.hideAndSeek;
      const players = Object.values(runtime.state.players).filter((p) => p.connected);

      if (hs.active) {
        hs.active = false;
        hs.phase = 'idle';
        hs.seekerId = null;
        emitToast(io, meta.roomCode, 'Hide & Seek ended.');
      } else {
        if (players.length < 2) {
          socket.emit('world:toast', {
            text: 'Invite your partner into the room to start Hide & Seek!',
          });
          return;
        }
        // Alternate seeker each round
        const nextSeeker =
          hs.seekerId === players[0].id ? players[1].id : players[0].id;
        hs.active = true;
        hs.phase = 'countdown';
        hs.seekerId = nextSeeker;
        hs.countdownEnd = Date.now() + 8000;
        hs.winnerName = null;
        const seekerName = runtime.state.players[nextSeeker]?.name || 'Seeker';
        emitToast(io, meta.roomCode, `Hide & Seek! ${seekerName} is counting (8s)...`);
      }
      io.to(meta.roomCode).emit('world:state', serializeRoom(runtime));
    });

    socket.on('hideAndSeek:tag', () => {
      const meta = socketMeta.get(socket.id);
      if (!meta) return;
      const runtime = rooms.get(meta.roomCode);
      if (!runtime) return;
      const hs = runtime.state.hideAndSeek;
      if (!hs.active || hs.phase !== 'seeking') return;
      if (meta.playerId !== hs.seekerId) return;

      const seeker = runtime.state.players[meta.playerId];
      const hider = Object.values(runtime.state.players).find(
        (p) => p.id !== meta.playerId && p.connected
      );
      if (!seeker || !hider) return;

      if (seeker.scene === hider.scene && Math.hypot(seeker.x - hider.x, seeker.y - hider.y) < 75) {
        hs.phase = 'found';
        hs.winnerName = seeker.name;
        hs.roundsPlayed += 1;
        runtime.state.inventory.coins += 15;
        emitFx(io, meta.roomCode, {
          type: 'confetti',
          scene: hider.scene,
          x: hider.x,
          y: hider.y - 20,
          label: 'Found! +15 Coins',
        });
        emitToast(io, meta.roomCode, `${seeker.name} found ${hider.name}! +15 Coins`);
        setTimeout(() => {
          const r = rooms.get(meta.roomCode);
          if (r && r.state.hideAndSeek.phase === 'found') {
            r.state.hideAndSeek.active = false;
            r.state.hideAndSeek.phase = 'idle';
            io.to(meta.roomCode).emit('world:state', serializeRoom(r));
          }
        }, 3500);
        io.to(meta.roomCode).emit('world:state', serializeRoom(runtime));
      }
    });

    socket.on('disconnect', () => {
      const meta = socketMeta.get(socket.id);
      if (!meta) return;
      socketMeta.delete(socket.id);

      const runtime = rooms.get(meta.roomCode);
      if (!runtime) return;
      const player = runtime.state.players[meta.playerId];
      if (player) {
        player.connected = false;
        player.action = 'idle';
        player.fishingState = 'none';
      }

      const anyConnected = Object.values(runtime.state.players).some((p) => p.connected);
      if (!anyConnected) {
        // Keep room alive 5 minutes in case both phones refresh
        runtime.cleanupTimer = setTimeout(() => {
          rooms.delete(meta.roomCode);
        }, 5 * 60 * 1000);
      }

      io.to(meta.roomCode).emit('world:state', serializeRoom(runtime));
    });
  });

  // Authoritative 10Hz maintenance loop (collectible respawns, emotes expiry, Hide & Seek countdown, Together hearts)
  setInterval(() => {
    const now = Date.now();
    for (const [roomCode, runtime] of rooms.entries()) {
      let dirty = false;

      for (const col of runtime.state.collectibles) {
        if (col.collected && now >= col.respawnAt) {
          col.collected = false;
          dirty = true;
        }
      }

      for (const p of Object.values(runtime.state.players)) {
        if (p.emote && now >= p.emoteUntil) {
          p.emote = null;
          if (p.action === 'dance' || p.action === 'wave') {
            p.action = 'idle';
          }
          dirty = true;
        }
        if (p.chatText && now >= p.chatUntil) {
          p.chatText = null;
          dirty = true;
        }
      }

      const hs = runtime.state.hideAndSeek;
      if (hs.active && hs.phase === 'countdown' && now >= hs.countdownEnd) {
        hs.phase = 'seeking';
        emitToast(io, roomCode, 'Ready or not, here comes the Seeker!');
        dirty = true;
      }

      // Cozy together heart bonus if both players sit or dance near each other
      const connected = Object.values(runtime.state.players).filter((p) => p.connected);
      if (connected.length === 2 && now - runtime.lastTogetherHeartAt > 5000) {
        const [a, b] = connected;
        const closeTogether =
          a.scene === b.scene && Math.hypot(a.x - b.x, a.y - b.y) < 75;
        const bothCozy =
          (a.action === 'sit' && b.action === 'sit') ||
          (a.action === 'dance' && b.action === 'dance');
        if (closeTogether && bothCozy) {
          runtime.lastTogetherHeartAt = now;
          runtime.state.togetherHearts += 1;
          emitFx(io, roomCode, {
            type: 'hearts',
            scene: a.scene,
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2 - 28,
          });
          dirty = true;
        }
      }

      if (dirty) {
        io.to(roomCode).emit('world:state', serializeRoom(runtime));
      }
    }
  }, 250);

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Door, But Together server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
