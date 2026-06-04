import { ReactNode } from 'react';
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
    <header className="flex h-14 w-full select-none items-center justify-between border-b border-slate-800 bg-slate-900 px-4">
      {/* Left: brand mark + dual-level page context */}
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Logo showText theme="dark" size="header" className="shrink-0" />

        <div className="flex min-w-0 flex-col justify-center border-l border-slate-700 pl-4">
          <h1
            className={`truncate text-lg font-semibold uppercase leading-none tracking-wider ${titleAccentClass[accent]}`}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs font-normal leading-tight text-slate-400">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      {/* Right: flat action siblings — no nested wrappers */}
      {actions ? (
        <div className="ml-auto flex shrink-0 items-center gap-3">{actions}</div>
      ) : null}
    </header>
  );
}
