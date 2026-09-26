import { useEffect, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
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
import {
  GlassOptionModal,
  LiquidGlassModal,
} from "@/components/LiquidGlassModal";
import { useGlassAlert } from "@/components/GlassAlert";
import { useI18n, type TranslationKey } from "@/i18n";
import { useTheme } from "@/context/ThemeContext";
import type { TrainingStats } from "@/types/models";
import {
  BackupFileError,
  backupToICloudDrive,
  pickBackupFile,
  restoreBackupFile,
  type PickedBackupFile,
} from "@/services/backup";

export default function Settings() {
  const db = useSQLiteContext();
  const key = useAppStore((s) => s.refreshKey);
  const refresh = useAppStore((s) => s.refresh);
  const setLanguageState = useAppStore((s) => s.setLanguage);
  const colorScheme = useAppStore((s) => s.colorScheme);
  const setColorSchemeState = useAppStore((s) => s.setColorScheme);
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const showAlert = useGlassAlert();
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [busy, setBusy] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const [appearancePickerOpen, setAppearancePickerOpen] = useState(false);
  const [backupPasswordOpen, setBackupPasswordOpen] = useState(false);
  const [restorePasswordOpen, setRestorePasswordOpen] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<PickedBackupFile | null>(
    null,
  );
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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

  const backup = () => {
    if (!busy) setBackupPasswordOpen(true);
  };

  const createBackup = async (password: string) => {
    if (busy) return;
    setBackupPasswordOpen(false);
    setBusy(true);
    try {
      await backupToICloudDrive(db, password);
      await setSetting(db, "last_backup_at", new Date().toISOString());
    } catch (error: any) {
      showAlert(t("backupFailed"), error?.message ?? String(error));
    } finally {
      setBusy(false);
    }
  };

  const finishRestore = async (file: PickedBackupFile, password?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await restoreBackupFile(db, file, password);
      setRestorePasswordOpen(false);
      setPendingRestore(null);
      const lang = await getSetting(db, "language");
      if (lang === "vi" || lang === "en") {
        setLanguageState(lang as AppLanguage);
      }
      const restoredScheme = await getSetting(db, "color_scheme");
      if (
        restoredScheme === "light" ||
        restoredScheme === "dark" ||
        restoredScheme === "system"
      ) {
        setColorSchemeState(restoredScheme as AppColorScheme);
      }
      refresh();
      setTimeout(
        () => showAlert(t("restoreComplete"), t("restoreCompleteMessage")),
        file.encrypted ? 220 : 0,
      );
    } catch (error: any) {
      if (error instanceof BackupFileError) {
        if (error.code === "INVALID_PASSWORD") {
          throw new Error(t("incorrectBackupPassword"));
        }
        if (error.code === "PASSWORD_REQUIRED") {
          throw new Error(t("backupPasswordRequired"));
        }
        throw new Error(t("invalidBackupFile"));
      }
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const confirmRestore = (file: PickedBackupFile) => {
    showAlert(
      t("restoreBackupTitle"),
      `${file.name}\n\n${t("restoreBackupWarning")}`,
      [
        {
          text: t("cancel"),
          style: "cancel",
          onPress: () => setPendingRestore(null),
        },
        {
          text: t("restore"),
          style: "destructive",
          onPress: () => {
            if (file.encrypted) {
              setTimeout(() => setRestorePasswordOpen(true), 220);
              return;
            }
            void finishRestore(file).catch((error: any) => {
              showAlert(t("restoreFailed"), error?.message ?? String(error));
            });
          },
        },
      ],
    );
  };

  const restore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const picked = await pickBackupFile();
      if (picked.canceled) return;
      setPendingRestore(picked.file);
      confirmRestore(picked.file);
    } catch (error: any) {
      const message =
        error instanceof BackupFileError
          ? t("invalidBackupFile")
          : (error?.message ?? String(error));
      showAlert(t("restoreFailed"), message);
    } finally {
      setBusy(false);
    }
  };

  const shareFeedback = async (message: string) => {
    const diagnostic = `${t("version")} ${appConfig.expo.version} · ${Platform.OS} ${Platform.Version}`;
    const result = await Share.share(
      {
        title: t("feedbackTitle"),
        message: `${message.trim()}\n\n${diagnostic}`,
      },
      {
        dialogTitle: t("feedbackTitle"),
        subject: `[Runmio] ${t("feedbackTitle")}`,
        // Feedback is text to send through a communication app. Do not offer
        // the Files destination used by the separate Backup feature.
        excludedActivityTypes:
          Platform.OS === "ios"
            ? [
                "com.apple.DocumentManagerUICore.SaveToFiles",
                "com.apple.CloudDocsUI.AddToiCloudDrive",
              ]
            : undefined,
      },
    );
    if (result.action === Share.sharedAction) {
      setFeedbackOpen(false);
    }
  };

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
            <Text style={[s.appName, { color: colors.textPrimary }]}>
              {t("runningReminder")}
            </Text>
            <Text style={[s.appVer, { color: colors.textMuted }]}>
              {t("version")} {appConfig.expo.version}
            </Text>
          </View>
          {/* <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textSecondary}
          /> */}
        </GlassCard>

        <Text style={[s.groupTitle, { color: colors.groupTitle }]}>
          {t("settingsGeneral")}
        </Text>
        <GlassCard style={s.group}>
          <Row
            icon="globe-outline"
            title={t("language")}
            value={t(language === "vi" ? "vietnamese" : "english")}
            onPress={() => setLanguagePickerOpen(true)}
            colors={colors}
          />
          <Divider colors={colors} />
          <Row
            icon="color-palette-outline"
            title={t("appearance")}
            value={schemeLabel(colorScheme)}
            onPress={() => setAppearancePickerOpen(true)}
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

        <Text style={[s.groupTitle, { color: colors.groupTitle }]}>
          {t("backupSync")}
        </Text>
        <GlassCard style={s.group}>
          <Row
            icon="cloud-download-outline"
            title={t("backupICloud")}
            subtitle={t("encryptedBackupHelp")}
            value={busy ? t("pleaseWait") : undefined}
            onPress={backup}
            colors={colors}
          />
          <Divider colors={colors} />
          <Row
            icon="cloud-upload-outline"
            title={t("restoreICloud")}
            subtitle={t("restoreFileHelp")}
            value={busy ? t("pleaseWait") : undefined}
            onPress={() => void restore()}
            colors={colors}
          />
        </GlassCard>

        <Text style={[s.groupTitle, { color: colors.groupTitle }]}>
          {t("settingsData")}
        </Text>
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

        <Text style={[s.groupTitle, { color: colors.groupTitle }]}>
          {t("settingsOther")}
        </Text>
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
          <Divider colors={colors} />
          <Row
            icon="chatbubble-ellipses-outline"
            title={t("feedback")}
            subtitle={t("feedbackHelp")}
            onPress={() => setFeedbackOpen(true)}
            colors={colors}
          />
        </GlassCard>
      </ScrollView>

      <GlassOptionModal<AppLanguage>
        visible={languagePickerOpen}
        title={t("chooseLanguage")}
        value={language}
        options={[
          {
            value: "vi",
            label: t("vietnamese"),
            icon: "language-outline",
          },
          { value: "en", label: t("english"), icon: "globe-outline" },
        ]}
        onRequestClose={() => setLanguagePickerOpen(false)}
        onSelect={(value) => {
          setLanguagePickerOpen(false);
          void changeLanguage(value);
        }}
      />

      <GlassOptionModal<AppColorScheme>
        visible={appearancePickerOpen}
        title={t("chooseAppearance")}
        value={colorScheme}
        options={[
          { value: "light", label: t("themeLight"), icon: "sunny-outline" },
          { value: "dark", label: t("themeDark"), icon: "moon-outline" },
          {
            value: "system",
            label: t("themeSystem"),
            icon: "contrast-outline",
          },
        ]}
        onRequestClose={() => setAppearancePickerOpen(false)}
        onSelect={(value) => {
          setAppearancePickerOpen(false);
          void changeAppearance(value);
        }}
      />

      <PasswordModal
        visible={backupPasswordOpen}
        title={t("backupPasswordTitle")}
        message={t("backupPasswordHelp")}
        confirmPassword
        allowNoPassword
        busy={busy}
        submitLabel={t("createBackup")}
        onRequestClose={() => setBackupPasswordOpen(false)}
        onSubmit={createBackup}
      />

      <PasswordModal
        visible={restorePasswordOpen}
        title={t("restorePasswordTitle")}
        message={t("restorePasswordHelp")}
        busy={busy}
        submitLabel={t("restore")}
        onRequestClose={() => {
          setRestorePasswordOpen(false);
          setPendingRestore(null);
        }}
        onSubmit={async (password) => {
          if (!pendingRestore) throw new Error(t("invalidBackupFile"));
          await finishRestore(pendingRestore, password);
        }}
      />

      <FeedbackModal
        visible={feedbackOpen}
        onRequestClose={() => setFeedbackOpen(false)}
        onSubmit={shareFeedback}
      />
    </GlassBackground>
  );
}

