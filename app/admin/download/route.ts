import type { NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getObjectResponse } from "@/lib/r2";

export const dynamic = "force-dynamic";

// Solo keys de variantes de foto (evita path traversal / lecturas arbitrarias
// como el _meta/manifest.json).
const KEY_RE =
  /^photos\/[a-z0-9-]{1,64}\/(original\.(jpg|png|webp)|display\.webp|thumb\.webp)$/;

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "download";
}

// Descarga same-origin: proxea el objeto de R2 y lo fuerza como attachment.
// Al ser el mismo origen que el admin, no depende de CORS del bucket.
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return new Response("Unauthorized", { status: 401 });
  }
  const key = req.nextUrl.searchParams.get("key") ?? "";
  const name = req.nextUrl.searchParams.get("name") ?? "download";
  if (!KEY_RE.test(key)) {
    return new Response("Bad key", { status: 400 });
  }

  const res = await getObjectResponse(key);
  if (!res.ok || !res.body) {
    return new Response("Not found", { status: res.status || 404 });
  }

  const headers = new Headers();
  headers.set(
    "content-type",
    res.headers.get("content-type") ?? "application/octet-stream"
  );
  const len = res.headers.get("content-length");
  if (len) headers.set("content-length", len);
  headers.set(
    "content-disposition",
    `attachment; filename="${sanitizeFilename(name)}"`
  );
  return new Response(res.body, { status: 200, headers });
}
