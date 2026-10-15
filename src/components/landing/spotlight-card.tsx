"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/components/ui";

/** Card com brilho que segue o cursor, elevação e borda iluminada no hover. */
export function SpotlightCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r || !ref.current) return;
        ref.current.style.setProperty("--x", `${e.clientX - r.left}px`);
        ref.current.style.setProperty("--y", `${e.clientY - r.top}px`);
      }}
      className={cn(
        "spotlight group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl",
        "transition duration-300 hover:-translate-y-1 hover:border-sky-300/30 hover:bg-white/[0.06] hover:shadow-[0_20px_60px_-20px_rgba(56,189,248,0.35)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
