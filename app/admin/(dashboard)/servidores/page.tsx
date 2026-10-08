import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { pastoralDoPainel } from "@/lib/sessao";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { GRAU_LABEL, GRAU_ORDEM, usaGraus } from "@/lib/constants";
import { DataTable } from "@/components/ui/DataTable";
import { lerDataArmazenada } from "@/lib/occurrences";
import { calcularIdade } from "@/lib/idade";
import type { ServidorMissaPreferenciaRow, ServidorRow } from "@/lib/types";
import { ActionForm } from "@/components/ui/ActionForm";
import { alternarExperiente, definirAtivo, deleteServidor } from "./actions";

const GRAU_COLOR: Record<string, "green" | "blue" | "yellow"> = {
  COROINHA: "green",
  ACOLITO: "blue",
  CERIMONIARIO: "yellow",
};

export const dynamic = "force-dynamic";

export default async function ServidoresPage({
  searchParams,
}: {
  searchParams: Promise<{ comunidade?: string; categoria?: string; situacao?: string }>;
}) {
  const { comunidade, categoria, situacao } = await searchParams;
  const verInativos = situacao === "inativos";
  const { pastoral } = await pastoralDoPainel();
  const comGraus = usaGraus(pastoral.tipo);

  let query = supabase
    .from("Servidor")
    .select("*, preferenciasMissas:ServidorMissaPreferencia(*)")
    .eq("pastoralId", pastoral.id)
    .eq("ativo", !verInativos);

  if (comunidade) query = query.ilike("comunidade", `%${comunidade}%`);
  if (categoria && comGraus) query = query.eq("categoria", categoria);

  const { data, error } = await query.returns<
    (ServidorRow & { preferenciasMissas: ServidorMissaPreferenciaRow[] })[]
  >();
  if (error) throw error;
  const servidores = data ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Servidores</h1>
        <p className="text-sm text-muted">
          {pastoral.nome} · {servidores.length} {verInativos ? "inativo(s)" : "ativo(s)"}
        </p>
      </div>

      <form className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">Comunidade</label>
          <input
            type="text"
            name="comunidade"
            defaultValue={comunidade}
            className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-fg placeholder:text-subtle focus:border-accent focus:outline-none"
            placeholder="Buscar..."
          />
        </div>
        <div hidden={!comGraus}>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">Categoria</label>
          <select
            name="categoria"
            defaultValue={categoria ?? ""}
            className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-fg focus:border-accent focus:outline-none"
          >
            <option value="">Todas</option>
            <option value="COROINHA">Coroinha</option>
            <option value="ACOLITO">Acólito</option>
            <option value="CERIMONIARIO">Cerimoniário</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">Situação</label>
          <select
            name="situacao"
            defaultValue={verInativos ? "inativos" : ""}
            className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-fg focus:border-accent focus:outline-none"
          >
            <option value="">Ativos</option>
            <option value="inativos">Inativos</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md border border-line bg-surface-2 px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:border-line-strong hover:bg-line"
        >
          Filtrar
        </button>
      </form>

      <DataTable
        vazio="Nenhum servidor encontrado."
        ordemPadrao={{ chave: "nome", direcao: "asc" }}
        colunas={[
          { chave: "nome", titulo: "Nome", ordenavel: true },
          { chave: "idade", titulo: "Idade", ordenavel: true },
          { chave: "comunidade", titulo: "Comunidade", ordenavel: true },
          ...(comGraus ? [{ chave: "categoria", titulo: "Categoria", ordenavel: true }] : []),
          { chave: "experiente", titulo: "Experiente", ordenavel: true },
          { chave: "missas", titulo: "Missas", ordenavel: true },
          { chave: "acoes", titulo: "", alinhar: "right" },
        ]}
        linhas={servidores.map((servidor) => {
          const idade = servidor.dataNascimento ? calcularIdade(lerDataArmazenada(servidor.dataNascimento)) : null;
          return {
          id: servidor.id,
          valores: {
            nome: servidor.nome,
            idade,
            comunidade: servidor.comunidade,
            categoria: GRAU_ORDEM[servidor.categoria] ?? null,
            experiente: servidor.experiente ? 0 : 1,
            missas: servidor.preferenciasMissas.length,
          },
          celulas: {
            nome: (
              <span className="flex items-center gap-2.5 font-medium text-fg">
                {servidor.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={servidor.fotoUrl} alt="" className="size-7 shrink-0 rounded-full object-cover" />
                ) : (
                  <span
                    aria-hidden
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] text-muted"
                  >
                    {servidor.nome.charAt(0)}
                  </span>
                )}
                {servidor.nome}
              </span>
            ),
            idade:
              idade === null ? (
                <span className="text-subtle">—</span>
              ) : (
                <span className="tabular-nums text-muted">{idade}</span>
              ),
            comunidade: <span className="text-muted">{servidor.comunidade}</span>,
            categoria: <Badge color={GRAU_COLOR[servidor.categoria]}>{GRAU_LABEL[servidor.categoria]}</Badge>,
            experiente: (
              <ActionForm
                action={alternarExperiente.bind(null, servidor.id)}
                successMessage={servidor.experiente ? "Desmarcado como experiente." : "Marcado como experiente."}
              >
                <button
                  type="submit"
                  title="Clique para alternar"
                  className={
                    servidor.experiente
                      ? "rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent ring-1 ring-inset ring-accent/30 transition-colors hover:bg-accent/20"
                      : "rounded-full px-2 py-0.5 text-[11px] text-subtle ring-1 ring-inset ring-line transition-colors hover:text-muted"
                  }
                >
                  {servidor.experiente ? "Experiente" : "Iniciante"}
                </button>
              </ActionForm>
            ),
            missas: <span className="tabular-nums text-muted">{servidor.preferenciasMissas.length}</span>,
            acoes: (
              <div className="flex justify-end gap-4">
                <Link href={`/admin/servidores/${servidor.id}`} className="font-medium text-accent hover:text-accent-hover">
                  Editar
                </Link>
                {servidor.ativo ? (
                  <DeleteButton
                    action={definirAtivo.bind(null, servidor.id, false)}
                    confirmMessage={`Desativar "${servidor.nome}"? Ele sai do sorteio da escala e das listas públicas. O cadastro e o histórico continuam guardados, e dá pra reativar depois em "Situação: Inativos".`}
                    label="Desativar"
                    successMessage="Servidor desativado."
                  />
                ) : (
                  <ActionForm action={definirAtivo.bind(null, servidor.id, true)} successMessage="Servidor reativado.">
                    <button type="submit" className="text-sm font-medium text-ok/90 transition-colors hover:text-ok">
                      Reativar
                    </button>
                  </ActionForm>
                )}
                <DeleteButton
                  action={deleteServidor.bind(null, servidor.id)}
                  confirmMessage={`Excluir o servidor "${servidor.nome}"?`}
                />
              </div>
            ),
          },
          };
        })}
      />
    </div>
  );
}
