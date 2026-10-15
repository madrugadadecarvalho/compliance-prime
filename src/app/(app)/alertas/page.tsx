import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/session";
import { listAlerts } from "@/server/queries";
import { AlertStatusBadge, CategoryBadge, SOURCE_LABEL, SUBJECT_LABEL, ScoreMeter, ALERT_STATUS_LABEL } from "@/components/badges";
import { Card, EmptyState, PageHeader, Table, Td, Th, cn, formatDateTime } from "@/components/ui";

export const metadata: Metadata = { title: "Alertas AML" };

const FILTERS = ["ABERTO", "CONFIRMADO", "FALSO_POSITIVO"] as const;

export default async function AlertsPage({ searchParams }: PageProps<"/alertas">) {
  await requirePermission("alert:view");
  const sp = await searchParams;
  const status = FILTERS.find((f) => f === sp.estado) ?? (sp.estado === "todos" ? undefined : "ABERTO");
  const rows = await listAlerts({ status });

  return (
    <>
      <PageHeader
        eyebrow="Screening"
        title="Alertas AML"
        description="Ordenados por estado, gravidade (sanções primeiro) e grau de correspondência."
      />
      <nav aria-label="Filtrar alertas" className="mb-4 flex flex-wrap gap-1">
        {[...FILTERS, "todos" as const].map((f) => {
          const active = f === (status ?? "todos");
          return (
            <Link
              key={f}
              href={`/alertas?estado=${f}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1 text-sm",
                active ? "bg-brand-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
              )}
            >
              {f === "todos" ? "Todos" : ALERT_STATUS_LABEL[f]}
            </Link>
          );
        })}
      </nav>
      <Card>
        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Sem alertas neste filtro." />
          </div>
        ) : (
          <Table>
            <thead className="bg-slate-50">
              <tr>
                <Th>Sujeito</Th>
                <Th>Identificado</Th>
                <Th>Origem</Th>
                <Th>Correspondência</Th>
                <Th>Estado</Th>
                <Th>Processo</Th>
                <Th>Gerado</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <Td>
                    <Link href={`/alertas/${a.id}`} className="font-medium text-brand-700 hover:underline">
                      {a.subjectName}
                    </Link>
                    <div className="text-xs text-slate-500">{SUBJECT_LABEL[a.subjectType]}</div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <CategoryBadge category={a.category} />
                      <span className="text-slate-700">{a.matchedOn}</span>
                    </div>
                  </Td>
                  <Td className="text-slate-600">{SOURCE_LABEL[a.source]}</Td>
                  <Td><ScoreMeter score={a.matchScore} /></Td>
                  <Td><AlertStatusBadge status={a.status} /></Td>
                  <Td className="font-mono text-xs">
                    <Link href={`/clientes/${a.clientId}#alertas`} className="hover:underline">{a.clientReference}</Link>
                  </Td>
                  <Td className="whitespace-nowrap text-slate-600">{formatDateTime(a.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
