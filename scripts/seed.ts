/**
 * Dados de demonstração (fictícios).
 * Executar com: npm run db:seed
 *
 * Cria um utilizador por perfil, uma lista de vigilância fictícia e processos
 * em vários estados para explorar o fluxo completo.
 */
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { client, document, relatedParty, session, user, watchlistEntry, clientLink } from "@/db/schema";
import { auth } from "@/lib/auth";
import { writeAudit } from "@/server/audit";
import { recalculateRisk, runScreening } from "@/server/compliance";
import { createHash, randomBytes } from "node:crypto";

const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? "Compliance#2026";

const USERS = [
  { name: "Ana Analista", email: "analista@complianceprime.dev", role: "ANALISTA" as const },
  { name: "Sérgio Supervisor", email: "supervisor@complianceprime.dev", role: "SUPERVISOR" as const },
  { name: "Graça Gestora", email: "gestor@complianceprime.dev", role: "GESTOR" as const },
  { name: "Aurélio Auditor", email: "auditor@complianceprime.dev", role: "AUDITOR" as const },
];

// Todas as entradas são FICTÍCIAS. Não correspondem a pessoas ou entidades reais.
const WATCHLIST = [
  {
    fullName: "Viktor Andreyevich Kazarov",
    aliases: ["Victor Kasarov", "V. A. Kazarov"],
    source: "ONU" as const,
    category: "SANCAO" as const,
    country: "RU",
    reference: "DEMO-ONU-0001",
    notes: "Entrada fictícia para demonstração. Alegado envolvimento em financiamento de proliferação.",
  },
  {
    fullName: "Kazarov Trading FZE",
    aliases: ["Kazarov Holding"],
    source: "OFAC" as const,
    category: "SANCAO" as const,
    country: "AE",
    reference: "DEMO-OFAC-0002",
    notes: "Entrada fictícia. Empresa de fachada associada à entrada DEMO-ONU-0001.",
  },
  {
    fullName: "Orlando Mbemba Quissanga",
    aliases: ["Orlando Quissanga"],
    source: "PEP_NACIONAL" as const,
    category: "PEP" as const,
    country: "AO",
    reference: "DEMO-PEP-0003",
    notes: "Entrada fictícia. Ex-titular de cargo político de nível nacional (2017–2022).",
  },
  {
    fullName: "Sahara Gold Commodities Limited",
    aliases: ["Sahara Gold"],
    source: "UNIAO_EUROPEIA" as const,
    category: "SANCAO" as const,
    country: "ML",
    reference: "DEMO-UE-0004",
    notes: "Entrada fictícia. Comércio ilícito de ouro.",
  },
  {
    fullName: "Benedita Lukoki Fernandes",
    aliases: [],
    source: "LISTA_INTERNA" as const,
    category: "MEDIA_ADVERSA" as const,
    country: "AO",
    reference: "DEMO-INT-0005",
    notes: "Entrada fictícia. Notícias sobre alegada fraude documental (não confirmada).",
  },
];

