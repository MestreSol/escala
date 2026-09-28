"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function DeleteButton({
  action,
  confirmMessage,
  label = "Excluir",
}: {
  action: () => Promise<void>;
  confirmMessage: string;
  label?: string;
}) {
  const [confirmando, setConfirmando] = useState(false);

  return (
    <form action={action}>
      <DeleteTrigger label={label} onClick={() => setConfirmando(true)} />
      <ConfirmDialog
        aberto={confirmando}
        aoFechar={() => setConfirmando(false)}
        titulo="Tem certeza?"
        mensagem={confirmMessage}
        confirmarLabel={label}
      />
    </form>
  );
}

function DeleteTrigger({ label, onClick }: { label: string; onClick: () => void }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-danger/80 transition-colors hover:text-danger disabled:opacity-60"
    >
      {pending && <Spinner className="size-3" />}
      {label}
    </button>
  );
}
