import { ReactNode } from 'react';
import { Spinner } from './Spinner';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral';

export interface BadgeProps {
  variant?: BadgeVariant;
  loading?: boolean;
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
export default function Badge({
  variant = 'neutral',
  loading = false,
  className = '',
  children,
}: BadgeProps) {
  return (
    <span
      className={joinClasses(
        'items-center rounded-sm border px-2 text-sm font-semibold uppercase',
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

export function reviewStatusBadgeVariant(
  status: 'Pending' | 'Approved' | 'Rejected'
): BadgeVariant {
  if (status === 'Approved') return 'success';
  if (status === 'Rejected') return 'danger';
  return 'warning';
}

export function processingStatusBadgeVariant(
  status: 'Pending' | 'Processing' | 'AwaitingReview' | 'Completed' | 'Error'
): BadgeVariant {
  if (status === 'AwaitingReview' || status === 'Completed') {
    return status === 'Completed' ? 'neutral' : 'success';
  }
  if (status === 'Error') return 'danger';
  if (status === 'Processing') return 'warning';
  return 'neutral';
}
