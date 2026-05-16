import type { Metadata } from "next";
import {
  getState,
  groupReadings,
  personalReadings,
  type Reading,
} from "@/lib/readings-store";

export const metadata: Metadata = {
  title: "Readings · Steve Hou",
};

export const dynamic = "force-dynamic";

export default async function ReadingsPage() {
  const state = await getState();
  const groups = groupReadings(state);
  const personal = personalReadings(state);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Readings</h1>
      <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
        Things I&apos;ve read and would recommend, grouped by what they&apos;re about.
      </p>

      <div className="mt-12 flex flex-col gap-14">
        {groups.length === 0 && personal.length === 0 && (
          <p className="text-sm text-zinc-500">Nothing here yet.</p>
        )}
        {groups.map((g) => (
          <section key={g.name}>
            <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-500">
              {g.name}
            </h2>
            <ul className="mt-4 divide-y divide-black/[.06] dark:divide-white/[.08]">
              {g.items.map((r) => (
                <li key={r.id} className="py-5">
                  <ReadingDetail r={r} />
                </li>
              ))}
            </ul>
          </section>
        ))}
        {personal.length > 0 && (
          <section>
            <ul className="divide-y divide-black/[.06] dark:divide-white/[.08]">
              {personal.map((r) => (
                <li key={r.id} className="py-5">
                  <ReadingDetail r={r} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function ReadingDetail({ r }: { r: Reading }) {
  const head = r.title || r.author || r.note || r.link || "";
  const headIsLink = !r.title && !r.author && !r.note && !!r.link;
  const noteIsHead = !r.title && !r.author && !!r.note;
  const showAuthor = !!r.author && !!r.title;
  const showNote = !!r.note && !noteIsHead;

  return (
    <>
      <h3 className="font-medium">
        {r.link && !headIsLink ? (
          <a
            href={r.link}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline underline-offset-4"
          >
            {head}
          </a>
        ) : headIsLink ? (
          <a
            href={r.link}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm hover:underline underline-offset-4"
          >
            {r.link}
          </a>
        ) : (
          head
        )}
      </h3>
      {showAuthor && (
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{r.author}</p>
      )}
      {showNote && (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{r.note}</p>
      )}
    </>
  );
}
