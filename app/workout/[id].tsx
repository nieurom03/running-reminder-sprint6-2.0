import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import {
  getActivePlan,
  getActivityForWorkout,
  getWorkout,
  setWorkoutStatus,
} from "@/db/repository";
import { pace, statusTheme } from "@/components/WorkoutCard";
import { GlassBackground } from "@/components/Glass";
import { useGlassAlert } from "@/components/GlassAlert";
import { useAppStore } from "@/store/useAppStore";
import { scheduleWorkoutReminder } from "@/services/notifications";
import type {
  Activity,
  TrainingPlan,
  Workout,
  WorkoutStatus,
} from "@/types/models";
import { useI18n } from "@/i18n";
import { useTheme } from "@/context/ThemeContext";

const duration = (sec: number) =>
  `${Math.floor(sec / 3600)}:${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
const actualPace = (a: Activity) => {
  if (
    !Number.isFinite(a.distanceKm) ||
    a.distanceKm <= 0 ||
    !Number.isFinite(a.durationSeconds) ||
    a.durationSeconds <= 0
  )
    return "-- /km";
  const p = Math.round(a.durationSeconds / a.distanceKm);
  return `${Math.floor(p / 60)}:${String(p % 60).padStart(2, "0")} /km`;
};
const PRESETS = [60, 120, 360, 720, 1440, 2880] as const;

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const refresh = useAppStore((s) => s.refresh);
  const { t } = useI18n();
  const { colors, isDark } = useTheme();
  const showAlert = useGlassAlert();
  const [w, setW] = useState<Workout | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [offsetMin, setOffsetMin] = useState<number>(60);
  const [customDays, setCustomDays] = useState("");
  const load = useCallback(async () => {
    if (!id) return;
    try {
      const workout = await getWorkout(db, Number(id));
      const a = await getActivityForWorkout(db, Number(id));
      const p = await getActivePlan(db);
      setW(workout);
      setActivity(a);
      setPlan(p);
    } catch (e) {
      console.error("Workout detail DB error:", e);
    }
  }, [db, id]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  if (!w)
    return (
      <View style={[s.loading, { backgroundColor: colors.bgRoot }]}>
        <Text style={{ color: colors.textPrimary }}>{t("loading")}</Text>
      </View>
    );
  const theme = statusTheme[w.status] ?? statusTheme.PLANNED;
  const mark = async (status: WorkoutStatus) => {
    await setWorkoutStatus(db, w.id, status);
    refresh();
    await load();
  };
  const typeLabel =
    w.type === "EASY"
      ? t("easy")
      : w.type === "TEMPO"
        ? t("tempo")
        : w.type === "INTERVAL"
          ? t("interval")
          : w.type === "LONG_RUN"
            ? t("longRun")
            : w.type === "RECOVERY"
              ? t("recovery")
              : w.type === "WALK"
                ? t("walk")
                : t("rest");
  const reminderLabel = (m: number) =>
    m === 60
      ? t("reminder1h")
      : m === 120
        ? t("reminder2h")
        : m === 360
          ? t("reminder6h")
          : m === 720
            ? t("reminder12h")
            : m === 1440
              ? t("reminder1d")
              : t("reminder2d");
  const scheduleReminder = async () => {
    const custom = customDays.trim()
      ? Number(customDays.replace(",", "."))
      : null;
    const beforeMinutes =
      custom != null ? Math.round(custom * 1440) : offsetMin;
    if (custom != null && (!Number.isFinite(custom) || custom <= 0)) {
      showAlert(t("reminderCustom"), t("customDaysInvalid"));
      return;
    }
    const [y, m, d] = w.date.split("-").map(Number);
    const anchor = new Date(
      y,
      m - 1,
      d,
      plan?.reminderHour ?? 18,
      plan?.reminderMinute ?? 0,
      0,
      0,
    );
    const reminderAt = new Date(anchor.getTime() - beforeMinutes * 60_000);
    if (reminderAt.getTime() <= Date.now()) {
      showAlert(t("reminderOptions"), t("reminderPast"));
      return;
    }
    const result = await scheduleWorkoutReminder(
      reminderAt,
      `${w.type === "WALK" ? "🚶" : "🏃"} Runmio`,
      `${typeLabel} · ${w.distanceKm} km · ${w.date}`,
    );
    showAlert(
      result ? t("reminderScheduled") : t("reminderPermission"),
      result ? `${reminderAt.toLocaleString()}` : "",
    );
  };
  return (
    <GlassBackground>
      <ScrollView style={s.root} contentContainerStyle={s.content}>
        <View style={s.top}>
          <Pressable onPress={() => router.back()}>
            <Text style={[s.back, { color: colors.textPrimary }]}>
              {t("back")}
            </Text>
          </Pressable>
          <Pressable
            style={[
              s.editBtn,
              {
                backgroundColor: colors.bgCard,
                borderColor: colors.bgCardBorder,
              },
            ]}
            onPress={() => router.push(`/workout/edit/${w.id}`)}
          >
            <Text style={[s.editTxt, { color: colors.textPrimary }]}>
              {t("edit")}
            </Text>
          </Pressable>
        </View>
        <View style={[s.statusBadge, { backgroundColor: theme.badge }]}>
          <Text style={[s.statusText, { color: theme.text }]}>
            {theme.icon}{" "}
            {w.status === "COMPLETED"
              ? t("completed")
              : w.status === "SKIPPED"
                ? t("skipped")
                : w.status === "MISSED"
                  ? t("missed")
                  : t("planned")}
          </Text>
        </View>
        <Text style={[s.type, { color: colors.textSecondary }]}>
          {typeLabel.toUpperCase()}
        </Text>
        <Text style={[s.distance, { color: colors.textPrimary }]}>
          {w.distanceKm} km
        </Text>
        <Text style={[s.date, { color: colors.textSecondary }]}>{w.date}</Text>
        <View
          style={[
            s.box,
            {
              backgroundColor: colors.bgCard,
              borderColor: isDark ? colors.bgCardBorder : theme.border,
            },
          ]}
        >
          <Text style={[s.label, { color: colors.textLabel }]}>
            {t("targetPace")}
          </Text>
          <Text style={[s.value, { color: colors.textPrimary }]}>
            {pace(w.targetPaceMinSec)}–{pace(w.targetPaceMaxSec)} /km
          </Text>
          <Text style={[s.label, { color: colors.textLabel }]}>
            {t("notes")}
          </Text>
          <Text style={[s.notes, { color: colors.textPrimary }]}>
            {w.description || t("noNotes")}
          </Text>
        </View>
        {activity && (
          <Pressable
            style={[
              s.actual,
              {
                backgroundColor: isDark
                  ? colors.bgCard
                  : "rgba(236,253,243,0.40)",
              },
            ]}
            onPress={() => router.push(`/workout/result/${w.id}`)}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.actualLabel}>
                {t("actualResult")} · {activity.source}
              </Text>
              <Text style={s.actualValue}>
                {activity.distanceKm.toFixed(2)} km ·{" "}
                {duration(activity.durationSeconds)}
              </Text>
              <Text style={s.actualMeta}>
                Pace {actualPace(activity)}
                {activity.avgHeartRate
                  ? ` · Avg HR ${activity.avgHeartRate}`
                  : ""}
              </Text>
            </View>
            <Text style={s.chev}>›</Text>
          </Pressable>
        )}
        <Text style={[s.section, { color: colors.textSecondary }]}>
          {activity ? t("result") : t("updateStatus")}
        </Text>
        {activity ? (
          <Pressable
            style={[s.fullAction, { backgroundColor: "#12B76A" }]}
            onPress={() => router.push(`/workout/result/${w.id}`)}
          >
            <Text style={s.actionText}>✓ {t("editResult")}</Text>
          </Pressable>
        ) : (
          <View style={s.actions}>
            <Pressable
              style={[s.action, { backgroundColor: "#12B76A" }]}
              onPress={() => router.push(`/workout/result/${w.id}`)}
            >
              <Text style={s.actionText}>✓ {t("completed")}</Text>
            </Pressable>
            <Pressable
              style={[s.action, { backgroundColor: "#F79009" }]}
              onPress={() => mark("SKIPPED")}
            >
              <Text style={s.actionText}>↷ {t("skipped")}</Text>
            </Pressable>
            <Pressable
              style={[s.action, { backgroundColor: "#F04438" }]}
              onPress={() => mark("MISSED")}
            >
              <Text style={s.actionText}>! {t("missed")}</Text>
            </Pressable>
          </View>
        )}
        {w.status !== "PLANNED" && !activity && (
          <Pressable
            style={[
              s.reset,
              {
                backgroundColor: colors.bgCard,
                borderColor: colors.bgCardBorder,
              },
            ]}
            onPress={() => mark("PLANNED")}
          >
            <Text style={[s.resetTxt, { color: colors.textPrimary }]}>
              {t("resetPlanned")}
            </Text>
          </Pressable>
        )}

        <View
          style={[
            s.reminderCard,
            {
              backgroundColor: colors.bgCard,
              borderColor: colors.bgCardBorder,
            },
          ]}
        >
          <Text style={[s.reminderTitle, { color: colors.textPrimary }]}>
            {t("reminderOptions")}
          </Text>
          <Text style={[s.reminderHelp, { color: colors.textSecondary }]}>
            {t("reminderOptionsHelp")}
          </Text>
          <View style={s.presetGrid}>
            {PRESETS.map((m) => (
              <Pressable
                key={m}
                onPress={() => {
                  setOffsetMin(m);
                  setCustomDays("");
                }}
                style={[
                  s.preset,
                  {
                    backgroundColor: colors.bgCard,
                    borderColor: colors.bgCardBorder,
                  },
                  offsetMin === m && !customDays && s.presetOn,
                ]}
              >
                <Text
                  style={[
                    s.presetText,
                    { color: colors.textPrimary },
                    offsetMin === m && !customDays && s.presetTextOn,
                  ]}
                >
                  {reminderLabel(m)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[s.customLabel, { color: colors.textLabel }]}>
            {t("reminderCustom")}
          </Text>
          <View style={s.customRow}>
            <TextInput
              style={[
                s.customInput,
                {
                  backgroundColor: colors.bgCard,
                  borderColor: colors.bgCardBorder,
                  color: colors.textPrimary,
                },
              ]}
              value={customDays}
              onChangeText={setCustomDays}
              keyboardType="decimal-pad"
              placeholder="3"
            />
            <Text style={[s.customUnit, { color: colors.textPrimary }]}>
              {t("daysBefore")}
            </Text>
          </View>
          <Pressable style={s.reminderButton} onPress={scheduleReminder}>
            <Text style={s.reminderButtonText}>{t("scheduleReminder")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </GlassBackground>
  );
}
const s = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 22, paddingTop: 58, paddingBottom: 54 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F7FA",
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  back: { fontSize: 17, fontWeight: "700" },
  editBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  editTxt: { fontWeight: "800", color: "#344054" },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 24,
  },
  statusText: { fontWeight: "900", fontSize: 12 },
  type: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#667085",
    marginTop: 18,
  },
  distance: { fontSize: 52, fontWeight: "900", marginTop: 4 },
  date: { color: "#667085", fontSize: 16 },
  box: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginTop: 22,
    borderWidth: 1.5,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#98A2B3",
    marginTop: 8,
  },
  value: { fontSize: 24, fontWeight: "800", marginTop: 5, marginBottom: 18 },
  notes: { fontSize: 16, lineHeight: 23, marginTop: 6 },
  actual: {
    backgroundColor: "#ECFDF3",
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#12B76A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actualLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#027A48",
    letterSpacing: 0.8,
  },
  actualValue: {
    fontSize: 19,
    fontWeight: "900",
    color: "#027A48",
    marginTop: 5,
  },
  actualMeta: {
    fontSize: 12,
    fontWeight: "700",
    color: "#039855",
    marginTop: 3,
  },
  chev: { fontSize: 30, color: "#12B76A" },
  section: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
    color: "#667085",
    marginTop: 20,
    marginBottom: 10,
  },
  actions: { flexDirection: "row", gap: 8 },
  action: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 14,
    alignItems: "center",
  },
  fullAction: { paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  actionText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  reset: {
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D0D5DD",
  },
  resetTxt: { fontWeight: "800", color: "#344054" },
  reminderCard: {
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EAECF0",
  },
  reminderTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#667085",
  },
  reminderHelp: {
    fontSize: 13,
    color: "#667085",
    lineHeight: 19,
    marginTop: 6,
  },
  presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  preset: {
    borderWidth: 1,
    borderColor: "#D0D5DD",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  presetOn: { backgroundColor: "#101828", borderColor: "#101828" },
  presetText: { fontWeight: "800", fontSize: 12, color: "#344054" },
  presetTextOn: { color: "#fff" },
  customLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: "#667085",
    marginTop: 16,
  },
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  customInput: {
    width: 78,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    textAlign: "center",
  },
  customUnit: { fontSize: 14, fontWeight: "700", color: "#475467" },
  reminderButton: {
    backgroundColor: "#155EEF",
    borderRadius: 14,
    padding: 15,
    alignItems: "center",
    marginTop: 16,
  },
  reminderButtonText: { color: "#fff", fontWeight: "900" },
});
