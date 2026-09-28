import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/Badge";
import { ReactNode } from "react";
import { GRAU_LABEL, GRAU_ORDEM } from "@/lib/constants";
import { DataTable } from "@/components/ui/DataTable";
import { getFrequenciaPorServidor, LIMIAR_FREQUENCIA, MINIMO_REGISTROS_FREQUENCIA } from "@/lib/frequencia";
import type { EscalaAtribuicaoRow, FuncaoRow, ServidorRow } from "@/lib/types";

const GRAU_COLOR: Record<string, "green" | "blue" | "yellow"> = {
  COROINHA: "green",
  ACOLITO: "blue",
  CERIMONIARIO: "yellow",
};

const COLUNA_FIXA = "sticky left-0 z-10 bg-surface shadow-[1px_0_0_var(--color-line)]";

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
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Acompanhamento de funções</h1>
        <p className="text-sm text-muted">
          Total histórico de missas servidas por servidor, detalhado por função.
        </p>
      </div>

      <DataTable
        vazio="Nenhum servidor cadastrado ainda."
        ordemPadrao={{ chave: "nome", direcao: "asc" }}
        colunas={[
          { chave: "nome", titulo: "Nome", ordenavel: true, className: COLUNA_FIXA },
          { chave: "categoria", titulo: "Categoria", ordenavel: true },
          { chave: "total", titulo: "Total missas", ordenavel: true, alinhar: "right" },
          { chave: "presenca", titulo: "Presença", ordenavel: true, alinhar: "right" },
          ...funcoes.map((funcao) => ({
            chave: `f:${funcao.id}`,
            titulo: funcao.nome,
            ordenavel: true,
            alinhar: "right" as const,
          })),
        ]}
        linhas={servidores.map((servidor) => {
          const totalMissas = ocorrenciasPorServidor.get(servidor.id)?.size ?? 0;
          const frequencia = frequencias.get(servidor.id);
          const temFrequencia = Boolean(frequencia && frequencia.total >= MINIMO_REGISTROS_FREQUENCIA);
          const baixa = temFrequencia && frequencia!.taxa < LIMIAR_FREQUENCIA;

          const valores: Record<string, string | number | null> = {
            nome: servidor.nome,
            categoria: GRAU_ORDEM[servidor.categoria] ?? null,
            total: totalMissas,
            presenca: temFrequencia ? frequencia!.taxa : null,
          };
          const celulas: Record<string, ReactNode> = {
            nome: <span className="whitespace-nowrap font-medium text-fg">{servidor.nome}</span>,
            categoria: <Badge color={GRAU_COLOR[servidor.categoria]}>{GRAU_LABEL[servidor.categoria]}</Badge>,
            total: <span className="font-medium tabular-nums text-fg">{totalMissas}</span>,
            presenca: temFrequencia ? (
              <span className={`tabular-nums ${baixa ? "text-danger" : "text-muted"}`}>
                {Math.round(frequencia!.taxa * 100)}%{baixa ? " (baixa)" : ""}
              </span>
            ) : (
              <span className="text-subtle">—</span>
            ),
          };
          for (const funcao of funcoes) {
            const contagem = contagemPorServidorFuncao.get(`${servidor.id}:${funcao.id}`) ?? 0;
            valores[`f:${funcao.id}`] = contagem;
            celulas[`f:${funcao.id}`] = (
              <span className={`tabular-nums ${contagem === 0 ? "text-subtle" : "text-muted"}`}>{contagem}</span>
            );
          }
          return { id: servidor.id, valores, celulas };
        })}
        rodape={
          <tr>
            <td className={`${COLUNA_FIXA} bg-surface-2 px-4 py-3 font-medium text-muted`}>Total geral</td>
            <td className="px-4 py-3" />
            <td className="px-4 py-3 text-right font-semibold tabular-nums text-fg">{totalGeral}</td>
            <td className="px-4 py-3" />
            {funcoes.map((funcao) => (
              <td key={funcao.id} className="px-4 py-3 text-right font-semibold tabular-nums text-fg">
                {totalPorFuncao.get(funcao.id) ?? 0}
              </td>
            ))}
          </tr>
        }
      />
    </div>
  );
}
