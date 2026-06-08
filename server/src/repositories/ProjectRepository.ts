import { randomUUID } from 'crypto';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getConnection, query } from '../../config/database';
import { isPlatformRole } from '../constants/userRoles';
import type { UserRole } from '../constants/userRoles';
import type { SlProject } from '../models/Project';
import { ConflictError, isDuplicateEntryError } from '../utilities/httpErrors';

interface ProjectRow extends RowDataPacket {
  ProjectID: number;
  ClientID: string;
  MspSaturnProjectRef: number | null;
  ProjectName: string;
  ProjectStatus: string;
  ProjectAddress: string | null;
  ProjectCity: string | null;
  ProjectState: string | null;
  ProjectZip: string | null;
  CountryCode: string;
  ProjectLocale: string | null;
  FundingCompanyName: string | null;
  PurchaseOrderNumber: string | null;
  ProjectManagerName: string | null;
  ProjectManagerEmail: string | null;
  ProjectManagerPhone: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

interface AccessProbeRow extends RowDataPacket {
  hasAccess: number;
}

interface SaturnRefRow extends RowDataPacket {
  MspSaturnProjectRef: number;
}

const PROJECT_LIST_COLUMNS = `
  ProjectID, ProjectName, ProjectCity, ProjectState, ProjectStatus, MspSaturnProjectRef
`;

const PROJECT_SELECT_COLUMNS = `
  ProjectID, ClientID, MspSaturnProjectRef, ProjectName, ProjectStatus,
  ProjectAddress, ProjectCity, ProjectState, ProjectZip, CountryCode, ProjectLocale,
  FundingCompanyName, PurchaseOrderNumber,
  ProjectManagerName, ProjectManagerEmail, ProjectManagerPhone,
  CreatedAt, UpdatedAt
`;

interface ProjectListRow extends RowDataPacket {
  ProjectID: number;
  ProjectName: string;
  ProjectCity: string | null;
  ProjectState: string | null;
  ProjectStatus: string;
  MspSaturnProjectRef: number | null;
}

export interface CreateProjectInput {
  clientId: string;
  projectName: string;
  projectAddress: string;
  projectCity: string;
  projectState: string;
  projectZip: string;
  countryCode: string;
  projectLocale: string;
  fundingCompanyName: string;
  purchaseOrderNumber: string;
  projectManagerName: string;
  projectManagerEmail: string;
  projectManagerPhone: string;
  mspSaturnProjectRef?: number | null;
}

export interface ProjectApiRecord {
  projectId: number;
  projectName: string;
  projectCity: string | null;
  projectState: string | null;
  projectStatus: string;
  mspSaturnProjectRef: number | null;
}

function mapProjectRow(row: ProjectRow): SlProject {
  return {
    ProjectID: row.ProjectID,
    ClientID: row.ClientID,
    MspSaturnProjectRef: row.MspSaturnProjectRef,
    ProjectName: row.ProjectName,
    ProjectStatus: row.ProjectStatus as SlProject['ProjectStatus'],
    ProjectAddress: row.ProjectAddress,
    ProjectCity: row.ProjectCity,
    ProjectState: row.ProjectState,
    ProjectZip: row.ProjectZip,
    CountryCode: row.CountryCode,
    ProjectLocale: row.ProjectLocale,
    FundingCompanyName: row.FundingCompanyName,
    PurchaseOrderNumber: row.PurchaseOrderNumber,
    ProjectManagerName: row.ProjectManagerName,
    ProjectManagerEmail: row.ProjectManagerEmail,
    ProjectManagerPhone: row.ProjectManagerPhone,
    CreatedAt: row.CreatedAt,
    UpdatedAt: row.UpdatedAt,
  };
}

function mapProjectListRow(row: ProjectListRow): SlProject {
  return {
    ProjectID: row.ProjectID,
    ClientID: '',
    MspSaturnProjectRef: row.MspSaturnProjectRef,
    ProjectName: row.ProjectName,
    ProjectStatus: row.ProjectStatus as SlProject['ProjectStatus'],
    ProjectAddress: null,
    ProjectCity: row.ProjectCity,
    ProjectState: row.ProjectState,
    ProjectZip: null,
    CountryCode: 'US',
    ProjectLocale: null,
    FundingCompanyName: null,
    PurchaseOrderNumber: null,
    ProjectManagerName: null,
    ProjectManagerEmail: null,
    ProjectManagerPhone: null,
    CreatedAt: new Date(0),
    UpdatedAt: new Date(0),
  };
}

export class ProjectRepository {
  static toProjectApiRecord(project: SlProject): ProjectApiRecord {
    return {
      projectId: project.ProjectID,
      projectName: project.ProjectName,
      projectCity: project.ProjectCity,
      projectState: project.ProjectState,
      projectStatus: project.ProjectStatus,
      mspSaturnProjectRef: project.MspSaturnProjectRef,
    };
  }

  static async existsById(projectId: number): Promise<boolean> {
    const rows = await query<AccessProbeRow[]>(
      `SELECT 1 AS hasAccess
       FROM sl_Projects
       WHERE ProjectID = ?
       LIMIT 1`,
      [projectId]
    );
    return rows.length > 0;
  }

  static async findById(projectId: number): Promise<SlProject | null> {
    const rows = await query<ProjectRow[]>(
      `SELECT ${PROJECT_SELECT_COLUMNS}
       FROM sl_Projects
       WHERE ProjectID = ?
       LIMIT 1`,
      [projectId]
    );

    if (rows.length === 0) {
      return null;
    }

    return mapProjectRow(rows[0]);
  }

