"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input, Label, Select, FieldError } from "@/components/ui/Field";
import { formatarDiaMissa } from "@/lib/occurrences";
import { formatarTelefone } from "@/lib/telefone";
import { useActionToast } from "@/components/hooks/useActionToast";
import type { MissaOption, ServidorFormState } from "@/lib/types";

type ServidorFormProps = {
  action: (prevState: ServidorFormState, formData: FormData) => Promise<ServidorFormState>;
  missas: MissaOption[];
  defaultValues?: {
    nome: string;
    /** "yyyy-MM-dd", formato esperado pelo <input type="date"> */
    dataNascimento: string;
    comunidade: string;
    categoria: string;
    missaIds: string[];
    experiente?: boolean;
    celular?: string | null;
    celularResponsavel?: string | null;
  };
  submitLabel: string;
  /** Pastoral com hierarquia (coroinhas). Sem ela (ex: ministros), o campo de grau some. */
  usaGraus: boolean;
  /** Só no painel: a inscrição pública não deixa a pessoa se declarar experiente. */
  mostrarExperiente?: boolean;
};

const HOJE = new Date().toISOString().slice(0, 10);

const GRAUS = [
  { value: "COROINHA", label: "Coroinha", descricao: "Início da caminhada no altar." },
  { value: "ACOLITO", label: "Acólito", descricao: "Também pode exercer funções de coroinha." },
  { value: "CERIMONIARIO", label: "Cerimoniário", descricao: "Também pode exercer funções de acólito e coroinha." },
];

export function ServidorForm({
  action,
  missas,
  defaultValues,
  submitLabel,
  usaGraus,
  mostrarExperiente = false,
}: ServidorFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  useActionToast(state, pending, "Servidor salvo.");
  const missaIdsSelecionadas = new Set(defaultValues?.missaIds ?? []);

  const comunidades = Array.from(
    new Set([...missas.map((m) => m.comunidade), ...(defaultValues?.comunidade ? [defaultValues.comunidade] : [])])
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <form
      action={formAction}
      className="space-y-8 rounded-2xl border border-line bg-surface p-6 sm:p-8"
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" defaultValue={defaultValues?.nome} placeholder="Seu nome completo" required />
        </div>

        <div>
          <Label htmlFor="dataNascimento">Data de nascimento</Label>
          <Input
            id="dataNascimento"
            name="dataNascimento"
            type="date"
            max={HOJE}
            defaultValue={defaultValues?.dataNascimento}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="celular">Celular</Label>
          <Input
            id="celular"
            name="celular"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            defaultValue={formatarTelefone(defaultValues?.celular)}
            placeholder="(11) 98765-4321"
          />
        </div>
        <div>
          <Label htmlFor="celularResponsavel">Celular do responsável</Label>
          <Input
            id="celularResponsavel"
            name="celularResponsavel"
            type="tel"
            inputMode="tel"
            defaultValue={formatarTelefone(defaultValues?.celularResponsavel)}
            placeholder="(11) 98765-4321"
          />
          <p className="mt-1.5 text-xs text-muted">Pai, mãe ou quem cuida — para menores de idade.</p>
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

      {usaGraus ? (
        <div>
          <Label>Categoria</Label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {GRAUS.map((grau) => (
              <label
                key={grau.value}
                className="relative flex cursor-pointer flex-col gap-1 rounded-xl border border-line bg-surface p-3 text-sm transition-colors hover:border-accent/50 has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:ring-1 has-[:checked]:ring-accent/40"
              >
                <input
                  type="radio"
                  name="categoria"
                  value={grau.value}
                  defaultChecked={(defaultValues?.categoria ?? "COROINHA") === grau.value}
                  className="absolute right-3 top-3 h-4 w-4 border-line-strong text-accent focus:ring-accent/40"
                  required
                />
                <span className="pr-6 font-medium text-fg">{grau.label}</span>
                <span className="text-xs text-muted">{grau.descricao}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {mostrarExperiente ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-3 text-sm transition-colors hover:border-accent/50 has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
          <input
            type="checkbox"
            name="experiente"
            defaultChecked={defaultValues?.experiente ?? false}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            <span className="block font-medium text-fg">Experiente</span>
            <span className="block text-xs text-muted">
              Nas funções em dupla ou em par, a escala junta sempre um experiente com um inexperiente.
            </span>
          </span>
        </label>
      ) : null}

      <div>
        <Label>Missas que prefiro servir</Label>
        {missas.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma missa cadastrada no momento.</p>
        ) : (
          <div className="space-y-2">
            {missas.map((missa) => (
              <label
                key={missa.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg transition-colors hover:border-accent/50 has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
              >
                <input
                  type="checkbox"
                  name="missaIds"
                  value={missa.id}
                  defaultChecked={missaIdsSelecionadas.has(missa.id)}
                  className="h-4 w-4 rounded border-line-strong text-accent focus:ring-accent/40"
                />
                <span>
                  <span className="font-medium text-fg">
                    {formatarDiaMissa(missa)} às {missa.horario}
                  </span>
                  <span className="text-muted"> — {missa.comunidade}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Armadilha pra robô de spam: invisível e fora do Tab, gente não preenche
          (ver createServidor em app/[paroquia]/inscricao/actions.ts). */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="site">Não preencha este campo</label>
        <input id="site" name="site" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <FieldError>{state.error}</FieldError>
      <SubmitButton pending={pending} pendingLabel="Enviando" className="w-full">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
