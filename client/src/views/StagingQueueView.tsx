import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppShellHeader from '../components/Common/AppShellHeader';
import AppShellSignOut from '../components/Common/AppShellSignOut';
import ProjectPageToolbar from '../components/Common/ProjectPageToolbar';
import { FetchWrapperError, fetchWrapper } from '../api/fetchWrapper';
import { approveStagingItem } from '../api/stagingApi';
import Button from '../components/Common/Button';
import Badge, {
  formatProcessingStatusLabel,
  formatReviewStatusLabel,
  processingStatusBadgeVariant,
  reviewStatusBadgeVariant,
  type ProcessingStatus,
} from '../components/Common/Badge';
import Card from '../components/Common/Card';
import LoadingIndicator from '../components/Common/LoadingIndicator';
import ConfirmModal from '../components/Feedback/ConfirmModal';
import IntakeRecordInspectorModal from '../components/staging/IntakeRecordInspectorModal';
import ManufacturerReviewCard from '../components/staging/ManufacturerReviewCard';
import { useAuth } from '../context/AuthContext';
import { useShowLoading } from '../context/DevLoadingPreviewContext';
import type { StagingItem } from '../types/staging';
import { getDisplayManufacturer, getDisplayPageNum } from '../utils/stagingMetadata';

const LEDGER_GRID_COLS =
  'grid grid-cols-[minmax(120px,auto)_minmax(0,100px)_1fr_minmax(0,140px)_4rem_minmax(7rem,auto)] gap-4 w-full items-center';

const UPLOAD_ACCEPT_TIMEOUT_MS = 120_000;

