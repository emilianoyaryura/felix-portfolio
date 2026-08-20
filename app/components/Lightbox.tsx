"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Photo } from "../lib/grid-layout";

const EASE = [0.23, 1, 0.32, 1] as const;
const SWIPE_THRESHOLD = 60; // px para disparar prev/next en mobile

type LightboxProps = {
  photos: Photo[];
  index: number | null; // null = cerrado
  onClose: () => void;
  onIndexChange: (i: number) => void;
};

// Visor a pantalla completa tipo carousel: flechas, teclado, swipe y precarga
// de vecinas. Mantiene el criterio anti-descarga del resto del sitio.
export default function Lightbox({ photos, index, onClose, onIndexChange }: LightboxProps) {
  const reduce = useReducedMotion();
  // Dirección del último movimiento (1 = siguiente, -1 = anterior) para el slide.
  const [dir, setDir] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const open = index !== null;
  const current = open ? photos[index] : null;

  const go = useCallback(
    (delta: number) => {
      if (index === null || photos.length === 0) return;
      setDir(delta);
      const next = (index + delta + photos.length) % photos.length;
      onIndexChange(next);
    },
    [index, photos.length, onIndexChange]
  );

  // Teclado: ← → navegan, Esc cierra.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go, onClose]);

  // Bloquea el scroll del body mientras el visor está abierto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Precarga las fotos vecinas → navegación sin blancos.
  useEffect(() => {
    if (index === null) return;
    [1, -1].forEach((d) => {
      const p = photos[(index + d + photos.length) % photos.length];
      if (p) {
        const img = new Image();
        img.src = p.src;
      }
    });
  }, [index, photos]);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    // Solo swipe horizontal dominante.
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      go(dx < 0 ? 1 : -1);
    }
  };

  const slide = reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, x: dir >= 0 ? 40 : -40 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: dir >= 0 ? -40 : 40 },
      };

  return (
    <AnimatePresence>
      {open && current && (
        <motion.div
          key="lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/95 select-none [-webkit-touch-callout:none]"
          onClick={onClose}
          onContextMenu={(e) => e.preventDefault()}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          role="dialog"
          aria-modal="true"
          aria-label="Visor de fotos"
        >
          {/* Cerrar */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Cerrar"
            className="fixed right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full text-paper/70 transition-colors hover:bg-paper/10 hover:text-paper"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          {/* Anterior */}
          {photos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              aria-label="Anterior"
              className="fixed left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-paper/70 transition-colors hover:bg-paper/10 hover:text-paper sm:left-5"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
          )}

          {/* Siguiente */}
          {photos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              aria-label="Siguiente"
              className="fixed right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-paper/70 transition-colors hover:bg-paper/10 hover:text-paper sm:right-5"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Foto */}
          <AnimatePresence mode="popLayout">
            <motion.img
              key={current.id}
              {...slide}
              transition={{ duration: reduce ? 0.2 : 0.35, ease: EASE }}
              src={current.src}
              alt={current.alt ?? ""}
              draggable={false}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
              className="max-h-[85vh] max-w-[90vw] object-contain [-webkit-touch-callout:none]"
            />
          </AnimatePresence>

          {/* Pie: caption + contador */}
          <div className="pointer-events-none fixed bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-paper/60">
            {current.alt && <span>{current.alt}</span>}
            {photos.length > 1 && (
              <span className="text-paper/40">
                {index + 1} / {photos.length}
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
