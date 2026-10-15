import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { document } from "@/db/schema";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/server/audit";
import { getCurrentUser, requestMeta } from "@/server/session";

export async function GET(_request: Request, ctx: RouteContext<"/api/documentos/[id]">) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return new Response("Pedido inválido", { status: 400 });

  const current = await getCurrentUser();
  if (!current) return new Response("Não autenticado", { status: 401 });
  if (!can(current.role, "document:download")) return new Response("Sem permissão", { status: 403 });

  const [doc] = await db.select().from(document).where(eq(document.id, id));
  if (!doc) return new Response("Não encontrado", { status: 404 });

  await writeAudit(db, {
    actor: { id: current.id, name: current.name, role: current.role },
    action: "DOCUMENTO_DESCARREGADO",
    entityType: "DOCUMENTO",
    entityId: doc.id,
    clientId: doc.clientId,
    summary: `${doc.type} consultado (${doc.fileName})`,
    ...(await requestMeta()),
  });

  return new Response(new Uint8Array(doc.content), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(doc.sizeBytes),
      "Content-Disposition": `attachment; filename="${doc.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
