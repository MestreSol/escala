import { supabase } from "@/lib/supabase";
import { generateId } from "@/lib/db";
import { agoraNaParoquia } from "@/lib/occurrences";

const TABELA = "EscalaPublicada";

/**
 * Meses ("yyyy-MM") liberados pra página pública /escala, do mais recente pro
 * mais antigo. A escala mostrada é sempre a atual do banco — publicar só
 * decide se os servidores podem ver aquele mês.
 */
export async function listarMesesPublicados(): Promise<string[]> {
  const { data, error } = await supabase
    .from(TABELA)
    .select("mes")
    .order("mes", { ascending: false })
    .returns<{ mes: string }[]>();
  if (error) throw error;
  return (data ?? []).map((linha) => linha.mes);
}

export async function mesEstaPublicado(mes: string): Promise<boolean> {
  const { data, error } = await supabase.from(TABELA).select("id").eq("mes", mes).limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function publicarMes(mes: string): Promise<void> {
  const { error } = await supabase
    .from(TABELA)
    .upsert({ id: generateId(), mes }, { onConflict: "mes", ignoreDuplicates: true });
  if (error) throw error;
}

export async function despublicarMes(mes: string): Promise<void> {
  const { error } = await supabase.from(TABELA).delete().eq("mes", mes);
  if (error) throw error;
}

/** Soma meses a um "yyyy-MM" (n pode ser negativo). */
export function somarMeses(mes: string, n: number): string {
  const [ano, mesNumero] = mes.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mesNumero - 1 + n, 1));
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Primeiro mês em que o servidor ainda pode avisar indisponibilidade: o mês
 * seguinte ao último com escala fechada (publicada), mas nunca antes do mês
 * atual. Ex: fechou setembro → a tela de indisponibilidade já abre em outubro.
 */
export async function primeiroMesAberto(): Promise<string> {
  const publicados = await listarMesesPublicados(); // mais recente primeiro
  const mesAtual = agoraNaParoquia().slice(0, 7);
  const depoisDoUltimoFechado = publicados.length > 0 ? somarMeses(publicados[0], 1) : mesAtual;
  return depoisDoUltimoFechado > mesAtual ? depoisDoUltimoFechado : mesAtual;
}
