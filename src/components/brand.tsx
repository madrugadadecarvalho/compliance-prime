import { cn } from "@/components/ui";

/** Marca: um escudo geométrico com um visto, desenhado em SVG (sem dependência de ícones). */
export function BrandMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-on-surface", className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="10" className="fill-primary" />
        <path
          d="M16 7.5 9.5 10v5.3c0 4.1 2.7 7.6 6.5 9.2 3.8-1.6 6.5-5.1 6.5-9.2V10L16 7.5Z"
          className="fill-on-primary/15 stroke-on-primary"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="m12.8 15.9 2.3 2.3 4.3-4.6" className="stroke-on-primary" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!compact && (
        <span className="leading-none">
          <span className="block text-[0.95rem] font-semibold tracking-tight">Compliance Prime</span>
          <span className="mt-0.5 block text-[11px] text-on-surface-variant">KYC · AML · Auditoria</span>
        </span>
      )}
    </span>
  );
}
