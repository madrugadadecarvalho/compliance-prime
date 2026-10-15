import type { UserRole } from "@/db/schema";

/**
 * Matriz de permissões — segregação de funções.
 *
 * A UI usa esta matriz para mostrar/esconder ações, mas a autorização real
 * acontece no servidor: cada Server Action e Route Handler volta a verificar
 * a permissão antes de tocar nos dados.
 */
export const PERMISSIONS = {
  "client:create": ["ANALISTA", "GESTOR"],
  "client:edit": ["ANALISTA", "GESTOR"],
  "client:submit": ["ANALISTA", "GESTOR"],
  "client:view": ["ANALISTA", "SUPERVISOR", "GESTOR", "AUDITOR"],
  "client:return": ["SUPERVISOR", "GESTOR"],
  "client:approve": ["SUPERVISOR", "GESTOR"],
  "client:approve-high-risk": ["GESTOR"],
  "client:reject": ["SUPERVISOR", "GESTOR"],
  "document:upload": ["ANALISTA", "GESTOR"],
  "document:review": ["ANALISTA", "SUPERVISOR", "GESTOR"],
  "document:download": ["ANALISTA", "SUPERVISOR", "GESTOR", "AUDITOR"],
  "alert:view": ["ANALISTA", "SUPERVISOR", "GESTOR", "AUDITOR"],
  "alert:opinion": ["ANALISTA"],
  "alert:decide": ["SUPERVISOR", "GESTOR"],
  "audit:view": ["SUPERVISOR", "GESTOR", "AUDITOR"],
  "audit:export": ["GESTOR", "AUDITOR"],
  "users:manage": ["GESTOR"],
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role);
}

export const ROLE_LABEL: Record<UserRole, string> = {
  ANALISTA: "Analista",
  SUPERVISOR: "Supervisor",
  GESTOR: "Gestor de Compliance",
  AUDITOR: "Auditor",
};

export const ROLE_DESCRIPTION: Record<UserRole, string> = {
  ANALISTA: "Cria e instrui processos de onboarding, carrega documentos e emite parecer sobre alertas.",
  SUPERVISOR: "Decide alertas e aprova ou rejeita processos que não criou (princípio dos quatro olhos).",
  GESTOR: "Aprova clientes de risco alto, gere perfis de acesso e exporta a trilha de auditoria.",
  AUDITOR: "Acesso apenas de leitura a processos, alertas e trilha de auditoria.",
};
