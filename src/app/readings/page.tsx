import type { Metadata } from "next";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  getReadings,
  groupByCategory,
} from "@/lib/readings-store";

export const metadata: Metadata = {
  title: "Readings · Steve Hou",
};

export const dynamic = "force-dynamic";

export default async function ReadingsPage() {
  const readings = await getReadings();
  const grouped = groupByCategory(readings);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Readings</h1>
      <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
        Things I&apos;ve read and would recommend, grouped by what they&apos;re about.
      </p>

      <div className="mt-12 flex flex-col gap-14">
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped[cat];
          if (items.length === 0) return null;
          return (
            <section key={cat}>
              <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-500">
                {CATEGORY_LABELS[cat]}
              </h2>
              <ul className="mt-4 divide-y divide-black/[.06] dark:divide-white/[.08]">
                {items.map((r) => (
                  <li key={r.id} className="py-5">
                    <h3 className="font-medium">
                      {r.link ? (
                        <a
                          href={r.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline underline-offset-4"
                        >
                          {r.title}
                        </a>
                      ) : (
                        r.title
                      )}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {r.author}
                    </p>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {r.note}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
