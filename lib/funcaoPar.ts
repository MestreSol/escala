import { supabase } from "@/lib/supabase";
import { generateId } from "@/lib/db";

const TABELA = "FuncaoPar";

/** Par não ordenado guardado sempre como (menor, maior) — evita duas linhas pro mesmo par. */
function parCanonico(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** Todos os pares de funções da pastoral, pro gerador de escala. */
export async function getParesDeFuncoes(pastoralId: string): Promise<[string, string][]> {
  const { data, error } = await supabase
    .from(TABELA)
    .select("funcaoAId, funcaoBId")
    .eq("pastoralId", pastoralId)
    .returns<{ funcaoAId: string; funcaoBId: string }[]>();
  if (error) throw error;
  return (data ?? []).map((par) => [par.funcaoAId, par.funcaoBId]);
}

/** Funções que fazem par com `funcaoId`. */
export async function getFuncoesPareadas(funcaoId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from(TABELA)
    .select("funcaoAId, funcaoBId")
    .or(`funcaoAId.eq.${funcaoId},funcaoBId.eq.${funcaoId}`)
    .returns<{ funcaoAId: string; funcaoBId: string }[]>();
  if (error) throw error;
  return (data ?? []).map((par) => (par.funcaoAId === funcaoId ? par.funcaoBId : par.funcaoAId));
}

/** Substitui por completo as funções que fazem par com `funcaoId`. */
export async function setFuncoesPareadas(pastoralId: string, funcaoId: string, outrasIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from(TABELA)
    .delete()
    .or(`funcaoAId.eq.${funcaoId},funcaoBId.eq.${funcaoId}`);
  if (deleteError) throw deleteError;

  if (outrasIds.length === 0) return;

  const linhas = outrasIds.map((outraId) => {
    const [funcaoAId, funcaoBId] = parCanonico(funcaoId, outraId);
    return { id: generateId(), pastoralId, funcaoAId, funcaoBId };
  });
  const { error: insertError } = await supabase.from(TABELA).insert(linhas);
  if (insertError) throw insertError;
}
