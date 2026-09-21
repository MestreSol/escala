"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateId, nowIso } from "@/lib/db";
import { missaSchema } from "@/lib/validations";
import type { MissaInput } from "@/lib/validations";

export type MissaFormState = { error?: string };

// FormData.get devolve null pra campo ausente (ex: comunidadeResponsavel só
// existe no form quando modoEscalacao é COMUNIDADE) — zod .optional()/.default()
// só tratam undefined, não null, e rejeitavam com "expected string, received null".
function campo(formData: FormData, nome: string) {
  return formData.get(nome) ?? undefined;
}

function parseMissaForm(formData: FormData) {
  const tipo = formData.get("tipo") === "DATA_UNICA" ? "DATA_UNICA" : "RECORRENTE";

  if (tipo === "DATA_UNICA") {
    return missaSchema.safeParse({
      tipo,
      dataUnica: campo(formData, "dataUnica"),
      modoEscalacao: campo(formData, "modoEscalacao"),
      comunidadeResponsavel: campo(formData, "comunidadeResponsavel"),
      horario: campo(formData, "horario"),
      comunidade: campo(formData, "comunidade"),
    });
  }

  return missaSchema.safeParse({
    tipo,
    diaSemana: campo(formData, "diaSemana"),
    horario: campo(formData, "horario"),
    comunidade: campo(formData, "comunidade"),
  });
}

/**
 * Sempre grava os 3 campos de "missa grande" explicitamente (mesmo em
 * branco/false pra missa recorrente) — sem isso, editar uma missa grande de
 * volta pra recorrente deixaria dataUnica/escalarTodosAtivos/comunidadeResponsavel
 * "grudados" no banco.
 */
function paraLinhaDb(dados: MissaInput) {
  if (dados.tipo === "DATA_UNICA") {
    return {
      diaSemana: dados.dataUnica.getUTCDay(),
      horario: dados.horario,
      comunidade: dados.comunidade,
      dataUnica: dados.dataUnica.toISOString(),
      escalarTodosAtivos: dados.modoEscalacao === "TODOS_ATIVOS",
      comunidadeResponsavel: dados.modoEscalacao === "COMUNIDADE" ? dados.comunidadeResponsavel : null,
    };
  }

  return {
    diaSemana: dados.diaSemana,
    horario: dados.horario,
    comunidade: dados.comunidade,
    dataUnica: null,
    escalarTodosAtivos: false,
    comunidadeResponsavel: null,
  };
}

export async function createMissa(_prevState: MissaFormState, formData: FormData): Promise<MissaFormState> {
  const parsed = parseMissaForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const id = generateId();
  const { error } = await supabase
    .from("Missa")
    .insert({ id, ...paraLinhaDb(parsed.data), updatedAt: nowIso() });
  if (error) return { error: error.message };

  revalidatePath("/admin/missas");
  redirect(`/admin/missas/${id}`);
}

export async function updateMissa(
  id: string,
  _prevState: MissaFormState,
  formData: FormData
): Promise<MissaFormState> {
  const parsed = parseMissaForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { error } = await supabase
    .from("Missa")
    .update({ ...paraLinhaDb(parsed.data), updatedAt: nowIso() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/missas");
  revalidatePath(`/admin/missas/${id}`);
  return {};
}

export async function deleteMissa(id: string) {
  const { error } = await supabase.from("Missa").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/missas");
  redirect("/admin/missas");
}

export async function saveMissaRequisitos(missaId: string, formData: FormData) {
  const { data: funcoes, error: funcoesError } = await supabase
    .from("Funcao")
    .select("id")
    .eq("ativo", true)
    .returns<{ id: string }[]>();
  if (funcoesError) throw funcoesError;

  const { data: existentes, error: existentesError } = await supabase
    .from("MissaFuncaoRequisito")
    .select("id, funcaoId")
    .eq("missaId", missaId)
    .returns<{ id: string; funcaoId: string }[]>();
  if (existentesError) throw existentesError;

  const idExistentePorFuncao = new Map((existentes ?? []).map((r) => [r.funcaoId, r.id]));

  const paraSalvar: Array<{
    id: string;
    missaId: string;
    funcaoId: string;
    quantidade: number;
    ativo: boolean;
  }> = [];
  const funcaoIdsParaRemover: string[] = [];

  for (const funcao of funcoes ?? []) {
    const ativo = formData.get(`req_${funcao.id}_ativo`) === "on";
    const quantidadeRaw = Number(formData.get(`req_${funcao.id}_quantidade`) ?? 1);
    const quantidade = Number.isFinite(quantidadeRaw) && quantidadeRaw >= 1 ? Math.floor(quantidadeRaw) : 1;

    if (ativo) {
      paraSalvar.push({
        id: idExistentePorFuncao.get(funcao.id) ?? generateId(),
        missaId,
        funcaoId: funcao.id,
        quantidade,
        ativo: true,
      });
    } else if (idExistentePorFuncao.has(funcao.id)) {
      funcaoIdsParaRemover.push(funcao.id);
    }
  }

  if (paraSalvar.length > 0) {
    const { error } = await supabase
      .from("MissaFuncaoRequisito")
      .upsert(paraSalvar, { onConflict: "missaId,funcaoId" });
    if (error) throw error;
  }

  if (funcaoIdsParaRemover.length > 0) {
    const { error } = await supabase
      .from("MissaFuncaoRequisito")
      .delete()
      .eq("missaId", missaId)
      .in("funcaoId", funcaoIdsParaRemover);
    if (error) throw error;
  }

  revalidatePath(`/admin/missas/${missaId}`);
}
