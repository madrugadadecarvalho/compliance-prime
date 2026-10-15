import { strict as assert } from "node:assert";
import { test } from "node:test";
import { clientSchema, decisionSchema, passwordSchema } from "../src/lib/validation";

const valid = {
  type: "PESSOA_SINGULAR",
  fullName: "Joana Mateus",
  documentNumber: "005432198LA041",
  country: "AO",
  address: "Rua 1, Luanda",
  activity: "Engenheira",
  sourceOfFunds: "Salário",
  birthOrIncorporationDate: "1990-01-01",
};

test("cliente válido passa", () => {
  assert.equal(clientSchema.safeParse(valid).success, true);
});

test("rejeita nomes com caracteres de script e menores de idade", () => {
  assert.equal(clientSchema.safeParse({ ...valid, fullName: "<script>x</script>" }).success, false);
  const minor = new Date(Date.now() - 10 * 365 * 864e5).toISOString().slice(0, 10);
  assert.equal(clientSchema.safeParse({ ...valid, birthOrIncorporationDate: minor }).success, false);
});

test("país fora da lista é rejeitado", () => {
  assert.equal(clientSchema.safeParse({ ...valid, country: "XX" }).success, false);
});

test("política de palavra-passe", () => {
  assert.equal(passwordSchema.safeParse("curta").success, false);
  assert.equal(passwordSchema.safeParse("semsimbolos123ABC").success, false);
  assert.equal(passwordSchema.safeParse("Compliance#2026").success, true);
});

test("decisão exige justificação e palavra de confirmação", () => {
  const base = { clientId: "8f1c1f8e-2a7b-4b3a-9a4e-0f3b2c1d4e5f", version: "1" };
  assert.equal(decisionSchema.safeParse({ ...base, justification: "curta", confirmation: "CONFIRMO" }).success, false);
  assert.equal(
    decisionSchema.safeParse({ ...base, justification: "Justificação suficientemente longa.", confirmation: "sim" }).success,
    false,
  );
  assert.equal(
    decisionSchema.safeParse({ ...base, justification: "Justificação suficientemente longa.", confirmation: "CONFIRMO" }).success,
    true,
  );
});
