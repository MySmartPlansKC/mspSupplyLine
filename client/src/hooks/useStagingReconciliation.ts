import { useCallback, useState } from 'react';
import type {
  ReconciliationChoice,
  StagingReconciliationEntry,
  StagingReconciliationMap,
} from '../types/staging';

const STORAGE_KEY = 'sl_staging_reconciliation_v1';

function readStoredMap(): StagingReconciliationMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as StagingReconciliationMap;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

function writeStoredMap(map: StagingReconciliationMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export interface StagingReconciliationApi {
  getChoice: (stagingId: string) => StagingReconciliationEntry | null;
  setChoice: (stagingId: string, choice: ReconciliationChoice) => void;
  isResolved: (stagingId: string) => boolean;
}

export function useStagingReconciliation(): StagingReconciliationApi {
  const [map, setMap] = useState<StagingReconciliationMap>(() => readStoredMap());

  const getChoice = useCallback(
    (stagingId: string): StagingReconciliationEntry | null => map[stagingId] ?? null,
    [map]
  );

  const setChoice = useCallback((stagingId: string, choice: ReconciliationChoice) => {
    setMap((prev) => {
      const next: StagingReconciliationMap = {
        ...prev,
        [stagingId]: {
          choice,
          resolvedAt: new Date().toISOString(),
        },
      };
      writeStoredMap(next);
      return next;
    });
  }, []);

  const isResolved = useCallback(
    (stagingId: string): boolean => Boolean(map[stagingId]),
    [map]
  );

  return { getChoice, setChoice, isResolved };
}
