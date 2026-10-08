"use client";

import { useState, useTransition } from "react";
import { Select } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { executarComToast } from "@/components/ui/ActionForm";
import type { ResultadoAcao } from "@/lib/avisos";

type Valor = "" | "true" | "false";

const paraValor = (presente: boolean | null): Valor => (presente === null ? "" : presente ? "true" : "false");

export function PresencaSelect({
  action,
  defaultValue,
  podeCorrigir = false,
}: {
  action: (formData: FormData) => Promise<ResultadoAcao>;
  defaultValue: boolean | null;
  /**
   * Presença já confirmada ("Presente") fica travada. Quem pode corrigir
   * (ADMIN/SUPERADMIN, ver garantirPresencaNaoTravada) ganha o botão "Corrigir".
   */
  podeCorrigir?: boolean;
}) {
  // Sem <form> de propósito: o React 19 chama form.reset() quando a action de
  // um <form> termina, e o select voltava pra "Não registrada" mesmo com a
  // presença salva no banco. Aqui a action é chamada direto do onChange.
  const [valor, setValor] = useState<Valor>(paraValor(defaultValue));
  const [salvo, setSalvo] = useState<Valor>(paraValor(defaultValue));
  const [salvando, startTransition] = useTransition();
  const [corrigindo, setCorrigindo] = useState(false);

  if (salvo === "true" && !corrigindo) {
    return (
      <div className="flex items-center gap-2">
        <span
          title={podeCorrigir ? "Presença confirmada." : "Presença confirmada — não pode mais ser alterada."}
          className="inline-flex w-36 items-center gap-1.5 rounded-md bg-ok-soft px-3 py-2 text-sm font-medium text-ok ring-1 ring-inset ring-ok/20"
        >
          ✓ Presente
        </span>
        {podeCorrigir ? (
          <button
            type="button"
            onClick={() => setCorrigindo(true)}
            className="text-xs font-medium text-muted transition-colors hover:text-accent"
          >
            Corrigir
          </button>
        ) : null}
      </div>
    );
  }

  function salvar(novo: Valor) {
    setValor(novo);
    const formData = new FormData();
    formData.set("presente", novo);
    startTransition(async () => {
      await executarComToast(
        async () => {
          const resultado = await action(formData);
          // Deu certo: guarda o valor salvo (é ele que trava o "Presente");
          // aviso (ex: presença já travada) volta o select pro valor salvo.
          if (resultado && "aviso" in resultado) setValor(salvo);
          else {
            setSalvo(novo);
            setCorrigindo(false);
          }
          return resultado;
        },
        "Presença registrada.",
        "Não foi possível registrar a presença."
      );
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        name="presente"
        value={valor}
        className="w-36"
        disabled={salvando}
        onChange={(event) => salvar(event.currentTarget.value as Valor)}
      >
        <option value="">Não registrada</option>
        <option value="true">Presente</option>
        <option value="false">Faltou</option>
      </Select>
      {/* Sempre renderizado (só troca a opacidade) pra não empurrar o layout. */}
      <Spinner className={`size-3.5 text-accent transition-opacity ${salvando ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}
