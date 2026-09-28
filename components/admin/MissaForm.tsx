"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input, Label, Select, FieldError } from "@/components/ui/Field";
import { useActionToast } from "@/components/hooks/useActionToast";
import { DIAS_SEMANA } from "@/lib/constants";
import type { MissaFormState } from "@/app/admin/(dashboard)/missas/actions";
import type { ModoMissa } from "@/lib/validations";

type Tipo = "RECORRENTE" | "DATA_UNICA";

type MissaFormProps = {
  action: (prevState: MissaFormState, formData: FormData) => Promise<MissaFormState>;
  defaultValues?: {
    diaSemana: number | null;
    /** ISO ou "yyyy-MM-dd"; preenchida = missa de data única. */
    dataUnica?: string | null;
    horario: string;
    comunidade: string;
    escalarTodosAtivos?: boolean;
    comunidadeResponsavel?: string | null;
  };
  /** Tipo pré-selecionado ao abrir o form (ex: vindo de "Nova missa grande"). Padrão: RECORRENTE. */
  tipoInicial?: Tipo;
  submitLabel: string;
};

const MODOS: Record<Tipo, { valor: ModoMissa; titulo: string; descricao: string }[]> = {
  RECORRENTE: [
    { valor: "NORMAL", titulo: "Normal", descricao: "Sorteio entre quem marcou esta missa como preferida." },
    {
      valor: "LISTA_TODOS",
      titulo: "Todos os coroinhas",
      descricao: "Sem funções: todo ativo entra numa lista de presença.",
    },
  ],
  DATA_UNICA: [
    {
      valor: "TODOS_ATIVOS",
      titulo: "Sorteio entre todos",
      descricao: "Funções sorteadas entre todos os ativos, sem olhar preferência.",
    },
    {
      valor: "COMUNIDADE",
      titulo: "Comunidade responsável",
      descricao: "Funções sorteadas só entre os servidores de uma comunidade.",
    },
    {
      valor: "LISTA_TODOS",
      titulo: "Todos os coroinhas",
      descricao: "Sem funções: todo ativo entra numa lista de presença.",
    },
  ],
};

const HOJE = new Date().toISOString().slice(0, 10);

const cartaoClasses =
  "flex cursor-pointer flex-col gap-1 rounded-xl border border-line bg-surface p-3 text-sm transition-colors hover:border-accent/50 has-[:checked]:border-accent has-[:checked]:bg-accent-soft";

function modoInicial(tipo: Tipo, valores: MissaFormProps["defaultValues"]): ModoMissa {
  if (valores?.escalarTodosAtivos) return "LISTA_TODOS";
  if (tipo === "DATA_UNICA") return valores?.comunidadeResponsavel ? "COMUNIDADE" : "TODOS_ATIVOS";
  return "NORMAL";
}

export function MissaForm({ action, defaultValues, tipoInicial, submitLabel }: MissaFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  useActionToast(state, pending, "Missa salva.");
  const [tipo, setTipo] = useState<Tipo>(defaultValues?.dataUnica ? "DATA_UNICA" : (tipoInicial ?? "RECORRENTE"));
  const [modo, setModo] = useState<ModoMissa>(() => modoInicial(tipo, defaultValues));

  function trocarTipo(novo: Tipo) {
    setTipo(novo);
    // O modo atual pode não existir no outro tipo (ex: "Sorteio entre todos" é só de data única).
    if (!MODOS[novo].some((m) => m.valor === modo)) setModo(MODOS[novo][0].valor);
  }

  return (
    <form action={formAction} className="max-w-md space-y-5">
      <div>
        <Label>Tipo de missa</Label>
        <div className="grid grid-cols-2 gap-3">
          <label className={cartaoClasses}>
            <input
              type="radio"
              name="tipo"
              value="RECORRENTE"
              checked={tipo === "RECORRENTE"}
              onChange={() => trocarTipo("RECORRENTE")}
              className="sr-only"
            />
            <span className="font-medium text-fg">Semanal</span>
            <span className="text-xs text-muted">Toda semana, no mesmo dia.</span>
          </label>
          <label className={cartaoClasses}>
            <input
              type="radio"
              name="tipo"
              value="DATA_UNICA"
              checked={tipo === "DATA_UNICA"}
              onChange={() => trocarTipo("DATA_UNICA")}
              className="sr-only"
            />
            <span className="font-medium text-fg">Missa grande</span>
            <span className="text-xs text-muted">Data única (ex: Natal), fora do ciclo semanal.</span>
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
            min={defaultValues?.dataUnica ? undefined : HOJE}
            defaultValue={defaultValues?.dataUnica?.slice(0, 10) ?? ""}
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

      <div>
        <Label>Quem serve</Label>
        <div className="space-y-2">
          {MODOS[tipo].map((opcao) => (
            <label key={opcao.valor} className={cartaoClasses}>
              <input
                type="radio"
                name="modoEscalacao"
                value={opcao.valor}
                checked={modo === opcao.valor}
                onChange={() => setModo(opcao.valor)}
                className="sr-only"
              />
              <span className="font-medium text-fg">{opcao.titulo}</span>
              <span className="text-xs text-muted">{opcao.descricao}</span>
            </label>
          ))}
        </div>

        {tipo === "DATA_UNICA" && modo === "COMUNIDADE" ? (
          <div className="mt-3 animate-fade-in">
            <Label htmlFor="comunidadeResponsavel">Comunidade responsável</Label>
            <Input
              id="comunidadeResponsavel"
              name="comunidadeResponsavel"
              defaultValue={defaultValues?.comunidadeResponsavel ?? ""}
              placeholder="Ex: São José"
              required
            />
            <p className="mt-1.5 text-xs text-muted">
              Só servidores cuja comunidade (no cadastro) for igual a esta são sorteados.
            </p>
          </div>
        ) : null}
      </div>

      <FieldError>{state.error}</FieldError>
      <SubmitButton pending={pending} pendingLabel="Salvando">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
