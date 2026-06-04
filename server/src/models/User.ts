import type { UserRole } from '../constants/userRoles';

export type { UserRole };

export interface SlUser {
  UserID: string;
  ClientID: string;
  Email: string;
  PasswordHash: string;
  FirstName: string | null;
  LastName: string | null;
  PreferredLocale: string | null;
  Role: UserRole;
  IsActive: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface SlUserPublic {
  UserID: string;
  ClientID: string;
  Email: string;
  FirstName: string | null;
  LastName: string | null;
  PreferredLocale: string | null;
  Role: UserRole;
  IsActive: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export type SlUserInsert = Omit<SlUser, 'CreatedAt' | 'UpdatedAt'>;

export interface SlUserProjectAccess {
  AccessID: string;
  UserID: string;
  ProjectID: number;
  GrantedAt: Date;
}

export type SlUserProjectAccessInsert = Omit<
  SlUserProjectAccess,
  'GrantedAt'
>;
