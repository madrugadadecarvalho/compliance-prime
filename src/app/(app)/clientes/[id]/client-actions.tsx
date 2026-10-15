"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { COUNTRIES } from "@/lib/countries";
import {
  type ActionState,
  clientLinkSchema,
  decisionSchema,
  documentUploadSchema,
  relatedPartySchema,
  returnSchema,
  ALLOWED_MIME,
} from "@/lib/validation";
import {
  addLinkAction,
  addRelatedPartyAction,
  approveClientAction,
  rejectClientAction,
  returnClientAction,
  submitClientAction,
} from "@/server/actions/clients";
import { reviewDocumentAction, uploadDocumentAction } from "@/server/actions/documents";
import { Button, Notice } from "@/components/ui";
import {
  Checkbox,
  ConfirmActionForm,
  FormMessage,
  SelectInput,
  SubmitButton,
  TextArea,
  TextInput,
  useValidatedAction,
} from "@/components/forms";
import { DOCUMENT_LABEL, PARTY_ROLE_LABEL } from "./labels";

/** Limpa o formulário depois de uma ação bem-sucedida. */
function useResetOnSuccess(state: ActionState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

export function SubmitProcessForm({
  clientId,
  version,
  missingCount,
}: {
  clientId: string;
  version: number;
  missingCount: number;
}) {
  const [state, formAction] = useActionState(submitClientAction, {});
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="version" value={version} />
      <SubmitButton pendingLabel="A executar screening…">
        {missingCount > 0 ? "Submeter (ficará pendente de documentos)" : "Submeter para análise"}
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function DecisionButtons({
  clientId,
  version,
  approve,
  reject,
  returnable,
  riskLabel,
}: {
  clientId: string;
  version: number;
  approve: { allowed: boolean; reason?: string };
  reject: { allowed: boolean; reason?: string };
  returnable: { allowed: boolean; reason?: string };
  riskLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {returnable.allowed && (
        <ConfirmActionForm
          action={returnClientAction}
          schema={returnSchema}
          hidden={{ clientId, version }}
          triggerLabel="Devolver ao analista"
          title="Devolver processo"
          impact="O processo volta a “Pendente de documentos” e fica novamente editável pelo analista. Indique o que deve ser corrigido."
          confirmLabel="Devolver"
          variant="secondary"
          requireConfirmationWord={false}
        />
      )}
      {reject.allowed && (
        <ConfirmActionForm
          action={rejectClientAction}
          schema={decisionSchema}
          hidden={{ clientId, version }}
          triggerLabel="Rejeitar cliente"
          title="Rejeitar cliente"
          impact={
            <>
              Esta decisão <strong>fecha o processo</strong> e não pode ser revertida. Fica registada com o seu nome,
              perfil, data/hora e justificação na trilha de auditoria.
            </>
          }
          confirmLabel="Rejeitar definitivamente"
          variant="danger"
        />
      )}
      {approve.allowed && (
        <ConfirmActionForm
          action={approveClientAction}
          schema={decisionSchema}
          hidden={{ clientId, version }}
          triggerLabel="Aprovar cliente"
          title="Aprovar cliente"
          impact={
            <>
              Vai aprovar um cliente com <strong>{riskLabel.toLowerCase()}</strong>. A decisão fecha o processo e fica
              registada com a sua justificação. Confirme que reviu os documentos, os alertas e as partes relacionadas.
            </>
          }
          confirmLabel="Aprovar"
          variant="success"
        />
      )}
    </div>
  );
}

export function AddPartyForm({ clientId }: { clientId: string }) {
  const { state, formAction, errors, onSubmit } = useValidatedAction(addRelatedPartyAction, relatedPartySchema);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={formAction} onSubmit={onSubmit} noValidate className="space-y-3 rounded-md bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-800">Adicionar sócio, administrador ou beneficiário efetivo</p>
      <input type="hidden" name="clientId" value={clientId} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <TextInput label="Nome completo" name="fullName" errors={errors} required maxLength={160} />
        <SelectInput label="Função" name="role" errors={errors} options={Object.entries(PARTY_ROLE_LABEL)} required />
        <TextInput label="% de participação" name="ownershipPercentage" inputMode="decimal" errors={errors} />
        <SelectInput label="Nacionalidade" name="nationality" errors={errors} options={COUNTRIES} required />
        <TextInput label="N.º documento" name="documentNumber" errors={errors} maxLength={30} />
        <div className="flex items-end pb-2">
          <Checkbox label="É PEP" name="isPep" />
        </div>
      </div>
      <FormMessage state={state} />
      <SubmitButton variant="secondary">Adicionar</SubmitButton>
    </form>
  );
}

export function AddLinkForm({ clientId }: { clientId: string }) {
  const { state, formAction, errors, onSubmit } = useValidatedAction(addLinkAction, clientLinkSchema);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={formAction} onSubmit={onSubmit} noValidate className="space-y-3 rounded-md bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-800">Adicionar vínculo</p>
      <input type="hidden" name="clientId" value={clientId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput label="Entidade relacionada" name="entityName" errors={errors} required maxLength={160} />
        <TextInput
          label="Tipo de vínculo"
          name="relationType"
          errors={errors}
          required
          maxLength={80}
          placeholder="Ex.: grupo económico, familiar de PEP, contraparte"
        />
        <TextArea label="Descrição" name="description" errors={errors} className="sm:col-span-2" rows={2} maxLength={400} />
      </div>
      <FormMessage state={state} />
      <SubmitButton variant="secondary">Adicionar</SubmitButton>
    </form>
  );
}

export function UploadDocumentForm({ clientId, suggested }: { clientId: string; suggested?: string }) {
  const { state, formAction, errors, onSubmit } = useValidatedAction(uploadDocumentAction, documentUploadSchema);
  const ref = useResetOnSuccess(state);
  return (
    <form
      ref={ref}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="space-y-3 rounded-md bg-slate-50 p-4"
    >
      <p className="text-sm font-medium text-slate-800">Carregar documento</p>
      <input type="hidden" name="clientId" value={clientId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectInput
          label="Tipo de documento"
          name="type"
          errors={errors}
          options={Object.entries(DOCUMENT_LABEL)}
          defaultValue={suggested}
          required
        />
        <TextInput
          label="Ficheiro"
          name="file"
          type="file"
          accept={ALLOWED_MIME.join(",")}
          errors={errors}
          required
          hint="PDF, PNG ou JPEG até 5 MB. O conteúdo é verificado no servidor."
          className="[&_input]:py-1.5"
        />
      </div>
      <FormMessage state={state} />
      <SubmitButton variant="secondary" pendingLabel="A carregar…">
        Carregar
      </SubmitButton>
    </form>
  );
}

export function ReviewDocumentButtons({ documentId }: { documentId: string }) {
  const [state, formAction] = useActionState(reviewDocumentAction, {});
  const rejectRef = useRef<HTMLDialogElement>(null);
  const noteId = useId();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={formAction}>
        <input type="hidden" name="documentId" value={documentId} />
        <input type="hidden" name="status" value="VALIDADO" />
        <Button type="submit" variant="success" className="px-2.5 py-1 text-xs">
          Validar
        </Button>
      </form>
      <Button type="button" variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => rejectRef.current?.showModal()}>
        Rejeitar
      </Button>
      <dialog ref={rejectRef} className="m-auto w-full max-w-md rounded-lg p-0 shadow-xl backdrop:bg-slate-900/50">
        <form action={formAction} className="space-y-4 p-6" onSubmit={() => rejectRef.current?.close()}>
          <h2 className="text-lg font-semibold">Rejeitar documento</h2>
          <input type="hidden" name="documentId" value={documentId} />
          <input type="hidden" name="status" value="REJEITADO" />
          <TextArea label="Motivo" name="note" id={noteId} errors={state.errors ?? {}} required rows={3} maxLength={400} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => rejectRef.current?.close()}>
              Cancelar
            </Button>
            <SubmitButton variant="danger">Rejeitar</SubmitButton>
          </div>
        </form>
      </dialog>
      {state.message && !state.ok && <Notice tone="red">{state.message}</Notice>}
      {state.errors?.note && <span className="text-xs text-red-700">{state.errors.note[0]}</span>}
    </div>
  );
}
