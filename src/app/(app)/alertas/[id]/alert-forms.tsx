"use client";

import { alertDecisionSchema, alertOpinionSchema } from "@/lib/validation";
import { alertOpinionAction, decideAlertAction } from "@/server/actions/alerts";
import { ConfirmActionForm, FormMessage, SelectInput, SubmitButton, TextArea, useValidatedAction } from "@/components/forms";

export function AlertOpinionForm({ alertId }: { alertId: string }) {
  const { state, formAction, errors, onSubmit, values } = useValidatedAction(alertOpinionAction, alertOpinionSchema);
  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-3">
      <input type="hidden" name="alertId" value={alertId} />
      <TextArea
        label="Registar parecer"
        name="opinion"
        errors={errors}
        rows={4}
        required
        maxLength={1000}
        defaultValue={values.opinion}
        hint="Descreva a análise: elementos que confirmam ou afastam a correspondência (data de nascimento, nacionalidade, documentos)."
      />
      <FormMessage state={state} />
      <SubmitButton variant="secondary">Guardar parecer</SubmitButton>
    </form>
  );
}

export function AlertDecisionForm({ alertId, isSanction }: { alertId: string; isSanction: boolean }) {
  return (
    <ConfirmActionForm
      action={decideAlertAction}
      schema={alertDecisionSchema}
      hidden={{ alertId }}
      triggerLabel="Decidir alerta"
      title="Decisão sobre o alerta"
      variant="primary"
      confirmLabel="Registar decisão"
      impact={
        isSanction ? (
          <>
            <strong>Alerta de sanções.</strong> Se confirmar a correspondência, o processo deixa de poder ser aprovado e
            terá de ser rejeitado. Se o encerrar como falso positivo, a justificação deve explicar porque não se trata
            da mesma pessoa/entidade.
          </>
        ) : (
          "A decisão recalcula o risco do cliente e fica registada na trilha de auditoria."
        )
      }
      extraFields={(errors, prefix) => (
        <SelectInput
          label="Decisão"
          name="decision"
          id={`${prefix}-decision`}
          errors={errors}
          required
          options={[
            ["FALSO_POSITIVO", "Falso positivo — não é a mesma pessoa/entidade"],
            ["CONFIRMADO", "Correspondência confirmada"],
          ]}
        />
      )}
    />
  );
}
