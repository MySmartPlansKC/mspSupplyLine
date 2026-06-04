import { Spinner } from './Spinner';

export interface LoadingIndicatorProps {
  label?: string;
  /** overlay = session bootstrap; inline = page/section fetch rows */
  placement?: 'overlay' | 'inline';
  spinnerSize?: 'sm' | 'md';
  className?: string;
}

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(' ');
}

function LoadingIndicatorContent({
  label,
  spinnerSize = 'md',
}: Pick<LoadingIndicatorProps, 'label' | 'spinnerSize'>) {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="flex items-center justify-center rounded border border-slate-800 bg-slate-900 px-4 py-2.5 shadow-md">
        <Spinner size={spinnerSize} variant="brand" wellClassName="bg-slate-900" />
      </div>
      {label ? (
        <span className="text-sm font-semibold tracking-tight text-slate-600">{label}</span>
      ) : null}
    </div>
  );
}

export default function LoadingIndicator({
  label,
  placement = 'inline',
  spinnerSize = 'md',
  className = '',
}: LoadingIndicatorProps) {
  if (placement === 'overlay') {
    return (
      <div
        className="fixed inset-0 z-50 bg-zinc-200/80 backdrop-blur-[1px]"
        aria-busy="true"
        aria-label={label ?? 'Loading'}
      >
        <div className="flex h-16 w-full items-center justify-center border-b border-slate-300/70 bg-white/95 shadow-sm">
          <LoadingIndicatorContent label={label} spinnerSize={spinnerSize} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={joinClasses(
        'flex h-14 w-full items-center justify-center rounded border border-slate-300/70 bg-white/95 px-4 shadow-sm',
        className
      )}
      aria-busy="true"
      aria-label={label ?? 'Loading'}
    >
      <LoadingIndicatorContent label={label} spinnerSize={spinnerSize} />
    </div>
  );
}
