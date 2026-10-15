import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";
import { passwordSchema, signUpSchema } from "@/lib/validation";
import { writeAudit } from "@/server/audit";

const EIGHT_HOURS = 60 * 60 * 8;

export const auth = betterAuth({
  appName: "Compliance Prime",
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.BETTER_AUTH_URL],

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      rateLimit: schema.rateLimit,
    },
  }),

  emailAndPassword: {
    enabled: true,
    disableSignUp: !env.ALLOW_SIGNUP,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: true,
  },

  user: {
    additionalFields: {
      // `input: false` impede que o perfil seja definido pelo próprio utilizador no registo.
      role: { type: "string", required: false, defaultValue: "ANALISTA", input: false },
      active: { type: "boolean", required: false, defaultValue: true, input: false },
    },
  },

  session: {
    expiresIn: EIGHT_HOURS, // sessões curtas: sistema regulado
    updateAge: 60 * 30,
    freshAge: 60 * 10,
  },

  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 600, max: 3 },
    },
  },

  advanced: {
    useSecureCookies: env.BETTER_AUTH_URL.startsWith("https://"),
    database: { generateId: () => crypto.randomUUID() },
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Política de palavra-passe forte também no servidor (não apenas no formulário).
      if (ctx.path === "/sign-up/email") {
        const parsed = signUpSchema.safeParse({
          ...ctx.body,
          confirmPassword: ctx.body?.password,
        });
        if (!parsed.success) {
          throw new APIError("BAD_REQUEST", { message: parsed.error.issues[0]?.message });
        }
      }
      if (ctx.path === "/change-password") {
        const parsed = passwordSchema.safeParse(ctx.body?.newPassword);
        if (!parsed.success) {
          throw new APIError("BAD_REQUEST", { message: parsed.error.issues[0]?.message });
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-in/email" && ctx.context.returned instanceof APIError) {
        const email = typeof ctx.body?.email === "string" ? ctx.body.email.slice(0, 120) : "desconhecido";
        await writeAudit(db, {
          actor: { id: null, name: email, role: "ANONIMO" },
          action: "LOGIN_FALHADO",
          entityType: "SESSAO",
          summary: `Tentativa de login falhada para ${email}`,
          ipAddress: ctx.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
          userAgent: ctx.request?.headers.get("user-agent") ?? null,
        });
      }
    }),
  },

  databaseHooks: {
    user: {
      create: {
        after: async (created) => {
          await writeAudit(db, {
            actor: { id: created.id, name: created.name, role: "ANALISTA" },
            action: "REGISTO_UTILIZADOR",
            entityType: "UTILIZADOR",
            entityId: created.id,
            summary: `Novo utilizador registado: ${created.email}`,
          });
        },
      },
    },
    session: {
      create: {
        before: async (newSession) => {
          const [owner] = await db
            .select({ active: schema.user.active })
            .from(schema.user)
            .where(eq(schema.user.id, newSession.userId));
          if (!owner?.active) {
            throw new APIError("FORBIDDEN", {
              message: "Conta desativada. Contacte o Gestor de Compliance.",
            });
          }
        },
        after: async (created) => {
          const [owner] = await db
            .select({ name: schema.user.name, role: schema.user.role })
            .from(schema.user)
            .where(eq(schema.user.id, created.userId));
          await writeAudit(db, {
            actor: { id: created.userId, name: owner?.name ?? "—", role: owner?.role ?? "—" },
            action: "LOGIN",
            entityType: "SESSAO",
            entityId: created.id,
            summary: "Início de sessão",
            ipAddress: created.ipAddress ?? null,
            userAgent: created.userAgent ?? null,
          });
        },
      },
    },
  },

  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
