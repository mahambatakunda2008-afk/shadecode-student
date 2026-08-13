-- 0031_create_local_first_backups.sql
--
-- Local-first cloud backup is an opaque encrypted relay. The browser encrypts
-- the sync bundle before it reaches Storage. Each user can only access their
-- own folder: <auth.uid()>/latest.scsync.

INSERT INTO storage.buckets (id, name, public)
VALUES ('shadecode-backups', 'shadecode-backups', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "users can upload their own local-first backup"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shadecode-backups'
  AND (select auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "users can read their own local-first backup"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'shadecode-backups'
  AND (select auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "users can update their own local-first backup"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shadecode-backups'
  AND (select auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'shadecode-backups'
  AND (select auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "users can delete their own local-first backup"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'shadecode-backups'
  AND (select auth.uid())::text = (storage.foldername(name))[1]
);
