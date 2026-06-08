export type StagingSourceType = 'InternalProject' | 'ExternalImport';

export type StagingReviewStatus = 'Processing' | 'Pending' | 'Approved' | 'Rejected';

export interface SlStaging {
  StagingID: string;
  ProjectID: number;
  SourceType: StagingSourceType;
  ExternalRecordRef: string | null;
  CategoryName: string | null;
  Manufacturer: string | null;
  ManufacturerID: number | null;
  ExtractedManufacturer: string | null;
  ExtractedMfgAddress: string | null;
  ExtractedMfgPhone: string | null;
  ExtractedMfgWebsite: string | null;
  ExtractedMfgContact: string | null;
  StagedAddress: string | null;
  StagedPhone: string | null;
  ModelNumber: string | null;
  Description: string | null;
  LocationInBuilding: string | null;
  Quantity: number;
  OriginalRawData: Record<string, unknown> | null;
  ReviewStatus: StagingReviewStatus;
  CreatedBy: string;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export type SlStagingInsert = Omit<
  SlStaging,
  'StagingID' | 'CreatedAt' | 'UpdatedAt'
> & {
  Quantity?: number;
  ReviewStatus?: StagingReviewStatus;
};
