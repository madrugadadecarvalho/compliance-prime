"use client";

import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/components/ui";

export type Theme = "light" | "dark" | "system";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Tema claro", icon: Sun },
  { value: "dark", label: "Tema escuro", icon: Moon },
  { value: "system", label: "Seguir o sistema", icon: Monitor },
];

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = `theme=${theme}; path=/; max-age=31536000; samesite=lax${secure}`;
}

/**
 * Alterna o tema sem recarregar a página. A escolha fica num cookie para que o
 * servidor já renderize o atributo data-theme certo (sem flash e sem script inline,
 * o que mantém a CSP estrita).
 */
export function ThemeToggle({ initial, className }: { initial: Theme; className?: string }) {
  const [theme, setTheme] = useState<Theme>(initial);

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className={cn("inline-flex items-center gap-0.5 rounded-full bg-surface-container p-0.5", className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => choose(value)}
            className={cn(
              "grid size-7 place-items-center rounded-full transition focus-visible:outline-2 focus-visible:outline-primary",
              active
                ? "bg-surface text-on-surface shadow-elevation-1"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
