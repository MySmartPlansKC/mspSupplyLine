import { ReactNode } from 'react';
import Button from '../Common/Button';

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-3"
      role="presentation"
      onClick={onCancel}
    >
      <section
        className="grid w-full max-w-md gap-4 overflow-auto rounded-t-xl border border-slate-200/70 bg-white p-4 shadow-lg sm:max-h-[calc(100vh-1.5rem)] sm:rounded"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div>
          <h2 id="confirm-modal-title" className="font-bold text-slate-900">
            {title}
          </h2>
          <div className="mt-2 text-sm leading-relaxed text-slate-600">{message}</div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            disabled={loading}
            className="w-full sm:w-auto"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            loading={loading}
            className="w-full sm:w-auto"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
