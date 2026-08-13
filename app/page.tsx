import HomeClient from "./components/HomeClient";
import { getManifest } from "@/lib/manifest";
import { publicUrl } from "@/lib/r2";
import { placeholderPhotos, type Photo } from "./lib/grid-layout";

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
    // Sin curaduría todavía → mostrar todas (la home nunca queda vacía).
    const pool = inHome.length > 0 ? inHome : manifest.photos;
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
