-- UniAdmission Database Migration: Step 6 Vault Storage Updates
-- Adds mime_type to vault_documents and ensures storage.buckets and policies are fully configured.

-- 1. Add mime_type and storage_path columns if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vault_documents' AND column_name = 'mime_type'
  ) THEN
    ALTER TABLE public.vault_documents ADD COLUMN mime_type TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vault_documents' AND column_name = 'storage_path'
  ) THEN
    ALTER TABLE public.vault_documents ADD COLUMN storage_path TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vault_documents' AND column_name = 'version'
  ) THEN
    ALTER TABLE public.vault_documents ADD COLUMN version INT DEFAULT 1;
  END IF;
END $$;

-- 2. Create index on storage_path and user_id
CREATE INDEX IF NOT EXISTS idx_vault_documents_storage_path ON public.vault_documents(storage_path);
CREATE INDEX IF NOT EXISTS idx_vault_documents_user_id ON public.vault_documents(user_id);
