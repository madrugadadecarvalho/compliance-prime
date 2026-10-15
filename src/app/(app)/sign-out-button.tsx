"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Terminar sessão"
      title="Terminar sessão"
      className="grid size-8 place-items-center rounded-full text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface focus-visible:outline-2 focus-visible:outline-primary"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/entrar");
        router.refresh();
      }}
    >
      <LogOut className="size-4" aria-hidden />
    </button>
  );
}
