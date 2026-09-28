/**
 * Partes puras da agenda (sem banco), usadas tanto no .ics do servidor
 * (lib/calendarioIcs.ts) quanto no navegador (link "+ Google" por missa).
 */

export const FUSO_ICS = "America/Sao_Paulo";
const DURACAO_MINUTOS = 90;

export function tituloDoEvento(missa: { funcoes: string[]; todosAtivos: boolean }): string {
  if (missa.todosAtivos) return "Missa — todos os coroinhas";
  return missa.funcoes.length > 0 ? `Servir na missa — ${missa.funcoes.join(" + ")}` : "Servir na missa";
}

/** "20260906T093000" a partir do relógio de parede. */
export function dataHoraIcs(data: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${data.getUTCFullYear()}${p(data.getUTCMonth() + 1)}${p(data.getUTCDate())}` +
    `T${p(data.getUTCHours())}${p(data.getUTCMinutes())}00`
  );
}

export function fimDoEvento(inicio: Date): Date {
  return new Date(inicio.getTime() + DURACAO_MINUTOS * 60 * 1000);
}

/**
 * Link "adicionar ao Google Agenda" de UMA missa (não precisa assinar nada).
 * `inicioLocal` é "yyyy-MM-ddTHH:mm" no relógio da paróquia.
 */
export function linkGoogleAgenda(evento: {
  inicioLocal: string;
  titulo: string;
  comunidade: string;
  detalhes: string;
}): string {
  const [dia, hora] = evento.inicioLocal.split("T");
  const [ano, mes, diaNum] = dia.split("-").map(Number);
  const [h, m] = hora.split(":").map(Number);
  const inicio = new Date(Date.UTC(ano, mes - 1, diaNum, h, m));
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: evento.titulo,
    dates: `${dataHoraIcs(inicio)}/${dataHoraIcs(fimDoEvento(inicio))}`,
    ctz: FUSO_ICS,
    location: evento.comunidade,
    details: evento.detalhes,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
