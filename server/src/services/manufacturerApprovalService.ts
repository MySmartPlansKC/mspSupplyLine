import { getConnection } from '../../config/database';
import { CatalogRepository } from '../repositories/CatalogRepository';
import { InventoryRepository } from '../repositories/InventoryRepository';
import { ManufacturerRepository } from '../repositories/ManufacturerRepository';
import { StagingRepository } from '../repositories/StagingRepository';
import { SubmittalDocumentRepository } from '../repositories/SubmittalDocumentRepository';
import {
  enrichManufacturerFromStaging,
  findOrCreateManufacturer,
} from './manufacturerService';
import { BadRequestError, NotFoundError } from '../utilities/httpErrors';

export interface ApproveStagingItemInput {
  projectId: number;
  stagingId: string;
}

export interface ApproveStagingItemResult {
  manufacturerId: number;
  itemId: string;
  inventoryId: string;
  catalogCreated: boolean;
}

function trimRequired(value: string | null | undefined, field: string): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    throw new BadRequestError(`${field} is required for approval`);
  }
  return trimmed;
}

export async function approveStagingItem(
  input: ApproveStagingItemInput
): Promise<ApproveStagingItemResult> {
  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    const staging = await StagingRepository.findByIdForProject(
      connection,
      input.stagingId,
      input.projectId
    );

    if (!staging) {
      throw new NotFoundError('Staging item not found');
    }

    if (staging.reviewStatus === 'Processing') {
      throw new BadRequestError('Staging item is still being extracted and cannot be approved yet');
    }

    const extractedManufacturer = trimRequired(
      staging.extractedManufacturer,
      'extractedManufacturer'
    );
    const modelNumber = trimRequired(staging.modelNumber, 'modelNumber');

    const masterResult = await findOrCreateManufacturer(connection, extractedManufacturer);
    let master = await ManufacturerRepository.findByIdWithConnection(
      connection,
      masterResult.manufacturerId
    );

    if (!master) {
      throw new BadRequestError('Failed to resolve manufacturer master record.');
    }

    master = await enrichManufacturerFromStaging(connection, master, staging);

    const sourceDocument = await SubmittalDocumentRepository.findByIdWithConnection(
      connection,
      input.projectId,
      staging.sourceDocumentId
    );

    const catalogResult = await CatalogRepository.upsertCatalogItem(connection, {
      manufacturerId: master.manufacturerId,
      manufacturer: master.name,
      modelNumber,
      itemDescription: staging.description,
      categoryId: null,
    });

    const inventoryResult = await InventoryRepository.insertProjectInventory(connection, {
      projectId: input.projectId,
      itemId: catalogResult.itemId,
      quantity: staging.quantity,
      locationInBuilding: staging.locationInBuilding?.trim() || 'Not specified',
      sourceDocumentPath: sourceDocument?.fileTitle ?? null,
    });

    const deleted = await StagingRepository.hardDeleteById(
      connection,
      input.stagingId,
      input.projectId
    );

    if (!deleted) {
      throw new BadRequestError('Failed to remove staging row after promotion.');
    }

    await connection.commit();

    return {
      manufacturerId: master.manufacturerId,
      itemId: catalogResult.itemId,
      inventoryId: inventoryResult.inventoryId,
      catalogCreated: catalogResult.created,
    };
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Connection may already be rolled back.
    }
    throw error;
  } finally {
    connection.release();
  }
}
