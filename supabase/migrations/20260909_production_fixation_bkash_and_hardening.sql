-- UniAdmission Database Migration: Production Fixation, bKash MFS & Security Hardening
-- Implements bKash payment transaction tracking, authoritative entitlements, and AI usage limits.

-- ============================================================================
-- 1. Create payment_transactions Table (bKash MFS Integration)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'sslcommerz',
  provider_payment_id TEXT NOT NULL,
  provider_transaction_id TEXT UNIQUE, -- bKash TrxID, guaranteed unique
  customer_account TEXT,               -- bKash sender wallet (01XXXXXXXXX)
  plan_id TEXT NOT NULL CHECK (plan_id IN ('Free', 'Explorer', 'Application', 'Complete', 'School')),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'BDT' CHECK (currency = 'BDT'),
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (
    status IN ('initiated', 'pending', 'completed', 'failed', 'cancelled', 'refunded', 'verification_failed')
  ),
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  verified_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for lightning fast lookups and idempotency enforcement
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_transactions_trx_unique 
  ON public.payment_transactions(provider_transaction_id) 
  WHERE provider_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);

-- Enable RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment transactions
CREATE POLICY "Users can view their own payment transactions"
  ON public.payment_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Mutations restricted to server-role or security definer functions
-- No direct INSERT/UPDATE/DELETE policy for authenticated users

-- ============================================================================
-- 2. Update subscriptions Table for bKash and BDT
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'amount_bdt'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN amount_bdt NUMERIC DEFAULT 0;
  END IF;

  ALTER TABLE public.subscriptions ALTER COLUMN payment_provider SET DEFAULT 'sslcommerz';
  ALTER TABLE public.subscriptions ALTER COLUMN currency SET DEFAULT 'BDT';
END $$;

-- ============================================================================
-- 3. Create entitlements Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true NOT NULL,
  source_subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT unique_user_feature UNIQUE(user_id, feature)
);

CREATE INDEX IF NOT EXISTS idx_entitlements_user_id ON public.entitlements(user_id);
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entitlements"
  ON public.entitlements FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. Create ai_usage Table for Persistent Daily Quotas
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE DEFAULT CURRENT_DATE NOT NULL,
  request_count INTEGER DEFAULT 0 NOT NULL,
  input_tokens INTEGER DEFAULT 0 NOT NULL,
  output_tokens INTEGER DEFAULT 0 NOT NULL,
  estimated_cost_usd NUMERIC(10, 4) DEFAULT 0.0000 NOT NULL,
  last_request_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT unique_user_usage_date UNIQUE (user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON public.ai_usage(user_id, usage_date);
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI usage"
  ON public.ai_usage FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. Single Fulfillment Path Enforcement (P0-02, P0-03)
-- ============================================================================
-- Legacy trigger and function dropped. All payment fulfillments route strictly
-- through public.fulfill_payment_transaction with server-authoritative catalog duration.
DROP TRIGGER IF EXISTS on_bkash_payment_completed ON public.payment_transactions;
DROP FUNCTION IF EXISTS public.handle_completed_bkash_payment();
