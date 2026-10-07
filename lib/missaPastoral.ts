import { supabase } from "@/lib/supabase";
import { generateId } from "@/lib/db";
import type { MissaOption, MissaPastoralRow } from "@/lib/types";

/**
 * Como uma pastoral serve numa missa compartilhada da paróquia (ver
 * MissaPastoral no schema). Missa sem linha para a pastoral usa o padrão.
 */
export type ConfigMissaPastoral = Pick<MissaPastoralRow, "escalarTodosAtivos" | "comunidadeResponsavel">;

export const CONFIG_PADRAO: ConfigMissaPastoral = { escalarTodosAtivos: false, comunidadeResponsavel: null };

/** Mapa missaId -> config da pastoral (só as que fogem do padrão). */
export async function getConfigMissasMap(pastoralId: string): Promise<Map<string, ConfigMissaPastoral>> {
  const { data, error } = await supabase
    .from("MissaPastoral")
    .select("missaId, escalarTodosAtivos, comunidadeResponsavel")
    .eq("pastoralId", pastoralId)
    .returns<Pick<MissaPastoralRow, "missaId" | "escalarTodosAtivos" | "comunidadeResponsavel">[]>();
  if (error) throw error;
  return new Map((data ?? []).map(({ missaId, ...config }) => [missaId, config]));
}

export async function getConfigMissa(missaId: string, pastoralId: string): Promise<ConfigMissaPastoral> {
  const { data, error } = await supabase
    .from("MissaPastoral")
    .select("escalarTodosAtivos, comunidadeResponsavel")
    .eq("missaId", missaId)
    .eq("pastoralId", pastoralId)
    .maybeSingle<ConfigMissaPastoral>();
  if (error) throw error;
  return data ?? CONFIG_PADRAO;
}

/** Grava a config da pastoral na missa; voltar ao padrão apaga a linha. */
export async function setConfigMissa(missaId: string, pastoralId: string, config: ConfigMissaPastoral): Promise<void> {
  if (!config.escalarTodosAtivos && !config.comunidadeResponsavel) {
    const { error } = await supabase.from("MissaPastoral").delete().eq("missaId", missaId).eq("pastoralId", pastoralId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("MissaPastoral")
    .upsert({ id: generateId(), missaId, pastoralId, ...config }, { onConflict: "missaId,pastoralId" });
  if (error) throw error;
}

/**
 * Missas que o servidor da pastoral pode marcar como preferidas: semanais e
 * mensais ativas da paróquia, menos as "todos os ativos" desta pastoral (sem
 * vaga por função). Missas grandes (dataUnica) sorteiam entre todos ou pela
 * comunidade responsável — nenhuma das duas usa preferência.
 */
export async function listarMissasDePreferencia(paroquiaId: string, pastoralId: string): Promise<MissaOption[]> {
  const [{ data, error }, configs] = await Promise.all([
    supabase
      .from("Missa")
      .select("id, diaSemana, semanaDoMes, dataUnica, horario, comunidade")
      .eq("paroquiaId", paroquiaId)
      .eq("ativo", true)
      .is("dataUnica", null)
      .order("diaSemana", { ascending: true })
      .order("horario", { ascending: true })
      .returns<MissaOption[]>(),
    getConfigMissasMap(pastoralId),
  ]);
  if (error) throw error;
  return (data ?? []).filter((missa) => !configs.get(missa.id)?.escalarTodosAtivos);
}

/** Se outra pastoral tem função exigida, config ou escala nesta missa (excluir apagaria o dela). */
export async function missaUsadaPorOutraPastoral(missaId: string, pastoralId: string): Promise<boolean> {
  const [requisitos, configs, atribuicoes] = await Promise.all([
    supabase
      .from("MissaFuncaoRequisito")
      .select("id, funcao:Funcao!inner(pastoralId)")
      .eq("missaId", missaId)
      .neq("funcao.pastoralId", pastoralId)
      .limit(1),
    supabase.from("MissaPastoral").select("id").eq("missaId", missaId).neq("pastoralId", pastoralId).limit(1),
    supabase
      .from("EscalaAtribuicao")
      .select("id, ocorrencia:MissaOcorrencia!inner(missaId)")
      .eq("ocorrencia.missaId", missaId)
      .neq("pastoralId", pastoralId)
      .limit(1),
  ]);
  for (const resultado of [requisitos, configs, atribuicoes]) {
    if (resultado.error) throw resultado.error;
    if ((resultado.data ?? []).length > 0) return true;
  }
  return false;
}

/**
 * Missas em que a pastoral serve: tem função dela exigida ou é "todos os
 * ativos" pra ela. As outras missas da paróquia não aparecem na escala
 * pública dela (ex: ministros que só servem aos domingos).
 */
export async function getMissasDaPastoral(pastoralId: string): Promise<Set<string>> {
  const [requisitos, configs] = await Promise.all([
    supabase
      .from("MissaFuncaoRequisito")
      .select("missaId, funcao:Funcao!inner(pastoralId)")
      .eq("funcao.pastoralId", pastoralId)
      .eq("ativo", true)
      .returns<{ missaId: string }[]>(),
    getConfigMissasMap(pastoralId),
  ]);
  if (requisitos.error) throw requisitos.error;

  const missaIds = new Set((requisitos.data ?? []).map((r) => r.missaId));
  for (const [missaId, config] of configs) {
    if (config.escalarTodosAtivos) missaIds.add(missaId);
  }
  return missaIds;
}
