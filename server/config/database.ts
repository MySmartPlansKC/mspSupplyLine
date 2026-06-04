import mysql, {
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';

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

function readSaturnDbConfig(): SaturnDbConfig | null {
  // Same VM as SupplyLine: omit SATURN_DB_HOST to use MARIA_DB_HOST (localhost / 127.0.0.1).
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

function attachUtcTimezone(pool: Pool): void {
  pool.on('connection', (connection: PoolConnection) => {
    void connection.query("SET time_zone = '+00:00'");
  });
}

export function initSupplylinePool(): Pool {
  if (!supplylinePool) {
    supplylinePool = mysql.createPool({
      host: process.env.MARIA_DB_HOST ?? 'localhost',
      port: Number(process.env.MARIA_DB_PORT ?? 3306),
      user: process.env.MARIA_DB_USER,
      password: process.env.MARIA_DB_PASSWORD,
      database: process.env.MARIA_DB_NAME,
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_POOL_LIMIT ?? 10),
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      charset: 'utf8mb4',
    });

    attachUtcTimezone(supplylinePool);
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
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    charset: 'utf8mb4',
  });

  attachUtcTimezone(saturnPool);
  return saturnPool;
}

export function getSaturnPool(): Pool {
  if (!saturnPool) {
    return initSaturnPool();
  }
  return saturnPool;
}

export async function query<T extends RowDataPacket[]>(
  sql: string,
  params?: QueryParams
): Promise<T> {
  const pool = getSupplylinePool();
  const [rows] = await pool.execute<T>(sql, params);
  return rows;
}

export async function execute(
  sql: string,
  params?: QueryParams
): Promise<ResultSetHeader> {
  const pool = getSupplylinePool();
  const [result] = await pool.execute<ResultSetHeader>(sql, params);
  return result;
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
  const connection = await getSupplylinePool().getConnection();
  await connection.query("SET time_zone = '+00:00'");
  return connection;
}

export async function getSaturnConnection(): Promise<PoolConnection> {
  const connection = await getSaturnPool().getConnection();
  await connection.query("SET time_zone = '+00:00'");
  return connection;
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
