import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DateField } from "@/components/DateField";
import { GlassBackground, GlassCard } from "@/components/Glass";
import { useGlassAlert } from "@/components/GlassAlert";
import { GoalTimePicker } from "@/components/GoalTimePicker";
import { PacePicker } from "@/components/PacePicker";
import { useTheme } from "@/context/ThemeContext";
import {
  getGroupMembers,
  getGroupTrainingPlanBundle,
  getRunningGroup,
  getSetting,
  saveGroupTrainingPlanBundle,
} from "@/db/repository";
import { useI18n } from "@/i18n";
import {
  getConnectedNearbyPeers,
  sendNearbyMessage,
} from "@/services/nearbyGroups";
import { generateTrainingPlan } from "@/services/trainingGenerator";
import type {
  GroupTrainingPlanBundle,
  RunningGroup,
} from "@/types/models";
import { isClosedResourceError } from "@/utils/errors";

const distances = [5, 10, 21.1, 42.2];
const makeId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const paceText = (seconds: number | null) =>
  seconds == null
    ? "—"
    : `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}/km`;
const goalTimeText = (minutes: number) => {
  const totalSeconds = Math.max(0, Math.round(minutes * 60));
  return `${Math.floor(totalSeconds / 3600)}:${String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
};

type RunnerDraft = { name: string; paceSec: number };

export default function GroupPlanScreen() {
  const params = useLocalSearchParams<{
    groupId?: string | string[];
    mode?: string | string[];
  }>();
  const groupId = Array.isArray(params.groupId)
    ? params.groupId[0]
    : params.groupId;
  const mode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const db = useSQLiteContext();
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const showAlert = useGlassAlert();
  const futureDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 84);
    return iso(date);
  }, []);
  const [group, setGroup] = useState<RunningGroup | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [distance, setDistance] = useState(21.1);
  const [raceDate, setRaceDate] = useState(futureDate);
  const [goalSec, setGoalSec] = useState(2 * 3600 + 45 * 60);
  const [days, setDays] = useState<number[]>([1, 2, 4, 6]);
  const [longRunDay, setLongRunDay] = useState(6);
  const [runners, setRunners] = useState<RunnerDraft[]>([
    { name: "", paceSec: 450 },
  ]);
  const [existingPlan, setExistingPlan] =
    useState<GroupTrainingPlanBundle | null>(null);
  const [viewMember, setViewMember] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const dayNames =
    language === "vi"
      ? ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  useEffect(() => {
    if (!groupId) return;
    let active = true;
    void (async () => {
      try {
        const [nextGroup, members, storedName, existing] = await Promise.all([
          getRunningGroup(db, groupId),
          getGroupMembers(db, groupId),
          getSetting(db, "nearby_display_name"),
          getGroupTrainingPlanBundle(db, groupId),
        ]);
        if (!active) return;
        setGroup(nextGroup);
        setDisplayName(storedName ?? "");
        setExistingPlan(existing);
        if (existing) {
          setDistance(existing.plan.raceDistanceKm);
          setRaceDate(existing.plan.raceDate);
          setGoalSec(Math.round(existing.plan.goalTimeMinutes * 60));
          setDays(existing.plan.runningDays);
          setLongRunDay(existing.plan.longRunDay);
          setRunners(
            existing.members.map((member) => ({
              name: member.memberName,
              paceSec: member.currentPaceSec,
            })),
          );
          setViewMember(
            existing.members.find((member) => member.memberName === storedName)
              ?.memberName ?? existing.members[0]?.memberName ?? "",
          );
        } else {
          const names = members.map((member) => member.peerName);
          if (!names.length && storedName) names.push(storedName);
          setRunners(
            (names.length ? names : [""]).map((name) => ({
              name,
              paceSec: 450,
            })),
          );
        }
      } catch (error) {
        if (active && !isClosedResourceError(error)) {
          setError(error instanceof Error ? error.message : String(error));
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [db, groupId]);

  const isOwner = Boolean(group && displayName === group.ownerName);
  const canEdit = isOwner && mode !== "view";
  const visibleWorkouts = useMemo(
    () =>
      existingPlan?.workouts.filter(
        (workout) => workout.memberName === viewMember,
      ) ?? [],
    [existingPlan, viewMember],
  );
  const workoutLabel = (type: string) => {
    if (type === "TEMPO") return t("tempo");
    if (type === "INTERVAL") return t("interval");
    if (type === "LONG_RUN") return t("longRun");
    if (type === "RECOVERY") return t("recovery");
    if (type === "WALK") return t("walk");
    if (type === "REST") return t("rest");
    return t("easy");
  };

  const resizeRunners = (count: number) => {
    const safeCount = Math.min(20, Math.max(1, Math.round(count)));
    setRunners((current) =>
      Array.from({ length: safeCount }, (_, index) =>
        current[index] ?? {
          name:
            language === "vi"
              ? `Người chạy ${index + 1}`
              : `Runner ${index + 1}`,
          paceSec: 450,
        },
      ),
    );
  };

  const updateRunner = (index: number, patch: Partial<RunnerDraft>) => {
    setRunners((current) =>
      current.map((runner, runnerIndex) =>
        runnerIndex === index ? { ...runner, ...patch } : runner,
      ),
    );
  };

  const toggleDay = (day: number) => {
    const nextDays = days.includes(day)
      ? days.filter((value) => value !== day)
      : [...days, day].sort();
    setDays(nextDays);
    if (!nextDays.includes(longRunDay)) {
      setLongRunDay(nextDays.includes(6) ? 6 : (nextDays.at(-1) ?? 6));
    }
  };

  const validFutureDate = () => {
    const [year, month, day] = raceDate.split("-").map(Number);
    const race = new Date(year, month - 1, day, 12, 0, 0, 0);
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const latest = new Date(today);
    latest.setFullYear(latest.getFullYear() + 1);
    return (
      /^\d{4}-\d{2}-\d{2}$/.test(raceDate) &&
      Number.isFinite(race.getTime()) &&
      race.getFullYear() === year &&
      race.getMonth() === month - 1 &&
      race.getDate() === day &&
      race > today &&
      race <= latest
    );
  };

  const createBundle = (): GroupTrainingPlanBundle | null => {
    if (
      !group ||
      !canEdit ||
      !validFutureDate() ||
      days.length < 3 ||
      days.length > 5 ||
      goalSec < 300
    ) {
      setError(t("groupPlanInvalidRace"));
      return null;
    }
    const normalized = runners.map((runner) => ({
      name: runner.name.trim(),
      paceSec: Math.round(runner.paceSec),
    }));
    const names = normalized.map((runner) => runner.name.toLocaleLowerCase());
    if (
      normalized.some(
        (runner) =>
          !runner.name ||
          runner.name.length > 80 ||
          runner.paceSec < 180 ||
          runner.paceSec > 900,
      ) ||
      new Set(names).size !== names.length
    ) {
      setError(t("groupPlanInvalidMembers"));
      return null;
    }
    const planId = makeId();
    const createdAt = new Date().toISOString();
    const plan = {
      id: planId,
      groupId: group.id,
      raceDate,
      raceDistanceKm: distance,
      goalTimeMinutes: goalSec / 60,
      runsPerWeek: days.length,
      runningDays: days,
      longRunDay,
      createdBy: displayName,
      createdAt,
    };
    const members = normalized.map((runner) => ({
      planId,
      memberName: runner.name,
      currentPaceSec: runner.paceSec,
    }));
    const workouts = normalized.flatMap((runner, runnerIndex) =>
      generateTrainingPlan(
        {
          raceDistanceKm: distance,
          raceDate,
          goalTimeMinutes: goalSec / 60,
          currentPaceSec: runner.paceSec,
          runsPerWeek: days.length,
          runningDays: days,
          longRunDay,
          reminderHour: 18,
          reminderMinute: 0,
        },
        new Date(),
        language,
      ).map((workout, workoutIndex) => ({
        id: `${planId}:${runnerIndex}:${workoutIndex}`,
        planId,
        memberName: runner.name,
        ...workout,
      })),
    );
    return { plan, members, workouts };
  };

  const save = async () => {
    setError("");
    const bundle = createBundle();
    if (!bundle || !group) return;
    setSaving(true);
    try {
      await saveGroupTrainingPlanBundle(db, bundle);
      let sentCount = 0;
      try {
        const [connectedPeers, groupMembers] = await Promise.all([
          getConnectedNearbyPeers(),
          getGroupMembers(db, group.id),
        ]);
        const memberNames = new Set(
          groupMembers.map((member) => member.peerName),
        );
        const targets = connectedPeers.filter(
          (peerName) => peerName !== displayName && memberNames.has(peerName),
        );
        sentCount = targets.length
          ? await sendNearbyMessage({ type: "groupPlan", bundle }, targets)
          : 0;
      } catch {
        sentCount = 0;
      }
      showAlert(
        t("groupPlanSaved"),
        sentCount > 0
          ? `${t("groupPlanSharedCount")}: ${sentCount}`
          : t("groupPlanSavedOffline"),
        [{ text: t("done"), onPress: () => router.back() }],
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassBackground>
      <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={[s.title, { color: colors.textPrimary }]}>
            {t("groupTrainingPlan")}
          </Text>
          <View style={s.headerSpacer} />
        </View>
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          <GlassCard style={s.introCard}>
            <Ionicons name="people-circle-outline" size={30} color={colors.accent} />
            <View style={s.flex}>
              <Text style={[s.groupName, { color: colors.textPrimary }]}>
                {group?.name ?? "—"}
              </Text>
              <Text style={[s.help, { color: colors.textSecondary }]}>
                {t("groupPlanPersonalizedHelp")}
              </Text>
            </View>
          </GlassCard>

          {!canEdit ? (
            <>
              {!isOwner && (
                <GlassCard style={s.noticeCard}>
                  <Text style={[s.help, { color: colors.textSecondary }]}> 
                    {t("groupPlanOwnerOnly")}
                  </Text>
                </GlassCard>
              )}
              {existingPlan && (
                <>
                  <Text style={[s.sectionTitle, { color: colors.groupTitle }]}> 
                    {t("race")}
                  </Text>
                  <GlassCard style={s.readonlySummary}>
                    <Text style={[s.readonlyDistance, { color: colors.textPrimary }]}> 
                      {existingPlan.plan.raceDistanceKm} km
                    </Text>
                    <Text style={[s.readonlyMeta, { color: colors.textSecondary }]}> 
                      {existingPlan.plan.raceDate} · {goalTimeText(existingPlan.plan.goalTimeMinutes)} · {existingPlan.plan.runsPerWeek} {t("daysPerWeek")}
                    </Text>
                  </GlassCard>

                  <Text style={[s.sectionTitle, { color: colors.groupTitle }]}> 
                    {t("groupPlanSchedule")}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.memberTabs}
                  >
                    {existingPlan.members.map((member) => (
                      <Pressable
                        key={member.memberName}
                        onPress={() => setViewMember(member.memberName)}
                        style={[
                          s.memberTab,
                          {
                            backgroundColor:
                              viewMember === member.memberName
                                ? colors.accent
                                : colors.rowIconBg,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            s.memberTabName,
                            {
                              color:
                                viewMember === member.memberName
                                  ? "#fff"
                                  : colors.textPrimary,
                            },
                          ]}
                        >
                          {member.memberName}
                        </Text>
                        <Text
                          style={[
                            s.memberTabPace,
                            {
                              color:
                                viewMember === member.memberName
                                  ? "rgba(255,255,255,0.8)"
                                  : colors.textSecondary,
                            },
                          ]}
                        >
                          {paceText(member.currentPaceSec)}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <GlassCard style={s.scheduleCard}>
                    {visibleWorkouts.map((workout, index) => (
                      <View key={workout.id}>
                        {index > 0 && (
                          <View style={[s.scheduleDivider, { backgroundColor: colors.divider }]} />
                        )}
                        <View style={s.workoutRow}>
                          <View style={[s.workoutDate, { backgroundColor: colors.rowIconBg }]}> 
                            <Text style={[s.workoutDateText, { color: colors.accent }]}> 
                              {workout.date.slice(5)}
                            </Text>
                          </View>
                          <View style={s.flex}>
                            <Text style={[s.workoutTitle, { color: colors.textPrimary }]}> 
                              {workoutLabel(workout.type)} · {workout.distanceKm} km
                            </Text>
                            <Text style={[s.workoutPace, { color: colors.textSecondary }]}> 
                              {paceText(workout.targetPaceMinSec)} – {paceText(workout.targetPaceMaxSec)}
                            </Text>
                            <Text style={[s.workoutDescription, { color: colors.textSecondary }]}> 
                              {workout.description}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </GlassCard>
                </>
              )}
            </>
          ) : (
            <>
              <Text style={[s.sectionTitle, { color: colors.groupTitle }]}>
                {t("distance")}
              </Text>
              <GlassCard style={s.card}>
                <View style={s.chips}>
                  {distances.map((value) => (
                    <Pressable
                      key={value}
                      onPress={() => setDistance(value)}
                      style={[
                        s.chip,
                        {
                          backgroundColor:
                            distance === value ? colors.accent : colors.rowIconBg,
                          borderColor: colors.bgCardBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.chipText,
                          { color: distance === value ? "#fff" : colors.textPrimary },
                        ]}
                      >
                        {value === 21.1 ? "21K" : value === 42.2 ? "42K" : `${value}K`}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={[s.label, { color: colors.textLabel }]}>
                  {t("raceDate")}
                </Text>
                <DateField
                  value={raceDate}
                  onChange={setRaceDate}
                  minimumDate={new Date()}
                />
                <Text style={[s.label, { color: colors.textLabel }]}>
                  {t("goalTime")}
                </Text>
                <GoalTimePicker value={goalSec} onChange={setGoalSec} />
              </GlassCard>

              <Text style={[s.sectionTitle, { color: colors.groupTitle }]}>
                {t("runningDays")}
              </Text>
              <GlassCard style={s.card}>
                <View style={s.chips}>
                  {dayNames.map((name, day) => (
                    <Pressable
                      key={name}
                      onPress={() => toggleDay(day)}
                      style={[
                        s.day,
                        {
                          backgroundColor: days.includes(day)
                            ? colors.accent
                            : colors.rowIconBg,
                        },
                      ]}
                    >
                      <Text style={[s.dayText, { color: days.includes(day) ? "#fff" : colors.textPrimary }]}>
                        {name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={[s.label, { color: colors.textLabel }]}>
                  {t("longRunDay")}
                </Text>
                <View style={s.chips}>
                  {days.map((day) => (
                    <Pressable
                      key={day}
                      onPress={() => setLongRunDay(day)}
                      style={[
                        s.day,
                        {
                          backgroundColor:
                            longRunDay === day ? colors.accent : colors.rowIconBg,
                        },
                      ]}
                    >
                      <Text style={[s.dayText, { color: longRunDay === day ? "#fff" : colors.textPrimary }]}>
                        {dayNames[day]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </GlassCard>

              <Text style={[s.sectionTitle, { color: colors.groupTitle }]}>
                {t("runnerCount")}
              </Text>
              <GlassCard style={s.stepperCard}>
                <Pressable
                  onPress={() => resizeRunners(runners.length - 1)}
                  style={[s.stepButton, { backgroundColor: colors.rowIconBg }]}
                >
                  <Ionicons name="remove" size={22} color={colors.textPrimary} />
                </Pressable>
                <TextInput
                  value={String(runners.length)}
                  onChangeText={(value) => {
                    const count = Number(value.replace(/\D/g, ""));
                    if (count) resizeRunners(count);
                  }}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  style={[s.countInput, { color: colors.textPrimary }]}
                />
                <Pressable
                  onPress={() => resizeRunners(runners.length + 1)}
                  style={[s.stepButton, { backgroundColor: colors.rowIconBg }]}
                >
                  <Ionicons name="add" size={22} color={colors.textPrimary} />
                </Pressable>
              </GlassCard>

              <Text style={[s.sectionTitle, { color: colors.groupTitle }]}>
                {t("runnerInformation")}
              </Text>
              {runners.map((runner, index) => (
                <GlassCard key={index} style={s.runnerCard}>
                  <Text style={[s.runnerIndex, { color: colors.accent }]}>
                    #{index + 1}
                  </Text>
                  <TextInput
                    value={runner.name}
                    onChangeText={(name) => updateRunner(index, { name })}
                    maxLength={80}
                    placeholder={t("runnerName")}
                    placeholderTextColor={colors.textSecondary}
                    style={[
                      s.nameInput,
                      {
                        color: colors.textPrimary,
                        borderColor: colors.bgCardBorder,
                        backgroundColor: colors.bgCard,
                      },
                    ]}
                  />
                  <Text style={[s.label, { color: colors.textLabel }]}>
                    {t("currentPace")}
                  </Text>
                  <PacePicker
                    value={runner.paceSec}
                    onChange={(paceSec) => updateRunner(index, { paceSec })}
                    compact
                  />
                </GlassCard>
              ))}

              {!!error && (
                <View style={s.errorBox}>
                  <Ionicons name="alert-circle-outline" size={19} color="#F04438" />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}
              <Pressable
                disabled={saving}
                onPress={save}
                style={[
                  s.saveButton,
                  { backgroundColor: colors.accent, opacity: saving ? 0.55 : 1 },
                ]}
              >
                <Ionicons name="paper-plane-outline" size={20} color="#fff" />
                <Text style={s.saveText}>
                  {saving ? t("creating") : t("saveAndShareGroupPlan")}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </GlassBackground>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerSpacer: { width: 42 },
  title: { fontSize: 21, fontWeight: "900" },
  content: { paddingHorizontal: 18, paddingBottom: 48 },
  introCard: { padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  noticeCard: { marginTop: 14, padding: 16 },
  groupName: { fontSize: 20, fontWeight: "900" },
  help: { marginTop: 3, fontSize: 12, lineHeight: 18, fontWeight: "600" },
  sectionTitle: { marginTop: 18, marginBottom: 8, fontSize: 11, fontWeight: "900", letterSpacing: 1.1 },
  card: { padding: 15 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minWidth: 62, minHeight: 42, borderRadius: 21, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  chipText: { fontSize: 13, fontWeight: "900" },
  label: { marginTop: 15, marginBottom: 7, fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
  day: { minWidth: 43, height: 43, borderRadius: 22, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  dayText: { fontSize: 12, fontWeight: "900" },
  stepperCard: { padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18 },
  stepButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  countInput: { width: 72, textAlign: "center", fontSize: 28, fontWeight: "900" },
  runnerCard: { padding: 15, marginBottom: 10 },
  runnerIndex: { fontSize: 12, fontWeight: "900", marginBottom: 8 },
  nameInput: { minHeight: 48, borderRadius: 15, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, fontWeight: "800" },
  errorBox: { marginTop: 14, borderRadius: 15, backgroundColor: "rgba(240,68,56,0.1)", padding: 13, flexDirection: "row", alignItems: "center", gap: 8 },
  errorText: { flex: 1, color: "#D92D20", fontSize: 12, lineHeight: 18, fontWeight: "700" },
  saveButton: { marginTop: 18, minHeight: 52, borderRadius: 26, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saveText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  readonlySummary: { padding: 16 },
  readonlyDistance: { fontSize: 24, fontWeight: "900" },
  readonlyMeta: { marginTop: 5, fontSize: 12, fontWeight: "700" },
  memberTabs: { gap: 8, paddingRight: 8 },
  memberTab: { minWidth: 112, borderRadius: 17, paddingHorizontal: 13, paddingVertical: 10 },
  memberTabName: { fontSize: 13, fontWeight: "900" },
  memberTabPace: { marginTop: 2, fontSize: 10, fontWeight: "700" },
  scheduleCard: { marginTop: 10, paddingHorizontal: 14, paddingVertical: 5 },
  scheduleDivider: { height: 1, marginLeft: 52 },
  workoutRow: { flexDirection: "row", gap: 11, paddingVertical: 12 },
  workoutDate: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  workoutDateText: { fontSize: 11, fontWeight: "900" },
  workoutTitle: { fontSize: 14, fontWeight: "900" },
  workoutPace: { marginTop: 2, fontSize: 11, fontWeight: "800" },
  workoutDescription: { marginTop: 4, fontSize: 11, lineHeight: 16, fontWeight: "600" },
});
