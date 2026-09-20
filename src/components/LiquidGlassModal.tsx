import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/context/ThemeContext';

type LiquidGlassModalProps = {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  dismissOnBackdropPress?: boolean;
};

export function LiquidGlassModal({
  visible,
  onRequestClose,
  children,
  contentStyle,
  dismissOnBackdropPress = true,
}: LiquidGlassModalProps) {
  const { colors, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      hardwareAccelerated
      onRequestClose={onRequestClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.root}
      >
        {Platform.OS !== 'android' && (
          <BlurView
            pointerEvents="none"
            intensity={isDark ? 18 : 12}
            tint={
              isDark
                ? 'systemUltraThinMaterialDark'
                : 'systemUltraThinMaterialLight'
            }
            style={StyleSheet.absoluteFill}
          />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          disabled={!dismissOnBackdropPress}
          onPress={onRequestClose}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.modalBackdrop },
          ]}
        />

        <View style={s.shadow} accessibilityViewIsModal>
          <View style={[s.clip, { borderColor: colors.modalBorder }]}>
            {Platform.OS === 'android' ? (
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: colors.modalSurface },
                ]}
              />
            ) : (
              <BlurView
                pointerEvents="none"
                intensity={isDark ? 48 : 38}
                tint={
                  isDark
                    ? 'systemThinMaterialDark'
                    : 'systemThinMaterialLight'
                }
                style={StyleSheet.absoluteFill}
              />
            )}
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.modalOverlay },
              ]}
            />
            <View style={[s.content, contentStyle]}>{children}</View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export type GlassOption<T extends string> = {
  value: T;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type GlassOptionModalProps<T extends string> = {
  visible: boolean;
  title: string;
  value: T;
  options: GlassOption<T>[];
  onSelect: (value: T) => void;
  onRequestClose: () => void;
};

export function GlassOptionModal<T extends string>({
  visible,
  title,
  value,
  options,
  onSelect,
  onRequestClose,
}: GlassOptionModalProps<T>) {
  const { colors, isDark } = useTheme();

  return (
    <LiquidGlassModal visible={visible} onRequestClose={onRequestClose}>
      <View style={s.header}>
        <Text style={[s.title, { color: colors.textPrimary }]}>{title}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          onPress={onRequestClose}
          style={[s.close, { backgroundColor: colors.rowIconBg }]}
        >
          <Ionicons name="close" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={s.options}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onSelect(option.value)}
              style={[
                s.option,
                {
                  backgroundColor: selected
                    ? colors.rowIconBg
                    : isDark
                      ? 'rgba(255,255,255,0.025)'
                      : 'rgba(255,255,255,0.14)',
                  borderColor: selected
                    ? colors.accent
                    : colors.modalBorder,
                },
              ]}
            >
              <View style={[s.optionIcon, { backgroundColor: colors.rowIconBg }]}>
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={selected ? colors.accent : colors.rowIcon}
                />
              </View>
              <Text style={[s.optionLabel, { color: colors.textPrimary }]}>
                {option.label}
              </Text>
              <View
                style={[
                  s.selection,
                  {
                    borderColor: selected
                      ? colors.accent
                      : colors.textMuted,
                    backgroundColor: selected
                      ? colors.accent
                      : 'transparent',
                  },
                ]}
              >
                {selected && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </LiquidGlassModal>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 36,
  },
  shadow: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '86%',
    borderRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 24,
  },
  clip: {
    borderRadius: 30,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: { padding: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  title: { flex: 1, fontSize: 23, lineHeight: 29, fontWeight: '900' },
  close: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  options: { gap: 10, marginTop: 18 },
  option: {
    minHeight: 60,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: { flex: 1, fontSize: 16, fontWeight: '800' },
  selection: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
