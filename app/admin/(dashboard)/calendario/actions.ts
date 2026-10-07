"use server";

import { exigirPastoral, exigirPastoralParaPresenca, type UsuarioAtual } from "@/lib/sessao";
import { garantirDaParoquia, garantirDaPastoral } from "@/lib/paroquia";
import { CONFIG_PADRAO, getConfigMissasMap } from "@/lib/missaPastoral";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { generateId, nowIso } from "@/lib/db";
import { getAcumulacoesMap } from "@/lib/funcaoAcumulacao";
import { getVinculosMap } from "@/lib/servidorVinculo";
import { getParesDeFuncoes } from "@/lib/funcaoPar";
import { getServidoresComFrequenciaBaixa } from "@/lib/frequencia";
import { getIndisponibilidadeMap } from "@/lib/servidorIndisponibilidade";
import { publicarMes, despublicarMes } from "@/lib/escalaPublicada";
import { materializarOcorrencias } from "@/lib/materializarOcorrencias";
import { intervaloDeHojeNaParoquia, lerDataArmazenada } from "@/lib/occurrences";
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

/**
 * Vagas da pastoral ainda sem atribuição no período. As ocorrências são da
 * paróquia (compartilhadas); as vagas vêm só das funções da pastoral.
 */
async function montarSlotsEmAberto(paroquiaId: string, pastoralId: string, periodoInicio: Date, periodoFim: Date) {
  const { data: ocorrencias, error: ocorrenciasError } = await supabase
    .from("MissaOcorrencia")
    .select("id, missaId, data, missa:Missa(dataUnica)")
    .eq("paroquiaId", paroquiaId)
    .gte("data", periodoInicio.toISOString())
    .lte("data", periodoFim.toISOString())
    .returns<{ id: string; missaId: string; data: string; missa: { dataUnica: string | null } }[]>();
  if (ocorrenciasError) throw ocorrenciasError;

  const [{ data: requisitos, error: requisitosError }, configs] = await Promise.all([
    supabase
      .from("MissaFuncaoRequisito")
      .select("*, funcao:Funcao!inner(*)")
      .eq("funcao.pastoralId", pastoralId)
      .eq("ativo", true)
      .returns<(MissaFuncaoRequisitoRow & { funcao: FuncaoRow })[]>(),
    getConfigMissasMap(pastoralId),
  ]);
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
      .eq("pastoralId", pastoralId)
      .returns<(EscalaAtribuicaoRow & { ocorrencia: { data: string } })[]>();
    if (error) throw error;
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
    const config = configs.get(ocorrencia.missaId) ?? CONFIG_PADRAO;
    if (config.escalarTodosAtivos) continue;

    const reqs = requisitosPorMissa.get(ocorrencia.missaId) ?? [];
    const modoEscalacao: ModoEscalacao = config.comunidadeResponsavel
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
          comunidadeResponsavel: config.comunidadeResponsavel ?? undefined,
        });
      }
    }
  }

  return { slots, atribuicoesExistentes };
}

