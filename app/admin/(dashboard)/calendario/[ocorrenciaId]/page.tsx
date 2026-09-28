import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/Badge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { PresencaSelect } from "@/components/admin/PresencaSelect";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { formatarDiaMissa, lerDataArmazenada, paraExibicao } from "@/lib/occurrences";
import type {
  EscalaAtribuicaoRow,
  FuncaoRow,
  MissaFuncaoRequisitoRow,
  MissaOcorrenciaRow,
  MissaRow,
  ServidorRow,
} from "@/lib/types";
import {
  atualizarAtribuicaoManual,
  registrarPresenca,
  escalarTodosAtivos,
  adicionarNaListaTodosAtivos,
  removerDaListaTodosAtivos,
  registrarPresencaTodosAtivos,
} from "../actions";

// Página lê dados do banco a cada acesso — nunca deve ser congelada em build.
export const dynamic = "force-dynamic";

type OcorrenciaComDetalhes = MissaOcorrenciaRow & {
  missa: MissaRow & { funcoesRequisito: (MissaFuncaoRequisitoRow & { funcao: FuncaoRow })[] };
  atribuicoes: (EscalaAtribuicaoRow & { servidor: ServidorRow | null })[];
};

export default async function OcorrenciaDetailPage({
  params,
}: {
  params: Promise<{ ocorrenciaId: string }>;
}) {
  const { ocorrenciaId } = await params;

  const [ocorrenciaResult, servidoresResult] = await Promise.all([
    supabase
      .from("MissaOcorrencia")
      .select(
        "*, missa:Missa(*, funcoesRequisito:MissaFuncaoRequisito(*, funcao:Funcao(*))), atribuicoes:EscalaAtribuicao(*, servidor:Servidor(*))"
      )
      .eq("id", ocorrenciaId)
      .returns<OcorrenciaComDetalhes[]>()
      .maybeSingle(),
    supabase.from("Servidor").select("*").eq("ativo", true).order("nome", { ascending: true }).returns<ServidorRow[]>(),
  ]);

  if (ocorrenciaResult.error) throw ocorrenciaResult.error;
  if (servidoresResult.error) throw servidoresResult.error;

  const ocorrencia = ocorrenciaResult.data;
  const servidores = servidoresResult.data ?? [];

  if (!ocorrencia) notFound();

  const dataOcorrencia = paraExibicao(lerDataArmazenada(ocorrencia.data));
  const mesAno = format(dataOcorrencia, "eeee, d 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="max-w-3xl">
      <Link href="/admin/calendario" className="mb-6 inline-block text-sm text-muted transition-colors hover:text-fg">
        ← Voltar ao calendário
      </Link>
      <h1 className="text-2xl font-semibold capitalize tracking-tight text-fg">
        {formatarDiaMissa(ocorrencia.missa)} — {format(dataOcorrencia, "HH:mm")}
      </h1>
      <p className="mb-1 text-sm text-muted capitalize">{mesAno}</p>
      <p className="mb-6 text-sm text-muted">Comunidade: {ocorrencia.missa.comunidade}</p>

      {ocorrencia.missa.escalarTodosAtivos ? (
        <ListaTodosAtivos ocorrencia={ocorrencia} servidores={servidores} />
      ) : (
        <ListaPorFuncao ocorrencia={ocorrencia} servidores={servidores} />
      )}
    </div>
  );
}

