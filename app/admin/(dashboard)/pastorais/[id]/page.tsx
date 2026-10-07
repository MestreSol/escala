import { notFound, redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PastoralForm } from "@/components/admin/PastoralForm";
import { cuidaDaParoquiaToda, obterUsuarioAtual, paroquiaDoPainel } from "@/lib/sessao";
import type { PastoralRow } from "@/lib/types";
import { updatePastoral } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditarPastoralPage({ params }: { params: Promise<{ id: string }> }) {
  const paroquia = await paroquiaDoPainel();
  if (!cuidaDaParoquiaToda(await obterUsuarioAtual())) redirect("/admin");

  const { id } = await params;
  const { data: pastoral, error } = await supabase
    .from("Pastoral")
    .select("*")
    .eq("id", id)
    .eq("paroquiaId", paroquia.id)
    .maybeSingle<PastoralRow>();
  if (error) throw error;
  if (!pastoral) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-fg">Editar pastoral</h1>
      <PastoralForm
        action={updatePastoral.bind(null, pastoral.id)}
        defaultValues={{ nome: pastoral.nome, slug: pastoral.slug, tipo: pastoral.tipo, ativo: pastoral.ativo }}
        slugParoquia={paroquia.slug}
        submitLabel="Salvar"
      />
    </div>
  );
}
