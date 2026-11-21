export type SceneId = 'island' | 'cottage';
export type CharacterType = 'boy' | 'girl';
export type Direction = 'up' | 'down' | 'left' | 'right';
export type PlayerAction = 'idle' | 'walk' | 'sit' | 'fish' | 'dance' | 'wave';
export type EmoteType = 'heart' | 'wave' | 'sparkle' | 'tea' | 'dance' | 'music';
export type SkyMode = 'dusk' | 'night' | 'golden';
export type FlowerType = 'tulip' | 'sunflower' | 'lavender' | 'starblossom';
export type FishingState = 'none' | 'waiting' | 'bite' | 'caught';

export interface PlayerState {
  id: string;
  slot: 1 | 2;
  name: string;
  character: CharacterType;
  accentColor: string;
  scene: SceneId;
  x: number;
  y: number;
  dir: Direction;
  action: PlayerAction;
  sittingSpotId: string | null;
  emote: EmoteType | null;
  emoteUntil: number;
  chatText: string | null;
  chatUntil: number;
  fishingState: FishingState;
  lastCatch: string | null;
  connected: boolean;
}

export interface FlowerPlot {
  id: string;
  x: number;
  y: number;
  stage: 0 | 1 | 2 | 3; // 0: soil, 1: seed, 2: sprout, 3: bloom
  type: FlowerType;
  plantedBy: string | null;
  wateredBy: string[];
}

export interface CollectibleItem {
  id: string;
  scene: SceneId;
  x: number;
  y: number;
  kind: 'star' | 'coin';
  collected: boolean;
  respawnAt: number;
}

export interface PlacedDecoration {
  id: string;
  itemId: string;
  scene: SceneId;
  x: number;
  y: number;
  toggled: boolean;
  placedBy: string;
}

export interface MailboxNote {
  id: string;
  author: string;
  character: CharacterType;
  text: string;
  timestamp: number;
}

export interface FishLogEntry {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'starlight';
  caughtBy: string;
  timestamp: number;
}

export interface SharedInventory {
  coins: number;
  stars: number;
  unlockedItems: string[];
  fishLog: FishLogEntry[];
}

export interface HideAndSeekState {
  active: boolean;
  phase: 'idle' | 'countdown' | 'seeking' | 'found';
  seekerId: string | null;
  countdownEnd: number;
  winnerName: string | null;
  roundsPlayed: number;
}

export interface RoomWorldState {
  roomCode: string;
  skyMode: SkyMode;
  fireplaceOn: boolean;
  musicBoxOn: boolean;
  bellChimes: {
    bellA: number;
    bellB: number;
  };
  lanterns: [boolean, boolean, boolean, boolean];
  gazeboUnlocked: boolean;
  starShowerUntil: number;
  togetherHearts: number;
  flowers: FlowerPlot[];
  collectibles: CollectibleItem[];
  decorations: PlacedDecoration[];
  inventory: SharedInventory;
  mailbox: MailboxNote[];
  hideAndSeek: HideAndSeekState;
  players: Record<string, PlayerState>;
}

export interface WorldFxEvent {
  id: string;
  type: 'hearts' | 'sparkles' | 'bell' | 'splash' | 'bloom' | 'unlock' | 'door' | 'confetti';
  scene: SceneId;
  x: number;
  y: number;
  label?: string;
}

export interface DecorCatalogItem {
  itemId: string;
  name: string;
  costCoins: number;
  costStars: number;
  description: string;
  toggleable: boolean;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface InteractableSpot {
  id: string;
  scene: SceneId;
  x: number;
  y: number;
  radius: number;
  label: string;
  kind:
    | 'door_enter'
    | 'door_exit'
    | 'bench'
    | 'couch'
    | 'fireplace'
    | 'musicbox'
    | 'tea_table'
    | 'pier_fish'
    | 'mailbox'
    | 'bell_a'
    | 'bell_b'
    | 'lantern'
    | 'telescope'
    | 'flower_plot';
  meta?: {
    index?: number;
    plotId?: string;
    seatOffsetX?: number;
  };
}
