import type { StagingItem } from '../../types/staging';
import { getDisplayManufacturer } from '../../utils/stagingMetadata';

interface VendorSummaryBannerProps {
  item: StagingItem;
}

function inlineField(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : '—';
}

export default function VendorSummaryBanner({ item }: VendorSummaryBannerProps) {
  const name = getDisplayManufacturer(item);
  const phone = inlineField(item.extractedMfgPhone);
  const website = inlineField(item.extractedMfgWebsite);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-200/70 pb-3 text-sm text-slate-700">
      <span className="font-semibold text-slate-900">{name}</span>
      <span className="hidden text-slate-300 sm:inline" aria-hidden="true">
        |
      </span>
      <span className="truncate">{phone}</span>
      <span className="hidden text-slate-300 sm:inline" aria-hidden="true">
        |
      </span>
      <span className="min-w-0 truncate">{website}</span>
    </div>
  );
}
