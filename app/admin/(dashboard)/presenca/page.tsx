import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { obterUsuarioAtual, pastoralDaPresenca } from "@/lib/sessao";
import { PresencaSelect } from "@/components/admin/PresencaSelect";
import { EditarContatoModal } from "@/components/admin/EditarContatoModal";
import { ChamadaTodos, type ItemChamada } from "@/components/admin/ChamadaTodos";
import { getConfigMissasMap } from "@/lib/missaPastoral";
import { materializarOcorrencias } from "@/lib/materializarOcorrencias";
import { formatarTelefone } from "@/lib/telefone";
import { intervaloDeHojeNaParoquia, lerDataArmazenada, paraExibicao } from "@/lib/occurrences";
import type { EscalaAtribuicaoRow, FuncaoRow, MissaOcorrenciaRow, MissaRow, ServidorRow } from "@/lib/types";
import { registrarPresencaTodosAtivos, salvarChamadaTodos } from "../calendario/actions";
import { salvarContatos, salvarFoto } from "../contatos/actions";

export const dynamic = "force-dynamic";

type ServidorDaChamada = Pick<ServidorRow, "id" | "nome" | "fotoUrl" | "celular" | "celularResponsavel">;

type OcorrenciaDoDia = MissaOcorrenciaRow & {
  missa: Pick<MissaRow, "horario" | "comunidade">;
  atribuicoes: (EscalaAtribuicaoRow & {
    servidor: Pick<ServidorRow, "nome" | "fotoUrl" | "celular" | "celularResponsavel"> | null;
    funcao: Pick<FuncaoRow, "nome"> | null;
  })[];
};

