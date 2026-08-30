"use server";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateId, nowIso } from "@/lib/db";
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
  const servidorId = generateId();

  const { error: servidorError } = await supabase
    .from("Servidor")
    .insert({ id: servidorId, ...servidorData, updatedAt: nowIso() });
  if (servidorError) return { error: servidorError.message };

  if (missaIds.length > 0) {
    const { error: preferenciasError } = await supabase
      .from("ServidorMissaPreferencia")
      .insert(missaIds.map((missaId) => ({ id: generateId(), servidorId, missaId })));
    if (preferenciasError) return { error: preferenciasError.message };
  }

  redirect("/inscricao/sucesso");
}