  static async listAssignedSaturnRefs(): Promise<number[]> {
    const rows = await query<SaturnRefRow[]>(
      `SELECT MspSaturnProjectRef
       FROM sl_Projects
       WHERE MspSaturnProjectRef IS NOT NULL`
    );
    return rows.map((row) => row.MspSaturnProjectRef);
  }

  static async isSaturnRefAssigned(mspSaturnProjectRef: number): Promise<boolean> {
    const rows = await query<AccessProbeRow[]>(
      `SELECT 1 AS hasAccess
       FROM sl_Projects
       WHERE MspSaturnProjectRef = ?
       LIMIT 1`,
      [mspSaturnProjectRef]
    );
    return rows.length > 0;
  }

  static async findActiveProjectByNameAndCity(
    clientId: string,
    projectName: string,
    projectCity: string
  ): Promise<SlProject | null> {
    const rows = await query<ProjectRow[]>(
      `SELECT ${PROJECT_SELECT_COLUMNS}
       FROM sl_Projects
       WHERE ClientID = ?
         AND ProjectStatus = 'Active'
         AND LOWER(TRIM(ProjectName)) = LOWER(TRIM(?))
         AND LOWER(TRIM(COALESCE(ProjectCity, ''))) = LOWER(TRIM(?))
       LIMIT 1`,
      [clientId, projectName, projectCity]
    );

    if (rows.length === 0) {
      return null;
    }

    return mapProjectRow(rows[0]);
  }

  static async createProject(
    connection: Awaited<ReturnType<typeof getConnection>>,
    input: CreateProjectInput
  ): Promise<number> {
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO sl_Projects (
         ClientID,
         MspSaturnProjectRef,
         ProjectName,
         ProjectStatus,
         ProjectAddress,
         ProjectCity,
         ProjectState,
         ProjectZip,
         CountryCode,
         ProjectLocale,
         FundingCompanyName,
         PurchaseOrderNumber,
         ProjectManagerName,
         ProjectManagerEmail,
         ProjectManagerPhone
       ) VALUES (?, ?, ?, 'Active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.clientId,
        input.mspSaturnProjectRef ?? null,
        input.projectName,
        input.projectAddress,
        input.projectCity,
        input.projectState,
        input.projectZip,
        input.countryCode,
        input.projectLocale,
        input.fundingCompanyName || null,
        input.purchaseOrderNumber || null,
        input.projectManagerName,
        input.projectManagerEmail,
        input.projectManagerPhone || null,
      ]
    );

    return result.insertId;
  }

  static async grantUserProjectAccess(
    connection: Awaited<ReturnType<typeof getConnection>>,
    userId: string,
    projectId: number
  ): Promise<void> {
    const [existingRows] = await connection.query<AccessProbeRow[]>(
      `SELECT 1 AS hasAccess
       FROM sl_UserProjectAccess
       WHERE UserID = ? AND ProjectID = ?
       LIMIT 1`,
      [userId, projectId]
    );

    if (existingRows.length > 0) {
      return;
    }

    await connection.execute(
      `INSERT INTO sl_UserProjectAccess (AccessID, UserID, ProjectID)
       VALUES (?, ?, ?)`,
      [randomUUID(), userId, projectId]
    );
  }

  static async createProjectWithAccess(
    userId: string,
    input: CreateProjectInput
  ): Promise<SlProject> {
    const connection = await getConnection();

    try {
      await connection.beginTransaction();

      const projectId = await ProjectRepository.createProject(connection, input);
      await ProjectRepository.grantUserProjectAccess(connection, userId, projectId);

      await connection.commit();

      const created = await ProjectRepository.findById(projectId);
      if (!created) {
        throw new Error('Project was created but could not be loaded');
      }
      return created;
    } catch (error) {
      await connection.rollback();
      if (isDuplicateEntryError(error)) {
        throw new ConflictError(
          'Duplicate provisioning detected: this user already has access to the target project node.'
        );
      }
      throw error;
    } finally {
      connection.release();
    }
  }

  static async hasUserProjectAccess(
    userId: string,
    projectId: number
  ): Promise<boolean> {
    const rows = await query<AccessProbeRow[]>(
      `SELECT 1 AS hasAccess
       FROM sl_UserProjectAccess
       WHERE UserID = ? AND ProjectID = ?
       LIMIT 1`,
      [userId, projectId]
    );

    return rows.length > 0;
  }

  static async listProjectsForUser(
    userId: string,
    role: UserRole
  ): Promise<SlProject[]> {
    if (isPlatformRole(role)) {
      const rows = await query<ProjectListRow[]>(
        `SELECT ${PROJECT_LIST_COLUMNS}
         FROM sl_Projects
         WHERE ProjectStatus = 'Active'
         ORDER BY ProjectName`
      );
      return rows.map(mapProjectListRow);
    }

    const rows = await query<ProjectListRow[]>(
      `SELECT p.ProjectID, p.ProjectName, p.ProjectCity, p.ProjectState,
              p.ProjectStatus, p.MspSaturnProjectRef
       FROM sl_Projects p
       INNER JOIN sl_UserProjectAccess upa ON upa.ProjectID = p.ProjectID
       WHERE upa.UserID = ? AND p.ProjectStatus = 'Active'
       ORDER BY p.ProjectName`,
      [userId]
    );

    return rows.map(mapProjectListRow);
  }
}
