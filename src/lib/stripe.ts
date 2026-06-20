import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return _stripe;
}

// Re-export as `stripe` for convenience — lazy-initialized to avoid
// build-time errors when STRIPE_SECRET_KEY isn't set.
export const stripe = new Proxy({} as Stripe, {
  get(_, prop: string | symbol) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getStripe() as any)[prop];
  },
});

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID!;
