export interface SlManufacturer {
  ManufacturerID: number;
  Name: string;
  NormalizedName: string;
  WebsiteURL: string | null;
  SupportPhone: string | null;
  ProcurementURL: string | null;
  Address: string | null;
  PrimaryContact: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}
