import { Spinner } from './Spinner';

export type LoadingIndicatorTone = 'light' | 'dark';

export interface LoadingIndicatorProps {
  label?: string;
  /** overlay = full-screen; inline = centered page row; embedded = in-place (e.g. drop zone) */
  placement?: 'overlay' | 'inline' | 'embedded';
  /** stack = spinner above label; row = spinner beside label (default row for embedded) */
  layout?: 'stack' | 'row';
  tone?: LoadingIndicatorTone;
  className?: string;
}

const toneStyles: Record<
  LoadingIndicatorTone,
  { box: string; well: string; label: string }
> = {
  light: {
    box: 'rounded-lg border border-slate-300/80 bg-white px-5 py-4 shadow-sm',
    well: 'bg-white',
    label: 'text-sm font-semibold tracking-tight text-slate-600',
  },
  dark: {
    box: 'rounded-lg border border-slate-600/80 bg-slate-900 px-5 py-4 shadow-sm',
    well: 'bg-slate-900',
    label: 'text-sm font-semibold tracking-tight text-slate-300',
  },
};

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(' ');
}

export default function LoadingIndicator({
  label,
  placement = 'inline',
  layout,
  tone = 'light',
  className = '',
}: LoadingIndicatorProps) {
  const styles = toneStyles[tone];
  const resolvedLayout = layout ?? (placement === 'embedded' ? 'row' : 'stack');
  const spinnerSize = placement === 'embedded' ? 'sm' : 'md';

  const card = (
    <div
      className={joinClasses(
        resolvedLayout === 'row'
          ? 'flex flex-row items-center gap-2.5 px-3.5 py-2.5'
          : 'flex flex-col items-center gap-2.5 px-5 py-4',
        styles.box
      )}
    >
      <Spinner size={spinnerSize} variant="brand" wellClassName={styles.well} />
      {label ? <span className={styles.label}>{label}</span> : null}
    </div>
  );

  if (placement === 'overlay') {
    return (
      <div
        className="fixed inset-0 z-50 grid place-items-center bg-zinc-200/80 p-4 backdrop-blur-[1px]"
        aria-busy="true"
        aria-label={label ?? 'Loading'}
      >
        {card}
      </div>
    );
  }

  if (placement === 'embedded') {
    return (
      <div
        className={joinClasses('flex w-full justify-center', className)}
        aria-busy="true"
        aria-label={label ?? 'Loading'}
      >
        {card}
      </div>
    );
  }

  return (
    <div
      className={joinClasses('flex w-full items-center justify-center py-12', className)}
      aria-busy="true"
      aria-label={label ?? 'Loading'}
    >
      {card}
    </div>
  );
}
