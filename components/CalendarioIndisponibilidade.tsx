"use client";

import { useState } from "react";
import clsx from "clsx";
import { SubmitButton } from "@/components/ui/SubmitButton";

export type DiaCalendario = {
  /** Dia do mês (1-31). */
  numero: number;
  /** Chave "yyyy-MM-dd", pra comparar com hoje. */
  chave: string;
  /** Âncora meia-noite UTC (ISO) — é o valor enviado no form (ver lib/occurrences.ts). */
  valor: string;
  /** Horários das missas desse dia ("09:30", "18:00"...). Vazio = dia sem missa. */
  horarios: string[];
  marcadoInicialmente: boolean;
};

const DIAS_DA_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const TEXTOS = {
  servidor: { marcado: "Não vou poder", curto: "Não vou", dica: "Toque nos dias em que você não pode servir." },
  admin: { marcado: "Não pode servir", curto: "Não pode", dica: "Clique nos dias em que a pessoa não pode servir." },
};

/**
 * Calendário do mês pra marcar os dias em que a pessoa NÃO pode servir. Só
 * dias com missa são clicáveis; dias que já passaram ficam travados (mas o
 * que já estava marcado neles continua salvo). Vai dentro do <form> do
 * servidor — cada dia marcado envia um input "datas".
 */
export function CalendarioIndisponibilidade({
  dias,
  primeiroDiaDaSemana,
  hoje,
  paraAdmin = false,
}: {
  dias: DiaCalendario[];
  /** 0 = o dia 1 cai num domingo ... 6 = sábado. */
  primeiroDiaDaSemana: number;
  /** "yyyy-MM-dd" no fuso da paróquia. */
  hoje: string;
  /** Textos em terceira pessoa, pro painel (ver /admin/disponibilidade). */
  paraAdmin?: boolean;
}) {
  const textos = paraAdmin ? TEXTOS.admin : TEXTOS.servidor;
  const [marcados, setMarcados] = useState(
    () => new Set(dias.filter((d) => d.marcadoInicialmente).map((d) => d.valor))
  );

  const selecionaveis = dias.filter((d) => d.horarios.length > 0 && d.chave >= hoje);
  const marcadosFuturos = selecionaveis.filter((d) => marcados.has(d.valor)).length;
  const mudou =
    dias.some((d) => d.marcadoInicialmente !== marcados.has(d.valor));

  function alternar(valor: string) {
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(valor)) novo.delete(valor);
      else novo.add(valor);
      return novo;
    });
  }

  const celulasVazias = (primeiroDiaDaSemana + dias.length) % 7 === 0 ? 0 : 7 - ((primeiroDiaDaSemana + dias.length) % 7);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {DIAS_DA_SEMANA.map((dia) => (
          <div key={dia} className="pb-1 text-center text-[10px] font-medium uppercase tracking-wider text-subtle">
            {dia}
          </div>
        ))}

        {Array.from({ length: primeiroDiaDaSemana }, (_, i) => (
          <div key={`antes-${i}`} aria-hidden />
        ))}

        {dias.map((dia) => {
          const temMissa = dia.horarios.length > 0;
          const passado = dia.chave < hoje;
          const marcado = marcados.has(dia.valor);
          const ehHoje = dia.chave === hoje;

          if (!temMissa) {
            return (
              <div
                key={dia.chave}
                className="flex aspect-square items-start justify-center rounded-lg pt-1.5 text-xs text-subtle/50 sm:pt-2 sm:text-sm"
              >
                {dia.numero}
              </div>
            );
          }

          return (
            <label
              key={dia.chave}
              title={`${marcado ? textos.marcado : "Disponível"} — missa às ${dia.horarios.join(" e ")}`}
              className={clsx(
                "relative flex aspect-square select-none flex-col items-center justify-start gap-0.5 rounded-lg border pt-1.5 text-xs transition-all duration-150 sm:pt-2 sm:text-sm",
                passado
                  ? "cursor-not-allowed opacity-35"
                  : "cursor-pointer active:scale-95 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/60",
                marcado
                  ? "border-danger/50 bg-danger-soft text-danger"
                  : "border-line bg-surface-2 text-fg",
                !passado && !marcado && "hover:border-accent/50",
                ehHoje && !marcado && "ring-1 ring-accent/60"
              )}
            >
              {passado ? (
                // Dia que já passou: não dá pra mudar, mas o que estava marcado
                // continua sendo enviado (senão o salvar apagaria).
                marcado ? <input type="hidden" name="datas" value={dia.valor} /> : null
              ) : (
                <input
                  type="checkbox"
                  name="datas"
                  value={dia.valor}
                  checked={marcado}
                  onChange={() => alternar(dia.valor)}
                  className="sr-only"
                />
              )}
              <span className={clsx("font-medium tabular-nums", marcado && "line-through decoration-2")}>
                {dia.numero}
              </span>
              {marcado ? (
                <span className="text-[10px] font-semibold uppercase leading-none tracking-wide sm:text-[11px]">
                  {textos.curto}
                </span>
              ) : (
                <>
                  {/* Celular: só um ponto; telas maiores: os horários. */}
                  <span aria-hidden className="size-1 rounded-full bg-accent sm:hidden" />
                  <span className="hidden flex-col items-center text-[10px] leading-tight text-accent/90 tabular-nums sm:flex">
                    {dia.horarios.map((horario) => (
                      <span key={horario}>{horario}</span>
                    ))}
                  </span>
                </>
              )}
            </label>
          );
        })}

        {Array.from({ length: celulasVazias }, (_, i) => (
          <div key={`depois-${i}`} aria-hidden />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-line bg-surface-2" /> Tem missa
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-danger/50 bg-danger-soft" /> {textos.marcado}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-surface-2/40" /> Sem missa
        </span>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-sm text-muted">
          {selecionaveis.length === 0
            ? "Nenhuma missa pela frente neste mês."
            : marcadosFuturos === 0
              ? textos.dica
              : `${marcadosFuturos} dia${marcadosFuturos > 1 ? "s" : ""} marcado${marcadosFuturos > 1 ? "s" : ""}`}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {marcadosFuturos > 0 ? (
            <button
              type="button"
              onClick={() =>
                setMarcados(
                  (atual) => new Set([...atual].filter((valor) => !selecionaveis.some((d) => d.valor === valor)))
                )
              }
              className="rounded-md px-2.5 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              Limpar
            </button>
          ) : null}
          <SubmitButton pendingLabel="Salvando" disabled={!mudou}>
            Salvar
          </SubmitButton>
        </div>
      </div>
    </div>
  );
}
