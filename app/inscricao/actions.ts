"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { servidorSchema } from "@/lib/validations";
import type { ServidorFormState } from "@/lib/types";

export async function createServidor(_prevState: ServidorFormState, formData: FormData): Promise<ServidorFormState> {
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

  await prisma.servidor.create({
    data: {
      ...servidorData,
      preferenciasMissas: {
        create: missaIds.map((missaId) => ({ missaId })),
      },
    },
  });

  redirect("/inscricao/sucesso");
}
