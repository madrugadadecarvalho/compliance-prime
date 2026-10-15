import { Check, ShieldAlert, ShieldCheck } from "lucide-react";

/**
 * Pré-visualização do produto feita em HTML/CSS (não é uma imagem):
 * nítida em qualquer ecrã, leve e acessível. Dados fictícios.
 */
export function HeroPreview() {
  const steps = ["Rascunho", "Documentos", "Em análise", "Aprovado"];
  return (
    <div className="relative pb-10 sm:pb-14" aria-label="Pré-visualização do painel do Compliance Prime" role="img">
      {/* Halo */}
      <div
        aria-hidden
        className="absolute -inset-8 bottom-6 rounded-[2rem] bg-gradient-to-tr from-sky-500/25 via-indigo-500/20 to-emerald-400/20 blur-3xl"
      />

      <div className="relative rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-5">
        {/* Barra da janela */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
          </div>
          <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] text-slate-400">
            CP-2026-D4E5F6 · Due diligence
          </span>
        </div>

        {/* Stepper */}
        <ol className="mb-4 grid grid-cols-4 gap-1.5 text-[10px] sm:text-[11px]">
          {steps.map((s, i) => (
            <li
              key={s}
              className={
                i < 2
                  ? "flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2 py-1.5 text-emerald-200"
                  : i === 2
                    ? "rounded-md border border-sky-300/40 bg-sky-400/10 px-2 py-1.5 font-medium text-sky-100"
                    : "rounded-md border border-white/10 px-2 py-1.5 text-slate-500"
              }
            >
              {i < 2 && <Check className="size-3" aria-hidden />}
              {s}
            </li>
          ))}
        </ol>

        {/* KPIs */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            ["Em análise", "12", "text-white"],
            ["Sanções por decidir", "3", "text-rose-300"],
            ["Risco alto", "2", "text-amber-200"],
          ].map(([label, value, tone]) => (
            <div key={label} className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
              <p className={`text-lg font-semibold tabular-nums ${tone}`}>{value}</p>
              <p className="text-[10px] leading-tight text-slate-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Alertas */}
        <div className="space-y-2">
          {[
            { name: "Victor Kasarov", list: "ONU · Sanção", score: 100, tone: "bg-rose-400", icon: ShieldAlert },
            { name: "Kazarov Holding", list: "OFAC · Sanção", score: 94, tone: "bg-amber-300", icon: ShieldAlert },
            { name: "Orlando Quissanga", list: "PEP nacional", score: 88, tone: "bg-violet-300", icon: ShieldCheck },
          ].map((a) => (
            <div
              key={a.name}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <a.icon className="size-4 shrink-0 text-slate-300" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-white">{a.name}</p>
                  <p className="text-[10px] text-slate-400">{a.list}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1 w-14 overflow-hidden rounded-full bg-white/10" aria-hidden>
                  <div className={`h-full ${a.tone}`} style={{ width: `${a.score}%` }} />
                </div>
                <span className="w-8 text-right text-[11px] font-semibold tabular-nums text-white">{a.score}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cartão flutuante: decisão auditada */}
      <div className="animate-float absolute bottom-0 -left-4 hidden w-64 rounded-xl border border-white/10 bg-slate-900/80 p-3 shadow-xl backdrop-blur-xl sm:block">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
          <span className="animate-pulse-dot size-1.5 rounded-full bg-emerald-400" aria-hidden />
          Decisão registada no audit trail
        </p>
        <p className="mt-1 text-[11px] leading-snug text-slate-300">
          Sérgio (Supervisor) · Falso positivo · justificação com 112 caracteres
        </p>
      </div>
    </div>
  );
}
