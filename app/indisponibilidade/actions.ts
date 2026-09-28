"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { setIndisponibilidadeDoServidorNoPeriodo } from "@/lib/servidorIndisponibilidade";
import { primeiroMesAberto } from "@/lib/escalaPublicada";
import { periodoDoMes } from "@/lib/occurrences";
import { supabase } from "@/lib/supabase";

const FORMATO_ID = /^[0-9a-f-]{8,64}$/i;

export async function salvarIndisponibilidade(servidorId: string, mes: string, formData: FormData) {
  // Página pública (sem login): os argumentos vêm do navegador e podem ser
  // qualquer coisa — só aceita id de servidor ativo de verdade.
  if (!FORMATO_ID.test(servidorId)) redirect("/indisponibilidade");
  const { data: servidor, error } = await supabase
    .from("Servidor")
    .select("id")
    .eq("id", servidorId)
    .eq("ativo", true)
    .maybeSingle();
  if (error) throw error;
  if (!servidor) redirect("/indisponibilidade");

  // Mês com escala já fechada (ou que já passou) não aceita mais mudança —
  // a tela nem mostra, mas os argumentos vêm do navegador, então confere aqui.
  const mesMinimo = await primeiroMesAberto();
  if (!/^\d{4}-\d{2}$/.test(mes) || mes < mesMinimo) {
    redirect(`/indisponibilidade?servidorId=${encodeURIComponent(servidorId)}`);
  }

  const { periodoInicio, periodoFim } = periodoDoMes(mes);
  // Datas inválidas (NaN) caem fora do filtro; repetidas viram uma só (a
  // tabela tem unique servidor+data e o insert falharia inteiro).
  const datasSelecionadas = [
    ...new Map(
      formData
        .getAll("datas")
        .map((valor) => new Date(String(valor)))
        .filter((data) => data >= periodoInicio && data <= periodoFim)
        .map((data) => [data.toISOString(), data] as const)
    ).values(),
  ];

  await setIndisponibilidadeDoServidorNoPeriodo(servidorId, periodoInicio, periodoFim, datasSelecionadas);

  revalidatePath("/indisponibilidade");
  redirect(`/indisponibilidade?mes=${mes}&servidorId=${servidorId}&salvo=1`);
}
