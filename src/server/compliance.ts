import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import type { Tx } from "@/db";
import { client, clientLink, relatedParty, screeningAlert, watchlistEntry } from "@/db/schema";
import { assessRisk } from "@/lib/risk";
import { screenName } from "@/lib/screening";

/**
 * Executa o screening do cliente, das partes relacionadas e das entidades vinculadas contra as listas.
 * Alertas já decididos para o mesmo par (sujeito, entrada da lista) não são recriados:
 * o histórico de decisões é preservado.
 */
export async function runScreening(tx: Tx, clientId: string) {
  const [c] = await tx.select().from(client).where(eq(client.id, clientId));
  if (!c) throw new Error("Cliente não encontrado");

  const parties = await tx.select().from(relatedParty).where(eq(relatedParty.clientId, clientId));
  const links = await tx.select().from(clientLink).where(eq(clientLink.clientId, clientId));
  const entries = await tx
    .select({ id: watchlistEntry.id, fullName: watchlistEntry.fullName, aliases: watchlistEntry.aliases })
    .from(watchlistEntry);

  const existing = await tx
    .select({
      subjectName: screeningAlert.subjectName,
      watchlistEntryId: screeningAlert.watchlistEntryId,
    })
    .from(screeningAlert)
    .where(eq(screeningAlert.clientId, clientId));
  const seen = new Set(existing.map((e) => `${e.subjectName}::${e.watchlistEntryId}`));

  const subjects = [
    { type: "CLIENTE" as const, name: c.fullName, partyId: null as string | null },
    ...parties.map((p) => ({ type: "PARTE_RELACIONADA" as const, name: p.fullName, partyId: p.id as string | null })),
    ...links.map((l) => ({ type: "VINCULO" as const, name: l.entityName, partyId: null as string | null })),
  ];

  const created: { subject: string; score: number }[] = [];
  for (const subject of subjects) {
    for (const hit of screenName(subject.name, entries)) {
      const key = `${subject.name}::${hit.watchlistEntryId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      await tx.insert(screeningAlert).values({
        clientId,
        subjectType: subject.type,
        subjectName: subject.name,
        relatedPartyId: subject.partyId,
        watchlistEntryId: hit.watchlistEntryId,
        matchScore: hit.score,
        matchedOn: hit.matchedOn,
      });
      created.push({ subject: subject.name, score: hit.score });
    }
  }

  return { screenedSubjects: subjects.length, newAlerts: created };
}

/** Recalcula o risco com base nos dados atuais e nos alertas. */
export async function recalculateRisk(tx: Tx, clientId: string) {
  const [c] = await tx.select().from(client).where(eq(client.id, clientId));
  if (!c) throw new Error("Cliente não encontrado");

  const parties = await tx
    .select({ isPep: relatedParty.isPep })
    .from(relatedParty)
    .where(eq(relatedParty.clientId, clientId));

  const alerts = await tx
    .select({ status: screeningAlert.status, category: watchlistEntry.category })
    .from(screeningAlert)
    .innerJoin(watchlistEntry, eq(watchlistEntry.id, screeningAlert.watchlistEntryId))
    .where(
      and(eq(screeningAlert.clientId, clientId), inArray(screeningAlert.status, ["ABERTO", "CONFIRMADO"])),
    );

  const result = assessRisk({
    type: c.type,
    country: c.country,
    nationality: c.nationality,
    activity: c.activity,
    isPep: c.isPep || alerts.some((a) => a.status === "CONFIRMADO" && a.category === "PEP"),
    relatedPartyPep: parties.some((p) => p.isPep),
    expectedMonthlyVolume: c.expectedMonthlyVolume ? Number(c.expectedMonthlyVolume) : null,
    openOrConfirmedAlerts: alerts.length,
    confirmedSanctions: alerts.filter((a) => a.status === "CONFIRMADO" && a.category === "SANCAO").length,
  });

  await tx
    .update(client)
    .set({ riskLevel: result.level, riskScore: result.score, riskFactors: result.factors })
    .where(eq(client.id, clientId));

  return result;
}
