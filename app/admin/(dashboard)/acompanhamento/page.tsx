import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/Badge";
import { GRAU_LABEL } from "@/lib/constants";
import { getFrequenciaPorServidor, LIMIAR_FREQUENCIA, MINIMO_REGISTROS_FREQUENCIA } from "@/lib/frequencia";
import type { EscalaAtribuicaoRow, FuncaoRow, ServidorRow } from "@/lib/types";

const GRAU_COLOR: Record<string, "green" | "blue" | "yellow"> = {
  COROINHA: "green",
  ACOLITO: "blue",
  CERIMONIARIO: "yellow",
};

// Página lê dados do banco a cada acesso — nunca deve ser congelada em build.
export const dynamic = "force-dynamic";

export default async function AcompanhamentoPage() {
  const [servidoresResult, funcoesResult, atribuicoesResult, frequencias] = await Promise.all([
    supabase
      .from("Servidor")
      .select("id, nome, categoria")
      .eq("ativo", true)
      .order("nome", { ascending: true })
      .returns<Pick<ServidorRow, "id" | "nome" | "categoria">[]>(),
    supabase
      .from("Funcao")
      .select("id, nome, prioridade")
      .eq("ativo", true)
      .order("prioridade", { ascending: true })
      .order("nome", { ascending: true })
      .returns<Pick<FuncaoRow, "id" | "nome" | "prioridade">[]>(),
    supabase
      .from("EscalaAtribuicao")
      .select("servidorId, funcaoId, ocorrenciaId")
      .not("servidorId", "is", null)
      .returns<Pick<EscalaAtribuicaoRow, "servidorId" | "funcaoId" | "ocorrenciaId">[]>(),
    getFrequenciaPorServidor(),
  ]);
  if (servidoresResult.error) throw servidoresResult.error;
  if (funcoesResult.error) throw funcoesResult.error;
  if (atribuicoesResult.error) throw atribuicoesResult.error;

  const servidores = servidoresResult.data ?? [];
  const funcoes = funcoesResult.data ?? [];
  const atribuicoes = atribuicoesResult.data ?? [];

  // Contagem por servidor+função (quantas vezes exerceu cada função) e o
  // conjunto de ocorrências distintas em que serviu (total de missas —
  // dedupe necessário porque acúmulo de função pode gerar duas linhas de
  // EscalaAtribuicao para o mesmo servidor na mesma ocorrência).
  const contagemPorServidorFuncao = new Map<string, number>();
  const ocorrenciasPorServidor = new Map<string, Set<string>>();

  for (const a of atribuicoes) {
    if (!a.servidorId) continue;
    const chave = `${a.servidorId}:${a.funcaoId}`;
    contagemPorServidorFuncao.set(chave, (contagemPorServidorFuncao.get(chave) ?? 0) + 1);

    const ocorrencias = ocorrenciasPorServidor.get(a.servidorId);
    if (ocorrencias) ocorrencias.add(a.ocorrenciaId);
    else ocorrenciasPorServidor.set(a.servidorId, new Set([a.ocorrenciaId]));
  }

  const totalPorFuncao = new Map<string, number>();
  for (const funcao of funcoes) {
    let total = 0;
    for (const servidor of servidores) {
      total += contagemPorServidorFuncao.get(`${servidor.id}:${funcao.id}`) ?? 0;
    }
    totalPorFuncao.set(funcao.id, total);
  }
  const totalGeral = servidores.reduce((soma, s) => soma + (ocorrenciasPorServidor.get(s.id)?.size ?? 0), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Acompanhamento de funções</h1>
        <p className="text-sm text-gray-500">
          Total histórico de missas servidas por servidor, detalhado por função.
        </p>
      </div>

      {servidores.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum servidor cadastrado ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Nome
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Categoria</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Total missas</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Presença</th>
                {funcoes.map((funcao) => (
                  <th
                    key={funcao.id}
                    className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium uppercase text-gray-500"
                  >
                    {funcao.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {servidores.map((servidor) => (
                <tr key={servidor.id}>
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-3 font-medium text-gray-900 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]">
                    {servidor.nome}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={GRAU_COLOR[servidor.categoria]}>{GRAU_LABEL[servidor.categoria]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {ocorrenciasPorServidor.get(servidor.id)?.size ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(() => {
                      const frequencia = frequencias.get(servidor.id);
                      if (!frequencia || frequencia.total < MINIMO_REGISTROS_FREQUENCIA) {
                        return <span className="text-gray-300">—</span>;
                      }
                      const baixa = frequencia.taxa < LIMIAR_FREQUENCIA;
                      return (
                        <span className={baixa ? "text-red-600" : "text-gray-700"}>
                          {Math.round(frequencia.taxa * 100)}%{baixa ? " (baixa)" : ""}
                        </span>
                      );
                    })()}
                  </td>
                  {funcoes.map((funcao) => {
                    const contagem = contagemPorServidorFuncao.get(`${servidor.id}:${funcao.id}`) ?? 0;
                    return (
                      <td
                        key={funcao.id}
                        className={`px-4 py-3 text-right ${contagem === 0 ? "text-gray-300" : "text-gray-700"}`}
                      >
                        {contagem}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="sticky left-0 z-10 bg-gray-50 px-4 py-3 font-medium text-gray-700 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]">
                  Total geral
                </td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{totalGeral}</td>
                <td className="px-4 py-3" />
                {funcoes.map((funcao) => (
                  <td key={funcao.id} className="px-4 py-3 text-right font-semibold text-gray-900">
                    {totalPorFuncao.get(funcao.id) ?? 0}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
