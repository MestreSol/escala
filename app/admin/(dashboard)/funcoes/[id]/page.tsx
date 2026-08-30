import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FuncaoForm } from "@/components/admin/FuncaoForm";
import { Button } from "@/components/ui/Button";
import { updateFuncao, saveFuncaoAcumulacoes } from "../actions";

export default async function EditarFuncaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [funcao, outrasFuncoes] = await Promise.all([
    prisma.funcao.findUnique({ where: { id }, include: { podeAssumir: true } }),
    prisma.funcao.findMany({ where: { ativo: true, id: { not: id } }, orderBy: { nome: "asc" } }),
  ]);

  if (!funcao) notFound();

  const action = updateFuncao.bind(null, funcao.id);
  const salvarAcumulacoes = saveFuncaoAcumulacoes.bind(null, funcao.id);
  const podeAssumirIds = new Set(funcao.podeAssumir.map((f) => f.id));

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="mb-6 text-2xl font-semibold text-gray-900">Editar função</h1>
        <FuncaoForm action={action} defaultValues={funcao} submitLabel="Salvar alterações" />
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Acúmulo de função</h2>
        <p className="mb-4 text-sm text-gray-500">
          Marque quais outras funções quem exerce <strong>{funcao.nome}</strong> também pode
          assumir na mesma missa, como último recurso quando não sobrar mais ninguém disponível
          especificamente para elas. Se houver gente suficiente, cada função continua sendo
          preenchida por pessoas diferentes.
        </p>

        {outrasFuncoes.length === 0 ? (
          <p className="text-sm text-gray-500">Cadastre outras funções para configurar acúmulos.</p>
        ) : (
          <form action={salvarAcumulacoes} className="space-y-3">
            {outrasFuncoes.map((outra) => (
              <label
                key={outra.id}
                className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-4 py-3"
              >
                <input
                  type="checkbox"
                  name={`assume_${outra.id}`}
                  defaultChecked={podeAssumirIds.has(outra.id)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-900">{outra.nome}</span>
              </label>
            ))}
            <Button type="submit">Salvar acúmulos</Button>
          </form>
        )}
      </div>
    </div>
  );
}
