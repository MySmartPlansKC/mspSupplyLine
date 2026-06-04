import { HTMLAttributes } from 'react';

type SpinnerSize = 'sm' | 'md' | 'lg';
export type SpinnerVariant = 'default' | 'brand';

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
  /** default = neutral; brand = SupplyLine blue → emerald conic ring */
  variant?: SpinnerVariant;
  /** Inner cutout color for brand variant (match parent surface). */
  wellClassName?: string;
}

const sizeMap: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-9 w-9',
};

const insetMap: Record<SpinnerSize, string> = {
  sm: 'inset-[2px]',
  md: 'inset-[2.5px]',
  lg: 'inset-[3px]',
};

const variantMap: Record<SpinnerVariant, string> = {
  default: 'border-2 border-slate-300 border-t-current rounded-full animate-spin',
  brand: 'rounded-full animate-spin bg-[conic-gradient(from_0deg,#3b82f6,#10b981,#3b82f6)]',
};

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(' ');
}

export function Spinner({
  size = 'md',
  variant = 'default',
  wellClassName = 'bg-slate-950',
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
          className={joinClasses(
            'absolute rounded-full',
            insetMap[size],
            wellClassName
          )}
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
