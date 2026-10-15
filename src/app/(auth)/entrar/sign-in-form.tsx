"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { signInSchema, type FieldErrors } from "@/lib/validation";
import { Button, Notice } from "@/components/ui";
import { TextInput } from "@/components/forms";

export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const parsed = signInSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors as FieldErrors);
      return;
    }
    setErrors({});
    setPending(true);
    const { error } = await authClient.signIn.email({ ...parsed.data, rememberMe: false });
    setPending(false);
    if (error) {
      // Mensagem genérica: não revelar se o e-mail existe.
      setMessage(
        error.status === 429
          ? "Demasiadas tentativas. Aguarde um minuto e tente novamente."
          : error.status === 403
            ? (error.message ?? "Conta desativada.")
            : "E-mail ou palavra-passe incorretos.",
      );
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="space-y-4">
      <TextInput label="E-mail" name="email" type="email" autoComplete="username" errors={errors} required />
      <TextInput
        label="Palavra-passe"
        name="password"
        type="password"
        autoComplete="current-password"
        errors={errors}
        required
      />
      {message && <Notice tone="red">{message}</Notice>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "A entrar…" : "Entrar"}
      </Button>
    </form>
  );
}
