import { NextRequest } from "next/server";

/** Thrown by readJson when the body exceeds the byte cap. Handlers should map it to HTTP 413. */
export class BodyTooLargeError extends Error {
  constructor() {
    super("request body too large");
    this.name = "BodyTooLargeError";
  }
}

/**
 * Read and JSON-parse a request body, rejecting anything over `maxBytes`.
 *
 * A handler that calls `request.json()` directly will happily buffer a multi-megabyte payload into
 * memory before it can reject it — a cheap DoS. This caps it twice: once by the declared
 * Content-Length (fast reject) and once by the actual bytes read (in case the header lies).
 *
 * 16 KB is generous for our small JSON bodies (email, license key, a Turnstile token).
 */
export async function readJson<T = unknown>(req: NextRequest, maxBytes = 16 * 1024): Promise<T> {
  const declared = req.headers.get("content-length");
  if (declared && Number(declared) > maxBytes) throw new BodyTooLargeError();

  const text = await req.text();
  // Byte length, not string length — multibyte chars would undercount with `.length`.
  if (Buffer.byteLength(text, "utf8") > maxBytes) throw new BodyTooLargeError();

  return JSON.parse(text) as T;
}
