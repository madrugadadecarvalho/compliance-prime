import Link from "next/link";
import { BellRing, FileClock, Scale, Workflow } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { getTheme } from "@/lib/theme";

const POINTS = [
  { icon: Workflow, text: "Onboarding com estados reais e transições explícitas" },
  { icon: BellRing, text: "Alertas de sanções e PEP tratados como decisões" },
  { icon: Scale, text: "Segregação de funções e princípio dos quatro olhos" },
  { icon: FileClock, text: "Trilha de auditoria imutável, legível para auditores" },
];

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const theme = await getTheme();
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:p-3">
      <aside className="hidden flex-col justify-between rounded-[1.75rem] bg-primary-container p-10 text-on-primary-container lg:flex">
        <Link href="/" className="w-fit rounded-full focus-visible:outline-2 focus-visible:outline-primary">
          <BrandMark />
        </Link>
        <div className="max-w-md">
          <p className="text-[1.75rem] leading-snug font-normal tracking-tight">
            Compliance não é burocracia digitalizada. É gestão de risco, e a interface faz parte do controlo.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface/70">
                  <Icon className="size-4" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs opacity-70">Projeto de demonstração · dados fictícios</p>
      </aside>
      <main className="flex flex-col p-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="rounded-full lg:invisible">
            <BrandMark compact />
          </Link>
          <ThemeToggle initial={theme} />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>
    </div>
  );
}
