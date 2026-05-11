export const LUNCH_SESSION_COOKIE = "lunch-session";
export const LUNCH_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

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

function encodeBase64Url(s: string): string {
  return Buffer.from(s, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decodeBase64Url(s: string): string {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

export async function createLunchSession(email: string): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;
  const expiresAt = Date.now() + LUNCH_SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${email}|${expiresAt}`;
  const sig = await hmac(secret, payload);
  return `${encodeBase64Url(payload)}.${sig}`;
}

export async function verifyLunchSession(value: string | null | undefined): Promise<{
  email: string;
  expiresAt: number;
} | null> {
  if (!value) return null;
  const secret = getSecret();
  if (!secret) return null;
  const dot = value.lastIndexOf(".");
  if (dot < 0) return null;
  const encodedPayload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  let payload: string;
  try {
    payload = decodeBase64Url(encodedPayload);
  } catch {
    return null;
  }
  const expected = await hmac(secret, payload);
  if (!constantTimeEqual(sig, expected)) return null;
  const sep = payload.lastIndexOf("|");
  if (sep < 0) return null;
  const email = payload.slice(0, sep);
  const expiresAt = Number(payload.slice(sep + 1));
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  return { email, expiresAt };
}

export async function generateMagicLinkToken(email: string): Promise<{ token: string }> {
  const secret = getSecret();
  if (!secret) throw new Error("ADMIN_PASSWORD not set");
  const randomBytes = crypto.getRandomValues(new Uint8Array(24));
  const random = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expires = Date.now() + 15 * 60 * 1000;
  const payload = `${email.toLowerCase()}|${expires}|${random}`;
  const sig = await hmac(secret, payload);
  const token = `${encodeBase64Url(payload)}.${sig}`;
  return { token };
}

export function parseMagicLinkToken(token: string): { email: string; expiresAt: number } | null {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  let payload: string;
  try {
    payload = decodeBase64Url(token.slice(0, dot));
  } catch {
    return null;
  }
  const parts = payload.split("|");
  if (parts.length !== 3) return null;
  const expiresAt = Number(parts[1]);
  if (!Number.isFinite(expiresAt)) return null;
  return { email: parts[0], expiresAt };
}
