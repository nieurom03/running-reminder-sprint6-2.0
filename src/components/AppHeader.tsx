import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import { useI18n } from '@/i18n';
import { useTheme } from '@/context/ThemeContext';

export function AppHeader({ title }: { title: string }) {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const device = useMemo(() => Device.deviceName || Device.modelName || 'iPhone', []);
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={[s.hello, { color: colors.textSecondary }]}>
            {language === 'vi' ? 'Xin chào!' : 'Hello!'}
          </Text>
          <Text style={[s.title, { color: colors.textPrimary }]}>{title}</Text>
        </View>
        <View style={[s.device, { backgroundColor: colors.bgCard, borderColor: colors.bgCardBorder }]}>
          <Ionicons name="phone-portrait-outline" size={13} color={colors.rowIcon} />
          <Text numberOfLines={1} style={[s.deviceText, { color: colors.textSecondary }]}>{device}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { backgroundColor: 'transparent' },
  row: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hello: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 31, fontWeight: '900', marginTop: 1, letterSpacing: -0.7 },
  device: { maxWidth: '43%', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', gap: 5, alignItems: 'center', shadowColor: '#315B47', shadowOpacity: 0.07, shadowRadius: 12 },
  deviceText: { fontSize: 10, fontWeight: '800' },
});
