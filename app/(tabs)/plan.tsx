import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { deleteActivePlan, getActivePlan, getWorkouts } from "@/db/repository";
import {
  cancelAllWorkoutReminders,
  schedulePlanReminders,
} from "@/services/notifications";
import { useAppStore } from "@/store/useAppStore";
import { AppHeader } from "@/components/AppHeader";
import { WorkoutCard } from "@/components/WorkoutCard";
import { GlassBackground, GlassCard } from "@/components/Glass";
import { useI18n } from "@/i18n";
import type { TrainingPlan, Workout } from "@/types/models";

export default function PlanScreen() {
  const db = useSQLiteContext();
  const key = useAppStore((s) => s.refreshKey);
  const refresh = useAppStore((s) => s.refresh);
  const { t, language } = useI18n();
  const [rows, setRows] = useState<Workout[]>([]);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  useEffect(() => {
    (async () => {
      const p = await getActivePlan(db);
      setPlan(p);
      setRows(await getWorkouts(db, p?.id));
    })();
  }, [db, key]);
  const grouped = useMemo(
    () =>
      rows.reduce<Record<string, Workout[]>>((acc, w) => {
        const dt = new Date(`${w.date}T12:00:00`);
        const monday = new Date(dt);
        monday.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
        const k = monday.toISOString().slice(0, 10);
        (acc[k] ??= []).push(w);
        return acc;
      }, {}),
    [rows],
  );
  const upcoming = rows
    .filter((w) => w.date >= new Date().toISOString().slice(0, 10))
    .slice(0, 4);
  const done = rows.filter((w) => w.status === "COMPLETED").length;
  const progress = rows.length ? Math.round((done / rows.length) * 100) : 0;
  const reschedule = async () => {
    if (!plan) return;
    const n = await schedulePlanReminders(plan, rows);
    Alert.alert(t("remindersRescheduled"), `${n}`);
  };
  const remove = () =>
    Alert.alert(t("deleteCurrentPlanTitle"), t("deleteCurrentPlanMessage"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          await cancelAllWorkoutReminders();
          await deleteActivePlan(db);
          refresh();
        },
      },
    ]);
  return (
    <GlassBackground>
      <AppHeader title={t("plan")} />
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {plan ? (
          <>
            <GlassCard style={s.featured}>
              <View style={s.featureTop}>
                <View>
                  <Text style={s.featureEyebrow}>
                    {language === "vi" ? "HIỆN TẠI" : "CURRENT"}
                  </Text>
                  <Text style={s.featureTitle}>{plan.name}</Text>
                  <Text style={s.featureMeta}>
                    {plan.runsPerWeek} {t("daysPerWeek")} · Race {plan.raceDate}
                  </Text>
                </View>
                <View style={s.progressBadge}>
                  <Text style={s.progressText}>{progress}%</Text>
                </View>
              </View>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={s.featureQuote}>
                {language === "vi"
                  ? "“Hành trình vạn dặm bắt đầu từ những bước chân nhỏ.”"
                  : "“Every long journey begins with a small step.”"}
              </Text>
            </GlassCard>

            <View style={s.headingRow}>
              <Text style={s.sectionTitle}>
                {language === "vi" ? "Bài tập sắp tới" : "Upcoming workouts"}
              </Text>
              <Pressable onPress={() => router.push("/(tabs)/calendar")}>
                <Text style={s.link}>
                  {language === "vi" ? "Xem lịch" : "Calendar"} ›
                </Text>
              </Pressable>
            </View>
            {upcoming.map((w) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}

            <GlassCard style={s.manage}>
              <Text style={s.sectionTitle}>{t("planManagement")}</Text>
              <View style={s.actionRow}>
                <Pressable
                  style={s.action}
                  onPress={() => router.push("/create-plan")}
                >
                  <View style={s.actionIcon}>
                    <Ionicons name="add" size={21} color="#0A7D4D" />
                  </View>
                  <Text style={s.actionText}>{t("newPlan")}</Text>
                </Pressable>
                <Pressable style={s.action} onPress={reschedule}>
                  <View style={s.actionIcon}>
                    <Ionicons
                      name="notifications-outline"
                      size={19}
                      color="#0A7D4D"
                    />
                  </View>
                  <Text style={s.actionText}>{t("reschedule")}</Text>
                </Pressable>
              </View>
              <Pressable style={s.delete} onPress={remove}>
                <Ionicons name="trash-outline" size={17} color="#B42318" />
                <Text style={s.deleteText}>{t("deletePlan")}</Text>
              </Pressable>
            </GlassCard>

            <Text style={s.allTitle}>{t("trainingPlan")}</Text>
            {Object.entries(grouped).map(([week, items], i) => (
              <View key={week}>
                <Text style={s.week}>
                  {t("week")} {i + 1} · {week}
                </Text>
                {items.map((w) => (
                  <WorkoutCard key={w.id} workout={w} />
                ))}
              </View>
            ))}
          </>
        ) : (
          <GlassCard style={s.empty}>
            <Text style={s.emptyTitle}>{t("noCurrentPlan")}</Text>
            <Text style={s.muted}>{t("createPlanEmptyHelp")}</Text>
            <Pressable
              style={s.create}
              onPress={() => router.push("/create-plan")}
            >
              <Ionicons name="add" size={19} color="#fff" />
              <Text style={s.createText}>{t("createPlan")}</Text>
            </Pressable>
          </GlassCard>
        )}
      </ScrollView>
    </GlassBackground>
  );
}
const s = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 5, paddingBottom: 112 },
  featured: { padding: 18, overflow: "hidden" },
  featureTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  featureEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#0C8754",
  },
  featureTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#163126",
    marginTop: 5,
  },
  featureMeta: { color: "#667D72", marginTop: 5, fontWeight: "600" },
  progressBadge: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: "rgba(216,247,229,.85)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.95)",
  },
  progressText: { fontSize: 16, fontWeight: "900", color: "#0A7D4D" },
  progressTrack: {
    height: 9,
    backgroundColor: "rgba(207,223,215,.72)",
    borderRadius: 99,
    overflow: "hidden",
    marginTop: 18,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#36D189",
    borderRadius: 99,
  },
  featureQuote: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#557066",
    marginTop: 13,
    lineHeight: 18,
  },
  headingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#173228" },
  link: { fontSize: 12, color: "#5B7569", fontWeight: "800" },
  manage: { padding: 17, marginTop: 15 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 13 },
  action: {
    flex: 1,
    backgroundColor: "rgba(237,251,243,.76)",
    borderRadius: 20,
    padding: 13,
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.92)",
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(217,248,231,.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "900",
    color: "#315B47",
  },
  delete: {
    marginTop: 12,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "rgba(255,238,236,.65)",
  },
  deleteText: { color: "#B42318", fontWeight: "900", fontSize: 11 },
  allTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#173228",
    marginTop: 24,
    marginBottom: 4,
  },
  week: {
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 1,
    color: "#617A6E",
    marginTop: 15,
    marginBottom: 8,
  },
  empty: { padding: 22, marginTop: 10 },
  emptyTitle: { fontSize: 23, fontWeight: "900", color: "#163126" },
  muted: { color: "#667D72", lineHeight: 20, marginTop: 8 },
  create: {
    marginTop: 18,
    backgroundColor: "#0F9F63",
    borderRadius: 18,
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  createText: { fontWeight: "900", color: "#fff" },
});
