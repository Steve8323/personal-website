"use client";

import { useState } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string };

export default function LunchSignin() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ kind: "submitting" });
    try {
      const res = await fetch("/api/lunch/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus({
          kind: "error",
          message:
            typeof data.error === "string"
              ? data.error
              : "Couldn't send the sign-in email.",
        });
        return;
      }
      setStatus({ kind: "sent", email });
    } catch {
      setStatus({ kind: "error", message: "Couldn't reach the server." });
    }
  }

  if (status.kind === "sent") {
    return (
      <div className="rounded-lg border border-black/[.08] p-6 text-sm dark:border-white/[.12]">
        <p className="font-medium">Check your inbox.</p>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          I sent a sign-in link to <span className="font-mono">{status.email}</span>.
          Click it to come back here and apply for a lunch slot. The link expires in
          15 minutes.
        </p>
        <button
          type="button"
          onClick={() => setStatus({ kind: "idle" })}
          className="mt-4 font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-foreground"
        >
          Use a different email →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <p className="text-sm text-zinc-500">
        Sign in with your email to apply. I&apos;ll send you a one-click sign-in link.
      </p>
      <div className="flex flex-col gap-2">
        <label
          htmlFor="email"
          className="font-mono text-xs uppercase tracking-widest text-zinc-500"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/[.18]"
        />
      </div>
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={status.kind === "submitting"}
          className="rounded-md bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status.kind === "submitting" ? "Sending..." : "Send sign-in link"}
        </button>
        {status.kind === "error" && (
          <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
        )}
      </div>
    </form>
  );
}
