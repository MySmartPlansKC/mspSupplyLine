import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface DevLoadingPreviewContextValue {
  previewLoading: boolean;
  togglePreviewLoading: () => void;
}

const DevLoadingPreviewContext = createContext<DevLoadingPreviewContextValue | null>(null);

export function DevLoadingPreviewProvider({ children }: { children: ReactNode }) {
  const [previewLoading, setPreviewLoading] = useState(false);

  const togglePreviewLoading = useCallback(() => {
    setPreviewLoading((current) => !current);
  }, []);

  const value = useMemo(
    () => ({ previewLoading, togglePreviewLoading }),
    [previewLoading, togglePreviewLoading]
  );

  return (
    <DevLoadingPreviewContext.Provider value={value}>
      {children}
    </DevLoadingPreviewContext.Provider>
  );
}

export function useDevLoadingPreview(): DevLoadingPreviewContextValue {
  const context = useContext(DevLoadingPreviewContext);
  if (!context) {
    throw new Error('useDevLoadingPreview must be used inside DevLoadingPreviewProvider');
  }
  return context;
}

/** DEV-only helper — combines real fetch loading with the header preview toggle. */
export function useShowLoading(actualLoading: boolean): boolean {
  const { previewLoading } = useDevLoadingPreview();
  return actualLoading || previewLoading;
}
