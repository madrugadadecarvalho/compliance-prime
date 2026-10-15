import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const PASSWORD = process.env.SEED_PASSWORD ?? "Compliance#2026";
const fixture = (f: string) => path.join(__dirname, "..", "fixtures", f);
const unique = Date.now().toString().slice(-7);

async function login(page: Page, who: "analista" | "supervisor" | "gestor" | "auditor") {
  await page.context().clearCookies();
  // Cada login simula um IP distinto, para não esbarrar no rate limiting (5 logins/minuto por IP).
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 250) + 1}` });
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(`${who}@complianceprime.dev`);
  await page.getByLabel("Palavra-passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/painel/);
}

/** Erros de CSP ou de hidratação aparecem na consola; falham o teste. */
function trackConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

test.describe.serial("Fluxo completo de onboarding", () => {
  let clientUrl = "";
  const name = `Kiala Comércio Geral ${unique}, Lda`;

  test("rotas protegidas exigem sessão", async ({ page }) => {
    await page.goto("/clientes");
    await expect(page).toHaveURL(/\/entrar\?next=%2Fclientes/);
  });

  test("analista cria rascunho com validação no cliente e no servidor", async ({ page }) => {
    const errors = trackConsole(page);
    await login(page, "analista");
    await page.goto("/clientes/novo");

    // Validação no cliente: envio vazio mostra erros sem ir ao servidor.
    await page.getByRole("button", { name: "Criar rascunho" }).click();
    await expect(page.getByText("Selecione o tipo de cliente.")).toBeVisible();
    await expect(page.getByText("Nome deve ter pelo menos 3 caracteres.")).toBeVisible();

    await page.getByLabel("Tipo de cliente").selectOption("PESSOA_COLETIVA");
    await page.getByLabel("Nome completo / Denominação social").fill(name);
    await page.getByLabel(/N\.º do documento/).fill(`54${unique}`);
    await page.getByLabel("NIF").fill(`54${unique}`);
    await page.getByLabel("Data de nascimento / constituição").fill("2015-03-10");
    await page.getByLabel("Morada").fill("Rua Rainha Ginga, 45, Luanda");
    await page.getByLabel("E-mail").fill("email-invalido");
    await page.getByLabel("Atividade / profissão").fill("Comércio de câmbio e metais preciosos");
    await page.getByLabel("Volume mensal esperado (Kz)").fill("80000000");
    await page.getByLabel("Origem dos fundos").fill("Receitas da atividade comercial");
    await page.getByLabel("O cliente é Pessoa Politicamente Exposta (PEP)").check();
    await page.getByRole("button", { name: "Criar rascunho" }).click();
    await expect(page.getByText("E-mail inválido.")).toBeVisible();

    await page.getByLabel("E-mail").fill("geral@kiala.example");
    await page.getByRole("button", { name: "Criar rascunho" }).click();
    await expect(page).toHaveURL(/\/clientes\/[0-9a-f-]{36}$/);
    clientUrl = page.url();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByText("Rascunho").first()).toBeVisible();
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("analista adiciona sócio sancionado, documentos e submete", async ({ page }) => {
    await login(page, "analista");
    await page.goto(clientUrl);

    const party = page.locator("form", { hasText: "Adicionar sócio" });
    await party.getByLabel("Nome completo").fill("Viktor Kazarov");
    await party.getByLabel("Função").selectOption("BENEFICIARIO_EFETIVO");
    await party.getByLabel("% de participação").fill("51");
    await party.getByLabel("Nacionalidade").selectOption("RU");
    await party.getByRole("button", { name: "Adicionar" }).click();
    await expect(page.getByRole("cell", { name: "Viktor Kazarov" })).toBeVisible();

    const upload = page.locator("form", { hasText: "Carregar documento" });
    // Ficheiro com extensão .png mas conteúdo de texto: rejeitado pela verificação de magic bytes.
    await upload.getByLabel("Tipo de documento").selectOption("CERTIDAO_COMERCIAL");
    await upload.getByLabel("Ficheiro").setInputFiles({
      name: "falso.png",
      mimeType: "image/png",
      buffer: Buffer.from("isto nao e uma imagem"),
    });
    await upload.getByRole("button", { name: "Carregar" }).click();
    await expect(page.getByText("O conteúdo do ficheiro não corresponde")).toBeVisible();

    for (const [type, file] of [
      ["CERTIDAO_COMERCIAL", "documento.pdf"],
      ["ESTATUTOS", "comprovativo.png"],
    ] as const) {
      await upload.getByLabel("Tipo de documento").selectOption(type);
      await upload.getByLabel("Ficheiro").setInputFiles(fixture(file));
      await upload.getByRole("button", { name: "Carregar" }).click();
      await expect(page.getByText("Documento carregado.")).toBeVisible();
    }

    // Falta o NIF: a submissão deixa o processo pendente de documentos.
    await page.getByRole("button", { name: /Submeter/ }).click();
    await expect(page.getByText(/ficou pendente de documentos/)).toBeVisible();
    await expect(page.getByText("Pendente de documentos").first()).toBeVisible();
    await expect(page.getByText("Faltam documentos obrigatórios ou foram devolvidos")).toBeVisible();

    await upload.getByLabel("Tipo de documento").selectOption("NIF");
    await upload.getByLabel("Ficheiro").setInputFiles({
      name: "nif.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(`%PDF-1.4\n% nif ${unique}\n%%EOF\n`),
    });
    await upload.getByRole("button", { name: "Carregar" }).click();
    await expect(page.getByText("Documento carregado.")).toBeVisible();

    await page.getByRole("button", { name: "Submeter para análise" }).click();
    await expect(page.getByText("Screening executado. Aguarda decisão de um supervisor.")).toBeVisible();

    // O screening apanhou o beneficiário efetivo.
    const alerts = page.locator("section", { has: page.locator("#alertas") });
    await expect(alerts.getByText("Viktor Kazarov")).toBeVisible();

    // Secções bloqueadas e sem botões de decisão para o analista.
    await expect(page.getByText(/Secção bloqueada/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Aprovar cliente" })).toHaveCount(0);
  });

  test("analista não acede a áreas de outros perfis", async ({ page }) => {
    await login(page, "analista");
    await page.goto("/admin/utilizadores");
    await expect(page).toHaveURL(/\/sem-acesso/);
    const res = await page.request.get("/api/auditoria/exportar");
    expect(res.status()).toBe(403);
  });

  test("supervisor valida documentos, decide o alerta e vê o bloqueio por risco alto", async ({ page }) => {
    await login(page, "supervisor");
    await page.goto(clientUrl);

    // Aprovar indisponível enquanto há documentos e alertas pendentes.
    await expect(page.getByText(/Aprovar indisponível/)).toBeVisible();

    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: "Validar" }).first().click();
      await page.waitForLoadState("networkidle");
    }
    await expect(page.getByRole("button", { name: "Validar" })).toHaveCount(0);

    await page.locator("section", { has: page.locator("#alertas") }).getByText("Viktor Kazarov").click();
    await expect(page.getByText("O que foi identificado")).toBeVisible();
    await expect(page.getByText("ONU (Conselho de Segurança)")).toBeVisible();

    await page.getByRole("button", { name: "Decidir alerta" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Decisão").selectOption("FALSO_POSITIVO");
    await dialog.getByLabel("Justificação").fill("curta");
    await dialog.getByLabel(/Escreva CONFIRMO/).fill("CONFIRMO");
    await dialog.getByRole("button", { name: "Registar decisão" }).click();
    await expect(dialog.getByText("Justificação deve ter pelo menos 20 caracteres.")).toBeVisible();
    await dialog
      .getByLabel("Justificação")
      .fill("Data de nascimento e número de passaporte do beneficiário não coincidem com a entrada DEMO-ONU-0001.");
    await dialog.getByRole("button", { name: "Registar decisão" }).click();
    await expect(page.getByText(/Falso positivo por Sérgio Supervisor/)).toBeVisible();

    await page.goto(clientUrl);
    // PEP + atividade de câmbio + volume elevado → risco alto → só o Gestor aprova.
    await expect(page.getByText("Risco alto").first()).toBeVisible();
    await expect(page.getByText(/exigem aprovação de um Gestor de Compliance/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Aprovar cliente" })).toHaveCount(0);
  });

  test("gestor aprova com justificação e dupla confirmação", async ({ page }) => {
    await login(page, "gestor");
    await page.goto(clientUrl);
    await page.getByRole("button", { name: "Aprovar cliente" }).click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("Justificação")
      .fill("Risco alto mitigado: origem dos fundos comprovada e beneficiário efetivo esclarecido. Monitorização reforçada.");
    const confirm = dialog.getByRole("button", { name: "Aprovar" });
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel(/Escreva CONFIRMO/).fill("CONFIRMO");
    await confirm.click();
    await expect(page.getByText(/Aprovado por Graça Gestora/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Editar dados" })).toHaveCount(0);
  });

  test("auditor consulta a trilha e exporta CSV", async ({ page }) => {
    await login(page, "auditor");
    await page.goto("/auditoria?acao=CLIENTE_APROVADO");
    await expect(page.getByText(/Risco alto mitigado/).first()).toBeVisible();
    const res = await page.request.get("/api/auditoria/exportar?acao=CLIENTE_APROVADO");
    expect(res.status()).toBe(200);
    const csv = await res.text();
    expect(csv).toContain("CLIENTE_APROVADO");
    expect(csv).toContain("Graça Gestora");
  });
});

test("login com credenciais erradas é limitado (rate limiting)", async ({ page }) => {
  await page.goto("/entrar");
  let lastStatus = 0;
  for (let i = 0; i < 7; i++) {
    const res = await page.request.post("/api/auth/sign-in/email", {
      data: { email: "ninguem@example.com", password: "PalavraErrada#123" },
      headers: { origin: "http://localhost:3000", "x-forwarded-for": "203.0.113.77" },
    });
    lastStatus = res.status();
  }
  expect(lastStatus).toBe(429);
});
