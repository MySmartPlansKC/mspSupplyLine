/**
 * Dev-only seed: client, project, platform user, client user + project access.
 *
 *   npm run seed:dev
 *
 * Env overrides (optional):
 *   DEV_SEED_PASSWORD
 *   DEV_MSPADMIN_EMAIL
 *   DEV_CLIENT_EMAIL
 */
import 'dotenv/config';
import { initSupplylinePool, execute, query } from '../../config/database';
import { RowDataPacket } from 'mysql2';
import { UserRole } from '../constants/userRoles';
import { hashPassword } from '../utilities/password';

const CLIENT_ID = '11111111-1111-4111-8111-111111111111';
const MSPADMIN_USER_ID = '22222222-2222-4222-8222-222222222222';
const CLIENTADMIN_USER_ID = '33333333-3333-4333-8333-333333333333';
const ACCESS_ID = '44444444-4444-4444-8444-444444444444';

const DEFAULT_PASSWORD = 'SupplyLine123!';
const MSPADMIN_EMAIL = process.env.DEV_MSPADMIN_EMAIL ?? 'mspadmin@supplyline.local';
const CLIENTADMIN_EMAIL = process.env.DEV_CLIENT_EMAIL ?? 'clientadmin@supplyline.local';

interface CountRow extends RowDataPacket {
  count: number;
}

async function seedDevUser(): Promise<void> {
  initSupplylinePool();

  const password = process.env.DEV_SEED_PASSWORD ?? DEFAULT_PASSWORD;
  const passwordHash = await hashPassword(password);

  const existing = await query<CountRow[]>(
    `SELECT COUNT(*) AS count FROM sl_Users WHERE Email IN (?, ?)`,
    [MSPADMIN_EMAIL, CLIENTADMIN_EMAIL]
  );

  if (existing[0].count > 0) {
    console.log('Dev users already exist — skipping seed.');
    console.log(`  MspAdmin:    ${MSPADMIN_EMAIL}`);
    console.log(`  ClientAdmin: ${CLIENTADMIN_EMAIL}`);
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
      'Dev MspAdmin',
      MSPADMIN_EMAIL,
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
      MSPADMIN_EMAIL,
      passwordHash,
      'Dev',
      'MspAdmin',
      UserRole.MspAdmin,
    ]
  );

  await execute(
    `INSERT INTO sl_Users (
       UserID, ClientID, Email, PasswordHash, FirstName, LastName,
       PreferredLocale, Role, IsActive
     ) VALUES (?, ?, ?, ?, ?, ?, 'en-US', ?, 1)`,
    [
      CLIENTADMIN_USER_ID,
      CLIENT_ID,
      CLIENTADMIN_EMAIL,
      passwordHash,
      'Dev',
      'ClientAdmin',
      UserRole.ClientAdmin,
    ]
  );

  await execute(
    `INSERT INTO sl_UserProjectAccess (AccessID, UserID, ProjectID)
     VALUES (?, ?, ?)`,
    [ACCESS_ID, CLIENTADMIN_USER_ID, projectId]
  );

  console.log('Dev seed completed.');
  console.log(`  ClientID:  ${CLIENT_ID}`);
  console.log(`  ProjectID: ${projectId}`);
  console.log(`  Password:  ${password}`);
  console.log('');
  console.log('Users:');
  console.log(`  MspAdmin (${UserRole.MspAdmin}):    ${MSPADMIN_EMAIL}`);
  console.log(`  ClientAdmin (${UserRole.ClientAdmin}): ${CLIENTADMIN_EMAIL}`);
  console.log('');
  console.log('Login: POST /api/auth/login');
  console.log(`  curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d "{\\"email\\":\\"${MSPADMIN_EMAIL}\\",\\"password\\":\\"${password}\\"}"`);
}

seedDevUser().catch((error: Error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
