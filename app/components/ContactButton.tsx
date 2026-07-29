"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { artist } from "../data/photos";

const EASE = [0.23, 1, 0.32, 1] as const;

// Botón "contact" al lado del toggle. Abre un popover minimal con la misma info
// del header. Escala desde el trigger (origin-bottom); cierra con Esc o click afuera.
export default function ContactButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 8, scale: 0.96, filter: "blur(4px)" }}
            transition={{ duration: 0.22, ease: EASE }}
            className="absolute right-0 top-full mt-3 w-60 origin-top-right rounded-2xl border border-ink/10 bg-paper/90 p-5 shadow-[0_10px_40px_-8px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:bottom-full sm:top-auto sm:mb-3 sm:mt-0 sm:origin-bottom-right"
          >
            <p className="mb-3 text-[0.62rem] uppercase tracking-[0.3em] text-ink/45">
              Get in touch
            </p>
            <div className="flex flex-col gap-2 text-sm text-ink/80">
              <a
                href={`mailto:${artist.email}`}
                className="w-fit underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                {artist.email}
              </a>
              <a
                href={artist.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="w-fit underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                @{artist.instagram}
              </a>
              <span className="text-ink/45">{artist.location}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`rounded-full border px-4 py-2.5 text-[0.7rem] uppercase tracking-[0.2em] outline-none backdrop-blur-md transition-[color,background-color,transform] duration-150 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-ink/30 ${
          open
            ? "border-transparent bg-ink text-paper"
            : "border-ink/10 bg-paper/80 text-ink/50 hover:text-ink"
        }`}
      >
        contact
      </button>
    </div>
  );
}