function PasswordModal({
  visible,
  title,
  message,
  submitLabel,
  confirmPassword = false,
  allowNoPassword = false,
  busy,
  onRequestClose,
  onSubmit,
}: {
  visible: boolean;
  title: string;
  message: string;
  submitLabel: string;
  confirmPassword?: boolean;
  allowNoPassword?: boolean;
  busy: boolean;
  onRequestClose: () => void;
  onSubmit: (password: string) => Promise<void>;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [usePassword, setUsePassword] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) {
      setPassword("");
      setConfirmation("");
      setPasswordVisible(false);
      setUsePassword(true);
      setError("");
    }
  }, [visible]);

  const submit = async () => {
    setError("");
    if (allowNoPassword && !usePassword) {
      try {
        await onSubmit("");
      } catch (submitError: any) {
        setError(submitError?.message ?? String(submitError));
      }
      return;
    }
    if (password.length < 8) {
      setError(t("backupPasswordMinLength"));
      return;
    }
    if (confirmPassword && password !== confirmation) {
      setError(t("backupPasswordMismatch"));
      return;
    }
    try {
      await onSubmit(password);
    } catch (submitError: any) {
      setError(submitError?.message ?? String(submitError));
    }
  };

  return (
    <LiquidGlassModal
      visible={visible}
      onRequestClose={onRequestClose}
      dismissOnBackdropPress={!busy}
    >
      <View style={s.modalHeader}>
        <View style={[s.modalIcon, { backgroundColor: colors.rowIconBg }]}>
          <Ionicons
            name="lock-closed-outline"
            size={22}
            color={colors.accent}
          />
        </View>
        <View style={s.modalHeading}>
          <Text style={[s.modalTitle, { color: colors.textPrimary }]}>
            {title}
          </Text>
          <Text style={[s.modalMessage, { color: colors.textSecondary }]}>
            {message}
          </Text>
        </View>
      </View>

      {allowNoPassword && (
        <View
          style={[
            s.backupProtectionRow,
            { backgroundColor: colors.bgCard, borderColor: colors.modalBorder },
          ]}
        >
          <View style={s.backupProtectionText}>
            <Text
              style={[s.backupProtectionTitle, { color: colors.textPrimary }]}
            >
              {t("backupUsePassword")}
            </Text>
            <Text
              style={[
                s.backupProtectionHelp,
                { color: colors.textSecondary },
              ]}
            >
              {t("backupUsePasswordHelp")}
            </Text>
          </View>
          <Switch
            value={usePassword}
            disabled={busy}
            onValueChange={(value) => {
              setUsePassword(value);
              setError("");
            }}
            trackColor={{ false: "#C7D5CD", true: "#72D9A3" }}
            thumbColor="#fff"
          />
        </View>
      )}

      {usePassword ? (
        <>
          <Text style={[s.inputLabel, { color: colors.textLabel }]}>
            {t("backupPassword")}
          </Text>
          <View
            style={[
              s.passwordField,
              { backgroundColor: colors.bgCard, borderColor: colors.modalBorder },
            ]}
          >
            <TextInput
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setError("");
              }}
              editable={!busy}
              secureTextEntry={!passwordVisible}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={t("backupPasswordPlaceholder")}
              placeholderTextColor={colors.textMuted}
              style={[s.passwordInput, { color: colors.textPrimary }]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("togglePasswordVisibility")}
              onPress={() => setPasswordVisible((value) => !value)}
              hitSlop={10}
            >
              <Ionicons
                name={passwordVisible ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>
        </>
      ) : (
        <View
          style={[s.noPasswordNotice, { backgroundColor: colors.rowIconBg }]}
        >
          <Ionicons name="warning-outline" size={19} color="#F79009" />
          <Text
            style={[s.noPasswordNoticeText, { color: colors.textSecondary }]}
          >
            {t("backupNoPasswordWarning")}
          </Text>
        </View>
      )}

      {confirmPassword && usePassword && (
        <>
          <Text style={[s.inputLabel, { color: colors.textLabel }]}>
            {t("confirmBackupPassword")}
          </Text>
          <TextInput
            value={confirmation}
            onChangeText={(value) => {
              setConfirmation(value);
              setError("");
            }}
            editable={!busy}
            secureTextEntry={!passwordVisible}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t("confirmBackupPassword")}
            placeholderTextColor={colors.textMuted}
            style={[
              s.modalInput,
              {
                backgroundColor: colors.bgCard,
                borderColor: colors.modalBorder,
                color: colors.textPrimary,
              },
            ]}
          />
        </>
      )}

      {!!error && <Text style={s.formError}>{error}</Text>}

      <View style={s.modalActions}>
        <Pressable
          disabled={busy}
          onPress={onRequestClose}
          style={[s.secondaryButton, { borderColor: colors.modalBorder }]}
        >
          <Text style={[s.secondaryButtonText, { color: colors.textPrimary }]}>
            {t("cancel")}
          </Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={() => void submit()}
          style={[
            s.primaryButton,
            { backgroundColor: colors.accent },
            busy && s.disabled,
          ]}
        >
          <Text style={s.primaryButtonText}>
            {busy ? t("pleaseWait") : submitLabel}
          </Text>
        </Pressable>
      </View>
    </LiquidGlassModal>
  );
}

