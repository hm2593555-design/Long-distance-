import type {
  CollectibleItem,
  DecorCatalogItem,
  FlowerPlot,
  FlowerType,
  InteractableSpot,
  PlacedDecoration,
  Rect,
  SceneId,
} from './gameTypes.ts';

export const ISLAND_WIDTH = 1280;
export const ISLAND_HEIGHT = 900;
export const COTTAGE_WIDTH = 720;
export const COTTAGE_HEIGHT = 540;

export const PLAYER_SPEED = 175; // pixels per second

export const ACCENT_SWATCHES = [
  { name: 'Rose', hex: '#F472B6' },
  { name: 'Sky', hex: '#60A5FA' },
  { name: 'Amber', hex: '#FBBF24' },
  { name: 'Mint', hex: '#34D399' },
  { name: 'Lavender', hex: '#A78BFA' },
  { name: 'Coral', hex: '#FB7185' },
] as const;

export const QUICK_CHATS = [
  'Come see this!',
  'Let us go inside!',
  'Tea time?',
  'Ring the bells together!',
  'Look at the stars!',
  'Good catch!',
  'Found you!',
  'So cozy here',
] as const;

export const DECOR_CATALOG: DecorCatalogItem[] = [
  {
    itemId: 'fairy_lights',
    name: 'Fairy String Lights',
    costCoins: 15,
    costStars: 0,
    description: 'Warm twinkling bulbs to drape around any spot.',
    toggleable: true,
  },
  {
    itemId: 'potted_monstera',
    name: 'Potted Monstera',
    costCoins: 20,
    costStars: 0,
    description: 'Lush leafy plant in a terracotta pot.',
    toggleable: false,
  },
  {
    itemId: 'bear_plush',
    name: 'Sleepy Bear Plush',
    costCoins: 25,
    costStars: 1,
    description: 'Soft stitched teddy bear for the cottage or grass.',
    toggleable: false,
  },
  {
    itemId: 'paper_lantern',
    name: 'Warm Paper Lantern',
    costCoins: 18,
    costStars: 1,
    description: 'Glowing amber paper lantern you can switch on or off.',
    toggleable: true,
  },
  {
    itemId: 'tea_set',
    name: 'Porcelain Tea Set',
    costCoins: 30,
    costStars: 0,
    description: 'Steaming jasmine tea for two.',
    toggleable: true,
  },
  {
    itemId: 'star_rug',
    name: 'Starlight Woven Rug',
    costCoins: 35,
    costStars: 2,
    description: 'Indigo woven rug embroidered with gold stars.',
    toggleable: false,
  },
  {
    itemId: 'bookshelf',
    name: 'Mini Story Shelf',
    costCoins: 40,
    costStars: 1,
    description: 'Tiny oak bookcase stacked with illustrated tales.',
    toggleable: false,
  },
  {
    itemId: 'floor_cushion',
    name: 'Velvet Floor Cushion',
    costCoins: 12,
    costStars: 0,
    description: 'Extra plum cushion for stargazing.',
    toggleable: false,
  },
];

export const FISH_TABLE = [
  { name: 'Silver Minnow', rarity: 'common' as const, coins: 8 },
  { name: 'Dewdrop Perch', rarity: 'common' as const, coins: 10 },
  { name: 'Cozy Boot', rarity: 'common' as const, coins: 4 },
  { name: 'Moonlight Carp', rarity: 'rare' as const, coins: 18 },
  { name: 'Amber Koi', rarity: 'rare' as const, coins: 22 },
  { name: 'Starlight Jelly', rarity: 'starlight' as const, coins: 35 },
  { name: 'Celestial Pearl', rarity: 'starlight' as const, coins: 45 },
];

export const FLOWER_TYPES: FlowerType[] = ['tulip', 'sunflower', 'lavender', 'starblossom'];

// Island Walkable Bounds & Obstacles
export const ISLAND_COLLIDERS: Rect[] = [
  // Cottage main building footprint (door opening is at x: 560..624, y: 318)
  { x: 472, y: 158, w: 236, h: 156 },
  // Lake water body (pier sticks out at x: 140..250, y: 585..645)
  { x: 55, y: 510, w: 205, h: 220 },
  // Starlight Cafe counter
  { x: 890, y: 205, w: 120, h: 50 },
  // Tree trunks
  { x: 185, y: 210, w: 38, h: 32 },
  { x: 355, y: 155, w: 38, h: 32 },
  { x: 775, y: 155, w: 38, h: 32 },
  { x: 1090, y: 315, w: 38, h: 32 },
  { x: 380, y: 705, w: 38, h: 32 },
  { x: 840, y: 715, w: 38, h: 32 },
];

