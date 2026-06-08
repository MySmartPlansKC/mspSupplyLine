import { Response } from 'express';
import { isPlatformRole } from '../constants/userRoles';
import { SubmittalDocumentRepository } from '../repositories/SubmittalDocumentRepository';
import { StagingRepository } from '../repositories/StagingRepository';
import {
  acceptSubmittalPdfIngest,
  startSubmittalPdfBackgroundJob,
} from '../services/assemblyLineIngestService';
import { approveStagingItem } from '../services/manufacturerApprovalService';
import { AuthRequest } from '../types/auth';
import {
  BadRequestError,
  ForbiddenError,
  sendError,
  UnauthorizedError,
} from '../utilities/httpErrors';

function parseStagingId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isPdfIngestRequest(req: AuthRequest): boolean {
  const ingestMode = req.headers['x-ingest-mode'];
  const modeHeader =
    typeof ingestMode === 'string' && ingestMode.toLowerCase() === 'pdf-submittal';

  if (req.file?.mimetype === 'application/pdf') {
    return true;
  }

  return Boolean(modeHeader && req.file?.buffer !== undefined);
}

export async function getProjectStaging(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const projectId = req.projectId;
    if (!projectId) {
      throw new BadRequestError('Project context required');
    }

    const [documents, staging] = await Promise.all([
      SubmittalDocumentRepository.listProjectDocuments(projectId),
      StagingRepository.getProjectStaging(projectId),
    ]);

    res.json({ documents, staging });
  } catch (error) {
    sendError(res, error);
  }
}

export async function postProjectStaging(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    if (!isPlatformRole(req.user.role)) {
      throw new ForbiddenError('Platform role required for staging ingestion');
    }

    const projectId = req.projectId;
    if (!projectId) {
      throw new BadRequestError('Project context required');
    }

    if (!isPdfIngestRequest(req) || !req.file?.buffer?.length) {
      throw new BadRequestError('PDF file is required for submittal ingestion');
    }

    const fileBuffer = req.file.buffer;
    const fileTitle = req.file.originalname;

    const accepted = await acceptSubmittalPdfIngest({
      projectId,
      uploadedBy: req.user.userId,
      fileBuffer,
      fileTitle,
    });

    startSubmittalPdfBackgroundJob({
      documentId: accepted.documentId,
      projectId,
      uploadedBy: req.user.userId,
      storedRelativePath: accepted.storedRelativePath,
      fileTitle,
    });

    res.status(202).json({
      documentId: accepted.documentId,
      processingStatus: accepted.processingStatus,
      stagingPlaceholderId: accepted.stagingPlaceholderId,
      message: 'Submittal accepted; PDF extraction is running in the background.',
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function approveProjectStagingItem(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    if (!isPlatformRole(req.user.role)) {
      throw new ForbiddenError('Platform role required for staging approval');
    }

    const projectId = req.projectId;
    if (!projectId) {
      throw new BadRequestError('Project context required');
    }

    const stagingId = parseStagingId(req.params.stagingId);
    if (!stagingId) {
      throw new BadRequestError('Invalid stagingId');
    }

    const result = await approveStagingItem({ projectId, stagingId });
    res.json(result);
  } catch (error) {
    sendError(res, error);
  }
}
