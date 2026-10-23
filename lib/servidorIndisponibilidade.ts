import { supabase } from "@/lib/supabase";
import { generateId } from "@/lib/db";
import { chaveIndisponibilidade, diaChave } from "@/lib/scheduleGenerator";
import type { ServidorIndisponibilidadeRow } from "@/lib/types";
import type { DiaCalendario } from "@/components/CalendarioIndisponibilidade";

const TABELA = "ServidorIndisponibilidade";

/** Mapa servidorId -> avisos (ver chaveIndisponibilidade: dia inteiro ou missa), pro gerador de escala. */
export async function getIndisponibilidadeMap(pastoralId: string): Promise<Map<string, Set<string>>> {
  const { data, error } = await supabase
    .from(TABELA)
    .select("servidorId, data, servidor:Servidor!inner(pastoralId)")
    .eq("servidor.pastoralId", pastoralId)
    .returns<ServidorIndisponibilidadeRow[]>();
  if (error) throw error;

  const mapa = new Map<string, Set<string>>();
  for (const linha of data ?? []) {
    const chave = chaveIndisponibilidade(new Date(linha.data.endsWith("Z") ? linha.data : `${linha.data}Z`));
    const dias = mapa.get(linha.servidorId);
    if (dias) dias.add(chave);
    else mapa.set(linha.servidorId, new Set([chave]));
  }
  return mapa;
}

/** Avisos de um servidor dentro de um período (ver chaveIndisponibilidade) — pra pré-marcar o calendário. */
export async function getDatasIndisponiveisDoServidor(
  servidorId: string,
  periodoInicio: Date,
  periodoFim: Date
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from(TABELA)
    .select("data")
    .eq("servidorId", servidorId)
    .gte("data", periodoInicio.toISOString())
    .lte("data", periodoFim.toISOString())
    .returns<{ data: string }[]>();
  if (error) throw error;

  return new Set(
    (data ?? []).map((linha) => chaveIndisponibilidade(new Date(linha.data.endsWith("Z") ? linha.data : `${linha.data}Z`)))
  );
}

/** Substitui os dias indisponíveis de um servidor dentro de um período pela lista informada. */
export async function setIndisponibilidadeDoServidorNoPeriodo(
  servidorId: string,
  periodoInicio: Date,
  periodoFim: Date,
  datas: Date[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from(TABELA)
    .delete()
    .eq("servidorId", servidorId)
    .gte("data", periodoInicio.toISOString())
    .lte("data", periodoFim.toISOString());
  if (deleteError) throw deleteError;

  if (datas.length === 0) return;

  const linhas = datas.map((data) => ({ id: generateId(), servidorId, data: data.toISOString() }));
  const { error: insertError } = await supabase.from(TABELA).insert(linhas);
  if (insertError) throw insertError;
}

/** Dias que o servidor avisou como indisponível, de `desde` em diante — pro painel poder liberar. */
export async function listarIndisponibilidadesDoServidor(
  servidorId: string,
  desde: Date
): Promise<{ id: string; data: string }[]> {
  const { data, error } = await supabase
    .from(TABELA)
    .select("id, data")
    .eq("servidorId", servidorId)
    .gte("data", desde.toISOString())
    .order("data", { ascending: true })
    .returns<{ id: string; data: string }[]>();
  if (error) throw error;
  return data ?? [];
}

/** Libera um dia avisado (ex: a família confirmou que a pessoa pode servir). */
export async function removerIndisponibilidade(servidorId: string, indisponibilidadeId: string): Promise<void> {
  const { error } = await supabase.from(TABELA).delete().eq("id", indisponibilidadeId).eq("servidorId", servidorId);
  if (error) throw error;
}

/**
 * Dias do mês pro calendário de indisponibilidade (tela pública e painel):
 * cada dia com as missas da pastoral e o que já foi avisado — o dia inteiro
 * (valor = meia-noite) ou missas específicas (valor = horário da missa).
 */
export function montarDiasDoCalendario(
  periodoInicio: Date,
  periodoFim: Date,
  ocorrencias: { data: string }[],
  avisos: Set<string>
): DiaCalendario[] {
  const missasPorDia = new Map<number, Map<string, string>>();
  for (const ocorrencia of ocorrencias) {
    const ancora = new Date(ocorrencia.data.endsWith("Z") ? ocorrencia.data : `${ocorrencia.data}Z`);
    const horario = `${String(ancora.getUTCHours()).padStart(2, "0")}:${String(ancora.getUTCMinutes()).padStart(2, "0")}`;
    const doDia = missasPorDia.get(ancora.getUTCDate()) ?? new Map<string, string>();
    doDia.set(horario, ancora.toISOString());
    missasPorDia.set(ancora.getUTCDate(), doDia);
  }

  const ano = periodoInicio.getUTCFullYear();
  const mesIndice = periodoInicio.getUTCMonth();
  return Array.from({ length: periodoFim.getUTCDate() }, (_, i) => {
    const ancora = new Date(Date.UTC(ano, mesIndice, i + 1));
    const missas = [...(missasPorDia.get(i + 1) ?? new Map<string, string>())]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([horario, valor]) => ({
        horario,
        valor,
        marcadoInicialmente: avisos.has(chaveIndisponibilidade(new Date(valor))),
      }));
    return {
      numero: i + 1,
      chave: ancora.toISOString().slice(0, 10),
      valor: ancora.toISOString(),
      horarios: missas.map((m) => m.horario),
      missas,
      marcadoInicialmente: avisos.has(diaChave(ancora)),
    };
  });
}
