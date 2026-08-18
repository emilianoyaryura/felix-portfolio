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
  let diagError: string | null = null;
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
    }));
  } catch (err) {
    diagError =
      err instanceof Error
        ? `${err.name}: ${err.message}\n\n${err.stack ?? ""}`
        : String(err);
  }

  if (diagError) {
    // DIAGNÓSTICO TEMPORAL: mostramos el error real de la lectura de R2 + si
    // cada env var llega al runtime del Worker. Quitar cuando esté resuelto.
    const envStatus = (
      [
        "R2_ENDPOINT",
        "R2_BUCKET",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_PUBLIC_URL",
      ] as const
    )
      .map((k) => `${k}: ${process.env[k] ? "OK" : "FALTA"}`)
      .join("\n");
    return (
      <div className="min-h-dvh flex items-start justify-center px-4 py-16">
        <div className="w-full max-w-2xl">
          <h1 className="text-lg font-medium mb-3">Diagnóstico R2</h1>
          <p className="text-sm text-gray-500 mb-2">
            Error real al leer el manifest:
          </p>
          <pre className="text-left text-xs bg-gray-100 rounded-lg p-4 overflow-auto whitespace-pre-wrap mb-5">
            {diagError}
          </pre>
          <p className="text-sm text-gray-500 mb-2">
            Env vars en runtime del Worker:
          </p>
          <pre className="text-left text-xs bg-gray-100 rounded-lg p-4 whitespace-pre-wrap">
            {envStatus}
          </pre>
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
