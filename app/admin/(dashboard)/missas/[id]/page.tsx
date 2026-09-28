import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MissaForm } from "@/components/admin/MissaForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { PRIORIDADE_LABEL, GRAU_LABEL } from "@/lib/constants";
import type { FuncaoRow, MissaFuncaoRequisitoRow, MissaRow } from "@/lib/types";
import { updateMissa, deleteMissa, saveMissaRequisitos } from "../actions";

// Página lê dados do banco a cada acesso — nunca deve ser congelada em build.
export const dynamic = "force-dynamic";

export default async function EditarMissaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [missaResult, requisitosResult, funcoesResult] = await Promise.all([
    supabase.from("Missa").select("*").eq("id", id).returns<MissaRow[]>().maybeSingle(),
    supabase
      .from("MissaFuncaoRequisito")
      .select("*")
      .eq("missaId", id)
      .returns<MissaFuncaoRequisitoRow[]>(),
    supabase.from("Funcao").select("*").eq("ativo", true).order("nome", { ascending: true }).returns<FuncaoRow[]>(),
  ]);

  if (missaResult.error) throw missaResult.error;
  if (requisitosResult.error) throw requisitosResult.error;
  if (funcoesResult.error) throw funcoesResult.error;

  const missa = missaResult.data;
  const funcoes = funcoesResult.data ?? [];

  if (!missa) notFound();

  const requisitoPorFuncao = new Map((requisitosResult.data ?? []).map((r) => [r.funcaoId, r]));
  const salvarRequisitos = saveMissaRequisitos.bind(null, missa.id);

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-fg">Editar missa</h1>
        <MissaForm action={updateMissa.bind(null, missa.id)} defaultValues={missa} submitLabel="Salvar alterações" />
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold text-fg">Funções exigidas nesta missa</h2>
        <p className="mb-4 text-sm text-muted">
          Marque as funções que essa missa precisa e quantas vagas cada uma tem (ex: 2 ceroferários).
        </p>

        {missa.escalarTodosAtivos ? (
          <p className="rounded-md border border-line bg-surface-2 px-4 py-3 text-sm text-muted">
            Essa missa está marcada como &quot;precisa de todos os servidores ativos&quot; — não usa
            funções individuais. Na tela de cada ocorrência, escale todo mundo de uma vez com um
            clique.
          </p>
        ) : funcoes.length === 0 ? (
          <p className="text-sm text-muted">Cadastre funções primeiro.</p>
        ) : (
          <form action={salvarRequisitos} className="space-y-3">
            {funcoes.map((funcao) => {
              const requisito = requisitoPorFuncao.get(funcao.id);
              return (
                <div
                  key={funcao.id}
                  className="flex items-center justify-between gap-4 rounded-md border border-line bg-surface px-4 py-3"
                >
                  <label className="flex flex-1 items-center gap-3">
                    <input
                      type="checkbox"
                      name={`req_${funcao.id}_ativo`}
                      defaultChecked={Boolean(requisito?.ativo)}
                      className="h-4 w-4 rounded border-line-strong"
                    />
                    <span className="text-sm font-medium text-fg">{funcao.nome}</span>
                    <span className="text-xs text-muted">
                      {PRIORIDADE_LABEL[funcao.prioridade]} · {GRAU_LABEL[funcao.grauMinimo]}+
                    </span>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    name={`req_${funcao.id}_quantidade`}
                    defaultValue={requisito?.quantidade ?? funcao.quantidadePadrao}
                    className="w-20"
                  />
                </div>
              );
            })}
            <SubmitButton pendingLabel="Salvando">Salvar funções da missa</SubmitButton>
          </form>
        )}
      </div>

      <div className="border-t border-line pt-6">
        <DeleteButton
          action={deleteMissa.bind(null, missa.id)}
          confirmMessage="Excluir esta missa? Isso também remove ocorrências e escalas geradas para ela."
          label="Excluir missa"
        />
      </div>
    </div>
  );
}
