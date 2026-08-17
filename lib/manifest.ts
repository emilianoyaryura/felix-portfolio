import "server-only";
import {
  GetObjectCommand,
  PutObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { unstable_cache } from "next/cache";
import { r2Client, bucket } from "./r2";
import type { Manifest } from "./types";

const MANIFEST_KEY = "_meta/manifest.json";
const BACKUP_KEY = "_meta/manifest.prev.json";

export function emptyManifest(): Manifest {
  return { version: 1, updatedAt: "", tags: [], photos: [] };
}

type FetchedManifest = { manifest: Manifest; etag: string | null };

// Lee el manifest del bucket. Inexistente → default vacío. JSON inválido →
// LANZA: nunca hay que pisar un manifest que no se pudo parsear (se recupera
// a mano desde _meta/manifest.prev.json).
async function fetchFromR2(): Promise<FetchedManifest> {
  try {
    const res = await r2Client().send(
      new GetObjectCommand({ Bucket: bucket(), Key: MANIFEST_KEY })
    );
    const body = await res.Body!.transformToString();
    const manifest = JSON.parse(body) as Manifest;
    if (!Array.isArray(manifest.photos) || !Array.isArray(manifest.tags)) {
      throw new Error("Manifest con estructura inválida");
    }
    return { manifest, etag: res.ETag ?? null };
  } catch (err) {
    // Manifest inexistente (bucket recién creado) → arrancar vacío. En Node el
    // aws-sdk lo reporta como name "NoSuchKey", pero R2 sobre workerd (Cloudflare)
    // puede darle otro name para el mismo 404 → tratamos cualquier 404/NotFound
    // como "todavía no existe" para no confundirlo con un manifest corrupto.
    const e = err as {
      name?: string;
      Code?: string;
      $metadata?: { httpStatusCode?: number };
    };
    if (
      e.name === "NoSuchKey" ||
      e.name === "NotFound" ||
      e.Code === "NoSuchKey" ||
      e.$metadata?.httpStatusCode === 404
    ) {
      return { manifest: emptyManifest(), etag: null };
    }
    // Cualquier otra cosa es un fallo real (auth, red, JSON inválido) → se loguea
    // para verlo en los Live Logs del Worker antes de re-lanzar.
    console.error(
      "[manifest] lectura falló:",
      e.name,
      e.$metadata?.httpStatusCode,
      err
    );
    throw err;
  }
}

// Lectura cacheada para la home pública. Se invalida con updateTag("photos").
export const getManifest = unstable_cache(
  async () => (await fetchFromR2()).manifest,
  ["manifest"],
  { tags: ["photos"] }
);

// Lectura sin cache para el admin (siempre fresca).
export async function getManifestFresh(): Promise<Manifest> {
  return (await fetchFromR2()).manifest;
}

// Serializa mutaciones dentro de la misma instancia (un solo admin ⇒ cubre el
// caso real; para instancias concurrentes está el conditional PUT de abajo).
let chain: Promise<unknown> = Promise.resolve();

// Read-modify-write con backup y escritura condicional (If-Match por ETag;
// 412 → releer y reaplicar, hasta 3 intentos). El primer write usa
// If-None-Match:* para no pisar una creación concurrente.
export function mutateManifest(
  fn: (m: Manifest) => Manifest | void
): Promise<Manifest> {
  const run = chain.then(() => mutateWithRetry(fn));
  chain = run.catch(() => {});
  return run;
}

async function mutateWithRetry(
  fn: (m: Manifest) => Manifest | void,
  attempt = 0
): Promise<Manifest> {
  const { manifest, etag } = await fetchFromR2();
  const draft = structuredClone(manifest);
  const next = fn(draft) ?? draft;
  next.updatedAt = new Date().toISOString();
  next.tags = [...next.tags].sort((a, b) => a.localeCompare(b));

  if (etag) {
    // Backup del estado actual antes de sobreescribir (undo de 1 nivel).
    await r2Client()
      .send(
        new CopyObjectCommand({
          Bucket: bucket(),
          CopySource: `${bucket()}/${MANIFEST_KEY}`,
          Key: BACKUP_KEY,
        })
      )
      .catch(() => {});
  }

  const put = new PutObjectCommand({
    Bucket: bucket(),
    Key: MANIFEST_KEY,
    Body: JSON.stringify(next),
    ContentType: "application/json",
    CacheControl: "no-cache",
    ...(etag ? { IfMatch: etag } : { IfNoneMatch: "*" }),
  });

  try {
    await r2Client().send(put);
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;
    // 412: otro proceso escribió en el medio → releer y reaplicar.
    if (status === 412 && attempt < 3) {
      return mutateWithRetry(fn, attempt + 1);
    }
    // 501: el proveedor no soporta writes condicionales → escribir sin
    // condición (el mutex in-process sigue serializando).
    if (status === 501) {
      await r2Client().send(
        new PutObjectCommand({
          Bucket: bucket(),
          Key: MANIFEST_KEY,
          Body: JSON.stringify(next),
          ContentType: "application/json",
          CacheControl: "no-cache",
        })
      );
      return next;
    }
    throw err;
  }
  return next;
}
