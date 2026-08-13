import HomeClient from "./components/HomeClient";
import { getManifest } from "@/lib/manifest";
import { publicUrl } from "@/lib/r2";
import {
  placeholderPhotos,
  MIN_HOME_PHOTOS,
  type Photo,
} from "./lib/grid-layout";

export default async function Home() {
  let photos: Photo[] = [];
  try {
    const manifest = await getManifest();
    const inHome = manifest.photos
      .filter((p) => p.inHome)
      .sort(
        (a, b) =>
          a.homeOrder - b.homeOrder || a.createdAt.localeCompare(b.createdAt)
      );

    // Cascada de fallbacks — la home nunca queda vacía ni "empapelada":
    // 1. Sin curaduría → todas las fotos (default de portfolio completo).
    // 2. Curaduría corta (<MIN) → se completa con las más recientes no curadas,
    //    porque el mosaico repite el pool completo y con pocas fotos la
    //    repetición se nota enseguida.
    // 3. Sin fotos o manifest ilegible → placeholders (catch de abajo).
    let pool =
      inHome.length === 0
        ? [...manifest.photos].sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt)
          )
        : inHome;
    if (pool.length > 0 && pool.length < MIN_HOME_PHOTOS) {
      const padding = manifest.photos
        .filter((p) => !pool.some((x) => x.id === p.id))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, MIN_HOME_PHOTOS - pool.length);
      pool = [...pool, ...padding];
    }

    photos = pool.map((p) => ({
      id: p.id,
      src: publicUrl(p.keys.display),
      alt: p.alt,
      width: p.width,
      height: p.height,
    }));
  } catch {
    // Manifest ilegible o R2 caído → placeholders (el sitio nunca se rompe).
    photos = [];
  }

  return <HomeClient photos={photos.length > 0 ? photos : placeholderPhotos()} />;
}
