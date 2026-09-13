import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { useI18n } from "@/i18n";
import { BlurView } from "expo-blur";

function TabButton(props: any) {
  const selected = props.accessibilityState?.selected;
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.tabButton,
        pressed && styles.tabButtonPressed,
      ]}
    >
      {/* Highlight hình tròn/oval phía sau khi active */}
      {selected && <View style={styles.activeHighlight} />}
      {props.children}
    </Pressable>
  );
}

export default function TabLayout() {
  const { t } = useI18n();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2DB526",
        tabBarInactiveTintColor: "#FFFFFF",
        tabBarHideOnKeyboard: true,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.label,
        tabBarIconStyle: styles.icon,
        tabBarButton: (props) => <TabButton {...props} />,
        tabBarBackground: () => (
          <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill}>
            {/* Lớp overlay tối thêm để giống App Store dark pill */}
            <View style={styles.tabBarOverlay} />
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

const TAB_BAR_HEIGHT = 58; // 72 * 0.8 = ~58
const PILL_RADIUS = TAB_BAR_HEIGHT / 2;

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    marginHorizontal: 56,
    bottom: 24,
    height: TAB_BAR_HEIGHT,
    paddingTop: 4,
    paddingBottom: 6,
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
    backgroundColor: "rgba(18,18,20,0.30)",
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
    width: "88%",
    height: "92%",
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
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
