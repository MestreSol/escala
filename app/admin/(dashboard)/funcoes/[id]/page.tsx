import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { pastoralDoPainel } from "@/lib/sessao";
import { usaGraus } from "@/lib/constants";
import { FuncaoForm } from "@/components/admin/FuncaoForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ActionForm } from "@/components/ui/ActionForm";
import { getFuncoesQuePodeAssumir } from "@/lib/funcaoAcumulacao";
import { getFuncoesPareadas } from "@/lib/funcaoPar";
import { getHabilitadosDaFuncao } from "@/lib/funcaoHabilitado";
import type { FuncaoRow } from "@/lib/types";
import { updateFuncao, saveFuncaoAcumulacoes, saveFuncaoPares, saveFuncaoHabilitados } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditarFuncaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { pastoral } = await pastoralDoPainel();

  const [funcaoResult, outrasFuncoesResult, podeAssumirIdsLista, pareadasIdsLista, habilitadosLista, servidoresResult] = await Promise.all([
    supabase.from("Funcao").select("*").eq("id", id).eq("pastoralId", pastoral.id).returns<FuncaoRow[]>().maybeSingle(),
    supabase
      .from("Funcao")
      .select("id, nome")
      .eq("pastoralId", pastoral.id)
      .eq("ativo", true)
      .neq("id", id)
      .order("nome", { ascending: true })
      .returns<{ id: string; nome: string }[]>(),
    getFuncoesQuePodeAssumir(id),
    getFuncoesPareadas(id),
    getHabilitadosDaFuncao(id),
    supabase
      .from("Servidor")
      .select("id, nome")
      .eq("pastoralId", pastoral.id)
      .eq("ativo", true)
      .order("nome", { ascending: true })
      .returns<{ id: string; nome: string }[]>(),
  ]);
  if (servidoresResult.error) throw servidoresResult.error;
  const servidores = servidoresResult.data ?? [];
  const habilitados = new Set(habilitadosLista);

  if (funcaoResult.error) throw funcaoResult.error;
  if (outrasFuncoesResult.error) throw outrasFuncoesResult.error;

  const funcao = funcaoResult.data;
  const outrasFuncoes = outrasFuncoesResult.data ?? [];

  if (!funcao) notFound();

  const action = updateFuncao.bind(null, funcao.id);
  const salvarAcumulacoes = saveFuncaoAcumulacoes.bind(null, funcao.id);
  const salvarPares = saveFuncaoPares.bind(null, funcao.id);
  const pareadasIds = new Set(pareadasIdsLista);
  const podeAssumirIds = new Set(podeAssumirIdsLista);

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-fg">Editar função</h1>
        <FuncaoForm
          action={action}
          defaultValues={funcao}
          submitLabel="Salvar alterações"
          usaGraus={usaGraus(pastoral.tipo)}
        />
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold text-fg">Quem pode fazer</h2>
        <p className="mb-4 text-sm text-muted">
          Para uma função que só alguns sabem fazer: ligue a restrição e marque quem pode. A escala só sorteia
          esses para <strong>{funcao.nome}</strong>; se nenhum deles puder na missa, a vaga fica em aberto.
        </p>
        <ActionForm
          action={saveFuncaoHabilitados.bind(null, funcao.id)}
          successMessage="Quem pode fazer foi salvo."
          className="space-y-3"
        >
          <label className="flex items-center gap-3 rounded-md border border-accent/30 bg-accent-soft px-4 py-3">
            <input
              type="checkbox"
              name="somenteHabilitados"
              defaultChecked={funcao.somenteHabilitados}
              className="h-4 w-4 rounded border-line-strong"
            />
            <span className="text-sm font-medium text-fg">Só os servidores marcados abaixo podem fazer esta função</span>
          </label>
          {servidores.length === 0 ? (
            <p className="text-sm text-muted">Nenhum servidor ativo cadastrado.</p>
          ) : (
            <div className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {servidores.map((servidor) => (
                <label
                  key={servidor.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-line bg-surface px-4 py-2.5 has-[:checked]:border-accent/50"
                >
                  <input
                    type="checkbox"
                    name={`hab_${servidor.id}`}
                    defaultChecked={habilitados.has(servidor.id)}
                    className="h-4 w-4 rounded border-line-strong"
                  />
                  <span className="text-sm font-medium text-fg">{servidor.nome}</span>
                </label>
              ))}
            </div>
          )}
          {funcao.somenteHabilitados && habilitados.size === 0 ? (
            <p className="text-sm text-warn">A restrição está ligada mas ninguém foi marcado: essa vaga vai ficar sempre em aberto.</p>
          ) : null}
          <SubmitButton pendingLabel="Salvando">Salvar quem pode fazer</SubmitButton>
        </ActionForm>
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
          <ActionForm action={salvarAcumulacoes} successMessage="Acúmulos salvos." className="space-y-3">
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
          </ActionForm>
        )}
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold text-fg">Funções em par</h2>
        <p className="mb-4 text-sm text-muted">
          Marque as funções que trabalham junto com <strong>{funcao.nome}</strong> na missa (ex: Turiferário e
          Naveteiro). Na escala, o par sempre junta um servidor <strong>experiente</strong> com um inexperiente —
          vagas da mesma função (ex: Ceroferário #1 e #2) não precisam disso.
        </p>

        {outrasFuncoes.length === 0 ? (
          <p className="text-sm text-muted">Cadastre outras funções para configurar pares.</p>
        ) : (
          <ActionForm action={salvarPares} successMessage="Pares salvos." className="space-y-3">
            {outrasFuncoes.map((outra) => (
              <label
                key={outra.id}
                className="flex items-center gap-3 rounded-md border border-line bg-surface px-4 py-3"
              >
                <input
                  type="checkbox"
                  name={`par_${outra.id}`}
                  defaultChecked={pareadasIds.has(outra.id)}
                  className="h-4 w-4 rounded border-line-strong"
                />
                <span className="text-sm font-medium text-fg">{outra.nome}</span>
              </label>
            ))}
            <SubmitButton pendingLabel="Salvando">Salvar pares</SubmitButton>
          </ActionForm>
        )}
      </div>
    </div>
  );
}
