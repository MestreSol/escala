"use client";

import { ReactNode, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ProgressBar, Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { executarComToast } from "@/components/ui/ActionForm";
import { Button, type ButtonVariant } from "@/components/ui/Button";

const MENSAGENS_PADRAO = [
  "Sorteando servidores",
  "Conferindo quem já serviu no dia",
  "Equilibrando as funções",
  "Preenchendo as vagas",
];

/**
 * Form de uma server action demorada (gerar/regenerar/apagar escala...):
 * pede confirmação opcional (num modal) e, enquanto a action roda, cobre a tela com um
 * aviso animado — sem isso o botão parecia não fazer nada.
 */
export function AcaoEscalaForm({
  action,
  children,
  variant = "primary",
  confirmMessage,
  pendingTitle,
  successMessage,
  mensagens = MENSAGENS_PADRAO,
}: {
  action: () => Promise<void>;
  children: ReactNode;
  variant?: ButtonVariant;
  confirmMessage?: string;
  pendingTitle: string;
  /** Toast mostrado quando a ação termina bem. */
  successMessage: string;
  mensagens?: string[];
}) {
  const [confirmando, setConfirmando] = useState(false);

  return (
    <form action={() => executarComToast(action, successMessage)}>
      {confirmMessage ? (
        <>
          <BotaoAbrirConfirmacao variant={variant} onClick={() => setConfirmando(true)}>
            {children}
          </BotaoAbrirConfirmacao>
          <ConfirmDialog
            aberto={confirmando}
            aoFechar={() => setConfirmando(false)}
            titulo="Tem certeza?"
            mensagem={confirmMessage}
            confirmarLabel={typeof children === "string" ? children : "Confirmar"}
            perigoso={variant === "danger"}
          />
        </>
      ) : (
        <SubmitButton variant={variant}>{children}</SubmitButton>
      )}
      <GeracaoOverlay titulo={pendingTitle} mensagens={mensagens} />
    </form>
  );
}

/** Botão que só abre o modal — o submit de verdade é o "confirmar" dele. */
function BotaoAbrirConfirmacao({
  variant,
  onClick,
  children,
}: {
  variant: ButtonVariant;
  onClick: () => void;
  children: ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="button" variant={variant} onClick={onClick} disabled={pending} aria-busy={pending}>
      {pending ? <Spinner className="size-3.5" /> : null}
      {children}
    </Button>
  );
}

function GeracaoOverlay({ titulo, mensagens }: { titulo: string; mensagens: string[] }) {
  const { pending } = useFormStatus();
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => setIndice((i) => (i + 1) % mensagens.length), 1500);
    return () => {
      clearInterval(id);
      setIndice(0);
    };
  }, [pending, mensagens.length]);

  if (!pending) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-bg/70 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-xs rounded-2xl border border-line bg-surface p-6 text-center shadow-2xl shadow-black/60">
        <div className="relative mx-auto mb-5 size-12">
          <span className="absolute inset-0 rounded-full border-2 border-line" />
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-accent border-r-transparent border-b-transparent" />
          <span className="absolute inset-3 animate-pulse-soft rounded-full bg-accent-soft" />
        </div>
        <p className="font-medium text-fg">{titulo}</p>
        <p key={indice} className="mt-1 h-5 animate-fade-in text-sm text-muted">
          {mensagens[indice]}…
        </p>
        <ProgressBar className="mt-5" />
      </div>
    </div>
  );
}
