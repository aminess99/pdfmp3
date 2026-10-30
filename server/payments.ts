// Buying listening minutes with Dodo Payments (hosted checkout, so card details never
// touch this site). Configuration, all on the server (Render → Environment):
//   DODO_PAYMENTS_API_KEY        API key (Dodo dashboard → Developer → API Keys)
//   DODO_PAYMENTS_WEBHOOK_KEY    signing secret of the webhook pointing at /api/webhooks/dodo
//   DODO_PAYMENTS_ENVIRONMENT    live_mode (default) or test_mode
//   DODO_PRODUCT_STARTER / DODO_PRODUCT_POPULAR / DODO_PRODUCT_MASTER   product IDs (pdt_...)
import DodoPayments from 'dodopayments';

// Same plans as the pricing section (src/components/PricingSection.tsx)
export const PLANS: Record<string, { minutes: number; productEnv: string }> = {
  starter: { minutes: 333, productEnv: 'DODO_PRODUCT_STARTER' },
  popular: { minutes: 666, productEnv: 'DODO_PRODUCT_POPULAR' },
  master: { minutes: 1450, productEnv: 'DODO_PRODUCT_MASTER' },
};

const productId = (plan: string): string | undefined => process.env[PLANS[plan]?.productEnv || '']?.trim() || undefined;

let client: DodoPayments | null | undefined;
function dodo(): DodoPayments | null {
  if (client !== undefined) return client;
  const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
  if (!apiKey) {
    console.warn('[payments] DODO_PAYMENTS_API_KEY is not set: checkout is disabled');
    return (client = null);
  }
  const environment = process.env.DODO_PAYMENTS_ENVIRONMENT === 'test_mode' ? 'test_mode' : 'live_mode';
  client = new DodoPayments({ bearerToken: apiKey, environment, webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim() || null });
  const missing = Object.keys(PLANS).filter((p) => !productId(p));
  console.log(`[payments] Dodo ${environment}` + (missing.length ? `; no product ID for: ${missing.join(', ')}` : '; all plans configured'));
  return client;
}

export const paymentsEnabled = (): boolean => dodo() !== null;
export const planAvailable = (plan: string): boolean => Boolean(PLANS[plan] && productId(plan));

export async function createCheckout(plan: string, uid: string, email: string | undefined, siteUrl: string): Promise<string> {
  const api = dodo();
  const product = productId(plan);
  if (!api || !product) throw new Error('payments not configured');
  const session = await api.checkoutSessions.create({
    product_cart: [{ product_id: product, quantity: 1 }],
    ...(email ? { customer: { email } } : {}),
    return_url: `${siteUrl}/?payment=success`,
    // Read back in the webhook to know whom to credit
    metadata: { uid, plan },
  });
  if (!session.checkout_url) throw new Error('no checkout url');
  return session.checkout_url;
}

// Verifies the Standard Webhooks signature; throws when it does not match
export function verifyWebhook(rawBody: string, headers: Record<string, string>) {
  const api = dodo();
  if (!api) throw new Error('payments not configured');
  if (!process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim()) throw new Error('DODO_PAYMENTS_WEBHOOK_KEY is not set');
  return api.webhooks.unwrap(rawBody, { headers });
}

// The plan a successful payment pays for, checked against the products actually bought
export function paidPlan(payment: { metadata?: Record<string, string> | null; product_cart?: Array<{ product_id: string }> | null }): string | null {
  const plan = payment.metadata?.plan;
  if (!plan || !PLANS[plan]) return null;
  const bought = (payment.product_cart || []).map((p) => p.product_id);
  return bought.includes(productId(plan) || '') ? plan : null;
}
