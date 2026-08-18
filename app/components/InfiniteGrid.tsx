"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cellRect, type Cell } from "../lib/grid-layout";
import HeroCell from "./HeroCell";

// Un bloque = el mosaico completo, posicionado en absoluto. Es estático; solo
// movemos/escalamos el contenedor. Como todas las copias son idénticas, envolver
// de un borde al opuesto es invisible → sensación de infinito.
function Block({ cells, blockW, blockH }: { cells: Cell[]; blockW: number; blockH: number }) {
  return (
    <div
      className="absolute left-0 top-0"
      style={{ width: blockW, height: blockH }}
    >
      {cells.map((cell) => {
        const r = cellRect(cell);
        const style = { left: r.x, top: r.y, width: r.width, height: r.height };
        if (cell.type === "hero") {
          return (
            <div key={cell.id} className="absolute overflow-hidden" style={style}>
              <HeroCell />
            </div>
          );
        }
        return (
          <figure
            key={cell.id}
            className="group absolute overflow-hidden bg-neutral-200"
            style={style}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cell.src}
              alt={cell.alt ?? ""}
              draggable={false}
              loading="eager"
              decoding="async"
              className="h-full w-full select-none object-cover opacity-0 transition-[scale,opacity] duration-500 [transition-timing-function:var(--ease-out)] [@media(hover:hover)]:group-hover:scale-[1.04]"
              onLoad={(e) => (e.currentTarget.style.opacity = "1")}
            />
            <figcaption className="pointer-events-none absolute bottom-2.5 left-3 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-white opacity-0 mix-blend-difference transition-opacity duration-300 [@media(hover:hover)]:group-hover:opacity-100">
              {cell.alt}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

const SMOOTH = 0.14; // lerp pos→target (más bajo = más suave/arrastrado)
const FRICTION = 0.94; // desaceleración de la inercia
const MAX_V = 120; // clamp de velocidad (world px/frame)
const KEY_IMPULSE = 8;
const MIN_S = 0.35; // zoom out máximo
const MAX_S = 3; // zoom in máximo

type InfiniteGridProps = {
  active: boolean;
  cells: Cell[];
  blockW: number;
  blockH: number;
};

export default function InfiniteGrid({ active, cells, blockW, blockH }: InfiniteGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [tiles, setTiles] = useState({ x: 0, y: 0 });

  // Modelo de movimiento (refs para no re-renderizar por frame):
  // target = a dónde empuja el input · pos = renderizado, persigue a target con lerp.
  const target = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });
  const prevT = useRef({ x: 0, y: 0 });
  const vel = useRef({ x: 0, y: 0 });
  const scale = useRef(1);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const reduced = useRef(false);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchDist = useRef(0);
  const pinchStartScale = useRef(1);
  const lastMid = useRef<{ x: number; y: number } | null>(null);

  // Ajusta la cantidad de copias para cubrir el viewport al scale actual.
  const applyTiles = useCallback((s: number) => {
    const x = Math.ceil(window.innerWidth / (blockW * s)) + 2;
    const y = Math.ceil(window.innerHeight / (blockH * s)) + 2;
    setTiles((prev) => (prev.x === x && prev.y === y ? prev : { x, y }));
  }, [blockW, blockH]);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Mobile: arrancar bien zoomed-out para ver varias fotos de una.
    const s = window.innerWidth < 768 ? 0.45 : 1;
    scale.current = s;
    // Centrar el primer hero al cargar → siempre visible (clave en mobile) + lindo intro.
    const hero = cells.find((c) => c.type === "hero");
    if (hero) {
      const r = cellRect(hero);
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      const init = {
        x: window.innerWidth / (2 * s) - cx,
        y: window.innerHeight / (2 * s) - cy,
      };
      pos.current = { ...init };
      target.current = { ...init };
      prevT.current = { ...init };
    }
    const measure = () => applyTiles(scale.current);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [applyTiles, cells]);

  const clampV = () => {
    vel.current.x = Math.max(-MAX_V, Math.min(MAX_V, vel.current.x));
    vel.current.y = Math.max(-MAX_V, Math.min(MAX_V, vel.current.y));
  };

  // Zoom anclado a un punto de pantalla (sx,sy): el contenido bajo ese punto
  // queda fijo. Ajustamos pos y target por igual → ancla exacta en render y destino.
  const zoomAt = useCallback(
    (s1: number, sx: number, sy: number) => {
      const s0 = scale.current;
      const clamped = Math.max(MIN_S, Math.min(MAX_S, s1));
      if (clamped === s0) return;
      const f = 1 / clamped - 1 / s0;
      pos.current.x += sx * f;
      pos.current.y += sy * f;
      target.current.x += sx * f;
      target.current.y += sy * f;
      scale.current = clamped;
      applyTiles(clamped);
    },
    [applyTiles]
  );

  // Loop: muestreo de velocidad + inercia + easing pos→target + render.
  useEffect(() => {
    let raf = 0;
    const smooth = reduced.current ? 1 : SMOOTH;
    const render = () => {
      if (planeRef.current) {
        planeRef.current.style.transform = `scale(${scale.current})`;
      }
      const wrapX = ((pos.current.x % blockW) + blockW) % blockW;
      const wrapY = ((pos.current.y % blockH) + blockH) % blockH;
      let k = 0;
      for (let j = 0; j < tiles.y; j++) {
        for (let i = 0; i < tiles.x; i++) {
          const el = tileRefs.current[k++];
          if (!el) continue;
          const tx = wrapX - blockW + i * blockW;
          const ty = wrapY - blockH + j * blockH;
          el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
        }
      }
    };

    const frame = () => {
      const t = target.current;
      const p = pos.current;
      const single = dragging.current && pointers.current.size < 2;
      if (single) {
        // Velocidad = movimiento real del frame, suavizado (mata el flick fantasma).
        vel.current.x = vel.current.x * 0.6 + (t.x - prevT.current.x) * 0.4;
        vel.current.y = vel.current.y * 0.6 + (t.y - prevT.current.y) * 0.4;
      } else if (!dragging.current && pointers.current.size === 0) {
        const v = vel.current;
        if (Math.abs(v.x) > 0.1 || Math.abs(v.y) > 0.1) {
          t.x += v.x;
          t.y += v.y;
          v.x *= FRICTION;
          v.y *= FRICTION;
        }
      }
      prevT.current.x = t.x;
      prevT.current.y = t.y;
      p.x += (t.x - p.x) * smooth;
      p.y += (t.y - p.y) * smooth;
      render();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [tiles, blockW, blockH]);

  // ── Pointer: 1 dedo = drag · 2 dedos = pinch-zoom + pan ──────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      dragging.current = true;
      vel.current = { x: 0, y: 0 };
      last.current = { x: e.clientX, y: e.clientY };
    } else if (pointers.current.size === 2) {
      dragging.current = false;
      const [a, b] = [...pointers.current.values()];
      pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
      pinchStartScale.current = scale.current;
      lastMid.current = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      // Pan por movimiento del punto medio (en world px → dividido por scale).
      if (lastMid.current) {
        target.current.x += (mid.x - lastMid.current.x) / scale.current;
        target.current.y += (mid.y - lastMid.current.y) / scale.current;
      }
      lastMid.current = mid;
      // Zoom por variación de distancia entre dedos, anclado al punto medio.
      if (pinchDist.current > 0) {
        zoomAt((pinchStartScale.current * dist) / pinchDist.current, mid.x, mid.y);
      }
      return;
    }

    if (dragging.current) {
      target.current.x += (e.clientX - last.current.x) / scale.current;
      target.current.y += (e.clientY - last.current.y) / scale.current;
      last.current = { x: e.clientX, y: e.clientY };
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    if (pointers.current.size === 1) {
      // Queda un dedo → retomar drag con él, sin salto.
      const [only] = [...pointers.current.values()];
      dragging.current = true;
      vel.current = { x: 0, y: 0 };
      last.current = { ...only };
      lastMid.current = null;
    } else if (pointers.current.size === 0) {
      dragging.current = false;
      lastMid.current = null;
      if (reduced.current) vel.current = { x: 0, y: 0 };
      else clampV();
    }
  };

  // Wheel/trackpad: ⌘/Ctrl (o pinch de trackpad) = zoom · resto = pan smooth.
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.ctrlKey || e.metaKey) {
        zoomAt(scale.current * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
      } else {
        const mult = e.deltaMode === 1 ? 16 : 1;
        target.current.x -= (e.deltaX * mult) / scale.current;
        target.current.y -= (e.deltaY * mult) / scale.current;
      }
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [active, zoomAt]);

  // Teclado: flechas paneando con inercia (a11y + sin mouse).
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, [number, number]> = {
        ArrowUp: [0, KEY_IMPULSE],
        ArrowDown: [0, -KEY_IMPULSE],
        ArrowLeft: [KEY_IMPULSE, 0],
        ArrowRight: [-KEY_IMPULSE, 0],
      };
      const d = map[e.key];
      if (!d) return;
      e.preventDefault();
      vel.current.x += d[0];
      vel.current.y += d[1];
      clampV();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const count = tiles.x * tiles.y;

  return (
    <>
      <div
        ref={containerRef}
        role="application"
        aria-label="Galería infinita — arrastrá, hacé zoom con dos dedos o usá las flechas"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="fixed inset-0 touch-none overflow-hidden outline-none cursor-grab active:cursor-grabbing"
      >
        {/* Plano escalable (zoom). El pan vive en los translate de cada tile. */}
        <div ref={planeRef} className="absolute inset-0 origin-top-left">
          {Array.from({ length: count }).map((_, k) => (
            <div
              key={k}
              ref={(el) => {
                tileRefs.current[k] = el;
              }}
              className="absolute left-0 top-0 will-change-transform"
              style={{ width: blockW, height: blockH }}
            >
              <Block cells={cells} blockW={blockW} blockH={blockH} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
