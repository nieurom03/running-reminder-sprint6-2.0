import { gcm } from '@noble/ciphers/aes.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';

const BACKUP_SCHEMA_VERSION = 1;
const ENCRYPTED_FORMAT_VERSION = 1;
const PBKDF2_ITERATIONS = 310_000;
const TABLES = ['training_plans', 'workouts', 'activities', 'app_settings'] as const;
type BackupTable = (typeof TABLES)[number];

export type BackupPayload = {
  app: 'Running Reminder';
  schemaVersion: number;
  exportedAt: string;
  tables: Record<BackupTable, any[]>;
};

type EncryptedBackupEnvelope = {
  app: 'Running Reminder';
  format: 'password-encrypted';
  formatVersion: number;
  schemaVersion: number;
  exportedAt: string;
  encryption: {
    algorithm: 'AES-256-GCM';
    kdf: 'PBKDF2-HMAC-SHA256';
    iterations: number;
    salt: string;
    nonce: string;
  };
  ciphertext: string;
};

export type PickedBackupFile = {
  uri: string;
  name: string;
  encrypted: boolean;
  exportedAt: string;
};

export type BackupErrorCode =
  | 'INVALID_FILE'
  | 'PASSWORD_REQUIRED'
  | 'INVALID_PASSWORD';

export class BackupFileError extends Error {
  constructor(public readonly code: BackupErrorCode, message: string) {
    super(message);
    this.name = 'BackupFileError';
  }
}

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array) {
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const hasB = i + 1 < bytes.length;
    const hasC = i + 2 < bytes.length;
    const b = hasB ? bytes[i + 1] : 0;
    const c = hasC ? bytes[i + 2] : 0;
    result += BASE64[a >> 2];
    result += BASE64[((a & 3) << 4) | (b >> 4)];
    result += hasB ? BASE64[((b & 15) << 2) | (c >> 6)] : '=';
    result += hasC ? BASE64[c & 63] : '=';
  }
  return result;
}

function base64ToBytes(value: string) {
  const input = value.replace(/\s/g, '');
  if (!input.length || input.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(input)) {
    throw new BackupFileError('INVALID_FILE', 'The backup contains invalid encoded data.');
  }
  const padding = input.endsWith('==') ? 2 : input.endsWith('=') ? 1 : 0;
  const output = new Uint8Array((input.length / 4) * 3 - padding);
  let offset = 0;
  for (let i = 0; i < input.length; i += 4) {
    const a = BASE64.indexOf(input[i]);
    const b = BASE64.indexOf(input[i + 1]);
    const c = input[i + 2] === '=' ? 0 : BASE64.indexOf(input[i + 2]);
    const d = input[i + 3] === '=' ? 0 : BASE64.indexOf(input[i + 3]);
    if (a < 0 || b < 0 || c < 0 || d < 0) {
      throw new BackupFileError('INVALID_FILE', 'The backup contains invalid encoded data.');
    }
    if (offset < output.length) output[offset++] = (a << 2) | (b >> 4);
    if (offset < output.length) output[offset++] = ((b & 15) << 4) | (c >> 2);
    if (offset < output.length) output[offset++] = ((c & 3) << 6) | d;
  }
  return output;
}

function hexToBytes(value: string, expectedLength: number) {
  if (
    value.length !== expectedLength * 2 ||
    !/^[0-9a-f]+$/i.test(value)
  ) {
    throw new Error('Could not generate encryption parameters.');
  }
  const output = new Uint8Array(expectedLength);
  for (let i = 0; i < output.length; i++) {
    output[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  }
  return output;
}

async function createEncryptionParameters(db: SQLiteDatabase) {
  // Salt and GCM nonce only need to be unique, not secret. SQLite's randomblob
  // uses the already-linked SQLite PRNG, so backup does not require a newly
  // added native module that may be absent from an older development build.
  const values = await db.getFirstAsync<{ salt: string; nonce: string }>(
    'SELECT hex(randomblob(16)) AS salt, hex(randomblob(12)) AS nonce',
  );
  if (!values) throw new Error('Could not generate encryption parameters.');
  return {
    salt: hexToBytes(values.salt, 16),
    nonce: hexToBytes(values.nonce, 12),
  };
}

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
  return `workout-training-backup-${stamp}.rrbackup`;
}

function encryptedMetadata(
  envelope: Pick<
    EncryptedBackupEnvelope,
    'app' | 'format' | 'formatVersion' | 'schemaVersion' | 'exportedAt'
  >,
) {
  return utf8Encoder.encode(
    JSON.stringify({
      app: envelope.app,
      format: envelope.format,
      formatVersion: envelope.formatVersion,
      schemaVersion: envelope.schemaVersion,
      exportedAt: envelope.exportedAt,
    }),
  );
}

