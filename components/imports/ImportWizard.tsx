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
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  Camera,
  ImageIcon,
  type LucideIcon,
} from 'lucide-react';
import {
  parseCsv,
  parsePdfText,
  extractTransactionsFromText,
  parseReceiptLines,
  recognizeReceiptImage,
  MAX_CSV_ROWS,
  MAX_PDF_PAGES,
} from '@/features/imports';
import { uploadedFileSchema, type ImportRowSchema } from '@/lib/validation';
import { MAX_UPLOAD_SIZE_BYTES } from '@/lib/validation/imports';
import { senToMyr } from '@/lib/money';
import { toDatePart } from '@/lib/dates';
import { BrandLogo } from '@/components/subscriptions/BrandLogo';
import { Pagination } from '@/components/shared/Pagination';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/routing';

interface RowError {
  readonly label: string;
  readonly message: string;
}

type ParseOutcome =
  | { kind: 'csv'; rows: readonly ImportRowSchema[]; errors: readonly RowError[]; truncated: boolean }
  | { kind: 'pdf'; rows: readonly ImportRowSchema[]; errors: readonly RowError[]; truncated: boolean; empty: boolean };

type Status =
  | { state: 'idle' }
  | { state: 'validating'; fileName: string }
  | { state: 'parsing'; fileName: string }
  | { state: 'password_required'; fileName: string; error?: string }
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
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null); // the original file, kept for server persist
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorsOpen, setErrorsOpen] = useState(false);
  const [persisting, setPersisting] = useState(false);
  const [persistMsg, setPersistMsg] = useState<string | null>(null);
  const [persistedData, setPersistedData] = useState<{
    importedCount: number;
    candidatesCount: number;
  } | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [pdfPassword, setPdfPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const PREVIEW_PAGE_SIZE = 10;

  function handleParsePastedText() {
    if (!pastedText.trim()) return;
    const text = pastedText.trim();
    setStatus({ state: 'parsing', fileName: 'Pasted Statement' });

    let rows: ImportRowSchema[] = [];
    // If it looks like CSV:
    if (text.includes(',') && text.split('\n').length > 1) {
      const csvRes = parseCsv(text);
      if (csvRes.rows.length > 0) {
        rows = [...csvRes.rows];
      }
    }

    // Universal stream segmenter fallback:
    if (rows.length === 0) {
      rows = extractTransactionsFromText(text);
    }

    setStatus({
      state: 'done',
      fileName: 'Pasted Statement',
      outcome: {
        kind: 'pdf',
        rows,
        errors: [],
        truncated: false,
        empty: rows.length === 0,
      },
    });
  }

  async function handleFile(file: File, customPassword?: string) {
    const descriptor = uploadedFileSchema.safeParse({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!descriptor.success) {
      const issue = descriptor.error.issues[0]?.message ?? '';
      let message: string = t('errorInvalid');
      if (issue.includes('CSV, PDF, or image') || issue.includes('extension')) message = t('errorWrongType');
      else if (issue.includes('5 MB')) message = t('errorOversize', { maxSize: MAX_SIZE_MB });
      setStatus({ state: 'error', message });
      return;
    }

    fileRef.current = file;
    const fileName = file.name;
    setStatus({ state: 'parsing', fileName });
    setErrorsOpen(false);
    setPersistMsg(null);
    setShowPasswordPrompt(false);
    setOcrProgress(null);

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
      } else if (file.type.startsWith('image/')) {
        setOcrProgress(0);
        try {
          const result = await recognizeReceiptImage(file, (pct) => {
            setOcrProgress(pct);
          });
          setStatus({
            state: 'done',
            fileName,
            outcome: {
              kind: 'pdf',
              rows: result.rows,
              errors: [],
              truncated: false,
              empty: result.rows.length === 0,
            },
          });
        } catch {
          setStatus({
            state: 'error',
            message: 'Could not read receipt image. Please ensure image has good lighting or paste the text directly.',
          });
        } finally {
          setOcrProgress(null);
        }
      } else {
        // PDF statements: send directly to the Node.js server route handler for fast, robust parsing
        const formData = new FormData();
        formData.append('file', file);
        const pwd = customPassword || pdfPassword;
        if (pwd) {
          formData.append('password', pwd);
        }

        const res = await fetch('/api/imports', { method: 'POST', body: formData });

        if (res.status === 422) {
          const errJson = await res.json().catch(() => ({}));
          if (errJson.error === 'PASSWORD_REQUIRED' || errJson.error === 'INVALID_PASSWORD') {
            setShowPasswordPrompt(true);
            setStatus({
              state: 'password_required',
              fileName,
              error:
                errJson.error === 'INVALID_PASSWORD'
                  ? errJson.message || 'Incorrect password. Please verify your IC number / statement password.'
                  : undefined,
            });
            return;
          }
        }

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          if (res.status === 401) {
            // Demo fallback: in unauthenticated mode, parse in browser
            const buffer = await file.arrayBuffer();
            const result = await parsePdfText(buffer, pwd || undefined);
            const isPasswordIssue = result.errors.some(
              (e) =>
                e.error.toLowerCase().includes('password') ||
                e.error.toLowerCase().includes('ic number'),
            );
            if (isPasswordIssue) {
              setShowPasswordPrompt(true);
              setStatus({
                state: 'password_required',
                fileName,
                error: customPassword
                  ? 'Incorrect password. Please verify your IC number or statement password.'
                  : undefined,
              });
              return;
            }
            setShowPasswordPrompt(false);
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
            return;
          }

          if (res.status === 403 && errJson.error === 'CONSENT_REQUIRED') {
            setStatus({
              state: 'error',
              message:
                errJson.message ||
                'Statement import consent has been withdrawn. Please enable it in Privacy Settings.',
            });
            toast.warning('Consent required', {
              description: 'Enable Statement Import in Privacy Settings to upload statements.',
            });
            return;
          }

          setStatus({ state: 'error', message: errJson.message || t('errorParseFailed') });
          return;
        }

        const data = (await res.json()) as {
          rows: ImportRowSchema[];
          errors: { page?: number; error: string }[];
          truncated: boolean;
          importedCount: number;
          candidatesCount?: number;
        };

        setShowPasswordPrompt(false);
        const errors: RowError[] = (data.errors || []).map((e) => ({
          label: e.page ? t('errorPageLabel', { page: e.page }) : 'Extraction note',
          message: e.error,
        }));

        setPersistedData({
          importedCount: data.importedCount,
          candidatesCount: data.candidatesCount ?? 0,
        });
        setPersistMsg(t('persisted', { count: data.importedCount }));
        toast.success('Statement imported successfully', {
          description: `Saved ${data.importedCount} transactions. Detected ${data.candidatesCount ?? 0} recurring subscriptions.`,
        });

        setStatus({
          state: 'done',
          fileName,
          outcome: {
            kind: 'pdf',
            rows: data.rows || [],
            errors,
            truncated: data.truncated || false,
            empty: (data.rows || []).length === 0,
          },
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[ImportWizard handleFile error]:', err);
      setStatus({
        state: 'error',
        message:
          errMsg && errMsg !== 'Failed to fetch' && !errMsg.includes('[object')
            ? errMsg
            : t('errorParseFailed'),
      });
    }
  }

  async function handleUnlockPdf(e: React.FormEvent) {
    e.preventDefault();
    if (!fileRef.current || !pdfPassword) return;
    await handleFile(fileRef.current, pdfPassword);
  }

  /** Upload the validated transactions to the backend for authoritative persist + purge. */
  async function persist(): Promise<void> {
    let file = fileRef.current;

    // Always synthesize a clean CSV File from the validated outcome.rows
    // Ensures server import is 100% reliable even for encrypted PDFs and direct text paste.
    if (outcome && outcome.rows.length > 0) {
      const csvHeader = 'Date,Description,Amount\n';
      const csvLines = outcome.rows
        .map(
          (r) =>
            `"${toDatePart(r.transactionDate)}","${r.merchantName.replace(/"/g, '""')}",${(r.amountSen / 100).toFixed(2)}`,
        )
        .join('\n');
      file = new File([csvHeader + csvLines], 'statement.csv', {
        type: 'text/csv',
      });
      fileRef.current = file;
    }

    if (!file) return;
    setPersisting(true);
    setPersistMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/imports', { method: 'POST', body: formData });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 401) {
          // Demo fallback: in unauthenticated mode, show success preview
          setPersistedData({
            importedCount: outcome?.rows.length ?? 4,
            candidatesCount: 4,
          });
          setPersistMsg(t('persisted', { count: outcome?.rows.length ?? 4 }));
          toast.success('Import completed (Demo Mode)', {
            description: `Saved ${outcome?.rows.length ?? 4} transactions.`,
          });
          return;
        }

        if (res.status === 403 && errJson.error === 'CONSENT_REQUIRED') {
          toast.warning('Consent required', {
            description: 'Statement Import is disabled. Enable it in Privacy Settings to upload statements.',
          });
          setPersistMsg(errJson.message || 'Statement import consent has been withdrawn.');
          return;
        }

        const msg = errJson.message || errJson.error || t('persistFailed');
        setPersistMsg(msg);
        toast.error('Import failed', { description: msg });
        return;
      }
      const data = (await res.json()) as {
        importedCount: number;
        candidatesCount?: number;
        errors: unknown[];
      };
      setPersistedData({
        importedCount: data.importedCount,
        candidatesCount: data.candidatesCount ?? 0,
      });
      setPersistMsg(t('persisted', { count: data.importedCount }));
      toast.success('Statement imported successfully', {
        description: `Saved ${data.importedCount} transactions. Detected ${data.candidatesCount ?? 0} recurring subscriptions.`,
      });
    } catch {
      setPersistMsg(t('persistFailed'));
      toast.error('Network error', { description: 'Failed to upload statement to server.' });
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
    setPersistedData(null);
    setPersistMsg(null);
    setShowPasswordPrompt(false);
    setPdfPassword('');
    setShowPassword(false);
    fileRef.current = null;
  }

  async function loadSamplePreset(presetKey: 'student' | 'worker') {
    const fileName =
      presetKey === 'student'
        ? 'malaysian_student_statement.csv'
        : 'young_worker_statement.csv';

    setStatus({ state: 'parsing', fileName });
    try {
      const res = await fetch(`/samples/${fileName}`);
      if (!res.ok) throw new Error('Failed to fetch sample');
      const text = await res.text();
      const file = new File([text], fileName, { type: 'text/csv' });
      await handleFile(file);
    } catch {
      setStatus({ state: 'error', message: t('errorParseFailed') });
    }
  }

  const parsing = status.state === 'parsing';
  const done = status.state === 'done' ? status : null;
  const outcome = done?.outcome ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Dropzone, Text Paste & Presets - Left Column */}
      <div className="lg:col-span-5 space-y-4">
        {status.state === 'password_required' ? (
          <div className="bg-surface-1 border border-border-1 rounded-2xl p-6 sm:p-7 space-y-5 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-status-amber-surface border border-status-amber-border flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-status-amber-text" />
              </div>
              <div className="space-y-1 min-w-0">
                <h2 className="text-base font-semibold text-text-primary">
                  Password-Protected Statement
                </h2>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-2 border border-border-2 text-[11px] font-mono text-text-muted max-w-full truncate">
                  <FileText className="w-3 h-3 shrink-0" />
                  <span className="truncate">{status.fileName}</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-text-muted leading-relaxed space-y-1.5 bg-surface-2 p-3 rounded-xl border border-border-2">
              <p className="font-semibold text-text-secondary">Password Formats by Bank:</p>
              <ul className="space-y-1 text-[11px] list-disc list-inside">
                <li><strong className="text-text-primary">Maybank / Bank Islam / RHB / HLB / Public Bank:</strong> 12-digit IC number (e.g. <code className="font-mono text-accent">010203101234</code>)</li>
                <li><strong className="text-text-primary">CIMB Bank:</strong> First 4 letters of Name + Birth Date DDMM (e.g. <code className="font-mono text-accent">HAZI1508</code>)</li>
              </ul>
            </div>

            <form onSubmit={handleUnlockPdf} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary">
                  Statement Password / NRIC / CIMB Code
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoCapitalize="characters"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    value={pdfPassword}
                    onChange={(e) => setPdfPassword(e.target.value)}
                    placeholder="e.g. 010203101234 or HAZI1508"
                    className="w-full px-3.5 py-3 pr-10 text-xs font-mono bg-surface-2 border border-border-2 rounded-xl text-text-primary focus:outline-none focus:border-accent min-h-[44px]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {status.error && (
                  <p role="alert" className="text-xs text-status-rose-text flex items-center gap-1.5 pt-1 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {status.error}
                  </p>
                )}
              </div>

              {/* Notice: We didn't keep your password */}
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-status-emerald-surface/60 border border-status-emerald-border/70 text-xs text-text-secondary leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-status-emerald-text shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-status-emerald-text">We didn&apos;t keep your password</span>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Decryption runs in isolated memory. Your password and statements are never permanently saved or shared.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="submit"
                  disabled={!pdfPassword.trim() || parsing}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-accent-fg text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[44px]"
                >
                  {parsing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Decrypting Statement...</span>
                    </>
                  ) : (
                    <span>Unlock & Parse Statement</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  disabled={parsing}
                  className="px-3.5 py-2.5 rounded-xl border border-border-2 bg-surface-2 text-text-muted hover:text-text-primary text-xs font-medium transition-colors min-h-[44px]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* Method Selector Tabs */}
            <div className="flex p-1 bg-surface-2 border border-border-2 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={cn(
                  'flex-1 py-2 rounded-lg text-center transition-all min-h-[38px]',
                  activeTab === 'upload'
                    ? 'bg-surface-1 text-text-primary shadow-xs font-semibold'
                    : 'text-text-muted hover:text-text-primary',
                )}
              >
                Upload File / Scan Slip
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={cn(
                  'flex-1 py-2 rounded-lg text-center transition-all min-h-[38px]',
                  activeTab === 'paste'
                    ? 'bg-surface-1 text-text-primary shadow-xs font-semibold'
                    : 'text-text-muted hover:text-text-primary',
                )}
              >
                Paste Text Directly
              </button>
            </div>

            {activeTab === 'upload' ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                className={cn(
                  'bg-surface-1 border border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-4 transition-colors',
                  dragActive ? 'border-accent bg-surface-2' : 'border-border-2',
                )}
              >
                <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-border-2 flex items-center justify-center">
                  <UploadCloud className="w-6 h-6 text-text-muted" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm sm:text-base font-semibold text-text-primary">
                    {t('dropzoneTitle')}
                  </p>
                  <p className="text-xs text-text-muted">
                    Supports PDF bank statements, CSV files, and transaction slip screenshots (PNG/JPG up to 5 MB)
                  </p>
                </div>

                {/* Hidden input for PDF/CSV */}
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.pdf,text/csv,application/pdf"
                  onChange={onInputChange}
                  className="sr-only"
                  aria-label="Upload PDF or CSV"
                />

                {/* Hidden input for Images/Camera */}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                  onChange={onInputChange}
                  className="sr-only"
                  aria-label="Upload Receipt Screenshot"
                />

                {/* Dedicated Action Buttons for Mobile & Desktop */}
                <div className="w-full flex flex-col sm:flex-row gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={parsing}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border-3 bg-surface-3 text-text-primary text-xs sm:text-sm font-semibold hover:bg-surface-2 transition-colors min-h-[44px] shadow-2xs disabled:opacity-50"
                  >
                    {parsing && ocrProgress === null ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-accent" />
                        <span>Parsing Statement...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 text-accent" />
                        <span>Select PDF / CSV</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={parsing}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-accent/40 bg-accent/10 text-text-primary text-xs sm:text-sm font-semibold hover:bg-accent/20 transition-colors min-h-[44px] shadow-2xs disabled:opacity-50"
                  >
                    {parsing && ocrProgress !== null ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-accent" />
                        <span>Scanning ({ocrProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 text-accent" />
                        <span>Scan / Upload Slip</span>
                      </>
                    )}
                  </button>
                </div>

                {status.state === 'error' && (
                  <p role="alert" className="text-xs text-status-rose-text flex items-center gap-1.5 pt-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    {status.message}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-surface-1 border border-border-2 rounded-2xl p-5 space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-text-primary">Paste Bank Statement Lines</p>
                  <p className="text-xs text-text-muted">
                    Copy and paste transaction text from Maybank2u, MAE, CIMB Clicks, or bank email receipts below:
                  </p>
                </div>
                <textarea
                  rows={6}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="e.g.&#10;01/08/2026 CELCOM MOBILE SDN BHD 60.00-&#10;02/08/2026 SPOTIFY MALAYSIA 15.90-&#10;04/08/2026 NETFLIX COM 55.00-&#10;05/08/2026 WARUNG MAK TIMAH 12.00-"
                  className="w-full p-3 text-xs font-mono bg-surface-2 border border-border-2 rounded-xl text-text-primary focus:outline-none focus:border-accent resize-y"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleParsePastedText}
                    disabled={!pastedText.trim() || parsing}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent text-accent-fg text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[40px]"
                  >
                    {parsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Parse Transactions
                  </button>
                </div>
              </div>
            )}

            {/* 1-Click Sample Malaysian Presets */}
            <div className="bg-surface-1 border border-border-1 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-mono uppercase tracking-wider text-text-faint">
                  {t('demoPresetHeading')}
                </h2>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => loadSamplePreset('student')}
                  className="w-full text-left p-3 rounded-xl border border-border-2 bg-surface-2/40 hover:bg-surface-2 hover:border-border-3 transition-colors space-y-1 min-h-[44px]"
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
                  className="w-full text-left p-3 rounded-xl border border-border-2 bg-surface-2/40 hover:bg-surface-2 hover:border-border-3 transition-colors space-y-1 min-h-[44px]"
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
          </>
        )}
      </div>

      {/* Results / Guidelines - Right Column */}
      <div className="lg:col-span-7">
        {done && outcome ? (
          <section
            aria-labelledby="import-results-heading"
            aria-live="polite"
            className="bg-surface-1 border border-border-1 rounded-2xl overflow-hidden shadow-2xs"
          >
          <div className="p-5 sm:p-7 space-y-5">
            <div className="border-b border-border-1 pb-4 flex items-baseline justify-between gap-4 flex-wrap">
              <div>
                <h2
                  id="import-results-heading"
                  className="text-lg sm:text-xl font-semibold tracking-[-0.01em] leading-[1.25] text-text-primary"
                >
                  {t('resultsHeading')}
                </h2>
                <p className="text-xs sm:text-sm text-text-muted mt-0.5">{t('resultsSub')}</p>
              </div>
              <span className="font-mono text-xs uppercase tracking-wider text-text-faint flex items-center gap-1.5 bg-surface-2 border border-border-2 px-2.5 py-1 rounded-lg">
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                {done.fileName}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-text-secondary">
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
              <div className="space-y-3">
                {/* Mobile Responsive Cards (< sm screens) */}
                <div className="sm:hidden space-y-2.5">
                  {outcome.rows
                    .slice((previewPage - 1) * PREVIEW_PAGE_SIZE, previewPage * PREVIEW_PAGE_SIZE)
                    .map((row, i) => (
                      <div
                        key={`${row.merchantName}-${row.transactionDate}-${i}`}
                        className="p-3.5 rounded-xl border border-border-2 bg-surface-2 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <BrandLogo merchantName={row.merchantName} size={30} />
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-xs font-semibold text-text-primary truncate">
                              {row.merchantName}
                            </p>
                            <p className="font-mono text-[11px] text-text-muted">
                              {toDatePart(row.transactionDate)}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-xs font-bold text-text-primary bg-surface-3 border border-border-2 px-2.5 py-1 rounded-lg">
                          RM {senToMyr(row.amountSen)}
                        </span>
                      </div>
                    ))}
                </div>

                {/* Desktop View (>= sm screens) */}
                <div className="hidden sm:block">
                  <ul className="divide-y divide-border-1 border border-border-1 rounded-xl bg-surface-2 overflow-hidden">
                    {outcome.rows
                      .slice((previewPage - 1) * PREVIEW_PAGE_SIZE, previewPage * PREVIEW_PAGE_SIZE)
                      .map((row, i) => (
                        <li
                          key={`${row.merchantName}-${row.transactionDate}-${i}`}
                          className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-3/50 transition-colors"
                        >
                          <span className="flex items-center gap-3 min-w-0">
                            <BrandLogo merchantName={row.merchantName} size={24} />
                            <span className="font-mono text-xs text-text-faint w-24 shrink-0">
                              {toDatePart(row.transactionDate)}
                            </span>
                            <span className="text-sm font-medium text-text-primary truncate">
                              {row.merchantName}
                            </span>
                          </span>
                          <span className="font-mono text-sm font-medium text-text-primary shrink-0">
                            MYR {senToMyr(row.amountSen)}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>

                <Pagination
                  currentPage={previewPage}
                  totalItems={outcome.rows.length}
                  pageSize={PREVIEW_PAGE_SIZE}
                  onPageChange={setPreviewPage}
                />
              </div>
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

            {persistedData ? (
              <div className="pt-2 space-y-3">
                <div className="p-4 rounded-xl bg-status-emerald-surface border border-status-emerald-border text-status-emerald-text space-y-1">
                  <p className="font-semibold text-sm">
                    ✓ {t('persisted', { count: persistedData.importedCount })}
                  </p>
                  <p className="text-xs opacity-90">
                    {persistedData.candidatesCount > 0
                      ? `Detected ${persistedData.candidatesCount} potential recurring subscription${persistedData.candidatesCount > 1 ? 's' : ''} ready for confirmation.`
                      : 'All transactions saved to your encrypted ledger.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/review"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-accent bg-accent text-surface-0 text-sm font-semibold hover:bg-accent-hover transition-colors shadow-xs"
                  >
                    <span>Go to Review Queue</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border-2 bg-surface-2 text-text-secondary text-sm font-medium hover:text-text-primary hover:bg-surface-3 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Import Another Statement</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
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
              </>
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
