import { fetchWrapper } from './fetchWrapper';
import type { ManufacturerRecord } from '../types/staging';

export interface ManufacturerUpdatePayload {
  name?: string | null;
  address?: string | null;
  supportPhone?: string | null;
  websiteUrl?: string | null;
  procurementUrl?: string | null;
  primaryContact?: string | null;
}

export async function updateManufacturer(
  manufacturerId: number,
  payload: ManufacturerUpdatePayload
): Promise<ManufacturerRecord> {
  const response = await fetchWrapper<{ manufacturer: ManufacturerRecord }>({
    endpoint: `manufacturers/${manufacturerId}`,
    method: 'PUT',
    body: payload,
  });
  return response.manufacturer;
}
