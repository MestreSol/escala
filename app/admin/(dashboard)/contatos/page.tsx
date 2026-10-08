import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { pastoralDaPresenca } from "@/lib/sessao";
import { DataTable } from "@/components/ui/DataTable";
import { TelefoneLink } from "@/components/admin/TelefoneLink";
import type { ServidorRow } from "@/lib/types";

export const dynamic = "force-dynamic";

type Contato = Pick<ServidorRow, "id" | "nome" | "fotoUrl" | "celular" | "celularResponsavel">;

export default async function ContatosPage({ searchParams }: { searchParams: Promise<{ busca?: string }> }) {
  const { busca } = await searchParams;
  const { pastoral } = await pastoralDaPresenca();

  let query = supabase
    .from("Servidor")
    .select("id, nome, fotoUrl, celular, celularResponsavel")
    .eq("pastoralId", pastoral.id)
    .eq("ativo", true);
  if (busca?.trim()) query = query.ilike("nome", `%${busca.trim()}%`);
  const { data, error } = await query.returns<Contato[]>();
  if (error) throw error;
  const servidores = data ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Fotos e telefones</h1>
        <p className="text-sm text-muted">
          {pastoral.nome} · {servidores.length} {servidores.length === 1 ? "servidor" : "servidores"}
        </p>
      </div>

      <form className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">Nome</label>
          <input
            type="text"
            name="busca"
            defaultValue={busca}
            className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-fg placeholder:text-subtle focus:border-accent focus:outline-none"
            placeholder="Buscar..."
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-line bg-surface-2 px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:border-line-strong hover:bg-line"
        >
          Buscar
        </button>
      </form>

      <DataTable
        vazio="Nenhum servidor encontrado."
        ordemPadrao={{ chave: "nome", direcao: "asc" }}
        colunas={[
          { chave: "nome", titulo: "Nome", ordenavel: true },
          { chave: "celular", titulo: "Celular" },
          { chave: "responsavel", titulo: "Responsável" },
          { chave: "acoes", titulo: "", alinhar: "right" },
        ]}
        linhas={servidores.map((servidor) => ({
          id: servidor.id,
          valores: { nome: servidor.nome },
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
            celular: <TelefoneLink digitos={servidor.celular} />,
            responsavel: <TelefoneLink digitos={servidor.celularResponsavel} />,
            acoes: (
              <Link href={`/admin/contatos/${servidor.id}`} className="font-medium text-accent hover:text-accent-hover">
                Editar
              </Link>
            ),
          },
        }))}
      />
    </div>
  );
}
