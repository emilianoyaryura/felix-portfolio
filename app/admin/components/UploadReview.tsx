"use client";

import { RotateCcw, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import TagCombobox from "./TagCombobox";
import { useMediaQuery } from "../lib/use-media-query";
import { formatBytes } from "../lib/format";
import type { UploadItem } from "../lib/upload";

type UploadReviewProps = {
  items: UploadItem[];
  busy: boolean;
  readyCount: number;
  confirming: boolean;
  allTags: string[];
  batchTags: string[];
  onBatchTags: (tags: string[]) => void;
  onUpdateMeta: (localId: string, meta: { title?: string; alt?: string }) => void;
  onRetry: (localId: string) => void;
  onRemove: (localId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

const STATUS_LABEL: Record<UploadItem["status"], string> = {
  pendiente: "En cola…",
  procesando: "Procesando…",
  subiendo: "Subiendo…",
  subido: "Subida",
  listo: "Guardada",
  error: "Error",
};

function StatusIndicator({ item }: { item: UploadItem }) {
  if (item.status === "subido" || item.status === "listo") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-primary whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {STATUS_LABEL[item.status]}
      </span>
    );
  }
  if (item.status === "error") {
    return (
      <span className="text-[11px] text-red-500 truncate max-w-[160px]" title={item.error}>
        {item.error}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-400 whitespace-nowrap">
      <Loader2 className="w-3 h-3 animate-spin" />
      {STATUS_LABEL[item.status]}
      {item.status === "subiendo" && ` ${item.progress}%`}
    </span>
  );
}

function Row({
  item,
  onUpdateMeta,
  onRetry,
  onRemove,
}: {
  item: UploadItem;
  onUpdateMeta: UploadReviewProps["onUpdateMeta"];
  onRetry: UploadReviewProps["onRetry"];
  onRemove: UploadReviewProps["onRemove"];
}) {
  return (
    <li className="flex gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="relative shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.objectUrl}
          alt=""
          className={cn(
            "w-14 h-14 rounded-lg object-cover bg-gray-100",
            (item.status === "pendiente" || item.status === "procesando") &&
              "opacity-60"
          )}
        />
        {item.status === "subiendo" && (
          <div className="absolute inset-x-1 bottom-1 h-1 rounded-full bg-white/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[11px] text-gray-400 min-w-0">
            {item.name} · {formatBytes(item.file.size)}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <StatusIndicator item={item} />
            {item.status === "error" && (
              <button
                onClick={() => onRetry(item.localId)}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
                title="Reintentar"
                aria-label={`Reintentar ${item.name}`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onRemove(item.localId)}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-400"
              title="Quitar de la tanda"
              aria-label={`Quitar ${item.name}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          <Input
            value={item.title}
            onChange={(e) => onUpdateMeta(item.localId, { title: e.target.value })}
            placeholder="Título"
            maxLength={200}
            className="h-8 text-sm"
            disabled={item.status === "listo"}
            aria-label={`Título de ${item.name}`}
          />
          <Input
            value={item.alt}
            onChange={(e) => onUpdateMeta(item.localId, { alt: e.target.value })}
            placeholder="Alt"
            maxLength={200}
            className="h-8 text-sm"
            disabled={item.status === "listo"}
            aria-label={`Alt de ${item.name}`}
          />
        </div>
      </div>
    </li>
  );
}

// Paso de revisión del bulk import: las fotos se suben en background mientras
// se editan títulos/alt y los tags de la tanda; nada entra al sitio hasta
// "Confirmar".
export default function UploadReview({
  items,
  busy,
  readyCount,
  confirming,
  allTags,
  batchTags,
  onBatchTags,
  onUpdateMeta,
  onRetry,
  onRemove,
  onConfirm,
  onCancel,
}: UploadReviewProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const open = items.length > 0;
  if (!open) return null;

  const errorCount = items.filter((it) => it.status === "error").length;
  const totalBytes = items.reduce((a, it) => a + it.file.size, 0);

  const confirmLabel = confirming
    ? "Guardando…"
    : `Confirmar ${readyCount > 0 ? readyCount : ""} ${readyCount === 1 ? "foto" : "fotos"}`;

  const subtitle = busy
    ? "Subiendo en segundo plano — podés ir editando los títulos."
    : errorCount > 0
      ? `${errorCount} con error — reintentá o quitalas de la tanda.`
      : "Revisá títulos y alt antes de publicar.";

  const list = (
    <>
      {/* Encabezados de columna, alineados con los inputs (desktop). */}
      <div className="hidden sm:flex gap-3 pb-1.5 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="w-14 shrink-0 text-[11px] uppercase tracking-wide text-gray-400">
          {items.length} {items.length === 1 ? "foto" : "fotos"}
        </div>
        <div className="flex-1 grid grid-cols-2 gap-1.5">
          <span className="text-[11px] uppercase tracking-wide text-gray-400">
            Título
          </span>
          <span className="text-[11px] uppercase tracking-wide text-gray-400">
            Alt (accesibilidad)
          </span>
        </div>
      </div>
      <ul>
        {items.map((it) => (
          <Row
            key={it.localId}
            item={it}
            onUpdateMeta={onUpdateMeta}
            onRetry={onRetry}
            onRemove={onRemove}
          />
        ))}
      </ul>
    </>
  );

  const tagsBlock = (
    <div className="space-y-1.5">
      <Label className="text-sm text-gray-500">
        Tags para toda la tanda{" "}
        <span className="text-gray-400 font-normal">(opcional)</span>
      </Label>
      <TagCombobox allTags={allTags} value={batchTags} onChange={onBatchTags} />
    </div>
  );

  const footerInfo = (
    <p className="text-[11px] text-gray-400">
      {items.length} {items.length === 1 ? "archivo" : "archivos"} ·{" "}
      {formatBytes(totalBytes)} en total
    </p>
  );

  const actions = (
    <div className="flex items-center justify-between gap-2 w-full">
      {footerInfo}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} disabled={confirming}>
          Cancelar
        </Button>
        <Button onClick={onConfirm} disabled={confirming || readyCount === 0}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open onOpenChange={(o) => !o && onCancel()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Subir fotos</DialogTitle>
            <DialogDescription>{subtitle}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[45vh] overflow-y-auto -mx-1 px-1 mt-1">{list}</div>
          <div className="mt-3 pt-3 border-t border-gray-100">{tagsBlock}</div>
          <div className="mt-3 pt-3 border-t border-gray-100">{actions}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onCancel()}>
      <SheetContent>
        <SheetHeader>
          <div>
            <SheetTitle className="text-base font-medium">Subir fotos</SheetTitle>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        </SheetHeader>
        <SheetBody>
          {list}
          <div className="mt-3 pt-3 border-t border-gray-100">{tagsBlock}</div>
        </SheetBody>
        <SheetFooter>{actions}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
