"use server";

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

export async function createFuncao(_prevState: FuncaoFormState, formData: FormData): Promise<FuncaoFormState> {
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

export async function updateFuncao(
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

export async function deleteFuncao(id: string) {
  const { pastoralId } = await exigirPastoral();
  const { error } = await supabase.from("Funcao").delete().eq("id", id).eq("pastoralId", pastoralId);
  if (error) throw error;

  revalidatePath("/admin/funcoes");
  redirect("/admin/funcoes");
}

export async function saveFuncaoAcumulacoes(funcaoId: string, formData: FormData) {
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

export async function saveFuncaoPares(funcaoId: string, formData: FormData) {
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
