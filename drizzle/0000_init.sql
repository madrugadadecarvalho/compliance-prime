CREATE TYPE "public"."alert_status" AS ENUM('ABERTO', 'FALSO_POSITIVO', 'CONFIRMADO');--> statement-breakpoint
CREATE TYPE "public"."client_type" AS ENUM('PESSOA_SINGULAR', 'PESSOA_COLETIVA');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('PENDENTE', 'VALIDADO', 'REJEITADO');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('BILHETE_IDENTIDADE', 'PASSAPORTE', 'NIF', 'COMPROVATIVO_MORADA', 'CERTIDAO_COMERCIAL', 'ESTATUTOS', 'COMPROVATIVO_RENDIMENTOS', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."onboarding_status" AS ENUM('RASCUNHO', 'PENDENTE_DOCUMENTOS', 'EM_ANALISE', 'APROVADO', 'REJEITADO');--> statement-breakpoint
CREATE TYPE "public"."party_role" AS ENUM('SOCIO', 'ADMINISTRADOR', 'BENEFICIARIO_EFETIVO', 'REPRESENTANTE_LEGAL');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('BAIXO', 'MEDIO', 'ALTO');--> statement-breakpoint
CREATE TYPE "public"."subject_type" AS ENUM('CLIENTE', 'PARTE_RELACIONADA', 'VINCULO');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ANALISTA', 'SUPERVISOR', 'GESTOR', 'AUDITOR');--> statement-breakpoint
CREATE TYPE "public"."watchlist_category" AS ENUM('SANCAO', 'PEP', 'MEDIA_ADVERSA');--> statement-breakpoint
CREATE TYPE "public"."watchlist_source" AS ENUM('ONU', 'OFAC', 'UNIAO_EUROPEIA', 'PEP_NACIONAL', 'LISTA_INTERNA');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"actor_id" text,
	"actor_name" text NOT NULL,
	"actor_role" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"client_id" uuid,
	"summary" text NOT NULL,
	"justification" text,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"type" "client_type" NOT NULL,
	"full_name" text NOT NULL,
	"document_number" text NOT NULL,
	"tax_id" text,
	"country" text NOT NULL,
	"nationality" text,
	"birth_or_incorporation_date" date,
	"address" text NOT NULL,
	"email" text,
	"phone" text,
	"activity" text NOT NULL,
	"source_of_funds" text NOT NULL,
	"expected_monthly_volume" numeric(18, 2),
	"is_pep" boolean DEFAULT false NOT NULL,
	"status" "onboarding_status" DEFAULT 'RASCUNHO' NOT NULL,
	"risk_level" "risk_level",
	"risk_score" integer,
	"risk_factors" jsonb,
	"created_by_id" text NOT NULL,
	"submitted_at" timestamp with time zone,
	"decided_by_id" text,
	"decided_at" timestamp with time zone,
	"decision_reason" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "client_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"entity_name" text NOT NULL,
	"relation_type" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"type" "document_type" NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"content" "bytea" NOT NULL,
	"status" "document_status" DEFAULT 'PENDENTE' NOT NULL,
	"review_note" text,
	"uploaded_by_id" text NOT NULL,
	"reviewed_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "related_party" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"role" "party_role" NOT NULL,
	"ownership_percentage" numeric(5, 2),
	"nationality" text NOT NULL,
	"document_number" text,
	"is_pep" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screening_alert" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"subject_type" "subject_type" NOT NULL,
	"subject_name" text NOT NULL,
	"related_party_id" uuid,
	"watchlist_entry_id" uuid NOT NULL,
	"match_score" integer NOT NULL,
	"matched_on" text NOT NULL,
	"status" "alert_status" DEFAULT 'ABERTO' NOT NULL,
	"analyst_opinion" text,
	"analyst_opinion_by_id" text,
	"decided_by_id" text,
	"decided_at" timestamp with time zone,
	"justification" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'ANALISTA' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watchlist_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"source" "watchlist_source" NOT NULL,
	"category" "watchlist_category" NOT NULL,
	"country" text,
	"reference" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client" ADD CONSTRAINT "client_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client" ADD CONSTRAINT "client_decided_by_id_user_id_fk" FOREIGN KEY ("decided_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_link" ADD CONSTRAINT "client_link_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_uploaded_by_id_user_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_reviewed_by_id_user_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "related_party" ADD CONSTRAINT "related_party_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screening_alert" ADD CONSTRAINT "screening_alert_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screening_alert" ADD CONSTRAINT "screening_alert_related_party_id_related_party_id_fk" FOREIGN KEY ("related_party_id") REFERENCES "public"."related_party"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screening_alert" ADD CONSTRAINT "screening_alert_watchlist_entry_id_watchlist_entry_id_fk" FOREIGN KEY ("watchlist_entry_id") REFERENCES "public"."watchlist_entry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screening_alert" ADD CONSTRAINT "screening_alert_analyst_opinion_by_id_user_id_fk" FOREIGN KEY ("analyst_opinion_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screening_alert" ADD CONSTRAINT "screening_alert_decided_by_id_user_id_fk" FOREIGN KEY ("decided_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_client_idx" ON "audit_log" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "client_status_idx" ON "client" USING btree ("status");--> statement-breakpoint
CREATE INDEX "client_created_by_idx" ON "client" USING btree ("created_by_id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_document_unique" ON "client" USING btree ("type","document_number");--> statement-breakpoint
CREATE INDEX "client_link_client_idx" ON "client_link" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "document_client_idx" ON "document" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "related_party_client_idx" ON "related_party" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "alert_client_idx" ON "screening_alert" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "alert_status_idx" ON "screening_alert" USING btree ("status");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");