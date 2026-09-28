"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { generateId, nowIso } from "@/lib/db";
import { getAcumulacoesMap } from "@/lib/funcaoAcumulacao";
import { getVinculosMap } from "@/lib/servidorVinculo";
import { getServidoresComFrequenciaBaixa } from "@/lib/frequencia";
import { getIndisponibilidadeMap } from "@/lib/servidorIndisponibilidade";
import { publicarMes, despublicarMes } from "@/lib/escalaPublicada";
import {
  gerarDatasOcorrencia,
  gerarDataOcorrenciaUnica,
  combinarDataHorario,
  lerDataArmazenada,
} from "@/lib/occurrences";
import {
  gerarEscala,
  diaChave,
  type SlotParaPreencher,
  type ServidorCandidato,
  type ModoEscalacao,
} from "@/lib/scheduleGenerator";
import type {
  EscalaAtribuicaoRow,
  FuncaoRow,
  MissaFuncaoRequisitoRow,
  MissaRow,
  ServidorMissaPreferenciaRow,
  ServidorRow,
} from "@/lib/types";

type AtribuicaoExistente = {
  ocorrenciaId: string;
  funcaoId: string;
  slotIndex: number;
  servidorId: string | null;
  data: Date;
};

export async function materializarOcorrencias(periodoInicio: Date, periodoFim: Date) {
  const { data: missas, error: missasError } = await supabase
    .from("Missa")
    .select("*")
    .eq("ativo", true)
    .returns<MissaRow[]>();
  if (missasError) throw missasError;

  const linhas = (missas ?? []).flatMap((missa) => {
    // Semanal: toda ocorrência do dia da semana no período. Data única
    // ("missa grande"): só aquela data, se cair dentro do período.
    const datas =
      missa.diaSemana !== null
        ? gerarDatasOcorrencia(missa.diaSemana, periodoInicio, periodoFim)
        : gerarDataOcorrenciaUnica(lerDataArmazenada(missa.dataUnica!), periodoInicio, periodoFim);

    return datas.map((data) => ({
      id: generateId(),
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

async function montarSlotsEmAberto(periodoInicio: Date, periodoFim: Date) {
  const { data: ocorrencias, error: ocorrenciasError } = await supabase
    .from("MissaOcorrencia")
    .select("id, missaId, data, missa:Missa(escalarTodosAtivos, comunidadeResponsavel, dataUnica)")
    .gte("data", periodoInicio.toISOString())
    .lte("data", periodoFim.toISOString())
    .returns<
      {
        id: string;
        missaId: string;
        data: string;
        missa: { escalarTodosAtivos: boolean; comunidadeResponsavel: string | null; dataUnica: string | null };
      }[]
    >();
  if (ocorrenciasError) throw ocorrenciasError;

  const { data: requisitos, error: requisitosError } = await supabase
    .from("MissaFuncaoRequisito")
    .select("*, funcao:Funcao(*)")
    .eq("ativo", true)
    .returns<(MissaFuncaoRequisitoRow & { funcao: FuncaoRow })[]>();
  if (requisitosError) throw requisitosError;

  const requisitosPorMissa = new Map<string, (MissaFuncaoRequisitoRow & { funcao: FuncaoRow })[]>();
  for (const requisito of requisitos ?? []) {
    const lista = requisitosPorMissa.get(requisito.missaId);
    if (lista) lista.push(requisito);
    else requisitosPorMissa.set(requisito.missaId, [requisito]);
  }

  const ocorrenciaIds = (ocorrencias ?? []).map((o) => o.id);
  let atribuicoesExistentes: AtribuicaoExistente[] = [];
  if (ocorrenciaIds.length > 0) {
    const { data, error } = await supabase
      .from("EscalaAtribuicao")
      .select("*, ocorrencia:MissaOcorrencia(data)")
      .in("ocorrenciaId", ocorrenciaIds)
      .returns<(EscalaAtribuicaoRow & { ocorrencia: { data: string } })[]>();
    if (error) throw error;
    // Linhas de funcaoId nulo são da lista de presença simples (missas
    // escalarTodosAtivos) — não participam do sistema de função/vaga, então
    // ficam de fora do rastreamento do gerador (que só entende função real).
    atribuicoesExistentes = (data ?? [])
      .filter((a): a is typeof a & { funcaoId: string } => a.funcaoId !== null)
      .map((a) => ({
        ocorrenciaId: a.ocorrenciaId,
        funcaoId: a.funcaoId,
        slotIndex: a.slotIndex,
        servidorId: a.servidorId,
        data: lerDataArmazenada(a.ocorrencia.data),
      }));
  }

  const existentesSet = new Set(
    atribuicoesExistentes.map((a) => `${a.ocorrenciaId}:${a.funcaoId}:${a.slotIndex}`)
  );

  const slots: SlotParaPreencher[] = [];
  for (const ocorrencia of ocorrencias ?? []) {
    // "Todos os coroinhas": sem vagas por função (lista de presença, ver
    // escalarTodosAtivos) — o gerador não mexe nessas missas.
    if (ocorrencia.missa.escalarTodosAtivos) continue;

    const reqs = requisitosPorMissa.get(ocorrencia.missaId) ?? [];
    // Missa de comunidade responsável sorteia só entre aquela comunidade;
    // missa grande (data única) sorteia entre todos os ativos, porque não
    // entra na lista de preferências da inscrição; semanal usa a preferência.
    const modoEscalacao: ModoEscalacao = ocorrencia.missa.comunidadeResponsavel
      ? "COMUNIDADE"
      : ocorrencia.missa.dataUnica
        ? "TODOS_ATIVOS"
        : "NORMAL";

    for (const req of reqs) {
      for (let slotIndex = 1; slotIndex <= req.quantidade; slotIndex++) {
        const chave = `${ocorrencia.id}:${req.funcaoId}:${slotIndex}`;
        if (existentesSet.has(chave)) continue;
        slots.push({
          ocorrenciaId: ocorrencia.id,
          missaId: ocorrencia.missaId,
          data: lerDataArmazenada(ocorrencia.data),
          funcaoId: req.funcaoId,
          grauMinimo: req.funcao.grauMinimo,
          prioridade: req.funcao.prioridade,
          slotIndex,
          modoEscalacao,
          comunidadeResponsavel: ocorrencia.missa.comunidadeResponsavel ?? undefined,
        });
      }
    }
  }

  return { slots, atribuicoesExistentes };
}

export async function gerarEscalaPeriodo(periodoInicioISO: string, periodoFimISO: string) {
  const periodoInicio = new Date(periodoInicioISO);
  const periodoFim = new Date(periodoFimISO);

  await materializarOcorrencias(periodoInicio, periodoFim);

  const { slots, atribuicoesExistentes } = await montarSlotsEmAberto(periodoInicio, periodoFim);

  if (slots.length === 0) {
    revalidatePath("/admin/calendario");
    return;
  }

  const { data: servidoresDb, error: servidoresError } = await supabase
    .from("Servidor")
    .select("*, preferenciasMissas:ServidorMissaPreferencia(*)")
    .eq("ativo", true)
    .returns<(ServidorRow & { preferenciasMissas: ServidorMissaPreferenciaRow[] })[]>();
  if (servidoresError) throw servidoresError;

  const [servidoresComFrequenciaBaixa, indisponibilidadeMap] = await Promise.all([
    getServidoresComFrequenciaBaixa(),
    getIndisponibilidadeMap(),
  ]);

  const servidores: ServidorCandidato[] = (servidoresDb ?? []).map((s) => ({
    id: s.id,
    categoria: s.categoria,
    comunidade: s.comunidade,
    missaIdsPreferidas: new Set(s.preferenciasMissas.map((p) => p.missaId)),
    frequenciaBaixa: servidoresComFrequenciaBaixa.has(s.id),
    diasIndisponiveis: indisponibilidadeMap.get(s.id),
  }));

  const contagemInicial: Record<string, number> = {};
  for (const a of atribuicoesExistentes) {
    if (a.servidorId) {
      contagemInicial[a.servidorId] = (contagemInicial[a.servidorId] ?? 0) + 1;
    }
  }

  const acumulacoes = await getAcumulacoesMap();
  const vinculos = await getVinculosMap();

  const { data: funcoesAtomicasDb, error: atomicasError } = await supabase
    .from("Funcao")
    .select("id")
    .eq("exigeGrupoCompleto", true)
    .returns<{ id: string }[]>();
  if (atomicasError) throw atomicasError;
  const funcoesAtomicas = new Set((funcoesAtomicasDb ?? []).map((f) => f.id));

  const resultado = gerarEscala(slots, servidores, {
    contagemInicial,
    acumulacoes,
    funcoesAtomicas,
    atribuicoesExistentes,
    vinculos,
  });

  const escalaId = generateId();
  const { error: escalaError } = await supabase.from("Escala").insert({
    id: escalaId,
    periodoInicio: periodoInicio.toISOString(),
    periodoFim: periodoFim.toISOString(),
  });
  if (escalaError) throw escalaError;

  const servidorPorId = new Map((servidoresDb ?? []).map((s) => [s.id, s]));

  const rows = resultado.map((r) => ({
    id: generateId(),
    escalaId,
    ocorrenciaId: r.ocorrenciaId,
    funcaoId: r.funcaoId,
    slotIndex: r.slotIndex,
    servidorId: r.servidorId,
    servidorNomeSnapshot: r.servidorId ? (servidorPorId.get(r.servidorId)?.nome ?? null) : null,
    geradoAutomaticamente: true,
    updatedAt: nowIso(),
  }));

  const { error: insertError } = await supabase.from("EscalaAtribuicao").insert(rows);
  if (insertError) throw insertError;

  revalidatePath("/admin/calendario");
}

/**
 * Mesma regra do gerador automático (ver gerarEscala/marcarUsoNoDia): um
 * servidor não pode ser escalado manualmente numa segunda missa no mesmo dia
 * civil, qualquer que seja a função. Ignora a própria ocorrência sendo editada.
 */
async function validarSemConflitoNoDia(servidorId: string, ocorrenciaId: string, servidorNome: string) {
  const { data: ocorrenciaAtual, error: ocorrenciaError } = await supabase
    .from("MissaOcorrencia")
    .select("data")
    .eq("id", ocorrenciaId)
    .returns<{ data: string }[]>()
    .maybeSingle();
  if (ocorrenciaError) throw ocorrenciaError;
  if (!ocorrenciaAtual) return;

  const diaAtual = diaChave(lerDataArmazenada(ocorrenciaAtual.data));

  const { data: outrasAtribuicoes, error } = await supabase
    .from("EscalaAtribuicao")
    .select("ocorrenciaId, funcaoId, ocorrencia:MissaOcorrencia(data)")
    .eq("servidorId", servidorId)
    .neq("ocorrenciaId", ocorrenciaId)
    .returns<{ ocorrenciaId: string; funcaoId: string | null; ocorrencia: { data: string } }[]>();
  if (error) throw error;

  // funcaoId nulo = linha de lista de presença simples (missa escalarTodosAtivos,
  // sem função individual) — não é escala individual, não conta aqui.
  const temConflito = (outrasAtribuicoes ?? []).some(
    (a) => a.funcaoId !== null && diaChave(lerDataArmazenada(a.ocorrencia.data)) === diaAtual
  );

  if (temConflito) {
    throw new Error(`${servidorNome} já está escalado(a) em outra missa neste mesmo dia.`);
  }

  const { data: indisponibilidades, error: indisponibilidadeError } = await supabase
    .from("ServidorIndisponibilidade")
    .select("data")
    .eq("servidorId", servidorId)
    .returns<{ data: string }[]>();
  if (indisponibilidadeError) throw indisponibilidadeError;

  const indisponivelNoDia = (indisponibilidades ?? []).some((i) => diaChave(lerDataArmazenada(i.data)) === diaAtual);
  if (indisponivelNoDia) {
    throw new Error(`${servidorNome} avisou que não pode servir neste dia.`);
  }
}

export async function atualizarAtribuicaoManual(
  ocorrenciaId: string,
  funcaoId: string,
  slotIndex: number,
  formData: FormData
) {
  const servidorId = String(formData.get("servidorId") ?? "").trim() || null;

  let servidorNomeSnapshot: string | null = null;
  if (servidorId) {
    const { data: servidor, error } = await supabase
      .from("Servidor")
      .select("nome")
      .eq("id", servidorId)
      .returns<{ nome: string }[]>()
      .maybeSingle();
    if (error) throw error;
    servidorNomeSnapshot = servidor?.nome ?? null;

    await validarSemConflitoNoDia(servidorId, ocorrenciaId, servidorNomeSnapshot ?? "Servidor");
  }

  const { data: existente, error: existenteError } = await supabase
    .from("EscalaAtribuicao")
    .select("id")
    .eq("ocorrenciaId", ocorrenciaId)
    .eq("funcaoId", funcaoId)
    .eq("slotIndex", slotIndex)
    .returns<{ id: string }[]>()
    .maybeSingle();
  if (existenteError) throw existenteError;

  const { error } = await supabase.from("EscalaAtribuicao").upsert(
    {
      id: existente?.id ?? generateId(),
      ocorrenciaId,
      funcaoId,
      slotIndex,
      servidorId,
      servidorNomeSnapshot,
      geradoAutomaticamente: false,
      updatedAt: nowIso(),
    },
    { onConflict: "ocorrenciaId,funcaoId,slotIndex" }
  );
  if (error) throw error;

  revalidatePath(`/admin/calendario/${ocorrenciaId}`);
  revalidatePath("/admin/calendario");
}

/**
 * Registra se o servidor escalado numa vaga compareceu ou não à missa.
 * Alimenta lib/frequencia.ts, que rebaixa a prioridade de quem falta muito
 * nas próximas gerações de escala (ver ServidorCandidato.frequenciaBaixa).
 */
export async function registrarPresenca(
  ocorrenciaId: string,
  funcaoId: string,
  slotIndex: number,
  formData: FormData
) {
  const valor = String(formData.get("presente") ?? "");
  const presente = valor === "" ? null : valor === "true";

  const { error } = await supabase
    .from("EscalaAtribuicao")
    .update({ presente, updatedAt: nowIso() })
    .eq("ocorrenciaId", ocorrenciaId)
    .eq("funcaoId", funcaoId)
    .eq("slotIndex", slotIndex);
  if (error) throw error;

  revalidatePath(`/admin/calendario/${ocorrenciaId}`);
  revalidatePath("/admin/acompanhamento");
}

/**
 * Escala de uma vez todo servidor ativo que ainda não está na lista de
 * presença desta ocorrência (missas `escalarTodosAtivos` — ver Missa). Cada
 * linha é uma EscalaAtribuicao com funcaoId nulo (sem função individual,
 * só presença). Marcado geradoAutomaticamente: false pra "Regenerar tudo"
 * (que só mexe no sistema normal de função/vaga) nunca apagar essa lista.
 */
export async function escalarTodosAtivos(ocorrenciaId: string) {
  const [{ data: servidores, error: servidoresError }, { data: existentes, error: existentesError }] =
    await Promise.all([
      supabase.from("Servidor").select("id, nome").eq("ativo", true).returns<{ id: string; nome: string }[]>(),
      supabase
        .from("EscalaAtribuicao")
        .select("servidorId, slotIndex")
        .eq("ocorrenciaId", ocorrenciaId)
        .is("funcaoId", null)
        .returns<{ servidorId: string | null; slotIndex: number }[]>(),
    ]);
  if (servidoresError) throw servidoresError;
  if (existentesError) throw existentesError;

  const jaEscalados = new Set((existentes ?? []).map((a) => a.servidorId));
  let proximoSlot = Math.max(0, ...(existentes ?? []).map((a) => a.slotIndex)) + 1;

  const paraInserir = (servidores ?? [])
    .filter((s) => !jaEscalados.has(s.id))
    .map((s) => ({
      id: generateId(),
      ocorrenciaId,
      funcaoId: null,
      slotIndex: proximoSlot++,
      servidorId: s.id,
      servidorNomeSnapshot: s.nome,
      geradoAutomaticamente: false,
      updatedAt: nowIso(),
    }));

  if (paraInserir.length > 0) {
    const { error } = await supabase.from("EscalaAtribuicao").insert(paraInserir);
    if (error) throw error;
  }

  revalidatePath(`/admin/calendario/${ocorrenciaId}`);
}

/** Adiciona manualmente um único servidor à lista de presença simples (ex: alguém fora dos ativos no momento do "escalar todos"). */
export async function adicionarNaListaTodosAtivos(ocorrenciaId: string, formData: FormData) {
  const servidorId = String(formData.get("servidorId") ?? "").trim();
  if (!servidorId) return;

  const { data: servidor, error: servidorError } = await supabase
    .from("Servidor")
    .select("nome")
    .eq("id", servidorId)
    .returns<{ nome: string }[]>()
    .maybeSingle();
  if (servidorError) throw servidorError;

  const { data: existentes, error: existentesError } = await supabase
    .from("EscalaAtribuicao")
    .select("slotIndex")
    .eq("ocorrenciaId", ocorrenciaId)
    .is("funcaoId", null)
    .returns<{ slotIndex: number }[]>();
  if (existentesError) throw existentesError;

  const proximoSlot = Math.max(0, ...(existentes ?? []).map((a) => a.slotIndex)) + 1;

  const { error } = await supabase.from("EscalaAtribuicao").insert({
    id: generateId(),
    ocorrenciaId,
    funcaoId: null,
    slotIndex: proximoSlot,
    servidorId,
    servidorNomeSnapshot: servidor?.nome ?? null,
    geradoAutomaticamente: false,
    updatedAt: nowIso(),
  });
  if (error) throw error;

  revalidatePath(`/admin/calendario/${ocorrenciaId}`);
}

/** Remove uma linha da lista de presença simples (ex: alguém avisou que não vai mais). */
export async function removerDaListaTodosAtivos(ocorrenciaId: string, atribuicaoId: string) {
  const { error } = await supabase.from("EscalaAtribuicao").delete().eq("id", atribuicaoId);
  if (error) throw error;

  revalidatePath(`/admin/calendario/${ocorrenciaId}`);
}

/** Registra presença numa linha da lista simples (endereça por id — não há função/slotIndex útil pra chave composta aqui). */
export async function registrarPresencaTodosAtivos(ocorrenciaId: string, atribuicaoId: string, formData: FormData) {
  const valor = String(formData.get("presente") ?? "");
  const presente = valor === "" ? null : valor === "true";

  const { error } = await supabase
    .from("EscalaAtribuicao")
    .update({ presente, updatedAt: nowIso() })
    .eq("id", atribuicaoId);
  if (error) throw error;

  revalidatePath(`/admin/calendario/${ocorrenciaId}`);
  revalidatePath("/admin/acompanhamento");
}

export async function regenerarEscalaPeriodo(periodoInicioISO: string, periodoFimISO: string) {
  const periodoInicio = new Date(periodoInicioISO);
  const periodoFim = new Date(periodoFimISO);

  await materializarOcorrencias(periodoInicio, periodoFim);

  const { data: ocorrencias, error } = await supabase
    .from("MissaOcorrencia")
    .select("id")
    .gte("data", periodoInicio.toISOString())
    .lte("data", periodoFim.toISOString())
    .returns<{ id: string }[]>();
  if (error) throw error;

  const ocorrenciaIds = (ocorrencias ?? []).map((o) => o.id);
  if (ocorrenciaIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("EscalaAtribuicao")
      .delete()
      .in("ocorrenciaId", ocorrenciaIds)
      .eq("geradoAutomaticamente", true);
    if (deleteError) throw deleteError;
  }

  await gerarEscalaPeriodo(periodoInicioISO, periodoFimISO);
}

/**
 * Apaga TODAS as atribuições do período (automáticas e manuais), sem gerar
 * nada em seguida — diferente de `regenerarEscalaPeriodo`, que só limpa as
 * automáticas e já sorteia de novo. Usado para dar um "reset" completo no mês
 * quando o botão "Gerar escala" não preenche mais nada (porque toda vaga já
 * tem uma linha de atribuição, mesmo que em aberto ou editada manualmente) e
 * é preciso liberar todos os slots antes de gerar de novo.
 */
export async function apagarEscalaPeriodo(periodoInicioISO: string, periodoFimISO: string) {
  const periodoInicio = new Date(periodoInicioISO);
  const periodoFim = new Date(periodoFimISO);

  const { data: ocorrencias, error } = await supabase
    .from("MissaOcorrencia")
    .select("id")
    .gte("data", periodoInicio.toISOString())
    .lte("data", periodoFim.toISOString())
    .returns<{ id: string }[]>();
  if (error) throw error;

  const ocorrenciaIds = (ocorrencias ?? []).map((o) => o.id);
  if (ocorrenciaIds.length > 0) {
    const { error: deleteError } = await supabase.from("EscalaAtribuicao").delete().in("ocorrenciaId", ocorrenciaIds);
    if (deleteError) throw deleteError;
  }

  revalidatePath("/admin/calendario");
}

/** Libera a escala do mês ("yyyy-MM") na página pública /escala. */
export async function publicarEscalaMes(mes: string) {
  await publicarMes(mes);
  revalidatePath("/admin/calendario");
  revalidatePath("/escala");
}

/** Tira o mês da página pública (a escala continua no banco, só fica oculta). */
export async function despublicarEscalaMes(mes: string) {
  await despublicarMes(mes);
  revalidatePath("/admin/calendario");
  revalidatePath("/escala");
}
