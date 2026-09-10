-- UniAdmission Database Migration: Security & Bug Fixation Audit v4
-- 1. Fixes AI quota off-by-one bug with conditional UPDATE and FOUND check (P0-05)
-- 2. Revokes check_and_increment_ai_quota from PUBLIC, anon, and authenticated; grants to service_role (P0-07)
-- 3. Introduces record_ai_token_usage procedure to separate token accounting from quota reservation (P0-08)
-- 4. Creates user_roles, schools, and school_memberships tables for server-authoritative route protection (P0-09, P0-10)
-- 5. Creates document_share_links table for persistent revocable document sharing (P1-04)
-- 6. Enforces database-level payment state transitions with BEFORE UPDATE trigger (P1-08)

-- ============================================================================
-- 1. AI Quota Stored Procedure: Exact Off-by-One Fix & Privileges (P0-05, P0-07)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_and_increment_ai_quota(
  p_user_id UUID,
  p_usage_date DATE,
  p_limit INTEGER,
  p_prompt_tokens INTEGER DEFAULT 0,
  p_output_tokens INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count INTEGER := 0;
  v_allowed BOOLEAN := false;
  v_remaining INTEGER := 0;
BEGIN
  -- 1. Ensure daily record exists
  INSERT INTO public.ai_usage_daily (user_id, usage_date, request_count, input_tokens, output_tokens, last_request_at)
  VALUES (p_user_id, p_usage_date, 0, 0, 0, NOW())
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  -- 2. Conditionally increment request_count strictly IF current request_count < p_limit
  UPDATE public.ai_usage_daily
  SET 
    request_count = request_count + 1,
    input_tokens = input_tokens + p_prompt_tokens,
    output_tokens = output_tokens + p_output_tokens,
    last_request_at = NOW()
  WHERE user_id = p_user_id
    AND usage_date = p_usage_date
    AND request_count < p_limit
  RETURNING request_count INTO v_new_count;

  -- 3. Exact evaluation: If row was updated, the request was within limits and is permitted
  IF FOUND THEN
    v_allowed := true;
    v_remaining := GREATEST(0, p_limit - v_new_count);
  ELSE
    SELECT request_count INTO v_new_count
    FROM public.ai_usage_daily
    WHERE user_id = p_user_id AND usage_date = p_usage_date;

    v_allowed := false;
    v_remaining := 0;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'count', COALESCE(v_new_count, p_limit),
    'remaining', v_remaining,
    'limit', p_limit
  );
END;
$$;

