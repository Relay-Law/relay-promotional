import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { DEFAULT_HARDWARE_CENTS, LEASE_MONTHS, LEASE_RATE, quoteLease } from "@/lib/hardware";
import { clientIp, enforce, LIMITS } from "@/lib/ratelimit";

/**
 * Start a financed-hardware checkout. We create a Checkout subscription with an inline monthly
 * price (so the machine cost can vary). The webhook then converts it into a Subscription Schedule
 * capped at `months` iterations, so the firm is charged exactly N times and then it ends.
 *
 * Body: { hardwareCents?, months?, email?, customerId? }
 *   - hardwareCents: machine cost in cents (defaults to the reference box).
 *   - customerId: reuse an existing Stripe customer (e.g. the firm that bought software); else email.
 */
export async function POST(request: NextRequest) {
  const limited = await enforce(`hardware:lease:ip:${clientIp(request)}`, LIMITS.stripeIp);
  if (limited) return limited;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 500 });
  }

  let hardwareCents = DEFAULT_HARDWARE_CENTS;
  let months = LEASE_MONTHS;
  let email: string | undefined;
  let customerId: string | undefined;
  try {
    const body = await request.json();
    if (body.hardwareCents != null) hardwareCents = Math.max(1, Math.floor(Number(body.hardwareCents)));
    if (body.months != null) months = Math.max(1, Math.floor(Number(body.months)));
    if (typeof body.email === "string" && body.email.includes("@")) email = body.email.trim().toLowerCase();
    if (typeof body.customerId === "string" && body.customerId) customerId = body.customerId;
  } catch {
    // Empty body → finance the reference machine on default terms.
  }

  const quote = quoteLease(hardwareCents, LEASE_RATE, months);

  // Metadata travels on both the session and the subscription so the webhook can recognize a
  // lease (and skip license minting / convert it to a capped schedule).
  const metadata = {
    type: "hardware_lease",
    months: String(months),
    rate: String(LEASE_RATE),
    hardwareCents: String(hardwareCents),
    monthlyCents: String(quote.monthlyCents),
  };

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      ...(customerId ? { customer: customerId } : { customer_email: email }),
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Relay Workstation — ${months}-month financing`,
            },
            unit_amount: quote.monthlyCents,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      metadata,
      subscription_data: { metadata },
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing/cancelled`,
    });

    return NextResponse.json({ url: session.url, quote });
  } catch (err) {
    console.error("[hardware/lease] Stripe error:", err);
    return NextResponse.json({ error: "Could not start hardware financing" }, { status: 502 });
  }
}
