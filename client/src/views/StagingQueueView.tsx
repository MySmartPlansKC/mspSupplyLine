import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppShellHeader from '../components/Common/AppShellHeader';
import AppShellSignOut from '../components/Common/AppShellSignOut';
import ProjectBackLink from '../components/Common/ProjectBackLink';
import ProjectSubNavTabs from '../components/Common/ProjectSubNavTabs';
import { FetchWrapperError, fetchWrapper } from '../api/fetchWrapper';
import Button from '../components/Common/Button';
import Badge, {
  processingStatusBadgeVariant,
  reviewStatusBadgeVariant,
} from '../components/Common/Badge';
import Card from '../components/Common/Card';
import { Spinner } from '../components/Common/Spinner';

const LEDGER_GRID_COLS =
  'grid grid-cols-[100px_140px_1fr_80px_140px_320px] gap-4 w-full';

type ProcessingStatus =
  | 'Pending'
  | 'Processing'
  | 'AwaitingReview'
  | 'Completed'
  | 'Error';

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

interface StagingOriginalRawData {
  rawRow?: string;
  pageIndex?: number;
  extractorVersion?: string;
}

interface StagingItem {
  stagingId: string;
  projectId: number;
  sourceDocumentId: string;
  sourceType: 'InternalProject' | 'ExternalImport';
  externalRecordRef: string | null;
  categoryName: string | null;
  manufacturer: string | null;
  modelNumber: string | null;
  description: string | null;
  locationInBuilding: string | null;
  quantity: number;
  originalRawData: StagingOriginalRawData | string | null;
  reviewStatus: 'Pending' | 'Approved' | 'Rejected';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface AssemblyLinePayload {
  documents: SubmittalDocument[];
  staging: StagingItem[];
}

interface AssemblyLineIngestResponse {
  documentId: string;
  processingStatus: ProcessingStatus;
  inserted: number;
  stagingIds: string[];
}

export default function StagingQueueView() {
  const { projectId = '' } = useParams();

  const [documents, setDocuments] = useState<SubmittalDocument[]>([]);
  const [staging, setStaging] = useState<StagingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ledgerError, setLedgerError] = useState<string | null>(null);

