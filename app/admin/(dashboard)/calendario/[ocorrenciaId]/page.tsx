import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { DIAS_SEMANA } from "@/lib/constants";
import { atualizarAtribuicaoManual } from "../actions";

export default async function OcorrenciaDetailPage({
  params,
}: {
  params: Promise<{ ocorrenciaId: string }>;
}) {
  const { ocorrenciaId } = await params;

  const [ocorrencia, servidores] = await Promise.all([
    prisma.missaOcorrencia.findUnique({
      where: { id: ocorrenciaId },
      include: {
        missa: { include: { funcoesRequisito: { where: { ativo: true }, include: { funcao: true } } } },
        atribuicoes: { include: { funcao: true, servidor: true } },
      },
    }),
    prisma.servidor.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);

  if (!ocorrencia) notFound();

  const atribuicaoPorSlot = new Map(
    ocorrencia.atribuicoes.map((a) => [`${a.funcaoId}:${a.slotIndex}`, a])
  );

  const linhas = ocorrencia.missa.funcoesRequisito.flatMap((req) =>
    Array.from({ length: req.quantidade }, (_, i) => {
      const slotIndex = i + 1;
      const atribuicao = atribuicaoPorSlot.get(`${req.funcaoId}:${slotIndex}`);
      return {
        funcaoId: req.funcaoId,
        funcaoNome: req.funcao.nome,
        slotIndex,
        totalSlots: req.quantidade,
        servidorId: atribuicao?.servidorId ?? null,
        servidorNome: atribuicao?.servidorNomeSnapshot ?? atribuicao?.servidor?.nome ?? null,
        gerado: Boolean(atribuicao),
      };
    })
  );

  const mesAno = format(ocorrencia.data, "eeee, d 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="max-w-2xl">
      <Link href="/admin/calendario" className="mb-4 inline-block text-sm text-blue-700 hover:text-blue-900">
        ← Voltar ao calendário
      </Link>
      <h1 className="text-2xl font-semibold capitalize text-gray-900">
        {DIAS_SEMANA[ocorrencia.missa.diaSemana]} — {format(ocorrencia.data, "HH:mm")}
      </h1>
      <p className="mb-1 text-sm text-gray-500 capitalize">{mesAno}</p>
      <p className="mb-6 text-sm text-gray-500">Comunidade: {ocorrencia.missa.comunidade}</p>

      {linhas.length === 0 ? (
        <p className="text-sm text-gray-500">Esta missa não tem funções configuradas.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Função</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Servidor</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Editar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {linhas.map((linha) => {
                const salvar = atualizarAtribuicaoManual.bind(null, ocorrencia.id, linha.funcaoId, linha.slotIndex);
                return (
                  <tr key={`${linha.funcaoId}-${linha.slotIndex}`}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {linha.funcaoNome}
                      {linha.totalSlots > 1 ? ` #${linha.slotIndex}` : ""}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {linha.servidorNome ? (
                        <span className="text-gray-800">{linha.servidorNome}</span>
                      ) : linha.gerado ? (
                        <Badge color="red">EM ABERTO</Badge>
                      ) : (
                        <Badge color="gray">Não gerado</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <form action={salvar} className="flex items-center gap-2">
                        <Select name="servidorId" defaultValue={linha.servidorId ?? ""} className="w-48">
                          <option value="">Vaga em aberto</option>
                          {servidores.map((servidor) => (
                            <option key={servidor.id} value={servidor.id}>
                              {servidor.nome}
                            </option>
                          ))}
                        </Select>
                        <Button type="submit" variant="secondary" className="shrink-0">
                          Salvar
                        </Button>
                      </form>
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
