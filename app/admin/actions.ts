"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import {
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  checkCredentials,
  createSessionToken,
  sessionCookieOptions,
  requireAdmin,
  AuthError,
  COOKIE_NAME,
} from "@/lib/auth";
import { r2Client, bucket } from "@/lib/r2";
import { mutateManifest, getManifestFresh } from "@/lib/manifest";
import type { ActionResult, PhotoRecord } from "@/lib/types";
import {
  ALLOWED_MIME,
  LIMITS,
  cleanText,
  cleanTags,
  isValidId,
} from "@/lib/validate";

// Convierte errores en resultados tipados (la UI muestra toast y, si es
// UNAUTHORIZED, redirige al login).
async function guarded(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn();
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: "UNAUTHORIZED" };
    console.error("[admin action]", err);
    return { ok: false, error: "Algo salió mal. Probá de nuevo." };
  }
}

export type LoginState = { error: string | null; user?: string };

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const user = String(formData.get("user") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!checkCredentials(user, password)) {
    // Freno soft contra fuerza bruta. Se devuelve `user` porque React 19
    // resetea el form tras la action → sin esto el campo queda vacío.
    await new Promise((r) => setTimeout(r, 500));
    return { error: "Usuario o contraseña incorrectos", user };
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createSessionToken(), sessionCookieOptions());
  redirect("/admin");
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/admin/login");
}

// ── Upload ───────────────────────────────────────────────────────────────────

export type PresignTarget = {
  key: string;
  url: string;
  headers: Record<string, string>;
};

export type PresignedUpload = {
  id: string;
  ext: string;
  puts: { original: PresignTarget; display: PresignTarget; thumb: PresignTarget };
};

const IMMUTABLE = "public, max-age=31536000, immutable";

async function presignPut(
  key: string,
  contentType: string
): Promise<PresignTarget> {
  const url = await getSignedUrl(
    r2Client(),
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      ContentType: contentType,
      CacheControl: IMMUTABLE,
    }),
    { expiresIn: 600 }
  );
  return {
    key,
    url,
    headers: { "Content-Type": contentType, "Cache-Control": IMMUTABLE },
  };
}

// URLs prefirmadas para subir directo browser→R2 (el límite de 1MB de las
// actions y el de 4.5MB de Vercel no aplican). Las keys son 100% server-side.
export async function presignUpload(
  files: { type: string; size: number }[]
): Promise<{ ok: true; uploads: PresignedUpload[] } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    if (!Array.isArray(files) || files.length === 0) {
      return { ok: false, error: "Sin archivos" };
    }
    if (files.length > LIMITS.uploadBatch) {
      return { ok: false, error: `Máximo ${LIMITS.uploadBatch} fotos por tanda` };
    }
    const uploads: PresignedUpload[] = [];
    for (const f of files) {
      const ext = ALLOWED_MIME[f.type];
      if (!ext) return { ok: false, error: `Formato no soportado: ${f.type}` };
      if (f.size > LIMITS.fileBytes) {
        return { ok: false, error: "Hay archivos de más de 50MB" };
      }
      const id = crypto.randomUUID();
      const [original, display, thumb] = await Promise.all([
        presignPut(`photos/${id}/original.${ext}`, f.type),
        presignPut(`photos/${id}/display.webp`, "image/webp"),
        presignPut(`photos/${id}/thumb.webp`, "image/webp"),
      ]);
      uploads.push({ id, ext, puts: { original, display, thumb } });
    }
    return { ok: true, uploads };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: "UNAUTHORIZED" };
    console.error("[presignUpload]", err);
    return { ok: false, error: "No se pudo preparar la subida" };
  }
}

export type CommitEntry = {
  id: string;
  ext: string;
  title: string;
  alt: string;
  tags?: string[];
  width: number;
  height: number;
};

