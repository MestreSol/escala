import { supabase } from "@/lib/supabase";
import { generateId } from "@/lib/db";

const TABELA = "FuncaoHabilitado";

/**
 * Funções da pastoral marcadas como `somenteHabilitados` -> quem pode
 * exercê-las, pro gerador de escala. Função restrita sem ninguém escolhido
 * entra com conjunto vazio (ninguém pode = vaga em aberto).
 */
export async function getHabilitadosMap(pastoralId: string): Promise<Map<string, Set<string>>> {
  const { data: funcoes, error } = await supabase
    .from("Funcao")
    .select("id")
    .eq("pastoralId", pastoralId)
    .eq("somenteHabilitados", true)
    .returns<{ id: string }[]>();
  if (error) throw error;

  const mapa = new Map<string, Set<string>>((funcoes ?? []).map((f) => [f.id, new Set<string>()]));
  if (mapa.size === 0) return mapa;

  const { data: linhas, error: linhasError } = await supabase
    .from(TABELA)
    .select("funcaoId, servidorId")
    .in("funcaoId", [...mapa.keys()])
    .returns<{ funcaoId: string; servidorId: string }[]>();
  if (linhasError) throw linhasError;
  for (const linha of linhas ?? []) mapa.get(linha.funcaoId)?.add(linha.servidorId);
  return mapa;
}

/** Servidores escolhidos pra uma função. */
export async function getHabilitadosDaFuncao(funcaoId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from(TABELA)
    .select("servidorId")
    .eq("funcaoId", funcaoId)
    .returns<{ servidorId: string }[]>();
  if (error) throw error;
  return (data ?? []).map((linha) => linha.servidorId);
}

/** Substitui por completo quem pode exercer `funcaoId`. */
export async function setHabilitadosDaFuncao(funcaoId: string, servidorIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase.from(TABELA).delete().eq("funcaoId", funcaoId);
  if (deleteError) throw deleteError;
  if (servidorIds.length === 0) return;

  const { error } = await supabase
    .from(TABELA)
    .insert(servidorIds.map((servidorId) => ({ id: generateId(), funcaoId, servidorId })));
  if (error) throw error;
}
