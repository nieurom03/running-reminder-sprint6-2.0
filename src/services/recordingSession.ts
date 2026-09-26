import type * as Location from "expo-location";
import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import type { AppLanguage } from "@/store/useAppStore";
import type { RecordedRoutePoint } from "@/types/models";

export type RecordingPhase = "recording" | "paused";
export type RecordingSport = "RUN" | "WALK";

type RecordingRow = {
  session_key: string;
  phase: RecordingPhase;
  sport_type: RecordingSport;
  language: AppLanguage;
  plan_id: number;
  workout_id: number | null;
  started_at_ms: number;
  segment_started_at_ms: number | null;
  accumulated_ms: number;
  distance_m: number;
  elevation_gain_m: number;
  last_latitude: number | null;
  last_longitude: number | null;
  last_altitude: number | null;
  last_accuracy: number | null;
  last_timestamp: number | null;
  current_latitude: number | null;
  current_longitude: number | null;
  current_altitude: number | null;
  current_accuracy: number | null;
  current_timestamp: number | null;
  latest_point_id: number;
  updated_at_ms: number;
};

type RecordingPointRow = {
  id: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  timestamp: number;
};

export type RecordingSnapshot = {
  sessionKey: string;
  phase: RecordingPhase;
  sport: RecordingSport;
  language: AppLanguage;
  planId: number;
  workoutId: number | null;
  startedAtMs: number;
  segmentStartedAtMs: number | null;
  accumulatedMs: number;
  elapsedSeconds: number;
  distanceMeters: number;
  elevationGain: number;
  currentLocation: RecordedRoutePoint | null;
  gpsAccuracy: number | null;
  latestPointId: number;
  points: Array<RecordedRoutePoint & { id: number }>;
  updatedAtMs: number;
};

type BeginRecordingInput = {
  sport: RecordingSport;
  language: AppLanguage;
  planId: number;
  workoutId: number | null;
  startedAtMs?: number;
};

const DATABASE_NAME = "active-recording.db";
const EARTH_RADIUS_M = 6_371_000;

let databasePromise: Promise<SQLiteDatabase> | null = null;
let operationQueue: Promise<unknown> = Promise.resolve();

const serialize = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = operationQueue.then(operation, operation);
  operationQueue = result.catch(() => undefined);
  return result;
};

