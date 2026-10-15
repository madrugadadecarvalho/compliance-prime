import "server-only";
import { auditLog } from "@/db/schema";
import type { Db, Tx } from "@/db";

export type AuditAction =
  | "LOGIN"
  | "LOGIN_FALHADO"
  | "LOGOUT"
  | "REGISTO_UTILIZADOR"
  | "CLIENTE_CRIADO"
  | "CLIENTE_EDITADO"
  | "CLIENTE_SUBMETIDO"
  | "CLIENTE_DEVOLVIDO"
  | "CLIENTE_APROVADO"
  | "CLIENTE_REJEITADO"
  | "PARTE_RELACIONADA_ADICIONADA"
  | "PARTE_RELACIONADA_REMOVIDA"
  | "VINCULO_ADICIONADO"
  | "VINCULO_REMOVIDO"
  | "DOCUMENTO_CARREGADO"
  | "DOCUMENTO_VALIDADO"
  | "DOCUMENTO_REJEITADO"
  | "DOCUMENTO_DESCARREGADO"
  | "SCREENING_EXECUTADO"
  | "ALERTA_PARECER"
  | "ALERTA_FALSO_POSITIVO"
  | "ALERTA_CONFIRMADO"
  | "PERFIL_ALTERADO"
  | "UTILIZADOR_ATIVADO"
  | "UTILIZADOR_DESATIVADO"
  | "AUDITORIA_EXPORTADA"
  | "ACESSO_NEGADO";

export const ACTION_LABEL: Record<AuditAction, string> = {
  LOGIN: "Início de sessão",
  LOGIN_FALHADO: "Tentativa de login falhada",
  LOGOUT: "Fim de sessão",
  REGISTO_UTILIZADOR: "Registo de utilizador",
  CLIENTE_CRIADO: "Cliente criado",
  CLIENTE_EDITADO: "Cliente editado",
  CLIENTE_SUBMETIDO: "Processo submetido",
  CLIENTE_DEVOLVIDO: "Processo devolvido",
  CLIENTE_APROVADO: "Cliente aprovado",
  CLIENTE_REJEITADO: "Cliente rejeitado",
  PARTE_RELACIONADA_ADICIONADA: "Sócio/beneficiário adicionado",
  PARTE_RELACIONADA_REMOVIDA: "Sócio/beneficiário removido",
  VINCULO_ADICIONADO: "Vínculo adicionado",
  VINCULO_REMOVIDO: "Vínculo removido",
  DOCUMENTO_CARREGADO: "Documento carregado",
  DOCUMENTO_VALIDADO: "Documento validado",
  DOCUMENTO_REJEITADO: "Documento rejeitado",
  DOCUMENTO_DESCARREGADO: "Documento descarregado",
  SCREENING_EXECUTADO: "Screening AML executado",
  ALERTA_PARECER: "Parecer sobre alerta",
  ALERTA_FALSO_POSITIVO: "Alerta encerrado como falso positivo",
  ALERTA_CONFIRMADO: "Alerta confirmado",
  PERFIL_ALTERADO: "Perfil de acesso alterado",
  UTILIZADOR_ATIVADO: "Utilizador reativado",
  UTILIZADOR_DESATIVADO: "Utilizador desativado",
  AUDITORIA_EXPORTADA: "Trilha de auditoria exportada",
  ACESSO_NEGADO: "Acesso negado",
};

export type AuditEntry = {
  actor: { id: string | null; name: string; role: string };
  action: AuditAction;
  entityType: "CLIENTE" | "DOCUMENTO" | "ALERTA" | "UTILIZADOR" | "SESSAO" | "AUDITORIA";
  entityId?: string | null;
  clientId?: string | null;
  summary: string;
  justification?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/**
 * Regista um evento na trilha de auditoria.
 * Deve ser chamado dentro da mesma transação da alteração: ou ficam ambos gravados, ou nenhum.
 */
export async function writeAudit(executor: Db | Tx, entry: AuditEntry) {
  await executor.insert(auditLog).values({
    actorId: entry.actor.id,
    actorName: entry.actor.name,
    actorRole: entry.actor.role,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    clientId: entry.clientId ?? null,
    summary: entry.summary,
    justification: entry.justification ?? null,
    metadata: entry.metadata ?? null,
    ipAddress: entry.ipAddress ?? null,
    userAgent: entry.userAgent?.slice(0, 300) ?? null,
  });
}
