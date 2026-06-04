import { Router } from 'express';
import {
  getProjectContext,
  getProjectsForUser,
  getSaturnAvailableProjectsHandler,
  postProject,
} from '../controllers/projectController';
import { getProjectInventory } from '../controllers/inventoryController';
import { deletePurgeTestDataHandler } from '../controllers/adminController';
import {
  getProjectStaging,
  postProjectStaging,
} from '../controllers/stagingController';
import { authenticateJwt } from '../middleware/authenticateJwt';
import { requireMspAdmin } from '../middleware/requireMspAdmin';
import { optionalStagingPdfUpload } from '../middleware/uploadStagingPdf';
import { verifyProjectAccess } from '../middleware/verifyProjectAccess';

const projectRoutes = Router();

projectRoutes.get('/', authenticateJwt, getProjectsForUser);

projectRoutes.get('/saturn-available', authenticateJwt, getSaturnAvailableProjectsHandler);

projectRoutes.post('/', authenticateJwt, postProject);

projectRoutes.delete(
  '/admin/purge-test-data',
  authenticateJwt,
  verifyProjectAccess,
  requireMspAdmin,
  deletePurgeTestDataHandler
);

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
