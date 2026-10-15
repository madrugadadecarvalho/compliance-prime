import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-brand-950 p-10 text-brand-50 lg:flex">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="size-6" aria-hidden /> Compliance Prime
        </Link>
        <div className="max-w-md space-y-4">
          <p className="text-2xl font-semibold leading-snug text-white">
            Compliance não é burocracia digitalizada. É gestão de risco — e a interface é parte do controlo.
          </p>
          <ul className="space-y-2 text-sm text-brand-100">
            <li>• Onboarding KYC com estados reais e transições explícitas</li>
            <li>• Alertas de sanções e PEP tratados como decisões</li>
            <li>• Segregação de funções e princípio dos quatro olhos</li>
            <li>• Trilha de auditoria imutável, legível para auditores</li>
          </ul>
        </div>
        <p className="text-xs text-brand-100/70">Projeto de demonstração · dados fictícios</p>
      </aside>
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
