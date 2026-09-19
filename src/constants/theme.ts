/**
 * App-wide color tokens.
 * Use `useTheme()` hook to get the resolved colors based on current scheme.
 */

export const lightColors = {
  // Backgrounds
  bgRoot: '#EEF7F2',
  bgCard: 'rgba(255,255,255,0.34)',
  bgCardBorder: 'rgba(255,255,255,0.62)',
  bgOrb1: 'rgba(184,238,208,0.62)',
  bgOrb2: 'rgba(218,246,230,0.72)',
  bgOrb3: 'rgba(203,239,222,0.58)',
  modalBackdrop: 'rgba(10,28,19,0.28)',
  modalSurface: 'rgba(255,255,255,0.36)',
  modalOverlay: 'rgba(255,255,255,0.10)',
  modalBorder: 'rgba(255,255,255,0.68)',

  // Text
  textPrimary: '#10231A',
  textSecondary: '#557066',
  textMuted: '#60776C',
  textLabel: '#557066',

  // Settings rows
  rowTitle: '#213D31',
  rowValue: '#71857B',
  rowIcon: '#315B47',
  rowIconBg: 'rgba(218,247,231,0.30)',
  divider: 'rgba(82,112,97,0.16)',
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
  bgCard: 'rgba(18,32,24,0.42)',
  bgCardBorder: 'rgba(255,255,255,0.16)',
  bgOrb1: 'rgba(20,80,45,0.50)',
  bgOrb2: 'rgba(15,60,35,0.55)',
  bgOrb3: 'rgba(18,70,40,0.45)',
  modalBackdrop: 'rgba(0,0,0,0.62)',
  modalSurface: 'rgba(13,27,18,0.72)',
  modalOverlay: 'rgba(5,16,10,0.20)',
  modalBorder: 'rgba(255,255,255,0.18)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8AAF98',
  textMuted: '#789B87',
  textLabel: '#7AAE90',

  // Settings rows
  rowTitle: '#FFFFFF',
  rowValue: '#7A9E8A',
  rowIcon: '#72D9A3',
  rowIconBg: 'rgba(34,84,58,0.32)',
  divider: 'rgba(255,255,255,0.10)',
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
