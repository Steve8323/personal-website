import { notFound } from "next/navigation";
import Link from "next/link";
import {
  computeScores,
  getState,
  isStoreConfigured,
} from "@/lib/readings-store";
import RateFlow from "./rate-flow";

export const metadata = {
  title: "Rate reading",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function RateReadingPage(
  props: PageProps<"/admin/readings/rate/[id]">,
) {
  const { id } = await props.params;
  const state = await getState();
  const target = state.readings.find((r) => r.id === id);
  if (!target) notFound();

  const scores = computeScores(state.readings);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Rate</h1>
        <Link
          href="/admin/readings"
          className="font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-foreground"
        >
          ← back
        </Link>
      </div>
      {!isStoreConfigured() && (
        <p className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
          Storage isn&apos;t configured. Rating is disabled.
        </p>
      )}
      <RateFlow
        target={target}
        readings={state.readings}
        currentScore={scores.get(target.id)}
      />
    </div>
  );
}
