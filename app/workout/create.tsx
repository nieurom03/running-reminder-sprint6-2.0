import { useEffect, useState } from "react";
import {
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
import { createExtraWorkout, getActivePlan } from "@/db/repository";
import { PacePicker } from "@/components/PacePicker";
import { GlassBackground } from "@/components/Glass";
import { useGlassAlert } from "@/components/GlassAlert";
import { useAppStore } from "@/store/useAppStore";
import { useI18n } from "@/i18n";
import { useTheme } from "@/context/ThemeContext";
import type { TrainingPlan, WorkoutType } from "@/types/models";

const TYPES: WorkoutType[] = [
  "EASY",
  "TEMPO",
  "INTERVAL",
  "LONG_RUN",
  "RECOVERY",
  "WALK",
];

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export default function CreateExtraWorkoutScreen() {
  const db = useSQLiteContext();
  const refresh = useAppStore((s) => s.refresh);
  const { t } = useI18n();
  const { colors } = useTheme();
  const showAlert = useGlassAlert();
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [type, setType] = useState<WorkoutType>("EASY");
  const [distance, setDistance] = useState("");
  const [paceMin, setPaceMin] = useState(450);
  const [paceMax, setPaceMax] = useState(480);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const date = todayIso();

  useEffect(() => {
    getActivePlan(db).then((activePlan) => {
      setPlan(activePlan);
      if (activePlan) {
        setPaceMin(Math.max(1, activePlan.currentPaceSec - 15));
        setPaceMax(activePlan.currentPaceSec + 15);
      }
    });
  }, [db]);

  const save = async () => {
    if (!plan || saving) return;
    const km = Number(distance.replace(",", "."));
    if (!Number.isFinite(km) || km <= 0) {
      showAlert(t("invalidDistance"), t("invalidDistanceHelp"));
      return;
    }

    setSaving(true);
    try {
      const id = await createExtraWorkout(db, {
        planId: plan.id,
        date,
        type,
        distanceKm: km,
        targetPaceMinSec: paceMin,
        targetPaceMaxSec: paceMax,
        description: notes.trim() || null,
      });
      if (!id) {
        showAlert(
          t("workoutAlreadyScheduled"),
          t("workoutAlreadyScheduledHelp"),
        );
        router.back();
        return;
      }
      refresh();
      router.replace(`/workout/result/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const typeLabel = (value: WorkoutType) =>
    value === "EASY"
      ? t("easy")
      : value === "TEMPO"
        ? t("tempo")
        : value === "INTERVAL"
          ? t("interval")
          : value === "LONG_RUN"
            ? t("longRun")
            : value === "RECOVERY"
              ? t("recovery")
              : t("walk");

  return (
    <GlassBackground>
      <ScrollView
        style={s.root}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
      <Pressable onPress={() => router.back()} style={s.backRow}>
        <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        <Text style={[s.back, { color: colors.textPrimary }]}>{t("back")}</Text>
      </Pressable>

      <Text style={[s.title, { color: colors.textPrimary }]}>
        {t("createExtraWorkoutTitle")}
      </Text>
      <Text style={[s.sub, { color: colors.textSecondary }]}>
        {t("createExtraWorkoutSub")}
      </Text>

      <View
        style={[
          s.dateCard,
          { backgroundColor: colors.bgCard, borderColor: colors.bgCardBorder },
        ]}
      >
        <View style={[s.dateIcon, { backgroundColor: colors.rowIconBg }]}>
          <Ionicons name="calendar-outline" size={20} color={colors.accent} />
        </View>
        <View>
          <Text style={[s.dateLabel, { color: colors.textLabel }]}>
            {t("date")}
          </Text>
          <Text style={[s.dateValue, { color: colors.textPrimary }]}>{date}</Text>
        </View>
      </View>

      <Text style={[s.label, { color: colors.textLabel }]}>{t("workoutType")}</Text>
      <View style={s.chips}>
        {TYPES.map((value) => (
          <Pressable
            key={value}
            onPress={() => setType(value)}
            style={[
              s.chip,
              { backgroundColor: colors.bgCard, borderColor: colors.bgCardBorder },
              type === value && s.chipActive,
            ]}
          >
            <Text
              style={[
                s.chipText,
                { color: colors.textPrimary },
                type === value && s.chipTextActive,
              ]}
            >
              {typeLabel(value)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[s.label, { color: colors.textLabel }]}>{t("distance")} (KM)</Text>
      <TextInput
        style={[
          s.input,
          {
            backgroundColor: colors.bgCard,
            borderColor: colors.bgCardBorder,
            color: colors.textPrimary,
          },
        ]}
        value={distance}
        onChangeText={setDistance}
        keyboardType="decimal-pad"
        placeholder="5.0"
        placeholderTextColor={colors.textMuted}
      />

      <View style={s.row}>
        <View style={s.half}>
          <Text style={[s.label, { color: colors.textLabel }]}>{t("paceFrom")}</Text>
          <PacePicker value={paceMin} onChange={setPaceMin} compact />
        </View>
        <View style={s.half}>
          <Text style={[s.label, { color: colors.textLabel }]}>{t("paceTo")}</Text>
          <PacePicker value={paceMax} onChange={setPaceMax} compact />
        </View>
      </View>

      <Text style={[s.label, { color: colors.textLabel }]}>{t("notes")}</Text>
      <TextInput
        style={[
          s.input,
          s.textarea,
          {
            backgroundColor: colors.bgCard,
            borderColor: colors.bgCardBorder,
            color: colors.textPrimary,
          },
        ]}
        value={notes}
        onChangeText={setNotes}
        multiline
        textAlignVertical="top"
        placeholder={t("notesPlaceholder")}
        placeholderTextColor={colors.textMuted}
      />

      <Pressable
        style={[s.save, { backgroundColor: colors.accent }, saving && s.disabled]}
        onPress={save}
        disabled={saving || !plan}
      >
        <Text style={s.saveText}>{t("saveAndEnterResult")}</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </Pressable>
      </ScrollView>
    </GlassBackground>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 22, paddingTop: 58, paddingBottom: 48 },
  backRow: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start" },
  back: { fontSize: 17, fontWeight: "800" },
  title: { fontSize: 31, fontWeight: "900", marginTop: 24 },
  sub: { fontSize: 15, lineHeight: 22, marginTop: 8 },
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginTop: 22,
  },
  dateIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  dateLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  dateValue: { fontSize: 18, fontWeight: "900", marginTop: 3 },
  label: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 7,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipActive: { backgroundColor: "#101828", borderColor: "#101828" },
  chipText: { fontWeight: "800" },
  chipTextActive: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
  },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  textarea: { height: 110 },
  save: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    padding: 17,
    marginTop: 28,
  },
  saveText: { color: "#fff", fontWeight: "900" },
  disabled: { opacity: 0.5 },
});