function IntakeLedgerSkeleton({ rowCount = 3 }: { rowCount?: number }) {
  return (
    <div className="border-t border-slate-200/70 px-3 py-4" aria-busy="true" aria-label="Extracting submittal parts">
      <p className="mb-3 text-center text-sm text-slate-500">
        Populating ledger rows…
      </p>
      <div className="space-y-2">
        {Array.from({ length: rowCount }, (_, index) => (
          <div
            key={index}
            className="animate-pulse rounded border border-slate-200/80 bg-slate-50/80 px-3 py-3"
          >
            <div className="grid grid-cols-[minmax(120px,auto)_minmax(0,100px)_1fr_minmax(0,140px)_4rem_minmax(7rem,auto)] gap-4">
              <div className="h-5 rounded bg-slate-200" />
              <div className="h-5 rounded bg-slate-200" />
              <div className="h-5 rounded bg-slate-200" />
              <div className="h-5 rounded bg-slate-200" />
              <div className="h-5 rounded bg-slate-200" />
              <div className="h-5 rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Compact row action for mobile ledger cards. */
const LEDGER_ACTION_BTN = 'shadow-none w-full';

interface SubmittalDocument {
  documentId: string;
  projectId: number;
  sourceType: 'ManualUpload' | 'RegistryIngestion';
  fileTitle: string;
  fileHash: string;
  processingStatus: ProcessingStatus;
  errorMessage: string | null;
  uploadedBy: string;
  createdAt: string;
}

const PLATFORM_ROLES = new Set(['MspAdmin', 'Admin', 'PIM']);

interface AssemblyLinePayload {
  documents: SubmittalDocument[];
  staging: StagingItem[];
}

interface AssemblyLineIngestResponse {
  documentId: string;
  processingStatus: ProcessingStatus;
  stagingPlaceholderId?: string;
  message?: string;
  inserted?: number;
  stagingIds?: string[];
}

export default function StagingQueueView() {
  const { projectId = '' } = useParams();
  const { user, effectiveRole } = useAuth();
  const canApproveStaging = Boolean(effectiveRole && PLATFORM_ROLES.has(effectiveRole));

  const [documents, setDocuments] = useState<SubmittalDocument[]>([]);
  const [staging, setStaging] = useState<StagingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const showLoading = useShowLoading(loading);
  const [ledgerError, setLedgerError] = useState<string | null>(null);

  const [ingestBusy, setIngestBusy] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [ingestSuccess, setIngestSuccess] = useState<number | null>(null);
  const [ingestNotice, setIngestNotice] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [purgeBusy, setPurgeBusy] = useState(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);
  const [purgeConfirmOpen, setPurgeConfirmOpen] = useState(false);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);
  const documentStatusRef = useRef<Map<string, ProcessingStatus>>(new Map());

  const refreshAssemblyLine = useCallback(async () => {
    const payload = await fetchWrapper<AssemblyLinePayload>({
      endpoint: `projects/${projectId}/staging`,
    });
    setDocuments(payload.documents ?? []);
    setStaging(payload.staging ?? []);
  }, [projectId]);

  useEffect(() => {
    let mounted = true;

    async function loadAssemblyLine() {
      setLedgerError(null);
      try {
        await refreshAssemblyLine();
      } catch (requestError) {
        if (!mounted) return;
        if (requestError instanceof FetchWrapperError) {
          setLedgerError(requestError.message);
        } else if (requestError instanceof Error) {
          setLedgerError(requestError.message);
        } else {
          setLedgerError('Unable to load staging queue.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadAssemblyLine();
    return () => {
      mounted = false;
    };
  }, [refreshAssemblyLine]);

  useEffect(() => {
    if (ingestSuccess === null) return;
    const timer = window.setTimeout(() => setIngestSuccess(null), 5000);
    return () => window.clearTimeout(timer);
  }, [ingestSuccess]);

  useEffect(() => {
    if (ingestNotice === null) return;
    const timer = window.setTimeout(() => setIngestNotice(null), 8000);
    return () => window.clearTimeout(timer);
  }, [ingestNotice]);

  const hasProcessingDocuments = useMemo(
    () => documents.some((doc) => doc.processingStatus === 'Processing'),
    [documents]
  );

  useEffect(() => {
    if (!hasProcessingDocuments) return;

    const interval = window.setInterval(() => {
      void refreshAssemblyLine().catch(() => {
        // Keep polling; ledger refresh errors surface on the next manual load.
      });
    }, 3000);

    return () => window.clearInterval(interval);
  }, [hasProcessingDocuments, refreshAssemblyLine]);

  useEffect(() => {
    documents.forEach((doc) => {
      const priorStatus = documentStatusRef.current.get(doc.documentId);

      if (priorStatus === 'Processing') {
        if (doc.processingStatus === 'AwaitingReview') {
          const itemCount = staging.filter(
            (item) => item.sourceDocumentId === doc.documentId
          ).length;
          setIngestNotice(null);
          setIngestError(null);
          if (itemCount > 0) {
            setIngestSuccess(itemCount);
          }
        } else if (doc.processingStatus === 'Error') {
          setIngestNotice(null);
          setIngestError(doc.errorMessage ?? 'PDF extraction failed.');
        }
      }

      documentStatusRef.current.set(doc.documentId, doc.processingStatus);
    });
  }, [documents, staging]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const documentTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const doc of documents) {
      map.set(doc.documentId, doc.fileTitle);
    }
    return map;
  }, [documents]);

  const [payloadModalItem, setPayloadModalItem] = useState<StagingItem | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  const stagingCountByDocumentId = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of staging) {
      map.set(item.sourceDocumentId, (map.get(item.sourceDocumentId) ?? 0) + 1);
    }
    return map;
  }, [staging]);

  useEffect(() => {
    if (documents.length === 0) {
      setSelectedDocumentId(null);
      return;
    }

    setSelectedDocumentId((current) => {
      if (current && documents.some((doc) => doc.documentId === current)) {
        return current;
      }

      const withStaging = documents.find(
        (doc) => (stagingCountByDocumentId.get(doc.documentId) ?? 0) > 0
      );
      return withStaging?.documentId ?? documents[0].documentId;
    });
  }, [documents, stagingCountByDocumentId]);

  const activeDocument = useMemo(
    () => documents.find((doc) => doc.documentId === selectedDocumentId) ?? null,
    [documents, selectedDocumentId]
  );

  const [approvingStagingId, setApprovingStagingId] = useState<string | null>(null);

  const handleApproveStaging = useCallback(
    async (item: StagingItem) => {
      setApprovingStagingId(item.stagingId);
      setLedgerError(null);
      try {
        await approveStagingItem(projectId, item.stagingId);
        setPayloadModalItem((current) =>
          current?.stagingId === item.stagingId ? null : current
        );
        await refreshAssemblyLine();
      } catch (error) {
        if (error instanceof FetchWrapperError) {
          setLedgerError(error.message);
        } else if (error instanceof Error) {
          setLedgerError(error.message);
        } else {
          setLedgerError('Unable to approve staging item.');
        }
        throw error;
      } finally {
        setApprovingStagingId(null);
      }
    },
    [projectId, refreshAssemblyLine]
  );

  const documentStatusById = useMemo(() => {
    const map = new Map<string, ProcessingStatus>();
    for (const doc of documents) {
      map.set(doc.documentId, doc.processingStatus);
    }
    return map;
  }, [documents]);

  const stagingGroups = useMemo(() => {
    const itemsByDocument = new Map<string, StagingItem[]>();
    for (const item of staging) {
      const group = itemsByDocument.get(item.sourceDocumentId) ?? [];
      group.push(item);
      itemsByDocument.set(item.sourceDocumentId, group);
    }

    const orderedDocumentIds: string[] = [];
    for (const doc of documents) {
      if (itemsByDocument.has(doc.documentId) || doc.processingStatus === 'Processing') {
        orderedDocumentIds.push(doc.documentId);
      }
    }
    for (const documentId of itemsByDocument.keys()) {
      if (!orderedDocumentIds.includes(documentId)) {
        orderedDocumentIds.push(documentId);
      }
    }

    return orderedDocumentIds.map((sourceDocumentId) => {
      const items = (itemsByDocument.get(sourceDocumentId) ?? []).filter(
        (item) => item.reviewStatus !== 'Processing'
      );
      const coverItem = items[0];
      return {
        sourceDocumentId,
        fileTitle:
          documentTitleById.get(sourceDocumentId) ??
          `Document ${sourceDocumentId.slice(0, 8)}`,
        manufacturer: coverItem?.manufacturer ?? null,
        categoryName: coverItem?.categoryName ?? null,
        items,
        isExtracting: documentStatusById.get(sourceDocumentId) === 'Processing',
      };
    });
  }, [staging, documents, documentTitleById, documentStatusById]);

  const activeCoverItem = useMemo(() => {
    if (!selectedDocumentId) {
      return null;
    }
    const group = stagingGroups.find((entry) => entry.sourceDocumentId === selectedDocumentId);
    return group?.items[0] ?? null;
  }, [selectedDocumentId, stagingGroups]);

  const handlePdfIngestion = useCallback(
    async (file: File) => {
      setIngestBusy(true);
      setIngestError(null);
      setIngestSuccess(null);
      setIngestNotice(null);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetchWrapper<AssemblyLineIngestResponse>({
          endpoint: `projects/${projectId}/staging`,
          method: 'POST',
          body: formData,
          headers: { 'X-Ingest-Mode': 'pdf-submittal' },
          timeoutMs: UPLOAD_ACCEPT_TIMEOUT_MS,
        });

        await refreshAssemblyLine();
        setSelectedDocumentId(response.documentId);

        if (response.processingStatus === 'Processing') {
          setIngestNotice(
            response.message ??
              'Submittal accepted — PDF extraction is running in the background.'
          );
        } else if (typeof response.inserted === 'number') {
          setIngestSuccess(response.inserted);
        }

        if (pdfInputRef.current) {
          pdfInputRef.current.value = '';
        }
      } catch (requestError) {
        try {
          const payload = await fetchWrapper<AssemblyLinePayload>({
            endpoint: `projects/${projectId}/staging`,
          });
          setDocuments(payload.documents ?? []);
          setStaging(payload.staging ?? []);
          const processingDoc = (payload.documents ?? []).find(
            (doc) => doc.processingStatus === 'Processing'
          );
          if (
            processingDoc &&
            requestError instanceof FetchWrapperError &&
            requestError.status === 0
          ) {
            setSelectedDocumentId(processingDoc.documentId);
            setIngestNotice(
              'Submittal accepted — AI extraction is running in the background.'
            );
            if (pdfInputRef.current) {
              pdfInputRef.current.value = '';
            }
            return;
          }
        } catch {
          // Fall through to user-visible ingest error.
        }

        if (requestError instanceof FetchWrapperError) {
          setIngestError(requestError.message);
          await refreshAssemblyLine();
        } else if (requestError instanceof Error) {
          setIngestError(requestError.message);
        } else {
          setIngestError('Unable to ingest submittal PDF.');
        }
      } finally {
        setIngestBusy(false);
      }
    },
    [projectId, refreshAssemblyLine]
  );

  const onPdfSelected = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void handlePdfIngestion(file);
      }
    },
    [handlePdfIngestion]
  );

  const onPdfDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragOver(false);
      if (ingestBusy) return;
      const file = event.dataTransfer.files[0];
      if (file) {
        void handlePdfIngestion(file);
      }
    },
    [handlePdfIngestion, ingestBusy]
  );

  const handleSyncFromRegistry = useCallback(() => {
    // TODO: REPLACE MOCK WITH POST projects/${projectId}/staging/sync-registry FOR SATURN REGISTRY PDF RESOLUTION
    if (isSyncing) return;

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    setIsSyncing(true);
    timerRef.current = window.setTimeout(() => {
      setIsSyncing(false);
      timerRef.current = null;
    }, 1500);
  }, [isSyncing]);

  const executePurgeTestData = useCallback(async () => {
    setPurgeBusy(true);
    setPurgeError(null);

    try {
      await fetchWrapper({
        endpoint: `projects/admin/purge-test-data?projectId=${encodeURIComponent(projectId)}`,
        method: 'DELETE',
      });

      setIngestSuccess(null);
      setIngestError(null);
      await refreshAssemblyLine();
      setPurgeConfirmOpen(false);
    } catch (error) {
      setPurgeConfirmOpen(false);
      if (error instanceof FetchWrapperError) {
        setPurgeError(error.message);
      } else if (error instanceof Error) {
        setPurgeError(error.message);
      } else {
        setPurgeError('Purge failed.');
      }
    } finally {
      setPurgeBusy(false);
    }
  }, [projectId, refreshAssemblyLine]);

  const handlePurgeConfirm = useCallback(() => {
    void executePurgeTestData();
  }, [executePurgeTestData]);

  const documentRows = useMemo(
    () =>
      documents.map((doc) => {
        const isSelected = doc.documentId === selectedDocumentId;

        return (
          <li key={doc.documentId} className="last:border-b-0">
            <button
              type="button"
              onClick={() => setSelectedDocumentId(doc.documentId)}
              className={`flex w-full flex-col border-b border-slate-200/70 px-3 py-3 text-left transition-colors ${
                isSelected
                  ? 'bg-blue-50/80 ring-1 ring-inset ring-blue-500/40'
                  : 'hover:bg-slate-50/80'
              }`}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <span className="min-w-0 flex-1 font-medium leading-snug text-slate-900">
                  {doc.fileTitle}
                </span>
                <Badge
                  variant={processingStatusBadgeVariant(doc.processingStatus)}
                  uppercase={false}
                  className="shrink-0"
                >
                  {formatProcessingStatusLabel(doc.processingStatus)}
                </Badge>
              </div>
              {doc.processingStatus === 'Error' && doc.errorMessage ? (
                <p className="mt-2 w-full rounded border border-red-200 bg-red-50 px-2.5 py-1.5 text-sm text-red-800">
                  {doc.errorMessage}
                </p>
              ) : null}
            </button>
          </li>
        );
      }),
    [documents, selectedDocumentId]
  );

  const visibleStagingGroups = useMemo(
    () =>
      selectedDocumentId
        ? stagingGroups.filter((group) => group.sourceDocumentId === selectedDocumentId)
        : stagingGroups,
    [stagingGroups, selectedDocumentId]
  );

  const ledgerGroups = useMemo(
    () =>
      visibleStagingGroups.map((group) => (
        <section key={group.sourceDocumentId} className="border-b border-slate-200/70 last:border-b-0">
          {group.isExtracting && group.items.length === 0 ? (
            <IntakeLedgerSkeleton />
          ) : (
          <div className="px-3 py-3">
            <div className="overflow-x-auto rounded border border-slate-200/70 bg-white lg:overflow-visible">
              <div
                className={`${LEDGER_GRID_COLS} hidden w-full min-w-[52rem] border-b border-slate-200 px-3 py-2 font-semibold text-slate-700 select-none lg:grid`}
                role="row"
              >
                <span role="columnheader">Status</span>
                <span role="columnheader">Part Token</span>
                <span role="columnheader">Description</span>
                <span role="columnheader">Manufacturer</span>
                <span className="text-center" role="columnheader">
                  Page
                </span>
                <span className="text-center" role="columnheader">
                  Actions
                </span>
              </div>

              {group.items.map((item) => (
                <div key={item.stagingId}>
                  <article className="flex flex-col gap-3 border-b border-slate-100 p-3 last:border-b-0 hover:bg-slate-50/60 lg:hidden">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Badge
                        variant={reviewStatusBadgeVariant(item.reviewStatus)}
                        uppercase={false}
                        className="shrink-0"
                      >
                        {formatReviewStatusLabel(item.reviewStatus)}
                      </Badge>
                      <span className="font-mono text-sm font-semibold tracking-tight text-slate-900 break-all text-right">
                        {item.modelNumber ?? '—'}
                      </span>
                    </div>
                    <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-2 text-sm">
                      <dt className="text-slate-500">Description</dt>
                      <dd className="text-slate-700">
                        {item.description ?? (
                          <span className="italic text-slate-500">No description provided</span>
                        )}
                      </dd>
                      <dt className="text-slate-500">Manufacturer</dt>
                      <dd className="text-slate-700">{getDisplayManufacturer(item)}</dd>
                      <dt className="text-slate-500">Page</dt>
                      <dd className="tabular-nums text-slate-900">{getDisplayPageNum(item)}</dd>
                    </dl>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="success"
                        size="sm"
                        className={LEDGER_ACTION_BTN}
                        loading={approvingStagingId === item.stagingId}
                        disabled={!canApproveStaging || approvingStagingId !== null}
                        onClick={() => void handleApproveStaging(item)}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className={LEDGER_ACTION_BTN}
                        onClick={() => setPayloadModalItem(item)}
                      >
                        Inspect
                      </Button>
                    </div>
                  </article>

                  <div
                    className={`${LEDGER_GRID_COLS} hidden w-full min-w-[52rem] border-b border-slate-100 px-3 py-3 last:border-b-0 hover:bg-slate-50/60 lg:grid`}
                    role="row"
                  >
                  <span role="cell" className="min-w-[120px] whitespace-nowrap">
                    <Badge
                      variant={reviewStatusBadgeVariant(item.reviewStatus)}
                      uppercase={false}
                      className="shrink-0"
                    >
                      {formatReviewStatusLabel(item.reviewStatus)}
                    </Badge>
                  </span>
                  <span
                    className="min-w-0 truncate font-mono text-sm font-semibold tracking-tight text-slate-900"
                    role="cell"
                    title={item.modelNumber ?? undefined}
                  >
                    {item.modelNumber ?? '—'}
                  </span>
                  <span
                    className="truncate text-slate-600 font-normal"
                    role="cell"
                    title={item.description ?? undefined}
                  >
                    {item.description ?? (
                      <span className="text-slate-500 italic">No description provided</span>
                    )}
                  </span>
                  <span
                    className="truncate text-slate-700"
                    role="cell"
                    title={getDisplayManufacturer(item)}
                  >
                    {getDisplayManufacturer(item)}
                  </span>
                  <span className="text-center tabular-nums text-slate-900" role="cell">
                    {getDisplayPageNum(item)}
                  </span>
                  <span className="flex items-center justify-end gap-1.5" role="cell">
                    <Button
                      type="button"
                      variant="success"
                      size="sm"
                      className="shadow-none"
                      loading={approvingStagingId === item.stagingId}
                      disabled={!canApproveStaging || approvingStagingId !== null}
                      onClick={() => void handleApproveStaging(item)}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="shadow-none"
                      onClick={() => setPayloadModalItem(item)}
                    >
                      Inspect
                    </Button>
                  </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
        </section>
      )),
    [visibleStagingGroups, approvingStagingId, canApproveStaging, handleApproveStaging]
  );

  const extractingCount = documents.filter((doc) => doc.processingStatus === 'Processing').length;
  const selectedLedgerItems = useMemo(() => {
    if (!selectedDocumentId) {
      return staging.filter((item) => item.reviewStatus !== 'Processing');
    }
    return staging.filter(
      (item) =>
        item.sourceDocumentId === selectedDocumentId && item.reviewStatus !== 'Processing'
    );
  }, [staging, selectedDocumentId]);

  const hasLedgerContent =
    selectedLedgerItems.length > 0 ||
    extractingCount > 0 ||
    activeDocument?.processingStatus === 'Processing';

  return (
    <main className="min-h-screen">
      <div className="sl-app-shell">
        <AppShellHeader
          accent="emerald"
          title="Staging Queue"
          subtitle={`System Context Node: PID-${projectId}`}
          actions={<AppShellSignOut />}
        />

        {showLoading ? (
          <LoadingIndicator label="Loading assembly line..." />
        ) : null}

        {ledgerError ? (
          <div className="rounded border-l-2 border-red-500 bg-red-50/80 p-2">
            Operational Exception Intercepted: {ledgerError}
          </div>
        ) : null}

        {!showLoading && !ledgerError ? (
          <div className="flex min-w-0 flex-col gap-6">
            <ProjectPageToolbar projectId={projectId} />

            <div className="grid w-full min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
              <section className="flex min-w-0 flex-col gap-4">
                <Card
                  heading="Submittal Document Registry"
                  subheading={
                    documents.length === 0
                      ? 'No PDFs ingested for this project yet.'
                      : documents.length > 1
                        ? 'Select a submittal to review'
                        : undefined
                  }
                  className="overflow-hidden"
                  noBodyPadding
                >
                  {documents.length === 0 ? (
                    <p className="px-3 py-4 text-center text-slate-500">
                      Upload or sync a submittal to see it here.
                    </p>
                  ) : (
                    <ul className="border-t border-slate-200/70">{documentRows}</ul>
                  )}
                </Card>

                {activeCoverItem ? (
                  <ManufacturerReviewCard
                    item={activeCoverItem}
                    canApprove={canApproveStaging}
                    onApprove={handleApproveStaging}
                  />
                ) : activeDocument?.processingStatus === 'Processing' ? (
                  <div className="rounded border border-dashed border-amber-300/80 bg-amber-50/60 px-4 py-6">
                    <LoadingIndicator
                      label="Extracting submittal catalog from PDF…"
                      placement="embedded"
                      tone="light"
                    />
                    <p className="mt-3 text-center text-sm text-slate-600">
                      The intake ledger will populate automatically when AI extraction completes.
                    </p>
                  </div>
                ) : activeDocument ? (
                  <p className="rounded border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-500">
                    No staged parts for this document yet. Upload or sync a submittal to populate the
                    intake ledger.
                  </p>
                ) : documents.length > 0 ? (
                  <p className="text-sm italic text-slate-500">
                    Select a submittal from the registry to begin manufacturer review.
                  </p>
                ) : null}
              </section>

              <aside className="sl-page-rail min-w-0 space-y-5">
                <div className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  File Control Cabinet
                </div>

                {ingestNotice ? (
                  <p className="rounded border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-200">
                    {ingestNotice}
                  </p>
                ) : null}

                {ingestSuccess !== null ? (
                  <p className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                    Imported {ingestSuccess} item(s) into the staging queue.
                  </p>
                ) : null}

                <div>
                  <div className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Manual Submittal
                  </div>
                  <div
                    className={`transition-colors rounded border border-dashed border-slate-700 bg-slate-900/50 p-4 ${
                      dragOver ? 'bg-slate-800/50' : ''
                    } ${ingestBusy ? 'pointer-events-none opacity-70' : ''}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (!ingestBusy) setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onPdfDrop}
                  >
                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                      {ingestBusy ? (
                        <LoadingIndicator
                          label="Uploading submittal PDF..."
                          placement="embedded"
                          tone="dark"
                        />
                      ) : (
                        <>
                          <p className="font-semibold text-slate-100">
                            Drop Approved Submittal PDF Here
                          </p>
                          <p className="text-sm text-slate-400">Supported: .pdf</p>
                          <Button
                            type="button"
                            variant="success"
                            onClick={() => pdfInputRef.current?.click()}
                          >
                            Select Submittal PDF
                          </Button>
                        </>
                      )}
                      <input
                        ref={pdfInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={onPdfSelected}
                      />
                    </div>

                    {ingestError ? (
                      <p className="mt-3 rounded border border-red-500/40 bg-red-950/40 px-2.5 py-1.5 text-sm text-red-300">
                        {ingestError}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4">
                  <div className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Original Project Registry
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full justify-center"
                    loading={isSyncing}
                    disabled={isSyncing}
                    onClick={handleSyncFromRegistry}
                  >
                    Sync from Original Project Registry
                  </Button>
                </div>

                {user?.role === 'MspAdmin' ? (
                  <div className="border-t border-red-900/60 -mx-4 rounded-b bg-red-950/10 px-4 pt-4 pb-2">
                    <div className="mb-1 text-xs font-bold uppercase tracking-wider text-red-400">
                      Admin purge sandbox
                    </div>
                    <p className="mb-3 text-xs leading-relaxed text-slate-400">
                      Removes all submittal documents and staging rows for PID-{projectId}.
                    </p>
                    <Button
                      type="button"
                      variant="danger"
                      className="w-full justify-center font-semibold"
                      onClick={() => setPurgeConfirmOpen(true)}
                      disabled={purgeBusy}
                    >
                      Clean Data & Reset Node
                    </Button>
                    {purgeError ? (
                      <p className="mt-2 text-xs text-red-400">{purgeError}</p>
                    ) : null}
                  </div>
                ) : null}
              </aside>
            </div>

            <Card
              heading="Pending Intake Ledger"
              subheading={
                selectedLedgerItems.length > 0
                  ? `${selectedLedgerItems.length} item${selectedLedgerItems.length === 1 ? '' : 's'}`
                  : undefined
              }
              className="w-full min-w-0 overflow-hidden"
              noBodyPadding
            >
              {!hasLedgerContent ? (
                <p className="px-3 py-4 text-center italic">
                  Staging queue is currently empty for this operational node.
                </p>
              ) : (
                <div className="border-t border-slate-200/70">{ledgerGroups}</div>
              )}
            </Card>
          </div>
        ) : null}

        <ConfirmModal
          open={purgeConfirmOpen}
          title="Clean data and reset node?"
          message={
            <>
              Permanently delete all staging and submittal data for project{' '}
              <span className="font-semibold text-slate-900">{projectId}</span>? This cannot be
              undone.
            </>
          }
          confirmLabel="Clean Data & Reset Node"
          cancelLabel="Cancel"
          confirmVariant="danger"
          loading={purgeBusy}
          onConfirm={handlePurgeConfirm}
          onCancel={() => setPurgeConfirmOpen(false)}
        />

        <IntakeRecordInspectorModal
          open={payloadModalItem !== null}
          item={payloadModalItem}
          onClose={() => setPayloadModalItem(null)}
        />
      </div>
    </main>
  );
}
