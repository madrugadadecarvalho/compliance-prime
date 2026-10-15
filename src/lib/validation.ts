import { z } from "zod";
import { COUNTRY_CODES } from "./countries";

/**
 * Esquemas partilhados entre cliente e servidor.
 * O cliente valida para dar feedback imediato; o servidor valida SEMPRE de novo,
 * porque nunca se confia no que chega do navegador.
 */

const trimmed = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} é obrigatório.` })
    .trim()
    .min(min, min <= 1 ? `${label} é obrigatório.` : `${label} deve ter pelo menos ${min} caracteres.`)
    .max(max, `${label} não pode exceder ${max} caracteres.`);

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} não pode exceder ${max} caracteres.`)
    .optional()
    .transform((v) => (v ? v : undefined));

/** Rejeita caracteres de controlo e nomes só com símbolos. */
const personOrEntityName = trimmed(3, 160, "Nome").regex(
  /^[\p{L}\p{N}][\p{L}\p{N} .,'&()\-/]*$/u,
  "O nome contém caracteres inválidos.",
);

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal(""), z.undefined(), z.null()])
  .transform((v) => v === "on" || v === "true");

export const passwordSchema = z
  .string()
  .min(12, "A palavra-passe deve ter pelo menos 12 caracteres.")
  .max(128, "A palavra-passe não pode exceder 128 caracteres.")
  .regex(/[a-z]/, "Inclua pelo menos uma letra minúscula.")
  .regex(/[A-Z]/, "Inclua pelo menos uma letra maiúscula.")
  .regex(/[0-9]/, "Inclua pelo menos um número.")
  .regex(/[^A-Za-z0-9]/, "Inclua pelo menos um símbolo.");

export const signInSchema = z.object({
  email: z.email("Indique um e-mail válido.").trim().toLowerCase(),
  password: z.string().min(1, "Indique a palavra-passe.").max(128),
});

export const signUpSchema = z
  .object({
    name: trimmed(3, 80, "Nome"),
    email: z.email("Indique um e-mail válido.").trim().toLowerCase(),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "As palavras-passe não coincidem.",
  });

export const clientSchema = z
  .object({
    type: z.enum(["PESSOA_SINGULAR", "PESSOA_COLETIVA"], { error: "Selecione o tipo de cliente." }),
    fullName: personOrEntityName,
    documentNumber: trimmed(5, 30, "Número do documento").regex(
      /^[A-Z0-9-]+$/i,
      "Use apenas letras, números e hífen.",
    ),
    taxId: optionalText(30, "NIF").refine((v) => !v || /^[A-Z0-9-]+$/i.test(v), "NIF inválido."),
    country: z.enum(COUNTRY_CODES, { error: "Selecione o país de residência/sede." }),
    nationality: z
      .union([z.enum(COUNTRY_CODES), z.literal("")])
      .optional()
      .transform((v) => (v ? v : undefined)),
    birthOrIncorporationDate: z
      .string()
      .optional()
      .transform((v) => (v ? v : undefined))
      .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Data inválida.")
      .refine((v) => !v || new Date(v) <= new Date(), "A data não pode estar no futuro.")
      .refine((v) => !v || new Date(v) >= new Date("1900-01-01"), "Data demasiado antiga."),
    address: trimmed(5, 240, "Morada"),
    email: z
      .union([z.email("E-mail inválido.").trim().toLowerCase(), z.literal("")])
      .optional()
      .transform((v) => (v ? v : undefined)),
    phone: optionalText(20, "Telefone").refine(
      (v) => !v || /^\+?[0-9 ]{7,20}$/.test(v),
      "Telefone inválido (use apenas números e +).",
    ),
    activity: trimmed(3, 160, "Atividade/profissão"),
    sourceOfFunds: trimmed(3, 300, "Origem dos fundos"),
    expectedMonthlyVolume: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v.replace(/\s/g, "").replace(",", ".")) : undefined))
      .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0 && v < 1e15), "Valor inválido."),
    isPep: checkbox,
  })
  .superRefine((d, ctx) => {
    if (d.type === "PESSOA_SINGULAR" && d.birthOrIncorporationDate) {
      const age = (Date.now() - new Date(d.birthOrIncorporationDate).getTime()) / (365.25 * 864e5);
      if (age < 18)
        ctx.addIssue({
          code: "custom",
          path: ["birthOrIncorporationDate"],
          message: "O titular deve ser maior de idade.",
        });
    }
  });

