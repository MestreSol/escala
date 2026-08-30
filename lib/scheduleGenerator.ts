export type Grau = "COROINHA" | "ACOLITO" | "CERIMONIARIO";
export type Prioridade = "ALTA" | "MEDIA" | "BAIXA";

const PRIORIDADE_ORDEM: Record<Prioridade, number> = { ALTA: 0, MEDIA: 1, BAIXA: 2 };
const GRAU_ORDEM: Record<Grau, number> = { COROINHA: 0, ACOLITO: 1, CERIMONIARIO: 2 };

export type SlotParaPreencher = {
  ocorrenciaId: string;
  missaId: string;
  data: Date;
  funcaoId: string;
  grauMinimo: Grau;
  prioridade: Prioridade;
  slotIndex: number;
};

export type ServidorCandidato = {
  id: string;
  categoria: Grau;
  missaIdsPreferidas: Set<string>;
};

export type AtribuicaoGerada = {
  ocorrenciaId: string;
  funcaoId: string;
  slotIndex: number;
  servidorId: string | null;
};

export type GerarEscalaOptions = {
  contagemInicial?: Record<string, number>;
  random?: () => number;
  /**
   * Mapa: funcaoId da vaga -> lista de funcaoId cujo ocupante (na mesma
   * ocorrência) pode assumir essa vaga como último recurso, quando não há
   * ninguém mais disponível especificamente para ela (ex: quem faz
   * Naveteiro também pode assumir Sineta se faltar gente).
   */
  acumulacoes?: Map<string, string[]>;
  /**
   * Funções cujas vagas só são preenchidas em grupo: ou há gente para TODAS
   * as vagas dessa função na ocorrência, ou todas ficam em aberto (ex:
   * Ceroferário sempre anda em dupla). Essas funções não participam do
   * acúmulo de função como vaga a preencher (são tudo ou nada).
   */
  funcoesAtomicas?: Set<string>;
  /**
   * Atribuições já existentes nas ocorrências envolvidas, vindas de uma
   * geração incremental anterior. Usado para não escalar a mesma pessoa
   * duas vezes na mesma ocorrência e para permitir acúmulo de função
   * mesmo quando a função "base" foi preenchida numa rodada anterior.
   */
  atribuicoesExistentes?: Array<{ ocorrenciaId: string; funcaoId: string; servidorId: string | null }>;
};

type UnidadeParaPreencher = {
  funcaoId: string;
  grauMinimo: Grau;
  prioridade: Prioridade;
  atomica: boolean;
  slots: SlotParaPreencher[];
};

/** Quem tem um grau maior também pode exercer funções dos graus abaixo (hierarquia). */
function grauCompativel(servidor: ServidorCandidato, grauMinimo: Grau): boolean {
  return GRAU_ORDEM[servidor.categoria] >= GRAU_ORDEM[grauMinimo];
}

function agruparPorOcorrencia(slots: SlotParaPreencher[]): Map<string, SlotParaPreencher[]> {
  const grupos = new Map<string, SlotParaPreencher[]>();
  for (const slot of slots) {
    const lista = grupos.get(slot.ocorrenciaId);
    if (lista) {
      lista.push(slot);
    } else {
      grupos.set(slot.ocorrenciaId, [slot]);
    }
  }
  return grupos;
}

/**
 * Agrupa os slots de uma ocorrência por função (todas as vagas de uma mesma
 * função ficam numa única "unidade"), e ordena as unidades por prioridade da
 * função. Isso garante que, dentro da mesma prioridade, as vagas de uma
 * função (ex: Ceroferário #1 e #2) são processadas juntas antes de passar
 * para a próxima função — em vez de intercalar por slotIndex entre funções
 * diferentes, o que não faz sentido semântico.
 */
