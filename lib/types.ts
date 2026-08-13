export type PhotoVariantKeys = {
  original: string; // photos/<id>/original.<ext>
  display: string; // photos/<id>/display.webp (~1600px, lo sirve la home)
  thumb: string; // photos/<id>/thumb.webp (~400px, lo usa el admin)
};

export type PhotoRecord = {
  id: string;
  title: string;
  alt: string;
  tags: string[];
  inHome: boolean;
  homeOrder: number; // solo significativo si inHome; max+1 al entrar a home
  width: number; // dimensiones del original (las variantes preservan ratio)
  height: number;
  bytes: number;
  createdAt: string; // ISO
  keys: PhotoVariantKeys;
};

export type Manifest = {
  version: 1;
  updatedAt: string;
  tags: string[]; // catálogo global (unión de tags en uso + creados)
  photos: PhotoRecord[];
};

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };
