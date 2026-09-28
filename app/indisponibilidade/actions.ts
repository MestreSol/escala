"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { setIndisponibilidadeDoServidorNoPeriodo } from "@/lib/servidorIndisponibilidade";
import { primeiroMesAberto } from "@/lib/escalaPublicada";
import { periodoDoMes } from "@/lib/occurrences";

export async function salvarIndisponibilidade(servidorId: string, mes: string, formData: FormData) {
  // Mês com escala já fechada (ou que já passou) não aceita mais mudança —
  // a tela nem mostra, mas os argumentos vêm do navegador, então confere aqui.
  const mesMinimo = await primeiroMesAberto();
  if (!/^\d{4}-\d{2}$/.test(mes) || mes < mesMinimo) {
    redirect(`/indisponibilidade?servidorId=${servidorId}`);
  }

  const { periodoInicio, periodoFim } = periodoDoMes(mes);
  const datasSelecionadas = formData
    .getAll("datas")
    .map((valor) => new Date(String(valor)))
    .filter((data) => data >= periodoInicio && data <= periodoFim);

  await setIndisponibilidadeDoServidorNoPeriodo(servidorId, periodoInicio, periodoFim, datasSelecionadas);

  revalidatePath("/indisponibilidade");
  redirect(`/indisponibilidade?mes=${mes}&servidorId=${servidorId}&salvo=1`);
}
