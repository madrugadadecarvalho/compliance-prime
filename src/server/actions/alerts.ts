"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { client, screeningAlert, watchlistEntry } from "@/db/schema";
import { isClosed } from "@/lib/workflow";
import { type ActionState, alertDecisionSchema, alertOpinionSchema, formValues, toFieldErrors } from "@/lib/validation";
import { writeAudit } from "../audit";
import { recalculateRisk } from "../compliance";
import { ActionError, actorOf, authorize, handleActionError, isAuthorized } from "../action-utils";

async function lockAlert(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], alertId: string) {
  const [row] = await tx
    .select({
      id: screeningAlert.id,
      status: screeningAlert.status,
      clientId: screeningAlert.clientId,
      subjectName: screeningAlert.subjectName,
      matchScore: screeningAlert.matchScore,
      category: watchlistEntry.category,
      source: watchlistEntry.source,
      listName: watchlistEntry.fullName,
      clientStatus: client.status,
      clientCreatedById: client.createdById,
    })
    .from(screeningAlert)
    .innerJoin(client, eq(client.id, screeningAlert.clientId))
    .innerJoin(watchlistEntry, eq(watchlistEntry.id, screeningAlert.watchlistEntryId))
    .where(eq(screeningAlert.id, alertId))
    .for("update", { of: screeningAlert });
  if (!row) throw new ActionError("Alerta não encontrado.");
  if (isClosed(row.clientStatus)) throw new ActionError("O processo deste alerta está fechado.");
  if (row.status !== "ABERTO") throw new ActionError("Este alerta já foi decidido.");
  return row;
}

/** O analista instrui o alerta com um parecer; não o pode encerrar. */
export async function alertOpinionAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("alert:opinion");
  if (!isAuthorized(auth)) return auth;

  const parsed = alertOpinionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error), values: formValues(formData) };

  try {
    const alert = await db.transaction(async (tx) => {
      const row = await lockAlert(tx, parsed.data.alertId);
      await tx
        .update(screeningAlert)
        .set({ analystOpinion: parsed.data.opinion, analystOpinionById: auth.user.id })
        .where(eq(screeningAlert.id, row.id));
      await writeAudit(tx, {
        actor: actorOf(auth.user),
        action: "ALERTA_PARECER",
        entityType: "ALERTA",
        entityId: row.id,
        clientId: row.clientId,
        summary: `Parecer registado para ${row.subjectName} (${row.source}, ${row.matchScore}%)`,
        justification: parsed.data.opinion,
        ...auth.meta,
      });
      return row;
    });
    revalidatePath(`/alertas/${alert.id}`);
    revalidatePath(`/clientes/${alert.clientId}`);
    return { ok: true, message: "Parecer registado. Aguarda decisão de um supervisor." };
  } catch (error) {
    return handleActionError(error);
  }
}

/** Decisão do alerta: só supervisores/gestores, com justificação e dupla confirmação. */
export async function decideAlertAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("alert:decide");
  if (!isAuthorized(auth)) return auth;

  const parsed = alertDecisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error), values: formValues(formData) };

  try {
    const alert = await db.transaction(async (tx) => {
      const row = await lockAlert(tx, parsed.data.alertId);
      if (row.clientCreatedById === auth.user.id)
        throw new ActionError("Princípio dos quatro olhos: não pode decidir alertas de um processo que criou.");

      await tx
        .update(screeningAlert)
        .set({
          status: parsed.data.decision,
          decidedById: auth.user.id,
          decidedAt: new Date(),
          justification: parsed.data.justification,
        })
        .where(eq(screeningAlert.id, row.id));
      const risk = await recalculateRisk(tx, row.clientId);
      await writeAudit(tx, {
        actor: actorOf(auth.user),
        action: parsed.data.decision === "CONFIRMADO" ? "ALERTA_CONFIRMADO" : "ALERTA_FALSO_POSITIVO",
        entityType: "ALERTA",
        entityId: row.id,
        clientId: row.clientId,
        summary: `${row.subjectName} × ${row.listName} (${row.source}, ${row.matchScore}%) → ${parsed.data.decision}`,
        justification: parsed.data.justification,
        metadata: { category: row.category, riskAfter: risk.level },
        ...auth.meta,
      });
      return row;
    });
    revalidatePath(`/alertas/${alert.id}`);
    revalidatePath(`/clientes/${alert.clientId}`);
    return { ok: true, message: "Decisão registada na trilha de auditoria." };
  } catch (error) {
    return handleActionError(error);
  }
}
