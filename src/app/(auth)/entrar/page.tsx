import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/session";
import { env } from "@/lib/env";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function SignInPage({ searchParams }: PageProps<"/entrar">) {
  if (await getCurrentUser()) redirect("/painel");
  const { next } = await searchParams;
  // Só aceita caminhos internos, para evitar open redirects.
  const safeNext = typeof next === "string" && /^\/(?!\/)[\w\-/]*$/.test(next) ? next : "/painel";

  return (
    <div>
      <h1 className="text-[2rem] leading-tight font-normal tracking-tight">Entrar</h1>
      <p className="mt-1 text-sm text-slate-600">Aceda à sua área de trabalho de compliance.</p>
      <div className="mt-6">
        <SignInForm next={safeNext} />
      </div>
      {env.ALLOW_SIGNUP && (
        <p className="mt-6 text-sm text-slate-600">
          Ainda não tem conta?{" "}
          <Link href="/registar" className="font-medium text-primary hover:underline">
            Registar
          </Link>
        </p>
      )}
    </div>
  );
}
