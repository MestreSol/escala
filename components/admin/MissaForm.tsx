"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input, Label, Select, FieldError } from "@/components/ui/Field";
import { DIAS_SEMANA } from "@/lib/constants";
import type { MissaFormState } from "@/app/admin/(dashboard)/missas/actions";

type MissaFormProps = {
  action: (prevState: MissaFormState, formData: FormData) => Promise<MissaFormState>;
  defaultValues?: {
    diaSemana: number | null;
    dataUnica: string | null;
    horario: string;
    comunidade: string;
    escalarTodosAtivos: boolean;
  };
  submitLabel: string;
};

export function MissaForm({ action, defaultValues, submitLabel }: MissaFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const [tipoRecorrencia, setTipoRecorrencia] = useState<"semanal" | "unica">(
    defaultValues?.dataUnica ? "unica" : "semanal"
  );

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <Label>Recorrência</Label>
        <div className="flex gap-4 text-sm text-fg">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="tipoRecorrencia"
              value="semanal"
              checked={tipoRecorrencia === "semanal"}
              onChange={() => setTipoRecorrencia("semanal")}
            />
            Toda semana
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="tipoRecorrencia"
              value="unica"
              checked={tipoRecorrencia === "unica"}
              onChange={() => setTipoRecorrencia("unica")}
            />
            Data única (evento sazonal)
          </label>
        </div>
      </div>

      {tipoRecorrencia === "semanal" ? (
        <div>
          <Label htmlFor="diaSemana">Dia da semana</Label>
          <Select id="diaSemana" name="diaSemana" defaultValue={defaultValues?.diaSemana ?? 0}>
            {DIAS_SEMANA.map((dia, index) => (
              <option key={dia} value={index}>
                {dia}
              </option>
            ))}
          </Select>
        </div>
      ) : (
        <div>
          <Label htmlFor="dataUnica">Data do evento</Label>
          <Input
            id="dataUnica"
            name="dataUnica"
            type="date"
            defaultValue={defaultValues?.dataUnica?.slice(0, 10)}
            required
          />
          <p className="mt-1 text-xs text-muted">
            Ex: Nossa Senhora Aparecida, festa da padroeira — não se repete toda semana.
          </p>
        </div>
      )}

      <div>
        <Label htmlFor="horario">Horário</Label>
        <Input id="horario" name="horario" type="time" defaultValue={defaultValues?.horario ?? "19:00"} required />
      </div>
      <div>
        <Label htmlFor="comunidade">Comunidade</Label>
        <Input
          id="comunidade"
          name="comunidade"
          defaultValue={defaultValues?.comunidade}
          placeholder="Ex: Matriz"
          required
        />
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            name="escalarTodosAtivos"
            defaultChecked={defaultValues?.escalarTodosAtivos ?? false}
            className="h-4 w-4 rounded border-line-strong"
          />
          Precisa de todos os servidores ativos
        </label>
        <p className="mt-1 text-xs text-muted">
          Em vez de configurar funções e vagas, a ocorrência ganha um botão pra escalar todo
          servidor ativo de uma vez, numa lista de presença simples (sem função individual).
        </p>
      </div>
      <FieldError>{state.error}</FieldError>
      <SubmitButton pending={pending} pendingLabel="Salvando">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
