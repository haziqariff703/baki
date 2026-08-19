'use client';

/**
 * Import wizard — CSV/PDF statement upload + deterministic in-browser parse.
 *
 * Pure client-side: no backend, no persistence. The file is validated through
 * `uploadedFileSchema` (§7/§12: ≤5 MB, CSV or PDF only), read into memory, and
 * parsed with the existing pure functions `parseCsv` / `parsePdfText`. Raw
 * bytes never leave the browser. Includes 1-click synthetic Malaysian presets
 * for instant testing without uploading files.
 */

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  UploadCloud,
  FileText,
  Loader2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  ChevronDown,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { parseCsv, parsePdfText, MAX_CSV_ROWS, MAX_PDF_PAGES } from '@/features/imports';
import { uploadedFileSchema, type ImportRowSchema } from '@/lib/validation';
import { MAX_UPLOAD_SIZE_BYTES } from '@/lib/validation/imports';
import { senToMyr } from '@/lib/money';
import { toDatePart } from '@/lib/dates';
import { BrandLogo } from '@/components/subscriptions/BrandLogo';
import { cn } from '@/lib/utils';

interface RowError {
  readonly label: string;
  readonly message: string;
}

type ParseOutcome =
  | { kind: 'csv'; rows: readonly ImportRowSchema[]; errors: readonly RowError[]; truncated: boolean }
  | { kind: 'pdf'; rows: readonly ImportRowSchema[]; errors: readonly RowError[]; truncated: boolean; empty: boolean };

type Status =
  | { state: 'idle' }
  | { state: 'parsing'; fileName: string }
  | { state: 'done'; fileName: string; outcome: ParseOutcome }
  | { state: 'error'; message: string };

const MAX_SIZE_MB = Math.round(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024));

