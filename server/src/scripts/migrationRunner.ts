import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import mysql, { Connection, RowDataPacket } from 'mysql2/promise';
import 'dotenv/config';

const MIGRATIONS_DIR = path.join(__dirname, '../../database/migrations');
const MIGRATION_TABLE = 'sl_SchemaMigrations';

interface AppliedMigrationRow extends RowDataPacket {
  MigrationName: string;
  Checksum: string;
  AppliedAt: Date;
}

export interface MigrationFile {
  name: string;
  absolutePath: string;
  checksum: string;
}

export interface MigrationStatus {
  name: string;
  checksum: string;
  applied: boolean;
  appliedAt: Date | null;
  checksumMatch: boolean | null;
}

function createDbConfig(): mysql.ConnectionOptions {
  return {
    host: process.env.MARIA_DB_HOST ?? 'localhost',
    port: Number(process.env.MARIA_DB_PORT ?? 3306),
    user: process.env.MARIA_DB_USER,
    password: process.env.MARIA_DB_PASSWORD,
    database: process.env.MARIA_DB_NAME,
    multipleStatements: true,
    charset: 'utf8mb4',
  };
}

function checksumForContent(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function assertSafeMigrationFileName(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) {
    throw new Error('Migration filename is required.');
  }
  if (
    trimmed.includes('..') ||
    trimmed.includes('/') ||
    trimmed.includes('\\')
  ) {
    throw new Error(
      'Use only a migration filename (no paths). Example: 001_init_supplyline.sql'
    );
  }
  if (!trimmed.endsWith('.sql')) {
    throw new Error('Migration file must end with .sql');
  }
  return trimmed;
}

export function listMigrationFiles(): MigrationFile[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const absolutePath = path.join(MIGRATIONS_DIR, name);
      const content = fs.readFileSync(absolutePath, 'utf8');
      return {
        name,
        absolutePath,
        checksum: checksumForContent(content),
      };
    });
}

