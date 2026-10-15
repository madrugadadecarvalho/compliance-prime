"use server";

import { createHash } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { client, document } from "@/db/schema";
import { STATUS_LABEL, isClosed, isEditable } from "@/lib/workflow";
import { type ActionState, documentReviewSchema, documentUploadSchema, toFieldErrors } from "@/lib/validation";
import { writeAudit } from "../audit";
import { ActionError, actorOf, authorize, handleActionError, isAuthorized } from "../action-utils";

/**
 * Verifica a assinatura binária (magic bytes) do ficheiro.
 * O tipo MIME enviado pelo navegador pode ser falsificado; o conteúdo não.
 */
function detectMime(bytes: Buffer): "application/pdf" | "image/png" | "image/jpeg" | null {
  if (bytes.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}

function safeFileName(name: string) {
  const base = name.split(/[\\/]/).pop() ?? "documento";
  return (
    base
      .normalize("NFKD")
      .replace(/[^\w.\- ]+/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 120) || "documento"
  );
}

export async function uploadDocumentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("document:upload");
  if (!isAuthorized(auth)) return auth;

  const parsed = documentUploadSchema.safeParse({
    clientId: formData.get("clientId"),
    type: formData.get("type"),
    file: formData.get("file"),
  });
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error) };

  const { file, clientId, type } = parsed.data;
  const bytes = Buffer.from(await file.arrayBuffer());
  const realMime = detectMime(bytes);
  if (!realMime || realMime !== file.type) {
    return {
      ok: false,
      errors: { file: ["O conteúdo do ficheiro não corresponde a um PDF, PNG ou JPEG válido."] },
    };
  }
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  try {
    await db.transaction(async (tx) => {
      const [current] = await tx
        .select({ status: client.status })
        .from(client)
        .where(eq(client.id, clientId))
        .for("update");
      if (!current) throw new ActionError("Processo não encontrado.");
      if (!isEditable(current.status))
        throw new ActionError(`Não é possível carregar documentos num processo "${STATUS_LABEL[current.status]}".`);

      const [duplicate] = await tx
        .select({ id: document.id })
        .from(document)
        .where(and(eq(document.clientId, clientId), eq(document.sha256, sha256), ne(document.status, "REJEITADO")));
      if (duplicate) throw new ActionError("Este ficheiro já foi carregado neste processo.");

      const [created] = await tx
        .insert(document)
        .values({
          clientId,
          type,
          fileName: safeFileName(file.name),
          mimeType: realMime,
          sizeBytes: bytes.length,
          sha256,
          content: bytes,
          uploadedById: auth.user.id,
        })
        .returning({ id: document.id });
      await tx.update(client).set({ updatedAt: new Date() }).where(eq(client.id, clientId));
      await writeAudit(tx, {
        actor: actorOf(auth.user),
        action: "DOCUMENTO_CARREGADO",
        entityType: "DOCUMENTO",
        entityId: created.id,
        clientId,
        summary: `${type} carregado (${safeFileName(file.name)})`,
        metadata: { sha256, sizeBytes: bytes.length },
        ...auth.meta,
      });
    });
    revalidatePath(`/clientes/${clientId}`);
    return { ok: true, message: "Documento carregado. Aguarda validação por outra pessoa." };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function reviewDocumentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("document:review");
  if (!isAuthorized(auth)) return auth;

  const parsed = documentReviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error) };
  if (parsed.data.status === "REJEITADO" && !parsed.data.note) {
    return { ok: false, errors: { note: ["Indique o motivo da rejeição."] } };
  }

  try {
    const clientId = await db.transaction(async (tx) => {
      const [doc] = await tx
        .select({
          id: document.id,
          clientId: document.clientId,
          type: document.type,
          uploadedById: document.uploadedById,
          status: document.status,
          clientStatus: client.status,
        })
        .from(document)
        .innerJoin(client, eq(client.id, document.clientId))
        .where(eq(document.id, parsed.data.documentId))
        .for("update", { of: document });
      if (!doc) throw new ActionError("Documento não encontrado.");
      if (isClosed(doc.clientStatus)) throw new ActionError("O processo está fechado.");
      if (doc.status !== "PENDENTE") throw new ActionError("Este documento já foi revisto.");
      if (doc.uploadedById === auth.user.id)
        throw new ActionError("Princípio dos quatro olhos: não pode validar um documento que carregou.");

      await tx
        .update(document)
        .set({ status: parsed.data.status, reviewNote: parsed.data.note ?? null, reviewedById: auth.user.id })
        .where(eq(document.id, doc.id));
      await writeAudit(tx, {
        actor: actorOf(auth.user),
        action: parsed.data.status === "VALIDADO" ? "DOCUMENTO_VALIDADO" : "DOCUMENTO_REJEITADO",
        entityType: "DOCUMENTO",
        entityId: doc.id,
        clientId: doc.clientId,
        summary: `${doc.type} ${parsed.data.status === "VALIDADO" ? "validado" : "rejeitado"}`,
        justification: parsed.data.note ?? null,
        ...auth.meta,
      });
      return doc.clientId;
    });
    revalidatePath(`/clientes/${clientId}`);
    return { ok: true };
  } catch (error) {
    return handleActionError(error);
  }
}
