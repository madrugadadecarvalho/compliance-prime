"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { signUpSchema, type FieldErrors } from "@/lib/validation";
import { Button, Notice } from "@/components/ui";
import { TextInput } from "@/components/forms";

export function SignUpForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const parsed = signUpSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors as FieldErrors);
      return;
    }
    setErrors({});
    setPending(true);
    const { name, email, password } = parsed.data;
    const { error } = await authClient.signUp.email({ name, email, password });
    setPending(false);
    if (error) {
      setMessage(
        error.status === 429
          ? "Demasiadas tentativas. Tente novamente mais tarde."
          : (error.message ?? "Não foi possível criar a conta."),
      );
      return;
    }
    router.replace("/painel");
    router.refresh();
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="space-y-4">
      <TextInput label="Nome completo" name="name" autoComplete="name" errors={errors} required maxLength={80} />
      <TextInput label="E-mail" name="email" type="email" autoComplete="email" errors={errors} required />
      <TextInput
        label="Palavra-passe"
        name="password"
        type="password"
        autoComplete="new-password"
        errors={errors}
        required
        hint="Mín. 12 caracteres, com maiúsculas, minúsculas, números e símbolos."
      />
      <TextInput
        label="Confirmar palavra-passe"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        errors={errors}
        required
      />
      {message && <Notice tone="red">{message}</Notice>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "A criar conta…" : "Criar conta"}
      </Button>
    </form>
  );
}