/** PDF mínimo válido, gerado em memória (só para demonstração). */
function demoPdf(title: string) {
  const text = `Compliance Prime - documento de demonstracao: ${title}`;
  const stream = `BT /F1 12 Tf 50 750 Td (${text}) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => (out += `${String(o).padStart(10, "0")} 00000 n \n`));
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

async function ensureUser(u: (typeof USERS)[number]) {
  const [existing] = await db.select().from(user).where(eq(user.email, u.email));
  if (existing) return existing;
  await auth.api.signUpEmail({ body: { name: u.name, email: u.email, password: DEMO_PASSWORD } });
  const [created] = await db.update(user).set({ role: u.role }).where(eq(user.email, u.email)).returning();
  return created;
}

async function addDoc(clientId: string, type: (typeof document.$inferInsert)["type"], uploadedById: string, status: "PENDENTE" | "VALIDADO" = "PENDENTE", reviewedById?: string) {
  const content = demoPdf(`${type} ${randomBytes(4).toString("hex")}`);
  await db.insert(document).values({
    clientId,
    type,
    fileName: `${type.toLowerCase()}.pdf`,
    mimeType: "application/pdf",
    sizeBytes: content.length,
    sha256: createHash("sha256").update(content).digest("hex"),
    content,
    uploadedById,
    status,
    reviewedById: reviewedById ?? null,
  });
}

async function main() {
  const [{ count }] = (await db.execute<{ count: number }>(sql`select count(*)::int as count from "client"`)).rows;
  const people = Object.fromEntries(await Promise.all(USERS.map(async (u) => [u.role, await ensureUser(u)] as const)));
  // O registo via Better Auth inicia sessão automaticamente; essas sessões não são necessárias.
  await db.delete(session);
  console.log("✓ Utilizadores de demonstração prontos");

  if (count > 0) {
    console.log("• Já existem processos; os dados de exemplo não foram recriados.");
    return;
  }

  await db.insert(watchlistEntry).values(WATCHLIST);
  console.log(`✓ ${WATCHLIST.length} entradas fictícias na lista de vigilância`);

  const analyst = people.ANALISTA;
  const supervisor = people.SUPERVISOR;
  const actor = { id: analyst.id, name: analyst.name, role: analyst.role };

  // 1) Rascunho simples
  const [draft] = await db
    .insert(client)
    .values({
      reference: "CP-2026-A1B2C3",
      type: "PESSOA_SINGULAR",
      fullName: "Joana Mateus Cardoso",
      documentNumber: "005432198LA041",
      taxId: "005432198LA041",
      country: "AO",
      nationality: "AO",
      birthOrIncorporationDate: "1991-04-12",
      address: "Rua Major Kanhangulo, 120, Ingombota, Luanda",
      email: "joana.cardoso@example.com",
      phone: "+244 923 000 111",
      activity: "Engenheira de software",
      sourceOfFunds: "Salário por conta de outrem",
      expectedMonthlyVolume: "850000.00",
      createdById: analyst.id,
    })
    .returning();
  await addDoc(draft.id, "BILHETE_IDENTIDADE", analyst.id);

  // 2) Empresa em análise com sócio que corresponde a lista de sanções
  const [company] = await db
    .insert(client)
    .values({
      reference: "CP-2026-D4E5F6",
      type: "PESSOA_COLETIVA",
      fullName: "Atlântico Logística e Comércio, Lda",
      documentNumber: "5417089321",
      taxId: "5417089321",
      country: "AO",
      birthOrIncorporationDate: "2019-09-02",
      address: "Zona Económica Especial, Viana, Luanda",
      email: "geral@atlantico-logistica.example",
      activity: "Importação e distribuição de bens alimentares",
      sourceOfFunds: "Receitas operacionais e financiamento bancário",
      expectedMonthlyVolume: "65000000.00",
      createdById: analyst.id,
      status: "EM_ANALISE",
      submittedAt: new Date(),
    })
    .returning();
  await db.insert(relatedParty).values([
    { clientId: company.id, fullName: "Paulo Sebastião Domingos", role: "SOCIO", ownershipPercentage: "60.00", nationality: "AO" },
    { clientId: company.id, fullName: "Victor Kasarov", role: "BENEFICIARIO_EFETIVO", ownershipPercentage: "40.00", nationality: "RU" },
  ]);
  await db.insert(clientLink).values({
    clientId: company.id,
    entityName: "Kazarov Holding",
    relationType: "Grupo económico",
    description: "Participação indireta através do beneficiário efetivo.",
  });
  for (const t of ["CERTIDAO_COMERCIAL", "ESTATUTOS", "NIF"] as const) await addDoc(company.id, t, analyst.id, "VALIDADO", supervisor.id);

  // 3) Pessoa singular PEP em análise
  const [pep] = await db
    .insert(client)
    .values({
      reference: "CP-2026-G7H8I9",
      type: "PESSOA_SINGULAR",
      fullName: "Orlando Quissanga",
      documentNumber: "001122334LA019",
      country: "AO",
      nationality: "AO",
      birthOrIncorporationDate: "1968-11-30",
      address: "Talatona, Luanda",
      activity: "Consultor",
      sourceOfFunds: "Rendimentos de consultoria e imóveis arrendados",
      expectedMonthlyVolume: "12000000.00",
      createdById: analyst.id,
      status: "EM_ANALISE",
      submittedAt: new Date(),
    })
    .returning();
  for (const t of ["BILHETE_IDENTIDADE", "NIF", "COMPROVATIVO_MORADA"] as const) await addDoc(pep.id, t, analyst.id, "VALIDADO", supervisor.id);

  await db.transaction(async (tx) => {
    for (const c of [draft, company, pep]) {
      if (c.status === "EM_ANALISE") await runScreening(tx, c.id);
      await recalculateRisk(tx, c.id);
      await writeAudit(tx, {
        actor,
        action: c.status === "EM_ANALISE" ? "CLIENTE_SUBMETIDO" : "CLIENTE_CRIADO",
        entityType: "CLIENTE",
        entityId: c.id,
        clientId: c.id,
        summary: c.status === "EM_ANALISE" ? "Dados de demonstração: processo submetido para análise" : "Dados de demonstração: rascunho criado",
      });
    }
  });

  console.log("✓ 3 processos de exemplo (rascunho, empresa com alerta de sanções, PEP)");
  console.log(`\nContas de demonstração (palavra-passe: ${DEMO_PASSWORD}):`);
  USERS.forEach((u) => console.log(`  ${u.role.padEnd(10)} ${u.email}`));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
