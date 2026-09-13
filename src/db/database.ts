import type { SQLiteDatabase } from 'expo-sqlite';

async function addColumnIfMissing(db: SQLiteDatabase, table: string, column: string, definition: string) {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!columns.some(c => c.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export async function migrateDb(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS training_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      race_date TEXT NOT NULL,
      race_distance_km REAL NOT NULL,
      goal_time_minutes INTEGER NOT NULL,
      current_pace_sec INTEGER NOT NULL DEFAULT 450,
      runs_per_week INTEGER NOT NULL DEFAULT 4,
      running_days TEXT NOT NULL DEFAULT '[1,2,4,6]',
      long_run_day INTEGER NOT NULL DEFAULT 6,
      reminder_hour INTEGER NOT NULL DEFAULT 18,
      reminder_minute INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      distance_km REAL NOT NULL DEFAULT 0,
      target_pace_min_sec INTEGER,
      target_pace_max_sec INTEGER,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'PLANNED',
      completed_at TEXT,
      FOREIGN KEY(plan_id) REFERENCES training_plans(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER,
      source TEXT NOT NULL,
      external_id TEXT,
      start_time TEXT NOT NULL,
      distance_km REAL NOT NULL,
      duration_seconds INTEGER NOT NULL,
      avg_heart_rate INTEGER,
      raw_data TEXT,
      FOREIGN KEY(workout_id) REFERENCES workouts(id) ON DELETE SET NULL,
      UNIQUE(source, external_id)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);
    CREATE INDEX IF NOT EXISTS idx_activities_start ON activities(start_time);
    CREATE INDEX IF NOT EXISTS idx_activities_workout ON activities(workout_id);
  `);

  // Upgrade databases created by Sprint 1 without destroying user data.
  await addColumnIfMissing(db, 'training_plans', 'current_pace_sec', 'INTEGER NOT NULL DEFAULT 450');
  await addColumnIfMissing(db, 'training_plans', 'runs_per_week', 'INTEGER NOT NULL DEFAULT 4');
  await addColumnIfMissing(db, 'training_plans', 'running_days', `TEXT NOT NULL DEFAULT '[1,2,4,6]'`);
  await addColumnIfMissing(db, 'training_plans', 'long_run_day', 'INTEGER NOT NULL DEFAULT 6');
  await addColumnIfMissing(db, 'training_plans', 'reminder_hour', 'INTEGER NOT NULL DEFAULT 18');
  await addColumnIfMissing(db, 'training_plans', 'reminder_minute', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing(db, 'activities', 'name', 'TEXT');
  await addColumnIfMissing(db, 'activities', 'sport_type', 'TEXT');
  await addColumnIfMissing(db, 'activities', 'max_heart_rate', 'INTEGER');
  await addColumnIfMissing(db, 'activities', 'elevation_gain', 'REAL');
  await addColumnIfMissing(db, 'activities', 'feeling', 'TEXT');
  await addColumnIfMissing(db, 'activities', 'notes', 'TEXT');

  const plan = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM training_plans');
  if ((plan?.count ?? 0) === 0) await seedDemo(db);
}

async function seedDemo(db: SQLiteDatabase) {
  const created = await db.runAsync(
    `INSERT INTO training_plans(name, race_date, race_distance_km, goal_time_minutes, current_pace_sec, runs_per_week, running_days, long_run_day, reminder_hour, reminder_minute)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    '21K - December 2026', '2026-12-06', 21.1, 165, 450, 4, JSON.stringify([1,2,4,6]), 6, 18, 0
  );
  const planId = created.lastInsertRowId;
  const rows = [
    ['2026-09-07','EASY',5,465,495,'Easy run, giữ nhịp thoải mái'],
    ['2026-09-08','INTERVAL',6,420,450,'Khởi động 2 km, 4 x 400m, thả lỏng'],
    ['2026-09-10','EASY',5,465,495,'Easy run'],
    ['2026-09-12','LONG_RUN',12,470,510,'Long run, ưu tiên hoàn thành cự ly'],
    ['2026-09-14','RECOVERY',4,490,530,'Recovery run'],
    ['2026-09-15','TEMPO',7,435,460,'2 km easy + 3 km tempo + 2 km easy'],
    ['2026-09-17','EASY',5,465,500,'Easy run'],
    ['2026-09-19','LONG_RUN',14,475,515,'Long run']
  ];
  for (const row of rows) {
    await db.runAsync(
      `INSERT INTO workouts(plan_id,date,type,distance_km,target_pace_min_sec,target_pace_max_sec,description)
       VALUES (?,?,?,?,?,?,?)`,
      planId, ...row
    );
  }
}
