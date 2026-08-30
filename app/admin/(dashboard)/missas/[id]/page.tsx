import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MissaForm } from "@/components/admin/MissaForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { PRIORIDADE_LABEL, GRAU_LABEL } from "@/lib/constants";
import { updateMissa, deleteMissa, saveMissaRequisitos } from "../actions";

export default async function EditarMissaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [missa, funcoes] = await Promise.all([
    prisma.missa.findUnique({
      where: { id },
      include: { funcoesRequisito: true },
    }),
    prisma.funcao.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);

  if (!missa) notFound();

  const requisitoPorFuncao = new Map(missa.funcoesRequisito.map((r) => [r.funcaoId, r]));
  const salvarRequisitos = saveMissaRequisitos.bind(null, missa.id);

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="mb-6 text-2xl font-semibold text-gray-900">Editar missa</h1>
        <MissaForm action={updateMissa.bind(null, missa.id)} defaultValues={missa} submitLabel="Salvar alterações" />
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Funções exigidas nesta missa</h2>
        <p className="mb-4 text-sm text-gray-500">
          Marque as funções que essa missa precisa e quantas vagas cada uma tem (ex: 2 ceroferários).
        </p>

        {funcoes.length === 0 ? (
          <p className="text-sm text-gray-500">Cadastre funções primeiro.</p>
        ) : (
          <form action={salvarRequisitos} className="space-y-3">
            {funcoes.map((funcao) => {
              const requisito = requisitoPorFuncao.get(funcao.id);
              return (
                <div
                  key={funcao.id}
                  className="flex items-center justify-between gap-4 rounded-md border border-gray-200 bg-white px-4 py-3"
                >
                  <label className="flex flex-1 items-center gap-3">
                    <input
                      type="checkbox"
                      name={`req_${funcao.id}_ativo`}
                      defaultChecked={Boolean(requisito?.ativo)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-900">{funcao.nome}</span>
                    <span className="text-xs text-gray-500">
                      {PRIORIDADE_LABEL[funcao.prioridade]} · {GRAU_LABEL[funcao.grauMinimo]}+
                    </span>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    name={`req_${funcao.id}_quantidade`}
                    defaultValue={requisito?.quantidade ?? funcao.quantidadePadrao}
                    className="w-20"
                  />
                </div>
              );
            })}
            <Button type="submit">Salvar funções da missa</Button>
          </form>
        )}
      </div>

      <div className="border-t border-gray-200 pt-6">
        <DeleteButton
          action={deleteMissa.bind(null, missa.id)}
          confirmMessage="Excluir esta missa? Isso também remove ocorrências e escalas geradas para ela."
          label="Excluir missa"
        />
      </div>
    </div>
  );
}
