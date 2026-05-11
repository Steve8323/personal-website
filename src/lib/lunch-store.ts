import { Redis } from "@upstash/redis";

export type LunchApplicationStatus = "pending" | "selected" | "declined";

export type LunchApplication = {
  id: string;
  email: string;
  date: string; // YYYY-MM-DD
  message: string;
  createdAt: number;
  status: LunchApplicationStatus;
};

export type LunchUser = {
  email: string;
  createdAt: number;
  verifiedAt: number;
};

export type MagicLinkRecord = {
  email: string;
  expiresAt: number;
};

const USERS_KEY = "lunch:users";
const APPS_KEY = "lunch:applications";
const MAGIC_PREFIX = "lunch:magic:";

const MAGIC_TTL_SECONDS = 15 * 60;

function getRedis(): Redis | null {
  const url =
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function isLunchConfigured(): boolean {
  return getRedis() !== null && !!process.env.RESEND_API_KEY && !!process.env.ADMIN_PASSWORD;
}

function require_(): Redis {
  const r = getRedis();
  if (!r) throw new Error("KV not configured");
  return r;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// --- Users ---

export async function getUser(email: string): Promise<LunchUser | null> {
  const list = (await require_().get<LunchUser[]>(USERS_KEY)) || [];
  const target = normalizeEmail(email);
  return list.find((u) => u.email === target) || null;
}

export async function upsertVerifiedUser(email: string): Promise<LunchUser> {
  const r = require_();
  const list = (await r.get<LunchUser[]>(USERS_KEY)) || [];
  const target = normalizeEmail(email);
  const now = Date.now();
  const existing = list.find((u) => u.email === target);
  let user: LunchUser;
  if (existing) {
    existing.verifiedAt = existing.verifiedAt || now;
    user = existing;
  } else {
    user = { email: target, createdAt: now, verifiedAt: now };
    list.push(user);
  }
  await r.set(USERS_KEY, list);
  return user;
}

// --- Magic links ---

export async function saveMagicLink(token: string, email: string): Promise<void> {
  const r = require_();
  const record: MagicLinkRecord = {
    email: normalizeEmail(email),
    expiresAt: Date.now() + MAGIC_TTL_SECONDS * 1000,
  };
  await r.set(MAGIC_PREFIX + token, record, { ex: MAGIC_TTL_SECONDS });
}

export async function consumeMagicLink(token: string): Promise<string | null> {
  const r = require_();
  const key = MAGIC_PREFIX + token;
  const record = await r.get<MagicLinkRecord | null>(key);
  if (!record) return null;
  if (record.expiresAt < Date.now()) {
    await r.del(key);
    return null;
  }
  await r.del(key);
  return record.email;
}

// --- Applications ---

export async function getAllApplications(): Promise<LunchApplication[]> {
  const r = require_();
  const list = (await r.get<LunchApplication[]>(APPS_KEY)) || [];
  return list;
}

export async function getApplicationsByDate(date: string): Promise<LunchApplication[]> {
  const all = await getAllApplications();
  return all.filter((a) => a.date === date);
}

export async function getApplicationsByEmail(email: string): Promise<LunchApplication[]> {
  const all = await getAllApplications();
  const target = normalizeEmail(email);
  return all.filter((a) => a.email === target);
}

export async function applicationCountsByDate(): Promise<Record<string, number>> {
  const all = await getAllApplications();
  const counts: Record<string, number> = {};
  for (const a of all) {
    if (a.status === "declined") continue;
    counts[a.date] = (counts[a.date] || 0) + 1;
  }
  return counts;
}

export async function createApplication(input: {
  email: string;
  date: string;
  message: string;
}): Promise<{ ok: true; application: LunchApplication } | { ok: false; error: string }> {
  const r = require_();
  const email = normalizeEmail(input.email);
  const list = (await r.get<LunchApplication[]>(APPS_KEY)) || [];
  if (list.some((a) => a.email === email && a.date === input.date)) {
    return { ok: false, error: "You've already applied for this day." };
  }
  const application: LunchApplication = {
    id: crypto.randomUUID(),
    email,
    date: input.date,
    message: input.message,
    createdAt: Date.now(),
    status: "pending",
  };
  list.push(application);
  await r.set(APPS_KEY, list);
  return { ok: true, application };
}

export async function deleteApplication(id: string, email: string): Promise<boolean> {
  const r = require_();
  const target = normalizeEmail(email);
  const list = (await r.get<LunchApplication[]>(APPS_KEY)) || [];
  const idx = list.findIndex((a) => a.id === id && a.email === target);
  if (idx < 0) return false;
  list.splice(idx, 1);
  await r.set(APPS_KEY, list);
  return true;
}

export async function updateApplicationStatus(
  id: string,
  status: LunchApplicationStatus,
): Promise<LunchApplication | null> {
  const r = require_();
  const list = (await r.get<LunchApplication[]>(APPS_KEY)) || [];
  const app = list.find((a) => a.id === id);
  if (!app) return null;
  app.status = status;
  await r.set(APPS_KEY, list);
  return app;
}

export async function pickWinner(id: string): Promise<LunchApplication | null> {
  const r = require_();
  const list = (await r.get<LunchApplication[]>(APPS_KEY)) || [];
  const winner = list.find((a) => a.id === id);
  if (!winner) return null;
  winner.status = "selected";
  for (const a of list) {
    if (a.id !== id && a.date === winner.date && a.status === "pending") {
      a.status = "declined";
    }
  }
  await r.set(APPS_KEY, list);
  return winner;
}
