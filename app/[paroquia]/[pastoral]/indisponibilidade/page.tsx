import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { Marca } from "@/components/ui/Marca";
import { EscolherServidor } from "@/components/EscolherServidor";
import { CalendarioIndisponibilidade, type DiaCalendario } from "@/components/CalendarioIndisponibilidade";
import { diaChave } from "@/lib/scheduleGenerator";
import { periodoDoMes, paraExibicao, lerDataArmazenada, agoraNaParoquia } from "@/lib/occurrences";
import { getDatasIndisponiveisDoServidor } from "@/lib/servidorIndisponibilidade";
import { materializarOcorrencias } from "@/lib/materializarOcorrencias";
import { listarMesesPublicados, primeiroMesAberto, somarMeses } from "@/lib/escalaPublicada";
import { pastoralPublica } from "@/lib/paroquia";
import { getMissasDaPastoral } from "@/lib/missaPastoral";
import { salvarIndisponibilidade } from "./actions";

// Lista de missas e disponibilidade vêm do banco e mudam com o tempo — nunca deve ser congelada em build.
export const dynamic = "force-dynamic";

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "2026-09" → "setembro". */
function nomeDoMes(mes: string) {
  return format(paraExibicao(periodoDoMes(mes).periodoInicio), "MMMM", { locale: ptBR });
}

export default async function IndisponibilidadePage({
  params,
  searchParams,
}: {
  params: Promise<{ paroquia: string; pastoral: string }>;
  searchParams: Promise<{ mes?: string; servidorId?: string; salvo?: string }>;
}) {
  const [{ paroquia: slugParoquia, pastoral: slugPastoral }, { mes: mesParam, servidorId: servidorIdParam, salvo }] = await Promise.all([
    params,
    searchParams,
  ]);
  const { paroquia, pastoral } = await pastoralPublica(slugParoquia, slugPastoral);
  const pagina = `/${paroquia.slug}/${pastoral.slug}/indisponibilidade`;

  // Só dá pra avisar a partir do mês seguinte ao último com escala fechada
  // (ver primeiroMesAberto): pedir um mês fechado/passado cai no primeiro aberto.
  const mesMinimo = await primeiroMesAberto(pastoral.id);
  const mes = mesParam && /^\d{4}-\d{2}$/.test(mesParam) && mesParam >= mesMinimo ? mesParam : mesMinimo;
  const { periodoInicio, periodoFim } = periodoDoMes(mes);
  const ultimoMesFechado = somarMeses(mesMinimo, -1);
  const temMesFechado = (await listarMesesPublicados(pastoral.id)).includes(ultimoMesFechado);

  await materializarOcorrencias(paroquia.id, periodoInicio, periodoFim);

  const [servidoresResult, ocorrenciasResult, missasDaPastoral] = await Promise.all([
    supabase
      .from("Servidor")
      .select("id, nome")
      .eq("pastoralId", pastoral.id)
      .eq("ativo", true)
      .order("nome", { ascending: true })
      .returns<{ id: string; nome: string }[]>(),
    supabase
      .from("MissaOcorrencia")
      .select("missaId, data")
      .eq("paroquiaId", paroquia.id)
      .gte("data", periodoInicio.toISOString())
      .lte("data", periodoFim.toISOString())
      .returns<{ missaId: string; data: string }[]>(),
    getMissasDaPastoral(pastoral.id),
  ]);
  if (servidoresResult.error) throw servidoresResult.error;
  if (ocorrenciasResult.error) throw ocorrenciasResult.error;

  const servidores = servidoresResult.data ?? [];
  // O id vem da URL: só vale servidor desta pastoral (senão daria pra ver os
  // dias de alguém de outra pastoral trocando o id).
  const servidorId = servidores.some((s) => s.id === servidorIdParam) ? servidorIdParam : undefined;

  // Horários das missas de cada dia civil do mês. A indisponibilidade é por
  // dia, não por missa (9h30 e 18h no mesmo domingo = um único "não vou").
  const horariosPorDia = new Map<number, string[]>();
  for (const ocorrencia of ocorrenciasResult.data ?? []) {
    if (!missasDaPastoral.has(ocorrencia.missaId)) continue;
    const dataAncora = lerDataArmazenada(ocorrencia.data);
    const horario = `${String(dataAncora.getUTCHours()).padStart(2, "0")}:${String(dataAncora.getUTCMinutes()).padStart(2, "0")}`;
    const lista = horariosPorDia.get(dataAncora.getUTCDate()) ?? [];
    if (!lista.includes(horario)) lista.push(horario);
    horariosPorDia.set(dataAncora.getUTCDate(), lista.sort());
  }

  const datasIndisponiveis = servidorId
    ? await getDatasIndisponiveisDoServidor(servidorId, periodoInicio, periodoFim)
    : new Set<string>();

  const mesReferencia = paraExibicao(periodoInicio);
  const mesAtualParam = mes;
  const mesAnterior = mes > mesMinimo ? somarMeses(mes, -1) : null;
  const proximoMes = somarMeses(mes, 1);
  const mesAtualLabel = capitalizar(format(mesReferencia, "MMMM 'de' yyyy", { locale: ptBR }));

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
  const hoje = agoraNaParoquia().slice(0, 10);

  const linkComServidor = (novoMes: string) =>
    `${pagina}?mes=${novoMes}${servidorId ? `&servidorId=${servidorId}` : ""}`;

  const salvar = salvarIndisponibilidade.bind(null, paroquia.slug, pastoral.slug, servidorId ?? "", mesAtualParam);

  return (
    <div className="min-h-screen bg-bg px-4 py-12 sm:py-20">
      <div className="mx-auto max-w-lg animate-fade-in">
        <Marca className="mb-6" />
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-fg">Avisar indisponibilidade</h1>
        <p className="mb-8 text-sm text-muted">
          Escolha seu nome e toque nos dias em que você <strong className="text-fg">não</strong> vai poder
          servir. Nos outros dias você continua disponível normalmente.
        </p>

        <div className="mb-6">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">Seu nome</label>
          <EscolherServidor
            servidores={servidores}
            servidorId={servidorId ?? null}
            mes={mesAtualParam}
            caminho={pagina}
          />
        </div>

        {servidorId ? (
          <div key={`${servidorId}:${mesAtualParam}`} className="animate-fade-in rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              {mesAnterior ? (
                <Link
                  href={linkComServidor(mesAnterior)}
                  aria-label="Mês anterior"
                  className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                >
                  ←
                </Link>
              ) : (
                <span aria-hidden className="size-8" />
              )}
              <h2 className="text-base font-semibold text-fg">{mesAtualLabel}</h2>
              <Link
                href={linkComServidor(proximoMes)}
                aria-label="Próximo mês"
                className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                →
              </Link>
            </div>

            {temMesFechado && mes === mesMinimo ? (
              <p className="mb-4 rounded-md border border-line bg-surface-2 px-3 py-2 text-xs text-muted">
                A escala de {nomeDoMes(ultimoMesFechado)} já foi fechada — os avisos agora valem a partir de{" "}
                {nomeDoMes(mesMinimo)}.
              </p>
            ) : null}

            {salvo === "1" && (
              <p className="mb-4 animate-fade-in rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">
                Salvo! Seus dias desse mês estão atualizados.
              </p>
            )}

            <form action={salvar}>
              <CalendarioIndisponibilidade
                dias={dias}
                primeiroDiaDaSemana={periodoInicio.getUTCDay()}
                hoje={hoje}
              />
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
