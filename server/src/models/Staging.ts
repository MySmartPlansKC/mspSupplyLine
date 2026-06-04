export type StagingSourceType = 'InternalProject' | 'ExternalImport';

export type StagingReviewStatus = 'Pending' | 'Approved' | 'Rejected';

export interface SlStaging {
  StagingID: string;
  ProjectID: number;
  SourceType: StagingSourceType;
  ExternalRecordRef: string | null;
  CategoryName: string | null;
  Manufacturer: string | null;
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