// Registra en el manifest fotos ya subidas al bucket. Verifica que los objetos
// existan de verdad y que el original no exceda el límite (el presigned PUT no
// puede fijar tamaño máximo — este es el check real).
export async function commitUploads(
  entries: CommitEntry[]
): Promise<ActionResult> {
  return guarded(async () => {
    const records: PhotoRecord[] = [];
    for (const e of entries) {
      if (!isValidId(e.id) || !/^(jpg|png|webp)$/.test(e.ext)) {
        throw new Error(`Entrada inválida: ${e.id}`);
      }
      const keys = {
        original: `photos/${e.id}/original.${e.ext}`,
        display: `photos/${e.id}/display.webp`,
        thumb: `photos/${e.id}/thumb.webp`,
      };
      const [orig] = await Promise.all([
        r2Client().send(
          new HeadObjectCommand({ Bucket: bucket(), Key: keys.original })
        ),
        r2Client().send(
          new HeadObjectCommand({ Bucket: bucket(), Key: keys.display })
        ),
        r2Client().send(
          new HeadObjectCommand({ Bucket: bucket(), Key: keys.thumb })
        ),
      ]);
      const bytes = orig.ContentLength ?? 0;
      if (bytes > LIMITS.fileBytes) {
        await r2Client().send(
          new DeleteObjectsCommand({
            Bucket: bucket(),
            Delete: { Objects: Object.values(keys).map((Key) => ({ Key })) },
          })
        );
        throw new Error(`Archivo demasiado grande: ${e.id}`);
      }
      records.push({
        id: e.id,
        title: cleanText(e.title, LIMITS.title) || "Untitled",
        alt: cleanText(e.alt, LIMITS.alt) || cleanText(e.title, LIMITS.alt),
        tags: cleanTags(e.tags ?? []),
        inHome: false,
        homeOrder: 0,
        width: Math.max(0, Math.floor(e.width)),
        height: Math.max(0, Math.floor(e.height)),
        bytes,
        createdAt: new Date().toISOString(),
        keys,
      });
    }
    await mutateManifest((m) => {
      const existing = new Set(m.photos.map((p) => p.id));
      for (const r of records) {
        if (existing.has(r.id)) continue;
        m.photos.push(r);
        for (const t of r.tags) {
          if (!m.tags.some((x) => x.toLowerCase() === t.toLowerCase())) {
            m.tags.push(t);
          }
        }
      }
    });
    updateTag("photos");
  });
}

// ── Edición ──────────────────────────────────────────────────────────────────

export async function updatePhoto(
  id: string,
  patch: { title?: string; alt?: string; tags?: string[] }
): Promise<ActionResult> {
  return guarded(async () => {
    if (!isValidId(id)) throw new Error("id inválido");
    const title =
      patch.title !== undefined ? cleanText(patch.title, LIMITS.title) : undefined;
    const alt =
      patch.alt !== undefined ? cleanText(patch.alt, LIMITS.alt) : undefined;
    const tags = patch.tags !== undefined ? cleanTags(patch.tags) : undefined;
    await mutateManifest((m) => {
      const photo = m.photos.find((p) => p.id === id);
      if (!photo) throw new Error("Foto inexistente");
      if (title !== undefined && title) photo.title = title;
      if (alt !== undefined) photo.alt = alt;
      if (tags !== undefined) {
        photo.tags = tags;
        for (const t of tags) {
          if (!m.tags.some((x) => x.toLowerCase() === t.toLowerCase())) {
            m.tags.push(t);
          }
        }
      }
    });
    updateTag("photos");
  });
}

