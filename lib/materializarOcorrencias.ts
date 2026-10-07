import "server-only";
import { supabase } from "@/lib/supabase";
import { generateId } from "@/lib/db";
import {
  gerarDatasOcorrencia,
  gerarDatasOcorrenciaMensal,
  gerarDataOcorrenciaUnica,
  combinarDataHorario,
  lerDataArmazenada,
} from "@/lib/occurrences";
import type { MissaRow } from "@/lib/types";

/**
 * Cria no banco as ocorrências (missa + data) do período que ainda não
 * existem. Fica fora dos arquivos "use server" de propósito: lá, todo export
 * vira Server Action alcançável por POST direto — isto aqui é só um helper
 * interno das páginas e actions.
 */
export async function materializarOcorrencias(paroquiaId: string, periodoInicio: Date, periodoFim: Date) {
  const { data: missas, error: missasError } = await supabase
    .from("Missa")
    .select("*")
    .eq("paroquiaId", paroquiaId)
    .eq("ativo", true)
    .returns<MissaRow[]>();
  if (missasError) throw missasError;

  const linhas = (missas ?? []).flatMap((missa) => {
    // Semanal: toda ocorrência do dia da semana no período. Data única
    // ("missa grande"): só aquela data, se cair dentro do período.
    // Mensal ("1ª sexta do mês"): só a N-ésima ocorrência do dia em cada mês.
    const datas =
      missa.diaSemana !== null && missa.semanaDoMes
        ? gerarDatasOcorrenciaMensal(missa.diaSemana, missa.semanaDoMes, periodoInicio, periodoFim)
        : missa.diaSemana !== null
          ? gerarDatasOcorrencia(missa.diaSemana, periodoInicio, periodoFim)
          : gerarDataOcorrenciaUnica(lerDataArmazenada(missa.dataUnica!), periodoInicio, periodoFim);

    return datas.map((data) => ({
      id: generateId(),
      paroquiaId,
      missaId: missa.id,
      data: combinarDataHorario(data, missa.horario).toISOString(),
    }));
  });

  if (linhas.length === 0) return;

  // Só insere quem ainda não existe (ON CONFLICT DO NOTHING) — não há campo
  // para atualizar aqui, e preserva o id (e portanto as atribuições já
  // vinculadas) das ocorrências que já existiam.
  const { error } = await supabase
    .from("MissaOcorrencia")
    .upsert(linhas, { onConflict: "missaId,data", ignoreDuplicates: true });
  if (error) throw error;
}

