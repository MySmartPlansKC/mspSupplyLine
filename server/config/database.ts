import mysql, {
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';
import { isRetryableConnectionError } from '../src/utilities/dbConnectionErrors';

type QueryParam = string | number | boolean | Date | null | Buffer;

type QueryParams = QueryParam | QueryParam[];

interface SaturnDbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

let supplylinePool: Pool | undefined;
let saturnPool: Pool | undefined;

function trimEnv(value: string | undefined): string {
  return value?.trim() ?? '';
}

function readSupplylineDbConfig() {
  return {
    host: trimEnv(process.env.MARIA_DB_HOST) || 'localhost',
    port: Number(process.env.MARIA_DB_PORT ?? 3306),
    user: trimEnv(process.env.MARIA_DB_USER),
    password: String(process.env.MARIA_DB_PASSWORD ?? ''),
    database: trimEnv(process.env.MARIA_DB_NAME),
  };
}

function readSaturnDbConfig(): SaturnDbConfig | null {
  const host =
    trimEnv(process.env.SATURN_DB_HOST) ||
    trimEnv(process.env.MARIA_DB_HOST) ||
    'localhost';
  const user = trimEnv(process.env.SATURN_DB_USER);
  const password = process.env.SATURN_DB_PASSWORD;
  const database = trimEnv(process.env.SATURN_DB_NAME);

  if (!user || password === undefined || !database) {
    return null;
  }

  const port = Number(
    process.env.SATURN_DB_PORT ?? process.env.MARIA_DB_PORT ?? 3306
  );
  if (!Number.isFinite(port) || port <= 0) {
    return null;
  }

  return {
    host,
    port,
    user,
    password: String(password),
    database,
  };
}

export function isSaturnPoolConfigured(): boolean {
  return readSaturnDbConfig() !== null;
}

function createSupplylinePool(): Pool {
  const config = readSupplylineDbConfig();

  return mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_LIMIT ?? 10),
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS ?? 5_000),
    idleTimeout: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 60_000),
    maxIdle: Number(process.env.DB_POOL_MAX_IDLE ?? 5),
    enableKeepAlive: true,
    keepAliveInitialDelay: Number(process.env.DB_KEEPALIVE_DELAY_MS ?? 10_000),
    timezone: '+00:00',
    charset: 'utf8mb4',
  });
}

export function initSupplylinePool(): Pool {
  if (!supplylinePool) {
    supplylinePool = createSupplylinePool();
  }
  return supplylinePool;
}

export function getSupplylinePool(): Pool {
  if (!supplylinePool) {
    return initSupplylinePool();
  }
  return supplylinePool;
}

export function initSaturnPool(): Pool {
  if (saturnPool) {
    return saturnPool;
  }

  const config = readSaturnDbConfig();
  if (!config) {
    throw new Error(
      'Saturn read pool is not configured. Set SATURN_DB_USER, SATURN_DB_PASSWORD, and SATURN_DB_NAME (SATURN_DB_HOST optional — defaults to MARIA_DB_HOST).'
    );
  }

  saturnPool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: Number(process.env.SATURN_DB_POOL_LIMIT ?? 5),
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS ?? 5_000),
    enableKeepAlive: true,
    keepAliveInitialDelay: Number(process.env.DB_KEEPALIVE_DELAY_MS ?? 10_000),
    timezone: '+00:00',
    charset: 'utf8mb4',
  });

  return saturnPool;
}

export function getSaturnPool(): Pool {
  if (!saturnPool) {
    return initSaturnPool();
  }
  return saturnPool;
}

export async function warmSupplylinePool(): Promise<void> {
  try {
    await query('SELECT 1');
    console.log('[database] SupplyLine pool ready');
  } catch (error) {
    console.warn('[database] SupplyLine pool warmup failed:', error);
  }
}

async function runWithPool<T>(operation: (pool: Pool) => Promise<T>): Promise<T> {
  const pool = getSupplylinePool();

  try {
    return await operation(pool);
  } catch (error) {
    if (!isRetryableConnectionError(error)) {
      throw error;
    }
    return operation(pool);
  }
}

export async function query<T extends RowDataPacket[]>(
  sql: string,
  params?: QueryParams
): Promise<T> {
  return runWithPool(async (pool) => {
    const [rows] = await pool.execute<T>(sql, params);
    return rows;
  });
}

export async function execute(
  sql: string,
  params?: QueryParams
): Promise<ResultSetHeader> {
  return runWithPool(async (pool) => {
    const [result] = await pool.execute<ResultSetHeader>(sql, params);
    return result;
  });
}

export async function saturnQuery<T extends RowDataPacket[]>(
  sql: string,
  params?: QueryParams
): Promise<T> {
  const pool = getSaturnPool();
  const [rows] = await pool.execute<T>(sql, params);
  return rows;
}

export async function getConnection(): Promise<PoolConnection> {
  return getSupplylinePool().getConnection();
}

export async function getSaturnConnection(): Promise<PoolConnection> {
  return getSaturnPool().getConnection();
}

export async function closeSupplylinePool(): Promise<void> {
  if (supplylinePool) {
    await supplylinePool.end();
    supplylinePool = undefined;
  }
}

export async function closeSaturnPool(): Promise<void> {
  if (saturnPool) {
    await saturnPool.end();
    saturnPool = undefined;
  }
}
