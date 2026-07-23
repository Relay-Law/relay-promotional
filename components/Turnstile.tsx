"use client";

import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile widget. Renders nothing (and the site behaves exactly as before) unless
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is set — so this is safe to leave mounted while Turnstile is off.
 *
 * Server-side verification lives in lib/turnstile.ts.
 */

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
  }
}

/** Whether a site key is configured (so callers can require a token before submitting). */
export function turnstileConfigured(): boolean {
  return Boolean(SITE_KEY);
}

function loadScript(onReady: () => void): void {
  if (window.turnstile) return onReady();
  const existing = document.querySelector<HTMLScriptElement>(`script[src^="${SCRIPT_SRC}"]`);
  if (existing) {
    existing.addEventListener("load", onReady);
    return;
  }
  const s = document.createElement("script");
  s.src = SCRIPT_SRC;
  s.async = true;
  s.defer = true;
  s.addEventListener("load", onReady);
  document.head.appendChild(s);
}

export function Turnstile({
  onToken,
  onExpire,
}: {
  onToken: (token: string) => void;
  onExpire?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  // Hold the latest callbacks in refs so the render effect can run exactly once.
  const tokenCb = useRef(onToken);
  const expireCb = useRef(onExpire);
  tokenCb.current = onToken;
  expireCb.current = onExpire;

  useEffect(() => {
    if (!SITE_KEY || !containerRef.current) return;
    let cancelled = false;

    loadScript(() => {
      if (cancelled || !window.turnstile || !containerRef.current || widgetId.current) return;
      widgetId.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme: "auto",
        callback: (token: string) => tokenCb.current(token),
        "expired-callback": () => expireCb.current?.(),
        "error-callback": () => expireCb.current?.(),
      });
    });

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={containerRef} className="mt-1" />;
}
