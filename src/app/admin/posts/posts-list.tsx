"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  slug: string;
  title: string;
  dateLabel: string;
  excerpt?: string;
};

export default function PostsList({
  initial,
  storeConfigured,
}: {
  initial: Item[];
  storeConfigured: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function onDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/posts?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(typeof data.error === "string" ? data.error : "Couldn't delete.");
        setDeleting(null);
        return;
      }
      setItems((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    } catch {
      alert("Couldn't reach the server.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end">
        <Link
          href="/admin/posts/new"
          aria-disabled={!storeConfigured}
          className={`rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 ${
            !storeConfigured ? "pointer-events-none opacity-50" : ""
          }`}
        >
          + New post
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="mt-10 text-sm text-zinc-500">No posts yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-black/[.06] dark:divide-white/[.08]">
          {items.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-4 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                  <Link
                    href={`/admin/posts/${p.id}`}
                    className="font-medium hover:underline underline-offset-4"
                  >
                    {p.title}
                  </Link>
                  <span className="font-mono text-xs text-zinc-500 shrink-0">
                    {p.dateLabel}
                  </span>
                </div>
                {p.excerpt && (
                  <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">
                    {p.excerpt}
                  </p>
                )}
                <p className="mt-1 font-mono text-[11px] text-zinc-500">
                  /blog/{p.slug}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Link
                  href={`/admin/posts/${p.id}`}
                  className="text-xs text-zinc-500 hover:text-foreground"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => onDelete(p.id, p.title)}
                  disabled={deleting === p.id || !storeConfigured}
                  className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400"
                >
                  {deleting === p.id ? "..." : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