function Notice({ Icon, children }: { readonly Icon: LucideIcon; readonly children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-xs text-status-amber-text bg-status-amber-surface border border-status-amber-border rounded-xl px-4 py-3">
      <Icon className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export function ImportWizard() {
  const t = useTranslations('Imports');
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null); // the original file, kept for server persist
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const [dragActive, setDragActive] = useState(false);
  const [errorsOpen, setErrorsOpen] = useState(false);
  const [persisting, setPersisting] = useState(false);
  const [persistMsg, setPersistMsg] = useState<string | null>(null);

  async function handleFile(file: File) {
    const descriptor = uploadedFileSchema.safeParse({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!descriptor.success) {
      const issue = descriptor.error.issues[0]?.message ?? '';
      let message: string = t('errorInvalid');
      if (issue.includes('CSV or PDF')) message = t('errorWrongType');
      else if (issue.includes('5 MB')) message = t('errorOversize', { maxSize: MAX_SIZE_MB });
      setStatus({ state: 'error', message });
      return;
    }

    fileRef.current = file;
    const fileName = file.name;
    setStatus({ state: 'parsing', fileName });
    setErrorsOpen(false);
    setPersistMsg(null);

    try {
      if (file.type === 'text/csv') {
        const text = await file.text();
        const result = parseCsv(text);
        const errors: RowError[] = result.errors.map((e) => ({
          label: t('errorRowLabel', { row: e.row }),
          message: e.error,
        }));
        setStatus({
          state: 'done',
          fileName,
          outcome: { kind: 'csv', rows: result.rows, errors, truncated: result.truncated },
        });
      } else {
        const buffer = await file.arrayBuffer();
        const result = await parsePdfText(buffer);
        const errors: RowError[] = result.errors.map((e) => ({
          label: t('errorPageLabel', { page: e.page }),
          message: e.error,
        }));
        setStatus({
          state: 'done',
          fileName,
          outcome: {
            kind: 'pdf',
            rows: result.rows,
            errors,
            truncated: result.truncated,
            empty: result.empty,
          },
        });
      }
    } catch {
      setStatus({ state: 'error', message: t('errorParseFailed') });
    }
  }

  /** Upload the original file to the backend for authoritative persist + purge. */
  async function persist(): Promise<void> {
    const file = fileRef.current;
    if (!file) return;
    setPersisting(true);
    setPersistMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/imports', { method: 'POST', body: formData });
      if (!res.ok) {
        setPersistMsg(t('persistFailed'));
        return;
      }
      const data = (await res.json()) as { importedCount: number; errors: unknown[] };
      setPersistMsg(t('persisted', { count: data.importedCount }));
    } catch {
      setPersistMsg(t('persistFailed'));
    } finally {
      setPersisting(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function reset() {
    setStatus({ state: 'idle' });
    setErrorsOpen(false);
  }

  function loadSamplePreset(presetKey: 'student' | 'worker') {
    const studentRows: readonly ImportRowSchema[] = [
      { merchantName: 'Spotify', amountSen: 1590, transactionDate: '2026-08-01T00:00:00.000Z' },
      { merchantName: 'Netflix', amountSen: 4500, transactionDate: '2026-08-03T00:00:00.000Z' },
      { merchantName: 'CelcomDigi Postpaid', amountSen: 6000, transactionDate: '2026-08-05T00:00:00.000Z' },
      { merchantName: 'iCloud+', amountSen: 390, transactionDate: '2026-08-12T00:00:00.000Z' },
    ];

    const workerRows: readonly ImportRowSchema[] = [
      { merchantName: 'Anytime Fitness', amountSen: 15900, transactionDate: '2026-08-01T00:00:00.000Z' },
      { merchantName: 'ChatGPT Plus', amountSen: 9900, transactionDate: '2026-08-04T00:00:00.000Z' },
      { merchantName: 'Maxis Postpaid', amountSen: 9800, transactionDate: '2026-08-08T00:00:00.000Z' },
    ];

    const rows = presetKey === 'student' ? studentRows : workerRows;
    const fileName = presetKey === 'student' ? 'sample-malaysian-student.csv' : 'sample-young-worker.csv';

    setStatus({
      state: 'done',
      fileName,
      outcome: {
        kind: 'csv',
        rows,
        errors: [],
        truncated: false,
      },
    });
  }

  const parsing = status.state === 'parsing';
  const done = status.state === 'done' ? status : null;
  const outcome = done?.outcome ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Dropzone & Presets - Left Column */}
      <div className="lg:col-span-5 space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          className={cn(
            'bg-surface-1 border border-dashed rounded-xl p-8 md:p-12 flex flex-col items-center justify-center text-center space-y-4 transition-colors',
            dragActive ? 'border-accent bg-surface-2' : 'border-border-2',
          )}
        >
          <UploadCloud className="w-8 h-8 text-text-faint" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-base font-semibold text-text-primary">{t('dropzoneTitle')}</p>
            <p className="text-sm text-text-muted">
              {t('dropzoneHint', { maxSize: MAX_SIZE_MB })}
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,.pdf,text/csv,application/pdf"
            onChange={onInputChange}
            className="sr-only"
            aria-label={t('browseCta')}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={parsing}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-border-3 bg-surface-3 text-text-primary text-sm font-medium hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-50 min-h-[40px]"
          >
            {parsing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                {t('parsing')}
              </>
            ) : (
              t('browseCta')
            )}
          </button>

          {status.state === 'error' && (
            <p role="alert" className="text-xs text-status-rose-text flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {status.message}
            </p>
          )}
        </div>

        {/* 1-Click Sample Malaysian Presets */}
        <div className="bg-surface-1 border border-border-1 rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-mono uppercase tracking-wider text-text-faint">
              {t('demoPresetHeading')}
            </h2>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => loadSamplePreset('student')}
              className="w-full text-left p-3 rounded-xl border border-border-2 bg-surface-2/40 hover:bg-surface-2 hover:border-border-3 transition-colors space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary">
                  {t('demoPresetStudent')}
                </span>
                <span className="text-xs text-accent font-medium">{t('demoLoadCta')}</span>
              </div>
              <p className="text-[11px] text-text-muted">{t('demoPresetStudentDesc')}</p>
            </button>

            <button
              type="button"
              onClick={() => loadSamplePreset('worker')}
              className="w-full text-left p-3 rounded-xl border border-border-2 bg-surface-2/40 hover:bg-surface-2 hover:border-border-3 transition-colors space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary">
                  {t('demoPresetWorker')}
                </span>
                <span className="text-xs text-accent font-medium">{t('demoLoadCta')}</span>
              </div>
              <p className="text-[11px] text-text-muted">{t('demoPresetWorkerDesc')}</p>
            </button>

            <div className="pt-2 border-t border-border-1 flex items-center justify-between text-[11px] text-text-faint px-1">
              <span>Download sample CSV:</span>
              <div className="flex items-center gap-3">
                <a
                  href="/samples/malaysian_student_statement.csv"
                  download="malaysian_student_statement.csv"
                  className="text-text-muted hover:text-accent font-mono underline"
                >
                  Student CSV
                </a>
                <a
                  href="/samples/young_worker_statement.csv"
                  download="young_worker_statement.csv"
                  className="text-text-muted hover:text-accent font-mono underline"
                >
                  Worker CSV
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results / Guidelines - Right Column */}
      <div className="lg:col-span-7">
        {done && outcome ? (
          <section
            aria-labelledby="import-results-heading"
            aria-live="polite"
            className="bg-surface-1 border border-border-1 rounded-xl overflow-hidden"
          >
          <div className="p-6 md:p-8 space-y-5">
            <div className="border-b border-border-1 pb-4 flex items-baseline justify-between gap-4 flex-wrap">
              <div>
                <h2
                  id="import-results-heading"
                  className="text-xl font-semibold tracking-[-0.01em] leading-[1.25] text-text-primary"
                >
                  {t('resultsHeading')}
                </h2>
                <p className="text-sm text-text-muted mt-1">{t('resultsSub')}</p>
              </div>
              <span className="font-mono text-xs uppercase tracking-wider text-text-faint flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                {done.fileName}
              </span>
            </div>

            <p className="text-sm text-text-secondary">
              {t('resultsCount', { count: outcome.rows.length })}
            </p>

            <div className="space-y-2">
              {outcome.kind === 'pdf' && outcome.empty && (
                <Notice Icon={AlertTriangle}>{t('emptyPdfNotice')}</Notice>
              )}
              {outcome.truncated && (
                <Notice Icon={AlertTriangle}>
                  {outcome.kind === 'csv'
                    ? t('truncatedCsvNotice', { max: MAX_CSV_ROWS })
                    : t('truncatedPdfNotice', { max: MAX_PDF_PAGES })}
                </Notice>
              )}
              {outcome.rows.length === 0 && !(outcome.kind === 'pdf' && outcome.empty) && (
                <Notice Icon={AlertTriangle}>{t('noRowsNotice')}</Notice>
              )}
            </div>

            {outcome.rows.length > 0 && (
              <ul className="divide-y divide-border-1 border border-border-1 rounded-xl bg-surface-2 max-h-80 overflow-y-auto">
                {outcome.rows.map((row, i) => (
                  <li
                    key={`${row.merchantName}-${row.transactionDate}-${i}`}
                    className="flex items-baseline justify-between gap-3 px-5 py-3"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <BrandLogo merchantName={row.merchantName} size={18} />
                      <span className="font-mono text-xs text-text-faint w-24 shrink-0">
                        {toDatePart(row.transactionDate)}
                      </span>
                      <span className="text-sm text-text-secondary truncate">
                        {row.merchantName}
                      </span>
                    </span>
                    <span className="font-mono text-sm text-text-primary shrink-0">
                      MYR {senToMyr(row.amountSen)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {outcome.errors.length > 0 && (
              <div className="border border-status-amber-border rounded-xl bg-status-amber-surface/40 p-4 space-y-2">
                <button
                  type="button"
                  onClick={() => setErrorsOpen((o) => !o)}
                  className="w-full flex items-center justify-between text-xs font-medium text-status-amber-text hover:text-text-primary transition-colors"
                >
                  <span>
                    {t('errorsHeading')} ({t('errorsCount', { count: outcome.errors.length })})
                  </span>
                  <ChevronDown
                    className={cn('w-4 h-4 transition-transform', errorsOpen && 'rotate-180')}
                  />
                </button>
                {errorsOpen && (
                  <ul className="divide-y divide-status-amber-border/40 text-xs text-text-secondary pt-2 space-y-1">
                    {outcome.errors.map((err, i) => (
                      <li key={`${err.label}-${i}`} className="flex justify-between py-1">
                        <span className="font-mono">{err.label}</span>
                        <span className="text-text-muted">{err.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="pt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void persist()}
                disabled={persisting}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-accent bg-accent text-surface-0 text-sm font-semibold hover:bg-accent-hover transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 min-h-[40px]"
              >
                {persisting ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <>
                    <span>{t('persistCta')}</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border-2 bg-surface-2 text-text-secondary text-sm font-medium hover:text-text-primary hover:bg-surface-3 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t('resetCta')}</span>
              </button>
            </div>
            {persistMsg && (
              <p className="text-xs text-text-muted" role="status" aria-live="polite">
                {persistMsg}
              </p>
            )}
          </div>
        </section>
        ) : (
          <div className="bg-surface-1 border border-border-1 rounded-xl p-8 text-center space-y-2">
            <p className="text-sm text-text-secondary font-medium">{t('dropzoneTitle')}</p>
            <p className="text-xs text-text-muted">{t('dropzoneHint', { maxSize: MAX_SIZE_MB })}</p>
          </div>
        )}
      </div>
    </div>
  );
}