  const [ingestBusy, setIngestBusy] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [ingestSuccess, setIngestSuccess] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);

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

  const stagingGroups = useMemo(() => {
    const itemsByDocument = new Map<string, StagingItem[]>();
    for (const item of staging) {
      const group = itemsByDocument.get(item.sourceDocumentId) ?? [];
      group.push(item);
      itemsByDocument.set(item.sourceDocumentId, group);
    }

    const orderedDocumentIds: string[] = [];
    for (const doc of documents) {
      if (itemsByDocument.has(doc.documentId)) {
        orderedDocumentIds.push(doc.documentId);
      }
    }
    for (const documentId of itemsByDocument.keys()) {
      if (!orderedDocumentIds.includes(documentId)) {
        orderedDocumentIds.push(documentId);
      }
    }

    return orderedDocumentIds.map((sourceDocumentId) => {
      const items = itemsByDocument.get(sourceDocumentId) ?? [];
      const coverItem = items[0];
      return {
        sourceDocumentId,
        fileTitle:
          documentTitleById.get(sourceDocumentId) ??
          `Document ${sourceDocumentId.slice(0, 8)}`,
        manufacturer: coverItem?.manufacturer ?? null,
        categoryName: coverItem?.categoryName ?? null,
        items,
      };
    });
  }, [staging, documents, documentTitleById]);

  const handlePdfIngestion = useCallback(
    async (file: File) => {
      setIngestBusy(true);
      setIngestError(null);
      setIngestSuccess(null);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetchWrapper<AssemblyLineIngestResponse>({
          endpoint: `projects/${projectId}/staging`,
          method: 'POST',
          body: formData,
          headers: { 'X-Ingest-Mode': 'pdf-submittal' },
        });

        setIngestSuccess(response.inserted);
        await refreshAssemblyLine();

        if (pdfInputRef.current) {
          pdfInputRef.current.value = '';
        }
      } catch (requestError) {
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

  const documentRows = useMemo(
    () =>
      documents.map((doc) => (
        <div
          key={doc.documentId}
          className="border-b border-slate-200/70 border-l-2 border-l-slate-600 p-3 last:border-b-0"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{doc.fileTitle}</span>
            <Badge
              variant={processingStatusBadgeVariant(doc.processingStatus)}
              loading={doc.processingStatus === 'Processing'}
            >
              {doc.processingStatus}
            </Badge>
          </div>
          {doc.processingStatus === 'Error' && doc.errorMessage ? (
            <p className="mt-2 rounded border-l-2 border-red-500 bg-red-50/80 px-2 py-1.5">
              {doc.errorMessage}
            </p>
          ) : null}
        </div>
      )),
    [documents]
  );

  const ledgerGroups = useMemo(
    () =>
      stagingGroups.map((group) => (
        <section key={group.sourceDocumentId} className="border-b border-slate-200/70 last:border-b-0">
          <div className="px-3 pt-3">
            <div className="sl-form-section-banner mb-0 gap-2">
              <span className="truncate">{group.fileTitle}</span>
              <span className="shrink-0 opacity-80">&bull;</span>
              <span className="truncate">{group.manufacturer ?? 'Unknown Mfr'}</span>
              <span className="shrink-0 opacity-80">&bull;</span>
              <span className="truncate">{group.categoryName ?? 'Uncategorized'}</span>
              <span className="ml-auto shrink-0 font-normal normal-case tracking-normal opacity-90">
                {group.items.length} row{group.items.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <div className="px-3 pb-3">
            <div className="overflow-x-auto rounded border border-slate-200/70 bg-white">
              <div
                className={`${LEDGER_GRID_COLS} w-full border-b border-slate-200 px-3 py-2 font-semibold text-slate-700 select-none`}
                role="row"
              >
                <span role="columnheader">Status</span>
                <span role="columnheader">Part Token</span>
                <span role="columnheader">Description</span>
                <span className="text-center" role="columnheader">
                  Qty
                </span>
                <span role="columnheader">Location</span>
                <span className="text-center" role="columnheader">
                  Actions
                </span>
              </div>

              {group.items.map((item) => (
                <div
                  key={item.stagingId}
                  className={`${LEDGER_GRID_COLS} w-full items-center border-b border-slate-100 px-3 py-3 last:border-b-0 hover:bg-slate-50/60`}
                  role="row"
                >
                  <span role="cell">
                    <Badge
                      variant={reviewStatusBadgeVariant(item.reviewStatus)}
                      className="inline-flex shrink-0"
                    >
                      {item.reviewStatus}
                    </Badge>
                  </span>
                  <span
                    className="truncate font-mono font-semibold tracking-tight text-slate-900"
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
                  <span className="text-center tabular-nums" role="cell">
                    {item.quantity}
                  </span>
                  <span
                    className={`truncate ${item.locationInBuilding ? '' : 'text-slate-500 italic'}`}
                    role="cell"
                    title={item.locationInBuilding ?? undefined}
                  >
                    {item.locationInBuilding ?? 'Not specified'}
                  </span>
                  <span
                    className="flex flex-wrap items-center justify-end gap-2.5"
                    role="cell"
                  >
                    <Button type="button" variant="success" size="sm">
                      Approve
                    </Button>
                    <Button type="button" variant="danger" size="sm">
                      Reject
                    </Button>
                    <Button type="button" variant="secondary" size="sm">
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setPayloadModalItem(item)}
                    >
                      Inspect
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )),
    [stagingGroups]
  );

  const pendingCount = staging.filter((item) => item.reviewStatus === 'Pending').length;

  return (
    <main className="min-h-screen">
      <div className="sl-app-shell">
        <AppShellHeader
          accent="emerald"
          title="Staging Queue"
          subtitle={`System Context Node: PID-${projectId}`}
          actions={<AppShellSignOut />}
        />

        <ProjectSubNavTabs projectId={projectId} />

        <ProjectBackLink />

        <Card
          heading="Submittal Intake"
          subheading="Approved PDF submittals and registry-backed sync (registry sync simulated until backend ships)"
          className="overflow-hidden"
          noBodyPadding
        >
          {ingestSuccess !== null ? (
            <div className="border-b border-slate-200/70 px-3 pt-3">
              <p className="rounded border-l-2 border-emerald-600 bg-emerald-50/60 px-2 py-1.5">
                Imported {ingestSuccess} item(s) into the staging queue.
              </p>
            </div>
          ) : null}

          <div className="p-3">
            <div className="sl-form-section-banner">Manual Submittal</div>

            <div
              className={`transition-colors ${dragOver ? 'bg-slate-50' : ''} ${
                ingestBusy ? 'pointer-events-none opacity-70' : ''
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                if (!ingestBusy) setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onPdfDrop}
            >
              <div className="flex flex-col items-center justify-center gap-2 rounded border border-dashed border-slate-300 p-3">
                {ingestBusy ? (
                  <div className="flex items-center gap-1.5">
                    <Spinner size="sm" />
                    Processing submittal PDF...
                  </div>
                ) : (
                  <>
                    <p className="font-semibold">Drop Approved Submittal PDF Here</p>
                    <p>Supported: .pdf</p>
                    <Button
                      type="button"
                      variant="success"
                      onClick={() => pdfInputRef.current?.click()}
                    >
                      <span className="font-semibold">Select Submittal PDF</span>
                    </Button>
                  </>
                )}
                <input
                  ref={pdfInputRef}
                  type="file"
                  className="hidden"
                  onChange={onPdfSelected}
                />
              </div>

              {ingestError ? (
                <p className="mt-2 rounded border-l-2 border-red-500 bg-red-50/80 px-2 py-1.5">
                  {ingestError}
                </p>
              ) : null}
            </div>

            <div className="sl-form-section-banner mt-3">Original Project Registry</div>

            <div className="p-3">
              <Button
                variant="secondary"
                loading={isSyncing}
                disabled={isSyncing}
                onClick={handleSyncFromRegistry}
              >
                <span className="font-semibold">Sync from Original Project Registry</span>
              </Button>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center gap-1.5">
            <Spinner size="sm" />
            Loading assembly line...
          </div>
        ) : null}

        {ledgerError ? (
          <div className="rounded border-l-2 border-red-500 bg-red-50/80 p-2">
            Operational Exception Intercepted: {ledgerError}
          </div>
        ) : null}

        {!loading && !ledgerError ? (
          <>
            <Card
              heading="Submittal Document Registry"
              subheading={`${documents.length} document(s) on permanent processing log`}
              className="overflow-hidden"
              noBodyPadding
            >
              <div className="border-b border-slate-200/70 px-3 pt-3">
                <div className="sl-form-section-banner">Document Processing Log</div>
              </div>
              {documents.length === 0 ? (
                <p className="px-3 py-4 text-center italic">
                  No submittal documents registered for this operational node.
                </p>
              ) : (
                <div className="flex flex-col divide-y divide-slate-200/70 border-t border-slate-200/70">
                  {documentRows}
                </div>
              )}
            </Card>

            <Card
              heading="Pending Intake Ledger"
              subheading={`${pendingCount} pending · ${staging.length} total rows in loading dock`}
              className="overflow-hidden"
              noBodyPadding
            >
              {staging.length === 0 ? (
                <p className="px-3 py-4 text-center italic">
                  Staging queue is currently empty for this operational node.
                </p>
              ) : (
                <div className="border-t border-slate-200/70">{ledgerGroups}</div>
              )}
            </Card>
          </>
        ) : null}

        {payloadModalItem ? (() => {
          let rawDataObj: any = null;
          try {
            if (typeof payloadModalItem.originalRawData === 'string') {
              rawDataObj = JSON.parse(payloadModalItem.originalRawData);
            } else {
              rawDataObj = payloadModalItem.originalRawData;
            }
          } catch {
            rawDataObj = null;
          }

          return (
          <div
            className="fixed inset-0 z-[1000] grid place-items-center bg-slate-900/60 p-3"
            role="presentation"
            onClick={() => setPayloadModalItem(null)}
          >
            <section
              className="grid max-h-[calc(100vh-1.5rem)] w-full max-w-2xl gap-2 overflow-auto rounded border border-slate-200/70 bg-white p-3"
              role="dialog"
              aria-modal="true"
              aria-labelledby="raw-payload-title"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="raw-payload-title" className="font-bold">
                Intake Record Inspector
              </h2>
              <p className="text-slate-600">
                <span className="font-semibold text-slate-900">
                  {payloadModalItem.modelNumber ?? 'Unknown part'}
                </span>
              </p>
              <div className="space-y-3 font-sans text-sm text-slate-700">
                <div>
                  <span className="font-semibold text-slate-500 block text-xs uppercase tracking-wider mb-1">
                    Source Context Row
                  </span>
                  <div className="bg-slate-50 border border-slate-200 rounded p-2.5 font-mono text-slate-800 break-words">
                    {rawDataObj?.rawRow || rawDataObj?.raw_row || '—'}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="font-semibold text-slate-500 block text-xs uppercase tracking-wider mb-0.5">
                      Page Index
                    </span>
                    <span className="font-mono text-slate-900 bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded text-xs">
                      Page {rawDataObj?.pageIndex || rawDataObj?.page_index || 1}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 block text-xs uppercase tracking-wider mb-0.5">
                      Extractor Engine Version
                    </span>
                    <span className="font-mono text-slate-900 bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded text-xs">
                      v{rawDataObj?.extractorVersion || rawDataObj?.extractor_version || '2.0.0'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="button" variant="ghost" onClick={() => setPayloadModalItem(null)}>
                  Close
                </Button>
              </div>
            </section>
          </div>
          );
        })() : null}
      </div>
    </main>
  );
}
