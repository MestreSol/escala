import { supabase } from "@/lib/supabase";
import { generateId } from "@/lib/db";
import type { ServidorVinculoRow } from "@/lib/types";

const TABELA = "ServidorVinculo";

/** Ordena o par para sempre gravar/ler a mesma linha independente de quem iniciou o vínculo. */
function paresCanonicos(idA: string, idB: string): [string, string] {
  return idA < idB ? [idA, idB] : [idB, idA];
}

/** Ids dos servidores vinculados a `servidorId` (em qualquer direção do par). */
export async function getVinculosDoServidor(servidorId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from(TABELA)
    .select("servidorAId, servidorBId")
    .or(`servidorAId.eq.${servidorId},servidorBId.eq.${servidorId}`)
    .returns<ServidorVinculoRow[]>();
  if (error) throw error;

  return (data ?? []).map((v) => (v.servidorAId === servidorId ? v.servidorBId : v.servidorAId));
}

/** Mapa completo servidorId -> lista de ids vinculados, para o gerador de escala. */
export async function getVinculosMap(): Promise<Map<string, string[]>> {
  const { data, error } = await supabase.from(TABELA).select("servidorAId, servidorBId").returns<ServidorVinculoRow[]>();
  if (error) throw error;

  const mapa = new Map<string, string[]>();
  const adicionar = (de: string, para: string) => {
    const lista = mapa.get(de);
    if (lista) lista.push(para);
    else mapa.set(de, [para]);
  };
  for (const v of data ?? []) {
    adicionar(v.servidorAId, v.servidorBId);
    adicionar(v.servidorBId, v.servidorAId);
  }
  return mapa;
}

/** Substitui por completo a lista de vínculos de `servidorId`. */
export async function setVinculosDoServidor(servidorId: string, outrosIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from(TABELA)
    .delete()
    .or(`servidorAId.eq.${servidorId},servidorBId.eq.${servidorId}`);
  if (deleteError) throw deleteError;

  if (outrosIds.length === 0) return;

  const linhas = outrosIds.map((outroId) => {
    const [servidorAId, servidorBId] = paresCanonicos(servidorId, outroId);
    return { id: generateId(), servidorAId, servidorBId };
  });

  const { error: insertError } = await supabase.from(TABELA).insert(linhas);
  if (insertError) throw insertError;
}
