/**
 * Import upload route (AGENTS.md §11, §12, §7).
 *
 * POST /api/imports — multipart/form-data
 *   file=<binary>            (CSV or PDF, ≤5 MB)
 *   idempotencyKey=<uuid>    (optional)
 *
 * Validates the file, stores it to the private `imports` bucket, parses it
 * server-side (deterministic), persists validated rows to `transactions`, and
 * purges the raw file inline (§12). Ownership derives from the verified
 * session (§11); RLS scopes storage + DB writes.
 *
 * Node runtime is required: pdfjs-dist legacy + Buffer + cookies().
 */
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { toErrorResponse } from '@/lib/api';
import { createServerSupabase } from '@/lib/database';
import {
  uploadedFileSchema,
  importUploadSchema,
  type UploadedFileSchema,
} from '@/lib/validation';
import { MAX_UPLOAD_SIZE_BYTES } from '@/lib/validation/imports';
import { runImport } from '@/features/imports';
import { SupabaseImportStorage } from '@/features/imports';
import {
  SupabaseImportRepository,
  SupabaseTransactionRepository,
} from '@/features/transactions';

export const runtime = 'nodejs'; // pdfjs + Buffer require Node
export const dynamic = 'force-dynamic';

/** Map the file's MIME type to the pipeline source. */
function sourceFromMime(type: string): 'csv' | 'pdf' {
  if (type === 'application/pdf') return 'pdf';
  if (type === 'text/csv') return 'csv';
  return 'csv';
}

export async function POST(request: Request) {
  try {
    // §11 step 1 — resolve authenticated user.
    const user = await requireUser();

    // §11 step 2 — validate the multipart upload (strict).
    const formData = await request.formData();
    const raw = formData.get('file');
    if (!(raw instanceof File)) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', issues: [{ path: 'file', message: 'A file is required' }] },
        { status: 400 },
      );
    }
    const idempotencyKey = formData.get('idempotencyKey');
    const parsed = importUploadSchema.parse({
      file: raw,
      idempotencyKey:
        typeof idempotencyKey === 'string' && idempotencyKey ? idempotencyKey : undefined,
    });

    // Re-derive the descriptor server-side (never trust the client's claimed
    // name/size/type) and enforce the hard byte-length cap (§12, §19).
    const descriptor: UploadedFileSchema = uploadedFileSchema.parse({
      name: parsed.file.name,
      size: parsed.file.size,
      type: parsed.file.type,
    });
    const bytes = new Uint8Array(await parsed.file.arrayBuffer());
    if (bytes.byteLength > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', issues: [{ path: 'file', message: 'File exceeds the 5 MB upload limit' }] },
        { status: 400 },
      );
    }

    // §11 step 3 — ownership enforced by user_id + RLS in repos/storage.
    const supabase = await createServerSupabase();
    const outcome = await runImport({
      userId: user.id,
      source: sourceFromMime(descriptor.type),
      fileName: descriptor.name,
      bytes,
      idempotencyKey: parsed.idempotencyKey,
      storage: new SupabaseImportStorage(supabase),
      transactionRepo: new SupabaseTransactionRepository(supabase),
      importRepo: new SupabaseImportRepository(supabase),
    });

    // §11 step 5 — sanitized response (no raw file content, no financial figures).
    return NextResponse.json(
      {
        import: outcome.import,
        rows: outcome.rows,
        errors: outcome.errors,
        truncated: outcome.truncated,
        importedCount: outcome.importedCount,
      },
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error, 'imports POST');
  }
}