export function resolveMigrationFile(fileName: string): MigrationFile {
  const safeName = assertSafeMigrationFileName(fileName);
  const absolutePath = path.join(MIGRATIONS_DIR, safeName);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Migration file not found: ${absolutePath}`);
  }
  const content = fs.readFileSync(absolutePath, 'utf8');
  return {
    name: safeName,
    absolutePath,
    checksum: checksumForContent(content),
  };
}

async function ensureMigrationTable(connection: Connection): Promise<void> {
  await connection.query("SET time_zone = '+00:00'");
  await connection.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      MigrationName VARCHAR(255) NOT NULL PRIMARY KEY,
      Checksum CHAR(64) NOT NULL,
      AppliedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_applied_at (AppliedAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function getAppliedMigrations(
  connection: Connection
): Promise<Map<string, AppliedMigrationRow>> {
  const [rows] = await connection.query<AppliedMigrationRow[]>(
    `SELECT MigrationName, Checksum, AppliedAt FROM ${MIGRATION_TABLE} ORDER BY MigrationName`
  );
  return new Map(rows.map((row) => [row.MigrationName, row]));
}

export async function getMigrationStatus(): Promise<MigrationStatus[]> {
  const connection = await mysql.createConnection(createDbConfig());
  try {
    await ensureMigrationTable(connection);
    const applied = await getAppliedMigrations(connection);
    const files = listMigrationFiles();

    return files.map((file) => {
      const record = applied.get(file.name);
      if (!record) {
        return {
          name: file.name,
          checksum: file.checksum,
          applied: false,
          appliedAt: null,
          checksumMatch: null,
        };
      }
      return {
        name: file.name,
        checksum: file.checksum,
        applied: true,
        appliedAt: record.AppliedAt,
        checksumMatch: record.Checksum === file.checksum,
      };
    });
  } finally {
    await connection.end();
  }
}

async function recordMigration(
  connection: Connection,
  migration: MigrationFile
): Promise<void> {
  await connection.execute(
    `INSERT INTO ${MIGRATION_TABLE} (MigrationName, Checksum) VALUES (?, ?)`,
    [migration.name, migration.checksum]
  );
}

async function runMigrationOnConnection(
  connection: Connection,
  migration: MigrationFile,
  options: { force?: boolean }
): Promise<'applied' | 'skipped'> {
  const applied = await getAppliedMigrations(connection);
  const existing = applied.get(migration.name);

  if (existing) {
    if (existing.Checksum !== migration.checksum && !options.force) {
      throw new Error(
        `Migration "${migration.name}" was already applied with a different checksum. ` +
          'The file on disk has changed. Restore the original file or resolve manually before re-running.'
      );
    }
    if (existing.Checksum === migration.checksum) {
      console.log(`   ⏭️  ${migration.name} (already applied)`);
      return 'skipped';
    }
  }

  const sql = fs.readFileSync(migration.absolutePath, 'utf8').trim();
  if (!sql) {
    throw new Error(`Migration file is empty: ${migration.name}`);
  }

  console.log(`   ▶️  ${migration.name}`);
  const started = Date.now();
  await connection.query(sql);
  const elapsed = Date.now() - started;

  if (!existing) {
    await recordMigration(connection, migration);
  } else if (options.force && existing.Checksum !== migration.checksum) {
    await connection.execute(
      `UPDATE ${MIGRATION_TABLE} SET Checksum = ?, AppliedAt = CURRENT_TIMESTAMP WHERE MigrationName = ?`,
      [migration.checksum, migration.name]
    );
  }

  console.log(`   ✅ ${migration.name} (${elapsed}ms)`);
  return 'applied';
}

export async function runPendingMigrations(): Promise<void> {
  const connection = await mysql.createConnection(createDbConfig());
  try {
    console.log('Connecting to database...');
    await ensureMigrationTable(connection);
    console.log(`Database: ${process.env.MARIA_DB_NAME}`);
    console.log('Running pending migrations...\n');

    const status = await getMigrationStatus();
    const pending = status.filter((m) => !m.applied);
    const mismatched = status.filter((m) => m.applied && m.checksumMatch === false);

    if (mismatched.length > 0) {
      throw new Error(
        `Checksum mismatch for applied migration(s): ${mismatched.map((m) => m.name).join(', ')}`
      );
    }

    if (pending.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    let applied = 0;
    for (const item of pending) {
      const file = resolveMigrationFile(item.name);
      const result = await runMigrationOnConnection(connection, file, {});
      if (result === 'applied') applied++;
    }

    console.log(`\nDone. ${applied} migration(s) applied.`);
  } finally {
    await connection.end();
  }
}

export async function runSingleMigration(
  fileName: string,
  options: { force?: boolean } = {}
): Promise<void> {
  const migration = resolveMigrationFile(fileName);
  const connection = await mysql.createConnection(createDbConfig());
  try {
    console.log('Connecting to database...');
    await ensureMigrationTable(connection);
    console.log(`Database: ${process.env.MARIA_DB_NAME}\n`);
    await runMigrationOnConnection(connection, migration, options);
    console.log('\nDone.');
  } finally {
    await connection.end();
  }
}

export function printMigrationStatus(status: MigrationStatus[]): void {
  if (status.length === 0) {
    console.log('No migration files found.');
    return;
  }

  const nameWidth = Math.max(
    ...status.map((m) => m.name.length),
    'Migration'.length
  );

  console.log(
    `${'Migration'.padEnd(nameWidth)}  Status     Applied At (UTC)       Checksum`
  );
  console.log(`${'-'.repeat(nameWidth)}  ---------  ---------------------  --------`);

  for (const m of status) {
    let statusLabel: string;
    if (!m.applied) {
      statusLabel = 'PENDING';
    } else if (m.checksumMatch === false) {
      statusLabel = 'MISMATCH';
    } else {
      statusLabel = 'APPLIED';
    }

    const appliedAt = m.appliedAt
      ? m.appliedAt.toISOString().replace('T', ' ').slice(0, 19)
      : '—';
    const checksumFlag =
      m.applied && m.checksumMatch === false ? 'CHANGED' : m.applied ? 'ok' : '—';

    console.log(
      `${m.name.padEnd(nameWidth)}  ${statusLabel.padEnd(9)}  ${appliedAt.padEnd(21)}  ${checksumFlag}`
    );
  }

  const pending = status.filter((m) => !m.applied).length;
  const mismatch = status.filter((m) => m.checksumMatch === false).length;
  console.log(`\n${status.length} file(s), ${pending} pending, ${mismatch} checksum mismatch(es).`);
}
