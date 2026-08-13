"use client";

import { Home } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { AdminPhoto } from "../lib/admin-types";

type PhotoCardProps = {
  photo: AdminPhoto;
  selected: boolean;
  selectionMode: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
};

export default function PhotoCard({
  photo,
  selected,
  selectionMode,
  onToggleSelect,
  onOpen,
}: PhotoCardProps) {
  return (
    <div className="group/card">
      <div
        role="button"
        tabIndex={0}
        onClick={() => (selectionMode ? onToggleSelect() : onOpen())}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          if (selectionMode) onToggleSelect();
          else onOpen();
        }}
        className={cn(
          "relative overflow-hidden rounded-lg bg-gray-200 cursor-pointer transition-shadow",
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
        )}
        style={{
          aspectRatio:
            photo.width && photo.height
              ? `${photo.width} / ${photo.height}`
              : "1 / 1",
        }}
      >
        {photo.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.thumbUrl}
            alt={photo.alt}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400 px-2 text-center">
            Falta R2_PUBLIC_URL
          </div>
        )}

        {/* Checkbox: siempre visible en touch/modo selección, hover en desktop. */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className={cn(
            "absolute left-2 top-2 transition-opacity",
            selectionMode || selected
              ? "opacity-100"
              : "opacity-100 md:opacity-0 md:group-hover/card:opacity-100"
          )}
        >
          <Checkbox checked={selected} className="bg-white/90 shadow-sm" />
        </div>

        {photo.inHome && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-primary shadow-sm">
            <Home className="w-3 h-3" />
            Home
          </span>
        )}
      </div>
      <p className="mt-1 truncate text-xs text-gray-600">{photo.title}</p>
    </div>
  );
}
