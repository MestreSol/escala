"use client";

import { ReactNode, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";

export type DataTableColuna = {
  chave: string;
  titulo: ReactNode;
  ordenavel?: boolean;
  alinhar?: "left" | "right";
  /** Classes extras aplicadas no <th> e em cada <td> da coluna (ex: coluna fixa). */
  className?: string;
};

export type DataTableLinha = {
  id: string;
  /** Valores primitivos usados só pra ordenar (null vai sempre pro fim). */
  valores: Record<string, string | number | null>;
  /** Conteúdo já renderizado (no servidor) de cada célula, por chave de coluna. */
  celulas: Record<string, ReactNode>;
};

type Direcao = "asc" | "desc";

const OPCOES_POR_PAGINA = [10, 20, 50, 0] as const; // 0 = todos

/**
 * Tabela com ordenação e paginação no navegador. As linhas chegam prontas do
 * Server Component (células já renderizadas + valores de ordenação), então
 * ordenar/trocar de página é instantâneo, sem ida ao servidor. O estado fica
 * na URL (ordem/dir/pagina/porPagina) pra sobreviver a um reload.
 */
export function DataTable({
  colunas,
  linhas,
  ordemPadrao,
  porPaginaPadrao = 20,
  rodape,
  vazio = "Nada por aqui ainda.",
}: {
  colunas: DataTableColuna[];
  linhas: DataTableLinha[];
  ordemPadrao: { chave: string; direcao: Direcao };
  porPaginaPadrao?: number;
  /** Linha(s) de <tfoot>, fora da paginação (ex: totais gerais). */
  rodape?: ReactNode;
  vazio?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const chavesOrdenaveis = new Set([ordemPadrao.chave, ...colunas.filter((c) => c.ordenavel).map((c) => c.chave)]);
  const ordemParam = searchParams.get("ordem");
  const ordem = ordemParam && chavesOrdenaveis.has(ordemParam) ? ordemParam : ordemPadrao.chave;
  const dirParam = searchParams.get("dir");
  const direcao: Direcao =
    dirParam === "asc" || dirParam === "desc" ? dirParam : ordem === ordemPadrao.chave ? ordemPadrao.direcao : "asc";
  const porPaginaParam = Number(searchParams.get("porPagina"));
  const porPagina = OPCOES_POR_PAGINA.includes(porPaginaParam as (typeof OPCOES_POR_PAGINA)[number])
    ? porPaginaParam
    : porPaginaPadrao;

  const ordenadas = useMemo(() => {
    const fator = direcao === "asc" ? 1 : -1;
    return [...linhas].sort((a, b) => {
      const va = a.valores[ordem] ?? null;
      const vb = b.valores[ordem] ?? null;
      if (va === vb) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * fator;
      return String(va).localeCompare(String(vb), "pt-BR", { sensitivity: "base", numeric: true }) * fator;
    });
  }, [linhas, ordem, direcao]);

  const total = ordenadas.length;
  const totalPaginas = porPagina === 0 ? 1 : Math.max(1, Math.ceil(total / porPagina));
  const pagina = Math.min(Math.max(1, Number(searchParams.get("pagina")) || 1), totalPaginas);
  const inicio = porPagina === 0 ? 0 : (pagina - 1) * porPagina;
  const visiveis = porPagina === 0 ? ordenadas : ordenadas.slice(inicio, inicio + porPagina);

  function atualizarUrl(mudancas: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor === null) params.delete(chave);
      else params.set(chave, valor);
    }
    const query = params.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  }

  function ordenarPor(chave: string) {
    const novaDirecao: Direcao = chave === ordem && direcao === "asc" ? "desc" : "asc";
    atualizarUrl({ ordem: chave, dir: novaDirecao, pagina: null });
  }

  if (linhas.length === 0) {
    return <p className="text-sm text-muted">{vazio}</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead>
            <tr>
              {colunas.map((coluna) => {
                const ativa = coluna.chave === ordem;
                return (
                  <th
                    key={coluna.chave}
                    scope="col"
                    aria-sort={ativa ? (direcao === "asc" ? "ascending" : "descending") : undefined}
                    className={clsx(
                      "whitespace-nowrap bg-surface px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-subtle",
                      coluna.alinhar === "right" ? "text-right" : "text-left",
                      coluna.className
                    )}
                  >
                    {coluna.ordenavel ? (
                      <button
                        type="button"
                        onClick={() => ordenarPor(coluna.chave)}
                        className={clsx(
                          "group inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-fg",
                          coluna.alinhar === "right" && "flex-row-reverse",
                          ativa && "text-fg"
                        )}
                      >
                        {coluna.titulo}
                        <span
                          aria-hidden
                          className={clsx(
                            "w-2.5 text-center text-[10px] transition-opacity",
                            ativa ? "text-accent" : "opacity-0 group-hover:opacity-60"
                          )}
                        >
                          {ativa ? (direcao === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      </button>
                    ) : (
                      coluna.titulo
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody key={`${ordem}:${direcao}:${pagina}:${porPagina}`} className="animate-fade-in divide-y divide-line/60">
            {visiveis.map((linha) => (
              <tr key={linha.id} className="group/linha transition-colors hover:bg-surface-2/60">
                {colunas.map((coluna) => (
                  <td
                    key={coluna.chave}
                    className={clsx(
                      "px-4 py-3",
                      coluna.alinhar === "right" ? "text-right" : "text-left",
                      coluna.className
                    )}
                  >
                    {linha.celulas[coluna.chave]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {rodape ? <tfoot className="border-t border-line bg-surface-2">{rodape}</tfoot> : null}
        </table>
      </div>

      {total > Math.min(...OPCOES_POR_PAGINA.filter((n) => n > 0)) ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
          <div className="flex items-center gap-3">
            <span className="tabular-nums">
              {porPagina === 0
                ? `${total} itens`
                : `Mostrando ${inicio + 1}–${Math.min(inicio + porPagina, total)} de ${total}`}
            </span>
            <label className="flex items-center gap-1.5">
              <span className="text-subtle">Por página</span>
              <select
                value={porPagina}
                onChange={(evento) => atualizarUrl({ porPagina: evento.target.value, pagina: null })}
                className="rounded-md border border-line bg-surface px-1.5 py-1 text-xs text-fg focus:border-accent focus:outline-none"
              >
                {OPCOES_POR_PAGINA.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao === 0 ? "Todos" : opcao}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {totalPaginas > 1 ? (
            <nav aria-label="Paginação" className="flex items-center gap-1">
              <BotaoPagina
                onClick={() => atualizarUrl({ pagina: String(pagina - 1) })}
                disabled={pagina === 1}
                label="Página anterior"
              >
                ‹
              </BotaoPagina>
              {paginasVisiveis(pagina, totalPaginas).map((item, index) =>
                item === "…" ? (
                  <span key={`reticencias-${index}`} className="px-1 text-subtle">
                    …
                  </span>
                ) : (
                  <BotaoPagina
                    key={item}
                    onClick={() => atualizarUrl({ pagina: item === 1 ? null : String(item) })}
                    ativo={item === pagina}
                    label={`Página ${item}`}
                  >
                    {item}
                  </BotaoPagina>
                )
              )}
              <BotaoPagina
                onClick={() => atualizarUrl({ pagina: String(pagina + 1) })}
                disabled={pagina === totalPaginas}
                label="Próxima página"
              >
                ›
              </BotaoPagina>
            </nav>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function BotaoPagina({
  children,
  onClick,
  disabled,
  ativo,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ativo?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={ativo ? "page" : undefined}
      className={clsx(
        "flex h-7 min-w-7 items-center justify-center rounded-md px-2 tabular-nums transition-colors disabled:opacity-30",
        ativo ? "bg-accent-soft font-medium text-accent ring-1 ring-inset ring-accent/30" : "hover:bg-surface-2 hover:text-fg"
      )}
    >
      {children}
    </button>
  );
}

/** Ex: página 5 de 12 → [1, "…", 4, 5, 6, "…", 12]. */
function paginasVisiveis(atual: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const paginas = new Set([1, total, atual - 1, atual, atual + 1]);
  const ordenadas = [...paginas].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const resultado: (number | "…")[] = [];
  for (const p of ordenadas) {
    const anterior = resultado[resultado.length - 1];
    if (typeof anterior === "number" && p - anterior > 1) resultado.push("…");
    resultado.push(p);
  }
  return resultado;
}
