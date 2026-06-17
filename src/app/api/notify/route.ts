import { Resend } from "resend";

// Reuses the same Resend setup as the lunch form. Falls back to Resend's
// shared test sender, which can only deliver to the account's verified address.
const FROM_EMAIL =
  process.env.LUNCH_FROM_EMAIL || "Steve Hou <onboarding@resend.dev>";

// Where notifications go. Defaults to the personal address; override via env.
const TO_EMAIL = process.env.NOTIFY_TO_EMAIL || "st.hou@proton.me";

// Constant-time-ish comparison so the token check doesn't leak length/content
// via timing. Good enough for a low-value notify token.
function tokensMatch(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// Simple authenticated relay: an authorized caller POSTs a subject + body and
// this sends it (always to TO_EMAIL — the recipient is fixed server-side, so a
// leaked token can at worst email the owner, never an arbitrary address).
export async function POST(request: Request) {
  const token = process.env.NOTIFY_TOKEN;
  if (!token || !process.env.RESEND_API_KEY) {
    return Response.json({ error: "Notify isn't configured." }, { status: 503 });
  }

  const provided = request.headers.get("x-notify-token") || "";
  if (!tokensMatch(provided, token)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
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

  const { subject, text, html } = body as Record<string, unknown>;

  if (typeof subject !== "string" || subject.length === 0 || subject.length > 300) {
    return Response.json(
      { error: "subject is required (1–300 chars)." },
      { status: 400 },
    );
  }
  if (typeof text !== "string" || text.length === 0 || text.length > 20000) {
    return Response.json(
      { error: "text is required (1–20000 chars)." },
      { status: 400 },
    );
  }
  const htmlBody =
    typeof html === "string" && html.length > 0 && html.length <= 50000
      ? html
      : undefined;

  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      subject,
      text,
      ...(htmlBody ? { html: htmlBody } : {}),
    });
    if (error) {
      console.error("Notify send rejected by Resend:", error);
      return Response.json({ error: "send_failed", detail: error }, { status: 502 });
    }
    return Response.json({ ok: true, id: data?.id ?? null });
  } catch (err) {
    console.error("Notify send threw:", err);
    return Response.json({ error: "send_threw" }, { status: 500 });
  }
}
