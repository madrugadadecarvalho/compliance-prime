import { strict as assert } from "node:assert";
import { test } from "node:test";
import { canApprove, canReject, canReturn, canSubmit, missingDocuments, type DecisionContext } from "../src/lib/workflow";

const ctx: DecisionContext = {
  status: "EM_ANALISE",
  riskLevel: "MEDIO",
  createdById: "analista-1",
  openAlerts: 0,
  confirmedSanctions: 0,
  missingDocuments: 0,
  pendingDocuments: 0,
};
const supervisor = { id: "sup-1", role: "SUPERVISOR" as const };
const gestor = { id: "ges-1", role: "GESTOR" as const };
const analista = { id: "analista-1", role: "ANALISTA" as const };
const auditor = { id: "aud-1", role: "AUDITOR" as const };

test("supervisor aprova processo limpo de outra pessoa", () => {
  assert.equal(canApprove(supervisor, ctx).allowed, true);
});

test("analista e auditor nunca aprovam", () => {
  assert.equal(canApprove(analista, ctx).allowed, false);
  assert.equal(canApprove(auditor, ctx).allowed, false);
});

test("princípio dos quatro olhos: quem criou não decide", () => {
  const own = { ...ctx, createdById: gestor.id };
  assert.equal(canApprove(gestor, own).allowed, false);
  assert.equal(canReject(gestor, own).allowed, false);
});

test("risco alto exige gestor", () => {
  const high = { ...ctx, riskLevel: "ALTO" as const };
  assert.equal(canApprove(supervisor, high).allowed, false);
  assert.equal(canApprove(gestor, high).allowed, true);
});

test("alertas abertos, sanção confirmada ou documentos pendentes bloqueiam aprovação", () => {
  assert.equal(canApprove(gestor, { ...ctx, openAlerts: 1 }).allowed, false);
  assert.equal(canApprove(gestor, { ...ctx, confirmedSanctions: 1 }).allowed, false);
  assert.equal(canApprove(gestor, { ...ctx, pendingDocuments: 1 }).allowed, false);
  assert.equal(canApprove(gestor, { ...ctx, missingDocuments: 1 }).allowed, false);
});

test("sanção confirmada ainda permite rejeitar", () => {
  assert.equal(canReject(supervisor, { ...ctx, confirmedSanctions: 1 }).allowed, true);
});

test("transições só nos estados certos", () => {
  assert.equal(canSubmit(analista, { ...ctx, status: "RASCUNHO" }).allowed, true);
  assert.equal(canSubmit(analista, ctx).allowed, false);
  assert.equal(canReturn(supervisor, ctx).allowed, true);
  assert.equal(canReturn(supervisor, { ...ctx, status: "APROVADO" }).allowed, false);
});

test("documentos obrigatórios por tipo de cliente; rejeitados não contam", () => {
  assert.deepEqual(
    missingDocuments("PESSOA_SINGULAR", [
      { type: "BILHETE_IDENTIDADE", status: "VALIDADO" },
      { type: "NIF", status: "REJEITADO" },
    ]),
    ["NIF", "COMPROVATIVO_MORADA"],
  );
});
