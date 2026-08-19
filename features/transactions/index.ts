/**
 * User Transaction Records Feature Module
 *
 * Persisted, validated statement rows (from CSV/PDF import or manual entry)
 * that feed recurring-detection. Public API: domain types + Supabase adapters.
 */
export { SupabaseImportRepository, SupabaseTransactionRepository } from './repository';
export type {
  ImportInsert,
  ImportRecord,
  ImportRepository,
  Transaction,
  TransactionInsert,
  TransactionRepository,
  TransactionSource,
} from './types';
