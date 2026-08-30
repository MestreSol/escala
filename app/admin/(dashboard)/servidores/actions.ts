"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { servidorSchema } from "@/lib/validations";
import type { ServidorFormState } from "@/lib/types";

export async function updateServidor(
  id: string,
  _prevState: ServidorFormState,
  formData: FormData
): Promise<ServidorFormState> {
  const parsed = servidorSchema.safeParse({
    nome: formData.get("nome"),
    idade: formData.get("idade"),
    comunidade: formData.get("comunidade"),
    categoria: formData.get("categoria"),
    missaIds: formData.getAll("missaIds"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { missaIds, ...servidorData } = parsed.data;

  await prisma.$transaction([
    prisma.servidor.update({ where: { id }, data: servidorData }),
    prisma.servidorMissaPreferencia.deleteMany({ where: { servidorId: id } }),
    prisma.servidorMissaPreferencia.createMany({
      data: missaIds.map((missaId) => ({ servidorId: id, missaId })),
    }),
  ]);

  revalidatePath("/admin/servidores");
  redirect("/admin/servidores");
}

export async function deleteServidor(id: string) {
  await prisma.servidor.delete({ where: { id } });
  revalidatePath("/admin/servidores");
  redirect("/admin/servidores");
}
