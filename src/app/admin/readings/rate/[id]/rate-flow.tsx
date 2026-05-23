"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  rankForSlot,
  TIERS,
  TIER_LABELS,
  TIER_RANGES,
  tierItemsSorted,
  type Reading,
  type Tier,
} from "@/lib/readings-store";

type FlowState =
  | { step: "tier" }
  | {
      step: "compare";
      tier: Tier;
      pool: Reading[];
      lo: number;
      hi: number;
    }
  | { step: "saving" }
  | { step: "done" };

export default function RateFlow({
  target,
  readings,
  currentScore,
}: {
  target: Reading;
  readings: Reading[];
  currentScore?: number;
}) {
  const router = useRouter();
  const [state, setState] = useState<FlowState>({ step: "tier" });
  const [error, setError] = useState<string | null>(null);

  const others = useMemo(
    () => readings.filter((r) => r.id !== target.id),
    [readings, target.id],
  );

  async function commit(tier: Tier, tierRank: number) {
    setState({ step: "saving" });
    setError(null);
    try {
      const res = await fetch("/api/admin/readings/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: target.id, tier, tierRank }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Couldn't save.");
        setState({ step: "tier" });
        return;
      }
      setState({ step: "done" });
      router.push("/admin/readings");
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
      setState({ step: "tier" });
    }
  }

  function pickTier(tier: Tier) {
    const pool = tierItemsSorted(others, tier);
    if (pool.length === 0) {
      void commit(tier, 1);
      return;
    }
    setState({ step: "compare", tier, pool, lo: 0, hi: pool.length });
  }

  async function clearRating() {
    setState({ step: "saving" });
    setError(null);
    try {
      const res = await fetch("/api/admin/readings/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: target.id, tier: null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Couldn't save.");
        setState({ step: "tier" });
        return;
      }
      router.push("/admin/readings");
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
      setState({ step: "tier" });
    }
  }

  function choose(preferTarget: boolean) {
    if (state.step !== "compare") return;
    const { tier, pool } = state;
    let { lo, hi } = state;
    const mid = Math.floor((lo + hi) / 2);
    if (preferTarget) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
    if (lo >= hi) {
      const newRank = rankForSlot(pool, lo);
      void commit(tier, newRank);
      return;
    }
    setState({ ...state, lo, hi });
  }

  const headLabel =
    target.title || target.author || target.note || target.link || "(empty)";

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="rounded-md border border-black/[.08] p-4 dark:border-white/[.12]">
        <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
          Rating
        </p>
        <p className="mt-1 text-lg font-medium">{headLabel}</p>
        {target.author && target.title && (
          <p className="text-sm text-zinc-500">{target.author}</p>
        )}
        {typeof currentScore === "number" && target.tier && (
          <p className="mt-2 text-xs text-zinc-500">
            Currently: {currentScore.toFixed(1)} ({TIER_LABELS[target.tier]})
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      {state.step === "tier" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            How did you feel about it?
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {TIERS.map((t) => {
              const [lo, hi] = TIER_RANGES[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => pickTier(t)}
                  className="rounded-md border border-black/[.12] p-4 text-left hover:border-foreground dark:border-white/[.18]"
                >
                  <div className="text-base font-medium">{TIER_LABELS[t]}</div>
                  <div className="mt-1 font-mono text-xs text-zinc-500">
                    {lo.toFixed(1)} – {hi.toFixed(1)}
                  </div>
                </button>
              );
            })}
          </div>
          {target.tier && (
            <button
              type="button"
              onClick={clearRating}
              className="self-start text-sm text-red-600 underline underline-offset-4 hover:text-red-700 dark:text-red-400"
            >
              Remove rating
            </button>
          )}
        </div>
      )}

      {state.step === "compare" && (
        <CompareStep
          target={target}
          opponent={state.pool[Math.floor((state.lo + state.hi) / 2)]}
          progress={progressFor(state)}
          onChoose={choose}
        />
      )}

      {(state.step === "saving" || state.step === "done") && (
        <p className="text-sm text-zinc-500">Saving…</p>
      )}

      <Link
        href="/admin/readings"
        className="self-start text-sm text-zinc-500 hover:text-foreground"
      >
        Cancel
      </Link>
    </div>
  );
}

function progressFor(state: {
  step: "compare";
  pool: Reading[];
  lo: number;
  hi: number;
}): { current: number; total: number } {
  const total = Math.max(1, Math.ceil(Math.log2(state.pool.length + 1)));
  const remainingWindow = state.hi - state.lo;
  const stepsLeft = Math.max(0, Math.ceil(Math.log2(Math.max(1, remainingWindow))));
  const current = Math.min(total, total - stepsLeft + 1);
  return { current, total };
}

function CompareStep({
  target,
  opponent,
  progress,
  onChoose,
}: {
  target: Reading;
  opponent: Reading;
  progress: { current: number; total: number };
  onChoose: (preferTarget: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Which did you like more?{" "}
        <span className="font-mono text-xs text-zinc-500">
          ({progress.current}/{progress.total})
        </span>
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CompareCard reading={target} onClick={() => onChoose(true)} />
        <CompareCard reading={opponent} onClick={() => onChoose(false)} />
      </div>
    </div>
  );
}

function CompareCard({
  reading,
  onClick,
}: {
  reading: Reading;
  onClick: () => void;
}) {
  const head = reading.title || reading.author || reading.note || reading.link || "(empty)";
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-black/[.12] p-5 text-left hover:border-foreground hover:bg-black/[.02] dark:border-white/[.18] dark:hover:bg-white/[.03]"
    >
      <div className="text-base font-medium">{head}</div>
      {reading.author && reading.title && (
        <div className="mt-1 text-sm text-zinc-500">{reading.author}</div>
      )}
      {reading.note && (
        <div className="mt-2 line-clamp-3 text-xs text-zinc-500">
          {reading.note}
        </div>
      )}
    </button>
  );
}
