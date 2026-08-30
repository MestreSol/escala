"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { funcaoSchema } from "@/lib/validations";

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

  await prisma.funcao.create({ data: parsed.data });
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

  await prisma.funcao.update({ where: { id }, data: parsed.data });
  revalidatePath("/admin/funcoes");
  revalidatePath(`/admin/funcoes/${id}`);
  return {};
}

export async function deleteFuncao(id: string) {
  await prisma.funcao.delete({ where: { id } });
  revalidatePath("/admin/funcoes");
  redirect("/admin/funcoes");
}

export async function saveFuncaoAcumulacoes(funcaoId: string, formData: FormData) {
  const outrasFuncoes = await prisma.funcao.findMany({
    where: { ativo: true, id: { not: funcaoId } },
    select: { id: true },
  });

  const selecionadas = outrasFuncoes
    .map((f) => f.id)
    .filter((id) => formData.get(`assume_${id}`) === "on");

  await prisma.funcao.update({
    where: { id: funcaoId },
    data: { podeAssumir: { set: selecionadas.map((id) => ({ id })) } },
  });

  revalidatePath(`/admin/funcoes/${funcaoId}`);
}
