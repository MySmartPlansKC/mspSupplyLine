import { RowDataPacket } from 'mysql2';

import { isSaturnPoolConfigured, saturnQuery } from '../../config/database';



const SATURN_PROJECT_HYDRATION_SQL = `

  SELECT

    p.project_id,

    p.project_name,

    p.project_address,

    p.project_city,

    p.project_state,

    p.project_zip,

    p.project_country,

    p.project_status,

    p.project_billing,

    p.project_billing_email,

    gc.gc_name AS gc_name,

    gc.gc_email AS gc_email,

    gc.gc_phone AS gc_phone

  FROM projects p

  LEFT JOIN general_contractors gc ON gc.gc_identifier = p.gc_identifier

`;



export interface SaturnProjectHydration {

  mspSaturnProjectRef: number;

  projectName: string;

  projectAddress: string | null;

  projectCity: string | null;

  projectState: string | null;

  projectZip: string | null;

  countryCode: string;

  fundingCompanyName: string | null;

  projectManagerName: string | null;

  projectManagerEmail: string | null;

  projectManagerPhone: string | null;

  projectStatus: string | null;

}



interface SaturnProjectRow extends RowDataPacket {

  project_id: number;

  project_name: string;

  project_address: string | null;

  project_city: string | null;

  project_state: string | null;

  project_zip: string | null;

  project_country: string | null;

  project_status: string | null;

  project_billing: string | null;

  project_billing_email: string | null;

  gc_name: string | null;

  gc_email: string | null;

  gc_phone: string | null;

}



function normalizeCountryCode(value: string | null | undefined): string {

  const trimmed = (value ?? '').trim();

  if (!trimmed) return 'US';

  if (trimmed.length === 2) return trimmed.toUpperCase();

  const upper = trimmed.toUpperCase();

  if (upper === 'UNITED STATES' || upper === 'USA') return 'US';

  return trimmed.slice(0, 2).toUpperCase();

}



function mapSaturnRow(row: SaturnProjectRow): SaturnProjectHydration {

  return {

    mspSaturnProjectRef: row.project_id,

    projectName: row.project_name,

    projectAddress: row.project_address,

    projectCity: row.project_city,

    projectState: row.project_state,

    projectZip: row.project_zip,

    countryCode: normalizeCountryCode(row.project_country),

    fundingCompanyName: row.project_billing,

    projectManagerName: row.gc_name,

    projectManagerEmail: row.gc_email ?? row.project_billing_email,

    projectManagerPhone: row.gc_phone,

    projectStatus: row.project_status,

  };

}



export async function getSaturnAvailableProjects(

  usedRefs: number[]

): Promise<SaturnProjectHydration[]> {

  if (!isSaturnPoolConfigured()) {

    return [];

  }



  const uniqueRefs = [...new Set(usedRefs.filter((ref) => Number.isInteger(ref) && ref > 0))];



  let sql = `${SATURN_PROJECT_HYDRATION_SQL}

    WHERE LOWER(COALESCE(p.project_status, '')) <> 'archived'`;

  const params: number[] = [];



  if (uniqueRefs.length > 0) {

    const placeholders = uniqueRefs.map(() => '?').join(', ');

    sql += ` AND p.project_id NOT IN (${placeholders})`;

    params.push(...uniqueRefs);

  }



  sql += ' ORDER BY p.project_name ASC';



  const rows = await saturnQuery<SaturnProjectRow[]>(sql, params);

  return rows.map(mapSaturnRow);

}



export async function getSaturnProjectById(

  projectId: number

): Promise<SaturnProjectHydration | null> {

  if (!isSaturnPoolConfigured()) {

    return null;

  }



  const rows = await saturnQuery<SaturnProjectRow[]>(

    `${SATURN_PROJECT_HYDRATION_SQL}

     WHERE p.project_id = ?

     LIMIT 1`,

    [projectId]

  );



  if (rows.length === 0) {

    return null;

  }



  return mapSaturnRow(rows[0]);

}


