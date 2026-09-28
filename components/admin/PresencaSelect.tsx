"use client";

import { useFormStatus } from "react-dom";
import { Select } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { executarComToast } from "@/components/ui/ActionForm";

export function PresencaSelect({
  action,
  defaultValue,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultValue: boolean | null;
}) {
  return (
    <form
      action={(formData) =>
        executarComToast(() => action(formData), "Presença registrada.", "Não foi possível registrar a presença.")
      }
      className="flex items-center gap-2"
    >
      <SelectPresenca defaultValue={defaultValue} />
    </form>
  );
}

function SelectPresenca({ defaultValue }: { defaultValue: boolean | null }) {
  const { pending } = useFormStatus();
  return (
    <>
      <Select
        name="presente"
        defaultValue={defaultValue === null ? "" : String(defaultValue)}
        className="w-36"
        disabled={pending}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        <option value="">Não registrada</option>
        <option value="true">Presente</option>
        <option value="false">Faltou</option>
      </Select>
      {/* Sempre renderizado (só troca a opacidade) pra não empurrar o layout. */}
      <Spinner className={`size-3.5 text-accent transition-opacity ${pending ? "opacity-100" : "opacity-0"}`} />
    </>
  );
}
