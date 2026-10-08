import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { pastoralDoPainel } from "@/lib/sessao";
import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";
import { TelefoneLink } from "@/components/admin/TelefoneLink";
import { agoraNaParoquia, lerDataArmazenada, paraExibicao } from "@/lib/occurrences";
import { LIMIAR_FREQUENCIA, MINIMO_REGISTROS_FREQUENCIA } from "@/lib/frequencia";
import type { ServidorRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const PERIODOS = [
  { chave: "mes", rotulo: "Este mês", meses: 1 },
  { chave: "3m", rotulo: "3 meses", meses: 3 },
  { chave: "6m", rotulo: "6 meses", meses: 6 },
  { chave: "12m", rotulo: "12 meses", meses: 12 },
  { chave: "tudo", rotulo: "Tudo", meses: null },
] as const;

/** O PostgREST devolve no máximo 1000 linhas por consulta. */
const LOTE = 1000;
const MAXIMO_MESES_NO_GRAFICO = 12;

type Registro = {
  id: string;
  servidorId: string;
  servidorNomeSnapshot: string | null;
  presente: boolean | null;
  funcao: { nome: string } | null;
  ocorrencia: { data: string; missa: { comunidade: string } | null };
};

type Servidor = Pick<ServidorRow, "id" | "nome" | "ativo" | "celular" | "celularResponsavel">;

type Resumo = {
  presencas: number;
  faltas: number;
  pendentes: number;
  faltasSeguidas: number;
  ultimaFalta: Date | null;
};

async function buscarRegistros(pastoralId: string, inicio: Date | null, fim: Date): Promise<Registro[]> {
  const registros: Registro[] = [];
  for (let de = 0; ; de += LOTE) {
    let query = supabase
      .from("EscalaAtribuicao")
      .select(
        "id, servidorId, servidorNomeSnapshot, presente, funcao:Funcao(nome), ocorrencia:MissaOcorrencia!inner(data, missa:Missa(comunidade))"
      )
      .eq("pastoralId", pastoralId)
      .not("servidorId", "is", null)
      .lte("ocorrencia.data", fim.toISOString());
    if (inicio) query = query.gte("ocorrencia.data", inicio.toISOString());
    const { data, error } = await query
      .order("id", { ascending: true })
      .range(de, de + LOTE - 1)
      .returns<Registro[]>();
    if (error) throw error;
    registros.push(...(data ?? []));
    if (!data || data.length < LOTE) return registros;
  }
}

const pct = (valor: number) => `${Math.round(valor * 100)}%`;

export default async function AbsenteismoPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const { periodo: periodoParam } = await searchParams;
  const { pastoral } = await pastoralDoPainel();
  const periodo = PERIODOS.find((p) => p.chave === periodoParam) ?? PERIODOS[1];

  const agora = new Date(`${agoraNaParoquia()}:00Z`);
  const inicio =
    periodo.meses === null
      ? null
      : new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - (periodo.meses - 1), 1));

  const [registros, servidoresResult] = await Promise.all([
    buscarRegistros(pastoral.id, inicio, agora),
    supabase
      .from("Servidor")
      .select("id, nome, ativo, celular, celularResponsavel")
      .eq("pastoralId", pastoral.id)
      .returns<Servidor[]>(),
  ]);
  if (servidoresResult.error) throw servidoresResult.error;
  const servidores = new Map((servidoresResult.data ?? []).map((s) => [s.id, s]));

  const comData = registros
    .map((r) => ({ ...r, data: lerDataArmazenada(r.ocorrencia.data) }))
    .sort((a, b) => b.data.getTime() - a.data.getTime());

  const resumos = new Map<string, Resumo>();
  const porMes = new Map<string, { presencas: number; faltas: number }>();
  let presencas = 0;
  let faltas = 0;
  let pendentes = 0;

  for (const r of comData) {
    const resumo = resumos.get(r.servidorId) ?? { presencas: 0, faltas: 0, pendentes: 0, faltasSeguidas: 0, ultimaFalta: null };
    resumos.set(r.servidorId, resumo);
    if (r.presente === null) {
      resumo.pendentes += 1;
      pendentes += 1;
      continue;
    }

    // Registros vêm do mais recente pro mais antigo: a sequência atual termina na primeira presença.
    const sequenciaAberta = resumo.presencas === 0 && resumo.faltas === resumo.faltasSeguidas;
    const chaveMes = r.ocorrencia.data.slice(0, 7);
    const mes = porMes.get(chaveMes) ?? { presencas: 0, faltas: 0 };
    porMes.set(chaveMes, mes);

    if (r.presente) {
      resumo.presencas += 1;
      mes.presencas += 1;
      presencas += 1;
    } else {
      if (sequenciaAberta) resumo.faltasSeguidas += 1;
      resumo.faltas += 1;
      resumo.ultimaFalta ??= r.data;
      mes.faltas += 1;
      faltas += 1;
    }
  }

  const registradas = presencas + faltas;
  const taxaGeral = registradas > 0 ? faltas / registradas : null;
  const meses = [...porMes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-MAXIMO_MESES_NO_GRAFICO);
  const limiteAlto = 1 - LIMIAR_FREQUENCIA;

  const cards = [
    {
      rotulo: "Absenteísmo",
      valor: taxaGeral === null ? "—" : pct(taxaGeral),
      destaque: taxaGeral !== null && taxaGeral > limiteAlto ? "text-danger" : "text-fg",
    },
    { rotulo: "Faltas", valor: String(faltas), destaque: faltas > 0 ? "text-danger" : "text-fg" },
    { rotulo: "Presenças", valor: String(presencas), destaque: "text-ok" },
    { rotulo: "Sem registro", valor: String(pendentes), destaque: pendentes > 0 ? "text-warn" : "text-fg" },
  ];

  const nomeDe = (r: { servidorId: string; servidorNomeSnapshot: string | null }) =>
    servidores.get(r.servidorId)?.nome ?? r.servidorNomeSnapshot ?? "—";
  const faltasDoPeriodo = comData.filter((r) => r.presente === false);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Absenteísmo</h1>
          <p className="text-sm text-muted">
            {pastoral.nome} · {inicio ? `desde ${format(paraExibicao(inicio), "dd/MM/yyyy")}` : "todo o histórico"} · só
            missas que já aconteceram
          </p>
        </div>
        <nav className="flex flex-wrap gap-1 rounded-lg border border-line bg-surface p-1 text-sm">
          {PERIODOS.map((p) => (
            <Link
              key={p.chave}
              href={`/admin/absenteismo?periodo=${p.chave}`}
              className={
                p.chave === periodo.chave
                  ? "rounded-md bg-accent-soft px-3 py-1 font-medium text-accent"
                  : "rounded-md px-3 py-1 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
              }
            >
              {p.rotulo}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((card, index) => (
          <div
            key={card.rotulo}
            style={{ animationDelay: `${index * 60}ms` }}
            className="animate-fade-in rounded-xl border border-line bg-surface p-5"
          >
            <p className={`text-3xl font-semibold tabular-nums tracking-tight ${card.destaque}`}>{card.valor}</p>
            <p className="mt-1 text-sm text-muted">{card.rotulo}</p>
          </div>
        ))}
      </div>

      {pendentes > 0 ? (
        <p className="-mt-5 mb-8 text-xs text-muted">
          {pendentes} {pendentes === 1 ? "escalação já passou" : "escalações já passaram"} sem presença registrada e não{" "}
          {pendentes === 1 ? "entra" : "entram"} na conta — registre em{" "}
          <Link href="/admin/calendario" className="text-accent hover:text-accent-hover">
            Calendário
          </Link>
          .
        </p>
      ) : null}

      {meses.length > 1 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-subtle">Por mês</h2>
          <ul className="space-y-2 rounded-xl border border-line bg-surface p-4">
            {meses.map(([chave, mes]) => {
              const total = mes.presencas + mes.faltas;
              const taxa = total > 0 ? mes.faltas / total : 0;
              const [ano, numeroMes] = chave.split("-").map(Number);
              const rotulo = format(new Date(ano, numeroMes - 1, 1), "MMM/yy", { locale: ptBR });
              return (
                <li key={chave} className="flex items-center gap-3 text-sm">
                  <span className="w-14 shrink-0 capitalize text-muted">{rotulo}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <span
                      className={`block h-full rounded-full ${taxa > limiteAlto ? "bg-danger" : "bg-accent"}`}
                      style={{ width: `${Math.max(taxa * 100, taxa > 0 ? 2 : 0)}%` }}
                    />
                  </span>
                  <span className="w-12 shrink-0 text-right font-medium tabular-nums text-fg">{pct(taxa)}</span>
                  <span className="hidden w-28 shrink-0 text-right text-xs tabular-nums text-subtle sm:block">
                    {mes.faltas} de {total} escalações
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-subtle">Por servidor</h2>
        <DataTable
          vazio="Nenhuma escalação com presença registrada neste período."
          ordemPadrao={{ chave: "absenteismo", direcao: "desc" }}
          colunas={[
            { chave: "nome", titulo: "Nome", ordenavel: true },
            { chave: "escalado", titulo: "Registradas", ordenavel: true, alinhar: "right" },
            { chave: "presencas", titulo: "Presenças", ordenavel: true, alinhar: "right" },
            { chave: "faltas", titulo: "Faltas", ordenavel: true, alinhar: "right" },
            { chave: "absenteismo", titulo: "Absenteísmo", ordenavel: true, alinhar: "right" },
            { chave: "seguidas", titulo: "Faltas seguidas", ordenavel: true, alinhar: "right" },
            { chave: "ultima", titulo: "Última falta", ordenavel: true },
            { chave: "contato", titulo: "Contato" },
          ]}
          linhas={[...resumos.entries()]
            .filter(([, r]) => r.presencas + r.faltas > 0)
            .map(([servidorId, r]) => {
              const servidor = servidores.get(servidorId);
              const total = r.presencas + r.faltas;
              const taxa = r.faltas / total;
              const alto = total >= MINIMO_REGISTROS_FREQUENCIA && taxa > limiteAlto;
              return {
                id: servidorId,
                valores: {
                  nome: servidor?.nome ?? null,
                  escalado: total,
                  presencas: r.presencas,
                  faltas: r.faltas,
                  absenteismo: taxa,
                  seguidas: r.faltasSeguidas,
                  ultima: r.ultimaFalta?.getTime() ?? null,
                },
                celulas: {
                  nome: servidor ? (
                    <Link
                      href={`/admin/servidores/${servidorId}`}
                      className="flex items-center gap-2 font-medium text-fg transition-colors hover:text-accent"
                    >
                      {servidor.nome}
                      {servidor.ativo ? null : <Badge>inativo</Badge>}
                    </Link>
                  ) : (
                    <span className="text-subtle">—</span>
                  ),
                  escalado: <span className="tabular-nums text-muted">{total}</span>,
                  presencas: <span className="tabular-nums text-muted">{r.presencas}</span>,
                  faltas: (
                    <span className={`tabular-nums ${r.faltas > 0 ? "text-fg" : "text-subtle"}`}>{r.faltas}</span>
                  ),
                  absenteismo: alto ? (
                    <Badge color="red">{pct(taxa)}</Badge>
                  ) : (
                    <span className="tabular-nums text-muted">{pct(taxa)}</span>
                  ),
                  seguidas:
                    r.faltasSeguidas >= 2 ? (
                      <Badge color="yellow">{r.faltasSeguidas}</Badge>
                    ) : (
                      <span className="tabular-nums text-subtle">{r.faltasSeguidas}</span>
                    ),
                  ultima: r.ultimaFalta ? (
                    <span className="whitespace-nowrap tabular-nums text-muted">
                      {format(paraExibicao(r.ultimaFalta), "dd/MM/yyyy")}
                    </span>
                  ) : (
                    <span className="text-subtle">—</span>
                  ),
                  contato: <TelefoneLink digitos={servidor?.celularResponsavel ?? servidor?.celular ?? null} />,
                },
              };
            })}
        />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-subtle">Faltas no período</h2>
        <DataTable
          prefixo="f_"
          vazio="Nenhuma falta registrada neste período."
          ordemPadrao={{ chave: "data", direcao: "desc" }}
          colunas={[
            { chave: "data", titulo: "Missa", ordenavel: true },
            { chave: "comunidade", titulo: "Comunidade", ordenavel: true },
            { chave: "servidor", titulo: "Servidor", ordenavel: true },
            { chave: "funcao", titulo: "Função", ordenavel: true },
          ]}
          linhas={faltasDoPeriodo.map((r) => ({
            id: r.id,
            valores: {
              data: r.data.getTime(),
              comunidade: r.ocorrencia.missa?.comunidade ?? null,
              servidor: nomeDe(r),
              funcao: r.funcao?.nome ?? null,
            },
            celulas: {
              data: (
                <span className="whitespace-nowrap tabular-nums text-fg">
                  {format(paraExibicao(r.data), "EEE dd/MM/yyyy HH:mm", { locale: ptBR })}
                </span>
              ),
              comunidade: <span className="text-muted">{r.ocorrencia.missa?.comunidade ?? "—"}</span>,
              servidor: <span className="font-medium text-fg">{nomeDe(r)}</span>,
              funcao: <span className="text-muted">{r.funcao?.nome ?? "Todos"}</span>,
            },
          }))}
        />
      </section>

      <p className="mt-6 text-xs leading-relaxed text-subtle">
        Absenteísmo = faltas ÷ escalações com presença registrada. Em vermelho: acima de {pct(limiteAlto)} com pelo menos{" "}
        {MINIMO_REGISTROS_FREQUENCIA} registros no período. No sorteio da escala, quem tem presença abaixo de{" "}
        {pct(LIMIAR_FREQUENCIA)} no histórico todo perde prioridade.
      </p>
    </div>
  );
}
