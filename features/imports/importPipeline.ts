/**
 * Import pipeline use-case (AGENTS.md §12, §7, §5.3).
 *
 * Orchestrates: parse (deterministic) → validate → persist transactions →
 * purge the raw file. Framework-independent: the route is a thin §11 shell.
 * No LLM is ever involved; extracted text is treated strictly as data
 * (prompt-injection defense, §12).
 */
import { parseCsv, MAX_CSV_ROWS } from './csvParser';
import { parsePdfText, MAX_PDF_PAGES } from './pdfParser';
import type { ImportRowSchema } from '@/lib/validation';
import { importRowsArraySchema } from '@/lib/validation';
import type {
  ImportRecord,
  ImportRepository,
  TransactionInsert,
  TransactionRepository,
} from '@/features/transactions';

/** Parser version stamped on the import ledger (§2.6). */
export const IMPORT_PARSER_VERSION = 'import_v1';

/** A single user-safe parse/validation error (row or page scoped). */
export interface ImportError {
  readonly row?: number;
  readonly page?: number;
  readonly error: string;
}

/** Result of an import run. */
export interface ImportOutcome {
  readonly import: ImportRecord;
  readonly rows: readonly ImportRowSchema[];
  readonly errors: readonly ImportError[];
  readonly truncated: boolean;
  readonly importedCount: number;
}

/** Parsed rows plus their errors, before persistence. */
type ParseResult = {
  rows: readonly ImportRowSchema[];
  errors: readonly ImportError[];
  truncated: boolean;
};

/** Deterministically parse the file into validated rows (§2.1). */
async function parseFile(
  source: 'csv' | 'pdf',
  bytes: Uint8Array,
): Promise<ParseResult> {
  if (source === 'csv') {
    const result = parseCsv(new TextDecoder().decode(bytes));
    return {
      rows: result.rows,
      errors: result.errors.map((e) => ({ row: e.row, error: e.error })),
      truncated: result.truncated,
    };
  }
  const result = await parsePdfText(bytes);
  return {
    rows: result.rows,
    errors: result.errors.map((e) => ({ page: e.page, error: e.error })),
    truncated: result.truncated,
  };
}

/**
 * Run the import pipeline: parse → validate → persist → purge.
 *
 * On any parse/persist outcome the raw file is purged (delete inline). If
 * persistence itself fails, we still best-effort delete the raw file so no
 * statement lingers beyond the request (§12). Returns a full outcome for the
 * route to surface to the user.
 */
export async function runImport(opts: {
  userId: string;
  source: 'csv' | 'pdf';
  fileName: string;
  bytes: Uint8Array;
  idempotencyKey?: string;
  storage: { upload(userId: string, ext: 'csv' | 'pdf', data: Uint8Array): Promise<string>; remove(path: string): Promise<void> };
  transactionRepo: TransactionRepository;
  importRepo: ImportRepository;
  parserVersion?: string;
}): Promise<ImportOutcome> {
  const {
    userId,
    source,
    fileName,
    bytes,
    idempotencyKey,
    storage,
    transactionRepo,
    importRepo,
    parserVersion = IMPORT_PARSER_VERSION,
  } = opts;

  // Idempotency: a retried upload with the same key returns the prior result
  // (the raw file may already be purged, so it cannot be re-parsed).
  if (idempotencyKey) {
    const prior = await importRepo.findByKey(userId, idempotencyKey);
    if (prior) {
      return {
        import: prior,
        rows: [],
        errors: [],
        truncated: prior.truncated,
        importedCount: prior.rowCount,
      };
    }
  }

  // Store the raw file in the private bucket first (§12), then parse.
  const storagePath = await storage.upload(userId, source, bytes);

  const { rows, errors, truncated } = await parseFile(source, bytes);

  // Re-validate every row at the persistence boundary (§7) and cap the count.
  const validated = importRowsArraySchema.parse(rows);

  const rowCount = validated.length;
  const errorCount = errors.length;

  try {
    // Persist transactions (linked to this import batch).
    const inserts: TransactionInsert[] = validated.map((r) => ({
      merchantName: r.merchantName,
      amountSen: r.amountSen,
      transactionDate: r.transactionDate,
      source,
      importId: null, // filled after the import row is created below
    }));

    // Create the ledger row, then link transactions to it.
    const ledger = await importRepo.create(userId, {
      source,
      fileName,
      storagePath,
      rowCount,
      errorCount,
      truncated,
      status: 'completed',
      parserVersion,
      idempotencyKey: idempotencyKey ?? null,
    });

    await transactionRepo.insertMany(
      userId,
      inserts.map((ins) => ({ ...ins, importId: ledger.id })),
    );

    // Purge the raw file immediately after successful extraction (§12).
    await storage.remove(storagePath);
    await importRepo.markPurged(userId, ledger.id);

    return {
      import: { ...ledger, storagePath: null },
      rows: validated,
      errors,
      truncated,
      importedCount: rowCount,
    };
  } catch {
    // Persistence failed — still best-effort purge the raw file so no statement
    // lingers (§12). Surface a non-sensitive failure; no file bytes/merchants.
    try {
      await storage.remove(storagePath);
    } catch {
      // leave for ops cleanup
    }
    throw new Error('FILE_PROCESSING_FAILED');
  }
}

// Re-export the caps so the route/UI can reference them.
export { MAX_CSV_ROWS, MAX_PDF_PAGES };
