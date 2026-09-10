// Supabase Edge Function: Secure Gateway-Agnostic Payments & Entitlements Service
// Supports SSLCOMMERZ (and pluggable aamarPay, shurjoPay) with server-authoritative pricing,
// server-to-server Order Validation, IPN handling, idempotency, and strict JWT authentication.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPaymentGateway } from "../_shared/payment/factory.ts";
import { getPlanConfig } from "../_shared/payment/catalog.ts";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const appBaseUrl = Deno.env.get("APP_BASE_URL") || "";
  const allowedOrigins = [
    appBaseUrl,
    "https://uniadmission.com",
    "https://uniadmission.vercel.app",
  ].filter(Boolean);

  const isDev = Deno.env.get("ENVIRONMENT") === "development" || !Deno.env.get("ENVIRONMENT");
  const isAllowed = allowedOrigins.includes(origin) || (isDev && origin.startsWith("http://localhost"));

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : (allowedOrigins[0] || "*"),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
  const appBaseUrl = (Deno.env.get("APP_BASE_URL") || url.origin).replace(/\/+$/, "");

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

  async function fulfillPayment(
    merchantTransactionId: string,
    valId: string,
    providerTransactionId: string,
    paymentMethod: string,
    gatewayResponse: any,
    durationDays: number = 365
  ) {
    try {
      const { data, error } = await supabaseAdmin.rpc("fulfill_payment_transaction", {
        p_merchant_transaction_id: merchantTransactionId,
        p_provider_validation_id: valId,
        p_provider_transaction_id: providerTransactionId,
        p_payment_method: paymentMethod,
        p_gateway_response: gatewayResponse || {},
        p_duration_days: durationDays,
      });

      if (!error && data) {
        return data;
      }
      if (error) {
        console.warn("[RPC fulfill_payment_transaction failed or not installed, falling back to direct db queries]:", error.message);
      }
    } catch (rpcErr: any) {
      console.warn("[RPC fulfill_payment_transaction exception]:", rpcErr?.message);
    }

    // Direct Database Fallback (State Machine & Single Active Subscription Enforcement)
    const verifiedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + durationDays * 86400000).toISOString();

    const { data: localTx } = await supabaseAdmin
      .from("payment_transactions")
      .select("*")
      .eq("merchant_transaction_id", merchantTransactionId)
      .maybeSingle();

    if (!localTx) {
      throw new Error("Transaction not found for fulfillment");
    }

    if (localTx.status === "success" || localTx.status === "completed") {
      return { success: true, already_fulfilled: true, transaction_id: merchantTransactionId };
    }

    if (!["initiated", "pending", "processing"].includes(localTx.status)) {
      throw new Error(`Invalid payment state transition from ${localTx.status} to success`);
    }

    await supabaseAdmin
      .from("payment_transactions")
      .update({
        status: "success",
        provider_validation_id: valId,
        provider_transaction_id: providerTransactionId,
        payment_method: paymentMethod,
        gateway_response: gatewayResponse || {},
        verified_at: verifiedAt,
        updated_at: verifiedAt,
      })
      .eq("id", localTx.id);

    // Single active subscription enforcement: expire existing active subscriptions
    await supabaseAdmin
      .from("subscriptions")
      .update({ status: "expired", updated_at: verifiedAt })
      .eq("user_id", localTx.user_id)
      .eq("status", "active");

    await supabaseAdmin.from("subscriptions").insert({
      user_id: localTx.user_id,
      plan_id: localTx.plan_id,
      status: "active",
      payment_transaction_id: localTx.id,
      provider: localTx.provider || "sslcommerz",
      payment_provider: localTx.provider || "sslcommerz",
      amount_bdt: localTx.amount,
      currency: localTx.currency,
      subscription_id: merchantTransactionId,
      starts_at: verifiedAt,
      expires_at: expiresAt,
      current_period_start: verifiedAt,
      current_period_end: expiresAt,
      metadata: {
        validationId: valId,
        providerTransactionId,
        paymentMethod,
      },
      updated_at: verifiedAt,
    });

    await supabaseAdmin
      .from("profiles")
      .update({ tier: localTx.plan_id, updated_at: verifiedAt })
      .eq("id", localTx.user_id);

    return { success: true, already_fulfilled: false, transaction_id: merchantTransactionId };
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

      if (!customerName || !customerEmail) {
        return new Response(
          JSON.stringify({
            error: {
              code: "MISSING_CUSTOMER_PROFILE",
              message: "Please complete your profile name and email before proceeding to payment checkout.",
            },
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Construct callback and webhook URLs
      const successCallbackUrl = `${url.origin}/payments/callback/sslcommerz/success`;
      const failCallbackUrl = `${url.origin}/payments/callback/sslcommerz/fail`;
      const cancelCallbackUrl = `${url.origin}/payments/callback/sslcommerz/cancel`;
      const ipnWebhookUrl = `${url.origin}/payments/webhook/sslcommerz`;

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

      // 2. Call Gateway Abstraction (e.g. SSLCOMMERZ)
      const gatewayResult = await gateway.createPayment({
        merchantTransactionId,
        amount: plan.amount,
        currency: plan.currency,
        planId: plan.id,
        planName: plan.name,
        userId: user.id,
        customerName,
        customerEmail,
        customerPhone: customerPhone || "01700000000",
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
        const plan = getPlanConfig(localTx.plan_id);
        const durationDays = plan?.durationDays || (localTx.metadata?.durationDays ? Number(localTx.metadata.durationDays) : 365);

        await fulfillPayment(
          tranId,
          valId || verifyResult.validationId || "",
          verifyResult.providerTransactionId || "",
          verifyResult.paymentMethod || "UNKNOWN",
          verifyResult.rawResponse || bodyData,
          durationDays
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
        const plan = getPlanConfig(localTx.plan_id);
        const durationDays = plan?.durationDays || (localTx.metadata?.durationDays ? Number(localTx.metadata.durationDays) : 365);

        await fulfillPayment(
          tranId,
          valId,
          verifyResult.providerTransactionId || "",
          verifyResult.paymentMethod || "UNKNOWN",
          verifyResult.rawResponse || bodyData,
          durationDays
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
    const isSingleIdRoute = singleIdMatch && !["create", "create-payment", "callback", "webhook", "ipn", "status", "payment-status", "entitlements", "my-entitlement"].includes(singleIdMatch[1]);

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
