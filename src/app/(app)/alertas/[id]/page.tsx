import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { screeningAlert } from "@/db/schema";
import { requirePermission } from "@/server/session";
import { listAlerts } from "@/server/queries";
import { can } from "@/lib/permissions";
import { isClosed } from "@/lib/workflow";
import { countryName } from "@/lib/countries";
import { client } from "@/db/schema";
import { AlertStatusBadge, CategoryBadge, SOURCE_LABEL, SUBJECT_LABEL, ScoreMeter, StatusBadge } from "@/components/badges";
import { Card, CardBody, CardHeader, DescriptionList, Notice, formatDateTime } from "@/components/ui";
import { AlertDecisionForm, AlertOpinionForm } from "./alert-forms";

export const metadata: Metadata = { title: "Alerta AML" };

export default async function AlertDetailPage({ params }: PageProps<"/alertas/[id]">) {
  const user = await requirePermission("alert:view");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [row] = await db
    .select({ clientId: screeningAlert.clientId })
    .from(screeningAlert)
    .where(eq(screeningAlert.id, id));
  if (!row) notFound();
  const alert = (await listAlerts({ clientId: row.clientId })).find((a) => a.id === id);
  if (!alert) notFound();

  const [proc] = await db
    .select({ status: client.status, country: client.country, nationality: client.nationality })
    .from(client)
    .where(eq(client.id, alert.clientId));

  const closed = isClosed(proc.status);
  const ownProcess = alert.clientCreatedById === user.id;
  const mayDecide = can(user.role, "alert:decide") && alert.status === "ABERTO" && !closed && !ownProcess;
  const mayOpine = can(user.role, "alert:opinion") && alert.status === "ABERTO" && !closed;

  return (
    <>
      <p className="font-mono text-xs text-slate-500">
        <Link href="/alertas" className="hover:underline">Alertas</Link> /{" "}
        <Link href={`/clientes/${alert.clientId}#alertas`} className="hover:underline">{alert.clientReference}</Link>
      </p>
      <div className="mb-6 mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{alert.subjectName}</h1>
        <CategoryBadge category={alert.category} />
        <AlertStatusBadge status={alert.status} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          {/* Hierarquia visual: o que foi identificado, de onde veio, grau de correspondência */}
          <Card>
            <CardHeader title="O que foi identificado" />
            <CardBody>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-md border border-slate-200 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sujeito verificado</p>
                  <p className="mt-1 text-lg font-semibold">{alert.subjectName}</p>
                  <p className="text-sm text-slate-600">
                    {SUBJECT_LABEL[alert.subjectType]} do processo {alert.clientReference}
                  </p>
                  <p className="text-sm text-slate-600">
                    País: {countryName(proc.country)} · Nacionalidade: {countryName(proc.nationality)}
                  </p>
                </div>
                <div className="rounded-md border border-red-200 bg-red-50/40 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Entrada na lista</p>
                  <p className="mt-1 text-lg font-semibold">{alert.listName}</p>
                  {alert.listAliases.length ? (
                    <p className="text-sm text-slate-600">Também conhecido como: {alert.listAliases.join(", ")}</p>
                  ) : null}
                  <p className="text-sm text-slate-600">País associado: {countryName(alert.listCountry)}</p>
                </div>
              </div>
              <div className="mt-5">
                <DescriptionList
                  items={[
                    { label: "Grau de correspondência", value: <ScoreMeter score={alert.matchScore} /> },
                    { label: "Correspondeu com", value: `“${alert.matchedOn}”` },
                    { label: "Origem", value: SOURCE_LABEL[alert.source] },
                    { label: "Referência na lista", value: <span className="font-mono">{alert.listReference}</span> },
                    { label: "Gerado em", value: formatDateTime(alert.createdAt) },
                    { label: "Estado do processo", value: <StatusBadge status={proc.status} /> },
                    { label: "Notas da lista", value: alert.listNotes, wide: true },
                  ]}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Parecer do analista" />
            <CardBody className="space-y-4">
              {alert.analystOpinion ? (
                <blockquote className="border-l-2 border-slate-300 pl-3 text-sm text-slate-700">{alert.analystOpinion}</blockquote>
              ) : (
                <p className="text-sm text-slate-600">Ainda sem parecer.</p>
              )}
              {mayOpine && <AlertOpinionForm alertId={alert.id} />}
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader title="Decisão" description="Quem pode agir: Supervisor ou Gestor de Compliance que não criou o processo." />
            <CardBody className="space-y-4">
              {alert.status !== "ABERTO" ? (
                <Notice
                  tone={alert.status === "CONFIRMADO" ? "red" : "green"}
                  title={`${alert.status === "CONFIRMADO" ? "Confirmado" : "Falso positivo"} por ${alert.decidedByName ?? "—"} · ${formatDateTime(alert.decidedAt)}`}
                >
                  {alert.justification}
                </Notice>
              ) : mayDecide ? (
                <AlertDecisionForm alertId={alert.id} isSanction={alert.category === "SANCAO"} />
              ) : (
                <p className="text-sm text-slate-600">
                  {closed
                    ? "O processo está fechado."
                    : ownProcess && can(user.role, "alert:decide")
                      ? "Princípio dos quatro olhos: não pode decidir alertas de um processo que criou."
                      : "O seu perfil não decide alertas. Aguarda decisão de um supervisor."}
                </p>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}
