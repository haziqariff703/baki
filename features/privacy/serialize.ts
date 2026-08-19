/**
 * Deterministic JSON/CSV serializers for the data export (AGENTS.md §2.1, §2.5).
 *
 * Pure functions, no framework imports, no randomness — same input always
 * yields the same output. CSV is emitted as a single sheet with a leading
 * "Section" column so nested rows (consents, subscriptions, candidates, audit
 * events) flatten deterministically. All cell values are CSV-escaped to
 * prevent formula injection (=, +, -, @) and field-breaking commas/quotes.
 */
import type { ConsentRecord } from '@/features/consent';
import type { Subscription } from '@/features/subscriptions';
import type { RecurringCandidate } from '@/features/recurring-detection';

/** A structured, fully-populated export ready to serialize. */
export interface AssembledExport {
  readonly format: 'json' | 'csv';
  readonly generatedAt: string;
  readonly ruleVersion: string;
  readonly consents: readonly ConsentRecord[];
  readonly subscriptions: readonly Subscription[];
  readonly candidates: readonly RecurringCandidate[];
}

/** Escape a single CSV cell: quote, double embedded quotes, neutralize formulas. */
function escapeCsvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  // Neutralize spreadsheet formula injection (§ security).
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

/** Deterministic CSV for a JSON export. One row per record, fixed column order. */
export function serializeCsv(data: AssembledExport): string {
  const rows: string[][] = [
    ['Section', 'Identifier', 'Status', 'Timestamp'],
  ];

  for (const c of data.consents) {
    rows.push([
      'Consent',
      c.purpose,
      c.status,
      c.grantedAt ?? c.withdrawnAt ?? '',
    ]);
  }

  for (const s of data.subscriptions) {
    rows.push(['Subscription', s.merchantName, s.cycle, s.nextChargeDate]);
  }

  for (const cand of data.candidates) {
    rows.push(['Candidate', cand.merchantName, cand.status.state, cand.detectedAt]);
  }

  return rows.map((r) => r.map(escapeCsvCell).join(',')).join('\n');
}

/** Deterministic JSON string for a JSON export. */
export function serializeJson(data: AssembledExport): string {
  return JSON.stringify(
    {
      format: data.format,
      generatedAt: data.generatedAt,
      ruleVersion: data.ruleVersion,
      sections: {
        consents: data.consents,
        subscriptions: data.subscriptions,
        candidates: data.candidates,
      },
    },
    null,
    2,
  );
}
