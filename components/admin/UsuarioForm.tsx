"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input, Label, Select, FieldError } from "@/components/ui/Field";
import { useActionToast } from "@/components/hooks/useActionToast";
import type { UsuarioFormState } from "@/lib/types";

type UsuarioFormProps = {
  action: (prevState: UsuarioFormState, formData: FormData) => Promise<UsuarioFormState>;
  /** Pastorais da paróquia pra escolher; null = o novo usuário fica na pastoral de quem cria. */
  pastorais: { id: string; nome: string }[] | null;
};

export function UsuarioForm({ action, pastorais }: UsuarioFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  useActionToast(state, pending, "Usuário criado.");

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <Label htmlFor="username">Usuário</Label>
        <Input id="username" name="username" autoComplete="username" required />
      </div>
      <div>
        <Label htmlFor="senha">Senha</Label>
        <Input id="senha" name="senha" type="password" autoComplete="new-password" minLength={8} maxLength={128} required />
      </div>
      <div>
        <Label htmlFor="papel">Papel</Label>
        <Select id="papel" name="papel" defaultValue="OPERADOR">
          <option value="OPERADOR">Operador</option>
          <option value="ADMIN">Administrador</option>
          <option value="PRESENCA">Presença</option>
        </Select>
        <p className="mt-1 text-xs text-muted">
          Administrador também pode cadastrar e excluir outros usuários. Presença só vê as missas do dia e
          marca quem compareceu.
        </p>
      </div>
      {pastorais ? (
        <div>
          <Label htmlFor="pastoralId">Pastoral</Label>
          <Select id="pastoralId" name="pastoralId" defaultValue={pastorais[0]?.id ?? ""}>
            {pastorais.map((pastoral) => (
              <option key={pastoral.id} value={pastoral.id}>
                {pastoral.nome}
              </option>
            ))}
            <option value="">Paróquia toda (só administrador)</option>
          </Select>
          <p className="mt-1 text-xs text-muted">
            O usuário só vê e escala a pastoral dele. &quot;Paróquia toda&quot; troca entre as pastorais e
            cadastra novas.
          </p>
        </div>
      ) : null}
      <FieldError>{state.error}</FieldError>
      <SubmitButton pending={pending} pendingLabel="Salvando">
        Criar usuário
      </SubmitButton>
    </form>
  );
}
