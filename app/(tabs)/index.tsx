import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSQLiteContext } from "expo-sqlite";
import { router } from "expo-router";
import {
  getActivePlan,
  getWeeklyRunningSummary,
  getWorkouts,
  markPastPlannedWorkoutsMissed,
} from "@/db/repository";
import { WorkoutCard } from "@/components/WorkoutCard";
import { useAppStore } from "@/store/useAppStore";
import { safePercent, safePositive } from "@/utils/numbers";
import { AppHeader } from "@/components/AppHeader";
import { GlassBackground, GlassCard } from "@/components/Glass";
import { useI18n } from "@/i18n";
import type {
  TrainingPlan,
  WeeklyRunningSummary,
  Workout,
} from "@/types/models";
import { RunnerIcon } from "@/components/RunnerIcon";

export default function Dashboard() {
  const db = useSQLiteContext();
  const { t, language } = useI18n();
  const refreshKey = useAppStore((s) => s.refreshKey);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [week, setWeek] = useState<WeeklyRunningSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await markPastPlannedWorkoutsMissed(db);
        const p = await getActivePlan(db);
        if (!active) return;
        const ws = await getWorkouts(db, p?.id);
        if (!active) return;
        const wk = await getWeeklyRunningSummary(db);
        if (!active) return;
        setPlan(p);
        setWorkouts(ws);
        setWeek(wk);
      } catch (e: any) {
        if (active) setError(e?.message ?? "Dashboard error");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [db, refreshKey]);
  const completed = workouts.filter((w) => w.status === "COMPLETED").length,
    skipped = workouts.filter((w) => w.status === "SKIPPED").length,
    missed = workouts.filter((w) => w.status === "MISSED").length;
  const todayIso = new Date().toISOString().slice(0, 10);
  const next =
    workouts.find((w) => w.date >= todayIso && w.status === "PLANNED") ??
    workouts.find((w) => w.status === "PLANNED");
  const totalKm = safePositive(week?.totalKm);
  const plannedWeekKm = useMemo(
    () =>
      week
        ? safePositive(
            workouts
              .filter(
                (w) =>
                  w.date >= week.startDate &&
                  w.date <= week.endDate &&
                  w.type !== "REST",
              )
              .reduce((sum, w) => sum + safePositive(w.distanceKm), 0),
          )
        : 0,
    [week, workouts],
  );
  const weekPct = Math.min(
    100,
    Math.round(safePercent(totalKm, plannedWeekKm)),
  );
  const dailyPlan = useMemo(() => {
    const out: Record<string, number> = {};
    if (!week) return out;
    for (const w of workouts) {
      if (w.date < week.startDate || w.date > week.endDate || w.type === "REST")
        continue;
      out[w.date] = safePositive(
        (out[w.date] ?? 0) + safePositive(w.distanceKm),
      );
    }
    return out;
  }, [week, workouts]);
  const dailyStatus = useMemo(() => {
    const out: Record<string, Workout["status"]> = {};
    if (!week) return out;
    for (const d of week.days) {
      const day = workouts.filter(
        (w) => w.date === d.date && w.type !== "REST",
      );
      if (day.some((w) => w.status === "COMPLETED")) out[d.date] = "COMPLETED";
      else if (day.some((w) => w.status === "SKIPPED")) out[d.date] = "SKIPPED";
      else if (day.some((w) => w.status === "MISSED")) out[d.date] = "MISSED";
      else out[d.date] = "PLANNED";
    }
    return out;
  }, [week, workouts]);
  if (loading)
    return (
      <GlassBackground>
        <AppHeader title={t("dashboard")} />
        <View style={s.center}>
          <ActivityIndicator size="large" color="#079455" />
          <Text style={s.muted}>{t("loading")}</Text>
        </View>
      </GlassBackground>
    );
  if (error)
    return (
      <GlassBackground>
        <AppHeader title={t("dashboard")} />
        <View style={s.center}>
          <Text style={s.error}>{t("couldNotLoad")}</Text>
          <Text style={s.muted}>{error}</Text>
        </View>
      </GlassBackground>
    );
  return (
    <GlassBackground>
      <AppHeader title={t("dashboard")} />
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {!plan ? (
          <GlassCard style={s.empty}>
            <Text style={s.emptyTitle}>{t("noPlan")}</Text>
            <Text style={s.muted}>{t("createPlanEmptyHelp")}</Text>
            <Pressable
              style={s.primary}
              onPress={() => router.push("/create-plan")}
            >
              <Text style={s.primaryText}>{t("createPlan")}</Text>
            </Pressable>
          </GlassCard>
        ) : (
          <>
            <GlassCard style={s.hero}>
              <View style={s.heroHeader}>
                <View>
                  <Text style={s.eyebrow}>
                    {language === "vi" ? "TIẾN ĐỘ TUẦN NÀY" : "THIS WEEK"}
                  </Text>
                  <Text style={s.heroTitle}>
                    {language === "vi"
                      ? "Chạy đều hôm nay"
                      : "Keep moving today"}
                  </Text>
                </View>
                <View style={s.bell}>
                  <Ionicons
                    name="notifications-outline"
                    size={21}
                    color="#0C7A4B"
                  />
                </View>
              </View>
              <View style={s.heroBody}>
                <ProgressRing percent={weekPct} size={170} stroke={11}>
                  <Text style={s.ringValue}>
                    {totalKm.toFixed(1)}{" "}
                    <Text style={s.ringSub}>/ {plannedWeekKm.toFixed(1)}</Text>
                  </Text>
                  <Text style={s.ringUnit}>km</Text>
                  <Text style={s.ringPct}>
                    {weekPct}% {t("completed").toLowerCase()}
                  </Text>
                </ProgressRing>
                <View style={s.motivation}>
                  <Ionicons name="leaf-outline" size={23} color="#0C8F58" />
                  <Text style={s.motivationText}>
                    {language === "vi"
                      ? "Kiên trì mỗi ngày, bạn mạnh hơn hôm qua."
                      : "Small steps today build a stronger tomorrow."}
                  </Text>
                </View>
              </View>
            </GlassCard>

            <View style={s.statsRow}>
              <StatusTile
                value={completed}
                label={t("completed")}
                icon="checkmark"
                color="#0F9F63"
                bg="rgba(224,249,235,.78)"
              />
              <StatusTile
                value={skipped}
                label={t("skipped")}
                icon="play-forward"
                color="#C87500"
                bg="rgba(255,244,204,.82)"
              />
              <StatusTile
                value={missed}
                label={t("missed")}
                icon="close"
                color="#D63B31"
                bg="rgba(255,229,226,.82)"
              />
            </View>

            <GlassCard style={s.activityCard}>
              <View style={s.sectionHead}>
                <Text style={s.sectionTitle}>
                  {language === "vi"
                    ? "Hoạt động trong tuần"
                    : "Weekly activity"}
                </Text>
                <Text style={s.sectionLink}>
                  {language === "vi" ? "Kế hoạch / thực tế" : "Plan / actual"}
                </Text>
              </View>
              <View style={s.chart}>
                {(week?.days ?? []).map((d, index) => {
                  const actual = safePositive(d.distanceKm),
                    planned = safePositive(dailyPlan[d.date]),
                    status = dailyStatus[d.date] ?? "PLANNED";
                  const pct =
                    planned > 0
                      ? Math.min(100, safePercent(actual, planned))
                      : 0;
                  const fill =
                    status === "SKIPPED"
                      ? "#F79009"
                      : status === "MISSED"
                        ? "#F04438"
                        : "#12B76A";
                  const fillPct =
                    (status === "SKIPPED" || status === "MISSED") && planned > 0
                      ? 100
                      : pct;
                  return (
                    <View key={d.date} style={s.barCol}>
                      <Text style={s.barTop}>
                        {planned > 0 ? planned.toFixed(1) : ""}
                      </Text>
                      <View style={s.barTrack}>
                        {fillPct > 0 && (
                          <View
                            style={[
                              s.barFill,
                              { height: `${fillPct}%`, backgroundColor: fill },
                            ]}
                          >
                            {actual > 0 && (
                              <Text style={s.actual}>{actual.toFixed(1)}</Text>
                            )}
                          </View>
                        )}
                      </View>
                      <Text style={s.day}>
                        {language === "vi"
                          ? d.dayLabel
                          : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][
                              index
                            ]}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <View style={s.legend}>
                <Legend
                  c="#D7E0DB"
                  text={language === "vi" ? "Kế hoạch" : "Planned"}
                />
                <Legend c="#12B76A" text={t("completed")} />
                <Legend c="#F79009" text={t("skipped")} />
                <Legend c="#F04438" text={t("missed")} />
              </View>
            </GlassCard>

            <GlassCard style={s.nextCard}>
              <View
                style={[
                  s.nextIcon,
                  { backgroundColor: "rgba(219,248,232,.8)" },
                ]}
              >
                <RunnerIcon size={26} color="#079455" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.nextLabel}>{t("nextRun")}</Text>
                <Text style={s.nextName}>
                  {next ? next.type.replace("_", " ") : t("noWorkouts")}
                </Text>
                {next && (
                  <Text style={s.nextMeta}>
                    {next.date} · {next.distanceKm} km
                  </Text>
                )}
              </View>
              <Pressable
                style={s.roundArrow}
                onPress={() => router.push("/(tabs)/plan")}
              >
                <Ionicons name="chevron-forward" size={18} color="#0B6F48" />
              </Pressable>
            </GlassCard>

            <Text style={s.sectionOutside}>{t("recentPlan")}</Text>
            {workouts
              .filter((w) => w.date >= todayIso)
              .slice(0, 4)
              .map((w) => (
                <WorkoutCard key={w.id} workout={w} />
              ))}
            <GlassCard style={s.currentPlan}>
              <Text style={s.eyebrow}>{t("currentPlan")}</Text>
              <Text style={s.planName}>{plan.name}</Text>
              <Text style={s.planMeta}>
                {t("race")} {plan.raceDate} · {plan.runsPerWeek}{" "}
                {t("daysPerWeek")}
              </Text>
              <Pressable
                style={s.glassButton}
                onPress={() => router.push("/(tabs)/plan")}
              >
                <Text style={s.glassButtonText}>{t("viewPlan")}</Text>
                <Ionicons name="arrow-forward" size={16} color="#0B6F48" />
              </Pressable>
            </GlassCard>
          </>
        )}
      </ScrollView>
    </GlassBackground>
  );
}
function ProgressRing({
  percent,
  size,
  stroke,
  children,
}: {
  percent: number;
  size: number;
  stroke: number;
  children: ReactNode;
}) {
  const pct = Math.max(
      0,
      Math.min(100, Number.isFinite(percent) ? percent : 0),
    ),
    segments = 72,
    active = Math.round((pct / 100) * segments),
    len = Math.max(5, stroke * 0.8),
    radius = (size - stroke) / 2;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {Array.from({ length: segments }, (_, i) => {
        const angle = (360 / segments) * i;
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              width: stroke,
              height: len,
              borderRadius: stroke / 2,
              backgroundColor: i < active ? "#12B76A" : "#DCE8E1",
              left: size / 2 - stroke / 2,
              top: size / 2 - len / 2,
              transform: [{ rotate: `${angle}deg` }, { translateY: -radius }],
            }}
          />
        );
      })}
      <View
        style={[
          s.ringCenter,
          {
            width: size - stroke * 3.3,
            height: size - stroke * 3.3,
            borderRadius: (size - stroke * 3.3) / 2,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}
function StatusTile({
  value,
  label,
  icon,
  color,
  bg,
}: {
  value: number;
  label: string;
  icon: any;
  color: string;
  bg: string;
}) {
  return (
    <GlassCard style={[s.statusTile, { backgroundColor: bg }]}>
      <View style={[s.statusIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={15} color="#fff" />
      </View>
      <Text style={[s.statusValue, { color }]}>{value}</Text>
      <Text style={s.statusLabel}>{label}</Text>
    </GlassCard>
  );
}
function Legend({ c, text }: { c: string; text: string }) {
  return (
    <View style={s.legendItem}>
      <View style={[s.legendDot, { backgroundColor: c }]} />
      <Text style={s.legendText}>{text}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 112 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  muted: { color: "#667D72", marginTop: 7, lineHeight: 20 },
  error: { fontSize: 22, fontWeight: "900", color: "#163126" },
  empty: { padding: 22, marginTop: 14 },
  emptyTitle: { fontSize: 23, fontWeight: "900", color: "#163126" },
  primary: {
    backgroundColor: "#0F9F63",
    padding: 15,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 18,
  },
  primaryText: { color: "#fff", fontWeight: "900" },
  hero: { padding: 18, marginTop: 6 },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#557066",
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#183027",
    marginTop: 4,
  },
  bell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,.62)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 12,
  },
  ringCenter: {
    position: "absolute",
    backgroundColor: "rgba(250,255,252,.94)",
    alignItems: "center",
    justifyContent: "center",
  },
  ringValue: { fontSize: 23, fontWeight: "900", color: "#10231A" },
  ringSub: { fontSize: 15, color: "#71847A", fontWeight: "800" },
  ringUnit: { fontSize: 13, color: "#587066", marginTop: 2 },
  ringPct: { fontSize: 11, color: "#71847A", marginTop: 5 },
  motivation: {
    flex: 1,
    minHeight: 116,
    borderRadius: 24,
    backgroundColor: "rgba(218,245,229,.55)",
    padding: 16,
    justifyContent: "center",
  },
  motivationText: {
    fontSize: 14,
    color: "#41675A",
    lineHeight: 21,
    fontWeight: "700",
    marginTop: 8,
  },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  statusTile: {
    flex: 1,
    padding: 13,
    alignItems: "flex-start",
    borderRadius: 24,
  },
  statusIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statusValue: { fontSize: 28, fontWeight: "900", marginTop: 8 },
  statusLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#486156",
    marginTop: 1,
  },
  activityCard: { padding: 16, marginTop: 12 },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: "#1A3329" },
  sectionLink: { fontSize: 11, color: "#6C8378", fontWeight: "700" },
  chart: {
    height: 150,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    marginTop: 16,
  },
  barCol: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barTop: { fontSize: 9, color: "#6A7D74", height: 15, fontWeight: "800" },
  barTrack: {
    height: 95,
    width: "68%",
    backgroundColor: "rgba(213,226,219,.68)",
    borderRadius: 8,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 4,
  },
  actual: { fontSize: 9, fontWeight: "900", color: "#fff" },
  day: { fontSize: 10, fontWeight: "800", color: "#667D72", marginTop: 6 },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginTop: 10,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: "#667D72" },
  nextCard: {
    padding: 15,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  nextIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  nextLabel: { fontSize: 11, fontWeight: "900", color: "#71847A" },
  nextName: { fontSize: 18, fontWeight: "900", color: "#153027", marginTop: 3 },
  nextMeta: { fontSize: 12, color: "#667D72", marginTop: 3 },
  roundArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(224,248,235,.84)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionOutside: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#587066",
    marginTop: 24,
    marginBottom: 10,
  },
  currentPlan: { padding: 18, marginTop: 14 },
  planName: { fontSize: 22, fontWeight: "900", color: "#153027", marginTop: 7 },
  planMeta: { fontSize: 13, color: "#667D72", marginTop: 5 },
  glassButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(222,248,234,.78)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 14,
  },
  glassButtonText: { fontWeight: "900", color: "#0B6F48" },
});
