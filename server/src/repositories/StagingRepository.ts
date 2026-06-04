import { randomUUID } from 'crypto';
import { RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { query } from '../../config/database';

export interface StagingIngestInput {
  manufacturer: string;
  modelNumber: string;
  quantity: number;
  locationInBuilding?: string | null;
  categoryName?: string | null;
  description?: string | null;
  externalRecordRef?: string | null;
  originalRawData?: Record<string, unknown> | null;
}

export interface ProjectStagingRecord {
  stagingId: string;
  projectId: number;
  sourceDocumentId: string;
  sourceType: 'InternalProject' | 'ExternalImport';
  externalRecordRef: string | null;
  categoryName: string | null;
  manufacturer: string | null;
  modelNumber: string | null;
  description: string | null;
  locationInBuilding: string | null;
  quantity: number;
  originalRawData: Record<string, unknown> | null;
  reviewStatus: 'Pending' | 'Approved' | 'Rejected';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface StagingRow extends RowDataPacket {
  StagingID: string;
  ProjectID: number;
  SourceDocumentID: string;
  SourceType: 'InternalProject' | 'ExternalImport';
  ExternalRecordRef: string | null;
  CategoryName: string | null;
  Manufacturer: string | null;
  ModelNumber: string | null;
  Description: string | null;
  LocationInBuilding: string | null;
  Quantity: number;
  OriginalRawData: Record<string, unknown> | null;
  ReviewStatus: 'Pending' | 'Approved' | 'Rejected';
  CreatedBy: string;
  CreatedAt: Date;
  UpdatedAt: Date;
}

function mapStagingRow(row: StagingRow): ProjectStagingRecord {
  return {
    stagingId: row.StagingID,
    projectId: row.ProjectID,
    sourceDocumentId: row.SourceDocumentID,
    sourceType: row.SourceType,
    externalRecordRef: row.ExternalRecordRef,
    categoryName: row.CategoryName,
    manufacturer: row.Manufacturer,
    modelNumber: row.ModelNumber,
    description: row.Description,
    locationInBuilding: row.LocationInBuilding,
    quantity: row.Quantity,
    originalRawData: row.OriginalRawData,
    reviewStatus: row.ReviewStatus,
    createdBy: row.CreatedBy,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  };
}

export class StagingRepository {
  static async getProjectStaging(projectId: number): Promise<ProjectStagingRecord[]> {
    const rows = await query<StagingRow[]>(
      `SELECT
          StagingID,
          ProjectID,
          SourceDocumentID,
          SourceType,
          ExternalRecordRef,
          CategoryName,
          Manufacturer,
          ModelNumber,
          Description,
          LocationInBuilding,
          Quantity,
          OriginalRawData,
          ReviewStatus,
          CreatedBy,
          CreatedAt,
          UpdatedAt
       FROM sl_Staging
       WHERE ProjectID = ?
       ORDER BY CreatedAt DESC`,
      [projectId]
    );

    return rows.map(mapStagingRow);
  }

  static async insertStagingBatch(
    connection: PoolConnection,
    projectId: number,
    sourceDocumentId: string,
    createdBy: string,
    items: StagingIngestInput[]
  ): Promise<{ stagingIds: string[] }> {
    const stagingIds: string[] = [];

    for (const item of items) {
      const stagingId = randomUUID();
      stagingIds.push(stagingId);

      await connection.execute(
        `INSERT INTO sl_Staging (
          StagingID,
          ProjectID,
          SourceDocumentID,
          SourceType,
          ExternalRecordRef,
          CategoryName,
          Manufacturer,
          ModelNumber,
          Description,
          LocationInBuilding,
          Quantity,
          OriginalRawData,
          ReviewStatus,
          CreatedBy
        ) VALUES (?, ?, ?, 'ExternalImport', ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)`,
        [
          stagingId,
          projectId,
          sourceDocumentId,
          item.externalRecordRef ?? null,
          item.categoryName ?? null,
          item.manufacturer,
          item.modelNumber,
          item.description ?? null,
          item.locationInBuilding ?? null,
          item.quantity,
          item.originalRawData ? JSON.stringify(item.originalRawData) : null,
          createdBy,
        ]
      );
    }

    return { stagingIds };
  }
}
