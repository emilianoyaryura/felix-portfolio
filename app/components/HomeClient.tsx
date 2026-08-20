"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import InfiniteGrid from "./InfiniteGrid";
import GridView from "./GridView";
import ViewToggle, { type Mode } from "./ViewToggle";
import ContactButton from "./ContactButton";
import Loader from "./Loader";
import LenisProvider from "./LenisProvider";
import Lightbox from "./Lightbox";
import { buildBlock, type Photo } from "../lib/grid-layout";

const EASE = [0.22, 1, 0.36, 1] as const;
const MIN_LOADER_MS = 700; // evita el "flash" del loader cuando ya está cacheado
// Con muchas fotos, el loader espera solo a las primeras N; el resto sigue
// precargando en background (el bento las va mostrando a medida que llegan).
const LOADER_WAIT_CAP = 40;
const LOADER_CAP_FROM = 60;

export default function HomeClient({ photos }: { photos: Photo[] }) {
  const [mode, setMode] = useState<Mode>("infinite");
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const reduce = useReducedMotion();

  const block = useMemo(() => buildBlock(photos), [photos]);

  // El infinite grid conoce las fotos por src (las celdas repiten el pool);
  // lo resolvemos a índice para abrir el carousel en la foto correcta.
  const srcToIndex = useMemo(() => {
    const m = new Map<string, number>();
    photos.forEach((p, i) => {
      if (!m.has(p.src)) m.set(p.src, i);
    });
    return m;
  }, [photos]);

  const openBySrc = (src: string) => {
    const i = srcToIndex.get(src);
    if (i !== undefined) setLightbox(i);
  };

  // Precarga las imágenes → calienta la caché del browser (cero blancos
  // después) y alimenta el progreso real del loader.
  useEffect(() => {
    const start = performance.now();
    const waitFor =
      photos.length > LOADER_CAP_FROM ? LOADER_WAIT_CAP : photos.length;
    let loaded = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      const wait = Math.max(0, MIN_LOADER_MS - (performance.now() - start));
      setTimeout(() => setReady(true), wait);
    };
    const bump = () => {
      loaded += 1;
      setProgress(Math.min(100, (loaded / waitFor) * 100));
      if (loaded >= waitFor) finish();
    };
    photos.forEach((p, i) => {
      const img = new Image();
      // Solo las primeras `waitFor` alimentan el progreso; el resto precarga igual.
      if (i < waitFor) {
        img.onload = bump;
        img.onerror = bump;
      }
      img.src = p.src;
    });
    const safety = setTimeout(finish, 8000); // por si alguna imagen nunca resuelve
    return () => clearTimeout(safety);
  }, [photos]);

  // El infinite es un overlay `fixed`: NO se puede animar filter/transform en su
  // wrapper (crean containing-block y colapsan el fixed). Solo opacidad.
  const infiniteV = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  };
  const gridV = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 12, filter: "blur(4px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: 12, filter: "blur(4px)" },
      };

  return (
    <LenisProvider>
      <AnimatePresence>{!ready && <Loader progress={progress} />}</AnimatePresence>

      <AnimatePresence mode="wait">
        {mode === "infinite" ? (
          <motion.div key="infinite" {...infiniteV} transition={{ duration: 0.5, ease: EASE }}>
            <InfiniteGrid
              active={mode === "infinite"}
              cells={block.cells}
              blockW={block.blockW}
              blockH={block.blockH}
              onPhotoClick={openBySrc}
            />
            {ready && !reduce && <DragHint />}
          </motion.div>
        ) : (
          <motion.div key="grid" {...gridV} transition={{ duration: 0.5, ease: EASE }}>
            <GridView photos={photos} onPhotoClick={setLightbox} />
          </motion.div>
        )}
      </AnimatePresence>

      <Lightbox
        photos={photos}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onIndexChange={setLightbox}
      />

      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
        <ViewToggle mode={mode} onChange={setMode} />
      </div>
      <div className="fixed right-6 top-6 z-50 sm:bottom-6 sm:top-auto">
        <ContactButton />
      </div>
    </LenisProvider>
  );
}

// Pista sutil "drag to explore" que aparece y se desvanece al entrar.
function DragHint() {
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: 3.6, times: [0, 0.15, 0.7, 1], delay: 0.7 }}
      className="pointer-events-none fixed left-1/2 top-8 z-50 -translate-x-1/2 text-[0.7rem] uppercase tracking-[0.3em] text-ink/45"
    >
      drag to explore
    </motion.p>
  );
}
