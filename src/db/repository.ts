import type { SQLiteDatabase } from 'expo-sqlite';
import type { PlanInput, TrainingPlan, TrainingStats, Workout, WorkoutStatus } from '@/types/models';
import { generateTrainingPlan } from '@/services/trainingGenerator';
import { safePositive } from '@/utils/numbers';

const mapPlan = (r: any): TrainingPlan => ({
  id:r.id, name:r.name, raceDate:r.race_date, raceDistanceKm:r.race_distance_km,
  goalTimeMinutes:r.goal_time_minutes, currentPaceSec:r.current_pace_sec ?? 450,
  runsPerWeek:r.runs_per_week ?? 4, runningDays:JSON.parse(r.running_days ?? '[1,2,4,6]'),
  longRunDay:r.long_run_day ?? 6,
  reminderHour:r.reminder_hour ?? 18, reminderMinute:r.reminder_minute ?? 0, createdAt:r.created_at
});

const mapWorkout = (r: any): Workout => ({
  id: r.id, planId: r.plan_id, date: r.date, type: r.type,
  distanceKm: safePositive(r.distance_km), targetPaceMinSec: r.target_pace_min_sec == null ? null : safePositive(r.target_pace_min_sec),
  targetPaceMaxSec: r.target_pace_max_sec == null ? null : safePositive(r.target_pace_max_sec), description: r.description,
  isExtra: Boolean(r.is_extra),
  status: r.status, completedAt: r.completed_at
});

export async function getActivePlan(db: SQLiteDatabase): Promise<TrainingPlan | null> {
  const r: any = await db.getFirstAsync('SELECT * FROM training_plans ORDER BY id DESC LIMIT 1');
  return r ? mapPlan(r) : null;
}

export async function getWorkouts(db: SQLiteDatabase, planId?: number): Promise<Workout[]> {
  const rows: any[] = planId
    ? await db.getAllAsync('SELECT * FROM workouts WHERE plan_id = ? ORDER BY date ASC', planId)
    : await db.getAllAsync('SELECT * FROM workouts WHERE plan_id = (SELECT id FROM training_plans ORDER BY id DESC LIMIT 1) ORDER BY date ASC');
  return rows.map(mapWorkout);
}

export async function getWorkout(db: SQLiteDatabase, id: number): Promise<Workout | null> {
  const r: any = await db.getFirstAsync('SELECT * FROM workouts WHERE id = ?', id);
  return r ? mapWorkout(r) : null;
}

export async function setWorkoutCompleted(db: SQLiteDatabase, id: number, completed: boolean) {
  await setWorkoutStatus(db, id, completed ? 'COMPLETED' : 'PLANNED');
}

export async function setWorkoutStatus(db: SQLiteDatabase, id: number, status: WorkoutStatus) {
  await db.runAsync(
    'UPDATE workouts SET status = ?, completed_at = ? WHERE id = ?',
    status, status === 'COMPLETED' ? new Date().toISOString() : null, id
  );
}

export async function createGeneratedPlan(db: SQLiteDatabase, input: PlanInput) {
  const workouts = generateTrainingPlan(input);
  const name = `${input.raceDistanceKm <= 5 ? '5K' : input.raceDistanceKm <= 10 ? '10K' : input.raceDistanceKm <= 22 ? '21K' : '42K'} · ${input.raceDate}`;
  let createdId = 0;
  await db.withTransactionAsync(async () => {
    const created = await db.runAsync(
      `INSERT INTO training_plans(name,race_date,race_distance_km,goal_time_minutes,current_pace_sec,runs_per_week,running_days,long_run_day,reminder_hour,reminder_minute)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      name, input.raceDate, input.raceDistanceKm, input.goalTimeMinutes, input.currentPaceSec,
      input.runsPerWeek, JSON.stringify(input.runningDays), input.longRunDay, input.reminderHour, input.reminderMinute
    );
    createdId = Number(created.lastInsertRowId);
    for (const w of workouts) {
      await db.runAsync(
        `INSERT INTO workouts(plan_id,date,type,distance_km,target_pace_min_sec,target_pace_max_sec,description)
         VALUES (?,?,?,?,?,?,?)`,
        createdId, w.date, w.type, w.distanceKm, w.targetPaceMinSec, w.targetPaceMaxSec, w.description
      );
    }
  });
  return createdId;
}

export async function createExtraWorkout(
  db: SQLiteDatabase,
  input: { planId: number; date: string } & import('@/types/models').WorkoutEditInput,
) {
  let createdId: number | null = null;
  await db.withTransactionAsync(async () => {
    const existing = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM workouts
       WHERE plan_id = ? AND date = ? AND type <> 'REST'
       LIMIT 1`,
      input.planId,
      input.date,
    );
    if (existing) return;

    const created = await db.runAsync(
      `INSERT INTO workouts(
        plan_id,date,type,distance_km,target_pace_min_sec,target_pace_max_sec,description,is_extra
       ) VALUES (?,?,?,?,?,?,?,1)`,
      input.planId,
      input.date,
      input.type,
      input.distanceKm,
      input.targetPaceMinSec,
      input.targetPaceMaxSec,
      input.description,
    );
    createdId = Number(created.lastInsertRowId);
  });
  return createdId;
}

