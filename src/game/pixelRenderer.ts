import type {
  CharacterType,
  Direction,
  EmoteType,
  FlowerPlot,
  InteractableSpot,
  PlacedDecoration,
  PlayerState,
  RoomWorldState,
  SkyMode,
  WorldFxEvent,
} from '../shared/gameTypes.ts';
import {
  COTTAGE_HEIGHT,
  COTTAGE_WIDTH,
  ISLAND_HEIGHT,
  ISLAND_WIDTH,
} from '../shared/worldData.ts';

export interface ActiveParticle {
  id: string;
  type: WorldFxEvent['type'];
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  label?: string;
}

const SKY_PALETTES: Record<
  SkyMode,
  { top: string; mid: string; bot: string; cloud: string; starAlpha: number; grass: string; grassDark: string }
> = {
  dusk: {
    top: '#171B36',
    mid: '#2E2B57',
    bot: '#6F4A77',
    cloud: 'rgba(232, 198, 224, 0.18)',
    starAlpha: 0.85,
    grass: '#4C8B5C',
    grassDark: '#3A7049',
  },
  night: {
    top: '#0B1024',
    mid: '#162040',
    bot: '#23335C',
    cloud: 'rgba(148, 176, 224, 0.14)',
    starAlpha: 1.0,
    grass: '#3B7250',
    grassDark: '#2B573C',
  },
  golden: {
    top: '#2C274C',
    mid: '#7C4B68',
    bot: '#D98A6C',
    cloud: 'rgba(255, 228, 196, 0.25)',
    starAlpha: 0.45,
    grass: '#5F9E5E',
    grassDark: '#477D48',
  },
};

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function drawCharacterSprite(
  ctx: CanvasRenderingContext2D,
  opts: {
    x: number;
    y: number;
    character: CharacterType;
    accentColor: string;
    dir: Direction;
    action: PlayerState['action'];
    time: number;
    scale?: number;
  }
) {
  const { x, y, character, accentColor, dir, action, time } = opts;
  const s = opts.scale ?? 2.5;
  const isWalking = action === 'walk';
  const isDancing = action === 'dance';
  const isSitting = action === 'sit';
  const isWaving = action === 'wave';

  const walkPhase = isWalking ? Math.sin(time * 0.015) : 0;
  const bob = isWalking
    ? Math.abs(Math.sin(time * 0.015)) * -2
    : isDancing
      ? Math.abs(Math.sin(time * 0.018)) * -5
      : Math.sin(time * 0.004) * 0.8;

  const ox = Math.round(x - 8 * s);
  const oy = Math.round(y - 22 * s + bob * s * 0.5);

  // Ground shadow
  ctx.fillStyle = 'rgba(10, 12, 24, 0.32)';
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y + 1 * s), 6 * s, 2.4 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  const p = (gx: number, gy: number, gw: number, gh: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(ox + gx * s), Math.round(oy + gy * s), Math.ceil(gw * s), Math.ceil(gh * s));
  };

  const skin = '#FAD4B8';
  const skinShadow = '#E6B28F';
  const hair = character === 'girl' ? '#5C3328' : '#3C2824';
  const hairHighlight = character === 'girl' ? '#7D4738' : '#573B35';
  const outfit = character === 'girl' ? '#F3EDE2' : '#4E6B8F';
  const pants = character === 'girl' ? '#7C5368' : '#354863';
  const boots = '#3B2520';

  // Legs (sitting vs standing/walking)
  if (isSitting) {
    p(4, 18, 3, 3, pants);
    p(9, 18, 3, 3, pants);
    p(3, 20, 4, 2, boots);
    p(9, 20, 4, 2, boots);
  } else {
    const leftLegY = walkPhase > 0.2 ? 17 : 18;
    const rightLegY = walkPhase < -0.2 ? 17 : 18;
    p(5, leftLegY, 2.5, 4, pants);
    p(8.5, rightLegY, 2.5, 4, pants);
    p(4.5, leftLegY + 3, 3, 2, boots);
    p(8.5, rightLegY + 3, 3, 2, boots);
  }

  // Torso / Outfit
  if (character === 'girl') {
    p(4, 12, 8, 5, outfit);
    p(4, 16, 8, 3, pants); // cozy skirt hem
  } else {
    p(4, 12, 8, 6, outfit);
    p(5, 13, 6, 4, '#5E80AA'); // overalls pocket detail
  }

  // Accent scarf / collar
  p(4, 11.5, 8, 2, accentColor);
  if (dir !== 'up') {
    p(9, 13, 2, 2.5, accentColor); // scarf tail
  }

  // Arms
  const armSwing = isWalking ? walkPhase * 1.5 : 0;
  p(2.5, 12.5 + armSwing * 0.5, 2, 4.5, outfit);
  p(2.5, 16.5 + armSwing * 0.5, 2, 1.5, skin);

  if (isWaving || isDancing) {
    const waveY = 8.5 + Math.sin(time * 0.025) * 1.5;
    p(11.5, waveY, 2, 4.5, outfit);
    p(11.5, waveY - 1, 2, 1.5, skin);
  } else {
    p(11.5, 12.5 - armSwing * 0.5, 2, 4.5, outfit);
    p(11.5, 16.5 - armSwing * 0.5, 2, 1.5, skin);
  }

  // Head
  p(3.5, 3.5, 9, 8, skin);
  p(3.5, 10.5, 9, 1, skinShadow);

  // Hair base
  p(3, 2, 10, 3.5, hair);
  p(4, 1.5, 8, 1.5, hairHighlight);

  if (character === 'girl') {
    // Side locks + cute hairclip
    p(2.5, 4, 2, 6.5, hair);
    p(11.5, 4, 2, 6.5, hair);
    p(10.5, 3, 2, 1.5, accentColor);
  } else {
    // Boy fringe & sideburns
    p(3, 4, 1.5, 3.5, hair);
    p(11.5, 4, 1.5, 3.5, hair);
    p(5, 4.5, 2, 1.5, hair);
    p(8, 4, 2, 1.5, hair);
  }

  // Face features (unless facing up)
  if (dir !== 'up') {
    const blink = Math.floor(time / 3200) % 12 === 0 && (time % 3200) < 140;
    const eyeOffsetX = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    if (blink) {
      p(5 + eyeOffsetX, 7.5, 1.8, 0.8, '#2B1F1D');
      p(9.2 + eyeOffsetX, 7.5, 1.8, 0.8, '#2B1F1D');
    } else {
      p(5.2 + eyeOffsetX, 6.8, 1.5, 2, '#2B1F1D');
      p(9.3 + eyeOffsetX, 6.8, 1.5, 2, '#2B1F1D');
    }
    // Rosy cheeks
    p(4.2 + eyeOffsetX, 8.8, 1.5, 1, 'rgba(244, 114, 182, 0.45)');
    p(10.3 + eyeOffsetX, 8.8, 1.5, 1, 'rgba(244, 114, 182, 0.45)');
  } else {
    // Back of hair
    p(3, 4, 10, 6.5, hair);
    if (character === 'girl') {
      p(6.5, 6, 3, 2, accentColor); // ribbon bow
    }
  }
}

