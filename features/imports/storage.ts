/**
 * Storage adapter for raw import files (AGENTS.md §12, §5.3, §2.4).
 *
 * Raw uploaded statements are stored in a PRIVATE bucket under
 * `{userId}/{uuid}.{ext}` and purged immediately after extraction. Writes run
 * through the anon-key server client (session-carried) so ownership derives
 * from the verified session (§11) and RLS applies — never service_role.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

/** How the raw file is stored/purged. Decouples the pipeline from Supabase. */
export interface ImportFileStorageProvider {
  /**
   * Store raw bytes under the user's private prefix. Returns the object path.
   */
  upload(userId: string, ext: 'csv' | 'pdf', data: Uint8Array): Promise<string>;
  /** Delete a stored object (purge). No-op-safe if already gone. */
  remove(path: string): Promise<void>;
}

/**
 * Supabase-backed storage for raw import files.
 * Construct with the server (anon) client so RLS applies.
 */
export class SupabaseImportStorage implements ImportFileStorageProvider {
  private static readonly BUCKET = 'imports';

  constructor(private readonly client: SupabaseClient) {}

  async upload(
    userId: string,
    ext: 'csv' | 'pdf',
    data: Uint8Array,
  ): Promise<string> {
    const path = `${userId}/${randomUUID()}.${ext}`;
    const { error } = await this.client.storage
      .from(SupabaseImportStorage.BUCKET)
      .upload(path, data, { contentType: ext === 'csv' ? 'text/csv' : 'application/pdf' });

    if (error) throw error;
    return path;
  }

  async remove(path: string): Promise<void> {
    const { error } = await this.client.storage
      .from(SupabaseImportStorage.BUCKET)
      .remove([path]);
    if (error) throw error;
  }
}
