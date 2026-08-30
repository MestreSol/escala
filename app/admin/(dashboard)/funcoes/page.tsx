import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { PRIORIDADE_LABEL, GRAU_LABEL } from "@/lib/constants";
import { deleteFuncao } from "./actions";

const PRIORIDADE_COLOR: Record<string, "red" | "yellow" | "gray"> = {
  ALTA: "red",
  MEDIA: "yellow",
  BAIXA: "gray",
};

// Página lê dados do banco a cada acesso — nunca deve ser congelada em build.
export const dynamic = "force-dynamic";

export default async function FuncoesPage() {
  const funcoes = await prisma.funcao.findMany({
    where: { ativo: true },
    orderBy: [{ prioridade: "asc" }, { nome: "asc" }],
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Funções</h1>
        <Link href="/admin/funcoes/nova">
          <Button>Nova função</Button>
        </Link>
      </div>

      {funcoes.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma função cadastrada ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Prioridade</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Grau mínimo</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Vagas padrão</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {funcoes.map((funcao) => (
                <tr key={funcao.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{funcao.nome}</td>
                  <td className="px-4 py-3 text-sm">
                    <Badge color={PRIORIDADE_COLOR[funcao.prioridade]}>
                      {PRIORIDADE_LABEL[funcao.prioridade]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{GRAU_LABEL[funcao.grauMinimo]}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{funcao.quantidadePadrao}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <div className="flex justify-end gap-4">
                      <Link
                        href={`/admin/funcoes/${funcao.id}`}
                        className="font-medium text-blue-700 hover:text-blue-900"
                      >
                        Editar
                      </Link>
                      <DeleteButton
                        action={deleteFuncao.bind(null, funcao.id)}
                        confirmMessage={`Excluir a função "${funcao.nome}"? Isso também remove atribuições de escala vinculadas a ela.`}
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
