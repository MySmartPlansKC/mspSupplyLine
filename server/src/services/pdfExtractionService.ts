import pdfParse from 'pdf-parse';
import type { StagingIngestInput } from '../repositories/StagingRepository';
import { BadRequestError } from '../utilities/httpErrors';

export const EXTRACTOR_VERSION = '2.0.0';

const AI_TUNNEL_TIMEOUT_MS = 120_000;

const COVER_LABELS = {
  submittal: /submittal\s*(?:no|number|#)?\s*[:\-]?\s*(.+)/i,
  submittalAlt: /sub\s*(?:no|#)?\s*[:\-]?\s*(.+)/i,
  division: /(?:spec\s*)?division\s*(?:title)?\s*[:\-]?\s*(.+)/i,
  section: /section\s*(?:name|title)?\s*[:\-]?\s*(.+)/i,
  fabricator: /(?:fabricator|vendor|manufacturer|supplier|contractor)\s*[:\-]?\s*(.+)/i,
} as const;

/** Fallback: "Received From ... (Company Name)" title-block layouts. */
const RECEIVED_FROM_PARENS_REGEX = /received\s*from[^(\n]*\(([^)]+)\)/i;

/** Fallback: trailing vendor block on submittal package header lines. */
const SUBMITTAL_PACKAGE_VENDOR_REGEX = /submittal package.*-\s*([^-\n]+)$/i;

export interface SubmittalCoverContext {
  externalRecordRef: string | null;
  categoryName: string | null;
  manufacturer: string | null;
}

export interface PdfParsedLine {
  rawRow: string;
  modelNumber: string;
  description: string | null;
  quantity: number;
  pageIndex: number;
}

interface AiSubmittalItem {
  partToken?: string;
  quantity?: number;
  description?: string | null;
  rawRow?: string;
  pageIndex?: number;
}

interface AiSubmittalResponse {
  items?: AiSubmittalItem[];
}

function normalizeLines(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);
}

function splitPages(fullText: string, numPages: number): string[] {
  if (fullText.includes('\f')) {
    const parts = fullText.split('\f').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts;
  }

  const lines = normalizeLines(fullText);
  if (numPages <= 1 || lines.length === 0) {
    return [fullText];
  }

  const perPage = Math.max(1, Math.ceil(lines.length / numPages));
  const pages: string[] = [];
  for (let i = 0; i < lines.length; i += perPage) {
    pages.push(lines.slice(i, i + perPage).join('\n'));
  }
  return pages;
}

function captureLabelValue(line: string, pattern: RegExp): string | null {
  const match = line.match(pattern);
  if (!match?.[1]) return null;
  const value = match[1].trim();
  return value.length > 0 ? value.slice(0, 255) : null;
}

function trimManufacturerValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 255) : null;
}

function extractManufacturerFallbacks(lines: string[]): string | null {
  for (const line of lines) {
    if (/received\s*from/i.test(line)) {
      const receivedFromMatch = line.match(RECEIVED_FROM_PARENS_REGEX);
      if (receivedFromMatch?.[1]) {
        const manufacturer = trimManufacturerValue(receivedFromMatch[1]);
        if (manufacturer) return manufacturer;
      }
    }
  }

  for (const line of lines) {
    const packageMatch = line.match(SUBMITTAL_PACKAGE_VENDOR_REGEX);
    if (packageMatch?.[1]) {
      const manufacturer = trimManufacturerValue(packageMatch[1]);
      if (manufacturer) return manufacturer;
    }
  }

  return null;
}

function extractCoverFromLines(lines: string[]): SubmittalCoverContext {
  const context: SubmittalCoverContext = {
    externalRecordRef: null,
    categoryName: null,
    manufacturer: null,
  };

  for (const line of lines) {
    if (!context.externalRecordRef) {
      context.externalRecordRef =
        captureLabelValue(line, COVER_LABELS.submittal) ??
        captureLabelValue(line, COVER_LABELS.submittalAlt);
    }
    if (!context.categoryName) {
      context.categoryName =
        captureLabelValue(line, COVER_LABELS.division) ??
        captureLabelValue(line, COVER_LABELS.section);
    }
    if (!context.manufacturer) {
      context.manufacturer = captureLabelValue(line, COVER_LABELS.fabricator);
    }
  }

  if (!context.manufacturer) {
    context.manufacturer = extractManufacturerFallbacks(lines);
  }

  return context;
}

function parsePass1Cover(pages: string[]): SubmittalCoverContext {
  const coverWindow = pages.slice(0, 2).join('\n');
  let lines = normalizeLines(coverWindow);

  if (lines.length === 0 && pages[0]) {
    lines = normalizeLines(pages[0].slice(0, 4000));
  }

  return extractCoverFromLines(lines);
}

function readAiTunnelConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.MY_SMART_PLANS_AI_URL?.trim();
  const apiKey = process.env.MY_SMART_PLANS_AI_KEY?.trim();

  if (!baseUrl || !apiKey) {
    throw new BadRequestError(
      'SupplyLine AI tunnel is not configured (MY_SMART_PLANS_AI_URL / MY_SMART_PLANS_AI_KEY)'
    );
  }

  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey };
}

