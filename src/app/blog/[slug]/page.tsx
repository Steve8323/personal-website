import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostBySlug } from "@/lib/posts-store";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/blog/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Not found" };
  return {
    title: `${post.title} · Steve Hou`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage(props: PageProps<"/blog/[slug]">) {
  const { slug } = await props.params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return (
    <article>
      <Link
        href="/blog"
        className="font-mono text-xs text-zinc-500 hover:text-foreground"
      >
        ← all posts
      </Link>
      <header className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {post.title}
        </h1>
        <p className="mt-2 font-mono text-xs text-zinc-500">{post.dateLabel}</p>
      </header>
      <div
        className="prose-content mt-8 text-base text-zinc-700 dark:text-zinc-300"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />
    </article>
  );
}
