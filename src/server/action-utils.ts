import "server-only";
import { db } from "@/db";
import { can, type Permission } from "@/lib/permissions";
import type { ActionState } from "@/lib/validation";
import { writeAudit } from "./audit";
import { getCurrentUser, requestMeta, type CurrentUser } from "./session";

export class ActionError extends Error {}

export type Authorized = { user: CurrentUser; meta: Awaited<ReturnType<typeof requestMeta>> };

/**
 * Re-verifica sessão e permissão dentro de cada Server Action.
 * Uma Server Action é um endpoint público: esconder um botão não é autorização.
 */
export async function authorize(permission: Permission): Promise<Authorized | ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "A sua sessão expirou. Inicie sessão novamente." };
  const meta = await requestMeta();
  if (!can(user.role, permission)) {
    await writeAudit(db, {
      actor: { id: user.id, name: user.name, role: user.role },
      action: "ACESSO_NEGADO",
      entityType: "SESSAO",
      summary: `Tentativa de executar ação sem permissão (${permission})`,
      ...meta,
    });
    return { ok: false, message: "O seu perfil não tem permissão para esta ação." };
  }
  return { user, meta };
}

export function isAuthorized(x: Authorized | ActionState): x is Authorized {
  return "user" in x;
}

export function actorOf(user: CurrentUser) {
  return { id: user.id, name: user.name, role: user.role };
}

export const CONFLICT_MESSAGE =
  "O processo foi alterado por outra pessoa entretanto. Recarregue a página e reveja antes de continuar.";

/** Converte erros esperados em mensagens; erros inesperados não expõem detalhes internos. */
export function handleActionError(error: unknown): ActionState {
  if (error instanceof ActionError) return { ok: false, message: error.message };
  // Erros do Next (redirect/notFound) devem continuar a propagar-se.
  if (error && typeof error === "object" && "digest" in error) throw error;
  console.error("[compliance-prime] erro numa ação:", error);
  return { ok: false, message: "Ocorreu um erro inesperado. Nenhuma alteração foi gravada." };
}
