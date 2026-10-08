import { supabase } from "@/lib/supabase";
import { generateId } from "@/lib/db";
import { diaChave } from "@/lib/scheduleGenerator";
import type { ServidorIndisponibilidadeRow } from "@/lib/types";

const TABELA = "ServidorIndisponibilidade";

/** Mapa servidorId -> dias (diaChave) em que avisou que não pode servir, pro gerador de escala. */
export async function getIndisponibilidadeMap(pastoralId: string): Promise<Map<string, Set<string>>> {
  const { data, error } = await supabase
    .from(TABELA)
    .select("servidorId, data, servidor:Servidor!inner(pastoralId)")
    .eq("servidor.pastoralId", pastoralId)
    .returns<ServidorIndisponibilidadeRow[]>();
  if (error) throw error;

  const mapa = new Map<string, Set<string>>();
  for (const linha of data ?? []) {
    const chave = diaChave(new Date(linha.data.endsWith("Z") ? linha.data : `${linha.data}Z`));
    const dias = mapa.get(linha.servidorId);
    if (dias) dias.add(chave);
    else mapa.set(linha.servidorId, new Set([chave]));
  }
  return mapa;
}

/** Dias já avisados por um servidor dentro de um período — usado pra pré-marcar os checkboxes na tela pública. */
export async function getDatasIndisponiveisDoServidor(
  servidorId: string,
  periodoInicio: Date,
  periodoFim: Date
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from(TABELA)
    .select("data")
    .eq("servidorId", servidorId)
    .gte("data", periodoInicio.toISOString())
    .lte("data", periodoFim.toISOString())
    .returns<{ data: string }[]>();
  if (error) throw error;

  return new Set((data ?? []).map((linha) => diaChave(new Date(linha.data.endsWith("Z") ? linha.data : `${linha.data}Z`))));
}

/** Substitui os dias indisponíveis de um servidor dentro de um período pela lista informada. */
export async function setIndisponibilidadeDoServidorNoPeriodo(
  servidorId: string,
  periodoInicio: Date,
  periodoFim: Date,
  datas: Date[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from(TABELA)
    .delete()
    .eq("servidorId", servidorId)
    .gte("data", periodoInicio.toISOString())
    .lte("data", periodoFim.toISOString());
  if (deleteError) throw deleteError;

  if (datas.length === 0) return;

  const linhas = datas.map((data) => ({ id: generateId(), servidorId, data: data.toISOString() }));
  const { error: insertError } = await supabase.from(TABELA).insert(linhas);
  if (insertError) throw insertError;
}

/** Dias que o servidor avisou como indisponível, de `desde` em diante — pro painel poder liberar. */
export async function listarIndisponibilidadesDoServidor(
  servidorId: string,
  desde: Date
): Promise<{ id: string; data: string }[]> {
  const { data, error } = await supabase
    .from(TABELA)
    .select("id, data")
    .eq("servidorId", servidorId)
    .gte("data", desde.toISOString())
    .order("data", { ascending: true })
    .returns<{ id: string; data: string }[]>();
  if (error) throw error;
  return data ?? [];
}

/** Libera um dia avisado (ex: a família confirmou que a pessoa pode servir). */
export async function removerIndisponibilidade(servidorId: string, indisponibilidadeId: string): Promise<void> {
  const { error } = await supabase.from(TABELA).delete().eq("id", indisponibilidadeId).eq("servidorId", servidorId);
  if (error) throw error;
}