const getDatabase = () => {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync(DATABASE_NAME).then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS recording_session (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          session_key TEXT NOT NULL,
          phase TEXT NOT NULL,
          sport_type TEXT NOT NULL,
          language TEXT NOT NULL,
          plan_id INTEGER NOT NULL,
          workout_id INTEGER,
          started_at_ms REAL NOT NULL,
          segment_started_at_ms REAL,
          accumulated_ms REAL NOT NULL DEFAULT 0,
          distance_m REAL NOT NULL DEFAULT 0,
          elevation_gain_m REAL NOT NULL DEFAULT 0,
          last_latitude REAL,
          last_longitude REAL,
          last_altitude REAL,
          last_accuracy REAL,
          last_timestamp REAL,
          current_latitude REAL,
          current_longitude REAL,
          current_altitude REAL,
          current_accuracy REAL,
          current_timestamp REAL,
          latest_point_id INTEGER NOT NULL DEFAULT 0,
          updated_at_ms REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS recording_points (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_key TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          altitude REAL,
          accuracy REAL,
          timestamp REAL NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_recording_points_session
          ON recording_points(session_key, id);
      `);
      return db;
    });
  }
  return databasePromise;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const distanceBetween = (a: RecordedRoutePoint, b: RecordedRoutePoint) => {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
};

const pointFromLast = (row: RecordingRow): RecordedRoutePoint | null => {
  if (
    row.last_latitude == null ||
    row.last_longitude == null ||
    row.last_timestamp == null
  ) {
    return null;
  }
  return {
    latitude: row.last_latitude,
    longitude: row.last_longitude,
    altitude: row.last_altitude,
    accuracy: row.last_accuracy,
    timestamp: row.last_timestamp,
  };
};

const currentPointFromRow = (
  row: RecordingRow,
): RecordedRoutePoint | null => {
  if (
    row.current_latitude == null ||
    row.current_longitude == null ||
    row.current_timestamp == null
  ) {
    return null;
  }
  return {
    latitude: row.current_latitude,
    longitude: row.current_longitude,
    altitude: row.current_altitude,
    accuracy: row.current_accuracy,
    timestamp: row.current_timestamp,
  };
};

const readSnapshot = async (
  db: SQLiteDatabase,
  afterPointId: number,
): Promise<RecordingSnapshot | null> => {
  const row = await db.getFirstAsync<RecordingRow>(
    "SELECT * FROM recording_session WHERE id = 1",
  );
  if (!row) return null;

  const pointRows = await db.getAllAsync<RecordingPointRow>(
    `SELECT id, latitude, longitude, altitude, accuracy, timestamp
       FROM recording_points
      WHERE session_key = ? AND id > ?
      ORDER BY id`,
    row.session_key,
    afterPointId,
  );
  const activeMs =
    row.phase === "recording" && row.segment_started_at_ms != null
      ? Math.max(0, Date.now() - row.segment_started_at_ms)
      : 0;

  return {
    sessionKey: row.session_key,
    phase: row.phase,
    sport: row.sport_type,
    language: row.language,
    planId: row.plan_id,
    workoutId: row.workout_id,
    startedAtMs: row.started_at_ms,
    segmentStartedAtMs: row.segment_started_at_ms,
    accumulatedMs: row.accumulated_ms,
    elapsedSeconds: Math.floor((row.accumulated_ms + activeMs) / 1000),
    distanceMeters: row.distance_m,
    elevationGain: row.elevation_gain_m,
    currentLocation: currentPointFromRow(row),
    gpsAccuracy: row.current_accuracy,
    latestPointId: row.latest_point_id,
    points: pointRows.map((point) => ({
      id: point.id,
      latitude: point.latitude,
      longitude: point.longitude,
      altitude: point.altitude,
      accuracy: point.accuracy,
      timestamp: point.timestamp,
    })),
    updatedAtMs: row.updated_at_ms,
  };
};

export const beginRecordingSession = (input: BeginRecordingInput) =>
  serialize(async () => {
    const db = await getDatabase();
    const startedAtMs = input.startedAtMs ?? Date.now();
    const sessionKey = `${startedAtMs}-${Math.random().toString(36).slice(2, 10)}`;
    await db.withTransactionAsync(async () => {
      await db.runAsync("DELETE FROM recording_points");
      await db.runAsync("DELETE FROM recording_session");
      await db.runAsync(
        `INSERT INTO recording_session(
          id, session_key, phase, sport_type, language, plan_id, workout_id,
          started_at_ms, segment_started_at_ms, accumulated_ms, distance_m,
          elevation_gain_m, latest_point_id, updated_at_ms
        ) VALUES (1, ?, 'recording', ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?)`,
        sessionKey,
        input.sport,
        input.language,
        input.planId,
        input.workoutId,
        startedAtMs,
        startedAtMs,
        startedAtMs,
      );
    });
    return (await readSnapshot(db, 0))!;
  });

export const pauseRecordingSession = () =>
  serialize(async () => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<RecordingRow>(
      "SELECT * FROM recording_session WHERE id = 1",
    );
    if (!row) return null;
    if (row.phase === "recording") {
      const now = Date.now();
      const activeMs = row.segment_started_at_ms
        ? Math.max(0, now - row.segment_started_at_ms)
        : 0;
      await db.runAsync(
        `UPDATE recording_session
            SET phase = 'paused', segment_started_at_ms = NULL,
                accumulated_ms = ?, updated_at_ms = ?
          WHERE id = 1`,
        row.accumulated_ms + activeMs,
        now,
      );
    }
    return readSnapshot(db, 0);
  });

export const resumeRecordingSession = () =>
  serialize(async () => {
    const db = await getDatabase();
    const now = Date.now();
    const row = await db.getFirstAsync<RecordingRow>(
      "SELECT * FROM recording_session WHERE id = 1",
    );
    if (!row) return null;
    if (row.phase !== "recording") {
      await db.runAsync(
        `UPDATE recording_session
            SET phase = 'recording', segment_started_at_ms = ?, updated_at_ms = ?
          WHERE id = 1`,
        now,
        now,
      );
    }
    return readSnapshot(db, 0);
  });

export const appendRecordingLocations = (
  locations: Location.LocationObject[],
) =>
  serialize(async () => {
    const db = await getDatabase();
    let row = await db.getFirstAsync<RecordingRow>(
      "SELECT * FROM recording_session WHERE id = 1",
    );
    if (!row || row.phase !== "recording" || locations.length === 0) {
      return row ? readSnapshot(db, row.latest_point_id) : null;
    }

    const ordered = [...locations]
      .filter(
        (location) =>
          Number.isFinite(location.coords.latitude) &&
          Number.isFinite(location.coords.longitude) &&
          Number.isFinite(location.timestamp),
      )
      .sort((a, b) => a.timestamp - b.timestamp);
    if (ordered.length === 0) return readSnapshot(db, row.latest_point_id);

    let previous = pointFromLast(row);
    let distanceMeters = row.distance_m;
    let elevationGain = row.elevation_gain_m;
    let latestPointId = row.latest_point_id;
    let current: RecordedRoutePoint | null = null;

    await db.withTransactionAsync(async () => {
      for (const location of ordered) {
        const point: RecordedRoutePoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          altitude: location.coords.altitude,
          accuracy: location.coords.accuracy,
          timestamp: location.timestamp,
        };
        current = point;

        if (
          (point.accuracy != null && point.accuracy > 45) ||
          (previous != null && point.timestamp <= previous.timestamp)
        ) {
          continue;
        }

        if (previous) {
          const deltaSeconds = Math.max(
            0.25,
            (point.timestamp - previous.timestamp) / 1000,
          );
          const segmentMeters = distanceBetween(previous, point);
          const maxSpeed = row!.sport_type === "WALK" ? 4.5 : 12;
          if (
            segmentMeters < 2 ||
            segmentMeters > 120 ||
            segmentMeters / deltaSeconds > maxSpeed
          ) {
            continue;
          }
          distanceMeters += segmentMeters;

          if (previous.altitude != null && point.altitude != null) {
            const climb = point.altitude - previous.altitude;
            if (climb > 0 && climb < 20) elevationGain += climb;
          }
        }

        const inserted = await db.runAsync(
          `INSERT INTO recording_points(
            session_key, latitude, longitude, altitude, accuracy, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          row!.session_key,
          point.latitude,
          point.longitude,
          point.altitude,
          point.accuracy,
          point.timestamp,
        );
        latestPointId = inserted.lastInsertRowId;
        previous = point;
      }

      const now = Date.now();
      await db.runAsync(
        `UPDATE recording_session SET
          distance_m = ?, elevation_gain_m = ?,
          last_latitude = ?, last_longitude = ?, last_altitude = ?,
          last_accuracy = ?, last_timestamp = ?,
          current_latitude = ?, current_longitude = ?, current_altitude = ?,
          current_accuracy = ?, current_timestamp = ?,
          latest_point_id = ?, updated_at_ms = ?
        WHERE id = 1 AND session_key = ?`,
        distanceMeters,
        elevationGain,
        previous?.latitude ?? null,
        previous?.longitude ?? null,
        previous?.altitude ?? null,
        previous?.accuracy ?? null,
        previous?.timestamp ?? null,
        current?.latitude ?? null,
        current?.longitude ?? null,
        current?.altitude ?? null,
        current?.accuracy ?? null,
        current?.timestamp ?? null,
        latestPointId,
        now,
        row!.session_key,
      );
    });

    row = await db.getFirstAsync<RecordingRow>(
      "SELECT * FROM recording_session WHERE id = 1",
    );
    return row ? readSnapshot(db, row.latest_point_id) : null;
  });

export const getRecordingSnapshot = (afterPointId = 0) =>
  serialize(async () => readSnapshot(await getDatabase(), afterPointId));

export const clearRecordingSession = () =>
  serialize(async () => {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync("DELETE FROM recording_points");
      await db.runAsync("DELETE FROM recording_session");
    });
  });
