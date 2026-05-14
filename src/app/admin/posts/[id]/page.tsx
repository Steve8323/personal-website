import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getPostById, isPostsStoreConfigured } from "@/lib/posts-store";
import PostEditor from "./post-editor";

export const metadata: Metadata = {
  title: "Edit post",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditPostPage(
  props: PageProps<"/admin/posts/[id]">,
) {
  const { id } = await props.params;
  const isNew = id === "new";
  const storeConfigured = isPostsStoreConfigured();

  let initial: {
    id: string;
    slug: string;
    title: string;
    date: string;
    excerpt: string;
    content: string;
  };

  if (isNew) {
    initial = {
      id: "",
      slug: "",
      title: "",
      date: format(new Date(), "yyyy-MM-dd"),
      excerpt: "",
      content: "",
    };
  } else {
    const post = await getPostById(id);
    if (!post) notFound();
    initial = {
      id: post.id,
      slug: post.slug,
      title: post.title,
      date: post.date,
      excerpt: post.excerpt || "",
      content: post.content,
    };
  }

  return (
    <div>
      <Link
        href="/admin/posts"
        className="font-mono text-xs text-zinc-500 hover:text-foreground"
      >
        ← all posts
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        {isNew ? "New post" : "Edit post"}
      </h1>
      {!storeConfigured && (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
          Storage isn&apos;t configured. Saving is disabled.
        </div>
      )}
      <div className="mt-6">
        <PostEditor initial={initial} storeConfigured={storeConfigured} />
      </div>
    </div>
  );
}
