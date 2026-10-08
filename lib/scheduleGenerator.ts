export type Grau = "COROINHA" | "ACOLITO" | "CERIMONIARIO";
export type Prioridade = "ALTA" | "MEDIA" | "BAIXA";
/**
 * Como a missa dessa vaga escolhe candidatos (ver Missa.dataUnica e
 * MissaPastoral.comunidadeResponsavel no schema — "missas grandes", ex: Natal):
 * NORMAL = preferência de missa de cada servidor (missas semanais);
 * TODOS_ATIVOS = qualquer servidor ativo, grau ainda respeitado (data única);
 * COMUNIDADE = só servidores de ServidorCandidato.comunidade === comunidadeResponsavel.
 * Missas "Todos os coroinhas" (MissaPastoral.escalarTodosAtivos) não passam pelo
 * gerador: não têm vagas por função, só a lista de presença.
 */
export type ModoEscalacao = "NORMAL" | "TODOS_ATIVOS" | "COMUNIDADE";

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
  modoEscalacao: ModoEscalacao;
  /** Só usado quando modoEscalacao === "COMUNIDADE". */
  comunidadeResponsavel?: string;
};

export type ServidorCandidato = {
  id: string;
  categoria: Grau;
  comunidade: string;
  missaIdsPreferidas: Set<string>;
  /**
   * Frequência de presença abaixo do limiar (ver lib/frequencia.ts). Não
   * exclui o servidor do sorteio, só o deixa por último: só é escolhido
   * quando não sobra ninguém com frequência normal para a vaga.
   */
  frequenciaBaixa?: boolean;
  /**
   * Dias (diaChave) em que o próprio servidor avisou que não pode servir
   * (ver lib/servidorIndisponibilidade.ts) — diferente de frequenciaBaixa,
   * isso EXCLUI o servidor de qualquer vaga nesse dia, sem exceção.
   */
  diasIndisponiveis?: Set<string>;
  /**
   * Já serve há mais tempo. Nas vagas em dupla/par (ver `paresDeFuncoes`), o
   * gerador junta um experiente com um inexperiente — ver `ajustarPelaExperiencia`.
   */
  experiente?: boolean;
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
   * respeitar a regra de "não repetir no mesmo dia" (ver `data` abaixo)
   * mesmo quando a atribuição anterior não faz parte deste lote.
   */
  atribuicoesExistentes?: Array<{
    ocorrenciaId: string;
    funcaoId: string;
    /** Vaga dentro da função; sem ela a atribuição não entra na regra de dupla. */
    slotIndex?: number;
    servidorId: string | null;
    data: Date;
  }>;
  /**
   * Mapa servidorId -> lista de servidorId vinculados (ex: irmãos). Quem tem
   * vínculo só é escalado numa ocorrência se TODOS os vinculados também
   * forem — senão, nenhum do grupo serve naquela ocorrência.
   */
  vinculos?: Map<string, string[]>;
  /**
   * Pares de funções DIFERENTES que trabalham juntas (ex: Turiferário e
   * Naveteiro): a vaga #N de uma faz dupla com a vaga #N da outra. Funções
   * com 2+ vagas na mesma missa já formam duplas entre si (#1 com #2...).
   */
  paresDeFuncoes?: [string, string][];
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

/** Se o servidor não marcou o dia da vaga como indisponível (ver ServidorCandidato.diasIndisponiveis). */
function disponivelNoDia(servidor: ServidorCandidato, data: Date): boolean {
  return !servidor.diasIndisponiveis?.has(diaChave(data));
}

/**
 * Se o servidor pode ser considerado pra missa dessa vaga (ver ModoEscalacao
 * acima) — substitui a checagem de preferência de missa nas "missas grandes".
 */
function elegivelParaMissa(
  servidor: ServidorCandidato,
  slot: Pick<SlotParaPreencher, "missaId" | "modoEscalacao" | "comunidadeResponsavel">
): boolean {
  if (slot.modoEscalacao === "TODOS_ATIVOS") return true;
  if (slot.modoEscalacao === "COMUNIDADE") return servidor.comunidade === slot.comunidadeResponsavel;
  return servidor.missaIdsPreferidas.has(slot.missaId);
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

const chaveVaga = (funcaoId: string, slotIndex: number) => `${funcaoId}:${slotIndex}`;

/**
 * Qual vaga faz dupla com qual, dentro de uma ocorrência. Primeiro as vagas
 * da mesma função (#1 com #2, #3 com #4...); depois os pares de funções
 * diferentes (#N de uma com #N da outra), só entre vagas ainda sem dupla.
 */
function montarDuplas(
  vagasPorFuncao: Map<string, number[]>,
  paresDeFuncoes: [string, string][]
): Map<string, string> {
  const parceiro = new Map<string, string>();
  const ligar = (a: string, b: string) => {
    parceiro.set(a, b);
    parceiro.set(b, a);
  };

  for (const [funcaoId, indices] of vagasPorFuncao) {
    for (let i = 0; i + 1 < indices.length; i += 2) {
      ligar(chaveVaga(funcaoId, indices[i]), chaveVaga(funcaoId, indices[i + 1]));
    }
  }

  for (const [funcaoA, funcaoB] of paresDeFuncoes) {
    const livresA = (vagasPorFuncao.get(funcaoA) ?? []).map((i) => chaveVaga(funcaoA, i)).filter((k) => !parceiro.has(k));
    const livresB = (vagasPorFuncao.get(funcaoB) ?? []).map((i) => chaveVaga(funcaoB, i)).filter((k) => !parceiro.has(k));
    for (let i = 0; i < Math.min(livresA.length, livresB.length); i++) ligar(livresA[i], livresB[i]);
  }

  return parceiro;
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
 * preferidas — a menos que a vaga seja de uma "missa grande" com
 * `modoEscalacao` TODOS_ATIVOS (qualquer servidor ativo) ou COMUNIDADE (só
 * quem tem `ServidorCandidato.comunidade` igual à comunidade responsável),
 * ver `elegivelParaMissa` — e funções cujo grau mínimo seu grau alcança (hierarquia:
 * Cerimoniário cobre Acólito e Coroinha; Acólito cobre Coroinha); evita
 * repetir a mesma função que exerceu na última vez em que serviu; entre os
 * candidatos restantes, prioriza quem tem menor contagem total no período
 * (equilíbrio) e sorteia entre os empatados; ninguém é escalado duas vezes
 * na mesma ocorrência exceto via acumulação explícita (ver `acumulacoes`).
 *
 * Ninguém é escalado em duas ocorrências diferentes no mesmo dia, qualquer
 * que seja a prioridade da função (ex: quem faz Sineta de manhã não volta à
 * noite). A única repetição permitida é o acúmulo dentro da mesma ocorrência.
 *
 * Funções marcadas em `funcoesAtomicas` são preenchidas em bloco: só são
 * atribuídas se houver gente distinta para TODAS as suas vagas na mesma
 * ocorrência; senão, todas ficam em aberto (não entram no acúmulo).
 *
 * Servidores vinculados (ver `vinculos`, ex: irmãos) só são escalados numa
 * ocorrência se TODOS os vinculados também puderem servir ali (preferem
 * aquela missa, ninguém do grupo já está escalado em outra missa do dia, e há
 * vaga não-atômica distinta e elegível para cada um); senão, nenhum do grupo
 * é escalado naquela ocorrência. O grupo entra no rodízio como todo mundo
 * (ver `grupoNaVez`), e cada um vai pra uma função diferente sempre que dá,
 * evitando repetir a função da última vez (ver `alocarGrupo`).
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
 *
 * Vagas em dupla (mesma função com 2+ vagas, ou pares de `paresDeFuncoes`)
 * juntam um experiente com um inexperiente (`ServidorCandidato.experiente`):
 * sem inexperiente disponível vão dois experientes, mas nunca uma dupla só
 * de inexperientes — aí a vaga fica em aberto. A regra só vale enquanto
 * houver experientes E inexperientes entre os servidores (ninguém marcado, ou
 * todos experientes, = sem efeito). O pré-passo de vínculos (irmãos) não
 * olha experiência; as vagas parceiras dele se ajustam depois.
 *
 * Dias que o próprio servidor avisou como indisponível (`diasIndisponiveis`,
 * ver lib/servidorIndisponibilidade.ts — tela pública onde ele marca isso)
 * excluem o servidor de qualquer vaga naquele dia, sem exceção — diferente
 * de frequenciaBaixa, aqui não há "último recurso".
 */
/** Limite de combinações testadas por grupo (grupos são pequenos: irmãos, 2 ou 3). */
const MAXIMO_COMBINACOES_GRUPO = 20000;

/**
 * Escolhe uma vaga distinta pra cada membro do grupo vinculado. Servir junto
 * não é servir na mesma função: o melhor é cada um numa função diferente e
 * nenhum repetindo a função da última vez. Entre as opções igualmente boas,
 * sorteia (pra não cair sempre nas mesmas funções).
 */
function alocarGrupo(
  membros: ServidorCandidato[],
  vagas: SlotParaPreencher[],
  ultimaFuncao: Map<string, string>,
  random: () => number
): Map<string, SlotParaPreencher> | null {
  const sorteio = new Map(vagas.map((v) => [v, random()]));
  let melhor: { custo: number; alocacao: SlotParaPreencher[] } | null = null;
  let combinacoes = 0;
  const escolhidas: SlotParaPreencher[] = [];

  function custoDe(alocacao: SlotParaPreencher[]): number {
    let custo = 0;
    const funcoes = new Set<string>();
    alocacao.forEach((vaga, i) => {
      if (funcoes.has(vaga.funcaoId)) custo += 1000;
      funcoes.add(vaga.funcaoId);
      if (ultimaFuncao.get(membros[i].id) === vaga.funcaoId) custo += 100;
      custo += sorteio.get(vaga) ?? 0;
    });
    return custo;
  }

  function buscar(i: number) {
    if (combinacoes >= MAXIMO_COMBINACOES_GRUPO) return;
    if (i === membros.length) {
      combinacoes += 1;
      const custo = custoDe(escolhidas);
      if (!melhor || custo < melhor.custo) melhor = { custo, alocacao: [...escolhidas] };
      return;
    }
    for (const vaga of vagas) {
      if (escolhidas.includes(vaga) || !grauCompativel(membros[i], vaga.grauMinimo)) continue;
      escolhidas.push(vaga);
      buscar(i + 1);
      escolhidas.pop();
    }
  }

  buscar(0);
  const resultado = melhor as { custo: number; alocacao: SlotParaPreencher[] } | null;
  if (!resultado) return null;
  return new Map(membros.map((m, i) => [m.id, resultado.alocacao[i]]));
}

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
  const paresDeFuncoes = options.paresDeFuncoes ?? [];
  const regraDeExperienciaAtiva =
    servidores.some((s) => s.experiente) && servidores.some((s) => !s.experiente);

  const contagemTotal = new Map<string, number>(Object.entries(options.contagemInicial ?? {}));
  const ultimaFuncao = new Map<string, string>();

  const existentesPorOcorrencia = new Map<
    string,
    Array<{ funcaoId: string; slotIndex?: number; servidorId: string }>
  >();
  // diaChave -> servidores já escalados em alguma missa desse dia (qualquer
  // função, qualquer prioridade). Quem está aqui não entra em outra missa do
  // mesmo dia.
  const usadosNoDia = new Map<string, Set<string>>();

  function marcarUsoNoDia(servidorId: string, data: Date) {
    const chave = diaChave(data);
    const lista = usadosNoDia.get(chave);
    if (lista) lista.add(servidorId);
    else usadosNoDia.set(chave, new Set([servidorId]));
  }

  for (const a of options.atribuicoesExistentes ?? []) {
    if (!a.servidorId) continue;
    const lista = existentesPorOcorrencia.get(a.ocorrenciaId);
    const entrada = { funcaoId: a.funcaoId, slotIndex: a.slotIndex, servidorId: a.servidorId };
    if (lista) lista.push(entrada);
    else existentesPorOcorrencia.set(a.ocorrenciaId, [entrada]);
    marcarUsoNoDia(a.servidorId, a.data);
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
    const ocupantePorVaga = new Map<string, string>();
    const vagasPorFuncao = new Map<string, number[]>();
    const anotarVaga = (funcaoId: string, slotIndex: number) => {
      const lista = vagasPorFuncao.get(funcaoId) ?? [];
      if (!lista.includes(slotIndex)) lista.push(slotIndex);
      vagasPorFuncao.set(funcaoId, lista);
    };

    for (const existente of existentesPorOcorrencia.get(ocorrenciaId) ?? []) {
      usadosNaOcorrencia.add(existente.servidorId);
      assignadoPorFuncao.set(existente.funcaoId, existente.servidorId);
      if (existente.slotIndex !== undefined) {
        ocupantePorVaga.set(chaveVaga(existente.funcaoId, existente.slotIndex), existente.servidorId);
        anotarVaga(existente.funcaoId, existente.slotIndex);
      }
    }
    for (const slot of slotsDaOcorrenciaBrutos) anotarVaga(slot.funcaoId, slot.slotIndex);
    for (const indices of vagasPorFuncao.values()) indices.sort((a, b) => a - b);
    const parceiroDaVaga = regraDeExperienciaAtiva
      ? montarDuplas(vagasPorFuncao, paresDeFuncoes)
      : new Map<string, string>();

    /**
     * Regra de dupla: parceiro já escalado e experiente → prefere inexperiente
     * (senão qualquer um); parceiro inexperiente → só experiente (pode sobrar
     * ninguém = vaga em aberto); parceiro ainda vazio → prefere experiente.
     */
    function ajustarPelaExperiencia(candidatos: ServidorCandidato[], slot: SlotParaPreencher): ServidorCandidato[] {
      const parceiro = parceiroDaVaga.get(chaveVaga(slot.funcaoId, slot.slotIndex));
      if (!parceiro) return candidatos;
      const ocupante = ocupantePorVaga.get(parceiro);
      const ocupanteExperiente = ocupante ? servidorPorId.get(ocupante)?.experiente : undefined;
      if (ocupante && ocupanteExperiente === false) return candidatos.filter((c) => c.experiente);
      const preferidos = candidatos.filter((c) => (ocupante ? !c.experiente : c.experiente));
      return preferidos.length > 0 ? preferidos : candidatos;
    }

    /**
     * Rodízio do grupo vinculado: o pré-passo roda antes das outras vagas, e
     * sem isso o grupo entrava em TODA missa que preferisse. Só entra quando
     * não há gente que serviu menos que ele em número suficiente pra ocupar
     * as vagas que sobram — o mesmo critério de "menor contagem" do resto.
     */
    function grupoNaVez(membros: ServidorCandidato[], slot: SlotParaPreencher): boolean {
      const contagemDoGrupo = Math.max(...membros.map((m) => contagemTotal.get(m.id) ?? 0));
      const vagasRestantes = unidades.reduce((soma, u) => soma + u.slots.length, 0);
      const idsDoGrupo = new Set(membros.map((m) => m.id));
      const outros = servidores.filter(
        (s) =>
          !idsDoGrupo.has(s.id) &&
          elegivelParaMissa(s, slot) &&
          !usadosNaOcorrencia.has(s.id) &&
          !usadosNoDia.get(diaChave(slot.data))?.has(s.id) &&
          disponivelNoDia(s, slot.data)
      );
      // Sem gente suficiente pras vagas, o grupo entra (senão sobra vaga vazia).
      if (outros.length < vagasRestantes) return true;
      const serviramMenos = outros.filter(
        (s) => !s.frequenciaBaixa && (contagemTotal.get(s.id) ?? 0) < contagemDoGrupo
      ).length;
      return serviramMenos <= vagasRestantes - membros.length;
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
        // gerador: se algum vinculado já está escalado nesse dia (numa
        // ocorrência anterior), o par inteiro fica de fora daqui —
        // sem isso, o pré-passo de vínculo ignorava esse limite e escalava
        // os dois de novo à noite mesmo já tendo servido de manhã.
        if (membros.some((m) => usadosNoDia.get(diaOcorrencia)?.has(m.id))) {
          for (const m of membros) usadosNaOcorrencia.add(m.id);
          continue;
        }

        const todosPreferem = membros.every((m) => elegivelParaMissa(m, slotsDaOcorrenciaBrutos[0]));
        const todosDisponiveis = membros.every((m) => disponivelNoDia(m, slotsDaOcorrenciaBrutos[0].data));
        if (!todosPreferem || !todosDisponiveis) {
          for (const m of membros) usadosNaOcorrencia.add(m.id);
          continue;
        }

        if (!grupoNaVez(membros, slotsDaOcorrenciaBrutos[0])) {
          for (const m of membros) usadosNaOcorrencia.add(m.id);
          continue;
        }

        const alocacao = alocarGrupo(
          membros,
          unidades.filter((u) => !u.atomica).flatMap((u) => u.slots),
          ultimaFuncao,
          random
        );

        if (!alocacao) {
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
          ocupantePorVaga.set(chaveVaga(slot.funcaoId, slot.slotIndex), servidorId);
          marcarUsoNoDia(servidorId, slot.data);

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

      if (!unidade.atomica) {
        for (const slot of unidade.slots) {
          const candidatos = ajustarPelaExperiencia(
            servidores.filter(
              (s) =>
                elegivelParaMissa(s, slot) &&
                grauCompativel(s, slot.grauMinimo) &&
                !usadosNaOcorrencia.has(s.id) &&
                !usadosNoDia.get(diaChave(slot.data))?.has(s.id) &&
                disponivelNoDia(s, slot.data)
            ),
            slot
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
          ocupantePorVaga.set(chaveVaga(slot.funcaoId, slot.slotIndex), vencedor.id);
          marcarUsoNoDia(vencedor.id, slot.data);
        }
        continue;
      }

      // Unidade atômica: só preenche se houver gente para TODAS as vagas.
      const diaUnidade = unidade.slots[0].data;
      const candidatosBase = servidores.filter(
        (s) =>
          elegivelParaMissa(s, unidade.slots[0]) &&
          grauCompativel(s, unidade.grauMinimo) &&
          !usadosNaOcorrencia.has(s.id) &&
          !usadosNoDia.get(diaChave(diaUnidade))?.has(s.id) &&
          disponivelNoDia(s, diaUnidade)
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

      // Escolhe todas as vagas antes de gravar: se a regra de dupla deixar
      // alguma sem candidato, a unidade inteira fica em aberto (tudo ou nada).
      const poolDisponivel = [...candidatosBase];
      const escolhidos: { slot: SlotParaPreencher; servidor: ServidorCandidato }[] = [];
      for (const slot of unidade.slots) {
        const candidatos = ajustarPelaExperiencia(poolDisponivel, slot);
        if (candidatos.length === 0) break;
        const vencedor = escolherVencedor(candidatos, slot.funcaoId);
        escolhidos.push({ slot, servidor: vencedor });
        ocupantePorVaga.set(chaveVaga(slot.funcaoId, slot.slotIndex), vencedor.id);
        poolDisponivel.splice(
          poolDisponivel.findIndex((c) => c.id === vencedor.id),
          1
        );
      }

      if (escolhidos.length < unidade.slots.length) {
        for (const { slot } of escolhidos) ocupantePorVaga.delete(chaveVaga(slot.funcaoId, slot.slotIndex));
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

      for (const { slot, servidor: vencedor } of escolhidos) {
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
        marcarUsoNoDia(vencedor.id, slot.data);
      }
    }

    for (const slot of pendentes) {
      const funcoesQueAssumem = acumulacoes.get(slot.funcaoId) ?? [];

      let acumuladorId: string | null = null;
      for (const funcaoBaseId of funcoesQueAssumem) {
        const candidatoId = assignadoPorFuncao.get(funcaoBaseId);
        if (!candidatoId) continue;
        const candidato = servidorPorId.get(candidatoId);
        if (
          candidato &&
          grauCompativel(candidato, slot.grauMinimo) &&
          ajustarPelaExperiencia([candidato], slot).length > 0
        ) {
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
        ocupantePorVaga.set(chaveVaga(slot.funcaoId, slot.slotIndex), acumuladorId);
        contagemTotal.set(acumuladorId, (contagemTotal.get(acumuladorId) ?? 0) + 1);
        ultimaFuncao.set(acumuladorId, slot.funcaoId);
        marcarUsoNoDia(acumuladorId, slot.data);
      }
    }
  }

  return resultado;
}
