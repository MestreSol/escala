import Link from "next/link";
import { headers } from "next/headers";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { Marca } from "@/components/ui/Marca";
import { EscalaPublica, type MissaPublica } from "@/components/EscalaPublica";
import { agoraNaParoquia } from "@/lib/occurrences";
import {
  chaveDaSemana,
  chaveDoPeriodoDeHoje,
  chaveValidaParaModo,
  ehChaveDeSemana,
  periodoDaChave,
  rotuloDoPeriodo,
} from "@/lib/periodoEscala";
import { buscarEscalaDoPeriodo } from "@/lib/escalaDoPeriodo";
import { listarMesesPublicados } from "@/lib/escalaPublicada";
import { pastoralPublica } from "@/lib/paroquia";
import { rotuloTodos } from "@/lib/constants";

// Escala muda a cada edição no painel — nunca deve ser congelada em build.
export const dynamic = "force-dynamic";

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Mês ("Outubro de 2026") ou semana ("Semana de 12 a 18 de outubro de 2026"). */
function nomeDoMes(chave: string) {
  return rotuloDoPeriodo(chave);
}

/** Parâmetro da URL do período: ?mes=yyyy-MM ou ?semana=yyyy-MM-dd. */
function urlDoPeriodo(chave: string) {
  return ehChaveDeSemana(chave) ? `semana=${chave}` : `mes=${chave}`;
}

