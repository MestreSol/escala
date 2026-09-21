"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Dispara um toast de sucesso/erro quando um form em useActionState termina
 * de processar (pending true -> false) — sem isso, os forms de criar/editar
 * que não fazem redirect() (ex: editar missa) ficavam sem nenhum retorno
 * visual de que salvaram. Ignora o próprio mount (só reage a uma submissão
 * de verdade).
 */
export function useActionToast(state: { error?: string }, pending: boolean, successMessage: string) {
  const estavaPendente = useRef(false);

  useEffect(() => {
    if (estavaPendente.current && !pending) {
      if (state.error) toast.error(state.error);
      else toast.success(successMessage);
    }
    estavaPendente.current = pending;
  }, [pending, state, successMessage]);
}
