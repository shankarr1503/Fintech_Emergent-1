// CoinQuest's pixel-art coin: a grid of palette keys, '.' is transparent. Rendered by <Coin />.

export const PALETTE: Record<string, string> = {
  k: '#000000',
  w: '#FFFFFF',
  y: '#FCD800',
  Y: '#AC7C00',
  o: '#FC9838',
  b: '#C84C0C',
  d: '#6E2A0A',
  r: '#E52521',
  R: '#A00000',
  g: '#00A800',
  l: '#80D010',
  G: '#005800',
  u: '#0058F8',
  c: '#3CBCFC',
  C: '#007C8C',
  s: '#FFC9A0',
  S: '#D9875A',
  p: '#F878F8',
  P: '#C2399A',
  n: '#BCBCBC',
  N: '#6C6C6C',
  v: '#8A4CFC',
  V: '#4B1FA8',
  h: '#503000',
};

export const SPRITES = {
  coin: [
    '..kkkk..',
    '.kyyyyk.',
    'kyywyyok',
    'kyywyyok',
    'kyywyyok',
    'kyywyyok',
    'kyywyyok',
    'kyyyyyok',
    '.kooook.',
    '..kkkk..',
  ],
} as const;
