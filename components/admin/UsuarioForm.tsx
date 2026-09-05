"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldError } from "@/components/ui/Field";
import type { UsuarioFormState } from "@/lib/types";

type UsuarioFormProps = {
  action: (prevState: UsuarioFormState, formData: FormData) => Promise<UsuarioFormState>;
};

export function UsuarioForm({ action }: UsuarioFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <Label htmlFor="username">Usuário</Label>
        <Input id="username" name="username" autoComplete="username" required />
      </div>
      <div>
        <Label htmlFor="senha">Senha</Label>
        <Input id="senha" name="senha" type="password" autoComplete="new-password" minLength={6} required />
      </div>
      <div>
        <Label htmlFor="papel">Papel</Label>
        <Select id="papel" name="papel" defaultValue="OPERADOR">
          <option value="OPERADOR">Operador</option>
          <option value="ADMIN">Administrador</option>
        </Select>
        <p className="mt-1 text-xs text-gray-500">
          Administrador também pode cadastrar e excluir outros usuários.
        </p>
      </div>
      <FieldError>{state.error}</FieldError>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Criar usuário"}
      </Button>
    </form>
  );
}
