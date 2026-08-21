/**
 * CSV/PDF Document Upload & Parsing Pipeline Feature Module
 *
 * Public API. Deterministic pure parsing/sanitisation logic plus the pipeline
 * use-case (parse → validate → persist → purge). Persistence/storage are
 * abstracted behind interfaces (§5.3). Raw file content is treated as
 * untrusted and sanitised at every boundary (§7, §12).
 */
export { parseCsv, MAX_CSV_ROWS } from './csvParser';
export type { CsvParseResult, CsvRowError } from './csvParser';
export { parsePdfText, extractTransactionsFromText, MAX_PDF_PAGES } from './pdfParser';
export type { PdfExtractionError, PdfParseResult } from './pdfParser';
export { sanitizeMerchantName, sanitizeText, MAX_TEXT_LENGTH } from './sanitize';
export {
  runImport,
  IMPORT_PARSER_VERSION,
} from './importPipeline';
export type { ImportError, ImportOutcome } from './importPipeline';
export { SupabaseImportStorage } from './storage';
export type { ImportFileStorageProvider } from './storage';
export { parseReceiptLines } from './ocr';
