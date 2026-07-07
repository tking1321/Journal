export const LightColors = {
  primary: '#0A0A0A',
  primaryLight: '#2A2A2A',
  primaryDark: '#000000',
  secondary: '#6B6B6B',
  secondaryLight: '#9A9A9A',
  accent: '#C9A84C',
  success: '#1D6A3A',
  successLight: '#EDF5F0',
  warning: '#A0620A',
  error: '#C0392B',
  background: '#F8F8F8',
  surface: '#FFFFFF',
  surfaceElevated: '#F2F2F2',
  surfaceDark: '#0A0A0A',
  text: '#0A0A0A',
  textSecondary: '#5A5A5A',
  textTertiary: '#9A9A9A',
  textInverse: '#FFFFFF',
  border: '#E0E0E0',
  borderLight: '#EFEFEF',
  shadow: 'rgba(0, 0, 0, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.55)',
};

export const DarkColors = {
  primary: '#F0F0F0',
  primaryLight: '#CCCCCC',
  primaryDark: '#FFFFFF',
  secondary: '#888888',
  secondaryLight: '#AAAAAA',
  accent: '#C9A84C',
  success: '#27AE60',
  successLight: '#0D2818',
  warning: '#E67E22',
  error: '#E74C3C',
  background: '#111111',
  surface: '#1C1C1C',
  surfaceElevated: '#252525',
  surfaceDark: '#F0F0F0',
  text: '#EEEEEE',
  textSecondary: '#999999',
  textTertiary: '#585858',
  textInverse: '#111111',
  border: '#2E2E2E',
  borderLight: '#232323',
  shadow: 'rgba(0, 0, 0, 0.4)',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

export type ColorScheme = typeof LightColors;

export function getColors(isDark: boolean): ColorScheme {
  return isDark ? DarkColors : LightColors;
}

// Backward compat alias
export const Colors = LightColors;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 36,
};

export interface LevelIcon {
  icon: string;
  color: string;
  label: string;
}

