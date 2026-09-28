"use client";

import { useFormStatus } from "react-dom";
import { Select } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";

export function PresencaSelect({
  action,
  defaultValue,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultValue: boolean | null;
}) {
  return (
    <form action={action} className="flex items-center gap-2">
      <Select
        name="presente"
        defaultValue={defaultValue === null ? "" : String(defaultValue)}
        className="w-36"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        <option value="">Não registrada</option>
        <option value="true">Presente</option>
        <option value="false">Faltou</option>
      </Select>
      <SalvandoIndicador />
    </form>
  );
}

function SalvandoIndicador() {
  const { pending } = useFormStatus();
  // Sempre renderizado (só troca a opacidade) pra não empurrar o layout.
  return <Spinner className={`size-3.5 text-accent transition-opacity ${pending ? "opacity-100" : "opacity-0"}`} />;
}
