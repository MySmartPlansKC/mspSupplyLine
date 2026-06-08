import { HTMLAttributes } from 'react';

type SpinnerSize = 'sm' | 'md' | 'lg';
export type SpinnerVariant = 'default' | 'brand';

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
  /** default = neutral arc; brand = SupplyLine blue → emerald ring */
  variant?: SpinnerVariant;
  /** Inner cutout — match the surface behind the hole (e.g. parent box bg). */
  wellClassName?: string;
}

const sizeMap: Record<SpinnerSize, string> = {
  sm: 'h-5 w-5',
  md: 'h-9 w-9',
  lg: 'h-12 w-12',
};

/** Larger inset = thinner ring band around the hollow center. */
const insetMap: Record<SpinnerSize, string> = {
  sm: 'inset-[3px]',
  md: 'inset-[4px]',
  lg: 'inset-[6px]',
};

const variantMap: Record<SpinnerVariant, string> = {
  default: 'border-2 border-slate-300 border-t-current rounded-full animate-spin',
  brand:
    'rounded-full animate-spin bg-[conic-gradient(from_0deg,#2563eb_0deg,#10b981_220deg,#2563eb_360deg)]',
};

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(' ');
}

export function Spinner({
  size = 'md',
  variant = 'default',
  wellClassName = 'bg-white',
  className,
  ...props
}: SpinnerProps) {
  if (variant === 'brand') {
    return (
      <div
        aria-label="Loading"
        role="status"
        className={joinClasses('relative inline-flex shrink-0', sizeMap[size], className)}
        {...props}
      >
        <div className={joinClasses('absolute inset-0', variantMap.brand)} />
        <div
          className={joinClasses('absolute rounded-full', insetMap[size], wellClassName)}
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div
      aria-label="Loading"
      role="status"
      className={joinClasses('inline-block', variantMap.default, sizeMap[size], className)}
      {...props}
    />
  );
}
