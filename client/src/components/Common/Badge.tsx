import { ReactNode } from 'react';
import { Spinner } from './Spinner';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral';

export type ProcessingStatus =
  | 'Pending'
  | 'Processing'
  | 'AwaitingReview'
  | 'Completed'
  | 'Error';

export interface BadgeProps {
  variant?: BadgeVariant;
  loading?: boolean;
  /** Default true for registry chips; use false for readable sentence-case labels. */
  uppercase?: boolean;
  className?: string;
  children: ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  success:
    'border-emerald-500 bg-emerald-50 text-emerald-700!',
  warning:
    'border-amber-500 bg-amber-50 text-amber-700!',
  danger:
    'border-red-500 bg-red-50 text-red-700!',
  neutral:
    'border-slate-400 bg-slate-100 text-slate-700!',
};

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(' ');
}

/** Canonical status chip — matches project registry Active badge structure. */
export function formatProcessingStatusLabel(status: ProcessingStatus): string {
  const labels: Record<ProcessingStatus, string> = {
    Pending: 'Pending',
    Processing: 'Processing',
    AwaitingReview: 'Awaiting review',
    Completed: 'Completed',
    Error: 'Error',
  };
  return labels[status];
}

export default function Badge({
  variant = 'neutral',
  loading = false,
  uppercase = true,
  className = '',
  children,
}: BadgeProps) {
  return (
    <span
      className={joinClasses(
        'inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-sm font-semibold',
        uppercase ? 'uppercase tracking-wide' : 'normal-case',
        variantClasses[variant],
        className
      )}
    >
      {loading ? <Spinner size="sm" className="text-current" /> : null}
      {children}
    </span>
  );
}

export function projectStatusBadgeVariant(status: string | null | undefined): BadgeVariant {
  const normalized = (status ?? 'Active').toLowerCase();
  if (normalized === 'active') return 'success';
  if (normalized === 'inactive' || normalized === 'archived') return 'neutral';
  return 'warning';
}

export type ReviewStatus = 'Pending' | 'Approved' | 'Rejected';

export function formatReviewStatusLabel(status: ReviewStatus): string {
  const labels: Record<ReviewStatus, string> = {
    Pending: 'Pending',
    Approved: 'Approved',
    Rejected: 'Rejected',
  };
  return labels[status];
}

export function reviewStatusBadgeVariant(status: ReviewStatus): BadgeVariant {
  if (status === 'Approved') return 'success';
  if (status === 'Rejected') return 'danger';
  return 'warning';
}

export function processingStatusBadgeVariant(status: ProcessingStatus): BadgeVariant {
  if (status === 'Completed') return 'success';
  if (status === 'Error') return 'danger';
  if (status === 'Processing' || status === 'AwaitingReview' || status === 'Pending') {
    return 'warning';
  }
  return 'neutral';
}
