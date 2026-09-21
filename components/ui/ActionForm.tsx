"use client";

import { ReactNode, useTransition } from "react";
import { toast } from "sonner";

type ActionFormProps = {
  /** Server action que não devolve estado (revalidatePath e, às vezes, redirect). */
  action: (formData: FormData) => Promise<void>;
  successMessage?: string;
  className?: string;
  children: ReactNode;
};

/** true pro erro especial que o Next usa internamente pra fazer redirect() dentro de uma Server Action. */
function isNextRedirectError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT"));
}

/**
 * Envolve um <form action={serverAction}> sem estado próprio (a maioria das
 * mutações deste admin: vínculos, requisitos, presença, gerar/apagar escala
 * etc.) e mostra um toast de sucesso ou erro — sem isso, salvar não dava
 * nenhum retorno visual além da página recarregar em silêncio.
 */
export function ActionForm({ action, successMessage = "Salvo.", className, children }: ActionFormProps) {
  const [pending, startTransition] = useTransition();

  function handleAction(formData: FormData) {
    startTransition(async () => {
      try {
        await action(formData);
        toast.success(successMessage);
      } catch (error) {
        if (isNextRedirectError(error)) throw error;
        toast.error(error instanceof Error ? error.message : "Algo deu errado.");
      }
    });
  }

  return (
    <form action={handleAction} className={className} aria-busy={pending}>
      {children}
    </form>
  );
}
