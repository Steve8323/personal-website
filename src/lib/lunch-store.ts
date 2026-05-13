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

const APPS_KEY = "lunch:applications";

function getRedis(): Redis | null {
  const url =
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function isLunchConfigured(): boolean {
  return getRedis() !== null && !!process.env.RESEND_API_KEY;
}

function require_(): Redis {
  const r = getRedis();
  if (!r) throw new Error("KV not configured");
  return r;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getAllApplications(): Promise<LunchApplication[]> {
  const r = require_();
  const list = (await r.get<LunchApplication[]>(APPS_KEY)) || [];
  return list;
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
    return { ok: false, error: "You've already applied for this day with that email." };
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
