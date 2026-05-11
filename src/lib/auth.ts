export const SESSION_COOKIE = "admin-session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getSecret(): string | null {
  return process.env.ADMIN_PASSWORD || null;
}

async function hmac(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function checkPassword(password: string): boolean {
  const secret = getSecret();
  if (!secret) return false;
  return constantTimeEqual(password, secret);
}

export async function createSessionValue(): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;
  const payload = String(Date.now());
  const sig = await hmac(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifySessionValue(value: string | undefined | null): Promise<boolean> {
  if (!value) return false;
  const secret = getSecret();
  if (!secret) return false;
  const dot = value.lastIndexOf(".");
  if (dot < 0) return false;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = await hmac(secret, payload);
  if (!constantTimeEqual(sig, expected)) return false;
  const ts = Number(payload);
  if (!Number.isFinite(ts)) return false;
  if (Date.now() - ts > SESSION_MAX_AGE_SECONDS * 1000) return false;
  return true;
}
