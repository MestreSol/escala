"use client";

import { useTransition } from "react";
import { toast } from "sonner";

function isNextRedirectError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT"));
}

export function DeleteButton({
  action,
  confirmMessage,
  label = "Excluir",
  successMessage = "Excluído.",
}: {
  action: () => Promise<void>;
  confirmMessage: string;
  label?: string;
  successMessage?: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(confirmMessage)) return;

    startTransition(async () => {
      try {
        await action();
        toast.success(successMessage);
      } catch (error) {
        if (isNextRedirectError(error)) throw error;
        toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="cursor-pointer text-sm font-medium text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Excluindo..." : label}
    </button>
  );
}
