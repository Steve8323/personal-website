import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import breaks from "remark-breaks";
import { format, parseISO } from "date-fns";
import { Redis } from "@upstash/redis";

export type Post = {
  id: string;
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  excerpt?: string;
  content: string; // markdown
};

export type PostSummary = Pick<Post, "id" | "slug" | "title" | "date" | "excerpt"> & {
  dateLabel: string;
};

const POSTS_KEY = "posts:list";
const POSTS_DIR = path.join(process.cwd(), "content", "blog");

function getRedis(): Redis | null {
  const url =
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function isPostsStoreConfigured(): boolean {
  return getRedis() !== null;
}

function seedFromMarkdown(): Post[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  return files.map((file) => {
    const slug = file.replace(/\.md$/, "");
    const fullPath = path.join(POSTS_DIR, file);
    const { data, content } = matter(fs.readFileSync(fullPath, "utf8"));
    const fm = data as { title?: string; date?: string; excerpt?: string };
    return {
      id: `seed-${slug}`,
      slug,
      title: fm.title || slug,
      date: fm.date || "2026-01-01",
      excerpt: fm.excerpt,
      content,
    };
  });
}

function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getAllPosts(): Promise<Post[]> {
  const redis = getRedis();
  if (!redis) return sortPosts(seedFromMarkdown());
  try {
    const data = await redis.get<Post[] | null>(POSTS_KEY);
    if (data === null) return sortPosts(seedFromMarkdown());
    if (!Array.isArray(data)) return sortPosts(seedFromMarkdown());
    return sortPosts(data);
  } catch (err) {
    console.error("Failed to read posts from KV:", err);
    return sortPosts(seedFromMarkdown());
  }
}

export async function getPostSummaries(): Promise<PostSummary[]> {
  const posts = await getAllPosts();
  return posts.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    date: p.date,
    excerpt: p.excerpt,
    dateLabel: safeFormatDate(p.date),
  }));
}

function safeFormatDate(date: string): string {
  try {
    return format(parseISO(date), "MMM d, yyyy");
  } catch {
    return date;
  }
}

export async function getPostBySlug(
  slug: string,
): Promise<(Post & { contentHtml: string; dateLabel: string }) | null> {
  const posts = await getAllPosts();
  const post = posts.find((p) => p.slug === slug);
  if (!post) return null;
  return {
    ...post,
    contentHtml: await renderPostHtml(post.content),
    dateLabel: safeFormatDate(post.date),
  };
}

async function renderMarkdown(md: string): Promise<string> {
  const file = await remark()
    .use(breaks)
    .use(html, { sanitize: false })
    .process(md);
  return file.toString();
}

async function renderInlineMarkdown(md: string): Promise<string> {
  const out = await renderMarkdown(md);
  return out.trim().replace(/^<p>/, "").replace(/<\/p>\s*$/, "");
}

async function renderPostHtml(source: string): Promise<string> {
  const bodies: string[] = [];
  const placeholdered = source.replace(
    /\^\[((?:[^[\]]|\[[^\]]*\])+)\]/g,
    (_, body: string) => {
      bodies.push(body);
      return `xSIDENOTEx${bodies.length}xEND`;
    },
  );

  let main = await renderMarkdown(placeholdered);

  for (let i = 0; i < bodies.length; i++) {
    const n = i + 1;
    const bodyHtml = await renderInlineMarkdown(bodies[i]);
    const inject =
      `<sup class="sn-ref"><a id="sn-ref-${n}" href="#sn-${n}">${n}</a></sup>` +
      `<span class="sidenote" id="sn-${n}">` +
      `<sup class="sn-num">${n}</sup>${bodyHtml}` +
      `</span>`;
    main = main.replace(`xSIDENOTEx${n}xEND`, inject);
  }
  return main;
}

export async function getPostById(
  id: string,
): Promise<Post | null> {
  const posts = await getAllPosts();
  return posts.find((p) => p.id === id) || null;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const baseSlug = slugify(base) || "post";
  const posts = await getAllPosts();
  const taken = new Set(
    posts.filter((p) => p.id !== excludeId).map((p) => p.slug),
  );
  if (!taken.has(baseSlug)) return baseSlug;
  let n = 2;
  while (taken.has(`${baseSlug}-${n}`)) n++;
  return `${baseSlug}-${n}`;
}

export type SavePostInput = {
  id?: string;
  slug?: string;
  title: string;
  date: string;
  excerpt?: string;
  content: string;
};

export async function upsertPost(input: SavePostInput): Promise<
  { ok: true; post: Post } | { ok: false; error: string }
> {
  const redis = getRedis();
  if (!redis) return { ok: false, error: "KV not configured" };

  const title = input.title.trim();
  if (!title) return { ok: false, error: "Title is required." };
  if (title.length > 200) return { ok: false, error: "Title is too long." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date))
    return { ok: false, error: "Date must be in YYYY-MM-DD format." };
  if (input.content.length > 100000)
    return { ok: false, error: "Post is too long." };

  const existing = await getAllPosts();

  let id = input.id || null;
  let oldSlug: string | null = null;
  if (id) {
    const found = existing.find((p) => p.id === id);
    if (!found) return { ok: false, error: "Post not found." };
    oldSlug = found.slug;
  }
  if (!id) {
    id = crypto.randomUUID();
  }

  let slug = input.slug?.trim()
    ? slugify(input.slug)
    : oldSlug || slugify(title);
  if (!slug) slug = "post";
  if (existing.some((p) => p.id !== id && p.slug === slug)) {
    slug = await uniqueSlug(slug, id);
  }

  const excerpt = input.excerpt?.trim() ? input.excerpt.trim() : undefined;
  if (excerpt && excerpt.length > 500)
    return { ok: false, error: "Excerpt is too long." };

  const next: Post = {
    id,
    slug,
    title,
    date: input.date,
    excerpt,
    content: input.content,
  };

  const others = existing.filter((p) => p.id !== id);
  const newList = [...others, next];
  await redis.set(POSTS_KEY, newList);
  return { ok: true, post: next };
}

export async function deletePost(id: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) throw new Error("KV not configured");
  const existing = await getAllPosts();
  const filtered = existing.filter((p) => p.id !== id);
  if (filtered.length === existing.length) return false;
  await redis.set(POSTS_KEY, filtered);
  return true;
}
