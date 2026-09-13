export type WorkoutType = 'EASY' | 'TEMPO' | 'INTERVAL' | 'LONG_RUN' | 'RECOVERY' | 'REST';
export type WorkoutStatus = 'PLANNED' | 'COMPLETED' | 'SKIPPED' | 'MISSED';
export type ActivitySource = 'MANUAL' | 'STRAVA' | 'GARMIN' | 'HEALTHKIT';
export type RunFeeling = 'GREAT' | 'GOOD' | 'NORMAL' | 'HARD' | 'VERY_HARD';

export interface TrainingPlan {
  id: number;
  name: string;
  raceDate: string;
  raceDistanceKm: number;
  goalTimeMinutes: number;
  currentPaceSec: number;
  runsPerWeek: number;
  runningDays: number[];
  longRunDay: number;
  reminderHour: number;
  reminderMinute: number;
  createdAt: string;
}

export interface Workout {
  id: number;
  planId: number;
  date: string;
  type: WorkoutType;
  distanceKm: number;
  targetPaceMinSec: number | null;
  targetPaceMaxSec: number | null;
  description: string | null;
  status: WorkoutStatus;
  completedAt: string | null;
}

export interface Activity {
  id: number;
  workoutId: number | null;
  source: ActivitySource;
  externalId: string | null;
  name: string | null;
  sportType: string | null;
  startTime: string;
  distanceKm: number;
  durationSeconds: number;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  elevationGain: number | null;
  feeling: RunFeeling | null;
  notes: string | null;
  rawData: string | null;
}

export interface ManualActivityInput {
  workoutId: number;
  startTime: string;
  distanceKm: number;
  durationSeconds: number;
  avgHeartRate?: number | null;
  maxHeartRate?: number | null;
  elevationGain?: number | null;
  feeling?: RunFeeling | null;
  notes?: string | null;
}

export interface WorkoutEditInput {
  date: string;
  type: WorkoutType;
  distanceKm: number;
  targetPaceMinSec: number | null;
  targetPaceMaxSec: number | null;
  description: string | null;
}

export interface PlanInput {
  raceDistanceKm: number;
  raceDate: string;
  goalTimeMinutes: number;
  currentPaceSec: number;
  runsPerWeek: number;
  runningDays: number[];
  longRunDay: number;
  reminderHour: number;
  reminderMinute: number;
}

export interface TrainingStats {
  totalWorkouts: number;
  completedWorkouts: number;
  completionPct: number;
  plannedKm: number;
  completedKm: number;
}

export interface WeekDayDistance {
  date: string;
  dayLabel: string;
  distanceKm: number;
}

export interface WeeklyRunningSummary {
  startDate: string;
  endDate: string;
  totalKm: number;
  days: WeekDayDistance[];
}
