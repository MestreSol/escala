import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { listarPastoraisDaParoquia, obterUsuarioAtual, paroquiaDoPainel, podeGerenciarUsuarios } from "@/lib/sessao";
import { DataTable } from "@/components/ui/DataTable";
import type { PapelUsuario, UsuarioRow } from "@/lib/types";
import { deleteUsuario } from "./actions";

const NOME_PAPEL: Record<PapelUsuario, string> = {
  SUPERADMIN: "Administrador geral",
  ADMIN: "Administrador",
  OPERADOR: "Operador",
  PRESENCA: "Presença",
};
const ORDEM_PAPEL: Record<PapelUsuario, number> = { SUPERADMIN: 0, ADMIN: 1, OPERADOR: 2, PRESENCA: 3 };

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const usuarioLogado = await obterUsuarioAtual();

  if (!usuarioLogado || !podeGerenciarUsuarios(usuarioLogado)) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Usuários</h1>
        <p className="mt-2 text-sm text-muted">Só administradores podem gerenciar usuários.</p>
      </div>
    );
  }

  const paroquia = await paroquiaDoPainel();
  let consulta = supabase
    .from("Usuario")
    .select("id, username, papel, pastoralId, createdAt")
    .eq("paroquiaId", paroquia.id);
  // Admin de uma pastoral só vê os usuários dela.
  if (usuarioLogado.pastoralId) consulta = consulta.eq("pastoralId", usuarioLogado.pastoralId);
  const [{ data, error }, pastorais] = await Promise.all([
    consulta
      .order("createdAt", { ascending: true })
      .returns<Pick<UsuarioRow, "id" | "username" | "papel" | "pastoralId" | "createdAt">[]>(),
    listarPastoraisDaParoquia(paroquia.id),
  ]);
  if (error) throw error;
  const usuarios = data ?? [];
  const nomePastoral = new Map(pastorais.map((p) => [p.id, p.nome]));
  const mostrarPastoral = !usuarioLogado.pastoralId;

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
          ...(mostrarPastoral ? [{ chave: "pastoral", titulo: "Pastoral", ordenavel: true }] : []),
          { chave: "acoes", titulo: "", alinhar: "right" },
        ]}
        linhas={usuarios.map((usuario) => ({
          id: usuario.id,
          valores: {
            usuario: usuario.username,
            papel: ORDEM_PAPEL[usuario.papel],
            pastoral: usuario.pastoralId ? (nomePastoral.get(usuario.pastoralId) ?? "") : "",
            criadoEm: usuario.createdAt,
          },
          celulas: {
            pastoral: (
              <span className="text-muted">
                {usuario.pastoralId ? (nomePastoral.get(usuario.pastoralId) ?? "—") : "Paróquia toda"}
              </span>
            ),
            usuario: (
              <span className="font-medium text-fg">
                {usuario.username}
                {usuario.id === usuarioLogado.id ? (
                  <span className="ml-2 text-xs font-normal text-subtle">(você)</span>
                ) : null}
              </span>
            ),
            papel: (
              <Badge color={usuario.papel === "ADMIN" ? "yellow" : "gray"}>{NOME_PAPEL[usuario.papel]}</Badge>
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
