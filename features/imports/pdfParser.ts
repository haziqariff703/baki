/**
 * Deterministic PDF statement parser (text-based PDFs only — no OCR).
 *
 * Uses pdfjs-dist to extract text content per page. Every extracted string is
 * treated strictly as data and sanitised through `sanitizeText` (prompt-
 * injection defense, AGENTS.md §12). Merchant/amount/date lines are then pulled
 * out with simple, deterministic line-based heuristics.
 *
 * LIMITATIONS (MVP): this is not a general bank-statement parser. It only
 * handles straightforward line layouts where a row is roughly
 * `merchant ... amount ... date`. Scanned/image PDFs (no embedded text) yield
 * no rows. Amounts are matched as a currency figure and dates as ISO or
 * day-first values; unusual formats are skipped. Consider a dedicated layout
 * parser or (advisory) AI-assisted extraction (§13.1) for production use.
 *
 * Raw PDF bytes are used only in memory for text extraction and are NOT
 * persisted here. Per features/imports/AGENTS.md, any caller that stores the
 * original file must delete it immediately after extraction.
 */
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

import { importRowSchema, type ImportRowSchema } from '@/lib/validation';
import { myrToSen } from '@/lib/money';
import { sanitizeMerchantName, sanitizeText } from './sanitize';
import { canonicalMerchantName } from '@/features/subscriptions';

/** Maximum number of pages to process (defense against huge documents). */
export const MAX_PDF_PAGES = 200;

/** A per-page / per-line extraction failure. */
export interface PdfExtractionError {
  /** 1-based page number, or 0 for document-level errors. */
  readonly page: number;
  /** User-safe reason. */
  readonly error: string;
}

/** Result of a PDF parse: valid rows plus extraction errors. */
export interface PdfParseResult {
  readonly rows: readonly ImportRowSchema[];
  readonly errors: readonly PdfExtractionError[];
  /** True if the PDF had no extractable embedded text (e.g. scanned image). */
  readonly empty: boolean;
  /** True if the page count exceeded MAX_PDF_PAGES and later pages were skipped. */
  readonly truncated: boolean;
}

// ---------------------------------------------------------------------------
// pdfjs worker setup (Node / main-thread).
//
// pdfjs-dist defaults to a Worker thread, but in a Node runtime it disables the
// worker and dynamically imports the worker module. To make that reliable we
// preload `WorkerMessageHandler` onto globalThis so pdf.js runs on the main
// thread and does not need to resolve a relative worker path at runtime.
// ---------------------------------------------------------------------------

