import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { obterUsuarioAtual } from "@/lib/sessao";
import { DataTable } from "@/components/ui/DataTable";
import type { UsuarioRow } from "@/lib/types";
import { deleteUsuario } from "./actions";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const usuarioLogado = await obterUsuarioAtual();

  if (usuarioLogado?.papel !== "ADMIN") {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Usuários</h1>
        <p className="mt-2 text-sm text-muted">Só administradores podem gerenciar usuários.</p>
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
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Usuários</h1>
        <Link href="/admin/usuarios/nova" className={buttonClasses()}>
          Novo usuário
        </Link>
      </div>

      <DataTable
        vazio="Nenhum usuário cadastrado."
        ordemPadrao={{ chave: "criadoEm", direcao: "asc" }}
        colunas={[
          { chave: "usuario", titulo: "Usuário", ordenavel: true },
          { chave: "papel", titulo: "Papel", ordenavel: true },
          { chave: "acoes", titulo: "", alinhar: "right" },
        ]}
        linhas={usuarios.map((usuario) => ({
          id: usuario.id,
          valores: {
            usuario: usuario.username,
            papel: usuario.papel === "ADMIN" ? 0 : 1,
            criadoEm: usuario.createdAt,
          },
          celulas: {
            usuario: (
              <span className="font-medium text-fg">
                {usuario.username}
                {usuario.id === usuarioLogado.id ? (
                  <span className="ml-2 text-xs font-normal text-subtle">(você)</span>
                ) : null}
              </span>
            ),
            papel: (
              <Badge color={usuario.papel === "ADMIN" ? "yellow" : "gray"}>
                {usuario.papel === "ADMIN" ? "Administrador" : "Operador"}
              </Badge>
            ),
            acoes:
              usuario.id === usuarioLogado.id ? null : (
                <DeleteButton
                  action={deleteUsuario.bind(null, usuario.id)}
                  confirmMessage={`Excluir o usuário "${usuario.username}"?`}
                />
              ),
          },
        }))}
      />
    </div>
  );
}
