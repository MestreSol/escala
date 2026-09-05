import { redirect } from "next/navigation";
import { UsuarioForm } from "@/components/admin/UsuarioForm";
import { obterUsuarioAtual } from "@/lib/sessao";
import { createUsuario } from "../actions";

export default async function NovoUsuarioPage() {
  const usuarioLogado = await obterUsuarioAtual();
  if (usuarioLogado?.papel !== "ADMIN") {
    redirect("/admin/usuarios");
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Novo usuário</h1>
      <UsuarioForm action={createUsuario} />
    </div>
  );
}
