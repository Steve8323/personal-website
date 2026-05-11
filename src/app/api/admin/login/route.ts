import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  checkPassword,
  createSessionValue,
} from "@/lib/auth";

export async function POST(request: Request) {
  if (!process.env.ADMIN_PASSWORD) {
    return Response.json(
      { error: "Admin login is not configured (set ADMIN_PASSWORD)." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const password =
    body && typeof body === "object" && "password" in body
      ? (body as { password: unknown }).password
      : null;

  if (typeof password !== "string" || password.length === 0) {
    return Response.json({ error: "Password required" }, { status: 400 });
  }

  if (!checkPassword(password)) {
    return Response.json({ error: "Wrong password" }, { status: 401 });
  }

  const sessionValue = await createSessionValue();
  if (!sessionValue) {
    return Response.json({ error: "Could not create session" }, { status: 500 });
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return Response.json({ ok: true });
}
