import { Response } from 'express';
import { CatalogRepository } from '../repositories/CatalogRepository';
import { InventoryRepository } from '../repositories/InventoryRepository';
import { AuthRequest } from '../types/auth';
import { BadRequestError, sendError, UnauthorizedError } from '../utilities/httpErrors';

export async function getProjectInventory(
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

    const baseInventory = await InventoryRepository.getProjectInventoryWithSpecs(
      projectId
    );

    const inventory = await Promise.all(
      baseInventory.map(async (item) => {
        const dependencies = await CatalogRepository.getItemDependencies(item.itemId);
        return {
          ...item,
          dependencies,
        };
      })
    );

    res.json({ inventory });
  } catch (error) {
    sendError(res, error);
  }
}
