"use client";

import { ReactLenis } from "lenis/react";

// Smooth-scroll global. Solo tiene efecto real en la vista grid (el infinite grid
// es un overlay fijo que no scrollea y captura el wheel por su cuenta).
export default function LenisProvider({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis root options={{ lerp: 0.09, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}
