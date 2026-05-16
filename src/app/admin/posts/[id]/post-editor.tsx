"use client";

import { useRef, useState } from "react";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertAtCursor(before: string, selectionDefault: string, after: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end) || selectionDefault;
    const next = content.slice(0, start) + before + selected + after + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursorStart = start + before.length;
      const cursorEnd = cursorStart + selected.length;
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  function onInsertLink() {
    const url = window.prompt("Link URL", "https://");
    if (!url) return;
    insertAtCursor("[", "link text", `](${url})`);
  }

  function onInsertImage() {
    const url = window.prompt("Image URL");
    if (!url) return;
    const alt = window.prompt("Alt text (optional)", "") || "";
    insertAtCursor("![", alt, `](${url})`);
  }

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

      <Field label="Content (Markdown — single Enter = line break)">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onInsertLink}
              className="rounded-md border border-black/[.12] px-2.5 py-1 text-xs hover:border-foreground dark:border-white/[.18]"
            >
              Insert link
            </button>
            <button
              type="button"
              onClick={onInsertImage}
              className="rounded-md border border-black/[.12] px-2.5 py-1 text-xs hover:border-foreground dark:border-white/[.18]"
            >
              Insert image
            </button>
            <span className="text-xs text-zinc-500">
              Or paste Markdown directly: <code>[text](url)</code>, <code>![alt](url)</code>
            </span>
          </div>
          <textarea
            ref={textareaRef}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={24}
            className="w-full rounded-md border border-black/[.12] bg-transparent px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-foreground dark:border-white/[.18] resize-y"
          />
        </div>
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
