/**
 * Dev-only seed: client, project, and MspAdmin platform user.
 *
 *   npm run seed:dev
 *
 * Env overrides (optional):
 *   DEV_SEED_PASSWORD
 *   DEV_MSPADMIN_EMAIL
 *   DEV_MSPADMIN_FIRST_NAME
 *   DEV_MSPADMIN_LAST_NAME
 */
import 'dotenv/config';
import { initSupplylinePool, execute, query } from '../../config/database';
import { RowDataPacket } from 'mysql2';
import { UserRole } from '../constants/userRoles';
import { hashPassword } from '../utilities/password';

const CLIENT_ID = '11111111-1111-4111-8111-111111111111';
const MSPADMIN_USER_ID = '22222222-2222-4222-8222-222222222222';

const DEFAULT_EMAIL = 'mspadmin@supplyline.local';
const DEFAULT_PASSWORD = 'SupplyLine123!';
const DEFAULT_FIRST = 'Dev';
const DEFAULT_LAST = 'MspAdmin';

interface CountRow extends RowDataPacket {
  count: number;
}

function envOrDefault(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

async function seedDevUser(): Promise<void> {
  initSupplylinePool();

  const mspAdminEmail = envOrDefault(process.env.DEV_MSPADMIN_EMAIL, DEFAULT_EMAIL);
  const mspAdminFirst = envOrDefault(
    process.env.DEV_MSPADMIN_FIRST_NAME,
    DEFAULT_FIRST
  );
  const mspAdminLast = envOrDefault(
    process.env.DEV_MSPADMIN_LAST_NAME,
    DEFAULT_LAST
  );
  const password = envOrDefault(process.env.DEV_SEED_PASSWORD, DEFAULT_PASSWORD);
  const passwordHash = await hashPassword(password);
  const port = process.env.PORT ?? '3002';

  const existing = await query<CountRow[]>(
    `SELECT COUNT(*) AS count FROM sl_Users WHERE Email = ?`,
    [mspAdminEmail]
  );

  if (existing[0].count > 0) {
    console.log('Dev MspAdmin already exists — skipping seed.');
    console.log(`  MspAdmin: ${mspAdminEmail}`);
    return;
  }

  await execute(
    `INSERT INTO sl_Clients (
       ClientID, ClientName, CountryCode, DefaultLocale, AccountStatus
     ) VALUES (?, ?, 'US', 'en-US', 'Active')`,
    [CLIENT_ID, 'SupplyLine Dev Client']
  );

  const projectResult = await execute(
    `INSERT INTO sl_Projects (
       ClientID, ProjectName, ProjectStatus, ProjectAddress, ProjectCity, ProjectState,
       ProjectZip, CountryCode, ProjectLocale, FundingCompanyName, PurchaseOrderNumber,
       ProjectManagerName, ProjectManagerEmail, ProjectManagerPhone
     ) VALUES (?, ?, 'Active', ?, ?, ?, ?, 'US', 'en-US', ?, ?, ?, ?, ?)`,
    [
      CLIENT_ID,
      'Dev Tower',
      '100 Dev Industrial Pkwy',
      'Kansas City',
      'MO',
      '64108',
      'SupplyLine Dev Client',
      'PO-DEV-001',
      `${mspAdminFirst} ${mspAdminLast}`,
      mspAdminEmail,
      '+18165550000',
    ]
  );

  const projectId = projectResult.insertId;

  await execute(
    `INSERT INTO sl_Users (
       UserID, ClientID, Email, PasswordHash, FirstName, LastName,
       PreferredLocale, Role, IsActive
     ) VALUES (?, ?, ?, ?, ?, ?, 'en-US', ?, 1)`,
    [
      MSPADMIN_USER_ID,
      CLIENT_ID,
      mspAdminEmail,
      passwordHash,
      mspAdminFirst,
      mspAdminLast,
      UserRole.MspAdmin,
    ]
  );

  console.log('Dev seed completed.');
  console.log(`  ClientID:  ${CLIENT_ID}`);
  console.log(`  ProjectID: ${projectId}`);
  console.log(`  Password:  ${password}`);
  console.log('');
  console.log(`  MspAdmin (${UserRole.MspAdmin}): ${mspAdminEmail}`);
  console.log('');
  console.log('Login: POST /api/auth/login');
  console.log(
    `  curl -X POST http://localhost:${port}/api/auth/login -H "Content-Type: application/json" -d "{\\"email\\":\\"${mspAdminEmail}\\",\\"password\\":\\"${password}\\"}"`
  );
}

seedDevUser().catch((error: Error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
