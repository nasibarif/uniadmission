import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// Daily request limits per subscription tier
const TIER_DAILY_LIMITS: Record<string, number> = {
  Free: 5,
  Explorer: 25,
  Application: 100,
  Complete: 250,
  School: 1000,
};

// Security headers applied to dev & preview server responses
const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'X-XSS-Protection': '1; mode=block',
};

// Allowed AI actions and models whitelist
const ALLOWED_ACTIONS = new Set(['counselor', 'sop', 'critique', 'cv', 'general']);
const ALLOWED_MODELS = new Set(['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash']);
const MAX_PROMPT_CHARS = 30000;

// Rate limit trackers: daily usage & 60-second sliding burst window
const localUsageTracker = new Map<string, { count: number; date: string }>();
const burstTracker = new Map<string, number[]>(); // userId -> array of timestamps in ms

function localRateCheck(userId: string, tier: string): { allowed: boolean; remaining: number; limit: number; error?: string } {
  const now = Date.now();

  // 1. Sliding window burst limit: max 10 requests per 60 seconds
  const recentRequests = (burstTracker.get(userId) || []).filter(t => now - t < 60000);
  if (recentRequests.length >= 10) {
    return {
      allowed: false,
      remaining: 0,
      limit: 10,
      error: 'Too many requests in a short time. Please wait a minute before sending another prompt (Burst limit exceeded).',
    };
  }

  // 2. Daily tier-based limit
  const today = new Date().toISOString().split('T')[0];
  const limit = TIER_DAILY_LIMITS[tier] || TIER_DAILY_LIMITS.Explorer;
  const record = localUsageTracker.get(userId);

  if (!record || record.date !== today) {
    localUsageTracker.set(userId, { count: 1, date: today });
    recentRequests.push(now);
    burstTracker.set(userId, recentRequests);
    return { allowed: true, remaining: limit - 1, limit };
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      limit,
      error: `Daily AI usage limit reached (${limit} requests/day on ${tier} plan).`,
    };
  }

  record.count += 1;
  recentRequests.push(now);
  burstTracker.set(userId, recentRequests);

  return { allowed: true, remaining: limit - record.count, limit };
}

/**
 * Local AI Gateway & Security Middleware plugin for Vite development server.
 * Injects security headers and handles /api/ai endpoints using server-side GEMINI_API_KEY.
 */
