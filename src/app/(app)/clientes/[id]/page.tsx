import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Lock } from "lucide-react";
import { z } from "zod";
import { requirePermission } from "@/server/session";
import { getClientDetail } from "@/server/queries";
import { can } from "@/lib/permissions";
import { countryName } from "@/lib/countries";
import { RISK_LABEL } from "@/lib/risk";
import {
  STATUS_DESCRIPTION,
  STATUS_LABEL,
  STATUS_ORDER,
  canApprove,
  canReject,
  canReturn,
  canSubmit,
  isClosed,
  isEditable,
} from "@/lib/workflow";
import { ACTION_LABEL, type AuditAction } from "@/server/audit";
import { removeLinkAction, removeRelatedPartyAction } from "@/server/actions/clients";
import { AlertStatusBadge, CategoryBadge, RiskBadge, SOURCE_LABEL, SUBJECT_LABEL, ScoreMeter, StatusBadge } from "@/components/badges";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  DescriptionList,
  EmptyState,
  LinkButton,
  Notice,
  Table,
  Td,
  Th,
  cn,
  formatBytes,
  formatDate,
  formatDateTime,
  formatMoney,
} from "@/components/ui";
import { InlineActionForm } from "@/components/forms";
import {
  AddLinkForm,
  AddPartyForm,
  DecisionButtons,
  ReviewDocumentButtons,
  SubmitProcessForm,
  UploadDocumentForm,
} from "./client-actions";
import { DOCUMENT_LABEL, PARTY_ROLE_LABEL } from "./labels";

export const metadata: Metadata = { title: "Due diligence" };

const SECTIONS = [
  ["estado", "Estado e decisão"],
  ["risco", "Classificação de risco"],
  ["entidade", "Dados da entidade"],
  ["socios", "Sócios e beneficiários"],
  ["vinculos", "Vínculos"],
  ["documentos", "Documentos"],
  ["alertas", "Alertas AML"],
  ["historico", "Histórico (audit trail)"],
] as const;

function LockedNotice({ status }: { status: keyof typeof STATUS_LABEL }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-slate-500">
      <Lock className="size-3.5" aria-hidden /> Secção bloqueada: o processo está “{STATUS_LABEL[status]}”.
    </p>
  );
}

