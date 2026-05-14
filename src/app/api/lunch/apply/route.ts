import { Resend } from "resend";
import {
  applicationCountsByDate,
  createApplication,
  isLunchConfigured,
} from "@/lib/lunch-store";
import { formatHumanDate, isWithinWindow, parseDate } from "@/lib/dates";

const FROM_EMAIL =
  process.env.LUNCH_FROM_EMAIL || "Steve Hou <onboarding@resend.dev>";

const ADMIN_NOTIFY_EMAIL = "contact.levu@proton.me";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getOrigin(request: Request): string {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost && forwardedProto) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return `${url.protocol}//${url.host}`;
}

async function notifyAdmin(input: {
  origin: string;
  email: string;
  date: string;
  message: string;
  competitorCount: number;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const dateLabel = formatHumanDate(input.date);
  const messageText = input.message.trim() || "(no message)";
  const adminUrl = `${input.origin}/admin/lunches`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_NOTIFY_EMAIL,
      subject: `[Lunch] ${input.email} applied for ${dateLabel}`,
      replyTo: input.email,
      text:
        `${input.email} applied for ${dateLabel}.\n\n` +
        (input.competitorCount > 1
          ? `${input.competitorCount} total applicants for that day so far.\n\n`
          : "") +
        `---\n${messageText}\n---\n\n` +
        `Manage: ${adminUrl}\n`,
      html: `
<div style="font-family:-apple-system,system-ui,sans-serif;font-size:14px;line-height:1.6;color:#18181b;max-width:540px;">
  <p style="margin:0 0 8px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:.08em;">New lunch application</p>
  <p style="margin:0 0 4px;"><strong>${escapeHtml(input.email)}</strong></p>
  <p style="margin:0 0 16px;color:#52525b;">${escapeHtml(dateLabel)}${
    input.competitorCount > 1
      ? ` · ${input.competitorCount} total applicants so far`
      : ""
  }</p>
  <hr style="border:0;border-top:1px solid #e4e4e7;margin:16px 0;" />
  <div style="white-space:pre-wrap;">${escapeHtml(messageText)}</div>
  <p style="margin-top:24px;font-size:12px;"><a href="${escapeHtml(adminUrl)}">Manage applications →</a></p>
</div>
      `.trim(),
    });
    if (error) {
      console.error("Admin notification rejected by Resend:", error);
    }
  } catch (err) {
    console.error("Admin notification send threw:", err);
  }
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
  if (typeof message !== "string" || message.length > 3000) {
    return Response.json({ error: "Message is too long." }, { status: 400 });
  }

  const result = await createApplication({
    email: email.trim(),
    date,
    message: message.trim(),
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 409 });
  }

  const counts = await applicationCountsByDate();
  await notifyAdmin({
    origin: getOrigin(request),
    email: email.trim(),
    date,
    message: typeof message === "string" ? message : "",
    competitorCount: counts[date] || 1,
  });

  return Response.json({ ok: true });
}