function isEncryptedBackup(value: unknown): value is EncryptedBackupEnvelope {
  const envelope = value as Partial<EncryptedBackupEnvelope> | null;
  return Boolean(
    envelope &&
      envelope.app === 'Running Reminder' &&
      envelope.format === 'password-encrypted',
  );
}

function assertEncryptedBackup(value: unknown): asserts value is EncryptedBackupEnvelope {
  if (!isEncryptedBackup(value)) {
    throw new BackupFileError(
      'INVALID_FILE',
      'This is not an encrypted Running Reminder backup.',
    );
  }
  const envelope = value;
  const valid =
    envelope.formatVersion === ENCRYPTED_FORMAT_VERSION &&
    typeof envelope.schemaVersion === 'number' &&
    typeof envelope.exportedAt === 'string' &&
    envelope.encryption?.algorithm === 'AES-256-GCM' &&
    envelope.encryption?.kdf === 'PBKDF2-HMAC-SHA256' &&
    Number.isInteger(envelope.encryption?.iterations) &&
    envelope.encryption.iterations >= 100_000 &&
    envelope.encryption.iterations <= 1_000_000 &&
    typeof envelope.encryption?.salt === 'string' &&
    typeof envelope.encryption?.nonce === 'string' &&
    typeof envelope.ciphertext === 'string';
  if (!valid) {
    throw new BackupFileError(
      'INVALID_FILE',
      'The encrypted backup format is invalid or unsupported.',
    );
  }
}

function assertBackup(value: unknown): asserts value is BackupPayload {
  const payload = value as BackupPayload;
  if (
    !payload ||
    payload.app !== 'Running Reminder' ||
    typeof payload.schemaVersion !== 'number' ||
    !payload.tables
  ) {
    throw new BackupFileError(
      'INVALID_FILE',
      'This is not a valid Running Reminder backup file.',
    );
  }
  for (const table of TABLES) {
    if (!Array.isArray(payload.tables[table])) {
      throw new BackupFileError('INVALID_FILE', `Backup table is missing: ${table}`);
    }
  }
}

