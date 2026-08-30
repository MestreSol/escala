"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldError } from "@/components/ui/Field";
import { DIAS_SEMANA } from "@/lib/constants";
import type { MissaOption, ServidorFormState } from "@/lib/types";

type ServidorFormProps = {
  action: (prevState: ServidorFormState, formData: FormData) => Promise<ServidorFormState>;
  missas: MissaOption[];
  defaultValues?: {
    nome: string;
    idade: number;
    comunidade: string;
    categoria: string;
    missaIds: string[];
  };
  submitLabel: string;
};

const GRAUS = [
  { value: "COROINHA", label: "Coroinha", descricao: "Início da caminhada no altar." },
  { value: "ACOLITO", label: "Acólito", descricao: "Também pode exercer funções de coroinha." },
  { value: "CERIMONIARIO", label: "Cerimoniário", descricao: "Também pode exercer funções de acólito e coroinha." },
];

export function ServidorForm({ action, missas, defaultValues, submitLabel }: ServidorFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const missaIdsSelecionadas = new Set(defaultValues?.missaIds ?? []);

  const comunidades = Array.from(
    new Set([...missas.map((m) => m.comunidade), ...(defaultValues?.comunidade ? [defaultValues.comunidade] : [])])
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <form
      action={formAction}
      className="max-w-lg space-y-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" defaultValue={defaultValues?.nome} placeholder="Seu nome completo" required />
        </div>

        <div>
          <Label htmlFor="idade">Idade</Label>
          <Input
            id="idade"
            name="idade"
            type="number"
            min={1}
            max={120}
            defaultValue={defaultValues?.idade}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="comunidade">Comunidade</Label>
        {comunidades.length === 0 ? (
          <Input id="comunidade" name="comunidade" defaultValue={defaultValues?.comunidade} required />
        ) : (
          <Select id="comunidade" name="comunidade" defaultValue={defaultValues?.comunidade ?? ""} required>
            <option value="" disabled>
              Selecione...
            </option>
            {comunidades.map((comunidade) => (
              <option key={comunidade} value={comunidade}>
                {comunidade}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div>
        <Label>Categoria</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {GRAUS.map((grau) => (
            <label
              key={grau.value}
              className="relative flex cursor-pointer flex-col gap-1 rounded-lg border border-gray-200 bg-white p-3 text-sm transition-colors hover:border-blue-300 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:checked]:ring-1 has-[:checked]:ring-blue-600"
            >
              <input
                type="radio"
                name="categoria"
                value={grau.value}
                defaultChecked={(defaultValues?.categoria ?? "COROINHA") === grau.value}
                className="absolute right-3 top-3 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-600"
                required
              />
              <span className="pr-6 font-medium text-gray-900">{grau.label}</span>
              <span className="text-xs text-gray-500">{grau.descricao}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label>Missas que prefiro servir</Label>
        {missas.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma missa cadastrada no momento.</p>
        ) : (
          <div className="space-y-2">
            {missas.map((missa) => (
              <label
                key={missa.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 transition-colors hover:border-blue-300 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50"
              >
                <input
                  type="checkbox"
                  name="missaIds"
                  value={missa.id}
                  defaultChecked={missaIdsSelecionadas.has(missa.id)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                <span>
                  <span className="font-medium text-gray-900">
                    {DIAS_SEMANA[missa.diaSemana]} às {missa.horario}
                  </span>
                  <span className="text-gray-500"> — {missa.comunidade}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <FieldError>{state.error}</FieldError>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Enviando..." : submitLabel}
      </Button>
    </form>
  );
}
