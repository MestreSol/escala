import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { listarPastoraisDaParoquia, pastoralDoPainel } from "@/lib/sessao";
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

  const [missaResult, requisitosResult, funcoesResult, config, pastorais, configsResult, vagasResult] = await Promise.all([
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
    listarPastoraisDaParoquia(paroquia.id),
    supabase
      .from("MissaPastoral")
      .select("pastoralId, escalarTodosAtivos, comunidadeResponsavel")
      .eq("missaId", id)
      .returns<{ pastoralId: string; escalarTodosAtivos: boolean; comunidadeResponsavel: string | null }[]>(),
    supabase
      .from("MissaFuncaoRequisito")
      .select("quantidade, funcao:Funcao(pastoralId)")
      .eq("missaId", id)
      .eq("ativo", true)
      .returns<{ quantidade: number; funcao: { pastoralId: string } | null }[]>(),
  ]);

  if (missaResult.error) throw missaResult.error;
  if (requisitosResult.error) throw requisitosResult.error;
  if (funcoesResult.error) throw funcoesResult.error;
  if (configsResult.error) throw configsResult.error;
  if (vagasResult.error) throw vagasResult.error;

  const missa = missaResult.data;
  const funcoes = funcoesResult.data ?? [];

  if (!missa) notFound();

  const configPorPastoral = new Map((configsResult.data ?? []).map((c) => [c.pastoralId, c]));
  const vagasPorPastoral = new Map<string, number>();
  for (const vaga of vagasResult.data ?? []) {
    if (!vaga.funcao) continue;
    vagasPorPastoral.set(vaga.funcao.pastoralId, (vagasPorPastoral.get(vaga.funcao.pastoralId) ?? 0) + vaga.quantidade);
  }
  const comoCadaPastoralServe = pastorais.map((p) => {
    const configDaPastoral = configPorPastoral.get(p.id);
    const vagas = vagasPorPastoral.get(p.id) ?? 0;
    const textoVagas = `${vagas} ${vagas === 1 ? "vaga" : "vagas"}`;
    const modo = configDaPastoral?.escalarTodosAtivos
      ? rotuloTodos(p.tipo)
      : vagas === 0
        ? "Não serve nesta missa"
        : configDaPastoral?.comunidadeResponsavel
          ? `Comunidade ${configDaPastoral.comunidadeResponsavel} · ${textoVagas}`
          : `${missa.dataUnica ? "Sorteio entre todos" : "Por preferência"} · ${textoVagas}`;
    return { id: p.id, nome: p.nome, modo, todos: Boolean(configDaPastoral?.escalarTodosAtivos), atual: p.id === pastoral.id };
  });

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
        <h2 className="mb-1 text-lg font-semibold text-fg">Como cada pastoral serve nesta missa</h2>
        <p className="mb-4 text-sm text-muted">
          &quot;Quem serve&quot; e as funções são escolhidos por pastoral. Para mudar outra pastoral, troque a pastoral
          no menu e abra esta missa de novo.
        </p>
        <ul className="divide-y divide-line/60 rounded-xl border border-line bg-surface">
          {comoCadaPastoralServe.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="font-medium text-fg">
                {p.nome}
                {p.atual ? <span className="ml-2 text-xs font-normal text-subtle">(editando agora)</span> : null}
              </span>
              <span className={p.todos ? "font-semibold uppercase tracking-wide text-accent" : "text-muted"}>{p.modo}</span>
            </li>
          ))}
        </ul>
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
