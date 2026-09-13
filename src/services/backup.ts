import type { SQLiteDatabase } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

const BACKUP_SCHEMA_VERSION = 1;
const TABLES = ['training_plans', 'workouts', 'activities', 'app_settings'] as const;
type BackupTable = typeof TABLES[number];

type BackupPayload = {
  app: 'Running Reminder';
  schemaVersion: number;
  exportedAt: string;
  tables: Record<BackupTable, any[]>;
};

function backupFileName() {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('');
  return `running-reminder-backup-${stamp}.json`;
}

export async function createBackupPayload(db: SQLiteDatabase): Promise<BackupPayload> {
  const tables = {} as Record<BackupTable, any[]>;
  // Deliberately sequential: avoids concurrent prepareAsync calls on one Expo SQLite connection.
  for (const table of TABLES) {
    tables[table] = await db.getAllAsync(`SELECT * FROM ${table}`);
  }
  return {
    app: 'Running Reminder',
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
  };
}

export async function backupToICloudDrive(db: SQLiteDatabase) {
  const payload = await createBackupPayload(db);
  const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!base) throw new Error('No writable file directory is available.');
  const uri = `${base}${backupFileName()}`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('The iOS share sheet is not available on this device.');
  await Sharing.shareAsync(uri, {
    UTI: 'public.json',
    mimeType: 'application/json',
    dialogTitle: 'Running Reminder Backup',
  });
  return { uri, exportedAt: payload.exportedAt };
}

function assertBackup(value: unknown): asserts value is BackupPayload {
  const p = value as BackupPayload;
  if (!p || p.app !== 'Running Reminder' || typeof p.schemaVersion !== 'number' || !p.tables) {
    throw new Error('This is not a valid Running Reminder backup file.');
  }
  for (const table of TABLES) {
    if (!Array.isArray(p.tables[table])) throw new Error(`Backup table is missing: ${table}`);
  }
}

async function insertRows(db: SQLiteDatabase, table: BackupTable, rows: any[]) {
  if (!rows.length) return;
  const schema = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  const existingColumns = new Set(schema.map(c => c.name));
  for (const row of rows) {
    const columns = Object.keys(row).filter(c => existingColumns.has(c));
    if (!columns.length) continue;
    const placeholders = columns.map(() => '?').join(',');
    const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;
    await db.runAsync(sql, ...columns.map(c => row[c] ?? null));
  }
}

export async function restoreBackupPayload(db: SQLiteDatabase, payload: BackupPayload) {
  assertBackup(payload);
  await db.withTransactionAsync(async () => {
    // Child tables first so FK relationships stay valid during replacement.
    await db.runAsync('DELETE FROM activities');
    await db.runAsync('DELETE FROM workouts');
    await db.runAsync('DELETE FROM training_plans');
    await db.runAsync('DELETE FROM app_settings');

    await insertRows(db, 'training_plans', payload.tables.training_plans);
    await insertRows(db, 'workouts', payload.tables.workouts);
    await insertRows(db, 'activities', payload.tables.activities);
    await insertRows(db, 'app_settings', payload.tables.app_settings);
  });
}

export async function restoreFromICloudDrive(db: SQLiteDatabase) {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/json', 'public.json'],
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets?.[0]?.uri) return { canceled: true as const };
  const text = await FileSystem.readAsStringAsync(picked.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const payload = JSON.parse(text) as BackupPayload;
  assertBackup(payload);
  await restoreBackupPayload(db, payload);
  return { canceled: false as const, exportedAt: payload.exportedAt };
}
