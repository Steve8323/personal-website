import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { projects } from "@/lib/projects";

export default function Home() {
  const recentPosts = getAllPosts().slice(0, 3);
  const featuredProjects = projects.slice(0, 2);

  return (
    <div className="flex flex-col gap-16">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Hi, I&apos;m Steve.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
          I work on optical and photonic computing — building systems that compute with light
          instead of electrons. This site is where I write down what I&apos;m thinking about,
          show what I&apos;m building, and share the things I&apos;ve been reading.
        </p>
        <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
          If you&apos;d like to grab lunch and talk about something interesting,{" "}
          <Link href="/lunch" className="text-foreground underline underline-offset-4">
            send me a note
          </Link>
          .
        </p>
      </section>

      {featuredProjects.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-500">
              Selected work
            </h2>
            <Link href="/work" className="text-sm text-zinc-500 hover:text-foreground">
              all →
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-black/[.06] dark:divide-white/[.08]">
            {featuredProjects.map((p) => (
              <li key={p.slug} className="py-4">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-medium">{p.title}</h3>
                  <span className="font-mono text-xs text-zinc-500">{p.year}</span>
                </div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {p.summary}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recentPosts.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-500">
              Recent writing
            </h2>
            <Link href="/blog" className="text-sm text-zinc-500 hover:text-foreground">
              all →
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-black/[.06] dark:divide-white/[.08]">
            {recentPosts.map((post) => (
              <li key={post.slug} className="py-4">
                <Link href={`/blog/${post.slug}`} className="group block">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="font-medium group-hover:underline underline-offset-4">
                      {post.title}
                    </h3>
                    <span className="font-mono text-xs text-zinc-500">
                      {post.dateLabel}
                    </span>
                  </div>
                  {post.excerpt && (
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {post.excerpt}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
