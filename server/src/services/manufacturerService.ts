import type { PoolConnection } from 'mysql2/promise';
import {
  ManufacturerRecord,
  ManufacturerRepository,
  ManufacturerUpdateInput,
} from '../repositories/ManufacturerRepository';
import type { ProjectStagingRecord } from '../repositories/StagingRepository';
import { BadRequestError, isDuplicateEntryError } from '../utilities/httpErrors';
import {
  isUsableManufacturerName,
  normalizeManufacturerName,
} from '../utilities/normalizeManufacturerName';

function trimDisplayName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

function isBlank(value: string | null | undefined): boolean {
  return !value?.trim();
}

export interface FindOrCreateManufacturerResult {
  manufacturerId: number;
  name: string;
  created: boolean;
}

export async function findOrCreateManufacturer(
  connection: PoolConnection,
  rawName: string
): Promise<FindOrCreateManufacturerResult> {
  if (!isUsableManufacturerName(rawName)) {
    throw new BadRequestError('manufacturer is required');
  }

  const displayName = trimDisplayName(rawName);
  const normalizedName = normalizeManufacturerName(displayName);

  const existing = await ManufacturerRepository.findByNormalizedName(
    connection,
    normalizedName
  );
  if (existing) {
    return {
      manufacturerId: existing.manufacturerId,
      name: existing.name,
      created: false,
    };
  }

  try {
    const created = await ManufacturerRepository.insertManufacturer(connection, {
      name: displayName,
      normalizedName,
    });
    return {
      manufacturerId: created.manufacturerId,
      name: created.name,
      created: true,
    };
  } catch (error) {
    if (!isDuplicateEntryError(error)) {
      throw error;
    }

    const raced = await ManufacturerRepository.findByNormalizedName(
      connection,
      normalizedName
    );
    if (!raced) {
      throw error;
    }

    return {
      manufacturerId: raced.manufacturerId,
      name: raced.name,
      created: false,
    };
  }
}

export async function enrichManufacturerFromStaging(
  connection: PoolConnection,
  manufacturer: ManufacturerRecord,
  staging: ProjectStagingRecord
): Promise<ManufacturerRecord> {
  const patch: ManufacturerUpdateInput = {};

  if (isBlank(manufacturer.address) && staging.extractedMfgAddress?.trim()) {
    patch.address = staging.extractedMfgAddress.trim();
  }
  if (isBlank(manufacturer.supportPhone) && staging.extractedMfgPhone?.trim()) {
    patch.supportPhone = staging.extractedMfgPhone.trim();
  }
  if (isBlank(manufacturer.websiteUrl) && staging.extractedMfgWebsite?.trim()) {
    patch.websiteUrl = staging.extractedMfgWebsite.trim();
  }
  if (isBlank(manufacturer.primaryContact) && staging.extractedMfgContact?.trim()) {
    patch.primaryContact = staging.extractedMfgContact.trim();
  }

  if (Object.keys(patch).length === 0) {
    return manufacturer;
  }

  const updated = await ManufacturerRepository.updateByIdWithConnection(
    connection,
    manufacturer.manufacturerId,
    patch
  );

  if (!updated) {
    throw new BadRequestError('Failed to enrich manufacturer record.');
  }

  return updated;
}

export async function updateManufacturerEnrichment(
  manufacturerId: number,
  input: ManufacturerUpdateInput
): Promise<ManufacturerRecord | null> {
  return ManufacturerRepository.updateById(manufacturerId, input);
}
