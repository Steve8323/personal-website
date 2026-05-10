import type { Metadata } from "next";
import { projects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Work · Steve Hou",
};

export default function WorkPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Work</h1>
      <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
        Selected projects — research, side projects, and things I&apos;m currently building.
      </p>

      <ul className="mt-10 flex flex-col gap-10">
        {projects.map((p) => (
          <li key={p.slug}>
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-lg font-medium">{p.title}</h2>
              <span className="font-mono text-xs text-zinc-500">{p.year}</span>
            </div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {p.summary}
            </p>
            {p.description && (
              <p className="mt-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                {p.description}
              </p>
            )}
            <div className="mt-3 flex items-center gap-4">
              {p.link && (
                <a
                  href={p.link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline underline-offset-4"
                >
                  {p.link.label} →
                </a>
              )}
              {p.tags && p.tags.length > 0 && (
                <div className="flex gap-2">
                  {p.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[11px] uppercase tracking-widest text-zinc-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
