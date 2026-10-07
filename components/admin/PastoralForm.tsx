"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input, Label, Select, FieldError } from "@/components/ui/Field";
import { useActionToast } from "@/components/hooks/useActionToast";
import { TIPO_PASTORAL_LABEL } from "@/lib/constants";
import type { PastoralFormState } from "@/app/admin/(dashboard)/pastorais/actions";

type PastoralFormProps = {
  action: (prevState: PastoralFormState, formData: FormData) => Promise<PastoralFormState>;
  defaultValues?: { nome: string; slug: string; tipo: string; ativo: boolean };
  /** Endereço da paróquia, só pra mostrar como fica o link público. */
  slugParoquia: string;
  submitLabel: string;
};

export function PastoralForm({ action, defaultValues, slugParoquia, submitLabel }: PastoralFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  useActionToast(state, pending, "Pastoral salva.");

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" defaultValue={defaultValues?.nome} placeholder="Ex: Ministros" required />
      </div>
      <div>
        <Label htmlFor="tipo">Tipo</Label>
        <Select id="tipo" name="tipo" defaultValue={defaultValues?.tipo ?? "MINISTROS"}>
          {Object.entries(TIPO_PASTORAL_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-xs text-muted">
          Coroinhas usam os graus (coroinha, acólito, cerimoniário). Ministros são todos do mesmo nível.
        </p>
      </div>
      <div>
        <Label htmlFor="slug">Endereço</Label>
        <Input
          id="slug"
          name="slug"
          defaultValue={defaultValues?.slug}
          placeholder="ministros"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          required
        />
        <p className="mt-1 text-xs text-muted">
          Parte do link das páginas públicas: /{slugParoquia}/<strong className="text-fg">ministros</strong>/escala.
          Mudar depois quebra os links já compartilhados.
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
