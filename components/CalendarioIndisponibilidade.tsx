"use client";

import { ReactNode, useState } from "react";
import clsx from "clsx";
import { SubmitButton } from "@/components/ui/SubmitButton";

export type MissaDoDia = {
  horario: string;
  /** Âncora da missa (ISO, com horário) — valor enviado quando só essa missa é marcada. */
  valor: string;
  marcadoInicialmente: boolean;
};

export type DiaCalendario = {
  /** Dia do mês (1-31). */
  numero: number;
  /** Chave "yyyy-MM-dd", pra comparar com hoje. */
  chave: string;
  /** Âncora meia-noite UTC (ISO) — valor enviado quando o dia inteiro é marcado (ver lib/occurrences.ts). */
  valor: string;
  /** Horários das missas desse dia ("09:30", "18:00"...). Vazio = dia sem missa. */
  horarios: string[];
  /** As missas do dia, pra marcar só uma delas (ex: domingo de manhã). */
  missas: MissaDoDia[];
  /** O dia inteiro já estava marcado. */
  marcadoInicialmente: boolean;
};

const DIAS_DA_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_DA_SEMANA_LONGO = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const TEXTOS = {
  servidor: {
    marcado: "Não vou poder",
    curto: "Não vou",
    dica: "Toque nos dias (ou nas missas) em que você não pode servir.",
  },
  admin: {
    marcado: "Não pode servir",
    curto: "Não pode",
    dica: "Clique nos dias (ou nas missas) em que a pessoa não pode servir.",
  },
};

function marcadosIniciais(dias: DiaCalendario[]): Set<string> {
  const valores = new Set<string>();
  for (const dia of dias) {
    if (dia.marcadoInicialmente) valores.add(dia.valor);
    for (const missa of dia.missas) if (missa.marcadoInicialmente) valores.add(missa.valor);
  }
  return valores;
}

