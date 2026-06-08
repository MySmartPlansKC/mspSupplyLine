import { Request, Response } from 'express';
import path from 'path';
import { readSubmittalPdf } from '../services/submittalFileStorage';
import { BadRequestError, NotFoundError, sendError } from '../utilities/httpErrors';

function parseProjectIdParam(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseDocumentId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isEnoent(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    String((error as { code?: string }).code) === 'ENOENT'
  );
}

export async function getSubmittalPdfFile(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseProjectIdParam(req.params.projectId);
    const documentId = parseDocumentId(req.params.documentId);

    if (!projectId || !documentId) {
      throw new BadRequestError('Invalid project or document identifier');
    }

    const relativePath = path.posix.join(String(projectId), `${documentId}.pdf`);
    const buffer = await readSubmittalPdf(relativePath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${documentId}.pdf"`);
    res.send(buffer);
  } catch (error) {
    if (isEnoent(error)) {
      sendError(res, new NotFoundError('Submittal PDF not found'));
      return;
    }

    if (error instanceof Error && error.message === 'Invalid submittal storage path') {
      sendError(res, new BadRequestError(error.message));
      return;
    }

    sendError(res, error);
  }
}
