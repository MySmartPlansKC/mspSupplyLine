import pdfParse from 'pdf-parse';
import type { StagingIngestInput } from '../repositories/StagingRepository';
import { BadRequestError } from '../utilities/httpErrors';

export const EXTRACTOR_VERSION = '3.0.0';
export const PARSER_ENGINE = 'multi-window-hybrid';

/** Large CAD submittals can exceed 2 min — align with MySmartPlansAI AI_WORKER_FETCH_TIMEOUT_MS (default 15 min). */
function aiTunnelTimeoutMs(): number {
  const raw = process.env.SUPPLYLINE_AI_TUNNEL_TIMEOUT_MS?.trim();
  const n = raw ? Number(raw) : Number.NaN;
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return 900_000;
}

const PACKET_LABELS = {
  submittal: /submittal\s*(?:no|number|#)?\s*[:\-]?\s*(.+)/i,
  submittalAlt: /sub\s*(?:no|#)?\s*[:\-]?\s*(.+)/i,
  division: /(?:spec\s*)?division\s*(?:title)?\s*[:\-]?\s*(.+)/i,
  section: /section\s*(?:name|title)?\s*[:\-]?\s*(.+)/i,
} as const;

function trimOptional(value: string | null | undefined, maxLength: number): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, maxLength);
}

export interface SubmittalCoverContext {
  externalRecordRef: string | null;
  categoryName: string | null;
  manufacturer: string | null;
  manufacturerAddress: string | null;
  manufacturerPhone: string | null;
  manufacturerWebsite: string | null;
  manufacturerContact: string | null;
}

export interface SubmittalPacketDetails {
  externalRecordRef: string | null;
  categoryName: string | null;
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
  manufacturerName?: string;
  manufacturer?: string;
  extractedManufacturer?: string;
  fabricator?: string;
  extractedMfgAddress?: string;
  extracted_mfg_address?: string;
  manufacturerAddress?: string;
  address?: string;
  extractedMfgPhone?: string;
  extracted_mfg_phone?: string;
  manufacturerPhone?: string;
  phone?: string;
  extractedMfgWebsite?: string;
  extracted_mfg_website?: string;
  manufacturerWebsite?: string;
  website?: string;
  extractedMfgContact?: string;
  extracted_mfg_contact?: string;
  manufacturerContact?: string;
  contact?: string;
}

interface AiSubmittalCover {
  manufacturerName?: string;
  manufacturerAddress?: string;
  manufacturerPhone?: string;
  manufacturerWebsite?: string;
  manufacturerContact?: string;
  externalRecordRef?: string;
  categoryName?: string;
}

type AiSubmittalResponse = AiSubmittalItem[] | { items?: AiSubmittalItem[] };

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