function montarUnidades(slots: SlotParaPreencher[], funcoesAtomicas: Set<string>): UnidadeParaPreencher[] {
  const porFuncao = new Map<string, SlotParaPreencher[]>();
  for (const slot of slots) {
    const lista = porFuncao.get(slot.funcaoId);
    if (lista) {
      lista.push(slot);
    } else {
      porFuncao.set(slot.funcaoId, [slot]);
    }
  }

  const unidades: UnidadeParaPreencher[] = [];
  for (const [funcaoId, slotsDaFuncao] of porFuncao) {
    const ordenados = [...slotsDaFuncao].sort((a, b) => a.slotIndex - b.slotIndex);
    const primeiro = ordenados[0];
    unidades.push({
      funcaoId,
      grauMinimo: primeiro.grauMinimo,
      prioridade: primeiro.prioridade,
      atomica: funcoesAtomicas.has(funcaoId),
      slots: ordenados,
    });
  }

  return unidades.sort((a, b) => {
    const prioridadeDiff = PRIORIDADE_ORDEM[a.prioridade] - PRIORIDADE_ORDEM[b.prioridade];
    if (prioridadeDiff !== 0) return prioridadeDiff;
    return a.slots[0].slotIndex - b.slots[0].slotIndex;
  });
}

/**
 * Função pura: sorteia servidores para os slots informados, missa a missa.
 *
 * Para cada ocorrência: cada servidor só serve missas que marcou como
 * preferidas e funções cujo grau mínimo seu grau alcança (hierarquia:
 * Cerimoniário cobre Acólito e Coroinha; Acólito cobre Coroinha); evita
 * repetir a mesma função que exerceu na última vez em que serviu; entre os
 * candidatos restantes, prioriza quem tem menor contagem total no período
 * (equilíbrio) e sorteia entre os empatados; ninguém é escalado duas vezes
 * na mesma ocorrência exceto via acumulação explícita (ver `acumulacoes`).
 *
 * Funções marcadas em `funcoesAtomicas` são preenchidas em bloco: só são
 * atribuídas se houver gente distinta para TODAS as suas vagas na mesma
 * ocorrência; senão, todas ficam em aberto (não entram no acúmulo).
 *
 * Vagas normais sem candidato distinto disponível tentam, como último
 * recurso, ser cobertas por quem já está escalado na mesma ocorrência numa
 * função que pode "acumular" aquela vaga. Se nem isso for possível, a vaga
 * fica em aberto (servidorId null).
 */
