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

// 20 tiers × 5 levels = 100. Green → Teal → Blue → Gold → Orange → Red → Dark Red
export const LEVEL_ICONS: LevelIcon[] = [
  // 1-5: Lime green — circle
  { icon: 'circle',      color: '#4ADE80', label: 'Novice' },
  { icon: 'circle',      color: '#39CE70', label: 'Learner' },
  { icon: 'circle',      color: '#28BE60', label: 'Builder' },
  { icon: 'circle',      color: '#22B858', label: 'Seeker' },
  { icon: 'circle',      color: '#1CAE50', label: 'Finder' },
  // 6-10: Green — feather
  { icon: 'feather',     color: '#22C55E', label: 'Grower' },
  { icon: 'feather',     color: '#1EB356', label: 'Maker' },
  { icon: 'feather',     color: '#1AA14E', label: 'Mover' },
  { icon: 'feather',     color: '#168F46', label: 'Starter' },
  { icon: 'feather',     color: '#127D3E', label: 'Rising' },
  // 11-15: Forest green — star
  { icon: 'star',        color: '#16A34A', label: 'Achiever' },
  { icon: 'star',        color: '#139142', label: 'Performer' },
  { icon: 'star',        color: '#107F3A', label: 'Executor' },
  { icon: 'star',        color: '#0D6D32', label: 'Finisher' },
  { icon: 'star',        color: '#0A5B2A', label: 'Champion' },
  // 16-20: Teal — sun
  { icon: 'sun',         color: '#14B8A6', label: 'Sprout' },
  { icon: 'sun',         color: '#10A898', label: 'Thriver' },
  { icon: 'sun',         color: '#0C988A', label: 'Flourisher' },
  { icon: 'sun',         color: '#08887C', label: 'Verdant' },
  { icon: 'sun',         color: '#04786E', label: 'Rooted' },
  // 21-25: Deep teal — compass
  { icon: 'compass',     color: '#0D9488', label: 'Calibrated' },
  { icon: 'compass',     color: '#0A847A', label: 'Steady' },
  { icon: 'compass',     color: '#07746C', label: 'Grounded' },
  { icon: 'compass',     color: '#04645E', label: 'Planted' },
  { icon: 'compass',     color: '#015450', label: 'Centered' },
  // 26-30: Sky blue — anchor
  { icon: 'anchor',      color: '#0EA5E9', label: 'Navigator' },
  { icon: 'anchor',      color: '#0B95D9', label: 'Pathfinder' },
  { icon: 'anchor',      color: '#0885C9', label: 'Wayfarer' },
  { icon: 'anchor',      color: '#0575B9', label: 'Explorer' },
  { icon: 'anchor',      color: '#0265A9', label: 'Trailblazer' },
  // 31-35: Blue — shield
  { icon: 'shield',      color: '#3B82F6', label: 'Anchored' },
  { icon: 'shield',      color: '#3272E4', label: 'Stable' },
  { icon: 'shield',      color: '#2962D2', label: 'Firm' },
  { icon: 'shield',      color: '#2052C0', label: 'Balanced' },
  { icon: 'shield',      color: '#1742AE', label: 'Core' },
  // 36-40: Deep blue — target
  { icon: 'target',      color: '#2563EB', label: 'Precise' },
  { icon: 'target',      color: '#1D55D3', label: 'Locked' },
  { icon: 'target',      color: '#1547BB', label: 'Zeroed' },
  { icon: 'target',      color: '#0D39A3', label: 'Aimed' },
  { icon: 'target',      color: '#052B8B', label: 'Honed' },
  // 41-45: Royal blue — award
  { icon: 'award',       color: '#1D4ED8', label: 'Decorated' },
  { icon: 'award',       color: '#1741C4', label: 'Honored' },
  { icon: 'award',       color: '#1134B0', label: 'Acclaimed' },
  { icon: 'award',       color: '#0B279C', label: 'Revered' },
  { icon: 'award',       color: '#051A88', label: 'Exalted' },
  // 46-50: Gold — zap
  { icon: 'zap',         color: '#F59E0B', label: 'Sparked' },
  { icon: 'zap',         color: '#E38E08', label: 'Charged' },
  { icon: 'zap',         color: '#D17E05', label: 'Fired' },
  { icon: 'zap',         color: '#BF6E02', label: 'Energized' },
  { icon: 'zap',         color: '#AD5E00', label: 'Live' },
  // 51-55: Deep gold — zap
  { icon: 'zap',         color: '#D97706', label: 'Blazing' },
  { icon: 'zap',         color: '#C96A05', label: 'Surging' },
  { icon: 'zap',         color: '#B95D04', label: 'Pulsing' },
  { icon: 'zap',         color: '#A95003', label: 'Burning' },
  { icon: 'zap',         color: '#994302', label: 'Ignited' },
  // 56-60: Orange — sun
  { icon: 'sun',         color: '#F97316', label: 'Bright' },
  { icon: 'sun',         color: '#E86410', label: 'Radiant' },
  { icon: 'sun',         color: '#D7550A', label: 'Glowing' },
  { icon: 'sun',         color: '#C64604', label: 'Shining' },
  { icon: 'sun',         color: '#B53700', label: 'Beaming' },
  // 61-65: Deep orange — flag
  { icon: 'flag',        color: '#EA580C', label: 'Brilliant' },
  { icon: 'flag',        color: '#D94C0A', label: 'Luminous' },
  { icon: 'flag',        color: '#C84008', label: 'Incandescent' },
  { icon: 'flag',        color: '#B73406', label: 'Solar' },
  { icon: 'flag',        color: '#A62804', label: 'Storied' },
  // 66-70: Red — flag
  { icon: 'flag',        color: '#DC2626', label: 'Elite' },
  { icon: 'flag',        color: '#CC1E1E', label: 'Ranked' },
  { icon: 'flag',        color: '#BC1616', label: 'Legendary' },
  { icon: 'flag',        color: '#AC0E0E', label: 'Mythic' },
  { icon: 'flag',        color: '#9C0606', label: 'Storied' },
  // 71-75: Crimson — trending-up
  { icon: 'trending-up', color: '#B91C1C', label: 'Ascendant' },
  { icon: 'trending-up', color: '#AC1818', label: 'Visionary' },
  { icon: 'trending-up', color: '#9F1414', label: 'Relentless' },
  { icon: 'trending-up', color: '#921010', label: 'Unyielding' },
  { icon: 'trending-up', color: '#850C0C', label: 'Tenacious' },
  // 76-80: Deep crimson — trending-up
  { icon: 'trending-up', color: '#991B1B', label: 'Transcendent' },
  { icon: 'trending-up', color: '#8A1414', label: 'Absolute' },
  { icon: 'trending-up', color: '#7B0D0D', label: 'Eternal' },
  { icon: 'trending-up', color: '#6C0606', label: 'Infinite' },
  { icon: 'trending-up', color: '#5D0000', label: 'Limitless' },
  // 81-85: Dark red — activity
  { icon: 'activity',    color: '#991B1B', label: 'Summit' },
  { icon: 'activity',    color: '#891414', label: 'Pinnacle' },
  { icon: 'activity',    color: '#790D0D', label: 'Mastered' },
  { icon: 'activity',    color: '#690606', label: 'Sovereign' },
  { icon: 'activity',    color: '#590000', label: 'Apex' },
  // 86-90: Very dark red — activity
  { icon: 'activity',    color: '#7F1D1D', label: 'Mythical' },
  { icon: 'activity',    color: '#721616', label: 'Immortal' },
  { icon: 'activity',    color: '#650F0F', label: 'Boundless' },
  { icon: 'activity',    color: '#580808', label: 'Supernal' },
  { icon: 'activity',    color: '#4B0101', label: 'Undying' },
  // 91-95: Elite — activity
  { icon: 'activity',    color: '#DC2626', label: 'Transcendent' },
  { icon: 'activity',    color: '#C41A1A', label: 'Ultimate' },
  { icon: 'activity',    color: '#AC0E0E', label: 'Absolute' },
  { icon: 'activity',    color: '#940202', label: 'Eternal' },
  { icon: 'activity',    color: '#7C0000', label: 'Infinite' },
  // 96-100: Diverge — activity
  { icon: 'activity',    color: '#EF4444', label: 'Ascendant' },
  { icon: 'activity',    color: '#E03030', label: 'Pinnacle' },
  { icon: 'activity',    color: '#D01C1C', label: 'Sovereign' },
  { icon: 'activity',    color: '#C00808', label: 'Legend' },
  { icon: 'activity',    color: '#B00000', label: 'Diverge' },
];

export function getLevelIcon(level: number): LevelIcon {
  const idx = Math.min(Math.max(level - 1, 0), LEVEL_ICONS.length - 1);
  return LEVEL_ICONS[idx];
}

export const LEGAL_URLS = {
  privacyPolicy: 'https://divergeapp.com/privacy',
  termsOfService: 'https://divergeapp.com/terms',
  subscriptionTerms: 'https://divergeapp.com/subscription-terms',
};
