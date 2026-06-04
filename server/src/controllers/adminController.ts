import { Response } from 'express';
import { purgeProjectTestData } from '../services/adminPurgeService';
import { AuthRequest } from '../types/auth';
import { BadRequestError, sendError, UnauthorizedError } from '../utilities/httpErrors';

export async function deletePurgeTestDataHandler(
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

    const result = await purgeProjectTestData(projectId);
    res.status(200).json(result);
  } catch (error) {
    sendError(res, error);
  }
}