// Gazebo bridge collider removed once gazeboUnlocked is true
export const GAZEBO_GATE_COLLIDER: Rect = { x: 965, y: 545, w: 26, h: 90 };

export const COTTAGE_COLLIDERS: Rect[] = [
  // Fireplace hearth
  { x: 300, y: 92, w: 120, h: 52 },
  // Kitchenette counter
  { x: 74, y: 98, w: 152, h: 54 },
  // Bookshelf
  { x: 520, y: 98, w: 112, h: 48 },
  // Couch base
  { x: 292, y: 235, w: 136, h: 46 },
  // Small coffee table
  { x: 326, y: 310, w: 68, h: 34 },
];

export const INTERACTABLE_SPOTS: InteractableSpot[] = [
  // Cottage Front Door (Exterior)
  {
    id: 'cottage_door_enter',
    scene: 'island',
    x: 590,
    y: 332,
    radius: 56,
    label: 'Open Glowing Door',
    kind: 'door_enter',
  },
  // Cottage Exit Door (Interior)
  {
    id: 'cottage_door_exit',
    scene: 'cottage',
    x: 360,
    y: 472,
    radius: 56,
    label: 'Step Outside',
    kind: 'door_exit',
  },
  // Shared Mailbox
  {
    id: 'shared_mailbox',
    scene: 'island',
    x: 686,
    y: 348,
    radius: 48,
    label: 'Read & Write Mailbox',
    kind: 'mailbox',
  },
  // Lake Pier Fishing Spots
  {
    id: 'pier_fish_1',
    scene: 'island',
    x: 245,
    y: 615,
    radius: 58,
    label: 'Cast Fishing Line',
    kind: 'pier_fish',
  },
  // Starlight Cafe Tea Table
  {
    id: 'cafe_tea_table',
    scene: 'island',
    x: 950,
    y: 302,
    radius: 56,
    label: 'Sip Starlight Tea',
    kind: 'tea_table',
  },
  // Garden Picnic Bench
  {
    id: 'garden_bench',
    scene: 'island',
    x: 595,
    y: 640,
    radius: 52,
    label: 'Sit on Bench',
    kind: 'bench',
  },
  // Twin Bells (Coop Puzzle!)
  {
    id: 'star_bell_a',
    scene: 'island',
    x: 780,
    y: 485,
    radius: 48,
    label: 'Ring Sun Bell',
    kind: 'bell_a',
  },
  {
    id: 'star_bell_b',
    scene: 'island',
    x: 910,
    y: 485,
    radius: 48,
    label: 'Ring Moon Bell',
    kind: 'bell_b',
  },
  // 4 Rune Lanterns (Alternative Coop Puzzle around central stone)
  {
    id: 'lantern_0',
    scene: 'island',
    x: 795,
    y: 590,
    radius: 40,
    label: 'Toggle Lantern 1',
    kind: 'lantern',
    meta: { index: 0 },
  },
  {
    id: 'lantern_1',
    scene: 'island',
    x: 845,
    y: 560,
    radius: 40,
    label: 'Toggle Lantern 2',
    kind: 'lantern',
    meta: { index: 1 },
  },
  {
    id: 'lantern_2',
    scene: 'island',
    x: 845,
    y: 625,
    radius: 40,
    label: 'Toggle Lantern 3',
    kind: 'lantern',
    meta: { index: 2 },
  },
  {
    id: 'lantern_3',
    scene: 'island',
    x: 895,
    y: 590,
    radius: 40,
    label: 'Toggle Lantern 4',
    kind: 'lantern',
    meta: { index: 3 },
  },
  // Stargazer Gazebo Telescope (across bridge)
  {
    id: 'gazebo_telescope',
    scene: 'island',
    x: 1110,
    y: 585,
    radius: 58,
    label: 'Gaze Through Telescope',
    kind: 'telescope',
  },
  // Cottage Interior Spots
  {
    id: 'cottage_couch',
    scene: 'cottage',
    x: 360,
    y: 262,
    radius: 62,
    label: 'Sit on Cozy Couch',
    kind: 'couch',
  },
  {
    id: 'cottage_fireplace',
    scene: 'cottage',
    x: 360,
    y: 162,
    radius: 56,
    label: 'Toggle Fireplace',
    kind: 'fireplace',
  },
  {
    id: 'cottage_musicbox',
    scene: 'cottage',
    x: 160,
    y: 165,
    radius: 54,
    label: 'Toggle Music Box',
    kind: 'musicbox',
  },
];

