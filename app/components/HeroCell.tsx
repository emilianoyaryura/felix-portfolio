"use client";

import { artist } from "../data/artist";

// La "foto fake": una celda del mosaico que en vez de imagen es la identidad de
// Félix. Vive dentro del bloque, así que en el infinite grid aparece sembrada por
// el infinito. Los links frenan el drag con stopPropagation para que sean clickeables.
export default function HeroCell() {
  const stop = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <div className="flex h-full w-full flex-col justify-between bg-ink p-[7%] text-paper select-none">
      <div className="flex items-start justify-between">
        <span className="text-[0.85rem] uppercase tracking-[0.25em] text-paper/60">
          {artist.role}
        </span>
        <span className="text-[0.85rem] uppercase tracking-[0.25em] text-paper/60">
          ’26
        </span>
      </div>

      <h1 className="font-serif text-[clamp(2.8rem,4.6vw,5.2rem)] leading-[0.95] tracking-tight">
        {artist.name}
      </h1>

      <div className="flex flex-col gap-1 text-[0.95rem] tracking-wide text-paper/70">
        <span>{artist.location}</span>
        <a
          href={`mailto:${artist.email}`}
          onPointerDown={stop}
          className="w-fit text-paper underline-offset-4 transition-opacity hover:opacity-60 hover:underline"
        >
          {artist.email}
        </a>
        <a
          href={artist.whatsappUrl}
          target="_blank"
          rel="noreferrer"
          onPointerDown={stop}
          className="w-fit text-paper underline-offset-4 transition-opacity hover:opacity-60 hover:underline"
        >
          {artist.whatsapp}
        </a>
      </div>
    </div>
  );
}
