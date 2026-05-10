import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export default function Home() {
  const posts = getAllPosts();

  return (
    <div className="flex flex-col gap-16">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Hi, I&apos;m Steve.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
          I&apos;m a hard tech founder in stealth who think photonics is the last opportunity
          to get into AI. I&apos;m interested in optical neural networks, virtual optical
          interactions, nanoimprint lithography, laser fusion, and AI alignment. Don&apos;t
          hesitate to{" "}
          <Link href="/lunch" className="text-foreground underline underline-offset-4">
            reach out
          </Link>{" "}
          if you&apos;re interested in talking about the philosophy of superintelligence,
          AI-related neuroscience, or why sleep is important!
        </p>
      </section>

      {posts.length > 0 && (
        <section>
          <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-500">
            Writing
          </h2>
          <ul className="mt-4 divide-y divide-black/[.06] dark:divide-white/[.08]">
            {posts.map((post) => (
              <li key={post.slug} className="py-5">
                <Link href={`/blog/${post.slug}`} className="group block">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="font-medium group-hover:underline underline-offset-4">
                      {post.title}
                    </h3>
                    <span className="font-mono text-xs text-zinc-500 shrink-0">
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
