-- A trilha de auditoria é append-only: nenhuma linha pode ser alterada ou apagada,
-- nem pela aplicação nem por quem tenha acesso direto à base de dados (exceto superuser que desative o trigger).
CREATE OR REPLACE FUNCTION audit_log_block_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log é append-only: % não é permitido', TG_OP;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS audit_log_no_update ON "audit_log";
--> statement-breakpoint
CREATE TRIGGER audit_log_no_update BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION audit_log_block_mutation();
--> statement-breakpoint
DROP TRIGGER IF EXISTS audit_log_no_truncate ON "audit_log";
--> statement-breakpoint
CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON "audit_log"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_block_mutation();
