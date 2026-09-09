-- UniAdmission Database Migration: Gateway-Agnostic Payment Architecture & SSLCOMMERZ
-- Enforces provider-neutral payment tracking, server-verified subscriptions, and strict RLS.

-- ============================================================================
-- 1. Upgrade payment_transactions Table for Provider-Agnostic Architecture
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'sslcommerz',
  merchant_transaction_id TEXT UNIQUE,
  provider_session_id TEXT,
  provider_transaction_id TEXT,
  provider_validation_id TEXT,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'BDT',
  status TEXT NOT NULL DEFAULT 'initiated',
  payment_method TEXT,
  gateway_response JSONB DEFAULT '{}'::jsonb,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  verified_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure all required columns exist on payment_transactions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_transactions' AND column_name = 'merchant_transaction_id') THEN
    ALTER TABLE public.payment_transactions ADD COLUMN merchant_transaction_id TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_transactions' AND column_name = 'provider_session_id') THEN
    ALTER TABLE public.payment_transactions ADD COLUMN provider_session_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_transactions' AND column_name = 'provider_validation_id') THEN
    ALTER TABLE public.payment_transactions ADD COLUMN provider_validation_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_transactions' AND column_name = 'payment_method') THEN
    ALTER TABLE public.payment_transactions ADD COLUMN payment_method TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_transactions' AND column_name = 'gateway_response') THEN
    ALTER TABLE public.payment_transactions ADD COLUMN gateway_response JSONB DEFAULT '{}'::jsonb;
  END IF;

  ALTER TABLE public.payment_transactions ALTER COLUMN provider SET DEFAULT 'sslcommerz';
END $$;

-- Update status check constraint to encompass standard lifecycle states
ALTER TABLE public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_status_check;
ALTER TABLE public.payment_transactions ADD CONSTRAINT payment_transactions_status_check 
  CHECK (status IN ('pending', 'initiated', 'processing', 'success', 'completed', 'failed', 'cancelled', 'expired', 'refunded', 'verification_failed'));

-- Update plan_id check constraint
ALTER TABLE public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_plan_id_check;
ALTER TABLE public.payment_transactions ADD CONSTRAINT payment_transactions_plan_id_check 
  CHECK (plan_id IN ('Free', 'Explorer', 'Application', 'Complete', 'School'));

-- Create indexing for performant lookups and idempotency
CREATE INDEX IF NOT EXISTS idx_payment_transactions_merchant_tx 
  ON public.payment_transactions(merchant_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_val_id 
  ON public.payment_transactions(provider_validation_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_tx 
  ON public.payment_transactions(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user 
  ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status_composite 
  ON public.payment_transactions(user_id, status);

-- ============================================================================
-- 2. Upgrade subscriptions Table
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'payment_transaction_id') THEN
    ALTER TABLE public.subscriptions ADD COLUMN payment_transaction_id UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'provider') THEN
    ALTER TABLE public.subscriptions ADD COLUMN provider TEXT DEFAULT 'sslcommerz';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'starts_at') THEN
    ALTER TABLE public.subscriptions ADD COLUMN starts_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'expires_at') THEN
    ALTER TABLE public.subscriptions ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;

  ALTER TABLE public.subscriptions ALTER COLUMN payment_provider SET DEFAULT 'sslcommerz';
  ALTER TABLE public.subscriptions ALTER COLUMN currency SET DEFAULT 'BDT';
END $$;

-- Expand subscriptions plan_id constraint
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_id_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_id_check 
  CHECK (plan_id IN ('Free', 'Explorer', 'Application', 'Complete', 'School'));

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_active 
  ON public.subscriptions(user_id, status, expires_at);

-- ============================================================================
-- 3. Row Level Security (RLS) Policies
-- ============================================================================
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop legacy conflicting policies if they exist
DROP POLICY IF EXISTS "Users can view their own payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;

-- Users can only read their own payment transactions
CREATE POLICY "Users can view their own payment transactions"
  ON public.payment_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only read their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Explicitly deny INSERT, UPDATE, DELETE for users on payment_transactions and subscriptions
-- (Only the service_role key used by backend Edge Functions can modify these tables)

-- ============================================================================
-- 4. Idempotent Payment Fulfillment Trigger
-- ============================================================================
-- Automatically provisions active subscription upon server-verified successful payment
CREATE OR REPLACE FUNCTION public.handle_completed_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_sub_id TEXT;
  v_duration INTERVAL := INTERVAL '365 days';
BEGIN
  -- Trigger only when status transitions to 'success' or legacy 'completed'
  IF ((NEW.status = 'success' OR NEW.status = 'completed') AND 
      (OLD.status IS NULL OR (OLD.status <> 'success' AND OLD.status <> 'completed'))) THEN
    
    v_sub_id := COALESCE(NEW.merchant_transaction_id, NEW.provider_transaction_id, NEW.id::text);

    -- Idempotently upsert subscription record
    INSERT INTO public.subscriptions (
      user_id,
      plan_id,
      status,
      payment_transaction_id,
      provider,
      payment_provider,
      amount_bdt,
      currency,
      subscription_id,
      starts_at,
      expires_at,
      current_period_start,
      current_period_end,
      metadata,
      updated_at
    )
    VALUES (
      NEW.user_id,
      NEW.plan_id,
      'active',
      NEW.id,
      NEW.provider,
      NEW.provider,
      NEW.amount,
      NEW.currency,
      v_sub_id,
      NOW(),
      NOW() + v_duration,
      NOW(),
      NOW() + v_duration,
      jsonb_build_object(
        'transaction_id', NEW.id,
        'merchant_tx_id', NEW.merchant_transaction_id,
        'validation_id', NEW.provider_validation_id,
        'provider_tx_id', NEW.provider_transaction_id,
        'payment_method', NEW.payment_method
      ),
      NOW()
    )
    ON CONFLICT (subscription_id) DO UPDATE SET
      status = 'active',
      plan_id = EXCLUDED.plan_id,
      payment_transaction_id = EXCLUDED.payment_transaction_id,
      provider = EXCLUDED.provider,
      payment_provider = EXCLUDED.payment_provider,
      amount_bdt = EXCLUDED.amount_bdt,
      starts_at = NOW(),
      expires_at = NOW() + v_duration,
      current_period_start = NOW(),
      current_period_end = NOW() + v_duration,
      updated_at = NOW();

    -- Authoritative profile tier synchronization
    UPDATE public.profiles
    SET tier = NEW.plan_id,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = NEW.user_id;

    -- Upsert feature entitlements based on tier
    INSERT INTO public.entitlements (user_id, feature, enabled, expires_at)
    VALUES 
      (NEW.user_id, 'full_matching', true, NOW() + v_duration),
      (NEW.user_id, 'scholarship_discovery', true, NOW() + v_duration),
      (NEW.user_id, 'ai_counselor', true, NOW() + v_duration),
      (NEW.user_id, 'sop_assistant', true, NOW() + v_duration),
      (NEW.user_id, 'unlimited_vault', true, NOW() + v_duration)
    ON CONFLICT (user_id, feature) DO UPDATE SET
      enabled = true,
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Harden function search path
ALTER FUNCTION public.handle_completed_payment() SET search_path = public, pg_temp;

-- Attach trigger
DROP TRIGGER IF EXISTS on_bkash_payment_completed ON public.payment_transactions;
DROP TRIGGER IF EXISTS on_payment_completed ON public.payment_transactions;
CREATE TRIGGER on_payment_completed
  AFTER INSERT OR UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_completed_payment();
