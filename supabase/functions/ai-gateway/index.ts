// Supabase Edge Function: AI Gateway
// Secures the Google Gemini API key server-side, enforces tier-based rate limits & burst rate limits,
// validates inputs against length/action whitelists, applies security headers, and logs telemetry without PII.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

// Daily request limits per subscription tier
const TIER_DAILY_LIMITS: Record<string, number> = {
  Free: 5,
  Explorer: 25,
  Application: 100,
  Complete: 250,
  School: 1000,
};

const ALLOWED_ACTIONS = new Set(["counselor", "sop", "critique", "cv", "general"]);
const ALLOWED_MODELS = new Set(["gemini-2.5-flash", "gemini-1.5-pro", "gemini-1.5-flash"]);
const MAX_PROMPT_CHARS = 30000;

// In-memory rate limit trackers
const dailyUsageTracker = new Map<string, { count: number; date: string }>();
const burstTracker = new Map<string, number[]>(); // userId -> timestamps

function checkRateLimit(
  userId: string,
  tier: string
): { allowed: boolean; remaining: number; limit: number; error?: string } {
  const now = Date.now();

  // 1. Sliding window burst limit: max 10 requests per 60 seconds
  const recentRequests = (burstTracker.get(userId) || []).filter((t) => now - t < 60000);
  if (recentRequests.length >= 10) {
    return {
      allowed: false,
      remaining: 0,
      limit: 10,
      error: "Burst rate limit exceeded: Too many requests in 60 seconds. Please wait a moment.",
    };
  }

  // 2. Daily tier limit
  const today = new Date().toISOString().split("T")[0];
  const limit = TIER_DAILY_LIMITS[tier] || TIER_DAILY_LIMITS["Explorer"];
  const userRecord = dailyUsageTracker.get(userId);

  if (!userRecord || userRecord.date !== today) {
    dailyUsageTracker.set(userId, { count: 1, date: today });
    recentRequests.push(now);
    burstTracker.set(userId, recentRequests);
    return { allowed: true, remaining: limit - 1, limit };
  }

  if (userRecord.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      limit,
      error: `Daily AI quota reached (${limit} requests/day for your ${tier} plan). Please upgrade for higher limits.`,
    };
  }

  userRecord.count += 1;
  recentRequests.push(now);
  burstTracker.set(userId, recentRequests);

  return { allowed: true, remaining: limit - userRecord.count, limit };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startTime = Date.now();

  try {
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "AI Gateway service is currently unavailable. Server key not configured.",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Supabase user authentication verification
    let userId = "anonymous";
    let userTier = "Explorer";

    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          userId = user.id;
          userTier = user.user_metadata?.tier || "Explorer";
        }
      }
    }

    // Read and validate payload
    const payload = await req.json().catch(() => ({}));
    const action = payload.action || "general";
    const tier = payload.tier || userTier;

    if (!ALLOWED_ACTIONS.has(action)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid AI action: ${action}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const model = payload.model || "gemini-2.5-flash";
    if (!ALLOWED_MODELS.has(model)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid AI model: ${model}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const contents = payload.contents || [];
    const contentsString = JSON.stringify(contents);
    if (contentsString.length > MAX_PROMPT_CHARS) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Prompt payload too large (${contentsString.length} chars). Max allowed is ${MAX_PROMPT_CHARS}.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify rate limit (burst + daily tier limit)
    const rateCheck = checkRateLimit(userId, tier);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: rateCheck.error || "Rate limit reached.",
          remainingQuota: 0,
          limit: rateCheck.limit,
          tier,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Format Gemini request
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    const latencyMs = Date.now() - startTime;

    if (!geminiRes.ok) {
      console.error(
        `[AI Gateway Error] Action: ${action} | Status: ${geminiRes.status} | Latency: ${latencyMs}ms`
      );
      // Return safe message without leaking API keys or upstream internals
      return new Response(
        JSON.stringify({
          success: false,
          error: "AI upstream service returned an error. Please try again shortly.",
        }),
        {
          status: geminiRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await geminiRes.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const tokenCount = data.usageMetadata?.totalTokenCount || 0;

    // Structured telemetry logging without saving student text
    console.log(
      `[AI Gateway Telemetry] Action: ${action} | Model: ${model} | Tokens: ${tokenCount} | Latency: ${latencyMs}ms | User: ${userId} | Status: 200`
    );

    return new Response(
      JSON.stringify({
        success: true,
        text: candidateText || "",
        remainingQuota: rateCheck.remaining,
        limit: rateCheck.limit,
        tier,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    console.error(`[AI Gateway Exception] Latency: ${latencyMs}ms | Error: ${err?.message}`);
    return new Response(
      JSON.stringify({
        success: false,
        error: "An unexpected error occurred in the AI Gateway.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
