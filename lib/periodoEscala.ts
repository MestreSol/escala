import { periodoDoMes } from "@/lib/occurrences";
import type { ModoEscala } from "@/lib/types";

/**
 * Período de escala de uma pastoral: o mês ("2026-10") no modo MENSAL, ou a
 * semana de segunda a domingo, identificada pela segunda-feira ("2026-10-12"),
 * no modo SEMANAL. A mesma "chave" vai em EscalaPublicada.mes.
 *
 * Datas seguem a convenção de lib/occurrences.ts: âncoras em UTC.
 */

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const p2 = (n: number) => String(n).padStart(2, "0");
const UM_DIA_MS = 24 * 60 * 60 * 1000;

export function ehChaveDeSemana(chave: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(chave);
}

export function ehChaveDeMes(chave: string): boolean {
  return /^\d{4}-\d{2}$/.test(chave);
}

/** "yyyy-MM-dd" de uma âncora UTC. */
function chaveDoDia(data: Date): string {
  return `${data.getUTCFullYear()}-${p2(data.getUTCMonth() + 1)}-${p2(data.getUTCDate())}`;
}

/** Âncora UTC (meia-noite) de "yyyy-MM-dd". */
export function diaDaChave(chave: string): Date {
  const [ano, mes, dia] = chave.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

/** Segunda-feira ("yyyy-MM-dd") da semana que contém o dia. */
export function chaveDaSemana(dia: Date | string): string {
  const data = typeof dia === "string" ? diaDaChave(dia.slice(0, 10)) : dia;
  const base = Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate());
  const recuo = (new Date(base).getUTCDay() + 6) % 7; // segunda = 0 ... domingo = 6
  return chaveDoDia(new Date(base - recuo * UM_DIA_MS));
}

export function somarSemanas(chave: string, n: number): string {
  return chaveDoDia(new Date(diaDaChave(chave).getTime() + n * 7 * UM_DIA_MS));
}

/** [segunda 00:00, domingo 23:59:59.999] da semana, em âncora UTC. */
export function periodoDaSemana(chave: string): { periodoInicio: Date; periodoFim: Date } {
  const periodoInicio = diaDaChave(chave);
  const periodoFim = new Date(periodoInicio.getTime() + 7 * UM_DIA_MS - 1);
  return { periodoInicio, periodoFim };
}

/** Início e fim do período de qualquer chave (mês ou semana). */
export function periodoDaChave(chave: string): { periodoInicio: Date; periodoFim: Date } {
  return ehChaveDeSemana(chave) ? periodoDaSemana(chave) : periodoDoMes(chave);
}

/** Segundas-feiras das semanas que têm pelo menos um dia no mês (podem começar no mês anterior). */
export function semanasDoMes(mes: string): string[] {
  const { periodoInicio, periodoFim } = periodoDoMes(mes);
  const semanas: string[] = [];
  for (let chave = chaveDaSemana(periodoInicio); diaDaChave(chave) <= periodoFim; chave = somarSemanas(chave, 1)) {
    semanas.push(chave);
  }
  return semanas;
}

/** "12/10 a 18/10". */
export function rotuloCurtoDaSemana(chave: string): string {
  const { periodoInicio, periodoFim } = periodoDaSemana(chave);
  const d = (data: Date) => `${p2(data.getUTCDate())}/${p2(data.getUTCMonth() + 1)}`;
  return `${d(periodoInicio)} a ${d(periodoFim)}`;
}

/** "Semana de 12 a 18 de outubro de 2026" (ou "28 de setembro a 4 de outubro de 2026"). */
export function rotuloLongoDaSemana(chave: string): string {
  const { periodoInicio: i, periodoFim: f } = periodoDaSemana(chave);
  if (i.getUTCMonth() === f.getUTCMonth()) {
    return `Semana de ${i.getUTCDate()} a ${f.getUTCDate()} de ${MESES[f.getUTCMonth()]} de ${f.getUTCFullYear()}`;
  }
  const anoInicio = i.getUTCFullYear() !== f.getUTCFullYear() ? ` de ${i.getUTCFullYear()}` : "";
  return `Semana de ${i.getUTCDate()} de ${MESES[i.getUTCMonth()]}${anoInicio} a ${f.getUTCDate()} de ${MESES[f.getUTCMonth()]} de ${f.getUTCFullYear()}`;
}

/** "Outubro de 2026". */
export function rotuloDoMes(mes: string): string {
  const [ano, numero] = mes.split("-").map(Number);
  const nome = MESES[numero - 1];
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${ano}`;
}

export function rotuloDoPeriodo(chave: string): string {
  return ehChaveDeSemana(chave) ? rotuloLongoDaSemana(chave) : rotuloDoMes(chave);
}

/** Chave do período que contém o dia "hoje" ("yyyy-MM-dd"), no modo da pastoral. */
export function chaveDoPeriodoDeHoje(modo: ModoEscala, hoje: string): string {
  return modo === "SEMANAL" ? chaveDaSemana(hoje) : hoje.slice(0, 7);
}

/** A chave combina com o modo da pastoral? (semana pra SEMANAL, mês pra MENSAL) */
export function chaveValidaParaModo(modo: ModoEscala, chave: string): boolean {
  if (modo === "SEMANAL") return ehChaveDeSemana(chave) && chaveDaSemana(chave) === chave;
  return ehChaveDeMes(chave);
}

/**
 * Período pedido na URL das telas da escala (imagem, PDF, confirmação,
 * página pública): `?semana=yyyy-MM-dd` (qualquer dia vira a segunda da
 * semana) ou `?mes=yyyy-MM` (padrão: mês atual).
 */
export function periodoDaUrl(params: { mes?: string | null; semana?: string | null }): {
  chave: string;
  semanal: boolean;
  periodoInicio: Date;
  periodoFim: Date;
  titulo: string;
} {
  if (params.semana && ehChaveDeSemana(params.semana)) {
    const chave = chaveDaSemana(params.semana);
    return { chave, semanal: true, ...periodoDaSemana(chave), titulo: rotuloLongoDaSemana(chave) };
  }
  const { periodoInicio, periodoFim } = periodoDoMes(params.mes ?? undefined);
  const chave = `${periodoInicio.getUTCFullYear()}-${p2(periodoInicio.getUTCMonth() + 1)}`;
  return { chave, semanal: false, periodoInicio, periodoFim, titulo: rotuloDoMes(chave) };
}
