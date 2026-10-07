"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input, Label, FieldError } from "@/components/ui/Field";
import { useActionToast } from "@/components/hooks/useActionToast";
import type { ParoquiaFormState } from "@/app/admin/(dashboard)/paroquias/actions";

type ParoquiaFormProps = {
  action: (prevState: ParoquiaFormState, formData: FormData) => Promise<ParoquiaFormState>;
  defaultValues?: { nome: string; slug: string; ativo: boolean };
  submitLabel: string;
};

export function ParoquiaForm({ action, defaultValues, submitLabel }: ParoquiaFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  useActionToast(state, pending, "Paróquia salva.");

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" defaultValue={defaultValues?.nome} placeholder="Ex: Paróquia São José" required />
      </div>
      <div>
        <Label htmlFor="slug">Endereço</Label>
        <Input
          id="slug"
          name="slug"
          defaultValue={defaultValues?.slug}
          placeholder="sao-jose"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          required
        />
        <p className="mt-1 text-xs text-muted">
          Parte do link das páginas públicas: /<strong className="text-fg">sao-jose</strong>/escala,
          /sao-jose/inscricao... Mudar depois quebra os links já compartilhados.
        </p>
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            name="ativo"
            defaultChecked={defaultValues?.ativo ?? true}
            className="h-4 w-4 rounded border-line-strong"
          />
          Ativa
        </label>
        <p className="mt-1 text-xs text-muted">
          Desativada, as páginas públicas dela saem do ar. O painel e os dados continuam intactos.
        </p>
      </div>
      <FieldError>{state.error}</FieldError>
      <SubmitButton pending={pending} pendingLabel="Salvando">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
