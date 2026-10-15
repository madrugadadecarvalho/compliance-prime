"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Contador numérico que anima quando entra no ecrã.
 * O HTML do servidor já traz o valor final (útil sem JavaScript e para leitores de ecrã).
 */
export function CountUp({
  value,
  suffix = "",
  prefix = "",
  duration = 1600,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    setDisplay(0);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(Math.round(eased * value));
          if (p < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular-nums" aria-label={`${prefix}${value}${suffix}`}>
      <span aria-hidden>
        {prefix}
        {display.toLocaleString("pt-AO")}
        {suffix}
      </span>
    </span>
  );
}