function FeedbackModal({
  visible,
  onRequestClose,
  onSubmit,
}: {
  visible: boolean;
  onRequestClose: () => void;
  onSubmit: (message: string) => Promise<void>;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) {
      setMessage("");
      setSending(false);
      setError("");
    }
  }, [visible]);

  const submit = async () => {
    if (!message.trim()) {
      setError(t("feedbackRequired"));
      return;
    }
    setSending(true);
    setError("");
    try {
      await onSubmit(message);
    } catch (submitError: any) {
      setError(submitError?.message ?? t("feedbackFailed"));
    } finally {
      setSending(false);
    }
  };

  return (
    <LiquidGlassModal
      visible={visible}
      onRequestClose={onRequestClose}
      dismissOnBackdropPress={!sending}
    >
      <View style={s.modalHeader}>
        <View style={[s.modalIcon, { backgroundColor: colors.rowIconBg }]}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={22}
            color={colors.accent}
          />
        </View>
        <View style={s.modalHeading}>
          <Text style={[s.modalTitle, { color: colors.textPrimary }]}>
            {t("feedbackTitle")}
          </Text>
          <Text style={[s.modalMessage, { color: colors.textSecondary }]}>
            {t("feedbackModalHelp")}
          </Text>
        </View>
      </View>

      <TextInput
        value={message}
        onChangeText={(value) => {
          setMessage(value);
          setError("");
        }}
        editable={!sending}
        multiline
        textAlignVertical="top"
        maxLength={2000}
        placeholder={t("feedbackPlaceholder")}
        placeholderTextColor={colors.textMuted}
        style={[
          s.feedbackInput,
          {
            backgroundColor: colors.bgCard,
            borderColor: colors.modalBorder,
            color: colors.textPrimary,
          },
        ]}
      />
      {!!error && <Text style={s.formError}>{error}</Text>}

      <View style={s.modalActions}>
        <Pressable
          disabled={sending}
          onPress={onRequestClose}
          style={[s.secondaryButton, { borderColor: colors.modalBorder }]}
        >
          <Text style={[s.secondaryButtonText, { color: colors.textPrimary }]}>
            {t("cancel")}
          </Text>
        </Pressable>
        <Pressable
          disabled={sending}
          onPress={() => void submit()}
          style={[
            s.primaryButton,
            { backgroundColor: colors.accent },
            sending && s.disabled,
          ]}
        >
          <Text style={s.primaryButtonText}>
            {sending ? t("pleaseWait") : t("sendFeedback")}
          </Text>
        </Pressable>
      </View>
    </LiquidGlassModal>
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
    <View style={[s.stat, { backgroundColor: colors.rowIconBg }]}>
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
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
  },
  modalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeading: { flex: 1 },
  modalTitle: { fontSize: 21, lineHeight: 27, fontWeight: "900" },
  modalMessage: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  inputLabel: {
    marginTop: 11,
    marginBottom: 7,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  passwordField: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  passwordInput: { flex: 1, minHeight: 50, fontSize: 16, fontWeight: "700" },
  backupProtectionRow: {
    minHeight: 66,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backupProtectionText: { flex: 1 },
  backupProtectionTitle: { fontSize: 14, fontWeight: "800" },
  backupProtectionHelp: { marginTop: 3, fontSize: 11, lineHeight: 15 },
  noPasswordNotice: {
    marginTop: 12,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  noPasswordNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  modalInput: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: "700",
  },
  feedbackInput: {
    minHeight: 150,
    maxHeight: 230,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
  },
  formError: {
    marginTop: 9,
    color: "#F04438",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: "900" },
  primaryButton: {
    flex: 1.4,
    minHeight: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  disabled: { opacity: 0.6 },
});
