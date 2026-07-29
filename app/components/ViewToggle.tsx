"use client";

import { motion } from "motion/react";

export type Mode = "infinite" | "grid";

// Switch minimal fijo. La "píldora" activa se desliza con layout animation.
export default function ViewToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  const options: Mode[] = ["infinite", "grid"];
  return (
    <div className="flex items-center gap-1 rounded-full border border-ink/10 bg-paper/80 p-1 backdrop-blur-md">
      {options.map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              onClick={() => onChange(m)}
              aria-pressed={active}
              className={`relative rounded-full px-4 py-1.5 text-[0.7rem] uppercase tracking-[0.2em] outline-none transition-[color,transform] duration-150 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-ink/30 ${
                active ? "text-paper" : "text-ink/50 hover:text-ink"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="toggle-pill"
                  className="absolute inset-0 rounded-full bg-ink"
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                />
              )}
              <span className="relative">{m}</span>
            </button>
          );
        })}
    </div>
  );
}
