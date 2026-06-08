import { useMemo, useState } from 'react';
import Button from '../Common/Button';
import Logo from '../Common/Logo';

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

function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
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

function buildCompactTechnical(payload: DiagnosticPayload): string {
  const lines = [
    payload.stack?.trim(),
    payload.componentStack?.trim() ? `\nComponent trace:\n${payload.componentStack.trim()}` : null,
    `\nURL: ${payload.url}`,
    `Viewport: ${payload.viewport}`,
    `Online: ${payload.online}`,
  ].filter(Boolean);
  return lines.join('\n');
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
  const compactTechnical = useMemo(() => buildCompactTechnical(payload), [payload]);

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
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
    >
      <section
        className="grid max-h-[100dvh] w-full min-w-0 max-w-2xl gap-4 overflow-auto rounded-t-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl ring-1 ring-blue-500/20 sm:max-h-[calc(100vh-2rem)] sm:rounded sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="diag-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="min-w-0 space-y-2">
            <Logo showText theme="dark" size="header" className="opacity-90" />
            <h1 id="diag-title" className="text-lg font-semibold text-slate-100">
              Something went wrong
            </h1>
            <p className="text-sm leading-relaxed text-slate-400">
              Send diagnostic details to{' '}
              <a
                href="mailto:support@mysmarttrax.com"
                className="font-medium text-blue-400 hover:text-blue-300"
              >
                support@mysmarttrax.com
              </a>
            </p>
          </div>
        </div>

        <div className="rounded border border-red-500/30 bg-red-950/40 px-3 py-2.5">
          <p className="text-sm font-semibold text-red-300">{payload.errorName}</p>
          <p className="mt-1 break-words text-base leading-snug text-red-100">
            {payload.errorMessage}
          </p>
          <p className="mt-2 text-xs text-red-300/80">
            {formatTimestamp(payload.timestamp)}
          </p>
        </div>

        <details className="group min-w-0 overflow-hidden rounded border border-slate-800 bg-slate-950/60">
          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-300">
            Technical details
          </summary>
          <pre className="max-h-48 overflow-auto overscroll-contain border-t border-slate-800 px-3 py-2 font-mono text-[10px] leading-relaxed whitespace-pre-wrap break-words text-slate-500">
            {compactTechnical}
          </pre>
        </details>

        {copyState === 'success' ? (
          <p className="text-xs text-emerald-400">Full diagnostic report copied to clipboard.</p>
        ) : null}
        {copyState === 'error' ? (
          <p className="text-xs text-red-400">
            Copy failed. Expand technical details and copy manually.
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-800 pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={handleCopyDetails}>
            Copy report
          </Button>
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={onReload}>
            Reload
          </Button>
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </section>
    </div>
  );
}
