import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BellRing,
  ClipboardCheck,
  FileClock,
  Fingerprint,
  Gauge,
  Code2,
  Lock,
  Newspaper,
  Radar,
  Scale,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react";
import { getCurrentUser } from "@/server/session";
import { env } from "@/lib/env";
import { cn } from "@/components/ui";
import { SmoothScroll } from "@/components/landing/smooth-scroll";
import { Reveal } from "@/components/landing/reveal";
import { CountUp } from "@/components/landing/count-up";
import { SpotlightCard } from "@/components/landing/spotlight-card";
import { HeroPreview } from "@/components/landing/hero-preview";

export const metadata: Metadata = {
  title: "Compliance Prime — KYC, AML e gestão de risco",
  description:
    "Onboarding KYC, screening de sanções e PEP, segregação de funções e audit trail imutável para instituições financeiras.",
};

const REPO_URL = "https://github.com/madrugadadecarvalho/compliance-prime";

const primaryBtn =
  "group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-indigo-500/40 hover:brightness-110 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300";
const secondaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:border-white/30 hover:bg-white/10 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300";

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <Reveal className="mx-auto mb-12 max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-base leading-relaxed text-slate-400">{text}</p>}
    </Reveal>
  );
}

function Soon() {
  return (
    <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
      Em breve
    </span>
  );
}

