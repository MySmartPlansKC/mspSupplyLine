import { RowDataPacket } from 'mysql2';
import { query } from '../../config/database';
import { normalizeUserRole } from '../constants/userRoles';
import type { SlUser, SlUserPublic } from '../models/User';

interface UserRow extends RowDataPacket {
  UserID: string;
  ClientID: string;
  Email: string;
  PasswordHash: string;
  FirstName: string | null;
  LastName: string | null;
  PreferredLocale: string | null;
  Role: string;
  IsActive: boolean | 0 | 1;
  CreatedAt: Date;
  UpdatedAt: Date;
}

interface ClientStatusRow extends RowDataPacket {
  AccountStatus: string;
}

function mapUserRow(row: UserRow): SlUser {
  const role = normalizeUserRole(row.Role);
  if (!role) {
    throw new Error(`Unknown user role in database: ${row.Role}`);
  }

  return {
    UserID: row.UserID,
    ClientID: row.ClientID,
    Email: row.Email,
    PasswordHash: row.PasswordHash,
    FirstName: row.FirstName,
    LastName: row.LastName,
    PreferredLocale: row.PreferredLocale,
    Role: role,
    IsActive: Boolean(row.IsActive),
    CreatedAt: row.CreatedAt,
    UpdatedAt: row.UpdatedAt,
  };
}

function toPublicUser(user: SlUser): SlUserPublic {
  const { PasswordHash: _hash, ...publicUser } = user;
  return publicUser;
}

export class UserRepository {
  static async findByEmail(email: string): Promise<SlUser | null> {
    const rows = await query<UserRow[]>(
      `SELECT UserID, ClientID, Email, PasswordHash, FirstName, LastName,
              PreferredLocale, Role, IsActive, CreatedAt, UpdatedAt
       FROM sl_Users
       WHERE Email = ?
       LIMIT 1`,
      [email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return null;
    }

    return mapUserRow(rows[0]);
  }

  static async findById(userId: string): Promise<SlUserPublic | null> {
    const rows = await query<UserRow[]>(
      `SELECT UserID, ClientID, Email, PasswordHash, FirstName, LastName,
              PreferredLocale, Role, IsActive, CreatedAt, UpdatedAt
       FROM sl_Users
       WHERE UserID = ?
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return null;
    }

    return toPublicUser(mapUserRow(rows[0]));
  }

  static async getClientAccountStatus(clientId: string): Promise<string | null> {
    const rows = await query<ClientStatusRow[]>(
      `SELECT AccountStatus FROM sl_Clients WHERE ClientID = ? LIMIT 1`,
      [clientId]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0].AccountStatus;
  }
}
