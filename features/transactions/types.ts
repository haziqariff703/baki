/**
 * Transactions domain types (AGENTS.md §8.1, §2.6).
 *
 * A transaction is a validated, parsed statement row (from CSV/PDF import or
 * manual entry). Money is integer sen (§8.1). Each row carries its `source`
 * for traceability (§2.6) and links to its import batch via `import_id`.
 * Persistence is abstracted behind repository interfaces (§5.3).
 */

/** How a transaction entered the system (§2.6 data source). */
export type TransactionSource = 'manual' | 'csv' | 'pdf';

/** A persisted transaction row. */
export interface Transaction {
  readonly id: string;
  readonly merchantName: string;
  readonly amountSen: number;
  /** ISO 8601 UTC transaction date. */
  readonly transactionDate: string;
  readonly source: TransactionSource;
  readonly importId: string | null;
  readonly createdAt: string;
}

/** Input for inserting transactions (no id/timestamps). */
export interface TransactionInsert {
  readonly merchantName: string;
  readonly amountSen: number;
  readonly transactionDate: string;
  readonly source: TransactionSource;
  readonly importId: string | null;
}

/** A persisted import batch (ledger/traceability record, §2.6, §12). */
export interface ImportRecord {
  readonly id: string;
  readonly source: 'csv' | 'pdf';
  readonly fileName: string;
  readonly storagePath: string | null;
  readonly rowCount: number;
  readonly errorCount: number;
  readonly truncated: boolean;
  readonly status: 'completed' | 'failed';
  readonly parserVersion: string;
  readonly idempotencyKey: string | null;
  readonly createdAt: string;
}

/** Input for creating an import record. */
export interface ImportInsert {
  readonly source: 'csv' | 'pdf';
  readonly fileName: string;
  readonly storagePath: string | null;
  readonly rowCount: number;
  readonly errorCount: number;
  readonly truncated: boolean;
  readonly status: 'completed' | 'failed';
  readonly parserVersion: string;
  readonly idempotencyKey: string | null;
}

/** Repository for persisting parsed transactions (§5.3). */
export interface TransactionRepository {
  insertMany(
    userId: string,
    rows: readonly TransactionInsert[],
  ): Promise<readonly Transaction[]>;
  list(userId: string): Promise<readonly Transaction[]>;
}

/** Repository for the import ledger (§5.3). */
export interface ImportRepository {
  create(userId: string, input: ImportInsert): Promise<ImportRecord>;
  /** Find an existing import by its idempotency key (retry short-circuit). */
  findByKey(userId: string, key: string): Promise<ImportRecord | null>;
  /** Null out `storage_path` after the raw file is purged (§12). */
  markPurged(userId: string, id: string): Promise<void>;
}
