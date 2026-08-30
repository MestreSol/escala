import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { DIAS_SEMANA } from "@/lib/constants";
import { deleteMissa } from "./actions";

// Página lê dados do banco a cada acesso — nunca deve ser congelada em build.
export const dynamic = "force-dynamic";

export default async function MissasPage() {
  const missas = await prisma.missa.findMany({
    where: { ativo: true },
    orderBy: [{ diaSemana: "asc" }, { horario: "asc" }],
    include: { funcoesRequisito: { where: { ativo: true } } },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Missas</h1>
        <Link href="/admin/missas/nova">
          <Button>Nova missa</Button>
        </Link>
      </div>

      {missas.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma missa cadastrada ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Dia</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Horário</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Comunidade</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Funções</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {missas.map((missa) => (
                <tr key={missa.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{DIAS_SEMANA[missa.diaSemana]}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{missa.horario}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{missa.comunidade}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{missa.funcoesRequisito.length}</td>
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
                        confirmMessage={`Excluir a missa de ${DIAS_SEMANA[missa.diaSemana]} às ${missa.horario}? Isso também remove ocorrências e escalas geradas para ela.`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
