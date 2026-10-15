import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { requirePermission } from "@/server/session";
import { listAudit } from "@/server/queries";
import { can } from "@/lib/permissions";
import { ACTION_LABEL, type AuditAction } from "@/server/audit";
import { Badge, Button, Card, EmptyState, PageHeader, Table, Td, Th, cn, formatDateTime, inputClass } from "@/components/ui";

export const metadata: Metadata = { title: "Trilha de auditoria" };

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const dateRe = /^\d{4}-\d{2}-\d{2}$/;

export default async function AuditPage({ searchParams }: PageProps<"/auditoria">) {
  const user = await requirePermission("audit:view");
  const sp = await searchParams;
  const filters = {
    action: str(sp.acao, 40),
    actor: str(sp.autor, 80),
    q: str(sp.q, 80),
    from: str(sp.de, 10)?.match(dateRe) ? str(sp.de, 10) : undefined,
    to: str(sp.ate, 10)?.match(dateRe) ? str(sp.ate, 10) : undefined,
  };
  const rows = await listAudit(filters);
  const exportQuery = new URLSearchParams(
    Object.entries({ acao: filters.action, autor: filters.actor, q: filters.q, de: filters.from, ate: filters.to }).filter(
      (e): e is [string, string] => !!e[1],
    ),
  ).toString();

  return (
    <>
      <PageHeader
        eyebrow="Auditoria"
        title="Trilha de auditoria"
        description="Registo imutável (append-only, protegido por trigger na base de dados) de todas as ações: quem fez, quando, sobre o quê e com que justificação."
        actions={
          can(user.role, "audit:export") && (
            <a
              href={`/api/auditoria/exportar${exportQuery ? `?${exportQuery}` : ""}`}
              className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-medium text-primary ring-1 ring-inset ring-outline hover:bg-primary-container/40"
            >
              <Download className="size-4" aria-hidden /> Exportar CSV
            </a>
          )
        }
      />

      <form className="mb-4 grid gap-3 rounded-2xl border border-outline-variant bg-surface shadow-elevation-1 p-4 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <div className="lg:col-span-2">
          <label htmlFor="q" className="text-xs font-medium text-slate-600">Texto (resumo, justificação, referência)</label>
          <input id="q" name="q" defaultValue={filters.q} maxLength={80} className={cn(inputClass, "mt-1")} />
        </div>
        <div>
          <label htmlFor="acao" className="text-xs font-medium text-slate-600">Ação</label>
          <select id="acao" name="acao" defaultValue={filters.action ?? ""} className={cn(inputClass, "mt-1")}>
            <option value="">Todas</option>
            {Object.entries(ACTION_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="autor" className="text-xs font-medium text-slate-600">Autor</label>
          <input id="autor" name="autor" defaultValue={filters.actor} maxLength={80} className={cn(inputClass, "mt-1")} />
        </div>
        <div>
          <label htmlFor="de" className="text-xs font-medium text-slate-600">De</label>
          <input id="de" name="de" type="date" defaultValue={filters.from} className={cn(inputClass, "mt-1")} />
        </div>
        <div>
          <label htmlFor="ate" className="text-xs font-medium text-slate-600">Até</label>
          <input id="ate" name="ate" type="date" defaultValue={filters.to} className={cn(inputClass, "mt-1")} />
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
          <Button type="submit">Filtrar</Button>
          <Link href="/auditoria" className="rounded-full px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container">Limpar</Link>
        </div>
      </form>

      <Card>
        {rows.length === 0 ? (
          <div className="p-5"><EmptyState title="Sem registos para estes filtros." /></div>
        ) : (
          <Table>
            <thead className="bg-surface-container/60">
              <tr>
                <Th>Data/hora</Th>
                <Th>Autor</Th>
                <Th>Ação</Th>
                <Th>Processo</Th>
                <Th>Detalhe</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td className="whitespace-nowrap font-mono text-xs text-slate-600">{formatDateTime(r.createdAt)}</Td>
                  <Td>
                    <span className="font-medium">{r.actorName}</span>
                    <div className="text-xs text-slate-500">{r.actorRole}</div>
                  </Td>
                  <Td>
                    <Badge tone={r.action.includes("REJEIT") || r.action === "ALERTA_CONFIRMADO" || r.action === "ACESSO_NEGADO" || r.action === "LOGIN_FALHADO" ? "red" : r.action.includes("APROV") ? "green" : "slate"}>
                      {ACTION_LABEL[r.action as AuditAction] ?? r.action}
                    </Badge>
                  </Td>
                  <Td className="font-mono text-xs">
                    {r.clientId ? <Link href={`/clientes/${r.clientId}#historico`} className="hover:underline">{r.clientReference}</Link> : "—"}
                  </Td>
                  <Td className="max-w-xl">
                    <p>{r.summary}</p>
                    {r.justification && <p className="mt-1 text-xs italic text-slate-600">“{r.justification}”</p>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <p className="mt-2 text-xs text-slate-500">A mostrar até 300 registos mais recentes. Use os filtros ou a exportação para períodos maiores.</p>
    </>
  );
}
