import { useCallback, useMemo, useState } from "react";
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
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import {
  deleteManualActivityForWorkout,
  getActivityForWorkout,
  getWorkout,
  saveManualActivity,
} from "@/db/repository";
import { useAppStore } from "@/store/useAppStore";
import type { Activity, RunFeeling, Workout } from "@/types/models";
import { useI18n } from "@/i18n";
import { DurationPicker } from "@/components/DurationPicker";
import { useTheme } from "@/context/ThemeContext";

const FEELINGS: {
  value: RunFeeling;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  vi: string;
  en: string;
}[] = [
  {
    value: "GREAT",
    icon: "happy-outline",
    color: "#12B76A",
    vi: "Rất tốt",
    en: "Great",
  },
  {
    value: "GOOD",
    icon: "thumbs-up-outline",
    color: "#027A48",
    vi: "Tốt",
    en: "Good",
  },
  {
    value: "NORMAL",
    icon: "remove-circle-outline",
    color: "#667085",
    vi: "Bình thường",
    en: "Normal",
  },
  {
    value: "HARD",
    icon: "flame-outline",
    color: "#F79009",
    vi: "Khó",
    en: "Hard",
  },
  {
    value: "VERY_HARD",
    icon: "warning-outline",
    color: "#F04438",
    vi: "Rất khó",
    en: "Very hard",
  },
];
const parseDuration = (v: string) => {
  const p = v.split(":").map(Number);
  if (p.some(Number.isNaN)) return NaN;
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  if (p.length === 2) return p[0] * 60 + p[1];
  return NaN;
};
const formatDuration = (sec: number) =>
  `${String(Math.floor(sec / 3600)).padStart(2, "0")}:${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
const paceText = (sec: number, km: number) => {
  if (!km || !sec) return "--";
  const p = Math.round(sec / km);
  return `${Math.floor(p / 60)}:${String(p % 60).padStart(2, "0")} /km`;
};

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const refresh = useAppStore((s) => s.refresh);
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const [w, setW] = useState<Workout | null>(null);
  const [existing, setExisting] = useState<Activity | null>(null);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [avgHr, setAvgHr] = useState("");
  const [maxHr, setMaxHr] = useState("");
  const [elevation, setElevation] = useState("");
  const [feeling, setFeeling] = useState<RunFeeling>("NORMAL");
  const [notes, setNotes] = useState("");
  const load = useCallback(async () => {
    if (!id) return;
    const workout = await getWorkout(db, Number(id));
    const a = await getActivityForWorkout(db, Number(id));
    setW(workout);
    setExisting(a);
    if (a) {
      setDistance(String(a.distanceKm));
      setDuration(formatDuration(a.durationSeconds));
      setAvgHr(a.avgHeartRate ? String(a.avgHeartRate) : "");
      setMaxHr(a.maxHeartRate ? String(a.maxHeartRate) : "");
      setElevation(a.elevationGain != null ? String(a.elevationGain) : "");
      setFeeling(a.feeling ?? "NORMAL");
      setNotes(a.notes ?? "");
    } else if (workout) {
      setDistance(String(workout.distanceKm));
      setDuration("00:45:00");
      setFeeling("NORMAL");
    }
  }, [db, id]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  const seconds = useMemo(() => parseDuration(duration), [duration]);
  const km = Number(distance.replace(",", "."));
  const computedPace =
    Number.isFinite(seconds) && Number.isFinite(km) && km > 0
      ? paceText(seconds, km)
      : "--";
  if (!w)
    return (
      <View style={[s.loading,{backgroundColor:colors.bgRoot}]}>
        <Text style={{color:colors.textPrimary}}>{t("loading")}</Text>
      </View>
    );
  const save = async () => {
    if (!Number.isFinite(km) || km <= 0) {
      Alert.alert(t("invalidDistance"));
      return;
    }
    if (!Number.isFinite(seconds) || seconds <= 0) {
      Alert.alert(t("invalidDuration"), t("invalidDurationHelp"));
      return;
    }
    const num = (v: string) => (v.trim() ? Number(v) : null);
    const a = num(avgHr),
      m = num(maxHr),
      e = num(elevation);
    if ([a, m, e].some((v) => v != null && !Number.isFinite(v))) {
      Alert.alert(t("invalidData"));
      return;
    }
    await saveManualActivity(db, {
      workoutId: w.id,
      startTime: `${w.date}T12:00:00`,
      distanceKm: km,
      durationSeconds: seconds,
      avgHeartRate: a,
      maxHeartRate: m,
      elevationGain: e,
      feeling,
      notes: notes.trim() || null,
    });
    refresh();
    router.back();
  };
  const remove = () =>
    Alert.alert(t("deleteRunResult"), t("deleteRunResultMessage"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          await deleteManualActivityForWorkout(db, w.id);
          refresh();
          router.back();
        },
      },
    ]);
  return (
    <ScrollView
      style={[s.root,{backgroundColor:colors.bgRoot}]}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()}>
        <Text style={[s.back,{color:colors.textPrimary}]}>{t("back")}</Text>
      </Pressable>
      <Text style={[s.title,{color:colors.textPrimary}]}>
        {existing ? t("editResultTitle") : t("completeWorkoutTitle")}
      </Text>
      <Text style={[s.sub,{color:colors.textSecondary}]}>
        {w.type.replace("_", " ")} ·{" "}
        {language === "vi" ? "kế hoạch" : "planned"} {w.distanceKm} km ·{" "}
        {w.date}
      </Text>

      <View style={[s.card,{backgroundColor:colors.bgCard,borderColor:colors.bgCardBorder}]}>
        <Text style={[s.label,{color:colors.textLabel}]}>{t("actualDistance")}</Text>
        <TextInput
          style={[s.input,{backgroundColor:colors.bgCard,borderColor:colors.bgCardBorder,color:colors.textPrimary}]}
          value={distance}
          onChangeText={setDistance}
          keyboardType="decimal-pad"
          placeholder="10.2"
        />
        <Text style={[s.label,{color:colors.textLabel}]}>{t("duration")}</Text>
        <DurationPicker
          value={Number.isFinite(seconds) ? seconds : 0}
          onChange={(v) => setDuration(formatDuration(v))}
        />
        <View style={s.paceBox}>
          <Text style={s.paceLabel}>{t("calculatedPace")}</Text>
          <Text style={s.paceValue}>{computedPace}</Text>
        </View>
      </View>

      <View style={[s.card,{backgroundColor:colors.bgCard,borderColor:colors.bgCardBorder}]}>
        <View style={s.row}>
          <View style={s.half}>
            <Text style={[s.label,{color:colors.textLabel}]}>AVG HR</Text>
            <TextInput
              style={[s.input,{backgroundColor:colors.bgCard,borderColor:colors.bgCardBorder,color:colors.textPrimary}]}
              value={avgHr}
              onChangeText={setAvgHr}
              keyboardType="number-pad"
              placeholder="158"
            />
          </View>
          <View style={s.half}>
            <Text style={[s.label,{color:colors.textLabel}]}>MAX HR</Text>
            <TextInput
              style={[s.input,{backgroundColor:colors.bgCard,borderColor:colors.bgCardBorder,color:colors.textPrimary}]}
              value={maxHr}
              onChangeText={setMaxHr}
              keyboardType="number-pad"
              placeholder="171"
            />
          </View>
        </View>
        <Text style={[s.label,{color:colors.textLabel}]}>Elevation (m)</Text>
        <TextInput
          style={[s.input,{backgroundColor:colors.bgCard,borderColor:colors.bgCardBorder,color:colors.textPrimary}]}
          value={elevation}
          onChangeText={setElevation}
          keyboardType="decimal-pad"
          placeholder="85"
        />
      </View>

      <View style={[s.card,{backgroundColor:colors.bgCard,borderColor:colors.bgCardBorder}]}>
        <View style={s.sectionHeader}>
          <Text style={[s.labelNoGap,{color:colors.textLabel}]}>{t("feeling")}</Text>
          <View style={s.sectionIcon}>
            <Ionicons name="heart-outline" size={16} color="#F04438" />
          </View>
        </View>
        <View style={s.feelings}>
          {FEELINGS.map((f) => (
            <Pressable
              key={f.value}
              style={[
                s.feel,
                {backgroundColor:colors.bgCard,borderColor:colors.bgCardBorder},
                feeling === f.value && {
                  borderColor: f.color,
                  backgroundColor: colors.rowIconBg,
                },
              ]}
              onPress={() => setFeeling(f.value)}
            >
              <View
                style={[
                  s.feelIconWrap,
                  {
                    backgroundColor:
                      feeling === f.value ? `${f.color}18` : colors.rowIconBg,
                  },
                ]}
              >
                <Ionicons name={f.icon} size={20} color={f.color} />
              </View>
              <Text
                style={[
                  s.feelText,
                  {color:colors.textPrimary},
                ]}
              >
                {language === "vi" ? f.vi : f.en}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[s.card,{backgroundColor:colors.bgCard,borderColor:colors.bgCardBorder}]}>
        <Text style={[s.labelNoGap,{color:colors.textLabel}]}>{t("notes")}</Text>
        <TextInput
          style={[s.input, s.textarea,{backgroundColor:colors.bgCard,borderColor:colors.bgCardBorder,color:colors.textPrimary}]}
          value={notes}
          onChangeText={setNotes}
          multiline
          textAlignVertical="top"
          placeholder={t("notesPlaceholder")}
        />
      </View>
      <Pressable style={s.save} onPress={save}>
        <Text style={s.saveText}>
          {existing ? t("saveResult") : t("completeAndSave")}
        </Text>
      </Pressable>
      {existing?.source === "MANUAL" && (
        <Pressable style={s.delete} onPress={remove}>
          <Text style={s.deleteText}>{t("deleteManualResult")}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FA" },
  content: { padding: 22, paddingTop: 58, paddingBottom: 48 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  back: { fontSize: 17, fontWeight: "800" },
  title: { fontSize: 32, fontWeight: "900", marginTop: 24 },
  sub: { fontSize: 15, color: "#667085", marginTop: 6 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EAECF0",
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FEE4E2",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#667085",
    marginTop: 12,
    marginBottom: 7,
  },
  labelNoGap: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#667085",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
  },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  paceBox: {
    backgroundColor: "#101828",
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
  },
  paceLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#98A2B3",
    letterSpacing: 1,
  },
  paceValue: { fontSize: 28, fontWeight: "900", color: "#fff", marginTop: 4 },
  feelings: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  feel: {
    width: "48%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  feelIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  feelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475467",
    flexShrink: 1,
  },
  textarea: { height: 100, marginTop: 8 },
  save: {
    backgroundColor: "#12B76A",
    borderRadius: 16,
    padding: 17,
    alignItems: "center",
    marginTop: 28,
  },
  saveText: { color: "#fff", fontWeight: "900" },
  delete: { padding: 16, alignItems: "center", marginTop: 8 },
  deleteText: { color: "#D92D20", fontWeight: "800" },
});
