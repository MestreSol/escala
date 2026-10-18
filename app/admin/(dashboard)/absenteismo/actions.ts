"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { nowIso } from "@/lib/db";
import { comAvisos } from "@/lib/avisos";
import { exigirPastoral } from "@/lib/sessao";
import { garantirDaPastoral } from "@/lib/paroquia";

function revalidar(servidorId: string) {
  revalidatePath("/admin/absenteismo");
  revalidatePath(`/admin/absenteismo/${servidorId}`);
  revalidatePath("/admin/acompanhamento");
}

/**
 * Corrige uma falta registrada por engano: "presente" = a pessoa veio;
 * "remover" = volta pra "não registrada" (não conta nem como falta nem como presença).
 * Só mexe em linhas que estão como falta.
 */
async function corrigirFaltaInterno(servidorId: string, atribuicaoId: string, como: "presente" | "remover") {
  const { pastoralId } = await exigirPastoral();
  await garantirDaPastoral("Servidor", servidorId, pastoralId);
  const { error } = await supabase
    .from("EscalaAtribuicao")
    .update({ presente: como === "presente" ? true : null, updatedAt: nowIso() })
    .eq("id", atribuicaoId)
    .eq("servidorId", servidorId)
    .eq("pastoralId", pastoralId)
    .eq("presente", false);
  if (error) throw error;
  revalidar(servidorId);
}

export async function corrigirFalta(...args: Parameters<typeof corrigirFaltaInterno>) {
  return comAvisos(() => corrigirFaltaInterno(...args));
}

/** Zera as faltas do servidor: todas voltam pra "não registrada". */
async function removerTodasAsFaltasInterno(servidorId: string) {
  const { pastoralId } = await exigirPastoral();
  await garantirDaPastoral("Servidor", servidorId, pastoralId);
  const { error } = await supabase
    .from("EscalaAtribuicao")
    .update({ presente: null, updatedAt: nowIso() })
    .eq("servidorId", servidorId)
    .eq("pastoralId", pastoralId)
    .eq("presente", false);
  if (error) throw error;
  revalidar(servidorId);
}

export async function removerTodasAsFaltas(...args: Parameters<typeof removerTodasAsFaltasInterno>) {
  return comAvisos(() => removerTodasAsFaltasInterno(...args));
}
