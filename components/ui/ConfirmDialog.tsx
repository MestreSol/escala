"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import { buttonClasses } from "@/components/ui/Button";

/**
 * Modal de confirmação (substitui o confirm() do navegador). Usa o <dialog>
 * nativo em modo modal: foco preso dentro dele, Esc fecha, clique fora fecha.
 *
 * Tem que ficar DENTRO do <form> da ação: o botão de confirmar é o submit do
 * form, então a server action roda normalmente e o useFormStatus dos botões
 * do form continua mostrando o "carregando".
 */
export function ConfirmDialog({
  aberto,
  aoFechar,
  titulo,
  mensagem,
  confirmarLabel,
  perigoso = true,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  mensagem: string;
  confirmarLabel: string;
  /** Ação destrutiva (apagar/excluir): botão de confirmar em vermelho. */
  perigoso?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const aoFecharRef = useRef(aoFechar);
  useEffect(() => {
    aoFecharRef.current = aoFechar;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (aberto && !dialog.open) dialog.showModal();
    if (!aberto && dialog.open) dialog.close();
  }, [aberto]);

  // Listener nativo de "cancel" (Esc) e "close": em alguns navegadores o Esc
  // só dispara "cancel", e sem ouvir os dois o estado ficava "aberto" — aí o
  // modal não abria mais na próxima vez.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const fechar = () => aoFecharRef.current();
    dialog.addEventListener("cancel", fechar);
    dialog.addEventListener("close", fechar);
    return () => {
      dialog.removeEventListener("cancel", fechar);
      dialog.removeEventListener("close", fechar);
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onClick={(evento) => {
        // Clique no fundo escurecido (fora do cartão) fecha.
        if (evento.target === dialogRef.current) aoFechar();
      }}
      aria-labelledby="confirm-dialog-titulo"
      className="m-auto w-[calc(100%-2rem)] max-w-sm overflow-visible bg-transparent p-0 text-fg backdrop:bg-black/60 backdrop:backdrop-blur-sm open:animate-fade-in"
    >
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-2xl shadow-black/60">
        <div
          aria-hidden
          className={clsx(
            "mb-4 flex size-10 items-center justify-center rounded-full text-lg ring-1 ring-inset",
            perigoso ? "bg-danger-soft text-danger ring-danger/20" : "bg-accent-soft text-accent ring-accent/20"
          )}
        >
          {perigoso ? "!" : "?"}
        </div>
        <h2 id="confirm-dialog-titulo" className="text-base font-semibold text-fg">
          {titulo}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{mensagem}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" autoFocus onClick={aoFechar} className={buttonClasses("ghost")}>
            Cancelar
          </button>
          <button
            type="submit"
            onClick={aoFechar}
            className={
              perigoso
                ? buttonClasses("primary", "bg-danger text-bg hover:bg-danger/85")
                : buttonClasses("primary")
            }
          >
            {confirmarLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
