"use client";

import { ReactNode } from "react";
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
 * Roda uma server action e mostra toast de sucesso ou erro. O redirect() do
 * Next chega como erro especial e é repassado (senão o redirect não acontece).
 */
export async function executarComToast(
  executar: () => Promise<void>,
  successMessage: string,
  erroPadrao = "Algo deu errado."
): Promise<void> {
  try {
    await executar();
    toast.success(successMessage);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    toast.error(error instanceof Error ? error.message : erroPadrao);
  }
}

/**
 * Envolve um <form action={serverAction}> sem estado próprio (a maioria das
 * mutações deste admin: vínculos, requisitos, presença, gerar/apagar escala
 * etc.) e mostra um toast de sucesso ou erro — sem isso, salvar não dava
 * nenhum retorno visual além da página recarregar em silêncio.
 *
 * A action do form é async (e não um startTransition solto) de propósito: o
 * React mantém o form "pendente" até ela terminar, então o SubmitButton de
 * dentro (useFormStatus) continua mostrando o spinner.
 */
export function ActionForm({ action, successMessage = "Salvo.", className, children }: ActionFormProps) {
  return (
    <form action={(formData) => executarComToast(() => action(formData), successMessage)} className={className}>
      {children}
    </form>
  );
}
