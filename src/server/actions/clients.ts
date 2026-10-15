"use server";

import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { client, clientLink, document, relatedParty, screeningAlert, watchlistEntry } from "@/db/schema";
import { STATUS_LABEL, canApprove, canReject, canReturn, canSubmit, isEditable, missingDocuments } from "@/lib/workflow";
import {
  type ActionState,
  clientLinkSchema,
  clientSchema,
  decisionSchema,
  formValues,
  relatedPartySchema,
  returnSchema,
  toFieldErrors,
} from "@/lib/validation";
import { z } from "zod";
import { writeAudit } from "../audit";
import { recalculateRisk, runScreening } from "../compliance";
import {
  ActionError,
  CONFLICT_MESSAGE,
  actorOf,
  authorize,
  handleActionError,
  isAuthorized,
} from "../action-utils";

function newReference() {
  const year = new Date().getFullYear();
  return `CP-${year}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function toClientValues(data: z.infer<typeof clientSchema>) {
  return {
    type: data.type,
    fullName: data.fullName,
    documentNumber: data.documentNumber.toUpperCase(),
    taxId: data.taxId?.toUpperCase() ?? null,
    country: data.country,
    nationality: data.nationality ?? null,
    birthOrIncorporationDate: data.birthOrIncorporationDate ?? null,
    address: data.address,
    email: data.email ?? null,
    phone: data.phone ?? null,
    activity: data.activity,
    sourceOfFunds: data.sourceOfFunds,
    expectedMonthlyVolume: data.expectedMonthlyVolume?.toFixed(2) ?? null,
    isPep: data.isPep,
  };
}

function isUniqueViolation(error: unknown) {
  const code = (error as { code?: string; cause?: { code?: string } })?.code ??
    (error as { cause?: { code?: string } })?.cause?.code;
  return code === "23505";
}

/* ----------------------------- Criar / editar ----------------------------- */

export async function createClientAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("client:create");
  if (!isAuthorized(auth)) return auth;

  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: toFieldErrors(parsed.error), values: formValues(formData) };
  }

  let id: string;
  try {
    id = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(client)
        .values({ ...toClientValues(parsed.data), reference: newReference(), createdById: auth.user.id })
        .returning({ id: client.id, reference: client.reference });
      await recalculateRisk(tx, created.id);
      await writeAudit(tx, {
        actor: actorOf(auth.user),
        action: "CLIENTE_CRIADO",
        entityType: "CLIENTE",
        entityId: created.id,
        clientId: created.id,
        summary: `Processo ${created.reference} criado em rascunho para ${parsed.data.fullName}`,
        ...auth.meta,
      });
      return created.id;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        errors: { documentNumber: ["Já existe um cliente com este documento."] },
        values: formValues(formData),
      };
    }
    return { ...handleActionError(error), values: formValues(formData) };
  }

  redirect(`/clientes/${id}`);
}

export async function updateClientAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("client:edit");
  if (!isAuthorized(auth)) return auth;

  const ids = z
    .object({ clientId: z.uuid(), version: z.coerce.number().int().positive() })
    .safeParse(Object.fromEntries(formData));
  if (!ids.success) return { ok: false, message: "Pedido inválido." };

  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: toFieldErrors(parsed.error), values: formValues(formData) };
  }

  try {
    await db.transaction(async (tx) => {
      const [current] = await tx.select().from(client).where(eq(client.id, ids.data.clientId)).for("update");
      if (!current) throw new ActionError("Processo não encontrado.");
      if (!isEditable(current.status))
        throw new ActionError(`Um processo "${STATUS_LABEL[current.status]}" já não pode ser editado.`);

      const values = toClientValues(parsed.data);
      const changed = Object.entries(values)
        .filter(([k, v]) => String(current[k as keyof typeof current] ?? "") !== String(v ?? ""))
        .map(([k]) => k);

      const updated = await tx
        .update(client)
        .set({ ...values, version: sql`${client.version} + 1`, updatedAt: new Date() })
        .where(and(eq(client.id, current.id), eq(client.version, ids.data.version)))
        .returning({ id: client.id });
      if (!updated.length) throw new ActionError(CONFLICT_MESSAGE);

      await recalculateRisk(tx, current.id);
      await writeAudit(tx, {
        actor: actorOf(auth.user),
        action: "CLIENTE_EDITADO",
        entityType: "CLIENTE",
        entityId: current.id,
        clientId: current.id,
        summary: changed.length
          ? `Dados alterados: ${changed.join(", ")}`
          : "Dados guardados sem alterações",
        metadata: { changedFields: changed },
        ...auth.meta,
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, errors: { documentNumber: ["Já existe um cliente com este documento."] }, values: formValues(formData) };
    }
    return { ...handleActionError(error), values: formValues(formData) };
  }

  revalidatePath(`/clientes/${ids.data.clientId}`);
  redirect(`/clientes/${ids.data.clientId}`);
}

/* ------------------------------ Transições ------------------------------ */

async function loadDecisionContext(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], clientId: string) {
  const [current] = await tx.select().from(client).where(eq(client.id, clientId)).for("update");
  if (!current) throw new ActionError("Processo não encontrado.");

  const docs = await tx
    .select({ type: document.type, status: document.status })
    .from(document)
    .where(eq(document.clientId, clientId));
  const alerts = await tx
    .select({ status: screeningAlert.status, category: watchlistEntry.category })
    .from(screeningAlert)
    .innerJoin(watchlistEntry, eq(watchlistEntry.id, screeningAlert.watchlistEntryId))
    .where(eq(screeningAlert.clientId, clientId));

  return {
    current,
    docs,
    ctx: {
      status: current.status,
      riskLevel: current.riskLevel,
      createdById: current.createdById,
      openAlerts: alerts.filter((a) => a.status === "ABERTO").length,
      confirmedSanctions: alerts.filter((a) => a.status === "CONFIRMADO" && a.category === "SANCAO").length,
      missingDocuments: missingDocuments(current.type, docs).length,
      pendingDocuments: docs.filter((d) => d.status === "PENDENTE").length,
    },
  };
}

export async function submitClientAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("client:submit");
  if (!isAuthorized(auth)) return auth;

  const parsed = z
    .object({ clientId: z.uuid(), version: z.coerce.number().int().positive() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Pedido inválido." };

  try {
    const message = await db.transaction(async (tx) => {
      const { current, docs, ctx } = await loadDecisionContext(tx, parsed.data.clientId);
      if (current.version !== parsed.data.version) throw new ActionError(CONFLICT_MESSAGE);
      const check = canSubmit(actorOf(auth.user), ctx);
      if (!check.allowed) throw new ActionError(check.reason);

      const missing = missingDocuments(current.type, docs);
      const next = missing.length ? "PENDENTE_DOCUMENTOS" : "EM_ANALISE";

      let screeningSummary = "";
      if (next === "EM_ANALISE") {
        const result = await runScreening(tx, current.id);
        screeningSummary = `${result.screenedSubjects} sujeito(s) verificados, ${result.newAlerts.length} novo(s) alerta(s).`;
        await writeAudit(tx, {
          actor: actorOf(auth.user),
          action: "SCREENING_EXECUTADO",
          entityType: "CLIENTE",
          entityId: current.id,
          clientId: current.id,
          summary: `Screening AML: ${screeningSummary}`,
          metadata: { newAlerts: result.newAlerts },
          ...auth.meta,
        });
      }

      await tx
        .update(client)
        .set({
          status: next,
          submittedAt: new Date(),
          version: sql`${client.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(client.id, current.id));
      const risk = await recalculateRisk(tx, current.id);

      await writeAudit(tx, {
        actor: actorOf(auth.user),
        action: "CLIENTE_SUBMETIDO",
        entityType: "CLIENTE",
        entityId: current.id,
        clientId: current.id,
        summary: `${STATUS_LABEL[current.status]} → ${STATUS_LABEL[next]}`,
        metadata: { from: current.status, to: next, missingDocuments: missing, risk: risk.level },
        ...auth.meta,
      });

      return next === "EM_ANALISE"
        ? `Processo enviado para análise. ${screeningSummary}`
        : `Faltam documentos obrigatórios (${missing.length}). O processo ficou pendente de documentos.`;
    });
    revalidatePath(`/clientes/${parsed.data.clientId}`);
    return { ok: true, message };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function returnClientAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("client:return");
  if (!isAuthorized(auth)) return auth;

  const parsed = returnSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error), values: formValues(formData) };

  try {
    await db.transaction(async (tx) => {
      const { current, ctx } = await loadDecisionContext(tx, parsed.data.clientId);
      if (current.version !== parsed.data.version) throw new ActionError(CONFLICT_MESSAGE);
      const check = canReturn(actorOf(auth.user), ctx);
      if (!check.allowed) throw new ActionError(check.reason);

      await tx
        .update(client)
        .set({ status: "PENDENTE_DOCUMENTOS", version: sql`${client.version} + 1`, updatedAt: new Date() })
        .where(eq(client.id, current.id));
      await writeAudit(tx, {
        actor: actorOf(auth.user),
        action: "CLIENTE_DEVOLVIDO",
        entityType: "CLIENTE",
        entityId: current.id,
        clientId: current.id,
        summary: `${STATUS_LABEL[current.status]} → ${STATUS_LABEL.PENDENTE_DOCUMENTOS}`,
        justification: parsed.data.justification,
        ...auth.meta,
      });
    });
    revalidatePath(`/clientes/${parsed.data.clientId}`);
    return { ok: true, message: "Processo devolvido ao analista." };
  } catch (error) {
    return handleActionError(error);
  }
}

