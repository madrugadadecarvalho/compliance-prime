import type { AlertStatus, OnboardingStatus, RiskLevel } from "@/db/schema";
import { RISK_LABEL } from "@/lib/risk";
import { STATUS_LABEL } from "@/lib/workflow";
import { Badge, type Tone } from "./ui";

const STATUS_TONE: Record<OnboardingStatus, Tone> = {
  RASCUNHO: "slate",
  PENDENTE_DOCUMENTOS: "amber",
  EM_ANALISE: "blue",
  APROVADO: "green",
  REJEITADO: "red",
};

export function StatusBadge({ status }: { status: OnboardingStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

const RISK_TONE: Record<RiskLevel, Tone> = { BAIXO: "green", MEDIO: "amber", ALTO: "red" };

export function RiskBadge({ level, score }: { level: RiskLevel | null; score?: number | null }) {
  if (!level) return <Badge>Sem avaliação</Badge>;
  return (
    <Badge tone={RISK_TONE[level]}>
      {RISK_LABEL[level]}
      {typeof score === "number" && <span className="opacity-70">· {score}</span>}
    </Badge>
  );
}

export const ALERT_STATUS_LABEL: Record<AlertStatus, string> = {
  ABERTO: "Por decidir",
  FALSO_POSITIVO: "Falso positivo",
  CONFIRMADO: "Confirmado",
};

export function AlertStatusBadge({ status }: { status: AlertStatus }) {
  const tone: Tone = status === "ABERTO" ? "amber" : status === "CONFIRMADO" ? "red" : "slate";
  return <Badge tone={tone}>{ALERT_STATUS_LABEL[status]}</Badge>;
}

export const CATEGORY_LABEL = { SANCAO: "Sanção", PEP: "PEP", MEDIA_ADVERSA: "Media adversa" } as const;
export const SOURCE_LABEL = {
  ONU: "ONU (Conselho de Segurança)",
  OFAC: "OFAC (EUA)",
  UNIAO_EUROPEIA: "União Europeia",
  PEP_NACIONAL: "Registo PEP nacional",
  LISTA_INTERNA: "Lista interna",
} as const;

export function CategoryBadge({ category }: { category: keyof typeof CATEGORY_LABEL }) {
  const tone: Tone = category === "SANCAO" ? "red" : category === "PEP" ? "violet" : "amber";
  return <Badge tone={tone}>{CATEGORY_LABEL[category]}</Badge>;
}

export function ScoreMeter({ score }: { score: number }) {
  const tone = score >= 95 ? "bg-red-600" : score >= 90 ? "bg-amber-500" : "bg-slate-500";
  return (
    <div className="flex items-center gap-2" title={`Grau de correspondência: ${score}%`}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200" aria-hidden>
        <div className={`h-full ${tone}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums text-slate-800">{score}%</span>
    </div>
  );
}

export const SUBJECT_LABEL = {
  CLIENTE: "Cliente",
  PARTE_RELACIONADA: "Sócio / beneficiário",
  VINCULO: "Entidade vinculada",
} as const;
