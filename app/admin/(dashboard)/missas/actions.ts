"use server";

import { exigirUsuario } from "@/lib/sessao";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateId, nowIso, erroDoBanco } from "@/lib/db";
import { missaSchema } from "@/lib/validations";
import type { MissaInput } from "@/lib/validations";
import { parseDataUnica } from "@/lib/occurrences";

export type MissaFormState = { error?: string };

function campo(formData: FormData, nome: string) {
  return formData.get(nome) ?? undefined;
}

function parseMissaForm(formData: FormData) {
  const tipoEnviado = formData.get("tipo");
  const tipo = tipoEnviado === "DATA_UNICA" || tipoEnviado === "MENSAL" ? tipoEnviado : "RECORRENTE";

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
    semanaDoMes: tipo === "MENSAL" ? campo(formData, "semanaDoMes") : undefined,
    modoEscalacao: campo(formData, "modoEscalacao"),
    horario: campo(formData, "horario"),
    comunidade: campo(formData, "comunidade"),
  });
}

function paraLinhaDb(dados: MissaInput) {
  const escalarTodosAtivos = dados.modoEscalacao === "LISTA_TODOS";

  if (dados.tipo === "DATA_UNICA") {
    return {
      diaSemana: null,
      semanaDoMes: null,
      dataUnica: parseDataUnica(dados.dataUnica).toISOString(),
      horario: dados.horario,
      comunidade: dados.comunidade,
      escalarTodosAtivos,
      comunidadeResponsavel: dados.modoEscalacao === "COMUNIDADE" ? dados.comunidadeResponsavel : null,
    };
  }

  return {
    diaSemana: dados.diaSemana,
    semanaDoMes: dados.tipo === "MENSAL" ? dados.semanaDoMes : null,
    dataUnica: null,
    horario: dados.horario,
    comunidade: dados.comunidade,
    escalarTodosAtivos,
    comunidadeResponsavel: null,
  };
}

export async function createMissa(_prevState: MissaFormState, formData: FormData): Promise<MissaFormState> {
  await exigirUsuario();
  const parsed = parseMissaForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const id = generateId();
  const { error } = await supabase
    .from("Missa")
    .insert({ id, ...paraLinhaDb(parsed.data), updatedAt: nowIso() });
  if (error) return erroDoBanco(error, "missa");

  revalidatePath("/admin/missas");
  redirect(`/admin/missas/${id}`);
}

export async function updateMissa(
  id: string,
  _prevState: MissaFormState,
  formData: FormData
): Promise<MissaFormState> {
  await exigirUsuario();
  const parsed = parseMissaForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { error } = await supabase
    .from("Missa")
    .update({ ...paraLinhaDb(parsed.data), updatedAt: nowIso() })
    .eq("id", id);
  if (error) return erroDoBanco(error, "missa");

  revalidatePath("/admin/missas");
  revalidatePath(`/admin/missas/${id}`);
  return {};
}

export async function deleteMissa(id: string) {
  await exigirUsuario();
  const { error } = await supabase.from("Missa").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/missas");
  redirect("/admin/missas");
}

export async function saveMissaRequisitos(missaId: string, formData: FormData) {
  await exigirUsuario();
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