function drawFlowerPlot(ctx: CanvasRenderingContext2D, plot: FlowerPlot, time: number) {
  const { x, y, stage, type } = plot;
  // Wooden planter frame
  px(ctx, x - 20, y - 16, 40, 32, '#734B32');
  px(ctx, x - 17, y - 13, 34, 26, '#4D3324');

  if (stage === 0) {
    // Subtle soil dots
    px(ctx, x - 8, y - 4, 4, 3, '#634330');
    px(ctx, x + 4, y + 2, 4, 3, '#634330');
    return;
  }

  if (stage === 1) {
    // Planted seeds
    px(ctx, x - 6, y - 2, 4, 4, '#C8A97E');
    px(ctx, x + 3, y + 1, 4, 4, '#C8A97E');
    return;
  }

  const sway = Math.sin(time * 0.003 + x) * 1.5;

  if (stage === 2) {
    // Sprout
    px(ctx, x - 2, y - 6, 4, 10, '#62B35A');
    px(ctx, x - 7 + sway, y - 8, 5, 4, '#80D16B');
    px(ctx, x + 2 + sway, y - 9, 5, 4, '#80D16B');
    return;
  }

  // Stage 3: Full Bloom!
  px(ctx, x - 2, y - 10, 4, 14, '#4F9E4A');
  px(ctx, x - 7, y - 2, 5, 4, '#6EC460');
  px(ctx, x + 2, y - 3, 5, 4, '#6EC460');

  if (type === 'tulip') {
    px(ctx, x - 7 + sway, y - 20, 14, 11, '#F472B6');
    px(ctx, x - 5 + sway, y - 23, 3, 4, '#FBCFE8');
    px(ctx, x + 2 + sway, y - 23, 3, 4, '#FBCFE8');
  } else if (type === 'sunflower') {
    px(ctx, x - 9 + sway, y - 24, 18, 18, '#FBBF24');
    px(ctx, x - 5 + sway, y - 20, 10, 10, '#6B3E26');
  } else if (type === 'lavender') {
    px(ctx, x - 4 + sway, y - 25, 8, 16, '#A78BFA');
    px(ctx, x - 6 + sway, y - 21, 12, 8, '#C4B5FD');
  } else {
    // Starblossom
    const pulse = 0.65 + Math.sin(time * 0.005) * 0.35;
    ctx.fillStyle = `rgba(125, 211, 252, ${pulse * 0.4})`;
    ctx.beginPath();
    ctx.arc(x + sway, y - 17, 15, 0, Math.PI * 2);
    ctx.fill();
    px(ctx, x - 7 + sway, y - 22, 14, 11, '#7DD3FC');
    px(ctx, x - 3 + sway, y - 26, 6, 18, '#E0F2FE');
  }
}

