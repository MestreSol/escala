"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { nowIso } from "@/lib/db";
import { AvisoAoUsuario, comAvisos } from "@/lib/avisos";
import { exigirPastoralParaPresenca } from "@/lib/sessao";
import { garantirDaPastoral } from "@/lib/paroquia";
import { contatoSchema } from "@/lib/validations";
import { enviarFotoServidor } from "@/lib/storage";

// Também usadas pelo PRESENCA: só mexem em foto e telefones, nunca no resto do cadastro.

function revalidar(servidorId: string) {
  revalidatePath("/admin/contatos");
  revalidatePath(`/admin/contatos/${servidorId}`);
  revalidatePath("/admin/servidores");
  revalidatePath(`/admin/servidores/${servidorId}`);
  revalidatePath("/admin/presenca");
}

async function salvarContatosInterno(servidorId: string, formData: FormData) {
  const { pastoralId } = await exigirPastoralParaPresenca();
  await garantirDaPastoral("Servidor", servidorId, pastoralId);
  const parsed = contatoSchema.safeParse({
    celular: formData.get("celular") ?? undefined,
    celularResponsavel: formData.get("celularResponsavel") ?? undefined,
  });
  if (!parsed.success) throw new AvisoAoUsuario(parsed.error.issues[0]?.message ?? "Telefone inválido.");

  const { error } = await supabase
    .from("Servidor")
    .update({ ...parsed.data, updatedAt: nowIso() })
    .eq("id", servidorId)
    .eq("pastoralId", pastoralId);
  if (error) throw error;
  revalidar(servidorId);
}

export async function salvarContatos(...args: Parameters<typeof salvarContatosInterno>) {
  return comAvisos(() => salvarContatosInterno(...args));
}

async function salvarFotoInterno(servidorId: string, formData: FormData) {
  const { pastoralId } = await exigirPastoralParaPresenca();
  await garantirDaPastoral("Servidor", servidorId, pastoralId);
  const arquivo = formData.get("foto");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    throw new AvisoAoUsuario("Selecione uma imagem.");
  }

  const fotoUrl = await enviarFotoServidor(servidorId, arquivo);
  const { error } = await supabase
    .from("Servidor")
    .update({ fotoUrl, updatedAt: nowIso() })
    .eq("id", servidorId)
    .eq("pastoralId", pastoralId);
  if (error) throw error;
  revalidar(servidorId);
}

export async function salvarFoto(...args: Parameters<typeof salvarFotoInterno>) {
  return comAvisos(() => salvarFotoInterno(...args));
}
