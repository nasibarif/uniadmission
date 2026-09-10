-- UniAdmission Database Migration: Payment & Quota Hardening v3
-- 1. Introduces authoritative subscription_plans table (server-side single source of truth for pricing/duration).
-- 2. Upgrades public.fulfill_payment_transaction() to derive duration exclusively from subscription_plans,
--    removing caller-controlled p_duration_days.
-- 3. Revokes fulfillment RPC execution from public, anon, and authenticated; grants strictly to service_role.
-- 4. Aligns storage.buckets file_size_limit to 20971520 (20MB) and ensures image/webp is permitted.

-- ============================================================================
-- 1. Authoritative subscription_plans Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  plan_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount_bdt INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BDT',
  duration_days INTEGER NOT NULL DEFAULT 365,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated or anonymous can read the plan catalog
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON public.subscription_plans;
CREATE POLICY "Anyone can view active subscription plans"
  ON public.subscription_plans FOR SELECT
  USING (active = true);

-- Only service_role can modify plan definitions
DROP POLICY IF EXISTS "Service role manages subscription plans" ON public.subscription_plans;
CREATE POLICY "Service role manages subscription plans"
  ON public.subscription_plans FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed authoritative canonical plans
INSERT INTO public.subscription_plans (plan_id, name, amount_bdt, currency, duration_days, active)
VALUES
  ('Free', 'Free Starter', 0, 'BDT', 0, true),
  ('Explorer', 'Explorer Tier', 1490, 'BDT', 365, true),
  ('Application', 'Application Assistant', 3990, 'BDT', 365, true),
  ('Complete', 'Complete Admissions Suite', 7990, 'BDT', 365, true),
  ('School', 'Institutional & School Portal', 19990, 'BDT', 365, true)
ON CONFLICT (plan_id) DO UPDATE SET
  name = EXCLUDED.name,
  amount_bdt = EXCLUDED.amount_bdt,
  currency = EXCLUDED.currency,
  duration_days = EXCLUDED.duration_days,
  active = EXCLUDED.active,
  updated_at = TIMEZONE('utc'::text, NOW());

-- ============================================================================
-- 2. Authoritative Atomic Payment Fulfillment Procedure (v3 Hardened)
-- ============================================================================
-- Removes caller-controlled p_duration_days. Derives duration exclusively from subscription_plans table.
-- Enforces row-locking, strict state machine progression, single active subscription rule, and profile sync.
CREATE OR REPLACE FUNCTION public.fulfill_payment_transaction(
  p_merchant_transaction_id TEXT,
  p_provider_validation_id TEXT,
  p_provider_transaction_id TEXT,
  p_payment_method TEXT,
  p_gateway_response JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_now TIMESTAMPTZ := TIMEZONE('utc'::text, NOW());
  v_expires_at TIMESTAMPTZ;
  v_duration_days INTEGER := 365;
  v_subscription_id UUID;
BEGIN
  -- 1. Exclusively lock the transaction row to prevent race conditions between IPN and redirect
  SELECT * INTO v_tx
  FROM public.payment_transactions
  WHERE merchant_transaction_id = p_merchant_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transaction not found in database',
      'code', 'TRANSACTION_NOT_FOUND'
    );
  END IF;

  -- 2. Idempotency Guard: if already fulfilled, return success cleanly without mutating state
  IF v_tx.status = 'success' OR v_tx.status = 'completed' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_fulfilled', true,
      'transaction_id', v_tx.merchant_transaction_id,
      'plan_id', v_tx.plan_id,
      'user_id', v_tx.user_id,
      'message', 'Transaction already fulfilled successfully.'
    );
  END IF;

  -- 3. State Machine Transition Check: only 'initiated', 'pending', or 'processing' can transition to 'success'
  IF v_tx.status NOT IN ('initiated', 'pending', 'processing') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Invalid payment state transition from %s to success', v_tx.status),
      'code', 'INVALID_STATE_TRANSITION'
    );
  END IF;

  -- 4. Derive duration exclusively from authoritative subscription_plans table (never trust caller)
  SELECT duration_days INTO v_duration_days
  FROM public.subscription_plans
  WHERE plan_id = v_tx.plan_id;

  IF v_duration_days IS NULL OR v_duration_days <= 0 THEN
    v_duration_days := 365;
  END IF;

  v_expires_at := v_now + (v_duration_days || ' days')::INTERVAL;

  -- 5. Mark payment transaction as success
  UPDATE public.payment_transactions
  SET 
    status = 'success',
    provider_validation_id = COALESCE(p_provider_validation_id, provider_validation_id),
    provider_transaction_id = COALESCE(p_provider_transaction_id, provider_transaction_id),
    payment_method = COALESCE(p_payment_method, payment_method),
    gateway_response = COALESCE(p_gateway_response, gateway_response),
    verified_at = v_now,
    updated_at = v_now
  WHERE id = v_tx.id;

  -- 6. Expire any existing active subscription for this user (single active subscription rule)
  UPDATE public.subscriptions
  SET status = 'expired',
      updated_at = v_now
  WHERE user_id = v_tx.user_id AND status = 'active';

  -- 7. Insert new authoritative active subscription record with reconciled canonical fields
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
    v_tx.user_id,
    v_tx.plan_id,
    'active',
    v_tx.id,
    v_tx.provider,
    v_tx.provider,
    v_tx.amount,
    v_tx.currency,
    v_tx.merchant_transaction_id,
    v_now,
    v_expires_at,
    v_now,
    v_expires_at,
    jsonb_build_object(
      'validationId', p_provider_validation_id,
      'providerTransactionId', p_provider_transaction_id,
      'paymentMethod', p_payment_method
    ),
    v_now
  )
  RETURNING id INTO v_subscription_id;

  -- 8. Elevate user profile tier
  UPDATE public.profiles
  SET tier = v_tx.plan_id,
      updated_at = v_now
  WHERE id = v_tx.user_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_fulfilled', false,
    'transaction_id', v_tx.merchant_transaction_id,
    'subscription_id', v_subscription_id,
    'plan_id', v_tx.plan_id,
    'user_id', v_tx.user_id,
    'expires_at', v_expires_at
  );
END;
$$;

-- Drop legacy signature if it exists with 6 parameters (p_duration_days)
DROP FUNCTION IF EXISTS public.fulfill_payment_transaction(TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER);

-- ============================================================================
-- 3. Strict Privilege Hardening (Section 2)
-- ============================================================================
-- Revoke execution from public, anon, and authenticated. ONLY service_role may execute fulfillment RPC!
REVOKE EXECUTE ON FUNCTION public.fulfill_payment_transaction(TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fulfill_payment_transaction(TEXT, TEXT, TEXT, TEXT, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fulfill_payment_transaction(TEXT, TEXT, TEXT, TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_payment_transaction(TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;

-- ============================================================================
-- 4. Storage Bucket Configuration (20MB Limit Alignment, Section 14)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    UPDATE storage.buckets
    SET 
      file_size_limit = 20971520, -- 20MB
      allowed_mime_types = ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'image/jpeg',
        'image/png',
        'image/webp',
        'text/plain'
      ]
    WHERE id = 'documents';
  END IF;
END $$;
