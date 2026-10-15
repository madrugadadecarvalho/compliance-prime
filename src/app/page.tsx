import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BellRing,
  Check,
  ClipboardCheck,
  Code2,
  FileClock,
  Fingerprint,
  Gauge,
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
import { getTheme } from "@/lib/theme";
import { cn } from "@/components/ui";
import { BrandMark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { SmoothScroll } from "@/components/landing/smooth-scroll";
import { Reveal } from "@/components/landing/reveal";
import { CountUp } from "@/components/landing/count-up";
import { HeroPreview } from "@/components/landing/hero-preview";

export const metadata: Metadata = {
  title: "Compliance Prime — KYC, AML e gestão de risco",
  description:
    "Onboarding KYC, screening de sanções e PEP, segregação de funções e audit trail imutável para instituições financeiras.",
};

const REPO_URL = "https://github.com/madrugadadecarvalho/compliance-prime";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const primaryBtn = cn(
  "group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-on-primary transition hover:shadow-elevation-2 hover:brightness-110 active:scale-[0.98]",
  focusRing,
);
const tonalBtn = cn(
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-secondary-container px-6 text-sm font-medium text-on-secondary-container transition hover:shadow-elevation-1 active:scale-[0.98]",
  focusRing,
);

function SectionHeading({ index, title, text }: { index: string; title: string; text?: string }) {
  return (
    <Reveal className="mb-10 grid gap-4 md:grid-cols-[10rem_1fr] md:gap-8">
      <p className="text-sm text-on-surface-variant tabular-nums">{index}</p>
      <div className="max-w-2xl">
        <h2 className="text-3xl leading-tight font-normal tracking-tight text-on-surface sm:text-[2.5rem]">{title}</h2>
        {text && <p className="mt-3 text-base leading-relaxed text-on-surface-variant">{text}</p>}
      </div>
    </Reveal>
  );
}

function Soon() {
  return (
    <span className="rounded-full bg-tertiary-container px-2.5 py-0.5 text-[11px] font-medium text-on-tertiary-container">
      Em breve
    </span>
  );
}

function Module({
  icon: Icon,
  title,
  text,
  soon,
  className,
  children,
}: {
  icon: typeof Lock;
  title: string;
  text: string;
  soon?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-3xl border border-outline-variant bg-surface p-6 transition duration-300 hover:shadow-elevation-2",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="grid size-10 place-items-center rounded-full bg-surface-container text-on-surface">
          <Icon className="size-[1.15rem]" aria-hidden />
        </span>
        {soon && <Soon />}
      </div>
      <h3 className="mt-5 text-lg font-medium text-on-surface">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">{text}</p>
      {children}
    </div>
  );
}

export default async function Home() {
  if (await getCurrentUser()) redirect("/painel");
  const theme = await getTheme();
  const signupHref = env.ALLOW_SIGNUP ? "/registar" : "/entrar";

  const metrics = [
    { value: 100, suffix: "%", label: "das ações ficam na trilha de auditoria", detail: "incluindo logins falhados e acessos negados" },
    { value: 4, label: "perfis com responsabilidades separadas", detail: "Analista, Supervisor, Gestor e Auditor" },
    { value: 5, label: "fontes de listas de vigilância", detail: "ONU, OFAC, UE, PEP nacional e lista interna" },
    { value: 0, label: "aprovações sem quatro olhos", detail: "quem cria um processo nunca o decide" },
  ];

  return (
    <div className="relative min-h-screen overflow-x-clip bg-background text-on-surface">
      <SmoothScroll />
      <noscript>
        <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
      </noscript>

      {/* Navegação */}
      <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:px-6" aria-label="Principal">
          <Link href="/" className={cn("rounded-full", focusRing)}>
            <BrandMark className="max-sm:[&>span:last-child]:hidden" />
          </Link>
          <div className="hidden items-center gap-1 text-sm md:flex">
            {[
              ["#modulos", "Módulos"],
              ["#como-funciona", "Como funciona"],
              ["#seguranca", "Segurança"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className={cn("rounded-full px-3.5 py-2 text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface", focusRing)}
              >
                {label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ThemeToggle initial={theme} />
            </div>
            <Link
              href="/entrar"
              className={cn("rounded-full px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary-container/50", focusRing)}
            >
              Entrar
            </Link>
            <Link href={signupHref} className={cn(primaryBtn, "h-9 px-4")}>
              Criar conta
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* HERO */}
        <section className="mx-auto max-w-6xl px-5 pt-14 pb-20 sm:px-6 lg:pt-20">
          <div className="grid items-end gap-10 lg:grid-cols-[1.25fr_1fr]">
            <div>
              <Reveal>
                <p className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs text-on-surface-variant ring-1 ring-outline-variant">
                  <span className="size-1.5 rounded-full bg-tertiary" aria-hidden />
                  KYC, AML e gestão de risco para instituições financeiras
                </p>
              </Reveal>
              <Reveal delay={80}>
                <h1 className="mt-6 text-[2.6rem] leading-[1.08] font-normal tracking-[-0.02em] text-on-surface sm:text-6xl">
                  Cada decisão de compliance com nome, data e motivo.
                </h1>
              </Reveal>
            </div>
            <Reveal delay={160}>
              <p className="text-lg leading-relaxed text-on-surface-variant">
                Onboarding de clientes, screening de sanções e PEP e aprovações com quatro olhos, num só fluxo. A interface
                orienta o analista e explica porque é que algo está bloqueado.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href={signupHref} className={primaryBtn}>
                  Experimentar
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
                <a href="#como-funciona" className={tonalBtn}>
                  Ver como funciona
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal delay={220} className="mt-14">
            <div className="rounded-[2rem] bg-primary-container/60 p-3 sm:p-6 lg:p-10">
              <HeroPreview />
            </div>
          </Reveal>

          <Reveal delay={120}>
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-on-surface-variant">
              {["Bancos", "Instituições financeiras não bancárias", "Seguradoras", "Casas de câmbio"].map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Reveal>
        </section>

        {/* MÓDULOS */}
        <section id="modulos" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 sm:px-6">
          <SectionHeading
            index="01 · Módulos"
            title="O trabalho da equipa de conformidade, sem saltar entre ferramentas"
            text="Cada módulo parte de uma tarefa real de analistas, supervisores e auditores."
          />
          <div className="grid gap-4 md:grid-cols-6">
            <Reveal className="md:col-span-4 md:row-span-2">
              <Module
                icon={Workflow}
                title="Onboarding KYC como processo"
                text="Rascunho, pendente de documentos, em análise, aprovado ou rejeitado. Cada estado tem a sua interface, as secções bloqueiam-se quando o processo avança e cada transição segue regras explícitas."
                className="bg-surface-container/60"
              >
                <ul className="mt-6 grid gap-2.5 text-sm text-on-surface sm:grid-cols-2">
                  {[
                    "Documentos obrigatórios por tipo de cliente",
                    "Screening automático ao submeter",
                    "Bloqueios explicados, não escondidos",
                    "Proteção contra decisões concorrentes",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-tertiary" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
                <ol className="mt-auto flex flex-wrap gap-2 pt-8 text-xs">
                  {["Rascunho", "Pendente", "Em análise", "Aprovado", "Rejeitado"].map((s, i) => (
                    <li
                      key={s}
                      className={cn(
                        "rounded-full px-3 py-1.5",
                        i === 2
                          ? "bg-primary-container font-medium text-on-primary-container"
                          : i === 3
                            ? "bg-emerald-100 text-emerald-900"
                            : i === 4
                              ? "bg-red-100 text-red-900"
                              : "bg-surface text-on-surface-variant ring-1 ring-inset ring-outline-variant",
                      )}
                    >
                      {s}
                    </li>
                  ))}
                </ol>
              </Module>
            </Reveal>
            <Reveal className="md:col-span-2" delay={80}>
              <Module
                icon={Radar}
                title="Screening de sanções e PEP"
                text="Cliente, sócios e entidades vinculadas verificados contra ONU, OFAC, UE e PEP, com grau de correspondência."
              />
            </Reveal>
            <Reveal className="md:col-span-2" delay={160}>
              <Module
                icon={Scale}
                title="Risco explicável"
                text="Cada ponto de risco tem um motivo visível. Risco alto exige aprovação do Gestor de Compliance."
              />
            </Reveal>
            <Reveal className="md:col-span-2">
              <Module
                icon={Users}
                title="Segregação de funções"
                text="Quem cria não decide; quem carrega um documento não o valida. Cada perfil vê o que lhe compete."
              />
            </Reveal>
            <Reveal className="md:col-span-2" delay={80}>
              <Module
                icon={FileClock}
                title="Audit trail imutável"
                text="Registo append-only protegido na própria base de dados, filtrável e exportável em CSV."
              />
            </Reveal>
            <Reveal className="md:col-span-2" delay={160}>
              <Module
                icon={Newspaper}
                title="Mídia adversa"
                text="Notícias negativas tratadas como alertas com categoria própria, na lista interna da instituição."
              />
            </Reveal>
            <Reveal className="md:col-span-3">
              <Module
                icon={BellRing}
                soon
                title="Alertas com SLA"
                text="Prazos de decisão por gravidade e escalonamento quando um alerta fica parado."
              />
            </Reveal>
            <Reveal className="md:col-span-3" delay={80}>
              <Module
                icon={Gauge}
                soon
                title="Monitorização contínua"
                text="Novo screening da carteira aprovada sempre que as listas oficiais são atualizadas."
              />
            </Reveal>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 sm:px-6">
          <SectionHeading
            index="02 · Como funciona"
            title="Do primeiro documento à decisão auditada"
            text="Quatro etapas, com a pessoa certa a agir em cada uma."
          />
          <ol className="grid overflow-hidden rounded-3xl border border-outline-variant bg-surface md:grid-cols-4">
            {[
              { icon: ClipboardCheck, title: "Recolher", who: "Analista", text: "Dados do cliente, sócios, beneficiários efetivos, vínculos e documentos obrigatórios." },
              { icon: Radar, title: "Verificar", who: "Automático", text: "Screening contra listas e risco recalculado a cada alteração relevante." },
              { icon: Scale, title: "Decidir", who: "Supervisor ou Gestor", text: "Alertas e aprovação com justificação, dupla confirmação e quatro olhos." },
              { icon: FileClock, title: "Auditar", who: "Auditor", text: "Histórico completo e imutável de cada ação, pronto para exportar." },
            ].map((step, i) => (
              <Reveal
                as="li"
                key={step.title}
                delay={i * 90}
                className="border-outline-variant p-6 not-last:border-b md:not-last:border-r md:not-last:border-b-0 lg:p-7"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-on-surface-variant tabular-nums">0{i + 1}</span>
                  <step.icon className="size-5 text-primary" aria-hidden />
                </div>
                <h3 className="mt-8 text-xl font-normal text-on-surface">{step.title}</h3>
                <p className="mt-1 text-xs font-medium text-primary">{step.who}</p>
                <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{step.text}</p>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* CONFIANÇA */}
        <section id="seguranca" className="scroll-mt-20 py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <SectionHeading
              index="03 · Confiança"
              title="Controlos que não dependem de boa vontade"
              text="As regras são aplicadas no servidor e na base de dados. Esconder um botão não é segurança."
            />
            <div className="grid gap-px overflow-hidden rounded-3xl bg-outline-variant sm:grid-cols-2 lg:grid-cols-4">
              {metrics.map((m, i) => (
                <Reveal key={m.label} delay={i * 80} className="bg-surface p-6 lg:p-7">
                  <p className="text-5xl font-light tracking-tight text-on-surface tabular-nums">
                    <CountUp value={m.value} suffix={m.suffix} />
                  </p>
                  <p className="mt-4 text-sm font-medium text-on-surface">{m.label}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">{m.detail}</p>
                </Reveal>
              ))}
            </div>

            <Reveal className="mt-4">
              <ul className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
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
                      className="flex items-center gap-3 rounded-2xl bg-surface-container/70 px-4 py-3.5 text-on-surface"
                    >
                      <I className="size-4 shrink-0 text-tertiary" aria-hidden />
                      {text as string}
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="mx-auto max-w-6xl px-5 pt-8 pb-20 sm:px-6">
          <Reveal>
            <div className="grid gap-8 rounded-[2rem] bg-primary-container p-8 text-on-primary-container sm:p-12 md:grid-cols-[1.4fr_1fr] md:items-end">
              <h2 className="text-3xl leading-tight font-normal tracking-tight sm:text-4xl">
                Compliance não é burocracia digitalizada. É gestão de risco.
              </h2>
              <div>
                <p className="opacity-80">
                  Percorra o fluxo completo com as contas de demonstração ou crie a sua conta de analista.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={signupHref} className={primaryBtn}>
                    Criar conta
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                  <Link
                    href="/entrar"
                    className={cn("inline-flex h-11 items-center rounded-full bg-surface px-6 text-sm font-medium text-primary transition hover:shadow-elevation-1", focusRing)}
                  >
                    Entrar
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* RODAPÉ */}
      <footer className="border-t border-outline-variant bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-6 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <BrandMark />
            <p className="mt-4 max-w-xs text-sm text-on-surface-variant">
              KYC, AML e gestão de risco para instituições financeiras bancárias e não bancárias.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Audit trail append-only", "CSP com nonce", "Quatro olhos", "Código aberto · MIT"].map((seal) => (
                <span
                  key={seal}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1 text-[11px] text-on-surface-variant"
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
              <p className="text-sm font-medium text-on-surface">{col.title}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map(([href, label]) => (
                  <li key={label}>
                    {href.startsWith("http") ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-on-surface-variant transition hover:text-on-surface"
                      >
                        {label === "Código no GitHub" && <Code2 className="size-3.5" aria-hidden />}
                        {label}
                      </a>
                    ) : (
                      <Link href={href} className="text-on-surface-variant transition hover:text-on-surface">
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="border-t border-outline-variant">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-6 text-xs text-on-surface-variant sm:px-6 md:flex-row md:items-center md:justify-between">
            <p>© {new Date().getFullYear()} Compliance Prime · Madrugada de Carvalho</p>
            <p className="max-w-xl md:text-right">
              Projeto de demonstração. Listas de vigilância e clientes são fictícios. Não constitui aconselhamento jurídico ou
              regulatório.
            </p>
            <div className="sm:hidden">
              <ThemeToggle initial={theme} />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
