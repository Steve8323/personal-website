import { Resend } from "resend";

const TO_EMAIL = "contact.levu@proton.me";
const FROM_EMAIL = process.env.LUNCH_FROM_EMAIL || "Lunch Form <onboarding@resend.dev>";

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

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { name, email, message } = body as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0 || name.length > 120) {
    return Response.json({ error: "Please include your name." }, { status: 400 });
  }
  if (typeof email !== "string" || !isValidEmail(email) || email.length > 200) {
    return Response.json({ error: "Please include a valid email." }, { status: 400 });
  }
  if (
    typeof message !== "string" ||
    message.trim().length < 20 ||
    message.length > 3000
  ) {
    return Response.json(
      { error: "Please write at least a short paragraph (20+ characters)." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set");
    return Response.json(
      { error: "Email service is not configured yet." },
      { status: 500 },
    );
  }

  const resend = new Resend(apiKey);
  const subject = `[Lunch request] ${name.trim()}`;
  const textBody =
    `New lunch request via stevehou.vercel.app\n\n` +
    `From: ${name.trim()} <${email.trim()}>\n\n` +
    `---\n${message.trim()}\n---\n`;
  const htmlBody = `
    <div style="font-family: -apple-system, system-ui, sans-serif; font-size: 14px; line-height: 1.6; color: #18181b;">
      <p style="margin:0 0 12px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:.08em;">New lunch request</p>
      <p style="margin:0 0 4px;"><strong>${escapeHtml(name.trim())}</strong></p>
      <p style="margin:0 0 16px;"><a href="mailto:${escapeHtml(email.trim())}">${escapeHtml(email.trim())}</a></p>
      <hr style="border:0;border-top:1px solid #e4e4e7;margin:16px 0;" />
      <div style="white-space: pre-wrap;">${escapeHtml(message.trim())}</div>
    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      replyTo: email.trim(),
      subject,
      text: textBody,
      html: htmlBody,
    });

    if (error) {
      console.error("Resend error:", error);
      return Response.json(
        { error: "Couldn't send the email. Please try again later." },
        { status: 502 },
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Email send threw:", err);
    return Response.json(
      { error: "Couldn't send the email. Please try again later." },
      { status: 502 },
    );
  }
}
