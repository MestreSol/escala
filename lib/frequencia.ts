import { supabase } from "@/lib/supabase";

/** Mínimo de presenças registradas (presente/faltou) pra considerar a taxa confiável. */
export const MINIMO_REGISTROS_FREQUENCIA = 3;

/** Abaixo desse percentual de presença, o servidor cai de prioridade no sorteio da escala. */
export const LIMIAR_FREQUENCIA = 0.7;

export type FrequenciaServidor = { presentes: number; faltas: number; total: number; taxa: number };

/** Contagem de presença por servidor, considerando só atribuições com presença já registrada. */
export async function getFrequenciaPorServidor(): Promise<Map<string, FrequenciaServidor>> {
  const { data, error } = await supabase
    .from("EscalaAtribuicao")
    .select("servidorId, presente")
    .not("servidorId", "is", null)
    .not("presente", "is", null)
    .returns<{ servidorId: string; presente: boolean }[]>();
  if (error) throw error;

  const frequencias = new Map<string, FrequenciaServidor>();
  for (const a of data ?? []) {
    if (!a.servidorId) continue;
    const atual = frequencias.get(a.servidorId) ?? { presentes: 0, faltas: 0, total: 0, taxa: 1 };
    atual.total += 1;
    if (a.presente) atual.presentes += 1;
    else atual.faltas += 1;
    atual.taxa = atual.presentes / atual.total;
    frequencias.set(a.servidorId, atual);
  }
  return frequencias;
}

/**
 * Ids dos servidores com frequência baixa o bastante pra cair de prioridade
 * no gerador de escala (ver `frequenciaBaixa` em lib/scheduleGenerator.ts).
 * Exige um mínimo de registros pra não penalizar quem faltou 1 de 1.
 */
export async function getServidoresComFrequenciaBaixa(): Promise<Set<string>> {
  const frequencias = await getFrequenciaPorServidor();
  const baixaFrequencia = new Set<string>();
  for (const [servidorId, { total, taxa }] of frequencias) {
    if (total >= MINIMO_REGISTROS_FREQUENCIA && taxa < LIMIAR_FREQUENCIA) {
      baixaFrequencia.add(servidorId);
    }
  }
  return baixaFrequencia;
}