export default async function PresencaDoDiaPage() {
  const { paroquia, pastoral } = await pastoralDaPresenca();
  const usuario = await obterUsuarioAtual();
  const podeCorrigir = usuario?.papel === "ADMIN" || usuario?.papel === "SUPERADMIN";
  const { inicio, fim } = intervaloDeHojeNaParoquia();
  await materializarOcorrencias(paroquia.id, inicio, fim);

  const [configs, servidoresResult, indisponiveisResult] = await Promise.all([
    getConfigMissasMap(pastoral.id),
    supabase
      .from("Servidor")
      .select("id, nome, fotoUrl, celular, celularResponsavel")
      .eq("pastoralId", pastoral.id)
      .eq("ativo", true)
      .returns<ServidorDaChamada[]>(),
    supabase
      .from("ServidorIndisponibilidade")
      .select("servidorId, servidor:Servidor!inner(pastoralId)")
      .eq("servidor.pastoralId", pastoral.id)
      .gte("data", inicio.toISOString())
      .lte("data", fim.toISOString())
      .returns<{ servidorId: string }[]>(),
  ]);
  if (servidoresResult.error) throw servidoresResult.error;
  if (indisponiveisResult.error) throw indisponiveisResult.error;
  const servidoresAtivos = servidoresResult.data ?? [];
  const avisaramHoje = new Set((indisponiveisResult.data ?? []).map((i) => i.servidorId));

  const { data, error } = await supabase
    .from("MissaOcorrencia")
    .select("*, missa:Missa(horario, comunidade), atribuicoes:EscalaAtribuicao(*, servidor:Servidor(nome, fotoUrl, celular, celularResponsavel), funcao:Funcao(nome))")
    .eq("paroquiaId", paroquia.id)
    .gte("data", inicio.toISOString())
    .lte("data", fim.toISOString())
    .order("data", { ascending: true })
    .returns<OcorrenciaDoDia[]>();
  if (error) throw error;

  // A ocorrência é da paróquia; aqui só entram as atribuições desta pastoral com alguém escalado.
  const ocorrencias = (data ?? [])
    .map((ocorrencia) => ({
      ...ocorrencia,
      todos: Boolean(configs.get(ocorrencia.missaId)?.escalarTodosAtivos),
      atribuicoes: ocorrencia.atribuicoes
        .filter((a) => a.pastoralId === pastoral.id && a.servidorId)
        .sort(
          (a, b) =>
            (a.funcao?.nome ?? "").localeCompare(b.funcao?.nome ?? "") ||
            a.slotIndex - b.slotIndex ||
            (a.servidorNomeSnapshot ?? a.servidor?.nome ?? "").localeCompare(b.servidorNomeSnapshot ?? b.servidor?.nome ?? "")
        ),
    }))
    .filter((ocorrencia) => ocorrencia.todos || ocorrencia.atribuicoes.length > 0);

  // Missa "todos": a chamada é todo servidor ativo, mais quem já estava na lista dela.
  function itensDaChamada(ocorrencia: (typeof ocorrencias)[number]): ItemChamada[] {
    const linhas = new Map(
      ocorrencia.atribuicoes.filter((a) => a.funcaoId === null).map((a) => [a.servidorId!, a])
    );
    const pessoas = new Map<string, ServidorDaChamada>(servidoresAtivos.map((s) => [s.id, s]));
    for (const [servidorId, linha] of linhas) {
      if (!pessoas.has(servidorId) && linha.servidor) pessoas.set(servidorId, { id: servidorId, ...linha.servidor });
    }
    return [...pessoas.values()]
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .map((servidor) => {
        const presenteSalvo = linhas.get(servidor.id)?.presente ?? null;
        return {
          servidorId: servidor.id,
          nome: servidor.nome,
          fotoUrl: servidor.fotoUrl,
          presenteSalvo,
          travado: presenteSalvo === true && !podeCorrigir,
          avisouIndisponivel: avisaramHoje.has(servidor.id),
          editar: (
            <EditarContatoModal
              nome={servidor.nome}
              fotoUrl={servidor.fotoUrl}
              celular={formatarTelefone(servidor.celular)}
              celularResponsavel={formatarTelefone(servidor.celularResponsavel)}
              salvarContatos={salvarContatos.bind(null, servidor.id)}
              salvarFoto={salvarFoto.bind(null, servidor.id)}
            />
          ),
        };
      });
  }

  const hoje = format(paraExibicao(inicio), "eeee, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="max-w-2xl">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-subtle">
        {paroquia.nome} · {pastoral.nome}
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Presença do dia</h1>
      <p className="mb-6 text-sm text-muted capitalize">{hoje}</p>

      {ocorrencias.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma missa com servidores escalados hoje.</p>
      ) : (
        <div className="space-y-6">
          {ocorrencias.map((ocorrencia) => (
            <section key={ocorrencia.id} className="rounded-xl border border-line bg-surface">
              <header className="border-b border-line px-4 py-3">
                <h2 className="text-base font-semibold text-fg">
                  {format(paraExibicao(lerDataArmazenada(ocorrencia.data)), "HH:mm")} — {ocorrencia.missa.comunidade}
                </h2>
                {ocorrencia.todos ? <p className="text-xs text-accent">Todos os {pastoral.nome.toLowerCase()}</p> : null}
              </header>
              {ocorrencia.todos ? (
                <ChamadaTodos
                  key={ocorrencia.atribuicoes.map((a) => `${a.servidorId}:${a.presente}`).join(",")}
                  itens={itensDaChamada(ocorrencia)}
                  salvar={salvarChamadaTodos.bind(null, ocorrencia.id)}
                />
              ) : (
              <ul className="divide-y divide-line/60">
                {ocorrencia.atribuicoes.map((atribuicao) => {
                  const salvarPresenca = registrarPresencaTodosAtivos.bind(null, ocorrencia.id, atribuicao.id);
                  return (
                    <li key={atribuicao.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {atribuicao.servidor?.fotoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={atribuicao.servidor.fotoUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                        ) : (
                          <span
                            aria-hidden
                            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs text-muted"
                          >
                            {(atribuicao.servidorNomeSnapshot ?? atribuicao.servidor?.nome ?? "?").charAt(0)}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-fg">
                            {atribuicao.servidorNomeSnapshot ?? atribuicao.servidor?.nome ?? "—"}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted">
                            {atribuicao.funcao ? <span>{atribuicao.funcao.nome}</span> : null}
                            {atribuicao.servidor && atribuicao.servidorId ? (
                              <EditarContatoModal
                                nome={atribuicao.servidor.nome}
                                fotoUrl={atribuicao.servidor.fotoUrl}
                                celular={formatarTelefone(atribuicao.servidor.celular)}
                                celularResponsavel={formatarTelefone(atribuicao.servidor.celularResponsavel)}
                                salvarContatos={salvarContatos.bind(null, atribuicao.servidorId)}
                                salvarFoto={salvarFoto.bind(null, atribuicao.servidorId)}
                              />
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <PresencaSelect action={salvarPresenca} defaultValue={atribuicao.presente} podeCorrigir={podeCorrigir} />
                    </li>
                  );
                })}
              </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
