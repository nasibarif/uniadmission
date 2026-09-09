-- UniAdmission Database Migration: Step 1 Auth & User Data
-- Enables Row Level Security (RLS) and links all student records to auth.users

-- 1. Create profiles table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'Explorer' CHECK (tier IN ('Free', 'Explorer', 'Application', 'Complete', 'School')),
  avatar_url TEXT,
  personal JSONB DEFAULT '{}'::jsonb,
  academic JSONB DEFAULT '{}'::jsonb,
  intended_study JSONB DEFAULT '{}'::jsonb,
  preferences JSONB DEFAULT '{}'::jsonb,
  financial JSONB DEFAULT '{}'::jsonb,
  standardized_tests JSONB DEFAULT '{}'::jsonb,
  extracurriculars JSONB DEFAULT '[]'::jsonb,
  achievements JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Create applications table
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  university_id TEXT NOT NULL,
  university_name TEXT NOT NULL,
  country TEXT NOT NULL,
  flag TEXT NOT NULL,
  major TEXT NOT NULL,
  degree TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'Preparing' CHECK (stage IN ('Researching', 'Preparing', 'Documents Missing', 'Submitted', 'Interview', 'Accepted', 'Rejected', 'Waitlisted')),
  category TEXT NOT NULL DEFAULT 'Target' CHECK (category IN ('Dream', 'Reach', 'Target', 'Safe')),
  deadline TEXT,
  deadline_type TEXT,
  progress_percent INT DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  checklist JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  application_fee_usd NUMERIC DEFAULT 0,
  official_portal_url TEXT,
  scholarship_applied TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Create vault_documents table
CREATE TABLE IF NOT EXISTS public.vault_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'Draft / In Progress' CHECK (status IN ('Verified', 'Draft / In Progress', 'Needs Update', 'Missing')),
  file_size_bytes TEXT,
  notes TEXT,
  version INT DEFAULT 1,
  linked_universities JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Create roadmap_milestones table
CREATE TABLE IF NOT EXISTS public.roadmap_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  year INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Normal')),
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_milestones ENABLE ROW LEVEL SECURITY;

-- 6. Define RLS Policies
-- Profiles: Only the owner can view, update, insert
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Applications: Only the owner can select, insert, update, delete
CREATE POLICY "Users can manage their own applications"
  ON public.applications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Vault Documents: Only the owner can manage
CREATE POLICY "Users can manage their own vault documents"
  ON public.vault_documents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Roadmap Milestones: Only the owner can manage
CREATE POLICY "Users can manage their own roadmap milestones"
  ON public.roadmap_milestones FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. Trigger to automatically provision a profile row when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, tier)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Student User'),
    new.email,
    'Explorer'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
