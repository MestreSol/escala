import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { FuncaoForm } from "@/components/admin/FuncaoForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { getFuncoesQuePodeAssumir } from "@/lib/funcaoAcumulacao";
import type { FuncaoRow } from "@/lib/types";
import { updateFuncao, saveFuncaoAcumulacoes } from "../actions";

// Página lê dados do banco a cada acesso — nunca deve ser congelada em build.
export const dynamic = "force-dynamic";

export default async function EditarFuncaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [funcaoResult, outrasFuncoesResult, podeAssumirIdsLista] = await Promise.all([
    supabase.from("Funcao").select("*").eq("id", id).returns<FuncaoRow[]>().maybeSingle(),
    supabase
      .from("Funcao")
      .select("id, nome")
      .eq("ativo", true)
      .neq("id", id)
      .order("nome", { ascending: true })
      .returns<{ id: string; nome: string }[]>(),
    getFuncoesQuePodeAssumir(id),
  ]);

  if (funcaoResult.error) throw funcaoResult.error;
  if (outrasFuncoesResult.error) throw outrasFuncoesResult.error;

  const funcao = funcaoResult.data;
  const outrasFuncoes = outrasFuncoesResult.data ?? [];

  if (!funcao) notFound();

  const action = updateFuncao.bind(null, funcao.id);
  const salvarAcumulacoes = saveFuncaoAcumulacoes.bind(null, funcao.id);
  const podeAssumirIds = new Set(podeAssumirIdsLista);

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-fg">Editar função</h1>
        <FuncaoForm action={action} defaultValues={funcao} submitLabel="Salvar alterações" />
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold text-fg">Acúmulo de função</h2>
        <p className="mb-4 text-sm text-muted">
          Marque quais outras funções quem exerce <strong>{funcao.nome}</strong> também pode
          assumir na mesma missa, como último recurso quando não sobrar mais ninguém disponível
          especificamente para elas. Se houver gente suficiente, cada função continua sendo
          preenchida por pessoas diferentes.
        </p>

        {outrasFuncoes.length === 0 ? (
          <p className="text-sm text-muted">Cadastre outras funções para configurar acúmulos.</p>
        ) : (
          <form action={salvarAcumulacoes} className="space-y-3">
            {outrasFuncoes.map((outra) => (
              <label
                key={outra.id}
                className="flex items-center gap-3 rounded-md border border-line bg-surface px-4 py-3"
              >
                <input
                  type="checkbox"
                  name={`assume_${outra.id}`}
                  defaultChecked={podeAssumirIds.has(outra.id)}
                  className="h-4 w-4 rounded border-line-strong"
                />
                <span className="text-sm font-medium text-fg">{outra.nome}</span>
              </label>
            ))}
            <SubmitButton pendingLabel="Salvando">Salvar acúmulos</SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
