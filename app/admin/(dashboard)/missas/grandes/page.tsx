import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { buttonClasses } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { lerDataArmazenada, paraExibicao } from "@/lib/occurrences";
import type { MissaFuncaoRequisitoRow, MissaRow } from "@/lib/types";
import { deleteMissa } from "../actions";

export const dynamic = "force-dynamic";

type MissaComRequisitos = MissaRow & { funcoesRequisito: MissaFuncaoRequisitoRow[] };

function labelQuemServe(missa: MissaRow): string {
  if (missa.escalarTodosAtivos) return "Todos os coroinhas";
  if (missa.comunidadeResponsavel) return `Comunidade: ${missa.comunidadeResponsavel}`;
  return "Sorteio entre todos";
}

export default async function MissasGrandesPage() {
  const { data, error } = await supabase
    .from("Missa")
    .select("*, funcoesRequisito:MissaFuncaoRequisito(*)")
    .eq("ativo", true)
    .not("dataUnica", "is", null)
    .returns<MissaComRequisitos[]>();
  if (error) throw error;
  const missas = data ?? [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Missas grandes</h1>
          <p className="text-sm text-muted">Eventos de data única (ex: Natal), fora do ciclo semanal.</p>
          <Link href="/admin/missas" className="text-sm text-accent hover:text-accent-hover">
            ← Ver missas semanais
          </Link>
        </div>
        <Link href="/admin/missas/nova?tipo=DATA_UNICA" className={buttonClasses()}>
          Nova missa grande
        </Link>
      </div>

      <DataTable
        vazio="Nenhuma missa grande cadastrada ainda."
        ordemPadrao={{ chave: "data", direcao: "asc" }}
        colunas={[
          { chave: "data", titulo: "Data", ordenavel: true },
          { chave: "horario", titulo: "Horário", ordenavel: true },
          { chave: "comunidade", titulo: "Comunidade", ordenavel: true },
          { chave: "quemServe", titulo: "Quem serve", ordenavel: true },
          { chave: "funcoes", titulo: "Funções", ordenavel: true },
          { chave: "acoes", titulo: "", alinhar: "right" },
        ]}
        linhas={missas.map((missa) => {
          const dataExibicao = missa.dataUnica ? paraExibicao(lerDataArmazenada(missa.dataUnica)) : null;
          const totalFuncoes = missa.funcoesRequisito.filter((r) => r.ativo).length;
          return {
            id: missa.id,
            valores: {
              data: missa.dataUnica,
              horario: missa.horario,
              comunidade: missa.comunidade,
              quemServe: labelQuemServe(missa),
              funcoes: missa.escalarTodosAtivos ? -1 : totalFuncoes,
            },
            celulas: {
              data: (
                <span className="font-medium text-fg">
                  {dataExibicao ? format(dataExibicao, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "—"}
                </span>
              ),
              horario: <span className="tabular-nums text-muted">{missa.horario}</span>,
              comunidade: <span className="text-muted">{missa.comunidade}</span>,
              quemServe: (
                <Badge color={missa.escalarTodosAtivos ? "blue" : missa.comunidadeResponsavel ? "green" : "gray"}>
                  {labelQuemServe(missa)}
                </Badge>
              ),
              funcoes: missa.escalarTodosAtivos ? (
                <span className="text-subtle">—</span>
              ) : (
                <span className="tabular-nums text-muted">{totalFuncoes}</span>
              ),
              acoes: (
                <div className="flex justify-end gap-4">
                  <Link href={`/admin/missas/${missa.id}`} className="font-medium text-accent hover:text-accent-hover">
                    Editar
                  </Link>
                  <DeleteButton
                    action={deleteMissa.bind(null, missa.id)}
                    confirmMessage="Excluir esta missa grande? Isso também remove ocorrências e escalas geradas para ela."
                  />
                </div>
              ),
            },
          };
        })}
      />
    </div>
  );
}
