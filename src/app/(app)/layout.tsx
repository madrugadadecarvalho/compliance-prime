import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requireUser } from "@/server/session";
import { can, ROLE_LABEL } from "@/lib/permissions";
import { Badge } from "@/components/ui";
import { NavLinks } from "./nav-links";
import { SignOutButton } from "./sign-out-button";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  const links = [
    { href: "/painel", label: "Painel", icon: "dashboard" as const, show: true },
    { href: "/clientes", label: "Clientes (KYC)", icon: "clients" as const, show: can(user.role, "client:view") },
    { href: "/alertas", label: "Alertas AML", icon: "alerts" as const, show: can(user.role, "alert:view") },
    { href: "/auditoria", label: "Trilha de auditoria", icon: "audit" as const, show: can(user.role, "audit:view") },
    { href: "/admin/utilizadores", label: "Utilizadores", icon: "users" as const, show: can(user.role, "users:manage") },
  ].filter((l) => l.show);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-slate-200 bg-brand-950 text-brand-50 lg:sticky lg:top-0 lg:h-screen lg:border-b-0">
        <div className="flex items-center justify-between px-5 py-4 lg:block">
          <Link href="/painel" className="flex items-center gap-2 font-semibold text-white">
            <ShieldCheck className="size-5" aria-hidden /> Compliance Prime
          </Link>
        </div>
        <NavLinks links={links.map(({ href, label, icon }) => ({ href, label, icon }))} />
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-end gap-3 border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <Badge tone="blue">{ROLE_LABEL[user.role]}</Badge>
          <SignOutButton />
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
