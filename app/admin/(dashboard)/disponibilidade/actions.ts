"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { generateId } from "@/lib/db";
import { AvisoAoUsuario, comAvisos } from "@/lib/avisos";
import { exigirPastoral } from "@/lib/sessao";
import { garantirDaParoquia, garantirDaPastoral } from "@/lib/paroquia";
import { agoraNaParoquia, periodoDoMes } from "@/lib/occurrences";
import { setIndisponibilidadeDoServidorNoPeriodo } from "@/lib/servidorIndisponibilidade";

function revalidar(servidorId: string) {
  revalidatePath("/admin/disponibilidade");
  revalidatePath("/admin/servidores");
  revalidatePath(`/admin/servidores/${servidorId}`);
}

async function salvarMissasDoServidorInterno(servidorId: string, formData: FormData) {
  const { paroquiaId, pastoral } = await exigirPastoral();
  await garantirDaPastoral("Servidor", servidorId, pastoral.id);
  const missaIds = [...new Set(formData.getAll("missaIds").map(String))];
  await garantirDaParoquia("Missa", missaIds, paroquiaId);

  const { error: deleteError } = await supabase.from("ServidorMissaPreferencia").delete().eq("servidorId", servidorId);
  if (deleteError) throw deleteError;
  if (missaIds.length > 0) {
    const { error: insertError } = await supabase
      .from("ServidorMissaPreferencia")
      .insert(missaIds.map((missaId) => ({ id: generateId(), servidorId, missaId })));
    if (insertError) throw insertError;
  }

  revalidar(servidorId);
}

/** Missas fixas em que o servidor pode ser escalado (o gerador só o sorteia nelas). */
export async function salvarMissasDoServidor(...args: Parameters<typeof salvarMissasDoServidorInterno>) {
  return comAvisos(() => salvarMissasDoServidorInterno(...args));
}

async function salvarDiasIndisponiveisInterno(servidorId: string, mes: string, formData: FormData) {
  const { pastoral } = await exigirPastoral();
  await garantirDaPastoral("Servidor", servidorId, pastoral.id);
  const hoje = agoraNaParoquia().slice(0, 10);
  if (!/^\d{4}-\d{2}$/.test(mes) || mes < hoje.slice(0, 7)) {
    throw new AvisoAoUsuario("Esse mês já passou e não pode mais ser alterado.");
  }

  // Dias que já passaram ficam como estão no banco, independente do que veio do navegador.
  const { periodoInicio, periodoFim } = periodoDoMes(mes);
  const inicioAberto = new Date(`${hoje}T00:00:00.000Z`);
  const { data: passadas, error } = await supabase
    .from("ServidorIndisponibilidade")
    .select("data")
    .eq("servidorId", servidorId)
    .gte("data", periodoInicio.toISOString())
    .lt("data", inicioAberto.toISOString())
    .returns<{ data: string }[]>();
  if (error) throw error;

  const datas = [
    ...new Map(
      [
        ...(passadas ?? []).map((linha) => new Date(linha.data.endsWith("Z") ? linha.data : `${linha.data}Z`)),
        ...formData
          .getAll("datas")
          .map((valor) => new Date(String(valor)))
          .filter((data) => data >= inicioAberto && data >= periodoInicio && data <= periodoFim),
      ].map((data) => [data.toISOString(), data] as const)
    ).values(),
  ];

  await setIndisponibilidadeDoServidorNoPeriodo(servidorId, periodoInicio, periodoFim, datas);
  revalidar(servidorId);
}

/** Substitui os dias em que o servidor não pode servir no mês (a partir de hoje). */
export async function salvarDiasIndisponiveis(...args: Parameters<typeof salvarDiasIndisponiveisInterno>) {
  return comAvisos(() => salvarDiasIndisponiveisInterno(...args));
}
