import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { GRAU_LABEL, GRAU_ORDEM } from "@/lib/constants";
import { DataTable } from "@/components/ui/DataTable";
import { lerDataArmazenada } from "@/lib/occurrences";
import { calcularIdade } from "@/lib/idade";
import type { ServidorMissaPreferenciaRow, ServidorRow } from "@/lib/types";
import { deleteServidor } from "./actions";

const GRAU_COLOR: Record<string, "green" | "blue" | "yellow"> = {
  COROINHA: "green",
  ACOLITO: "blue",
  CERIMONIARIO: "yellow",
};

// Página lê dados do banco a cada acesso — nunca deve ser congelada em build.
export const dynamic = "force-dynamic";

export default async function ServidoresPage({
  searchParams,
}: {
  searchParams: Promise<{ comunidade?: string; categoria?: string }>;
}) {
  const { comunidade, categoria } = await searchParams;

  let query = supabase
    .from("Servidor")
    .select("*, preferenciasMissas:ServidorMissaPreferencia(*)")
    .eq("ativo", true);

  if (comunidade) query = query.ilike("comunidade", `%${comunidade}%`);
  if (categoria) query = query.eq("categoria", categoria);

  const { data, error } = await query.returns<
    (ServidorRow & { preferenciasMissas: ServidorMissaPreferenciaRow[] })[]
  >();
  if (error) throw error;
  const servidores = data ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Servidores</h1>
        <p className="text-sm text-muted">{servidores.length} cadastrado(s)</p>
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
        <div>
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
          { chave: "categoria", titulo: "Categoria", ordenavel: true },
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
            missas: <span className="tabular-nums text-muted">{servidor.preferenciasMissas.length}</span>,
            acoes: (
              <div className="flex justify-end gap-4">
                <Link href={`/admin/servidores/${servidor.id}`} className="font-medium text-accent hover:text-accent-hover">
                  Editar
                </Link>
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