export type ClientInput = z.infer<typeof clientSchema>;

export const relatedPartySchema = z.object({
  clientId: z.uuid(),
  fullName: personOrEntityName,
  role: z.enum(["SOCIO", "ADMINISTRADOR", "BENEFICIARIO_EFETIVO", "REPRESENTANTE_LEGAL"], {
    error: "Selecione a função.",
  }),
  ownershipPercentage: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v.replace(",", ".")) : undefined))
    .refine((v) => v === undefined || (v > 0 && v <= 100), "A percentagem deve estar entre 0 e 100."),
  nationality: z.enum(COUNTRY_CODES, { error: "Selecione a nacionalidade." }),
  documentNumber: optionalText(30, "Documento"),
  isPep: checkbox,
});

export const clientLinkSchema = z.object({
  clientId: z.uuid(),
  entityName: personOrEntityName,
  relationType: trimmed(3, 80, "Tipo de vínculo"),
  description: optionalText(400, "Descrição"),
});

export const DOCUMENT_TYPES = [
  "BILHETE_IDENTIDADE",
  "PASSAPORTE",
  "NIF",
  "COMPROVATIVO_MORADA",
  "CERTIDAO_COMERCIAL",
  "ESTATUTOS",
  "COMPROVATIVO_RENDIMENTOS",
  "OUTRO",
] as const;

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_MIME = ["application/pdf", "image/png", "image/jpeg"] as const;

export const documentUploadSchema = z.object({
  clientId: z.uuid(),
  type: z.enum(DOCUMENT_TYPES, { error: "Selecione o tipo de documento." }),
  file: z
    .instanceof(File, { error: "Selecione um ficheiro." })
    .refine((f) => f.size > 0, "O ficheiro está vazio.")
    .refine((f) => f.size <= MAX_UPLOAD_BYTES, "O ficheiro excede 5 MB.")
    .refine(
      (f) => (ALLOWED_MIME as readonly string[]).includes(f.type),
      "Formato não suportado. Use PDF, PNG ou JPEG.",
    ),
});

/** Ações sensíveis exigem justificação e confirmação explícita (dupla confirmação). */
export const justification = trimmed(20, 1000, "Justificação");

export const CONFIRMATION_WORD = "CONFIRMO";

const confirmation = z.literal(CONFIRMATION_WORD, {
  error: `Escreva ${CONFIRMATION_WORD} para confirmar.`,
});

export const decisionSchema = z.object({
  clientId: z.uuid(),
  version: z.coerce.number().int().positive(),
  justification,
  confirmation,
});

export const returnSchema = z.object({
  clientId: z.uuid(),
  version: z.coerce.number().int().positive(),
  justification,
});

export const documentReviewSchema = z.object({
  documentId: z.uuid(),
  status: z.enum(["VALIDADO", "REJEITADO"]),
  note: optionalText(400, "Nota"),
});

export const alertOpinionSchema = z.object({
  alertId: z.uuid(),
  opinion: trimmed(20, 1000, "Parecer"),
});

export const alertDecisionSchema = z.object({
  alertId: z.uuid(),
  decision: z.enum(["FALSO_POSITIVO", "CONFIRMADO"], { error: "Selecione a decisão." }),
  justification,
  confirmation,
});

export const roleChangeSchema = z.object({
  userId: z.string().min(1).max(64),
  role: z.enum(["ANALISTA", "SUPERVISOR", "GESTOR", "AUDITOR"]),
  justification,
  confirmation,
});

export const userStatusSchema = z.object({
  userId: z.string().min(1).max(64),
  active: z.enum(["true", "false"]).transform((v) => v === "true"),
  justification,
  confirmation,
});

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionState = {
  ok?: boolean;
  message?: string;
  errors?: FieldErrors;
  values?: Record<string, string>;
};

export function toFieldErrors(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors;
}

export function formValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string" && !k.startsWith("$ACTION")) out[k] = v;
  }
  return out;
}
