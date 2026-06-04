import { FC } from 'react';

export type LogoSize = 'header' | 'loginMobile' | 'loginDesktop';

const logoSizeStyles: Record<
  LogoSize,
  { iconClassName: string; wordmarkClassName: string }
> = {
  header: { iconClassName: 'h-9 w-auto', wordmarkClassName: 'text-xl' },
  loginMobile: { iconClassName: 'h-11 w-auto', wordmarkClassName: 'text-2xl' },
  loginDesktop: { iconClassName: 'h-14 w-auto', wordmarkClassName: 'text-3xl' },
};

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(' ');
}

interface LogoProps {
  /** Wrapper utilities (e.g. shrink-0). */
  className?: string;
  iconClassName?: string;
  showText?: boolean;
  theme?: 'light' | 'dark';
  wordmarkClassName?: string;
  size?: LogoSize;
}

export const Logo: FC<LogoProps> = ({
  className,
  iconClassName,
  showText = true,
  theme = 'light',
  wordmarkClassName,
  size,
}) => {
  const sizeStyles = size ? logoSizeStyles[size] : null;
  const resolvedIconClassName = joinClasses(
    sizeStyles?.iconClassName ?? 'h-11 w-auto',
    iconClassName
  );
  const wordmarkSizeClass =
    wordmarkClassName ?? sizeStyles?.wordmarkClassName ?? 'text-base';
  const isDark = theme === 'dark';
  const gapClass = size === 'loginDesktop' ? 'gap-3' : 'gap-2';

  return (
    <div className={joinClasses('flex select-none items-center', gapClass, className)}>
      <svg
        className={resolvedIconClassName}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M6 10C6 7.79086 7.79086 6 10 6H22C24.2091 6 26 7.79086 26 10V12H20V10H12V12H6V10Z"
          className={isDark ? 'fill-blue-500' : 'fill-blue-600 dark:fill-blue-500'}
        />
        <rect x="2" y="14" width="28" height="4" rx="2" className="fill-emerald-500" />
        <path
          d="M26 22C26 24.2091 24.2091 26 22 26H10C7.79086 26 6 24.2091 6 22V20H12V22H20V20H26V22Z"
          className={isDark ? 'fill-blue-500' : 'fill-blue-600 dark:fill-blue-500'}
        />
      </svg>

      {showText ? (
        <div
          className={`flex items-center font-sans font-bold tracking-tight ${wordmarkSizeClass}`}
        >
          <span className={isDark ? 'text-white' : 'text-slate-900'}>Supply</span>
          <span className={isDark ? 'text-blue-500' : 'text-blue-600'}>Line</span>
        </div>
      ) : null}
    </div>
  );
};

export default Logo;
