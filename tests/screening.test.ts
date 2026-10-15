import { strict as assert } from "node:assert";
import { test } from "node:test";
import { MATCH_THRESHOLD, nameSimilarity, normalizeName, screenName } from "../src/lib/screening";

test("normaliza acentos, pontuação e partículas", () => {
  assert.deepEqual(normalizeName("João da Silva-Pereira, Lda."), ["joao", "silva", "pereira"]);
});

test("nomes iguais com acentos diferentes têm correspondência máxima", () => {
  assert.equal(nameSimilarity("José Manuel Gonçalves", "Jose Manuel Goncalves"), 100);
});

test("ordem dos nomes não afeta a correspondência", () => {
  assert.ok(nameSimilarity("Kazarov Viktor", "Viktor Kazarov") >= 95);
});

test("variações ortográficas ficam acima do limiar", () => {
  assert.ok(nameSimilarity("Victor Kasarov", "Viktor Kazarov") >= MATCH_THRESHOLD);
});

test("nomes diferentes ficam abaixo do limiar", () => {
  assert.ok(nameSimilarity("Maria Fernanda Costa", "Viktor Kazarov") < MATCH_THRESHOLD);
});

test("screenName usa aliases e devolve o melhor alias", () => {
  const hits = screenName("V. Kasarov", [
    { id: "1", fullName: "Viktor Andreyevich Kazarov", aliases: ["Victor Kasarov"] },
    { id: "2", fullName: "Ana Paula Domingos", aliases: [] },
  ]);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].watchlistEntryId, "1");
  assert.equal(hits[0].matchedOn, "Victor Kasarov");
});
