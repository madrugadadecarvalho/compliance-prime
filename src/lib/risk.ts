import type { ClientType, RiskLevel } from "@/db/schema";

/**
 * Classificação de risco explicável: cada ponto tem um motivo visível para o analista
 * e para o auditor. Nada de "caixa preta".
 */

/** Jurisdições de risco elevado (lista ilustrativa para demonstração). */
export const HIGH_RISK_COUNTRIES = new Set(["KP", "IR", "MM", "SY", "YE", "AF"]);
export const MEDIUM_RISK_COUNTRIES = new Set(["CD", "SS", "HT", "VE", "ML", "NG", "MZ"]);

export const HIGH_RISK_ACTIVITIES = [
  "casino",
  "jogo",
  "cambio",
  "câmbio",
  "criptoativo",
  "cripto",
  "joalharia",
  "metais preciosos",
  "diamantes",
  "armamento",
  "imobiliario",
  "imobiliário",
];

export type RiskInput = {
  type: ClientType;
  country: string;
  nationality?: string | null;
  activity: string;
  isPep: boolean;
  relatedPartyPep: boolean;
  expectedMonthlyVolume?: number | null;
  openOrConfirmedAlerts: number;
  confirmedSanctions: number;
};

export type RiskResult = {
  score: number;
  level: RiskLevel;
  factors: { factor: string; points: number }[];
};

export function assessRisk(input: RiskInput): RiskResult {
  const factors: { factor: string; points: number }[] = [];
  const add = (factor: string, points: number) => factors.push({ factor, points });

  const countries = [input.country, input.nationality].filter(Boolean) as string[];
  if (countries.some((c) => HIGH_RISK_COUNTRIES.has(c))) add("Jurisdição de risco elevado", 40);
  else if (countries.some((c) => MEDIUM_RISK_COUNTRIES.has(c))) add("Jurisdição de risco médio", 15);

  if (input.isPep) add("Cliente é Pessoa Politicamente Exposta (PEP)", 30);
  if (input.relatedPartyPep) add("Sócio ou beneficiário efetivo é PEP", 20);

  const activity = input.activity.toLowerCase();
  if (HIGH_RISK_ACTIVITIES.some((a) => activity.includes(a))) add("Atividade de risco elevado", 20);

  if (input.type === "PESSOA_COLETIVA") add("Pessoa coletiva (estrutura de propriedade a verificar)", 5);

  const volume = input.expectedMonthlyVolume ?? 0;
  if (volume >= 50_000_000) add("Volume mensal esperado muito elevado", 20);
  else if (volume >= 10_000_000) add("Volume mensal esperado elevado", 10);

  if (input.confirmedSanctions > 0) add("Correspondência confirmada em lista de sanções", 100);
  else if (input.openOrConfirmedAlerts > 0) add("Alertas de screening associados", 10);

  const score = Math.min(100, factors.reduce((s, f) => s + f.points, 0));
  const level: RiskLevel = score >= 50 ? "ALTO" : score >= 25 ? "MEDIO" : "BAIXO";
  return { score, level, factors };
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  BAIXO: "Risco baixo",
  MEDIO: "Risco médio",
  ALTO: "Risco alto",
};
