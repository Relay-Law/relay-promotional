import Stripe from "stripe";

// Singleton — reused across warm invocations of the same serverless instance.
let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    // apiVersion intentionally omitted — uses the version pinned to the installed SDK.
    stripe = new Stripe(key);
  }
  return stripe;
}
