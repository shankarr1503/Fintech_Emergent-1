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

// Text colours meet WCAG AA (4.5:1) on the backgrounds they're used on.
const LIGHT: Palette = {
  paper: '#F3F6F4',
  paperDeep: '#E5ECE8',
  surface: '#FFFFFF',
  ink: '#0F1E2B',
  ink2: '#4A5B69',
  ink3: '#5F6A74',
  line: '#DCE4E0',
  lineStrong: '#C3CFCA',

  night: '#0E2A3B',
  night2: '#173A4F',
  night3: '#2A5068',
  nightText: '#F1F6F4',
  nightMuted: '#9FB6C4',

  primary: '#0E2A3B',
  onPrimary: '#F1F6F4',

  gold: '#E3A812',
  goldDeep: '#8C6505',
  goldSoft: '#FBF1D3',

  green: '#127753',
  greenSoft: '#DCF0E6',
  red: '#B83A2E',
  redSoft: '#F7E1DD',
  blue: '#1F5FBF',
  blueSoft: '#E1EAF8',
  amber: '#9A5A00',
  amberSoft: '#FCEBD2',
};

const DARK: Palette = {
  paper: '#0B141B',
  paperDeep: '#16232D',
  surface: '#111D26',
  ink: '#E8EFEC',
  ink2: '#B4C3CD',
  ink3: '#83939F',
  line: '#22323D',
  lineStrong: '#334754',

  night: '#173447',
  night2: '#1F4157',
  night3: '#2E5670',
  nightText: '#F1F6F4',
  nightMuted: '#A6BCC9',

  primary: '#8CC3F0',
  onPrimary: '#0B141B',

  gold: '#E8B52C',
  goldDeep: '#F0C95E',
  goldSoft: '#3A2F10',

  green: '#55C793',
  greenSoft: '#163A2B',
  red: '#F08A7B',
  redSoft: '#3E1F1B',
  blue: '#8CC3F0',
  blueSoft: '#1A2E47',
  amber: '#F2B45A',
  amberSoft: '#3A2A12',
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

export const F = {
  display: 'InstrumentSerif_400Regular',
  displayItalic: 'InstrumentSerif_400Regular_Italic',
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
};

export const R = { sm: 12, md: 18, lg: 26, pill: 999 };
export const GUTTER = 20;

// Soft tints for monogram avatars and category marks, picked by hashing a name.
const TINTS_LIGHT = [
  { bg: '#DCEBF5', fg: '#1F4E6E' },
  { bg: '#DCEFE4', fg: '#22603F' },
  { bg: '#E4E3F3', fg: '#45407A' },
  { bg: '#F3E1D9', fg: '#7E3B26' },
  { bg: '#D8ECEC', fg: '#1F5A5A' },
  { bg: '#EFE7CF', fg: '#6B5414' },
];
const TINTS_DARK = [
  { bg: '#1B3346', fg: '#A9D0EE' },
  { bg: '#173828', fg: '#9FDDBC' },
  { bg: '#262641', fg: '#C3BFF0' },
  { bg: '#3A241C', fg: '#F0B9A3' },
  { bg: '#163636', fg: '#9BD9D9' },
  { bg: '#332B12', fg: '#E8D290' },
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
