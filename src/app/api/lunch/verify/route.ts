import { cookies } from "next/headers";
import {
  LUNCH_SESSION_COOKIE,
  LUNCH_SESSION_MAX_AGE_SECONDS,
  createLunchSession,
} from "@/lib/lunch-auth";
import {
  consumeMagicLink,
  isLunchConfigured,
  upsertVerifiedUser,
} from "@/lib/lunch-store";

function htmlPage(message: string, status = 200) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Lunch sign-in</title>
<body style="font-family:-apple-system,system-ui,sans-serif;background:#fafaf9;color:#18181b;min-height:100vh;display:flex;align-items:center;justify-content:center;margin:0;">
  <div style="max-width:420px;padding:32px;text-align:center;">
    <p style="font-size:14px;line-height:1.6;">${message}</p>
    <p style="margin-top:24px;"><a href="/lunch" style="font-size:13px;color:#18181b;">Back to lunch →</a></p>
  </div>
</body>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: Request) {
  if (!isLunchConfigured()) {
    return htmlPage("Lunch sign-in isn't set up on this site yet.", 503);
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return htmlPage("Missing token. Open the link from your email.", 400);
  }

  const email = await consumeMagicLink(token);
  if (!email) {
    return htmlPage(
      "That sign-in link is invalid or has expired. Request a new one from the lunch page.",
      400,
    );
  }

  await upsertVerifiedUser(email);

  const session = await createLunchSession(email);
  if (!session) {
    return htmlPage("Something went wrong creating your session.", 500);
  }

  const jar = await cookies();
  jar.set(LUNCH_SESSION_COOKIE, session, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LUNCH_SESSION_MAX_AGE_SECONDS,
  });

  return Response.redirect(new URL("/lunch", request.url), 303);
}
