import { supabase } from "@/lib/supabase";
import { PRIORIDADE_ORDEM } from "@/lib/constants";
import { lerDataArmazenada, paraExibicao } from "@/lib/occurrences";
import type { EscalaAtribuicaoRow, FuncaoRow, MissaOcorrenciaRow, MissaRow, ServidorRow } from "@/lib/types";

export type LinhaEscala = {
  funcaoNome: string;
  slotIndex: number;
  totalSlotsDaFuncao: number;
  servidorNome: string | null;
};

export type OcorrenciaEscala = {
  id: string;
  data: Date;
  comunidade: string;
  linhas: LinhaEscala[];
};

type OcorrenciaComAtribuicoes = MissaOcorrenciaRow & {
  missa: MissaRow;
  atribuicoes: (EscalaAtribuicaoRow & { funcao: FuncaoRow; servidor: ServidorRow | null })[];
};

export async function buscarEscalaDoPeriodo(periodoInicio: Date, periodoFim: Date): Promise<OcorrenciaEscala[]> {
  const { data, error } = await supabase
    .from("MissaOcorrencia")
    .select("*, missa:Missa(*), atribuicoes:EscalaAtribuicao(*, funcao:Funcao(*), servidor:Servidor(*))")
    .gte("data", periodoInicio.toISOString())
    .lte("data", periodoFim.toISOString())
    .order("data", { ascending: true })
    .returns<OcorrenciaComAtribuicoes[]>();
  if (error) throw error;

  return (data ?? []).map((ocorrencia) => {
    const totalPorFuncao = new Map<string, number>();
    for (const a of ocorrencia.atribuicoes) {
      totalPorFuncao.set(a.funcaoId, (totalPorFuncao.get(a.funcaoId) ?? 0) + 1);
    }

    const linhas: LinhaEscala[] = ocorrencia.atribuicoes
      .map((a) => ({
        funcaoNome: a.funcao.nome,
        prioridade: a.funcao.prioridade,
        slotIndex: a.slotIndex,
        totalSlotsDaFuncao: totalPorFuncao.get(a.funcaoId) ?? 1,
        servidorNome: a.servidorNomeSnapshot ?? a.servidor?.nome ?? null,
      }))
      .sort((x, y) => {
        const diff = PRIORIDADE_ORDEM[x.prioridade] - PRIORIDADE_ORDEM[y.prioridade];
        if (diff !== 0) return diff;
        if (x.funcaoNome !== y.funcaoNome) return x.funcaoNome.localeCompare(y.funcaoNome);
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
      linhas,
    };
  });
}
