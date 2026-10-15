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
import { ArrowUpRight, BellRing, Check, FileWarning, Gauge, ShieldAlert, UserRoundSearch } from "lucide-react";
import { Card, CardBody, CardHeader, EmptyState, LinkButton, cn, formatDateTime } from "@/components/ui";

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

  const sanctions = stats.alerts.SANCAO ?? 0;
  const highRisk = stats.risk.ALTO ?? 0;
  const statTiles = [
    { label: "Em análise", value: stats.status.EM_ANALISE ?? 0, href: "/clientes?estado=EM_ANALISE", icon: UserRoundSearch },
    { label: "Pendentes de documentos", value: stats.status.PENDENTE_DOCUMENTOS ?? 0, href: "/clientes?estado=PENDENTE_DOCUMENTOS", icon: FileWarning },
    { label: "Sanções por decidir", value: sanctions, href: "/alertas", icon: ShieldAlert, urgent: sanctions > 0 },
    { label: "Alertas PEP por decidir", value: stats.alerts.PEP ?? 0, href: "/alertas", icon: BellRing },
    { label: "Em curso com risco alto", value: highRisk, href: "/clientes?estado=EM_ANALISE", icon: Gauge, warn: highRisk > 0 },
    { label: "Aprovados", value: stats.status.APROVADO ?? 0, href: "/clientes?estado=APROVADO", icon: Check },
  ];

  // Saudação e resumo no fuso de Luanda, escritos em linguagem corrente.
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("pt-AO", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Luanda" }).format(now));
  const greeting = hour < 12 ? "Bom dia" : hour < 19 ? "Boa tarde" : "Boa noite";
  const today = new Intl.DateTimeFormat("pt-AO", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Luanda" }).format(now);
  const pendingForMe = myQueue.length + (user.role === "AUDITOR" ? 0 : alertsForMe.length);
  const summary =
    user.role === "AUDITOR"
      ? `Há ${openAlerts.length} ${openAlerts.length === 1 ? "alerta em aberto" : "alertas em aberto"} na instituição. A trilha completa está a um clique.`
      : pendingForMe === 0
        ? "Não há nada à sua espera. Bom momento para rever processos antigos."
        : `${pendingForMe} ${pendingForMe === 1 ? "item espera" : "itens esperam"} por si${sanctions > 0 ? `, incluindo ${sanctions} ${sanctions === 1 ? "possível sanção" : "possíveis sanções"}` : ""}. Os de maior risco aparecem primeiro.`;

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 pt-2">
        <div>
          <p className="text-sm text-on-surface-variant first-letter:uppercase">{today}</p>
          <h1 className="mt-1 text-[2rem] leading-tight font-normal tracking-tight text-on-surface sm:text-[2.25rem]">
            {greeting}, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-2 max-w-2xl text-[0.95rem] text-on-surface-variant">{summary}</p>
        </div>
        {can(user.role, "client:create") && <LinkButton href="/clientes/novo">Novo onboarding</LinkButton>}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {statTiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={cn(
              "group relative flex flex-col justify-between gap-6 rounded-2xl p-4 transition hover:shadow-elevation-2 focus-visible:outline-2 focus-visible:outline-primary",
              t.urgent
                ? "bg-red-100 text-red-950"
                : t.warn
                  ? "bg-amber-100 text-amber-950"
                  : "border border-outline-variant bg-surface text-on-surface shadow-elevation-1",
            )}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full",
                  t.urgent ? "bg-red-200" : t.warn ? "bg-amber-200" : "bg-surface-container text-on-surface-variant",
                )}
              >
                <t.icon className="size-4" aria-hidden />
              </span>
              <ArrowUpRight className="size-4 opacity-0 transition group-hover:opacity-60" aria-hidden />
            </div>
            <div>
              <p className="text-3xl font-normal tabular-nums">{t.value}</p>
              <p className={cn("mt-1 text-xs leading-snug", t.urgent || t.warn ? "opacity-80" : "text-on-surface-variant")}>{t.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        {queueTitle && (
          <Card>
            <CardHeader title={queueTitle} />
            <CardBody className="p-0">
              {myQueue.length === 0 ? (
                <div className="p-5">
                  <EmptyState title="Nada pendente." />
                </div>
              ) : (
                <ul className="divide-y divide-outline-variant">
                  {myQueue.map((c) => (
                    <li key={c.id}>
                      <Link href={`/clientes/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-container/60">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-on-surface">{c.fullName}</p>
                          <p className="text-xs text-on-surface-variant">
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
                <ul className="divide-y divide-outline-variant">
                  {(user.role === "AUDITOR" ? openAlerts : alertsForMe).slice(0, 8).map((a) => (
                    <li key={a.id}>
                      <Link href={`/alertas/${a.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-container/60">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-on-surface">{a.subjectName}</p>
                          <p className="truncate text-xs text-on-surface-variant">
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
              <ul className="divide-y divide-outline-variant">
                {stats.recent.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-2.5 text-sm">
                    <span>
                      <span className="font-medium text-on-surface">{e.actorName}</span>{" "}
                      <span className="text-on-surface-variant">({e.actorRole})</span> ·{" "}
                      {ACTION_LABEL[e.action as AuditAction] ?? e.action} — <span className="text-on-surface">{e.summary}</span>
                    </span>
                    <time className="text-xs text-on-surface-variant" dateTime={e.createdAt.toISOString()}>
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
