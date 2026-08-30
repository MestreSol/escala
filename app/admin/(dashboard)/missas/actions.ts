"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { missaSchema } from "@/lib/validations";

export type MissaFormState = { error?: string };

function parseMissaForm(formData: FormData) {
  return missaSchema.safeParse({
    diaSemana: formData.get("diaSemana"),
    horario: formData.get("horario"),
    comunidade: formData.get("comunidade"),
  });
}

export async function createMissa(_prevState: MissaFormState, formData: FormData): Promise<MissaFormState> {
  const parsed = parseMissaForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const missa = await prisma.missa.create({ data: parsed.data });
  revalidatePath("/admin/missas");
  redirect(`/admin/missas/${missa.id}`);
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

  await prisma.missa.update({ where: { id }, data: parsed.data });
  revalidatePath("/admin/missas");
  revalidatePath(`/admin/missas/${id}`);
  return {};
}

export async function deleteMissa(id: string) {
  await prisma.missa.delete({ where: { id } });
  revalidatePath("/admin/missas");
  redirect("/admin/missas");
}

export async function saveMissaRequisitos(missaId: string, formData: FormData) {
  const funcoes = await prisma.funcao.findMany({ where: { ativo: true } });

  await prisma.$transaction(
    funcoes.map((funcao) => {
      const ativo = formData.get(`req_${funcao.id}_ativo`) === "on";
      const quantidadeRaw = Number(formData.get(`req_${funcao.id}_quantidade`) ?? 1);
      const quantidade = Number.isFinite(quantidadeRaw) && quantidadeRaw >= 1 ? Math.floor(quantidadeRaw) : 1;

      if (ativo) {
        return prisma.missaFuncaoRequisito.upsert({
          where: { missaId_funcaoId: { missaId, funcaoId: funcao.id } },
          update: { quantidade, ativo: true },
          create: { missaId, funcaoId: funcao.id, quantidade, ativo: true },
        });
      }

      return prisma.missaFuncaoRequisito.deleteMany({
        where: { missaId, funcaoId: funcao.id },
      });
    })
  );

  revalidatePath(`/admin/missas/${missaId}`);
}
