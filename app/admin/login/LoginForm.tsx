"use client";

import { useActionState } from "react";
import { login, LoginState } from "./actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input, Label, FieldError } from "@/components/ui/Field";
import { useActionToast } from "@/components/hooks/useActionToast";

const initialState: LoginState = {};

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);
  useActionToast(state, pending, "Login realizado.");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div>
        <Label htmlFor="username">Usuário</Label>
        <Input id="username" name="username" autoComplete="username" required />
      </div>
      <div>
        <Label htmlFor="password">Senha</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <FieldError>{state.error}</FieldError>
      <SubmitButton pending={pending} pendingLabel="Entrando" className="w-full">
        Entrar
      </SubmitButton>
    </form>
  );
}
