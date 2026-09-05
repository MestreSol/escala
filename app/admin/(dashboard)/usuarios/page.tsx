import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { obterUsuarioAtual } from "@/lib/sessao";
import type { UsuarioRow } from "@/lib/types";
import { deleteUsuario } from "./actions";

// Página lê dados do banco a cada acesso — nunca deve ser congelada em build.
export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const usuarioLogado = await obterUsuarioAtual();

  if (usuarioLogado?.papel !== "ADMIN") {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Usuários</h1>
        <p className="mt-2 text-sm text-gray-500">Só administradores podem gerenciar usuários.</p>
      </div>
    );
  }

  const { data, error } = await supabase
    .from("Usuario")
    .select("id, username, papel, createdAt")
    .order("createdAt", { ascending: true })
    .returns<Pick<UsuarioRow, "id" | "username" | "papel" | "createdAt">[]>();
  if (error) throw error;
  const usuarios = data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Usuários</h1>
        <Link href="/admin/usuarios/nova">
          <Button>Novo usuário</Button>
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Usuário</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Papel</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {usuarios.map((usuario) => (
              <tr key={usuario.id}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {usuario.username}
                  {usuario.id === usuarioLogado.id ? (
                    <span className="ml-2 text-xs font-normal text-gray-400">(você)</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-sm">
                  <Badge color={usuario.papel === "ADMIN" ? "yellow" : "gray"}>
                    {usuario.papel === "ADMIN" ? "Administrador" : "Operador"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {usuario.id === usuarioLogado.id ? null : (
                    <DeleteButton
                      action={deleteUsuario.bind(null, usuario.id)}
                      confirmMessage={`Excluir o usuário "${usuario.username}"?`}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
