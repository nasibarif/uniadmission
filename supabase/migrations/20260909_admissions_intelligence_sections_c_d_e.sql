-- UniAdmission Database Migration: Sections C, D & E Complete
-- Creates normalized tables for universities, programs, scholarships, and user-persisted roadmap milestones
-- Adds program-level tracking and deadline intelligence columns to applications

-- ==============================================================================
-- 1. Universities Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.universities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  country TEXT NOT NULL,
  country_code VARCHAR(10) NOT NULL,
  city TEXT NOT NULL,
  flag TEXT NOT NULL,
  ranking_world INTEGER,
  ranking_national INTEGER,
  acceptance_rate NUMERIC,
  campus_type TEXT CHECK (campus_type IN ('Urban', 'Suburban', 'Rural', 'College Town')),
  average_annual_tuition_usd NUMERIC NOT NULL DEFAULT 0,
  average_living_usd NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  official_portal_url TEXT NOT NULL,
  featured_scholarship_ids JSONB DEFAULT '[]'::jsonb,
  source_url TEXT,
  source_name TEXT,
  last_verified_at TIMESTAMPTZ DEFAULT NOW(),
  verification_status TEXT DEFAULT 'Verified Official' CHECK (verification_status IN ('Verified Official', 'Pending Annual Audit', 'Community Reported')),
  next_review_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 2. Programs Table (Step 12: Program-Level Data Modeling)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.programs (
  id TEXT PRIMARY KEY,
  university_id TEXT NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  degree TEXT NOT NULL,
  department TEXT,
  duration_years NUMERIC DEFAULT 4,
  annual_tuition_usd NUMERIC NOT NULL DEFAULT 0,
  estimated_living_cost_usd NUMERIC NOT NULL DEFAULT 0,
  min_gpa NUMERIC DEFAULT 3.0,
  min_ielts NUMERIC DEFAULT 6.5,
  min_sat NUMERIC,
  min_gre NUMERIC,
  official_apply_url TEXT NOT NULL,
  intake_semesters JSONB DEFAULT '["Fall 2026"]'::jsonb,
  application_route TEXT DEFAULT 'Direct Institution Portal',
  prerequisites JSONB DEFAULT '[]'::jsonb,
  source_url TEXT,
  source_name TEXT,
  last_verified_at TIMESTAMPTZ DEFAULT NOW(),
  verification_status TEXT DEFAULT 'Verified Official' CHECK (verification_status IN ('Verified Official', 'Pending Annual Audit', 'Community Reported')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. Scholarships Table (Step 13: Rebuild Scholarship Data & Eligibility Rules)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.scholarships (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  country TEXT NOT NULL,
  flag TEXT NOT NULL,
  coverage_type TEXT NOT NULL,
  amount_description TEXT,
  competition_level TEXT CHECK (competition_level IN ('Extremely High', 'High', 'Moderate', 'Accessible')),
  deadline TEXT,
  eligible_degrees JSONB DEFAULT '[]'::jsonb,
  eligible_countries JSONB DEFAULT '["All"]'::jsonb,
  eligible_nationalities JSONB DEFAULT '["All"]'::jsonb,
  target_majors JSONB DEFAULT '["All"]'::jsonb,
  academic_criteria JSONB DEFAULT '{}'::jsonb,
  financial_need_required BOOLEAN DEFAULT FALSE,
  requires_nomination BOOLEAN DEFAULT FALSE,
  requires_separate_application BOOLEAN DEFAULT TRUE,
  annual_amount_usd NUMERIC DEFAULT 0,
  renewal_conditions TEXT,
  description TEXT,
  application_url TEXT NOT NULL,
  documents_required JSONB DEFAULT '[]'::jsonb,
  source_url TEXT,
  source_name TEXT,
  last_verified_at TIMESTAMPTZ DEFAULT NOW(),
  verification_status TEXT DEFAULT 'Verified Official' CHECK (verification_status IN ('Verified Official', 'Pending Annual Audit', 'Community Reported')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. User Roadmap Milestones Table (Step 20: Persist Roadmap Milestones)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.roadmap_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_id TEXT NOT NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  priority TEXT DEFAULT 'Normal' CHECK (priority IN ('High', 'Medium', 'Normal')),
  category TEXT DEFAULT 'Drafting',
  application_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, milestone_id)
);

-- ==============================================================================
-- 5. Extend Applications Table (Steps 21, 22, 23)
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'program_id') THEN
    ALTER TABLE public.applications ADD COLUMN program_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'program_name') THEN
    ALTER TABLE public.applications ADD COLUMN program_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'intake_semester') THEN
    ALTER TABLE public.applications ADD COLUMN intake_semester TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'application_route') THEN
    ALTER TABLE public.applications ADD COLUMN application_route TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'readiness_score') THEN
    ALTER TABLE public.applications ADD COLUMN readiness_score NUMERIC DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'days_remaining') THEN
    ALTER TABLE public.applications ADD COLUMN days_remaining INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'urgency_band') THEN
    ALTER TABLE public.applications ADD COLUMN urgency_band TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'next_recommended_action') THEN
    ALTER TABLE public.applications ADD COLUMN next_recommended_action TEXT;
  END IF;
END $$;

-- ==============================================================================
-- 6. Enable Row Level Security (RLS) & Define Policies
-- ==============================================================================
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_milestones ENABLE ROW LEVEL SECURITY;

-- Universities: public read-only
DROP POLICY IF EXISTS "Universities are readable by all" ON public.universities;
CREATE POLICY "Universities are readable by all" ON public.universities
  FOR SELECT USING (true);

-- Programs: public read-only
DROP POLICY IF EXISTS "Programs are readable by all" ON public.programs;
CREATE POLICY "Programs are readable by all" ON public.programs
  FOR SELECT USING (true);

-- Scholarships: public read-only
DROP POLICY IF EXISTS "Scholarships are readable by all" ON public.scholarships;
CREATE POLICY "Scholarships are readable by all" ON public.scholarships
  FOR SELECT USING (true);

-- Roadmap Milestones: authenticated user isolation
DROP POLICY IF EXISTS "Users can read own roadmap milestones" ON public.roadmap_milestones;
CREATE POLICY "Users can read own roadmap milestones" ON public.roadmap_milestones
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own roadmap milestones" ON public.roadmap_milestones;
CREATE POLICY "Users can insert own roadmap milestones" ON public.roadmap_milestones
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own roadmap milestones" ON public.roadmap_milestones;
CREATE POLICY "Users can update own roadmap milestones" ON public.roadmap_milestones
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own roadmap milestones" ON public.roadmap_milestones;
CREATE POLICY "Users can delete own roadmap milestones" ON public.roadmap_milestones
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for high-speed queries
CREATE INDEX IF NOT EXISTS idx_universities_country ON public.universities(country);
CREATE INDEX IF NOT EXISTS idx_universities_ranking_world ON public.universities(ranking_world);
CREATE INDEX IF NOT EXISTS idx_programs_university_id ON public.programs(university_id);
CREATE INDEX IF NOT EXISTS idx_programs_degree ON public.programs(degree);
CREATE INDEX IF NOT EXISTS idx_scholarships_country ON public.scholarships(country);
CREATE INDEX IF NOT EXISTS idx_scholarships_competition ON public.scholarships(competition_level);
CREATE INDEX IF NOT EXISTS idx_roadmap_milestones_user ON public.roadmap_milestones(user_id);
