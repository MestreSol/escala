/**
 * Popula o banco com dados de TESTE (placeholder): funções, missas com seus
 * requisitos, acúmulos, servidores com preferências, um par de irmãos
 * vinculados e alguns dias de indisponibilidade. Não gera escala — isso é
 * pra testar pelo botão "Gerar escala" no calendário.
 *
 * Só INSERE: se já houver funções, missas ou servidores no banco, o script
 * para sem mexer em nada (nunca apaga dados). Não cria usuário de login —
 * use `npm run criar-usuario` pra isso.
 *
 * Uso: npm run seed
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

type Grau = "COROINHA" | "ACOLITO" | "CERIMONIARIO";
type Prioridade = "ALTA" | "MEDIA" | "BAIXA";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar definidos (.env).");
  process.exit(1); // ainda não abriu conexão nenhuma, sair na hora é seguro
}
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

const agora = new Date().toISOString();
const novoId = () => crypto.randomUUID();

// PRNG com semente fixa: rodar de novo num banco vazio gera os mesmos dados.
let semente = 20260928;
function aleatorio() {
  semente = (semente * 1664525 + 1013904223) % 2 ** 32;
  return semente / 2 ** 32;
}
const escolher = <T>(lista: readonly T[]) => lista[Math.floor(aleatorio() * lista.length)];
const inteiroEntre = (min: number, max: number) => min + Math.floor(aleatorio() * (max - min + 1));

function falhar(tabela: string, error: { code?: string }): never {
  if (error.code === "42501") {
    console.error(
      `\nSem permissão no schema public (erro 42501) na tabela "${tabela}".\n` +
        "Rode antes, no SQL Editor do Supabase:\n" +
        "  GRANT USAGE ON SCHEMA public TO service_role;\n" +
        "  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;\n" +
        "  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;\n"
    );
  }
  throw error;
}

async function inserir(tabela: string, linhas: Record<string, unknown>[]) {
  if (linhas.length === 0) return;
  const { error } = await supabase.from(tabela).insert(linhas);
  if (error) falhar(tabela, error);
}

async function bancoTemDados(): Promise<string | null> {
  for (const tabela of ["Funcao", "Missa", "Servidor"]) {
    // Sem `head: true`: consulta HEAD não traz corpo, e aí o erro chega sem
    // código/mensagem (ex: o 42501 de permissão aparecia como { message: '' }).
    const { data, error } = await supabase.from(tabela).select("id").limit(1);
    if (error) falhar(tabela, error);
    if ((data ?? []).length > 0) return tabela;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Funções
// ---------------------------------------------------------------------------

const FUNCOES: { chave: string; nome: string; prioridade: Prioridade; grauMinimo: Grau; quantidade: number; atomica?: boolean }[] = [
  { chave: "cerimoniario", nome: "Cerimoniário", prioridade: "ALTA", grauMinimo: "CERIMONIARIO", quantidade: 1 },
  { chave: "auxiliar", nome: "Auxiliar", prioridade: "ALTA", grauMinimo: "ACOLITO", quantidade: 1 },
  { chave: "auxiliar2", nome: "Auxiliar II", prioridade: "ALTA", grauMinimo: "ACOLITO", quantidade: 1 },
  { chave: "cruciferario", nome: "Cruciferário", prioridade: "MEDIA", grauMinimo: "COROINHA", quantidade: 1 },
  { chave: "evangeliario", nome: "Evangeliário", prioridade: "MEDIA", grauMinimo: "ACOLITO", quantidade: 1 },
  { chave: "missal", nome: "Missal", prioridade: "MEDIA", grauMinimo: "COROINHA", quantidade: 1 },
  { chave: "turiferario", nome: "Turiferário", prioridade: "MEDIA", grauMinimo: "ACOLITO", quantidade: 1 },
  { chave: "naveteiro", nome: "Naveteiro", prioridade: "BAIXA", grauMinimo: "COROINHA", quantidade: 1 },
  { chave: "cerofGrande", nome: "Ceroferário Grande", prioridade: "BAIXA", grauMinimo: "COROINHA", quantidade: 2, atomica: true },
  { chave: "cerofPequeno", nome: "Ceroferário Pequeno", prioridade: "BAIXA", grauMinimo: "COROINHA", quantidade: 2, atomica: true },
  { chave: "sineta", nome: "Sineta", prioridade: "BAIXA", grauMinimo: "COROINHA", quantidade: 1 },
];

/** [função-base, função que ela pode assumir como último recurso]. */
const ACUMULOS: [string, string][] = [
  ["naveteiro", "sineta"],
  ["turiferario", "naveteiro"],
  ["auxiliar", "auxiliar2"],
];

// ---------------------------------------------------------------------------
// Missas
// ---------------------------------------------------------------------------

