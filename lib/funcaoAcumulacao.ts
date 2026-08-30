import { supabase } from "@/lib/supabase";

/**
 * Tabela de junção implícita que o Prisma criou para a auto-relação
 * `Funcao.podeAssumir` <-> `Funcao.assumidaPor` (many-to-many Funcao<->Funcao).
 * Colunas "A" e "B" (convenção do Prisma): para este par de nomes de campo
 * ("assumidaPor" < "podeAssumir" em ordem alfabética), A = id da função
 * assumida (o alvo) e B = id da função "base" cujo ocupante pode assumi-la.
 * Confirmado empiricamente contra os dados existentes.
 */
const TABELA = "_FuncaoAcumulacao";

/** Funções cujo ocupante pode assumir a função `funcaoId` (lado "base" -> alvo). */
export async function getFuncoesQueAssumem(funcaoId: string): Promise<string[]> {
  const { data, error } = await supabase.from(TABELA).select("B").eq("A", funcaoId);
  if (error) throw error;
  return (data ?? []).map((row) => row.B as string);
}

/** Para várias funções-alvo de uma vez: mapa funcaoId -> lista de funções-base que podem assumi-la. */
export async function getAcumulacoesMap(): Promise<Map<string, string[]>> {
  const { data, error } = await supabase.from(TABELA).select("A, B");
  if (error) throw error;
  const mapa = new Map<string, string[]>();
  for (const row of data ?? []) {
    const lista = mapa.get(row.A as string);
    if (lista) lista.push(row.B as string);
    else mapa.set(row.A as string, [row.B as string]);
  }
  return mapa;
}

/** Funções que o ocupante de `funcaoId` também pode assumir (lado "base" -> alvos). */
export async function getFuncoesQuePodeAssumir(funcaoId: string): Promise<string[]> {
  const { data, error } = await supabase.from(TABELA).select("A").eq("B", funcaoId);
  if (error) throw error;
  return (data ?? []).map((row) => row.A as string);
}

/** Substitui por completo a lista de funções que `funcaoId` pode assumir. */
export async function setFuncoesQuePodeAssumir(funcaoId: string, alvoIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase.from(TABELA).delete().eq("B", funcaoId);
  if (deleteError) throw deleteError;

  if (alvoIds.length === 0) return;

  const { error: insertError } = await supabase
    .from(TABELA)
    .insert(alvoIds.map((alvoId) => ({ A: alvoId, B: funcaoId })));
  if (insertError) throw insertError;
}