export function createInitialFlowers(): FlowerPlot[] {
  const plots: FlowerPlot[] = [];
  const startX = 468;
  const startY = 485;
  const cols = 4;
  const spacingX = 62;
  const spacingY = 56;
  for (let i = 0; i < 8; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    plots.push({
      id: `plot_${i}`,
      x: startX + col * spacingX,
      y: startY + row * spacingY,
      stage: i === 0 ? 3 : i === 1 ? 2 : 0,
      type: FLOWER_TYPES[i % FLOWER_TYPES.length],
      plantedBy: i < 2 ? 'Island' : null,
      wateredBy: [],
    });
  }
  return plots;
}

export function createInitialCollectibles(): CollectibleItem[] {
  const spots: Array<{ scene: SceneId; x: number; y: number; kind: 'star' | 'coin' }> = [
    { scene: 'island', x: 165, y: 315, kind: 'coin' },
    { scene: 'island', x: 305, y: 245, kind: 'star' },
    { scene: 'island', x: 430, y: 390, kind: 'coin' },
    { scene: 'island', x: 740, y: 270, kind: 'coin' },
    { scene: 'island', x: 1020, y: 410, kind: 'star' },
    { scene: 'island', x: 645, y: 745, kind: 'coin' },
    { scene: 'island', x: 315, y: 690, kind: 'star' },
    { scene: 'island', x: 1120, y: 655, kind: 'star' },
    { scene: 'cottage', x: 135, y: 365, kind: 'coin' },
    { scene: 'cottage', x: 585, y: 245, kind: 'star' },
  ];
  return spots.map((s, idx) => ({
    id: `col_${idx}`,
    scene: s.scene,
    x: s.x,
    y: s.y,
    kind: s.kind,
    collected: false,
    respawnAt: 0,
  }));
}

export function createInitialDecorations(): PlacedDecoration[] {
  return [
    {
      id: 'decor_init_1',
      itemId: 'potted_monstera',
      scene: 'cottage',
      x: 246,
      y: 158,
      toggled: false,
      placedBy: 'Cottage',
    },
    {
      id: 'decor_init_2',
      itemId: 'paper_lantern',
      scene: 'island',
      x: 528,
      y: 332,
      toggled: true,
      placedBy: 'Cottage',
    },
  ];
}

export function clampPlayerPosition(
  scene: SceneId,
  x: number,
  y: number,
  gazeboUnlocked: boolean
): { x: number; y: number } {
  const marginX = scene === 'island' ? 95 : 74;
  const minY = scene === 'island' ? 120 : 122;
  const maxX = (scene === 'island' ? ISLAND_WIDTH : COTTAGE_WIDTH) - marginX;
  const maxY = (scene === 'island' ? ISLAND_HEIGHT : COTTAGE_HEIGHT) - (scene === 'island' ? 115 : 54);

  let cx = Math.max(marginX, Math.min(maxX, x));
  let cy = Math.max(minY, Math.min(maxY, y));

  // Keep player out of Gazebo island until unlocked
  if (scene === 'island' && !gazeboUnlocked && cx > 970 && cy > 495 && cy < 700) {
    cx = 970;
  }

  const colliders = scene === 'island' ? [...ISLAND_COLLIDERS] : [...COTTAGE_COLLIDERS];
  if (scene === 'island' && !gazeboUnlocked) {
    colliders.push(GAZEBO_GATE_COLLIDER);
  }

  const r = 14;
  for (const rect of colliders) {
    // Allow walking onto the pier (x: 135..265, y: 582..648)
    if (
      scene === 'island' &&
      rect.x === 55 &&
      rect.y === 510 &&
      cx >= 130 &&
      cx <= 275 &&
      cy >= 582 &&
      cy <= 648
    ) {
      continue;
    }

    const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    const distSq = dx * dx + dy * dy;
    if (distSq < r * r) {
      if (distSq === 0) {
        // Push out vertically
        const topDist = Math.abs(cy - rect.y);
        const botDist = Math.abs(rect.y + rect.h - cy);
        cy = topDist < botDist ? rect.y - r : rect.y + rect.h + r;
      } else {
        const dist = Math.sqrt(distSq);
        const overlap = r - dist;
        cx += (dx / dist) * overlap;
        cy += (dy / dist) * overlap;
      }
    }
  }

  return { x: cx, y: cy };
}
