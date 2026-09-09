-- UniAdmission Database Migration: Section B Complete (Steps 7, 8, and 9)
-- 1. Updates vault_documents with lifecycle verification statuses, privacy settings, and audit trails
-- 2. Creates application_requirements table with Row Level Security (RLS)

-- 1. Update status constraint and add columns to vault_documents
DO $$
BEGIN
  -- Add new columns if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vault_documents' AND column_name = 'verification_details'
  ) THEN
    ALTER TABLE public.vault_documents ADD COLUMN verification_details JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vault_documents' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE public.vault_documents ADD COLUMN visibility TEXT DEFAULT 'Private' CHECK (visibility IN ('Private', 'Counselor Only', 'Shared Link'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vault_documents' AND column_name = 'linked_applications'
  ) THEN
    ALTER TABLE public.vault_documents ADD COLUMN linked_applications JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vault_documents' AND column_name = 'audit_log'
  ) THEN
    ALTER TABLE public.vault_documents ADD COLUMN audit_log JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vault_documents' AND column_name = 'share_expires_at'
  ) THEN
    ALTER TABLE public.vault_documents ADD COLUMN share_expires_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vault_documents' AND column_name = 'share_token'
  ) THEN
    ALTER TABLE public.vault_documents ADD COLUMN share_token TEXT;
  END IF;
END $$;

-- Drop and recreate status check constraint to support expanded lifecycle
ALTER TABLE public.vault_documents DROP CONSTRAINT IF EXISTS vault_documents_status_check;
ALTER TABLE public.vault_documents ADD CONSTRAINT vault_documents_status_check
  CHECK (status IN (
    'Uploaded',
    'Processing',
    'AI Checked',
    'Needs Review',
    'Verified by UniAdmission',
    'Rejected',
    'Draft / In Progress',
    'Verified',
    'Needs Update',
    'Missing'
  ));

-- 2. Create application_requirements table
CREATE TABLE IF NOT EXISTS public.application_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  requirement_type TEXT NOT NULL DEFAULT 'required' CHECK (requirement_type IN ('required', 'conditional', 'optional')),
  description TEXT,
  accepted_formats JSONB DEFAULT '["pdf"]'::jsonb,
  source_url TEXT,
  last_verified_date TEXT,
  fulfilled_doc_id UUID REFERENCES public.vault_documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on application_requirements
ALTER TABLE public.application_requirements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own application requirements'
  ) THEN
    CREATE POLICY "Users can manage their own application requirements"
      ON public.application_requirements FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
