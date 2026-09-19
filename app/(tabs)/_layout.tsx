import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { useTheme } from "@/context/ThemeContext";
import { useI18n } from "@/i18n";

/**
 * iOS 26 renders this navigator with UIKit's native UITabBarController.
 * Liquid Glass refraction, press/drag deformation, spring, haptics and
 * accessibility are therefore driven by the OS, not faked with a RN View.
 */
function IOSLiquidGlassTabs() {
  const { t } = useI18n();
  const { colors, isDark } = useTheme();
  const inactiveColor = isDark
    ? "rgba(255,255,255,0.72)"
    : "rgba(16,35,26,0.58)";

  return (
    <NativeTabs
      tintColor={colors.accent}
      iconColor={{ default: inactiveColor, selected: colors.accent }}
      labelStyle={{
        default: { color: inactiveColor },
        selected: { color: colors.accent },
      }}
      backgroundColor={
        isDark ? "rgba(5,13,9,0.18)" : "rgba(255,255,255,0.12)"
      }
      blurEffect={
        isDark
          ? "systemUltraThinMaterialDark"
          : "systemUltraThinMaterialLight"
      }
      minimizeBehavior="never"
      sidebarAdaptable={false}
      // Lock UIKit to the in-app setting. Without this, each newly focused
      // native tab can inherit a different system appearance and flash gray.
      unstable_nativeProps={{ colorScheme: isDark ? "dark" : "light" }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          sf={{
            default: "rectangle.grid.1x2",
            selected: "rectangle.grid.1x2.fill",
          }}
        />
        <NativeTabs.Trigger.Label>{t("dashboard")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="plan">
        <NativeTabs.Trigger.Icon
          sf={{ default: "dumbbell", selected: "dumbbell.fill" }}
        />
        <NativeTabs.Trigger.Label>{t("plan")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Icon sf="calendar" />
        <NativeTabs.Trigger.Label>{t("calendar")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon
          sf={{ default: "gearshape", selected: "gearshape.fill" }}
        />
        <NativeTabs.Trigger.Label>{t("settings")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function FallbackTabButton(props: any) {
  const selected = props.accessibilityState?.selected;
  const { isDark } = useTheme();

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.tabButton,
        pressed && styles.tabButtonPressed,
      ]}
    >
      {selected && (
        <View
          style={[
            styles.activeHighlight,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.10)"
                : "rgba(255,255,255,0.30)",
              borderColor: isDark
                ? "rgba(255,255,255,0.10)"
                : "rgba(255,255,255,0.42)",
            },
          ]}
        />
      )}
      {props.children}
    </Pressable>
  );
}

/** Android/web fallback; iOS deliberately uses the native implementation. */
function FallbackTabs() {
  const { t } = useI18n();
  const { colors, isDark } = useTheme();
  const inactiveColor = isDark
    ? "rgba(255,255,255,0.72)"
    : "rgba(16,35,26,0.58)";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: inactiveColor,
        tabBarHideOnKeyboard: true,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.label,
        tabBarIconStyle: styles.icon,
        tabBarButton: (props) => <FallbackTabButton {...props} />,
        tabBarBackground: () => (
          <BlurView
            intensity={42}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          >
            <View
              style={[
                styles.tabBarOverlay,
                {
                  backgroundColor: isDark
                    ? "rgba(5,13,9,0.18)"
                    : "rgba(255,255,255,0.12)",
                },
              ]}
            />
          </BlurView>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("dashboard"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="today-outline" color={color} size={size + 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: t("plan"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell-outline" color={color} size={size + 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t("calendar"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={color} size={size + 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("settings"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size + 2} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return Platform.OS === "ios" ? <IOSLiquidGlassTabs /> : <FallbackTabs />;
}

const TAB_BAR_HEIGHT = 58;
const PILL_RADIUS = TAB_BAR_HEIGHT / 2;

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    marginHorizontal: 28,
    bottom: 18,
    height: TAB_BAR_HEIGHT,
    paddingTop: 6,
    paddingBottom: 7,
    borderTopWidth: 0,
    borderRadius: PILL_RADIUS,
    backgroundColor: "transparent",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 18,
    overflow: "hidden",
  },
  tabBarOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(202, 202, 227, 0.1)",
  },
  tabItem: {
    marginHorizontal: 2,
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 3,
    marginVertical: 4,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  activeHighlight: {
    position: "absolute",
    width: "92%",
    height: "94%",
    borderRadius: 28,
    borderWidth: 1,
  },
  tabButtonPressed: { opacity: 0.65 },
  label: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  icon: {
    marginTop: 2,
  },
});
