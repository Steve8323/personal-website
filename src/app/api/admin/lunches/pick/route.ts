import {
  getAllApplications,
  pickWinner,
} from "@/lib/lunch-store";

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

  return Response.json({ ok: true, application: winner });
}
