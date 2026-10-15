"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Scroll suave e inercial (Lenis), só na landing page.
 * Respeita "reduzir movimento" do sistema operativo: nesse caso usa o scroll nativo.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({
      autoRaf: true,
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      anchors: { offset: -80 },
    });
    return () => lenis.destroy();
  }, []);
  return null;
}
