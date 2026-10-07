import { supabase } from "@/lib/supabase";
import { PRIORIDADE_ORDEM } from "@/lib/constants";
import { lerDataArmazenada, paraExibicao } from "@/lib/occurrences";
import { CONFIG_PADRAO, getConfigMissasMap, getMissasDaPastoral } from "@/lib/missaPastoral";
import type { EscalaAtribuicaoRow, FuncaoRow, MissaOcorrenciaRow, MissaRow, ServidorRow } from "@/lib/types";

export type LinhaEscala = {
  /** null nas linhas de missas "todos os ativos" (lista de presença simples, sem função). */
  funcaoNome: string | null;
  slotIndex: number;
  totalSlotsDaFuncao: number;
  servidorNome: string | null;
};

export type OcorrenciaEscala = {
  id: string;
  data: Date;
  comunidade: string;
  /**
   * Missa "todos os ativos": na escala aparece só "TODOS OS COROINHAS" (ou ministros), sem
   * listar nome por nome (a lista individual serve só pra presença no admin).
   * Nesse caso `linhas` vem vazio.
   */
  todosAtivos: boolean;
  linhas: LinhaEscala[];
};

type OcorrenciaComAtribuicoes = MissaOcorrenciaRow & {
  missa: MissaRow;
  atribuicoes: (EscalaAtribuicaoRow & { funcao: FuncaoRow | null; servidor: ServidorRow | null })[];
};

/**
 * Escala de UMA pastoral no período: as ocorrências são da paróquia, mas só
 * entram as missas em que a pastoral serve, e só com as vagas dela.
 */
export async function buscarEscalaDoPeriodo(
  paroquiaId: string,
  pastoralId: string,
  periodoInicio: Date,
  periodoFim: Date
): Promise<OcorrenciaEscala[]> {
  const [{ data, error }, configs, missasDaPastoral] = await Promise.all([
    supabase
      .from("MissaOcorrencia")
      .select("*, missa:Missa(*), atribuicoes:EscalaAtribuicao(*, funcao:Funcao(*), servidor:Servidor(*))")
      .eq("paroquiaId", paroquiaId)
      .gte("data", periodoInicio.toISOString())
      .lte("data", periodoFim.toISOString())
      .order("data", { ascending: true })
      .returns<OcorrenciaComAtribuicoes[]>(),
    getConfigMissasMap(pastoralId),
    getMissasDaPastoral(pastoralId),
  ]);
  if (error) throw error;

  const ocorrencias = (data ?? [])
    .map((ocorrencia) => ({
      ...ocorrencia,
      atribuicoes: ocorrencia.atribuicoes.filter((a) => a.pastoralId === pastoralId),
    }))
    .filter((ocorrencia) => missasDaPastoral.has(ocorrencia.missaId) || ocorrencia.atribuicoes.length > 0);

  return ocorrencias.map((ocorrencia) => {
    if ((configs.get(ocorrencia.missaId) ?? CONFIG_PADRAO).escalarTodosAtivos) {
      return {
        id: ocorrencia.id,
        data: paraExibicao(lerDataArmazenada(ocorrencia.data)),
        comunidade: ocorrencia.missa.comunidade,
        todosAtivos: true,
        linhas: [],
      };
    }

    const totalPorFuncao = new Map<string, number>();
    for (const a of ocorrencia.atribuicoes) {
      if (!a.funcaoId) continue;
      totalPorFuncao.set(a.funcaoId, (totalPorFuncao.get(a.funcaoId) ?? 0) + 1);
    }

    const linhas: LinhaEscala[] = ocorrencia.atribuicoes
      .map((a) => ({
        funcaoNome: a.funcao?.nome ?? null,
        prioridade: a.funcao?.prioridade ?? "BAIXA",
        slotIndex: a.slotIndex,
        totalSlotsDaFuncao: a.funcaoId ? (totalPorFuncao.get(a.funcaoId) ?? 1) : 1,
        servidorNome: a.servidorNomeSnapshot ?? a.servidor?.nome ?? null,
      }))
      .sort((x, y) => {
        const diff = PRIORIDADE_ORDEM[x.prioridade] - PRIORIDADE_ORDEM[y.prioridade];
        if (diff !== 0) return diff;
        if (x.funcaoNome !== y.funcaoNome) return (x.funcaoNome ?? "").localeCompare(y.funcaoNome ?? "");
        return x.slotIndex - y.slotIndex;
      })
      .map(({ funcaoNome, slotIndex, totalSlotsDaFuncao, servidorNome }) => ({
        funcaoNome,
        slotIndex,
        totalSlotsDaFuncao,
        servidorNome,
      }));

    return {
      id: ocorrencia.id,
      data: paraExibicao(lerDataArmazenada(ocorrencia.data)),
      comunidade: ocorrencia.missa.comunidade,
      todosAtivos: false,
      linhas,
    };
  });
}
