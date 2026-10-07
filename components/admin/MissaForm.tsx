"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input, Label, Select, FieldError } from "@/components/ui/Field";
import { useActionToast } from "@/components/hooks/useActionToast";
import { DIAS_SEMANA } from "@/lib/constants";
import { SEMANAS_DO_MES } from "@/lib/occurrences";
import type { MissaFormState } from "@/app/admin/(dashboard)/missas/actions";
import type { ModoMissa } from "@/lib/validations";

type Tipo = "RECORRENTE" | "MENSAL" | "DATA_UNICA";

type MissaFormProps = {
  action: (prevState: MissaFormState, formData: FormData) => Promise<MissaFormState>;
  defaultValues?: {
    diaSemana: number | null;
    /** 1-4 = 1ª..4ª, 5 = última; preenchido = missa mensal. */
    semanaDoMes?: number | null;
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
  /** Pastoral de quem está editando: o "Quem serve" vale só para ela (a missa é da paróquia toda). */
  pastoral: { nome: string; rotuloTodos: string };
};

type Modo = { valor: ModoMissa; titulo: string; descricao: string };

function modosDoTipo(tipo: Tipo, rotuloTodos: string): Modo[] {
  const listaTodos: Modo = {
    valor: "LISTA_TODOS",
    titulo: rotuloTodos,
    descricao: "Sem funções: todo ativo entra numa lista de presença.",
  };
  if (tipo !== "DATA_UNICA") {
    return [{ valor: "NORMAL", titulo: "Normal", descricao: "Sorteio entre quem marcou esta missa como preferida." }, listaTodos];
  }
  return [
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
    listaTodos,
  ];
}

const HOJE = new Date().toISOString().slice(0, 10);

const cartaoClasses =
  "flex cursor-pointer flex-col gap-1 rounded-xl border border-line bg-surface p-3 text-sm transition-colors hover:border-accent/50 has-[:checked]:border-accent has-[:checked]:bg-accent-soft";

function modoInicial(tipo: Tipo, valores: MissaFormProps["defaultValues"]): ModoMissa {
  if (valores?.escalarTodosAtivos) return "LISTA_TODOS";
  if (tipo === "DATA_UNICA") return valores?.comunidadeResponsavel ? "COMUNIDADE" : "TODOS_ATIVOS";
  return "NORMAL";
}

export function MissaForm({ action, defaultValues, tipoInicial, submitLabel, pastoral }: MissaFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  useActionToast(state, pending, "Missa salva.");
  const [tipo, setTipo] = useState<Tipo>(
    defaultValues?.dataUnica ? "DATA_UNICA" : defaultValues?.semanaDoMes ? "MENSAL" : (tipoInicial ?? "RECORRENTE")
  );
  const [modo, setModo] = useState<ModoMissa>(() => modoInicial(tipo, defaultValues));
  const modos = modosDoTipo(tipo, pastoral.rotuloTodos);

  function trocarTipo(novo: Tipo) {
    setTipo(novo);
    // O modo atual pode não existir no outro tipo (ex: "Sorteio entre todos" é só de data única).
    const modosNovos = modosDoTipo(novo, pastoral.rotuloTodos);
    if (!modosNovos.some((m) => m.valor === modo)) setModo(modosNovos[0].valor);
  }

  return (
    <form action={formAction} className="max-w-md space-y-5">
      <div>
        <Label>Tipo de missa</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
              value="MENSAL"
              checked={tipo === "MENSAL"}
              onChange={() => trocarTipo("MENSAL")}
              className="sr-only"
            />
            <span className="font-medium text-fg">Mensal</span>
            <span className="text-xs text-muted">Uma vez por mês (ex: 1ª sexta-feira).</span>
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

      {tipo === "MENSAL" ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="semanaDoMes">Qual no mês</Label>
            <Select id="semanaDoMes" name="semanaDoMes" defaultValue={defaultValues?.semanaDoMes ?? 1}>
              {SEMANAS_DO_MES.map((rotulo, index) => (
                <option key={rotulo} value={index + 1}>
                  {rotulo}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="diaSemana">Dia da semana</Label>
            <Select id="diaSemana" name="diaSemana" defaultValue={defaultValues?.diaSemana ?? 5}>
              {DIAS_SEMANA.map((dia, index) => (
                <option key={dia} value={index}>
                  {dia}
                </option>
              ))}
            </Select>
          </div>
        </div>
      ) : tipo === "RECORRENTE" ? (
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
        <Label>Quem serve — {pastoral.nome}</Label>
        <p className="mb-2 -mt-1 text-xs text-muted">
          Vale só para a sua pastoral. Dia, horário e comunidade são os mesmos para todas as pastorais da paróquia.
        </p>
        <div className="space-y-2">
          {modos.map((opcao) => (
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