export default async function ClientDetailPage({ params }: PageProps<"/clientes/[id]">) {
  const user = await requirePermission("client:view");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const d = await getClientDetail(id);
  if (!d) notFound();

  const c = d.client;
  const actor = { id: user.id, role: user.role };
  const editable = isEditable(c.status) && can(user.role, "client:edit");
  const submit = canSubmit(actor, d.decisionContext);
  const approve = canApprove(actor, d.decisionContext);
  const reject = canReject(actor, d.decisionContext);
  const returnable = canReturn(actor, d.decisionContext);
  const isDecider = can(user.role, "client:approve");
  const currentStep = c.status === "REJEITADO" ? 3 : STATUS_ORDER.indexOf(c.status);

  const counts: Partial<Record<(typeof SECTIONS)[number][0], number>> = {
    socios: d.parties.length,
    vinculos: d.links.length,
    documentos: d.documents.length,
    alertas: d.alerts.filter((a) => a.status === "ABERTO").length,
  };

  return (
    <>
      {/* Cabeçalho do processo */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-slate-500">
            <Link href="/clientes" className="hover:underline">Clientes</Link> / {c.reference}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-on-surface">{c.fullName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={c.status} />
            <RiskBadge level={c.riskLevel} score={c.riskScore} />
            <Badge>{c.type === "PESSOA_SINGULAR" ? "Pessoa singular" : "Pessoa coletiva"}</Badge>
            {c.isPep && <Badge tone="violet">PEP declarado</Badge>}
          </div>
        </div>
        {editable && (
          <LinkButton href={`/clientes/${c.id}/editar`} variant="secondary">
            Editar dados
          </LinkButton>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[13rem_1fr]">
        {/* Navegação por âncoras: o analista vê o contexto completo sem saltar entre abas */}
        <nav aria-label="Secções do processo" className="hidden lg:block">
          <ul className="sticky top-20 space-y-0.5 border-l border-outline-variant">
            {SECTIONS.map(([anchor, label]) => (
              <li key={anchor}>
                <a
                  href={`#${anchor}`}
                  className="-ml-px flex items-center justify-between border-l-2 border-transparent py-1.5 pl-3 pr-1 text-sm text-slate-600 hover:border-primary hover:text-on-surface"
                >
                  {label}
                  {counts[anchor] ? (
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-xs tabular-nums",
                        anchor === "alertas" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {counts[anchor]}
                    </span>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-6">
          {/* 1. Estado e decisão */}
          <Card aria-labelledby="estado">
            <CardHeader id="estado" title="Estado e decisão" description={STATUS_DESCRIPTION[c.status]} />
            <CardBody className="space-y-5">
              <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Etapas do onboarding">
                {STATUS_ORDER.map((s, i) => {
                  const label = i === 3 && c.status === "REJEITADO" ? STATUS_LABEL.REJEITADO : STATUS_LABEL[s];
                  const done = i < currentStep || (i === 3 && isClosed(c.status));
                  const current = i === currentStep && !isClosed(c.status);
                  return (
                    <li
                      key={s}
                      aria-current={current ? "step" : undefined}
                      className={cn(
                        "flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-sm",
                        current && "border-transparent bg-primary-container font-medium text-on-primary-container",
                        done && c.status === "REJEITADO" && i === 3 && "border-transparent bg-red-100 text-red-900",
                        done && !(c.status === "REJEITADO" && i === 3) && "border-transparent bg-emerald-100 text-emerald-900",
                        !current && !done && "border-outline-variant text-on-surface-variant",
                      )}
                    >
                      {done ? <Check className="size-4" aria-hidden /> : <span className="text-xs tabular-nums">{i + 1}</span>}
                      {label}
                    </li>
                  );
                })}
              </ol>

              {isClosed(c.status) ? (
                <Notice tone={c.status === "APROVADO" ? "green" : "red"} title={`${STATUS_LABEL[c.status]} por ${d.decidedByName ?? "—"} em ${formatDateTime(c.decidedAt)}`}>
                  <p className="whitespace-pre-wrap">{c.decisionReason}</p>
                </Notice>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-on-surface">O que pode fazer agora</h3>

                  {submit.allowed && (
                    <div className="space-y-2">
                      {d.missing.length > 0 && (
                        <Notice tone="amber" title="Documentos obrigatórios em falta">
                          {d.missing.map((m) => DOCUMENT_LABEL[m]).join(", ")}
                        </Notice>
                      )}
                      <SubmitProcessForm clientId={c.id} version={c.version} missingCount={d.missing.length} />
                    </div>
                  )}

                  {isDecider && c.status === "EM_ANALISE" && (
                    <>
                      <DecisionButtons
                        clientId={c.id}
                        version={c.version}
                        approve={approve}
                        reject={reject}
                        returnable={returnable}
                        riskLabel={c.riskLevel ? RISK_LABEL[c.riskLevel] : "risco por avaliar"}
                      />
                      {/* Bloqueios explicados: a UI diz porquê, em vez de esconder silenciosamente */}
                      {(!approve.allowed || !reject.allowed) && (
                        <ul className="space-y-1 text-sm text-slate-600">
                          {!approve.allowed && <li>• Aprovar indisponível: {approve.reason}</li>}
                          {!reject.allowed && reject.reason !== approve.reason && <li>• Rejeitar indisponível: {reject.reason}</li>}
                        </ul>
                      )}
                    </>
                  )}

                  {!submit.allowed && !(isDecider && c.status === "EM_ANALISE") && (
                    <p className="text-sm text-slate-600">
                      {c.status === "EM_ANALISE"
                        ? "O processo aguarda decisão de um supervisor. O seu perfil não intervém nesta etapa."
                        : submit.reason}
                    </p>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {/* 2. Risco */}
          <Card aria-labelledby="risco">
            <CardHeader
              id="risco"
              title="Classificação de risco"
              description="Cálculo explicável: cada ponto tem um motivo. Recalculado a cada alteração e antes de qualquer decisão."
              actions={<RiskBadge level={c.riskLevel} score={c.riskScore} />}
            />
            <CardBody>
              {c.riskFactors?.length ? (
                <ul className="divide-y divide-outline-variant text-sm">
                  {c.riskFactors.map((f) => (
                    <li key={f.factor} className="flex justify-between py-2">
                      <span>{f.factor}</span>
                      <span className="font-medium tabular-nums">+{f.points}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-600">Nenhum fator de risco identificado.</p>
              )}
              {c.riskLevel === "ALTO" && !isClosed(c.status) && (
                <div className="mt-3">
                  <Notice tone="amber">Risco alto: a aprovação exige um Gestor de Compliance.</Notice>
                </div>
              )}
            </CardBody>
          </Card>

          {/* 3. Entidade */}
          <Card aria-labelledby="entidade">
            <CardHeader id="entidade" title="Dados da entidade" description={`Criado por ${d.createdByName} em ${formatDateTime(c.createdAt)}`} />
            <CardBody>
              <DescriptionList
                items={[
                  { label: "Documento", value: c.documentNumber },
                  { label: "NIF", value: c.taxId },
                  { label: c.type === "PESSOA_SINGULAR" ? "Data de nascimento" : "Data de constituição", value: formatDate(c.birthOrIncorporationDate) },
                  { label: "País de residência / sede", value: countryName(c.country) },
                  { label: "Nacionalidade", value: countryName(c.nationality) },
                  { label: "Atividade / profissão", value: c.activity },
                  { label: "E-mail", value: c.email },
                  { label: "Telefone", value: c.phone },
                  { label: "Volume mensal esperado", value: formatMoney(c.expectedMonthlyVolume) },
                  { label: "Morada", value: c.address, wide: true },
                  { label: "Origem dos fundos", value: c.sourceOfFunds, wide: true },
                ]}
              />
            </CardBody>
          </Card>

          {/* 4. Sócios */}
          <Card aria-labelledby="socios">
            <CardHeader id="socios" title="Sócios e beneficiários efetivos" description="Todas as pessoas listadas são incluídas no screening AML." />
            <CardBody className="space-y-4">
              {d.parties.length === 0 ? (
                <EmptyState title="Sem partes relacionadas.">
                  {c.type === "PESSOA_COLETIVA" && "Pessoas coletivas devem identificar os beneficiários efetivos."}
                </EmptyState>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Nome</Th>
                      <Th>Função</Th>
                      <Th>Participação</Th>
                      <Th>Nacionalidade</Th>
                      <Th>PEP</Th>
                      {editable && <Th><span className="sr-only">Ações</span></Th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {d.parties.map((p) => (
                      <tr key={p.id}>
                        <Td className="font-medium">{p.fullName}</Td>
                        <Td>{PARTY_ROLE_LABEL[p.role]}</Td>
                        <Td>{p.ownershipPercentage ? `${Number(p.ownershipPercentage)}%` : "—"}</Td>
                        <Td>{countryName(p.nationality)}</Td>
                        <Td>{p.isPep ? <Badge tone="violet">PEP</Badge> : "—"}</Td>
                        {editable && (
                          <Td className="text-right">
                            <InlineActionForm
                              action={removeRelatedPartyAction}
                              hidden={{ id: p.id, clientId: c.id }}
                              label="Remover"
                              confirmText={`Remover ${p.fullName}?`}
                            />
                          </Td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              {editable ? <AddPartyForm clientId={c.id} /> : <LockedNotice status={c.status} />}
            </CardBody>
          </Card>

          {/* 5. Vínculos */}
          <Card aria-labelledby="vinculos">
            <CardHeader id="vinculos" title="Vínculos" description="Grupos económicos, contrapartes relevantes e relações com PEP." />
            <CardBody className="space-y-4">
              {d.links.length === 0 ? (
                <EmptyState title="Sem vínculos registados." />
              ) : (
                <ul className="divide-y divide-outline-variant">
                  {d.links.map((l) => (
                    <li key={l.id} className="flex items-start justify-between gap-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-on-surface">
                          {l.entityName} <span className="font-normal text-slate-500">· {l.relationType}</span>
                        </p>
                        {l.description && <p className="text-sm text-slate-600">{l.description}</p>}
                      </div>
                      {editable && (
                        <InlineActionForm
                          action={removeLinkAction}
                          hidden={{ id: l.id, clientId: c.id }}
                          label="Remover"
                          confirmText={`Remover vínculo com ${l.entityName}?`}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {editable ? <AddLinkForm clientId={c.id} /> : <LockedNotice status={c.status} />}
            </CardBody>
          </Card>

          {/* 6. Documentos */}
          <Card aria-labelledby="documentos">
            <CardHeader
              id="documentos"
              title="Documentos"
              description="Cada documento é validado por uma pessoa diferente de quem o carregou. A integridade é garantida por hash SHA-256."
            />
            <CardBody className="space-y-4">
              {d.missing.length > 0 && !isClosed(c.status) && (
                <Notice tone="amber" title="Obrigatórios em falta">
                  {d.missing.map((m) => DOCUMENT_LABEL[m]).join(", ")}
                </Notice>
              )}
              {d.documents.length === 0 ? (
                <EmptyState title="Nenhum documento carregado." />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Documento</Th>
                      <Th>Ficheiro</Th>
                      <Th>Carregado por</Th>
                      <Th>Estado</Th>
                      <Th><span className="sr-only">Ações</span></Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {d.documents.map((doc) => (
                      <tr key={doc.id}>
                        <Td className="font-medium">{DOCUMENT_LABEL[doc.type]}</Td>
                        <Td>
                          <a href={`/api/documentos/${doc.id}`} className="text-primary hover:underline">
                            {doc.fileName}
                          </a>
                          <div className="font-mono text-[11px] text-slate-500" title={doc.sha256}>
                            {formatBytes(doc.sizeBytes)} · sha256 {doc.sha256.slice(0, 12)}…
                          </div>
                        </Td>
                        <Td className="text-slate-600">
                          {doc.uploadedByName}
                          <div className="text-xs">{formatDateTime(doc.createdAt)}</div>
                        </Td>
                        <Td>
                          <Badge tone={doc.status === "VALIDADO" ? "green" : doc.status === "REJEITADO" ? "red" : "amber"}>
                            {doc.status === "VALIDADO" ? "Validado" : doc.status === "REJEITADO" ? "Rejeitado" : "Por validar"}
                          </Badge>
                          {doc.reviewNote && <p className="mt-1 text-xs text-slate-600">{doc.reviewNote}</p>}
                        </Td>
                        <Td>
                          {doc.status === "PENDENTE" &&
                            !isClosed(c.status) &&
                            can(user.role, "document:review") &&
                            (doc.uploadedById === user.id ? (
                              <span className="text-xs text-slate-500">Aguarda validação por outra pessoa</span>
                            ) : (
                              <ReviewDocumentButtons documentId={doc.id} />
                            ))}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              {isEditable(c.status) && can(user.role, "document:upload") ? (
                <UploadDocumentForm clientId={c.id} suggested={d.missing[0]} />
              ) : (
                <LockedNotice status={c.status} />
              )}
            </CardBody>
          </Card>

          {/* 7. Alertas */}
          <Card aria-labelledby="alertas">
            <CardHeader
              id="alertas"
              title="Alertas AML"
              description="Gerados pelo screening do cliente e de todas as partes relacionadas. Um alerta é uma decisão, não uma notificação."
            />
            <CardBody>
              {c.status === "RASCUNHO" || (c.status === "PENDENTE_DOCUMENTOS" && !c.submittedAt) ? (
                <p className="text-sm text-slate-600">O screening é executado quando o processo é submetido para análise.</p>
              ) : d.alerts.length === 0 ? (
                <Notice tone="green">Screening executado sem correspondências acima do limiar.</Notice>
              ) : (
                <ul className="divide-y divide-outline-variant">
                  {d.alerts.map((a) => (
                    <li key={a.id} className="py-3">
                      <Link href={`/alertas/${a.id}`} className="group flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-on-surface group-hover:underline">
                            {a.subjectName}{" "}
                            <span className="font-normal text-slate-500">
                              ({SUBJECT_LABEL[a.subjectType].toLowerCase()})
                            </span>
                          </p>
                          <p className="text-xs text-slate-600">
                            Corresponde a “{a.matchedOn}” · {SOURCE_LABEL[a.source]}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <CategoryBadge category={a.category} />
                          <ScoreMeter score={a.matchScore} />
                          <AlertStatusBadge status={a.status} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* 8. Histórico */}
          <Card aria-labelledby="historico">
            <CardHeader
              id="historico"
              title="Histórico (audit trail)"
              description="Quem fez, quando e com que justificação. Registos imutáveis."
              actions={can(user.role, "audit:view") && (
                <LinkButton href={`/auditoria?q=${encodeURIComponent(c.reference)}`} variant="secondary">
                  Ver na trilha completa
                </LinkButton>
              )}
            />
            <CardBody>
              <ol className="relative space-y-4 border-l border-outline-variant pl-5">
                {d.history.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full bg-primary ring-4 ring-surface" aria-hidden />
                    <p className="text-sm">
                      <span className="font-medium text-on-surface">{ACTION_LABEL[h.action as AuditAction] ?? h.action}</span>
                      <span className="text-slate-500"> · {h.actorName} ({h.actorRole}) · </span>
                      <time dateTime={h.createdAt.toISOString()} className="text-slate-500">{formatDateTime(h.createdAt)}</time>
                    </p>
                    <p className="text-sm text-slate-700">{h.summary}</p>
                    {h.justification && (
                      <blockquote className="mt-1 border-l-2 border-slate-300 pl-3 text-sm italic text-slate-600">
                        {h.justification}
                      </blockquote>
                    )}
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
