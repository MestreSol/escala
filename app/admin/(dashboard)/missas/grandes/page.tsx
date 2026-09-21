import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { lerDataArmazenada, paraExibicao } from "@/lib/occurrences";
import type { MissaFuncaoRequisitoRow, MissaRow } from "@/lib/types";
import { deleteMissa } from "../actions";

// Página lê dados do banco a cada acesso — nunca deve ser congelada em build.
export const dynamic = "force-dynamic";

type MissaComRequisitos = MissaRow & { funcoesRequisito: MissaFuncaoRequisitoRow[] };

function labelModoEscalacao(missa: MissaRow): string {
  if (missa.escalarTodosAtivos) return "Todos os servidores ativos";
  if (missa.comunidadeResponsavel) return `Comunidade: ${missa.comunidadeResponsavel}`;
  return "Normal (por preferência)";
}

export default async function MissasGrandesPage() {
  const { data, error } = await supabase
    .from("Missa")
    .select("*, funcoesRequisito:MissaFuncaoRequisito(*)")
    .eq("ativo", true)
    .not("dataUnica", "is", null)
    .order("dataUnica", { ascending: true })
    .returns<MissaComRequisitos[]>();
  if (error) throw error;
  const missas = data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Missas grandes</h1>
          <p className="text-sm text-gray-500">Eventos de data única (ex: Natal), fora do ciclo semanal normal.</p>
          <Link href="/admin/missas" className="text-sm text-blue-700 hover:text-blue-900">
            ← Ver missas recorrentes
          </Link>
        </div>
        <Link href="/admin/missas/nova?tipo=DATA_UNICA">
          <Button>Nova missa grande</Button>
        </Link>
      </div>

      {missas.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma missa grande cadastrada ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Horário</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Comunidade</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Quem serve</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Funções</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {missas.map((missa) => {
                const dataExibicao = missa.dataUnica ? paraExibicao(lerDataArmazenada(missa.dataUnica)) : null;
                return (
                  <tr key={missa.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 capitalize">
                      {dataExibicao ? format(dataExibicao, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{missa.horario}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{missa.comunidade}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge color={missa.escalarTodosAtivos || missa.comunidadeResponsavel ? "blue" : "gray"}>
                        {labelModoEscalacao(missa)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {missa.funcoesRequisito.filter((r) => r.ativo).length}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <div className="flex justify-end gap-4">
                        <Link
                          href={`/admin/missas/${missa.id}`}
                          className="font-medium text-blue-700 hover:text-blue-900"
                        >
                          Editar
                        </Link>
                        <DeleteButton
                          action={deleteMissa.bind(null, missa.id)}
                          confirmMessage="Excluir esta missa grande? Isso também remove ocorrências e escalas geradas para ela."
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
