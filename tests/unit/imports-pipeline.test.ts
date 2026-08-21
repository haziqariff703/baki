/**
 * Unit tests for the import pipeline (AGENTS.md §7, §12, §2.1).
 * Covers: upload validation, row-array re-validation, and the runImport
 * orchestration (parse → validate → persist → purge) with mocked repos/storage.
 * Synthetic fixtures only (tests/AGENTS.md).
 */
import { describe, expect, it, vi } from 'vitest';

import {
  MAX_CSV_ROWS,
  importRowsArraySchema,
  importUploadSchema,
  MAX_UPLOAD_SIZE_BYTES,
} from '@/lib/validation';
import { runImport, IMPORT_PARSER_VERSION } from '@/features/imports';
import type {
  ImportInsert,
  ImportRecord,
  ImportRepository,
  Transaction,
  TransactionInsert,
  TransactionRepository,
} from '@/features/transactions';

function sampleImportRecord(overrides: Partial<ImportRecord> = {}): ImportRecord {
  return {
    id: 'import-1',
    source: 'csv',
    fileName: 'statement.csv',
    storagePath: null,
    rowCount: 0,
    errorCount: 0,
    truncated: false,
    status: 'completed',
    parserVersion: IMPORT_PARSER_VERSION,
    idempotencyKey: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('importUploadSchema (§7/§12)', () => {
  it('accepts a File with an optional idempotency key', () => {
    const file = new File(['a,b,c'], 'stmt.csv', { type: 'text/csv' });
    expect(() => importUploadSchema.parse({ file })).not.toThrow();
    expect(() =>
      importUploadSchema.parse({
        file,
        idempotencyKey: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      }),
    ).not.toThrow();
  });

  it('rejects a non-File value', () => {
    expect(() => importUploadSchema.parse({ file: 'not-a-file' })).toThrow();
  });

  it('rejects a non-uuid idempotency key', () => {
    const file = new File(['a'], 's.csv', { type: 'text/csv' });
    expect(() =>
      importUploadSchema.parse({ file, idempotencyKey: 'nope' }),
    ).toThrow();
  });

  it('rejects unexpected fields (strict)', () => {
    const file = new File(['a'], 's.csv', { type: 'text/csv' });
    expect(() => importUploadSchema.parse({ file, evil: 1 })).toThrow();
  });
});

describe('importRowsArraySchema (§7 boundary)', () => {
  it('accepts valid rows and caps at MAX_CSV_ROWS', () => {
    const row = {
      merchantName: 'Spotify',
      amountSen: 1590,
      transactionDate: '2026-08-01T00:00:00.000Z',
    };
    expect(() => importRowsArraySchema.parse([row])).not.toThrow();
    // Beyond the cap must throw (pathological parse safety).
    const many = Array.from({ length: MAX_CSV_ROWS + 10 }, () => ({ ...row }));
    expect(() => importRowsArraySchema.parse(many)).toThrow();
  });

  it('rejects a row with a non-integer amount', () => {
    expect(() =>
      importRowsArraySchema.parse([
        { merchantName: 'X', amountSen: 15.9, transactionDate: '2026-08-01T00:00:00.000Z' },
      ]),
    ).toThrow();
  });
});

describe('runImport orchestration (§12 parse→validate→persist→purge)', () => {
  const validCsv = [
    'merchant,amount,date',
    'Spotify,15.90,2026-08-01',
    'Netflix,45.00,2026-08-03',
  ].join('\n');

  function mocks() {
    const created: ImportRecord[] = [];
    const persisted: Transaction[] = [];
    const upload = vi.fn(async (_u: string, _e: string, _d: Uint8Array) => `${_u}/abc.csv`);
    const remove = vi.fn(async () => {});
    const markPurged = vi.fn(async () => {});
    const insertMany = vi.fn(async (_u: string, rows: readonly TransactionInsert[]) => {
      persisted.push(
        ...rows.map((r, i) => ({
          id: `tx-${i}`,
          merchantName: r.merchantName,
          amountSen: r.amountSen,
          transactionDate: r.transactionDate,
          source: r.source,
          importId: r.importId,
          createdAt: '2026-08-01T00:00:00.000Z',
        })),
      );
      return persisted;
    });
    const list = vi.fn(async () => persisted);
    const deleteTx = vi.fn(async (_u: string, _id: string) => {});
    const deleteAll = vi.fn(async (_u: string) => {});
    const create = vi.fn(async (_u: string, input: ImportInsert) => {
      const rec = sampleImportRecord({ ...input });
      created.push(rec);
      return rec;
    });
    const findByKey = vi.fn(async (_u: string, _k: string) => null as ImportRecord | null);
    const transactionRepo = { insertMany, list, delete: deleteTx, deleteAll };
    const importRepo = { create, findByKey, markPurged };
    return { created, persisted, upload, remove, markPurged, transactionRepo, importRepo };
  }

  it('parses CSV, persists rows, uploads then purges the raw file', async () => {
    const m = mocks();
    const outcome = await runImport({
      userId: 'user-1',
      source: 'csv',
      fileName: 'statement.csv',
      bytes: new TextEncoder().encode(validCsv),
      storage: { upload: m.upload, remove: m.remove },
      transactionRepo: m.transactionRepo,
      importRepo: m.importRepo,
    });

    expect(outcome.importedCount).toBe(2);
    expect(outcome.rows.map((r) => r.merchantName)).toEqual(['Spotify', 'Netflix']);
    expect(m.upload).toHaveBeenCalledTimes(1);
    expect(m.remove).toHaveBeenCalledTimes(1); // purged after successful extraction
    expect(m.markPurged).toHaveBeenCalledTimes(1);
    // Transactions were persisted with the import link.
    expect(m.persisted).toHaveLength(2);
  });

  it('short-circuits on an existing idempotency key without re-parsing', async () => {
    const m = mocks();
    m.importRepo.findByKey.mockResolvedValueOnce(
      sampleImportRecord({ id: 'prior', rowCount: 3 }),
    );

    const outcome = await runImport({
      userId: 'user-1',
      source: 'csv',
      fileName: 'statement.csv',
      bytes: new TextEncoder().encode(validCsv),
      idempotencyKey: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      storage: { upload: m.upload, remove: m.remove },
      transactionRepo: m.transactionRepo,
      importRepo: m.importRepo,
    });

    expect(outcome.import.id).toBe('prior');
    expect(outcome.importedCount).toBe(3);
    expect(m.upload).not.toHaveBeenCalled();
    expect(m.transactionRepo.insertMany).not.toHaveBeenCalled();
  });

  it('purges the raw file even when persistence fails', async () => {
    const m = mocks();
    m.transactionRepo.insertMany.mockRejectedValueOnce(new Error('db down'));

    await expect(
      runImport({
        userId: 'user-1',
        source: 'csv',
        fileName: 'statement.csv',
        bytes: new TextEncoder().encode(validCsv),
        storage: { upload: m.upload, remove: m.remove },
        transactionRepo: m.transactionRepo,
        importRepo: m.importRepo,
      }),
    ).rejects.toThrow('FILE_PROCESSING_FAILED');

    expect(m.remove).toHaveBeenCalledTimes(1); // best-effort purge on failure
  });
});
