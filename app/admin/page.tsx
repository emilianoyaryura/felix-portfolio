import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getManifestFresh } from "@/lib/manifest";
import { publicUrl } from "@/lib/r2";
import AdminApp from "./components/AdminApp";
import type { AdminPhoto } from "./lib/admin-types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const publicUrlReady = Boolean(process.env.R2_PUBLIC_URL);
  const url = (key: string) => (publicUrlReady ? publicUrl(key) : "");

  let photos: AdminPhoto[] = [];
  let tags: string[] = [];
  let corrupt = false;
  try {
    const manifest = await getManifestFresh();
    tags = manifest.tags;
    photos = manifest.photos.map((p) => ({
      id: p.id,
      title: p.title,
      alt: p.alt,
      tags: p.tags,
      inHome: p.inHome,
      homeOrder: p.homeOrder,
      width: p.width,
      height: p.height,
      bytes: p.bytes,
      createdAt: p.createdAt,
      thumbUrl: url(p.keys.thumb),
      displayUrl: url(p.keys.display),
      originalUrl: url(p.keys.original),
    }));
  } catch {
    corrupt = true;
  }

  if (corrupt) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-medium mb-2">Manifest ilegible</h1>
          <p className="text-sm text-gray-500">
            El archivo <code>_meta/manifest.json</code> del bucket no se pudo
            leer. No se sobreescribió nada: restauralo copiando{" "}
            <code>_meta/manifest.prev.json</code> desde el dashboard de R2.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AdminApp
      initialPhotos={photos}
      initialTags={tags}
      publicUrlReady={publicUrlReady}
    />
  );
}
