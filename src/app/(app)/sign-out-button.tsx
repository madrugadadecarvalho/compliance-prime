"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui";

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      aria-label="Terminar sessão"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/entrar");
        router.refresh();
      }}
    >
      <LogOut className="size-4" aria-hidden />
      <span className="hidden sm:inline">Sair</span>
    </Button>
  );
}