export default async function Home() {
  if (await getCurrentUser()) redirect("/painel");
  const signupHref = env.ALLOW_SIGNUP ? "/registar" : "/entrar";

  const metrics = [
    { value: 100, suffix: "%", label: "das ações registadas no audit trail", detail: "incluindo logins falhados e acessos negados" },
    { value: 4, label: "perfis com responsabilidades separadas", detail: "Analista, Supervisor, Gestor e Auditor" },
    { value: 5, label: "fontes de listas de vigilância", detail: "ONU, OFAC, UE, PEP nacional e lista interna" },
    { value: 0, label: "aprovações sem quatro olhos", detail: "quem cria um processo nunca o decide" },
  ];

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#050b1a] text-slate-200 antialiased selection:bg-sky-400/30">
      <SmoothScroll />
      <noscript>
        <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
      </noscript>

      {/* Fundo: gradientes e grelha */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[900px]">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-indigo-600/25 blur-[120px]" />
        <div className="absolute right-[-10%] top-40 h-[400px] w-[500px] rounded-full bg-sky-500/15 blur-[120px]" />
      </div>

      {/* Navegação */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#050b1a]/60 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6" aria-label="Principal">
          <Link href="/" className="flex items-center gap-2 whitespace-nowrap font-semibold text-white">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-sky-400 to-indigo-600 shadow-lg shadow-indigo-500/30">
              <ShieldCheck className="size-4.5" aria-hidden />
            </span>
            Compliance Prime
          </Link>
          <div className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
            {[
              ["#modulos", "Módulos"],
              ["#como-funciona", "Como funciona"],
              ["#seguranca", "Segurança"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="transition hover:text-white">
                {label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/entrar" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white">
              Entrar
            </Link>
            <Link href={signupHref} className={cn(primaryBtn, "px-4 py-2")}>
              Começar
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* HERO */}
        <section className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 pb-24 pt-16 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-sky-200 backdrop-blur">
                <span className="animate-pulse-dot size-1.5 rounded-full bg-emerald-400" aria-hidden />
                KYC · AML · Gestão de risco
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Decisões de compliance{" "}
                <span className="bg-gradient-to-r from-sky-300 via-indigo-300 to-emerald-300 bg-clip-text text-transparent">
                  rápidas, rastreáveis
                </span>{" "}
                e prontas para auditoria.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
                Onboarding de clientes, screening de sanções e PEP e aprovações com quatro olhos — numa plataforma onde a
                interface guia o analista e cada decisão fica registada com quem, quando e porquê.
              </p>
            </Reveal>
            <Reveal delay={240} className="mt-8 flex flex-wrap gap-3">
              <Link href={signupHref} className={primaryBtn}>
                Começar agora
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <a href="#como-funciona" className={secondaryBtn}>
                Ver como funciona
              </a>
            </Reveal>
            <Reveal delay={320}>
              <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
                {["Bancos", "Instituições financeiras não bancárias", "Seguradoras", "Casas de câmbio"].map((s) => (
                  <li key={s} className="flex items-center gap-2">
                    <span className="size-1 rounded-full bg-sky-400" aria-hidden />
                    {s}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <HeroPreview />
          </Reveal>
        </section>

        {/* MÓDULOS — Bento grid */}
        <section id="modulos" className="relative mx-auto max-w-7xl scroll-mt-24 px-6 py-24">
          <SectionTitle
            eyebrow="Módulos"
            title="Tudo o que a equipa de conformidade precisa, num só fluxo"
            text="Cada módulo foi desenhado a partir do trabalho real de analistas, supervisores e auditores."
          />
          <div className="grid auto-rows-[minmax(190px,auto)] gap-4 md:grid-cols-6">
            <Reveal className="md:col-span-4 md:row-span-2">
              <SpotlightCard className="h-full">
                <div className="flex h-full flex-col">
                  <Workflow className="size-6 text-sky-300" aria-hidden />
                  <h3 className="mt-4 text-xl font-semibold text-white">Onboarding KYC como processo</h3>
                  <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-400">
                    Rascunho, pendente de documentos, em análise, aprovado ou rejeitado. Cada estado tem a sua interface,
                    as secções bloqueiam-se quando o processo avança e cada transição tem regras explícitas.
                  </p>
                  <ul className="mt-6 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                    {[
                      "Documentos obrigatórios por tipo de cliente",
                      "Screening automático ao submeter",
                      "Bloqueios explicados, não escondidos",
                      "Proteção contra decisões concorrentes",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-sky-300" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-8">
                    <ol className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
                      {["Rascunho", "Pendente", "Em análise", "Aprovado", "Rejeitado"].map((s, i) => (
                        <li
                          key={s}
                          className={cn(
                            "rounded-lg border px-3 py-2 transition duration-300 group-hover:translate-y-[-2px]",
                            i === 2
                              ? "border-sky-300/40 bg-sky-400/10 text-sky-100"
                              : i === 3
                                ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
                                : i === 4
                                  ? "border-rose-300/30 bg-rose-400/10 text-rose-200"
                                  : "border-white/10 bg-white/[0.03] text-slate-400",
                          )}
                          style={{ transitionDelay: `${i * 40}ms` }}
                        >
                          {s}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </SpotlightCard>
            </Reveal>

            <Reveal className="md:col-span-2" delay={80}>
              <SpotlightCard className="h-full">
                <Radar className="size-6 text-rose-300" aria-hidden />
                <h3 className="mt-4 font-semibold text-white">Screening de sanções e PEP</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Cliente, sócios e entidades vinculadas verificados contra ONU, OFAC, UE e PEP, com grau de
                  correspondência.
                </p>
              </SpotlightCard>
            </Reveal>

            <Reveal className="md:col-span-2" delay={160}>
              <SpotlightCard className="h-full">
                <Newspaper className="size-6 text-amber-200" aria-hidden />
                <h3 className="mt-4 font-semibold text-white">Mídia adversa</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Notícias negativas tratadas como alertas com categoria própria, na lista interna da instituição.
                </p>
              </SpotlightCard>
            </Reveal>

            <Reveal className="md:col-span-2">
              <SpotlightCard className="h-full">
                <div className="flex items-center justify-between">
                  <BellRing className="size-6 text-indigo-300" aria-hidden />
                  <Soon />
                </div>
                <h3 className="mt-4 font-semibold text-white">Alertas com SLA</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Prazos de decisão por gravidade e escalonamento automático quando um alerta fica parado.
                </p>
              </SpotlightCard>
            </Reveal>

            <Reveal className="md:col-span-2" delay={80}>
              <SpotlightCard className="h-full">
                <div className="flex items-center justify-between">
                  <Gauge className="size-6 text-emerald-300" aria-hidden />
                  <Soon />
                </div>
                <h3 className="mt-4 font-semibold text-white">Monitorização contínua</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Novo screening automático da carteira aprovada sempre que as listas oficiais são atualizadas.
                </p>
              </SpotlightCard>
            </Reveal>

            <Reveal className="md:col-span-2" delay={160}>
              <SpotlightCard className="h-full">
                <Scale className="size-6 text-sky-300" aria-hidden />
                <h3 className="mt-4 font-semibold text-white">Risco explicável</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Cada ponto de risco tem um motivo visível. Risco alto exige aprovação do Gestor de Compliance.
                </p>
              </SpotlightCard>
            </Reveal>

            <Reveal className="md:col-span-3">
              <SpotlightCard className="h-full">
                <Users className="size-6 text-violet-300" aria-hidden />
                <h3 className="mt-4 font-semibold text-white">Segregação de funções</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Analista, Supervisor, Gestor e Auditor veem e aprovam coisas diferentes. Quem cria não decide; quem
                  carrega um documento não o valida.
                </p>
              </SpotlightCard>
            </Reveal>

            <Reveal className="md:col-span-3" delay={80}>
              <SpotlightCard className="h-full">
                <FileClock className="size-6 text-emerald-300" aria-hidden />
                <h3 className="mt-4 font-semibold text-white">Audit trail imutável</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Registo append-only protegido na própria base de dados, filtrável e exportável em CSV para auditores.
                </p>
              </SpotlightCard>
            </Reveal>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section id="como-funciona" className="relative mx-auto max-w-7xl scroll-mt-24 px-6 py-24">
          <SectionTitle
            eyebrow="Como funciona"
            title="Do primeiro documento à decisão auditada"
            text="Quatro etapas claras, com a pessoa certa a agir em cada uma."
          />
          <ol className="relative grid gap-4 md:grid-cols-4">
            <div
              aria-hidden
              className="absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent md:block"
            />
            {[
              { icon: ClipboardCheck, title: "Recolher", who: "Analista", text: "Dados do cliente, sócios, beneficiários efetivos, vínculos e documentos obrigatórios." },
              { icon: Radar, title: "Verificar", who: "Automático", text: "Screening contra listas e classificação de risco recalculada a cada alteração." },
              { icon: Scale, title: "Decidir", who: "Supervisor / Gestor", text: "Alertas e aprovação com justificação, dupla confirmação e quatro olhos." },
              { icon: FileClock, title: "Auditar", who: "Auditor", text: "Histórico completo e imutável de cada ação, pronto para exportar." },
            ].map((step, i) => (
              <Reveal as="li" key={step.title} delay={i * 100}>
                <div className="relative h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/20">
                  <span className="relative grid size-12 place-items-center rounded-xl border border-white/10 bg-[#0b1530] text-sky-300 shadow-lg">
                    <step.icon className="size-5" aria-hidden />
                  </span>
                  <p className="mt-5 text-xs font-medium text-slate-500">
                    0{i + 1} · {step.who}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* MÉTRICAS / CONFIANÇA */}
        <section id="seguranca" className="relative scroll-mt-24 py-24">
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/40 to-transparent" />
          <div className="relative mx-auto max-w-7xl px-6">
            <SectionTitle
              eyebrow="Confiança"
              title="Controlos que não dependem de boa vontade"
              text="As regras são aplicadas no servidor e na base de dados — esconder um botão não é segurança."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {metrics.map((m, i) => (
                <Reveal key={m.label} delay={i * 90}>
                  <div className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
                    <p className="bg-gradient-to-br from-white to-sky-200 bg-clip-text text-5xl font-semibold tracking-tight text-transparent">
                      <CountUp value={m.value} suffix={m.suffix} />
                    </p>
                    <p className="mt-3 text-sm font-medium text-white">{m.label}</p>
                    <p className="mt-1 text-xs text-slate-400">{m.detail}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal className="mt-10">
              <ul className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  [Fingerprint, "Validação Zod no navegador e no servidor"],
                  [Lock, "Content-Security-Policy com nonce por pedido"],
                  [ShieldCheck, "Rate limiting e política de palavra-passe forte"],
                  [Users, "Perfil lido da base de dados em cada pedido"],
                  [FileClock, "Alteração e auditoria na mesma transação"],
                  [ClipboardCheck, "Ficheiros verificados pelo conteúdo real"],
                ].map(([Icon, text]) => {
                  const I = Icon as typeof Lock;
                  return (
                    <li
                      key={text as string}
                      className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 transition hover:border-white/15 hover:bg-white/[0.04]"
                    >
                      <I className="size-4 shrink-0 text-emerald-300" aria-hidden />
                      {text as string}
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="mx-auto max-w-7xl px-6 py-24">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/30 via-sky-500/10 to-emerald-400/10 p-10 text-center backdrop-blur-xl sm:p-16">
              <div aria-hidden className="bg-grid absolute inset-0 opacity-60" />
              <div className="relative">
                <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Compliance não é burocracia digitalizada. É gestão de risco.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-slate-300">
                  Experimente o fluxo completo com as contas de demonstração ou crie a sua conta de analista.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link href={signupHref} className={primaryBtn}>
                    Criar conta
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                  <Link href="/entrar" className={secondaryBtn}>
                    Entrar
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-[#040915]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2 font-semibold text-white">
              <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-sky-400 to-indigo-600">
                <ShieldCheck className="size-4.5" aria-hidden />
              </span>
              Compliance Prime
            </Link>
            <p className="mt-4 max-w-xs text-sm text-slate-400">
              KYC, AML e gestão de risco para instituições financeiras bancárias e não bancárias.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Audit trail append-only", "CSP com nonce", "Quatro olhos", "Código aberto · MIT"].map((seal) => (
                <span
                  key={seal}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/5 px-2.5 py-1 text-[11px] text-emerald-200"
                >
                  <ShieldCheck className="size-3" aria-hidden />
                  {seal}
                </span>
              ))}
            </div>
          </div>
          {[
            {
              title: "Produto",
              links: [
                ["#modulos", "Módulos"],
                ["#como-funciona", "Como funciona"],
                ["#seguranca", "Segurança"],
              ],
            },
            {
              title: "Acesso",
              links: [
                ["/entrar", "Entrar"],
                [signupHref, "Criar conta"],
              ],
            },
            {
              title: "Projeto",
              links: [
                [REPO_URL, "Código no GitHub"],
                [`${REPO_URL}#readme`, "Documentação"],
                [`${REPO_URL}/blob/main/LICENSE`, "Licença MIT"],
              ],
            },
          ].map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="text-sm font-semibold text-white">{col.title}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map(([href, label]) => (
                  <li key={label}>
                    {href.startsWith("http") ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-slate-400 transition hover:text-white"
                      >
                        {label === "Código no GitHub" && <Code2 className="size-3.5" aria-hidden />}
                        {label}
                      </a>
                    ) : (
                      <Link href={href} className="text-slate-400 transition hover:text-white">
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="border-t border-white/5">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-6 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
            <p>© {new Date().getFullYear()} Compliance Prime · Madrugada de Carvalho</p>
            <p>
              Projeto de demonstração. Listas de vigilância e clientes são fictícios. Não constitui aconselhamento
              jurídico ou regulatório.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
