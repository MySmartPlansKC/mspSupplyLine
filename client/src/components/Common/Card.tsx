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
      className={`rounded bg-white border border-slate-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${className}`}
      {...props}
    >
      {heading || subheading ? (
        <header className="border-b border-slate-200/70 bg-slate-50/50 px-3 py-2 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">{heading}</h2>
            {subheading ? <p className="text-sm text-slate-500 mt-0.5">{subheading}</p> : null}
          </div>
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </header>
      ) : null}
      <div className={noBodyPadding ? bodyClassName : `p-3 ${bodyClassName}`.trim()}>{children}</div>
    </section>
  );
}