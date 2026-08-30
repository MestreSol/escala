"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateId, nowIso } from "@/lib/db";
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

  const { error: updateError } = await supabase
    .from("Servidor")
    .update({ ...servidorData, updatedAt: nowIso() })
    .eq("id", id);
  if (updateError) return { error: updateError.message };

  const { error: deleteError } = await supabase
    .from("ServidorMissaPreferencia")
    .delete()
    .eq("servidorId", id);
  if (deleteError) return { error: deleteError.message };

  if (missaIds.length > 0) {
    const { error: insertError } = await supabase
      .from("ServidorMissaPreferencia")
      .insert(missaIds.map((missaId) => ({ id: generateId(), servidorId: id, missaId })));
    if (insertError) return { error: insertError.message };
  }

  revalidatePath("/admin/servidores");
  redirect("/admin/servidores");
}

export async function deleteServidor(id: string) {
  const { error } = await supabase.from("Servidor").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/servidores");
  redirect("/admin/servidores");
}
