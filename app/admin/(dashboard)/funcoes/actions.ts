"use server";

import { comAvisos, comAvisosNoFormulario } from "@/lib/avisos";
import { exigirPastoral } from "@/lib/sessao";
import { garantirDaPastoral } from "@/lib/paroquia";
import { GRAU_UNICO, usaGraus } from "@/lib/constants";
import type { TipoPastoral } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateId, nowIso, erroDoBanco } from "@/lib/db";
import { funcaoSchema } from "@/lib/validations";
import { setFuncoesQuePodeAssumir } from "@/lib/funcaoAcumulacao";
import { setFuncoesPareadas } from "@/lib/funcaoPar";

export type FuncaoFormState = { error?: string };

function parseFuncaoForm(formData: FormData, tipo: TipoPastoral) {
  return funcaoSchema.safeParse({
    nome: formData.get("nome"),
    prioridade: formData.get("prioridade"),
    // Pastoral sem graus (ex: ministros): toda função exige só o grau único.
    grauMinimo: usaGraus(tipo) ? formData.get("grauMinimo") : GRAU_UNICO,
    quantidadePadrao: formData.get("quantidadePadrao"),
    exigeGrupoCompleto: formData.get("exigeGrupoCompleto") === "on",
  });
}

async function createFuncaoInterno(_prevState: FuncaoFormState, formData: FormData): Promise<FuncaoFormState> {
  const { paroquiaId, pastoral } = await exigirPastoral();
  const parsed = parseFuncaoForm(formData, pastoral.tipo);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { error } = await supabase
    .from("Funcao")
    .insert({ id: generateId(), paroquiaId, pastoralId: pastoral.id, ...parsed.data, updatedAt: nowIso() });
  if (error) return erroDoBanco(error, "função");

  revalidatePath("/admin/funcoes");
  redirect("/admin/funcoes");
}


export async function createFuncao(...args: Parameters<typeof createFuncaoInterno>) {
  return comAvisosNoFormulario(() => createFuncaoInterno(...args));
}
async function updateFuncaoInterno(
  id: string,
  _prevState: FuncaoFormState,
  formData: FormData
): Promise<FuncaoFormState> {
  const { pastoral } = await exigirPastoral();
  const parsed = parseFuncaoForm(formData, pastoral.tipo);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { error } = await supabase
    .from("Funcao")
    .update({ ...parsed.data, updatedAt: nowIso() })
    .eq("id", id)
    .eq("pastoralId", pastoral.id);
  if (error) return erroDoBanco(error, "função");

  revalidatePath("/admin/funcoes");
  revalidatePath(`/admin/funcoes/${id}`);
  return {};
}


export async function updateFuncao(...args: Parameters<typeof updateFuncaoInterno>) {
  return comAvisosNoFormulario(() => updateFuncaoInterno(...args));
}
async function deleteFuncaoInterno(id: string) {
  const { pastoralId } = await exigirPastoral();
  const { error } = await supabase.from("Funcao").delete().eq("id", id).eq("pastoralId", pastoralId);
  if (error) throw error;

  revalidatePath("/admin/funcoes");
  redirect("/admin/funcoes");
}


export async function deleteFuncao(...args: Parameters<typeof deleteFuncaoInterno>) {
  return comAvisos(() => deleteFuncaoInterno(...args));
}
async function saveFuncaoAcumulacoesInterno(funcaoId: string, formData: FormData) {
  const { pastoralId } = await exigirPastoral();
  await garantirDaPastoral("Funcao", funcaoId, pastoralId);
  const { data: outrasFuncoes, error } = await supabase
    .from("Funcao")
    .select("id")
    .eq("pastoralId", pastoralId)
    .eq("ativo", true)
    .neq("id", funcaoId)
    .returns<{ id: string }[]>();
  if (error) throw error;

  const selecionadas = (outrasFuncoes ?? [])
    .map((f) => f.id)
    .filter((id) => formData.get(`assume_${id}`) === "on");

  await setFuncoesQuePodeAssumir(funcaoId, selecionadas);

  revalidatePath(`/admin/funcoes/${funcaoId}`);
}


export async function saveFuncaoAcumulacoes(...args: Parameters<typeof saveFuncaoAcumulacoesInterno>) {
  return comAvisos(() => saveFuncaoAcumulacoesInterno(...args));
}
async function saveFuncaoParesInterno(funcaoId: string, formData: FormData) {
  const { pastoralId } = await exigirPastoral();
  await garantirDaPastoral("Funcao", funcaoId, pastoralId);
  const { data: outrasFuncoes, error } = await supabase
    .from("Funcao")
    .select("id")
    .eq("pastoralId", pastoralId)
    .eq("ativo", true)
    .neq("id", funcaoId)
    .returns<{ id: string }[]>();
  if (error) throw error;

  const selecionadas = (outrasFuncoes ?? [])
    .map((f) => f.id)
    .filter((id) => formData.get(`par_${id}`) === "on");

  await setFuncoesPareadas(pastoralId, funcaoId, selecionadas);

  revalidatePath(`/admin/funcoes/${funcaoId}`);
}


export async function saveFuncaoPares(...args: Parameters<typeof saveFuncaoParesInterno>) {
  return comAvisos(() => saveFuncaoParesInterno(...args));
}