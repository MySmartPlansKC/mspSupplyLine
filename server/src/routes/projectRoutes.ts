import { Router } from 'express';
import {
  getProjectContext,
  getProjectsForUser,
  getSaturnAvailableProjectsHandler,
  postProject,
} from '../controllers/projectController';
import { getProjectInventory } from '../controllers/inventoryController';
import {
  getProjectStaging,
  postProjectStaging,
} from '../controllers/stagingController';
import { authenticateJwt } from '../middleware/authenticateJwt';
import { optionalStagingPdfUpload } from '../middleware/uploadStagingPdf';
import { verifyProjectAccess } from '../middleware/verifyProjectAccess';

const projectRoutes = Router();

projectRoutes.get('/', authenticateJwt, getProjectsForUser);

projectRoutes.get('/saturn-available', authenticateJwt, getSaturnAvailableProjectsHandler);

projectRoutes.post('/', authenticateJwt, postProject);

projectRoutes.get(
  '/:projectId/inventory',
  authenticateJwt,
  verifyProjectAccess,
  getProjectInventory
);

projectRoutes.get(
  '/:projectId/staging',
  authenticateJwt,
  verifyProjectAccess,
  getProjectStaging
);

projectRoutes.post(
  '/:projectId/staging',
  authenticateJwt,
  verifyProjectAccess,
  optionalStagingPdfUpload,
  postProjectStaging
);

projectRoutes.get(
  '/:projectId/context',
  authenticateJwt,
  verifyProjectAccess,
  getProjectContext
);

export default projectRoutes;
