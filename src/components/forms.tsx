"use client";

import { useActionState, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ZodType } from "zod";
import { z } from "zod";
import { CONFIRMATION_WORD, type ActionState, type FieldErrors } from "@/lib/validation";
import { Button, Field, Notice, inputClass, cn } from "./ui";

type ServerAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Valida no cliente com o mesmo esquema Zod usado no servidor.
 * Se houver erros, o envio é cancelado e os erros aparecem junto aos campos.
 * O servidor volta sempre a validar.
 */
export function useValidatedAction(action: ServerAction, schema?: ZodType, initial: ActionState = {}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!schema) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const result = schema.safeParse(data);
    if (!result.success) {
      event.preventDefault();
      setClientErrors(z.flattenError(result.error).fieldErrors as FieldErrors);
      const first = event.currentTarget.querySelector<HTMLElement>("[aria-invalid='true']");
      first?.focus();
    } else {
      setClientErrors(null);
    }
  };

  const errors = clientErrors ?? state.errors ?? {};
  return { state, formAction, pending, errors, onSubmit, values: state.values ?? {} };
}

export function SubmitButton({
  children,
  variant = "primary",
  pendingLabel = "A processar…",
  disabled,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "success";
  pendingLabel?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending || disabled} aria-disabled={pending || disabled}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return <Notice tone={state.ok ? "green" : "red"}>{state.message}</Notice>;
}

export function TextInput({
  label,
  name,
  id,
  errors,
  defaultValue,
  required,
  hint,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "defaultValue"> & {
  label: string;
  name: string;
  errors: FieldErrors;
  defaultValue?: string | number | null;
  hint?: string;
}) {
  const err = errors[name];
  const fieldId = id ?? name;
  return (
    <Field label={label} name={name} id={fieldId} error={err} hint={hint} required={required} className={className}>
      <input
        id={fieldId}
        name={name}
        defaultValue={defaultValue ?? undefined}
        required={required}
        aria-invalid={err?.length ? true : undefined}
        aria-describedby={err?.length ? `${fieldId}-error` : undefined}
        className={inputClass}
        {...props}
      />
    </Field>
  );
}

export function SelectInput({
  label,
  name,
  id,
  errors,
  options,
  defaultValue,
  required,
  placeholder = "Selecione…",
  className,
  hint,
}: {
  label: string;
  name: string;
  id?: string;
  errors: FieldErrors;
  options: readonly (readonly [string, string])[];
  defaultValue?: string | null;
  required?: boolean;
  placeholder?: string;
  className?: string;
  hint?: string;
}) {
  const err = errors[name];
  const fieldId = id ?? name;
  return (
    <Field label={label} name={name} id={fieldId} error={err} required={required} className={className} hint={hint}>
      <select
        id={fieldId}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        aria-invalid={err?.length ? true : undefined}
        aria-describedby={err?.length ? `${fieldId}-error` : undefined}
        className={inputClass}
      >
        <option value="">{placeholder}</option>
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function TextArea({
  label,
  name,
  id,
  errors,
  defaultValue,
  required,
  rows = 3,
  hint,
  className,
  maxLength,
}: {
  label: string;
  name: string;
  id?: string;
  errors: FieldErrors;
  defaultValue?: string | null;
  required?: boolean;
  rows?: number;
  hint?: string;
  className?: string;
  maxLength?: number;
}) {
  const err = errors[name];
  const fieldId = id ?? name;
  return (
    <Field label={label} name={name} id={fieldId} error={err} required={required} hint={hint} className={className}>
      <textarea
        id={fieldId}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? undefined}
        required={required}
        maxLength={maxLength}
        aria-invalid={err?.length ? true : undefined}
        aria-describedby={err?.length ? `${fieldId}-error` : undefined}
        className={inputClass}
      />
    </Field>
  );
}

export function Checkbox({
  label,
  name,
  id,
  defaultChecked,
  hint,
}: {
  label: string;
  name: string;
  id?: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <input
        id={id ?? name}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 rounded border-outline accent-[var(--primary)]"
      />
      <label htmlFor={id ?? name} className="text-sm text-slate-800">
        {label}
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </label>
    </div>
  );
}

/**
 * Ação sensível com dupla confirmação:
 * 1) o utilizador abre o diálogo e lê o impacto;
 * 2) escreve uma justificação (mín. 20 caracteres);
 * 3) escreve a palavra de confirmação.
 * O servidor valida novamente a justificação e a palavra.
 */
export function ConfirmActionForm({
  action,
  hidden,
  triggerLabel,
  title,
  impact,
  confirmLabel,
  variant = "primary",
  requireConfirmationWord = true,
  extraFields,
  schema,
}: {
  action: ServerAction;
  hidden: Record<string, string | number>;
  triggerLabel: string;
  title: string;
  impact: ReactNode;
  confirmLabel: string;
  variant?: "primary" | "danger" | "success" | "secondary";
  requireConfirmationWord?: boolean;
  extraFields?: (errors: FieldErrors, idPrefix: string) => ReactNode;
  schema?: ZodType;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const prefix = useId();
  const { state, formAction, errors, onSubmit, values } = useValidatedAction(action, schema);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (state.ok) {
      dialogRef.current?.close();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpa a confirmação depois do sucesso
      setTyped("");
    }
  }, [state]);

  return (
    <>
      <Button type="button" variant={variant} onClick={() => dialogRef.current?.showModal()}>
        {triggerLabel}
      </Button>
      {state.ok && state.message && <span className="sr-only" role="status">{state.message}</span>}
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-full max-w-lg rounded-3xl p-0 shadow-elevation-2 backdrop:bg-black/40"
      >
        <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-4 p-6">
          <h2 id={titleId} className="text-lg font-semibold text-on-surface">
            {title}
          </h2>
          <div className="rounded-xl bg-surface-container p-3 text-sm text-slate-700">{impact}</div>
          {Object.entries(hidden).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          {extraFields?.(errors, prefix)}
          <TextArea
            label="Justificação"
            name="justification"
            id={`${prefix}-justification`}
            errors={errors}
            required
            rows={4}
            maxLength={1000}
            defaultValue={values.justification}
            hint="Mínimo 20 caracteres. Fica registada na trilha de auditoria e é visível para auditores."
          />
          {requireConfirmationWord && (
            <TextInput
              label={`Escreva ${CONFIRMATION_WORD} para confirmar`}
              name="confirmation"
              id={`${prefix}-confirmation`}
              errors={errors}
              autoComplete="off"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              required
            />
          )}
          <FormMessage state={state.ok ? {} : state} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => dialogRef.current?.close()}>
              Cancelar
            </Button>
            <SubmitButton
              variant={variant === "secondary" ? "primary" : variant}
              disabled={requireConfirmationWord && typed !== CONFIRMATION_WORD}
            >
              {confirmLabel}
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}

/** Formulário simples (sem diálogo) para ações rápidas como remover itens. */
export function InlineActionForm({
  action,
  hidden,
  label,
  variant = "ghost",
  confirmText,
}: {
  action: ServerAction;
  hidden: Record<string, string>;
  label: string;
  variant?: "ghost" | "secondary" | "danger";
  confirmText?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
      className="inline"
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Button type="submit" variant={variant} className={cn(variant === "ghost" && "px-2 py-1 text-xs")}>
        {label}
      </Button>
      {state.message && !state.ok && <span className="ml-2 text-xs text-red-700">{state.message}</span>}
    </form>
  );
}
