import { supabase } from "@/lib/supabase";
import { generateId } from "@/lib/db";
import { agoraNaParoquia } from "@/lib/occurrences";
import { chaveValidaParaModo, ehChaveDeMes } from "@/lib/periodoEscala";
import type { ModoEscala } from "@/lib/types";

const TABELA = "EscalaPublicada";

/**
 * Meses ("yyyy-MM") liberados pra página pública /escala, do mais recente pro
 * mais antigo. A escala mostrada é sempre a atual do banco — publicar só
 * decide se os servidores podem ver aquele mês.
 */
export async function listarMesesPublicados(pastoralId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from(TABELA)
    .select("mes")
    .eq("pastoralId", pastoralId)
    .order("mes", { ascending: false })
    .returns<{ mes: string }[]>();
  if (error) throw error;
  return (data ?? []).map((linha) => linha.mes);
}

export async function mesEstaPublicado(pastoralId: string, mes: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABELA)
    .select("id")
    .eq("pastoralId", pastoralId)
    .eq("mes", mes)
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function publicarMes(paroquiaId: string, pastoralId: string, mes: string): Promise<void> {
  const { error } = await supabase
    .from(TABELA)
    .upsert({ id: generateId(), paroquiaId, pastoralId, mes }, { onConflict: "pastoralId,mes", ignoreDuplicates: true });
  if (error) throw error;
}

export async function despublicarMes(pastoralId: string, mes: string): Promise<void> {
  const { error } = await supabase.from(TABELA).delete().eq("pastoralId", pastoralId).eq("mes", mes);
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
export async function primeiroMesAberto(pastoralId: string, modo: ModoEscala = "MENSAL"): Promise<string> {
  if (modo === "SEMANAL") return (await primeiroDiaAberto(pastoralId, modo)).slice(0, 7);
  const publicados = (await listarMesesPublicados(pastoralId)).filter(ehChaveDeMes); // mais recente primeiro
  const mesAtual = agoraNaParoquia().slice(0, 7);
  const depoisDoUltimoFechado = publicados.length > 0 ? somarMeses(publicados[0], 1) : mesAtual;
  return depoisDoUltimoFechado > mesAtual ? depoisDoUltimoFechado : mesAtual;
}

/**
 * Primeiro dia ("yyyy-MM-dd") em que ainda dá pra avisar indisponibilidade:
 * nunca antes de hoje, e depois do último período com escala publicada —
 * o mês seguinte inteiro (MENSAL) ou o dia seguinte à última semana
 * publicada (SEMANAL, que publica uma semana por vez dentro do mês).
 */
export async function primeiroDiaAberto(pastoralId: string, modo: ModoEscala): Promise<string> {
  const hoje = agoraNaParoquia().slice(0, 10);
  let dia: string;
  if (modo === "SEMANAL") {
    const semanas = (await listarMesesPublicados(pastoralId)).filter((chave) => chaveValidaParaModo("SEMANAL", chave));
    dia = semanas.length > 0 ? somarDias(semanas.sort().at(-1)!, 7) : hoje;
  } else {
    dia = `${await primeiroMesAberto(pastoralId, "MENSAL")}-01`;
  }
  return dia > hoje ? dia : hoje;
}

function somarDias(dia: string, n: number): string {
  const [ano, mes, d] = dia.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, d + n));
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}-${String(data.getUTCDate()).padStart(2, "0")}`;
}
