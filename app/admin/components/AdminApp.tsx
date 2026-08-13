"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import AdminHeader from "./AdminHeader";
import Toolbar from "./Toolbar";
import PhotoGrid from "./PhotoGrid";
import SelectionBar from "./SelectionBar";
import EditPanel from "./EditPanel";
import DeleteDialog from "./DeleteDialog";
import UploadDropzone from "./UploadDropzone";
import UploadReview from "./UploadReview";
import { useUploadQueue } from "../lib/upload";
import { bulkUpdate, updatePhoto, deletePhotos } from "../actions";
import { sameTag } from "@/lib/validate";
import type { ActionResult } from "@/lib/types";
import type { AdminPhoto, HomeFilter } from "../lib/admin-types";

type AdminAppProps = {
  initialPhotos: AdminPhoto[];
  initialTags: string[];
  publicUrlReady: boolean;
};

export default function AdminApp({
  initialPhotos,
  initialTags,
  publicUrlReady,
}: AdminAppProps) {
  const router = useRouter();

  // Estado local con optimistic updates; se resincroniza en cada router.refresh()
  // (patrón "adjust state during render" — sin effect, sin render extra visible).
  const [photos, setPhotos] = useState(initialPhotos);
  const [tags, setTags] = useState(initialTags);
  const [prevInitial, setPrevInitial] = useState({
    photos: initialPhotos,
    tags: initialTags,
  });
  if (
    prevInitial.photos !== initialPhotos ||
    prevInitial.tags !== initialTags
  ) {
    setPrevInitial({ photos: initialPhotos, tags: initialTags });
    setPhotos(initialPhotos);
    setTags(initialTags);
  }

  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [homeFilter, setHomeFilter] = useState<HomeFilter>("all");
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);

  const queue = useUploadQueue();
  const [confirming, setConfirming] = useState(false);
  const [batchTags, setBatchTags] = useState<string[]>([]);

  // Maneja el resultado de una action: error → toast + resync; UNAUTHORIZED → login.
  const handleResult = useCallback(
    (res: ActionResult): boolean => {
      if (res.ok) {
        router.refresh();
        return true;
      }
      if (res.error === "UNAUTHORIZED") {
        toast.error("Sesión expirada — entrá de nuevo");
        router.push("/admin/login");
      } else {
        toast.error(res.error);
        router.refresh();
      }
      return false;
    },
    [router]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return photos.filter((p) => {
      if (q && !p.title.toLowerCase().includes(q) && !p.alt.toLowerCase().includes(q)) {
        return false;
      }
      if (tagFilter.length > 0 && !tagFilter.every((t) => p.tags.some((x) => sameTag(x, t)))) {
        return false;
      }
      if (homeFilter === "home" && !p.inHome) return false;
      if (homeFilter === "out" && p.inHome) return false;
      return true;
    });
  }, [photos, search, tagFilter, homeFilter]);

  const selectedPhotos = useMemo(
    () => photos.filter((p) => selection.has(p.id)),
    [photos, selection]
  );

  const toggleSelect = (id: string) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Curaduría de home (con Deshacer) ───────────────────────────────────────
  const setHome = useCallback(
    async (ids: string[], inHome: boolean) => {
      const changed = photos
        .filter((p) => ids.includes(p.id) && p.inHome !== inHome)
        .map((p) => p.id);
      if (changed.length === 0) return;
      setPhotos((prev) =>
        prev.map((p) => (changed.includes(p.id) ? { ...p, inHome } : p))
      );
      setSelection(new Set());
      const res = await bulkUpdate(changed, { inHome });
      if (!handleResult(res)) return;
      const n = changed.length;
      toast.success(
        inHome
          ? `${n} ${n === 1 ? "foto agregada" : "fotos agregadas"} a la home`
          : `${n} ${n === 1 ? "foto quitada" : "fotos quitadas"} de la home`,
        {
          action: {
            label: "Deshacer",
            onClick: async () => {
              setPhotos((prev) =>
                prev.map((p) =>
                  changed.includes(p.id) ? { ...p, inHome: !inHome } : p
                )
              );
              handleResult(await bulkUpdate(changed, { inHome: !inHome }));
            },
          },
        }
      );
    },
    [photos, handleResult]
  );

  // ── Tags en bulk: agrega a las que no lo tienen; si todas lo tienen, lo quita ──
  const toggleTagOnSelection = useCallback(
    async (tag: string) => {
      const ids = [...selection];
      const missing = photos
        .filter((p) => ids.includes(p.id) && !p.tags.some((t) => sameTag(t, tag)))
        .map((p) => p.id);
      const adding = missing.length > 0;
      const targets = adding ? missing : ids;

      setPhotos((prev) =>
        prev.map((p) => {
          if (!targets.includes(p.id)) return p;
          return adding
            ? { ...p, tags: [...p.tags, tag] }
            : { ...p, tags: p.tags.filter((t) => !sameTag(t, tag)) };
        })
      );
      if (adding && !tags.some((t) => sameTag(t, tag))) {
        setTags((prev) => [...prev, tag].sort((a, b) => a.localeCompare(b)));
      }

      const res = await bulkUpdate(
        targets,
        adding ? { addTags: [tag] } : { removeTags: [tag] }
      );
      if (!handleResult(res)) return;
      const n = targets.length;
      toast.success(
        adding
          ? `Tag «${tag}» agregado a ${n} ${n === 1 ? "foto" : "fotos"}`
          : `Tag «${tag}» quitado de ${n} ${n === 1 ? "foto" : "fotos"}`,
        {
          action: {
            label: "Deshacer",
            onClick: async () => {
              setPhotos((prev) =>
                prev.map((p) => {
                  if (!targets.includes(p.id)) return p;
                  return adding
                    ? { ...p, tags: p.tags.filter((t) => !sameTag(t, tag)) }
                    : { ...p, tags: [...p.tags, tag] };
                })
              );
              handleResult(
                await bulkUpdate(
                  targets,
                  adding ? { removeTags: [tag] } : { addTags: [tag] }
                )
              );
            },
          },
        }
      );
    },
    [selection, photos, tags, handleResult]
  );

  // ── Edición individual ─────────────────────────────────────────────────────
  const savePhoto = useCallback(
    async (
      id: string,
      patch: { title: string; alt: string; tags: string[]; inHome: boolean }
    ): Promise<boolean> => {
      const before = photos.find((p) => p.id === id);
      if (!before) return false;
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
      );
      const res = await updatePhoto(id, {
        title: patch.title,
        alt: patch.alt,
        tags: patch.tags,
      });
      if (!handleResult(res)) return false;
      if (patch.inHome !== before.inHome) {
        const res2 = await bulkUpdate([id], { inHome: patch.inHome });
        if (!handleResult(res2)) return false;
      }
      toast.success("Cambios guardados");
      return true;
    },
    [photos, handleResult]
  );

  // ── Borrado (no-optimista: confirmación con pending) ───────────────────────
  const confirmDelete = useCallback(async () => {
    if (!deleteIds) return;
    const res = await deletePhotos(deleteIds);
    if (handleResult(res)) {
      const n = deleteIds.length;
      setPhotos((prev) => prev.filter((p) => !deleteIds.includes(p.id)));
      setSelection(new Set());
      setEditingId(null);
      toast.success(`${n} ${n === 1 ? "foto borrada" : "fotos borradas"}`);
    }
    setDeleteIds(null);
  }, [deleteIds, handleResult]);

  const editing = editingId
    ? (photos.find((p) => p.id === editingId) ?? null)
    : null;

  return (
    <div className="min-h-dvh">
      <AdminHeader onFiles={queue.enqueue} />

      <main className="mx-auto max-w-[1320px] px-4 sm:px-8 py-5 space-y-4 pb-28">
        {!publicUrlReady && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Falta configurar <code className="font-mono">R2_PUBLIC_URL</code>:
            las fotos se suben igual, pero no se pueden previsualizar ni mostrar
            en el sitio hasta habilitar el acceso público del bucket.
          </div>
        )}

        <Toolbar
          search={search}
          onSearch={setSearch}
          allTags={tags}
          tagFilter={tagFilter}
          onTagFilter={setTagFilter}
          homeFilter={homeFilter}
          onHomeFilter={setHomeFilter}
          filteredCount={filtered.length}
          selectionCount={selection.size}
          onSelectAllFiltered={() =>
            setSelection(new Set(filtered.map((p) => p.id)))
          }
          onClearSelection={() => setSelection(new Set())}
        />

        <PhotoGrid
          photos={filtered}
          totalCount={photos.length}
          selection={selection}
          onToggleSelect={toggleSelect}
          onOpen={setEditingId}
        />
      </main>

      {selection.size > 0 && (
        <SelectionBar
          selected={selectedPhotos}
          allTags={tags}
          onToggleTag={toggleTagOnSelection}
          onSetHome={(inHome) => void setHome([...selection], inHome)}
          onDelete={() => setDeleteIds([...selection])}
          onClear={() => setSelection(new Set())}
        />
      )}

      <EditPanel
        photo={editing}
        allTags={tags}
        onClose={() => setEditingId(null)}
        onSave={savePhoto}
        onDelete={(photo) => setDeleteIds([photo.id])}
      />

      <DeleteDialog
        count={deleteIds?.length ?? 0}
        open={deleteIds !== null}
        onCancel={() => setDeleteIds(null)}
        onConfirm={confirmDelete}
      />

      <UploadDropzone onFiles={queue.enqueue} />
      <UploadReview
        items={queue.items}
        busy={queue.busy}
        readyCount={queue.readyCount}
        confirming={confirming}
        allTags={tags}
        batchTags={batchTags}
        onBatchTags={setBatchTags}
        onUpdateMeta={queue.updateMeta}
        onRetry={queue.retry}
        onRemove={queue.remove}
        onConfirm={async () => {
          setConfirming(true);
          const res = await queue.confirmAll(batchTags);
          setConfirming(false);
          if (res.ok) {
            toast.success(
              res.count === 1 ? "1 foto publicada" : `${res.count} fotos publicadas`
            );
            queue.reset();
            setBatchTags([]);
            router.refresh();
          } else if (res.error === "UNAUTHORIZED") {
            toast.error("Sesión expirada — entrá de nuevo");
            router.push("/admin/login");
          } else {
            toast.error(res.error);
          }
        }}
        onCancel={() => {
          const inFlight = queue.busy || queue.readyCount > 0;
          if (!inFlight || confirm("Las fotos de esta tanda no se van a publicar. ¿Descartar?")) {
            queue.reset();
            setBatchTags([]);
          }
        }}
      />
    </div>
  );
}