async function decide(
  decision: "APROVADO" | "REJEITADO",
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorize(decision === "APROVADO" ? "client:approve" : "client:reject");
  if (!isAuthorized(auth)) return auth;

  const parsed = decisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error), values: formValues(formData) };

  try {
    await db.transaction(async (tx) => {
      // O risco é recalculado antes da decisão, para que a regra de risco alto use dados atuais.
      await recalculateRisk(tx, parsed.data.clientId);
      const { current, ctx } = await loadDecisionContext(tx, parsed.data.clientId);
      if (current.version !== parsed.data.version) throw new ActionError(CONFLICT_MESSAGE);

      const check = decision === "APROVADO" ? canApprove(actorOf(auth.user), ctx) : canReject(actorOf(auth.user), ctx);
      if (!check.allowed) throw new ActionError(check.reason);

      await tx
        .update(client)
        .set({
          status: decision,
          decidedById: auth.user.id,
          decidedAt: new Date(),
          decisionReason: parsed.data.justification,
          version: sql`${client.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(client.id, current.id));

      await writeAudit(tx, {
        actor: actorOf(auth.user),
        action: decision === "APROVADO" ? "CLIENTE_APROVADO" : "CLIENTE_REJEITADO",
        entityType: "CLIENTE",
        entityId: current.id,
        clientId: current.id,
        summary: `${STATUS_LABEL[current.status]} → ${STATUS_LABEL[decision]} (risco ${current.riskLevel ?? "—"})`,
        justification: parsed.data.justification,
        metadata: { riskLevel: current.riskLevel, riskScore: current.riskScore },
        ...auth.meta,
      });
    });
    revalidatePath(`/clientes/${parsed.data.clientId}`);
    return { ok: true, message: decision === "APROVADO" ? "Cliente aprovado." : "Cliente rejeitado." };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function approveClientAction(_: ActionState, formData: FormData) {
  return decide("APROVADO", formData);
}

export async function rejectClientAction(_: ActionState, formData: FormData) {
  return decide("REJEITADO", formData);
}

/* ---------------------- Partes relacionadas e vínculos ---------------------- */

async function assertEditable(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], clientId: string) {
  const [current] = await tx
    .select({ status: client.status })
    .from(client)
    .where(eq(client.id, clientId))
    .for("update");
  if (!current) throw new ActionError("Processo não encontrado.");
  if (!isEditable(current.status))
    throw new ActionError(`Um processo "${STATUS_LABEL[current.status]}" já não pode ser alterado.`);
}

export async function addRelatedPartyAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("client:edit");
  if (!isAuthorized(auth)) return auth;

  const parsed = relatedPartySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error), values: formValues(formData) };

  try {
    await db.transaction(async (tx) => {
      await assertEditable(tx, parsed.data.clientId);
      const [created] = await tx
        .insert(relatedParty)
        .values({
          clientId: parsed.data.clientId,
          fullName: parsed.data.fullName,
          role: parsed.data.role,
          ownershipPercentage: parsed.data.ownershipPercentage?.toFixed(2) ?? null,
          nationality: parsed.data.nationality,
          documentNumber: parsed.data.documentNumber ?? null,
          isPep: parsed.data.isPep,
        })
        .returning({ id: relatedParty.id });
      await tx.update(client).set({ updatedAt: new Date() }).where(eq(client.id, parsed.data.clientId));
      await recalculateRisk(tx, parsed.data.clientId);
      await writeAudit(tx, {
        actor: actorOf(auth.user),
        action: "PARTE_RELACIONADA_ADICIONADA",
        entityType: "CLIENTE",
        entityId: created.id,
        clientId: parsed.data.clientId,
        summary: `${parsed.data.fullName} adicionado como ${parsed.data.role}`,
        ...auth.meta,
      });
    });
    revalidatePath(`/clientes/${parsed.data.clientId}`);
    return { ok: true, message: "Parte relacionada adicionada." };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function removeRelatedPartyAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("client:edit");
  if (!isAuthorized(auth)) return auth;
  const parsed = z.object({ id: z.uuid(), clientId: z.uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Pedido inválido." };

  try {
    await db.transaction(async (tx) => {
      await assertEditable(tx, parsed.data.clientId);
      const [removed] = await tx
        .delete(relatedParty)
        .where(and(eq(relatedParty.id, parsed.data.id), eq(relatedParty.clientId, parsed.data.clientId)))
        .returning({ fullName: relatedParty.fullName });
      if (!removed) throw new ActionError("Registo não encontrado.");
      await recalculateRisk(tx, parsed.data.clientId);
      await writeAudit(tx, {
        actor: actorOf(auth.user),
        action: "PARTE_RELACIONADA_REMOVIDA",
        entityType: "CLIENTE",
        entityId: parsed.data.id,
        clientId: parsed.data.clientId,
        summary: `${removed.fullName} removido das partes relacionadas`,
        ...auth.meta,
      });
    });
    revalidatePath(`/clientes/${parsed.data.clientId}`);
    return { ok: true };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function addLinkAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("client:edit");
  if (!isAuthorized(auth)) return auth;
  const parsed = clientLinkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error), values: formValues(formData) };

  try {
    await db.transaction(async (tx) => {
      await assertEditable(tx, parsed.data.clientId);
      const [created] = await tx
        .insert(clientLink)
        .values({
          clientId: parsed.data.clientId,
          entityName: parsed.data.entityName,
          relationType: parsed.data.relationType,
          description: parsed.data.description ?? null,
        })
        .returning({ id: clientLink.id });
      await writeAudit(tx, {
        actor: actorOf(auth.user),
        action: "VINCULO_ADICIONADO",
        entityType: "CLIENTE",
        entityId: created.id,
        clientId: parsed.data.clientId,
        summary: `Vínculo "${parsed.data.relationType}" com ${parsed.data.entityName}`,
        ...auth.meta,
      });
    });
    revalidatePath(`/clientes/${parsed.data.clientId}`);
    return { ok: true, message: "Vínculo adicionado." };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function removeLinkAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("client:edit");
  if (!isAuthorized(auth)) return auth;
  const parsed = z.object({ id: z.uuid(), clientId: z.uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Pedido inválido." };

  try {
    await db.transaction(async (tx) => {
      await assertEditable(tx, parsed.data.clientId);
      const [removed] = await tx
        .delete(clientLink)
        .where(and(eq(clientLink.id, parsed.data.id), eq(clientLink.clientId, parsed.data.clientId)))
        .returning({ entityName: clientLink.entityName });
      if (!removed) throw new ActionError("Registo não encontrado.");
      await writeAudit(tx, {
        actor: actorOf(auth.user),
        action: "VINCULO_REMOVIDO",
        entityType: "CLIENTE",
        entityId: parsed.data.id,
        clientId: parsed.data.clientId,
        summary: `Vínculo com ${removed.entityName} removido`,
        ...auth.meta,
      });
    });
    revalidatePath(`/clientes/${parsed.data.clientId}`);
    return { ok: true };
  } catch (error) {
    return handleActionError(error);
  }
}
