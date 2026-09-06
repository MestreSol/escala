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
  /**
   * Frequência de presença abaixo do limiar (ver lib/frequencia.ts). Não
   * exclui o servidor do sorteio, só o deixa por último: só é escolhido
   * quando não sobra ninguém com frequência normal para a vaga.
   */
  frequenciaBaixa?: boolean;
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
   * duas vezes na mesma ocorrência, para permitir acúmulo de função mesmo
   * quando a função "base" foi preenchida numa rodada anterior, e para
   * respeitar a regra de "não repetir no mesmo dia" (ver `data`/`prioridade`
   * abaixo) mesmo quando a atribuição anterior não faz parte deste lote.
   */
  atribuicoesExistentes?: Array<{
    ocorrenciaId: string;
    funcaoId: string;
    servidorId: string | null;
    data: Date;
    prioridade: Prioridade;
  }>;
  /**
   * Mapa servidorId -> lista de servidorId vinculados (ex: irmãos). Quem tem
   * vínculo só é escalado numa ocorrência se TODOS os vinculados também
   * forem — senão, nenhum do grupo serve naquela ocorrência.
   */
  vinculos?: Map<string, string[]>;
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

/** Chave do dia civil (UTC) de uma data-âncora — ver lib/occurrences.ts. */
export function diaChave(data: Date): string {
  return `${data.getUTCFullYear()}-${data.getUTCMonth()}-${data.getUTCDate()}`;
}

/**
 * A partir do mapa de pares (servidorId -> ids vinculados), calcula o grupo
 * completo (fechamento transitivo) de cada servidor vinculado — assim, se A
 * está ligado a B e B está ligado a C, os três formam um único grupo.
 */
