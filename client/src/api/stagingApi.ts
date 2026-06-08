import { fetchWrapper } from './fetchWrapper';
import type { ApproveStagingResult } from '../types/staging';

export async function approveStagingItem(
  projectId: string,
  stagingId: string
): Promise<ApproveStagingResult> {
  return fetchWrapper<ApproveStagingResult>({
    endpoint: `projects/${projectId}/staging/${stagingId}/approve`,
    method: 'POST',
  });
}
