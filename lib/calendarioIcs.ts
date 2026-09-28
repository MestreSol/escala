import { supabase } from "@/lib/supabase";
import { lerDataArmazenada, periodoDoMes } from "@/lib/occurrences";
import { listarMesesPublicados } from "@/lib/escalaPublicada";
import { FUSO_ICS, dataHoraIcs, fimDoEvento, tituloDoEvento } from "@/lib/agenda";

/**
 * Calendário (.ics) com as missas que um servidor vai servir, pra assinar no
 * Google Agenda / celular (webcal) ou baixar uma vez. Só entram meses com
 * escala publicada — rascunho nunca vaza pra agenda de ninguém.
 *
 * Horários de missa são relógio de parede (ver lib/occurrences.ts): os
 * componentes UTC do Date guardam a hora local da paróquia, e o .ics declara
 * esse horário com TZID America/Sao_Paulo.
 */

export type MissaNaAgenda = {
  ocorrenciaId: string;
  /** Relógio de parede (componentes UTC = hora local da paróquia). */
  inicio: Date;
  comunidade: string;
  /** Funções da pessoa nessa missa (mais de uma quando há acúmulo). */
  funcoes: string[];
  todosAtivos: boolean;
};

type AtribuicaoComOcorrencia = {
  ocorrenciaId: string;
  funcao: { nome: string } | null;
  ocorrencia: { id: string; data: string; missa: { comunidade: string } };
};

type OcorrenciaTodosAtivos = {
  id: string;
  data: string;
  missa: { comunidade: string; escalarTodosAtivos: boolean };
};

export async function buscarMissasDoServidor(servidorId: string): Promise<MissaNaAgenda[]> {
  const publicados = await listarMesesPublicados();
  if (publicados.length === 0) return [];

  const inicio = periodoDoMes(publicados[publicados.length - 1]).periodoInicio;
  const fim = periodoDoMes(publicados[0]).periodoFim;
  const noMesPublicado = (data: Date) =>
    publicados.includes(`${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}`);

  const [atribuicoesResult, todosAtivosResult] = await Promise.all([
    supabase
      .from("EscalaAtribuicao")
      .select("ocorrenciaId, funcao:Funcao(nome), ocorrencia:MissaOcorrencia!inner(id, data, missa:Missa(comunidade))")
      .eq("servidorId", servidorId)
      .gte("ocorrencia.data", inicio.toISOString())
      .lte("ocorrencia.data", fim.toISOString())
      .returns<AtribuicaoComOcorrencia[]>(),
    // Missas "Todos os coroinhas": todo ativo serve, mesmo sem linha de atribuição ainda.
    supabase
      .from("MissaOcorrencia")
      .select("id, data, missa:Missa!inner(comunidade, escalarTodosAtivos)")
      .eq("missa.escalarTodosAtivos", true)
      .gte("data", inicio.toISOString())
      .lte("data", fim.toISOString())
      .returns<OcorrenciaTodosAtivos[]>(),
  ]);
  if (atribuicoesResult.error) throw atribuicoesResult.error;
  if (todosAtivosResult.error) throw todosAtivosResult.error;

  const porOcorrencia = new Map<string, MissaNaAgenda>();

  for (const ocorrencia of todosAtivosResult.data ?? []) {
    const data = lerDataArmazenada(ocorrencia.data);
    if (!noMesPublicado(data)) continue;
    porOcorrencia.set(ocorrencia.id, {
      ocorrenciaId: ocorrencia.id,
      inicio: data,
      comunidade: ocorrencia.missa.comunidade,
      funcoes: [],
      todosAtivos: true,
    });
  }

  for (const atribuicao of atribuicoesResult.data ?? []) {
    const data = lerDataArmazenada(atribuicao.ocorrencia.data);
    if (!noMesPublicado(data)) continue;
    const existente = porOcorrencia.get(atribuicao.ocorrenciaId);
    const funcao = atribuicao.funcao?.nome;
    if (existente) {
      if (funcao && !existente.funcoes.includes(funcao)) existente.funcoes.push(funcao);
    } else {
      porOcorrencia.set(atribuicao.ocorrenciaId, {
        ocorrenciaId: atribuicao.ocorrenciaId,
        inicio: data,
        comunidade: atribuicao.ocorrencia.missa.comunidade,
        funcoes: funcao ? [funcao] : [],
        todosAtivos: false,
      });
    }
  }

  return [...porOcorrencia.values()].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}

/** Escapa texto de propriedade do .ics (RFC 5545 §3.3.11). */
function escapar(texto: string): string {
  return texto.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Quebra linhas longas (máx. 75 octetos) com CRLF + espaço, sem partir caractere UTF-8. */
function dobrar(linha: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(linha).length <= 75) return linha;
  const partes: string[] = [];
  let atual = "";
  for (const caractere of linha) {
    const limite = partes.length === 0 ? 75 : 74;
    if (encoder.encode(atual + caractere).length > limite) {
      partes.push(atual);
      atual = caractere;
    } else {
      atual += caractere;
    }
  }
  partes.push(atual);
  return partes.join("\r\n ");
}

export function gerarIcs(missas: MissaNaAgenda[], opcoes: { nomeCalendario: string; servidorId: string; urlEscala: string }): string {
  const agora = new Date();
  const carimbo = `${agora.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;

  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Escala de Servidores do Altar//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapar(opcoes.nomeCalendario)}`,
    `X-WR-TIMEZONE:${FUSO_ICS}`,
    // Sugere aos apps que assinam buscar de novo a cada 6h (o Google usa o próprio ritmo).
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
    // Brasil sem horário de verão desde 2019: um único bloco STANDARD em -03:00.
    "BEGIN:VTIMEZONE",
    `TZID:${FUSO_ICS}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:-0300",
    "TZOFFSETTO:-0300",
    "TZNAME:-03",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];

  for (const missa of missas) {
    const descricao = [
      missa.todosAtivos ? "Todos os coroinhas servem nesta missa." : `Função: ${missa.funcoes.join(" + ") || "—"}`,
      `Comunidade: ${missa.comunidade}`,
      `Escala completa: ${opcoes.urlEscala}`,
    ].join("\n");

    linhas.push(
      "BEGIN:VEVENT",
      `UID:${missa.ocorrenciaId}-${opcoes.servidorId}@escala-altar`,
      `DTSTAMP:${carimbo}`,
      `DTSTART;TZID=${FUSO_ICS}:${dataHoraIcs(missa.inicio)}`,
      `DTEND;TZID=${FUSO_ICS}:${dataHoraIcs(fimDoEvento(missa.inicio))}`,
      `SUMMARY:${escapar(tituloDoEvento(missa))}`,
      `LOCATION:${escapar(missa.comunidade)}`,
      `DESCRIPTION:${escapar(descricao)}`,
      // Lembrete 1h antes (apps que assinam por URL, como o Google, podem ignorar).
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:Missa daqui a 1 hora",
      "TRIGGER:-PT1H",
      "END:VALARM",
      "END:VEVENT"
    );
  }

  linhas.push("END:VCALENDAR");
  return linhas.map(dobrar).join("\r\n") + "\r\n";
}
