// CoinQuest design tokens. See docs/design/DESIGN.md for the reasoning.
//
// Calm, trust-first palette: deep navy for primary surfaces and actions,
// green for money in and success, red only for problems, gold only for rewards.
// `C` always points at the active palette (light or dark); styles built with
// `themed()` are recomputed when the palette changes.

type Palette = {
  paper: string;
  paperDeep: string;
  surface: string;
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  lineStrong: string;
  night: string;
  night2: string;
  night3: string;
  nightText: string;
  nightMuted: string;
  primary: string;
  onPrimary: string;
  gold: string;
  goldDeep: string;
  goldSoft: string;
  green: string;
  greenSoft: string;
  red: string;
  redSoft: string;
  blue: string;
  blueSoft: string;
  amber: string;
  amberSoft: string;
};

// Black and white only: every token is a shade of grey. Meaning never relies on colour alone;
// states carry an icon and a word (Paid / Pending / Failed). Text meets WCAG AA (4.5:1) or better.
const LIGHT: Palette = {
  paper: '#FFFFFF',
  paperDeep: '#F2F2F2',
  surface: '#FFFFFF',
  ink: '#000000',
  ink2: '#333333',
  ink3: '#595959',
  line: '#E0E0E0',
  lineStrong: '#BDBDBD',

  night: '#000000',
  night2: '#1A1A1A',
  night3: '#3D3D3D',
  nightText: '#FFFFFF',
  nightMuted: '#B3B3B3',

  primary: '#000000',
  onPrimary: '#FFFFFF',

  // The accent on dark surfaces (progress, rings, highlights): white.
  gold: '#FFFFFF',
  goldDeep: '#333333',
  goldSoft: '#F2F2F2',

  green: '#000000',
  greenSoft: '#F2F2F2',
  red: '#000000',
  redSoft: '#EBEBEB',
  blue: '#000000',
  blueSoft: '#F2F2F2',
  amber: '#333333',
  amberSoft: '#F2F2F2',
};

const DARK: Palette = {
  paper: '#000000',
  paperDeep: '#141414',
  surface: '#0D0D0D',
  ink: '#FFFFFF',
  ink2: '#D9D9D9',
  ink3: '#A6A6A6',
  line: '#262626',
  lineStrong: '#404040',

  night: '#1A1A1A',
  night2: '#262626',
  night3: '#474747',
  nightText: '#FFFFFF',
  nightMuted: '#B3B3B3',

  primary: '#FFFFFF',
  onPrimary: '#000000',

  gold: '#FFFFFF',
  goldDeep: '#E6E6E6',
  goldSoft: '#1F1F1F',

  green: '#FFFFFF',
  greenSoft: '#1F1F1F',
  red: '#FFFFFF',
  redSoft: '#262626',
  blue: '#FFFFFF',
  blueSoft: '#1A1A1A',
  amber: '#E6E6E6',
  amberSoft: '#1F1F1F',
};

export type Scheme = 'light' | 'dark';
let active: Palette = LIGHT;
let scheme: Scheme = 'light';
let version = 0;

/** Switch palettes. Call before rendering the tree that should use it. */
export function setScheme(next: Scheme) {
  if (next === scheme) return;
  scheme = next;
  active = next === 'dark' ? DARK : LIGHT;
  version++;
}

export const getScheme = () => scheme;

/** Live view of the active palette: `C.ink` always reads the current value. */
export const C = new Proxy({} as Palette, { get: (_t, key: string) => active[key as keyof Palette] });

/** Wrap a StyleSheet factory so its styles follow the active palette. Usage stays `styles.foo`. */
export function themed<T extends object>(factory: () => T): T {
  let cache: T | null = null;
  let builtFor = -1;
  return new Proxy({} as T, {
    get: (_t, key) => {
      if (!cache || builtFor !== version) {
        cache = factory();
        builtFor = version;
      }
      return cache[key as keyof T];
    },
  });
}

// Small caps throughout: Playfair Display SC for headings and big amounts, Alegreya Sans SC for everything else.
// Both draw lowercase letters as small capitals and keep clear lining digits for money.
export const F = {
  display: 'PlayfairDisplaySC_400Regular',
  displayItalic: 'PlayfairDisplaySC_400Regular_Italic',
  regular: 'AlegreyaSansSC_400Regular',
  medium: 'AlegreyaSansSC_500Medium',
  semibold: 'AlegreyaSansSC_700Bold',
  bold: 'AlegreyaSansSC_800ExtraBold',
};

export const R = { sm: 12, md: 18, lg: 26, pill: 999 };
export const GUTTER = 20;

// Monogram avatars and category marks: greys only, varied by lightness so neighbours still differ.
const TINTS_LIGHT = [
  { bg: '#F2F2F2', fg: '#000000' },
  { bg: '#E6E6E6', fg: '#000000' },
  { bg: '#D9D9D9', fg: '#000000' },
  { bg: '#000000', fg: '#FFFFFF' },
  { bg: '#333333', fg: '#FFFFFF' },
  { bg: '#EDEDED', fg: '#1A1A1A' },
];
const TINTS_DARK = [
  { bg: '#1F1F1F', fg: '#FFFFFF' },
  { bg: '#2B2B2B', fg: '#FFFFFF' },
  { bg: '#383838', fg: '#FFFFFF' },
  { bg: '#FFFFFF', fg: '#000000' },
  { bg: '#D9D9D9', fg: '#000000' },
  { bg: '#262626', fg: '#E6E6E6' },
];

export const tintFor = (key: string) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const set = scheme === 'dark' ? TINTS_DARK : TINTS_LIGHT;
  return set[h % set.length];
};

// Feather icon per spending category.
export const CATEGORY_ICON: Record<string, string> = {
  food: 'coffee',
  transport: 'navigation',
  shopping: 'shopping-bag',
  utilities: 'zap',
  entertainment: 'film',
  health: 'heart',
  education: 'book-open',
  salary: 'briefcase',
  investment: 'trending-up',
  transfer: 'repeat',
  emi: 'credit-card',
  subscription: 'refresh-cw',
  other: 'circle',
};
