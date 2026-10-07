import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { pastoralDoPainel } from "@/lib/sessao";
import { getConfigMissa } from "@/lib/missaPastoral";
import { MissaForm } from "@/components/admin/MissaForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ActionForm } from "@/components/ui/ActionForm";
import { PRIORIDADE_LABEL, GRAU_LABEL, rotuloTodos, usaGraus } from "@/lib/constants";
import type { FuncaoRow, MissaFuncaoRequisitoRow, MissaRow } from "@/lib/types";
import { updateMissa, deleteMissa, saveMissaRequisitos } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditarMissaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { paroquia, pastoral } = await pastoralDoPainel();

  const [missaResult, requisitosResult, funcoesResult, config] = await Promise.all([
    supabase.from("Missa").select("*").eq("id", id).eq("paroquiaId", paroquia.id).returns<MissaRow[]>().maybeSingle(),
    supabase
      .from("MissaFuncaoRequisito")
      .select("*")
      .eq("missaId", id)
      .returns<MissaFuncaoRequisitoRow[]>(),
    supabase
      .from("Funcao")
      .select("*")
      .eq("pastoralId", pastoral.id)
      .eq("ativo", true)
      .order("nome", { ascending: true })
      .returns<FuncaoRow[]>(),
    getConfigMissa(id, pastoral.id),
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
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-fg">
          {missa.dataUnica ? "Editar missa grande" : "Editar missa"}
        </h1>
        <MissaForm
          action={updateMissa.bind(null, missa.id)}
          defaultValues={{
            ...missa,
            ...config,
            dataUnica: missa.dataUnica?.slice(0, 10) ?? null,
          }}
          submitLabel="Salvar alterações"
          pastoral={{ nome: pastoral.nome, rotuloTodos: rotuloTodos(pastoral.tipo) }}
        />
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold text-fg">Funções exigidas nesta missa — {pastoral.nome}</h2>
        <p className="mb-4 text-sm text-muted">
          Marque as funções da sua pastoral que essa missa precisa e quantas vagas cada uma tem (ex: 2
          ceroferários). Sem nenhuma marcada, a sua pastoral não serve nesta missa.
        </p>

        {config.escalarTodosAtivos ? (
          <p className="rounded-md border border-line bg-surface-2 px-4 py-3 text-sm text-muted">
            Essa missa está como &quot;{rotuloTodos(pastoral.tipo)}&quot; — não usa funções individuais. Na
            tela de cada ocorrência, escale todo mundo de uma vez com um clique.
          </p>
        ) : funcoes.length === 0 ? (
          <p className="text-sm text-muted">Cadastre funções primeiro.</p>
        ) : (
          <ActionForm action={salvarRequisitos} successMessage="Funções da missa salvas." className="space-y-3">
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
                      {PRIORIDADE_LABEL[funcao.prioridade]}
                      {usaGraus(pastoral.tipo) ? ` · ${GRAU_LABEL[funcao.grauMinimo]}+` : ""}
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
          </ActionForm>
        )}
      </div>

      <div className="border-t border-line pt-6">
        <DeleteButton
          action={deleteMissa.bind(null, missa.id)}
          confirmMessage="Excluir esta missa? Ela é da paróquia toda: isso remove as ocorrências e as escalas geradas para ela em todas as pastorais."
          label="Excluir missa"
        />
      </div>
    </div>
  );
}
