import type { StagingItem, StagingOriginalRawData } from '../types/staging';

function parseOriginalRawData(
  originalRawData: StagingItem['originalRawData']
): StagingOriginalRawData | Record<string, unknown> | null {
  if (!originalRawData) {
    return null;
  }

  if (typeof originalRawData === 'string') {
    try {
      return JSON.parse(originalRawData) as StagingOriginalRawData;
    } catch {
      return null;
    }
  }

  return originalRawData;
}

function readPositiveInt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1) {
    return value;
  }
  return undefined;
}

export function getDisplayPageNum(item: StagingItem): number {
  const rawDataObj = parseOriginalRawData(item.originalRawData);
  if (!rawDataObj) {
    return 1;
  }

  const truePageSnake = readPositiveInt((rawDataObj as Record<string, unknown>).true_page_num);
  if (truePageSnake !== undefined) {
    return truePageSnake;
  }

  const truePageCamel = readPositiveInt((rawDataObj as StagingOriginalRawData).truePageNum);
  if (truePageCamel !== undefined) {
    return truePageCamel;
  }

  const pageIndex =
    readPositiveInt((rawDataObj as StagingOriginalRawData).pageIndex) ??
    readPositiveInt((rawDataObj as Record<string, unknown>).page_index);
  if (pageIndex !== undefined) {
    return pageIndex;
  }

  return 1;
}

export function getDisplayManufacturer(item: StagingItem): string {
  const name = item.extractedManufacturer ?? item.manufacturer;
  const trimmed = name?.trim();
  return trimmed ? trimmed : '—';
}
