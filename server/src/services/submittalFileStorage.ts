import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';

const DEFAULT_STORAGE_ROOT = path.join(process.cwd(), 'storage', 'submittals');

function storageRoot(): string {
  const configured = process.env.SUBMITTAL_STORAGE_DIR?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_STORAGE_ROOT;
}

function resolveStoredPath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/');
  if (normalized.includes('..') || path.isAbsolute(normalized)) {
    throw new Error('Invalid submittal storage path');
  }
  const absolute = path.resolve(storageRoot(), normalized);
  const rootWithSep = storageRoot().endsWith(path.sep)
    ? storageRoot()
    : `${storageRoot()}${path.sep}`;
  if (!absolute.startsWith(rootWithSep)) {
    throw new Error('Invalid submittal storage path');
  }
  return absolute;
}

export async function saveSubmittalPdf(
  projectId: number,
  documentId: string,
  fileBuffer: Buffer
): Promise<string> {
  const relativePath = path.posix.join(String(projectId), `${documentId}.pdf`);
  const absolutePath = resolveStoredPath(relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, fileBuffer);
  return relativePath;
}

export async function readSubmittalPdf(relativePath: string): Promise<Buffer> {
  return readFile(resolveStoredPath(relativePath));
}

export async function deleteSubmittalPdf(relativePath: string): Promise<void> {
  try {
    await unlink(resolveStoredPath(relativePath));
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: string }).code)
        : '';
    if (code !== 'ENOENT') {
      throw error;
    }
  }
}
