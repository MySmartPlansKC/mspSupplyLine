import { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  heading?: ReactNode;
  subheading?: ReactNode;
  actions?: ReactNode;
  bodyClassName?: string;
  noBodyPadding?: boolean;
}

export default function Card({
  heading,
  subheading,
  actions,
  className = '',
  bodyClassName = '',
  noBodyPadding = false,
  children,
  ...props
}: CardProps) {
  return (
    <section
      className={`rounded border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${className}`}
      {...props}
    >
      {heading || subheading ? (
        <header className="flex flex-col gap-2 border-b border-slate-200/70 bg-slate-50/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 sm:text-sm">
              {heading}
            </h2>
            {subheading ? (
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{subheading}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-1">{actions}</div>
          ) : null}
        </header>
      ) : null}
      <div className={noBodyPadding ? bodyClassName : `p-3 ${bodyClassName}`.trim()}>{children}</div>
    </section>
  );
}
