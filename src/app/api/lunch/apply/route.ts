import {
  createApplication,
  isLunchConfigured,
} from "@/lib/lunch-store";
import { isWithinWindow, parseDate } from "@/lib/dates";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  if (!isLunchConfigured()) {
    return Response.json({ error: "Lunch isn't set up yet." }, { status: 503 });
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

  const { email, date, message } = body as Record<string, unknown>;

  if (typeof email !== "string" || !isValidEmail(email) || email.length > 200) {
    return Response.json({ error: "Please enter a valid email." }, { status: 400 });
  }
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
    email: email.trim(),
    date,
    message: message.trim(),
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 409 });
  }

  return Response.json({ ok: true });
}
