import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

import { importRowSchema, type ImportRowSchema } from '@/lib/validation';
import { sanitizeMerchantName, sanitizeText } from './sanitize';
import { canonicalMerchantName } from '@/features/subscriptions';
import {
  isBankHeaderOrNoise,
  parseFlexibleAmount,
  parseFlexibleDate,
} from './bankStatementParser';

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
// ---------------------------------------------------------------------------

interface PdfjsWorkerHandler {
  WorkerMessageHandler: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const globalThis: any & { pdfjsWorker?: PdfjsWorkerHandler };

let workerReady: Promise<void> | null = null;

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

const MONTH_TOKENS = 'jan|january|januari|feb|february|februari|mar|march|mac|apr|april|may|mei|jun|june|jul|july|julai|aug|august|ogo|ogos|sep|sept|september|oct|october|okt|oktober|nov|november|dec|december|dis|disember';
const MONTH_DATE_PATTERN = new RegExp(`\\b\\d{1,2}[\\s/-]+(?:${MONTH_TOKENS})(?:[\\s/-]+\\d{2,4})?\\b`, 'gi');

function extractMerchantFromLine(line: string): string {
  let text = line;
  // 1. Strip dates: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY, DD/MM
  text = text.replace(/(?:\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}[/-]\d{1,2})/g, ' ');
  // 2. Strip Month name dates: 15 JUL 2026, 15-Jul-24, 15 JUL
  text = text.replace(MONTH_DATE_PATTERN, ' ');
  // 3. Strip currency figures (with decimal .XX or ,XX and optional - / + / DR / CR / commas)
  text = text.replace(/(?:RM|MYR)?\s*[-–(]?\s*\d{1,7}(?:,\d{3})*(?:[.,]\d{1,2})\s*(?:DR|CR|[-–+)])?/gi, ' ');
  // 4. Strip payment railway noise
  text = text.replace(/\b(?:duitnow(?:\s*qr|\s*transfer)?(?:\s*to)?|fpx(?:\s*to)?|ibg(?:\s*transfer|\s*to)?|jompay(?:\s*to)?|autodebit(?:\s*to)?|payment(?:\s*to)?|debit\s*card(?:\s*purchase|\s*pos)?|pos\s*purchase|instant\s*transfer)\b/gi, ' ');
  // 5. Strip DR / CR / MYR / RM / plus / minus signs
  text = text.replace(/\b(?:DR|CR|MYR|RM|POS|DEBIT|CREDIT)\b/gi, ' ');
  // 6. Strip account numbers and phone numbers (digits 4+)
  text = text.replace(/\b\d{4,}\b/g, ' ');
  // 7. Strip asterisks and noise symbols
  text = text.replace(/[*_#]+/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();

  return sanitizeMerchantName(text);
}

/**
 * Parse text-based PDF bytes into validated import rows.
 *
 * Reconstructs visual table lines by clustering text items on their vertical (Y)
 * coordinates, making it resilient to Maybank, CIMB, and other bank statement PDF layouts.
 */
/**
 * Extract transactions from a continuous text block or stream by segmenting on Date boundaries.
 * Universal fallback for bank statements with complex tabular or multi-column layouts.
 */
export function extractTransactionsFromText(text: string): ImportRowSchema[] {
  const rows: ImportRowSchema[] = [];
  const DATE_SPLIT_REGEX =
    /\b(?:\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}[\s/-]+(?:jan|january|januari|feb|february|februari|mar|march|mac|apr|april|may|mei|jun|june|jul|july|julai|aug|august|ogo|ogos|sep|sept|september|oct|october|okt|oktober|nov|november|dec|december|dis|disember)(?:[\s/-]+\d{2,4})?|\d{1,2}[/-]\d{1,2})\b/gi;

  const matches = [...text.matchAll(DATE_SPLIT_REGEX)];
  if (matches.length === 0) return rows;

  for (let idx = 0; idx < matches.length; idx++) {
    const currentMatch = matches[idx];
    const startIndex = currentMatch.index ?? 0;
    const nextIndex =
      idx + 1 < matches.length ? (matches[idx + 1].index ?? text.length) : text.length;

    const block = text.slice(startIndex, nextIndex).trim();
    if (!block || block.length < 5) continue;

    const transactionDate = parseFlexibleDate(block);
    const amountSen = parseFlexibleAmount(block);

    if (transactionDate !== null && amountSen !== null) {
      const rawMerchant = extractMerchantFromLine(block);
      if (rawMerchant && rawMerchant.length >= 2) {
        const merchantName = canonicalMerchantName(rawMerchant);
        if (merchantName) {
          const parsed = importRowSchema.safeParse({
            merchantName,
            amountSen,
            transactionDate,
          });
          if (parsed.success) {
            rows.push(parsed.data);
          }
        }
      }
    }
  }

  return rows;
}

/**
 * Parse text-based PDF bytes into validated import rows.
 *
 * Employs a dual-strategy architecture:
 * 1. Visual row clustering with 2-line sliding window for aligned table statements.
 * 2. Date-anchored continuous stream segmenter for multi-column or wrapped layouts.
 */
export async function parsePdfText(
  data: ArrayBuffer | Uint8Array,
  password?: string,
): Promise<PdfParseResult> {
  await ensurePdfWorker();

  // Use the Node-compatible legacy build
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const bytes =
    data instanceof Uint8Array ? data : new Uint8Array(data);

  let doc: PDFDocumentProxy;
  let loadingTask: Awaited<ReturnType<typeof getDocument>>;
  try {
    loadingTask = getDocument({
      data: bytes,
      disableFontFace: true,
      verbosity: 0,
      password: password ?? undefined,
    });
    doc = await loadingTask.promise;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const isPassword =
      (err as { name?: string })?.name === 'PasswordException' ||
      errMsg.toLowerCase().includes('password');

    return {
      rows: [],
      errors: [
        {
          page: 0,
          error: isPassword
            ? 'This PDF statement is password-protected (e.g. requires IC number). Please unlock the PDF or enter password.'
            : 'Could not read this PDF file',
        },
      ],
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

      // 1. Collect text items with spatial coordinates
      interface PosItem {
        str: string;
        x: number;
        y: number;
        width: number;
      }

      const items: PosItem[] = [];
      let pageRawStream = '';

      for (const item of textContent.items) {
        if (!('str' in item)) continue;
        const str = typeof item.str === 'string' ? item.str : '';
        if (!str.trim()) continue;

        pageRawStream += str + ' ';

        const transform = (item as { transform?: number[] }).transform ?? [0, 0, 0, 0, 0, 0];
        const x = transform[4] ?? 0;
        const y = transform[5] ?? 0;
        const width = (item as { width?: number }).width ?? str.length * 5;

        items.push({ str, x, y, width });
      }

      if (items.length > 0) extractedAnyText = true;

      // 2. Cluster text items into physical visual lines by vertical Y position (tolerance +/- 4.5px)
      const yClusters: { y: number; items: PosItem[] }[] = [];
      for (const item of items) {
        const cluster = yClusters.find((c) => Math.abs(c.y - item.y) <= 4.5);
        if (cluster) {
          cluster.items.push(item);
        } else {
          yClusters.push({ y: item.y, items: [item] });
        }
      }

      // Sort lines top-to-bottom (Y descending in PDF coordinate space)
      yClusters.sort((a, b) => b.y - a.y);

      const lines: string[] = [];
      for (const cluster of yClusters) {
        // Sort items on the same visual line left-to-right (X ascending)
        cluster.items.sort((a, b) => a.x - b.x);

        let lineText = '';
        let lastX = -1;
        let lastWidth = 0;
        for (const it of cluster.items) {
          const str = it.str;
          if (!str) continue;
          if (lastX < 0) {
            lineText = str;
          } else {
            const gap = it.x - (lastX + lastWidth);
            if (gap > 2.0 && !lineText.endsWith(' ') && !str.startsWith(' ')) {
              lineText += ' ' + str;
            } else {
              lineText += str;
            }
          }
          lastX = it.x;
          lastWidth = it.width;
        }

        const trimmed = lineText.trim();
        if (trimmed.length > 0) {
          lines.push(trimmed);
        }
      }

      const pageRows: ImportRowSchema[] = [];

      // Strategy 1: Process visual lines with sliding window
      let i = 0;
      while (i < lines.length) {
        const currentLine = sanitizeText(lines[i]);
        if (!currentLine || isBankHeaderOrNoise(currentLine)) {
          i += 1;
          continue;
        }

        let amountSen = parseFlexibleAmount(currentLine);
        let transactionDate = parseFlexibleDate(currentLine);
        let matchedLine = currentLine;
        let consumed = 1;

        // If current line lacks amount or date, attempt merging with adjacent next line
        if ((amountSen === null || transactionDate === null) && i + 1 < lines.length) {
          const nextLine = sanitizeText(lines[i + 1]);
          if (nextLine && !isBankHeaderOrNoise(nextLine)) {
            const combined = `${currentLine} ${nextLine}`;
            const combinedAmount = parseFlexibleAmount(combined);
            const combinedDate = parseFlexibleDate(combined);

            if (combinedAmount !== null && combinedDate !== null) {
              amountSen = combinedAmount;
              transactionDate = combinedDate;
              matchedLine = combined;
              consumed = 2;
            }
          }
        }

        if (amountSen !== null && transactionDate !== null) {
          const rawMerchant = extractMerchantFromLine(matchedLine);
          if (rawMerchant && rawMerchant.length >= 2) {
            const merchantName = canonicalMerchantName(rawMerchant);
            if (merchantName) {
              const parsedRow = importRowSchema.safeParse({
                merchantName,
                amountSen,
                transactionDate,
              });

              if (parsedRow.success) {
                pageRows.push(parsedRow.data);
              }
            }
          }
        }

        i += consumed;
      }

      // Strategy 2: Date-anchored continuous stream segmenter fallback / supplement
      const streamRows = extractTransactionsFromText(pageRawStream);

      // If Strategy 1 found fewer rows than Strategy 2 (or 0), use Strategy 2
      if (pageRows.length >= streamRows.length && pageRows.length > 0) {
        rows.push(...pageRows);
      } else if (streamRows.length > 0) {
        rows.push(...streamRows);
      } else {
        rows.push(...pageRows);
      }
    }
  } finally {
    await loadingTask.destroy();
  }

  return { rows, errors, empty: !extractedAnyText, truncated };
}
