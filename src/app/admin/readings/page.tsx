import type { Metadata } from "next";
import Link from "next/link";
import { getState, isStoreConfigured } from "@/lib/readings-store";
import ReadingsEditor from "./readings-editor";

export const metadata: Metadata = {
  title: "Edit readings",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminReadingsPage() {
  const state = await getState();
  const storeConfigured = isStoreConfigured();

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Edit readings</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/posts"
            className="font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-foreground"
          >
            ← posts
          </Link>
          <Link
            href="/admin/lunches"
            className="font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-foreground"
          >
            lunches →
          </Link>
          <form action="/api/admin/logout" method="post">
            <button
              type="submit"
              className="font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
      {!storeConfigured && (
        <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-medium">Storage isn&apos;t configured yet.</p>
          <p className="mt-1">
            You&apos;re seeing the static seed list. Saves are disabled until
            you provision a KV store on Vercel.
          </p>
        </div>
      )}
      <div className="mt-8">
        <ReadingsEditor
          initialReadings={state.readings}
          initialCategoryOrder={state.categoryOrder}
          storeConfigured={storeConfigured}
        />
      </div>
    </div>
  );
}
