"use client";

import { useState } from "react";
import { Trash2, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogCloseButton,
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
import { Switch } from "@/components/ui/switch";
import TagCombobox from "./TagCombobox";
import { useMediaQuery } from "../lib/use-media-query";
import { formatBytes } from "../lib/format";
import type { AdminPhoto } from "../lib/admin-types";

type EditPanelProps = {
  photo: AdminPhoto | null;
  allTags: string[];
  onClose: () => void;
  onSave: (
    id: string,
    patch: { title: string; alt: string; tags: string[]; inHome: boolean }
  ) => Promise<boolean>;
  onDelete: (photo: AdminPhoto) => void;
};

export default function EditPanel({
  photo,
  allTags,
  onClose,
  onSave,
  onDelete,
}: EditPanelProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [title, setTitle] = useState("");
  const [alt, setAlt] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [inHome, setInHome] = useState(false);
  const [pending, setPending] = useState(false);

  // Reset del form al abrir otra foto ("adjust state during render": keyed por id
  // para no pisar lo que se está tipeando cuando refresca el manifest de fondo).
  const [formForId, setFormForId] = useState<string | null>(null);
  if (photo && photo.id !== formForId) {
    setFormForId(photo.id);
    setTitle(photo.title);
    setAlt(photo.alt);
    setTags(photo.tags);
    setInHome(photo.inHome);
    setPending(false);
  }
  if (!photo && formForId !== null) {
    setFormForId(null);
  }

  if (!photo) return null;

  const save = async () => {
    setPending(true);
    const ok = await onSave(photo.id, { title, alt, tags, inHome });
    setPending(false);
    if (ok) onClose();
  };

  const slug =
    (photo.title || photo.id)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || photo.id;
  const origExt = photo.originalUrl.split("?")[0].split(".").pop() || "jpg";
  const scaledDims = (max: number) => {
    if (!photo.width || !photo.height) return "";
    const long = Math.max(photo.width, photo.height);
    const r = long > max ? max / long : 1;
    return `${Math.round(photo.width * r)} × ${Math.round(photo.height * r)}`;
  };
  // Descarga vía ruta del propio Worker (mismo origen que el admin) que baja el
  // archivo con Content-Disposition: attachment → anda siempre, sin depender del
  // CORS del bucket.
  const dl = (key: string, filename: string) =>
    `/admin/download?key=${encodeURIComponent(key)}&name=${encodeURIComponent(filename)}`;
  const downloads = [
    {
      label: "Original",
      sub: `${photo.width} × ${photo.height} · ${formatBytes(photo.bytes)}`,
      href: dl(`photos/${photo.id}/original.${origExt}`, `${slug}-original.${origExt}`),
      filename: `${slug}-original.${origExt}`,
    },
    {
      label: "Grande",
      sub: `${scaledDims(1600)} · webp`,
      href: dl(`photos/${photo.id}/display.webp`, `${slug}-1600.webp`),
      filename: `${slug}-1600.webp`,
    },
    {
      label: "Chica",
      sub: `${scaledDims(400)} · webp`,
      href: dl(`photos/${photo.id}/thumb.webp`, `${slug}-400.webp`),
      filename: `${slug}-400.webp`,
    },
  ];

  const body = (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg bg-gray-100">
        {photo.displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.displayUrl}
            alt={photo.alt}
            className="w-full max-h-[38vh] object-contain"
            style={{
              aspectRatio:
                photo.width && photo.height
                  ? `${photo.width} / ${photo.height}`
                  : undefined,
            }}
          />
        ) : (
          <div className="flex h-40 items-center justify-center text-xs text-gray-400">
            Falta R2_PUBLIC_URL para previsualizar
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-title" className="text-sm text-gray-500">
          Título
        </Label>
        <Input
          id="edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-alt" className="text-sm text-gray-500">
          Alt (accesibilidad / SEO)
        </Label>
        <Input
          id="edit-alt"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          maxLength={200}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm text-gray-500">Tags</Label>
        <TagCombobox allTags={allTags} value={tags} onChange={setTags} />
      </div>

      <label className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 cursor-pointer">
        <span className="text-sm font-medium">Mostrar en home</span>
        <Switch checked={inHome} onCheckedChange={setInHome} />
      </label>

      {photo.displayUrl && (
        <div className="space-y-1.5">
          <Label className="text-sm text-gray-500">Descargar</Label>
          <div className="grid grid-cols-3 gap-2">
            {downloads.map((d) => (
              <a
                key={d.filename}
                href={d.href}
                download={d.filename}
                className="flex flex-col gap-1 rounded-lg border border-gray-200 px-2.5 py-2 text-left transition-colors md:hover:bg-gray-50"
              >
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Download className="w-3.5 h-3.5" />
                  {d.label}
                </span>
                <span className="text-[10px] leading-tight text-gray-400">
                  {d.sub}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">
        {photo.width} × {photo.height} px · {formatBytes(photo.bytes)} ·{" "}
        {new Date(photo.createdAt).toLocaleDateString("es-AR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </p>
    </div>
  );

  const footer = (
    <div className="flex items-center justify-between gap-2 w-full">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(photo)}
        className="text-red-500 md:hover:bg-red-50 md:hover:border-red-100"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Borrar
      </Button>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose} disabled={pending}>
          Cancelar
        </Button>
        <Button onClick={save} disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent aria-describedby={undefined}>
          <SheetTitle className="sr-only">Editar foto</SheetTitle>
          <DialogCloseButton />
          {body}
          <div className="mt-4 pt-4 border-t border-gray-100">{footer}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle className="text-base font-medium">Editar foto</SheetTitle>
        </SheetHeader>
        <SheetBody>{body}</SheetBody>
        <SheetFooter>{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
