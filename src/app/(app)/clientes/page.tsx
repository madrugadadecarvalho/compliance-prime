import type { Metadata } from "next";
import Link from "next/link";
import { onboardingStatus, type OnboardingStatus } from "@/db/schema";
import { requirePermission } from "@/server/session";
import { listClients } from "@/server/queries";
import { can } from "@/lib/permissions";
import { STATUS_LABEL } from "@/lib/workflow";
import { countryName } from "@/lib/countries";
import { RiskBadge, StatusBadge } from "@/components/badges";
import { Badge, Card, EmptyState, LinkButton, PageHeader, Table, Td, Th, cn, formatDateTime, inputClass } from "@/components/ui";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientsPage({ searchParams }: PageProps<"/clientes">) {
  const user = await requirePermission("client:view");
  const sp = await searchParams;
  const estado = typeof sp.estado === "string" && (onboardingStatus.enumValues as string[]).includes(sp.estado)
    ? (sp.estado as OnboardingStatus)
    : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : undefined;
  const rows = await listClients({ status: estado, q });

  const tabs: (OnboardingStatus | undefined)[] = [undefined, ...onboardingStatus.enumValues];

  return (
    <>
      <PageHeader
        eyebrow="KYC"
        title="Processos de onboarding"
        description="Cada cliente passa por estados explícitos. Abra um processo para ver a due diligence completa."
        actions={can(user.role, "client:create") && <LinkButton href="/clientes/novo">Novo onboarding</LinkButton>}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-1">
          {tabs.map((s) => {
            const active = s === estado;
            const href = s ? `/clientes?estado=${s}` : "/clientes";
            return (
              <Link
                key={s ?? "todos"}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-3.5 text-sm transition",
                  active
                    ? "bg-secondary-container font-medium text-on-secondary-container"
                    : "text-on-surface-variant ring-1 ring-inset ring-outline-variant hover:bg-surface-container",
                )}
              >
                {s ? STATUS_LABEL[s] : "Todos"}
              </Link>
            );
          })}
        </nav>
        <form role="search" className="flex gap-2">
          {estado && <input type="hidden" name="estado" value={estado} />}
          <label htmlFor="q" className="sr-only">Pesquisar</label>
          <input id="q" name="q" defaultValue={q} placeholder="Nome, referência ou documento" maxLength={80} className={cn(inputClass, "w-64")} />
        </form>
      </div>

      <Card>
        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Nenhum processo encontrado." />
          </div>
        ) : (
          <Table>
            <thead className="bg-surface-container/60">
              <tr>
                <Th>Referência</Th>
                <Th>Cliente</Th>
                <Th>País</Th>
                <Th>Estado</Th>
                <Th>Risco</Th>
                <Th>Alertas</Th>
                <Th>Criado por</Th>
                <Th>Atualizado</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-surface-container/60">
                  <Td className="font-mono text-xs">
                    <Link href={`/clientes/${r.id}`} className="font-medium text-primary hover:underline">
                      {r.reference}
                    </Link>
                  </Td>
                  <Td>
                    <Link href={`/clientes/${r.id}`} className="font-medium hover:underline">{r.fullName}</Link>
                    <div className="text-xs text-slate-500">{r.type === "PESSOA_SINGULAR" ? "Pessoa singular" : "Pessoa coletiva"}</div>
                  </Td>
                  <Td>{countryName(r.country)}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                  <Td><RiskBadge level={r.riskLevel} /></Td>
                  <Td>{r.openAlerts > 0 ? <Badge tone="amber">{r.openAlerts} por decidir</Badge> : <span className="text-slate-400">—</span>}</Td>
                  <Td className="text-slate-600">{r.createdByName}</Td>
                  <Td className="whitespace-nowrap text-slate-600">{formatDateTime(r.updatedAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
