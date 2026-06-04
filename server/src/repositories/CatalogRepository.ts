import { RowDataPacket } from 'mysql2';
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
}
