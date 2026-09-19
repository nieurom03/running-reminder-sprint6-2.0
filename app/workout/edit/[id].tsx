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
import { deleteWorkout, getWorkout, updateWorkout } from "@/db/repository";
import { useAppStore } from "@/store/useAppStore";
import { DateField } from "@/components/DateField";
import { PacePicker } from "@/components/PacePicker";
import { GlassBackground } from "@/components/Glass";
import { useGlassAlert } from "@/components/GlassAlert";
import { useI18n } from "@/i18n";
import { useTheme } from "@/context/ThemeContext";
import type { Workout, WorkoutType } from "@/types/models";
const TYPES: WorkoutType[] = [
  "EASY",
  "TEMPO",
  "INTERVAL",
  "LONG_RUN",
  "RECOVERY",
  "REST",
];
export default function EditWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const refresh = useAppStore((s) => s.refresh);
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const showAlert = useGlassAlert();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [date, setDate] = useState("");
  const [type, setType] = useState<WorkoutType>("EASY");
  const [distance, setDistance] = useState("");
  const [paceMin, setPaceMin] = useState(450);
  const [paceMax, setPaceMax] = useState(480);
  const [notes, setNotes] = useState("");
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      getWorkout(db, Number(id)).then((w) => {
        setWorkout(w);
        if (!w) return;
        setDate(w.date);
        setType(w.type);
        setDistance(String(w.distanceKm));
        setPaceMin(w.targetPaceMinSec ?? 450);
        setPaceMax(w.targetPaceMaxSec ?? 480);
        setNotes(w.description ?? "");
      });
    }, [db, id]),
  );
  if (!workout)
    return (
      <View style={[s.loading,{backgroundColor:colors.bgRoot}]}>
        <Text style={{color:colors.textPrimary}}>{t("loading")}</Text>
      </View>
    );
  const save = async () => {
    const km = Number(distance.replace(",", "."));
    if (type !== "REST" && (!Number.isFinite(km) || km <= 0)) {
      showAlert(t("invalidDistance"), t("invalidDistanceHelp"));
      return;
    }
    await updateWorkout(db, workout.id, {
      date,
      type,
      distanceKm: type === "REST" ? 0 : km,
      targetPaceMinSec: type === "REST" ? null : paceMin,
      targetPaceMaxSec: type === "REST" ? null : paceMax,
      description: notes.trim() || null,
    });
    refresh();
    router.back();
  };
  const remove = () =>
    showAlert(t("deleteWorkoutTitle"), t("deleteWorkoutMessage"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          await deleteWorkout(db, workout.id);
          refresh();
          router.replace("/(tabs)/plan");
        },
      },
    ]);
  return (
    <GlassBackground>
      <ScrollView
        style={s.root}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
      <Pressable onPress={() => router.back()}>
        <Text style={[s.back,{color:colors.textPrimary}]}>{t("back")}</Text>
      </Pressable>
      <Text style={[s.title,{color:colors.textPrimary}]}>{t("editWorkout")}</Text>
      <Text style={[s.sub,{color:colors.textSecondary}]}>{t("editSub")}</Text>
      <Text style={[s.label,{color:colors.textLabel}]}>{t("date")}</Text>
      <DateField value={date} onChange={setDate} />
      <Text style={[s.label,{color:colors.textLabel}]}>{t("workoutType")}</Text>
      <View style={s.chips}>
        {TYPES.map((x) => (
          <Pressable
            key={x}
            onPress={() => setType(x)}
            style={[s.chip,{backgroundColor:colors.bgCard,borderColor:colors.bgCardBorder}, type === x && s.chipActive]}
          >
            <Text style={[s.chipText,{color:colors.textPrimary}, type === x && s.chipTextActive]}>
              {x === "EASY"
                ? t("easy")
                : x === "TEMPO"
                  ? t("tempo")
                  : x === "INTERVAL"
                    ? t("interval")
                    : x === "LONG_RUN"
                      ? t("longRun")
                      : x === "RECOVERY"
                        ? t("recovery")
                        : t("rest")}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={[s.label,{color:colors.textLabel}]}>{t("distance")} (KM)</Text>
      <TextInput
        style={[s.input,{backgroundColor:colors.bgCard,borderColor:colors.bgCardBorder,color:colors.textPrimary}]}
        value={distance}
        onChangeText={setDistance}
        keyboardType="decimal-pad"
        editable={type !== "REST"}
      />
      {type !== "REST" && (
        <View style={s.row}>
          <View style={s.half}>
            <Text style={[s.label,{color:colors.textLabel}]}>{t("paceFrom")}</Text>
            <PacePicker value={paceMin} onChange={setPaceMin} compact />
          </View>
          <View style={s.half}>
            <Text style={[s.label,{color:colors.textLabel}]}>{t("paceTo")}</Text>
            <PacePicker value={paceMax} onChange={setPaceMax} compact />
          </View>
        </View>
      )}
      <Text style={[s.label,{color:colors.textLabel}]}>{t("notes")}</Text>
      <TextInput
        style={[s.input, s.textarea,{backgroundColor:colors.bgCard,borderColor:colors.bgCardBorder,color:colors.textPrimary}]}
        value={notes}
        onChangeText={setNotes}
        multiline
        textAlignVertical="top"
      />
      <Pressable style={s.save} onPress={save}>
        <Text style={s.saveText}>{t("saveChanges")}</Text>
      </Pressable>
      <Pressable style={s.delete} onPress={remove}>
        <Text style={s.deleteText}>{t("deleteWorkout")}</Text>
      </Pressable>
      </ScrollView>
    </GlassBackground>
  );
}
const s = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 22, paddingTop: 58, paddingBottom: 48 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  back: { fontSize: 17, fontWeight: "800" },
  title: { fontSize: 32, fontWeight: "900", marginTop: 24 },
  sub: {
    color: "#667085",
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#667085",
    marginTop: 18,
    marginBottom: 7,
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
  textarea: { height: 110 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipActive: { backgroundColor: "#101828", borderColor: "#101828" },
  chipText: { fontWeight: "800", color: "#344054" },
  chipTextActive: { color: "#fff" },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  save: {
    backgroundColor: "#101828",
    borderRadius: 16,
    padding: 17,
    alignItems: "center",
    marginTop: 28,
  },
  saveText: { color: "#fff", fontWeight: "900" },
  delete: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginTop: 12,
  },
  deleteText: { color: "#D92D20", fontWeight: "800" },
});
