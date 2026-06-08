import { useCallback, useState } from 'react';
import Badge from '../Common/Badge';
import Button from '../Common/Button';
import Card from '../Common/Card';
import type { StagingItem } from '../../types/staging';

interface ManufacturerReviewCardProps {
  item: StagingItem;
  canApprove: boolean;
  onApprove: (item: StagingItem) => Promise<void>;
}

interface ContactFieldProps {
  label: string;
  value: string | null;
}

function ContactField({ label, value }: ContactFieldProps) {
  const display = value?.trim() ? value : '—';

  return (
    <div>
      <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <span className="mt-0.5 block text-sm leading-relaxed text-slate-900 break-words">
        {display}
      </span>
    </div>
  );
}

export default function ManufacturerReviewCard({
  item,
  canApprove,
  onApprove,
}: ManufacturerReviewCardProps) {
  const displayName = item.extractedManufacturer ?? item.manufacturer ?? 'Unknown manufacturer';
  const [approveBusy, setApproveBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleApprove = useCallback(async () => {
    if (!canApprove) {
      return;
    }

    setApproveBusy(true);
    setActionError(null);

    try {
      await onApprove(item);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to approve staging item.');
    } finally {
      setApproveBusy(false);
    }
  }, [canApprove, item, onApprove]);

  return (
    <Card heading="Manufacturer Review" className="overflow-hidden" bodyClassName="flex flex-col">
      <div className="rounded-md border border-slate-200/70 bg-slate-50/50 px-4 py-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="min-w-0 text-lg font-semibold leading-snug text-slate-900">{displayName}</h3>
          <Badge variant="warning" uppercase={false} className="shrink-0">
            Pending approval
          </Badge>
        </div>

        <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <ContactField label="Address" value={item.extractedMfgAddress} />
          <ContactField label="Phone" value={item.extractedMfgPhone} />
          <ContactField label="Website" value={item.extractedMfgWebsite} />
          <ContactField label="Contact" value={item.extractedMfgContact} />
        </div>
      </div>

      {!canApprove ? (
        <p className="mt-2 text-xs text-slate-500">Platform role required to approve staging items.</p>
      ) : null}

      {actionError ? (
        <p className="mt-2 rounded border border-red-200 bg-red-50 px-2.5 py-1.5 text-sm text-red-800">
          {actionError}
        </p>
      ) : null}

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          variant="success"
          size="sm"
          loading={approveBusy}
          disabled={!canApprove}
          className="shrink-0"
          onClick={() => void handleApprove()}
        >
          Approve Manufacturer
        </Button>
      </div>
    </Card>
  );
}
