export type ProjectStatus = 'Active' | 'Archived';

export interface SlProject {
  ProjectID: number;
  ClientID: string;
  MspSaturnProjectRef: number | null;
  ProjectName: string;
  ProjectStatus: ProjectStatus;
  ProjectAddress: string | null;
  ProjectCity: string | null;
  ProjectState: string | null;
  ProjectZip: string | null;
  CountryCode: string;
  ProjectLocale: string | null;
  FundingCompanyName: string | null;
  PurchaseOrderNumber: string | null;
  ProjectManagerName: string | null;
  ProjectManagerEmail: string | null;
  ProjectManagerPhone: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export type SlProjectInsert = Omit<
  SlProject,
  'ProjectID' | 'CreatedAt' | 'UpdatedAt'
>;