/**
 * Calendário do mês pra marcar quando a pessoa NÃO pode servir: o dia inteiro
 * ou, nos dias com mais de uma missa, só uma delas (ex: domingo de manhã).
 * Só dias com missa são clicáveis; dias que já passaram ficam travados (mas o
 * que já estava marcado neles continua salvo). Vai dentro do <form>: cada
 * marcação envia um input "datas" (meia-noite = dia inteiro; com horário = a missa).
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
  const [iniciais] = useState(() => marcadosIniciais(dias));
  const [marcados, setMarcados] = useState(() => new Set(iniciais));
  const [diaAberto, setDiaAberto] = useState<string | null>(null);

  const selecionaveis = dias.filter((d) => d.missas.length > 0 && d.chave >= hoje);
  const temMarca = (dia: DiaCalendario) => marcados.has(dia.valor) || dia.missas.some((m) => marcados.has(m.valor));
  const diasMarcados = selecionaveis.filter(temMarca).length;
  const mudou = marcados.size !== iniciais.size || [...marcados].some((v) => !iniciais.has(v));
  const aberto = dias.find((d) => d.chave === diaAberto) ?? null;

  function alterar(mudanca: (novo: Set<string>) => void) {
    setMarcados((atual) => {
      const novo = new Set(atual);
      mudanca(novo);
      return novo;
    });
  }

  function alternarDiaTodo(dia: DiaCalendario) {
    alterar((novo) => {
      const estava = novo.has(dia.valor);
      for (const missa of dia.missas) novo.delete(missa.valor);
      if (estava) novo.delete(dia.valor);
      else novo.add(dia.valor);
    });
  }

  function alternarMissa(dia: DiaCalendario, missa: MissaDoDia) {
    alterar((novo) => {
      if (novo.has(dia.valor)) {
        // Estava o dia todo: tocar numa missa deixa só ela marcada.
        novo.delete(dia.valor);
        novo.add(missa.valor);
      } else if (novo.has(missa.valor)) {
        novo.delete(missa.valor);
      } else {
        novo.add(missa.valor);
      }
      // Todas as missas marcadas = o dia inteiro.
      if (dia.missas.every((m) => novo.has(m.valor))) {
        for (const m of dia.missas) novo.delete(m.valor);
        novo.add(dia.valor);
      }
    });
  }

  function clicarDia(dia: DiaCalendario) {
    if (dia.missas.length > 1) setDiaAberto((atual) => (atual === dia.chave ? null : dia.chave));
    else alternarDiaTodo(dia);
  }

  const celulasVazias = (primeiroDiaDaSemana + dias.length) % 7 === 0 ? 0 : 7 - ((primeiroDiaDaSemana + dias.length) % 7);

  return (
    <div>
      {[...marcados].map((valor) => (
        <input key={valor} type="hidden" name="datas" value={valor} />
      ))}

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
          const passado = dia.chave < hoje;
          const ehHoje = dia.chave === hoje;

          if (dia.missas.length === 0) {
            return (
              <div
                key={dia.chave}
                className="flex aspect-square items-start justify-center rounded-lg pt-1.5 text-xs text-subtle/50 sm:pt-2 sm:text-sm"
              >
                {dia.numero}
              </div>
            );
          }

          const diaTodo = marcados.has(dia.valor);
          const missasMarcadas = dia.missas.filter((m) => marcados.has(m.valor));
          const parcial = !diaTodo && missasMarcadas.length > 0;

          return (
            <button
              key={dia.chave}
              type="button"
              disabled={passado}
              aria-pressed={diaTodo || parcial}
              onClick={() => clicarDia(dia)}
              title={
                diaTodo
                  ? `${textos.marcado} — o dia todo`
                  : parcial
                    ? `${textos.marcado} às ${missasMarcadas.map((m) => m.horario).join(" e ")}`
                    : `Disponível — missa às ${dia.horarios.join(" e ")}`
              }
              className={clsx(
                "relative flex aspect-square select-none flex-col items-center justify-start gap-0.5 rounded-lg border pt-1.5 text-xs transition-all duration-150 sm:pt-2 sm:text-sm",
                passado
                  ? "cursor-not-allowed opacity-35"
                  : "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 active:scale-95",
                diaTodo
                  ? "border-danger/50 bg-danger-soft text-danger"
                  : parcial
                    ? "border-warn/50 bg-warn-soft text-fg"
                    : "border-line bg-surface-2 text-fg",
                !passado && !diaTodo && !parcial && "hover:border-accent/50",
                diaAberto === dia.chave && "ring-2 ring-accent",
                ehHoje && !diaTodo && !parcial && diaAberto !== dia.chave && "ring-1 ring-accent/60"
              )}
            >
              <span className={clsx("font-medium tabular-nums", diaTodo && "line-through decoration-2")}>
                {dia.numero}
              </span>
              {diaTodo ? (
                <span className="text-[10px] font-semibold uppercase leading-none tracking-wide sm:text-[11px]">
                  {textos.curto}
                </span>
              ) : (
                <>
                  {/* Celular: só um ponto; telas maiores: os horários. */}
                  <span aria-hidden className={clsx("size-1 rounded-full sm:hidden", parcial ? "bg-warn" : "bg-accent")} />
                  <span className="hidden flex-col items-center text-[10px] leading-tight tabular-nums sm:flex">
                    {dia.missas.map((missa) => (
                      <span
                        key={missa.horario}
                        className={marcados.has(missa.valor) ? "text-danger line-through" : "text-accent/90"}
                      >
                        {missa.horario}
                      </span>
                    ))}
                  </span>
                </>
              )}
            </button>
          );
        })}

        {Array.from({ length: celulasVazias }, (_, i) => (
          <div key={`depois-${i}`} aria-hidden />
        ))}
      </div>

      {aberto ? (
        <div className="mt-4 animate-fade-in rounded-xl border border-accent/30 bg-accent-soft p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-fg">
              {DIAS_DA_SEMANA_LONGO[new Date(`${aberto.chave}T12:00:00Z`).getUTCDay()]}, dia {aberto.numero}
            </p>
            <button
              type="button"
              onClick={() => setDiaAberto(null)}
              className="rounded px-2 text-xs text-muted transition-colors hover:text-fg"
            >
              Fechar
            </button>
          </div>
          <p className="mb-2 text-xs text-muted">{paraAdmin ? "Em quais missas a pessoa não pode?" : "Em quais missas você não pode?"}</p>
          <div className="flex flex-wrap gap-2">
            <BotaoOpcao ativo={marcados.has(aberto.valor)} onClick={() => alternarDiaTodo(aberto)}>
              O dia todo
            </BotaoOpcao>
            {aberto.missas.map((missa) => (
              <BotaoOpcao
                key={missa.valor}
                ativo={!marcados.has(aberto.valor) && marcados.has(missa.valor)}
                onClick={() => alternarMissa(aberto, missa)}
              >
                Só às {missa.horario}
              </BotaoOpcao>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-line bg-surface-2" /> Tem missa
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-danger/50 bg-danger-soft" /> {textos.marcado}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-warn/50 bg-warn-soft" /> Só algumas missas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-surface-2/40" /> Sem missa
        </span>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-sm text-muted">
          {selecionaveis.length === 0
            ? "Nenhuma missa pela frente neste mês."
            : diasMarcados === 0
              ? textos.dica
              : `${diasMarcados} dia${diasMarcados > 1 ? "s" : ""} marcado${diasMarcados > 1 ? "s" : ""}`}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {diasMarcados > 0 ? (
            <button
              type="button"
              onClick={() => {
                const futuros = new Set(selecionaveis.map((d) => d.chave));
                alterar((novo) => {
                  for (const valor of [...novo]) if (futuros.has(valor.slice(0, 10))) novo.delete(valor);
                });
                setDiaAberto(null);
              }}
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

function BotaoOpcao({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={clsx(
        "rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors",
        ativo ? "bg-danger-soft text-danger ring-danger/40" : "bg-surface text-fg ring-line hover:ring-accent/50"
      )}
    >
      {children}
    </button>
  );
}
