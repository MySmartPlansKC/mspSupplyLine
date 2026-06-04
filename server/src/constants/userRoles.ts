export const UserRole = {
  MspAdmin: 'MspAdmin',
  Admin: 'Admin',
  PIM: 'PIM',
  ClientAdmin: 'ClientAdmin',
  FacilityViewer: 'FacilityViewer',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.FacilityViewer]: 0,
  [UserRole.ClientAdmin]: 1,
  [UserRole.PIM]: 2,
  [UserRole.Admin]: 3,
  [UserRole.MspAdmin]: 4,
};

const PLATFORM_ROLES: ReadonlySet<UserRole> = new Set([
  UserRole.MspAdmin,
  UserRole.Admin,
  UserRole.PIM,
]);

export function normalizeUserRole(raw: string | undefined | null): UserRole | null {
  if (raw === undefined || raw === null) return null;
  const value = String(raw).trim();
  if ((Object.values(UserRole) as string[]).includes(value)) {
    return value as UserRole;
  }
  return null;
}

export function userRoleRank(role: UserRole | string): number {
  const normalized = normalizeUserRole(String(role));
  return normalized ? ROLE_RANK[normalized] : -1;
}

export function isPlatformRole(role: UserRole | string): boolean {
  const normalized = normalizeUserRole(String(role));
  return normalized !== null && PLATFORM_ROLES.has(normalized);
}
