export type AccountStatus = 'Active' | 'Suspended' | 'Trial' | 'Cancelled';

export interface SlClient {
  ClientID: string;
  ClientName: string;
  CorporateAddress1: string | null;
  CorporateAddress2: string | null;
  City: string | null;
  StateProvince: string | null;
  PostalCode: string | null;
  CountryCode: string;
  PrimaryContactName: string | null;
  PrimaryContactEmail: string | null;
  PrimaryContactPhone: string | null;
  BillingEmail: string | null;
  DefaultLocale: string | null;
  AccountStatus: AccountStatus;
  Notes: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export type SlClientInsert = Omit<SlClient, 'CreatedAt' | 'UpdatedAt'>;
