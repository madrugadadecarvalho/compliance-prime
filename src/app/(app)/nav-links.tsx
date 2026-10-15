"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing, FileClock, LayoutGrid, UserCog, Users } from "lucide-react";
import { cn } from "@/components/ui";

const ICONS = {
  dashboard: LayoutGrid,
  clients: Users,
  alerts: BellRing,
  audit: FileClock,
  users: UserCog,
};

export function NavLinks({ links }: { links: { href: string; label: string; icon: keyof typeof ICONS }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação principal" className="flex gap-1 overflow-x-auto px-3 pb-2 lg:flex-col lg:px-4 lg:pb-0">
      {links.map((link) => {
        const Icon = ICONS[link.icon];
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 shrink-0 items-center gap-3 rounded-full px-4 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-primary",
              active
                ? "bg-primary-container font-medium text-on-primary-container"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
            )}
          >
            <Icon className="size-[1.1rem]" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
