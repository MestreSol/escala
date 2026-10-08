import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { pastoralDoPainel } from "@/lib/sessao";
import { EscolherServidor } from "@/components/EscolherServidor";
import { CalendarioIndisponibilidade, type DiaCalendario } from "@/components/CalendarioIndisponibilidade";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { diaChave } from "@/lib/scheduleGenerator";
import { agoraNaParoquia, formatarDiaMissa, lerDataArmazenada, paraExibicao, periodoDoMes } from "@/lib/occurrences";
import { getDatasIndisponiveisDoServidor } from "@/lib/servidorIndisponibilidade";
import { materializarOcorrencias } from "@/lib/materializarOcorrencias";
import { somarMeses } from "@/lib/escalaPublicada";
import { getMissasDaPastoral, listarMissasDePreferencia } from "@/lib/missaPastoral";
import { salvarDiasIndisponiveis, salvarMissasDoServidor } from "./actions";

export const dynamic = "force-dynamic";

const CAMINHO = "/admin/disponibilidade";

export default async function DisponibilidadePage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; servidorId?: string }>;
}) {
  const { mes: mesParam, servidorId: servidorIdParam } = await searchParams;
  const { paroquia, pastoral } = await pastoralDoPainel();

  const hoje = agoraNaParoquia().slice(0, 10);
  const mesMinimo = hoje.slice(0, 7);
  const mes = mesParam && /^\d{4}-\d{2}$/.test(mesParam) && mesParam >= mesMinimo ? mesParam : mesMinimo;
  const { periodoInicio, periodoFim } = periodoDoMes(mes);

  const { data: servidoresData, error: servidoresError } = await supabase
    .from("Servidor")
    .select("id, nome")
    .eq("pastoralId", pastoral.id)
    .eq("ativo", true)
    .order("nome", { ascending: true })
    .returns<{ id: string; nome: string }[]>();
  if (servidoresError) throw servidoresError;
  const servidores = servidoresData ?? [];
  const servidor = servidores.find((s) => s.id === servidorIdParam) ?? null;

  const seletor = (
    <div className="mb-6 max-w-md">
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">Servidor</label>
      <EscolherServidor
        servidores={servidores}
        servidorId={servidor?.id ?? null}
        mes={mes}
        caminho={CAMINHO}
        placeholder="Digite o nome..."
      />
    </div>
  );

  const cabecalho = (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Disponibilidade</h1>
      <p className="text-sm text-muted">
        Em quais missas cada pessoa pode servir e em quais dias ela não pode. A escala gerada respeita as duas coisas.
      </p>
    </div>
  );

  if (!servidor) {
    return (
      <div>
        {cabecalho}
        {seletor}
        {servidores.length === 0 ? <p className="text-sm text-muted">Nenhum servidor ativo cadastrado.</p> : null}
      </div>
    );
  }

  await materializarOcorrencias(paroquia.id, periodoInicio, periodoFim);

  const [missas, missasDaPastoral, preferenciasResult, ocorrenciasResult, escaladoResult, datasIndisponiveis] =
    await Promise.all([
      listarMissasDePreferencia(paroquia.id, pastoral.id),
      getMissasDaPastoral(pastoral.id),
      supabase
        .from("ServidorMissaPreferencia")
        .select("missaId")
        .eq("servidorId", servidor.id)
        .returns<{ missaId: string }[]>(),
      supabase
        .from("MissaOcorrencia")
        .select("missaId, data")
        .eq("paroquiaId", paroquia.id)
        .gte("data", periodoInicio.toISOString())
        .lte("data", periodoFim.toISOString())
        .returns<{ missaId: string; data: string }[]>(),
      supabase
        .from("EscalaAtribuicao")
        .select("ocorrencia:MissaOcorrencia!inner(data)")
        .eq("servidorId", servidor.id)
        .eq("pastoralId", pastoral.id)
        .gte("ocorrencia.data", periodoInicio.toISOString())
        .lte("ocorrencia.data", periodoFim.toISOString())
        .returns<{ ocorrencia: { data: string } }[]>(),
      getDatasIndisponiveisDoServidor(servidor.id, periodoInicio, periodoFim),
    ]);
  if (preferenciasResult.error) throw preferenciasResult.error;
  if (ocorrenciasResult.error) throw ocorrenciasResult.error;
  if (escaladoResult.error) throw escaladoResult.error;

  const preferidas = new Set((preferenciasResult.data ?? []).map((p) => p.missaId));

  const horariosPorDia = new Map<number, string[]>();
  for (const ocorrencia of ocorrenciasResult.data ?? []) {
    if (!missasDaPastoral.has(ocorrencia.missaId)) continue;
    const ancora = lerDataArmazenada(ocorrencia.data);
    const horario = `${String(ancora.getUTCHours()).padStart(2, "0")}:${String(ancora.getUTCMinutes()).padStart(2, "0")}`;
    const lista = horariosPorDia.get(ancora.getUTCDate()) ?? [];
    if (!lista.includes(horario)) lista.push(horario);
    horariosPorDia.set(ancora.getUTCDate(), lista.sort());
  }

  const ano = periodoInicio.getUTCFullYear();
  const mesIndice = periodoInicio.getUTCMonth();
  const dias: DiaCalendario[] = Array.from({ length: periodoFim.getUTCDate() }, (_, i) => {
    const ancora = new Date(Date.UTC(ano, mesIndice, i + 1));
    return {
      numero: i + 1,
      chave: ancora.toISOString().slice(0, 10),
      valor: ancora.toISOString(),
      horarios: horariosPorDia.get(i + 1) ?? [],
      marcadoInicialmente: datasIndisponiveis.has(diaChave(ancora)),
    };
  });

  const diasEscalado = [
    ...new Set(
      (escaladoResult.data ?? [])
        .map((a) => lerDataArmazenada(a.ocorrencia.data))
        .filter((data) => data.toISOString().slice(0, 10) >= hoje)
        .sort((a, b) => a.getTime() - b.getTime())
        .map((data) => format(paraExibicao(data), "dd/MM"))
    ),
  ];

  const mesLabel = format(paraExibicao(periodoInicio), "MMMM 'de' yyyy", { locale: ptBR });
  const mesAnterior = mes > mesMinimo ? somarMeses(mes, -1) : null;
  const link = (novoMes: string) => `${CAMINHO}?mes=${novoMes}&servidorId=${servidor.id}`;

  return (
    <div>
      {cabecalho}
      {seletor}

      <div key={servidor.id} className="grid animate-fade-in gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="text-base font-semibold text-fg">Missas em que pode servir</h2>
          <p className="mb-4 text-sm text-muted">
            A escala só sorteia {servidor.nome} nas missas marcadas aqui.
          </p>
          {missas.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma missa com vaga por função cadastrada.</p>
          ) : (
            <ActionForm
              action={salvarMissasDoServidor.bind(null, servidor.id)}
              successMessage="Missas salvas."
              className="space-y-4"
            >
              <div className="space-y-2">
                {missas.map((missa) => (
                  <label
                    key={missa.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-surface-2/40 px-4 py-2.5 text-sm transition-colors hover:border-accent/50 has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
                  >
                    <input
                      type="checkbox"
                      name="missaIds"
                      value={missa.id}
                      defaultChecked={preferidas.has(missa.id)}
                      className="h-4 w-4 rounded border-line-strong text-accent focus:ring-accent/40"
                    />
                    <span>
                      <span className="font-medium text-fg">
                        {formatarDiaMissa(missa)} às {missa.horario}
                      </span>
                      <span className="text-muted"> — {missa.comunidade}</span>
                    </span>
                  </label>
                ))}
              </div>
              <SubmitButton pendingLabel="Salvando">Salvar missas</SubmitButton>
            </ActionForm>
          )}
        </section>

        <section className="rounded-xl border border-line bg-surface p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-base font-semibold text-fg">Dias em que não pode</h2>
            <div className="flex items-center gap-1">
              {mesAnterior ? (
                <Link
                  href={link(mesAnterior)}
                  aria-label="Mês anterior"
                  className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                >
                  ←
                </Link>
              ) : (
                <span aria-hidden className="size-8" />
              )}
              <span className="min-w-32 text-center text-sm font-medium capitalize text-fg">{mesLabel}</span>
              <Link
                href={link(somarMeses(mes, 1))}
                aria-label="Próximo mês"
                className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                →
              </Link>
            </div>
          </div>
          <p className="mb-4 text-sm text-muted">
            Inclui os dias que a própria pessoa avisou pela página pública.
          </p>

          <ActionForm
            key={`${servidor.id}:${mes}:${[...datasIndisponiveis].sort().join(",")}`}
            action={salvarDiasIndisponiveis.bind(null, servidor.id, mes)}
            successMessage="Dias salvos."
          >
            <CalendarioIndisponibilidade
              dias={dias}
              primeiroDiaDaSemana={periodoInicio.getUTCDay()}
              hoje={hoje}
              paraAdmin
            />
          </ActionForm>

          {diasEscalado.length > 0 ? (
            <p className="mt-4 rounded-md border border-line bg-surface-2 px-3 py-2 text-xs text-muted">
              Já está na escala deste mês em {diasEscalado.join(", ")}. Marcar um desses dias não tira a pessoa da
              escala já gerada: ajuste a missa no{" "}
              <Link href="/admin/calendario" className="text-accent hover:text-accent-hover">
                Calendário
              </Link>
              .
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
