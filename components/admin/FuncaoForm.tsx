"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input, Label, Select, FieldError } from "@/components/ui/Field";
import { PRIORIDADE_LABEL, GRAU_LABEL } from "@/lib/constants";
import type { FuncaoFormState } from "@/app/admin/(dashboard)/funcoes/actions";

type FuncaoFormProps = {
  action: (prevState: FuncaoFormState, formData: FormData) => Promise<FuncaoFormState>;
  defaultValues?: {
    nome: string;
    prioridade: string;
    grauMinimo: string;
    quantidadePadrao: number;
    exigeGrupoCompleto: boolean;
  };
  submitLabel: string;
};

export function FuncaoForm({ action, defaultValues, submitLabel }: FuncaoFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <Label htmlFor="nome">Nome da função</Label>
        <Input id="nome" name="nome" defaultValue={defaultValues?.nome} placeholder="Ex: Turiferário" required />
      </div>
      <div>
        <Label htmlFor="prioridade">Prioridade</Label>
        <Select id="prioridade" name="prioridade" defaultValue={defaultValues?.prioridade ?? "MEDIA"}>
          {Object.entries(PRIORIDADE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="grauMinimo">Grau mínimo</Label>
        <Select id="grauMinimo" name="grauMinimo" defaultValue={defaultValues?.grauMinimo ?? "COROINHA"}>
          {Object.entries(GRAU_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-xs text-muted">
          Grau mínimo para exercer essa função. Quem tem um grau maior também pode (ex: Cerimoniário
          pode fazer funções de Coroinha ou Acólito).
        </p>
      </div>
      <div>
        <Label htmlFor="quantidadePadrao">Quantidade padrão de vagas</Label>
        <Input
          id="quantidadePadrao"
          name="quantidadePadrao"
          type="number"
          min={1}
          max={20}
          defaultValue={defaultValues?.quantidadePadrao ?? 1}
          required
        />
        <p className="mt-1 text-xs text-muted">
          Quantas pessoas essa função costuma precisar por missa (ex: 2 para Ceroferário). Usado
          como sugestão ao configurar cada missa — cada uma pode ajustar individualmente.
        </p>
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            name="exigeGrupoCompleto"
            defaultChecked={defaultValues?.exigeGrupoCompleto ?? false}
            className="h-4 w-4 rounded border-line-strong"
          />
          Vagas indivisíveis (tudo ou nada)
        </label>
        <p className="mt-1 text-xs text-muted">
          Se marcado, as vagas dessa função só são preenchidas se houver gente para todas ao mesmo
          tempo; senão, todas ficam em aberto (ex: Ceroferário sempre anda em dupla — não faz
          sentido escalar só 1 dos 2).
        </p>
      </div>
      <FieldError>{state.error}</FieldError>
      <SubmitButton pending={pending} pendingLabel="Salvando">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
