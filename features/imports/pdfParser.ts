import { getDocumentProxy } from 'unpdf';

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

const MONTH_TOKENS = 'jan|january|januari|feb|february|februari|mar|march|mac|apr|april|may|mei|jun|june|jul|july|julai|aug|august|ogo|ogos|sep|sept|september|oct|october|okt|oktober|nov|november|dec|december|dis|disember';
const MONTH_DATE_PATTERN = new RegExp(`\\b\\d{1,2}[\\s/-]+(?:${MONTH_TOKENS})(?:[\\s/-]+\\d{2,4})?\\b`, 'gi');

function extractMerchantFromLine(line: string): string {
  let text = line;
  // 1. Strip timestamps: 14:32:00, 14:32
  text = text.replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, ' ');
  // 2. Strip dates: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY, DD/MM, DD-MM
  text = text.replace(/(?:\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\b\d{1,2}[/-]\d{1,2}\b)/g, ' ');
  // 3. Strip Month name dates: 15 JUL 2026, 15-Jul-24, 15 JUL
  text = text.replace(MONTH_DATE_PATTERN, ' ');
  // 4. Strip currency figures (with decimal .XX or ,XX and optional - / + / DR / CR / commas)
  text = text.replace(/(?:RM|MYR)?\s*[-–(]?\s*\d{1,7}(?:,\d{3})*(?:\.\d{1,2})\s*(?:DR|CR|[-–+)])?/gi, ' ');
  // 5. Strip payment railway noise, status words, and transaction codes
  text = text.replace(
    /\b(?:duitnow(?:\s*qr|\s*transfer)?(?:\s*to)?|fpx(?:\s*to)?|ibg(?:\s*transfer|\s*to)?|jompay(?:\s*to)?|autodebit(?:\s*to)?|direct\s*debit(?:\s*to)?|payment(?:\s*to)?|paid(?:\s*to)?|debit\s*card(?:\s*purchase|\s*pos)?|pos\s*purchase|instant\s*transfer|m2u(?:\s*trf|\s*transfer)?|maybank2u|cimb\s*clicks|trf\s*to|trf|pymt\s*to|pymt|qr\s*pymt|qr\s*payment|bill\s*pymt|ref\s*no:?|seq\s*no:?|card\s*no:?|successful|berjaya|failed|gagal|pending|completed)\b/gi,
    ' ',
  );
  // 6. Strip DR / CR / MYR / RM / plus / minus signs
  text = text.replace(/\b(?:DR|CR|MYR|RM|POS|DEBIT|CREDIT)\b/gi, ' ');
  // 7. Strip account numbers and card fragments (digits 4+)
  text = text.replace(/\b\d{4,}\b/g, ' ');
  // 8. Strip asterisks and noise symbols
  text = text.replace(/[*_#|]+/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();

  return sanitizeMerchantName(text);
}

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

  let idx = 0;
  while (idx < matches.length) {
    const currentMatch = matches[idx];
    const startIndex = currentMatch.index ?? 0;
    let nextIndex =
      idx + 1 < matches.length ? (matches[idx + 1].index ?? text.length) : text.length;

    let block = text.slice(startIndex, nextIndex).trim();

    // If block is too short or lacks amount and there is a subsequent adjacent date (e.g. Post Date + Trans Date), merge them
    if (parseFlexibleAmount(block) === null && idx + 1 < matches.length) {
      idx += 1;
      nextIndex =
        idx + 1 < matches.length ? (matches[idx + 1].index ?? text.length) : text.length;
      block = text.slice(startIndex, nextIndex).trim();
    }

    if (block && block.length >= 5) {
      const transactionDate = parseFlexibleDate(block);
      const amountSen = parseFlexibleAmount(block);

      if (transactionDate !== null && amountSen !== null) {
        const rawMerchant = extractMerchantFromLine(block);
        if (rawMerchant && rawMerchant.length >= 2) {
          const merchantName = canonicalMerchantName(rawMerchant) || rawMerchant;
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

    idx += 1;
  }

  return rows;
}

/**
 * Parse text-based PDF bytes into validated import rows.
 *
 * Employs unpdf for universal zero-config PDF processing across Vercel serverless,
 * Node.js, and browser runtimes.
 */
export async function parsePdfText(
  data: ArrayBuffer | Uint8Array,
  password?: string,
): Promise<PdfParseResult> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let doc: any;
  try {
    doc = await getDocumentProxy(bytes, {
      password: password ?? undefined,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errName = (err as { name?: string })?.name;
    const isPassword =
      errName === 'PasswordException' ||
      errMsg.toLowerCase().includes('password') ||
      errMsg.toLowerCase().includes('decrypt');

    const isIncorrect =
      (err as { code?: number })?.code === 2 ||
      errMsg.toLowerCase().includes('incorrect') ||
      (isPassword && typeof password === 'string' && password.trim().length > 0);

    return {
      rows: [],
      errors: [
        {
          page: 0,
          error: isPassword
            ? isIncorrect
              ? 'INVALID_PASSWORD'
              : 'PASSWORD_REQUIRED'
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let page: any;
      try {
        page = await doc.getPage(pageNum);
      } catch {
        errors.push({ page: pageNum, error: 'Could not read this page' });
        continue;
      }

      try {
        let textContent;
        try {
          textContent = await page.getTextContent({
            includeMarkedContent: false,
          });
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

        // Sort items top-to-bottom first to enable high-performance O(N) line clustering
        items.sort((a, b) => b.y - a.y || a.x - b.x);

        // 2. Cluster text items into physical visual lines by vertical Y position (tolerance +/- 6.0px)
        const yClusters: { y: number; items: PosItem[] }[] = [];
        for (const item of items) {
          const lastCluster = yClusters[yClusters.length - 1];
          if (lastCluster && Math.abs(lastCluster.y - item.y) <= 6.0) {
            lastCluster.items.push(item);
          } else {
            // Small lookback in case of slightly tilted glyph order
            let matched = false;
            for (let k = yClusters.length - 2; k >= Math.max(0, yClusters.length - 4); k--) {
              if (Math.abs(yClusters[k].y - item.y) <= 6.0) {
                yClusters[k].items.push(item);
                matched = true;
                break;
              }
            }
            if (!matched) {
              yClusters.push({ y: item.y, items: [item] });
            }
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

        // Strategy 1: Process visual lines with 3-line sliding window
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

          // If current line lacks amount or date, attempt merging with adjacent 1 or 2 lines
          if ((amountSen === null || transactionDate === null) && i + 1 < lines.length) {
            const line1 = sanitizeText(lines[i + 1]);
            if (line1 && !isBankHeaderOrNoise(line1)) {
              const combined1 = `${currentLine} ${line1}`;
              const amt1 = parseFlexibleAmount(combined1);
              const date1 = parseFlexibleDate(combined1);

              if (amt1 !== null && date1 !== null) {
                amountSen = amt1;
                transactionDate = date1;
                matchedLine = combined1;
                consumed = 2;
              } else if (i + 2 < lines.length) {
                const line2 = sanitizeText(lines[i + 2]);
                if (line2 && !isBankHeaderOrNoise(line2)) {
                  const combined2 = `${currentLine} ${line1} ${line2}`;
                  const amt2 = parseFlexibleAmount(combined2);
                  const date2 = parseFlexibleDate(combined2);

                  if (amt2 !== null && date2 !== null) {
                    amountSen = amt2;
                    transactionDate = date2;
                    matchedLine = combined2;
                    consumed = 3;
                  }
                }
              }
            }
          }

          if (amountSen !== null && transactionDate !== null) {
            const rawMerchant = extractMerchantFromLine(matchedLine);
            if (rawMerchant && rawMerchant.length >= 2) {
              const merchantName = canonicalMerchantName(rawMerchant) || rawMerchant;
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

        // Deduplicate rows across Strategy 1 and Strategy 2
        const seenKeys = new Set<string>();
        const mergedPageRows: ImportRowSchema[] = [];

        for (const row of [...pageRows, ...streamRows]) {
          const key = `${row.merchantName.toLowerCase()}-${row.transactionDate.slice(0, 10)}-${row.amountSen}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            mergedPageRows.push(row);
          }
        }

        rows.push(...mergedPageRows);
      } finally {
        // Explicitly release page memory to avoid iOS Safari WebKit memory exhaustion
        if (typeof page?.cleanup === 'function') {
          page.cleanup();
        }
      }

      // Micro-yield to browser event loop so animations and UI don't freeze on mobile
      if (limit > 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  } finally {
    if (typeof doc?.destroy === 'function') {
      await doc.destroy();
    }
  }

  return { rows, errors, empty: !extractedAnyText, truncated };
}
