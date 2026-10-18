"use client";

import { ReactNode, useState, useTransition } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { executarComToast } from "@/components/ui/ActionForm";
import type { ResultadoAcao } from "@/lib/avisos";

export type ItemChamada = {
  servidorId: string;
  nome: string;
  fotoUrl: string | null;
  /** O que está gravado: null = chamada ainda não salva pra essa pessoa. */
  presenteSalvo: boolean | null;
  /** Presença já confirmada que este usuário não pode desfazer. */
  travado: boolean;
  avisouIndisponivel: boolean;
  /** Botão de editar foto/telefones (ver EditarContatoModal). */
  editar?: ReactNode;
};

/**
 * Chamada das missas "todos os coroinhas": aparece todo mundo, começando com
 * falta. Marca quem veio e salva — quem ficou desmarcado vira falta na hora
 * (ver salvarChamadaTodos).
 */
export function ChamadaTodos({
  itens,
  salvar,
}: {
  itens: ItemChamada[];
  salvar: (formData: FormData) => Promise<ResultadoAcao>;
}) {
  const [presentes, setPresentes] = useState(
    () => new Set(itens.filter((i) => i.presenteSalvo === true).map((i) => i.servidorId))
  );
  const [salvando, startTransition] = useTransition();
  const chamadaSalva = itens.some((i) => i.presenteSalvo !== null);
  const mudou = itens.some((i) => (i.presenteSalvo === true) !== presentes.has(i.servidorId));
  const livres = itens.filter((i) => !i.travado);

  function alternar(servidorId: string) {
    setPresentes((atual) => {
      const novo = new Set(atual);
      if (novo.has(servidorId)) novo.delete(servidorId);
      else novo.add(servidorId);
      return novo;
    });
  }

  function enviar() {
    const formData = new FormData();
    for (const id of presentes) formData.append("presentes", id);
    startTransition(async () => {
      await executarComToast(() => salvar(formData), "Chamada salva.", "Não foi possível salvar a chamada.");
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5 text-xs">
        <span className="text-muted">
          <span className="font-medium text-ok">{presentes.size} presentes</span> ·{" "}
          <span className="font-medium text-danger">{itens.length - presentes.size} faltas</span>
          {chamadaSalva ? null : <span className="text-subtle"> · chamada ainda não salva</span>}
        </span>
        <button
          type="button"
          onClick={() =>
            setPresentes((atual) => {
              const todosMarcados = livres.every((i) => atual.has(i.servidorId));
              const novo = new Set(atual);
              for (const i of livres) {
                if (todosMarcados) novo.delete(i.servidorId);
                else novo.add(i.servidorId);
              }
              return novo;
            })
          }
          className="font-medium text-muted transition-colors hover:text-accent"
        >
          {livres.every((i) => presentes.has(i.servidorId)) ? "Desmarcar todos" : "Marcar todos"}
        </button>
      </div>

      <ul className="divide-y divide-line/60">
        {itens.map((item) => {
          const presente = presentes.has(item.servidorId);
          return (
            <li key={item.servidorId} className="flex items-center gap-3 px-4 py-2.5">
              <label
                className={clsx(
                  "flex min-w-0 flex-1 items-center gap-3",
                  item.travado ? "cursor-not-allowed" : "cursor-pointer"
                )}
              >
                <input
                  type="checkbox"
                  checked={presente}
                  disabled={item.travado || salvando}
                  onChange={() => alternar(item.servidorId)}
                  className="size-5 shrink-0 rounded border-line-strong accent-[var(--color-ok)]"
                />
                {item.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.fotoUrl} alt="" className="size-8 shrink-0 rounded-full object-cover" />
                ) : (
                  <span
                    aria-hidden
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs text-muted"
                  >
                    {item.nome.charAt(0)}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-fg">{item.nome}</span>
                  {item.avisouIndisponivel ? (
                    <span className="block text-[11px] text-warn">Avisou que não poderia vir</span>
                  ) : null}
                </span>
              </label>
              {item.editar}
              <span
                className={clsx(
                  "w-20 shrink-0 rounded-md px-2 py-1 text-center text-xs font-medium ring-1 ring-inset",
                  presente ? "bg-ok-soft text-ok ring-ok/20" : "bg-danger-soft text-danger ring-danger/20"
                )}
              >
                {presente ? "Presente" : "Falta"}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3">
        <p className="text-xs text-muted">Quem não estiver marcado fica com falta ao salvar.</p>
        <Button type="button" onClick={enviar} disabled={salvando || (chamadaSalva && !mudou)}>
          {salvando ? (
            <>
              <Spinner className="size-3.5" />
              Salvando
            </>
          ) : (
            "Salvar chamada"
          )}
        </Button>
      </div>
    </div>
  );
}
