"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { session, user } from "@/db/schema";
import { ROLE_LABEL } from "@/lib/permissions";
import { type ActionState, roleChangeSchema, toFieldErrors, userStatusSchema, formValues } from "@/lib/validation";
import { writeAudit } from "../audit";
import { ActionError, actorOf, authorize, handleActionError, isAuthorized } from "../action-utils";

export async function changeRoleAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("users:manage");
  if (!isAuthorized(auth)) return auth;

  const parsed = roleChangeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error), values: formValues(formData) };
  if (parsed.data.userId === auth.user.id)
    return { ok: false, message: "Não pode alterar o seu próprio perfil de acesso." };

  try {
    await db.transaction(async (tx) => {
      const [target] = await tx.select().from(user).where(eq(user.id, parsed.data.userId)).for("update");
      if (!target) throw new ActionError("Utilizador não encontrado.");
      if (target.role === parsed.data.role) throw new ActionError("O utilizador já tem esse perfil.");

      await tx.update(user).set({ role: parsed.data.role, updatedAt: new Date() }).where(eq(user.id, target.id));
      // Força novo login para que o novo perfil seja aplicado em todas as sessões.
      await tx.delete(session).where(eq(session.userId, target.id));
      await writeAudit(tx, {
        actor: actorOf(auth.user),
        action: "PERFIL_ALTERADO",
        entityType: "UTILIZADOR",
        entityId: target.id,
        summary: `${target.name}: ${ROLE_LABEL[target.role]} → ${ROLE_LABEL[parsed.data.role]}`,
        justification: parsed.data.justification,
        metadata: { from: target.role, to: parsed.data.role },
        ...auth.meta,
      });
    });
    revalidatePath("/admin/utilizadores");
    return { ok: true, message: "Perfil alterado. As sessões ativas do utilizador foram terminadas." };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function setUserActiveAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("users:manage");
  if (!isAuthorized(auth)) return auth;

  const parsed = userStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error), values: formValues(formData) };
  if (parsed.data.userId === auth.user.id) return { ok: false, message: "Não pode desativar a sua própria conta." };

  try {
    await db.transaction(async (tx) => {
      const [target] = await tx.select().from(user).where(eq(user.id, parsed.data.userId)).for("update");
      if (!target) throw new ActionError("Utilizador não encontrado.");
      await tx.update(user).set({ active: parsed.data.active, updatedAt: new Date() }).where(eq(user.id, target.id));
      if (!parsed.data.active) await tx.delete(session).where(eq(session.userId, target.id));
      await writeAudit(tx, {
        actor: actorOf(auth.user),
        action: parsed.data.active ? "UTILIZADOR_ATIVADO" : "UTILIZADOR_DESATIVADO",
        entityType: "UTILIZADOR",
        entityId: target.id,
        summary: `${target.name} ${parsed.data.active ? "reativado" : "desativado"}`,
        justification: parsed.data.justification,
        ...auth.meta,
      });
    });
    revalidatePath("/admin/utilizadores");
    return { ok: true, message: parsed.data.active ? "Utilizador reativado." : "Utilizador desativado e sessões terminadas." };
  } catch (error) {
    return handleActionError(error);
  }
}
