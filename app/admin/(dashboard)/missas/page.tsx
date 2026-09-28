import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { formatarDiaMissa } from "@/lib/occurrences";
import { DataTable } from "@/components/ui/DataTable";
import type { MissaFuncaoRequisitoRow, MissaRow } from "@/lib/types";
import { deleteMissa } from "./actions";

// Página lê dados do banco a cada acesso — nunca deve ser congelada em build.
export const dynamic = "force-dynamic";

type MissaComRequisitos = MissaRow & { funcoesRequisito: MissaFuncaoRequisitoRow[] };

export default async function MissasPage() {
  const { data, error } = await supabase
    .from("Missa")
    .select("*, funcoesRequisito:MissaFuncaoRequisito(*)")
    .eq("ativo", true)
    .is("dataUnica", null)
    .order("diaSemana", { ascending: true })
    .order("horario", { ascending: true })
    .returns<MissaComRequisitos[]>();
  if (error) throw error;
  const missas = data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Missas</h1>
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
            // Semanais primeiro (0-6 pelo dia da semana, desempate pelo
            // horário); datas únicas depois, em ordem cronológica.
            dia: missa.dataUnica
              ? `1-${missa.dataUnica}-${missa.horario}`
              : `0-${missa.diaSemana ?? 9}-${missa.horario}`,
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
              <Badge color="blue">Todos os coroinhas</Badge>
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
                  confirmMessage={`Excluir a missa de ${formatarDiaMissa(missa)} às ${missa.horario}? Isso também remove ocorrências e escalas geradas para ela.`}
                />
              </div>
            ),
          },
        }))}
      />
    </div>
  );
}
