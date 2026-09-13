import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import {
  createGeneratedPlan,
  getActivePlan,
  getWorkouts,
} from "@/db/repository";
import { schedulePlanReminders } from "@/services/notifications";
import { useAppStore } from "@/store/useAppStore";
import { DateField } from "@/components/DateField";
import { PacePicker } from "@/components/PacePicker";
import { GoalTimePicker, goalSecToText } from "@/components/GoalTimePicker";
import { useI18n } from "@/i18n";
const distances = [5, 10, 21.1, 42.2];
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export default function CreatePlanScreen() {
  const db = useSQLiteContext();
  const refresh = useAppStore((s) => s.refresh);
  const { t, language } = useI18n();
  const future = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 84);
    return iso(d);
  }, []);
  const [distance, setDistance] = useState(21.1);
  const [raceDate, setRaceDate] = useState(future);
  const [goalSec, setGoalSec] = useState(2 * 3600 + 45 * 60);
  const [paceSec, setPaceSec] = useState(450);
  const [days, setDays] = useState<number[]>([1, 2, 4, 6]);
  const [longRunDay, setLongRunDay] = useState(6);
  const [hour, setHour] = useState("18");
  const [minute, setMinute] = useState("00");
  const [saving, setSaving] = useState(false);
  const dayNames =
    language === "vi"
      ? ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const valid = useMemo(
    () =>
      /^\d{4}-\d{2}-\d{2}$/.test(raceDate) &&
      days.length >= 3 &&
      days.includes(longRunDay),
    [raceDate, days, longRunDay],
  );
  const toggle = (d: number) => {
    const nextDays = days.includes(d)
      ? days.filter((x) => x !== d)
      : [...days, d].sort();
    setDays(nextDays);
    if (!nextDays.includes(longRunDay)) {
      setLongRunDay(nextDays.includes(6) ? 6 : (nextDays.at(-1) ?? 6));
    }
  };
  const create = async () => {
    if (!valid) return Alert.alert(t("checkData"), t("chooseRaceAndDays"));
    setSaving(true);
    try {
      await createGeneratedPlan(db, {
        raceDistanceKm: distance,
        raceDate,
        goalTimeMinutes: goalSec / 60,
        currentPaceSec: paceSec,
        runsPerWeek: days.length,
        runningDays: days,
        longRunDay,
        reminderHour: Math.min(23, Math.max(0, Number(hour) || 18)),
        reminderMinute: Math.min(59, Math.max(0, Number(minute) || 0)),
      });
      const plan = await getActivePlan(db);
      const workouts = await getWorkouts(db, plan?.id);
      let reminders = 0;
      if (plan) reminders = await schedulePlanReminders(plan, workouts);
      refresh();
      Alert.alert(
        t("planCreated"),
        `${workouts.length} ${t("workouts")} · ${reminders} reminder`,
      );
      router.replace("/(tabs)/plan");
    } catch (e: any) {
      Alert.alert(t("couldNotCreatePlan"), e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.top}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#101828" />
        </Pressable>
        <Text style={s.title}>{t("createPlanTitle")}</Text>
        <View style={s.placeholder} />
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>{t("raceGoalOptional")}</Text>
        <Text style={s.label}>{t("distance")}</Text>
        <View style={s.selectorBox}>
          <Text style={s.selectorText}>
            {distance === 42.2
              ? "Marathon (42.2 km)"
              : distance === 21.1
                ? "Half Marathon (21.1 km)"
                : distance === 10
                  ? "10K (10 km)"
                  : "5K (5 km)"}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#667085" />
        </View>
        <View style={s.distanceRow}>
          {distances.map((d) => (
            <Pressable
              key={d}
              onPress={() => setDistance(d)}
              style={[s.distanceChip, distance === d && s.distanceChipOn]}
            >
              <Text
                style={[s.distanceText, distance === d && s.distanceTextOn]}
              >
                {d === 21.1 ? "21K" : d === 42.2 ? "42K" : `${d}K`}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.label}>{t("raceDate")}</Text>
        <DateField
          value={raceDate}
          onChange={setRaceDate}
          minimumDate={new Date()}
        />

        <Text style={s.label}>{t("goalTime")}</Text>
        <GoalTimePicker value={goalSec} onChange={setGoalSec} />
        <View style={s.inlineInfo}>
          <Ionicons name="time-outline" size={16} color="#667085" />
          <Text style={s.inlineInfoText}>
            {t("goalTime")}{" "}
            <Text style={s.inlineStrong}>{goalSecToText(goalSec)}</Text>
          </Text>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>{t("setCurrentPace")}</Text>
        <Text style={s.centerHint}>{t("chooseCurrentPace")}</Text>
        <PacePicker value={paceSec} onChange={setPaceSec} />
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>{t("runningDays")}</Text>
        <View style={s.daysRow}>
          {dayNames.map((n, d) => (
            <Pressable
              key={n}
              onPress={() => toggle(d)}
              style={[s.day, days.includes(d) && s.dayOn]}
            >
              <Text style={[s.dayText, days.includes(d) && s.dayTextOn]}>
                {n}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.helper}>{t("runningDaysHelp")}</Text>

        <Text style={s.label}>{t("longRunDay")}</Text>
        <View style={s.daysRow}>
          {days.map((d) => (
            <Pressable
              key={d}
              onPress={() => setLongRunDay(d)}
              style={[s.day, longRunDay === d && s.longRunDayOn]}
            >
              <Text style={[s.dayText, longRunDay === d && s.dayTextOn]}>
                {dayNames[d]}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.helper}>{t("longRunDayHelp")}</Text>

        <Text style={s.label}>{t("reminderTime")}</Text>
        <View style={s.timeRow}>
          <TextInput
            value={hour}
            onChangeText={setHour}
            keyboardType="number-pad"
            style={s.timeInput}
          />
          <Text style={s.colon}>:</Text>
          <TextInput
            value={minute}
            onChangeText={setMinute}
            keyboardType="number-pad"
            style={s.timeInput}
          />
        </View>
      </View>
      <Pressable
        onPress={create}
        disabled={saving}
        style={[s.button, saving && { opacity: 0.6 }]}
      >
        <Text style={s.buttonText}>{saving ? t("creating") : t("next")}</Text>
      </Pressable>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FA" },
  content: { padding: 20, paddingTop: 20, paddingBottom: 60 },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 30, fontWeight: "900", color: "#101828" },
  placeholder: { width: 36 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EAECF0",
    marginBottom: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: "900", color: "#101828" },
  label: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#667085",
    marginTop: 18,
    marginBottom: 8,
  },
  selectorBox: {
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  selectorText: { fontSize: 17, fontWeight: "600", color: "#101828" },
  distanceRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
  },
  distanceChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E4E7EC",
  },
  distanceChipOn: { backgroundColor: "#111827", borderColor: "#111827" },
  distanceText: { fontWeight: "800", color: "#344054" },
  distanceTextOn: { color: "#fff" },
  inlineInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  inlineInfoText: { fontSize: 13, color: "#475467" },
  inlineStrong: { fontWeight: "900", color: "#101828" },
  centerHint: {
    fontSize: 16,
    color: "#101828",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 12,
  },
  daysRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  day: {
    minWidth: 43,
    height: 43,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D0D5DD",
  },
  dayOn: { backgroundColor: "#111827" },
  longRunDayOn: { backgroundColor: "#2DB526", borderColor: "#2DB526" },
  dayText: { fontWeight: "800", color: "#344054", fontSize: 12 },
  dayTextOn: { color: "#fff" },
  helper: { fontSize: 12, color: "#667085", marginTop: 9, lineHeight: 18 },
  timeRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  timeInput: {
    width: 72,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 12,
    padding: 13,
    fontSize: 18,
    textAlign: "center",
  },
  colon: { fontSize: 24, fontWeight: "700", paddingHorizontal: 10 },
  button: {
    backgroundColor: "#12B76A",
    padding: 17,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: { color: "#fff", fontWeight: "900", letterSpacing: 0.5 },
});
