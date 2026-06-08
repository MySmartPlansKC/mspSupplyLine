const CORPORATE_SUFFIX_PATTERN = /\b(?:inc|llc|ltd|co|corp|company)\b\.?/gi;
const TRAILING_PUNCTUATION_PATTERN = /[.,;:!?'"]+$/;

export function normalizeManufacturerName(raw: string): string {
  let name = raw.trim();
  name = name.replace(/\s+/g, ' ');
  name = name.replace(TRAILING_PUNCTUATION_PATTERN, '');
  name = name.replace(CORPORATE_SUFFIX_PATTERN, '').trim();
  name = name.replace(/\s+/g, ' ');
  return name.toUpperCase();
}

export function isUsableManufacturerName(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) {
    return false;
  }

  const normalized = normalizeManufacturerName(trimmed);
  return normalized.length > 0;
}
