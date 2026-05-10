import type { Metadata } from "next";
import { readings } from "@/lib/readings";

export const metadata: Metadata = {
  title: "Readings · Steve Hou",
};

const categoryLabels: Record<string, string> = {
  book: "Book",
  paper: "Paper",
  essay: "Essay",
  talk: "Talk",
};

export default function ReadingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Readings</h1>
      <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
        Things I&apos;ve read and would recommend. Mix of papers, books, and essays — mostly
        on photonics, computing, and how good research gets made.
      </p>

      <ul className="mt-10 divide-y divide-black/[.06] dark:divide-white/[.08]">
        {readings.map((r, i) => (
          <li key={`${r.title}-${i}`} className="py-5">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <h2 className="font-medium">
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
                </h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {r.author}
                </p>
              </div>
              <span className="font-mono text-xs uppercase tracking-widest text-zinc-500 shrink-0">
                {categoryLabels[r.category] ?? r.category}
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {r.note}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
