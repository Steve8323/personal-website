"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type App = {
  id: string;
  email: string;
  message: string;
  status: "pending" | "selected" | "declined";
  createdAt: number;
};

type Group = {
  date: string;
  dateLabel: string;
  pending: App[];
  selected: App[];
  declined: App[];
};

export default function AdminLunchesClient({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const [picking, setPicking] = useState<string | null>(null);

  async function pick(id: string, email: string) {
    if (
      !confirm(
        `Pick ${email}? Others for this day will be marked declined. ` +
          `No email is auto-sent — message them yourself.`,
      )
    ) {
      return;
    }
    setPicking(id);
    try {
      const res = await fetch("/api/admin/lunches/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(typeof data.error === "string" ? data.error : "Couldn't pick.");
        setPicking(null);
        return;
      }
      router.refresh();
    } catch {
      alert("Couldn't reach the server.");
    } finally {
      setPicking(null);
    }
  }

  return (
    <div className="mt-10 flex flex-col gap-10">
      {groups.map((g) => {
        const totalApplicants = g.pending.length + g.selected.length + g.declined.length;
        return (
          <section
            key={g.date}
            className="rounded-lg border border-black/[.08] p-5 dark:border-white/[.12]"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-semibold">{g.dateLabel}</h2>
              <span className="font-mono text-xs text-zinc-500">
                {totalApplicants} application{totalApplicants === 1 ? "" : "s"}
              </span>
            </div>

            {g.selected.length > 0 && (
              <div className="mt-4">
                <p className="font-mono text-[11px] uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                  Picked
                </p>
                {g.selected.map((a) => (
                  <Application key={a.id} app={a} />
                ))}
              </div>
            )}

            {g.pending.length > 0 && (
              <div className="mt-4">
                <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                  Pending
                </p>
                {g.pending.map((a) => (
                  <div key={a.id}>
                    <Application app={a} />
                    {g.selected.length === 0 && (
                      <button
                        type="button"
                        onClick={() => pick(a.id, a.email)}
                        disabled={picking === a.id}
                        className="mt-2 rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background hover:opacity-90 disabled:opacity-50"
                      >
                        {picking === a.id ? "Picking..." : "Pick this one"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {g.declined.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                  Declined ({g.declined.length})
                </summary>
                <div className="mt-2">
                  {g.declined.map((a) => (
                    <Application key={a.id} app={a} muted />
                  ))}
                </div>
              </details>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Application({ app, muted = false }: { app: App; muted?: boolean }) {
  return (
    <div className={`mt-2 ${muted ? "opacity-60" : ""}`}>
      <div className="flex items-baseline justify-between gap-4">
        <a
          href={`mailto:${app.email}`}
          className="font-mono text-xs hover:underline"
        >
          {app.email}
        </a>
        <span className="font-mono text-[10px] text-zinc-500">
          {new Date(app.createdAt).toLocaleString()}
        </span>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
        {app.message}
      </p>
    </div>
  );
}
