export interface StagingOriginalRawData {
  rawRow?: string;
  pageIndex?: number;
  true_page_num?: number;
  truePageNum?: number;
  extractorVersion?: string;
}

export interface ManufacturerRecord {
  manufacturerId: number;
  name: string;
  websiteUrl: string | null;
  supportPhone: string | null;
  address: string | null;
  procurementUrl: string | null;
  primaryContact?: string | null;
}

export interface StagingItem {
  stagingId: string;
  projectId: number;
  sourceDocumentId: string;
  sourceType: 'InternalProject' | 'ExternalImport';
  externalRecordRef: string | null;
  categoryName: string | null;
  manufacturer: string | null;
  manufacturerId: number | null;
  extractedManufacturer: string | null;
  extractedMfgAddress: string | null;
  extractedMfgPhone: string | null;
  extractedMfgWebsite: string | null;
  extractedMfgContact: string | null;
  modelNumber: string | null;
  description: string | null;
  locationInBuilding: string | null;
  quantity: number;
  originalRawData: Record<string, unknown> | string | null;
  reviewStatus: 'Processing' | 'Pending' | 'Approved' | 'Rejected';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApproveStagingResult {
  manufacturerId: number;
  itemId: string;
  inventoryId: string;
  catalogCreated: boolean;
}

export type ReconciliationChoice =
  | 'approved_master_update'
  | 'dismissed_staged'
  | 'fork_branch';

export interface StagingReconciliationEntry {
  choice: ReconciliationChoice;
  resolvedAt: string;
}

export type StagingReconciliationMap = Record<string, StagingReconciliationEntry>;
