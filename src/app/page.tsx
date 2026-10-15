import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/server/session";
import { LinkButton } from "@/components/ui";

export default async function Home() {
  if (await getCurrentUser()) redirect("/painel");

  const pillars = [
    ["Onboarding é um processo", "Rascunho, pendente de documentos, em análise, aprovado, rejeitado — cada estado com a sua UI e regras."],
    ["Due diligence sem saltos", "Uma página contínua com secções âncora: entidade, sócios, vínculos, documentos, alertas e histórico."],
    ["Alertas são decisões", "Cada alerta mostra o que foi identificado, de que lista veio, o grau de correspondência e quem pode decidir."],
    ["Segregação de funções", "Analista, Supervisor, Gestor e Auditor veem e aprovam coisas diferentes. Quatro olhos em cada decisão."],
    ["Audit trail imutável", "Quem fez, quando e com que justificação — append-only ao nível da base de dados e exportável."],
    ["Segurança por defeito", "Validação no cliente e no servidor, CSP com nonce, rate limiting, sessões curtas e verificação de ficheiros."],
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2 font-semibold text-brand-900">
          <ShieldCheck className="size-6" aria-hidden /> Compliance Prime
        </span>
        <LinkButton href="/entrar" variant="secondary">
          Entrar
        </LinkButton>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-700">KYC · AML · Gestão de risco</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Compliance não é burocracia digitalizada. É gestão de risco.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600">
          Plataforma de onboarding de clientes, due diligence e screening AML para instituições financeiras bancárias e
          não bancárias — onde a interface guia a decisão do analista em vez de o obrigar a improvisar.
        </p>
        <div className="mt-8 flex gap-3">
          <LinkButton href="/entrar">Entrar na plataforma</LinkButton>
          <Link href="/registar" className="px-3 py-2 text-sm font-medium text-brand-700 hover:underline">
            Criar conta de analista
          </Link>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map(([title, text]) => (
            <div key={title} className="rounded-lg border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900">{title}</h2>
              <p className="mt-2 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
