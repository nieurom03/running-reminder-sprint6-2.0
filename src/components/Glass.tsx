import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export function GlassBackground({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[s.root, { backgroundColor: colors.bgRoot }]}>
      <View pointerEvents="none" style={[s.orb, s.orb1, { backgroundColor: colors.bgOrb1 }]} />
      <View pointerEvents="none" style={[s.orb, s.orb2, { backgroundColor: colors.bgOrb2 }]} />
      <View pointerEvents="none" style={[s.orb, s.orb3, { backgroundColor: colors.bgOrb3 }]} />
      <View style={s.content}>{children}</View>
    </View>
  );
}

export function GlassCard({ children, style }: { children: ReactNode; style?: ViewStyle | ViewStyle[] }) {
  const { colors } = useTheme();
  return (
    <View style={[
      s.card,
      { backgroundColor: colors.bgCard, borderColor: colors.bgCardBorder },
      style,
    ]}>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  content: { flex: 1 },
  orb: { position: 'absolute', borderRadius: 999, opacity: 0.56 },
  orb1: { width: 330, height: 330, right: -130, top: -90 },
  orb2: { width: 260, height: 260, left: -120, top: 260 },
  orb3: { width: 360, height: 360, right: -180, bottom: 70 },
  card: {
    borderWidth: 1,
    borderRadius: 28,
    shadowColor: '#315B47',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
});
