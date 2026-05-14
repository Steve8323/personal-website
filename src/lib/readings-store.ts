import { Redis } from "@upstash/redis";
import {
  readings as fallbackReadings,
  DEFAULT_CATEGORY_ORDER,
} from "./readings";

export type Reading = {
  id: string;
  title?: string;
  author?: string;
  link?: string;
  category: string;
  note?: string;
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
  if (!title && !author && !note && !link) return null;
  return { id, title, author, link, category, note };
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
