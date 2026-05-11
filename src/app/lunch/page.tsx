import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LUNCH_SESSION_COOKIE, verifyLunchSession } from "@/lib/lunch-auth";
import {
  applicationCountsByDate,
  getApplicationsByEmail,
  isLunchConfigured,
} from "@/lib/lunch-store";
import {
  buildCalendar,
  defaultMonthAnchor,
  parseDate,
} from "@/lib/dates";
import LunchSignin from "./lunch-signin";
import LunchCalendar from "./lunch-calendar";

export const metadata: Metadata = {
  title: "Lunch · Steve Hou",
  description: "Apply for lunch with Steve. Compete for a day on the calendar.",
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

  const jar = await cookies();
  const cookie = jar.get(LUNCH_SESSION_COOKIE)?.value;
  const session = await verifyLunchSession(cookie);

  if (!session) {
    return (
      <div>
        <Intro />
        <div className="mt-10">
          <LunchSignin />
        </div>
      </div>
    );
  }

  const anchor = monthParam ? parseDate(monthParam) : defaultMonthAnchor();
  const calendar = buildCalendar(anchor);
  const [counts, myApps] = await Promise.all([
    applicationCountsByDate(),
    getApplicationsByEmail(session.email),
  ]);

  return (
    <div>
      <Intro />
      <div className="mt-10">
        <LunchCalendar
          email={session.email}
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
          myApps={myApps.map((a) => ({
            id: a.id,
            date: a.date,
            message: a.message,
            status: a.status,
            createdAt: a.createdAt,
          }))}
        />
      </div>
    </div>
  );
}

function Intro() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Lunch</h1>
      <p className="mt-3 max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
        Pick a day in the next month and tell me what you&apos;d like to talk about.
        I pick one person per day. The catch: anyone else can apply for that day too,
        and you&apos;ll see how many other people are competing for it.
      </p>
    </>
  );
}
