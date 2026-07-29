"use client";

import { motion } from "motion/react";
import { artist } from "../data/photos";

// Loader on first load. Muestra el progreso real de precarga de imágenes y al
// terminar se levanta como telón (curtain) revelando la galería ya cacheada.
export default function Loader({ progress }: { progress: number }) {
  return (
    <motion.div
      initial={{ y: 0 }}
      exit={{ y: "-100%" }}
      transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-paper"
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="flex flex-col items-center"
      >
        <p className="mb-1 text-[0.62rem] uppercase tracking-[0.35em] text-ink/45">
          {artist.role}
        </p>
        <p className="mb-7 font-serif text-3xl tracking-tight text-ink">
          {artist.name}
        </p>

        <div className="relative h-px w-44 overflow-hidden bg-ink/15">
          <motion.div
            className="absolute inset-y-0 left-0 bg-ink"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          />
        </div>
        <p className="mt-4 font-mono text-[0.65rem] tracking-[0.3em] text-ink/50">
          {String(Math.round(progress)).padStart(3, "0")}
        </p>
      </motion.div>
    </motion.div>
  );
}
