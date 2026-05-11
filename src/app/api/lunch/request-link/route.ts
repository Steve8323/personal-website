import { Resend } from "resend";
import {
  generateMagicLinkToken,
} from "@/lib/lunch-auth";
import {
  isLunchConfigured,
  saveMagicLink,
} from "@/lib/lunch-store";

const FROM_EMAIL =
  process.env.LUNCH_FROM_EMAIL || "Steve Hou <onboarding@resend.dev>";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

export async function POST(request: Request) {
  if (!isLunchConfigured()) {
    return Response.json(
      { error: "Lunch sign-up isn't set up yet. Try again later." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email =
    body && typeof body === "object" && "email" in body
      ? (body as { email: unknown }).email
      : null;

  if (typeof email !== "string" || !isValidEmail(email) || email.length > 200) {
    return Response.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  const normalized = email.trim().toLowerCase();
  const { token } = await generateMagicLinkToken(normalized);
  await saveMagicLink(token, normalized);

  const origin = getOrigin(request);
  const link = `${origin}/api/lunch/verify?token=${encodeURIComponent(token)}`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: normalized,
      subject: "Sign in to apply for lunch with Steve",
      text:
        `Click this link to sign in:\n\n${link}\n\n` +
        `The link expires in 15 minutes. If you didn't request this, you can ignore this email.`,
      html: `
<div style="font-family:-apple-system,system-ui,sans-serif;font-size:14px;line-height:1.6;color:#18181b;max-width:520px;">
  <p>Click below to sign in and apply for lunch:</p>
  <p style="margin:24px 0;">
    <a href="${link}" style="display:inline-block;padding:10px 18px;background:#18181b;color:#fff;text-decoration:none;border-radius:6px;font-weight:500;">Sign in</a>
  </p>
  <p style="color:#71717a;font-size:12px;">Or paste this URL into your browser:<br/><span style="word-break:break-all;">${link}</span></p>
  <p style="color:#71717a;font-size:12px;">The link expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
</div>
      `.trim(),
    });
    if (error) {
      console.error("Resend error:", error);
      return Response.json(
        { error: "Couldn't send the sign-in email. Try again in a moment." },
        { status: 502 },
      );
    }
  } catch (err) {
    console.error("Magic link send threw:", err);
    return Response.json(
      { error: "Couldn't send the sign-in email. Try again in a moment." },
      { status: 502 },
    );
  }

  return Response.json({ ok: true });
}
