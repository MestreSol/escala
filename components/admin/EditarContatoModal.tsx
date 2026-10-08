"use client";

import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { buttonClasses } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { ResultadoAcao } from "@/lib/avisos";

type Acao = (formData: FormData) => Promise<ResultadoAcao>;

/** Roda a action e avisa; devolve true se salvou (pra fechar o modal). */
async function executar(acao: Acao, formData: FormData, sucesso: string): Promise<boolean> {
  try {
    const resultado = await acao(formData);
    if (resultado && "aviso" in resultado) {
      toast.error(resultado.aviso);
      return false;
    }
    toast.success(sucesso);
    return true;
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    return false;
  }
}

/**
 * Botão "Editar" da chamada (Presença do dia): abre um modal pra corrigir
 * foto e telefones ali mesmo, sem sair da tela. Só esses campos — é o que o
 * usuário PRESENCA pode mudar (ver app/admin/(dashboard)/contatos/actions.ts).
 */
export function EditarContatoModal({
  nome,
  fotoUrl,
  celular,
  celularResponsavel,
  salvarContatos,
  salvarFoto,
}: {
  nome: string;
  fotoUrl: string | null;
  /** Já formatados, ex: "(11) 98765-4321". */
  celular: string;
  celularResponsavel: string;
  salvarContatos: Acao;
  salvarFoto: Acao;
}) {
  const [aberto, setAberto] = useState(false);
  const [previa, setPrevia] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (aberto && !dialog.open) dialog.showModal();
    if (!aberto && dialog.open) dialog.close();
  }, [aberto]);

  // Esc dispara "cancel" (e às vezes só ele): sem ouvir os dois o estado ficava "aberto".
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const fechar = () => setAberto(false);
    dialog.addEventListener("cancel", fechar);
    dialog.addEventListener("close", fechar);
    return () => {
      dialog.removeEventListener("cancel", fechar);
      dialog.removeEventListener("close", fechar);
    };
  }, []);

  useEffect(() => () => {
    if (previa) URL.revokeObjectURL(previa);
  }, [previa]);

  function fechar() {
    setAberto(false);
    setPrevia(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-xs font-medium text-muted transition-colors hover:text-accent"
      >
        Editar
      </button>

      <dialog
        ref={dialogRef}
        onClick={(evento) => {
          if (evento.target === dialogRef.current) fechar();
        }}
        aria-label={`Editar ${nome}`}
        className="m-auto w-[calc(100%-2rem)] max-w-md overflow-visible bg-transparent p-0 text-fg backdrop:bg-black/60 backdrop:backdrop-blur-sm open:animate-fade-in"
      >
        <div className="max-h-[90vh] space-y-6 overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-2xl shadow-black/60">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-base font-semibold text-fg">{nome}</h2>
            <button
              type="button"
              onClick={fechar}
              aria-label="Fechar"
              className="-mt-1 -mr-2 rounded-md px-2 py-1 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              ✕
            </button>
          </div>

          <form
            action={async (formData) => {
              if (await executar(salvarContatos, formData, "Telefones salvos.")) fechar();
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor={`${id}-celular`}>Celular</Label>
              <Input
                id={`${id}-celular`}
                name="celular"
                type="tel"
                inputMode="tel"
                defaultValue={celular}
                placeholder="(11) 98765-4321"
              />
            </div>
            <div>
              <Label htmlFor={`${id}-responsavel`}>Celular do responsável</Label>
              <Input
                id={`${id}-responsavel`}
                name="celularResponsavel"
                type="tel"
                inputMode="tel"
                defaultValue={celularResponsavel}
                placeholder="(11) 98765-4321"
              />
            </div>
            <SubmitButton pendingLabel="Salvando">Salvar telefones</SubmitButton>
          </form>

          <form
            action={async (formData) => {
              if (await executar(salvarFoto, formData, "Foto atualizada.")) fechar();
            }}
            className="space-y-3 border-t border-line pt-6"
          >
            <Label>Foto</Label>
            <div className="flex items-center gap-4">
              {previa || fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previa ?? fotoUrl ?? ""} alt="" className="size-20 shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-xs text-subtle">
                  Sem foto
                </div>
              )}
              <input
                type="file"
                name="foto"
                accept="image/jpeg,image/png,image/webp"
                required
                onChange={(evento) => {
                  const arquivo = evento.currentTarget.files?.[0];
                  setPrevia(arquivo ? URL.createObjectURL(arquivo) : null);
                }}
                className="block w-full min-w-0 text-sm text-muted file:mr-3 file:rounded-md file:border file:border-line file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-fg hover:file:bg-line"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={fechar} className={buttonClasses("ghost")}>
                Cancelar
              </button>
              <SubmitButton pendingLabel="Enviando">Salvar foto</SubmitButton>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
