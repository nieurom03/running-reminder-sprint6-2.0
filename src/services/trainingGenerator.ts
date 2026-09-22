import type { PlanInput, WorkoutType } from "@/types/models";

export interface GeneratedWorkout {
  date: string;
  type: WorkoutType;
  distanceKm: number;
  targetPaceMinSec: number | null;
  targetPaceMaxSec: number | null;
  description: string;
}

const DAY_MS = 86400000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

function parseLocalDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function weeksBetween(start: Date, end: Date) {
  return Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (7 * DAY_MS)),
  );
}

function baseLongRun(distance: number) {
  if (distance <= 5) return 4;
  if (distance <= 10) return 7;
  if (distance <= 21.1) return 10;
  return 14;
}

function peakLongRun(distance: number) {
  if (distance <= 5) return 5;
  if (distance <= 10) return 10;
  if (distance <= 21.1) return 19;
  return 32;
}

export function generateTrainingPlan(
  input: PlanInput,
  startDate = new Date(),
): GeneratedWorkout[] {
  const start = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
    12,
  );
  const race = parseLocalDate(input.raceDate);
  if (race <= start) throw new Error("Race date phải lớn hơn ngày hiện tại.");

  const totalWeeks = weeksBetween(start, race);
  const workouts: GeneratedWorkout[] = [];
  const selected = [...input.runningDays].sort((a, b) => a - b);
  const longRunDay = selected.includes(input.longRunDay)
    ? input.longRunDay
    : selected.includes(6)
      ? 6
      : selected[selected.length - 1];
  const qualityDay = selected.find((d) => d !== longRunDay) ?? selected[0];
  const startLong = baseLongRun(input.raceDistanceKm);
  const peakLong = peakLongRun(input.raceDistanceKm);

  for (let week = 0; week < totalWeeks; week++) {
    const weekStart = new Date(start.getTime() + week * 7 * DAY_MS);
    const progress = totalWeeks <= 1 ? 1 : week / (totalWeeks - 1);
    const taper = week >= totalWeeks - 2;
    let longDistance =
      startLong + (peakLong - startLong) * Math.min(1, progress * 1.2);
    if (week > 0 && week % 4 === 3) longDistance *= 0.82; // cutback week
    if (taper) longDistance *= week === totalWeeks - 1 ? 0.55 : 0.75;
    longDistance = Math.round(longDistance * 2) / 2;

    const scheduledDates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart.getTime() + i * DAY_MS);
      if (d >= race) continue;
      if (selected.includes(d.getDay())) scheduledDates.push(d);
    }

    scheduledDates.forEach((d, index) => {
      const day = d.getDay();
      const isLong = day === longRunDay;
      const isQuality = day === qualityDay && !isLong && week > 0;
      let type: WorkoutType = "EASY";
      let distance = clamp(
        Math.round((input.raceDistanceKm * 0.28 + week * 0.15) * 2) / 2,
        4,
        input.raceDistanceKm <= 10 ? 7 : 9,
      );
      let minPace = input.currentPaceSec + 15;
      let maxPace = input.currentPaceSec + 45;
      let description = "Easy run: giữ nhịp thoải mái, có thể nói chuyện.";

      if (isLong) {
        type = "LONG_RUN";
        distance = longDistance;
        minPace = input.currentPaceSec + 20;
        maxPace = input.currentPaceSec + 60;
        description =
          "Long run: ưu tiên hoàn thành cự ly, kiểm soát nhịp tim và tiếp nước.";
      } else if (isQuality) {
        type = week % 2 === 0 ? "TEMPO" : "INTERVAL";
        distance = clamp(Math.round((5 + progress * 3) * 2) / 2, 5, 8);
        if (type === "TEMPO") {
          minPace = Math.max(240, input.currentPaceSec - 20);
          maxPace = input.currentPaceSec + 5;
          description =
            "Tempo: 1–2 km khởi động, phần giữa ở pace kiểm soát, sau đó thả lỏng.";
        } else {
          minPace = Math.max(220, input.currentPaceSec - 35);
          maxPace = input.currentPaceSec - 10;
          description =
            "Interval: khởi động kỹ, chạy các đoạn nhanh ngắn xen kẽ hồi phục.";
        }
      } else if (
        index === scheduledDates.length - 1 &&
        !isLong &&
        selected.length >= 4
      ) {
        type = "RECOVERY";
        distance = clamp(distance - 1.5, 3, 6);
        minPace = input.currentPaceSec + 35;
        maxPace = input.currentPaceSec + 75;
        description = "Recovery: chạy thật nhẹ, mục tiêu phục hồi.";
      }

      workouts.push({
        date: iso(d),
        type,
        distanceKm: distance,
        targetPaceMinSec: minPace,
        targetPaceMaxSec: maxPace,
        description,
      });
    });
  }

  // Add race day as the final workout.
  workouts.push({
    date: input.raceDate,
    type: "LONG_RUN",
    distanceKm: input.raceDistanceKm,
    targetPaceMinSec: Math.round(
      (input.goalTimeMinutes * 60) / input.raceDistanceKm,
    ),
    targetPaceMaxSec:
      Math.round((input.goalTimeMinutes * 60) / input.raceDistanceKm) + 10,
    description: `RACE DAY · mục tiêu ${(() => {
      const sec = Math.round(input.goalTimeMinutes * 60);
      return `${Math.floor(sec / 3600)}:${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
    })()}`,
  });

  return workouts;
}
