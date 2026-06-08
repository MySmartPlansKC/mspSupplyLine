import { ReactNode } from 'react';
import DevLoadingPreviewToggle from './DevLoadingPreviewToggle';
import Logo from './Logo';

export type AppShellAccent = 'blue' | 'emerald' | 'neutral';

export interface AppShellHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  accent?: AppShellAccent;
}

const titleAccentClass: Record<AppShellAccent, string> = {
  blue: 'text-white',
  emerald: 'text-emerald-400',
  neutral: 'text-white',
};

export default function AppShellHeader({
  title,
  subtitle,
  actions,
  accent = 'blue',
}: AppShellHeaderProps) {
  return (
    <header className="flex min-h-14 w-full flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-slate-800 bg-slate-900 px-3 py-2 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
        <Logo showText theme="dark" size="header" className="shrink-0 max-sm:[&>div:last-child]:hidden" />

        <div className="flex min-w-0 flex-1 flex-col justify-center border-l border-slate-700 pl-2 sm:pl-4">
          <h1
            className={`truncate text-sm font-semibold uppercase leading-none tracking-wider sm:text-lg ${titleAccentClass[accent]}`}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 hidden min-w-0 truncate text-xs font-normal leading-tight text-slate-400 sm:block">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      {import.meta.env.DEV || actions ? (
        <div className="ml-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
          {import.meta.env.DEV ? <DevLoadingPreviewToggle /> : null}
          {actions}
        </div>
      ) : null}
    </header>
  );
}
