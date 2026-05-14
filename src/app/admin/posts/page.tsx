import type { Metadata } from "next";
import Link from "next/link";
import { getPostSummaries, isPostsStoreConfigured } from "@/lib/posts-store";
import PostsList from "./posts-list";

export const metadata: Metadata = {
  title: "Edit posts",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  const posts = await getPostSummaries();
  const storeConfigured = isPostsStoreConfigured();

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Edit posts</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/readings"
            className="font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-foreground"
          >
            ← readings
          </Link>
          <Link
            href="/admin/lunches"
            className="font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-foreground"
          >
            lunches →
          </Link>
          <form action="/api/admin/logout" method="post">
            <button
              type="submit"
              className="font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      {!storeConfigured && (
        <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
          <p>
            Storage isn&apos;t configured. Add{" "}
            <code className="font-mono">KV_REST_API_URL</code> and{" "}
            <code className="font-mono">KV_REST_API_TOKEN</code> env vars to
            enable editing.
          </p>
        </div>
      )}

      <div className="mt-8">
        <PostsList
          initial={posts.map((p) => ({
            id: p.id,
            slug: p.slug,
            title: p.title,
            dateLabel: p.dateLabel,
            excerpt: p.excerpt,
          }))}
          storeConfigured={storeConfigured}
        />
      </div>
    </div>
  );
}