function drawPlacedDecoration(
  ctx: CanvasRenderingContext2D,
  decor: PlacedDecoration,
  time: number
) {
  const { x, y, itemId, toggled } = decor;
  switch (itemId) {
    case 'potted_monstera': {
      px(ctx, x - 8, y - 4, 16, 12, '#B4654A');
      px(ctx, x - 10, y - 6, 20, 4, '#C8785A');
      px(ctx, x - 12, y - 20, 10, 14, '#3F8E5B');
      px(ctx, x + 1, y - 22, 11, 15, '#52AC6E');
      px(ctx, x - 5, y - 26, 10, 12, '#6CC782');
      break;
    }
    case 'paper_lantern': {
      px(ctx, x - 2, y - 2, 4, 8, '#4E3629');
      const glow = toggled ? '#FDE047' : '#948674';
      if (toggled) {
        ctx.fillStyle = 'rgba(253, 224, 71, 0.22)';
        ctx.beginPath();
        ctx.arc(x, y - 12, 26, 0, Math.PI * 2);
        ctx.fill();
      }
      px(ctx, x - 8, y - 20, 16, 16, glow);
      px(ctx, x - 6, y - 22, 12, 3, '#7C4D3A');
      px(ctx, x - 6, y - 4, 12, 3, '#7C4D3A');
      break;
    }
    case 'bear_plush': {
      px(ctx, x - 9, y - 10, 18, 15, '#A9714B');
      px(ctx, x - 7, y - 20, 14, 11, '#B87E56');
      px(ctx, x - 9, y - 23, 5, 5, '#A9714B');
      px(ctx, x + 4, y - 23, 5, 5, '#A9714B');
      px(ctx, x - 4, y - 16, 2, 2, '#2B1F1D');
      px(ctx, x + 2, y - 16, 2, 2, '#2B1F1D');
      px(ctx, x - 3, y - 13, 6, 4, '#EAD7C3');
      break;
    }
    case 'fairy_lights': {
      px(ctx, x - 20, y - 22, 4, 24, '#5C3D2E');
      px(ctx, x + 16, y - 22, 4, 24, '#5C3D2E');
      px(ctx, x - 18, y - 20, 36, 2, '#332924');
      for (let i = 0; i < 4; i++) {
        const bx = x - 14 + i * 9;
        const on = toggled && (Math.floor(time / 450) + i) % 2 === 0;
        px(ctx, bx, y - 18, 4, 4, on ? '#FDE68A' : '#F59E0B');
      }
      break;
    }
    case 'tea_set': {
      px(ctx, x - 12, y - 6, 24, 12, '#7D5438');
      px(ctx, x - 6, y - 12, 7, 6, '#F8FAFC');
      px(ctx, x + 3, y - 11, 5, 5, '#E2E8F0');
      if (toggled) {
        const sy = Math.sin(time * 0.006) * 3;
        px(ctx, x - 4, y - 18 + sy, 2, 4, 'rgba(255,255,255,0.65)');
      }
      break;
    }
    case 'star_rug': {
      px(ctx, x - 26, y - 14, 52, 28, '#3B346E');
      px(ctx, x - 22, y - 11, 44, 22, '#4C438A');
      px(ctx, x - 3, y - 4, 6, 8, '#FDE047');
      px(ctx, x - 6, y - 1, 12, 2, '#FDE047');
      break;
    }
    case 'bookshelf': {
      px(ctx, x - 16, y - 28, 32, 30, '#6B442C');
      px(ctx, x - 13, y - 24, 26, 9, '#4B2E1E');
      px(ctx, x - 13, y - 12, 26, 9, '#4B2E1E');
      px(ctx, x - 11, y - 23, 5, 8, '#F472B6');
      px(ctx, x - 5, y - 23, 5, 8, '#60A5FA');
      px(ctx, x + 2, y - 23, 5, 8, '#34D399');
      px(ctx, x - 9, y - 11, 6, 8, '#FBBF24');
      px(ctx, x, y - 11, 7, 8, '#A78BFA');
      break;
    }
    case 'floor_cushion': {
      px(ctx, x - 12, y - 7, 24, 14, '#9D4EDD');
      px(ctx, x - 9, y - 5, 18, 10, '#C77DFF');
      break;
    }
  }
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  // Shadow
  ctx.fillStyle = 'rgba(12, 20, 18, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 28, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Trunk
  px(ctx, x - 8, y - 18, 16, 26, '#6B422B');
  px(ctx, x - 4, y - 16, 6, 22, '#845439');

  // Foliage layers
  const sway = Math.sin(time * 0.002 + x * 0.05) * 1.5;
  px(ctx, x - 28 + sway, y - 48, 56, 34, '#2F6B48');
  px(ctx, x - 24 + sway, y - 62, 48, 32, '#3D8356');
  px(ctx, x - 16 + sway, y - 72, 32, 20, '#559F68');
  // Little blossoms in tree
  px(ctx, x - 12 + sway, y - 50, 5, 5, '#F9A8D4');
  px(ctx, x + 8 + sway, y - 58, 5, 5, '#FDE68A');
}

