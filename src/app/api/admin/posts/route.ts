import {
  deletePost,
  getAllPosts,
  isPostsStoreConfigured,
  upsertPost,
} from "@/lib/posts-store";

export async function GET() {
  const posts = await getAllPosts();
  return Response.json({
    posts,
    storeConfigured: isPostsStoreConfigured(),
  });
}

export async function POST(request: Request) {
  if (!isPostsStoreConfigured()) {
    return Response.json(
      { error: "Storage isn't configured. Add KV env vars." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const { id, slug, title, date, excerpt, content } = body as Record<
    string,
    unknown
  >;

  if (typeof title !== "string" || title.trim().length === 0) {
    return Response.json({ error: "Title is required." }, { status: 400 });
  }
  if (typeof date !== "string") {
    return Response.json({ error: "Date is required." }, { status: 400 });
  }
  if (typeof content !== "string") {
    return Response.json({ error: "Content is required." }, { status: 400 });
  }

  const result = await upsertPost({
    id: typeof id === "string" && id ? id : undefined,
    slug: typeof slug === "string" && slug ? slug : undefined,
    title,
    date,
    excerpt: typeof excerpt === "string" ? excerpt : undefined,
    content,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({ ok: true, post: result.post });
}

export async function DELETE(request: Request) {
  if (!isPostsStoreConfigured()) {
    return Response.json(
      { error: "Storage isn't configured." },
      { status: 500 },
    );
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }
  const ok = await deletePost(id);
  if (!ok) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
