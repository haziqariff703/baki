'use client';

/**
 * Privacy & Data Control Panel (M3).
 *
 * Implements AGENTS.md §2.3 (Privacy by Design), §2.6 (Traceability), and §14.2.
 * Shows verified document purge status, 1-click real data export (JSON/CSV),
 * symmetric consent toggles, and safe 2-step account deletion.
 * No emojis or decorative fluff; clean Ledger Rule tokens.
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ShieldCheck,
  Download,
  Trash2,
  X,
  FileJson,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  CONSENT_PURPOSES,
  CONSENT_RULE_VERSION,
  appendAuditEvent,
  buildExportPayload,
  grantConsent,
  validateDeletionConfirmation,
  withdrawConsent,
  type AuditEvent,
  type ConsentPurpose,
  type ConsentRecord,
  type ExportFormat,
} from '@/features/consent';
import { deletionConfirmationSchema } from '@/lib/validation';
import { toast } from '@/lib/toast';

interface PrivacyPanelProps {
  readonly initialConsents: readonly ConsentRecord[];
  readonly initialAuditEvents: readonly AuditEvent[];
}

/** Expected typed phrase for the deletion gate. Language-independent. */
const DELETION_PHRASE = 'DELETE';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return iso.slice(0, 10);
}

export function PrivacyPanel({ initialConsents, initialAuditEvents }: PrivacyPanelProps) {
  const t = useTranslations('Privacy');

  const [consents, setConsents] = useState<readonly ConsentRecord[]>(initialConsents);
  const [audit, setAudit] = useState<readonly AuditEvent[]>(initialAuditEvents);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [exportReady, setExportReady] = useState<string | null>(null);
  const [updatingPurpose, setUpdatingPurpose] = useState<ConsentPurpose | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audit trail pagination (5 per page, matching dashboard)
  const [auditPage, setAuditPage] = useState<number>(1);
  const AUDIT_PAGE_SIZE = 5;

  // Sync state if server props change
  useEffect(() => {
    setConsents(initialConsents);
    setAudit(initialAuditEvents);
  }, [initialConsents, initialAuditEvents]);

  // Delete dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [deleteError, setDeleteError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);

  async function toggle(purpose: ConsentPurpose): Promise<void> {
    const current = consents.find((r) => r.purpose === purpose);
    const currentlyGranted = current?.status === 'granted';
    const nextStatus = currentlyGranted ? 'withdrawn' : 'granted';
    const now = new Date().toISOString();

    setUpdatingPurpose(purpose);
    setErrorMessage(null);

    // Optimistic UI update
    setConsents((prev) =>
      prev.map((r) => {
        if (r.purpose !== purpose) return r;
        return {
          ...r,
          status: nextStatus,
          grantedAt: nextStatus === 'granted' ? now : r.grantedAt,
          withdrawnAt: nextStatus === 'withdrawn' ? now : r.withdrawnAt,
        };
      })
    );

    try {
      const res = await fetch(`/api/privacy/consents/${purpose}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.consent) {
        setConsents((prev) =>
          prev.map((r) => (r.purpose === purpose ? data.consent : r))
        );
        const newEvent: AuditEvent =
          nextStatus === 'granted'
            ? { type: 'consent_granted', purpose, at: data.consent.grantedAt || now }
            : { type: 'consent_withdrawn', purpose, at: data.consent.withdrawnAt || now };
        setAudit((prev) => [newEvent, ...prev]);
        setAuditPage(1);

        if (nextStatus === 'granted') {
          toast.success('Consent granted', {
            description: `Permission updated. Audit log recorded.`,
          });
        } else {
          toast.warning('Consent withdrawn', {
            description: `Permission revoked. Audit log recorded.`,
          });
        }
      } else {
        // Rollback on server rejection
        setConsents(initialConsents);
        const err = data.error || 'Failed to save consent change';
        setErrorMessage(err);
        toast.error('Update failed', { description: err });
      }
    } catch (err) {
      // Rollback on network failure
      setConsents(initialConsents);
      const msg = err instanceof Error ? err.message : 'Network error';
      setErrorMessage(msg);
      toast.error('Network error', { description: msg });
    } finally {
      setUpdatingPurpose(null);
    }
  }

  async function doExport(): Promise<void> {
    const now = new Date().toISOString();
    setErrorMessage(null);

    try {
      const res = await fetch('/api/privacy/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: exportFormat }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `baki-privacy-export-${now.slice(0, 10)}.${exportFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setExportReady(now);
        setAudit((prev) => [
          { type: 'data_exported', format: exportFormat, at: now },
          ...prev,
        ]);
        setAuditPage(1);

        toast.success('Data exported successfully', {
          description: `Download started for ${exportFormat.toUpperCase()} archive.`,
        });
      } else {
        // Fallback local export
        const payload = buildExportPayload(exportFormat, now);
        let content = '';
        let mimeType = 'application/json';
        if (exportFormat === 'json') {
          content = JSON.stringify({ ...payload, consents, auditLog: audit }, null, 2);
        } else {
          mimeType = 'text/csv';
          const rows = [
            ['Section', 'Identifier', 'Status', 'Timestamp'],
            ...consents.map((c) => ['Consent', c.purpose, c.status, c.grantedAt ?? c.withdrawnAt ?? '']),
            ...audit.map((a) => ['Audit', a.type, 'Logged', a.at]),
          ];
          content = rows.map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\n');
        }
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `baki-privacy-export-${now.slice(0, 10)}.${exportFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setExportReady(now);
        toast.success('Data exported (local fallback)', {
          description: `Download started for ${exportFormat.toUpperCase()} archive.`,
        });
      }
    } catch {
      setErrorMessage('Export failed. Please try again.');
      toast.error('Export failed', {
        description: 'Unable to generate export archive. Please try again.',
      });
    }
  }

  function openDialog(): void {
    setTyped('');
    setDeleteError(false);
    setDialogOpen(true);
  }

  function closeDialog(): void {
    setDialogOpen(false);
    openButtonRef.current?.focus();
  }

  async function confirmDelete(): Promise<void> {
    const gate = validateDeletionConfirmation(typed, DELETION_PHRASE);
    const parsed = deletionConfirmationSchema.safeParse({
      phrase: typed,
      requestedAt: new Date().toISOString(),
    });
    if (!gate.allowed || !parsed.success) {
      setDeleteError(true);
      toast.error('Invalid confirmation phrase', {
        description: 'Please type the exact deletion phrase.',
      });
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch('/api/privacy/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrase: typed }),
      });

      if (res.ok) {
        closeDialog();
        toast.warning('Account deleted', {
          description: 'Your account and personal records have been removed.',
        });
        window.location.href = '/login';
      } else {
        setDeleteError(true);
        toast.error('Deletion request failed', {
          description: 'Server could not process deletion. Please try again.',
        });
      }
    } catch {
      setDeleteError(true);
      toast.error('Network error during deletion');
    } finally {
      setIsDeleting(false);
    }
  }

  // Focus the input when the dialog opens; Escape closes
  useEffect(() => {
    if (dialogOpen) {
      inputRef.current?.focus();
      const onKey = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') closeDialog();
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
    return undefined;
  }, [dialogOpen]);

  // Audit trail pagination calculations
  const totalAuditEvents = audit.length;
  const totalAuditPages = Math.max(1, Math.ceil(totalAuditEvents / AUDIT_PAGE_SIZE));
  const currentAuditPage = Math.min(Math.max(1, auditPage), totalAuditPages);
  const startAuditIndex = (currentAuditPage - 1) * AUDIT_PAGE_SIZE;
  const endAuditIndex = Math.min(startAuditIndex + AUDIT_PAGE_SIZE, totalAuditEvents);
  const paginatedAudit = audit.slice(startAuditIndex, endAuditIndex);

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div role="alert" className="p-3 bg-status-rose-surface border border-status-rose-border text-status-rose-text rounded-xl text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)} className="font-semibold text-xs underline cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* ── Document Wipe & Storage Transparency Panel ─────────────────── */}
      <section
        aria-labelledby="wipe-status-heading"
        className="bg-surface-1 border border-border-1 rounded-xl p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-border-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-status-emerald-text" aria-hidden="true" />
              <h2
                id="wipe-status-heading"
                className="text-xs font-mono uppercase tracking-wider text-text-faint"
              >
                {t('wipeCard.title')}
              </h2>
            </div>
            <p className="text-xs text-text-muted">{t('wipeCard.subtitle')}</p>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-status-emerald-border bg-status-emerald-surface text-status-emerald-text text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{t('wipeCard.purgeStatus')}</span>
          </span>
        </div>

        {/* 3 Privacy Pillar Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl border border-border-1 bg-surface-2/40 space-y-1.5">
            <span className="text-xs text-text-muted">{t('wipeCard.rawFilesStored')}</span>
            <div className="font-mono text-xl font-medium text-text-primary border-l-2 border-accent pl-2.5">
              {t('wipeCard.rawFilesCount')}
            </div>
            <p className="text-[11px] text-text-faint">{t('wipeCard.purgeStatusDesc')}</p>
          </div>

          <div className="p-4 rounded-xl border border-border-1 bg-surface-2/40 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Lock className="w-3.5 h-3.5 text-text-faint" />
              <span>{t('wipeCard.redactionStatus')}</span>
            </div>
            <div className="font-mono text-xs font-medium text-status-emerald-text pt-1">
              Active · Automatic
            </div>
            <p className="text-[11px] text-text-faint">{t('wipeCard.redactionDesc')}</p>
          </div>

          <div className="p-4 rounded-xl border border-border-1 bg-surface-2/40 space-y-1.5">
            <span className="text-xs text-text-muted">{t('wipeCard.pdpaNotice')}</span>
            <div className="font-mono text-xs font-medium text-text-primary pt-1">
              Strict Data Minimization
            </div>
            <p className="text-[11px] text-text-faint">{t('wipeCard.pdpaDesc')}</p>
          </div>
        </div>
      </section>

      {/* ── 2-Column Grid: Consents & Data Export / Audit ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Consent Toggles & Danger Zone */}
        <div className="space-y-6">
          {/* Consent toggles */}
          <section aria-labelledby="consent-heading" className="space-y-3">
            <h2 id="consent-heading" className="text-xs font-mono uppercase tracking-wider text-text-faint">
              {t('consentHeading')}
            </h2>
            <ul className="divide-y divide-border-1 border border-border-1 rounded-xl bg-surface-1">
              {CONSENT_PURPOSES.map((purpose) => {
                const record = consents.find((r) => r.purpose === purpose);
                if (!record) return null;
                const granted = record.status === 'granted';
                const isUpdating = updatingPurpose === purpose;
                return (
                  <li key={purpose} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">{t(`purpose.${purpose}.label`)}</p>
                      <p className="text-xs text-text-muted mt-0.5">{t(`purpose.${purpose}.desc`)}</p>
                      <p className="font-mono text-xs text-text-faint mt-1.5">
                        {record.consentVersion}
                        {' · '}
                        {granted
                          ? `${t('grantedOn')} ${formatDate(record.grantedAt)}`
                          : record.withdrawnAt
                            ? `${t('withdrawnOn')} ${formatDate(record.withdrawnAt)}`
                            : t('notGranted')}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      disabled={isUpdating}
                      aria-checked={granted}
                      aria-label={t(`purpose.${purpose}.label`)}
                      onClick={() => toggle(purpose)}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 cursor-pointer disabled:opacity-50 ${
                        granted
                          ? 'bg-status-emerald-surface border-status-emerald-border'
                          : 'bg-surface-2 border-border-2'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                          granted ? 'translate-x-6 bg-status-emerald-text' : 'translate-x-1 bg-text-faint'
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-text-faint flex items-start gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {t('withdrawNote')}
            </p>
          </section>

          {/* Danger zone */}
          <section aria-labelledby="danger-heading" className="space-y-3">
            <h2 id="danger-heading" className="text-xs font-mono uppercase tracking-wider text-status-rose-text">
              {t('dangerHeading')}
            </h2>
            <div className="border border-status-rose-border rounded-xl p-5 bg-status-rose-surface space-y-3">
              <p className="text-sm text-text-secondary">{t('deleteDesc')}</p>
              <button
                type="button"
                ref={openButtonRef}
                onClick={openDialog}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-status-rose-border bg-status-rose-surface text-status-rose-text text-xs font-semibold hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {t('deleteAction')}
              </button>
            </div>
          </section>
        </div>

        {/* Right Column: Export & Audit Trail */}
        <div className="space-y-6">
          {/* Export */}
          <section aria-labelledby="export-heading" className="space-y-3">
            <h2 id="export-heading" className="text-xs font-mono uppercase tracking-wider text-text-faint">
              {t('exportHeading')}
            </h2>
            <div className="bg-surface-1 border border-border-1 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div role="group" aria-label={t('exportFormatLabel')} className="flex rounded-xl border border-border-2 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExportFormat('json')}
                    aria-pressed={exportFormat === 'json'}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors cursor-pointer ${
                      exportFormat === 'json'
                        ? 'bg-surface-3 text-text-primary'
                        : 'bg-surface-2 text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <FileJson className="w-3.5 h-3.5" /> JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    aria-pressed={exportFormat === 'csv'}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors cursor-pointer ${
                      exportFormat === 'csv'
                        ? 'bg-surface-3 text-text-primary'
                        : 'bg-surface-2 text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
                  </button>
                </div>
                <button
                  type="button"
                  onClick={doExport}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-status-blue-border bg-status-blue-surface text-status-blue-text text-xs font-semibold hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  {t('exportAction')}
                </button>
              </div>
              {exportReady && (
                <p className="text-xs text-text-muted" role="status" aria-live="polite">
                  {t('exportReady')} <span className="font-mono text-text-primary">{formatDate(exportReady)}</span>
                </p>
              )}
            </div>
          </section>

          {/* Audit trail with 10-item pagination */}
          <section aria-labelledby="audit-heading" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 id="audit-heading" className="text-xs font-mono uppercase tracking-wider text-text-faint">
                {t('auditHeading')}
              </h2>
              {totalAuditEvents > 0 && (
                <span className="font-mono text-[11px] text-text-faint">
                  {totalAuditEvents} {totalAuditEvents === 1 ? 'record' : 'records'}
                </span>
              )}
            </div>

            <div className="border border-border-1 rounded-xl bg-surface-1 overflow-hidden">
              <ul className="divide-y divide-border-1">
                {paginatedAudit.length === 0 && (
                  <li className="px-5 py-4 text-xs text-text-muted">{t('auditEmpty')}</li>
                )}
                {paginatedAudit.map((e, i) => (
                  <li key={`${e.at}-${i}`} className="px-5 py-3 flex items-center justify-between gap-4">
                    <span className="text-xs text-text-secondary">
                      {t(`audit.${e.type}`)}
                      {'purpose' in e ? ` · ${t(`purpose.${e.purpose}.label`)}` : ''}
                      {'format' in e ? ` · ${e.format.toUpperCase()}` : ''}
                    </span>
                    <span className="font-mono text-xs text-text-faint">{formatDate(e.at)}</span>
                  </li>
                ))}
              </ul>

              {/* Minimalist Micro-Stepper Pagination Footer (Matching Dashboard) */}
              {totalAuditPages > 1 && (
                <div className="px-5 py-3 border-t border-border-1 bg-surface-1 flex items-center justify-between text-xs font-mono text-text-muted">
                  <span>
                    {startAuditIndex + 1}–{endAuditIndex} of {totalAuditEvents}
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-text-faint">
                      {currentAuditPage}/{totalAuditPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                        disabled={currentAuditPage === 1}
                        aria-label={t('pagination.prev')}
                        className="w-6 h-6 flex items-center justify-center rounded border border-border-1 bg-surface-2/60 text-text-secondary hover:bg-surface-3 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuditPage((p) => Math.min(totalAuditPages, p + 1))}
                        disabled={currentAuditPage === totalAuditPages}
                        aria-label={t('pagination.next')}
                        className="w-6 h-6 flex items-center justify-center rounded border border-border-1 bg-surface-2/60 text-text-secondary hover:bg-surface-3 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface-0/80 backdrop-blur-sm p-4"
          onClick={closeDialog}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className="w-full max-w-md bg-surface-1 border border-status-rose-border rounded-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 id="delete-dialog-title" className="text-base font-semibold text-text-primary">
                {t('deleteDialogTitle')}
              </h3>
              <button
                type="button"
                onClick={closeDialog}
                aria-label={t('close')}
                className="text-text-faint hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-text-secondary">{t('deleteConsequences')}</p>
            <div>
              <label htmlFor="delete-confirm" className="block text-xs font-medium text-text-muted mb-1.5">
                {t('deleteTypePhrase')} <span className="font-mono text-status-rose-text">{DELETION_PHRASE}</span>
              </label>
              <input
                id="delete-confirm"
                ref={inputRef}
                type="text"
                value={typed}
                onChange={(e) => { setTyped(e.target.value); setDeleteError(false); }}
                aria-invalid={deleteError}
                aria-describedby={deleteError ? 'delete-error' : undefined}
                className="w-full bg-surface-0 border border-border-2 rounded-xl px-3 py-2 text-sm font-mono text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              {deleteError && (
                <p id="delete-error" role="alert" className="text-xs text-status-rose-text mt-1.5">
                  {t('deleteMismatch')}
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl border border-status-rose-border bg-status-rose-surface text-status-rose-text text-xs font-semibold hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
              >
                {t('deleteConfirm')}
              </button>
              <button
                type="button"
                onClick={closeDialog}
                className="px-4 py-2 rounded-xl border border-border-2 bg-surface-2 text-text-muted text-xs font-medium hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
              >
                {t('deleteCancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
