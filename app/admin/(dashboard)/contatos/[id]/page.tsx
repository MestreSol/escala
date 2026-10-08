import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { pastoralDaPresenca } from "@/lib/sessao";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input, Label } from "@/components/ui/Field";
import { formatarTelefone } from "@/lib/telefone";
import type { ServidorRow } from "@/lib/types";
import { salvarContatos, salvarFoto } from "../actions";

export const dynamic = "force-dynamic";

type Contato = Pick<ServidorRow, "id" | "nome" | "fotoUrl" | "celular" | "celularResponsavel">;

export default async function EditarContatoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { pastoral } = await pastoralDaPresenca();

  const { data: servidor, error } = await supabase
    .from("Servidor")
    .select("id, nome, fotoUrl, celular, celularResponsavel")
    .eq("id", id)
    .eq("pastoralId", pastoral.id)
    .returns<Contato[]>()
    .maybeSingle();
  if (error) throw error;
  if (!servidor) notFound();

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <Link href="/admin/contatos" className="text-sm text-muted transition-colors hover:text-fg">
          ← Fotos e telefones
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg">{servidor.nome}</h1>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-fg">Telefones</h2>
        <ActionForm
          action={salvarContatos.bind(null, servidor.id)}
          successMessage="Telefones salvos."
          className="space-y-5 rounded-xl border border-line bg-surface p-6"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="celular">Celular</Label>
              <Input
                id="celular"
                name="celular"
                type="tel"
                inputMode="tel"
                defaultValue={formatarTelefone(servidor.celular)}
                placeholder="(11) 98765-4321"
              />
            </div>
            <div>
              <Label htmlFor="celularResponsavel">Celular do responsável</Label>
              <Input
                id="celularResponsavel"
                name="celularResponsavel"
                type="tel"
                inputMode="tel"
                defaultValue={formatarTelefone(servidor.celularResponsavel)}
                placeholder="(11) 98765-4321"
              />
            </div>
          </div>
          <SubmitButton pendingLabel="Salvando">Salvar telefones</SubmitButton>
        </ActionForm>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-fg">Foto</h2>
        <ActionForm
          action={salvarFoto.bind(null, servidor.id)}
          successMessage="Foto atualizada."
          className="flex items-center gap-6 rounded-xl border border-line bg-surface p-6"
        >
          {servidor.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={servidor.fotoUrl} alt={servidor.nome} className="size-24 shrink-0 rounded-xl object-cover" />
          ) : (
            <div className="flex size-24 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-xs text-subtle">
              Sem foto
            </div>
          )}
          <div className="flex-1 space-y-3">
            <input
              type="file"
              name="foto"
              accept="image/jpeg,image/png,image/webp"
              required
              className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border file:border-line file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-fg hover:file:bg-line"
            />
            <SubmitButton pendingLabel="Enviando">Salvar foto</SubmitButton>
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
