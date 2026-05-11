"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm({ from }: { from: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Sign-in failed.");
        setSubmitting(false);
        return;
      }
      const dest = from.startsWith("/admin") ? from : "/admin/readings";
      router.push(dest);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="password"
          className="font-mono text-xs uppercase tracking-widest text-zinc-500"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/[.18]"
        />
      </div>
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    </form>
  );
}
