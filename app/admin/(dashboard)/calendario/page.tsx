import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameMonth,
  isSameDay,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { periodoDoMes } from "@/lib/occurrences";
import { materializarOcorrencias, gerarEscalaPeriodo, regenerarEscalaPeriodo } from "./actions";

// Página lê e materializa dados do banco a cada acesso — nunca deve ser congelada em build.
export const dynamic = "force-dynamic";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const { periodoInicio, periodoFim } = periodoDoMes(mes);
  const mesReferencia = periodoInicio;

  await materializarOcorrencias(periodoInicio, periodoFim);

  const [ocorrencias, requisitos] = await Promise.all([
    prisma.missaOcorrencia.findMany({
      where: { data: { gte: periodoInicio, lte: periodoFim } },
      include: { missa: true, atribuicoes: true },
      orderBy: { data: "asc" },
    }),
    prisma.missaFuncaoRequisito.findMany({ where: { ativo: true } }),
  ]);

  const totalSlotsPorMissa = new Map<string, number>();
  for (const req of requisitos) {
    totalSlotsPorMissa.set(req.missaId, (totalSlotsPorMissa.get(req.missaId) ?? 0) + req.quantidade);
  }

  const gridInicio = startOfWeek(periodoInicio, { weekStartsOn: 0 });
  const gridFim = endOfWeek(periodoFim, { weekStartsOn: 0 });
  const dias = eachDayOfInterval({ start: gridInicio, end: gridFim });

  const mesAtualParam = format(mesReferencia, "yyyy-MM");
  const mesAnterior = format(subMonths(mesReferencia, 1), "yyyy-MM");
  const proximoMes = format(addMonths(mesReferencia, 1), "yyyy-MM");
  const mesAtualLabel = format(mesReferencia, "MMMM 'de' yyyy", { locale: ptBR });

  const periodoInicioISO = periodoInicio.toISOString();
  const periodoFimISO = periodoFim.toISOString();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold capitalize text-gray-900">{mesAtualLabel}</h1>
          <div className="mt-1 flex gap-3 text-sm">
            <Link href={`/admin/calendario?mes=${mesAnterior}`} className="text-blue-700 hover:text-blue-900">
              ← Mês anterior
            </Link>
            <Link href={`/admin/calendario?mes=${proximoMes}`} className="text-blue-700 hover:text-blue-900">
              Próximo mês →
            </Link>
          </div>
        </div>
        <div className="flex gap-3">
          <form action={gerarEscalaPeriodo.bind(null, periodoInicioISO, periodoFimISO)}>
            <Button type="submit">Gerar escala</Button>
          </form>
          <Link href={`/admin/calendario/confirmar?mes=${mesAtualParam}`}>
            <Button variant="secondary">Confirmar escala do mês</Button>
          </Link>
          <DeleteButton
            action={regenerarEscalaPeriodo.bind(null, periodoInicioISO, periodoFimISO)}
            confirmMessage="Isso apaga todas as atribuições geradas automaticamente neste mês e sorteia tudo de novo. Continuar?"
            label="Regenerar tudo"
          />
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 text-xs">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((dia) => (
          <div key={dia} className="bg-gray-50 px-2 py-2 text-center font-medium text-gray-500">
            {dia}
          </div>
        ))}

        {dias.map((dia) => {
          const ocorrenciasDoDia = ocorrencias.filter((o) => isSameDay(o.data, dia));
          const foraDoMes = !isSameMonth(dia, mesReferencia);

          return (
            <div
              key={dia.toISOString()}
              className={`min-h-[110px] bg-white p-2 ${foraDoMes ? "bg-gray-50 text-gray-400" : ""}`}
            >
              <p className="mb-1 text-right text-xs">{format(dia, "d")}</p>
              <div className="space-y-1">
                {ocorrenciasDoDia.map((ocorrencia) => {
                  const total = totalSlotsPorMissa.get(ocorrencia.missaId) ?? 0;
                  const preenchidas = ocorrencia.atribuicoes.filter((a) => a.servidorId).length;
                  const geradas = ocorrencia.atribuicoes.length;

                  let cor = "bg-gray-100 text-gray-600";
                  if (geradas > 0) {
                    cor =
                      preenchidas >= total && total > 0
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800";
                  }

                  return (
                    <Link
                      key={ocorrencia.id}
                      href={`/admin/calendario/${ocorrencia.id}`}
                      className={`block truncate rounded px-1.5 py-1 text-[11px] font-medium ${cor}`}
                      title={`${ocorrencia.missa.comunidade} — ${format(ocorrencia.data, "HH:mm")}`}
                    >
                      {format(ocorrencia.data, "HH:mm")} {ocorrencia.missa.comunidade}
                      {total > 0 ? ` (${preenchidas}/${total})` : ""}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-gray-100" /> Sem escala gerada
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-red-100" /> Vagas em aberto
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-green-100" /> Completa
        </span>
      </div>
    </div>
  );
}
