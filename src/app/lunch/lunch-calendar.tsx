"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Cell = {
  iso: string;
  label: string;
  inMonth: boolean;
  isPast: boolean;
  isAvailable: boolean;
};

type Calendar = {
  monthLabel: string;
  cells: Cell[];
  prevMonth: string | null;
  nextMonth: string | null;
};

const WEEKDAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];

function humanDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "submitted" }
  | { kind: "error"; message: string };

export default function LunchCalendar({
  calendar,
  counts,
}: {
  calendar: Calendar;
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  function pickDay(iso: string) {
    setSelected(iso);
    setStatus({ kind: "idle" });
  }

  async function submitApplication(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    setStatus({ kind: "submitting" });
    try {
      const res = await fetch("/api/lunch/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, date: selected, message }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus({
          kind: "error",
          message:
            typeof data.error === "string" ? data.error : "Couldn't submit.",
        });
        return;
      }
      setStatus({ kind: "submitted" });
      setMessage("");
      router.refresh();
    } catch {
      setStatus({ kind: "error", message: "Couldn't reach the server." });
    }
  }

  function reset() {
    setSelected(null);
    setMessage("");
    setStatus({ kind: "idle" });
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{calendar.monthLabel}</h2>
          <div className="flex gap-2">
            {calendar.prevMonth ? (
              <Link
                href={`/lunch?month=${calendar.prevMonth}`}
                className="rounded px-2 py-1 text-sm text-zinc-500 hover:bg-black/[.04] dark:hover:bg-white/[.04]"
              >
                ← prev
              </Link>
            ) : (
              <span className="rounded px-2 py-1 text-sm text-zinc-300 dark:text-zinc-700">
                ← prev
              </span>
            )}
            {calendar.nextMonth ? (
              <Link
                href={`/lunch?month=${calendar.nextMonth}`}
                className="rounded px-2 py-1 text-sm text-zinc-500 hover:bg-black/[.04] dark:hover:bg-white/[.04]"
              >
                next →
              </Link>
            ) : (
              <span className="rounded px-2 py-1 text-sm text-zinc-300 dark:text-zinc-700">
                next →
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center">
          {WEEKDAY_HEADERS.map((d, i) => (
            <div
              key={i}
              className="py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-400"
            >
              {d}
            </div>
          ))}
          {calendar.cells.map((cell) => {
            const count = counts[cell.iso] || 0;
            const isSelected = selected === cell.iso;
            const dim = !cell.inMonth || cell.isPast || !cell.isAvailable;

            const base =
              "flex aspect-square flex-col items-center justify-center rounded-md border text-sm transition-colors";
            const cls = dim
              ? `${base} cursor-default border-transparent text-zinc-300 dark:text-zinc-700`
              : isSelected
                ? `${base} cursor-pointer border-foreground bg-foreground text-background`
                : `${base} cursor-pointer border-black/[.10] hover:border-foreground dark:border-white/[.15]`;

            return (
              <button
                key={cell.iso}
                type="button"
                disabled={dim}
                onClick={() => pickDay(cell.iso)}
                className={cls}
              >
                <span className="font-medium leading-none">{cell.label}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 font-mono text-[11px] text-zinc-500">
          click a day to apply
        </p>
      </div>

      {selected && status.kind !== "submitted" && (
        <form
          onSubmit={submitApplication}
          className="rounded-lg border border-black/[.08] p-5 dark:border-white/[.12]"
        >
          <p className="text-sm">
            Applying for <strong>{humanDate(selected)}</strong>.
            {counts[selected] >= 2 ? (
              <span className="text-zinc-500">
                {" "}
                · {counts[selected]} people already applied
              </span>
            ) : null}
          </p>

          <div className="mt-4 flex flex-col gap-2">
            <label
              htmlFor="email"
              className="font-mono text-[11px] uppercase tracking-widest text-zinc-500"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/[.18]"
            />
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <label
              htmlFor="message"
              className="font-mono text-[11px] uppercase tracking-widest text-zinc-500"
            >
              What do you want to talk about{" "}
              <span className="normal-case tracking-normal text-zinc-400">
                (not required)
              </span>
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={3000}
              rows={6}
              placeholder="Optional — leave blank if you don't have anything specific in mind."
              className="rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/[.18] resize-y"
            />
          </div>

          <div className="mt-4 flex items-center gap-4">
            <button
              type="submit"
              disabled={status.kind === "submitting"}
              className="rounded-md bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {status.kind === "submitting" ? "Applying..." : "Apply"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="text-sm text-zinc-500 hover:text-foreground"
            >
              Cancel
            </button>
            {status.kind === "error" && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {status.message}
              </p>
            )}
          </div>
        </form>
      )}

      {status.kind === "submitted" && selected && (
        <div className="rounded-lg border border-black/[.08] p-5 text-sm dark:border-white/[.12]">
          <p className="font-medium">Got it — you&apos;re in.</p>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            You&apos;ve applied for <strong>{humanDate(selected)}</strong>. If picked,
            you&apos;ll get an email with a Zoom link.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-foreground"
          >
            Apply for another day →
          </button>
        </div>
      )}
    </div>
  );
}
