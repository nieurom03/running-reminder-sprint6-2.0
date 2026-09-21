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
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
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
import { WalkerIcon } from "@/components/WalkerIcon";
import { useTheme } from "@/context/ThemeContext";

export default function Dashboard() {
  const db = useSQLiteContext();
  const { t, language } = useI18n();
  const { colors } = useTheme();
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
        const wk = p ? await getWeeklyRunningSummary(db, p.id) : null;
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
  const planWorkouts = useMemo(
    () => workouts.filter((w) => !w.isExtra),
    [workouts],
  );
  const completed = planWorkouts.filter((w) => w.status === "COMPLETED").length,
    skipped = planWorkouts.filter((w) => w.status === "SKIPPED").length,
    missed = planWorkouts.filter((w) => w.status === "MISSED").length;
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todayRun = workouts.find(
    (w) => w.date === todayIso && w.type !== "REST",
  );
  const next =
    planWorkouts.find((w) => w.date >= todayIso && w.status === "PLANNED") ??
    planWorkouts.find((w) => w.status === "PLANNED");
  const totalKm = safePositive(week?.totalKm);
  const plannedWeekKm = useMemo(
    () =>
      week
        ? safePositive(
            planWorkouts
              .filter(
                (w) =>
                  w.date >= week.startDate &&
                  w.date <= week.endDate &&
                  w.type !== "REST",
              )
              .reduce((sum, w) => sum + safePositive(w.distanceKm), 0),
          )
        : 0,
    [week, planWorkouts],
  );
  const weekPct = Math.min(
    100,
    Math.round(safePercent(totalKm, plannedWeekKm)),
  );
  const dailyPlan = useMemo(() => {
    const out: Record<string, number> = {};
    if (!week) return out;
    for (const w of planWorkouts) {
      if (w.date < week.startDate || w.date > week.endDate || w.type === "REST")
        continue;
      out[w.date] = safePositive(
        (out[w.date] ?? 0) + safePositive(w.distanceKm),
      );
    }
    return out;
  }, [week, planWorkouts]);
  const dailyExtra = useMemo(() => {
    const out: Record<string, number> = {};
    if (!week) return out;
    for (const w of workouts) {
      if (
        !w.isExtra ||
        w.date < week.startDate ||
        w.date > week.endDate ||
        w.type === "REST"
      )
        continue;
      out[w.date] = safePositive(
        (out[w.date] ?? 0) + safePositive(w.distanceKm),
      );
    }
    return out;
  }, [week, workouts]);
  const hasWeeklyExtra = Object.values(dailyExtra).some((km) => km > 0);
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
          <Text style={[s.muted, { color: colors.textSecondary }]}>{t("loading")}</Text>
        </View>
      </GlassBackground>
    );
  if (error)
    return (
      <GlassBackground>
        <AppHeader title={t("dashboard")} />
        <View style={s.center}>
          <Text style={[s.error, { color: colors.textPrimary }]}>{t("couldNotLoad")}</Text>
          <Text style={[s.muted, { color: colors.textSecondary }]}>{error}</Text>
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
            <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>{t("noPlan")}</Text>
            <Text style={[s.muted, { color: colors.textSecondary }]}>{t("createPlanEmptyHelp")}</Text>
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
                  <Text style={[s.eyebrow, { color: colors.accent }]}>
                    {language === "vi" ? "TIẾN ĐỘ TUẦN NÀY" : "THIS WEEK"}
                  </Text>
                  <Text style={[s.heroTitle, { color: colors.textPrimary }]}>
                    {language === "vi"
                      ? "Chạy đều hôm nay"
                      : "Keep moving today"}
                  </Text>
                </View>
                <View style={[s.bell, { backgroundColor: colors.rowIconBg, borderColor: colors.bgCardBorder }]}>
                  <Ionicons
                    name="notifications-outline"
                    size={21}
                    color="#0C7A4B"
                  />
                </View>
              </View>
              <View style={s.heroBody}>
                <ProgressRing percent={weekPct} size={170} stroke={11}>
                  <Text style={[s.ringValue, { color: colors.textPrimary }]}>
                    {totalKm.toFixed(1)}{" "}
                    <Text style={[s.ringSub, { color: colors.textSecondary }]}>/ {plannedWeekKm.toFixed(1)}</Text>
                  </Text>
                  <Text style={[s.ringUnit, { color: colors.textSecondary }]}>km</Text>
                  <Text style={[s.ringPct, { color: colors.textSecondary }]}>
                    {weekPct}% {t("completed").toLowerCase()}
                  </Text>
                </ProgressRing>
                <View style={[s.motivation, { backgroundColor: colors.rowIconBg }]}>
                  <Ionicons name="leaf-outline" size={23} color="#0C8F58" />
                  <Text style={[s.motivationText, { color: colors.textLabel }]}>
                    {language === "vi"
                      ? "Kiên trì mỗi ngày, bạn mạnh hơn hôm qua."
                      : "Small steps today build a stronger tomorrow."}
                  </Text>
                </View>
              </View>
            </GlassCard>

            {!todayRun ? (
              <GlassCard style={s.todayCard}>
                <View style={[s.todayIcon, { backgroundColor: colors.rowIconBg }]}>
                  <Ionicons name="add" size={23} color={colors.accent} />
                </View>
                <View style={s.todayCopy}>
                  <Text style={[s.todayTitle, { color: colors.textPrimary }]}>
                    {t("noWorkoutToday")}
                  </Text>
                  <Text style={[s.todayHelp, { color: colors.textSecondary }]}>
                    {t("extraWorkoutHelp")}
                  </Text>
                </View>
                <Pressable
                  style={[s.todayButton, { backgroundColor: colors.accent }]}
                  onPress={() => router.push("/workout/create")}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={s.todayButtonText}>{t("addTodayWorkout")}</Text>
                </Pressable>
              </GlassCard>
            ) : todayRun.isExtra ? (
              <View style={s.todayExtra}>
                <Text style={[s.sectionOutside, { color: colors.textPrimary }]}>
                  {t("extraWorkoutToday")}
                </Text>
                <WorkoutCard workout={todayRun} />
              </View>
            ) : null}

            <View style={s.statsRow}>
              <StatusTile
                value={completed}
                label={t("completed")}
                icon="checkmark"
                color="#0F9F63"
                bg="rgba(224,249,235,.30)"
              />
              <StatusTile
                value={skipped}
                label={t("skipped")}
                icon="play-forward"
                color="#C87500"
                bg="rgba(255,244,204,.32)"
              />
              <StatusTile
                value={missed}
                label={t("missed")}
                icon="close"
                color="#D63B31"
                bg="rgba(255,229,226,.32)"
              />
            </View>

            <GlassCard style={s.activityCard}>
              <View style={s.sectionHead}>
                <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
                  {language === "vi"
                    ? "Hoạt động trong tuần"
                    : "Weekly activity"}
                </Text>
                <Text style={[s.sectionLink, { color: colors.textSecondary }]}>
                  {language === "vi" ? "Kế hoạch / thực tế" : "Plan / actual"}
                </Text>
              </View>
              <View style={s.chart}>
                {(week?.days ?? []).map((d, index) => {
                  const actual = safePositive(d.distanceKm),
                    planned = safePositive(dailyPlan[d.date]),
                    extra = safePositive(dailyExtra[d.date]),
                    chartTarget = safePositive(planned + extra),
                    status = dailyStatus[d.date] ?? "PLANNED";
                  const pct =
                    chartTarget > 0
                      ? Math.min(100, safePercent(actual, chartTarget))
                      : 0;
                  const fill =
                    status === "SKIPPED"
                      ? "#F79009"
                      : status === "MISSED"
                        ? "#F04438"
                        : "#12B76A";
                  const fillPct =
                    (status === "SKIPPED" || status === "MISSED") && chartTarget > 0
                      ? 100
                      : pct;
                  return (
                    <View key={d.date} style={s.barCol}>
                      <Text
                        style={[
                          s.barTop,
                          { color: extra > 0 ? colors.accent : colors.textSecondary },
                        ]}
                      >
                        {chartTarget > 0
                          ? `${chartTarget.toFixed(1)}${extra > 0 ? "*" : ""}`
                          : ""}
                      </Text>
                      <View
                        style={[
                          s.barTrack,
                          {
                            backgroundColor:
                              extra > 0 ? colors.accent : colors.divider,
                          },
                        ]}
                      >
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
                      <Text style={[s.day, { color: colors.textSecondary }]}>
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
              {hasWeeklyExtra && (
                <Text style={[s.extraNote, { color: colors.textSecondary }]}>
                  {t("extraWorkoutChartNote")}
                </Text>
              )}
            </GlassCard>

            <GlassCard style={s.nextCard}>
              <View
                style={[
                  s.nextIcon,
                  { backgroundColor: colors.rowIconBg },
                ]}
              >
                {next?.type === "WALK" ? (
                  <WalkerIcon size={27} color="#079455" />
                ) : (
                  <RunnerIcon size={26} color="#079455" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.nextLabel, { color: colors.textSecondary }]}>{t("nextRun")}</Text>
                <Text style={[s.nextName, { color: colors.textPrimary }]}>
                  {next ? next.type.replace("_", " ") : t("noWorkouts")}
                </Text>
                {next && (
                  <Text style={[s.nextMeta, { color: colors.textSecondary }]}>
                    {next.date} · {next.distanceKm} km
                  </Text>
                )}
              </View>
              <Pressable
                style={[s.roundArrow, { backgroundColor: colors.rowIconBg }]}
                onPress={() => router.push("/(tabs)/plan")}
              >
                <Ionicons name="chevron-forward" size={18} color="#0B6F48" />
              </Pressable>
            </GlassCard>

            <Text style={[s.sectionOutside, { color: colors.textPrimary }]}>{t("recentPlan")}</Text>
            {planWorkouts
              .filter((w) => w.date >= todayIso)
              .slice(0, 4)
              .map((w) => (
                <WorkoutCard key={w.id} workout={w} />
              ))}
            <GlassCard style={s.currentPlan}>
              <Text style={[s.eyebrow, { color: colors.accent }]}>{t("currentPlan")}</Text>
              <Text style={[s.planName, { color: colors.textPrimary }]}>{plan.name}</Text>
              <Text style={[s.planMeta, { color: colors.textSecondary }]}>
                {t("race")} {plan.raceDate} · {plan.runsPerWeek}{" "}
                {t("daysPerWeek")}
              </Text>
              <Pressable
                style={[s.glassButton, { backgroundColor: colors.rowIconBg }]}
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
  const { colors, isDark } = useTheme();
  const pct = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference * (1 - pct / 100);
  const trackColor = isDark ? "rgba(138,175,152,0.18)" : "#DCE8E1";

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        width={size}
        height={size}
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${size} ${size}`}
      >
        <Defs>
          <LinearGradient id="progressGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#39DB91" />
            <Stop offset="1" stopColor="#0FBF73" />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        {pct > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={progressOffset}
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        )}
      </Svg>
      <View
        style={[
          s.ringCenter,
          {
            backgroundColor: colors.bgCard,
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
  const { colors, isDark } = useTheme();
  return (
    <GlassCard style={[s.statusTile, { backgroundColor: isDark ? colors.bgCard : bg }]}>
      <View style={[s.statusIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={15} color="#fff" />
      </View>
      <Text style={[s.statusValue, { color }]}>{value}</Text>
      <Text style={[s.statusLabel, { color: colors.textSecondary }]}>{label}</Text>
    </GlassCard>
  );
}
function Legend({ c, text }: { c: string; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={s.legendItem}>
      <View style={[s.legendDot, { backgroundColor: c }]} />
      <Text style={[s.legendText, { color: colors.textSecondary }]}>{text}</Text>
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
  todayCard: {
    padding: 15,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    flexWrap: "wrap",
  },
  todayIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  todayCopy: { flex: 1, minWidth: 150 },
  todayTitle: { fontSize: 15, fontWeight: "900" },
  todayHelp: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  todayButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  todayButtonText: { color: "#fff", fontWeight: "900", fontSize: 10 },
  todayExtra: { marginTop: 2 },
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
  extraNote: { fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 8 },
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
