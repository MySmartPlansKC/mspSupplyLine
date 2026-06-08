import { Router } from 'express';
import { putManufacturer } from '../controllers/manufacturerController';
import { authenticateJwt } from '../middleware/authenticateJwt';
import { requirePlatformRole } from '../middleware/requirePlatformRole';

const manufacturerRoutes = Router();

manufacturerRoutes.put(
  '/:manufacturerId',
  authenticateJwt,
  requirePlatformRole,
  putManufacturer
);

export default manufacturerRoutes;
