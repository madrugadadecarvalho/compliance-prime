import { strict as assert } from "node:assert";
import { test } from "node:test";
import { assessRisk, type RiskInput } from "../src/lib/risk";

const base: RiskInput = {
  type: "PESSOA_SINGULAR",
  country: "AO",
  activity: "Professora",
  isPep: false,
  relatedPartyPep: false,
  expectedMonthlyVolume: 500_000,
  openOrConfirmedAlerts: 0,
  confirmedSanctions: 0,
};

test("cliente sem fatores é risco baixo", () => {
  const r = assessRisk(base);
  assert.equal(r.level, "BAIXO");
  assert.equal(r.score, 0);
});

test("PEP com atividade de risco é risco alto e explica os fatores", () => {
  const r = assessRisk({ ...base, isPep: true, activity: "Casa de câmbio" });
  assert.equal(r.level, "ALTO");
  assert.ok(r.factors.some((f) => f.factor.includes("PEP")));
  assert.ok(r.factors.some((f) => f.factor.includes("Atividade")));
});

test("sanção confirmada força risco máximo", () => {
  const r = assessRisk({ ...base, confirmedSanctions: 1, openOrConfirmedAlerts: 1 });
  assert.equal(r.score, 100);
  assert.equal(r.level, "ALTO");
});

test("jurisdição de risco elevado pesa mais do que média", () => {
  const high = assessRisk({ ...base, country: "KP" });
  const medium = assessRisk({ ...base, country: "VE" });
  assert.ok(high.score > medium.score);
});
