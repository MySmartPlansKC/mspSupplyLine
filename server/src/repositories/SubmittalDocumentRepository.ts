import { RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { execute, query } from '../../config/database';

export type SubmittalSourceType = 'ManualUpload' | 'RegistryIngestion';

export type ProcessingStatus =
  | 'Pending'
  | 'Processing'
  | 'AwaitingReview'
  | 'Completed'
  | 'Error';

export interface SubmittalDocumentRecord {
  documentId: string;
  projectId: number;
  sourceType: SubmittalSourceType;
  fileTitle: string;
  fileHash: string;
  processingStatus: ProcessingStatus;
  errorMessage: string | null;
  uploadedBy: string;
  createdAt: Date;
}

export type DuplicateHitReason = 'hash' | 'title';

export interface ConflictingSubmittalDocument {
  documentId: string;
  reason: DuplicateHitReason;
  processingStatus: ProcessingStatus;
}

interface ConflictRow extends RowDataPacket {
  DocumentID: string;
  FileHash: string;
  FileTitle: string;
  ProcessingStatus: ProcessingStatus;
}

interface SubmittalDocumentRow extends RowDataPacket {
  DocumentID: string;
  ProjectID: number;
  SourceType: SubmittalSourceType;
  FileTitle: string;
  FileHash: string;
  ProcessingStatus: ProcessingStatus;
  ErrorMessage: string | null;
  UploadedBy: string;
  CreatedAt: Date;
}

function mapSubmittalDocumentRow(row: SubmittalDocumentRow): SubmittalDocumentRecord {
  return {
    documentId: row.DocumentID,
    projectId: row.ProjectID,
    sourceType: row.SourceType,
    fileTitle: row.FileTitle,
    fileHash: row.FileHash,
    processingStatus: row.ProcessingStatus,
    errorMessage: row.ErrorMessage,
    uploadedBy: row.UploadedBy,
    createdAt: row.CreatedAt,
  };
}

export class SubmittalDocumentRepository {
  static async findConflictingDocument(
    projectId: number,
    fileHash: string,
    fileTitle: string
  ): Promise<ConflictingSubmittalDocument | null> {
    const rows = await query<ConflictRow[]>(
      `SELECT DocumentID, FileHash, FileTitle, ProcessingStatus
       FROM sl_SubmittalDocuments
       WHERE ProjectID = ?
         AND (FileHash = ? OR FileTitle = ?)
       LIMIT 1`,
      [projectId, fileHash, fileTitle]
    );

    if (rows.length === 0) {
      return null;
    }

    const hit = rows[0];
    return {
      documentId: hit.DocumentID,
      reason: hit.FileHash === fileHash ? 'hash' : 'title',
      processingStatus: hit.ProcessingStatus,
    };
  }

  static async deleteById(projectId: number, documentId: string): Promise<boolean> {
    const result = await execute(
      `DELETE FROM sl_SubmittalDocuments
       WHERE DocumentID = ? AND ProjectID = ?`,
      [documentId, projectId]
    );
    return result.affectedRows > 0;
  }

  static async insertProcessingDocument(
    connection: PoolConnection,
    input: {
      documentId: string;
      projectId: number;
      sourceType: SubmittalSourceType;
      fileTitle: string;
      fileHash: string;
      uploadedBy: string;
    }
  ): Promise<void> {
    await connection.execute(
      `INSERT INTO sl_SubmittalDocuments (
        DocumentID,
        ProjectID,
        SourceType,
        FileTitle,
        FileHash,
        ProcessingStatus,
        UploadedBy
      ) VALUES (?, ?, ?, ?, ?, 'Processing', ?)`,
      [
        input.documentId,
        input.projectId,
        input.sourceType,
        input.fileTitle,
        input.fileHash,
        input.uploadedBy,
      ]
    );
  }

  static async insertProcessingDocumentDirect(input: {
    documentId: string;
    projectId: number;
    sourceType: SubmittalSourceType;
    fileTitle: string;
    fileHash: string;
    uploadedBy: string;
  }): Promise<void> {
    await execute(
      `INSERT INTO sl_SubmittalDocuments (
        DocumentID,
        ProjectID,
        SourceType,
        FileTitle,
        FileHash,
        ProcessingStatus,
        UploadedBy
      ) VALUES (?, ?, ?, ?, ?, 'Processing', ?)`,
      [
        input.documentId,
        input.projectId,
        input.sourceType,
        input.fileTitle,
        input.fileHash,
        input.uploadedBy,
      ]
    );
  }

  static async setProcessingStatus(
    documentId: string,
    processingStatus: ProcessingStatus,
    errorMessage: string | null = null
  ): Promise<void> {
    await execute(
      `UPDATE sl_SubmittalDocuments
       SET ProcessingStatus = ?, ErrorMessage = ?
       WHERE DocumentID = ?`,
      [processingStatus, errorMessage, documentId]
    );
  }

  static async updateStatus(
    connection: PoolConnection,
    documentId: string,
    processingStatus: ProcessingStatus,
    errorMessage: string | null = null
  ): Promise<void> {
    await connection.execute(
      `UPDATE sl_SubmittalDocuments
       SET ProcessingStatus = ?, ErrorMessage = ?
       WHERE DocumentID = ?`,
      [processingStatus, errorMessage, documentId]
    );
  }

  static async listProjectDocuments(projectId: number): Promise<SubmittalDocumentRecord[]> {
    const rows = await query<SubmittalDocumentRow[]>(
      `SELECT
          DocumentID,
          ProjectID,
          SourceType,
          FileTitle,
          FileHash,
          ProcessingStatus,
          ErrorMessage,
          UploadedBy,
          CreatedAt
       FROM sl_SubmittalDocuments
       WHERE ProjectID = ?
       ORDER BY CreatedAt DESC`,
      [projectId]
    );

    return rows.map(mapSubmittalDocumentRow);
  }

  static async findByIdWithConnection(
    connection: PoolConnection,
    projectId: number,
    documentId: string
  ): Promise<SubmittalDocumentRecord | null> {
    const [rows] = await connection.execute<SubmittalDocumentRow[]>(
      `SELECT
          DocumentID,
          ProjectID,
          SourceType,
          FileTitle,
          FileHash,
          ProcessingStatus,
          ErrorMessage,
          UploadedBy,
          CreatedAt
       FROM sl_SubmittalDocuments
       WHERE DocumentID = ? AND ProjectID = ?
       LIMIT 1`,
      [documentId, projectId]
    );

    if (rows.length === 0) {
      return null;
    }

    return mapSubmittalDocumentRow(rows[0]);
  }
}
