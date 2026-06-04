import { useMemo, useState } from 'react';
import Button from '../Common/Button';

export interface DiagnosticPayload {
  errorName: string;
  errorMessage: string;
  stack: string | null;
  componentStack: string | null;
  timestamp: string;
  url: string;
  userAgent: string;
  language: string;
  online: boolean;
  viewport: string;
}

interface DiagnosticModalProps {
  payload: DiagnosticPayload;
  onDismiss: () => void;
  onReload: () => void;
}

function buildClipboardReport(payload: DiagnosticPayload): string {
  return [
    'MySmartPlans SupplyLine Diagnostic Report',
    `Timestamp (UTC): ${payload.timestamp}`,
    `URL: ${payload.url}`,
    `Online: ${payload.online}`,
    `Language: ${payload.language}`,
    `Viewport: ${payload.viewport}`,
    `User-Agent: ${payload.userAgent}`,
    '',
    `Error Name: ${payload.errorName}`,
    `Error Message: ${payload.errorMessage}`,
    '',
    'Stack Trace:',
    payload.stack ?? '(not available)',
    '',
    'Component Stack:',
    payload.componentStack ?? '(not available)',
  ].join('\n');
}

async function copyFallback(text: string): Promise<void> {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textArea);
  if (!copied) {
    throw new Error('Clipboard copy command failed');
  }
}

export default function DiagnosticModal({
  payload,
  onDismiss,
  onReload,
}: DiagnosticModalProps) {
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle');
  const report = useMemo(() => buildClipboardReport(payload), [payload]);

  async function handleCopyDetails() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(report);
      } else {
        await copyFallback(report);
      }
      setCopyState('success');
    } catch {
      setCopyState('error');
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] grid place-items-center bg-slate-900/60 p-3" role="presentation">
      <section
        className="grid max-h-[calc(100vh-1.5rem)] w-full max-w-2xl gap-2 overflow-auto rounded border border-slate-200/70 bg-white p-3"
        role="dialog"
        aria-modal="true"
        aria-labelledby="diag-title"
      >
        <h1 id="diag-title" className="font-bold uppercase tracking-wider">
          Something went wrong
        </h1>
        <p>
          The app encountered an unexpected error. Please copy the diagnostic details and send them
          to <strong>support@mysmarttrax.com</strong>.
        </p>

        <div className="rounded border-l-2 border-red-500 bg-red-50/80 p-2">
          <p className="text-red-900!">
            <strong>{payload.errorName}:</strong> {payload.errorMessage}
          </p>
          <p className="mt-0.5 text-red-700!">Captured at {payload.timestamp}</p>
        </div>

        <pre className="max-h-60 overflow-auto rounded border border-slate-200/70 bg-slate-50 p-2 leading-relaxed">
          {report}
        </pre>

        {copyState === 'success' ? (
          <p className="text-emerald-700!">Error details copied to clipboard.</p>
        ) : null}
        {copyState === 'error' ? (
          <p className="text-red-700!">
            Copy failed. Please select the details and copy manually.
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-1">
          <Button type="button" onClick={handleCopyDetails}>
            Copy Error Details
          </Button>
          <Button type="button" variant="ghost" onClick={onReload}>
            Reload App
          </Button>
          <Button type="button" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </section>
    </div>
  );
}
