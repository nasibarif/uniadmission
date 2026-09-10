// Supabase Edge Function: Secure Gateway-Agnostic Payments & Entitlements Service
// Supports SSLCOMMERZ (and pluggable aamarPay, shurjoPay) with server-authoritative pricing,
// server-to-server Order Validation, IPN handling, idempotency, and strict JWT authentication.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPaymentGateway } from "../_shared/payment/factory.ts";
import { getPlanConfig } from "../_shared/payment/catalog.ts";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOriginsEnv = Deno.env.get("APP_ALLOWED_ORIGINS") || "";
  const configuredOrigins = allowedOriginsEnv
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const appBaseUrl = Deno.env.get("APP_BASE_URL") || "";
  const paymentCallbackBaseUrl = Deno.env.get("PAYMENT_CALLBACK_BASE_URL") || "";

  const allowedOrigins = [
    ...configuredOrigins,
    appBaseUrl,
    paymentCallbackBaseUrl,
    "https://uniadmission.com",
    "https://uniadmission.vercel.app",
  ].filter(Boolean);

  const isDev = Deno.env.get("ENVIRONMENT") === "development";
  const isAllowed = Boolean(origin) && (
    allowedOrigins.includes(origin) || (isDev && origin.startsWith("http://localhost"))
  );

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  const requestId = `pay_${crypto.randomUUID()}`;

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders, "X-Request-Id": requestId } });
  }

  const url = new URL(req.url);
  // Normalize pathname to strip leading /payments or /functions/v1/payments
  let path = url.pathname
    .replace(/^\/functions\/v1\/payments/, "")
    .replace(/^\/payments/, "");
  if (!path.startsWith("/")) {
    path = "/" + path;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const appBaseUrl = (
    Deno.env.get("PAYMENT_CALLBACK_BASE_URL") ||
    Deno.env.get("APP_BASE_URL") ||
    "https://uniadmission.com"
  ).replace(/\/+$/, "");

  // Gateway Response Redaction (P1-09): Strips raw payment PII and secrets before persistence
  function redactGatewayResponse(data: any): any {
    if (!data || typeof data !== "object") return data;
    const sensitiveKeys = new Set([
      "card_number", "card_no", "bin_card_no", "card_issuer",
      "card_brand", "card_sub_brand", "store_passwd", "password",
      "secret", "token", "sessionkey"
    ]);
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = redactGatewayResponse(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  // Authenticate user identity strictly from JWT
  async function getAuthenticatedUser(req: Request) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return null;

    const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error } = await supabaseAuthClient.auth.getUser();
    if (error || !user) {
      return null;
    }
    return user;
  }

  // Admin client with service_role privileges for authoritative database mutations
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const gateway = getPaymentGateway();

  // SINGLE PATH ATOMIC FULFILLMENT:
  // All payment fulfillments route strictly and exclusively through PostgreSQL RPC fulfill_payment_transaction.
  // There is NO duplicate manual mutation fallback. Duration is derived server-side from subscription_plans.
  async function fulfillPayment(
    merchantTransactionId: string,
    valId: string,
    providerTransactionId: string,
    paymentMethod: string,
    gatewayResponse: any
  ) {
    const sanitizedResponse = redactGatewayResponse(gatewayResponse || {});
    const { data, error } = await supabaseAdmin.rpc("fulfill_payment_transaction", {
      p_merchant_transaction_id: merchantTransactionId,
      p_provider_validation_id: valId,
      p_provider_transaction_id: providerTransactionId,
      p_payment_method: paymentMethod,
      p_gateway_response: sanitizedResponse,
    });

    if (error) {
      console.error(`[RPC fulfill_payment_transaction error [${requestId}]]:`, error);
      throw new Error(`PAYMENT_FULFILLMENT_UNAVAILABLE: ${error.message}`);
    }

    if (!data?.success) {
      console.error(`[RPC fulfill_payment_transaction rejection [${requestId}]]:`, data);
      throw new Error(data?.error || "PAYMENT_FULFILLMENT_FAILED");
    }

    return data;
  }

  try {
    // --------------------------------------------------------------------------
    // 1. POST /create (or /create-payment): Initiate Hosted Payment
    // --------------------------------------------------------------------------
    if (path === "/create" || path === "/create-payment") {
      if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" } }), {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const user = await getAuthenticatedUser(req);
      if (!user) {
        return new Response(
          JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Valid Supabase session JWT required." } }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await req.json().catch(() => ({}));

      // Section 1.10: Accept strictly planId without aliases
      if (!body || typeof body.planId !== "string" || !body.planId.trim()) {
        return new Response(
          JSON.stringify({ error: { code: "INVALID_PLAN_PAYLOAD", message: "Missing required parameter 'planId'." } }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const planId = body.planId.trim();

      // SECURITY: Reject client-supplied amounts or prices
      if ("amount" in body || "price" in body || "currency" in body) {
        console.warn("[Security Alert] Client attempted to pass price/amount/currency. Using server catalog only.");
      }

      const plan = getPlanConfig(planId);
      if (!plan || plan.amount <= 0) {
        return new Response(
          JSON.stringify({ error: { code: "INVALID_PLAN", message: `Invalid or unpaid plan: ${planId}` } }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Section 1.6: Cryptographically secure UUID transaction ID
      const merchantTransactionId = `UA_TX_${crypto.randomUUID()}`;

      // Section 1.2: Retrieve verified customer profile details (no fake defaults)
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email, personal")
        .eq("id", user.id)
        .maybeSingle();

      const customerName = (profile?.personal?.fullName || profile?.full_name || user.user_metadata?.full_name || "").trim();
      const customerEmail = (user.email || profile?.personal?.email || profile?.email || "").trim();
      const customerPhone = (profile?.personal?.phone || user.phone || "").trim();

      if (!customerName || !customerEmail || !customerPhone) {
        return new Response(
          JSON.stringify({
            error: {
              code: "CUSTOMER_PROFILE_INCOMPLETE",
              message: "Please complete your profile name, email, and phone number before proceeding to payment checkout.",
            },
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Trusted callback base and backend webhook URLs (Error 9)
      const backendBaseUrl = (
        Deno.env.get("PAYMENT_BACKEND_BASE_URL") ||
        (supabaseUrl ? `${supabaseUrl.replace(/\/+$/, "")}/functions/v1` : "") ||
        appBaseUrl
      ).replace(/\/+$/, "");

      const successCallbackUrl = `${backendBaseUrl}/payments/callback/sslcommerz/success`;
      const failCallbackUrl = `${backendBaseUrl}/payments/callback/sslcommerz/fail`;
      const cancelCallbackUrl = `${backendBaseUrl}/payments/callback/sslcommerz/cancel`;
      const ipnWebhookUrl = `${backendBaseUrl}/payments/webhook/sslcommerz`;

      // 1. Record transaction in database in 'initiated' status before redirecting to gateway
      const { data: txRecord, error: dbError } = await supabaseAdmin
        .from("payment_transactions")
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          provider: gateway.provider,
          merchant_transaction_id: merchantTransactionId,
          amount: plan.amount,
          currency: plan.currency,
          status: "initiated",
          metadata: {
            planName: plan.name,
            durationDays: plan.durationDays,
            userEmail: customerEmail,
            initiatedFrom: req.headers.get("origin") || req.headers.get("referer"),
          },
        })
        .select()
        .single();

      if (dbError) {
        console.error("[Payments DB Error] Failed to create payment_transactions row:", dbError.message);
        return new Response(
          JSON.stringify({ error: { code: "DB_INIT_FAILED", message: "Failed to initialize payment record." } }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 2. Call Gateway Abstraction (e.g. SSLCOMMERZ) with verified customer data
      const gatewayResult = await gateway.createPayment({
        merchantTransactionId,
        amount: plan.amount,
        currency: plan.currency,
        planId: plan.id,
        planName: plan.name,
        userId: user.id,
        customerName,
        customerEmail,
        customerPhone,
        customerAddress: profile?.personal?.address || undefined,
        customerCity: profile?.personal?.city || undefined,
        successUrl: successCallbackUrl,
        failUrl: failCallbackUrl,
        cancelUrl: cancelCallbackUrl,
        ipnUrl: ipnWebhookUrl,
      });

      if (!gatewayResult.success || !gatewayResult.checkoutUrl) {
        await supabaseAdmin
          .from("payment_transactions")
          .update({
            status: "failed",
            failure_reason: gatewayResult.error || "Gateway session initialization failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", txRecord.id);

        return new Response(
          JSON.stringify({ 
            success: false, 
            error: { 
              code: "GATEWAY_INIT_FAILED", 
              message: gatewayResult.error || "Unable to initiate payment with gateway." 
            } 
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Save provider session key
      if (gatewayResult.sessionKey) {
        await supabaseAdmin
          .from("payment_transactions")
          .update({
            provider_session_id: gatewayResult.sessionKey,
            status: "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", txRecord.id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          provider: gateway.provider,
          paymentId: txRecord.id,
          gatewayUrl: gatewayResult.checkoutUrl,
          transactionId: merchantTransactionId,
          checkoutUrl: gatewayResult.checkoutUrl,
          amount: plan.amount,
          currency: plan.currency,
          planId: plan.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --------------------------------------------------------------------------
    // 2. POST /callback/sslcommerz/success: Customer Returned From Gateway
    // --------------------------------------------------------------------------
    if (path === "/callback/sslcommerz/success") {
      let bodyData: Record<string, string> = {};

      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        for (const [key, value] of formData.entries()) {
          bodyData[key] = String(value);
        }
      } else {
        bodyData = await req.json().catch(() => ({}));
      }

      const tranId = bodyData.tran_id || url.searchParams.get("tran_id") || "";
      const valId = bodyData.val_id || url.searchParams.get("val_id") || "";

      if (!tranId) {
        return Response.redirect(`${appBaseUrl}/#/payment/failed?reason=missing_transaction_id`, 303);
      }

      // Fetch transaction from database
      const { data: localTx } = await supabaseAdmin
        .from("payment_transactions")
        .select("*")
        .eq("merchant_transaction_id", tranId)
        .maybeSingle();

      if (!localTx) {
        return Response.redirect(`${appBaseUrl}/#/payment/failed?tran_id=${tranId}&reason=transaction_not_found`, 303);
      }

      // IDEMPOTENCY CHECK: If already marked success, simply redirect cleanly
      if (localTx.status === "success") {
        return Response.redirect(`${appBaseUrl}/#/payment/success?tran_id=${tranId}`, 303);
      }

      // CRITICAL: Perform Server-Side Order Validation
      // Never trust browser redirect alone without server verification!
      const verifyResult = await gateway.verifyPayment({
        validationId: valId || localTx.provider_validation_id || "",
        merchantTransactionId: tranId,
        expectedAmount: Number(localTx.amount),
        expectedCurrency: localTx.currency as "BDT",
      });

      if (verifyResult.isValid && verifyResult.status === "success") {
        await fulfillPayment(
          tranId,
          valId || verifyResult.validationId || "",
          verifyResult.providerTransactionId || "",
          verifyResult.paymentMethod || "UNKNOWN",
          verifyResult.rawResponse || bodyData
        );

        return Response.redirect(`${appBaseUrl}/#/payment/success?tran_id=${tranId}`, 303);
      } else {
        // Validation failed (amount mismatch, currency mismatch, or invalid status)
        await supabaseAdmin
          .from("payment_transactions")
          .update({
            status: "failed",
            failure_reason: verifyResult.error || "Order validation failed with gateway",
            gateway_response: verifyResult.rawResponse || bodyData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", localTx.id)
          .in("status", ["initiated", "pending", "processing"]);

        return Response.redirect(`${appBaseUrl}/#/payment/failed?tran_id=${tranId}&reason=validation_failed`, 303);
      }
    }

    // --------------------------------------------------------------------------
    // 3. POST /callback/sslcommerz/fail: Payment Failed Callback
    // --------------------------------------------------------------------------
    if (path === "/callback/sslcommerz/fail") {
      let bodyData: Record<string, string> = {};
      try {
        const formData = await req.formData();
        for (const [key, value] of formData.entries()) {
          bodyData[key] = String(value);
        }
      } catch {
        bodyData = await req.json().catch(() => ({}));
      }

      const tranId = bodyData.tran_id || url.searchParams.get("tran_id") || "";
      if (tranId) {
        // State Machine Guard: Only update if transaction is in initiated, pending, or processing state.
        // Never overwrite a transaction that has already succeeded!
        await supabaseAdmin
          .from("payment_transactions")
          .update({
            status: "failed",
            failure_reason: bodyData.error || bodyData.failedreason || "Payment failed at SSLCOMMERZ gateway",
            gateway_response: bodyData,
            updated_at: new Date().toISOString(),
          })
          .eq("merchant_transaction_id", tranId)
          .in("status", ["initiated", "pending", "processing"]);
      }

      return Response.redirect(`${appBaseUrl}/#/payment/failed?tran_id=${tranId}`, 303);
    }

    // --------------------------------------------------------------------------
    // 4. POST /callback/sslcommerz/cancel: Payment Cancelled Callback
    // --------------------------------------------------------------------------
    if (path === "/callback/sslcommerz/cancel") {
      let bodyData: Record<string, string> = {};
      try {
        const formData = await req.formData();
        for (const [key, value] of formData.entries()) {
          bodyData[key] = String(value);
        }
      } catch {
        bodyData = await req.json().catch(() => ({}));
      }

      const tranId = bodyData.tran_id || url.searchParams.get("tran_id") || "";
      if (tranId) {
        // State Machine Guard: Only update if transaction is in initiated, pending, or processing state.
        // Never overwrite a transaction that has already succeeded!
        await supabaseAdmin
          .from("payment_transactions")
          .update({
            status: "cancelled",
            failure_reason: "Customer cancelled payment on gateway page",
            gateway_response: bodyData,
            updated_at: new Date().toISOString(),
          })
          .eq("merchant_transaction_id", tranId)
          .in("status", ["initiated", "pending", "processing"]);
      }

      return Response.redirect(`${appBaseUrl}/#/payment/cancelled?tran_id=${tranId}`, 303);
    }

    // --------------------------------------------------------------------------
    // 5. POST /webhook/sslcommerz: Server-to-Server IPN (Instant Payment Notification)
    // --------------------------------------------------------------------------
    if (path === "/webhook/sslcommerz" || path === "/ipn") {
      let bodyData: Record<string, string> = {};
      const contentType = req.headers.get("content-type") || "";

      if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        for (const [key, value] of formData.entries()) {
          bodyData[key] = String(value);
        }
      } else {
        bodyData = await req.json().catch(() => ({}));
      }

      const tranId = bodyData.tran_id || "";
      const valId = bodyData.val_id || "";

      if (!tranId || !valId) {
        return new Response(JSON.stringify({ error: { code: "MISSING_PARAMS", message: "Missing tran_id or val_id in IPN" } }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { data: localTx } = await supabaseAdmin
        .from("payment_transactions")
        .select("*")
        .eq("merchant_transaction_id", tranId)
        .maybeSingle();

      if (!localTx) {
        return new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "Transaction not found" } }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // IDEMPOTENCY: If transaction is already success, acknowledge IPN without duplicate work
      if (localTx.status === "success") {
        return new Response(JSON.stringify({ success: true, message: "Transaction already processed" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Validate directly with SSLCOMMERZ
      const verifyResult = await gateway.verifyPayment({
        validationId: valId,
        merchantTransactionId: tranId,
        expectedAmount: Number(localTx.amount),
        expectedCurrency: localTx.currency as "BDT",
      });

      if (verifyResult.isValid && verifyResult.status === "success") {
        await fulfillPayment(
          tranId,
          valId,
          verifyResult.providerTransactionId || "",
          verifyResult.paymentMethod || "UNKNOWN",
          verifyResult.rawResponse || bodyData
        );

        return new Response(JSON.stringify({ success: true, status: "verified" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        await supabaseAdmin
          .from("payment_transactions")
          .update({
            status: "failed",
            failure_reason: verifyResult.error || "IPN validation failed",
            gateway_response: verifyResult.rawResponse || bodyData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", localTx.id)
          .in("status", ["initiated", "pending", "processing"]);

        return new Response(JSON.stringify({ success: false, error: { code: "VALIDATION_FAILED", message: verifyResult.error || "IPN validation failed" } }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // --------------------------------------------------------------------------
    // 6. GET /status: Query Transaction Status
    // --------------------------------------------------------------------------
    // --------------------------------------------------------------------------
    // 6. GET /status or GET /:id: Query Transaction Status
    // --------------------------------------------------------------------------
    const singleIdMatch = path.match(/^\/([a-zA-Z0-9_-]+)$/);
    const isSingleIdRoute = singleIdMatch && !["create", "create-payment", "callback", "webhook", "ipn", "status", "payment-status", "entitlements", "my-entitlement", "reconcile"].includes(singleIdMatch[1]);

    if (path === "/status" || path === "/payment-status" || isSingleIdRoute) {
      if (req.method !== "GET") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const user = await getAuthenticatedUser(req);
      if (!user) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized: Missing or invalid Supabase JWT." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const txId = (isSingleIdRoute ? singleIdMatch[1] : null) || url.searchParams.get("transactionId") || url.searchParams.get("tran_id") || url.searchParams.get("id") || "";
      if (!txId) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing required parameter: transactionId or id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch transaction strictly belonging to this authenticated user
      const { data: tx, error: fetchErr } = await supabaseAdmin
        .from("payment_transactions")
        .select("*")
        .or(`merchant_transaction_id.eq.${txId},id.eq.${txId}`)
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchErr || !tx) {
        return new Response(
          JSON.stringify({ success: false, error: "Transaction not found or unauthorized." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          paymentId: tx.id,
          transactionId: tx.merchant_transaction_id,
          status: tx.status,
          planId: tx.plan_id,
          amount: tx.amount,
          currency: tx.currency,
          provider: tx.provider,
          paymentMethod: tx.payment_method,
          createdAt: tx.created_at,
          verifiedAt: tx.verified_at,
          failureReason: tx.failure_reason,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --------------------------------------------------------------------------
    // 7. GET /entitlements: Query Verified User Entitlements
    // --------------------------------------------------------------------------
    if (path === "/entitlements" || path === "/my-entitlement") {
      if (req.method !== "GET") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const user = await getAuthenticatedUser(req);
      if (!user) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized: Missing or invalid Supabase JWT." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Query active subscription from database where expiration date is in the future
      const now = new Date().toISOString();
      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .select("plan_id, status, expires_at, current_period_end, amount_bdt, provider, payment_provider")
        .eq("user_id", user.id)
        .eq("status", "active")
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const activePlan = sub?.plan_id || "Free";

      return new Response(
        JSON.stringify({
          success: true,
          userId: user.id,
          plan: activePlan,
          tier: activePlan,
          status: sub?.status || "active",
          expiresAt: sub?.expires_at || sub?.current_period_end,
          provider: sub?.provider || sub?.payment_provider || "sslcommerz",
          features: {
            canAccessFullMatching: ["Explorer", "Application", "Complete", "School"].includes(activePlan),
            canAccessApplicationHub: ["Application", "Complete", "School"].includes(activePlan),
            canAccessDocumentVault: ["Application", "Complete", "School"].includes(activePlan),
            canAccessSopAssistant: ["Application", "Complete", "School"].includes(activePlan),
            canAccessRoadmap: ["Complete", "School"].includes(activePlan),
            canAccessSchoolPortal: activePlan === "School",
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --------------------------------------------------------------------------
    // 8. POST /reconcile: Stale Payment Transaction Reconciliation (P1-07)
    // --------------------------------------------------------------------------
    if (path === "/reconcile") {
      if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" } }), {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Authorization: Bearer token must match service role or an admin user
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      const isServiceRole = Boolean(supabaseServiceKey) && token === supabaseServiceKey;
      let isAdmin = false;

      if (!isServiceRole) {
        const user = await getAuthenticatedUser(req);
        if (user) {
          const { data: roleRow } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .eq("active", true)
            .maybeSingle();
          if (roleRow) {
            isAdmin = true;
          }
        }
      }

      if (!isServiceRole && !isAdmin) {
        return new Response(
          JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Service role or admin authorization required for reconciliation." } }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Query stale transactions in initiated, pending, or processing status older than 5 minutes
      const { data: staleTxs, error: staleErr } = await supabaseAdmin
        .from("payment_transactions")
        .select("*")
        .in("status", ["initiated", "pending", "processing"])
        .lt("created_at", fiveMinutesAgo)
        .order("created_at", { ascending: true })
        .limit(50);

      if (staleErr) {
        console.error(`[Reconcile DB Error [${requestId}]]:`, staleErr.message);
        return new Response(
          JSON.stringify({ error: { code: "DB_ERROR", message: "Failed to query stale transactions." } }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results: Array<{
        transactionId: string;
        previousStatus: string;
        newStatus: string;
        action: string;
        error?: string;
      }> = [];

      for (const tx of staleTxs || []) {
        try {
          const valId = tx.provider_validation_id || "";
          const tranId = tx.merchant_transaction_id;

          if (valId || tranId) {
            const verifyResult = await gateway.verifyPayment({
              validationId: valId,
              merchantTransactionId: tranId,
              expectedAmount: Number(tx.amount),
              expectedCurrency: tx.currency as "BDT",
            });

            if (verifyResult.isValid && verifyResult.status === "success") {
              await fulfillPayment(
                tranId,
                valId || verifyResult.validationId || "",
                verifyResult.providerTransactionId || "",
                verifyResult.paymentMethod || "UNKNOWN",
                verifyResult.rawResponse || {}
              );

              results.push({
                transactionId: tranId,
                previousStatus: tx.status,
                newStatus: "success",
                action: "FULFILLED",
              });
              continue;
            } else if (verifyResult.status === "failed") {
              await supabaseAdmin
                .from("payment_transactions")
                .update({
                  status: "failed",
                  failure_reason: verifyResult.error || "Reconciliation determined payment failed at gateway",
                  gateway_response: redactGatewayResponse(verifyResult.rawResponse || {}),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", tx.id)
                .in("status", ["initiated", "pending", "processing"]);

              results.push({
                transactionId: tranId,
                previousStatus: tx.status,
                newStatus: "failed",
                action: "MARKED_FAILED",
              });
              continue;
            }
          }

          // If older than 24 hours without resolution, transition to expired
          if (tx.created_at < twentyFourHoursAgo) {
            await supabaseAdmin
              .from("payment_transactions")
              .update({
                status: "expired",
                failure_reason: "Transaction expired after 24h without gateway completion",
                updated_at: new Date().toISOString(),
              })
              .eq("id", tx.id)
              .in("status", ["initiated", "pending", "processing"]);

            results.push({
              transactionId: tx.merchant_transaction_id,
              previousStatus: tx.status,
              newStatus: "expired",
              action: "EXPIRED_STALE",
            });
          } else {
            results.push({
              transactionId: tx.merchant_transaction_id,
              previousStatus: tx.status,
              newStatus: tx.status,
              action: "PENDING_RETRY",
            });
          }
        } catch (err: any) {
          console.error(`[Reconcile Error on ${tx.merchant_transaction_id}]:`, err?.message);
          results.push({
            transactionId: tx.merchant_transaction_id,
            previousStatus: tx.status,
            newStatus: tx.status,
            action: "ERROR",
            error: err?.message,
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          requestId,
          reconciledCount: results.length,
          fulfilledCount: results.filter(r => r.action === "FULFILLED").length,
          expiredCount: results.filter(r => r.action === "EXPIRED_STALE").length,
          results,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId } }
      );
    }

    // 404 for unknown endpoints
    return new Response(JSON.stringify({ error: `Not found: ${path}` }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[Payments Edge Function Unhandled Exception]:", err?.message || err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal payment gateway error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
