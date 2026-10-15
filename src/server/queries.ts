import "server-only";
import { aliasedTable, and, count, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLog,
  client,
  clientLink,
  document,
  relatedParty,
  screeningAlert,
  user,
  watchlistEntry,
  type OnboardingStatus,
} from "@/db/schema";
import { missingDocuments, type DecisionContext } from "@/lib/workflow";

const creator = aliasedTable(user, "creator");
const decider = aliasedTable(user, "decider");

export async function listClients(filters: { status?: OnboardingStatus; q?: string }) {
  const where: SQL[] = [];
  if (filters.status) where.push(eq(client.status, filters.status));
  if (filters.q) {
    const term = `%${filters.q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    where.push(or(ilike(client.fullName, term), ilike(client.reference, term), ilike(client.documentNumber, term))!);
  }

  const openAlerts = db
    .select({ clientId: screeningAlert.clientId, n: count().as("n") })
    .from(screeningAlert)
    .where(eq(screeningAlert.status, "ABERTO"))
    .groupBy(screeningAlert.clientId)
    .as("open_alerts");

  return db
    .select({
      id: client.id,
      reference: client.reference,
      fullName: client.fullName,
      type: client.type,
      country: client.country,
      status: client.status,
      riskLevel: client.riskLevel,
      updatedAt: client.updatedAt,
      createdByName: creator.name,
      openAlerts: sql<number>`coalesce(${openAlerts.n}, 0)`.mapWith(Number),
    })
    .from(client)
    .innerJoin(creator, eq(creator.id, client.createdById))
    .leftJoin(openAlerts, eq(openAlerts.clientId, client.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(client.updatedAt))
    .limit(200);
}

export async function getClientDetail(id: string) {
  const [found] = await db.select().from(client).where(eq(client.id, id));
  if (!found) return null;
  const people = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(inArray(user.id, [found.createdById, found.decidedById].filter((v): v is string => !!v)));
  const nameOf = (uid: string | null) => people.find((p) => p.id === uid)?.name ?? null;
  const row = {
    client: found,
    createdByName: nameOf(found.createdById) ?? "—",
    decidedByName: nameOf(found.decidedById),
  };

  const [parties, links, docs, alerts, history] = await Promise.all([
    db.select().from(relatedParty).where(eq(relatedParty.clientId, id)).orderBy(relatedParty.createdAt),
    db.select().from(clientLink).where(eq(clientLink.clientId, id)).orderBy(clientLink.createdAt),
    db
      .select({
        id: document.id,
        type: document.type,
        fileName: document.fileName,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        sha256: document.sha256,
        status: document.status,
        reviewNote: document.reviewNote,
        createdAt: document.createdAt,
        uploadedById: document.uploadedById,
        uploadedByName: user.name,
      })
      .from(document)
      .innerJoin(user, eq(user.id, document.uploadedById))
      .where(eq(document.clientId, id))
      .orderBy(desc(document.createdAt)),
    listAlerts({ clientId: id }),
    db
      .select()
      .from(auditLog)
      .where(eq(auditLog.clientId, id))
      .orderBy(desc(auditLog.createdAt))
      .limit(100),
  ]);

  const missing = missingDocuments(row.client.type, docs);
  const decisionContext: DecisionContext = {
    status: row.client.status,
    riskLevel: row.client.riskLevel,
    createdById: row.client.createdById,
    openAlerts: alerts.filter((a) => a.status === "ABERTO").length,
    confirmedSanctions: alerts.filter((a) => a.status === "CONFIRMADO" && a.category === "SANCAO").length,
    missingDocuments: missing.length,
    pendingDocuments: docs.filter((d) => d.status === "PENDENTE").length,
  };

  return {
    ...row,
    parties,
    links,
    documents: docs,
    alerts,
    history,
    missing,
    decisionContext,
  };
}

export type ClientDetail = NonNullable<Awaited<ReturnType<typeof getClientDetail>>>;

export async function listAlerts(filters: { clientId?: string; status?: "ABERTO" | "FALSO_POSITIVO" | "CONFIRMADO" }) {
  const where: SQL[] = [];
  if (filters.clientId) where.push(eq(screeningAlert.clientId, filters.clientId));
  if (filters.status) where.push(eq(screeningAlert.status, filters.status));

  return db
    .select({
      id: screeningAlert.id,
      clientId: screeningAlert.clientId,
      clientName: client.fullName,
      clientReference: client.reference,
      clientCreatedById: client.createdById,
      subjectType: screeningAlert.subjectType,
      subjectName: screeningAlert.subjectName,
      matchScore: screeningAlert.matchScore,
      matchedOn: screeningAlert.matchedOn,
      status: screeningAlert.status,
      analystOpinion: screeningAlert.analystOpinion,
      justification: screeningAlert.justification,
      decidedAt: screeningAlert.decidedAt,
      decidedByName: decider.name,
      createdAt: screeningAlert.createdAt,
      listName: watchlistEntry.fullName,
      source: watchlistEntry.source,
      category: watchlistEntry.category,
      listCountry: watchlistEntry.country,
      listReference: watchlistEntry.reference,
      listNotes: watchlistEntry.notes,
      listAliases: watchlistEntry.aliases,
    })
    .from(screeningAlert)
    .innerJoin(client, eq(client.id, screeningAlert.clientId))
    .innerJoin(watchlistEntry, eq(watchlistEntry.id, screeningAlert.watchlistEntryId))
    .leftJoin(decider, eq(decider.id, screeningAlert.decidedById))
    .where(where.length ? and(...where) : undefined)
    .orderBy(
      sql`case when ${screeningAlert.status} = 'ABERTO' then 0 else 1 end`,
      sql`case when ${watchlistEntry.category} = 'SANCAO' then 0 when ${watchlistEntry.category} = 'PEP' then 1 else 2 end`,
      desc(screeningAlert.matchScore),
    )
    .limit(300);
}

export type AlertRow = Awaited<ReturnType<typeof listAlerts>>[number];

export async function dashboardStats() {
  const [byStatus, byRisk, alertsOpen, recent] = await Promise.all([
    db.select({ status: client.status, n: count() }).from(client).groupBy(client.status),
    db
      .select({ risk: client.riskLevel, n: count() })
      .from(client)
      .where(inArray(client.status, ["EM_ANALISE", "PENDENTE_DOCUMENTOS"]))
      .groupBy(client.riskLevel),
    db
      .select({ category: watchlistEntry.category, n: count() })
      .from(screeningAlert)
      .innerJoin(watchlistEntry, eq(watchlistEntry.id, screeningAlert.watchlistEntryId))
      .where(eq(screeningAlert.status, "ABERTO"))
      .groupBy(watchlistEntry.category),
    db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(8),
  ]);
  const status = Object.fromEntries(byStatus.map((r) => [r.status, r.n])) as Partial<Record<OnboardingStatus, number>>;
  const risk = Object.fromEntries(byRisk.map((r) => [r.risk ?? "SEM", r.n])) as Record<string, number>;
  const alerts = Object.fromEntries(alertsOpen.map((r) => [r.category, r.n])) as Record<string, number>;
  return { status, risk, alerts, recent };
}

export async function listAudit(filters: {
  action?: string;
  actor?: string;
  q?: string;
  from?: string;
  to?: string;
  limit?: number;
}) {
  const where: SQL[] = [];
  if (filters.action) where.push(eq(auditLog.action, filters.action));
  if (filters.actor) where.push(ilike(auditLog.actorName, `%${escapeLike(filters.actor)}%`));
  if (filters.q) {
    const term = `%${escapeLike(filters.q)}%`;
    where.push(or(ilike(auditLog.summary, term), ilike(auditLog.justification, term))!);
  }
  if (filters.from) where.push(gte(auditLog.createdAt, new Date(`${filters.from}T00:00:00`)));
  if (filters.to) where.push(lte(auditLog.createdAt, new Date(`${filters.to}T23:59:59.999`)));

  return db
    .select({
      id: auditLog.id,
      createdAt: auditLog.createdAt,
      actorName: auditLog.actorName,
      actorRole: auditLog.actorRole,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      clientId: auditLog.clientId,
      clientReference: client.reference,
      summary: auditLog.summary,
      justification: auditLog.justification,
      metadata: auditLog.metadata,
      ipAddress: auditLog.ipAddress,
    })
    .from(auditLog)
    .leftJoin(client, eq(client.id, auditLog.clientId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(filters.limit ?? 300);
}

export async function listUsers() {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(user.name);
}

function escapeLike(v: string) {
  return v.replace(/[%_\\]/g, (m) => `\\${m}`);
}
