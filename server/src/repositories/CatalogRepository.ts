import { randomUUID } from 'crypto';
import { RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { query } from '../../config/database';

export interface ItemDependency {
  relationshipId: string;
  primaryItemId: string;
  relatedItemId: string;
  relationType: 'RequiredForInstall' | 'OptionalUpgrade' | 'DirectSubstitute';
  notes: string | null;
  createdAt: Date;
  relatedManufacturer: string;
  relatedModelNumber: string;
  relatedItemDescription: string | null;
}

export interface CatalogUpsertInput {
  manufacturerId: number;
  manufacturer: string;
  modelNumber: string;
  itemDescription: string | null;
  categoryId?: string | null;
}

export interface CatalogUpsertResult {
  itemId: string;
  created: boolean;
}

interface ItemDependencyRow extends RowDataPacket {
  RelationshipID: string;
  PrimaryItemID: string;
  RelatedItemID: string;
  RelationType: 'RequiredForInstall' | 'OptionalUpgrade' | 'DirectSubstitute';
  Notes: string | null;
  CreatedAt: Date;
  RelatedManufacturer: string;
  RelatedModelNumber: string;
  RelatedItemDescription: string | null;
}

interface CatalogItemRow extends RowDataPacket {
  ItemID: string;
  ManufacturerID: number | null;
}

function mapItemDependencyRow(row: ItemDependencyRow): ItemDependency {
  return {
    relationshipId: row.RelationshipID,
    primaryItemId: row.PrimaryItemID,
    relatedItemId: row.RelatedItemID,
    relationType: row.RelationType,
    notes: row.Notes,
    createdAt: row.CreatedAt,
    relatedManufacturer: row.RelatedManufacturer,
    relatedModelNumber: row.RelatedModelNumber,
    relatedItemDescription: row.RelatedItemDescription,
  };
}

export class CatalogRepository {
  static async getItemDependencies(itemId: string): Promise<ItemDependency[]> {
    const rows = await query<ItemDependencyRow[]>(
      `SELECT
          cr.RelationshipID,
          cr.PrimaryItemID,
          cr.RelatedItemID,
          cr.RelationType,
          cr.Notes,
          cr.CreatedAt,
          mc.Manufacturer AS RelatedManufacturer,
          mc.ModelNumber AS RelatedModelNumber,
          mc.ItemDescription AS RelatedItemDescription
       FROM sl_CatalogRelationships cr
       INNER JOIN sl_MasterCatalog mc ON mc.ItemID = cr.RelatedItemID
       WHERE cr.PrimaryItemID = ?
       ORDER BY cr.CreatedAt DESC`,
      [itemId]
    );

    return rows.map(mapItemDependencyRow);
  }

  static async findByManufacturerAndModel(
    connection: PoolConnection,
    manufacturer: string,
    modelNumber: string
  ): Promise<{ itemId: string; manufacturerId: number | null } | null> {
    const [rows] = await connection.execute<CatalogItemRow[]>(
      `SELECT ItemID, ManufacturerID
       FROM sl_MasterCatalog
       WHERE Manufacturer = ? AND ModelNumber = ?
       LIMIT 1`,
      [manufacturer, modelNumber]
    );

    if (rows.length === 0) {
      return null;
    }

    return {
      itemId: rows[0].ItemID,
      manufacturerId: rows[0].ManufacturerID,
    };
  }

  static async upsertCatalogItem(
    connection: PoolConnection,
    input: CatalogUpsertInput
  ): Promise<CatalogUpsertResult> {
    const existing = await CatalogRepository.findByManufacturerAndModel(
      connection,
      input.manufacturer,
      input.modelNumber
    );

    if (existing) {
      await connection.execute(
        `UPDATE sl_MasterCatalog
         SET ManufacturerID = COALESCE(ManufacturerID, ?),
             ItemDescription = COALESCE(?, ItemDescription),
             CategoryID = COALESCE(?, CategoryID)
         WHERE ItemID = ?`,
        [
          input.manufacturerId,
          input.itemDescription,
          input.categoryId ?? null,
          existing.itemId,
        ]
      );

      return { itemId: existing.itemId, created: false };
    }

    const itemId = randomUUID();
    await connection.execute(
      `INSERT INTO sl_MasterCatalog (
        ItemID,
        Manufacturer,
        ModelNumber,
        ItemDescription,
        CategoryID,
        ManufacturerID
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        itemId,
        input.manufacturer,
        input.modelNumber,
        input.itemDescription,
        input.categoryId ?? null,
        input.manufacturerId,
      ]
    );

    return { itemId, created: true };
  }
}
