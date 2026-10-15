import type { Metadata } from "next";
import { requirePermission } from "@/server/session";
import { listUsers } from "@/server/queries";
import { ROLE_DESCRIPTION, ROLE_LABEL } from "@/lib/permissions";
import { Badge, Card, CardBody, CardHeader, PageHeader, Table, Td, Th, formatDate } from "@/components/ui";
import { UserControls } from "./user-controls";

export const metadata: Metadata = { title: "Utilizadores" };

export default async function UsersPage() {
  const me = await requirePermission("users:manage");
  const users = await listUsers();

  return (
    <>
      <PageHeader
        eyebrow="Administração"
        title="Utilizadores e perfis"
        description="Alterações de perfil exigem justificação e dupla confirmação, terminam as sessões ativas do utilizador e ficam na trilha de auditoria."
      />
      <Card className="mb-6">
        <CardHeader title="Perfis e responsabilidades" />
        <CardBody>
          <dl className="grid gap-4 sm:grid-cols-2">
            {Object.entries(ROLE_DESCRIPTION).map(([role, text]) => (
              <div key={role}>
                <dt className="text-sm font-semibold">{ROLE_LABEL[role as keyof typeof ROLE_LABEL]}</dt>
                <dd className="text-sm text-slate-600">{text}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>
      <Card>
        <Table>
          <thead className="bg-surface-container/60">
            <tr>
              <Th>Nome</Th>
              <Th>Perfil</Th>
              <Th>Estado</Th>
              <Th>Desde</Th>
              <Th><span className="sr-only">Ações</span></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {users.map((u) => (
              <tr key={u.id}>
                <Td>
                  <span className="font-medium">{u.name}</span>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </Td>
                <Td><Badge tone="blue">{ROLE_LABEL[u.role]}</Badge></Td>
                <Td>{u.active ? <Badge tone="green">Ativo</Badge> : <Badge tone="red">Desativado</Badge>}</Td>
                <Td className="text-slate-600">{formatDate(u.createdAt)}</Td>
                <Td className="text-right">
                  {u.id === me.id ? (
                    <span className="text-xs text-slate-500">A sua conta</span>
                  ) : (
                    <UserControls userId={u.id} name={u.name} role={u.role} active={u.active} />
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
