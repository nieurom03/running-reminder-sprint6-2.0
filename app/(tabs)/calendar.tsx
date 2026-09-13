import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { getWorkouts } from "@/db/repository";
import { useAppStore } from "@/store/useAppStore";
import { statusTheme } from "@/components/WorkoutCard";
import { AppHeader } from "@/components/AppHeader";
import { GlassBackground, GlassCard } from "@/components/Glass";
import { useI18n } from "@/i18n";
import type { Workout } from "@/types/models";
const monthsEn = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const monthsVi = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];
export default function CalendarScreen() {
  const db = useSQLiteContext();
  const key = useAppStore((s) => s.refreshKey);
  const { t, language } = useI18n();
  const [rows, setRows] = useState<Workout[]>([]);
  const first =
    rows.find((w) => w.date >= new Date().toISOString().slice(0, 10)) ??
    rows[0];
  const initial = first ? new Date(`${first.date}T12:00:00`) : new Date();
  const [cursor, setCursor] = useState(
    new Date(initial.getFullYear(), initial.getMonth(), 1, 12),
  );
  useEffect(() => {
    getWorkouts(db).then(setRows);
  }, [db, key]);
  useEffect(() => {
    if (first && rows.length) {
      const d = new Date(`${first.date}T12:00:00`);
      setCursor(new Date(d.getFullYear(), d.getMonth(), 1, 12));
    }
  }, [rows.length]);
  const items = useMemo(
    () =>
      rows.filter((w) => {
        const d = new Date(`${w.date}T12:00:00`);
        return (
          d.getFullYear() === cursor.getFullYear() &&
          d.getMonth() === cursor.getMonth()
        );
      }),
    [rows, cursor],
  );
  const byDay = useMemo(() => {
    const m = new Map<number, Workout[]>();
    items.forEach((w) => {
      const d = Number(w.date.slice(-2));
      m.set(d, [...(m.get(d) ?? []), w]);
    });
    return m;
  }, [items]);
  const firstDay =
    (new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay() + 6) % 7;
  const days = new Date(
    cursor.getFullYear(),
    cursor.getMonth() + 1,
    0,
  ).getDate();
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  const move = (n: number) =>
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1, 12));
  const months = language === "vi" ? monthsVi : monthsEn;
  const weekdays =
    language === "vi"
      ? ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
      : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <GlassBackground>
      <AppHeader title={t("calendar")} />
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={s.calendar}>
          <View style={s.head}>
            <Pressable style={s.navBtn} onPress={() => move(-1)}>
              <Ionicons name="chevron-back" size={19} color="#315B47" />
            </Pressable>
            <Text style={s.title}>
              {months[cursor.getMonth()]} {cursor.getFullYear()}
            </Text>
            <Pressable style={s.navBtn} onPress={() => move(1)}>
              <Ionicons name="chevron-forward" size={19} color="#315B47" />
            </Pressable>
          </View>
          <View style={s.week}>
            {weekdays.map((x) => (
              <Text key={x} style={s.weekTxt}>
                {x}
              </Text>
            ))}
          </View>
          <View style={s.grid}>
            {cells.map((d, i) => {
              const ws = d ? (byDay.get(d) ?? []) : [];
              return (
                <Pressable
                  key={i}
                  style={[s.cell, ws.length > 0 && s.activeCell]}
                  disabled={!ws.length}
                  onPress={() => ws[0] && router.push(`/workout/${ws[0].id}`)}
                >
                  {d && (
                    <>
                      <Text style={s.day}>{d}</Text>
                      <View style={s.dots}>
                        {ws.slice(0, 3).map((w) => {
                          const th =
                            statusTheme[w.status] ?? statusTheme.PLANNED;
                          return (
                            <View
                              key={w.id}
                              style={[s.dot, { backgroundColor: th.text }]}
                            />
                          );
                        })}
                      </View>
                      {ws[0] && (
                        <Text numberOfLines={1} style={s.km}>
                          {ws[0].distanceKm} km
                        </Text>
                      )}
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
        </GlassCard>
        <View style={s.legend}>
          <Legend c="#12B76A" t={t("completed")} />
          <Legend c="#F79009" t={t("skipped")} />
          <Legend c="#F04438" t={t("missed")} />
        </View>
        <Text style={s.hint}>
          {items.length} {t("workoutsInMonth")}
        </Text>
      </ScrollView>
    </GlassBackground>
  );
}
function Legend({ c, t }: { c: string; t: string }) {
  return (
    <View style={s.legendItem}>
      <View style={[s.ldot, { backgroundColor: c }]} />
      <Text style={s.legendText}>{t}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 5, paddingBottom: 112 },
  calendar: { padding: 14 },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { fontSize: 21, fontWeight: "900", color: "#183128" },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(238,250,244,.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  week: { flexDirection: "row", marginBottom: 6 },
  weekTxt: {
    width: "14.285%",
    textAlign: "center",
    fontWeight: "800",
    color: "#6B8176",
    fontSize: 10,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: "14.285%",
    height: 72,
    padding: 5,
    borderRadius: 14,
    marginVertical: 2,
    alignItems: "center",
  },
  activeCell: {
    backgroundColor: "rgba(239,250,244,.76)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.95)",
  },
  day: { fontWeight: "900", fontSize: 12, color: "#29463A" },
  dots: { flexDirection: "row", gap: 2, marginTop: 7 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  km: { fontSize: 8, fontWeight: "800", color: "#6B8176", marginTop: 5 },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 14,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  ldot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: 11, fontWeight: "700", color: "#62796E" },
  hint: { textAlign: "center", color: "#6B8176", fontSize: 12, marginTop: 12 },
});