// Una sola action para todo lo bulk: tags y curaduría de home.
export async function bulkUpdate(
  ids: string[],
  patch: { addTags?: string[]; removeTags?: string[]; inHome?: boolean }
): Promise<ActionResult> {
  return guarded(async () => {
    const validIds = ids.filter(isValidId);
    if (validIds.length === 0) throw new Error("Sin fotos");
    const addTags = cleanTags(patch.addTags ?? []);
    const removeTags = cleanTags(patch.removeTags ?? []);
    await mutateManifest((m) => {
      const targets = m.photos.filter((p) => validIds.includes(p.id));
      let nextOrder =
        m.photos.filter((p) => p.inHome).reduce((mx, p) => Math.max(mx, p.homeOrder), 0) + 1;
      // Orden estable: las nuevas entran a la home por fecha de subida.
      const sorted = [...targets].sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt)
      );
      for (const photo of sorted) {
        for (const t of addTags) {
          if (!photo.tags.some((x) => x.toLowerCase() === t.toLowerCase())) {
            photo.tags.push(t);
          }
          if (!m.tags.some((x) => x.toLowerCase() === t.toLowerCase())) {
            m.tags.push(t);
          }
        }
        if (removeTags.length > 0) {
          photo.tags = photo.tags.filter(
            (x) => !removeTags.some((t) => t.toLowerCase() === x.toLowerCase())
          );
        }
        if (patch.inHome === true && !photo.inHome) {
          photo.inHome = true;
          photo.homeOrder = nextOrder++;
        } else if (patch.inHome === false) {
          photo.inHome = false;
        }
      }
    });
    updateTag("photos");
  });
}

// Borra fotos del bucket (las 3 variantes) y del manifest.
export async function deletePhotos(ids: string[]): Promise<ActionResult> {
  return guarded(async () => {
    const validIds = ids.filter(isValidId);
    if (validIds.length === 0) throw new Error("Sin fotos");
    let removed: PhotoRecord[] = [];
    await mutateManifest((m) => {
      removed = m.photos.filter((p) => validIds.includes(p.id));
      m.photos = m.photos.filter((p) => !validIds.includes(p.id));
    });
    // Los objetos se borran después de sacarlos del manifest: si algo falla acá
    // quedan huérfanos invisibles (limpieza en fase 2), nunca fotos rotas.
    const keys = removed.flatMap((p) => Object.values(p.keys));
    for (let i = 0; i < keys.length; i += 1000) {
      await r2Client().send(
        new DeleteObjectsCommand({
          Bucket: bucket(),
          Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })) },
        })
      );
    }
    updateTag("photos");
  });
}

// Borra objetos de photos/ que no están en el manifest (tandas canceladas,
// uploads cortados). Solo objetos con >24h de antigüedad: una tanda en revisión
// abierta en otra pestaña nunca se toca.
export async function cleanupOrphans(): Promise<
  { ok: true; deleted: number } | { ok: false; error: string }
> {
  try {
    await requireAdmin();
    const manifest = await getManifestFresh();
    const known = new Set(
      manifest.photos.flatMap((p) => Object.values(p.keys))
    );
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const orphans: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await r2Client().send(
        new ListObjectsV2Command({
          Bucket: bucket(),
          Prefix: "photos/",
          ContinuationToken: cursor,
        })
      );
      for (const obj of page.Contents ?? []) {
        if (
          obj.Key &&
          !known.has(obj.Key) &&
          (obj.LastModified?.getTime() ?? Date.now()) < cutoff
        ) {
          orphans.push(obj.Key);
        }
      }
      cursor = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (cursor);

    for (let i = 0; i < orphans.length; i += 1000) {
      await r2Client().send(
        new DeleteObjectsCommand({
          Bucket: bucket(),
          Delete: {
            Objects: orphans.slice(i, i + 1000).map((Key) => ({ Key })),
          },
        })
      );
    }
    return { ok: true, deleted: orphans.length };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: "UNAUTHORIZED" };
    console.error("[cleanupOrphans]", err);
    return { ok: false, error: "No se pudo limpiar" };
  }
}

export async function createTag(name: string): Promise<ActionResult> {
  return guarded(async () => {
    const tag = cleanTags([name])[0];
    if (!tag) throw new Error("Tag inválido");
    await mutateManifest((m) => {
      if (!m.tags.some((x) => x.toLowerCase() === tag.toLowerCase())) {
        m.tags.push(tag);
      }
    });
    updateTag("photos");
  });
}
