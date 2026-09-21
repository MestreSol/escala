"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldError } from "@/components/ui/Field";
import { useActionToast } from "@/components/hooks/useActionToast";
import { DIAS_SEMANA } from "@/lib/constants";
import type { MissaFormState } from "@/app/admin/(dashboard)/missas/actions";

type Tipo = "RECORRENTE" | "DATA_UNICA";
type ModoEscalacao = "NORMAL" | "TODOS_ATIVOS" | "COMUNIDADE";

type MissaFormProps = {
  action: (prevState: MissaFormState, formData: FormData) => Promise<MissaFormState>;
  defaultValues?: {
    diaSemana: number;
    horario: string;
    comunidade: string;
    /** "yyyy-MM-dd" ou null/undefined (missa recorrente normal). */
    dataUnica?: string | null;
    escalarTodosAtivos?: boolean;
    comunidadeResponsavel?: string | null;
  };
  /** Tipo pré-selecionado ao abrir o form (ex: vindo de "Nova missa grande"). Padrão: RECORRENTE. */
  tipoInicial?: Tipo;
  submitLabel: string;
};

const HOJE = new Date().toISOString().slice(0, 10);

export function MissaForm({ action, defaultValues, tipoInicial, submitLabel }: MissaFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  useActionToast(state, pending, "Missa salva.");
  const [tipo, setTipo] = useState<Tipo>(defaultValues?.dataUnica ? "DATA_UNICA" : (tipoInicial ?? "RECORRENTE"));
  const [modoEscalacao, setModoEscalacao] = useState<ModoEscalacao>(
    defaultValues?.escalarTodosAtivos ? "TODOS_ATIVOS" : defaultValues?.comunidadeResponsavel ? "COMUNIDADE" : "TODOS_ATIVOS"
  );

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <Label>Tipo de missa</Label>
        <div className="grid grid-cols-2 gap-3">
          <label
            className={`flex cursor-pointer flex-col gap-1 rounded-lg border border-gray-200 bg-white p-3 text-sm transition-colors hover:border-blue-300 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:checked]:ring-1 has-[:checked]:ring-blue-600`}
          >
            <input
              type="radio"
              name="tipo"
              value="RECORRENTE"
              checked={tipo === "RECORRENTE"}
              onChange={() => setTipo("RECORRENTE")}
              className="sr-only"
            />
            <span className="font-medium text-gray-900">Recorrente</span>
            <span className="text-xs text-gray-500">Toda semana, no mesmo dia.</span>
          </label>
          <label
            className={`flex cursor-pointer flex-col gap-1 rounded-lg border border-gray-200 bg-white p-3 text-sm transition-colors hover:border-blue-300 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:checked]:ring-1 has-[:checked]:ring-blue-600`}
          >
            <input
              type="radio"
              name="tipo"
              value="DATA_UNICA"
              checked={tipo === "DATA_UNICA"}
              onChange={() => setTipo("DATA_UNICA")}
              className="sr-only"
            />
            <span className="font-medium text-gray-900">Missa grande</span>
            <span className="text-xs text-gray-500">Evento único (ex: Natal), fora do ciclo semanal.</span>
          </label>
        </div>
      </div>

      {tipo === "RECORRENTE" ? (
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
          <Label htmlFor="dataUnica">Data</Label>
          <Input
            id="dataUnica"
            name="dataUnica"
            type="date"
            min={HOJE}
            defaultValue={defaultValues?.dataUnica ?? ""}
            required
          />
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

      {tipo === "DATA_UNICA" && (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <Label>Quem serve</Label>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="modoEscalacao"
                value="TODOS_ATIVOS"
                checked={modoEscalacao === "TODOS_ATIVOS"}
                onChange={() => setModoEscalacao("TODOS_ATIVOS")}
                className="h-4 w-4 border-gray-300"
              />
              Todos os servidores ativos (ignora a preferência de missa de cada um)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="modoEscalacao"
                value="COMUNIDADE"
                checked={modoEscalacao === "COMUNIDADE"}
                onChange={() => setModoEscalacao("COMUNIDADE")}
                className="h-4 w-4 border-gray-300"
              />
              Responsabilidade de uma comunidade específica
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="modoEscalacao"
                value="NORMAL"
                checked={modoEscalacao === "NORMAL"}
                onChange={() => setModoEscalacao("NORMAL")}
                className="h-4 w-4 border-gray-300"
              />
              Normal (só quem já preferiu essa missa — raro pra evento novo)
            </label>
          </div>

          {modoEscalacao === "COMUNIDADE" && (
            <div>
              <Label htmlFor="comunidadeResponsavel">Comunidade responsável</Label>
              <Input
                id="comunidadeResponsavel"
                name="comunidadeResponsavel"
                defaultValue={defaultValues?.comunidadeResponsavel ?? ""}
                placeholder="Ex: Matriz"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Só servidores cuja comunidade (cadastro do servidor) for igual a esta são escalados.
              </p>
            </div>
          )}
        </div>
      )}

      <FieldError>{state.error}</FieldError>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}
