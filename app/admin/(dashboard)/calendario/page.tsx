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
import { supabase } from "@/lib/supabase";
import clsx from "clsx";
import { buttonClasses } from "@/components/ui/Button";
import { AcaoEscalaForm } from "@/components/admin/AcaoEscalaForm";
import { periodoDoMes, paraExibicao, lerDataArmazenada } from "@/lib/occurrences";
import type { EscalaAtribuicaoRow, MissaFuncaoRequisitoRow, MissaRow, MissaOcorrenciaRow } from "@/lib/types";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ActionForm } from "@/components/ui/ActionForm";
import { mesEstaPublicado } from "@/lib/escalaPublicada";
import { materializarOcorrencias } from "@/lib/materializarOcorrencias";
import {
  gerarEscalaPeriodo,
  regenerarEscalaPeriodo,
  apagarEscalaPeriodo,
  publicarEscalaMes,
  despublicarEscalaMes,
} from "./actions";

const COR_SEM_ESCALA = "bg-surface-2 text-muted ring-line";
const COR_EM_ABERTO = "bg-danger-soft text-danger ring-danger/20";
const COR_COMPLETA = "bg-ok-soft text-ok ring-ok/20";

// Página lê e materializa dados do banco a cada acesso — nunca deve ser congelada em build.
export const dynamic = "force-dynamic";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const { periodoInicio, periodoFim } = periodoDoMes(mes);

  await materializarOcorrencias(periodoInicio, periodoFim);

  const [ocorrenciasResult, requisitosResult] = await Promise.all([
    supabase
      .from("MissaOcorrencia")
      .select("*, missa:Missa(*), atribuicoes:EscalaAtribuicao(*)")
      .gte("data", periodoInicio.toISOString())
      .lte("data", periodoFim.toISOString())
      .order("data", { ascending: true })
      .returns<(MissaOcorrenciaRow & { missa: MissaRow; atribuicoes: EscalaAtribuicaoRow[] })[]>(),
    supabase.from("MissaFuncaoRequisito").select("*").eq("ativo", true).returns<MissaFuncaoRequisitoRow[]>(),
  ]);
  if (ocorrenciasResult.error) throw ocorrenciasResult.error;
  if (requisitosResult.error) throw requisitosResult.error;

  // As datas vêm "ancoradas em UTC" (ver lib/occurrences.ts); convertidas
  // aqui para exibição, para que format()/isSameDay() (que usam o fuso
  // local do processo) mostrem o horário de missa certo em qualquer fuso.
  const ocorrencias = (ocorrenciasResult.data ?? []).map((o) => ({
    ...o,
    dataExibicao: paraExibicao(lerDataArmazenada(o.data)),
  }));
  const requisitos = requisitosResult.data ?? [];

  const totalSlotsPorMissa = new Map<string, number>();
  for (const req of requisitos) {
    totalSlotsPorMissa.set(req.missaId, (totalSlotsPorMissa.get(req.missaId) ?? 0) + req.quantidade);
  }

  const mesReferencia = paraExibicao(periodoInicio);
  const periodoFimExibicao = paraExibicao(periodoFim);
  const gridInicio = startOfWeek(mesReferencia, { weekStartsOn: 0 });
  const gridFim = endOfWeek(periodoFimExibicao, { weekStartsOn: 0 });
  const dias = eachDayOfInterval({ start: gridInicio, end: gridFim });

  const mesAtualParam = format(mesReferencia, "yyyy-MM");
  const mesAnterior = format(subMonths(mesReferencia, 1), "yyyy-MM");
  const proximoMes = format(addMonths(mesReferencia, 1), "yyyy-MM");
  const mesAtualLabel = format(mesReferencia, "MMMM 'de' yyyy", { locale: ptBR });

  const periodoInicioISO = periodoInicio.toISOString();
  const periodoFimISO = periodoFim.toISOString();

  const hoje = new Date();
  const publicado = await mesEstaPublicado(mesAtualParam);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-subtle">Calendário</p>
          <h1 className="text-2xl font-semibold capitalize tracking-tight text-fg">{mesAtualLabel}</h1>
          <div className="mt-2 flex gap-1 text-sm">
            <Link
              href={`/admin/calendario?mes=${mesAnterior}`}
              className="rounded-md px-2 py-1 text-muted transition-colors hover:bg-surface hover:text-fg"
            >
              ← Anterior
            </Link>
            <Link
              href={`/admin/calendario?mes=${proximoMes}`}
              className="rounded-md px-2 py-1 text-muted transition-colors hover:bg-surface hover:text-fg"
            >
              Próximo →
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AcaoEscalaForm
            action={gerarEscalaPeriodo.bind(null, periodoInicioISO, periodoFimISO)}
            pendingTitle="Gerando escala"
            successMessage="Escala gerada."
          >
            Gerar escala
          </AcaoEscalaForm>
          <Link href={`/admin/calendario/confirmar?mes=${mesAtualParam}`} className={buttonClasses("secondary")}>
            Confirmar escala do mês
          </Link>
          <AcaoEscalaForm
            action={regenerarEscalaPeriodo.bind(null, periodoInicioISO, periodoFimISO)}
            variant="ghost"
            pendingTitle="Regenerando escala"
            successMessage="Escala regenerada."
            confirmMessage="Isso apaga todas as atribuições geradas automaticamente neste mês e sorteia tudo de novo. Continuar?"
          >
            Regenerar tudo
          </AcaoEscalaForm>
          <AcaoEscalaForm
            action={apagarEscalaPeriodo.bind(null, periodoInicioISO, periodoFimISO)}
            variant="danger"
            pendingTitle="Apagando escala do mês"
            successMessage="Escala do mês apagada."
            mensagens={["Removendo atribuições", "Liberando as vagas"]}
            confirmMessage="Isso apaga TODAS as atribuições deste mês, incluindo as editadas manualmente, sem gerar outras no lugar. Use quando 'Gerar escala' não estiver preenchendo mais nada. Continuar?"
          >
            Apagar escala
          </AcaoEscalaForm>
        </div>
      </div>

      <div
        className={clsx(
          "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
          publicado ? "border-ok/25 bg-ok-soft" : "border-line bg-surface"
        )}
      >
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className={clsx("size-2 rounded-full", publicado ? "animate-pulse-soft bg-ok" : "bg-subtle")}
          />
          {publicado ? (
            <span className="text-fg">
              Publicada para os servidores em{" "}
              <Link href={`/escala?mes=${mesAtualParam}`} target="_blank" className="text-accent hover:text-accent-hover">
                /escala ↗
              </Link>
            </span>
          ) : (
            <span className="text-muted">Rascunho — os servidores ainda não veem a escala deste mês.</span>
          )}
        </div>
        <ActionForm
          action={(publicado ? despublicarEscalaMes : publicarEscalaMes).bind(null, mesAtualParam)}
          successMessage={publicado ? "Escala despublicada." : "Escala publicada para os servidores."}
        >
          <SubmitButton
            variant={publicado ? "ghost" : "primary"}
            pendingLabel={publicado ? "Despublicando" : "Publicando"}
          >
            {publicado ? "Despublicar" : "Publicar para os servidores"}
          </SubmitButton>
        </ActionForm>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[640px] grid-cols-7 gap-px overflow-hidden rounded-xl border border-line bg-line text-xs">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((dia) => (
            <div
              key={dia}
              className="bg-bg px-2 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-subtle"
            >
              {dia}
            </div>
          ))}

          {dias.map((dia) => {
            const ocorrenciasDoDia = ocorrencias.filter((o) => isSameDay(o.dataExibicao, dia));
            const foraDoMes = !isSameMonth(dia, mesReferencia);
            const ehHoje = isSameDay(dia, hoje);

            return (
              <div
                key={dia.toISOString()}
                className={clsx("min-h-[110px] p-2", foraDoMes ? "bg-bg text-subtle/60" : "bg-surface text-muted")}
              >
                <p className="mb-1.5 flex justify-end">
                  <span
                    className={clsx(
                      "flex size-6 items-center justify-center rounded-full text-xs",
                      ehHoje && "bg-accent font-semibold text-accent-fg"
                    )}
                  >
                    {format(dia, "d")}
                  </span>
                </p>
                <div className="space-y-1">
                  {ocorrenciasDoDia.map((ocorrencia) => {
                    const total = totalSlotsPorMissa.get(ocorrencia.missaId) ?? 0;
                    const preenchidas = ocorrencia.atribuicoes.filter((a) => a.servidorId).length;
                    const geradas = ocorrencia.atribuicoes.length;

                    let cor = COR_SEM_ESCALA;
                    let rotulo = "";
                    if (ocorrencia.missa.escalarTodosAtivos) {
                      // Missa "todos os ativos" não tem vagas por função — o
                      // total de referência é quem já foi escalado, não uma
                      // meta fixa, então "completa" aqui só significa "já tem
                      // gente" (ver ListaTodosAtivos na página da ocorrência).
                      cor = geradas > 0 ? COR_COMPLETA : COR_SEM_ESCALA;
                      rotulo = geradas > 0 ? ` (${preenchidas} escalados)` : "";
                    } else {
                      if (geradas > 0) {
                        cor = preenchidas >= total && total > 0 ? COR_COMPLETA : COR_EM_ABERTO;
                      }
                      rotulo = total > 0 ? ` (${preenchidas}/${total})` : "";
                    }

                    return (
                      <Link
                        key={ocorrencia.id}
                        href={`/admin/calendario/${ocorrencia.id}`}
                        className={clsx(
                          "block truncate rounded-md px-1.5 py-1 text-[11px] font-medium ring-1 ring-inset transition-all hover:-translate-y-px hover:brightness-125",
                          cor
                        )}
                        title={`${ocorrencia.missa.comunidade} — ${format(ocorrencia.dataExibicao, "HH:mm")}`}
                      >
                        <span className="tabular-nums">{format(ocorrencia.dataExibicao, "HH:mm")}</span>{" "}
                        {ocorrencia.missa.comunidade}
                        <span className="opacity-70">{rotulo}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className={clsx("size-2.5 rounded-sm ring-1 ring-inset", COR_SEM_ESCALA)} /> Sem escala gerada
        </span>
        <span className="flex items-center gap-1.5">
          <span className={clsx("size-2.5 rounded-sm ring-1 ring-inset", COR_EM_ABERTO)} /> Vagas em aberto
        </span>
        <span className="flex items-center gap-1.5">
          <span className={clsx("size-2.5 rounded-sm ring-1 ring-inset", COR_COMPLETA)} /> Completa
        </span>
      </div>
    </div>
  );
}
