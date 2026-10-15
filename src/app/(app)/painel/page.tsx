import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { client } from "@/db/schema";
import { requireUser } from "@/server/session";
import { dashboardStats, listAlerts } from "@/server/queries";
import { can } from "@/lib/permissions";
import { ACTION_LABEL, type AuditAction } from "@/server/audit";
import { STATUS_LABEL } from "@/lib/workflow";
import { RiskBadge, StatusBadge, CategoryBadge, ScoreMeter } from "@/components/badges";
import { Card, CardBody, CardHeader, EmptyState, LinkButton, PageHeader, formatDateTime } from "@/components/ui";

export const metadata: Metadata = { title: "Painel" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [stats, openAlerts] = await Promise.all([dashboardStats(), listAlerts({ status: "ABERTO" })]);

  // "Mostrar tudo é o mesmo que não mostrar nada": o painel destaca o que exige ação deste perfil.
  const myQueue = await (async () => {
    if (user.role === "ANALISTA") {
      return db
        .select()
        .from(client)
        .where(and(eq(client.createdById, user.id), inArray(client.status, ["RASCUNHO", "PENDENTE_DOCUMENTOS"])))
        .orderBy(desc(client.updatedAt))
        .limit(8);
    }
    if (user.role === "SUPERVISOR" || user.role === "GESTOR") {
      return db
        .select()
        .from(client)
        .where(
          and(
            eq(client.status, "EM_ANALISE"),
            ne(client.createdById, user.id),
            user.role === "SUPERVISOR" ? ne(client.riskLevel, "ALTO") : undefined,
          ),
        )
        .orderBy(desc(client.riskScore), desc(client.submittedAt))
        .limit(8);
    }
    return [];
  })();

  const queueTitle =
    user.role === "ANALISTA"
      ? "Os seus processos por concluir"
      : user.role === "AUDITOR"
        ? null
        : user.role === "GESTOR"
          ? "Processos à espera de decisão (incluindo risco alto)"
          : "Processos à espera de decisão";

  const alertsForMe =
    user.role === "ANALISTA"
      ? openAlerts.filter((a) => !a.analystOpinion)
      : can(user.role, "alert:decide")
        ? openAlerts.filter((a) => a.clientCreatedById !== user.id)
        : [];

  const statTiles = [
    { label: "Em análise", value: stats.status.EM_ANALISE ?? 0, href: "/clientes?estado=EM_ANALISE" },
    { label: "Pendentes de documentos", value: stats.status.PENDENTE_DOCUMENTOS ?? 0, href: "/clientes?estado=PENDENTE_DOCUMENTOS" },
    { label: "Alertas de sanções por decidir", value: stats.alerts.SANCAO ?? 0, href: "/alertas", danger: (stats.alerts.SANCAO ?? 0) > 0 },
    { label: "Alertas PEP por decidir", value: stats.alerts.PEP ?? 0, href: "/alertas" },
    { label: "Em curso com risco alto", value: stats.risk.ALTO ?? 0, href: "/clientes?estado=EM_ANALISE" },
    { label: "Aprovados", value: stats.status.APROVADO ?? 0, href: "/clientes?estado=APROVADO" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Painel"
        title={`Olá, ${user.name.split(" ")[0]}`}
        description="O que exige a sua atenção agora, por ordem de risco."
        actions={can(user.role, "client:create") && <LinkButton href="/clientes/novo">Novo onboarding</LinkButton>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {statTiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-600"
          >
            <p className={`text-2xl font-semibold tabular-nums ${t.danger ? "text-red-700" : "text-slate-900"}`}>
              {t.value}
            </p>
            <p className="mt-1 text-xs text-slate-600">{t.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {queueTitle && (
          <Card>
            <CardHeader title={queueTitle} />
            <CardBody className="p-0">
              {myQueue.length === 0 ? (
                <div className="p-5">
                  <EmptyState title="Nada pendente." />
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {myQueue.map((c) => (
                    <li key={c.id}>
                      <Link href={`/clientes/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{c.fullName}</p>
                          <p className="text-xs text-slate-500">
                            {c.reference} · {STATUS_LABEL[c.status]}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <RiskBadge level={c.riskLevel} />
                          <StatusBadge status={c.status} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        )}

        {can(user.role, "alert:view") && (
          <Card>
            <CardHeader
              title={user.role === "ANALISTA" ? "Alertas à espera do seu parecer" : "Alertas por decidir"}
              actions={<LinkButton href="/alertas" variant="secondary">Ver todos</LinkButton>}
            />
            <CardBody className="p-0">
              {(user.role === "AUDITOR" ? openAlerts : alertsForMe).length === 0 ? (
                <div className="p-5">
                  <EmptyState title="Sem alertas pendentes." />
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {(user.role === "AUDITOR" ? openAlerts : alertsForMe).slice(0, 8).map((a) => (
                    <li key={a.id}>
                      <Link href={`/alertas/${a.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{a.subjectName}</p>
                          <p className="truncate text-xs text-slate-500">
                            {a.clientReference} · corresponde a “{a.matchedOn}”
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <CategoryBadge category={a.category} />
                          <ScoreMeter score={a.matchScore} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        )}

        {can(user.role, "audit:view") && (
          <Card className="xl:col-span-2">
            <CardHeader
              title="Atividade recente"
              actions={<LinkButton href="/auditoria" variant="secondary">Trilha completa</LinkButton>}
            />
            <CardBody className="p-0">
              <ul className="divide-y divide-slate-100">
                {stats.recent.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-2.5 text-sm">
                    <span>
                      <span className="font-medium text-slate-900">{e.actorName}</span>{" "}
                      <span className="text-slate-500">({e.actorRole})</span> ·{" "}
                      {ACTION_LABEL[e.action as AuditAction] ?? e.action} — <span className="text-slate-700">{e.summary}</span>
                    </span>
                    <time className="text-xs text-slate-500" dateTime={e.createdAt.toISOString()}>
                      {formatDateTime(e.createdAt)}
                    </time>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
