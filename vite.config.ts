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
            const tier = devSubscriptions.get(userId)?.tier || 'Explorer';

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

      // Dev Checkout Handler (bKash sandbox fallback)
      server.middlewares.use('/api/checkout', (req, res) => {
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
        req.on('data', chunk => {
          body += chunk;
        });

        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json');
          try {
            const { tier, userId } = JSON.parse(body || '{}');
            const sessionId = `sub_dev_${Date.now()}`;
            devSubscriptions.set(userId || 'current-user', { tier, status: 'active', sessionId });

            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: true,
                isSandbox: true,
                sessionId,
                // SECURITY: Never include ?tier=... in checkout return URL
                checkoutUrl: `/?session_id=${sessionId}&checkout_success=true`,
                message: 'Local sandbox checkout session created.',
              })
            );
          } catch (err: any) {
            console.error('[Dev Checkout Error]:', err?.message || err);
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: 'Checkout session creation failed' }));
          }
        });
      });

      // bKash Create Payment Endpoint
      server.middlewares.use('/api/bkash/create', (req, res) => {
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
          try {
            const { planId } = JSON.parse(body || '{}');
            const bdtPrices: Record<string, number> = {
              Free: 0,
              Explorer: 1490,
              Application: 3990,
              Complete: 7990,
              School: 19990,
            };
            const amount = bdtPrices[planId] ?? 1490;
            const paymentId = `BK_PAY_${Date.now()}`;
            const merchantInvoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

            res.statusCode = 200;
            res.end(JSON.stringify({
              success: true,
              paymentId,
              merchantInvoiceNumber,
              amount,
              currency: 'BDT',
              merchantAccountNumber: '01844-556677',
            }));
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: 'Invalid create payment request' }));
          }
        });
      });

      // bKash Verify Payment Endpoint
      server.middlewares.use('/api/bkash/verify', (req, res) => {
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
          try {
            const { paymentId, trxId, userId, planId } = JSON.parse(body || '{}');
            const cleanedTrx = (trxId || '').trim().toUpperCase();

            if (!/^[A-Z0-9]{8,12}$/.test(cleanedTrx)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: 'Invalid TrxID format' }));
              return;
            }

            const targetTier = planId || 'Explorer';
            devSubscriptions.set(userId || 'current-user', { tier: targetTier, status: 'active', sessionId: paymentId });

            res.statusCode = 200;
            res.end(JSON.stringify({
              success: true,
              transaction: {
                paymentId,
                trxId: cleanedTrx,
                status: 'completed',
                planId: targetTier,
              }
            }));
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: 'Invalid verify payment request' }));
          }
        });
      });

      // Dev Entitlements Handler
      server.middlewares.use('/api/entitlements', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const url = new URL(req.url || '', 'http://localhost');
        const userId = url.searchParams.get('userId') || 'current-user';
        const sub = devSubscriptions.get(userId);
        const activeTier = sub?.tier || 'Explorer';

        res.statusCode = 200;
        res.end(
          JSON.stringify({
            success: true,
            userId,
            tier: activeTier,
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
      });
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
