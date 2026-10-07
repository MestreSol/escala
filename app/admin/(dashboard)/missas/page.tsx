import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { pastoralDoPainel } from "@/lib/sessao";
import { CONFIG_PADRAO, getConfigMissasMap } from "@/lib/missaPastoral";
import { rotuloTodos } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { formatarDiaMissa } from "@/lib/occurrences";
import { DataTable } from "@/components/ui/DataTable";
import type { MissaFuncaoRequisitoRow, MissaRow } from "@/lib/types";
import { deleteMissa } from "./actions";

export const dynamic = "force-dynamic";

type MissaComRequisitos = MissaRow & {
  funcoesRequisito: (MissaFuncaoRequisitoRow & { funcao: { pastoralId: string } })[];
};

export default async function MissasPage() {
  const { paroquia, pastoral } = await pastoralDoPainel();
  const [{ data, error }, configs] = await Promise.all([
    supabase
      .from("Missa")
      .select("*, funcoesRequisito:MissaFuncaoRequisito(*, funcao:Funcao(pastoralId))")
      .eq("paroquiaId", paroquia.id)
      .eq("ativo", true)
      .is("dataUnica", null)
      .order("diaSemana", { ascending: true })
      .order("horario", { ascending: true })
      .returns<MissaComRequisitos[]>(),
    getConfigMissasMap(pastoral.id),
  ]);
  if (error) throw error;
  // Missas são da paróquia; funções e "quem serve" são desta pastoral.
  const missas = (data ?? []).map((missa) => ({
    ...missa,
    escalarTodosAtivos: (configs.get(missa.id) ?? CONFIG_PADRAO).escalarTodosAtivos,
    funcoesRequisito: missa.funcoesRequisito.filter((r) => r.funcao.pastoralId === pastoral.id),
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Missas</h1>
          <p className="text-sm text-muted">
            Os horários são da paróquia toda; as funções contadas são as de {pastoral.nome}.
          </p>
          <Link href="/admin/missas/grandes" className="text-sm text-accent hover:text-accent-hover">
            Ver missas grandes (eventos de data única) →
          </Link>
        </div>
        <Link href="/admin/missas/nova" className={buttonClasses()}>
          Nova missa
        </Link>
      </div>

      <DataTable
        vazio="Nenhuma missa cadastrada ainda."
        ordemPadrao={{ chave: "dia", direcao: "asc" }}
        colunas={[
          { chave: "dia", titulo: "Dia", ordenavel: true },
          { chave: "horario", titulo: "Horário", ordenavel: true },
          { chave: "comunidade", titulo: "Comunidade", ordenavel: true },
          { chave: "funcoes", titulo: "Funções", ordenavel: true },
          { chave: "acoes", titulo: "", alinhar: "right" },
        ]}
        linhas={missas.map((missa) => ({
          id: missa.id,
          valores: {
            dia: missa.dataUnica
              ? `2-${missa.dataUnica}-${missa.horario}`
              : `${missa.semanaDoMes ? 1 : 0}-${missa.diaSemana ?? 9}-${missa.semanaDoMes ?? 0}-${missa.horario}`,
            horario: missa.horario,
            comunidade: missa.comunidade,
            // "Todos os ativos" não tem vagas por função — fica antes de todas.
            funcoes: missa.escalarTodosAtivos ? -1 : missa.funcoesRequisito.filter((r) => r.ativo).length,
          },
          celulas: {
            dia: <span className="font-medium text-fg">{formatarDiaMissa(missa)}</span>,
            horario: <span className="tabular-nums text-muted">{missa.horario}</span>,
            comunidade: <span className="text-muted">{missa.comunidade}</span>,
            funcoes: missa.escalarTodosAtivos ? (
              <Badge color="blue">{rotuloTodos(pastoral.tipo)}</Badge>
            ) : (
              <span className="tabular-nums text-muted">{missa.funcoesRequisito.filter((r) => r.ativo).length}</span>
            ),
            acoes: (
              <div className="flex justify-end gap-4">
                <Link href={`/admin/missas/${missa.id}`} className="font-medium text-accent hover:text-accent-hover">
                  Editar
                </Link>
                <DeleteButton
                  action={deleteMissa.bind(null, missa.id)}
                  confirmMessage={`Excluir a missa de ${formatarDiaMissa(missa)} às ${missa.horario}? Ela é da paróquia toda: isso remove as ocorrências e as escalas geradas para ela em todas as pastorais.`}
                />
              </div>
            ),
          },
        }))}
      />
    </div>
  );
}