-- Revoke from PUBLIC, anon, authenticated; grant strictly to service_role (P0-07)
REVOKE EXECUTE ON FUNCTION public.check_and_increment_ai_quota(UUID, DATE, INTEGER, INTEGER, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_ai_quota(UUID, DATE, INTEGER, INTEGER, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_ai_quota(UUID, DATE, INTEGER, INTEGER, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_quota(UUID, DATE, INTEGER, INTEGER, INTEGER) TO service_role;

-- ============================================================================
-- 2. AI Token Accounting Procedure (P0-08)
-- ============================================================================
-- Updates tokens after model completion without touching or overwriting request_count
CREATE OR REPLACE FUNCTION public.record_ai_token_usage(
  p_user_id UUID,
  p_usage_date DATE,
  p_input_tokens INTEGER DEFAULT 0,
  p_output_tokens INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ai_usage_daily
  SET 
    input_tokens = input_tokens + p_input_tokens,
    output_tokens = output_tokens + p_output_tokens,
    last_request_at = NOW()
  WHERE user_id = p_user_id AND usage_date = p_usage_date;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_ai_token_usage(UUID, DATE, INTEGER, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_ai_token_usage(UUID, DATE, INTEGER, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_ai_token_usage(UUID, DATE, INTEGER, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_ai_token_usage(UUID, DATE, INTEGER, INTEGER) TO service_role;

-- ============================================================================
-- 3. Server-Authoritative User Roles & School Memberships (P0-09, P0-10)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'data_editor', 'support', 'school_admin', 'counselor')),
  organization_id UUID,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages user roles" ON public.user_roles;
CREATE POLICY "Service role manages user roles"
  ON public.user_roles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Schools & School Memberships
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  admin_email TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view active schools" ON public.schools;
CREATE POLICY "Anyone authenticated can view active schools"
  ON public.schools FOR SELECT
  TO authenticated
  USING (active = true);

CREATE TABLE IF NOT EXISTS public.school_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('school_admin', 'counselor')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE (school_id, user_id)
);

ALTER TABLE public.school_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their own school memberships" ON public.school_memberships;
CREATE POLICY "Members can view their own school memberships"
  ON public.school_memberships FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. Persistent Revocable Document Share Links (P1-04)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.document_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  access_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_document_share_links_token ON public.document_share_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_document_share_links_owner ON public.document_share_links(owner_user_id);
ALTER TABLE public.document_share_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own document share links" ON public.document_share_links;
CREATE POLICY "Users manage their own document share links"
  ON public.document_share_links FOR ALL
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- ============================================================================
-- 5. Database Payment State Machine Trigger (P1-08)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_payment_transaction_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If status is not changing, allow update
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Disallow any transition out of 'success' or 'completed' (except 'refunded')
  IF (OLD.status IN ('success', 'completed')) AND NEW.status NOT IN ('refunded') THEN
    RAISE EXCEPTION 'Invalid payment state transition: % cannot transition to %', OLD.status, NEW.status;
  END IF;

  -- Disallow transitions from terminal states ('failed', 'cancelled', 'expired', 'refunded')
  IF OLD.status IN ('failed', 'cancelled', 'expired', 'refunded') THEN
    RAISE EXCEPTION 'Invalid payment state transition: terminal status % cannot be changed to %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_payment_transaction_transition ON public.payment_transactions;
CREATE TRIGGER trg_validate_payment_transaction_transition
  BEFORE UPDATE OF status ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_payment_transaction_transition();

-- ============================================================================
-- 6. Authoritative Subscription Plans Catalog (P0-02)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount_bdt NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BDT',
  duration_days INTEGER NOT NULL DEFAULT 365,
  active BOOLEAN NOT NULL DEFAULT true,
  features JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active subscription plans" ON public.subscription_plans;
CREATE POLICY "Anyone can read active subscription plans"
  ON public.subscription_plans FOR SELECT
  USING (active = true);

-- Seed authoritative catalog with canonical prices and 365-day durations (P0-03, P0-07, P2-08)
INSERT INTO public.subscription_plans (id, name, amount_bdt, currency, duration_days, active)
VALUES 
  ('Free', 'Free Starter Plan', 0, 'BDT', 365, true),
  ('Explorer', 'University Discovery (Explorer Plan)', 1490, 'BDT', 365, true),
  ('Application', 'Application Assistant (Application Plan)', 3990, 'BDT', 365, true),
  ('Complete', 'Complete Strategy (Complete Plan)', 7990, 'BDT', 365, true),
  ('School', 'Institutional License (School Tier)', 19990, 'BDT', 365, true)
ON CONFLICT (id) DO UPDATE 
SET 
  name = EXCLUDED.name,
  amount_bdt = EXCLUDED.amount_bdt,
  duration_days = EXCLUDED.duration_days,
  active = EXCLUDED.active,
  updated_at = NOW();

-- Explicitly drop legacy bKash trigger and procedure to prevent dual fulfillment (P0-02, P0-03)
DROP TRIGGER IF EXISTS on_bkash_payment_completed ON public.payment_transactions;
DROP TRIGGER IF EXISTS trg_completed_bkash_payment ON public.payment_transactions;
DROP FUNCTION IF EXISTS public.handle_completed_bkash_payment();

-- ============================================================================
-- 7. Authoritative Payment Fulfillment RPC (P0-01, P0-02, P0-03)
-- ============================================================================
-- Removes caller-controlled duration parameter; looks up duration strictly from subscription_plans.
-- Revokes execution from PUBLIC, anon, and authenticated; grants strictly to service_role.

-- Drop legacy 6-parameter overload if it exists
DROP FUNCTION IF EXISTS public.fulfill_payment_transaction(TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER);

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
  v_plan_duration INTEGER := 365;
  v_expires_at TIMESTAMPTZ;
  v_subscription_id UUID;
BEGIN
  -- 1. Exclusively lock the transaction row to prevent race conditions
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

  -- 4. Server-Authoritative Duration from subscription_plans table (P0-02)
  SELECT duration_days INTO v_plan_duration
  FROM public.subscription_plans
  WHERE id = v_tx.plan_id;

  v_plan_duration := COALESCE(v_plan_duration, 365);
  v_expires_at := v_now + (v_plan_duration || ' days')::INTERVAL;

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

  -- 7. Insert new active subscription record
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
      'paymentMethod', p_payment_method,
      'durationDays', v_plan_duration
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

-- Revoke from PUBLIC, anon, authenticated; grant strictly to service_role (P0-03)
REVOKE EXECUTE ON FUNCTION public.fulfill_payment_transaction(TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fulfill_payment_transaction(TEXT, TEXT, TEXT, TEXT, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fulfill_payment_transaction(TEXT, TEXT, TEXT, TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_payment_transaction(TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;

-- ============================================================================
-- 8. Persistent Distributed Anonymous AI Quota (P1-09)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_usage_anonymous (
  ip_hash TEXT NOT NULL,
  usage_date DATE DEFAULT CURRENT_DATE NOT NULL,
  request_count INTEGER DEFAULT 0 NOT NULL,
  last_request_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (ip_hash, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_anonymous_date ON public.ai_usage_anonymous(usage_date);
ALTER TABLE public.ai_usage_anonymous ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages anonymous AI usage" ON public.ai_usage_anonymous;
CREATE POLICY "Service role manages anonymous AI usage"
  ON public.ai_usage_anonymous FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.check_and_increment_anonymous_quota(
  p_ip_hash TEXT,
  p_usage_date DATE,
  p_limit INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count INTEGER := 0;
  v_allowed BOOLEAN := false;
  v_remaining INTEGER := 0;
BEGIN
  INSERT INTO public.ai_usage_anonymous (ip_hash, usage_date, request_count, last_request_at)
  VALUES (p_ip_hash, p_usage_date, 0, NOW())
  ON CONFLICT (ip_hash, usage_date) DO NOTHING;

  UPDATE public.ai_usage_anonymous
  SET 
    request_count = request_count + 1,
    last_request_at = NOW()
  WHERE ip_hash = p_ip_hash
    AND usage_date = p_usage_date
    AND request_count < p_limit
  RETURNING request_count INTO v_new_count;

  IF FOUND THEN
    v_allowed := true;
    v_remaining := GREATEST(0, p_limit - v_new_count);
  ELSE
    SELECT request_count INTO v_new_count
    FROM public.ai_usage_anonymous
    WHERE ip_hash = p_ip_hash AND usage_date = p_usage_date;

    v_allowed := false;
    v_remaining := 0;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'count', COALESCE(v_new_count, p_limit),
    'remaining', v_remaining,
    'limit', p_limit
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_increment_anonymous_quota(TEXT, DATE, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_anonymous_quota(TEXT, DATE, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_anonymous_quota(TEXT, DATE, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_anonymous_quota(TEXT, DATE, INTEGER) TO service_role;