function calcularGruposVinculo(vinculos: Map<string, string[]>): Map<string, Set<string>> {
  const grupoPorServidor = new Map<string, Set<string>>();
  const visitados = new Set<string>();

  for (const inicio of vinculos.keys()) {
    if (visitados.has(inicio)) continue;
    const grupo = new Set<string>();
    const pilha = [inicio];
    while (pilha.length > 0) {
      const atual = pilha.pop()!;
      if (grupo.has(atual)) continue;
      grupo.add(atual);
      visitados.add(atual);
      for (const vizinho of vinculos.get(atual) ?? []) {
        if (!grupo.has(vizinho)) pilha.push(vizinho);
      }
    }
    for (const membro of grupo) {
      grupoPorServidor.set(membro, grupo);
    }
  }

  return grupoPorServidor;
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
 * Ninguém é escalado em duas ocorrências diferentes no mesmo dia, a menos
 * que a função já atribuída a essa pessoa naquele dia seja de prioridade
 * BAIXA — nesse caso ela continua elegível para outras missas do dia (ex:
 * quem faz Sineta de manhã ainda pode ser escalado à noite; quem faz
 * Cerimoniário de manhã, não).
 *
 * Funções marcadas em `funcoesAtomicas` são preenchidas em bloco: só são
 * atribuídas se houver gente distinta para TODAS as suas vagas na mesma
 * ocorrência; senão, todas ficam em aberto (não entram no acúmulo).
 *
 * Servidores vinculados (ver `vinculos`, ex: irmãos) só são escalados numa
 * ocorrência se TODOS os vinculados também puderem servir ali (preferem
 * aquela missa, ninguém do grupo já tem função ALTA/MEDIA nesse dia, e há
 * vaga não-atômica distinta e elegível para cada um); senão, nenhum do grupo
 * é escalado naquela ocorrência.
 *
 * Vagas normais sem candidato distinto disponível tentam, como último
 * recurso, ser cobertas por quem já está escalado na mesma ocorrência numa
 * função que pode "acumular" aquela vaga. Se nem isso for possível, a vaga
 * fica em aberto (servidorId null).
 *
 * Quem tem frequência de presença baixa (`ServidorCandidato.frequenciaBaixa`,
 * calculado a partir das presenças registradas — ver lib/frequencia.ts) cai
 * de prioridade: só é escolhido quando não sobra mais ninguém com frequência
 * normal disputando a mesma vaga.
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
  const gruposVinculo = calcularGruposVinculo(options.vinculos ?? new Map());

  const contagemTotal = new Map<string, number>(Object.entries(options.contagemInicial ?? {}));
  const ultimaFuncao = new Map<string, string>();

  const existentesPorOcorrencia = new Map<string, Array<{ funcaoId: string; servidorId: string }>>();
  // servidorId -> dias em que já está escalado numa função de prioridade
  // ALTA/MEDIA. Quem só tem função BAIXA no dia continua livre para outras
  // missas do mesmo dia (ver diaChave/regra abaixo).
  const usadosNoDiaAlta = new Map<string, Set<string>>();

  function marcarUsoNoDia(servidorId: string, data: Date, prioridade: Prioridade) {
    if (prioridade === "BAIXA") return;
    const chave = diaChave(data);
    const lista = usadosNoDiaAlta.get(chave);
    if (lista) lista.add(servidorId);
    else usadosNoDiaAlta.set(chave, new Set([servidorId]));
  }

  for (const a of options.atribuicoesExistentes ?? []) {
    if (!a.servidorId) continue;
    const lista = existentesPorOcorrencia.get(a.ocorrenciaId);
    const entrada = { funcaoId: a.funcaoId, servidorId: a.servidorId };
    if (lista) lista.push(entrada);
    else existentesPorOcorrencia.set(a.ocorrenciaId, [entrada]);
    marcarUsoNoDia(a.servidorId, a.data, a.prioridade);
  }

  const grupos = agruparPorOcorrencia(slotsInput);
  const ocorrenciasOrdenadas = [...grupos.entries()].sort(
    (a, b) => a[1][0].data.getTime() - b[1][0].data.getTime()
  );

  const resultado: AtribuicaoGerada[] = [];

  function escolherVencedor(candidatos: ServidorCandidato[], funcaoId: string): ServidorCandidato {
    const semRepeticao = candidatos.filter((c) => ultimaFuncao.get(c.id) !== funcaoId);
    let grupoEscolha = semRepeticao.length > 0 ? semRepeticao : candidatos;

    // Quem tem frequência baixa só é escolhido se não sobrar ninguém com
    // frequência normal disputando a mesma vaga (ver ServidorCandidato.frequenciaBaixa).
    const semFrequenciaBaixa = grupoEscolha.filter((c) => !c.frequenciaBaixa);
    grupoEscolha = semFrequenciaBaixa.length > 0 ? semFrequenciaBaixa : grupoEscolha;

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

    // Pré-passo de vínculos (ex: irmãos): ou o grupo inteiro é escalado
    // junto nesta ocorrência (em vagas não-atômicas distintas), ou nenhum
    // dos vinculados serve aqui. Só considera grupos totalmente livres nesta
    // ocorrência (ninguém do grupo já veio de uma atribuição existente).
    const missaIdOcorrencia = slotsDaOcorrenciaBrutos[0]?.missaId;
    if (missaIdOcorrencia) {
      const diaOcorrencia = diaChave(slotsDaOcorrenciaBrutos[0].data);
      const gruposJaProcessados = new Set<string>();
      for (const servidor of servidores) {
        const grupo = gruposVinculo.get(servidor.id);
        if (!grupo || grupo.size < 2) continue;

        const chaveGrupo = [...grupo].sort().join(",");
        if (gruposJaProcessados.has(chaveGrupo)) continue;
        gruposJaProcessados.add(chaveGrupo);

        const membros = [...grupo]
          .map((id) => servidorPorId.get(id))
          .filter((s): s is ServidorCandidato => Boolean(s));

        if (membros.length !== grupo.size || membros.some((m) => usadosNaOcorrencia.has(m.id))) {
          continue;
        }

        // Mesma regra de "não escalar duas vezes no mesmo dia" do resto do
        // gerador: se algum vinculado já tem função ALTA/MEDIA nesse dia
        // (de uma ocorrência anterior), o par inteiro fica de fora daqui —
        // sem isso, o pré-passo de vínculo ignorava esse limite e escalava
        // os dois de novo à noite mesmo já tendo servido de manhã.
        if (membros.some((m) => usadosNoDiaAlta.get(diaOcorrencia)?.has(m.id))) {
          for (const m of membros) usadosNaOcorrencia.add(m.id);
          continue;
        }

        const todosPreferem = membros.every((m) => m.missaIdsPreferidas.has(missaIdOcorrencia));
        if (!todosPreferem) {
          for (const m of membros) usadosNaOcorrencia.add(m.id);
          continue;
        }

        const poolSlots = unidades
          .filter((u) => !u.atomica)
          .flatMap((u) => u.slots)
          .sort((a, b) => PRIORIDADE_ORDEM[a.prioridade] - PRIORIDADE_ORDEM[b.prioridade]);

        const vagasReservadas = new Set<string>();
        const alocacao = new Map<string, SlotParaPreencher>();

        for (const membro of membros) {
          const slot = poolSlots.find((s) => {
            const chave = `${s.funcaoId}:${s.slotIndex}`;
            return !vagasReservadas.has(chave) && grauCompativel(membro, s.grauMinimo);
          });
          if (!slot) break;
          vagasReservadas.add(`${slot.funcaoId}:${slot.slotIndex}`);
          alocacao.set(membro.id, slot);
        }

        if (alocacao.size !== membros.length) {
          for (const m of membros) usadosNaOcorrencia.add(m.id);
          continue;
        }

        for (const [servidorId, slot] of alocacao) {
          resultado.push({
            ocorrenciaId: slot.ocorrenciaId,
            funcaoId: slot.funcaoId,
            slotIndex: slot.slotIndex,
            servidorId,
          });
          contagemTotal.set(servidorId, (contagemTotal.get(servidorId) ?? 0) + 1);
          ultimaFuncao.set(servidorId, slot.funcaoId);
          usadosNaOcorrencia.add(servidorId);
          assignadoPorFuncao.set(slot.funcaoId, servidorId);
          marcarUsoNoDia(servidorId, slot.data, slot.prioridade);

          const unidadeDoSlot = unidades.find((u) => u.slots.includes(slot));
          if (unidadeDoSlot) {
            const indice = unidadeDoSlot.slots.indexOf(slot);
            unidadeDoSlot.slots.splice(indice, 1);
          }
        }
      }
    }

    for (const unidade of unidades) {
      // Pode ter ficado vazia se o pré-passo de vínculo reservou todas as
      // vagas dessa função para o grupo de irmãos.
      if (unidade.slots.length === 0) continue;
      const missaId = unidade.slots[0].missaId;

      if (!unidade.atomica) {
        for (const slot of unidade.slots) {
          const candidatos = servidores.filter(
            (s) =>
              s.missaIdsPreferidas.has(slot.missaId) &&
              grauCompativel(s, slot.grauMinimo) &&
              !usadosNaOcorrencia.has(s.id) &&
              !usadosNoDiaAlta.get(diaChave(slot.data))?.has(s.id)
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
          marcarUsoNoDia(vencedor.id, slot.data, slot.prioridade);
        }
        continue;
      }

      // Unidade atômica: só preenche se houver gente para TODAS as vagas.
      const diaUnidade = unidade.slots[0].data;
      const candidatosBase = servidores.filter(
        (s) =>
          s.missaIdsPreferidas.has(missaId) &&
          grauCompativel(s, unidade.grauMinimo) &&
          !usadosNaOcorrencia.has(s.id) &&
          !usadosNoDiaAlta.get(diaChave(diaUnidade))?.has(s.id)
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
        marcarUsoNoDia(vencedor.id, slot.data, slot.prioridade);

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
        marcarUsoNoDia(acumuladorId, slot.data, slot.prioridade);
      }
    }
  }

  return resultado;
}
