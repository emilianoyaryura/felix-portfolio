"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  ImageUp,
  LogOut,
  MoreVertical,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout, cleanupOrphans } from "../actions";

export default function AdminHeader({
  onFiles,
}: {
  onFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cleaning, setCleaning] = useState(false);

  const runCleanup = async () => {
    if (cleaning) return;
    setCleaning(true);
    const res = await cleanupOrphans();
    setCleaning(false);
    if (res.ok) {
      toast.success(
        res.deleted === 0
          ? "Sin archivos huérfanos para limpiar"
          : `${res.deleted} archivos huérfanos borrados`
      );
    } else {
      toast.error(res.error === "UNAUTHORIZED" ? "Sesión expirada" : res.error);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        <h1 className="font-serif text-xl leading-none">
          Félix <span className="text-gray-400">— Admin</span>
        </h1>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length > 0) onFiles(files);
              e.target.value = "";
            }}
          />
          <Button onClick={() => inputRef.current?.click()}>
            <ImageUp className="w-3.5 h-3.5" />
            Subir fotos
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Menú">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href="/" target="_blank" rel="noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ver sitio
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void runCleanup()}>
                <Trash2 className="w-3.5 h-3.5" />
                {cleaning ? "Limpiando…" : "Limpiar archivos huérfanos"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-500 focus:text-red-600"
                onSelect={() => void logout()}
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