async function parseBackupFile(uri: string) {
  let text: string;
  try {
    text = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch {
    throw new BackupFileError(
      'INVALID_FILE',
      'The selected backup file could not be read.',
    );
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new BackupFileError(
      'INVALID_FILE',
      'The selected file is not a valid backup file.',
    );
  }
}

async function encryptPayload(
  payload: BackupPayload,
  password: string,
  salt: Uint8Array,
  nonce: Uint8Array,
) {
  const envelopeBase = {
    app: 'Running Reminder' as const,
    format: 'password-encrypted' as const,
    formatVersion: ENCRYPTED_FORMAT_VERSION,
    schemaVersion: payload.schemaVersion,
    exportedAt: payload.exportedAt,
  };
  const key = await pbkdf2Async(
    sha256,
    utf8Encoder.encode(password.normalize('NFC')),
    salt,
    { c: PBKDF2_ITERATIONS, dkLen: 32, asyncTick: 8 },
  );
  const plaintext = utf8Encoder.encode(JSON.stringify(payload));
  try {
    const ciphertext = gcm(key, nonce, encryptedMetadata(envelopeBase)).encrypt(
      plaintext,
    );
    const envelope: EncryptedBackupEnvelope = {
      ...envelopeBase,
      encryption: {
        algorithm: 'AES-256-GCM',
        kdf: 'PBKDF2-HMAC-SHA256',
        iterations: PBKDF2_ITERATIONS,
        salt: bytesToBase64(salt),
        nonce: bytesToBase64(nonce),
      },
      ciphertext: bytesToBase64(ciphertext),
    };
    return JSON.stringify(envelope, null, 2);
  } finally {
    key.fill(0);
    plaintext.fill(0);
  }
}

async function decryptEnvelope(
  envelope: EncryptedBackupEnvelope,
  password?: string,
) {
  if (!password) {
    throw new BackupFileError(
      'PASSWORD_REQUIRED',
      'A password is required for this backup.',
    );
  }
  const salt = base64ToBytes(envelope.encryption.salt);
  const nonce = base64ToBytes(envelope.encryption.nonce);
  if (salt.length !== 16 || nonce.length !== 12) {
    throw new BackupFileError(
      'INVALID_FILE',
      'The encrypted backup parameters are invalid.',
    );
  }
  const key = await pbkdf2Async(
    sha256,
    utf8Encoder.encode(password.normalize('NFC')),
    salt,
    {
      c: envelope.encryption.iterations,
      dkLen: 32,
      asyncTick: 8,
    },
  );
  let plaintext: Uint8Array | null = null;
  try {
    plaintext = gcm(key, nonce, encryptedMetadata(envelope)).decrypt(
      base64ToBytes(envelope.ciphertext),
    );
  } catch {
    throw new BackupFileError(
      'INVALID_PASSWORD',
      'The password is incorrect or the backup file has been changed.',
    );
  } finally {
    key.fill(0);
  }

  try {
    const payload = JSON.parse(utf8Decoder.decode(plaintext)) as unknown;
    assertBackup(payload);
    return payload;
  } catch (error) {
    if (error instanceof BackupFileError) throw error;
    throw new BackupFileError(
      'INVALID_FILE',
      'The decrypted backup data is invalid.',
    );
  } finally {
    plaintext.fill(0);
  }
}

export async function createBackupPayload(
  db: SQLiteDatabase,
): Promise<BackupPayload> {
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

export async function backupToICloudDrive(
  db: SQLiteDatabase,
  password: string,
) {
  if (password.length < 8) {
    throw new BackupFileError(
      'PASSWORD_REQUIRED',
      'The backup password must contain at least 8 characters.',
    );
  }
  const payload = await createBackupPayload(db);
  const { salt, nonce } = await createEncryptionParameters(db);
  const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!base) throw new Error('No writable file directory is available.');
  const uri = `${base}${backupFileName()}`;
  const encrypted = await encryptPayload(payload, password, salt, nonce);
  await FileSystem.writeAsStringAsync(uri, encrypted, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('The iOS share sheet is not available on this device.');
  }
  await Sharing.shareAsync(uri, {
    UTI: 'public.data',
    mimeType: 'application/octet-stream',
    dialogTitle: 'Workout Training Backup',
  });
  return { uri, exportedAt: payload.exportedAt };
}

export async function pickBackupFile(): Promise<
  { canceled: true } | { canceled: false; file: PickedBackupFile }
> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets?.[0]?.uri) return { canceled: true };
  const asset = picked.assets[0];
  const parsed = await parseBackupFile(asset.uri);
  if (isEncryptedBackup(parsed)) {
    assertEncryptedBackup(parsed);
    return {
      canceled: false,
      file: {
        uri: asset.uri,
        name: asset.name || 'Workout Training backup',
        encrypted: true,
        exportedAt: parsed.exportedAt,
      },
    };
  }
  assertBackup(parsed);
  return {
    canceled: false,
    file: {
      uri: asset.uri,
      name: asset.name || 'Workout Training backup',
      encrypted: false,
      exportedAt: parsed.exportedAt,
    },
  };
}

export async function readBackupPayload(
  file: PickedBackupFile,
  password?: string,
) {
  const parsed = await parseBackupFile(file.uri);
  if (isEncryptedBackup(parsed)) {
    assertEncryptedBackup(parsed);
    return decryptEnvelope(parsed, password);
  }
  assertBackup(parsed);
  return parsed;
}

async function insertRows(
  db: SQLiteDatabase,
  table: BackupTable,
  rows: any[],
) {
  if (!rows.length) return;
  const schema = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${table})`,
  );
  const existingColumns = new Set(schema.map((column) => column.name));
  for (const row of rows) {
    const columns = Object.keys(row).filter((column) =>
      existingColumns.has(column),
    );
    if (!columns.length) continue;
    const placeholders = columns.map(() => '?').join(',');
    const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;
    await db.runAsync(sql, ...columns.map((column) => row[column] ?? null));
  }
}

export async function restoreBackupPayload(
  db: SQLiteDatabase,
  payload: BackupPayload,
) {
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

export async function restoreBackupFile(
  db: SQLiteDatabase,
  file: PickedBackupFile,
  password?: string,
) {
  const payload = await readBackupPayload(file, password);
  await restoreBackupPayload(db, payload);
  return { exportedAt: payload.exportedAt };
}

// Compatibility helper for callers that still want pick-and-restore in one step.
export async function restoreFromICloudDrive(
  db: SQLiteDatabase,
  password?: string,
) {
  const picked = await pickBackupFile();
  if (picked.canceled) return { canceled: true as const };
  const result = await restoreBackupFile(db, picked.file, password);
  return { canceled: false as const, exportedAt: result.exportedAt };
}
