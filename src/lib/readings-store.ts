import { Redis } from "@upstash/redis";
import {
  readings as fallbackReadings,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type ReadingCategory,
} from "./readings";

export type { ReadingCategory };
export { CATEGORY_LABELS, CATEGORY_ORDER };

export type Reading = {
  id: string;
  title: string;
  author: string;
  link?: string;
  category: ReadingCategory;
  note: string;
};

const READINGS_KEY = "readings:list";

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

function seedFromStatic(): Reading[] {
  return fallbackReadings.map((r, i) => ({
    id: `seed-${i + 1}`,
    title: r.title,
    author: r.author,
    link: r.link,
    category: r.category,
    note: r.note,
  }));
}

export async function getReadings(): Promise<Reading[]> {
  const redis = getRedis();
  if (!redis) return seedFromStatic();
  try {
    const data = await redis.get<Reading[] | null>(READINGS_KEY);
    if (!data || !Array.isArray(data) || data.length === 0) {
      return seedFromStatic();
    }
    return data;
  } catch (err) {
    console.error("Failed to read readings from KV:", err);
    return seedFromStatic();
  }
}

export async function saveReadings(readings: Reading[]): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error("KV not configured");
  await redis.set(READINGS_KEY, readings);
}

export function validCategory(value: unknown): value is ReadingCategory {
  return value === "life" || value === "work" || value === "ai";
}

export function sanitizeReading(input: unknown): Reading | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;
  const id = typeof obj.id === "string" && obj.id.length > 0 ? obj.id : null;
  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  const author = typeof obj.author === "string" ? obj.author.trim() : "";
  const note = typeof obj.note === "string" ? obj.note.trim() : "";
  const link =
    typeof obj.link === "string" && obj.link.trim().length > 0
      ? obj.link.trim()
      : undefined;
  if (!id || !title || !author || !note) return null;
  if (!validCategory(obj.category)) return null;
  if (title.length > 200 || author.length > 200 || note.length > 1000) return null;
  if (link && link.length > 500) return null;
  return { id, title, author, link, category: obj.category, note };
}

export function groupByCategory(readings: Reading[]): Record<ReadingCategory, Reading[]> {
  const out: Record<ReadingCategory, Reading[]> = {
    life: [],
    work: [],
    ai: [],
  };
  for (const r of readings) {
    out[r.category].push(r);
  }
  return out;
}
