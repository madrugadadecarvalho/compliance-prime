import { LinkButton, PageHeader } from "@/components/ui";

export default function NoAccessPage() {
  return (
    <div className="max-w-xl">
      <PageHeader
        title="Sem acesso"
        description="O seu perfil não tem permissão para ver esta área. A tentativa não altera dados. Se precisar de acesso, peça a um Gestor de Compliance."
      />
      <LinkButton href="/painel" variant="secondary">
        Voltar ao painel
      </LinkButton>
    </div>
  );
}
