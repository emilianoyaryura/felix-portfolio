"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import InfiniteGrid from "./components/InfiniteGrid";
import GridView from "./components/GridView";
import ViewToggle, { type Mode } from "./components/ViewToggle";
import ContactButton from "./components/ContactButton";
import Loader from "./components/Loader";
import { PHOTOS } from "./data/photos";

const EASE = [0.22, 1, 0.36, 1] as const;
const MIN_LOADER_MS = 700; // evita el "flash" del loader cuando ya está cacheado

export default function Home() {
  const [mode, setMode] = useState<Mode>("infinite");
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const reduce = useReducedMotion();

  // Precarga todas las imágenes → calienta la caché del browser (cero blancos
  // después) y alimenta el progreso real del loader.
  useEffect(() => {
    const start = performance.now();
    const total = PHOTOS.length;
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
      setProgress((loaded / total) * 100);
      if (loaded >= total) finish();
    };
    PHOTOS.forEach((p) => {
      const img = new Image();
      img.onload = bump;
      img.onerror = bump;
      img.src = p.src;
    });
    const safety = setTimeout(finish, 8000); // por si alguna imagen nunca resuelve
    return () => clearTimeout(safety);
  }, []);

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
    <>
      <AnimatePresence>{!ready && <Loader progress={progress} />}</AnimatePresence>

      <AnimatePresence mode="wait">
        {mode === "infinite" ? (
          <motion.div key="infinite" {...infiniteV} transition={{ duration: 0.5, ease: EASE }}>
            <InfiniteGrid active={mode === "infinite"} />
            {ready && !reduce && <DragHint />}
          </motion.div>
        ) : (
          <motion.div key="grid" {...gridV} transition={{ duration: 0.5, ease: EASE }}>
            <GridView />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
        <ViewToggle mode={mode} onChange={setMode} />
      </div>
      <div className="fixed right-6 top-6 z-50 sm:bottom-6 sm:top-auto">
        <ContactButton />
      </div>
    </>
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
