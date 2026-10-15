import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable, type UserRole } from "@/db/schema";
import { auth } from "@/lib/auth";
import { can, type Permission } from "@/lib/permissions";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

/**
 * Data Access Layer: único ponto onde a sessão é lida.
 * O perfil e o estado (ativo/inativo) vêm sempre da base de dados, não do cookie,
 * para que uma alteração de perfil ou desativação tenha efeito imediato.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [row] = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      role: userTable.role,
      active: userTable.active,
    })
    .from(userTable)
    .where(eq(userTable.id, session.user.id));

  if (!row || !row.active) return null;
  return { id: row.id, name: row.name, email: row.email, role: row.role };
});

export async function requireUser(): Promise<CurrentUser> {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");
  return current;
}

/** Para páginas: encaminha para /sem-acesso se o perfil não tiver a permissão. */
export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const current = await requireUser();
  if (!can(current.role, permission)) redirect("/sem-acesso");
  return current;
}

export async function requestMeta() {
  const h = await headers();
  return {
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null,
    userAgent: h.get("user-agent"),
  };
}
