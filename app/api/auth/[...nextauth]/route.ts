import { handlers } from "@/lib/auth";

export const runtime = "nodejs";

// Auth.js route handlers: /api/auth/* (signin, callback, signout, csrf, session, …).
export const { GET, POST } = handlers;
