// Validaciones chicas para inputs de las server actions del admin.

export const LIMITS = {
  title: 200,
  alt: 200,
  tag: 40,
  tagsPerPhoto: 20,
  uploadBatch: 50, // por llamada a presign; el cliente trocea tandas más grandes
  fileBytes: 50 * 1024 * 1024, // 50MB
};

export const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

// Normaliza un tag: trim + colapsar espacios. La comparación es
// case-insensitive (dedupe), el display conserva el casing original.
export function cleanTag(value: unknown): string {
  return cleanText(value, LIMITS.tag).replace(/\s+/g, " ");
}

export function sameTag(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

export function cleanTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const raw of value.slice(0, LIMITS.tagsPerPhoto)) {
    const tag = cleanTag(raw);
    if (tag && !out.some((t) => sameTag(t, tag))) out.push(tag);
  }
  return out;
}

export function isValidId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9-]{1,64}$/.test(value);
}

export function cleanIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isValidId))];
}
