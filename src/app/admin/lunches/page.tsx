import type { Metadata } from "next";
import Link from "next/link";
import { getAllApplications } from "@/lib/lunch-store";
import { formatHumanDate } from "@/lib/dates";
import AdminLunchesClient from "./admin-lunches-client";

export const metadata: Metadata = {
  title: "Lunch applications",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLunchesPage() {
  const all = await getAllApplications();

  const byDate = new Map<
    string,
    {
      date: string;
      pending: typeof all;
      selected: typeof all;
      declined: typeof all;
    }
  >();
  for (const a of all) {
    if (!byDate.has(a.date)) {
      byDate.set(a.date, {
        date: a.date,
        pending: [],
        selected: [],
        declined: [],
      });
    }
    const bucket = byDate.get(a.date)!;
    if (a.status === "pending") bucket.pending.push(a);
    else if (a.status === "selected") bucket.selected.push(a);
    else bucket.declined.push(a);
  }

  const groups = Array.from(byDate.values()).sort((a, b) =>
    a.date < b.date ? -1 : 1,
  );

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Lunch applications</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/posts"
            className="font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-foreground"
          >
            ← posts
          </Link>
          <Link
            href="/admin/readings"
            className="font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-foreground"
          >
            ← readings
          </Link>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="mt-10 text-sm text-zinc-500">No applications yet.</p>
      ) : (
        <AdminLunchesClient
          groups={groups.map((g) => ({
            date: g.date,
            dateLabel: formatHumanDate(g.date),
            pending: g.pending.map(toClient),
            selected: g.selected.map(toClient),
            declined: g.declined.map(toClient),
          }))}
        />
      )}
    </div>
  );
}

function toClient(a: {
  id: string;
  email: string;
  message: string;
  status: "pending" | "selected" | "declined";
  createdAt: number;
}) {
  return {
    id: a.id,
    email: a.email,
    message: a.message,
    status: a.status,
    createdAt: a.createdAt,
  };
}
