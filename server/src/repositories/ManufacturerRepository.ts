import { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { query } from '../../config/database';

export interface ManufacturerRecord {
  manufacturerId: number;
  name: string;
  normalizedName: string;
  websiteUrl: string | null;
  supportPhone: string | null;
  procurementUrl: string | null;
  address: string | null;
  primaryContact: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ManufacturerInsertInput {
  name: string;
  normalizedName: string;
}

export interface ManufacturerUpdateInput {
  name?: string;
  websiteUrl?: string | null;
  supportPhone?: string | null;
  procurementUrl?: string | null;
  address?: string | null;
  primaryContact?: string | null;
}

interface ManufacturerRow extends RowDataPacket {
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

const MANUFACTURER_SELECT_COLUMNS = `
  ManufacturerID,
  Name,
  NormalizedName,
  WebsiteURL,
  SupportPhone,
  ProcurementURL,
  Address,
  PrimaryContact,
  CreatedAt,
  UpdatedAt
`;

function mapManufacturerRow(row: ManufacturerRow): ManufacturerRecord {
  return {
    manufacturerId: row.ManufacturerID,
    name: row.Name,
    normalizedName: row.NormalizedName,
    websiteUrl: row.WebsiteURL,
    supportPhone: row.SupportPhone,
    procurementUrl: row.ProcurementURL,
    address: row.Address,
    primaryContact: row.PrimaryContact,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  };
}

export class ManufacturerRepository {
  static async findByNormalizedName(
    connection: PoolConnection,
    normalizedName: string
  ): Promise<ManufacturerRecord | null> {
    const [rows] = await connection.execute<ManufacturerRow[]>(
      `SELECT ${MANUFACTURER_SELECT_COLUMNS}
       FROM sl_Manufacturers
       WHERE NormalizedName = ?
       LIMIT 1`,
      [normalizedName]
    );

    if (rows.length === 0) {
      return null;
    }

    return mapManufacturerRow(rows[0]);
  }

  static async findById(manufacturerId: number): Promise<ManufacturerRecord | null> {
    const rows = await query<ManufacturerRow[]>(
      `SELECT ${MANUFACTURER_SELECT_COLUMNS}
       FROM sl_Manufacturers
       WHERE ManufacturerID = ?
       LIMIT 1`,
      [manufacturerId]
    );

    if (rows.length === 0) {
      return null;
    }

    return mapManufacturerRow(rows[0]);
  }

  static async findByIdWithConnection(
    connection: PoolConnection,
    manufacturerId: number
  ): Promise<ManufacturerRecord | null> {
    const [rows] = await connection.execute<ManufacturerRow[]>(
      `SELECT ${MANUFACTURER_SELECT_COLUMNS}
       FROM sl_Manufacturers
       WHERE ManufacturerID = ?
       LIMIT 1`,
      [manufacturerId]
    );

    if (rows.length === 0) {
      return null;
    }

    return mapManufacturerRow(rows[0]);
  }

  static async insertManufacturer(
    connection: PoolConnection,
    input: ManufacturerInsertInput
  ): Promise<ManufacturerRecord> {
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO sl_Manufacturers (Name, NormalizedName)
       VALUES (?, ?)`,
      [input.name, input.normalizedName]
    );

    const manufacturerId = result.insertId;
    const created = await ManufacturerRepository.findByIdWithConnection(
      connection,
      manufacturerId
    );

    if (!created) {
      throw new Error(`Failed to load manufacturer after insert (id ${manufacturerId})`);
    }

    return created;
  }

  static async updateById(
    manufacturerId: number,
    input: ManufacturerUpdateInput
  ): Promise<ManufacturerRecord | null> {
    const { setClauses, params } = buildUpdateClauses(input);

    if (setClauses.length === 0) {
      return ManufacturerRepository.findById(manufacturerId);
    }

    params.push(manufacturerId);

    await query(
      `UPDATE sl_Manufacturers
       SET ${setClauses.join(', ')}
       WHERE ManufacturerID = ?`,
      params
    );

    return ManufacturerRepository.findById(manufacturerId);
  }

  static async updateByIdWithConnection(
    connection: PoolConnection,
    manufacturerId: number,
    input: ManufacturerUpdateInput
  ): Promise<ManufacturerRecord | null> {
    const { setClauses, params } = buildUpdateClauses(input);

    if (setClauses.length === 0) {
      return ManufacturerRepository.findByIdWithConnection(connection, manufacturerId);
    }

    params.push(manufacturerId);

    await connection.execute(
      `UPDATE sl_Manufacturers
       SET ${setClauses.join(', ')}
       WHERE ManufacturerID = ?`,
      params
    );

    return ManufacturerRepository.findByIdWithConnection(connection, manufacturerId);
  }
}

function buildUpdateClauses(input: ManufacturerUpdateInput): {
  setClauses: string[];
  params: Array<string | number | null>;
} {
  const setClauses: string[] = [];
  const params: Array<string | number | null> = [];

  if (input.name !== undefined) {
    setClauses.push('Name = ?');
    params.push(input.name);
  }
  if (input.websiteUrl !== undefined) {
    setClauses.push('WebsiteURL = ?');
    params.push(input.websiteUrl);
  }
  if (input.supportPhone !== undefined) {
    setClauses.push('SupportPhone = ?');
    params.push(input.supportPhone);
  }
  if (input.procurementUrl !== undefined) {
    setClauses.push('ProcurementURL = ?');
    params.push(input.procurementUrl);
  }
  if (input.address !== undefined) {
    setClauses.push('Address = ?');
    params.push(input.address);
  }
  if (input.primaryContact !== undefined) {
    setClauses.push('PrimaryContact = ?');
    params.push(input.primaryContact);
  }

  return { setClauses, params };
}