// Minimal structural type for the pdf.js worker message handler we inject.
interface PdfjsWorkerHandler {
  WorkerMessageHandler: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const globalThis: any & { pdfjsWorker?: PdfjsWorkerHandler };

let workerReady: Promise<void> | null = null;

/**
 * Ensure the pdf.js worker is available on the main thread. Idempotent and
 * safe to call multiple times.
 *
 * We use the `legacy` build, which is the build pdf.js documents for Node.js
 * runtimes (the modern build relies on browser globals such as DOMMatrix).
 */
function ensurePdfWorker(): Promise<void> {
  if (globalThis.pdfjsWorker?.WorkerMessageHandler) {
    return Promise.resolve();
  }
  if (workerReady) return workerReady;
  workerReady = (async () => {
    const workerModule = (await import(
      'pdfjs-dist/legacy/build/pdf.worker.mjs'
    )) as PdfjsWorkerHandler;
    globalThis.pdfjsWorker = workerModule;
  })();
  return workerReady;
}

/**
 * Extract the numeric-looking amount (in sen) from a single text line.
 * Accepts "15.90", "15,90", "RM 15.90", "MYR15.90". A decimal fraction is
 * required (a bare trailing integer is more likely a date than an amount).
 * Returns null if absent.
 */
function amountFromLine(line: string): number | null {
  // Optional RM/MYR prefix, then a figure with a decimal fraction ('.' or ',').
  const match = /(?:RM|MYR)?\s*(\d{1,7}[.,]\d{1,2})/.exec(line);
  if (!match) return null;
  const raw = match[1].replace(',', '.');
  return myrToSen(raw);
}

/**
 * Extract an ISO date from a line. Accepts ISO (YYYY-MM-DD) and day-first
 * DD/MM/YYYY or DD-MM-YYYY. Returns null if absent.
 */
function isoDateFromLine(line: string): string | null {
  const isoMatch = /(\d{4})-(\d{2})-(\d{2})/.exec(line);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  const dmyMatch = /(\d{2})[/-](\d{2})[/-](\d{4})/.exec(line);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return null;
}

/** Strip common trailing/leading tokens so the amount is not part of the name. */
function merchantFromLine(line: string): string {
  // Remove any currency amount figure (with decimal), an ISO date, and a
  // day-first date, plus an optional leading RM/MYR marker.
  const cleaned = line
    .replace(/(?:RM|MYR)?\s*\d{1,7}[.,]\d{1,2}/g, '')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '')
    .replace(/\b\d{2}[/-]\d{2}[/-]\d{4}\b/g, '')
    .replace(/\bRM\b|\bMYR\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return sanitizeMerchantName(cleaned);
}

/**
 * Parse text-based PDF bytes into validated import rows.
 *
 * Only embedded text is read (no OCR). Scanned/image-only PDFs yield an
 * `empty` result with no rows. Each candidate line is validated through
 * importRowSchema. Raw bytes are never persisted.
 */
export async function parsePdfText(
  data: ArrayBuffer | Uint8Array,
): Promise<PdfParseResult> {
  await ensurePdfWorker();

  // Use the Node-compatible legacy build (avoids browser globals like DOMMatrix).
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const bytes =
    data instanceof Uint8Array ? data : new Uint8Array(data);

  let doc: PDFDocumentProxy;
  let loadingTask: Awaited<ReturnType<typeof getDocument>>;
  try {
    loadingTask = getDocument({ data: bytes });
    doc = await loadingTask.promise;
  } catch {
    return {
      rows: [],
      errors: [{ page: 0, error: 'Could not read this PDF file' }],
      empty: true,
      truncated: false,
    };
  }

  const rows: ImportRowSchema[] = [];
  const errors: PdfExtractionError[] = [];
  let extractedAnyText = false;
  let truncated = false;

  try {
    const pageCount = doc.numPages;
    const limit = Math.min(pageCount, MAX_PDF_PAGES);
    if (pageCount > MAX_PDF_PAGES) truncated = true;

    for (let pageNum = 1; pageNum <= limit; pageNum += 1) {
      let page: PDFPageProxy;
      try {
        page = await doc.getPage(pageNum);
      } catch {
        errors.push({ page: pageNum, error: 'Could not read this page' });
        continue;
      }

      let textContent;
      try {
        textContent = await page.getTextContent();
      } catch {
        errors.push({ page: pageNum, error: 'Could not extract text from this page' });
        continue;
      }

      const lines: string[] = [];
      let buffer = '';
      // Aggregate text items into lines, respecting item newlines.
      for (const item of textContent.items) {
        if (!('str' in item)) continue; // skip TextMarkedContent items
        const str = typeof item.str === 'string' ? item.str : '';
        buffer += str;
        if (item.hasEOL) {
          lines.push(buffer);
          buffer = '';
        }
      }
      if (buffer.trim()) lines.push(buffer);

      if (lines.some((l) => l.trim().length > 0)) extractedAnyText = true;

      for (const rawLine of lines) {
        const line = sanitizeText(rawLine);
        if (!line) continue;

        // Simple heuristic: a line is a candidate row if it has a merchant-like
        // token, a date, and an amount.
        const amountSen = amountFromLine(line);
        const transactionDate = isoDateFromLine(line);
        if (amountSen === null || transactionDate === null) continue;

        const merchantName = canonicalMerchantName(merchantFromLine(line));
        if (!merchantName) continue;

        const parsedRow = importRowSchema.safeParse({
          merchantName,
          amountSen,
          transactionDate,
        });
        if (parsedRow.success) {
          rows.push(parsedRow.data);
        }
        // On a per-line validation failure we skip silently (heuristic parser);
        // real extraction errors are reported in `errors`.
      }
    }
  } finally {
    await loadingTask.destroy();
  }

  return { rows, errors, empty: !extractedAnyText, truncated };
}