function drawIslandWorld(
  ctx: CanvasRenderingContext2D,
  state: RoomWorldState,
  time: number,
  nearDoor: boolean
) {
  const pal = SKY_PALETTES[state.skyMode];

  // Island Cliff Underside (Floating Island silhouette!)
  px(ctx, 76, 755, ISLAND_WIDTH - 152, 65, '#4A363B');
  px(ctx, 110, 800, ISLAND_WIDTH - 220, 42, '#37282D');
  px(ctx, 190, 830, ISLAND_WIDTH - 380, 26, '#281D22');

  // Floating Gazebo mini-island cliff
  px(ctx, 1018, 675, 195, 54, '#4A363B');
  px(ctx, 1040, 715, 150, 28, '#37282D');

  // Main Grass Island Top
  px(ctx, 70, 102, 910, 685, pal.grassDark);
  px(ctx, 76, 98, 898, 675, pal.grass);
  // Grass texture highlights
  for (let i = 0; i < 22; i++) {
    const gx = 110 + ((i * 173) % 820);
    const gy = 135 + ((i * 227) % 600);
    px(ctx, gx, gy, 10, 4, 'rgba(255,255,255,0.08)');
  }

  // Right Gazebo Island Top
  px(ctx, 1010, 495, 210, 195, pal.grassDark);
  px(ctx, 1014, 491, 202, 188, pal.grass);

  // Cobblestone Paths
  const pathColor = '#B6A896';
  const pathEdge = '#938472';
  // Path from cottage door down to garden & bells
  px(ctx, 562, 326, 56, 155, pathEdge);
  px(ctx, 566, 326, 48, 155, pathColor);
  // Cross path to Pier (left) and Bells/Gazebo (right)
  px(ctx, 265, 578, 705, 42, pathEdge);
  px(ctx, 265, 582, 705, 34, pathColor);
  // Path up to Cafe
  px(ctx, 922, 295, 44, 290, pathEdge);
  px(ctx, 926, 295, 36, 290, pathColor);

  // Shimmering Lake
  px(ctx, 52, 504, 212, 232, '#2A4E6E');
  px(ctx, 58, 512, 200, 216, '#3A6E8C');
  // Animated water ripples
  for (let r = 0; r < 6; r++) {
    const wx = 78 + ((r * 37 + Math.floor(time * 0.02)) % 140);
    const wy = 532 + r * 32;
    px(ctx, wx, wy, 22, 3, 'rgba(186, 230, 253, 0.45)');
  }
  // Lilypads
  px(ctx, 92, 548, 18, 12, '#4CA66B');
  px(ctx, 114, 676, 20, 13, '#4CA66B');
  px(ctx, 120, 678, 6, 5, '#F9A8D4');

  // Wooden Pier
  px(ctx, 136, 582, 134, 64, '#5A3A28');
  for (let p = 0; p < 7; p++) {
    px(ctx, 140 + p * 18, 585, 15, 58, '#8B5A3C');
  }
  px(ctx, 138, 582, 8, 66, '#432A1C');
  px(ctx, 258, 582, 8, 66, '#432A1C');

  // Cozy Cottage Exterior
  // Chimney + Smoke
  px(ctx, 644, 92, 30, 62, '#7D6A68');
  px(ctx, 640, 86, 38, 10, '#625251');
  if (state.fireplaceOn) {
    for (let s = 0; s < 3; s++) {
      const puffT = ((time * 0.001 + s * 0.33) % 1);
      const puffY = 76 - puffT * 46;
      const puffX = 656 + Math.sin(time * 0.003 + s) * 8;
      ctx.fillStyle = `rgba(248, 243, 230, ${(1 - puffT) * 0.45})`;
      ctx.fillRect(Math.round(puffX), Math.round(puffY), 12, 10);
    }
  }
  // Roof
  px(ctx, 456, 152, 268, 78, '#9A4A44');
  px(ctx, 474, 124, 232, 34, '#B55B52');
  px(ctx, 502, 102, 176, 26, '#C96D61');
  // Attic round window
  px(ctx, 578, 132, 24, 24, '#593A2E');
  px(ctx, 582, 136, 16, 16, '#FDE047');

  // Walls
  px(ctx, 472, 224, 236, 94, '#EADBC8');
  px(ctx, 472, 224, 12, 94, '#7E543A');
  px(ctx, 696, 224, 12, 94, '#7E543A');
  px(ctx, 472, 308, 236, 10, '#8A7E78');

  // Cottage Windows with flower boxes
  px(ctx, 498, 246, 40, 34, '#593A2E');
  px(ctx, 503, 251, 30, 24, '#FDE68A');
  px(ctx, 495, 280, 46, 10, '#7B4D33');
  px(ctx, 502, 274, 8, 6, '#F472B6');
  px(ctx, 518, 274, 8, 6, '#FBBF24');

  px(ctx, 642, 246, 40, 34, '#593A2E');
  px(ctx, 647, 251, 30, 24, '#FDE68A');
  px(ctx, 639, 280, 46, 10, '#7B4D33');
  px(ctx, 648, 274, 8, 6, '#A78BFA');
  px(ctx, 662, 274, 8, 6, '#F472B6');

  // THE HERO GLOWING FRONT DOOR!
  const doorGlowAlpha = nearDoor ? 0.45 : 0.25 + Math.sin(time * 0.004) * 0.08;
  ctx.fillStyle = `rgba(253, 224, 71, ${doorGlowAlpha})`;
  ctx.beginPath();
  ctx.ellipse(590, 326, 46, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  px(ctx, 566, 252, 48, 66, '#5A3625');
  px(ctx, 571, 257, 38, 60, '#A96B46');
  px(ctx, 578, 266, 24, 18, '#FDE68A'); // warm glass pane
  px(ctx, 601, 290, 5, 5, '#FBBF24'); // brass handle
  px(ctx, 564, 318, 52, 10, '#C79F7A'); // porch step

  // Shared Mailbox
  px(ctx, 682, 322, 8, 24, '#5A3A28');
  px(ctx, 672, 304, 28, 20, '#3B82F6');
  px(ctx, 674, 306, 24, 6, '#60A5FA');
  // Red mail flag
  if (state.mailbox.length > 0) {
    px(ctx, 698, 296, 4, 14, '#EF4444');
    px(ctx, 698, 296, 10, 6, '#EF4444');
  }

  // Starlight Cafe
  px(ctx, 886, 194, 128, 62, '#6A4430');
  px(ctx, 878, 166, 144, 32, '#F472B6');
  for (let s = 0; s < 6; s++) {
    px(ctx, 880 + s * 24, 166, 12, 32, '#FFF1F2');
  }
  // Cafe counter teacups
  px(ctx, 912, 210, 12, 10, '#F8FAFC');
  px(ctx, 945, 206, 16, 14, '#FBBF24');
  // Bistro Tea Table
  px(ctx, 932, 284, 36, 26, '#8B5A3C');
  px(ctx, 938, 288, 24, 16, '#F8F3E6');
  px(ctx, 943, 291, 6, 6, '#60A5FA');
  px(ctx, 952, 291, 6, 6, '#F472B6');

  // Garden Area Fence & 8 Flower Plots
  px(ctx, 434, 452, 264, 4, '#8B5A3C');
  px(ctx, 434, 574, 264, 4, '#8B5A3C');
  for (const plot of state.flowers) {
    drawFlowerPlot(ctx, plot, time);
  }

  // Garden Picnic Bench
  px(ctx, 560, 628, 70, 22, '#7D4E32');
  px(ctx, 564, 631, 62, 12, '#A46A46');

  // Twin Starlight Bells
  const drawBell = (bx: number, by: number, color: string, lastRing: number) => {
    const ringing = time - lastRing < 1200;
    const swing = ringing ? Math.sin(time * 0.04) * 4 : 0;
    px(ctx, bx - 16, by - 40, 6, 44, '#6B7280');
    px(ctx, bx + 10, by - 40, 6, 44, '#6B7280');
    px(ctx, bx - 18, by - 44, 36, 8, '#4B5563');
    px(ctx, bx - 8 + swing, by - 34, 16, 16, color);
    px(ctx, bx - 10 + swing, by - 20, 20, 5, color);
    if (ringing) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, by - 26, 24, 0, Math.PI * 2);
      ctx.stroke();
    }
  };
  drawBell(780, 485, '#FBBF24', state.bellChimes.bellA);
  drawBell(910, 485, '#93C5FD', state.bellChimes.bellB);

  // 4 Rune Lanterns
  const lanternCoords = [
    { x: 795, y: 590 },
    { x: 845, y: 560 },
    { x: 845, y: 625 },
    { x: 895, y: 590 },
  ];
  lanternCoords.forEach((lc, i) => {
    const lit = state.lanterns[i];
    if (lit) {
      ctx.fillStyle = 'rgba(167, 139, 250, 0.28)';
      ctx.beginPath();
      ctx.arc(lc.x, lc.y - 8, 22, 0, Math.PI * 2);
      ctx.fill();
    }
    px(ctx, lc.x - 6, lc.y - 16, 12, 18, '#374151');
    px(ctx, lc.x - 4, lc.y - 12, 8, 10, lit ? '#C4B5FD' : '#1F2937');
  });

  // Bridge to Stargazer Gazebo
  if (state.gazeboUnlocked) {
    px(ctx, 962, 566, 62, 52, '#7B4F35');
    for (let b = 0; b < 5; b++) {
      px(ctx, 966 + b * 12, 570, 9, 44, '#D9A76A');
    }
    px(ctx, 962, 564, 62, 5, '#FDE047');
    px(ctx, 962, 615, 62, 5, '#FDE047');
  } else {
    // Locked shimmering barrier hint
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.35)';
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(965, 568, 56, 46);
    ctx.setLineDash([]);
  }

  // Stargazer Gazebo (on mini-island)
  px(ctx, 1062, 528, 96, 96, '#4C438A');
  px(ctx, 1070, 536, 80, 80, '#6256AD');
  // Gazebo pillars & brass telescope
  px(ctx, 1064, 524, 10, 10, '#FDE68A');
  px(ctx, 1146, 524, 10, 10, '#FDE68A');
  px(ctx, 1064, 616, 10, 10, '#FDE68A');
  px(ctx, 1146, 616, 10, 10, '#FDE68A');
  // Telescope
  px(ctx, 1106, 578, 8, 16, '#4B5563');
  px(ctx, 1100, 568, 24, 8, '#FBBF24');

  // Trees around the island
  const treeCoords = [
    { x: 204, y: 225 },
    { x: 374, y: 170 },
    { x: 794, y: 170 },
    { x: 1109, y: 330 },
    { x: 399, y: 720 },
    { x: 859, y: 730 },
  ];
  for (const t of treeCoords) {
    drawTree(ctx, t.x, t.y, time);
  }
}

