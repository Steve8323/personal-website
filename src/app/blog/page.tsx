import Link from "next/link";
import type { Metadata } from "next";
import { getPostSummaries } from "@/lib/posts-store";

export const metadata: Metadata = {
  title: "Blog · Steve Hou",
};

export const dynamic = "force-dynamic";

export default async function BlogIndex() {
  const posts = await getPostSummaries();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Blog</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        My personal blog about a little bit of everything I'm interested in!
      </p>

      {posts.length === 0 ? (
        <p className="mt-12 text-sm text-zinc-500">No posts yet.</p>
      ) : (
        <ul className="mt-10 divide-y divide-black/[.06] dark:divide-white/[.08]">
          {posts.map((post) => (
            <li key={post.id} className="py-5">
              <Link href={`/blog/${post.slug}`} className="group block">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="font-medium group-hover:underline underline-offset-4">
                    {post.title}
                  </h2>
                  <span className="font-mono text-xs text-zinc-500">
                    {post.dateLabel}
                  </span>
                </div>
                {post.excerpt && (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {post.excerpt}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
