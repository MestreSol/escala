"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Select } from "@/components/ui/Field";

export function PresencaSelect({
  action,
  defaultValue,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultValue: boolean | null;
}) {
  const [pending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const formData = new FormData(event.currentTarget.form ?? undefined);
    startTransition(async () => {
      try {
        await action(formData);
        toast.success("Presença registrada.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível registrar a presença.");
      }
    });
  }

  return (
    <form>
      <Select
        name="presente"
        defaultValue={defaultValue === null ? "" : String(defaultValue)}
        className="w-36"
        disabled={pending}
        onChange={handleChange}
      >
        <option value="">Não registrada</option>
        <option value="true">Presente</option>
        <option value="false">Faltou</option>
      </Select>
    </form>
  );
}
