"use client";

import type { UserRole } from "@/db/schema";
import { ROLE_LABEL } from "@/lib/permissions";
import { roleChangeSchema, userStatusSchema } from "@/lib/validation";
import { changeRoleAction, setUserActiveAction } from "@/server/actions/users";
import { ConfirmActionForm, SelectInput } from "@/components/forms";

export function UserControls({ userId, name, role, active }: { userId: string; name: string; role: UserRole; active: boolean }) {
  return (
    <div className="flex justify-end gap-2">
      <ConfirmActionForm
        action={changeRoleAction}
        schema={roleChangeSchema}
        hidden={{ userId }}
        triggerLabel="Alterar perfil"
        title={`Alterar perfil de ${name}`}
        impact={`Perfil atual: ${ROLE_LABEL[role]}. As sessões ativas de ${name} serão terminadas para aplicar o novo perfil.`}
        confirmLabel="Alterar perfil"
        variant="secondary"
        extraFields={(errors, prefix) => (
          <SelectInput
            label="Novo perfil"
            name="role"
            id={`${prefix}-role`}
            errors={errors}
            required
            options={Object.entries(ROLE_LABEL).filter(([r]) => r !== role)}
          />
        )}
      />
      <ConfirmActionForm
        action={setUserActiveAction}
        schema={userStatusSchema}
        hidden={{ userId, active: String(!active) }}
        triggerLabel={active ? "Desativar" : "Reativar"}
        title={active ? `Desativar ${name}` : `Reativar ${name}`}
        impact={
          active
            ? "O utilizador deixa de conseguir iniciar sessão e as sessões ativas são terminadas. O histórico mantém-se intacto."
            : "O utilizador volta a poder iniciar sessão com o perfil atual."
        }
        confirmLabel={active ? "Desativar" : "Reativar"}
        variant={active ? "danger" : "secondary"}
      />
    </div>
  );
}
