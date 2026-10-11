// CoinQuest's pixel-art coin: a grid of palette keys, '.' is transparent. Rendered by <Coin />.
// Black and white theme: the palette is greys only.

export const PALETTE: Record<string, string> = {
  k: '#000000',
  w: '#FFFFFF',
  y: '#E6E6E6',
  Y: '#737373',
  o: '#A6A6A6',
  b: '#626262',
  d: '#363636',
  r: '#4E4E4E',
  R: '#222222',
  g: '#787878',
  l: '#B1B1B1',
  G: '#3F3F3F',
  u: '#515151',
  c: '#A5A5A5',
  C: '#636363',
  s: '#D2D2D2',
  S: '#959595',
  p: '#9C9C9C',
  P: '#5D5D5D',
  n: '#BCBCBC',
  N: '#6C6C6C',
  v: '#666666',
  V: '#323232',
  h: '#333333',
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
