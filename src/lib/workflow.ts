import type { OnboardingStatus, RiskLevel, UserRole, DocumentType, ClientType } from "@/db/schema";
import { can } from "./permissions";

/**
 * O onboarding não é um formulário. É um processo.
 * Cada estado tem uma UI diferente e cada transição tem regras explícitas.
 */
export const STATUS_LABEL: Record<OnboardingStatus, string> = {
  RASCUNHO: "Rascunho",
  PENDENTE_DOCUMENTOS: "Pendente de documentos",
  EM_ANALISE: "Em análise",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
};

export const STATUS_DESCRIPTION: Record<OnboardingStatus, string> = {
  RASCUNHO: "O analista está a recolher os dados do cliente. Nada foi submetido.",
  PENDENTE_DOCUMENTOS: "Faltam documentos obrigatórios ou foram devolvidos para correção.",
  EM_ANALISE: "Screening executado. Aguarda decisão de um supervisor.",
  APROVADO: "Cliente aprovado. O processo está fechado e só pode ser consultado.",
  REJEITADO: "Cliente rejeitado com justificação registada. O processo está fechado.",
};

export const STATUS_ORDER: OnboardingStatus[] = [
  "RASCUNHO",
  "PENDENTE_DOCUMENTOS",
  "EM_ANALISE",
  "APROVADO",
];

export const REQUIRED_DOCUMENTS: Record<ClientType, DocumentType[]> = {
  PESSOA_SINGULAR: ["BILHETE_IDENTIDADE", "NIF", "COMPROVATIVO_MORADA"],
  PESSOA_COLETIVA: ["CERTIDAO_COMERCIAL", "ESTATUTOS", "NIF"],
};

export function missingDocuments(
  type: ClientType,
  docs: { type: DocumentType; status: "PENDENTE" | "VALIDADO" | "REJEITADO" }[],
): DocumentType[] {
  const present = new Set(docs.filter((d) => d.status !== "REJEITADO").map((d) => d.type));
  return REQUIRED_DOCUMENTS[type].filter((t) => !present.has(t));
}

export function isEditable(status: OnboardingStatus): boolean {
  return status === "RASCUNHO" || status === "PENDENTE_DOCUMENTOS";
}

export function isClosed(status: OnboardingStatus): boolean {
  return status === "APROVADO" || status === "REJEITADO";
}

export type DecisionContext = {
  status: OnboardingStatus;
  riskLevel: RiskLevel | null;
  createdById: string;
  openAlerts: number;
  confirmedSanctions: number;
  missingDocuments: number;
  pendingDocuments: number;
};

export type Actor = { id: string; role: UserRole };

export type Check = { allowed: boolean; reason?: string };

const ok: Check = { allowed: true };
const no = (reason: string): Check => ({ allowed: false, reason });

/** Submeter: RASCUNHO/PENDENTE_DOCUMENTOS → EM_ANALISE (ou PENDENTE_DOCUMENTOS se faltar algo). */
export function canSubmit(actor: Actor, ctx: DecisionContext): Check {
  if (!can(actor.role, "client:submit")) return no("O seu perfil não pode submeter processos.");
  if (!isEditable(ctx.status)) return no("Só processos em rascunho ou pendentes podem ser submetidos.");
  return ok;
}

/** Devolver ao analista para correção ou documentos adicionais. */
export function canReturn(actor: Actor, ctx: DecisionContext): Check {
  if (!can(actor.role, "client:return")) return no("Apenas supervisores ou gestores podem devolver processos.");
  if (ctx.status !== "EM_ANALISE") return no("Só processos em análise podem ser devolvidos.");
  return ok;
}

export function canApprove(actor: Actor, ctx: DecisionContext): Check {
  if (!can(actor.role, "client:approve")) return no("O seu perfil não pode aprovar clientes.");
  if (ctx.status !== "EM_ANALISE") return no("Só processos em análise podem ser aprovados.");
  if (ctx.createdById === actor.id)
    return no("Princípio dos quatro olhos: não pode aprovar um processo que criou.");
  if (ctx.riskLevel === "ALTO" && !can(actor.role, "client:approve-high-risk"))
    return no("Clientes de risco alto exigem aprovação de um Gestor de Compliance.");
  if (ctx.openAlerts > 0) return no(`Existem ${ctx.openAlerts} alerta(s) de screening por decidir.`);
  if (ctx.confirmedSanctions > 0)
    return no("Existe uma correspondência confirmada com lista de sanções. O processo só pode ser rejeitado.");
  if (ctx.missingDocuments > 0) return no("Faltam documentos obrigatórios.");
  if (ctx.pendingDocuments > 0) return no("Existem documentos por validar.");
  return ok;
}

export function canReject(actor: Actor, ctx: DecisionContext): Check {
  if (!can(actor.role, "client:reject")) return no("O seu perfil não pode rejeitar clientes.");
  if (ctx.status !== "EM_ANALISE") return no("Só processos em análise podem ser rejeitados.");
  if (ctx.createdById === actor.id)
    return no("Princípio dos quatro olhos: não pode decidir um processo que criou.");
  return ok;
}
