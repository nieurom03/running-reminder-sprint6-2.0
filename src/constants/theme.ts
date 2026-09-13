/**
 * App-wide color tokens.
 * Use `useTheme()` hook to get the resolved colors based on current scheme.
 */

export const lightColors = {
  // Backgrounds
  bgRoot: '#EEF7F2',
  bgCard: 'rgba(255,255,255,0.86)',
  bgCardBorder: 'rgba(255,255,255,0.96)',
  bgOrb1: 'rgba(184,238,208,0.62)',
  bgOrb2: 'rgba(218,246,230,0.72)',
  bgOrb3: 'rgba(203,239,222,0.58)',

  // Text
  textPrimary: '#10231A',
  textSecondary: '#6C8378',
  textMuted: '#71857B',
  textLabel: '#557066',

  // Settings rows
  rowTitle: '#213D31',
  rowValue: '#71857B',
  rowIcon: '#315B47',
  rowIconBg: 'rgba(236,249,242,0.94)',
  divider: 'rgba(148,174,160,0.20)',
  groupTitle: '#29463A',

  // Tab bar
  tabBarTint: 'dark' as const,
  tabBarOverlay: 'rgba(18,18,20,0.30)',

  // Status bar
  statusBar: 'dark' as const,

  // Accent
  accent: '#2DB526',
  accentMuted: '#72D9A3',
} as const;

export const darkColors = {
  // Backgrounds
  bgRoot: '#0D1A12',
  bgCard: 'rgba(30,44,36,0.90)',
  bgCardBorder: 'rgba(255,255,255,0.08)',
  bgOrb1: 'rgba(20,80,45,0.50)',
  bgOrb2: 'rgba(15,60,35,0.55)',
  bgOrb3: 'rgba(18,70,40,0.45)',

  // Text
  textPrimary: '#E8F5EE',
  textSecondary: '#8AAF98',
  textMuted: '#6B8E7A',
  textLabel: '#7AAE90',

  // Settings rows
  rowTitle: '#D4EDDE',
  rowValue: '#7A9E8A',
  rowIcon: '#72D9A3',
  rowIconBg: 'rgba(30,70,50,0.80)',
  divider: 'rgba(255,255,255,0.08)',
  groupTitle: '#9ECFB0',

  // Tab bar
  tabBarTint: 'dark' as const,
  tabBarOverlay: 'rgba(10,20,14,0.55)',

  // Status bar
  statusBar: 'light' as const,

  // Accent
  accent: '#2DB526',
  accentMuted: '#52C97A',
} as const;

export type AppColors = typeof lightColors | typeof darkColors;
