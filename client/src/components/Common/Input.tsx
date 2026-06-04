import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
}

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(' ');
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, wrapperClassName, id, ...props },
  ref
) {
  const resolvedId = id ?? (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={joinClasses('grid gap-0.5', wrapperClassName)}>
      {label ? (
        <label className="sl-input-label" htmlFor={resolvedId}>
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={resolvedId}
        className={joinClasses('sl-input', error ? 'sl-input--error' : '', className)}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </div>
  );
});

export default Input;
