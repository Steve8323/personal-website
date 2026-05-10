import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import { format, parseISO } from "date-fns";

const POSTS_DIR = path.join(process.cwd(), "content", "blog");

export type PostFrontmatter = {
  title: string;
  date: string;
  excerpt?: string;
};

export type PostSummary = PostFrontmatter & {
  slug: string;
  dateLabel: string;
};

export type Post = PostSummary & {
  contentHtml: string;
};

function readPostFile(slug: string) {
  const fullPath = path.join(POSTS_DIR, `${slug}.md`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);
  const fm = data as PostFrontmatter;
  return { fm, content };
}

export function getAllPosts(): PostSummary[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  const posts = files.map((file) => {
    const slug = file.replace(/\.md$/, "");
    const { fm } = readPostFile(slug);
    return {
      slug,
      title: fm.title,
      date: fm.date,
      excerpt: fm.excerpt,
      dateLabel: format(parseISO(fm.date), "MMM d, yyyy"),
    };
  });
  posts.sort((a, b) => (a.date < b.date ? 1 : -1));
  return posts;
}

export async function getPost(slug: string): Promise<Post | null> {
  const fullPath = path.join(POSTS_DIR, `${slug}.md`);
  if (!fs.existsSync(fullPath)) return null;
  const { fm, content } = readPostFile(slug);
  const processed = await remark().use(html).process(content);
  return {
    slug,
    title: fm.title,
    date: fm.date,
    excerpt: fm.excerpt,
    dateLabel: format(parseISO(fm.date), "MMM d, yyyy"),
    contentHtml: processed.toString(),
  };
}

export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}
