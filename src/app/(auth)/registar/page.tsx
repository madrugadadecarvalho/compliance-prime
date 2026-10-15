import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/server/session";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Registar" };

export default async function SignUpPage() {
  if (!env.ALLOW_SIGNUP) notFound();
  if (await getCurrentUser()) redirect("/painel");
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Criar conta</h1>
      <p className="mt-1 text-sm text-slate-600">
        Novas contas entram com o perfil <strong>Analista</strong>. Outros perfis são atribuídos por um Gestor de
        Compliance.
      </p>
      <div className="mt-6">
        <SignUpForm />
      </div>
      <p className="mt-6 text-sm text-slate-600">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-medium text-brand-700 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