function ListaPorFuncao({
  ocorrencia,
  servidores,
}: {
  ocorrencia: OcorrenciaComDetalhes;
  servidores: ServidorRow[];
}) {
  const atribuicaoPorSlot = new Map(ocorrencia.atribuicoes.map((a) => [`${a.funcaoId}:${a.slotIndex}`, a]));

  const linhas = ocorrencia.missa.funcoesRequisito
    .filter((req) => req.ativo)
    .flatMap((req) =>
      Array.from({ length: req.quantidade }, (_, i) => {
        const slotIndex = i + 1;
        const atribuicao = atribuicaoPorSlot.get(`${req.funcaoId}:${slotIndex}`);
        return {
          funcaoId: req.funcaoId,
          funcaoNome: req.funcao.nome,
          slotIndex,
          totalSlots: req.quantidade,
          servidorId: atribuicao?.servidorId ?? null,
          servidorNome: atribuicao?.servidorNomeSnapshot ?? atribuicao?.servidor?.nome ?? null,
          presente: atribuicao?.presente ?? null,
          gerado: Boolean(atribuicao),
        };
      })
    );

  if (linhas.length === 0) {
    return <p className="text-sm text-muted">Esta missa não tem funções configuradas.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="min-w-full divide-y divide-line">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-subtle">Função</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-subtle">Servidor</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-subtle">Editar</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-subtle">Presença</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {linhas.map((linha) => {
            const salvar = atualizarAtribuicaoManual.bind(null, ocorrencia.id, linha.funcaoId, linha.slotIndex);
            const salvarPresenca = registrarPresenca.bind(null, ocorrencia.id, linha.funcaoId, linha.slotIndex);
            return (
              <tr key={`${linha.funcaoId}-${linha.slotIndex}`}>
                <td className="px-4 py-3 text-sm font-medium text-fg">
                  {linha.funcaoNome}
                  {linha.totalSlots > 1 ? ` #${linha.slotIndex}` : ""}
                </td>
                <td className="px-4 py-3 text-sm">
                  {linha.servidorNome ? (
                    <span className="text-fg">{linha.servidorNome}</span>
                  ) : linha.gerado ? (
                    <Badge color="red">EM ABERTO</Badge>
                  ) : (
                    <Badge color="gray">Não gerado</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <form action={salvar} className="flex items-center gap-2">
                    <div className="w-48">
                      <SearchableSelect
                        name="servidorId"
                        defaultValue={linha.servidorId ?? ""}
                        emptyOptionLabel="Vaga em aberto"
                        options={servidores.map((servidor) => ({ value: servidor.id, label: servidor.nome }))}
                      />
                    </div>
                    <SubmitButton variant="secondary" className="shrink-0" pendingLabel="Salvando">
                      Salvar
                    </SubmitButton>
                  </form>
                </td>
                <td className="px-4 py-3 text-sm">
                  {linha.servidorId ? (
                    <PresencaSelect action={salvarPresenca} defaultValue={linha.presente} />
                  ) : (
                    <span className="text-subtle">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ListaTodosAtivos({
  ocorrencia,
  servidores,
}: {
  ocorrencia: OcorrenciaComDetalhes;
  servidores: ServidorRow[];
}) {
  const escalados = ocorrencia.atribuicoes
    .filter((a) => a.funcaoId === null)
    .slice()
    .sort((a, b) =>
      (a.servidorNomeSnapshot ?? a.servidor?.nome ?? "").localeCompare(b.servidorNomeSnapshot ?? b.servidor?.nome ?? "")
    );

  const idsEscalados = new Set(escalados.map((a) => a.servidorId));
  const disponiveisParaAdicionar = servidores.filter((s) => !idsEscalados.has(s.id));

  const escalarTodos = escalarTodosAtivos.bind(null, ocorrencia.id);
  const adicionar = adicionarNaListaTodosAtivos.bind(null, ocorrencia.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-4">
        <form action={escalarTodos}>
          <SubmitButton pendingLabel="Escalando todos">Escalar todos os ativos</SubmitButton>
        </form>
        <span className="text-sm text-muted">
          {escalados.length} de {servidores.length} servidores ativos escalados
        </span>
      </div>

      {disponiveisParaAdicionar.length > 0 && (
        <form action={adicionar} className="flex items-center gap-2">
          <div className="w-64">
            <SearchableSelect
              name="servidorId"
              placeholder="Adicionar servidor..."
              options={disponiveisParaAdicionar.map((servidor) => ({ value: servidor.id, label: servidor.nome }))}
            />
          </div>
          <SubmitButton variant="secondary" className="shrink-0" pendingLabel="Adicionando">
            Adicionar
          </SubmitButton>
        </form>
      )}

      {escalados.length === 0 ? (
        <p className="text-sm text-muted">Ninguém escalado ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="min-w-full divide-y divide-line">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-subtle">Servidor</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-subtle">Presença</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {escalados.map((atribuicao) => {
                const salvarPresenca = registrarPresencaTodosAtivos.bind(null, ocorrencia.id, atribuicao.id);
                const remover = removerDaListaTodosAtivos.bind(null, ocorrencia.id, atribuicao.id);
                const nome = atribuicao.servidorNomeSnapshot ?? atribuicao.servidor?.nome ?? "—";
                return (
                  <tr key={atribuicao.id} className="transition-colors hover:bg-surface-2/60">
                    <td className="px-4 py-3 text-sm font-medium text-fg">{nome}</td>
                    <td className="px-4 py-3 text-sm">
                      <PresencaSelect action={salvarPresenca} defaultValue={atribuicao.presente} />
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <DeleteButton action={remover} confirmMessage={`Remover ${nome} desta lista?`} label="Remover" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
