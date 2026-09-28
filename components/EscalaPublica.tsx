"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export type MissaPublica = {
  id: string;
  /** "yyyy-MM-dd", pra agrupar por dia. */
  dia: string;
  diaRotulo: string;
  horario: string;
  /** "yyyy-MM-ddTHH:mm" no relógio de parede — comparável com `agora`. */
  inicio: string;
  comunidade: string;
  todosAtivos: boolean;
  linhas: { funcao: string; nome: string | null }[];
};

const CHAVE_NOME_SALVO = "escala:meu-nome";

/**
 * Escala pública do mês. O servidor pode escolher o próprio nome: as missas
 * dele ficam destacadas, aparece um resumo no topo e dá pra filtrar só as
 * dele. O nome fica na URL (?nome=) e é lembrado neste navegador.
 */
export function EscalaPublica({ missas, nomes, agora }: { missas: MissaPublica[]; nomes: string[]; agora: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nomeParam = searchParams.get("nome");
  const meuNome = nomeParam && nomes.includes(nomeParam) ? nomeParam : null;
  const [soAsMinhas, setSoAsMinhas] = useState(false);

  function definirNome(nome: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (nome) params.set("nome", nome);
    else params.delete("nome");
    const query = params.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
    try {
      if (nome) localStorage.setItem(CHAVE_NOME_SALVO, nome);
      else localStorage.removeItem(CHAVE_NOME_SALVO);
    } catch {
      // Sem storage (aba anônima etc.): só não lembra o nome da próxima vez.
    }
  }

  // Ao abrir sem ?nome, recupera o nome escolhido na última visita.
  useEffect(() => {
    if (nomeParam) return;
    try {
      const salvo = localStorage.getItem(CHAVE_NOME_SALVO);
      if (salvo && nomes.includes(salvo)) {
        const params = new URLSearchParams(window.location.search);
        params.set("nome", salvo);
        window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
      }
    } catch {
      // idem acima
    }
    // Só na montagem: depois disso quem manda é a escolha do usuário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const proximaId = missas.find((m) => m.inicio >= agora)?.id ?? null;
  const hoje = agora.slice(0, 10);

  const participa = (missa: MissaPublica) =>
    Boolean(meuNome) && (missa.todosAtivos || missa.linhas.some((l) => l.nome === meuNome));

  const minhas = useMemo(
    () =>
      meuNome
        ? missas
            .filter((m) => m.todosAtivos || m.linhas.some((l) => l.nome === meuNome))
            .map((m) => ({
              missa: m,
              funcoes: m.todosAtivos
                ? ["Todos os coroinhas"]
                : m.linhas.filter((l) => l.nome === meuNome).map((l) => l.funcao),
            }))
        : [],
    [missas, meuNome]
  );

  const visiveis = soAsMinhas && meuNome ? missas.filter(participa) : missas;
  const porDia = new Map<string, MissaPublica[]>();
  for (const missa of visiveis) {
    const lista = porDia.get(missa.dia);
    if (lista) lista.push(missa);
    else porDia.set(missa.dia, [missa]);
  }

  return (
    <div>
      <div className="mx-auto mb-8 max-w-md">
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
          Encontre seu nome
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <SearchableSelect
              key={meuNome ?? "vazio"}
              name="nome"
              defaultValue={meuNome ?? ""}
              placeholder="Digite seu nome..."
              options={nomes.map((nome) => ({ value: nome, label: nome }))}
              onValueChange={(valor) => definirNome(valor || null)}
            />
          </div>
          {meuNome ? (
            <button
              type="button"
              onClick={() => {
                definirNome(null);
                setSoAsMinhas(false);
              }}
              className="rounded-md px-3 text-sm text-muted transition-colors hover:bg-surface hover:text-fg"
            >
              Limpar
            </button>
          ) : null}
        </div>
      </div>

      {meuNome ? (
        <section className="mx-auto mb-10 max-w-md animate-fade-in rounded-2xl border border-accent/25 bg-accent-soft p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-medium text-fg">
              {minhas.length === 0
                ? "Você não está escalado(a) neste mês."
                : `Você serve em ${minhas.length} missa${minhas.length > 1 ? "s" : ""}`}
            </p>
            {minhas.length > 0 ? (
              <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-muted">
                <input type="checkbox" checked={soAsMinhas} onChange={(e) => setSoAsMinhas(e.target.checked)} />
                Só as minhas
              </label>
            ) : null}
          </div>
          {minhas.length > 0 ? (
            <ul className="mt-3 space-y-1.5 text-sm">
              {minhas.map(({ missa, funcoes }) => (
                <li
                  key={missa.id}
                  className={clsx("flex justify-between gap-3", missa.inicio < agora && "opacity-50")}
                >
                  <span className="text-muted">
                    {missa.diaRotulo} · <span className="tabular-nums text-accent">{missa.horario}</span>
                  </span>
                  <span className="text-right font-medium text-fg">{funcoes.join(" + ")}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {visiveis.length === 0 ? (
        <p className="text-center text-sm text-muted">Nenhuma missa neste mês.</p>
      ) : (
        <div className="space-y-8">
          {[...porDia.entries()].map(([dia, missasDoDia]) => (
            <section key={dia}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted">
                {missasDoDia[0].diaRotulo}
                {dia === hoje ? (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-fg">
                    Hoje
                  </span>
                ) : null}
                <span aria-hidden className="h-px flex-1 bg-line" />
              </h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {missasDoDia.map((missa) => (
                  <CartaoMissa
                    key={missa.id}
                    missa={missa}
                    meuNome={meuNome}
                    passada={missa.inicio < agora}
                    proxima={missa.id === proximaId}
                    destacada={participa(missa)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function CartaoMissa({
  missa,
  meuNome,
  passada,
  proxima,
  destacada,
}: {
  missa: MissaPublica;
  meuNome: string | null;
  passada: boolean;
  proxima: boolean;
  destacada: boolean;
}) {
  return (
    <article
      className={clsx(
        "rounded-xl border bg-surface p-4 transition-opacity",
        destacada ? "border-accent/40" : "border-line",
        passada && "opacity-55"
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tabular-nums text-accent">{missa.horario}</span>
          <span className="text-sm text-muted">{missa.comunidade}</span>
        </div>
        {proxima ? (
          <span className="flex items-center gap-1.5 rounded-full bg-ok-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ok ring-1 ring-inset ring-ok/20">
            <span aria-hidden className="size-1.5 animate-pulse-soft rounded-full bg-ok" />
            Próxima
          </span>
        ) : passada ? (
          <span className="text-[10px] uppercase tracking-wider text-subtle">Realizada</span>
        ) : null}
      </header>

      {missa.todosAtivos ? (
        <p className="py-2 text-sm font-semibold tracking-wide text-accent">TODOS OS COROINHAS</p>
      ) : missa.linhas.length === 0 ? (
        <p className="py-2 text-sm text-subtle">Escala ainda não definida.</p>
      ) : (
        <ul className="divide-y divide-line/60 text-sm">
          {missa.linhas.map((linha, index) => {
            const minha = Boolean(meuNome) && linha.nome === meuNome;
            return (
              <li
                key={index}
                className={clsx(
                  "-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-1.5",
                  minha && "bg-accent-soft"
                )}
              >
                <span className="text-muted">{linha.funcao}</span>
                {linha.nome ? (
                  <span className={clsx("text-right font-medium", minha ? "text-accent" : "text-fg")}>
                    {linha.nome}
                  </span>
                ) : (
                  <span className="text-right text-danger/80">Vaga em aberto</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
