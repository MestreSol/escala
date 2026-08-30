import { prisma } from "@/lib/prisma";
import { PRIORIDADE_ORDEM } from "@/lib/constants";

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

export async function buscarEscalaDoPeriodo(periodoInicio: Date, periodoFim: Date): Promise<OcorrenciaEscala[]> {
  const ocorrencias = await prisma.missaOcorrencia.findMany({
    where: { data: { gte: periodoInicio, lte: periodoFim } },
    include: {
      missa: true,
      atribuicoes: { include: { funcao: true, servidor: true } },
    },
    orderBy: { data: "asc" },
  });

  return ocorrencias.map((ocorrencia) => {
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
      data: ocorrencia.data,
      comunidade: ocorrencia.missa.comunidade,
      linhas,
    };
  });
}
