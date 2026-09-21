import { supabase } from "@/lib/supabase";
import { generateId } from "@/lib/db";
import { lerDataArmazenada } from "@/lib/occurrences";
import { diaChave } from "@/lib/scheduleGenerator";
import type { ServidorIndisponibilidadeRow } from "@/lib/types";

const TABELA = "ServidorIndisponibilidade";

/** Dias (âncora meia-noite UTC) em que `servidorId` marcou indisponibilidade dentro do período. */
export async function getIndisponibilidadesDoServidor(
  servidorId: string,
  periodoInicio: Date,
  periodoFim: Date
): Promise<Date[]> {
  const { data, error } = await supabase
    .from(TABELA)
    .select("data")
    .eq("servidorId", servidorId)
    .gte("data", periodoInicio.toISOString())
    .lte("data", periodoFim.toISOString())
    .returns<{ data: string }[]>();
  if (error) throw error;

  return (data ?? []).map((d) => lerDataArmazenada(d.data));
}

/** Mapa servidorId -> dias indisponíveis (ver diaChave) no período, para o gerador de escala. */
export async function getIndisponibilidadesMap(periodoInicio: Date, periodoFim: Date): Promise<Map<string, Set<string>>> {
  const { data, error } = await supabase
    .from(TABELA)
    .select("servidorId, data")
    .gte("data", periodoInicio.toISOString())
    .lte("data", periodoFim.toISOString())
    .returns<ServidorIndisponibilidadeRow[]>();
  if (error) throw error;

  const mapa = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    const chave = diaChave(lerDataArmazenada(row.data));
    const set = mapa.get(row.servidorId);
    if (set) set.add(chave);
    else mapa.set(row.servidorId, new Set([chave]));
  }
  return mapa;
}

/** Substitui as indisponibilidades de `servidorId` dentro de [periodoInicio, periodoFim] pela lista `datas`. */
export async function setIndisponibilidadesDoServidor(
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
