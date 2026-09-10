-- UniAdmission Database Migration: Step 3 Subscriptions & Server-Side Entitlements
-- Ensures subscription records and tiers can only be modified by backend service webhooks

-- 1. Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id TEXT,
  subscription_id TEXT UNIQUE,
  plan_id TEXT NOT NULL CHECK (plan_id IN ('Free', 'Explorer', 'Application', 'Complete', 'School')),
  status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'canceled', 'past_due', 'expired', 'incomplete')),
  amount_bdt NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'BDT',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  payment_provider TEXT DEFAULT 'sslcommerz',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Define RLS Policies
-- Authenticated users can only read their own subscription record
CREATE POLICY "Users can view their own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- IMPORTANT: No INSERT, UPDATE, or DELETE policies for public/authenticated users.
-- Only the backend service role (Edge Function / Webhook handler) can create or update subscriptions.

-- 4. Trigger function to automatically update profiles.tier when a verified subscription is recorded
CREATE OR REPLACE FUNCTION public.sync_subscription_tier_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status = 'active' OR NEW.status = 'trialing') THEN
    UPDATE public.profiles
    SET tier = NEW.plan_id,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = NEW.user_id;
  ELSIF (NEW.status = 'canceled' OR NEW.status = 'expired') THEN
    UPDATE public.profiles
    SET tier = 'Free',
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_subscription_updated ON public.subscriptions;
CREATE TRIGGER on_subscription_updated
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_subscription_tier_to_profile();
