"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateId, nowIso } from "@/lib/db";
import { funcaoSchema } from "@/lib/validations";
import { setFuncoesQuePodeAssumir } from "@/lib/funcaoAcumulacao";

export type FuncaoFormState = { error?: string };

function parseFuncaoForm(formData: FormData) {
  return funcaoSchema.safeParse({
    nome: formData.get("nome"),
    prioridade: formData.get("prioridade"),
    grauMinimo: formData.get("grauMinimo"),
    quantidadePadrao: formData.get("quantidadePadrao"),
    exigeGrupoCompleto: formData.get("exigeGrupoCompleto") === "on",
  });
}

export async function createFuncao(_prevState: FuncaoFormState, formData: FormData): Promise<FuncaoFormState> {
  const parsed = parseFuncaoForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { error } = await supabase
    .from("Funcao")
    .insert({ id: generateId(), ...parsed.data, updatedAt: nowIso() });
  if (error) return { error: error.message };

  revalidatePath("/admin/funcoes");
  redirect("/admin/funcoes");
}

export async function updateFuncao(
  id: string,
  _prevState: FuncaoFormState,
  formData: FormData
): Promise<FuncaoFormState> {
  const parsed = parseFuncaoForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { error } = await supabase
    .from("Funcao")
    .update({ ...parsed.data, updatedAt: nowIso() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/funcoes");
  revalidatePath(`/admin/funcoes/${id}`);
  return {};
}

export async function deleteFuncao(id: string) {
  const { error } = await supabase.from("Funcao").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/funcoes");
  redirect("/admin/funcoes");
}

export async function saveFuncaoAcumulacoes(funcaoId: string, formData: FormData) {
  const { data: outrasFuncoes, error } = await supabase
    .from("Funcao")
    .select("id")
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