export function gerarEscala(
  slotsInput: SlotParaPreencher[],
  servidores: ServidorCandidato[],
  options: GerarEscalaOptions = {}
): AtribuicaoGerada[] {
  const random = options.random ?? Math.random;
  const acumulacoes = options.acumulacoes ?? new Map<string, string[]>();
  const funcoesAtomicas = options.funcoesAtomicas ?? new Set<string>();
  const servidorPorId = new Map(servidores.map((s) => [s.id, s]));

  const contagemTotal = new Map<string, number>(Object.entries(options.contagemInicial ?? {}));
  const ultimaFuncao = new Map<string, string>();

  const existentesPorOcorrencia = new Map<string, Array<{ funcaoId: string; servidorId: string }>>();
  for (const a of options.atribuicoesExistentes ?? []) {
    if (!a.servidorId) continue;
    const lista = existentesPorOcorrencia.get(a.ocorrenciaId);
    const entrada = { funcaoId: a.funcaoId, servidorId: a.servidorId };
    if (lista) lista.push(entrada);
    else existentesPorOcorrencia.set(a.ocorrenciaId, [entrada]);
  }

  const grupos = agruparPorOcorrencia(slotsInput);
  const ocorrenciasOrdenadas = [...grupos.entries()].sort(
    (a, b) => a[1][0].data.getTime() - b[1][0].data.getTime()
  );

  const resultado: AtribuicaoGerada[] = [];

  function escolherVencedor(candidatos: ServidorCandidato[], funcaoId: string): ServidorCandidato {
    const semRepeticao = candidatos.filter((c) => ultimaFuncao.get(c.id) !== funcaoId);
    const grupoEscolha = semRepeticao.length > 0 ? semRepeticao : candidatos;
    const menorContagem = Math.min(...grupoEscolha.map((c) => contagemTotal.get(c.id) ?? 0));
    const empatados = grupoEscolha.filter((c) => (contagemTotal.get(c.id) ?? 0) === menorContagem);
    return empatados[Math.floor(random() * empatados.length)];
  }

  for (const [ocorrenciaId, slotsDaOcorrenciaBrutos] of ocorrenciasOrdenadas) {
    const unidades = montarUnidades(slotsDaOcorrenciaBrutos, funcoesAtomicas);
    const usadosNaOcorrencia = new Set<string>();
    const assignadoPorFuncao = new Map<string, string>();
    const pendentes: SlotParaPreencher[] = [];

    for (const existente of existentesPorOcorrencia.get(ocorrenciaId) ?? []) {
      usadosNaOcorrencia.add(existente.servidorId);
      assignadoPorFuncao.set(existente.funcaoId, existente.servidorId);
    }

    for (const unidade of unidades) {
      const missaId = unidade.slots[0].missaId;

      if (!unidade.atomica) {
        for (const slot of unidade.slots) {
          const candidatos = servidores.filter(
            (s) =>
              s.missaIdsPreferidas.has(slot.missaId) &&
              grauCompativel(s, slot.grauMinimo) &&
              !usadosNaOcorrencia.has(s.id)
          );

          if (candidatos.length === 0) {
            pendentes.push(slot);
            continue;
          }

          const vencedor = escolherVencedor(candidatos, slot.funcaoId);

          resultado.push({
            ocorrenciaId: slot.ocorrenciaId,
            funcaoId: slot.funcaoId,
            slotIndex: slot.slotIndex,
            servidorId: vencedor.id,
          });
          contagemTotal.set(vencedor.id, (contagemTotal.get(vencedor.id) ?? 0) + 1);
          ultimaFuncao.set(vencedor.id, slot.funcaoId);
          usadosNaOcorrencia.add(vencedor.id);
          assignadoPorFuncao.set(slot.funcaoId, vencedor.id);
        }
        continue;
      }

      // Unidade atômica: só preenche se houver gente para TODAS as vagas.
      const candidatosBase = servidores.filter(
        (s) =>
          s.missaIdsPreferidas.has(missaId) &&
          grauCompativel(s, unidade.grauMinimo) &&
          !usadosNaOcorrencia.has(s.id)
      );

      if (candidatosBase.length < unidade.slots.length) {
        for (const slot of unidade.slots) {
          resultado.push({
            ocorrenciaId: slot.ocorrenciaId,
            funcaoId: slot.funcaoId,
            slotIndex: slot.slotIndex,
            servidorId: null,
          });
        }
        continue;
      }

      const poolDisponivel = [...candidatosBase];
      for (const slot of unidade.slots) {
        const vencedor = escolherVencedor(poolDisponivel, slot.funcaoId);

        resultado.push({
          ocorrenciaId: slot.ocorrenciaId,
          funcaoId: slot.funcaoId,
          slotIndex: slot.slotIndex,
          servidorId: vencedor.id,
        });
        contagemTotal.set(vencedor.id, (contagemTotal.get(vencedor.id) ?? 0) + 1);
        ultimaFuncao.set(vencedor.id, slot.funcaoId);
        usadosNaOcorrencia.add(vencedor.id);
        assignadoPorFuncao.set(slot.funcaoId, vencedor.id);

        const indice = poolDisponivel.findIndex((c) => c.id === vencedor.id);
        poolDisponivel.splice(indice, 1);
      }
    }

    for (const slot of pendentes) {
      const funcoesQueAssumem = acumulacoes.get(slot.funcaoId) ?? [];

      let acumuladorId: string | null = null;
      for (const funcaoBaseId of funcoesQueAssumem) {
        const candidatoId = assignadoPorFuncao.get(funcaoBaseId);
        if (!candidatoId) continue;
        const candidato = servidorPorId.get(candidatoId);
        if (candidato && grauCompativel(candidato, slot.grauMinimo)) {
          acumuladorId = candidatoId;
          break;
        }
      }

      resultado.push({
        ocorrenciaId: slot.ocorrenciaId,
        funcaoId: slot.funcaoId,
        slotIndex: slot.slotIndex,
        servidorId: acumuladorId,
      });

      if (acumuladorId) {
        contagemTotal.set(acumuladorId, (contagemTotal.get(acumuladorId) ?? 0) + 1);
        ultimaFuncao.set(acumuladorId, slot.funcaoId);
      }
    }
  }

  return resultado;
}
