import { cookies } from "next/headers";
import { LUNCH_SESSION_COOKIE } from "@/lib/lunch-auth";

export async function POST() {
  const jar = await cookies();
  jar.delete(LUNCH_SESSION_COOKIE);
  return Response.json({ ok: true });
}
