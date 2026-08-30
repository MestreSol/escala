import { parse } from "date-fns";

const UM_DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Todas as datas/horários de missa neste módulo são tratados como "horário
 * de parede" (wall clock) sem fuso real — não representam um instante UTC
 * genuíno, só usam os componentes UTC do Date como forma neutra de guardar
 * ano/mês/dia/hora/minuto sem depender do fuso do processo que os gerou
 * (dev local em America/Sao_Paulo, produção na Vercel em UTC, etc). Por
 * isso as funções abaixo usam getUTC()/Date.UTC em vez de getters locais —
 * misturar os dois é o que causa o clássico bug de "faltam/sobram 3 horas".
 * Para exibir com date-fns (que usa getters locais internamente), passe o
 * resultado por `paraExibicao` antes de formatar.
 */

/** Gera as datas (meia-noite UTC) em que um dia da semana ocorre dentro do período [inicio, fim]. */
export function gerarDatasOcorrencia(diaSemana: number, periodoInicio: Date, periodoFim: Date): Date[] {
  const datas: Date[] = [];
  let atual = new Date(
    Date.UTC(periodoInicio.getUTCFullYear(), periodoInicio.getUTCMonth(), periodoInicio.getUTCDate())
  );
  const fim = new Date(Date.UTC(periodoFim.getUTCFullYear(), periodoFim.getUTCMonth(), periodoFim.getUTCDate()));

  while (atual.getUTCDay() !== diaSemana) {
    atual = new Date(atual.getTime() + UM_DIA_MS);
    if (atual > fim) return datas;
  }

  while (atual <= fim) {
    datas.push(atual);
    atual = new Date(atual.getTime() + 7 * UM_DIA_MS);
  }

  return datas;
}

/** Combina uma data (meia-noite UTC, de `gerarDatasOcorrencia`) com um horário "HH:mm". */
export function combinarDataHorario(data: Date, horario: string): Date {
  const [horas, minutos] = horario.split(":").map(Number);
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate(), horas, minutos, 0, 0));
}

/**
 * Interpreta uma string de timestamp devolvida pelo Postgres/PostgREST (sem
 * "Z"/offset — "timestamp without time zone") como âncora UTC. Necessário
 * porque `new Date("2026-08-02T10:00:00")` (sem "Z") é lido pelo próprio
 * JavaScript como hora *local*, não UTC — sem isso, o valor já ancorado em
 * UTC na escrita levaria uma segunda conversão indevida na leitura.
 */
export function lerDataArmazenada(valor: string): Date {
  return new Date(valor.endsWith("Z") ? valor : `${valor}Z`);
}

/**
 * Converte uma data "âncora UTC" (ver acima) para um Date cujos getters
 * *locais* devolvem os mesmos componentes — use antes de formatar com
 * date-fns (`format`, `isSameDay`, etc.), que lê hora/dia usando o fuso
 * local do processo.
 */
export function paraExibicao(data: Date): Date {
  return new Date(
    data.getUTCFullYear(),
    data.getUTCMonth(),
    data.getUTCDate(),
    data.getUTCHours(),
    data.getUTCMinutes(),
    data.getUTCSeconds()
  );
}

/** Resolve o período [início, fim] de um mês a partir do parâmetro "yyyy-MM" usado no calendário. */
export function periodoDoMes(mesParam?: string): { periodoInicio: Date; periodoFim: Date } {
  let mesReferencia = new Date();
  if (mesParam) {
    const parsed = parse(mesParam, "yyyy-MM", new Date());
    if (!Number.isNaN(parsed.getTime())) mesReferencia = parsed;
  }

  const ano = mesReferencia.getFullYear();
  const mes = mesReferencia.getMonth();
  const periodoInicio = new Date(Date.UTC(ano, mes, 1, 0, 0, 0, 0));
  // Dia 0 do mês seguinte = último dia do mês atual.
  const periodoFim = new Date(Date.UTC(ano, mes + 1, 0, 23, 59, 59, 999));

  return { periodoInicio, periodoFim };
}
