import { useEffect, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import appConfig from "../../app.json";
import { getTrainingStats, setSetting, getSetting } from "@/db/repository";
import {
  useAppStore,
  type AppLanguage,
  type AppColorScheme,
} from "@/store/useAppStore";
import { AppHeader } from "@/components/AppHeader";
import { GlassBackground, GlassCard } from "@/components/Glass";
import { useI18n, type TranslationKey } from "@/i18n";
import { useTheme } from "@/context/ThemeContext";
import type { TrainingStats } from "@/types/models";
import { backupToICloudDrive, restoreFromICloudDrive } from "@/services/backup";

export default function Settings() {
  const db = useSQLiteContext();
  const key = useAppStore((s) => s.refreshKey);
  const refresh = useAppStore((s) => s.refresh);
  const setLanguageState = useAppStore((s) => s.setLanguage);
  const colorScheme = useAppStore((s) => s.colorScheme);
  const setColorSchemeState = useAppStore((s) => s.setColorScheme);
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [busy, setBusy] = useState(false);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    getTrainingStats(db).then(setStats);
  }, [db, key]);

  const replay = async () => {
    await setSetting(db, "onboarding_seen", "0");
    router.replace("/onboarding");
  };

  const changeLanguage = async (lang: AppLanguage) => {
    setLanguageState(lang);
    await setSetting(db, "language", lang);
  };

  const schemeOptions: { value: AppColorScheme; label: TranslationKey }[] = [
    { value: "light", label: "themeLight" },
    { value: "dark", label: "themeDark" },
    { value: "system", label: "themeSystem" },
  ];

  const schemeLabel = (v: AppColorScheme) => {
    const opt = schemeOptions.find((o) => o.value === v);
    return t(opt?.label ?? "themeSystem");
  };

  const changeAppearance = async (scheme: AppColorScheme) => {
    setColorSchemeState(scheme);
    await setSetting(db, "color_scheme", scheme);
  };

  const openAppearancePicker = () => {
    const labels = schemeOptions.map((o) => t(o.label));
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...labels, t("cancel")],
          cancelButtonIndex: labels.length,
          title: t("chooseAppearance"),
        },
        (idx) => {
          if (idx < schemeOptions.length)
            changeAppearance(schemeOptions[idx].value);
        },
      );
    } else {
      // Android fallback — Alert với buttons
      Alert.alert(
        t("chooseAppearance"),
        undefined,
        [
          ...schemeOptions.map((o) => ({
            text: t(o.label),
            onPress: () => changeAppearance(o.value),
          })),
          {
            text: t("cancel"),
            style: "cancel" as const,
          },
        ],
      );
    }
  };

  const backup = () =>
    Alert.alert(t("icloudBackupTitle"), t("icloudBackupInstructions"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("continue"),
        onPress: async () => {
          if (busy) return;
          setBusy(true);
          try {
            await backupToICloudDrive(db);
            await setSetting(db, "last_backup_at", new Date().toISOString());
          } catch (e: any) {
            Alert.alert(t("backupFailed"), e?.message ?? String(e));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  const restore = () =>
    Alert.alert(t("restoreBackupTitle"), t("restoreBackupWarning"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("restore"),
        style: "destructive",
        onPress: async () => {
          if (busy) return;
          setBusy(true);
          try {
            const r = await restoreFromICloudDrive(db);
            if (r.canceled) return;
            const lang = await getSetting(db, "language");
            if (lang === "vi" || lang === "en")
              setLanguageState(lang as AppLanguage);
            refresh();
            Alert.alert(t("restoreComplete"), t("restoreCompleteMessage"));
          } catch (e: any) {
            Alert.alert(t("restoreFailed"), e?.message ?? String(e));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  return (
    <GlassBackground>
      <AppHeader title={t("settings")} />
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={s.appCard}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={s.logo}
          />
          <View style={{ flex: 1 }}>
            <Text style={[s.appName, { color: colors.textPrimary }]}>{t("runningReminder")}</Text>
            <Text style={[s.appVer, { color: colors.textMuted }]}>
              {t("version")} {appConfig.expo.version}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textSecondary}
          />
        </GlassCard>

        <Text style={[s.groupTitle, { color: colors.groupTitle }]}>{t("settingsGeneral")}</Text>
        <GlassCard style={s.group}>
          <Row
            icon="globe-outline"
            title={t("language")}
            value={t(language === "vi" ? "vietnamese" : "english")}
            onPress={() => changeLanguage(language === "vi" ? "en" : "vi")}
            colors={colors}
          />
          <Divider colors={colors} />
          <Row
            icon="color-palette-outline"
            title={t("appearance")}
            value={schemeLabel(colorScheme)}
            onPress={openAppearancePicker}
            colors={colors}
          />
          <Divider colors={colors} />
          <View style={s.row}>
            <Icon name="notifications-outline" colors={colors} />
            <Text style={[s.rowTitle, { color: colors.rowTitle, flex: 1 }]}>
              {t("runReminders")}
            </Text>
            <View style={s.switchWrapper}>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: "#C7D5CD", true: "#72D9A3" }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </GlassCard>

        <Text style={[s.groupTitle, { color: colors.groupTitle }]}>{t("backupSync")}</Text>
        <GlassCard style={s.group}>
          <Row
            icon="cloud-upload-outline"
            title={t("backupICloud")}
            subtitle={t("backupHelp")}
            onPress={backup}
            colors={colors}
          />
          <Divider colors={colors} />
          <Row
            icon="cloud-download-outline"
            title={t("restoreICloud")}
            subtitle={t("icloudNote")}
            onPress={restore}
            colors={colors}
          />
        </GlassCard>

        <Text style={[s.groupTitle, { color: colors.groupTitle }]}>{t("settingsData")}</Text>
        <GlassCard style={s.stats}>
          <Stat
            v={`${stats?.completionPct ?? 0}%`}
            l={t("completed")}
            colors={colors}
          />
          <Stat
            v={`${stats?.completedWorkouts ?? 0}/${stats?.totalWorkouts ?? 0}`}
            l={t("workouts")}
            colors={colors}
          />
          <Stat
            v={(stats?.completedKm ?? 0).toFixed(1)}
            l={t("kilometersShort")}
            colors={colors}
          />
        </GlassCard>

        <Text style={[s.groupTitle, { color: colors.groupTitle }]}>{t("settingsOther")}</Text>
        <GlassCard style={s.group}>
          <Row
            icon="refresh-outline"
            title={t("replayOnboarding")}
            onPress={replay}
            colors={colors}
          />
          <Divider colors={colors} />
          <Row
            icon="shield-checkmark-outline"
            title={t("privacyPolicy")}
            value={t("appStore")}
            colors={colors}
          />
          <Divider colors={colors} />
          <Row
            icon="document-text-outline"
            title={t("termsOfUse")}
            value={t("appStore")}
            colors={colors}
          />
        </GlassCard>
      </ScrollView>
    </GlassBackground>
  );
}

function Icon({ name, colors }: { name: any; colors: any }) {
  return (
    <View style={[s.icon, { backgroundColor: colors.rowIconBg }]}>
      <Ionicons name={name} size={19} color={colors.rowIcon} />
    </View>
  );
}

function Divider({ colors }: { colors: any }) {
  return <View style={[s.divider, { backgroundColor: colors.divider }]} />;
}

function Row({
  icon,
  title,
  value,
  subtitle,
  onPress,
  colors,
}: {
  icon: any;
  title: string;
  value?: string;
  subtitle?: string;
  onPress?: () => void;
  colors: any;
}) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={s.row}>
      <Icon name={icon} colors={colors} />
      <View style={s.rowMain}>
        <Text style={[s.rowTitle, { color: colors.rowTitle }]}>{title}</Text>
        {subtitle && (
          <Text
            numberOfLines={2}
            style={[s.rowSub, { color: colors.textMuted }]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {value && (
        <Text style={[s.rowValue, { color: colors.rowValue }]}>{value}</Text>
      )}
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </Pressable>
  );
}

function Stat({ v, l, colors }: { v: string; l: string; colors: any }) {
  return (
    <View style={[s.stat, { backgroundColor: colors.bgCard }]}>
      <Text style={[s.statV, { color: colors.accent }]}>{v}</Text>
      <Text style={[s.statL, { color: colors.textMuted }]}>{l}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 112 },
  appCard: { padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 54, height: 54, borderRadius: 15 },
  appName: { fontSize: 18, fontWeight: "900" },
  appVer: { fontSize: 12, marginTop: 3 },
  groupTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 22,
    marginBottom: 8,
    marginLeft: 2,
  },
  group: { paddingHorizontal: 16, paddingVertical: 4 },
  row: { height: 52, flexDirection: "row", alignItems: "center", gap: 12 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: "800", flexShrink: 1 },
  reminderSwitch: { flexShrink: 0 },
  switchWrapper: {
    marginLeft: "auto",
    alignSelf: "center",
    justifyContent: "center",
  },
  rowSub: { fontSize: 10, marginTop: 3, lineHeight: 14 },
  rowValue: { fontSize: 12, maxWidth: 90, textAlign: "right" },
  divider: { height: 1, marginLeft: 50 },
  stats: { padding: 12, flexDirection: "row", gap: 8 },
  stat: { flex: 1, borderRadius: 18, padding: 13, alignItems: "center" },
  statV: { fontSize: 21, fontWeight: "900" },
  statL: { fontSize: 10, fontWeight: "800", marginTop: 3 },
});
