-- Baki MVP: private imports storage bucket + storage.objects RLS
-- (AGENTS.md §12, §10.1, §2.4). Idempotent.
--
-- Bucket is PRIVATE (no public flag). Objects are stored under
-- `{userId}/{uuid}.{ext}` and RLS-scoped by the first path segment so a user
-- can only read/write/delete their own objects. The route writes via the
-- anon-key server client (session-carried), so ownership derives from the
-- verified session (§11) — never service_role in the browser (§2.4).

INSERT INTO storage.buckets (id, name, public)
VALUES ('imports', 'imports', false)
ON CONFLICT (id) DO NOTHING;

-- Owner may read their own objects (path's first segment = auth.uid()).
DROP POLICY IF EXISTS "imports_objects_select_own" ON storage.objects;
CREATE POLICY "imports_objects_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'imports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner may insert their own objects.
DROP POLICY IF EXISTS "imports_objects_insert_own" ON storage.objects;
CREATE POLICY "imports_objects_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'imports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner may update their own objects.
DROP POLICY IF EXISTS "imports_objects_update_own" ON storage.objects;
CREATE POLICY "imports_objects_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'imports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'imports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner may delete their own objects (purge after extraction, §12).
DROP POLICY IF EXISTS "imports_objects_delete_own" ON storage.objects;
CREATE POLICY "imports_objects_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'imports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
