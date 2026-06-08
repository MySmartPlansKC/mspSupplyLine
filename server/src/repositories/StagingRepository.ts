import { randomUUID } from 'crypto';
import { RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { query } from '../../config/database';

export interface StagingIngestInput {
  extractedManufacturer: string;
  extractedMfgAddress?: string | null;
  extractedMfgPhone?: string | null;
  extractedMfgWebsite?: string | null;
  extractedMfgContact?: string | null;
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
  manufacturerId: number | null;
  extractedManufacturer: string | null;
  extractedMfgAddress: string | null;
  extractedMfgPhone: string | null;
  extractedMfgWebsite: string | null;
  extractedMfgContact: string | null;
  modelNumber: string | null;
  description: string | null;
  locationInBuilding: string | null;
  quantity: number;
  originalRawData: Record<string, unknown> | null;
  reviewStatus: 'Processing' | 'Pending' | 'Approved' | 'Rejected';
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
  ManufacturerID: number | null;
  ExtractedManufacturer: string | null;
  ExtractedMfgAddress: string | null;
  ExtractedMfgPhone: string | null;
  ExtractedMfgWebsite: string | null;
  ExtractedMfgContact: string | null;
  StagedAddress: string | null;
  StagedPhone: string | null;
  ModelNumber: string | null;
  Description: string | null;
  LocationInBuilding: string | null;
  Quantity: number;
  OriginalRawData: Record<string, unknown> | null;
  ReviewStatus: 'Processing' | 'Pending' | 'Approved' | 'Rejected';
  CreatedBy: string;
  CreatedAt: Date;
  UpdatedAt: Date;
}

const STAGING_SELECT_COLUMNS = `
  StagingID,
  ProjectID,
  SourceDocumentID,
  SourceType,
  ExternalRecordRef,
  CategoryName,
  Manufacturer,
  ManufacturerID,
  ExtractedManufacturer,
  ExtractedMfgAddress,
  ExtractedMfgPhone,
  ExtractedMfgWebsite,
  ExtractedMfgContact,
  StagedAddress,
  StagedPhone,
  ModelNumber,
  Description,
  LocationInBuilding,
  Quantity,
  OriginalRawData,
  ReviewStatus,
  CreatedBy,
  CreatedAt,
  UpdatedAt
`;

function mapStagingRow(row: StagingRow): ProjectStagingRecord {
  const extractedManufacturer = row.ExtractedManufacturer ?? row.Manufacturer;

  return {
    stagingId: row.StagingID,
    projectId: row.ProjectID,
    sourceDocumentId: row.SourceDocumentID,
    sourceType: row.SourceType,
    externalRecordRef: row.ExternalRecordRef,
    categoryName: row.CategoryName,
    manufacturer: extractedManufacturer,
    manufacturerId: row.ManufacturerID,
    extractedManufacturer,
    extractedMfgAddress: row.ExtractedMfgAddress ?? row.StagedAddress,
    extractedMfgPhone: row.ExtractedMfgPhone ?? row.StagedPhone,
    extractedMfgWebsite: row.ExtractedMfgWebsite,
    extractedMfgContact: row.ExtractedMfgContact,
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
      `SELECT ${STAGING_SELECT_COLUMNS}
       FROM sl_Staging
       WHERE ProjectID = ?
       ORDER BY CreatedAt DESC`,
      [projectId]
    );

    return rows.map(mapStagingRow);
  }

  static async findByIdForProject(
    connection: PoolConnection,
    stagingId: string,
    projectId: number
  ): Promise<ProjectStagingRecord | null> {
    const [rows] = await connection.execute<StagingRow[]>(
      `SELECT ${STAGING_SELECT_COLUMNS}
       FROM sl_Staging
       WHERE StagingID = ? AND ProjectID = ?
       LIMIT 1`,
      [stagingId, projectId]
    );

    if (rows.length === 0) {
      return null;
    }

    return mapStagingRow(rows[0]);
  }

  static async hardDeleteById(
    connection: PoolConnection,
    stagingId: string,
    projectId: number
  ): Promise<boolean> {
    const [result] = await connection.execute(
      `DELETE FROM sl_Staging
       WHERE StagingID = ? AND ProjectID = ?`,
      [stagingId, projectId]
    );

    const header = result as { affectedRows?: number };
    return (header.affectedRows ?? 0) > 0;
  }

  static async insertProcessingPlaceholder(
    connection: PoolConnection,
    projectId: number,
    sourceDocumentId: string,
    createdBy: string
  ): Promise<string> {
    const stagingId = randomUUID();
    await connection.execute(
      `INSERT INTO sl_Staging (
          StagingID,
          ProjectID,
          SourceDocumentID,
          SourceType,
          ExternalRecordRef,
          CategoryName,
          Manufacturer,
          ManufacturerID,
          ExtractedManufacturer,
          ExtractedMfgAddress,
          ExtractedMfgPhone,
          ExtractedMfgWebsite,
          ExtractedMfgContact,
          ModelNumber,
          Description,
          LocationInBuilding,
          Quantity,
          OriginalRawData,
          ReviewStatus,
          CreatedBy
        ) VALUES (?, ?, ?, 'ExternalImport', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, ?, 'Processing', ?)`,
      [
        stagingId,
        projectId,
        sourceDocumentId,
        JSON.stringify({ processingPlaceholder: true }),
        createdBy,
      ]
    );
    return stagingId;
  }

  static async deleteProcessingPlaceholdersByDocument(
    connection: PoolConnection,
    projectId: number,
    sourceDocumentId: string
  ): Promise<void> {
    await connection.execute(
      `DELETE FROM sl_Staging
       WHERE ProjectID = ?
         AND SourceDocumentID = ?
         AND ReviewStatus = 'Processing'`,
      [projectId, sourceDocumentId]
    );
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
          ManufacturerID,
          ExtractedManufacturer,
          ExtractedMfgAddress,
          ExtractedMfgPhone,
          ExtractedMfgWebsite,
          ExtractedMfgContact,
          ModelNumber,
          Description,
          LocationInBuilding,
          Quantity,
          OriginalRawData,
          ReviewStatus,
          CreatedBy
        ) VALUES (?, ?, ?, 'ExternalImport', ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)`,
        [
          stagingId,
          projectId,
          sourceDocumentId,
          item.externalRecordRef ?? null,
          item.categoryName ?? null,
          item.extractedManufacturer,
          item.extractedManufacturer,
          item.extractedMfgAddress ?? null,
          item.extractedMfgPhone ?? null,
          item.extractedMfgWebsite ?? null,
          item.extractedMfgContact ?? null,
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
