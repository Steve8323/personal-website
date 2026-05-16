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

type UploadStatus =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "error"; message: string };

const INDENT = "  ";

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
  const [upload, setUpload] = useState<UploadStatus>({ kind: "idle" });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  function replaceRange(start: number, end: number, replacement: string, cursorOffset?: number) {
    const el = textareaRef.current;
    const current = contentRef.current;
    const next = current.slice(0, start) + replacement + current.slice(end);
    setContent(next);
    if (!el) return;
    requestAnimationFrame(() => {
      el.focus();
      const pos = cursorOffset ?? start + replacement.length;
      el.setSelectionRange(pos, pos);
    });
  }

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

  function onInsertQuote() {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const lineStart = content.lastIndexOf("\n", start - 1) + 1;
    const lineEndIdx = content.indexOf("\n", end);
    const lineEnd = lineEndIdx === -1 ? content.length : lineEndIdx;
    const block = content.slice(lineStart, lineEnd) || "quote";
    const quoted = block
      .split("\n")
      .map((line) => (line.startsWith("> ") ? line : `> ${line}`))
      .join("\n");
    const next = content.slice(0, lineStart) + quoted + content.slice(lineEnd);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursorEnd = lineStart + quoted.length;
      el.setSelectionRange(cursorEnd, cursorEnd);
    });
  }

  async function uploadFile(file: File): Promise<string | null> {
    setUpload({ kind: "uploading" });
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUpload({
          kind: "error",
          message: typeof data.error === "string" ? data.error : "Upload failed.",
        });
        return null;
      }
      setUpload({ kind: "idle" });
      return data.url as string;
    } catch {
      setUpload({ kind: "error", message: "Couldn't reach the upload server." });
      return null;
    }
  }

  async function handleFiles(files: FileList | File[]) {
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    for (const file of images) {
      const url = await uploadFile(file);
      if (!url) return;
      const alt = file.name.replace(/\.[^.]+$/, "");
      const md = `\n![${alt}](${url})\n`;
      const el = textareaRef.current;
      if (!el) {
        setContent(contentRef.current + md);
        continue;
      }
      const start = el.selectionStart;
      const end = el.selectionEnd;
      replaceRange(start, end, md);
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData.files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length > 0) {
      e.preventDefault();
      void handleFiles(files);
    }
  }

  function onDrop(e: React.DragEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length > 0) {
      e.preventDefault();
      void handleFiles(files);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const multiLine = start !== end && content.slice(start, end).includes("\n");

    if (multiLine) {
      const lineStart = content.lastIndexOf("\n", start - 1) + 1;
      const block = content.slice(lineStart, end);
      let newBlock: string;
      if (e.shiftKey) {
        newBlock = block
          .split("\n")
          .map((line) => {
            if (line.startsWith(INDENT)) return line.slice(INDENT.length);
            if (line.startsWith("\t")) return line.slice(1);
            return line;
          })
          .join("\n");
      } else {
        newBlock = block
          .split("\n")
          .map((line) => INDENT + line)
          .join("\n");
      }
      const next = content.slice(0, lineStart) + newBlock + content.slice(end);
      setContent(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(lineStart, lineStart + newBlock.length);
      });
      return;
    }

    if (e.shiftKey) {
      const lineStart = content.lastIndexOf("\n", start - 1) + 1;
      const head = content.slice(lineStart, start);
      if (head.startsWith(INDENT)) {
        const next = content.slice(0, lineStart) + head.slice(INDENT.length) + content.slice(start);
        setContent(next);
        requestAnimationFrame(() => {
          el.focus();
          const pos = start - INDENT.length;
          el.setSelectionRange(pos, pos);
        });
      } else if (head.startsWith("\t")) {
        const next = content.slice(0, lineStart) + head.slice(1) + content.slice(start);
        setContent(next);
        requestAnimationFrame(() => {
          el.focus();
          const pos = start - 1;
          el.setSelectionRange(pos, pos);
        });
      }
      return;
    }

    const next = content.slice(0, start) + INDENT + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + INDENT.length;
      el.setSelectionRange(pos, pos);
    });
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

      <Field label="Content (Markdown — single Enter = line break, Tab to indent, paste images directly)">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
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
              Insert image (URL)
            </button>
            <button
              type="button"
              onClick={onInsertQuote}
              className="rounded-md border border-black/[.12] px-2.5 py-1 text-xs hover:border-foreground dark:border-white/[.18]"
            >
              Quote
            </button>
            {upload.kind === "uploading" && (
              <span className="text-xs text-zinc-500">Uploading image…</span>
            )}
            {upload.kind === "error" && (
              <span className="text-xs text-red-600 dark:text-red-400">
                {upload.message}
              </span>
            )}
            {upload.kind === "idle" && (
              <span className="text-xs text-zinc-500">
                Tip: ⌘V / drag-drop to upload images
              </span>
            )}
          </div>
          <textarea
            ref={textareaRef}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={onPaste}
            onDrop={onDrop}
            onKeyDown={onKeyDown}
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
