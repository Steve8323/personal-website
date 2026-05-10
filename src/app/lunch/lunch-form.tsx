"use client";

import { useState } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export default function LunchForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "submitting" });

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      message: String(formData.get("message") ?? ""),
    };

    try {
      const res = await fetch("/api/lunch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          (data && typeof data.error === "string" && data.error) ||
          "Something went wrong sending your message.";
        setStatus({ kind: "error", message });
        return;
      }

      setStatus({ kind: "success" });
      event.currentTarget.reset();
    } catch {
      setStatus({
        kind: "error",
        message: "Couldn't reach the server. Try again in a moment?",
      });
    }
  }

  if (status.kind === "success") {
    return (
      <div className="rounded-lg border border-black/[.08] p-6 text-sm dark:border-white/[.12]">
        <p className="font-medium">Got it — thanks for reaching out.</p>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          I&apos;ll read your note and reply from{" "}
          <span className="font-mono">contact.levu@proton.me</span>.
        </p>
        <button
          type="button"
          onClick={() => setStatus({ kind: "idle" })}
          className="mt-4 font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-foreground"
        >
          Send another →
        </button>
      </div>
    );
  }

  const isSubmitting = status.kind === "submitting";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          Your name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={120}
          autoComplete="name"
          className="rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/[.18]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          maxLength={200}
          autoComplete="email"
          className="rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/[.18]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="message" className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          What&apos;s on your mind?
        </label>
        <textarea
          id="message"
          name="message"
          required
          minLength={20}
          maxLength={3000}
          rows={7}
          placeholder="A paragraph on why you'd like to grab lunch — or just what you'd like to talk about."
          className="rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/[.18] resize-y"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Sending..." : "Send"}
        </button>
        {status.kind === "error" && (
          <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
        )}
      </div>
    </form>
  );
}
