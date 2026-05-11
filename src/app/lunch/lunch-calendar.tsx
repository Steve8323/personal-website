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

type MyApp = {
  id: string;
  date: string;
  message: string;
  status: "pending" | "selected" | "declined";
  createdAt: number;
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

export default function LunchCalendar({
  email,
  calendar,
  counts,
  myApps,
}: {
  email: string;
  calendar: Calendar;
  counts: Record<string, number>;
  myApps: MyApp[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myDates = new Set(myApps.map((a) => a.date));

  function pickDay(iso: string) {
    setSelected(iso);
    setMessage("");
    setError(null);
  }

  async function submitApplication(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/lunch/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selected, message }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          typeof data.error === "string" ? data.error : "Couldn't submit.",
        );
        setSubmitting(false);
        return;
      }
      setSelected(null);
      setMessage("");
      setSubmitting(false);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
      setSubmitting(false);
    }
  }

  async function cancelApplication(id: string) {
    if (!confirm("Cancel this application?")) return;
    try {
      const res = await fetch(`/api/lunch/apply?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        alert("Couldn't cancel.");
        return;
      }
      router.refresh();
    } catch {
      alert("Couldn't reach the server.");
    }
  }

  async function signOut() {
    await fetch("/api/lunch/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          Signed in as <span className="font-mono">{email}</span>
        </span>
        <button
          type="button"
          onClick={signOut}
          className="font-mono uppercase tracking-widest hover:text-foreground"
        >
          Sign out
        </button>
      </div>

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
            const mine = myDates.has(cell.iso);
            const isSelected = selected === cell.iso;
            const dim = !cell.inMonth || cell.isPast || !cell.isAvailable;

            const base =
              "flex aspect-square flex-col items-center justify-center rounded-md border text-sm transition-colors";
            const cls = dim
              ? `${base} cursor-default border-transparent text-zinc-300 dark:text-zinc-700`
              : isSelected
                ? `${base} cursor-pointer border-foreground bg-foreground text-background`
                : mine
                  ? `${base} cursor-pointer border-emerald-500/60 bg-emerald-500/10 hover:bg-emerald-500/15`
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
                {!dim && count > 0 && (
                  <span
                    className={`mt-1 font-mono text-[10px] ${
                      isSelected ? "text-background/80" : "text-zinc-500"
                    }`}
                  >
                    {count}
                  </span>
                )}
                {!dim && mine && !isSelected && (
                  <span className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    you
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-3 font-mono text-[11px] text-zinc-500">
          numbers show how many people have applied · green = you applied
        </p>
      </div>

      {selected && (
        <form
          onSubmit={submitApplication}
          className="rounded-lg border border-black/[.08] p-5 dark:border-white/[.12]"
        >
          <p className="text-sm">
            Applying for <strong>{humanDate(selected)}</strong>.
            {counts[selected] ? (
              <span className="text-zinc-500">
                {" "}
                · {counts[selected]} other{counts[selected] === 1 ? "" : "s"} so far
              </span>
            ) : null}
          </p>
          {myDates.has(selected) ? (
            <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
              You&apos;ve already applied for this day. Cancel below to re-apply.
            </p>
          ) : (
            <>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                minLength={20}
                maxLength={3000}
                rows={6}
                required
                placeholder="A paragraph on why you'd like to grab lunch — or just what you'd like to talk about."
                className="mt-3 w-full rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/[.18] resize-y"
              />
              <div className="mt-3 flex items-center gap-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Applying..." : "Apply"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-sm text-zinc-500 hover:text-foreground"
                >
                  Cancel
                </button>
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                )}
              </div>
            </>
          )}
        </form>
      )}

      {myApps.length > 0 && (
        <div>
          <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-500">
            Your applications
          </h2>
          <ul className="mt-4 divide-y divide-black/[.06] dark:divide-white/[.08]">
            {[...myApps]
              .sort((a, b) => (a.date < b.date ? -1 : 1))
              .map((app) => {
                const competitors = Math.max(0, (counts[app.date] || 0) - 1);
                return (
                  <li key={app.id} className="flex items-start justify-between gap-4 py-4">
                    <div>
                      <p className="text-sm font-medium">{humanDate(app.date)}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {statusLabel(app.status)}
                        {app.status === "pending" && (
                          <>
                            {" · "}
                            {competitors === 0
                              ? "no other applicants yet"
                              : `${competitors} other${competitors === 1 ? "" : "s"} applying`}
                          </>
                        )}
                      </p>
                      <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
                        {app.message}
                      </p>
                    </div>
                    {app.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => cancelApplication(app.id)}
                        className="shrink-0 text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        Cancel
                      </button>
                    )}
                  </li>
                );
              })}
          </ul>
        </div>
      )}
    </div>
  );
}

function statusLabel(s: "pending" | "selected" | "declined") {
  if (s === "selected") return "Picked!";
  if (s === "declined") return "Not selected this time";
  return "Pending";
}
