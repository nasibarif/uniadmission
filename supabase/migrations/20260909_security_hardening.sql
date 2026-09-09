-- UniAdmission Database Migration: Step 5 Security Hardening & Constraints
-- Hardens stored functions, adds validation constraints against injection and malicious files,
-- and defines strict Row Level Security (RLS) policies for private storage objects.

-- 1. Explicit search_path hardening for SECURITY DEFINER functions to prevent search-path hijack
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
    ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_subscription_tier_to_profile') THEN
    ALTER FUNCTION public.sync_subscription_tier_to_profile() SET search_path = public, pg_temp;
  END IF;
END $$;

-- 2. Input length & sanity constraints on profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_full_name_length'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_full_name_length
      CHECK (char_length(full_name) BETWEEN 1 AND 150);
  END IF;
END $$;

-- 3. Input length & URL protocol constraints on applications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'applications_uni_name_len'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_uni_name_len
      CHECK (char_length(university_name) <= 200);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'applications_major_len'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_major_len
      CHECK (char_length(major) <= 200);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'applications_portal_url_check'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_portal_url_check
      CHECK (official_portal_url IS NULL OR official_portal_url ~* '^https?://');
  END IF;
END $$;

-- 4. Malicious file extension and filename length restrictions on vault_documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vault_documents_filename_len'
  ) THEN
    ALTER TABLE public.vault_documents
      ADD CONSTRAINT vault_documents_filename_len
      CHECK (char_length(file_name) <= 255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vault_documents_disallow_executables'
  ) THEN
    ALTER TABLE public.vault_documents
      ADD CONSTRAINT vault_documents_disallow_executables
      CHECK (file_name !~* '\.(exe|bat|cmd|sh|bash|js|ts|jsx|tsx|html|htm|svg|php|vbs|ps1|dll|scr|jar|com)$');
  END IF;
END $$;

-- 5. Storage Security Configuration (for Supabase Storage 'documents' bucket)
-- Ensures the documents bucket is strictly private and isolated per user_id folder
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760, -- 10MB
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/jpeg',
    'image/png',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/jpeg',
    'image/png',
    'text/plain'
  ];

-- Storage RLS: Users can only upload, read, and delete documents inside their own userId folder
DO $$
BEGIN
  -- Insert policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload their own documents'
  ) THEN
    CREATE POLICY "Users can upload their own documents"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  -- Select policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own documents'
  ) THEN
    CREATE POLICY "Users can view their own documents"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  -- Delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own documents'
  ) THEN
    CREATE POLICY "Users can delete their own documents"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;
