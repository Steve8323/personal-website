import { Resend } from "resend";
import {
  getAllApplications,
  pickWinner,
} from "@/lib/lunch-store";
import { formatHumanDate } from "@/lib/dates";

const FROM_EMAIL =
  process.env.LUNCH_FROM_EMAIL || "Steve Hou <onboarding@resend.dev>";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const id =
    body && typeof body === "object" && "id" in body
      ? (body as { id: unknown }).id
      : null;
  if (typeof id !== "string" || id.length === 0) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  const before = await getAllApplications();
  const target = before.find((a) => a.id === id);
  if (!target) {
    return Response.json({ error: "Application not found" }, { status: 404 });
  }

  const winner = await pickWinner(id);
  if (!winner) {
    return Response.json({ error: "Could not pick winner" }, { status: 500 });
  }

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const dateLabel = formatHumanDate(winner.date);
    const zoomLink = process.env.ZOOM_LINK?.trim();

    const textLines = [
      `You've been picked for lunch on ${dateLabel}.`,
      "",
    ];
    if (zoomLink) {
      textLines.push(`Zoom link: ${zoomLink}`, "");
    }
    textLines.push("— Steve");

    const htmlLines = [
      `<p>You've been picked for lunch on <strong>${escapeHtml(dateLabel)}</strong>.</p>`,
    ];
    if (zoomLink) {
      htmlLines.push(
        `<p>Zoom link: <a href="${escapeHtml(zoomLink)}">${escapeHtml(zoomLink)}</a></p>`,
      );
    }
    htmlLines.push(`<p style="margin-top:24px;">— Steve</p>`);

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: winner.email,
        subject: `Lunch confirmed for ${dateLabel}`,
        text: textLines.join("\n"),
        html: `<div style="font-family:-apple-system,system-ui,sans-serif;font-size:14px;line-height:1.6;color:#18181b;max-width:520px;">${htmlLines.join("")}</div>`,
        replyTo: process.env.LUNCH_FROM_EMAIL ? undefined : "contact.levu@proton.me",
      });
    } catch (err) {
      console.error("Failed to email winner:", err);
    }
  }

  return Response.json({ ok: true, application: winner });
}
