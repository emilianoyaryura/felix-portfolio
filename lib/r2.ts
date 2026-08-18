import "server-only";
import { AwsClient } from "aws4fetch";

// R2 vía aws4fetch (fetch + SubtleCrypto), NO el aws-sdk de Amazon: el aws-sdk
// intenta leer ~/.aws/config del filesystem al instanciarse, y en Cloudflare
// Workers (workerd) no hay filesystem → `fs.readFile is not implemented`.
// aws4fetch usa solo APIs nativas del runtime, así que anda en Workers y en Node.

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno ${name}`);
  return v;
}

let _client: AwsClient | null = null;
function client(): AwsClient {
  if (!_client) {
    _client = new AwsClient({
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
      region: "auto",
      service: "s3",
    });
  }
  return _client;
}

export function bucket(): string {
  return env("R2_BUCKET");
}

function endpoint(): string {
  return env("R2_ENDPOINT").replace(/\/$/, "");
}

// Encodea cada segmento de la key sin tocar los "/".
function encodeKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

function objectUrl(key: string): string {
  return `${endpoint()}/${bucket()}/${encodeKey(key)}`;
}

// Normaliza etag (saca el prefijo weak `W/`) para usarlo en If-Match.
function strongEtag(etag: string | null): string | null {
  return etag ? etag.replace(/^W\//, "") : null;
}

// ── Operaciones ──────────────────────────────────────────────────────────────

// GET texto + etag. null si el objeto no existe (404).
export async function getObjectText(
  key: string
): Promise<{ body: string; etag: string | null } | null> {
  const res = await client().fetch(objectUrl(key), { method: "GET" });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`R2 GET ${key} → ${res.status} ${await res.text().catch(() => "")}`);
  }
  return { body: await res.text(), etag: strongEtag(res.headers.get("etag")) };
}

// Response cruda del objeto (para proxear/streamear la descarga). No lanza en
// HTTP de error — el caller inspecciona res.ok/res.status.
export async function getObjectResponse(key: string): Promise<Response> {
  return client().fetch(objectUrl(key), { method: "GET" });
}

type PutOpts = {
  contentType?: string;
  cacheControl?: string;
  ifMatch?: string;
  ifNoneMatch?: string;
};

// PUT. Devuelve el status (NO lanza en respuestas HTTP de error, para que el
// caller maneje 412/501; sí lanza en error de red).
export async function putObject(
  key: string,
  body: string,
  opts: PutOpts = {}
): Promise<{ status: number; ok: boolean; etag: string | null }> {
  const headers: Record<string, string> = {};
  if (opts.contentType) headers["content-type"] = opts.contentType;
  if (opts.cacheControl) headers["cache-control"] = opts.cacheControl;
  if (opts.ifMatch) headers["if-match"] = strongEtag(opts.ifMatch)!;
  if (opts.ifNoneMatch) headers["if-none-match"] = opts.ifNoneMatch;
  const res = await client().fetch(objectUrl(key), { method: "PUT", headers, body });
  return { status: res.status, ok: res.ok, etag: strongEtag(res.headers.get("etag")) };
}

// COPY server-side (para el backup del manifest).
export async function copyObject(srcKey: string, destKey: string): Promise<void> {
  const res = await client().fetch(objectUrl(destKey), {
    method: "PUT",
    headers: { "x-amz-copy-source": `/${bucket()}/${encodeKey(srcKey)}` },
  });
  if (!res.ok) throw new Error(`R2 COPY ${srcKey}→${destKey} → ${res.status}`);
}

// HEAD → content-length, o null si no existe.
export async function headObject(
  key: string
): Promise<{ contentLength: number } | null> {
  const res = await client().fetch(objectUrl(key), { method: "HEAD" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`R2 HEAD ${key} → ${res.status}`);
  return { contentLength: Number(res.headers.get("content-length") ?? 0) };
}

// DELETE (idempotente: 404 cuenta como ok).
export async function deleteObject(key: string): Promise<void> {
  const res = await client().fetch(objectUrl(key), { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`R2 DELETE ${key} → ${res.status}`);
}

export async function deleteObjects(keys: string[]): Promise<void> {
  const CONC = 8;
  for (let i = 0; i < keys.length; i += CONC) {
    await Promise.all(keys.slice(i, i + CONC).map(deleteObject));
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// LIST v2 con paginación. Devuelve key + lastModified (ms).
export async function listObjects(
  prefix: string
): Promise<{ key: string; lastModified: number }[]> {
  const out: { key: string; lastModified: number }[] = [];
  let token: string | undefined;
  do {
    const u = new URL(`${endpoint()}/${bucket()}`);
    u.searchParams.set("list-type", "2");
    u.searchParams.set("prefix", prefix);
    if (token) u.searchParams.set("continuation-token", token);
    const res = await client().fetch(u.toString(), { method: "GET" });
    if (!res.ok) throw new Error(`R2 LIST → ${res.status}`);
    const xml = await res.text();
    for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const block = m[1];
      const key = block.match(/<Key>([\s\S]*?)<\/Key>/)?.[1];
      const lm = block.match(/<LastModified>([\s\S]*?)<\/LastModified>/)?.[1];
      if (key) {
        out.push({
          key: decodeEntities(key),
          lastModified: lm ? Date.parse(lm) : Date.now(),
        });
      }
    }
    const truncated = /<IsTruncated>\s*true\s*<\/IsTruncated>/.test(xml);
    token = truncated
      ? xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1]
      : undefined;
  } while (token);
  return out;
}

// URL prefirmada para subir directo browser→R2 (SigV4 en query). El browser
// manda Content-Type/Cache-Control como headers sin firmar y R2 los aplica.
export async function presignPutUrl(key: string, expiresIn = 600): Promise<string> {
  const u = new URL(objectUrl(key));
  u.searchParams.set("X-Amz-Expires", String(expiresIn));
  const signed = await client().sign(u.toString(), {
    method: "PUT",
    aws: { signQuery: true },
  });
  return signed.url;
}

// URL pública de un objeto (r2.dev o custom domain, sin barra final).
export function publicUrl(key: string): string {
  const base = env("R2_PUBLIC_URL").replace(/\/$/, "");
  return `${base}/${encodeKey(key)}`;
}
