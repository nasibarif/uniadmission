-- UniAdmission Database Migration: Payment & Quota Hardening v2
-- Introduces atomic payment fulfillment procedure, state machine validation, 
-- single active subscription enforcement, and payment/subscription reconciliation.

-- ============================================================================
-- 1. Reconcile payment_transactions Table & Constraints
-- ============================================================================
DO $$
BEGIN
  -- Ensure all canonical columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_transactions' AND column_name = 'merchant_transaction_id') THEN
    ALTER TABLE public.payment_transactions ADD COLUMN merchant_transaction_id TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_transactions' AND column_name = 'provider_session_id') THEN
    ALTER TABLE public.payment_transactions ADD COLUMN provider_session_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_transactions' AND column_name = 'provider_transaction_id') THEN
    ALTER TABLE public.payment_transactions ADD COLUMN provider_transaction_id TEXT;
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

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_transactions' AND column_name = 'failure_reason') THEN
    ALTER TABLE public.payment_transactions ADD COLUMN failure_reason TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_transactions' AND column_name = 'verified_at') THEN
    ALTER TABLE public.payment_transactions ADD COLUMN verified_at TIMESTAMPTZ;
  END IF;
END $$;

-- Update status check constraint to enforce canonical states
ALTER TABLE public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_status_check;
ALTER TABLE public.payment_transactions ADD CONSTRAINT payment_transactions_status_check 
  CHECK (status IN ('pending', 'initiated', 'processing', 'success', 'completed', 'failed', 'cancelled', 'expired', 'refunded', 'verification_failed'));

-- Create canonical indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_merchant_tx ON public.payment_transactions(merchant_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_tx ON public.payment_transactions(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);

-- ============================================================================
-- 2. Reconcile subscriptions Table & Single Active Subscription Constraint
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

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON public.subscriptions(expires_at);

-- Partial Unique Index: Only ONE active subscription per user at any given time
DROP INDEX IF EXISTS idx_single_active_subscription_per_user;
CREATE UNIQUE INDEX idx_single_active_subscription_per_user 
  ON public.subscriptions(user_id) 
  WHERE status = 'active';

-- ============================================================================
-- 3. Atomic Stored Procedure: fulfill_payment_transaction()
-- ============================================================================
-- Handles payment fulfillment atomically with exclusive row locking, state machine check,
-- single active subscription enforcement, catalog duration expiry, and profile tier elevation.
CREATE OR REPLACE FUNCTION public.fulfill_payment_transaction(
  p_merchant_transaction_id TEXT,
  p_provider_validation_id TEXT,
  p_provider_transaction_id TEXT,
  p_payment_method TEXT,
  p_gateway_response JSONB DEFAULT '{}'::jsonb,
  p_duration_days INTEGER DEFAULT 365
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

  -- 3. State Machine Transition Check: only 'initiated' or 'pending' can transition to 'success'
  IF v_tx.status NOT IN ('initiated', 'pending', 'processing') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Invalid payment state transition from %s to success', v_tx.status),
      'code', 'INVALID_STATE_TRANSITION'
    );
  END IF;

  -- 4. Calculate subscription expiry based on plan catalog duration
  v_expires_at := v_now + (COALESCE(p_duration_days, 365) || ' days')::INTERVAL;

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

-- Revoke execution from PUBLIC, anon, authenticated; grant strictly to service_role
REVOKE EXECUTE ON FUNCTION public.fulfill_payment_transaction(TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fulfill_payment_transaction(TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fulfill_payment_transaction(TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_payment_transaction(TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER) TO service_role;
