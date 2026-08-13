// Generación de variantes en el browser: decode + resize a webp con canvas.
// El original se sube intacto; display alimenta la home y thumb el admin.

const DISPLAY_MAX = 1600;
const THUMB_MAX = 400;

export type PreparedImage = {
  display: Blob;
  thumb: Blob;
  width: number; // dimensiones del original
  height: number;
};

async function resizeToWebp(
  bitmap: ImageBitmap,
  maxSide: number,
  quality: number
): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("No se pudo generar webp")),
      "image/webp",
      quality
    );
  });
}

// Lanza si el archivo no se puede decodificar (HEIC en Chrome, corrupto, etc.).
export async function prepareImage(file: File): Promise<PreparedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Formato no soportado — convertí a JPG y volvé a subir");
  }
  try {
    const [display, thumb] = await Promise.all([
      resizeToWebp(bitmap, DISPLAY_MAX, 0.82),
      resizeToWebp(bitmap, THUMB_MAX, 0.8),
    ]);
    return { display, thumb, width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

// "09-plaza-de-mayo.jpg" → "Plaza de mayo"
export function titleFromFilename(name: string): string {
  const base = name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/^\d+[-_.\s]*/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "Untitled";
}
