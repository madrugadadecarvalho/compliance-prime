import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/*                                   Enums                                    */
/* -------------------------------------------------------------------------- */

/** Perfis com responsabilidades separadas (segregação de funções). */
export const userRole = pgEnum("user_role", [
  "ANALISTA",
  "SUPERVISOR",
  "GESTOR",
  "AUDITOR",
]);

/** Estados reais do processo de onboarding (KYC). */
export const onboardingStatus = pgEnum("onboarding_status", [
  "RASCUNHO",
  "PENDENTE_DOCUMENTOS",
  "EM_ANALISE",
  "APROVADO",
  "REJEITADO",
]);

export const clientType = pgEnum("client_type", ["PESSOA_SINGULAR", "PESSOA_COLETIVA"]);

export const riskLevel = pgEnum("risk_level", ["BAIXO", "MEDIO", "ALTO"]);

export const partyRole = pgEnum("party_role", [
  "SOCIO",
  "ADMINISTRADOR",
  "BENEFICIARIO_EFETIVO",
  "REPRESENTANTE_LEGAL",
]);

export const documentType = pgEnum("document_type", [
  "BILHETE_IDENTIDADE",
  "PASSAPORTE",
  "NIF",
  "COMPROVATIVO_MORADA",
  "CERTIDAO_COMERCIAL",
  "ESTATUTOS",
  "COMPROVATIVO_RENDIMENTOS",
  "OUTRO",
]);

export const documentStatus = pgEnum("document_status", ["PENDENTE", "VALIDADO", "REJEITADO"]);

export const watchlistSource = pgEnum("watchlist_source", [
  "ONU",
  "OFAC",
  "UNIAO_EUROPEIA",
  "PEP_NACIONAL",
  "LISTA_INTERNA",
]);

export const watchlistCategory = pgEnum("watchlist_category", ["SANCAO", "PEP", "MEDIA_ADVERSA"]);

export const alertStatus = pgEnum("alert_status", [
  "ABERTO",
  "FALSO_POSITIVO",
  "CONFIRMADO",
]);

export const subjectType = pgEnum("subject_type", ["CLIENTE", "PARTE_RELACIONADA", "VINCULO"]);

/* -------------------------------------------------------------------------- */
/*                          Better Auth (autenticação)                         */
/* -------------------------------------------------------------------------- */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: userRole("role").notNull().default("ANALISTA"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

/* -------------------------------------------------------------------------- */
/*                               Domínio KYC/AML                               */
/* -------------------------------------------------------------------------- */

export const client = pgTable(
  "client",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull().unique(),
    type: clientType("type").notNull(),
    fullName: text("full_name").notNull(),
    documentNumber: text("document_number").notNull(),
    taxId: text("tax_id"),
    country: text("country").notNull(),
    nationality: text("nationality"),
    birthOrIncorporationDate: date("birth_or_incorporation_date"),
    address: text("address").notNull(),
    email: text("email"),
    phone: text("phone"),
    activity: text("activity").notNull(),
    sourceOfFunds: text("source_of_funds").notNull(),
    expectedMonthlyVolume: numeric("expected_monthly_volume", { precision: 18, scale: 2 }),
    isPep: boolean("is_pep").notNull().default(false),
    status: onboardingStatus("status").notNull().default("RASCUNHO"),
    riskLevel: riskLevel("risk_level"),
    riskScore: integer("risk_score"),
    riskFactors: jsonb("risk_factors").$type<{ factor: string; points: number }[]>(),
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    decidedById: text("decided_by_id").references(() => user.id),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decisionReason: text("decision_reason"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("client_status_idx").on(t.status),
    index("client_created_by_idx").on(t.createdById),
    uniqueIndex("client_document_unique").on(t.type, t.documentNumber),
  ],
);

/** Sócios, administradores e beneficiários efetivos (KYE/KYP). */
export const relatedParty = pgTable(
  "related_party",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    role: partyRole("role").notNull(),
    ownershipPercentage: numeric("ownership_percentage", { precision: 5, scale: 2 }),
    nationality: text("nationality").notNull(),
    documentNumber: text("document_number"),
    isPep: boolean("is_pep").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("related_party_client_idx").on(t.clientId)],
);

