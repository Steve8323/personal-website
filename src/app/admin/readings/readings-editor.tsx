"use client";

import { useMemo, useState } from "react";
import type { Reading } from "@/lib/readings-store";

type Draft = Reading & { _ui?: { isNew?: boolean } };

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyReading(defaultCategory: string): Draft {
  return {
    id: makeId(),
    title: "",
    author: "",
    link: "",
    category: defaultCategory,
    note: "",
    _ui: { isNew: true },
  };
}

type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

function normKey(s: string) {
  return s.trim().toLowerCase();
}

export default function ReadingsEditor({
  initialReadings,
  initialCategoryOrder,
  storeConfigured,
}: {
  initialReadings: Reading[];
  initialCategoryOrder: string[];
  storeConfigured: boolean;
}) {
  const [items, setItems] = useState<Draft[]>(() =>
    initialReadings.map((r) => ({ ...r, link: r.link ?? "" })),
  );
  const [categoryOrder, setCategoryOrder] = useState<string[]>(
    initialCategoryOrder,
  );
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });

  const markDirty = () => {
    if (status.kind === "saved") setStatus({ kind: "idle" });
  };

  // --- Categories panel ---

  function addCategory() {
    const name = newCategoryInput.trim();
    if (!name) return;
    setCategoryOrder((prev) => {
      if (prev.some((c) => normKey(c) === normKey(name))) return prev;
      return [...prev, name];
    });
    setNewCategoryInput("");
    markDirty();
  }

  function moveCategory(idx: number, dir: -1 | 1) {
    setCategoryOrder((prev) => {
      const next = prev.slice();
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
    markDirty();
  }

  function renameCategory(idx: number, value: string) {
    const oldName = categoryOrder[idx];
    setCategoryOrder((prev) => {
      const next = prev.slice();
      next[idx] = value;
      return next;
    });
    // Propagate rename to items whose category matches old name (case-insensitive)
    setItems((prev) =>
      prev.map((r) =>
        normKey(r.category || "") === normKey(oldName)
          ? { ...r, category: value }
          : r,
      ),
    );
    markDirty();
  }

  function deleteCategory(idx: number) {
    const name = categoryOrder[idx];
    if (!confirm(`Remove "${name}" from the order list? Items in it will move to the bottom.`)) {
      return;
    }
    setCategoryOrder((prev) => prev.filter((_, i) => i !== idx));
    markDirty();
  }

  // --- Items ---

  function update(id: string, patch: Partial<Draft>) {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    markDirty();
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((r) => r.id !== id));
    markDirty();
  }

  function addItem() {
    const defaultCategory = categoryOrder[0] || "";
    setItems((prev) => [emptyReading(defaultCategory), ...prev]);
    markDirty();
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
    markDirty();
  }

  // --- Grouping for preview / display ---

  const groupedPreview = useMemo(() => {
    type Bucket = { name: string; items: Draft[] };
    const map = new Map<string, Bucket>();
    for (const name of categoryOrder) {
      map.set(normKey(name), { name, items: [] });
    }
    for (const r of items) {
      const cat = (r.category || "").trim();
      const key = normKey(cat) || "__uncategorized__";
      if (!map.has(key)) {
        map.set(key, { name: cat || "Uncategorized", items: [] });
      }
      map.get(key)!.items.push(r);
    }
    const ordered: Bucket[] = [];
    for (const name of categoryOrder) {
      const b = map.get(normKey(name))!;
      ordered.push(b);
      map.delete(normKey(name));
    }
    for (const [, b] of map) ordered.push(b);
    return ordered;
  }, [categoryOrder, items]);

  // --- Save ---

  async function save() {
    setStatus({ kind: "saving" });

    for (let i = 0; i < items.length; i++) {
      const r = items[i];
      const hasAny =
        (r.title && r.title.trim()) ||
        (r.author && r.author.trim()) ||
        (r.note && r.note.trim()) ||
        (r.link && r.link.trim());
      if (!hasAny) {
        setStatus({
          kind: "error",
          message: `Entry ${i + 1} is empty — fill in at least one field or delete it.`,
        });
        return;
      }
    }

    const trim = (s: string | undefined) =>
      s && s.trim().length > 0 ? s.trim() : undefined;

    const payload = {
      readings: items.map((r) => ({
        id: r.id,
        title: trim(r.title),
        author: trim(r.author),
        link: trim(r.link),
        category: (r.category || "").trim(),
        note: trim(r.note),
      })),
      categoryOrder,
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

  // --- Render ---

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
          Categories (drag-order how they appear on the site)
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Type categories below. They&apos;re matched case-insensitively, so
          &ldquo;life&rdquo; and &ldquo;Life&rdquo; group together. Renaming a
          category here also updates every item that uses it.
        </p>

        <ul className="mt-3 flex flex-col gap-2">
          {categoryOrder.map((name, i) => (
            <li
              key={`${i}-${name}`}
              className="flex items-center gap-2 rounded-md border border-black/[.08] px-2 py-1.5 dark:border-white/[.12]"
            >
              <input
                type="text"
                value={name}
                onChange={(e) => renameCategory(i, e.target.value)}
                className="flex-1 rounded bg-transparent px-2 py-1 text-sm outline-none focus:bg-black/[.03] dark:focus:bg-white/[.04]"
              />
              <button
                type="button"
                onClick={() => moveCategory(i, -1)}
                disabled={i === 0}
                aria-label="Move up"
                className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-black/[.04] disabled:opacity-30 dark:hover:bg-white/[.04]"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveCategory(i, 1)}
                disabled={i === categoryOrder.length - 1}
                aria-label="Move down"
                className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-black/[.04] disabled:opacity-30 dark:hover:bg-white/[.04]"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => deleteCategory(i)}
                className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={newCategoryInput}
            onChange={(e) => setNewCategoryInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCategory();
              }
            }}
            placeholder="New category name"
            className="flex-1 rounded-md border border-black/[.12] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-foreground dark:border-white/[.18]"
          />
          <button
            type="button"
            onClick={addCategory}
            className="rounded-md border border-black/[.12] px-3 py-1.5 text-sm hover:bg-black/[.04] dark:border-white/[.18] dark:hover:bg-white/[.04]"
          >
            + Add
          </button>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
            Readings ({items.length})
          </h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={addItem}
              className="rounded-md border border-black/[.12] px-3 py-1.5 text-sm hover:bg-black/[.04] dark:border-white/[.18] dark:hover:bg-white/[.04]"
            >
              + Add reading
            </button>
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

        <p className="mt-2 text-[11px] text-zinc-500">
          All fields except category are optional. Type any category you want
          for an item — if it matches an existing one (case-insensitive),
          they&apos;ll group together on the site.
        </p>

        <ul className="mt-6 flex flex-col gap-6">
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
                <Field label="Title (optional)">
                  <input
                    type="text"
                    value={r.title ?? ""}
                    onChange={(e) => update(r.id, { title: e.target.value })}
                    className="w-full rounded-md border border-black/[.12] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-foreground dark:border-white/[.18]"
                  />
                </Field>
                <Field label="Author (optional)">
                  <input
                    type="text"
                    value={r.author ?? ""}
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
                  <input
                    type="text"
                    list="reading-categories"
                    value={r.category ?? ""}
                    onChange={(e) =>
                      update(r.id, { category: e.target.value })
                    }
                    className="w-full rounded-md border border-black/[.12] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-foreground dark:border-white/[.18]"
                  />
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Note (optional)">
                  <textarea
                    value={r.note ?? ""}
                    rows={3}
                    onChange={(e) => update(r.id, { note: e.target.value })}
                    className="w-full rounded-md border border-black/[.12] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-foreground dark:border-white/[.18] resize-y"
                  />
                </Field>
              </div>
            </li>
          ))}
        </ul>

        <datalist id="reading-categories">
          {categoryOrder.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </section>

      <section>
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
          Preview
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          How it&apos;ll appear on the site after you save.
        </p>
        <div className="mt-3 flex flex-col gap-5">
          {groupedPreview.length === 0 && (
            <p className="text-sm text-zinc-500">Nothing to show yet.</p>
          )}
          {groupedPreview.map((g) =>
            g.items.length === 0 ? null : (
              <div key={g.name} className="rounded-md bg-black/[.02] p-3 dark:bg-white/[.03]">
                <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  {g.name}
                </h3>
                <ul className="mt-1 text-sm">
                  {g.items.map((r) => (
                    <li key={r.id} className="text-zinc-600 dark:text-zinc-400">
                      {r.title || r.author || r.note || r.link || "(empty)"}
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )}
        </div>
      </section>
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
