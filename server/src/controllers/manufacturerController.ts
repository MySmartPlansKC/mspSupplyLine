import { Response } from 'express';
import { updateManufacturerEnrichment } from '../services/manufacturerService';
import { AuthRequest } from '../types/auth';
import {
  BadRequestError,
  NotFoundError,
  sendError,
} from '../utilities/httpErrors';

function trimString(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function parseManufacturerId(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseOptionalStringField(
  body: Record<string, unknown>,
  key: string,
  maxLength?: number
): string | null | undefined {
  if (!(key in body)) {
    return undefined;
  }

  const trimmed = trimString(body[key]);
  if (trimmed.length === 0) {
    return null;
  }
  if (maxLength !== undefined && trimmed.length > maxLength) {
    throw new BadRequestError(`${key} must be at most ${maxLength} characters`);
  }
  return trimmed;
}

export async function putManufacturer(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const rawId = req.params.manufacturerId;
    const manufacturerId = parseManufacturerId(
      Array.isArray(rawId) ? rawId[0] : rawId
    );
    if (!manufacturerId) {
      throw new BadRequestError('Invalid manufacturerId');
    }

    const body = req.body as Record<string, unknown>;
    const name = parseOptionalStringField(body, 'name', 255);
    const websiteUrl = parseOptionalStringField(body, 'websiteUrl', 512);
    const supportPhone = parseOptionalStringField(body, 'supportPhone', 64);
    const procurementUrl = parseOptionalStringField(body, 'procurementUrl', 512);
    const address = parseOptionalStringField(body, 'address', 512);

    const hasUpdateField =
      name !== undefined ||
      websiteUrl !== undefined ||
      supportPhone !== undefined ||
      procurementUrl !== undefined ||
      address !== undefined;

    if (!hasUpdateField) {
      throw new BadRequestError(
        'At least one field is required: name, websiteUrl, supportPhone, procurementUrl, address'
      );
    }

    const updated = await updateManufacturerEnrichment(manufacturerId, {
      name: name ?? undefined,
      websiteUrl,
      supportPhone,
      procurementUrl,
      address,
    });

    if (!updated) {
      throw new NotFoundError('Manufacturer not found');
    }

    res.json({ manufacturer: updated });
  } catch (error) {
    sendError(res, error);
  }
}
