"use client";

import Link from "next/link";
import { COUNTRIES } from "@/lib/countries";
import { clientSchema, type ActionState } from "@/lib/validation";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { Checkbox, FormMessage, SelectInput, SubmitButton, TextArea, TextInput, useValidatedAction } from "@/components/forms";

type Defaults = Partial<Record<string, string | boolean | null>>;

const TYPES = [
  ["PESSOA_SINGULAR", "Pessoa singular"],
  ["PESSOA_COLETIVA", "Pessoa coletiva (empresa)"],
] as const;

export function ClientForm({
  action,
  defaults = {},
  hidden,
  submitLabel,
  cancelHref,
}: {
  action: (s: ActionState, f: FormData) => Promise<ActionState>;
  defaults?: Defaults;
  hidden?: Record<string, string | number>;
  submitLabel: string;
  cancelHref: string;
}) {
  const { state, formAction, errors, onSubmit, values } = useValidatedAction(action, clientSchema);
  const v = (k: string) => (values[k] ?? (defaults[k] as string | null | undefined)) ?? undefined;

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-6">
      {hidden && Object.entries(hidden).map(([k, val]) => <input key={k} type="hidden" name={k} value={val} />)}
      <FormMessage state={state} />

      <Card>
        <CardHeader title="Identificação" description="Dados do titular ou da entidade." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <SelectInput label="Tipo de cliente" name="type" errors={errors} options={TYPES} defaultValue={v("type")} required />
          <TextInput label="Nome completo / Denominação social" name="fullName" errors={errors} defaultValue={v("fullName")} required maxLength={160} />
          <TextInput label="N.º do documento (BI, passaporte ou registo comercial)" name="documentNumber" errors={errors} defaultValue={v("documentNumber")} required maxLength={30} />
          <TextInput label="NIF" name="taxId" errors={errors} defaultValue={v("taxId")} maxLength={30} />
          <TextInput label="Data de nascimento / constituição" name="birthOrIncorporationDate" type="date" errors={errors} defaultValue={v("birthOrIncorporationDate")} />
          <SelectInput label="Nacionalidade" name="nationality" errors={errors} options={COUNTRIES} defaultValue={v("nationality")} placeholder="—" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Contactos e residência" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <SelectInput label="País de residência / sede" name="country" errors={errors} options={COUNTRIES} defaultValue={v("country") ?? "AO"} required />
          <TextInput label="Morada" name="address" errors={errors} defaultValue={v("address")} required maxLength={240} />
          <TextInput label="E-mail" name="email" type="email" errors={errors} defaultValue={v("email")} />
          <TextInput label="Telefone" name="phone" type="tel" errors={errors} defaultValue={v("phone")} placeholder="+244 9xx xxx xxx" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Perfil financeiro" description="Base para a classificação de risco." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Atividade / profissão" name="activity" errors={errors} defaultValue={v("activity")} required maxLength={160} />
          <TextInput
            label="Volume mensal esperado (Kz)"
            name="expectedMonthlyVolume"
            inputMode="decimal"
            errors={errors}
            defaultValue={v("expectedMonthlyVolume")}
          />
          <TextArea label="Origem dos fundos" name="sourceOfFunds" errors={errors} defaultValue={v("sourceOfFunds")} required className="sm:col-span-2" maxLength={300} />
          <div className="sm:col-span-2">
            <Checkbox
              label="O cliente é Pessoa Politicamente Exposta (PEP)"
              name="isPep"
              defaultChecked={values.isPep ? values.isPep === "on" : Boolean(defaults.isPep)}
              hint="Declaração do cliente. O screening verifica independentemente as listas PEP."
            />
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-end gap-2">
        <Link href={cancelHref} className="rounded-full px-4 py-2 text-sm font-medium text-primary hover:bg-primary-container/40">
          Cancelar
        </Link>
        <SubmitButton pendingLabel="A guardar…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