export async function gerarEscalaPeriodo(periodoInicioISO: string, periodoFimISO: string) {
  const { paroquiaId, pastoralId } = await exigirPastoral();
  const periodoInicio = new Date(periodoInicioISO);
  const periodoFim = new Date(periodoFimISO);

  await materializarOcorrencias(paroquiaId, periodoInicio, periodoFim);

  const { slots, atribuicoesExistentes } = await montarSlotsEmAberto(paroquiaId, pastoralId, periodoInicio, periodoFim);

  if (slots.length === 0) {
    revalidatePath("/admin/calendario");
    return;
  }

  const { data: servidoresDb, error: servidoresError } = await supabase
    .from("Servidor")
    .select("*, preferenciasMissas:ServidorMissaPreferencia(*)")
    .eq("pastoralId", pastoralId)
    .eq("ativo", true)
    .returns<(ServidorRow & { preferenciasMissas: ServidorMissaPreferenciaRow[] })[]>();
  if (servidoresError) throw servidoresError;

  const [servidoresComFrequenciaBaixa, indisponibilidadeMap] = await Promise.all([
    getServidoresComFrequenciaBaixa(pastoralId),
    getIndisponibilidadeMap(pastoralId),
  ]);

  const servidores: ServidorCandidato[] = (servidoresDb ?? []).map((s) => ({
    id: s.id,
    categoria: s.categoria,
    comunidade: s.comunidade,
    missaIdsPreferidas: new Set(s.preferenciasMissas.map((p) => p.missaId)),
    frequenciaBaixa: servidoresComFrequenciaBaixa.has(s.id),
    diasIndisponiveis: indisponibilidadeMap.get(s.id),
    experiente: s.experiente,
  }));

  const contagemInicial: Record<string, number> = {};
  for (const a of atribuicoesExistentes) {
    if (a.servidorId) {
      contagemInicial[a.servidorId] = (contagemInicial[a.servidorId] ?? 0) + 1;
    }
  }

  const acumulacoes = await getAcumulacoesMap(pastoralId);
  const vinculos = await getVinculosMap(pastoralId);
  const paresDeFuncoes = await getParesDeFuncoes(pastoralId);

  const { data: funcoesAtomicasDb, error: atomicasError } = await supabase
    .from("Funcao")
    .select("id")
    .eq("pastoralId", pastoralId)
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
    paresDeFuncoes,
  });

  const escalaId = generateId();
  const { error: escalaError } = await supabase.from("Escala").insert({
    id: escalaId,
    paroquiaId,
    pastoralId,
    periodoInicio: periodoInicio.toISOString(),
    periodoFim: periodoFim.toISOString(),
  });
  if (escalaError) throw escalaError;

  const servidorPorId = new Map((servidoresDb ?? []).map((s) => [s.id, s]));

  const rows = resultado.map((r) => ({
    id: generateId(),
    pastoralId,
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
  const { paroquiaId, pastoralId } = await exigirPastoral();
  const servidorId = String(formData.get("servidorId") ?? "").trim() || null;
  await garantirDaParoquia("MissaOcorrencia", ocorrenciaId, paroquiaId);
  await garantirDaPastoral("Funcao", funcaoId, pastoralId);

  let servidorNomeSnapshot: string | null = null;
  if (servidorId) {
    await garantirDaPastoral("Servidor", servidorId, pastoralId);
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
      pastoralId,
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
 * Confere que a ocorrência é da paróquia e — para o PRESENCA, que só cuida
 * das missas do dia — que ela é de hoje.
 */
async function garantirOcorrenciaParaPresenca(usuario: UsuarioAtual, ocorrenciaId: string, paroquiaId: string) {
  await garantirDaParoquia("MissaOcorrencia", ocorrenciaId, paroquiaId);
  if (usuario.papel !== "PRESENCA") return;

  const { inicio, fim } = intervaloDeHojeNaParoquia();
  const { data, error } = await supabase
    .from("MissaOcorrencia")
    .select("id")
    .eq("id", ocorrenciaId)
    .gte("data", inicio.toISOString())
    .lte("data", fim.toISOString())
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Você só pode registrar presença nas missas de hoje.");
}

export async function registrarPresenca(
  ocorrenciaId: string,
  funcaoId: string,
  slotIndex: number,
  formData: FormData
) {
  const { usuario, paroquiaId, pastoralId } = await exigirPastoralParaPresenca();
  await garantirOcorrenciaParaPresenca(usuario, ocorrenciaId, paroquiaId);
  const valor = String(formData.get("presente") ?? "");
  const presente = valor === "" ? null : valor === "true";

  const { error } = await supabase
    .from("EscalaAtribuicao")
    .update({ presente, updatedAt: nowIso() })
    .eq("pastoralId", pastoralId)
    .eq("ocorrenciaId", ocorrenciaId)
    .eq("funcaoId", funcaoId)
    .eq("slotIndex", slotIndex);
  if (error) throw error;

  revalidatePath(`/admin/calendario/${ocorrenciaId}`);
  revalidatePath("/admin/acompanhamento");
  revalidatePath("/admin/presenca");
}

export async function escalarTodosAtivos(ocorrenciaId: string) {
  const { paroquiaId, pastoralId } = await exigirPastoral();
  await garantirDaParoquia("MissaOcorrencia", ocorrenciaId, paroquiaId);
  const [{ data: servidores, error: servidoresError }, { data: existentes, error: existentesError }] =
    await Promise.all([
      supabase
        .from("Servidor")
        .select("id, nome")
        .eq("pastoralId", pastoralId)
        .eq("ativo", true)
        .returns<{ id: string; nome: string }[]>(),
      supabase
        .from("EscalaAtribuicao")
        .select("servidorId, slotIndex")
        .eq("pastoralId", pastoralId)
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
      pastoralId,
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

export async function adicionarNaListaTodosAtivos(ocorrenciaId: string, formData: FormData) {
  const { paroquiaId, pastoralId } = await exigirPastoral();
  const servidorId = String(formData.get("servidorId") ?? "").trim();
  if (!servidorId) return;
  await garantirDaParoquia("MissaOcorrencia", ocorrenciaId, paroquiaId);
  await garantirDaPastoral("Servidor", servidorId, pastoralId);

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
    .eq("pastoralId", pastoralId)
    .eq("ocorrenciaId", ocorrenciaId)
    .is("funcaoId", null)
    .returns<{ slotIndex: number }[]>();
  if (existentesError) throw existentesError;

  const proximoSlot = Math.max(0, ...(existentes ?? []).map((a) => a.slotIndex)) + 1;

  const { error } = await supabase.from("EscalaAtribuicao").insert({
    id: generateId(),
    pastoralId,
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

export async function removerDaListaTodosAtivos(ocorrenciaId: string, atribuicaoId: string) {
  const { paroquiaId, pastoralId } = await exigirPastoral();
  await garantirDaParoquia("MissaOcorrencia", ocorrenciaId, paroquiaId);
  const { error } = await supabase
    .from("EscalaAtribuicao")
    .delete()
    .eq("id", atribuicaoId)
    .eq("pastoralId", pastoralId)
    .eq("ocorrenciaId", ocorrenciaId);
  if (error) throw error;

  revalidatePath(`/admin/calendario/${ocorrenciaId}`);
}

export async function registrarPresencaTodosAtivos(ocorrenciaId: string, atribuicaoId: string, formData: FormData) {
  const { usuario, paroquiaId, pastoralId } = await exigirPastoralParaPresenca();
  await garantirOcorrenciaParaPresenca(usuario, ocorrenciaId, paroquiaId);
  const valor = String(formData.get("presente") ?? "");
  const presente = valor === "" ? null : valor === "true";

  const { error } = await supabase
    .from("EscalaAtribuicao")
    .update({ presente, updatedAt: nowIso() })
    .eq("id", atribuicaoId)
    .eq("pastoralId", pastoralId)
    .eq("ocorrenciaId", ocorrenciaId);
  if (error) throw error;

  revalidatePath(`/admin/calendario/${ocorrenciaId}`);
  revalidatePath("/admin/acompanhamento");
  revalidatePath("/admin/presenca");
}

export async function regenerarEscalaPeriodo(periodoInicioISO: string, periodoFimISO: string) {
  const { paroquiaId, pastoralId } = await exigirPastoral();
  const periodoInicio = new Date(periodoInicioISO);
  const periodoFim = new Date(periodoFimISO);

  await materializarOcorrencias(paroquiaId, periodoInicio, periodoFim);

  const { data: ocorrencias, error } = await supabase
    .from("MissaOcorrencia")
    .select("id")
    .eq("paroquiaId", paroquiaId)
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
      .eq("pastoralId", pastoralId)
      .eq("geradoAutomaticamente", true);
    if (deleteError) throw deleteError;
  }

  await gerarEscalaPeriodo(periodoInicioISO, periodoFimISO);
}

export async function apagarEscalaPeriodo(periodoInicioISO: string, periodoFimISO: string) {
  const { paroquiaId, pastoralId } = await exigirPastoral();
  const periodoInicio = new Date(periodoInicioISO);
  const periodoFim = new Date(periodoFimISO);

  const { data: ocorrencias, error } = await supabase
    .from("MissaOcorrencia")
    .select("id")
    .eq("paroquiaId", paroquiaId)
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
      .eq("pastoralId", pastoralId);
    if (deleteError) throw deleteError;
  }

  revalidatePath("/admin/calendario");
}

export async function publicarEscalaMes(mes: string) {
  const { paroquiaId, pastoralId } = await exigirPastoral();
  await publicarMes(paroquiaId, pastoralId, mes);
  revalidatePath("/admin/calendario");
  revalidatePath("/[paroquia]/[pastoral]/escala", "page");
}

export async function despublicarEscalaMes(mes: string) {
  const { pastoralId } = await exigirPastoral();
  await despublicarMes(pastoralId, mes);
  revalidatePath("/admin/calendario");
  revalidatePath("/[paroquia]/[pastoral]/escala", "page");
}
