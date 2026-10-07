"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { setIndisponibilidadeDoServidorNoPeriodo } from "@/lib/servidorIndisponibilidade";
import { primeiroMesAberto } from "@/lib/escalaPublicada";
import { periodoDoMes } from "@/lib/occurrences";
import { supabase } from "@/lib/supabase";
import { pastoralPublica } from "@/lib/paroquia";

const FORMATO_ID = /^[0-9a-f-]{8,64}$/i;

export async function salvarIndisponibilidade(
  slugParoquia: string,
  slugPastoral: string,
  servidorId: string,
  mes: string,
  formData: FormData
) {
  // Página pública (sem login): os argumentos vêm do navegador e podem ser
  // qualquer coisa — só aceita id de servidor ativo de verdade, da pastoral.
  const { paroquia, pastoral } = await pastoralPublica(slugParoquia, slugPastoral);
  const pagina = `/${paroquia.slug}/${pastoral.slug}/indisponibilidade`;
  if (!FORMATO_ID.test(servidorId)) redirect(pagina);
  const { data: servidor, error } = await supabase
    .from("Servidor")
    .select("id")
    .eq("id", servidorId)
    .eq("pastoralId", pastoral.id)
    .eq("ativo", true)
    .maybeSingle();
  if (error) throw error;
  if (!servidor) redirect(pagina);

  // Mês com escala já fechada (ou que já passou) não aceita mais mudança —
  // a tela nem mostra, mas os argumentos vêm do navegador, então confere aqui.
  const mesMinimo = await primeiroMesAberto(pastoral.id);
  if (!/^\d{4}-\d{2}$/.test(mes) || mes < mesMinimo) {
    redirect(`${pagina}?servidorId=${encodeURIComponent(servidorId)}`);
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

  revalidatePath(pagina);
  redirect(`${pagina}?mes=${mes}&servidorId=${servidorId}&salvo=1`);
}
