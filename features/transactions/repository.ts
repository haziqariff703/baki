/**
 * Supabase adapters for the import/transaction repositories (AGENTS.md §5.3).
 *
 * All queries run under RLS via the anon-key server client and are scoped by
 * `user_id`. The `imports` ledger and `transactions` rows are owner-only
 * (select/insert; the import update is owner-scoped for purge).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ImportInsert,
  ImportRecord,
  ImportRepository,
  Transaction,
  TransactionInsert,
  TransactionRepository,
} from './types';

/** Row shape as stored in public.imports (snake_case). */
interface ImportRow {
  id: string;
  user_id: string;
  source: 'csv' | 'pdf';
  file_name: string;
  storage_path: string | null;
  row_count: number;
  error_count: number;
  truncated: boolean;
  status: 'completed' | 'failed';
  parser_version: string;
  idempotency_key: string | null;
  created_at: string;
}

/** Row shape as stored in public.transactions (snake_case). */
interface TransactionRow {
  id: string;
  user_id: string;
  import_id: string | null;
  merchant_name: string;
  amount_sen: number;
  transaction_date: string;
  source: 'manual' | 'csv' | 'pdf';
  created_at: string;
}

function importToDomain(row: ImportRow): ImportRecord {
  return {
    id: row.id,
    source: row.source,
    fileName: row.file_name,
    storagePath: row.storage_path,
    rowCount: row.row_count,
    errorCount: row.error_count,
    truncated: row.truncated,
    status: row.status,
    parserVersion: row.parser_version,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
  };
}

function transactionToDomain(row: TransactionRow): Transaction {
  return {
    id: row.id,
    merchantName: row.merchant_name,
    amountSen: row.amount_sen,
    transactionDate: row.transaction_date,
    source: row.source,
    importId: row.import_id,
    createdAt: row.created_at,
  };
}

function importToRow(input: ImportInsert): Omit<ImportRow, 'id' | 'user_id' | 'created_at'> {
  return {
    source: input.source,
    file_name: input.fileName,
    storage_path: input.storagePath,
    row_count: input.rowCount,
    error_count: input.errorCount,
    truncated: input.truncated,
    status: input.status,
    parser_version: input.parserVersion,
    idempotency_key: input.idempotencyKey,
  };
}

/**
 * Supabase-backed import ledger repository. Construct with the server (anon)
 * client so RLS applies.
 */
export class SupabaseImportRepository implements ImportRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(userId: string, input: ImportInsert): Promise<ImportRecord> {
    const { data, error } = await this.client
      .from('imports')
      .insert({ user_id: userId, ...importToRow(input) })
      .select()
      .single();
    if (error) throw error;
    return importToDomain(data as ImportRow);
  }

  async findByKey(userId: string, key: string): Promise<ImportRecord | null> {
    const { data, error } = await this.client
      .from('imports')
      .select('*')
      .eq('user_id', userId)
      .eq('idempotency_key', key)
      .maybeSingle();
    if (error) throw error;
    return data ? importToDomain(data as ImportRow) : null;
  }

  async markPurged(userId: string, id: string): Promise<void> {
    const { error } = await this.client
      .from('imports')
      .update({ storage_path: null })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  }
}

/**
 * Supabase-backed transaction repository. Construct with the server (anon)
 * client so RLS applies.
 */
export class SupabaseTransactionRepository implements TransactionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async insertMany(
    userId: string,
    rows: readonly TransactionInsert[],
  ): Promise<readonly Transaction[]> {
    if (rows.length === 0) return [];
    const { data, error } = await this.client
      .from('transactions')
      .insert(
        rows.map((r) => ({
          user_id: userId,
          import_id: r.importId,
          merchant_name: r.merchantName,
          amount_sen: r.amountSen,
          transaction_date: r.transactionDate,
          source: r.source,
        })),
      )
      .select();
    if (error) throw error;
    return (data as TransactionRow[]).map(transactionToDomain);
  }

  async list(userId: string): Promise<readonly Transaction[]> {
    const { data, error } = await this.client
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false });

    if (error) throw error;
    return (data as TransactionRow[]).map(transactionToDomain);
  }

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await this.client
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async deleteAll(userId: string): Promise<void> {
    const { error } = await this.client
      .from('transactions')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  }
}
