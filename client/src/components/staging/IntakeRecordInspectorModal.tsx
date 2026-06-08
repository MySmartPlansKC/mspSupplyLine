import { useEffect, useState } from 'react';
import Button from '../Common/Button';
import Input from '../Common/Input';
import VendorSummaryBanner from './VendorSummaryBanner';
import { getDisplayManufacturer, getDisplayPageNum } from '../../utils/stagingMetadata';
import type { StagingItem, StagingOriginalRawData } from '../../types/staging';

export interface IntakeRecordInspectorModalProps {
  open: boolean;
  item: StagingItem | null;
  onClose: () => void;
}

interface InspectorDraft {
  modelNumber: string;
  description: string;
  manufacturer: string;
}

function parseOriginalRawData(
  originalRawData: StagingItem['originalRawData']
): StagingOriginalRawData | Record<string, unknown> | null {
  if (!originalRawData) {
    return null;
  }

  if (typeof originalRawData === 'string') {
    try {
      return JSON.parse(originalRawData) as StagingOriginalRawData;
    } catch {
      return null;
    }
  }

  return originalRawData;
}

function readRawField(
  rawDataObj: StagingOriginalRawData | Record<string, unknown> | null,
  camelKey: keyof StagingOriginalRawData,
  snakeKey: string
): string | number | undefined {
  if (!rawDataObj) {
    return undefined;
  }
  const camelValue = (rawDataObj as StagingOriginalRawData)[camelKey];
  if (camelValue !== undefined && camelValue !== null) {
    return camelValue;
  }
  const snakeValue = (rawDataObj as Record<string, unknown>)[snakeKey];
  if (typeof snakeValue === 'string' || typeof snakeValue === 'number') {
    return snakeValue;
  }
  return undefined;
}

function draftFromItem(item: StagingItem): InspectorDraft {
  return {
    modelNumber: item.modelNumber ?? '',
    description: item.description ?? '',
    manufacturer: getDisplayManufacturer(item) === '—' ? '' : getDisplayManufacturer(item),
  };
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  const display = value.trim() ? value : '—';

  return (
    <div>
      <span className="sl-input-label">{label}</span>
      <div className="sl-input min-h-8 flex items-center bg-slate-50/80 text-sm text-slate-900">
        {display}
      </div>
    </div>
  );
}

export default function IntakeRecordInspectorModal({
  open,
  item,
  onClose,
}: IntakeRecordInspectorModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<InspectorDraft>({
    modelNumber: '',
    description: '',
    manufacturer: '',
  });

  useEffect(() => {
    if (!open || !item) {
      setIsEditing(false);
      return;
    }
    setDraft(draftFromItem(item));
    setIsEditing(false);
  }, [open, item]);

  if (!open || !item) {
    return null;
  }

  const rawDataObj = parseOriginalRawData(item.originalRawData);
  const displayPageNum = getDisplayPageNum(item);
  const extractorVersion = readRawField(rawDataObj, 'extractorVersion', 'extractor_version') ?? '2.0.0';

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-3"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="grid max-h-[100dvh] w-full max-w-3xl gap-4 overflow-auto rounded-t-xl border border-slate-200/70 bg-white p-4 sm:max-h-[calc(100vh-1.5rem)] sm:rounded"
        role="dialog"
        aria-modal="true"
        aria-labelledby="intake-inspector-title"
        onClick={(event) => event.stopPropagation()}
      >
        <VendorSummaryBanner item={item} />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="intake-inspector-title" className="font-bold text-slate-900">
              Intake Record Inspector
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">Part record details and extraction metadata</p>
          </div>
          <Button
            type="button"
            variant={isEditing ? 'primary' : 'secondary'}
            size="sm"
            className="shrink-0"
            onClick={() => setIsEditing((current) => !current)}
          >
            {isEditing ? 'Done' : 'Edit'}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-1">
          {isEditing ? (
            <>
              <Input
                label="Part Token"
                value={draft.modelNumber}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, modelNumber: event.target.value }))
                }
              />
              <div className="grid gap-0.5">
                <label className="sl-input-label" htmlFor="inspector-description">
                  Description
                </label>
                <textarea
                  id="inspector-description"
                  rows={3}
                  className="sl-input min-h-[4.5rem] resize-y py-2"
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </div>
              <Input
                label="Manufacturer"
                value={draft.manufacturer}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, manufacturer: event.target.value }))
                }
              />
            </>
          ) : (
            <>
              <ReadOnlyField label="Part Token" value={draft.modelNumber} />
              <ReadOnlyField label="Description" value={draft.description} />
              <ReadOnlyField label="Manufacturer" value={draft.manufacturer} />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-slate-200/70 pt-3 sm:grid-cols-2">
          <div>
            <span className="mb-0.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              PDF Page
            </span>
            <span className="rounded border border-slate-200/60 bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-900">
              Page {displayPageNum}
            </span>
          </div>
          <div>
            <span className="mb-0.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Extractor Engine Version
            </span>
            <span className="rounded border border-slate-200/60 bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-900">
              v{extractorVersion}
            </span>
          </div>
        </div>

        <div className="sticky bottom-0 -mx-4 border-t border-slate-200/70 bg-white px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:p-0 sm:pt-0">
          <Button type="button" variant="ghost" className="w-full sm:ml-auto sm:w-auto" onClick={onClose}>
            Close
          </Button>
        </div>
      </section>
    </div>
  );
}
