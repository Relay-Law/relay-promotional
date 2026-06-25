import { getStripe } from "@/lib/stripe";
import { getFirmByLicenseKey, saveFirm } from "@/lib/store";

/**
 * "Deploy" a firm = start its trialing Stripe subscription. This is the same logic the internal
 * activation hook (POST /api/admin/activate) has always run by hand the day a box goes live; it's
 * extracted here so the ops dashboard can call it directly server-side too.
 *
 * Idempotent: if the firm already has a subscription, returns { alreadyActive: true } and changes
 * nothing. The Stripe webhook then keeps the firm record in sync; the box picks up the new
 * entitlement on its next /api/license/validate poll.
 */
export type ActivateResult =
  | { ok: true; alreadyActive: true; subscriptionId: string; status: string }
  | {
      ok: true;
      alreadyActive: false;
      subscriptionId: string;
      status: string;
      trialEnd: number | null;
      seats: number;
    };

export class ActivateError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ActivateError";
  }
}

export async function activateFirm(licenseKey: string): Promise<ActivateResult> {
  const key = licenseKey.trim();
  if (!key) throw new ActivateError("licenseKey required", 400);

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) throw new ActivateError("STRIPE_PRICE_ID not configured", 500);

  const firm = await getFirmByLicenseKey(key);
  if (!firm) throw new ActivateError("unknown license key", 404);

  // Idempotent: if already activated, just report the existing subscription.
  if (firm.subscriptionId) {
    return {
      ok: true,
      alreadyActive: true,
      subscriptionId: firm.subscriptionId,
      status: firm.status,
    };
  }

  const trialDays = Number(process.env.STRIPE_TRIAL_DAYS ?? "14");

  try {
    const subscription = await getStripe().subscriptions.create({
      customer: firm.stripeCustomerId,
      items: [{ price: priceId, quantity: firm.seats }],
      trial_period_days: trialDays > 0 ? trialDays : undefined,
      // licenseKey lets the webhook merge this back into the existing firm record.
      metadata: { licenseKey: key },
      // If the card ever fails after the trial, cancel rather than dunning forever.
      trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
    });

    const item = subscription.items.data[0];
    await saveFirm({
      ...firm,
      subscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: item?.current_period_end ?? 0,
      activatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return {
      ok: true,
      alreadyActive: false,
      subscriptionId: subscription.id,
      status: subscription.status,
      trialEnd: subscription.trial_end,
      seats: firm.seats,
    };
  } catch (err) {
    if (err instanceof ActivateError) throw err;
    console.error("[activate] Stripe error:", err);
    throw new ActivateError("Could not activate subscription", 502);
  }
}
