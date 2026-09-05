"use client";

import { Select } from "@/components/ui/Field";

export function PresencaSelect({
  action,
  defaultValue,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultValue: boolean | null;
}) {
  return (
    <form action={action}>
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
    </form>
  );
}
