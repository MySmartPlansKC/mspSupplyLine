import { HTMLAttributes } from 'react';

type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
}

const sizeMap: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-[3px]',
};

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(' ');
}

export function Spinner({ size = 'md', className, ...props }: SpinnerProps) {
  return (
    <div
      aria-label="Loading"
      role="status"
      className={joinClasses(
        'inline-block animate-spin rounded-full border-slate-300 border-t-current',
        sizeMap[size],
        className
      )}
      {...props}
    />
  );
}
