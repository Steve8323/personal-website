"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Initial = {
  id: string;
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
};

type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "error"; message: string };

export default function PostEditor({
  initial,
  storeConfigured,
}: {
  initial: Initial;
  storeConfigured: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [date, setDate] = useState(initial.date);
  const [excerpt, setExcerpt] = useState(initial.excerpt);
  const [content, setContent] = useState(initial.content);
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ kind: "saving" });
    try {
      const res = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initial.id || undefined,
          slug: slug || undefined,
          title,
          date,
          excerpt: excerpt || undefined,
          content,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus({
          kind: "error",
          message:
            typeof data.error === "string" ? data.error : "Couldn't save.",
        });
        return;
      }
      router.push("/admin/posts");
      router.refresh();
    } catch {
      setStatus({ kind: "error", message: "Couldn't reach the server." });
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Title">
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-black/[.12] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-foreground dark:border-white/[.18]"
          />
        </Field>
        <Field label="Date">
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-black/[.12] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-foreground dark:border-white/[.18]"
          />
        </Field>
        <Field label="Slug (URL) — leave blank to auto-generate from title">
          <input
            type="text"
            value={slug}
            placeholder="auto"
            onChange={(e) => setSlug(e.target.value)}
            className="w-full rounded-md border border-black/[.12] bg-transparent px-3 py-1.5 font-mono text-sm outline-none focus:border-foreground dark:border-white/[.18]"
          />
        </Field>
        <Field label="Excerpt (optional, shown on listings)">
          <input
            type="text"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            className="w-full rounded-md border border-black/[.12] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-foreground dark:border-white/[.18]"
          />
        </Field>
      </div>

      <Field label="Content (Markdown)">
        <textarea
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={24}
          className="w-full rounded-md border border-black/[.12] bg-transparent px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-foreground dark:border-white/[.18] resize-y"
        />
      </Field>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={status.kind === "saving" || !storeConfigured}
          className="rounded-md bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {status.kind === "saving" ? "Saving..." : "Save"}
        </button>
        <a
          href={`/blog/${slug || "preview"}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-zinc-500 hover:text-foreground"
        >
          View on site →
        </a>
        {status.kind === "error" && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {status.message}
          </p>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}