/** Vínculos relevantes: grupos económicos, contrapartes, relações com PEP. */
export const clientLink = pgTable(
  "client_link",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id, { onDelete: "cascade" }),
    entityName: text("entity_name").notNull(),
    relationType: text("relation_type").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("client_link_client_idx").on(t.clientId)],
);

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const document = pgTable(
  "document",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id, { onDelete: "cascade" }),
    type: documentType("type").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    content: bytea("content").notNull(),
    status: documentStatus("status").notNull().default("PENDENTE"),
    reviewNote: text("review_note"),
    uploadedById: text("uploaded_by_id")
      .notNull()
      .references(() => user.id),
    reviewedById: text("reviewed_by_id").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("document_client_idx").on(t.clientId)],
);

export const watchlistEntry = pgTable("watchlist_entry", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  aliases: text("aliases")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  source: watchlistSource("source").notNull(),
  category: watchlistCategory("category").notNull(),
  country: text("country"),
  reference: text("reference").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const screeningAlert = pgTable(
  "screening_alert",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id, { onDelete: "cascade" }),
    subjectType: subjectType("subject_type").notNull(),
    subjectName: text("subject_name").notNull(),
    relatedPartyId: uuid("related_party_id").references(() => relatedParty.id, {
      onDelete: "set null",
    }),
    watchlistEntryId: uuid("watchlist_entry_id")
      .notNull()
      .references(() => watchlistEntry.id),
    matchScore: integer("match_score").notNull(),
    matchedOn: text("matched_on").notNull(),
    status: alertStatus("status").notNull().default("ABERTO"),
    analystOpinion: text("analyst_opinion"),
    analystOpinionById: text("analyst_opinion_by_id").references(() => user.id),
    decidedById: text("decided_by_id").references(() => user.id),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    justification: text("justification"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("alert_client_idx").on(t.clientId),
    index("alert_status_idx").on(t.status),
  ],
);

/**
 * Trilha de auditoria append-only.
 * Um trigger na base de dados (ver drizzle/0001_audit_append_only.sql) impede UPDATE e DELETE.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    actorName: text("actor_name").notNull(),
    actorRole: text("actor_role").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    clientId: uuid("client_id"),
    summary: text("summary").notNull(),
    justification: text("justification"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_client_idx").on(t.clientId),
    index("audit_actor_idx").on(t.actorId),
    index("audit_created_idx").on(t.createdAt),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                  Relations                                 */
/* -------------------------------------------------------------------------- */

export const clientRelations = relations(client, ({ one, many }) => ({
  createdBy: one(user, { fields: [client.createdById], references: [user.id] }),
  relatedParties: many(relatedParty),
  links: many(clientLink),
  documents: many(document),
  alerts: many(screeningAlert),
}));

export const relatedPartyRelations = relations(relatedParty, ({ one }) => ({
  client: one(client, { fields: [relatedParty.clientId], references: [client.id] }),
}));

export const clientLinkRelations = relations(clientLink, ({ one }) => ({
  client: one(client, { fields: [clientLink.clientId], references: [client.id] }),
}));

export const documentRelations = relations(document, ({ one }) => ({
  client: one(client, { fields: [document.clientId], references: [client.id] }),
}));

export const screeningAlertRelations = relations(screeningAlert, ({ one }) => ({
  client: one(client, { fields: [screeningAlert.clientId], references: [client.id] }),
  watchlistEntry: one(watchlistEntry, {
    fields: [screeningAlert.watchlistEntryId],
    references: [watchlistEntry.id],
  }),
}));

export type UserRole = (typeof userRole.enumValues)[number];
export type OnboardingStatus = (typeof onboardingStatus.enumValues)[number];
export type RiskLevel = (typeof riskLevel.enumValues)[number];
export type DocumentType = (typeof documentType.enumValues)[number];
export type AlertStatus = (typeof alertStatus.enumValues)[number];
export type PartyRole = (typeof partyRole.enumValues)[number];
export type ClientType = (typeof clientType.enumValues)[number];
