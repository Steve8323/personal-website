import { cookies } from "next/headers";
import { LUNCH_SESSION_COOKIE, verifyLunchSession } from "@/lib/lunch-auth";
import {
  createApplication,
  deleteApplication,
  isLunchConfigured,
} from "@/lib/lunch-store";
import { isWithinWindow, parseDate } from "@/lib/dates";

async function getEmail(): Promise<string | null> {
  const jar = await cookies();
  const cookie = jar.get(LUNCH_SESSION_COOKIE)?.value;
  const session = await verifyLunchSession(cookie);
  return session?.email ?? null;
}

export async function POST(request: Request) {
  if (!isLunchConfigured()) {
    return Response.json({ error: "Lunch isn't set up yet." }, { status: 503 });
  }
  const email = await getEmail();
  if (!email) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { date, message } = body as Record<string, unknown>;

  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Invalid date." }, { status: 400 });
  }
  if (!isWithinWindow(parseDate(date))) {
    return Response.json(
      { error: "That date is past or beyond the application window." },
      { status: 400 },
    );
  }
  if (
    typeof message !== "string" ||
    message.trim().length < 20 ||
    message.length > 3000
  ) {
    return Response.json(
      { error: "Write at least a short paragraph (20+ characters)." },
      { status: 400 },
    );
  }

  const result = await createApplication({
    email,
    date,
    message: message.trim(),
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 409 });
  }

  return Response.json({ ok: true, application: result.application });
}

export async function DELETE(request: Request) {
  if (!isLunchConfigured()) {
    return Response.json({ error: "Lunch isn't set up yet." }, { status: 503 });
  }
  const email = await getEmail();
  if (!email) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }
  const removed = await deleteApplication(id, email);
  if (!removed) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
