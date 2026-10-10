// CoinQuest design tokens. See docs/design/DESIGN.md for the reasoning.

export const C = {
  paper: '#F4F1EA',
  paperDeep: '#ECE7DC',
  surface: '#FFFFFF',
  ink: '#16130F',
  ink2: '#5E574C',
  ink3: '#8F8778',
  line: '#E4DED2',
  lineStrong: '#D3CBBB',

  night: '#16130F',
  night2: '#24201A',
  night3: '#3A342B',
  nightText: '#F4F1EA',
  nightMuted: '#A59D8E',

  gold: '#E3A812',
  goldDeep: '#A87A06',
  goldSoft: '#FBF1D3',

  green: '#167150',
  greenSoft: '#DDEFE5',
  red: '#B5402E',
  redSoft: '#F6E2DC',
  blue: '#2D5BC4',
  blueSoft: '#E2E9F8',
};

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

// Soft, warm tints for monogram avatars and category marks. Picked by hashing a name.
export const TINTS = [
  { bg: '#F3E1C7', fg: '#7A4B12' },
  { bg: '#DCE9DC', fg: '#2E5B37' },
  { bg: '#E3E1F2', fg: '#45407A' },
  { bg: '#F4DAD5', fg: '#8A3426' },
  { bg: '#D9E7EE', fg: '#245066' },
  { bg: '#EFE4C9', fg: '#6B5414' },
];

export const tintFor = (key: string) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
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
