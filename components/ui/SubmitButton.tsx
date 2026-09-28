"use client";

import { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

type SubmitButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  variant?: ButtonVariant;
  /** Texto mostrado (com spinner) enquanto a action do form roda. */
  pendingLabel?: string;
  /** Força o estado pendente (ex: form com useActionState). */
  pending?: boolean;
};

/** Botão de submit que mostra spinner enquanto a server action do form pai roda. */
export function SubmitButton({ children, pendingLabel, pending: pendingProp, disabled, ...props }: SubmitButtonProps) {
  const { pending: pendingForm } = useFormStatus();
  const pending = pendingProp ?? pendingForm;

  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending ? (
        <>
          <Spinner className="size-3.5" />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
