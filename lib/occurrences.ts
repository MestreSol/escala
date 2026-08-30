import { addDays, endOfMonth, parse, startOfDay, startOfMonth } from "date-fns";

/** Gera as datas (meia-noite) em que um dia da semana ocorre dentro do período [inicio, fim]. */
export function gerarDatasOcorrencia(diaSemana: number, periodoInicio: Date, periodoFim: Date): Date[] {
  const datas: Date[] = [];
  let atual = startOfDay(periodoInicio);
  const fim = startOfDay(periodoFim);

  while (atual.getDay() !== diaSemana) {
    atual = addDays(atual, 1);
    if (atual > fim) return datas;
  }

  while (atual <= fim) {
    datas.push(atual);
    atual = addDays(atual, 7);
  }

  return datas;
}

/** Combina uma data (meia-noite) com um horário "HH:mm" em um único Date. */
export function combinarDataHorario(data: Date, horario: string): Date {
  const [horas, minutos] = horario.split(":").map(Number);
  const resultado = new Date(data);
  resultado.setHours(horas, minutos, 0, 0);
  return resultado;
}

/** Resolve o período [início, fim] de um mês a partir do parâmetro "yyyy-MM" usado no calendário. */
export function periodoDoMes(mesParam?: string): { periodoInicio: Date; periodoFim: Date } {
  let mesReferencia = new Date();
  if (mesParam) {
    const parsed = parse(mesParam, "yyyy-MM", new Date());
    if (!Number.isNaN(parsed.getTime())) mesReferencia = parsed;
  }

  const periodoInicio = startOfMonth(mesReferencia);
  const periodoFim = endOfMonth(mesReferencia);
  periodoFim.setHours(23, 59, 59, 999);

  return { periodoInicio, periodoFim };
}
