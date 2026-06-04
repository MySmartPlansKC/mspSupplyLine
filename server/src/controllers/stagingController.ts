import { Response } from 'express';
import { isPlatformRole } from '../constants/userRoles';
import { SubmittalDocumentRepository } from '../repositories/SubmittalDocumentRepository';
import { StagingRepository } from '../repositories/StagingRepository';
import { ingestSubmittalPdf } from '../services/assemblyLineIngestService';
import { AuthRequest } from '../types/auth';
import {
  BadRequestError,
  ForbiddenError,
  sendError,
  UnauthorizedError,
} from '../utilities/httpErrors';

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

    const result = await ingestSubmittalPdf({
      projectId,
      uploadedBy: req.user.userId,
      fileBuffer: req.file.buffer,
      fileTitle: req.file.originalname,
    });

    res.status(201).json(result);
  } catch (error) {
    sendError(res, error);
  }
}
