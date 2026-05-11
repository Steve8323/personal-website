import type { Metadata } from "next";
import { getReadings, isStoreConfigured } from "@/lib/readings-store";
import ReadingsEditor from "./readings-editor";

export const metadata: Metadata = {
  title: "Edit readings",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminReadingsPage() {
  const readings = await getReadings();
  const storeConfigured = isStoreConfigured();

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Edit readings</h1>
        <form action="/api/admin/logout" method="post">
          <button
            type="submit"
            className="font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-foreground"
            formAction="/api/admin/logout"
          >
            Sign out
          </button>
        </form>
      </div>
      {!storeConfigured && (
        <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-medium">Storage isn&apos;t configured yet.</p>
          <p className="mt-1">
            You&apos;re seeing the static seed list. To save changes, provision a
            KV / Redis store on Vercel and add{" "}
            <code className="font-mono">KV_REST_API_URL</code> and{" "}
            <code className="font-mono">KV_REST_API_TOKEN</code> env vars.
          </p>
        </div>
      )}
      <div className="mt-8">
        <ReadingsEditor
          initial={readings}
          storeConfigured={storeConfigured}
        />
      </div>
    </div>
  );
}
