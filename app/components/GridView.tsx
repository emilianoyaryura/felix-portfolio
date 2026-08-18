"use client";

import { motion } from "motion/react";
import { artist } from "../data/artist";
import type { Photo } from "../lib/grid-layout";

const EASE = [0.23, 1, 0.32, 1] as const;

// Vista ordenada: masonry por columnas (CSS columns) con mucho aire.
// El scroll lo suaviza Lenis; cada foto se revela al entrar al viewport.
export default function GridView({ photos }: { photos: Photo[] }) {
  return (
    <div className="min-h-screen w-full px-[5vw] pb-32 pt-[22vh]">
      {/* Header al mismo ancho que el grid (w-full dentro del mismo padding). */}
      <motion.header
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE }}
        className="mb-[14vh] flex w-full flex-col justify-between gap-8 sm:flex-row sm:items-end"
      >
        <div>
          <p className="mb-4 text-[0.7rem] uppercase tracking-[0.3em] text-ink/50">
            {artist.role} — {artist.location}
          </p>
          <h1 className="font-serif text-[clamp(3rem,13vw,8rem)] leading-[0.9] tracking-tight">
            {artist.name}
          </h1>
        </div>
        <div className="flex shrink-0 flex-col gap-1 text-sm text-ink/70 sm:text-right">
          <a
            href={`mailto:${artist.email}`}
            className="w-fit underline-offset-4 transition-colors hover:text-ink hover:underline sm:self-end"
          >
            {artist.email}
          </a>
          <a
            href={artist.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="w-fit underline-offset-4 transition-colors hover:text-ink hover:underline sm:self-end"
          >
            {artist.whatsapp}
          </a>
        </div>
      </motion.header>

      <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 [&>*]:mb-6">
        {photos.map((p) => (
          <motion.figure
            key={p.id}
            initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: EASE }}
            className="group relative overflow-hidden break-inside-avoid bg-neutral-200"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.src}
              alt={p.alt ?? ""}
              loading="lazy"
              style={
                p.width && p.height
                  ? { aspectRatio: `${p.width} / ${p.height}` }
                  : undefined
              }
              className="w-full transition-[scale] duration-500 [transition-timing-function:var(--ease-out)] [@media(hover:hover)]:group-hover:scale-[1.03]"
            />
            <figcaption className="pointer-events-none absolute bottom-3 left-4 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-white opacity-0 mix-blend-difference transition-opacity duration-300 [@media(hover:hover)]:group-hover:opacity-100">
              {p.alt}
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </div>
  );
}
