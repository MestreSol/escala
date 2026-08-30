"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { gerarDatasOcorrencia, combinarDataHorario } from "@/lib/occurrences";
import { gerarEscala, type SlotParaPreencher, type ServidorCandidato } from "@/lib/scheduleGenerator";

export async function materializarOcorrencias(periodoInicio: Date, periodoFim: Date) {
  const missas = await prisma.missa.findMany({ where: { ativo: true } });

  const linhas = missas.flatMap((missa) =>
    gerarDatasOcorrencia(missa.diaSemana, periodoInicio, periodoFim).map((data) => ({
      missaId: missa.id,
      data: combinarDataHorario(data, missa.horario),
    }))
  );

  if (linhas.length === 0) return;

  await prisma.$transaction(
    linhas.map((linha) =>
      prisma.missaOcorrencia.upsert({
        where: { missaId_data: { missaId: linha.missaId, data: linha.data } },
        update: {},
        create: linha,
      })
    )
  );
}

async function montarSlotsEmAberto(periodoInicio: Date, periodoFim: Date) {
  const [ocorrencias, requisitos] = await Promise.all([
    prisma.missaOcorrencia.findMany({
      where: { data: { gte: periodoInicio, lte: periodoFim } },
    }),
    prisma.missaFuncaoRequisito.findMany({
      where: { ativo: true },
      include: { funcao: true },
    }),
  ]);

  const requisitosPorMissa = new Map<string, typeof requisitos>();
  for (const requisito of requisitos) {
    const lista = requisitosPorMissa.get(requisito.missaId) ?? [];
    lista.push(requisito);
    requisitosPorMissa.set(requisito.missaId, lista);
  }

  const atribuicoesExistentes = await prisma.escalaAtribuicao.findMany({
    where: { ocorrenciaId: { in: ocorrencias.map((o) => o.id) } },
  });
  const existentesSet = new Set(
    atribuicoesExistentes.map((a) => `${a.ocorrenciaId}:${a.funcaoId}:${a.slotIndex}`)
  );

  const slots: SlotParaPreencher[] = [];
  for (const ocorrencia of ocorrencias) {
    const reqs = requisitosPorMissa.get(ocorrencia.missaId) ?? [];
    for (const req of reqs) {
      for (let slotIndex = 1; slotIndex <= req.quantidade; slotIndex++) {
        const chave = `${ocorrencia.id}:${req.funcaoId}:${slotIndex}`;
        if (existentesSet.has(chave)) continue;
        slots.push({
          ocorrenciaId: ocorrencia.id,
          missaId: ocorrencia.missaId,
          data: ocorrencia.data,
          funcaoId: req.funcaoId,
          grauMinimo: req.funcao.grauMinimo,
          prioridade: req.funcao.prioridade,
          slotIndex,
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

  const servidoresDb = await prisma.servidor.findMany({
    where: { ativo: true },
    include: { preferenciasMissas: true },
  });

  const servidores: ServidorCandidato[] = servidoresDb.map((s) => ({
    id: s.id,
    categoria: s.categoria,
    missaIdsPreferidas: new Set(s.preferenciasMissas.map((p) => p.missaId)),
  }));

  const contagemInicial: Record<string, number> = {};
  for (const a of atribuicoesExistentes) {
    if (a.servidorId) {
      contagemInicial[a.servidorId] = (contagemInicial[a.servidorId] ?? 0) + 1;
    }
  }

  const funcoesComAcumulacao = await prisma.funcao.findMany({
    where: { assumidaPor: { some: {} } },
    select: { id: true, assumidaPor: { select: { id: true } } },
  });
  const acumulacoes = new Map<string, string[]>(
    funcoesComAcumulacao.map((f) => [f.id, f.assumidaPor.map((base) => base.id)])
  );

  const funcoesAtomicasDb = await prisma.funcao.findMany({
    where: { exigeGrupoCompleto: true },
    select: { id: true },
  });
  const funcoesAtomicas = new Set(funcoesAtomicasDb.map((f) => f.id));

  const resultado = gerarEscala(slots, servidores, {
    contagemInicial,
    acumulacoes,
    funcoesAtomicas,
    atribuicoesExistentes,
  });

  const escala = await prisma.escala.create({ data: { periodoInicio, periodoFim } });
  const servidorPorId = new Map(servidoresDb.map((s) => [s.id, s]));

  await prisma.$transaction(
    resultado.map((r) =>
      prisma.escalaAtribuicao.create({
        data: {
          escalaId: escala.id,
          ocorrenciaId: r.ocorrenciaId,
          funcaoId: r.funcaoId,
          slotIndex: r.slotIndex,
          servidorId: r.servidorId,
          servidorNomeSnapshot: r.servidorId ? servidorPorId.get(r.servidorId)?.nome : null,
          geradoAutomaticamente: true,
        },
      })
    )
  );

  revalidatePath("/admin/calendario");
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
    const servidor = await prisma.servidor.findUnique({ where: { id: servidorId }, select: { nome: true } });
    servidorNomeSnapshot = servidor?.nome ?? null;
  }

  await prisma.escalaAtribuicao.upsert({
    where: { ocorrenciaId_funcaoId_slotIndex: { ocorrenciaId, funcaoId, slotIndex } },
    update: { servidorId, servidorNomeSnapshot, geradoAutomaticamente: false },
    create: { ocorrenciaId, funcaoId, slotIndex, servidorId, servidorNomeSnapshot, geradoAutomaticamente: false },
  });

  revalidatePath(`/admin/calendario/${ocorrenciaId}`);
  revalidatePath("/admin/calendario");
}

export async function regenerarEscalaPeriodo(periodoInicioISO: string, periodoFimISO: string) {
  const periodoInicio = new Date(periodoInicioISO);
  const periodoFim = new Date(periodoFimISO);

  await materializarOcorrencias(periodoInicio, periodoFim);

  const ocorrencias = await prisma.missaOcorrencia.findMany({
    where: { data: { gte: periodoInicio, lte: periodoFim } },
    select: { id: true },
  });

  await prisma.escalaAtribuicao.deleteMany({
    where: {
      ocorrenciaId: { in: ocorrencias.map((o) => o.id) },
      geradoAutomaticamente: true,
    },
  });

  await gerarEscalaPeriodo(periodoInicioISO, periodoFimISO);
}
