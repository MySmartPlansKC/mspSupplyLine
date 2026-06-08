import { Router } from 'express';
import { getSubmittalPdfFile } from '../controllers/submittalFileController';
import { authenticateJwt } from '../middleware/authenticateJwt';
import { verifyProjectAccess } from '../middleware/verifyProjectAccess';

const storageRoutes = Router();

storageRoutes.get(
  '/submittals/:projectId/:documentId.pdf',
  authenticateJwt,
  verifyProjectAccess,
  getSubmittalPdfFile
);

export default storageRoutes;
