"use client";

// Cola de subida con paso de revisión: presign (una vez por tanda) → por
// archivo: variantes → 3 PUTs directos a R2 con progreso → queda "subido"
// (NO se registra en el manifest). El commit es explícito: confirmAll() con
// los títulos/alt editados en el paso de revisión. Cancelar no publica nada
// (los objetos ya subidos quedan huérfanos invisibles). Concurrencia 3.

import { useCallback, useRef, useState } from "react";
import {
  presignUpload,
  commitUploads,
  type PresignedUpload,
} from "../actions";
import { prepareImage, titleFromFilename } from "./image-client";

export type UploadStatus =
  | "pendiente"
  | "procesando"
  | "subiendo"
  | "subido" // en R2, esperando confirmación
  | "listo" // confirmado en el manifest
  | "error";

export type UploadItem = {
  localId: string;
  file: File;
  name: string;
  objectUrl: string;
  status: UploadStatus;
  progress: number; // 0-100 (solo fase subiendo)
  title: string;
  alt: string;
  width?: number;
  height?: number;
  error?: string;
  presigned?: PresignedUpload;
};

const CONCURRENCY = 3;

function putWithProgress(
  url: string,
  headers: Record<string, string>,
  body: Blob,
  onProgress: (loaded: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded, e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload falló (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Error de red subiendo a R2"));
    xhr.send(body);
  });
}

export function useUploadQueue() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const itemsRef = useRef<UploadItem[]>([]);
  const running = useRef(false);

  const patch = useCallback((localId: string, p: Partial<UploadItem>) => {
    itemsRef.current = itemsRef.current.map((it) =>
      it.localId === localId ? { ...it, ...p } : it
    );
    setItems(itemsRef.current);
  }, []);

  const processOne = useCallback(
    async (item: UploadItem): Promise<void> => {
      const { localId, file } = item;
      try {
        patch(localId, { status: "procesando", progress: 0, error: undefined });
        const prepared = await prepareImage(file);
        patch(localId, { width: prepared.width, height: prepared.height });

        let presigned = itemsRef.current.find(
          (it) => it.localId === localId
        )?.presigned;
        if (!presigned) {
          const res = await presignUpload([{ type: file.type, size: file.size }]);
          if (!res.ok) throw new Error(res.error);
          presigned = res.uploads[0];
          patch(localId, { presigned });
        }

        patch(localId, { status: "subiendo" });
        const parts = [
          { blob: file as Blob, target: presigned.puts.original },
          { blob: prepared.display, target: presigned.puts.display },
          { blob: prepared.thumb, target: presigned.puts.thumb },
        ];
        const loaded = [0, 0, 0];
        const grandTotal = parts.reduce((a, p) => a + p.blob.size, 0);
        await Promise.all(
          parts.map((p, i) =>
            putWithProgress(p.target.url, p.target.headers, p.blob, (l) => {
              loaded[i] = l;
              const sum = loaded.reduce((a, b) => a + b, 0);
              patch(localId, { progress: Math.round((sum / grandTotal) * 100) });
            })
          )
        );
        patch(localId, { status: "subido", progress: 100 });
      } catch (err) {
        patch(localId, {
          status: "error",
          error: err instanceof Error ? err.message : "Error inesperado",
        });
      }
    },
    [patch]
  );

  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      while (true) {
        const pending = itemsRef.current.filter(
          (it) => it.status === "pendiente"
        );
        if (pending.length === 0) break;
        await Promise.all(pending.slice(0, CONCURRENCY).map(processOne));
      }
    } finally {
      running.current = false;
    }
  }, [processOne]);

  const enqueue = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const newItems: UploadItem[] = files.map((file) => {
        const title = titleFromFilename(file.name);
        return {
          localId: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
          file,
          name: file.name,
          objectUrl: URL.createObjectURL(file),
          status: "pendiente",
          progress: 0,
          title,
          alt: title,
        };
      });
      itemsRef.current = [...itemsRef.current, ...newItems];
      setItems(itemsRef.current);

      // Presign en tandas de a 50 (límite por action) — sin tope visible para
      // el usuario: 200 fotos = 4 llamadas.
      const CHUNK = 50;
      for (let i = 0; i < newItems.length; i += CHUNK) {
        const chunk = newItems.slice(i, i + CHUNK);
        const res = await presignUpload(
          chunk.map((it) => ({ type: it.file.type, size: it.file.size }))
        );
        if (res.ok) {
          chunk.forEach((it, j) =>
            patch(it.localId, { presigned: res.uploads[j] })
          );
        }
        // Si el presign del chunk falló (p.ej. un MIME inválido), cada archivo
        // reintenta individualmente en processOne y el inválido cae en error.
        void pump();
      }
    },
    [patch, pump]
  );

  const updateMeta = useCallback(
    (localId: string, meta: { title?: string; alt?: string }) => {
      patch(localId, meta);
    },
    [patch]
  );

  const retry = useCallback(
    (localId: string) => {
      // Re-presigna por las dudas (pudo expirar); el pump lo retoma.
      patch(localId, {
        status: "pendiente",
        presigned: undefined,
        error: undefined,
      });
      void pump();
    },
    [patch, pump]
  );

  // Registra en el manifest todo lo que está "subido", con la metadata editada
  // y los tags de la tanda.
  const confirmAll = useCallback(
    async (
      tags: string[]
    ): Promise<{ ok: true; count: number } | { ok: false; error: string }> => {
      const ready = itemsRef.current.filter(
        (it) => it.status === "subido" && it.presigned
      );
      if (ready.length === 0) return { ok: false, error: "No hay fotos listas" };
      const res = await commitUploads(
        ready.map((it) => ({
          id: it.presigned!.id,
          ext: it.presigned!.ext,
          title: it.title.trim() || titleFromFilename(it.name),
          alt: it.alt.trim() || it.title.trim() || titleFromFilename(it.name),
          tags,
          width: it.width ?? 0,
          height: it.height ?? 0,
        }))
      );
      if (!res.ok) return res;
      for (const it of ready) patch(it.localId, { status: "listo" });
      return { ok: true, count: ready.length };
    },
    [patch]
  );

  const remove = useCallback((localId: string) => {
    const it = itemsRef.current.find((x) => x.localId === localId);
    if (it) URL.revokeObjectURL(it.objectUrl);
    itemsRef.current = itemsRef.current.filter((x) => x.localId !== localId);
    setItems(itemsRef.current);
  }, []);

  const reset = useCallback(() => {
    for (const it of itemsRef.current) URL.revokeObjectURL(it.objectUrl);
    itemsRef.current = [];
    setItems([]);
  }, []);

  const busy = items.some(
    (it) =>
      it.status === "pendiente" ||
      it.status === "procesando" ||
      it.status === "subiendo"
  );
  const readyCount = items.filter((it) => it.status === "subido").length;

  return {
    items,
    enqueue,
    updateMeta,
    retry,
    confirmAll,
    remove,
    reset,
    busy,
    readyCount,
  };
}