export async function deleteActivePlan(db: SQLiteDatabase) {
  const plan = await getActivePlan(db);
  if (plan) await db.runAsync('DELETE FROM training_plans WHERE id = ?', plan.id);
}

export async function getTrainingStats(db: SQLiteDatabase): Promise<TrainingStats> {
  const plan = await getActivePlan(db);
  if (!plan) return {totalWorkouts:0,completedWorkouts:0,completionPct:0,plannedKm:0,completedKm:0};
  const r:any = await db.getFirstAsync(`SELECT COUNT(*) total,
    SUM(CASE WHEN status='COMPLETED' THEN 1 ELSE 0 END) completed,
    COALESCE(SUM(distance_km),0) planned_km,
    COALESCE((SELECT SUM(a.distance_km) FROM activities a JOIN workouts w2 ON w2.id=a.workout_id WHERE w2.plan_id=? AND w2.is_extra=0),0) completed_km
    FROM workouts WHERE plan_id=? AND is_extra=0`, plan.id, plan.id);
  const total = Number(r?.total ?? 0); const completed = Number(r?.completed ?? 0);
  return { totalWorkouts:total, completedWorkouts:completed, completionPct:total ? Math.round(completed/total*100) : 0,
    plannedKm:Number(r?.planned_km ?? 0), completedKm:Number(r?.completed_km ?? 0) };
}

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string) {
  await db.runAsync(
    `INSERT INTO app_settings(key,value) VALUES (?,?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
    key, value
  );
}

export async function deleteSetting(db: SQLiteDatabase, key: string) {
  await db.runAsync('DELETE FROM app_settings WHERE key = ?', key);
}

export async function getWeeklyRunningSummary(db: SQLiteDatabase, planId: number, anchor = new Date()): Promise<import('@/types/models').WeeklyRunningSummary> {
  const local = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  const day = local.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(local);
  start.setDate(local.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const startDate = iso(start);
  const endDate = iso(end);
  const rows = await db.getAllAsync<{ date: string; km: number }>(
    `SELECT substr(a.start_time,1,10) date, COALESCE(SUM(a.distance_km),0) km
     FROM activities a
     INNER JOIN workouts w ON w.id = a.workout_id
     WHERE w.plan_id = ?
       AND substr(a.start_time,1,10) BETWEEN ? AND ?
       AND (a.sport_type IS NULL OR a.sport_type IN ('Run','TrailRun','VirtualRun'))
     GROUP BY substr(a.start_time,1,10)`,
    planId, startDate, endDate
  );
  const byDate = new Map(rows.map(r => [r.date, safePositive(r.km)]));
  const labels = ['T2','T3','T4','T5','T6','T7','CN'];
  const days = Array.from({length:7}, (_,i) => {
    const d = new Date(start); d.setDate(start.getDate()+i); const date=iso(d);
    return { date, dayLabel: labels[i], distanceKm: byDate.get(date) ?? 0 };
  });
  return { startDate, endDate, totalKm: safePositive(days.reduce((n,d)=>n+safePositive(d.distanceKm),0)), days };
}

export async function getRecentActivities(db: SQLiteDatabase, limit = 20): Promise<import('@/types/models').Activity[]> {
  const rows:any[] = await db.getAllAsync('SELECT * FROM activities ORDER BY start_time DESC LIMIT ?', limit);
  return rows.map(r => ({
    id:r.id, workoutId:r.workout_id, source:r.source, externalId:r.external_id,
    name:r.name ?? null, sportType:r.sport_type ?? null, startTime:r.start_time,
    distanceKm:safePositive(r.distance_km), durationSeconds:safePositive(r.duration_seconds),
    avgHeartRate:r.avg_heart_rate == null ? null : Number(r.avg_heart_rate),
    maxHeartRate:r.max_heart_rate == null ? null : Number(r.max_heart_rate),
    elevationGain:r.elevation_gain == null ? null : Number(r.elevation_gain),
    feeling:r.feeling ?? null, notes:r.notes ?? null, rawData:r.raw_data
  }));
}

export async function updateWorkout(db: SQLiteDatabase, id: number, input: import('@/types/models').WorkoutEditInput) {
  await db.runAsync(
    `UPDATE workouts
     SET date = ?, type = ?, distance_km = ?, target_pace_min_sec = ?, target_pace_max_sec = ?, description = ?
     WHERE id = ?`,
    input.date, input.type, input.distanceKm, input.targetPaceMinSec, input.targetPaceMaxSec, input.description, id
  );
}

export async function deleteWorkout(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM workouts WHERE id = ?', id);
}

export async function getActivityForWorkout(db: SQLiteDatabase, workoutId: number): Promise<import('@/types/models').Activity | null> {
  const r: any = await db.getFirstAsync(
    `SELECT * FROM activities WHERE workout_id = ? ORDER BY id DESC LIMIT 1`,
    workoutId
  );
  if (!r) return null;
  return {
    id:r.id, workoutId:r.workout_id, source:r.source, externalId:r.external_id,
    name:r.name ?? null, sportType:r.sport_type ?? null, startTime:r.start_time,
    distanceKm:safePositive(r.distance_km), durationSeconds:safePositive(r.duration_seconds),
    avgHeartRate:r.avg_heart_rate == null ? null : Number(r.avg_heart_rate),
    maxHeartRate:r.max_heart_rate == null ? null : Number(r.max_heart_rate),
    elevationGain:r.elevation_gain == null ? null : Number(r.elevation_gain),
    feeling:r.feeling ?? null, notes:r.notes ?? null, rawData:r.raw_data
  };
}

export async function saveManualActivity(db: SQLiteDatabase, input: import('@/types/models').ManualActivityInput) {
  await db.withTransactionAsync(async () => {
    const existing: any = await db.getFirstAsync(
      `SELECT id FROM activities WHERE workout_id = ? AND source = 'MANUAL' ORDER BY id DESC LIMIT 1`,
      input.workoutId
    );
    if (existing?.id) {
      await db.runAsync(
        `UPDATE activities SET start_time=?, distance_km=?, duration_seconds=?, avg_heart_rate=?, max_heart_rate=?, elevation_gain=?, feeling=?, notes=?, name='Manual run', sport_type='Run'
         WHERE id=?`,
        input.startTime, input.distanceKm, input.durationSeconds, input.avgHeartRate ?? null,
        input.maxHeartRate ?? null, input.elevationGain ?? null, input.feeling ?? null, input.notes ?? null, existing.id
      );
    } else {
      await db.runAsync(
        `INSERT INTO activities(workout_id,source,external_id,name,sport_type,start_time,distance_km,duration_seconds,avg_heart_rate,max_heart_rate,elevation_gain,feeling,notes,raw_data)
         VALUES (?,'MANUAL',NULL,'Manual run','Run',?,?,?,?,?,?,?,?,NULL)`,
        input.workoutId, input.startTime, input.distanceKm, input.durationSeconds, input.avgHeartRate ?? null,
        input.maxHeartRate ?? null, input.elevationGain ?? null, input.feeling ?? null, input.notes ?? null
      );
    }
    await db.runAsync(
      `UPDATE workouts SET status='COMPLETED', completed_at=? WHERE id=?`,
      new Date().toISOString(), input.workoutId
    );
  });
}

export async function deleteManualActivityForWorkout(db: SQLiteDatabase, workoutId: number) {
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM activities WHERE workout_id=? AND source='MANUAL'`, workoutId);
    await db.runAsync(`UPDATE workouts SET status='PLANNED', completed_at=NULL WHERE id=?`, workoutId);
  });
}

export async function markPastPlannedWorkoutsMissed(db: SQLiteDatabase) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  await db.runAsync(
    `UPDATE workouts
     SET status='MISSED', completed_at=NULL
     WHERE status='PLANNED' AND is_extra=0 AND type <> 'REST' AND date < ?`,
    today
  );
}
