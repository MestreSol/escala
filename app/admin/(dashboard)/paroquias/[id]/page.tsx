import { notFound, redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ParoquiaForm } from "@/components/admin/ParoquiaForm";
import { obterUsuarioAtual } from "@/lib/sessao";
import type { ParoquiaRow } from "@/lib/types";
import { updateParoquia } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditarParoquiaPage({ params }: { params: Promise<{ id: string }> }) {
  const usuarioLogado = await obterUsuarioAtual();
  if (usuarioLogado?.papel !== "SUPERADMIN") redirect("/admin");

  const { id } = await params;
  const { data: paroquia, error } = await supabase.from("Paroquia").select("*").eq("id", id).maybeSingle<ParoquiaRow>();
  if (error) throw error;
  if (!paroquia) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-fg">Editar paróquia</h1>
      <ParoquiaForm
        action={updateParoquia.bind(null, paroquia.id)}
        defaultValues={{ nome: paroquia.nome, slug: paroquia.slug, ativo: paroquia.ativo }}
        submitLabel="Salvar"
      />
    </div>
  );
}
