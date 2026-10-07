"use server";

import { exigirPastoral } from "@/lib/sessao";
import { garantirDaParoquia, garantirDaPastoral } from "@/lib/paroquia";
import { GRAU_UNICO, usaGraus } from "@/lib/constants";
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
  const { paroquiaId, pastoral } = await exigirPastoral();
  await garantirDaPastoral("Servidor", id, pastoral.id);
  const parsed = servidorSchema.safeParse({
    nome: formData.get("nome"),
    dataNascimento: formData.get("dataNascimento"),
    comunidade: formData.get("comunidade"),
    // Pastoral sem graus (ex: ministros): todo mundo no mesmo nível.
    categoria: usaGraus(pastoral.tipo) ? formData.get("categoria") : GRAU_UNICO,
    missaIds: formData.getAll("missaIds"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { missaIds, ...servidorData } = parsed.data;
  await garantirDaParoquia("Missa", missaIds, paroquiaId);

  const { error: updateError } = await supabase
    .from("Servidor")
    .update({ ...servidorData, experiente: formData.get("experiente") === "on", updatedAt: nowIso() })
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
  const { pastoralId } = await exigirPastoral();
  await garantirDaPastoral("Servidor", servidorId, pastoralId);
  const { data: outrosServidores, error } = await supabase
    .from("Servidor")
    .select("id")
    .eq("pastoralId", pastoralId)
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
  const { pastoralId } = await exigirPastoral();
  await garantirDaPastoral("Servidor", servidorId, pastoralId);
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
  const { pastoralId } = await exigirPastoral();
  const { error } = await supabase.from("Servidor").delete().eq("id", id).eq("pastoralId", pastoralId);
  if (error) throw error;

  revalidatePath("/admin/servidores");
  redirect("/admin/servidores");
}

export async function alternarExperiente(servidorId: string) {
  const { pastoral } = await exigirPastoral();
  await garantirDaPastoral("Servidor", servidorId, pastoral.id);
  const { data: servidor, error } = await supabase
    .from("Servidor")
    .select("experiente")
    .eq("id", servidorId)
    .single<{ experiente: boolean }>();
  if (error) throw error;

  const { error: updateError } = await supabase
    .from("Servidor")
    .update({ experiente: !servidor.experiente, updatedAt: nowIso() })
    .eq("id", servidorId);
  if (updateError) throw updateError;

  revalidatePath("/admin/servidores");
  revalidatePath(`/admin/servidores/${servidorId}`);
}
