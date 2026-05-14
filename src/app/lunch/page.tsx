import type { Metadata } from "next";
import {
  applicationCountsByDate,
  isLunchConfigured,
} from "@/lib/lunch-store";
import {
  buildCalendar,
  defaultMonthAnchor,
  parseDate,
} from "@/lib/dates";
import LunchCalendar from "./lunch-calendar";

export const metadata: Metadata = {
  title: "Lunch · Steve Hou",
  description: "Apply for lunch with Steve.",
};

export const dynamic = "force-dynamic";

export default async function LunchPage(props: PageProps<"/lunch">) {
  const sp = await props.searchParams;
  const monthParam = typeof sp.month === "string" ? sp.month : null;

  if (!isLunchConfigured()) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lunch</h1>
        <p className="mt-4 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
          The lunch sign-up isn&apos;t configured yet. Try emailing{" "}
          <a
            href="mailto:contact.levu@proton.me"
            className="font-mono underline underline-offset-4"
          >
            contact.levu@proton.me
          </a>{" "}
          in the meantime.
        </p>
      </div>
    );
  }

  const anchor = monthParam ? parseDate(monthParam) : defaultMonthAnchor();
  const calendar = buildCalendar(anchor);
  const counts = await applicationCountsByDate();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Lunch</h1>
      {/* ↓ Edit this line to change the subtitle. ↓ */}
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Based off the system at that one college that rejected me. I wanted to have something like this with my mentors and I'm always down to meet new people, so this is my solution!
      </p>
      <div className="mt-8">
        <LunchCalendar
          calendar={{
            monthLabel: calendar.monthLabel,
            cells: calendar.cells.map((c) => ({
              iso: c.iso,
              label: c.label,
              inMonth: c.inMonth,
              isPast: c.isPast,
              isAvailable: c.isAvailable,
            })),
            prevMonth: calendar.prevMonth,
            nextMonth: calendar.nextMonth,
          }}
          counts={counts}
        />
      </div>
    </div>
  );
}