export default async function EscalaPublicaPage({
  params,
  searchParams,
}: {
  params: Promise<{ paroquia: string; pastoral: string }>;
  searchParams: Promise<{ mes?: string; semana?: string }>;
}) {
  const [{ paroquia: slugParoquia, pastoral: slugPastoral }, { mes: mesDaUrl, semana: semanaDaUrl }] = await Promise.all([
    params,
    searchParams,
  ]);
  const { paroquia, pastoral } = await pastoralPublica(slugParoquia, slugPastoral);
  const base = `/${paroquia.slug}/${pastoral.slug}`;
  // Origem pública do site (ex: https://escala.vercel.app), pros links de agenda.
  const cabecalhos = await headers();
  const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host") ?? "localhost:3000";
  const protocolo = cabecalhos.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origem = `${protocolo}://${host}${base}`;
  // Pastoral semanal publica semanas (segunda-feira "yyyy-MM-dd"); mensal publica meses.
  const modo = pastoral.modoEscala;
  const publicados = (await listarMesesPublicados(pastoral.id)).filter((chave) => chaveValidaParaModo(modo, chave)); // mais recente primeiro
  const agora = agoraNaParoquia();
  const mesDeHoje = chaveDoPeriodoDeHoje(modo, agora.slice(0, 10));
  const mesParam = modo === "SEMANAL" ? (semanaDaUrl ? chaveDaSemana(semanaDaUrl) : undefined) : mesDaUrl;

  // Sem período na URL: o atual se estiver publicado; senão o próximo
  // publicado; senão o último publicado.
  const futuros = publicados.filter((m) => m >= mesDeHoje);
  const mes =
    mesParam && chaveValidaParaModo(modo, mesParam)
      ? mesParam
      : publicados.includes(mesDeHoje)
        ? mesDeHoje
        : (futuros[futuros.length - 1] ?? publicados[0]);

  const publicado = Boolean(mes) && publicados.includes(mes);
  const mesAnterior = publicados.find((m) => m < mes);
  const mesSeguinte = [...publicados].reverse().find((m) => m > mes);

  let missas: MissaPublica[] = [];
  let nomes: string[] = [];
  // nome -> id do servidor, pro link da agenda pessoal (/<paroquia>/<pastoral>/escala/calendario/<id>.ics).
  let idPorNome: Record<string, string> = {};
  if (publicado) {
    const { periodoInicio, periodoFim } = periodoDaChave(mes);
    const [ocorrencias, servidoresResult] = await Promise.all([
      buscarEscalaDoPeriodo(paroquia.id, pastoral.id, periodoInicio, periodoFim),
      supabase
        .from("Servidor")
        .select("id, nome")
        .eq("pastoralId", pastoral.id)
        .eq("ativo", true)
        .returns<{ id: string; nome: string }[]>(),
    ]);
    if (servidoresResult.error) throw servidoresResult.error;

    missas = ocorrencias.map((o) => ({
      id: o.id,
      dia: format(o.data, "yyyy-MM-dd"),
      diaRotulo: capitalizar(format(o.data, "EEEE, dd/MM", { locale: ptBR })),
      horario: format(o.data, "HH:mm"),
      inicio: format(o.data, "yyyy-MM-dd'T'HH:mm"),
      comunidade: o.comunidade,
      todosAtivos: o.todosAtivos,
      linhas: o.linhas.map((l) => ({
        funcao: `${l.funcaoNome ?? "Presença"}${l.totalSlotsDaFuncao > 1 ? ` #${l.slotIndex}` : ""}`,
        nome: l.servidorNome,
      })),
    }));

    idPorNome = Object.fromEntries((servidoresResult.data ?? []).map((s) => [s.nome, s.id]));
    nomes = [
      ...new Set([
        ...(servidoresResult.data ?? []).map((s) => s.nome),
        ...missas.flatMap((m) => m.linhas.map((l) => l.nome)).filter((n): n is string => Boolean(n)),
      ]),
    ].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-4xl animate-fade-in">
        <header className="mb-8 flex flex-col items-center text-center">
          <Marca className="mb-5" />
          <p className="text-[11px] font-medium uppercase tracking-wider text-subtle">
            Escala · {pastoral.nome} · {paroquia.nome}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            {mes ? nomeDoMes(mes) : "Escala"}
          </h1>
          {publicados.length > 0 ? (
            <nav className="mt-3 flex items-center gap-1 text-sm">
              {mesAnterior ? (
                <Link
                  href={`${base}/escala?${urlDoPeriodo(mesAnterior)}`}
                  className="rounded-md px-2 py-1 text-muted transition-colors hover:bg-surface hover:text-fg"
                >
                  ← {nomeDoMes(mesAnterior)}
                </Link>
              ) : null}
              {mesSeguinte ? (
                <Link
                  href={`${base}/escala?${urlDoPeriodo(mesSeguinte)}`}
                  className="rounded-md px-2 py-1 text-muted transition-colors hover:bg-surface hover:text-fg"
                >
                  {nomeDoMes(mesSeguinte)} →
                </Link>
              ) : null}
            </nav>
          ) : null}
        </header>

        {publicado ? (
          <EscalaPublica
            missas={missas}
            nomes={nomes}
            idPorNome={idPorNome}
            origem={origem}
            agora={agora}
            rotuloTodos={rotuloTodos(pastoral.tipo)}
          />
        ) : (
          <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-8 text-center">
            <p className="font-medium text-fg">
              {publicados.length === 0
                ? "A escala ainda não foi publicada."
                : `A escala de ${nomeDoMes(mes).toLowerCase()} ainda não foi publicada.`}
            </p>
            <p className="mt-2 text-sm text-muted">Assim que a coordenação liberar, ela aparece aqui.</p>
            {publicados.length > 0 && !publicados.includes(mes) ? (
              <Link href={`${base}/escala?${urlDoPeriodo(publicados[0])}`} className="mt-5 inline-block text-sm text-accent hover:text-accent-hover">
                Ver {nomeDoMes(publicados[0]).toLowerCase()} →
              </Link>
            ) : null}
          </div>
        )}

        <p className="mt-12 text-center text-xs text-subtle">
          Não pode servir em algum dia?{" "}
          <Link href={`${base}/indisponibilidade`} className="text-muted underline-offset-4 hover:text-fg hover:underline">
            Avise aqui
          </Link>
        </p>
      </div>
    </div>
  );
}
