"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input, Label, Select, FieldError } from "@/components/ui/Field";
import { useActionToast } from "@/components/hooks/useActionToast";
import type { UsuarioFormState } from "@/lib/types";

type UsuarioFormProps = {
  action: (prevState: UsuarioFormState, formData: FormData) => Promise<UsuarioFormState>;
};

export function UsuarioForm({ action }: UsuarioFormProps) {
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
        </Select>
        <p className="mt-1 text-xs text-muted">
          Administrador também pode cadastrar e excluir outros usuários.
        </p>
      </div>
      <FieldError>{state.error}</FieldError>
      <SubmitButton pending={pending} pendingLabel="Salvando">
        Criar usuário
      </SubmitButton>
    </form>
  );
}
