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
