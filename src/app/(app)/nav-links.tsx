"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing, FileClock, LayoutDashboard, UserCog, Users } from "lucide-react";
import { cn } from "@/components/ui";

const ICONS = {
  dashboard: LayoutDashboard,
  clients: Users,
  alerts: BellRing,
  audit: FileClock,
  users: UserCog,
};

export function NavLinks({ links }: { links: { href: string; label: string; icon: keyof typeof ICONS }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação principal" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
      {links.map((link) => {
        const Icon = ICONS[link.icon];
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm transition",
              active ? "bg-white/10 font-medium text-white" : "text-brand-100 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