const MISSAS: {
  chave: string;
  diaSemana?: number;
  dataUnica?: string;
  horario: string;
  comunidade: string;
  todosAtivos?: boolean;
  funcoes: string[];
}[] = [
  {
    chave: "dom0930",
    diaSemana: 0,
    horario: "09:30",
    comunidade: "Matriz",
    funcoes: FUNCOES.filter((f) => f.chave !== "cerimoniario").map((f) => f.chave),
  },
  {
    chave: "dom1800",
    diaSemana: 0,
    horario: "18:00",
    comunidade: "Matriz",
    funcoes: FUNCOES.map((f) => f.chave),
  },
  {
    chave: "qui1900",
    diaSemana: 4,
    horario: "19:00",
    comunidade: "Matriz",
    funcoes: ["auxiliar", "cruciferario", "missal", "cerofPequeno", "sineta"],
  },
  {
    chave: "sab1700",
    diaSemana: 6,
    horario: "17:00",
    comunidade: "São José",
    funcoes: ["auxiliar", "cruciferario", "missal", "sineta"],
  },
  {
    // Evento sazonal que precisa de todo mundo (sem vagas por função).
    chave: "aparecida",
    dataUnica: "2026-10-12T00:00:00.000Z",
    horario: "19:00",
    comunidade: "Matriz",
    todosAtivos: true,
    funcoes: [],
  },
];

const PREFERENCIAS_POR_COMUNIDADE: Record<string, string[]> = {
  Matriz: ["dom0930", "dom1800", "qui1900"],
  "São José": ["sab1700", "dom1800"],
  "Santa Rita": ["dom0930", "sab1700", "qui1900"],
};

// ---------------------------------------------------------------------------
// Servidores (nomes fictícios)
// ---------------------------------------------------------------------------

const PRIMEIROS_NOMES = [
  "Ana", "Beatriz", "Bruno", "Caio", "Camila", "Daniel", "Davi", "Eduarda", "Enzo", "Felipe",
  "Gabriel", "Giovana", "Heitor", "Helena", "Isabela", "João", "Júlia", "Laura", "Lucas", "Luísa",
  "Manuela", "Mariana", "Mateus", "Miguel", "Nicolas", "Rafael", "Samuel", "Sofia", "Theo", "Valentina",
];
const SOBRENOMES = [
  "Almeida", "Barbosa", "Cardoso", "Costa", "Dias", "Ferreira", "Gomes", "Lima", "Martins", "Melo",
  "Moreira", "Nunes", "Oliveira", "Pereira", "Ribeiro", "Rocha", "Santos", "Silva", "Souza", "Teixeira",
];
const DISTRIBUICAO: { categoria: Grau; quantidade: number; idade: [number, number] }[] = [
  { categoria: "COROINHA", quantidade: 22, idade: [9, 14] },
  { categoria: "ACOLITO", quantidade: 12, idade: [14, 22] },
  { categoria: "CERIMONIARIO", quantidade: 4, idade: [18, 35] },
];

/** Data de nascimento aleatória (âncora meia-noite UTC) de alguém com a idade dada hoje. */
function dataNascimentoParaIdade(idade: number): string {
  const hoje = new Date();
  const diasAtras = inteiroEntre(0, 364);
  const data = new Date(Date.UTC(hoje.getUTCFullYear() - idade, hoje.getUTCMonth(), hoje.getUTCDate() - diasAtras));
  return data.toISOString();
}

/** Próximos domingos (meia-noite UTC, como MissaOcorrencia.data) a partir de hoje. */
function proximosDomingos(quantidade: number): Date[] {
  const hoje = new Date();
  const dia = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));
  while (dia.getUTCDay() !== 0) dia.setUTCDate(dia.getUTCDate() + 1);
  return Array.from({ length: quantidade }, (_, i) => new Date(dia.getTime() + i * 7 * 24 * 60 * 60 * 1000));
}

