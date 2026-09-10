-- UniAdmission Database Migration: Persistent Daily AI Quota & Atomic Increment
-- Prevents concurrent quota bypass with atomic single-transaction checks and updates.

-- ============================================================================
-- 1. Create ai_usage_daily Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE DEFAULT CURRENT_DATE NOT NULL,
  request_count INTEGER DEFAULT 0 NOT NULL,
  input_tokens INTEGER DEFAULT 0 NOT NULL,
  output_tokens INTEGER DEFAULT 0 NOT NULL,
  last_request_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_daily_user_date ON public.ai_usage_daily(user_id, usage_date);
ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;

-- Users can view their own daily AI quota consumption
DROP POLICY IF EXISTS "Users can view their own daily AI usage" ON public.ai_usage_daily;
CREATE POLICY "Users can view their own daily AI usage"
  ON public.ai_usage_daily FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. Atomic Quota Check & Increment Function
-- ============================================================================
-- Atomically checks if request_count < p_limit. If allowed, increments request_count,
-- input_tokens, and output_tokens in one atomic transaction, preventing race conditions.
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
  v_current_count INTEGER := 0;
  v_new_count INTEGER := 0;
  v_allowed BOOLEAN := false;
  v_remaining INTEGER := 0;
BEGIN
  -- 1. Lock or insert the daily record
  INSERT INTO public.ai_usage_daily (user_id, usage_date, request_count, input_tokens, output_tokens, last_request_at)
  VALUES (p_user_id, p_usage_date, 0, 0, 0, NOW())
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  -- 2. Atomically check and increment if below limit
  UPDATE public.ai_usage_daily
  SET 
    request_count = CASE 
      WHEN ai_usage_daily.request_count < p_limit THEN ai_usage_daily.request_count + 1 
      ELSE ai_usage_daily.request_count 
    END,
    input_tokens = ai_usage_daily.input_tokens + p_prompt_tokens,
    output_tokens = ai_usage_daily.output_tokens + p_output_tokens,
    last_request_at = NOW()
  WHERE user_id = p_user_id AND usage_date = p_usage_date
  RETURNING request_count INTO v_new_count;

  -- Determine if the request was permitted
  IF v_new_count <= p_limit THEN
    v_allowed := true;
    v_remaining := GREATEST(0, p_limit - v_new_count);
  ELSE
    v_allowed := false;
    v_remaining := 0;
  END IF;

  -- Keep legacy ai_usage table synchronized if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_usage') THEN
    INSERT INTO public.ai_usage (user_id, usage_date, request_count, input_tokens, output_tokens, last_request_at)
    VALUES (p_user_id, p_usage_date, v_new_count, p_prompt_tokens, p_output_tokens, NOW())
    ON CONFLICT (user_id, usage_date) DO UPDATE
      SET request_count = v_new_count,
          input_tokens = public.ai_usage.input_tokens + p_prompt_tokens,
          output_tokens = public.ai_usage.output_tokens + p_output_tokens,
          last_request_at = NOW();
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'count', v_new_count,
    'remaining', v_remaining,
    'limit', p_limit
  );
END;
$$;

-- Grant execution to authenticated users and service_role
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_quota(UUID, DATE, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_quota(UUID, DATE, INTEGER, INTEGER, INTEGER) TO service_role;