function readStringField(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

export function liftManufacturerCoverFromAiItems(
  items: unknown[]
): AiSubmittalCover | undefined {
  if (items.length === 0) {
    return undefined;
  }

  const first = items[0];
  if (!first || typeof first !== 'object' || Array.isArray(first)) {
    return undefined;
  }

  const record = first as Record<string, unknown>;
  const cover: AiSubmittalCover = {
    manufacturerName: readStringField(
      record,
      'manufacturerName',
      'manufacturer',
      'extractedManufacturer',
      'fabricator'
    ),
    manufacturerAddress: readStringField(
      record,
      'extractedMfgAddress',
      'extracted_mfg_address',
      'manufacturerAddress',
      'address'
    ),
    manufacturerPhone: readStringField(
      record,
      'extractedMfgPhone',
      'extracted_mfg_phone',
      'manufacturerPhone',
      'phone',
      'supportPhone'
    ),
    manufacturerWebsite: readStringField(
      record,
      'extractedMfgWebsite',
      'extracted_mfg_website',
      'manufacturerWebsite',
      'website',
      'websiteUrl'
    ),
    manufacturerContact: readStringField(
      record,
      'extractedMfgContact',
      'extracted_mfg_contact',
      'manufacturerContact',
      'contact',
      'primaryContact',
      'projectManagerName'
    ),
  };

  const hasAnyField = Object.values(cover).some((value) => typeof value === 'string' && value.length > 0);
  return hasAnyField ? cover : undefined;
}

function extractPacketDetailsFromLines(lines: string[]): SubmittalPacketDetails {
  const details: SubmittalPacketDetails = {
    externalRecordRef: null,
    categoryName: null,
  };

  for (const line of lines) {
    if (!details.externalRecordRef) {
      details.externalRecordRef =
        captureLabelValue(line, PACKET_LABELS.submittal) ??
        captureLabelValue(line, PACKET_LABELS.submittalAlt);
    }
    if (!details.categoryName) {
      details.categoryName =
        captureLabelValue(line, PACKET_LABELS.division) ??
        captureLabelValue(line, PACKET_LABELS.section);
    }
  }

  return details;
}

function normalizeAiCover(raw: AiSubmittalCover | undefined): AiSubmittalCover | undefined {
  if (!raw) {
    return undefined;
  }

  return {
    manufacturerName: raw.manufacturerName,
    manufacturerAddress: raw.manufacturerAddress,
    manufacturerPhone: raw.manufacturerPhone,
    manufacturerWebsite: raw.manufacturerWebsite,
    manufacturerContact: raw.manufacturerContact,
    externalRecordRef: raw.externalRecordRef,
    categoryName: raw.categoryName,
  };
}

function mergePacketAndAiCover(
  packet: SubmittalPacketDetails,
  aiCover: AiSubmittalCover | undefined
): SubmittalCoverContext {
  const normalized = normalizeAiCover(aiCover);

  return {
    externalRecordRef:
      packet.externalRecordRef ?? trimOptional(normalized?.externalRecordRef, 255),
    categoryName: packet.categoryName ?? trimOptional(normalized?.categoryName, 255),
    manufacturer: trimManufacturerValue(normalized?.manufacturerName ?? '') ?? null,
    manufacturerAddress: trimOptional(normalized?.manufacturerAddress, 500),
    manufacturerPhone: trimOptional(normalized?.manufacturerPhone, 50),
    manufacturerWebsite: trimOptional(normalized?.manufacturerWebsite, 255),
    manufacturerContact: trimOptional(normalized?.manufacturerContact, 255),
  };
}

function parsePass1PacketDetails(pages: string[]): SubmittalPacketDetails {
  const coverWindow = pages.slice(0, 2).join('\n');
  let lines = normalizeLines(coverWindow);

  if (lines.length === 0 && pages[0]) {
    lines = normalizeLines(pages[0].slice(0, 4000));
  }

  return extractPacketDetailsFromLines(lines);
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

function unwrapAiSubmittalItems(payload: AiSubmittalResponse): AiSubmittalItem[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.items ?? [];
}

function mapAiResponseToSubmittalLines(items: AiSubmittalItem[]): PdfParsedLine[] {
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
  pdfBuffer: Buffer
): Promise<AiSubmittalResponse> {
  const formData = new FormData();
  formData.append(
    'file',
    new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' }),
    'submittal.pdf'
  );

  const response = await fetch(`${baseUrl}/supplyline/submittal`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
    },
    body: formData,
    signal: AbortSignal.timeout(aiTunnelTimeoutMs()),
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
  pdfBuffer: Buffer
): Promise<{ lines: PdfParsedLine[]; aiCover?: AiSubmittalCover }> {
  const { baseUrl, apiKey } = readAiTunnelConfig();

  try {
    const payload = await postSubmittalToAiTunnel(baseUrl, apiKey, pdfBuffer);
    const rawItems = unwrapAiSubmittalItems(payload);
    const aiCover = liftManufacturerCoverFromAiItems(rawItems);

    return {
      lines: mapAiResponseToSubmittalLines(rawItems),
      aiCover,
    };
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
        'AI worker must return manufacturerName on the first submittal item before rows can be ingested'
      );
    }

    return {
      externalRecordRef: cover.externalRecordRef,
      categoryName: cover.categoryName,
      extractedManufacturer: manufacturer,
      extractedMfgAddress: trimOptional(cover.manufacturerAddress, 500),
      extractedMfgPhone: trimOptional(cover.manufacturerPhone, 50),
      extractedMfgWebsite: trimOptional(cover.manufacturerWebsite, 255),
      extractedMfgContact: trimOptional(cover.manufacturerContact, 255),
      modelNumber: line.modelNumber,
      description: line.description,
      quantity: line.quantity,
      locationInBuilding: null,
      originalRawData: {
        rawRow: line.rawRow,
        pageIndex: line.pageIndex,
        extractorVersion: EXTRACTOR_VERSION,
        parserEngine: PARSER_ENGINE,
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
  const packet = parsePass1PacketDetails(pages);
  const { lines: submittalLines, aiCover } = await parsePass2SubmittalLines(fileBuffer);
  const mergedCover = mergePacketAndAiCover(packet, aiCover);

  if (submittalLines.length === 0) {
    throw new BadRequestError(
      'No submittal lines returned from SupplyLine AI submittal parser'
    );
  }

  return mapSubmittalLinesToStagingItems(submittalLines, mergedCover);
}
