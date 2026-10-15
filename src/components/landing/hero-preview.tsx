import { BellRing, Check, FileClock, LayoutGrid, Users } from "lucide-react";

/**
 * Pré-visualização do produto feita em HTML/CSS (não é uma imagem): nítida em
 * qualquer ecrã, acompanha o tema claro/escuro e é leve. Dados fictícios.
 */
export function HeroPreview() {
  const steps = ["Rascunho", "Documentos", "Em análise", "Decisão"];
  const nav = [
    { icon: LayoutGrid, label: "Painel" },
    { icon: Users, label: "Clientes", active: true },
    { icon: BellRing, label: "Alertas AML" },
    { icon: FileClock, label: "Auditoria" },
  ];
  return (
    <div
      role="img"
      aria-label="Pré-visualização da due diligence de um cliente no Compliance Prime"
      className="overflow-hidden rounded-[1.25rem] border border-outline-variant bg-background shadow-elevation-2"
    >
      <div className="grid sm:grid-cols-[11rem_1fr]">
        {/* Navegação lateral */}
        <div className="hidden flex-col gap-1 p-3 sm:flex">
          <div className="mb-3 flex items-center gap-2 px-2 pt-1">
            <span className="size-5 rounded-md bg-primary" aria-hidden />
            <span className="h-2 w-16 rounded-full bg-on-surface/15" aria-hidden />
          </div>
          {nav.map((n) => (
            <span
              key={n.label}
              className={
                n.active
                  ? "flex items-center gap-2 rounded-full bg-primary-container px-3 py-1.5 text-[11px] font-medium text-on-primary-container"
                  : "flex items-center gap-2 px-3 py-1.5 text-[11px] text-on-surface-variant"
              }
            >
              <n.icon className="size-3.5" aria-hidden />
              {n.label}
            </span>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="m-0 space-y-3 bg-surface-container/70 p-4 sm:m-2 sm:rounded-2xl sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[10px] text-on-surface-variant">CP-2026-D4E5F6 · Pessoa coletiva</p>
              <p className="text-base font-normal text-on-surface">Kiala Comércio Geral, Lda</p>
            </div>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-900">Risco alto · 72</span>
          </div>

          <ol className="flex flex-wrap gap-1.5 text-[10px]">
            {steps.map((s, i) => (
              <li
                key={s}
                className={
                  i < 2
                    ? "flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-900"
                    : i === 2
                      ? "rounded-full bg-primary-container px-2.5 py-1 font-medium text-on-primary-container"
                      : "rounded-full px-2.5 py-1 text-on-surface-variant ring-1 ring-inset ring-outline-variant"
                }
              >
                {i < 2 && <Check className="size-3" aria-hidden />}
                {s}
              </li>
            ))}
          </ol>

          <div className="rounded-xl border border-outline-variant bg-surface p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-medium text-on-surface">Alertas por decidir</p>
              <p className="text-[10px] text-on-surface-variant">ordenados por correspondência</p>
            </div>
            <ul className="divide-y divide-outline-variant">
              {[
                { name: "Viktor Kazarov", list: "ONU · Sanção · beneficiário efetivo", score: 100, tone: "bg-red-500" },
                { name: "Kazarov Holding Ltd", list: "OFAC · Sanção · entidade vinculada", score: 94, tone: "bg-amber-500" },
                { name: "Orlando Quissanga", list: "PEP nacional · sócio", score: 88, tone: "bg-slate-400" },
              ].map((a) => (
                <li key={a.name} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-on-surface">{a.name}</p>
                    <p className="truncate text-[10px] text-on-surface-variant">{a.list}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="h-1 w-12 overflow-hidden rounded-full bg-surface-container-high" aria-hidden>
                      <span className={`block h-full ${a.tone}`} style={{ width: `${a.score}%` }} />
                    </span>
                    <span className="w-7 text-right text-[10px] font-medium text-on-surface tabular-nums">{a.score}%</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-amber-100 px-3 py-2 text-[10px] leading-snug text-amber-950">
            <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-amber-600" aria-hidden />
            Aprovar indisponível: há 2 alertas por decidir e o risco alto exige um Gestor de Compliance.
          </div>
        </div>
      </div>
    </div>
  );
}
