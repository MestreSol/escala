"use server";

import { exigirUsuario } from "@/lib/sessao";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateId, nowIso, erroDoBanco } from "@/lib/db";
import { servidorSchema } from "@/lib/validations";
import { setVinculosDoServidor } from "@/lib/servidorVinculo";
import { enviarFotoServidor } from "@/lib/storage";
import type { ServidorFormState } from "@/lib/types";

export async function updateServidor(
  id: string,
  _prevState: ServidorFormState,
  formData: FormData
): Promise<ServidorFormState> {
  await exigirUsuario();
  const parsed = servidorSchema.safeParse({
    nome: formData.get("nome"),
    dataNascimento: formData.get("dataNascimento"),
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
  if (updateError) return erroDoBanco(updateError, "servidor");

  const { error: deleteError } = await supabase
    .from("ServidorMissaPreferencia")
    .delete()
    .eq("servidorId", id);
  if (deleteError) return erroDoBanco(deleteError, "servidor");

  if (missaIds.length > 0) {
    const { error: insertError } = await supabase
      .from("ServidorMissaPreferencia")
      .insert(missaIds.map((missaId) => ({ id: generateId(), servidorId: id, missaId })));
    if (insertError) return erroDoBanco(insertError, "servidor");
  }

  revalidatePath("/admin/servidores");
  redirect("/admin/servidores");
}

export async function saveServidorVinculos(servidorId: string, formData: FormData) {
  await exigirUsuario();
  const { data: outrosServidores, error } = await supabase
    .from("Servidor")
    .select("id")
    .eq("ativo", true)
    .neq("id", servidorId)
    .returns<{ id: string }[]>();
  if (error) throw error;

  const selecionados = (outrosServidores ?? [])
    .map((s) => s.id)
    .filter((id) => formData.get(`vinculo_${id}`) === "on");

  await setVinculosDoServidor(servidorId, selecionados);

  revalidatePath(`/admin/servidores/${servidorId}`);
}

export async function atualizarFotoServidor(servidorId: string, formData: FormData) {
  await exigirUsuario();
  const arquivo = formData.get("foto");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    throw new Error("Selecione uma imagem.");
  }

  const fotoUrl = await enviarFotoServidor(servidorId, arquivo);

  const { error } = await supabase.from("Servidor").update({ fotoUrl, updatedAt: nowIso() }).eq("id", servidorId);
  if (error) throw error;

  revalidatePath(`/admin/servidores/${servidorId}`);
  revalidatePath("/admin/servidores");
}

export async function deleteServidor(id: string) {
  await exigirUsuario();
  const { error } = await supabase.from("Servidor").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/servidores");
  redirect("/admin/servidores");
}
