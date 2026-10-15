import { db } from "@/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/server/audit";
import { listAudit } from "@/server/queries";
import { getCurrentUser, requestMeta } from "@/server/session";

/** Protege contra injeção de fórmulas ao abrir o CSV no Excel (=, +, -, @). */
function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current) return new Response("Não autenticado", { status: 401 });
  if (!can(current.role, "audit:export")) return new Response("Sem permissão", { status: 403 });

  const url = new URL(request.url);
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const from = url.searchParams.get("de") ?? undefined;
  const to = url.searchParams.get("ate") ?? undefined;
  const rows = await listAudit({
    action: url.searchParams.get("acao")?.slice(0, 40) || undefined,
    actor: url.searchParams.get("autor")?.slice(0, 80) || undefined,
    q: url.searchParams.get("q")?.slice(0, 80) || undefined,
    from: from && dateRe.test(from) ? from : undefined,
    to: to && dateRe.test(to) ? to : undefined,
    limit: 10_000,
  });

  await writeAudit(db, {
    actor: { id: current.id, name: current.name, role: current.role },
    action: "AUDITORIA_EXPORTADA",
    entityType: "AUDITORIA",
    summary: `Exportação de ${rows.length} registo(s) da trilha de auditoria`,
    metadata: Object.fromEntries(url.searchParams),
    ...(await requestMeta()),
  });

  const header = ["id", "data_hora_utc", "autor", "perfil", "acao", "entidade", "processo", "resumo", "justificacao", "ip"];
  const lines = rows.map((r) =>
    [r.id, r.createdAt.toISOString(), r.actorName, r.actorRole, r.action, r.entityType, r.clientReference, r.summary, r.justification, r.ipAddress]
      .map(csvCell)
      .join(","),
  );
  const body = "﻿" + [header.join(","), ...lines].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="auditoria-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
