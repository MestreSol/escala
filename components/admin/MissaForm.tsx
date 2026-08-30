"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldError } from "@/components/ui/Field";
import { DIAS_SEMANA } from "@/lib/constants";
import type { MissaFormState } from "@/app/admin/(dashboard)/missas/actions";

type MissaFormProps = {
  action: (prevState: MissaFormState, formData: FormData) => Promise<MissaFormState>;
  defaultValues?: { diaSemana: number; horario: string; comunidade: string };
  submitLabel: string;
};

export function MissaForm({ action, defaultValues, submitLabel }: MissaFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="max-w-md space-y-4">
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
      <FieldError>{state.error}</FieldError>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}
