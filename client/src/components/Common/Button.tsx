import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

type ButtonVariant = 'primary' | 'success' | 'secondary' | 'ghost' | 'danger' | 'link';
type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-600 hover:bg-blue-700 text-white! border border-blue-700/50 disabled:bg-blue-400/60 disabled:text-white!',
  success:
    'bg-emerald-600 hover:bg-emerald-700 text-white! border border-emerald-700/50 disabled:bg-emerald-400/60 disabled:text-white!',
  secondary:
    'bg-slate-800 text-slate-200! border border-slate-600 hover:bg-slate-700 hover:border-slate-500 disabled:bg-slate-800/60 disabled:text-slate-500!',
  ghost:
    'bg-white text-slate-700! border border-slate-300 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400!',
  danger:
    'bg-red-600 hover:bg-red-700 text-white! border border-red-700/50 disabled:bg-red-400/60 disabled:text-white!',
  link: 'bg-transparent text-blue-600! hover:underline p-0 h-auto font-normal',
};

/** md = standard control (default); sm = compact dense UI when explicitly passed */
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-6 px-2 text-[11px]',
  md: 'h-8 px-3 text-sm',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const base = variant === 'link'
    ? 'inline-flex shrink-0 items-center gap-1 transition-colors duration-150 select-none cursor-pointer disabled:cursor-not-allowed'
    : 'inline-flex shrink-0 items-center justify-center gap-1.5 rounded font-medium tracking-tight transition-colors duration-150 shadow-[0_1px_1px_rgba(0,0,0,0.03)] select-none cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:shadow-none';

  return (
    <button
      className={`${base} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {loading ? <Spinner size="sm" className="text-current" /> : leftIcon}
      {children}
    </button>
  );
}