function normalizeAiQuantity(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

function mapAiResponseToSubmittalLines(
  payload: AiSubmittalResponse | AiSubmittalItem[]
): PdfParsedLine[] {
  const items = Array.isArray(payload) ? payload : (payload.items ?? []);

  return items
    .map((item) => {
      const partToken = item.partToken?.trim();
      if (!partToken) return null;

      const quantity = normalizeAiQuantity(item.quantity);
      const description =
        typeof item.description === 'string' && item.description.trim().length > 0
          ? item.description.trim().slice(0, 2000)
          : null;
      const rawRow =
        typeof item.rawRow === 'string' && item.rawRow.trim().length > 0
          ? item.rawRow.trim()
          : [partToken, description, `Qty: ${quantity}`].filter(Boolean).join(' | ');
      const pageIndex =
        typeof item.pageIndex === 'number' && Number.isInteger(item.pageIndex) && item.pageIndex >= 1
          ? item.pageIndex
          : 1;

      return {
        rawRow,
        modelNumber: partToken.slice(0, 255),
        description,
        quantity,
        pageIndex,
      } satisfies PdfParsedLine;
    })
    .filter((line): line is PdfParsedLine => line !== null);
}

function logAiTunnelFailure(error: unknown, context?: Record<string, unknown>): void {
  if (error instanceof Error) {
    console.error('[parsePass2SubmittalLines] SupplyLine AI tunnel request failed', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      ...context,
    });
    return;
  }

  console.error('[parsePass2SubmittalLines] SupplyLine AI tunnel request failed', {
    error,
    ...context,
  });
}

async function postSubmittalToAiTunnel(
  baseUrl: string,
  apiKey: string,
  rawText: string
): Promise<AiSubmittalResponse> {
  const response = await fetch(`${baseUrl}/supplyline/submittal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ rawText }),
    signal: AbortSignal.timeout(AI_TUNNEL_TIMEOUT_MS),
  });

  const responseBody = (await response.json().catch(() => null)) as AiSubmittalResponse | null;

  if (!response.ok) {
    logAiTunnelFailure(new Error(`HTTP ${response.status} ${response.statusText}`), {
      status: response.status,
      statusText: response.statusText,
      responseBody,
    });
    throw new BadRequestError(
      `SupplyLine AI tunnel returned HTTP ${response.status} while processing submittal items`
    );
  }

  if (!responseBody) {
    throw new BadRequestError('SupplyLine AI tunnel returned an empty response body');
  }

  return responseBody;
}

async function parsePass2SubmittalLines(
  pages: string[],
  cover: SubmittalCoverContext
): Promise<PdfParsedLine[]> {
  void cover;

  const { baseUrl, apiKey } = readAiTunnelConfig();
  const rawText = pages.join('\n');

  try {
    const payload = await postSubmittalToAiTunnel(baseUrl, apiKey, rawText);
    return mapAiResponseToSubmittalLines(payload);
  } catch (error) {
    if (!(error instanceof BadRequestError)) {
      logAiTunnelFailure(error);

      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new BadRequestError(
          'SupplyLine AI tunnel timed out while processing submittal items'
        );
      }

      if (error instanceof TypeError) {
        throw new BadRequestError(
          'SupplyLine AI tunnel is unreachable while processing submittal items'
        );
      }

      throw new BadRequestError('SupplyLine AI tunnel failed while processing submittal items');
    }

    throw error;
  }
}

function mapSubmittalLinesToStagingItems(
  submittalLines: PdfParsedLine[],
  cover: SubmittalCoverContext
): StagingIngestInput[] {
  return submittalLines.map((line) => {
    const manufacturer = cover.manufacturer?.trim();
    if (!manufacturer) {
      throw new BadRequestError(
        'PDF cover block must include a fabricator/vendor before submittal rows can be ingested'
      );
    }

    return {
      externalRecordRef: cover.externalRecordRef,
      categoryName: cover.categoryName,
      manufacturer,
      modelNumber: line.modelNumber,
      description: line.description,
      quantity: line.quantity,
      locationInBuilding: null,
      originalRawData: {
        rawRow: line.rawRow,
        pageIndex: line.pageIndex,
        extractorVersion: EXTRACTOR_VERSION,
      },
    };
  });
}

export async function processSubmittalPDF(fileBuffer: Buffer): Promise<StagingIngestInput[]> {
  if (!fileBuffer?.length) {
    throw new BadRequestError('PDF file buffer is empty');
  }

  let parsed: { text: string; numpages: number };
  try {
    parsed = await pdfParse(fileBuffer);
  } catch {
    throw new BadRequestError('Unable to read PDF document');
  }

  const text = parsed.text?.trim() ?? '';
  if (!text) {
    throw new BadRequestError('PDF contains no extractable text');
  }

  const pages = splitPages(text, parsed.numpages ?? 1);
  const cover = parsePass1Cover(pages);
  const submittalLines = await parsePass2SubmittalLines(pages, cover);

  if (submittalLines.length === 0) {
    throw new BadRequestError(
      'No submittal lines returned from SupplyLine AI submittal parser'
    );
  }

  return mapSubmittalLinesToStagingItems(submittalLines, cover);
}
