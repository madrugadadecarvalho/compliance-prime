import Link from "next/link";
import { requireUser } from "@/server/session";
import { can, ROLE_LABEL } from "@/lib/permissions";
import { getTheme } from "@/lib/theme";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandMark } from "@/components/brand";
import { NavLinks } from "./nav-links";
import { SignOutButton } from "./sign-out-button";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [user, theme] = await Promise.all([requireUser(), getTheme()]);

  const links = [
    { href: "/painel", label: "Painel", icon: "dashboard" as const, show: true },
    { href: "/clientes", label: "Clientes", icon: "clients" as const, show: can(user.role, "client:view") },
    { href: "/alertas", label: "Alertas AML", icon: "alerts" as const, show: can(user.role, "alert:view") },
    { href: "/auditoria", label: "Auditoria", icon: "audit" as const, show: can(user.role, "audit:view") },
    { href: "/admin/utilizadores", label: "Utilizadores", icon: "users" as const, show: can(user.role, "users:manage") },
  ].filter((l) => l.show);

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16.5rem_1fr]">
      <aside className="flex flex-col bg-background lg:sticky lg:top-0 lg:h-screen">
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 lg:px-6 lg:pt-6 lg:pb-5">
          <Link href="/painel" className="rounded-full focus-visible:outline-2 focus-visible:outline-primary">
            <BrandMark />
          </Link>
          <div className="lg:hidden">
            <ThemeToggle initial={theme} />
          </div>
        </div>
        <NavLinks links={links.map(({ href, label, icon }) => ({ href, label, icon }))} />
        <div className="mt-auto hidden items-center justify-between gap-2 px-6 py-5 lg:flex">
          <span className="text-xs text-on-surface-variant">Aparência</span>
          <ThemeToggle initial={theme} />
        </div>
      </aside>

      <div className="min-w-0 lg:py-2 lg:pr-2">
        <div className="min-h-full bg-surface-dim/60 lg:min-h-[calc(100vh-1rem)] lg:rounded-[1.75rem] lg:bg-surface-container/70">
          <header className="flex items-center justify-end gap-3 px-5 pt-4 sm:px-8 lg:pt-5">
            <div className="flex items-center gap-3 rounded-full bg-surface py-1 pr-1 pl-1 shadow-elevation-1">
              <span
                className="grid size-8 place-items-center rounded-full bg-primary-container text-xs font-semibold text-on-primary-container"
                aria-hidden
              >
                {initials}
              </span>
              <div className="hidden min-w-0 pr-1 sm:block">
                <p className="truncate text-sm leading-tight font-medium text-on-surface">{user.name}</p>
                <p className="truncate text-xs leading-tight text-on-surface-variant">{ROLE_LABEL[user.role]}</p>
              </div>
              <SignOutButton />
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-5 pt-4 pb-12 sm:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
