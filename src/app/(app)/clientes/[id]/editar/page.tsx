import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/server/session";
import { getClientDetail } from "@/server/queries";
import { updateClientAction } from "@/server/actions/clients";
import { isEditable } from "@/lib/workflow";
import { PageHeader } from "@/components/ui";
import { ClientForm } from "../../client-form";

export const metadata: Metadata = { title: "Editar cliente" };

export default async function EditClientPage({ params }: PageProps<"/clientes/[id]/editar">) {
  await requirePermission("client:edit");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const detail = await getClientDetail(id);
  if (!detail) notFound();
  const c = detail.client;
  if (!isEditable(c.status)) redirect(`/clientes/${id}`);

  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow={c.reference} title={`Editar ${c.fullName}`} />
      <ClientForm
        action={updateClientAction}
        hidden={{ clientId: c.id, version: c.version }}
        submitLabel="Guardar alterações"
        cancelHref={`/clientes/${c.id}`}
        defaults={{
          type: c.type,
          fullName: c.fullName,
          documentNumber: c.documentNumber,
          taxId: c.taxId,
          country: c.country,
          nationality: c.nationality,
          birthOrIncorporationDate: c.birthOrIncorporationDate,
          address: c.address,
          email: c.email,
          phone: c.phone,
          activity: c.activity,
          sourceOfFunds: c.sourceOfFunds,
          expectedMonthlyVolume: c.expectedMonthlyVolume,
          isPep: c.isPep,
        }}
      />
    </div>
  );
}
