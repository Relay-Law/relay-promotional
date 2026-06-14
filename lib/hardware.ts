/**
 * Hardware financing ("lease"): we front the cost of a workstation and the firm repays it over
 * a fixed number of months. This is a convenience/speed play, NOT a margin play — the rate just
 * covers Stripe fees + our capital cost with a small buffer. Default 10% flat over the term.
 *
 * Stripe shape: a Checkout subscription (inline monthly price) that the webhook converts into a
 * Subscription Schedule capped at `months` iterations, end_behavior=cancel → exactly N charges.
 */

/** Default machine cost in cents if the caller doesn't specify (e.g. the $800 reference box). */
export const DEFAULT_HARDWARE_CENTS = Number(process.env.HARDWARE_DEFAULT_CENTS ?? "80000");

/** Number of monthly payments the cost is spread across. */
export const LEASE_MONTHS = Number(process.env.HARDWARE_LEASE_MONTHS ?? "6");

/** Flat financing rate applied across the whole term (0.10 = 10%). */
export const LEASE_RATE = Number(process.env.HARDWARE_LEASE_RATE ?? "0.10");

export interface LeaseQuote {
  hardwareCents: number;
  months: number;
  rate: number;
  /** Per-month charge in cents (financed total / months, rounded to the cent). */
  monthlyCents: number;
  /** monthlyCents * months — what they actually pay over the term. */
  totalCents: number;
}

export function quoteLease(
  hardwareCents: number = DEFAULT_HARDWARE_CENTS,
  rate: number = LEASE_RATE,
  months: number = LEASE_MONTHS,
): LeaseQuote {
  const financedTotal = hardwareCents * (1 + rate);
  const monthlyCents = Math.round(financedTotal / months);
  return {
    hardwareCents,
    months,
    rate,
    monthlyCents,
    totalCents: monthlyCents * months,
  };
}
