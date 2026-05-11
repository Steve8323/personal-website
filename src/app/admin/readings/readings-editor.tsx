"use client";

import { useState } from "react";
import type { Reading, ReadingCategory } from "@/lib/readings-store";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/readings-store";

type Draft = Reading & { _ui?: { isNew?: boolean } };

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyReading(): Draft {
  return {
    id: makeId(),
    title: "",
    author: "",
    link: "",
    category: "work",
    note: "",
    _ui: { isNew: true },
  };
}

type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

export default function ReadingsEditor({
  initial,
  storeConfigured,
}: {
  initial: Reading[];
  storeConfigured: boolean;
}) {
  const [items, setItems] = useState<Draft[]>(() =>
    initial.map((r) => ({ ...r, link: r.link ?? "" })),
  );
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });

  function update(id: string, patch: Partial<Draft>) {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    if (status.kind === "saved") setStatus({ kind: "idle" });
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((r) => r.id !== id));
    if (status.kind === "saved") setStatus({ kind: "idle" });
  }

  function add() {
    setItems((prev) => [emptyReading(), ...prev]);
    setStatus({ kind: "idle" });
  }

  function move(id: string, dir: -1 | 1) {
    setItems((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
    if (status.kind === "saved") setStatus({ kind: "idle" });
  }

  async function save() {
    setStatus({ kind: "saving" });

    for (let i = 0; i < items.length; i++) {
      const r = items[i];
      if (!r.title.trim() || !r.author.trim() || !r.note.trim()) {
        setStatus({
          kind: "error",
          message: `Entry ${i + 1} is missing title, author, or note.`,
        });
        return;
      }
    }

    const payload = {
      readings: items.map((r) => ({
        id: r.id,
        title: r.title.trim(),
        author: r.author.trim(),
        link: r.link && r.link.trim().length > 0 ? r.link.trim() : undefined,
        category: r.category,
        note: r.note.trim(),
      })),
    };

    try {
      const res = await fetch("/api/admin/readings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      setStatus({ kind: "saved" });
    } catch {
      setStatus({ kind: "error", message: "Couldn't reach the server." });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={add}
          className="rounded-md border border-black/[.12] px-3 py-1.5 text-sm hover:bg-black/[.04] dark:border-white/[.18] dark:hover:bg-white/[.04]"
        >
          + Add reading
        </button>
        <div className="flex items-center gap-4">
          {status.kind === "saved" && (
            <span className="text-sm text-emerald-600 dark:text-emerald-400">
              Saved
            </span>
          )}
          {status.kind === "error" && (
            <span className="text-sm text-red-600 dark:text-red-400">
              {status.message}
            </span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={status.kind === "saving" || !storeConfigured}
            title={
              !storeConfigured
                ? "Configure KV storage to enable saving"
                : undefined
            }
            className="rounded-md bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {status.kind === "saving" ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <ul className="mt-8 flex flex-col gap-6">
        {items.length === 0 && (
          <li className="rounded-md border border-dashed border-black/[.12] p-8 text-center text-sm text-zinc-500 dark:border-white/[.18]">
            No readings yet. Click <em>+ Add reading</em> to start.
          </li>
        )}
        {items.map((r, i) => (
          <li
            key={r.id}
            className="rounded-md border border-black/[.08] p-4 dark:border-white/[.12]"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="font-mono text-xs text-zinc-500">
                #{i + 1}
                {r._ui?.isNew ? " · new" : ""}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(r.id, -1)}
                  disabled={i === 0}
                  aria-label="Move up"
                  className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-black/[.04] disabled:opacity-30 dark:hover:bg-white/[.04]"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(r.id, 1)}
                  disabled={i === items.length - 1}
                  aria-label="Move down"
                  className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-black/[.04] disabled:opacity-30 dark:hover:bg-white/[.04]"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  className="ml-2 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Title">
                <input
                  type="text"
                  value={r.title}
                  onChange={(e) => update(r.id, { title: e.target.value })}
                  className="w-full rounded-md border border-black/[.12] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-foreground dark:border-white/[.18]"
                />
              </Field>
              <Field label="Author">
                <input
                  type="text"
                  value={r.author}
                  onChange={(e) => update(r.id, { author: e.target.value })}
                  className="w-full rounded-md border border-black/[.12] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-foreground dark:border-white/[.18]"
                />
              </Field>
              <Field label="Link (optional)">
                <input
                  type="url"
                  value={r.link ?? ""}
                  placeholder="https://"
                  onChange={(e) => update(r.id, { link: e.target.value })}
                  className="w-full rounded-md border border-black/[.12] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-foreground dark:border-white/[.18]"
                />
              </Field>
              <Field label="Category">
                <select
                  value={r.category}
                  onChange={(e) =>
                    update(r.id, { category: e.target.value as ReadingCategory })
                  }
                  className="w-full rounded-md border border-black/[.12] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-foreground dark:border-white/[.18]"
                >
                  {CATEGORY_ORDER.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Note">
                <textarea
                  value={r.note}
                  rows={3}
                  onChange={(e) => update(r.id, { note: e.target.value })}
                  className="w-full rounded-md border border-black/[.12] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-foreground dark:border-white/[.18] resize-y"
                />
              </Field>
            </div>
          </li>
        ))}
      </ul>
    </div>
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