function localSecurityAndGatewayPlugin(): Plugin {
  return {
    name: 'local-security-gateway',
    configureServer(server) {
      const devSubscriptions = new Map<string, { tier: string; status: string; sessionId: string }>();

      // Global middleware to apply security headers to all HTTP responses
      server.middlewares.use((_req, res, next) => {
        for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
          res.setHeader(key, value);
        }
        next();
      });

      // AI Gateway Endpoint
      server.middlewares.use('/api/ai', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk;
          // Guard against payload bombs on the raw stream (max 1MB payload)
          if (body.length > 1024 * 1024) {
            res.statusCode = 413;
            res.end(JSON.stringify({ success: false, error: 'Request body is too large' }));
            req.destroy();
          }
        });

        req.on('end', async () => {
          const startTime = Date.now();
          res.setHeader('Content-Type', 'application/json');

          try {
            const apiKey = process.env.GEMINI_API_KEY || '';
            if (!apiKey) {
              res.statusCode = 503;
              res.end(
                JSON.stringify({
                  success: false,
                  error: 'AI Gateway is offline. GEMINI_API_KEY is not configured on the server.',
                })
              );
              return;
            }

            const payload = JSON.parse(body || '{}');
            const action = payload.action || 'general';

            // Derive user identity and tier strictly on the server from session / dev subscriptions
            const authHeader = (req.headers['authorization'] as string) || '';
            const userId = authHeader.replace(/^Bearer\s+/i, '') || 'current-user';
            const tier = devSubscriptions.get(userId)?.tier || 'Free';

            // Server-side Input Validation
            if (!ALLOWED_ACTIONS.has(action)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: `Invalid action specified: ${action}` }));
              return;
            }

            const model = payload.model || 'gemini-2.5-flash';
            if (!ALLOWED_MODELS.has(model)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: `Invalid model requested: ${model}` }));
              return;
            }

            const contents = payload.contents || [];
            const contentsJson = JSON.stringify(contents);
            if (contentsJson.length > MAX_PROMPT_CHARS) {
              res.statusCode = 400;
              res.end(
                JSON.stringify({
                  success: false,
                  error: `Input prompt exceeds the maximum allowed character limit (${MAX_PROMPT_CHARS} characters).`,
                })
              );
              return;
            }

            // Rate limits (burst + daily tier limit)
            const rate = localRateCheck(userId, tier);
            if (!rate.allowed) {
              res.statusCode = 429;
              res.end(
                JSON.stringify({
                  success: false,
                  error: rate.error || 'Rate limit exceeded.',
                  remainingQuota: 0,
                  limit: rate.limit,
                  tier,
                })
              );
              return;
            }

            const upstream = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents }),
              }
            );

            const latency = Date.now() - startTime;

            if (!upstream.ok) {
              const errData: any = await upstream.json().catch(() => ({}));
              console.error(`[Dev AI Gateway Error] Action: ${action} | Status: ${upstream.status} | Latency: ${latency}ms`);
              res.statusCode = upstream.status;
              res.end(
                JSON.stringify({
                  success: false,
                  error: errData.error?.message ? 'AI processing error. Please try again shortly.' : `Upstream error ${upstream.status}`,
                })
              );
              return;
            }

            const data: any = await upstream.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const tokens = data.usageMetadata?.totalTokenCount || 0;

            console.log(`[Dev AI Gateway] Action: ${action} | Model: ${model} | Tokens: ${tokens} | Latency: ${latency}ms | OK`);

            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: true,
                text,
                remainingQuota: rate.remaining,
                limit: rate.limit,
                tier,
              })
            );
          } catch (err: any) {
            console.error('[Dev AI Gateway Exception]:', err?.message || err);
            res.statusCode = 500;
            // Never expose raw stack trace or server internals to the client
            res.end(JSON.stringify({ success: false, error: 'An unexpected internal error occurred. Please try again.' }));
          }
        });
      });

      // Secure Dev Payment Gateway Handlers (Mocking /payments Edge Function for local dev)
      const devPaymentTransactions = new Map<string, any>();

      // POST /api/payments/create
      server.middlewares.use('/api/payments/create', (req, res) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          try {
            const { planId } = JSON.parse(body || '{}');
            const bdtPrices: Record<string, number> = {
              Free: 0,
              Explorer: 1490,
              Application: 3990,
              Complete: 7990,
              School: 19990,
            };

            if (!planId || !bdtPrices[planId] || planId === 'Free') {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: 'Invalid or unpaid subscription plan.' }));
              return;
            }

            const amount = bdtPrices[planId];
            const merchantTransactionId = `UA_DEV_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

            devPaymentTransactions.set(merchantTransactionId, {
              merchantTransactionId,
              planId,
              amount,
              currency: 'BDT',
              status: 'success', // Dev sandbox auto-completes on redirect
              createdAt: new Date().toISOString(),
              verifiedAt: new Date().toISOString(),
              paymentMethod: 'SSLCOMMERZ-DevSandbox',
            });

            devSubscriptions.set('current-user', { tier: planId, status: 'active', sessionId: merchantTransactionId });

            res.statusCode = 200;
            res.end(JSON.stringify({
              success: true,
              provider: 'sslcommerz',
              paymentId: merchantTransactionId,
              gatewayUrl: `/#/payment/success?tran_id=${merchantTransactionId}`,
              transactionId: merchantTransactionId,
              checkoutUrl: `/#/payment/success?tran_id=${merchantTransactionId}`,
              amount,
              currency: 'BDT',
              planId,
            }));
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: 'Invalid create payment request payload.' }));
          }
        });
      });

      // GET /api/payments/status and GET /api/payments/:id
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url || '', 'http://localhost');
        const match = url.pathname.match(/^\/api\/payments\/([a-zA-Z0-9_-]+)$/);
        const isStatusUrl = url.pathname === '/api/payments/status';

        if (isStatusUrl || (match && !['create', 'entitlements'].includes(match[1]))) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');

          const txId = (match && match[1] !== 'status' ? match[1] : null) || 
                       url.searchParams.get('transactionId') || 
                       url.searchParams.get('tran_id') || 
                       url.searchParams.get('id') || '';

          const tx = devPaymentTransactions.get(txId);
          if (tx) {
            res.statusCode = 200;
            res.end(JSON.stringify({
              success: true,
              paymentId: tx.merchantTransactionId,
              transactionId: tx.merchantTransactionId,
              status: tx.status,
              planId: tx.planId,
              amount: tx.amount,
              currency: tx.currency,
              provider: 'sslcommerz',
              paymentMethod: tx.paymentMethod,
              createdAt: tx.createdAt,
              verifiedAt: tx.verifiedAt,
            }));
            return;
          }

          // Strict security: Unknown transaction IDs return 404 (never fake success)
          res.statusCode = 404;
          res.end(JSON.stringify({
            success: false,
            error: 'Transaction not found in development session store.',
          }));
          return;
        }
        next();
      });

      // Dev Entitlements Handler
      const handleEntitlements = (req: any, res: any) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const url = new URL(req.url || '', 'http://localhost');
        const userId = url.searchParams.get('userId') || 'current-user';
        const sub = devSubscriptions.get(userId);
        const activeTier = sub?.tier || 'Free';

        res.statusCode = 200;
        res.end(
          JSON.stringify({
            success: true,
            userId,
            tier: activeTier,
            plan: activeTier,
            status: sub?.status || 'active',
            features: {
              canAccessFullMatching: ['Explorer', 'Application', 'Complete', 'School'].includes(activeTier),
              canAccessApplicationHub: ['Application', 'Complete', 'School'].includes(activeTier),
              canAccessDocumentVault: ['Application', 'Complete', 'School'].includes(activeTier),
              canAccessSopAssistant: ['Application', 'Complete', 'School'].includes(activeTier),
              canAccessRoadmap: ['Complete', 'School'].includes(activeTier),
            },
          })
        );
      };

      server.middlewares.use('/api/payments/entitlements', handleEntitlements);
      server.middlewares.use('/api/entitlements', handleEntitlements);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localSecurityAndGatewayPlugin()],
  server: {
    headers: SECURITY_HEADERS,
    watch: {
      ignored: ['**/*.zip', '**/dist/**', '**/.git/**', '**/tmp/**', '**/*.log'],
    },
  },
  preview: {
    headers: SECURITY_HEADERS,
  },
});
