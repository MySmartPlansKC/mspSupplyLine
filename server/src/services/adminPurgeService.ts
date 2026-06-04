import { ResultSetHeader } from 'mysql2';
import { getConnection } from '../../config/database';

export interface PurgeProjectTestDataResult {
  projectId: number;
  deletedStaging: number;
  deletedDocuments: number;
}

export async function purgeProjectTestData(
  projectId: number
): Promise<PurgeProjectTestDataResult> {
  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    const [stagingResult] = await connection.execute<ResultSetHeader>(
      'DELETE FROM sl_Staging WHERE ProjectID = ?',
      [projectId]
    );

    const [documentsResult] = await connection.execute<ResultSetHeader>(
      'DELETE FROM sl_SubmittalDocuments WHERE ProjectID = ?',
      [projectId]
    );

    await connection.commit();

    return {
      projectId,
      deletedStaging: stagingResult.affectedRows,
      deletedDocuments: documentsResult.affectedRows,
    };
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('[adminPurge] rollback failed', { projectId, rollbackError });
    }

    console.error('[adminPurge] purge failed', { projectId, error });
    throw error;
  } finally {
    connection.release();
  }
}
