"use client";

import PhotoCard from "./PhotoCard";
import type { AdminPhoto } from "../lib/admin-types";

type PhotoGridProps = {
  photos: AdminPhoto[];
  totalCount: number;
  selection: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpen: (id: string) => void;
};

export default function PhotoGrid({
  photos,
  totalCount,
  selection,
  onToggleSelect,
  onOpen,
}: PhotoGridProps) {
  if (totalCount === 0) {
    return (
      <div className="py-24 text-center">
        <p className="text-gray-400 text-sm">Todavía no hay fotos</p>
        <p className="text-gray-300 text-xs mt-1">
          Arrastrá imágenes acá o tocá “Subir fotos”
        </p>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="text-gray-400 text-sm">Nada coincide con el filtro</p>
        <p className="text-gray-300 text-xs mt-1">
          Probá con otra búsqueda o limpiá los filtros
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 lg:gap-3">
      {photos.map((photo) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          selected={selection.has(photo.id)}
          selectionMode={selection.size > 0}
          onToggleSelect={() => onToggleSelect(photo.id)}
          onOpen={() => onOpen(photo.id)}
        />
      ))}
    </div>
  );
}