function drawCottageWorld(
  ctx: CanvasRenderingContext2D,
  state: RoomWorldState,
  time: number,
  nearDoor: boolean
) {
  // Cozy cut-away cabin walls & floorboards
  px(ctx, 56, 48, COTTAGE_WIDTH - 112, COTTAGE_HEIGHT - 92, '#3A2622');
  // Top interior wall
  px(ctx, 64, 56, COTTAGE_WIDTH - 128, 72, '#D9C3B0');
  px(ctx, 64, 122, COTTAGE_WIDTH - 128, 8, '#7A5038');

  // Oak Floorboards
  px(ctx, 64, 130, COTTAGE_WIDTH - 128, COTTAGE_HEIGHT - 178, '#A97349');
  for (let fy = 148; fy < COTTAGE_HEIGHT - 55; fy += 24) {
    px(ctx, 64, fy, COTTAGE_WIDTH - 128, 2, 'rgba(67, 40, 24, 0.24)');
  }

  // Center Hearth Rug
  px(ctx, 250, 210, 220, 155, '#8F3F52');
  px(ctx, 260, 220, 200, 135, '#B3546A');
  px(ctx, 272, 232, 176, 111, '#D4817D');

  // Starry Window (left-center & right-center)
  px(ctx, 246, 70, 38, 36, '#5A3A28');
  px(ctx, 251, 75, 28, 26, '#1E2952');
  px(ctx, 258, 82, 4, 4, '#FDE047');
  px(ctx, 268, 90, 3, 3, '#FFFFFF');

  px(ctx, 436, 70, 38, 36, '#5A3A28');
  px(ctx, 441, 75, 28, 26, '#1E2952');
  px(ctx, 448, 84, 4, 4, '#FDE047');

  // Kitchenette & Music Box (Top-left)
  px(ctx, 74, 98, 152, 54, '#7E543A');
  px(ctx, 74, 98, 152, 16, '#EADBC8');
  // Teakettle
  px(ctx, 94, 86, 16, 14, '#94A3B8');
  // Gramophone / Music Box
  px(ctx, 148, 84, 24, 16, '#5C3A28');
  px(ctx, 156, 72, 14, 12, '#FBBF24');
  if (state.musicBoxOn) {
    const ny = Math.sin(time * 0.008) * 6;
    ctx.fillStyle = '#FDE047';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('♪', 176, 82 + ny);
  }

  // Stone Fireplace (Top-center)
  px(ctx, 300, 62, 120, 82, '#64748B');
  px(ctx, 312, 74, 96, 62, '#475569');
  px(ctx, 328, 98, 64, 38, '#1E293B');
  if (state.fireplaceOn) {
    // Warm fire glow on floor
    const flicker = 0.2 + Math.sin(time * 0.015) * 0.06;
    ctx.fillStyle = `rgba(251, 146, 60, ${flicker})`;
    ctx.beginPath();
    ctx.ellipse(360, 156, 78, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    const fh = 18 + Math.sin(time * 0.02) * 5;
    px(ctx, 340, 134 - fh, 40, fh, '#F97316');
    px(ctx, 348, 134 - fh * 0.7, 24, fh * 0.7, '#FACC15');
  }

  // Bookshelf (Top-right)
  px(ctx, 520, 74, 112, 72, '#6B442C');
  px(ctx, 528, 84, 96, 22, '#462A1B');
  px(ctx, 528, 114, 96, 22, '#462A1B');
  const bookCols = ['#F472B6', '#60A5FA', '#FBBF24', '#34D399', '#A78BFA'];
  bookCols.forEach((c, i) => {
    px(ctx, 532 + i * 16, 86, 10, 18, c);
    px(ctx, 536 + i * 16, 116, 10, 18, bookCols[(i + 2) % bookCols.length]);
  });

  // Cozy Two-Seater Couch
  px(ctx, 292, 232, 136, 48, '#6D4C7D');
  px(ctx, 300, 238, 120, 32, '#8B629E');
  px(ctx, 292, 242, 14, 36, '#5A3D68');
  px(ctx, 414, 242, 14, 36, '#5A3D68');
  // Throw pillows
  px(ctx, 308, 244, 16, 14, '#F472B6');
  px(ctx, 396, 244, 16, 14, '#FDE047');

  // Coffee table with candle
  px(ctx, 326, 310, 68, 34, '#6B442C');
  px(ctx, 330, 314, 60, 22, '#8C5B3C');
  px(ctx, 357, 316, 6, 10, '#F8FAFC');
  px(ctx, 358, 311, 4, 5, '#FACC15');

  // Exit Door (Bottom-center)
  const glow = nearDoor ? 0.45 : 0.22;
  ctx.fillStyle = `rgba(253, 224, 71, ${glow})`;
  ctx.beginPath();
  ctx.ellipse(360, 476, 44, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  px(ctx, 330, 466, 60, 16, '#8F3F52'); // welcome mat
  px(ctx, 334, 484, 52, 12, '#A96B46');
}

export function renderGameWorld(
  ctx: CanvasRenderingContext2D,
  opts: {
    width: number;
    height: number;
    state: RoomWorldState;
    localPlayer: PlayerState;
    partnerPlayer: PlayerState | null;
    nearestSpot: InteractableSpot | null;
    particles: ActiveParticle[];
    camera: { x: number; y: number };
    time: number;
  }
) {
  const { width, height, state, localPlayer, partnerPlayer, nearestSpot, particles, camera, time } = opts;
  const scene = localPlayer.scene;
  const pal = SKY_PALETTES[state.skyMode];

  ctx.imageSmoothingEnabled = false;

  // Sky Background Gradient
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, pal.top);
  grad.addColorStop(0.55, pal.mid);
  grad.addColorStop(1, pal.bot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Twinkling Stars in Sky
  for (let i = 0; i < 48; i++) {
    const sx = ((i * 197 + 43) % width);
    const sy = ((i * 113 + 29) % height);
    const twinkle = 0.4 + Math.abs(Math.sin(time * 0.002 + i)) * 0.6;
    ctx.fillStyle = `rgba(255, 250, 230, ${twinkle * pal.starAlpha})`;
    const size = i % 5 === 0 ? 3 : 2;
    ctx.fillRect(sx, sy, size, size);
  }

  // Star Shower!
  if (time < state.starShowerUntil || Date.now() < state.starShowerUntil) {
    for (let s = 0; s < 8; s++) {
      const progress = ((time * 0.45 + s * 170) % (width + 200));
      const sx = width - progress;
      const sy = 40 + (s * 73) % (height * 0.65) + progress * 0.25;
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 26, sy - 10);
      ctx.stroke();
    }
  }

  // Drifting Pixel Clouds
  for (let c = 0; c < 6; c++) {
    const cx = ((c * 280 + time * 0.012) % (width + 220)) - 110;
    const cy = 60 + (c * 110) % Math.max(180, height - 140);
    ctx.fillStyle = pal.cloud;
    ctx.fillRect(Math.round(cx), Math.round(cy), 96, 22);
    ctx.fillRect(Math.round(cx + 16), Math.round(cy - 12), 64, 14);
  }

  ctx.save();
  ctx.translate(Math.round(width / 2 - camera.x), Math.round(height / 2 - camera.y));

  // World Geometry
  const nearDoor =
    nearestSpot?.kind === 'door_enter' || nearestSpot?.kind === 'door_exit';
  if (scene === 'island') {
    drawIslandWorld(ctx, state, time, nearDoor);
  } else {
    drawCottageWorld(ctx, state, time, nearDoor);
  }

  // Collectibles in current scene
  for (const col of state.collectibles) {
    if (col.collected || col.scene !== scene) continue;
    const floatY = Math.sin(time * 0.005 + col.x) * 3;
    if (col.kind === 'coin') {
      px(ctx, col.x - 6, col.y - 6 + floatY, 12, 12, '#F59E0B');
      px(ctx, col.x - 4, col.y - 4 + floatY, 8, 8, '#FDE047');
    } else {
      ctx.fillStyle = 'rgba(125, 211, 252, 0.32)';
      ctx.beginPath();
      ctx.arc(col.x, col.y + floatY, 12, 0, Math.PI * 2);
      ctx.fill();
      px(ctx, col.x - 6, col.y - 2 + floatY, 12, 4, '#FEF08A');
      px(ctx, col.x - 2, col.y - 6 + floatY, 4, 12, '#FEF08A');
    }
  }

  // User-Placed Decorations in current scene
  for (const decor of state.decorations) {
    if (decor.scene === scene) {
      drawPlacedDecoration(ctx, decor, time);
    }
  }

  // Nearest Interactable Highlight Ring
  if (nearestSpot) {
    const pulse = 18 + Math.sin(time * 0.008) * 3;
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(nearestSpot.x, nearestSpot.y, pulse, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Sort Players by Y for proper depth overlapping
  const playersToDraw: Array<{ player: PlayerState; isLocal: boolean }> = [
    { player: localPlayer, isLocal: true },
  ];

  const hs = state.hideAndSeek;
  const hidePartnerTag =
    hs.active &&
    hs.phase === 'seeking' &&
    hs.seekerId === localPlayer.id &&
    partnerPlayer &&
    Math.hypot(partnerPlayer.x - localPlayer.x, partnerPlayer.y - localPlayer.y) > 150;

  if (partnerPlayer && partnerPlayer.connected && partnerPlayer.scene === scene) {
    playersToDraw.push({ player: partnerPlayer, isLocal: false });
  }
  playersToDraw.sort((a, b) => a.player.y - b.player.y);

  for (const { player } of playersToDraw) {
    // Fishing line if fishing
    if (player.fishingState !== 'none' && scene === 'island') {
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(player.x - 16, player.y - 22);
      ctx.lineTo(112, player.y + 4);
      ctx.stroke();

      const bobY =
        player.fishingState === 'bite'
          ? player.y + 4 + Math.sin(time * 0.03) * 4
          : player.y + 4 + Math.sin(time * 0.004) * 1.5;
      px(ctx, 108, bobY, 8, 8, player.fishingState === 'bite' ? '#EF4444' : '#F8FAFC');
      if (player.fishingState === 'bite') {
        ctx.fillStyle = '#FDE047';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', 112, bobY - 10);
      }
    }

    drawCharacterSprite(ctx, {
      x: player.x,
      y: player.y,
      character: player.character,
      accentColor: player.accentColor,
      dir: player.dir,
      action: player.action,
      time,
      scale: 2.5,
    });

    // Nametag (hidden if partner is hiding far away during Hide & Seek!)
    if (!(player.id !== localPlayer.id && hidePartnerTag)) {
      ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      const labelW = ctx.measureText(player.name).width + 14;
      ctx.fillStyle = 'rgba(15, 20, 38, 0.72)';
      ctx.beginPath();
      ctx.roundRect(player.x - labelW / 2, player.y - 74, labelW, 20, 6);
      ctx.fill();
      ctx.fillStyle = '#F8F3E6';
      ctx.fillText(player.name, player.x, player.y - 60);
    }

    // Active Emote Bubble
    if (player.emote && Date.now() < player.emoteUntil) {
      const emoteGlyph: Record<EmoteType, string> = {
        heart: '♥',
        wave: '👋',
        sparkle: '✦',
        tea: '☕',
        dance: '♪',
        music: '♫',
      };
      const bob = Math.sin(time * 0.01) * 3;
      ctx.fillStyle = '#FFF7ED';
      ctx.beginPath();
      ctx.roundRect(player.x - 16, player.y - 106 + bob, 32, 26, 8);
      ctx.fill();
      ctx.fillStyle = player.emote === 'heart' ? '#EC4899' : '#1E293B';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(emoteGlyph[player.emote] || '✦', player.x, player.y - 88 + bob);
    }

    // Active Speech Bubble
    if (player.chatText && Date.now() < player.chatUntil) {
      ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      const tw = Math.min(200, ctx.measureText(player.chatText).width + 20);
      ctx.fillStyle = '#FFFDF7';
      ctx.beginPath();
      ctx.roundRect(player.x - tw / 2, player.y - 108, tw, 26, 8);
      ctx.fill();
      ctx.fillStyle = '#1E293B';
      ctx.fillText(player.chatText, player.x, player.y - 91, 184);
    }
  }

  // Particles & Floating Feedback Labels
  for (const pt of particles) {
    const alpha = Math.max(0, pt.life / pt.maxLife);
    ctx.globalAlpha = alpha;
    if (pt.label) {
      ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0F172A';
      ctx.fillText(pt.label, pt.x + 1, pt.y + 1);
      ctx.fillStyle = '#FDE68A';
      ctx.fillText(pt.label, pt.x, pt.y);
    } else if (pt.type === 'hearts') {
      ctx.fillStyle = '#F472B6';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('♥', pt.x, pt.y);
    } else if (pt.type === 'confetti') {
      const cols = ['#F472B6', '#FBBF24', '#60A5FA', '#34D399'];
      px(ctx, pt.x, pt.y, 5, 5, cols[Math.floor(pt.x) % cols.length]);
    } else {
      px(ctx, pt.x - 2, pt.y - 2, 4, 4, '#FDE047');
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  // Hide & Seek Seeker Blindfold Overlay during countdown
  if (
    hs.active &&
    hs.phase === 'countdown' &&
    hs.seekerId === localPlayer.id
  ) {
    const rem = Math.max(0, Math.ceil((hs.countdownEnd - Date.now()) / 1000));
    ctx.fillStyle = 'rgba(11, 16, 36, 0.92)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#F8F3E6';
    ctx.font = '700 28px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Counting... ${rem}s`, width / 2, height / 2 - 12);
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '500 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Your partner is hiding on the island or in the cottage!', width / 2, height / 2 + 22);
  }
}

export function getWorldDimensions(scene: 'island' | 'cottage') {
  return scene === 'island'
    ? { width: ISLAND_WIDTH, height: ISLAND_HEIGHT }
    : { width: COTTAGE_WIDTH, height: COTTAGE_HEIGHT };
}
