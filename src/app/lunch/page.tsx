import type { Metadata } from "next";
import LunchForm from "./lunch-form";

export const metadata: Metadata = {
  title: "Lunch · Steve Hou",
  description: "Send a note if you'd like to grab lunch.",
};

export default function LunchPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Lunch</h1>
      <p className="mt-3 max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
        I like meeting new people over lunch. If there&apos;s something you&apos;d like to
        talk about — an idea you&apos;re wrestling with, a project, an introduction, or just
        a good conversation — write a paragraph below and I&apos;ll get back to you.
      </p>
      <p className="mt-3 max-w-xl text-sm text-zinc-500">
        I read every message myself. The more specific you are about what you&apos;d like to
        talk about, the more likely I&apos;ll have a useful response.
      </p>

      <div className="mt-10">
        <LunchForm />
      </div>
    </div>
  );
}
