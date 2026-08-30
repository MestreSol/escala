import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { GRAU_LABEL } from "@/lib/constants";
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
    .eq("ativo", true)
    .order("nome", { ascending: true });

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
        <h1 className="text-2xl font-semibold text-gray-900">Servidores</h1>
        <p className="text-sm text-gray-500">{servidores.length} cadastrado(s)</p>
      </div>

      <form className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Comunidade</label>
          <input
            type="text"
            name="comunidade"
            defaultValue={comunidade}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            placeholder="Buscar..."
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Categoria</label>
          <select
            name="categoria"
            defaultValue={categoria ?? ""}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
          >
            <option value="">Todas</option>
            <option value="COROINHA">Coroinha</option>
            <option value="ACOLITO">Acólito</option>
            <option value="CERIMONIARIO">Cerimoniário</option>
          </select>
        </div>
        <button
          type="submit"
          className="cursor-pointer rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-200"
        >
          Filtrar
        </button>
      </form>

      {servidores.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum servidor encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Idade</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Comunidade</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Categoria</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Missas</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {servidores.map((servidor) => (
                <tr key={servidor.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{servidor.nome}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{servidor.idade}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{servidor.comunidade}</td>
                  <td className="px-4 py-3 text-sm">
                    <Badge color={GRAU_COLOR[servidor.categoria]}>{GRAU_LABEL[servidor.categoria]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{servidor.preferenciasMissas.length}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <div className="flex justify-end gap-4">
                      <Link
                        href={`/admin/servidores/${servidor.id}`}
                        className="font-medium text-blue-700 hover:text-blue-900"
                      >
                        Editar
                      </Link>
                      <DeleteButton
                        action={deleteServidor.bind(null, servidor.id)}
                        confirmMessage={`Excluir o servidor "${servidor.nome}"?`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
