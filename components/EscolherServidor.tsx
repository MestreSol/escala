"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Spinner } from "@/components/ui/Spinner";

/** Escolher o nome já abre o calendário daquela pessoa (sem botão "Ver meus dias"). */
export function EscolherServidor({
  servidores,
  servidorId,
  mes,
  caminho,
  placeholder = "Digite seu nome...",
}: {
  servidores: { id: string; nome: string }[];
  servidorId: string | null;
  mes: string;
  /** Página de indisponibilidade da paróquia (ex: "/matriz/indisponibilidade"). */
  caminho: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const [carregando, startTransition] = useTransition();

  return (
    <div className="relative">
      <SearchableSelect
        name="servidorId"
        defaultValue={servidorId ?? ""}
        placeholder={placeholder}
        options={servidores.map((servidor) => ({ value: servidor.id, label: servidor.nome }))}
        onValueChange={(valor) => {
          if (!valor || valor === servidorId) return;
          startTransition(() => router.push(`${caminho}?mes=${mes}&servidorId=${valor}`));
        }}
      />
      {carregando ? <Spinner className="absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-accent" /> : null}
    </div>
  );
}
