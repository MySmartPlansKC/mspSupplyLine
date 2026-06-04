import { RowDataPacket } from 'mysql2';
import { query } from '../../config/database';

export interface ProjectInventoryWithSpecs {
  inventoryId: string;
  projectId: number;
  itemId: string;
  quantity: number;
  locationInBuilding: string;
  sourceDocumentPath: string | null;
  installDate: string | null;
  inventoryCreatedAt: Date;
  inventoryUpdatedAt: Date;
  manufacturer: string;
  modelNumber: string;
  itemDescription: string | null;
  specs: Record<string, unknown> | null;
  manufacturerUrl: string | null;
  estimatedUnitPrice: number | null;
  currencyCode: string | null;
  estimatedLeadTimeDays: number | null;
  pricingUpdatedAt: Date | null;
}

interface InventorySpecsRow extends RowDataPacket {
  InventoryID: string;
  ProjectID: number;
  ItemID: string;
  Quantity: number;
  LocationInBuilding: string;
  SourceDocumentPath: string | null;
  InstallDate: string | null;
  InventoryCreatedAt: Date;
  InventoryUpdatedAt: Date;
  Manufacturer: string;
  ModelNumber: string;
  ItemDescription: string | null;
  Specs: Record<string, unknown> | null;
  ManufacturerURL: string | null;
  EstimatedUnitPrice: number | null;
  CurrencyCode: string | null;
  EstimatedLeadTimeDays: number | null;
  PricingUpdatedAt: Date | null;
}

function mapInventorySpecsRow(row: InventorySpecsRow): ProjectInventoryWithSpecs {
  return {
    inventoryId: row.InventoryID,
    projectId: row.ProjectID,
    itemId: row.ItemID,
    quantity: row.Quantity,
    locationInBuilding: row.LocationInBuilding,
    sourceDocumentPath: row.SourceDocumentPath,
    installDate: row.InstallDate,
    inventoryCreatedAt: row.InventoryCreatedAt,
    inventoryUpdatedAt: row.InventoryUpdatedAt,
    manufacturer: row.Manufacturer,
    modelNumber: row.ModelNumber,
    itemDescription: row.ItemDescription,
    specs: row.Specs,
    manufacturerUrl: row.ManufacturerURL,
    estimatedUnitPrice: row.EstimatedUnitPrice,
    currencyCode: row.CurrencyCode,
    estimatedLeadTimeDays: row.EstimatedLeadTimeDays,
    pricingUpdatedAt: row.PricingUpdatedAt,
  };
}

export class InventoryRepository {
  static async getProjectInventoryWithSpecs(
    projectId: number
  ): Promise<ProjectInventoryWithSpecs[]> {
    const rows = await query<InventorySpecsRow[]>(
      `SELECT
          pi.InventoryID,
          pi.ProjectID,
          pi.ItemID,
          pi.Quantity,
          pi.LocationInBuilding,
          pi.SourceDocumentPath,
          pi.InstallDate,
          pi.CreatedAt AS InventoryCreatedAt,
          pi.UpdatedAt AS InventoryUpdatedAt,
          mc.Manufacturer,
          mc.ModelNumber,
          mc.ItemDescription,
          mc.Specs,
          cp.ManufacturerURL,
          cp.EstimatedUnitPrice,
          cp.CurrencyCode,
          cp.EstimatedLeadTimeDays,
          cp.UpdatedAt AS PricingUpdatedAt
       FROM sl_ProjectInventory pi
       INNER JOIN sl_MasterCatalog mc ON mc.ItemID = pi.ItemID
       LEFT JOIN sl_CatalogPricing cp ON cp.ItemID = pi.ItemID
       WHERE pi.ProjectID = ?
       ORDER BY pi.CreatedAt DESC`,
      [projectId]
    );

    return rows.map(mapInventorySpecsRow);
  }
}