async function main() {
  const tabelaComDados = await bancoTemDados();
  if (tabelaComDados) {
    console.error(
      `O banco já tem dados (tabela "${tabelaComDados}"). O seed só roda em banco vazio e nunca apaga nada — nada foi alterado.`
    );
    process.exitCode = 1;
    return;
  }

  // Funções
  const funcaoId = new Map(FUNCOES.map((f) => [f.chave, novoId()]));
  await inserir(
    "Funcao",
    FUNCOES.map((f) => ({
      id: funcaoId.get(f.chave),
      nome: f.nome,
      prioridade: f.prioridade,
      grauMinimo: f.grauMinimo,
      quantidadePadrao: f.quantidade,
      exigeGrupoCompleto: f.atomica ?? false,
      updatedAt: agora,
    }))
  );
  // _FuncaoAcumulacao: A = função assumida (alvo), B = função-base (ver lib/funcaoAcumulacao.ts).
  await inserir(
    "_FuncaoAcumulacao",
    ACUMULOS.map(([base, alvo]) => ({ A: funcaoId.get(alvo), B: funcaoId.get(base) }))
  );

  // Missas + requisitos
  const missaId = new Map(MISSAS.map((m) => [m.chave, novoId()]));
  await inserir(
    "Missa",
    MISSAS.map((m) => ({
      id: missaId.get(m.chave),
      diaSemana: m.diaSemana ?? null,
      dataUnica: m.dataUnica ?? null,
      horario: m.horario,
      comunidade: m.comunidade,
      escalarTodosAtivos: m.todosAtivos ?? false,
      updatedAt: agora,
    }))
  );
  await inserir(
    "MissaFuncaoRequisito",
    MISSAS.flatMap((m) =>
      m.funcoes.map((chave) => ({
        id: novoId(),
        missaId: missaId.get(m.chave),
        funcaoId: funcaoId.get(chave),
        quantidade: FUNCOES.find((f) => f.chave === chave)!.quantidade,
      }))
    )
  );

  // Servidores + preferências
  const nomesUsados = new Set<string>();
  const servidores: {
    id: string;
    nome: string;
    dataNascimento: string;
    comunidade: string;
    categoria: Grau;
    preferencias: string[];
  }[] = [];
  for (const grupo of DISTRIBUICAO) {
    for (let i = 0; i < grupo.quantidade; i++) {
      let nome: string;
      do {
        nome = `${escolher(PRIMEIROS_NOMES)} ${escolher(SOBRENOMES)} ${escolher(SOBRENOMES)}`;
      } while (nomesUsados.has(nome));
      nomesUsados.add(nome);

      const comunidade = aleatorio() < 0.7 ? "Matriz" : escolher(["São José", "Santa Rita"]);
      const opcoes = PREFERENCIAS_POR_COMUNIDADE[comunidade];
      const quantidadePrefs = inteiroEntre(1, opcoes.length);
      const preferencias = [...opcoes].sort(() => aleatorio() - 0.5).slice(0, quantidadePrefs);

      servidores.push({
        id: novoId(),
        nome,
        dataNascimento: dataNascimentoParaIdade(inteiroEntre(...grupo.idade)),
        comunidade,
        categoria: grupo.categoria,
        preferencias,
      });
    }
  }

  // Um par de irmãos (vínculo): mesmo sobrenome, mesmas missas preferidas.
  const [irmaoA, irmaoB] = servidores.filter((s) => s.categoria === "COROINHA").slice(0, 2);
  irmaoB.nome = `${irmaoB.nome.split(" ")[0]} ${irmaoA.nome.split(" ").slice(1).join(" ")}`;
  irmaoB.comunidade = irmaoA.comunidade;
  irmaoB.preferencias = [...irmaoA.preferencias];

  await inserir(
    "Servidor",
    servidores.map((s) => ({
      id: s.id,
      nome: s.nome,
      dataNascimento: s.dataNascimento,
      comunidade: s.comunidade,
      categoria: s.categoria,
      updatedAt: agora,
    }))
  );
  await inserir(
    "ServidorMissaPreferencia",
    servidores.flatMap((s) =>
      s.preferencias.map((chave) => ({ id: novoId(), servidorId: s.id, missaId: missaId.get(chave) }))
    )
  );
  const [servidorAId, servidorBId] = [irmaoA.id, irmaoB.id].sort();
  await inserir("ServidorVinculo", [{ id: novoId(), servidorAId, servidorBId }]);

  // Alguns servidores avisaram que não podem num dos próximos domingos.
  const domingos = proximosDomingos(5);
  const indisponiveis = [...servidores].sort(() => aleatorio() - 0.5).slice(0, 6);
  await inserir(
    "ServidorIndisponibilidade",
    indisponiveis.map((s) => ({ id: novoId(), servidorId: s.id, data: escolher(domingos).toISOString() }))
  );

  const porGrau = (g: Grau) => servidores.filter((s) => s.categoria === g).length;
  console.log("Seed concluído:");
  console.log(`  ${FUNCOES.length} funções (${ACUMULOS.length} acúmulos)`);
  console.log(`  ${MISSAS.length} missas (${MISSAS.filter((m) => m.todosAtivos).length} com todos os ativos)`);
  console.log(
    `  ${servidores.length} servidores: ${porGrau("COROINHA")} coroinhas, ${porGrau("ACOLITO")} acólitos, ${porGrau("CERIMONIARIO")} cerimoniários`
  );
  console.log(`  1 vínculo de irmãos (${irmaoA.nome} + ${irmaoB.nome})`);
  console.log(`  ${indisponiveis.length} indisponibilidades nos próximos domingos`);
  console.log("\nPara entrar no painel: npm run criar-usuario -- <usuario> <senha> ADMIN");
}

// exitCode em vez de process.exit(): no Windows, sair na marra com conexões
// HTTP ainda fechando derruba o Node ("Assertion failed ... async.c").
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