// Tiers: Gray 1-10, Teal 11-20, Green 21-30, Gold 31-40, Amber 41-50,
//        Blue 51-60, Indigo 61-70, Red 71-80, Crimson 81-90, Elite 91-100
export const LEVEL_ICONS: LevelIcon[] = [
  // 1-10: Gray — circle
  { icon: 'circle',      color: '#9A9A9A', label: 'Novice' },
  { icon: 'circle',      color: '#8E8E8E', label: 'Learner' },
  { icon: 'circle',      color: '#828282', label: 'Builder' },
  { icon: 'circle',      color: '#767676', label: 'Seeker' },
  { icon: 'circle',      color: '#6A6A6A', label: 'Finder' },
  { icon: 'square',      color: '#616161', label: 'Maker' },
  { icon: 'square',      color: '#585858', label: 'Mover' },
  { icon: 'square',      color: '#505050', label: 'Starter' },
  { icon: 'square',      color: '#484848', label: 'Climber' },
  { icon: 'square',      color: '#404040', label: 'Rising' },
  // 11-20: Teal — leaf
  { icon: 'leaf',        color: '#2DD4BF', label: 'Sprout' },
  { icon: 'leaf',        color: '#26BFA9', label: 'Grower' },
  { icon: 'leaf',        color: '#20AA95', label: 'Bloomer' },
  { icon: 'leaf',        color: '#1A9581', label: 'Thriver' },
  { icon: 'leaf',        color: '#148070', label: 'Flourisher' },
  { icon: 'sun',         color: '#0F6B5F', label: 'Verdant' },
  { icon: 'sun',         color: '#0B584E', label: 'Rooted' },
  { icon: 'sun',         color: '#084540', label: 'Steady' },
  { icon: 'sun',         color: '#063330', label: 'Grounded' },
  { icon: 'sun',         color: '#042220', label: 'Planted' },
  // 21-30: Green — star
  { icon: 'star',        color: '#22C55E', label: 'Achiever' },
  { icon: 'star',        color: '#1EAF53', label: 'Performer' },
  { icon: 'star',        color: '#1A9948', label: 'Executor' },
  { icon: 'star',        color: '#16833D', label: 'Finisher' },
  { icon: 'star',        color: '#126D32', label: 'Completer' },
  { icon: 'award',       color: '#0F5728', label: 'Winner' },
  { icon: 'award',       color: '#0C411E', label: 'Champion' },
  { icon: 'award',       color: '#092C14', label: 'Victor' },
  { icon: 'award',       color: '#06170A', label: 'Triumph' },
  { icon: 'award',       color: '#040E06', label: 'Conqueror' },
  // 31-40: Gold — zap
  { icon: 'zap',         color: '#FBBF24', label: 'Sparked' },
  { icon: 'zap',         color: '#F0AD1C', label: 'Charged' },
  { icon: 'zap',         color: '#E59A14', label: 'Fired' },
  { icon: 'zap',         color: '#DA870C', label: 'Energized' },
  { icon: 'zap',         color: '#CF7404', label: 'Live' },
  { icon: 'zap',         color: '#C9A84C', label: 'Blazing' },
  { icon: 'zap',         color: '#B8960A', label: 'Surging' },
  { icon: 'zap',         color: '#A78408', label: 'Pulsing' },
  { icon: 'zap',         color: '#967206', label: 'Burning' },
  { icon: 'zap',         color: '#856004', label: 'Ignited' },
  // 41-50: Amber — sun
  { icon: 'sun',         color: '#F97316', label: 'Bright' },
  { icon: 'sun',         color: '#EA6810', label: 'Radiant' },
  { icon: 'sun',         color: '#DB5D0A', label: 'Glowing' },
  { icon: 'sun',         color: '#CC5204', label: 'Shining' },
  { icon: 'sun',         color: '#BD4700', label: 'Beaming' },
  { icon: 'sun',         color: '#D97706', label: 'Brilliant' },
  { icon: 'sun',         color: '#C86B05', label: 'Luminous' },
  { icon: 'sun',         color: '#B75F04', label: 'Incandescent' },
  { icon: 'sun',         color: '#A65303', label: 'Solar' },
  { icon: 'sun',         color: '#954702', label: 'Apex' },
  // 51-60: Blue — anchor
  { icon: 'anchor',      color: '#3B82F6', label: 'Anchored' },
  { icon: 'anchor',      color: '#3072E0', label: 'Stable' },
  { icon: 'anchor',      color: '#2562CA', label: 'Firm' },
  { icon: 'anchor',      color: '#1A52B4', label: 'Rooted' },
  { icon: 'anchor',      color: '#0F429E', label: 'Fixed' },
  { icon: 'shield',      color: '#2563EB', label: 'Centered' },
  { icon: 'shield',      color: '#1C53D1', label: 'Balanced' },
  { icon: 'shield',      color: '#1343B7', label: 'Core' },
  { icon: 'shield',      color: '#0A339D', label: 'Pillar' },
  { icon: 'shield',      color: '#012383', label: 'Fortress' },
  // 61-70: Deep Blue — compass
  { icon: 'compass',     color: '#1D4ED8', label: 'Navigator' },
  { icon: 'compass',     color: '#1740C0', label: 'Pathfinder' },
  { icon: 'compass',     color: '#1132A8', label: 'Trailblazer' },
  { icon: 'compass',     color: '#0B2490', label: 'Explorer' },
  { icon: 'compass',     color: '#051678', label: 'Wayfarer' },
  { icon: 'target',      color: '#1E3A8A', label: 'Precise' },
  { icon: 'target',      color: '#182E70', label: 'Locked' },
  { icon: 'target',      color: '#122256', label: 'Zeroed' },
  { icon: 'target',      color: '#0C163C', label: 'Calibrated' },
  { icon: 'target',      color: '#060A22', label: 'Honed' },
  // 71-80: Red — flag
  { icon: 'flag',        color: '#EF4444', label: 'Elite' },
  { icon: 'flag',        color: '#DF3C3C', label: 'Ranked' },
  { icon: 'flag',        color: '#CF3434', label: 'Decorated' },
  { icon: 'flag',        color: '#BF2C2C', label: 'Honored' },
  { icon: 'flag',        color: '#AF2424', label: 'Acclaimed' },
  { icon: 'flag',        color: '#DC2626', label: 'Revered' },
  { icon: 'flag',        color: '#CC1E1E', label: 'Exalted' },
  { icon: 'flag',        color: '#BC1616', label: 'Storied' },
  { icon: 'flag',        color: '#AC0E0E', label: 'Legendary' },
  { icon: 'flag',        color: '#9C0606', label: 'Mythic' },
  // 81-90: Crimson — trending-up
  { icon: 'trending-up', color: '#C0392B', label: 'Ascendant' },
  { icon: 'trending-up', color: '#B03020', label: 'Visionary' },
  { icon: 'trending-up', color: '#A02715', label: 'Relentless' },
  { icon: 'trending-up', color: '#901E0A', label: 'Unyielding' },
  { icon: 'trending-up', color: '#801500', label: 'Tenacious' },
  { icon: 'trending-up', color: '#991B1B', label: 'Transcendent' },
  { icon: 'trending-up', color: '#891212', label: 'Absolute' },
  { icon: 'trending-up', color: '#790909', label: 'Eternal' },
  { icon: 'trending-up', color: '#690000', label: 'Infinite' },
  { icon: 'trending-up', color: '#590000', label: 'Limitless' },
  // 91-100: Elite Dark — activity
  { icon: 'activity',    color: '#DC2626', label: 'Summit' },
  { icon: 'activity',    color: '#B91C1C', label: 'Pinnacle' },
  { icon: 'activity',    color: '#991B1B', label: 'Mastered' },
  { icon: 'activity',    color: '#7F1D1D', label: 'Sovereign' },
  { icon: 'activity',    color: '#6B1111', label: 'Apex' },
  { icon: 'activity',    color: '#570808', label: 'Mythical' },
  { icon: 'activity',    color: '#430000', label: 'Immortal' },
  { icon: 'activity',    color: '#2F0000', label: 'Transcendent' },
  { icon: 'activity',    color: '#1B0000', label: 'Ultimate' },
  { icon: 'activity',    color: '#0F0000', label: 'Diverge' },
];

export function getLevelIcon(level: number): LevelIcon {
  const idx = Math.min(Math.max(level - 1, 0), LEVEL_ICONS.length - 1);
  return LEVEL_ICONS[idx];
}
