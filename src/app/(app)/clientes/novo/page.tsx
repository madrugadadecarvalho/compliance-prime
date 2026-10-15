import type { Metadata } from "next";
import { requirePermission } from "@/server/session";
import { createClientAction } from "@/server/actions/clients";
import { PageHeader } from "@/components/ui";
import { ClientForm } from "../client-form";

export const metadata: Metadata = { title: "Novo onboarding" };

export default async function NewClientPage() {
  await requirePermission("client:create");
  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow="Novo processo"
        title="Novo onboarding"
        description="O processo é criado em rascunho. Sócios, vínculos e documentos são adicionados a seguir, antes de submeter para análise."
      />
      <ClientForm action={createClientAction} submitLabel="Criar rascunho" cancelHref="/clientes" />
    </div>
  );
}
