// 8-bit platformer design tokens. Everything visual in the app pulls from here.

export const C = {
  ink: '#000000',
  white: '#FFFFFF',
  paper: '#FFF6D8', // dialog/card fill
  paperDark: '#F2DFA6',

  sky: '#5C94FC',
  skyLight: '#9CC4FF',
  night: '#0B0F2A',
  underground: '#111428',
  castle: '#1C1C1C',

  coin: '#FCD800',
  coinDark: '#AC7C00',
  orange: '#FC9838',
  block: '#F8A830',
  blockLight: '#FFD27F',
  blockDark: '#B8520C',

  brick: '#C84C0C',
  brickLight: '#FC9838',
  brickDark: '#6E2A0A',

  pipe: '#00A800',
  pipeLight: '#80D010',
  pipeDark: '#005800',

  red: '#E52521',
  redDark: '#A00000',
  blue: '#0058F8',
  cyan: '#3CBCFC',
  purple: '#8A4CFC',
  pink: '#F878F8',
  gray: '#BCBCBC',
  grayDark: '#6C6C6C',
  lava: '#FF5A1F',

  text: '#1A1A1A',
  textMuted: '#5B5240',
  success: '#00A800',
  danger: '#E52521',
};

export const F = {
  pixel: 'PressStart2P_400Regular',
};

// Hard-edged, no-blur "drop shadow" used on every chunky surface.
export const BORDER = 3;
export const SHADOW = 4;

export type World = 'overworld' | 'underground' | 'castle' | 'night';

export const WORLD_BG: Record<World, string> = {
  overworld: C.sky,
  underground: C.underground,
  castle: C.castle,
  night: C.night,
};

export const CATEGORY: Record<string, { color: string; sprite: string }> = {
  food: { color: '#FF6B4A', sprite: 'fire' },
  transport: { color: '#3CBCFC', sprite: 'bolt' },
  shopping: { color: '#F878F8', sprite: 'gift' },
  utilities: { color: '#FCD800', sprite: 'bolt' },
  entertainment: { color: '#8A4CFC', sprite: 'star' },
  health: { color: '#E52521', sprite: 'heart' },
  education: { color: '#0058F8', sprite: 'book' },
  salary: { color: '#00A800', sprite: 'coin' },
  investment: { color: '#80D010', sprite: 'gem' },
  transfer: { color: '#BCBCBC', sprite: 'pipe' },
  emi: { color: '#C84C0C', sprite: 'card' },
  subscription: { color: '#FC9838', sprite: 'potion' },
  other: { color: '#BCBCBC', sprite: 'chest' },
};

export const categoryMeta = (category: string) => CATEGORY[category] || CATEGORY.other;
