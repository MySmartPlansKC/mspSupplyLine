import { createHash, randomUUID } from 'crypto';
import { getConnection } from '../../config/database';
import {
  StagingIngestInput,
  StagingRepository,
} from '../repositories/StagingRepository';
import { SubmittalDocumentRepository } from '../repositories/SubmittalDocumentRepository';
import { processSubmittalPDF } from './pdfExtractionService';
import {
  deleteSubmittalPdf,
  readSubmittalPdf,
  saveSubmittalPdf,
} from './submittalFileStorage';
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

function trimOptional(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, maxLength);
}

function validatePdfDerivedItems(items: StagingIngestInput[]): StagingIngestInput[] {
  if (items.length === 0) {
    throw new BadRequestError('PDF extraction produced no staging items');
  }

  return items.map((item, index) => {
    const extractedManufacturer = trimString(item.extractedManufacturer);
    if (!extractedManufacturer) {
      throw new BadRequestError(`Item at index ${index}: extractedManufacturer is required`);
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
      extractedManufacturer,
      extractedMfgAddress: trimOptional(item.extractedMfgAddress, 500),
      extractedMfgPhone: trimOptional(item.extractedMfgPhone, 50),
      extractedMfgWebsite: trimOptional(item.extractedMfgWebsite, 255),
      extractedMfgContact: trimOptional(item.extractedMfgContact, 255),
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

export interface SubmittalIngestAccepted {
  documentId: string;
  processingStatus: 'Processing';
  stagingPlaceholderId: string;
  storedRelativePath: string;
}

export interface SubmittalIngestBackgroundJob {
  documentId: string;
  projectId: number;
  uploadedBy: string;
  storedRelativePath: string;
  fileTitle: string;
}

async function resolveIngestConflict(
  projectId: number,
  fileHash: string,
  fileTitle: string
): Promise<void> {
  const conflict = await SubmittalDocumentRepository.findConflictingDocument(
    projectId,
    fileHash,
    fileTitle
  );

  if (!conflict) {
    return;
  }

  if (conflict.processingStatus === 'Error') {
    await SubmittalDocumentRepository.deleteById(projectId, conflict.documentId);
    return;
  }

  if (conflict.reason === 'hash') {
    throw new ConflictError(
      'Submittal file already ingested for this project (duplicate content hash).'
    );
  }

  throw new ConflictError(
    'Submittal file already ingested for this project (duplicate file title).'
  );
}

function truncateErrorMessage(error: unknown): string {
  const message =
    error instanceof BadRequestError || error instanceof Error
      ? error.message
      : 'PDF submittal parsing failed';
  return message.slice(0, 2000);
}

async function markSubmittalIngestFailed(
  documentId: string,
  error: unknown
): Promise<void> {
  try {
    await SubmittalDocumentRepository.setProcessingStatus(
      documentId,
      'Error',
      truncateErrorMessage(error)
    );
  } catch (statusError) {
    console.error('[assemblyLineIngest] Failed to mark document as Error:', statusError);
  }
}

/**
 * Persists the PDF, creates document + staging placeholder rows, returns immediately for HTTP 202.
 */
export async function acceptSubmittalPdfIngest(
  input: AssemblyLineIngestInput
): Promise<SubmittalIngestAccepted> {
  const fileHash = hashFileBuffer(input.fileBuffer);
  const fileTitle = resolveFileTitle(input.fileTitle);

  await resolveIngestConflict(input.projectId, fileHash, fileTitle);

  const documentId = randomUUID();
  let storedRelativePath: string | null = null;

  try {
    storedRelativePath = await saveSubmittalPdf(input.projectId, documentId, input.fileBuffer);
  } catch (error) {
    throw new BadRequestError(
      error instanceof Error ? error.message : 'Unable to persist submittal PDF to storage'
    );
  }

  const connection = await getConnection();
  let stagingPlaceholderId = '';

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

    stagingPlaceholderId = await StagingRepository.insertProcessingPlaceholder(
      connection,
      input.projectId,
      documentId,
      input.uploadedBy
    );

    await connection.commit();
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Connection may already be rolled back.
    }

    if (storedRelativePath) {
      await deleteSubmittalPdf(storedRelativePath).catch(() => undefined);
    }

    if (isDuplicateEntryError(error)) {
      throw new ConflictError(
        'Submittal file already ingested for this project (duplicate hash or title).'
      );
    }
    throw error;
  } finally {
    connection.release();
  }

  return {
    documentId,
    processingStatus: 'Processing',
    stagingPlaceholderId,
    storedRelativePath,
  };
}

/**
 * Runs PDF extraction and staging insert off the HTTP request thread.
 */
export function startSubmittalPdfBackgroundJob(job: SubmittalIngestBackgroundJob): void {
  setImmediate(() => {
    void executeSubmittalPdfExtraction(job).catch((error) => {
      console.error('[assemblyLineIngest] Unhandled background extraction error:', error);
    });
  });
}

async function executeSubmittalPdfExtraction(
  job: SubmittalIngestBackgroundJob
): Promise<void> {
  try {
    const fileBuffer = await readSubmittalPdf(job.storedRelativePath);
    const extractedData = await processSubmittalPDF(fileBuffer);

    console.log('================= RAW AI WORKER PAYLOAD =================');
    console.log(JSON.stringify(extractedData, null, 2));
    console.log('========================================================');

    const items = validatePdfDerivedItems(extractedData);

    const connection = await getConnection();

    try {
      await connection.beginTransaction();

      const existing = await SubmittalDocumentRepository.findByIdWithConnection(
        connection,
        job.projectId,
        job.documentId
      );

      if (!existing || existing.processingStatus !== 'Processing') {
        await connection.rollback();
        return;
      }

      await StagingRepository.deleteProcessingPlaceholdersByDocument(
        connection,
        job.projectId,
        job.documentId
      );

      await StagingRepository.insertStagingBatch(
        connection,
        job.projectId,
        job.documentId,
        job.uploadedBy,
        items
      );

      await SubmittalDocumentRepository.updateStatus(
        connection,
        job.documentId,
        'AwaitingReview',
        null
      );

      await connection.commit();
    } catch (error) {
      try {
        await connection.rollback();
      } catch {
        // Connection may already be rolled back.
      }

      if (isDuplicateEntryError(error)) {
        await markSubmittalIngestFailed(
          job.documentId,
          new ConflictError(
            'Submittal file already ingested for this project (duplicate hash or title).'
          )
        );
        return;
      }

      await markSubmittalIngestFailed(job.documentId, error);
    } finally {
      connection.release();
    }
  } catch (error) {
    await markSubmittalIngestFailed(job.documentId, error);
  }
}
