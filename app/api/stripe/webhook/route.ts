import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { sendSignupConfirmation } from "@/lib/email";
import {
  FirmRecord,
  LeaseRecord,
  generateLicenseKey,
  getFirmByLicenseKey,
  getLease,
  getLicenseKeyByCustomer,
  getLicenseKeyBySubscription,
  saveFirm,
  saveLease,
} from "@/lib/store";

const isLease = (meta: Stripe.Metadata | null | undefined) => meta?.type === "hardware_lease";

// Stripe signature verification needs the raw, unparsed body and Node crypto.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The heart of the system: Stripe calls us when something happens, and we turn
 * "they paid / changed / cancelled" into "create / refresh / expire their license record".
 * The signed license itself is minted on demand in /api/license/validate.
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "setup") {
          // Signup card capture — persist the saved card as the customer's default so the
          // activation subscription (and lease) can charge it later, off-session.
          await setDefaultPaymentMethod(session);
          // Friendly "we'll reach out in 3 business days" confirmation (Stripe sends nothing here,
          // since no charge happens in setup mode).
          await sendSetupConfirmation(session);
        } else if (session.mode === "subscription" && session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
          if (isLease(session.metadata) || isLease(subscription.metadata)) {
            await handleLeaseCheckout(subscription);
          } else {
            await upsertFromSubscription(subscription);
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        if (isLease(subscription.metadata)) {
          await recordLeaseStatus(subscription);
        } else {
          await upsertFromSubscription(subscription);
        }
        break;
      }
      default:
        // Ignore other event types — they don't affect entitlement.
        break;
    }
  } catch (err) {
    console.error(`[webhook] Failed handling ${event.type}:`, err);
    // 500 tells Stripe to retry — important so we don't silently drop fulfillment.
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/** Set the customer's default payment method from a completed `setup`-mode Checkout session. */
async function setDefaultPaymentMethod(session: Stripe.Checkout.Session): Promise<void> {
  if (!session.customer || !session.setup_intent) return;
  const stripe = getStripe();
  const setupIntentId =
    typeof session.setup_intent === "string" ? session.setup_intent : session.setup_intent.id;
  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
  const pm = setupIntent.payment_method;
  if (!pm) return;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: typeof pm === "string" ? pm : pm.id },
  });
  console.log(`[webhook] Saved default card for customer ${customerId}`);
}

/** Send the signup confirmation email after a completed setup-mode checkout. */
async function sendSetupConfirmation(session: Stripe.Checkout.Session): Promise<void> {
  if (!session.customer) return;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;
  const key = await getLicenseKeyByCustomer(customerId);
  const firm = key ? await getFirmByLicenseKey(key) : null;
  const to = firm?.email ?? session.customer_details?.email ?? undefined;
  if (to) await sendSignupConfirmation(to, { seats: firm?.seats });
}

/**
 * Create-or-update the firm record from a Stripe subscription. The license key is resolved in
 * priority order so an activation subscription merges into the pending firm created at signup
 * (rather than minting a second one): subscription metadata → existing sub index → customer index.
 */
async function upsertFromSubscription(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  // In current Stripe API versions, quantity and current_period_end live on the
  // subscription ITEM, not the subscription itself.
  const item = subscription.items.data[0];
  const seats = item?.quantity ?? 1;

  const licenseKey =
    subscription.metadata?.licenseKey ||
    (await getLicenseKeyBySubscription(subscription.id)) ||
    (await getLicenseKeyByCustomer(customerId)) ||
    generateLicenseKey();

  const existing = await getFirmByLicenseKey(licenseKey);

  const record: FirmRecord = {
    ...existing,
    licenseKey,
    stripeCustomerId: customerId,
    subscriptionId: subscription.id,
    seats,
    status: subscription.status,
    currentPeriodEnd: item?.current_period_end ?? 0,
    updatedAt: new Date().toISOString(),
  };

  await saveFirm(record);
  console.log(
    `[webhook] Firm ${licenseKey.slice(0, 16)}… → status=${subscription.status} seats=${seats}`,
  );
}

/** Build a LeaseRecord from a subscription's metadata (set at checkout). */
function leaseFromSubscription(subscription: Stripe.Subscription, scheduleId?: string): LeaseRecord {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const m = subscription.metadata ?? {};
  return {
    subscriptionId: subscription.id,
    scheduleId,
    stripeCustomerId: customerId,
    hardwareCents: Number(m.hardwareCents ?? 0),
    monthlyCents: Number(m.monthlyCents ?? 0),
    months: Number(m.months ?? 0),
    rate: Number(m.rate ?? 0),
    status: subscription.status,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * On lease checkout, convert the open-ended subscription into a Subscription Schedule capped at
 * `months` iterations (end_behavior=cancel) so the firm is charged exactly N times then stops.
 * Idempotent: if we've already attached a schedule, do nothing.
 */
async function handleLeaseCheckout(subscription: Stripe.Subscription): Promise<void> {
  const existing = await getLease(subscription.id);
  if (existing?.scheduleId) return;

  const months = Number(subscription.metadata?.months ?? 0);
  const stripe = getStripe();

  const schedule = await stripe.subscriptionSchedules.create({ from_subscription: subscription.id });
  const phase0 = schedule.phases[0];

  await stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: "cancel",
    phases: [
      {
        start_date: phase0.start_date,
        items: phase0.items.map((i) => ({
          price: typeof i.price === "string" ? i.price : i.price.id,
          quantity: i.quantity ?? 1,
        })),
        // Cap the phase at N monthly cycles → exactly N charges, then end_behavior cancels.
        // (v22 replaced the old `iterations` with `duration`.)
        ...(months > 0 ? { duration: { interval: "month" as const, interval_count: months } } : {}),
      },
    ],
  });

  await saveLease(leaseFromSubscription(subscription, schedule.id));
  console.log(`[webhook] Hardware lease ${subscription.id} → ${months} payments, schedule ${schedule.id}`);
}

/** Keep the lease record's status fresh on subscription lifecycle events. Preserves scheduleId. */
async function recordLeaseStatus(subscription: Stripe.Subscription): Promise<void> {
  const existing = await getLease(subscription.id);
  await saveLease(leaseFromSubscription(subscription, existing?.scheduleId));
}
