import { createHash, randomUUID } from 'crypto';
import { getConnection } from '../../config/database';
import {
  StagingIngestInput,
  StagingRepository,
} from '../repositories/StagingRepository';
import { SubmittalDocumentRepository } from '../repositories/SubmittalDocumentRepository';
import { processSubmittalPDF } from './pdfExtractionService';
import {
  BadRequestError,
  ConflictError,
  isDuplicateEntryError,
} from '../utilities/httpErrors';

function trimString(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function parseQuantity(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return 1;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
}

function validatePdfDerivedItems(items: StagingIngestInput[]): StagingIngestInput[] {
  if (items.length === 0) {
    throw new BadRequestError('PDF extraction produced no staging items');
  }

  return items.map((item, index) => {
    const manufacturer = trimString(item.manufacturer);
    if (!manufacturer) {
      throw new BadRequestError(`Item at index ${index}: manufacturer is required`);
    }

    const modelNumber = trimString(item.modelNumber);
    if (!modelNumber) {
      throw new BadRequestError(`Item at index ${index}: modelNumber is required`);
    }

    const quantity = parseQuantity(item.quantity);
    if (quantity === null) {
      throw new BadRequestError(`Item at index ${index}: quantity must be an integer >= 1`);
    }

    const originalRawData = item.originalRawData;
    if (!originalRawData || typeof originalRawData !== 'object' || Array.isArray(originalRawData)) {
      throw new BadRequestError(`Item at index ${index}: originalRawData must be an object`);
    }

    const rawRow = trimString(originalRawData.rawRow);
    if (!rawRow) {
      throw new BadRequestError(`Item at index ${index}: originalRawData.rawRow is required`);
    }

    return {
      externalRecordRef: trimString(item.externalRecordRef) || null,
      categoryName: trimString(item.categoryName) || null,
      manufacturer,
      modelNumber,
      description: trimString(item.description) || null,
      quantity,
      locationInBuilding: item.locationInBuilding ?? null,
      originalRawData: {
        ...originalRawData,
        rawRow,
      },
    };
  });
}

export function hashFileBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function resolveFileTitle(originalName: string | undefined): string {
  const trimmed = trimString(originalName);
  return trimmed.length > 0 ? trimmed : 'untitled.pdf';
}

export interface AssemblyLineIngestInput {
  projectId: number;
  uploadedBy: string;
  fileBuffer: Buffer;
  fileTitle: string;
}

export interface AssemblyLineIngestResult {
  documentId: string;
  processingStatus: 'AwaitingReview';
  inserted: number;
  stagingIds: string[];
}

export async function ingestSubmittalPdf(
  input: AssemblyLineIngestInput
): Promise<AssemblyLineIngestResult> {
  const fileHash = hashFileBuffer(input.fileBuffer);
  const fileTitle = resolveFileTitle(input.fileTitle);

  const conflict = await SubmittalDocumentRepository.findConflictingDocument(
    input.projectId,
    fileHash,
    fileTitle
  );

  if (conflict) {
    if (conflict.processingStatus === 'Error') {
      await SubmittalDocumentRepository.deleteById(input.projectId, conflict.documentId);
    } else if (conflict.reason === 'hash') {
      throw new ConflictError(
        'Submittal file already ingested for this project (duplicate content hash).'
      );
    } else {
      throw new ConflictError(
        'Submittal file already ingested for this project (duplicate file title).'
      );
    }
  }

  const documentId = randomUUID();
  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    await SubmittalDocumentRepository.insertProcessingDocument(connection, {
      documentId,
      projectId: input.projectId,
      sourceType: 'ManualUpload',
      fileTitle,
      fileHash,
      uploadedBy: input.uploadedBy,
    });

    const extracted = await processSubmittalPDF(input.fileBuffer);
    const items = validatePdfDerivedItems(extracted);

    const { stagingIds } = await StagingRepository.insertStagingBatch(
      connection,
      input.projectId,
      documentId,
      input.uploadedBy,
      items
    );

    await SubmittalDocumentRepository.updateStatus(
      connection,
      documentId,
      'AwaitingReview',
      null
    );

    await connection.commit();

    return {
      documentId,
      processingStatus: 'AwaitingReview',
      inserted: stagingIds.length,
      stagingIds,
    };
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Connection may already be rolled back.
    }

    if (error instanceof BadRequestError || error instanceof ConflictError) {
      throw error;
    }

    if (isDuplicateEntryError(error)) {
      throw new ConflictError(
        'Submittal file already ingested for this project (duplicate hash or title).'
      );
    }

    const message = error instanceof Error ? error.message : 'PDF submittal parsing failed';
    throw new BadRequestError(message);
  } finally {
    connection.release();
  }
}
