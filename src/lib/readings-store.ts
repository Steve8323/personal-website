import { Redis } from "@upstash/redis";
import {
  readings as fallbackReadings,
  DEFAULT_CATEGORY_ORDER,
} from "./readings";

export const TIERS = ["loved", "fine", "disliked"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_RANGES: Record<Tier, [number, number]> = {
  disliked: [0.0, 3.9],
  fine: [4.0, 6.9],
  loved: [7.0, 10.0],
};

export const TIER_LABELS: Record<Tier, string> = {
  loved: "Loved it",
  fine: "It was fine",
  disliked: "Didn't like it",
};

export type Reading = {
  id: string;
  title?: string;
  author?: string;
  link?: string;
  category: string;
  note?: string;
  personal?: boolean;
  tier?: Tier;
  tierRank?: number;
};

export type ReadingsState = {
  readings: Reading[];
  categoryOrder: string[];
};

export type ReadingGroup = {
  name: string;
  items: Reading[];
};

const READINGS_KEY = "readings:list";
const CATEGORY_ORDER_KEY = "readings:category-order";

function getRedis(): Redis | null {
  const url =
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function isStoreConfigured(): boolean {
  return getRedis() !== null;
}

function seedFromStatic(): ReadingsState {
  const readings = fallbackReadings.map((r, i) => ({
    id: `seed-${i + 1}`,
    title: r.title,
    author: r.author,
    link: r.link,
    category: r.category,
    note: r.note,
  }));
  return {
    readings,
    categoryOrder: [...DEFAULT_CATEGORY_ORDER],
  };
}

function normalizeKey(category: string): string {
  return category.trim().toLowerCase();
}

function deriveOrderFromItems(items: Reading[]): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  for (const r of items) {
    const cat = r.category?.trim();
    if (!cat) continue;
    const key = normalizeKey(cat);
    if (seen.has(key)) continue;
    seen.add(key);
    order.push(cat);
  }
  return order;
}

export async function getState(): Promise<ReadingsState> {
  const redis = getRedis();
  if (!redis) return seedFromStatic();
  try {
    const [readingsData, orderData] = await Promise.all([
      redis.get<Reading[] | null>(READINGS_KEY),
      redis.get<string[] | null>(CATEGORY_ORDER_KEY),
    ]);

    if (readingsData === null) {
      return seedFromStatic();
    }
    if (!Array.isArray(readingsData)) {
      return seedFromStatic();
    }

    let categoryOrder: string[];
    if (Array.isArray(orderData) && orderData.length > 0) {
      categoryOrder = orderData;
    } else {
      const derived = deriveOrderFromItems(readingsData);
      categoryOrder = derived.length > 0 ? derived : [...DEFAULT_CATEGORY_ORDER];
    }
    return { readings: readingsData, categoryOrder };
  } catch (err) {
    console.error("Failed to read readings from KV:", err);
    return seedFromStatic();
  }
}

export async function getReadings(): Promise<Reading[]> {
  const state = await getState();
  return state.readings;
}

export async function saveState(state: ReadingsState): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error("KV not configured");
  await Promise.all([
    redis.set(READINGS_KEY, state.readings),
    redis.set(CATEGORY_ORDER_KEY, state.categoryOrder),
  ]);
}

function optionalString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > max) return undefined;
  return trimmed;
}

export function sanitizeReading(input: unknown): Reading | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;
  const id = typeof obj.id === "string" && obj.id.length > 0 ? obj.id : null;
  if (!id) return null;
  const title = optionalString(obj.title, 200);
  const author = optionalString(obj.author, 200);
  const note = optionalString(obj.note, 2000);
  const link = optionalString(obj.link, 500);
  const category =
    typeof obj.category === "string" ? obj.category.trim().slice(0, 100) : "";
  const personal = obj.personal === true ? true : undefined;
  const tier =
    typeof obj.tier === "string" && (TIERS as readonly string[]).includes(obj.tier)
      ? (obj.tier as Tier)
      : undefined;
  const tierRank =
    typeof obj.tierRank === "number" && Number.isFinite(obj.tierRank)
      ? obj.tierRank
      : undefined;
  if (!title && !author && !note && !link) return null;
  return { id, title, author, link, category, note, personal, tier, tierRank };
}

export function sanitizeCategoryOrder(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of input) {
    if (typeof c !== "string") continue;
    const trimmed = c.trim();
    if (trimmed.length === 0 || trimmed.length > 100) continue;
    const key = normalizeKey(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export function groupReadings(state: ReadingsState): ReadingGroup[] {
  const buckets = new Map<string, ReadingGroup>();
  for (const name of state.categoryOrder) {
    buckets.set(normalizeKey(name), { name, items: [] });
  }
  for (const r of state.readings) {
    if (r.personal) continue;
    const raw = r.category?.trim() || "";
    if (!raw) {
      const key = "";
      if (!buckets.has(key)) {
        buckets.set(key, { name: "Uncategorized", items: [] });
      }
      buckets.get(key)!.items.push(r);
      continue;
    }
    const key = normalizeKey(raw);
    if (!buckets.has(key)) {
      buckets.set(key, { name: raw, items: [] });
    }
    buckets.get(key)!.items.push(r);
  }

  const result: ReadingGroup[] = [];
  const orderedKeys = state.categoryOrder.map(normalizeKey);
  for (const key of orderedKeys) {
    const b = buckets.get(key);
    if (b) result.push(b);
    buckets.delete(key);
  }
  for (const [, b] of buckets) {
    result.push(b);
  }
  return result.filter((g) => g.items.length > 0);
}

export function personalReadings(state: ReadingsState): Reading[] {
  return state.readings.filter((r) => r.personal === true);
}

export function tierItemsSorted(readings: Reading[], tier: Tier): Reading[] {
  return readings
    .filter((r) => r.tier === tier && typeof r.tierRank === "number")
    .sort((a, b) => (a.tierRank ?? 0) - (b.tierRank ?? 0));
}

export function computeScores(readings: Reading[]): Map<string, number> {
  const scores = new Map<string, number>();
  for (const tier of TIERS) {
    const items = tierItemsSorted(readings, tier);
    const n = items.length;
    if (n === 0) continue;
    const [lo, hi] = TIER_RANGES[tier];
    if (n === 1) {
      scores.set(items[0].id, round1((lo + hi) / 2));
      continue;
    }
    for (let i = 0; i < n; i++) {
      const raw = hi - (i / (n - 1)) * (hi - lo);
      scores.set(items[i].id, round1(raw));
    }
  }
  return scores;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Pick a fractional tierRank that lands `target` at 0-indexed `slot`
 * within the tier (slot 0 = best). `pool` is the items already in that
 * tier, sorted best→worst, excluding `target`.
 */
export function rankForSlot(pool: Reading[], slot: number): number {
  if (pool.length === 0) return 1;
  if (slot <= 0) return (pool[0].tierRank ?? 1) - 1;
  if (slot >= pool.length) return (pool[pool.length - 1].tierRank ?? pool.length) + 1;
  const before = pool[slot - 1].tierRank ?? slot;
  const after = pool[slot].tierRank ?? slot + 1;
  return (before + after) / 2;
}
