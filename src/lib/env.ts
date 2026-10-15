import { z } from "zod";

/**
 * Variáveis de ambiente validadas no arranque.
 * Falhar cedo evita que o sistema corra com segredos fracos ou em falta.
 */
const schema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  DATABASE_SSL: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET deve ter pelo menos 32 caracteres (use `openssl rand -base64 32`)."),
  BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
  ALLOW_SIGNUP: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Configuração inválida:\n${issues}`);
}

export const env = parsed.data;
